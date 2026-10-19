<?php
// إعدادات الموقع (الباقات، الأرقام، الواتساب، أكواد التتبع) — تُعدَّل من لوحة التحكم وتُحفظ في data/settings.json
declare(strict_types=1);

const SETTINGS_FILE = __DIR__ . '/../data/settings.json';

function default_settings(): array {
    return [
        'whatsapp' => '966596125002',
        'stats' => [
            ['value' => '+30', 'label' => 'مشروع منجز'],
            ['value' => '+15', 'label' => 'تطبيق جاهز للبيع'],
            ['value' => '48h', 'label' => 'أسرع تسليم'],
        ],
        'plans' => [
            ['name' => 'صفحة هبوط', 'price' => '299', 'note' => 'مثالية للتعريف بنشاطك', 'badge' => '', 'featured' => false, 'button' => 'اطلب الآن',
             'features' => ['صفحة واحدة متجاوبة', 'زر واتساب مباشر', 'تسليم خلال 3 أيام']],
            ['name' => 'موقع / تطبيق كامل', 'price' => '899', 'note' => 'للمشاريع والمتاجر', 'badge' => 'الأكثر طلبًا', 'featured' => true, 'button' => 'اطلب الآن',
             'features' => ['حتى 6 صفحات أو أقسام', 'لوحة تحكم بسيطة', 'ربط دومين واستضافة', 'دعم فني 30 يومًا']],
            ['name' => 'مشروع مخصص', 'price' => 'حسب الطلب', 'note' => 'أنظمة وتطبيقات متقدمة', 'badge' => '', 'featured' => false, 'button' => 'استشارة مجانية',
             'features' => ['تحليل كامل للفكرة', 'ذكاء اصطناعي وأتمتة', 'دعم وتطوير مستمر']],
        ],
        'codes' => [
            'gsc' => '', 'ga' => '', 'adsense' => '',
            'meta_pixel' => '', 'tiktok_pixel' => '', 'snap_pixel' => '', 'x_pixel' => '',
            'head' => '', 'body' => '',
        ],
    ];
}

function load_settings(): array {
    $d = default_settings();
    $j = @file_get_contents(SETTINGS_FILE);
    $s = $j ? json_decode($j, true) : null;
    if (!is_array($s)) return $d;
    $s['codes'] = array_merge($d['codes'], is_array($s['codes'] ?? null) ? $s['codes'] : []);
    return array_merge($d, $s);
}

function save_settings(array $s): void {
    $tmp = SETTINGS_FILE . '.tmp';
    file_put_contents($tmp, json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
    rename($tmp, SETTINGS_FILE);
}

// ---------- التحقق من المعرّفات (تمنع إدخال أي شيء غير المعرّف داخل الأكواد المولّدة) ----------
const CODE_RULES = [
    'gsc'          => '~^[A-Za-z0-9_\-]{10,100}$~',
    'ga'           => '~^G-[A-Z0-9]{4,20}$~',
    'adsense'      => '~^pub-\d{10,20}$~',
    'meta_pixel'   => '~^\d{10,20}$~',
    'tiktok_pixel' => '~^[A-Z0-9]{10,30}$~',
    'snap_pixel'   => '~^[a-f0-9\-]{20,40}$~',
    'x_pixel'      => '~^[a-z0-9]{4,12}$~',
];

// يقبل المعرّف وحده أو الكود كاملًا ويستخرج المعرّف منه
function normalize_code_id(string $key, string $v): string {
    $v = trim($v);
    if ($v === '') return '';
    switch ($key) {
        case 'gsc':
            if (preg_match('~content=["\']([^"\']+)~', $v, $m)) $v = $m[1];
            break;
        case 'ga':
            if (preg_match('~G-[A-Z0-9]{4,20}~i', $v, $m)) $v = $m[0];
            $v = strtoupper($v);
            break;
        case 'adsense':
            if (preg_match('~pub-\d{10,20}~', $v, $m)) $v = $m[0];
            break;
        case 'meta_pixel':
            if (preg_match("~fbq\\(\\s*['\"]init['\"]\\s*,\\s*['\"](\\d+)~", $v, $m)) $v = $m[1];
            break;
        case 'tiktok_pixel':
            if (preg_match("~ttq\\.load\\(\\s*['\"]([A-Z0-9]+)~i", $v, $m)) $v = $m[1];
            $v = strtoupper($v);
            break;
        case 'snap_pixel':
            if (preg_match("~snaptr\\(\\s*['\"]init['\"]\\s*,\\s*['\"]([a-f0-9\\-]+)~i", $v, $m)) $v = $m[1];
            $v = strtolower($v);
            break;
        case 'x_pixel':
            if (preg_match("~twq\\(\\s*['\"]config['\"]\\s*,\\s*['\"]([a-z0-9]+)~i", $v, $m)) $v = $m[1];
            $v = strtolower($v);
            break;
    }
    return $v;
}

function valid_code_id(string $key, string $v): bool {
    return $v === '' || (bool)preg_match(CODE_RULES[$key], $v);
}

// ---------- الأكواد التي تُطبع في الصفحة ----------
function head_codes(array $c): string {
    $out = [];
    if (valid_code_id('gsc', $c['gsc']) && $c['gsc'] !== '') {
        $out[] = '<meta name="google-site-verification" content="' . $c['gsc'] . '">';
    }
    if (valid_code_id('adsense', $c['adsense']) && $c['adsense'] !== '') {
        $out[] = '<meta name="google-adsense-account" content="ca-' . $c['adsense'] . '">';
        $out[] = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-' . $c['adsense'] . '" crossorigin="anonymous"></script>';
    }
    if (valid_code_id('ga', $c['ga']) && $c['ga'] !== '') {
        $id = $c['ga'];
        $out[] = "<script async src=\"https://www.googletagmanager.com/gtag/js?id=$id\"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','$id');</script>";
    }
    if (valid_code_id('meta_pixel', $c['meta_pixel']) && $c['meta_pixel'] !== '') {
        $id = $c['meta_pixel'];
        $out[] = "<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','$id');fbq('track','PageView');</script>\n<noscript><img height=\"1\" width=\"1\" style=\"display:none\" src=\"https://www.facebook.com/tr?id=$id&ev=PageView&noscript=1\"></noscript>";
    }
    if (valid_code_id('tiktok_pixel', $c['tiktok_pixel']) && $c['tiktok_pixel'] !== '') {
        $id = $c['tiktok_pixel'];
        $out[] = "<script>!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=[\"page\",\"track\",\"identify\",\"instances\",\"debug\",\"on\",\"off\",\"once\",\"ready\",\"alias\",\"group\",\"enableCookie\",\"disableCookie\",\"holdConsent\",\"revokeConsent\",\"grantConsent\"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r=\"https://analytics.tiktok.com/i18n/pixel/events.js\",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=d.createElement(\"script\");n.type=\"text/javascript\",n.async=!0,n.src=r+\"?sdkid=\"+e+\"&lib=\"+t;e=d.getElementsByTagName(\"script\")[0];e.parentNode.insertBefore(n,e)};ttq.load('$id');ttq.page();}(window,document,'ttq');</script>";
    }
    if (valid_code_id('snap_pixel', $c['snap_pixel']) && $c['snap_pixel'] !== '') {
        $id = $c['snap_pixel'];
        $out[] = "<script>(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script',r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');snaptr('init','$id',{});snaptr('track','PAGE_VIEW');</script>";
    }
    if (valid_code_id('x_pixel', $c['x_pixel']) && $c['x_pixel'] !== '') {
        $id = $c['x_pixel'];
        $out[] = "<script>!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');twq('config','$id');</script>";
    }
    if (trim($c['head']) !== '') $out[] = $c['head'];
    return $out ? implode("\n", $out) . "\n" : '';
}

function body_codes(array $c): string {
    return trim($c['body']) !== '' ? $c['body'] . "\n" : '';
}
