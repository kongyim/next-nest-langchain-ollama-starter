import { mkdirSync } from 'fs';
import { chromium } from 'playwright';

const FRONTEND_URL = process.env.SCREENSHOT_FRONTEND_URL ?? 'http://127.0.0.1:3100';
const BACKEND_URL = process.env.SCREENSHOT_BACKEND_URL ?? 'http://127.0.0.1:3001';
const OUTPUT_DIR = process.env.SCREENSHOT_OUTPUT_DIR ?? 'docs/screenshots';
const DEMO_EMAIL = process.env.SCREENSHOT_DEMO_EMAIL ?? 'demo@demo.com';
const DEMO_PASSWORD = process.env.SCREENSHOT_DEMO_PASSWORD ?? '123456';
const ADMIN_USERNAME = process.env.SCREENSHOT_ADMIN_USERNAME ?? 'change-me-admin';
const ADMIN_PASSWORD = process.env.SCREENSHOT_ADMIN_PASSWORD ?? 'change-me-strong-password';
const ADMIN_FALLBACK_USERNAME = process.env.SCREENSHOT_ADMIN_FALLBACK_USERNAME ?? 'admin';
const ADMIN_FALLBACK_PASSWORD = process.env.SCREENSHOT_ADMIN_FALLBACK_PASSWORD ?? 'admin';

mkdirSync(OUTPUT_DIR, { recursive: true });

const screenshot = async (page, name) => {
  const path = `${OUTPUT_DIR}/${name}`;
  await page.screenshot({ path, fullPage: true });
  console.log(`saved ${path}`);
};

const waitForStableUI = async (page, ms = 500) => {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(ms);
};

const loginAdminToken = async (username, password) => {
  const response = await fetch(`${BACKEND_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) return '';
  const data = await response.json();
  return typeof data?.token === 'string' ? data.token : '';
};

const browser = await chromium.launch({ headless: true });

try {
  const userContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const userPage = await userContext.newPage();

  await userPage.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
  await waitForStableUI(userPage);
  await screenshot(userPage, '01-user-login.png');

  await userPage.getByRole('button', { name: 'No account yet? Sign up' }).click();
  await waitForStableUI(userPage);
  await screenshot(userPage, '02-user-signup.png');

  await userPage.getByRole('button', { name: 'Already have an account? Log in' }).click();
  await userPage.getByLabel('Email').fill(DEMO_EMAIL);
  await userPage.getByLabel('Password').fill(DEMO_PASSWORD);
  await userPage.getByRole('button', { name: 'Log in' }).click();
  await userPage.getByText('History').waitFor({ timeout: 15000 });
  await waitForStableUI(userPage, 1000);
  await screenshot(userPage, '03-user-chat-main.png');

  await userContext.close();

  const adminLoginContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminLoginPage = await adminLoginContext.newPage();
  await adminLoginPage.goto(`${FRONTEND_URL}/admin`, { waitUntil: 'domcontentloaded' });
  await waitForStableUI(adminLoginPage);
  await screenshot(adminLoginPage, '04-admin-login.png');
  await adminLoginContext.close();

  let adminToken = await loginAdminToken(ADMIN_USERNAME, ADMIN_PASSWORD);
  if (!adminToken) {
    adminToken = await loginAdminToken(ADMIN_FALLBACK_USERNAME, ADMIN_FALLBACK_PASSWORD);
  }
  if (!adminToken) {
    throw new Error('Unable to acquire admin token from backend login endpoint.');
  }

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await adminContext.addInitScript((token) => {
    window.localStorage.setItem('admin_token', token);
  }, adminToken);
  const adminPage = await adminContext.newPage();
  await adminPage.goto(`${FRONTEND_URL}/admin`, { waitUntil: 'domcontentloaded' });
  await adminPage.getByText('User Management').first().waitFor({ timeout: 15000 });
  await waitForStableUI(adminPage, 1000);
  await screenshot(adminPage, '05-admin-users.png');

  await adminPage.getByRole('button', { name: 'Create User' }).click();
  await adminPage.getByRole('heading', { name: 'Create User' }).waitFor({ timeout: 5000 });
  await waitForStableUI(adminPage);
  await screenshot(adminPage, '06-admin-create-user-modal.png');
  await adminPage.getByRole('button', { name: 'Cancel' }).click();

  await adminPage.getByText('Model Training').first().click();
  await adminPage.getByRole('heading', { name: 'Training Data' }).waitFor({ timeout: 5000 });
  await waitForStableUI(adminPage, 1000);
  await screenshot(adminPage, '07-admin-training-overview.png');

  await adminPage.getByRole('button', { name: 'Add Training Data' }).click();
  await adminPage.getByRole('heading', { name: 'Add Training Data' }).waitFor({ timeout: 5000 });
  await waitForStableUI(adminPage);
  await screenshot(adminPage, '08-admin-training-modal.png');

  await adminContext.close();
} finally {
  await browser.close();
}
