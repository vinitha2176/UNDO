// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api } from '../services/api';
import { generateSampleFiles } from '../services/sampleData';
import http from 'http';

describe('Frontend API Client & Backend Live Integration Tests', () => {
  let serverInstance: http.Server | null = null;
  let activeSessionId: string | null = null;

  beforeAll(async () => {
    // Start backend in-process if port 3001 isn't already active
    try {
      const res = await fetch('http://localhost:3001/api/v1/health', {
        signal: AbortSignal.timeout(800),
      });
      if (res.ok) return;
    } catch {
      // not running, spawn
    }

    const { createApp } = await import('../../../backend/src/app');
    const app = createApp();
    await new Promise<void>((resolve, reject) => {
      serverInstance = app.listen(3001, () => {
        resolve();
      });
      serverInstance.on('error', reject);
    });
  }, 25000);

  afterAll(async () => {
    if (serverInstance) {
      await new Promise<void>((resolve) => {
        (serverInstance as http.Server).close(() => resolve());
      });
    }
  });

  it('verifies backend health check via frontend API client', async () => {
    const health = await api.checkHealth();
    expect(health.status).toBe('ok');
    expect(health.version).toBe('1.0.0');
  });

  it('creates an isolated session and uploads synthetic sample files', async () => {
    const session = await api.createSession();
    expect(session.sessionId).toBeDefined();
    activeSessionId = session.sessionId;

    const samples = generateSampleFiles();
    const uploadRes = await api.uploadFiles(activeSessionId, samples);

    expect(uploadRes.uploadedCount).toBe(9);
    expect(uploadRes.totalSessionFiles).toBe(9);
    expect(uploadRes.files.length).toBe(9);
  });

  it('retrieves analysis and detects exact duplicates from backend', async () => {
    if (!activeSessionId) return;

    const analysis = await api.getSessionAnalysis(activeSessionId);
    expect(analysis.totalFiles).toBe(9);
    expect(analysis.duplicateGroups.length).toBeGreaterThanOrEqual(1);

    const dup = analysis.duplicateGroups[0];
    expect(dup.fileCount).toBe(2);
  });

  it('retrieves plan, modifies proposed filename and folder, and updates duplicate retention', async () => {
    if (!activeSessionId) return;

    const plan = await api.getSessionPlan(activeSessionId);
    expect(plan.totalFiles).toBe(9);
    expect(plan.includedInExport).toBe(9); // all files included by default, including exact duplicates

    // Modify first file
    const targetFile = plan.plan[0];
    const updated = await api.updatePlanFile(activeSessionId, targetFile.fileId, {
      proposedFilename: 'custom_renamed_file.pdf',
      proposedDestinationFolder: 'Projects/KeyAssets',
    });

    expect(updated.proposedFilename).toBe('custom_renamed_file.pdf');
    expect(updated.proposedDestinationFolder).toBe('Projects/KeyAssets');

    // Retrieve updated virtual tree
    const treeRes = await api.getPlanTree(activeSessionId);
    expect(treeRes.summary.totalImportedFiles).toBe(9);
    expect(treeRes.summary.renamedCount).toBeGreaterThanOrEqual(1);

    // Initial duplicate status is all_retained
    const dupGroup = (await api.getDuplicateGroups(activeSessionId))[0];
    expect(dupGroup.status).toBe('all_retained');

    // Update duplicate group retention to retain one
    const updatedDup = await api.updateDuplicateGroup(activeSessionId, dupGroup.sha256, {
      action: 'retain_one',
      primaryFileId: dupGroup.copies[0].fileId,
    });
    expect(updatedDup.status).toBe('one_retained');

    // Then restore to keep_all
    const keepAllDup = await api.updateDuplicateGroup(activeSessionId, dupGroup.sha256, {
      action: 'keep_all',
    });
    expect(keepAllDup.status).toBe('all_retained');
  });

  it('triggers real ZIP export generation via backend', async () => {
    if (!activeSessionId) return;

    const exportRecord = await api.createExport(activeSessionId);
    expect(exportRecord.exportId).toBeDefined();
    expect(exportRecord.sizeBytes).toBeGreaterThan(0);
    expect(exportRecord.fileCount).toBe(9);
  });
});
