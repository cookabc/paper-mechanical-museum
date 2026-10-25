(() => {
 window.SCENES = window.SCENES || {};
 window.SCENES.musicbox = () => {
  const initial=()=>({angle:0,speed:0,energy:0,lid:1,lidTarget:1,crankHeld:false,travel:0,notes:0,direction:1,lastTooth:-1,message:'握住侧面的手柄转一圈，也可以轻点手柄。'});
  const state=initial(); let run=0,driving=false,voices=new Set(),grab=null;
  const brass=matOf('#d9b76b'), walnut=matOf('#b68157');
  const audio=()=>window.MechanicalAudio;
  const TAU=Math.PI*2,CONTACT=Math.atan2(19.75-25,32.5-27),CONTACT_HALF=.11;
  // Each physical pin belongs to the tooth directly below its x coordinate.
  // Geometry, tooth deflection and audio all use this same contact phase.
  const teeth=Array.from({length:12},(_,i)=>({x:20+i*2.15,midi:72+i}));
  const pins=teeth.flatMap((tooth,i)=>Array.from({length:3},(_,j)=>({tooth:i,x:tooth.x,offset:j*TAU/3+i*.79})));
  const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const observe=(id,svg)=>`<g data-observe-part="${id}">${svg}</g>`;
  function contact(s,i){let nearest=Math.PI;for(const pin of pins)if(pin.tooth===i){const d=wrap(s.angle+pin.offset-CONTACT);if(Math.abs(d)<Math.abs(nearest))nearest=d;}return nearest;}
  function observation(s){const touching=teeth.findIndex((_,i)=>Math.abs(contact(s,i))<CONTACT_HALF),moving=s.crankHeld||s.energy>0;
   const stage=touching>=0?(moving?'凸针拨梳':'停在接触处'):moving?'摇柄传动':'等待摇动';
   const text=touching>=0?(moving?`第 ${touching+1} 根梳齿被对应凸针微微顶起；凸针越过接触区后释放梳齿，记一次拨响。`:`凸针停在第 ${touching+1} 根梳齿旁；继续摇动、越过接触区后才会再拨响。`):moving?'摇柄与滚筒同轴转动；每根凸针只拨动与它对齐的梳齿，反向摇动也按实际经过顺序拨响。':'摇动侧柄，观察凸针靠近音梳；没有越过接触区就不会增加拨响次数。';
   return {stage,text,active:touching>=0?['music-drum',`music-tooth-${touching}`]:moving?['music-crank','music-drive','music-drum']:['music-crank'],readouts:[{label:'滚筒角度',value:`${Math.round(((s.angle%TAU)+TAU)%TAU*180/Math.PI)}°`},{label:'拨响次数',value:String(s.notes)},{label:'转动',value:s.crankHeld?'跟随手势':s.energy>0?'松手余转':'已停止'}]};}

  // Keep short release tails inside the voice budget until onended disconnects them.
  function releaseVoice(v){if(v.releasing)return;v.releasing=true;const t=v.ctx.currentTime,p=v.g.gain,elapsed=Math.max(0,t-v.started),level=elapsed<v.attack?.0001*Math.pow(v.peak/.0001,elapsed/v.attack):v.peak*Math.pow(.0001/v.peak,Math.min(1,(elapsed-v.attack)/(v.decay-v.attack)));try{if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(t);else{p.cancelScheduledValues?.(t);p.setValueAtTime(Math.max(.0001,level),t);}p.exponentialRampToValueAtTime(.0001,t+.01);v.o.stop(t+.012);}catch{try{v.o.stop()}catch{}}}
  function silence(){for(const v of voices)releaseVoice(v);}
  function note(s,n){const bus=audio(),ctx=bus?.getContext?.()||bus?.context,output=bus?.getOutput?.()||bus?.output;if(!bus?.enabled||!ctx||!output||ctx.state!=='running'||document.hidden)return;if(voices.size>=8){releaseVoice(voices.values().next().value);return;}const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=440*Math.pow(2,(n-69)/12);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.10*(.38+.62*s.lid),t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+.65);o.connect(g);g.connect(output);o.start();o.stop(t+.7);const v={o,g,ctx,started:t,peak:.10*(.38+.62*s.lid),attack:.008,decay:.65,releasing:false};voices.add(v);o.onended=()=>{voices.delete(v);try{o.disconnect();g.disconnect()}catch{}};}
  function advance(s,amount){if(!Number.isFinite(amount)||!amount)return;const before=s.angle,after=before+amount,dir=Math.sign(amount),events=[];s.direction=dir;
   for(const pin of pins){const base=CONTACT+dir*CONTACT_HALF-pin.offset;
    if(dir>0){for(let k=Math.floor((before-base)/TAU)+1;k<=Math.floor((after-base)/TAU);k++)events.push({at:base+k*TAU,tooth:pin.tooth});}
    else{for(let k=Math.ceil((before-base)/TAU)-1;k>=Math.ceil((after-base)/TAU);k--)events.push({at:base+k*TAU,tooth:pin.tooth});}
   }
   s.angle=after;s.travel+=Math.abs(amount);events.sort((a,b)=>(a.at-b.at)*dir);
   for(const event of events){s.notes++;s.lastTooth=event.tooth;note(s,teeth[event.tooth].midi);}
  }
  function drive(s,ui){if(driving)return;driving=true;const token=run;ui.animate(dt=>{if(token!==run)return false;let active=false;
   if(Math.abs(s.lid-s.lidTarget)>.001){s.lid+=Math.sign(s.lidTarget-s.lid)*Math.min(Math.abs(s.lidTarget-s.lid),dt*1.7);active=true;}
   if(!s.crankHeld&&s.energy>0){s.energy=Math.max(0,s.energy-dt);s.speed*=Math.exp(-dt*(s.energy>.25?2.1:9));advance(s,s.speed*dt);active=s.energy>0||active;}else if(!s.crankHeld)s.speed=0;
   if(!active){driving=false;if(!s.crankHeld)s.message=s.lidTarget<.5?'盒盖已合上。仍可摇柄，声音会更轻一些。':s.notes?'手柄缓缓停住了，再摇一下继续旋律。':'握住侧面的手柄转一圈，也可以轻点手柄。';}return active;});}
  function crank(s,ui){if(s.crankHeld)return;s.energy=Math.min(.9,s.energy+.55);s.speed=Math.min(10,Math.max(5,s.speed+2));s.message='手柄带动滚筒，凸针依次拨响钢片。';advance(s,.12);drive(s,ui);ui.invalidate();}
  function lid(s,ui){s.lidTarget=s.lidTarget>.5?0:1;s.message=s.lidTarget?'盒盖正在打开，看看滚筒和音梳。':'盒盖正在合上，旋律仍可继续。';audio()?.pulse?.('latch');drive(s,ui);ui.invalidate();}
  function release(s,ui,cancel=false){if(!grab)return;const old=grab;grab=null;s.crankHeld=false;if(cancel){s.energy=0;s.speed=0;silence();s.message='已松开手柄，转动已停止。';}else if(!old.moved)crank(s,ui);else{s.energy=.22;s.message='松开手柄，齿轮正缓缓停住。';drive(s,ui);}try{if(old.svg.hasPointerCapture(old.id))old.svg.releasePointerCapture(old.id)}catch{}ui.invalidate();}
  function reset(s,ui){release(s,ui,true);run++;driving=false;silence();Object.assign(s,initial());ui.invalidate();}
  // Invert the projected crank plane, so the handle follows a real circular/elliptical drag.
  function pointerAngle(svg,e){try{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse()),c=P(72,27,25),y=P(72,38,25),z=P(72,27,36),a=y[0]-c[0],b=z[0]-c[0],d=y[1]-c[1],f=z[1]-c[1],det=a*f-b*d;if(Math.abs(det)<4)return null;const x=q.x-c[0],v=q.y-c[1];return Math.atan2((a*v-d*x)/det,(x*f-b*v)/det);}catch{return null;}}
  function scene(s,m){const parts=[],add=(at,svg,key)=>parts.push({at,svg,key});const tilt=s.lid*1.7,pt=(x,y,z)=>[3+(x-3)*Math.cos(tilt)-z*Math.sin(tilt),y,34+(x-3)*Math.sin(tilt)+z*Math.cos(tilt)],A=[[3,3,0],[65,3,0],[65,57,0],[3,57,0]].map(q=>pt(...q)),B=[[3,3,3],[65,3,3],[65,57,3],[3,57,3]].map(q=>pt(...q));let out=castShadow([[3,3,0],[65,3,0],[65,57,0],[3,57,0],[3,3,34],[65,3,34],[65,57,34],[3,57,34],...A,...B]);
   for(const x of[11,57])for(const y of[10,49])out+=cyl(x,y,0,6,3,DARK,toneI,.65)+cyl(x,y,5,7,3.4,brass,toneI,.5);
   out+=box(3,3,6,65,57,10,walnut,tone,1.1)+box(5,5,10,63,55,12,CERAMIC,tone,.6);
   // The rim clears the drum pins and gears (highest point z=33), even with the lid fully shut.
   add([5,30,22],box(3,3,10,7,57,33,walnut,tone,1));add([34,5,22],box(7,3,10,61,7,33,walnut,tone,1));add([34,55,22],box(7,53,10,61,57,33,walnut,tone,1));add([63,30,22],box(61,3,10,65,57,33,walnut,tone,1));
   for(const y of[3,54])add([34,y,33],box(3,y,32,65,y+3,34,m,tone,.6));for(const x of[3,62])add([x,30,33],box(x,3,32,x+3,57,34,m,tone,.6));
   // The flat mounting plate is below every raised mechanism part.
   // Draw it before those parts so its distant center cannot cover a bearing foot.
   out+=box(11,12,12,57,48,14,brass,toneI,.6);
   for(const x of[14,54])for(const y of[15,45])add([x,y,14.3],cyl(x,y,14,14.5,1.1,METAL,toneI,.3)+line([[x-.7,y,14.6],[x+.7,y,14.6]],.25));
   for(const x of[18,47])add([x,27,19],box(x-2,20,14,x+2,33,18,DARK,toneI,.5)+box(x-1,23,18,x+1,30,29,brass,toneI,.5));
   let roller=cylX(18,47,27,25,6.6,brass,toneI,.8);const visiblePins=[];
   for(const pin of pins){const a=s.angle+pin.offset,yy=27+Math.cos(a)*6.8,zz=25+Math.sin(a)*6.8;if(vis([0,Math.cos(a),Math.sin(a)]))visiblePins.push({at:[pin.x,yy,zz],svg:rod([pin.x,yy,zz],[pin.x,27+Math.cos(a)*7.6,25+Math.sin(a)*7.6],.35,METAL,toneI,.25,undefined,8)});}
   roller+=byDepth(visiblePins);add([32,27,25],observe('music-drum',roller));
   let comb=box(18,40,14,47,46,20,METAL,toneI,.5);for(let i=0;i<teeth.length;i++){const x=teeth[i].x-.55,d=contact(s,i),v=Math.abs(d)<CONTACT_HALF?.35*Math.cos(d/CONTACT_HALF*Math.PI/2):0;
    const A=[[x,32.5,19+v],[x+1.1,32.5,19+v],[x+1.1,32.5,20+v],[x,32.5,20+v]],B=[[x,42,19],[x+1.1,42,19],[x+1.1,42,20],[x,42,20]];
    comb+=observe(`music-tooth-${i}`,loft(A,B,n=>toneI(n,METAL))+(vis([0,-1,0])?shape(A,toneI([0,-1,0],METAL),.25):'')+line([[x,32.5,20+v],[x+1.1,32.5,20+v],[x+1.1,42,20]],.25));
   }add([32,39,19],observe('music-comb',comb));
   // The drum and crank share one continuous axle; both meshing gears share its axial plane.
   add([56,27,25],observe('music-drive',cylX(47,65,27,25,1.3,METAL,toneI,.35)));
   for(const [x,y,z,r,dir] of[[49,27,25,7,1],[49,38,20,5,-1.4]]){let teeth='',spokes='';const count=r===7?14:10,faceX=vis([1,0,0])?x+1.9:x-.1;for(let i=0;i<count;i++){const a=i*Math.PI*2/count+s.angle*dir;teeth+=rod([x+.9,y+Math.cos(a)*(r-.4),z+Math.sin(a)*(r-.4)],[x+.9,y+Math.cos(a)*(r+1),z+Math.sin(a)*(r+1)],.6,brass,toneI,.25);if(i%2===0)spokes+=line([[faceX,y,z],[faceX,y+Math.cos(a)*(r-1),z+Math.sin(a)*(r-1)]],.3);}const wheel=cylX(x,x+1.8,y,z,r,brass,toneI,.4);add([x+.9,y,z],observe('music-drive',teeth+wheel+spokes+(vis([1,0,0])?cylX(x+2,x+2.8,y,z,1,METAL,toneI,.3):'')));}
   const a=s.angle,handle=[72,27+Math.cos(a)*11,25+Math.sin(a)*11];add([69,27,25],act('crank',(vis([1,0,0])?fill(pd(on(PX(76),ellUV(27,25,15,15,32))),'transparent','pointer-events="all"'):'')+observe('music-crank',cylX(64,69,27,25,3,brass)+rod([68,27,25],[72,27,25],1.2,METAL)+rod([72,27,25],handle,1.1,METAL)+cylX(s.crankHeld?70.4:71,s.crankHeld?79.4:80,handle[1],handle[2],2.5,s.crankHeld?brass:DARK)),'role="button" tabindex="0" aria-label="摇动八音盒手柄"'),'crank');
   // Hinged lid is a genuine six-face slab, not a flat panel.
   const topNormal=[-Math.sin(tilt),0,Math.cos(tilt)],inside=vis(topNormal.map(v=>-v));let lidSvg=loft(A,B,n=>tone(n,m))+(vis(topNormal)?shape(B,tone(topNormal,m),.9):'')+(inside?shape(A,walnut.l,.6):'');const inset=[[10,9,-.15],[59,9,-.15],[59,51,-.15],[10,51,-.15]].map(q=>pt(...q));if(inside)lidSvg+=shape(inset,CERAMIC.l,.5);for(let j=0;j<3&&inside;j++)lidSvg+=line([[16+j*3,16+j*3,-.2],[51-j*3,16+j*3,-.2],[51-j*3,44-j*3,-.2]].map(q=>pt(...q)),.25);
   add(avg(A.concat(B)),act('lid',observe('music-lid',lidSvg),'role="button" tabindex="0" aria-label="打开或合上盒盖"'),'lid');for(const y of[13,46])add([3,y,34],rod([3,y-3,34],[3,y+3,34],1.6,brass));
   if(vis([1,0,0]))add([65.2,30,17],shape(on(PX(65.2),rrUV(15,12,43,20,1.5)),brass.l,.5)+tx(65.4,29,14.5,'手摇八音盒',2.7)+box(65,26,30,66,32,34,brass,toneI,.4),'frontdetail');
   if(vis([0,1,0]))for(let i=0;i<3;i++)add([32,57.1,13+i*2],line([[12,57.1,13+i*2],[54,57.1,13+i*2]],.2),'sidedetail');
   // A closed lid is an occluder across the whole compartment: its center
   // cannot determine painter order relative to individual mechanism parts.
   const rank=p=>{if(p.key==='crank')return vis([1,0,0])?2001:s.lid<.4?-2001:depthOf(p.at);if(p.key==='frontdetail'||p.key==='sidedetail')return 1000;if(s.lid<.4&&p.key==='lid')return 2000;return depthOf(p.at);};
   return out+parts.sort((a,b)=>rank(a)-rank(b)).map(p=>p.svg).join('');
  }
  const cfg={title:'手摇八音盒',hint:'握住摇柄转动 · 轻点也能演奏',size:[84,60,98],state,scene,credit:false,observation:{title:'看动作懂原理',intro:'简化示意：接触时序为近似，凸针、梳齿与合成音共用相位，并非精确碰撞模拟。松手余转可慢看；手摇始终跟随手势。',slow:true,read:observation},help:'握住侧面的摇柄，沿它的圆形轨迹拖动，手柄会跟着手指转。轻点手柄或「摇动手柄」可摇一小段；拖动空白处只旋转视角。按 Esc 可松开手柄。',idea:'凸针依次拨动音梳，手柄转得越快，旋律越轻快。合上盒盖后音色更轻。',readout:s=>`${s.message} · 已拨响 ${s.notes} 个音符`,buttons:[{label:'摇动手柄',text:s=>s.crankHeld?'松开可让手柄停下':s.energy>0?'再摇一下':'摇动手柄',onClick:crank},{label:'开合盒盖',text:s=>s.lidTarget>.5?'合上盒盖':'打开盒盖',onClick:lid},{label:'重新开始',onClick:reset}],acts:{crank:(s,e,ui)=>crank(s,ui),lid:(s,e,ui)=>lid(s,ui)},actionState:(s,key)=>key==='crank'?{label:'摇动手柄',hint:'沿圆周拖动，或轻点摇一小段',active:s.crankHeld||s.energy>0}:key==='lid'?{label:s.lidTarget>.5?'合上盒盖':'打开盒盖',busy:Math.abs(s.lid-s.lidTarget)>.01}:null,setup(ui){const svg=document.getElementById('fig');
   svg.addEventListener('pointerdown',e=>{if(e.button||e.isPrimary===false)return;if(grab){e.stopImmediatePropagation();e.preventDefault();return;}if(!e.target.closest('[data-act="crank"]'))return;e.stopImmediatePropagation();e.preventDefault();grab={id:e.pointerId,x:e.clientX,y:e.clientY,angle:pointerAngle(svg,e),time:e.timeStamp,moved:false,svg};state.crankHeld=true;state.energy=0;state.speed=0;state.message='手柄已握住，顺着圆周拖动；松开即可停下。';try{svg.setPointerCapture(e.pointerId)}catch{}ui.invalidate();},true);
   svg.addEventListener('pointermove',e=>{if(!grab||grab.id!==e.pointerId)return;e.stopImmediatePropagation();e.preventDefault();const d=Math.hypot(e.clientX-grab.x,e.clientY-grab.y);if(d<2)return;const a=pointerAngle(svg,e);let delta=a!==null&&grab.angle!==null?Math.atan2(Math.sin(a-grab.angle),Math.cos(a-grab.angle)):(e.clientX-grab.x-(e.clientY-grab.y))/45;if(a===null||grab.angle===null)delta=Math.max(-.75,Math.min(.75,delta));if(Math.abs(delta)<.003)return;grab.moved=true;const dt=Math.max(.016,(e.timeStamp-grab.time)/1000);state.speed=Math.max(-12,Math.min(12,delta/dt));advance(state,delta);state.message='摇柄正跟着手转动，越快摇，音符越紧凑。';grab.x=e.clientX;grab.y=e.clientY;grab.angle=a;grab.time=e.timeStamp;ui.invalidate();},true);
   for(const event of['pointerup','pointercancel'])svg.addEventListener(event,e=>{if(!grab||grab.id!==e.pointerId)return;e.stopImmediatePropagation();release(state,ui,event==='pointercancel');},true);
   svg.addEventListener('lostpointercapture',e=>{if(grab?.id===e.pointerId)release(state,ui,true)});
   const halt=()=>{release(state,ui,true);state.energy=0;state.speed=0;silence();};window.addEventListener('blur',()=>release(state,ui,true));window.addEventListener('keydown',e=>{if(e.key==='Escape')release(state,ui,true)});
   document.addEventListener('visibilitychange',()=>{if(document.hidden)halt();else ui.invalidate();});window.addEventListener('pagehide',()=>{halt();run++;driving=false;});window.addEventListener('pageshow',()=>{if(Math.abs(state.lid-state.lidTarget)>.001)drive(state,ui);ui.invalidate();});audio()?.onChange?.(event=>{if(!event.enabled||event.reason==='reset')silence();});}};
  return cfg;
 };
})();
