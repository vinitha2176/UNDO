import crypto from 'crypto';
import fs from 'fs';
import { AppError } from '../middleware/errorHandler';

/**
 * Computes the SHA-256 hash of a file using streams to minimize memory consumption.
 * @param filePath Absolute path of the file to hash
 * @returns Hex-encoded SHA-256 digest
 */
export function computeFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => {
      hash.update(chunk);
    });

    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });

    stream.on('error', () => {
      reject(new AppError('Failed to calculate file checksum', 500, 'CHECKSUM_ERROR'));
    });
  });
}
