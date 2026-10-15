#!/usr/bin/env bash
# يجهّز حزمة لخادم Ubuntu (VPS) — يعتمد على ناتج package-cpanel.sh
# الناتج: deploy/out/qasem-store-vps.tar.gz  ثم على الخادم: bash qasem-store/setup-vps.sh shop.example.com
set -euo pipefail
cd "$(dirname "$0")/.."
[ -d deploy/out/qasem-store ] || ./deploy/package-cpanel.sh
STAGE=deploy/out/vps
rm -rf "$STAGE" && mkdir -p "$STAGE"
cp -a deploy/out/qasem-store "$STAGE/"
rm -f "$STAGE"/qasem-store/node_modules/.prisma/client/libquery_engine-*.node
cp node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node "$STAGE/qasem-store/node_modules/.prisma/client/"
cp deploy/setup-vps.sh "$STAGE/qasem-store/setup-vps.sh"
tar -czf deploy/out/qasem-store-vps.tar.gz -C "$STAGE" qasem-store
du -sh deploy/out/qasem-store-vps.tar.gz
