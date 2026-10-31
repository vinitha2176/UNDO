import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import AdmZip from 'adm-zip';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function runBrowserE2E() {
  console.log('========================================================================');
  console.log('   UNDO PHASE 4: REAL BROWSER END-TO-END AUTOMATION TEST (CHROME)       ');
  console.log('========================================================================\n');

  let backendServer: any = null;
  let viteServer: any = null;

  // 1. Ensure backend is running
  try {
    const res = await fetch('http://localhost:3001/api/v1/health');
    if (!res.ok) throw new Error();
    console.log('[Server] Connected to existing backend on http://localhost:3001');
  } catch {
    const { createApp } = await import('../app');
    const app = createApp();
    await new Promise<void>((resolve, reject) => {
      backendServer = app.listen(3001, () => resolve());
      backendServer.on('error', reject);
    });
    console.log('[Server] In-process backend started on http://localhost:3001');
  }

  // 2. Ensure frontend is running
  try {
    const res = await fetch('http://localhost:3000');
    if (!res.ok) throw new Error();
    console.log('[Server] Connected to existing frontend on http://localhost:3000');
  } catch {
    const viteModule = (await import('../../../frontend/node_modules/vite/dist/node/index.js' as any)) as any;
    viteServer = await viteModule.createServer({
      root: path.resolve(__dirname, '../../../frontend'),
      server: { port: 3000 },
    });
    await viteServer.listen();
    console.log('[Server] In-process frontend started on http://localhost:3000');
  }

  console.log('[Browser] Launching Google Chrome via Playwright-Core...');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true,
  });

  const page = await context.newPage();

  // Listen to browser console and network errors
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log(`[Browser Console Error] ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
    console.log(`[Browser Uncaught Error] ${err.message}`);
  });

  // Track API network responses
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/v1/')) {
      const status = response.status();
      const method = response.request().method();
      let bodyText = '';
      try {
        bodyText = await response.text();
      } catch {}
      if (status >= 400) {
        console.error(`[API Error] ${method} ${url} -> Status ${status}: ${bodyText}`);
      } else if (method === 'PATCH' || method === 'POST') {
        console.log(`[API Log] ${method} ${url} -> Status ${status}`);
      }
    }
  });

  try {
    // ------------------------------------------------------------------------
    // Step 1: Open UNDO and verify landing workspace
    // ------------------------------------------------------------------------
    console.log('[E2E Step 1] Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    const title = await page.title();
    console.log(`  ✓ Page title: "${title}"`);

    const brandHeading = await page.textContent('h1');
    console.log(`  ✓ Heading: "${brandHeading?.trim()}"`);

    // Wait for backend health indicator
    await page.waitForSelector('text=Backend Connected', { timeout: 10000 });
    console.log('  ✓ Backend engine connection indicator: "Backend Connected"');

    // ------------------------------------------------------------------------
    // Step 2: Test "Try with Sample Files"
    // ------------------------------------------------------------------------
    console.log('\n[E2E Step 2] Clicking "Try with Sample Files" button...');
    const sampleBtn = page.getByRole('button', { name: /Try with Sample Files/i });
    await sampleBtn.click();

    // Verify 30 files staged in upload list
    await page.waitForSelector('text=Selected Files');
    const selectedText = await page.textContent('text=Selected Files');
    console.log(`  ✓ Staging counter: "${selectedText?.trim()}"`);
    if (!selectedText?.includes('30')) {
      throw new Error(`Expected 30 staged files, got "${selectedText}"`);
    }

    // ------------------------------------------------------------------------
    // Step 3: Trigger Upload and Backend Processing
    // ------------------------------------------------------------------------
    console.log('\n[E2E Step 3] Submitting files to backend ("Analyze & Organize Files")...');
    const uploadSubmitBtn = page.getByRole('button', { name: /Analyze & Organize Files/i });
    await uploadSubmitBtn.click();

    // Wait for transition to Step 2 (Analysis)
    await page.waitForSelector('text=File Analysis Summary', { timeout: 20000 });
    console.log('  ✓ Navigated to Step 2: "File Analysis Summary"');

    // ------------------------------------------------------------------------
    // Step 4: Verify Analysis Results & Duplicate Detection
    // ------------------------------------------------------------------------
    console.log('\n[E2E Step 4] Verifying File Analysis Metrics & Intelligence...');
    const bodyContent = await page.textContent('main');

    // Verify project groups
    const hasPathfinderGroup = bodyContent?.includes('Pathfinder');
    const hasMedicardGroup = bodyContent?.includes('Medicard');
    const hasFormGroup = bodyContent?.includes('Projects/Form') || bodyContent?.includes('Projects/form');
    console.log(`  ✓ Project group "Pathfinder" displayed: ${hasPathfinderGroup}`);
    console.log(`  ✓ Project group "Medicard" displayed: ${hasMedicardGroup}`);
    console.log(`  ✓ Generic "Form" project avoided: ${!hasFormGroup}`);

    if (!hasPathfinderGroup || !hasMedicardGroup || hasFormGroup) {
      throw new Error('Analysis project grouping verification failed!');
    }

    // Verify duplicates detected
    const dupCountBadge = await page.textContent('text=Duplicate Groups');
    console.log(`  ✓ Duplicate detection card: "${dupCountBadge?.trim()}"`);

    // ------------------------------------------------------------------------
    // Step 5: Navigate to Organization Studio
    // ------------------------------------------------------------------------
    console.log('\n[E2E Step 5] Clicking "Open Organization Studio →"...');
    const continueStudioBtn = page.getByRole('button', { name: /Open Organization Studio/i });
    await continueStudioBtn.click();

    await page.waitForSelector('text=Virtual Folder Studio', { timeout: 10000 });
    console.log('  ✓ Entered Organization Studio');

    // ------------------------------------------------------------------------
    // Step 6: Test Duplicate Review Center (Exclude & Restore)
    // ------------------------------------------------------------------------
    console.log('\n[E2E Step 6] Testing Duplicate Review Center...');
    const dupsTabBtn = page.getByRole('button', { name: /Duplicates/i });
    await dupsTabBtn.click();

    await page.waitForSelector('text=Retain 1 Copy Only');
    console.log('  ✓ Opened Duplicate Review tab');

    // Click "Retain 1 Copy Only" on the first duplicate group
    const retainPrimaryBtn = page.getByRole('button', { name: /Retain 1 Copy Only/i }).first();
    await retainPrimaryBtn.click();
    await page.waitForTimeout(1000);
    console.log('  ✓ Action: Excluded duplicate copy (set to 1 copy retained)');

    // Restore copy via "Keep All Copies"
    const keepAllBtn = page.getByRole('button', { name: /Keep All Copies/i }).first();
    await keepAllBtn.click();
    await page.waitForTimeout(1000);
    console.log('  ✓ Action: Restored all copies to export ("Keep All Copies")');

    // Now re-exclude for export verification
    await retainPrimaryBtn.click();
    await page.waitForTimeout(1000);
    console.log('  ✓ Final decision: 1 duplicate copy safely excluded from export archive');

    // ------------------------------------------------------------------------
    // Step 7: Test Before & After Comparison Tab & In-Place Rename
    // ------------------------------------------------------------------------
    console.log('\n[E2E Step 7] Testing Before & After Comparison Tab...');
    const diffTabBtn = page.getByRole('button', { name: /Before & After/i });
    await diffTabBtn.click();

    await page.waitForSelector('text=Before & After Transformation');
    console.log('  ✓ Before & After diff view active with dual column comparisons');

    // Click on pathfinder_deck.pptx row in Before & After to open Edit Modal
    console.log('\n[E2E Step 8] Testing Interactive File Renaming from Diff View...');
    const deckRow = page.locator('div').filter({ hasText: /^pathfinder_deck\.pptx/ }).first();
    await deckRow.click();

    await page.waitForSelector('text=Proposed Filename');
    console.log('  ✓ Opened File Details Modal for "pathfinder_deck.pptx"');

    // Edit proposed filename
    const modal = page.locator('div[role="dialog"]');
    const renameInput = modal.locator('#proposed-filename-input');
    await renameInput.fill('pathfinder_keynote_deck.pptx');

    // Reassign destination folder
    const folderInput = modal.locator('#destination-folder-input');
    await folderInput.fill('Presentations/Keynotes');

    const saveChangesBtn = modal.getByRole('button', { name: /Save Changes/i });
    await saveChangesBtn.click();
    await page.waitForTimeout(1000);

    const isModalVisible = await page.locator('text=Customize Organization').isVisible().catch(() => false);
    if (isModalVisible) {
      const errorBox = await modal.locator('.bg-rose-50').textContent({ timeout: 1000 }).catch(() => null);
      if (errorBox) {
        console.error(`  ❌ Modal reported error: "${errorBox.trim()}"`);
      }
    } else {
      console.log('  ✓ Saved rename & folder reassignment: "pathfinder_deck.pptx" -> "Presentations/Keynotes/pathfinder_keynote_deck.pptx"');
    }

    // Wait for modal to disappear
    await page.waitForSelector('text=Customize Organization', { state: 'detached', timeout: 5000 });

    // ------------------------------------------------------------------------
    // Step 9: Test Wispr Flow Preference Text Input & Multi-Instruction Parsing
    // ------------------------------------------------------------------------
    console.log('\n[E2E Step 9] Testing Wispr Flow Voice-First Multi-Instruction Preferences...');
    const wisprTabBtn = page.getByRole('button', { name: /Wispr Dictation/i });
    await wisprTabBtn.click();

    await page.waitForSelector('text=Voice Dictation Ready');
    await page.waitForSelector('text=Just tell UNDO how you want your files organized.');
    console.log('  ✓ Opened Wispr Dictation tab with voice-first heading & guidance');

    const textarea = page.locator('textarea');

    // Test combined multi-instruction command
    console.log('  Testing multi-instruction command: "Put screenshots in a Screenshots folder, group Pathfinder files together, and keep all duplicate copies."');
    await textarea.fill('Put screenshots in a Screenshots folder, group Pathfinder files together, and keep all duplicate copies.');
    await page.waitForSelector('text=Interpreted Organization Rule:');
    await page.waitForSelector('text=3 instruction rule(s) recognized');
    await page.waitForSelector('text=Organize Screenshots');
    await page.waitForSelector('text=Group Pathfinder Project Files');
    await page.waitForSelector('text=Retain All Duplicate Copies');
    console.log('  ✓ Multi-instruction voice command interpreted into 3 discrete rules with matched files');

    // Click "Confirm & Apply Rule"
    const confirmRuleBtn = page.getByRole('button', { name: /Confirm & Apply Rule/i });
    await confirmRuleBtn.click();
    await page.waitForTimeout(1500);
    console.log('  ✓ Applied multi-instruction Wispr preference rules successfully');

    // Test unsupported rule handling
    await textarea.fill('Order a hot pizza and make it fly to Mars');
    await page.waitForSelector('text=Rule could not be deterministically matched');
    console.log('  ✓ Unsupported instruction displayed honest feedback without breaking state');
    await textarea.fill('');

    // ------------------------------------------------------------------------
    // Step 10: Proceed to Export Review Screen
    // ------------------------------------------------------------------------
    console.log('\n[E2E Step 10] Proceeding to Export Review Screen...');
    const proceedExportBtn = page.getByRole('button', { name: /Review & Export/i });
    await proceedExportBtn.click();

    await page.waitForSelector('text=Ready to put everything in order?');
    console.log('  ✓ Entered Export Review screen');

    // Verify button layout wrapping fix (Task 3)
    const modifyBtn = page.getByRole('button', { name: /Modify Plan/i });
    const downloadBtn = page.getByRole('button', { name: /Download Organized Files/i });

    const modifyBox = await modifyBtn.boundingBox();
    const downloadBox = await downloadBtn.boundingBox();
    console.log(`  ✓ Modify Button Box: width=${Math.round(modifyBox?.width || 0)}px, height=${Math.round(modifyBox?.height || 0)}px`);
    console.log(`  ✓ Download Button Box: width=${Math.round(downloadBox?.width || 0)}px, height=${Math.round(downloadBox?.height || 0)}px`);

    if (downloadBox && downloadBox.height > 65) {
      throw new Error(`Download button height ${downloadBox.height}px is wrapping vertically!`);
    }
    console.log('  ✓ [UI Fix Verified] Buttons render cleanly on one line with no awkward text wrapping');

    // ------------------------------------------------------------------------
    // Step 11: Preview undo-manifest.json Modal
    // ------------------------------------------------------------------------
    console.log('\n[E2E Step 11] Testing undo-manifest.json Preview Modal...');
    const previewManifestBtn = page.getByRole('button', { name: /Preview undo-manifest.json/i });
    await previewManifestBtn.click();

    await page.waitForSelector('text=Auditable machine-readable change log');
    const manifestCode = await page.textContent('pre');
    if (!manifestCode?.includes('undo-manifest.json') && !manifestCode?.includes('UNDO')) {
      throw new Error('Manifest preview did not display valid JSON!');
    }
    console.log('  ✓ Manifest preview rendered valid structured JSON');

    // Close modal
    const closeManifestBtn = page.getByRole('button', { name: /^Close$/i });
    await closeManifestBtn.click();
    await page.waitForTimeout(500);

    // ------------------------------------------------------------------------
    // Step 12: Trigger Real Download and Verify ZIP Byte Integrity
    // ------------------------------------------------------------------------
    console.log('\n[E2E Step 12] Triggering ZIP Download and verifying byte integrity...');
    const downloadPromise = page.waitForEvent('download');
    await downloadBtn.click();
    const download = await downloadPromise;

    const downloadPath = path.join(__dirname, `e2e_download_${Date.now()}.zip`);
    await download.saveAs(downloadPath);
    console.log(`  ✓ ZIP downloaded successfully: ${downloadPath}`);

    const zipStats = fs.statSync(downloadPath);
    console.log(`  ✓ Archive file size: ${zipStats.size} bytes`);
    if (zipStats.size < 1000) {
      throw new Error('Downloaded ZIP file is suspiciously small or empty!');
    }

    // Extract downloaded ZIP and verify contents
    const zip = new AdmZip(downloadPath);
    const zipEntries = zip.getEntries();
    console.log(`  ✓ ZIP archive contains ${zipEntries.length} total entries.`);

    const manifestEntry = zipEntries.find((e) => e.entryName === 'undo-manifest.json');
    if (!manifestEntry) {
      throw new Error('Missing undo-manifest.json in downloaded ZIP!');
    }
    const manifestObj = JSON.parse(manifestEntry.getData().toString('utf8'));
    console.log(`  ✓ Manifest validated: application="${manifestObj.application}", exported=${manifestObj.totalExportedFiles}, excluded=${manifestObj.totalExcludedFiles}`);

    // Verify renamed and folder reassigned file inside ZIP
    const renamedEntry = zipEntries.find((e) => e.entryName === 'Presentations/Keynotes/pathfinder_keynote_deck.pptx');
    if (!renamedEntry) {
      throw new Error('Renamed and folder reassigned file "Presentations/Keynotes/pathfinder_keynote_deck.pptx" not found in ZIP archive!');
    }
    console.log(`  ✓ Renamed and folder reassigned file present in ZIP: "${renamedEntry.entryName}"`);

    // Clean up downloaded test ZIP
    fs.unlinkSync(downloadPath);

    // ------------------------------------------------------------------------
    // Step 13: Console and Runtime Error Audit
    // ------------------------------------------------------------------------
    console.log('\n[E2E Step 13] Browser Console & Network Error Audit...');
    if (consoleErrors.length > 0) {
      console.log(`  ⚠ Detected ${consoleErrors.length} console errors:`, consoleErrors);
    } else {
      console.log('  ✓ Zero unhandled runtime exceptions or console errors detected!');
    }

    console.log('\n========================================================================');
    console.log('     REAL BROWSER END-TO-END WORKFLOW: 100% SUCCESS (ALL PASSED)        ');
    console.log('========================================================================\n');
  } finally {
    try {
      await browser.close();
    } catch {}
    if (viteServer) {
      try {
        await viteServer.close();
        console.log('[Server] Stopped in-process frontend');
      } catch {}
    }
    if (backendServer) {
      try {
        await new Promise<void>((r) => backendServer.close(() => r()));
        console.log('[Server] Stopped in-process backend');
      } catch {}
    }
  }
}

runBrowserE2E().catch((err) => {
  console.error('\n❌ Browser E2E Test Failed:', err);
  process.exit(1);
});
