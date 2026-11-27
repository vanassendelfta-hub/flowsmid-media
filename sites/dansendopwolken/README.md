# Dansend op Wolken (demo)

Afsprakensite met beheerportaal voor Dansend op Wolken, Lisstraat 84, 3202 JL Spijkenisse (Instagram @dansend_op_wolken_pedicure). Gebouwd in de nachtelijke demobouw van 27-11-2026 op de basis van Barbershop Ocean (site) en Dinero (beheer).

- `index.html` is de website, `beheer/index.html` het portaal (kappersagenda, slug `dansendopwolken`), `logo/dansendopwolken-logo.svg` een voorlopig woordmerk.
- Data staat in Supabase, schema `flowsmid`, tabellen `kb_*`, slug `dansendopwolken`. Publiek via `kb_publiek`, `kb_tijden`, `kb_boeken`.
- Foto's staan in Supabase-opslag `flowsmid-sites/dansendopwolken/ig/` (overgenomen van hun eigen website) en worden bij de build opgehaald.
- Adres, telefoon, mail, Instagram (@dansend_op_wolken_pedicure), openingstijden (eigen site: ma-wo 9-18, do 9-21, vr 9-17) en prijzen van dansendopwolken.nl en Salonkee (4,8 uit 183 reviews, sinds 2012). Duur per behandeling is GESCHAT (Salonkee toont geen duur). Teamnamen onbekend: de agenda heeft voorlopig twee rollen ("Voetzorg" en "Beauty") in plaats van namen. Geen foto's (Instagram en hun site-afbeeldingen niet bereikbaar vanuit de cloud).
- Gegenereerd met `maak.py` en `sites.py` uit de nachtelijke demobouw; aanpassen kan direct in de bestanden.
