/* Presentation only: keep rating persistence and native I/O in their existing modules. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const baseRender = render;
  const baseRate = rate;
  let pending = null;
  let view = '';

  render = function() {
    if (pending) { pending.cancel(); pending = null; }
    const nextView = state.screen + ':' + state.mode;
    const changed = nextView !== view;
    view = nextView;
    baseRender();
    if (changed && !reduced.matches) app.animate(
      [{opacity:0, transform:'translateY(6px)'}, {opacity:1, transform:'translateY(0)'}],
      {duration:180, easing:'cubic-bezier(.2,.7,.2,1)'}
    );
  };

  function feedback(el, value) {
    let stamp = el.querySelector('.choice-feedback');
    if (!stamp) {
      stamp = document.createElement('div');
      stamp.className = 'choice-feedback';
      stamp.setAttribute('aria-hidden', 'true');
      el.appendChild(stamp);
    }
    stamp.innerHTML = icon(value) + '<span>' + labels[value] + '</span>';
    stamp.dataset.grade = value;
  }

  rate = function(value) {
    if (pending) return;
    const el = document.querySelector(modalId === null ? '#app .card' : '#layer .card');
    if (!el || reduced.matches) { baseRate(value); return; }
    feedback(el, value);
    el.querySelectorAll('[data-rate]').forEach(button => {
      button.disabled = true;
      button.classList.toggle('chosen', button.dataset.rate === value);
    });
    const inDetail = modalId !== null;
    const target = inDetail ? 'scale(.99)' :
      value === 'best' ? 'translateY(-22px) scale(.98)' :
      'translateX(' + (value === 'keep' ? 26 : -26) + 'px) rotate(' + (value === 'keep' ? 2 : -2) + 'deg)';
    const animation = el.animate([
      {transform:el.style.transform || 'none', opacity:1},
      {transform:target, opacity:inDetail ? 1 : .65}
    ], {duration:170, easing:'cubic-bezier(.3,0,.25,1)', fill:'forwards'});
    pending = animation;
    animation.finished.then(() => {
      if (pending !== animation) return;
      pending = null;
      if (!el.isConnected) return;
      baseRate(value);
      const next = document.querySelector('#app .card');
      if (next && !reduced.matches) next.animate(
        [{opacity:.65, transform:'scale(.985)'}, {opacity:1, transform:'scale(1)'}],
        {duration:150, easing:'ease-out'}
      );
    }).catch(() => {});
  };

  bindSwipe = function(el) {
    if (!el) return;
    let start = null;
    const reset = () => {
      start = null;
      el.classList.remove('dragging');
      el.style.transform = '';
      el.querySelector('.choice-feedback')?.remove();
    };
    el.onpointerdown = e => {
      if (pending || e.target.closest('button') || !e.isPrimary) return;
      start = {x:e.clientX, y:e.clientY, id:e.pointerId};
      el.setPointerCapture?.(e.pointerId);
    };
    el.onpointermove = e => {
      if (!start || start.id !== e.pointerId) return;
      const dx = e.clientX-start.x, dy = e.clientY-start.y;
      if (!reduced.matches) {
        el.classList.add('dragging');
        el.style.transform = `translate(${Math.max(-60,Math.min(60,dx*.3))}px,${Math.max(-45,Math.min(20,dy*.25))}px) rotate(${Math.max(-4,Math.min(4,dx/45))}deg)`;
      }
      const value = Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>24 ? (dx>0?'keep':'skip') : dy<-24 && Math.abs(dy)>Math.abs(dx) ? 'best' : null;
      if (value) feedback(el,value); else el.querySelector('.choice-feedback')?.remove();
    };
    el.onpointerup = e => {
      if (!start || start.id !== e.pointerId) return;
      const dx = e.clientX-start.x, dy = e.clientY-start.y;
      start = null;
      const value = Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>55 ? (dx>0?'keep':'skip') : dy<-55 && Math.abs(dy)>Math.abs(dx) ? 'best' : null;
      if (value) rate(value); else reset();
    };
    el.onpointercancel = reset;
    el.onlostpointercapture = () => { if (start) reset(); };
  };
  render();
})();
