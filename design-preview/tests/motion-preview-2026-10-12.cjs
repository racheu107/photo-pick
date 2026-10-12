const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}),output=path.resolve(__dirname,'../verification/motion-preview-2026-10-12');fs.mkdirSync(output,{recursive:true});
 try{
 const page=await browser.newPage({viewport:{width:736,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:18876/');const frame=page.frames().find(f=>f.parentFrame());await frame.waitForSelector('#photo-motion-preview[data-ready=true]');
 assert.equal(await frame.locator('.pm-photo img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0)),true);
 const seek=async n=>frame.locator('#pm-scrub').evaluate((el,n)=>{el.value=String(n*10);el.dispatchEvent(new Event('input',{bubbles:true}));},n);
 await frame.locator('#pm-mode').selectOption('stack');assert(await frame.locator('#pm-play').isDisabled());assert.equal(await frame.locator('[data-depth="3"]').getAttribute('data-scale'),'0.88');
 await page.screenshot({path:path.join(output,'stack.png')});
 for(const mode of ['next','previous']){
 await frame.locator('#pm-mode').selectOption(mode);await seek(65);
 assert.equal(await frame.locator('[data-depth="1"]').getAttribute('data-scale'),'0.96');assert.equal(await frame.locator('[data-depth="1"]').getAttribute('data-x'),'0');
 await seek(85);assert(Number(await frame.locator('[data-depth="1"]').getAttribute('data-scale'))>.96);await seek(100);assert.equal(await frame.locator('[data-depth="1"]').getAttribute('data-scale'),'1');
 }
 await frame.locator('#pm-mode').selectOption('next');await seek(30);await page.screenshot({path:path.join(output,'slide-midpoint.png')});
 for(const mode of ['good','best','skip']){
 await frame.locator('#pm-mode').selectOption(mode);await seek(74);
 const pose=await frame.evaluate(()=>{const card=document.querySelector('[data-depth="0"]').getBoundingClientRect(),target=document.querySelector('[data-grade="'+document.querySelector('#pm-mode').value+'"]').getBoundingClientRect();return {cardWidth:card.width,centerDistance:Math.hypot(card.x+card.width/2-target.x-target.width/2,card.y+card.height/2-target.y-target.height/2)}});
 assert(pose.cardWidth<60,JSON.stringify(pose));assert(pose.centerDistance<3,JSON.stringify(pose));
 await seek(100);assert.equal(await frame.locator('[data-depth="1"]').getAttribute('data-scale'),'1');assert.equal(await frame.locator('[data-grade="'+mode+'"]').evaluate(b=>b.style.background),'transparent');
 }
 await frame.locator('#pm-mode').selectOption('good');await seek(55);await page.screenshot({path:path.join(output,'absorb-midpoint.png')});
 await frame.locator('#pm-mode').selectOption('cancel');await seek(100);assert.equal(await frame.locator('[data-depth="0"]').getAttribute('data-x'),'0');assert.equal(await frame.locator('[data-depth="0"]').getAttribute('data-scale'),'1');
 // Every play mode completes and can replay; pause freezes the current pose.
 await frame.locator('#pm-speed').selectOption('1');
 for(const mode of ['next','previous','good','best','skip','cancel']){
 await frame.locator('#pm-mode').selectOption(mode);await frame.locator('#pm-play').click();await frame.waitForFunction(()=>document.querySelector('#pm-scrub').value==='1000');
 assert.equal(await frame.locator('#pm-play').innerText(),'다시 재생');
 }
 await frame.locator('#pm-mode').selectOption('next');await frame.locator('#pm-speed').selectOption('0.25');await frame.locator('#pm-play').click();await page.waitForTimeout(200);await frame.locator('#pm-play').click();const paused=await frame.locator('#pm-scrub').inputValue();await page.waitForTimeout(200);assert.equal(await frame.locator('#pm-scrub').inputValue(),paused);
 for(const width of [320,736]){
 await page.setViewportSize({width,height:1080});await frame.locator('#pm-mode').selectOption('stack');await page.waitForTimeout(80);
 const geometry=await frame.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,controls:[...document.querySelectorAll('.pm-actions button')].map(b=>{const r=b.getBoundingClientRect();return {left:r.left,right:r.right}})}));assert(geometry.scroll<=geometry.width,JSON.stringify(geometry));assert(geometry.controls.every(b=>b.left>=0&&b.right<=geometry.width),JSON.stringify(geometry));
 }
 await page.setViewportSize({width:736,height:1080});await frame.locator('#pm-mode').selectOption('next');
 const box=await frame.locator('#pm-deck').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
 await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx-box.width*.25,cy,{steps:10});await page.mouse.up();await frame.waitForFunction(()=>document.querySelector('#pm-scrub').value==='1000');assert.equal(await frame.locator('#pm-mode').inputValue(),'next');
 await frame.locator('#pm-mode').selectOption('good');await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx,cy+90,{steps:8});await page.mouse.up();await frame.waitForFunction(()=>document.querySelector('#pm-scrub').value==='1000');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({pass:true,checks:['embedded photos','static stack','no early full-size promotion','centered arriving card','absorption reaches all rating buttons','no next-photo rating residue','cancel restores','all playback modes','pause','320/736 layout','direct horizontal and downward drag'],appChanged:false},null,2));console.log('PASS: all animation previews, scrubbing, playback, pause and direct drag');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
