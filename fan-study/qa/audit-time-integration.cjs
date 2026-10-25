'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const make=require('./fan-time-harness.cjs'),revision=process.argv.find(x=>x.startsWith('--revision='))?.split('=')[1],out=process.argv.find(x=>x.startsWith('--out='))?.split('=')[1]||'time-integration-results.json';
const frequencies=[20,30,60,120],results=[],measurements=[];
const near=(a,b,label,tolerance=1e-9)=>assert(Math.abs(a-b)<=tolerance,`${label}: ${a} != ${b}; difference ${Math.abs(a-b)}`);
const motionNear=(a,b,label)=>{for(const key of Object.keys(a))near(a[key],b[key],label+'/'+key)};
function test(name,fn){try{fn();results.push({name,passed:true});console.log('PASS',name)}catch(error){results.push({name,passed:false,error:error.stack});console.error('FAIL',name,error.message)}}
function fixture(fn){const h=make({revision});try{return fn(h)}finally{h.close()}}
function startup(h,speed=3){h.click('[data-speed="'+speed+'"]');h.click('#oscillate');h.click('#power')}
test('Actual product startup at exactly 1 s agrees at 20/30/60/120 Hz',()=>{
 const values=frequencies.map(hz=>fixture(h=>{startup(h);h.drive(1000,hz);return{hz,...h.motion()}}));measurements.push({scenario:'startup 1 s',values});
 for(const x of values.slice(1)){const a={...x},b={...values[0]};delete a.hz;delete b.hz;motionNear(a,b,'startup '+x.hz)}
});
test('Calibrated response matches original 60 Hz velocity/knob easing, but angle is the exact travel integral',()=>fixture(h=>{
 startup(h);h.drive(100,60);near(h.state().velocity,13*(1-.97**6),'legacy velocity at 100 ms');near(h.state().knob,1-.75**6,'legacy knob at 100 ms');
 h.drive(1000,60);const k=-60*Math.log(.97),expectedAngle=(13*(1-(1-.97**60)/k))%(Math.PI*2);near(h.state().velocity,13*(1-.97**60),'legacy velocity at 1 s');near(h.state().angle,expectedAngle,'exact angle integral');
 const crossing=-Math.log(1-4/13)/k,slowTravel=13*(crossing-(1-Math.exp(-k*crossing))/k);near(h.state().phase,.48*(slowTravel/4+1-crossing),'independent oscillator threshold integral');
}));
test('Same off-grid power/speed/oscillator input timeline has identical 8 s states',()=>{
 const values=frequencies.map(hz=>fixture(h=>{const checkpoints=[];h.open();startup(h);h.drive(8000,hz,[[237,()=>h.click('[data-speed="1"]')],[701,()=>h.click('#oscillate')],[933,()=>h.click('[data-speed="2"]')],[1207,()=>h.click('#oscillate')],[1653,()=>h.click('[data-speed="3"]')],[2141,()=>h.click('[data-rate="0.25"]')],[2903,()=>h.click('[data-speed="1"]')],[3371,()=>h.click('.fan-guide-exit')],[3617,()=>h.click('#power')],...[2000,3500,5000].map(time=>[time,()=>checkpoints.push({time,...h.motion()})])]);assert.equal(h.frames.size,0,'coasts to an idle scheduler');return{hz,...h.motion(),checkpoints}}));measurements.push({scenario:'off-grid switches + quarter speed + exit + complete coast',values});
 for(const x of values.slice(1)){const a={...x},b={...values[0]};delete a.hz;delete b.hz;delete a.checkpoints;delete b.checkpoints;motionNear(a,b,'switches '+x.hz);x.checkpoints.forEach((sample,i)=>motionNear(sample,values[0].checkpoints[i],'switches '+x.hz+' at '+sample.time))}
});
test('Oscillator integration is invariant while accelerating and decelerating across v=4',()=>{
 for(const setup of ['state.on=true;state.speed=3;state.velocity=3.95','state.on=false;state.velocity=4.05']){
  const values=frequencies.map(hz=>fixture(h=>{h.run(setup+';state.oscillate=true;wakeAnimation()');h.drive(100,hz);return h.motion()}));
  measurements.push({scenario:setup,values});values.slice(1).forEach((x,i)=>motionNear(x,values[0],'threshold '+frequencies[i+1]));
 }
});
test('Crossing the v=.01 stop boundary integrates the final partial frame before idle',()=>{
 const values=frequencies.map(hz=>fixture(h=>{h.run('state.velocity=.0105;state.oscillate=true;state.knob=1;wakeAnimation()');h.drive(100,hz);assert.equal(h.frames.size,0);assert.equal(h.state().velocity,0);return h.motion()}));measurements.push({scenario:'final coast partial frame',values});
 assert(values.every(x=>x.angle>0),'the last partial-frame travel must not disappear');values.slice(1).forEach(x=>motionNear(x,values[0],'stop threshold'));const distance=(.0105-.01)/(-60*Math.log(.97));near(values[0].angle,distance,'independent exact stop area');near(values[0].phase,distance*.48/4,'independent exact swing stop area');
});
test('Quarter-speed observation takes four times wall time for identical mechanism travel',()=>{
 const values=[1,.25].map(rate=>fixture(h=>{h.open();startup(h);if(rate===.25)h.click('[data-rate="0.25"]');h.drive(1000/rate,60);return h.motion()}));motionNear(values[0],values[1],'quarter-rate elapsed simulation');
});
test('Same duration split into arbitrary allowed frame partitions has one result',()=>{
 const partitions=[[50,100,150,200],[5,19,36,70,91,121,152,177,200],[25,50,75,100,125,150,175,200]];
 const values=partitions.map(times=>fixture(h=>{startup(h);for(const time of times)h.tick(time);return h.motion()}));values.slice(1).forEach(x=>motionNear(x,values[0],'partition'));
});
test('A stalled frame still caps at 50 ms rather than catching up discarded wall time',()=>{
 const values=[50,5000].map(time=>fixture(h=>{startup(h);h.tick(time);return h.motion()}));motionNear(values[0],values[1],'dt cap');
});
test('Non-finite or backward time cannot corrupt state or rewind the integration clock',()=>{
 const values=[false,true].map(hostile=>fixture(h=>{startup(h);h.tick(50);if(hostile){const before=h.state(),last=h.run('last');h.run('advanceFan(NaN);advanceFan(Infinity);advanceFan(last-100)');assert.deepEqual(h.state(),before);assert.equal(h.run('last'),last)}h.tick(100);assert.equal(h.frames.size,1);return h.motion()}));motionNear(values[0],values[1],'rejected timestamps');
});
test('Hidden/pagehide pause, resume, guide exit and camera reset preserve model and one scheduler',()=>fixture(h=>{
 const {inner}=h.open();startup(h);h.drive(500,60);h.click('[data-rate="0.25"]');h.hidden(true);assert.equal(h.run('observationRate'),1);assert.equal(h.frames.size,0);const hidden=h.state();h.drive(5500,60);assert.deepEqual(h.state(),hidden);h.hidden(false);assert.equal(h.frames.size,1);
 const before=h.motion();h.tick(5510);assert(h.state().angle!==before.angle);assert(h.state().velocity-before.velocity<.1,'resume does not catch up hidden time');
 h.event(h.w,'pagehide');const paused=h.state();assert.equal(h.frames.size,0);h.at(10510);assert.deepEqual(h.state(),paused);h.event(h.w,'pageshow');assert.equal(h.frames.size,1);
 h.click('[data-rate="0.25"]');const snapshot=h.state();h.event(inner,'keydown',{key:'Escape'});assert.equal(h.run('observationRate'),1);assert.deepEqual(h.state(),snapshot);h.run('engine.yaw=1.2;engine.pitch=.6');h.click('#reset');assert.equal(h.run('engine.yaw'),-.4);assert.equal(h.run('engine.pitch'),.19);assert.deepEqual(h.state(),snapshot);assert.equal(h.frames.size,1);
 h.click('#power');h.drive(18000,60);assert.equal(h.frames.size,0);assert.equal(h.state().velocity,0);
}));
test('Off-state inputs settle without idle RAF; controls and frozen oscillator remain independent',()=>fixture(h=>{
 h.click('[data-speed="3"]');h.drive(500,60);assert.equal(h.state().velocity,0);assert.equal(h.frames.size,0);h.click('#oscillate');h.drive(1500,60);assert.equal(h.state().knob,1);assert.equal(h.state().headYaw,0);assert.equal(h.frames.size,0);
 h.click('#power');h.drive(2500,60);h.click('#oscillate');const yaw=h.state().headYaw;h.drive(3500,60);assert.equal(h.state().headYaw,yaw);assert(h.state().velocity>0);for(let i=0;i<30;i++)h.click('#power');assert.equal(h.frames.size,1);h.click('#power');h.drive(9000,60);assert.equal(h.frames.size,0);
}));
const report={revision:revision||'working tree',passed:results.filter(x=>x.passed).length,total:results.length,frequencies,tolerance:1e-9,coverage:'Complete production scripts in deterministic JSDOM with real input/RAF functions. Exact simulated timestamps, including off-frame inputs. Not native layout/paint/audio listening; below 20 Hz the existing 50 ms cap deliberately drops wall time.',results,measurements};
fs.writeFileSync(path.join(__dirname,out),JSON.stringify(report,null,2));if(report.passed!==report.total)process.exitCode=1;
