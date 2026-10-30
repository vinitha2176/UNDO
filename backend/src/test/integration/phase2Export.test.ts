import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { app } from '../../app';
import { sessionService } from '../../services/sessionService';

describe('Phase 2: End-to-End API & Organized ZIP Export Integration Tests', () => {
  beforeAll(async () => {
    await sessionService.resetAll();
  });

  afterAll(async () => {
    sessionService.stopCleanup();
    await sessionService.resetAll();
  });

  it('Complete Workflow: Upload -> Modify Plan -> Duplicates -> Tree -> Export ZIP -> Verify Byte Integrity', async () => {
    // 1. Create a new session
    const createRes = await request(app).post('/api/v1/sessions');
    expect(createRes.status).toBe(201);
    const sessionId = createRes.body.data.sessionId;

    // 2. Prepare synthetic test files
    const specPdfContent = Buffer.from('%PDF-1.4 Synthetic Pathfinder Specification Content');
    const specPdfHash = crypto.createHash('sha256').update(specPdfContent).digest('hex');

    const diagramPngContent = Buffer.from('\x89PNG\r\n\x1a\nSynthetic PNG graphic bytes');
    const diagramPngHash = crypto.createHash('sha256').update(diagramPngContent).digest('hex');

    const sourceCodeContent = Buffer.from('console.log("Hello, UNDO file organizer!");');
    const sourceCodeHash = crypto.createHash('sha256').update(sourceCodeContent).digest('hex');

    // 3. Upload files (including an exact duplicate of specPdfContent under a different name)
    const uploadRes = await request(app)
      .post(`/api/v1/sessions/${sessionId}/files`)
      .attach('files', specPdfContent, 'pathfinder_spec.pdf')
      .attach('files', specPdfContent, 'pathfinder_spec_copy.pdf') // exact duplicate
      .attach('files', diagramPngContent, 'pathfinder_diagram.png')
      .attach('files', sourceCodeContent, 'main.ts');

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.data.uploadedCount).toBe(4);
    const uploadedFiles = uploadRes.body.data.files;
    expect(uploadedFiles.length).toBe(4);

    const specFile = uploadedFiles.find((f: any) => f.originalName === 'pathfinder_spec.pdf');
    const copyFile = uploadedFiles.find((f: any) => f.originalName === 'pathfinder_spec_copy.pdf');
    const diagramFile = uploadedFiles.find((f: any) => f.originalName === 'pathfinder_diagram.png');
    const mainFile = uploadedFiles.find((f: any) => f.originalName === 'main.ts');

    expect(specFile).toBeDefined();
    expect(copyFile).toBeDefined();
    expect(diagramFile).toBeDefined();
    expect(mainFile).toBeDefined();

    // 4. Retrieve initial plan (all files included by default, including duplicates)
    const planRes = await request(app).get(`/api/v1/sessions/${sessionId}/plan`);
    expect(planRes.status).toBe(200);
    expect(planRes.body.data.totalFiles).toBe(4);
    expect(planRes.body.data.includedInExport).toBe(4); // All files retained by default
    expect(planRes.body.data.excludedDuplicates).toBe(0);

    // 5. Test Plan Modification (Rename and Reassign Destination)
    const renameRes = await request(app)
      .patch(`/api/v1/sessions/${sessionId}/plan/files/${diagramFile.id}`)
      .send({
        proposedFilename: 'pathfinder_architecture_diagram.png',
        proposedDestinationFolder: 'Projects/Pathfinder/Assets',
      });

    expect(renameRes.status).toBe(200);
    expect(renameRes.body.data.proposedFilename).toBe('pathfinder_architecture_diagram.png');
    expect(renameRes.body.data.proposedDestinationFolder).toBe('Projects/Pathfinder/Assets');
    expect(renameRes.body.data.proposedPath).toBe('Projects/Pathfinder/Assets/pathfinder_architecture_diagram.png');

    // 6. Test Duplicate Management Endpoint (initial state is all_retained)
    const dupRes = await request(app).get(`/api/v1/sessions/${sessionId}/duplicates`);
    expect(dupRes.status).toBe(200);
    expect(dupRes.body.data.count).toBe(1);
    const dupGroup = dupRes.body.data.duplicateGroups[0];
    expect(dupGroup.sha256).toBe(specPdfHash);
    expect(dupGroup.fileCount).toBe(2);
    expect(dupGroup.status).toBe('all_retained');

    // Explicitly exclude the duplicate copy to test duplicate management
    const excludeRes = await request(app)
      .patch(`/api/v1/sessions/${sessionId}/duplicates/${specPdfHash}`)
      .send({
        action: 'retain_one',
        primaryFileId: specFile.id,
      });
    expect(excludeRes.status).toBe(200);
    expect(excludeRes.body.data.status).toBe('one_retained');

    // 7. Check Virtual Tree Preview Endpoint after explicit exclusion
    const treeRes = await request(app).get(`/api/v1/sessions/${sessionId}/plan/tree`);
    expect(treeRes.status).toBe(200);
    expect(treeRes.body.data.summary.totalImportedFiles).toBe(4);
    expect(treeRes.body.data.summary.includedFiles).toBe(3);
    expect(treeRes.body.data.summary.excludedFiles).toBe(1);
    expect(treeRes.body.data.summary.renamedCount).toBe(1);

    // 8. Check Change History Endpoint
    const changesRes = await request(app).get(`/api/v1/sessions/${sessionId}/changes`);
    expect(changesRes.status).toBe(200);
    expect(changesRes.body.data.count).toBeGreaterThanOrEqual(2); // rename + destination change

    // 9. Generate Organized ZIP Export
    const exportRes = await request(app).post(`/api/v1/sessions/${sessionId}/exports`);
    expect(exportRes.status).toBe(201);
    expect(exportRes.body.success).toBe(true);
    expect(exportRes.body.data).toHaveProperty('exportId');
    expect(exportRes.body.data.fileCount).toBe(3); // 3 files + manifest inside zip
    const exportId = exportRes.body.data.exportId;

    // 10. Download the Export Archive
    const downloadRes = await request(app)
      .get(`/api/v1/sessions/${sessionId}/exports/${exportId}/download`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.header['content-type']).toBe('application/zip');
    expect(downloadRes.header['content-disposition']).toContain('attachment');
    const zipBuffer: Buffer = downloadRes.body;
    expect(zipBuffer.length).toBeGreaterThan(0);

    // 11. Extract and Inspect ZIP in isolated memory using AdmZip
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();
    const entryNames = zipEntries.map((e) => e.entryName);

    // Verify undo-manifest.json exists at root
    expect(entryNames).toContain('undo-manifest.json');
    const manifestEntry = zip.getEntry('undo-manifest.json')!;
    const manifestJson = JSON.parse(manifestEntry.getData().toString('utf8'));

    expect(manifestJson.application).toBe('UNDO');
    expect(manifestJson.manifestVersion).toBe('1.0');
    expect(manifestJson.sessionReference).toBe(sessionId);
    expect(manifestJson.totalImportedFiles).toBe(4);
    expect(manifestJson.totalExportedFiles).toBe(3);
    expect(manifestJson.totalExcludedFiles).toBe(1);

    // Verify manifest entries do NOT leak server filesystem paths
    for (const fileEntry of manifestJson.files) {
      expect(fileEntry).not.toHaveProperty('storagePath');
      expect(fileEntry).not.toHaveProperty('filePath');
      if (fileEntry.exportedPath) {
        expect(fileEntry.exportedPath).not.toContain('storage');
        expect(fileEntry.exportedPath).not.toContain('node_modules');
      }
    }

    // Verify excluded duplicate is NOT inside ZIP
    const hasCopy = entryNames.some((n) => n.includes('pathfinder_spec_copy.pdf'));
    expect(hasCopy).toBe(false);

    // Verify renamed diagram exists at new destination
    expect(entryNames).toContain('Projects/Pathfinder/Assets/pathfinder_architecture_diagram.png');
    const exportedDiagram = zip.getEntry('Projects/Pathfinder/Assets/pathfinder_architecture_diagram.png')!;
    const extractedDiagramHash = crypto.createHash('sha256').update(exportedDiagram.getData()).digest('hex');
    expect(extractedDiagramHash).toBe(diagramPngHash);

    // Verify source code exists and retains exact byte hash
    expect(entryNames).toContain('Source Code/main.ts');
    const exportedMain = zip.getEntry('Source Code/main.ts')!;
    const extractedMainHash = crypto.createHash('sha256').update(exportedMain.getData()).digest('hex');
    expect(extractedMainHash).toBe(sourceCodeHash);

    // Verify spec PDF exists and retains exact byte hash
    expect(entryNames).toContain('Projects/Pathfinder/pathfinder_spec.pdf');
    const exportedSpec = zip.getEntry('Projects/Pathfinder/pathfinder_spec.pdf')!;
    const extractedSpecHash = crypto.createHash('sha256').update(exportedSpec.getData()).digest('hex');
    expect(extractedSpecHash).toBe(specPdfHash);

    // 12. Security: Verify non-existent session or export download returns 404
    const fakeExportId = crypto.randomUUID();
    const badDownloadRes = await request(app).get(
      `/api/v1/sessions/${sessionId}/exports/${fakeExportId}/download`
    );
    expect(badDownloadRes.status).toBe(404);
  });
});

