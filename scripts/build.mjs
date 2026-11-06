import {readFile,writeFile,mkdir,rm,cp} from 'node:fs/promises';
import {marked} from 'marked';
import {parseFragment,serialize} from 'parse5';
const base='https://lost-engines.github.io/apache-analysed/';
const esc=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});await cp('public','dist',{recursive:true});
await mkdir('dist/assets',{recursive:true});for(const file of ['style.css','site.js','viewer.css'])await cp('src/'+file,'dist/assets/'+file);
await writeFile('dist/.nojekyll','');
const pages=[
 {id:'',title:'Apache Analysed',description:'Inside Digital Integration’s Apache Longbow: models, maps, cockpit artwork and discoveries from our reverse engineering project.',source:'home',kind:'home'},
 {id:'story',title:'Taking Apache Longbow apart',description:'Surviving debug symbols, an F-16 in a palette file, a recovered animation editor, and the work of reconstructing Apache.',kind:'story'},
 {id:'models',title:'Model gallery',description:'Explore Apache’s aircraft, vehicles, ships and scenery, with linked detail levels and attached parts.',source:'viewers/models',kind:'exhibit',script:'viewer.js',css:'browser.css'},
 {id:'terrain',title:'Mission atlas',description:'Explore Fort Hood, Cyprus, Korea and Yemen, with original briefings, routes, formations and 3D scenery.',source:'viewers/terrain',kind:'exhibit',script:'viewer.js',css:'viewer.css'},
 {id:'cockpits',title:'Inside the cockpit',description:'Original pilot and gunner artwork, with all five viewing angles assembled into cockpit panoramas.',source:'viewers/cockpits',kind:'exhibit',script:'viewer.js',css:'viewer.css'},
 {id:'poses',title:'The animation editor',description:'Explore the animation preview figure in MANEDIT, a development tool left on the Apache disc.',source:'poses',kind:'exhibit',script:'viewer.js'},
 {id:'artwork',title:'Working artwork',description:'The F-16 cockpit and Abu Dabi doodle hidden in Apache’s palette source artwork, compared with the earlier map image.',source:'artwork',kind:'artwork'},
 {id:'about',title:'About the project',description:'Apache Longbow reverse engineering and reconstruction, part of Lost Engines.',source:'about',kind:'about'}
];
let article=marked.parse(await readFile('content/story.md','utf8'));
const doc=parseFragment(article),toc=[];
function text(node){return node.value??(node.childNodes??[]).map(text).join('');}
function walk(node){if(node.tagName==='h2'){const title=text(node),id=title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');node.attrs.push({name:'id',value:id});toc.push({title,id});}for(const child of node.childNodes??[])walk(child);}
walk(doc);article=serialize(doc);
for(const page of pages){
 const up=page.id?'../':'',canonical=base+(page.id?page.id+'/':''),title=page.id?page.title+' | Apache Analysed':page.title;
 let body=page.kind==='story'?`<div class="story-layout"><aside class="contents"><p class="eyebrow">In this story</p><nav aria-label="Article sections">${toc.map(x=>`<a href="#${x.id}">${x.title}</a>`).join('')}</nav></aside><article class="prose"><p class="eyebrow">The investigation / Lost Engines</p>${article}</article></div>`:await readFile('src/'+page.source+'.html','utf8');
 if(page.kind==='exhibit')body='<div class="exhibit">'+body+'</div>';
 const nav=[['story','The story'],['models','Models'],['terrain','Missions'],['cockpits','Cockpits'],['poses','Animation'],['artwork','Artwork']].map(([id,label])=>`<a href="${up}${id}/"${page.id===id?' aria-current="page"':''}>${label}</a>`).join('');
 const html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(page.description)}"><link rel="canonical" href="${canonical}"><meta name="theme-color" content="#23362d"><meta property="og:type" content="${page.kind==='story'?'article':'website'}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(page.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${base}images/social-preview.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="${up}favicon.svg" type="image/svg+xml">${page.kind==='exhibit'?`<link rel="stylesheet" href="${up}assets/viewer.css">`:''}${page.css?`<link rel="stylesheet" href="${page.css}">`:''}<link rel="stylesheet" href="${up}assets/style.css"><script type="module" src="${up}assets/site.js"></script></head>
<body class="page-${page.kind}"><a class="skip-link" href="#main">Skip to content</a><header class="topbar"><a class="brand" href="${up||'./'}"><img src="${up}favicon.svg" width="30" height="30" alt=""><span>Apache <b>Analysed</b></span></a><button class="nav-toggle" aria-expanded="false" aria-controls="navigation">Menu</button><nav id="navigation" aria-label="Main navigation">${nav}</nav></header><main id="main">${body}</main><footer class="site-footer"><div><a class="footer-brand" href="https://lostengines.com/">Lost Engines ↗</a><p>Exploring and rebuilding old games.</p></div><nav aria-label="More about the project"><a href="${up}about/">About & credits</a><a href="https://github.com/Lost-Engines/apache-analysed">Site source</a><a href="https://github.com/Lost-Engines/apache-cpp">Apache C++</a><a href="https://github.com/Lost-Engines/apache-redux">Apache Redux</a></nav></footer>${page.script?`<script type="module" src="${page.script}"></script>`:''}</body></html>`;
 const directory='dist/'+page.id;await mkdir(directory,{recursive:true});await writeFile(directory+'/index.html',html);
}
// Existing model-use links address /missions/index.html. Keep every hash intact.
await mkdir('dist/missions',{recursive:true});await writeFile('dist/missions/index.html','<!doctype html><html lang="en"><meta charset="utf-8"><title>Mission atlas | Apache Analysed</title><meta name="viewport" content="width=device-width,initial-scale=1"><script>location.replace("../terrain/"+location.hash)</script><p><a href="../terrain/">Open the mission atlas</a></p></html>');
await writeFile('dist/404.html','<!doctype html><html lang="en"><meta charset="utf-8"><title>Page not found | Apache Analysed</title><meta name="viewport" content="width=device-width,initial-scale=1"><h1>Page not found</h1><p><a href="/apache-analysed/">Return to Apache Analysed</a></p></html>');
await writeFile('dist/sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+pages.map(p=>`<url><loc>${base}${p.id?p.id+'/':''}</loc></url>`).join('')+'</urlset>');
await writeFile('dist/robots.txt',`User-agent: *\nAllow: /\nSitemap: ${base}sitemap.xml\n`);
console.log(`Built ${pages.length} pages from the checked-in display snapshot.`);
