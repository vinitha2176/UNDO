import { describe, it, expect } from 'vitest';
import { categorizeFile } from '../../services/categorizationService';

describe('Categorization Engine Unit Tests', () => {
  it('should categorize documents deterministically', () => {
    const resPdf = categorizeFile('pdf');
    expect(resPdf.category).toBe('documents');
    expect(resPdf.reason).toContain('.pdf');

    const resDocx = categorizeFile('docx');
    expect(resDocx.category).toBe('documents');

    const resTxt = categorizeFile('txt');
    expect(resTxt.category).toBe('documents');
  });

  it('should categorize spreadsheets correctly', () => {
    expect(categorizeFile('xlsx').category).toBe('spreadsheets');
    expect(categorizeFile('csv').category).toBe('spreadsheets');
    expect(categorizeFile('ods').category).toBe('spreadsheets');
  });

  it('should categorize presentations correctly', () => {
    expect(categorizeFile('pptx').category).toBe('presentations');
    expect(categorizeFile('key').category).toBe('presentations');
  });

  it('should categorize images correctly', () => {
    expect(categorizeFile('png').category).toBe('images');
    expect(categorizeFile('jpg').category).toBe('images');
    expect(categorizeFile('svg').category).toBe('images');
    expect(categorizeFile('webp').category).toBe('images');
  });

  it('should categorize videos correctly', () => {
    expect(categorizeFile('mp4').category).toBe('videos');
    expect(categorizeFile('mkv').category).toBe('videos');
    expect(categorizeFile('mov').category).toBe('videos');
  });

  it('should categorize audio correctly', () => {
    expect(categorizeFile('mp3').category).toBe('audio');
    expect(categorizeFile('wav').category).toBe('audio');
    expect(categorizeFile('flac').category).toBe('audio');
  });

  it('should categorize archives correctly', () => {
    expect(categorizeFile('zip').category).toBe('archives');
    expect(categorizeFile('tar').category).toBe('archives');
    expect(categorizeFile('gz').category).toBe('archives');
  });

  it('should categorize source code correctly', () => {
    expect(categorizeFile('ts').category).toBe('source code');
    expect(categorizeFile('py').category).toBe('source code');
    expect(categorizeFile('rs').category).toBe('source code');
    expect(categorizeFile('json').category).toBe('source code');
  });

  it('should categorize unknown extensions as others with reasons', () => {
    const res = categorizeFile('unknownxyz');
    expect(res.category).toBe('others');
    expect(res.reason).toContain('did not match standard categories');
  });

  it('should fallback to MIME type if extension is missing', () => {
    const resImage = categorizeFile('', 'image/png');
    expect(resImage.category).toBe('images');
    expect(resImage.reason).toContain('MIME type');

    const resAudio = categorizeFile('', 'audio/mpeg');
    expect(resAudio.category).toBe('audio');

    const resUnknown = categorizeFile('', 'application/octet-stream');
    expect(resUnknown.category).toBe('others');
  });
});
