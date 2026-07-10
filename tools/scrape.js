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
    // --disable-blink-features=AutomationControlled is required to pass
    // Depop's Cloudflare JS challenge, which otherwise 403s the shop page.
    args: ['--no-sandbox', '--ssl-version-max=tls1.2', '--disable-background-networking', '--no-first-run',
           '--disable-blink-features=AutomationControlled'],
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

  // domcontentloaded + fixed wait rather than networkidle: analytics keep
  // the network busy indefinitely. Retry navigation if the Cloudflare
  // challenge blocks the first attempt.
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto(SHOP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(6000); // let any JS challenge resolve
    if (apiPayloads.length > 0) break;
    console.log(`attempt ${attempt}: no product API responses yet, retrying`);
  }
  // Scroll until the product API stops paginating (no new payloads for
  // several rounds), so the whole catalogue is captured.
  let stable = 0, last = apiPayloads.length;
  for (let i = 0; i < 80 && stable < 8; i++) {
    await page.mouse.wheel(0, 2200);
    await page.waitForTimeout(700);
    if (apiPayloads.length === last) stable++;
    else { stable = 0; last = apiPayloads.length; }
  }
  await page.waitForTimeout(2000);

  fs.writeFileSync(OUT, JSON.stringify(apiPayloads, null, 2));
  console.log('captured', apiPayloads.length, 'api payloads ->', OUT);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
