#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {ROOT,createServer}=require('./server.cjs');const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const projects=['object-collection','washer-study','fan-study','claw-studio'];let assets=0,hashes=0;
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
(async()=>{const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
try{
 const routes=['/','/object-collection/dist/',...['coffee','musicbox','vending','toaster','turntable','camera','elevator'].map(x=>'/object-collection/dist/#'+x),'/washer-study/dist/','/fan-study/dist/','/claw-studio/dist/'];
 for(const route of routes){const r=await fetch(base+route);assert.equal(r.status,200,route);assert.match(await r.text(),/<html/i,route);}
 for(const project of projects){const dir=path.join(ROOT,project,'dist');for(const file of walk(dir)){
  const rel=path.relative(ROOT,file).split(path.sep).join('/');assert.equal((await fetch(base+'/'+rel)).status,200,rel);assets++;
  if(!/\.(js|html|css)$/.test(file))continue;const source=fs.readFileSync(file,'utf8');
  assert(!/https:\/\/[^\s'"<>]*(?:chatgpt\.site|vercel\.app)/.test(source),'外部托管依赖: '+rel);
  if(!file.endsWith('.html'))continue;
  for(const m of source.matchAll(/(?:src|href)=["']([^"']+)["']/g)){
   const ref=m[1];if(/^(?:https?:|data:|#|\$|\{|javascript:)/.test(ref)||ref.includes('${'))continue;
   const url=new URL(ref,base+'/'+rel);if(url.origin!==base)continue;
   // 只验证真实静态文件路径；动态SVG片段与模板属性不当成URL。
   if(!/\.(?:js|css|svg|html)(?:\?|$)|\/$/.test(url.pathname))continue;
   assert.equal((await fetch(url)).status,200,rel+' -> '+ref);
   if(/^[a-f0-9]{12}$/.test(url.searchParams.get('v')||'')){const target=path.join(ROOT,decodeURIComponent(url.pathname));assert.equal(url.searchParams.get('v'),hash(fs.readFileSync(target)).slice(0,12),rel+'缓存签名');hashes++;}
  }
 }}
 const shell=fs.readFileSync(path.join(ROOT,'object-collection/dist/shell.js'),'utf8');
 for(const p of ['washer-study','fan-study','claw-studio'])assert(shell.includes('../../'+p+'/dist/'),p+'本地入口');
 const config=JSON.parse(fs.readFileSync(path.join(ROOT,'vercel.json'),'utf8'));assert.deepEqual(config.git.deploymentEnabled,{'complete-museum-source':false});
 console.log(JSON.stringify({routes:routes.length,exhibits:10,runtimeFiles:assets,cacheHashes:hashes,status:'PASS'},null,2));
}finally{server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
