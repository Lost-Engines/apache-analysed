const $=id=>document.getElementById(id);let data,layout;
const card=s=>{const el=document.createElement('article');el.className='panel';const title=document.createElement('strong');title.textContent=s.file;const image=new Image();image.src=s.image;image.alt=s.file;image.loading='lazy';const meta=document.createElement('small');meta.textContent=`${s.width} × ${s.height} · ${s.symbol}`;el.append(title,image,meta);return el;};
function size(){
 if(!layout)return;
 const z=$('zoom').value,dpr=devicePixelRatio||1;
 const width=z==='fit'?Math.min(layout.width*3,$('preview').clientWidth-32):layout.width*Number(z)/dpr;
 const target=$('view').value==='composite'?$('composite'):$('image');
 target.style.width=`${width}px`;target.style.height='auto';
}
function show(){
 const w=+$('resolution').value,seat=+$('seat').value,tiled=$('view').value==='composite';
 const order=tiled?[2,1,0,3,4]:[+$('view').value],views=order.map(v=>seat*5+v);
 const layouts=views.map(view=>data.layouts.find(x=>x.width===w&&x.view===view));
 layout={width:w*layouts.length,height:layouts[0].height};
 $('image').hidden=tiled;$('composite').hidden=!tiled;
 $('preview').classList.toggle('composite-preview',tiled);
 const names=['Ahead','Left 45°','Left 90°','Right 45°','Right 90°'];
 if(tiled){
  $('composite').replaceChildren(...layouts.map((item,i)=>{
   const figure=document.createElement('figure'),caption=document.createElement('figcaption'),image=new Image();
   caption.textContent=names[order[i]];image.src=item.image;
   image.alt=`${seat?'Gunner':'Pilot'} cockpit, ${names[order[i]].toLowerCase()}`;
   image.width=item.width;image.height=item.height;
   figure.append(caption,image);return figure;
  }));
 }else{
  $('composite').replaceChildren();$('image').src=layouts[0].image;
  $('image').alt=`${seat?'Gunner':'Pilot'} cockpit, ${names[order[0]].toLowerCase()}`;
 }
 const operations=layouts.reduce((sum,item)=>sum+item.parts.length,0);
 $('meta').textContent=`${tiled?'All five angles':`View ${views[0]}`} · ${layout.width} × ${layout.height} · ${operations} drawing operations`;
 const files=[...new Set(layouts.flatMap(item=>item.parts.map(x=>x.file).filter(Boolean)))];
 $('parts-title').textContent=tiled?'Image pieces for all five views':'Image pieces for this view';
 $('parts').replaceChildren(...files.map(file=>card(data.sprites.find(x=>x.file===file))));
 size();window.apacheCockpits={ready:true,view:tiled?'composite':views[0],views,width:w,parts:files.length};
}
try{data=await(await fetch('index.json')).json();$('all').replaceChildren(...data.sprites.map(card));for(const id of ['resolution','seat','view'])$(id).onchange=show;$('zoom').onchange=size;addEventListener('resize',size);show();}catch(e){$('error').textContent=e.message;throw e;}
