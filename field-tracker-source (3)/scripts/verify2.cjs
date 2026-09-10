const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const failed = [];
  page.on('response', (res) => { if (!res.ok() && res.status() !== 304) failed.push(`${res.status()} ${res.url()}`); });
  page.on('pageerror', (err) => console.log('PAGE EXCEPTION:', err.message));
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/shots3/relative-base-check.png' });
  console.log('Failed asset requests:', failed.length ? failed : 'none');
  console.log('Title:', await page.title());
  await browser.close();
})();
