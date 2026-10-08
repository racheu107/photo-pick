/* Android adapters: keep web rating state and replace device I/O only. */
(() => {
  const device = window.PhotoPickAndroid;
  if (!device) return;
  let saveOutcome = null;
  let saving = false;
  const originalRender = render;
  const originalActivate = activateCandidate;
  const originalImport = startImport;
  const originalAlbum = savedAlbum;
  const originalReady = ready;
  const originalBack = goBack;
  const originalBind = bind;

  function notice(message) {
    layer.innerHTML = `<div class="sheet-backdrop"><section class="sheet" role="dialog" aria-modal="true" aria-label="안내"><h3>Photo Pick</h3><p>${esc(message)}</p><button class="cta" id="close-sheet">확인</button></section></div>`;
    layer.querySelector('#close-sheet').onclick = () => { layer.innerHTML = ''; };
  }
  render = function() {
    originalRender();
    if (state.dataset === 'real') {
      if (state.screen === 'summary') {
        const button = document.querySelector('#import');
        if (button) button.innerHTML = uiIcon('download') + selected().length + '장 사진 저장';
        const hint = document.querySelector('.hint');
        if (hint) hint.textContent = '갤러리의 Photo Pick 앨범에 원본으로 저장해요.';
      }
      if (state.screen === 'transfer') {
        document.querySelector('#screen-header h1').textContent = '사진 저장';
        const title = document.querySelector('.transfer h3');
        if (title) title.textContent = 'Photo Pick 앨범에 저장 중';
        const copy = document.querySelector('.transfer p:last-child');
        if (copy) copy.textContent = '저장 중에는 SD카드를 분리하지 마세요.';
      }
      if (state.screen === 'ready') document.querySelector('#screen-header h1').textContent = '저장 결과';
    }
    if (saving) {
      document.querySelector('#screen-menu').disabled = true;
      const cancel = document.querySelector('#cancel');
      if (cancel) cancel.onclick = () => { device.cancelSave(); cancel.disabled = true; cancel.textContent = '저장을 중단하는 중…'; };
    }
  };
  activateCandidate = function(candidate, same) {
    if (!candidate.nativePhotos) return originalActivate(candidate, same);
    clearInterval(scanTimer); clearInterval(transferTimer); revokePhotos();
    sourcePhotos = candidate.nativePhotos.map((p, id) => ({id, label:p.name, mtime:p.mtime, url:p.url, nativeKey:p.key, captureDate:p.captureDate || '', capturedAt:p.capturedAt || '', hasLocation:!!p.hasLocation}));
    state = same ? {...fresh(), ...saved, screen:'scan', imported:[], progress:100} :
      {...fresh(), dataset:'real', descriptors:candidate.descriptors, folderName:candidate.folderName, session:'sd-jpeg-v1', screen:'scan', progress:100};
    homeMessage = ''; persist(); render();
  };
  confirmFolder = () => device.chooseAnotherFolder();
  bind = function() {
    originalBind();
    const files = document.querySelector('#files');
    if (files) files.onclick = () => device.chooseFiles();
  };
  startImport = function() {
    if (state.dataset !== 'real') return originalImport();
    const chosen = selected();
    if (!chosen.length || saving) return;
    if (chosen.some(p => !p.nativeKey)) { notice('같은 SD카드 폴더를 다시 선택해 주세요.'); return; }
    state.imported = chosen.map(p => ({...p}));
    state.screen = 'transfer'; state.progress = 0; saving = true; saveOutcome = null; render();
    device.savePhotos(JSON.stringify(chosen.map(p => p.nativeKey)));
  };
  ready = function() {
    if (!saveOutcome || state.dataset !== 'real') return originalReady();
    const r = saveOutcome;
    app.innerHTML = `<h2 class="screen-title">${r.failed ? '일부 사진을 저장하지 못했어요' : '사진을 저장했어요'}</h2><p class="screen-copy">${r.saved}장 저장 · ${r.skipped}장 이미 저장됨${r.failed ? ' · '+r.failed+'장 실패' : ''}</p><div class="destination-panel">${uiIcon('folder')}<div><b>Photo Pick</b><p>갤러리 · 원본 JPEG</p></div></div><div class="share-preview">${img(state.imported[0])}<span>선택한 사진 ${state.imported.length}장</span></div><button class="cta" id="saved-photos">선택한 사진 확인</button><button class="cta secondary" id="back">평가 화면으로</button>${r.failed ? '<p class="hint">저장 공간과 SD카드 연결을 확인한 뒤 결과 화면에서 다시 저장해 주세요. 이미 저장한 사진은 건너뛰어요.</p>' : ''}`;
  };
  savedAlbum = function() {
    if (state.dataset !== 'real') return originalAlbum();
    layer.innerHTML = `<div class="sheet-backdrop"><section class="sheet saved-sheet" role="dialog" aria-modal="true" aria-label="선택한 사진"><h3>선택한 사진 ${state.imported.length}장</h3><p>저장된 사진은 갤러리의 Photo Pick 앨범에서 확인하세요.</p><div class="grid">${state.imported.map(p => `<div class="tile">${img(p)}</div>`).join('')}</div><button class="cta secondary" id="close-sheet">닫기</button></section></div>`;
    layer.querySelector('#close-sheet').onclick = () => { layer.innerHTML = ''; };
  };
  goBack = function() { if (saving) { device.cancelSave(); return; } originalBack(); };
  window.nativeBack = () => {
    if (saving) { device.cancelSave(); return; }
    if (layer.innerHTML) { modalId = null; layer.innerHTML = ''; return; }
    if (state.screen === 'home') { device.closeApp(); return; }
    goBack();
  };
  window.onNativeReading = () => {
    layer.innerHTML = `<div class="reading-layer" role="status"><div class="reading-art" aria-hidden="true"><div class="reading-halo"></div>${['assets/seoul-01.png','assets/seoul-02.png','assets/seoul-03.png'].map((url,i)=>`<div class="reading-photo reading-photo-${i}"><img src="${url}" alt=""></div>`).join('')}</div><h2>사진 불러오는 중...</h2><small id="reading-count">사진 목록 확인 중</small><div class="reading-meter" role="progressbar" aria-label="사진 읽기 진행" aria-valuemin="0" aria-valuemax="100" hidden><i></i></div><div class="reading-tip"><b>사용 팁</b><p>사진을 두 손가락으로 확대해 확인하세요.<br>손을 놓으면 원래 크기로 돌아와요.</p></div></div>`;
  };
  window.onNativeReadingProgress = progress => {
    const count = document.querySelector('#reading-count');
    const meter = document.querySelector('.reading-meter');
    if (meter) {
      const known = Number.isFinite(progress.total) && progress.total > 0;
      meter.hidden = !known;
      if (known) {
        const percent = Math.max(0, Math.min(100, progress.completed / progress.total * 100));
        meter.querySelector('i').style.width = percent + '%';
        meter.setAttribute('aria-valuenow', String(Math.round(percent)));
      }
    }
    if (count) count.textContent = Number.isFinite(progress.total) ? `불러온 ${progress.completed}장 / 전체 ${progress.total}장` : `사진 목록 확인 중 · ${progress.discovered || 0}장 발견`;
  };
  window.onNativeCancel = () => { layer.innerHTML = ''; };
  window.onNativeError = result => {
    saving = false;
    if (state.screen === 'transfer') state.screen = 'summary';
    render(); notice(result.message);
  };
  window.onNativePhotos = result => {
    layer.innerHTML = '';
    if (!result.photos.length) { notice('JPEG 사진이 없어요. DCIM 등 사진이 있는 폴더를 선택해 주세요.'); return; }
    const photos = result.photos.sort((a,b) => (a.capturedAt || '9999').localeCompare(b.capturedAt || '9999') || a.path.localeCompare(b.path));
    confirmCandidate({dataset:'real', nativePhotos:photos, descriptors:photos.map(p => ({path:p.path,name:p.name,size:p.size,mtime:p.mtime})), folderName:result.folderName});
  };
  window.onNativeSaveProgress = progress => {
    if (state.screen !== 'transfer') return;
    state.progress = Math.round(progress.completed/progress.total*100);
    document.querySelector('#percent').textContent = state.progress+'%';
    document.querySelector('#transfer-bar').style.width = state.progress+'%';
    document.querySelector('#transfer-count').textContent = progress.completed+' / '+progress.total+'장';
  };
  window.onNativeSaveComplete = result => {
    saving = false; saveOutcome = result;
    state.screen = result.cancelled ? 'summary' : 'ready'; render();
    if (result.cancelled) notice(`저장을 중단했어요. ${result.saved}장은 저장됐고 ${result.skipped}장은 이미 저장되어 있어요. 다시 저장하면 중복 사진은 건너뛰어요.`);
  };
  render();
})();
