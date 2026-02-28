import { existsSync, mkdirSync, renameSync, unlinkSync } from 'fs';
import { chromium } from 'playwright';

const FRONTEND_URL = process.env.DEMO_FRONTEND_URL ?? 'http://localhost:3000';
const BACKEND_URL = process.env.DEMO_BACKEND_URL ?? 'http://127.0.0.1:3001';
const OUTPUT_DIR = process.env.DEMO_OUTPUT_DIR ?? 'docs/video';

const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'demo@demo.com';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? '123456';
const ADMIN_USERNAME = process.env.DEMO_ADMIN_USERNAME ?? 'change-me-admin';
const ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD ?? 'change-me-strong-password';
const ADMIN_FALLBACK_USERNAME = process.env.DEMO_ADMIN_FALLBACK_USERNAME ?? 'admin';
const ADMIN_FALLBACK_PASSWORD = process.env.DEMO_ADMIN_FALLBACK_PASSWORD ?? 'admin';

mkdirSync(OUTPUT_DIR, { recursive: true });

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const loginUserToken = async (email, password) => {
  const response = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) return '';
  const data = await response.json();
  return typeof data?.token === 'string' ? data.token : '';
};

const registerUserToken = async (email, password) => {
  const response = await fetch(`${BACKEND_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) return '';
  const data = await response.json();
  return typeof data?.token === 'string' ? data.token : '';
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
  let userToken = await loginUserToken(DEMO_EMAIL, DEMO_PASSWORD);
  if (!userToken) {
    userToken = await registerUserToken(DEMO_EMAIL, DEMO_PASSWORD);
  }
  if (!userToken) {
    throw new Error('Unable to obtain user auth token.');
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1440, height: 900 },
    },
  });
  await context.addInitScript((token) => {
    window.localStorage.setItem('auth_token', token);
  }, userToken);

  const page = await context.newPage();
  const video = page.video();

  await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
  await pause(1200);
  await page.getByRole('button', { name: 'Logout' }).first().waitFor({ timeout: 15000 });
  await pause(2000);

  await page.getByRole('button', { name: 'New chat', exact: true }).first().click();
  await pause(1000);
  await page.getByPlaceholder('Type your message...').fill(
    'Give me a 1-line summary of this starter kit.',
  );
  await pause(600);
  await page.locator('button:has-text("Send")').first().click();
  // Wait until SSE streaming finishes and send button is enabled again.
  // If model streaming hangs, keep the recording moving after a long pause.
  try {
    await page.locator('button:has-text("Send"):not([disabled])').first().waitFor({
      timeout: 45000,
    });
  } catch {
    await pause(8000);
  }
  await pause(1400);

  let adminToken = await loginAdminToken(ADMIN_USERNAME, ADMIN_PASSWORD);
  if (!adminToken) {
    adminToken = await loginAdminToken(ADMIN_FALLBACK_USERNAME, ADMIN_FALLBACK_PASSWORD);
  }
  if (adminToken) {
    await page.addInitScript((token) => {
      window.localStorage.setItem('admin_token', token);
    }, adminToken);
  }

  await page.goto(`${FRONTEND_URL}/admin`, { waitUntil: 'domcontentloaded' });
  await page.getByText('User Management').first().waitFor({ timeout: 15000 });
  await pause(2000);

  await page.getByText('Model Training').first().click();
  await page.getByRole('heading', { name: 'Training Data' }).waitFor({ timeout: 7000 });
  await pause(2200);

  await page.getByRole('button', { name: 'Add Training Data' }).click();
  await page.getByRole('heading', { name: 'Add Training Data' }).waitFor({ timeout: 7000 });
  await pause(2000);

  await page.getByRole('button', { name: 'Cancel' }).click();
  await pause(1200);

  await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
  await pause(1800);

  await context.close();

  const rawPath = await video.path();
  const finalPath = `${OUTPUT_DIR}/gumroad-demo.webm`;
  if (existsSync(finalPath)) {
    unlinkSync(finalPath);
  }
  renameSync(rawPath, finalPath);
  console.log(`saved ${finalPath}`);
} finally {
  await browser.close();
}
