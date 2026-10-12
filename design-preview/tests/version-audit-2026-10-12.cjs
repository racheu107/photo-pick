const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve('C:/Users/USER/.codex/builds/photopick-version-audit');
const server=http.createServer((req,res)=>{
 const url=decodeURIComponent(req.url.split('?')[0]),name=url.split('/')[1];
 if(!['old','new'].includes(name)){res.writeHead(404).end();return;}
 const base=path.join(root,name,'assets/www'),relative=url.slice(name.length+2)||'index.html',file=path.join(base,relative);
 if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(data);});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const results=[];
 try{
 for(const name of ['old','new']){
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>window.PhotoPickAndroid={setPhotoFocus(){},ratingHaptic(){},savePhotos(){}});
 await page.goto(`http://127.0.0.1:${server.address().port}/${name}/`);await page.locator('#demo').click();await page.locator('#select-all-dates').click();await page.locator('#start-group-review').click();
 await page.locator('[data-photo="0"]').click();await (name==='old'?page.waitForTimeout(500):page.waitForFunction(()=>!isPhotoMotionBusy()));
 await page.locator('[data-rate=best]').click();await (name==='old'?page.waitForTimeout(500):page.waitForFunction(()=>!isPhotoMotionBusy()));
 const first=await page.evaluate(()=>({id:modalId,grade:state.ratings[0],goodActive:document.querySelector('[data-rate=keep]').getAttribute('aria-pressed')}));
 await page.evaluate(()=>openPhoto(0));await (name==='old'?page.waitForTimeout(500):page.waitForFunction(()=>!isPhotoMotionBusy()));await page.locator('[data-rate=best]').click();await (name==='old'?page.waitForTimeout(500):page.waitForFunction(()=>!isPhotoMotionBusy()));
 const repeat=await page.evaluate(()=>({id:modalId,grade:state.ratings[0]}));
 await page.evaluate(()=>{state.ratings={0:'best',1:'keep'};state.history=[{index:1,ratings:{0:'best'}}];openPhoto(0);});await (name==='old'?page.waitForTimeout(500):page.waitForFunction(()=>!isPhotoMotionBusy()));await page.evaluate(()=>undo());
 const undoResult=await page.evaluate(()=>({...state.ratings}));
 await page.evaluate(()=>{state.ratings={0:'best',1:'keep'};state.screen='summary';render()});
 const summary=await page.evaluate(()=>({bestshot:!!document.querySelector('#best-start'),download:document.querySelector('#import').textContent,chosen:selected().map(p=>p.id)}));
 assert.deepEqual(errors,[]);
 if(name==='old'){assert.equal(first.id,1);assert.equal(first.grade,'best');assert.equal(repeat.grade,'best');assert.deepEqual(undoResult,{0:'best'});assert.equal(summary.bestshot,false);}
 else{assert.equal(first.id,0);assert.equal(first.goodActive,'true');assert.equal(repeat.grade,'keep');assert.deepEqual(undoResult,{1:'keep'});assert.equal(summary.bestshot,true);}
 results.push({name,first,repeat,undoResult,summary});await page.close();
 }
 const dir=path.resolve(__dirname,'../verification/version-audit-2026-10-12');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'behavior.json'),JSON.stringify({pass:true,actualApkAssets:true,results,physicalDevice:false},null,2));
 console.log(JSON.stringify(results,null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
