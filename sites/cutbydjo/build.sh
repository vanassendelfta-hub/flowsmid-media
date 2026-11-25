#!/bin/sh
# Vercel-build voor cutbydjo.flowsmid.nl: haalt de vastgepinde sitebestanden op en de foto's (Supabase-opslag).
set -e
C=${COMMIT:?}
B=https://cdn.jsdelivr.net/gh/vanassendelfta-hub/flowsmid-media@$C/sites/cutbydjo
F=https://uywydquzvdbpfjjrwsbt.supabase.co/storage/v1/object/public/flowsmid-sites/cutbydjo/ig
mkdir -p out/beheer out/logo out/img
curl -fsSL $B/index.html -o out/index.html
curl -fsSL $B/beheer/index.html -o out/beheer/index.html
curl -fsSL $B/logo/cutbydjo-logo.svg -o out/logo/cutbydjo-logo.svg
for f in logo-wit.png p1.jpg p2.jpg p3.jpg p4.jpg p5.jpg p6.jpg p7.jpg zaak.jpg; do
  curl -fsSL "$F/$f" -o out/img/$f
done
ls -la out out/img
