/* Flowsmid actie: aanmelding komt binnen als aanvraag (slug flowsmid-actie). */
(function () {
  'use strict';
  var URL_SB = 'https://uywydquzvdbpfjjrwsbt.supabase.co', KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5d3lkcXV6dmRicGZqanJ3c2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMTI5NDEsImV4cCI6MjEwNjg4ODk0MX0.4C76JwtfcRx3d39kvU23NRpKPKt_A5FkmdUpoqDbf5M';
  var $ = function (id) { return document.getElementById(id); };
  $('aanmeld').addEventListener('submit', async function (e) {
    e.preventDefault();
    var f = $('fout'), k = $('fKnop');
    var naam = $('fNaam').value.trim(), bedrijf = $('fBedrijf').value.trim(), tel = $('fTel').value.trim(), mail = $('fMail').value.trim();
    var m = !naam ? 'Vul je naam in.' : !bedrijf ? 'Vul je bedrijfsnaam in.' : !/^[0-9 +()-]{8,20}$/.test(tel) ? 'Vul een geldig telefoonnummer in.' : mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) ? 'Dit e-mailadres klopt niet.' : '';
    if (m) { f.textContent = m; f.hidden = false; return; }
    f.hidden = true; k.disabled = true; k.textContent = 'Versturen…';
    try {
      var r = await fetch(URL_SB + '/rest/v1/rpc/actie_aanmelden', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Profile': 'flowsmid', apikey: KEY, Authorization: 'Bearer ' + KEY },
        body: JSON.stringify({ p: { naam: naam, bedrijf: bedrijf, instagram: $('fInsta').value.trim(), telefoon: tel, email: mail || null, omschrijving: $('fWat').value.trim(), website: $('fLok').value } }) });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(j.message || 'Versturen lukte niet. Probeer het opnieuw.');
      $('velden').hidden = true; $('gelukt').hidden = false;
    } catch (err) { f.textContent = err.message; f.hidden = false; k.disabled = false; k.textContent = 'Claim mijn plek'; }
  });
})();
