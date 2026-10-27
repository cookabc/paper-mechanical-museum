import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('dist');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
const files=walk(root).map(file=>path.relative(root,file).replaceAll('\\','/')).sort();
assert(files.includes('index.html'),'missing application entry');
assert.equal(files.filter(file=>file.startsWith('previews/')&&file.endsWith('.svg')).length,15,'fifteen exhibit previews');
for(const file of files){
 assert(file==='index.html'||/^assets\/[^/]+\.(?:js|css)$/.test(file)||/^previews\/[^/]+\.svg$/.test(file),'unexpected public build asset: '+file);
 const text=fs.readFileSync(path.join(root,file),'utf8');
 assert(!text.includes('tests/fixtures/complete-source')&&!text.includes('/workspace/')&&!text.includes('appgprj_'),'development-only path or hosting identity in public asset: '+file);
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="(\.\/assets\/[^"?#]+)"/g))assert(fs.existsSync(path.join(root,match[1])),'missing entry asset '+match[1]);
assert(!/<iframe\b/i.test(html),'nested site is not a unified entry');
console.log(`Build boundary PASS: ${files.length} runtime assets; entry, bundles and fifteen previews only.`);
