'use strict';
// Real production scene callbacks, render transforms, observation mount and core
// RAF driver. DOM/clock are mocked; this is not browser or visual acceptance.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('./portable-baseline.cjs');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'dist/scenes/vending.js'),'utf8'),core=fs.readFileSync(path.join(root,'dist/core.js'),'utf8'),observer=fs.readFileSync(path.join(root,'dist/observation.js'),'utf8');
const start=core.indexOf('  const steps=new Set(),realTimeSteps=new WeakSet();'),end=core.indexOf('\n  // orbit:',start);assert(start>=0&&end>start);
const frameSource=core.slice(start,end),baseline=cp.execFileSync('git',['show','f9a0acb64984abc0549873957d36350ac5dc9bff:dist/scenes/vending.js'],{cwd:root,encoding:'utf8'});
const copy=x=>JSON.parse(JSON.stringify(x)),near=(a,b,label='',eps=1e-9)=>assert(Math.abs(a-b)<=eps,`${label}: ${a} != ${b}`),tests=[],measurements=[];
function dom(){
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.attrs={};this.events={};this.open=false;this.scrollHeight=0;this.clientHeight=100;this.textContent='';this.disabled=false;this.checked=false;}
  setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}removeAttribute(k){delete this.attrs[k];}
  append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}prepend(...nodes){for(const node of [...nodes].reverse()){node.parentElement=this;this.children.unshift(node);}}
  insertBefore(node,before){node.parentElement=this;const i=this.children.indexOf(before);i<0?this.children.push(node):this.children.splice(i,0,node);}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);}
  addEventListener(type,fn){(this.events[type]||=[]).push(fn);}removeEventListener(type,fn){this.events[type]=(this.events[type]||[]).filter(x=>x!==fn);}emit(type){for(const fn of this.events[type]||[])fn({type,target:this});}
  getBoundingClientRect(){return{top:0};}matches(q){return q.startsWith('.')?(this.className||'').split(' ').includes(q.slice(1)):q.startsWith('#')?this.id===q.slice(1):q==='[data-observe-part]'?!!this.dataset.observePart:this.tagName===q;}
  querySelectorAll(q){return this.children.flatMap(x=>[...(x.matches(q)?[x]:[]),...x.querySelectorAll(q)]);}querySelector(q){return this.querySelectorAll(q)[0]||null;}
 }
 const head=new Element('head'),body=new Element('body'),events={};return{head,body,hidden:false,createElement:t=>new Element(t),getElementById:id=>head.querySelector('#'+id)||body.querySelector('#'+id),addEventListener(t,fn){(events[t]||=[]).push(fn);},removeEventListener(t,fn){events[t]=(events[t]||[]).filter(x=>x!==fn);}};
}
function fixture(old=false){
 const document=dom(),events={},context=vm.createContext({window:{location:{hash:'#vending'},addEventListener(t,fn){(events[t]||=[]).push(fn);},removeEventListener(t,fn){events[t]=(events[t]||[]).filter(x=>x!==fn);}},document,console,Number,Math,addEventListener(){}});
 vm.runInContext(core,context);
 let code=old?baseline:source;
 if(!old){assert(code.includes('const {x,y,z}=itemPose(s);'));code=code.replace('const {x,y,z}=itemPose(s);','const {x,y,z}=itemPose(s);globalThis.__renderedPose={x,y,z};').replace(' function can(x,y,z,i){',' globalThis.__itemPose=itemPose;\n function can(x,y,z,i){');}
 code=code.replace('function can(x,y,z,i){','function can(x,y,z,i){globalThis.__cans?.push({x,y,z,i});');
 vm.runInContext(code,context);const cfg=context.window.SCENES.vending(),s=cfg.state,raf=new Map(),flashes=[];s.pal='mint';s.az=105;
 let now=0,serial=0,frames=0,disposed=0;const ui={st:s,simulationRate:1,metrics:{averageMs:1},render(){frames++;ui.observation?.update();},flash(m){flashes.push(m);},dispose(){disposed++;}};
 vm.runInNewContext(frameSource,{ui,document,art:{setAttribute(){}},smoothMotion:true,performance:{now:()=>now},matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>{const id=++serial;raf.set(id,fn);return id;},cancelAnimationFrame:id=>raf.delete(id)});
 return{cfg,s,ui,context,flashes,get pending(){return raf.size;},get frames(){return frames;},get time(){return now/1000;},get disposed(){return disposed;},
  action(k,i=0){if(k==='reset'&&!cfg.acts.reset)cfg.buttons.find(b=>b.label==='重新开始').onClick(s,ui);else if(k==='refill'&&!cfg.acts.refill)cfg.buttons.find(b=>b.label==='补满库存').onClick(s,ui);else cfg.acts[k](s,{dataset:{i:String(i)}},ui);ui.invalidate();},
  frame(seconds=.04){now+=seconds*1000;const work=[...raf.values()];raf.clear();for(const fn of work)fn(now);},
  tick(seconds){for(let t=0;t<seconds-1e-10;t+=.04)this.frame(Math.min(.04,seconds-t));},
  finish(each=()=>{}){let n=0;while(raf.size&&n++<3000){this.frame();each();}assert.equal(raf.size,0,'RAF reaches rest');},
  pose(){return copy(context.__itemPose(s));},
  navigate(hash){context.window.location.hash=hash;for(const fn of [...(events.hashchange||[])])fn();},
  render(yaw=45,pitch=35.264){context.__cans=[];context.__renderedPose=null;vm.runInContext(`setCam(${yaw},${pitch});setLight(105);`,context);cfg.scene(s,vm.runInContext('PALS.mint',context));return cfg.scene.layers.map(x=>x.svg).join('');},
  observation(){const before=JSON.stringify(s),snapshot=copy(cfg.observation.read(s));assert.equal(JSON.stringify(s),before,'observation cannot mutate');return snapshot;},
  mount(){vm.runInContext(observer,context);const host=document.createElement('section');document.body.append(host);const o=cfg.observation;ui.observation=context.window.MuseumObservation.mount({host,title:o.title,intro:o.intro,slow:o.slow,read:()=>o.read(s),onRate:r=>ui.simulationRate=r,onChange:()=>ui.render()});cfg.setup(ui);const panel=ui.observation.panel,box=panel.querySelector('.vending-fault');assert(box);const buttons=box.querySelectorAll('button');return{panel,box,toggle:box.querySelector('input'),output:box.querySelector('output'),recover:buttons[0],resume:buttons[1],cancel:buttons[2],open(value){panel.open=value;panel.emit('toggle');},rate(value){const button=panel.querySelectorAll('button').find(n=>+n.dataset.rate===value);assert(button);button.onclick();}};}
 };
}
function test(name,fn){try{fn();tests.push({name,ok:true});}catch(error){tests.push({name,ok:false,error:error.stack});}}
function insert(f,n=1){for(let i=0;i<n;i++){f.action('token');f.finish();}}
function jam(f,i=0,n=1){insert(f,n);f.action('faultNext');f.action('choose',i);f.finish();assert.equal(f.s.phase,'jammed');}
function balance(f,coins,paid=0,refunded=0,inventory=9){assert.equal(f.s.tokens+f.s.reservedCoin+paid+refunded,coins,'coin conservation: unused + reserved + completed sales + returned');assert.equal(f.s.stock.reduce((a,b)=>a+b,0)+(f.s.delivered===null?0:1)+f.s.collected,inventory,'can conservation: stock + held + collected');assert(f.s.tokens>=0&&f.s.tokens<=3);assert([0,1].includes(f.s.reservedCoin));for(const n of f.s.stock)assert(Number.isInteger(n)&&n>=0&&n<=3);}
function stable(f){f.finish();const state=JSON.stringify(f.s),svg=f.render(),read=f.observation(),frames=f.frames;f.tick(60);assert.equal(JSON.stringify(f.s),state);assert.equal(f.render(),svg);assert.deepEqual(f.observation(),read);assert.equal(f.frames,frames);assert.equal(f.pending,0);}
function shared(f){return copy(Object.fromEntries(Object.entries(f.s).filter(([k])=>!['reservedCoin','jamNext','jamAtRelease','recoverT','recoveryGoal','message'].includes(k))));}

test('fault is optional, off by default, reversible before purchase, and never a seventh primary step',()=>{
 const f=fixture(),o=f.mount();assert.equal(f.cfg.buttons.length,6);assert.equal(f.s.jamNext,false);assert.equal(f.s.jamAtRelease,false);assert.equal(o.panel.open,false);assert.equal(o.toggle.checked,false);assert.equal(o.toggle.disabled,false);for(const button of [o.recover,o.resume,o.cancel])assert.equal(button.disabled,true);
 o.open(true);o.toggle.onchange();f.finish();assert.equal(f.s.jamNext,true);assert.equal(o.toggle.checked,true);assert.match(o.output.textContent,/已开启一次/);o.toggle.onchange();f.finish();assert.equal(f.s.jamNext,false);insert(f);f.action('choose');f.finish();assert.equal(f.s.phase,'ready');
});
test('all nine default purchases, ordinary refund, refill and every matched frame retain baseline state, timing and exact drawing primitives',()=>{
 const f=fixture(),b=fixture(true);let rendered=0;
 function both(k,i=0){f.action(k,i);b.action(k,i);assert.deepEqual(shared(f),shared(b));let n=0;while(f.pending||b.pending){f.frame();b.frame();assert.deepEqual(shared(f),shared(b));if(n===0||n%17===0||!f.pending){const primitives=svg=>(svg.replace(/<clipPath\b[^>]*>[\s\S]*?<\/clipPath>/g,'').match(/<path\b[^>]*\/>|<text\b[^>]*>[^<]*<\/text>/g)||[]).sort();assert.deepEqual(primitives(f.render()),primitives(b.render()),'normal drawing primitives remain exact (only painter order changes): '+k+' frame '+n);rendered++;}assert(n++<500);}assert.equal(f.pending,b.pending);}
 for(let i=0;i<3;i++)for(let stock=3;stock>0;stock--){both('token');both('choose',i);both('collect');assert.equal(f.s.reservedCoin,0);}both('token');both('token');both('refund');both('refill');assert.equal(f.s.collected,9);assert.deepEqual(copy(f.s.stock),[3,3,3]);measurements.push({normalBaselinePrimitiveFramesRendered:rendered});
});
test('all shelf heights and depths jam at the true release boundary with no first-frame jump',()=>{
 for(let i=0;i<3;i++)for(let stock=1;stock<=3;stock++){
  const f=fixture();f.s.stock[i]=stock;insert(f);f.action('faultNext');f.action('choose',i);f.tick(.52);assert.equal(f.s.phase,'drop');const before=f.pose();f.frame();assert.equal(f.s.phase,'jammed');near(f.s.drop,.28);near(f.s.t,.532);const p=f.pose();near(p.x,41.1);near(p.y,10+(stock-1)*11);near(p.z,33+15.5*i);assert(Math.hypot(p.x-before.x,p.y-before.y,p.z-before.z)<.02,'last release frame advances continuously');
  const svg=f.render();assert.match(svg,/data-observe-part="vending-drink"/);assert.deepEqual(copy(f.context.__renderedPose),p,'renderer uses actual held transform');assert.equal(f.context.__cans.length,6+stock,'one stock can replaced by one held can');assert.equal(f.s.reservedCoin,1);assert.equal(f.s.tokens,0);assert.equal(f.s.stock[i],stock-1);assert.equal(f.s.jamNext,false);assert.equal(f.s.jamAtRelease,false);assert.equal(f.cfg.progress(f.s),null);stable(f);
 }
});
test('recovery follows the same visible path backwards, preserves the held item, and parks exactly at its original shelf slot',()=>{
 for(let i=0;i<3;i++){
  const f=fixture();jam(f,i,3);const from=f.pose(),run=f.s.run;f.action('recover');assert.equal(f.s.phase,'recovering');assert(f.s.run>run);assert.deepEqual(f.pose(),from,'action cannot jump');let x=from.x;f.finish(()=>{balance(f,3);const p=f.pose();assert(p.x<=x+1e-10);assert(p.x>=35.3-1e-10);near(p.y,from.y);near(p.z,from.z);x=p.x;});assert.equal(f.s.phase,'recovered');near(f.s.drop,0);near(f.pose().x,35.3);near(f.pose().y,32);near(f.pose().z,33+15.5*i);assert.equal(f.s.stock[i],2);assert.equal(f.s.delivered,i);assert.equal(f.s.reservedCoin,1);assert.equal(f.cfg.progress(f.s),null);stable(f);
 }
});
test('continue delivers exactly the reserved can and coin once, with unchanged normal travel duration and no re-jam',()=>{
 const f=fixture();jam(f,2,3);f.action('recover');f.finish();const begin=f.pose(),stock=copy(f.s.stock);f.action('continue');assert.equal(f.s.phase,'drop');assert.deepEqual(f.pose(),begin);assert.deepEqual(copy(f.s.stock),stock);assert.equal(f.s.tokens,2);assert.equal(f.s.reservedCoin,1);const time=f.time;f.finish(()=>balance(f,3));assert.equal(f.s.phase,'ready');near(f.time-time,2.8);f.action('collect');f.finish();balance(f,3,1);assert.equal(f.s.collected,1);assert.equal(f.s.reservedCoin,0);f.action('choose',2);f.finish();assert.equal(f.s.phase,'ready','one-shot demo does not re-arm itself');assert.equal(f.s.stock[2],1);f.action('collect');f.finish();balance(f,3,2);
});
test('cancel from jam first returns the visible can, then restores stock, then refunds every coin once',()=>{
 for(let i=0;i<3;i++)for(let coins=1;coins<=3;coins++){
  const f=fixture();jam(f,i,coins);const initial=f.pose();f.action('refund');assert.equal(f.s.phase,'recovering');assert.deepEqual(f.pose(),initial);assert.equal(f.s.refund,0);f.tick(.72);assert.equal(f.s.phase,'recovering');assert(f.s.drop>0);assert.equal(f.s.stock[i],2);assert.equal(f.s.delivered,i);assert.equal(f.s.tokens,coins-1);balance(f,coins);
  f.frame();assert.equal(f.s.phase,'returning');assert.equal(f.s.drop,0);assert.equal(f.s.delivered,null);assert.equal(f.s.stock[i],3);assert.equal(f.s.refund,coins);assert.equal(f.s.reservedCoin,1);assert.equal(f.s.coinT,0);balance(f,coins);f.render();assert.equal(f.context.__cans.length,9,'returned can is stock, never both');
  f.tick(.72);assert.equal(f.s.phase,'returning');balance(f,coins);f.finish();assert.equal(f.s.phase,'idle');assert.equal(f.s.tokens,0);assert.equal(f.s.reservedCoin,0);balance(f,coins,0,coins);assert.equal(f.s.collected,0);const snap=JSON.stringify(f.s);f.action('refund');f.finish();assert.equal(JSON.stringify(f.s),snap);stable(f);
 }
});
test('cancel after completed recovery uses the verified endpoint, with no second recovery or invisible motion',()=>{
 const f=fixture();jam(f,1,2);f.action('recover');f.finish();const held=f.pose();f.render();assert(f.context.__cans.some(p=>p.x===held.x&&p.y===held.y&&p.z===held.z));f.action('refund');assert.equal(f.s.phase,'returning');assert.equal(f.s.stock[1],3);assert.equal(f.s.delivered,null);f.render();assert.equal(f.context.__cans.filter(p=>p.x===held.x&&p.y===held.y&&p.z===held.z&&p.i===1).length,1,'same rendered can slot, exactly one stock can');f.finish();balance(f,2,0,2);
});
test('invalid actions at jam, recovery, recovered and returning cannot double-reserve, double-deliver, or interrupt safe refund',()=>{
 for(const at of ['jammed','recovering','recovered','returning']){
  const f=fixture();jam(f,0,3);if(at==='recovering'||at==='recovered'){f.action('recover');if(at==='recovered')f.finish();else f.tick(.2);}if(at==='returning'){f.action('refund');f.tick(.8);assert.equal(f.s.phase,'returning');}
  const invalid=['token','choose','collect','refill','faultNext',...(at==='recovering'||at==='returning'?['recover','continue','refund','reset']:at==='jammed'?['continue']:[])];const state=JSON.stringify(f.s);
  for(let n=0;n<25;n++)for(const action of invalid)f.action(action,2);
  assert.equal(JSON.stringify(f.s),state,at+' invalid actions leave all state unchanged');assert(f.pending<=1,'one scheduled RAF request');f.finish();if(at!=='returning')balance(f,3);else balance(f,3,0,3);
 }
});
test('rapid cancel/recover/continue cycles never duplicate the main driver, stock, delivery, or refunds',()=>{
 const f=fixture();for(let n=0;n<24;n++){
  jam(f,n%3,3);if(n%2){f.action('recover');for(let k=0;k<10;k++)f.action('recover');f.finish();f.action('continue');for(let k=0;k<10;k++)f.action('continue');f.finish();f.action('collect');for(let k=0;k<10;k++)f.action('collect');f.finish();f.action('refund');f.finish();}else{for(let k=0;k<15;k++)f.action('refund');f.finish();}assert.equal(f.s.phase,'idle');assert.equal(f.s.tokens,0);assert.equal(f.s.reservedCoin,0);assert.equal(f.s.delivered,null);assert.equal(f.s.collected,Math.floor((n+1)/2));f.action('refill');f.finish();assert.deepEqual(copy(f.s.stock),[3,3,3]);assert.equal(f.pending,0);
 }
});
test('fault reset returns item and coins before clearing, including pre-jam cancel and recovered endpoint',()=>{
 for(const at of ['release-start','release-mid','jammed','recovered']){
  const f=fixture();insert(f,3);f.action('faultNext');f.action('choose',1);if(at==='release-mid')f.tick(.2);if(at==='jammed'||at==='recovered')f.finish();if(at==='recovered'){f.action('recover');f.finish();}
  const position=f.pose();f.action('reset');if(position.x>35.3){assert.equal(f.s.phase,'recovering');assert.deepEqual(f.pose(),position);}else assert.equal(f.s.phase,'returning');let sawReturn=f.s.phase==='returning';f.finish(()=>{if(f.s.phase==='returning'){sawReturn=true;assert.equal(f.s.stock[1],3);assert.equal(f.s.delivered,null);assert.equal(f.s.refund,3);}});assert(sawReturn);assert.equal(f.s.phase,'idle');assert.equal(f.s.tokens,0);assert.equal(f.s.reservedCoin,0);assert.equal(f.s.jamNext,false);assert.equal(f.s.delivered,null);assert.deepEqual(copy(f.s.stock),[3,3,3]);assert.match(f.s.message,/退回 3 枚/);stable(f);insert(f);f.action('choose',1);f.finish();assert.equal(f.s.phase,'ready');
 }
});
test('ordinary reset still retires in-flight callbacks and preserves collection count',()=>{
 const f=fixture();insert(f);f.action('choose');f.finish();f.action('collect');f.finish();for(let i=0;i<30;i++){f.action('token');f.tick(.04);f.action('reset');}f.finish();assert.equal(f.s.phase,'idle');assert.equal(f.s.collected,1);assert.equal(f.s.tokens,0);assert.equal(f.s.reservedCoin,0);stable(f);
});
test('three-coin cap, sold-out protection, no-coin selection, and explicit refill remain intact',()=>{
 const f=fixture();f.action('faultNext');f.action('choose',1);assert.equal(f.s.selected,1);assert.equal(f.s.jamNext,true);assert.equal(f.s.reservedCoin,0);insert(f,3);const cap=JSON.stringify(f.s);f.action('token');f.finish();assert.equal(JSON.stringify(f.s),cap);f.s.stock[1]=0;const stock=JSON.stringify(f.s);f.action('choose',1);f.finish();assert.equal(JSON.stringify(f.s),stock);assert.equal(f.s.jamNext,true);f.action('refill');f.finish();assert.deepEqual(copy(f.s.stock),[3,3,3]);f.action('choose',1);f.finish();assert.equal(f.s.phase,'jammed');
});
test('actual optional panel tracks authoritative state, rejects disabled actions, and remains safe when folded',()=>{
 const f=fixture(),o=f.mount();o.open(true);o.toggle.onchange();insert(f,2);f.action('choose',0);f.finish();assert.equal(o.toggle.checked,false);assert.equal(o.toggle.disabled,true);assert.equal(o.recover.disabled,false);assert.equal(o.resume.disabled,true);assert.equal(o.cancel.disabled,false);assert.match(o.output.textContent,/货架出口已停机/);
 o.recover.onclick();f.tick(.2);for(const b of [o.recover,o.resume,o.cancel])assert.equal(b.disabled,true);const snapshot=JSON.stringify(f.s);o.recover.onclick();assert.equal(JSON.stringify(f.s),snapshot);f.finish();assert.equal(o.resume.disabled,false);assert.equal(o.cancel.disabled,false);assert.equal(o.recover.disabled,true);
 o.rate(.25);o.open(false);assert.equal(f.ui.simulationRate,1);assert.equal(f.s.phase,'recovered');stable(f);o.open(true);assert.equal(f.s.phase,'recovered');o.cancel.onclick();f.finish();assert.equal(o.toggle.disabled,false);assert.match(o.output.textContent,/已关闭/);assert.match(o.box.querySelector('p').textContent,/不要摇晃机器/);
});
test('folded and hidden observation controls perform no repetitive DOM property writes and refresh on reopen',()=>{
 const f=fixture(),o=f.mount();o.open(true);let writes=0;for(const [node,keys]of [[o.toggle,['checked','disabled']],[o.output,['textContent']],...[o.recover,o.resume,o.cancel].map(n=>[n,['disabled']])])for(const key of keys){let value=node[key];Object.defineProperty(node,key,{get:()=>value,set:next=>{writes++;value=next;}});}
 for(let i=0;i<40;i++)f.ui.observation.update();assert.equal(writes,0,'same state does not rewrite DOM');o.open(false);f.action('faultNext');insert(f);f.action('choose');f.finish();assert.equal(writes,0,'folded observer stays untouched while real transaction advances');o.open(true);assert(writes>0);assert.match(o.output.textContent,/已停机/);const previous=writes;f.context.document.hidden=true;f.ui.observation.update();assert.equal(writes,previous);f.context.document.hidden=false;
});
test('quarter speed shares the same state/geometry and folding cannot erase or replay a jam',()=>{
 const fast=fixture(),slow=fixture(),o=slow.mount();o.open(true);insert(fast);insert(slow);for(const f of [fast,slow]){f.action('faultNext');f.action('choose',2);}o.rate(.25);
 for(let n=0;n<14;n++){fast.frame();for(let k=0;k<4;k++)slow.frame();near(fast.s.drop,slow.s.drop);for(const key of ['x','y','z'])near(fast.pose()[key],slow.pose()[key]);}assert.equal(slow.s.phase,'jammed');o.open(false);assert.equal(slow.s.phase,'jammed');stable(slow);o.open(true);slow.action('recover');slow.finish();assert.equal(slow.s.phase,'recovered');
});
test('recovery endpoint, refund substitution and continuation share identical shelf artwork across all rows and views',()=>{
 const artwork=(f,yaw,pitch)=>{f.render(yaw,pitch);return (f.cfg.scene.layers.find(l=>l.key==='window')?.svg||'').replace(/<g\b[^>]*>|<\/g>/g,'');};let comparisons=0;
 for(let i=0;i<3;i++)for(const count of [1,2,3]){const f=fixture();f.s.stock[i]=count;jam(f,i,2);f.action('recover');f.finish();const recovered=copy(f.s);
  for(const yaw of [0,45,90,135,180,225,270,315])for(const pitch of [6,35,78]){Object.assign(f.s,copy(recovered));const base=artwork(f,yaw,pitch);f.s.phase='recovering';f.s.drop=1e-12;assert.equal(artwork(f,yaw,pitch),base,'near-zero recovery has same shelf painter order');Object.assign(f.s,copy(recovered));f.action('continue');assert.equal(artwork(f,yaw,pitch),base,'continue does not move the held can into a different layer');Object.assign(f.s,copy(recovered));f.action('refund');assert.equal(artwork(f,yaw,pitch),base,'held→stock substitution has identical ordered shelf shapes');comparisons+=3;}
 }measurements.push({samePoseShelfBoundaryComparisons:comparisons});
});
test('all fault stages render finite original geometry across shelf heights, eight azimuths and three elevations',()=>{
 let renders=0;for(let i=0;i<3;i++){const f=fixture();jam(f,i,2);const states=[copy(f.s)];f.action('recover');states.push(copy(f.s));f.tick(.4);states.push(copy(f.s));f.finish();states.push(copy(f.s));f.action('refund');states.push(copy(f.s));f.finish();states.push(copy(f.s));
  for(const s of states){Object.assign(f.s,s);for(const yaw of [0,45,90,135,180,225,270,315])for(const pitch of [6,35.264,78]){const svg=f.render(yaw,pitch);assert(!/NaN|Infinity|undefined/.test(svg));assert(!/<(?:path|rect)[^>]*(?:fill="transparent"|opacity="0")/.test(svg));if(yaw===45){const parts=new Set([...svg.matchAll(/data-observe-part="([^\"]+)"/g)].map(m=>m[1]));for(const active of f.observation().active)assert(parts.has(active),'active observer part is a rendered component');}if(yaw>=90&&yaw<=270)assert(!svg.includes('data-act="choose"'),'no back-face controls');renders++;}}
 }measurements.push({faultPhaseViewRenders:renders});
});
test('actual hashchange route event cancels retained callbacks before shell reload, and a fresh scene cannot inherit a held transaction',()=>{
 for(const at of ['drop','jammed','recovering','recovered','returning']){
  const f=fixture();f.mount();insert(f,2);f.action('faultNext');f.action('choose');if(at!=='drop')f.finish();if(at==='recovering'||at==='recovered'){f.action('recover');if(at==='recovered')f.finish();else f.tick(.2);}if(at==='returning'){f.action('refund');f.tick(.8);}
  assert.equal(f.s.phase,at);f.navigate('#camera');assert.equal(f.disposed,1);f.ui.dispose();assert.equal(f.disposed,1,'leave is idempotent');const snapshot=JSON.stringify(f.s);f.finish();f.tick(30);assert.equal(JSON.stringify(f.s),snapshot,'disposed transaction cannot complete behind another scene');const fresh=fixture();assert.equal(fresh.s.jamNext,false);assert.equal(fresh.s.reservedCoin,0);assert.equal(fresh.s.delivered,null);assert.equal(fresh.s.tokens,0);assert.deepEqual(copy(fresh.s.stock),[3,3,3]);
 }
});
const report={passed:tests.filter(t=>t.ok).length,total:tests.length,measurements,limits:'Production scene callbacks, render transforms, optional-panel mount and core RAF, mocked DOM/clock. No browser, publication, acoustic listening or actual repair claim.',tests};console.log(JSON.stringify(report,null,2));if(report.passed!==report.total)process.exitCode=1;
