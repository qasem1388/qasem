// Renders index.html frame-by-frame and pipes JPEG frames into ffmpeg.
// Usage: node capture.js [out.mp4] [fps] [startSec] [endSec]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const out = process.argv[2] || 'build/video_silent.mp4';
const fps = Number(process.argv[3] || 30);
const start = Number(process.argv[4] || 0);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.addInitScript(() => { window.__CAPTURE__ = true; });
  await page.goto('file://' + path.resolve(__dirname, 'index.html'));
  await page.evaluate(() => document.fonts.ready);
  const dur = await page.evaluate(() => window.DUR);
  const end = Number(process.argv[5] || dur);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(fps), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round((end - start) * fps);
  for (let i = 0; i < total; i++) {
    const t = start + i / fps;
    await page.evaluate((t) => window.render(t), t);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 90 === 0) process.stdout.write(`frame ${i}/${total}\n`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await browser.close();
})();
