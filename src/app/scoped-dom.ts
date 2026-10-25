import type { ResourceScope } from './scope';
/** Explicit compatibility boundary: local bindings, never a patched global Document. */
export function scopedDocument(root:HTMLElement,scope:ResourceScope):Document {
  const real=root.ownerDocument;
  const listeners: Array<{type:string;listener:EventListenerOrEventListenerObject;capture:boolean;off:()=>void}>=[];
  const capture=(options?:boolean|EventListenerOptions)=>typeof options==='boolean'?options:!!options?.capture;
  return new Proxy(real, {set(target,key,value){return Reflect.set(target,key,value,target);},get(target,key){
    if(key==='body'||key==='documentElement')return root;
    if(key==='getElementById')return (id:string)=>root.querySelector(`[id="${CSS.escape(id)}"]`) || real.head.querySelector(`[id="${CSS.escape(id)}"]`);
    if(key==='querySelector')return (selector:string)=>root.querySelector(selector);
    if(key==='querySelectorAll')return (selector:string)=>root.querySelectorAll(selector);
    if(key==='addEventListener')return (type:string,listener:EventListenerOrEventListenerObject,options?:boolean|AddEventListenerOptions)=>{
      const cap=capture(options);if(listeners.some(x=>x.type===type&&x.listener===listener&&x.capture===cap))return;
      listeners.push({type,listener,capture:cap,off:scope.listen(real,type,listener,options)});
    };
    if(key==='removeEventListener')return (type:string,listener:EventListenerOrEventListenerObject,options?:boolean|EventListenerOptions)=>{
      const index=listeners.findIndex(x=>x.type===type&&x.listener===listener&&x.capture===capture(options));
      if(index>=0){listeners[index].off();listeners.splice(index,1);}
    };
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
  }});
}
