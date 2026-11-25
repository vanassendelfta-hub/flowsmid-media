# Barber Holics (demo)

Afsprakensite met beheerportaal voor Barber Holics, Eikenlaan 102, 3203 BM Spijkenisse (Instagram @barberholics1982). Gebouwd in de nachtelijke demobouw van 25-11-2026 op de basis van Barbershop Ocean (site) en Dinero (beheer).

- `index.html` is de website, `beheer/index.html` het portaal (kappersagenda, slug `barberholics`), `logo/barberholics-logo.svg` een voorlopig woordmerk.
- Data staat in Supabase, schema `flowsmid`, tabellen `kb_*`, slug `barberholics`. Publiek via `kb_publiek`, `kb_tijden`, `kb_boeken`.
- Foto's staan in Supabase-opslag `flowsmid-sites/barberholics/ig/` (overgenomen van hun eigen website) en worden bij de build opgehaald.
- Geen prijzen gevonden (barberholics.nl en Fresha tonen ze niet; boeken gaat via onlineafspraken.nl): behandelingen en prijzen zijn voorbeelden. Openingstijden van barberholics.nl. Foto's van barberholics.nl.
- Gegenereerd met `maak.py` en `sites.py` uit de nachtelijke demobouw; aanpassen kan direct in de bestanden.
