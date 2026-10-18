// Renders animation.html frame by frame into an MP4 (video only).
// Usage: node render.js [out.mp4] [--stills 3,6,9]
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const FPS = 30, DUR = 20;
const root = __dirname;
const args = process.argv.slice(2);
const stillsIdx = args.indexOf('--stills');
const stills = stillsIdx >= 0 ? args[stillsIdx + 1].split(',').map(Number) : null;
const out = (stillsIdx === 0 ? null : args[0]) || path.join(root, 'build', 'video.mp4');

const types = { '.html': 'text/html', '.png': 'image/png', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(`http://127.0.0.1:${port}/animation.html?render=1`);
  await page.evaluate(() => window.ready);
  const frame = t => page.evaluate(t => { renderAt(t); return document.getElementById('c').toDataURL('image/jpeg', 0.95); }, t)
    .then(u => Buffer.from(u.split(',')[1], 'base64'));

  fs.mkdirSync(path.join(root, 'build'), { recursive: true });
  if (stills) {
    for (const t of stills) fs.writeFileSync(path.join(root, 'build', `still_${t}.jpg`), await frame(t));
  } else {
    const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'ignore', 'inherit'] });
    const total = FPS * DUR;
    for (let i = 0; i < total; i++) {
      const buf = await frame(i / FPS);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 60 === 0) console.log(`frame ${i}/${total}`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  await browser.close();
  server.close();
})();
