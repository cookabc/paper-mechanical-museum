export const TAU=Math.PI*2;
export type CamState={phase:number;running:boolean;rpm:number;lobes:1|2;direction:1|-1;travel:number;lesson:boolean;observed:number;prediction:number|null};
export const initialState=():CamState=>({phase:0,running:false,rpm:18,lobes:1,direction:1,travel:0,lesson:false,observed:0,prediction:null});
export const wrap=(a:number)=>((a%TAU)+TAU)%TAU;
/** Polygon used both by the solid cam and its flat-faced follower. */
export function camProfile(s:Pick<CamState,'phase'|'lobes'>):[number,number][]{return Array.from({length:180},(_,i)=>{const a=i/180*TAU,r=13+4*Math.cos(s.lobes*a);return [25+r*Math.sin(a+s.phase),30+r*Math.cos(a+s.phase)];});}
export function mechanism(s:CamState){const profile=camProfile(s),top=Math.max(...profile.map(p=>p[1]));return {profile,top,lift:top-39,birdZ:top+40,cyclesPerTurn:s.lobes};}
export function turn(s:CamState,delta:number){if(!Number.isFinite(delta))return;s.phase=wrap(s.phase+delta);s.travel+=Math.abs(delta);if(s.lesson&&s.prediction!==null)s.observed=Math.min(TAU,s.observed+Math.abs(delta));}
export function advance(s:CamState,dt:number){if(s.running&&Number.isFinite(dt))turn(s,Math.max(0,Math.min(.05,dt))*s.rpm/60*TAU*s.direction);}
export function changeCam(s:CamState,lobes:1|2){s.lobes=lobes;s.observed=0;}
