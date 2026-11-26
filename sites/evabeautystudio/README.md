# Eva Beauty Studio (demo)

Afsprakensite met beheerportaal voor Eva Beauty Studio, Rotterdam,  (Instagram onbekend). Gebouwd in de nachtelijke demobouw van 26-11-2026 op de basis van Barbershop Ocean (site) en Dinero (beheer).

- `index.html` is de website, `beheer/index.html` het portaal (kappersagenda, slug `evabeautystudio`), `logo/evabeautystudio-logo.svg` een voorlopig woordmerk.
- Data staat in Supabase, schema `flowsmid`, tabellen `kb_*`, slug `evabeautystudio`. Publiek via `kb_publiek`, `kb_tijden`, `kb_boeken`.
- Foto's staan in Supabase-opslag `flowsmid-sites/evabeautystudio/ig/` (overgenomen van hun eigen website) en worden bij de build opgehaald.
- Alleen bekend via hun site eva-beauty-studio.lovable.app (titel: lash extensions, lash lifts en brow lifts in Rotterdam); die site was niet verder leesbaar. Adres, telefoon, openingstijden en Instagram onbekend. Behandelingen, prijzen, openingstijden en de naam "Eva" als stylist zijn VOORBEELDEN/voorlopig.
- Gegenereerd met `maak.py` en `sites.py` uit de nachtelijke demobouw; aanpassen kan direct in de bestanden.
