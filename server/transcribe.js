// تفريغ كلام الفيديو والصوت إلى نص مع التوقيت، عبر خدمة متوافقة مع واجهة /audio/transcriptions

const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const { extractAudioChunks } = require('./media');

const enabled = () => !!(config.transcribe.url && config.transcribe.key);

async function transcribeChunk(file) {
  const form = new FormData();
  form.append('file', new Blob([await fs.promises.readFile(file)], { type: 'audio/mpeg' }), path.basename(file));
  form.append('model', config.transcribe.model);
  form.append('response_format', 'verbose_json');
  if (config.transcribe.language) form.append('language', config.transcribe.language);
  const res = await fetch(config.transcribe.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.transcribe.key}` },
    body: form,
  });
  if (!res.ok) throw new Error(`خدمة التفريغ ردت بالخطأ ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// يعيد [{ start, end, text }] بالثواني من بداية الملف
async function transcribe(mediaPath) {
  const { dir, files, seconds } = await extractAudioChunks(mediaPath);
  try {
    const segments = [];
    for (let i = 0; i < files.length; i++) {
      const out = await transcribeChunk(files[i]);
      const offset = i * seconds;
      const parts = out.segments?.length ? out.segments : [{ start: 0, end: seconds, text: out.text || '' }];
      for (const s of parts) {
        const text = String(s.text || '').trim();
        if (text) segments.push({ start: Math.round((offset + s.start) * 10) / 10, end: Math.round((offset + s.end) * 10) / 10, text });
      }
    }
    return segments;
  } finally {
    fs.rm(dir, { recursive: true, force: true }, () => {});
  }
}

module.exports = { transcribe, enabled };
