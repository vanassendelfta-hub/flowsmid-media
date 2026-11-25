# Gereedschap nachtelijke demobouw

Gebruikt in de run van 25-11-2026 (Cut by DJo, Barber Holics, Pinky Posh). Paden in de scripts gaan uit van `/home/claude/bouw` (kopieer deze map daarheen).

- `sites.py`: per demo de gegevens (naam, adres, thema-kleuren, fonts, teksten, behandelingen, rooster, foto's).
- `maak.py <uitmap>`: maakt per demo `index.html` (site op basis van Barbershop Ocean, kleuren automatisch omgezet), `beheer/index.html` (Ocean/Dinero-beheer met eigen voorbeelddata), logo, `build.sh`, `vercel.json`, README. Verwacht `ocean-style.css`, `ocean-script.html` en `ocean-beheer.html` uit branch `sites-oceanbarber` (zie maak.py).
- `sql2.py`: schrijft per demo de SQL voor klant, kb_zaken, kappers, rooster, diensten, domein, klant_log en voorbeeldafspraken.
- `mock.py`, `shot.js`, `beh.js`: lokaal controleren met Playwright (Supabase-RPC's worden nagebootst).
- `video/`: de demovideo (1080x1920, 30 fps, ca. 51 s): `render.sh <slug> <Bestand.mp4>`; `film.js` filmt de site en het beheer frame voor frame (klok en animaties vastgezet), `muziek.py` maakt een eigen deuntje. Foto's worden in de video vervangen door een kleurvlak (de container kan Supabase-opslag niet bereiken); daarom scrolt de video langs de prijzen en het boeken.

Let op: vanuit de cloud-container zijn Instagram, Supabase-opslag en *.flowsmid.nl niet bereikbaar. Foto's van de eigen site van een prospect zijn opgehaald met een eenmalige edge function (`demo-foto-import`, vaste URL-lijst, daarna op 410 gezet) naar `flowsmid-sites/<slug>/ig/`.
