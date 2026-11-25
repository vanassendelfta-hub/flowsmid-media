#!/bin/sh
# Vercel-build voor barberholics.flowsmid.nl: haalt de vastgepinde sitebestanden op en de foto's (Supabase-opslag).
set -e
C=${COMMIT:?}
B=https://cdn.jsdelivr.net/gh/vanassendelfta-hub/flowsmid-media@$C/sites/barberholics
F=https://uywydquzvdbpfjjrwsbt.supabase.co/storage/v1/object/public/flowsmid-sites/barberholics/ig
mkdir -p out/beheer out/logo out/img
curl -fsSL $B/index.html -o out/index.html
curl -fsSL $B/beheer/index.html -o out/beheer/index.html
curl -fsSL $B/logo/barberholics-logo.svg -o out/logo/barberholics-logo.svg
for f in b1.jpg b2.jpg; do
  curl -fsSL "$F/$f" -o out/img/$f
done
ls -la out out/img
