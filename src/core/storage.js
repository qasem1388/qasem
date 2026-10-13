'use strict';
/**
 * خدمة تخزين الملفات.
 * - الملفات العامة (صور وPDF) تُحفظ في uploads/ وتُعرض على /uploads/...
 * - الملفات الخاصة (السير الذاتية) تُحفظ في storage/private ولا تُتاح إلا للمدير بعد التحقق من الصلاحية.
 * الواجهة مصممة بحيث يمكن لاحقًا استبدال التخزين المحلي بخدمة سحابية (S3 وغيرها) دون تغيير بقية النظام.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const { httpError } = require('./http-error');

const TYPES = {
  jpg: { mime: 'image/jpeg', kind: 'image' },
  jpeg: { mime: 'image/jpeg', kind: 'image' },
  png: { mime: 'image/png', kind: 'image' },
  webp: { mime: 'image/webp', kind: 'image' },
  pdf: { mime: 'application/pdf', kind: 'pdf' },
};

/** التحقق من نوع الملف الحقيقي عبر توقيعه (Magic Bytes) وليس الامتداد فقط */
function detectType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (buf.slice(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  return null;
}

/**
 * يتحقق من الملف المرفوع ويعيد معلوماته.
 * @param {{originalname:string, buffer:Buffer, size:number}} file
 * @param {{allow?: string[]}} opts الأنواع المسموحة: image, pdf
 */
function inspect(file, { allow = ['image', 'pdf'] } = {}) {
  if (!file || !file.buffer) throw httpError(400, 'لم يتم اختيار ملف');
  const ext = path.extname(file.originalname || '').slice(1).toLowerCase();
  if (!TYPES[ext]) throw httpError(400, 'نوع الملف غير مسموح. الأنواع المسموحة: JPG, JPEG, PNG, WEBP, PDF');
  const real = detectType(file.buffer);
  if (!real || TYPES[real].kind !== TYPES[ext].kind || TYPES[real].mime !== TYPES[ext].mime) {
    throw httpError(400, 'محتوى الملف لا يطابق امتداده أو الملف تالف');
  }
  const { kind, mime } = TYPES[real];
  if (!allow.includes(kind)) throw httpError(400, kind === 'pdf' ? 'يجب اختيار صورة' : 'يجب اختيار ملف PDF');
  const limitMB = kind === 'image' ? config.uploads.maxImageMB : config.uploads.maxPdfMB;
  if (file.size > limitMB * 1024 * 1024) throw httpError(400, `حجم الملف يتجاوز الحد المسموح (${limitMB} ميجابايت)`);
  return { ext: real === 'jpeg' ? 'jpg' : real, kind, mime };
}

const randomName = (ext) => `${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}.${ext}`;

/** حفظ ملف عام وإرجاع رابطه */
async function savePublic(file, info) {
  const d = new Date();
  const sub = path.join(String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'));
  const dir = path.join(config.uploads.publicDir, sub);
  await fs.promises.mkdir(dir, { recursive: true });
  const name = randomName(info.ext);
  await fs.promises.writeFile(path.join(dir, name), file.buffer, { flag: 'wx' });
  return { fileName: name, url: `/uploads/${sub.split(path.sep).join('/')}/${name}` };
}

/** حذف ملف عام عبر رابطه (مع منع الخروج من مجلد الرفع) */
async function deletePublic(url) {
  if (!/^\/uploads\/[\w./-]+$/.test(url || '') || url.includes('..')) return;
  const full = path.resolve(config.uploads.publicDir, url.replace(/^\/uploads\//, ''));
  if (!full.startsWith(config.uploads.publicDir + path.sep)) return;
  await fs.promises.unlink(full).catch(() => {});
}

/** حفظ ملف خاص (غير متاح للعامة) */
async function savePrivate(file, info, folder) {
  const dir = path.join(config.uploads.privateDir, folder);
  await fs.promises.mkdir(dir, { recursive: true });
  const name = randomName(info.ext);
  await fs.promises.writeFile(path.join(dir, name), file.buffer, { flag: 'wx' });
  return `${folder}/${name}`;
}

function privatePath(rel) {
  if (!/^[\w-]+\/[\w.-]+$/.test(rel || '') || rel.includes('..')) return null;
  const full = path.resolve(config.uploads.privateDir, rel);
  return full.startsWith(config.uploads.privateDir + path.sep) && fs.existsSync(full) ? full : null;
}

module.exports = { inspect, savePublic, deletePublic, savePrivate, privatePath, detectType };
