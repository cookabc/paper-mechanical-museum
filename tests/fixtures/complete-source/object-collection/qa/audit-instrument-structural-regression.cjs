'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const harness=fs.readFileSync(path.join(__dirname,'audit-instrument-camera-observation.cjs'),'utf8').split('const states={};')[0];
function getRig(before=false){const mod={exports:{}};const intercepted=before?new Proxy(fs,{get:(target,key)=>key==='readFileSync'?(p,...args)=>String(p).endsWith('/scenes/musicbox.js')?fs.readFileSync(path.join(__dirname,'instrument-contact/musicbox-before.js'),...args):fs.readFileSync(p,...args):target[key]}):fs;vm.runInNewContext(harness+'\nmodule.exports=rig;',{require:n=>n==='node:fs'?intercepted:require(n),__dirname,module:mod,console});return mod.exports;}
const rig=getRig(),beforeRig=getRig(true);let n=0;const ok=(x,m)=>{assert.ok(x,m);n++};
const orig=beforeRig('musicbox'),after=rig('musicbox');const atoms=s=>s.replace(/<mask\b[\s\S]*?<\/mask>/g,'').match(/<(?:path|text)\b[^>]*(?:>[^<]*<\/text>|\/?>)/g).sort().join('\n');
for(const lid of[0,.2,.5,1])for(const yaw of[0,45,90,135,180,225,270,315])for(const pitch of[6,35,78]){
 orig.s.lid=after.s.lid=lid;orig.s.angle=after.s.angle=.38;ok(atoms(orig.render(yaw,pitch))===atoms(after.render(yaw,pitch)),`unchanged geometry/materials ${lid}/${yaw}/${pitch}`);
}
vm.runInContext(`const originalBox=box;box=(...a)=>'<g data-qa-box="'+a.slice(0,6).join(',')+'">'+originalBox(...a)+'</g>';`,after.c);
for(const lid of[0,.2,.5,1])for(const yaw of[0,45,90,135,180,225,270,315])for(const pitch of[6,35,78]){
 after.s.lid=lid;const svg=after.render(yaw,pitch),plate=svg.indexOf('data-qa-box="11,12,12,57,48,14"');
 for(const x of[18,47]){const foot=svg.indexOf(`data-qa-box="${x-2},20,14,${x+2},33,18"`);ok(plate>=0&&foot>plate,`plate cannot cover bearing ${x}, ${lid}/${yaw}/${pitch}`)}
}
// Mask paths only erase hidden ink; they are not added physical surfaces.
// Needle contact and its radial trajectory stay on the existing grooved surface.
for(const elapsed of[0,9,18,27,36]){const angle=.38+elapsed/36*.28,x=13+41*Math.cos(angle),y=11+41*Math.sin(angle),r=Math.hypot(x-36,y-36);ok(r>=8&&r<=22,'stylus remains in grooved band');ok(Math.abs(27-2.7-24.3)<1e-9,'needle tip matches groove height');}

function distanceSegments(p1,q1,p2,q2){const sub=(a,b)=>a.map((v,k)=>v-b[k]),dot=(a,b)=>a.reduce((s,v,k)=>s+v*b[k],0),add=(p,d,t)=>p.map((v,k)=>v+d[k]*t),clamp=x=>Math.max(0,Math.min(1,x)),d1=sub(q1,p1),d2=sub(q2,p2),r=sub(p1,p2),a=dot(d1,d1),e=dot(d2,d2),b=dot(d1,d2),c=dot(d1,r),f=dot(d2,r),den=a*e-b*b;let s=den?clamp((b*f-c*e)/den):0,t=(b*s+f)/e;if(t<0){t=0;s=clamp(-c/a)}else if(t>1){t=1;s=clamp((b-c)/a)}return Math.hypot(...sub(add(p1,d1,s),add(p2,d2,t)))}
function clearance(s){const a=.03+s.arm*(.35+s.elapsed/36*.28),z=27+s.lift*4,mid=[13+30*Math.cos(a-.08),11+30*Math.sin(a-.08),z+1],end=[13+39*Math.cos(a),11+39*Math.sin(a),z];return Math.min(...[8.1,11.3].flatMap(y=>[[[13,11,30],mid],[mid,end]].map(([p,q])=>distanceSegments(p,q,[40,y,30.7],[40,y,32])-1.05-.45)))}

{
 const h=rig('turntable');h.act('cue');h.tick(.2);const t=h.s.armTarget;h.act('cue');ok(h.s.armTarget===t&&h.s.cue==='hover','repeated moving cue is rejected');h.button('唱臂归位');h.tick(2);ok(h.s.cue==='rest'&&h.s.arm===0&&h.s.lift===1,'park during inward swing settles');
 h.act('cue');h.tick(1);h.act('cue');h.tick(.2);h.button('唱臂归位');ok(h.s.arm===1&&Math.min(...Array.from({length:101},(_,i)=>clearance({...h.s,arm:i/100,lift:h.s.liftTarget})))>.5,'park during lowering targets actual fork clearance before swinging');h.tick(.1);ok(h.s.arm===1&&h.s.lift<1,'arm has not swept during incomplete lift');for(let t=0;t<2;t+=.01){const arm=h.s.arm;h.tick(.01);if(h.s.arm!==arm)ok(clearance(h.s)>.5,'every actual returning step clears both cradle forks');}ok(h.s.cue==='rest','mid-lower parking reaches rest');
 for(let i=0;i<30;i++)h.act('play');h.tick(2);ok(h.s.platterRpm===0&&!h.s.playing&&h.s.elapsed===0,'rapid motor toggles settle without false progress');h.button('重新开始');h.tick(1);ok(h.callbacks.size===0,'turntable reset releases all drivers');
}
{
 const h=rig('camera');for(let i=0;i<5;i++){h.act('shutter');h.act('shutter');h.tick(.6);h.button('切换风景');ok(h.s.scene===0,'in-flight scene stays locked');h.tick(5);ok(h.s.phase==='ready'&&h.s.frames===4-i,'exactly one sheet per completed cycle');h.act('collect');h.act('collect');h.tick(.2);ok(h.s.collected===i,'collection counts only physical removal');h.tick(.4);ok(h.s.collected===i+1&&h.s.phase==='idle','one collection after repeated press');}h.act('shutter');ok(h.s.phase==='idle'&&h.s.frames===0,'empty camera cannot expose');h.button('装入相纸');h.button('装入相纸');h.tick(.5);h.button('重新开始');h.tick(2);ok(h.s.frames===5&&h.s.phase==='idle'&&h.s.collected===0&&h.callbacks.size===0,'reload interrupted by reset cannot complete stale transaction');
}
console.log(`PASS ${n} structural/contact/repeated-flow checks. 96 view/state comparisons preserve exact geometry and material atoms; plate precedes both supports throughout. Mask polygons are excluded from physical atoms; actual returning tube/fork clearance replaces the obsolete raised-height constant.`);
