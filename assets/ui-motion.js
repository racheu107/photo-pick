/* Photo inspection gestures and grade feedback; persistence stays in review-ui. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const baseRender = render, baseRate = rate, baseOpen = openPhoto;
  let pending = null, view = '', zoomed = false, zoomGestureActive = false;
  let dragging = false, settling = null, releaseContext = null;
  let preload = null, resetZoom = null, entering = null;
  const linkedEffects=new Set();
  const linkedAnimate=(node,frames,options)=>{const a=node.animate(frames,options);linkedEffects.add(a);a.finished.then(()=>{linkedEffects.delete(a);a.cancel();},()=>linkedEffects.delete(a));return a;};
  let pressed=null;
  const clearPress=()=>{pressed?.classList.remove('motion-pressed');pressed=null;};
  layer.addEventListener('pointerdown',e=>{const b=e.target.closest('.preview-action,.preview-undo');if(!b||b.disabled||window.isPhotoMotionBusy()||reduced.matches)return;clearPress();pressed=b;b.classList.add('motion-pressed');});
  document.addEventListener('pointerup',clearPress);document.addEventListener('pointercancel',clearPress);
  document.addEventListener('pointermove',e=>{if(pressed){const r=pressed.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)clearPress();}});
  let prepareToken = 0, preparing = false, cancelPreparation = null;
  const frontImage=scope=>scope?.querySelector('.photo-viewport img:not(.photo-back-card):not(.photo-transition-old):not(.photo-arrival-cover)');
  window.isPhotoMotionBusy = () => !!(window.photoGuideActive || pending || preparing || entering || zoomGestureActive || dragging || settling);
  const abandon = () => { window.previewCancelNavigation?.(); window.cancelPhotoMotion(); };
  window.addEventListener('blur', abandon);
  document.addEventListener('visibilitychange', () => { if (document.hidden) abandon(); });
  window.cancelPhotoMotion = () => {
    window.hidePhotoGuide?.(false);clearPress();linkedEffects.forEach(a=>a.cancel());linkedEffects.clear();
    prepareToken++; preparing=false; cancelPreparation?.(); cancelPreparation=null;
    entering?.cancel(); entering=null;
    settling?.cancel(); settling=null; dragging=false; releaseContext=null;
    layer.querySelectorAll('.photo-transition-old,.photo-arrival-cover,.photo-wait').forEach(node=>node.remove());
    layer.querySelector('.photo-stage')?.classList.remove('is-absorbing');
    layer.querySelector('.card')?.removeAttribute('aria-busy');
    if (pending) { pending.cancel(); pending=null; }
    resetZoom?.(); resetZoom=null; zoomed=false; zoomGestureActive=false;
    document.querySelector('.phone').classList.remove('zooming','zoom-interacting');
  };
  window.prepareRatingTransition = (id, grade) => {
    if (modalId!==id || !['skip','keep','best'].includes(grade)) return;
    releaseContext={...(releaseContext?.id===id?releaseContext:{}),id,action:'rating',grade};
    const source=frontImage(layer);
    if(source && !releaseContext.transform){releaseContext.transform=source.style.transform;releaseContext.transformOrigin=source.style.transformOrigin;}
  };
  const departure = (source, context, direction) => {
    const stage=source?.closest('.photo-stage');
    if(!stage || reduced.matches)return Promise.resolve(true);
    const rect=source.getBoundingClientRect(),bounds=stage.getBoundingClientRect();
    const matrix=new DOMMatrixReadOnly(getComputedStyle(source).transform);
    const rotation=Math.atan2(matrix.m12,matrix.m11)*180/Math.PI;
    const scale=Math.hypot(matrix.m11,matrix.m12)||1;
    // Match the released rendered pose before changing the horizontal pivot.
    const width=source.offsetWidth,height=source.offsetHeight;
    const horizontal=!context?.grade,ox=width/2,oy=horizontal?height:height/2;
    const radians=rotation*Math.PI/180;
    const centerX=ox+scale*(Math.cos(radians)*(width/2-ox)-Math.sin(radians)*(height/2-oy));
    const centerY=oy+scale*(Math.sin(radians)*(width/2-ox)+Math.cos(radians)*(height/2-oy));
    const left=rect.left+rect.width/2-bounds.left-centerX,top=rect.top+rect.height/2-bounds.top-centerY;
    const clone=source.cloneNode();clone.className='photo-transition-old photo-departure';
    Object.assign(clone.style,{position:'absolute',inset:'auto',margin:'0',left:left+'px',top:top+'px',width:source.offsetWidth+'px',height:source.offsetHeight+'px',maxWidth:'none',maxHeight:'none',transformOrigin:horizontal?'50% 100%':'center',transition:'none',visibility:'visible',opacity:'1',zIndex:'5',pointerEvents:'none'});
    clone.setAttribute('aria-hidden','true');stage.appendChild(clone);source.style.visibility='hidden';
    const start=`translate(0px,0px) rotate(${rotation}deg) scale(${scale})`;
    let frames,duration,receivingButton;
    if(context?.grade){
      stage.classList.add('is-absorbing');
      const button=stage.querySelector(`[data-rate="${context.grade}"]`),target=button?.getBoundingClientRect();
      if(!target){clone.remove();source.style.visibility='';return Promise.resolve(true);}
      const dx=target.left+target.width/2-(rect.left+rect.width/2),dy=target.top+target.height/2-(rect.top+rect.height/2);
      const finalScale=Math.min(target.width/source.offsetWidth,target.height/source.offsetHeight)*.7;
      const turn=context.grade==='skip'?-5:context.grade==='best'?5:3;
      frames=[{transform:start,opacity:1},{offset:.64,transform:`translate(${dx*.57}px,${dy*.7}px) rotate(${rotation+turn*.7}deg) scale(${scale*.32})`,opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(${rotation+turn}deg) scale(${finalScale})`,opacity:0}];
      duration=190;
      receivingButton=button;
    }else{
      const endAngle=direction*22.5,angle=endAngle*Math.PI/180,endScale=Math.min(scale,.9);
      const corners=[[0,0],[width,0],[0,height],[width,height]].map(([x,y])=>ox+endScale*(Math.cos(angle)*(x-ox)-Math.sin(angle)*(y-oy)));
      const exitX=direction>0?stage.clientWidth+24-left-Math.min(...corners):-24-left-Math.max(...corners);
      frames=[{transform:start,opacity:1},{transform:`translate(${exitX}px,0px) rotate(${endAngle}deg) scale(${endScale})`,opacity:1}];
      // Direct manipulation ends at the same pose; a short eased departure follows.
      const speed=Math.max(0,direction*(context?.velocity||0));
      duration=Math.max(150,Math.min(220,220-speed*35));
    }
    source.closest('.card')?.supplyPhotoBack?.(duration);
    const animation=clone.animate(frames,{duration,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});pending=animation;
    if(receivingButton){
      const glyph=receivingButton.querySelector('svg'),options={duration,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'};
      receivingButton.classList.add('motion-confirm');
      const color=getComputedStyle(glyph).color;
      const icon=linkedAnimate(glyph,[{transform:'scale(.97)',color},{offset:.68,transform:'scale(.97)',color},{offset:.9,transform:'scale(1)',color:context.grade==='best'?'#b8905e':color},{transform:'scale(1)',color}],options);
      const surface=linkedAnimate(receivingButton,[{boxShadow:'inset 0 0 0 0px #ffffff00'},{offset:.68,boxShadow:'inset 0 0 0 0px #ffffff00'},{offset:.9,boxShadow:'inset 0 0 0 2px #ffffff35'},{boxShadow:'inset 0 0 0 0px #ffffff00'}],options);
      icon.startTime=surface.startTime=animation.startTime;
    }
    return animation.finished.then(()=>true,()=>false).then(success=>{
      if(pending===animation)pending=null;clone.remove();animation.cancel();source.style.visibility='';
      stage.classList.remove('is-absorbing');stage.querySelectorAll('.motion-confirm').forEach(b=>b.classList.remove('motion-confirm'));
      return success;
    });
  };
  window.finishRatingTransition = (id, grade, complete) => {
    const source=frontImage(layer),context={id,action:'rating',grade};
    const pose=source?.style.transform,origin=source?.style.transformOrigin;
    window.cancelPhotoMotion();
    if(!source || reduced.matches){complete();return;}
    source.style.transform=pose;source.style.transformOrigin=origin;
    const token=++prepareToken;preparing=true;
    departure(source,context,0).then(success=>{if(token!==prepareToken)return;preparing=false;if(success)complete();});
  };
  openPhoto = function(id, preserveAlbumPosition = false) {
    if (!sourcePhotos[id] || !reviewIds().includes(id)) return;
    layer.querySelector('.card')?.dismissPhotoGuide?.();
    const focused=!!layer.querySelector('.focus-review');
    const context=releaseContext && releaseContext.id===modalId ? releaseContext : null;
    const priorId=modalId;
    const idsBefore=reviewIds();
    const step=idsBefore.indexOf(id)-idsBefore.indexOf(priorId);
    // Clone BEFORE cancellation: the released pose is the start of the next motion.
    window.cancelPhotoMotion();
    const sourceImage=focused ? frontImage(layer) : null;
    if(context?.transform && sourceImage && !reduced.matches) {sourceImage.style.transform=context.transform;sourceImage.style.transformOrigin=context.transformOrigin;}
    if(context)layer.querySelector('.card')?.showPhotoBack?.(id);
    const commit = () => {
      window.previewCommitNavigation?.(id);
      baseOpen(id, preserveAlbumPosition);
      const photo=layer.querySelector('.focus-review .card');
      if (!photo) return;
      const image=frontImage(photo);
      if (!reduced.matches && focused && id!==priorId) {
        image.style.transformOrigin='50% 0%';
        // Bridge the cropped depth preview to the full photograph through blur.
        const cover=image.cloneNode();cover.className='photo-arrival-cover';cover.setAttribute('aria-hidden','true');
        image.closest('.photo-viewport').appendChild(cover);
        linkedAnimate(cover,[{opacity:.9,filter:'blur(2px)',transform:'translateY(-3px) scale(.96)'},{opacity:0,filter:'blur(0px)',transform:'translateY(0px) scale(1)'}],{duration:90,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'}).finished.then(()=>cover.remove(),()=>cover.remove());
        entering=image.animate([{opacity:0,filter:'blur(2px)',transform:'translateY(-3px) scale(.96)'},{opacity:1,filter:'blur(0px)',transform:'translateY(0px) scale(1)'}],{duration:90,easing:'cubic-bezier(.2,.7,.2,1)'});
        const active=entering;
        active.finished.then(()=>{if(entering===active)entering=null;image.style.transformOrigin='center';}).catch(()=>{});
      } else if (!focused && !reduced.matches) {
        entering=photo.animate([{opacity:.35,transform:'scale(.94)'},{opacity:1,transform:'none'}],
          {duration:190,easing:'cubic-bezier(.2,.7,.2,1)'});
        const active=entering; active.finished.then(()=>{if(entering===active)entering=null;}).catch(()=>{});
      }
      const ids=reviewIds(), next=ids[ids.indexOf(id)+1];
      if(next!==undefined){preload=new Image();preload.src=sourcePhotos[next].url;}
    };
    if (!focused || id===modalId) { commit(); return; }
    // Keep the existing photograph and opaque shell visible until the next image is ready.
    const token=++prepareToken;
    preparing=true;
    const card=layer.querySelector('.card'); card.setAttribute('aria-busy','true');
    layer.querySelectorAll('[data-rate]').forEach(button=>button.disabled=true);
    const next=new Image();
    let timer=null, waitTimer=null, finished=false;
    cancelPreparation=()=>{finished=true;clearTimeout(timer);clearTimeout(waitTimer);next.onload=null;next.onerror=null;};
    const done = success => {
      if(finished) return; finished=true; clearTimeout(timer); clearTimeout(waitTimer);
      if(token!==prepareToken || !card.isConnected) return;
      preparing=false; cancelPreparation=null; card.removeAttribute('aria-busy'); layer.querySelector('.photo-wait')?.remove();
      if(success){
        if(reduced.matches || !sourceImage){commit();return;}
        preparing=true;card.setReadyPhotoBack?.(id,next.src);card.showPhotoBack?.(id);
        const sign=context?.grade?0:context?.dx?Math.sign(context.dx):step<0?1:-1;
        departure(sourceImage,context,sign).then(success=>{if(token!==prepareToken || !card.isConnected)return;preparing=false;if(success)commit();});
        return;
      }
      window.previewCancelNavigation?.();
      if(sourceImage?.isConnected){sourceImage.style.transition=reduced.matches?'none':'transform 180ms cubic-bezier(.2,.7,.2,1)';sourceImage.style.transform='';}
      card.showPhotoBack?.(window.previewNextUnrated(priorId),0);
      const notice=document.createElement('p');notice.className='photo-wait';notice.setAttribute('role','status');
      notice.textContent='다음 사진을 읽지 못했어요. SD카드 연결을 확인해 주세요.';
      card.closest('.photo-stage').appendChild(notice);
      layer.querySelectorAll('[data-rate]').forEach(button=>{button.disabled=false;button.classList.remove('chosen');button.classList.toggle('active',(button.dataset.rate==='keep' ? ['keep','best'].includes(state.ratings[modalId]) : state.ratings[modalId]===button.dataset.rate));button.setAttribute('aria-pressed',String((button.dataset.rate==='keep' ? ['keep','best'].includes(state.ratings[modalId]) : state.ratings[modalId]===button.dataset.rate)));});
      const clear=layer.querySelector('#clear-rating'); if(clear) clear.disabled=!state.ratings[modalId];
    };
    next.onload=()=>{const decoded=next.decode ? next.decode().catch(()=>{}) : Promise.resolve();decoded.then(()=>done(true));}; next.onerror=()=>done(false);
    waitTimer=setTimeout(()=>{
      if(token!==prepareToken || !preparing) return;
      const notice=document.createElement('p');notice.className='photo-wait';notice.setAttribute('role','status');
      notice.textContent='다음 사진을 읽는 중…';card.closest('.photo-stage').appendChild(notice);
    },250);
    timer=setTimeout(()=>done(false),10000);
    next.src=sourcePhotos[id].url;
    if(next.complete && next.naturalWidth) next.onload();
  };
  render = function() {
    window.cancelPhotoMotion();
    const nextView = state.screen + ':' + state.mode;
    const changed = nextView !== view; view = nextView;
    baseRender();
    if (changed && !reduced.matches) app.animate(
      [{opacity:0, transform:'translateY(6px)'}, {opacity:1, transform:'translateY(0)'}],
      {duration:180, easing:'cubic-bezier(.2,.7,.2,1)'});
    if (state.screen === 'pick' && state.mode === 'card') {
      const ids = reviewIds();
      const next = ids[ids.indexOf(state.index)+1];
      if (next !== undefined) { preload = new Image(); preload.src = sourcePhotos[next].url; }
    }
  };
  rate = function(value) {
    layer.querySelector('.card')?.dismissPhotoGuide?.();
    if(window.isPhotoMotionBusy()) return;
    // State/history/haptics are synchronous. Decoration never queues a rating.
    const result=baseRate(value);
    if(result===false || reduced.matches || window.isPhotoMotionBusy()) return result;
    const glyph=layer.querySelector(`[data-rate="${value}"] svg`);
    glyph?.getAnimations().forEach(animation=>animation.cancel());
    glyph?.animate([{transform:'scale(.96)'},{transform:'scale(1)'}],{duration:120,easing:'cubic-bezier(.2,.7,.2,1)'});
    return result;
  };
  bindSwipe = function(el) {
    if (!el) return;
    el.disposePhotoGesture?.();
    el.querySelectorAll('.gesture-feedback').forEach(node=>node.remove());
    el.closest('.photo-stage')?.querySelectorAll('.gesture-guide').forEach(node=>node.remove());
    const image = frontImage(el);
    if (!image) return;
    image.classList.add('photo-front-card');
    const viewport=image.closest('.photo-viewport');
    viewport.querySelectorAll('.photo-back-card').forEach(node=>node.remove());
    const boundId=modalId===null?state.index:modalId;
    const slots=Array.from({length:3},(_,depth)=>{
      const node=document.createElement('img');node.className='photo-back-card';node.alt='';
      node.setAttribute('aria-hidden','true');node.dataset.stackDepth=String(depth+1);
      node.dataset.currentPhotoId=String(boundId);node.style.pointerEvents='none';
      node.style.objectFit='cover';node.style.transformOrigin='50% 0%';node.style.zIndex=String(3-depth);node.hidden=true;
      viewport.insertBefore(node,image);return {node,target:null,loader:null,token:0};
    });
    const back=slots[0].node;
    let backTarget=null,disposed=false,backProgress=0;
    const sizeBack=()=>{
      if(disposed)return;
      slots.forEach(slot=>{slot.node.style.width=image.offsetWidth+'px';slot.node.style.height=image.offsetHeight+'px';});
    };
    image.addEventListener('load',sizeBack);
    const backResize=typeof ResizeObserver==='function'?new ResizeObserver(sizeBack):null;
    backResize?.observe(image);backResize?.observe(viewport);sizeBack();
    const candidates=()=>{
      const ids=reviewIds(),offset=ids.indexOf(boundId);
      return [...ids.slice(offset+1),...ids.slice(0,offset)].filter(id=>!state.ratings[id]);
    };
    const restTarget=()=>window.previewNextUnrated(boundId);
    const paintBack=progress=>{
      backProgress=Math.max(0,Math.min(1,progress));
      slots.forEach((slot,depth)=>{
        const p=depth===0?backProgress:0,scale=.96-depth*.04;
        slot.node.style.opacity=String(depth===0?.6+.3*p:depth===1?.35:.18);
        slot.node.style.filter='blur('+(depth+2)+'px)';
        slot.node.style.transform='translateY('+(-10*(depth+1)+(depth===0?7*p:0))+'px) scale('+scale+')';
      });
    };
    const loadSlot=(slot,target)=>{
      if(disposed)return;
      if(slot.target===target&&(slot.loader||slot.node.dataset.photoId===String(target)))return;
      slot.target=target;const token=++slot.token;
      if(slot.loader){slot.loader.onload=null;slot.loader.onerror=null;slot.loader=null;}
      slot.node.onerror=null;slot.node.hidden=true;slot.node.removeAttribute('src');delete slot.node.dataset.photoId;
      if(target===undefined||target===boundId||!sourcePhotos[target]||!reviewIds().includes(target))return;
      const loader=new Image();slot.loader=loader;
      const done=success=>{
        if(disposed||token!==slot.token||boundId!==(modalId===null?state.index:modalId)||!slot.node.isConnected)return;
        loader.onload=null;loader.onerror=null;slot.loader=null;
        if(!success)return;
        slot.node.src=loader.src;slot.node.dataset.photoId=String(target);slot.node.hidden=false;paintBack(backProgress);
        slot.node.onerror=()=>{if(!disposed&&token===slot.token){slot.node.hidden=true;delete slot.node.dataset.photoId;}};
      };
      loader.onload=()=>{const decoded=loader.decode?loader.decode().catch(()=>{}):Promise.resolve();decoded.then(()=>done(true));};
      loader.onerror=()=>done(false);loader.src=sourcePhotos[target].url;
      if(loader.complete&&loader.naturalWidth)loader.onload();
    };
    const showBack=target=>{
      if(disposed)return;backTarget=target;
      const future=candidates().filter(id=>id!==target),targets=target===undefined?[]:[target,...future].slice(0,3);
      slots.forEach((slot,index)=>loadSlot(slot,targets[index]));paintBack(backProgress);
    };
    el.supplyPhotoBack=duration=>{
      const before={transform:back.style.transform,opacity:back.style.opacity};paintBack(1);
      if(!back.hidden&&!reduced.matches)linkedAnimate(back,[before,{transform:back.style.transform,opacity:back.style.opacity}],{duration,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'});
    };
    el.showPhotoBack=(target,progress)=>{showBack(target);if(progress!==undefined)paintBack(progress);};
    el.setReadyPhotoBack=(target,url)=>{
      showBack(target);const slot=slots[0];slot.token++;
      if(slot.loader){slot.loader.onload=null;slot.loader.onerror=null;slot.loader=null;}
      slot.node.src=url;slot.node.dataset.photoId=String(target);slot.node.hidden=false;paintBack(backProgress);
    };
    showBack(restTarget());
    const points = new Map();
    let initial = null, scale = 1, x = 0, y = 0, last = null, detailRequested = false;
    let drag = null, blocked = false, guideAnimation = null, guideTimer = null, guideNode = null;
    let tapStart = null, lastTap = null, lastZoomToggle = 0, lastPointerType = 'mouse';
    const zoomReset=document.createElement('button');
    zoomReset.className='zoom-reset';zoomReset.textContent='전체 보기';zoomReset.hidden=true;
    zoomReset.setAttribute('aria-label','사진 전체 보기');el.appendChild(zoomReset);
    const dismissGuide = () => {
      guideAnimation?.cancel();guideAnimation=null;
      clearTimeout(guideTimer);guideTimer=null;guideNode?.remove();guideNode=null;
    };
    el.dismissPhotoGuide=dismissGuide;
    const guideSurface=el.closest('.photo-stage')||el;
    const dismissOnButton=event=>{if(event.target.closest('button'))dismissGuide();};
    guideSurface.addEventListener('click',dismissOnButton,true);
    let frame = null, box = null, previewAction = null;
    const feedback = document.createElement('div');
    feedback.className='gesture-feedback'; feedback.setAttribute('aria-hidden','true');
    feedback.innerHTML='<span class="gesture-label"><span class="gesture-icon"></span><span class="gesture-text"></span></span>';
    feedback.style.opacity='0'; el.appendChild(feedback);
    const label=feedback.querySelector('.gesture-label'), glyph=feedback.querySelector('.gesture-icon'), text=feedback.querySelector('.gesture-text');
    const phone = document.querySelector('.phone');
    const center = pair => ({x:(pair[0].x+pair[1].x)/2, y:(pair[0].y+pair[1].y)/2});
    const distance = pair => Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y);
    const draw = () => {
      const width = image.offsetWidth, height = image.offsetHeight;
      x = Math.max(-width*(scale-1)/2, Math.min(width*(scale-1)/2,x));
      y = Math.max(-height*(scale-1)/2, Math.min(height*(scale-1)/2,y));
      image.style.transform = `translate(${x}px,${y}px) scale(${scale})`;
      zoomReset.hidden=scale<=1.001;
    };
    const reset = (preservePose=false) => {
      if(frame!==null){cancelAnimationFrame(frame);frame=null;}
      const captured=[...points.keys()];
      points.clear(); initial = null; last = null;
      scale = 1; x = 0; y = 0; zoomed = false; zoomGestureActive=false;
      tapStart=null;lastTap=null;zoomReset.hidden=true;
      drag=null; blocked=false; dragging=false; feedback.style.opacity='0';
      el.classList.remove('is-dragging');
      guideAnimation?.cancel(); guideAnimation=null;
      if(!preservePose){image.style.transition='none';image.style.transform='';image.style.transformOrigin='center';showBack(restTarget());paintBack(0);}
      phone.classList.remove('zooming','zoom-interacting');
      captured.forEach(id=>{try { if(el.hasPointerCapture?.(id)) el.releasePointerCapture(id); } catch (_) {} });
    };
    const finishInspection = () => {
      const captured=[...points.keys()];points.clear();initial=null;drag=null;blocked=false;
      dragging=false;zoomGestureActive=false;tapStart=null;feedback.style.opacity='0';
      el.classList.remove('is-dragging');phone.classList.remove('zoom-interacting');
      zoomed=scale>1.001;
      if(zoomed){image.style.transformOrigin='center';draw();phone.classList.add('zooming');}
      else reset();
      captured.forEach(id=>{try{if(el.hasPointerCapture?.(id))el.releasePointerCapture(id);}catch(_){}});
    };
    const toggleZoom = (clientX,clientY) => {
      if(zoomGestureActive||dragging||pending||preparing||entering)return;
      dismissGuide();lastZoomToggle=performance.now();
      if(settling){settling.cancel();settling=null;}
      if(zoomed){reset();return;}
      const bounds=image.getBoundingClientRect();
      image.style.transformOrigin='center';image.style.transition='none';
      scale=2;x=bounds.left+bounds.width/2-clientX;y=bounds.top+bounds.height/2-clientY;
      zoomed=true;back.hidden=true;phone.classList.add('zooming');draw();detail();
    };
    zoomReset.onclick=()=>{if(!zoomGestureActive)reset();};
    el.ondblclick=e=>{if(lastPointerType!=='mouse'||e.target.closest('button'))return;e.preventDefault();if(performance.now()-lastZoomToggle>350)toggleZoom(e.clientX,e.clientY);};
    const direction = () => {
      if (!drag || !drag.axis) return null;
      const dx=drag.dx, dy=drag.dy;
      if(drag.axis==='y') return dy>0 ? 'good' : null;
      const ids=reviewIds(), index=ids.indexOf(modalId===null ? state.index : modalId);
      return dx>0 ? (index>0 ? 'previous' : null) : (index<ids.length-1 ? 'next' : null);
    };
    const threshold = () => {
      const bounds=box||el.getBoundingClientRect();
      return drag?.axis==='y' ? Math.max(64,Math.min(112,bounds.height*.18)) : Math.max(60,Math.min(100,bounds.width*.22));
    };
    // Continuous follow with smooth resistance, rather than a sudden 40px cap.
    const follow = (distance,extent) => {
      const free=extent*.7, excess=Math.max(0,Math.abs(distance)-free);
      return Math.sign(distance)*(Math.min(Math.abs(distance),free)+excess*.35);
    };
    const preview = () => {
      const action=direction();
      if(!action){
        feedback.style.opacity='0';
        if(drag?.axis){showBack(undefined);paintBack(0);}
        if(drag?.axis==='x'){
          drag.tx=(drag.originX||0)+Math.sign(drag.dx)*12*(1-Math.exp(-Math.abs(drag.dx)/70));
          drag.ty=drag.originY||0;
          drag.rotation=drag.originRotation||0;
          image.style.transition='none';
          image.style.transform=reduced.matches?'':`translate(${drag.tx}px,${drag.ty}px) rotate(${drag.rotation}deg) scale(${drag.cardScale||drag.originScale||1})`;
        } else image.style.transform='';
        return;
      }
      const amount=Math.abs(drag.axis==='x' ? drag.dx : drag.dy), progress=Math.min(1,amount/threshold());
      const ids=reviewIds(), offset=ids.indexOf(boundId);
      showBack(action==='good'?window.previewNextUnrated(boundId):ids[offset+(action==='previous'?-1:1)]);paintBack(progress);
      const best=state.ratings[modalId===null ? state.index : modalId]==='best';
      const key=action+':'+best;
      if(previewAction!==key){
        previewAction=key; feedback.dataset.direction=action;
        text.textContent=action==='previous'?'이전 사진':action==='next'?'다음 사진':best?'매우 좋음 유지':'좋음';
        glyph.innerHTML=action==='good'?icon(best?'best':'keep'):'';
      }
      feedback.style.opacity='1';
      feedback.style.setProperty('--gesture-gradient-opacity',String(progress*.45));
      label.style.opacity=String(Math.min(1,progress*1.8));
      label.style.transform=reduced.matches?'none':`translateY(${(1-progress)*4}px)`;
      feedback.dataset.ready=String(progress>=1);
      image.style.transition='none';
      drag.tx=(drag.originX||0)+follow(drag.dx,box.width);
      drag.ty=(drag.originY||0)+follow(drag.dy,box.height);
      const turn=drag.axis==='x'?drag.dx/Math.max(1,box.width*.9)*22.5:drag.dx/Math.max(1,box.width)*3*drag.grip;
      const limit=drag.axis==='x'?22.5:1.5;
      drag.rotation=Math.max(-limit,Math.min(limit,(drag.originRotation||0)+turn));
      const minimum=drag.axis==='x'?.93:.92;
      drag.cardScale=(drag.originScale||1)-((drag.originScale||1)-minimum)*progress;
      image.style.transform=reduced.matches?'':`translate(${drag.tx}px,${drag.ty}px) rotate(${drag.rotation}deg) scale(${drag.cardScale})`;
    };
    const settle = () => {
      const pose=image.style.transform;
      const stackPose=slots.map(slot=>({transform:slot.node.style.transform,opacity:slot.node.style.opacity,filter:slot.node.style.filter}));
      reset(true);
      showBack(restTarget());paintBack(0);
      if(reduced.matches || !pose || pose==='none'){image.style.transform='';return;}
      slots.forEach((slot,index)=>{if(!slot.node.hidden)slot.node.animate([stackPose[index],{transform:slot.node.style.transform,opacity:slot.node.style.opacity,filter:slot.node.style.filter}],{duration:180,easing:'cubic-bezier(.2,.7,.2,1)'});});
      const animation=image.animate([{transform:pose},{transform:'translate(0px,0px) rotate(0deg)'}],{duration:180,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'});
      settling=animation;
      animation.finished.then(()=>{if(settling===animation){settling=null;image.style.transform='';image.style.transformOrigin='center';animation.cancel();}}).catch(()=>{});
    };
    const detail = () => {
      if (detailRequested || !image.src.includes('app.photopick.local/photo/')) return;
      detailRequested = true;
      const full = new Image(); full.src = image.src.split('?')[0] + '?detail=1';
      full.onload = () => { if (image.isConnected && (points.size || zoomed)) image.src = full.src; };
    };
    el.onpointerdown = e => {
      if (window.photoGuideActive || pending || preparing || entering || points.size>=2 || e.target.closest('button') || (e.pointerType==='mouse' && e.button!==0)) return;
      lastPointerType=e.pointerType;
      let startTx=0,startTy=0,startRotation=0,startScale=1;
      if(settling){
        const matrix=new DOMMatrixReadOnly(getComputedStyle(image).transform);
        startTx=matrix.m41;startTy=matrix.m42;
        startRotation=Math.atan2(matrix.m12,matrix.m11)*180/Math.PI;startScale=Math.hypot(matrix.m11,matrix.m12)||1;
        settling.cancel();settling=null;
        image.style.transform=`translate(${startTx}px,${startTy}px) rotate(${startRotation}deg) scale(${startScale})`;
      }
      box=el.getBoundingClientRect();
      // Retry a failed preview once on a new interaction, never in the RAF loop.
      if(!slots[0].loader && backTarget!==undefined && backTarget!==null && !back.dataset.photoId){
        const retryTarget=backTarget;backTarget=null;showBack(retryTarget);
      }
      dismissGuide();
      points.set(e.pointerId,{x:e.clientX,y:e.clientY});
      el.setPointerCapture?.(e.pointerId);
      if(points.size===1 && e.pointerType!=='mouse')tapStart={id:e.pointerId,x:e.clientX,y:e.clientY,time:e.timeStamp};
      if(zoomed){zoomGestureActive=true;phone.classList.add('zoom-interacting');}
      if(points.size===1 && !blocked && !zoomed){const gripY=Math.max(0,Math.min(1,(e.clientY-image.getBoundingClientRect().top)/Math.max(1,image.offsetHeight)));if(!startRotation)image.style.transformOrigin='50% 100%';dragging=true;el.classList.add('is-dragging');drag={id:e.pointerId,photoId:boundId,startX:e.clientX,startY:e.clientY,dx:0,dy:0,tx:startTx,ty:startTy,rotation:startRotation,originX:startTx,originY:startTy,originRotation:startRotation,originScale:startScale,grip:(.5-gripY)*2,gripX:((e.clientX-box.left)/Math.max(1,box.width)-.5)*2,axis:null,samples:[{time:e.timeStamp,x:e.clientX,y:e.clientY}]};}
      if (points.size === 2) {
        tapStart=null;lastTap=null;zoomGestureActive=true;phone.classList.add('zoom-interacting');
        if(frame!==null){cancelAnimationFrame(frame);frame=null;}
        blocked=true;drag=null;dragging=false;releaseContext=null;feedback.style.opacity='0';
        // Drag pivots belong to card navigation; zoom always uses the photo centre.
        image.style.transformOrigin='center';
        image.style.transition='none';
        draw();
        el.classList.remove('is-dragging');
        back.hidden=true;
        const pair = [...points.values()];
        const bounds=image.getBoundingClientRect();
        const origin={x:bounds.left+bounds.width/2-x,y:bounds.top+bounds.height/2-y};
        initial = {distance:distance(pair), center:center(pair), origin, scale, x, y};
        image.style.transition='none'; zoomed=true; phone.classList.add('zooming'); detail();
      }
    };
    el.onpointermove = e => {
      if (!points.has(e.pointerId)) return;
      const previous = points.get(e.pointerId);
      if(tapStart && Math.hypot(e.clientX-tapStart.x,e.clientY-tapStart.y)>10)tapStart=null;
      points.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if (points.size >= 2 && initial) {
        const pair=[...points.values()].slice(0,2), midpoint=center(pair);
        scale=Math.max(1,Math.min(3,initial.scale*distance(pair)/Math.max(initial.distance,1)));
        const ratio=scale/initial.scale;
        x=initial.x*ratio+(1-ratio)*(initial.center.x-initial.origin.x)+midpoint.x-initial.center.x;
        y=initial.y*ratio+(1-ratio)*(initial.center.y-initial.origin.y)+midpoint.y-initial.center.y;
        draw();
      } else if (zoomed) { x+=e.clientX-previous.x; y+=e.clientY-previous.y; draw(); }
      else if(drag && !blocked && e.pointerId===drag.id){
        drag.dx=e.clientX-drag.startX;drag.dy=e.clientY-drag.startY;
        drag.samples.push({time:e.timeStamp,x:e.clientX,y:e.clientY});
        while(drag.samples.length>2 && e.timeStamp-drag.samples[0].time>80)drag.samples.shift();
        if(!drag.axis && Math.hypot(drag.dx,drag.dy)>12){
          if(Math.abs(drag.dx)>Math.abs(drag.dy)*1.2) drag.axis='x';
          else if(Math.abs(drag.dy)>Math.abs(drag.dx)*1.2) drag.axis='y';
        }
        if(frame===null)frame=requestAnimationFrame(()=>{frame=null;if(drag)preview();});
      }
    };
    el.onpointerup = e => {
      const tap=tapStart && tapStart.id===e.pointerId && e.timeStamp-tapStart.time<300 && Math.hypot(e.clientX-tapStart.x,e.clientY-tapStart.y)<10;
      const previousTap=lastTap;
      if(drag && e.pointerId===drag.id){drag.dx=e.clientX-drag.startX;drag.dy=e.clientY-drag.startY;}
      const action=!blocked && !zoomed && drag && e.pointerId===drag.id ? direction() : null;
      const commit=action && drag.photoId===(modalId===null?state.index:modalId) && Math.abs(drag.axis==='x' ? drag.dx : drag.dy)>=threshold();
      points.delete(e.pointerId);initial=null;
      if(!points.size){
        if(zoomed||blocked)finishInspection();
        else if(commit){
          if(frame!==null){cancelAnimationFrame(frame);frame=null;} preview();
          const sample=drag.samples[0], dt=Math.max(1,e.timeStamp-sample.time);
          releaseContext={id:drag.photoId,action,dx:drag.dx,tx:drag.tx||0,ty:drag.ty||0,rotation:drag.rotation||0,transform:image.style.transform,transformOrigin:image.style.transformOrigin,velocity:(drag.axis==='x'?e.clientX-sample.x:e.clientY-sample.y)/dt};
          reset(true);
          const accepted=action==='good'?window.previewSwipeGood?.():window.previewNavigate?.(action==='previous'?-1:1);
          if(!preparing && !entering){releaseContext=null;settle();}
          if(accepted===false)releaseContext=null;
        } else settle();
        if(tap){
          if(previousTap && e.timeStamp-previousTap.time<320 && Math.hypot(e.clientX-previousTap.x,e.clientY-previousTap.y)<24){lastTap=null;toggleZoom(e.clientX,e.clientY);}
          else lastTap={x:e.clientX,y:e.clientY,time:e.timeStamp};
        }
      }
    };
    el.onpointercancel = () => {releaseContext=null;lastTap=null;if(zoomed||blocked)finishInspection();else settle();};
    el.onlostpointercapture = e => { if (points.has(e.pointerId)) { points.delete(e.pointerId);initial=null; if (!points.size){releaseContext=null;if(zoomed||blocked)finishInspection();else settle();} } };
    el.disposePhotoGesture=()=>{
      disposed=true;slots.forEach(slot=>{slot.token++;slot.node.onerror=null;if(slot.loader){slot.loader.onload=null;slot.loader.onerror=null;slot.loader=null;}});
      backResize?.disconnect();image.removeEventListener('load',sizeBack);
      back.onerror=null;

      reset();dismissGuide();feedback.remove();zoomReset.remove();
      slots.forEach(slot=>slot.node.remove());delete el.showPhotoBack;delete el.setReadyPhotoBack;
      guideSurface.removeEventListener('click',dismissOnButton,true);
      delete el.dismissPhotoGuide;
      el.onpointerdown=null;el.onpointermove=null;el.onpointerup=null;el.onpointercancel=null;el.onlostpointercapture=null;el.ondblclick=null;
      if(resetZoom===reset) resetZoom=null;
    };
    resetZoom = reset;
    if(modalId!==null)window.showPhotoGuide?.(el,image);
  };
  render();
})();
