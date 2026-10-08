/* Browser device adapter. Files and metadata stay in this tab. */
(() => {
  const files=new Map();let readToken=0,saving=false,cancelled=false;
  const choose=id=>{const input=document.querySelector(id);input.value='';input.click()};
  const read=async selection=>{
    if(!selection.length)return;
    const token=++readToken;window.onNativeReading();await new Promise(r=>setTimeout(r,0));
    const candidates=selection.filter(file=>/\.jpe?g$/i.test(file.name));
    const photos=[];window.onNativeReadingProgress({completed:0,total:candidates.length});
    try {
      for(let i=0;i<candidates.length;i++){
        if(token!==readToken){photos.forEach(p=>URL.revokeObjectURL(p.url));return;}
        const file=candidates[i],metadata=await PhotoPickExif(file);
        if(metadata.jpeg){
          const path=file.webkitRelativePath||file.name;
          const data=new TextEncoder().encode(`${path}:${file.size}:${file.lastModified}`);
          const hash=await crypto.subtle.digest('SHA-256',data),key=[...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');
          files.set(key,file);
          photos.push({key,path,name:file.name,size:file.size,mtime:file.lastModified,url:URL.createObjectURL(file),captureDate:metadata.captureDate,capturedAt:metadata.capturedAt,hasLocation:false});
        }
        window.onNativeReadingProgress({completed:i+1,total:candidates.length});
        await new Promise(r=>setTimeout(r,0));
      }
      if(token!==readToken){photos.forEach(p=>URL.revokeObjectURL(p.url));return;}
      const relative=candidates[0]?.webkitRelativePath||'';
      window.onNativePhotos({photos,folderName:relative?relative.split('/')[0]:'선택한 사진'});
    } catch(_){photos.forEach(p=>URL.revokeObjectURL(p.url));window.onNativeError({message:'사진을 읽지 못했어요. 파일을 다시 선택해 주세요.'})}
  };
  const save=async chosen=>{
    if(saving)return;saving=true;cancelled=false;
    try{await PhotoPickWebDownload.prepare(chosen,()=>cancelled,(completed,total)=>onNativeSaveProgress({completed,total}));
      onNativeSaveComplete({saved:chosen.length,skipped:0,failed:0,cancelled:false});
    }catch(error){if(cancelled)onNativeSaveComplete({saved:0,skipped:0,failed:0,cancelled:true});else onNativeError({message:error.message==='large'?'선택한 사진이 너무 많아요. 나누어서 다운로드해 주세요.':'다운로드 파일을 준비하지 못했어요. 사진을 다시 선택해 주세요.'})}
    finally{saving=false}
  };
  window.PhotoPickAndroid={
    chooseFolder:()=>choose('#directory-input'),chooseAnotherFolder:()=>choose('#directory-input'),chooseFiles:()=>choose('#files-input'),
    describePlaces:()=>{},setPhotoFocus:dark=>{document.documentElement.style.backgroundColor=dark?'#111317':'#ffffff';parent.postMessage({type:'photopick-focus',dark},location.origin)},
    savePhotos:keys=>{const chosen=JSON.parse(keys).map(key=>files.get(key));if(chosen.some(file=>!file)){onNativeError({message:'같은 사진 폴더를 다시 선택해 주세요.'});return;}save(chosen)},
    cancelSave:()=>{cancelled=true;if(!saving)onNativeSaveComplete({saved:0,skipped:0,failed:0,cancelled:true})},closeApp:()=>{},
    cancelRead:()=>{readToken++;onNativeCancel()}
  };
  window.readSelection=read;
  window.PhotoPickWebDevice={files,save,prune:keys=>{const live=new Set(keys);for(const key of files.keys())if(!live.has(key))files.delete(key)}};
})();
