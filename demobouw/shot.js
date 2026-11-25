const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const mock=JSON.parse(fs.readFileSync('/home/claude/bouw/mock.json'));
(async()=>{
 const b=await chromium.launch();
 for(const slug of process.argv.slice(2)){
  const root='/home/claude/bouw/uit/sites/'+slug;
  for(const [w,h,naam] of [[1280,800,'desk'],[390,844,'mob']]){
   const p=await b.newPage({viewport:{width:w,height:h}});
   await p.route('**/*',async r=>{const u=new URL(r.request().url());
     if(u.hostname==='demo.test'){ let f=u.pathname; if(f.endsWith('/')) f+='index.html';
       if(f.startsWith('/img/')){ return r.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#556"/><text x="400" y="400" font-size="60" text-anchor="middle" fill="#fff">${f}</text></svg>`});}
       const fp=path.join(root,f); if(fs.existsSync(fp)) return r.fulfill({path:fp}); return r.fulfill({status:404,body:'nf'});}
     if(u.pathname.includes('/rpc/kb_publiek')) return r.fulfill({contentType:'application/json',body:JSON.stringify(mock[slug])});
     if(u.pathname.includes('/rpc/kb_tijden')) return r.fulfill({contentType:'application/json',body:JSON.stringify([{t:'10:00'},{t:'10:30'},{t:'11:15'},{t:'14:00'}])});
     if(u.hostname.includes('fonts.g')) return r.continue();
     return r.abort();});
   await p.goto('http://demo.test/');
   await p.waitForTimeout(1500);
   await p.screenshot({path:`/home/claude/bouw/shots/${slug}-${naam}-intro.png`});
   await p.click('#overslaan'); await p.waitForTimeout(1300);
   await p.evaluate(()=>document.querySelectorAll('.zichtbaar').forEach(e=>e.classList.add('in')));
   await p.screenshot({path:`/home/claude/bouw/shots/${slug}-${naam}-full.png`,fullPage:true});
   await p.close();
  }
 }
 await b.close();
})();
