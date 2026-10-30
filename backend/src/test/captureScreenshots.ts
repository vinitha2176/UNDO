import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = 'C:\\Users\\User25\\.gemini\\antigravity\\brain\\d65fe74c-d6b2-4025-8728-4acf4ee23bd3\\screenshots';

const VIEWPORTS = [
  { name: 'desktop_1440', width: 1440, height: 900 },
  { name: 'laptop_1366', width: 1366, height: 768 },
  { name: 'tablet_768', width: 768, height: 1024 },
  { name: 'mobile_390', width: 390, height: 844 }
];

async function capture() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const vp of VIEWPORTS) {
    console.log(`\nCapturing screenshots for ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // 1. Screen 1 - Landing & Upload
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const screen1Path = path.join(OUTPUT_DIR, `screen1_landing_${vp.name}.png`);
    await page.screenshot({ path: screen1Path, fullPage: false });
    console.log(`  ✓ Saved ${screen1Path}`);

    // Load sample files
    const sampleBtn = page.getByRole('button', { name: /Try with Sample Files/i });
    await sampleBtn.click();
    await page.waitForTimeout(400);

    // Click Analyze & Organize Files
    const analyzeBtn = page.getByRole('button', { name: /Analyze & Organize Files/i });
    await analyzeBtn.click();
    await page.waitForSelector('text=File Analysis Summary', { timeout: 15000 });
    await page.waitForTimeout(600);

    // 2. Screen 2 - Analysis Overview
    const screen2Path = path.join(OUTPUT_DIR, `screen2_analysis_${vp.name}.png`);
    await page.screenshot({ path: screen2Path, fullPage: false });
    console.log(`  ✓ Saved ${screen2Path}`);

    // Click Open Organization Studio
    const studioBtn = page.getByRole('button', { name: /Open Organization Studio/i });
    await studioBtn.click();
    await page.waitForSelector('text=Virtual Folder Studio', { timeout: 10000 });
    await page.waitForTimeout(600);

    // 3. Screen 3A - Folder Tree Tab
    const screen3aPath = path.join(OUTPUT_DIR, `screen3a_studio_tree_${vp.name}.png`);
    await page.screenshot({ path: screen3aPath, fullPage: false });
    console.log(`  ✓ Saved ${screen3aPath}`);

    // Switch to Before & After tab
    const beforeAfterTab = page.getByRole('button', { name: /Before & After/i });
    await beforeAfterTab.click();
    await page.waitForSelector('text=Before & After Transformation', { timeout: 5000 });
    await page.waitForTimeout(400);

    // 3. Screen 3B - Before & After Tab
    const screen3bPath = path.join(OUTPUT_DIR, `screen3b_studio_beforeafter_${vp.name}.png`);
    await page.screenshot({ path: screen3bPath, fullPage: false });
    console.log(`  ✓ Saved ${screen3bPath}`);

    // Switch to Duplicates tab for comprehensive review
    const dupTab = page.getByRole('button', { name: /Duplicates/i });
    if (await dupTab.isVisible()) {
      await dupTab.click();
      await page.waitForSelector('text=Same files, different names?', { timeout: 5000 });
      await page.waitForTimeout(400);
      const screen3cPath = path.join(OUTPUT_DIR, `screen3c_studio_duplicates_${vp.name}.png`);
      await page.screenshot({ path: screen3cPath, fullPage: false });
      console.log(`  ✓ Saved ${screen3cPath}`);
    }

    // Go to Export Review
    const reviewBtn = page.getByRole('button', { name: /Review & Export/i });
    await reviewBtn.click();
    await page.waitForSelector('text=Ready to put everything in order?', { timeout: 10000 });
    await page.waitForTimeout(500);

    // 4. Screen 4 - Export Review
    const screen4Path = path.join(OUTPUT_DIR, `screen4_export_${vp.name}.png`);
    await page.screenshot({ path: screen4Path, fullPage: false });
    console.log(`  ✓ Saved ${screen4Path}`);

    await context.close();
  }

  await browser.close();
  console.log('\nAll screenshots captured successfully!');
}

capture().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
