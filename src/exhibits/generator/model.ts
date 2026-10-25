/** Ideal rotating coil and purely resistive load. No thermal/inertial model. */
export const K=1; // N B A = 1 V·s, one pole pair
export const RESISTANCE=10;
export const GOAL={minPower:1.5,maxPower:3,seconds:3};
export interface GeneratorState {rpm:number;direction:1|-1;running:boolean;closed:boolean;phase:number;elapsed:number;challenge:'idle'|'active'|'complete';held:number;}
export function initialState():GeneratorState{return {rpm:60,direction:1,running:false,closed:true,phase:0,elapsed:0,challenge:'idle',held:0};}
export function electrical(s:GeneratorState){
 const rpm=Math.max(0,Math.min(120,Number.isFinite(s.rpm)?s.rpm:0));
 const omega=(s.running?rpm:0)*Math.PI/30*s.direction;
 const flux=K*Math.cos(s.phase),emf=K*omega*Math.sin(s.phase),current=s.closed?emf/RESISTANCE:0;
 const rms=Math.abs(K*omega)/Math.SQRT2,averagePower=s.closed?rms*rms/RESISTANCE:0;
 return {rpm,omega,flux,emf,current,rms,averagePower,instantPower:current*current*RESISTANCE,frequency:Math.abs(omega)/(2*Math.PI),brightness:Math.min(1,averagePower/5)};
}
export function advance(s:GeneratorState,dt:number){
 if(!s.running||!Number.isFinite(dt)||dt<=0)return;
 const seconds=Math.min(dt,.05),d=electrical(s);
 s.phase=((s.phase+d.omega*seconds)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);s.elapsed+=seconds;
 if(s.challenge==='active'){
  const eligible=d.averagePower>=GOAL.minPower&&d.averagePower<=GOAL.maxPower;
  s.held=eligible?Math.min(GOAL.seconds,s.held+seconds):0;
  if(s.held>=GOAL.seconds-1e-8){s.held=GOAL.seconds;s.challenge='complete';}
 }
}
