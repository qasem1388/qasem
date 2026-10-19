<?php
// يولّد ملف ads.txt تلقائيًا من معرّف ناشر AdSense المحفوظ في لوحة التحكم
declare(strict_types=1);
require __DIR__ . '/includes/settings.php';
$c = load_settings()['codes'];
header('Content-Type: text/plain; charset=utf-8');
if ($c['adsense'] !== '' && valid_code_id('adsense', $c['adsense'])) {
    echo "google.com, {$c['adsense']}, DIRECT, f08c47fec0942fa0\n";
}
