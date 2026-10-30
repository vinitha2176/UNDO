import path from 'path';
import dotenv from 'dotenv';

// Load .env if present
dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  allowedOrigins: string[];
  storageDir: string;
  maxFilesPerUpload: number;
  maxFileSizeBytes: number;
  maxTotalSessionBytes: number;
  sessionTtlMs: number;
  sessionCleanupIntervalMs: number;
}

const parseNumber = (val: string | undefined, defaultVal: number): number => {
  if (!val) return defaultVal;
  const parsed = parseInt(val, 10);
  return Number.isNaN(parsed) ? defaultVal : parsed;
};

// Storage directory resolved relative to backend root (or absolute from env)
const resolveStorageDir = (): string => {
  const envStorage = process.env.STORAGE_DIR || 'storage';
  if (path.isAbsolute(envStorage)) {
    return envStorage;
  }
  // Relative to backend project root
  return path.resolve(process.cwd(), envStorage);
};

export const config: AppConfig = {
  port: parseNumber(process.env.PORT, 3001),
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:5173'],
  storageDir: resolveStorageDir(),
  maxFilesPerUpload: parseNumber(process.env.MAX_FILES_PER_UPLOAD, 100),
  maxFileSizeBytes: parseNumber(process.env.MAX_FILE_SIZE_BYTES, 20 * 1024 * 1024), // 20 MB
  maxTotalSessionBytes: parseNumber(process.env.MAX_TOTAL_SESSION_BYTES, 100 * 1024 * 1024), // 100 MB
  sessionTtlMs: parseNumber(process.env.SESSION_TTL_MS, 2 * 60 * 60 * 1000), // 2 hours
  sessionCleanupIntervalMs: parseNumber(process.env.SESSION_CLEANUP_INTERVAL_MS, 15 * 60 * 1000), // 15 mins
};
