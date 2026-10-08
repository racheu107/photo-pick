(() => {
  const frame=document.querySelector('#photo-pick-app');let guard=false,skip=false;
  window.addEventListener('message',event=>{
    if(event.source!==frame.contentWindow||event.origin!==location.origin)return;
    if(event.data?.type==='photopick-focus'){
      const dark=event.data.dark===true;
      document.querySelector('.app-preview').classList.toggle('focused',dark);
      document.body.classList.toggle('focused',dark);
      document.querySelector('meta[name="theme-color"]').content=dark?'#111317':'#ffffff';
    }
    if(event.data?.type==='photopick-navigation'){
      if(event.data.canGoBack&&!guard){history.pushState({photoPick:true},'');guard=true;}
      else if(!event.data.canGoBack&&guard){guard=false;skip=true;history.back();}
    }
  });
  window.addEventListener('popstate',()=>{
    if(skip){skip=false;return;}
    if(guard){guard=false;frame.contentWindow.nativeBack?.();}
  });
})();
