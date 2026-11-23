# Deathwish Brotherhood (demo)

Homepagina met intro voor Deathwish Brotherhood Netherlands (prospect in Flowsmid).

- `index.html` is de hele site. Er zijn twee intro's:
  - `rijder` (standaard, `intro-rijder.js`): een member rijdt op zijn chopper binnen, stapt af, loopt een paar passen, draait zich om; de camera zoomt in op het rugembleem en dat komt in 3D naar voren.
  - `opbouw` (de eerste intro): het rugembleem bouwt zich stuk voor stuk op: schild, bovenboog DEATHWISH, onderboog NETHERLANDS, kogel, BG, DFFD en 423.
  - De eigenaar kiest de actieve intro in Beheer > Homepage (kolom `flowsmid.mc_clubs.intro`, publiek via `mc_publiek`). Testen kan met `?intro=opbouw` of `?intro=rijder`; zonder antwoord van de database binnen 1,5 s geldt `STANDAARD_INTRO` in `index.html`.
- `img/deel-*.webp` zijn de losse onderdelen, uitgeknipt uit de aangeleverde afbeeldingen (embleem op zwart; DFFD en 423 uit de versie met extra bogen). `logo-volledig.webp` is het samengestelde embleem.
- Gehost op Vercel (project `deathwish423`, domein deathwish423.flowsmid.nl). `build.sh` haalt de bestanden via jsDelivr op een vastgepinde commit op.
- `portaal.html` is de ledenomgeving en wordt bij de build gezet op `/leden` (members: prikbord met reacties, events, ledenlijst, eigen wachtwoord) en `/beheer` (eigenaar met Flowsmid-account: members aanmaken zonder e-mail, rechten, toegang, nieuw wachtwoord, events openbaar/besloten, bericht op de homepage).
- Data in Supabase, schema `flowsmid`, tabellen `mc_*` (mc_clubs, mc_leden, mc_events, mc_posts, mc_reacties, mc_mededelingen), RLS via `mc_rol`/`mc_recht`. Homepage leest `mc_publiek` (openbare events en zichtbare berichten).
- Member-accounts via edge function `mc-account` (inlog `<naam>@deathwish423.lid.flowsmid.nl`, het member typt alleen `<naam>`).
- `img/first4.webp`: embleem van de First 4 Outlaws (sectie "De First 4", in deze volgorde: Marlon Captain, Marko President, Ray Nomad, Henk Sergeant at Arms). De eerdere oprichtersfoto is op verzoek verwijderd.
- Teksten zijn voorbeeldteksten; contactgegevens en de betekenis van BG en DFFD nog navragen.

## Rangen
Elke club heeft een eigen lijst rangen in `flowsmid.mc_rangen` (naam, volgorde; standaard President t/m Hangaround). Een member heeft `mc_leden.rang_id`. De eigenaar beheert de lijst via Beheer > Members > Rangen en kiest per member een rang. De rang staat in de ledenlijst (gesorteerd op rang), bij berichten en reacties op het prikbord en bij Mijn account. Het oude vrije veld `functie` wordt niet meer gebruikt.

## Doneerknop
De eigenaar plakt in Beheer > Homepage > Doneerknop de (maandelijkse) Tikkie-link (`mc_clubs.doneer_url`, alleen https). Zolang er een link is, staat er een knop Doneer in de menubalk, in de hero en in het support-blok. Na 30 dagen krijgt de eigenaar in Beheer een melding dat de link waarschijnlijk verlopen is.
