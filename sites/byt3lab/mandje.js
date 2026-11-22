/* Byt3lab mandje: bestellen en betalen met Tikkie. De prijs wordt in de database opnieuw berekend. */
(function () {
  'use strict';
  var URL_SB = 'https://uywydquzvdbpfjjrwsbt.supabase.co', KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5d3lkcXV6dmRicGZqanJ3c2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMTI5NDEsImV4cCI6MjEwNjg4ODk0MX0.4C76JwtfcRx3d39kvU23NRpKPKt_A5FkmdUpoqDbf5M';
  var OPSLAG = 'b3l-mandje', $ = function (id) { return document.getElementById(id); };
  var regels = [];
  try { regels = JSON.parse(localStorage.getItem(OPSLAG) || '[]') || []; } catch (e) { regels = []; }
  function bewaar() { try { localStorage.setItem(OPSLAG, JSON.stringify(regels)); } catch (e) {} }
  function eur(n) { return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0); }
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { var v = attrs[k]; if (v == null || v === false) return; if (k === 'text') n.textContent = v; else if (k === 'class') n.className = v; else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v); else n.setAttribute(k, v); });
    (kids || []).forEach(function (c) { if (c != null && c !== false) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function bestelbaar(p) { return p && p.prijs !== null && p.prijs !== undefined && (p.status === 'Te koop' || p.status === 'Op bestelling'); }
  /* Houd het mandje gelijk aan wat er nu in de shop staat (prijs, naam, foto). */
  function bijwerken() {
    var lijst = window.__producten; if (!lijst) return;
    regels = regels.filter(function (r) { var p = lijst.find(function (x) { return x.id === r.id; }); if (!bestelbaar(p)) return false; r.naam = p.naam; r.prijs = Number(p.prijs); r.foto = (p.fotos || [])[0]; return true; });
    bewaar();
  }
  function totaal() { return regels.reduce(function (s, r) { return s + r.prijs * r.aantal; }, 0); }
  function knop() {
    var n = regels.reduce(function (s, r) { return s + r.aantal; }, 0);
    $('mandKnop').hidden = !n; $('mandAantal').textContent = n;
  }
  function teken() {
    var doel = $('mandRegels');
    if (!regels.length) doel.replaceChildren(el('p', { class: 'm-klein', text: 'Je mandje is leeg.' }));
    else doel.replaceChildren.apply(doel, regels.map(function (r, i) {
      return el('div', { class: 'mregel' }, [
        r.foto ? el('img', { src: r.foto, alt: '' }) : null,
        el('div', { class: 'mi' }, [el('b', { text: r.naam }), el('span', { text: eur(r.prijs) + ' per stuk' })]),
        el('div', { class: 'aantal' }, [
          el('button', { type: 'button', 'aria-label': 'Eén minder', onclick: function () { r.aantal--; if (r.aantal < 1) regels.splice(i, 1); bewaar(); teken(); knop(); } }, ['−']),
          el('output', { text: String(r.aantal) }),
          el('button', { type: 'button', 'aria-label': 'Eén meer', onclick: function () { r.aantal = Math.min(50, r.aantal + 1); bewaar(); teken(); knop(); } }, ['+'])
        ])
      ]);
    }));
    $('mandTotaal').textContent = eur(totaal());
    $('bKnop').disabled = !regels.length;
  }
  function open() { bijwerken(); teken(); knop(); $('bestel').hidden = false; $('bGelukt').hidden = true; $('mand').hidden = false; document.body.style.overflow = 'hidden'; }
  function dicht() { $('mand').hidden = true; document.body.style.overflow = ''; }
  window.Mandje = {
    bestelbaar: bestelbaar,
    voegToe: function (p) {
      var r = regels.find(function (x) { return x.id === p.id; });
      if (r) r.aantal = Math.min(50, r.aantal + 1); else regels.push({ id: p.id, naam: p.naam, prijs: Number(p.prijs), foto: (p.fotos || [])[0], aantal: 1 });
      bewaar(); knop(); var k = $('mandKnop'); k.classList.remove('bots'); void k.offsetWidth; k.classList.add('bots');
      open();
    },
    open: open
  };
  $('mandKnop').addEventListener('click', open);
  $('mand').addEventListener('click', function (e) { if (e.target.closest('[data-mdicht]')) dicht(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('mand').hidden) dicht(); });
  document.querySelectorAll('input[name=lev]').forEach(function (r) { r.addEventListener('change', function () { $('bAdres').hidden = r.value !== 'Verzenden' || !r.checked; }); });

  $('bestel').addEventListener('submit', async function (e) {
    e.preventDefault();
    var f = $('bFout'), k = $('bKnop'), lev = document.querySelector('input[name=lev]:checked').value;
    var d = { naam: $('bNaam').value.trim(), telefoon: $('bTel').value.trim(), email: $('bMail').value.trim(), levering: lev,
      adres: $('bStraat').value.trim(), postcode: $('bPc').value.trim(), plaats: $('bPlaats').value.trim(), opmerking: $('bOpm').value.trim(), website: $('bLok').value,
      regels: regels.map(function (r) { return { id: r.id, aantal: r.aantal }; }) };
    var m = !d.naam ? 'Vul je naam in.' : !/^[0-9 +()-]{8,20}$/.test(d.telefoon) ? 'Vul een geldig telefoonnummer in.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email) ? 'Vul je e-mailadres in. Daar komt je Tikkie naartoe.' :
      lev === 'Verzenden' && (!d.adres || !/^[0-9]{4}\s?[A-Za-z]{2}$/.test(d.postcode) || !d.plaats) ? 'Vul je adres, postcode en plaats in.' : '';
    if (m) { f.textContent = m; f.hidden = false; return; }
    f.hidden = true; k.disabled = true; k.textContent = 'Versturen…';
    try {
      var r = await fetch(URL_SB + '/rest/v1/rpc/shop_bestelling_plaatsen', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Profile': 'flowsmid', apikey: KEY, Authorization: 'Bearer ' + KEY }, body: JSON.stringify({ p_slug: 'byt3lab', p: d }) });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(j.message || 'Bestellen lukte niet.');
      regels = []; bewaar(); knop();
      $('bestel').hidden = true; $('mandRegels').replaceChildren(); $('mandTotaal').textContent = eur(j.totaal);
      $('bGeluktTitel').textContent = 'Bestelling #' + j.nummer + ' is binnen! 🚀';
      $('bGeluktTekst').textContent = 'Je krijgt van Byt3lab een Tikkie op ' + d.email + '. Zodra je betaald hebt, gaan we voor je aan de slag.';
      $('bGelukt').hidden = false;
    } catch (err) { f.textContent = err.message; f.hidden = false; }
    k.disabled = false; k.textContent = 'Bestelling plaatsen';
  });
  knop();
  var wacht = setInterval(function () { if (window.__producten) { clearInterval(wacht); bijwerken(); knop(); } }, 300);
})();
