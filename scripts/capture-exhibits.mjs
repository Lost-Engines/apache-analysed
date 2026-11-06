const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:1});
page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
page.on('response',r=>{if(r.status()>=400)console.log('HTTP',r.status(),r.url());});
const base=process.env.SITE_URL??'http://127.0.0.1:4173/apache-analysed/';
for(const [id,name]of [[103,'apache'],[3,'a10']]){
 await page.goto('about:blank');await page.goto(base+'models/#'+id);await page.waitForFunction(id=>window.apacheViewer?.ready&&window.apacheViewer.current===id,id,{timeout:30000});
 await page.addStyleTag({content:'.model-browser{display:block}.model-browser #view{width:1200px;height:750px;max-height:none;aspect-ratio:auto}.model-browser .viewer-wrap{width:1200px;border:0}'});
 await page.waitForTimeout(500);console.log(name,await page.evaluate(()=>window.apacheViewer));
 await page.locator('#view').screenshot({path:`public/images/${name}.png`});
}
await page.goto(base+'terrain/#zone=CYPRUS&mission=41');await page.waitForFunction(()=>window.apacheTerrain?.ready&&window.apacheTerrain.mission===41,null,{timeout:45000});
console.log('terrain',await page.evaluate(()=>window.apacheTerrain));
await page.addStyleTag({content:'.map-grid{display:block}.map-grid #view{width:1200px;height:800px}.map-grid .viewer-wrap{width:1200px;border:0}'});
await page.waitForTimeout(500);await page.locator('#view').screenshot({path:'public/images/terrain.png'});
await page.goto(base+'poses/');await page.waitForFunction(()=>window.apachePoses?.ready);
console.log('poses',await page.evaluate(()=>window.apachePoses));
await page.addStyleTag({content:'#figure{width:1200px!important;height:750px!important}.viewer-wrap{width:1200px;border:0}'});
await page.locator('#time').fill('400');await page.locator('#time').dispatchEvent('input');await page.waitForTimeout(300);await page.locator('#figure').screenshot({path:'public/images/poses.png'});
await browser.close();
