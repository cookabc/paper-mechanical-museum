'use strict';
// Deterministic production camera + actual core RAF. DOM doubles are not a
// browser and this audit does not certify perceptual layout or publication.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('./portable-baseline.cjs');
const {fixture:makeFixture,near,clone,stable}=require('./review-process-invariants.cjs');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'dist/scenes/camera.js'),'utf8');
const baseline=execFileSync('git',['show','898db54:dist/scenes/camera.js'],{cwd:root,encoding:'utf8'});
const results=[],evidence=[];
function test(name,fn){try{fn();results.push({name,ok:true});console.log('PASS '+name);}catch(error){results.push({name,ok:false,error:error.stack});console.error('FAIL '+name+'\n'+error.stack);}}
function fixture({mount=true,sceneSource=source}={}){
 const f=makeFixture('camera',{sourceOverride:sceneSource}),d=f.document,proto=Object.getPrototypeOf(d);
 proto.focus=function(){d.activeElement=this;};proto.scrollIntoView=function(){};proto.contains=function(n){return n===this||this.children.some(c=>c.contains(n));};
 const dock=d.createElement('section');dock.className='play-dock';const primary=d.createElement('div');primary.id='btns';primary.className='actions';
 for(const b of f.cfg.buttons){const button=d.createElement('button');button.className='act';button.textContent=b.label;button.onclick=()=>{b.onClick(f.s,f.ui);f.ui.invalidate();};primary.append(button);}
 const extras=d.createElement('div');extras.className='dock-extras';dock.append(primary,extras);d.body.append(dock);f.dock=dock;f.primary=primary;f.extras=extras;
 if(mount){f.mount();const host=f.ui.observation.panel.parentElement;host.remove();extras.append(host);}
 f.read=()=>{const before=f.snapshot(),out=clone(f.cfg.lesson.read(f.s));assert.equal(f.snapshot(),before,'lesson reads never mutate');return out;};
 f.until=phase=>{let n=0;while(f.s.phase!==phase&&f.pending&&n++<1500)f.frame();assert.equal(f.s.phase,phase);};
 return f;
}
const keys=['phase','phaseTime','flash','shutterPress','eject','develop','take','reload','frames','collected','scene','run'];
const physical=f=>Object.fromEntries(keys.map(k=>[k,f.s[k]]));
const withoutRun=f=>Object.fromEntries(keys.filter(k=>k!=='run').map(k=>[k,f.s[k]]));
function phaseFixture(phase,{runLesson=true}={}){
 const f=fixture();if(runLesson)f.action('lessonEnter');
 if(phase==='loading'){f.s.frames=0;f.button('装入相纸');f.tick(.24);return f;}
 f.action('shutter');if(phase==='flash'){f.tick(.12);return f;}
 if(runLesson){f.finish();assert.equal(f.s.lessonHold,'feed');f.action('lessonNext');}
 else f.until('ejecting');
 if(phase==='ejecting'){f.tick(.4);return f;}
 if(runLesson){f.finish();assert.equal(f.s.lessonHold,'develop');f.action('lessonNext');}
 else f.until('developing');
 if(phase==='developing'){f.tick(.72);return f;}
 f.finish();if(phase==='ready')return f;
 f.action('collect');f.tick(.16);assert.equal(f.s.phase,'collecting');return f;
}
function geometrySync(f){
 const before=f.snapshot(),p=f.observation().paperPath,g=f.read();assert.equal(f.snapshot(),before);
 near(p.feed,f.s.eject);near(p.develop,f.s.develop);near(p.spin,-31*(f.s.collected+f.s.eject)/.85);near(p.height,31*f.s.eject);
 const panel=f.ui.observation?.panel,fold=panel?.querySelector('.camera-paper-path');if(fold){f.toggle(panel,true);f.toggle(fold,true);f.ui.observation.update();const svg=fold.querySelector('svg');near(+svg.getAttribute('data-feed'),p.feed);near(+svg.getAttribute('data-develop'),p.develop);near(+svg.getAttribute('data-spin'),p.spin);}
 const active=f.observation().active;
 const expected={flash:['camera-shutter','camera-lens'],ejecting:['camera-rollers','camera-slot'],developing:['camera-photo'],ready:['camera-photo'],collecting:['camera-photo'],loading:['camera-hatch']};for(const id of expected[f.s.phase]||[])assert(active.includes(id),f.s.phase+' highlights real '+id);
 for(const [yaw,pitch] of [[45,35],[135,15],[225,65],[315,35]])assert(!/NaN|undefined|Infinity/.test(f.render(yaw,pitch)));
 return g;
}
test('main model, landscape and shared paperPath stay byte-for-byte unchanged',()=>{
 const geometry=s=>s.slice(s.indexOf(' function landscape('),s.indexOf(" return{title:'拍立得相机'"));assert.equal(geometry(source),geometry(baseline));
 const paper=s=>s.slice(s.indexOf(' const FEED_LENGTH='),s.indexOf(' let focusPhase='));assert.equal(paper(source),paper(baseline));
 assert(!/getUserMedia|MediaDevices|setInterval|setTimeout|requestAnimationFrame/.test(source));
 assert.equal((source.match(/ui\.animate\(/g)||[]).length,1,'one original animation driver only');
});
test('free play physical states and exact SVG match baseline at matched dt',()=>{
 const a=fixture(),b=fixture({sceneSource:baseline});assert.equal(a.s.lessonEnabled,false);assert.equal(a.s.lessonPaused,false);assert.equal(a.cfg.buttons.length,5);
 const compare=(label,draw=false)=>{assert.deepEqual(physical(a),physical(b),label);if(draw)for(const [yaw,pitch] of [[0,15],[45,35],[135,65],[225,20],[315,60]])assert.equal(a.render(yaw,pitch),b.render(yaw,pitch),label+' SVG '+yaw+'/'+pitch);};
 compare('initial',true);
 // Opening plain observation and the original cutaway must not opt into steps.
 for(const f of [a,b]){f.toggle(f.ui.observation.panel,true);f.toggle(f.ui.observation.panel.querySelector('.camera-paper-path'),true);}
 for(let shot=0;shot<5;shot++)for(const label of ['按下快门','收藏照片']){a.button(label);b.button(label);compare(label);let frame=0;while((a.pending||b.pending)&&frame++<1000){a.frame();b.frame();compare(label+' '+frame,frame%23===0);}assert(frame<1000);compare('rest '+label,true);}
 for(const label of ['装入相纸','切换风景','重新开始']){a.button(label);b.button(label);let frame=0;while((a.pending||b.pending)&&frame++<1000){a.frame();b.frame();compare(label+' '+frame,frame%7===0);}compare(label,true);}
 assert.equal(a.s.lessonEnabled,false);stable(a);stable(b);
});
test('four causal stages stop only at real boundaries, then count one collection',()=>{
 const f=fixture();assert.equal(f.ui.observation.panel.open,false);assert.equal(f.s.lessonEnabled,false);f.action('lessonNext');f.finish();assert.equal(f.s.frames,5);
 f.action('lessonEnter');assert.equal(f.read().index,0);assert.equal(f.read().busy,false);assert(f.observation().active.includes('camera-lens'));
 f.action('lessonNext');assert.equal(f.s.phase,'flash');assert.equal(f.s.frames,4);assert.equal(f.read().index,0);assert.equal(f.read().busy,true);
 for(let i=0;i<20;i++)f.action('lessonNext');f.finish();assert.equal(f.s.phase,'ejecting');assert.equal(f.s.phaseTime,0);assert.equal(f.s.eject,0);assert.equal(f.s.lessonHold,'feed');assert.equal(f.s.lessonPaused,true);assert.equal(f.read().index,1);assert.equal(f.read().busy,false);stable(f);geometrySync(f);
 f.action('lessonNext');f.tick(.4);assert(f.s.eject>0&&f.s.eject<1);assert.equal(f.read().pauseVisible,true);geometrySync(f);f.finish();assert.equal(f.s.phase,'developing');assert.equal(f.s.phaseTime,0);assert.equal(f.s.eject,1);assert.equal(f.s.develop,0);assert.equal(f.s.lessonHold,'develop');assert.equal(f.read().index,2);assert.match(f.read().text,/真实显影可在出片时开始/);stable(f);geometrySync(f);
 const spin=f.observation().paperPath.spin;f.action('lessonNext');f.tick(.8);assert(f.s.develop>0&&f.s.develop<1);near(f.observation().paperPath.spin,spin);geometrySync(f);f.finish();assert.equal(f.s.phase,'ready');assert.equal(f.read().index,3);assert.equal(f.s.collected,0);
 f.action('lessonNext');for(let i=0;i<20;i++)f.action('lessonNext');f.tick(.16);assert.equal(f.s.collected,0);f.finish();assert.equal(f.s.collected,1);assert.equal(f.s.frames,4);assert.equal(f.read().index,4);assert.equal(f.read().completed,true);near(f.observation().paperPath.spin,spin);stable(f);
 f.action('lessonNext');assert.equal(f.s.phase,'flash');assert.equal(f.read().completed,false);assert.equal(f.s.frames,3);evidence.push({stages:4,boundaries:['ejecting: feed=0, phaseTime=0','developing: feed=1, develop=0, phaseTime=0'],collectionCount:1});
});
test('manual pause freezes every real motion, and rapid pause/resume never forks its driver',()=>{
 for(const phase of ['flash','ejecting','developing','collecting','loading']){
  const f=phaseFixture(phase),at=physical(f);f.action('lessonPause');assert.equal(f.s.lessonPaused,true);f.finish();assert.deepEqual(physical(f),at,phase+' freezes before next callback');assert.equal(f.read().busy,false);assert.equal(f.read().pauseVisible,false);stable(f);geometrySync(f);f.finish();
  for(let i=0;i<21;i++)f.action('lessonPause');assert.equal(f.s.lessonPaused,false);const time=f.s.phaseTime;f.frame();near(f.s.phaseTime,time+.04,phase+' advances once, not per resume');assert.equal(f.s.frames,at.frames);assert.equal(f.s.collected,at.collected);
  f.action('lessonPause');f.action('lessonPause');const time2=f.s.phaseTime;f.frame();near(f.s.phaseTime,time2+.04,phase+' resumes before stale pause callback without duplicate');
  f.action('lessonExit');f.finish();assert.equal(f.s.lessonPaused,false);assert.equal(f.s.phase,phase==='collecting'||phase==='loading'?'idle':'ready');stable(f);
 }
});
test('exit preserves exact state and resumes naturally without remaining lesson checkpoints',()=>{
 for(const phase of ['flash','ejecting','developing','collecting','loading'])for(const settled of [false,true]){
  const f=phaseFixture(phase);f.action('lessonPause');if(settled)f.finish();const before=physical(f);f.action('lessonExit');assert.deepEqual(physical(f),before,'exit never rewinds '+phase);assert.equal(f.s.lessonEnabled,false);assert.equal(f.s.lessonPaused,false);assert.equal(f.s.lessonHold,null);for(let j=0;j<20;j++)f.action('lessonExit');f.frame();near(f.s.phaseTime,before.phaseTime+.04,phase+' exit advances once');f.finish();assert.equal(f.s.phase,phase==='collecting'||phase==='loading'?'idle':'ready');assert.equal(f.s.collected,phase==='collecting'?1:0);stable(f);
 }
 for(const hold of ['feed','develop']){const f=fixture();f.action('lessonEnter');f.action('lessonNext');f.finish();if(hold==='develop'){f.action('lessonNext');f.finish();}assert.equal(f.s.lessonHold,hold);const before=physical(f);f.action('lessonExit');assert.deepEqual(physical(f),before);f.finish();assert.equal(f.s.phase,'ready');assert.equal(f.s.frames,4);stable(f);}
});
test('entering a moving free-play photo is read-only and joins its current real stage',()=>{
 for(const phase of ['flash','ejecting','developing','ready','collecting','loading']){const f=phaseFixture(phase,{runLesson:false}),before=physical(f);f.action('lessonEnter');assert.deepEqual(physical(f),before);assert.equal(f.s.lessonPaused,false);geometrySync(f);f.finish();assert.equal(f.s.phase,phase==='flash'?'ejecting':phase==='ejecting'?'developing':phase==='developing'||phase==='ready'?'ready':'idle');assert.equal(f.s.frames,phase==='loading'?5:4);}
});
test('reset while running or paused invalidates old work and keeps an open lesson usable',()=>{
 for(const phase of ['flash','ejecting','developing','ready','collecting','loading'])for(const pause of [false,true]){
  const f=phaseFixture(phase);if(pause)f.action('lessonPause');const run=f.s.run;f.button('重新开始');assert.equal(f.s.run,run+1);assert.equal(f.s.lessonEnabled,true);assert.equal(f.s.lessonPaused,false);assert.equal(f.s.lessonHold,null);assert.equal(f.s.frames,5);assert.equal(f.s.collected,0);assert.equal(f.read().index,0);const flashes=f.flashes.length;f.finish();stable(f);assert.equal(f.flashes.length,flashes,'no stale completion');
  f.action('lessonNext');f.frame();near(f.s.phaseTime,.04,'new cycle gets one dt after reset');assert.equal(f.s.frames,4);f.finish();assert.equal(f.s.lessonHold,'feed');
 }
 // Reset then start before a stale running callback has a chance to drain.
 const f=phaseFixture('developing');f.button('重新开始');f.action('lessonNext');f.frame();near(f.s.phaseTime,.04);assert.equal(f.s.frames,4);f.finish();assert.equal(f.s.lessonHold,'feed');
});
test('five guided photos, repeat actions and replenishment conserve paper and collection',()=>{
 const f=fixture();f.action('lessonEnter');for(let i=0;i<5;i++){for(const phase of ['flash','ejecting','developing','collecting']){f.action('lessonNext');assert.equal(f.s.phase,phase);for(let n=0;n<12;n++){f.action('lessonNext');f.action('shutter');f.action('collect');}f.finish();}assert.equal(f.s.frames,4-i);assert.equal(f.s.collected,i+1);assert.equal(f.read().completed,true);}
 assert.equal(f.s.frames,0);f.action('shutter');assert.equal(f.s.phase,'idle');f.action('lessonNext');assert.equal(f.s.phase,'loading');for(let n=0;n<15;n++)f.action('lessonNext');f.tick(.4);assert.equal(f.s.frames,0);f.finish();assert.equal(f.s.frames,5);assert.equal(f.s.collected,5);assert.equal(f.read().completed,false);assert.equal(f.read().index,0);stable(f);
});
test('shutter press/release and all cancellation routes remain physical in lesson mode',()=>{
 for(const cancel of ['move','pointercancel','lostpointercapture','Escape','blur','hidden','reset']){const f=fixture();f.action('lessonEnter');f.pointer('pointerdown');assert.equal(f.s.shutterPress,1);assert.equal(f.s.frames,5);assert.equal(f.read().busy,true);f.action('lessonNext');assert.equal(f.s.phase,'idle');if(cancel==='move')f.pointer('pointermove',{clientX:24});else if(cancel==='Escape')f.event('keydown',{key:'Escape'});else if(cancel==='blur')f.event('blur');else if(cancel==='hidden'){f.document.hidden=true;f.document.emit('visibilitychange');f.document.hidden=false;f.document.emit('visibilitychange');}else if(cancel==='reset')f.button('重新开始');else f.pointer(cancel);f.pointer('pointerup');f.finish();assert.equal(f.s.frames,5,cancel);assert.equal(f.s.phase,'idle',cancel);assert.equal(f.s.shutterPress,0);}
 const f=fixture();f.action('lessonEnter');f.pointer('pointerdown');f.pointer('pointerup');assert.equal(f.s.frames,4);assert.equal(f.s.phase,'flash');f.pointer('pointerup');f.finish();assert.equal(f.s.frames,4);assert.equal(f.s.lessonHold,'feed');
});
test('hidden tab and page leave park old callbacks; return respects a deliberate pause',()=>{
 for(const paused of [false,true]){const f=phaseFixture('ejecting');if(paused){f.action('lessonPause');f.finish();}const before=physical(f);f.document.hidden=true;f.document.emit('visibilitychange');f.tick(10);assert.deepEqual(physical(f),before);f.document.hidden=false;f.document.emit('visibilitychange');f.frame();near(f.s.phaseTime,before.phaseTime+(paused?0:.04));f.event('pagehide');f.finish();const left=physical(f);f.tick(10);assert.deepEqual(physical(f),left);f.event('pageshow');f.frame();near(f.s.phaseTime,left.phaseTime+(paused?0:.04));assert.equal(f.s.frames,4);if(paused){f.finish();stable(f);f.action('lessonNext');}f.finish();assert.equal(f.s.lessonHold,'develop');assert.equal(f.s.eject,1);assert.equal(f.s.develop,0);}
});
test('quarter-speed view uses the same paper state and exact optional boundaries',()=>{
 const fast=fixture(),slow=fixture();for(const f of [fast,slow]){f.action('lessonEnter');f.action('lessonNext');f.finish();f.action('lessonNext');}slow.ui.simulationRate=.25;
 for(let i=0;i<20;i++){fast.frame();for(let j=0;j<4;j++)slow.frame();near(slow.s.eject,fast.s.eject);near(slow.s.phaseTime,fast.s.phaseTime);near(slow.observation().paperPath.spin,fast.observation().paperPath.spin);}
 fast.finish();slow.finish();for(const f of [fast,slow]){assert.equal(f.s.phase,'developing');assert.equal(f.s.phaseTime,0);assert.equal(f.s.eject,1);assert.equal(f.s.develop,0);assert.equal(f.s.lessonPaused,true);stable(f);}
});
test('shared lesson contract mounts without another timer and preserves original cutaway',()=>{
 const f=fixture({mount:false}),calls=[];f.c.MuseumObservation={mountLesson:options=>calls.push(options)};f.cfg.setup(f.ui);assert.equal(calls.length,1);const options=calls[0];assert.equal(options.id,'camera');assert.equal(options.title,'看懂一步 · 走纸过程');assert.deepEqual(clone(options.route),['曝','送','显','取']);assert.equal(f.s.lessonEnabled,false);assert.equal(f.pending,0);options.onToggle(true);assert.equal(f.s.lessonEnabled,true);options.onAdvance();assert.equal(f.s.frames,4);options.onPause();f.finish();assert.equal(f.s.lessonPaused,true);options.onToggle(false);f.finish();assert.equal(f.s.phase,'ready');assert.equal(f.s.lessonPaused,false);assert.equal(f.s.lessonEnabled,false);
});
function lessonNodes(f){const fold=f.document.querySelector('.camera-guide');assert(fold,'production shared lesson mounted');return {panel:f.ui.observation.panel,fold,go:fold.querySelector('.mechanism-lesson-go'),hold:fold.querySelector('.mechanism-lesson-hold'),exit:fold.querySelector('.mechanism-lesson-exit'),title:fold.querySelector('.mechanism-lesson-title'),reason:fold.querySelector('.mechanism-lesson-reason'),look:fold.querySelector('.mechanism-lesson-look'),dots:fold.querySelectorAll('.mechanism-lesson-route span')};}
function syncLesson(f,n){f.ui.observation.update();const read=f.read();assert.equal(n.title.textContent,(read.completed?'完成':String(read.index+1)+' / 4')+' · '+read.title);assert.equal(n.reason.textContent,read.text);assert.equal(n.look.textContent,'看这里：'+read.look);assert.equal(n.go.textContent,read.label);assert.equal(n.go.getAttribute('aria-disabled'),String(read.busy));assert.equal(n.hold.hidden,!read.pauseVisible);for(let i=0;i<4;i++){assert.equal(n.dots[i].dataset.done,String(read.completed||i<read.index));assert.equal(n.dots[i].getAttribute('aria-current'),i===read.index?'step':null);}return read;}
test('real shared helper relocates one card, folds original controls, and restores exact nodes and focus',()=>{
 const f=fixture(),n=lessonNodes(f),home=n.fold.parentElement,buttons=[...f.primary.children],diagram=home.querySelector('.camera-paper-path');assert.equal(n.panel.open,false);assert.equal(n.fold.open,false);assert.equal(f.s.lessonEnabled,false);assert.equal(n.dots.length,4);assert.equal(f.primary.parentElement,f.dock);
 f.toggle(n.panel,true);f.finish();assert.equal(f.s.lessonEnabled,false);f.toggle(n.fold,true);f.finish();syncLesson(f,n);assert.equal(f.s.lessonEnabled,true);assert.equal(n.fold.parentElement,f.dock);const free=f.dock.querySelector('.lesson-free-controls');assert(free);assert.equal(free.open,false);assert.equal(f.primary.parentElement,free);assert.equal(f.document.querySelectorAll('#btns').length,1);assert.equal(f.document.querySelectorAll('.camera-guide').length,1);assert.equal(home.querySelector('.observation-live').hidden,true);assert.equal(home.querySelector('.observation-intro').hidden,true);assert.equal(diagram.parentElement,home);assert.equal(diagram.open,false);
 n.go.focus();n.go.click();f.tick(.12);syncLesson(f,n);assert.equal(f.document.activeElement,n.go);assert.equal(n.go.disabled,false);assert.equal(n.go.getAttribute('aria-disabled'),'true');assert.equal(n.hold.hidden,false);const before=physical(f);for(let i=0;i<15;i++)n.go.click();assert.deepEqual(physical(f),before,'helper busy guard is real, not just aria');n.hold.focus();n.hold.click();assert.equal(f.document.activeElement,n.go);f.finish();syncLesson(f,n);assert.equal(f.s.lessonPaused,true);assert.equal(n.hold.hidden,true);assert.equal(n.go.getAttribute('aria-disabled'),'false');stable(f);
 const paused=physical(f);n.exit.click();assert.deepEqual(physical(f),paused);assert.equal(f.s.lessonEnabled,false);assert.equal(f.s.lessonPaused,false);assert.equal(n.fold.parentElement,home);assert.equal(f.primary.parentElement,f.dock);assert.deepEqual(f.primary.children,buttons);assert.equal(home.querySelector('.observation-live').hidden,false);assert.equal(home.querySelector('.observation-intro').hidden,false);assert.equal(f.document.activeElement,n.fold.querySelector('summary'));f.finish();assert.equal(f.s.phase,'ready');
 for(let i=0;i<12;i++){f.toggle(n.fold,true);free.open=true;n.fold.querySelector('summary').focus();f.toggle(n.fold,false);f.finish();assert.equal(f.document.activeElement,n.fold.querySelector('summary'));assert.equal(free.open,false);assert.equal(f.document.querySelectorAll('#btns').length,1);assert.equal(f.document.querySelectorAll('.camera-guide').length,1);assert.equal(f.document.querySelectorAll('.camera-paper-path').length,1);assert.equal(f.primary.parentElement,f.dock);assert.deepEqual(f.primary.children,buttons);}stable(f);
});
test('visible real helper follows physical route, keeps the old diagram optional, and parent-close resumes',()=>{
 const f=fixture(),n=lessonNodes(f),diagram=n.panel.querySelector('.camera-paper-path');f.toggle(n.panel,true);f.toggle(n.fold,true);f.finish();n.go.click();f.finish();assert.equal(syncLesson(f,n).index,1);assert.equal(f.s.lessonHold,'feed');const before=physical(f);f.toggle(diagram,true);f.ui.observation.update();assert.deepEqual(physical(f),before);assert.equal(diagram.parentElement,n.panel.querySelector('.observation-content'));assert.equal(n.fold.parentElement,f.dock);assert.equal(n.panel.querySelectorAll('svg').length,1,'diagram not cloned into dock');geometrySync(f);f.finish();stable(f);
 n.go.click();f.tick(.4);syncLesson(f,n);f.finish();assert.equal(syncLesson(f,n).index,2);assert.equal(f.s.lessonHold,'develop');n.go.click();f.finish();assert.equal(syncLesson(f,n).index,3);n.go.click();f.finish();assert.equal(syncLesson(f,n).completed,true);assert.equal(f.s.collected,1);assert(n.dots.every(dot=>dot.dataset.done==='true'));assert(n.dots.every(dot=>dot.getAttribute('aria-current')===null));n.go.click();f.finish();assert.equal(f.s.lessonHold,'feed');
 n.go.focus();f.toggle(n.panel,false);assert.equal(f.s.lessonEnabled,false);assert.equal(f.s.lessonPaused,false);assert.equal(n.fold.open,false);assert.equal(f.primary.parentElement,f.dock);assert.equal(f.document.activeElement,n.panel.querySelector('summary'));f.finish();assert.equal(f.s.phase,'ready');assert.equal(f.s.frames,3);assert.equal(f.s.collected,1);stable(f);
});
test('paper diagram caption reflects pause and resume without changing its physical snapshot',()=>{
 const f=phaseFixture('ejecting');geometrySync(f);f.finish(); // The next optional checkpoint parks at development.
 f.button('重新开始');f.action('lessonNext');f.finish();f.action('lessonNext');f.tick(.64);
 const fold=f.ui.observation.panel.querySelector('.camera-paper-path'),status=fold.querySelector('[data-camera-path-status]');f.ui.observation.update();assert.match(status.textContent,/滚轮随纸转动/);assert.doesNotMatch(status.textContent,/定格/);const path=clone(f.observation().paperPath);
 f.action('lessonPause');f.finish();f.ui.observation.update();assert.deepEqual(f.observation().paperPath,path);assert.match(status.textContent,/观察已定格/);assert.match(status.textContent,/滚轮定格/);assert.doesNotMatch(status.textContent,/滚轮随纸转动/);
 fold.querySelector('[data-camera-path-part="camera-rollers"]').click();f.ui.observation.update();assert.match(status.textContent,/观察已定格/);assert.match(status.textContent,/已标出机身滚轮/);fold.querySelector('[data-camera-path-part="camera-rollers"]').click();f.action('lessonNext');f.ui.observation.update();assert.match(status.textContent,/滚轮随纸转动/);assert.doesNotMatch(status.textContent,/定格/);assert.deepEqual(f.observation().paperPath,path,'resume caption changes before physical advancement');
 f.action('lessonExit');f.finish();f.ui.observation.update();assert.match(status.textContent,/滚轮停住/);assert.doesNotMatch(status.textContent,/定格/);
});
const report={candidateSha256:crypto.createHash('sha256').update(source).digest('hex'),baseline:'898db54',passed:results.filter(r=>r.ok).length,total:results.length,limits:'Production callbacks, state, SVG and actual core RAF; deterministic DOM doubles. No browser/layout or perceptual audio certification; no commit, push or publication.',evidence,results};
console.log(JSON.stringify(report,null,2));if(results.some(r=>!r.ok))process.exitCode=1;
