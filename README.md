# Mijn Flowsmid: onderdeel Opvolging

`portaal/opvolging.js` voegt aan Mijn Flowsmid (alleen beheer) toe:

- het scherm **Vandaag** (`#/vandaag`): per prospect de taak van vandaag, met Open profiel, Open DM, Kopieer bericht, Gedaan, Reageerde, Later en Geen interesse;
- het blok **Wat moet ik nu doen?** bovenaan het Overzicht, met de verkooppijplijn;
- het blok **Opvolging** op de pagina van een prospect.

Het bestand wordt geladen door `mijn/config.js` van flowsmid.nl via jsDelivr, vastgepind op een commit.
Na een wijziging: commit hier, en zet de nieuwe commit in `config.js` van het Vercel-project flowsmid.

Gegevens staan in `flowsmid.prospects` (kolommen `opvolg_fase`, `volgende_actie`, `demo_*`, `berichten`, `opvolg_log`).
De nachtelijke taak bouwt demo's voor prospects met `demo_status = 'aangevraagd'`; zie `portaal/nachtelijke-demobouw.md`.
