const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto('http://127.0.0.1:8767/',{waitUntil:'networkidle'});
 await page.locator('#demo').click();await page.locator('#select-all-dates').click();await page.locator('#start-group-review').click();
 const results=[];
 for(const [w,h] of [[800,1200],[1200,800],[1000,1000]])for(const fraction of [.25,.75]){
 await page.evaluate(({w,h})=>{sourcePhotos[0].url='data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#657583"/></svg>`);openPhoto(0);},{w,h});
 await page.waitForFunction(()=>!isPhotoMotionBusy());await page.locator('.photo-front-card').evaluate(i=>i.decode());
 const result=await page.evaluate(fraction=>{
 const i=document.querySelector('.photo-front-card'),el=i.closest('.card');el.setPointerCapture=()=>{};
 const b=i.getBoundingClientRect(),cx=b.left+b.width*.5,cy=b.top+b.height*fraction,half=Math.min(35,b.width*.15,b.height*.12);
 const event=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,pointerType:'touch',target:el,timeStamp:performance.now()});
 el.onpointerdown(event(1,cx-half,cy));el.onpointerdown(event(2,cx+half,cy));
 el.onpointermove(event(1,cx-half*2,cy));el.onpointermove(event(2,cx+half*2,cy));
 const m=new DOMMatrixReadOnly(getComputedStyle(i).transform),o=getComputedStyle(i).transformOrigin.split(' ').map(parseFloat);
 const actualX=b.left+o[0]+m.m41+m.a*(cx-b.left-o[0]),actualY=b.top+o[1]+m.m42+m.d*(cy-b.top-o[1]);
 const first={scale:m.a,dx:actualX-cx,dy:actualY-cy};
 el.onpointerup(event(2,cx+half*2,cy));
 const before=i.style.transform;el.onpointerdown(event(3,cx+half*2,cy));const after=i.style.transform;
 el.onpointerup(event(3,cx+half*2,cy));el.onpointerup(event(1,cx-half*2,cy));
 return {first,before,after,id:modalId,rating:state.ratings[0]||null};
 },fraction);
 results.push({w,h,fraction,...result});
 assert(Math.abs(result.first.dx)<1&&Math.abs(result.first.dy)<1,JSON.stringify(result));assert.equal(result.first.scale,2);assert.equal(result.before,result.after);assert.equal(result.id,0);assert.equal(result.rating,null);
 await page.waitForFunction(()=>!isPhotoMotionBusy());
 }
 // Real browser touch dispatch verifies capture and pointer lifecycles as well.
 const session=await page.context().newCDPSession(page);
 for(const fraction of [.25,.75]){
 await page.evaluate(()=>openPhoto(0));await page.waitForFunction(()=>!isPhotoMotionBusy());
 const b=await page.locator('.photo-front-card').boundingBox(),cx=b.x+b.width/2,cy=b.y+b.height*fraction;
 const p=(id,x,y)=>({id,x,y,radiusX:1,radiusY:1});
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p(1,cx-30,cy)]});
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p(1,cx-30,cy),p(2,cx+30,cy)]});
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p(1,cx-60,cy),p(2,cx+60,cy)]});
 const pose=await page.locator('.photo-front-card').evaluate((i,{b,cx,cy})=>{
 const m=new DOMMatrixReadOnly(getComputedStyle(i).transform),o=getComputedStyle(i).transformOrigin.split(' ').map(parseFloat);
 return {scale:m.a,x:b.x+o[0]+m.m41+m.a*(cx-b.x-o[0]),y:b.y+o[1]+m.m42+m.d*(cy-b.y-o[1])};
 },{b,cx,cy});assert(Math.abs(pose.x-cx)<1&&Math.abs(pose.y-cy)<1);assert.equal(pose.scale,2);
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p(1,cx-40,cy+20),p(2,cx+80,cy+20)]});
 await page.waitForTimeout(100);
 const pan=await page.locator('.photo-front-card').evaluate(i=>{const m=new DOMMatrixReadOnly(getComputedStyle(i).transform);return {x:m.m41,y:m.m42};});
 assert(Math.abs(pan.x-20)<1,JSON.stringify(pan));
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(()=>!isPhotoMotionBusy());
 assert.equal(await page.evaluate(()=>modalId),0);assert.equal(await page.evaluate(()=>state.ratings[0]||null),null);
 results.push({browserTouch:true,fraction,pose,pan});
 }
 fs.writeFileSync('D:/CodexBuild/PhotoPick-design-d4-20261009/pinch-result.json',JSON.stringify({pass:true,results,physicalDevice:false},null,2));console.log('PASS: six focal layouts and real browser touch / pan / re-pinch / reset');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
