/* Real volumetric geometry using the same ink, light and orthographic camera as the washer. */
const W=66,D=72,H=119,REST=87,GRIP=70.3,FLOOR_BODY=42.3;
let clawObservation=null;
let meshClip=null;
function clipMesh(q){if(!meshClip)return q;const [axis,limit]=meshClip,out=[];for(let i=0;i<q.length;i++){const a=q[i],b=q[(i+1)%q.length],ia=a[axis]>=limit,ib=b[axis]>=limit;if(ia)out.push(a);if(ia!==ib){const t=(limit-a[axis])/(b[axis]-a[axis]);out.push(a.map((v,j)=>v+(b[j]-v)*t));}}return out;}
function ball(x,y,z,rx,ry,rz,m){
 const pts=[],fs=[],clippedPts=[];const n=16,k=8;
 for(let j=0;j<=k;j++){const a=-Math.PI/2+Math.PI*j/k;let ring=[];for(let i=0;i<n;i++){let t=i/n*Math.PI*2;ring.push([x+rx*Math.cos(a)*Math.cos(t),y+ry*Math.cos(a)*Math.sin(t),z+rz*Math.sin(a)]);}pts.push(ring)}
 for(let j=0;j<k;j++)for(let i=0;i<n;i++){let q=[pts[j][i],pts[j][(i+1)%n],pts[j+1][(i+1)%n],pts[j+1][i]],at=avg(q),nr=norm([(at[0]-x)/rx**2,(at[1]-y)/ry**2,(at[2]-z)/rz**2]);if(vis(nr)){q=clipMesh(q);if(q.length>2){clippedPts.push(...q);fs.push({at,svg:face(pd(q),toneI(nr,m))})}}}
 return byDepth(fs)+(meshClip?(clippedPts.length?hullInk(clippedPts,1.4):''):hullInk(pts.flat(),1.4));
}
const toys=[{name:'桃桃熊',x:42,y:57,c:'#e7a4a2',kind:0},{name:'奶油兔',x:18,y:51,c:'#e4d6b6',kind:1},{name:'薄荷猫',x:43,y:15,c:'#99c1aa',kind:2},{name:'蓝莓熊',x:18,y:19,c:'#8da7cd',kind:0}];
function plush(t,x=t.x,y=t.y,z=FLOOR_BODY,lying=false){const m=matOf(t.c),parts=[];const b=(a,b,c,rx,ry,rz,mat=m)=>{const at=lying?[x-c,y+b,z+a]:[x+a,y+b,z+c];parts.push({at,svg:ball(...at,lying?rz:rx,ry,lying?rx:rz,mat)})};
 b(0,0,0,6.4,6.5,8); b(0,-4,-6,4,3.5,3.3); b(0,4,-6,4,3.5,3.3); b(0,-6,1,3,3,5);b(0,6,1,3,3,5);b(0,0,10,7.5,7.7,7);
 b(-.5,-5,16,3,2.7,t.kind===1?7:3.1);b(-.5,5,16,3,2.7,t.kind===1?7:3.1);
 b(6.3,0,9,2.5,3.7,2.6,CERAMIC);b(8.6,0,10,1,1.1,.8,DARK);b(6.1,-3.7,12,1,1,1.1,DARK);b(6.1,3.7,12,1,1,1.1,DARK);
 return byDepth(parts);}
// Keep keyboard aim targets out of the tab order when the opaque roof hides the whole toy.
function roofHides(p){let near=0,far=Infinity;for(let j=0;j<3;j++){const lo=[-3,-3,109][j],hi=[69,75,118][j],v=CV[j];if(Math.abs(v)<1e-8){if(p[j]<lo||p[j]>hi)return false;continue;}let a=(lo-p[j])/v,b=(hi-p[j])/v;if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(far<near)return false;}return far>0&&far>=near;}
function toyCanBeSeen(t){return [[t.x,t.y,FLOOR_BODY+10],[t.x+8.6,t.y,FLOOR_BODY+10],[t.x,t.y-7.7,FLOOR_BODY+10],[t.x,t.y+7.7,FLOOR_BODY+10],[t.x,t.y-5,FLOOR_BODY+(t.kind===1?23:19)],[t.x,t.y+5,FLOOR_BODY+(t.kind===1?23:19)]].some(p=>!roofHides(p));}
// Exterior controls/tray may peek past the case, but not through its opaque base.
const outletExterior=svg=>CV[0]>=-1e-6?svg:`<g clip-path="url(#claw-outlet-mask)">${svg}</g>`;
function outletPointHidden(p){let near=0,far=Infinity;for(let j=0;j<3;j++){const lo=[0,0,6][j],hi=[W,D,35][j],v=CV[j];if(Math.abs(v)<1e-8){if(p[j]<lo||p[j]>hi)return false;continue;}let a=(lo-p[j])/v,b=(hi-p[j])/v;if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(far<near)return false;}return far>0&&far>=near;}
function prizeCanBeSeen(){return [[87,37,18],[77,37,18],[71,32,17.5],[71,42,17.5],[93,33,18],[93,41,18],[78,37,27]].some(p=>!outletPointHidden(p));}
function exteriorControlVisible(x,y,z,r,rz=r){return [[x,y,z],[x+r,y,z],[x-r,y,z],[x,y+r,z],[x,y-r,z],[x,y,z+rz]].some(p=>!outletPointHidden(p)&&!roofHides(p));}
function movedPlush(i,x,y,z){let t=toys[i],key='toy'+i+'@'+cacheKey;if(!toyCache.has(key))toyCache.set(key,plush(t));let a=P(t.x,t.y,FLOOR_BODY),b=P(x,y,z);return `<g transform="translate(${f(b[0]-a[0])} ${f(b[1]-a[1])})">${toyCache.get(key)}</g>`;}
const st={x:45,y:19,z:REST,open:1,phase:'idle',timer:0,got:null,won:[],stock:toys.map((_,i)=>i),tries:0,target:null,aiming:false,moving:false,result:null,message:'点选娃娃瞄准，方向键微调；拖动画面旋转观察。'};
let cacheKey='',fixed=[];
function scene(s,m){
 let cam=[YAW,PITCH,s.pal].join(',');if(cam!==cacheKey){cacheKey=cam;fixed=[];toyCache.clear();const add=(key,at,svg)=>fixed.push({key,at,svg});
 const bx=(key,a,b,mat=m)=>add(key,avg([a,b]),`<g data-solid="true">${box(...a,...b,mat,tone,1.1)}</g>`);
 add('shadow',[0,0,-10],castShadow([[0,0,4],[W,0,4],[W,D,4],[0,D,4],[0,0,H],[W,0,H],[W,D,H],[0,D,H]]));
 for(const x of[7,59])for(const y of[7,65])add('foot'+x+y,[x,y,3],cyl(x,y,0,7,3.3,DARK));
 bx('bottom',[0,0,6],[W,D,9]);bx('backwall',[0,0,9],[3,D,30]);bx('leftwall',[0,0,9],[W,3,30]);bx('rightwall',[0,69,9],[W,D,30]);bx('frontleft',[63,0,9],[66,20,30]);bx('frontright',[63,54,9],[66,72,30]);bx('fronttop',[63,20,28],[66,54,30]);
 bx('floorleft',[3,3,30],[43,69,33],CERAMIC);bx('floorback',[43,3,30],[63,27,33],CERAMIC);bx('floorfront',[43,47,30],[63,69,33],CERAMIC);
 add('dropwell',[52,37,30],shape(on(PZ(30),rectUV(43,27,63,47)),DARK.d,.5)+line(on(PZ(33.2),rectUV(43,27,63,47)),.8));
 // rear walls are low-opacity glass, separately depth-sorted
 for(const x of[0,W])for(const y of[0,D])bx('post'+x+y,[x-1.8,y-1.8,29],[x+1.8,y+1.8,108]);
 for(const x of[0,W]){bx('sillx'+x,[x-2,0,31],[x+2,D,35]);bx('topx'+x,[x-2,0,105],[x+2,D,109]);}
 for(const y of[0,D]){bx('silly'+y,[0,y-2,31],[W,y+2,35]);bx('topy'+y,[0,y-2,105],[W,y+2,109]);}
 for(const [i,q] of [on(PX(0),rectUV(2,35,70,105)),on(PX(W),rectUV(2,35,70,105)),on(PY(0),rectUV(2,35,64,105)),on(PY(D),rectUV(2,35,64,105))].entries())add('glass'+i,avg(q),`<g opacity=".07">${shape(q,'#bde4e0',.3)}</g>`);
 const capUV=rrUV(-3,109,75,118,2);add('cap',[33,36,114],'<g data-solid="true">'+extrude(capUV,-3,69,m)+shape(on(PX(vis([1,0,0])?69:-3),capUV),tone(vis([1,0,0])?[1,0,0]:[-1,0,0],m),1.2)+hullInk([...on(PX(-3),capUV),...on(PX(69),capUV)],2.3)+'</g>');
 if(vis([1,0,0]))add('sign',[70,36,114],shape(on(PX(69.2),rrUV(12,110,60,117,1)),CERAMIC.l,.8)+tx(69.4,36,111.8,'小小抓物社',3.5));
 // layered front controls, chute opening, coin slot, screws
 add('console',[76,36,29],box(66,1,27,76,71,32,m,tone,.4)+cyl(71,52,32,34,5,DARK));
 if(vis([1,0,0]))add('chute',[67,35,17],shape(on(PX(66.2),rrUV(20,10,54,28,3)),DARK.d,.5)+shape(on(PX(66.4),rrUV(22,11,52,27,2)),DARK.m,.3)+tx(66.5,37,25,'取物口',2.4)+shape(on(PX(66.3),rectUV(6,15,13,17)),DARK.d,.3));
 if(CV[0]<-1e-6){const corners=[];for(const x of[0,W])for(const y of[0,D])for(const z of[6,35])corners.push(P(x,y,z));add('outlet-mask',[0,0,0],`<defs><clipPath id="claw-outlet-mask"><path d="M-10000 -10000H10000V10000H-10000Z${sp(hull(corners))}" clip-rule="evenodd" fill-rule="evenodd"/></clipPath></defs>`);}
 add('outlet-tray',[82.5,37,10],outletExterior(box(66,20,9,99,54,11,METAL)));
 if(vis([0,1,0])){add('side-label',[32,72.2,19],shape(on(PY(72.2),rrUV(13,12,52,25,3)),matOf(m.m).m,.3)+txY(32,72.4,17,'把快乐带回家',3,m.d));for(let i=0;i<4;i++)add('vent'+i,[20,72.2,8+i],line([[7,72.3,8+i],[23,72.3,8+i]],.25));}
 for(const x of[.2,W+.2])add('shine'+x,[x,42,79],`<g opacity=".23">${shape(on(PX(x),[[8,80],[8,94],[60,57],[60,48]]),'#ffffff',0)+shape(on(PX(x),[[10,98],[10,101],[55,70],[55,66]]),'#ffffff',0)}</g>`);
 // steel rails and small fasteners
 for(const y of[9,63])add('rail'+y,[33,y,101],rod([5,y,101],[61,y,101],1.2,METAL));
 for(const x of[5,61])for(const y of[9,63])bx('rail-mount'+x+'-'+y,[x-1.3,y-1.8,100],[x+1.3,y+1.8,109.5],METAL);
 for(const x of[4,62])for(const y of[4,68])add('bolt'+x+y,[x,y,118.2],cyl(x,y,118,118.3,.8,METAL, toneI,.2,10));
 }
 const layers=fixed.slice();const add=(key,at,svg)=>layers.push({key,at,svg});
 // The switch is mounted on the deck, so it must paint after that deck inside
 // the same depth-sorted assembly. Sorting its centre separately puts it behind
 // the much wider console and lets the console swallow both ink and pointer hits.
 {const pressed=s.pressedAct==='drop'||s.phase==='down'&&s.timer<.2,top=35.2-(pressed?.9:0),index=layers.findIndex(p=>p.key==='console'),base=layers[index],visible=exteriorControlVisible(71,20,top,3.7,0);const button=act('drop',cyl(71,20,32,34,5,METAL)+cyl(71,20,34,top,3.7,PALS.mustard),'role="button" tabindex="'+(visible?'0':'-1')+'" aria-hidden="'+!visible+'" aria-label="'+(s.phase==='idle'?'下爪抓取':'机械爪工作中，请稍候')+'"');const joystick=rod([71,52,34],[71+(s.jx||0),52+(s.jy||0),40],1.3,METAL)+ball(71+(s.jx||0),52+(s.jy||0),41,3.3,3.3,3.3,PALS.tomato);layers[index]={...base,svg:outletExterior('<g data-solid="true">'+base.svg+byDepth([{at:[71,20,top],svg:button},{at:[71+(s.jx||0),52+(s.jy||0),41],svg:joystick}])+'</g>')};}
 for(const i of s.stock){if(s.got===i&&s.phase!=='idle')continue;const t=toys[i];let key='toy'+i+'@'+cacheKey;if(!toyCache.has(key))toyCache.set(key,plush(t));add('toyshadow'+i,[t.x,t.y,33.1],`<g opacity=".16">${shape(on(PZ(33.1),ellUV(t.x,t.y,8,9)),INK,0)}</g>`);add('toy'+i,[t.x,t.y,47],act('aim',toyCache.get(key),`data-i="${i}" aria-pressed="${s.target===i}" aria-disabled="${s.phase!=='idle'}" role="button" tabindex="${toyCanBeSeen(t)?0:-1}" aria-hidden="${!toyCanBeSeen(t)}" aria-label="瞄准${t.name}"`));}
 add('aim',[s.x,s.y,33.2],`<g opacity=".7">${shape(on(PZ(33.2),ellUV(s.x,s.y,7,7)),PALS.mustard.l,.35)+line([[s.x-10,s.y,33.3],[s.x+10,s.y,33.3]],.25)+line([[s.x,s.y-10,33.3],[s.x,s.y+10,33.3]],.25)}</g>`);
 add('bridge',[s.x,36,103],rod([s.x,7,103],[s.x,65,103],1.5,METAL)+box(s.x-3,s.y-4,101,s.x+3,s.y+4,106,DARK,toneI,.3));
 let claw=rod([s.x,s.y,101],[s.x,s.y,s.z+6],.5,DARK)+cyl(s.x,s.y,s.z+1,s.z+6,3,METAL,toneI,.4);
 const fingers=[];for(let i=0;i<3;i++){let a=i*Math.PI*2/3,r=9+5*s.open,tip=6.5+7.5*s.open;let A=[s.x+Math.cos(a)*2,s.y+Math.sin(a)*2,s.z+2],B=[s.x+Math.cos(a)*r,s.y+Math.sin(a)*r,s.z-13],C=[s.x+Math.cos(a)*tip,s.y+Math.sin(a)*tip,s.z-23];fingers.push({at:B,svg:rod(A,B,.95,METAL,toneI,.35)+rod(B,C,.85,METAL,toneI,.35)+rod(C,[C[0]-Math.cos(a)*2,C[1]-Math.sin(a)*2,C[2]-.6],.7,METAL,toneI,.3)});}fingers.forEach((p,i)=>add('finger'+i,p.at,p.svg));
 add('claw',[s.x,s.y,s.z],claw);
 if(s.got!==null&&['up','travel','release'].includes(s.phase))add('carried',[s.x,s.y,s.z-21],movedPlush(s.got,s.x+(s.grabDX||0),s.y+(s.grabDY||0),s.z-28));
 if(s.phase==='fall'){meshClip=[2,33];add('falling',[52,37,50],plush(toys[s.got],52,37,s.fallZ));meshClip=null;}
 if(s.phase==='eject'){meshClip=[0,66.5];add('ejecting',[90,37,18],outletExterior(plush(toys[s.got],s.outX,37,18,true)));meshClip=null;}
 if(['prize','collect'].includes(s.phase)){const visible=prizeCanBeSeen();add('prize',[79,37,17],outletExterior(`<g opacity="${s.phase==='collect'?Math.max(0,1-s.timer/.35):1}">`+act('collect',plush(toys[s.got],87,37,18,true),'role="button" tabindex="'+(visible?'0':'-1')+'" aria-hidden="'+!visible+'" aria-label="领取抓到的娃娃"')+'</g>'));}
 const rank=p=>{const k=p.key,d=depthOf(p.at);if(k==='shadow')return -2000;if(k.startsWith('foot'))return -950+d*.001;if(/^(bottom|backwall|leftwall|rightwall|frontleft|frontright|fronttop)$/.test(k))return -900+d*.001;if(k.startsWith('floor'))return -800+d*.001;if(k==='dropwell')return -799;if(k.startsWith('toyshadow'))return -798;if(k==='cap')return 1000;if(k.startsWith('bolt'))return 1001;if(k==='sign')return 2000;return d;};
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
 ui.animate(dt=>{if(id!==s.aimMotion||s.phase!=='idle')return false;time+=dt;const k=Math.min(1,time/.65),e=ease(k);s.x=fromX+(t.x-fromX)*e;s.y=fromY+(t.y-fromY)*e;
 if(k===1){s.aiming=false;s.moving=false;s.message='已对准'+t.name+'，现在可以下爪；也可微调。';return false;}return true;});
}
function restock(s,ui){
 if(s.phase!=='idle')return clawBlocked(ui,'先完成并领取这一轮，再重新摆放');
 releaseControls(true);cancelAim(s);s.stock=toys.map((_,i)=>i);s.won=[];s.tries=0;s.result=null;s.target=null;s.x=45;s.y=19;s.message='新一轮已摆好，点娃娃瞄准后下爪。';ui.observation?.reset();window.MechanicalAudio?.reset();ui.invalidate();
}
function collect(s,ui){
 if(s.phase!=='prize')return clawBlocked(ui,s.phase==='idle'?'还没有待领取的娃娃，先瞄准并下爪':'娃娃正在送到取物口，请稍候');
 s.phase='collect';s.timer=0;s.message='正在领取'+toys[s.got].name+'…';window.MechanicalAudio?.pulse('pop');
 const fromX=s.x,fromY=s.y;ui.animate(dt=>{s.timer+=dt;if(s.phase==='collect'&&s.timer>=.35){s.won.push(toys[s.got].name);s.stock=s.stock.filter(i=>i!==s.got);s.got=null;s.phase='return';s.timer=0;s.message='已领取！机械爪正在回位…';}
 if(s.phase==='return'){const k=Math.min(1,s.timer/.7),e=ease(k);s.x=fromX+(45-fromX)*e;s.y=fromY+(19-fromY)*e;s.moving=true;if(k===1){s.phase='idle';s.moving=false;s.target=null;s.z=REST;s.open=1;s.result='won';s.message=s.stock.length?'领取成功！还剩'+s.stock.length+'只，点下一只继续。':'四只全部收集完成！点击“再玩一轮”重新摆放。';return false;}}return true;});
}
function drop(s,ui){
 if(s.phase==='prize')return clawBlocked(ui,'先领取取物口的娃娃，再开始下一轮');
 if(s.phase!=='idle')return clawBlocked(ui,'机械爪正在工作，请等这一轮完成');
 if(s.aiming)return clawBlocked(ui,'正在自动瞄准，等爪子停稳后再下爪');
 if(!s.stock.length)return restock(s,ui);
 releaseControls(true);cancelAim(s);s.phase='down';s.timer=0;s.tries++;s.got=null;s.result=null;s.grabDX=s.grabDY=0;s.message='① 下爪中，请稍候…';window.MechanicalAudio?.pulse('click');let ox=s.x,oy=s.y;
 const phase=(p,msg)=>{s.phase=p;s.timer=0;if(msg)s.message=msg;};
 ui.animate(dt=>{s.timer+=dt;let k;switch(s.phase){
 case'down':k=Math.min(1,s.timer/1.3);s.z=REST+(GRIP-REST)*ease(k);if(k===1)phase('close','② 爪子正在合拢…');break;
 case'close':s.open=Math.max(0,1-s.timer/.6);if(s.timer>=.6){s.got=s.stock.find(i=>Math.hypot(toys[i].x-s.x,toys[i].y-s.y)<4.5)??null;if(s.got!==null){s.grabDX=s.catchDX=toys[s.got].x-s.x;s.grabDY=s.catchDY=toys[s.got].y-s.y;}phase('up',s.got===null?'没抓住，机械爪正在收回…':'③ 抓稳了，正在提升…');}break;
 case'up':k=Math.min(1,s.timer/1.4);s.z=GRIP+(REST-GRIP)*ease(k);if(s.got!==null){s.grabDX=s.catchDX*(1-ease(k));s.grabDY=s.catchDY*(1-ease(k));}if(k===1){if(s.got===null){phase('reopen');break;}phase('travel','④ 正在移向投放口…');}break;
 case'reopen':s.open=Math.min(1,s.timer/.35);if(s.open===1){s.phase='idle';s.result='miss';s.message='这次落空了。点一只娃娃自动对准，再试一次。';window.MechanicalAudio?.pulse('cue');return false;}break;
 case'travel':k=Math.min(1,s.timer/1.7);s.x=ox+(52-ox)*ease(k);s.y=oy+(37-oy)*ease(k);if(k===1)phase('release','⑤ 松爪，娃娃落入滑道…');break;
 case'release':s.open=Math.min(1,s.timer/.35);if(s.timer>=.35){s.fallZ=REST-28;phase('fall');}break;
 case'fall':s.fallZ=REST-28-80*s.timer*s.timer;if(s.fallZ<8){s.outX=45;phase('eject','⑥ 娃娃沿机内滑道送出…');}break;
 case'eject':k=Math.min(1,s.timer/1.1);s.outX=45+42*ease(k);if(k===1){phase('prize','抓到'+toys[s.got].name+'啦！点击取物口或“领取娃娃”。');return false;}break;
 }return true;});
}

const ui=mountFigure({title:'手绘抓娃娃机',hint:'转一转，看清楚，再把快乐带回家。',size:[W,D,H],homeView:[38,23],palette:'mint',state:st,scene,credit:false,buttonsLabel:'抓取操作',buttons:[{label:'下爪',onClick:drop},{label:'领取娃娃',onClick:collect},{label:'重新摆放',onClick:restock }],acts:{aim:(s,e,u)=>aim(s,+e.dataset.i,u),drop:(s,e,u)=>drop(s,u),collect:(s,e,u)=>collect(s,u)},readout:s=>s.message});
document.getElementById('fig').setAttribute('aria-label','抓娃娃机，方向键微调，空格下爪，Shift 加方向键旋转视角，点选娃娃瞄准');
const panel=document.createElement('div');panel.className='gamepad';panel.innerHTML='<div class="pad"><button data-dir="far">向上</button><button data-dir="left">向左</button><button data-dir="near">向下</button><button data-dir="right">向右</button></div><p id="collection"></p>';document.getElementById('readout').after(panel);

const hint=document.createElement('p');hint.style='max-width:760px;width:100%;font-size:11px;color:var(--muted);margin:10px 0 0';hint.textContent='拖动红色摇杆移动 · 点娃娃瞄准 · 空格下爪 · 拖空白旋转';document.querySelector('header').after(hint);
const oldRender=ui.render;ui.render=()=>{oldRender();document.getElementById('collection').textContent=`已领取 ${st.won.length} 只 · 尝试 ${st.tries} 次`+(st.won.length?' · '+st.won.slice(-4).join('、'):'');};
let held=null,heldInput=null,holdRunning=false,boundaryNoted=false;
function screenDirection(dx,dy){const a=Dv(1,0,0),b=Dv(0,1,0),det=a[0]*b[1]-a[1]*b[0];let x=(dx*b[1]-dy*b[0])/det,y=(a[0]*dy-a[1]*dx)/det,n=Math.hypot(x,y)||1;return[x/n,y/n];}
function centerStick(){const x=st.jx||0,y=st.jy||0;const id=st.stickMotion=(st.stickMotion||0)+1;let t=0;ui.animate(dt=>{if(id!==st.stickMotion)return false;t+=dt;const k=1-ease(Math.min(1,t/.16));st.jx=x*k;st.jy=y*k;return t<.16;});}
function stopHold(input=null){if(!held||input&&(input.kind!==heldInput?.kind||input.id!==heldInput?.id||input.node!==heldInput?.node))return;const previous=heldInput;held=null;heldInput=null;if(previous?.kind==='pointer'&&previous.node.hasPointerCapture?.(previous.id))previous.node.releasePointerCapture(previous.id);st.moving=false;centerStick();if(st.phase==='idle'&&!st.aiming)st.message='移动已停止；对准后可以下爪，或继续微调。';panel.querySelectorAll('button').forEach(b=>b.classList.remove('is-held'));ui.invalidate();}
// A zero/tiny animation dt is not a rail stop. Only actual limits in every
// requested axis can block a movement; one free axis still permits sliding.
function atMovementLimit(dx,dy){const blocked=(value,d,lo,hi)=>Math.abs(d)<1e-7||d<0&&value<=lo+1e-7||d>0&&value>=hi-1e-7;return Math.hypot(dx,dy)>1e-7&&blocked(st.x,dx,14,52)&&blocked(st.y,dy,14,58);}
function move(dir,dt){if(st.phase!=='idle')return;const a={left:[-1,0],right:[1,0],far:[0,-1],near:[0,1]}[dir],d=screenDirection(...a),x=st.x,y=st.y;st.x=Math.max(14,Math.min(52,st.x+d[0]*24*dt));st.y=Math.max(14,Math.min(58,st.y+d[1]*24*dt));st.jx=d[0]*3.3;st.jy=d[1]*3.3;st.target=null;st.moving=Math.hypot(st.x-x,st.y-y)>.001;if(!st.moving&&atMovementLimit(...d)&&!boundaryNoted){boundaryNoted=true;ui.feedback('已经到达这一侧边缘，换个方向试试','blocked');}else if(st.moving)boundaryNoted=false;ui.invalidate();}
function hold(dir,input){if(joy)stopJoy();if(st.phase!=='idle')return clawBlocked(ui,st.phase==='prize'?'先领取娃娃，再移动机械爪':'机械爪工作中，完成后才能移动');if(!st.stock.length)return clawBlocked(ui,'已经全部领取，点击“再玩一轮”');stopHold();cancelAim(st);st.stickMotion=(st.stickMotion||0)+1;held=dir;heldInput=input;st.message='正在移动，松开停止；对准后下爪。';panel.querySelectorAll('button').forEach(b=>b.classList.toggle('is-held',b.dataset.dir===dir));if(holdRunning)return true;holdRunning=true;move(dir,.04);ui.animate(dt=>{if(!held||st.phase!=='idle'){holdRunning=false;stopHold();return false;}move(held,dt);return true;});return true;}
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
 b.onpointerdown=e=>{if(e.isPrimary===false||e.button)return;e.preventDefault();b.focus({preventScroll:true});if(hold(b.dataset.dir,{kind:'pointer',id:e.pointerId,node:b}))b.setPointerCapture(e.pointerId)};
 b.onpointerup=b.onpointercancel=b.onlostpointercapture=e=>stopHold({kind:'pointer',id:e.pointerId,node:b});
 b.onkeydown=e=>{if(modifiedKey(e)||e.key!=='Enter'&&e.key!==' ')return;e.preventDefault();e.stopPropagation();if(!e.repeat&&beginKeyClick(b,e.key))hold(b.dataset.dir,{kind:'key',id:e.key,node:b})};
 b.onkeyup=e=>{if(e.key==='Enter'||e.key===' '){if(!modifiedKey(e)){e.preventDefault();e.stopPropagation();}endKeyClick(b,e.key);stopHold({kind:'key',id:e.key,node:b})}};
 b.onblur=()=>{endKeyClick(b);if(heldInput?.node===b)stopHold()};
 b.onclick=e=>{if(e.detail===0&&!keyClicks.has(b)&&!modifiedKey(e)){if(st.phase!=='idle')return clawBlocked(ui,'请等待当前抓取完成');if(!st.stock.length)return clawBlocked(ui,'已经全部领取，点击“再玩一轮”');releaseControls(true);cancelAim(st);move(b.dataset.dir,.16);st.moving=false;centerStick();ui.invalidate()}};
}
addEventListener('keydown',e=>{if(modifiedKey(e)||e.shiftKey){if(heldInput?.kind==='key')stopHold();return;}if(e.defaultPrevented||!gameKeyTarget(e.target))return;const d={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'far',ArrowDown:'near'}[e.key];if(d){e.preventDefault();if(!e.repeat)hold(d,{kind:'key',id:e.key,node:panel.contains(e.target)?e.target:model});}if((e.code==='Space'||e.key===' ')&&e.target===model){e.preventDefault();if(!e.repeat)drop(st,ui);}});
addEventListener('keyup',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&heldInput?.kind==='key'&&heldInput.id===e.key)stopHold()});
document.addEventListener('focusin',e=>{if(heldInput?.kind==='key'&&heldInput.node!==(panel.contains(e.target)?e.target:gameKeyTarget(e.target)?model:null))stopHold()});
addEventListener('blur',()=>{stopHold();clearKeyClicks()});ui.render();

setCam(38,23);ui.render();

/* Stable screen-sized joystick hit region, separate from redrawable ink geometry. */
const joySvg=document.getElementById('fig'),joyHit=document.createElementNS('http://www.w3.org/2000/svg','circle');
joyHit.setAttribute('fill','transparent');joyHit.setAttribute('stroke','transparent');joyHit.setAttribute('role','button');joyHit.setAttribute('tabindex','0');joyHit.setAttribute('aria-label','红色摇杆，按住并拖动控制爪子，松开停止');joyHit.style='pointer-events:all;cursor:move;touch-action:none';joySvg.appendChild(joyHit);
let joy=null;
function stopJoy(){if(!joy)return;const id=joy.id;joy=null;if(joyHit.hasPointerCapture?.(id))joyHit.releasePointerCapture(id);st.moving=false;centerStick();if(st.phase==='idle'&&!st.aiming)st.message='摇杆已松开，爪子停止；对准后下爪。';ui.invalidate();}
function releaseControls(quiet=false){stopHold();stopJoy();st.moving=false;if(quiet)ui.clearFeedback?.();}
const joyRender=ui.render;ui.render=()=>{joyRender();const wasFocused=document.activeElement===joyHit,p=P(71,52,41),r=joySvg.getBoundingClientRect(),visible=exteriorControlVisible(71+(st.jx||0),52+(st.jy||0),41,3.3);joyHit.setAttribute('cx',p[0]);joyHit.setAttribute('cy',p[1]);joyHit.setAttribute('r',Math.max(5,22*joySvg.viewBox.baseVal.width/r.width));joyHit.style.display=visible?'':'none';joyHit.setAttribute('tabindex',visible?'0':'-1');joyHit.setAttribute('aria-hidden',!visible);joyHit.setAttribute('aria-disabled',st.phase!=='idle');if(!visible){if(wasFocused)joySvg.focus({preventScroll:true});if(joy)stopJoy();}};
joyHit.addEventListener('pointerdown',e=>{if(joy||e.isPrimary===false||e.button)return;e.preventDefault();e.stopPropagation();joyHit.focus({preventScroll:true});if(st.phase!=='idle'){clawBlocked(ui,st.phase==='prize'?'请先领取取物口的娃娃':'机械爪工作中，请等待这一轮结束');return;}if(!st.stock.length)return clawBlocked(ui,'已经全部领取，点击“再玩一轮”');stopHold();cancelAim(st);st.stickMotion=(st.stickMotion||0)+1;joy={id:e.pointerId,x:e.clientX,y:e.clientY,vx:0,vy:0};joyHit.setPointerCapture(e.pointerId);st.message='摇杆控制中，松开立即停止。';ui.animate(dt=>{if(!joy||st.phase!=='idle'){stopJoy();return false;}const x=st.x,y=st.y;st.x=Math.max(14,Math.min(52,st.x+joy.vx*24*dt));st.y=Math.max(14,Math.min(58,st.y+joy.vy*24*dt));st.moving=Math.hypot(st.x-x,st.y-y)>.001;st.target=null;if(!st.moving&&Math.hypot(joy.vx,joy.vy)>.1&&atMovementLimit(joy.vx,joy.vy)&&!boundaryNoted){boundaryNoted=true;ui.feedback('已经到达边缘，换个方向试试','blocked');}else if(st.moving)boundaryNoted=false;return true;});});
joyHit.addEventListener('pointermove',e=>{if(!joy||e.pointerId!==joy.id)return;e.preventDefault();e.stopPropagation();let dx=e.clientX-joy.x,dy=e.clientY-joy.y,len=Math.hypot(dx,dy),strength=Math.min(1,Math.max(0,(len-3)/25));if(len<3){joy.vx=joy.vy=st.jx=st.jy=0;return;}dx/=len;dy/=len;const a=Dv(1,0,0),b=Dv(0,1,0),det=a[0]*b[1]-a[1]*b[0];let wx=(dx*b[1]-dy*b[0])/det,wy=(a[0]*dy-a[1]*dx)/det,n=Math.hypot(wx,wy);joy.vx=wx/n*strength;joy.vy=wy/n*strength;st.jx=joy.vx*3.3;st.jy=joy.vy*3.3;});
for(const event of ['pointerup','pointercancel','lostpointercapture'])joyHit.addEventListener(event,e=>{e.stopPropagation();if(joy&&e.pointerId===joy.id)stopJoy();});
joyHit.addEventListener('keydown',e=>{if(!modifiedKey(e)&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();if(!e.repeat&&beginKeyClick(joyHit,e.key)){if(e.key===' ')drop(st,ui);else ui.flash('使用方向键移动爪子，空格下爪');}}});
joyHit.addEventListener('keyup',e=>{if(e.key==='Enter'||e.key===' ')endKeyClick(joyHit,e.key)});
joyHit.addEventListener('blur',()=>{endKeyClick(joyHit);stopJoy()});
joyHit.addEventListener('click',e=>{e.stopPropagation();if(e.detail===0&&!keyClicks.has(joyHit)&&!modifiedKey(e))ui.flash('使用方向键移动爪子，空格下爪')});addEventListener('blur',stopJoy);document.addEventListener('visibilitychange',()=>{if(document.hidden){stopHold();stopJoy();clearKeyClicks();}});
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
for(const detail of[prefs,help])detail.addEventListener('toggle',updateExtrasOverflow);addEventListener('resize',updateExtrasOverflow);updateExtrasOverflow();

/* Shared ten-object visual system; renderer and game state stay unchanged. */


ui.render();updateExtrasOverflow();
const galleryLink=document.createElement('a');galleryLink.className='gallery-link';galleryLink.href='https://paper-mechanical-museum.chuangcius.chatgpt.site';galleryLink.textContent='返回小物馆';heading.querySelector('span')?.remove();heading.append(galleryLink);

/* Stage-aware actions remain focusable so a blocked press explains itself. */
const clawProgress=document.createElement('div');clawProgress.className='toy-progress';clawProgress.setAttribute('role','progressbar');clawProgress.setAttribute('aria-label','本轮抓取进度');clawProgress.innerHTML='<span></span>';readout.after(clawProgress);
window.MechanicalAudio?.attach('claw',actions);
const phaseLabels={down:'下爪中…',close:'正在合爪…',up:'正在提升…',reopen:'正在复位…',travel:'正在运送…',release:'正在松爪…',fall:'娃娃滑落中…',eject:'正在送出…',prize:'请先领取娃娃',collect:'正在领取…',return:'机械爪回位中…'};
const phaseProgress={down:10,close:25,up:40,reopen:85,travel:60,release:75,fall:82,eject:92,prize:100,collect:100,return:100};
const tactileRender=ui.render;ui.render=()=>{tactileRender();const idle=st.phase==='idle',prize=st.phase==='prize';primaryButtons[0].disabled=false;primaryButtons[1].disabled=false;
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
clawObservation=window.MuseumObservation?.mount({host:extras,state:st,read:readClawObservation,title:'看动作懂原理',intro:'读数对应导轨、吊索和爪指的当前状态。抓取保留原速，不改变按住移动或松手停止的手感。',slow:false,onChange:()=>{ui.render();updateExtrasOverflow();}});
ui.render();updateExtrasOverflow();

ui.observation=clawObservation;
