import { describe, it, expect } from 'vitest';
import {
  extractExtension,
  sanitizeFilename,
  sanitizeRelativePath,
} from '../../utils/sanitizer';

describe('Sanitizer Unit Tests', () => {
  describe('sanitizeFilename', () => {
    it('should strip path traversal sequences and return only base filename', () => {
      expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
      expect(sanitizeFilename('..\\..\\Windows\\System32\\calc.exe')).toBe('calc.exe');
      expect(sanitizeFilename('folder/subfolder/document.pdf')).toBe('document.pdf');
    });

    it('should strip null bytes and control characters', () => {
      expect(sanitizeFilename('malicious\x00file.exe')).toBe('maliciousfile.exe');
      expect(sanitizeFilename('hidden\x08test.txt')).toBe('hiddentest.txt');
    });

    it('should replace illegal characters with underscores', () => {
      expect(sanitizeFilename('bad:name*with?illegal"chars<file>bar|test.txt')).toBe(
        'bad_name_with_illegal_chars_file_bar_test.txt'
      );
    });

    it('should protect against Windows reserved filenames', () => {
      expect(sanitizeFilename('CON.txt')).toBe('safe_CON.txt');
      expect(sanitizeFilename('prn.png')).toBe('safe_prn.png');
      expect(sanitizeFilename('aux.doc')).toBe('safe_aux.doc');
      expect(sanitizeFilename('NUL')).toBe('safe_NUL');
    });

    it('should handle empty or whitespace-only inputs gracefully', () => {
      expect(sanitizeFilename('')).toBe('unnamed_file');
      expect(sanitizeFilename('   ')).toBe('unnamed_file');
      expect(sanitizeFilename('...')).toBe('unnamed_file');
      expect(sanitizeFilename('..')).toBe('unnamed_file');
    });

    it('should trim leading/trailing spaces and dots', () => {
      expect(sanitizeFilename('  my_notes.txt  ')).toBe('my_notes.txt');
      expect(sanitizeFilename('...draft.docx...')).toBe('draft.docx');
    });
  });

  describe('extractExtension', () => {
    it('should correctly extract and normalize lowercase extensions', () => {
      expect(extractExtension('report.PDF')).toBe('pdf');
      expect(extractExtension('archive.tar.GZ')).toBe('gz');
      expect(extractExtension('script.TSX')).toBe('tsx');
    });

    it('should handle filenames without extension', () => {
      expect(extractExtension('Dockerfile')).toBe('');
      expect(extractExtension('README')).toBe('');
      expect(extractExtension('')).toBe('');
    });
  });

  describe('sanitizeRelativePath', () => {
    it('should sanitize valid relative folder paths', () => {
      expect(sanitizeRelativePath('projects/undo/docs')).toBe('projects/undo/docs');
      expect(sanitizeRelativePath('folder\\subfolder\\file.txt')).toBe('folder/subfolder/file.txt');
    });

    it('should reject path traversal attempts', () => {
      expect(sanitizeRelativePath('../../../etc')).toBeNull();
      expect(sanitizeRelativePath('projects/../../secret')).toBeNull();
      expect(sanitizeRelativePath('..')).toBeNull();
    });

    it('should reject absolute paths', () => {
      expect(sanitizeRelativePath('/var/log')).toBeNull();
      expect(sanitizeRelativePath('C:\\Windows\\System32')).toBeNull();
      expect(sanitizeRelativePath('D:/data')).toBeNull();
    });

    it('should handle null, empty, or undefined', () => {
      expect(sanitizeRelativePath(null)).toBeNull();
      expect(sanitizeRelativePath(undefined)).toBeNull();
      expect(sanitizeRelativePath('')).toBeNull();
    });
  });
});
