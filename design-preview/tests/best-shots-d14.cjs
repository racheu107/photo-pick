const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'), fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const project=path.resolve(__dirname,'..'), root=path.resolve(process.env.PHOTO_PICK_APK_WWW || path.join(project,'source/android-app/app/src/main/assets/www'));
const output=path.join(project,'verification/d14');fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{
 const url=decodeURIComponent(req.url.split('?')[0]);
 const servedRoot=url.startsWith('/web/')?path.join(project,'source'):root;
 const file=path.join(servedRoot,url.startsWith('/web/')?url.slice(4):url==='/'?'/index.html':url);
 if(!file.startsWith(servedRoot+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(data);});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const errors=[];
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.PhotoPickAndroid={setPhotoFocus(){},savePhotos(keys){window.savedKeys=JSON.parse(keys)},closeApp(){}}});
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.locator('#demo').click();
 await page.locator('#select-all-dates').click();await page.locator('#start-group-review').click();
 await page.evaluate(()=>{state.ratings={0:'best',1:'best',2:'keep',3:'keep',4:'keep',5:'skip'};state.screen='summary';persist();render()});
 assert.equal(await page.locator('#import').innerText(),'2장 사진 다운로드');
 await page.locator('#best-start').click();await page.locator('[data-best-scope=combined]').click();
 await page.locator('#best-target').fill('2');await page.locator('[data-final="0"]').click();
 assert(await page.locator('#best-done').isDisabled());
 await page.locator('[data-pair="0"]').click();await page.locator('[data-pair="2"]').click();await page.locator('#best-compare').click();
 assert.equal(await page.locator('#compare-badge').innerText(),'A');
 const hold=await page.locator('#compare-hold').boundingBox();await page.mouse.move(hold.x+20,hold.y+20);await page.mouse.down();
 assert.equal(await page.locator('#compare-badge').innerText(),'B');
 await page.mouse.move(2,2);await page.mouse.up();assert.equal(await page.locator('#compare-badge').innerText(),'A');
 const touch=await page.context().newCDPSession(page);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:hold.x+20,y:hold.y+20,id:77}]});
 assert.equal(await page.locator('#compare-badge').innerText(),'B');
 await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 assert.equal(await page.locator('#compare-badge').innerText(),'A');
 await page.locator('#compare-hold').focus();await page.keyboard.down('Space');assert.equal(await page.locator('#compare-badge').innerText(),'B');await page.keyboard.up('Space');assert.equal(await page.locator('#compare-badge').innerText(),'A');
 await page.locator('#compare-photo').dblclick();
 const pose=await page.locator('.compare-image').evaluateAll(images=>images.map(i=>i.style.transform));assert(pose.every(p=>p.includes('scale(2)')));
 await page.locator('#compare-switch').click();assert.equal(await page.locator('#compare-badge').innerText(),'B');
 assert.deepEqual(await page.locator('.compare-image').evaluateAll(images=>images.map(i=>i.style.transform)),pose);
 await page.locator('[data-compare-final="2"]').click();
 assert.equal(await page.locator('[data-compare-final="0"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-compare-final="2"]').getAttribute('aria-pressed'),'true');
 assert.deepEqual(await page.evaluate(()=>state.ratings),{0:'best',1:'best',2:'keep',3:'keep',4:'keep',5:'skip'});
 await page.screenshot({path:path.join(output,'compare-B.png')});
 await page.keyboard.press('Escape');assert.equal(await page.locator('.best-comparison').count(),0);
 await page.locator('[data-final="1"]').click();assert(await page.locator('#best-done').isDisabled());assert.match(await page.locator('#best-limit').innerText(),/1장 더 줄여/);
 await page.locator('[data-final="1"]').click();await page.screenshot({path:path.join(output,'selection.png')});await page.locator('#best-done').click();
 assert.deepEqual(await page.evaluate(()=>selected().map(p=>p.id)),[0,2]);
 assert.equal(await page.locator('#import').innerText(),'2장 사진 다운로드');await page.screenshot({path:path.join(output,'result.png')});
 await page.locator('#best-start').click();await page.locator('[data-final="0"]').click();await page.locator('#best-cancel').click();assert.deepEqual(await page.evaluate(()=>selected().map(p=>p.id)),[0,2]);
 await page.reload();await page.locator('#resume').click();await page.evaluate(()=>{state.screen='summary';render()});assert.deepEqual(await page.evaluate(()=>selected().map(p=>p.id)),[0,2]);
 // Rating/date changes cannot leave stale photos in the final download.
 await page.evaluate(()=>{state.ratings[2]='skip';render()});assert.deepEqual(await page.evaluate(()=>selected().map(p=>p.id)),[0]);
 await page.evaluate(()=>{state.reviewDates=['2026-10-06'];render()});assert.equal(await page.evaluate(()=>selected().length),0);assert(await page.locator('#import').isDisabled());
 await page.evaluate(()=>{state.reviewDates=[];state.ratings[2]='keep';state.dataset='real';sourcePhotos.forEach(p=>p.nativeKey='key-'+p.id);render()});
 await page.locator('#import').click();assert.deepEqual(await page.evaluate(()=>window.savedKeys),['key-0','key-2']);
 await page.evaluate(()=>onNativeSaveComplete({saved:2,skipped:0,failed:0}));assert.equal(await page.evaluate(()=>state.screen),'ready');
 // Small-screen controls remain reachable and do not overlap the image.
 await page.setViewportSize({width:320,height:568});await page.evaluate(()=>{state.screen='summary';render()});await page.locator('#best-start').click();
 await page.locator('[data-pair="0"]').click();await page.locator('[data-pair="2"]').click();await page.locator('#best-compare').click();
 const bounds=await page.locator('.best-comparison').evaluate(el=>({width:el.scrollWidth,height:el.scrollHeight,clientHeight:el.clientHeight}));assert(bounds.width<=320);assert(bounds.height<=bounds.clientHeight+1,JSON.stringify(bounds));await page.screenshot({path:path.join(output,'small-screen.png')});
 await page.keyboard.press('Escape');await page.locator('#best-cancel').click();
 await page.evaluate(()=>{state.screen='pick';render();openPhoto(0)});
 await page.waitForFunction(()=>!isPhotoMotionBusy());await page.locator('[data-rate="best"]').click();await page.waitForFunction(()=>!isPhotoMotionBusy());
 assert.equal(await page.evaluate(()=>state.ratings[0]),'keep');
 await page.evaluate(()=>previewNavigate(1));await page.waitForFunction(()=>!isPhotoMotionBusy());await page.evaluate(()=>previewNavigate(-1));await page.waitForFunction(()=>!isPhotoMotionBusy());assert.equal(await page.evaluate(()=>state.ratings[0]),'keep');
 const web=await browser.newPage({viewport:{width:390,height:844}});web.on('pageerror',e=>errors.push(e.message));
 await web.goto(`http://127.0.0.1:${server.address().port}/web/app/index.html`);await web.locator('#demo').click();
 await web.locator('#select-all-dates').click();await web.locator('#start-group-review').click();
 await web.evaluate(()=>{state.ratings={0:'best',1:'keep'};state.screen='summary';persist();render()});await web.locator('#best-start').click();await web.locator('[data-best-scope=combined]').click();await web.locator('[data-final="1"]').click();await web.locator('#best-done').click();
 assert.deepEqual(await web.evaluate(()=>selected().map(p=>p.id)),[1]);await web.locator('#import').click();await web.locator('.download-action').waitFor();assert.equal(await web.evaluate(()=>PhotoPickWebDownload.current.count),1);
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({pass:true,checks:['multi-select','target count','hold and release outside','pointer cancellation','keyboard hold','A/B toggle','shared zoom','both selected','unchanged ratings','cancel draft','reload persistence','rating and date pruning','native save payload','320px layout'],physicalDevice:false},null,2));
 console.log('PASS: best-shot selection, A/B controls, persistence, native save payload and mobile layout');
 } finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
