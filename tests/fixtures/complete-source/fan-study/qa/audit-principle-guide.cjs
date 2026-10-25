const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('./portable-baseline.cjs');
const make=require('../../washer-study/qa/principle-dom-harness.cjs'),{fan}=require('../../washer-study/qa/observation-harness.cjs');
const root=path.resolve(__dirname,'..'),baseline='307604e',results=[];
function test(name,fn){try{fn();results.push({name,passed:true});console.log('PASS',name)}catch(error){results.push({name,passed:false,error:error.stack});console.error('FAIL',name,error.stack)}}
const same=(a,b,label)=>assert.deepEqual(a.readState(),b.readState(),label);
test('Default collapsed and idle; promoting/repeating/exiting moves exact original controls without duplication',()=>{
 const h=make('fan-study');try{h.light();const d=h.d,outer=d.querySelector('.mechanism-observer'),inner=d.querySelector('.mechanism-lesson'),primary=d.querySelector('#btns'),buttons=[...primary.querySelectorAll('button')],initial=h.readState();assert(!outer.open&&!inner.open);assert.equal(h.frames.size,0);h.toggle(outer,true);assert.equal(primary.parentElement.className,'intro play-dock');
 for(let i=0;i<5;i++){h.toggle(inner,true);assert.equal(inner.parentElement.className,'intro play-dock lesson-guiding fan-guiding');assert.equal(primary.parentElement.className,'lesson-free-controls fan-free-controls');assert(!primary.parentElement.open);assert(d.querySelector('.observation-live').hidden);assert.equal(d.querySelectorAll('#btns').length,1);assert.equal(d.querySelectorAll('.mechanism-lesson').length,1);h.click('[data-rate="0.25"]');h.click('.fan-guide-exit');assert.equal(h.observer().rate,1);assert.equal(primary.parentElement.className,'intro play-dock');assert.deepEqual([...primary.querySelectorAll('button')],buttons);assert.deepEqual(h.readState(),initial);}
 h.toggle(inner,true);h.toggle(outer,false);assert(!inner.open);assert.equal(primary.parentElement.className,'intro play-dock');assert.equal(d.querySelectorAll('[data-observe-active]').length,0);assert.equal(h.frames.size,0);
 }finally{h.close()}
});
test('Guide speed, acceleration, deceleration, oscillator and coasting match current direct controls exactly',()=>{
 const h=make('fan-study'),b=make('fan-study');try{h.light();b.light();const{inner}=h.open();same(h,b,'initial');
 const step=(selector,action,ms)=>{h.click(selector);b.run(action);same(h,b,'immediate '+action);h.advance(ms);b.advance(ms);same(h,b,action)};
 step('[data-choice="speed-3"]','activate("speed",3)',250);assert.equal(h.readState().velocity,0);assert.equal(h.frames.size,0);
 step('.fan-guide-go','activate("power")',1000);assert(h.readState().velocity>0&&h.readState().velocity<13);assert.equal(h.run('readFanLesson().title'),'加速');assert.equal(h.frames.size,1);
 step('[data-choice="speed-1"]','activate("speed",1)',250);assert(h.readState().velocity>4);assert.equal(h.run('readFanLesson().title'),'减速');
 step('[data-choice="oscillate"]','activate("oscillate")',1500);assert.notEqual(h.readState().headYaw,0);assert.equal(h.run('readFanLesson().index'),1);const yaw=h.readState().headYaw;
 step('[data-choice="oscillate"]','activate("oscillate")',1000);assert.equal(h.readState().headYaw,yaw);assert(h.readState().velocity>0);
 const snapshot=h.readState();h.click('.fan-guide-exit');assert.deepEqual(h.readState(),snapshot);h.advance(300);b.advance(300);same(h,b,'exit keeps motion');h.toggle(inner,true);
 step('.fan-guide-go','activate("power")',100);assert(h.readState().velocity>0);assert.equal(h.run('readFanLesson().title'),'惯性停转');assert.equal(h.run('readFanLesson().index'),2);h.advance(7000);b.advance(7000);same(h,b,'coast until stopped');assert.equal(h.readState().velocity,0);assert.equal(h.frames.size,0);assert.equal(h.run('readFanLesson().title'),'停稳');
 for(let i=0;i<7;i++){h.click('.fan-guide-go');b.run('activate("power")');same(h,b,'repeat power '+i);assert.equal(h.frames.size,1)}h.advance(700);b.advance(700);same(h,b,'one scheduler after repeat');
 }finally{h.close();b.close()}
});
test('Hidden/pagehide, Escape, keyboard isolation, quarter-rate reset and camera reset leave no lesson-owned state',()=>{
 const h=make('fan-study');try{h.light();const{inner}=h.open();const state=h.readState(),yaw=h.run('engine.yaw');for(const key of [' ','Enter','ArrowLeft','ArrowRight'])h.event(inner.querySelector('summary'),'keydown',{key});assert.deepEqual(h.readState(),state);assert.equal(h.run('engine.yaw'),yaw);
 h.click('.fan-guide-go');h.advance(1000);h.click('[data-rate="0.25"]');h.hidden(true);assert.equal(h.observer().rate,1);assert.equal(h.frames.size,0);const hidden=h.readState();h.advance(3000);assert.deepEqual(h.readState(),hidden);h.hidden(false);assert.equal(h.frames.size,1);
 h.event(h.w,'pagehide');assert.equal(h.frames.size,0);h.event(h.w,'pageshow');assert.equal(h.frames.size,1);
 h.click('[data-rate="0.25"]');const snapshot=h.readState();h.event(inner,'keydown',{key:'Escape'});assert(!inner.open);assert.equal(h.observer().rate,1);assert.deepEqual(h.readState(),snapshot);h.toggle(inner,true);h.run('engine.yaw=1.2;engine.pitch=.6');h.click('#reset');assert.equal(h.run('engine.yaw'),-.4);assert.equal(h.run('engine.pitch'),.19);assert.deepEqual(h.readState(),snapshot);h.click('.fan-guide-go');h.advance(7000);assert.equal(h.frames.size,0);
 }finally{h.close()}
});
test('Off-state oscillator knob settles without idle frames; highlights use only existing participants',()=>{
 const h=make('fan-study');try{h.light();h.open();h.click('[data-choice="oscillate"]');h.advance(1000);assert.equal(h.readState().knob,1);assert.equal(h.readState().headYaw,0);assert.equal(h.frames.size,0);h.click('.fan-guide-go');h.advance(1000);h.render();let parts=[...h.d.querySelectorAll('[data-observe-active="true"]')].map(x=>x.dataset.observePart);for(const part of ['fan-motor','fan-blades','fan-swing'])assert(parts.includes(part));h.click('.fan-guide-go');h.advance(100);h.render();parts=[...h.d.querySelectorAll('[data-observe-active="true"]')].map(x=>x.dataset.observePart);assert(parts.includes('fan-blades'));assert(parts.includes('fan-swing'));assert(!parts.includes('fan-motor'));h.advance(7000);h.render();assert.equal(h.d.querySelectorAll('[data-observe-active="true"]').length,0);assert.equal(h.frames.size,0);h.click('[data-choice="oscillate"]');h.advance(1000);assert.equal(h.readState().knob,0);assert.equal(h.frames.size,0);
 }finally{h.close()}
});
test('Baseline drawing/depth exact in 96 camera, head-angle and blade-angle fixtures',()=>{
 const current=fs.readFileSync(path.join(root,'dist/fan.js'),'utf8'),old=cp.execFileSync('git',['-C',root,'show',baseline+':dist/fan.js'],{encoding:'utf8'});const a=fan(current),b=fan(old);const section=(s,start,end)=>s.slice(s.indexOf(start),s.indexOf(end));assert.equal(section(current,'function render(){','function sync(){'),section(old,'function render(){','function sync(){'));
 for(const yaw of [0,.4,Math.PI/2,Math.PI,Math.PI*1.2,Math.PI*1.5,Math.PI*1.7,Math.PI*1.9])for(const pitch of [.19,.8])for(const head of [-.65,0,.65])for(const angle of [0,1.2]){const fixture=`engine.yaw=${yaw};engine.pitch=${pitch};state.headYaw=${head};state.angle=${angle};render()`;a.run(fixture);b.run(fixture);assert.equal(a.ids.art.innerHTML,b.ids.art.innerHTML,fixture);assert.equal(JSON.stringify(a.run('engine.parts.map(x=>x.depth)')),JSON.stringify(b.run('engine.parts.map(x=>x.depth)')));}
});
const report={baseline,passed:results.filter(x=>x.passed).length,total:results.length,coverage:'Deterministic JSDOM + production source. Exact state/geometry comparisons; no native layout, paint, audio listening, or physical touch claims.',results};fs.writeFileSync(path.join(__dirname,'principle-guide-results.json'),JSON.stringify(report,null,2));if(report.passed!==report.total)process.exitCode=1;
