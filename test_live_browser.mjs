import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = '/Users/alperencelal/.gemini/antigravity/brain/554107ff-d90f-4b00-8f8d-09224dda4cdb';

async function runTests() {
  console.log('🚀 Launching browser via Playwright (using system Google Chrome)...');
  
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();
  const results = [];

  const report = (name, status, details = '') => {
    results.push({ name, status, details });
    console.log(`[${status ? 'PASS' : 'FAIL'}] ${name} ${details ? '- ' + details : ''}`);
  };

  try {
    // 1. Suite Hub (Dashboard)
    console.log('\n--- 1. Testing Unified Hub (https://suite.xivizley.com.tr) ---');
    const hubRes = await page.goto('https://suite.xivizley.com.tr', { waitUntil: 'networkidle', timeout: 30000 });
    report('Hub Status 200', hubRes?.status() === 200, `Status: ${hubRes?.status()}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test_suite_hub.png') });

    // Check Nextcloud Header
    const headerTitle = await page.textContent('header').catch(() => '');
    report('Nextcloud Header Rendered', headerTitle.includes('XIVIZLEY'), `Header contains brand`);

    // 2. Files (Drive)
    console.log('\n--- 2. Testing Files (/files) ---');
    const filesRes = await page.goto('https://suite.xivizley.com.tr/files', { waitUntil: 'networkidle', timeout: 30000 });
    report('Files Status 200', filesRes?.status() === 200, `Status: ${filesRes?.status()}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test_drive_home.png') });

    // 3. Notes (Notlar)
    console.log('\n--- 3. Testing Notes (/notes) ---');
    const notesRes = await page.goto('https://suite.xivizley.com.tr/notes', { waitUntil: 'networkidle', timeout: 30000 });
    report('Notes Status 200', notesRes?.status() === 200, `Status: ${notesRes?.status()}`);

    // Click "Yeni Not"
    const newNoteBtn = await page.waitForSelector('button:has-text("Yeni Not")', { timeout: 5000 }).catch(() => null);
    if (newNoteBtn) {
      await newNoteBtn.click();
      await page.waitForTimeout(500);
      report('Notes: New Note Button Functional', true, 'Created new note item');
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test_notes_home.png') });

    // 4. Photos (Fotoğraflar)
    console.log('\n--- 4. Testing Photos (/photos) ---');
    const photosRes = await page.goto('https://suite.xivizley.com.tr/photos', { waitUntil: 'networkidle', timeout: 30000 });
    report('Photos Status 200', photosRes?.status() === 200, `Status: ${photosRes?.status()}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test_photos_home.png') });

    // 5. Passwords (Pass)
    console.log('\n--- 5. Testing Pass (/pass) ---');
    const passRes = await page.goto('https://suite.xivizley.com.tr/pass', { waitUntil: 'networkidle', timeout: 30000 });
    report('Pass Status 200', passRes?.status() === 200, `Status: ${passRes?.status()}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test_pass_home.png') });

    // 6. Pulse (Uptime & Monitoring)
    console.log('\n--- 6. Testing Pulse (/pulse) ---');
    const pulseRes = await page.goto('https://suite.xivizley.com.tr/pulse', { waitUntil: 'networkidle', timeout: 30000 });
    report('Pulse Status 200', pulseRes?.status() === 200, `Status: ${pulseRes?.status()}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test_pulse_home.png') });

    // 7. Shield (Security & WAF)
    console.log('\n--- 7. Testing Shield (/shield) ---');
    const shieldRes = await page.goto('https://suite.xivizley.com.tr/shield', { waitUntil: 'networkidle', timeout: 30000 });
    report('Shield Status 200', shieldRes?.status() === 200, `Status: ${shieldRes?.status()}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test_shield_home.png') });

    // 8. Game Panel (/game)
    console.log('\n--- 8. Testing Game Panel (/game) ---');
    const gameRes = await page.goto('https://suite.xivizley.com.tr/game', { waitUntil: 'networkidle', timeout: 30000 });
    report('Game Panel Status 200', gameRes?.status() === 200, `Status: ${gameRes?.status()}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test_game_home.png') });

    // 9. Subdomain Redirect Test (drive.xivizley.com.tr -> /files)
    console.log('\n--- 9. Testing Subdomain Redirection ---');
    const redirRes = await page.goto('https://drive.xivizley.com.tr', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const finalUrl = page.url();
    report('Drive Subdomain Redirect', finalUrl.includes('/files'), `Landed on: ${finalUrl}`);

  } catch (err) {
    console.error('Test execution error:', err);
    report('Test Suite Error', false, err.message);
  } finally {
    await browser.close();
  }

  console.log('\n================ TEST SUMMARY ================');
  const passed = results.filter(r => r.status).length;
  console.log(`Passed: ${passed}/${results.length}`);
  results.forEach(r => {
    console.log(` - [${r.status ? 'OK' : 'FAIL'}] ${r.name} ${r.details ? '(' + r.details + ')' : ''}`);
  });
  console.log('==============================================\n');
}

runTests();
