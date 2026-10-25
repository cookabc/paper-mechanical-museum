/* Deterministic DOM/source harness. This is not native browser layout/paint QA. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('./portable-baseline.cjs');
const root=path.resolve(__dirname,'../..');
// Use an installed jsdom, with the available workspace installation as fallback.
let JSDOM;for(const entry of [process.env.JSDOM_PATH,'jsdom'].filter(Boolean)){try{({JSDOM}=require(entry));break}catch{}}if(!JSDOM)throw Error('Install jsdom or set JSDOM_PATH to its installed package directory.');
module.exports=function(site,baseline){
 const repo=path.join(root,site),read=file=>baseline?cp.execFileSync('git',['-C',repo,'show',baseline+':dist/'+file],{encoding:'utf8'}):fs.readFileSync(path.join(repo,'dist',file),'utf8');
 const html=read('index.html'),dom=new JSDOM(html,{runScripts:'outside-only',url:'https://candidate.test/'}),w=dom.window,d=w.document,ctx=dom.getInternalVMContext();
 let now=0,serial=0;const frames=new Map(),timers=new Map();
 w.matchMedia=()=>({matches:false});w.requestAnimationFrame=f=>{frames.set(++serial,f);return serial};w.cancelAnimationFrame=id=>frames.delete(id);w.setTimeout=(f,delay=0)=>{timers.set(++serial,{f,time:now+delay});return serial};w.clearTimeout=id=>timers.delete(id);Object.defineProperty(w.performance,'now',{value:()=>now});Object.defineProperty(d,'hidden',{value:false,writable:true});
 w.Element.prototype.getBoundingClientRect=()=>({width:760,height:570,left:0,top:0,right:760,bottom:570});w.Element.prototype.scrollIntoView=function(){};
 w.SVGElement.prototype.getScreenCTM=()=>null;w.SVGElement.prototype.setPointerCapture=function(id){this._capture=id};w.SVGElement.prototype.hasPointerCapture=function(id){return this._capture===id};w.SVGElement.prototype.releasePointerCapture=function(){this._capture=null};Object.defineProperty(w.SVGElement.prototype,'viewBox',{configurable:true,get(){const [x=0,y=0,width=160,height=120]=(this.getAttribute('viewBox')||'').split(/\s+/).map(Number);return{baseVal:{x,y,width,height}}}});
 const run=source=>vm.runInContext(source,ctx);run(read('observation.js'));run(read('mechanical-audio.js'));
 if(site==='washer-study'){for(const [,script]of html.matchAll(/<script>([\s\S]*?)<\/script>/g))run(script);}else{run(read('engine.js'));run(read('fan.js'));}
 const event=(target,name,extra={})=>{const e=new w.Event(name,{bubbles:true,cancelable:true});for(const [k,v]of Object.entries(extra))Object.defineProperty(e,k,{value:v});target.dispatchEvent(e);return e};
 const toggle=(el,on)=>{el.open=on;event(el,'toggle')};
 const advance=ms=>{for(let t=0;t<ms;t+=16.667){now+=16.667;const batch=[...frames.values()];frames.clear();batch.forEach(f=>f(now));for(const [id,timer]of [...timers])if(timer.time<=now){timers.delete(id);timer.f()}}};
 const observer=()=>run(site==='washer-study'?'washerObservation':'fanObservation');
 const light=()=>run(site==='washer-study'?'ui.__realRender=ui.render;ui.render=()=>washerObservation?.update()':'globalThis.__realRender=render;render=()=>fanObservation?.update()');
 const render=()=>run(site==='washer-study'?'(ui.__realRender||ui.render)()':'(globalThis.__realRender||render)()');
 const readState=()=>JSON.parse(JSON.stringify(run(site==='washer-study'?'ui.st':'state')));
 const open=()=>{const outer=d.querySelector('.mechanism-observer'),inner=d.querySelector('.mechanism-lesson');toggle(outer,true);toggle(inner,true);return{outer,inner}};
 const click=selector=>{const node=d.querySelector(selector);if(!node)throw Error('Missing '+selector);node.click();return node};
 const hidden=on=>{d.hidden=on;event(d,'visibilitychange')};
 return {w,d,run,event,toggle,advance,observer,light,render,readState,open,click,hidden,frames,timers,close:()=>{observer()?.dispose();w.close()}};
};
