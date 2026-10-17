// فهرس البحث: بيانات الملف (الاسم، الوسوم، الرقم الأرشيفي، اسم من رفعه، اسم المجلد) + نصوصه من كل المصادر

const db = require('./db');
const { indexText } = require('./arabic');
const { folderPath } = require('./access');

const MAX_INDEX_CHARS = 1_000_000;

function setText(fileId, source, text) {
  const d = db.get();
  if (text && text.trim()) {
    d.prepare('INSERT INTO file_text (file_id, source, text) VALUES (?, ?, ?) ON CONFLICT(file_id, source) DO UPDATE SET text = excluded.text')
      .run(fileId, source, text.slice(0, MAX_INDEX_CHARS));
  } else {
    d.prepare('DELETE FROM file_text WHERE file_id = ? AND source = ?').run(fileId, source);
  }
}

function rebuild(fileId) {
  const d = db.get();
  const f = d.prepare('SELECT f.*, u.display_name AS uploader FROM files f LEFT JOIN users u ON u.id = f.created_by WHERE f.id = ?').get(fileId);
  if (!f) return;
  const folders = folderPath(f.folder_id).map((p) => p.name);
  const meta = indexText([f.name, f.category, f.tags, f.description, f.url, f.archive_no, f.uploader, ...folders].join(' '));
  const content = d.prepare('SELECT text FROM file_text WHERE file_id = ?').all(fileId).map((r) => r.text).join('\n');
  d.prepare('DELETE FROM files_fts WHERE rowid = ?').run(fileId);
  d.prepare('INSERT INTO files_fts (rowid, meta, content) VALUES (?, ?, ?)').run(fileId, meta, indexText(content));
}

function rebuildMany(ids) {
  for (const id of ids) rebuild(id);
}

module.exports = { setText, rebuild, rebuildMany };
