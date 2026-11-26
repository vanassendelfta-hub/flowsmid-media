# Rijopleiding Heijmans (demo)

Afsprakensite met beheerportaal voor Rijopleiding Heijmans, Rijksstraatweg 118, Hellevoetsluis (Instagram @rijopleidingheijmans). Gebouwd in de nachtelijke demobouw van 26-11-2026 op de basis van Barbershop Ocean (site) en Dinero (beheer).

- `index.html` is de website, `beheer/index.html` het portaal (kappersagenda, slug `heijmans`), `logo/heijmans-logo.svg` een voorlopig woordmerk.
- Data staat in Supabase, schema `flowsmid`, tabellen `kb_*`, slug `heijmans`. Publiek via `kb_publiek`, `kb_tijden`, `kb_boeken`.
- Foto's staan in Supabase-opslag `flowsmid-sites/heijmans/ig/` (overgenomen van hun eigen website) en worden bij de build opgehaald.
- Alleen het Instagram-account en het adres zijn bekend; Instagram was vanuit de cloud niet leesbaar en er is geen website. Lessen, pakketten, prijzen, lestijden en de instructeursnaam ("Heijmans") zijn VOORBEELDEN/voorlopig.
- Gegenereerd met `maak.py` en `sites.py` uit de nachtelijke demobouw; aanpassen kan direct in de bestanden.
