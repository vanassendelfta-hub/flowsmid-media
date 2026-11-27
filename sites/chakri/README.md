# Chakri Dames- en Herenkapsalon (demo)

Afsprakensite met beheerportaal voor Chakri Dames- en Herenkapsalon, 't Plateau 17, 3202 GL Spijkenisse (Instagram onbekend). Gebouwd in de nachtelijke demobouw van 27-11-2026 op de basis van Barbershop Ocean (site) en Dinero (beheer).

- `index.html` is de website, `beheer/index.html` het portaal (kappersagenda, slug `chakri`), `logo/chakri-logo.svg` een voorlopig woordmerk.
- Data staat in Supabase, schema `flowsmid`, tabellen `kb_*`, slug `chakri`. Publiek via `kb_publiek`, `kb_tijden`, `kb_boeken`.
- Foto's staan in Supabase-opslag `flowsmid-sites/chakri/ig/` (overgenomen van hun eigen website) en worden bij de build opgehaald.
- Adres ('t Plateau 17), telefoon (0181 620266), openingstijden en soorten behandelingen van haar.expert. Hun domein chakrihairstylers.nl toont alleen een standaardpagina van de hoster; Facebook: ChakriHairstylers. Instagram niet gevonden. PRIJZEN en DUUR zijn VOORBEELDEN; de kappersnaam "Chakri" is voorlopig (naam van de salon).
- Gegenereerd met `maak.py` en `sites.py` uit de nachtelijke demobouw; aanpassen kan direct in de bestanden.
