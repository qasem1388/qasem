// ملصق للطباعة يُلصق على الملف الورقي: مسح رمز QR بالجوال يفتح النسخة الإلكترونية في التطبيق

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

module.exports = function labelPage({ file, svg, path }) {
  const qr = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ملصق ${esc(file.archive_no)}</title>
<style>
  @page { size: 90mm 50mm; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Tahoma, "Segoe UI", "Noto Sans Arabic", sans-serif; background: #f4f6f5; color: #111; }
  .label { width: 90mm; height: 50mm; margin: 16px auto; background: #fff; border: 1px dashed #999; display: flex; gap: 4mm; padding: 4mm; align-items: center; }
  .label img { width: 40mm; height: 40mm; flex-shrink: 0; }
  .info { min-width: 0; display: grid; gap: 1.5mm; }
  .no { font: 700 11pt/1.1 ui-monospace, Consolas, monospace; direction: ltr; text-align: right; white-space: nowrap; }
  .name { font-size: 10pt; font-weight: 700; overflow-wrap: anywhere; max-height: 15mm; overflow: hidden; }
  .meta { font-size: 8pt; color: #444; }
  .hint { text-align: center; color: #555; font-size: 13px; }
  button { display: block; margin: 0 auto 16px; font: inherit; padding: 8px 24px; border-radius: 8px; border: 0; background: #0f5c4d; color: #fff; cursor: pointer; }
  @media print { body { background: #fff; } .label { margin: 0; border: 0; } .hint, button { display: none; } }
</style></head><body>
<div class="label">
  <img src="${qr}" alt="">
  <div class="info">
    <div class="no">${esc(file.archive_no)}</div>
    <div class="name">${esc(file.name)}</div>
    ${path.length ? `<div class="meta">${esc(path.join(' / '))}</div>` : ''}
    ${file.category ? `<div class="meta">${esc(file.category)}</div>` : ''}
    <div class="meta">${esc(file.created_at.slice(0, 10))}</div>
  </div>
</div>
<p class="hint">امسح الرمز بكاميرا الجوال لفتح الملف في أرشيف الموظفين</p>
<button onclick="print()">طباعة</button>
</body></html>`;
};
