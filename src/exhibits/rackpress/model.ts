export const RADIUS=9;
export const TRAVEL=28;
export type Stamp='flower'|'star';
export interface PressState {travel:number;direction:1|-1;running:boolean;stamp:Stamp;imprint:Stamp|null;contacts:number;contact:boolean;observedDown:boolean;observedUp:boolean;}
export const initialState=():PressState=>({travel:0,direction:1,running:false,stamp:'flower',imprint:null,contacts:0,contact:false,observedDown:false,observedUp:false});
export const angle=(s:PressState)=>s.travel/RADIUS;
export function moveTo(s:PressState,value:number){
 if(!Number.isFinite(value))return;
 const before=s.travel;
 // Native range controls serialize fractional endpoints with browser-dependent
 // rounding. Snap only microscopic endpoint noise, not visibly short strokes.
 const clamped=Math.max(0,Math.min(TRAVEL,value));
 s.travel=clamped<=1e-7?0:TRAVEL-clamped<=1e-7?TRAVEL:clamped;
 if(s.travel-before>.01)s.observedDown=true;if(before-s.travel>.01)s.observedUp=true;
 const contact=s.travel===TRAVEL;
 if(contact&&!s.contact){s.contacts++;s.imprint=s.stamp;}
 s.contact=contact;
 if((s.direction===1&&s.travel===TRAVEL)||(s.direction===-1&&s.travel===0))s.running=false;
}
export function advance(s:PressState,dt:number){if(!s.running||!Number.isFinite(dt)||dt<=0)return;moveTo(s,s.travel+s.direction*RADIUS*.7*Math.min(dt,.1));}
export function newPaper(s:PressState){if(s.travel>2)return false;s.imprint=null;return true;}
