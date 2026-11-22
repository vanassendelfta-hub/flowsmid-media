/* Byt3lab beheer: producten met foto's beheren en aanvragen bekijken.
   Toegang wordt in de database afgedwongen: je ziet en wijzigt alleen je eigen gegevens. */
(function () {
  'use strict';
  var SLUG = 'byt3lab', BUCKET = 'flowsmid-sites', MAX_FOTOS = 8, MAX_PX = 1600;
  var $ = function (id) { return document.getElementById(id); };
  var sb = window.supabase.createClient('https://uywydquzvdbpfjjrwsbt.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5d3lkcXV6dmRicGZqanJ3c2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMTI5NDEsImV4cCI6MjEwNjg4ODk0MX0.4C76JwtfcRx3d39kvU23NRpKPKt_A5FkmdUpoqDbf5M', {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'b3l-beheer' }, db: { schema: 'flowsmid' }
  });
  var klantId = null, lijst = [], aanvragen = [], bewerk = null, fotos = [], nieuweUploads = [], wegTeHalen = [], uploadsBezig = 0;

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
  var tt;
  function toast(t, fout) { var n = $('toast'); n.textContent = t; n.className = 'toast' + (fout ? ' f' : ''); n.hidden = false; clearTimeout(tt); tt = setTimeout(function () { n.hidden = true; }, 3400); }
  function eur(n) { return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0); }
  function opslagPad(url) { var m = String(url).match(/\/storage\/v1\/object\/public\/flowsmid-sites\/(.+)$/); return m ? decodeURIComponent(m[1]) : null; }
  function haalWeg(urls) { var paden = urls.map(opslagPad).filter(Boolean); if (paden.length) sb.storage.from(BUCKET).remove(paden).catch(function () {}); }
  function toon(ingelogd) { $('login').hidden = ingelogd; $('app').hidden = !ingelogd; $('uit').hidden = !ingelogd; }

  /* ---------- Producten ---------- */
  function rij(p, i) {
    var f = (p.fotos && p.fotos[0]) || 'https://cdn.jsdelivr.net/gh/vanassendelfta-hub/flowsmid-media@84cfecfb3358e371ea273b550b765a388940ef76/klanten/byt3lab/logo.webp';
    return el('div', { class: 'prod' }, [
      el('img', { src: f, alt: '', loading: 'lazy' }),
      el('div', { class: 'info' }, [
        el('b', { text: p.naam }),
        el('div', null, [
          el('span', { class: 'pil ' + p.status.replace(/\s+/g, '-'), text: p.status }),
          p.uitgelicht ? el('span', { class: 'pil hot', text: 'Hot' }) : null,
          el('small', { text: p.categorie + ' · ' + (p.prijs !== null ? eur(p.prijs) : (p.prijs_label || 'Prijs op aanvraag')) })
        ])
      ]),
      el('div', { class: 'volg' }, [
        el('button', { type: 'button', 'aria-label': 'Hoger zetten', disabled: i === 0, onclick: function () { verplaats(i, -1); } }, ['▲']),
        el('button', { type: 'button', 'aria-label': 'Lager zetten', disabled: i === lijst.length - 1, onclick: function () { verplaats(i, 1); } }, ['▼'])
      ]),
      el('button', { class: 'btn btn-g btn-k', type: 'button', onclick: function () { openEditor(p); } }, ['Bewerk'])
    ]);
  }
  function teken() {
    $('tOnline').textContent = lijst.filter(function (p) { return p.status !== 'Verborgen'; }).length;
    $('tHot').textContent = lijst.filter(function (p) { return p.uitgelicht && p.status !== 'Verborgen'; }).length;
    $('tVerborgen').textContent = lijst.filter(function (p) { return p.status === 'Verborgen'; }).length;
    var doel = $('lijst');
    if (!lijst.length) { doel.replaceChildren(el('div', { class: 'leeg' }, [el('b', { text: 'Nog geen producten' }), 'Tik op "+ Product toevoegen" om je eerste product online te zetten.'])); }
    else doel.replaceChildren.apply(doel, lijst.map(rij));
    var cats = {}; lijst.forEach(function (p) { cats[p.categorie] = 1; }); ['Stickers', 'Shirts', '3D Printing'].forEach(function (c) { cats[c] = 1; });
    $('cats').replaceChildren.apply($('cats'), Object.keys(cats).sort().map(function (c) { return el('option', { value: c }); }));
  }
  async function laad() {
    var r = await sb.from('shop_producten').select('*').eq('klant_id', klantId).order('volgorde').order('aangemaakt_op', { ascending: false });
    if (r.error) { toast('Laden lukte niet: ' + r.error.message, true); return; }
    lijst = r.data || []; teken();
  }
  async function verplaats(i, stap) {
    var j = i + stap; if (j < 0 || j >= lijst.length) return;
    var a = lijst[i]; lijst[i] = lijst[j]; lijst[j] = a; teken();
    var wijzig = [];
    lijst.forEach(function (p, k) { var v = (k + 1) * 10; if (p.volgorde !== v) { p.volgorde = v; wijzig.push(p); } });
    try {
      var res = await Promise.all(wijzig.map(function (p) { return sb.from('shop_producten').update({ volgorde: p.volgorde }).eq('id', p.id); }));
      res.forEach(function (x) { if (x.error) throw x.error; });
    } catch (e) { toast('Volgorde opslaan lukte niet.', true); laad(); }
  }

  /* ---------- Editor ---------- */
  function tekenFotos() {
    var doel = $('fotos'), kids = fotos.map(function (f, i) {
      return el('div', { class: 'foto' + (f.bezig ? ' bezig' : '') }, [
        el('img', { src: f.url, alt: 'Foto ' + (i + 1) }),
        i === 0 ? el('span', { class: 'hoofd', text: 'Hoofdfoto' }) : null,
        f.bezig ? null : el('div', { class: 'acts' }, [
          i > 0 ? el('button', { type: 'button', title: 'Maak hoofdfoto', 'aria-label': 'Maak hoofdfoto', onclick: function () { fotos.unshift(fotos.splice(i, 1)[0]); tekenFotos(); } }, ['★']) : null,
          el('button', { type: 'button', title: 'Verwijder foto', 'aria-label': 'Verwijder foto', onclick: function () { var w = fotos.splice(i, 1)[0]; wegTeHalen.push(w.url); tekenFotos(); } }, ['✕'])
        ])
      ]);
    });
    if (fotos.length < MAX_FOTOS) kids.push(el('button', { class: 'foto-plus', type: 'button', onclick: function () { $('bestand').click(); } }, [el('b', { text: '+' }), 'Foto toevoegen']));
    doel.replaceChildren.apply(doel, kids);
  }
  function openEditor(p) {
    bewerk = p || null; wegTeHalen = []; nieuweUploads = [];
    fotos = (p && p.fotos ? p.fotos : []).map(function (u) { return { url: u }; });
    $('bTitel').textContent = p ? 'Product bewerken' : 'Nieuw product';
    $('pNaam').value = p ? p.naam : ''; $('pCat').value = p ? p.categorie : '';
    $('pStatus').value = p ? p.status : 'Te koop';
    $('pPrijs').value = p && p.prijs !== null ? String(p.prijs).replace('.', ',') : '';
    $('pLabel').value = p && p.prijs_label ? p.prijs_label : '';
    $('pOms').value = p && p.omschrijving ? p.omschrijving : '';
    $('pHot').checked = !!(p && p.uitgelicht);
    $('pWeg').hidden = !p; $('pfout').hidden = true;
    tekenFotos(); $('blad').hidden = false; document.body.style.overflow = 'hidden';
    setTimeout(function () { $('pNaam').focus(); }, 50);
  }
  function sluitEditor(opgeslagen) {
    if (!opgeslagen && nieuweUploads.length) haalWeg(nieuweUploads);
    $('blad').hidden = true; document.body.style.overflow = ''; bewerk = null;
  }
  function verklein(file) {
    return new Promise(function (ok, nee) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(1, MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? ok(b) : nee(new Error('Foto omzetten lukte niet')); }, 'image/jpeg', 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); nee(new Error('Dit bestand kan niet als foto worden gelezen. Kies een JPG of PNG.')); };
      img.src = url;
    });
  }
  async function upload(file) {
    var plek = { url: URL.createObjectURL(file), bezig: true }; fotos.push(plek); tekenFotos(); uploadsBezig++;
    try {
      var blob = await verklein(file);
      var pad = klantId + '/shop/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
      var r = await sb.storage.from(BUCKET).upload(pad, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
      if (r.error) throw r.error;
      var pub = sb.storage.from(BUCKET).getPublicUrl(pad).data.publicUrl;
      URL.revokeObjectURL(plek.url); plek.url = pub; plek.bezig = false; nieuweUploads.push(pub);
    } catch (e) {
      fotos.splice(fotos.indexOf(plek), 1); toast('Foto uploaden lukte niet: ' + (e.message || e), true);
    }
    uploadsBezig--; tekenFotos();
  }
  $('bestand').addEventListener('change', function () {
    var files = Array.prototype.slice.call(this.files || []).slice(0, MAX_FOTOS - fotos.length);
    files.forEach(upload); this.value = '';
  });
  $('pform').addEventListener('submit', async function (e) {
    e.preventDefault();
    var f = $('pfout'), knop = $('pOpslaan');
    if (uploadsBezig) { f.textContent = 'Even wachten, de foto\'s worden nog geüpload.'; f.hidden = false; return; }
    var prijsTxt = $('pPrijs').value.trim().replace(/[€\s]/g, '').replace(',', '.');
    var prijs = prijsTxt === '' ? null : Number(prijsTxt);
    var rijData = {
      naam: $('pNaam').value.trim(), categorie: $('pCat').value.trim() || 'Overig', status: $('pStatus').value,
      prijs: prijs, prijs_label: $('pLabel').value.trim() || null, omschrijving: $('pOms').value.trim() || null,
      uitgelicht: $('pHot').checked, fotos: fotos.map(function (x) { return x.url; })
    };
    var melding = !rijData.naam ? 'Geef het product een naam.' : (prijs !== null && (isNaN(prijs) || prijs < 0)) ? 'De prijs klopt niet. Schrijf bijvoorbeeld 14,99.' : !rijData.fotos.length ? 'Voeg minstens één foto toe.' : '';
    if (melding) { f.textContent = melding; f.hidden = false; return; }
    f.hidden = true; knop.disabled = true;
    try {
      var r;
      if (bewerk) r = await sb.from('shop_producten').update(rijData).eq('id', bewerk.id);
      else {
        rijData.klant_id = klantId; rijData.slug = SLUG;
        rijData.volgorde = lijst.length ? Math.min.apply(null, lijst.map(function (p) { return p.volgorde; })) - 10 : 10;
        r = await sb.from('shop_producten').insert(rijData);
      }
      if (r.error) throw r.error;
      haalWeg(wegTeHalen);
      toast(bewerk ? 'Opgeslagen. Staat direct op je site.' : 'Product toegevoegd! Het staat bovenaan in je shop.');
      sluitEditor(true); laad();
    } catch (err) { f.textContent = 'Opslaan lukte niet: ' + (err.message || err); f.hidden = false; }
    knop.disabled = false;
  });
  $('pWeg').addEventListener('click', async function () {
    if (!bewerk || !window.confirm('"' + bewerk.naam + '" verwijderen? Dit kan niet ongedaan worden gemaakt. Tip: zet de status op Verborgen als je het later weer wil tonen.')) return;
    var p = bewerk, r = await sb.from('shop_producten').delete().eq('id', p.id);
    if (r.error) return toast('Verwijderen lukte niet: ' + r.error.message, true);
    haalWeg((p.fotos || []).concat(nieuweUploads)); nieuweUploads = [];
    sluitEditor(true); toast('Product verwijderd.'); laad();
  });
  $('blad').addEventListener('click', function (e) { if (e.target.closest('[data-dicht]')) sluitEditor(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('blad').hidden) sluitEditor(false); });
  $('nieuw').addEventListener('click', function () { openEditor(null); });

  /* ---------- Aanvragen ---------- */
  var STATUSSEN = ['Nieuw', 'In behandeling', 'Ingepland', 'Afgerond', 'Afgewezen'];
  function wa(tel) { var t = String(tel).replace(/[^0-9+]/g, ''); if (t.indexOf('+') === 0) t = t.slice(1); else if (t.indexOf('00') === 0) t = t.slice(2); else if (t.indexOf('0') === 0) t = '31' + t.slice(1); return 'https://wa.me/' + t; }
  function tekenAanvragen() {
    var n = aanvragen.filter(function (a) { return a.status === 'Nieuw'; }).length;
    $('nAanv').textContent = n; $('nAanv').hidden = !n;
    var doel = $('aanvLijst');
    if (!aanvragen.length) { doel.replaceChildren(el('div', { class: 'leeg' }, [el('b', { text: 'Nog geen aanvragen' }), 'Aanvragen via het formulier op je website komen hier binnen.'])); return; }
    doel.replaceChildren.apply(doel, aanvragen.map(function (a) {
      var sel = el('select', { 'aria-label': 'Status', onchange: async function () {
        var r = await sb.from('site_aanvragen').update({ status: sel.value }).eq('id', a.id);
        if (r.error) { toast('Opslaan lukte niet.', true); sel.value = a.status; return; }
        a.status = sel.value; tekenAanvragen(); toast('Status: ' + a.status);
      } }, STATUSSEN.map(function (s) { return el('option', { value: s, text: s, selected: s === a.status }); }));
      return el('article', { class: 'kaart aanv' }, [
        el('div', { class: 'bk' }, [el('div', null, [el('b', { text: '#' + a.nummer + ' · ' + a.naam }), el('small', { text: (a.soort_werk || 'Aanvraag') + ' · ' + new Date(a.aangemaakt_op).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })]), el('span', { class: 'st ' + a.status.replace(/\s+/g, '-'), text: a.status })]),
        el('p', { text: a.omschrijving }),
        el('div', { class: 'acties' }, [
          el('a', { class: 'btn btn-p btn-k', href: wa(a.telefoon), target: '_blank', rel: 'noopener' }, ['WhatsApp']),
          el('a', { class: 'btn btn-g btn-k', href: 'tel:' + String(a.telefoon).replace(/[^0-9+]/g, '') }, ['Bel']),
          a.email ? el('a', { class: 'btn btn-g btn-k', href: 'mailto:' + a.email }, ['Mail']) : null,
          sel
        ])
      ]);
    }));
  }
  async function laadAanvragen() {
    var r = await sb.from('site_aanvragen').select('id,nummer,naam,telefoon,email,soort_werk,omschrijving,status,aangemaakt_op').eq('slug', SLUG).order('aangemaakt_op', { ascending: false }).limit(200);
    if (!r.error) { aanvragen = r.data || []; tekenAanvragen(); }
  }
  /* ---------- Bestellingen (betalen met Tikkie) ---------- */
  var bestellingen = [];
  function tekenBestellingen() {
    var n = bestellingen.filter(function (b) { return b.status === 'Nieuw'; }).length;
    $('nBest').textContent = n; $('nBest').hidden = !n;
    var doel = $('bestLijst');
    if (!bestellingen.length) { doel.replaceChildren(el('div', { class: 'leeg' }, [el('b', { text: 'Nog geen bestellingen' }), 'Bestellingen uit je webshop komen hier binnen.'])); return; }
    doel.replaceChildren.apply(doel, bestellingen.map(function (b) {
      var acties = [], invoer;
      if (b.status === 'Nieuw') {
        invoer = el('input', { type: 'url', inputmode: 'url', placeholder: 'Plak hier je Tikkie-link', 'aria-label': 'Tikkie-link' });
        acties.push(el('div', { class: 'tikkie' }, [invoer, el('button', { class: 'btn btn-p btn-k', type: 'button', onclick: function () { stuurTikkie(b, invoer.value, this); } }, ['Stuur Tikkie'])]));
      }
      if (b.betaal_url) acties.push(el('span', { class: 'tikkie-link', text: 'Tikkie: ' + b.betaal_url }));
      var knoppen = [];
      if (b.status === 'Wacht op betaling') {
        knoppen.push(el('button', { class: 'btn btn-p btn-k', type: 'button', onclick: function () { zetBest(b, { status: 'Betaald', betaald_op: new Date().toISOString() }, 'Betaald'); } }, ['Betaald']));
        knoppen.push(el('a', { class: 'btn btn-g btn-k', href: wa(b.telefoon) + '?text=' + encodeURIComponent('Hoi ' + b.naam + ', hier is je Tikkie voor bestelling #' + b.nummer + ' bij Byt3lab Customs: ' + b.betaal_url), target: '_blank', rel: 'noopener' }, ['Tikkie via WhatsApp']));
      }
      if (b.status === 'Betaald') knoppen.push(el('button', { class: 'btn btn-p btn-k', type: 'button', onclick: function () { zetBest(b, { status: b.levering === 'Verzenden' ? 'Verzonden' : 'Afgerond' }, b.levering === 'Verzenden' ? 'Verzonden' : 'Opgehaald'); } }, [b.levering === 'Verzenden' ? 'Verzonden' : 'Opgehaald']));
      if (b.status === 'Verzonden') knoppen.push(el('button', { class: 'btn btn-p btn-k', type: 'button', onclick: function () { zetBest(b, { status: 'Afgerond' }, 'Afgerond'); } }, ['Afronden']));
      knoppen.push(el('a', { class: 'btn btn-g btn-k', href: wa(b.telefoon), target: '_blank', rel: 'noopener' }, ['WhatsApp']));
      if (['Nieuw', 'Wacht op betaling'].indexOf(b.status) >= 0) knoppen.push(el('button', { class: 'btn btn-r btn-k', type: 'button', onclick: function () { if (window.confirm('Bestelling #' + b.nummer + ' annuleren?')) zetBest(b, { status: 'Geannuleerd' }, 'Geannuleerd'); } }, ['Annuleren']));
      return el('article', { class: 'kaart aanv best' }, [
        el('div', { class: 'bk' }, [el('div', null, [el('b', { text: '#' + b.nummer + ' · ' + b.naam }), el('small', { text: new Date(b.aangemaakt_op).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })]), el('span', { class: 'st ' + b.status.replace(/\s+/g, '-'), text: b.status })]),
        el('ul', { class: 'regels' }, (b.regels || []).map(function (r) { return el('li', null, [el('b', { text: r.aantal + '×' }), r.naam]); })),
        el('div', { class: 'tot' }, [el('span', { text: 'Totaal' }), el('span', { text: eur(b.totaal) })]),
        el('p', { class: 'info', text: (b.levering === 'Verzenden' ? 'Verzenden naar ' + [b.adres, b.postcode, b.plaats].filter(Boolean).join(', ') : 'Ophalen') + ' · ' + b.email + (b.opmerking ? ' · ' + b.opmerking : '') }),
        acties.length ? el('div', null, acties) : null,
        el('div', { class: 'acties', style: 'margin-top:12px' }, knoppen)
      ]);
    }));
  }
  var mailGeladen = false;
  async function laadMail() {
    if (mailGeladen) return;
    var r = await sb.rpc('shop_mail_ophalen', { p_slug: SLUG });
    if (!r.error) { $('mailAdres').value = r.data || ''; mailGeladen = true; }
  }
  $('mailSet').addEventListener('submit', async function (e) {
    e.preventDefault();
    var m = $('mailAdres').value.trim();
    if (m && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) return toast('Dit e-mailadres klopt niet.', true);
    var r = await sb.rpc('shop_mail_instellen', { p_slug: SLUG, p_mail: m });
    if (r.error) return toast(r.error.message || 'Opslaan lukte niet.', true);
    toast(m ? 'Opgeslagen. Mails gaan nu naar ' + m : 'Opgeslagen.');
  });
  async function laadBestellingen() {
    laadMail();
    var r = await sb.from('shop_bestellingen').select('*').eq('slug', SLUG).order('aangemaakt_op', { ascending: false }).limit(200);
    if (!r.error) { bestellingen = r.data || []; tekenBestellingen(); }
  }
  async function stuurTikkie(b, url, knop) {
    url = String(url || '').trim();
    if (!/^https:\/\/\S+$/.test(url)) return toast('Plak de volledige Tikkie-link (begint met https://).', true);
    knop.disabled = true;
    var r = await sb.rpc('shop_tikkie_versturen', { p_id: b.id, p_url: url });
    knop.disabled = false;
    if (r.error) return toast(r.error.message, true);
    b.betaal_url = url; b.status = 'Wacht op betaling'; tekenBestellingen(); toast('Tikkie verstuurd naar ' + b.email);
  }
  async function zetBest(b, velden, tekst) {
    var r = await sb.from('shop_bestellingen').update(velden).eq('id', b.id);
    if (r.error) return toast('Opslaan lukte niet.', true);
    Object.assign(b, velden); tekenBestellingen(); toast('#' + b.nummer + ': ' + tekst);
  }

  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      var w = t.getAttribute('data-tab');
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.toggle('aan', x === t); });
      $('tabProducten').hidden = w !== 'producten'; $('tabAanvragen').hidden = w !== 'aanvragen'; $('tabBestellingen').hidden = w !== 'bestellingen';
      if (w === 'aanvragen') laadAanvragen();
      if (w === 'bestellingen') laadBestellingen();
    });
  });

  /* ---------- Inloggen ---------- */
  async function start() {
    var r = await sb.from('site_inhoud').select('klant_id').eq('slug', SLUG).maybeSingle();
    if (r.error || !r.data) { await sb.auth.signOut(); toon(false); $('lfout').textContent = 'Dit account hoort niet bij deze website.'; $('lfout').hidden = false; return; }
    klantId = r.data.klant_id; toon(true); laad(); laadAanvragen(); laadBestellingen();
  }
  $('lform').addEventListener('submit', async function (e) {
    e.preventDefault();
    var u = $('lu').value.toLowerCase().replace(/\s+/g, ''), p = $('lp').value, f = $('lfout'), k = $('lknop');
    if (!u || !p) { f.textContent = 'Vul je gebruikersnaam en wachtwoord in.'; f.hidden = false; return; }
    if (u.indexOf('@') < 0) u += '@login.flowsmid.nl';
    k.disabled = true; f.hidden = true;
    var r = await sb.auth.signInWithPassword({ email: u, password: p });
    k.disabled = false;
    if (r.error) { f.textContent = /invalid login/i.test(r.error.message) ? 'Gebruikersnaam of wachtwoord klopt niet. Let op hoofdletters in het wachtwoord.' : 'Inloggen lukte niet: ' + r.error.message; f.hidden = false; return; }
    $('lp').value = ''; start();
  });
  $('toon').addEventListener('click', function () { var i = $('lp'), aan = i.type === 'password'; i.type = aan ? 'text' : 'password'; this.textContent = aan ? 'Verberg' : 'Toon'; });
  $('uit').addEventListener('click', async function () { await sb.auth.signOut(); lijst = []; aanvragen = []; bestellingen = []; klantId = null; toon(false); });
  sb.auth.getSession().then(function (r) { if (r.data.session) start(); else toon(false); });
})();
