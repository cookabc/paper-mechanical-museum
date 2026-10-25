const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('./portable-baseline.cjs');
const make=require('./principle-dom-harness.cjs'),{geometry}=require('./audit-structural-sequences.cjs');
const root=path.resolve(__dirname,'..'),baseline='addba29',results=[];
function test(name,fn){try{fn();results.push({name,passed:true});console.log('PASS',name)}catch(error){results.push({name,passed:false,error:error.stack});console.error('FAIL',name,error.stack)}}
const same=(a,b,label)=>assert.deepEqual(a.readState(),b.readState(),label);
test('Default collapsed, no scheduler, single card; promotion folds and restores identical controls',()=>{
 const h=make('washer-study');try{h.light();const d=h.d,outer=d.querySelector('.mechanism-observer'),inner=d.querySelector('.mechanism-lesson'),primary=d.querySelector('#btns'),buttons=[...primary.querySelectorAll('button')],initial=h.readState();
 assert(!outer.open&&!inner.open);assert.equal(h.frames.size,0);assert.equal(d.querySelectorAll('[data-observe-active]').length,0);h.toggle(outer,true);assert.equal(primary.parentElement.className,'play-dock');
 for(let i=0;i<5;i++){h.toggle(inner,true);assert.equal(inner.parentElement.className,'play-dock lesson-guiding washer-guiding');assert.equal(primary.parentElement.className,'lesson-free-controls washer-free-controls');assert(!primary.parentElement.open);assert(d.querySelector('.observation-live').hidden);assert.equal(d.querySelectorAll('.mechanism-lesson').length,1);assert.equal(d.querySelectorAll('#btns').length,1);h.click('[data-rate="0.25"]');assert.equal(h.observer().rate,.25);h.click('.washer-guide-exit');assert.equal(h.observer().rate,1);assert.equal(primary.parentElement.className,'play-dock');assert.deepEqual([...primary.querySelectorAll('button')],buttons);assert.deepEqual(h.readState(),initial);}
 h.toggle(inner,true);h.toggle(outer,false);assert(!inner.open);assert.equal(primary.parentElement.className,'play-dock');assert.equal(d.querySelectorAll('[data-observe-active]').length,0);assert.equal(h.frames.size,0);
 }finally{h.close()}
});
test('Complete guided cycle matches baseline state, including repeated input, interlocks, pause, hidden, exit and unload',()=>{
 const h=make('washer-study'),b=make('washer-study',baseline);try{h.light();b.light();const{inner}=h.open();same(h,b,'initial');
 const step=(action,ms)=>{h.click('.washer-guide-go');b.run(action);h.advance(ms);b.advance(ms);same(h,b,action)};
 h.click('.washer-guide-go');b.run('loadLaundry(ui.st,ui)');for(let i=0;i<6;i++)h.click('.washer-guide-go');h.advance(6000);b.advance(6000);same(h,b,'repeat load cannot duplicate transfer');assert.equal(h.readState().laundry,'drum');
 step('addSoap(ui.st,ui)',3500);assert.equal(h.readState().soapLvl,1);
 h.click('.washer-guide-go');b.run('start(ui.st,ui)');for(let i=0;i<6;i++)h.click('.washer-guide-go');assert.equal(h.readState().latch,'locking');same(h,b,'repeat start during locking is ignored');h.advance(1800);b.advance(1800);same(h,b,'lock and fill');
 h.run('toggleDoor(ui.st,ui);toggleDrawer(ui.st,ui);selectProg(ui.st,ui,2)');b.run('toggleDoor(ui.st,ui);toggleDrawer(ui.st,ui);selectProg(ui.st,ui,2)');assert.equal(h.readState().doorT,0);assert.equal(h.readState().drawerT,0);assert.equal(h.readState().prog,0);same(h,b,'physical locks unchanged');
 h.click('.washer-guide-hold');b.run('start(ui.st,ui)');h.advance(1400);b.advance(1400);same(h,b,'pause uses existing deceleration');assert.equal(h.frames.size,0);assert.equal(h.readState().drive,0);const paused=h.readState();h.advance(1500);b.advance(1500);assert.deepEqual(h.readState(),paused);
 h.click('[data-rate="0.25"]');h.hidden(true);b.hidden(true);assert.equal(h.observer().rate,1);h.advance(5000);b.advance(5000);same(h,b,'hidden pause stable');h.hidden(false);b.hidden(false);h.advance(100);b.advance(100);same(h,b,'visible paused stable');
 const beforeExit=h.readState();h.click('.washer-guide-exit');assert.deepEqual(h.readState(),beforeExit);h.toggle(inner,true);step('start(ui.st,ui)',300);
 const stages=new Set();for(let i=0;i<70;i++){h.advance(500);b.advance(500);stages.add(h.run('readWasherObservation().stage'));same(h,b,'running frame '+i)}for(const stage of['进水','交替洗涤','排水','高速脱水','洗涤完成'])assert(stages.has(stage),stage);assert(!h.readState().run);assert.equal(h.readState().latch,null);assert.equal(h.frames.size,0);
 h.click('.washer-guide-go');b.run('unloadLaundry(ui.st,ui)');for(let i=0;i<6;i++)h.click('.washer-guide-go');h.advance(6000);b.advance(6000);same(h,b,'unload transfer gated');assert.equal(h.readState().unloaded,true);assert.equal(h.readState().laundry,'basket');
 h.click('[data-rate="0.25"]');step('loadLaundry(ui.st,ui)',6000);assert.equal(h.observer().rate,1);assert.equal(h.frames.size,0);
 }finally{h.close();b.close()}
});
test('Program comparisons and guidance honor open door/drawer; spin skips fictitious phases',()=>{
 const h=make('washer-study');try{h.light();h.open();h.click('[data-choice="program-2"]');assert.equal(h.readState().prog,2);h.click('.washer-guide-go');h.advance(6000);assert.equal(h.run('readWasherLesson().action'),'start');assert.equal(h.readState().soapLvl,0);
 h.run('toggleDoor(ui.st,ui)');h.advance(1000);assert.equal(h.run('readWasherLesson().action'),'door');h.click('.washer-guide-go');h.advance(1000);h.run('toggleDrawer(ui.st,ui)');h.advance(600);assert.equal(h.run('readWasherLesson().action'),'drawer');h.click('.washer-guide-go');h.advance(600);
 h.click('.washer-guide-go');h.advance(700);assert.equal(h.run('readWasherLesson().index'),5);assert.equal(h.d.querySelectorAll('.mechanism-lesson-route [data-done="true"]').length,0,'Skipped phases must not be marked completed');assert.equal(h.run('waterAt(prog(ui.st),ui.st.tau)'),0);h.advance(13000);assert.equal(h.readState().done,true);assert.equal(h.frames.size,0);assert.match(h.d.querySelector('.washer-guide-note').textContent,/没有单独漂洗/);
 }finally{h.close()}
});
test('Escape, panel keyboard isolation and view reset preserve actual process; hidden slows never persist',()=>{
 const h=make('washer-study');try{h.light();const{inner}=h.open();const before=h.readState(),yaw=h.run('YAW');for(const key of [' ','Enter','ArrowLeft','ArrowRight'])h.event(inner.querySelector('summary'),'keydown',{key});assert.deepEqual(h.readState(),before);assert.equal(h.run('YAW'),yaw);
 h.click('[data-rate="0.25"]');h.event(inner,'keydown',{key:'Escape'});assert(!inner.open);assert.equal(h.observer().rate,1);assert.deepEqual(h.readState(),before);h.toggle(inner,true);h.click('[data-rate="0.25"]');h.hidden(true);assert.equal(h.observer().rate,1);assert.equal(h.frames.size,0);h.hidden(false);h.advance(100);h.click('#vreset');h.advance(1000);assert.deepEqual(h.readState(),{...before,pressedAct:null});assert.equal(h.frames.size,0);h.click('[data-rate="0.25"]');h.observer().reset();assert.equal(h.observer().rate,1);
 }finally{h.close()}
});
test('Cutaway highlights only existing rendered participating parts, with no invented structures',()=>{
 const h=make('washer-study');try{h.light();h.open();h.run('Object.assign(ui.st,{xr:1,xrT:1,laundry:"drum",run:true,drive:1})');for(const [tau,parts]of [[1,['washer-inlet','washer-sensor']],[8,['washer-motor','washer-drive','washer-drum']],[19,['washer-pump']],[25,['washer-motor','washer-drive','washer-drum']]]){h.run('ui.st.tau='+tau);h.render();const active=[...h.d.querySelectorAll('[data-observe-active="true"]')].map(x=>x.dataset.observePart);for(const part of parts)assert(active.includes(part),part);assert(active.every(part=>parts.includes(part)));}h.toggle(h.observer().panel,false);assert.equal(h.d.querySelectorAll('[data-observe-active]').length,0);
 }finally{h.close()}
});
test('Baseline drawing/depth and continuous-motion source remain exact across 32 camera/state combinations',()=>{
 const current=fs.readFileSync(path.join(root,'dist/index.html'),'utf8'),old=cp.execFileSync('git',['-C',root,'show',baseline+':dist/index.html'],{encoding:'utf8'});const a=geometry('washer-study',current),b=geometry('washer-study',old);
 const section=(s,start,end)=>s.slice(s.indexOf(start),s.indexOf(end));assert.equal(section(current,'function runLoop(){','let st0;'),section(old,'function runLoop(){','let st0;'));
 const states=[{run:false,xr:0,door:0,doorT:0},{run:false,xr:0,door:.5,doorT:1},{run:true,xr:1,door:0,doorT:0,tau:8,drive:1,laundry:'drum'},{run:true,xr:1,tau:25,drive:1,laundry:'drum'}];for(const yaw of[0,38,90,218])for(const pitch of[23,78])for(const state of states)assert.equal(a.render(yaw,pitch,state),b.render(yaw,pitch,state),JSON.stringify({yaw,pitch,state}));
});
const report={baseline,passed:results.filter(x=>x.passed).length,total:results.length,coverage:'Deterministic JSDOM + production source. Exact state/geometry comparisons; no native layout, paint, audio listening, or physical touch claims.',results};fs.writeFileSync(path.join(__dirname,'principle-guide-results.json'),JSON.stringify(report,null,2));if(report.passed!==report.total)process.exitCode=1;
