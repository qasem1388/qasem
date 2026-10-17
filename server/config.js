const path = require('node:path');

const env = process.env;
const dataDir = path.resolve(env.DATA_DIR || path.join(__dirname, '..', 'data'));

module.exports = {
  port: Number(env.PORT) || 3000,
  dataDir,
  dbPath: path.join(dataDir, 'archive.sqlite'),
  uploadTmpDir: path.join(dataDir, 'tmp'),
  production: env.NODE_ENV === 'production',
  // عنوان التطبيق على الإنترنت (مثل https://archive.example.com) لبناء روابط المشاركة. يُستنتج من الطلب إن لم يُحدَّد
  publicUrl: (env.PUBLIC_URL || '').replace(/\/+$/, '') || null,
  jwtSecret: env.JWT_SECRET || null,
  // 0 يعني بدون حد لحجم الملف
  maxUploadMb: Number(env.MAX_UPLOAD_MB) || 0,
  admin: {
    username: env.ADMIN_USERNAME || 'admin',
    password: env.ADMIN_PASSWORD || null,
  },
  // قراءة النص العربي من الصور (OCR). تعمل على الخادم نفسه بدون خدمات خارجية
  ocr: env.OCR !== '0',
  // تفريغ كلام الفيديو والصوت عبر خدمة متوافقة مع واجهة OpenAI للتفريغ (مثل Groq أو OpenAI)
  transcribe: {
    url: env.TRANSCRIBE_API_URL || null,
    key: env.TRANSCRIBE_API_KEY || null,
    model: env.TRANSCRIBE_MODEL || 'whisper-1',
    language: env.TRANSCRIBE_LANGUAGE || 'ar',
  },
  // اقتراح التصنيف والوسوم والوصف بالذكاء الاصطناعي (Claude) عند وجود ANTHROPIC_API_KEY
  ai: {
    enabled: !!(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN),
    autoTag: env.AI_AUTO_TAG !== '0',
    model: env.AI_MODEL || 'claude-opus-5-5',
  },
  backup: {
    dir: path.resolve(env.BACKUP_DIR || path.join(dataDir, 'backups')),
    hour: env.BACKUP_HOUR != null ? Number(env.BACKUP_HOUR) : 2,
    keep: Number(env.BACKUP_KEEP) || 14,
  },
  // 'gdrive' يحفظ الملفات في Google Drive، و 'local' يحفظها على قرص الخادم
  storage: env.STORAGE || (env.GOOGLE_REFRESH_TOKEN ? 'gdrive' : 'local'),
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    refreshToken: env.GOOGLE_REFRESH_TOKEN,
    folderId: env.DRIVE_FOLDER_ID || null,
    folderName: env.DRIVE_FOLDER_NAME || 'أرشيف الموظفين',
  },
};
