#!/bin/sh
# Vercel-build voor dinero.flowsmid.nl: haalt de vastgepinde sitebestanden op en de Instagram-foto's (Supabase-opslag).
set -e
C=${COMMIT:?}
B=https://cdn.jsdelivr.net/gh/vanassendelfta-hub/flowsmid-media@$C/sites/dinero
F=https://uywydquzvdbpfjjrwsbt.supabase.co/storage/v1/object/public/flowsmid-sites/dinero/ig
mkdir -p out/beheer out/logo out/img
curl -fsSL $B/index.html -o out/index.html
curl -fsSL $B/beheer/index.html -o out/beheer/index.html
curl -fsSL $B/logo/dinero-logo.svg -o out/logo/dinero-logo.svg
for f in vacature afro barber fade-baard dreads kids eigenaar fade-zij fade profiel; do
  curl -fsSL "$F/$f.jpg" -o out/img/$f.jpg
done
ls -la out out/img
