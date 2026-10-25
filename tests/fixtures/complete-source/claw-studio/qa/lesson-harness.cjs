/* Deterministic production script harness. JSDOM provides DOM/focus only;
 * rendering, browser layout, touch defaults and screen readers are not certified.
 * npm install --prefix qa --ignore-scripts; node qa/audit-claw-lesson.cjs
 * Or set CLAW_QA_JSDOM to an existing official jsdom package directory. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('./portable-baseline.cjs');
const {JSDOM}=require(process.env.CLAW_QA_JSDOM||'jsdom');
const root=path.resolve(__dirname,'..'),baselineRef='d44c817';
const source=(file,baseline=false)=>baseline?cp.execFileSync('git',['show',(typeof baseline==='string'?baseline:baselineRef)+':dist/'+file],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,'dist',file),'utf8');
function fixture({baseline=false,full=false,coarse=false,audio=null}={}){
 const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://claw.test/'}),d=dom.window.document,proto=dom.window.Element.prototype;
 proto.getBoundingClientRect=()=>({left:0,top:0,width:760,height:570,right:760,bottom:570});
 proto.scrollIntoView=function(){};proto.setPointerCapture=function(id){this.capture=id;};proto.hasPointerCapture=function(id){return this.capture===id;};proto.releasePointerCapture=function(){this.capture=null;};
 Object.defineProperty(proto,'viewBox',{get(){const [x=0,y=0,width=160,height=120]=(this.getAttribute('viewBox')||'').split(/\s+/).map(Number);return{baseVal:{x,y,width,height}};}});
 Object.defineProperty(d,'hidden',{value:false,writable:true});
 // Toggle dispatch is explicit, preventing JSDOM's asynchronous native queue
 // from outliving a disposed fixture. Browser coalescing needs real-browser QA.
 Object.defineProperty(dom.window.HTMLDetailsElement.prototype,'open',{get(){return !!this._qaOpen;},set(value){this._qaOpen=!!value;}});
 let now=0,serial=0,frames=0;const raf=new Map(),timers=new Map(),events={},messages=[],steps=new Set();
 const c={console,Math,Number,URLSearchParams,document:d,location:{search:''},Image:undefined,performance:{now:()=>now},matchMedia:()=>({matches:coarse}),requestAnimationFrame:fn=>{const id=++serial;raf.set(id,fn);return id;},cancelAnimationFrame:id=>raf.delete(id),setTimeout:(fn,ms)=>{const id=++serial;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),addEventListener:(type,fn)=>(events[type]??=[]).push(fn),removeEventListener:(type,fn)=>events[type]=(events[type]||[]).filter(f=>f!==fn)};c.window=c;vm.createContext(c);const run=s=>vm.runInContext(s,c);
 const audioHarness=audio?.(c,dom.window);if(audioHarness)run(source('mechanical-audio.js',baseline));
 const index=source('index.html',baseline),app=source('app.js',baseline);for(const [,s]of index.matchAll(/<script>([\s\S]*?)<\/script>/g))run(s);
 if(full){run(source('observation.js',baseline));run(app);}
 else{
  run(app.slice(0,app.indexOf('const ui=mountFigure')));
  c.__message=text=>messages.push(text);c.__frames=()=>frames++;c.__steps=steps;
  run('const ui={st,metrics:{averageMs:1},render(){__frames();ui.observation?.update();},flash:__message,feedback:__message,clearFeedback(){},invalidate(){},animate(fn){__steps.add(fn);}};function releaseControls(){st.moving=false;}');
  // UI object resolves callbacks when called, after these host hooks exist.
  run('st.pal="mint";st.az=105;');
  run(app.slice(app.indexOf('const phaseLabels='),app.indexOf('const tactileRender=')));
  run(app.slice(app.indexOf('function readClawObservation(){'),app.indexOf('clawObservation=window.MuseumObservation')));
  if(app.includes('let clawLessonEnabled=false;')){run(app.slice(app.indexOf('let clawLessonEnabled=false;'),app.indexOf('const clawLesson=')));run('function updateExtrasOverflow(){}');}
 }
 const ui=run('ui'),s=run('st');
 const f={c,d,dom,run,ui,s,messages,steps,audio:audioHarness,get pending(){return full?raf.size:steps.size;},get frames(){return frames;},get timers(){return timers.size;},
  frame(dt=.04){now+=dt*1000;frames++;for(const context of audioHarness?.contexts||[])context.tick(dt);if(full){const callbacks=[...raf.values()];raf.clear();for(const fn of callbacks)fn(now);}else if(!d.hidden){for(const fn of [...steps])if(fn(dt)===false)steps.delete(fn);}for(const[id,t]of[...timers])if(t.at<=now){timers.delete(id);t.fn();}},
  tick(seconds){for(let t=0;t<seconds-1e-9;t+=.04)this.frame(Math.min(.04,seconds-t));},
  finish(limit=1500){let i=0;while(this.pending&&i++<limit)this.frame();if(this.pending)throw Error('Animation never settled');},
  action(name,...args){c.__args=args;run(name+'(st,...__args,ui)');if(full)ui.invalidate();},
  event(type,fields={}){for(const fn of events[type]||[])fn({type,...fields});},
  toggle(el,on){el.open=on;el.dispatchEvent(new dom.window.Event('toggle'));},
  open(){this.toggle(ui.observation.panel,true);this.toggle(d.querySelector('.claw-guide'),true);},
  read(){return JSON.parse(run('JSON.stringify(readClawLesson())'));},
  lesson(on){run('toggleClawLesson('+on+')');},
  choice(id){c.__choice=id;run('chooseClawLesson(__choice)');},
  next(){run('advanceClawLesson()');},
  snapshot(){return JSON.parse(run('JSON.stringify(st)'));},
  render(yaw=38,pitch=23){c.__yaw=yaw;c.__pitch=pitch;return run('setCam(__yaw,__pitch);setLight(105);_clipN=0;scene(st,PALS.mint);JSON.stringify(scene.layers)');},
  until(phase,limit=1500){let i=0;while(s.phase!==phase&&this.pending&&i++<limit)this.frame();if(s.phase!==phase)throw Error('Expected '+phase+', got '+s.phase);},
  close(){dom.window.close();}
 };return f;
}
module.exports={fixture,source,baselineRef};
