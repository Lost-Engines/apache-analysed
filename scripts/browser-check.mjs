import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const base=process.env.SITE_URL??'http://127.0.0.1:4173/apache-analysed/',errors=[];
await mkdir('work',{recursive:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
async function go(route,ready){await page.goto('about:blank');await page.goto(base+route);if(ready)await page.waitForFunction(ready,null,{timeout:45000});await page.waitForFunction(()=>[...document.images].filter(i=>i.getClientRects().length&&i.currentSrc&&i.loading!=='lazy').every(i=>i.complete&&i.naturalWidth>0));}
try{
 for(const route of ['', 'story/','artwork/','about/'])await go(route);
 await go('artwork/');await page.getByRole('button',{name:'Earlier discs: map'}).click();await page.waitForFunction(()=>document.querySelector('#palette-picture').src.endsWith('palette-1995.png')&&document.querySelector('#palette-picture').complete);await page.getByRole('button',{name:'Later discs: F-16'}).click();
 await go('models/#3',()=>window.apacheViewer?.ready&&window.apacheViewer.current===3);
 assert.equal(await page.locator('#detail option').count(),4);
 const full=await page.evaluate(()=>window.apacheViewer.stats.triangles);
 await page.locator('#parts').uncheck();await page.waitForFunction(n=>window.apacheViewer.stats.triangles<n,full);
 await page.locator('#parts').check();await page.locator('#detail').selectOption('1213');await page.waitForFunction(()=>window.apacheViewer?.current===1213&&window.apacheViewer.ready);
 await page.locator('#category').selectOption('ships');assert.ok(await page.locator('#list button').count()>0);
 await page.locator('#search').fill('zzzzzz');await page.getByText('No models match these filters.').waitFor();
 await page.locator('#search').fill('');await page.locator('#category').selectOption('all');
 for(const [zone,id]of [['FORT',61],['CYPRUS',41],['KOREA',21],['YEMEN',1]]){await go(`terrain/#zone=${zone}&mission=${id}`,()=>window.apacheTerrain?.ready&&window.apacheTerrain.mission!==null);assert.equal(await page.evaluate(()=>window.apacheTerrain.zone),zone);assert.ok(await page.locator('#briefing h2').textContent());assert.ok(await page.locator('#task option').count()>0);}
 await go('missions/index.html#zone=CYPRUS&mission=41',()=>window.apacheTerrain?.ready&&window.apacheTerrain.mission===41);
 await go('cockpits/',()=>window.apacheCockpits?.ready);assert.equal(await page.locator('#composite img').count(),5);
 await page.locator('#seat').selectOption('1');await page.locator('#resolution').selectOption('320');assert.deepEqual(await page.evaluate(()=>window.apacheCockpits.views),[7,6,5,8,9]);
 await page.locator('#view').selectOption('3');assert.equal(await page.evaluate(()=>window.apacheCockpits.view),8);
 await go('poses/',()=>window.apachePoses?.ready);assert.equal(await page.locator('#file option').count(),104);
 await page.getByRole('button',{name:'Play',exact:true}).click();await page.waitForFunction(()=>window.apachePoses?.time>100);await page.getByRole('button',{name:'Pause',exact:true}).click();assert.equal(await page.evaluate(()=>window.apachePoses.playing),false);
 await page.locator('#time').fill('500');await page.locator('#time').dispatchEvent('input');assert.equal(await page.evaluate(()=>window.apachePoses.time),500);
 await go('');await page.screenshot({path:'work/home-desktop.png',fullPage:true});
 await go('models/#103',()=>window.apacheViewer?.ready);await page.screenshot({path:'work/models-desktop.png',fullPage:true});
 await go('story/');await page.screenshot({path:'work/story-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 for(const route of ['', 'story/','models/','terrain/','cockpits/','poses/','artwork/','about/']){
  await go(route);await page.waitForTimeout(300);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,`Mobile overflow on ${route}`);
 }
 await go('');await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Models',exact:true}).waitFor({state:'visible'});await page.screenshot({path:'work/home-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('Browser checks passed: 8 pages, all 4 maps, LOD/parts/filters, missions, cockpit seats, animation, artwork and mobile navigation.');
}finally{await browser.close();}
