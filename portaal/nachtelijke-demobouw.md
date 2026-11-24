# Nachtelijke demobouw voor de opvolging

Dit is het draaiboek voor de geplande taak die elke nacht draait. Anthony zet een prospect in de opvolging
(Mijn Flowsmid, Vandaag, "Prospect toevoegen", of "In de opvolging zetten" op een prospect). Dan staat
`demo_status = 'aangevraagd'` in `flowsmid.prospects`. De taak bouwt per prospect het demopakket en zet de
berichten klaar, zodat alles klaarstaat als de fase "Link sturen" aanbreekt (na 1 à 2 dagen opwarmen).

Flowsmid doet zelf **niets op Instagram**: niet volgen, liken, reageren of DM'en. Alleen lezen wat publiek is.

## Gegevens

- Supabase-project `uywydquzvdbpfjjrwsbt`, schema `flowsmid`.
- `prospects`: `id, naam, plaats, adres, telefoon, email, instagram, bron_link, branche, soort, kans, notitie, klant_id,
  opvolg_fase, volgende_actie, demo_status, demo_aangevraagd_op, demo_klaar_op, demo_url, demo_video, demo_fout, berichten, opvolg_log`.
- Werkwijze en voorbeelden: projectgeheugen `flowsmid-demo-werkwijze`, en de branches `sites-oceanbarber` en `sites-dinero`
  van deze repository (README per site).

## Stappen per prospect

Pak hooguit 3 prospects per nacht, oudste `demo_aangevraagd_op` eerst:

```sql
select * from flowsmid.prospects where demo_status = 'aangevraagd' order by demo_aangevraagd_op limit 3;
```

1. **Claimen**: `update flowsmid.prospects set demo_status = 'bezig' where id = ... and demo_status = 'aangevraagd'`.
2. **Gegevens verzamelen** uit `bron_link`, `instagram` en `website`: naam, adres, telefoon, openingstijden, diensten en prijzen
   (Salonized, Fresha, Treatwell en eigen sites laten zich meestal lezen met WebFetch), kleuren en stijl, logo, een paar foto's,
   en één concreet "haakje" uit hun posts of pagina (een behandeling, een specialiteit, iets waar ze trots op zijn).
   Lukt Instagram niet, werk dan met wat wel lukt en noteer wat ontbreekt.
3. **Klant aanmaken** als `klant_id` leeg is: `klanten` (status 'Prospect', gegevens overnemen), `prospects.klant_id` zetten,
   `klant_log` regel "Demo automatisch gebouwd".
4. **Demo-site bouwen** zoals bij Barbershop Ocean (barbershops: kappersagenda `kb_*`, beheer = kopie van Dinero; andere branches:
   de passende eerdere demo als basis). Branch `sites-<slug>` in deze repository, Vercel-project `<slug>` in team
   `team_KmdJ85SaFyrrsCbVPhV6bkCB` met `build.sh` + vastgepinde COMMIT, domein `<slug>.flowsmid.nl`.
   Foto's: in de repository zetten en met `flowsmid.demo_bestand_importeren` of via jsDelivr laden.
   Verzonnen teamnamen zijn duidelijk voorlopig; noem ze in `demo_fout` niet, maar wel in `klant_log`.
5. **Product** in `producten`: naam "Website met online afspraken (demo)" (of passend), soort 'Website', status 'Demo',
   `url` en `beheer_url`.
6. **Video** maken met de skill `flowsmid-demovideo` (beheer gefilmd met "Rondkijken met voorbeelddata").
   Commit de mp4 in de site-branch onder `sites/<slug>/video/` en zet hem in de werkmap:
   ```sql
   select flowsmid.demo_bestand_importeren('<klant_id>', 'https://cdn.jsdelivr.net/gh/vanassendelfta-hub/flowsmid-media@<commit>/sites/<slug>/video/<naam>.mp4', '<naam>.mp4');
   -- daarna: select status_code, content from net._http_response where id = <teruggegeven id>;
   ```
   Het antwoord bevat `pad`; zet dat in `prospects.demo_video`.
7. **Berichten klaarzetten** in `prospects.berichten` (jsonb), in het Nederlands, kort, je-vorm, als Anthony van Flowsmid uit Spijkenisse:
   - `haakje`: één zin over wat je zag bij hen (wordt getoond bij opwarmen en langsgaan).
   - `opening`: compliment op iets concreets van hen, wie je bent, dat je als cadeautje al een eigen website hebt gemaakt,
     zonder kosten of verplichtingen, en de vraag of je de link mag sturen. Geen link in dit bericht.
   - `link`: de demolink, wat het oplevert (klanten boeken zelf, zonder platform ertussen), `%VIDEO%` als plek voor de videolink
     (wordt bij het kopiëren ingevuld), echte namen en foto's gratis, demo staat een week online, en een open vraag.
   - `reminder`: kort en vriendelijk, met de demolink, "ook als het niks voor jullie is".
   - `langsgaan`: 4 à 5 gesprekspunten, inclusief één duidelijke prijs (uit de prospect-notitie als die er is).
8. **Afronden**: `demo_status = 'klaar'`, `demo_klaar_op = now()`, `demo_url = 'https://<slug>.flowsmid.nl'`,
   en een regel in `opvolg_log` ("Demo gebouwd"). Verander `opvolg_fase` en `volgende_actie` niet.

Lukt het niet: `demo_status = 'fout'` met in `demo_fout` in één zin wat er mis ging en wat Anthony kan doen.
Anthony ziet dat op het Overzicht en kan op de prospect "Opnieuw proberen" kiezen.

Alleen berichten klaarzetten (geen demo nodig): prospects met `opvolg_fase` gevuld, `berichten = '{}'` en `demo_status` leeg
krijgen ook `opening`, `reminder`, `langsgaan` en `haakje`.
