import path from 'path';

/**
 * Windows reserved device names regex (e.g. CON, PRN, AUX, NUL, COM1-9, LPT1-9)
 */
export const WINDOWS_RESERVED_REGEX = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * Sanitizes an untrusted filename to prevent path traversal, control character injection,
 * and filesystem collisions across Windows and POSIX platforms.
 */
export function sanitizeFilename(rawFilename: string): string {
  if (!rawFilename || typeof rawFilename !== 'string') {
    return 'unnamed_file';
  }

  // 1. Remove null bytes and control characters
  let clean = rawFilename.replace(/[\x00-\x1f\x7f]/g, '');

  // 2. Strip directory path separators (both / and \) to get only the base filename
  clean = path.basename(clean.replace(/\\/g, '/'));

  // 3. Remove illegal Windows/POSIX filename characters: \ / : * ? " < > |
  clean = clean.replace(/[\\/:*?"<>|]/g, '_');

  // 4. Disallow dangerous reserved filenames (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
  const baseWithoutExt = clean.replace(/\.[^/.]+$/, '');
  if (WINDOWS_RESERVED_REGEX.test(baseWithoutExt)) {
    clean = `safe_${clean}`;
  }

  // 5. Trim leading and trailing spaces and dots
  clean = clean.replace(/^[\s.]+|[\s.]+$/g, '');

  // 6. Handle edge cases where filename became empty
  if (!clean || clean === '.' || clean === '..') {
    return 'unnamed_file';
  }

  // 7. Enforce max filename length (255 chars)
  if (clean.length > 255) {
    const ext = path.extname(clean);
    const nameWithoutExt = clean.slice(0, 255 - ext.length);
    clean = `${nameWithoutExt}${ext}`;
  }

  return clean;
}

/**
 * Extracts and normalizes the file extension without the leading dot.
 * Returns empty string if no extension is present.
 */
export function extractExtension(filename: string): string {
  if (!filename) return '';
  const ext = path.extname(filename);
  if (!ext || ext === '.') return '';
  return ext.slice(1).toLowerCase().trim();
}

/**
 * Sanitizes a client-provided relative path to ensure it cannot perform directory traversal.
 * Returns null if the path is invalid, absolute, or attempts traversal.
 */
export function sanitizeRelativePath(rawRelativePath: string | undefined | null): string | null {
  if (!rawRelativePath || typeof rawRelativePath !== 'string') {
    return null;
  }

  // Remove null bytes
  const clean = rawRelativePath.replace(/[\x00-\x1f\x7f]/g, '').trim();
  if (!clean) return null;

  // Reject paths starting with / or \ (absolute on POSIX) or drive letters (C:\ on Windows)
  if (/^(?:[a-zA-Z]:|[\\/])/.test(clean)) {
    return null;
  }

  // Normalize path using POSIX style
  const normalized = path.posix.normalize(clean.replace(/\\/g, '/'));

  // Reject any path that climbs out or starts with ..
  if (normalized.startsWith('..') || normalized === '.' || normalized.includes('/../')) {
    return null;
  }

  // Sanitize each path segment
  const segments = normalized.split('/').filter(Boolean);
  const safeSegments = segments.map((seg) => sanitizeFilename(seg));

  if (safeSegments.length === 0) return null;

  return safeSegments.join('/');
}

export interface FilenameValidationResult {
  valid: boolean;
  error?: string;
  cleanName: string;
}

/**
 * Strict validator for user-requested renaming in the organization plan.
 * Verifies extension preservation, Windows reserved names, character safety, length, and traversal defenses.
 */
export function validateProposedFilename(
  proposedName: string,
  originalFilename?: string,
  allowExtensionChange = false
): FilenameValidationResult {
  if (!proposedName || typeof proposedName !== 'string' || proposedName.trim().length === 0) {
    return { valid: false, error: 'Proposed filename cannot be empty', cleanName: '' };
  }

  const trimmed = proposedName.trim();

  // Check null bytes & control chars
  if (/[\x00-\x1f\x7f]/.test(trimmed)) {
    return { valid: false, error: 'Filename contains forbidden control characters or null bytes', cleanName: '' };
  }

  // Check path separators
  if (/[\\/]/.test(trimmed)) {
    return { valid: false, error: 'Filename cannot contain path separator characters (/ or \\)', cleanName: '' };
  }

  // Check directory traversal
  if (trimmed === '.' || trimmed === '..' || trimmed.startsWith('../') || trimmed.startsWith('..\\')) {
    return { valid: false, error: 'Directory traversal sequence in filename is forbidden', cleanName: '' };
  }

  // Check illegal filesystem characters: : * ? " < > |
  if (/[:*?"<>|]/.test(trimmed)) {
    return { valid: false, error: 'Filename contains illegal characters (: * ? " < > |)', cleanName: '' };
  }

  // Check trailing dots or spaces (forbidden on Windows)
  if (/[\s.]$/.test(trimmed)) {
    return { valid: false, error: 'Filename cannot end with a space or dot', cleanName: '' };
  }

  // Check Windows reserved names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
  const baseWithoutExt = trimmed.replace(/\.[^/.]+$/, '');
  if (WINDOWS_RESERVED_REGEX.test(baseWithoutExt)) {
    return {
      valid: false,
      error: `Filename '${trimmed}' uses a reserved system name (${baseWithoutExt.toUpperCase()})`,
      cleanName: '',
    };
  }

  // Length check (max 255 chars)
  if (trimmed.length > 255) {
    return { valid: false, error: 'Filename length exceeds maximum allowed limit (255 characters)', cleanName: '' };
  }

  // Extension preservation check
  if (originalFilename) {
    const origExt = extractExtension(originalFilename);
    const newExt = extractExtension(trimmed);

    if (origExt !== newExt && !allowExtensionChange) {
      const origDisplay = origExt ? `.${origExt}` : '(no extension)';
      const newDisplay = newExt ? `.${newExt}` : '(no extension)';
      return {
        valid: false,
        error: `Changing file extension from ${origDisplay} to ${newDisplay} requires explicit confirmation (set allowExtensionChange: true)`,
        cleanName: '',
      };
    }
  }

  return { valid: true, cleanName: trimmed };
}

export interface DestinationFolderValidationResult {
  valid: boolean;
  error?: string;
  cleanFolder: string;
}

/**
 * Validates and normalizes proposed destination folders for the organization plan.
 */
export function validateDestinationFolder(rawFolder: string): DestinationFolderValidationResult {
  if (rawFolder === undefined || rawFolder === null) {
    return { valid: true, cleanFolder: '' };
  }

  if (typeof rawFolder !== 'string') {
    return { valid: false, error: 'Destination folder must be a string', cleanFolder: '' };
  }

  const trimmed = rawFolder.trim();
  if (trimmed === '' || trimmed === '.' || trimmed === './') {
    return { valid: true, cleanFolder: '' };
  }

  // Check null bytes & control chars
  if (/[\x00-\x1f\x7f]/.test(trimmed)) {
    return { valid: false, error: 'Destination folder contains forbidden control characters or null bytes', cleanFolder: '' };
  }

  // Check absolute paths or Windows drive letters
  if (/^(?:[a-zA-Z]:|[\\/])/.test(trimmed)) {
    return { valid: false, error: 'Destination folder cannot be an absolute path or drive path', cleanFolder: '' };
  }

  // Normalize path using POSIX style
  const normalized = path.posix.normalize(trimmed.replace(/\\/g, '/'));

  // Check traversal
  if (normalized.startsWith('..') || normalized === '.' || normalized.includes('/../')) {
    return { valid: false, error: 'Directory traversal sequence (..) is forbidden in destination folder', cleanFolder: '' };
  }

  // Validate each segment
  const segments = normalized.split('/').filter(Boolean);
  const safeSegments: string[] = [];

  for (const seg of segments) {
    if (seg === '.' || seg === '..') {
      return { valid: false, error: 'Invalid directory segment', cleanFolder: '' };
    }

    if (/[:*?"<>|]/.test(seg)) {
      return { valid: false, error: `Folder segment '${seg}' contains illegal characters`, cleanFolder: '' };
    }

    if (WINDOWS_RESERVED_REGEX.test(seg)) {
      return { valid: false, error: `Folder segment '${seg}' is a reserved system name`, cleanFolder: '' };
    }

    if (/[\s.]$/.test(seg)) {
      return { valid: false, error: `Folder segment '${seg}' cannot end with a space or dot`, cleanFolder: '' };
    }

    safeSegments.push(seg.trim());
  }

  const cleanFolder = safeSegments.join('/');

  if (cleanFolder.length > 1024) {
    return { valid: false, error: 'Destination folder path exceeds maximum length of 1024 characters', cleanFolder: '' };
  }

  return { valid: true, cleanFolder };
}
