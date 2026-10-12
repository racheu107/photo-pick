process.env.PLAYWRIGHT_BROWSERS_PATH='D:/CodexBuild/PhotoPick-design-d3-20261009/browser-tools';
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const dir='D:/CodexBuild/PhotoPick-design-d4-20261009/verification-d11';fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/brand-opening.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('failed?220:1350','failed?220:6000')});});
  await page.goto('http://127.0.0.1:8771/',{waitUntil:'domcontentloaded'});await page.waitForSelector('.is-playing');
  const timings=await page.evaluate(()=>Object.fromEntries(document.querySelector('#brand-opening').getAnimations({subtree:true}).map(a=>[a.animationName,{delay:a.effect.getTiming().delay,duration:a.effect.getTiming().duration,easing:a.effect.getTiming().easing}])));
  assert.deepEqual(timings['opening-appear'],{delay:100,duration:650,easing:'linear'});
  assert.equal(timings['opening-name'].delay,750);assert.equal(timings['opening-name'].duration,250);assert.equal(timings['opening-copy'].delay,800);assert.equal(timings['opening-copy'].duration,200);assert.equal(timings['opening-light'].delay,350);
  const complete=await page.evaluate(()=>{document.querySelector('#brand-opening').getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=1000;});const brand=document.querySelector('.opening-brand');return {brand:getComputedStyle(brand).opacity,copy:getComputedStyle(brand.querySelector('p')).opacity};});assert.equal(complete.brand,'1');assert.equal(complete.copy,'1');await page.screenshot({path:dir+'/complete-brand.png'});
  await page.evaluate(()=>document.addEventListener('photopick-opening-complete',()=>{const m=document.querySelector('main');window.homeFade={opacity:Number(getComputedStyle(m).opacity),duration:m.getAnimations()[0]?.effect.getTiming().duration};},{once:true}));
  await page.waitForSelector('#brand-opening',{state:'detached'});const home=await page.evaluate(()=>homeFade);assert(home.opacity<.1);assert.equal(home.duration,280);await page.waitForTimeout(350);assert.equal(await page.locator('main').evaluate(e=>getComputedStyle(e).opacity),'1');assert.equal(await page.locator('main').evaluate(e=>e.inert),false);
  await page.locator('#demo').click();assert.equal(await page.locator('#brand-opening').count(),0);await page.unroute('**/brand-opening.js');await page.reload({waitUntil:'domcontentloaded'});await page.locator('.opening-skip').click();await page.waitForSelector('#brand-opening',{state:'detached'});assert.deepEqual(errors,[]);await context.close();
  const reduced=await browser.newContext({reducedMotion:'reduce'}),rp=await reduced.newPage();await rp.goto('http://127.0.0.1:8771/',{waitUntil:'domcontentloaded'});await rp.waitForSelector('.is-static');assert.equal(await rp.locator('.opening-camera').evaluate(e=>getComputedStyle(e).opacity),'1');await rp.waitForSelector('#brand-opening',{state:'detached'});await reduced.close();
  const recording=await browser.newContext({viewport:{width:390,height:844},recordVideo:{dir,size:{width:390,height:844}}}),vp=await recording.newPage();await vp.goto('http://127.0.0.1:8771/');await vp.waitForSelector('#brand-opening',{state:'detached'});await vp.waitForTimeout(500);const video=vp.video();await recording.close();await video.saveAs(dir+'/opening-b-balanced-preview.webm');
  fs.writeFileSync(dir+'/opening-result.json',JSON.stringify({pass:true,timings,completeBrand:complete,homeFade:home,cases:['agreed delays and durations','brand and copy opaque at 1000ms','home fade 280ms','skip','main restored','no replay on navigation','reduced static'],jsErrors:errors},null,2));console.log('PASS: agreed timing and readable final composition');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
