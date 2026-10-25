#!/usr/bin/env node
'use strict';
// 零依赖开发服务器；不绑定公网，静态部署也可直接使用整个目录。
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8'};
function createServer(){return http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 let rel;try{rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
 if(rel.split('/').some(x=>x==='..'||x.startsWith('.')||x==='node_modules')){res.writeHead(403);res.end();return;}
 let file=path.resolve(ROOT,'.'+rel);
 if(!file.startsWith(ROOT+path.sep)&&file!==ROOT){res.writeHead(403);res.end();return;}
 try{if(fs.statSync(file).isDirectory()){if(!rel.endsWith('/')){res.writeHead(301,{Location:rel+'/'+new URL(req.url,'http://localhost').search});res.end();return;}file=path.join(file,'index.html');}if(!fs.statSync(file).isFile())throw Error();}catch{res.writeHead(404);res.end('Not found');return;}
 res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
});}
if(require.main===module){const port=Number(process.env.PORT||4180);const server=createServer();server.listen(port,'127.0.0.1',()=>console.log(`纸上机械馆：http://127.0.0.1:${server.address().port}/`));server.on('error',e=>{console.error(e.message);process.exitCode=1;});}
module.exports={createServer,ROOT};
