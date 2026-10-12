const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const project=path.resolve(__dirname,'..'),root=path.resolve(process.env.PHOTO_PICK_APK_WWW||path.join(project,'source/android-app/app/src/main/assets/www'));
const output=path.join(project,'verification/d21');fs.mkdirSync(output,{recursive:true});
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
 await page.addInitScript(()=>localStorage.setItem('photopick-review-motion-guide-v1','1'));
 await page.addInitScript(()=>window.PhotoPickAndroid={setPhotoFocus(){},ratingHaptic(){},savePhotos(keys){window.testSavedKeys=JSON.parse(keys)}});
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.locator('#demo').click();await page.locator('#select-all-dates').click();await page.locator('#start-group-review').click();
 const settled=()=>page.waitForFunction(()=>!isPhotoMotionBusy());
 const seed=async(ratings,id=0,dates=[])=>{
 await page.evaluate(({ratings,id,dates})=>{state.ratings=ratings;state.history=[];state.previewHistory=[];state.reviewDates=dates;state.screen='pick';render();openPhoto(id);},{ratings,id,dates});await settled();
 };
 // The next card stays small and blurred until the old photo has departed.
 await seed({});await page.waitForFunction(()=>[...document.querySelectorAll('.photo-back-card')].filter(i=>!i.hidden).length===3);
 assert.equal(await page.evaluate(()=>getToolbarMaterial()),'glass');
 const shape=await page.evaluate(()=>{const bar=document.querySelector('#layer .overlay'),undo=document.querySelector('#focus-undo'),group=document.querySelector('.preview-rating-group'),best=document.querySelector('[data-rate=best]'),a=undo.getBoundingClientRect(),b=group.getBoundingClientRect(),c=best.getBoundingClientRect();return {background:getComputedStyle(bar).backgroundColor,border:getComputedStyle(bar).borderTopWidth,gapLeft:b.left-a.right,gapRight:c.left-b.right,divider:getComputedStyle(group,'::after').width,blur:getComputedStyle(group).backdropFilter};});
 assert.equal(shape.background,'rgba(0, 0, 0, 0)');assert.equal(shape.border,'0px');assert(shape.gapLeft>=10&&shape.gapRight>=10,JSON.stringify(shape));assert.equal(shape.divider,'1px');assert.match(shape.blur,/blur\(16px\)/);
 await page.evaluate(()=>document.querySelector('.card').showPhotoBack(1,1));
 const backStyle=await page.locator('.photo-back-card').first().evaluate(i=>({filter:getComputedStyle(i).filter,scale:new DOMMatrixReadOnly(getComputedStyle(i).transform).a,id:i.dataset.photoId}));
 assert.equal(backStyle.filter,'blur(2px)');assert.equal(backStyle.scale,.96);assert.equal(backStyle.id,'1');
 await page.evaluate(()=>document.querySelector('.card').dismissPhotoGuide?.());await page.screenshot({path:path.join(output,'drawer-stack.png')});
 await page.locator('[data-rate=keep]').click();await page.waitForFunction(()=>!!document.querySelector('.photo-departure'));
 await page.locator('.photo-departure').evaluate(i=>{const a=i.getAnimations()[0];a.pause();a.currentTime=150;});
 const layering=await page.evaluate(()=>{const b=document.querySelector('[data-rate=keep]'),r=b.getBoundingClientRect(),bar=b.closest('.overlay');return {hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('button')===b,blur:getComputedStyle(b.closest('.preview-rating-group')||b).backdropFilter,photoZ:Number(getComputedStyle(document.querySelector('.photo-departure')).zIndex),buttonZ:Number(getComputedStyle(bar).zIndex),id:modalId};});
 assert(layering.hit&&layering.buttonZ>layering.photoZ,JSON.stringify(layering));assert.match(layering.blur,/blur\(16px\)/);assert.equal(layering.id,0);
 await page.screenshot({path:path.join(output,'absorb-behind-glass.png')});
 await page.locator('.photo-departure').evaluate(i=>i.getAnimations()[0].play());await settled();assert.equal(await page.evaluate(()=>modalId),1);
 // Fixed hit areas, isolated press, cancel and linked absorption/arrival phases.
 await seed({});await page.evaluate(()=>document.querySelector('.card').dismissPhotoGuide?.());
 const pressBox=await page.locator('[data-rate=keep]').boundingBox();await page.mouse.move(pressBox.x+pressBox.width/2,pressBox.y+pressBox.height/2);await page.mouse.down();await page.waitForTimeout(100);
 const press=await page.evaluate(()=>{const b=document.querySelector('[data-rate=keep]'),other=document.querySelector('[data-rate=skip]');return {width:b.getBoundingClientRect().width,icon:new DOMMatrixReadOnly(getComputedStyle(b.querySelector('svg')).transform).a,other:new DOMMatrixReadOnly(getComputedStyle(other.querySelector('svg')).transform).a,group:new DOMMatrixReadOnly(getComputedStyle(b.closest('.preview-rating-group')).transform).a};});assert(Math.abs(press.width-pressBox.width)<.1);assert(Math.abs(press.icon-.97)<.01);assert.equal(press.other,1);assert.equal(press.group,1);
 await page.mouse.move(pressBox.x-40,pressBox.y-40);await page.mouse.up();await settled();assert.equal(await page.evaluate(()=>state.ratings[0]||null),null);assert.equal(await page.locator('.motion-pressed').count(),0);
 await page.evaluate(()=>{window.linkedCaptured=false;window.arrivalCaptured=false;window.linkObserver=new MutationObserver(()=>{const stage=document.querySelector('.photo-stage');if(!window.linkedCaptured&&document.querySelector('.photo-departure')){stage.getAnimations({subtree:true}).filter(a=>a.effect.getTiming().duration===190).forEach(a=>{a.pause();a.currentTime=0;});window.linkedCaptured=true;}if(document.querySelector('.photo-arrival-cover')){stage.getAnimations({subtree:true}).filter(a=>a.effect.getTiming().duration===90).forEach(a=>{a.pause();a.currentTime=0;});window.arrivalCaptured=true;linkObserver.disconnect();}});linkObserver.observe(document.querySelector('#layer'),{subtree:true,childList:true});});
 await page.locator('[data-rate=keep]').click();await page.waitForFunction(()=>window.linkedCaptured);
 const compressed=()=>page.locator('[data-rate=keep] svg').evaluate(i=>new DOMMatrixReadOnly(getComputedStyle(i).transform).a);assert(Math.abs((await compressed())-.97)<.01);
 await page.evaluate(()=>document.querySelector('.photo-stage').getAnimations({subtree:true}).filter(a=>a.effect.getTiming().duration===190).forEach(a=>a.currentTime=150));assert((await compressed())>.98);
 await page.screenshot({path:path.join(output,'linked-button-receives.png')});
 await page.evaluate(()=>document.querySelector('.photo-stage').getAnimations({subtree:true}).forEach(a=>a.play()));await page.waitForFunction(()=>window.arrivalCaptured);assert.equal(await page.evaluate(()=>modalId),1);
 assert.equal(await page.locator('.photo-arrival-cover').evaluate(i=>getComputedStyle(i).objectFit),'cover');assert.equal(await page.locator('.photo-front-card').evaluate(i=>getComputedStyle(i).objectFit),'contain');assert.equal(await page.locator('.photo-front-card').evaluate(i=>getComputedStyle(i).opacity),'0');
 await page.evaluate(()=>document.querySelector('.photo-stage').getAnimations({subtree:true}).forEach(a=>a.play()));await settled();assert.equal(await page.locator('.photo-arrival-cover,.motion-pressed,.motion-confirm').count(),0);
 await page.emulateMedia({reducedMotion:'reduce'});await seed({});await page.locator('[data-rate=keep]').click();await settled();assert.equal(await page.evaluate(()=>modalId),1);assert.equal(await page.locator('.photo-arrival-cover,.photo-departure').count(),0);await page.emulateMedia({reducedMotion:'no-preference'});
 // Bottom pivot, signed terminal tilt, filled blurred cards and release continuity.
 for(const sign of [-1,1]){
 await seed({},1);await page.evaluate(()=>document.querySelector('.card').dismissPhotoGuide?.());
 const box=await page.locator('.photo-front-card').boundingBox(),x=box.x+box.width/2,y=box.y+box.height*.3;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+sign*120,y,{steps:8});
 const released=await page.locator('.photo-front-card').evaluate(i=>{const r=i.getBoundingClientRect(),m=new DOMMatrixReadOnly(getComputedStyle(i).transform);return {x:r.x,y:r.y,w:r.width,h:r.height,angle:Math.atan2(m.b,m.a)*180/Math.PI,origin:getComputedStyle(i).transformOrigin,height:i.offsetHeight};});
 assert(sign*released.angle>5&&sign*released.angle<=22.5,JSON.stringify(released));assert((await page.locator('.photo-front-card').evaluate(i=>{const m=new DOMMatrixReadOnly(getComputedStyle(i).transform);return Math.hypot(m.a,m.b);}))<.95);assert.equal(Number(released.origin.split(' ')[1].replace('px','')),released.height);
 assert.equal(await page.locator('.photo-back-card').first().evaluate(i=>getComputedStyle(i).objectFit),'cover');
 assert.equal(await page.locator('.photo-back-card').first().evaluate(i=>getComputedStyle(i).filter),'blur(2px)');
 await page.evaluate(()=>{window.tiltObserver=new MutationObserver(()=>{const c=document.querySelector('.photo-departure');if(c){const a=c.getAnimations()[0];a.pause();a.currentTime=0;tiltObserver.disconnect();}});tiltObserver.observe(document.querySelector('#layer'),{childList:true,subtree:true});});
 await page.mouse.up();await page.waitForFunction(()=>!!document.querySelector('.photo-departure'));
 const departed=await page.locator('.photo-departure').evaluate(i=>{const a=i.getAnimations()[0],r=i.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,origin:getComputedStyle(i).transformOrigin,height:i.offsetHeight,last:a.effect.getKeyframes().at(-1).transform,duration:a.effect.getTiming().duration};});
 for(const k of ['x','y','w','h'])assert(Math.abs(departed[k]-released[k])<.6,JSON.stringify({released,departed}));
 assert.match(departed.last,new RegExp('rotate\\('+sign*22.5+'deg\\)'));assert.equal(Number(departed.origin.split(' ')[1].replace('px','')),departed.height);assert(departed.duration>=150&&departed.duration<=220);
 await page.locator('.photo-departure').evaluate(i=>{const a=i.getAnimations()[0];a.currentTime=a.effect.getTiming().duration*.7;});await page.screenshot({path:path.join(output,sign>0?'tilt-right.png':'tilt-left.png')});
 await page.locator('.photo-departure').evaluate(i=>{const a=i.getAnimations()[0];a.currentTime=a.effect.getTiming().duration;});
 const outside=await page.locator('.photo-departure').evaluate(i=>{const r=i.getBoundingClientRect(),s=i.closest('.photo-stage').getBoundingClientRect();return {left:r.left,right:r.right,stageLeft:s.left,stageRight:s.right};});assert(sign>0?outside.left>outside.stageRight:outside.right<outside.stageLeft,JSON.stringify(outside));
 await page.locator('.photo-departure').evaluate(i=>i.getAnimations()[0].play());await settled();assert.equal(await page.evaluate(()=>modalId),sign>0?0:2);
 }
 await seed({},1);const cancelBox=await page.locator('.photo-front-card').boundingBox();await page.mouse.move(cancelBox.x+cancelBox.width/2,cancelBox.y+cancelBox.height/2);await page.mouse.down();await page.mouse.move(cancelBox.x+cancelBox.width/2-30,cancelBox.y+cancelBox.height/2,{steps:3});await page.mouse.up();await settled();assert.equal(await page.evaluate(()=>modalId),1);assert.equal(await page.locator('.photo-front-card').evaluate(i=>i.style.transform),'');
 await seed({});const downBox=await page.locator('.photo-front-card').boundingBox();await page.mouse.move(downBox.x+downBox.width/2,downBox.y+downBox.height*.4);await page.mouse.down();await page.mouse.move(downBox.x+downBox.width/2,downBox.y+downBox.height*.4+130,{steps:8});assert(Math.abs((await page.locator('.photo-front-card').evaluate(i=>{const m=new DOMMatrixReadOnly(getComputedStyle(i).transform);return Math.hypot(m.a,m.b);}))-.92)<.01);await page.mouse.up();await settled();assert.equal(await page.evaluate(()=>state.ratings[0]),'keep');assert.equal(await page.evaluate(()=>modalId),1);
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
 const web=await browser.newPage({viewport:{width:390,height:844}});await web.addInitScript(()=>localStorage.setItem('photopick-review-motion-guide-v1','1'));web.on('pageerror',e=>errors.push(e.message));await web.goto(`http://127.0.0.1:${server.address().port}/web/app/index.html`);await web.locator('#demo').click();await web.locator('#select-all-dates').click();await web.locator('#start-group-review').click();await web.locator('[data-photo="0"]').click();await web.waitForFunction(()=>!isPhotoMotionBusy());await web.locator('[data-rate=best]').click();await web.waitForFunction(()=>!isPhotoMotionBusy());assert.equal(await web.evaluate(()=>modalId),1);await web.locator('#detail-results').click();await settled();assert.equal(await web.locator('#best-start').count(),0);
 // First-use animated guide is a rehearsal, with skip and no real actions.
 const guidePage=await browser.newPage({viewport:{width:390,height:844}});guidePage.on('pageerror',e=>errors.push(e.message));await guidePage.addInitScript(()=>{window.guideHaptics=0;window.PhotoPickAndroid={setPhotoFocus(){},ratingHaptic(){window.guideHaptics++;}};});await guidePage.goto(`http://127.0.0.1:${server.address().port}/`);await guidePage.locator('#demo').click();await guidePage.locator('#select-all-dates').click();await guidePage.locator('#start-group-review').click();await guidePage.evaluate(()=>openPhoto(0));await guidePage.locator('.review-motion-guide').waitFor();
 assert.equal(await guidePage.evaluate(()=>photoGuideActive),true);assert.equal(await guidePage.evaluate(()=>previewRate(0,'best')),false);assert.equal(await guidePage.evaluate(()=>previewNavigate(1)),false);
 assert.equal(await guidePage.locator('.guide-skip').isVisible(),true);assert.equal(await guidePage.locator('.guide-photo').evaluate(i=>i.getAnimations().length),1);await guidePage.locator('.guide-photo').evaluate(i=>{i.getAnimations()[0].pause();i.getAnimations()[0].currentTime=1000;});await guidePage.screenshot({path:path.join(output,'first-use-next-guide.png')});
 await guidePage.locator('.guide-next').click();assert.equal(await guidePage.locator('.review-motion-guide').getAttribute('data-step'),'1');assert.match(await guidePage.locator('.guide-method').innerText(),/이전 사진/);
 await guidePage.locator('.guide-next').click();assert.equal(await guidePage.locator('.review-motion-guide').getAttribute('data-step'),'2');assert.match(await guidePage.locator('.guide-method').innerText(),/♡ 버튼/);assert.equal(await guidePage.evaluate(()=>modalId),0);assert.deepEqual(await guidePage.evaluate(()=>state.ratings),{});assert.equal(await guidePage.evaluate(()=>guideHaptics),0);
 await guidePage.screenshot({path:path.join(output,'first-use-good-guide.png')});await guidePage.locator('.guide-skip').click();assert.equal(await guidePage.locator('.review-motion-guide').count(),0);assert.equal(await guidePage.evaluate(()=>photoGuideActive),false);assert.equal(await guidePage.locator('.photo-stage').evaluate(i=>i.inert),false);await guidePage.waitForFunction(()=>!isPhotoMotionBusy());await guidePage.locator('[data-rate=keep]').click();await guidePage.waitForFunction(()=>!isPhotoMotionBusy());assert.equal(await guidePage.evaluate(()=>modalId),1);assert.equal(await guidePage.locator('.review-motion-guide').count(),0);
 await guidePage.evaluate(()=>{localStorage.removeItem('photopick-review-motion-guide-v1');render();openPhoto(0);});await guidePage.locator('.review-motion-guide').waitFor();await guidePage.setViewportSize({width:320,height:568});const controls=await guidePage.locator('.guide-skip,.guide-next').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}}));assert(controls.every(r=>r.x>=0&&r.y>=0&&r.x+r.w<=320&&r.y+r.h<=568));await guidePage.screenshot({path:path.join(output,'guide-320.png')});await guidePage.keyboard.press('Escape');assert.equal(await guidePage.locator('.review-motion-guide').count(),0);
 await guidePage.emulateMedia({reducedMotion:'reduce'});await guidePage.evaluate(()=>{localStorage.removeItem('photopick-review-motion-guide-v1');render();openPhoto(0);});assert.equal(await guidePage.locator('.guide-photo').evaluate(i=>i.getAnimations().length),0);await guidePage.locator('.guide-next').click();await guidePage.locator('.guide-next').click();await guidePage.locator('.guide-next').click();assert.equal(await guidePage.locator('.review-motion-guide').count(),0);assert.equal(await guidePage.evaluate(()=>localStorage.getItem('photopick-review-motion-guide-v1')),'1');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({pass:true,apkExtracted:!!process.env.PHOTO_PICK_APK_WWW,checks:['downward drag shrinks photo and rates good','drag shrinks photo both horizontal directions','animated guide never rates or navigates','skip and start dismiss guide','guide once per installation','dual drag/button explanation','guide fits 320px','reduced motion static guide','fixed hit area and capsule during press','only chosen icon compresses','press cancellation does not rate','button recovery linked to photo arrival','cover to contain blurred crossfade','linked effects clean up','reduced motion skips effects','bottom-center pivot','signed 22.5 degree exits','release pose continuity both directions','cancel returns to rest','fully offscreen terminal corners','cover filled back cards','three-card drawer stack','blur retained behind front','buttons above departing photo','16px glass blur','no late navigation after interruption','loading failure preserves rating and photo','all ratings auto-advance and skip rated','double click guarded','unrating stays','wrap to earlier unrated','completion results','date scope','swipe next unrated and best preserved','pinch release retains pose','pan cannot rate or navigate','re-pinch no jump','cancel retains pose and clears active pointers','touch double tap toggles fit/zoom','fit button','stationary zoom permits rating and navigation','next photo resets fit','blur cleanup','56px controls fit 320/390/430','d14 final-selection migration','no bestshot entry or script','native download grade selection','local web regression'],physicalDevice:false},null,2));console.log('PASS: d21 persistent zoom, pan, re-pinch, double tap, fit and rating/navigation');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
