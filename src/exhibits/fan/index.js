import messages from '../../locales/fan.en.json' with {type:'json'};
import {registerMessages} from '../../shared/message-language.ts';
registerMessages(messages);
import {localizeMarkup,localizeText} from '../../shared/message-language.ts';
import { Paper3D } from './paper3d.js';
import { fanTemplate } from './template.js';
import { installFanTexture } from './hand-texture.js';

/**
 * Mount the original fan mechanism into the museum's shared runtime.
 * Geometry, painter ordering and continuous-time mechanics are preserved.
 * Scene-owned input, clocks and async texture work are scoped and disposable.
 * @param {import('../../app/contracts').SceneContext} context
 */
export function mountFan({ root, scope, audio, observation }) {
 if (!root || !scope) throw new TypeError('mountFan requires root and scope');
 const doc=root.ownerDocument,win=doc.defaultView;
 let disposed=false;
 const pauseReasons=new Set();
 root.classList.add('fan-exhibit');
 root.innerHTML=localizeMarkup(fanTemplate);
 const listen=(target,type,handler,options)=>scope.listen(target,type,event=>{
  if(!disposed&&!pauseReasons.size&&!scope.paused)handler(event);
 },options);
const svg=root.querySelector('#figure'),art=root.querySelector('#art'),engine=new Paper3D();
const PALS={mustard:{l:'#f4b829',m:'#d49c1f',d:'#4e4a18'},tomato:{l:'#ef6a4c',m:'#cf5038',d:'#4a2219'},mint:{l:'#93d3b0',m:'#71b693',d:'#1f4034'},cobalt:{l:'#76a0e2',m:'#5a82c6',d:'#1c2948'},blush:{l:'#f3a6bb',m:'#d8869c',d:'#4b2430'}};
const palettes=Object.fromEntries(Object.entries(PALS).map(([key,m])=>[key,[m.l,m.m,m.d]]));
const INK='#231e16',SHADOW='#41538f';
let observationRate=1,fanObservation=null;
const initialState=()=>({on:false,speed:1,oscillate:false,color:'mint',angle:0,velocity:0,phase:0,headYaw:0,knob:0,pressed:null,pressLeft:0});
const state=initialState();
const sceneControls=doc.createElementNS('http://www.w3.org/2000/svg','g');
sceneControls.id='scene-controls';
svg.append(sceneControls);
const controlDefinitions=[
 {id:'scene-power',action:'power',label:'电源开关'},
 {id:'scene-speed-1',action:'speed',value:1,label:'一档 · 轻风'},
 {id:'scene-speed-2',action:'speed',value:2,label:'二档 · 和风'},
 {id:'scene-speed-3',action:'speed',value:3,label:'三档 · 劲风'},
 {id:'scene-oscillate',action:'oscillate',label:'左右摇头开关'}
];
const sceneTargets=controlDefinitions.map(def=>{
 const node=doc.createElementNS(svg.namespaceURI,'g');
 node.id=def.id;node.classList.add('scene-control');node.dataset.fanAction=def.action;
 if(def.value)node.dataset.value=def.value;
 node.setAttribute('role','button');node.setAttribute('tabindex','0');node.setAttribute('aria-label',localizeText(def.label));
 const hit=doc.createElementNS(svg.namespaceURI,'path');hit.classList.add('hit-area');node.append(hit);
 const title=doc.createElementNS(svg.namespaceURI,'title');title.textContent=localizeText(def.label);node.append(title);
 sceneControls.append(node);return node;
});
const sceneHint=root.querySelector('#interaction-hint');
let feedbackTimer=0,feedbackUntil=0;
const idleHint=()=>state.on?'点底座切换风速 · 拖动旋转观察':'点电源开始 · 也可先选择风速';
function showHint(text,temporary=false){scope.clearTimeout(feedbackTimer);sceneHint.textContent=localizeText(text);feedbackUntil=temporary?scope.now()+2200:0;if(temporary)feedbackTimer=scope.timeout(()=>{sceneHint.textContent=localizeText(idleHint())},2200)}
sceneTargets.forEach(node=>{
 const hint=()=>showHint(node.getAttribute('aria-label'));
 listen(node,'pointerenter',hint);listen(node,'focus',hint);
 listen(node,'click',ev=>{if(pointerClick&&node===pointerClick.target&&ev.pointerId===pointerClick.id&&ev.pointerType===pointerClick.type){pointerClick=null;scope.clearTimeout(pointerClickTimer);return;}if(ev.detail===0&&keyActivation?.target!==node)activate(node.dataset.fanAction,node.dataset.value)});
 const leave=()=>{if(!drag&&scope.now()>feedbackUntil)showHint(idleHint())};listen(node,'pointerleave',leave);listen(node,'blur',leave);
});
function ellipse(x,y,z,rx,ry,n=64){return Array.from({length:n},(_,i)=>{let a=i/n*Math.PI*2;return[x+rx*Math.cos(a),y+ry*Math.sin(a),z]})}
function bezier(a,b,c,d,n=12){return Array.from({length:n},(_,i)=>{let t=i/n,u=1-t;return[0,1].map(j=>u*u*u*a[j]+3*u*u*t*b[j]+3*u*t*t*c[j]+t*t*t*d[j])})}
let bladeShape=[...bezier([9,-2],[19,-38],[42,-82],[62,-46]),...bezier([62,-46],[86,-11],[48,9],[13,12]),...bezier([13,12],[5,12],[4,3],[9,-2])];
function render(){if(disposed)return;let e=engine,m=palettes[state.color];e.parts=[];
 const observeFrom=(from,id)=>{for(let i=from;i<e.parts.length;i++)e.parts[i].svg=`<g data-observe-part="${id}">${e.parts[i].svg}</g>`;};
 // The blade sheet separates the head into two non-intersecting halfspaces.
 // Average-depth sorting alone lets a rear motor or wire paint through a long blade.
 const headSide=(from,side)=>{for(let i=from;i<e.parts.length;i++)e.parts[i].headSide=side;};
 // Grounded, blue-ink cast shadow, derived from the silhouette rather than an image.
 e.add([[-92,-20,0],[-102,36,0],[-35,85,0],[145,135,0],[191,95,0],[42,-15,0]],SHADOW,'none',0,true,1);
 e.parts[e.parts.length-1].depth=-1e6;
 let lower=ellipse(0,0,7,64,43),upper=ellipse(0,0,17,65,44);e.mesh(lower,upper,[m[2],m[1]]);e.add(upper,m[0],INK,2.4);
 e.line(ellipse(0,0,10,64,43),INK,1.6);
 // Base rubber feet and raised switch bed.
 for(let x of [-43,43])e.mesh(ellipse(x,-19,2,8,6,20),ellipse(x,-19,7,8,6,20),['#3a4237','#444d40']);
 let bed=[[-37,-35,18],[37,-35,18],[37,-12,18],[-37,-12,18]];e.add(bed,'#c9d0bf',INK,1.3);
 const buttonFaces=[];
 for(let i=0;i<4;i++){
  const x=-27+i*18,pressed=i===0?state.on:i===state.speed,touch=state.pressed===(i===0?'power':'speed'+i),drop=(pressed?1.2:0)+(touch?.8:0);
  const bottom=[[x-7,-33,18],[x+7,-33,18],[x+7,-14,18],[x-7,-14,18]];
  const top=[[x-7,-33,22-drop],[x+7,-33,22-drop],[x+7,-14,29-drop],[x-7,-14,29-drop]];
  const fill=i===0?(state.on?'#a9bf9a':'#c87862'):(pressed?'#68896a':'#eeeadd');
  e.mesh(bottom,top,['#7b8974','#a2ad98','#7b8974','#b8c1ac']);e.add(top,fill,INK,1.3);buttonFaces.push(top);
  // Labels share the actual inclined button plane, rather than floating over the scene.
  const centre=[x,-23.5,25.65-drop],o=e.project(centre),ux=e.project([x+1,centre[1],centre[2]]),vy=e.project([x,centre[1]-1,centre[2]-7/19]);
  const matrix=[ux[0]-o[0],ux[1]-o[1],vy[0]-o[0],vy[1]-o[1],o[0],o[1]].map(n=>n.toFixed(3)).join(' ');
  e.parts.push({depth:e.depth(centre)+.02,svg:`<text transform="matrix(${matrix})" font-family="system-ui,sans-serif" font-size="${i?8.7:10}" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="${pressed&&i?'#fffbed':'#283524'}" pointer-events="none">${['⏻','一','二','三'][i]}</text>`});
 }
 // Ground-level parts remain behind the rotor in raised views.
 for(const part of e.parts)part.groundPart=true;
 // Neck, sleeve, and a knurled tilt joint.
 let postBot=ellipse(0,10,18,14,12,40),postTop=ellipse(0,31,181,8,8,40);
 const postRing=t=>ellipse(0,10+21*t,18+163*t,14-6*t,12-4*t,40);
 for(let i=0;i<7;i++)e.mesh(postRing(i/7),postRing((i+1)/7),[m[1],m[0],m[2],m[1]],false);
 e.add(postBot,m[1],INK,1);e.add(postTop,m[0],INK,1);e.line([[-7,0,25],[-5,23,177]],'#d4e3ce',1.5);
 e.mesh(ellipse(0,10,25,16,13,40),ellipse(0,10,43,15,12,40),[m[1],m[2]]);e.add(ellipse(0,10,43,15,12,40),m[0]);
 const H=205,R=84,a=state.headYaw,ca=Math.cos(a),sa=Math.sin(a);
 const trans=p=>[p[0]*ca-(p[1]-31)*sa,31+p[0]*sa+(p[1]-31)*ca,p[2]+H];
 const tr=pts=>pts.map(trans);
 // Short wire spans depth-sort locally instead of painting a whole rear ring over nearer mechanics.
 const wire=(pts,color=INK,width=1.4)=>{for(let i=0;i<pts.length-1;i+=3)e.line(pts.slice(i,i+4),color,width)};
 const ring=(r,y,n=72)=>Array.from({length:n+1},(_,i)=>{let t=i/n*Math.PI*2;return trans([r*Math.cos(t),y,r*Math.sin(t)])});
 // The rear bearing stays on the fixed neck while the cage swings around it.
 const bearingStart=e.parts.length;e.mesh(ellipse(0,31,176,10,10,32),ellipse(0,31,184,10,10,32),[m[2],m[1]]);headSide(bearingStart,1);
 // Rear motor housing, cooling vents and pivot pin.
 const motorStart=e.parts.length;
 // The motor shaft reaches the blade hub; the front grille cap is a separate fixed part.
 e.mesh(ring(3.2,-2,24),ring(3.2,6.5,24),['#8f989b','#c6ccce']);
 e.mesh(ring(24,6,40),ring(27,45,40),[m[1],m[2],m[1]]);e.add(ring(24,46),m[0],INK,2.4);
 for(let i=-3;i<=3;i++){let x=i*5;e.line(tr([[x,46.5,-12],[x,46.5,12]]),'#556c56',1.7)}
 e.mesh(ring(9,47,30),ring(9,51,30),[m[1],m[2]]);
 observeFrom(motorStart,'fan-motor');headSide(motorStart,1);
 // Oscillation pull knob.
 const swingStart=e.parts.length;
 let knobBase=ellipse(0,31,H+23,5,5,20),knobTop=ellipse(0,31,H+35-state.knob*4,5,5,20);
 e.mesh(knobBase.map(p=>trans([p[0],p[1],p[2]-H])),knobTop.map(p=>trans([p[0],p[1],p[2]-H])),['#4e5a49','#e6e5d5']);
 observeFrom(swingStart,'fan-swing');headSide(swingStart,1);
 const rearStart=e.parts.length;
 // Back grille: bowed radial wires, reinforcing concentric rings.
 for(let i=0;i<24;i++){let t=i/24*Math.PI*2;let points=[];for(let j=0;j<=10;j++){let r=27+(R-27)*j/10,y=5+18*(1-Math.pow(r/R,2));points.push(trans([r*Math.cos(t),y,r*Math.sin(t)]))}wire(points,INK,1.1)}
 for(let r of [39,61,82])wire(ring(r,5+18*(1-Math.pow(r/R,2))),INK,1.3);
 headSide(rearStart,1);
 // Broad, curved blades. Rotation is geometry, not a pre-rendered asset.
 const bladeStart=e.parts.length;
 for(let i=0;i<3;i++){let theta=state.angle+i*Math.PI*2/3,ct=Math.cos(theta),st=Math.sin(theta);let pts=bladeShape.map(([x,z])=>trans([x*ct-z*st,-3,x*st+z*ct]));e.add(pts,m[1],INK,2.4);e.parts[e.parts.length-1].headSide=0;let hilite=bladeShape.slice(0,12).map(([x,z])=>trans([x*ct-z*st,-3.2,x*st+z*ct]));const highlightStart=e.parts.length;wire(hilite,m[0],2.6);headSide(highlightStart,-1)}
 let hubStart=e.parts.length;e.mesh(ring(11,-5,32),ring(11,-3,32),[m[1],m[2]],false);e.add(ring(11,-5,32),m[1]);headSide(hubStart,-1);
 hubStart=e.parts.length;e.mesh(ring(11,-3,32),ring(11,-1,32),[m[1],m[2]],false);e.add(ring(11,-1,32),m[2]);headSide(hubStart,1);
 observeFrom(bladeStart,'fan-blades');
 // Double rolled rim; the front guard is convex, keeping the cage readable from every angle.
 let guardStart=e.parts.length;wire(ring(R,5),INK,3.6);headSide(guardStart,1);guardStart=e.parts.length;wire(ring(R,-9),INK,3.6);wire(ring(R-1,-9.5),m[0],1.5);
 for(let i=0;i<28;i++){let t=i/28*Math.PI*2;let pts=[];for(let j=0;j<=12;j++){let r=13+(R-13)*j/12,y=-9-22*(1-Math.pow(r/R,2));pts.push(trans([r*Math.cos(t),y,r*Math.sin(t)]))}wire(pts,INK,1.45)}
 for(let r of [31,51,69])wire(ring(r,-9-22*(1-Math.pow(r/R,2))),INK,1.6);
 headSide(guardStart,-1);
 // Cage clamps.
 for(let i=0;i<4;i++){
  const t=i*Math.PI/2+.3,c=Math.cos(t),s=Math.sin(t),rear=[[84*c,7,84*s],[86*c,-2,86*s]],join=[(86-2/11)*c,-3,(86-2/11)*s],front=[join,[84*c,-13,84*s]];rear.push(join);
  for(const [points,side]of [[rear,1],[front,-1]]){const start=e.parts.length;e.line(tr(points),'#e7e5d4',4);e.line(tr(points),INK,1);headSide(start,side);}
 }
 const capStart=e.parts.length;
 // Circular ceramic centre cap, fine concentric ink line.
 e.mesh(ring(15,-31,48),ring(15,-34,48),['#b9c5af','#eae8d9']);e.add(ring(12,-34.3),'#e8e7d6',INK,.8);e.line(tr([[-5,-34.5,0],[-2,-34.5,3],[2,-34.5,-2],[5,-34.5,1]]),INK,1.4);
 headSide(capStart,-1);
 // Power cord, resting on the paper.
 const cordStart=e.parts.length;
 const cord=[];for(let i=0;i<=30;i++){let t=i/30;cord.push([15+110*t,22+18*Math.sin(t*5),3])}e.line(cord,'#555c4d',3);e.add([[123,4,2],[137,7,2],[136,15,2],[122,11,2]],'#4b5345');
 for(let i=cordStart;i<e.parts.length;i++)e.parts[i].groundPart=true;
 const nearSide=-Math.cos(e.yaw-state.headYaw)>=0?1:-1;
 const headLayer=part=>part.groundPart&&e.pitch>0?-1:(part.headSide??1)*nearSide;
 e.parts.sort((a,b)=>headLayer(a)-headLayer(b)||a.depth-b.depth);
 // The ground shadow must remain behind both head halfspaces.
 const shadow=e.parts.findIndex(part=>part.depth===-1e6);if(shadow>0)e.parts.unshift(...e.parts.splice(shadow,1));
 art.innerHTML=localizeMarkup(e.parts.map(part=>part.svg).join(''));
 // Persistent projected hit areas stay aligned with the real controls at every angle.
 const eye=[Math.sin(e.yaw)*Math.cos(e.pitch),-Math.cos(e.yaw)*Math.cos(e.pitch),Math.sin(e.pitch)];
 const baseVisible=eye[2]-eye[1]*7/19>.015;
 function setTargetVisibility(node,visible){node.setAttribute('visibility',visible?'visible':'hidden');node.setAttribute('aria-hidden',!visible);node.setAttribute('tabindex',visible?'0':'-1');if(!visible&&doc.activeElement===node)svg.focus({preventScroll:true})}
 for(let i=0;i<4;i++){sceneTargets[i].firstElementChild.setAttribute('d',e.path(buttonFaces[i]));setTargetVisibility(sceneTargets[i],baseVisible)}
 const knobHeight=35-state.knob*4;
 const knobHit=[...ellipse(0,31,H+knobHeight+.8,7,7,24),...ellipse(0,31,H+23,7,7,24)].map(p=>trans([p[0],p[1],p[2]-H]));
 const projectedKnob=knobHit.map(p=>e.project(p)),xs=projectedKnob.map(p=>p[0]),ys=projectedKnob.map(p=>p[1]);
 const x0=Math.min(...xs)-2,x1=Math.max(...xs)+2,y0=Math.min(...ys)-2,y1=Math.max(...ys)+2;
 sceneTargets[4].firstElementChild.setAttribute('d',`M${x0},${y0}H${x1}V${y1}H${x0}Z`);
 // Ray-test the rear knob against the guard disc so it cannot be clicked through the fan head.
 const eyeLocal=[eye[0]*ca+eye[1]*sa,-eye[0]*sa+eye[1]*ca,eye[2]];
 const hitDistance=eyeLocal[1]<-.0001?(-9-31)/eyeLocal[1]:-1;
 const hiddenByGuard=hitDistance>0&&Math.hypot(hitDistance*eyeLocal[0],knobHeight+hitDistance*eyeLocal[2])<R+5;
 setTargetVisibility(sceneTargets[4],!hiddenByGuard);
 fanObservation?.update();
}

function sync(){
 if(disposed)return;
 root.classList.toggle('running',state.on);
 root.querySelector('#power').setAttribute('aria-pressed',state.on);
 root.querySelector('#power-label').textContent=localizeText(state.on?'关闭电源':'开启电源');
 root.querySelector('#oscillate').setAttribute('aria-pressed',state.oscillate);
 root.querySelector('#speed-label').textContent=localizeText(['','一档 · 轻风','二档 · 和风','三档 · 劲风'][state.speed]);
 const target=state.on?[0,4,8,13][state.speed]:0;let status=!state.on?(state.velocity>.05?'电源已关 · 叶片惯性停转中':'电源关闭 · 叶片已停稳'):Math.abs(state.velocity-target)>.5?(state.velocity<target?'正在加速至':'正在减速至')+['','一档','二档','三档'][state.speed]:['','轻风缓缓','和风徐徐','劲风习习'][state.speed];if(state.on&&state.oscillate)status+=' · 摇头中';const statusEl=root.querySelector('#status');if(statusEl.textContent!==status)statusEl.textContent=localizeText(status);
 root.classList.toggle('coasting',!state.on&&state.velocity>.05);
 sceneTargets.forEach(n=>n.classList.toggle('is-pressed',state.pressed===n.dataset.fanAction+(n.dataset.value||'')));
 audio?.update('fan',state);
 root.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.speed===state.speed));
 root.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.color===state.color));
 sceneTargets[0].setAttribute('aria-pressed',state.on);
 sceneTargets[0].setAttribute('aria-label',localizeText(state.on?'关闭电源':'开启电源'));
 for(let i=1;i<=3;i++)sceneTargets[i].setAttribute('aria-pressed',state.speed===i);
 sceneTargets[4].setAttribute('aria-pressed',state.oscillate);
 sceneTargets[4].setAttribute('aria-label',localizeText(state.oscillate?'关闭左右摇头':'开启左右摇头'));
}
function activate(action,value){
 if(disposed||pauseReasons.size)return;
 settleFanClock();
 state.pressed=action+(value||'');state.pressLeft=.16;
 if(action==='power'){state.on=!state.on;showHint(state.on?'电源开启，清风将至':'电源关闭，叶片慢慢停下',true)}
 else if(action==='speed'){if(state.speed===Number(value)){showHint('已经是'+['','一档轻风','二档和风','三档劲风'][state.speed]+(state.on?'':' · 点击电源开机'),true);audio?.pulse('tick');render();wakeAnimation();return;}state.speed=Number(value);showHint(['','一档轻风','二档和风','三档劲风'][state.speed]+(state.on?'':' · 开机后生效'),true)}
 else if(action==='oscillate'){state.oscillate=!state.oscillate;showHint(state.oscillate?(state.on?'左右摇头已开启':'摇头已开启 · 开机后生效'):'左右摇头已关闭',true)}
 sync();render();wakeAnimation();
}
listen(root.querySelector('#power'),'click',()=>activate('power'));
listen(root.querySelector('#oscillate'),'click',()=>activate('oscillate'));
root.querySelectorAll('[data-speed]').forEach(b=>listen(b,'click',()=>activate('speed',b.dataset.speed)));
root.querySelectorAll('[data-color]').forEach(b=>listen(b,'click',()=>{state.color=b.dataset.color;sync();render();showHint('换成'+b.getAttribute('aria-label'),true)}));
const resetView=()=>{if(disposed||pauseReasons.size)return;engine.yaw=-.4;engine.pitch=.19;render();showHint('已回到初始视角',true)};
listen(root.querySelector('#reset'),'click',resetView);
listen(svg,'dblclick',ev=>{if(!ev.target.closest('[data-fan-action]'))resetView()});
let drag=null,keyActivation=null,keyReleaseTimer=0,pointerClick=null,pointerClickTimer=0;
// Ignore only the synthetic click paired with a handled Enter/Space press.
// Releasing on the next task covers keyup's default click without a click cooldown.
const clearKeyActivation=()=>{scope.clearTimeout(keyReleaseTimer);keyActivation=null};
const releaseKeyActivation=()=>{scope.clearTimeout(keyReleaseTimer);keyReleaseTimer=scope.timeout(clearKeyActivation,0)};
listen(svg,'pointerdown',ev=>{
 if(drag||ev.isPrimary===false||(ev.button!==0&&ev.pointerType==='mouse'))return;
 const target=ev.target.closest('[data-fan-action]');
 drag={x:ev.clientX,y:ev.clientY,yaw:engine.yaw,pitch:engine.pitch,moved:false,target,pointerId:ev.pointerId,pointerType:ev.pointerType};
 svg.setPointerCapture(ev.pointerId);
 if(target){target.focus({preventScroll:true});state.pressed=target.dataset.fanAction+(target.dataset.value||'');state.pressLeft=0;sync();render();}
});
listen(svg,'pointermove',ev=>{
 if(!drag||ev.pointerId!==drag.pointerId)return;
 const dx=ev.clientX-drag.x,dy=ev.clientY-drag.y;
 if(!drag.moved&&Math.hypot(dx,dy)<5)return;
 drag.moved=true;state.pressed=null;state.pressLeft=0;sceneTargets.forEach(node=>node.classList.remove('is-pressed'));svg.classList.add('dragging');
 engine.yaw=drag.yaw+dx*.008;engine.pitch=Math.max(-.12,Math.min(.8,drag.pitch+dy*.005));render();
});
function endDrag(ev,cancelled=false){
 if(!drag||ev.pointerId!==drag.pointerId)return;
 const old=drag;drag=null;state.pressed=null;svg.classList.remove('dragging');
 // A detail-zero compatibility click must not re-activate a tap or turn a
 // canceled/dragged gesture into a tap. Independent click-only input still works.
 scope.clearTimeout(pointerClickTimer);pointerClick=old.target?{target:old.target,id:old.pointerId,type:old.pointerType}:null;pointerClickTimer=scope.timeout(()=>pointerClick=null,0);
 if(svg.hasPointerCapture(ev.pointerId))svg.releasePointerCapture(ev.pointerId);
 if(!cancelled&&!old.moved&&old.target)activate(old.target.dataset.fanAction,old.target.dataset.value);
 else if(old.moved)showHint(idleHint());
 sync();render();
}
listen(svg,'pointerup',ev=>endDrag(ev));
listen(svg,'pointercancel',ev=>endDrag(ev,true));
listen(svg,'lostpointercapture',ev=>endDrag(ev,true));
scope.listen(win,'blur',()=>{if(!disposed){clearInput();sync();render()}});
listen(svg,'keydown',ev=>{
 if(ev.altKey||ev.ctrlKey||ev.metaKey||ev.isComposing||ev.defaultPrevented)return;
 const target=ev.target.closest('[data-fan-action]');
 if(target&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();if(!ev.repeat){clearKeyActivation();keyActivation={target,key:ev.key};activate(target.dataset.fanAction,target.dataset.value)}return}
 if(ev.key==='ArrowLeft')engine.yaw-=.1;
 else if(ev.key==='ArrowRight')engine.yaw+=.1;
 else if(ev.key==='ArrowUp')engine.pitch=Math.min(.8,engine.pitch+.05);
 else if(ev.key==='ArrowDown')engine.pitch=Math.max(-.12,engine.pitch-.05);
 else if(ev.key===' '){ev.preventDefault();if(!ev.repeat)activate('power');return}
 else return;
 ev.preventDefault();render();
});
listen(svg,'keyup',ev=>{if(keyActivation?.key===ev.key)releaseKeyActivation()});
listen(svg,'focusout',()=>releaseKeyActivation());
let animationFrame=0,last=0,acc=0;
// Continuous equivalents of the original 60 Hz easing: retain its familiar
// response while integrating velocity, blade travel and driven swing over time.
const FAN_RESPONSE=-60*Math.log1p(-1.8/60),KNOB_RESPONSE=-60*Math.log1p(-15/60),STOP_SPEED=.01;
const needsAnimation=()=>state.on||state.velocity||Math.abs(state.knob-(state.oscillate?1:0))>.002||state.pressLeft>0;
function wakeAnimation(){if(!disposed&&!pauseReasons.size&&!doc.hidden&&!animationFrame&&needsAnimation()){last=scope.now();animationFrame=scope.raf(frame)}}
// Settle the old target/rate before an input between RAF callbacks changes it.
// This shares the RAF clock, so the next frame cannot count that time twice.
function settleFanClock(){if(!disposed&&!pauseReasons.size&&animationFrame&&!doc.hidden)advanceFan(scope.now())}
function advanceFan(now){
 if(!Number.isFinite(now)||now<last)return;
 const realDt=Math.max(0,Math.min((now-last)/1000,.05)),dt=realDt*observationRate;last=now;
 const target=state.on?[0,4,8,13][state.speed]:0,start=state.velocity;
 const stopTime=!state.on?(start>STOP_SPEED?Math.log(start/STOP_SPEED)/FAN_RESPONSE:0):Infinity;
 const movingDt=Math.min(dt,stopTime),response=-Math.expm1(-FAN_RESPONSE*movingDt);
 const travel=t=>target*t+(start-target)*(-Math.expm1(-FAN_RESPONSE*t))/FAN_RESPONSE;
 const distance=travel(movingDt);
 state.velocity=dt>=stopTime?0:start+(target-start)*response;
 state.angle=(state.angle+distance)%(Math.PI*2);
 const knobTarget=state.oscillate?1:0;state.knob+=(knobTarget-state.knob)*(-Math.expm1(-KNOB_RESPONSE*realDt));if(Math.abs(state.knob-knobTarget)<.002)state.knob=knobTarget;
 if(state.oscillate&&movingDt>0){
  // Swing is driven by min(1, velocity/4). Split a threshold crossing rather
  // than applying the end-of-frame speed to the entire interval.
  const end=start+(target-start)*response;
  let swingDt;
  if(start<=4&&end<=4)swingDt=distance/4;
  else if(start>=4&&end>=4)swingDt=movingDt;
  else{
   const crossing=-Math.log((4-target)/(start-target))/FAN_RESPONSE;
   const before=travel(crossing);
   swingDt=start<4?before/4+movingDt-crossing:crossing+(distance-before)/4;
  }
  state.phase+=.48*swingDt;state.headYaw=Math.sin(state.phase)*.65;
 }
 if(state.pressLeft>0){state.pressLeft=Math.max(0,state.pressLeft-realDt);if(!state.pressLeft)state.pressed=null}
 acc+=realDt;
}
function frame(now){
 animationFrame=0;if(disposed||pauseReasons.size||doc.hidden)return;advanceFan(now);
 if(acc>=1/30||!state.velocity){sync();render();acc%=1/30}
 // Let an idle scene sleep instead of keeping an unnecessary animation loop alive.
 if(needsAnimation())animationFrame=scope.raf(frame);
}
scope.listen(doc,'visibilitychange',()=>doc.hidden?pause('visibility'):resume('visibility'));
scope.listen(win,'pagehide',()=>pause('pagehide'));
scope.listen(win,'pageshow',()=>resume('pagehide'));
sync();render();
const detachAudio=audio?.attach?.('fan',root.querySelector('.fan-controls'));
showHint(idleHint());sync();

/* A single, opt-in explanation reads the same state that drives the drawing. */
function readFanObservation(){
 const target=state.on?[0,4,8,13][state.speed]:0,moving=state.velocity>.01;
 const changing=Math.abs(target-state.velocity)>.08;
 const swing=state.oscillate&&moving;
 let stage=!moving&&!state.on?'停稳':!state.on?'惯性停转':changing?(state.velocity<target?'加速':'减速'):'稳定送风';
 let text=!moving&&!state.on?'电源断开，叶片已停稳。先选风档，再开机，观察转速逐渐追上目标。':!state.on?'电机不再驱动，但叶片不会立刻停下；余速逐渐减小。'+(swing?' 摇头也随传动慢下来。':''):changing?'风档改变的是目标转速；电机带动叶片逐渐加速或减速，不会瞬间跳档。':'电机带动叶片保持转动，弯曲的叶片推动空气。';
 if(state.on)text+=swing?' 摇头机构借用同一传动，让机头往复偏转。':' 摇头关闭时，机头停在当前方向，叶片仍可独立转动。';
 const active=moving?['fan-blades',...(state.on?['fan-motor']:[]),...(swing?['fan-swing']:[])]:[];
 return {stage,text,active,readouts:[
  {label:'叶片模型转速',value:(state.velocity/(Math.PI*2)).toFixed(2)+' 转/秒'},
  {label:'目标模型转速',value:(target/(Math.PI*2)).toFixed(2)+' 转/秒'},
  {label:'机头偏转',value:Math.round(state.headYaw*180/Math.PI)+'°'+(swing?' · 往复':' · 保持')},
  {label:'当前部件',value:!moving?'无 · 已停稳':swing?(state.on?'电机 → 叶片 → 摇头机构':'叶片 → 摇头机构 · 惯性'):state.on?'电机 → 叶片':'叶片 · 惯性转动'}
 ]};
}
fanObservation=observation?.mount({host:root.querySelector('.dock-extras'),scope:svg,state,read:readFanObservation,title:'看原理',intro:'对比风档、惯性停转与摇头。读数来自模型当前运动，不是风档的预设值；慢放只改变演示速度。',slow:true,onRate:rate=>{if(disposed)return;settleFanClock();observationRate=rate;audio?.setRate?.(rate);},onChange:()=>render()});
// No lesson sequence is imposed on a freely running fan: choose a comparison,
// then read the actual velocity and head movement produced by existing actions.
function readFanLesson(){
 const observed=readFanObservation(),target=state.on?[0,4,8,13][state.speed]:0;
 const coasting=!state.on&&state.velocity>.01,swing=state.oscillate&&state.velocity>.01;
 return {index:coasting?2:swing?1:0,title:observed.stage,text:observed.text+` 当前 ${(state.velocity/(Math.PI*2)).toFixed(2)} 转/秒，目标 ${(target/(Math.PI*2)).toFixed(2)} 转/秒。`,look:coasting?'电源已断，叶片仍转；观察它逐渐停稳。'+(swing?'摇头也会随余速减小而停止。':'机头保持当前朝向。'):swing?'机头左右偏转，叶片继续转；关摇头会保留当前朝向。':'看叶片逐渐追上目标，再换档比较；电机和摇头机构需转到侧后方观察。',label:state.on?'断电 · 比较惯性停转':'开机 · 看转速追上目标',choices:[...['一','二','三'].map((name,i)=>({id:'speed-'+(i+1),label:name+'档'+(state.speed===i+1?' · 已选':''),disabled:state.speed===i+1,hint:state.on?'只改变目标转速，不瞬间改变叶片速度':'预选风档，开机后生效'})),{id:'oscillate',label:state.oscillate?'关摇头 · 保持朝向':'开摇头 · 比较覆盖方向',hint:'只切换原有摇头开关，不改变风档'}]};
}
const fanLesson=observation?.mountLesson?.({ui:{observation:fanObservation},id:'fan',title:'对照观察 · 转速、摇头与惯性',linear:false,route:['转速','摇头','惯性'],read:readFanLesson,onAdvance:()=>activate('power'),onChoice:id=>{if(id==='oscillate')activate('oscillate');else if(/^speed-[123]$/.test(id))activate('speed',id.slice(6));},onToggle:on=>{if(!on)fanObservation?.reset();},exitLabel:'退出对照 · 保留当前风档与运动',note:'可随时换档、断电或切换摇头，没有固定顺序。数值是模型转速，不是实物性能；退出不关机。'});
listen(root,'keydown',event=>{if(event.key==='Escape'&&fanLesson?.panel.open){event.preventDefault();fanLesson.close();}});
render();

 const texture=installFanTexture({root,scope});
 function clearInput(){
  clearKeyActivation();
  scope.clearTimeout(pointerClickTimer);pointerClickTimer=0;pointerClick=null;
  if(drag){const id=drag.pointerId;drag=null;if(svg.hasPointerCapture?.(id))svg.releasePointerCapture(id);}
  state.pressed=null;state.pressLeft=0;svg.classList.remove('dragging');
  sceneTargets.forEach(node=>node.classList.remove('is-pressed'));
 }
 function pause(reason='external'){
  if(disposed||pauseReasons.has(reason))return;
  pauseReasons.add(reason);
  if(pauseReasons.size>1)return;
  scope.cancelRaf(animationFrame);animationFrame=0;
  scope.clearTimeout(feedbackTimer);feedbackTimer=0;feedbackUntil=0;
  clearInput();last=scope.now();acc=0;
  audio?.suspend?.(reason);
  fanObservation?.reset?.();
  scope.pause();
 }
 function resume(reason='external'){
  if(disposed)return;
  if(!pauseReasons.delete(reason)||pauseReasons.size)return;
  scope.resume();last=scope.now();acc=0;
  sync();render();showHint(idleHint());wakeAnimation();
 }
 function reset(){
  if(disposed)return;
  scope.cancelRaf(animationFrame);animationFrame=0;
  scope.clearTimeout(feedbackTimer);feedbackTimer=0;feedbackUntil=0;
  clearInput();Object.assign(state,initialState());
  engine.yaw=-.4;engine.pitch=.19;
  last=scope.now();acc=0;observationRate=1;
  fanObservation?.reset?.();audio?.reset?.();audio?.setRate?.(1);
  sync();render();showHint(idleHint());
 }
 function dispose(){
  if(disposed)return;
  disposed=true;
  scope.cancelRaf(animationFrame);animationFrame=0;
  scope.clearTimeout(feedbackTimer);feedbackTimer=0;
  clearInput();
  const errors=[];
  for(const cleanup of [()=>fanObservation?.dispose?.(),()=>detachAudio?.(),()=>texture.dispose(),()=>scope.dispose()]){
   try{cleanup()}catch(error){errors.push(error)}
  }
  root.classList.remove('fan-exhibit','running','coasting');
  root.replaceChildren();
  if(errors.length)throw new AggregateError(errors,'Fan exhibit cleanup failed');
 }
 const controller=Object.freeze({
  pause,resume,reset,dispose,
  snapshot(){return {...state,view:{yaw:engine.yaw,pitch:engine.pitch,scale:engine.scale,origin:[...engine.origin]},observationRate,paused:pauseReasons.size>0,pauseReasons:[...pauseReasons],disposed,animationPending:!!animationFrame};}
 });
 scope.onCleanup(dispose);
 if(doc.hidden)pause('visibility');
 return controller;
}

export default mountFan;
