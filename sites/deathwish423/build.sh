#!/bin/sh
# Vercel-build voor deathwish423.flowsmid.nl: haalt de vastgepinde sitebestanden op.
set -e
C=${COMMIT:?}
B=https://cdn.jsdelivr.net/gh/vanassendelfta-hub/flowsmid-media@$C/sites/deathwish423
mkdir -p out/img out/leden out/beheer
curl -fsSL $B/index.html -o out/index.html
curl -fsSL $B/intro-rijder.js -o out/intro-rijder.js
curl -fsSL $B/portaal.html -o out/leden/index.html
cp out/leden/index.html out/beheer/index.html
for f in deel-schild.webp deel-boven.webp deel-onder.webp deel-kogel.webp deel-bg.webp deel-dffd.webp deel-n423.webp logo-volledig.webp vest.webp 423.webp support.webp og.jpg favicon.png oprichter.webp; do
  curl -fsSL "$B/img/$f" -o out/img/$f
done
ls -la out out/img
