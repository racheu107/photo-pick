process.env.PLAYWRIGHT_BROWSERS_PATH='D:/CodexBuild/PhotoPick-design-d3-20261009/browser-tools';
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const out='D:/CodexBuild/PhotoPick-design-d4-20261009/verification';fs.mkdirSync(out,{recursive:true});
let browser;
(async()=>{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const context=await browser.newContext({viewport:{width:390,height:844},recordVideo:{dir:out,size:{width:390,height:844}}});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8771/',{waitUntil:'networkidle'});
 await page.locator('#demo').click();await page.locator('#select-all-dates').click();await page.locator('#start-group-review').click();await page.evaluate(()=>openPhoto(1));
 const settle=()=>page.waitForFunction(()=>!isPhotoMotionBusy());await settle();
 assert.equal(await page.locator('.gesture-guide').count(),1);
 assert.equal(await page.locator('.photo-viewport img.photo-front-card:not(.photo-transition-old)').evaluate(i=>i.getAnimations().length),0);
 const immediate=await page.evaluate(()=>{
   const best=document.querySelector('[data-rate="best"]'),good=document.querySelector('[data-rate="keep"]');
   best.click();const first=state.ratings[1];best.click();const second=state.ratings[1];good.click();
   return {first,second,third:state.ratings[1]||null,busy:isPhotoMotionBusy()};
 });
 assert.deepEqual(immediate,{first:'best',second:'keep',third:null,busy:false});assert.equal(await page.locator('.gesture-guide').count(),0);
 const frame=()=>page.evaluate(()=>new Promise(requestAnimationFrame));
 const pose=()=>page.locator('.photo-viewport img.photo-front-card:not(.photo-transition-old)').evaluate(i=>({x:new DOMMatrixReadOnly(getComputedStyle(i).transform).m41,y:new DOMMatrixReadOnly(getComputedStyle(i).transform).m42}));
 const start=async()=>{const b=await page.locator('.card').boundingBox();const point={x:b.x+b.width*.5,y:b.y+b.height*.4};await page.mouse.move(point.x,point.y);await page.mouse.down();return point;};
 let point=await start();await page.mouse.move(point.x-110,point.y,{steps:10});await frame();const dragged=await pose();assert(dragged.x < -55 && dragged.x > -110,JSON.stringify(dragged));
 await page.screenshot({path:out+'/drag-follow.png'});
 await page.mouse.move(point.x,point.y,{steps:8});await page.mouse.up();await settle();assert.equal(await page.evaluate(()=>modalId),1);assert.equal(await page.evaluate(()=>state.ratings[1]),undefined);
 // Cancelled motion can be grabbed again without jumping to zero.
 point=await start();await page.mouse.move(point.x-40,point.y,{steps:4});await frame();await page.mouse.up();await page.waitForTimeout(25);
 const beforeGrab=await pose();await page.mouse.move(point.x,point.y);await page.mouse.down();const grabbed=await pose();assert(Math.abs(grabbed.x-beforeGrab.x)<12);
 await page.mouse.up();await settle();assert.equal(await page.evaluate(()=>modalId),1);
 // The released pose stays intact while the actual target image is delayed.
 const oldUrl=await page.evaluate(()=>sourcePhotos[2].url);
 const bytes=fs.readFileSync('D:/CodexBuild/PhotoPick-design-d4-20261009/android-app/app/src/main/assets/www/assets/example-03.png');
 await page.route('**/motion-delayed.png',async route=>{await new Promise(r=>setTimeout(r,450));await route.fulfill({body:bytes,contentType:'image/png'});});
 await page.evaluate(()=>{sourcePhotos[2].url='motion-delayed.png';});
 point=await start();await page.mouse.move(point.x-120,point.y,{steps:10});await frame();const releasePose=await pose();
 await page.mouse.up();await frame();const held=await pose();assert.equal(await page.evaluate(()=>modalId),1);assert(Math.abs(held.x-releasePose.x)<2);
 await page.evaluate(()=>{window.releaseFrames=[];const started=performance.now();const sample=()=>{const old=document.querySelector('.photo-transition-old'),current=document.querySelector('.photo-viewport img.photo-front-card:not(.photo-transition-old)');releaseFrames.push({time:performance.now()-started,id:modalId,oldX:old?new DOMMatrixReadOnly(getComputedStyle(old).transform).m41:null,incomingOpacity:current?Number(getComputedStyle(current).opacity):null});if(performance.now()-started<1200)requestAnimationFrame(sample);};requestAnimationFrame(sample);});
 await settle();await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>modalId),2);
 const samples=await page.evaluate(()=>releaseFrames);assert(samples.some(s=>s.oldX!==null));assert(samples.filter(s=>s.oldX!==null).every(s=>s.oldX<=releasePose.x+2));assert(samples.every(s=>s.incomingOpacity===null||s.incomingOpacity>=.99));
 await page.evaluate(url=>{sourcePhotos[2].url=url;},oldUrl);
 await page.evaluate(()=>openPhoto(0));await settle();point=await start();await page.mouse.move(point.x+130,point.y,{steps:8});await frame();const edge=await pose();assert(edge.x>0&&edge.x<=12);assert.equal(await page.locator('.gesture-feedback').evaluate(i=>getComputedStyle(i).opacity),'0');await page.mouse.up();await settle();assert.equal(await page.evaluate(()=>modalId),0);
 await page.evaluate(()=>openPhoto(1));await settle();await page.locator('[data-rate="best"]').click();
 const ratingsBefore=await page.evaluate(()=>JSON.stringify({ratings:state.ratings,index:state.index,history:state.history}));
 for(const material of ['matte','glass']){
   await page.evaluate(v=>setToolbarMaterial(v),material);assert.equal(await page.evaluate(()=>getToolbarMaterial()),material);
   assert.equal(await page.evaluate(()=>JSON.stringify({ratings:state.ratings,index:state.index,history:state.history})),ratingsBefore);
   const surfaces=await page.evaluate(()=>({group:getComputedStyle(document.querySelector('.preview-rating-group')).backdropFilter,undo:getComputedStyle(document.querySelector('#focus-undo')).backdropFilter,good:getComputedStyle(document.querySelector('[data-rate="keep"]')).backdropFilter,best:getComputedStyle(document.querySelector('[data-rate="best"]')).backdropFilter,active:getComputedStyle(document.querySelector('[data-rate="keep"]')).backgroundColor,photo:getComputedStyle(document.querySelector('.photo-viewport img.photo-front-card:not(.photo-transition-old)')).filter,rootAria:document.documentElement.getAttribute('aria-pressed')}));
   assert.equal(surfaces.photo,'none');assert.equal(surfaces.good,'none');assert.equal(surfaces.best,'none');assert.equal(surfaces.active,'rgb(220, 226, 234)');assert.equal(surfaces.rootAria,null);
   assert.equal(surfaces.group,material==='glass'?'blur(10px)':'none');assert.equal(surfaces.undo,material==='glass'?'blur(10px)':'none');
   await page.screenshot({path:out+`/material-${material}.png`});
   await page.setViewportSize({width:360,height:640});await page.screenshot({path:out+`/material-${material}-360.png`});await page.setViewportSize({width:390,height:844});
 }
 await page.locator('#close-detail').click();await page.locator('#screen-menu').click();assert.equal(await page.locator('.toolbar-material-options button').count(),2);
 const beforeMenu=await page.evaluate(()=>JSON.stringify(state));await page.locator('.toolbar-material-options [data-toolbar-material="matte"]').click();assert.equal(await page.evaluate(()=>JSON.stringify(state)),beforeMenu);await page.locator('.toolbar-material-options [data-toolbar-material="glass"]').click();
 assert.equal(await page.locator('.toolbar-material-options [data-toolbar-material="glass"]').getAttribute('aria-pressed'),'true');
 await page.screenshot({path:out+'/material-menu.png'});
 await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>getToolbarMaterial()),'glass');await page.locator('#resume').click();await page.evaluate(()=>openPhoto(1));await settle();assert.equal(await page.evaluate(()=>state.ratings[1]),'best');
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});
 const transparentReduced=await page.evaluate(()=>matchMedia('(prefers-reduced-transparency: reduce)').matches);
 if(transparentReduced)assert.equal(await page.locator('.preview-rating-group').evaluate(i=>getComputedStyle(i).backdropFilter),'none');
 await cdp.send('Emulation.setEmulatedMedia',{features:[]});
 assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/motion-material-result.json',JSON.stringify({pass:true,dragPose:dragged,releasePose,heldPose:held,edgePose:edge,releaseFrames:samples,reducedTransparencyMatched:transparentReduced,checks:['immediate rating without animation lock','no photo onboarding motion','first button dismisses guide','strong continuous tracking','cancel and regrab continuity','release pose held during delayed image','no outgoing origin jump','incoming opacity stable','boundary resistance with no action','matte/glass no rating/history change','glass limited to tool surfaces','active states opaque','style menu and reload preference'],physicalDevice:false,jsErrors:errors},null,2));
 const video=page.video();await context.close();await video.saveAs(out+'/motion-comparison.webm');await browser.close();console.log('PASS: motion continuity, material switch, persistence and accessibility fallback.');
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
