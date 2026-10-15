#!/usr/bin/env bash
# يجهّز حزمة جاهزة للرفع على استضافة cPanel (Namecheap) — الناتج: deploy/out/qasem-store.zip
set -euo pipefail
cd "$(dirname "$0")/.."

npx prisma generate
npx next build

OUT=deploy/out/qasem-store
rm -rf deploy/out && mkdir -p "$OUT"
cp -r .next/standalone/. "$OUT/"
mkdir -p "$OUT/.next" && cp -r .next/static "$OUT/.next/static"
[ -d public ] && cp -r public "$OUT/public"

# محركات Prisma لكل أنواع الخوادم + ملف المخطط
mkdir -p "$OUT/node_modules/.prisma/client"
cp node_modules/.prisma/client/*.node node_modules/.prisma/client/schema.prisma "$OUT/node_modules/.prisma/client/"

# قاعدة بيانات جاهزة بالبيانات التجريبية + الصور
mkdir -p "$OUT/data" "$OUT/storage"
DATABASE_URL="file:$(pwd)/$OUT/data/store.db" npx prisma db push --skip-generate >/dev/null
DATABASE_URL="file:$(pwd)/$OUT/data/store.db" UPLOAD_DIR="$OUT/storage/uploads" npx tsx prisma/seed.ts
cp deploy/app.js "$OUT/app.js"
rm -f "$OUT/.env"
cp deploy/env.production.example "$OUT/.env"
SECRET=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')
PASS="Qs-$(node -e 'console.log(require("crypto").randomBytes(6).toString("base64url"))')"
sed -i "s/__AUTH_SECRET__/$SECRET/; s/__ADMIN_PASSWORD__/$PASS/" "$OUT/.env"
echo "كلمة مرور لوحة التحكم: $PASS"

# حذف ما لا يلزم على خوادم CloudLinux (glibc) لتصغير الحجم
rm -rf "$OUT"/node_modules/@img/sharp-wasm32 "$OUT"/node_modules/@img/*musl* "$OUT"/node_modules/typescript \
  "$OUT"/node_modules/.prisma/client/libquery_engine-debian-*.node

# ملفان: التطبيق + محركات قاعدة البيانات (يُفك ضغطهما في نفس المجلد)
cd deploy/out
zip -9 -qr qasem-store-1-app.zip qasem-store -x 'qasem-store/node_modules/.prisma/client/*.node'
zip -9 -qr qasem-store-2-engines.zip qasem-store/node_modules/.prisma/client/*.node
du -sh ./*.zip
