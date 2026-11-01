(async()=>{
 const base=new URL('./',document.currentScript.src).pathname,files=JSON.parse(document.currentScript.dataset.scripts);
 try{
 await navigator.serviceWorker.register(base+'sw.js',{scope:base});await navigator.serviceWorker.ready;
 if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
 const original=window.fetch.bind(window);window.fetch=async(input,options)=>{let url=new URL(typeof input==='string'?input:input.url,location.href);
 if(url.pathname===base+'api/assets'&&options?.body instanceof Blob&&['video','audio'].includes(url.searchParams.get('kind'))){const blob=options.body,objectUrl=URL.createObjectURL(blob),el=document.createElement(url.searchParams.get('kind'));el.preload='metadata';el.muted=true;try{await new Promise((resolve,reject)=>{el.onloadedmetadata=resolve;el.onerror=()=>reject(Error('この形式の素材を読み込めません。'));el.src=objectUrl});url.searchParams.set('duration',el.duration);url.searchParams.set('width',el.videoWidth||0);url.searchParams.set('height',el.videoHeight||0)}finally{el.removeAttribute('src');el.load();URL.revokeObjectURL(objectUrl)}}return original(url,options)};
 const config=await (await original(base+'runtime-config.json',{cache:'no-store'})).json();
 const banner=document.createElement('aside');banner.className='demo-banner';banner.textContent=config.mode==='demo'?'操作デモ · 生成APIは無効 · 登録素材はこのブラウザ内に保存':'API接続モード';document.body.prepend(banner);
 for(const file of files)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=base+file;s.onload=resolve;s.onerror=reject;document.body.append(s)});
 if(document.querySelector('#thumb-app')&&window.storeNav)document.querySelector('.shell').insertAdjacentHTML('beforeend',storeNav('thumbnails'));
 }catch(e){document.body.textContent='デモを開けませんでした。ブラウザの保存機能を有効にして再読み込みしてください。 '+e.message}
})();
