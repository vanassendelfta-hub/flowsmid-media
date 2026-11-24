import math
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
F='/tmp/claude-0/fonts/'
alfa=TTFont(F+'fontsource-alfa-slab-one-5.3.0/package/files/alfa-slab-one-latin-400-normal.woff2')
slab=TTFont(F+'fontsource-roboto-slab-5.3.0/package/files/roboto-slab-latin-800-normal.woff2')

def glyph(font,ch):
    gs=font.getGlyphSet(); cmap=font.getBestCmap(); g=cmap[ord(ch)]
    return gs, g, gs[g].width

def tekst_recht(font,s,size,cx,base,track=0):
    upm=font['head'].unitsPerEm; k=size/upm
    ws=[glyph(font,c)[2]*k for c in s]; tot=sum(ws)+track*(len(s)-1)
    x=cx-tot/2; out=[]
    for c,w in zip(s,ws):
        if c!=' ':
            gs,g,_=glyph(font,c); pen=SVGPathPen(gs)
            gs[g].draw(TransformPen(pen,(k,0,0,-k,x,base))); out.append(pen.getCommands())
        x+=w+track
    return ' '.join(out)

def tekst_boog(font,s,size,cx,cy,r,midden_hoek,boven=True,track=0):
    """Letters langs een cirkel. boven=True: leesbaar over de bovenkant (met de klok mee)."""
    upm=font['head'].unitsPerEm; k=size/upm
    ws=[glyph(font,c)[2]*k for c in s]; tot=sum(ws)+track*(len(s)-1)
    # booglengte -> hoek
    a=midden_hoek - (tot/2)/r*(1 if boven else -1)
    out=[]
    for c,w in zip(s,ws):
        half=w/2
        am=a+(half/r)*(1 if boven else -1)
        if c!=' ':
            gs,g,_=glyph(font,c); pen=SVGPathPen(gs)
            # positie van het midden van de letter op de basislijn
            px=cx+r*math.cos(am); py=cy+r*math.sin(am)
            rot=am+math.pi/2 if boven else am-math.pi/2
            cs,sn=math.cos(rot),math.sin(rot)
            # glyph-lokaal: x-half, y omlaag (-k)
            # matrix: [cs -sn; sn cs] * [k*(x) ; -k*y] + (px,py) met x verschoven -half
            T=(k*cs, k*sn, k*sn, -k*cs, 0,0)
            # TransformPen: (xx, xy, yx, yy, dx, dy) -> x' = xx*x + yx*y + dx ; y' = xy*x + yy*y + dy
            xx=k*cs; xy=k*sn; yx=k*sn; yy=-k*cs
            dx=px - cs*half; dy=py - sn*half
            gs[g].draw(TransformPen(pen,(xx,xy,yx,yy,dx,dy))); out.append(pen.getCommands())
        a+=((w+track)/r)*(1 if boven else -1)
    return ' '.join(out)

CX,CY=300,220
def ster(cx,cy,r):
    p=[]
    for i in range(10):
        rr=r if i%2==0 else r*0.42
        a=-math.pi/2+i*math.pi/5
        p.append(f'{cx+rr*math.cos(a):.2f},{cy+rr*math.sin(a):.2f}')
    return 'M'+' L'.join(p)+'Z'

sterren=[ster(x,y,9.5) for x,y in [(196,206),(196,240),(206,272),(404,206),(404,240),(394,272)]]
for hoek in ():
    for kant in (-1,1):
        a=math.radians(hoek if kant<0 else 180-hoek)
        sterren.append(ster(CX+113*math.cos(a)*1, CY+113*math.sin(a)*-1 if False else CY-113*math.sin(a), 10))

barbershop=tekst_boog(alfa,'BARBERSHOP',38,CX,CY,114,-math.pi/2,True,track=0.3)
best=tekst_boog(slab,'- BEST IN TOWN -',15.5,CX,CY,127,math.pi/2,False,track=2)
ocean=tekst_recht(slab,'OCEAN',22,CX,303.5,track=2.5)

# Schaar: pivot (300,224)
PX,PY=300,224
def helft(tipx,tipy,ringx,ringy):
    # blad: van pivot naar tip, taps toelopend; steel van pivot naar ring
    dx,dy=tipx-PX,tipy-PY; L=math.hypot(dx,dy); ux,uy=dx/L,dy/L; nx,ny=-uy,ux
    w=12
    blad=(f'M{PX-ux*4+nx*w:.1f},{PY-uy*4+ny*w:.1f} '
          f'Q{PX+ux*L*0.55+nx*w*1.05:.1f},{PY+uy*L*0.55+ny*w*1.05:.1f} {tipx:.1f},{tipy:.1f} '
          f'Q{PX+ux*L*0.5-nx*w*0.2:.1f},{PY+uy*L*0.5-ny*w*0.2:.1f} {PX-ux*4-nx*2:.1f},{PY-uy*4-ny*2:.1f}Z')
    # snijkant-highlight
    hl=(f'M{PX+ux*10+nx*3:.1f},{PY+uy*10+ny*3:.1f} Q{PX+ux*L*0.55+nx*5:.1f},{PY+uy*L*0.55+ny*5:.1f} {tipx-ux*6+nx*1:.1f},{tipy-uy*6+ny*1:.1f}')
    ex,ey=ringx-PX,ringy-PY; M=math.hypot(ex,ey); vx,vy=ex/M,ey/M; mx,my=-vy,vx
    steel=(f'M{PX+mx*4.5:.1f},{PY+my*4.5:.1f} L{ringx-vx*15+mx*3.5:.1f},{ringy-vy*15+my*3.5:.1f} '
           f'L{ringx-vx*15-mx*3.5:.1f},{ringy-vy*15-my*3.5:.1f} L{PX-mx*4.5:.1f},{PY-my*4.5:.1f}Z')
    hoek=math.degrees(math.atan2(vy,vx))
    ring=f'<ellipse cx="{ringx:.1f}" cy="{ringy:.1f}" rx="17" ry="12.5" transform="rotate({hoek:.1f} {ringx:.1f} {ringy:.1f})" fill="none" stroke="url(#staal)" stroke-width="6.5"/>'
    return blad,hl,steel,ring

a=helft(240,158,350,266)   # blad linksboven, ring rechtsonder
b=helft(360,158,250,266)   # blad rechtsboven, ring linksonder

snor=('M300,252 C292,244 280,243 271,248 C262,253 254,256 246,251 C242,248 241,243 245,241 '
      'C240,241 236,247 239,254 C244,265 262,268 276,263 C287,259 295,256 300,258 '
      'C305,256 313,259 324,263 C338,268 356,265 361,254 C364,247 360,241 355,241 '
      'C359,243 358,248 354,251 C346,256 338,253 329,248 C320,243 308,244 300,252Z')

lint=('M240,284 L360,284 L360,310 L240,310Z')
lintL='M240,284 L226,284 L233,297 L226,310 L240,310Z'
lintR='M360,284 L374,284 L367,297 L374,310 L360,310Z'

def halve(h,id_):
    blad,hl,steel,ring=h
    return (f'<g id="{id_}"><path d="{steel}" fill="url(#staal)"/>{ring}'
            f'<path d="{blad}" fill="url(#blad)"/><path d="{hl}" fill="none" stroke="#e9f6fb" stroke-width="1.6" stroke-linecap="round" opacity=".9"/></g>')

svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 440" role="img" aria-labelledby="ocean-titel">
<title id="ocean-titel">Barbershop Ocean</title>
<defs>
  <linearGradient id="zee" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#2bb7d6"/><stop offset=".45" stop-color="#1583a8"/><stop offset="1" stop-color="#0a3c63"/>
  </linearGradient>
  <linearGradient id="zeeBand" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#0b4670"/><stop offset=".25" stop-color="#1a8db4"/><stop offset=".5" stop-color="#0f5f8a"/><stop offset=".75" stop-color="#1b93b9"/><stop offset="1" stop-color="#0b4670"/>
  </linearGradient>
  <linearGradient id="tekstblauw" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2aa9cf"/><stop offset="1" stop-color="#11648f"/>
  </linearGradient>
  <linearGradient id="staal" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#243b55"/><stop offset=".5" stop-color="#0e2238"/><stop offset="1" stop-color="#1c3550"/>
  </linearGradient>
  <linearGradient id="blad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2b9fc6"/><stop offset=".6" stop-color="#16506f"/><stop offset="1" stop-color="#0e2238"/>
  </linearGradient>
  <linearGradient id="snor" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#9aa3ab"/><stop offset="1" stop-color="#4c5660"/>
  </linearGradient>
  <filter id="aquarel" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency=".008 .035" numOctaves="3" seed="7" result="ruis"/>
    <feColorMatrix in="ruis" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .45 -.2" result="licht"/>
    <feComposite in="licht" in2="SourceGraphic" operator="in" result="vlek"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="vlek"/></feMerge>
  </filter>
  <clipPath id="binnen"><circle cx="{CX}" cy="{CY}" r="152"/></clipPath>
</defs>
<g id="band" filter="url(#aquarel)">
  <path d="M30,168 Q300,158 570,168 L570,272 Q300,282 30,272Z" fill="url(#zeeBand)"/>
</g>
<g id="ring">
  <circle cx="{CX}" cy="{CY}" r="180" fill="url(#zee)" filter="url(#aquarel)"/>
  <circle cx="{CX}" cy="{CY}" r="153" fill="#fff"/>
  <circle cx="{CX}" cy="{CY}" r="146" fill="none" stroke="#0e3a5c" stroke-width="2.6"/>
</g>
<path id="boogtekst" d="{barbershop}" fill="url(#tekstblauw)" stroke="#0e3a5c" stroke-width=".6"/>
<g id="sterren" fill="#0e2f4d">{''.join(f'<path d="{s}"/>' for s in sterren)}</g>
<g id="schaar">
  {halve(b,'schaar-b')}
  {halve(a,'schaar-a')}
  <circle cx="{PX}" cy="{PY}" r="5" fill="#e9f6fb" stroke="#0e2238" stroke-width="2.4"/>
  <path id="snorpad" transform="translate(300 256) scale(.72) translate(-300 -254)" d="{snor}" fill="url(#snor)" stroke="#2f3942" stroke-width="1.2"/>
</g>
<g id="lint">
  <path d="{lintL}" fill="#0a2a45"/><path d="{lintR}" fill="#0a2a45"/>
  <path d="{lint}" fill="#0e3a5c"/>
  <path d="M244,287.5 L356,287.5 M244,306.5 L356,306.5" stroke="#5fc3e0" stroke-width="1" opacity=".55"/>
  <path id="oceanwoord" d="{ocean}" fill="#fff"/>
</g>
<path id="besttekst" d="{best}" fill="#0e2f4d"/>
<g id="streepjes" display="none" fill="#0e2f4d"><rect x="196" y="{CY+113}" width="10" height="2.6" rx="1.3" transform="rotate(-34 201 {CY+114})"/><rect x="394" y="{CY+113}" width="10" height="2.6" rx="1.3" transform="rotate(34 399 {CY+114})"/></g>
</svg>
'''
open('/tmp/claude-0/logo/oceanbarber-logo.svg','w').write(svg)
print(len(svg))
