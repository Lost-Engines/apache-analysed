// Deliberately bounded import. Never copy an analysis directory wholesale.
import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import {resolve,dirname,extname} from 'node:path';
import {createHash} from 'node:crypto';
const source=resolve(process.argv[2]??'../apache-reverse/analysis'),dest=resolve('public'),provenance=[];
async function copy(name,out=name){
 const bytes=await readFile(resolve(source,name));
 let content=bytes;
 if(extname(name)==='.json')content=JSON.stringify(JSON.parse(bytes));
 if(name==='models/viewer.js'){
  content=bytes.toString().replace("box.append(role);","const notes=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Construction notes';notes.append(summary,role);box.append(notes);").replace("p.textContent=lastScene.notes.join(' · ');box.append(p);","p.textContent=lastScene.notes.join(' · ');notes.append(p);").replace('No placement in the terrain or loaded mission scenes catalogued so far.','No placements in the four terrain maps or the 110 mission scenes.');
 }
 if(name==='terrain/viewer.js')content=bytes.toString().replace("new URLSearchParams(location.hash.slice(1))","new URLSearchParams(location.hash.slice(1)||'zone=FORT&mission=61')");
 if(name==='poses/index.json'){
  const data=JSON.parse(bytes);data.records=data.records.filter(r=>!['II','IC'].includes(r.signature));
  content=JSON.stringify({records:data.records});
 }
 if(extname(name)==='.css')content=bytes.toString().replace('header,main,footer{max-width:none}','');
 await mkdir(dirname(resolve(dest,out)),{recursive:true});await writeFile(resolve(dest,out),content);
 provenance.push({source:name,output:out,sha256:createHash('sha256').update(bytes).digest('hex')});
}
for(const name of ['models/index.json','models/materials.json','models/textures.json','models/usage.json','models/catalogue.json','models/viewer.js','models/geometry.js','models/raster.js','models/browser.css','terrain/viewer.js','terrain/viewer.css','missions/index.json','missions/formations.json','missions/task-types.json','cockpits/index.json','cockpits/viewer.js','cockpits/viewer.css','poses/index.json','poses/editor.json','poses/figure.js','poses/animation.mjs','shared/triangulate.js'])await copy(name);
for(const directory of ['models/data','missions/data','missions/native']){
 for(const entry of (await readdir(resolve(source,directory),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  if(entry.isFile()&&extname(entry.name)==='.json')await copy(`${directory}/${entry.name}`);
 }
}
for(const zone of ['fort','cyprus','korea','yemen'])for(const ending of ['.json','-materials.json','-textures.json','-rendering.json','-features.json','-map.png','-relief.png'])await copy(`terrain/data/${zone}${ending}`);
const cockpit=JSON.parse(await readFile(resolve(source,'cockpits/index.json')));
for(const image of new Set([...cockpit.sprites,...cockpit.layouts].map(x=>x.image)))await copy(`cockpits/${image}`);
const art=JSON.parse(await readFile(resolve(source,'media-art/index.json')));
const palette=art.pictures.find(x=>x.source==='3DDATA/3DPAL.LBM');
await copy('media-art/'+palette.image,'images/palette-1997.png');
await copy('media-art/'+palette.alternates[0].image,'images/palette-1995.png');
await copy('media-art/images/3DDATA/FOG.png','images/fog.png');
await copy('reference/native-renderer/mission-61-640-view-0.png','images/pilot-flight.png');
// Reader-facing adaptations live separately, so imports remain repeatable.
for(const area of ['models','terrain','cockpits']){
 let html=await readFile(resolve(source,area,'index.html'),'utf8');
 html=html.match(/<main>([\s\S]*?)<\/main>/)[1];
 html=html.replace(/<a href="catalogue\.md">About the categories\.<\/a>/,'');
 if(area==='models')html=html.replace('<div id="controls" class="toolbar"></div>','<details><summary>Drawing states</summary><div id="controls" class="toolbar"></div></details>');
 if(area==='terrain'){
  html=html.replace(/<p class="muted">Drag to orbit;[\s\S]*?<\/p>/,'<p class="muted">Drag to orbit; scroll to zoom. Use “Locate” below to visit a unit’s starting position.</p>');
  html=html.replace('<option>FORT</option>','<option value="FORT">Fort Hood</option>').replace('<option>CYPRUS</option>','<option value="CYPRUS">Cyprus</option>').replace('<option>KOREA</option>','<option value="KOREA">Korea</option>').replace('<option>YEMEN</option>','<option value="YEMEN">Yemen</option>');
 }
 if(area==='cockpits'){
  html=html.replace('value="composite">','value="composite" selected>').replace('value="0" selected>Ahead','value="0">Ahead');
  html=html.replace('<h2 id="parts-title">Image pieces for this view</h2>','<details><summary>How the cockpit is assembled</summary><h2 id="parts-title">Image pieces for this view</h2>').replace('<div class="parts" id="parts"></div>','<div class="parts" id="parts"></div></details>');
 }
 await mkdir('src/viewers',{recursive:true});await writeFile(`src/viewers/${area}.html`,html);
}
await mkdir('content',{recursive:true});await writeFile('content/data-provenance.json',JSON.stringify({sourceRepository:'https://github.com/Lost-Engines/apache-reverse',files:provenance},null,2)+'\n');
console.log(`Imported ${provenance.length} explicitly selected display files.`);
