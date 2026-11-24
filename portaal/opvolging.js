/* Mijn Flowsmid: onderdeel Opvolging (alleen beheer).
   - Scherm #/vandaag: per prospect de taak van vandaag, met knoppen om het profiel en de DM te openen,
     het klaargezette bericht te kopiëren en de taak af te vinken (dan schuift de prospect door naar de volgende fase).
   - Blok bovenaan het Overzicht: wat er vandaag moet gebeuren en hoe de verkoop ervoor staat.
   - Blok Opvolging op de pagina van een prospect.
   Flowsmid doet zelf niets op Instagram: liken, reageren en DM's versturen doe je zelf.
   Gegevens: flowsmid.prospects (opvolg_fase, volgende_actie, demo_*, berichten, opvolg_log). Alleen voor beheerders. */
(function () {
  'use strict';
  var cfg = window.FLOWSMID_CONFIG || {};
  if (!window.supabase || !cfg.supabaseUrl) return;
  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'flowsmid-portaal' },
    db: { schema: 'flowsmid' }
  });
  var BUCKET = 'flowsmid-bestanden';

  /* Fases van de opvolging, in volgorde. dagen = na Gedaan komt de volgende taak zoveel dagen later. */
  var FASES = {
    opwarmen: { naam: 'Opwarmen', taak: 'Volgen en 2 of 3 posts liken', uitleg: 'Volg het account, like een paar recente posts en laat bij één post een korte, echte reactie achter. Morgen volgt de DM.', volgende: 'dm', dagen: 1, kleur: 'grijs' },
    dm: { naam: 'Openings-DM', taak: 'Openings-DM sturen', uitleg: 'Kopieer het bericht, open de DM en plak het. Je vraagt of je de site mag sturen.', bericht: 'opening', volgende: 'link', dagen: 1, status: 'Benaderd', kleur: 'blauw' },
    link: { naam: 'Link sturen', taak: 'Demo nakijken en link met video sturen', uitleg: 'Open de demo en kijk hem kort na. Daarna kopieer je het bericht met de link en de video en stuur je het in de DM.', bericht: 'link', volgende: 'reminder', dagen: 3, status: 'Demo gestuurd', kleur: 'geel' },
    reminder: { naam: 'Reminder', taak: 'Reminder sturen', uitleg: 'Nog geen reactie op de demo. Stuur de korte reminder.', bericht: 'reminder', volgende: 'langsgaan', dagen: 3, kleur: 'geel' },
    langsgaan: { naam: 'Langsgaan', taak: 'Langsgaan in de zaak', uitleg: 'Ga even langs met de demo op je telefoon. De gesprekspunten staan hieronder.', bericht: 'langsgaan', volgende: 'afwachten', dagen: 7, kleur: 'geel' },
    afwachten: { naam: 'Afwachten', taak: 'Laatste keer polsen', uitleg: 'Een week na het langsgaan. Nog interesse? Anders zet je hem op Geen interesse of Later.', volgende: 'klaar', dagen: null, status: 'Later', kleur: 'grijs' },
    gesprek: { naam: 'Gesprek', taak: 'Gesprek plannen en offerte sturen', uitleg: 'Ze reageerden positief. Plan een gesprek of bel, en stuur daarna de offerte.', volgende: 'klaar', dagen: null, kleur: 'groen' },
    klaar: { naam: 'Afgerond', taak: '', uitleg: '', kleur: 'grijs' }
  };
  var VOLGORDE = ['opwarmen', 'dm', 'link', 'reminder', 'langsgaan', 'afwachten', 'gesprek'];
  var DEMO = { aangevraagd: ['Demo wordt vannacht gebouwd', 'blauw'], bezig: ['Demo wordt gebouwd', 'blauw'], klaar: ['Demo klaar', 'groen'], fout: ['Demo mislukt', 'rood'] };

  var $ = function (id) { return document.getElementById(id); };
  var versie = 0;

  var CSS = '' +
    '.op-kop-datum{color:var(--zacht);font-size:14px;margin-top:4px}' +
    '.op-tellers{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}' +
    '.op-teller{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:99px;border:1px solid var(--lijn);background:var(--vlak);font-size:13px;color:var(--zacht);text-decoration:none}' +
    '.op-teller b{color:var(--tekst);font-size:15px}' +
    '.op-taken{display:grid;gap:12px}' +
    '.op-taak{background:var(--vlak);border:1px solid var(--lijn);border-radius:18px;padding:16px;display:grid;gap:10px}' +
    '.op-taak.laat{border-color:rgba(251,191,36,.45)}' +
    '.op-taak-kop{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}' +
    '.op-taak-kop a{color:inherit;text-decoration:none}.op-taak-naam{font-weight:800;font-size:17px;line-height:1.25}' +
    '.op-taak-meta{font-size:13px;color:var(--zacht);margin-top:2px}' +
    '.op-wat{font-weight:700;font-size:15px}.op-wat small{display:block;font-weight:400;color:var(--zacht);font-size:13px;margin-top:2px}' +
    '.op-knoppen{display:flex;gap:8px;flex-wrap:wrap}' +
    '.op-knoppen .btn{min-height:42px}' +
    '@media(max-width:560px){.op-knoppen{display:grid;grid-template-columns:1fr 1fr}.op-knoppen .btn{width:100%;justify-content:center}.op-knoppen .op-breed{grid-column:1/-1}}' +
    '.op-bericht{white-space:pre-wrap;background:var(--vlak-2);border:1px solid var(--lijn);border-radius:12px;padding:10px 12px;font-size:14px;line-height:1.45;max-height:220px;overflow:auto}' +
    '.op-bericht.leeg-b{color:var(--zwak);font-style:italic}' +
    '.op-haak{font-size:13px;color:var(--zacht);background:rgba(196,181,253,.08);border-radius:10px;padding:8px 10px}' +
    '.op-vink{display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer}.op-vink input{width:18px;height:18px;accent-color:#6D28D9}' +
    '.op-demo{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;color:var(--zacht)}' +
    '.op-sectie{margin-top:28px}.op-sectie h2{margin:0 0 10px}' +
    '.op-rij{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:12px 16px;border-top:1px solid var(--lijn);color:inherit;text-decoration:none}' +
    '.op-rij:first-child{border-top:0}.op-rij:hover{background:rgba(196,181,253,.05)}' +
    '.op-pijp{display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:8px}' +
    '.op-pijp a{display:block;background:var(--vlak);border:1px solid var(--lijn);border-radius:14px;padding:10px 12px;color:inherit;text-decoration:none}' +
    '.op-pijp a:hover{border-color:var(--lijn-sterk)}.op-pijp b{display:block;font-size:22px;letter-spacing:-.02em}.op-pijp span{font-size:12px;color:var(--zacht)}' +
    '.op-blok{margin:0 0 26px;background:linear-gradient(135deg,rgba(109,40,217,.16),rgba(59,130,246,.10));border:1px solid var(--lijn-sterk);border-radius:20px;padding:18px}' +
    '.op-blok-kop{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}.op-blok-kop h2{margin:0}' +
    '.op-nu{display:grid;gap:8px;margin-bottom:14px}' +
    '.op-nu a{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;background:var(--vlak);border:1px solid var(--lijn);border-radius:14px;padding:11px 14px;color:inherit;text-decoration:none}' +
    '.op-nu a:hover{border-color:var(--lijn-sterk)}.op-nu .op-num{font-weight:800;font-size:20px;min-width:28px;text-align:center}' +
    '.op-nu .op-pijl{color:var(--lavendel);font-weight:700}' +
    '.op-sub{font-size:12px;color:var(--zacht);text-transform:uppercase;letter-spacing:.08em;margin:14px 0 8px}' +
    '.op-detail{margin-bottom:16px}' +
    /* Vandaag staat in het zijmenu bovenaan bij Overzicht; de lege groep Overig verdwijnt dan. */
    'body.fd-zij #hoofdnav .fd-groep[data-g="6"]{display:none}';

  function el(tag, attrs, kinderen) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') n.textContent = v;
      else if (k === 'class') n.className = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kinderen || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return n;
  }
  function css() { if (!$('opvolgingCss')) document.head.appendChild(el('style', { id: 'opvolgingCss', text: CSS })); }
  function toast(t, fout) {
    var b = $('toasts'); if (!b) return;
    var n = el('div', { class: 'toast' + (fout ? ' fout' : ''), text: t }); b.appendChild(n);
    setTimeout(function () { n.remove(); }, 4200);
  }
  function pil(t, kleur) { return el('span', { class: 'pil ' + (kleur || ''), text: t }); }
  function dag(d) { d = d || new Date(); var x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); }
  function plus(n) { var d = new Date(); d.setDate(d.getDate() + n); return dag(d); }
  function datumKort(s) { return s ? new Date(s + 'T12:00:00').toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }) : ''; }
  function route() { var h = location.hash.replace(/^#\/?/, '').split('/'); return { pagina: h[0] || '', id: h[1] || '' }; }
  function isBeheerNav() { var n = $('hoofdnav'); return !!(n && !n.hidden && n.querySelector('a[href="#/klanten"]')); }
  function handle(p) {
    var bron = p.instagram || (/instagram\.com/i.test(p.bron_link || '') ? p.bron_link : '');
    if (!bron) return '';
    var h = String(bron).trim().replace(/^.*instagram\.com\//i, '').replace(/^@/, '').split(/[/?#]/)[0];
    return /^[A-Za-z0-9._]+$/.test(h) ? h : '';
  }
  function profielUrl(p) { var h = handle(p); return h ? 'https://www.instagram.com/' + h + '/' : (p.bron_link || ''); }
  function dmUrl(p) { var h = handle(p); return h ? 'https://ig.me/m/' + h : ''; }
  function openNieuw(u) { var w = window.open(u, '_blank', 'noopener'); if (w) w.opener = null; }
  async function kopieer(tekst) {
    try { await navigator.clipboard.writeText(tekst); return true; } catch (e) {
      var t = el('textarea', { style: 'position:fixed;top:-1000px;opacity:0' }); t.value = tekst; document.body.appendChild(t); t.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (x) { ok = false; }
      t.remove(); return ok;
    }
  }
  function voornaamZaak(p) { return p.contactpersoon ? String(p.contactpersoon).split(' ')[0] : ''; }
  /* Standaardteksten voor als de nachtelijke taak (nog) niets heeft klaargezet. */
  function standaard(p, soort) {
    var groet = 'Hoi' + (voornaamZaak(p) ? ' ' + voornaamZaak(p) : '') + '!';
    var demo = p.demo_url || '[link naar de demo]';
    if (soort === 'opening') return groet + ' Ik kom jullie posts steeds tegen, mooi werk bij ' + p.naam + '. Ik ben Anthony van Flowsmid uit Spijkenisse. Ik heb alvast een eigen website met online afspraken voor jullie in elkaar gezet, als cadeautje, zonder kosten of verplichtingen. Mag ik je de link sturen?';
    if (soort === 'link') return 'Top! Hier is hij: ' + demo + '\n\nKlanten zien jullie diensten en prijzen en boeken direct een tijd, zonder platform ertussen. In deze korte video zie je hoe je zelf de afspraken beheert: %VIDEO%\n\nAlles is aan te passen: echte namen en foto\'s van het team zet ik er gratis in. De demo blijft een week online. Wat vind je ervan?';
    if (soort === 'reminder') return groet + ' Heb je de site al kunnen bekijken? ' + demo + '\nIk hoor graag wat je ervan vindt, ook als het niks voor jullie is.';
    if (soort === 'langsgaan') return '• Laat de demo op je telefoon zien: ' + demo + '\n• Vertel wat het oplevert: klanten boeken zelf, geen commissie aan een platform\n• Eén duidelijke prijs, echte namen en foto\'s gratis erin\n• Vraag wat ze nu missen of lastig vinden';
    return '';
  }
  function bericht(p, soort) { var b = p.berichten || {}; return (b[soort] && String(b[soort]).trim()) || standaard(p, soort); }
  async function videoLink(p) {
    if (p.demo_video && /^https?:/i.test(p.demo_video)) return p.demo_video;
    var pad = p.demo_video;
    if (!pad && p.klant_id) {
      var r = await sb.from('klant_bestanden').select('pad, mime, map').eq('klant_id', p.klant_id).like('mime', 'video/%').order('aangemaakt_op', { ascending: false });
      var v = (r.data || []).filter(function (b) { return b.map === 'Demopakket'; })[0] || (r.data || [])[0];
      pad = v && v.pad;
    }
    if (!pad) return '';
    var s = await sb.storage.from(BUCKET).createSignedUrl(pad, 2592000);
    return s.data ? s.data.signedUrl : '';
  }
  async function berichtKlaar(p, soort) {
    var t = bericht(p, soort);
    if (t.indexOf('%VIDEO%') >= 0) {
      var v = await videoLink(p);
      t = t.replace(/%VIDEO%/g, v || '[video nog niet in de werkmap]');
    }
    if (p.demo_url) t = t.replace(/%DEMO%/g, p.demo_url);
    return t;
  }

  /* ---------- Fase wijzigen ---------- */
  async function zetFase(p, fase, dagen, actie, extra) {
    var upd = Object.assign({
      opvolg_fase: fase,
      opvolg_sinds: new Date().toISOString(),
      volgende_actie: dagen === null || dagen === undefined ? null : plus(dagen),
      opvolg_log: (p.opvolg_log || []).concat([{ op: new Date().toISOString(), fase: p.opvolg_fase, actie: actie }])
    }, extra || {});
    var x = await sb.from('prospects').update(upd).eq('id', p.id);
    if (x.error) { toast(x.error.message, true); return false; }
    Object.assign(p, upd); return true;
  }
  async function gedaan(p) {
    var f = FASES[p.opvolg_fase]; if (!f) return false;
    var extra = {};
    if (f.status && ['Klant geworden', 'Geen interesse'].indexOf(p.status) < 0) extra.status = f.status;
    if (p.opvolg_fase === 'link') extra.stappen = vink(p.stappen, /demopakket gestuurd|demo aanbieden/i);
    if (p.opvolg_fase === 'dm') extra.stappen = vink(p.stappen, /eerste contact/i);
    var ok = await zetFase(p, f.volgende, f.dagen, f.taak + ': gedaan', extra);
    if (ok) toast(f.volgende === 'klaar' ? p.naam + ' is afgerond' : 'Volgende taak: ' + FASES[f.volgende].taak + (f.dagen ? ' (' + datumKort(plus(f.dagen)) + ')' : ''));
    return ok;
  }
  function vink(stappen, re) {
    return (stappen || []).map(function (s) { return re.test(s.titel) && !s.gedaan ? Object.assign({}, s, { gedaan: true, gedaan_op: new Date().toISOString() }) : s; });
  }

  /* ---------- Dialogen ---------- */
  function dialoog(titel, inhoud, knoppen) {
    var d = $('dialoog'); if (!d) return null;
    $('dialoogTitel').textContent = titel;
    var fout = $('dialoogFout'); fout.hidden = true;
    $('dialoogInhoud').replaceChildren.apply($('dialoogInhoud'), inhoud);
    $('dialoogKnoppen').replaceChildren.apply($('dialoogKnoppen'), [el('button', { class: 'btn btn-ghost', type: 'button', onclick: function () { d.close(); } }, ['Annuleren'])].concat(knoppen.map(function (k) {
      return el('button', { class: 'btn ' + (k.klasse || 'btn-primair'), type: 'button', onclick: async function (e) {
        e.target.disabled = true;
        try { await k.doe(); d.close(); } catch (x) { fout.textContent = String(x && x.message || x); fout.hidden = false; }
        e.target.disabled = false;
      } }, [k.tekst]);
    })));
    d.showModal(); return d;
  }
  function veld(id, label, invoer, hulp) { invoer.id = id; return el('div', { class: 'veld' }, [el('label', { for: id, text: label }), invoer, hulp ? el('div', { class: 'veld-hulp', text: hulp }) : null]); }
  function reageerde(p, klaar) {
    dialoog(p.naam + ' reageerde', [el('p', { class: 'zacht', style: 'margin-top:0', text: 'Wat was de reactie?' })], [
      { tekst: 'Wil de site zien', klasse: 'btn-ghost', doe: async function () { if (await zetFase(p, 'link', 0, 'Reageerde: wil de site zien', { status: 'Interesse' })) { toast('Stuur vandaag de link'); klaar(); } } },
      { tekst: 'Interesse, gesprek plannen', doe: async function () { if (await zetFase(p, 'gesprek', 0, 'Reageerde: interesse', { status: 'Interesse' })) { toast('Op de lijst: gesprek plannen'); klaar(); } } }
    ]);
  }
  function geenInteresse(p, klaar) {
    var reden = el('input', { maxlength: '200', placeholder: 'Bijvoorbeeld: tevreden met Salonized' });
    dialoog('Geen interesse', [el('p', { class: 'zacht', style: 'margin-top:0', text: p.naam + ' gaat uit de opvolging. De demo blijft gewoon staan.' }), veld('opReden', 'Reden (mag leeg)', reden)], [
      { tekst: 'Afsluiten', klasse: 'btn-gevaar', doe: async function () {
        var n = reden.value.trim();
        var extra = { status: 'Geen interesse' };
        if (n) extra.notitie = ((p.notitie ? p.notitie + '\n\n' : '') + 'Geen interesse (' + new Date().toLocaleDateString('nl-NL') + '): ' + n).slice(0, 8000);
        if (await zetFase(p, 'klaar', null, 'Geen interesse' + (n ? ': ' + n : ''), extra)) { toast('Afgesloten'); klaar(); }
      } }
    ]);
  }
  function later(p, klaar) {
    var d = el('input', { type: 'date', value: plus(1), min: plus(1) });
    dialoog('Later doen', [veld('opLater', 'Nieuwe datum voor deze taak', d)], [
      { tekst: 'Verplaatsen', doe: async function () {
        var x = await sb.from('prospects').update({ volgende_actie: d.value || plus(1) }).eq('id', p.id);
        if (x.error) throw x.error; p.volgende_actie = d.value; toast('Verplaatst naar ' + datumKort(d.value)); klaar();
      } }
    ]);
  }
  /* Nieuwe prospect in de opvolging, of een bestaande erin zetten. */
  function toevoegen(bestaand) {
    var p = bestaand || {};
    var link = el('input', { maxlength: '300', placeholder: 'instagram.com/zaaknaam of salonized-link', value: p.bron_link || p.instagram || '' });
    var naam = el('input', { maxlength: '200', placeholder: 'Bijvoorbeeld: Barbershop Ocean', value: p.naam || '' });
    var plaats = el('input', { maxlength: '120', value: p.plaats || '' });
    var ig = el('input', { maxlength: '300', placeholder: 'Alleen als de link hierboven geen Instagram is', value: p.instagram && p.instagram !== p.bron_link ? p.instagram : '' });
    var bouw = el('input', { type: 'checkbox' }); bouw.checked = !p.demo_url;
    dialoog(bestaand ? 'In de opvolging zetten' : 'Prospect toevoegen', [
      el('p', { class: 'zacht', style: 'margin-top:0', text: 'Vandaag begin je met opwarmen. De demo wordt vannacht gebouwd en de berichten worden klaargezet, zodat alles klaarstaat als je de link stuurt.' }),
      veld('opLink', 'Link naar Instagram of de boekingspagina', link),
      veld('opNaam', 'Naam van de zaak', naam, 'Mag leeg: dan zoekt de nachtelijke taak de naam op.'),
      el('div', { class: 'pr-twee' }, [veld('opPlaats', 'Plaats', plaats), veld('opIg', 'Instagram (los)', ig)]),
      el('label', { class: 'op-vink' }, [bouw, 'Demo laten bouwen'])
    ], [{ tekst: bestaand ? 'Start opvolging' : 'Toevoegen', doe: async function () {
      var l = link.value.trim();
      if (!l && !bestaand) throw new Error('Vul een link in.');
      if (l && !/^https?:\/\//i.test(l)) l = 'https://' + l.replace(/^@/, 'instagram.com/');
      var instaLos = ig.value.trim();
      var rij = {
        naam: naam.value.trim() || p.naam || (handle({ bron_link: l }) || l.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]),
        plaats: plaats.value.trim() || p.plaats || null,
        bron_link: l || p.bron_link || null,
        instagram: /instagram\.com/i.test(l) ? l : (instaLos || p.instagram || null),
        opvolg_fase: 'opwarmen', opvolg_sinds: new Date().toISOString(), volgende_actie: dag(),
        opvolg_log: (p.opvolg_log || []).concat([{ op: new Date().toISOString(), fase: null, actie: 'In de opvolging gezet' }])
      };
      if (bouw.checked) { rij.demo_status = 'aangevraagd'; rij.demo_aangevraagd_op = new Date().toISOString(); rij.demo_fout = null; }
      var x;
      if (bestaand) x = await sb.from('prospects').update(rij).eq('id', p.id).select('id').single();
      else {
        rij.status = 'Nieuw'; rij.prioriteit = 1; rij.bron = 'Opvolging';
        if (/salonized|fresha|treatwell|salonkee/i.test(l)) rij.soort = 'Afspraken';
        x = await sb.from('prospects').insert(rij).select('id').single();
      }
      if (x.error) throw x.error;
      toast(bouw.checked ? 'Toegevoegd. De demo wordt vannacht gebouwd.' : 'Toegevoegd aan de opvolging');
      if (route().pagina === 'vandaag') setTimeout(function () { teken(true); }, 0); else location.hash = '#/vandaag';
    } }]);
  }

  /* ---------- Eén taakkaart ---------- */
  function taakKaart(p, nu, herteken) {
    var f = FASES[p.opvolg_fase] || {};
    var laat = p.volgende_actie && p.volgende_actie < nu;
    var kaart = el('article', { class: 'op-taak' + (laat ? ' laat' : '') });
    var kop = el('div', { class: 'op-taak-kop' }, [
      el('a', { href: '#/prospect/' + p.id }, [el('div', { class: 'op-taak-naam', text: p.naam }),
        el('div', { class: 'op-taak-meta', text: [p.plaats, handle(p) ? '@' + handle(p) : '', laat ? 'sinds ' + datumKort(p.volgende_actie) : ''].filter(Boolean).join(' · ') })]),
      pil(f.naam || p.opvolg_fase, f.kleur)
    ]);
    var wat = el('div', { class: 'op-wat' }, [f.taak, el('small', { text: f.uitleg })]);
    var demo = null;
    if (p.demo_status || p.demo_url) {
      var d = DEMO[p.demo_status] || ['Demo', 'grijs'];
      demo = el('div', { class: 'op-demo' }, [pil(d[0], d[1]),
        p.demo_url ? el('a', { href: p.demo_url, target: '_blank', rel: 'noopener', text: p.demo_url.replace(/^https?:\/\//, '') }) : null,
        p.demo_status === 'fout' && p.demo_fout ? el('span', { text: p.demo_fout }) : null]);
    }
    var soort = f.bericht, tekstVak = null, haak = null;
    if (soort) {
      var t = bericht(p, soort);
      tekstVak = el('div', { class: 'op-bericht' + (t ? '' : ' leeg-b'), text: t ? t.replace(/%VIDEO%/g, '[videolink wordt ingevuld bij kopiëren]') : 'Nog geen bericht klaargezet.' });
      if (p.berichten && p.berichten.haakje && (soort === 'opening' || soort === 'langsgaan')) haak = el('div', { class: 'op-haak', text: 'Uit hun posts: ' + p.berichten.haakje });
    }
    var knoppen = el('div', { class: 'op-knoppen' });
    var prof = profielUrl(p), dm = dmUrl(p);
    if (p.opvolg_fase === 'opwarmen' && prof) knoppen.appendChild(el('button', { class: 'btn btn-primair btn-klein op-breed', type: 'button', onclick: function () { openNieuw(prof); } }, ['Open profiel']));
    else if (prof && p.opvolg_fase !== 'langsgaan') knoppen.appendChild(el('button', { class: 'btn btn-ghost btn-klein', type: 'button', onclick: function () { openNieuw(prof); } }, ['Open profiel']));
    if (soort && soort !== 'langsgaan') {
      /* De tekst (met verse videolink) wordt vooraf klaargezet: op de iPhone moet kopiëren direct bij de tik gebeuren. */
      var klaarTekst = null;
      berichtKlaar(p, soort).then(function (t) { klaarTekst = t; if (tekstVak) tekstVak.textContent = t; }).catch(function () {});
      knoppen.appendChild(el('button', { class: 'btn btn-primair btn-klein', type: 'button', onclick: async function () {
        var ok = await kopieer(klaarTekst || bericht(p, soort));
        toast(ok ? 'Bericht gekopieerd. Plak het in de DM.' : 'Kopiëren lukte niet. Houd de tekst ingedrukt om te kopiëren.', !ok);
      } }, ['Kopieer bericht']));
      if (dm) knoppen.appendChild(el('button', { class: 'btn btn-ghost btn-klein', type: 'button', onclick: function () { openNieuw(dm); } }, ['Open DM']));
    }
    if (p.opvolg_fase === 'langsgaan' && p.adres) knoppen.appendChild(el('button', { class: 'btn btn-ghost btn-klein', type: 'button', onclick: function () { openNieuw('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.naam + ' ' + p.adres + ' ' + (p.plaats || ''))); } }, ['Route']));
    if (p.opvolg_fase === 'link' && p.demo_url) knoppen.appendChild(el('button', { class: 'btn btn-ghost btn-klein', type: 'button', onclick: function () { openNieuw(p.demo_url); } }, ['Open demo']));
    var nagekeken = null;
    if (p.opvolg_fase === 'link') {
      var v = el('input', { type: 'checkbox' }); v.checked = !!p.demo_nagekeken;
      v.addEventListener('change', async function () {
        var x = await sb.from('prospects').update({ demo_nagekeken: v.checked }).eq('id', p.id);
        if (x.error) { toast(x.error.message, true); v.checked = !v.checked; } else p.demo_nagekeken = v.checked;
      });
      nagekeken = el('label', { class: 'op-vink' }, [v, 'Demo nagekeken op mijn telefoon']);
    }
    var acties = el('div', { class: 'op-knoppen' }, [
      el('button', { class: 'btn btn-primair btn-klein op-breed', type: 'button', onclick: async function (e) {
        if (p.opvolg_fase === 'link' && p.demo_status !== 'klaar' && !p.demo_url) { toast('De demo is nog niet klaar.', true); return; }
        if (p.opvolg_fase === 'link' && !p.demo_nagekeken) { toast('Vink eerst aan dat je de demo hebt nagekeken.', true); return; }
        e.target.disabled = true; if (await gedaan(p)) herteken(); else e.target.disabled = false;
      } }, ['Gedaan']),
      p.opvolg_fase !== 'gesprek' ? el('button', { class: 'btn btn-ghost btn-klein', type: 'button', onclick: function () { reageerde(p, herteken); } }, ['Reageerde']) : null,
      el('button', { class: 'btn btn-ghost btn-klein', type: 'button', onclick: function () { later(p, herteken); } }, ['Later']),
      el('button', { class: 'btn btn-tekst btn-klein', type: 'button', onclick: function () { geenInteresse(p, herteken); } }, ['Geen interesse'])
    ]);
    [kop, wat, demo, haak, tekstVak, knoppen.childNodes.length ? knoppen : null, nagekeken, acties].forEach(function (x) { if (x) kaart.appendChild(x); });
    return kaart;
  }

  /* ---------- Scherm Vandaag ---------- */
  async function laadOpvolging() {
    var r = await sb.from('prospects').select('*').not('opvolg_fase', 'is', null).order('volgende_actie', { ascending: true, nullsFirst: false }).order('prioriteit').limit(1000);
    if (r.error) throw r.error;
    return r.data || [];
  }
  async function vandaagScherm() {
    var alle = await laadOpvolging(), nu = dag();
    var actief = alle.filter(function (p) { return p.opvolg_fase !== 'klaar'; });
    var taken = actief.filter(function (p) { return p.volgende_actie && p.volgende_actie <= nu; });
    var straks = actief.filter(function (p) { return p.volgende_actie && p.volgende_actie > nu && p.volgende_actie <= plus(7); });
    var demos = alle.filter(function (p) { return p.demo_status && p.demo_status !== 'klaar'; });
    var kop = el('div', { class: 'pagina-kop' }, [
      el('div', null, [el('span', { class: 'label', text: 'Opvolging' }), el('h1', { text: 'Vandaag' }),
        el('p', { class: 'sub', text: new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }) + '. ' + (taken.length ? taken.length + (taken.length === 1 ? ' taak' : ' taken') + ' voor vandaag.' : 'Niets meer te doen voor vandaag.') })]),
      el('div', { class: 'acties' }, [el('button', { class: 'btn btn-primair', type: 'button', onclick: function () { toevoegen(null); } }, ['Prospect toevoegen'])])
    ]);
    var tel = {}; actief.forEach(function (p) { tel[p.opvolg_fase] = (tel[p.opvolg_fase] || 0) + 1; });
    var tellers = el('div', { class: 'op-tellers' }, VOLGORDE.filter(function (f) { return tel[f]; }).map(function (f) {
      return el('span', { class: 'op-teller' }, [el('b', { text: String(tel[f]) }), FASES[f].naam]);
    }));
    var lijst = el('div', { class: 'op-taken' });
    function herteken() { teken(true); }
    taken.forEach(function (p) { lijst.appendChild(taakKaart(p, nu, herteken)); });
    var inhoud = [kop, tellers.childNodes.length ? tellers : null,
      taken.length ? lijst : el('div', { class: 'leeg' }, [el('b', { text: actief.length ? 'Alles gedaan voor vandaag' : 'Nog niemand in de opvolging' }),
        actief.length ? 'Morgen staan de volgende taken hier klaar.' : 'Voeg een prospect toe met de link naar hun Instagram of boekingspagina.'])];
    if (demos.length) inhoud.push(el('section', { class: 'op-sectie' }, [el('h2', { text: 'Demo\'s in de maak' }), el('div', { class: 'lijst' }, demos.map(function (p) {
      var d = DEMO[p.demo_status] || ['', ''];
      return el('a', { class: 'op-rij', href: '#/prospect/' + p.id }, [el('div', null, [el('div', { class: 'rij-titel', text: p.naam }),
        el('div', { class: 'rij-meta', text: p.demo_status === 'fout' ? (p.demo_fout || 'Bouwen lukte niet') : 'Aangevraagd ' + (p.demo_aangevraagd_op ? new Date(p.demo_aangevraagd_op).toLocaleDateString('nl-NL') : '') })]), pil(d[0], d[1])]);
    }))]));
    if (straks.length) inhoud.push(el('section', { class: 'op-sectie' }, [el('h2', { text: 'Komende dagen' }), el('div', { class: 'lijst' }, straks.map(function (p) {
      var f = FASES[p.opvolg_fase] || {};
      return el('a', { class: 'op-rij', href: '#/prospect/' + p.id }, [el('div', null, [el('div', { class: 'rij-titel', text: p.naam }), el('div', { class: 'rij-meta', text: f.taak })]),
        el('span', { class: 'klein', text: datumKort(p.volgende_actie) })]);
    }))]));
    return { titel: 'Vandaag', inhoud: inhoud };
  }

  /* ---------- Navigatie ---------- */
  function opVandaag() { return route().pagina === 'vandaag'; }
  function nav() {
    var n = $('hoofdnav');
    if (!isBeheerNav()) return;
    css();
    var a = n.querySelector('.opvolging-link');
    if (!a) {
      a = el('a', { href: '#/vandaag', class: 'opvolging-link' }, ['Vandaag']);
      var na = n.querySelector('a[href="#/"]');
      n.insertBefore(a, na ? na.nextSibling : n.firstChild);
      tellerNav();
    }
    var aan = opVandaag();
    if (aan) n.querySelectorAll('a.actief').forEach(function (x) { if (x !== a) { x.classList.remove('actief'); x.removeAttribute('aria-current'); } });
    a.classList.toggle('actief', aan);
    if (aan) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    [0, 80].forEach(function (ms) { setTimeout(function () { if (document.body.classList.contains('fd-zij') && a.style.getPropertyValue('--fd-o') !== '11') a.style.setProperty('--fd-o', '11'); }, ms); });
  }
  var navTal = null, navTalOp = 0;
  async function tellerNav() {
    if (Date.now() - navTalOp > 60000 || navTal === null) {
      navTalOp = Date.now();
      var r = await sb.from('prospects').select('id', { count: 'exact', head: true }).not('opvolg_fase', 'is', null).neq('opvolg_fase', 'klaar').lte('volgende_actie', dag());
      navTal = r.count || 0;
    }
    var a = document.querySelector('#hoofdnav .opvolging-link'); if (!a) return;
    var b = a.querySelector('.teller-bol');
    if (navTal && !b) a.appendChild(el('span', { class: 'teller-bol', text: String(navTal), 'aria-label': navTal + ' taken vandaag' }));
    else if (b) { if (navTal) b.textContent = String(navTal); else b.remove(); }
  }

  /* ---------- Tekenen ---------- */
  function zet(inhoud, titel) {
    $('app').replaceChildren(el('div', { 'data-opvolging': '1' }, inhoud));
    document.title = (titel || 'Vandaag') + ' · Mijn Flowsmid';
  }
  function teken(stil) {
    if (!opVandaag() || !isBeheerNav()) return;
    var app = $('app'); if (!app || app.hidden) return;
    css(); nav();
    var mijn = ++versie, y = window.scrollY;
    if (!stil) zet([el('div', { class: 'laden', style: 'min-height:30vh' }, [el('span', { class: 'spinner', 'aria-label': 'Laden' })])]);
    vandaagScherm().then(function (uit) {
      if (mijn === versie && opVandaag()) { zet(uit.inhoud, uit.titel); if (stil) window.scrollTo(0, y); }
      navTal = null; tellerNav();
    }).catch(function (e) {
      if (mijn === versie) zet([el('div', { class: 'leeg' }, [el('b', { text: 'Dit kon niet worden geladen' }), String(e && e.message || e)])]);
    });
  }

  /* ---------- Blok bovenaan het Overzicht ---------- */
  var blokBezig = false;
  async function overzichtBlok() {
    if (route().pagina !== '' || !isBeheerNav() || blokBezig) return;
    var app = $('app'); if (!app || app.hidden || app.querySelector('[data-opvolging-blok]')) return;
    var tegels = app.querySelector('.tegels'); if (!tegels) return;
    blokBezig = true; css();
    try {
      var res = await Promise.all([
        laadOpvolging(),
        sb.from('prospects').select('status').limit(5000),
        sb.from('ww_trajecten').select('id, klant_id, titel, status, stappen').in('status', ['Lopend', 'Wacht op klant'])
      ]);
      if (route().pagina !== '' || app.querySelector('[data-opvolging-blok]') || !app.contains(tegels)) return;
      var alle = res[0], nu = dag(), actief = alle.filter(function (p) { return p.opvolg_fase !== 'klaar'; });
      var taken = actief.filter(function (p) { return p.volgende_actie && p.volgende_actie <= nu; });
      var nakijken = actief.filter(function (p) { return p.opvolg_fase === 'link' && p.demo_status === 'klaar' && !p.demo_nagekeken; });
      var mislukt = alle.filter(function (p) { return p.demo_status === 'fout'; });
      var bouw = alle.filter(function (p) { return p.demo_status === 'aangevraagd' || p.demo_status === 'bezig'; });
      var gesprek = actief.filter(function (p) { return p.opvolg_fase === 'gesprek'; });
      var trajecten = res[2].data || [];
      var stat = {}; (res[1].data || []).forEach(function (r) { stat[r.status] = (stat[r.status] || 0) + 1; });
      function regel(num, tekst, href, sub) {
        return el('a', { href: href }, [el('span', { class: 'op-num', text: String(num) }), el('div', null, [el('b', { text: tekst }), sub ? el('div', { class: 'klein', text: sub }) : null]), el('span', { class: 'op-pijl', text: '›' })]);
      }
      var nuLijst = el('div', { class: 'op-nu' });
      if (taken.length) nuLijst.appendChild(regel(taken.length, taken.length === 1 ? 'taak in de opvolging' : 'taken in de opvolging', '#/vandaag',
        taken.slice(0, 3).map(function (p) { return p.naam + ': ' + ((FASES[p.opvolg_fase] || {}).taak || '').toLowerCase(); }).join(' · ') + (taken.length > 3 ? ' …' : '')));
      if (nakijken.length) nuLijst.appendChild(regel(nakijken.length, nakijken.length === 1 ? 'demo klaar om na te kijken' : 'demo\'s klaar om na te kijken', '#/vandaag', nakijken.map(function (p) { return p.naam; }).join(', ')));
      if (gesprek.length) nuLijst.appendChild(regel(gesprek.length, gesprek.length === 1 ? 'prospect wil praten' : 'prospects willen praten', '#/vandaag', gesprek.map(function (p) { return p.naam; }).join(', ')));
      if (mislukt.length) nuLijst.appendChild(regel(mislukt.length, mislukt.length === 1 ? 'demo kon niet gebouwd worden' : 'demo\'s konden niet gebouwd worden', '#/prospect/' + mislukt[0].id, mislukt.map(function (p) { return p.naam; }).join(', ')));
      if (trajecten.length) nuLijst.appendChild(regel(trajecten.length, trajecten.length === 1 ? 'demopakket loopt' : 'demopakketten lopen', '#/werkwijze',
        trajecten.slice(0, 3).map(function (t) { var s = t.stappen || []; return s.filter(function (x) { return x.gedaan; }).length + '/' + s.length + ' stappen'; }).join(' · ')));
      if (!nuLijst.childNodes.length) nuLijst.appendChild(el('div', { class: 'leeg', style: 'padding:14px' }, [el('b', { text: 'Niets dat nu op je wacht' }), 'Voeg een prospect toe om de opvolging te starten.']));
      var tel = {}; actief.forEach(function (p) { tel[p.opvolg_fase] = (tel[p.opvolg_fase] || 0) + 1; });
      var pijp = el('div', { class: 'op-pijp' }, VOLGORDE.map(function (f) {
        return el('a', { href: '#/vandaag' }, [el('b', { text: String(tel[f] || 0) }), el('span', { text: FASES[f].naam })]);
      }).concat([el('a', { href: '#/prospects' }, [el('b', { text: String(stat['Klant geworden'] || 0) }), el('span', { text: 'Klant geworden' })])]));
      var blok = el('section', { class: 'op-blok', 'data-opvolging-blok': '1' }, [
        el('div', { class: 'op-blok-kop' }, [el('h2', { text: 'Wat moet ik nu doen?' }), el('div', { class: 'op-knoppen' }, [
          el('a', { class: 'btn btn-primair btn-klein', href: '#/vandaag' }, ['Naar Vandaag']),
          el('button', { class: 'btn btn-ghost btn-klein', type: 'button', onclick: function () { toevoegen(null); } }, ['Prospect toevoegen'])
        ])]),
        nuLijst,
        el('div', { class: 'op-sub', text: 'Verkoop: waar staan je prospects' + (bouw.length ? ' · ' + bouw.length + ' demo' + (bouw.length === 1 ? '' : '\'s') + ' in de maak' : '') }),
        pijp
      ]);
      var kop = app.querySelector('.pagina-kop');
      if (kop && kop.parentNode === tegels.parentNode) kop.parentNode.insertBefore(blok, kop.nextSibling); else tegels.parentNode.insertBefore(blok, tegels);
    } catch (e) { /* blok is een extraatje: bij een fout blijft het overzicht gewoon staan */ }
    finally { blokBezig = false; }
  }

  /* ---------- Blok op de pagina van een prospect ---------- */
  var detailBezig = false;
  async function detailBlok() {
    var r = route(); if (r.pagina !== 'prospect' || !r.id || detailBezig) return;
    var app = $('app'), wortel = app && app.querySelector('[data-prospects]');
    if (!wortel || wortel.querySelector('[data-opvolging-detail]')) return;
    var kolom = wortel.querySelector('.pr-kolom'); if (!kolom) return;
    detailBezig = true; css();
    try {
      var x = await sb.from('prospects').select('*').eq('id', r.id).maybeSingle();
      var p = x.data; if (!p || wortel.querySelector('[data-opvolging-detail]') || !app.contains(kolom)) return;
      var herteken = function () { var b = wortel.querySelector('[data-opvolging-detail]'); if (b) b.remove(); detailBlok(); };
      var blok;
      if (!p.opvolg_fase) {
        blok = el('section', { class: 'kaart op-detail', 'data-opvolging-detail': '1' }, [
          el('div', { class: 'sectie-kop', style: 'margin:0' }, [el('h2', { text: 'Opvolging' }),
            el('button', { class: 'btn btn-primair btn-klein', type: 'button', onclick: function () { toevoegen(p); } }, ['In de opvolging zetten'])]),
          el('p', { class: 'zacht', style: 'margin:8px 0 0', text: 'Zet deze prospect in de opvolging: dan staan de taken op Vandaag en worden de demo en de berichten klaargezet.' })
        ]);
      } else {
        var f = FASES[p.opvolg_fase] || {};
        var berichten = ['opening', 'link', 'reminder', 'langsgaan'].map(function (s) {
          var t = bericht(p, s);
          return el('details', { style: 'margin-top:8px' }, [el('summary', { text: { opening: 'Openings-DM', link: 'Bericht met demolink en video', reminder: 'Reminder', langsgaan: 'Gesprekspunten langsgaan' }[s] + ((p.berichten || {})[s] ? '' : ' (standaardtekst)') }),
            el('div', { class: 'op-bericht', style: 'margin-top:6px', text: t }),
            s !== 'langsgaan' ? (function () {
              var vast = null; berichtKlaar(p, s).then(function (x) { vast = x; }).catch(function () {});
              return el('button', { class: 'btn btn-ghost btn-klein', style: 'margin-top:6px', type: 'button', onclick: async function () { var ok = await kopieer(vast || t); toast(ok ? 'Gekopieerd' : 'Kopiëren lukte niet', !ok); } }, ['Kopieer']);
            })() : null]);
        });
        var log = (p.opvolg_log || []).slice(-6).reverse().map(function (l) { return el('li', { text: new Date(l.op).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) + ': ' + l.actie }); });
        blok = el('section', { class: 'kaart op-detail', 'data-opvolging-detail': '1' }, [
          el('div', { class: 'sectie-kop', style: 'margin:0' }, [el('h2', { text: 'Opvolging' }), pil(f.naam, f.kleur)]),
          p.opvolg_fase !== 'klaar' ? el('p', { style: 'margin:8px 0 0' }, [el('b', { text: f.taak }), p.volgende_actie ? ' · ' + datumKort(p.volgende_actie) : '']) : null,
          p.demo_status ? el('div', { class: 'op-demo', style: 'margin-top:8px' }, [pil((DEMO[p.demo_status] || [''])[0], (DEMO[p.demo_status] || ['', ''])[1]),
            p.demo_url ? el('a', { href: p.demo_url, target: '_blank', rel: 'noopener', text: p.demo_url.replace(/^https?:\/\//, '') }) : null,
            p.demo_status === 'fout' ? el('button', { class: 'btn btn-tekst btn-klein', type: 'button', onclick: async function () {
              var y = await sb.from('prospects').update({ demo_status: 'aangevraagd', demo_fout: null, demo_aangevraagd_op: new Date().toISOString() }).eq('id', p.id);
              if (y.error) toast(y.error.message, true); else { toast('Wordt vannacht opnieuw geprobeerd'); herteken(); }
            } }, ['Opnieuw proberen']) : null]) : null,
          p.demo_status === 'fout' && p.demo_fout ? el('p', { class: 'klein', text: p.demo_fout }) : null,
          p.berichten && p.berichten.haakje ? el('div', { class: 'op-haak', style: 'margin-top:8px', text: 'Uit hun posts: ' + p.berichten.haakje }) : null,
          el('div', null, berichten),
          log.length ? el('details', { style: 'margin-top:10px' }, [el('summary', { text: 'Wat er gebeurd is' }), el('ul', { class: 'klein', style: 'margin:6px 0 0;padding-left:18px' }, log)]) : null,
          el('div', { class: 'op-knoppen', style: 'margin-top:12px' }, [
            p.opvolg_fase !== 'klaar' ? el('a', { class: 'btn btn-primair btn-klein', href: '#/vandaag' }, ['Naar Vandaag']) : null,
            el('button', { class: 'btn btn-ghost btn-klein', type: 'button', onclick: function () {
              var s = el('select', null, VOLGORDE.concat(['klaar']).map(function (k) { return el('option', { value: k, text: FASES[k].naam }); })); s.value = p.opvolg_fase;
              var d = el('input', { type: 'date', value: p.volgende_actie || dag() });
              dialoog('Fase aanpassen', [veld('opFase', 'Fase', s), veld('opDatum', 'Datum van de taak', d)], [{ tekst: 'Opslaan', doe: async function () {
                if (!(await zetFase(p, s.value, null, 'Fase handmatig: ' + FASES[s.value].naam, { volgende_actie: s.value === 'klaar' ? null : (d.value || dag()) }))) throw new Error('Opslaan lukte niet');
                herteken();
              } }]);
            } }, ['Fase aanpassen']),
            p.opvolg_fase !== 'klaar' ? el('button', { class: 'btn btn-tekst btn-klein', type: 'button', onclick: function () { geenInteresse(p, herteken); } }, ['Geen interesse']) : null
          ])
        ]);
      }
      kolom.parentNode.insertBefore(blok, kolom);
    } catch (e) { /* extraatje */ }
    finally { detailBezig = false; }
  }

  /* ---------- Aanhaken op het portaal ---------- */
  function bijWijziging() {
    var app = $('app'); if (!app || app.hidden) return;
    var p = route().pagina;
    if (p === 'vandaag') {
      var eerste = app.firstElementChild;
      if (!(eerste && eerste.getAttribute('data-opvolging'))) teken();
    } else if (p === '') overzichtBlok();
    else if (p === 'prospect') detailBlok();
  }
  function start() {
    var n = $('hoofdnav'), app = $('app');
    if (n && 'MutationObserver' in window) new MutationObserver(nav).observe(n, { childList: true, attributes: true, attributeFilter: ['hidden'] });
    if (app && 'MutationObserver' in window) new MutationObserver(bijWijziging).observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    nav(); bijWijziging();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.addEventListener('hashchange', function () { nav(); if (opVandaag()) setTimeout(teken, 0); else setTimeout(bijWijziging, 0); });
})();
