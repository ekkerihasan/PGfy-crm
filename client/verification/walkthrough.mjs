import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const base = process.env.CLIENT_URL || 'http://localhost:5173';
const name = `Fictional UI Check ${Date.now()}`;
const errors = [];
page.on('pageerror', error => errors.push(error.message));
async function login(role) {
  await page.goto(`${base}/login`);
  await page.getByLabel('Email address').fill(role === 'admin' ? 'admin@pgfy.demo' : 'sales@pgfy.demo');
  await page.getByLabel('Password', { exact: true }).fill(role === 'admin' ? 'Admin@123' : 'Sales@123');
  await page.getByRole('button', { name: /^Sign in/, exact: false }).click();
  await page.waitForURL(`${base}/`, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}
async function signout() { await page.getByRole('button', { name: 'Sign out', exact: true }).filter({ visible: true }).click(); await page.waitForURL(`${base}/login`); }
async function dashboard() {
  return page.evaluate(async () => { const response = await fetch('/api/dashboard', { headers: { Authorization: `Bearer ${localStorage.getItem('pgfy_token')}` } }); if (!response.ok) throw new Error(`Dashboard ${response.status}`); return response.json(); });
}
function future(days) { const d = new Date(Date.now() + days * 86400000); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16); }
try {
  console.log('Step: administrator login'); await login('admin');
  await page.goto(`${base}/leads`);
  await page.getByRole('button', { name: 'New lead', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Customer name').fill(name);
  await dialog.getByLabel('Mobile', { exact: true }).fill('9876543210');
  await dialog.getByLabel('Preferred location').fill('Koramangala');
  await dialog.getByLabel('Monthly budget (₹)').fill('18000');
  await dialog.getByRole('button', { name: 'Create lead', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  const row = page.locator('tbody tr').filter({ hasText: name });
  await row.getByRole('button', { name: `Assign ${name}`, exact: true }).click();
  const options = await dialog.getByLabel('Assigned executive').locator('option').allTextContents();
  const selected = options.find(text => text.includes('(sales@pgfy.demo)'));
  assert(selected, 'Seeded sales executive is available');
  await dialog.getByLabel('Assigned executive').selectOption({ label: selected });
  await dialog.getByRole('button', { name: 'Save assignment' }).click();
  await dialog.waitFor({ state: 'hidden' });
  await signout();
  console.log('Step: sales login'); await login('sales');
  const before = await dashboard();
  assert.equal(await page.getByRole('link', { name: 'Reports', exact: true }).count(), 0);
  await page.goto(`${base}/leads`);
  await page.getByLabel('Search leads').fill(name);
  await page.getByRole('link', { name, exact: true }).click();
  await page.getByRole('heading', { name, exact: true }).waitFor();
  const leadUrl = page.url();
  for (let index = 0; index < 2; index++) {
    console.log('Step: record call', index + 1); await page.getByLabel('Call outcome').selectOption(index === 0 ? 'CONNECTED' : 'INTERESTED');
    await page.getByLabel('Duration minutes').fill('2');
    await page.getByLabel('Duration seconds').fill('15');
    await page.getByLabel('Call notes (optional)').fill(`Fictional walkthrough call ${index + 1}`);
    await page.getByLabel('Next follow-up (optional)').fill(future(index + 1));
    const saved = page.waitForResponse(response => response.url().includes('/calls') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Record call', exact: true }).click();
    assert.equal((await saved).status(), 201);
    await page.getByRole('status').filter({ hasText: 'Call recorded.' }).waitFor();
  }
  assert.equal(await page.locator('section').filter({ has: page.getByRole('heading', { name: /^Call history/ }) }).locator('tbody tr').count(), 2);
  const completed = page.waitForResponse(response => response.url().includes('/follow-ups/') && response.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Complete', exact: true }).first().click();
  assert.equal((await completed).status(), 200);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Reschedule', exact: true }).first().click();
  await dialog.getByLabel('Follow-up due').fill(future(4));
  await dialog.getByRole('button', { name: 'Save reschedule', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Schedule follow-up', exact: true }).click();
  await dialog.getByLabel('Follow-up due').fill(future(3));
  await dialog.getByLabel('Follow-up notes (optional)').fill('Fictional standalone follow-up');
  await dialog.getByRole('button', { name: 'Schedule follow-up', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.goto(`${base}/`); await page.waitForLoadState('networkidle');
  const after = await dashboard();
  assert.equal(after.totals.totalCalls, before.totals.totalCalls + 2);
  assert.equal(after.totals.leadsContacted, before.totals.leadsContacted + 1);
  for (const scope of ['today','upcoming','overdue','completed']) { await page.goto(`${base}/follow-ups?scope=${scope}`); await page.waitForLoadState('networkidle'); assert.equal(await page.getByRole('alert').count(), 0); }
  await page.goto(`${base}/calls`); await page.getByRole('heading', { name: 'My calls', exact: true }).waitFor();
  await page.goto(`${base}/reports`); await page.waitForURL(`${base}/`);
  await signout();
  console.log('Step: administrator login'); await login('admin');
  await page.goto(leadUrl); await page.getByRole('heading', { name, exact: true }).waitFor();
  await page.goto(`${base}/reports`);
  for (const title of ['Download leads','Download call history','Download executive performance']) {
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: title, exact: true }).click();
    const download = await downloadEvent;
    assert.equal(await download.failure(), null);
    console.log(`Downloaded ${download.suggestedFilename()}`);
  }
  assert.deepEqual(errors, []);
  console.log(`PASS: real-backend UI walkthrough; created fictional lead ${name}; two calls retained, follow-ups completed/rescheduled/scheduled, dashboard changed and three CSVs downloaded. No uncaught page errors.`);
} catch (error) { console.error('Walkthrough failed:', error); console.error('At URL:', page.url()); await page.screenshot({ path: 'docs/screenshots/walkthrough-failure.png', fullPage: true }).catch(() => {}); process.exitCode = 1; } finally { await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 5000))]); process.exit(process.exitCode || 0); }



