# Genereert per demo: index.html, beheer/index.html, logo/<slug>-logo.svg, build.sh, vercel.json, README.md
import re, os, sys, json, html
sys.path.insert(0, os.path.dirname(__file__))
from sites import SITES, FOTO

B = os.path.dirname(os.path.abspath(__file__))
STYLE = open(os.path.join(B, 'ocean-style.css')).read()
SCRIPT = open(os.path.join(B, 'ocean-script.html')).read()
BEHEER = open(os.path.join(B, 'ocean-beheer.html')).read()

def hx(c): c = c.lstrip('#'); return [int(c[i:i+2], 16) for i in (0, 2, 4)]
def mix(a, b, t):
    a, b = hx(a), hx(b); return '#' + ''.join('%02x' % round(a[i] + (b[i] - a[i]) * t) for i in range(3))
def rgb(c): return ','.join(map(str, hx(c)))

def thema(t):
    bg, card, ac, ink, soft = t['bg'], t['card'], t['accent'], t['ink'], t['soft']
    w, z = '#ffffff', '#000000'
    m = {
      '#041526': bg, '#072238': mix(bg, card, .5), '#0b2b46': card, '#0e3352': mix(card, ac, .07), '#1a4669': mix(card, ink, .14),
      '#1fa2c4': ac, '#7fd3ea': mix(ac, ink, .45), '#d8f3fb': mix(ink, ac, .1), '#f4fbfd': ink, '#e3eef4': mix(ink, bg, .07), '#8fb0c4': soft,
      '#ff7b6e': '#ff7b6e', '#7bd88f': '#7bd88f',
      '#25b3d8': mix(ac, w, .14), '#2bb7d6': mix(ac, w, .2), '#1583a8': mix(ac, z, .25),
      '#c6dbe6': mix(ink, bg, .2), '#b9d2df': mix(ink, bg, .25), '#bcd5e2': mix(ink, bg, .25), '#d7e8f0': mix(ink, bg, .15), '#9cc3d6': soft,
      '#062038': mix(bg, card, .3), '#06223a': mix(bg, card, .45), '#051a2c': mix(bg, card, .2), '#05192b': mix(bg, z, .2), '#030f1c': mix(bg, z, .4),
      '#0c3a5e': mix(card, ac, .22), '#0f3a5c': mix(card, ac, .22), '#0a3c63': mix(card, ac, .4), '#0f4a74': mix(card, ac, .3), '#0b2f4d': mix(card, ac, .1),
      '#3a7cab': mix(card, ac, .55), '#2c6a96': mix(card, ac, .5), '#3a6a8c': mix(card, ink, .35), '#1f5a85': mix(card, ac, .35),
      '#e6f8fd': mix(ink, ac, .05),
    }
    def f(s):
        s = re.sub(r'#[0-9a-fA-F]{6}\b', lambda x: m.get(x.group(0).lower(), x.group(0)), s)
        s = s.replace('rgba(31,162,196,', 'rgba(%s,' % rgb(ac)).replace('rgba(216,243,251,', 'rgba(%s,' % rgb(ink)).replace('rgba(4,21,38,', 'rgba(%s,' % rgb(bg))
        return s
    return f

def esc(s): return html.escape(s, quote=True)

def woordmerk_svg(c, voor_img=False):
    """Woordmerk als SVG. Inline (intro) met webfonts; als bestand met systeemfonts."""
    l = c['logo']; ac = c['thema']['accent']; ink = c['thema']['ink']
    k1, k2 = (c['fonts'] if not voor_img else ('Georgia, serif', 'Arial, sans-serif'))
    ff1 = "'%s',Georgia,serif" % k1 if not voor_img else k1
    ff2 = "'%s',Arial,sans-serif" % k2 if not voor_img else k2
    gw = c['kopgewicht']
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300" role="img" aria-label="%s">' % esc(c['naam']) +
      '<g id="wm-lijn"><rect x="150" y="34" width="300" height="3" rx="1.5" fill="%s"/></g>' % ac +
      '<text id="wm-1" x="300" y="98" text-anchor="middle" font-family="%s" font-weight="700" font-size="40" letter-spacing="14" fill="%s">%s</text>' % (ff2, ink, esc(l['regel1'])) +
      '<text id="wm-2" x="300" y="208" text-anchor="middle" font-family="%s" font-weight="%s" font-size="120" fill="%s">%s</text>' % (ff1, gw, ac, esc(l['regel2'])) +
      '<text id="wm-3" x="300" y="258" text-anchor="middle" font-family="%s" font-weight="500" font-size="22" letter-spacing="9" fill="%s">%s</text>' % (ff2, mix(ink, ac, .3), esc(l['onder'])) +
      '<g id="wm-lijn2"><rect x="230" y="276" width="140" height="3" rx="1.5" fill="%s"/></g></svg>' % ac)

def logo_bestand(c):
    """Logo voor <img> (beheer, favicon): vlakke badge met systeemfonts op donkere achtergrond."""
    l = c['logo']; t = c['thema']
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300"><title>%s</title>' % esc(c['naam']) +
      '<rect x="6" y="6" width="588" height="288" rx="40" fill="%s" stroke="%s" stroke-width="6"/>' % (t['bg'], t['accent']) +
      '<text x="300" y="104" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="44" letter-spacing="14" fill="%s">%s</text>' % (t['ink'], esc(l['regel1'])) +
      '<text x="300" y="214" text-anchor="middle" font-family="Georgia,\'Times New Roman\',serif" font-weight="700" font-size="116" fill="%s">%s</text>' % (t['accent'], esc(l['regel2'])) +
      '<text x="300" y="262" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="22" letter-spacing="8" fill="%s">%s</text></svg>' % (mix(t['ink'], t['accent'], .3), esc(l['onder'])))

ICOON_PIJL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
IG_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>'

EXTRA_CSS = '''
/* ---------- Woordmerk en intro (demobouw) ---------- */
.woordmerk{display:flex;flex-direction:column;line-height:1;text-decoration:none}
.woordmerk small{font:700 10px/1 'F2',sans-serif;letter-spacing:.32em;color:var(--wit)}
.woordmerk b{font:KOPGEWICHT 26px/1.05 'F1',Georgia,serif;color:var(--turq)}
footer .woordmerk b{font-size:32px}
#intro .logo-groot{opacity:0;transform:scale(.9);animation:logoIn 1.2s .25s cubic-bezier(.2,.9,.3,1) forwards}
#intro #wm-lijn rect,#intro #wm-lijn2 rect{transform-box:fill-box;transform-origin:center;transform:scaleX(0);animation:breed .9s .9s cubic-bezier(.2,.9,.25,1) forwards}
#intro #wm-lijn2 rect{animation-delay:1.5s}
#intro #wm-1{opacity:0;animation:inFade .7s .6s forwards}
#intro #wm-3{opacity:0;animation:inFade .7s 1.7s forwards}
#intro .glans{position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,rgba(ACRGB,.22),transparent 55%);opacity:0;animation:inFade 1.6s .2s forwards}
@keyframes logoIn{to{opacity:1;transform:none}}
.collage.duo .f1{left:0;top:4%;width:62%;height:72%;transform:rotate(-2.5deg)}
.collage.duo .f2{right:0;bottom:6%;width:52%;height:56%;transform:rotate(3deg)}
.collage.portret .f1{left:8%;top:2%;width:74%;height:86%;transform:rotate(-2deg)}
.badge-woord{position:absolute;left:0;bottom:2%;width:56%;padding:18px 16px;border-radius:22px;background:rgba(BGRGB,.88);border:1.5px solid rgba(ACRGB,.5);box-shadow:0 18px 40px rgba(0,0,0,.45);animation:dobber 5s ease-in-out infinite}
.badge-woord svg{display:block;width:100%;height:auto}
.collage .badge-img{position:absolute;left:2%;bottom:0;width:44%;padding:16px;border-radius:50%;aspect-ratio:1;object-fit:contain;background:rgba(BGRGB,.9);border:1.5px solid rgba(ACRGB,.5);box-shadow:0 18px 40px rgba(0,0,0,.45);animation:dobber 5s ease-in-out infinite}
.over{display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:center}
@media (max-width:860px){.over{grid-template-columns:1fr}}
.over .tekstblok p{color:var(--zacht);font-size:17px;max-width:56ch}
.over figure{border-radius:var(--r);overflow:hidden;aspect-ratio:4/3;background:var(--zee)}
.over figure img{width:100%;height:100%;object-fit:cover}
.kaarten3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:28px}
@media (max-width:860px){.kaarten3{grid-template-columns:1fr}}
.kaarten3 article{padding:24px;border-radius:var(--r);background:var(--kaart);border:1px solid var(--lijn)}
.kaarten3 h3{font-size:24px;color:var(--wit);margin-bottom:8px}
.kaarten3 p{color:var(--zacht);font-size:15px}
.foto-paneel.zonder{background:radial-gradient(circle at 70% 20%,rgba(ACRGB,.45),transparent 60%),linear-gradient(160deg,var(--kaart2),var(--diep))}
'''

def bouw_index(slug, c):
    th = thema(c['thema'])
    f1, f2 = c['fonts']
    t = c['thema']
    css = STYLE
    # intro-logo-regels van Ocean eruit (tussen 'logo-opbouw' en reduced-motion)
    css = re.sub(r'/\* logo-opbouw \*/.*?(?=@keyframes knipA)', '', css, flags=re.S)
    css = css.replace("'Alfa Slab One',Rockwell,Georgia,serif", "'F1',Georgia,serif").replace("'Alfa Slab One'", "'F1'").replace("'Roboto Slab'", "'F2'")
    css = css.replace('font-weight:400;line-height:1.08', 'font-weight:%s;line-height:1.08' % c['kopgewicht'])
    css = css.replace('</style>', EXTRA_CSS.replace('KOPGEWICHT', c['kopgewicht']).replace('ACRGB', rgb(t['accent'])).replace('BGRGB', rgb(t['bg'])) + '</style>')
    css = css.replace("'F1'", "'%s'" % f1).replace("'F2'", "'%s'" % f2)
    css = th(css)
    S = '/img/'
    term, Term, terms = c['term']
    wm_klein = '<span class="woordmerk" aria-hidden="true"><small>%s</small><b>%s</b></span>' % (esc(c['logo']['regel1']), esc(c['logo']['regel2']))
    maps = 'https://www.google.com/maps/search/?api=1&query=' + (c['adres1'] + ' ' + c['adres2']).replace(' ', '+')
    adres = '%s, %s' % (c['adres1'], c['adres2'].split(' ', 2)[-1] if False else c['adres2'])
    # hero rechts
    h = c['hero']
    if h['soort'] == 'collage':
        rechts = ('<div class="collage" aria-hidden="true">' + ''.join('<figure class="f%d"><img src="%s%s" alt=""></figure>' % (i + 1, S, f) for i, f in enumerate(h['fotos'])) +
                  '<img class="badge-img" src="%s%s" alt=""></div>' % (S, h['badge']))
    else:
        rechts = ('<div class="collage %s" aria-hidden="true">' % h['soort'] + ''.join('<figure class="f%d"><img src="%s%s" alt=""></figure>' % (i + 1, S, f) for i, f in enumerate(h['fotos'])) +
                  '<div class="badge-woord">%s</div></div>' % woordmerk_svg(c))
    nav_werk = '<a href="#werk">Werk</a>' if c.get('werk') else '<a href="#over">Over ons</a>'
    if c.get('werk'):
        ig = c['ig']
        werk = ('''  <section id="werk">
    <div class="wrap">
      <div class="sectie-kop zichtbaar">
        <div><div class="label">Uit de stoel</div><h2>Ons werk</h2></div>
        <a class="ig-link" href="https://www.instagram.com/%s/" target="_blank" rel="noopener">%s @%s</a>
      </div>
      <div class="werk zichtbaar">%s</div>
    </div>
  </section>''' % (ig, IG_SVG, ig, ''.join('<figure><img src="%s%s" alt="%s" loading="lazy"><figcaption>%s</figcaption></figure>' % (S, f, esc(cap), esc(cap)) for f, cap in c['werk']['fotos'])))
    else:
        o = c['over']
        fig = '<figure class="zichtbaar"><img src="%s%s" alt="%s" loading="lazy"></figure>' % (S, o['foto'], esc(c['naam'])) if o.get('foto') else ''
        kaarten = ('<div class="kaarten3 zichtbaar">' + ''.join('<article><h3>%s</h3><p>%s</p></article>' % (esc(a), esc(b)) for a, b in o['kaarten']) + '</div>') if o.get('kaarten') else ''
        werk = ('''  <section id="over">
    <div class="wrap">
      <div class="over">
        <div class="tekstblok zichtbaar"><div class="label">%s</div><h2 style="font-size:clamp(34px,5vw,54px);color:var(--wit);margin:10px 0 18px">%s</h2><p>%s</p>
          <p style="margin-top:18px"><a class="ig-link" href="https://www.instagram.com/%s/" target="_blank" rel="noopener">%s @%s</a></p></div>
        %s
      </div>
      %s
    </div>
  </section>''' % (esc(o['label']), esc(o['titel']), esc(o['tekst']), c['ig'], IG_SVG, c['ig'], fig if fig else '<div class="badge-woord zichtbaar" style="position:relative;width:100%;max-width:420px;justify-self:center;animation:none">' + woordmerk_svg(c) + '</div>', kaarten))
    st = c['strook']
    strook_link = 'tel:' + c['telint'] if st['link'] == 'tel' else st['link']
    pn = c['paneel']
    paneel = '<div class="foto-paneel%s" role="img" aria-label="%s"%s><span>%s</span></div>' % ('' if pn['foto'] else ' zonder', esc(c['naam']), ' style="background-image:url(%s%s)"' % (S, pn['foto']) if pn['foto'] else '', pn['tekst'])
    mail = ('''          <div class="contact-rij"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
            <a href="mailto:%s">%s</a></div>''' % (c['mail'], c['mail'])) if c['mail'] else ''
    body = f'''<body>

<div id="intro" aria-hidden="true">
  <div class="glans"></div>
  <button class="overslaan" type="button" id="overslaan">Overslaan</button>
  <div class="logo-groot">{woordmerk_svg(c)}</div>
  <div class="ondertitel">{esc(c['intro_sub'])}</div>
</div>

<header class="kop-balk" id="kopbalk">
  <div class="wrap binnen">
    <a class="merk" href="#top" aria-label="{esc(c['naam'])}">{wm_klein}</a>
    <nav>
      <a href="#behandelingen">Prijzen</a>
      <a href="#team">Team</a>
      {nav_werk}
      <a href="#contact">Contact</a>
      <a class="knop" href="#boeken">Afspraak maken</a>
    </nav>
  </div>
</header>

<main id="top">
  <section class="hero">
    <div class="wrap">
      <div>
        <div class="label">{esc(c['label'])}</div>
        <h1 style="margin-top:16px">{c['h1']}</h1>
        <p class="lead">{esc(c['lead'])}</p>
        <div class="tags">{''.join('<span>%s</span>' % esc(x) for x in c['tags'])}</div>
        <div class="acties">
          <a class="knop" href="#boeken">Afspraak maken
            {ICOON_PIJL}</a>
          <a class="knop lijn" href="#behandelingen">Bekijk prijzen</a>
        </div>
      </div>
      {rechts}
    </div>
  </section>

  <section id="behandelingen">
    <div class="wrap">
      <div class="sectie-kop zichtbaar">
        <div><div class="label">Prijslijst</div><h2>Behandelingen</h2></div>
        <p>{esc(c['prijs_intro'])}</p>
      </div>
      <div class="groepen" id="groepen" role="group" aria-label="Filter op soort"></div>
      <div class="prijslijst" id="dienstenlijst"><p class="leeg">Prijslijst laden…</p></div>
    </div>
  </section>

  <section id="boeken">
    <div class="wrap">
      <div class="sectie-kop zichtbaar">
        <div><div class="label">Online boeken</div><h2>Plan je afspraak</h2></div>
        <p>Kies een behandeling, je {term} en een tijd die je past. Je krijgt meteen bevestiging.</p>
      </div>
      <div class="boek">
        <div class="stappen" id="stappen">
          <div class="stap" id="stap1"><h3><i>1</i>Behandeling</h3><div class="keuzes dienstfilter" id="k-groep"></div><div class="keuzes" id="k-dienst"></div></div>
          <div class="stap dicht" id="stap2"><h3><i>2</i>{Term}</h3><div class="keuzes" id="k-kapper"></div></div>
          <div class="stap dicht" id="stap3"><h3><i>3</i>Datum en tijd</h3>
            <div class="dagen" id="k-dagen"></div>
            <div style="height:16px"></div>
            <div class="tijden" id="k-tijden"><div class="leeg">Kies eerst een dag.</div></div>
          </div>
          <form class="stap dicht" id="stap4" novalidate>
            <h3><i>4</i>Jouw gegevens</h3>
            <p class="keuze-regel" id="s-regel"></p>
            <div class="velden">
              <div class="veld"><label for="f-naam">Naam</label><input id="f-naam" autocomplete="name" required maxlength="80"></div>
              <div class="veld"><label for="f-tel">Telefoon</label><input id="f-tel" type="tel" autocomplete="tel" required maxlength="20" inputmode="tel"></div>
              <div class="veld vol"><label for="f-mail">E-mail (optioneel)</label><input id="f-mail" type="email" autocomplete="email" maxlength="120"></div>
              <div class="veld vol"><label for="f-opm">Opmerking (optioneel)</label><textarea id="f-opm" rows="2" maxlength="500" placeholder="{esc(c['opm_placeholder'])}"></textarea></div>
              <input class="lok" id="f-web" tabindex="-1" autocomplete="off" aria-hidden="true">
            </div>
            <div style="height:18px"></div>
            <button class="knop" type="submit" id="boekknop" style="width:100%">Afspraak bevestigen</button>
            <div class="melding-fout" id="boekfout" role="alert"></div>
          </form>
        </div>
      </div>
    </div>
  </section>

  <section id="team">
    <div class="wrap">
      <div class="sectie-kop zichtbaar">
        <div><div class="label">{esc(c['team_label'])}</div><h2>Ons team</h2></div>
        <p>{esc(c['team_tekst'])}</p>
      </div>
      <div class="team" id="teamlijst"></div>
    </div>
  </section>

{werk}

  <section style="padding-top:0">
    <div class="wrap">
      <div class="strook zichtbaar">
        <div class="icoon"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#d8f3fb" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{st['icoon']}</svg></div>
        <div><h3>{esc(st['titel'])}</h3><p>{esc(st['tekst'])}</p></div>
        <a class="knop wit" href="{strook_link}">{esc(st['knop'])}</a>
      </div>
    </div>
  </section>

  <section id="contact">
    <div class="wrap">
      <div class="sectie-kop zichtbaar"><div><div class="label">Langskomen</div><h2>Openingstijden &amp; contact</h2></div></div>
      <div class="info">
        <div class="paneel">
          <ul class="tijden-lijst" id="tijdenlijst"></ul>
          <div style="height:18px"></div>
          <div class="contact-rij"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>
            <a href="{maps}" target="_blank" rel="noopener">{esc(c['adres1'])}<br>{esc(c['adres2'])}</a></div>
          <div class="contact-rij"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>
            <a href="tel:{c['telint']}">{c['tel']}</a></div>
{mail}
        </div>
        {paneel}
      </div>
    </div>
  </section>
</main>

<footer>
  <div class="wrap binnen">
    {wm_klein}
    <div>© <span id="jaar"></span> {esc(c['naam'])} · {esc(c['adres1'])}, {esc(c['adres2'].split(' ', 2)[-1])}</div>
    <div><a href="https://www.instagram.com/{c['ig']}/" target="_blank" rel="noopener">Instagram</a> · <a href="/beheer/">Beheer</a></div>
  </div>
</footer>
<div class="mobiel-boek" id="mobielboek"><a class="knop" href="#boeken">Afspraak maken</a></div>

'''
    body = th(body)
    sc = SCRIPT
    def rep(s, a, b, n=1):
        assert s.count(a) >= n, (a, s.count(a))
        return s.replace(a, b)
    sc = rep(sc, "SLUG='oceanbarber', TEL='06 25 30 07 78'", "SLUG='%s', TEL='%s'" % (slug, c['tel']))
    sc = rep(sc, 'tel:+31625300778', 'tel:' + c['telint'])
    sc = rep(sc, "bio:'Eerste vrije kapper'", "bio:'Eerste vrije %s'" % term)
    sc = rep(sc, "' bij deze kapper'", "' bij deze %s'" % term)
    sc = rep(sc, "function euro(n){n=Number(n)||0;return", "function euro(n){n=Number(n)||0;if(!n) return 'Gratis';return")
    sc = th(sc)
    head = f'''<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(c['naam'])} | {esc(c['soort'])} in {esc(c['plaats'])}</title>
<meta name="description" content="{esc(c['lead'])}">
<meta name="theme-color" content="{t['bg']}">
<link rel="icon" href="/logo/{slug}-logo.svg" type="image/svg+xml">
<meta property="og:title" content="{esc(c['naam'])}">
<meta property="og:description" content="{esc(c['lead'])}">
<meta property="og:image" content="/img/{c['fotos'][0] if not c['fotos'][0].endswith('.png') else c['fotos'][1] if len(c['fotos'])>1 else c['fotos'][0]}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?{c['fontlink']}&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
'''
    return head + css + '\n</head>\n' + body + sc

def bouw_beheer(slug, c):
    s = BEHEER
    t = c['thema']; term, Term, terms = c['term']
    def rep(a, b, n=1):
        nonlocal s
        assert s.count(a) >= n, (a, s.count(a))
        s = s.replace(a, b)
    rep('Barbershop Ocean', c['naam'], 5)
    rep('/logo/oceanbarber-logo.svg', '/logo/%s-logo.svg' % slug, 4)
    rep("SLUG='oceanbarber'", "SLUG='%s'" % slug)
    rep("'oceanbarber-beheer-sessie'", "'%s-beheer-sessie'" % slug)
    rep("'ocean','knip'", "'%s','knip'" % c['wachtwoordwoord'])
    if term != 'kapper':
        for a, b in [('Kapper: log in', Term + ': log in'), ('>Kapper<select', '>' + Term + '<select'), ('deze kapper', 'deze ' + term),
                     ('iedere kapper', 'iedere ' + term), ("'Nieuwe kapper'", "'Nieuwe " + term + "'"), ("'Kapper bewerken'", "'" + Term + " bewerken'"),
                     ("'Kapper')", "'" + Term + "')"), ('<th>Kapper</th>', '<th>' + Term + '</th>'), ('<option value="kapper">Kapper</option>', '<option value="kapper">' + Term + '</option>')]:
            s = s.replace(a, b)
    # voorbeelddata
    o = c['open']
    def oj(x): return "{gesloten:true}" if not x else "{open:'%s',dicht:'%s'}" % x
    zaakregel = "    zaak={klant_id:'demo',naam:%s,instellingen:{slot:15,minVooraf:1,vooruit:42,openingstijden:[%s]}};" % (json.dumps(c['naam']), ','.join(oj(x) for x in o))
    kap = list(c['kappers'])
    if len(kap) < 2:
        d2 = c['demo_tweede']; kap.append(dict(naam=d2['naam'], bio=d2['bio'], kleur=d2['kleur'], rol='kapper', dagen=kap[0]['dagen'][:-1] or kap[0]['dagen']))
    kj = []
    for i, k in enumerate(kap[:2]):
        kj.append("{id:'k%d',naam:%s,bio:%s,kleur:'%s',rol:'%s',actief:true,online_boekbaar:true,gebruikersnaam:%s,user_id:%s}" % (
            i + 1, json.dumps(k['naam']), json.dumps(k['bio']), k['kleur'], k['rol'], "'%s'" % c['wachtwoordwoord'] if i == 0 else 'null', "'demo'" if i == 0 else 'null'))
    dien = c['diensten'][:5]
    dj = ',\n      '.join("{id:'d%d',naam:%s,omschrijving:%s,prijs:%s,duur:%d,actief:true,volgorde:%d}" % (i + 1, json.dumps(n), json.dumps(om), p, du, i + 1) for i, (n, om, p, du) in enumerate(dien))
    # rooster per kapper: van/tot uit openingstijden
    roost = []
    for i, k in enumerate(kap[:2]):
        for d in k['dagen']:
            if o[d]:
                roost.append("{id:uuid(),kapper_id:'k%d',weekdag:%d,van:'%s',tot:'%s'}" % (i + 1, d, k.get('van') or o[d][0], k.get('tot') or o[d][1]))
    eerste_open = min(int(x[0][:2]) * 60 + int(x[0][3:]) for x in o if x)
    laatste = min(int(x[1][:2]) * 60 + int(x[1][3:]) for x in o if x)
    slots = max(4, (laatste - eerste_open - 60) // 30)
    nieuw = (zaakregel + "\n    rol='eigenaar'; mijnKapper=null;\n    D.kappers=[" + ',\n      '.join(kj) + "];\n    D.diensten=[" + dj + "];\n" +
             "    D.rooster=[" + ','.join(roost) + "];\n")
    a = s.index("    zaak={klant_id:'demo'")
    b = s.index("    D.afwijkingen=")
    s = s[:a] + nieuw + s[b:]
    rep("var namen=['Ryan','Mohamed','Kevin','Daan','Yassin','Jayden','Milan','Sem','Noah','Ilias','Bilal','Luuk','Dylan','Omar','Thijs','Jordy','Ayoub','Rayan','Levi','Stefan'];",
        "var namen=%s;" % json.dumps(c['demo_namen']))
    rep("if(wd(dag)>=1&&wd(dag)<=5){ var b=new Date(dag);b.setHours(12,30,0,0);", "if(werkRamen('k1',dag).length){ var b=new Date(dag);b.setHours(13,0,0,0);")
    rep("var m=540+30*((j*5+dag.getDate())%16)", "var m=%d+30*((j*5+dag.getDate())%%%d)" % (eerste_open, slots))
    return s

def bouw_build(slug, c):
    fotos = ' '.join(c['fotos'])
    return f'''#!/bin/sh
# Vercel-build voor {slug}.flowsmid.nl: haalt de vastgepinde sitebestanden op en de foto's (Supabase-opslag).
set -e
C=${{COMMIT:?}}
B=https://cdn.jsdelivr.net/gh/vanassendelfta-hub/flowsmid-media@$C/sites/{slug}
F={FOTO.format(slug=slug)}
mkdir -p out/beheer out/logo out/img
curl -fsSL $B/index.html -o out/index.html
curl -fsSL $B/beheer/index.html -o out/beheer/index.html
curl -fsSL $B/logo/{slug}-logo.svg -o out/logo/{slug}-logo.svg
for f in {fotos}; do
  curl -fsSL "$F/$f" -o out/img/$f
done
ls -la out out/img
'''

VERCEL = open('/home/claude/flowsmid-media/sites/oceanbarber/vercel.json').read()

def readme(slug, c):
    return f'''# {c['naam']} (demo)

Afsprakensite met beheerportaal voor {c['naam']}, {c['adres1']}, {c['adres2']} (Instagram @{c['ig']}). Gebouwd in de nachtelijke demobouw van 25-11-2026 op de basis van Barbershop Ocean (site) en Dinero (beheer).

- `index.html` is de website, `beheer/index.html` het portaal (kappersagenda, slug `{slug}`), `logo/{slug}-logo.svg` een voorlopig woordmerk.
- Data staat in Supabase, schema `flowsmid`, tabellen `kb_*`, slug `{slug}`. Publiek via `kb_publiek`, `kb_tijden`, `kb_boeken`.
- Foto's staan in Supabase-opslag `flowsmid-sites/{slug}/ig/` (overgenomen van hun eigen website) en worden bij de build opgehaald.
- {c['extra_log']}
- Gegenereerd met `maak.py` en `sites.py` uit de nachtelijke demobouw; aanpassen kan direct in de bestanden.
'''

if __name__ == '__main__':
    uit = sys.argv[1]
    for slug, c in SITES.items():
        d = os.path.join(uit, 'sites', slug)
        os.makedirs(os.path.join(d, 'beheer'), exist_ok=True); os.makedirs(os.path.join(d, 'logo'), exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w').write(bouw_index(slug, c))
        open(os.path.join(d, 'beheer', 'index.html'), 'w').write(bouw_beheer(slug, c))
        open(os.path.join(d, 'logo', slug + '-logo.svg'), 'w').write(logo_bestand(c))
        open(os.path.join(d, 'build.sh'), 'w').write(bouw_build(slug, c))
        open(os.path.join(d, 'vercel.json'), 'w').write(VERCEL)
        open(os.path.join(d, 'README.md'), 'w').write(readme(slug, c))
        print('ok', slug)
