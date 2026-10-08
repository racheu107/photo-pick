/* ZIP STORE preserves original bytes. Read one chunk at a time for CRC32. */
(() => {
  const table=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0});
  let current=null;
  const clear=()=>{if(current)URL.revokeObjectURL(current.url);current=null};
  const header=size=>{const bytes=new Uint8Array(size);return {bytes,view:new DataView(bytes.buffer)}};
  const crc=async(file,cancelled)=>{let value=0xffffffff;for(let pos=0;pos<file.size;pos+=1048576){if(cancelled())throw Error('cancelled');const bytes=new Uint8Array(await file.slice(pos,pos+1048576).arrayBuffer());for(const b of bytes)value=table[(value^b)&255]^(value>>>8);await new Promise(resolve=>setTimeout(resolve,0));}return (value^0xffffffff)>>>0};
  const prepare=async(files,cancelled,progress)=>{
    clear();if(!files.length)throw Error('empty');
    if(files.length>65535||files.reduce((n,f)=>n+f.size+256,0)>0xffffffff)throw Error('large');
    let blob,name;
    if(files.length===1){if(cancelled())throw Error('cancelled');blob=files[0];name=files[0].name;progress(1,1)}
    else {
      const parts=[],central=[],names=new Set(),encoder=new TextEncoder();let offset=0;
      for(let i=0;i<files.length;i++){
        const file=files[i],checksum=await crc(file,cancelled);
        const original=file.name.replace(/[\\/\0]/g,'_')||`photo-${i+1}.jpg`;
        let unique=original,n=2;while(names.has(unique.toLowerCase())){const dot=original.lastIndexOf('.');unique=dot>0?`${original.slice(0,dot)} (${n++})${original.slice(dot)}`:`${original} (${n++})`;}names.add(unique.toLowerCase());
        const filename=encoder.encode(unique);if(filename.length>65535)throw Error('name');
        const date=new Date(file.lastModified||Date.now()),year=Math.max(1980,Math.min(2107,date.getFullYear()));
        const dosDate=((year-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate(),dosTime=(date.getHours()<<11)|(date.getMinutes()<<5)|Math.floor(date.getSeconds()/2);
        const local=header(30);local.view.setUint32(0,0x04034b50,true);local.view.setUint16(4,20,true);local.view.setUint16(6,0x0800,true);local.view.setUint16(10,dosTime,true);local.view.setUint16(12,dosDate,true);local.view.setUint32(14,checksum,true);local.view.setUint32(18,file.size,true);local.view.setUint32(22,file.size,true);local.view.setUint16(26,filename.length,true);
        const entry=header(46);entry.view.setUint32(0,0x02014b50,true);entry.view.setUint16(4,20,true);entry.view.setUint16(6,20,true);entry.view.setUint16(8,0x0800,true);entry.view.setUint16(12,dosTime,true);entry.view.setUint16(14,dosDate,true);entry.view.setUint32(16,checksum,true);entry.view.setUint32(20,file.size,true);entry.view.setUint32(24,file.size,true);entry.view.setUint16(28,filename.length,true);entry.view.setUint32(42,offset,true);
        parts.push(local.bytes,filename,file);central.push(entry.bytes,filename);offset+=30+filename.length+file.size;progress(i+1,files.length);
      }
      const centralSize=central.reduce((n,p)=>n+p.byteLength,0),end=header(22);
      if(offset+centralSize+22>0xffffffff)throw Error('large');
      end.view.setUint32(0,0x06054b50,true);end.view.setUint16(8,files.length,true);end.view.setUint16(10,files.length,true);end.view.setUint32(12,centralSize,true);end.view.setUint32(16,offset,true);
      blob=new Blob([...parts,...central,end.bytes],{type:'application/zip'});name='PhotoPick-'+new Date().toISOString().slice(0,10)+'.zip';
    }
    if(cancelled())throw Error('cancelled');
    current={url:URL.createObjectURL(blob),name,count:files.length,zip:files.length>1};return current;
  };
  window.PhotoPickWebDownload={prepare,clear,get current(){return current}};
})();
