import { describe, it, expect } from 'vitest';
import {
  tokenizeContent,
  computeCosineSimilarity,
  computeTfIdfVector,
  analyzeDocumentSemantics,
} from '../../services/semanticAnalysisService';
import { DocumentExtractionResult } from '../../types';

function createMockExtraction(
  id: string,
  name: string,
  text: string,
  title?: string
): DocumentExtractionResult {
  return {
    fileId: id,
    originalName: name,
    detectedFormat: name.split('.').pop()?.toUpperCase() || 'TXT',
    status: 'success',
    extractedText: text,
    metadata: {
      wordCount: text.split(/\s+/).length,
      charCount: text.length,
      detectedTitle: title,
      processingTimeMs: 5,
    },
    warnings: [],
    isSufficientForAnalysis: text.trim().length >= 25,
  };
}

describe('Semantic Content Analysis & Explainable Clustering Unit Tests', () => {
  it('groups documents discussing the same project despite completely unrelated filenames and formats', () => {
    // 4 files with completely unrelated names and 4 different formats all about Mars Pathfinder
    const docs: DocumentExtractionResult[] = [
      createMockExtraction(
        'f1',
        'file_001.pdf',
        'Mars Pathfinder Mission overview. The rover exploration team deployed the solar array and initiated surface telemetry in Ares Vallis.',
        'Pathfinder Mission'
      ),
      createMockExtraction(
        'f2',
        'random_document.docx',
        'Pathfinder rover telemetry logs indicate nominal battery temperature and successful transmission of planetary sensor data.',
        'Telemetry Logs'
      ),
      createMockExtraction(
        'f3',
        'final_slides.pptx',
        'Mars exploration mission summary. Presentation of the Pathfinder rover landing site and rock composition results.',
        'Exploration Summary'
      ),
      createMockExtraction(
        'f4',
        'IMG_001.txt',
        'Sensor notes from the Mars surface expedition. Pathfinder telemetry packets confirmed nominal antenna communication.',
        'Sensor Notes'
      ),
    ];

    const result = analyzeDocumentSemantics(docs);

    expect(result.clusters).toHaveLength(1);
    const cluster = result.clusters[0];
    expect(cluster.fileIds).toContain('f1');
    expect(cluster.fileIds).toContain('f2');
    expect(cluster.fileIds).toContain('f3');
    expect(cluster.fileIds).toContain('f4');

    // Folder name derived from content
    expect(cluster.suggestedFolderName.toLowerCase()).toMatch(/pathfinder|mars|telemetry/);

    // Explainable content evidence
    expect(cluster.contentEvidence.length).toBeGreaterThan(0);
    expect(cluster.contentEvidence).toEqual(expect.arrayContaining(['pathfinder']));
    expect(cluster.confidence).toBe('strong');
  });

  it('separates unrelated documents even when they share the exact same PDF extension', () => {
    // 4 PDFs with totally unrelated topics
    const docs: DocumentExtractionResult[] = [
      createMockExtraction(
        'pdf-resume',
        'document_a.pdf',
        'Curriculum Vitae. Senior React and TypeScript software engineer with extensive full-stack web architecture experience and cloud deployments.',
        'Resume'
      ),
      createMockExtraction(
        'pdf-medical',
        'document_b.pdf',
        'Medicard patient health insurance claim. Prescription drug coverage, physician consultation reimbursement, and copay hospital policy.',
        'Medicard Policy'
      ),
      createMockExtraction(
        'pdf-financial',
        'document_c.pdf',
        'Quarterly financial earnings statement. Balance sheet assets, liabilities, operating cash flow, and tax obligations for fiscal 2026.',
        'Quarterly Earnings'
      ),
      createMockExtraction(
        'pdf-travel',
        'document_d.pdf',
        'Flight itinerary and resort booking confirmation. Check-in dates, passenger boarding passes, and rental car reservation.',
        'Travel Itinerary'
      ),
    ];

    const result = analyzeDocumentSemantics(docs);

    // None of these 4 unrelated PDFs should be grouped together into a cluster
    expect(result.clusters).toHaveLength(0);

    // Check pairwise similarities are very low
    const resumeToMedical = result.similarityMatrix.get('pdf-resume')?.get('pdf-medical') || 0;
    const resumeToFinance = result.similarityMatrix.get('pdf-resume')?.get('pdf-financial') || 0;
    expect(resumeToMedical).toBeLessThan(0.15);
    expect(resumeToFinance).toBeLessThan(0.15);
  });

  it('detects conservative version relationships and near-duplicates (Section 6)', () => {
    const textA =
      'Annual Research Report 2026. This comprehensive document analyzes sustainable energy storage in grid batteries. Experimental results show 94% efficiency.';
    const textB =
      'Annual Research Report 2026 Final Revision. This comprehensive document analyzes sustainable energy storage in grid batteries. Experimental results show 94.2% efficiency with updated charts.';

    const docs: DocumentExtractionResult[] = [
      createMockExtraction('v1', 'draft_report.docx', textA, 'Annual Research Report 2026'),
      createMockExtraction('v2', 'final_submission.pdf', textB, 'Annual Research Report 2026 Final'),
    ];

    const result = analyzeDocumentSemantics(docs);

    expect(result.versionRelationships).toHaveLength(1);
    const rel = result.versionRelationships[0];
    expect(rel.sourceFileId).toBe('v1');
    expect(rel.targetFileId).toBe('v2');
    expect(rel.similarityScore).toBeGreaterThanOrEqual(0.85);
    expect(rel.relationshipType).toBe('near_duplicate');
    expect(rel.explanation).toContain('text similarity');
    expect(rel.contentEvidence).toContain('annual');
    expect(rel.contentEvidence).toContain('research');
  });

  it('safely skips files with insufficient or empty text content', () => {
    const docs: DocumentExtractionResult[] = [
      createMockExtraction('f1', 'valid1.txt', 'Quantum computing qubits entanglement and decoherence simulation models.'),
      createMockExtraction('f2', 'valid2.txt', 'Quantum computing algorithm bench testing with 54 qubits processor simulation.'),
      {
        fileId: 'f-empty',
        originalName: 'empty.pdf',
        detectedFormat: 'PDF',
        status: 'empty',
        extractedText: '',
        metadata: { wordCount: 0, charCount: 0, processingTimeMs: 1 },
        warnings: ['Scanned PDF requires OCR'],
        isSufficientForAnalysis: false,
      },
    ];

    const result = analyzeDocumentSemantics(docs);

    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0].fileIds).toContain('f1');
    expect(result.clusters[0].fileIds).toContain('f2');
    expect(result.clusters[0].fileIds).not.toContain('f-empty');
  });
});
