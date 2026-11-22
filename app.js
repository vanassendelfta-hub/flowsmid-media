/* Dagzet: dagelijkse marketingtaken per project. Vanilla JS + Supabase (schema flowsmid, tabellen dz_*). */
(function () {
  'use strict';
  var cfg = window.DAGZET_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  document.querySelectorAll('[data-naam]').forEach(function (n) { n.textContent = cfg.naam; });

  if (!window.supabase || !cfg.supabaseUrl) {
    $('laden').hidden = true; $('intro').hidden = false;
    return;
  }
  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'dagzet-sessie' },
    db: { schema: 'flowsmid' }
  });

  var KLEUREN = ['#D4864A', '#6D5BD0', '#3F8F7A', '#C2577A', '#4F86E8', '#B49A2E', '#7A6E99'];
  var KANALEN = ['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'Google', 'E-mail', 'WhatsApp', 'Website', 'Offline'];

  /* ---------------- Hulpjes ---------------- */
  function el(tag, a, kids) {
    var n = document.createElement(tag);
    if (a) for (var k in a) {
      var v = a[k];
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'style') n.setAttribute('style', v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (k === 'value') n.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'draggable') n[k] = !!v;
      else n.setAttribute(k, v === true ? '' : v);
    }
    (function voeg(lijst) {
      (lijst || []).forEach(function (c) {
        if (c == null || c === false) return;
        if (Array.isArray(c)) return voeg(c);
        n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
      });
    })(kids);
    return n;
  }
  function svg(pad) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    pad.split('|').forEach(function (d) { var p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); s.appendChild(p); });
    return s;
  }
  var ICOON = {
    vink: 'M5 12l5 5L20 7',
    tekst: 'M4 6h16|M4 12h16|M4 18h10',
    beeld: 'M4 5h16v14H4z|M4 16l5-5 4 4 3-3 4 4|M15 9h.01',
    video: 'M4 6h12v12H4z|M16 10l5-3v10l-5-3',
    bestand: 'M7 3h7l5 5v13H7z|M14 3v5h5',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1|M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'
  };
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  }
  var pad2 = function (n) { return String(n).padStart(2, '0'); };
  function ymd(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function parse(s) { var p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function plusDagen(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return ymd(d); }
  function vandaag() { return ymd(new Date()); }
  function datumLang(s) { return parse(s).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }); }
  function datumKort(s) { return parse(s).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }); }
  function geldigeDatum(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(parse(s)) && ymd(parse(s)) === s; }
  function dagLabel(s) {
    var t = vandaag();
    if (s === t) return 'vandaag';
    if (s === plusDagen(t, 1)) return 'morgen';
    if (s === plusDagen(t, -1)) return 'gisteren';
    return datumLang(s);
  }
  function grootte(b) { if (!b && b !== 0) return ''; if (b < 1024) return b + ' B'; if (b < 1048576) return Math.round(b / 1024) + ' kB'; return (b / 1048576).toFixed(1).replace('.', ',') + ' MB'; }
  function veiligeNaam(n) { return String(n || 'bestand').normalize('NFKD').replace(/[^\w.\-]+/g, '-').replace(/-+/g, '-').slice(-90) || 'bestand'; }
  function toast(tekst, fout, actie) {
    var n = el('div', { class: 'toast' + (fout ? ' fout' : '') }, [el('span', { text: tekst }),
      actie ? el('button', { type: 'button', text: actie.tekst, onclick: function () { n.remove(); actie.doe(); } }) : null]);
    $('toasts').appendChild(n);
    setTimeout(function () { n.remove(); }, actie ? 7000 : 4200);
  }
  function fouttekst(e) { var m = (e && (e.message || e.error_description)) || 'Onbekende fout'; return /Failed to fetch|NetworkError/i.test(m) ? 'Geen verbinding. Controleer je internet en probeer opnieuw.' : m; }
  function zetFout(n, t) { n.textContent = t || ''; n.hidden = !t; }
  function opslag(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------------- Staat ---------------- */
  var S = { matSoort: 'alle', matZoek: '', user: null, naam: '', projecten: [], taken: [], plannen: [], filter: opslag('dz-filter') || 'alle', maand: null, gekozenDag: null, plan: null };
  function project(id) { return S.projecten.find(function (p) { return p.id === id; }) || { id: null, naam: 'Zonder project', kleur: '#8A85A3' }; }
  function zichtbaar() { return S.taken.filter(function (t) { return S.filter === 'alle' || t.project_id === S.filter; }); }
  function sorteer(a, b) { return a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : (a.klaar - b.klaar) || (a.volgorde - b.volgorde) || (a.aangemaakt_op < b.aangemaakt_op ? -1 : 1); }
  function opDag(d) { return zichtbaar().filter(function (t) { return t.datum === d; }).sort(sorteer); }

  /* ---------------- Inloggen ---------------- */
  function openLogin() { $('loginOverlay').hidden = false; setTimeout(function () { $('gebruiker').focus(); }, 30); }
  function sluitLogin() { $('loginOverlay').hidden = true; }
  document.querySelectorAll('[data-open-login]').forEach(function (b) { b.addEventListener('click', openLogin); });
  document.querySelectorAll('[data-sluit-login]').forEach(function (b) { b.addEventListener('click', sluitLogin); });
  $('loginOverlay').addEventListener('click', function (e) { if (e.target === this) sluitLogin(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!$('dialoog').hidden) sluitDialoog(); else if (!$('loginOverlay').hidden) sluitLogin();
    $('menu').hidden = true;
  });

  $('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var fout = $('loginFout'), knop = $('loginKnop');
    var naam = String($('gebruiker').value || '').trim().toLowerCase(), ww = $('wachtwoord').value;
    zetFout(fout, '');
    if (!naam || !ww) return zetFout(fout, 'Vul je gebruikersnaam en wachtwoord in.');
    if (!/^[a-z0-9._-]{3,40}$/.test(naam)) return zetFout(fout, 'Onjuiste gebruikersnaam of wachtwoord.');
    knop.disabled = true; knop.textContent = 'Bezig met inloggen...';
    var res = await sb.auth.signInWithPassword({ email: naam + cfg.loginDomein, password: ww });
    knop.disabled = false; knop.textContent = 'Inloggen';
    if (res.error) {
      var m = res.error.message || '';
      return zetFout(fout, /rate|too many/i.test(m) ? 'Te veel pogingen. Probeer het over een paar minuten opnieuw.'
        : /banned/i.test(m) ? 'Dit account is geblokkeerd. Neem contact op met Flowsmid.' : 'Onjuiste gebruikersnaam of wachtwoord.');
    }
    $('wachtwoord').value = '';
    var ok = await naInloggen(res.data.user);
    if (ok) sluitLogin();
  });

  async function naInloggen(user) {
    var t = await sb.rpc('dz_toegang');
    if (t.error || !t.data) {
      await sb.auth.signOut();
      toonIntro();
      openLogin();
      zetFout($('loginFout'), t.error ? 'Inloggen lukte, maar Dagzet kon je account niet controleren. Probeer het opnieuw.' : 'Je account heeft nog geen toegang tot ' + cfg.naam + '. Vraag hieronder een demo aan.');
      return false;
    }
    S.user = user;
    var p = await sb.from('profielen').select('gebruikersnaam').eq('user_id', user.id).maybeSingle();
    S.naam = (p.data && p.data.gebruikersnaam) || (user.email || '').split('@')[0];
    $('avatarLetter').textContent = S.naam.replace(/flowsmid$/, '').charAt(0) || '?';
    $('menuNaam').textContent = S.naam;
    var ok = await laad();
    $('laden').hidden = true; $('intro').hidden = true; $('appScherm').hidden = false;
    if (!/^#\//.test(location.hash)) history.replaceState(null, '', '#/vandaag');
    teken();
    if (!ok) toast('Je taken konden niet geladen worden. Ververs de pagina om het opnieuw te proberen.', true);
    return true;
  }
  function toonIntro() {
    $('laden').hidden = true; $('appScherm').hidden = true; $('intro').hidden = false;
    if (location.hash === '#inloggen') openLogin();
  }
  $('avatarKnop').addEventListener('click', function (e) { e.stopPropagation(); var m = $('menu'); m.hidden = !m.hidden; this.setAttribute('aria-expanded', String(!m.hidden)); });
  document.addEventListener('click', function () { $('menu').hidden = true; });
  $('uitloggenKnop').addEventListener('click', async function () {
    await sb.auth.signOut();
    S.user = null; S.taken = []; S.projecten = []; S.plannen = [];
    history.replaceState(null, '', location.pathname);
    toonIntro();
  });

  /* ---------------- Demo aanvragen ---------------- */
  $('demoForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var fout = $('demoFout'), knop = $('demoKnop');
    zetFout(fout, '');
    var d = { naam: $('dNaam').value, bedrijf: $('dBedrijf').value, email: $('dEmail').value, telefoon: $('dTelefoon').value, bericht: $('dBericht').value, website: $('dWebsite').value };
    if (!d.naam.trim()) return zetFout(fout, 'Vul je naam in.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) return zetFout(fout, 'Vul een geldig e-mailadres in.');
    knop.disabled = true; knop.textContent = 'Versturen...';
    var r = await sb.rpc('dz_demo_aanvragen', { p: d });
    knop.disabled = false; knop.textContent = 'Demo aanvragen';
    if (r.error) return zetFout(fout, fouttekst(r.error));
    $('demoForm').hidden = true; $('demoBedankt').hidden = false;
  });

  /* ---------------- Data ---------------- */
  async function laad() {
    var r = await Promise.all([
      sb.from('dz_projecten').select('*').order('volgorde').order('aangemaakt_op'),
      sb.from('dz_taken').select('*').order('datum').order('volgorde').range(0, 4999),
      sb.from('dz_plannen').select('*').order('aangemaakt_op', { ascending: false })
    ]);
    if (r.some(function (x) { return x.error; })) return false;
    S.projecten = r[0].data || []; S.taken = r[1].data || []; S.plannen = r[2].data || [];
    if (S.filter !== 'alle' && !S.projecten.some(function (p) { return p.id === S.filter; })) S.filter = 'alle';
    return true;
  }
  async function wijzigTaak(t, velden, stil) {
    var oud = {}; Object.keys(velden).forEach(function (k) { oud[k] = t[k]; });
    Object.assign(t, velden); teken();
    var r = await sb.from('dz_taken').update(velden).eq('id', t.id);
    if (r.error) { Object.assign(t, oud); teken(); toast('Opslaan lukte niet: ' + fouttekst(r.error), true); return false; }
    if (!stil) return true;
    return true;
  }
  function wisselKlaar(t) {
    var klaar = !t.klaar;
    wijzigTaak(t, { klaar: klaar, klaar_op: klaar ? new Date().toISOString() : null }).then(function (ok) {
      if (ok && klaar) {
        var rest = opDag(vandaag()).filter(function (x) { return !x.klaar; }).length;
        if (t.datum === vandaag() && rest === 0) toast('Alles voor vandaag is af. Goed bezig!');
      }
    });
  }
  function verplaats(t, datum) {
    if (!geldigeDatum(datum) || t.datum === datum) return;
    var oud = t.datum;
    wijzigTaak(t, { datum: datum }).then(function (ok) {
      if (ok) toast('Verplaatst naar ' + dagLabel(datum), false, { tekst: 'Ongedaan maken', doe: function () { wijzigTaak(t, { datum: oud }); } });
    });
  }
  async function signedUrl(pad, downloadNaam, bucket) {
    var r = await sb.storage.from(bucket || cfg.bucket).createSignedUrl(pad, downloadNaam ? 600 : 3600, downloadNaam ? { download: downloadNaam } : undefined);
    if (r.error) throw r.error;
    return r.data.signedUrl;
  }
  var urlCache = {};
  function voorbeeldUrl(pad, bucket) {
    if (!urlCache[pad]) urlCache[pad] = signedUrl(pad, null, bucket).catch(function (e) { delete urlCache[pad]; throw e; });
    return urlCache[pad];
  }
  async function verwijderBestanden(paden) {
    paden = paden.filter(Boolean);
    if (paden.length) await sb.storage.from(cfg.bucket).remove(paden);
  }
  function bestandsPaden(t) { return (t.materiaal || []).filter(function (m) { return m.soort === 'bestand' && m.pad; }).map(function (m) { return m.pad; }); }
  var TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown', csv: 'text/csv', json: 'application/json', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', zip: 'application/zip', mp3: 'audio/mpeg' };
  async function upload(bestand, taakId) {
    if (bestand.size > 50 * 1024 * 1024) throw new Error(bestand.name + ' is groter dan 50 MB.');
    var ext = (bestand.name.split('.').pop() || '').toLowerCase();
    var pad = S.user.id + '/' + taakId + '/' + Date.now().toString(36) + '-' + veiligeNaam(bestand.name);
    var type = bestand.type || TYPES[ext] || 'application/octet-stream';
    var r = await sb.storage.from(cfg.bucket).upload(pad, bestand, { contentType: type, upsert: false });
    if (r.error) throw r.error;
    return { id: uuid(), soort: 'bestand', naam: bestand.name, pad: pad, type: type, grootte: bestand.size };
  }

  /* ---------------- Materiaal ---------------- */
  function matIcoon(m) {
    var t = m.type || '';
    var naam = m.soort === 'tekst' ? 'tekst' : /^video\//.test(t) ? 'video' : /^image\//.test(t) ? 'beeld' : m.soort === 'link' ? 'link' : 'bestand';
    var vak = el('div', { class: 'mat-icoon' }, [svg(ICOON[naam])]);
    if (m.soort === 'bestand' && /^image\/(png|jpeg|gif|webp)$/.test(t)) {
      (m.url && !m.pad ? Promise.resolve(m.url) : voorbeeldUrl(m.pad, m.bucket)).then(function (u) { vak.replaceChildren(el('img', { src: u, alt: '', loading: 'lazy' })); }).catch(function () {});
    }
    return vak;
  }
  function matInfo(m) {
    if (m.soort === 'tekst') return 'Tekst · ' + (m.tekst || '').length + ' tekens';
    if (m.soort === 'link') return (/^video\//.test(m.type || '') ? 'Video · ' : '') + (/drive\.google\.com/.test(m.url || '') ? 'Google Drive' : (m.url || '').replace(/^https?:\/\//, '').slice(0, 60));
    return [(m.type || '').split('/').pop().toUpperCase(), grootte(m.grootte)].filter(Boolean).join(' · ');
  }
  async function kopieer(tekst) {
    try { await navigator.clipboard.writeText(tekst); toast('Tekst gekopieerd'); }
    catch (e) { toast('Kopiëren lukte niet. Open de tekst en selecteer hem zelf.', true); }
  }
  function downloadBlob(blob, naam) {
    var u = URL.createObjectURL(blob), a = el('a', { href: u, download: naam });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }
  async function download(m) {
    if (m.soort === 'tekst') {
      var naam = /\.(txt|md)$/i.test(m.naam || '') ? m.naam : (m.naam || 'tekst') + '.txt';
      return downloadBlob(new Blob([m.tekst || ''], { type: 'text/plain;charset=utf-8' }), naam);
    }
    if (m.soort === 'link' || (m.url && !m.pad)) return window.open(m.url, '_blank', 'noopener');
    try {
      var u = await signedUrl(m.pad, m.naam || true, m.bucket);
      var a = el('a', { href: u }); document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { toast('Downloaden lukte niet: ' + fouttekst(e), true); }
  }
  async function bekijk(m) {
    var inhoud;
    if (m.soort === 'tekst') inhoud = el('div', { class: 'tekst-voorbeeld', text: m.tekst || '' });
    else {
      var u;
      try { u = m.url && !m.pad ? m.url : await signedUrl(m.pad, null, m.bucket); } catch (e) { return toast('Openen lukte niet: ' + fouttekst(e), true); }
      if (/^image\//.test(m.type)) inhoud = el('img', { class: 'beeld-voorbeeld', src: u, alt: m.naam });
      else if (/^video\//.test(m.type)) inhoud = el('video', { class: 'beeld-voorbeeld', src: u, controls: true, playsinline: true });
      else return window.open(u, '_blank', 'noopener');
    }
    openDialoog(m.naam || 'Materiaal', [inhoud], [
      m.soort === 'tekst' ? el('button', { type: 'button', class: 'btn btn-zacht btn-klein', text: 'Kopieer tekst', onclick: function () { kopieer(m.tekst || ''); } }) : null,
      el('div', { class: 'rechts' }, [
        el('button', { type: 'button', class: 'btn btn-zacht btn-klein', text: 'Sluiten', onclick: sluitDialoog }),
        el('button', { type: 'button', class: 'btn btn-primair btn-klein', text: 'Downloaden', onclick: function () { download(m); } })
      ])
    ]);
  }
  function matRij(m, extra) {
    var kan = m.soort === 'tekst' || (m.soort !== 'link' && /^(image|video)\//.test(m.type || ''));
    return el('div', { class: 'mat' }, [
      matIcoon(m),
      el('div', { class: 'mat-info' }, [el('b', { text: m.naam || 'Zonder naam', title: m.naam }), el('span', { text: matInfo(m) })]),
      el('div', { class: 'mat-knoppen' }, extra || [
        m.soort === 'tekst' ? el('button', { type: 'button', class: 'btn btn-tekst btn-mini', text: 'Kopieer', onclick: function () { kopieer(m.tekst || ''); } }) : null,
        kan ? el('button', { type: 'button', class: 'btn btn-tekst btn-mini', text: 'Bekijk', onclick: function () { bekijk(m); } }) : null,
        el('button', { type: 'button', class: 'btn btn-zacht btn-mini', text: m.soort === 'link' ? 'Openen' : 'Download', onclick: function () { download(m); } })
      ])
    ]);
  }

  /* ---------------- Taakkaart ---------------- */
  function taakKaart(t, opt) {
    opt = opt || {};
    var p = project(t.project_id), achter = !t.klaar && t.datum < vandaag();
    var stappen = Array.isArray(t.stappen) ? t.stappen : [];
    return el('article', { class: 'taak' + (t.klaar ? ' klaar' : '') + (achter ? ' achter' : '') }, [
      el('button', { type: 'button', class: 'vink' + (t.klaar ? ' aan' : ''), 'aria-pressed': String(!!t.klaar), 'aria-label': t.klaar ? 'Markeer als niet gedaan' : 'Markeer als gedaan', onclick: function () { wisselKlaar(t); } }, [svg(ICOON.vink)]),
      el('div', { class: 'taak-kern' }, [
        el('div', { class: 'taak-meta' }, [
          el('span', { class: 'pill', style: '--pc:' + p.kleur, text: p.naam }),
          t.kanaal ? el('span', { text: t.kanaal }) : null,
          t.duur_min ? el('span', { text: t.duur_min + ' min' }) : null,
          achter ? el('span', { class: 'label-achter', text: 'Gepland op ' + datumKort(t.datum) }) : opt.datum ? el('span', { text: datumKort(t.datum) }) : null
        ]),
        el('h3', { class: 'taak-titel', text: t.titel }),
        t.omschrijving ? el('p', { class: 'taak-oms', text: t.omschrijving }) : null,
        t.waarom && !t.klaar ? el('p', { class: 'taak-waarom', text: 'Waarom: ' + t.waarom }) : null,
        stappen.length && !t.klaar ? el('ul', { class: 'taak-stappen' }, stappen.map(function (s, i) {
          return el('li', { class: s.klaar ? 'gedaan' : null }, [el('label', null, [
            el('input', { type: 'checkbox', checked: !!s.klaar, onchange: function () {
              var nieuw = stappen.map(function (x, j) { return j === i ? { tekst: x.tekst, klaar: !x.klaar } : x; });
              wijzigTaak(t, { stappen: nieuw });
            } }), el('span', { text: s.tekst })
          ])]);
        })) : null,
        (t.materiaal || []).length ? el('div', { class: 'materiaal' }, t.materiaal.map(function (m) { return matRij(m); })) : null,
        el('div', { class: 'taak-voet' }, [
          el('button', { type: 'button', class: 'btn btn-tekst btn-mini', text: 'Openen', onclick: function () { openTaak(t); } }),
          t.klaar ? null : achter
            ? el('button', { type: 'button', class: 'btn btn-tekst btn-mini', text: 'Naar vandaag', onclick: function () { verplaats(t, vandaag()); } })
            : el('button', { type: 'button', class: 'btn btn-tekst btn-mini', text: 'Een dag later', onclick: function () { verplaats(t, plusDagen(t.datum, 1)); } })
        ])
      ])
    ]);
  }

  /* ---------------- Navigatie ---------------- */
  function route() { var h = location.hash.replace(/^#\/?/, '').split('/'); return h[0] || 'vandaag'; }
  window.addEventListener('hashchange', function () { if (S.user) { teken(); window.scrollTo(0, 0); } });
  $('nieuweTaakKnop').addEventListener('click', function () { openTaak(null, route() === 'kalender' && S.gekozenDag ? S.gekozenDag : vandaag()); });

  function tekenFilter() {
    var chips = [{ id: 'alle', naam: 'Alle projecten' }].concat(S.projecten);
    $('filterbalk').replaceChildren.apply($('filterbalk'), chips.map(function (p) {
      var actief = S.filter === p.id;
      return el('button', { type: 'button', class: 'chip' + (actief ? ' actief' : ''), 'aria-pressed': String(actief), onclick: function () { S.filter = p.id; opslag('dz-filter', p.id); teken(); } }, [
        p.kleur ? el('span', { class: 'stip', style: '--pc:' + p.kleur }) : null, p.naam
      ]);
    }));
  }
  function teken() {
    var r = route();
    document.querySelectorAll('#appNav a').forEach(function (a) { var aan = a.getAttribute('data-route') === r; a.classList.toggle('actief', aan); if (aan) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $('filterbalk').hidden = r === 'plan';
    tekenFilter();
    var inhoud = r === 'kalender' ? kalender() : r === 'materiaal' ? materiaalPagina() : r === 'projecten' ? projecten() : r === 'plan' ? planPagina() : vandaagPagina();
    $('app').replaceChildren.apply($('app'), inhoud);
    document.title = cfg.naam + ' · ' + ({ vandaag: 'Vandaag', kalender: 'Kalender', materiaal: 'Materiaal', projecten: 'Projecten', plan: 'Plan inladen' }[r] || 'Vandaag');
  }

  /* ---------------- Vandaag ---------------- */
  function vandaagPagina() {
    var d = vandaag();
    var nu = opDag(d);
    var achter = zichtbaar().filter(function (t) { return !t.klaar && t.datum < d; }).sort(sorteer);
    var klaar = nu.filter(function (t) { return t.klaar; }).length;
    var minuten = nu.filter(function (t) { return !t.klaar; }).reduce(function (s, t) { return s + (t.duur_min || 0); }, 0);
    var uur = new Date().getHours(), groet = uur < 6 ? 'Goedenacht' : uur < 12 ? 'Goedemorgen' : uur < 18 ? 'Goedemiddag' : 'Goedenavond';
    var hoofd = [];
    if (achter.length) {
      hoofd.push(el('h2', { class: 'blok-titel' }, ['Blijven liggen (' + achter.length + ')',
        el('button', { type: 'button', class: 'btn btn-tekst btn-mini', text: 'Alles naar vandaag', onclick: async function () {
          for (var i = 0; i < achter.length; i++) await wijzigTaak(achter[i], { datum: d });
          toast(achter.length === 1 ? 'Taak staat nu op vandaag' : achter.length + ' taken staan nu op vandaag');
        } })]));
      hoofd.push(el('div', { class: 'takenlijst' }, achter.map(function (t) { return taakKaart(t); })));
    }
    hoofd.push(el('h2', { class: 'blok-titel', text: 'Vandaag' }));
    if (nu.length) hoofd.push(el('div', { class: 'takenlijst' }, nu.map(function (t) { return taakKaart(t); })));
    else if (!S.taken.length) hoofd.push(leeg('Nog geen taken', 'Laad een plan in en alle taken komen vanzelf in je kalender. Of maak zelf je eerste taak.', [
      el('a', { href: '#/plan', class: 'btn btn-primair btn-klein', text: 'Plan inladen' }),
      el('button', { type: 'button', class: 'btn btn-zacht btn-klein', text: 'Zelf een taak maken', onclick: function () { openTaak(null, d); } })
    ]));
    else hoofd.push(leeg('Vandaag staat er niets gepland', volgendeTekst(d), [
      el('a', { href: '#/kalender', class: 'btn btn-zacht btn-klein', text: 'Bekijk de kalender' }),
      el('button', { type: 'button', class: 'btn btn-zacht btn-klein', text: 'Taak toevoegen', onclick: function () { openTaak(null, d); } })
    ]));

    return [
      el('div', { class: 'pagina-kop' }, [
        el('div', null, [el('span', { class: 'eyebrow', text: groet + (S.naam ? ', ' + S.naam.replace(/flowsmid$/, '').replace(/^./, function (c) { return c.toUpperCase(); }) : '') }), el('h1', { text: datumLang(d) }),
          el('p', { class: 'sub', text: nu.length ? (nu.length - klaar === 0 ? 'Alles voor vandaag is gedaan.' : (nu.length - klaar) + (nu.length - klaar === 1 ? ' taak' : ' taken') + ' te gaan' + (minuten ? ', ongeveer ' + minuten + ' minuten.' : '.')) : 'Een rustige dag.' })]),
        nu.length ? el('div', { class: 'voortgang', 'aria-label': klaar + ' van ' + nu.length + ' gedaan' }, [el('div', { class: 'voortgang-balk' }, [el('i', { style: 'width:' + Math.round(klaar / nu.length * 100) + '%' })]), el('b', { text: klaar + ' / ' + nu.length })]) : null
      ]),
      el('div', { class: 'vandaag' }, [el('div', null, hoofd), zijkolom(d)])
    ];
  }
  function volgendeTekst(d) {
    var volgende = zichtbaar().filter(function (t) { return !t.klaar && t.datum > d; }).sort(sorteer)[0];
    return volgende ? 'Je volgende taak staat op ' + dagLabel(volgende.datum) + ': ' + volgende.titel + '.' : 'Er staan ook geen taken meer in de planning. Tijd voor een nieuw plan.';
  }
  function leeg(titel, tekst, knoppen) { return el('div', { class: 'leeg' }, [el('h3', { text: titel }), el('p', { text: tekst }), knoppen ? el('div', { class: 'knoppen' }, knoppen) : null]); }
  function zijkolom(d) {
    var dagen = [];
    for (var i = 1; i <= 14 && dagen.length < 6; i++) {
      var dd = plusDagen(d, i), lijst = opDag(dd);
      if (lijst.length) dagen.push([dd, lijst]);
    }
    var week0 = plusDagen(d, -((parse(d).getDay() + 6) % 7));
    var dezeWeek = zichtbaar().filter(function (t) { return t.datum >= week0 && t.datum <= plusDagen(week0, 6); });
    var gedaan = dezeWeek.filter(function (t) { return t.klaar; }).length;
    return el('aside', { class: 'zijkolom' }, [
      el('div', { class: 'zijkaart' }, [el('h3', { text: 'Komende dagen' }),
        dagen.length ? dagen.map(function (x) {
          return el('div', { class: 'komend-dag' }, [el('b', { text: dagLabel(x[0]) })].concat(x[1].map(function (t) {
            return el('button', { type: 'button', class: 'komend-taak', onclick: function () { openTaak(t); } }, [el('span', { class: 'stip', style: '--pc:' + project(t.project_id).kleur }), el('span', { text: t.titel })]);
          })));
        }) : el('p', { class: 'klein', text: 'Niets gepland in de komende twee weken.' })]),
      el('div', { class: 'zijkaart' }, [el('h3', { text: 'Deze week' }),
        el('div', { class: 'cijfers' }, [
          el('div', null, [el('b', { text: String(gedaan) }), el('span', { text: 'gedaan' })]),
          el('div', null, [el('b', { text: String(dezeWeek.length - gedaan) }), el('span', { text: 'te gaan' })]),
          el('div', null, [el('b', { text: String(dezeWeek.reduce(function (s, t) { return s + (t.klaar ? (t.duur_min || 0) : 0); }, 0)) }), el('span', { text: 'minuten' })])
        ])])
    ]);
  }

  /* ---------------- Kalender ---------------- */
  var sleepId = null;
  function kalender() {
    var d = vandaag();
    if (!S.maand) { var n = parse(d); S.maand = new Date(n.getFullYear(), n.getMonth(), 1); }
    if (!S.gekozenDag) S.gekozenDag = d;
    var eerste = S.maand, start = new Date(eerste); start.setDate(1 - ((eerste.getDay() + 6) % 7));
    var cellen = [];
    for (var i = 0; i < 42; i++) {
      var dag = new Date(start); dag.setDate(start.getDate() + i);
      var s = ymd(dag);
      if (i >= 35 && dag.getMonth() !== eerste.getMonth()) break;
      cellen.push(kalCel(s, dag.getMonth() === eerste.getMonth(), dag.getDay() === 0 || dag.getDay() === 6, d));
    }
    var naam = eerste.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
    var gekozen = opDag(S.gekozenDag);
    return [
      el('div', { class: 'pagina-kop' }, [
        el('div', null, [el('h1', { text: 'Kalender' }), el('p', { class: 'sub', text: 'Sleep een taak naar een andere dag om hem te verschuiven.' })]),
        el('div', { class: 'kal-balk' }, [
          el('button', { type: 'button', class: 'rond', 'aria-label': 'Vorige maand', text: '‹', onclick: function () { S.maand = new Date(eerste.getFullYear(), eerste.getMonth() - 1, 1); teken(); } }),
          el('h2', { text: naam }),
          el('button', { type: 'button', class: 'rond', 'aria-label': 'Volgende maand', text: '›', onclick: function () { S.maand = new Date(eerste.getFullYear(), eerste.getMonth() + 1, 1); teken(); } }),
          el('button', { type: 'button', class: 'btn btn-zacht btn-klein', text: 'Vandaag', onclick: function () { S.maand = null; S.gekozenDag = d; teken(); } })
        ])
      ]),
      el('div', { class: 'kalender' }, [
        el('div', { class: 'kal-koppen' }, ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map(function (x) { return el('div', { text: x }); })),
        el('div', { class: 'kal-raster' }, cellen)
      ]),
      el('p', { class: 'kal-hint', text: 'Op je telefoon tik je op een dag, open je de taak en kies je daar een nieuwe datum.' }),
      el('section', { class: 'dagpaneel' }, [
        el('div', { class: 'pagina-kop' }, [el('h2', { text: dagLabel(S.gekozenDag) === 'vandaag' ? 'Vandaag, ' + datumLang(S.gekozenDag) : datumLang(S.gekozenDag) }),
          el('button', { type: 'button', class: 'btn btn-zacht btn-klein', text: '+ Taak op deze dag', onclick: function () { openTaak(null, S.gekozenDag); } })]),
        gekozen.length ? el('div', { class: 'takenlijst' }, gekozen.map(function (t) { return taakKaart(t); })) : leeg('Geen taken op deze dag', 'Sleep een taak hierheen in de kalender of voeg er een toe.')
      ])
    ];
  }
  function kalCel(s, inMaand, weekend, d) {
    var lijst = opDag(s), max = 3;
    var cel = el('div', {
      class: 'kal-dag' + (inMaand ? '' : ' buiten') + (weekend ? ' weekend' : '') + (s === d ? ' vandaag' : '') + (s === S.gekozenDag ? ' gekozen' : ''),
      role: 'button', tabindex: '0', 'aria-label': datumLang(s) + ', ' + lijst.length + (lijst.length === 1 ? ' taak' : ' taken'),
      onclick: function () { S.gekozenDag = s; teken(); },
      onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); S.gekozenDag = s; teken(); } },
      ondragover: function (e) { if (sleepId) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; cel.classList.add('over'); } },
      ondragleave: function () { cel.classList.remove('over'); },
      ondrop: function (e) {
        e.preventDefault(); cel.classList.remove('over');
        var id = sleepId || e.dataTransfer.getData('text/plain'); sleepId = null;
        var t = S.taken.find(function (x) { return x.id === id; });
        if (t) { S.gekozenDag = s; verplaats(t, s); }
      }
    }, [el('span', { class: 'kal-nr', text: String(parse(s).getDate()) })].concat(lijst.slice(0, max).map(function (t) {
      return el('button', {
        type: 'button', class: 'kal-chip' + (t.klaar ? ' klaar' : ''), style: '--pc:' + project(t.project_id).kleur, draggable: true, title: t.titel, text: t.titel,
        onclick: function (e) { e.stopPropagation(); openTaak(t); },
        ondragstart: function (e) { sleepId = t.id; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', t.id); } catch (x) {} this.classList.add('sleept'); },
        ondragend: function () { sleepId = null; this.classList.remove('sleept'); }
      });
    }), lijst.length > max ? [el('span', { class: 'kal-meer', text: '+' + (lijst.length - max) + ' meer' })] : []));
    return cel;
  }

  /* ---------------- Materiaal ---------------- */
  function matSoort(m) { var t = m.type || ''; return m.soort === 'tekst' ? 'tekst' : /^video\//.test(t) ? 'video' : m.soort === 'link' ? 'link' : /^image\//.test(t) ? 'beeld' : 'bestand'; }
  function materiaalPagina() {
    var alles = [];
    zichtbaar().slice().sort(function (a, b) { return a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : 0; }).forEach(function (t) {
      (t.materiaal || []).forEach(function (m) { alles.push({ m: m, t: t }); });
    });
    var soorten = [['alle', 'Alles'], ['video', "Video's"], ['beeld', 'Afbeeldingen'], ['tekst', 'Teksten'], ['bestand', 'Documenten'], ['link', 'Links']];
    var tel = {}; alles.forEach(function (x) { var s = matSoort(x.m); tel[s] = (tel[s] || 0) + 1; });
    var zoek = S.matZoek.toLowerCase();
    var lijst = alles.filter(function (x) {
      return (S.matSoort === 'alle' || matSoort(x.m) === S.matSoort) &&
        (!zoek || ((x.m.naam || '') + ' ' + x.t.titel + ' ' + (x.m.tekst || '')).toLowerCase().indexOf(zoek) >= 0);
    });
    var zoekveld = el('input', { id: 'matZoek', type: 'search', value: S.matZoek, placeholder: 'Zoek op naam of taak', 'aria-label': 'Zoek materiaal', style: 'max-width:280px',
      oninput: function () { S.matZoek = zoekveld.value; clearTimeout(zoekveld._t); zoekveld._t = setTimeout(function () { teken(); var z = $('matZoek'); if (z) { z.focus(); z.setSelectionRange(z.value.length, z.value.length); } }, 250); } });
    return [
      el('div', { class: 'pagina-kop' }, [el('div', null, [el('h1', { text: 'Materiaal' }), el('p', { class: 'sub', text: "Alle teksten, foto's en video's bij je taken op één plek." })]), zoekveld]),
      el('div', { class: 'filterbalk', style: 'padding:0 0 16px;flex-wrap:wrap' }, soorten.map(function (s) {
        var n = s[0] === 'alle' ? alles.length : (tel[s[0]] || 0);
        if (s[0] !== 'alle' && !n) return null;
        return el('button', { type: 'button', class: 'chip' + (S.matSoort === s[0] ? ' actief' : ''), 'aria-pressed': String(S.matSoort === s[0]), onclick: function () { S.matSoort = s[0]; teken(); } }, [s[1] + ' ' + n]);
      })),
      lijst.length ? el('div', { class: 'materiaal' }, lijst.map(function (x) {
        var rij = matRij(x.m), p = project(x.t.project_id);
        rij.querySelector('.mat-info span').textContent = matInfo(x.m) + ' · ' + p.naam + ' · ' + datumKort(x.t.datum);
        rij.querySelector('.mat-knoppen').prepend(el('button', { type: 'button', class: 'btn btn-tekst btn-mini', text: 'Taak', title: x.t.titel, onclick: function () { openTaak(x.t); } }));
        return rij;
      })) : leeg(alles.length ? 'Niets gevonden' : 'Nog geen materiaal', alles.length ? 'Probeer een andere zoekterm of soort.' : 'Materiaal dat bij taken hoort verschijnt hier vanzelf.')
    ];
  }

  /* ---------------- Projecten ---------------- */
  function projecten() {
    var d = vandaag(), week0 = plusDagen(d, -((parse(d).getDay() + 6) % 7));
    return [
      el('div', { class: 'pagina-kop' }, [
        el('div', null, [el('h1', { text: 'Projecten' }), el('p', { class: 'sub', text: 'Elk bedrijf of project heeft zijn eigen taken en kleur.' })]),
        el('button', { type: 'button', class: 'btn btn-primair btn-klein', text: '+ Nieuw project', onclick: function () { projectDialoog(null); } })
      ]),
      S.projecten.length ? el('div', { class: 'projecten' }, S.projecten.map(function (p) {
        var lijst = S.taken.filter(function (t) { return t.project_id === p.id; });
        var open = lijst.filter(function (t) { return !t.klaar; }).length;
        var week = lijst.filter(function (t) { return t.datum >= week0 && t.datum <= plusDagen(week0, 6); }).length;
        var volgende = lijst.filter(function (t) { return !t.klaar && t.datum >= d; }).sort(sorteer)[0];
        return el('section', { class: 'project', style: '--pc:' + p.kleur }, [
          el('h3', null, [el('span', { class: 'stip', style: '--pc:' + p.kleur }), p.naam]),
          el('div', { class: 'cijfers' }, [
            el('div', null, [el('b', { text: String(open) }), el('span', { text: 'open' })]),
            el('div', null, [el('b', { text: String(lijst.length - open) }), el('span', { text: 'gedaan' })]),
            el('div', null, [el('b', { text: String(week) }), el('span', { text: 'deze week' })])
          ]),
          el('p', { class: 'klein', text: volgende ? 'Volgende: ' + volgende.titel + ' (' + dagLabel(volgende.datum) + ')' : 'Geen open taken gepland.' }),
          el('div', { class: 'taak-voet' }, [
            el('button', { type: 'button', class: 'btn btn-zacht btn-mini', text: 'Toon alleen dit project', onclick: function () { S.filter = p.id; opslag('dz-filter', p.id); location.hash = '#/vandaag'; } }),
            el('button', { type: 'button', class: 'btn btn-tekst btn-mini', text: 'Bewerken', onclick: function () { projectDialoog(p); } })
          ])
        ]);
      })) : leeg('Nog geen projecten', 'Maak een project aan voor elk bedrijf waar je marketing voor doet.'),
      el('h2', { class: 'blok-titel', text: 'Ingeladen plannen' }),
      S.plannen.length ? el('div', { class: 'plannen-lijst' }, S.plannen.map(function (pl) {
        var aantal = S.taken.filter(function (t) { return t.plan_id === pl.id; }).length;
        var zeker = false, knop = el('button', { type: 'button', class: 'btn btn-gevaar btn-mini', text: 'Verwijderen', onclick: async function () {
          if (!zeker) { zeker = true; knop.textContent = 'Plan en ' + aantal + ' taken verwijderen?'; setTimeout(function () { zeker = false; knop.textContent = 'Verwijderen'; }, 5000); return; }
          knop.disabled = true;
          var paden = [].concat.apply([], S.taken.filter(function (t) { return t.plan_id === pl.id; }).map(bestandsPaden));
          var r = await sb.from('dz_plannen').delete().eq('id', pl.id);
          if (r.error) { knop.disabled = false; return toast('Verwijderen lukte niet: ' + fouttekst(r.error), true); }
          await verwijderBestanden(paden);
          await laad(); teken(); toast('Plan verwijderd');
        } });
        return el('div', { class: 'plan-rij' }, [el('div', null, [el('b', { text: pl.naam }), el('span', { class: 'klein', text: 'Ingeladen op ' + new Date(pl.aangemaakt_op).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) + ' · nog ' + aantal + ' van ' + pl.aantal_taken + ' taken' })]), knop]);
      })) : el('p', { class: 'klein', text: 'Nog geen plannen ingeladen. Dat doe je bij Plan inladen.' })
    ];
  }
  function projectDialoog(p) {
    var kleur = p ? p.kleur : KLEUREN[S.projecten.length % KLEUREN.length];
    var naam = el('input', { id: 'pNaam', value: p ? p.naam : '', maxlength: '80', required: true });
    var fout = el('div', { class: 'melding fout', role: 'alert', hidden: true });
    function kleurKnoppen() {
      return KLEUREN.map(function (k) { return el('button', { type: 'button', class: 'kleur' + (k === kleur ? ' aan' : ''), style: 'background:' + k, 'aria-label': 'Kleur ' + k, 'aria-pressed': String(k === kleur), onclick: function () { kleur = k; rij.replaceChildren.apply(rij, kleurKnoppen()); } }); });
    }
    var rij = el('div', { class: 'kleuren' }, kleurKnoppen());
    var aantal = p ? S.taken.filter(function (t) { return t.project_id === p.id; }).length : 0;
    var zeker = false;
    var weg = p ? el('button', { type: 'button', class: 'btn btn-gevaar btn-klein', text: 'Verwijderen', onclick: async function () {
      if (!zeker) { zeker = true; weg.textContent = aantal ? 'Ook ' + aantal + ' taken verwijderen?' : 'Zeker weten?'; return; }
      weg.disabled = true;
      var paden = [].concat.apply([], S.taken.filter(function (t) { return t.project_id === p.id; }).map(bestandsPaden));
      var r = await sb.from('dz_projecten').delete().eq('id', p.id);
      if (r.error) { weg.disabled = false; return zetFout(fout, fouttekst(r.error)); }
      await verwijderBestanden(paden);
      if (S.filter === p.id) { S.filter = 'alle'; opslag('dz-filter', 'alle'); }
      await laad(); sluitDialoog(); teken(); toast('Project verwijderd');
    } }) : el('span');
    openDialoog(p ? 'Project bewerken' : 'Nieuw project', [
      fout,
      el('div', { class: 'veld' }, [el('label', { for: 'pNaam', text: 'Naam' }), naam]),
      el('div', { class: 'veld' }, [el('label', { text: 'Kleur' }), rij])
    ], [weg, el('div', { class: 'rechts' }, [
      el('button', { type: 'button', class: 'btn btn-zacht btn-klein', text: 'Annuleren', onclick: sluitDialoog }),
      el('button', { type: 'button', class: 'btn btn-primair btn-klein', text: 'Opslaan', onclick: async function () {
        var n = naam.value.trim();
        if (!n) return zetFout(fout, 'Geef het project een naam.');
        var r = p ? await sb.from('dz_projecten').update({ naam: n, kleur: kleur }).eq('id', p.id)
          : await sb.from('dz_projecten').insert({ naam: n, kleur: kleur, volgorde: S.projecten.length });
        if (r.error) return zetFout(fout, fouttekst(r.error));
        await laad(); sluitDialoog(); teken(); toast(p ? 'Project opgeslagen' : 'Project aangemaakt');
      } })
    ])]);
    setTimeout(function () { naam.focus(); }, 30);
  }

  /* ---------------- Taak openen / maken ---------------- */
  function openTaak(t, datum) {
    var nieuw = !t;
    var c = nieuw ? { id: uuid(), titel: '', project_id: S.filter !== 'alle' ? S.filter : (S.projecten[0] && S.projecten[0].id) || null, datum: datum || vandaag(), kanaal: '', duur_min: null, omschrijving: '', waarom: '', stappen: [], materiaal: [], klaar: false }
      : JSON.parse(JSON.stringify(t));
    c.stappen = Array.isArray(c.stappen) ? c.stappen : []; c.materiaal = Array.isArray(c.materiaal) ? c.materiaal : [];
    var nieuweUploads = [], weggehaald = [];
    var fout = el('div', { class: 'melding fout', role: 'alert', hidden: true });
    var titel = el('input', { id: 'tTitel', value: c.titel, maxlength: '200', placeholder: 'Bijvoorbeeld: Post een foto van het nieuwe gerecht' });
    var proj = el('select', { id: 'tProject' }, S.projecten.map(function (p) { return el('option', { value: p.id, text: p.naam }); }).concat(S.projecten.length ? [] : [el('option', { value: '', text: 'Zonder project' })]));
    proj.value = c.project_id || '';
    var dat = el('input', { id: 'tDatum', type: 'date', value: c.datum });
    var kanaal = el('input', { id: 'tKanaal', value: c.kanaal || '', maxlength: '60', list: 'kanalenLijst', placeholder: 'Instagram' });
    var duur = el('input', { id: 'tDuur', type: 'number', min: '0', max: '1440', step: '5', value: c.duur_min == null ? '' : String(c.duur_min), placeholder: '15' });
    var oms = el('textarea', { id: 'tOms', rows: '4', maxlength: '8000', placeholder: 'Wat moet er gebeuren?' }); oms.value = c.omschrijving || '';
    var waarom = el('textarea', { id: 'tWaarom', rows: '2', maxlength: '2000', placeholder: 'Wat levert deze taak op?' }); waarom.value = c.waarom || '';
    var stappenVak = el('div'), matVak = el('div', { class: 'materiaal' });
    var klaarVink = el('input', { type: 'checkbox', id: 'tKlaar', checked: !!c.klaar });

    function tekenStappen() {
      stappenVak.replaceChildren.apply(stappenVak, c.stappen.map(function (s, i) {
        var inp = el('input', { value: s.tekst, maxlength: '300', 'aria-label': 'Stap ' + (i + 1), oninput: function () { s.tekst = inp.value; } });
        return el('div', { class: 'stap-invoer' }, [inp, el('button', { type: 'button', class: 'btn btn-tekst btn-mini', text: 'Weg', 'aria-label': 'Stap ' + (i + 1) + ' verwijderen', onclick: function () { c.stappen.splice(i, 1); tekenStappen(); } })]);
      }).concat([el('button', { type: 'button', class: 'btn btn-tekst btn-mini', text: '+ Stap toevoegen', onclick: function () { c.stappen.push({ tekst: '', klaar: false }); tekenStappen(); var l = stappenVak.querySelectorAll('input'); if (l.length) l[l.length - 1].focus(); } })]));
    }
    function tekenMat() {
      matVak.replaceChildren.apply(matVak, c.materiaal.map(function (m, i) {
        return matRij(m, [el('button', { type: 'button', class: 'btn btn-tekst btn-mini', text: 'Weg', onclick: function () {
          var x = c.materiaal.splice(i, 1)[0];
          if (x.soort === 'bestand') { var j = nieuweUploads.indexOf(x.pad); if (j >= 0) { nieuweUploads.splice(j, 1); verwijderBestanden([x.pad]); } else weggehaald.push(x.pad); }
          tekenMat();
        } })]);
      }).concat(c.materiaal.length ? [] : [el('p', { class: 'klein', text: 'Nog geen materiaal. Voeg een bestand, tekst of link toe.' })]));
    }
    var bestandInput = el('input', { type: 'file', multiple: true, hidden: true, onchange: async function () {
      var lijst = Array.from(bestandInput.files || []); bestandInput.value = '';
      for (var i = 0; i < lijst.length; i++) {
        uploadKnop.disabled = true; uploadKnop.textContent = 'Uploaden ' + (i + 1) + ' van ' + lijst.length + '...';
        try { var m = await upload(lijst[i], c.id); nieuweUploads.push(m.pad); c.materiaal.push(m); tekenMat(); }
        catch (e) { toast('Uploaden van ' + lijst[i].name + ' lukte niet: ' + fouttekst(e), true); }
      }
      uploadKnop.disabled = false; uploadKnop.textContent = 'Bestand uploaden';
    } });
    var uploadKnop = el('button', { type: 'button', class: 'btn btn-zacht btn-mini', text: 'Bestand uploaden', onclick: function () { bestandInput.click(); } });
    var extraVak = el('div');
    function extraForm(soort) {
      var n = el('input', { placeholder: soort === 'tekst' ? 'Naam, bijvoorbeeld: caption Instagram' : 'Naam van de link', maxlength: '120', 'aria-label': 'Naam' });
      var w = soort === 'tekst' ? el('textarea', { rows: '4', placeholder: 'Plak of schrijf hier de tekst', 'aria-label': 'Tekst' }) : el('input', { type: 'url', placeholder: 'https://', 'aria-label': 'Adres' });
      extraVak.replaceChildren(el('div', { class: 'tekst-mat-form' }, [n, w, el('div', { class: 'taak-voet' }, [
        el('button', { type: 'button', class: 'btn btn-primair btn-mini', text: 'Toevoegen', onclick: function () {
          var waarde = w.value.trim();
          if (!waarde) return;
          if (soort === 'link' && !/^https?:\/\//i.test(waarde)) waarde = 'https://' + waarde;
          c.materiaal.push(soort === 'tekst' ? { id: uuid(), soort: 'tekst', naam: n.value.trim() || 'Tekst', tekst: waarde } : { id: uuid(), soort: 'link', naam: n.value.trim() || waarde.replace(/^https?:\/\//, ''), url: waarde });
          extraVak.replaceChildren(); tekenMat();
        } }),
        el('button', { type: 'button', class: 'btn btn-tekst btn-mini', text: 'Annuleren', onclick: function () { extraVak.replaceChildren(); } })
      ])]));
      n.focus();
    }
    tekenStappen(); tekenMat();

    var zeker = false;
    var weg = nieuw ? el('span') : el('button', { type: 'button', class: 'btn btn-gevaar btn-klein', text: 'Verwijderen', onclick: async function () {
      if (!zeker) { zeker = true; weg.textContent = 'Zeker weten?'; return; }
      weg.disabled = true;
      var r = await sb.from('dz_taken').delete().eq('id', t.id);
      if (r.error) { weg.disabled = false; return zetFout(fout, fouttekst(r.error)); }
      await verwijderBestanden(bestandsPaden(t).concat(nieuweUploads));
      S.taken = S.taken.filter(function (x) { return x.id !== t.id; });
      sluitDialoog(true); teken(); toast('Taak verwijderd');
    } });
    var opslaan = el('button', { type: 'button', class: 'btn btn-primair btn-klein', text: nieuw ? 'Taak aanmaken' : 'Opslaan', onclick: async function () {
      var rij = {
        titel: titel.value.trim(), project_id: proj.value || null, datum: dat.value, kanaal: kanaal.value.trim() || null,
        duur_min: duur.value === '' ? null : Math.max(0, Math.min(1440, parseInt(duur.value, 10) || 0)),
        omschrijving: oms.value.trim() || null, waarom: waarom.value.trim() || null,
        stappen: c.stappen.filter(function (s) { return s.tekst && s.tekst.trim(); }).map(function (s) { return { tekst: s.tekst.trim(), klaar: !!s.klaar }; }),
        materiaal: c.materiaal
      };
      if (!rij.titel) return zetFout(fout, 'Geef de taak een titel.');
      if (!geldigeDatum(rij.datum)) return zetFout(fout, 'Kies een datum.');
      if (klaarVink.checked !== !!c.klaar) { rij.klaar = klaarVink.checked; rij.klaar_op = klaarVink.checked ? new Date().toISOString() : null; }
      opslaan.disabled = true;
      var r = nieuw ? await sb.from('dz_taken').insert(Object.assign({ id: c.id, volgorde: opDag(rij.datum).length, bron: 'handmatig' }, rij)).select().single()
        : await sb.from('dz_taken').update(rij).eq('id', t.id).select().single();
      opslaan.disabled = false;
      if (r.error) return zetFout(fout, fouttekst(r.error));
      if (weggehaald.length) verwijderBestanden(weggehaald);
      nieuweUploads = [];
      if (nieuw) S.taken.push(r.data); else Object.assign(t, r.data);
      sluitDialoog(true); teken(); toast(nieuw ? 'Taak aangemaakt voor ' + dagLabel(rij.datum) : 'Taak opgeslagen');
    } });

    openDialoog(nieuw ? 'Nieuwe taak' : 'Taak', [
      fout,
      el('datalist', { id: 'kanalenLijst' }, KANALEN.map(function (k) { return el('option', { value: k }); })),
      el('div', { class: 'veld' }, [el('label', { for: 'tTitel', text: 'Wat ga je doen?' }), titel]),
      el('div', { class: 'velden2' }, [
        el('div', { class: 'veld' }, [el('label', { for: 'tProject', text: 'Project' }), proj]),
        el('div', { class: 'veld' }, [el('label', { for: 'tDatum', text: 'Datum' }), dat]),
        el('div', { class: 'veld' }, [el('label', { for: 'tKanaal' }, ['Kanaal ', el('span', { class: 'opt', text: '(optioneel)' })]), kanaal]),
        el('div', { class: 'veld' }, [el('label', { for: 'tDuur' }, ['Duur in minuten ', el('span', { class: 'opt', text: '(optioneel)' })]), duur])
      ]),
      el('div', { class: 'veld' }, [el('label', { for: 'tOms', text: 'Omschrijving' }), oms]),
      el('div', { class: 'veld' }, [el('label', { for: 'tWaarom' }, ['Waarom deze taak ', el('span', { class: 'opt', text: '(optioneel)' })]), waarom]),
      el('div', { class: 'veld' }, [el('label', { text: 'Stappen' }), stappenVak]),
      el('div', { class: 'veld' }, [el('label', { text: 'Materiaal' }), matVak,
        el('div', { class: 'mat-toevoegen' }, [uploadKnop, bestandInput,
          el('button', { type: 'button', class: 'btn btn-zacht btn-mini', text: 'Tekst toevoegen', onclick: function () { extraForm('tekst'); } }),
          el('button', { type: 'button', class: 'btn btn-zacht btn-mini', text: 'Link toevoegen', onclick: function () { extraForm('link'); } })]),
        extraVak]),
      nieuw ? null : el('label', { class: 'taak-stappen', style: 'display:flex;gap:10px;align-items:center;cursor:pointer;margin-bottom:6px' }, [klaarVink, el('span', { text: 'Deze taak is gedaan' })])
    ], [weg, el('div', { class: 'rechts' }, [el('button', { type: 'button', class: 'btn btn-zacht btn-klein', text: 'Annuleren', onclick: function () { sluitDialoog(); } }), opslaan])],
    function () { if (nieuweUploads.length) verwijderBestanden(nieuweUploads); });
    if (nieuw) setTimeout(function () { titel.focus(); }, 30);
  }

  /* ---------------- Dialoog ---------------- */
  var bijSluiten = null;
  function openDialoog(titel, inhoud, knoppen, opSluiten) {
    if (!$('dialoog').hidden && bijSluiten) { var f = bijSluiten; bijSluiten = null; f(); }
    bijSluiten = opSluiten || null;
    $('dialoogKaart').replaceChildren(
      el('button', { type: 'button', class: 'sluit', 'aria-label': 'Sluiten', text: '×', onclick: function () { sluitDialoog(); } }),
      el('h2', { id: 'dialoogTitel', text: titel }),
      el('div', null, inhoud),
      knoppen ? el('div', { class: 'dialoog-knoppen' }, knoppen) : null
    );
    $('dialoog').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function sluitDialoog(opgeslagen) {
    if (!opgeslagen && bijSluiten) bijSluiten();
    bijSluiten = null;
    $('dialoog').hidden = true; $('dialoogKaart').replaceChildren();
    document.body.style.overflow = '';
  }
  $('dialoog').addEventListener('mousedown', function (e) { if (e.target === this) sluitDialoog(); });

  /* ---------------- Plan inladen ---------------- */
  var VOORBEELD = {
    formaat: 'dagzet-plan/1',
    naam: 'Voorbeeld: week van de Pad Thai',
    startdatum: '2026-11-23',
    taken: [
      { project: 'Moms Thai Food', dag: 1, titel: 'Post een foto van de Pad Thai op Instagram', kanaal: 'Instagram', duur: 10,
        omschrijving: 'Plaats de foto met de tekst hieronder. Zet de locatie aan.',
        waarom: 'Eten dat je ziet, ga je bestellen. Een vaste post per week houdt je zichtbaar.',
        stappen: ['Download de foto', 'Open Instagram en kies Nieuw bericht', 'Plak de tekst en plaats'],
        materiaal: [{ naam: 'caption-pad-thai.txt', tekst: 'Vrijdag = Pad Thai-dag 🍜 Bestel vóór 17:00 en haal hem warm op.' }, { naam: 'pad-thai.jpg', bestand: 'pad-thai.jpg' }] },
      { project: 'Flowsmid', datum: '2026-11-25', titel: 'Vraag twee klanten om een Google-review', kanaal: 'E-mail', duur: 15,
        materiaal: [{ naam: 'Je Google-reviewlink', url: 'https://g.page/r/...' }] }
    ]
  };
  function kies(o, sleutels) { for (var i = 0; i < sleutels.length; i++) if (o[sleutels[i]] != null && o[sleutels[i]] !== '') return o[sleutels[i]]; return null; }
  function leesPlan(json) {
    var basis = Array.isArray(json) ? { taken: json } : json || {};
    var lijst = kies(basis, ['taken', 'tasks']);
    if (!Array.isArray(lijst) || !lijst.length) throw new Error('Dit bestand bevat geen lijst "taken". Controleer of het een Dagzet-plan is.');
    var fouten = [], relatief = false, taken = [];
    lijst.forEach(function (t, i) {
      var titel = String(kies(t, ['titel', 'title']) || '').trim();
      if (!titel) return fouten.push('Taak ' + (i + 1) + ' heeft geen titel en wordt overgeslagen.');
      var datum = kies(t, ['datum', 'date']), dag = kies(t, ['dag', 'day']);
      if (datum && !geldigeDatum(String(datum))) { fouten.push('Taak "' + titel + '" heeft een ongeldige datum (' + datum + ') en wordt overgeslagen.'); return; }
      if (!datum && (dag == null || isNaN(Number(dag)))) { fouten.push('Taak "' + titel + '" heeft geen datum of dag en wordt overgeslagen.'); return; }
      if (!datum) relatief = true;
      var stappen = kies(t, ['stappen', 'steps']) || [];
      var mat = kies(t, ['materiaal', 'materialen', 'materials']) || [];
      taken.push({
        titel: titel.slice(0, 200),
        project: String(kies(t, ['project']) || kies(basis, ['project']) || '').trim(),
        datum: datum ? String(datum) : null, dag: datum ? null : Number(dag),
        kanaal: kies(t, ['kanaal', 'channel']), duur: kies(t, ['duur', 'minuten', 'duration']),
        omschrijving: kies(t, ['omschrijving', 'beschrijving', 'description']), waarom: kies(t, ['waarom', 'why']),
        stappen: (Array.isArray(stappen) ? stappen : []).map(function (s) { return typeof s === 'string' ? s : (s && (s.tekst || s.text)) || ''; }).filter(Boolean),
        materiaal: (Array.isArray(mat) ? mat : []).map(function (m) {
          return { naam: kies(m, ['naam', 'name']), tekst: kies(m, ['tekst', 'text', 'content']), bestand: kies(m, ['bestand', 'file']), url: kies(m, ['url', 'link']) };
        })
      });
    });
    return { naam: String(kies(basis, ['naam', 'name', 'titel']) || 'Plan van ' + new Date().toLocaleDateString('nl-NL')).slice(0, 160), startdatum: kies(basis, ['startdatum', 'start']), taken: taken, fouten: fouten, relatief: relatief };
  }
  function planDatum(t, start) { return t.datum || plusDagen(start, Math.max(0, Math.round(t.dag) - 1)); }

  function planPagina() {
    var st = S.plan || (S.plan = { plan: null, bestanden: {}, fout: '', start: null });
    var planInput = el('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: function () { leesBestanden(Array.from(planInput.files || [])); planInput.value = ''; } });
    var matInput = el('input', { type: 'file', multiple: true, hidden: true, onchange: function () { voegMateriaalToe(Array.from(matInput.files || [])); matInput.value = ''; } });
    async function leesBestanden(lijst) {
      var json = lijst.filter(function (f) { return /\.json$/i.test(f.name); }), overig = lijst.filter(function (f) { return !/\.json$/i.test(f.name); });
      for (var i = 0; i < json.length; i++) {
        try {
          var data = JSON.parse(await json[i].text());
          if (data && (Array.isArray(data) || data.taken || data.tasks)) { st.plan = leesPlan(data); st.fout = ''; st.start = geldigeDatum(st.plan.startdatum) ? st.plan.startdatum : vandaag(); }
          else overig.push(json[i]);
        } catch (e) { st.fout = json[i].name + ': ' + (e instanceof SyntaxError ? 'dit is geen geldig JSON-bestand.' : e.message); }
      }
      voegMateriaalToe(overig);
    }
    function voegMateriaalToe(lijst) { lijst.forEach(function (f) { st.bestanden[f.name.toLowerCase()] = f; }); teken(); }
    var vak = el('div', { class: 'sleepvak', role: 'button', tabindex: '0',
      onclick: function () { planInput.click(); }, onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); planInput.click(); } },
      ondragover: function (e) { e.preventDefault(); vak.classList.add('over'); }, ondragleave: function () { vak.classList.remove('over'); },
      ondrop: function (e) { e.preventDefault(); vak.classList.remove('over'); leesBestanden(Array.from(e.dataTransfer.files || [])); }
    }, [el('b', { text: st.plan ? 'Ander plan kiezen' : 'Sleep je plan hierheen' }), el('span', { class: 'klein', text: 'Een .json-bestand van Claude, eventueel samen met de bijbehorende foto\'s, video\'s en documenten. Of klik om te kiezen.' })]);

    var links = [vak, planInput, matInput];
    if (st.fout) links.push(el('div', { class: 'melding fout', style: 'margin-top:14px', text: st.fout }));
    if (st.plan) links.push(voorvertoning(st, matInput));
    return [
      el('div', { class: 'pagina-kop' }, [el('div', null, [el('h1', { text: 'Plan inladen' }), el('p', { class: 'sub', text: 'Een plan zet in één keer alle taken in je kalender, met het materiaal erbij.' })])]),
      el('div', { class: 'plan-raster' }, [el('div', null, links), uitleg()])
    ];
  }
  function voorvertoning(st, matInput) {
    var p = st.plan, start = st.start || vandaag();
    var datums = p.taken.map(function (t) { return planDatum(t, start); }).sort();
    var perProject = {};
    p.taken.forEach(function (t) { var n = t.project || 'Zonder project'; perProject[n] = (perProject[n] || 0) + 1; });
    var nodig = [], ontbreekt = [];
    p.taken.forEach(function (t) { t.materiaal.forEach(function (m) { if (m.bestand && !m.tekst && !m.url) { nodig.push(m.bestand); if (!st.bestanden[String(m.bestand).toLowerCase()]) ontbreekt.push(m.bestand); } }); });
    var bekend = {}; S.projecten.forEach(function (x) { bekend[x.naam.toLowerCase()] = true; });
    var nieuweProj = Object.keys(perProject).filter(function (n) { return n !== 'Zonder project' && !bekend[n.toLowerCase()]; });
    var knop = el('button', { type: 'button', class: 'btn btn-primair btn-breed', text: 'Zet ' + p.taken.length + ' taken in mijn kalender', onclick: function () { importeer(st, knop); } });
    return el('div', { class: 'uitleg', style: 'margin-top:16px' }, [
      el('h3', { text: p.naam }),
      el('div', { class: 'voorvertoning' }, [
        el('div', { class: 'vv-rij' }, [el('span', { text: 'Taken' }), el('b', { text: String(p.taken.length) })]),
        el('div', { class: 'vv-rij' }, [el('span', { text: 'Periode' }), el('b', { text: datums.length ? datumKort(datums[0]) + ' t/m ' + datumKort(datums[datums.length - 1]) : '-' })]),
        Object.keys(perProject).map(function (n) { return el('div', { class: 'vv-rij' }, [el('span', { text: n + (nieuweProj.indexOf(n) >= 0 ? ' (nieuw project)' : '') }), el('b', { text: perProject[n] + (perProject[n] === 1 ? ' taak' : ' taken') })]); }),
        nodig.length ? el('div', { class: 'vv-rij' }, [el('span', { text: 'Bestanden' }), el('b', { text: (nodig.length - ontbreekt.length) + ' van ' + nodig.length + ' gekozen' })]) : null
      ]),
      p.relatief ? el('div', { class: 'veld', style: 'margin:0' }, [el('label', { for: 'planStart', text: 'Startdatum (dag 1 van het plan)' }),
        el('input', { id: 'planStart', type: 'date', value: start, onchange: function () { if (geldigeDatum(this.value)) { st.start = this.value; teken(); } } })]) : null,
      ontbreekt.length ? el('div', { class: 'melding info', style: 'margin:0' }, [
        'Het plan noemt bestanden die je nog niet gekozen hebt: ' + ontbreekt.slice(0, 6).join(', ') + (ontbreekt.length > 6 ? ' en nog ' + (ontbreekt.length - 6) : '') + '. Zonder bestand wordt dat materiaal overgeslagen. ',
        el('button', { type: 'button', class: 'btn btn-tekst btn-mini', text: 'Bestanden kiezen', onclick: function () { matInput.click(); } })
      ]) : nodig.length ? null : el('button', { type: 'button', class: 'btn btn-tekst btn-mini', style: 'justify-self:start', text: '+ Extra bestanden toevoegen', onclick: function () { matInput.click(); } }),
      p.fouten.length ? el('div', { class: 'melding fout', style: 'margin:0' }, p.fouten.slice(0, 5).map(function (f) { return el('div', { text: f }); })) : null,
      knop,
      el('button', { type: 'button', class: 'btn btn-tekst btn-mini', style: 'justify-self:center', text: 'Annuleren', onclick: function () { S.plan = null; teken(); } })
    ]);
  }
  async function importeer(st, knop) {
    var p = st.plan, start = st.start || vandaag();
    knop.disabled = true; knop.textContent = 'Projecten klaarzetten...';
    try {
      var map = {}; S.projecten.forEach(function (x) { map[x.naam.toLowerCase()] = x.id; });
      var namen = []; p.taken.forEach(function (t) { if (t.project && !map[t.project.toLowerCase()] && namen.indexOf(t.project) < 0) namen.push(t.project); });
      for (var i = 0; i < namen.length; i++) {
        var r = await sb.from('dz_projecten').insert({ naam: namen[i].slice(0, 80), kleur: KLEUREN[(S.projecten.length + i) % KLEUREN.length], volgorde: S.projecten.length + i }).select().single();
        if (r.error) throw r.error;
        map[namen[i].toLowerCase()] = r.data.id;
      }
      var pl = await sb.from('dz_plannen').insert({ naam: p.naam, bron: 'import', aantal_taken: p.taken.length }).select().single();
      if (pl.error) throw pl.error;
      var rijen = [], overgeslagen = 0, volg = {};
      for (var j = 0; j < p.taken.length; j++) {
        var t = p.taken[j], id = uuid(), mat = [];
        knop.textContent = 'Taak ' + (j + 1) + ' van ' + p.taken.length + '...';
        for (var k = 0; k < t.materiaal.length; k++) {
          var m = t.materiaal[k];
          if (m.tekst != null) mat.push({ id: uuid(), soort: 'tekst', naam: String(m.naam || 'Tekst'), tekst: String(m.tekst) });
          else if (m.url) mat.push(Object.assign({ id: uuid(), soort: 'link', naam: String(m.naam || m.url), url: String(m.url) }, /^(video|image)\/[\w.+-]+$/.test(String(m.type || '')) ? { type: String(m.type) } : {}));
          else if (m.bestand) {
            var f = st.bestanden[String(m.bestand).toLowerCase()];
            if (!f) { overgeslagen++; continue; }
            var up = await upload(f, id); if (m.naam) up.naam = String(m.naam); mat.push(up);
          }
        }
        var datum = planDatum(t, start);
        volg[datum] = (volg[datum] || 0) + 1;
        rijen.push({ id: id, plan_id: pl.data.id, project_id: t.project ? map[t.project.toLowerCase()] : null, titel: t.titel, omschrijving: t.omschrijving ? String(t.omschrijving).slice(0, 8000) : null,
          waarom: t.waarom ? String(t.waarom).slice(0, 2000) : null, kanaal: t.kanaal ? String(t.kanaal).slice(0, 60) : null,
          duur_min: t.duur != null && !isNaN(Number(t.duur)) ? Math.max(0, Math.min(1440, Math.round(Number(t.duur)))) : null,
          datum: datum, volgorde: volg[datum], stappen: t.stappen.map(function (s) { return { tekst: String(s).slice(0, 300), klaar: false }; }), materiaal: mat, bron: 'plan' });
      }
      knop.textContent = 'Opslaan...';
      for (var b = 0; b < rijen.length; b += 100) {
        var ins = await sb.from('dz_taken').insert(rijen.slice(b, b + 100));
        if (ins.error) throw ins.error;
      }
      S.plan = null;
      await laad();
      var eerste = rijen.map(function (x) { return x.datum; }).sort()[0];
      S.maand = eerste ? new Date(parse(eerste).getFullYear(), parse(eerste).getMonth(), 1) : null; S.gekozenDag = eerste || null;
      location.hash = '#/kalender'; teken();
      toast(rijen.length + ' taken ingeladen' + (overgeslagen ? ', ' + overgeslagen + ' bestanden ontbraken' : ''));
    } catch (e) {
      knop.disabled = false; knop.textContent = 'Opnieuw proberen';
      toast('Inladen lukte niet: ' + fouttekst(e), true);
    }
  }
  function uitleg() {
    return el('aside', { class: 'uitleg' }, [
      el('h3', { text: 'Hoe ziet een plan eruit?' }),
      el('p', { class: 'zacht', text: 'Claude maakt je plan als een JSON-bestand. Per taak staan er een titel, een datum of dagnummer, het project en eventueel stappen en materiaal in.' }),
      el('ul', null, [
        el('li', null, ['Gebruik ', el('code', { text: 'datum' }), ' (2026-11-24) of ', el('code', { text: 'dag' }), ' (1 = de startdatum).']),
        el('li', null, ['Projecten die nog niet bestaan worden automatisch aangemaakt.']),
        el('li', null, ['Materiaal is een ', el('code', { text: 'tekst' }), ', een ', el('code', { text: 'url' }), ' of een ', el('code', { text: 'bestand' }), '. Bestanden kies je samen met het plan.']),
        el('li', null, ['Een heel plan haal je weer weg bij Projecten, onder Ingeladen plannen.'])
      ]),
      el('pre', { class: 'code', text: JSON.stringify(VOORBEELD, null, 2) }),
      el('button', { type: 'button', class: 'btn btn-zacht btn-klein', style: 'justify-self:start', text: 'Download voorbeeldplan', onclick: function () {
        downloadBlob(new Blob([JSON.stringify(VOORBEELD, null, 2)], { type: 'application/json' }), 'dagzet-voorbeeldplan.json');
      } })
    ]);
  }

  /* ---------------- Start ---------------- */
  (async function start() {
    var s = await sb.auth.getSession();
    if (s.data && s.data.session) {
      var ok = await naInloggen(s.data.session.user);
      if (!ok) return;
    } else toonIntro();
  })();
  sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT' && S.user) { S.user = null; toonIntro(); } });
})();
