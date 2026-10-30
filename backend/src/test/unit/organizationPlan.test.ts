import { describe, it, expect } from 'vitest';
import { generateOrganizationPlan } from '../../services/organizationPlanService';
import { UploadedFileRecord } from '../../types';

describe('Organization Plan Service Unit Tests', () => {
  it('should generate plan with category folders and project folders', () => {
    const rawFiles: UploadedFileRecord[] = [
      {
        id: 'f1',
        sessionId: 'sess-1',
        originalName: 'notes.txt',
        sanitizedName: 'notes.txt',
        extension: 'txt',
        mimeType: 'text/plain',
        size: 100,
        sha256: 'hash-aaa',
        category: 'documents',
        categoryReason: 'Text file',
        suggestedGroup: null,
        groupingReason: null,
        originalRelativePath: null,
        storagePath: '/mock/f1.txt',
        uploadedAt: new Date().toISOString(),
      },
      {
        id: 'f2',
        sessionId: 'sess-1',
        originalName: 'alpha_doc.pdf',
        sanitizedName: 'alpha_doc.pdf',
        extension: 'pdf',
        mimeType: 'application/pdf',
        size: 200,
        sha256: 'hash-bbb',
        category: 'documents',
        categoryReason: 'PDF doc',
        suggestedGroup: null,
        groupingReason: null,
        originalRelativePath: null,
        storagePath: '/mock/f2.pdf',
        uploadedAt: new Date().toISOString(),
      },
      {
        id: 'f3',
        sessionId: 'sess-1',
        originalName: 'alpha_slides.pptx',
        sanitizedName: 'alpha_slides.pptx',
        extension: 'pptx',
        mimeType: 'application/vnd.ms-powerpoint',
        size: 300,
        sha256: 'hash-ccc',
        category: 'presentations',
        categoryReason: 'Presentation',
        suggestedGroup: null,
        groupingReason: null,
        originalRelativePath: null,
        storagePath: '/mock/f3.pptx',
        uploadedAt: new Date().toISOString(),
      },
    ];

    const planSummary = generateOrganizationPlan('sess-1', rawFiles);

    expect(planSummary.totalFiles).toBe(3);
    expect(planSummary.includedInExport).toBe(3);
    expect(planSummary.excludedDuplicates).toBe(0);

    // f1 should go to Documents
    const p1 = planSummary.plan.find((p) => p.fileId === 'f1');
    expect(p1?.proposedDestinationFolder).toBe('Documents');

    // f2 and f3 should go to Projects/Alpha
    const p2 = planSummary.plan.find((p) => p.fileId === 'f2');
    expect(p2?.proposedDestinationFolder).toBe('Projects/Alpha');

    const p3 = planSummary.plan.find((p) => p.fileId === 'f3');
    expect(p3?.proposedDestinationFolder).toBe('Projects/Alpha');
  });

  it('should predictably resolve filename collisions in destination folder', () => {
    const rawFiles: UploadedFileRecord[] = [
      {
        id: 'f1',
        sessionId: 'sess-1',
        originalName: 'data.csv',
        sanitizedName: 'data.csv',
        extension: 'csv',
        mimeType: 'text/csv',
        size: 150,
        sha256: 'hash-111', // different content
        category: 'spreadsheets',
        categoryReason: 'CSV',
        suggestedGroup: null,
        groupingReason: null,
        originalRelativePath: null,
        storagePath: '/mock/f1.csv',
        uploadedAt: new Date().toISOString(),
      },
      {
        id: 'f2',
        sessionId: 'sess-1',
        originalName: 'data.csv', // identical filename, different content
        sanitizedName: 'data.csv',
        extension: 'csv',
        mimeType: 'text/csv',
        size: 250,
        sha256: 'hash-222', // different content
        category: 'spreadsheets',
        categoryReason: 'CSV',
        suggestedGroup: null,
        groupingReason: null,
        originalRelativePath: null,
        storagePath: '/mock/f2.csv',
        uploadedAt: new Date().toISOString(),
      },
    ];

    const planSummary = generateOrganizationPlan('sess-1', rawFiles);
    expect(planSummary.plan[0].proposedFilename).toBe('data.csv');
    expect(planSummary.plan[0].proposedPath).toBe('Spreadsheets/data.csv');

    expect(planSummary.plan[1].proposedFilename).toBe('data (1).csv');
    expect(planSummary.plan[1].proposedPath).toBe('Spreadsheets/data (1).csv');
  });

  it('should mark exact SHA-256 duplicate copies as included by default with duplicate status', () => {
    const rawFiles: UploadedFileRecord[] = [
      {
        id: 'f1',
        sessionId: 'sess-1',
        originalName: 'invoice.pdf',
        sanitizedName: 'invoice.pdf',
        extension: 'pdf',
        mimeType: 'application/pdf',
        size: 500,
        sha256: 'identical-hash-999',
        category: 'documents',
        categoryReason: 'PDF doc',
        suggestedGroup: null,
        groupingReason: null,
        originalRelativePath: null,
        storagePath: '/mock/f1.pdf',
        uploadedAt: new Date().toISOString(),
      },
      {
        id: 'f2',
        sessionId: 'sess-1',
        originalName: 'invoice_copy.pdf',
        sanitizedName: 'invoice_copy.pdf',
        extension: 'pdf',
        mimeType: 'application/pdf',
        size: 500,
        sha256: 'identical-hash-999', // EXACT DUPLICATE
        category: 'documents',
        categoryReason: 'PDF doc',
        suggestedGroup: null,
        groupingReason: null,
        originalRelativePath: null,
        storagePath: '/mock/f2.pdf',
        uploadedAt: new Date().toISOString(),
      },
    ];

    const planSummary = generateOrganizationPlan('sess-1', rawFiles);

    expect(planSummary.totalFiles).toBe(2);
    // All uploaded files must be included in initial export plan by default, including exact duplicates
    expect(planSummary.includedInExport).toBe(2);
    expect(planSummary.excludedDuplicates).toBe(0);

    const primaryPlan = planSummary.plan.find((p) => p.fileId === 'f1')!;
    expect(primaryPlan.duplicateStatus.isDuplicate).toBe(false);
    expect(primaryPlan.duplicateStatus.isPrimary).toBe(true);
    expect(primaryPlan.isIncludedInExport).toBe(true);

    const dupPlan = planSummary.plan.find((p) => p.fileId === 'f2')!;
    expect(dupPlan.duplicateStatus.isDuplicate).toBe(true);
    expect(dupPlan.duplicateStatus.isPrimary).toBe(false);
    expect(dupPlan.duplicateStatus.duplicateOfFileId).toBe('f1');
    expect(dupPlan.isIncludedInExport).toBe(true); // retained by default
  });
});
