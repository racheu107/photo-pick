/* Review scope uses original photo IDs: switching dates never discards ratings. */
(() => {
  const baseRender = render, baseActivate = activateCandidate, basePersist = persist;
  const baseBind = bind, baseBack = goBack, baseHome = home;
  const placeNames = new Map();
  let dateDraft = null;
  let resuming = false;
  let groupResize = null;
  let albumScroll = 0;
  let pendingNavigation = null;
  const HISTORY_LIMIT = 40;
  // Retire d14's separate final selection without changing any photo ratings.
  delete state.bestShots;
  if (saved) delete saved.bestShots;
  const gradeValid = value => value === null || ['skip','keep','best'].includes(value);
  const historyValid = entry => entry && Number.isInteger(entry.index) && entry.index >= 0 && entry.index < total() && Array.isArray(entry.changes) && entry.changes.every(change => Number.isInteger(change.id) && change.id >= 0 && change.id < total() && gradeValid(change.before) && gradeValid(change.after));
  const restoreHistory = () => {
    if (Array.isArray(state.previewHistory)) {
      state.history = state.previewHistory.filter(historyValid).slice(-HISTORY_LIMIT);
      delete state.previewHistory;
    } else if (state.history.some(entry => entry.ratings)) {
      const snapshots = state.history.slice(-HISTORY_LIMIT);
      state.history = snapshots.map((entry, offset) => {
        const after = snapshots[offset + 1]?.ratings || state.ratings;
        const changes = [...new Set([...Object.keys(entry.ratings), ...Object.keys(after)])].filter(id => entry.ratings[id] !== after[id]).map(id => ({id:Number(id), before:entry.ratings[id] || null, after:after[id] || null}));
        return {index:entry.index, changes};
      }).filter(historyValid);
    }
  };
  restoreHistory();
  const pushHistory = entry => { state.history.push(entry); state.history = state.history.slice(-HISTORY_LIMIT); };
  const currentId = () => modalId === null ? state.index : modalId;
  const busy = () => !!window.isPhotoMotionBusy?.();
  const haptic = () => { if (window.PhotoPickAndroid?.ratingHaptic) window.PhotoPickAndroid.ratingHaptic(); else navigator.vibrate?.(12); };
  window.previewCancelNavigation = () => { pendingNavigation = null; };
  window.previewCommitNavigation = id => {
    if (!pendingNavigation || pendingNavigation.target !== id) return;
    if (pendingNavigation.undo) {
      const previous = state.history.pop();
      previous.changes.forEach(change => { if (change.before) state.ratings[change.id] = change.before; else delete state.ratings[change.id]; });
    } else if (!pendingNavigation.recorded) pushHistory(pendingNavigation.entry);
    pendingNavigation = null;
  };
  const setFocus = enabled => {
    document.querySelector('.phone').classList.toggle('photo-focus', enabled);
    window.PhotoPickAndroid?.setPhotoFocus?.(enabled);
  };
  window.closePhotoFocus = () => {
    window.previewCancelNavigation();
    window.cancelPhotoMotion?.(); setFocus(false); modalId = null; render();
    const album = app.querySelector('.album-grid'); if (album) album.scrollTop = albumScroll;
  };
  const nativeBack = window.nativeBack;
  if (nativeBack) window.nativeBack = () => { if (layer.querySelector('.focus-review')) closePhotoFocus(); else nativeBack(); };
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && layer.querySelector('.focus-review')) {
      event.preventDefault(); event.stopImmediatePropagation(); closePhotoFocus();
    }
  }, true);
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
    const undoItem = layer.querySelector('#menu-undo');
    if (undoItem) {
      undoItem.disabled = !state.ratings[currentId()];
      undoItem.textContent = '현재 사진 평가 초기화';
    }
    if (state.screen === 'home' && window.PhotoPickAndroid?.checkUpdates) {
      layer.querySelector('#close-sheet').insertAdjacentHTML('beforebegin', '<button class="cta secondary" id="check-update">앱 업데이트 확인</button>');
      layer.querySelector('#check-update').onclick = () => { layer.innerHTML=''; PhotoPickAndroid.checkUpdates(); };
    }
    if (state.screen === "groups") layer.querySelector("#menu-home").onclick = returnHome;
  };
  demoPhotos.forEach(p => { p.captureDate = p.id < 3 ? '2026-10-08' : p.id < 8 ? '2026-10-06' : '2026-10-07'; });
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
    return [...groups.values()].sort((a,b) => a.key === 'unknown' ? (b.key === 'unknown' ? 0 : 1) : b.key === 'unknown' ? -1 : b.key.localeCompare(a.key));
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
    restoreHistory();
    const history = state.history;
    state.history = [];
    basePersist();
    state.history = history;
    saved.reviewDates = state.reviewDates || [];
    saved.previewHistory = history.slice(-HISTORY_LIMIT);
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (_) { storageOK = false; }
    saved.history = history.slice(-HISTORY_LIMIT);
  };
  const refreshRating = () => {
    const id = currentId();
    const status = layer.querySelector('#focus-status'); if (status) status.textContent = '';
    layer.querySelectorAll('[data-rate]').forEach(button => {
      const active = button.dataset.rate === 'keep' ? ['keep','best'].includes(state.ratings[id]) : state.ratings[id] === button.dataset.rate;
      button.disabled = false; button.classList.remove('chosen'); button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
    });
    const undoButton = layer.querySelector('#focus-undo');
    if (undoButton) {
      undoButton.disabled = !state.ratings[id];
      const name = '현재 사진 평가 초기화';
      undoButton.setAttribute('aria-label', name); undoButton.title = name;
    }
  };
  const setRating = (id, value) => {
    const before = state.ratings[id] || null;
    if (before === value) return [];
    if (value) state.ratings[id] = value; else delete state.ratings[id];
    state.hintSeen = true;
    return [{id, before, after:value}];
  };
  window.previewNextUnrated = id => {
    const ids = reviewIds(), offset = ids.indexOf(id);
    if (offset < 0) return undefined;
    return ids.slice(offset + 1).find(next => !state.ratings[next]) ??
      ids.slice(0, offset).find(next => !state.ratings[next]);
  };
  const advanceAfterRating = id => {
    const target = window.previewNextUnrated(id);
    window.prepareRatingTransition?.(id, state.ratings[id]);
    if (target !== undefined) {
      pendingNavigation = {target, recorded:true};
      openPhoto(target, true);
    } else {
      const complete = () => { state.screen = 'summary'; persist(); render(); };
      if (window.finishRatingTransition) window.finishRatingTransition(id, state.ratings[id], complete);
      else complete();
    }
  };
  window.previewRate = (id, value) => {
    if (busy() || pendingNavigation || id !== currentId() || !reviewIds().includes(id) || !['skip','keep','best'].includes(value)) return false;
    const existing = state.ratings[id];
    const next = value === 'best' ? (existing === 'best' ? 'keep' : 'best') : value === 'keep' ? (['keep','best'].includes(existing) ? null : 'keep') : (existing === 'skip' ? null : 'skip');
    const changes = setRating(id, next);
    pushHistory({index:id, changes}); persist(); refreshRating(); haptic();
    if (next) advanceAfterRating(id);
    return true;
  };
  window.previewNavigate = delta => {
    if (busy() || pendingNavigation || ![-1,1].includes(delta)) return false;
    const id = currentId(), ids = reviewIds(), offset = ids.indexOf(id), target = ids[offset + delta];
    if (offset < 0 || target === undefined) return false;
    pendingNavigation = {target, entry:{index:id, changes:[]}, recorded:false};
    openPhoto(target, true); return true;
  };
  window.previewSwipeGood = () => {
    if (busy() || pendingNavigation) return false;
    const id = currentId(), ids = reviewIds(), offset = ids.indexOf(id);
    if (offset < 0) return false;
    const changes = setRating(id, state.ratings[id] === 'best' ? 'best' : 'keep');
    const target = window.previewNextUnrated(id);
    if (changes.length || target !== undefined) pushHistory({index:id, changes});
    persist(); refreshRating(); if (changes.length) haptic();
    advanceAfterRating(id);
    return true;
  };
  window.previewReset = () => {
    if (busy() || pendingNavigation) return false;
    const id = currentId();
    if (!state.ratings[id]) return false;
    setRating(id, null);
    restoreHistory();
    state.history = state.history.flatMap(entry => {
      const changes = entry.changes.filter(change => change.id !== id);
      return entry.changes.length && !changes.length ? [] : [{...entry, changes}];
    });
    persist();
    if (modalId === null) render(); else {
      refreshRating();
      const status = layer.querySelector('#focus-status');
      if (status) status.textContent = '이 사진의 평가를 초기화했어요.';
    }
    haptic(); return true;
  };
  window.previewUndo = window.previewReset;
  undo = window.previewUndo;
  rate = value => window.previewRate(currentId(), value);
  update = (id, value, advance = false) => {
    if (id !== currentId() || busy()) return;
    if (advance) { window.previewSwipeGood(); return; }
    const changes = setRating(id, value); if (!changes.length) return;
    pushHistory({index:id, changes}); persist(); refreshRating();
  };
  activateCandidate = function(candidate, same) {
    baseActivate(candidate, same);
    restoreHistory();
    if (!same) { state.reviewDates = []; placeNames.clear(); }
    if (state.dataset === 'demo') sourcePhotos.forEach(p => { p.captureDate = p.id < 3 ? '2026-10-08' : p.id < 8 ? '2026-10-06' : '2026-10-07'; });
    dateDraft = null; state.screen = resuming && same && state.reviewDates.length ? 'pick' : 'groups';
    if (state.screen === 'pick' && !reviewIds().includes(state.index)) state.index = firstUnrated();
    state.mode = 'grid'; resuming = false; persist(); render();
    const keys = reviewGroups().map(g => g.photos.find(p => p.hasLocation)?.nativeKey).filter(Boolean);
    if (keys.length && window.PhotoPickAndroid?.describePlaces) PhotoPickAndroid.describePlaces(JSON.stringify(keys));
  };
  window.onNativePlaces = result => {
    Object.entries(result.places || {}).forEach(([key, name]) => placeNames.set(key, name));
    if (state.screen === 'groups' && !layer.innerHTML) render();
  };
  const goGroups = () => { dateDraft=null; state.screen = 'groups'; render(); };
  openPhoto = function(id, preserveAlbumPosition = false) {
    const ids=reviewIds(), offset=ids.indexOf(id);
    if (offset < 0 || !sourcePhotos[id]) return;
    if (modalId === null && !preserveAlbumPosition) albumScroll = app.querySelector('.album-grid')?.scrollTop || 0;
    window.cancelPhotoMotion?.();
    const existing = layer.querySelector('.focus-review');
    modalId=id; state.index=id; persist();
    if (!existing) { setFocus(true);
    layer.innerHTML=`<div class="modal focus-review" role="dialog" aria-modal="true" aria-label="한 장씩 사진 평가"><div class="detail-top"><button id="close-detail" class="detail-return" aria-label="앨범으로 돌아가기">${uiIcon('back')}<span>되돌아가기</span></button><div class="detail-navigation"><button id="previous" ${offset<=0?'disabled':''} aria-label="이전 사진">‹</button><span>${offset+1} / ${ids.length}</span><button id="next" ${offset>=ids.length-1?'disabled':''} aria-label="다음 사진">›</button></div><button id="detail-results">평가결과</button></div>${card(sourcePhotos[id])}<p id="focus-status" class="preview-status" role="status" aria-live="polite"></p></div>`;
    } else {
      existing.querySelector('.photo-viewport').innerHTML=img(sourcePhotos[id]);
      existing.querySelector('.detail-navigation span').textContent=`${offset+1} / ${ids.length}`;
      existing.querySelector('#previous').disabled=offset<=0;
      existing.querySelector('#next').disabled=offset>=ids.length-1;
      existing.querySelector('#focus-status').textContent='';
      existing.querySelectorAll('[data-rate]').forEach(button=>{
        button.disabled=false; button.classList.remove('chosen');
        const active=button.dataset.rate==='keep'?['keep','best'].includes(state.ratings[id]):state.ratings[id]===button.dataset.rate;
        button.classList.toggle('active',active);
        button.setAttribute('aria-pressed',String(active));
      });
    }
    layer.querySelector('#close-detail').onclick=closePhotoFocus;
    layer.querySelector('#previous').onclick=()=>window.previewNavigate(-1);
    layer.querySelector('#next').onclick=()=>window.previewNavigate(1);
    layer.querySelector('#detail-results').onclick=()=>{ window.previewCancelNavigation(); window.cancelPhotoMotion?.(); state.screen='summary'; persist(); render(); };
    layer.querySelectorAll('[data-rate]').forEach(button=>button.onclick=()=>rate(button.dataset.rate));
    layer.querySelector('#focus-undo').onclick=window.previewUndo;
    refreshRating();
    bindSwipe(layer.querySelector('.card'));
  };
  const baseSummary = summary;
  summary = function() {
    baseSummary();
    const c = counts(), combined = c.keep + c.best;
    const allButton = app.querySelector('[data-scope="combined"]');
    if (allButton) allButton.textContent = `선택 사진 전체 ${combined}장`;
    app.querySelector('.summary-counts')?.insertAdjacentHTML('beforebegin', `<p class="preview-selection-total">선택 ${combined}장 · 그중 매우 좋음 ${c.best}장</p>`);
    const download = app.querySelector('#import');
    if (download) download.innerHTML = uiIcon('download') + selected().length + '장 사진 다운로드';
  };
  header = function() {
    const ids = reviewIds(), c = counts();
    const titles = {home:'Photo Pick', groups:'사진그룹 선택', scan:'사진 읽기', pick:'사진 평가', summary:'평가 결과', transfer:'사진 저장', ready:'저장 결과'};
    const h = document.querySelector('#screen-header');
    h.dataset.screen = state.screen;
    h.innerHTML = `<button class="icon-button" id="screen-back" aria-label="뒤로가기">${uiIcon('back')}</button><div><h1>${titles[state.screen]}</h1>${state.screen === 'summary' ? `<p>${ids.length-c.unrated} / ${ids.length}장 평가 완료</p>` : ''}</div><button class="icon-button" id="screen-menu" aria-label="메뉴">${uiIcon('menu')}</button>`;
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
  const previewButton = (p, grade) => {
    const active=grade==='keep'?['keep','best'].includes(state.ratings[p.id]):state.ratings[p.id]===grade;
    return `<button class="action preview-action ${grade==='keep'?'good':grade==='best'?'best':''} ${active?'active':''}" data-rate="${grade}" aria-label="${labels[grade]}" aria-pressed="${active}">${icon(grade)}<span class="preview-action-label">${labels[grade]}</span></button>`;
  };
  card = p => `<div class="photo-stage"><div class="card ${state.dataset==='demo'?'demo-card':'real-card'}" id="photo-card"><div class="photo-viewport">${img(p)}</div></div><div class="overlay"><button id="focus-undo" class="preview-undo" aria-label="현재 사진 평가 초기화" ${state.ratings[p.id]?'':'disabled'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6.1 6.1a8 8 0 0 1 13 3.4M4.9 14.5a8 8 0 0 0 13 3.4"/></svg></button><div class="preview-rating-group">${previewButton(p,'skip')}${previewButton(p,'keep')}</div>${previewButton(p,'best')}</div></div>`;
  pick = function() {
    state.mode='grid';
    const c=counts(), ids=reviewIds(), shown=albumPhotos();
    app.innerHTML=`<div class="review-context"><button class="subtle" id="groups">${state.reviewDates?.length===1 ? dateTitle(state.reviewDates[0]) : '사진그룹 선택'} ${uiIcon('right')}</button><span>${ids.length-c.unrated} / ${ids.length}장 평가</span></div><p class="album-intro">사진을 누르면 한 장씩 평가할 수 있어요.</p><div class="album-filters">${[['all','전체',ids.length],['unrated','미평가',c.unrated],['best','매우 좋음',c.best],['keep','좋음',c.keep],['skip','별로',c.skip]].map(([v,label,n])=>`<button data-albumfilter="${v}" class="${state.albumFilter===v?'active':''}" aria-pressed="${state.albumFilter===v}">${label} ${n}</button>`).join('')}</div>${shown.length ? `<div class="grid album-grid">${shown.map(tile).join('')}</div>` : '<div class="empty">이 등급의 사진이 없어요.</div>'}<button class="review-results" id="summary">평가 결과 ${uiIcon('right')}</button>`;
  };
  function groupsScreen() {
    const groups = reviewGroups();
    const chosen = dateDraft ?? [];
    const amount = groups.filter(g => chosen.includes(g.key)).reduce((sum,g) => sum+g.photos.length, 0);
    const scrollTop = app.querySelector('.date-groups')?.scrollTop || 0;
    app.innerHTML = `<div class="group-intro-row"><p class="group-intro">평가할 촬영일자 그룹을 선택하세요.${state.dataset==='demo' ? '<small>예시 촬영일로 구성된 체험 사진이에요.</small>' : ''}</p><button class="cta secondary group-quick-start" id="start-group-review-top" data-group-start ${amount ? '' : 'disabled'}>선택한 ${amount}장 평가</button></div><div class="group-selection"><button class="subtle" id="select-all-dates" aria-pressed="${chosen.length === groups.length}">${chosen.length === groups.length ? '전체 해제' : '전체 선택'}</button><span>총 사진 ${total()}장</span></div><div class="group-list-area"><div class="date-groups" tabindex="0" role="region" aria-label="촬영일자 그룹 목록">${groups.map(g => {
      const location = g.photos.map(p => placeNames.get(p.nativeKey)).find(Boolean);
      return `<label class="date-group"><input type="checkbox" data-date="${g.key}" ${chosen.includes(g.key)?'checked':''}><span class="date-check">${uiIcon('check')}</span><div class="group-thumbnail">${img(g.photos[0])}</div><div class="group-copy"><b>${dateTitle(g.key)}</b>${location ? `<span class="group-place">${esc(location)} · 일부 사진의 위치 정보</span>` : ''}<small>평가(${g.photos.filter(p=>state.ratings[p.id]).length}/${g.photos.length}장)</small></div></label>`;
    }).join('')}</div><div class="group-scrollbar" aria-hidden="true"><i></i></div></div><div class="group-footer"><button class="cta" id="start-group-review" data-group-start ${amount ? '' : 'disabled'}>선택한 ${amount}장 평가</button><p class="hint">촬영일 정보는 카메라에 기록된 날짜를 사용해요.</p></div>`;
    const sync = () => {
      const keys = [...app.querySelectorAll('[data-date]:checked')].map(input => input.dataset.date);
      dateDraft = keys;
      const toggle = document.querySelector('#select-all-dates');
      const all = keys.length === groups.length;
      toggle.textContent = all ? '전체 해제' : '전체 선택'; toggle.setAttribute('aria-pressed', String(all));
      const n = sourcePhotos.filter(p => keys.includes(dateKey(p))).length;
      app.querySelectorAll('[data-group-start]').forEach(start => { start.disabled = !n; start.textContent = `선택한 ${n}장 평가`; });
    };
    app.querySelectorAll('[data-date]').forEach(input => input.onchange = sync);
    document.querySelector('#select-all-dates').onclick = () => { const all = app.querySelectorAll('[data-date]:checked').length === groups.length; app.querySelectorAll('[data-date]').forEach(input => input.checked=!all); sync(); };
    app.querySelectorAll('[data-group-start]').forEach(start => start.onclick = () => {
      state.reviewDates = [...app.querySelectorAll('[data-date]:checked')].map(input => input.dataset.date);
      state.history = []; state.mode = 'grid'; state.albumFilter = 'all'; state.index = firstUnrated();
      state.screen = 'pick'; persist(); render();
    });
    const list = app.querySelector('.date-groups'), rail = app.querySelector('.group-scrollbar'), thumb = rail.querySelector('i');
    const updateScroll = () => {
      const overflow = list.scrollHeight - list.clientHeight;
      rail.hidden = overflow <= 1;
      if (overflow <= 1) return;
      const height = Math.max(24, rail.clientHeight * list.clientHeight / list.scrollHeight);
      thumb.style.height = height + 'px';
      thumb.style.transform = `translateY(${(rail.clientHeight-height) * list.scrollTop / overflow}px)`;
    };
    list.addEventListener('scroll', updateScroll, {passive:true});
    groupResize = new ResizeObserver(updateScroll); groupResize.observe(list);
    list.scrollTop = scrollTop; updateScroll();
    document.querySelector('#screen-back').onclick = returnHome;
    document.querySelector('#screen-menu').onclick = menuSheet;
  }
  render = function() {
    window.previewCancelNavigation();
    setFocus(false);
    if (groupResize) { groupResize.disconnect(); groupResize = null; }
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
      else if (!state.reviewDates.length) goGroups(); else { state={...fresh(),...saved,screen:'pick',mode:'grid',imported:[],progress:0}; restoreHistory(); if (!reviewIds().includes(state.index)) state.index=firstUnrated(); render(); }
    };
    const unrated = document.querySelector('#unrated'); if (unrated) unrated.onclick = () => { state.mode='grid'; state.albumFilter='unrated'; state.screen='pick'; persist(); render(); };
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
  goBack = function() { if (state.screen==='groups') returnHome(); else if (state.screen==='pick') goGroups(); else baseBack(); };
  render();
})();
