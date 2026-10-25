/** Ideal, no-slip drivetrain. This is a teaching bench, not a rider simulation. */
export const FRONT_TEETH = 32;
export const REAR_TEETH = [32, 24, 16] as const;
export const WHEEL_CIRCUMFERENCE = 2.1;
export const HILL = Object.freeze({cadence:60, crankLimit:20, wheelRequired:15, distance:12});
export function drivetrain(gear:number,cadence:number){
 const index=Math.max(0,Math.min(2,Math.trunc(Number.isFinite(gear)?gear:0)));
 const rpm=Math.max(0,Math.min(120,Number.isFinite(cadence)?cadence:0));
 const rear=REAR_TEETH[index],ratio=FRONT_TEETH/rear;
 return {gear:index,rear,ratio,cadence:rpm,wheelRpm:rpm*ratio,speedKmh:rpm*ratio*WHEEL_CIRCUMFERENCE*.06,torqueMultiplier:1/ratio,availableWheelTorque:HILL.crankLimit/ratio,requiredCrankTorque:HILL.wheelRequired*ratio};
}
export function hillResult(gear:number){
 const d=drivetrain(gear,HILL.cadence);
 return {feasible:d.availableWheelTorque>=HILL.wheelRequired,best:d.gear===1,...d};
}
export interface BicycleState {gear:number;cadence:number;running:boolean;crankTurns:number;wheelTurns:number;chainTravel:number;challenge:'idle'|'riding'|'stalled'|'complete';distance:number;zoom:boolean;}
export function initialState():BicycleState{return {gear:1,cadence:60,running:false,crankTurns:0,wheelTurns:0,chainTravel:0,challenge:'idle',distance:0,zoom:false};}
export function advance(state:BicycleState,dt:number){
 if(!state.running||!Number.isFinite(dt)||dt<=0)return;
 const seconds=Math.min(dt,.05),d=drivetrain(state.gear,state.cadence),turns=d.cadence/60*seconds;
 state.crankTurns=(state.crankTurns+turns)%1000;
 state.wheelTurns=(state.wheelTurns+turns*d.ratio)%1000;
 state.chainTravel=(state.chainTravel+turns*FRONT_TEETH)%1000;
 if(state.challenge==='riding'){
  if(!hillResult(state.gear).feasible){state.challenge='stalled';state.running=false;return;}
  state.distance=Math.min(HILL.distance,state.distance+d.speedKmh/3.6*seconds);
  if(state.distance>=HILL.distance){state.challenge='complete';state.running=false;}
 }
}
