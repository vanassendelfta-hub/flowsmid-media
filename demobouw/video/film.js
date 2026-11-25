// Rendert de Flowsmid-demovideo voor één demo: node film.js <slug> <uit.mp4>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const slug = process.argv[2], UIT = process.argv[3];
const cfg = JSON.parse(fs.readFileSync('/home/claude/bouw/video/cfg.json'))[slug];
const mock = JSON.parse(fs.readFileSync('/home/claude/bouw/mock.json'))[slug];
const ROOT = '/home/claude/bouw/uit/sites/' + slug;
const FPS = 30;

function imgSvg(naam) {
  const t = cfg.thema;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><defs><radialGradient id="g" cx="30%" cy="25%" r="90%"><stop offset="0" stop-color="${t.accent}" stop-opacity=".55"/><stop offset=".6" stop-color="${t.card}"/><stop offset="1" stop-color="${t.bg}"/></radialGradient></defs><rect width="800" height="800" fill="url(#g)"/></svg>`;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  await ctx.addInitScript(() => { const o = window.setTimeout; window.setTimeout = function (f, d, ...a) { if (d === 3700 && location.pathname.startsWith('/site')) return 0; return o.call(window, f, d, ...a); }; });
  await ctx.route('**/*', async r => {
    const u = new URL(r.request().url());
    if (u.hostname === 'demo.test') {
      let f = u.pathname;
      if (f === '/film.html') return r.fulfill({ path: '/home/claude/bouw/video/film.html' });
      if (f.startsWith('/site')) f = f.slice(5) || '/';
      if (f.endsWith('/')) f += 'index.html';
      if (f.startsWith('/img/')) return r.fulfill({ contentType: 'image/svg+xml', body: imgSvg(f) });
      const fp = path.join(ROOT, f);
      if (fs.existsSync(fp)) return r.fulfill({ path: fp });
      return r.fulfill({ status: 404, body: 'nf' });
    }
    if (u.pathname.includes('/rpc/kb_publiek')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(mock) });
    if (u.pathname.includes('/rpc/kb_tijden')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(['10:00', '10:30', '11:15', '12:00', '13:30', '14:15', '15:00', '15:45'].map(t => ({ t }))) });
    if (u.hostname.includes('fonts.g')) return r.continue();
    return r.abort();
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('pageerror', e.message));
  await page.clock.install({ time: new Date('2026-11-25T09:00:00+01:00') });
  await page.goto('http://demo.test/film.html');
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(800);

  // ffmpeg
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '20', '-r', String(FPS), UIT + '.stil.mp4']);
  ff.stderr.on('data', d => process.stderr.write(d));

  let T = 0; // filmtijd in seconden
  const frameDoc = id => page.frameLocator('#' + id);
  const frame = id => page.frames().find(f => f.parentFrame() && f.name() === '' && f.url().includes('/site') && (id === 'scherm' ? f !== volFrame : f === volFrame));
  let volFrame = null;
  let ring = null, kader = null; // {x,y,t0} / {x,y,w,h,t0,t1}

  async function schermFrame(id) {
    const el = await page.$('#' + id); return await el.contentFrame();
  }
  async function laad(id, url) {
    await page.evaluate(([id, url]) => new Promise(res => { const f = document.getElementById(id); f.onload = () => res(); f.src = url; }), [id, url]);
    const f = await schermFrame(id);
    await f.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; Element.prototype.scrollIntoView = function () { }; });
    await page.waitForTimeout(700); // fonts/data (real time; animaties worden bij de eerste frame vastgezet)
    return f;
  }
  async function pos(f, id, sel) {
    return await page.evaluate(([id, sel]) => {
      const fr = document.getElementById(id), d = fr.contentDocument, el = d.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect(), fr2 = fr.getBoundingClientRect();
      const s = fr2.width / fr.offsetWidth;
      return { x: fr2.left + (r.left + r.width / 2) * s, y: fr2.top + (r.top + r.height / 2) * s, l: fr2.left + r.left * s, t: fr2.top + r.top * s, w: r.width * s, h: r.height * s };
    }, [id, sel]);
  }
  async function tik(id, sel, metKader) {
    const p = await pos(null, id, sel);
    if (!p) { console.log('niet gevonden', sel); return; }
    ring = { x: p.x, y: p.y, t0: T };
    if (metKader) kader = { l: p.l - 10, t: p.t - 10, w: p.w + 20, h: p.h + 20, t0: T - .6, t1: T + .4 };
    await page.evaluate(([id, sel]) => { document.getElementById(id).contentDocument.querySelector(sel).click(); }, [id, sel]);
  }
  async function scrollNaar(f, y) { await f.evaluate(y => { document.scrollingElement.scrollTop = y; }, y); }
  async function offset(f, sel) { return await f.evaluate(sel => { const e = document.querySelector(sel); return e ? e.getBoundingClientRect().top + scrollY : 0; }, sel); }

  let fade = { in: 0, uit: 0 };
  async function frameMaken(sceneT, dur) {
    // overlays
    const ov = { zwart: 0, ring: null, kader: null };
    if (sceneT < fade.in) ov.zwart = 1 - sceneT / fade.in;
    if (fade.uit && sceneT > dur - fade.uit) ov.zwart = Math.max(ov.zwart, (sceneT - (dur - fade.uit)) / fade.uit);
    if (ring) { const a = (T - ring.t0) / .6; if (a >= 0 && a <= 1) ov.ring = { x: ring.x, y: ring.y, s: .6 + .7 * a, o: 1 - a }; }
    if (kader && T >= kader.t0 && T <= kader.t1 + .3) ov.kader = Object.assign({}, kader, { o: T > kader.t1 ? 1 - (T - kader.t1) / .3 : Math.min(1, (T - kader.t0) / .2) });
    await page.evaluate(([t, ov]) => {
      zet(t);
      $('zwart').style.opacity = ov.zwart;
      const r = $('ring'); if (ov.ring) { r.style.left = ov.ring.x + 'px'; r.style.top = ov.ring.y + 'px'; r.style.transform = 'scale(' + ov.ring.s + ')'; r.style.opacity = ov.ring.o; } else r.style.opacity = 0;
      const k = $('kader'); if (ov.kader) { Object.assign(k.style, { left: ov.kader.l + 'px', top: ov.kader.t + 'px', width: ov.kader.w + 'px', height: ov.kader.h + 'px', opacity: ov.kader.o }); } else k.style.opacity = 0;
    }, [T, ov]);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    await page.clock.runFor(1000 / FPS);
    T += 1 / FPS;
  }
  // scene: dur, acties [{t, fn}], perFrame(sceneT)
  async function scene(dur, acties, perFrame, f = { in: .35, uit: .35 }) {
    fade = f; acties = acties.slice().sort((a, b) => a.t - b.t);
    const n = Math.round(dur * FPS);
    for (let i = 0; i < n; i++) {
      const st = i / FPS;
      while (acties.length && acties[0].t <= st) await (acties.shift().fn)();
      if (perFrame) await perFrame(st);
      await frameMaken(st, dur);
    }
  }
  const toon = (laag, kop, onder) => page.evaluate(([laag, kop, onder]) => {
    ['intro', 'vol', 'scene', 'slot'].forEach(l => $(l).style.display = l === laag ? '' : 'none');
    if (kop) { $('k-stap').textContent = kop[0]; $('k-titel').textContent = kop[1]; }
    $('onder').style.display = onder ? '' : 'none'; if (onder) $('o-tekst').textContent = onder;
  }, [laag, kop, onder]);
  const onder = tekst => page.evaluate(t => { $('onder').style.display = t ? '' : 'none'; $('o-tekst').textContent = t || ''; }, tekst);
  const ease = x => x < 0 ? 0 : x > 1 ? 1 : x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

  // 1. Flowsmid-intro
  await page.evaluate(([s]) => { $('i-sub').textContent = s; }, [cfg.uitleg]);
  await toon('intro', null, null);
  await scene(4, [], async st => {
    await page.evaluate(st => {
      const a = Math.min(1, Math.max(0, (st - .3) / 1));
      document.querySelector('#intro .merk-wrap').style.clipPath = 'inset(0 ' + (100 - 100 * (1 - Math.pow(1 - a, 3))) + '% 0 0)';
      const h = Math.min(1, Math.max(0, (st - 1.4) / .5)), p = Math.min(1, Math.max(0, (st - 1.9) / .5));
      $('i-titel').style.opacity = h; $('i-titel').style.transform = 'translateY(' + (20 - 20 * h) + 'px)';
      $('i-sub').style.opacity = p;
    }, st);
  }, { in: .4, uit: .4 });

  // 2. De echte intro van de site, schermvullend
  await toon('vol', null, null);
  volFrame = await laad('volscherm', 'http://demo.test/site/');
  await volFrame.evaluate(() => { const i = document.getElementById('intro'); i.style.transition = 'none'; i.classList.remove('weg'); i.style.visibility = ''; void i.offsetHeight; i.style.transition = ''; document.body.style.overflow = 'hidden'; new MutationObserver(() => { if (!window.__magWeg && i.classList.contains('weg')) { i.style.transition = 'none'; i.classList.remove('weg'); void i.offsetHeight; i.style.transition = ''; } }).observe(i, { attributes: true }); });
  await scene(4.6, [{ t: 3.75, fn: async () => { await volFrame.evaluate(() => { window.__magWeg = true; document.getElementById('intro').classList.add('weg'); }); } }], null, { in: .2, uit: .4 });

  // 3. STAP 1: de website in de telefoon
  await toon('scene', ['STAP 1', 'Je website'], 'Dit is je eigen website met online afspraken.');
  const s = await laad('scherm', 'http://demo.test/site/');
  await s.evaluate(() => { const i = document.getElementById('intro'); i.style.display = 'none'; document.body.style.overflow = ''; document.querySelectorAll('.zichtbaar').forEach(e => e.classList.add('in')); });
  const yPrijs = await offset(s, '#behandelingen') - 60;
  let yBoek = 0, yStart = 0, scrollAnim = null;
  const scrollTo = (doel, dur) => { scrollAnim = { van: null, doel, t0: null, dur }; };
  await scene(13, [
    { t: 1.4, fn: async () => scrollTo(yPrijs, 2.4) },
    { t: 4.6, fn: async () => { await tik('scherm', '#dienstenlijst .dienst .knop', true); await onder('Klanten kiezen zelf een behandeling, ' + cfg.term + ' en tijd.'); } },
    { t: 5.3, fn: async () => { yBoek = await offset(s, '#stap2') - 120; scrollTo(yBoek, .9); } },
    { t: 6.6, fn: async () => tik('scherm', '#k-kapper .keuze') },
    { t: 7.4, fn: async () => { const y = await offset(s, '#stap3') - 120; scrollTo(y, .7); } },
    { t: 8.4, fn: async () => tik('scherm', '#k-dagen .dag:not([disabled]):nth-of-type(n+2)') },
    { t: 9.6, fn: async () => tik('scherm', '#k-tijden .tijd:nth-child(3)') },
    { t: 10.4, fn: async () => { const y = await offset(s, '#stap4') - 100; scrollTo(y, .9); } },
  ], async st => {
    if (scrollAnim) {
      if (scrollAnim.t0 === null) { scrollAnim.t0 = st; scrollAnim.van = await s.evaluate(() => scrollY); }
      const a = ease((st - scrollAnim.t0) / scrollAnim.dur);
      await scrollNaar(s, scrollAnim.van + (scrollAnim.doel - scrollAnim.van) * a);
      if (a >= 1) scrollAnim = null;
    }
  });

  // 4. STAP 2: inloggen in het beheer
  await toon('scene', ['STAP 2', 'Inloggen in het beheer'], 'Wachtwoord: dat heb je van Flowsmid gekregen.');
  const b = await laad('scherm', 'http://demo.test/site/beheer/');
  await scene(4, [{ t: 2.6, fn: async () => { await onder('Of kijk eerst rond met voorbeelddata.'); await tik('scherm', '#demoknop', true); } }], null, { in: .35, uit: .3 });

  // 5. STAP 3: de agenda
  await toon('scene', ['STAP 3', 'De agenda'], 'Alle afspraken in één agenda, per ' + cfg.term + '.');
  await scene(6.5, [
    { t: 2.6, fn: async () => { await tik('scherm', '[data-w="week"]', true); await onder('Wissel tussen dag, week en maand.'); } },
  ], null);

  // 6. STAP 4: afspraken
  await toon('scene', ['STAP 4', 'Afspraken'], 'Alles op een rij, ook wat online is geboekt.');
  await scene(4.2, [{ t: .5, fn: async () => tik('scherm', '.tab[data-tab="lijst"]') }], null);

  // 7. STAP 5: rooster
  await toon('scene', ['STAP 5', 'Rooster en tijdsloten'], 'Stel per ' + cfg.term + ' de werktijden in.');
  await scene(4.5, [{ t: .5, fn: async () => tik('scherm', '.tab[data-tab="rooster"]') }], null);

  // 8. STAP 6: behandelingen
  await toon('scene', ['STAP 6', 'Behandelingen en prijzen'], 'Je website verandert direct mee.');
  await scene(4.5, [{ t: .5, fn: async () => tik('scherm', '.tab[data-tab="diensten"]') }], null);

  // 9. Slot
  await page.evaluate(k => { $('kaartjes').innerHTML = k.map(x => '<div class="kaartje"><i>' + x[0] + '</i><div><b>' + x[1] + '</b><small>' + x[2] + '</small></div></div>').join(''); }, cfg.slot);
  await toon('slot', null, null);
  await scene(6, [], async st => {
    await page.evaluate(st => { document.querySelectorAll('.kaartje').forEach((k, i) => { const a = Math.min(1, Math.max(0, (st - .5 - i * .45) / .5)); k.style.opacity = a; k.style.transform = 'translateY(' + (30 - 30 * a) + 'px)'; }); document.querySelector('#slot h2').style.opacity = Math.min(1, st / .5); }, st);
  }, { in: .35, uit: 1.0 });

  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('duur', T.toFixed(2));
})();
