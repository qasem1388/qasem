<?php
// robots.txt: يسمح بفهرسة الموقع ويمنع لوحة التحكم والملفات الداخلية
declare(strict_types=1);
$host = preg_replace('~[^a-z0-9.\-:]~i', '', $_SERVER['HTTP_HOST'] ?? 'qasemdigital.shop');
header('Content-Type: text/plain; charset=utf-8');
echo "User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /data/\nDisallow: /includes/\n\nSitemap: https://$host/sitemap.xml\n";
