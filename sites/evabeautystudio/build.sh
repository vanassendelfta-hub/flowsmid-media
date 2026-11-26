#!/bin/sh
# Vercel-build voor evabeautystudio.flowsmid.nl: haalt de vastgepinde sitebestanden op en de foto's (Supabase-opslag).
set -e
C=${COMMIT:?}
B=https://cdn.jsdelivr.net/gh/vanassendelfta-hub/flowsmid-media@$C/sites/evabeautystudio
F=https://uywydquzvdbpfjjrwsbt.supabase.co/storage/v1/object/public/flowsmid-sites/evabeautystudio/ig
mkdir -p out/beheer out/logo out/img
curl -fsSL $B/index.html -o out/index.html
curl -fsSL $B/beheer/index.html -o out/beheer/index.html
curl -fsSL $B/logo/evabeautystudio-logo.svg -o out/logo/evabeautystudio-logo.svg
for f in ""; do
  [ -n "$f" ] || continue
  curl -fsSL "$F/$f" -o out/img/$f
done
ls -la out out/img
