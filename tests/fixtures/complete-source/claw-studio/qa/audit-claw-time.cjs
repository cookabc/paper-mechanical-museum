'use strict';
/* Execute the production app.js animation callbacks, not a reconstructed model.
 * Direct-controller tests intentionally accept one large dt. The integrated
 * production RAF tests separately verify that the existing .06 s cap remains.
 * CLAW_QA_JSDOM=/path/to/jsdom node qa/audit-claw-time.cjs [--baseline]
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {fixture,source}=require('./lesson-harness.cjs');
const baselineRef='00f2e2267245e5d7cfbe3e142852c111c405ec96';
const baseline=process.argv.includes('--baseline'),results=[],measurements=[],numericEvidence={comparisons:0,maxAbsoluteError:0};
const fallTime=Math.sqrt((87-28-8)/80),grabTime=1.3+.6+1.4+1.7+.35+fallTime+1.1;
function test(name,fn){try{fn();results.push({name,ok:true});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.message);}}
function near(actual,expected,label,tol=1e-9){numericEvidence.comparisons++;numericEvidence.maxAbsoluteError=Math.max(numericEvidence.maxAbsoluteError,Math.abs(actual-expected));assert(Math.abs(actual-expected)<=tol,`${label}: ${actual} vs ${expected}`);}
function fresh(options={}){const f=fixture({baseline:baseline?baselineRef:false,...options});f.pulses=[];f.resets=0;f.c.MechanicalAudio={pulse:name=>f.pulses.push(name),reset:()=>f.resets++,update(){},attach(){}};return f;}
function start(f,hit=true){f.s.x=hit?42:31;f.s.y=hit?57:37;f.action('drop');}
function advance(f,seconds,hz=60){for(let t=0;t<seconds-1e-12;){const dt=Math.min(1/hz,seconds-t);f.frame(dt);t+=dt;}}
const fields=['phase','timer','x','y','z','open','got','stock','won','tries','result','fallZ','outX','grabDX','grabDY','target','aiming','moving'];
function state(f){const s=f.snapshot();return Object.fromEntries(fields.filter(k=>k in s).map(k=>[k,s[k]]));}
function equalState(a,b,label){for(const key of new Set([...Object.keys(a),...Object.keys(b)])){if(typeof a[key]==='number'&&typeof b[key]==='number')near(a[key],b[key],label+' '+key);else assert.deepEqual(a[key],b[key],label+' '+key);}}
function sameTimeline(hz,hit){const f=fresh();start(f,hit);const checkpoints=hit?[.125,1.3,1.55,1.9,2.1,3.3,4,5,5.2,5.35,5.35+fallTime,6.5,grabTime,8,8.35,8.8,9.05,10]:[.125,1.3,1.9,2.1,3.3,3.5,3.65,4];const out=[];let elapsed=0;for(const time of checkpoints){advance(f,time-elapsed,hz);elapsed=time;out.push({time,state:state(f)});if(time===8){f.action('collect');for(let i=0;i<8;i++)f.action('collect');}if(time===1.55){for(let i=0;i<8;i++)f.action('drop');}}const pulses=f.pulses.slice();f.close();return{out,pulses};}

test('Same input timeline and simulation time agree at 20/30/60/120 Hz, success and miss',()=>{
 for(const hit of [true,false]){const reference=sameTimeline(120,hit);for(const hz of [20,30,60]){const actual=sameTimeline(hz,hit);for(let i=0;i<actual.out.length;i++)equalState(actual.out[i].state,reference.out[i].state,`${hit?'success':'miss'} ${hz} Hz t=${actual.out[i].time}`);assert.deepEqual(actual.pulses,reference.pulses);}}
});
test('Every exact phase boundary is settled in the same callback, including landing',()=>{
 const f=fresh();start(f);for(const[dt,phase]of[[1.3,'close'],[.6,'up'],[1.4,'travel'],[1.7,'release'],[.35,'fall'],[fallTime,'eject'],[1.1,'prize']]){f.frame(dt);assert.equal(f.s.phase,phase);near(f.s.timer,0,phase+' timer');}near(f.s.z,87,'lift');near(f.s.fallZ,8,'landing');near(f.s.x,52,'drop x');near(f.s.y,37,'drop y');near(f.s.outX,87,'tray');assert.equal(f.pending,0);f.action('collect');f.frame(.35);assert.equal(f.s.phase,'return');assert.equal(f.s.won.length,1);f.frame(.7);assert.equal(f.s.phase,'idle');near(f.s.x,45,'return x');near(f.s.y,19,'return y');assert.equal(f.pending,0);f.close();
});
test('One large dt consumes all grab, miss and collection phases without extra ticks',()=>{
 for(const hit of [true,false]){const f=fresh();start(f,hit);f.frame(8);assert.equal(f.s.phase,hit?'prize':'idle');assert.equal(f.pending,0);assert.equal(f.s.tries,1);if(hit){f.action('collect');f.frame(2);assert.equal(f.s.phase,'idle');assert.equal(f.s.won.length,1);assert.equal(f.s.stock.length,3);assert.equal(f.pending,0);assert.deepEqual(f.pulses,['click','pop']);}else{assert.equal(f.s.result,'miss');assert.deepEqual(f.pulses,['click','cue']);}f.close();}
});
test('Partial remainder crosses multiple phases and produces the same exact state as subdivision',()=>{
 for(const[hit,total]of[[true,1.45],[true,3.5],[true,5.5],[true,6.4],[true,7.1],[false,3.5]]){const a=fresh(),b=fresh();start(a,hit);start(b,hit);a.frame(total);advance(b,total,120);equalState(state(a),state(b),String(total));assert.deepEqual(a.pulses,b.pulses);a.close();b.close();}
 const a=fresh(),b=fresh();for(const f of [a,b]){start(f);f.finish();f.action('collect');}a.frame(.6);advance(b,.6,120);equalState(state(a),state(b),'collect remainder');a.close();b.close();
});
test('Deterministic irregular partitions agree and prize never spends dt on a future collection',()=>{
 let seed=20261024;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);
 for(let trial=0;trial<32;trial++){const a=fresh(),b=fresh(),hit=trial%3!==0,total=random()*8;start(a,hit);start(b,hit);a.frame(total);let left=total;while(left>1e-12){const dt=Math.min(left,.001+random()*.7);b.frame(dt);left-=dt;}equalState(state(a),state(b),'irregular '+trial);assert.deepEqual(a.pulses,b.pulses);a.close();b.close();}
 const f=fresh();start(f);f.frame(100);assert.equal(f.s.phase,'prize');assert.equal(f.s.won.length,0);assert.equal(f.s.stock.length,4);f.action('collect');f.frame(0);assert.equal(f.s.phase,'collect');assert.equal(f.s.timer,0);assert.equal(f.s.won.length,0);for(const dt of [-1,NaN,Infinity]){const before=f.snapshot();f.frame(dt);assert.deepEqual(f.snapshot(),before);}f.frame(.35);assert.equal(f.s.won.length,1);f.close();
});
test('Completed or reset callbacks cannot advance a newer cycle, award twice, or replay sound',()=>{
 for(const hit of [true,false]){const f=fresh();start(f,hit);const oldDrop=[...f.steps][0];f.finish();const finished=f.snapshot(),pulses=f.pulses.slice();assert.equal(oldDrop(.04),false);assert.deepEqual(f.snapshot(),finished);assert.deepEqual(f.pulses,pulses);if(hit){f.action('collect');const oldCollect=[...f.steps][0];f.finish();const done=f.snapshot();assert.equal(oldCollect(.5),false);assert.deepEqual(f.snapshot(),done);f.action('restock');start(f);const next=f.snapshot();assert.equal(oldCollect(8),false);assert.deepEqual(f.snapshot(),next);}else{f.action('restock');start(f);const next=f.snapshot();assert.equal(oldDrop(8),false);assert.deepEqual(f.snapshot(),next);}f.close();}
 const f=fresh();f.action('aim',0);const oldAim=[...f.steps][0];f.frame(.2);f.action('restock');const reset=f.snapshot();assert.equal(oldAim(1),false);assert.deepEqual(f.snapshot(),reset);f.close();
});
test('Repeated drop/collect/reset controls retain four wins, original threshold and once-only events',()=>{
 const f=fresh();for(let i=0;i<4;i++){f.action('aim',i);f.finish();for(let n=0;n<10;n++)f.action('drop');assert.equal(f.s.tries,i+1);f.action('restock');f.finish();assert.equal(f.s.phase,'prize');for(let n=0;n<10;n++)f.action('collect');f.action('restock');f.finish();assert.equal(f.s.won.length,i+1);assert.equal(f.s.stock.length,3-i);}assert.equal(f.pulses.filter(x=>x==='click').length,4);assert.equal(f.pulses.filter(x=>x==='pop').length,4);f.action('drop');assert.equal(f.s.tries,0);assert.equal(f.s.stock.length,4);for(const distance of [4.499,4.5]){f.s.x=42+distance;f.s.y=57;f.action('drop');f.finish();assert.equal(f.s.got,distance<4.5?0:null);if(f.s.phase==='prize'){f.action('collect');f.finish();}f.action('restock');}f.close();
});
test('Guide entry/exit/reentry never owns a pause; hidden lifecycle freezes and keeps the .06 s core cap',()=>{
 const f=fresh({full:true});f.ui.render=()=>f.ui.observation?.update();const guide=f.d.querySelector('.claw-guide');f.open();assert.equal(guide.querySelector('.mechanism-lesson-hold').hidden,true);assert.equal(f.ui.observation.rate,1);f.choice('aim-0');f.finish();f.next();f.frame(.04);for(let i=0;i<8;i++){const before=f.snapshot();guide.querySelector('.mechanism-lesson-exit').click();f.open();assert.deepEqual(f.snapshot(),before);}const before=f.s.timer;f.frame(1);near(f.s.timer-before,.06,'core cap',1e-10);f.d.hidden=true;f.d.dispatchEvent(new f.dom.window.Event('visibilitychange'));const parked=f.snapshot();assert.equal(f.pending,0);f.tick(20);assert.deepEqual(f.snapshot(),parked);f.d.hidden=false;f.d.dispatchEvent(new f.dom.window.Event('visibilitychange'));const resumed=f.s.timer;f.frame(.04);near(f.s.timer-resumed,.04,'resume without wallclock catchup');f.toggle(f.ui.observation.panel,false);f.frame(.04);assert.equal(f.read().enabled,false);f.open();f.finish();assert.equal(f.s.phase,'prize');f.next();f.finish();assert.equal(f.s.won.length,1);assert.equal(f.s.tries,1);assert.deepEqual(f.pulses.filter(x=>x==='pop'),['pop']);assert.equal(f.pending,0);f.close();
});
test('Hidden pause and guide reentry preserve every active grab and collection phase',()=>{
 for(const phase of ['down','close','up','travel','release','fall','eject','collect','return']){
  const f=fresh({full:true});f.ui.render=()=>f.ui.observation?.update();f.open();f.choice('aim-0');f.finish();f.next();f.until(phase==='collect'||phase==='return'?'prize':phase);if(phase==='collect'||phase==='return'){f.next();if(phase==='return')f.until('return');}
  const guide=f.d.querySelector('.claw-guide'),before=f.snapshot();guide.querySelector('.mechanism-lesson-hold').click();assert.deepEqual(f.snapshot(),before,'no hidden pause action '+phase);guide.querySelector('.mechanism-lesson-exit').click();f.open();assert.deepEqual(f.snapshot(),before,'reentry '+phase);f.d.hidden=true;f.d.dispatchEvent(new f.dom.window.Event('visibilitychange'));const parked=f.snapshot();f.tick(5);assert.deepEqual(f.snapshot(),parked,'hidden '+phase);f.d.hidden=false;f.d.dispatchEvent(new f.dom.window.Event('visibilitychange'));f.finish();assert.equal(f.s.phase,phase==='collect'||phase==='return'?'idle':'prize');assert.equal(f.s.won.length,phase==='collect'||phase==='return'?1:0);assert.equal(f.s.tries,1);assert.equal(f.pending,0);f.close();
 }
});
test('Geometry, rendering, input, shared core and guide are untouched by the controller change',()=>{
 const a=source('app.js'),b=source('app.js',baselineRef),prefix=s=>s.slice(0,s.indexOf('function restock')),suffix=s=>s.slice(s.indexOf('const ui=mountFigure')).replaceAll('https://paper-mechanical-museum.chuangcius.chatgpt.site','../../object-collection/dist/');assert.equal(prefix(a),prefix(b));assert.equal(suffix(a),suffix(b));assert.equal(source('index.html').replace(/app\.js\?v=[a-f0-9]+/,'app.js'),source('index.html',baselineRef).replace(/app\.js\?v=[a-f0-9]+/,'app.js'));assert.equal(source('observation.js'),source('observation.js',baselineRef));assert.equal(source('shared-shell.css'),source('shared-shell.css',baselineRef));
});
// Completion times are quantized to the observation frame; accuracy is asserted
// above at equal simulation timestamps, not inferred only from first observation.
for(const hz of [20,30,60,120]){const f=fresh();start(f);let elapsed=0;while(f.s.phase!=='prize'&&elapsed<10){f.frame(1/hz);elapsed+=1/hz;}f.action('collect');let collect=0;while(f.s.phase!=='idle'&&collect<3){f.frame(1/hz);collect+=1/hz;}measurements.push({hz,grabSeconds:elapsed,collectSeconds:collect});f.close();}
const report={baselineRef,mode:baseline?'frozen-publicv16':'candidate',scope:'Actual app.js callbacks plus production core/guide lifecycle. Not native browser/layout/performance QA.',expected:{grabSeconds:grabTime,missSeconds:3.65,collectSeconds:1.05,fallSeconds:fallTime},tolerance:1e-9,numericEvidence,measurements,results};fs.writeFileSync(path.join(__dirname,baseline?'claw-time-baseline.json':'claw-time-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length,measurements}));if(results.some(r=>!r.ok))process.exitCode=1;
