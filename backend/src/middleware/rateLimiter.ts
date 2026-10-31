import { Request, Response, NextFunction } from 'express';
import { config } from '../utils/config';
import { AppError } from './errorHandler';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
  code?: string;
  skipInTest?: boolean;
}

export class InMemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private windowMs: number;
  private maxRequests: number;
  private message: string;
  private code: string;
  private skipInTest: boolean;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options: RateLimiterOptions = {}) {
    this.windowMs = options.windowMs ?? config.rateLimitWindowMs;
    this.maxRequests = options.maxRequests ?? 60;
    this.message = options.message ?? 'Too many requests from this IP. Please try again later.';
    this.code = options.code ?? 'RATE_LIMIT_EXCEEDED';
    this.skipInTest = options.skipInTest ?? true;

    // Periodically clean up expired records to prevent unbounded memory growth
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, Math.max(60000, this.windowMs));

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  public getMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // In automated test runs, skip rate limiting by default unless explicitly testing rate limits
      if (this.skipInTest && config.nodeEnv === 'test' && req.headers['x-test-rate-limit'] !== 'true') {
        return next();
      }

      const clientIp = (req.ip || req.socket.remoteAddress || '127.0.0.1').trim();
      const now = Date.now();
      let record = this.store.get(clientIp);

      if (!record || now > record.resetTime) {
        record = {
          count: 1,
          resetTime: now + this.windowMs,
        };
        this.store.set(clientIp, record);
      } else {
        record.count += 1;
      }

      const remaining = Math.max(0, this.maxRequests - record.count);
      const resetSeconds = Math.ceil(record.resetTime / 1000);
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));

      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetSeconds);

      if (record.count > this.maxRequests) {
        res.setHeader('Retry-After', retryAfterSeconds);
        return next(
          new AppError(this.message, 429, this.code, {
            retryAfterSeconds,
            limit: this.maxRequests,
            windowSeconds: Math.ceil(this.windowMs / 1000),
          })
        );
      }

      next();
    };
  }

  public reset(): void {
    this.store.clear();
  }

  public cleanup(): void {
    const now = Date.now();
    for (const [ip, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(ip);
      }
    }
  }

  public stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Session Creation Limiter (default: 60 session creations per 15 min per IP)
export const sessionCreationLimiterInstance = new InMemoryRateLimiter({
  windowMs: config.rateLimitWindowMs,
  maxRequests: config.rateLimitMaxSessions,
  message: 'Too many upload sessions created from this IP. Please try again later.',
  code: 'SESSION_RATE_LIMIT_EXCEEDED',
  skipInTest: true,
});
export const sessionCreationLimiter = sessionCreationLimiterInstance.getMiddleware();

// File Upload Limiter (default: 120 file upload requests per 15 min per IP)
export const fileUploadLimiterInstance = new InMemoryRateLimiter({
  windowMs: config.rateLimitWindowMs,
  maxRequests: config.rateLimitMaxUploads,
  message: 'Too many file upload requests from this IP. Please try again later.',
  code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
  skipInTest: true,
});
export const fileUploadLimiter = fileUploadLimiterInstance.getMiddleware();
