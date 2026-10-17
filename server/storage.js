// مكان حفظ محتوى الملفات: Google Drive أو قرص الخادم.
// كل نسخة من كل ملف تُحفظ كملف مستقل، فلا تُستبدل النسخة الأصلية أبداً.
// المصدر عند الحفظ إما Buffer (ملفات صغيرة مولّدة داخل التطبيق) أو { path } لملف مرفوع على القرص،
// حتى لا تُحمَّل الملفات الكبيرة كالفيديو في الذاكرة.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const config = require('./config');

const FOLDER_MIME = 'application/vnd.google-apps.folder';

class LocalStorage {
  constructor(dir) {
    this.dir = dir;
    fs.mkdirSync(dir, { recursive: true });
  }

  async init() {}

  async put(source) {
    const key = crypto.randomUUID();
    const dest = path.join(this.dir, key);
    if (Buffer.isBuffer(source)) await fs.promises.writeFile(dest, source);
    else await moveFile(source.path, dest);
    return key;
  }

  // مسار الملف على القرص، ليرسله Express مباشرة مع دعم التقديم والتأخير في الفيديو
  localPath(key) {
    if (!/^[\w-]+$/.test(key)) throw new Error('invalid storage key');
    return path.join(this.dir, key);
  }

  async get(key) {
    return fs.promises.readFile(this.localPath(key));
  }

  async copy(key) {
    const newKey = crypto.randomUUID();
    await fs.promises.copyFile(this.localPath(key), path.join(this.dir, newKey));
    return newKey;
  }

  async remove(key) {
    await fs.promises.rm(this.localPath(key), { force: true });
  }
}

async function moveFile(from, to) {
  try {
    await fs.promises.rename(from, to);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
    await fs.promises.copyFile(from, to);
    await fs.promises.rm(from, { force: true });
  }
}

class DriveStorage {
  constructor(opts) {
    const { drive, auth } = require('@googleapis/drive');
    const client = new auth.OAuth2(opts.clientId, opts.clientSecret);
    client.setCredentials({ refresh_token: opts.refreshToken });
    this.drive = drive({ version: 'v3', auth: client });
    this.opts = opts;
    this.folderId = opts.folderId;
  }

  // يُستدعى قبل فتح قاعدة البيانات، لذلك يبحث عن المجلد بالاسم بدلاً من حفظ معرّفه فيها
  async init() {
    if (this.folderId) return;
    const name = this.opts.folderName.replace(/'/g, "\\'");
    const found = await this.drive.files.list({
      q: `name = '${name}' and mimeType = '${FOLDER_MIME}' and 'root' in parents and trashed = false`,
      fields: 'files(id)',
      pageSize: 1,
    });
    if (found.data.files.length) {
      this.folderId = found.data.files[0].id;
      return;
    }
    const res = await this.drive.files.create({
      requestBody: { name: this.opts.folderName, mimeType: FOLDER_MIME },
      fields: 'id',
    });
    this.folderId = res.data.id;
  }

  async put(source, name, mime) {
    const body = Buffer.isBuffer(source) ? Readable.from(source) : fs.createReadStream(source.path);
    const res = await this.drive.files.create({
      requestBody: { name, parents: [this.folderId] },
      media: { mimeType: mime || 'application/octet-stream', body },
      fields: 'id',
    });
    return res.data.id;
  }

  async get(key) {
    const res = await this.drive.files.get({ fileId: key, alt: 'media' }, { responseType: 'arraybuffer' });
    return Buffer.from(res.data);
  }

  // يبث الملف من Drive إلى المتصفح دون تحميله كاملاً، مع تمرير Range لتشغيل الفيديو والتقديم فيه
  async openStream(key, range) {
    const res = await this.drive.files.get(
      { fileId: key, alt: 'media' },
      { responseType: 'stream', headers: range ? { Range: range } : {}, validateStatus: (s) => s < 400 },
    );
    return { status: res.status, headers: res.headers, stream: res.data };
  }

  async copy(key, name) {
    const res = await this.drive.files.copy({ fileId: key, requestBody: { name, parents: [this.folderId] }, fields: 'id' });
    return res.data.id;
  }

  async remove(key) {
    await this.drive.files.delete({ fileId: key });
  }

  // نسخة احتياطية من قاعدة البيانات داخل نفس المجلد، حتى لا تضيع البيانات إذا أُعيد تشغيل الخادم السحابي
  async findBackup() {
    const res = await this.drive.files.list({
      q: `'${this.folderId}' in parents and name = '${BACKUP_NAME}' and trashed = false`,
      fields: 'files(id)',
      pageSize: 1,
    });
    return res.data.files[0]?.id || null;
  }

  async uploadBackup(filePath) {
    const id = await this.findBackup();
    const media = { mimeType: 'application/x-sqlite3', body: fs.createReadStream(filePath) };
    if (id) await this.drive.files.update({ fileId: id, media });
    else await this.drive.files.create({ requestBody: { name: BACKUP_NAME, parents: [this.folderId] }, media });
  }

  async downloadBackup(filePath) {
    const id = await this.findBackup();
    if (!id) return false;
    await fs.promises.writeFile(filePath, await this.get(id));
    return true;
  }
}

const BACKUP_NAME = 'archive-database-backup.sqlite';

function create() {
  if (config.storage === 'gdrive') {
    const g = config.google;
    if (!g.clientId || !g.clientSecret || !g.refreshToken) {
      throw new Error('STORAGE=gdrive requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN');
    }
    return new DriveStorage(g);
  }
  return new LocalStorage(path.join(config.dataDir, 'files'));
}

module.exports = { create, LocalStorage, DriveStorage };
