export const TAU=Math.PI*2, CENTERS=34, PIN_RADIUS=CENTERS/Math.sqrt(2), ENGAGE=Math.PI/4;
export interface GenevaState {angle:number;running:boolean;rpm:number;direction:1|-1;exploded:boolean}
export const initialState=():GenevaState=>({angle:-Math.PI,running:false,rpm:12,direction:1,exploded:false});
/** Exact ideal external four-slot Geneva kinematics. Input is unwrapped, so reversal is continuous. */
export function mechanism(angle:number){
 const cycle=Math.floor((angle+Math.PI)/TAU),phase=angle-cycle*TAU,t=Math.max(-ENGAGE,Math.min(ENGAGE,phase));
 const output=-cycle*Math.PI/2-Math.atan2(PIN_RADIUS*Math.sin(t),CENTERS-PIN_RADIUS*Math.cos(t))-Math.PI/4;
 const engaged=Math.abs(phase)<ENGAGE;
 return {phase,output,engaged,pinX:32+PIN_RADIUS*Math.cos(angle),pinY:42+PIN_RADIUS*Math.sin(angle),station:((Math.round(-output/(Math.PI/2))%4)+4)%4+1};
}
export function advance(s:GenevaState,dt:number){if(s.running&&Number.isFinite(dt)&&dt>0)s.angle+=Math.min(dt,.05)*s.rpm/60*TAU*s.direction;}
export interface Lesson {active:boolean;prediction:string;startAngle:number;sawMove:boolean;sawDwell:boolean;travel:number;direction:number;complete:boolean}
export const newLesson=():Lesson=>({active:false,prediction:'',startAngle:0,sawMove:false,sawDwell:false,travel:0,direction:0,complete:false});
export function beginLesson(l:Lesson,s:GenevaState,prediction:string){Object.assign(l,newLesson(),{active:true,prediction,startAngle:s.angle});}
export function observe(l:Lesson,before:number,s:GenevaState){if(!l.active||l.complete)return;const delta=Math.abs(s.angle-before);if(!delta)return;if(delta>Math.PI/12+1e-6){l.travel=0;l.sawMove=false;l.sawDwell=false;l.direction=0;return;}const direction=Math.sign(s.angle-before);if(l.direction&&l.direction!==direction){l.travel=0;l.sawMove=false;l.sawDwell=false;}l.direction=direction;l.travel+=delta;const m=mechanism(s.angle);if(m.engaged&&Math.abs(mechanism(before).output-m.output)>.00001)l.sawMove=true;if(!m.engaged&&Math.abs(mechanism(before).output-m.output)<.00001)l.sawDwell=true;l.complete=l.travel>=TAU-1e-9&&l.sawMove&&l.sawDwell;}
