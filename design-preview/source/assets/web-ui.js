/* Browser wording and download actions, using the same review UI as Android. */
(() => {
  const baseRender=render,baseBind=bind,baseActivate=activateCandidate,baseMenu=menuSheet,baseBack=window.nativeBack;
  const apk='https://github.com/racheu107/photo-pick/releases/download/android-v0.2.7-preview/PhotoPick-0.2.7-debug.apk';
  const notify=()=>parent.postMessage({type:'photopick-navigation',canGoBack:state.screen!=='home'||!!layer.innerHTML},location.origin);
  menuSheet=function(){baseMenu();const close=layer.querySelector('#close-sheet');if(close)close.insertAdjacentHTML('beforebegin',`<a class="apk-link" href="${apk}" target="_blank" rel="noopener">Android 앱 다운로드</a>`)};
  activateCandidate=function(candidate,same){baseActivate(candidate,same);PhotoPickWebDownload.clear();PhotoPickWebDevice.prune(sourcePhotos.map(photo=>photo.nativeKey).filter(Boolean))};
  const baseConfirm=confirmCandidate;
  confirmCandidate=function(candidate){baseConfirm(candidate);const cancel=layer.querySelector('#close-sheet');if(cancel&&layer.querySelector('#confirm-new')){const previous=cancel.onclick;cancel.onclick=()=>{previous();candidate.nativePhotos?.forEach(photo=>URL.revokeObjectURL(photo.url));PhotoPickWebDevice.prune(sourcePhotos.map(photo=>photo.nativeKey).filter(Boolean))}}};
  render=function(){
    baseRender();
    if(state.screen==='home'){
      const folder=document.querySelector('#folder');if(folder)folder.innerHTML=uiIcon('folder')+'사진 폴더 선택';
      const step=document.querySelector('.connection-steps li:last-child p');if(step)step.textContent='브라우저에서 사진 폴더를 선택해 주세요.';
      const demo=document.querySelector('#demo');if(demo)demo.insertAdjacentHTML('afterend','<p class="hint">폴더 선택이 어려우면 사진 파일 선택을 이용하세요.</p>');
    }
    if(state.screen==='summary'){
      document.querySelector('#import').innerHTML=uiIcon('download')+selected().length+'장 다운로드 준비';
      const hint=app.querySelector('.hint');if(hint)hint.textContent=state.dataset==='demo'?'예시 사진은 PNG로 다운로드해요.':'한 장은 원본 JPEG, 여러 장은 ZIP으로 받아요.';
    }
    if(state.screen==='transfer'){
      document.querySelector('#screen-header h1').textContent='다운로드 준비';
      const title=app.querySelector('.transfer h3');if(title)title.textContent='원본 파일을 모으고 있어요';
      const copy=app.querySelector('.transfer p:last-child');if(copy)copy.textContent='사진은 서버로 업로드되지 않아요.';
      document.querySelector('#screen-menu').disabled=true;
      document.querySelector('#cancel').onclick=()=>PhotoPickAndroid.cancelSave();
    }
    if(state.screen==='ready')document.querySelector('#screen-header h1').textContent='다운로드';
    notify();
  };
  ready=function(){
    const file=PhotoPickWebDownload.current;
    if(!file){app.innerHTML='<p class="empty">다운로드할 사진을 다시 선택해 주세요.</p><button class="cta secondary" id="back">앨범으로 돌아가기</button>';return;}
    app.innerHTML=`<h2 class="screen-title">다운로드 준비 완료</h2><p class="screen-copy">고른 ${file.count}장을 파일로 준비했어요.</p><div class="download-card"><b>${file.zip?'원본 사진 ZIP':'사진 원본 파일'}</b><p>${esc(file.name)}</p></div><a class="download-action" href="${file.url}" download="${esc(file.name)}">${file.zip?'ZIP 파일':'사진'} 다운로드</a><button class="cta secondary" id="back">앨범으로 돌아가기</button><p class="hint">다운로드 위치는 브라우저 설정을 따라요.${file.zip?'<br>ZIP을 풀면 선택한 사진 원본을 확인할 수 있어요.':''}</p>`;
  };
  const originalImport=startImport;
  startImport=function(){
    if(state.dataset==='real')return originalImport();
    const chosen=selected();if(!chosen.length)return;
    state.imported=chosen.map(photo=>({...photo}));state.screen='transfer';state.progress=0;render();
    (async()=>{try{
      const files=[];
      for(const photo of chosen){const response=await fetch(photo.url);if(!response.ok)throw Error();const blob=await response.blob();files.push(new File([blob],`PhotoPick-example-${photo.id+1}.png`,{type:'image/png'}));}
      if(state.screen!=='transfer')return;await PhotoPickWebDevice.save(files);
    }catch(_){onNativeError({message:'예시 사진을 준비하지 못했어요. 다시 시도해 주세요.'})}})();
  };
  const completed=window.onNativeSaveComplete;
  window.onNativeSaveComplete=result=>{
    if(result.cancelled){PhotoPickWebDownload.clear();state.screen='summary';render();return;}
    completed(result);
  };
  window.nativeBack=()=>{
    if(layer.querySelector('.reading-layer')){PhotoPickAndroid.cancelRead();return;}
    if(state.screen==='transfer'){PhotoPickAndroid.cancelSave();return;}
    baseBack();
  };
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&layer.querySelector('.reading-layer')){event.preventDefault();event.stopImmediatePropagation();PhotoPickAndroid.cancelRead()}},true);
  new MutationObserver(notify).observe(layer,{childList:true});
  render();
})();
