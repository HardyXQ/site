/**
 * Renders scripts/og-template.html to /og-cover.png (1200x630).
 * Needs Playwright + Chrome: `npx playwright@1.62.1 ...` or a local install.
 *
 *   node scripts/make-og.mjs
 */
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Playwright is not installed. Run:  npm i -D playwright  (then this script).');
  process.exit(1);
}

const template = fileURLToPath(new URL('./og-template.html', import.meta.url));
const out = fileURLToPath(new URL('../og-cover.png', import.meta.url));

const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto('file://' + template, { waitUntil: 'networkidle' });
await page.waitForTimeout(400); // let webfonts settle
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
console.log('wrote og-cover.png');
