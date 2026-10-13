'use strict';
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ quiet: true });

const ROOT = path.resolve(__dirname, '..', '..');
const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

function int(name, def) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) ? v : def;
}

let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (isProd) {
    throw new Error('SESSION_SECRET مطلوب في بيئة الإنتاج. راجع docs/ENVIRONMENT.md');
  }
  sessionSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[config] SESSION_SECRET غير محدد — تم توليد مفتاح مؤقت (سيتم تسجيل خروج الجلسات عند إعادة التشغيل).');
}

module.exports = {
  env,
  isProd,
  root: ROOT,
  port: int('PORT', 3000),
  host: process.env.HOST || '0.0.0.0',
  siteUrl: (process.env.SITE_URL || '').replace(/\/+$/, ''),
  trustProxy: process.env.TRUST_PROXY ? process.env.TRUST_PROXY === 'true' : true,
  sessionSecret,
  sessionMaxAgeHours: int('SESSION_MAX_AGE_HOURS', 8),
  db: {
    url: process.env.DATABASE_URL || '',
    sqliteFile: path.resolve(ROOT, process.env.SQLITE_FILE || 'data/database.sqlite'),
    ssl: process.env.DATABASE_SSL === 'true',
  },
  uploads: {
    publicDir: path.resolve(ROOT, process.env.UPLOAD_DIR || 'uploads'),
    privateDir: path.resolve(ROOT, process.env.PRIVATE_STORAGE_DIR || 'storage/private'),
    maxImageMB: int('MAX_IMAGE_SIZE_MB', 5),
    maxPdfMB: int('MAX_PDF_SIZE_MB', 20),
  },
  defaultLocale: process.env.DEFAULT_LOCALE || 'ar',
};
