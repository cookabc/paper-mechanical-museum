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
