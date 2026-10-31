import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import * as xlsx from 'xlsx';
import { extractDocumentContent } from '../../services/contentExtractor';
import { UploadedFileRecord } from '../../types';

const TEST_DIR = path.join(__dirname, 'temp_extractor_test');

function createMockRecord(fileName: string, filePath: string, size = 100): UploadedFileRecord {
  const ext = path.extname(fileName).replace(/^\./, '');
  return {
    id: crypto.randomUUID(),
    sessionId: 'test-session',
    originalName: fileName,
    sanitizedName: fileName,
    extension: ext,
    mimeType: 'application/octet-stream',
    size,
    sha256: crypto.createHash('sha256').update(fileName).digest('hex'),
    category: 'documents',
    categoryReason: 'test',
    suggestedGroup: null,
    groupingReason: null,
    originalRelativePath: null,
    storagePath: filePath,
    uploadedAt: new Date().toISOString(),
  };
}

describe('Modular Document Content Extraction Layer Unit Tests', () => {
  beforeAll(async () => {
    if (!fs.existsSync(TEST_DIR)) {
      await fs.promises.mkdir(TEST_DIR, { recursive: true });
    }
  });

  afterAll(async () => {
    if (fs.existsSync(TEST_DIR)) {
      await fs.promises.rm(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('extracts plain text and markdown documents with headings and title', async () => {
    const filePath = path.join(TEST_DIR, 'spec.md');
    const content = '# Mars Pathfinder Mission Overview\n\nThis is the technical specification document for the avionics telemetry system.\n\n## Subsystem Architecture\nDetails on radio frequency and thruster telemetry.';
    await fs.promises.writeFile(filePath, content, 'utf8');

    const record = createMockRecord('spec.md', filePath, content.length);
    const result = await extractDocumentContent(record);

    expect(result.status).toBe('success');
    expect(result.detectedFormat).toBe('MD');
    expect(result.isSufficientForAnalysis).toBe(true);
    expect(result.extractedText).toContain('Mars Pathfinder Mission Overview');
    expect(result.metadata.detectedTitle).toBe('Mars Pathfinder Mission Overview');
    expect(result.metadata.extractedHeadings).toContain('Mars Pathfinder Mission Overview');
    expect(result.metadata.wordCount).toBeGreaterThan(15);
  });

  it('extracts tabular CSV documents with column headings and row metrics', async () => {
    const filePath = path.join(TEST_DIR, 'budget.csv');
    const content = 'Quarter,Department,Allocation,Spent\nQ1,Engineering,150000,142000\nQ2,Research,200000,189000\nQ3,Avionics,300000,285000\n';
    await fs.promises.writeFile(filePath, content, 'utf8');

    const record = createMockRecord('budget.csv', filePath, content.length);
    const result = await extractDocumentContent(record);

    expect(result.status).toBe('success');
    expect(result.detectedFormat).toBe('CSV');
    expect(result.metadata.rowCount).toBe(3);
    expect(result.metadata.columnCount).toBe(4);
    expect(result.metadata.extractedHeadings).toEqual(['Quarter', 'Department', 'Allocation', 'Spent']);
    expect(result.extractedText).toContain('Engineering');
  });

  it('extracts Excel (XLSX) workbooks with multiple sheets and headers', async () => {
    const filePath = path.join(TEST_DIR, 'financial_model.xlsx');
    const wb = xlsx.utils.book_new();
    const wsData = [
      ['Metric', 'Target 2026', 'Actual 2026'],
      ['Revenue', '5000000', '5200000'],
      ['Expenses', '3200000', '3100000'],
    ];
    const ws = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, 'Summary');
    xlsx.writeFile(wb, filePath);

    const record = createMockRecord('financial_model.xlsx', filePath, 2000);
    const result = await extractDocumentContent(record);

    expect(result.status).toBe('success');
    expect(result.detectedFormat).toBe('XLSX');
    expect(result.metadata.sheetCount).toBe(1);
    expect(result.extractedText).toContain('Summary');
    expect(result.extractedText).toContain('Revenue');
    expect(result.isSufficientForAnalysis).toBe(true);
  });

  it('extracts PowerPoint (PPTX) presentations with slide text and titles', async () => {
    const filePath = path.join(TEST_DIR, 'keynote.pptx');
    const zip = new AdmZip();
    // Create PPTX structure
    const slide1Xml = '<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Deep Space Exploration Keynote</a:t></a:r></a:p></p:txBody></p:sp><p:sp><p:txBody><a:p><a:r><a:t>Pathfinder Rover Phase II Status</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>';
    const slide2Xml = '<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Telemetry and Planetary Analysis</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>';

    zip.addFile('ppt/slides/slide1.xml', Buffer.from(slide1Xml, 'utf8'));
    zip.addFile('ppt/slides/slide2.xml', Buffer.from(slide2Xml, 'utf8'));
    zip.writeZip(filePath);

    const record = createMockRecord('keynote.pptx', filePath, 1500);
    const result = await extractDocumentContent(record);

    expect(result.status).toBe('success');
    expect(result.detectedFormat).toBe('PPTX');
    expect(result.metadata.slideCount).toBe(2);
    expect(result.extractedText).toContain('Deep Space Exploration Keynote');
    expect(result.extractedText).toContain('Pathfinder Rover Phase II Status');
    expect(result.metadata.detectedTitle).toBe('Deep Space Exploration Keynote');
  });

  it('extracts DOCX documents with paragraphs and headings', async () => {
    const filePath = path.join(TEST_DIR, 'medical_report.docx');
    const zip = new AdmZip();
    // Construct minimal valid DOCX structure for mammoth
    const docXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Medicard Health Insurance Plan</w:t></w:r></w:p><w:p><w:r><w:t>Comprehensive patient reimbursement guidelines for fiscal year 2026.</w:t></w:r></w:p></w:body></w:document>';
    const relsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
    const contentTypesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';

    zip.addFile('word/document.xml', Buffer.from(docXml, 'utf8'));
    zip.addFile('_rels/.rels', Buffer.from(relsXml, 'utf8'));
    zip.addFile('[Content_Types].xml', Buffer.from(contentTypesXml, 'utf8'));
    zip.writeZip(filePath);

    const record = createMockRecord('medical_report.docx', filePath, 2500);
    const result = await extractDocumentContent(record);

    expect(result.status).toBe('success');
    expect(result.detectedFormat).toBe('DOCX');
    expect(result.extractedText).toContain('Medicard Health Insurance Plan');
    expect(result.isSufficientForAnalysis).toBe(true);
  });

  it('gracefully handles empty documents without crashing', async () => {
    const filePath = path.join(TEST_DIR, 'empty.txt');
    await fs.promises.writeFile(filePath, '   \n  ', 'utf8');

    const record = createMockRecord('empty.txt', filePath, 5);
    const result = await extractDocumentContent(record);

    expect(result.status).toBe('empty');
    expect(result.isSufficientForAnalysis).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('marks image files as requiring OCR rather than pretending content was understood', async () => {
    const filePath = path.join(TEST_DIR, 'sample.png');
    await fs.promises.writeFile(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47])); // PNG header

    const record = createMockRecord('sample.png', filePath, 4);
    const result = await extractDocumentContent(record);

    expect(result.status).toBe('unsupported');
    expect(result.isSufficientForAnalysis).toBe(false);
    expect(result.warnings[0]).toContain('requires OCR');
  });

  it('protects against oversized files above 25MB', async () => {
    const filePath = path.join(TEST_DIR, 'oversized.pdf');
    // We don't need a real 26MB file on disk; the guard checks record.size first
    const record = createMockRecord('oversized.pdf', filePath, 30 * 1024 * 1024);
    const result = await extractDocumentContent(record);

    expect(result.status).toBe('oversized');
    expect(result.isSufficientForAnalysis).toBe(false);
    expect(result.warnings[0]).toContain('exceeds maximum extraction limit');
  });

  it('gracefully handles corrupted zip archives in docx/pptx/xlsx', async () => {
    const filePath = path.join(TEST_DIR, 'corrupt.docx');
    await fs.promises.writeFile(filePath, 'THIS_IS_NOT_A_VALID_ZIP_ARCHIVE', 'utf8');

    const record = createMockRecord('corrupt.docx', filePath, 30);
    const result = await extractDocumentContent(record);

    expect(result.status).toBe('failed');
    expect(result.isSufficientForAnalysis).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
