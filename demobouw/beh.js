const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
(async()=>{
 const b=await chromium.launch();
 for(const slug of process.argv.slice(2)){
  const root='/home/claude/bouw/uit/sites/'+slug;
  const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  p.on('pageerror',e=>console.log(slug,'ERR',e.message));
  await p.route('**/*',async r=>{const u=new URL(r.request().url());
     if(u.hostname==='demo.test'){ let f=u.pathname; if(f.endsWith('/')) f+='index.html'; const fp=path.join(root,f); if(fs.existsSync(fp)) return r.fulfill({path:fp}); return r.fulfill({status:404,body:'nf'});}
     if(u.hostname.includes('fonts.g')) return r.continue();
     return r.abort();});
  await p.goto('http://demo.test/beheer/');
  await p.waitForTimeout(800);
  await p.screenshot({path:`/home/claude/bouw/shots/${slug}-beh-login.png`});
  await p.click('#demoknop'); await p.waitForTimeout(1000);
  await p.screenshot({path:`/home/claude/bouw/shots/${slug}-beh-agenda.png`});
  await p.close();
 }
 await b.close();
})();
