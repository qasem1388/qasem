const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-test-'));
process.env.DATA_DIR = dataDir;
process.env.ADMIN_PASSWORD = 'admin-pass-123';
process.env.STORAGE = 'local';

const ExcelJS = require('exceljs');
const mammoth = require('mammoth');
const db = require('../server/db');
const auth = require('../server/auth');
const storageLib = require('../server/storage');
const { createApp } = require('../server/app');
const { normalize, ftsQuery } = require('../server/arabic');
const { addRtl } = require('../server/documents');

let server;
let base;

before(async () => {
  db.open();
  auth.ensureAdmin();
  const storage = storageLib.create();
  await storage.init();
  require('../server/jobs').start(storage);
  server = createApp({ storage }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  await require('../server/jobs').stop();
  server.close();
  db.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

function client() {
  let cookie = '';
  const call = async (p, { method = 'GET', json, form } = {}) => {
    const headers = { 'X-Requested-With': 'archive-app', cookie };
    let body;
    if (json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(json);
    } else if (form) body = form;
    const res = await fetch(base + p, { method, headers, body });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return res;
  };
  call.raw = (p, extra) => fetch(base + p, { headers: { cookie, ...extra } });
  call.json = async (p, opts) => {
    const res = await call(p, opts);
    return { status: res.status, body: await res.json() };
  };
  call.login = (username, password) => call.json('/login', { method: 'POST', json: { username, password } });
  return call;
}

function fileForm(name, content, fields = {}) {
  const form = new FormData();
  form.append('files', new Blob([content]), name);
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return form;
}

test('Arabic normalization unifies letter forms and diacritics', () => {
  assert.equal(normalize('أَحْمَد'), 'احمد');
  assert.equal(normalize('مدرسة'), 'مدرسه');
  assert.equal(normalize('مستشفى ١٢٣'), 'مستشفي 123');
  assert.equal(ftsQuery('الملفات'), '"ملفات"*');
  assert.equal(ftsQuery('  '), null);
  assert.equal(ftsQuery('a"b OR c'), '"a"* AND "b"* AND "or"* AND "c"*');
});

test('requests without a session or the app header are rejected', async () => {
  const anon = client();
  assert.equal((await anon('/files')).status, 401);
  const res = await fetch(base + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(res.status, 403);
  assert.equal((await anon.login('admin', 'wrong')).status, 401);
});

test('admin creates an employee who can log in; employees cannot manage users', async () => {
  const admin = client();
  assert.equal((await admin.login('admin', 'admin-pass-123')).status, 200);
  const created = await admin.json('/users', { method: 'POST', json: { username: 'sara', displayName: 'سارة', password: 'sara-pass-1' } });
  assert.equal(created.status, 201);
  assert.equal(created.body.user.role, 'employee');

  const sara = client();
  assert.equal((await sara.login('sara', 'sara-pass-1')).status, 200);
  assert.equal((await sara('/users')).status, 403);

  await admin.json(`/users/${created.body.user.id}`, { method: 'PATCH', json: { active: false } });
  assert.equal((await sara('/files')).status, 401, 'deactivated user loses access immediately');
  await admin.json(`/users/${created.body.user.id}`, { method: 'PATCH', json: { active: true } });
});

test('upload, search by name and content in Arabic, and download', async () => {
  const c = client();
  await c.login('admin', 'admin-pass-123');
  const up = await c.json('/files', {
    method: 'POST',
    form: fileForm('عقد الموظف أحمد.txt', 'هذا العقد يخص قسم المحاسبة'),
  });
  assert.equal(up.status, 201);
  const file = up.body.files[0];
  assert.equal(file.name, 'عقد الموظف أحمد.txt');

  for (const q of ['احمد', 'العقد', 'محاسبه', 'موظف']) {
    const { body } = await c.json('/files?q=' + encodeURIComponent(q));
    assert.ok(body.files.some((f) => f.id === file.id), `search "${q}" should find the file`);
  }
  const miss = await c.json('/files?q=' + encodeURIComponent('رواتب'));
  assert.ok(!miss.body.files.some((f) => f.id === file.id));

  const dl = await c(`/files/${file.id}/download`);
  assert.equal(await dl.text(), 'هذا العقد يخص قسم المحاسبة');
  assert.match(dl.headers.get('content-disposition'), /^attachment/);
});

test('editing a text file creates a new version and keeps the original', async () => {
  const c = client();
  await c.login('admin', 'admin-pass-123');
  const { body } = await c.json('/files', { method: 'POST', form: fileForm('ملاحظات.txt', 'الأصل') });
  const id = body.files[0].id;

  const edit = await c.json(`/files/${id}/edit`, { method: 'POST', json: { baseVersion: 1, content: 'بعد التعديل' } });
  assert.equal(edit.body.version, 2);
  assert.equal(await (await c(`/files/${id}/download`)).text(), 'بعد التعديل');
  assert.equal(await (await c(`/files/${id}/download?v=1`)).text(), 'الأصل');

  const stale = await c.json(`/files/${id}/edit`, { method: 'POST', json: { baseVersion: 1, content: 'قديم' } });
  assert.equal(stale.status, 409, 'saving over a newer version is refused');

  const restore = await c.json(`/files/${id}/restore`, { method: 'POST', json: { version: 1 } });
  assert.equal(restore.body.version, 3);
  assert.equal(await (await c(`/files/${id}/download`)).text(), 'الأصل');
  const { body: v } = await c.json(`/files/${id}/versions`);
  assert.deepEqual(v.versions.map((x) => x.version), [3, 2, 1]);
});

test('editing a Word document keeps Arabic text and right-to-left direction', async () => {
  const c = client();
  await c.login('admin', 'admin-pass-123');
  const htmlToDocx = require('html-to-docx');
  const original = await htmlToDocx('<p>تقرير الربع الأول</p>');
  const { body } = await c.json('/files', { method: 'POST', form: fileForm('تقرير.docx', original) });
  const id = body.files[0].id;

  const editable = await c.json(`/files/${id}/edit`);
  assert.equal(editable.body.kind, 'docx');
  assert.match(editable.body.html, /تقرير الربع الأول/);

  await c.json(`/files/${id}/edit`, { method: 'POST', json: { baseVersion: 1, html: '<h1>تقرير معدل</h1><p>نص <strong>عريض</strong></p>' } });
  const buf = Buffer.from(await (await c(`/files/${id}/download`)).arrayBuffer());
  const { value } = await mammoth.extractRawText({ buffer: buf });
  assert.match(value, /تقرير معدل/);
  assert.match(value, /عريض/);

  const found = await c.json('/files?q=' + encodeURIComponent('معدل'));
  assert.ok(found.body.files.some((f) => f.id === id), 'search index follows the new version');
});

test('addRtl marks Arabic paragraphs and runs as right-to-left', () => {
  const xml = '<w:p><w:pPr><w:spacing w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>مرحبا</w:t></w:r><w:r><w:rPr/><w:t>hi</w:t></w:r></w:p>';
  const out = addRtl(xml);
  assert.match(out, /<w:pPr><w:bidi\/><w:spacing/);
  assert.match(out, /<w:rPr><w:b\/><w:bCs\/><w:rtl\/><\/w:rPr><w:t>مرحبا/);
  assert.match(out, /<w:rPr\/><w:t>hi/, 'Latin runs are untouched');
  assert.equal(addRtl('<w:p><w:r><w:t>hello</w:t></w:r></w:p>'), '<w:p><w:r><w:t>hello</w:t></w:r></w:p>');
});

test('editing a spreadsheet changes only edited cells and keeps formulas', async () => {
  const c = client();
  await c.login('admin', 'admin-pass-123');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('الرواتب');
  ws.addRow(['الاسم', 'الراتب']);
  ws.addRow(['خالد', 5000]);
  ws.getCell('C2').value = { formula: 'B2*2', result: 10000 };
  ws.getCell('A1').font = { bold: true };
  const { body } = await c.json('/files', { method: 'POST', form: fileForm('رواتب.xlsx', Buffer.from(await wb.xlsx.writeBuffer())) });
  const id = body.files[0].id;

  const editable = await c.json(`/files/${id}/edit`);
  assert.equal(editable.body.kind, 'sheet');
  assert.equal(editable.body.sheets[0].rows[1][0], 'خالد');
  assert.deepEqual(editable.body.sheets[0].rows[1][2], { t: '10000', f: '=B2*2' });

  await c.json(`/files/${id}/edit`, {
    method: 'POST',
    json: { baseVersion: 1, changes: [{ sheet: 'الرواتب', r: 1, c: 1, v: '6000' }, { sheet: 'الرواتب', r: 2, c: 0, v: 'منى' }] },
  });
  const out = new ExcelJS.Workbook();
  await out.xlsx.load(Buffer.from(await (await c(`/files/${id}/download`)).arrayBuffer()));
  const s = out.getWorksheet('الرواتب');
  assert.equal(s.getCell('B2').value, 6000);
  assert.equal(s.getCell('A3').value, 'منى');
  assert.equal(s.getCell('C2').value.formula, 'B2*2');
  assert.equal(s.getCell('A1').font.bold, true, 'formatting of untouched cells is preserved');
});

test('deleted files leave the list and an admin can restore them', async () => {
  const c = client();
  await c.login('admin', 'admin-pass-123');
  const { body } = await c.json('/files', { method: 'POST', form: fileForm('مؤقت.txt', 'x') });
  const id = body.files[0].id;
  await c.json(`/files/${id}`, { method: 'DELETE' });
  assert.equal((await c(`/files/${id}`)).status, 404);
  const trash = await c.json('/admin/trash');
  assert.ok(trash.body.files.some((f) => f.id === id));
  await c.json(`/admin/trash/${id}/restore`, { method: 'POST' });
  assert.equal((await c(`/files/${id}`)).status, 200);
});

test('large files upload without a size limit and stream back with Range support', async () => {
  const c = client();
  await c.login('admin', 'admin-pass-123');
  const big = Buffer.alloc(80 * 1024 * 1024, 7); // أكبر من حد 50 ميغابايت في الإصدار السابق
  big.write('START', 0);
  const form = new FormData();
  form.append('files', new Blob([big], { type: 'video/mp4' }), 'مقطع الحفل.mp4');
  const up = await c.json('/files', { method: 'POST', form });
  assert.equal(up.status, 201);
  const id = up.body.files[0].id;
  assert.equal(up.body.files[0].size, big.length);

  const anon = await fetch(`${base}/files/${id}/download?inline=1`);
  assert.equal(anon.status, 401, 'downloads require a session');

  const ranged = await c.raw(`/files/${id}/download?inline=1`, { Range: 'bytes=0-4' });
  assert.equal(ranged.status, 206);
  assert.equal(ranged.headers.get('content-type'), 'video/mp4');
  assert.equal(await ranged.text(), 'START');

  const restore = await c.json(`/files/${id}/restore`, { method: 'POST', json: { version: 1 } });
  assert.equal(restore.body.version, 2);
  const tmpLeft = fs.readdirSync(path.join(dataDir, 'tmp'));
  assert.deepEqual(tmpLeft, [], 'temporary upload files are cleaned up');
});


test('notes are created as searchable, editable text files', async () => {
  const c = client();
  await c.login('admin', 'admin-pass-123');
  const { status, body } = await c.json('/notes', {
    method: 'POST',
    json: { title: 'اجتماع/الإدارة', content: 'تقرر تجديد عقد المورد', category: 'ملاحظات' },
  });
  assert.equal(status, 201);
  assert.equal(body.file.name, 'اجتماع الإدارة.txt');
  assert.equal(body.file.editable, 'text');
  const found = await c.json('/files?q=' + encodeURIComponent('المورد'));
  assert.ok(found.body.files.some((f) => f.id === body.file.id));
});

test('links are saved with their address and can be searched and changed', async () => {
  const c = client();
  await c.login('admin', 'admin-pass-123');
  const bad = await c.json('/links', { method: 'POST', json: { url: 'javascript:alert(1)' } });
  assert.equal(bad.status, 400);

  const { status, body } = await c.json('/links', { method: 'POST', json: { url: 'moe.gov.sa/ar', title: 'وزارة التعليم' } });
  assert.equal(status, 201);
  assert.equal(body.file.url, 'https://moe.gov.sa/ar');
  assert.equal(body.file.name, 'وزارة التعليم.url');
  const dl = await (await c(`/files/${body.file.id}/download`)).text();
  assert.match(dl, /URL=https:\/\/moe\.gov\.sa\/ar/);

  for (const q of ['التعليم', 'moe']) {
    const found = await c.json('/files?q=' + encodeURIComponent(q));
    assert.ok(found.body.files.some((f) => f.id === body.file.id), `search "${q}" finds the link`);
  }

  const changed = await c.json(`/files/${body.file.id}`, { method: 'PATCH', json: { url: 'https://moe.gov.sa/en' } });
  assert.equal(changed.status, 200);
  const { body: after } = await c.json(`/files/${body.file.id}`);
  assert.equal(after.file.url, 'https://moe.gov.sa/en');
  assert.equal(after.file.version, 2);

  await c.json(`/files/${body.file.id}/restore`, { method: 'POST', json: { version: 1 } });
  const { body: restored } = await c.json(`/files/${body.file.id}`);
  assert.equal(restored.file.url, 'https://moe.gov.sa/ar', 'restoring an old version restores its address');
});

test('share links let anyone download until they expire or are revoked', async () => {
  const c = client();
  await c.login('admin', 'admin-pass-123');
  const root = base.replace(/\/api$/, '');
  const { body } = await c.json('/files', { method: 'POST', form: fileForm('عرض <سعر>.txt', 'محتوى العرض') });
  const id = body.files[0].id;

  assert.equal((await c.json(`/files/${id}/shares`, { method: 'POST', json: { days: 3 } })).status, 400, 'only offered durations');
  const created = await c.json(`/files/${id}/shares`, { method: 'POST', json: { days: 7 } });
  assert.equal(created.status, 201);
  const { url, id: shareId } = created.body.share;
  assert.match(url, /\/s\/[\w-]{24}$/);
  const token = url.split('/s/')[1];

  // صفحة المشاركة تعمل بدون تسجيل دخول، والاسم فيها محمي من حقن HTML
  const page = await fetch(`${root}/s/${token}`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /og:title" content="عرض &lt;سعر&gt;.txt"/);
  assert.ok(!html.includes('<سعر>'));
  assert.equal(page.headers.get('x-robots-tag'), 'noindex, nofollow');

  const dl = await fetch(`${root}/s/${token}/download`);
  assert.equal(await dl.text(), 'محتوى العرض');
  assert.equal(created.body.share.downloads, 0);
  const { body: list } = await c.json(`/files/${id}/shares`);
  assert.equal(list.shares[0].downloads, 1);

  assert.equal((await fetch(`${root}/s/wrong-token/download`)).status, 404);

  await c.json(`/shares/${shareId}`, { method: 'DELETE' });
  assert.equal((await fetch(`${root}/s/${token}`)).status, 404, 'revoked link stops working');
  assert.equal((await fetch(`${root}/s/${token}/download`)).status, 404);

  const second = await c.json(`/files/${id}/shares`, { method: 'POST', json: { days: 1 } });
  const token2 = second.body.share.url.split('/s/')[1];
  db.get().prepare("UPDATE shares SET expires_at = datetime('now', '-1 minute') WHERE token = ?").run(token2);
  assert.equal((await fetch(`${root}/s/${token2}/download`)).status, 404, 'expired link stops working');

  const forever = await c.json(`/files/${id}/shares`, { method: 'POST', json: { days: 0 } });
  assert.equal(forever.body.share.expiresAt, null);
  await c.json(`/files/${id}`, { method: 'DELETE' });
  const token3 = forever.body.share.url.split('/s/')[1];
  assert.equal((await fetch(`${root}/s/${token3}`)).status, 404, 'deleting the file disables its links');
});
