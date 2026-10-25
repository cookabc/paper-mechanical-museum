'use strict';
/* Full production fan + audio scripts; only Web Audio nodes and trusted-toggle
 * dispatch are mocked. This verifies event counts/lifecycle, not audible quality. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),make=require('./fan-time-harness.cjs');
function installAudio(w){
 const contexts=[],clickHandlers=new WeakMap(),original=w.EventTarget.prototype.addEventListener;
 w.EventTarget.prototype.addEventListener=function(name,fn,...rest){if(name==='click')clickHandlers.set(this,fn);return original.call(this,name,fn,...rest)};
 class Param{constructor(v=0){this.value=v}cancelScheduledValues(){}setValueAtTime(v){this.value=v}linearRampToValueAtTime(v){this.value=v}exponentialRampToValueAtTime(v){this.value=v}}
 class Node{constructor(ctx,kind){this.ctx=ctx;this.kind=kind;for(const key of ['gain','frequency','threshold','knee','ratio','attack','release'])this[key]=new Param();ctx.nodes.push(this)}connect(){}disconnect(){this.disconnected=true}start(t){this.started=true;this.startAt=t}stop(t){this.stopAt=t;if(t<=this.ctx.currentTime)this.end()}end(){if(!this.ended){this.ended=true;this.onended?.()}}}
 class Audio{constructor(){this.currentTime=0;this.state='suspended';this.sampleRate=1000;this.nodes=[];this.destination={};contexts.push(this)}createGain(){return new Node(this,'gain')}createDynamicsCompressor(){return new Node(this,'compressor')}createOscillator(){return new Node(this,'oscillator')}createBufferSource(){return new Node(this,'noise')}createBiquadFilter(){return new Node(this,'filter')}createBuffer(ch,n){return{getChannelData:()=>new Float32Array(n)}}async resume(){this.state='running'}async close(){this.state='closed'}tick(dt){this.currentTime+=dt;for(const n of this.nodes)if(n.stopAt!=null&&n.stopAt<=this.currentTime)n.end()}}
 w.AudioContext=Audio;
 return{contexts,enable:()=>clickHandlers.get(w.document.querySelector('.mechanical-audio button'))({isTrusted:true})};
}
const results=[];async function test(name,fn){const h=make({audio:installAudio});try{await fn(h);results.push({name,passed:true});console.log('PASS',name)}catch(error){results.push({name,passed:false,error:error.stack});console.error('FAIL',name,error.message)}finally{h.close()}}
const pulses=h=>h.audio.contexts.at(-1)?.nodes.filter(n=>n.kind==='oscillator'&&n.started&&n.stopAt!=null).length||0;
const alive=h=>h.audio.contexts.at(-1).nodes.filter(n=>n.started&&!n.ended);
(async()=>{
 await test('No autoplay; real fan transitions and repeated snapshots keep one continuous sound group',async h=>{
  h.click('#power');h.drive(500,60);assert.equal(h.audio.contexts.length,0);await h.audio.enable();assert.equal(alive(h).length,2);const nodes=h.audio.contexts[0].nodes.length;h.drive(1000,120);assert.equal(h.audio.contexts[0].nodes.length,nodes,'RAF retunes existing loop rather than duplicating sound');
  for(const selector of ['[data-speed="3"]','#oscillate','#power']){h.at(h.now+200);const before=pulses(h);h.click(selector);assert.equal(pulses(h)-before,1,selector+' exactly one click');for(let i=0;i<20;i++)h.run('sync()');assert.equal(pulses(h)-before,1,'repeated sync cannot replay transition')}
  h.drive(8000,60);assert.equal(h.frames.size,0);assert.equal(alive(h).length,0);assert.equal(h.d.querySelector('.mechanical-audio').dataset.audioLoop,'none');
 });
 await test('Keyboard Enter/Space repeats plus synthesized clicks produce one action and one sound',async h=>{
  await h.audio.enable();const target=h.d.querySelector('#scene-power');
  for(const key of ['Enter',' ']){h.at(h.now+200);const on=h.state().on,before=pulses(h);h.event(target,'keydown',{key});h.event(target,'click',{detail:0});h.event(target,'keydown',{key,repeat:true});h.event(target,'click',{detail:0});h.event(target,'keyup',{key});h.event(target,'click',{detail:0});assert.equal(h.state().on,!on);assert.equal(pulses(h)-before,1);h.tick(h.now+20)}
  h.at(h.now+200);const before=pulses(h);h.event(target,'click',{detail:0});assert.equal(pulses(h)-before,1,'new independent click remains available');assert.equal(h.frames.size,1);
 });
 await test('Mouse/touch/pen matching compatibility clicks never duplicate control or sound',async h=>{
  await h.audio.enable();const target=h.d.querySelector('#scene-power'),svg=h.d.querySelector('#figure');
  // JSDOM lacks native PointerEvent dispatch. Invoke the unchanged production
  // pointer handlers with normalized inputs, then its actual click handler.
  for(const pointerType of ['mouse','touch','pen'])for(const finish of ['tap','drag','cancel']){h.at(h.now+200);const on=h.state().on,before=pulses(h),data={target,pointerId:17,pointerType,isPrimary:true,button:0,clientX:100,clientY:100,preventDefault(){}};svg.onpointerdown(data);if(finish==='drag')svg.onpointermove({...data,clientX:160});svg[finish==='cancel'?'onpointercancel':'onpointerup'](data);target.onclick({...data,detail:0});assert.equal(h.state().on,finish==='tap'?!on:on,pointerType+'/'+finish);assert.equal(pulses(h)-before,finish==='tap'?1:0,pointerType+'/'+finish+' sound count');h.tick(h.now+20)}
 });
 await test('Repeated selected speed emits one tick, rate/exit/reset no event, hidden and pagehide fully silence',async h=>{
  h.open();h.click('#power');h.drive(500,60);await h.audio.enable();h.at(700);let before=pulses(h);h.click('[data-speed="1"]');assert.equal(pulses(h)-before,1);for(let i=0;i<10;i++)h.click('[data-speed="1"]');assert.equal(pulses(h)-before,1,'same-task tick is bounded');
  before=pulses(h);h.click('[data-rate="0.25"]');h.click('.fan-guide-exit');h.click('#reset');assert.equal(pulses(h),before);h.hidden(true);const model=h.state();h.drive(2000,60);assert.deepEqual(h.state(),model);assert.equal(alive(h).length,0);h.hidden(false);h.drive(2500,60);assert.equal(alive(h).length,0,'visibility return does not resume sound without opt-in');await h.audio.enable();assert.equal(alive(h).length,2);h.event(h.w,'pagehide');assert.equal(h.frames.size,0);assert.equal(alive(h).length,0);h.event(h.w,'pageshow');h.drive(3000,60);assert.equal(alive(h).length,0);
 });
 const report={passed:results.filter(x=>x.passed).length,total:results.length,coverage:'Production fan.js, observation.js and mechanical-audio.js in deterministic JSDOM. Mocked Web Audio node/parameter/lifecycle and explicit trusted-toggle fixture. No listening, physical input or native browser claim.',results};fs.writeFileSync(path.join(__dirname,'time-input-audio-results.json'),JSON.stringify(report,null,2));if(report.passed!==report.total)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1});
