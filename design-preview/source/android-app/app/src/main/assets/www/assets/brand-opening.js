/* One opening per document launch; returning from the picker never replays it. */
(() => {
  const splash=document.getElementById('brand-opening');
  if(!splash)return;
  const image=splash.querySelector('img'), main=document.querySelector('main');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const previousHidden=main.getAttribute('aria-hidden'), previousInert=main.inert;
  let done=false, started=false, timer=null, watchdog=null;
  main.inert=true;main.setAttribute('aria-hidden','true');main.classList.add('opening-home-pending');
  const finish = immediate => {
    if(done)return;done=true;
    clearTimeout(timer);clearTimeout(watchdog);
    image.onload=null;image.onerror=null;
    document.removeEventListener('visibilitychange',onVisibility);
    document.removeEventListener('keydown',onKey);
    const restore=()=>{
      splash.remove();main.inert=previousInert;main.classList.remove('opening-home-pending');
      if(!immediate&&!reduced.matches){main.classList.add('opening-home-enter');setTimeout(()=>main.classList.remove('opening-home-enter'),280);}
      if(previousHidden===null)main.removeAttribute('aria-hidden');else main.setAttribute('aria-hidden',previousHidden);
      document.dispatchEvent(new CustomEvent('photopick-opening-complete'));
    };
    if(immediate||reduced.matches)restore();else{splash.classList.add('is-leaving');setTimeout(restore,220);}
  };
  const onVisibility=()=>{if(document.hidden)finish(true);};
  const onKey=e=>{if(e.key==='Escape'){e.preventDefault();finish(false);}};
  const start = failed => {
    if(done||started)return;started=true;clearTimeout(watchdog);
    if(failed)splash.classList.add('is-fallback');
    splash.classList.add(reduced.matches||failed?'is-static':'is-playing');
    timer=setTimeout(()=>finish(false),reduced.matches||failed?220:1350);
  };
  splash.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();finish(false);});
  document.addEventListener('keydown',onKey);
  document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('pagehide',()=>finish(true),{once:true});
  const ready=()=>{
    if(document.hidden){finish(true);return;}
    watchdog=setTimeout(()=>start(true),600);
    image.onload=()=>start(false);image.onerror=()=>start(true);
    if(image.complete)start(!image.naturalWidth);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
