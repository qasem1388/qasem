<?php
// خريطة الموقع لمحركات البحث (sitemap.xml)
declare(strict_types=1);
$host = preg_replace('~[^a-z0-9.\-:]~i', '', $_SERVER['HTTP_HOST'] ?? 'qasemdigital.shop');
$files = [__DIR__ . '/index.php', __DIR__ . '/data/projects.json', __DIR__ . '/data/settings.json'];
$mtime = max(array_map(fn($f) => is_file($f) ? filemtime($f) : 0, $files));
header('Content-Type: application/xml; charset=utf-8');
echo '<?xml version="1.0" encoding="UTF-8"?>', "\n";
?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://<?= $host ?>/</loc>
    <lastmod><?= date('Y-m-d', $mtime) ?></lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
