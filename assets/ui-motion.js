/* Photo inspection gestures and grade feedback; persistence stays in review-ui. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const baseRender = render, baseRate = rate, baseOpen = openPhoto;
  let pending = null, view = '', zoomed = false;
  let preload = null, resetZoom = null, entering = null;
  let prepareToken = 0, preparing = false, cancelPreparation = null;
  window.addEventListener('blur', () => resetZoom?.());
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetZoom?.(); });
  window.cancelPhotoMotion = () => {
    prepareToken++; preparing=false; cancelPreparation?.(); cancelPreparation=null;
    entering?.cancel(); entering=null;
    layer.querySelectorAll('.photo-transition-old,.photo-wait').forEach(node=>node.remove());
    layer.querySelector('.card')?.removeAttribute('aria-busy');
    if (pending) { pending.cancel(); pending=null; }
    resetZoom?.(); resetZoom=null; zoomed=false;
    document.querySelector('.phone').classList.remove('zooming');
  };
  openPhoto = function(id, preserveAlbumPosition = false) {
    if (!sourcePhotos[id] || !reviewIds().includes(id)) return;
    const focused=!!layer.querySelector('.focus-review');
    window.cancelPhotoMotion();
    const oldImage=focused && id!==modalId ? layer.querySelector('.photo-viewport img')?.cloneNode() : null;
    const commit = () => {
      baseOpen(id, preserveAlbumPosition);
      const photo=layer.querySelector('.focus-review .card');
      if (!photo) return;
      const viewport=photo.querySelector('.photo-viewport'), image=viewport.querySelector('img');
      if (!reduced.matches && oldImage) {
        oldImage.classList.add('photo-transition-old'); oldImage.style.transform=''; oldImage.style.transition='none';
        viewport.appendChild(oldImage);
        const fade=oldImage.animate([{opacity:1},{opacity:0}],{duration:160,easing:'ease-out',fill:'forwards'});
        entering=image.animate([{opacity:0},{opacity:1}],{duration:160,easing:'ease-out'});
        const active=entering;
        active.finished.then(()=>{ if (entering===active) entering=null; oldImage.remove(); fade.cancel(); }).catch(()=>{oldImage.remove();fade.cancel();});
      } else if (!focused && !reduced.matches) {
        entering=photo.animate([{opacity:.35,transform:'scale(.94)'},{opacity:1,transform:'none'}],
          {duration:190,easing:'cubic-bezier(.2,.7,.2,1)'});
        const active=entering; active.finished.then(()=>{if(entering===active)entering=null;}).catch(()=>{});
      }
      const ids=reviewIds(), next=ids.slice(ids.indexOf(id)+1).find(next=>!state.ratings[next]);
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
      if(success){commit();return;}
      const notice=document.createElement('p');notice.className='photo-wait';notice.setAttribute('role','status');
      notice.textContent='다음 사진을 읽지 못했어요. SD카드 연결을 확인해 주세요.';
      card.closest('.photo-stage').appendChild(notice);
      layer.querySelectorAll('[data-rate]').forEach(button=>{button.disabled=false;button.classList.remove('chosen');button.classList.toggle('active',state.ratings[modalId]===button.dataset.rate);button.setAttribute('aria-pressed',String(state.ratings[modalId]===button.dataset.rate));});
      layer.querySelector('#clear-rating').disabled=!state.ratings[modalId];
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
      const next = ids.slice(ids.indexOf(state.index)+1).find(id => !state.ratings[id]);
      if (next !== undefined) { preload = new Image(); preload.src = sourcePhotos[next].url; }
    }
  };
  rate = function(value) {
    if (reduced.matches && entering) { entering.finish(); entering=null; layer.querySelectorAll('.photo-transition-old').forEach(node=>node.remove()); }
    if (pending || zoomed || preparing || entering) return;
    const el = document.querySelector(modalId === null ? '#app .card' : '#layer .card');
    if (!el || reduced.matches) { baseRate(value); return; }
    const stage = el.closest('.photo-stage');
    stage.querySelectorAll('[data-rate]').forEach(button => {
      button.disabled = true;
      button.classList.toggle('chosen', button.dataset.rate === value);
    });
    const inDetail = modalId !== null;
    const target=inDetail ? stage.querySelector(`[data-rate="${value}"]`) : el;
    const animation = target.animate(inDetail ? [{transform:'scale(.96)'},{transform:'none'}] : [
      {transform:'none', opacity:1, offset:0},
      {transform:'none', opacity:1, offset:.28},
      {transform:inDetail ? 'scale(.98)' : 'translateY(-18px) scale(.96)', opacity:inDetail ? .85 : 0}
    ], {duration:inDetail ? 120 : 220, easing:'cubic-bezier(.3,0,.25,1)'});
    pending = animation;
    animation.finished.then(() => {
      if (pending !== animation) return;
      pending = null;
      if (!el.isConnected) return;
      baseRate(value);
      const next = document.querySelector('#layer .card, #app .card');
      if (!inDetail && next && !reduced.matches) next.animate(
        [{opacity:0, transform:'translateY(16px) scale(.98)'}, {opacity:1, transform:'none'}],
        {duration:150, easing:'cubic-bezier(.2,.7,.2,1)'});
    }).catch(() => {});
  };
  bindSwipe = function(el) {
    if (!el) return;
    const image = el.querySelector('.photo-viewport img');
    if (!image) return;
    const points = new Map();
    let initial = null, scale = 1, x = 0, y = 0, last = null, detailRequested = false;
    const phone = document.querySelector('.phone');
    const center = pair => ({x:(pair[0].x+pair[1].x)/2, y:(pair[0].y+pair[1].y)/2});
    const distance = pair => Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y);
    const draw = () => {
      const box = el.getBoundingClientRect();
      x = Math.max(-box.width*(scale-1)/2, Math.min(box.width*(scale-1)/2,x));
      y = Math.max(-box.height*(scale-1)/2, Math.min(box.height*(scale-1)/2,y));
      image.style.transform = `translate(${x}px,${y}px) scale(${scale})`;
    };
    const reset = () => {
      points.clear(); initial = null; last = null;
      scale = 1; x = 0; y = 0; zoomed = false;
      image.style.transition = reduced.matches ? 'none' : 'transform 220ms cubic-bezier(.2,.7,.2,1)';
      image.style.transform = '';
      phone.classList.remove('zooming');
    };
    const detail = () => {
      if (detailRequested || !image.src.includes('app.photopick.local/photo/')) return;
      detailRequested = true;
      const full = new Image(); full.src = image.src.split('?')[0] + '?detail=1';
      full.onload = () => { if (image.isConnected && points.size) image.src = full.src; };
    };
    el.onpointerdown = e => {
      if (pending || preparing || entering || e.target.closest('button')) return;
      points.set(e.pointerId,{x:e.clientX,y:e.clientY});
      el.setPointerCapture?.(e.pointerId);
      if (points.size === 2) {
        const pair = [...points.values()];
        initial = {distance:distance(pair), center:center(pair), scale, x, y};
        image.style.transition='none'; zoomed=true; phone.classList.add('zooming'); detail();
      }
    };
    el.onpointermove = e => {
      if (!points.has(e.pointerId)) return;
      const previous = points.get(e.pointerId);
      points.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if (points.size >= 2 && initial) {
        const pair=[...points.values()].slice(0,2), midpoint=center(pair), box=el.getBoundingClientRect();
        scale=Math.max(1,Math.min(3,initial.scale*distance(pair)/Math.max(initial.distance,1)));
        const ratio=scale/initial.scale;
        x=initial.x*ratio+(1-ratio)*(initial.center.x-box.left-box.width/2)+midpoint.x-initial.center.x;
        y=initial.y*ratio+(1-ratio)*(initial.center.y-box.top-box.height/2)+midpoint.y-initial.center.y;
        draw();
      } else if (zoomed) { x+=e.clientX-previous.x; y+=e.clientY-previous.y; draw(); }
    };
    el.onpointerup = e => { points.delete(e.pointerId); initial=null; if (!points.size) reset(); };
    el.onpointercancel = reset;
    el.onlostpointercapture = e => { if (points.has(e.pointerId)) { points.delete(e.pointerId); if (!points.size) reset(); } };
    resetZoom = reset;
  };
  render();
})();
