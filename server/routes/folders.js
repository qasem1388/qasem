// المجلدات: إنشاء وإعادة تسمية ونقل وحذف، وتحديد من يرى المجلدات الخاصة

const db = require('../db');
const index = require('../search-index');
const access = require('../access');

module.exports = function folderRoutes(api, ctx) {
  const { d, httpError, parseId, folderRow, visibleFolders } = ctx;

  const cleanName = (name) => {
    const n = String(name || '').replace(/[\\/\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
    if (!n) throw httpError(400, 'اكتب اسماً للمجلد');
    return n;
  };

  const canManage = (req, f) => req.user.role === 'admin' || f.created_by === req.user.id;

  function serialize(f, counts, members) {
    return {
      id: f.id,
      name: f.name,
      parentId: f.parent_id,
      restricted: !!f.restricted,
      members: members.get(f.id) || [],
      fileCount: counts.get(f.id) || 0,
      createdBy: f.created_by,
    };
  }

  // كل المجلدات التي يراها المستخدم (قائمة مسطحة، والواجهة تبني منها الشجرة)
  api.get('/folders', (req, res) => {
    const visible = visibleFolders(req);
    const rows = d.prepare('SELECT * FROM folders ORDER BY name COLLATE NOCASE').all().filter((f) => visible === null || visible.has(f.id));
    const counts = new Map(d.prepare('SELECT folder_id, COUNT(*) AS n FROM files WHERE deleted_at IS NULL AND folder_id IS NOT NULL GROUP BY folder_id').all().map((r) => [r.folder_id, r.n]));
    const members = new Map();
    if (req.user.role === 'admin') {
      for (const m of d.prepare('SELECT folder_id, user_id FROM folder_members').all()) {
        if (!members.has(m.folder_id)) members.set(m.folder_id, []);
        members.get(m.folder_id).push(m.user_id);
      }
    }
    res.json({ folders: rows.map((f) => serialize(f, counts, members)) });
  });

  api.post('/folders', (req, res) => {
    const b = req.body || {};
    const parentId = parseId(b.parentId);
    if (parentId != null) folderRow(req, parentId);
    const restricted = req.user.role === 'admin' && !!b.restricted;
    const r = d.prepare('INSERT INTO folders (name, parent_id, restricted, created_by) VALUES (?, ?, ?, ?)').run(cleanName(b.name), parentId, restricted ? 1 : 0, req.user.id);
    res.status(201).json({ folder: { id: Number(r.lastInsertRowid) } });
  });

  api.patch('/folders/:id', (req, res) => {
    const f = folderRow(req, req.params.id);
    if (!canManage(req, f)) throw httpError(403, 'يستطيع المدير أو منشئ المجلد فقط تعديله');
    const b = req.body || {};
    const name = b.name != null ? cleanName(b.name) : f.name;
    let parentId = f.parent_id;
    if (b.parentId !== undefined) {
      parentId = parseId(b.parentId);
      if (parentId != null) {
        folderRow(req, parentId);
        if (access.descendantIds(f.id).includes(parentId)) throw httpError(400, 'لا يمكن نقل المجلد إلى داخل نفسه');
      }
    }
    const isAdmin = req.user.role === 'admin';
    if ((b.restricted !== undefined || b.members !== undefined) && !isAdmin) throw httpError(403, 'المدير فقط يحدد صلاحيات المجلدات');
    db.transaction(() => {
      d.prepare('UPDATE folders SET name = ?, parent_id = ?, restricted = ? WHERE id = ?').run(
        name, parentId, b.restricted !== undefined ? (b.restricted ? 1 : 0) : f.restricted, f.id,
      );
      if (Array.isArray(b.members)) {
        d.prepare('DELETE FROM folder_members WHERE folder_id = ?').run(f.id);
        const add = d.prepare('INSERT OR IGNORE INTO folder_members (folder_id, user_id) VALUES (?, ?)');
        for (const uid of b.members.map(Number).filter(Boolean)) add.run(f.id, uid);
      }
    });
    // اسم المجلد جزء من فهرس البحث لكل ملفاته
    if (name !== f.name || parentId !== f.parent_id) {
      const ids = access.descendantIds(f.id);
      const files = d.prepare(`SELECT id FROM files WHERE folder_id IN (${ids.map(() => '?').join(',')})`).all(...ids);
      index.rebuildMany(files.map((r) => r.id));
    }
    res.json({ ok: true });
  });

  api.delete('/folders/:id', (req, res) => {
    const f = folderRow(req, req.params.id);
    if (!canManage(req, f)) throw httpError(403, 'يستطيع المدير أو منشئ المجلد فقط حذفه');
    if (d.prepare('SELECT 1 FROM folders WHERE parent_id = ?').get(f.id) || d.prepare('SELECT 1 FROM files WHERE folder_id = ? AND deleted_at IS NULL').get(f.id)) {
      throw httpError(400, 'المجلد ليس فارغاً. انقل ما بداخله أو احذفه أولاً');
    }
    db.transaction(() => {
      d.prepare('UPDATE files SET folder_id = NULL WHERE folder_id = ?').run(f.id);
      d.prepare('DELETE FROM folder_members WHERE folder_id = ?').run(f.id);
      d.prepare('DELETE FROM folders WHERE id = ?').run(f.id);
    });
    res.json({ ok: true });
  });
};
