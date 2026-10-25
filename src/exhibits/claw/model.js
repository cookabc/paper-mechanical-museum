import {scopedDocument} from '../../app/scoped-dom';
/** Original claw geometry, mechanisms, control policy and optional explanation. */
export function createClawModel(geometry,environment){
const {root,scope,audio,observation}=environment;
const document=environment.document||scopedDocument(root,scope),window=environment.window||{MechanicalAudio:audio,MuseumObservation:observation};
let disposed=false;
const listen=(target,type,handler,options)=>scope.listen(target===document?root.ownerDocument:target,type,event=>{if(!disposed&&!scope.paused)handler(event)},options);
const addEventListener=(...args)=>listen(root.ownerDocument.defaultView,...args);
const bind=(target,key,callback)=>{scope.bindProperty(target,key,(...args)=>{if(!disposed)return callback(...args)});return callback;};
const setTimeout=geometry.timeout,clearTimeout=geometry.clearTimeout;
/* Real volumetric geometry using the same ink, light and orthographic camera as the washer. */
const W=66,D=72,H=119,REST=87,GRIP=70.3,FLOOR_BODY=42.3;
let clawObservation=null;
let meshClip=null;
function clipMesh(q){if(!meshClip)return q;const [axis,limit]=meshClip,out=[];for(let i=0;i<q.length;i++){const a=q[i],b=q[(i+1)%q.length],ia=a[axis]>=limit,ib=b[axis]>=limit;if(ia)out.push(a);if(ia!==ib){const t=(limit-a[axis])/(b[axis]-a[axis]);out.push(a.map((v,j)=>v+(b[j]-v)*t));}}return out;}
function ball(x,y,z,rx,ry,rz,m){
 const pts=[],fs=[],clippedPts=[];const n=16,k=8;
 for(let j=0;j<=k;j++){const a=-Math.PI/2+Math.PI*j/k;let ring=[];for(let i=0;i<n;i++){let t=i/n*Math.PI*2;ring.push([x+rx*Math.cos(a)*Math.cos(t),y+ry*Math.cos(a)*Math.sin(t),z+rz*Math.sin(a)]);}pts.push(ring)}
 for(let j=0;j<k;j++)for(let i=0;i<n;i++){let q=[pts[j][i],pts[j][(i+1)%n],pts[j+1][(i+1)%n],pts[j+1][i]],at=geometry.avg(q),nr=geometry.norm([(at[0]-x)/rx**2,(at[1]-y)/ry**2,(at[2]-z)/rz**2]);if(geometry.vis(nr)){q=clipMesh(q);if(q.length>2){clippedPts.push(...q);fs.push({at,svg:geometry.face(geometry.pd(q),geometry.toneI(nr,m))})}}}
 return geometry.byDepth(fs)+(meshClip?(clippedPts.length?geometry.hullInk(clippedPts,1.4):''):geometry.hullInk(pts.flat(),1.4));
}
const toys=[{name:'桃桃熊',x:42,y:57,c:'#e7a4a2',kind:0},{name:'奶油兔',x:18,y:51,c:'#e4d6b6',kind:1},{name:'薄荷猫',x:43,y:15,c:'#99c1aa',kind:2},{name:'蓝莓熊',x:18,y:19,c:'#8da7cd',kind:0}];
function plush(t,x=t.x,y=t.y,z=FLOOR_BODY,lying=false){const m=geometry.matOf(t.c),parts=[];const b=(a,b,c,rx,ry,rz,mat=m)=>{const at=lying?[x-c,y+b,z+a]:[x+a,y+b,z+c];parts.push({at,svg:ball(...at,lying?rz:rx,ry,lying?rx:rz,mat)})};
 b(0,0,0,6.4,6.5,8); b(0,-4,-6,4,3.5,3.3); b(0,4,-6,4,3.5,3.3); b(0,-6,1,3,3,5);b(0,6,1,3,3,5);b(0,0,10,7.5,7.7,7);
 b(-.5,-5,16,3,2.7,t.kind===1?7:3.1);b(-.5,5,16,3,2.7,t.kind===1?7:3.1);
 b(6.3,0,9,2.5,3.7,2.6,geometry.CERAMIC);b(8.6,0,10,1,1.1,.8,geometry.DARK);b(6.1,-3.7,12,1,1,1.1,geometry.DARK);b(6.1,3.7,12,1,1,1.1,geometry.DARK);
 return geometry.byDepth(parts);}
// Keep keyboard aim targets out of the tab order when the opaque roof hides the whole toy.
function roofHides(p){let near=0,far=Infinity;for(let j=0;j<3;j++){const lo=[-3,-3,109][j],hi=[69,75,118][j],v=geometry.CV[j];if(Math.abs(v)<1e-8){if(p[j]<lo||p[j]>hi)return false;continue;}let a=(lo-p[j])/v,b=(hi-p[j])/v;if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(far<near)return false;}return far>0&&far>=near;}
function toyCanBeSeen(t){return [[t.x,t.y,FLOOR_BODY+10],[t.x+8.6,t.y,FLOOR_BODY+10],[t.x,t.y-7.7,FLOOR_BODY+10],[t.x,t.y+7.7,FLOOR_BODY+10],[t.x,t.y-5,FLOOR_BODY+(t.kind===1?23:19)],[t.x,t.y+5,FLOOR_BODY+(t.kind===1?23:19)]].some(p=>!roofHides(p));}
// Exterior controls/tray may peek past the case, but not through its opaque base.
const outletExterior=svg=>geometry.CV[0]>=-1e-6?svg:`<g clip-path="url(#claw-outlet-mask)">${svg}</g>`;
function outletPointHidden(p){let near=0,far=Infinity;for(let j=0;j<3;j++){const lo=[0,0,6][j],hi=[W,D,35][j],v=geometry.CV[j];if(Math.abs(v)<1e-8){if(p[j]<lo||p[j]>hi)return false;continue;}let a=(lo-p[j])/v,b=(hi-p[j])/v;if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(far<near)return false;}return far>0&&far>=near;}
function prizeCanBeSeen(){return [[87,37,18],[77,37,18],[71,32,17.5],[71,42,17.5],[93,33,18],[93,41,18],[78,37,27]].some(p=>!outletPointHidden(p));}
function exteriorControlVisible(x,y,z,r,rz=r){return [[x,y,z],[x+r,y,z],[x-r,y,z],[x,y+r,z],[x,y-r,z],[x,y,z+rz]].some(p=>!outletPointHidden(p)&&!roofHides(p));}
function movedPlush(i,x,y,z){let t=toys[i],key='toy'+i+'@'+cacheKey;if(!toyCache.has(key))toyCache.set(key,plush(t));let a=geometry.P(t.x,t.y,FLOOR_BODY),b=geometry.P(x,y,z);return `<g transform="translate(${geometry.f(b[0]-a[0])} ${geometry.f(b[1]-a[1])})">${toyCache.get(key)}</g>`;}
const initialState=()=>({x:45,y:19,z:REST,open:1,phase:'idle',timer:0,got:null,won:[],stock:toys.map((_,i)=>i),tries:0,target:null,aiming:false,moving:false,result:null,message:'点选娃娃瞄准，方向键微调；拖动画面旋转观察。'});
const st=initialState();
let cacheKey='',fixed=[];
function scene(s,m){
 let cam=[geometry.YAW,geometry.PITCH,s.pal].join(',');if(cam!==cacheKey){cacheKey=cam;fixed=[];toyCache.clear();const add=(key,at,svg)=>fixed.push({key,at,svg});
 const bx=(key,a,b,mat=m)=>add(key,geometry.avg([a,b]),`<g data-solid="true">${geometry.box(...a,...b,mat,geometry.tone,1.1)}</g>`);
 add('shadow',[0,0,-10],geometry.castShadow([[0,0,4],[W,0,4],[W,D,4],[0,D,4],[0,0,H],[W,0,H],[W,D,H],[0,D,H]]));
 for(const x of[7,59])for(const y of[7,65])add('foot'+x+y,[x,y,3],geometry.cyl(x,y,0,7,3.3,geometry.DARK));
 bx('bottom',[0,0,6],[W,D,9]);bx('backwall',[0,0,9],[3,D,30]);bx('leftwall',[0,0,9],[W,3,30]);bx('rightwall',[0,69,9],[W,D,30]);bx('frontleft',[63,0,9],[66,20,30]);bx('frontright',[63,54,9],[66,72,30]);bx('fronttop',[63,20,28],[66,54,30]);
 bx('floorleft',[3,3,30],[43,69,33],geometry.CERAMIC);bx('floorback',[43,3,30],[63,27,33],geometry.CERAMIC);bx('floorfront',[43,47,30],[63,69,33],geometry.CERAMIC);
 add('dropwell',[52,37,30],geometry.shape(geometry.on(geometry.PZ(30),geometry.rectUV(43,27,63,47)),geometry.DARK.d,.5)+geometry.line(geometry.on(geometry.PZ(33.2),geometry.rectUV(43,27,63,47)),.8));
 // rear walls are low-opacity glass, separately depth-sorted
 for(const x of[0,W])for(const y of[0,D])bx('post'+x+y,[x-1.8,y-1.8,29],[x+1.8,y+1.8,108]);
 for(const x of[0,W]){bx('sillx'+x,[x-2,0,31],[x+2,D,35]);bx('topx'+x,[x-2,0,105],[x+2,D,109]);}
 for(const y of[0,D]){bx('silly'+y,[0,y-2,31],[W,y+2,35]);bx('topy'+y,[0,y-2,105],[W,y+2,109]);}
 for(const [i,q] of [geometry.on(geometry.PX(0),geometry.rectUV(2,35,70,105)),geometry.on(geometry.PX(W),geometry.rectUV(2,35,70,105)),geometry.on(geometry.PY(0),geometry.rectUV(2,35,64,105)),geometry.on(geometry.PY(D),geometry.rectUV(2,35,64,105))].entries())add('glass'+i,geometry.avg(q),`<g opacity=".07">${geometry.shape(q,'#bde4e0',.3)}</g>`);
 const capUV=geometry.rrUV(-3,109,75,118,2);add('cap',[33,36,114],'<g data-solid="true">'+geometry.extrude(capUV,-3,69,m)+geometry.shape(geometry.on(geometry.PX(geometry.vis([1,0,0])?69:-3),capUV),geometry.tone(geometry.vis([1,0,0])?[1,0,0]:[-1,0,0],m),1.2)+geometry.hullInk([...geometry.on(geometry.PX(-3),capUV),...geometry.on(geometry.PX(69),capUV)],2.3)+'</g>');
 if(geometry.vis([1,0,0]))add('sign',[70,36,114],geometry.shape(geometry.on(geometry.PX(69.2),geometry.rrUV(12,110,60,117,1)),geometry.CERAMIC.l,.8)+geometry.tx(69.4,36,111.8,'小小抓物社',3.5));
 // layered front controls, chute opening, coin slot, screws
 add('console',[76,36,29],geometry.box(66,1,27,76,71,32,m,geometry.tone,.4)+geometry.cyl(71,52,32,34,5,geometry.DARK));
 if(geometry.vis([1,0,0]))add('chute',[67,35,17],geometry.shape(geometry.on(geometry.PX(66.2),geometry.rrUV(20,10,54,28,3)),geometry.DARK.d,.5)+geometry.shape(geometry.on(geometry.PX(66.4),geometry.rrUV(22,11,52,27,2)),geometry.DARK.m,.3)+geometry.tx(66.5,37,25,'取物口',2.4)+geometry.shape(geometry.on(geometry.PX(66.3),geometry.rectUV(6,15,13,17)),geometry.DARK.d,.3));
 if(geometry.CV[0]<-1e-6){const corners=[];for(const x of[0,W])for(const y of[0,D])for(const z of[6,35])corners.push(geometry.P(x,y,z));add('outlet-mask',[0,0,0],`<defs><clipPath id="claw-outlet-mask"><path d="M-10000 -10000H10000V10000H-10000Z${geometry.sp(geometry.hull(corners))}" clip-rule="evenodd" fill-rule="evenodd"/></clipPath></defs>`);}
 add('outlet-tray',[82.5,37,10],outletExterior(geometry.box(66,20,9,99,54,11,geometry.METAL)));
 if(geometry.vis([0,1,0])){add('side-label',[32,72.2,19],geometry.shape(geometry.on(geometry.PY(72.2),geometry.rrUV(13,12,52,25,3)),geometry.matOf(m.m).m,.3)+geometry.txY(32,72.4,17,'把快乐带回家',3,m.d));for(let i=0;i<4;i++)add('vent'+i,[20,72.2,8+i],geometry.line([[7,72.3,8+i],[23,72.3,8+i]],.25));}
 for(const x of[.2,W+.2])add('shine'+x,[x,42,79],`<g opacity=".23">${geometry.shape(geometry.on(geometry.PX(x),[[8,80],[8,94],[60,57],[60,48]]),'#ffffff',0)+geometry.shape(geometry.on(geometry.PX(x),[[10,98],[10,101],[55,70],[55,66]]),'#ffffff',0)}</g>`);
 // steel rails and small fasteners
 for(const y of[9,63])add('rail'+y,[33,y,101],geometry.rod([5,y,101],[61,y,101],1.2,geometry.METAL));
 for(const x of[5,61])for(const y of[9,63])bx('rail-mount'+x+'-'+y,[x-1.3,y-1.8,100],[x+1.3,y+1.8,109.5],geometry.METAL);
 for(const x of[4,62])for(const y of[4,68])add('bolt'+x+y,[x,y,118.2],geometry.cyl(x,y,118,118.3,.8,geometry.METAL, geometry.toneI,.2,10));
 }
 const layers=fixed.slice();const add=(key,at,svg)=>layers.push({key,at,svg});
 // The switch is mounted on the deck, so it must paint after that deck inside
 // the same depth-sorted assembly. Sorting its centre separately puts it behind
 // the much wider console and lets the console swallow both ink and pointer hits.
 {const pressed=s.pressedAct==='drop'||s.phase==='down'&&s.timer<.2,top=35.2-(pressed?.9:0),index=layers.findIndex(p=>p.key==='console'),base=layers[index],visible=exteriorControlVisible(71,20,top,3.7,0);const button=geometry.act('drop',geometry.cyl(71,20,32,34,5,geometry.METAL)+geometry.cyl(71,20,34,top,3.7,geometry.PALS.mustard),'role="button" tabindex="'+(visible?'0':'-1')+'" aria-hidden="'+!visible+'" aria-label="'+(s.phase==='idle'?'下爪抓取':'机械爪工作中，请稍候')+'"');const joystick=geometry.rod([71,52,34],[71+(s.jx||0),52+(s.jy||0),40],1.3,geometry.METAL)+ball(71+(s.jx||0),52+(s.jy||0),41,3.3,3.3,3.3,geometry.PALS.tomato);layers[index]={...base,svg:outletExterior('<g data-solid="true">'+base.svg+geometry.byDepth([{at:[71,20,top],svg:button},{at:[71+(s.jx||0),52+(s.jy||0),41],svg:joystick}])+'</g>')};}
 for(const i of s.stock){if(s.got===i&&s.phase!=='idle')continue;const t=toys[i];let key='toy'+i+'@'+cacheKey;if(!toyCache.has(key))toyCache.set(key,plush(t));add('toyshadow'+i,[t.x,t.y,33.1],`<g opacity=".16">${geometry.shape(geometry.on(geometry.PZ(33.1),geometry.ellUV(t.x,t.y,8,9)),geometry.INK,0)}</g>`);add('toy'+i,[t.x,t.y,47],geometry.act('aim',toyCache.get(key),`data-i="${i}" aria-pressed="${s.target===i}" aria-disabled="${s.phase!=='idle'}" role="button" tabindex="${toyCanBeSeen(t)?0:-1}" aria-hidden="${!toyCanBeSeen(t)}" aria-label="瞄准${t.name}"`));}
 add('aim',[s.x,s.y,33.2],`<g opacity=".7">${geometry.shape(geometry.on(geometry.PZ(33.2),geometry.ellUV(s.x,s.y,7,7)),geometry.PALS.mustard.l,.35)+geometry.line([[s.x-10,s.y,33.3],[s.x+10,s.y,33.3]],.25)+geometry.line([[s.x,s.y-10,33.3],[s.x,s.y+10,33.3]],.25)}</g>`);
 add('bridge',[s.x,36,103],geometry.rod([s.x,7,103],[s.x,65,103],1.5,geometry.METAL)+geometry.box(s.x-3,s.y-4,101,s.x+3,s.y+4,106,geometry.DARK,geometry.toneI,.3));
 let claw=geometry.rod([s.x,s.y,101],[s.x,s.y,s.z+6],.5,geometry.DARK)+geometry.cyl(s.x,s.y,s.z+1,s.z+6,3,geometry.METAL,geometry.toneI,.4);
 const fingers=[];for(let i=0;i<3;i++){let a=i*Math.PI*2/3,r=9+5*s.open,tip=6.5+7.5*s.open;let A=[s.x+Math.cos(a)*2,s.y+Math.sin(a)*2,s.z+2],B=[s.x+Math.cos(a)*r,s.y+Math.sin(a)*r,s.z-13],C=[s.x+Math.cos(a)*tip,s.y+Math.sin(a)*tip,s.z-23];fingers.push({at:B,svg:geometry.rod(A,B,.95,geometry.METAL,geometry.toneI,.35)+geometry.rod(B,C,.85,geometry.METAL,geometry.toneI,.35)+geometry.rod(C,[C[0]-Math.cos(a)*2,C[1]-Math.sin(a)*2,C[2]-.6],.7,geometry.METAL,geometry.toneI,.3)});}fingers.forEach((p,i)=>add('finger'+i,p.at,p.svg));
 add('claw',[s.x,s.y,s.z],claw);
 if(s.got!==null&&['up','travel','release'].includes(s.phase))add('carried',[s.x,s.y,s.z-21],movedPlush(s.got,s.x+(s.grabDX||0),s.y+(s.grabDY||0),s.z-28));
 if(s.phase==='fall'){meshClip=[2,33];add('falling',[52,37,50],plush(toys[s.got],52,37,s.fallZ));meshClip=null;}
 if(s.phase==='eject'){meshClip=[0,66.5];add('ejecting',[90,37,18],outletExterior(plush(toys[s.got],s.outX,37,18,true)));meshClip=null;}
 if(['prize','collect'].includes(s.phase)){const visible=prizeCanBeSeen();add('prize',[79,37,17],outletExterior(`<g opacity="${s.phase==='collect'?Math.max(0,1-s.timer/.35):1}">`+geometry.act('collect',plush(toys[s.got],87,37,18,true),'role="button" tabindex="'+(visible?'0':'-1')+'" aria-hidden="'+!visible+'" aria-label="领取抓到的娃娃"')+'</g>'));}
 const rank=p=>{const k=p.key,d=geometry.depthOf(p.at);if(k==='shadow')return -2000;if(k.startsWith('foot'))return -950+d*.001;if(/^(bottom|backwall|leftwall|rightwall|frontleft|frontright|fronttop)$/.test(k))return -900+d*.001;if(k.startsWith('floor'))return -800+d*.001;if(k==='dropwell')return -799;if(k.startsWith('toyshadow'))return -798;if(k==='cap')return 1000;if(k.startsWith('bolt'))return 1001;if(k==='sign')return 2000;return d;};
 const observePart=key=>key==='bridge'||key.startsWith('rail')?'claw-axes':key.startsWith('finger')?'claw-grip':key==='claw'?'claw-lift':/^(dropwell|chute|outlet-tray|falling|ejecting|prize)$/.test(key)?'claw-outlet':null;
 scene.layers=layers.sort((a,b)=>rank(a)-rank(b)).map(p=>{const part=observePart(p.key);return {...p,svg:part?`<g data-observe-part="${part}">${p.svg}</g>`:p.svg,opacity:1};});return '';
}
const toyCache=new Map();
function clawBlocked(ui,message){ui.feedback(message,'blocked');}
function cancelAim(s){s.aimMotion=(s.aimMotion||0)+1;s.aiming=false;s.moving=false;}
function aim(s,i,ui){
 if(!s.stock.includes(i))return clawBlocked(ui,'这只娃娃已经领取了');
 if(s.phase!=='idle')return clawBlocked(ui,s.phase==='prize'?'请先领取取物口的娃娃':'机械爪正在完成这一轮，请稍候');
 releaseControls(true);cancelAim(s);const id=s.aimMotion,fromX=s.x,fromY=s.y,t=toys[i];let time=0;
 s.target=i;s.aiming=true;s.moving=true;s.result=null;s.message='正在移向'+t.name+'…';window.MechanicalAudio?.pulse('tick');
 ui.animate(dt=>{if(id!==s.aimMotion||s.phase!=='idle')return false;time+=dt;const k=Math.min(1,time/.65),e=geometry.ease(k);s.x=fromX+(t.x-fromX)*e;s.y=fromY+(t.y-fromY)*e;
 if(k===1){s.aiming=false;s.moving=false;s.message='已对准'+t.name+'，现在可以下爪；也可微调。';return false;}return true;});
}
function restock(s,ui){
 if(s.phase!=='idle')return clawBlocked(ui,'先完成并领取这一轮，再重新摆放');
 releaseControls(true);cancelAim(s);s.clawMotion=(s.clawMotion||0)+1;s.stock=toys.map((_,i)=>i);s.won=[];s.tries=0;s.result=null;s.target=null;s.x=45;s.y=19;s.message='新一轮已摆好，点娃娃瞄准后下爪。';ui.observation?.reset();window.MechanicalAudio?.reset();ui.invalidate();
}
// Each callback consumes only its current phase, then passes the unused dt on.
// Snap arithmetic-only rounding at exact boundaries; never recover wall-clock time.
function consumeClawPhase(s,dt,duration){
 const used=Math.min(dt,Math.max(0,duration-s.timer));s.timer+=used;
 if(duration-s.timer<=1e-10)s.timer=duration;
 return Math.max(0,dt-used);
}
function collect(s,ui){
 if(s.phase!=='prize')return clawBlocked(ui,s.phase==='idle'?'还没有待领取的娃娃，先瞄准并下爪':'娃娃正在送到取物口，请稍候');
 const id=s.clawMotion=(s.clawMotion||0)+1;let active=true;
 s.phase='collect';s.timer=0;s.message='正在领取'+toys[s.got].name+'…';window.MechanicalAudio?.pulse('pop');
 const fromX=s.x,fromY=s.y;ui.animate(dt=>{
  if(!active||id!==s.clawMotion)return false;
  if(!Number.isFinite(dt)||dt<0)return true;
  let remaining=dt;
  if(s.phase==='collect'){
   remaining=consumeClawPhase(s,remaining,.35);
   if(s.timer<.35)return true;
   s.won.push(toys[s.got].name);s.stock=s.stock.filter(i=>i!==s.got);s.got=null;s.phase='return';s.timer=0;s.message='已领取！机械爪正在回位…';
  }
  if(s.phase==='return'){
   remaining=consumeClawPhase(s,remaining,.7);
   const k=s.timer/.7,e=geometry.ease(k);s.x=fromX+(45-fromX)*e;s.y=fromY+(19-fromY)*e;s.moving=true;
   if(k===1){active=false;s.phase='idle';s.moving=false;s.target=null;s.z=REST;s.open=1;s.result='won';s.message=s.stock.length?'领取成功！还剩'+s.stock.length+'只，点下一只继续。':'四只全部收集完成！点击“再玩一轮”重新摆放。';return false;}
   return true;
  }
  active=false;return false;
 });
}
function drop(s,ui){
 if(s.phase==='prize')return clawBlocked(ui,'先领取取物口的娃娃，再开始下一轮');
 if(s.phase!=='idle')return clawBlocked(ui,'机械爪正在工作，请等这一轮完成');
 if(s.aiming)return clawBlocked(ui,'正在自动瞄准，等爪子停稳后再下爪');
 if(!s.stock.length)return restock(s,ui);
 const id=s.clawMotion=(s.clawMotion||0)+1;let active=true;
 releaseControls(true);cancelAim(s);s.phase='down';s.timer=0;s.tries++;s.got=null;s.result=null;s.grabDX=s.grabDY=0;s.message='① 下爪中，请稍候…';window.MechanicalAudio?.pulse('click');const ox=s.x,oy=s.y;
 const phase=(p,msg)=>{s.phase=p;s.timer=0;if(msg)s.message=msg;};
 const durations={down:1.3,close:.6,up:1.4,reopen:.35,travel:1.7,release:.35,fall:Math.sqrt((REST-28-8)/80),eject:1.1};
 ui.animate(dt=>{
  if(!active||id!==s.clawMotion)return false;
  if(!Number.isFinite(dt)||dt<0)return true;
  let remaining=dt;
  do{
   const duration=durations[s.phase];if(duration===undefined){active=false;return false;}
   remaining=consumeClawPhase(s,remaining,duration);const k=s.timer/duration,done=k===1;
   switch(s.phase){
   case'down':s.z=REST+(GRIP-REST)*geometry.ease(k);if(done)phase('close','② 爪子正在合拢…');break;
   case'close':s.open=1-k;if(done){s.got=s.stock.find(i=>Math.hypot(toys[i].x-s.x,toys[i].y-s.y)<4.5)??null;if(s.got!==null){s.grabDX=s.catchDX=toys[s.got].x-s.x;s.grabDY=s.catchDY=toys[s.got].y-s.y;}phase('up',s.got===null?'没抓住，机械爪正在收回…':'③ 抓稳了，正在提升…');}break;
   case'up':s.z=GRIP+(REST-GRIP)*geometry.ease(k);if(s.got!==null){s.grabDX=s.catchDX*(1-geometry.ease(k));s.grabDY=s.catchDY*(1-geometry.ease(k));}if(done)phase(s.got===null?'reopen':'travel',s.got===null?null:'④ 正在移向投放口…');break;
   case'reopen':s.open=k;if(done){active=false;s.phase='idle';s.result='miss';s.message='这次落空了。点一只娃娃自动对准，再试一次。';window.MechanicalAudio?.pulse('cue');return false;}break;
   case'travel':s.x=ox+(52-ox)*geometry.ease(k);s.y=oy+(37-oy)*geometry.ease(k);if(done)phase('release','⑤ 松爪，娃娃落入滑道…');break;
   case'release':s.open=k;if(done){s.fallZ=REST-28;phase('fall');}break;
   case'fall':s.fallZ=done?8:REST-28-80*s.timer*s.timer;if(done){s.outX=45;phase('eject','⑥ 娃娃沿机内滑道送出…');}break;
   case'eject':s.outX=45+42*geometry.ease(k);if(done){active=false;phase('prize','抓到'+toys[s.got].name+'啦！点击取物口或“领取娃娃”。');return false;}break;
   }
   if(!done)return true;
  }while(remaining>0);
  return true;
 });
}

const ui=geometry.mountFigure({title:'手绘抓娃娃机',hint:'转一转，看清楚，再把快乐带回家。',size:[W,D,H],homeView:[38,23],palette:'mint',state:st,scene,credit:false,buttonsLabel:'抓取操作',buttons:[{label:'下爪',onClick:drop},{label:'领取娃娃',onClick:collect},{label:'重新摆放',onClick:restock }],acts:{aim:(s,e,u)=>aim(s,+e.dataset.i,u),drop:(s,e,u)=>drop(s,u),collect:(s,e,u)=>collect(s,u)},readout:s=>s.message});
document.getElementById('fig').setAttribute('aria-label','抓娃娃机，方向键微调，空格下爪，Shift 加方向键旋转视角，点选娃娃瞄准');
const panel=document.createElement('div');panel.className='gamepad';panel.innerHTML='<div class="pad"><button data-dir="far">向上</button><button data-dir="left">向左</button><button data-dir="near">向下</button><button data-dir="right">向右</button></div><p id="collection"></p>';document.getElementById('readout').after(panel);

const hint=document.createElement('p');hint.style='max-width:760px;width:100%;font-size:11px;color:var(--muted);margin:10px 0 0';hint.textContent='拖动红色摇杆移动 · 点娃娃瞄准 · 空格下爪 · 拖空白旋转';document.querySelector('header').after(hint);
const oldRender=ui.render;ui.render=()=>{if(!scope.active||scope.paused||disposed)return;oldRender();document.getElementById('collection').textContent=`已领取 ${st.won.length} 只 · 尝试 ${st.tries} 次`+(st.won.length?' · '+st.won.slice(-4).join('、'):'');};
let held=null,heldInput=null,holdRunning=false,boundaryNoted=false,holdGeneration=0;
function screenDirection(dx,dy){const a=geometry.Dv(1,0,0),b=geometry.Dv(0,1,0),det=a[0]*b[1]-a[1]*b[0];let x=(dx*b[1]-dy*b[0])/det,y=(a[0]*dy-a[1]*dx)/det,n=Math.hypot(x,y)||1;return[x/n,y/n];}
function centerStick(){const x=st.jx||0,y=st.jy||0;const id=st.stickMotion=(st.stickMotion||0)+1;let t=0;ui.animate(dt=>{if(id!==st.stickMotion)return false;t+=dt;const k=1-geometry.ease(Math.min(1,t/.16));st.jx=x*k;st.jy=y*k;return t<.16;});}
function stopHold(input=null){if(!held||input&&(input.kind!==heldInput?.kind||input.id!==heldInput?.id||input.node!==heldInput?.node))return;const previous=heldInput;held=null;heldInput=null;if(previous?.kind==='pointer'&&previous.node.hasPointerCapture?.(previous.id))previous.node.releasePointerCapture(previous.id);st.moving=false;centerStick();if(st.phase==='idle'&&!st.aiming)st.message='移动已停止；对准后可以下爪，或继续微调。';panel.querySelectorAll('button').forEach(b=>b.classList.remove('is-held'));ui.invalidate();}
// A zero/tiny animation dt is not a rail stop. Only actual limits in every
// requested axis can block a movement; one free axis still permits sliding.
function atMovementLimit(dx,dy){const blocked=(value,d,lo,hi)=>Math.abs(d)<1e-7||d<0&&value<=lo+1e-7||d>0&&value>=hi-1e-7;return Math.hypot(dx,dy)>1e-7&&blocked(st.x,dx,14,52)&&blocked(st.y,dy,14,58);}
function move(dir,dt){if(st.phase!=='idle')return;const a={left:[-1,0],right:[1,0],far:[0,-1],near:[0,1]}[dir],d=screenDirection(...a),x=st.x,y=st.y;st.x=Math.max(14,Math.min(52,st.x+d[0]*24*dt));st.y=Math.max(14,Math.min(58,st.y+d[1]*24*dt));st.jx=d[0]*3.3;st.jy=d[1]*3.3;st.target=null;st.moving=Math.hypot(st.x-x,st.y-y)>.001;if(!st.moving&&atMovementLimit(...d)&&!boundaryNoted){boundaryNoted=true;ui.feedback('已经到达这一侧边缘，换个方向试试','blocked');}else if(st.moving)boundaryNoted=false;ui.invalidate();}
function hold(dir,input){if(joy)stopJoy();if(st.phase!=='idle')return clawBlocked(ui,st.phase==='prize'?'先领取娃娃，再移动机械爪':'机械爪工作中，完成后才能移动');if(!st.stock.length)return clawBlocked(ui,'已经全部领取，点击“再玩一轮”');stopHold();cancelAim(st);st.stickMotion=(st.stickMotion||0)+1;held=dir;heldInput=input;st.message='正在移动，松开停止；对准后下爪。';panel.querySelectorAll('button').forEach(b=>b.classList.toggle('is-held',b.dataset.dir===dir));if(holdRunning)return true;holdRunning=true;const holdId=++holdGeneration;move(dir,.04);ui.animate(dt=>{if(holdId!==holdGeneration)return false;if(!held||st.phase!=='idle'){holdRunning=false;stopHold();return false;}move(held,dt);return true;});return true;}
// Only the focused model or direction pad owns game shortcuts. Settings,
// scrolling regions and ordinary buttons keep their native keyboard behavior.
const modifiedKey=e=>e.altKey||e.ctrlKey||e.metaKey;
const model=document.getElementById('fig');
const gameKeyTarget=target=>!target.isContentEditable&&!/^(INPUT|TEXTAREA|SELECT|SUMMARY|A)$/.test(target.tagName)&&(target===model||target.closest?.('#fig')===model||target.tagName==='BUTTON'&&target.dataset.dir&&panel.contains(target));
const keyClicks=new Map();
function beginKeyClick(node,key){const old=keyClicks.get(node);if(old?.held)return false;clearTimeout(old?.timer);keyClicks.set(node,{key,held:true});return true;}
function endKeyClick(node,key){const old=keyClicks.get(node);if(!old||key&&old.key!==key)return;old.held=false;clearTimeout(old.timer);old.timer=setTimeout(()=>{if(keyClicks.get(node)===old)keyClicks.delete(node)},0);}
function clearKeyClicks(){for(const old of keyClicks.values())clearTimeout(old.timer);keyClicks.clear();}
for(const b of panel.querySelectorAll('button')){
 bind(b,'onpointerdown',e=>{if(e.isPrimary===false||e.button)return;e.preventDefault();b.focus({preventScroll:true});if(hold(b.dataset.dir,{kind:'pointer',id:e.pointerId,node:b}))b.setPointerCapture(e.pointerId)});
 bind(b,'onpointerup',bind(b,'onpointercancel',bind(b,'onlostpointercapture',e=>stopHold({kind:'pointer',id:e.pointerId,node:b}))));
 bind(b,'onkeydown',e=>{if(modifiedKey(e)||e.key!=='Enter'&&e.key!==' ')return;e.preventDefault();e.stopPropagation();if(!e.repeat&&beginKeyClick(b,e.key))hold(b.dataset.dir,{kind:'key',id:e.key,node:b})});
 bind(b,'onkeyup',e=>{if(e.key==='Enter'||e.key===' '){if(!modifiedKey(e)){e.preventDefault();e.stopPropagation();}endKeyClick(b,e.key);stopHold({kind:'key',id:e.key,node:b})}});
 bind(b,'onblur',()=>{endKeyClick(b);if(heldInput?.node===b)stopHold()});
 bind(b,'onclick',e=>{if(e.detail===0&&!keyClicks.has(b)&&!modifiedKey(e)){if(st.phase!=='idle')return clawBlocked(ui,'请等待当前抓取完成');if(!st.stock.length)return clawBlocked(ui,'已经全部领取，点击“再玩一轮”');releaseControls(true);cancelAim(st);move(b.dataset.dir,.16);st.moving=false;centerStick();ui.invalidate()}});
}
addEventListener('keydown',e=>{if(modifiedKey(e)||e.shiftKey){if(heldInput?.kind==='key')stopHold();return;}if(e.defaultPrevented||!gameKeyTarget(e.target))return;const d={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'far',ArrowDown:'near'}[e.key];if(d){e.preventDefault();if(!e.repeat)hold(d,{kind:'key',id:e.key,node:panel.contains(e.target)?e.target:model});}if((e.code==='Space'||e.key===' ')&&e.target===model){e.preventDefault();if(!e.repeat)drop(st,ui);}});
addEventListener('keyup',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&heldInput?.kind==='key'&&heldInput.id===e.key)stopHold()});
listen(document,'focusin',e=>{if(heldInput?.kind==='key'&&heldInput.node!==(panel.contains(e.target)?e.target:gameKeyTarget(e.target)?model:null))stopHold()});
addEventListener('blur',()=>{stopHold();clearKeyClicks()});ui.render();

geometry.setCam(38,23);ui.render();

/* Stable screen-sized joystick hit region, separate from redrawable ink geometry. */
const joySvg=document.getElementById('fig'),joyHit=document.createElementNS('http://www.w3.org/2000/svg','circle');
joyHit.setAttribute('fill','transparent');joyHit.setAttribute('stroke','transparent');joyHit.setAttribute('role','button');joyHit.setAttribute('tabindex','0');joyHit.setAttribute('aria-label','红色摇杆，按住并拖动控制爪子，松开停止');joyHit.style='pointer-events:all;cursor:move;touch-action:none';joySvg.appendChild(joyHit);
let joy=null,joyGeneration=0;
function stopJoy(){if(!joy)return;const id=joy.id;joy=null;if(joyHit.hasPointerCapture?.(id))joyHit.releasePointerCapture(id);st.moving=false;centerStick();if(st.phase==='idle'&&!st.aiming)st.message='摇杆已松开，爪子停止；对准后下爪。';ui.invalidate();}
function releaseControls(quiet=false){stopHold();stopJoy();st.moving=false;if(quiet)ui.clearFeedback?.();}
const joyRender=ui.render;ui.render=()=>{if(!scope.active||scope.paused||disposed)return;joyRender();const wasFocused=document.activeElement===joyHit,p=geometry.P(71,52,41),r=joySvg.getBoundingClientRect(),visible=exteriorControlVisible(71+(st.jx||0),52+(st.jy||0),41,3.3);joyHit.setAttribute('cx',p[0]);joyHit.setAttribute('cy',p[1]);joyHit.setAttribute('r',Math.max(5,22*joySvg.viewBox.baseVal.width/r.width));joyHit.style.display=visible?'':'none';joyHit.setAttribute('tabindex',visible?'0':'-1');joyHit.setAttribute('aria-hidden',!visible);joyHit.setAttribute('aria-disabled',st.phase!=='idle');if(!visible){if(wasFocused)joySvg.focus({preventScroll:true});if(joy)stopJoy();}};
listen(joyHit,'pointerdown',e=>{if(joy||e.isPrimary===false||e.button)return;e.preventDefault();e.stopPropagation();joyHit.focus({preventScroll:true});if(st.phase!=='idle'){clawBlocked(ui,st.phase==='prize'?'请先领取取物口的娃娃':'机械爪工作中，请等待这一轮结束');return;}if(!st.stock.length)return clawBlocked(ui,'已经全部领取，点击“再玩一轮”');stopHold();cancelAim(st);st.stickMotion=(st.stickMotion||0)+1;joy={id:e.pointerId,x:e.clientX,y:e.clientY,vx:0,vy:0};joyHit.setPointerCapture(e.pointerId);st.message='摇杆控制中，松开立即停止。';const joyId=++joyGeneration;ui.animate(dt=>{if(joyId!==joyGeneration)return false;if(!joy||st.phase!=='idle'){stopJoy();return false;}const x=st.x,y=st.y;st.x=Math.max(14,Math.min(52,st.x+joy.vx*24*dt));st.y=Math.max(14,Math.min(58,st.y+joy.vy*24*dt));st.moving=Math.hypot(st.x-x,st.y-y)>.001;st.target=null;if(!st.moving&&Math.hypot(joy.vx,joy.vy)>.1&&atMovementLimit(joy.vx,joy.vy)&&!boundaryNoted){boundaryNoted=true;ui.feedback('已经到达边缘，换个方向试试','blocked');}else if(st.moving)boundaryNoted=false;return true;});});
listen(joyHit,'pointermove',e=>{if(!joy||e.pointerId!==joy.id)return;e.preventDefault();e.stopPropagation();let dx=e.clientX-joy.x,dy=e.clientY-joy.y,len=Math.hypot(dx,dy),strength=Math.min(1,Math.max(0,(len-3)/25));if(len<3){joy.vx=joy.vy=st.jx=st.jy=0;return;}dx/=len;dy/=len;const a=geometry.Dv(1,0,0),b=geometry.Dv(0,1,0),det=a[0]*b[1]-a[1]*b[0];let wx=(dx*b[1]-dy*b[0])/det,wy=(a[0]*dy-a[1]*dx)/det,n=Math.hypot(wx,wy);joy.vx=wx/n*strength;joy.vy=wy/n*strength;st.jx=joy.vx*3.3;st.jy=joy.vy*3.3;});
for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(joyHit,event,e=>{e.stopPropagation();if(joy&&e.pointerId===joy.id)stopJoy();});
listen(joyHit,'keydown',e=>{if(!modifiedKey(e)&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();if(!e.repeat&&beginKeyClick(joyHit,e.key)){if(e.key===' ')drop(st,ui);else ui.flash('使用方向键移动爪子，空格下爪');}}});
listen(joyHit,'keyup',e=>{if(e.key==='Enter'||e.key===' ')endKeyClick(joyHit,e.key)});
listen(joyHit,'blur',()=>{endKeyClick(joyHit);stopJoy()});
listen(joyHit,'click',e=>{e.stopPropagation();if(e.detail===0&&!keyClicks.has(joyHit)&&!modifiedKey(e))ui.flash('使用方向键移动爪子，空格下爪')});addEventListener('blur',stopJoy);listen(document,'visibilitychange',()=>{if(document.hidden){stopHold();stopJoy();clearKeyClicks();}});
ui.render();

/* Page layout only: a figure-first stage with one nearby control dock. */
const page=document.createElement('main');page.className='play-layout';
const stage=document.querySelector('.stage'),dock=document.createElement('aside');dock.className='play-dock';dock.setAttribute('aria-label','抓取控制');
const heading=document.querySelector('header');heading.innerHTML='<div><p class="eyebrow">手绘机械小玩具</p><h1>小小抓物社</h1></div><span>转一转，把快乐带回家。</span>';
hint.remove();heading.after(page);page.append(stage,dock);
const dockTitle=document.createElement('p');dockTitle.className='dock-title';dockTitle.textContent='瞄准，把它带回家';dock.append(dockTitle);
const readout=document.getElementById('readout');readout.setAttribute('aria-live','polite');dock.append(readout);
const actions=document.getElementById('btns');actions.querySelector('.cap')?.remove();const resetWrap=actions.children[2];dock.append(actions,panel);
const prefs=document.createElement('details');prefs.className='preferences';prefs.innerHTML='<summary>外观与设置</summary>';const settings=document.querySelector('.controls');prefs.append(settings,resetWrap);dock.append(prefs);
const help=document.createElement('details');help.className='help-details';help.innerHTML='<summary>怎么玩</summary><p>点娃娃自动瞄准，或按住红色摇杆拖动。松手停止，再按“下爪”。</p><p>拖动画面空白处旋转观察。先点选或聚焦模型，再用方向键微调、空格下爪；Shift 加方向键旋转视角。抓到后点击托盘领奖。</p>';dock.append(help);
const stageNote=document.createElement('p');stageNote.className='stage-note';stageNote.textContent='拖动旋转观察 · 点娃娃瞄准';stage.append(stageNote);

const primaryButtons=actions.querySelectorAll('button');
st.message='点娃娃瞄准，或拖动红色摇杆。';ui.render();


/* Left-aligned controls; expandable extras scroll without stretching the page. */
const extras=document.createElement('section');extras.className='dock-extras';extras.setAttribute('aria-label','设置和玩法');extras.setAttribute('tabindex','0');dock.append(extras);extras.append(prefs,help);
ui.render();
const scrollHint=document.createElement('p');scrollHint.className='extras-scroll-hint';scrollHint.textContent='设置区可上下滚动 ↕';dock.append(scrollHint);

function updateExtrasOverflow(){dock.classList.toggle('has-overflow',extras.scrollHeight>extras.clientHeight+2)}
for(const detail of[prefs,help])listen(detail,'toggle',updateExtrasOverflow);addEventListener('resize',updateExtrasOverflow);updateExtrasOverflow();

/* Shared ten-object visual system; renderer and game state stay unchanged. */


ui.render();updateExtrasOverflow();
heading.remove();

/* Stage-aware actions remain focusable so a blocked press explains itself. */
const clawProgress=document.createElement('div');clawProgress.className='toy-progress';clawProgress.setAttribute('role','progressbar');clawProgress.setAttribute('aria-label','本轮抓取进度');clawProgress.innerHTML='<span></span>';readout.after(clawProgress);
const releaseAudio=window.MechanicalAudio?.attach('claw',actions);let audioDisposed=false;const disposeAudio=()=>{if(audioDisposed)return;audioDisposed=true;releaseAudio?.();};scope.onCleanup(disposeAudio);
const phaseLabels={down:'下爪中…',close:'正在合爪…',up:'正在提升…',reopen:'正在复位…',travel:'正在运送…',release:'正在松爪…',fall:'娃娃滑落中…',eject:'正在送出…',prize:'请先领取娃娃',collect:'正在领取…',return:'机械爪回位中…'};
const phaseProgress={down:10,close:25,up:40,reopen:85,travel:60,release:75,fall:82,eject:92,prize:100,collect:100,return:100};
const tactileRender=ui.render;ui.render=()=>{if(!scope.active||scope.paused||disposed)return;tactileRender();const idle=st.phase==='idle',prize=st.phase==='prize';primaryButtons[0].disabled=false;primaryButtons[1].disabled=false;
 primaryButtons[0].textContent=!idle?phaseLabels[st.phase]:st.aiming?'正在自动瞄准…':!st.stock.length?'再玩一轮':st.result==='miss'?'再试一次':'下爪抓取';primaryButtons[1].textContent=prize?'领取'+toys[st.got].name:st.phase==='collect'?'正在领取…':'领取娃娃';primaryButtons[0].setAttribute('aria-disabled',!idle||st.aiming);primaryButtons[1].setAttribute('aria-disabled',!prize);primaryButtons[0].classList.toggle('is-next',idle&&!st.aiming);primaryButtons[1].classList.toggle('is-next',prize);
 panel.querySelectorAll('button').forEach(b=>{b.setAttribute('aria-disabled',!idle||!st.stock.length);b.setAttribute('aria-pressed',held===b.dataset.dir)});joyHit.setAttribute('aria-disabled',!idle);clawProgress.hidden=idle;const progress=phaseProgress[st.phase]||0;clawProgress.firstElementChild.style.width=progress+'%';clawProgress.setAttribute('aria-valuenow',progress);clawProgress.setAttribute('aria-valuemin','0');clawProgress.setAttribute('aria-valuemax','100');clawProgress.setAttribute('aria-valuetext',phaseLabels[st.phase]||'等待瞄准');
 stage.setAttribute('aria-busy',!idle&&!prize);window.MechanicalAudio?.update('claw',st);
 clawObservation?.update();
};
addEventListener('pagehide',()=>{releaseControls(true);window.MechanicalAudio?.reset()});ui.render();updateExtrasOverflow();

/* Read-only causal feedback; joystick, aiming and prize timing stay real-time. */
function readClawObservation(){
 const phase=st.phase,atX=st.x<=14.05||st.x>=51.95,atY=st.y<=14.05||st.y>=57.95;
 const phases={
  down:['垂直下降','横向位置先锁定，吊索放长，让张开的爪子降到抓取高度。','吊索',['claw-lift']],
  close:['合爪判定','三根爪指合拢；只有爪心离娃娃足够近，这次演示才会抓住它。','三根爪指',['claw-grip']],
  up:['向上提升',st.got===null?'没有夹中娃娃，吊索空载收回。':'吊索收回，把已夹中的娃娃提离底板。','吊索 → 爪指',['claw-lift','claw-grip']],
  reopen:['空爪复位','这次落空了。爪子重新张开，停稳后便可调整位置再试。','爪指',['claw-grip']],
  travel:['运送到投放口','先提升再横移，桥架把娃娃送到固定投放口，不会直接穿过机器侧面。','横移桥架',['claw-axes']],
  release:['松爪投放','到达投放口后爪指张开，让娃娃落入机内滑道。','爪指 → 投放口',['claw-grip','claw-outlet']],
  fall:['落入滑道','娃娃向下落入投放井，机械爪留在上方。','投放井',['claw-outlet']],
  eject:['滑道送出','娃娃沿底部滑道移动，最后出现在取物口托盘。','滑道 → 取物口',['claw-outlet']],
  prize:['等待领取','本轮已送达。领取娃娃后，横移机构才会回到起始位置。','取物口',['claw-outlet']],
  collect:['领取娃娃','领取后记录收集结果，随后机械爪自动回位。','取物口',['claw-outlet']],
  return:['横移回位','桥架带着空爪回到起点；回位完成后，摇杆与方向键重新可用。','横移桥架',['claw-axes']]
 };
 let [stage,text,part,active]=phases[phase]||[st.aiming?'自动对准':st.moving?'横向移动':atX||atY?'已到行程边缘':'等待瞄准',st.aiming?'横移机构沿两轴把爪心移向所选娃娃；停稳后才可下爪。':st.moving?'摇杆与方向键改变两轴位置。松开或取消手势立即停止；到轨道边缘后不能继续向外。':atX||atY?'当前位置触到轨道行程边缘。向内移动仍然有效，不会越过机身。':'先用两轴对准娃娃，再垂直下爪；松开摇杆或方向键即停止手动移动。',st.aiming||st.moving?'两轴导轨与桥架':'导轨 · 等待移动',st.aiming||st.moving?['claw-axes']:[]];
 const axis=(v,lo,hi)=>Math.round((v-lo)/(hi-lo)*100)+'%'+(v<=lo+.05?' · 起端':v>=hi-.05?' · 末端':'');
 return {stage,text,active,readouts:[
  {label:'横轴 / 纵轴行程',value:axis(st.x,14,52)+' / '+axis(st.y,14,58)},
  {label:'下降 / 合爪程度',value:Math.round((REST-st.z)/(REST-GRIP)*100)+'% / '+Math.round((1-st.open)*100)+'%'},
  {label:'当前部件',value:part},
  {label:'输入与中断',value:phase==='idle'?(st.aiming?'自动对准；手动操作可打断':'手动松开即停；切出不续推'):'本轮自动完成；切出暂停，返回继续'}
 ]};
}
clawObservation=window.MuseumObservation?.mount({host:extras,state:st,read:readClawObservation,title:'看原理',intro:'读数对应导轨、吊索和爪指的当前状态。抓取保留原速，不改变按住移动或松手停止的手感。',slow:false,onChange:()=>{ui.render();updateExtrasOverflow();}});
ui.render();updateExtrasOverflow();

ui.observation=clawObservation;


/* Optional live cause/action card. It reads the existing game state, never
 * selects a toy on entry and never owns a clock, pause or completion counter. */
let clawLessonEnabled=false;
function readClawLesson(){
 const s=st,phase=s.phase,observation=readClawObservation(),idle=phase==='idle',prize=phase==='prize';
 const index={down:1,close:2,up:3,reopen:2,travel:4,release:5,fall:5,eject:5,prize:6,collect:6,return:0}[phase]??0;
 const look={down:'看吊索变长：桥架不横移，张开的爪子向下。',close:'看三根爪指收拢；对照爪心与娃娃的位置。',up:s.got===null?'看空爪上升，没有娃娃随它离开底板。':'看吊索缩短，夹中的娃娃跟着爪子上升。',reopen:'看空爪重新张开；它不会被算作一次领取。',travel:'看上方导轨与桥架横移，娃娃随爪子到投放井上方。',release:'看爪指张开，娃娃离开爪子。',fall:'看娃娃落入底板上的投放井，爪子仍停在上方。',eject:'看同一只娃娃从机内滑道出现在前方托盘。',prize:'看前方取物口；点击娃娃或下方按钮领取。',collect:'看托盘上的娃娃被取走，随后空爪回位。',return:'看桥架带空爪回到起点，不会再计一次领取。'}[phase]||'看上方两轴导轨、桥架和底板上的瞄准圈；可点娃娃，或用原摇杆与方向键微调。';
 let title=observation.stage,text=observation.text,label=phaseLabels[phase]||'等待这一轮完成';
 if(idle){
  if(!s.stock.length){title='全部领取 · 可以重新摆放';text='四只娃娃都已领取，机内没有可抓取目标。重新摆放会清空本轮尝试和收集记录。';label='再玩一轮';}
  else if(s.aiming){label='正在对准 · 停稳后下爪';}
  else{label='按当前位置下爪';if(s.result==='miss'){title='落空后再瞄准';text='刚才合爪时没有夹中。先调整爪心与娃娃的位置再下爪；系统不会替你改选目标。';}else if(s.target!==null){title='已对准'+toys[s.target].name;text='桥架已移到你选的娃娃上方。下爪后横向位置锁定，依次下降、合拢，再提升；也可先手动微调。';}}
 }else if(prize){label='领取'+toys[s.got].name;}
 const choices=toys.map((toy,i)=>({id:'aim-'+i,label:!s.stock.includes(i)?toy.name+' · 已领取':s.target===i?toy.name+(s.aiming?' · 对准中':' · 已选'):'瞄准'+toy.name,disabled:!idle||!s.stock.includes(i)||s.target===i,hint:!idle?'当前轮次完成并领取后才能重新瞄准。':!s.stock.includes(i)?'这只娃娃已领取，重新摆放后可再抓。':'使用原有点选瞄准；也可以直接操作模型、摇杆和方向键。'}));
 choices.push({id:'restock',label:idle?'重新摆放 · 清空记录':'重摆需完成并领取',disabled:!idle,hint:'沿用原有重新摆放：当前轮次必须完成并领取；会清空本轮尝试与收集记录。'});
 return {enabled:clawLessonEnabled,phase,index,title,text,look,label,busy:!idle&&!prize||s.aiming,completed:false,choices};
}
function toggleClawLesson(on){clawLessonEnabled=!!on;updateExtrasOverflow();}
function advanceClawLesson(){if(!clawLessonEnabled||readClawLesson().busy)return;if(st.phase==='prize')collect(st,ui);else if(st.phase==='idle')drop(st,ui);ui.invalidate();}
function chooseClawLesson(id){if(!clawLessonEnabled)return;const choice=readClawLesson().choices.find(c=>c.id===id);if(!choice||choice.disabled)return;if(id==='restock')restock(st,ui);else if(/^aim-[0-3]$/.test(id))aim(st,+id.slice(-1),ui);ui.invalidate();}
const clawLesson=window.MuseumObservation?.mountLesson?.({ui,id:'claw',title:'看懂一步 · 瞄准与抓取',route:['瞄','降','合','升','运','放','取'],linear:false,exitLabel:'退出讲解 · 保留当前动作',note:'按原速跟随当前动作，不设暂停关卡。抓取按爪心距离作简化判定，不模拟夹持力或传感器。',read:readClawLesson,onToggle:toggleClawLesson,onAdvance:advanceClawLesson,onChoice:chooseClawLesson});
ui.render();updateExtrasOverflow();

function cancelInput(){holdGeneration++;joyGeneration++;releaseControls(true);clearKeyClicks();ui.cancelInput();st.stickMotion=(st.stickMotion||0)+1;st.jx=st.jy=0;holdRunning=false;boundaryNoted=false;panel.querySelectorAll('button').forEach(b=>{b.classList.remove('is-held');b.setAttribute('aria-pressed','false')});}
function reset(){if(disposed||!scope.active)return;cancelInput();ui.clearAnimations();const pal=st.pal,az=st.az;for(const key of Object.keys(st))delete st[key];Object.assign(st,initialState(),{pal,az,jx:0,jy:0,pressedAct:null,message:'点娃娃瞄准，或拖动红色摇杆。'});geometry.setCam(38,23);clawObservation?.reset();window.MechanicalAudio?.reset();cacheKey='';fixed=[];toyCache.clear();ui.render();}
function dispose(){if(disposed)return;disposed=true;cancelInput();ui.dispose();clawObservation?.dispose();disposeAudio?.();}
scope.onCleanup(dispose);
return {ui,state:st,reset,cancelInput,dispose,snapshot:()=>JSON.parse(JSON.stringify(st)),readObservation:readClawObservation,readLesson:readClawLesson};

}
