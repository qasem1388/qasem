// Renders index.html frame-by-frame and pipes JPEG frames to ffmpeg.
// usage: node render.js out.mp4 [fps] [duration]   |   node render.js --stills dir t1 t2 ...
const { chromium } = require(process.env.PW || 'playwright');
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs');
(async () => {
  const args = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.evaluate(() => window.fontsReady);
  if (args[0] === '--stills') {
    fs.mkdirSync(args[1], { recursive: true });
    for (const t of args.slice(2)) {
      await page.evaluate(t => window.render(t), +t);
      await page.screenshot({ path: path.join(args[1], `t${(+t).toFixed(2)}.jpg`), type: 'jpeg', quality: 80 });
    }
  } else {
    const out = args[0] || 'frames.mp4', fps = +(args[1] || 30), dur = +(args[2] || 30);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round(fps * dur);
    for (let i = 0; i < n; i++) {
      await page.evaluate(t => window.render(t), i / fps);
      const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 60 === 0) process.stdout.write(`frame ${i}/${n}\n`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
