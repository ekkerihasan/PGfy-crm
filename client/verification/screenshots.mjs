import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const base = process.env.CLIENT_URL || 'http://localhost:5173';
const output = resolve(import.meta.dirname, '../../docs/screenshots');
const errors = [];
page.on('pageerror', error => errors.push(error.message));
async function capture(name) { await page.screenshot({ path: resolve(output, `${name}.png`), fullPage: true }); console.log(`Screenshot: ${name}`); }
async function login(role) {
  await page.goto(`${base}/login`);
  await page.getByLabel('Email address').fill(role === 'admin' ? 'admin@pgfy.demo' : 'sales@pgfy.demo');
  await page.getByLabel('Password', { exact: true }).fill(role === 'admin' ? 'Admin@123' : 'Sales@123');
  await page.getByRole('button', { name: 'Sign in →', exact: true }).click();
  await page.waitForURL(`${base}/`, { timeout: 15000 });
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor();
  await page.waitForLoadState('networkidle');
}
try {
  await page.goto(`${base}/login`);
  await page.getByLabel('Email address').waitFor();
  await capture('login');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('login-mobile');
  await page.setViewportSize({ width: 1440, height: 1000 });
  if (!process.argv.includes('--login-only')) {
    for (const role of ['admin', 'sales']) {
      await login(role);
      for (const [path, name] of [['/', 'dashboard'], ['/leads', 'leads'], ['/follow-ups', 'follow-ups'], ['/calls', 'calls'], ...(role === 'admin' ? [['/reports', 'reports']] : [])]) {
        await page.goto(`${base}${path}`); await page.waitForLoadState('networkidle'); await capture(`${role}-${name}`);
        if (path === '/leads') {
          const leadLink = page.locator('tbody a').first();
          if (await leadLink.count()) { await leadLink.click(); await page.waitForLoadState('networkidle'); await capture(`${role}-lead-detail`); }
        }
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${base}/leads`); await page.waitForLoadState('networkidle'); await capture(`${role}-leads-mobile`);
      await page.getByRole('button', { name: 'Sign out', exact: true }).filter({ visible: true }).click();
      await page.waitForURL(`${base}/login`);
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Browser screenshots finished; no uncaught page errors.');
} catch (error) { console.error(error); process.exitCode = 1; } finally { await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 5000))]); process.exit(process.exitCode || 0); }

