import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { config } from '../utils/config';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Strips internal filesystem paths from error messages so technical path details are never leaked.
 */
function sanitizeErrorMessage(msg: string): string {
  if (!msg) return 'An unexpected error occurred';
  // Replace references to user/storage directories
  const storageDirNormalized = config.storageDir.replace(/\\/g, '/');
  let sanitized = msg.replace(/\\/g, '/');

  if (sanitized.includes(storageDirNormalized)) {
    sanitized = sanitized.split(storageDirNormalized).join('[storage]');
  }

  // Strip absolute drive paths like C:/Users/... or /home/...
  sanitized = sanitized.replace(/[a-zA-Z]:\/[^:\s"']+/g, '[internal path]');
  sanitized = sanitized.replace(/\/(?:home|Users|var|tmp|etc)\/[^\s"']+/g, '[internal path]');

  return sanitized;
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // 1. Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  // 2. Multer upload errors
  if (err instanceof multer.MulterError) {
    let statusCode = 400;
    let code = 'UPLOAD_ERROR';
    let message = err.message;

    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        statusCode = 413;
        code = 'FILE_TOO_LARGE';
        message = `Uploaded file exceeds maximum allowed limit of ${Math.round(
          config.maxFileSizeBytes / (1024 * 1024)
        )} MB per file`;
        break;
      case 'LIMIT_FILE_COUNT':
        statusCode = 400;
        code = 'TOO_MANY_FILES';
        message = `Upload exceeds maximum allowed limit of ${config.maxFilesPerUpload} files`;
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        statusCode = 400;
        code = 'UNEXPECTED_FIELD';
        message = `Unexpected upload form field: '${err.field}'. Files must be sent in the 'files' field`;
        break;
      default:
        message = `File upload failed: ${err.message}`;
    }

    res.status(statusCode).json({
      success: false,
      error: { code, message },
    });
    return;
  }

  // 3. Custom Application Errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: sanitizeErrorMessage(err.message),
        details: err.details || null,
      },
    });
    return;
  }

  // 4. Malformed JSON Body
  if ('type' in err && (err as any).type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      error: {
        code: 'MALFORMED_JSON',
        message: 'Request body contains malformed JSON',
      },
    });
    return;
  }

  // 5. General unhandled errors
  const safeMessage = sanitizeErrorMessage(err.message || 'Internal server error');
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: config.nodeEnv === 'production' ? 'An unexpected server error occurred' : safeMessage,
    },
  });
}
