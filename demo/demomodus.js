/* Flowsmid demo-modus (https://flowsmid.nl/demomodus.js)
   Voor een rondleiding-account: wie inlogt met een account waarvan de JWT app_metadata.demo = true heeft,
   ziet alle schermen met NEPGEGEVENS. Elk verzoek van dat account naar Supabase (tabellen, functies, opslag,
   edge functions) wordt hier in de browser beantwoord en verlaat de browser niet. Inloggen zelf gaat wel echt.
   De database blokkeert een demo-account bovendien zelf (policy demo_alleen_kijken, zie 013_demo_account.sql),
   dus ook zonder dit script ziet het geen echte gegevens.
   Gebruik: <script src="https://flowsmid.nl/demomodus.js"></script> als EERSTE script op elke inlog/beheerpagina. */
(function () {
  'use strict';
  if (window.__flowsmidDemo || typeof window.fetch !== 'function') return;
  window.__flowsmidDemo = { versie: 1 };
  var echtFetch = window.fetch.bind(window);
  var SUPA = /^https:\/\/[a-z0-9]+\.supabase\.co\/(rest|storage|functions|auth)\/v1(\/[^?#]*)?(\?[^#]*)?$/;
  var N = 6;

  /* ---------- herkennen ---------- */
  function b64(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(Array.prototype.map.call(atob(s), function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')); }
  function demoJwt(token) {
    if (!token) return null;
    var d = String(token).split('.'); if (d.length !== 3) return null;
    try { var p = JSON.parse(b64(d[1])); return p && p.app_metadata && p.app_metadata.demo === true ? p : null; } catch (e) { return null; }
  }
  function demoUitHeaders(h) { var a = h.get('authorization') || ''; var m = /^Bearer\s+(.+)$/i.exec(a); return m ? demoJwt(m[1]) : null; }
  function zoekOpgeslagenDemo() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var v = localStorage.getItem(localStorage.key(i));
        if (!v || v.indexOf('access_token') < 0) continue;
        var o = JSON.parse(v); var t = o && (o.access_token || (o.currentSession && o.currentSession.access_token));
        if (demoJwt(t)) return true;
      }
    } catch (e) {}
    return false;
  }

  /* ---------- banner ---------- */
  var banner = null;
  function toonBanner(puls) {
    if (!document.body) { document.addEventListener('DOMContentLoaded', function () { toonBanner(puls); }); return; }
    if (!banner) {
      banner = document.createElement('div');
      banner.setAttribute('role', 'status');
      banner.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483647;max-width:calc(100vw - 24px);padding:7px 12px;border-radius:999px;pointer-events:none;opacity:.95;' +
        'background:#1e1533;color:#f5f3ff;border:1px solid #7c3aed;box-shadow:0 8px 24px rgba(0,0,0,.35);font:500 12px/1.3 system-ui,-apple-system,"Segoe UI",sans-serif;transition:transform .2s';
      banner.innerHTML = '<b style="color:#c4b5fd">Demo-modus</b> · voorbeeldgegevens, er wordt niets opgeslagen';
      banner.title = 'Je bent ingelogd met het demo-account. Alles wat je ziet is nepdata en wijzigingen worden niet bewaard.';
      document.body.appendChild(banner);
    }
    if (puls) { banner.style.transform = 'scale(1.06)'; setTimeout(function () { banner.style.transform = ''; }, 260); }
  }
  if (zoekOpgeslagenDemo()) toonBanner();

  /* ---------- hulp ---------- */
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function kies(lijst, s) { return lijst[hash(s) % lijst.length]; }
  function uuid(s) { var h = ''; for (var i = 0; h.length < 32; i++) h += ('00000000' + hash(s + '#' + i).toString(16)).slice(-8); return h.slice(0, 8) + '-' + h.slice(8, 12) + '-4' + h.slice(13, 16) + '-a' + h.slice(17, 20) + '-' + h.slice(20, 32); }
  function dag(offset) { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + offset); return d; }
  function isoDatum(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function antwoord(data, status, extra) {
    var h = { 'content-type': 'application/json; charset=utf-8' }; for (var k in extra || {}) h[k] = extra[k];
    if (status === 204 || data === undefined) return new Response(null, { status: status === 204 ? 204 : (status || 200), headers: h });
    return new Response(JSON.stringify(data), { status: status || 200, headers: h });
  }

  var BEDRIJVEN = ['Bakkerij Zonnig', 'Kapsalon Knip & Co', 'Pizzeria Bella Demo', 'Studio Voorbeeld', 'Garage De Proef', 'Bloemist Lente', 'Café De Hoek', 'Praktijk Balans', 'Webshop Testwinkel', 'Installatiebedrijf Vonk'];
  var PERSONEN = ['Sanne de Vries', 'Mohamed el Amrani', 'Lisa Jansen', 'Daan Bakker', 'Priya Ramdin', 'Tom Visser', 'Eva Smit', 'Yusuf Kaya', 'Noor Hendriks', 'Bram Mulder'];
  var PLAATSEN = ['Rotterdam', 'Utrecht', 'Schiedam', 'Den Haag', 'Amsterdam', 'Dordrecht', 'Delft', 'Breda'];
  var TEKSTEN = ['Dit is voorbeeldtekst in de demo-omgeving.', 'Voorbeeld: graag de openingstijden op de site aanpassen.', 'Nepgegevens om te laten zien hoe dit scherm werkt.', 'Hier staat in het echt een notitie of bericht.'];
  var PRODUCTEN = ['Website', 'Bestelsite', 'Afsprakensysteem', 'Klantportaal', 'Webshop', 'Onderhoudspakket'];

  /* ---------- schema (alleen vorm, geen inhoud) ---------- */
  var schemaBelofte = null;
  function laadSchema(basis, h) {
    if (schemaBelofte) return schemaBelofte;
    try { var c = sessionStorage.getItem('flowsmid-demo-schema'); if (c) { schemaBelofte = Promise.resolve(JSON.parse(c)); return schemaBelofte; } } catch (e) {}
    var hd = { 'content-type': 'application/json', 'content-profile': 'flowsmid', 'accept-profile': 'flowsmid', apikey: h.get('apikey') || '', authorization: h.get('authorization') || '' };
    schemaBelofte = echtFetch(basis + '/rest/v1/rpc/demo_schema', { method: 'POST', headers: hd, body: '{}' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (s) { s = s || { tabellen: {}, functies: {} }; try { sessionStorage.setItem('flowsmid-demo-schema', JSON.stringify(s)); } catch (e) {} return s; })
      .catch(function () { schemaBelofte = null; return { tabellen: {}, functies: {} }; });
    return schemaBelofte;
  }

  /* ---------- nepwaarden ---------- */
  function soortTabel(t) {
    if (/klant|prospect|relatie|zaak|zaken|club|leverancier|bedrij/.test(t)) return 'bedrijf';
    if (/lid|leden|medewerker|kapper|profiel|gebruiker|account/.test(t)) return 'persoon';
    if (/product|dienst|artikel|pakket|prijslijst|tarie/.test(t)) return 'product';
    return 'ding';
  }
  function label(t) { return t.replace(/^[a-z]{2}_/, '').replace(/_/g, ' ').replace(/en$/, '').replace(/s$/, ''); }
  function waarde(ctx, kol, type, opties, i, rij) {
    var k = kol.toLowerCase(), s = ctx.key + '|' + i + '|' + kol, t = ctx.tabel;
    if (opties && opties.length) {
      if (k === 'rol') { var voorkeur = ['beheerder', 'eigenaar', 'admin', 'klant']; for (var v = 0; v < voorkeur.length; v++) if (opties.indexOf(voorkeur[v]) >= 0 && i === 0) return voorkeur[v]; }
      return opties[i % opties.length];
    }
    if (/\[\]$/.test(type)) return [];
    if (type === 'uuid') {
      if (k === 'id' || k === 'user_id' && t === 'profielen') return k === 'user_id' && i === 0 ? ctx.jwt.sub : uuid(s);
      if (ctx.fk[kol]) return idVan(ctx.fk[kol], i);
      if (/^(user_id|auteur|auteur_id|aangemaakt_door|eigenaar|bijgewerkt_door)$/.test(k)) return ctx.jwt.sub;
      return uuid(s);
    }
    if (type === 'boolean') return !/^(moet_|is_monteur|spoed|op_maat|geblokkeerd|verwijderd|gearchiveerd|voorraad_geboekt|van_flowsmid)/.test(k);
    if (/^(integer|bigint|smallint|numeric|real|double)/.test(type)) {
      if (/korting/.test(k)) return 0;
      if (/btw_bedrag/.test(k)) return 21;
      if (/prijs|bedrag|totaal|omzet|tarief|kosten/.test(k)) return 25 + hash(s) % 475;
      if (k === 'btw') return 21;
      if (/volgorde|nummer|volgnr/.test(k)) return i + 1;
      if (/duur/.test(k)) return [30, 45, 60][i % 3];
      if (k === 'grootte') return 180000 + hash(s) % 900000;
      if (k === 'jaar') return new Date().getFullYear();
      if (k === 'weekdag') return 1 + i % 5;
      if (k === 'betaaltermijn' || k === 'offerte_geldig') return 14;
      if (k === 'prioriteit') return 1 + i % 3;
      if (/pogingen|laatste/.test(k)) return 0;
      if (/uren|aantal|voorraad/.test(k)) return 1 + hash(s) % 8;
      return 1 + hash(s) % 9;
    }
    if (type === 'date') return isoDatum(dag(/volgende|verval|deadline|eind|tot|verwacht|pilot_eind/.test(k) ? 3 + i * 4 : -(2 + i * 5)));
    if (/^timestamp/.test(type)) {
      if (k === 'start' || k === 'eind') { var d0 = dag(1 + i); d0.setHours(9 + (i * 2) % 8, i % 2 ? 30 : 0); if (k === 'eind') d0.setHours(d0.getHours() + 1); return d0.toISOString(); }
      if (/verstuurd|herinnerd|betaald|klaar_op|gereed|akkoord|goedgekeurd|getekend|beantwoord|live_sinds|verbonden|laatste_sync|moneybird_op|doneer/.test(k)) return i % 2 ? null : new Date(Date.now() - (i + 1) * 86400000 * 2).toISOString();
      return new Date(Date.now() - (i * 3 + 1) * 86400000 - hash(s) % 36000000).toISOString();
    }
    if (/^time/.test(type)) return k === 'tot' ? '17:30:00' : '09:00:00';
    if (type === 'jsonb' || type === 'json') return /stappen|regels|punten|fotos|materiaal|aanleveren|items|lijst/.test(k) ? [] : {};
    if (/^(text|character)/.test(type) || type === 'citext') {
      var soort = soortTabel(t);
      if (k === 'naam' || k === 'bedrijfsnaam' || k === 'statutaire_naam' || k === 'administratie_naam') return soort === 'bedrijf' ? BEDRIJVEN[i % BEDRIJVEN.length] : soort === 'persoon' ? PERSONEN[i % PERSONEN.length] : soort === 'product' ? PRODUCTEN[i % PRODUCTEN.length] + ' (voorbeeld)' : 'Voorbeeld ' + label(t) + ' ' + (i + 1);
      if (/contactpersoon|auteur_naam|getekend_door|goedgekeurd_door|akkoord_naam|factuur_tav|tenaamstelling|^wie$/.test(k)) return PERSONEN[(i + 3) % PERSONEN.length];
      if (k === 'gebruikersnaam') return t === 'profielen' && i === 0 ? 'demo' : 'voorbeeld' + (i + 1);
      if (/e?mail|antwoord_aan|^aan$|^bcc$/.test(k)) return 'info@voorbeeld' + (i + 1) + '.nl';
      if (/telefoon|mobiel/.test(k)) return '06 1234 56' + ('0' + (10 + i * 7) % 100).slice(-2);
      if (/postcode/.test(k)) return (3000 + i * 111) + ' AB';
      if (/plaats|locatie|^land$/.test(k)) return k === 'land' || k === 'factuur_land' ? 'Nederland' : PLAATSEN[i % PLAATSEN.length];
      if (/adres/.test(k)) return 'Voorbeeldstraat ' + (i + 1);
      if (/url|website|^link/.test(k)) return 'https://flowsmid.nl';
      if (/instagram|facebook|tiktok/.test(k)) return '@voorbeeld';
      if (k === 'kvk') return '1234567' + i;
      if (/btw_nummer/.test(k)) return 'NL00123456' + i + 'B01';
      if (/iban/.test(k)) return 'NL00 BANK 0123 4567 8' + i;
      if (k === 'slug') return 'voorbeeld-' + (i + 1);
      if (/(^|_)pad$|^foto|logo|thumb|bijlage_naam|handtekening/.test(k)) return null;
      if (/token|hash|geheim|mollie|moneybird|^fout$|^ref$/.test(k)) return null;
      if (k === 'kleur') return ['#7c3aed', '#2563eb', '#059669', '#d97706'][i % 4];
      if (k === 'code') return 'voorbeeld' + (i + 1);
      if (k === 'sleutel') return 'voorbeeld_' + (i + 1);
      if (k === 'nummer') return String(new Date().getFullYear()) + '-' + ('00' + (i + 1)).slice(-3);
      if (/titel|onderwerp|omschrijving|naam$/.test(k) && !/omschrijving/.test(k)) return 'Voorbeeld ' + label(t) + ' ' + (i + 1);
      if (/tekst|bericht|omschrijving|notitie|notities|antwoord|bio|samenvatting|intro|toelichting|werk|opmerking|reden|waarom|voettekst|waarde/.test(k)) return TEKSTEN[i % TEKSTEN.length];
      if (/soort|type|categorie|branche|kanaal|formaat|periode|eenheid|methode|levering|betaalwijze|functie|label|pakket|doelgroep/.test(k)) return ['Standaard', 'Basis', 'Extra'][i % 3];
      return 'Voorbeeld ' + (i + 1);
    }
    return null;
  }

  var cache = {}, geheugen = {};
  function mem(key) { return geheugen[key] || (geheugen[key] = { nieuw: [], wijz: {}, weg: {} }); }
  var huidig = { schema: null, jwt: null };
  function meta(key) { return huidig.schema && huidig.schema.tabellen && huidig.schema.tabellen[key]; }
  function idVan(key, i) { var r = basisRijen(key); return r.length ? r[i % r.length].id || uuid(key + '|' + (i % N) + '|id') : uuid(key + '|' + i); }
  function basisRijen(key) {
    if (cache[key]) return cache[key];
    var m = meta(key); if (!m) return (cache[key] = []);
    cache[key] = [];
    var ctx = { key: key, tabel: key.split('.').pop(), fk: m.fk || {}, jwt: huidig.jwt };
    var rijen = [];
    for (var i = 0; i < N; i++) {
      var r = {};
      (m.k || []).forEach(function (c) { r[c[0]] = waarde(ctx, c[0], c[1], c[2], i, r); });
      if (ctx.tabel === 'profielen' && i === 0) { r.rol = 'beheerder'; r.klant_id = idVan('flowsmid.klanten', 0); r.moet_wachtwoord_wijzigen = false; }
      rijen.push(r);
    }
    cache[key] = rijen;
    return rijen;
  }

  /* ---------- PostgREST nadoen ---------- */
  function splitsTop(s) { var uit = [], diepte = 0, buf = ''; for (var i = 0; i < s.length; i++) { var c = s[i]; if (c === '(') diepte++; if (c === ')') diepte--; if (c === ',' && !diepte) { uit.push(buf); buf = ''; } else buf += c; } if (buf.trim()) uit.push(buf); return uit.map(function (x) { return x.trim(); }); }
  function parseSelect(s) {
    var uit = { kolommen: [], embeds: [] };
    splitsTop(s || '*').forEach(function (d) {
      var m = /^(?:([\w]+):)?([\w]+)(?:!([\w]+))?(?:!inner|!left)?\(([\s\S]*)\)$/.exec(d);
      if (m) uit.embeds.push({ alias: m[1] || m[2], rel: m[2], hint: m[3], select: m[4] });
      else { var a = /^(?:([\w]+):)?([\w]+)/.exec(d); if (a && a[1]) uit.kolommen.push([a[1], a[2]]); }
    });
    return uit;
  }
  function typeVan(key, kol) { var m = meta(key); if (!m) return 'text'; for (var i = 0; i < m.k.length; i++) if (m.k[i][0] === kol) return m.k[i][1]; return null; }
  function getypt(key, kol, v) {
    v = String(v).replace(/^"(.*)"$/, '$1');
    var t = typeVan(key, kol) || 'text';
    if (t === 'boolean') return v === 'true';
    if (/^(integer|bigint|smallint|numeric|real|double)/.test(t)) return Number(v);
    if (v === 'null') return null;
    return v;
  }
  function parseFilters(key, qs) {
    var toewijzing = {}, lijsten = {};
    qs.forEach(function (v, k) {
      if (/^(select|order|limit|offset|on_conflict|columns|or|and|not)$/.test(k) || k.indexOf('.') >= 0) return;
      var i = v.indexOf('.'); if (i < 0) return;
      var op = v.slice(0, i), w = v.slice(i + 1);
      if (op === 'eq') toewijzing[k] = getypt(key, k, w);
      else if (op === 'is') toewijzing[k] = w === 'null' ? null : w === 'true' ? true : w === 'false' ? false : null;
      else if (op === 'in') { var l = w.replace(/^\(|\)$/g, ''); lijsten[k] = l ? splitsTop(l).map(function (x) { return getypt(key, k, x); }) : []; }
    });
    return { zet: toewijzing, lijst: lijsten };
  }
  function past(r, f) {
    for (var k in f.zet) if (r[k] !== f.zet[k] && String(r[k]) !== String(f.zet[k])) return false;
    for (var k2 in f.lijst) if (f.lijst[k2].map(String).indexOf(String(r[k2])) < 0) return false;
    return true;
  }
  function rijenVoor(key, f, aantal) {
    var g = mem(key), basis = basisRijen(key);
    var eigen = g.nieuw.filter(function (r) { return past(r, f); });
    var gen = [];
    var uniek = ((meta(key) || {}).u || ['id']).some(function (k) { return k in f.zet; });
    var maxN = uniek ? 1 : (aantal || N);
    var lijstKeys = Object.keys(f.lijst);
    if (lijstKeys.length) { var lmax = Math.max.apply(null, lijstKeys.map(function (k) { return f.lijst[k].length; })); maxN = Math.min(maxN, lmax); }
    if (!(uniek && eigen.length)) {
      for (var i = 0; i < Math.min(maxN, basis.length); i++) {
        var r = Object.assign({}, basis[i], f.zet);
        lijstKeys.forEach(function (k) { r[k] = f.lijst[k][i % f.lijst[k].length]; });
        if (g.weg[r.id]) continue;
        if (r.id && g.wijz[r.id]) Object.assign(r, g.wijz[r.id]);
        gen.push(r);
      }
    }
    return eigen.concat(gen);
  }
  function relatie(schema, key, rel, hint) {
    var m = meta(key) || { fk: {} }, doel = schema + '.' + rel, fk = m.fk || {};
    if (hint && fk[hint]) return { soort: 'een', kol: hint, doel: fk[hint] };
    for (var c in fk) if (fk[c] === doel) return { soort: 'een', kol: c, doel: doel };
    var dm = meta(doel);
    if (dm && dm.fk) for (var c2 in dm.fk) if (dm.fk[c2] === key) return { soort: 'veel', kol: c2, doel: doel };
    if (!dm) for (var s in (huidig.schema && huidig.schema.tabellen) || {}) if (s.split('.').pop() === rel) return relatie(s.split('.')[0], key, rel, hint);
    return dm ? { soort: 'veel', kol: null, doel: doel } : null;
  }
  function verrijk(schema, key, rijen, sel) {
    sel.kolommen.forEach(function (a) { rijen.forEach(function (r) { r[a[0]] = r[a[1]]; }); });
    sel.embeds.forEach(function (e) {
      var rel = relatie(schema, key, e.rel, e.hint), sub = parseSelect(e.select);
      rijen.forEach(function (r, i) {
        if (!rel) { r[e.alias] = null; return; }
        if (/^\s*count\s*(\(\))?\s*$/.test(e.select)) { r[e.alias] = [{ count: 2 + i % 3 }]; return; }
        if (rel.soort === 'een') {
          var id = r[rel.kol]; if (id == null) { r[e.alias] = null; return; }
          var o = rijenVoor(rel.doel, { zet: { id: id }, lijst: {} }, 1)[0] || null;
          if (o) verrijk(rel.doel.split('.')[0], rel.doel, [o], sub);
          r[e.alias] = o;
        } else {
          var zet = {}; if (rel.kol) zet[rel.kol] = r.id;
          var l = rijenVoor(rel.doel, { zet: zet, lijst: {} }, 2).map(function (x) { return Object.assign({}, x); });
          verrijk(rel.doel.split('.')[0], rel.doel, l, sub);
          r[e.alias] = l;
        }
      });
    });
    return rijen;
  }
  function tabelAntwoord(req, schema, tabel, qs) {
    var key = schema + '.' + tabel, h = req.headers, enkel = /vnd\.pgrst\.object/.test(h.get('accept') || '');
    var prefer = h.get('prefer') || '', methode = req.method;
    var f = parseFilters(key, qs), sel = parseSelect(qs.get('select') || '*');
    var limit = Number(qs.get('limit')) || 0, offset = Number(qs.get('offset')) || 0;
    if (methode === 'GET' || methode === 'HEAD') {
      var alle = rijenVoor(key, f).map(function (r) { return Object.assign({}, r); });
      var totaal = alle.length;
      var rijen = limit ? alle.slice(offset, offset + limit) : alle.slice(offset);
      var bereik = { 'content-range': (rijen.length ? offset + '-' + (offset + rijen.length - 1) : '*') + '/' + (/count=/.test(prefer) ? totaal : '*') };
      if (methode === 'HEAD') return antwoord(undefined, 200, bereik);
      verrijk(schema, key, rijen, sel);
      if (enkel) return rijen.length ? antwoord(rijen[0], 200, bereik) : antwoord({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: 'The result contains 0 rows' }, 406);
      return antwoord(rijen, 200, bereik);
    }
    toonBanner(true);
    var body = req.json, uit = [], g = mem(key);
    if (methode === 'POST') {
      (Array.isArray(body) ? body : [body || {}]).forEach(function (b, i) {
        var basis = basisRijen(key)[i % N] || {};
        var r = Object.assign({}, basis, { id: uuid(key + '|nieuw|' + Date.now() + '|' + i + Math.random()) }, b, { aangemaakt_op: new Date().toISOString() });
        if (b && b.id && /merge-duplicates/.test(prefer)) g.wijz[b.id] = Object.assign(g.wijz[b.id] || {}, b);
        else g.nieuw.unshift(r);
        uit.push(r);
      });
    } else if (methode === 'PATCH') {
      uit = rijenVoor(key, f).map(function (r) { if (r.id) g.wijz[r.id] = Object.assign(g.wijz[r.id] || {}, body || {}); g.nieuw.forEach(function (n) { if (n.id === r.id) Object.assign(n, body || {}); }); return Object.assign({}, r, body || {}); });
    } else if (methode === 'DELETE') {
      uit = rijenVoor(key, f).map(function (r) { if (r.id) g.weg[r.id] = 1; return r; });
      g.nieuw = g.nieuw.filter(function (r) { return !past(r, f); });
    }
    if (!/return=representation/.test(prefer)) return antwoord(undefined, methode === 'POST' ? 201 : 204);
    verrijk(schema, key, uit, sel);
    return antwoord(enkel ? uit[0] || null : uit, methode === 'POST' ? 201 : 200);
  }

  /* ---------- functies (rpc) ---------- */
  var VASTE_RPC = {
    kb_mijn_zaak: function (a) { return { klant_id: idVan('flowsmid.klanten', 0), naam: BEDRIJVEN[1], rol: 'eigenaar', kapper_id: idVan('flowsmid.kb_kappers', 0) }; },
    mc_mijn_club: function (a) { return { klant_id: idVan('flowsmid.klanten', 0), naam: 'Voorbeeldclub', intro: TEKSTEN[0], doneer_url: null, doneer_bijgewerkt: null, rol: 'eigenaar', lid: { id: idVan('flowsmid.mc_leden', 0), naam: 'Demo Gebruiker', gebruikersnaam: 'demo', functie: 'Voorzitter', rang: 'Bestuur', mag_posten: true, mag_reageren: true, ziet_besloten: true, mag_events: true } }; },
    pt_ik: function () { return { monteur: false, medewerker_id: idVan('flowsmid.pt_medewerkers', 0), accounts: [{ user_id: uuid('acc1'), gebruikersnaam: 'voorbeeld1' }, { user_id: uuid('acc2'), gebruikersnaam: 'voorbeeld2' }] }; },
    pt_demo_status: function () { return { portaal: true, aantal: 0 }; },
    pt_agenda: function () { return { naam: BEDRIJVEN[9], items: [] }; },
    mijn_projecten: function () { return basisRijen('flowsmid.projecten').slice(0, 3).map(function (p) { return { id: p.id, naam: p.naam, soort: p.soort, status: p.status, samenvatting: p.samenvatting, bedrag: p.bedrag, bijgewerkt_op: p.bijgewerkt_op, goedgekeurd_op: null }; }); },
    mijn_project: function (a) { var p = Object.assign({}, rijenVoor('flowsmid.projecten', { zet: a && a.p_id ? { id: a.p_id } : {}, lijst: {} }, 1)[0] || {}); p.inhoud = {}; p.bestanden = []; p.reacties = []; return p; },
    statistieken: function () {
      var per = []; for (var i = 29; i >= 0; i--) per.push({ dag: isoDatum(dag(-i)), bestellingen: 2 + hash('b' + i) % 9, omzet: 40 + hash('o' + i) % 260, bezoekers: 20 + hash('v' + i) % 90 });
      var som = function (k) { return per.reduce(function (a, b) { return a + b[k]; }, 0); };
      return { bron: 'momsthaifood', van: per[0].dag, tot: per[29].dag, dagen: 30, bestellingen: som('bestellingen'), omzet: som('omzet'), geannuleerd: 3, bezorgen: Math.round(som('bestellingen') * 0.6), afhalen: Math.round(som('bestellingen') * 0.4), bezoekers: som('bezoekers'), weergaven: som('bezoekers') * 3, vorige: { bestellingen: som('bestellingen') - 14, omzet: som('omzet') - 420, bezoekers: som('bezoekers') - 120 }, per_dag: per, top: [{ naam: 'Voorbeeldgerecht 1', aantal: 31 }, { naam: 'Voorbeeldgerecht 2', aantal: 24 }, { naam: 'Voorbeeldgerecht 3', aantal: 17 }] };
    },
    shop_mail_ophalen: function () { return 'info@voorbeeld.nl'; },
    demopakket_mailen: function () { return 'Demo: er is niets verstuurd.'; }
  };
  function rpcAntwoord(req, schema, naam, args) {
    if (/(^|_)publiek$/.test(naam)) return null; // openbare website-inhoud mag echt
    var f = huidig.schema && huidig.schema.functies && (huidig.schema.functies[schema + '.' + naam] || huidig.schema.functies['flowsmid.' + naam]);
    if (VASTE_RPC[naam]) return antwoord(VASTE_RPC[naam](args || {}));
    if (!f) return antwoord(null);
    if (f.r === 'void') { toonBanner(true); return antwoord(undefined, 204); }
    var rijen;
    if (f.t) rijen = rijenVoor(f.t, { zet: {}, lijst: {} }).map(function (r) { return Object.assign({}, r); });
    else if (f.uit && f.uit.length) {
      var ctx = { key: schema + '.' + naam, tabel: naam, fk: {}, jwt: huidig.jwt };
      rijen = []; for (var i = 0; i < 4; i++) { var r = {}; f.uit.forEach(function (c) { r[c[0]] = c[0] === 'rol' ? 'klant' : c[0] === 'klant_id' ? idVan('flowsmid.klanten', i) : c[0] === 'geblokkeerd' ? false : waarde(ctx, c[0], c[1], null, i, r); }); rijen.push(r); }
    }
    if (rijen) return antwoord(f.set ? rijen : rijen[0]);
    var r0 = f.r;
    if (r0 === 'boolean') return antwoord(!/is_monteur/.test(naam));
    if (r0 === 'uuid') return antwoord(uuid(naam));
    if (/^(integer|bigint|numeric)/.test(r0)) return antwoord(3);
    if (r0 === 'text') return antwoord(/_rol$/.test(naam) ? 'eigenaar' : 'Voorbeeld');
    if (r0 === 'jsonb' || r0 === 'json') return antwoord(f.set ? [] : {});
    return antwoord(null);
  }

  /* ---------- opslag en edge functions ---------- */
  function opslagAntwoord(req, pad) {
    var m;
    if ((m = /^\/object\/sign\/([^/]+)\/(.+)$/.exec(pad))) return antwoord({ signedURL: '/object/sign/' + m[1] + '/' + m[2] + '?token=demo' });
    if ((m = /^\/object\/sign\/([^/]+)$/.exec(pad))) return antwoord(((req.json && req.json.paths) || []).map(function (p) { return { path: p, signedURL: '/object/sign/' + m[1] + '/' + p + '?token=demo', error: null }; }));
    if (/^\/object\/list\//.test(pad)) return antwoord([]);
    if (/^\/object\/public\//.test(pad)) return null;
    if (req.method === 'GET') return antwoord({ statusCode: '404', error: 'not_found', message: 'Demo-modus: geen bestanden' }, 404);
    toonBanner(true);
    if (req.method === 'DELETE') return antwoord([]);
    return antwoord({ Key: pad.replace(/^\/object\//, ''), Id: uuid(pad) });
  }
  function functieAntwoord(req, naam) {
    toonBanner(true);
    var b = req.json || {};
    if (naam === 'inbox') {
      var mails = [0, 1, 2, 3].map(function (i) { return { uid: 100 + i, van: { naam: PERSONEN[i], adres: 'klant@voorbeeld' + (i + 1) + '.nl' }, aan: [{ naam: 'Flowsmid', adres: 'info@voorbeeld.nl' }], onderwerp: ['Vraag over mijn website', 'Offerte webshop', 'Nieuwe foto’s voor de site', 'Afspraak volgende week'][i], datum: new Date(Date.now() - i * 7200000).toISOString(), gelezen: i > 0, beantwoord: i === 2 }; });
      if (b.actie === 'lijst') return antwoord({ ok: true, berichten: mails });
      if (b.actie === 'lees') { var m = mails.find(function (x) { return x.uid === b.uid; }) || mails[0]; return antwoord(Object.assign({ ok: true, tekst: TEKSTEN[1] + '\n\nMet vriendelijke groet,\n' + m.van.naam, cc: [], bijlagen: [] }, m)); }
      return antwoord({ ok: true });
    }
    return antwoord({ ok: true, demo: true, bericht: 'Demo-modus: er is niets uitgevoerd.' });
  }

  /* ---------- fetch onderscheppen ---------- */
  window.fetch = function (invoer, init) {
    var url = typeof invoer === 'string' ? invoer : invoer instanceof URL ? invoer.href : invoer && invoer.url;
    var m = url && SUPA.exec(url);
    if (!m) return echtFetch(invoer, init);
    var h = new Headers((init && init.headers) || (invoer instanceof Request ? invoer.headers : undefined));
    var jwt = demoUitHeaders(h);
    if (!jwt) return echtFetch(invoer, init);
    toonBanner();
    var dienst = m[1], pad = m[2] || '/', qs = new URLSearchParams((m[3] || '').slice(1));
    var methode = String((init && init.method) || (invoer instanceof Request ? invoer.method : 'GET')).toUpperCase();
    var basis = url.slice(0, url.indexOf('/' + dienst + '/v1'));
    if (dienst === 'auth') {
      if (/^\/user/.test(pad) && methode === 'PUT') { toonBanner(true); return Promise.resolve(antwoord({ id: jwt.sub, aud: 'authenticated', role: 'authenticated', email: jwt.email, app_metadata: jwt.app_metadata, user_metadata: jwt.user_metadata || {}, created_at: new Date().toISOString() })); }
      return echtFetch(invoer, init);
    }
    if (dienst === 'rest' && pad === '/rpc/demo_schema') return echtFetch(invoer, init);
    var bodyBelofte = init && init.body != null ? Promise.resolve(init.body) : invoer instanceof Request ? invoer.clone().text() : Promise.resolve(null);
    return Promise.all([laadSchema(basis, h), bodyBelofte]).then(function (r) {
      huidig.schema = r[0]; huidig.jwt = jwt;
      var json = null; if (typeof r[1] === 'string' && r[1]) { try { json = JSON.parse(r[1]); } catch (e) {} }
      var req = { method: methode, headers: h, json: json };
      var uit = null;
      try {
        if (dienst === 'rest') {
          var schema = h.get(methode === 'GET' || methode === 'HEAD' ? 'accept-profile' : 'content-profile') || h.get('accept-profile') || 'public';
          var rpc = /^\/rpc\/([\w]+)$/.exec(pad);
          if (rpc) { var args = json || {}; if (methode === 'GET') qs.forEach(function (v, k) { args[k] = v; }); uit = rpcAntwoord(req, schema, rpc[1], args); }
          else { var t = /^\/([\w]+)$/.exec(pad); uit = t ? tabelAntwoord(req, schema, t[1], qs) : antwoord([]); }
        } else if (dienst === 'storage') uit = opslagAntwoord(req, pad);
        else if (dienst === 'functions') uit = functieAntwoord(req, pad.replace(/^\//, '').split('/')[0]);
      } catch (e) { console.warn('[demo-modus]', e); uit = antwoord({ message: 'Demo-modus: dit scherm heeft geen voorbeeldgegevens.' }, 400); }
      return uit || echtFetch(invoer, init);
    });
  };
})();
