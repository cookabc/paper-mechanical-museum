const assert=require('node:assert/strict'),{create,source}=require('./input-harness.cjs');
let passed=0,failed=0;
function test(name,fn){try{fn();passed++;console.log('PASS',name)}catch(e){failed++;console.error('FAIL',name,'\n ',e.stack)}}
const point=h=>[h.st.x,h.st.y];
const key=(node,key,extra={})=>node.emit('keydown',{key,code:key===' '?'Space':key,...extra});
const up=(node,key)=>node.emit('keyup',{key,code:key===' '?'Space':key});
const click=node=>node.emit('click',{detail:0});
const hnew=()=>create();

test('settings scroll region, ordinary controls and body never own game arrows/Space',()=>{
 const h=hnew(),settings=h.node('section');settings.setAttribute('tabindex','0');h.doc.body.append(settings);
 for(const target of[settings,h.doc.body,...['input','textarea','select','summary','a','button','div'].map(tag=>{const n=h.node(tag);settings.append(n);return n})]){
  target.focus();const before=point(h);for(const k of['ArrowDown','ArrowRight',' ']){const e=key(target,k);assert.equal(e.defaultPrevented,false,target.tagName+' '+k+' keeps native behavior');h.advance(150);up(target,k);assert.deepEqual(point(h),before);assert.equal(h.st.tries,0);assert.equal(h.run('held'),null)}
 }
});
test('model, toy, joystick and direction pad own unmodified game keys',()=>{
 for(const kind of['model','toy','joy','pad']){const h=hnew(),target={model:h.svg,toy:h.toy(0),joy:h.joy,pad:h.button('left')}[kind];target.focus();const before=point(h);assert.equal(key(target,'ArrowRight').defaultPrevented,true,kind);h.advance(120);up(target,'ArrowRight');assert.notDeepEqual(point(h),before);const stop=point(h);h.advance(250);assert.deepEqual(point(h),stop);assert.equal(h.run('held'),null)}
 const h=hnew();h.svg.focus();key(h.svg,' ');key(h.svg,' ',{repeat:true});assert.equal(h.st.tries,1);assert.equal(h.st.phase,'down');
});
test('Alt/Ctrl/Meta shortcuts are untouched across model, toys, joystick, pad and settings',()=>{
 for(const modifier of['altKey','ctrlKey','metaKey'])for(const kind of['model','toy','joy','pad','settings']){const h=hnew(),target={model:h.svg,toy:h.toy(0),joy:h.joy,pad:h.button('left'),settings:h.buttons.vreset}[kind];target.focus();const before=point(h),yaw=h.ctx.YAW;for(const k of['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter']){const e=key(target,k,{[modifier]:true});assert.equal(e.defaultPrevented,false,modifier+' '+kind+' '+k);assert.equal(target.emit('keyup',{key:k,[modifier]:true}).defaultPrevented,false)}h.advance(350);assert.deepEqual(point(h),before);assert.equal(h.ctx.YAW,yaw);assert.equal(h.st.tries,0);assert.equal(h.calls.length,0)}
});
test('Shift+arrows rotate only the model and never also move the claw',()=>{
 const h=hnew(),before=point(h);h.svg.focus();assert.equal(key(h.svg,'ArrowRight',{shiftKey:true}).defaultPrevented,true);h.advance(350);assert.equal(h.ctx.YAW,53);assert.deepEqual(point(h),before);const settings=h.buttons.vreset;settings.focus();assert.equal(key(settings,'ArrowLeft',{shiftKey:true}).defaultPrevented,false);h.advance(350);assert.equal(h.ctx.YAW,53);
});
test('click-only named toy aim, drop and collect activate once per independent click',()=>{
 const h=hnew();click(h.toy(0));assert.equal(h.st.target,0);assert.equal(h.st.aiming,true);click(h.toy(1));assert.equal(h.st.target,1);assert.equal(h.calls.length,2);h.advance(700);click(h.art.children.find(n=>n.dataset.act==='drop'));assert.equal(h.st.tries,1);h.advance(9000);assert.equal(h.st.phase,'prize');click(h.control('collect'));h.advance(1300);assert.equal(h.st.won.length,1);assert.equal(h.st.phase,'idle');
});
test('SVG pointer release + compatibility click fires once; drag and cancellation never tap',()=>{
 for(const end of['pointerup','pointercancel','lostpointercapture','blur','hidden','drag']){const h=hnew(),target=h.toy(0);target.emit('pointerdown',{pointerId:7});if(end==='blur')h.globals.emit('blur');else if(end==='hidden'){h.doc.hidden=true;h.doc.emit('visibilitychange')}else{if(end==='drag')target.emit('pointermove',{pointerId:7,clientX:140});target.emit(end==='drag'?'pointerup':end,{pointerId:7})}target.emit('pointerup',{pointerId:7});target.emit('click',{detail:1});assert.equal(h.calls.length,end==='pointerup'?1:0,end);assert.equal(h.ui.pressedAct,null)}
});
test('pointer-identified detail-zero compatibility click is ignored without delaying independent clicks',()=>{
 const h=hnew(),target=h.toy(0);target.emit('pointerdown',{pointerId:7});target.emit('pointerup',{pointerId:7});target.emit('click',{detail:0,pointerId:7,pointerType:'mouse'});assert.equal(h.calls.length,1);click(target);click(target);assert.equal(h.calls.length,3);
});
test('SVG keyboard repeat + matching click are deduplicated, later independent clicks work',()=>{
 for(const k of['Enter',' ']){const h=hnew(),target=h.toy(0);target.focus();key(target,k);key(target,k,{repeat:true});click(target);assert.equal(h.calls.length,1);up(target,k);click(target);assert.equal(h.calls.length,1);h.advance(30);click(target);click(target);assert.equal(h.calls.length,3);assert.equal(h.ui.pressedAct,null)}
});
test('keyboard deduplication follows the toy identity across a replaced drawing frame',()=>{
 const h=hnew(),target=h.toy(2);target.focus();key(target,'Enter');h.redraw(()=>{target.remove();h.control('aim',2)});const next=h.toy(2);assert.equal(h.doc.activeElement,next);click(next);assert.equal(h.calls.length,1);up(next,'Enter');click(next);assert.equal(h.calls.length,1);h.advance(30);click(next);assert.equal(h.calls.length,2);
});
test('pad and joystick keyboard activation suppress only their matching synthetic click',()=>{
 const h=hnew(),pad=h.button('right');pad.focus();key(pad,'Enter');h.advance(100);const before=point(h);click(pad);assert.deepEqual(point(h),before);up(pad,'Enter');click(pad);assert.deepEqual(point(h),before);h.advance(30);click(pad);const next=point(h);assert.notDeepEqual(next,before);click(pad);assert.notDeepEqual(point(h),next);
 let hints=0;h.ui.flash=()=>hints++;key(h.joy,'Enter');click(h.joy);up(h.joy,'Enter');click(h.joy);assert.equal(hints,1);h.advance(30);click(h.joy);click(h.joy);assert.equal(hints,3);assert.equal(h.st.tries,0);assert.equal(h.calls.length,0);
});
test('pointer, keyboard and joystick takeover preserves ownership and cancels all interruptions',()=>{
 const h=hnew(),pad=h.button('left');h.svg.focus();key(h.svg,'ArrowLeft');key(h.svg,'ArrowRight');up(h.svg,'ArrowLeft');assert.equal(h.run('held'),'right');pad.emit('pointerdown',{pointerId:7});up(h.svg,'ArrowRight');assert.equal(h.run('held'),'left');h.joy.emit('pointerdown',{pointerId:8});assert.equal(h.run('held'),null);pad.emit('pointerup',{pointerId:7});assert.equal(h.run('joy.id'),8);h.joy.emit('pointermove',{pointerId:8,clientX:140});h.advance(120);h.joy.emit('pointercancel',{pointerId:9});assert.equal(h.run('joy.id'),8);key(h.joy,'ArrowRight');assert.equal(h.run('joy'),null);h.joy.emit('pointerup',{pointerId:8});assert.equal(h.run('held'),'right');up(h.joy,'ArrowRight');h.advance(250);assert.equal(h.steps.length,0);
 for(const cancel of['blur','hidden','focus','modifier']){const t=hnew();t.svg.focus();key(t.svg,'ArrowRight');t.advance(100);if(cancel==='blur')t.globals.emit('blur');if(cancel==='hidden'){t.doc.hidden=true;t.doc.emit('visibilitychange')}if(cancel==='focus')t.buttons.vreset.focus();if(cancel==='modifier')key(t.svg,'Control',{ctrlKey:true});const p=point(t);t.advance(300);assert.deepEqual(point(t),p,cancel);assert.equal(t.run('held'),null,cancel);assert.equal(t.st.moving,false,cancel)}
});
test('model keyboard press feedback clears on blur, hidden and focus loss',()=>{
 for(const cancel of['blur','hidden','focus']){const h=hnew();h.toy(0).focus();key(h.toy(0),'Enter');if(cancel==='blur')h.globals.emit('blur');if(cancel==='hidden'){h.doc.hidden=true;h.doc.emit('visibilitychange')}if(cancel==='focus')h.buttons.vreset.focus();assert.equal(h.ui.pressedAct,null,cancel);assert.equal(h.calls.length,1)}
});
test('redraw preserves toy identity; removed/hidden controls fall back to visible model focus',()=>{
 const h=hnew(),target=h.toy(2);target.focus();h.redraw(()=>{h.toy(0).remove();target.remove();h.control('aim',2)});assert.equal(h.doc.activeElement.dataset.i,'2');assert.equal(h.doc.activeElement.dataset.act,'aim');h.redraw(()=>{h.toy(2).remove()});assert.equal(h.doc.activeElement,h.svg,'removed toy must not focus a different toy at its old index');
 h.toy(1).focus();h.redraw(()=>h.toy(1).setAttribute('aria-hidden','true'));assert.equal(h.doc.activeElement,h.svg);const drop=h.art.children.find(n=>n.dataset.act==='drop');drop.focus();h.redraw(()=>{drop.remove();h.control('drop')});assert.equal(h.doc.activeElement.dataset.act,'drop');
 h.joy.focus();h.ctx.exteriorControlVisible=()=>false;h.ui.render();assert.equal(h.doc.activeElement,h.svg);assert.equal(h.joy.getAttribute('tabindex'),'-1');assert.match(source('shared-shell.css'),/#fig:focus-visible\s*\{[^}]*outline/);
});
test('hidden target cannot synthesize activation and hidden joystick cannot keep moving',()=>{
 const h=hnew();h.toy(0).setAttribute('aria-hidden','true');click(h.toy(0));assert.equal(h.calls.length,0);h.joy.emit('pointerdown',{pointerId:7});h.joy.emit('pointermove',{pointerId:7,clientX:140});h.advance(100);h.ctx.exteriorControlVisible=()=>false;h.ui.render();const before=point(h);h.advance(300);assert.deepEqual(point(h),before);assert.equal(h.run('joy'),null);assert.equal(h.joy.capture,null);
});
test('shortest camera reset handles positive/negative multi-turn yaw and stops auto-spin',()=>{
 for(const yaw of[1500,-1500,3650,-3650]){const h=hnew();h.ctx.YAW=yaw;h.buttons.vreset.emit('click',{detail:1});h.advance(1000);const delta=((38-yaw+180)%360+360)%360-180;assert(Math.abs(h.ctx.YAW-yaw-delta)<1e-8);assert(Math.abs(h.ctx.YAW-yaw)<=180)}
 const h=hnew();h.buttons.vspin.emit('click',{detail:1});h.advance(250);h.svg.emit('dblclick',{detail:2});h.advance(1200);const yaw=h.ctx.YAW;h.advance(1000);assert.equal(h.ctx.YAW,yaw);assert.equal(h.buttons.vspin.getAttribute('aria-pressed'),'false');assert.equal(h.steps.length,0);
});
test('full real game state still supports four wins, guards, miss, and restock',()=>{
 const h=hnew();for(let i=0;i<4;i++){h.run(`aim(st,${i},ui);drop(st,ui)`);assert.equal(h.st.phase,'idle');h.advance(700);h.run('drop(st,ui);drop(st,ui)');assert.equal(h.st.tries,i+1);h.advance(9000);assert.equal(h.st.phase,'prize');h.run('collect(st,ui);collect(st,ui)');h.advance(1300);assert.equal(h.st.phase,'idle');assert.equal(h.st.won.length,i+1)}h.run('drop(st,ui)');assert.equal(h.st.stock.length,4);assert.equal(h.st.tries,0);h.st.x=31;h.st.y=37;h.run('drop(st,ui)');h.advance(4000);assert.equal(h.st.result,'miss');assert.equal(h.st.open,1);h.advance(300);assert.equal(h.steps.length,0);
});
console.log(`INPUT: ${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
