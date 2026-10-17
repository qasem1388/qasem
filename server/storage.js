// مكان حفظ محتوى الملفات: Google Drive أو قرص الخادم.
// كل نسخة من كل ملف تُحفظ كملف مستقل، فلا تُستبدل النسخة الأصلية أبداً.

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

  async put(buffer) {
    const key = crypto.randomUUID();
    await fs.promises.writeFile(path.join(this.dir, key), buffer);
    return key;
  }

  async get(key) {
    if (!/^[\w-]+$/.test(key)) throw new Error('invalid storage key');
    return fs.promises.readFile(path.join(this.dir, key));
  }

  async remove(key) {
    await fs.promises.rm(path.join(this.dir, key), { force: true });
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

  async put(buffer, name, mime) {
    const res = await this.drive.files.create({
      requestBody: { name, parents: [this.folderId] },
      media: { mimeType: mime || 'application/octet-stream', body: Readable.from(buffer) },
      fields: 'id',
    });
    return res.data.id;
  }

  async get(key) {
    const res = await this.drive.files.get({ fileId: key, alt: 'media' }, { responseType: 'arraybuffer' });
    return Buffer.from(res.data);
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
