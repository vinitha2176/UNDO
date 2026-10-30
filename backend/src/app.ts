import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './utils/config';
import { healthRouter } from './routes/healthRoutes';
import { sessionRouter } from './routes/sessionRoutes';
import { errorHandler, AppError } from './middleware/errorHandler';

export function createApp(): Express {
  const app = express();

  // Disable information disclosure header
  app.disable('x-powered-by');

  // Security Headers Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, Postman, test runners)
        if (!origin) return callback(null, true);
        if (config.allowedOrigins.includes(origin) || config.nodeEnv === 'test') {
          return callback(null, true);
        }
        return callback(new AppError(`CORS request from origin '${origin}' blocked`, 403, 'CORS_ERROR'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    })
  );

  // Body Parsers
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Versioned API Routes
  app.use('/api/v1', healthRouter);
  app.use('/api/v1', sessionRouter);

  // 404 Handler for undefined routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    next(new AppError(`Route '${req.method} ${req.originalUrl}' not found`, 404, 'NOT_FOUND'));
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}

export const app = createApp();
