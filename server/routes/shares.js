// روابط المشاركة العامة (واتساب وغيره): إنشاؤها وإيقافها، والصفحة التي يفتحها المستلم دون حساب

const crypto = require('node:crypto');
const { sharePage, expiredPage } = require('../share-page');

module.exports = function shareRoutes(api, app, ctx) {
  const { d, log, httpError, fileRow, versionRow, sendStored, isNewDownload, publicBase, INLINE_MIME, SHARE_DAYS } = ctx;

  const serializeShare = (req, s) => ({
    id: s.id,
    url: `${publicBase(req)}/s/${s.token}`,
    createdAt: s.created_at,
    createdBy: s.by,
    expiresAt: s.expires_at,
    downloads: s.downloads,
  });

  api.post('/files/:id/shares', (req, res) => {
    const f = fileRow(req, req.params.id);
    const days = Number(req.body?.days ?? 7);
    if (!SHARE_DAYS.has(days)) throw httpError(400, 'مدة الرابط غير صحيحة');
    const token = crypto.randomBytes(18).toString('base64url');
    const r = d
      .prepare(`INSERT INTO shares (token, file_id, created_by, expires_at) VALUES (?, ?, ?, ${days ? "datetime('now', ?)" : 'NULL'})`)
      .run(...[token, f.id, req.user.id, ...(days ? [`+${days} days`] : [])]);
    log(req.user.id, f.id, 'share', days ? `رابط لمدة ${days} يوم` : 'رابط بدون انتهاء');
    const share = d.prepare('SELECT * FROM shares WHERE id = ?').get(r.lastInsertRowid);
    res.status(201).json({ share: serializeShare(req, { ...share, by: req.user.display_name }) });
  });

  api.get('/files/:id/shares', (req, res) => {
    const f = fileRow(req, req.params.id);
    const rows = d
      .prepare(`SELECT s.*, u.display_name AS by FROM shares s LEFT JOIN users u ON u.id = s.created_by
        WHERE s.file_id = ? AND s.revoked_at IS NULL AND (s.expires_at IS NULL OR s.expires_at > datetime('now')) ORDER BY s.id DESC`)
      .all(f.id);
    res.json({ shares: rows.map((s) => serializeShare(req, s)) });
  });

  api.delete('/shares/:id', (req, res) => {
    const s = d.prepare('SELECT * FROM shares WHERE id = ? AND revoked_at IS NULL').get(Number(req.params.id));
    if (!s) throw httpError(404, 'الرابط غير موجود');
    fileRow(req, s.file_id);
    d.prepare("UPDATE shares SET revoked_at = datetime('now') WHERE id = ?").run(s.id);
    log(req.user.id, s.file_id, 'unshare');
    res.json({ ok: true });
  });

  const activeShare = (token) =>
    d.prepare(`SELECT s.id AS share_id, s.expires_at, f.* FROM shares s JOIN files f ON f.id = s.file_id
      WHERE s.token = ? AND s.revoked_at IS NULL AND f.deleted_at IS NULL
      AND (s.expires_at IS NULL OR s.expires_at > datetime('now'))`).get(String(token));

  const shareHeaders = (res) => {
    res.set('X-Robots-Tag', 'noindex, nofollow');
    res.set('Referrer-Policy', 'no-referrer');
  };

  app.get('/s/:token', (req, res) => {
    shareHeaders(res);
    const f = activeShare(req.params.token);
    res.set('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'");
    res.set('Cache-Control', 'no-store');
    if (!f) return res.status(404).type('html').send(expiredPage());
    res.type('html').send(sharePage({ file: f, token: req.params.token, expiresAt: f.expires_at }));
  });

  app.get('/s/:token/download', async (req, res) => {
    shareHeaders(res);
    const f = activeShare(req.params.token);
    if (!f) return res.status(404).type('html').send(expiredPage());
    const v = versionRow(f.id, f.current_version);
    const inline = req.query.inline === '1' && INLINE_MIME.test(v.mime);
    if (isNewDownload(req, inline)) {
      d.prepare('UPDATE shares SET downloads = downloads + 1 WHERE id = ?').run(f.share_id);
      log(null, f.id, 'share_download');
    }
    await sendStored(req, res, v, f.name, inline);
  });
};
