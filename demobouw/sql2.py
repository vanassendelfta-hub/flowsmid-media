import json
from sites import SITES
def q(s): return "'"+str(s).replace("'","''")+"'" if s is not None else 'null'
for slug,c in SITES.items():
    pc=' '.join(c['adres2'].split(' ')[:2]); plaats=c['adres2'].split(' ',2)[2]
    inst=json.dumps({'slot':15,'vooruit':42,'minVooraf':1,'openingstijden':[{'gesloten':True} if not o else {'open':o[0],'dicht':o[1]} for o in c['open']]})
    s=[f"do $$\ndeclare kid uuid; k1 uuid; k2 uuid;\nbegin\n"]
    s.append(f"insert into flowsmid.klanten (naam,email,telefoon,mobiel,status,adres,postcode,plaats,website,branche,instagram) values ({q(c['naam'])},{q(c['mail'])},{q(c['tel'])},{q(c['tel'])},'Prospect',{q(c['adres1'])},{q(pc)},{q(plaats)},'https://{slug}.flowsmid.nl',{q(c['soort'])},'https://www.instagram.com/{c['ig']}/') returning id into kid;\n")
    s.append(f"update flowsmid.prospects set klant_id=kid where id='{c['prospect']}';\n")
    s.append(f"insert into flowsmid.kb_zaken (klant_id,slug,naam,telefoon,adres,instellingen) values (kid,'{slug}',{q(c['naam'])},{q(c['tel'])},{q(c['adres1']+', '+c['adres2'])},{q(inst)}::jsonb);\n")
    for i,k in enumerate(c['kappers']):
        var='k%d'%(i+1)
        s.append(f"insert into flowsmid.kb_kappers (klant_id,naam,bio,kleur,rol,volgorde) values (kid,{q(k['naam'])},{q(k['bio'])},'{k['kleur']}','{k['rol']}',{i+1}) returning id into {var};\n")
        for d in k['dagen']:
            o=c['open'][d]
            if o: s.append(f"insert into flowsmid.kb_rooster (klant_id,kapper_id,weekdag,van,tot) values (kid,{var},{d},'{k.get('van') or o[0]}','{k.get('tot') or o[1]}');\n")
    for i,(n,om,p,du) in enumerate(c['diensten']):
        s.append(f"insert into flowsmid.kb_diensten (klant_id,naam,omschrijving,prijs,duur,volgorde) values (kid,{q(n)},{q(om)},{p},{du},{i+1});\n")
    s.append(f"insert into flowsmid.domeinen (domein,naam,soort,klant_id,beheer_pad,notitie) values ('{slug}.flowsmid.nl',{q(c['naam'])},'Demo',kid,'/beheer/','Online afspraken');\n")
    log=f"Demo automatisch gebouwd (nachtelijke demobouw 25-11-2026): afsprakensite op {slug}.flowsmid.nl met beheer op /beheer (kappersagenda, slug {slug}), op de basis van Barbershop Ocean. Bronnen: hun eigen website, Fresha en Instagram-link (Instagram zelf was niet leesbaar). "+c['extra_log']+f" Bestanden in flowsmid-media, branch sites-{slug}."
    s.append(f"insert into flowsmid.klant_log (klant_id,tekst,auteur) values (kid,{q(log)},null);\n")
    # voorbeeldafspraken komende 14 dagen, ~4 per werkdag per kapper
    namen=c['demo_namen']
    s.append(f"""insert into flowsmid.kb_afspraken (klant_id,kapper_id,dienst_id,dienst,prijs,start,eind,naam,telefoon,status,bron)
select kid, r.kapper_id, d.id, d.naam, d.prijs, st, st + make_interval(mins=>d.duur), (array{json.dumps(namen).replace('"',"'")})[1+((n*7+extract(day from dag)::int) % {len(namen)})]||' (voorbeeld)', '06 1234 56'||lpad(((n*13+extract(day from dag)::int)%100)::text,2,'0'), 'Bevestigd', case when n%2=0 then 'online' else 'portaal' end
from generate_series(current_date+1, current_date+14, '1 day') dag
join flowsmid.kb_rooster r on r.klant_id=kid and r.weekdag=((extract(isodow from dag)::int)-1)
cross join generate_series(0,3) n
cross join lateral (select * from flowsmid.kb_diensten where klant_id=kid and duur<=60 and prijs>0 order by volgorde offset ((n+extract(day from dag)::int) % 3) limit 1) d
cross join lateral (select ((dag + r.van + make_interval(mins=>60 + n*90)) at time zone 'Europe/Amsterdam') st) t
where (dag + r.van + make_interval(mins=>60 + n*90 + d.duur)) <= dag + r.tot;
""")
    s.append("end $$;\n")
    open(f'db_{slug}.sql','w').write(''.join(s))
    print(slug, len(''.join(s)))
