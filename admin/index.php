<?php
// لوحة تحكم «قاسم للتطوير الرقمي» — إضافة وتعديل وحذف الأعمال المعروضة في الموقع
declare(strict_types=1);

session_set_cookie_params(['httponly' => true, 'samesite' => 'Strict', 'secure' => !empty($_SERVER['HTTPS'])]);
session_start();

const ROOT    = __DIR__ . '/..';
const DATA    = ROOT . '/data/projects.json';
const AUTH    = ROOT . '/data/auth.php';
const UPLOADS = ROOT . '/uploads';
const MAX_IMG = 5 * 1024 * 1024;
const PLATFORMS = ['replit' => 'Replit', 'claude' => 'Claude', 'claude-code' => 'Claude Code', 'chatgpt' => 'ChatGPT'];
const TYPES     = ['site' => 'موقع', 'app' => 'تطبيق'];
const TABS      = ['projects' => 'الأعمال', 'plans' => 'الباقات', 'codes' => 'الأكواد والتتبع', 'general' => 'الإعدادات'];
const CODE_LABELS = [
    'gsc'          => ['Google Search Console', 'الصق وسم التحقق كاملًا أو الكود فقط', '<meta name="google-site-verification" content="...">'],
    'ga'           => ['Google Analytics 4', 'معرّف القياس (Measurement ID)', 'G-XXXXXXXXXX'],
    'adsense'      => ['Google AdSense', 'معرّف الناشر — يُنشأ ملف ads.txt تلقائيًا', 'pub-1234567890123456'],
    'meta_pixel'   => ['Meta Pixel (فيسبوك وإنستغرام)', 'رقم البيكسل (Pixel ID)', '123456789012345'],
    'tiktok_pixel' => ['TikTok Pixel', 'معرّف البيكسل (Pixel ID)', 'C1A2B3C4D5E6F7G8H9I0'],
    'snap_pixel'   => ['Snapchat Pixel', 'معرّف البيكسل (Pixel ID)', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'],
    'x_pixel'      => ['X (تويتر) Pixel', 'معرّف البيكسل (Pixel ID)', 'abc12'],
];

require ROOT . '/includes/settings.php';

// يحوّل الأرقام العربية (٠١٢) إلى أرقام إنجليزية
function latin_digits(string $s): string { return strtr($s, ['٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']); }

function clip($v, int $n): string { return mb_substr(trim((string)$v), 0, $n); }

function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

function load(): array {
    $j = @file_get_contents(DATA);
    $a = $j ? json_decode($j, true) : [];
    return is_array($a) ? $a : [];
}

function save(array $a): void {
    $tmp = DATA . '.tmp';
    file_put_contents($tmp, json_encode(array_values($a), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
    rename($tmp, DATA);
}

function csrf(): string { return $_SESSION['csrf'] ??= bin2hex(random_bytes(16)); }

function check_csrf(): void {
    if (!hash_equals($_SESSION['csrf'] ?? '', (string)($_POST['csrf'] ?? ''))) {
        http_response_code(400);
        exit('انتهت صلاحية الصفحة، أعد تحميلها وحاول مرة أخرى.');
    }
}

function flash(string $msg, bool $ok = true): void { $_SESSION['flash'] = [$msg, $ok]; }

function back(string $q = ''): void { header('Location: ./' . $q); exit; }

// خطأ في نموذج المشروع: نحتفظ بما كتبه المستخدم حتى لا يضيع
function fail(string $msg, string $id): void {
    $_SESSION['old'] = array_intersect_key($_POST, array_flip(['title', 'desc', 'type', 'platform', 'price', 'url', 'sale']));
    $_SESSION['old']['sale'] = !empty($_POST['sale']);
    flash($msg, false);
    back($id ? "?edit=$id" : '');
}

function remove_image(?string $path): void {
    if ($path && str_starts_with($path, 'uploads/')) {
        @unlink(UPLOADS . '/' . basename($path));
    }
}

function upload_image(): ?string {
    $f = $_FILES['img'] ?? null;
    if (!$f || $f['error'] === UPLOAD_ERR_NO_FILE) return null;
    if ($f['error'] !== UPLOAD_ERR_OK) throw new RuntimeException('فشل رفع الصورة، حاول مرة أخرى.');
    if ($f['size'] > MAX_IMG) throw new RuntimeException('حجم الصورة أكبر من 5 ميجابايت.');
    $info = @getimagesize($f['tmp_name']);
    $ext = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp', IMAGETYPE_GIF => 'gif'][$info[2] ?? 0] ?? null;
    if (!$ext) throw new RuntimeException('الصيغ المسموحة للصورة: JPG أو PNG أو WEBP أو GIF.');
    if (!is_dir(UPLOADS)) mkdir(UPLOADS, 0755, true);
    $name = bin2hex(random_bytes(8)) . '.' . $ext;
    if (!move_uploaded_file($f['tmp_name'], UPLOADS . '/' . $name)) throw new RuntimeException('تعذر حفظ الصورة على السيرفر.');
    return 'uploads/' . $name;
}

$authed = !empty($_SESSION['admin']);
$hash   = is_file(AUTH) ? (include AUTH) : null;
$action = $_POST['action'] ?? '';

// ---------- إنشاء كلمة المرور لأول مرة ----------
if (!$hash && $action === 'setup') {
    check_csrf();
    $p = (string)($_POST['password'] ?? '');
    if (mb_strlen($p) < 8) { flash('كلمة المرور يجب أن تكون 8 أحرف على الأقل.', false); back(); }
    if ($p !== ($_POST['confirm'] ?? '')) { flash('كلمتا المرور غير متطابقتين.', false); back(); }
    file_put_contents(AUTH, '<?php return ' . var_export(password_hash($p, PASSWORD_DEFAULT), true) . ";\n", LOCK_EX);
    session_regenerate_id(true);
    $_SESSION['admin'] = true;
    flash('تم إنشاء كلمة المرور، أهلًا بك في لوحة التحكم.');
    back();
}

// ---------- تسجيل الدخول والخروج ----------
if ($hash && $action === 'login') {
    check_csrf();
    if (password_verify((string)($_POST['password'] ?? ''), $hash)) {
        session_regenerate_id(true);
        $_SESSION['admin'] = true;
        back();
    }
    sleep(2);
    flash('كلمة المرور غير صحيحة.', false);
    back();
}

if ($authed && $action === 'logout') {
    check_csrf();
    $_SESSION = [];
    session_destroy();
    back();
}

// ---------- إضافة / تعديل / حذف ----------
if ($authed && $action === 'save') {
    check_csrf();
    $projects = load();
    $id = (string)($_POST['id'] ?? '');
    $idx = null;
    foreach ($projects as $i => $p) if (($p['id'] ?? '') === $id) $idx = $i;

    $title = trim((string)($_POST['title'] ?? ''));
    $url = trim((string)($_POST['url'] ?? ''));
    $price = trim((string)($_POST['price'] ?? ''));
    if ($title === '') { fail('اسم المشروع مطلوب.', $id); }
    if ($url !== '' && !preg_match('~^https?://~i', $url)) { fail('الرابط يجب أن يبدأ بـ https://', $id); }
    if ($price !== '' && !ctype_digit($price)) { fail('السعر يجب أن يكون رقمًا فقط.', $id); }

    try { $img = upload_image(); }
    catch (RuntimeException $e) { fail($e->getMessage(), $id); }

    $old = $idx !== null ? $projects[$idx] : null;
    if ($old && ($img || !empty($_POST['remove_img']))) remove_image($old['img'] ?? null);

    $item = [
        'id'       => $old['id'] ?? bin2hex(random_bytes(6)),
        'title'    => mb_substr($title, 0, 120),
        'desc'     => mb_substr(trim((string)($_POST['desc'] ?? '')), 0, 400),
        'type'     => array_key_exists($_POST['type'] ?? '', TYPES) ? $_POST['type'] : 'site',
        'platform' => array_key_exists($_POST['platform'] ?? '', PLATFORMS) ? $_POST['platform'] : 'replit',
        'sale'     => !empty($_POST['sale']),
        'price'    => $price === '' ? null : (int)$price,
        'url'      => $url,
        'img'      => $img ?? (!empty($_POST['remove_img']) ? '' : ($old['img'] ?? '')),
        'created'  => $old['created'] ?? date('c'),
    ];

    if ($idx !== null) $projects[$idx] = $item; else array_unshift($projects, $item);
    save($projects);
    flash($old ? 'تم تحديث المشروع.' : 'تمت إضافة المشروع وأصبح ظاهرًا في الموقع.');
    back();
}

if ($authed && $action === 'delete') {
    check_csrf();
    $id = (string)($_POST['id'] ?? '');
    $projects = load();
    foreach ($projects as $i => $p) {
        if (($p['id'] ?? '') === $id) { remove_image($p['img'] ?? null); unset($projects[$i]); }
    }
    save($projects);
    flash('تم حذف المشروع.');
    back();
}

if ($authed && $action === 'move') {
    check_csrf();
    $projects = array_values(load());
    $id = (string)($_POST['id'] ?? '');
    $dir = ($_POST['dir'] ?? '') === 'up' ? -1 : 1;
    foreach ($projects as $i => $p) {
        if (($p['id'] ?? '') === $id && isset($projects[$i + $dir])) {
            [$projects[$i], $projects[$i + $dir]] = [$projects[$i + $dir], $projects[$i]];
            break;
        }
    }
    save($projects);
    back();
}

// ---------- الباقات ----------
if ($authed && $action === 'save_plans') {
    check_csrf();
    $plans = [];
    foreach ((array)($_POST['plans'] ?? []) as $p) {
        if (!is_array($p) || !empty($p['delete']) || clip($p['name'] ?? '', 60) === '') continue;
        $lines = preg_split('~\R~u', (string)($p['features'] ?? ''));
        $plans[] = [
            'order'    => (int)($p['order'] ?? 0),
            'name'     => clip($p['name'], 60),
            'price'    => latin_digits(clip($p['price'] ?? '', 30)),
            'note'     => clip($p['note'] ?? '', 120),
            'badge'    => clip($p['badge'] ?? '', 30),
            'featured' => !empty($p['featured']),
            'button'   => clip($p['button'] ?? '', 30),
            'features' => array_values(array_filter(array_map(fn($l) => clip($l, 100), $lines), fn($l) => $l !== '')),
        ];
    }
    usort($plans, fn($a, $b) => $a['order'] <=> $b['order']);
    $s = load_settings();
    $s['plans'] = array_map(function ($p) { unset($p['order']); return $p; }, $plans);
    save_settings($s);
    flash('تم حفظ الباقات وأصبحت ظاهرة في الموقع.');
    back('?tab=plans');
}

// ---------- أكواد التتبع والإعلانات ----------
if ($authed && $action === 'save_codes') {
    check_csrf();
    $s = load_settings();
    $bad = [];
    foreach (array_keys(CODE_RULES) as $k) {
        $v = normalize_code_id($k, (string)($_POST[$k] ?? ''));
        if (!valid_code_id($k, $v)) { $bad[] = CODE_LABELS[$k][0]; continue; }
        $s['codes'][$k] = $v;
    }
    $s['codes']['head'] = trim((string)($_POST['head'] ?? ''));
    $s['codes']['body'] = trim((string)($_POST['body'] ?? ''));
    save_settings($s);
    if ($bad) flash('تم حفظ الباقي، لكن هذه المعرّفات غير صحيحة ولم تُحفظ: ' . implode('، ', $bad), false);
    else flash('تم حفظ الأكواد وأصبحت مفعّلة في الموقع.');
    back('?tab=codes');
}

// ---------- الإعدادات العامة ----------
if ($authed && $action === 'save_general') {
    check_csrf();
    $s = load_settings();
    $wa = preg_replace('~\D~', '', latin_digits((string)($_POST['whatsapp'] ?? '')));
    if (str_starts_with($wa, '00')) $wa = substr($wa, 2);
    if (str_starts_with($wa, '05')) $wa = '966' . substr($wa, 1);
    if (strlen($wa) < 10 || strlen($wa) > 15) { flash('رقم الواتساب غير صحيح. اكتبه مثل 0596125002', false); back('?tab=general'); }
    $s['whatsapp'] = $wa;
    $s['stats'] = [];
    foreach ((array)($_POST['stats'] ?? []) as $st) {
        if (!is_array($st)) continue;
        $s['stats'][] = ['value' => clip($st['value'] ?? '', 12), 'label' => clip($st['label'] ?? '', 40)];
    }
    save_settings($s);
    flash('تم حفظ الإعدادات.');
    back('?tab=general');
}

if ($authed && $action === 'change_password') {
    check_csrf();
    $p = (string)($_POST['new'] ?? '');
    if (!password_verify((string)($_POST['current'] ?? ''), $hash)) { sleep(2); flash('كلمة المرور الحالية غير صحيحة.', false); back('?tab=general'); }
    if (mb_strlen($p) < 8) { flash('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.', false); back('?tab=general'); }
    if ($p !== ($_POST['confirm'] ?? '')) { flash('كلمتا المرور الجديدتان غير متطابقتين.', false); back('?tab=general'); }
    file_put_contents(AUTH, '<?php return ' . var_export(password_hash($p, PASSWORD_DEFAULT), true) . ";\n", LOCK_EX);
    flash('تم تغيير كلمة المرور.');
    back('?tab=general');
}

// ---------- العرض ----------
$flash = $_SESSION['flash'] ?? null;
unset($_SESSION['flash']);
$projects = $authed ? load() : [];
$edit = null;
if ($authed && isset($_GET['edit'])) foreach ($projects as $p) if ($p['id'] === $_GET['edit']) $edit = $p;
$old = $_SESSION['old'] ?? null;
unset($_SESSION['old']);
$form = $old ? array_merge($edit ?? [], $old) : $edit;
$writable = is_writable(ROOT . '/data');
$tab = array_key_exists($_GET['tab'] ?? '', TABS) ? $_GET['tab'] : 'projects';
$S = $authed ? load_settings() : [];
?>
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>لوحة التحكم | قاسم للتطوير الرقمي</title>
<link rel="icon" href="../logo.svg" type="image/svg+xml">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
<style>
:root{--brand:#D97757;--brand-d:#C2603F;--brand-l:#F4E3DA;--ink:#141413;--muted:#5E5D59;--bg:#FAF9F5;--line:#E8E6DC;--ok:#167A45;--err:#B42318}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Tajawal,system-ui,sans-serif;background:var(--bg);color:var(--ink);line-height:1.6}
a{color:inherit;text-decoration:none}
.wrap{width:min(1100px,100% - 32px);margin-inline:auto}
header{background:#fff;border-bottom:1px solid var(--line)}
header .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;height:70px}
.logo{display:flex;align-items:center;gap:10px;font-weight:900;font-size:19px}
.logo img{width:40px;height:40px}
.logo small{display:block;font-size:12px;color:var(--muted);font-weight:700}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--brand);color:#fff;border:2px solid transparent;border-radius:10px;padding:10px 20px;font:700 16px Tajawal,sans-serif;cursor:pointer}
.btn:hover{background:var(--brand-d)}
.btn.ghost{background:#fff;color:var(--ink);border-color:var(--line)}
.btn.ghost:hover{border-color:var(--ink)}
.btn.danger{background:#fff;color:var(--err);border-color:#F3C7C2}
.btn.sm{padding:6px 12px;font-size:14px}
main{padding:32px 0 60px}
.card{background:#fff;border:1px solid var(--line);border-radius:20px;padding:28px;margin-bottom:24px}
h1{font-size:26px;font-weight:900;margin-bottom:4px}
h2{font-size:21px;font-weight:800;margin-bottom:18px}
.muted{color:var(--muted)}
.msg{border-radius:12px;padding:12px 16px;margin-bottom:20px;font-weight:700}
.msg.ok{background:#E7F7EE;color:var(--ok)}
.msg.err{background:#FDECEA;color:var(--err)}
form.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.full{grid-column:1/-1}
label{display:block;font-weight:700;margin-bottom:6px;font-size:15px}
input[type=text],input[type=url],input[type=password],input[type=number],textarea,select{width:100%;border:1px solid var(--line);border-radius:10px;padding:11px 14px;font:16px Tajawal,sans-serif;background:var(--bg);color:var(--ink)}
input:focus,textarea:focus,select:focus{outline:2px solid var(--brand);outline-offset:1px;background:#fff}
textarea{min-height:90px;resize:vertical}
.check{display:flex;align-items:center;gap:8px;font-weight:700;cursor:pointer}
.check input{width:20px;height:20px;accent-color:var(--brand)}
.hint{font-size:13px;color:var(--muted);margin-top:4px}
.list{display:flex;flex-direction:column;gap:12px}
.item{display:flex;align-items:center;gap:16px;border:1px solid var(--line);border-radius:14px;padding:12px;background:var(--bg)}
.thumb{width:96px;height:64px;border-radius:10px;background:linear-gradient(135deg,var(--brand),#E9A487);flex:none;overflow:hidden}
.thumb img{width:100%;height:100%;object-fit:cover;display:block}
.info{flex:1;min-width:0}
.info b{display:block;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.tag{font-size:12px;font-weight:800;padding:2px 9px;border-radius:7px;background:#fff;border:1px solid var(--line)}
.tag.sale{background:#E7F7EE;color:var(--ok);border-color:#BFE8D0}
.acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.acts form{display:inline}
.empty{text-align:center;padding:40px;border:2px dashed var(--line);border-radius:16px;color:var(--muted)}
.login{max-width:420px;margin:60px auto}
.login form{display:flex;flex-direction:column;gap:14px}
.cur-img{display:flex;align-items:center;gap:12px;margin-top:8px}
.cur-img img{width:90px;height:60px;object-fit:cover;border-radius:8px}
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:22px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:6px}
.tabs a{padding:9px 18px;border-radius:10px;font-weight:700;color:var(--muted)}
.tabs a.on{background:var(--ink);color:#fff}
.plan-box{border:1px solid var(--line);border-radius:16px;padding:20px;margin-bottom:16px;background:var(--bg)}
.plan-box.new{border-style:dashed;background:#fff}
.plan-box h3{font-size:17px;font-weight:800;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;gap:10px}
.plan-box textarea{min-height:110px}
.pgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.code-row{border-bottom:1px solid var(--line);padding:16px 0}
.code-row:last-of-type{border:0}
.code-row label{display:flex;justify-content:space-between;align-items:center;gap:10px}
.on-tag{font-size:12px;font-weight:800;padding:2px 10px;border-radius:7px;background:#E7F7EE;color:var(--ok)}
.off-tag{font-size:12px;font-weight:800;padding:2px 10px;border-radius:7px;background:var(--bg);color:var(--muted);border:1px solid var(--line)}
textarea.code{font-family:ui-monospace,Consolas,monospace;font-size:13px;direction:ltr;text-align:left;min-height:120px}
input.ltr{direction:ltr;text-align:left}
.stats-grid{display:grid;grid-template-columns:120px 1fr;gap:10px;margin-bottom:10px}
@media (max-width:700px){
  form.grid,.pgrid,.stats-grid{grid-template-columns:1fr}
  .item{flex-wrap:wrap}
  .acts{width:100%;justify-content:flex-start}
  .card{padding:20px}
}
</style>
</head>
<body>
<header>
  <div class="wrap">
    <a class="logo" href="../"><img src="../logo.svg" alt=""><span>قاسم للتطوير الرقمي<small>لوحة التحكم</small></span></a>
    <?php if ($authed): ?>
      <div style="display:flex;gap:8px">
        <a class="btn ghost sm" href="../" target="_blank">عرض الموقع</a>
        <form method="post"><input type="hidden" name="csrf" value="<?= h(csrf()) ?>"><input type="hidden" name="action" value="logout"><button class="btn ghost sm">خروج</button></form>
      </div>
    <?php endif; ?>
  </div>
</header>

<main class="wrap">
<?php if ($flash): ?><div class="msg <?= $flash[1] ? 'ok' : 'err' ?>"><?= h($flash[0]) ?></div><?php endif; ?>
<?php if (!$writable): ?><div class="msg err">مجلد data غير قابل للكتابة. من مدير الملفات في cPanel اجعل صلاحياته 755.</div><?php endif; ?>

<?php if (!$hash): ?>
  <div class="card login">
    <h1>مرحبًا قاسم 👋</h1>
    <p class="muted" style="margin-bottom:18px">هذه أول مرة تفتح لوحة التحكم. أنشئ كلمة مرور لحمايتها.</p>
    <form method="post">
      <input type="hidden" name="csrf" value="<?= h(csrf()) ?>"><input type="hidden" name="action" value="setup">
      <div><label>كلمة المرور</label><input type="password" name="password" minlength="8" required autocomplete="new-password"></div>
      <div><label>تأكيد كلمة المرور</label><input type="password" name="confirm" minlength="8" required autocomplete="new-password"></div>
      <button class="btn">إنشاء والدخول</button>
    </form>
  </div>

<?php elseif (!$authed): ?>
  <div class="card login">
    <h1>تسجيل الدخول</h1>
    <p class="muted" style="margin-bottom:18px">أدخل كلمة المرور للوصول إلى لوحة التحكم.</p>
    <form method="post">
      <input type="hidden" name="csrf" value="<?= h(csrf()) ?>"><input type="hidden" name="action" value="login">
      <div><label>كلمة المرور</label><input type="password" name="password" required autofocus autocomplete="current-password"></div>
      <button class="btn">دخول</button>
    </form>
  </div>

<?php else: ?>
  <nav class="tabs">
    <?php foreach (TABS as $k => $v): ?><a href="?tab=<?= $k ?>" class="<?= $tab === $k ? 'on' : '' ?>"><?= $v ?></a><?php endforeach; ?>
  </nav>

<?php if ($tab === 'projects'): ?>
  <div class="card">
    <h2><?= $edit ? 'تعديل المشروع' : 'إضافة مشروع جديد' ?></h2>
    <form class="grid" method="post" enctype="multipart/form-data">
      <input type="hidden" name="csrf" value="<?= h(csrf()) ?>"><input type="hidden" name="action" value="save">
      <input type="hidden" name="id" value="<?= h($edit['id'] ?? '') ?>">
      <div class="full"><label>اسم المشروع *</label><input type="text" name="title" maxlength="120" required value="<?= h($form['title'] ?? '') ?>" placeholder="مثال: نظام حجز مواعيد للعيادات"></div>
      <div class="full"><label>وصف قصير</label><textarea name="desc" maxlength="400" placeholder="سطر أو سطرين عن مميزات المشروع"><?= h($form['desc'] ?? '') ?></textarea></div>
      <div><label>النوع</label><select name="type"><?php foreach (TYPES as $k => $v): ?><option value="<?= $k ?>" <?= ($form['type'] ?? '') === $k ? 'selected' : '' ?>><?= $v ?></option><?php endforeach; ?></select></div>
      <div><label>المنصة / الأداة</label><select name="platform"><?php foreach (PLATFORMS as $k => $v): ?><option value="<?= $k ?>" <?= ($form['platform'] ?? '') === $k ? 'selected' : '' ?>><?= $v ?></option><?php endforeach; ?></select></div>
      <div><label>السعر بالريال</label><input type="number" name="price" min="0" step="1" value="<?= h($form['price'] ?? '') ?>" placeholder="اتركه فارغًا لـ «تصميم مخصص»"></div>
      <div><label>رابط المعاينة</label><input type="url" name="url" value="<?= h($form['url'] ?? '') ?>" placeholder="https://..."><div class="hint">مثل رابط المشروع على Replit</div></div>
      <div class="full"><label class="check"><input type="checkbox" name="sale" value="1" <?= !empty($form['sale']) ? 'checked' : '' ?>> متاح للبيع (يظهر زر «اطلب الآن» عبر الواتساب)</label></div>
      <div class="full">
        <label>صورة المشروع</label>
        <input type="file" name="img" accept="image/jpeg,image/png,image/webp,image/gif">
        <div class="hint">JPG أو PNG أو WEBP — حتى 5 ميجابايت. المقاس المثالي 1200×800</div>
        <?php if (!empty($edit['img'])): ?>
          <div class="cur-img"><img src="../<?= h($edit['img']) ?>" alt=""><label class="check"><input type="checkbox" name="remove_img" value="1"> حذف الصورة الحالية</label></div>
        <?php endif; ?>
      </div>
      <div class="full" style="display:flex;gap:10px">
        <button class="btn"><?= $edit ? 'حفظ التعديلات' : 'إضافة المشروع' ?></button>
        <?php if ($edit): ?><a class="btn ghost" href="./">إلغاء</a><?php endif; ?>
      </div>
    </form>
  </div>

  <div class="card">
    <h2>أعمالك المعروضة (<?= count($projects) ?>)</h2>
    <?php if (!$projects): ?>
      <div class="empty">لا توجد أعمال بعد — أضف أول مشروع من النموذج بالأعلى.</div>
    <?php else: ?>
      <div class="list">
        <?php foreach ($projects as $i => $p): ?>
          <div class="item">
            <div class="thumb"><?php if (!empty($p['img'])): ?><img src="../<?= h($p['img']) ?>" alt=""><?php endif; ?></div>
            <div class="info">
              <b><?= h($p['title']) ?></b>
              <div class="tags">
                <?php if (!empty($p['sale'])): ?><span class="tag sale">للبيع</span><?php endif; ?>
                <span class="tag"><?= h(TYPES[$p['type']] ?? $p['type']) ?></span>
                <span class="tag"><?= h(PLATFORMS[$p['platform']] ?? $p['platform']) ?></span>
                <span class="tag"><?= $p['price'] !== null ? h($p['price']) . ' ريال' : 'تصميم مخصص' ?></span>
              </div>
            </div>
            <div class="acts">
              <?php foreach (['up' => '↑', 'down' => '↓'] as $d => $sym): if (($d === 'up' && $i === 0) || ($d === 'down' && $i === count($projects) - 1)) continue; ?>
                <form method="post"><input type="hidden" name="csrf" value="<?= h(csrf()) ?>"><input type="hidden" name="action" value="move"><input type="hidden" name="id" value="<?= h($p['id']) ?>"><input type="hidden" name="dir" value="<?= $d ?>"><button class="btn ghost sm" title="<?= $d === 'up' ? 'تقديم' : 'تأخير' ?>"><?= $sym ?></button></form>
              <?php endforeach; ?>
              <a class="btn ghost sm" href="?edit=<?= h($p['id']) ?>">تعديل</a>
              <form method="post" onsubmit="return confirm('حذف «<?= h(addslashes($p['title'])) ?>»؟')"><input type="hidden" name="csrf" value="<?= h(csrf()) ?>"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= h($p['id']) ?>"><button class="btn danger sm">حذف</button></form>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </div>

<?php elseif ($tab === 'plans'): ?>
  <form method="post" class="card">
    <input type="hidden" name="csrf" value="<?= h(csrf()) ?>"><input type="hidden" name="action" value="save_plans">
    <h2>الباقات المعروضة في الموقع</h2>
    <p class="muted" style="margin-bottom:18px">اكتب السعر رقمًا (مثل 299) ليظهر بجانبه «ريال»، أو نصًا مثل «حسب الطلب». المميزات: كل ميزة في سطر.</p>
    <?php $plans = $S['plans']; $plans[] = null; foreach ($plans as $i => $p): $new = $p === null; $p = $p ?? ['name' => '', 'price' => '', 'note' => '', 'badge' => '', 'featured' => false, 'button' => 'اطلب الآن', 'features' => []]; ?>
      <div class="plan-box<?= $new ? ' new' : '' ?>">
        <h3><?= $new ? '➕ إضافة باقة جديدة (اتركها فارغة إن لم تحتجها)' : 'باقة ' . ($i + 1) . ': ' . h($p['name']) ?>
          <?php if (!$new): ?><label class="check" style="font-size:14px;color:var(--err)"><input type="checkbox" name="plans[<?= $i ?>][delete]" value="1"> حذف هذه الباقة</label><?php endif; ?>
        </h3>
        <div class="pgrid">
          <div><label>اسم الباقة</label><input type="text" name="plans[<?= $i ?>][name]" maxlength="60" value="<?= h($p['name']) ?>"></div>
          <div><label>السعر</label><input type="text" name="plans[<?= $i ?>][price]" maxlength="30" value="<?= h($p['price']) ?>" placeholder="299 أو حسب الطلب"></div>
          <div><label>وصف قصير</label><input type="text" name="plans[<?= $i ?>][note]" maxlength="120" value="<?= h($p['note']) ?>"></div>
          <div><label>نص الزر</label><input type="text" name="plans[<?= $i ?>][button]" maxlength="30" value="<?= h($p['button']) ?>"></div>
          <div><label>شارة مميزة (اختياري)</label><input type="text" name="plans[<?= $i ?>][badge]" maxlength="30" value="<?= h($p['badge']) ?>" placeholder="مثل: الأكثر طلبًا"></div>
          <div><label>الترتيب</label><input type="number" name="plans[<?= $i ?>][order]" value="<?= $i + 1 ?>"></div>
          <div class="full"><label>المميزات (كل ميزة في سطر)</label><textarea name="plans[<?= $i ?>][features]"><?= h(implode("\n", $p['features'])) ?></textarea></div>
          <div class="full"><label class="check"><input type="checkbox" name="plans[<?= $i ?>][featured]" value="1" <?= !empty($p['featured']) ? 'checked' : '' ?>> باقة مميزة (تظهر بخلفية سوداء)</label></div>
        </div>
      </div>
    <?php endforeach; ?>
    <button class="btn">حفظ الباقات</button>
  </form>

<?php elseif ($tab === 'codes'): ?>
  <form method="post" class="card">
    <input type="hidden" name="csrf" value="<?= h(csrf()) ?>"><input type="hidden" name="action" value="save_codes">
    <h2>أكواد التتبع والإعلانات</h2>
    <p class="muted" style="margin-bottom:8px">يكفي لصق المعرّف فقط، أو الكود كاملًا وسيستخرج النظام المعرّف منه تلقائيًا. اترك الخانة فارغة لإيقاف الكود.</p>
    <?php foreach (CODE_LABELS as $k => [$label, $hint, $ph]): ?>
      <div class="code-row">
        <label><?= h($label) ?> <?= $S['codes'][$k] !== '' ? '<span class="on-tag">مفعّل</span>' : '<span class="off-tag">غير مفعّل</span>' ?></label>
        <input type="text" class="ltr" name="<?= $k ?>" value="<?= h($S['codes'][$k]) ?>" placeholder="<?= h($ph) ?>">
        <div class="hint"><?= h($hint) ?><?php if ($k === 'adsense' && $S['codes'][$k] !== ''): ?> — <a href="../ads.txt" target="_blank" style="color:var(--brand)">عرض ads.txt</a><?php endif; ?></div>
      </div>
    <?php endforeach; ?>
    <div class="code-row">
      <label>أكواد إضافية داخل &lt;head&gt; <?= trim($S['codes']['head']) !== '' ? '<span class="on-tag">مفعّل</span>' : '' ?></label>
      <textarea class="code" name="head" placeholder="<!-- مثل Google Tag Manager أو أي بيكسل آخر -->"><?= h($S['codes']['head']) ?></textarea>
      <div class="hint">لأي كود آخر تطلب المنصة وضعه في &lt;head&gt;، مثل Google Tag Manager أو LinkedIn أو Pinterest.</div>
    </div>
    <div class="code-row">
      <label>أكواد إضافية قبل &lt;/body&gt; <?= trim($S['codes']['body']) !== '' ? '<span class="on-tag">مفعّل</span>' : '' ?></label>
      <textarea class="code" name="body" placeholder="<!-- مثل جزء noscript من Google Tag Manager أو أداة دردشة -->"><?= h($S['codes']['body']) ?></textarea>
    </div>
    <p class="msg err" style="margin:16px 0;font-weight:500;font-size:14px">تنبيه: الأكواد في الخانتين الأخيرتين تُضاف للموقع كما هي، فالصق فقط أكوادًا من مصادر موثوقة مثل Google أو منصات التواصل نفسها.</p>
    <button class="btn">حفظ الأكواد</button>
  </form>

<?php else: ?>
  <form method="post" class="card">
    <input type="hidden" name="csrf" value="<?= h(csrf()) ?>"><input type="hidden" name="action" value="save_general">
    <h2>الإعدادات العامة</h2>
    <div style="margin-bottom:22px">
      <label>رقم الواتساب</label>
      <input type="text" class="ltr" name="whatsapp" value="<?= h(str_starts_with($S['whatsapp'], '966') ? '0' . substr($S['whatsapp'], 3) : $S['whatsapp']) ?>" placeholder="0596125002" style="max-width:320px">
      <div class="hint">رقم سعودي مثل 0596125002، أو رقم دولي كامل مع رمز الدولة.</div>
    </div>
    <label>الأرقام في البنر الرئيسي</label>
    <div class="hint" style="margin-bottom:10px">اترك الرقم فارغًا لإخفاء الخانة.</div>
    <?php for ($i = 0; $i < 3; $i++): $st = $S['stats'][$i] ?? ['value' => '', 'label' => '']; ?>
      <div class="stats-grid">
        <input type="text" name="stats[<?= $i ?>][value]" maxlength="12" value="<?= h($st['value']) ?>" placeholder="+30">
        <input type="text" name="stats[<?= $i ?>][label]" maxlength="40" value="<?= h($st['label']) ?>" placeholder="مشروع منجز">
      </div>
    <?php endfor; ?>
    <button class="btn" style="margin-top:8px">حفظ الإعدادات</button>
  </form>

  <form method="post" class="card">
    <input type="hidden" name="csrf" value="<?= h(csrf()) ?>"><input type="hidden" name="action" value="change_password">
    <h2>تغيير كلمة المرور</h2>
    <div style="display:grid;gap:12px;max-width:420px">
      <div><label>كلمة المرور الحالية</label><input type="password" name="current" required autocomplete="current-password"></div>
      <div><label>كلمة المرور الجديدة</label><input type="password" name="new" minlength="8" required autocomplete="new-password"></div>
      <div><label>تأكيد الجديدة</label><input type="password" name="confirm" minlength="8" required autocomplete="new-password"></div>
      <div><button class="btn">تغيير كلمة المرور</button></div>
    </div>
  </form>
<?php endif; ?>
<?php endif; ?>
</main>
</body>
</html>
