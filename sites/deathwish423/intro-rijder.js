/* Intro 2 "De rijder": een member komt aanrijden op zijn motor, stapt af, draait zich om
   en laat zijn rug zien. Daarna zoomt het beeld in op het embleem, dat in 3D naar voren komt.
   Alles is getekend in SVG en wordt per frame aangestuurd (met eenvoudige inverse kinematica
   voor armen en benen). Gebruik: IntroRijder({intro, embleem, delen, flits, klaar, einde}). */
(function(){
  'use strict';
  var NS='http://www.w3.org/2000/svg';
  var GROND=760;              // y van de weg
  var EIND_X=600;             // x van het achterwiel als de motor stilstaat
  var DIJ=104, SCHEEN=100;    // been: dij en scheen
  var BOVENARM=72, ONDERARM=68;
  var RAD=62;                 // wielstraal

  function el(naam,attr,ouder){var e=document.createElementNS(NS,naam);for(var k in attr)e.setAttribute(k,attr[k]);if(ouder)ouder.appendChild(e);return e;}
  function lerp(a,b,t){return a+(b-a)*t;}
  function klem(t){return t<0?0:t>1?1:t;}
  function fase(t,van,tot){return klem((t-van)/(tot-van));}
  function uit3(t){return 1-Math.pow(1-t,3);}
  function inuit(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
  function inuit2(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}
  function pt(x,y){return {x:x,y:y};}
  function lp(a,b,t){return pt(lerp(a.x,b.x,t),lerp(a.y,b.y,t));}

  /* Twee-botten IK: geeft hoeken (vanaf 'recht naar beneden', met de klok mee in SVG) */
  function ik(wortel,doel,l1,l2,kies){
    var dx=doel.x-wortel.x, dy=doel.y-wortel.y, d=Math.sqrt(dx*dx+dy*dy);
    d=Math.max(Math.abs(l1-l2)+.01,Math.min(l1+l2-.01,d));
    var basis=Math.atan2(dy,dx), A=Math.acos((l1*l1+d*d-l2*l2)/(2*l1*d));
    var opties=[basis+A,basis-A].map(function(h){
      var m=pt(wortel.x+l1*Math.cos(h),wortel.y+l1*Math.sin(h));
      return {m:m,h1:h};
    });
    var o=kies(opties[0].m,opties[1].m)?opties[0]:opties[1];
    var h2=Math.atan2(doel.y-o.m.y,doel.x-o.m.x);
    function graden(h){return Math.atan2(-Math.cos(h),Math.sin(h))*180/Math.PI;} // richting -> rotatie t.o.v. (0,1)
    return {a1:graden(o.h1),a2:graden(h2),midden:o.m};
  }
  var knieVoor=function(a,b){return a.x>b.x;};
  var elleboogOmlaag=function(a,b){return a.y>b.y;};

  /* ---------- Tekeningen ---------- */
  function defs(svg){
    var d=el('defs',{},svg);
    var g=el('linearGradient',{id:'rLucht',x1:0,y1:0,x2:0,y2:1},d);
    el('stop',{offset:0,'stop-color':'#050303'},g);el('stop',{offset:.62,'stop-color':'#2a0805'},g);el('stop',{offset:.8,'stop-color':'#6e1608'},g);el('stop',{offset:1,'stop-color':'#140504'},g);
    g=el('linearGradient',{id:'rWeg',x1:0,y1:0,x2:0,y2:1},d);
    el('stop',{offset:0,'stop-color':'#1b1312'},g);el('stop',{offset:1,'stop-color':'#060404'},g);
    g=el('linearGradient',{id:'rChroom',x1:0,y1:0,x2:0,y2:1},d);
    el('stop',{offset:0,'stop-color':'#f4f5f6'},g);el('stop',{offset:.45,'stop-color':'#8d9399'},g);el('stop',{offset:.6,'stop-color':'#e6e8ea'},g);el('stop',{offset:1,'stop-color':'#5f656b'},g);
    g=el('linearGradient',{id:'rVuur',x1:0,y1:0,x2:1,y2:0},d);
    el('stop',{offset:0,'stop-color':'#8e0f0a'},g);el('stop',{offset:.45,'stop-color':'#d8261a'},g);el('stop',{offset:.8,'stop-color':'#ff6a13'},g);el('stop',{offset:1,'stop-color':'#ffb23a'},g);
    g=el('linearGradient',{id:'rBundel',x1:0,y1:0,x2:1,y2:0},d);
    el('stop',{offset:0,'stop-color':'#ffe9b0','stop-opacity':.35},g);el('stop',{offset:1,'stop-color':'#ffe9b0','stop-opacity':0},g);
    var f=el('filter',{id:'rGloed',x:'-50%',y:'-50%',width:'200%',height:'200%'},d);
    el('feGaussianBlur',{stdDeviation:6},f);
  }

  function achtergrond(g){
    el('rect',{x:-4000,y:-3000,width:9600,height:3000+GROND,fill:'url(#rLucht)'},g);
    // skyline in silhouet
    var s='M-4000,'+GROND;var x=-4000,r=7;
    while(x<5600){r=(r*9301+49297)%233280;var h=40+(r/233280)*150, w=60+(r%7)*22;s+=' L'+x+','+(GROND-h)+' L'+(x+w)+','+(GROND-h);x+=w+((r%3)*14);}
    s+=' L5600,'+GROND+' Z';
    el('path',{d:s,fill:'#0d0606',opacity:.9},g);
    // lantaarnpalen
    for(var i=-6;i<12;i++){var lx=i*420+120;
      el('rect',{x:lx,y:GROND-330,width:8,height:330,fill:'#0a0505'},g);
      el('path',{d:'M'+(lx+4)+','+(GROND-326)+' q40,-14 70,6',stroke:'#0a0505','stroke-width':7,fill:'none'},g);
      el('ellipse',{cx:lx+74,cy:GROND-314,rx:38,ry:16,fill:'#ff9a3c',opacity:.18,filter:'url(#rGloed)'},g);
      el('circle',{cx:lx+74,cy:GROND-318,r:5,fill:'#ffc27a'},g);
    }
    el('rect',{x:-4000,y:GROND,width:9600,height:3000,fill:'url(#rWeg)'},g);
    el('rect',{x:-4000,y:GROND,width:9600,height:4,fill:'#3a2320'},g);
    for(var j=-40;j<60;j++) el('rect',{x:j*120,y:GROND+56,width:60,height:6,fill:'#5b4a3c',opacity:.55},g);
  }

  function wiel(ouder,cx){
    var w=el('g',{transform:'translate('+cx+','+(-RAD)+')'},ouder);
    el('circle',{r:RAD,fill:'none',stroke:'#0b0b0b','stroke-width':18},w);
    el('circle',{r:RAD-9,fill:'none',stroke:'#2a2a2a','stroke-width':2},w);
    el('circle',{r:RAD-14,fill:'#0c0909',stroke:'url(#rChroom)','stroke-width':4},w);
    var sp=el('g',{},w);
    for(var i=0;i<12;i++){var h=i*Math.PI/6;el('line',{x1:0,y1:0,x2:(RAD-15)*Math.cos(h),y2:(RAD-15)*Math.sin(h),stroke:'#aeb3b8','stroke-width':1.6},sp);}
    el('circle',{r:11,fill:'url(#rChroom)',stroke:'#3a3a3a','stroke-width':2},w);
    return sp;
  }

  function motor(g){
    var m=el('g',{},g);
    // uitlaat achter
    el('path',{d:'M175,-92 L-30,-60 L-62,-58',stroke:'url(#rChroom)','stroke-width':10,'stroke-linecap':'round',fill:'none'},m);
    el('path',{d:'M180,-74 L-24,-44 L-58,-42',stroke:'url(#rChroom)','stroke-width':10,'stroke-linecap':'round',fill:'none'},m);
    var achter=wiel(m,0), voor=wiel(m,330);
    // spatbord achter
    el('path',{d:'M-74,-58 A78,78 0 0 1 58,-116',stroke:'#8e0f0a','stroke-width':12,fill:'none','stroke-linecap':'round'},m);
    // frame
    el('path',{d:'M0,-62 L96,-128 L262,-222 M96,-128 L150,-84 L190,-70 L246,-150 M0,-62 L150,-84',stroke:'#121212','stroke-width':10,fill:'none','stroke-linejoin':'round','stroke-linecap':'round'},m);
    // voorvork (chopper)
    el('path',{d:'M262,-226 L330,-62',stroke:'url(#rChroom)','stroke-width':9,'stroke-linecap':'round'},m);
    el('path',{d:'M272,-230 L338,-70',stroke:'#7c8288','stroke-width':4,'stroke-linecap':'round'},m);
    // motorblok V-twin
    el('rect',{x:120,y:-120,width:84,height:52,rx:8,fill:'#1a1a1a',stroke:'#000','stroke-width':2},m);
    [[132,-178,-14],[176,-176,14]].forEach(function(c){
      var cil=el('g',{transform:'translate('+c[0]+','+c[1]+') rotate('+c[2]+')'},m);
      el('rect',{x:-2,y:0,width:30,height:62,rx:4,fill:'url(#rChroom)',stroke:'#3a3a3a','stroke-width':2},cil);
      for(var i=1;i<6;i++) el('line',{x1:-4,y1:i*10,x2:30,y2:i*10,stroke:'#4b5056','stroke-width':2},cil);
    });
    el('circle',{cx:162,cy:-94,r:16,fill:'url(#rChroom)',stroke:'#333','stroke-width':2},m);
    // tank met vlammen
    el('path',{d:'M150,-180 Q196,-212 252,-196 L246,-164 Q200,-150 150,-160 Z',fill:'#0f0f0f',stroke:'url(#rChroom)','stroke-width':3},m);
    el('path',{d:'M156,-168 Q176,-178 186,-170 Q198,-186 212,-178 Q226,-194 244,-186 L242,-170 Q200,-160 156,-162 Z',fill:'url(#rVuur)'},m);
    // zadel en sissybar
    el('path',{d:'M56,-150 Q100,-166 154,-164 L152,-148 Q108,-140 60,-138 Z',fill:'#1a1210',stroke:'#000','stroke-width':2},m);
    el('path',{d:'M58,-144 L40,-232 Q38,-244 50,-244',stroke:'url(#rChroom)','stroke-width':6,fill:'none','stroke-linecap':'round'},m);
    // stuur (ape hanger) en koplamp
    el('path',{d:'M266,-226 L254,-278 Q250,-290 238,-286 L226,-262',stroke:'url(#rChroom)','stroke-width':7,fill:'none','stroke-linecap':'round','stroke-linejoin':'round'},m);
    el('rect',{x:216,y:-268,width:22,height:12,rx:5,fill:'#111'},m);
    el('path',{d:'M290,-232 L1200,-330 L1200,-60 L292,-206 Z',fill:'url(#rBundel)',class:'r-bundel'},m);
    el('circle',{cx:290,cy:-220,r:15,fill:'url(#rChroom)',stroke:'#2a2a2a','stroke-width':2},m);
    el('circle',{cx:293,cy:-220,r:9,fill:'#fff1c2'},m);
    // spatbord voor
    el('path',{d:'M282,-104 A70,70 0 0 1 382,-98',stroke:'#8e0f0a','stroke-width':9,fill:'none','stroke-linecap':'round'},m);
    // achterlicht
    el('rect',{x:-70,y:-104,width:12,height:7,rx:2,fill:'#ff2a1a'},m);
    return {g:m,wielen:[achter,voor]};
  }

  /* Zijaanzicht van de rijder. Oorsprong = heup. Kijkt naar rechts. */
  function rijderZij(g){
    var r={g:el('g',{},g)};
    function been(kleur,laars){
      var dij=el('g',{},r.g);
      el('rect',{x:-16,y:-6,width:32,height:DIJ+14,rx:15,fill:kleur,stroke:'#07080a','stroke-width':2.5},dij);
      var scheen=el('g',{transform:'translate(0,'+DIJ+')'},dij);
      el('rect',{x:-13,y:-8,width:26,height:SCHEEN+10,rx:12,fill:kleur,stroke:'#07080a','stroke-width':2.5},scheen);
      var voet=el('g',{},r.g);
      el('path',{d:'M-14,-22 L12,-22 Q20,-22 22,-12 L38,-8 Q46,-6 46,2 L46,6 L-16,6 Z',fill:laars,stroke:'#000','stroke-width':2.5},voet);
      el('rect',{x:-16,y:2,width:62,height:5,fill:'#000'},voet);
      return {dij:dij,scheen:scheen,voet:voet};
    }
    function arm(kleur,hand){
      var boven=el('g',{},r.g);
      el('rect',{x:-13,y:-8,width:26,height:BOVENARM+14,rx:12,fill:kleur,stroke:'#000','stroke-width':2.5},boven);
      var onder=el('g',{transform:'translate(0,'+BOVENARM+')'},boven);
      el('rect',{x:-11,y:-6,width:22,height:ONDERARM+4,rx:10,fill:kleur,stroke:'#000','stroke-width':2.5},onder);
      el('circle',{cx:0,cy:ONDERARM+4,r:11,fill:hand,stroke:'#000','stroke-width':2.5},onder);
      return {boven:boven,onder:onder};
    }
    r.verArm=arm('#0c0c0c','#0e0e0e');
    r.verBeen=been('#222a35','#0e0a09');
    r.romp=el('g',{},r.g);
    var t=r.romp;
    el('path',{d:'M-32,10 C-38,-60 -40,-118 -28,-150 Q0,-168 28,-152 C42,-118 40,-54 32,10 Z',fill:'#161616',stroke:'#000','stroke-width':3},t);
    el('path',{d:'M-32,10 C-38,-60 -40,-118 -28,-150 L-6,-156 C-12,-100 -10,-40 -6,10 Z',fill:'#262220',stroke:'#000','stroke-width':2},t);
    el('path',{d:'M-30,-120 L-10,-124 L-10,-80 L-31,-78 Z',fill:'#8e0f0a',opacity:.85},t);
    el('rect',{x:-34,y:-4,width:68,height:12,rx:3,fill:'#0a0a0a'},t);
    el('rect',{x:20,y:-5,width:12,height:14,rx:2,fill:'url(#rChroom)'},t);
    el('path',{d:'M26,-150 L8,-110 L30,-112',stroke:'#2e2e2e','stroke-width':3,fill:'none'},t);
    var hoofd=el('g',{},t);r.hoofd=hoofd;
    el('rect',{x:0,y:-176,width:22,height:30,rx:6,fill:'#b98668',stroke:'#2a1a14','stroke-width':2.5},hoofd);
    el('circle',{cx:16,cy:-200,r:30,fill:'#c8977a',stroke:'#2a1a14','stroke-width':3},hoofd);
    el('ellipse',{cx:8,cy:-216,rx:12,ry:6,fill:'#e7c1a6',opacity:.7},hoofd);
    el('path',{d:'M-2,-186 Q0,-160 18,-152 Q42,-150 48,-174 L46,-186 Q32,-180 18,-184 Q8,-186 -2,-186 Z',fill:'#231c18',stroke:'#120d0b','stroke-width':2},hoofd);
    el('path',{d:'M30,-182 Q40,-186 48,-182',stroke:'#120d0b','stroke-width':5,fill:'none','stroke-linecap':'round'},hoofd);
    el('path',{d:'M44,-206 Q54,-198 46,-190',fill:'#c8977a',stroke:'#2a1a14','stroke-width':2.5},hoofd);
    el('ellipse',{cx:2,cy:-198,rx:7,ry:10,fill:'#b98668',stroke:'#2a1a14','stroke-width':2.5},hoofd);
    el('path',{d:'M20,-212 L48,-212 L46,-200 L24,-200 Z',fill:'#050505'},hoofd);
    el('path',{d:'M26,-209 L40,-209',stroke:'#5a6068','stroke-width':2},hoofd);
    el('path',{d:'M20,-210 L4,-206',stroke:'#050505','stroke-width':3},hoofd);
    r.nabijBeen=been('#2c3542','#140e0c');
    r.nabijArm=arm('#181818','#141414');
    return r;
  }

  /* Achteraanzicht. Oorsprong = heup. */
  function rijderRug(g){
    var r=el('g',{},g);
    [-1,1].forEach(function(z){
      el('rect',{x:z*14-14,y:-4,width:28,height:200,rx:13,fill:'#2c3542',stroke:'#07080a','stroke-width':2.5},r);
      el('path',{d:'M'+(z*14-16)+',184 L'+(z*14+16)+',184 L'+(z*14+18)+',208 L'+(z*14-18)+',208 Z',fill:'#140e0c',stroke:'#000','stroke-width':2.5},r);
    });
    [-1,1].forEach(function(z){
      el('path',{d:'M'+(z*46)+',-146 Q'+(z*66)+',-120 '+(z*62)+',-60 L'+(z*58)+',-6 L'+(z*44)+',-6 L'+(z*44)+',-130 Z',fill:'#161616',stroke:'#000','stroke-width':2.5},r);
      el('circle',{cx:z*52,cy:2,r:11,fill:'#141414',stroke:'#000','stroke-width':2.5},r);
    });
    el('path',{d:'M-42,10 C-46,-60 -56,-130 -50,-150 Q0,-172 50,-150 C56,-130 46,-60 42,10 Z',fill:'#161616',stroke:'#000','stroke-width':3},r);
    el('path',{d:'M-38,8 C-42,-60 -50,-128 -44,-146 Q0,-164 44,-146 C50,-128 42,-60 38,8 Z',fill:'#211c1a',stroke:'#3a3330','stroke-width':2},r);
    el('path',{d:'M-44,-146 Q-30,-120 -40,-96',stroke:'#0a0a0a','stroke-width':3,fill:'none'},r);
    el('path',{d:'M44,-146 Q30,-120 40,-96',stroke:'#0a0a0a','stroke-width':3,fill:'none'},r);
    var emb=el('image',{href:'/img/logo-volledig.webp',x:-35,y:-150,width:70,height:97.8,preserveAspectRatio:'xMidYMid meet'},r);
    el('rect',{x:-40,y:-4,width:80,height:12,rx:3,fill:'#0a0a0a'},r);
    el('rect',{x:-11,y:-176,width:22,height:28,rx:6,fill:'#b98668',stroke:'#2a1a14','stroke-width':2.5},r);
    el('ellipse',{cx:-28,cy:-196,rx:6,ry:10,fill:'#b98668',stroke:'#2a1a14','stroke-width':2.5},r);
    el('ellipse',{cx:28,cy:-196,rx:6,ry:10,fill:'#b98668',stroke:'#2a1a14','stroke-width':2.5},r);
    el('circle',{cx:0,cy:-200,r:29,fill:'#c8977a',stroke:'#2a1a14','stroke-width':3},r);
    el('ellipse',{cx:-6,cy:-216,rx:12,ry:6,fill:'#e7c1a6',opacity:.6},r);
    el('path',{d:'M-27,-186 Q-20,-172 -12,-170 M27,-186 Q20,-172 12,-170',stroke:'#231c18','stroke-width':6,fill:'none','stroke-linecap':'round'},r);
    el('path',{d:'M-30,-204 L-22,-206 M30,-204 L22,-206',stroke:'#050505','stroke-width':3},r);
    return {g:r,embleem:emb};
  }

  function zet(e,tf){e.setAttribute('transform',tf);}

  /* ---------- Hoofdfunctie ---------- */
  window.IntroRijder=function(o){
    var intro=o.intro, embl=o.embleem, delen=o.delen;
    var svg=el('svg',{class:'rit',preserveAspectRatio:'xMidYMid meet','aria-hidden':'true'});
    intro.insertBefore(svg,intro.firstElementChild);
    defs(svg);
    var cam=el('g',{},svg);
    var decor=el('g',{},cam); achtergrond(decor);
    var stof=el('g',{},cam);
    var motorG=el('g',{},cam);
    var schaduw=el('ellipse',{cx:160,cy:4,rx:230,ry:12,fill:'#000',opacity:.55},motorG);
    var mo=motor(motorG);
    var rijderG=el('g',{},cam);
    var zij=rijderZij(rijderG);
    var rugHouder=el('g',{opacity:0},cam);
    var rug=rijderRug(rugHouder);
    var duister=el('rect',{x:-4000,y:-3000,width:9600,height:8000,fill:'#050303',opacity:0},svg);

    var vb={x:0,y:0,w:1600,h:900};
    function maat(){
      var a=innerWidth/innerHeight;
      if(a>=1){vb={x:EIND_X+215-600,y:220,w:1200,h:640};}
      else {vb={x:EIND_X+215-420,y:170,w:840,h:700};}
      svg.setAttribute('viewBox',vb.x+' '+vb.y+' '+vb.w+' '+vb.h);
    }
    maat(); addEventListener('resize',maat);

    // houdingen (motor-lokaal; y=0 is de grond)
    var ZIT={heup:pt(112,-150),leun:14,voetN:pt(238,-24),voetV:pt(226,-24),handN:pt(232,-258),handV:pt(222,-262)};
    var STA={heup:pt(385,-206),leun:0,voetN:pt(355,0),voetV:pt(410,0),handN:null,handV:null};
    // afstappen aan de nabije kant: voet aan de grond, ver been over het zadel, dan drie stappen langs de motor
    var AF=[
      {t:0,  heup:ZIT.heup,     leun:14, voetN:ZIT.voetN,   voetV:ZIT.voetV,    handN:ZIT.handN,    handV:ZIT.handV},
      {t:.14,heup:pt(130,-172), leun:10, voetN:pt(175,0),   voetV:ZIT.voetV,    handN:ZIT.handN,    handV:ZIT.handV},
      {t:.30,heup:pt(160,-206), leun:4,  voetN:pt(175,0),   voetV:pt(70,-215),  handN:pt(232,-258), handV:pt(205,-232)},
      {t:.42,heup:pt(170,-206), leun:2,  voetN:pt(175,0),   voetV:pt(165,0),    handN:pt(226,-250), handV:null},
      {t:.52,heup:pt(198,-212), leun:2,  voetN:pt(175,0),   voetV:pt(215,-28),  handN:null,         handV:null},
      {t:.62,heup:pt(220,-204), leun:1,  voetN:pt(175,0),   voetV:pt(265,0),    handN:null,         handV:null},
      {t:.72,heup:pt(268,-212), leun:1,  voetN:pt(310,-28), voetV:pt(265,0),    handN:null,         handV:null},
      {t:.82,heup:pt(310,-204), leun:1,  voetN:pt(355,0),   voetV:pt(265,0),    handN:null,         handV:null},
      {t:.91,heup:pt(350,-212), leun:0,  voetN:pt(355,0),   voetV:pt(345,-28),  handN:null,         handV:null},
      {t:1,  heup:STA.heup,     leun:0,  voetN:STA.voetN,   voetV:STA.voetV,    handN:null,         handV:null}
    ];
    function houding(p){
      for(var i=0;i<AF.length-1;i++) if(p<=AF[i+1].t){var a=AF[i],b=AF[i+1],u=inuit2((p-a.t)/(b.t-a.t));
        var r={heup:lp(a.heup,b.heup,u),leun:lerp(a.leun,b.leun,u),voetN:lp(a.voetN,b.voetN,u),voetV:lp(a.voetV,b.voetV,u)};
        var sh=schouder(r.heup,r.leun);
        r.handN=lp(a.handN||hang(sh,1),b.handN||hang(sh,1),u); r.handV=lp(a.handV||hang(sh,-1),b.handV||hang(sh,-1),u);
        return r;}
    }
    function schouder(heup,leun){var h=leun*Math.PI/180;return pt(heup.x+140*Math.sin(h)+8*Math.cos(h),heup.y-140*Math.cos(h)+8*Math.sin(h));}
    function hang(sh,z){return pt(sh.x+(z>0?10:-6),sh.y+BOVENARM+ONDERARM-6);}

    function tekenRijder(h,mx){
      var heup=pt(h.heup.x+mx,h.heup.y+GROND);
      zet(zij.g,'translate('+heup.x+','+heup.y+')');
      zet(zij.romp,'rotate('+h.leun+')');
      var sh=schouder(pt(0,0),h.leun), shV=pt(sh.x-8,sh.y+4);
      [['nabijBeen','voetN'],['verBeen','voetV']].forEach(function(b){
        var v=pt(h[b[1]].x+mx-heup.x,h[b[1]].y+GROND-heup.y-20);
        var r=ik(pt(0,0),v,DIJ,SCHEEN,knieVoor);
        zet(zij[b[0]].dij,'rotate('+r.a1+')'); zet(zij[b[0]].scheen,'translate(0,'+DIJ+') rotate('+(r.a2-r.a1)+')');
        zet(zij[b[0]].voet,'translate('+v.x+','+(v.y+20)+')');
      });
      [['nabijArm','handN',sh],['verArm','handV',shV]].forEach(function(b){
        var d=pt(h[b[1]].x+mx-heup.x,h[b[1]].y+GROND-heup.y-ONDERARM*0+0);
        var r=ik(b[2],d,BOVENARM,ONDERARM+4,elleboogOmlaag);
        zet(zij[b[0]].boven,'translate('+b[2].x+','+b[2].y+') rotate('+r.a1+')'); zet(zij[b[0]].onder,'translate(0,'+BOVENARM+') rotate('+(r.a2-r.a1)+')');
      });
    }

    // stofwolkjes achter het achterwiel
    var wolken=[];
    function wolk(x){var c=el('circle',{cx:x,cy:GROND-14,r:10,fill:'#6b5a52',opacity:.5},stof);wolken.push({e:c,x:x,y:GROND-14,r:10,a:.5,vx:-1-Math.random()*1.5,vy:-.4-Math.random()*.5});}

    var stil=matchMedia('(prefers-reduced-motion: reduce)').matches;
    var t0=null, af=false, embAan=false, start3d=null, eindKlaar=false, vorigeX=-1300, hoek=0, laatsteWolk=0;
    var FIN={};
    function camera(s,doel){
      var cx=vb.x+vb.w/2, cy=vb.y+vb.h/2;
      zet(cam,'translate('+cx+','+cy+') scale('+s+') translate('+(-doel.x)+','+(-doel.y)+')');
    }

    function frame(nu){
      if(af) return;
      if(t0===null) t0=nu;
      var t=(nu-t0)/1000;
      if(stil) t=Math.max(t,10.2);

      // 1. aanrijden (0.2 - 3.0 s)
      var pr=uit3(fase(t,.2,3.0));
      var mx=lerp(-1500,EIND_X,pr);
      hoek+=(mx-vorigeX)/RAD*180/Math.PI; vorigeX=mx;
      var bob=pr<1?Math.sin(t*28)*1.6*(1-pr):0;
      zet(motorG,'translate('+mx+','+(GROND+bob)+')');
      mo.wielen.forEach(function(w){zet(w,'rotate('+hoek+')');});
      if(pr<1&&nu-laatsteWolk>60){wolk(mx-60);laatsteWolk=nu;}
      if(t>3&&t<3.6&&nu-laatsteWolk>180){wolk(mx-70);laatsteWolk=nu;} // stationair
      wolken=wolken.filter(function(w){w.x+=w.vx;w.y+=w.vy;w.r+=.45;w.a-=.008;
        if(w.a<=0){w.e.remove();return false;} w.e.setAttribute('cx',w.x);w.e.setAttribute('cy',w.y);w.e.setAttribute('r',w.r);w.e.setAttribute('opacity',w.a);return true;});

      // 2. afstappen en weglopen (3.5 - 5.6 s)
      var pa=fase(t,3.5,5.6);
      var h=houding(pa);
      var lucht=pa>0&&pa<1?Math.sin(pa*Math.PI)*-10:0;
      h.heup=pt(h.heup.x,h.heup.y+lucht);
      if(pa<=0){h.heup=pt(h.heup.x,h.heup.y+bob);}
      tekenRijder(h,mx);
      // koplamp uit na afstappen
      var bundel=svg.querySelector('.r-bundel'); bundel.setAttribute('opacity',t<4.6?1:Math.max(0,1-(t-4.6)*3));

      // 3. omdraaien (5.9 - 6.4 s)
      var heupX=STA.heup.x+mx, heupY=STA.heup.y+GROND;
      var pd=fase(t,5.9,6.4);
      if(pd<.5){var sx=Math.max(.02,1-pd*2);zet(zij.g,'translate('+(h.heup.x+mx)+','+(h.heup.y+GROND)+') scale('+sx+',1)');zij.g.setAttribute('opacity',pd>0&&sx<.05?0:1);rugHouder.setAttribute('opacity',0);}
      else {zij.g.setAttribute('opacity',0);rugHouder.setAttribute('opacity',1);zet(rugHouder,'translate('+heupX+','+heupY+') scale('+Math.max(.02,(pd-.5)*2)+',1)');}

      // 4. inzoomen op het embleem (6.6 - 8.0 s)
      var pz=inuit(fase(t,6.6,8.0));
      var doelEmbleem=pt(heupX,heupY-101);
      var vbMidden=pt(vb.x+vb.w/2,vb.y+vb.h/2);
      var schaal=lerp(1,(vb.h*.62)/97.8,pz);
      camera(schaal,lp(vbMidden,doelEmbleem,pz));
      motorG.setAttribute('opacity',1-pz*.6);

      // 5. embleem komt in 3D naar voren (8.0 - 10.3 s)
      if(t>=8.0&&!embAan){
        embAan=true; start3d=t;
        var r=rug.embleem.getBoundingClientRect();
        var H=embl.offsetHeight, W=embl.offsetWidth;
        var er=embl.getBoundingClientRect();
        FIN={dx:(r.left+r.width/2)-(er.left+er.width/2),dy:(r.top+r.height/2)-(er.top+er.height/2),s:r.height/H};
        intro.classList.add('rijder-3d');
        rug.embleem.setAttribute('opacity',0);
        if(o.flits){o.flits.classList.remove('aan');void o.flits.offsetWidth;o.flits.classList.add('aan');}
      }
      if(embAan){
        var p=klem((t-start3d)/2.3), pv=uit3(klem(p/.55));
        var s=lerp(FIN.s,1,pv), dx=lerp(FIN.dx,0,pv), dy=lerp(FIN.dy,0,pv);
        var golf=Math.sin(Math.PI*p);
        var ry=-32*Math.sin(Math.PI*Math.min(1,p*1.25))*(1-p*.3), rx=9*golf;
        embl.style.transform='translate('+dx+'px,'+dy+'px) scale('+s+') rotateY('+ry+'deg) rotateX('+rx+'deg)';
        var Z={'d-schild':0,'d-boven':70,'d-onder':70,'d-kogel':130,'d-bg':130,'d-dffd':170,'d-n423':170};
        delen.forEach(function(d){var z=Z[d.classList[0]]*golf;d.style.transform='translateZ('+z+'px)';});
        duister.setAttribute('opacity',klem((t-start3d)/.9)*.97);
        if(p>=1&&!eindKlaar){eindKlaar=true;embl.style.transform='';delen.forEach(function(d){d.style.transform='';});o.klaar&&o.klaar();}
      }
      if(t>=11.9){o.einde&&o.einde();return;}
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return function(){af=true;removeEventListener('resize',maat);};
  };
})();
