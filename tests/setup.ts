import {vi} from 'vitest';
Object.defineProperty(window,'matchMedia',{writable:true,value:vi.fn().mockImplementation(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}))});
Object.defineProperty(window,'scrollTo',{writable:true,value:vi.fn()});
Object.defineProperty(Element.prototype,'scrollIntoView',{writable:true,value:vi.fn()});
if(!globalThis.CSS)Object.defineProperty(globalThis,'CSS',{value:{escape:(s:string)=>s.replace(/[^a-zA-Z0-9_-]/g,'\\$&')}});
Object.defineProperty(SVGSVGElement.prototype,'viewBox',{get(){const [x=0,y=0,width=800,height=600]=(this.getAttribute('viewBox')||'0 0 800 600').split(/\s+/).map(Number);return {baseVal:{x,y,width,height}};}});
Object.defineProperty(SVGElement.prototype,'getBBox',{value:()=>({x:0,y:0,width:800,height:600})});
