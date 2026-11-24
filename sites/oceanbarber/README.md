# Barbershop Ocean (demo)

Afsprakensite met beheerportaal voor Barbershop Ocean, Lokhorsterland 5, Hoogvliet Rotterdam (Instagram @barbershop.ocean). Gebouwd op dezelfde basis als Barbershop Dinero.

- `index.src.html` is de bron van de website; `python3 maak-index.py` zet het logo inline voor de intro en schrijft `index.html`.
- `beheer/` is het portaal (kopie van Dinero): agenda (dag/week/maand), afspraken, rooster en tijdsloten, team met accounts zonder e-mail, behandelingen en instellingen.
- `logo/oceanbarber-logo.svg` is het nagemaakte logo (badge met aquarelband, schaar met snor, lint "OCEAN", "Best in town"). Tekst is omgezet naar paden (Alfa Slab One en Roboto Slab), dus het logo heeft geen webfonts nodig.
- Data staat in Supabase, schema `flowsmid`, tabellen `kb_*`, slug `oceanbarber`. Publiek via `kb_publiek`, `kb_tijden`, `kb_boeken`.
- Behandelingen: de omschrijving begint met de groep (`Heren · ...`, `Dames · ...`, `Beauty · ...`); de website maakt daar filterknoppen van.
- Prijzen en openingstijden komen van barbershop-ocean.salonized.com (24-11-2026). Teamnamen zijn voorlopig (Ocean, Sara) en aan te passen in het beheer.
- Foto's komen uit Supabase-opslag `flowsmid-sites/oceanbarber/ig/` (overgenomen van Instagram) en worden bij de build opgehaald.
