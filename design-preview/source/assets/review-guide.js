/* A visual rehearsal only: never dispatches navigation, ratings or haptics. */
(() => {
  const key='photopick-review-motion-guide-v1',reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let current=null;
  window.photoGuideActive=false;
  window.hidePhotoGuide=(remember=false)=>{
    if(!current)return;
    const g=current;current=null;clearTimeout(g.timer);g.animation?.cancel();
    g.resize.disconnect();window.removeEventListener('resize',g.layout);g.root.remove();if(g.image.isConnected)g.image.style.visibility=g.visibility;
    g.hidden.forEach(({node,inert,aria})=>{node.inert=inert;if(aria===null)node.removeAttribute('aria-hidden');else node.setAttribute('aria-hidden',aria);});
    window.photoGuideActive=false;
    if(remember){try{localStorage.setItem(key,'1');}catch(_){}if(g.focus?.isConnected)g.focus.focus();}
  };
  window.showPhotoGuide=(card,image)=>{
    try{if(localStorage.getItem(key))return;}catch(_){}
    if(current||!card.closest('.focus-review'))return;
    const modal=card.closest('.focus-review'),root=document.createElement('div');
    root.className='review-motion-guide';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','사진 평가 방법');
    root.innerHTML='<button class="guide-skip">건너뛰기</button><div class="guide-copy"><span class="guide-step"></span><h2 aria-live="polite"></h2><p class="guide-method"></p></div><svg class="guide-arrows" aria-hidden="true"><defs><marker id="review-guide-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L8 5L1 9" fill="none" stroke="white" stroke-width="1.6"/></marker></defs><path class="guide-drag-arrow"/><path class="guide-button-arrow"/></svg><div class="guide-target"></div><div class="guide-footer"><p>버튼으로도 평가할 수 있어요</p><div class="guide-button-legend"><span>× 별로</span><span class="guide-legend-keep">♡ 좋음</span><span>✦ 매우 좋음</span></div><small>안내 중에는 사진 이동·평가가 실행되지 않아요</small><button class="guide-next">다음</button></div>';
    const ghost=image.cloneNode();ghost.className='guide-photo';ghost.setAttribute('aria-hidden','true');ghost.alt='';root.prepend(ghost);
    const hidden=[...modal.children].map(node=>({node,inert:node.inert,aria:node.getAttribute('aria-hidden')}));
    hidden.forEach(({node})=>{node.inert=true;node.setAttribute('aria-hidden','true');});
    const steps=[
      {title:'왼쪽으로 밀면 다음 사진',method:'← 사진 드래그 ↔ 상단 › 버튼 · 다음 사진',selector:'#next',dx:-1,dy:0},
      {title:'오른쪽으로 밀면 이전 사진',method:'사진 드래그 → ↔ 상단 ‹ 버튼 · 이전 사진',selector:'#previous',dx:1,dy:0},
      {title:'아래로 내리면 좋음',method:'↓ 사진 드래그 ↔ ♡ 버튼 · 좋음',selector:'[data-rate="keep"]',dx:0,dy:1}
    ];
    const g={root,ghost,hidden,image,visibility:image.style.visibility,focus:document.activeElement,index:0,timer:null,animation:null,resize:null,layout:null};current=g;image.style.visibility='hidden';window.photoGuideActive=true;modal.appendChild(root);
    const render=()=>{
      if(current!==g)return;
      clearTimeout(g.timer);g.animation?.cancel();const step=steps[g.index];root.dataset.step=String(g.index);
      root.querySelector('.guide-step').textContent=`${g.index+1} / 3`;
      root.querySelector('h2').textContent=step.title;root.querySelector('.guide-method').textContent=step.method;
      root.querySelector('.guide-next').textContent=g.index===2?'시작하기':'다음';
      g.layout();
      if(!reduce.matches){
        const distance=step.dy?55:Math.min(72,image.offsetWidth*.2),angle=step.dx*7;
        g.animation=ghost.animate([{transform:'translate(0,0) rotate(0deg) scale(1)'},{offset:.25,transform:'translate(0,0) rotate(0deg) scale(1)'},{offset:.65,transform:`translate(${step.dx*distance}px,${step.dy*distance}px) rotate(${angle}deg) scale(.93)`},{offset:.8,transform:`translate(${step.dx*distance}px,${step.dy*distance}px) rotate(${angle}deg) scale(.93)`},{transform:'translate(0,0) rotate(0deg) scale(1)'}],{duration:2000,easing:'cubic-bezier(.4,0,.2,1)'});
        if(g.index<2)g.timer=setTimeout(()=>{g.index++;render();},2300);
      }
    };
    g.layout=()=>{
      if(current!==g||!image.isConnected)return;
      const bounds=modal.getBoundingClientRect(),r=image.getBoundingClientRect(),step=steps[g.index];
      const x=r.left-bounds.left,y=r.top-bounds.top,w=image.offsetWidth,h=image.offsetHeight;
      Object.assign(ghost.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});
      const target=(step.dy?root.querySelector('.guide-legend-keep'):modal.querySelector(step.selector)).getBoundingClientRect(),t={x:target.left-bounds.left,y:target.top-bounds.top,w:target.width,h:target.height};
      Object.assign(root.querySelector('.guide-target').style,{left:t.x+'px',top:t.y+'px',width:t.w+'px',height:t.h+'px'});
      const cx=x+w/2,cy=y+h*.48;
      root.querySelector('.guide-drag-arrow').setAttribute('d',step.dy?`M${cx} ${cy-32}V${cy+65}`:`M${cx-step.dx*40} ${cy}H${cx+step.dx*65}`);
      const fromY=step.dy?Math.min(y+h-36,bounds.height-150):138;
      root.querySelector('.guide-button-arrow').setAttribute('d',step.dy?`M${bounds.width*.8} ${t.y-55} Q${bounds.width*.8} ${t.y+t.h/2} ${t.x+t.w+6} ${t.y+t.h/2}`:`M16 150 Q16 34 ${t.x+t.w/2} ${t.y+t.h/2}`);
    };
    root.querySelector('.guide-skip').onclick=()=>window.hidePhotoGuide(true);
    root.querySelector('.guide-next').onclick=()=>{if(g.index===2)window.hidePhotoGuide(true);else{g.index++;render();}};
    root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();window.hidePhotoGuide(true);}if(e.key==='Tab'){e.preventDefault();const skip=root.querySelector('.guide-skip'),next=root.querySelector('.guide-next');(document.activeElement===skip?next:skip).focus();}});
    g.resize=new ResizeObserver(g.layout);g.resize.observe(modal);window.addEventListener('resize',g.layout);render();
    root.querySelector('.guide-skip').focus();
  };
})();
