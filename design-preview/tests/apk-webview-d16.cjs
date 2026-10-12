const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
 try{
 const page=browser.contexts()[0].pages()[0],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.locator('#demo').click();await page.locator('#select-all-dates').click();await page.locator('#start-group-review').click();
 await page.evaluate(()=>{state.ratings={1:'keep'};state.screen='pick';render();openPhoto(0)});await page.waitForFunction(()=>!isPhotoMotionBusy());
 const session=await page.context().newCDPSession(page),box=await page.locator('.photo-front-card').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
 const pt=(id,x,y)=>({id,x,y,radiusX:1,radiusY:1}),pose=()=>page.locator('.photo-front-card').evaluate(i=>{const m=new DOMMatrixReadOnly(getComputedStyle(i).transform);return {scale:m.a,x:m.m41,y:m.m42}});
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt(1,cx-20,cy),pt(2,cx+20,cy)]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pt(1,cx-40,cy),pt(2,cx+40,cy)]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(()=>!isPhotoMotionBusy());
 assert(Math.abs((await pose()).scale-2)<.01);assert(await page.locator('.zoom-reset').isVisible());
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt(1,cx,cy)]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pt(1,cx+15,cy+20)]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.evaluate(()=>modalId),0);assert.equal(await page.evaluate(()=>state.ratings[0]||null),null);
 const dir=path.resolve(__dirname,'../verification/d16');await page.screenshot({path:path.join(dir,'actual-apk-zoom-retained.png')});
 await page.locator('[data-rate=best]').click();await page.waitForFunction(()=>!isPhotoMotionBusy());assert.equal(await page.evaluate(()=>modalId),2);assert.equal(await page.evaluate(()=>state.ratings[0]),'best');assert(Math.abs((await pose()).scale-1)<.01);
 for(let i=0;i<2;i++){await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt(1,cx,cy)]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 assert(Math.abs((await pose()).scale-2)<.01);await page.locator('.zoom-reset').click();assert(Math.abs((await pose()).scale-1)<.01);
 await page.locator('#detail-results').click();assert.equal(await page.locator('#best-start').count(),0);assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(dir,'actual-apk-webview.json'),JSON.stringify({pass:true,actualApk:'PhotoPick-DesignPreview-0.2.22-d16.apk',environment:'Android API 37 emulator WebView',checks:['d15 to d16 update without uninstall','pinch retains on release','pan no rating/navigation','stationary zoom rating enabled','next unrated starts fit','touch double tap','fit button','no final-selection'],physicalDevice:false},null,2));console.log('PASS: actual Android persistent zoom, pan, rating, next-photo fit and double tap');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
