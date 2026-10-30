import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { config } from '../utils/config';
import { sessionService } from '../services/sessionService';
import { extractExtension, sanitizeFilename } from '../utils/sanitizer';
import { AppError } from './errorHandler';

// Custom Multer storage engine that validates active sessions and saves files
// with random unguessable IDs in isolated session folders
const storage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const sessionId = req.params.sessionId;
    if (!sessionId) {
      return cb(new AppError('Session ID is required in URL parameter', 400, 'MISSING_SESSION_ID'), '');
    }

    const session = sessionService.getSession(sessionId);
    if (!session) {
      return cb(new AppError(`Session '${sessionId}' does not exist or has expired`, 404, 'SESSION_NOT_FOUND'), '');
    }

    const uploadDir = sessionService.getSessionUploadDir(sessionId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate internal unique file ID
    const fileId = crypto.randomUUID();
    const cleanExt = extractExtension(file.originalname);
    const safeExt = cleanExt ? `.${cleanExt}` : '';
    // Store under internal fileId, avoiding user filename collisions on disk
    cb(null, `${fileId}${safeExt}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    files: config.maxFilesPerUpload,
    fileSize: config.maxFileSizeBytes,
  },
});
