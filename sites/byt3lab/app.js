/* Byt3lab Customs website. Producten komen uit het eigen beheer (Flowsmid). */
(function () {
  'use strict';
  var SB = {
    url: 'https://uywydquzvdbpfjjrwsbt.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5d3lkcXV6dmRicGZqanJ3c2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMTI5NDEsImV4cCI6MjEwNjg4ODk0MX0.4C76JwtfcRx3d39kvU23NRpKPKt_A5FkmdUpoqDbf5M',
    slug: 'byt3lab'
  };
  var IG_DM = 'https://ig.me/m/byt3labcustoms';
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Intro ---------- */
  var intro = $('intro'), introWeg = false, autoKlok;
  function sluitIntro(doel) {
    if (introWeg || !intro) return; introWeg = true; clearTimeout(autoKlok);
    intro.classList.add('weg');
    setTimeout(function () {
      intro.remove(); document.documentElement.classList.remove('intro-on');
      if (doel && doel !== 'top') { var d = $(doel); if (d) d.scrollIntoView({ behavior: 'smooth' }); }
    }, reduce ? 50 : 1050);
  }
  function startIntro() {
    if (!intro) return;
    var printed = $('introPrinted'), nozzle = $('introNozzle'), pct = $('introPct');
    var START = 500, DUUR = reduce ? 10 : 3400, LAGEN = 64, t0 = null;
    nozzle.style.opacity = '1';
    function frame(ts) {
      if (introWeg) return;
      if (t0 === null) t0 = ts;
      var t = ts - t0 - START;
      if (t < 0) { requestAnimationFrame(frame); return; }
      var p = Math.min(1, t / DUUR);
      var e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // ease in-out
      var laag = Math.floor(e * LAGEN) / LAGEN;
      printed.style.clipPath = 'inset(' + ((1 - laag) * 100).toFixed(2) + '% 0 0 0)';
      nozzle.style.bottom = (laag * 100).toFixed(2) + '%';
      nozzle.style.setProperty('--nx', (50 + 44 * Math.sin(ts / 70)).toFixed(1) + '%');
      pct.textContent = Math.round(e * 100);
      if (p < 1) { requestAnimationFrame(frame); return; }
      nozzle.style.opacity = '0';
      $('introFile').textContent = 'print voltooid ✓';
      intro.classList.add('klaar');
      autoKlok = setTimeout(function () { sluitIntro('top'); }, 3600);
    }
    requestAnimationFrame(frame);
  }
  if (intro) {
    intro.addEventListener('click', function (e) {
      var go = e.target.closest('[data-intro-go]');
      if (go) sluitIntro(go.getAttribute('data-intro-go'));
      if (e.target.closest('[data-intro-skip]')) sluitIntro('top');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !introWeg) sluitIntro('top'); });
    var logo = new Image(); logo.onload = logo.onerror = startIntro; logo.src = 'https://cdn.jsdelivr.net/gh/vanassendelfta-hub/flowsmid-media@84cfecfb3358e371ea273b550b765a388940ef76/klanten/byt3lab/logo.webp';
  }

  /* ---------- Menu ---------- */
  var menuKnop = $('menuKnop'), nav = $('nav');
  menuKnop.addEventListener('click', function () { var open = nav.classList.toggle('open'); menuKnop.setAttribute('aria-expanded', open); });
  nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') { nav.classList.remove('open'); menuKnop.setAttribute('aria-expanded', 'false'); } });
  $('jaar').textContent = new Date().getFullYear();

  /* ---------- Shop ---------- */
  var producten = [], filter = 'Alles';
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k]; if (v === null || v === undefined || v === false) return;
      if (k === 'text') n.textContent = v; else if (k === 'class') n.className = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c === null || c === undefined || c === false) return; n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function eur(n) { return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0); }
  function prijsTekst(p) { return p.prijs !== null && p.prijs !== undefined && p.prijs !== '' ? eur(p.prijs) : (p.prijs_label || 'Prijs op aanvraag'); }
  function fotos(p) { return Array.isArray(p.fotos) && p.fotos.length ? p.fotos : ['https://cdn.jsdelivr.net/gh/vanassendelfta-hub/flowsmid-media@84cfecfb3358e371ea273b550b765a388940ef76/klanten/byt3lab/logo.webp']; }

  function chips() {
    var cats = {}; producten.forEach(function (p) { cats[p.categorie] = (cats[p.categorie] || 0) + 1; });
    var lijst = ['Alles'].concat(Object.keys(cats).sort());
    if (lijst.indexOf(filter) < 0) filter = 'Alles';
    $('chips').replaceChildren.apply($('chips'), lijst.map(function (c) {
      return el('button', { class: 'chip' + (c === filter ? ' aan' : ''), type: 'button', role: 'tab', 'aria-selected': c === filter ? 'true' : 'false', onclick: function () { filter = c; chips(); teken(); } },
        [c, el('small', { text: String(c === 'Alles' ? producten.length : cats[c]) })]);
    }));
  }
  function kaart(p) {
    var f = fotos(p);
    return el('button', { class: 'prod' + (p.status === 'Uitverkocht' ? ' uit' : ''), type: 'button', onclick: function () { openModal(p); }, 'aria-label': p.naam + ', ' + prijsTekst(p) }, [
      el('div', { class: 'prod-foto' }, [
        el('img', { src: f[0], alt: p.naam, loading: 'lazy' }),
        el('span', { class: 'badge ' + p.status.replace(/\s+/g, '-'), text: p.status }),
        p.uitgelicht ? el('span', { class: 'ster', text: 'Hot' }) : null,
        f.length > 1 ? el('span', { class: 'meer-fotos', text: '+' + (f.length - 1) + ' foto' + (f.length > 2 ? "'s" : '') }) : null
      ]),
      el('div', { class: 'prod-info' }, [
        el('span', { class: 'prod-cat', text: p.categorie }),
        el('span', { class: 'prod-naam', text: p.naam }),
        el('div', { class: 'prod-prijs' }, [p.prijs !== null && p.prijs !== undefined ? el('span', { text: eur(p.prijs) }) : el('em', { text: p.prijs_label || 'Prijs op aanvraag' }), el('span', { class: 'go', text: 'Bekijk →' })])
      ])
    ]);
  }
  function teken() {
    var doel = $('producten');
    var toon = producten.filter(function (p) { return filter === 'Alles' || p.categorie === filter; });
    if (!toon.length) { doel.replaceChildren(el('div', { class: 'leeg', text: 'Binnenkort nieuwe items in deze categorie.' })); return; }
    doel.replaceChildren.apply(doel, toon.map(kaart));
  }
  async function laadProducten() {
    try {
      var r = await fetch(SB.url + '/rest/v1/shop_producten?select=id,naam,categorie,prijs,prijs_label,omschrijving,fotos,status,uitgelicht,volgorde&slug=eq.' + SB.slug + '&status=neq.Verborgen&order=volgorde.asc,aangemaakt_op.desc', {
        headers: { apikey: SB.key, Authorization: 'Bearer ' + SB.key, 'Accept-Profile': 'flowsmid' }
      });
      if (!r.ok) throw new Error(r.status);
      producten = await r.json(); window.__producten = producten;
      chips(); teken();
    } catch (e) {
      $('producten').replaceChildren(el('div', { class: 'leeg' }, ['De shop kon even niet laden. ', el('a', { href: IG_DM, target: '_blank', rel: 'noopener', text: 'Stuur ons een DM' }), ' en we helpen je direct.']));
    }
  }
  document.querySelectorAll('.dienst[data-cat]').forEach(function (a) {
    a.addEventListener('click', function () { filter = a.getAttribute('data-cat'); if (producten.length) { chips(); teken(); } });
  });

  /* ---------- Product-venster ---------- */
  var modal = $('modal'), huidig = null, vorigeFocus = null;
  function toonFoto(src, knop) {
    $('mFoto').src = src;
    $('mDuimen').querySelectorAll('button').forEach(function (b) { b.classList.toggle('aan', b === knop); });
  }
  function openModal(p) {
    huidig = p; vorigeFocus = document.activeElement;
    var f = fotos(p);
    $('mFoto').alt = p.naam; $('mFoto').src = f[0];
    $('mDuimen').replaceChildren.apply($('mDuimen'), f.length > 1 ? f.map(function (src, i) {
      var b = el('button', { type: 'button', class: i === 0 ? 'aan' : '', 'aria-label': 'Foto ' + (i + 1) }, [el('img', { src: src, alt: '' })]);
      b.addEventListener('click', function () { toonFoto(src, b); }); return b;
    }) : []);
    $('mCat').textContent = p.categorie;
    $('mNaam').textContent = p.naam;
    $('mPrijs').replaceChildren(prijsTekst(p), p.status !== 'Te koop' ? el('small', { text: p.status }) : null);
    $('mOms').textContent = p.omschrijving || '';
    $('mDm').textContent = p.status === 'Uitverkocht' ? 'Vraag naar nieuwe voorraad' : p.status === 'Binnenkort' ? 'Reserveer via DM' : 'Bestel via DM';
    var bestelbaar = window.Mandje && window.Mandje.bestelbaar(p);
    $('mMand').hidden = !bestelbaar;
    $('mDm').className = 'btn ' + (bestelbaar ? 'btn-ghost' : 'btn-neon');
    if (bestelbaar) $('mDm').textContent = 'Vraag via DM';
    modal.hidden = false; document.body.style.overflow = 'hidden';
    modal.querySelector('.modal-x').focus();
  }
  function sluitModal() { modal.hidden = true; document.body.style.overflow = ''; if (vorigeFocus) vorigeFocus.focus(); }
  modal.addEventListener('click', function (e) { if (e.target.closest('[data-sluit]')) sluitModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) sluitModal(); });
  $('mMand').addEventListener('click', function () { var p = huidig; sluitModal(); window.Mandje.voegToe(p); });
  $('mVraag').addEventListener('click', function () {
    var p = huidig; sluitModal();
    var soort = /shirt/i.test(p.categorie) ? 'Shirts' : /3d/i.test(p.categorie) ? '3D Print' : /sticker/i.test(p.categorie) ? 'Stickers' : 'Anders';
    var r = document.querySelector('input[name=soort][value="' + soort + '"]'); if (r) r.checked = true;
    $('fOms').value = 'Ik heb interesse in: ' + p.naam + '. ';
    $('opmaat').scrollIntoView({ behavior: 'smooth' });
    setTimeout(function () { $('fNaam').focus({ preventScroll: true }); }, 600);
  });

  /* ---------- Aanvraagformulier ---------- */
  $('aanvraag').addEventListener('submit', async function (e) {
    e.preventDefault();
    var f = e.target, fout = $('fFout'), knop = $('fKnop');
    var data = {
      naam: f.naam.value.trim(), telefoon: f.telefoon.value.trim(), email: f.email.value.trim(),
      soort_werk: (f.querySelector('input[name=soort]:checked') || {}).value || 'Anders',
      omschrijving: f.omschrijving.value.trim(), website: f.website.value
    };
    var melding = !data.naam ? 'Vul je naam in.' : !/^[0-9 +()-]{8,20}$/.test(data.telefoon) ? 'Vul een geldig telefoonnummer in.' :
      data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ? 'Dit e-mailadres klopt niet.' : data.omschrijving.length < 10 ? 'Vertel iets meer over je idee.' : '';
    if (melding) { fout.textContent = melding; fout.hidden = false; return; }
    fout.hidden = true; knop.disabled = true; knop.textContent = 'Versturen…';
    try {
      var r = await fetch(SB.url + '/rest/v1/rpc/site_aanvraag_indienen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Profile': 'flowsmid', apikey: SB.key, Authorization: 'Bearer ' + SB.key },
        body: JSON.stringify({ p_slug: SB.slug, p: data })
      });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(j.message || 'Versturen lukte niet.');
      f.querySelectorAll('input:not([type=radio]),textarea').forEach(function (i) { i.value = ''; });
      knop.hidden = true; $('fGelukt').hidden = false;
      if (j.nummer) $('fGeluktTekst').textContent = 'Aanvraag #' + j.nummer + ' is binnen. We nemen snel contact met je op.';
    } catch (err) {
      fout.textContent = err.message || 'Versturen lukte niet. Probeer het opnieuw of stuur een DM.'; fout.hidden = false;
    } finally { knop.disabled = false; knop.textContent = 'Verstuur aanvraag'; }
  });

  laadProducten();
})();
