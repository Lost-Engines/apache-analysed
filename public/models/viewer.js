import {bounds,geometry} from './geometry.js';
import {Raster} from './raster.js';

const $=id=>document.getElementById(id),cache=new Map(),pending=new Map(),PAGE_SIZE=24;
let catalogue,usage,missions,formations,materials,raster,thumbnailRaster,browserData;
let families=new Map(),categoryLabels=new Map(),current=103,currentFamily=103;
let flags=0,yaw=2.5,pitch=.35,zoom=1.6,extent,ready=false,selection=0,lastScene,pageNumber=0,entries=[];
const thumbnails=new Map();let thumbnailQueue=[],thumbnailBusy=false,observer;

async function json(url){const r=await fetch(url);if(!r.ok)throw Error(`${url}: ${r.status}`);return r.json();}
async function load(id,chain=[]){
 if(chain.includes(id))return;
 if(!cache.has(id)){
  if(!pending.has(id))pending.set(id,json(`data/${id}.json`).then(m=>cache.set(id,m)));
  await pending.get(id);
 }
 await Promise.all(cache.get(id).children.filter(c=>c.model).map(c=>load(c.model,[...chain,id])));
}
function camera(box=extent,angle=yaw,elevation=pitch,magnification=zoom){
 const sy=Math.sin(angle),cy=Math.cos(angle),sp=Math.sin(elevation),cp=Math.cos(elevation),distance=box.radius*3.2/magnification;
 const view=p=>{const [x,y,z]=p.map((v,i)=>v-box.centre[i]),side=x*cy+y*sy,depth=x*sy-y*cy;return [side,z*cp-depth*sp,distance-depth*cp-z*sp];};
 return {...box,view};
}
function sceneFor(id,cam,options={}){
 return geometry(cache,id,{flags:0,parts:true,cull:true,...options,project:p=>{const [x,y,z]=cam.view(p);return [x/z,-y/z];}});
}
function familyFor(id){
 const candidates=browserData.record_families[id];
 return families.get(candidates.includes(currentFamily)?currentFamily:candidates[0]);
}
function render(){
 if(!ready)return;
 const canvas=$('view'),dpr=Math.min(devicePixelRatio,2);
 canvas.width=Math.round(canvas.clientWidth*dpr);canvas.height=Math.round(canvas.clientHeight*dpr);
 const cam=camera();lastScene=sceneFor(current,cam,{flags,parts:$('parts').checked,cull:$('cull').checked});
 const stats=raster.draw(lastScene,cam,{wire:$('wire').checked,pointSize:Number($('point-size').value)}),model=cache.get(current),family=families.get(currentFamily);
 const box=$('details');box.replaceChildren();
 const title=document.createElement('h2');title.textContent=`${model.id} · ${model.name}`;box.append(title);
 const p=document.createElement('p');p.textContent=`${model.description.replaceAll('_',' ')} · ${lastScene.visited} model parts · ${stats.triangles} triangles · ${stats.lines} lines · ${stats.points} points`;box.append(p);
 const role=document.createElement('p');role.textContent=`${categoryLabels.get(family.category)}. ${family.evidence.join(' ')}`;const notes=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Construction notes';notes.append(summary,role);box.append(notes);
 if(lastScene.notes.length){const p=document.createElement('p');p.className='muted';p.textContent=lastScene.notes.join(' · ');notes.append(p);}
 const shared=browserData.record_families[current];
 if(shared.length>1){const p=document.createElement('p');p.textContent='This distant model is shared by several families:';box.append(p);const links=document.createElement('div');links.className='family-links';for(const id of shared){const a=document.createElement('a');a.href=`#${id}`;a.textContent=`${id} · ${families.get(id).name}`;links.append(a);}box.append(links);}
 if(family.parents.length){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=`Attached to ${family.parents.length} model records`;details.append(summary);const links=document.createElement('div');links.className='family-links';for(const id of family.parents){const a=document.createElement('a');a.href=`#${id}`;a.textContent=`${id} · ${catalogue.get(id).name}`;links.append(a);}details.append(links);box.append(details);}
 window.apacheViewer={current,family:currentFamily,camera:{yaw,pitch,zoom},flags,stats,notes:lastScene.notes,ready:true};
}
function showUsage(){
 const box=$('usage');box.replaceChildren();
 const family=families.get(currentFamily),sources=family.records.map(id=>usage[id]).filter(Boolean);
 const h=document.createElement('h2');h.textContent='Where this family appears';box.append(h);
 if(!sources.length){const p=document.createElement('p');p.textContent='No placements in the four terrain maps or the 110 mission scenes.';box.append(p);return;}
 const scenery=new Map(),groups=new Map(),formationUses=new Map();
 for(const source of sources){
  for(const s of source.scenery)scenery.set(s.zone,(scenery.get(s.zone)||0)+s.count);
  for(const use of source.missions){if(!groups.has(use.mission))groups.set(use.mission,new Set());groups.get(use.mission).add(`${use.task}:${use.actor}:${use.attachment}`);}
  for(const f of source.formations)formationUses.set(f.id,(formationUses.get(f.id)||0)+f.count);
 }
 for(const [zone,count]of scenery){const a=document.createElement('a');a.href=`../terrain/index.html#zone=${zone}`;a.textContent=`${zone}: ${count.toLocaleString()} scenery placements`;const p=document.createElement('p');p.append(a);box.append(p);}
 if(groups.size){
  const p=document.createElement('p');p.textContent=`Present in ${groups.size} loaded missions, including attached parts.`;box.append(p);
  const select=document.createElement('select');select.setAttribute('aria-label','Mission using this model');
  for(const [id,uses]of groups){const m=missions.find(m=>m.id===id);select.add(new Option(`${m.mode} · ${m.title} · ${uses.size} actor records`,id));}
  const a=document.createElement('a');a.textContent='Open mission map';const update=()=>{const m=missions.find(m=>m.id===Number(select.value));a.href=`../missions/index.html#zone=${m.zone}&mission=${m.id}`;};select.onchange=update;update();box.append(select,' ',a);
 }
 if(formationUses.size){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=`${formationUses.size} formation definitions`;details.append(summary);for(const [id,count]of formationUses){const p=document.createElement('p');p.textContent=`${id}: ${formations[id].name} (${count})`;details.append(p);}box.append(details);}
}
function controls(){
 const box=$('controls');box.replaceChildren();const masks=new Set(),cases=new Map();
 function visit(id,seen=new Set()){
  if(seen.has(id))return;seen.add(id);const m=cache.get(id);
  for(const n of Object.values(m.program)){if(n.op===3||n.op===4)masks.add(n.mask);if(n.op===5)cases.set(`${n.shift}:${n.mask}`,n);}
  for(const c of m.children)if(c.model)visit(c.model,seen);
 }
 visit(current);
 for(const mask of masks){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.onchange=()=>{flags=input.checked?flags|mask:flags&~mask;render();};label.append(input,`Flag 0x${mask.toString(16)}`);box.append(label);}
 for(const n of cases.values()){const label=document.createElement('label'),select=document.createElement('select');for(let v=0;v<n.case_count;v++)select.add(new Option(String(v),String(v)));select.onchange=()=>{flags=(flags&~(n.mask<<n.shift))|(Number(select.value)<<n.shift);render();};label.append(`State (shift ${n.shift}) `,select);box.append(label);}
}
function details(){
 const family=families.get(currentFamily),select=$('detail');select.replaceChildren();
 family.records.forEach((id,i)=>{const model=catalogue.get(id);select.add(new Option(`${i+1}${i===0?' (highest)':''} · #${id} · ${model.face_count} primitives`,id));});
 select.value=String(current);select.disabled=family.records.length<2;
 $('family-info').textContent=family.records.length>1?`${family.records.length} linked detail levels`:'Single detail level';
}
async function select(id){
 const token=++selection;ready=false;if(window.apacheViewer)window.apacheViewer.ready=false;$('error').textContent='';
 try{
  if(!catalogue.has(id))throw Error(`Model record ${id} does not exist.`);
  await load(id);if(token!==selection)return;
  current=id;currentFamily=familyFor(id).id;flags=0;extent=bounds(cache,current,$('parts').checked);
  controls();details();showUsage();ready=true;render();
  const position=entries.findIndex(entry=>$('grouping').value==='families'?entry.id===currentFamily:entry.id===current);
  if(position>=0&&Math.floor(position/PAGE_SIZE)!==pageNumber){pageNumber=Math.floor(position/PAGE_SIZE);list();}else highlight();
 }catch(e){$('error').textContent=e.message;console.error(e);}
}
function highlight(){for(const button of $('list').querySelectorAll('button[data-model]')){const selected=Number(button.dataset.model)===($('grouping').value==='families'?currentFamily:current);button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));}}
function thumbnailResult(holder,result){
 holder.replaceChildren();
 if(!result){holder.textContent='No default geometry';return;}
 const image=document.createElement('img');image.alt='';image.width=256;image.height=192;image.src=result;holder.append(image);
}
async function pumpThumbnails(){
 if(thumbnailBusy)return;thumbnailBusy=true;
 try{
  while(thumbnailQueue.length){
   const {id,holder}=thumbnailQueue.shift();if(!holder.isConnected)continue;
   try{
    if(!thumbnails.has(id)){
     await load(id);if(!holder.isConnected)continue;
     const box=bounds(cache,id,true),initial=camera(box,2.5,.35,1),visible=sceneFor(id,initial);
     const vertices=[...visible.faces,...visible.lines,...visible.points].flatMap(item=>item.vertices);
     // Fit the drawn geometry, rather than leaving space for hidden states.
     if(vertices.length){
      const lo=[0,1,2].map(i=>Math.min(...vertices.map(p=>p[i]))),hi=[0,1,2].map(i=>Math.max(...vertices.map(p=>p[i])));
      box.centre=lo.map((v,i)=>(v+hi[i])/2);
      box.radius=Math.max(1,Math.hypot(...hi.map((v,i)=>v-lo[i]))/2);
     }
     let low=.1,high=8;
     for(let step=0;step<12;step++){
      const mid=(low+high)/2,cam=camera(box,2.5,.35,mid),f=1/Math.tan(Math.PI/8);
      const fits=vertices.every(p=>{const [x,y,z]=cam.view(p);return z>box.radius*.005&&Math.abs(x/z*f*.75)<.88&&Math.abs(y/z*f)<.88;});
      if(fits)low=mid;else high=mid;
     }
     const cam=camera(box,2.5,.35,low),scene=sceneFor(id,cam);
     const stats=thumbnailRaster.draw(scene,cam,{wire:false,pointSize:3});
     thumbnails.set(id,stats.triangles+stats.lines+stats.points?thumbnailRaster.canvas.toDataURL('image/png'):null);
    }
    if(holder.isConnected)thumbnailResult(holder,thumbnails.get(id));
   }catch(e){if(holder.isConnected)holder.textContent='Preview unavailable';console.error(`Thumbnail ${id}: ${e.message}`);}
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
 }finally{thumbnailBusy=false;}
}
function list(){
 if(!catalogue)return;
 const term=$('search').value.toLowerCase().trim(),category=$('category').value,filter=$('filter').value,grouped=$('grouping').value==='families';
 const source=grouped?browserData.families:[...catalogue.values()].map(model=>({...families.get(browserData.record_families[model.id][0]),id:model.id,records:[model.id],name:model.name,description:model.description.replaceAll('_',' ')}));
 entries=source.filter(f=>(category==='all'||f.category===category)&&f.records.some(id=>`${id} ${catalogue.get(id).name} ${catalogue.get(id).description.replaceAll('_',' ')} ${f.description}`.toLowerCase().includes(term))&&(filter!=='missions'||f.mission_use)&&(filter!=='scenery'||f.scenery_use)&&(filter!=='assembled'||f.has_parts)&&(filter!=='controls'||f.has_states));
 const pages=Math.max(1,Math.ceil(entries.length/PAGE_SIZE));pageNumber=Math.max(0,Math.min(pages-1,pageNumber));
 const first=pageNumber*PAGE_SIZE,visible=entries.slice(first,first+PAGE_SIZE),totalRecords=new Set(entries.flatMap(f=>f.records)).size;
 $('count').textContent=grouped?`${entries.length} families · ${totalRecords.toLocaleString()} records`:`${entries.length.toLocaleString()} records`;
 $('page-info').textContent=entries.length?`${first+1}–${first+visible.length} of ${entries.length}`:'No matches';
 $('previous-page').disabled=pageNumber===0;$('next-page').disabled=pageNumber>=pages-1;
 observer?.disconnect();thumbnailQueue=[];$('list').replaceChildren();$('list').scrollTop=0;
 observer=new IntersectionObserver(changes=>{for(const item of changes)if(item.isIntersecting){observer.unobserve(item.target);thumbnailQueue.push({id:Number(item.target.dataset.model),holder:item.target});}pumpThumbnails();},{root:$('list'),rootMargin:'150px'});
 for(const family of visible){
  const button=document.createElement('button');button.dataset.model=String(family.id);button.onclick=()=>{location.hash=String(family.id);};
  const holder=document.createElement('span');holder.className='model-thumbnail';holder.dataset.model=String(family.id);holder.textContent='Loading preview…';
  const text=document.createElement('span');text.className='model-card-text';
  const title=document.createElement('strong');title.textContent=`${family.id} · ${family.name}`;
  const description=document.createElement('small');description.textContent=family.description;
  const category=document.createElement('small');category.textContent=categoryLabels.get(family.category);
  const badges=document.createElement('span');badges.className='model-badges';
  for(const label of [grouped&&family.records.length>1?`${family.records.length} LODs`:null,family.has_parts?'Parts':null,family.has_states?'States':null].filter(Boolean)){const badge=document.createElement('span');badge.textContent=label;badges.append(badge);}
  text.append(title,description,category,badges);button.append(holder,text);$('list').append(button);
  if(thumbnails.has(family.id))thumbnailResult(holder,thumbnails.get(family.id));else observer.observe(holder);
 }
 if(!entries.length){const p=document.createElement('p');p.textContent='No models match these filters.';$('list').append(p);}
 highlight();window.apacheCatalogue={ready:true,families:browserData.families.length,records:catalogue.size,grouping:$('grouping').value,category,matching:entries.length,page:pageNumber,visible:visible.map(f=>f.id)};
}
for(const id of ['search','filter','category','grouping'])$(id).addEventListener(id==='search'?'input':'change',()=>{pageNumber=0;list();});
$('previous-page').onclick=()=>{pageNumber--;list();};$('next-page').onclick=()=>{pageNumber++;list();};
$('detail').onchange=()=>{location.hash=$('detail').value;};
for(const id of ['cull','wire','point-size'])$(id).oninput=render;
$('parts').onchange=()=>{if(!ready)return;extent=bounds(cache,current,$('parts').checked);render();};
const reset=()=>{yaw=2.5;pitch=.35;zoom=1.6;render();};$('reset').onclick=reset;$('view').ondblclick=reset;
let drag=null;
$('view').onpointerdown=e=>{drag=[e.clientX,e.clientY];e.target.setPointerCapture(e.pointerId);};
$('view').onpointermove=e=>{if(!drag)return;yaw-=(e.clientX-drag[0])*.008;pitch=Math.max(-1.5,Math.min(1.5,pitch+(e.clientY-drag[1])*.008));drag=[e.clientX,e.clientY];render();};
$('view').onpointerup=()=>drag=null;$('view').onpointercancel=()=>drag=null;
$('view').addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.15,Math.min(8,zoom*Math.exp(-e.deltaY*.001)));render();},{passive:false});
new ResizeObserver(render).observe($('view'));
window.onhashchange=()=>{if(catalogue)select(Number(location.hash.slice(1))||0);};
try{
 const [index,mat,textures,u,mi,fo,groups]=await Promise.all([json('index.json'),json('materials.json'),json('textures.json'),json('usage.json'),json('../missions/index.json'),json('../missions/formations.json'),json('catalogue.json')]);
 catalogue=new Map(index.map(m=>[m.id,m]));usage=u;missions=mi;formations=fo;materials=mat;browserData=groups;
 families=new Map(groups.families.map(f=>[f.id,f]));categoryLabels=new Map(groups.categories.map(c=>[c.id,c.label]));
 for(const category of groups.categories)$('category').add(new Option(category.label,category.id));
 raster=new Raster($('view'),materials,textures);
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=192;thumbnailRaster=new Raster(canvas,materials,textures);
 list();await select(location.hash?Number(location.hash.slice(1)):103);
}catch(e){$('error').textContent=e.message;console.error(e);}
