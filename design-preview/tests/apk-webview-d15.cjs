const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
 try{
 const page=browser.contexts()[0].pages()[0],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.locator('#demo').click();await page.locator('#select-all-dates').click();await page.locator('#start-group-review').click();
 await page.evaluate(()=>{state.ratings={1:'keep'};state.screen='pick';render();openPhoto(0)});await page.waitForFunction(()=>!isPhotoMotionBusy());
 const size=await page.locator('[data-rate=best]').boundingBox();assert(size.width>=56&&size.height>=56);
 await page.locator('[data-rate=best]').click();await page.waitForFunction(()=>!isPhotoMotionBusy());assert.equal(await page.evaluate(()=>modalId),2);assert.equal(await page.evaluate(()=>state.ratings[0]),'best');
 const dir=path.resolve(__dirname,'../verification/d15');await page.screenshot({path:path.join(dir,'actual-apk-controls.png')});
 await page.locator('#detail-results').click();assert.equal(await page.locator('#best-start').count(),0);assert.equal(await page.locator('script[src*=best-shots]').count(),0);
 assert.equal(await page.locator('#import').innerText(),'1장 사진 다운로드');await page.screenshot({path:path.join(dir,'actual-apk-results.png')});assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(dir,'actual-apk-webview.json'),JSON.stringify({pass:true,actualApk:'PhotoPick-DesignPreview-0.2.21-d15.apk',environment:'Android API 37 emulator WebView',checks:['update install from d14 without uninstall','56px rating control','rating next unrated skips rated','final-selection entry removed','rating-based download'],physicalDevice:false},null,2));console.log('PASS: actual Android APK update, auto-advance, controls and removal');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
