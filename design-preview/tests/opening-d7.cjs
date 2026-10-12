process.env.PLAYWRIGHT_BROWSERS_PATH='D:/CodexBuild/PhotoPick-design-d3-20261009/browser-tools';
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const dir='D:/CodexBuild/PhotoPick-design-d4-20261009/verification-d7';fs.mkdirSync(dir,{recursive:true});
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const ctx=await b.newContext({viewport:{width:390,height:844},recordVideo:{dir,size:{width:390,height:844}}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/brand-opening.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('failed?220:1250','failed?220:5000')})});await p.goto('http://127.0.0.1:8771/',{waitUntil:'domcontentloaded'});await p.waitForSelector('.brand-opening.is-playing');
 const pose=()=>p.evaluate(()=>{const c=document.querySelector('.opening-camera');return {matrix:getComputedStyle(c).transform,logo:Number(getComputedStyle(document.querySelector('.opening-brand')).opacity),mainInert:document.querySelector('main').inert}});
 await p.waitForSelector('.has-3d');const startYaw=Number(await p.locator('canvas.opening-camera-canvas').getAttribute('data-yaw'));const initial=await pose();assert(initial.mainInert);
 for(const [time,name] of [[120,'opening-lens'],[450,'opening-light'],[1120,'opening-logo']]){
  await p.evaluate(time=>{document.querySelector('#brand-opening').getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=time;});},time);await p.screenshot({path:dir+'/'+name+'.png'});
 }
 const end=await pose();assert(end.logo>.8);const lastYaw=Number(await p.locator('canvas.opening-camera-canvas').getAttribute('data-yaw'));assert(Number.isFinite(startYaw)&&Number.isFinite(lastYaw));assert(lastYaw<startYaw-.005);assert.notEqual(initial.matrix,end.matrix);
 await p.waitForSelector('#brand-opening',{state:'detached'});assert.equal(await p.locator('main').getAttribute('aria-hidden'),null);assert.equal(await p.locator('main').evaluate(e=>e.inert),false);
 await p.locator('#demo').click();assert.equal(await p.locator('#brand-opening').count(),0);
 await p.unroute('**/brand-opening.js');await p.reload({waitUntil:'domcontentloaded'});await p.waitForSelector('#brand-opening');await p.locator('.opening-skip').click();await p.waitForSelector('#brand-opening',{state:'detached'});assert(await p.locator('main').isVisible());
 await p.reload({waitUntil:'domcontentloaded'});await p.keyboard.press('Escape');await p.waitForSelector('#brand-opening',{state:'detached'});
 assert.deepEqual(errors,[]);await ctx.close();
 const rm=await b.newContext({viewport:{width:360,height:640},reducedMotion:'reduce'}),rp=await rm.newPage();await rp.goto('http://127.0.0.1:8771/',{waitUntil:'domcontentloaded'});await rp.waitForSelector('.brand-opening.is-static');assert.equal(await rp.locator('.opening-camera').evaluate(e=>getComputedStyle(e).animationName),'none');await rp.screenshot({path:dir+'/opening-reduced.png'});await rp.waitForSelector('#brand-opening',{state:'detached'});await rm.close();
 for(const failure of ['error','slow']){const fc=await b.newContext({viewport:{width:390,height:844}}),fp=await fc.newPage();await fp.route('**/opening-camera-b.png',async r=>{if(failure==='error')await r.abort();else{await new Promise(resolve=>setTimeout(resolve,1200));await r.continue();}});await fp.goto('http://127.0.0.1:8771/',{waitUntil:'domcontentloaded'});await fp.waitForSelector('#brand-opening',{state:'detached',timeout:6000});await fp.waitForTimeout(800);assert.equal(await fp.locator('#brand-opening').count(),0);assert.equal(await fp.locator('main').evaluate(e=>e.inert),false);await fc.close();}
 const noGL=await b.newContext();const np=await noGL.newPage();await np.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:original.call(this,type,...args)}});await np.goto('http://127.0.0.1:8771/');assert.equal(await np.locator('.has-3d').count(),0);await np.waitForSelector('#brand-opening',{state:'detached'});await noGL.close();
 const videoCtx=await b.newContext({viewport:{width:390,height:844},recordVideo:{dir,size:{width:390,height:844}}}),vp=await videoCtx.newPage();await vp.goto('http://127.0.0.1:8771/');await vp.waitForTimeout(800);const video=vp.video();await videoCtx.close();await video.saveAs(dir+'/opening-b-3d-preview.webm');
 fs.writeFileSync(dir+'/opening-result.json',JSON.stringify({pass:true,cases:['real camera geometry and yaw change','no WebGL falls back to image','lens to full camera and logo','natural auto exit','tap skip','escape skip','main input restored','no replay on in-app navigation','reduced static','failed asset fallback','late image does not resurrect opening'],jsErrors:errors},null,2));console.log('PASS: B opening and launch fallbacks');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});



