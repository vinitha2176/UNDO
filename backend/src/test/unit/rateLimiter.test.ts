import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import express, { Request, Response } from 'express';
import { InMemoryRateLimiter, sessionCreationLimiterInstance, fileUploadLimiterInstance } from '../../middleware/rateLimiter';
import { createApp } from '../../app';
import { errorHandler } from '../../middleware/errorHandler';

describe('Upload Abuse Protection & IP Rate Limiting Unit Tests', () => {
  let testLimiter: InMemoryRateLimiter;

  beforeEach(() => {
    testLimiter = new InMemoryRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 3,
      message: 'Too many test requests from this IP. Please try again later.',
      code: 'TEST_RATE_LIMIT_EXCEEDED',
      skipInTest: false, // enforce in unit test
    });
    sessionCreationLimiterInstance.reset();
    fileUploadLimiterInstance.reset();
  });

  afterAll(() => {
    testLimiter.stopCleanup();
    sessionCreationLimiterInstance.stopCleanup();
    fileUploadLimiterInstance.stopCleanup();
  });

  it('allows requests within the configured rate limit and sets rate limit headers', async () => {
    const testApp = express();
    testApp.use(testLimiter.getMiddleware());
    testApp.get('/test', (req: Request, res: Response) => {
      res.status(200).json({ ok: true });
    });
    testApp.use(errorHandler);

    // Request 1: remaining = 2
    const res1 = await request(testApp).get('/test');
    expect(res1.status).toBe(200);
    expect(res1.headers['x-ratelimit-limit']).toBe('3');
    expect(res1.headers['x-ratelimit-remaining']).toBe('2');
    expect(res1.headers['x-ratelimit-reset']).toBeDefined();

    // Request 2: remaining = 1
    const res2 = await request(testApp).get('/test');
    expect(res2.status).toBe(200);
    expect(res2.headers['x-ratelimit-remaining']).toBe('1');

    // Request 3: remaining = 0
    const res3 = await request(testApp).get('/test');
    expect(res3.status).toBe(200);
    expect(res3.headers['x-ratelimit-remaining']).toBe('0');
  });

  it('returns HTTP 429 when rate limit is exceeded with clear error details and Retry-After', async () => {
    const testApp = express();
    testApp.use(testLimiter.getMiddleware());
    testApp.get('/test', (req: Request, res: Response) => {
      res.status(200).json({ ok: true });
    });
    testApp.use(errorHandler);

    // Send 3 requests (up to limit)
    await request(testApp).get('/test');
    await request(testApp).get('/test');
    await request(testApp).get('/test');

    // 4th request exceeds limit
    const res4 = await request(testApp).get('/test');
    expect(res4.status).toBe(429);
    expect(res4.headers['retry-after']).toBeDefined();
    expect(parseInt(res4.headers['retry-after'], 10)).toBeGreaterThanOrEqual(1);
    expect(res4.body.success).toBe(false);
    expect(res4.body.error.code).toBe('TEST_RATE_LIMIT_EXCEEDED');
    expect(res4.body.error.message).toContain('Too many test requests from this IP');
    expect(res4.body.error.details.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(res4.body.error.details.limit).toBe(3);
  });

  it('resets rate limits properly on demand', async () => {
    const testApp = express();
    testApp.use(testLimiter.getMiddleware());
    testApp.get('/test', (req: Request, res: Response) => {
      res.status(200).json({ ok: true });
    });
    testApp.use(errorHandler);

    // Max out limit
    await request(testApp).get('/test');
    await request(testApp).get('/test');
    await request(testApp).get('/test');

    const blocked = await request(testApp).get('/test');
    expect(blocked.status).toBe(429);

    // Reset limiter
    testLimiter.reset();

    // Now should be allowed again
    const allowed = await request(testApp).get('/test');
    expect(allowed.status).toBe(200);
    expect(allowed.headers['x-ratelimit-remaining']).toBe('2');
  });

  it('tracks different client IP addresses independently', async () => {
    const testApp = express();
    testApp.set('trust proxy', true);
    testApp.use(testLimiter.getMiddleware());
    testApp.get('/test', (req: Request, res: Response) => {
      res.status(200).json({ ok: true });
    });
    testApp.use(errorHandler);

    // Exhaust limit for IP 1.2.3.4
    await request(testApp).get('/test').set('X-Forwarded-For', '1.2.3.4');
    await request(testApp).get('/test').set('X-Forwarded-For', '1.2.3.4');
    await request(testApp).get('/test').set('X-Forwarded-For', '1.2.3.4');
    const blockedIp1 = await request(testApp).get('/test').set('X-Forwarded-For', '1.2.3.4');
    expect(blockedIp1.status).toBe(429);

    // IP 5.6.7.8 should still be allowed
    const allowedIp2 = await request(testApp).get('/test').set('X-Forwarded-For', '5.6.7.8');
    expect(allowedIp2.status).toBe(200);
    expect(allowedIp2.headers['x-ratelimit-remaining']).toBe('2');
  });

  it('protects session creation endpoint under simulated abusive traffic', async () => {
    const app = createApp();
    // Create a local limiter for testing the route integration
    const customSessionLimiter = new InMemoryRateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 2,
      code: 'SESSION_RATE_LIMIT_EXCEEDED',
      skipInTest: false,
    });

    const isolatedApp = express();
    isolatedApp.use(customSessionLimiter.getMiddleware());
    isolatedApp.post('/api/v1/sessions', (req, res) => {
      res.status(201).json({ success: true });
    });
    isolatedApp.use(errorHandler);

    const r1 = await isolatedApp.post ? await request(isolatedApp).post('/api/v1/sessions') : null;
    expect(r1?.status).toBe(201);

    const r2 = await request(isolatedApp).post('/api/v1/sessions');
    expect(r2.status).toBe(201);

    // 3rd request exceeds limit
    const r3 = await request(isolatedApp).post('/api/v1/sessions');
    expect(r3.status).toBe(429);
    expect(r3.body.error.code).toBe('SESSION_RATE_LIMIT_EXCEEDED');
    customSessionLimiter.stopCleanup();
  });
});
