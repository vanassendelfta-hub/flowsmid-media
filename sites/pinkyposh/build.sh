#!/bin/sh
# Vercel-build voor pinkyposh.flowsmid.nl: haalt de vastgepinde sitebestanden op en de foto's (Supabase-opslag).
set -e
C=${COMMIT:?}
B=https://cdn.jsdelivr.net/gh/vanassendelfta-hub/flowsmid-media@$C/sites/pinkyposh
F=https://uywydquzvdbpfjjrwsbt.supabase.co/storage/v1/object/public/flowsmid-sites/pinkyposh/ig
mkdir -p out/beheer out/logo out/img
curl -fsSL $B/index.html -o out/index.html
curl -fsSL $B/beheer/index.html -o out/beheer/index.html
curl -fsSL $B/logo/pinkyposh-logo.svg -o out/logo/pinkyposh-logo.svg
for f in ingard.jpg; do
  curl -fsSL "$F/$f" -o out/img/$f
done
ls -la out out/img
