// صور مصغّرة للصور والفيديو، واستخراج الصوت للتفريغ. المكتبتان اختياريتان: إن لم تتوفرا يعمل التطبيق بدون هذه الميزات

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const config = require('./config');
const { typeOf } = require('./filetypes');

const THUMB_DIR = path.join(config.dataDir, 'thumbs');
const THUMB_SIZE = 480;

function optional(name) {
  try {
    return require(name);
  } catch {
    return null;
  }
}

const sharp = optional('sharp');
const ffmpegPath = process.env.FFMPEG_PATH || optional('ffmpeg-static');

const capabilities = { thumbnails: !!sharp, video: !!(sharp && ffmpegPath), audio: !!ffmpegPath };

function run(cmd, args, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err = (err + d).slice(-2000)));
    const timer = setTimeout(() => p.kill('SIGKILL'), timeoutMs);
    p.on('error', reject);
    p.on('close', (code) => {
      clearTimeout(timer);
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${err.trim().split('\n').pop()}`));
    });
  });
}

const tmpFile = (ext) => path.join(config.uploadTmpDir, `${crypto.randomUUID()}${ext}`);

async function videoFrame(src) {
  const out = tmpFile('.jpg');
  try {
    // لقطة بعد ثانية (تتجاوز الإطار الأسود في البداية)، وإن كان المقطع أقصر نأخذ أول إطار
    for (const at of ['1', '0']) {
      try {
        await run(ffmpegPath, ['-v', 'error', '-ss', at, '-i', src, '-frames:v', '1', '-vf', `scale=${THUMB_SIZE}:-2`, '-y', out], 60_000);
        if (fs.existsSync(out) && fs.statSync(out).size) return await fs.promises.readFile(out);
      } catch {}
    }
    return null;
  } finally {
    fs.rm(out, { force: true }, () => {});
  }
}

// يعيد صورة مصغرة WebP أو null إن لم يكن الملف صورة/فيديو أو تعذر قراءته
async function makeThumb(srcPath, name) {
  const kind = typeOf(name).key;
  if (!sharp || (kind !== 'image' && kind !== 'video')) return null;
  try {
    const input = kind === 'video' ? (ffmpegPath ? await videoFrame(srcPath) : null) : srcPath;
    if (!input) return null;
    return await sharp(input, { failOn: 'none', animated: false })
      .rotate()
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();
  } catch {
    return null;
  }
}

const thumbPath = (fileId, version) => path.join(THUMB_DIR, `${Number(fileId)}-v${Number(version)}.webp`);

async function saveThumb(fileId, version, buffer) {
  await fs.promises.mkdir(THUMB_DIR, { recursive: true });
  await fs.promises.writeFile(thumbPath(fileId, version), buffer);
}

// يقسم الصوت إلى مقاطع صغيرة (10 دقائق) مضغوطة، تناسب حدود خدمات التفريغ
async function extractAudioChunks(src, seconds = 600) {
  if (!ffmpegPath) throw new Error('ffmpeg غير متوفر');
  const dir = tmpFile('');
  await fs.promises.mkdir(dir, { recursive: true });
  await run(ffmpegPath, ['-v', 'error', '-i', src, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '32k',
    '-f', 'segment', '-segment_time', String(seconds), '-reset_timestamps', '1', path.join(dir, 'part%04d.mp3')], 60 * 60_000);
  const files = (await fs.promises.readdir(dir)).sort().map((f) => path.join(dir, f));
  return { dir, files, seconds };
}

module.exports = { makeThumb, saveThumb, thumbPath, extractAudioChunks, capabilities };
