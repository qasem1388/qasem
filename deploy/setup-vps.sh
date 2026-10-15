#!/usr/bin/env bash
# تثبيت المتجر على خادم Ubuntu (VPS) خلف Nginx مع شهادة SSL مجانية
# الاستخدام:  bash setup-vps.sh shop.example.com
set -euo pipefail

DOMAIN="${1:-}"
[ -n "$DOMAIN" ] || { echo "اكتب النطاق: bash setup-vps.sh shop.example.com"; exit 1; }
[ "$(id -u)" = 0 ] || { echo "شغّل السكربت كمستخدم root"; exit 1; }

SRC="$(cd "$(dirname "$0")" && pwd)"
APP=/opt/qasem-store
PORT=3210
say() { printf '\n\033[1;32m==> %s\033[0m\n' "$1"; }

say "1/7 فحص المنافذ"
if ss -ltnp | grep -E ':(80|443)\s' | grep -vq nginx; then
  echo "تنبيه: يوجد برنامج آخر غير Nginx يستخدم المنفذ 80 أو 443:"
  ss -ltnp | grep -E ':(80|443)\s'
  echo "أرسل هذه الرسالة لـ Claude قبل المتابعة."; exit 1
fi
if ss -ltn | grep -q ":$PORT\s"; then echo "المنفذ $PORT مستخدم مسبقاً"; exit 1; fi

say "2/7 تثبيت Node.js 22"
export DEBIAN_FRONTEND=noninteractive
# يمنع نافذة "إعادة تشغيل الخدمات" المخفية التي توقف التثبيت على Ubuntu 22+
export NEEDRESTART_MODE=a NEEDRESTART_SUSPEND=1
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg nginx > /dev/null
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - > /dev/null
  apt-get install -y -qq nodejs > /dev/null
fi
node -v

say "3/7 نسخ ملفات المتجر"
id qasem >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin qasem
mkdir -p "$APP"
if [ -f "$APP/.env" ]; then
  # تحديث: نحافظ على الإعدادات وقاعدة البيانات والصور الحالية
  rsync -a --delete --exclude .env --exclude data --exclude storage "$SRC/" "$APP/" 2>/dev/null || {
    apt-get install -y -qq rsync > /dev/null
    rsync -a --delete --exclude .env --exclude data --exclude storage "$SRC/" "$APP/"
  }
else
  cp -a "$SRC/." "$APP/"
fi
sed -i "s#^SITE_URL=.*#SITE_URL=\"https://$DOMAIN\"#" "$APP/.env"
grep -q '^PORT=' "$APP/.env" || echo "PORT=$PORT" >> "$APP/.env"
chown -R qasem:qasem "$APP"
chmod 600 "$APP/.env"

say "4/7 تشغيل المتجر كخدمة دائمة"
cat > /etc/systemd/system/qasem-store.service <<UNIT
[Unit]
Description=Qasem Store
After=network.target

[Service]
User=qasem
WorkingDirectory=$APP
Environment=PORT=$PORT
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/node $APP/app.js
Restart=always
RestartSec=3
MemoryMax=1200M

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now qasem-store
systemctl restart qasem-store
sleep 4
curl -fsS -o /dev/null "http://127.0.0.1:$PORT/robots.txt" && echo "المتجر يعمل ✓" || { journalctl -u qasem-store -n 30 --no-pager; exit 1; }

say "5/7 إعداد Nginx"
cat > /etc/nginx/sites-available/qasem-store <<NGINX
server {
    listen 80;
    server_name $DOMAIN;
    client_max_body_size 20m;
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_redirect http://localhost:$PORT/ /;
        proxy_redirect http://127.0.0.1:$PORT/ /;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/qasem-store /etc/nginx/sites-enabled/qasem-store
nginx -t && systemctl reload nginx

say "6/7 الجدار الناري"
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow OpenSSH >/dev/null; ufw allow 'Nginx Full' >/dev/null; echo "تم فتح المنافذ 80 و 443"
else
  echo "الجدار الناري غير مفعّل — لا حاجة لتغيير"
fi

say "7/7 شهادة SSL مجانية"
apt-get install -y -qq certbot python3-certbot-nginx > /dev/null
if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect; then
  echo; echo "✅ تم! افتح: https://$DOMAIN"
else
  echo; echo "⚠️ المتجر يعمل على: http://$DOMAIN"
  echo "لم تُصدر الشهادة بعد (غالباً سجل DNS لم ينتشر). أعد المحاولة بعد قليل بالأمر:"
  echo "   certbot --nginx -d $DOMAIN --redirect"
fi
echo "لوحة التحكم: https://$DOMAIN/admin"
echo "بيانات الدخول في الملف: $APP/.env (ADMIN_EMAIL و ADMIN_PASSWORD)"
