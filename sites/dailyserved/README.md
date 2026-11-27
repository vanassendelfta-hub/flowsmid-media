# Daily Served (demo)

Afsprakensite met beheerportaal voor Daily Served, Korenbloemstraat 25, 3202 BM Spijkenisse (Instagram onbekend). Gebouwd in de nachtelijke demobouw van 27-11-2026 op de basis van Barbershop Ocean (site) en Dinero (beheer).

- `index.html` is de website, `beheer/index.html` het portaal (kappersagenda, slug `dailyserved`), `logo/dailyserved-logo.svg` een voorlopig woordmerk.
- Data staat in Supabase, schema `flowsmid`, tabellen `kb_*`, slug `dailyserved`. Publiek via `kb_publiek`, `kb_tijden`, `kb_boeken`.
- Foto's staan in Supabase-opslag `flowsmid-sites/dailyserved/ig/` (overgenomen van hun eigen website) en worden bij de build opgehaald.
- Adres, openingstijden (di-vr 10-22, za 10-17), team (Ridney, Stephanie), behandelingen, prijzen, duur en reviews (5,0 uit 86) van Fresha (fresha.com/a/daily-served-spijkenisse-korenbloemstraat-25-uvxqb1hn). Geen eigen website, geen telefoonnummer en geen Instagram-account gevonden; geen foto's.
- Gegenereerd met `maak.py` en `sites.py` uit de nachtelijke demobouw; aanpassen kan direct in de bestanden.
