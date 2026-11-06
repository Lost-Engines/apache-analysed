import {readFile,readdir,stat,lstat} from 'node:fs/promises';
import {resolve,dirname,extname,relative} from 'node:path';
import {parse} from 'parse5';
const root=resolve('dist'),files=[],errors=[],ids=new Map();
async function walk(path){for(const e of await readdir(path,{withFileTypes:true})){const p=resolve(path,e.name);if((await lstat(p)).isSymbolicLink())errors.push('Symlink: '+p);else if(e.isDirectory())await walk(p);else files.push(p);}}
await walk(root);
const allowed=new Set(['.html','.css','.js','.mjs','.json','.png','.webp','.jpg','.svg','.xml','.txt','']);
for(const file of files){if(!allowed.has(extname(file)))errors.push('Unexpected file type: '+file);if(/(?:^|\/)(?:installs|install.media|work|checks|node_modules|\.git|roms)(?:\/|$)/i.test(relative(root,file)))errors.push('Private directory: '+file);if((await stat(file)).size>30*1024*1024)errors.push('Oversized file: '+file);}
function nodes(n){return[n,...(n.childNodes??[]).flatMap(nodes)];}
const html=files.filter(p=>p.endsWith('.html')),links=[];
for(const file of html){const content=await readFile(file,'utf8'),elements=nodes(parse(content)),seen=new Set();
 if(content.includes('\u2014'))errors.push('Em dash: '+file);
 for(const node of elements){const a=Object.fromEntries((node.attrs??[]).map(x=>[x.name,x.value]));if(a.id){if(seen.has(a.id))errors.push('Duplicate id: '+file+'#'+a.id);seen.add(a.id);}if('download'in a)errors.push('Download control: '+file);if(node.tagName==='img'&&!('alt'in a))errors.push('Image without alt: '+file);for(const key of ['href','src'])if(a[key])links.push({file,url:a[key]});}ids.set(file,seen);
}
for(const {file,url}of links){if(/^(?:https?:|mailto:|data:)/.test(url))continue;
 const [path,hash]=url.split('#');let target=path.startsWith('/apache-analysed/')?resolve(root,path.slice('/apache-analysed/'.length)):resolve(dirname(file),path||'.');if(!path)target=file;
 try{if((await stat(target)).isDirectory())target=resolve(target,'index.html');await stat(target);}catch{errors.push('Broken link: '+relative(root,file)+' -> '+url);continue;}
 if(hash&&ids.has(target)&&!['models','terrain','missions'].some(x=>target===resolve(root,x,'index.html'))&&!ids.get(target).has(decodeURIComponent(hash)))errors.push('Missing anchor: '+url);
}
for(const file of files.filter(p=>/\.(?:js|mjs)$/.test(p))){const source=await readFile(file,'utf8');for(const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){try{await stat(resolve(dirname(file),match[1]));}catch{errors.push('Missing module: '+file+' -> '+match[1]);}}}
const models=JSON.parse(await readFile(root+'/models/index.json'));for(const model of models)await stat(root+`/models/data/${model.id}.json`);
const missions=JSON.parse(await readFile(root+'/missions/index.json'));for(const mission of missions)for(const kind of ['data','native'])await stat(root+`/missions/${kind}/${mission.id}.json`);
const cockpit=JSON.parse(await readFile(root+'/cockpits/index.json'));for(const item of [...cockpit.sprites,...cockpit.layouts])await stat(root+'/cockpits/'+item.image);
const art=await readFile('content/story.md','utf8');if(/not a claim|the user|it.s worth noting|\u2014/i.test(art))errors.push('Review article wording');
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`Checked ${html.length} HTML pages, ${links.length} links, ${models.length} models, ${missions.length} missions and all cockpit images. ${files.length} publishable files.`);
