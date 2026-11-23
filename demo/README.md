# Demo-modus (rondleiding-account)

Eén inlogaccount (`demo`) dat door alle beheerschermen en portalen kan navigeren, maar nooit echte gegevens ziet.

- `demomodus.js` wordt live geserveerd op https://flowsmid.nl/demomodus.js (het Vercel-project `flowsmid` haalt het bij de build hier op, vastgepind op commit en sha1).
- Elke inlog-/beheerpagina laadt `<script src="https://flowsmid.nl/demomodus.js"></script>` als eerste script in `<head>`.
- Voor een account met `app_metadata.demo = true` beantwoordt het script alle Supabase-verzoeken (tabellen, rpc, opslag, edge functions) in de browser met nepgegevens. Inloggen zelf gaat echt.
- De database blokkeert het demo-account ook zelf: `013_demo_account.sql` (restrictive policy `demo_alleen_kijken` op elke tabel, en een event trigger die dat op nieuwe tabellen automatisch doet).
