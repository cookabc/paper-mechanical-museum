import {it,expect,vi} from 'vitest';
import {createApp} from '../src/app/app';
it('owns scroll restoration and resets scroll for every new scene and home',()=>{
 const root=document.createElement('div');document.body.append(root);
 const before=history.scrollRestoration;const scroll=vi.mocked(window.scrollTo);scroll.mockClear();
 const app=createApp(root);app.navigate('fan');app.navigate('coffee');app.navigate('');
 expect(history.scrollRestoration).toBe('manual');
 expect(scroll).toHaveBeenCalledWith({top:0,left:0,behavior:'instant'});
 expect(scroll.mock.calls.length).toBeGreaterThanOrEqual(4);
 app.dispose();expect(history.scrollRestoration).toBe(before);root.remove();
});
it('switches all fifteen ready scenes in one app and retires their old resources and controls',()=>{
 const root=document.createElement('div');document.body.append(root);const app=createApp(root);
 const retained:Array<{controller:NonNullable<typeof app.current>;control:HTMLElement|null;state:string}>=[];
 for(const id of ['coffee','camera','vending','toaster','fan','musicbox','turntable','elevator','washer','claw','bicycle','generator','automaton','geneva','rackpress','camera','coffee']){
  if(app.current){const controller=app.current,control=root.querySelector<HTMLElement>('button');app.navigate('');retained.push({controller,control,state:JSON.stringify(controller.snapshot?.())});}
  app.navigate(id);expect(root.querySelector('.scene-root svg'),id+' has a model').not.toBeNull();expect(root.querySelectorAll('header')).toHaveLength(1);
  expect(app.diagnostics().scope?.active).toBe(true);
  for(const old of retained){old.control?.click();old.controller.reset();old.controller.resume('manual');expect(JSON.stringify(old.controller.snapshot?.())).toBe(old.state);}
 }
 const links=[...root.querySelectorAll<HTMLAnchorElement>('.object-nav a')].map(link=>link.getAttribute('href'));
 expect(links).toEqual(['#/washer','#/fan','#/claw','#/coffee','#/musicbox','#/vending','#/toaster','#/turntable','#/camera','#/elevator','#/bicycle','#/generator','#/automaton','#/geneva','#/rackpress']);
 app.dispose();expect(root.childElementCount).toBe(0);expect(app.diagnostics().app).toMatchObject({active:false,frames:0,timers:0,listeners:0});root.remove();
});

it('resets only outer scroll when crossing into the fixed desktop shell',()=>{
 const root=document.createElement('div');document.body.append(root);const app=createApp(root);app.navigate('generator');
 const scroll=vi.mocked(window.scrollTo);const controller=app.current;
 const width=window.innerWidth,height=window.innerHeight;
 const resize=(w:number,h:number)=>{Object.defineProperty(window,'innerWidth',{configurable:true,value:w});Object.defineProperty(window,'innerHeight',{configurable:true,value:h});window.dispatchEvent(new Event('resize'));};
 const dock=root.querySelector<HTMLElement>('.play-dock')!;dock.scrollTop=123;
 const button=root.querySelector<HTMLButtonElement>('.museum-learning-entry')!;button.focus();
 dock.getBoundingClientRect=()=>new DOMRect(40,120,250,500);
 button.getBoundingClientRect=()=>new DOMRect(40,160,250,36);
 Object.defineProperty(dock,'clientHeight',{configurable:true,value:500});
 const state=JSON.stringify(controller!.snapshot!());
 scroll.mockClear();resize(400,606);resize(420,606);expect(scroll).not.toHaveBeenCalled();
 resize(761,606);resize(944,606);resize(960,606);expect(scroll).not.toHaveBeenCalled();
 resize(961,606);expect(scroll).toHaveBeenCalledTimes(1);expect(dock.scrollTop).toBe(123);expect(document.activeElement).toBe(button);
 expect(app.current).toBe(controller);expect(JSON.stringify(controller!.snapshot!())).toBe(state);
 resize(1000,620);expect(scroll).toHaveBeenCalledTimes(1);
 resize(1000,450);expect(scroll).toHaveBeenCalledTimes(1);resize(1000,600);expect(scroll).toHaveBeenCalledTimes(2);
 app.dispose();resize(400,600);resize(1000,600);expect(scroll).toHaveBeenCalledTimes(2);
 Object.defineProperty(window,'innerWidth',{configurable:true,value:width});Object.defineProperty(window,'innerHeight',{configurable:true,value:height});root.remove();
});

it('reveals clipped dock focus on fixed-shell entry without scrolling visible focus or the outer page again',()=>{
 const root=document.createElement('div');document.body.append(root);const app=createApp(root);app.navigate('generator');
 const width=window.innerWidth,height=window.innerHeight;
 const resize=(w:number,h:number)=>{Object.defineProperty(window,'innerWidth',{configurable:true,value:w});Object.defineProperty(window,'innerHeight',{configurable:true,value:h});window.dispatchEvent(new Event('resize'));};
 const dock=root.querySelector<HTMLElement>('.play-dock')!,button=root.querySelector<HTMLButtonElement>('.museum-learning-entry')!;
 const dockBounds=vi.spyOn(dock,'getBoundingClientRect').mockReturnValue(new DOMRect(40,120,250,560));
 const targetBounds=vi.spyOn(button,'getBoundingClientRect');
 Object.defineProperty(dock,'clientHeight',{configurable:true,value:560});
 Object.defineProperty(dock,'clientTop',{configurable:true,value:0});
 const scroll=vi.mocked(window.scrollTo),intoView=vi.mocked(button.scrollIntoView);
 const controller=app.current!;controller.pause('manual');const state=JSON.stringify(controller.snapshot!());
 try {
  for(const {top,initial,expected} of [
   {top:795,initial:0,expected:153}, // lower control, including 6px focus-ring clearance
   {top:105,initial:200,expected:179}, // upper control
   {top:500,initial:83,expected:83}, // already visible: preserve exact scroll
  ]){
   resize(960,700);targetBounds.mockReturnValue(new DOMRect(40,top,100,32));dock.scrollTop=initial;button.focus();
   scroll.mockClear();intoView.mockClear();resize(961,700);
   expect(dock.scrollTop).toBe(expected);expect(document.activeElement).toBe(button);
   expect(scroll).toHaveBeenCalledExactlyOnceWith({top:0,left:0,behavior:'instant'});expect(intoView).not.toHaveBeenCalled();
   expect(app.current).toBe(controller);expect(JSON.stringify(controller.snapshot!())).toBe(state);
  }
  // The short-window boundary uses the same correction, not only width changes.
  resize(1000,480);targetBounds.mockReturnValue(new DOMRect(40,795,100,32));dock.scrollTop=0;resize(1000,481);
  expect(dock.scrollTop).toBe(153);expect(document.activeElement).toBe(button);
  // Focus elsewhere must not disturb an independently scrolled dock.
  resize(960,700);root.querySelector<HTMLElement>('h1')!.focus();dock.scrollTop=83;resize(961,700);expect(dock.scrollTop).toBe(83);
 } finally {
  dockBounds.mockRestore();targetBounds.mockRestore();app.dispose();root.remove();
  Object.defineProperty(window,'innerWidth',{configurable:true,value:width});Object.defineProperty(window,'innerHeight',{configurable:true,value:height});
 }
});

it.each(['washer','fan','bicycle','generator'])('preserves %s learning, focus and machine state across the stage-first boundary',id=>{
 const root=document.createElement('div');document.body.append(root);const app=createApp(root);app.navigate(id);
 const width=window.innerWidth,height=window.innerHeight;
 const resize=(w:number,h:number)=>{Object.defineProperty(window,'innerWidth',{configurable:true,value:w});Object.defineProperty(window,'innerHeight',{configurable:true,value:h});window.dispatchEvent(new Event('resize'));};
 try {
  root.querySelector<HTMLButtonElement>('.museum-learning-entry')!.click();
  // Exercise the adapters' real lesson reparenting, not only details.open.
  for(const panel of root.querySelectorAll('details[open]'))panel.dispatchEvent(new Event('toggle'));
  const controller=app.current!;controller.pause('manual');
  const lesson=root.querySelector<HTMLElement>(id==='generator'?'.gen-lesson':id==='bicycle'?'.bike-challenge':'.mechanism-lesson')!;
  const focused=lesson.querySelector<HTMLElement>('summary,button')!;focused.focus();
  const dock=root.querySelector<HTMLElement>('.play-dock')!;dock.scrollTop=83;
  dock.getBoundingClientRect=()=>new DOMRect(40,120,250,500);
  focused.getBoundingClientRect=()=>new DOMRect(40,160,250,36);
  Object.defineProperty(dock,'clientHeight',{configurable:true,value:500});
  const state=JSON.stringify(controller.snapshot!());
  const open=[...root.querySelectorAll<HTMLDetailsElement>('details')].filter(panel=>panel.open);
  for(const [w,h] of [[760,600],[761,600],[960,600],[961,600],[961,480],[961,481],[900,507],[1200,760]]) {
   resize(w,h);
   expect(app.current).toBe(controller);expect(JSON.stringify(controller.snapshot!())).toBe(state);
   expect(document.activeElement).toBe(focused);expect(dock.scrollTop).toBe(83);
   expect(lesson.isConnected).toBe(true);expect(open.every(panel=>panel.open)).toBe(true);
  }
 } finally {
  app.dispose();root.remove();
  Object.defineProperty(window,'innerWidth',{configurable:true,value:width});Object.defineProperty(window,'innerHeight',{configurable:true,value:height});
 }
});

it('keeps dock focus visible when returning to page flow without moving visible or unrelated focus',()=>{
 const root=document.createElement('div');document.body.append(root);const app=createApp(root);app.navigate('generator');
 const width=window.innerWidth,height=window.innerHeight,x=window.scrollX,y=window.scrollY;
 const resize=(w:number,h:number)=>{Object.defineProperty(window,'innerWidth',{configurable:true,value:w});Object.defineProperty(window,'innerHeight',{configurable:true,value:h});window.dispatchEvent(new Event('resize'));};
 const dock=root.querySelector<HTMLElement>('.play-dock')!,button=root.querySelector<HTMLButtonElement>('.museum-learning-entry')!;
 const targetBounds=vi.spyOn(button,'getBoundingClientRect');
 const scroll=vi.mocked(window.scrollTo),intoView=vi.mocked(button.scrollIntoView);
 const controller=app.current!;controller.pause('manual');const state=JSON.stringify(controller.snapshot!());
 try {
  for(const {top,initial,expected} of [
   {top:1024,initial:0,expected:362}, // the real lower-control seam failure
   {top:-16,initial:200,expected:178},
   {top:472,initial:83,expected:null}, // already visible: do not scroll the page
  ]){
   resize(961,700);targetBounds.mockReturnValue(new DOMRect(40,top,100,32));button.focus();dock.scrollTop=83;
   Object.defineProperty(window,'scrollY',{configurable:true,value:initial});
   scroll.mockClear();intoView.mockClear();resize(960,700);
   if(expected===null)expect(scroll).not.toHaveBeenCalled();
   else expect(scroll).toHaveBeenCalledExactlyOnceWith({top:expected,left:x,behavior:'instant'});
   expect(document.activeElement).toBe(button);expect(dock.scrollTop).toBe(83);expect(intoView).not.toHaveBeenCalled();
   expect(app.current).toBe(controller);expect(JSON.stringify(controller.snapshot!())).toBe(state);
   // Remaining inside page flow is not another transition, even if focus is offscreen.
   targetBounds.mockReturnValue(new DOMRect(40,1024,100,32));scroll.mockClear();resize(900,700);expect(scroll).not.toHaveBeenCalled();
  }
  resize(1000,700);targetBounds.mockReturnValue(new DOMRect(40,495,100,32));
  Object.defineProperty(window,'scrollY',{configurable:true,value:0});scroll.mockClear();resize(1000,480);
  expect(scroll).toHaveBeenCalledExactlyOnceWith({top:53,left:x,behavior:'instant'});
  resize(961,700);root.querySelector<HTMLElement>('h1')!.focus();scroll.mockClear();resize(960,700);expect(scroll).not.toHaveBeenCalled();
 } finally {
  targetBounds.mockRestore();app.dispose();root.remove();
  Object.defineProperty(window,'innerWidth',{configurable:true,value:width});Object.defineProperty(window,'innerHeight',{configurable:true,value:height});
  Object.defineProperty(window,'scrollY',{configurable:true,value:y});
 }
});
