import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import {
  DocumentExtractionResult,
  DocumentMetadata,
  ExtractionStatus,
  UploadedFileRecord,
} from '../types';

// Configurable guardrail limits
const MAX_EXTRACT_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_EXTRACTED_CHARACTERS = 100000; // 100k chars to prevent memory spikes
const MIN_MEANINGFUL_TEXT_CHARS = 25; // Minimum chars to consider content sufficient for semantic analysis

/**
 * Normalizes and cleans extracted text
 */
function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ \u00A0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Counts words accurately in text
 */
function countWords(text: string): number {
  if (!text) return 0;
  const matches = text.match(/\b\w+\b/g);
  return matches ? matches.length : 0;
}

/**
 * Extracts candidate headings from structured text
 */
function extractHeadingsFromText(text: string, maxHeadings = 5): string[] {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const headings: string[] = [];

  for (const line of lines) {
    if (headings.length >= maxHeadings) break;

    // Markdown heading (# Heading)
    if (/^#{1,3}\s+/.test(line)) {
      headings.push(line.replace(/^#{1,3}\s+/, '').trim());
      continue;
    }

    // Short standalone lines that look like titles (< 80 chars, uppercase or Title Case)
    if (line.length >= 4 && line.length <= 75 && !/[.!?]$/.test(line)) {
      const isTitleCaseOrUpper =
        line === line.toUpperCase() ||
        /^[A-Z][a-zA-Z0-9\s:-]+$/.test(line);

      if (isTitleCaseOrUpper && !headings.includes(line)) {
        headings.push(line);
      }
    }
  }

  return headings;
}

/**
 * Extracts readable content from a PDF document
 */
async function extractPdf(storagePath: string): Promise<{
  text: string;
  metadata: Partial<DocumentMetadata>;
  warnings: string[];
  status: ExtractionStatus;
}> {
  const warnings: string[] = [];
  try {
    const dataBuffer = await fs.promises.readFile(storagePath);
    if (dataBuffer.length < 10) {
      return { text: '', metadata: {}, warnings: ['PDF file is empty'], status: 'empty' };
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: dataBuffer });
    const parsed = await parser.getText();
    let pageCount = 1;
    let detectedTitle: string | undefined;

    try {
      const info = await parser.getInfo();
      pageCount = info.total || 1;
      if (info.info?.Title) {
        detectedTitle = String(info.info.Title).trim();
      }
    } catch {
      // Info extraction optional
    }

    try {
      await parser.destroy();
    } catch {}

    const rawText = cleanExtractedText(parsed.text || '');

    // Check for scanned / non-extractable PDF (Rule: Do not treat a scanned PDF as successfully analyzed if text extraction returns nothing!)
    if (rawText.length < MIN_MEANINGFUL_TEXT_CHARS) {
      warnings.push('PDF contains no readable text layer. Likely a scanned document or raster image that requires OCR.');
      return {
        text: rawText,
        metadata: { pageCount, detectedTitle },
        warnings,
        status: rawText.length === 0 ? 'empty' : 'unsupported',
      };
    }

    const headings = extractHeadingsFromText(rawText);

    return {
      text: rawText,
      metadata: {
        pageCount,
        detectedTitle: detectedTitle || headings[0],
        extractedHeadings: headings,
      },
      warnings,
      status: 'success',
    };
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (/password|encrypt/i.test(msg)) {
      return {
        text: '',
        metadata: {},
        warnings: ['PDF is encrypted or password-protected and cannot be analyzed without credentials.'],
        status: 'encrypted',
      };
    }
    return {
      text: '',
      metadata: {},
      warnings: [`PDF parsing failed: ${msg}`],
      status: 'failed',
    };
  }
}

/**
 * Extracts readable content from a DOCX document
 */
async function extractDocx(storagePath: string): Promise<{
  text: string;
  metadata: Partial<DocumentMetadata>;
  warnings: string[];
  status: ExtractionStatus;
}> {
  const warnings: string[] = [];
  try {
    const result = await mammoth.extractRawText({ path: storagePath });
    const rawText = cleanExtractedText(result.value || '');

    if (result.messages && result.messages.length > 0) {
      for (const m of result.messages) {
        if (m.type === 'warning') warnings.push(m.message);
      }
    }

    if (rawText.length < MIN_MEANINGFUL_TEXT_CHARS) {
      return {
        text: rawText,
        metadata: {},
        warnings: ['DOCX document is empty or has no readable text content.'],
        status: 'empty',
      };
    }

    const headings = extractHeadingsFromText(rawText);

    return {
      text: rawText,
      metadata: {
        detectedTitle: headings[0],
        extractedHeadings: headings,
      },
      warnings,
      status: 'success',
    };
  } catch (err: any) {
    return {
      text: '',
      metadata: {},
      warnings: [`DOCX extraction failed: ${String(err?.message || err)}`],
      status: 'failed',
    };
  }
}

/**
 * Extracts readable content, slide titles, and slide count from a PPTX presentation
 */
async function extractPptx(storagePath: string): Promise<{
  text: string;
  metadata: Partial<DocumentMetadata>;
  warnings: string[];
  status: ExtractionStatus;
}> {
  const warnings: string[] = [];
  try {
    const zip = new AdmZip(storagePath);
    const zipEntries = zip.getEntries();

    // Find all slide XML entries
    const slideEntries = zipEntries
      .filter((e) => e.entryName.startsWith('ppt/slides/slide') && e.entryName.endsWith('.xml'))
      .sort((a, b) => a.entryName.localeCompare(b.entryName, undefined, { numeric: true }));

    const slideCount = slideEntries.length;
    if (slideCount === 0) {
      return {
        text: '',
        metadata: { slideCount: 0 },
        warnings: ['Presentation contains no slides.'],
        status: 'empty',
      };
    }

    const slideTexts: string[] = [];
    const extractedHeadings: string[] = [];

    for (let i = 0; i < slideEntries.length; i++) {
      const slideEntry = slideEntries[i];
      const xmlContent = slideEntry.getData().toString('utf8');

      // Extract all text tokens inside <a:t>...</a:t>
      const textMatches = xmlContent.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g);
      if (textMatches && textMatches.length > 0) {
        const slideTokens = textMatches
          .map((m) => m.replace(/<[^>]+>/g, '').trim())
          .filter(Boolean);

        if (slideTokens.length > 0) {
          // Typically the first prominent text token in a slide is its title
          if (slideTokens[0].length <= 80 && !extractedHeadings.includes(slideTokens[0])) {
            extractedHeadings.push(slideTokens[0]);
          }
          slideTexts.push(`[Slide ${i + 1}] ${slideTokens.join(' ')}`);
        }
      }
    }

    const rawText = cleanExtractedText(slideTexts.join('\n\n'));

    if (rawText.length < MIN_MEANINGFUL_TEXT_CHARS) {
      return {
        text: rawText,
        metadata: { slideCount },
        warnings: ['PPTX presentation has no extractable text in slides.'],
        status: 'empty',
      };
    }

    return {
      text: rawText,
      metadata: {
        slideCount,
        detectedTitle: extractedHeadings[0],
        extractedHeadings: extractedHeadings.slice(0, 5),
      },
      warnings,
      status: 'success',
    };
  } catch (err: any) {
    return {
      text: '',
      metadata: {},
      warnings: [`PPTX extraction failed: ${String(err?.message || err)}`],
      status: 'failed',
    };
  }
}

/**
 * Extracts text from plain text and Markdown files
 */
async function extractTextFile(storagePath: string): Promise<{
  text: string;
  metadata: Partial<DocumentMetadata>;
  warnings: string[];
  status: ExtractionStatus;
}> {
  try {
    const rawContent = await fs.promises.readFile(storagePath, 'utf8');
    const rawText = cleanExtractedText(rawContent);

    if (rawText.length < MIN_MEANINGFUL_TEXT_CHARS) {
      return {
        text: rawText,
        metadata: {},
        warnings: ['Text file is empty or nearly empty.'],
        status: 'empty',
      };
    }

    const headings = extractHeadingsFromText(rawText);

    return {
      text: rawText,
      metadata: {
        detectedTitle: headings[0],
        extractedHeadings: headings,
      },
      warnings: [],
      status: 'success',
    };
  } catch (err: any) {
    return {
      text: '',
      metadata: {},
      warnings: [`Text file read failed: ${String(err?.message || err)}`],
      status: 'failed',
    };
  }
}

/**
 * Extracts table schema and meaningful cell contents from CSV files
 */
async function extractCsv(storagePath: string): Promise<{
  text: string;
  metadata: Partial<DocumentMetadata>;
  warnings: string[];
  status: ExtractionStatus;
}> {
  try {
    const rawContent = await fs.promises.readFile(storagePath, 'utf8');
    const lines = rawContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    if (lines.length === 0) {
      return { text: '', metadata: {}, warnings: ['CSV file is empty.'], status: 'empty' };
    }

    const headerLine = lines[0];
    const headers = headerLine.split(/[,;\t]/).map((h) => h.replace(/^["']|["']$/g, '').trim());
    const rowCount = Math.max(0, lines.length - 1);
    const columnCount = headers.length;

    // Build clean semantic text from column headers and top data rows
    const sampleRows = lines.slice(1, 101); // inspect first 100 rows
    const textSummary = [
      headers.join(' '),
      ...sampleRows.map((r) => r.replace(/[,;\t]/g, ' ')),
    ].join('\n');

    return {
      text: textSummary,
      metadata: {
        rowCount,
        columnCount,
        extractedHeadings: headers.slice(0, 8),
      },
      warnings: [],
      status: 'success',
    };
  } catch (err: any) {
    return {
      text: '',
      metadata: {},
      warnings: [`CSV parsing failed: ${String(err?.message || err)}`],
      status: 'failed',
    };
  }
}

/**
 * Extracts workbook structure, sheet names, headers and cell content from XLSX spreadsheets
 */
async function extractXlsx(storagePath: string): Promise<{
  text: string;
  metadata: Partial<DocumentMetadata>;
  warnings: string[];
  status: ExtractionStatus;
}> {
  try {
    const workbook = xlsx.readFile(storagePath, { sheetRows: 150 });
    const sheetNames = workbook.SheetNames || [];

    if (sheetNames.length === 0) {
      return {
        text: '',
        metadata: { sheetCount: 0 },
        warnings: ['Excel workbook contains no sheets.'],
        status: 'empty',
      };
    }

    const sheetSummaries: string[] = [];
    const allHeaders: string[] = [];
    let totalRows = 0;

    for (const name of sheetNames) {
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;

      const csvData = xlsx.utils.sheet_to_csv(sheet);
      const rows = csvData.split(/\r?\n/).filter(Boolean);
      totalRows += rows.length;

      if (rows.length > 0) {
        const headers = rows[0].split(',').map((h) => h.trim()).filter(Boolean);
        allHeaders.push(...headers);
        sheetSummaries.push(
          `${name}\n${rows.slice(0, 50).map((r) => r.replace(/[,;\t]/g, ' ')).join('\n')}`
        );
      }
    }

    const rawText = cleanExtractedText(sheetSummaries.join('\n\n'));

    if (rawText.length < MIN_MEANINGFUL_TEXT_CHARS) {
      return {
        text: rawText,
        metadata: { sheetCount: sheetNames.length, rowCount: totalRows },
        warnings: ['Excel spreadsheet contains no meaningful text or numeric cell data.'],
        status: 'empty',
      };
    }

    return {
      text: rawText,
      metadata: {
        sheetCount: sheetNames.length,
        rowCount: totalRows,
        extractedHeadings: Array.from(new Set(allHeaders)).slice(0, 10),
      },
      warnings: [],
      status: 'success',
    };
  } catch (err: any) {
    return {
      text: '',
      metadata: {},
      warnings: [`Excel workbook extraction failed: ${String(err?.message || err)}`],
      status: 'failed',
    };
  }
}

/**
 * Extracts readable document content from an uploaded file based on format
 */
export async function extractDocumentContent(
  fileRecord: UploadedFileRecord
): Promise<DocumentExtractionResult> {
  const startTime = Date.now();
  const ext = (fileRecord.extension || '').toLowerCase().replace(/^\./, '');
  const storagePath = fileRecord.storagePath;

  const baseResult: DocumentExtractionResult = {
    fileId: fileRecord.id,
    originalName: fileRecord.originalName,
    detectedFormat: ext ? ext.toUpperCase() : 'UNKNOWN',
    status: 'unsupported',
    extractedText: '',
    metadata: {
      wordCount: 0,
      charCount: 0,
      processingTimeMs: 0,
    },
    warnings: [],
    isSufficientForAnalysis: false,
  };

  // 1. Guardrail: Oversized files check
  if (fileRecord.size > MAX_EXTRACT_FILE_SIZE) {
    baseResult.status = 'oversized';
    baseResult.warnings.push(
      `File size (${(fileRecord.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum extraction limit (25 MB).`
    );
    baseResult.metadata.processingTimeMs = Date.now() - startTime;
    return baseResult;
  }

  // 2. Guardrail: Check if file exists on disk
  if (!fs.existsSync(storagePath)) {
    baseResult.status = 'failed';
    baseResult.warnings.push('File could not be found on storage disk.');
    baseResult.metadata.processingTimeMs = Date.now() - startTime;
    return baseResult;
  }

  // 3. Format-specific extraction dispatch
  try {
    let extractionOutput: {
      text: string;
      metadata: Partial<DocumentMetadata>;
      warnings: string[];
      status: ExtractionStatus;
    };

    switch (ext) {
      case 'pdf':
        extractionOutput = await extractPdf(storagePath);
        break;

      case 'docx':
        extractionOutput = await extractDocx(storagePath);
        break;

      case 'pptx':
        extractionOutput = await extractPptx(storagePath);
        break;

      case 'xlsx':
      case 'xls':
        extractionOutput = await extractXlsx(storagePath);
        break;

      case 'csv':
      case 'tsv':
        extractionOutput = await extractCsv(storagePath);
        break;

      case 'txt':
      case 'md':
      case 'markdown':
      case 'json':
      case 'log':
      case 'rtf':
      case 'html':
      case 'htm':
      case 'xml':
      case 'yaml':
      case 'yml':
        extractionOutput = await extractTextFile(storagePath);
        break;

      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
      case 'gif':
      case 'svg':
        baseResult.status = 'unsupported';
        baseResult.warnings.push('Image format: Visual raster content requires OCR. Metadata recorded.');
        baseResult.metadata.processingTimeMs = Date.now() - startTime;
        return baseResult;

      default:
        baseResult.status = 'unsupported';
        baseResult.warnings.push(`File format '.${ext}' is currently not supported for direct document text extraction.`);
        baseResult.metadata.processingTimeMs = Date.now() - startTime;
        return baseResult;
    }

    // Truncate if exceeding maximum characters
    let finalText = extractionOutput.text;
    if (finalText.length > MAX_EXTRACTED_CHARACTERS) {
      finalText = finalText.slice(0, MAX_EXTRACTED_CHARACTERS);
      extractionOutput.warnings.push(
        `Extracted content truncated to first ${MAX_EXTRACTED_CHARACTERS} characters for processing efficiency.`
      );
    }

    baseResult.status = extractionOutput.status;
    baseResult.extractedText = finalText;
    baseResult.warnings = extractionOutput.warnings;
    baseResult.metadata = {
      wordCount: countWords(finalText),
      charCount: finalText.length,
      ...extractionOutput.metadata,
      processingTimeMs: Date.now() - startTime,
    };

    // Evaluate sufficiency
    baseResult.isSufficientForAnalysis =
      baseResult.status === 'success' && baseResult.metadata.wordCount >= 5;

    return baseResult;
  } catch (err: any) {
    baseResult.status = 'failed';
    baseResult.warnings.push(`Unexpected extraction error: ${String(err?.message || err)}`);
    baseResult.metadata.processingTimeMs = Date.now() - startTime;
    return baseResult;
  }
}
