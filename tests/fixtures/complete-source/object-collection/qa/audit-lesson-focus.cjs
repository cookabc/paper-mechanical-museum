'use strict';
// Independent shared-card focus/lifecycle audit. Production scene callbacks and
// core RAF, with deterministic DOM doubles. This is not browser/layout QA.
const assert=require('node:assert/strict');
const {fixture:baseFixture,clone}=require('./review-process-invariants.cjs');
const results=[];
function test(name,fn){try{fn();results.push({name,ok:true});}catch(error){results.push({name,ok:false,error:error.stack});}}
function fixture(id='vending'){
 const f=baseFixture(id),d=f.document,p=Object.getPrototypeOf(d);
 p.contains=function(n){return n===this||this.children.some(c=>c.contains(n));};
 // Match the focus-fixup consequence relevant to this audit: hiding, disabling,
 // or detaching the focused control drops focus before the helper repairs it.
 const remove=p.remove;
 p.remove=function(){if(this.contains(d.activeElement))d.activeElement=d.body;remove.call(this);this.parentElement=null;};
 Object.defineProperty(p,'hidden',{configurable:true,get(){return !!this._hidden;},set(value){this._hidden=!!value;if(this._hidden&&this.contains(d.activeElement))d.activeElement=d.body;}});
 Object.defineProperty(p,'disabled',{configurable:true,get(){return !!this._disabled;},set(value){this._disabled=!!value;if(this._disabled&&d.activeElement===this)d.activeElement=d.body;}});
 p.focus=function(){if(!d.contains(this)||this.disabled)return;for(let n=this;n;n=n.parentElement)if(n.hidden)return;d.activeElement=this;};
 p.scrollIntoView=function(){};
 d.activeElement=d.body;
 const dock=d.createElement('section');dock.className='play-dock';
 const primary=d.createElement('div');primary.id='btns';primary.className='actions';
 for(const config of f.cfg.buttons){const button=d.createElement('button');button.className='act';button.textContent=config.label;button.onclick=()=>{config.onClick(f.s,f.ui);f.ui.invalidate();};primary.append(button);}
 const extras=d.createElement('section');extras.className='dock-extras';dock.append(primary,extras);d.body.append(dock);
 f.mount();const panel=f.ui.observation.panel,host=panel.parentElement;host.remove();extras.append(host);
 const guide=d.querySelector('.mechanism-lesson'),home=guide.parentElement;
 const go=guide.querySelector('.mechanism-lesson-go'),hold=guide.querySelector('.mechanism-lesson-hold'),exit=guide.querySelector('.mechanism-lesson-exit'),choices=guide.querySelector('.mechanism-lesson-choices');
 const outside=d.createElement('button');outside.textContent='Outside lesson';d.body.append(outside);
 const open=()=>{f.toggle(panel,true);f.toggle(guide,true);f.finish();};
 const choice=id=>choices.children.find(b=>b.dataset.choice===id);
 return Object.assign(f,{d,dock,primary,extras,panel,guide,home,go,hold,exit,choices,outside,open,choice});
}
function current(f,node){assert.equal(f.d.activeElement,node);assert(f.d.contains(node),'focus target is attached');assert.equal(node.hidden,false);assert.equal(node.disabled,false);}
function deposit(f){f.go.focus();f.go.click();assert.equal(f.s.phase,'coin');f.finish();assert.equal(f.s.tokens,1);}

test('manual opt-in keeps original controls intact and starts both disclosures closed',()=>{
 const f=fixture(),before=clone(f.s);assert.equal(f.panel.open,false);assert.equal(f.guide.open,false);assert.equal(f.primary.parentElement,f.dock);assert.equal(f.pending,0);f.toggle(f.panel,true);f.finish();assert.equal(f.guide.open,false);assert.deepEqual(clone(f.s),before);f.open();assert.equal(f.primary.parentElement.className,'lesson-free-controls vending-free-controls');assert.equal(f.primary.parentElement.open,false);current(f,f.guide.querySelector('summary'));
});
test('vending deposit hands focus from disappearing primary to first enabled flavor',()=>{
 const f=fixture();f.open();deposit(f);assert.equal(f.go.hidden,true);current(f,f.choice('flavor-0'));assert.equal(f.s.delivered,null,'focus never picks a drink');assert.equal(f.s.collected,0);
});
test('selection hands focus from removed flavor to busy primary and stale clicks remain inert',()=>{
 const f=fixture();f.open();deposit(f);const flavor=f.choice('flavor-1');flavor.focus();flavor.click();assert.equal(f.s.phase,'drop');assert.equal(f.d.contains(flavor),false);assert.equal(f.go.getAttribute('aria-disabled'),'true');current(f,f.go);const before=clone(f.s);for(let i=0;i<25;i++){flavor.onclick();f.go.click();}assert.deepEqual(clone(f.s),before);f.finish();current(f,f.go);assert.equal(f.s.phase,'ready');assert.equal(f.s.collected,0);f.go.click();f.finish();assert.equal(f.s.collected,1);
});
test('focus skips sold-out flavors and reaches explicit refill when all flavors are empty',()=>{
 for(const stock of [[0,2,0],[0,0,0]]){const f=fixture();f.s.stock=stock;f.open();deposit(f);current(f,f.choice(stock[1]?'flavor-1':'refill'));assert.deepEqual(clone(f.s.stock),stock);assert.equal(f.s.delivered,null);}
});
test('jam recovery hands focus to continue/cancel and cancellation returns focus without duplicate accounting',()=>{
 const f=fixture();f.open();f.action('faultNext');deposit(f);f.choice('flavor-2').focus();f.choice('flavor-2').click();f.finish();assert.equal(f.s.phase,'jammed');current(f,f.go);f.go.click();f.finish();assert.equal(f.s.phase,'recovered');assert.equal(f.go.hidden,true);current(f,f.choice('continue'));const cancel=f.choice('cancel');cancel.focus();cancel.click();current(f,f.go);assert.equal(f.s.phase,'returning');const before=clone(f.s);for(let i=0;i<20;i++)cancel.onclick();assert.deepEqual(clone(f.s),before);f.finish();assert.equal(f.s.tokens,0);assert.equal(f.s.reservedCoin,0);assert.deepEqual(clone(f.s.stock),[3,3,3]);assert.equal(f.s.collected,0);current(f,f.go);
});
test('asynchronous choice arrival never steals focus after user leaves the card',()=>{
 const f=fixture();f.open();f.go.focus();f.go.click();f.outside.focus();f.finish();current(f,f.outside);assert.equal(f.go.hidden,true);f.choice('flavor-0').click();f.outside.focus();f.finish();current(f,f.outside);assert.equal(f.s.phase,'ready');f.go.click();f.outside.focus();f.finish();current(f,f.outside);assert.equal(f.s.collected,1);
});
test('repeated exit and re-entry restore original nodes and focus without restarting the transaction',()=>{
 const f=fixture();f.open();deposit(f);const buttons=[...f.primary.children];for(let i=0;i<12;i++){f.choice('flavor-1').focus();const before=clone(f.s);f.exit.click();assert.equal(f.guide.open,false);assert.deepEqual(clone(f.s),before);assert.equal(f.primary.parentElement,f.dock);assert.deepEqual(f.primary.children,buttons);current(f,f.guide.querySelector('summary'));f.open();assert.equal(f.d.querySelectorAll('#btns').length,1);assert.equal(f.d.querySelectorAll('.mechanism-lesson').length,1);assert.equal(f.primary.parentElement.open,false);assert.deepEqual(clone(f.s),before);}
 f.choice('flavor-1').focus();f.choice('flavor-1').click();f.go.focus();f.toggle(f.panel,false);assert.equal(f.guide.open,false);assert.equal(f.primary.parentElement,f.dock);current(f,f.panel.querySelector('summary'));f.finish();assert.equal(f.s.phase,'ready');assert.equal(f.s.collected,0);f.open();f.go.click();f.finish();assert.equal(f.s.collected,1);
});
test('closed or hidden lessons do not refresh their body; reopening refreshes current state',()=>{
 const f=fixture();f.open();deposit(f);const body=f.guide.querySelector('.mechanism-lesson-body');f.toggle(f.guide,false);const closed=body.outerHTML;f.action('choose',{i:'1'});f.finish();assert.equal(body.outerHTML,closed);assert.equal(f.s.phase,'ready');f.open();assert.match(f.go.textContent,/领取/);const visible=body.outerHTML;f.document.hidden=true;f.action('collect');f.ui.observation.update();assert.equal(body.outerHTML,visible);f.document.hidden=false;f.document.emit('visibilitychange');f.finish();assert.equal(f.s.collected,1);assert.match(f.go.textContent,/再投/);
});
test('coffee and camera pause hand focus to resume, and exit resumes the existing run exactly once',()=>{
 for(const id of ['coffee','camera']){const f=fixture(id);f.open();f.go.focus();f.go.click();f.tick(.12);assert.equal(f.hold.hidden,false);f.hold.focus();f.hold.click();current(f,f.go);f.finish();assert.equal(f.hold.hidden,true);assert.equal(id==='coffee'?f.s.brewPaused:f.s.lessonPaused,true);const run=f.s.run;f.exit.click();current(f,f.guide.querySelector('summary'));f.finish();assert.equal(f.s.run,run);assert.equal(id==='coffee'?f.s.brewPaused:f.s.lessonPaused,false);assert.equal(f.s.phase,id==='coffee'?'beans':'ready');}
});
test('elevator disables a registered floor without leaving focus on that control',()=>{
 const f=fixture('elevator');f.open();const third=f.choice('floor-3');third.focus();third.click();assert.equal(third.disabled,true);current(f,f.choice('floor-2'));assert.deepEqual(clone(f.s.queue),[3]);const before=clone(f.s);third.onclick();assert.deepEqual(clone(f.s),before,'fresh disabled state blocks stale registered-floor activation');f.frame();assert.equal(f.s.phase,'closing');assert.equal(f.s.target,3);f.finish();assert.equal(f.s.floor,3);assert.equal(f.s.trips,1);
});
const report={passed:results.filter(r=>r.ok).length,total:results.length,limits:'Production callbacks/shared helper and actual core RAF; deterministic DOM with explicit focus-fixup doubles. No browser, mobile-layout, perceptual-audio or publication certification.',results};
console.log(JSON.stringify(report,null,2));if(report.passed!==report.total)process.exitCode=1;
