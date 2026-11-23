# Zet het logo inline in de intro (voor de animatie) en schrijf index.html.
import re,sys,os
d=os.path.dirname(os.path.abspath(__file__))
svg=open(os.path.join(d,'logo/dinero-logo.svg')).read()
svg=re.sub(r'<title>.*?</title>','',svg,flags=re.S)
src=open(os.path.join(d,'index.src.html')).read()
open(os.path.join(d,'index.html'),'w').write(src.replace('<!--LOGO-->',svg))
