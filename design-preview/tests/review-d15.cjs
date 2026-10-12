const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const project=path.resolve(__dirname,'..'),root=path.resolve(process.env.PHOTO_PICK_APK_WWW||path.join(project,'source/android-app/app/src/main/assets/www'));
const output=path.join(project,'verification/d15');fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{
 const url=decodeURIComponent(req.url.split('?')[0]),web=url.startsWith('/web/'),base=web?path.join(project,'source'):root;
 const file=path.join(base,web?url.slice(4):url==='/'?'index.html':url);
 if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(data);});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>window.PhotoPickAndroid={setPhotoFocus(){},ratingHaptic(){},savePhotos(keys){window.testSavedKeys=JSON.parse(keys)}});
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.locator('#demo').click();await page.locator('#select-all-dates').click();await page.locator('#start-group-review').click();
 const settled=()=>page.waitForFunction(()=>!isPhotoMotionBusy());
 const seed=async(ratings,id=0,dates=[])=>{
 await page.evaluate(({ratings,id,dates})=>{state.ratings=ratings;state.history=[];state.previewHistory=[];state.reviewDates=dates;state.screen='pick';render();openPhoto(id);},{ratings,id,dates});await settled();
 };
 for(const grade of ['skip','keep','best']){
 await seed({1:'best',3:'skip'});await page.locator(`[data-rate=${grade}]`).click();await settled();assert.equal(await page.evaluate(()=>modalId),2);assert.equal(await page.evaluate(()=>state.ratings[0]),grade);assert.equal(await page.evaluate(()=>state.ratings[1]),'best');
 }
 await seed({1:'best',3:'skip'});const accepted=await page.evaluate(()=>[previewRate(0,'keep'),previewRate(0,'best')]);assert.deepEqual(accepted,[true,false]);await settled();assert.equal(await page.evaluate(()=>state.ratings[0]),'keep');
 await seed({0:'keep',1:'best'});await page.locator('[data-rate=keep]').click();assert.equal(await page.evaluate(()=>modalId),0);assert.equal(await page.evaluate(()=>state.ratings[0]||null),null);
 await seed({0:'skip',1:'best'});await page.locator('[data-rate=skip]').click();assert.equal(await page.evaluate(()=>modalId),0);
 const rated=await page.evaluate(()=>Object.fromEntries(sourcePhotos.map(p=>[p.id,'keep'])));
 await seed({...rated,0:null,11:null},11);await page.locator('[data-rate=best]').click();await settled();assert.equal(await page.evaluate(()=>modalId),0);
 await seed({...rated,0:null});await page.locator('[data-rate=best]').click();assert.equal(await page.evaluate(()=>state.screen),'summary');assert.equal(await page.locator('#best-start').count(),0);assert.equal(await page.evaluate(()=>counts().unrated),0);
 await seed({1:'best',2:'keep'},0,['2026-10-08']);await page.locator('[data-rate=skip]').click();assert.equal(await page.evaluate(()=>state.screen),'summary');assert.equal(await page.evaluate(()=>state.ratings[3]||null),null);
 await seed({1:'best',3:'keep'});await page.evaluate(()=>previewSwipeGood());await settled();assert.equal(await page.evaluate(()=>modalId),2);assert.equal(await page.evaluate(()=>state.ratings[0]),'keep');
 await seed({0:'best',1:'keep'});await page.evaluate(()=>previewSwipeGood());await settled();assert.equal(await page.evaluate(()=>state.ratings[0]),'best');assert.equal(await page.evaluate(()=>modalId),2);
 // Release/pinch behavior is deliberately unchanged while UX alternatives are researched.
 await seed({});const session=await page.context().newCDPSession(page),box=await page.locator('.photo-front-card').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
 const point=(id,x,y)=>({id,x,y,radiusX:1,radiusY:1});
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(1,cx-20,cy),point(2,cx+20,cy)]});
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(1,cx-40,cy),point(2,cx+40,cy)]});
 assert((await page.locator('.photo-front-card').evaluate(i=>new DOMMatrixReadOnly(getComputedStyle(i).transform).a))>1.5);
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settled();assert.equal(await page.evaluate(()=>modalId),0);assert.equal(await page.evaluate(()=>state.ratings[0]||null),null);
 assert(Math.abs((await page.locator('.photo-front-card').evaluate(i=>new DOMMatrixReadOnly(getComputedStyle(i).transform).a))-1)<.01);
 for(const [width,height] of [[320,568],[390,844],[430,932]]){
 await page.setViewportSize({width,height});await seed({});
 const geometry=await page.evaluate(()=>{
 const controls=[...document.querySelectorAll('#layer [data-rate]')].map(b=>{const r=b.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right,bottom:r.bottom}});
 const card=document.querySelector('.card').getBoundingClientRect(),bar=document.querySelector('#layer .overlay').getBoundingClientRect();
 return {controls,overlap:bar.top<card.bottom,overflow:document.documentElement.scrollWidth>innerWidth,height:innerHeight};
 });assert(geometry.controls.every(b=>b.width>=56&&b.height>=56&&b.left>=0&&b.right<=width&&b.bottom<=height));assert(!geometry.overlap&&!geometry.overflow,JSON.stringify(geometry));
 await page.screenshot({path:path.join(output,`controls-${width}.png`)});
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{state.ratings={0:'best',1:'keep',2:'keep'};state.scope='combined';state.screen='summary';persist();const data=JSON.parse(localStorage.getItem(KEY));data.bestShots={scope:'combined',target:1,ids:[0]};localStorage.setItem(KEY,JSON.stringify(data));});
 await page.reload();await page.locator('#resume').click();await page.evaluate(()=>{state.screen='summary';render()});
 assert.deepEqual(await page.evaluate(()=>selected().map(p=>p.id)),[0,1,2]);assert.equal(await page.evaluate(()=>Object.hasOwn(state,'bestShots')),false);
 assert.equal(await page.locator('#best-start').count(),0);assert.equal(await page.locator('script[src*=best-shots]').count(),0);
 await page.screenshot({path:path.join(output,'results.png')});
 await page.evaluate(()=>{state.dataset='real';sourcePhotos.forEach(p=>p.nativeKey='key-'+p.id);render()});await page.locator('#import').click();assert.deepEqual(await page.evaluate(()=>window.testSavedKeys),['key-0','key-1','key-2']);
 const web=await browser.newPage({viewport:{width:390,height:844}});web.on('pageerror',e=>errors.push(e.message));await web.goto(`http://127.0.0.1:${server.address().port}/web/app/index.html`);await web.locator('#demo').click();await web.locator('#select-all-dates').click();await web.locator('#start-group-review').click();await web.locator('[data-photo="0"]').click();await web.waitForFunction(()=>!isPhotoMotionBusy());await web.locator('[data-rate=best]').click();await web.waitForFunction(()=>!isPhotoMotionBusy());assert.equal(await web.evaluate(()=>modalId),1);await web.locator('#detail-results').click();assert.equal(await web.locator('#best-start').count(),0);
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({pass:true,apkExtracted:!!process.env.PHOTO_PICK_APK_WWW,checks:['all ratings auto-advance and skip rated','double click guarded','unrating stays','wrap to earlier unrated','completion results','date scope','swipe next unrated and best preserved','pinch reset unchanged','56px controls fit 320/390/430','d14 final-selection migration','no bestshot entry or script','native download grade selection','local web regression'],physicalDevice:false},null,2));console.log('PASS: d15 rating flow, larger controls, final-selection removal and unchanged pinch');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
