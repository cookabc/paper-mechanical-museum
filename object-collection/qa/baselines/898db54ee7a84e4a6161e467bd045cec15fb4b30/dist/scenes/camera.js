(()=>{window.SCENES=window.SCENES||{};window.SCENES.camera=()=>{
 const fresh=()=>({phase:'idle',phaseTime:0,flash:0,shutterPress:0,eject:0,develop:0,take:0,reload:0,frames:5,collected:0,scene:0,run:0});const state=fresh();let running=false,grab=null;
 const names=['山间日出','海边灯塔','春日原野'];
 // One read-only mechanical snapshot drives both the real body and its optional
 // cutaway. No paper-path clock: changing phaseTime alone cannot move either.
 const FEED_LENGTH=31,ROLLER_RADIUS=.85;
 const paperPath=s=>({phase:s.phase,feed:s.eject,develop:s.develop,spin:-FEED_LENGTH*(s.collected+s.eject)/ROLLER_RADIUS,height:FEED_LENGTH*s.eject,lift:18*ease(s.take),opacity:1-ease(s.take),shutterDrop:s.shutterPress*2,flash:s.flash,hatchLift:Math.sin(Math.PI*s.reload)*7,frames:s.frames,hasSheet:s.phase==='idle'?s.frames>0:s.phase!=='loading'});
 let focusPhase=null,focusRun=-1;
 const rollerFocused=s=>focusPhase===s.phase&&focusRun===s.run;
 function mountPaperPath(ui){
  const observer=ui.observation,panel=observer?.panel;if(!panel)return;
  const host=panel.querySelector('.observation-content')||panel;
  if(host.querySelector('.camera-paper-path'))return;
  let style=document.getElementById('camera-paper-path-style');if(!style){style=document.createElement('style');style.id='camera-paper-path-style';style.textContent=`.camera-paper-path{margin:10px 0 0;border-top:1px dashed var(--rule,#d8d1c3);max-width:100%;min-width:0}.camera-paper-path>summary{font-size:11px!important;padding:9px 0!important}.camera-paper-path svg{display:block;width:100%;height:auto;max-height:188px;overflow:hidden;color:var(--ink,#231e16)}.camera-paper-path text{font-family:inherit;font-size:10px;fill:currentColor}.camera-paper-path p{font-size:10px!important;line-height:1.6!important;margin:5px 0!important;overflow-wrap:anywhere}.camera-path-rollers{cursor:pointer;outline:none}.camera-path-rollers .camera-path-hit{fill:transparent;stroke:transparent}.camera-path-rollers:focus-visible .camera-path-hit,.camera-path-rollers[aria-pressed=true] .camera-path-hit{stroke:#a25f35;stroke-dasharray:2 2}.camera-path-rollers[aria-pressed=true] circle{stroke:#a25f35;stroke-width:1.8}`;document.head.append(style);}
  const node=(tag,attrs,parent,text,svg=false)=>{const el=svg?document.createElementNS('http://www.w3.org/2000/svg',tag):document.createElement(tag);for(const [key,value]of Object.entries(attrs||{}))el.setAttribute(key,value);if(text!==undefined)el.textContent=text;parent?.append(el);return el;};
  const fold=node('details',{class:'camera-paper-path'},host);node('summary',{},fold,'内部走纸图 · 简化示意');
  const diagram=node('svg',{viewBox:'0 0 270 188',role:'group','aria-label':'相纸从曝光区向上穿过滚轮，出片后显影的简化剖面'},fold,undefined,true),draw=(tag,attrs,parent=diagram,text)=>node(tag,attrs,parent,text,true);
  draw('rect',{x:68,y:68,width:112,height:96,rx:8,fill:'#faf8f2',stroke:'#766d5f','stroke-dasharray':'3 3'});
  draw('circle',{cx:68,cy:119,r:14,fill:'#e5decf',stroke:'#231e16'});draw('circle',{cx:68,cy:119,r:8,fill:'#faf8f2',stroke:'#231e16'});
  draw('path',{d:'M83 119H114M153 48V19M149 24L153 19L157 24',fill:'none',stroke:'#766d5f','stroke-width':1});
  draw('text',{x:156,y:14},diagram,'相纸上行');
  const glow=draw('rect',{x:89,y:99,width:27,height:33,rx:3,fill:'#edc579',opacity:0});
  const sheet=draw('g',{'data-camera-path-sheet':'',opacity:1});
  draw('rect',{x:120,y:68,width:8,height:55,rx:1,fill:'#fffdf6',stroke:'#231e16'},sheet);
  const image=draw('rect',{x:121.5,y:72,width:5,height:37,fill:'#859c97',opacity:0},sheet);
  draw('path',{d:'M105 68H119M129 68H145',stroke:'#231e16','stroke-width':2});
  const rollers=draw('g',{class:'camera-path-rollers',role:'button',tabindex:0,'aria-label':'在机身上标出滚轮，不改变观察角度','aria-pressed':'false','data-camera-path-part':'camera-rollers'});
  draw('rect',{class:'camera-path-hit',x:94,y:49,width:60,height:38,rx:5},rollers);
  const rollMarks=[];for(const [cx,direction]of [[110,1],[138,-1]]){draw('circle',{cx,cy:68,r:9,fill:'#e5decf',stroke:'#231e16'},rollers);const mark=draw('path',{d:`M${cx} 68h6`,stroke:'#231e16','stroke-width':1.2},rollers);rollMarks.push({mark,cx,direction});}
  const shutter=draw('rect',{x:160,y:60,width:12,height:7,rx:2,fill:'#cf8269',stroke:'#231e16'});
  const stack=[];for(let i=0;i<5;i++)stack.push(draw('path',{d:`M109 ${140+i*3}h33`,fill:'none',stroke:'#766d5f'}));
  const hatch=draw('path',{d:'M107 158h39',stroke:'#231e16','stroke-width':1.5});
  draw('path',{d:'M38 119H52M148 76L177 88M128 35H184M146 146H188',fill:'none',stroke:'#b7ad9b'});
  draw('text',{x:3,y:116},diagram,'① 曝光');draw('text',{x:180,y:92},diagram,'② 滚轮');draw('text',{x:187,y:38},diagram,'③ 显影');
  const stock=draw('text',{x:190,y:149},diagram,'纸盒 · 5 张');
  node('p',{},fold,'剖面与双轮夹送仅作简化示意。点滚轮可对应机身；出片完成后，纸停而颜色继续显现。');
  const status=node('p',{'data-camera-path-status':'','aria-live':'off'},fold,'展开后同步当前动作。');
  const put=(el,key,value)=>{const text=String(value);if(el.getAttribute(key)!==text)el.setAttribute(key,text);},write=(el,text)=>{if(el.textContent!==text)el.textContent=text;};
  function update(){
   // Neither a closed cutaway, its closed parent, nor a hidden tab incurs DOM writes.
   if(!fold.open||!panel.open||document.hidden)return;
   const p=paperPath(state),selected=rollerFocused(state),ratio=55/FEED_LENGTH;
   put(diagram,'data-phase',p.phase);put(diagram,'data-feed',p.feed);put(diagram,'data-develop',p.develop);put(diagram,'data-spin',p.spin);
   put(sheet,'transform',`translate(0 ${-(p.height+p.lift)*ratio})`);put(sheet,'opacity',p.hasSheet?p.opacity:0);put(image,'opacity',p.develop);
   put(glow,'opacity',p.flash);put(shutter,'transform',`translate(0 ${p.shutterDrop})`);put(hatch,'transform',`rotate(${-p.hatchLift*7} 107 158)`);
   for(const {mark,cx,direction}of rollMarks)put(mark,'transform',`rotate(${direction*p.spin*180/Math.PI} ${cx} 68)`);
   stack.forEach((line,i)=>put(line,'opacity',i<p.frames?1:0));put(rollers,'aria-pressed',selected);write(stock,`纸盒 · ${p.frames} 张`);
   write(status,selected?'已标出机身滚轮；再点取消，观察角度不变。':`出片 ${Math.round(p.feed*100)}% · 显影 ${Math.round(p.develop*100)}% · ${p.phase==='ejecting'?'滚轮随纸转动':'滚轮停住'}`);
  }
  const original=observer.update.bind(observer);observer.update=()=>{if(!fold.open||!panel.open||document.hidden||!rollerFocused(state))focusPhase=null;original();update();};
  fold.addEventListener('toggle',()=>{if(!fold.open)focusPhase=null;observer.update();ui.invalidate();if(fold.open){const extras=panel.parentElement;if(extras&&extras.scrollHeight>extras.clientHeight)extras.scrollTop+=fold.getBoundingClientRect().top-extras.getBoundingClientRect().top;}});
  const select=()=>{if(!fold.open||!panel.open)return;if(rollerFocused(state))focusPhase=null;else{focusPhase=state.phase;focusRun=state.run;}observer.update();ui.invalidate();};
  rollers.addEventListener('click',select);rollers.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();select();}});
 }

 const observe=(id,svg)=>`<g data-observe-part="${id}">${svg}</g>`;
 function observation(s){let stage,text,active;
  if(s.phase==='flash'){stage='快门曝光';text='松开快门后消耗一张相纸，闪光亮起、按钮回弹；本示意使用程序风景，不调用摄像头。';active=['camera-shutter','camera-lens'];}
  else if(s.phase==='ejecting'){stage='滚轮出片';text='滚轮转动带相纸上行，转角与推出距离相对应；真实即时相纸也借滚轮挤压、铺开显影药剂。';active=['camera-rollers','camera-slot'];}
  else if(s.phase==='developing'){stage='等待显影';text='相纸已全部推出，滚轮停止；这里用颜色逐渐显现来示意显影，真实相纸靠内部化学反应完成。';active=['camera-photo'];}
  else if(s.phase==='ready'){stage='显影完成';text='风景已完整显现，相纸停在出片口；取走收藏后，才能拍摄下一张。';active=['camera-photo'];}
  else if(s.phase==='collecting'){stage='取走照片';text='照片向上离开出片口；完全取走后才计入收藏，下一张拍摄随后解锁。';active=['camera-photo'];}
  else if(s.phase==='loading'){stage='装入相纸';text='纸盒盖打开后合回；装入动作完成时，剩余相纸才恢复为五张。';active=['camera-hatch'];}
  else{stage=s.shutterPress?'按住待拍':s.frames?'准备拍摄':'相纸用完';text=s.shutterPress?'按钮已下沉，还没有消耗相纸；松开才拍摄，移开或按 Esc 取消。':s.frames?'按住快门，再松开触发曝光、出片与显影；取景为程序绘制的风景，不需要摄像头权限。':'五张相纸已用完，快门不会继续消耗相纸；装入新纸盒后才能拍摄。';active=['camera-shutter'];}
  if(rollerFocused(s)&&!active.includes('camera-rollers'))active=[...active,'camera-rollers'];
  return {stage,text,active,paperPath:paperPath(s),readouts:[{label:'剩余相纸',value:`${s.frames} 张`},{label:'出片',value:`${Math.round(s.eject*100)}%`},{label:'显影',value:`${Math.round(s.develop*100)}%`},{label:'已收藏',value:`${s.collected} 张`}]};
 }
 const working=s=>['flash','ejecting','developing','collecting','loading'].includes(s.phase);
 const shutterLabel=s=>s.phase==='idle'?(s.frames?'按下快门':'相纸已用完'):s.phase==='ready'?'先取走照片':s.phase==='loading'?'相纸装入中':s.phase==='collecting'?'正在收好照片':'正在冲印照片';
 function drive(s,ui){if(running)return;running=true;const run=s.run;ui.animate(dt=>{if(run!==s.run)return false;s.phaseTime+=dt;const t=s.phaseTime;
  if(s.phase==='flash'){s.shutterPress=Math.max(0,1-t/.22);s.flash=Math.max(0,1-t/.24);if(t>=.3){s.phase='ejecting';s.flash=0;s.shutterPress=0;s.phaseTime=0;}}
  else if(s.phase==='ejecting'){s.eject=Math.min(1,t/1.4);if(s.eject===1){s.phase='developing';s.phaseTime=0;}}
  else if(s.phase==='developing'){s.develop=Math.min(1,t/3.2);if(s.develop===1){s.phase='ready';ui.flash('照片显影完成，点击相纸取走收藏');}}
  else if(s.phase==='collecting'){s.take=Math.min(1,t/.48);if(s.take===1){s.collected++;s.phase='idle';s.eject=s.develop=s.take=0;ui.flash(`已收藏第 ${s.collected} 张照片${s.frames?'，可以再拍一张':'，相纸已用完，请装入新相纸'}`);}}
  else if(s.phase==='loading'){s.reload=Math.min(1,t/.9);if(s.reload===1){s.frames=5;s.reload=0;s.phase='idle';ui.flash('五张新相纸已装好，可以拍摄了');}}
  if(!working(s)){running=false;return false;}return true;});}
 function shutter(s,ui){if(s.phase!=='idle')return ui.flash(s.phase==='ready'?'先取走已显影的照片，再拍下一张':s.phase==='loading'?'相纸正在装入，请稍等':'相机正在处理这一张，请稍等');if(!s.frames)return ui.flash('相纸用完了，点击「装入五张相纸」再拍');s.frames--;s.phase='flash';s.phaseTime=0;s.flash=s.shutterPress=1;s.eject=s.develop=s.take=0;drive(s,ui);ui.invalidate();}
 function collect(s,ui){if(s.phase!=='ready')return ui.flash(s.phase==='idle'?'先拍一张照片，显影完成后可收藏':s.phase==='collecting'?'正在收好这张照片':'请等照片完全显影，再取走收藏');s.phase='collecting';s.phaseTime=0;s.take=0;window.MechanicalAudio?.pulse?.('latch');drive(s,ui);ui.invalidate();}
 function load(s,ui){if(s.phase!=='idle')return ui.flash(s.phase==='loading'?'相纸正在装入，不用重复按':'请先完成冲印并取走照片');if(s.frames)return ui.flash(`还有 ${s.frames} 张相纸，先用完再换新纸盒`);s.phase='loading';s.phaseTime=0;s.reload=0;window.MechanicalAudio?.pulse?.('latch');drive(s,ui);ui.invalidate();}
 function change(s,ui){if(s.phase!=='idle')return ui.flash('这一张的取景已锁定，取走照片后再换风景');s.scene=(s.scene+1)%3;window.MechanicalAudio?.pulse?.('tick');ui.flash('取景已换成'+names[s.scene]);ui.invalidate();}
 function release(ui,cancel=false){if(!grab)return;const old=grab;grab=null;state.shutterPress=0;try{if(old.svg.hasPointerCapture(old.id))old.svg.releasePointerCapture(old.id)}catch{}if(!cancel&&!old.cancelled)shutter(state,ui);else ui.invalidate();}
 function reset(s,ui){release(ui,true);const run=s.run+1;running=false;Object.assign(s,fresh(),{run});ui.flash('相机已复位，装好五张相纸');ui.invalidate();}
 const access=t=>`role="button" tabindex="0" aria-label="${t}"`;
 function landscape(plane,u0,v0,u1,v1,n,opacity=1){const w=u1-u0,h=v1-v0,pt=q=>plane([u0+w*q[0],v0+h*q[1]]),poly=(q,c)=>shape(q.map(pt),c,.2);let out=poly([[0,0],[1,0],[1,1],[0,1]],['#b7d3d4','#badce2','#d0d9bd'][n]);out+=shape(on(plane,ellUV(u0+w*.76,v0+h*.75,w*.1,h*.1,18)),'#edc579',.2);
 if(n===0){out+=poly([[0,0],[0,.37],[.3,.83],[.65,.23],[1,.56],[1,0]],'#859c97')+poly([[0,0],[.21,.33],[.48,.68],[.83,.23],[1,.44],[1,0]],'#668477')+poly([[.37,.52],[.48,.68],[.59,.52],[.5,.55],[.45,.5]],'#f4eee1')+poly([[.15,0],[.43,.2],[.56,.23],[.42,.05],[.55,0]],'#b6d6dc');}
 else if(n===1){out+=poly([[0,0],[1,0],[1,.46],[0,.46]],'#7eafbc')+poly([[.55,0],[1,0],[1,.32],[.82,.4]],'#bdba8e')+poly([[.75,.3],[.87,.3],[.85,.72],[.78,.72]],'#faf2da')+poly([[.75,.72],[.88,.72],[.815,.82]],'#c27e64')+poly([[.77,.58],[.86,.58],[.85,.63],[.78,.63]],'#c27e64');for(let i=0;i<3;i++)out+=poly([[.08,.12+i*.1],[.43,.12+i*.1],[.42,.13+i*.1],[.1,.13+i*.1]],'#d5e4dc');}
 else{out+=poly([[0,0],[1,0],[1,.45],[.6,.6],[.25,.35],[0,.5]],'#92b17e')+poly([[0,0],[1,0],[1,.2],[.45,.38],[0,.25]],'#c5c584');for(const [x,y]of[[.22,.2],[.53,.18],[.76,.12],[.35,.31]])out+=shape(on(plane,ellUV(u0+w*x,v0+h*y,w*.025,h*.035,8)),'#e9b1aa',.15);}
 return `<g opacity="${opacity}">${out}</g>`;}
 let cache='',fixed=[];
 function scene(s,m){const path=paperPath(s),key=[YAW,PITCH,s.pal].join();if(cache!==key){cache=key;fixed=[];const a=(key,at,svg)=>fixed.push({key,at,svg});
 a('shadow',[0,0,-10],castShadow([[0,0,0],[43,0,0],[43,66,0],[0,66,0],[0,0,48],[43,66,48]]));a('base',[23,33,5],box(3,3,2,45,63,9,DARK,tone,.8));const profile=rrUV(0,7,66,48,5);a('body',[23,33,27],extrude(profile,0,44,m)+shape(on(PX(vis([1,0,0])?44:0),profile),tone(vis([1,0,0])?[1,0,0]:[-1,0,0],m),1)+hullInk([...on(PX(0),profile),...on(PX(44),profile)],2));a('top',[19,33,49],box(3,4,48,36,62,49,CERAMIC,tone,.7));
 a('lensbase',[47,33,27],cylX(44,48,33,28,14,DARK,toneI,.7));a('lensring',[51,33,28],cylX(48,53,33,28,11,METAL,toneI,.6));a('lens',[55,33,28],observe('camera-lens',cylX(53,57,33,28,8.9,DARK,toneI,.6)));if(vis([1,0,0])){a('glass',[57.2,33,28],shape(on(PX(57.2),ellUV(33,28,6.8,6.8)), '#3b5559',.5)+shape(on(PX(57.3),ellUV(31,31,1.5,2)), '#a3c6c5',.2)+shape(on(PX(57.4),ellUV(35,26,2,2.7)), '#273c42',.2));a('viewfinder',[46,14,39],box(44,6,35,46,20,44,DARK,tone,.4)+shape(on(PX(46.2),rectUV(9,37,17,42)),CLEAR.m,.5));a('flashbox',[46,53,39],box(44,45,35,46,62,44,METAL,tone,.5));for(let i=0;i<6;i++)a('flashline'+i,[46.4,48+i*2,39],line([[46.3,48+i*2,36.7],[46.3,48+i*2,42.3]],.25));a('logo',[44.2,33,11],tx(44.3,33,10.5,'慢慢显影',2.7,m.d));for(const y of[4,62])a('screw'+y,[44.3,y,13],cylX(44,44.4,y,13,.65,METAL,toneI,.2,8));}
 a('slot',[28,33,49.4],observe('camera-slot',shape(on(PZ(49.3),rrUV(17,12,20,54,1)),DARK.d,.5)));for(const [i,A,B]of[[0,[8,66,37],[13,72,12]],[1,[13,72,12],[33,68,15]],[2,[33,68,15],[35,66,35]]])a('strap'+i,avg([A,B]),rod(A,B,1.2,DARK));}
 const parts=fixed.slice(),a=(key,at,svg)=>parts.push({key,at,svg});a('shutter',[31,54,51],act('shutter',observe('camera-shutter',cyl(30,55,49,50.5,4,DARK,toneI,.5)+cyl(30,55,50.5,53-path.shutterDrop,3.3,PALS.tomato,toneI,.5)),access('按下快门')));
 if(s.phase==='loading'){const open=path.hatchLift;a('paperhatch',[9,33,50],observe('camera-hatch',box(3,16,49,13,50,50+open,DARK,toneI,.5)+box(4,17,50+open,12,49,51+open,CERAMIC,toneI,.4)));}
 if(vis([1,0,0]))a('count',[44.5,55,22],shape(on(PX(44.4),rectUV(51,19,59,25)),DARK.d,.4)+tx(44.6,55,20.7,s.phase==='loading'?'·':String(s.frames),3,'#e6d5aa'));
 // The feed roller is fixed hardware, not a transient ejection effect.
 // Cumulative feed keeps its angle continuous when a collected sheet resets eject.
 {const spin=path.spin,capY=vis([0,1,0])?51.05:vis([0,-1,0])?14.95:null,mark=capY===null?'':line([[20.3,capY,49.7],[20.3+.7*Math.cos(spin),capY,49.7+.7*Math.sin(spin)]],.25);a('roller',[20.3,33,49.7],observe('camera-rollers',rod([20.3,15,49.7],[20.3,51,49.7],.85,METAL,toneI,.25)+mark));}
 // The photograph emerges vertically from a real top slot. Its image starts blank and develops.
 if(s.eject>0){const h=path.height,lift=path.lift,plane=PX(19.7);let photo=box(18.8,13,49+lift,19.5,53,49+h+lift,CERAMIC,tone,.5);if(vis([1,0,0]))photo+=shape(on(plane,rectUV(14,49+lift,52,49+h+lift)),CERAMIC.l,.4);if(h>7&&vis([1,0,0])){const z0=53+lift,z1=49+h-2+lift;photo+=landscape(plane,16,z0,50,z1,s.scene,s.develop);if(s.develop>.5)photo+=tx(19.9,33,50+lift,names[s.scene],1.7,INK);}
 a('photo',[19.5,33,49+h/2+lift],act('collect',observe('camera-photo',`<g opacity="${path.opacity}">${photo}</g>`),access(s.phase==='ready'?'取走并收藏照片':'照片正在显影')));}
 if(s.flash>0&&vis([1,0,0]))a('flashlight',[47,53,39],`<g opacity="${s.flash}">${shape(on(PX(46.8),rectUV(46,35.5,61,43.5)),'#fff9d9',.3)+shape(on(PX(47),[[44,39],[39,42],[43,45],[42,49],[49,46],[54,50],[57,46],[64,48],[63,42],[68,40],[63,36],[64,31],[57,33],[53,29],[49,34],[43,32]]),'#fff6c9',.2)}</g>`);
 // Compare roller and paper at their overlap, not the tall sheet's center.
 // The roller lies on the +X side of the sheet: near from the front, hidden from the back.
 const photoPart=parts.find(p=>p.key==='photo'),photoRank=photoPart?1200+depthOf(photoPart.at):null;
 // Real view depth keeps the lens and strap behind the opaque body from the rear.
 const rank=p=>{const d=depthOf(p.at);if(p.key==='shadow')return -10000;if(p.key==='top')return 1000;if(p.key==='slot')return 1100;if(p.key==='roller')return photoRank===null?1150+d:photoRank+(vis([1,0,0])?.5:-.5);if(p.key==='paperhatch')return 1150+d;if(p.key==='shutter'||p.key==='photo')return 1200+d;if(p.key==='flashlight')return 1400;return d;};scene.layers=parts.sort((a,b)=>rank(a)-rank(b)).map(p=>({...p,opacity:1}));return '';}
 return{title:'拍立得相机',hint:'按快门拍一张 · 等风景显影',size:[60,74,82],palette:'mint',state,scene,credit:false,observation:{title:'看动作懂原理',intro:'简化示意：按快门、滚轮出片，再等待显影。风景由程序绘制，不需要摄像头权限；显影时长不代表真实相纸。',slow:true,read:observation},help:'按住机身红色快门会看到它下沉，松开时拍摄；按住后移开或按 Esc 可取消；也可点击左侧快门按钮，或聚焦机身快门后轻按 Enter / 空格拍摄。等待相纸完全显影，再点击照片收藏。每盒五张，用完后才能换新相纸；「重新开始」可取消当前流程。',buttons:[{label:'按下快门',text:shutterLabel,onClick:shutter},{label:'切换风景',text:s=>'取景：'+names[s.scene]+' ↻',onClick:change},{label:'收藏照片',text:s=>s.phase==='ready'?'取走并收藏照片':s.phase==='collecting'?'正在收好照片':'收藏照片',onClick:collect},{label:'装入相纸',text:s=>s.phase==='loading'?'相纸装入中':s.frames?`相纸还剩 ${s.frames} 张`:'装入五张相纸',onClick:load},{label:'重新开始',onClick:reset}],acts:{shutter:(s,e,u)=>shutter(s,u),collect:(s,e,u)=>collect(s,u)},stats:s=>[{label:'剩余相纸',value:s.frames},{label:'已收藏',value:s.collected}],readout:s=>s.shutterPress&&s.phase==='idle'?'快门已按下，松开拍摄；移开或按 Esc 取消。':({idle:s.frames?'当前取景：'+names[s.scene]+' · 按下快门拍一张。':'这一盒相纸已用完，装入五张新相纸继续拍摄。',flash:'咔嚓！曝光完成，快门正在回弹。',ejecting:'滚轮正在推出相纸 '+Math.round(s.eject*100)+'%，请勿拉扯。',developing:'显影中 '+Math.round(s.develop*100)+'%，颜色正慢慢浮现。',ready:'风景显影完成，点击照片取走收藏。',collecting:'正在将照片从出片口取出……',loading:'正在更换纸盒，装入五张新相纸……'}[s.phase]),progress:s=>s.phase==='ejecting'?{label:'推出相纸',value:s.eject}:s.phase==='developing'?{label:'等待显影',value:s.develop}:s.phase==='loading'?{label:'装入相纸',value:s.reload}:s.phase==='collecting'?{label:'取走照片',value:s.take}:null,actionState:(s,key)=>key==='shutter'?{label:shutterLabel(s),hint:s.phase==='idle'&&s.frames?'按住后松开拍摄，移开取消':'完成当前步骤后可继续拍摄',busy:s.phase!=='idle',active:!!s.shutterPress}:key==='collect'?{label:s.phase==='ready'?'取走并收藏照片':'等待显影完成',busy:s.phase!=='ready',active:s.phase==='ready'}:null,idea:'模拟快门曝光、滚轮出片和相纸显影。画面来自程序绘制的风景，不需要摄像头权限。',setup(ui){mountPaperPath(ui);const svg=document.getElementById('fig');
  svg.addEventListener('pointerdown',e=>{if(e.button||e.isPrimary===false||!e.target.closest('[data-act="shutter"]'))return;e.preventDefault();e.stopImmediatePropagation();if(grab)return;if(state.phase!=='idle'||!state.frames)return shutter(state,ui);grab={id:e.pointerId,x:e.clientX,y:e.clientY,svg,cancelled:false};state.shutterPress=1;try{svg.setPointerCapture(e.pointerId)}catch{}ui.invalidate();},true);
  svg.addEventListener('pointermove',e=>{if(!grab||grab.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();if(Math.hypot(e.clientX-grab.x,e.clientY-grab.y)>18){grab.cancelled=true;state.shutterPress=0;ui.invalidate();}},true);
  for(const event of['pointerup','pointercancel'])svg.addEventListener(event,e=>{if(!grab||grab.id!==e.pointerId)return;e.stopImmediatePropagation();release(ui,event==='pointercancel');},true);
  svg.addEventListener('lostpointercapture',e=>{if(grab?.id===e.pointerId)release(ui,true)});window.addEventListener('blur',()=>release(ui,true));window.addEventListener('keydown',e=>{if(e.key==='Escape')release(ui,true)});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)release(ui,true);else if(working(state))drive(state,ui);});window.addEventListener('pagehide',()=>{release(ui,true);state.run++;running=false;});window.addEventListener('pageshow',()=>{if(working(state))drive(state,ui);ui.invalidate();});}};
};})();
