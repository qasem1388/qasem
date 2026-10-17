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
