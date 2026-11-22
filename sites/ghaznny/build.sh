#!/bin/sh
# Vercel-build voor ghaznny.flowsmid.nl: haalt de vastgepinde sitebestanden op en de foto's van ghaznny.com (JouwWeb-CDN).
set -e
C=${COMMIT:?}
B=https://cdn.jsdelivr.net/gh/vanassendelfta-hub/flowsmid-media@$C/sites/ghaznny
J=https://primary.jwwb.nl
mkdir -p out/beheer out/logo out/img
curl -fsSL $B/index.html -o out/index.html
curl -fsSL $B/beheer/index.html -o out/beheer/index.html
curl -fsSL $B/logo/ghaznny-logo.svg -o out/logo/ghaznny-logo.svg
foto() { curl -fsSL "$J/$2?enable-io=true&enable=upscale&width=$3" -o out/img/$1; }
E=public/u/q/n/temp-rrgqvsnouuystiqbumhd
foto salon.jpg $E/img_4636-standard.jpg 2000
foto knippen.jpg $E/7ab04a39-5086-4222-af53-1b5e356e5c93-high.jpg 1000
foto kleur.jpg $E/f01cee7e-f6f6-4aec-8377-92f4638626ba-high.jpg 1000
foto over.jpg $E/img_4648-standard.jpg 1200
foto clinic.jpg pexels/50/5069493.jpeg 900
foto verzorging.jpg pexels/77/7755473.jpeg 900
foto knipbeurt.jpg pexels/74/7447133.jpeg 1000
foto fade.jpg pexels/43/4351728.jpeg 1000
foto clinicruimte.jpg pexels/13/13068380.jpeg 1000
foto fades.jpg pexels/10/10475172.jpeg 1200
foto kapperstoel.jpg pexels/39/3993293.jpeg 900
foto clinic-wit.jpg pexels/10/10521230.jpeg 900
foto baard.jpg pexels/39/3998431.jpeg 900
foto salon-donker.jpg pexels/71/7195797.jpeg 1400
foto openingstijden.jpg pexels/71/7195821.jpeg 1400
foto afspraak.jpg pexels/84/8467964.jpeg 1800
ls -la out out/img
