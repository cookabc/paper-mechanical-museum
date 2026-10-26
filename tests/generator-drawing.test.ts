import {afterEach,describe,expect,it} from 'vitest';
import {drawing,generatorBounds,generatorCamera} from '../src/exhibits/generator/drawing';
import {initialState,electrical} from '../src/exhibits/generator/model';
import {createColorFiguresRuntime} from '../src/engines/colorfigures/runtime.js';
import {ResourceScope} from '../src/app/scope';

type V=[number,number,number];
type Call={method:string;args:unknown[]};
const scopes:ResourceScope[]=[];
afterEach(()=>{scopes.splice(0).forEach(scope=>scope.dispose());document.body.replaceChildren();});
function fixture(yaw=generatorCamera[0] as number,pitch=generatorCamera[1] as number){
 const root=document.createElement('main');document.body.append(root);const scope=new ResourceScope();scopes.push(scope);
 const geometry=createColorFiguresRuntime({root,scope,audio:{},observation:{}});geometry.setCam(yaw,pitch);geometry.setLight(105);
 const calls:Call[]=[];
 const g=new Proxy(geometry,{get(target,key){const value=Reflect.get(target,key);if(['rod','cylX','cyl','box','line'].includes(String(key))&&typeof value==='function')return (...args:unknown[])=>{calls.push({method:String(key),args});return Reflect.apply(value,target,args);};return value;}});
 return {g,calls};
}
const equal=(a:unknown,b:V)=>JSON.stringify(a)===JSON.stringify(b);
function hasRod(calls:Call[],a:V,b:V){return calls.some(call=>call.method==='rod'&&equal(call.args[0],a)&&equal(call.args[1],b));}

describe('generator crafted presentation retains physical assembly',()=>{
 it('keeps both support silhouettes outside the default winding window, with a clear pole gap',()=>{
  const {g,calls}=fixture(),state=initialState();drawing(state,g);
  const turns=calls.filter(c=>c.method==='rod'&&c.args[2]===.24&&c.args[7]===6);
  expect(turns).toHaveLength(40);
  const xs=turns.flatMap(c=>[c.args[0],c.args[1]] as V[]).map(p=>g.P(...p)[0]);
  const min=Math.min(...xs)-.24*Math.sqrt(1.5),max=Math.max(...xs)+.24*Math.sqrt(1.5);
  const projectedRadius=1.3*Math.sqrt(1.5);
  expect(g.P(31,63,44)[0]+projectedRadius).toBeLessThan(min);
  expect(g.P(41,13,44)[0]-projectedRadius).toBeGreaterThan(max);
  const sweepRadius=Math.hypot(11.5,4.5*.32)+.24;
  const poles=calls.filter(c=>c.method==='cylX');expect(poles).toHaveLength(2);
  expect(poles[0].args[1] as number).toBeLessThan(36-sweepRadius);
  expect(poles[1].args[0] as number).toBeGreaterThan(36+sweepRadius);
  expect(generatorBounds).toEqual({min:[-5,-6,0],max:[113,78,87]});
 });
 it.each([0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.5])('keeps winding loops, crank and rotating leads on the same phase %s',phase=>{
  const {g,calls}=fixture(),state={...initialState(),phase};const before={...state};drawing(state,g);expect(state).toEqual(before);
  const turns=calls.filter(c=>c.method==='rod'&&c.args[2]===.24&&c.args[7]===6);expect(turns).toHaveLength(40);
  for(let i=0;i<turns.length;i+=4)for(let j=0;j<4;j++)expect(turns[i+j].args[1]).toEqual(turns[i+(j+1)%4].args[0]);
  expect(hasRod(calls,[36,38,75],[36+17*Math.cos(phase),38+17*Math.sin(phase),76])).toBe(true);
  const rotor=(u:number,z:number):V=>[36-Math.sin(phase)*u,38+Math.cos(phase)*u,z];
  expect(hasRod(calls,rotor(-2,27),rotor(-2,24))).toBe(true);
  expect(hasRod(calls,rotor(2,27),rotor(2,20))).toBe(true);
 });
 it.each([true,false])('preserves every existing wire segment and actual terminal port when closed=%s',closed=>{
  const {g,calls}=fixture();drawing({...initialState(),closed},g);
  const routes:V[][]=[[[48.8,38,24],[54,38,24],[64,38,9],[72,49,9],[73,53,13]],[[48.8,38,20],[54,40,20],[63,44,9],[81,30,9],[82,23,15]],[[87,53,13],[97,53,9],[99,26,9],[94,23,15]]];
  for(const route of routes)for(let i=1;i<route.length;i++)expect(hasRod(calls,route[i-1],route[i])).toBe(true);
  expect(hasRod(calls,[73,53,16],closed?[87,53,16]:[81,53,25])).toBe(true);
  for(const x of[82,94])expect(calls.some(c=>c.method==='cyl'&&c.args.slice(0,4).join(',')===[x,23,13,15].join(','))).toBe(true);
 });
 it('keeps finite geometry, observation groups, direct targets and transparent glass through orbit and load states',()=>{
  for(const yaw of[0,68,158,248])for(const closed of[true,false]){
   const {g}=fixture(yaw),state={...initialState(),running:true,closed};const output=drawing(state,g),host=document.createElement('div');host.innerHTML=`<svg>${output}</svg>`;
   expect(output).not.toMatch(/NaN|Infinity/);
   for(const part of['field','coil','circuit','handle','lamp'])expect(host.querySelector(`[data-observe-part="${part}"] path`)).not.toBeNull();
   for(const action of['crank','switch'])expect(host.querySelectorAll(`[data-act="${action}"][role="button"][tabindex="0"]`)).toHaveLength(1);
   expect(Number(host.querySelector('[data-glass="shell"]')?.getAttribute('opacity'))).toBeCloseTo(.25+.12*electrical(state).brightness,2);
   const widths=[...host.querySelectorAll('[data-glass="contour"] path')].map(p=>Number(p.getAttribute('stroke-width')));expect(widths).toEqual([1.25]);
  }
 });
});
