// لوحة المدير: الموظفون، المحذوفات، سجل النشاط، الإحصائيات، النسخ الاحتياطي، الملفات المكررة

const auth = require('../auth');
const index = require('../search-index');
const backup = require('../backup');
const access = require('../access');
const { TYPES, typeOf } = require('../filetypes');

module.exports = function adminRoutes(api, ctx) {
  const { d, log, httpError, FILE_SELECT, serializeFile } = ctx;
  const admin = auth.requireAdmin;

  api.get('/admin/activity', admin, (req, res) => {
    const rows = d
      .prepare('SELECT a.action, a.detail, a.created_at, u.display_name AS by, f.name AS file FROM activity a LEFT JOIN users u ON u.id = a.user_id LEFT JOIN files f ON f.id = a.file_id ORDER BY a.id DESC LIMIT 300')
      .all();
    res.json({ activity: rows });
  });

  api.get('/admin/trash', admin, (req, res) => {
    const rows = d.prepare(`${FILE_SELECT} WHERE f.deleted_at IS NOT NULL ORDER BY f.deleted_at DESC`).all();
    const folders = access.allFolders();
    res.json({ files: rows.map((r) => serializeFile(r, folders)) });
  });

  api.post('/admin/trash/:id/restore', admin, (req, res) => {
    const r = d.prepare('UPDATE files SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL').run(Number(req.params.id));
    if (!r.changes) throw httpError(404, 'الملف غير موجود في المحذوفات');
    log(req.user.id, Number(req.params.id), 'undelete');
    res.json({ ok: true });
  });

  // ---------- الموظفون ----------

  api.get('/users', admin, (req, res) => {
    res.json({ users: d.prepare('SELECT * FROM users ORDER BY id').all().map(auth.publicUser) });
  });

  // قائمة مختصرة بالأسماء لاختيار أعضاء المجلدات الخاصة
  api.get('/users/names', (req, res) => {
    res.json({ users: d.prepare('SELECT id, display_name AS name FROM users WHERE active = 1 ORDER BY display_name').all() });
  });

  api.post('/users', admin, (req, res) => {
    const { username, displayName, password, role } = req.body || {};
    const name = String(username || '').trim();
    if (!/^[\p{L}\p{N}._-]{3,32}$/u.test(name)) throw httpError(400, 'اسم المستخدم يجب أن يكون 3 إلى 32 حرفاً بدون مسافات');
    auth.validatePassword(password);
    if (d.prepare('SELECT 1 FROM users WHERE username = ?').get(name)) throw httpError(409, 'اسم المستخدم مستخدم مسبقاً');
    const r = d.prepare('INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)').run(
      name, String(displayName || name).trim(), auth.hashPassword(password), role === 'admin' ? 'admin' : 'employee',
    );
    res.status(201).json({ user: auth.publicUser(d.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid)) });
  });

  api.patch('/users/:id', admin, (req, res) => {
    const u = d.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
    if (!u) throw httpError(404, 'المستخدم غير موجود');
    const b = req.body || {};
    if (u.id === req.user.id && (b.active === false || (b.role && b.role !== 'admin'))) {
      throw httpError(400, 'لا يمكنك إيقاف حسابك أو إزالة صلاحية المدير عن نفسك');
    }
    if (b.password) auth.validatePassword(b.password);
    const displayName = b.displayName != null ? String(b.displayName).trim() || u.display_name : u.display_name;
    d.prepare('UPDATE users SET display_name = ?, role = ?, active = ?, password_hash = ? WHERE id = ?').run(
      displayName,
      b.role === 'admin' || b.role === 'employee' ? b.role : u.role,
      b.active != null ? (b.active ? 1 : 0) : u.active,
      b.password ? auth.hashPassword(b.password) : u.password_hash,
      u.id,
    );
    // اسم الموظف يُبحث به، فنحدّث فهرس ملفاته عند تغييره
    if (displayName !== u.display_name) index.rebuildMany(d.prepare('SELECT id FROM files WHERE created_by = ?').all(u.id).map((r) => r.id));
    res.json({ user: auth.publicUser(d.prepare('SELECT * FROM users WHERE id = ?').get(u.id)) });
  });

  // ---------- الإحصائيات ----------

  api.get('/admin/stats', admin, (req, res) => {
    const files = d.prepare('SELECT name, size, created_by, created_at FROM files WHERE deleted_at IS NULL').all();
    const byType = new Map(TYPES.map((t) => [t.key, { key: t.key, label: t.label, color: t.color, count: 0, size: 0 }]));
    for (const f of files) {
      const t = byType.get(typeOf(f.name).key);
      t.count++;
      t.size += f.size;
    }
    const totals = {
      files: files.length,
      size: files.reduce((s, f) => s + f.size, 0),
      storage: d.prepare('SELECT COALESCE(SUM(size), 0) AS s FROM versions').get().s,
      versions: d.prepare('SELECT COUNT(*) AS n FROM versions').get().n,
      folders: d.prepare('SELECT COUNT(*) AS n FROM folders').get().n,
      users: d.prepare('SELECT COUNT(*) AS n FROM users WHERE active = 1').get().n,
      shares: d.prepare("SELECT COUNT(*) AS n FROM shares WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > datetime('now'))").get().n,
      expired: d.prepare("SELECT COUNT(*) AS n FROM files WHERE deleted_at IS NULL AND expires_on < date('now')").get().n,
      expiringSoon: d.prepare("SELECT COUNT(*) AS n FROM files WHERE deleted_at IS NULL AND expires_on >= date('now') AND expires_on <= date('now', '+' || remind_days || ' days')").get().n,
    };
    const byUploader = d
      .prepare(`SELECT u.id, u.display_name AS name, COUNT(f.id) AS count, COALESCE(SUM(f.size), 0) AS size, MAX(f.created_at) AS lastAt
        FROM users u LEFT JOIN files f ON f.created_by = u.id AND f.deleted_at IS NULL GROUP BY u.id ORDER BY count DESC`)
      .all();
    const perDay = d
      .prepare(`SELECT date(created_at) AS day, COUNT(*) AS count FROM activity WHERE action IN ('upload', 'note', 'link')
        AND created_at >= datetime('now', '-29 days') GROUP BY day ORDER BY day`)
      .all();
    const jobs = d.prepare('SELECT kind, status, COUNT(*) AS count FROM jobs GROUP BY kind, status').all();
    res.json({ totals, byType: [...byType.values()].filter((t) => t.count), byUploader, perDay, jobs });
  });

  // ---------- النسخ الاحتياطي ----------

  api.get('/admin/backup', admin, (req, res) => res.json({ backup: backup.status() }));

  api.post('/admin/backup', admin, async (req, res) => {
    await backup.backupNow();
    res.json({ backup: backup.status() });
  });

  // ---------- الملفات المكررة ----------

  api.get('/admin/duplicates', admin, (req, res) => {
    const groups = d
      .prepare(`SELECT v.hash, GROUP_CONCAT(DISTINCT f.id) AS ids FROM versions v JOIN files f ON f.id = v.file_id AND v.version_no = f.current_version
        WHERE f.deleted_at IS NULL AND v.hash IS NOT NULL GROUP BY v.hash HAVING COUNT(DISTINCT f.id) > 1`)
      .all();
    const folders = access.allFolders();
    const get = d.prepare(`${FILE_SELECT} WHERE f.id = ?`);
    res.json({
      groups: groups.map((g) => g.ids.split(',').map((id) => serializeFile(get.get(Number(id)), folders))),
    });
  });
};
