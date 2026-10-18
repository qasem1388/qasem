// Saves PNG stills at given times for review: node stills.js 0.5 2 5 ...
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.addInitScript(() => { window.__CAPTURE__ = true; });
  await page.goto('file://' + path.resolve(__dirname, 'index.html'));
  await page.evaluate(() => document.fonts.ready);
  for (const a of process.argv.slice(2)) {
    await page.evaluate((t) => window.render(t), Number(a));
    await page.screenshot({ path: `build/still_${a}.png` });
  }
  await browser.close();
})();
