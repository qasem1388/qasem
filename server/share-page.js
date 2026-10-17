// صفحة التنزيل التي يراها من يستلم رابط المشاركة (عبر واتساب مثلاً) دون الحاجة لحساب

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function fmtSize(n) {
  if (n < 1024 ** 2) return `${Math.max(1, Math.round(n / 1024))} ك.ب`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} م.ب`;
  return `${(n / 1024 ** 3).toFixed(2)} غ.ب`;
}

const STYLE = `
  :root { --bg:#f4f6f5; --card:#fff; --text:#1b2421; --muted:#5d6b66; --primary:#0f5c4d; --on-primary:#fff; --border:#d9e0dd; color-scheme: light; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0f1413; --card:#171e1c; --text:#e6ece9; --muted:#93a39d; --primary:#3fb39a; --on-primary:#06231d; --border:#2b3633; color-scheme: dark; } }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100dvh; display:grid; place-items:center; padding:16px; background:var(--bg); color:var(--text);
    font:16px/1.6 "Segoe UI", Tahoma, "Noto Sans Arabic", "Geeza Pro", system-ui, sans-serif; }
  main { width:min(640px,100%); background:var(--card); border:1px solid var(--border); border-radius:14px; padding:1.5rem; text-align:center; }
  h1 { font-size:1.2rem; margin:.25rem 0; overflow-wrap:anywhere; }
  p { color:var(--muted); margin:.25rem 0 1rem; font-size:.9rem; }
  .btn { display:inline-block; background:var(--primary); color:var(--on-primary); text-decoration:none; padding:.75rem 1.75rem; border-radius:10px; font-weight:600; }
  .media { display:block; max-width:100%; max-height:60vh; margin:0 auto 1rem; border-radius:8px; background:#000; }
  audio.media { width:100%; background:none; }
  small { display:block; margin-top:1.25rem; color:var(--muted); font-size:.8rem; }`;

function layout(title, body, meta = '') {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>${meta}
<style>${STYLE}</style></head><body><main>${body}</main></body></html>`;
}

function sharePage({ file, token, expiresAt }) {
  const base = `/s/${encodeURIComponent(token)}`;
  const media = file.mime.startsWith('image/')
    ? `<img class="media" src="${base}/download?inline=1" alt="">`
    : file.mime.startsWith('video/')
      ? `<video class="media" src="${base}/download?inline=1" controls playsinline preload="metadata"></video>`
      : file.mime.startsWith('audio/')
        ? `<audio class="media" src="${base}/download?inline=1" controls></audio>`
        : '';
  const action = file.url
    ? `<a class="btn" href="${esc(file.url)}" rel="noopener noreferrer">فتح الرابط</a>`
    : `<a class="btn" href="${base}/download">تنزيل الملف</a>`;
  const desc = file.url ? file.url : `ملف مشترك · ${fmtSize(file.size)}`;
  const meta = `<meta property="og:title" content="${esc(file.name)}"><meta property="og:description" content="${esc(desc)}">`;
  return layout(file.name, `
    ${media}
    <h1>${esc(file.url ? file.name.replace(/\.url$/i, '') : file.name)}</h1>
    <p>${esc(desc)}</p>
    ${action}
    <small>${expiresAt ? `هذا الرابط صالح حتى ${esc(expiresAt.slice(0, 10))}` : 'تمت مشاركة هذا الملف من أرشيف الموظفين'}</small>`, meta);
}

function expiredPage() {
  return layout('الرابط غير متاح', `<h1>الرابط غير متاح</h1><p>انتهت صلاحية هذا الرابط أو تم إيقافه أو حذف الملف. اطلب رابطاً جديداً من الشخص الذي أرسله لك.</p>`);
}

module.exports = { sharePage, expiredPage };
