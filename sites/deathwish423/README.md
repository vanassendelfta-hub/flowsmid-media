# Deathwish Brotherhood (demo)

Homepagina met intro voor Deathwish Brotherhood Netherlands (prospect in Flowsmid).

- `index.html` is de hele site. In de intro bouwt het rugembleem zich stuk voor stuk op: schild, bovenboog DEATHWISH, onderboog NETHERLANDS, kogel, BG, DFFD en 423.
- `img/deel-*.webp` zijn de losse onderdelen, uitgeknipt uit de aangeleverde afbeeldingen (embleem op zwart; DFFD en 423 uit de versie met extra bogen). `logo-volledig.webp` is het samengestelde embleem.
- Gehost op Vercel (project `deathwish423`, domein deathwish423.flowsmid.nl). `build.sh` haalt de bestanden via jsDelivr op een vastgepinde commit op.
- `portaal.html` is de ledenomgeving en wordt bij de build gezet op `/leden` (members: prikbord met reacties, events, ledenlijst, eigen wachtwoord) en `/beheer` (eigenaar met Flowsmid-account: members aanmaken zonder e-mail, rechten, toegang, nieuw wachtwoord, events openbaar/besloten, bericht op de homepage).
- Data in Supabase, schema `flowsmid`, tabellen `mc_*` (mc_clubs, mc_leden, mc_events, mc_posts, mc_reacties, mc_mededelingen), RLS via `mc_rol`/`mc_recht`. Homepage leest `mc_publiek` (openbare events en zichtbare berichten).
- Member-accounts via edge function `mc-account` (inlog `<naam>@deathwish423.lid.flowsmid.nl`, het member typt alleen `<naam>`).
- `img/oprichter.webp`: foto van Mar met het zwarte balkje over de ogen ingebrand (origineel staat niet online).
- Teksten zijn voorbeeldteksten; contactgegevens en de betekenis van BG en DFFD nog navragen.
