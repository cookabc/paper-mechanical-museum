/** Regenerate the solid previews directly from production drawing + stage code.
 * Run: node scripts/render-solid-previews.mjs (Node 24; existing dev dependencies only).
 * CSS is irrelevant to standalone SVG; TypeScript is transpiled in memory.
 */
import {registerHooks} from 'node:module';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {JSDOM} from 'jsdom';
registerHooks({
 resolve(specifier,context,next){
  if(specifier.startsWith('.')&&context.parentURL){
   const url=new URL(specifier,context.parentURL);
   if(!/\.[a-z]+$/i.test(url.pathname)&&existsSync(fileURLToPath(url)+'.ts'))return {url:url.href+'.ts',shortCircuit:true};
  }
  return next(specifier,context);
 },
 load(url,context,next){
  if(url.endsWith('.css'))return {format:'module',source:'export {};',shortCircuit:true};
  if(url.endsWith('.ts'))return {format:'module',source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText,shortCircuit:true};
  return next(url,context);
 }
});
const dom=new JSDOM('<!doctype html><body></body>',{pretendToBeVisual:true});
for(const key of ['window','document','Element','HTMLElement','SVGElement'])globalThis[key]=key==='window'?dom.window:key==='document'?dom.window.document:dom.window[key];
const {ResourceScope}=await import('../src/app/scope.ts');
const {createObjectStage}=await import('../src/shared/object-stage.ts');
const specs=[
 {id:'bicycle',title:'自行车传动的手绘立体模型',bounds:[-14,-3,0,18,127,85],camera:[-25,28],palette:'mint'},
 {id:'generator',title:'手摇发电机的手绘立体模型',bounds:[-5,-6,0,113,78,87],palette:'mustard'},
 {id:'automaton',title:'凸轮小鸟的手绘立体模型',bounds:[5,4,3,93,50,106],camera:[56,25],palette:'tomato'},
 {id:'geneva',title:'日内瓦转盘的手绘立体模型',bounds:[2,3,0,105,82,58],camera:[60,38],palette:'mint'},
 {id:'rackpress',title:'齿条印章机的手绘立体模型',bounds:[5,4,0,92,82,120],camera:[64,24],palette:'mint'}
];
for(const spec of specs){
 const {drawing,generatorCamera}=await import(`../src/exhibits/${spec.id}/drawing.ts`);
 const {initialState}=await import(`../src/exhibits/${spec.id}/model.ts`);
 const root=document.createElement('main');document.body.append(root);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),controls=document.createElement('div');root.append(svg,controls);
 const scope=new ResourceScope(),state=initialState();
 const stage=createObjectStage({root,scope,audio:{},observation:{}},svg,controls,{...spec,camera:generatorCamera??spec.camera,draw:(g,p)=>drawing(state,g,p),action:()=>{}});
 stage.render();
 // Retain the production camera fit, palette, grain filter and exact stroke scaling.
 // Standalone previews carry no focus targets or simulated controls.
 for(const element of [svg,...svg.querySelectorAll('*')])for(const name of [...element.getAttributeNames()])if(name.startsWith('data-')||name.startsWith('aria-')||['tabindex','role','class'].includes(name))element.removeAttribute(name);
 svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width','640');svg.setAttribute('height','500');svg.setAttribute('role','img');
 const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=spec.title;svg.prepend(title);
 const output=new URL(`../public/previews/${spec.id}.svg`,import.meta.url);
 writeFileSync(output,svg.outerHTML+'\n');
 console.log(`${spec.id}: ${svg.getAttribute('viewBox')}, ${svg.querySelectorAll('path').length} paths`);
 scope.dispose();root.remove();
}
dom.window.close();
