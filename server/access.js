// من يرى أي مجلد: المجلد الخاص يراه المدير وأعضاؤه فقط، وتسري خصوصيته على المجلدات التي بداخله

const db = require('./db');

function allFolders() {
  return new Map(db.get().prepare('SELECT * FROM folders').all().map((f) => [f.id, f]));
}

function memberships(userId) {
  return new Set(db.get().prepare('SELECT folder_id FROM folder_members WHERE user_id = ?').all(userId).map((r) => r.folder_id));
}

// مجموعة المجلدات المرئية للمستخدم، أو null للمدير (يرى كل شيء)
function visibleFolderIds(user) {
  if (user.role === 'admin') return null;
  const folders = allFolders();
  const member = memberships(user.id);
  const cache = new Map();
  const visible = (id, depth = 0) => {
    if (cache.has(id)) return cache.get(id);
    const f = folders.get(id);
    let ok = !!f && depth < 50 && (!f.restricted || member.has(id));
    if (ok && f.parent_id) ok = visible(f.parent_id, depth + 1);
    cache.set(id, ok);
    return ok;
  };
  return new Set([...folders.keys()].filter((id) => visible(id)));
}

function canSeeFolder(user, folderId, visible = visibleFolderIds(user)) {
  return folderId == null || visible === null || visible.has(folderId);
}

// شرط SQL يحصر الملفات في المجلدات التي يراها المستخدم
function fileVisibility(user, column = 'f.folder_id') {
  const visible = visibleFolderIds(user);
  if (visible === null) return { sql: '1', params: [] };
  const ids = [...visible];
  return {
    sql: ids.length ? `(${column} IS NULL OR ${column} IN (${ids.map(() => '?').join(',')}))` : `${column} IS NULL`,
    params: ids,
  };
}

function folderPath(folderId, folders = allFolders()) {
  const path = [];
  for (let id = folderId, i = 0; id && i < 50; i++) {
    const f = folders.get(id);
    if (!f) break;
    path.unshift({ id: f.id, name: f.name });
    id = f.parent_id;
  }
  return path;
}

function descendantIds(folderId, folders = allFolders()) {
  const out = [folderId];
  for (let i = 0; i < out.length; i++) {
    for (const f of folders.values()) if (f.parent_id === out[i]) out.push(f.id);
  }
  return out;
}

module.exports = { visibleFolderIds, canSeeFolder, fileVisibility, folderPath, descendantIds, allFolders };
