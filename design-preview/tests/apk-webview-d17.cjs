const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
 try{
 const page=browser.contexts()[0].pages()[0],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.locator('#demo').click();await page.locator('#select-all-dates').click();await page.locator('#start-group-review').click();
 await page.evaluate(()=>{state.ratings={1:'keep'};state.screen='pick';render();openPhoto(0)});await page.waitForFunction(()=>!isPhotoMotionBusy());
 await page.waitForFunction(()=>[...document.querySelectorAll('.photo-back-card')].filter(i=>!i.hidden).length===3);
 assert.equal(await page.evaluate(()=>getToolbarMaterial()),'glass');
 assert.equal(await page.locator('.photo-back-card').first().evaluate(i=>getComputedStyle(i).filter),'blur(2px)');
 const session=await page.context().newCDPSession(page),box=await page.locator('.photo-front-card').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
 const pt=(id,x,y)=>({id,x,y,radiusX:1,radiusY:1}),pose=()=>page.locator('.photo-front-card').evaluate(i=>{const m=new DOMMatrixReadOnly(getComputedStyle(i).transform);return {scale:m.a,x:m.m41,y:m.m42}});
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt(1,cx-20,cy),pt(2,cx+20,cy)]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pt(1,cx-40,cy),pt(2,cx+40,cy)]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(()=>!isPhotoMotionBusy());
 assert(Math.abs((await pose()).scale-2)<.01);assert(await page.locator('.zoom-reset').isVisible());
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt(1,cx,cy)]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pt(1,cx+15,cy+20)]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.evaluate(()=>modalId),0);assert.equal(await page.evaluate(()=>state.ratings[0]||null),null);
 const dir=path.resolve(__dirname,'../verification/d17');await page.screenshot({path:path.join(dir,'actual-apk-zoom-retained.png')});
 await page.evaluate(()=>{window.testMotionCaptured=false;const observer=new MutationObserver(()=>{const node=document.querySelector('.photo-departure'),a=node?.getAnimations()[0];if(a){a.pause();a.currentTime=140;window.testMotionCaptured=true;observer.disconnect();}});observer.observe(document.querySelector('#layer'),{subtree:true,childList:true});});
 await page.locator('[data-rate=best]').click();await page.waitForFunction(()=>window.testMotionCaptured);
 const glass=await page.evaluate(()=>{const b=document.querySelector('[data-rate=best]'),r=b.getBoundingClientRect(),bar=b.closest('.overlay');return {hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('button')===b,blur:getComputedStyle(bar).backdropFilter};});assert(glass.hit);assert.match(glass.blur,/blur\(16px\)/);
 await page.screenshot({path:path.join(dir,'actual-apk-absorb-glass.png')});
 await page.locator('.photo-departure').evaluate(i=>i.getAnimations()[0].play());await page.waitForFunction(()=>!isPhotoMotionBusy());assert.equal(await page.evaluate(()=>modalId),2);assert.equal(await page.evaluate(()=>state.ratings[0]),'best');assert(Math.abs((await pose()).scale-1)<.01);
 const tapBox=await page.locator('.photo-front-card').boundingBox(),tapX=tapBox.x+tapBox.width/2,tapY=tapBox.y+tapBox.height/2,tapTime=Date.now()/1000;
 for(let i=0;i<2;i++){await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt(1,tapX,tapY)],timestamp:tapTime+i*.12});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[],timestamp:tapTime+i*.12+.02});}
 assert(Math.abs((await pose()).scale-2)<.01,JSON.stringify(await pose()));await page.locator('.zoom-reset').click();assert(Math.abs((await pose()).scale-1)<.01);
 await page.locator('#detail-results').click();assert.equal(await page.locator('#best-start').count(),0);assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(dir,'actual-apk-webview.json'),JSON.stringify({pass:true,actualApk:'PhotoPick-DesignPreview-0.2.23-d17.apk',environment:'Android API 37 emulator WebView',checks:['d16 to d17 update without uninstall','three-card drawer stack','blur behind retained','photo absorbed below glass controls','16px backdrop blur','pinch retains on release','pan no rating/navigation','stationary zoom rating enabled','next unrated starts fit','touch double tap','fit button','no final-selection'],physicalDevice:false},null,2));console.log('PASS: actual Android drawer stack, glass blur, absorption, zoom and rating');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
