import {beforeEach as beforeLanguage} from 'vitest';
beforeLanguage(()=>{localStorage.setItem('museum-lang','zh');document.documentElement.lang='zh';});
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import {layoutWasherCallouts,measureCalloutFrame} from '../src/exhibits/washer/callout-layout.js';
import {createWasherModel} from '../src/exhibits/washer/model.js';
import {createWasherRuntime} from '../src/engines/washer/runtime.js';
import {ResourceScope} from '../src/app/scope';
import {scopedDocument} from '../src/app/scoped-dom';
import {createObservation} from '../src/shared/observation.js';
import {mountLearningEntry} from '../src/shared/learning-entry';

const rect=(left:number,top:number,width:number,height:number)=>({left,top,width,height,right:left+width,bottom:top+height,x:left,y:top,toJSON(){return this;}});
const parts=Array.from({length:12},(_,i)=>({X:i%2?240:100,Y:110+i*2,text:i===11?'水位传感器':'部件',on:i===4}));

describe('washer callout layout in stage-local coordinates',()=>{
 it.each([[800,600],[520,300],[328,277]])('keeps all twelve labels readable and separated in a %s × %s stage',(width,height)=>{
  const layout=layoutWasherCallouts(parts,{frame:rect(0,0,width,height),scale:1,body:{left:width*.25,right:width*.75}});
  expect(layout.labels).toHaveLength(12);expect(layout.fontSize).toBe(13);
  for(const label of layout.labels){expect(label.px-label.width/2).toBeGreaterThanOrEqual(0);expect(label.px+label.width/2).toBeLessThanOrEqual(width);expect(label.py-label.height/2).toBeGreaterThanOrEqual(0);expect(label.py+label.height/2).toBeLessThanOrEqual(height);}
  for(const side of [-1,1]){const column=layout.labels.filter(label=>label.side===side);for(let i=1;i<column.length;i++)expect(column[i].py-column[i-1].py).toBeGreaterThanOrEqual(29);}
  if(width===328)expect(layout.mode).toBe('numbered');
 });
 it('packs against both edges rather than pushing a bottom-heavy column off screen',()=>{
  const crowded=parts.map((item,i)=>({...item,Y:280+i*4}));
  const layout=layoutWasherCallouts(crowded,{frame:rect(0,0,500,260),scale:1,body:{left:150,right:350}});
  expect(layout.labels).toHaveLength(12);expect(Math.max(...layout.labels.map(item=>item.py+item.height/2))).toBeLessThanOrEqual(252);
  expect(Math.min(...layout.labels.map(item=>item.py-item.height/2))).toBeGreaterThanOrEqual(8);
 });
 it('uses actual nonidentity CTM and ignores a separate dock even when the lesson moves it below the scene',()=>{
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 300 225');
  svg.getBoundingClientRect=()=>rect(400,120,600,450);
  Object.defineProperty(svg,'getScreenCTM',{value:()=>({a:2,b:0,c:0,d:2,e:400,f:120,inverse:()=>({a:.5,b:0,c:0,d:.5,e:-200,f:-60})})});
  const dock=document.createElement('div');dock.getBoundingClientRect=()=>rect(30,600,280,1200);
  const measured=measureCalloutFrame(svg,[dock]);expect(measured).toEqual({frame:{left:0,top:0,right:300,bottom:225},scale:2,obstacles:[]});
  dock.getBoundingClientRect=()=>rect(400,120,100,70);
  const intersecting=measureCalloutFrame(svg,[dock]);expect(intersecting.obstacles).toEqual([{left:0,top:0,right:50,bottom:35}]);
  const layout=layoutWasherCallouts(parts,{...intersecting,body:{left:90,right:240}});
  expect(layout.labels).toHaveLength(12);expect(layout.fontSize*measured.scale).toBe(13);
  for(const item of layout.labels.filter(item=>item.side<0))expect(item.py-item.height/2).toBeGreaterThanOrEqual(39);
 });
 it('retains the complete HTML-list data when even numbered markers cannot fit, without shrinking type',()=>{
  const layout=layoutWasherCallouts(parts,{frame:rect(0,0,80,60),scale:1,body:{left:10,right:70}});
  expect(layout.mode).toBe('list');expect(layout.labels).toEqual([]);expect(layout.items).toHaveLength(12);expect(layout.fontSize).toBe(13);
 });
});

type Step=(dt:number)=>boolean|void;
let cleanups:Array<()=>void>,svgRect:ReturnType<typeof rect>,dockRect:ReturnType<typeof rect>,frames:Map<number,FrameRequestCallback>,resizeCallbacks:Array<()=>void>,disconnects:Array<ReturnType<typeof vi.fn>>;
beforeEach(()=>{
 document.body.replaceChildren();document.body.className='museum-scene';Object.defineProperty(document,'hidden',{configurable:true,value:false});
 vi.useFakeTimers({toFake:['setTimeout','clearTimeout','performance']});cleanups=[];frames=new Map();resizeCallbacks=[];disconnects=[];let serial=0;
 vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{frames.set(++serial,fn);return serial;});vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
 vi.stubGlobal('ResizeObserver',class{disconnect=vi.fn();constructor(callback:()=>void){resizeCallbacks.push(callback);disconnects.push(this.disconnect);}observe(){}unobserve(){}});
 svgRect=rect(400,120,800,600);dockRect=rect(40,150,280,400);
 const original=Element.prototype.getBoundingClientRect;
 vi.spyOn(Element.prototype,'getBoundingClientRect').mockImplementation(function(this:Element){return this.id==='fig'?svgRect:this.id==='btns'?dockRect:original.call(this);});
 Object.defineProperty(SVGSVGElement.prototype,'getScreenCTM',{configurable:true,value:function(this:SVGSVGElement){const vb=this.viewBox.baseVal,k=Math.min(svgRect.width/vb.width,svgRect.height/vb.height),e=svgRect.left+(svgRect.width-vb.width*k)/2-vb.x*k,f=svgRect.top+(svgRect.height-vb.height*k)/2-vb.y*k;return {a:k,b:0,c:0,d:k,e,f,inverse:()=>({a:1/k,b:0,c:0,d:1/k,e:-e/k,f:-f/k})};}});
});
afterEach(()=>{for(const cleanup of cleanups.reverse())cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();document.body.replaceChildren();document.body.className='';Object.defineProperty(SVGSVGElement.prototype,'getScreenCTM',{configurable:true,value:()=>null});});
function flush(){vi.advanceTimersByTime(80);const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(performance.now()));}
function fixture(){
 const root=document.createElement('section');root.className='washer-exhibit';document.body.append(root);const scope=new ResourceScope(),steps=new Set<Step>();
 const observation=createObservation(root,scope),geometry=createWasherRuntime({root,scope,audio:null,observation});
 const wrapped=new Proxy(geometry,{get(target,key,receiver){if(key==='mountFigure')return (config:Parameters<typeof geometry.mountFigure>[0])=>{const ui=target.mountFigure(config);Reflect.set(ui,'animate',(step:Step)=>steps.add(step));return ui;};return Reflect.get(target,key,receiver);}});
 const model=createWasherModel(wrapped,{scope,document:scopedDocument(root,scope),window:{MuseumObservation:observation}});
 mountLearningEntry(root,scope,'washer');cleanups.push(()=>{model.ui.dispose();scope.dispose();root.remove();});
 const buttons=()=>[...root.querySelectorAll<HTMLButtonElement>('#btns .act')];
 const advance=(seconds:number)=>{for(let t=0;t<seconds;t+=.05)for(const step of [...steps])if(step(.05)===false)steps.delete(step);model.ui.render();};
 const labels=()=>{model.ui.st.xr=model.ui.st.xrT=1;root.classList.remove('nolabels');model.ui.render();};
 return {root,scope,ui:model.ui,buttons,advance,labels};
}
function assertLabels(root:HTMLElement){
 const svg=root.querySelector<SVGSVGElement>('#fig')!,ctm=svg.getScreenCTM()!;
 const pills=[...svg.querySelectorAll<SVGRectElement>('.tag>rect')];expect(pills).toHaveLength(12);
 for(const pill of pills){const x=Number(pill.getAttribute('x'))*ctm.a+ctm.e,y=Number(pill.getAttribute('y'))*ctm.d+ctm.f,w=Number(pill.getAttribute('width'))*ctm.a,h=Number(pill.getAttribute('height'))*ctm.d;expect(x).toBeGreaterThanOrEqual(svgRect.left-.2);expect(x+w).toBeLessThanOrEqual(svgRect.right+.2);expect(y).toBeGreaterThanOrEqual(svgRect.top-.2);expect(y+h).toBeLessThanOrEqual(svgRect.bottom+.2);}
 for(const text of svg.querySelectorAll('.tag>text'))expect(Number(text.getAttribute('font-size'))*ctm.a).toBeCloseTo(13,5);
 const legend=root.querySelector<HTMLElement>('.washer-callout-legend')!;if(svg.dataset.calloutMode==='numbered'){expect(legend.hidden).toBe(false);expect([...legend.querySelectorAll('li')].map(row=>row.textContent!.replace(/^\d+/,''))).toEqual(['外桶','滚筒','皮带轮','皮带','电机','弹簧','减振器','配重','加热器','排水泵','进水阀','水位传感器']);expect(legend.closest('#btns')).toBeNull();}
}

describe('washer labels, teaching and action state integration',()=>{
 it.each([[800,600],[520,300],[328,277]])('preserves every label and machine state while teaching opens/closes at %s × %s',(width,height)=>{
  svgRect=rect(width===328?16:400,120,width,height);dockRect=rect(width===328?16:30,width===328?500:120,width===328?328:280,400);
  const {root,ui,labels}=fixture();labels();assertLabels(root);const snapshot=JSON.stringify(ui.st);
  root.querySelector<HTMLButtonElement>('.museum-learning-entry')!.click();flush();dockRect=rect(dockRect.left,850,dockRect.width,900);ui.render();assertLabels(root);expect(JSON.stringify(ui.st)).toBe(snapshot);
  root.querySelector<HTMLButtonElement>('.mechanism-lesson-exit')!.click();flush();ui.render();assertLabels(root);expect(JSON.stringify(ui.st)).toBe(snapshot);
  const observer=root.querySelector<HTMLDetailsElement>('.mechanism-observer')!;observer.open=false;flush();ui.render();assertLabels(root);observer.open=true;flush();ui.render();assertLabels(root);expect(JSON.stringify(ui.st)).toBe(snapshot);
  root.querySelector<HTMLButtonElement>('#lblb')!.click();flush();expect(root.querySelectorAll('.tag')).toHaveLength(0);expect(root.querySelector<HTMLElement>('.washer-callout-legend')!.hidden).toBe(true);
  root.querySelector<HTMLButtonElement>('#lblb')!.click();flush();assertLabels(root);
 });
 it('reflows idle and program-paused labels on resize, and retires observers and retained callbacks',()=>{
  const {root,scope,ui,labels,buttons,advance}=fixture();labels();assertLabels(root);
  svgRect=rect(16,120,328,277);dockRect=rect(16,500,328,400);resizeCallbacks.forEach(fn=>fn());flush();assertLabels(root);expect(root.querySelector<SVGSVGElement>('#fig')!.dataset.calloutMode).toBe('numbered');
  Object.assign(ui.st,{laundry:'drum',soapLvl:1});buttons()[3].click();advance(2);expect(ui.st.run).toBe(true);buttons()[3].click();advance(2);expect(ui.st.paused).toBe(true);expect(ui.st.drive).toBe(0);
  const snapshot=JSON.stringify(ui.st);svgRect=rect(400,120,800,600);dockRect=rect(30,120,280,400);resizeCallbacks.forEach(fn=>fn());flush();assertLabels(root);expect(JSON.stringify(ui.st)).toBe(snapshot);
  const retained=[...resizeCallbacks];ui.dispose();scope.dispose();expect(disconnects.every(fn=>fn.mock.calls.length===1)).toBe(true);retained.forEach(fn=>fn());flush();expect(frames.size).toBe(0);expect(scope.diagnostics()).toMatchObject({active:false,frames:0,timers:0,listeners:0});
 });
 it('keeps leader anchors attached to the shaking cabinet without moving bounded label pills',()=>{
  const {root,ui,labels}=fixture();labels();Object.assign(ui.st,{run:true,drive:1,tau:0});ui.render();
  const positions=()=>[...root.querySelectorAll('.tag')].map(tag=>({dot:tag.querySelector('circle')!,pill:tag.querySelector('rect')!})).map(({dot,pill})=>({x:Number(dot.getAttribute('cx')),y:Number(dot.getAttribute('cy')),rect:pill.outerHTML}));
  const before=positions();ui.st.tau=27;ui.render();const after=positions();const transform=root.querySelector('[data-layer="mechanism"]')!.getAttribute('transform')!;const [dx,dy]=transform.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  expect(Math.abs(dx)+Math.abs(dy)).toBeGreaterThan(.01);after.forEach((point,i)=>{expect(point.x-before[i].x).toBeCloseTo(dx,0);expect(point.y-before[i].y).toBeCloseTo(dy,0);const old=document.createElement('div');old.innerHTML=before[i].rect;for(const attr of ['x','y','width','height'])expect(root.querySelectorAll('.tag>rect')[i].getAttribute(attr)).toBe(old.firstElementChild!.getAttribute(attr));});
 });
 it('recommends one valid next action, preserves all controls and distinguishes running from paused',()=>{
  const {root,ui,buttons,advance,labels}=fixture();labels();const recommended=()=>buttons().filter(b=>b.dataset.recommended==='true');
  expect(buttons()).toHaveLength(6);expect(recommended()).toEqual([buttons()[0]]);expect(recommended()[0].getAttribute('aria-description')).toContain('建议下一步');
  buttons()[0].click();expect(recommended()).toEqual([]);advance(7);expect(recommended()).toEqual([buttons()[1]]);
  buttons()[1].click();expect(recommended()).toEqual([]);advance(4);expect(recommended()).toEqual([buttons()[3]]);
  Object.assign(ui.st,{drawer:1,drawerT:1});ui.render();expect(recommended()).toEqual([]);Object.assign(ui.st,{drawer:0,drawerT:0});ui.render();
  buttons()[3].click();advance(3);expect(recommended()).toEqual([]);expect(buttons()[3].getAttribute('aria-pressed')).toBe('true');expect(buttons()[3].getAttribute('aria-disabled')).toBe('false');expect(buttons()[3].textContent).toBe('暂停洗涤');assertLabels(root);
  buttons()[3].click();advance(2);expect(recommended()).toEqual([]);expect(buttons()[3].getAttribute('aria-pressed')).toBe('false');expect(buttons()[3].getAttribute('aria-disabled')).toBe('false');expect(buttons()[3].disabled).toBe(false);expect(buttons()[3].textContent).toBe('继续洗涤');assertLabels(root);
  const paused=JSON.stringify(ui.st);root.querySelector<HTMLButtonElement>('.museum-learning-entry')!.click();flush();dockRect=rect(40,950,280,900);ui.render();assertLabels(root);expect(JSON.stringify(ui.st)).toBe(paused);root.querySelector<HTMLButtonElement>('.mechanism-lesson-exit')!.click();flush();expect(JSON.stringify(ui.st)).toBe(paused);
  buttons()[3].click();advance(35);expect(recommended()).toEqual([buttons()[4]]);buttons()[4].click();expect(recommended()).toEqual([]);advance(7);expect(recommended()).toEqual([buttons()[0]]);expect(buttons()).toHaveLength(6);
 });
 it('pairs scoped pressed foreground, background and border without an opacity/disabled disguise',()=>{
  const css=fs.readFileSync('src/styles/shared-shell.css','utf8');
  expect(css).toMatch(/\.museum-scene \.actions \.act\[aria-pressed=true\]\{color:var\(--ink\);background:#fffdf8!important;border-color:#6d6557!important;/);
  expect(css).toMatch(/\.museum-scene \.actions \.act\[aria-pressed=true\]\{background:#e5f0df!important;border-color:#527451!important;/);
  const pressed=css.match(/\.museum-scene \.actions \.act\[aria-pressed=true\][^{]*\{[^}]+\}/g)!;expect(pressed.join('')).not.toContain('opacity');
 });
});
