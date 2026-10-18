// يحوّل الصفحة index.html إلى فيديو MP4 إطارًا بإطار.
// الاستخدام:
//   node render.mjs                     → النسختان (أفقي 1920x1080 + عمودي 1080x1920)
//   node render.mjs h                   → الأفقي فقط
//   node render.mjs v                   → العمودي فقط
//   node render.mjs stills              → صور معاينة لكل مشهد في output/stills
// يمكن تمرير بيانات التواصل:  WHATSAPP=05.. SNAP=@.. TIKTOK=@.. node render.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, 'output');
mkdirSync(out, { recursive: true });
const FPS = 30;
const mode = process.argv[2] || 'all';
const formats = { h: [1920, 1080], v: [1080, 1920] };

function pageUrl(w, h) {
  const q = new URLSearchParams({ w, h, capture: 1 });
  for (const k of ['whatsapp', 'snap', 'tiktok']) if (process.env[k.toUpperCase()]) q.set(k, process.env[k.toUpperCase()]);
  return pathToFileURL(path.join(dir, 'index.html')).href + '?' + q;
}

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});

async function open(w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(pageUrl(w, h));
  await page.evaluate(() => document.fonts.ready);
  return page;
}

async function stills() {
  for (const [key, [w, h]] of Object.entries(formats)) {
    const page = await open(w, h);
    const times = await page.evaluate(() => [...document.querySelectorAll('.scene')].map(s => s.start + s.dur - 0.8));
    for (const [i, t] of times.entries()) {
      await page.evaluate(t => window.__seek(t), t);
      await page.screenshot({ path: path.join(out, 'stills', `${key}-${i + 1}.jpg`), quality: 85, type: 'jpeg' });
    }
    await page.close();
  }
}

async function video(key) {
  const [w, h] = formats[key];
  const page = await open(w, h);
  const total = await page.evaluate(() => window.__total);
  const frames = Math.round(total * FPS);
  const file = path.join(out, `noor-basira-${key === 'h' ? '1920x1080' : '1080x1920'}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => window.__seek(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) process.stdout.write(`${key}: ${i}/${frames}\n`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await page.close();
  console.log('✔', file);
}

if (mode === 'stills') { mkdirSync(path.join(out, 'stills'), { recursive: true }); await stills(); }
else for (const k of mode === 'all' ? ['h', 'v'] : [mode]) await video(k);
await browser.close();
