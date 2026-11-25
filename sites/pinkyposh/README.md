# Pinky Posh (demo)

Afsprakensite met beheerportaal voor Pinky Posh, Korte Poolsterstraat 19, 3067 LZ Rotterdam (Instagram @pinkyposhalexandrium). Gebouwd in de nachtelijke demobouw van 25-11-2026 op de basis van Barbershop Ocean (site) en Dinero (beheer).

- `index.html` is de website, `beheer/index.html` het portaal (kappersagenda, slug `pinkyposh`), `logo/pinkyposh-logo.svg` een voorlopig woordmerk.
- Data staat in Supabase, schema `flowsmid`, tabellen `kb_*`, slug `pinkyposh`. Publiek via `kb_publiek`, `kb_tijden`, `kb_boeken`.
- Foto's staan in Supabase-opslag `flowsmid-sites/pinkyposh/ig/` (overgenomen van hun eigen website) en worden bij de build opgehaald.
- Geen prijzen gevonden (pinkyposh.nl toont alleen categorieën): behandelingen en prijzen zijn voorbeelden op basis van hun categorieën. De tweede medewerker "Junior stylist" is een voorlopige naam; Josh en Tami op hun site lijken templatefoto's en zijn niet opgenomen.
- Gegenereerd met `maak.py` en `sites.py` uit de nachtelijke demobouw; aanpassen kan direct in de bestanden.
