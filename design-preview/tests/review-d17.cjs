const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const project=path.resolve(__dirname,'..'),root=path.resolve(process.env.PHOTO_PICK_APK_WWW||path.join(project,'source/android-app/app/src/main/assets/www'));
const output=path.join(project,'verification/d17');fs.mkdirSync(output,{recursive:true});
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
 // The next card stays small and blurred until the old photo has departed.
 await seed({});await page.waitForFunction(()=>[...document.querySelectorAll('.photo-back-card')].filter(i=>!i.hidden).length===3);
 assert.equal(await page.evaluate(()=>getToolbarMaterial()),'glass');
 await page.evaluate(()=>document.querySelector('.card').showPhotoBack(1,1));
 const backStyle=await page.locator('.photo-back-card').first().evaluate(i=>({filter:getComputedStyle(i).filter,scale:new DOMMatrixReadOnly(getComputedStyle(i).transform).a,id:i.dataset.photoId}));
 assert.equal(backStyle.filter,'blur(2px)');assert.equal(backStyle.scale,.96);assert.equal(backStyle.id,'1');
 await page.screenshot({path:path.join(output,'drawer-stack.png')});
 await page.locator('[data-rate=keep]').click();await page.waitForFunction(()=>!!document.querySelector('.photo-departure'));
 await page.locator('.photo-departure').evaluate(i=>{const a=i.getAnimations()[0];a.pause();a.currentTime=150;});
 const layering=await page.evaluate(()=>{const b=document.querySelector('[data-rate=keep]'),r=b.getBoundingClientRect(),bar=b.closest('.overlay');return {hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('button')===b,blur:getComputedStyle(bar).backdropFilter,photoZ:Number(getComputedStyle(document.querySelector('.photo-departure')).zIndex),buttonZ:Number(getComputedStyle(bar).zIndex),id:modalId};});
 assert(layering.hit&&layering.buttonZ>layering.photoZ,JSON.stringify(layering));assert.match(layering.blur,/blur\(16px\)/);assert.equal(layering.id,0);
 await page.screenshot({path:path.join(output,'absorb-behind-glass.png')});
 await page.locator('.photo-departure').evaluate(i=>i.getAnimations()[0].play());await settled();assert.equal(await page.evaluate(()=>modalId),1);
 // Interrupting the transition must not later navigate from the results screen.
 await seed({});await page.locator('[data-rate=best]').click();await page.waitForFunction(()=>!!document.querySelector('.photo-departure'));await page.locator('#detail-results').click();await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>state.screen),'summary');assert.equal(await page.locator('.photo-departure').count(),0);
 // Failed loading keeps the current photo and the already accepted rating.
 await page.route('https://motion-test.invalid/**',route=>route.abort());
 const originalUrl=await page.evaluate(()=>sourcePhotos[1].url);await page.evaluate(()=>sourcePhotos[1].url='https://motion-test.invalid/missing.jpg');
 await seed({});await page.locator('[data-rate=keep]').click();await page.locator('.photo-wait').waitFor();await settled();assert.equal(await page.evaluate(()=>modalId),0);assert.equal(await page.evaluate(()=>state.ratings[0]),'keep');assert.equal(await page.locator('[data-rate=keep]').isEnabled(),true);assert.equal(await page.locator('.photo-front-card').evaluate(i=>getComputedStyle(i).visibility),'visible');
 await page.evaluate(url=>sourcePhotos[1].url=url,originalUrl);
 for(const grade of ['skip','keep','best']){
 await seed({1:'best',3:'skip'});await page.locator(`[data-rate=${grade}]`).click();await settled();assert.equal(await page.evaluate(()=>modalId),2);assert.equal(await page.evaluate(()=>state.ratings[0]),grade);assert.equal(await page.evaluate(()=>state.ratings[1]),'best');
 }
 await seed({1:'best',3:'skip'});const accepted=await page.evaluate(()=>[previewRate(0,'keep'),previewRate(0,'best')]);assert.deepEqual(accepted,[true,false]);await settled();assert.equal(await page.evaluate(()=>state.ratings[0]),'keep');
 await seed({0:'keep',1:'best'});await page.locator('[data-rate=keep]').click();await settled();assert.equal(await page.evaluate(()=>modalId),0);assert.equal(await page.evaluate(()=>state.ratings[0]||null),null);
 await seed({0:'skip',1:'best'});await page.locator('[data-rate=skip]').click();await settled();assert.equal(await page.evaluate(()=>modalId),0);
 const rated=await page.evaluate(()=>Object.fromEntries(sourcePhotos.map(p=>[p.id,'keep'])));
 await seed({...rated,0:null,11:null},11);await page.locator('[data-rate=best]').click();await settled();assert.equal(await page.evaluate(()=>modalId),0);
 await seed({...rated,0:null});await page.locator('[data-rate=best]').click();await settled();assert.equal(await page.evaluate(()=>state.screen),'summary');assert.equal(await page.locator('#best-start').count(),0);assert.equal(await page.evaluate(()=>counts().unrated),0);
 await seed({1:'best',2:'keep'},0,['2026-10-08']);await page.locator('[data-rate=skip]').click();await settled();assert.equal(await page.evaluate(()=>state.screen),'summary');assert.equal(await page.evaluate(()=>state.ratings[3]||null),null);
 await seed({1:'best',3:'keep'});await page.evaluate(()=>previewSwipeGood());await settled();assert.equal(await page.evaluate(()=>modalId),2);assert.equal(await page.evaluate(()=>state.ratings[0]),'keep');
 await seed({0:'best',1:'keep'});await page.evaluate(()=>previewSwipeGood());await settled();assert.equal(await page.evaluate(()=>state.ratings[0]),'best');assert.equal(await page.evaluate(()=>modalId),2);
 // Persistent zoom separates a stationary inspection from an active gesture.
 await seed({});const session=await page.context().newCDPSession(page),box=await page.locator('.photo-front-card').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
 const point=(id,x,y)=>({id,x,y,radiusX:1,radiusY:1});
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(1,cx-20,cy),point(2,cx+20,cy)]});
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(1,cx-40,cy),point(2,cx+40,cy)]});
 assert((await page.locator('.photo-front-card').evaluate(i=>new DOMMatrixReadOnly(getComputedStyle(i).transform).a))>1.5);
 const pose=()=>page.locator('.photo-front-card').evaluate(i=>{const m=new DOMMatrixReadOnly(getComputedStyle(i).transform);return {scale:m.a,x:m.m41,y:m.m42}});
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settled();assert.equal(await page.evaluate(()=>modalId),0);assert.equal(await page.evaluate(()=>state.ratings[0]||null),null);
 const retained=await pose();assert(Math.abs(retained.scale-2)<.01);assert(await page.locator('.zoom-reset').isVisible());assert.equal(await page.evaluate(()=>isPhotoMotionBusy()),false);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(1,cx,cy)]});
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(1,cx+25,cy+30)]});
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settled();
 const panned=await pose();assert(Math.abs(panned.scale-2)<.01);assert(Math.abs(panned.x-retained.x-25)<1);assert(Math.abs(panned.y-retained.y-30)<1);assert.equal(await page.evaluate(()=>modalId),0);assert.equal(await page.evaluate(()=>state.ratings[0]||null),null);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(1,cx-20,cy),point(2,cx+20,cy)]});
 assert.deepEqual(await pose(),panned);
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(1,cx-25,cy),point(2,cx+25,cy)]});
 await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await settled();assert((await pose()).scale>2);assert.equal(await page.evaluate(()=>modalId),0);assert.equal(await page.evaluate(()=>state.ratings[0]||null),null);
 await page.locator('.zoom-reset').click();await settled();assert(Math.abs((await pose()).scale-1)<.01);
 await page.evaluate(()=>{window.tapLog=[];const el=document.querySelector('.card');for(const name of ['onpointerdown','onpointerup','ondblclick']){const original=el[name];el[name]=e=>{const before=isPhotoMotionBusy();original(e);window.tapLog.push({name,type:e.pointerType,time:e.timeStamp,before,after:isPhotoMotionBusy(),transform:document.querySelector('.photo-front-card').style.transform,target:e.target.tagName});};}});
 const doubleTap=async()=>{for(let i=0;i<2;i++){await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(1,cx,cy)]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}};
 await doubleTap();await settled();assert(Math.abs((await pose()).scale-2)<.01,JSON.stringify({pose:await pose(),events:await page.evaluate(()=>window.tapLog)}));
 await page.waitForTimeout(350);await doubleTap();await settled();assert(Math.abs((await pose()).scale-1)<.01);
 await page.waitForTimeout(350);await doubleTap();await settled();assert(Math.abs((await pose()).scale-2)<.01,JSON.stringify({pose:await pose(),events:await page.evaluate(()=>window.tapLog)}));
 await page.screenshot({path:path.join(output,'zoom-retained.png')});
 await page.locator('[data-rate=best]').click();await settled();assert.equal(await page.evaluate(()=>modalId),1);assert.equal(await page.evaluate(()=>state.ratings[0]),'best');assert(Math.abs((await pose()).scale-1)<.01);
 await page.waitForTimeout(350);await doubleTap();await settled();assert(Math.abs((await pose()).scale-2)<.01,JSON.stringify({pose:await pose(),events:await page.evaluate(()=>window.tapLog)}));await page.locator('#next').click();await settled();assert.equal(await page.evaluate(()=>modalId),2);assert(Math.abs((await pose()).scale-1)<.01);
 await page.waitForTimeout(350);await doubleTap();await settled();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert(Math.abs((await pose()).scale-1)<.01);assert.equal(await page.evaluate(()=>isPhotoMotionBusy()),false);
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
 await page.evaluate(()=>{state.dataset='real';sourcePhotos.forEach(p=>p.nativeKey='key-'+p.id);render()});await page.locator('#import').click();await settled();assert.deepEqual(await page.evaluate(()=>window.testSavedKeys),['key-0','key-1','key-2']);
 const web=await browser.newPage({viewport:{width:390,height:844}});web.on('pageerror',e=>errors.push(e.message));await web.goto(`http://127.0.0.1:${server.address().port}/web/app/index.html`);await web.locator('#demo').click();await web.locator('#select-all-dates').click();await web.locator('#start-group-review').click();await web.locator('[data-photo="0"]').click();await web.waitForFunction(()=>!isPhotoMotionBusy());await web.locator('[data-rate=best]').click();await web.waitForFunction(()=>!isPhotoMotionBusy());assert.equal(await web.evaluate(()=>modalId),1);await web.locator('#detail-results').click();await settled();assert.equal(await web.locator('#best-start').count(),0);
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({pass:true,apkExtracted:!!process.env.PHOTO_PICK_APK_WWW,checks:['three-card drawer stack','blur retained behind front','buttons above departing photo','16px glass blur','no late navigation after interruption','loading failure preserves rating and photo','all ratings auto-advance and skip rated','double click guarded','unrating stays','wrap to earlier unrated','completion results','date scope','swipe next unrated and best preserved','pinch release retains pose','pan cannot rate or navigate','re-pinch no jump','cancel retains pose and clears active pointers','touch double tap toggles fit/zoom','fit button','stationary zoom permits rating and navigation','next photo resets fit','blur cleanup','56px controls fit 320/390/430','d14 final-selection migration','no bestshot entry or script','native download grade selection','local web regression'],physicalDevice:false},null,2));console.log('PASS: d17 persistent zoom, pan, re-pinch, double tap, fit and rating/navigation');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
