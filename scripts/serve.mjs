import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('dist'),port=Number(process.env.PORT??4173),prefix='/apache-analysed/';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{try{
 let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(url.startsWith(prefix))url=url.slice(prefix.length);else url=url.slice(1);
 let file=resolve(root,url);if(file!==root&&!file.startsWith(root+sep))throw Error('Path');
 if((await stat(file)).isDirectory())file=resolve(file,'index.html');
 res.setHeader('Content-Type',types[extname(file)]??'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`http://127.0.0.1:${port}/apache-analysed/`));
