// Depop shop scraper for the inventory sync.
// Loads the shop in headless Chromium and captures the product API
// responses that the page itself requests while scrolling.
//
// Usage: node tools/scrape.js <output-api.json>
// Requires: playwright-core (npm i playwright-core) and the Chromium at
// CHROME_PATH (defaults to the Claude Code remote environment install).

const { chromium } = require('playwright-core');
const fs = require('fs');

const OUT = process.argv[2] || 'api.json';
const SHOP_URL = 'https://www.depop.com/ouiouiprints/';
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    // --ssl-version-max=tls1.2 is required when running behind the
    // TLS-terminating egress proxy, which resets Chromium's TLS 1.3 hello.
    args: ['--no-sandbox', '--ssl-version-max=tls1.2', '--disable-background-networking', '--no-first-run'],
    proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
  });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1400, height: 900 },
    locale: 'en-US',
  });
  const page = await ctx.newPage();

  const apiPayloads = [];
  page.on('response', async (res) => {
    if (/webapi\.depop\.com.*(products|shop)/.test(res.url()) && res.status() === 200) {
      try {
        apiPayloads.push({ url: res.url(), json: await res.json() });
      } catch (e) {}
    }
  });

  await page.goto(SHOP_URL, { waitUntil: 'networkidle', timeout: 60000 });
  for (let i = 0; i < 20; i++) {
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(700);
  }
  await page.waitForTimeout(2000);

  fs.writeFileSync(OUT, JSON.stringify(apiPayloads, null, 2));
  console.log('captured', apiPayloads.length, 'api payloads ->', OUT);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
