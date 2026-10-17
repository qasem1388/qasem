// تنزيل عدة ملفات دفعة واحدة كملف مضغوط، يُبنى أثناء التنزيل دون تخزينه على الخادم

const { ZipArchive } = require('archiver');
const { create: contentDisposition } = require('content-disposition');

module.exports = function zipRoutes(api, ctx) {
  const { d, log, httpError, fileRow, versionRow, storage, folderRow, parseId } = ctx;

  api.get('/zip', async (req, res) => {
    const ids = String(req.query.ids || '').split(',').map(Number).filter(Boolean).slice(0, 500);
    if (!ids.length) throw httpError(400, 'لم يتم اختيار أي ملف');
    const files = ids.map((id) => fileRow(req, id));
    const folder = parseId(req.query.folder) != null ? folderRow(req, parseId(req.query.folder)) : null;
    const zipName = `${folder ? folder.name : 'ملفات الأرشيف'} - ${new Date().toISOString().slice(0, 10)}.zip`;

    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', contentDisposition(zipName));
    res.set('Cache-Control', 'private, no-store');

    // الصور والفيديو مضغوطة أصلاً، فضغط خفيف يكفي ويجعل التنزيل يبدأ فوراً
    const zip = new ZipArchive({ zlib: { level: 1 } });
    zip.on('warning', (err) => console.warn('zip:', err.message));
    zip.on('error', (err) => res.destroy(err));
    zip.pipe(res);

    const used = new Set();
    const unique = (name) => {
      let n = name;
      for (let i = 2; used.has(n.toLowerCase()); i++) n = name.replace(/(\.[^.]*)?$/, ` (${i})$1`);
      used.add(n.toLowerCase());
      return n;
    };
    for (const f of files) {
      const v = versionRow(f.id, f.current_version);
      const name = unique(f.name);
      if (storage.localPath) zip.file(storage.localPath(v.storage_key), { name });
      else zip.append((await storage.openStream(v.storage_key)).stream, { name });
      log(req.user.id, f.id, 'download', 'ضمن ملف مضغوط');
    }
    await zip.finalize();
  });
};
