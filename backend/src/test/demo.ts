import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import crypto from 'crypto';
import AdmZip from 'adm-zip';

async function isServerRunning(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 600);
    const res = await fetch(`${url}/health`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

function computeBufferSha256(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function runPhase2Demo() {
  const defaultBaseUrl = 'http://localhost:3001/api/v1';
  let activeBaseUrl = defaultBaseUrl;
  let serverInstance: http.Server | null = null;
  const tempDir = path.join(os.tmpdir(), `undo_phase2_demo_${Date.now()}`);
  const extractDir = path.join(os.tmpdir(), `undo_phase2_extract_${Date.now()}`);

  console.log('========================================================================');
  console.log('   UNDO BACKEND PHASE 2 — EDITABLE PLANS & ORGANIZED ZIP EXPORT DEMO   ');
  console.log('========================================================================');

  try {
    // 0. Server detection / Auto-bootstrap
    const alreadyRunning = await isServerRunning(defaultBaseUrl);
    if (alreadyRunning) {
      console.log(`\n[Server] Connected to active Undo backend at ${defaultBaseUrl}`);
    } else {
      console.log('\n[Server] No running server found on port 3001. Starting in-process instance...');
      const { createApp } = await import('../app');
      const app = createApp();

      serverInstance = await new Promise<http.Server>((resolve, reject) => {
        const s = app.listen(0, () => {
          const address = s.address();
          if (address && typeof address === 'object') {
            activeBaseUrl = `http://localhost:${address.port}/api/v1`;
            console.log(`[Server] In-process server listening on ${activeBaseUrl}`);
            resolve(s);
          } else {
            reject(new Error('Failed to resolve server port'));
          }
        });
        s.on('error', reject);
      });
    }

    // Step 1: Health Check
    console.log('\n------------------------------------------------------------------------');
    console.log('STEP 1: Backend Health Check');
    console.log('GET /api/v1/health');
    console.log('------------------------------------------------------------------------');
    const healthRes = await fetch(`${activeBaseUrl}/health`);
    console.log(JSON.stringify(await healthRes.json(), null, 2));

    // Step 2: Create Isolated Session
    console.log('\n------------------------------------------------------------------------');
    console.log('STEP 2: Create Isolated Session');
    console.log('POST /api/v1/sessions');
    console.log('------------------------------------------------------------------------');
    const sessionRes = await fetch(`${activeBaseUrl}/sessions`, { method: 'POST' });
    const sessionJson = (await sessionRes.json()) as any;
    const sessionId = sessionJson.data.sessionId;
    console.log(`Created Session ID: ${sessionId}`);

    // Step 3: Prepare Synthetic Dataset
    // Requirements:
    // - Two identical PDFs with different filenames
    // - Two images with different content
    // - Three files belonging to one fictional project ("pathfinder")
    // - One spreadsheet
    // - One source code file
    // - Two files that would create a destination name conflict
    console.log('\n------------------------------------------------------------------------');
    console.log('STEP 3: Preparing Synthetic Dataset & Multi-File Upload');
    console.log(`POST /api/v1/sessions/${sessionId}/files`);
    console.log('------------------------------------------------------------------------');

    fs.mkdirSync(tempDir, { recursive: true });

    const originalFileBytes = new Map<string, Buffer>();

    // 1 & 2: Two identical PDFs with different filenames
    const pdfBytes = Buffer.from('%PDF-1.4 Synthetic Pathfinder Core Architecture Document');
    originalFileBytes.set('project_spec.pdf', pdfBytes);
    originalFileBytes.set('project_spec_backup.pdf', pdfBytes);

    // 3 & 4: Two images with different content
    const img1Bytes = Buffer.from('\x89PNG\r\n\x1a\nSynthetic Image A (Header Graphic)');
    const img2Bytes = Buffer.from('\x89PNG\r\n\x1a\nSynthetic Image B (Infographic Vector)');
    originalFileBytes.set('banner.png', img1Bytes);
    originalFileBytes.set('diagram.png', img2Bytes);

    // 5, 6, 7: Three files belonging to fictional project "pathfinder"
    const pf1Bytes = Buffer.from('%PDF-1.4 Pathfinder Requirements Analysis');
    const pf2Bytes = Buffer.from('\x89PNG\r\n\x1a\nPathfinder Flow Diagram');
    const pf3Bytes = Buffer.from('Pathfinder Project Deck Presentation Slide Data');
    originalFileBytes.set('pathfinder_requirements.pdf', pf1Bytes);
    originalFileBytes.set('pathfinder_flow.png', pf2Bytes);
    originalFileBytes.set('pathfinder_deck.pptx', pf3Bytes);

    // 8: One spreadsheet
    const sheetBytes = Buffer.from('Quarter,Revenue,Expenses\nQ1,120000,90000\nQ2,145000,95000\n');
    originalFileBytes.set('q1_budget.xlsx', sheetBytes);

    // 9: One source code file
    const codeBytes = Buffer.from('def calculate_metrics(values):\n    return sum(values) / len(values)\n');
    originalFileBytes.set('algorithm.py', codeBytes);

    // 10 & 11: Two files that create a destination name conflict
    // e.g. two separate text notes named notes.txt from two subfolders
    const notes1Bytes = Buffer.from('Notes from meeting with client A');
    const notes2Bytes = Buffer.from('Notes from meeting with client B');
    originalFileBytes.set('notes.txt', notes1Bytes);
    originalFileBytes.set('meeting_notes_conflict.txt', notes2Bytes);

    const formData = new FormData();
    for (const [filename, buf] of originalFileBytes.entries()) {
      formData.append('files', new Blob([buf]), filename);
    }

    const uploadRes = await fetch(`${activeBaseUrl}/sessions/${sessionId}/files`, {
      method: 'POST',
      body: formData,
    });
    const uploadJson = (await uploadRes.json()) as any;
    console.log(`Upload Complete: ${uploadJson.data.uploadedCount} files imported into session`);
    const sessionFiles = uploadJson.data.files;

    // Step 4: Retrieve Initial Organization Plan
    console.log('\n------------------------------------------------------------------------');
    console.log('STEP 4: Retrieve Proposed Organization Plan');
    console.log(`GET /api/v1/sessions/${sessionId}/plan`);
    console.log('------------------------------------------------------------------------');
    const planRes = await fetch(`${activeBaseUrl}/sessions/${sessionId}/plan`);
    const planJson = (await planRes.json()) as any;
    console.log(`Total Files in Plan: ${planJson.data.totalFiles}`);
    console.log(`Included in Export: ${planJson.data.includedInExport}`);
    console.log(`Excluded Duplicates: ${planJson.data.excludedDuplicates}`);
    console.log(`Target Folders: ${planJson.data.targetFolders.join(', ')}`);

    // Step 5: Duplicate Detection & Actions
    console.log('\n------------------------------------------------------------------------');
    console.log('STEP 5: Duplicate Detection');
    console.log(`GET /api/v1/sessions/${sessionId}/duplicates`);
    console.log('------------------------------------------------------------------------');
    const dupRes = await fetch(`${activeBaseUrl}/sessions/${sessionId}/duplicates`);
    const dupJson = (await dupRes.json()) as any;
    const dupGroup = dupJson.data.duplicateGroups[0];
    console.log(`Found ${dupJson.data.count} exact duplicate group(s):`);
    console.log(`- SHA-256: ${dupGroup.sha256}`);
    console.log(`- Redundant Storage: ${dupGroup.redundantSizeBytes} bytes`);
    console.log(`- Retention Status: ${dupGroup.status}`);
    console.log(`- Copies: ${dupGroup.copies.map((c: any) => `${c.originalName} (${c.isIncludedInExport ? 'INCLUDED' : 'EXCLUDED'})`).join(', ')}`);

    // User explicitly decides to retain only one copy of the duplicate group
    console.log(`\nAction: Retain primary copy and exclude duplicate copy from export...`);
    await fetch(`${activeBaseUrl}/sessions/${sessionId}/duplicates/${dupGroup.sha256}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'retain_one',
        primaryFileId: dupGroup.copies[0].fileId,
      }),
    });

    // Step 6: Plan Modification (Rename and Reassign Destination)
    console.log('\n------------------------------------------------------------------------');
    console.log('STEP 6: Modify Plan (Safe Renaming & Destination Reassignment)');
    console.log('------------------------------------------------------------------------');
    // Find pathfinder_deck.pptx to move into Projects/Pathfinder/Assets
    const deckFile = sessionFiles.find((f: any) => f.originalName === 'pathfinder_deck.pptx');
    const renameRes = await fetch(
      `${activeBaseUrl}/sessions/${sessionId}/plan/files/${deckFile.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposedFilename: 'pathfinder_keynote_presentation.pptx',
          proposedDestinationFolder: 'Projects/Pathfinder/Assets',
        }),
      }
    );
    const renameJson = (await renameRes.json()) as any;
    console.log(`Renamed & Reassigned:`);
    console.log(`- Proposed Filename: ${renameJson.data.proposedFilename}`);
    console.log(`- Proposed Destination: ${renameJson.data.proposedDestinationFolder}`);
    console.log(`- Proposed Full Path: ${renameJson.data.proposedPath}`);

    // Rename second notes file to 'notes.txt' in Documents to test deterministic collision resolution
    const conflictFile = sessionFiles.find((f: any) => f.originalName === 'meeting_notes_conflict.txt');
    const conflictRes = await fetch(
      `${activeBaseUrl}/sessions/${sessionId}/plan/files/${conflictFile.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposedFilename: 'notes.txt',
          proposedDestinationFolder: 'Documents',
        }),
      }
    );
    const conflictJson = (await conflictRes.json()) as any;
    console.log(`\nDestination Collision Test:`);
    console.log(`- Requested Name: 'notes.txt' in 'Documents'`);
    console.log(`- Resolved Path: '${conflictJson.data.proposedPath}' (Predictably resolved with counter)`);

    // Step 7: Virtual Folder Tree Preview
    console.log('\n------------------------------------------------------------------------');
    console.log('STEP 7: Virtual Folder Tree Preview');
    console.log(`GET /api/v1/sessions/${sessionId}/plan/tree`);
    console.log('------------------------------------------------------------------------');
    const treeRes = await fetch(`${activeBaseUrl}/sessions/${sessionId}/plan/tree`);
    const treeJson = (await treeRes.json()) as any;
    console.log('Summary Statistics:');
    console.log(JSON.stringify(treeJson.data.summary, null, 2));

    function printTree(node: any, indent = '') {
      if (node.type === 'folder') {
        console.log(`${indent}📁 ${node.name}/ (${node.fileCount} files, ${node.aggregateSize} bytes)`);
        for (const child of node.children || []) {
          printTree(child, indent + '   ');
        }
      } else {
        console.log(`${indent}📄 ${node.name} (${node.aggregateSize} bytes)`);
      }
    }
    console.log('\nVirtual Tree Structure:');
    printTree(treeJson.data.tree);

    // Step 8: Change History
    console.log('\n------------------------------------------------------------------------');
    console.log('STEP 8: Plan Change History');
    console.log(`GET /api/v1/sessions/${sessionId}/changes`);
    console.log('------------------------------------------------------------------------');
    const changesRes = await fetch(`${activeBaseUrl}/sessions/${sessionId}/changes`);
    const changesJson = (await changesRes.json()) as any;
    console.log(`Recorded Changes (${changesJson.data.count}):`);
    for (const record of changesJson.data.history) {
      console.log(`- [${record.changeType}] File ${record.fileId}: '${record.previousValue}' -> '${record.newValue}'`);
    }

    // Step 9: Generate Organized ZIP Archive
    console.log('\n------------------------------------------------------------------------');
    console.log('STEP 9: Generate Organized ZIP Archive');
    console.log(`POST /api/v1/sessions/${sessionId}/exports`);
    console.log('------------------------------------------------------------------------');
    const exportRes = await fetch(`${activeBaseUrl}/sessions/${sessionId}/exports`, {
      method: 'POST',
    });
    const exportJson = (await exportRes.json()) as any;
    const exportId = exportJson.data.exportId;
    console.log('Export Created Successfully:');
    console.log(`- Export ID: ${exportId}`);
    console.log(`- Archive Filename: ${exportJson.data.filename}`);
    console.log(`- Size: ${exportJson.data.sizeBytes} bytes`);
    console.log(`- Exported File Count: ${exportJson.data.fileCount}`);

    // Step 10: Download and Validate Archive
    console.log('\n------------------------------------------------------------------------');
    console.log('STEP 10: Download Archive');
    console.log(`GET /api/v1/sessions/${sessionId}/exports/${exportId}/download`);
    console.log('------------------------------------------------------------------------');
    const downloadRes = await fetch(`${activeBaseUrl}/sessions/${sessionId}/exports/${exportId}/download`);
    const zipArrayBuffer = await downloadRes.arrayBuffer();
    const zipBuffer = Buffer.from(zipArrayBuffer);
    console.log(`Downloaded ZIP size: ${zipBuffer.length} bytes`);
    console.log(`Content-Type: ${downloadRes.headers.get('content-type')}`);
    console.log(`Content-Disposition: ${downloadRes.headers.get('content-disposition')}`);

    // Step 11: Extract ZIP in Controlled Test Directory & Verify Byte Integrity
    console.log('\n------------------------------------------------------------------------');
    console.log('STEP 11: Extract ZIP & Verify SHA-256 Byte Integrity');
    console.log('------------------------------------------------------------------------');
    fs.mkdirSync(extractDir, { recursive: true });
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(extractDir, true);

    const zipEntries = zip.getEntries();
    console.log(`Extracted ${zipEntries.length} entries from ZIP:`);
    for (const entry of zipEntries) {
      console.log(` - ${entry.entryName} (${entry.header.size} bytes)`);
    }

    // Verify undo-manifest.json
    const manifestPath = path.join(extractDir, 'undo-manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error('Verification failed: undo-manifest.json missing from archive');
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`\nVerified 'undo-manifest.json':`);
    console.log(`- Application: ${manifest.application}`);
    console.log(`- Version: ${manifest.manifestVersion}`);
    console.log(`- Total Imported: ${manifest.totalImportedFiles}`);
    console.log(`- Total Exported: ${manifest.totalExportedFiles}`);
    console.log(`- Total Excluded: ${manifest.totalExcludedFiles}`);

    // Verify SHA-256 byte-for-byte fidelity of all exported files
    let verifiedCount = 0;
    for (const item of manifest.files) {
      if (item.exportedPath) {
        const exportedFilePath = path.join(extractDir, item.exportedPath);
        const exportedBytes = fs.readFileSync(exportedFilePath);
        const extractedHash = computeBufferSha256(exportedBytes);

        if (extractedHash !== item.originalSha256) {
          throw new Error(`Data corruption in '${item.exportedPath}': expected SHA-256 ${item.originalSha256}, got ${extractedHash}`);
        }
        verifiedCount += 1;
      }
    }
    console.log(`\n[Integrity Passed] ${verifiedCount} exported files verified byte-for-byte with original SHA-256 hashes!`);

    // Step 12: Confirm Uploaded Source Files Remain Untouched
    console.log('\n------------------------------------------------------------------------');
    console.log('STEP 12: Verify Core Principle — Source Files Untouched');
    console.log('------------------------------------------------------------------------');
    const { sessionService } = await import('../services/sessionService');
    const storedFiles = sessionService.getSessionFiles(sessionId);
    for (const stored of storedFiles) {
      if (!fs.existsSync(stored.storagePath)) {
        throw new Error(`Uploaded file '${stored.originalName}' was missing from session storage!`);
      }
      const diskBytes = fs.readFileSync(stored.storagePath);
      const diskHash = computeBufferSha256(diskBytes);
      if (diskHash !== stored.sha256) {
        throw new Error(`Uploaded source file '${stored.originalName}' was modified!`);
      }
    }
    console.log(`[Safety Verified] All ${storedFiles.length} uploaded source files in session storage are 100% untouched!`);

    console.log('\n========================================================================');
    console.log('           PHASE 2 FULL DEMO: 100% SUCCESSFUL                           ');
    console.log('========================================================================\n');
  } finally {
    // Clean up temporary demo artifacts
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
    }
    if (serverInstance) {
      const { sessionService } = await import('../services/sessionService');
      sessionService.stopCleanup();
      await new Promise<void>((resolve) => {
        (serverInstance as http.Server).close(() => {
          console.log('[Server] In-process demo server cleanly closed.\n');
          resolve();
        });
      });
    }
  }
}

runPhase2Demo().catch((err) => {
  console.error('[Demo Failure]:', err);
  process.exit(1);
});
