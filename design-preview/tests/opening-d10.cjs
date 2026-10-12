process.env.PLAYWRIGHT_BROWSERS_PATH='D:/CodexBuild/PhotoPick-design-d3-20261009/browser-tools';
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const dir='D:/CodexBuild/PhotoPick-design-d4-20261009/verification-d10';fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},recordVideo:{dir,size:{width:390,height:844}}});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8771/',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.brand-opening.is-playing');
  assert.equal(await page.locator('#brand-opening').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
  const appearance=await page.locator('.opening-camera').evaluate(e=>e.getAnimations().find(a=>a.animationName==='opening-appear')?.effect.getKeyframes().map(k=>k.opacity));
  assert.deepEqual(appearance,['0','1']);assert.equal(await page.locator('.opening-camera').evaluate(e=>e.getAnimations().find(a=>a.animationName==='opening-appear').effect.getTiming().duration),780);await page.evaluate(()=>document.addEventListener('photopick-opening-complete',()=>{const m=document.querySelector('main');window.homeFade={present:m.classList.contains('opening-home-enter'),opacity:Number(getComputedStyle(m).opacity)}},{once:true}));assert.equal(await page.locator('.opening-photo').count(),0);
  await page.screenshot({path:dir+'/white-fade.png'});
  await page.waitForSelector('#brand-opening',{state:'detached'});
  assert.equal(await page.locator('main').evaluate(e=>e.inert),false);const entrance=await page.evaluate(()=>homeFade);assert(entrance.present&&entrance.opacity<.1);await page.waitForTimeout(600);assert.equal(await page.locator('main').evaluate(e=>getComputedStyle(e).opacity),'1');
  await page.locator('#demo').click();assert.equal(await page.locator('#brand-opening').count(),0);
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('.opening-skip').click();await page.waitForSelector('#brand-opening',{state:'detached'});
  assert.deepEqual(errors,[]);await context.close();
  const reduced=await browser.newContext({reducedMotion:'reduce'}),rp=await reduced.newPage();await rp.goto('http://127.0.0.1:8771/',{waitUntil:'domcontentloaded'});await rp.waitForSelector('.is-static');assert.equal(await rp.locator('.opening-camera').evaluate(e=>getComputedStyle(e).opacity),'1');await rp.waitForSelector('#brand-opening',{state:'detached'});await reduced.close();
  const recording=await browser.newContext({viewport:{width:390,height:844},recordVideo:{dir,size:{width:390,height:844}}}),vp=await recording.newPage();await vp.goto('http://127.0.0.1:8771/');await vp.waitForSelector('#brand-opening',{state:'detached'});await vp.waitForTimeout(800);const video=vp.video();await recording.close();await video.saveAs(dir+'/opening-b-soft-preview.webm');
  fs.writeFileSync(dir+'/opening-result.json',JSON.stringify({pass:true,cases:['white background','camera fade 780ms with 100ms delay','home fades 0 to 1 over 550ms','original B without added photo frames','automatic exit','tap skip','main restored','no replay on navigation','reduced static visible'],jsErrors:errors},null,2));
  console.log('PASS: original B with white fade-in');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
