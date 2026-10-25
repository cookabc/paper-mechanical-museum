/* Minimal event/focus DOM for source-executed input tests. No dependencies.
 * This is not a rendering/browser substitute. The actual app and orbit handlers
 * execute unchanged; geometry and screen-reader/browser defaults need live QA.
 */
const vm=require('node:vm');
const {source,section,declaration}=require('./source.cjs');
class Element{
 constructor(tag='div',doc=null){this.tagName=tag.toUpperCase();this.doc=doc;this.attrs={};this.dataset={};this.children=[];this.style={};this.events={};this.capture=null;const classes=new Set();this.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,on)=>{on??=!classes.has(x);on?classes.add(x):classes.delete(x)}};this.viewBox={baseVal:{width:160}};}
 append(...nodes){for(const node of nodes){node.remove();this.children.push(node);node.parent=this;node.doc=this.doc;}}
 appendChild(node){this.append(node);return node}
 remove(){if(this.parent)this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}
 get isConnected(){return !!this.parent?.isConnected}
 contains(node){return node===this||this.children.some(c=>c.contains(node))}
 setAttribute(k,v){this.attrs[k]=String(v);if(k==='id')this.id=String(v)}
 getAttribute(k){return this.attrs[k]??null}
 closest(sel){if(sel==='[data-act]'&&this.dataset.act||sel==='#fig'&&this.id==='fig')return this;return this.parent?.closest?.(sel)||null}
 querySelectorAll(sel){return this.children.flatMap(c=>[...(sel==='button'&&c.tagName==='BUTTON'||sel==='[data-act]'&&c.dataset.act?[c]:[]),...c.querySelectorAll(sel)])}
 getBoundingClientRect(){return{width:760,height:570}}
 addEventListener(name,fn){(this.events[name]??=[]).push(fn)}
 emit(type,extra={}){const e={target:this,type,bubbles:true,button:0,isPrimary:true,clientX:100,clientY:100,pointerId:/pointer/.test(type)?1:undefined,pointerType:/pointer/.test(type)?'mouse':'',defaultPrevented:false,preventDefault(){this.defaultPrevented=true},stopPropagation(){this.stopped=true},...extra};let node=this;while(node){for(const f of node.events[type]||[])f(e);node['on'+type]?.(e);if(e.stopped||!e.bubbles)break;node=node.parent;}return e}
 focus(){const doc=this.doc;if(!doc||doc.activeElement===this)return;const old=doc.activeElement;if(old){old.emit('blur',{bubbles:false,relatedTarget:this});old.emit('focusout',{relatedTarget:this});}doc.active=this;this.emit('focus',{bubbles:false,relatedTarget:old});this.emit('focusin',{relatedTarget:old})}
 setPointerCapture(id){this.capture=id}
 hasPointerCapture(id){return this.capture===id}
 releasePointerCapture(id=this.capture){if(this.capture!==id)return;this.capture=null;this.emit('lostpointercapture',{pointerId:id})}
}
function create(){
 const globals=new Element('window'),doc=new Element('document');doc.parent=globals;doc.doc=doc;Object.defineProperty(globals,'isConnected',{get:()=>true});doc.body=new Element('body',doc);doc.append(doc.body);doc.hidden=false;Object.defineProperty(doc,'activeElement',{get(){return this.active?.isConnected?this.active:this.body}});doc.createElementNS=(_n,tag)=>new Element(tag,doc);
 const svg=new Element('svg',doc);svg.setAttribute('id','fig');svg.setAttribute('tabindex','0');const art=new Element('g',doc),panel=new Element('div',doc),buttons={vreset:new Element('button',doc),vspin:new Element('button',doc)};doc.body.append(svg,panel,...Object.values(buttons));svg.append(art);for(const dir of['far','left','near','right']){const b=new Element('button',doc);b.dataset.dir=dir;panel.append(b)}doc.getElementById=id=>id==='fig'?svg:buttons[id];
 let now=0,serial=0;const timers=new Map(),steps=[];const st={x:32,y:36,z:87,open:1,phase:'idle',stock:[0,1,2,3],moving:false,aiming:false,message:'',aimMotion:0,tries:0,won:[],got:null,timer:0,result:null,target:null},calls=[];
 const ui={render(){},invalidate(){},animate:f=>steps.push(f),press(name){this.pressedAct=name;st.pressedAct=name},clearPress(){this.pressedAct=null;st.pressedAct=null},feedback(message){st.message=message},flash(message){st.message=message},clearFeedback(){}};
 const ctx={console,Math,st,ui,svg,art,panel,YAW:38,PITCH:23,YAW0:45,PITCH0:35,restoringFocus:false,document:doc,Dv:(x,y)=>[x,y],P:(x,y)=>[x,y],exteriorControlVisible:()=>true,performance:{now:()=>now},addEventListener:globals.addEventListener.bind(globals),setTimeout:(f,ms)=>{timers.set(++serial,{f,time:now+ms});return serial},clearTimeout:id=>timers.delete(id)};ctx.window=ctx;ctx.setCam=(y,p)=>{ctx.YAW=y;ctx.PITCH=p};vm.createContext(ctx);const run=s=>vm.runInContext(s,ctx),index=source('index.html'),app=source('app.js');ctx.cfg={homeView:[38,23],acts:Object.fromEntries(['aim','drop','collect'].map(act=>[act,(s,node)=>{calls.push({act,i:node.dataset.i});run(act==='aim'?`aim(st,${+node.dataset.i},ui)`:`${act}(st,ui)`)}]))};
 run(declaration(index,'const ease ='));
 run(section(index,'  let drag = null',"  if (q.has('yaw')"));
 run('const REST=87,GRIP=70.3;'+section(app,'const toys=','function plush'));
 run(section(app,'function clawBlocked','const ui=mountFigure'));
 run(section(app,'let held=null','/* Page layout only:'));
 const control=(act,i)=>{const node=new Element('g',doc);node.dataset.act=act;if(i!=null)node.dataset.i=String(i);node.setAttribute('tabindex','0');node.setAttribute('aria-hidden','false');node.setAttribute('role','button');art.append(node);return node};for(let i=0;i<4;i++)control('aim',i);control('drop');
 const advance=ms=>{for(let t=0;t<ms;t+=16.667){now+=16.667;for(const f of [...steps])if(f(1/60)===false)steps.splice(steps.indexOf(f),1);for(const [id,timer]of [...timers])if(timer.time<=now){timers.delete(id);timer.f()}}};
 const redraw=replace=>{ctx.replaceFrame=replace;const capture=section(index,'    const focused=art.contains','    const markup=cfg.scene');const restore=section(index,'    if(focused','    const elapsed=performance.now()');run('{'+capture+'replaceFrame();'+restore+'}')};
 return{ctx,doc,globals,svg,art,panel,buttons,st,ui,calls,steps,run,advance,control,redraw,joy:run('joyHit'),button:dir=>panel.children.find(b=>b.dataset.dir===dir),toy:i=>art.children.find(n=>n.dataset.act==='aim'&&n.dataset.i===String(i)),node:tag=>new Element(tag,doc)};
}
module.exports={create,source,Element};
