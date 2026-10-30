import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sessionService } from '../../services/sessionService';
import {
  buildVirtualTree,
  getDuplicateGroupsDetails,
  getSessionPlanSummary,
  resetSessionPlan,
  updateDuplicateGroupRetention,
  updatePlanFileItem,
} from '../../services/organizationPlanService';
import { validateDestinationFolder, validateProposedFilename } from '../../utils/sanitizer';
import { UploadedFileRecord } from '../../types';

describe('Phase 2: Plan Modification & Renaming Unit Tests', () => {
  let sessionId: string;
  let file1: UploadedFileRecord;
  let file2: UploadedFileRecord;
  let file3Dup: UploadedFileRecord;

  beforeEach(async () => {
    await sessionService.resetAll();
    const session = await sessionService.createSession();
    sessionId = session.id;

    file1 = {
      id: 'f1',
      sessionId,
      originalName: 'quarterly_report.pdf',
      sanitizedName: 'quarterly_report.pdf',
      extension: 'pdf',
      mimeType: 'application/pdf',
      size: 1024,
      sha256: 'hash-pdf-1111',
      category: 'documents',
      categoryReason: 'PDF document',
      suggestedGroup: null,
      groupingReason: 'Default documents folder',
      originalRelativePath: 'Accounting/quarterly_report.pdf',
      storagePath: '/mock/f1.pdf',
      uploadedAt: new Date().toISOString(),
    };

    file2 = {
      id: 'f2',
      sessionId,
      originalName: 'chart.png',
      sanitizedName: 'chart.png',
      extension: 'png',
      mimeType: 'image/png',
      size: 2048,
      sha256: 'hash-img-2222',
      category: 'images',
      categoryReason: 'PNG image',
      suggestedGroup: null,
      groupingReason: 'Default images folder',
      originalRelativePath: null,
      storagePath: '/mock/f2.png',
      uploadedAt: new Date().toISOString(),
    };

    file3Dup = {
      id: 'f3',
      sessionId,
      originalName: 'quarterly_report_backup.pdf',
      sanitizedName: 'quarterly_report_backup.pdf',
      extension: 'pdf',
      mimeType: 'application/pdf',
      size: 1024,
      sha256: 'hash-pdf-1111', // Exact duplicate of file1
      category: 'documents',
      categoryReason: 'PDF document',
      suggestedGroup: null,
      groupingReason: 'Default documents folder',
      originalRelativePath: null,
      storagePath: '/mock/f3.pdf',
      uploadedAt: new Date().toISOString(),
    };

    sessionService.addFileToSession(sessionId, file1);
    sessionService.addFileToSession(sessionId, file2);
    sessionService.addFileToSession(sessionId, file3Dup);
  });

  afterEach(async () => {
    await sessionService.deleteSession(sessionId);
  });

  it('should initialize active plan with all files included by default, including duplicate copies', () => {
    const summary = getSessionPlanSummary(sessionId);
    expect(summary.totalFiles).toBe(3);
    // Critical requirement: all files included in initial export plan by default
    expect(summary.includedInExport).toBe(3);
    expect(summary.excludedDuplicates).toBe(0);

    const f1Plan = summary.plan.find((p) => p.fileId === 'f1')!;
    const f3Plan = summary.plan.find((p) => p.fileId === 'f3')!;

    expect(f1Plan.isIncludedInExport).toBe(true);
    expect(f1Plan.duplicateStatus.isPrimary).toBe(true);
    expect(f3Plan.isIncludedInExport).toBe(true);
    expect(f3Plan.duplicateStatus.isDuplicate).toBe(true);
  });

  it('should safely rename a proposed file without modifying original source filename', () => {
    const updated = updatePlanFileItem(sessionId, 'f1', {
      proposedFilename: 'q1_financial_report.pdf',
    });

    expect(updated.proposedFilename).toBe('q1_financial_report.pdf');
    expect(updated.proposedPath).toBe('Projects/Quarterly/q1_financial_report.pdf');
    expect(updated.userModified).toBe(true);

    // Verify original uploaded file record is unchanged
    const originalRecord = sessionService.getSessionFile(sessionId, 'f1')!;
    expect(originalRecord.originalName).toBe('quarterly_report.pdf');
  });

  it('should reject invalid filenames during rename', () => {
    // 1. Path traversal attempt
    expect(() =>
      updatePlanFileItem(sessionId, 'f1', { proposedFilename: '../escape.pdf' })
    ).toThrowError(/path separator|traversal/i);

    // 2. Windows reserved name
    expect(() =>
      updatePlanFileItem(sessionId, 'f1', { proposedFilename: 'CON.pdf' })
    ).toThrowError(/reserved system name/i);

    // 3. Extension change without allowExtensionChange flag
    expect(() =>
      updatePlanFileItem(sessionId, 'f1', { proposedFilename: 'report.exe' })
    ).toThrowError(/requires explicit confirmation/i);

    // 4. Trailing dot or space
    expect(() =>
      updatePlanFileItem(sessionId, 'f1', { proposedFilename: 'report.pdf.' })
    ).toThrowError(/cannot end with a space or dot/i);
  });

  it('should allow intentional extension changes when allowExtensionChange is true', () => {
    const updated = updatePlanFileItem(sessionId, 'f1', {
      proposedFilename: 'quarterly_report.docx',
      allowExtensionChange: true,
    });
    expect(updated.proposedFilename).toBe('quarterly_report.docx');
  });

  it('should update destination folder and resolve destination path collisions', () => {
    // Move f2 (chart.png) to Documents
    const updated = updatePlanFileItem(sessionId, 'f2', {
      proposedDestinationFolder: 'Documents',
    });
    expect(updated.proposedDestinationFolder).toBe('Documents');
    expect(updated.proposedPath).toBe('Documents/chart.png');

    // Reject unsafe destination folder
    expect(() =>
      updatePlanFileItem(sessionId, 'f2', {
        proposedDestinationFolder: '../Outside',
      })
    ).toThrowError(/traversal/i);
  });

  it('should support duplicate management actions: keep_all, retain_one, and exclude_selected', () => {
    const hash = 'hash-pdf-1111';

    // 1. Check duplicate group status initially (all retained by default)
    const dupGroups = getDuplicateGroupsDetails(sessionId);
    expect(dupGroups.length).toBe(1);
    expect(dupGroups[0].redundantSizeBytes).toBe(1024);
    expect(dupGroups[0].status).toBe('all_retained');

    // 2. Action: retain_one -> switch to retaining only primary copy f1
    const retainOneRes = updateDuplicateGroupRetention(sessionId, hash, {
      action: 'retain_one',
      primaryFileId: 'f1',
    });
    expect(retainOneRes.status).toBe('one_retained');
    const planAfterRetainOne = getSessionPlanSummary(sessionId);
    expect(planAfterRetainOne.includedInExport).toBe(2);
    expect(planAfterRetainOne.excludedDuplicates).toBe(1);

    // 3. Action: keep_all -> restores all copies
    const keepAllRes = updateDuplicateGroupRetention(sessionId, hash, {
      action: 'keep_all',
    });
    expect(keepAllRes.status).toBe('all_retained');
    const planAfterKeepAll = getSessionPlanSummary(sessionId);
    expect(planAfterKeepAll.includedInExport).toBe(3);
    const retainF3Res = updateDuplicateGroupRetention(sessionId, hash, {
      action: 'retain_one',
      primaryFileId: 'f3',
    });
    expect(retainF3Res.status).toBe('one_retained');
    const planAfterRetain = getSessionPlanSummary(sessionId);
    const f1 = planAfterRetain.plan.find((p) => p.fileId === 'f1')!;
    const f3 = planAfterRetain.plan.find((p) => p.fileId === 'f3')!;
    expect(f1.isIncludedInExport).toBe(false);
    expect(f3.isIncludedInExport).toBe(true);

    // 4. Action: exclude_selected
    updateDuplicateGroupRetention(sessionId, hash, {
      action: 'exclude_selected',
      fileIds: ['f3'],
    });
    const planAfterExclude = getSessionPlanSummary(sessionId);
    const f3After = planAfterExclude.plan.find((p) => p.fileId === 'f3')!;
    expect(f3After.isIncludedInExport).toBe(false);
  });

  it('should reset plan back to initial state and record change history', () => {
    // Make several edits
    updatePlanFileItem(sessionId, 'f1', { proposedFilename: 'custom_name.pdf' });
    updatePlanFileItem(sessionId, 'f2', { proposedDestinationFolder: 'Graphics/Charts' });

    // History should reflect edits
    const historyBefore = sessionService.getPlanHistory(sessionId);
    expect(historyBefore.length).toBeGreaterThanOrEqual(2);

    // Reset plan
    const resetSummary = resetSessionPlan(sessionId);
    const f1Reset = resetSummary.plan.find((p) => p.fileId === 'f1')!;
    const f2Reset = resetSummary.plan.find((p) => p.fileId === 'f2')!;

    expect(f1Reset.proposedFilename).toBe('quarterly_report.pdf');
    expect(f2Reset.proposedDestinationFolder).toBe('Images');

    // Change history records the reset
    const historyAfter = sessionService.getPlanHistory(sessionId);
    expect(historyAfter.some((h) => h.changeType === 'PLAN_RESET')).toBe(true);
  });

  it('should generate a structured virtual folder tree preview with summary metrics', () => {
    const treeRes = buildVirtualTree(sessionId);

    expect(treeRes.summary.totalImportedFiles).toBe(3);
    expect(treeRes.summary.includedFiles).toBe(3);
    expect(treeRes.summary.excludedFiles).toBe(0);
    expect(treeRes.summary.duplicateGroups).toBe(1);
    expect(treeRes.summary.estimatedOutputSize).toBe(1024 + 2048 + 1024);
    expect(treeRes.summary.unresolvedConflicts).toBe(0);

    // Tree structure verification
    expect(treeRes.tree.name).toBe('Organized Files');
    expect(treeRes.tree.type).toBe('folder');
    expect(treeRes.tree.children?.length).toBe(2); // Projects and Images

    const projFolder = treeRes.tree.children?.find((c) => c.name === 'Projects');
    expect(projFolder).toBeDefined();
    const quarterlyFolder = projFolder?.children?.find((c) => c.name === 'Quarterly');
    expect(quarterlyFolder).toBeDefined();
    expect(quarterlyFolder?.fileCount).toBe(2); // Both copies included by default
    expect(quarterlyFolder?.children?.some((c) => c.name.includes('quarterly_report'))).toBe(true);
  });
});

describe('Sanitizer & Path Security Unit Tests', () => {
  it('validateProposedFilename handles Unicode, special characters, and length limits', () => {
    // Unicode names are valid
    const unicodeRes = validateProposedFilename('résumé_日本語.pdf');
    expect(unicodeRes.valid).toBe(true);
    expect(unicodeRes.cleanName).toBe('résumé_日本語.pdf');

    // Forbidden characters
    const illegalChars = ['file:name.txt', 'test*1.jpg', 'doc?.pdf', 'foo"bar.txt', 'a<b.txt', 'pipe|test.csv'];
    for (const name of illegalChars) {
      expect(validateProposedFilename(name).valid).toBe(false);
    }
  });

  it('validateDestinationFolder enforces relative paths and rejects directory traversal', () => {
    expect(validateDestinationFolder('Projects/Alpha').valid).toBe(true);
    expect(validateDestinationFolder('').cleanFolder).toBe('');
    expect(validateDestinationFolder('.').cleanFolder).toBe('');

    // Directory traversal rejected
    expect(validateDestinationFolder('../Secret').valid).toBe(false);
    expect(validateDestinationFolder('Projects/../../etc').valid).toBe(false);

    // Absolute and drive paths rejected
    expect(validateDestinationFolder('/var/data').valid).toBe(false);
    expect(validateDestinationFolder('C:\\Windows\\System32').valid).toBe(false);
  });
});
