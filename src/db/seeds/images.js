'use strict';
/**
 * مولد صور PNG بسيط (بدون مكتبات خارجية) لإنشاء صور تجريبية للبيانات الأولية:
 * خلفيات متدرجة بزخارف هندسية، وشعار دائري، وملف PDF تجريبي.
 */
const zlib = require('zlib');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(w, h, pixel, alpha = false) {
  const bpp = alpha ? 4 : 3;
  const raw = Buffer.alloc((w * bpp + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * bpp + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const p = pixel(x, y);
      const o = row + 1 + x * bpp;
      raw[o] = p[0]; raw[o + 1] = p[1]; raw[o + 2] = p[2];
      if (alpha) raw[o + 3] = p[3] === undefined ? 255 : p[3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = alpha ? 6 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** خلفية متدرجة بزخرفة هندسية خفيفة (نمط إسلامي مبسط) */
function patternImage(w, h, c1, c2, seed = 1) {
  const A = hex(c1);
  const B = hex(c2);
  const cell = Math.max(24, Math.round(h / 5));
  return encodePng(w, h, (x, y) => {
    const t = (x / w) * 0.75 + (y / h) * 0.25;
    let col = mix(A, B, t);
    const cx = (x % cell) - cell / 2;
    const cy = (y % cell) - cell / 2;
    const d = Math.abs(cx) + Math.abs(cy);
    const r = Math.hypot(cx, cy);
    if (Math.abs(d - cell * 0.38) < 1.2 || Math.abs(r - cell * 0.22 * (1 + (seed % 3) * 0.1)) < 1) col = mix(col, [255, 255, 255], 0.13);
    const glow = Math.max(0, 1 - Math.hypot(x - w * 0.8, y - h * 0.3) / (w * 0.5));
    return mix(col, [255, 255, 255], glow * 0.12);
  });
}

/** شعار دائري بسيط: حلقة متدرجة ويدان (رمز العطاء) */
function logoImage(size, c1, c2) {
  const A = hex(c1);
  const B = hex(c2);
  const c = size / 2;
  return encodePng(size, size, (x, y) => {
    const dx = x - c;
    const dy = y - c;
    const r = Math.hypot(dx, dy) / c;
    if (r > 0.98) return [0, 0, 0, 0];
    if (r > 0.86) return [...mix(A, B, (x + y) / (2 * size)), 255];
    // قلب في المنتصف
    const hx = dx / (c * 0.42);
    const hy = -(dy + c * 0.08) / (c * 0.42);
    const heart = Math.pow(hx * hx + hy * hy - 1, 3) - hx * hx * hy * hy * hy <= 0;
    if (heart) return [...B, 255];
    // يدان كقوسين أسفل القلب
    const arc = Math.abs(Math.hypot(dx, dy - c * 0.05) - c * 0.6) < c * 0.06 && dy > c * 0.1;
    if (arc) return [...A, 255];
    return [255, 255, 255, 255];
  }, true);
}

/** ملف PDF تجريبي صالح من صفحة واحدة */
function samplePdf(title) {
  const text = String(title).replace(/[^\x20-\x7e]/g, '?').replace(/[()\\]/g, '');
  const stream = `BT /F1 24 Tf 72 720 Td (${text}) Tj ET\nBT /F1 12 Tf 72 690 Td (Sample document generated for demo purposes.) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

module.exports = { patternImage, logoImage, samplePdf, encodePng };
