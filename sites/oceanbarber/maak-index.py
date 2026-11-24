# Zet het logo inline in de intro (voor de animatie) en schrijf index.html.
import re,os
d=os.path.dirname(os.path.abspath(__file__))
svg=open(os.path.join(d,'logo/oceanbarber-logo.svg')).read()
svg=re.sub(r'<title.*?</title>','',svg,flags=re.S).replace(' role="img" aria-labelledby="ocean-titel"',' aria-hidden="true"')
src=open(os.path.join(d,'index.src.html')).read()
open(os.path.join(d,'index.html'),'w').write(src.replace('<!--LOGO-->',svg))
