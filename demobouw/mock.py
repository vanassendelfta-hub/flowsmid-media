import json,sys,uuid
from sites import SITES
out={}
for slug,c in SITES.items():
    out[slug]={'naam':c['naam'],'adres':c['adres1']+', '+c['adres2'],'telefoon':c['tel'],'vooruit':42,
      'kappers':[{'id':str(uuid.uuid5(uuid.NAMESPACE_DNS,slug+k['naam'])),'naam':k['naam'],'bio':k['bio'],'foto':None} for k in c['kappers']],
      'diensten':[{'id':str(uuid.uuid5(uuid.NAMESPACE_DNS,slug+n)),'naam':n,'omschrijving':o,'prijs':p,'duur':d} for n,o,p,d in c['diensten']],
      'openingstijden':[{'gesloten':True} if not o else {'open':o[0],'dicht':o[1]} for o in c['open']]}
json.dump(out,open('mock.json','w'))
