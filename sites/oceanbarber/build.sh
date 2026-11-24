#!/bin/sh
# Vercel-build voor oceanbarber.flowsmid.nl: haalt de vastgepinde sitebestanden op en de Instagram-foto's (Supabase-opslag).
set -e
C=${COMMIT:?}
B=https://cdn.jsdelivr.net/gh/vanassendelfta-hub/flowsmid-media@$C/sites/oceanbarber
F=https://uywydquzvdbpfjjrwsbt.supabase.co/storage/v1/object/public/flowsmid-sites/oceanbarber/ig
mkdir -p out/beheer out/logo out/img
curl -fsSL $B/index.html -o out/index.html
curl -fsSL $B/beheer/index.html -o out/beheer/index.html
curl -fsSL $B/logo/oceanbarber-logo.svg -o out/logo/oceanbarber-logo.svg
for f in taper taper-2 baard fade baard-fade zaak harsen skinfade; do
  curl -fsSL "$F/$f.jpg" -o out/img/$f.jpg
done
ls -la out out/img
