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
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1440, height: 900 },
    },
  });

  const page = await context.newPage();
  const video = page.video();

  await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
  await pause(1200);

  await page.getByLabel('Email').fill(DEMO_EMAIL);
  await page.getByLabel('Password').fill(DEMO_PASSWORD);
  await pause(500);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByText('History').waitFor({ timeout: 15000 });
  await pause(2000);

  await page.locator('button:has-text("New chat")').first().click();
  await pause(1000);
  await page.getByPlaceholder('Type your message...').fill(
    'Give me a 1-line summary of this starter kit.',
  );
  await pause(600);
  await page.locator('button:has-text("Send")').first().click();
  await pause(4500);

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
