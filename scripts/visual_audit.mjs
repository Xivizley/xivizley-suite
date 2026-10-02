import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = '/Users/alperencelal/.gemini/antigravity/brain/554107ff-d90f-4b00-8f8d-09224dda4cdb';

async function runVisualAudit() {
  console.log('🚀 Starting Comprehensive Browser Visual Audit for XIVIZLEY & XIVIZLEY Suite...');
  
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
  });
  
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  });
  
  const page = await context.newPage();
  const findings = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      findings.push({ page: page.url(), type: 'console-error', text: msg.text() });
    }
  });

  page.on('pageerror', (err) => {
    findings.push({ page: page.url(), type: 'page-error', text: err.message });
  });

  // ─────────────────────────────────────────────────────────────
  // 1. XIVIZLEY Main App (xivizley.com.tr)
  // ─────────────────────────────────────────────────────────────

  // 1.1 Landing Page
  console.log('\n--- 1.1 Auditing https://xivizley.com.tr (Landing Page) ---');
  try {
    await page.goto('https://xivizley.com.tr', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const landingShot = path.join(ARTIFACT_DIR, 'audit_xivizley_landing.png');
    await page.screenshot({ path: landingShot, fullPage: false });
    console.log('  ✓ Captured landing screenshot:', landingShot);
  } catch (err) {
    findings.push({ page: 'https://xivizley.com.tr', type: 'navigation-error', text: err.message });
  }

  // 1.2 Templates Page
  console.log('\n--- 1.2 Auditing https://xivizley.com.tr/templates (Templates Marketplace) ---');
  try {
    await page.goto('https://xivizley.com.tr/templates', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const templatesShot = path.join(ARTIFACT_DIR, 'audit_xivizley_templates.png');
    await page.screenshot({ path: templatesShot, fullPage: false });
    console.log('  ✓ Captured templates screenshot:', templatesShot);
  } catch (err) {
    findings.push({ page: 'https://xivizley.com.tr/templates', type: 'navigation-error', text: err.message });
  }

  // 1.3 Architect Canvas Page
  console.log('\n--- 1.3 Auditing https://xivizley.com.tr/architect (Canvas & Modals) ---');
  try {
    await context.addInitScript(() => {
      window.localStorage.setItem('xivizley_tour_done', '1');
    });
    await page.goto('https://xivizley.com.tr/architect', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const skipTourBtn = await page.$('button:has-text("Atla"), button:has-text("Skip")');
    if (skipTourBtn) {
      console.log('  * Dismissing onboarding tour...');
      await skipTourBtn.click();
      await page.waitForTimeout(800);
    }

    const canvasShot = path.join(ARTIFACT_DIR, 'audit_xivizley_canvas.png');
    await page.screenshot({ path: canvasShot, fullPage: false });
    console.log('  ✓ Captured architect canvas screenshot:', canvasShot);

    // Try opening Blueprint Modal
    console.log('  * Opening Blueprint Modal via navbar button...');
    const blueprintBtn = await page.$('button:has-text("BLUEPRINT"), button:has-text("DIN // BLUEPRINT")');
    if (blueprintBtn) {
      await blueprintBtn.click();
      await page.waitForTimeout(1500);
      const blueprintShot = path.join(ARTIFACT_DIR, 'audit_xivizley_blueprint_modal.png');
      await page.screenshot({ path: blueprintShot, fullPage: false });
      console.log('  ✓ Captured Blueprint modal screenshot:', blueprintShot);

      const pdfBtn = await page.$('button:has-text("PDF İndir")');
      const printBtn = await page.$('button:has-text("Yazdır")');
      console.log('    - PDF Download Button present:', !!pdfBtn);
      console.log('    - Print Button present:', !!printBtn);

      // Close modal (Escape or close button)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);
    } else {
      findings.push({ page: page.url(), type: 'ui-element-missing', text: 'DIN // BLUEPRINT button not found in Navbar' });
    }

    // Try opening Deploy Modal
    console.log('  * Opening Deploy Modal via navbar button...');
    const deployBtn = await page.$('button:has-text("Dağıtıma Hazırla"), button:has-text("Deploy"), button:has-text("DAĞITIM")');
    if (deployBtn) {
      await deployBtn.click();
      await page.waitForTimeout(1200);
      const deployShot = path.join(ARTIFACT_DIR, 'audit_xivizley_deploy_modal.png');
      await page.screenshot({ path: deployShot, fullPage: false });
      console.log('  ✓ Captured Deploy modal screenshot:', deployShot);

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  } catch (err) {
    findings.push({ page: 'https://xivizley.com.tr/architect', type: 'navigation-error', text: err.message });
  }

  // ─────────────────────────────────────────────────────────────
  // 2. XIVIZLEY Suite (suite.xivizley.com.tr)
  // ─────────────────────────────────────────────────────────────

  // 2.1 Suite Hub / Login
  console.log('\n--- 2.1 Auditing https://suite.xivizley.com.tr ---');
  try {
    await page.goto('https://suite.xivizley.com.tr', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const suiteHubShot = path.join(ARTIFACT_DIR, 'audit_suite_hub.png');
    await page.screenshot({ path: suiteHubShot, fullPage: false });
    console.log('  ✓ Captured Suite hub screenshot:', suiteHubShot);
  } catch (err) {
    findings.push({ page: 'https://suite.xivizley.com.tr', type: 'navigation-error', text: err.message });
  }

  // 2.2 Suite Pulse (Uptime & Sentinel)
  console.log('\n--- 2.2 Auditing https://suite.xivizley.com.tr/pulse ---');
  try {
    await page.goto('https://suite.xivizley.com.tr/pulse', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    const pulseShot = path.join(ARTIFACT_DIR, 'audit_suite_pulse.png');
    await page.screenshot({ path: pulseShot, fullPage: false });
    console.log('  ✓ Captured Suite Pulse screenshot:', pulseShot);

    // Click Telegram & Settings button in Sentinel card
    const sentinelSettingsBtn = await page.$('button:has-text("Telegram"), button:has-text("Eşik Ayarları")');
    if (sentinelSettingsBtn) {
      await sentinelSettingsBtn.click();
      await page.waitForTimeout(800);
      const sentinelModalShot = path.join(ARTIFACT_DIR, 'audit_suite_pulse_sentinel_settings.png');
      await page.screenshot({ path: sentinelModalShot, fullPage: false });
      console.log('  ✓ Captured Sentinel Settings Modal screenshot:', sentinelModalShot);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  } catch (err) {
    findings.push({ page: 'https://suite.xivizley.com.tr/pulse', type: 'navigation-error', text: err.message });
  }

  // 2.3 Suite Game Cockpit
  console.log('\n--- 2.3 Auditing https://suite.xivizley.com.tr/game ---');
  try {
    await page.goto('https://suite.xivizley.com.tr/game', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    const gameShot = path.join(ARTIFACT_DIR, 'audit_suite_game_console.png');
    await page.screenshot({ path: gameShot, fullPage: false });
    console.log('  ✓ Captured Game Console screenshot:', gameShot);

    // Click "Yedekler & Kurtarma" tab
    const backupTab = await page.$('button:has-text("Yedekler")');
    if (backupTab) {
      await backupTab.click();
      await page.waitForTimeout(1000);
      const gameBackupShot = path.join(ARTIFACT_DIR, 'audit_suite_game_backups.png');
      await page.screenshot({ path: gameBackupShot, fullPage: false });
      console.log('  ✓ Captured Game Backups tab screenshot:', gameBackupShot);
    }

    // Click "Eklentiler & Modlar" tab
    const pluginsTab = await page.$('button:has-text("Eklentiler")');
    if (pluginsTab) {
      await pluginsTab.click();
      await page.waitForTimeout(1000);
      const gamePluginsShot = path.join(ARTIFACT_DIR, 'audit_suite_game_plugins.png');
      await page.screenshot({ path: gamePluginsShot, fullPage: false });
      console.log('  ✓ Captured Game Plugins tab screenshot:', gamePluginsShot);
    }
  } catch (err) {
    findings.push({ page: 'https://suite.xivizley.com.tr/game', type: 'navigation-error', text: err.message });
  }

  // 2.4 Suite Pass Vault
  console.log('\n--- 2.4 Auditing https://suite.xivizley.com.tr/pass ---');
  try {
    await page.goto('https://suite.xivizley.com.tr/pass', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    const passShot = path.join(ARTIFACT_DIR, 'audit_suite_pass.png');
    await page.screenshot({ path: passShot, fullPage: false });
    console.log('  ✓ Captured Pass Vault screenshot:', passShot);

    // Try Export button
    const exportBtn = await page.$('button:has-text("Dışa Aktar")');
    if (exportBtn) {
      await exportBtn.click();
      await page.waitForTimeout(800);
      const passExportShot = path.join(ARTIFACT_DIR, 'audit_suite_pass_export_modal.png');
      await page.screenshot({ path: passExportShot, fullPage: false });
      console.log('  ✓ Captured Pass Export modal screenshot:', passExportShot);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Try Import button
    const importBtn = await page.$('button:has-text("İçe Aktar")');
    if (importBtn) {
      await importBtn.click();
      await page.waitForTimeout(800);
      const passImportShot = path.join(ARTIFACT_DIR, 'audit_suite_pass_import_modal.png');
      await page.screenshot({ path: passImportShot, fullPage: false });
      console.log('  ✓ Captured Pass Import modal screenshot:', passImportShot);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  } catch (err) {
    findings.push({ page: 'https://suite.xivizley.com.tr/pass', type: 'navigation-error', text: err.message });
  }

  // 2.5 Suite Files / Drive
  console.log('\n--- 2.5 Auditing https://suite.xivizley.com.tr/files ---');
  try {
    await page.goto('https://suite.xivizley.com.tr/files', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    const filesShot = path.join(ARTIFACT_DIR, 'audit_suite_files.png');
    await page.screenshot({ path: filesShot, fullPage: false });
    console.log('  ✓ Captured Files/Drive screenshot:', filesShot);
  } catch (err) {
    findings.push({ page: 'https://suite.xivizley.com.tr/files', type: 'navigation-error', text: err.message });
  }

  await browser.close();

  console.log('\n=============================================================');
  console.log('🏁 VISUAL AUDIT COMPLETE');
  console.log('Findings / Errors logged:', findings.length);
  if (findings.length > 0) {
    console.log(JSON.stringify(findings, null, 2));
  }
  console.log('=============================================================');
}

runVisualAudit().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
