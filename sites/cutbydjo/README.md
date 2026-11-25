# Cut by DJo (demo)

Afsprakensite met beheerportaal voor Cut by DJo, Winterakker 1, 3206 TG Spijkenisse (Instagram @cut.by.djo). Gebouwd in de nachtelijke demobouw van 25-11-2026 op de basis van Barbershop Ocean (site) en Dinero (beheer).

- `index.html` is de website, `beheer/index.html` het portaal (kappersagenda, slug `cutbydjo`), `logo/cutbydjo-logo.svg` een voorlopig woordmerk.
- Data staat in Supabase, schema `flowsmid`, tabellen `kb_*`, slug `cutbydjo`. Publiek via `kb_publiek`, `kb_tijden`, `kb_boeken`.
- Foto's staan in Supabase-opslag `flowsmid-sites/cutbydjo/ig/` (overgenomen van hun eigen website) en worden bij de build opgehaald.
- Prijzen van cutbydjo.nl; duur ingeschat (Fresha toont alleen heren). Openingstijden ma t/m wo 9:30-17:00 volgens cutbydjo.nl (Fresha noemt ook do t/m za, waarschijnlijk de tweede barbier). Team: alleen Jo (de tweede barbier heet op Fresha Abel, op de site Eunice; niet opgenomen).
- Gegenereerd met `maak.py` en `sites.py` uit de nachtelijke demobouw; aanpassen kan direct in de bestanden.
