# Barbershop Dinero (demo)

Afsprakensite met beheerportaal voor Barbershop Dinero, Spijkenisse (Instagram @barbershopdinero).

- `index.src.html` is de bron van de website; `python3 maak-index.py` zet het logo inline voor de intro en schrijft `index.html`.
- `beheer/` is het portaal: agenda (dag/week/maand), afspraken, rooster en tijdsloten, team met accounts zonder e-mail, behandelingen en instellingen.
- `logo/dinero-logo.svg` is het nagemaakte logo (effileerschaar met lint en "Dinero" in script).
- Data staat in Supabase, schema `flowsmid`, tabellen `kb_*` (kappersagenda). Publiek via `kb_publiek`, `kb_tijden`, `kb_boeken`.
- Kappersaccounts maakt de eigenaar via de edge function `kb-account` (inlog `<naam>@dinero.kapper.flowsmid.nl`, de kapper typt alleen `<naam>`).
- Foto's komen uit Supabase-opslag `flowsmid-sites/dinero/ig/` (overgenomen van Instagram) en worden bij de build opgehaald.
