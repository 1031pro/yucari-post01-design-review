'use strict';
const root=document.querySelector('#thumb-app');const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let richText={},richSelection=null,richPart='headline';
let catalog=[],context={},page='list',editing=null,selected=null,photoId=null,refs=[],message='',saving=false,editFields={};
const draftId=new URLSearchParams(location.search).get('draftId')||localStorage.getItem('store-video-public-demo-draft');
async function api(url,data){const r=await fetch(url,data);const b=await r.json();if(!r.ok)throw Error(b.error||'保存できませんでした。');return b}
const post=(u,b)=>api(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
const diagram=()=>'<div class="thumb-diagram"><div class="panel">人物情報<strong>見出しを<br>ここに配置</strong>ロゴ・店名</div></div>';
function previewLayers(t){return t.previewLayers||catalog.find(x=>x.id===t.id)?.previewLayers}
function sampleImages(t){return (t.referenceIds||[]).map(id=>({url:'/yucari-post01-design-review/store-video-demo/api/assets/'+id}))}
function templateCopy(t){return {headline:t.id==='thumbnail-06-photo-bands'?'研修で、\n学びを現場の力に。':'研修で、\n学びを\n現場の力に。',eyebrow:'サロンスタッフの学び'}}
function artwork(t){return liveArtwork(t,{...templateCopy(t),brand:'SAMPLE SALON'},false)}
function liveArtwork(t,values={},interactive=false){
 const layers=previewLayers(t),style=(layers?.background?.match(/thumbnail-(\d+)/)||(t.id||'').match(/thumbnail-(\d+)/)||[])[1]||'02';
 const photo=values.photoId?'/yucari-post01-design-review/store-video-demo/api/assets/'+values.photoId:layers?.background;
 const leaf='<svg class="live-leaves" viewBox="0 0 360 640" aria-hidden="true"><g fill="none" stroke="#789844" stroke-width="2"><path d="M32 484 Q7 430 39 370 M327 480 Q349 445 325 395"/></g><g fill="#95ad4a"><ellipse cx="25" cy="432" rx="7" ry="17" transform="rotate(-36 25 432)"/><ellipse cx="32" cy="402" rx="7" ry="16" transform="rotate(35 32 402)"/><ellipse cx="22" cy="460" rx="7" ry="15" transform="rotate(-35 22 460)"/><ellipse cx="335" cy="435" rx="6" ry="17" transform="rotate(38 335 435)"/><ellipse cx="329" cy="464" rx="6" ry="16" transform="rotate(-30 329 464)"/></g></svg>';
 const part=(key,label,value)=>'<'+(interactive?'button type="button"':'div')+' class="live-part live-'+key+(value?'':' is-empty')+'" data-part="'+key+'" '+(interactive?'aria-label="'+label+'を編集"':'')+'><span>'+esc(value||'')+'</span></'+(interactive?'button':'div')+'>';
 return '<div class="live-art taste-'+style+'" '+(interactive?'id="live-art"':values.richPreview?'data-rich-preview="true"':'')+' style="--design-ink:'+esc(t.defaultPalette.ink)+';--design-paper:'+esc(t.defaultPalette.paper)+';--design-accent:'+esc(t.defaultPalette.accent)+'">'+(photo?'<img class="live-photo" src="'+esc(photo)+'" alt="" />':'')+'<div class="live-decor" aria-hidden="true"></div>'+ (['01','03','04'].includes(style)?'<img class="faithful-decor" src="'+layers.foreground.replace('/foreground','/decoration')+'" alt="">':'') +(style==='03'?'<img class="original-top-decor" src="'+layers.foreground+'" alt="">':'')+(style==='05'&&layers?.subject&&!values.photoId?'<img class="live-subject" src="'+esc(layers.subject)+'" alt="">':'')+'<div class="live-copy">'+part('person','人物名',values.personLine)+part('eyebrow','補助文',values.eyebrow)+part('headline','メイン見出し',values.headline)+'<div class="live-brand">'+(values.logoId?'<img src="/yucari-post01-design-review/store-video-demo/api/assets/'+esc(values.logoId)+'" alt="店舗ロゴ">':'')+(!values.logoId&&values.brand==='SAMPLE SALON'?'<i class="sample-sun" aria-hidden="true">☀</i>':'')+'<span>'+esc(values.brand||'')+'</span></div></div></div>';
}
function typesetHeadline(art){
 const holder=art.querySelector('.live-headline>span');if(!holder)return;
 const text=holder.dataset.raw??holder.textContent;holder.dataset.raw=text;
 let lines=text.split('\n');if(lines.length===1&&text.length>6){const target=art.classList.contains('taste-06')?2:3,limit=Math.ceil(text.length/target);const words=[...new Intl.Segmenter('ja',{granularity:'word'}).segment(text)].map(x=>x.segment);lines=[''];for(const word of words){const last=lines.length-1;if(lines[last].length+word.length>limit+1&&lines[last]&&lines.length<target)lines.push(word);else lines[last]+=word}}art.dataset.lines=lines.length;
 holder.innerHTML=lines.map((line,i)=>{
  let inner=esc(line);if(art.classList.contains('taste-02')&&i===0){inner='<em>'+esc(line.slice(0,2))+'</em>'+esc(line.slice(2))}
  if(art.classList.contains('taste-02')&&i===lines.length-1&&i>0&&line.length>3){const at=line.length-3;inner=esc(line.slice(0,at))+'<em>'+esc(line[at])+'</em>'+esc(line.slice(at+1))}
  if(art.classList.contains('taste-05')&&i===1){inner='<em>'+esc(line.slice(0,Math.max(1,line.length-1)))+'</em>'+esc(line.slice(Math.max(1,line.length-1)))}
  return '<span class="headline-row" data-row="'+i+'">'+inner+'</span>';
 }).join('');
}
function currentValues(){const d=ThumbnailCopy.data();return {...d,headline:d.headline.replace(/【([^】]+)】/g,(m,k)=>d.variables[k]||m),personLine:document.querySelector('#person')?.value||'',eyebrow:document.querySelector('#eyebrow')?.value||'',brand:context.brand,logoId:context.logoId,photoId}}
function syncLive(){
 const art=document.querySelector('#live-art');if(!art)return;const v=currentValues();
 for(const key of ['headline','person','eyebrow']){const el=art.querySelector('[data-part="'+key+'"]');const text=v[key==='person'?'personLine':key];el.querySelector('span').textContent=text;delete el.querySelector('span').dataset.raw;el.classList.toggle('is-empty',!text);}
 const im=art.querySelector('.live-photo');if(im)im.src=photoId?'/yucari-post01-design-review/store-video-demo/api/assets/'+photoId:previewLayers(selected)?.background;
 art.querySelector('.live-subject')?.toggleAttribute('hidden',!!photoId);
 fitArtwork(art);
}
function fitArtwork(art){
 typesetHeadline(art);
 applyRichText(art);
 const head=art.querySelector('.live-headline'),copy=art.querySelector('.live-copy');
 head.style.fontSize='';
 head.querySelectorAll('.headline-row').forEach(row=>{row.style.fontSize='';row.style.transform=''});
 const overflow=copy.scrollHeight>copy.clientHeight+1||head.scrollWidth>head.clientWidth+1;
 art.classList.toggle('text-overflow',overflow);
 const warning=document.querySelector('#copy-fit-warning');if(art.id==='live-art'&&warning)warning.hidden=!overflow;
}
function activatePart(key,focus=false){
 const art=document.querySelector('#live-art');if(!art)return;
 art.querySelectorAll('[data-part]').forEach(el=>el.classList.toggle('is-active',el.dataset.part===key));
 document.querySelectorAll('[data-edit-part]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.editPart===key)));
 if(focus){const field=document.getElementById(key);field?.focus({preventScroll:true});field?.scrollIntoView({block:'center'});}
}
function sample(t){return '<button class="sample-button" data-sample="'+esc(t.id)+'" aria-label="'+esc(t.title)+'の見本を拡大">'+artwork(t)+'<span>拡大して見る</span></button>'}
function error(e){const p=document.querySelector('#thumb-error');p.textContent=e.message;p.hidden=false;p.scrollIntoView({block:'center'})}
function render(){ThumbnailCopy.capture();if(document.querySelector('#person'))editFields={personLine:document.querySelector('#person').value,eyebrow:document.querySelector('#eyebrow').value};let html='';
 if(page==='list'){html=`<h1>デザインを選ぶ。</h1><div class="thumb-toolbar"><button id="new-template" class="secondary">＋ テンプレートを追加</button></div>${message?'<p class="thumb-status" role="status">'+esc(message)+'</p>':''}${context.selection?'<button id="resume-selection" class="primary">保存した内容を再編集</button>':''}${!draftId?'<p class="thumb-notice">動画を作成すると、写真・見出しを設定して保存できます。<a class="thumb-link" href="/yucari-post01-design-review/store-video-demo/">動画を作成する →</a></p>':''}<div class="design-grid">${catalog.map(t=>`<section class="thumb-card">${sample(t)}<h2>${esc(t.title.replace(/^01 /,''))}</h2>${context.selection?.templateId===t.id?'<span class="chosen-label">この動画で選択中</span>':''}<div class="thumb-actions"><button class="primary" data-use="${esc(t.id)}" ${!draftId?'disabled':''}>選ぶ</button><button class="text-button" data-edit="${esc(t.id)}">複製・編集</button></div></section>`).join('')}</div>`;}
 if(page==='edit'){const t=editing;html=`<button class="text-button" id="back">テンプレート一覧へ</button><h1>${t.id?'複製して編集':'テンプレートを追加'}</h1><form id="template-form" class="thumb-form"><label for="title">テンプレート名</label><input id="title" name="title" required maxlength="40" value="${esc(t.id?t.title+' のコピー':t.title)}"><div id="template-live-preview" class="template-live-preview">${liveArtwork(t,{headline:"研修で、\n学びを\n現場の力に。",eyebrow:"スタッフの学び",brand:"SAMPLE SALON"})}</div>${["photo","panel","headline","branding","decoration"].map(k=>`<input type="hidden" name="${k}" value="${esc(t.layout[k])}">`).join("")}<div class="thumb-colors">${[['ink','文字'],['paper','文字面'],['accent','アクセント']].map(([k,l])=>`<label>${l}<input type="color" name="${k}" value="${esc(t.defaultPalette[k])}"></label>`).join('')}</div><label for="references">デザインの参考画像（5枚まで）</label><input id="references" type="file" multiple accept="image/png,image/jpeg,image/webp"><div class="thumb-refs" id="reference-preview">${refs.map(id=>`<img alt="追加した参考画像" src="/yucari-post01-design-review/store-video-demo/api/assets/${id}"><button type="button" data-remove="${id}" aria-label="参考画像を外す">×</button>`).join('')}</div><button class="primary" type="submit">テンプレートを保存</button></form>`;}
 if(page==='use'){const saved={...(context.selection||{}),...editFields};html=`<button class="text-button" id="back">テンプレートを選び直す</button><h1>${esc(selected.title)}</h1><form id="use-form" class="thumb-form"><section class="live-editor-preview" aria-label="入力内容のプレビュー"><div class="live-preview-image">${liveArtwork(selected,{...saved,headline:ThumbnailCopy.data().headline,brand:context.brand,logoId:context.logoId,photoId},true)}</div><div class="live-preview-tools"><strong>プレビュー</strong><button type="button" data-edit-part="headline">① 見出し</button><button type="button" data-edit-part="eyebrow">② 補助文</button><button type="button" data-edit-part="person">③ 人物名</button><button type="button" id="enlarge-live">拡大して見る</button></div></section><div class="rich-toolbar" role="group" aria-label="文字の書式"><strong id="rich-target">見出し全体</strong><label>色<input id="rich-color" type="color" value="#29272b"></label><label>サイズ<select id="rich-size"><option value="60">60%</option><option value="75">75%</option><option value="90">90%</option><option value="100" selected>100%</option><option value="110">110%</option><option value="125">125%</option><option value="150">150%</option><option value="175">175%</option><option value="200">200%</option></select></label><button type="button" id="rich-reset">書式を戻す</button></div><p id="copy-fit-warning" class="error" hidden>文言が収まりません。短くするか、改行を減らしてください。</p><label for="photo">写真を指定する（任意）</label><input id="photo" type="file" accept="image/png,image/jpeg,image/webp"><img class="thumb-photo" id="photo-preview" alt="選択した写真" ${photoId?`src="/yucari-post01-design-review/store-video-demo/api/assets/${photoId}"`:'hidden'}>${ThumbnailCopy.render()}<label for="eyebrow">② 補助文（任意）</label><input id="eyebrow" name="eyebrow" maxlength="24" value="${esc(saved.eyebrow||'')}"><label for="person">③ 人物名・肩書き（任意）</label><input id="person" name="person" maxlength="24" value="${esc(saved.personLine||'')}"><button class="primary" type="submit">下書きを保存</button></form>`;}
 if(page==='saved'){html=`<h1>下書きを保存しました。</h1><a class="primary" href="/yucari-post01-design-review/store-video-demo/#story">動画制作に戻る</a><button class="secondary" id="again" style="margin-top:12px">内容を編集する</button>`;}
 root.innerHTML=html+'<dialog id="sample-dialog"><button id="close-sample" class="secondary">閉じる</button><h2 id="sample-title"></h2><div id="sample-images"></div></dialog><p id="thumb-error" class="error" role="alert" hidden></p>';bind();
}
async function upload(f){if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>10000000)throw Error('画像は10MB以下のPNG・JPEG・WebPを選んでください。');return api('/yucari-post01-design-review/store-video-demo/api/assets?kind=image&name='+encodeURIComponent(f.name),{method:'POST',headers:{'Content-Type':f.type},body:f})}
function bind(){ThumbnailCopy.bind();bindRichText();
 document.querySelectorAll("#template-form input[type=color]").forEach(input=>input.addEventListener("input",()=>{document.querySelector("#template-live-preview .live-art").style.setProperty("--design-"+input.name,input.value)}));
 syncLive();document.querySelectorAll(".live-art").forEach(fitArtwork);bindCanvasEditing();updateRichToolbar();
 const form=document.querySelector("#use-form");if(form){form.addEventListener("input",e=>{if(!e.target.closest('[contenteditable]'))syncLive()});form.addEventListener("focusin",e=>{const key=e.target.id;if(["headline","person","eyebrow"].includes(key))activatePart(key)});form.querySelectorAll("[data-part]").forEach(b=>b.onclick=()=>{richPart=b.dataset.part;if(window.getSelection()?.isCollapsed)richSelection=null;activatePart(richPart);updateRichToolbar()});form.querySelectorAll("[data-edit-part]").forEach(b=>b.onclick=()=>activatePart(b.dataset.editPart,true));}

 document.querySelector('#resume-selection')?.addEventListener('click',()=>{selected=context.selection.templateSnapshot;photoId=context.selection.photoId;page='use';render();window.scrollTo(0,0)});
 document.querySelectorAll('[data-sample]').forEach(b=>b.onclick=()=>{const t=(selected?.id===b.dataset.sample?selected:catalog.find(t=>t.id===b.dataset.sample));document.querySelector('#sample-title').textContent=t.title;document.querySelector('#sample-images').innerHTML=artwork(t);document.querySelector('#sample-dialog').showModal();document.querySelectorAll('#sample-images .live-art').forEach(fitArtwork)});
 document.querySelector('#enlarge-live')?.addEventListener('click',()=>{document.querySelector('#sample-title').textContent='入力内容のプレビュー';document.querySelector('#sample-images').innerHTML=liveArtwork(selected,{...currentValues(),richPreview:true});document.querySelector('#sample-dialog').showModal();document.querySelectorAll('#sample-images .live-art').forEach(fitArtwork)});
 document.querySelector('#close-sample').onclick=()=>document.querySelector('#sample-dialog').close();
document.querySelector('#new-template')?.addEventListener('click',()=>{editing={title:'',layout:{photo:'顔を上半分に配置し、見出しと重ねない。',panel:'写真に合わせた明るい文字面を生成する。',headline:'読みやすい太字。見出しは2〜3行。',branding:'支給ロゴと店名を中央の文字面内に配置する。',decoration:'写真ごとに装飾を生成。顔や文字を覆わない。'},defaultPalette:{ink:'#29272b',paper:'#fff8ee',accent:'#f58a3c'}};refs=[];page='edit';render();window.scrollTo(0,0)});
 document.querySelector('#back')?.addEventListener('click',()=>{page='list';render()});document.querySelector('#again')?.addEventListener('click',()=>{page='use';render()});
 document.querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>{selected=catalog.find(t=>t.id===b.dataset.use);const initial=templateCopy(selected);if(ThumbnailCopy.seed(initial.headline))editFields={personLine:'',eyebrow:initial.eyebrow};photoId=context.selection?.photoId||null;page='use';render();window.scrollTo(0,0)});
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editing=structuredClone(catalog.find(t=>t.id===b.dataset.edit));refs=[...editing.referenceIds];page='edit';render();window.scrollTo(0,0)});
 const refInput=document.querySelector('#references');if(refInput)refInput.onchange=async()=>{const button=document.querySelector('#template-form button[type=submit]');button.disabled=true;try{if(refs.length+refInput.files.length>5)throw Error('参考画像は5枚までです。');for(const f of refInput.files){const a=await upload(f);refs.push(a.id)}refreshRefs()}catch(e){error(e)}finally{button.disabled=false;refInput.value=''}};
 function refreshRefs(){document.querySelector('#reference-preview').innerHTML=refs.map(id=>`<span><img alt="追加した参考画像" src="/yucari-post01-design-review/store-video-demo/api/assets/${id}"><button type="button" data-remove="${id}" aria-label="参考画像を外す">×</button></span>`).join('');document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{refs=refs.filter(id=>id!==b.dataset.remove);refreshRefs()})}if(refInput)refreshRefs();
 document.querySelector('#template-form')?.addEventListener('submit',async e=>{e.preventDefault();if(saving)return;saving=true;const button=e.target.querySelector('[type=submit]');button.disabled=true;try{const f=new FormData(e.target);const b={sourceId:editing.id,title:f.get('title'),layout:Object.fromEntries(['photo','panel','headline','branding','decoration'].map(k=>[k,f.get(k)])),defaultPalette:Object.fromEntries(['ink','paper','accent'].map(k=>[k,f.get(k)])),referenceIds:refs};await post('/yucari-post01-design-review/store-video-demo/api/thumbnails/templates',b);catalog=await api('/yucari-post01-design-review/store-video-demo/api/thumbnails/templates');message='テンプレートを追加しました。';page='list';render();window.scrollTo(0,0)}catch(e){error(e)}finally{saving=false;button.disabled=false}});
 const photo=document.querySelector('#photo');if(photo)photo.onchange=async()=>{const b=document.querySelector('#use-form [type=submit]');b.disabled=true;try{const a=await upload(photo.files[0]);photoId=a.id;const im=document.querySelector('#photo-preview');im.src='/yucari-post01-design-review/store-video-demo/api/assets/'+a.id;im.hidden=false;syncLive()}catch(e){error(e)}finally{b.disabled=false}};
 document.querySelector('#use-form')?.addEventListener('submit',async e=>{e.preventDefault();if(saving)return;saving=true;const b=e.target.querySelector('[type=submit]');b.disabled=true;try{syncLive();if(document.querySelector('#live-art')?.classList.contains('text-overflow'))throw Error('文言が収まりません。短くするか、改行を減らしてください。');const f=new FormData(e.target);context.selection=await post('/yucari-post01-design-review/store-video-demo/api/thumbnails/selection',{draftId,templateId:selected.id,revision:selected.revision,photoId,...ThumbnailCopy.data(),richText,personLine:f.get('person'),eyebrow:f.get('eyebrow')});page='saved';render();window.scrollTo(0,0)}catch(e){error(e)}finally{saving=false;b.disabled=false}});
 
}
(async()=>{try{catalog=await api('/yucari-post01-design-review/store-video-demo/api/thumbnails/templates');context=await api('/yucari-post01-design-review/store-video-demo/api/thumbnails/context'+(draftId?'?draftId='+encodeURIComponent(draftId):''));richText=context.selection?.richText||{};ThumbnailCopy.init(await api('/yucari-post01-design-review/store-video-demo/api/thumbnails/purposes'),context);render()}catch(e){root.innerHTML='<h1>読み込めませんでした。</h1><p class="error">'+esc(e.message)+'</p><a href="/yucari-post01-design-review/store-video-demo/thumbnails.html">再読み込み</a>'}})();




document.addEventListener("thumbnail-copy-change",syncLive);
window.addEventListener("resize",()=>document.querySelectorAll(".live-art").forEach(fitArtwork));

document.fonts.ready.then(()=>document.querySelectorAll(".live-art").forEach(fitArtwork));
document.fonts.addEventListener("loadingdone",()=>document.querySelectorAll(".live-art").forEach(fitArtwork));

function richPlain(el){return [...el.querySelectorAll('.headline-row')].length?[...el.querySelectorAll('.headline-row')].map(x=>x.textContent).join(''):el.textContent.replace(/\n/g,'')}
function applyRichText(art){
 if(art.id!=='live-art'&&!art.hasAttribute('data-rich-preview'))return;
 for(const key of ['headline','person','eyebrow']){
  const el=art.querySelector('[data-part="'+key+'"]');if(!el)continue;
  const text=richPlain(el),saved=richText[key];
  if(!saved)continue;
  // Only explicit user formatting replaces template emphasis.
  el.querySelectorAll('em').forEach(em=>em.replaceWith(document.createTextNode(em.textContent)));
  if(saved.text!==text)rebaseRich(saved,text);
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  let offset=0;for(const node of nodes){const frag=document.createDocumentFragment();for(const char of node.textContent){const span=document.createElement('span');span.textContent=char;const st=saved.chars[offset]||{};if(st.color)span.style.color=st.color;if(st.size)span.style.fontSize=st.size+'%';frag.append(span);offset+=char.length}node.replaceWith(frag)}
 }
}
function updateRichToolbar(){const styles=richText[richPart]?.chars||[],st=styles[richSelection?.start||0]||{};const color=document.querySelector('#rich-color'),size=document.querySelector('#rich-size');if(color)color.value=st.color||selected?.defaultPalette?.ink||'#29272b';if(size)size.value=String(st.size||100);const label=document.querySelector('#rich-target');if(label)label.textContent=richSelection?'選択した文字':({headline:'見出し',eyebrow:'補助文',person:'人物名'}[richPart]+'全体')}
function bindRichText(){
 const toolbar=document.querySelector('.rich-toolbar');if(!toolbar)return;
 const capture=()=>{const sel=window.getSelection();if(!sel?.rangeCount||sel.isCollapsed)return;const r=sel.getRangeAt(0),node=r.commonAncestorContainer,el=(node.nodeType===1?node:node.parentElement).closest?.('#live-art [data-part]');if(!el)return;const before=r.cloneRange();before.selectNodeContents(el);before.setEnd(r.startContainer,r.startOffset);const start=before.toString().length;richPart=el.dataset.part;richSelection={key:richPart,start,end:start+r.toString().length};updateRichToolbar()};
 document.onselectionchange=capture;
 toolbar.onpointerdown=capture;
 const change=(prop,value)=>{const el=document.querySelector('#live-art [data-part="'+richPart+'"]');if(!el)return;const text=richPlain(el);if(richText[richPart]?.text!==text){const chars=[],walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const node=walker.currentNode,color=getComputedStyle(node.parentElement).color;const rgb=color.match(/\d+/g);const hex=rgb?'#'+rgb.slice(0,3).map(n=>Number(n).toString(16).padStart(2,'0')).join(''):selected.defaultPalette.ink;for(let i=0;i<node.textContent.length;i++)chars.push({color:hex})}richText[richPart]={text,chars};}const data=richText[richPart],range=richSelection?.key===richPart?richSelection:{start:0,end:text.length};for(let i=range.start;i<range.end;i++){data.chars[i]={...(data.chars[i]||{}),[prop]:value}}syncLive()};
 document.querySelector('#rich-color').oninput=e=>change('color',e.target.value);
 document.querySelector('#rich-size').onchange=e=>change('size',Number(e.target.value));
 document.querySelector('#rich-reset').onclick=()=>{delete richText[richPart];richSelection=null;syncLive();updateRichToolbar()};
 document.querySelectorAll('[data-edit-part]').forEach(b=>b.addEventListener('click',()=>{richPart=b.dataset.editPart;richSelection=null;updateRichToolbar()}));
}

function bindCanvasEditing(){for(const el of document.querySelectorAll('#live-art [data-part]>span')){el.contentEditable='true';el.setAttribute('role','textbox');el.setAttribute('aria-label',({headline:'見出し',eyebrow:'補助文',person:'人物名'}[el.parentElement.dataset.part])+'を直接編集');el.oninput=()=>{const key=el.parentElement.dataset.part;const field=document.getElementById(key);field.value=el.innerText;ThumbnailCopy.capture();if(richText[key])rebaseRich(richText[key],el.textContent.replace(/\n/g,''));richSelection=null;delete el.dataset.raw};el.onpaste=e=>{e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'))}}}

function rebaseRich(saved,text){const old=saved.text;let a=0,b=0;while(a<old.length&&a<text.length&&old[a]===text[a])a++;while(b<old.length-a&&b<text.length-a&&old[old.length-1-b]===text[text.length-1-b])b++;const inherited=saved.chars[Math.max(0,a-1)]||{};saved.chars=[...Array.from({length:a},(_,i)=>saved.chars[i]||{}),...Array.from({length:text.length-a-b},()=>({...inherited})),...Array.from({length:b},(_,i)=>saved.chars[old.length-b+i]||{})];saved.text=text}
