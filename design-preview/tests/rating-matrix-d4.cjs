const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const out='D:/CodexBuild/PhotoPick-design-d4-20261009/verification';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8771/',{waitUntil:'networkidle'});await page.waitForFunction(()=>typeof reviewIds==='function'&&typeof getToolbarMaterial==='function');
 await page.evaluate(()=>{startFolder();state.reviewDates=[];state.screen='pick';render();openPhoto(0);});
 const settled=()=>page.waitForFunction(()=>!isPhotoMotionBusy());await settled();
 const press=async grade=>{await page.locator(`[data-rate="${grade}"]`).click();await settled();};
 const check=async grade=>{
   assert.equal(await page.evaluate(()=>state.ratings[modalId]||null),grade);
   for(const value of ['skip','keep','best']){
     const active=value==='keep'?['keep','best'].includes(grade):grade===value;
     const button=page.locator(`[data-rate="${value}"]`);
     assert.equal(await button.getAttribute('aria-pressed'),String(active));
     assert.equal(await button.evaluate(b=>b.classList.contains('active')),active);
     if(active)assert.equal(await button.evaluate(b=>getComputedStyle(b).backgroundColor),'rgb(220, 226, 234)');
   }
 };
 await press('best');await check('best');
 await page.evaluate(()=>previewNavigate(1));await settled();await page.evaluate(()=>previewNavigate(-1));await settled();await check('best');
 await page.screenshot({path:out+'/returned-best.png'});
 await press('best');await check('keep');
 await page.evaluate(()=>previewNavigate(1));await settled();await page.evaluate(()=>previewNavigate(-1));await settled();await check('keep');
 await page.screenshot({path:out+'/returned-good.png'});
 await press('keep');await check(null);
 await press('keep');await check('keep');await press('best');await check('best');
 await press('keep');await check(null);
 await press('keep');await press('best');await page.locator('#focus-undo').click();await settled();await check(null);
 await press('best');await press('skip');await check('skip');
 await page.evaluate(()=>previewNavigate(1));await settled();await page.evaluate(()=>previewNavigate(-1));await settled();await check('skip');
 await press('best');await check('best');await page.reload();await page.locator('#resume').click();if(await page.locator('#select-all-dates').count()){await page.locator('#select-all-dates').click();await page.locator('#start-group-review').click();}await page.evaluate(()=>openPhoto(0));await settled();await check('best');
 await page.evaluate(()=>{state.history=[];persist();openPhoto(0);});await settled();
 assert.equal(await page.locator('#focus-undo').isEnabled(),true);await page.locator('#focus-undo').click();await settled();await check(null);
 assert.equal(await page.evaluate(()=>state.history.length),0);
 await press('best');await check('best');
 assert.equal(await page.locator('#favorite-best').count(),0);
 for(const [width,height] of [[360,640],[390,844],[412,915]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(120);
   const geometry=await page.evaluate(()=>{
     const undo=document.querySelector('#focus-undo').getBoundingClientRect(),group=document.querySelector('.preview-rating-group').getBoundingClientRect(),best=document.querySelector('[data-rate="best"]').getBoundingClientRect(),card=document.querySelector('.card').getBoundingClientRect();
     return {undo:[undo.width,undo.height],group:[group.width,group.height],best:[best.width,best.height],outside:group.top>=card.bottom&&undo.top>=card.bottom&&best.top>=card.bottom,inside:group.bottom<=innerHeight&&best.right<=innerWidth&&undo.left>=0,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.deepEqual(geometry.undo,[48,48]);assert.deepEqual(geometry.group,[128,56]);assert.deepEqual(geometry.best,[48,48]);assert(geometry.outside&&geometry.inside&&!geometry.overflow);
   await page.screenshot({path:out+`/matrix-focus-${width}.png`});
 }
 await page.locator('#close-detail').click();await page.locator('#screen-menu').click();assert.match(await page.locator('#menu-undo').innerText(),/선택 모두 취소/);assert(await page.locator('#menu-undo').isEnabled());await page.locator('#menu-undo').click();assert.equal(await page.evaluate(()=>state.ratings[0]),undefined);assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/rating-matrix-result.json',JSON.stringify({pass:true,cases:['best displays heart+marker','best marker off preserves good','good off is unselected','good marker on is best','best heart off is unselected','best Undo is unselected even after good','best skip is skip','all grades shown after next/previous','reload grade display','history-free best Undo','neutral active colors and split control geometry'],jsErrors:errors},null,2));
 console.log('PASS: all requested rating transitions, return display and control geometry.');await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
