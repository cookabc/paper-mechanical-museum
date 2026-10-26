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
it('switches all twelve ready scenes in one app and retires their old resources and controls',()=>{
 const root=document.createElement('div');document.body.append(root);const app=createApp(root);
 const retained:Array<{controller:NonNullable<typeof app.current>;control:HTMLElement|null;state:string}>=[];
 for(const id of ['coffee','camera','vending','toaster','fan','musicbox','turntable','elevator','washer','claw','bicycle','generator','camera','coffee']){
  if(app.current){const controller=app.current,control=root.querySelector<HTMLElement>('button');app.navigate('');retained.push({controller,control,state:JSON.stringify(controller.snapshot?.())});}
  app.navigate(id);expect(root.querySelector('.scene-root svg'),id+' has a model').not.toBeNull();expect(root.querySelectorAll('header')).toHaveLength(1);
  expect(app.diagnostics().scope?.active).toBe(true);
  for(const old of retained){old.control?.click();old.controller.reset();old.controller.resume('manual');expect(JSON.stringify(old.controller.snapshot?.())).toBe(old.state);}
 }
 const links=[...root.querySelectorAll<HTMLAnchorElement>('.object-nav a')].map(link=>link.getAttribute('href'));
 expect(links).toEqual(['#/washer','#/fan','#/claw','#/coffee','#/musicbox','#/vending','#/toaster','#/turntable','#/camera','#/elevator','#/bicycle','#/generator']);
 app.dispose();expect(root.childElementCount).toBe(0);expect(app.diagnostics().app).toMatchObject({active:false,frames:0,timers:0,listeners:0});root.remove();
});

it('resets only outer scroll when crossing into the fixed desktop shell',()=>{
 const root=document.createElement('div');document.body.append(root);const app=createApp(root);app.navigate('generator');
 const scroll=vi.mocked(window.scrollTo);const controller=app.current;
 const width=window.innerWidth,height=window.innerHeight;
 const resize=(w:number,h:number)=>{Object.defineProperty(window,'innerWidth',{configurable:true,value:w});Object.defineProperty(window,'innerHeight',{configurable:true,value:h});window.dispatchEvent(new Event('resize'));};
 const dock=root.querySelector<HTMLElement>('.play-dock')!;dock.scrollTop=123;
 const button=root.querySelector<HTMLButtonElement>('.museum-learning-entry')!;button.focus();
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
