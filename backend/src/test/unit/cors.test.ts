import { describe, it, expect } from 'vitest';
import express, { Request, Response } from 'express';
import cors from 'cors';
import request from 'supertest';
import { resolveAllowedOrigins } from '../../utils/config';
import { errorHandler, AppError } from '../../middleware/errorHandler';

describe('CORS Configuration & Environment Origin Policy Unit Tests', () => {
  describe('resolveAllowedOrigins() Environment Rules', () => {
    it('in development: retains localhost:3000 and localhost:5173 when ALLOWED_ORIGINS is unset', () => {
      const origins = resolveAllowedOrigins('', 'development');
      expect(origins).toEqual(['http://localhost:3000', 'http://localhost:5173']);
    });

    it('in development: retains localhost origins alongside configured custom domains', () => {
      const origins = resolveAllowedOrigins('https://custom-dev.test, http://192.168.1.50:3000', 'development');
      expect(origins).toContain('http://localhost:3000');
      expect(origins).toContain('http://localhost:5173');
      expect(origins).toContain('https://custom-dev.test');
      expect(origins).toContain('http://192.168.1.50:3000');
    });

    it('in production: allows ONLY origins explicitly configured through ALLOWED_ORIGINS', () => {
      const origins = resolveAllowedOrigins('https://undo-frontend.vercel.app', 'production');
      expect(origins).toEqual(['https://undo-frontend.vercel.app']);
      expect(origins).not.toContain('http://localhost:3000');
      expect(origins).not.toContain('http://localhost:5173');
    });

    it('in production: supports multiple explicit comma-separated domains', () => {
      const origins = resolveAllowedOrigins(
        'https://undo.vercel.app, https://undo-preview-123.vercel.app, https://undo-app.com',
        'production'
      );
      expect(origins).toEqual([
        'https://undo.vercel.app',
        'https://undo-preview-123.vercel.app',
        'https://undo-app.com',
      ]);
      expect(origins).not.toContain('http://localhost:3000');
    });

    it('in production: returns empty array when ALLOWED_ORIGINS is empty (fail-closed secure)', () => {
      const origins = resolveAllowedOrigins('', 'production');
      expect(origins).toEqual([]);
      expect(origins).not.toContain('http://localhost:3000');
    });

    it('does not produce or allow wildcard origins', () => {
      const originsDev = resolveAllowedOrigins('', 'development');
      const originsProd = resolveAllowedOrigins('https://my-app.vercel.app', 'production');
      expect(originsDev).not.toContain('*');
      expect(originsProd).not.toContain('*');
    });
  });

  describe('CORS Express Middleware Enforcement', () => {
    const createTestCorsApp = (allowedOrigins: string[], nodeEnv: string) => {
      const app = express();
      app.use(
        cors({
          origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin) || nodeEnv === 'test') {
              return callback(null, true);
            }
            return callback(new AppError(`CORS request from origin '${origin}' blocked`, 403, 'CORS_ERROR'));
          },
          credentials: true,
          methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        })
      );
      app.get('/api/v1/health', (req: Request, res: Response) => {
        res.status(200).json({ status: 'ok' });
      });
      app.use(errorHandler);
      return app;
    };

    it('in production: permits configured Vercel origin with credentials headers', async () => {
      const prodOrigins = resolveAllowedOrigins('https://undo-frontend.vercel.app', 'production');
      const app = createTestCorsApp(prodOrigins, 'production');

      const res = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'https://undo-frontend.vercel.app');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('https://undo-frontend.vercel.app');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('in production: blocks unconfigured localhost:3000 with 403 CORS_ERROR', async () => {
      const prodOrigins = resolveAllowedOrigins('https://undo-frontend.vercel.app', 'production');
      const app = createTestCorsApp(prodOrigins, 'production');

      const res = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'http://localhost:3000');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CORS_ERROR');
      expect(res.body.error.message).toContain('CORS request from origin');
    });

    it('in production: blocks unknown / malicious origins with 403 CORS_ERROR', async () => {
      const prodOrigins = resolveAllowedOrigins('https://undo-frontend.vercel.app', 'production');
      const app = createTestCorsApp(prodOrigins, 'production');

      const res = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'https://malicious-website.com');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CORS_ERROR');
    });

    it('in development: permits both localhost:3000 and localhost:5173', async () => {
      const devOrigins = resolveAllowedOrigins('', 'development');
      const app = createTestCorsApp(devOrigins, 'development');

      const res3000 = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'http://localhost:3000');
      expect(res3000.status).toBe(200);
      expect(res3000.headers['access-control-allow-origin']).toBe('http://localhost:3000');

      const res5173 = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'http://localhost:5173');
      expect(res5173.status).toBe(200);
      expect(res5173.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('in development: blocks unauthorized third-party origins', async () => {
      const devOrigins = resolveAllowedOrigins('', 'development');
      const app = createTestCorsApp(devOrigins, 'development');

      const res = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'https://unauthorized-domain.com');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CORS_ERROR');
    });

    it('allows requests without an Origin header (curl, mobile, test runners)', async () => {
      const prodOrigins = resolveAllowedOrigins('https://undo-frontend.vercel.app', 'production');
      const app = createTestCorsApp(prodOrigins, 'production');

      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('preserves existing test environment behavior where nodeEnv === "test"', async () => {
      const app = createTestCorsApp([], 'test');

      const res = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'https://any-test-origin.example');

      expect(res.status).toBe(200);
    });
  });
});
