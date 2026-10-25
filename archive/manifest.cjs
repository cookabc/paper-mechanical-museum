#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?(['node_modules','qa-output','.git'].includes(e.name)?[]:files(path.join(dir,e.name))):[path.join(dir,e.name)]);}
const list=files(root).filter(p=>path.basename(p)!=='FILE-MANIFEST.json').map(p=>{const b=fs.readFileSync(p);return {path:path.relative(root,p).split(path.sep).join('/'),bytes:b.length,sha256:sha(b)};});
fs.writeFileSync(path.join(root,'FILE-MANIFEST.json'),JSON.stringify({format:1,note:'清单不包含自身；不含node_modules、Git和本地生成输出。',files:list,total_files_excluding_manifest:list.length,total_bytes_excluding_manifest:list.reduce((a,x)=>a+x.bytes,0)},null,2)+'\n');
console.log(`${list.length+1} files including manifest`);
