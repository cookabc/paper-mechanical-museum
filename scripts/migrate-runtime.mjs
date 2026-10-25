// One-time, auditable ESM boundary migration. Not loaded by the browser or build.
import fs from 'node:fs';
import path from 'node:path';
import {parse} from 'acorn';
import {analyze} from 'eslint-scope';
if(fs.existsSync('src/engines/colorfigures/runtime.js'))throw new Error('One-time boundary import only; reviewed modules must be edited directly.');
const base=path.resolve('tests/fixtures/complete-source/object-collection/dist');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const write=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s);};
function walk(n,fn){if(!n||typeof n!=='object')return;if(n.type)fn(n);for(const [k,v] of Object.entries(n)){if(k==='parent')continue;if(Array.isArray(v))v.forEach(x=>walk(x,fn));else if(v&&typeof v==='object')walk(v,fn);}}
function edits(code,list){for(const [start,end,text]of list.sort((a,b)=>b[0]-a[0]||b[1]-a[1]))code=code.slice(0,start)+text+code.slice(end);return code;}
function ownHandlers(code){const ast=parse(code,{ecmaVersion:'latest',sourceType:'module',ranges:true});const list=[];walk(ast,n=>{if(n.type==='AssignmentExpression'&&n.operator==='='&&n.left.type==='MemberExpression'&&!n.left.computed&&/^on[a-z]+$/.test(n.left.property.name)){list.push([n.start,n.right.start,`scope.bindProperty(${code.slice(n.left.object.start,n.left.object.end)},${JSON.stringify(n.left.property.name)},`],[n.end,n.end,')']);}if(n.type==='CallExpression'&&n.callee.type==='MemberExpression'&&!n.callee.computed&&n.callee.property.name==='addEventListener'){list.push([n.callee.start,n.arguments[0].start,`scope.listen(${code.slice(n.callee.object.start,n.callee.object.end)},`]);}});return edits(code,list);}
let core=read('core.js');
const coreAst=parse(core,{ecmaVersion:'latest',sourceType:'script',ranges:true});
const names=coreAst.body.flatMap(n=>n.type==='VariableDeclaration'?n.declarations.flatMap(d=>d.id.type==='Identifier'?[d.id.name]:[]):n.type==='FunctionDeclaration'?[n.id.name]:[]).filter(x=>x!=='CORE_CSS');
const css=coreAst.body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='CORE_CSS'));
write('src/engines/colorfigures/base.css',core.slice(css.declarations[0].init.start+1,css.declarations[0].init.end-1));
core=core.slice(0,css.start)+core.slice(css.end);
core=core.replace(/  let style = document.getElementById\('figure-base-styles'\);\n  if \(!style\).*\n/,'');
core=core.replace('    <header><h1>${cfg.title}</h1><span>${cfg.hint || \'\'}</span></header>\n','');
core=core.replace('  window.MechanicalAudio?.dispose();\n','');
core=core.replace('  window.__st = st;','  // State is exposed only by this controller snapshot, never on window.');
core=core.replace('  ui.render = () => {','  ui.render = () => { if (!scope.active) return;');
core=core.replace('ui.animate=(step,options)=>{','ui.animate=(step,options)=>{if(!scope.active)return;');
core=core.replace('ui.invalidate=()=>{','ui.invalidate=()=>{if(!scope.active)return;');
core=core.replace('const activate=a=>{','const activate=a=>{if(!scope.active||scope.paused)return;');
core=core.replace('    const img = new Image();','    const img = new Image(); scope.onCleanup(()=>{img.onload=null;img.onerror=null;});');
core=core.replace('img.onload = () => { try {','img.onload = () => { if(!scope.active)return; try {');
core=core.replace('  return ui;\n}',`  ui.pause=()=>{cancelInput();cancelAnimationFrame(frameId);driving=false;scope.pause();audio?.suspend?.('pause');};
  ui.resume=()=>{if(!scope.active)return;lastT=performance.now();lastPaint=0;scope.resume();ui.invalidate();};
  ui.dispose=()=>{if(!scope.active)return;cancelInput();steps.clear();camAnim++;spinRun++;ui.observation?.dispose();disposeAudio?.();scope.dispose();};
  return ui;
}`);
const prefix=`import {scopedDocument} from '../../app/scoped-dom';\nexport function createColorFiguresRuntime(context){\nconst {root,scope,audio,observation}=context;\nconst document=scopedDocument(root,scope);\nconst window={MechanicalAudio:audio,MuseumObservation:observation};\nconst addEventListener=(...args)=>scope.listen(globalThis.window,...args);\nconst requestAnimationFrame=scope.raf,cancelAnimationFrame=scope.cancelRaf,setTimeout=scope.timeout,clearTimeout=scope.clearTimeout;\n`;
core=ownHandlers(prefix+core+`\nreturn {${names.map(x=>`get ${x}(){return ${x}}`).join(',')}};\n}\n`);
write('src/engines/colorfigures/runtime.js',core);
const source=read('scenes/coffee.js');
const start=source.indexOf('window.SCENES.coffee=()=>{')+'window.SCENES.coffee=()=>{'.length;
let body=source.slice(start,source.lastIndexOf('};})();'));
let scene=`export function createCoffee(geometry,environment){const {window,document,scope}=environment;\n${body}\n}\n`;
const ast=parse(scene,{ecmaVersion:'latest',sourceType:'module',ranges:true});
const scope=analyze(ast,{ecmaVersion:2022,sourceType:'module',ignoreEval:true});
const refs=scope.globalScope.through.filter(x=>names.includes(x.identifier.name)).map(x=>x.identifier);
scene=edits(scene,refs.map(n=>[n.start,n.end,`geometry.${n.name}`]));
scene=ownHandlers(scene);
write('src/exhibits/coffee/model.js',scene);
console.log('ESM boundary generated; geometry/function bodies retained, free core references explicit:',refs.length);
