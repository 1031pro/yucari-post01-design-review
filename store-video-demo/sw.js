const BASE=new URL('./',self.location).pathname;
const dbp=new Promise((resolve,reject)=>{const r=indexedDB.open('store-video-public-demo-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
async function get(key){const db=await dbp;return new Promise((res,rej)=>{const r=db.transaction('records').objectStore('records').get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function put(key,val){const db=await dbp;return new Promise((res,rej)=>{const tx=db.transaction('records','readwrite');tx.objectStore('records').put(val,key);tx.oncomplete=()=>res(val);tx.onerror=()=>rej(tx.error)})}
async function list(prefix){const db=await dbp;return new Promise((res,rej)=>{const r=db.transaction('records').objectStore('records').openCursor();const rows=[];r.onsuccess=()=>{const c=r.result;if(!c)return res(rows);if(String(c.key).startsWith(prefix))rows.push(c.value);c.continue()};r.onerror=()=>rej(r.error)})}
const json=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
let seedp;const seed=()=>seedp||(seedp=fetch(BASE+'demo-data.json').then(r=>r.json()));
self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.origin===self.location.origin&&u.pathname.startsWith(BASE+'api/'))e.respondWith(handle(e.request,u).catch(err=>json({error:err.message},400)))});
async function handle(req,u){
 const configResponse=await fetch(BASE+'runtime-config.json',{cache:'no-store'});
 if(!configResponse.ok)throw Error('動作モードを取得できません。');
 const config=await configResponse.json();
 if(config.mode==='live'){
  if(!config.apiBase)throw Error('API接続先が未設定です。');
  const target=new URL(config.apiBase);
  if(target.protocol!=='https:'||target.username||target.password)throw Error('HTTPSのAPI接続先を設定してください。');
  target.pathname=target.pathname.replace(/\/$/,'')+'/'+u.pathname.slice(BASE.length);target.search=u.search;
  const headers=new Headers(req.headers);headers.delete('host');
  return fetch(target,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:await req.arrayBuffer(),credentials:'include',redirect:'error'});
 }
 if(config.mode!=='demo')throw Error('動作モードが正しくありません。');
 const route='/'+u.pathname.slice(BASE.length),parts=route.split('/'),data=await seed(),method=req.method;
 const write=['POST','PUT'].includes(method),b=write&&!route.startsWith('/api/assets')?await req.json():null;
 if(route==='/api/templates')return json(data.templates);
 if(route==='/api/voices')return json({people:await list('people/'),narrators:data.narrators,configured:false});
 if(route==='/api/jobs'&&method==='GET')return json([]);
 if(route==='/api/edit-capabilities')return json({contentAnalysis:false});
 if(route==='/api/drafts'&&method==='POST'){const t=data.templates.find(t=>t.id===b.templateId);if(!t)throw Error('種類を選んでください。');const d={id:crypto.randomUUID(),templateId:t.id,templateSnapshot:t,templateRevision:t.revision,brand:'',logoId:null,scenes:t.scenes.map(s=>({videoId:null,audioId:null,caption:s.caption,narration:s.narration,mute:false,voiceUse:'main'})),createdAt:new Date().toISOString()};return json(await put('drafts/'+d.id,d))}
 if(parts[2]==='drafts'&&parts[3]){const key='drafts/'+parts[3],d=await get(key);if(!d)throw Error('このブラウザに保存されたデータがありません。');if(method==='GET')return json(d);if(method==='PUT'){if(b.scenes.length!==d.scenes.length)throw Error('場面数を確認してください。');d.mainVoiceRef=b.mainVoiceRef||'';d.narratorVoiceRef=b.narratorVoiceRef||'';d.scenes=b.scenes.map(s=>({...s,voiceUse:s.voiceUse==='narrator'?'narrator':'main',voiceRef:s.voiceUse==='narrator'?d.narratorVoiceRef:d.mainVoiceRef}));return json(await put(key,d))}}
 if(route==='/api/people'&&method==='POST'){if(!b.name?.trim())throw Error('名前を入力してください。');const p={id:b.id||crypto.randomUUID(),name:b.name.slice(0,60),role:(b.role||'').slice(0,60),sampleIds:b.sampleIds||[],status:'draft'};return json(await put('people/'+p.id,p))}
 if(route==='/api/assets'&&method==='POST'){const blob=await req.blob(),kind=u.searchParams.get('kind');if(!['video','audio','image','logo'].includes(kind))throw Error('素材の種類が正しくありません。');if(blob.size>200000000)throw Error('素材は200MB以内にしてください。');const a={id:crypto.randomUUID(),kind,name:u.searchParams.get('name'),duration:Number(u.searchParams.get('duration'))||0,width:Number(u.searchParams.get('width'))||0,height:Number(u.searchParams.get('height'))||0,hasAudio:kind==='audio',audioUnverified:kind==='video',mime:blob.type};if(kind==='video'&&(a.duration<2||a.duration>45))throw Error('動画は2〜45秒で追加してください。');await put('media/'+a.id,blob);return json(await put('assets/'+a.id,a))}
 if(parts[2]==='assets'&&parts[3]&&method==='GET'){const id=parts[3],sample=data.narrators.find(n=>n.sampleAssetId===id);if(sample){if(parts[4]==='info')return json(sample.asset);return fetch(BASE+'audio/'+id+'.mp3')}
  const a=await get('assets/'+id);if(!a)throw Error('素材がありません。');if(parts[4]==='info')return json(a);if(parts[4]==='poster')return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="320"><rect width="180" height="320" fill="#e9e4df"/><path d="m72 135 40 25-40 25z" fill="#746e70"/></svg>',{headers:{'Content-Type':'image/svg+xml'}});
  const blob=await get('media/'+id),range=req.headers.get('range');if(range){const m=/bytes=(\d+)-(\d*)/.exec(range);if(!m)return new Response(null,{status:416});const start=+m[1],end=Math.min(m[2]?+m[2]:blob.size-1,blob.size-1);if(start>end)return new Response(null,{status:416});return new Response(blob.slice(start,end+1),{status:206,headers:{'Content-Type':a.mime,'Content-Range':`bytes ${start}-${end}/${blob.size}`,'Accept-Ranges':'bytes','Content-Length':end-start+1}})}return new Response(blob,{headers:{'Content-Type':a.mime,'Accept-Ranges':'bytes'}});
 }
 if(route==='/api/thumbnails/templates'){if(method==='GET')return json([...data.thumbnails,...await list('thumbnail-templates/')]);const parent=[...data.thumbnails,...await list('thumbnail-templates/')].find(t=>t.id===b.sourceId);return json(await put('thumbnail-templates/'+(b.id=crypto.randomUUID()),{...parent,...b,referenceImages:[],builtin:false,revision:(parent?.revision||0)+1}))}
 if(route==='/api/thumbnails/purposes')return json(data.purposes);
 if(route.startsWith('/api/thumbnails/preview/')){const file=data.previews[parts[4]]?.[parts[5]];if(!file)return new Response(null,{status:404});return fetch(BASE+'previews/'+file)}
 if(route==='/api/thumbnails/context'){const id=u.searchParams.get('draftId'),d=id?await get('drafts/'+id):null;return json({brand:'',logoId:null,draftId:id,selection:d?.thumbnailSelection||await get('standalone-thumbnail'),apiConnected:false})}
 if(route==='/api/thumbnails/selection'&&method==='POST'){const t=[...data.thumbnails,...await list('thumbnail-templates/')].find(t=>t.id===b.templateId);if(!t)throw Error('テンプレートを選択してください。');const selection={...b,id:crypto.randomUUID(),templateSnapshot:t,headlineLines:(b.headline||'').split('\n'),resolvedHeadline:b.headline,brand:'',status:'draft'};const d=b.draftId?await get('drafts/'+b.draftId):null;if(d){d.thumbnailSelection=selection;await put('drafts/'+d.id,d)}else await put('standalone-thumbnail',selection);return json(selection)}
 return json({error:'デモでは生成APIを実行しません。登録内容はこのブラウザに保存されています。'},403);
}
