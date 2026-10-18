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
@media (max-width:700px){
  form.grid{grid-template-columns:1fr}
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
<?php endif; ?>
</main>
</body>
</html>
