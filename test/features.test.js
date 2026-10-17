// اختبارات المجلدات والصلاحيات والتكرار والرقم الأرشيفي والانتهاء والتصفية والصور المصغرة والمضغوط والنسخ الاحتياطي والتفريغ والذكاء الاصطناعي

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const http = require('node:http');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-features-'));
process.env.DATA_DIR = dataDir;
process.env.ADMIN_PASSWORD = 'admin-pass-123';
process.env.STORAGE = 'local';
process.env.OCR = '0'; // القراءة الضوئية تُختبر يدوياً لأنها بطيئة
delete process.env.ANTHROPIC_API_KEY;
delete process.env.ANTHROPIC_AUTH_TOKEN;

const JSZip = require('jszip');
const config = require('../server/config');
const db = require('../server/db');
const auth = require('../server/auth');
const jobs = require('../server/jobs');
const backup = require('../server/backup');
const storageLib = require('../server/storage');
const { createApp } = require('../server/app');

let server;
let base;
let root;
let mock;
const mockCalls = [];

before(async () => {
  db.open();
  auth.ensureAdmin();
  const storage = storageLib.create();
  await storage.init();
  jobs.start(storage);
  backup.start(storage);
  server = createApp({ storage }).listen(0);
  await new Promise((r) => server.once('listening', r));
  root = `http://127.0.0.1:${server.address().port}`;
  base = `${root}/api`;

  // خادم وهمي يقوم مقام خدمة التفريغ وواجهة Claude
  mock = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    mockCalls.push({ url: req.url, headers: req.headers, body });
    res.setHeader('Content-Type', 'application/json');
    if (req.url.startsWith('/transcribe')) {
      return res.end(JSON.stringify({
        text: 'مرحبا بكم في حفل التخرج',
        segments: [
          { start: 0, end: 2.5, text: 'مرحبا بكم' },
          { start: 2.5, end: 5, text: 'في حفل التخرج السنوي' },
        ],
      }));
    }
    if (req.url.startsWith('/v1/messages')) {
      return res.end(JSON.stringify({
        id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'end_turn',
        content: [{ type: 'text', text: JSON.stringify({ category: 'عقود', tags: ['#توظيف', 'عقد عمل', 'توظيف'], description: 'عقد عمل لموظف جديد.' }) }],
        usage: { input_tokens: 10, output_tokens: 10 },
      }));
    }
    res.statusCode = 404;
    res.end('{}');
  }).listen(0);
  await new Promise((r) => mock.once('listening', r));
});

after(async () => {
  await jobs.stop();
  backup.stop();
  server.close();
  mock.close();
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
  call.json = async (p, opts) => {
    const res = await call(p, opts);
    return { status: res.status, body: await res.json() };
  };
  call.raw = (p) => fetch(root + p, { headers: { cookie } });
  call.login = (u, pw) => call.json('/login', { method: 'POST', json: { username: u, password: pw } });
  return call;
}

function form(files, fields = {}) {
  const f = new FormData();
  for (const [name, content, type] of files) f.append('files', new Blob([content], type ? { type } : {}), name);
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

const names = (body) => body.files.map((f) => f.name).sort();

let admin;
let sara;
let saraId;

test('setup: admin and an employee', async () => {
  admin = client();
  await admin.login('admin', 'admin-pass-123');
  const u = await admin.json('/users', { method: 'POST', json: { username: 'sara', displayName: 'سارة أحمد', password: 'sara-pass-1' } });
  saraId = u.body.user.id;
  sara = client();
  assert.equal((await sara.login('sara', 'sara-pass-1')).status, 200);
});

test('folders organize files, and private folders are hidden from non-members', async () => {
  const pub = await admin.json('/folders', { method: 'POST', json: { name: 'حملة رمضان 2026' } });
  const videos = await admin.json('/folders', { method: 'POST', json: { name: 'فيديوهات', parentId: pub.body.folder.id } });
  const hr = await admin.json('/folders', { method: 'POST', json: { name: 'الرواتب', restricted: true } });
  const hrSub = await admin.json('/folders', { method: 'POST', json: { name: 'أكتوبر', parentId: hr.body.folder.id } });

  await admin.json('/files', { method: 'POST', form: form([['إعلان.txt', 'إعلان الحملة']], { folderId: videos.body.folder.id }) });
  const secret = await admin.json('/files', { method: 'POST', form: form([['كشف الرواتب.txt', 'راتب سري']], { folderId: hrSub.body.folder.id }) });
  const secretId = secret.body.files[0].id;

  const inFolder = await sara.json(`/files?folder=${videos.body.folder.id}`);
  assert.deepEqual(names(inFolder.body), ['إعلان.txt']);
  assert.deepEqual(inFolder.body.files[0].folderPath.map((p) => p.name), ['حملة رمضان 2026', 'فيديوهات']);

  // البحث باسم المجلد يجد ملفاته
  const byFolderName = await sara.json('/files?q=' + encodeURIComponent('رمضان'));
  assert.deepEqual(names(byFolderName.body), ['إعلان.txt']);

  // سارة ليست عضواً في مجلد الرواتب: لا تراه ولا ما بداخله، حتى المجلد الفرعي
  const saraFolders = (await sara.json('/folders')).body.folders.map((f) => f.name);
  assert.ok(!saraFolders.includes('الرواتب') && !saraFolders.includes('أكتوبر'));
  assert.ok(!names((await sara.json('/files?q=' + encodeURIComponent('راتب'))).body).includes('كشف الرواتب.txt'));
  assert.equal((await sara(`/files/${secretId}/download`)).status, 404);
  assert.equal((await sara(`/files?folder=${hrSub.body.folder.id}`)).status, 404);
  assert.equal((await sara.json('/folders', { method: 'POST', json: { name: 'x', parentId: hr.body.folder.id } })).status, 404);
  assert.equal((await sara.json(`/folders/${hr.body.folder.id}`, { method: 'PATCH', json: { restricted: false } })).status, 404);

  // بعد إضافتها عضواً تراه
  await admin.json(`/folders/${hr.body.folder.id}`, { method: 'PATCH', json: { members: [saraId] } });
  assert.equal((await sara(`/files/${secretId}/download`)).status, 200);
  await admin.json(`/folders/${hr.body.folder.id}`, { method: 'PATCH', json: { members: [] } });

  // نقل ملف بين المجلدات، ومنع حذف مجلد غير فارغ
  const moved = await admin.json('/files/move', { method: 'POST', json: { ids: [secretId], folderId: hr.body.folder.id } });
  assert.equal(moved.body.moved, 1);
  assert.equal((await admin.json(`/folders/${hr.body.folder.id}`, { method: 'DELETE' })).status, 400);
  assert.equal((await admin.json(`/folders/${hrSub.body.folder.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await admin.json(`/folders/${pub.body.folder.id}`, { method: 'PATCH', json: { parentId: videos.body.folder.id } })).status, 400, 'no cycles');
});

test('identical files are detected by content, even under a different name', async () => {
  const first = await sara.json('/files', { method: 'POST', form: form([['تقرير.txt', 'محتوى متطابق تماماً']]) });
  assert.equal(first.status, 201);
  const again = await sara.json('/files', { method: 'POST', form: form([['نسخة من التقرير.txt', 'محتوى متطابق تماماً'], ['جديد.txt', 'شيء آخر']]) });
  assert.deepEqual(names(again.body), ['جديد.txt']);
  assert.equal(again.body.skipped.length, 1);
  assert.equal(again.body.skipped[0].existing.name, 'تقرير.txt');

  const check = await sara.json('/files/check', { method: 'POST', json: { files: [{ name: 'تقرير.txt', size: Buffer.byteLength('محتوى متطابق تماماً') }, { name: 'x', size: 1 }] } });
  assert.equal(check.body.matches.length, 1);

  const kept = await sara.json('/files', { method: 'POST', form: form([['نسخة مقصودة.txt', 'محتوى متطابق تماماً']], { duplicates: 'keep' }) });
  assert.equal(kept.body.files.length, 1);
  const dups = await admin.json('/admin/duplicates');
  assert.ok(dups.body.groups.some((g) => g.length === 2));
});

test('every item gets a sequential archive number that can be searched', async () => {
  const { body } = await admin.json('/files', { method: 'POST', form: form([['أ.txt', 'a1'], ['ب.txt', 'b2']]) });
  const [a, b] = body.files.map((f) => f.archiveNo);
  const year = new Date().getFullYear();
  assert.match(a, new RegExp(`^ARC-${year}-\\d{4}$`));
  assert.equal(Number(b.slice(-4)), Number(a.slice(-4)) + 1);
  const found = await admin.json('/files?q=' + encodeURIComponent(b));
  assert.deepEqual(names(found.body), ['ب.txt']);
});

test('expiry dates raise reminders and can be filtered', async () => {
  const soon = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
  const past = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const far = new Date(Date.now() + 200 * 86_400_000).toISOString().slice(0, 10);
  await admin.json('/files', { method: 'POST', form: form([['رخصة البلدية.txt', 'r1']], { expiresOn: soon }) });
  await admin.json('/files', { method: 'POST', form: form([['إقامة منتهية.txt', 'r2']], { expiresOn: past }) });
  const farFile = await admin.json('/files', { method: 'POST', form: form([['عقد طويل.txt', 'r3']], { expiresOn: far }) });
  assert.equal(farFile.body.files[0].expiry, 'ok');

  const expiring = await admin.json('/expiring');
  assert.deepEqual(names(expiring.body), ['إقامة منتهية.txt', 'رخصة البلدية.txt']);
  assert.deepEqual(names((await admin.json('/files?expiry=expired')).body), ['إقامة منتهية.txt']);
  assert.equal((await admin.json('/files?expiry=soon')).body.files[0].daysLeft, 10);
  assert.equal((await admin.json('/files', { method: 'POST', form: form([['x.txt', 'bad date']], { expiresOn: '2026-13-40' }) })).status, 400);
});

test('filter by employee (also by searching their name) and by file type', async () => {
  await sara.json('/files', { method: 'POST', form: form([['عرض سعر.pdf', '%PDF-fake'], ['خطاب.docx', 'fake-docx'], ['ميزانية.xlsx', 'fake-xlsx']]) });
  const bySara = await admin.json(`/files?uploader=${saraId}`);
  assert.ok(bySara.body.files.length >= 4 && bySara.body.files.every((f) => f.createdBy === 'سارة أحمد'));

  const byName = await admin.json('/files?q=' + encodeURIComponent('ساره'));
  assert.deepEqual(names(byName.body), names(bySara.body), 'searching an employee name finds their uploads');

  assert.deepEqual(names((await admin.json('/files?type=pdf')).body), ['عرض سعر.pdf']);
  assert.deepEqual(names((await admin.json('/files?type=word')).body), ['خطاب.docx']);
  assert.deepEqual(names((await admin.json(`/files?type=excel&uploader=${saraId}`)).body), ['ميزانية.xlsx']);
  const meta = await admin.json('/meta');
  assert.equal(meta.body.types.find((t) => t.key === 'pdf').label, 'PDF');
  assert.ok(meta.body.types.every((t) => /^#[0-9a-f]{6}$/i.test(t.color)));

  const uploaders = await admin.json('/uploaders');
  assert.ok(uploaders.body.uploaders.some((u) => u.name === 'سارة أحمد'));
});

test('images and videos get thumbnails', async (t) => {
  const sharp = require('sharp');
  const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#d0386b' } }).png().toBuffer();
  const img = await admin.json('/files', { method: 'POST', form: form([['صورة.png', png, 'image/png']]) });
  assert.ok(img.body.files[0].thumb);
  const thumb = await admin(img.body.files[0].thumb.replace('/api', ''));
  assert.equal(thumb.headers.get('content-type'), 'image/webp');
  const meta = await sharp(Buffer.from(await thumb.arrayBuffer())).metadata();
  assert.equal(meta.width, 480);

  const ffmpeg = require('ffmpeg-static');
  const video = path.join(dataDir, 'clip.mp4');
  execFileSync(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc=duration=2:size=320x240:rate=10', '-pix_fmt', 'yuv420p', '-y', video]);
  const vid = await admin.json('/files', { method: 'POST', form: form([['مقطع.mp4', fs.readFileSync(video), 'video/mp4']]) });
  assert.ok(vid.body.files[0].thumb, 'video frame thumbnail');
  t.diagnostic(`video thumb: ${vid.body.files[0].thumb}`);
});

test('several files download together as one zip', async () => {
  const { body } = await admin.json('/files', { method: 'POST', form: form([['ملف1.txt', 'one'], ['ملف2.txt', 'two']]) });
  const ids = body.files.map((f) => f.id).join(',');
  const res = await admin(`/zip?ids=${ids}`);
  assert.equal(res.headers.get('content-type'), 'application/zip');
  const zip = await JSZip.loadAsync(Buffer.from(await res.arrayBuffer()));
  assert.deepEqual(Object.keys(zip.files).sort(), ['ملف1.txt', 'ملف2.txt']);
  assert.equal(await zip.file('ملف2.txt').async('string'), 'two');
});

test('QR code and printable label point to the file', async () => {
  const { body } = await admin.json('/files', { method: 'POST', form: form([['عقد إيجار.txt', 'qr']]) });
  const f = body.files[0];
  const svg = await (await admin(`/files/${f.id}/qr.svg`)).text();
  assert.match(svg, /^<svg/);
  const label = await admin.raw(`/label/${f.id}`);
  const html = await label.text();
  assert.ok(html.includes(f.archiveNo) && html.includes('عقد إيجار.txt'));
  assert.equal((await fetch(`${root}/label/${f.id}`)).status, 401, 'label needs a login');
});

test('backup copies the database and every stored file', async () => {
  const before = fs.readdirSync(path.join(dataDir, 'files')).length;
  const { body } = await admin.json('/admin/backup', { method: 'POST', json: {} });
  assert.equal(body.backup.lastOk, true, body.backup.lastMessage);
  const dbCopies = fs.readdirSync(path.join(config.backup.dir, 'database'));
  assert.equal(dbCopies.length, 1);
  assert.equal(fs.readdirSync(path.join(config.backup.dir, 'files')).length, before);
  assert.equal((await sara.json('/admin/backup', { method: 'POST', json: {} })).status, 403);
});

test('admin statistics summarize the archive', async () => {
  const { body } = await admin.json('/admin/stats');
  assert.ok(body.totals.files > 10);
  assert.ok(body.byType.find((t) => t.key === 'note').count > 5);
  assert.ok(body.byUploader.find((u) => u.name === 'سارة أحمد').count >= 4);
  assert.equal(body.perDay.at(-1).day, new Date().toISOString().slice(0, 10));
  assert.equal((await sara.json('/admin/stats')).status, 403);
});

test('spoken words in videos become searchable with timestamps', async () => {
  config.transcribe.url = `http://127.0.0.1:${mock.address().port}/transcribe`;
  config.transcribe.key = 'test-key';
  const ffmpeg = require('ffmpeg-static');
  const audio = path.join(dataDir, 'speech.mp3');
  execFileSync(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-y', audio]);
  const up = await admin.json('/files', { method: 'POST', form: form([['كلمة الحفل.mp3', fs.readFileSync(audio), 'audio/mpeg']]) });
  await jobs.drain();

  const call = mockCalls.find((c) => c.url.startsWith('/transcribe'));
  assert.equal(call.headers.authorization, 'Bearer test-key');
  assert.match(call.body.toString('latin1'), /name="response_format"\r\n\r\nverbose_json/);

  const found = await admin.json('/files?q=' + encodeURIComponent('التخرج'));
  const hit = found.body.files.find((f) => f.id === up.body.files[0].id);
  assert.ok(hit, 'found by spoken word');
  assert.deepEqual(hit.transcriptHits.map((s) => s.start), [2.5]);
  config.transcribe.url = null;
});

test('AI suggests category, tags and description; auto-tagging fills only empty fields', async () => {
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${mock.address().port}`;
  process.env.ANTHROPIC_API_KEY = 'test-key';
  config.ai.enabled = true;

  const { body } = await admin.json('/files', { method: 'POST', form: form([['عقد موظف.txt', 'عقد عمل بين الشركة والموظف'], ['مصنف.txt', 'نص']], {}) });
  await jobs.drain();
  const auto = (await admin.json(`/files/${body.files[0].id}`)).body.file;
  assert.equal(auto.category, 'عقود');
  assert.equal(auto.tags, 'توظيف، عقد عمل');

  const kept = await admin.json('/files', { method: 'POST', form: form([['ملف مصنف.txt', 'abc']], { category: 'تسويق' }) });
  await jobs.drain();
  assert.equal((await admin.json(`/files/${kept.body.files[0].id}`)).body.file.category, 'تسويق', 'user-entered category is kept');

  const s = await admin.json(`/files/${body.files[0].id}/suggest`, { method: 'POST', json: {} });
  assert.deepEqual(s.body.suggestion, { category: 'عقود', tags: ['توظيف', 'عقد عمل'], description: 'عقد عمل لموظف جديد.' });

  const req = JSON.parse(mockCalls.findLast((c) => c.url.startsWith('/v1/messages')).body);
  assert.equal(req.model, 'claude-opus-5-5');
  assert.equal(req.fallbacks, 'default');
  assert.equal(req.output_config.format.type, 'json_schema');
  assert.match(mockCalls.findLast((c) => c.url.startsWith('/v1/messages')).headers['anthropic-beta'], /server-side-fallback-2026-07-01/);
  config.ai.enabled = false;
});
