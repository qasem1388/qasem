// قراءة النص (العربي والإنجليزي) من الصور والمستندات المصوّرة، حتى يصبح قابلاً للبحث

const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');

const LANGS = ['ara', 'eng'];
let workerPromise = null;

// ملفات اللغات تأتي من حزم npm، فننسخها إلى مجلد واحد يقرأ منه Tesseract دون إنترنت
function prepareLangDir() {
  const dir = path.join(config.dataDir, 'tessdata');
  fs.mkdirSync(dir, { recursive: true });
  for (const lang of LANGS) {
    const target = path.join(dir, `${lang}.traineddata.gz`);
    if (fs.existsSync(target)) continue;
    const pkg = path.dirname(require.resolve(`@tesseract.js-data/${lang}/package.json`));
    fs.copyFileSync(path.join(pkg, '4.0.0', `${lang}.traineddata.gz`), target);
  }
  return dir;
}

function worker() {
  if (!workerPromise) {
    const { createWorker } = require('tesseract.js');
    workerPromise = createWorker(LANGS, 1, { langPath: prepareLangDir(), cachePath: path.join(config.dataDir, 'tessdata'), gzip: true });
  }
  return workerPromise;
}

async function recognize(imagePath) {
  const w = await worker();
  const { data } = await w.recognize(imagePath);
  return (data.text || '').replace(/[ \t]+/g, ' ').trim();
}

async function shutdown() {
  if (workerPromise) await (await workerPromise).terminate();
  workerPromise = null;
}

module.exports = { recognize, shutdown };
