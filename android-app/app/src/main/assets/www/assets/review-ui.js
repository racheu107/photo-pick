/* Review scope uses original photo IDs: switching dates never discards ratings. */
(() => {
  const baseRender = render, baseActivate = activateCandidate, basePersist = persist;
  const baseBind = bind, baseBack = goBack, baseHome = home, baseOpen = openPhoto;
  const placeNames = new Map();
  let dateDraft = null;
  let resuming = false;
  const baseMenu = menuSheet;
  ['onNativeCancel', 'onNativeError'].forEach(name => {
    const callback = window[name];
    if (callback) window[name] = result => { resuming = false; callback(result); };
  });
  const returnHome = () => {
    layer.innerHTML = `<div class="sheet-backdrop"><section class="sheet" role="dialog" aria-modal="true" aria-label="다른 폴더 선택 확인"><h3>다른 폴더를 선택하시겠습니까?</h3><p>메인으로 돌아가도 평가 기록은 유지돼요.</p><button class="cta" id="confirm-home">메인으로 이동</button><button class="cta secondary" id="close-sheet">계속 선택하기</button></section></div>`;
    layer.querySelector("#close-sheet").onclick = () => { layer.innerHTML=""; };
    layer.querySelector("#confirm-home").onclick = () => { state.screen="home"; render(); };
  };
  menuSheet = function() {
    baseMenu();
    if (state.screen === "groups") layer.querySelector("#menu-home").onclick = returnHome;
  };
  demoPhotos.forEach(p => { p.captureDate = p.id < 5 ? '2026-10-06' : '2026-10-07'; });
  if (!Array.isArray(state.reviewDates)) state.reviewDates = [];
  const dateKey = photo => photo.captureDate || 'unknown';
  const dateTitle = key => key === 'unknown' ? '촬영일 정보 없음' : key.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) => `${y}년 ${Number(m)}월 ${Number(d)}일`);
  window.reviewIds = () => sourcePhotos.length ? sourcePhotos.filter(p => !state.reviewDates?.length || state.reviewDates.includes(dateKey(p))).map(p => p.id) : state.descriptors.map((_, id) => id);
  window.reviewGroups = () => {
    const groups = new Map();
    sourcePhotos.forEach(p => {
      const key = dateKey(p);
      if (!groups.has(key)) groups.set(key, {key, photos:[]});
      groups.get(key).photos.push(p);
    });
    return [...groups.values()].sort((a,b) => a.key.localeCompare(b.key));
  };
  counts = () => {
    const c = {skip:0, keep:0, best:0, unrated:0};
    reviewIds().forEach(id => c[state.ratings[id] || 'unrated']++);
    return c;
  };
  firstUnrated = () => reviewIds().find(id => !state.ratings[id]) ?? total();
  selected = () => {
    const ids = new Set(reviewIds());
    return sourcePhotos.filter(p => ids.has(p.id) && (state.ratings[p.id] === 'best' || (state.scope === 'combined' && state.ratings[p.id] === 'keep')));
  };
  albumPhotos = () => {
    const ids = new Set(reviewIds());
    return sourcePhotos.filter(p => ids.has(p.id) && (state.albumFilter === 'all' || (state.albumFilter === 'unrated' ? !state.ratings[p.id] : state.ratings[p.id] === state.albumFilter)));
  };
  persist = function() {
    basePersist();
    saved.reviewDates = state.reviewDates || [];
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (_) { storageOK = false; }
  };
  update = function(id, value, advance = false) {
    state.history.push({index:state.index, ratings:{...state.ratings}});
    if (value) state.ratings[id] = value; else delete state.ratings[id];
    state.hintSeen = true;
    if (advance) {
      const ids = reviewIds(), offset = ids.indexOf(id);
      state.index = ids.slice(offset + 1).find(next => !state.ratings[next]) ?? firstUnrated();
      if (state.index === total()) state.screen = 'summary';
    }
    persist(); render();
  };
  activateCandidate = function(candidate, same) {
    baseActivate(candidate, same);
    if (!same) { state.reviewDates = []; placeNames.clear(); }
    if (state.dataset === 'demo') sourcePhotos.forEach(p => { p.captureDate = p.id < 5 ? '2026-10-06' : '2026-10-07'; });
    dateDraft = null; state.screen = resuming && same && state.reviewDates.length ? (firstUnrated() === total() ? 'summary' : 'pick') : 'groups';
    if (state.screen === 'pick') state.index = firstUnrated();
    resuming = false; persist(); render();
    const keys = reviewGroups().map(g => g.photos.find(p => p.hasLocation)?.nativeKey).filter(Boolean);
    if (keys.length && window.PhotoPickAndroid?.describePlaces) PhotoPickAndroid.describePlaces(JSON.stringify(keys));
  };
  window.onNativePlaces = result => {
    Object.entries(result.places || {}).forEach(([key, name]) => placeNames.set(key, name));
    if (state.screen === 'groups' && !layer.innerHTML) render();
  };
  const goGroups = () => { dateDraft=null; state.screen = 'groups'; render(); };
  openPhoto = function(id) {
    baseOpen(id);
    const ids=reviewIds(), offset=ids.indexOf(id);
    const previous=layer.querySelector('#previous'), next=layer.querySelector('#next');
    previous.disabled=offset<=0; next.disabled=offset>=ids.length-1;
    previous.onclick=()=>openPhoto(ids[offset-1]); next.onclick=()=>openPhoto(ids[offset+1]);
    layer.querySelector('.detail-top span').textContent=`${offset+1} / ${ids.length}`;
  };
  header = function() {
    const ids = reviewIds(), c = counts();
    const titles = {home:'Photo Pick', groups:'사진그룹 선택', scan:'사진 읽기', pick:'사진 평가', summary:'평가 결과', transfer:'사진 저장', ready:'저장 결과'};
    const h = document.querySelector('#screen-header');
    h.dataset.screen = state.screen;
    h.innerHTML = `<button class="icon-button" id="screen-back" aria-label="${state.screen === 'pick' ? '이전 평가 되돌리기' : '이전 화면'}" ${state.screen === 'pick' && !state.history.length ? 'disabled' : ''}>${uiIcon('back')}${state.screen === 'pick' ? '<span>되돌리기</span>' : ''}</button><div><h1>${titles[state.screen]}</h1>${state.screen === 'summary' ? `<p>${ids.length-c.unrated} / ${ids.length}장 평가 완료</p>` : ''}</div><button class="icon-button" id="screen-menu" aria-label="메뉴">${uiIcon('menu')}</button>`;
  };
  home = function() {
    baseHome();
    const folder = document.querySelector('#folder');
    if (folder) folder.innerHTML = uiIcon('folder') + 'SD카드 연결 · 사진 읽기';
    const panel = app.querySelector('.resume-panel');
    if (panel && folder) {
      folder.insertAdjacentElement('afterend', panel);
      const n = reviewIds().length, c = counts();
      panel.innerHTML = `<button class="subtle blue" id="resume">이어서 평가 ${uiIcon('right')}</button><small>${esc(state.folderName)} · 평가(${n-c.unrated}/${n}장)</small>`;
    }
  };
  card = p => `<div class="photo-stage"><div class="card ${state.dataset==='demo'?'demo-card':'real-card'}" id="photo-card"><div class="photo-viewport">${img(p)}</div></div>${actions(p)}</div>`;
  pick = function() {
    const c = counts(), ids = reviewIds(), shown = albumPhotos();
    app.innerHTML = `<div class="review-context"><button class="subtle" id="groups">${state.reviewDates?.length === 1 ? dateTitle(state.reviewDates[0]) : '사진그룹 선택'} ${uiIcon('right')}</button><span>${state.mode === 'card' ? Math.min(ids.indexOf(state.index)+1 || ids.length, ids.length) : ids.length} / ${ids.length}</span></div><nav class="mode-switch" aria-label="사진 보기"><button data-mode="card" class="${state.mode==='card'?'active':''}" aria-pressed="${state.mode==='card'}">한 장씩</button><button data-mode="grid" class="${state.mode==='grid'?'active':''}" aria-pressed="${state.mode==='grid'}">앨범</button></nav>${state.mode === 'card' ? (state.index < total() ? card(sourcePhotos[state.index]) : '<div class="done-card"><div><h3>선택한 사진을 모두 평가했어요</h3><button class="subtle" id="review">다시 보기</button></div></div>') : `<div class="album-filters">${[['all','전체',ids.length],['unrated','미평가',c.unrated],['best','아주 좋음',c.best],['keep','좋음',c.keep],['skip','별로',c.skip]].map(([v,label,n])=>`<button data-albumfilter="${v}" class="${state.albumFilter===v?'active':''}" aria-pressed="${state.albumFilter===v}">${label} ${n}</button>`).join('')}</div>${shown.length ? `<div class="grid album-grid">${shown.map(tile).join('')}</div>` : '<div class="empty">이 등급의 사진이 없어요.</div>'}`}<button class="review-results" id="summary">평가 결과 ${uiIcon('right')}</button>${state.mode==='card' && !state.hintSeen ? '<p class="gesture-hint">두 손가락으로 확대 · 놓으면 원래 크기로</p>' : ''}`;
  };
  function groupsScreen() {
    const groups = reviewGroups();
    const chosen = dateDraft ?? [];
    const amount = groups.filter(g => chosen.includes(g.key)).reduce((sum,g) => sum+g.photos.length, 0);
    app.innerHTML = `<p class="group-intro">평가할 사진그룹을 선택하세요.${state.dataset==='demo' ? '<br>예시 촬영일로 구성된 체험 사진이에요.' : ''}</p><div class="group-selection"><span>사진 ${total()}장</span><button class="subtle" id="select-all-dates" aria-pressed="${chosen.length === groups.length}">${chosen.length === groups.length ? '전체 해제' : '전체 선택'}</button></div><div class="date-groups">${groups.map(g => {
      const location = g.photos.map(p => placeNames.get(p.nativeKey)).find(Boolean);
      return `<label class="date-group"><input type="checkbox" data-date="${g.key}" ${chosen.includes(g.key)?'checked':''}><span class="date-check">${uiIcon('check')}</span><div class="group-thumbnail">${img(g.photos[0])}</div><div class="group-copy"><b>${dateTitle(g.key)}</b>${location ? `<span class="group-place">${esc(location)} · 일부 사진의 위치 정보</span>` : ''}<small>평가(${g.photos.filter(p=>state.ratings[p.id]).length}/${g.photos.length}장)</small></div></label>`;
    }).join('')}</div><div class="group-footer"><button class="cta" id="start-group-review" ${amount ? '' : 'disabled'}>선택한 ${amount}장 평가</button><p class="hint">촬영일 정보는 카메라에 기록된 날짜를 사용해요.</p></div>`;
    const sync = () => {
      const keys = [...app.querySelectorAll('[data-date]:checked')].map(input => input.dataset.date);
      dateDraft = keys;
      const toggle = document.querySelector('#select-all-dates');
      const all = keys.length === groups.length;
      toggle.textContent = all ? '전체 해제' : '전체 선택'; toggle.setAttribute('aria-pressed', String(all));
      const n = sourcePhotos.filter(p => keys.includes(dateKey(p))).length;
      const start = document.querySelector('#start-group-review');
      start.disabled = !n; start.textContent = `선택한 ${n}장 평가`;
    };
    app.querySelectorAll('[data-date]').forEach(input => input.onchange = sync);
    document.querySelector('#select-all-dates').onclick = () => { const all = app.querySelectorAll('[data-date]:checked').length === groups.length; app.querySelectorAll('[data-date]').forEach(input => input.checked=!all); sync(); };
    document.querySelector('#start-group-review').onclick = () => {
      state.reviewDates = [...app.querySelectorAll('[data-date]:checked')].map(input => input.dataset.date);
      state.history = []; state.mode = 'card'; state.index = firstUnrated();
      state.screen = state.index === total() ? 'summary' : 'pick'; persist(); render();
    };
    document.querySelector('#screen-back').onclick = returnHome;
    document.querySelector('#screen-menu').onclick = menuSheet;
  }
  render = function() {
    if (state.screen !== 'groups') { baseRender(); return; }
    layer.innerHTML=''; modalId=null;
    document.querySelector('.phone').dataset.screen='groups'; header(); groupsScreen();
  };
  bind = function() {
    baseBind();
    const groups = document.querySelector('#groups'); if (groups) groups.onclick = goGroups;
    const folder = document.querySelector('#folder');
    if (folder && window.PhotoPickAndroid) folder.onclick = () => { resuming = false; PhotoPickAndroid.chooseAnotherFolder(); };
    const resumeButton = document.querySelector('#resume');
    if (resumeButton) resumeButton.onclick = () => {
      if (state.dataset === 'real' && !sourcePhotos.length && window.PhotoPickAndroid) { resuming = true; PhotoPickAndroid.chooseFolder(); }
      else if (!state.reviewDates.length) goGroups(); else resume();
    };
    const review = document.querySelector('#review'); if (review) review.onclick = () => { state.index=reviewIds()[0] ?? total(); render(); };
    const begin = document.querySelector('#begin'); if (begin) begin.onclick = goGroups;
    const menu = document.querySelector('#screen-menu');
    if (menu) {
      const base = menu.onclick;
      menu.onclick = () => {
        base?.();
        if (['pick','summary'].includes(state.screen)) {
          const close = document.querySelector('#close-sheet');
          if (close) close.insertAdjacentHTML('beforebegin','<button class="cta secondary" id="menu-groups">사진그룹 다시 선택</button>');
          const change = document.querySelector('#menu-groups'); if (change) change.onclick=goGroups;
        }
      };
    }
  };
  goBack = function() { if (state.screen==='groups') returnHome(); else baseBack(); };
  render();
})();
