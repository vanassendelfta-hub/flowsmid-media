# Beauty Lab Rdam (demo)

Afsprakensite met beheerportaal voor Beauty Lab Rdam, Nieuwe Binnenweg 133c, Rotterdam-West (Instagram onbekend). Gebouwd in de nachtelijke demobouw van 26-11-2026 op de basis van Barbershop Ocean (site) en Dinero (beheer).

- `index.html` is de website, `beheer/index.html` het portaal (kappersagenda, slug `beautylabrdam`), `logo/beautylabrdam-logo.svg` een voorlopig woordmerk.
- Data staat in Supabase, schema `flowsmid`, tabellen `kb_*`, slug `beautylabrdam`. Publiek via `kb_publiek`, `kb_tijden`, `kb_boeken`.
- Foto's staan in Supabase-opslag `flowsmid-sites/beautylabrdam/ig/` (overgenomen van hun eigen website) en worden bij de build opgehaald.
- Prijzen, duur, openingstijden (ma t/m zo 10:00-21:00), team (Erica) en reviews van Treatwell (treatwell.nl/salon/beauty-lab-rdam). Geen eigen website, geen telefoonnummer en geen Instagram-account gevonden; geen foto's (Treatwell-afbeeldingen waren niet op te halen).
- Gegenereerd met `maak.py` en `sites.py` uit de nachtelijke demobouw; aanpassen kan direct in de bestanden.
