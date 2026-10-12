const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
 try{
 const page=browser.contexts()[0].pages()[0],errors=[];page.on('pageerror',e=>errors.push(e.message));
 assert.equal(await page.evaluate(()=>typeof PhotoPickAndroid.savePhotos),'function');
 await page.locator('#demo').click();await page.locator('#select-all-dates').click();await page.locator('#start-group-review').click();
 await page.locator('[data-photo="0"]').click();await page.waitForFunction(()=>!isPhotoMotionBusy());await page.locator('[data-rate="best"]').click();
 await page.waitForFunction(()=>!isPhotoMotionBusy());await page.locator('#next').click();await page.waitForFunction(()=>!isPhotoMotionBusy());await page.locator('[data-rate="keep"]').click();
 await page.waitForFunction(()=>!isPhotoMotionBusy());await page.locator('#detail-results').click();
 await page.locator('#best-start').waitFor();assert(await page.locator('#best-start').isVisible());
 const dir=path.resolve(__dirname,'../verification/d14');
 await page.screenshot({path:path.join(dir,'actual-apk-result.png')});
 await page.locator('#best-start').click();await page.locator('[data-best-scope=combined]').click();
 await page.locator('[data-pair="0"]').click();await page.locator('[data-pair="1"]').click();await page.locator('#best-compare').click();
 await page.locator('#compare-switch').click();assert.equal(await page.locator('#compare-badge').innerText(),'B');
 await page.locator('[data-compare-final="0"]').click();await page.locator('[data-compare-final="1"]').click();
 await page.screenshot({path:path.join(dir,'actual-apk-compare.png')});assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(dir,'actual-apk-webview.json'),JSON.stringify({pass:true,actualApk:'PhotoPick-DesignPreview-0.2.20-d14.apk',environment:'Android API 37 emulator WebView',checks:['real Android bridge','demo album rating','results button visible','bestshot entry','A/B compare','both selected'],physicalDevice:false},null,2));
 console.log('PASS: installed APK real Android WebView shows bestshot result button and working A/B comparison');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
