/** Static extraction of the complete washer model and its native controls. */
import {layoutWasherCallouts,measureCalloutFrame} from './callout-layout.js';
export function createWasherModel(geometry,environment){
const {scope,document,window}=environment;
const addEventListener=(...args)=>scope.listen(globalThis.window,...args);
const {setTimeout,clearTimeout}=geometry.timers;
let calloutPresentation=null,calloutLegend=null,calloutLegendKey='',calloutMotion=[0,0];

/* ---------- geometry (x = depth, y = width, z = up) ---------- */
const W = 62, D = 65, H = 88, PL = 4, RCR = 7;         // depth, width, height, foot height, corner radius (RC is core's turning centre)
const OUT = geometry.rrUV(0, PL, D, H, RCR);                     // body profile in (y,z)
const CY = D/2, CZ = 39;                                // porthole centre on the front
const RO = 19, RB = 23.5, RG = 16.5, BT = 4.5;          // opening (drum) radius, bezel outer, glass radius, bezel thickness
const DRUM_D = 40;                                      // drum depth
const PANEL = [2, 68, D-2, H-2];                        // control strip
const DRW = [42, 72, 60, 83];                           // detergent drawer opening y0,z0,y1,z1
const DIAL = [34, 77, 5.2];                             // y, z, r
const DISP = [11.8, 73, 24.6, 81.5];
const BTN = [7, 77, 3.1];
const DOOR_MAX = 98 * Math.PI/180, DRAWER_MAX = 15;
const hy = CY - RB - 1, uc = RB + 1;                    // hinge line (screen-right edge of the door) and bezel centre in door coords

const STEEL = { l:'#8c9599', m:'#6a7377', d:'#454d51' };
const RUBBER = { l:'#5a5752', m:'#403d39', d:'#2a2825' };
const GREEN = '#43c25c', RED = '#e2483d', AMBER = '#f2b431';

/* ---------- helpers for the back and sides ---------- */
// text on the back plane (x = const, read from behind) and on the -y side
const txB = (x,y,z,str,size,col=geometry.INK,weight=700) => `<text transform="${geometry.txM(geometry.P(x,y,z), geometry.Dv(0,1,0), geometry.Dv(0,0,-1))}" font-size="${size}" fill="${col}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}" letter-spacing=".04em">${str}</text>`;
const txR = (x,y,z,str,size,col=geometry.INK,weight=700) => `<text transform="${geometry.txM(geometry.P(x,y,z), geometry.Dv(-1,0,0), geometry.Dv(0,0,-1))}" font-size="${size}" fill="${col}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}" letter-spacing=".04em">${str}</text>`;
// a soft hose / cable: smoothed 3D polyline drawn as ink + colour strokes (widths in model units, so not rescaled)
function smooth3(pts, it=3){
  for (let k=0;k<it;k++){ const o=[pts[0]];
    for (let i=0;i<pts.length-1;i++){ const a=pts[i], b=pts[i+1];
      o.push(a.map((v,j)=>v*.75+b[j]*.25), a.map((v,j)=>v*.25+b[j]*.75)); }
    o.push(pts[pts.length-1]); pts=o; }
  return pts;
}
function tube(pts, r, m, rib=false){
  const q = smooth3(pts), d = geometry.pd(q, false), sw = w => `style="stroke-width:${geometry.f(w)}"`, cap = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
  const hl = 'M' + q.map(p => { const [X,Y] = geometry.P(...p); return geometry.f(X - r*.35)+' '+geometry.f(Y - r*.35); }).join('L');
  return `<path d="${d}" ${cap} stroke="${geometry.INK}" ${sw(2*r + 2.4*geometry.INK_K)}/>` + `<path d="${d}" ${cap} stroke="${m.m}" ${sw(2*r)}/>`
    + (rib ? `<path d="${d}" fill="none" stroke="${m.d}" ${sw(2*r)} stroke-dasharray=".45 1.1" opacity=".55"/>` : '')
    + `<path d="${hl}" ${cap} stroke="${m.l}" ${sw(r*.55)} opacity=".85"/>`;
}
// a round screw head on a plane, with a slot
const screw = (pl, u, v, r=1.1) => geometry.shape(geometry.on(pl, geometry.ellUV(u, v, r, r, 12)), geometry.METAL.m, .7) + geometry.ink(geometry.pd(geometry.on(pl, [[u-r*.7, v-r*.25],[u+r*.7, v+r*.25]]), false), .6);

/* ---------- programs (compressed: T seconds of real time) ---------- */
const PROGS = [
  { name:'棉织', min:90, T:30, fill:4.2, wash:18.0, drain:21.0, ang:55 },
  { name:'快洗',  min:30, T:21, fill:3.0, wash:10.8, drain:13.2, ang:105 },
  { name:'脱水',   min:12, T:12, fill:0,   wash:0,   drain:0,   ang:155 },
];
const sstep = (a,b,t) => { const k = Math.min(1, Math.max(0, (t-a)/(b-a || 1e-9))); return k*k*(3-2*k); };
const phaseAt = (p,t) => t < p.fill ? 'fill' : t < p.wash ? 'wash' : t < p.drain ? 'drain' : 'spin';
function omegaAt(p,t){                                   // drum speed, rad/s (sign = direction)
  const ph = phaseAt(p,t);
  if (ph === 'fill') return 0.7;
  if (ph === 'wash') return 2.6 * (Math.sin((t - p.fill) * Math.PI / 1.5) >= 0 ? 1 : -1);
  if (ph === 'drain') return 1.2;
  return (1.5 + 19 * sstep(p.drain, p.drain + 1.2, t)) * (1 - sstep(p.T - .7, p.T, t));
}
const angleTables = new WeakMap();
function angleAt(p,t){
  let table=angleTables.get(p); if(!table){table=new Float64Array(Math.ceil(p.T*100)+2);for(let i=1;i<table.length;i++)table[i]=table[i-1]+omegaAt(p,(i-1)/100)*.01;angleTables.set(p,table);}
  const v=Math.max(0,Math.min(p.T,t)),i=Math.floor(v*100);return table[i]+omegaAt(p,i/100)*(v-i/100);
}
function waterAt(p,t){ if (!p.fill) return 0; if (t < p.fill) return sstep(0, p.fill, t); if (t < p.wash) return 1; if (t < p.drain) return 1 - sstep(p.wash, p.drain, t); return 0; }

/* ---------- clothes: soft flat shapes floating just behind the glass ---------- */
function chaikin(pts, it=2){
  for (let k=0;k<it;k++){ const o=[]; for (let i=0;i<pts.length;i++){ const a=pts[i], b=pts[(i+1)%pts.length];
    o.push([a[0]*.75+b[0]*.25, a[1]*.75+b[1]*.25], [a[0]*.25+b[0]*.75, a[1]*.25+b[1]*.75]); } pts=o; }
  return pts;
}
const SHAPES = {
  shirt: { body: chaikin([[-6,1.6],[-3.4,4.6],[-1.3,4.6],[0,3.3],[1.3,4.6],[3.4,4.6],[6,1.6],[4.2,-.2],[3.6,.9],[3.6,-5],[-3.6,-5],[-3.6,.9],[-4.2,-.2]],2),
           lines: [[[-1.3,4.6],[0,3.3],[1.3,4.6]], [[-3.6,-3.6],[3.6,-3.6]]] },
  sock:  { body: chaikin([[-1.9,5],[1.9,5],[1.9,-1],[5.2,-1.5],[5.8,-3.4],[4.8,-5],[-1.3,-5],[-1.9,-3.6]],2),
           lines: [[[-1.9,3.4],[1.9,3.4]], [[3.6,-1.4],[3.4,-5]]] },
  towel: { body: chaikin([[-5.6,-3.8],[5.6,-3.8],[5.6,3.8],[-5.6,3.8]],1),
           band: [[-5.4,.6],[5.4,.6],[5.4,2],[-5.4,2]], lines: [[[-5.4,-2.6],[5.4,-2.6]]] },
};
// heap: rest angle (deg, in the y-z plane), radius from drum axis, depth behind the front, own tilt
const CLOTHES = [
  { k:'towel', col:'#3e86d9', d:6.5, heap:[-125, 11,    10] },
  { k:'shirt', col:'#e2473a', d:5.5, heap:[-160, 9,    -25] },
  { k:'sock',  col:'#f2c230', d:4.5, heap:[-82, 12,     75] },
  { k:'shirt', col:'#fbf7ea', d:3.8, heap:[-108, 9.5,   15] },
  { k:'sock',  col:'#38a565', d:3.2, heap:[-150, 4.5, -110] },
  { k:'towel', col:'#d94f86', d:2.6, heap:[-62, 8,     160] },
];
function cloth(c, cy, cz, psi, op=1){
  const sh = SHAPES[c.k], X = W - c.d, k = 1.3, cs = k*Math.cos(psi), sn = k*Math.sin(psi);
  const T = ([u,v]) => [X, cy + u*cs - v*sn, cz + u*sn + v*cs];
  const m = geometry.matOf(c.col);
  let s = geometry.fill(geometry.pd(sh.body.map(T)), m.l) ;
  if (sh.band) s += geometry.fill(geometry.pd(sh.band.map(T)), c.col === '#fbf7ea' ? '#3e86d9' : '#fbf7ea', 'opacity=".85"');
  for (const l of sh.lines) s += geometry.ink(geometry.pd(l.map(T), false), .7);
  s += geometry.ink(geometry.pd(sh.body.map(T)), 1);
  return op < 1 ? `<g opacity="${op}">${s}</g>` : s;
}

/* ---------- laundry: clothes fly between the drum and a basket on the floor ---------- */
const BASKET = { x0: W + 7, x1: W + 29, y0: 36, y1: 62, h: 11, r: 4 };
const SPOTS = [[W+13,43,20],[W+22,53,-35],[W+15,55,80],[W+23,43,140],[W+18,49,-100],[W+14,48,45]];   // x, y, turn (deg)
const FLY = .45, GAP = .3;                                  // seconds per item, stagger
const xferEnd = () => (CLOTHES.length - 1) * GAP + FLY;
// progress of item i in the current transfer (0 = not started, 1 = landed)
const itemP = (st, i) => st.xfer ? Math.min(1, Math.max(0, (st.xfer.T - i*GAP) / FLY)) : 1;
// where item i is: 'drum', 'basket', or a number 0..1 while flying out (towards the basket)
function whereIs(st, i){
  if (!st.xfer) return st.laundry === 'basket' ? 'basket' : 'drum';
  const p = itemP(st, i);
  if (st.xfer.dir === 'out') return p <= 0 ? 'drum' : p >= 1 ? 'basket' : p;
  return p <= 0 ? 'basket' : p >= 1 ? 'drum' : 1 - p;
}
// A moving cloth can straddle stationary depth planes. Clip the original ink,
// rather than outlining the cut edge, so it never jumps in front of the heap.
function cloth3(c, ctr, e1, e2, psi, op=1, xRange=null, zRange=null){
  const sh = SHAPES[c.k], k = 1.3, cs = k*Math.cos(psi), sn = k*Math.sin(psi);
  const T = ([u,v]) => { const a = u*cs - v*sn, b = u*sn + v*cs; return [ctr[0]+a*e1[0]+b*e2[0], ctr[1]+a*e1[1]+b*e2[1], ctr[2]+a*e1[2]+b*e2[2]]; };
  const m = geometry.matOf(c.col);
  let s = geometry.fill(geometry.pd(sh.body.map(T)), m.l);
  if (sh.band) s += geometry.fill(geometry.pd(sh.band.map(T)), c.col === '#fbf7ea' ? '#3e86d9' : '#fbf7ea', 'opacity=".85"');
  for (const l of sh.lines) s += geometry.ink(geometry.pd(l.map(T), false), .7);
  s += geometry.ink(geometry.pd(sh.body.map(T)), 1);
  if(xRange||zRange){
    let region=[[-10,-10],[10,-10],[10,10],[-10,10]].map(T);
    for(const [axis,range] of [[0,xRange],[2,zRange]]){
      if(!range)continue;
      for(const [limit,keep] of [[range[0],1],[range[1],-1]]){
        if(!Number.isFinite(limit))continue;
        const out=[];for(let i=0;i<region.length;i++){const a=region[i],b=region[(i+1)%region.length],ia=(a[axis]-limit)*keep>=0,ib=(b[axis]-limit)*keep>=0;if(ia)out.push(a);if(ia!==ib){const t=(limit-a[axis])/(b[axis]-a[axis]);out.push(a.map((v,j)=>v+(b[j]-v)*t));}}
        region=out;if(region.length<3)return '';
      }
    }
    s=geometry.clipTo(region,s);
  }
  return op < 1 ? `<g opacity="${op}">${s}</g>` : s;
}
const drumPos = c => { const [h0, hr] = c.heap, a = h0*Math.PI/180; return [W - c.d, CY + hr*Math.cos(a), CZ + hr*Math.sin(a)]; };
const basketPos = i => { const [x,y,t] = SPOTS[i]; return [x, y, BASKET.h - 2.2 + i*.35, t*Math.PI/180]; };
// clothes in the air: one byDepth part each, so they sort against the door, basket and drawer in every view
function flying(st, xRange=[W,Infinity], zRange=[BASKET.h,Infinity]){
  const parts = [];
  CLOTHES.forEach((c, i) => {
    const w = whereIs(st, i); if (typeof w !== 'number') return;
    const a = drumPos(c), [bx,by,bz,bt] = basketPos(i), q = geometry.ease(w);
    const ctr = [a[0] + (bx-a[0])*q + 4*Math.sin(Math.PI*q), a[1] + (by-a[1])*q, a[2] + (bz-a[2])*q + 16*Math.sin(Math.PI*q)];
    const e2 = geometry.norm([q, 0, 1-q]);                           // stands up in the drum, lies flat in the basket
    parts.push({ at: ctr, svg: cloth3(c, ctr, [0,1,0], e2, c.heap[2]*Math.PI/180*(1-q) + bt*q + 2.2*Math.sin(Math.PI*q),1,xRange,zRange) });
  });
  return parts;
}
const PL_M = { l:'#7cc4ea', m:'#5aa6d0', d:'#2f6d92' };
const bRing = (z, ins) => { const B = BASKET; return geometry.on(geometry.PZ(z), geometry.rrUV(B.x0+ins, B.y0+ins, B.x1-ins, B.y1-ins, B.r)); };   // PZ: u = x, v = y
const basketShadow = () => geometry.castShadow([...bRing(0, 1.5), ...bRing(BASKET.h, 0)]);
const basketAt = () => [(BASKET.x0 + BASKET.x1)/2, (BASKET.y0 + BASKET.y1)/2, BASKET.h/2];
function basket(st){
  const B = BASKET, ring = bRing;
  let s = '';
  const top = ring(B.h, 0), bot = ring(0, 1.5);
  s += geometry.loft(bot, top, n => geometry.toneI(n, PL_M));
  // slots in the walls that face the viewer
  let sl = '';
  if (geometry.facing([1,0,0]))  for (let y = B.y0 + 6; y <= B.y1 - 6; y += 4) sl += geometry.pd([[B.x1-.6, y, 3.5],[B.x1-.6, y, 7.5]], false);
  if (geometry.facing([-1,0,0])) for (let y = B.y0 + 6; y <= B.y1 - 6; y += 4) sl += geometry.pd([[B.x0+.6, y, 3.5],[B.x0+.6, y, 7.5]], false);
  if (geometry.facing([0,1,0]))  for (let x = B.x0 + 6; x <= B.x1 - 6; x += 4) sl += geometry.pd([[x, B.y1-.6, 3.5],[x, B.y1-.6, 7.5]], false);
  if (geometry.facing([0,-1,0])) for (let x = B.x0 + 6; x <= B.x1 - 6; x += 4) sl += geometry.pd([[x, B.y0+.6, 3.5],[x, B.y0+.6, 7.5]], false);
  s += `<path d="${sl}" fill="none" stroke="${PL_M.d}" stroke-width="1.6" stroke-linecap="round"/>`;
  s += geometry.hullInk([...bot, ...top], 1.4);
  // inside: floor + the clothes that have landed, lying flat
  let inside = geometry.fill(geometry.pd(top), PL_M.d) + geometry.fill(geometry.pd(ring(B.h - 3, 1)), geometry.mix(PL_M.d, '#000000', .2));
  let clothFloor=-Infinity;
  CLOTHES.forEach((c, i) => { if (whereIs(st, i) !== 'basket') return; const [x,y,z,t] = basketPos(i);
    if(st.xfer)inside+=geometry.byDepth(flying(st,[-Infinity,Infinity],[clothFloor,z]));
    clothFloor=z;inside += cloth3(c, [x,y,z], [0,1,0], [1,0,0], t);
  });
  if(st.xfer)inside+=geometry.byDepth(flying(st,[-Infinity,Infinity],[clothFloor,B.h]));
  s += geometry.clipTo(top, inside);
  s += geometry.ink(geometry.pd(top), 1.4) + geometry.ink(geometry.pd(ring(B.h, 1.2)), .7);
  return s;
}
// detergent box: tips over the open drawer and pours powder into the main compartment
function soapBox(st){
  if (st.soapAnim == null) return '';
  const t = st.soapAnim, inn = Math.min(1, t/.2), out = t > .85 ? (t-.85)/.15 : 0;
  const tilt = (t < .2 ? 0 : t < .35 ? (t-.2)/.15 : t < .85 ? 1 : 1 - out) * 112 * Math.PI/180;
  const base = [W + DRAWER_MAX*.5, 59, 96 + 10*(1-geometry.ease(inn)) + 10*geometry.ease(out)], op = Math.min(inn, 1-out);
  const c = Math.cos(tilt), sn = Math.sin(tilt), wx = 6, wy = 9, h = 12;
  const X = ([x,y,z]) => [base[0] + x, base[1] + y*c - z*sn, base[2] + y*sn + z*c], R = ([x,y,z]) => [x, y*c - z*sn, y*sn + z*c];
  const BOX = geometry.matOf('#f08a2b');
  const F = [
    [[1,0,0],  [[wx/2,-wy/2,0],[wx/2,wy/2,0],[wx/2,wy/2,h],[wx/2,-wy/2,h]]],
    [[-1,0,0], [[-wx/2,-wy/2,0],[-wx/2,wy/2,0],[-wx/2,wy/2,h],[-wx/2,-wy/2,h]]],
    [[0,1,0],  [[-wx/2,wy/2,0],[wx/2,wy/2,0],[wx/2,wy/2,h],[-wx/2,wy/2,h]]],
    [[0,-1,0], [[-wx/2,-wy/2,0],[wx/2,-wy/2,0],[wx/2,-wy/2,h],[-wx/2,-wy/2,h]]],
    [[0,0,1],  [[-wx/2,-wy/2,h],[wx/2,-wy/2,h],[wx/2,wy/2,h],[-wx/2,wy/2,h]]],
    [[0,0,-1], [[-wx/2,-wy/2,0],[wx/2,-wy/2,0],[wx/2,wy/2,0],[-wx/2,wy/2,0]]] ];
  let s = '';
  for (const [n, q] of F){ const rn = R(n); if (!geometry.vis(rn)) continue;
    s += geometry.shape(q.map(X), n[2] === 1 ? '#fbf7ea' : geometry.toneI(rn, BOX), 1);
    if (n[0] === 1) s += geometry.fill(geometry.pd([[wx/2+.05,-wy/2,h*.45],[wx/2+.05,wy/2,h*.45],[wx/2+.05,wy/2,h*.7],[wx/2+.05,-wy/2,h*.7]].map(X)), '#fbf7ea'); }
  // powder stream from the open corner down into the drawer
  if (t > .33 && t < .87){
    const sp = X([0, -wy/2, h]), zb = DRW[3] - 1.2, ys = 51;
    s += `<path d="${geometry.pd([sp, [sp[0]-1, ys, zb]], false)}" fill="none" stroke="#6fa6e8" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="1.6 1.3" stroke-dashoffset="${geometry.f(-t*60)}"/>`;
  }
  return `<g opacity="${geometry.f(op)}">${s}</g>`;
}

/* ---------- state helpers ---------- */
const prog = st => PROGS[st.prog];
const fmt = min => Math.floor(min/60) + ':' + String(Math.max(0, Math.round(min % 60))).padStart(2,'0');
const remaining = st => { const p = prog(st); return st.run ? Math.ceil(p.min * (1 - st.tau / p.T)) : p.min; };

/* ---------- the drum seen through the opening ---------- */
const ringX = (x, r, n=36) => geometry.on(geometry.PX(x), geometry.ellUV(CY, CZ, r, r, n));
// how much the inner drum wall at angle a (in the y-z plane) faces the viewer (>0 = visible); view 0: -(cos a + sin a)
const wallVis = (dy, dz) => { const r = geometry.rotV([0, -dy, -dz]); return r[0] + r[1] + r[2]; };
function drum(st){
  const p = prog(st), t = st.tau, run = st.run;
  const A = run ? (st.startA||0)+angleAt(p, t) : st.restA, om = run ? omegaAt(p, t)*(st.drive??1) : 0, fast = Math.abs(om) > 7;
  let s = geometry.fill(geometry.pd(ringX(W - DRUM_D, RO)), '#2b3134');
  s += geometry.ink(geometry.pd(ringX(W - DRUM_D + .1, 5)), .8);
  // inner wall, darker further back
  const secs = [[0,7,0],[7,16,.18],[16,DRUM_D,.36]];
  for (const [a,b,k] of secs){
    const dm = { l:geometry.mix(STEEL.l,'#000000',k), m:geometry.mix(STEEL.m,'#000000',k), d:geometry.mix(STEEL.d,'#000000',k) };
    s += geometry.loft(ringX(W - a, RO), ringX(W - b, RO), n => geometry.toneI(n, dm), true);
  }
  // perforations (or motion streaks when spinning fast) and the three lifters
  const dep = [2.5, 6, 9.5, 13, 16.5, 20, 24];
  if (fast){
    for (const d of dep){ const arc = geometry.ellUV(CY, CZ, RO-.05, RO-.05, 48).filter(([y,z]) => wallVis(y-CY, z-CZ) > 0).map(([y,z]) => [W-d,y,z]);
      s += `<path d="${geometry.pd(arc,false)}" fill="none" stroke="#1d2224" stroke-width=".9" stroke-dasharray="1 2.4" opacity=".7"/>`; }
  } else {
    let dots = '';
    for (const d of dep) for (let i = 0; i < 24; i++){
      const a = A + (i + (d*.37 % 1)) / 24 * 2*Math.PI, cy = Math.cos(a), sz = Math.sin(a);
      if (wallVis(cy, sz) < .15) continue;
      const q = (da, dx) => [W - d + dx, CY + (RO-.05)*Math.cos(a+da), CZ + (RO-.05)*Math.sin(a+da)];
      dots += geometry.pd([q(-.035,-.45), q(.035,-.45), q(.035,.45), q(-.035,.45)]);
    }
    s += `<path d="${dots}" fill="#20262a"/>`;
  }
  for (let k = 0; k < 3; k++){
    const a = A + k * 2*Math.PI/3 + .4;
    if (wallVis(Math.cos(a), Math.sin(a)) < -.2) continue;
    const q = (r, da, d) => [W - d, CY + r*Math.cos(a+da), CZ + r*Math.sin(a+da)];
    const op = fast ? ' opacity=".45"' : '';
    s += `<g${op}>` + geometry.shape([q(RO,-.2,1), q(RO,-.2,DRUM_D-4), q(RO-2.4,0,DRUM_D-4), q(RO-2.4,0,1)], '#9aa3a6', .7)
       + geometry.shape([q(RO,.2,1), q(RO,.2,DRUM_D-4), q(RO-2.4,0,DRUM_D-4), q(RO-2.4,0,1)], '#b8c0c2', .7) + `</g>`;
  }
  // clothes: tumble on a circle around the drum axis, pinned to the wall when spinning
  const spread = run ? sstep(0, .9, t) * (1 - sstep(p.T - .8, p.T, t)) : 0;
  const spinK = run ? sstep(p.drain, p.drain + 1, t) * (1 - sstep(p.T - .8, p.T, t)) : 0;
  const items = CLOTHES.map((c, i) => ({ c, i })).filter(o => whereIs(st, o.i) === 'drum').map(({ c, i }) => {
    const [h0, hr, ht] = c.heap, even = -Math.PI/2 + i * 2*Math.PI/CLOTHES.length;
    const base = h0*Math.PI/180 * (1-spread) + even * spread;
    const ang = base + A * spread;
    const r = hr * (1-spread) + (9.5 + 2.2*Math.sin(A*1.3 + i*1.7)) * spread * (1-spinK) + 14.3 * spinK * spread;
    const psi = ht*Math.PI/180 + A * spread * (1 + .25*Math.sin(i));
    return { c, ang, r, psi };
  }).sort((a,b) => b.c.d - a.c.d);
  let clothBack=-Infinity;
  for (const o of items){
    const x=W-o.c.d;
    if(st.xfer)s+=geometry.byDepth(flying(st,[clothBack,x]));
    clothBack=x;
    if (fast) for (let g = 3; g >= 1; g--){ const ga = o.ang - Math.sign(om) * g * .26;
      s += cloth(o.c, CY + o.r*Math.cos(ga), CZ + o.r*Math.sin(ga), o.psi - Math.sign(om)*g*.26, .34 - g*.08); }
    s += cloth(o.c, CY + o.r*Math.cos(o.ang), CZ + o.r*Math.sin(o.ang), o.psi);
  }
  if(st.xfer)s+=geometry.byDepth(flying(st,[clothBack,W]));
  // water: translucent fill with a wavy top and a little foam
  const lv = run ? waterAt(p, t) : 0;
  if (lv > .01){
    const zl = CZ - RO - 1 + lv * 17, xw = W - 2, top = [];
    for (let y = CY + RO + 2; y >= CY - RO - 2; y -= 1)
      top.push([xw, y, zl + 1.1*Math.sin(y*.55 + t*7) + .6*Math.sin(y*.21 - t*4) + .07*(y-CY)*Math.sign(om)]);
    const poly = [...top, [xw, CY-RO-2, CZ-RO-3], [xw, CY+RO+2, CZ-RO-3]];
    s += geometry.fill(geometry.pd(poly), '#4f9fdc', 'opacity=".42"');
    s += `<path d="${geometry.pd(top,false)}" fill="none" stroke="#d7f0ff" stroke-width="1.2" stroke-linecap="round" opacity=".9"/>`;
    if (phaseAt(p,t) === 'wash') for (let i = 0; i < 9; i++){
      const y = CY - 13 + i*3.3 + Math.sin(t*3 + i)*1.2, z = zl + 1.1*Math.sin(y*.55 + t*7) + .3;
      s += geometry.fill(geometry.pd(geometry.on(geometry.PX(xw - .2), geometry.ellUV(y, z, 1 + (i%3)*.35, .8 + (i%2)*.3, 10))), '#ffffff', 'opacity=".85"');
    }
  }
  // gasket: rubber lip around the mouth of the drum
  s += geometry.loft(ringX(W, RO - 2.2), ringX(W - 3, RO - 2.2), n => geometry.toneI(n, RUBBER), true);
  s += geometry.fill(geometry.pd(ringX(W, RO)) + geometry.pd(ringX(W, RO - 2.2)), RUBBER.m, 'fill-rule="evenodd"') + geometry.ink(geometry.pd(ringX(W, RO - 2.2)), .9);
  return s;
}

/* ---------- the porthole door: bezel ring + glass, turning about a vertical hinge at its right edge ---------- */
const dP = (a,u,v,th) => [W + a*Math.cos(th) + u*Math.sin(th), hy - a*Math.sin(th) + u*Math.cos(th), v];
const dRing = (a, r, th, n=40) => geometry.ellUV(uc, CZ, r, r, n).map(([u,v]) => dP(a,u,v,th));
function dBox(a0,a1,u0,u1,v0,v1,m,th,w=1){
  const c = (a,u,v) => dP(a,u,v,th), nA = [Math.cos(th), -Math.sin(th), 0], nU = [Math.sin(th), Math.cos(th), 0];
  const F = [
    [nA, [c(a1,u0,v0),c(a1,u1,v0),c(a1,u1,v1),c(a1,u0,v1)]], [nA.map(x=>-x), [c(a0,u0,v0),c(a0,u1,v0),c(a0,u1,v1),c(a0,u0,v1)]],
    [nU, [c(a0,u1,v0),c(a1,u1,v0),c(a1,u1,v1),c(a0,u1,v1)]], [nU.map(x=>-x), [c(a0,u0,v0),c(a1,u0,v0),c(a1,u0,v1),c(a0,u0,v1)]],
    [[0,0,1], [c(a0,u0,v1),c(a1,u0,v1),c(a1,u1,v1),c(a0,u1,v1)]] ];
  return F.filter(([n]) => geometry.vis(n)).map(([n,q]) => geometry.shape(q, geometry.toneI(n,m), w)).join('');
}
const BEZEL = { l:'#f4f5f3', m:'#c9cfd0', d:'#8f989b' };
function door(st){
  const th = geometry.ease(st.door) * DOOR_MAX, nF = [Math.cos(th), -Math.sin(th), 0];
  let s = '';
  // hinge arms (behind the ring on the hinge side)
  for (const z of [CZ+9, CZ-13]) s += dBox(.5, 3.4, -1, 3, z, z+4, geometry.METAL, th, .9);
  s += geometry.loft(dRing(0, RB, th), dRing(BT, RB, th), n => geometry.toneI(n, BEZEL));
  if (geometry.vis(nF)){
    s += geometry.loft(dRing(1.5, RG, th), dRing(BT, RG, th), n => geometry.toneI(n, { l:'#d9dedf', m:'#aab2b4', d:'#7d8689' }), true);
    // glass: tint + streaks (contents were drawn earlier)
    const gl = dRing(1.5, RG, th);
    s += geometry.fill(geometry.pd(gl), '#cfe9f0', `opacity="${st.door > 0 ? .5 : .2}"`);
    const st1 = [[-9,-15],[-3,-15],[13,13],[7,13]].map(([u,v]) => dP(1.5, uc+u, CZ+v, th));
    const st2 = [[-0,-15],[2.5,-15],[18.5,13],[16,13]].map(([u,v]) => dP(1.5, uc+u, CZ+v, th));
    s += geometry.clipTo(gl, geometry.fill(geometry.pd(st1),'#ffffff','opacity=".36"') + geometry.fill(geometry.pd(st2),'#ffffff','opacity=".36"'));
    // front face of the ring
    const fo = dRing(BT, RB, th), fi = dRing(BT, RG, th);
    s += `<path d="${geometry.pd(fo)}${geometry.pd(fi)}" fill="${geometry.toneI(nF, BEZEL)}" fill-rule="evenodd"/>`;
    s += geometry.ink(geometry.pd(dRing(BT+.05, RG + 3.2, th)), .7) + geometry.ink(geometry.pd(fi), 1.5) + geometry.ink(geometry.pd(fo), 1.8);
    // handle on the opening edge (screen left)
    s += dBox(BT-1, BT+2, 2*RB - 2, 2*RB + 3, CZ - 6.5, CZ + 6.5, BEZEL, th, 1.1);
    s += dBox(BT+2, BT+2.6, 2*RB, 2*RB + 2.5, CZ - 5, CZ + 5, geometry.matOf('#9aa3a6'), th, .8);
  } else {
    // inside of the door: back face of the ring and the glass bowl that pushes into the drum
    const bo = dRing(0, RB, th), bi = dRing(0, RG, th);
    s += `<path d="${geometry.pd(bo)}${geometry.pd(bi)}" fill="${geometry.toneI(nF.map(x=>-x), BEZEL)}" fill-rule="evenodd"/>` + geometry.ink(geometry.pd(bo), 1.8);
    s += geometry.fill(geometry.pd(bi), '#cfe9f0', 'opacity=".35"');
    const b0 = dRing(0, RG, th), b1 = dRing(-4, RG - 3.5, th), b2 = dRing(-6, RG - 8, th);
    s += `<g opacity=".72">` + geometry.loft(b0, b1, n => geometry.toneI(n, geometry.CLEAR)) + geometry.loft(b1, b2, n => geometry.toneI(n, geometry.CLEAR)) + geometry.fill(geometry.pd(b2), geometry.CLEAR.l) + `</g>`;
    s += geometry.ink(geometry.pd(b2), .9) + geometry.hullInk([...b0, ...b1, ...b2], 1.2);
    const gl = [[-4,-9],[-1.5,-9],[6,6],[3.5,6]].map(([u,v]) => dP(-5.2, uc+u, CZ+v, th));
    s += geometry.fill(geometry.pd(gl), '#ffffff', 'opacity=".45"');
  }
  return geometry.act('door', s);
}

/* ---------- detergent drawer ---------- */
function drawer(st){
  const s0 = geometry.ease(st.drawer) * DRAWER_MAX, xf = W + s0;
  const [y0,z0,y1,z1] = DRW;
  let s = '';
  if (s0 > .2){
    // tray body (only the part outside the machine can be seen)
    const by0 = y0 + .6, by1 = y1 - .6, bz0 = z0 + .6, bz1 = z1 - 1.2;
    const sw = geometry.facing([0,1,0]) ? by1 : by0;
    s += geometry.shape([[W,sw,bz0],[xf,sw,bz0],[xf,sw,bz1],[W,sw,bz1]], '#d6dadb', 1);   // side wall toward the viewer
    s += geometry.shape([[W,by0,bz1],[xf,by0,bz1],[xf,by1,bz1],[W,by1,bz1]], '#eef0f0', 1);   // rim
    // compartments: prewash | main (powder) | softener
    const comp = [[by0+.8, by0+5.2, '#3a3e40'], [by0+6, by1-5.4, '#3a3e40'], [by1-4.6, by1-.8, '#3a3e40']];
    const xa = W + .2, xb = xf - .9;
    if (xb > xa) comp.forEach(([a,b,c], i) => {
      s += geometry.shape([[xa,a,bz1],[xb,a,bz1],[xb,b,bz1],[xa,b,bz1]], c, .7);
      if (i === 1 && st.soapLvl > .02) s += geometry.fill(geometry.pd([[xa,a+.6,bz1+.05],[xb-.6,a+.6,bz1+.05],[xb-.6,b-.6,bz1+.05],[xa,b-.6,bz1+.05]]), '#dfe9f7', `opacity="${geometry.f(Math.min(1, st.soapLvl*1.4))}"`) +
        `<path d="${[0,1,2,3,4,5].slice(0, Math.ceil(st.soapLvl*6)).map(k => geometry.pd(geometry.on(geometry.PZ(bz1+.1), geometry.ellUV(xa + (xb-xa)*(.2+.13*k), a+1.5+(k%3)*1.6, .35, .35, 6)))).join('')}" fill="#6fa6e8"/>`;
      if (i === 2) s += geometry.fill(geometry.pd([[xa,a+.5,bz1+.05],[xb-.5,a+.5,bz1+.05],[xb-.5,b-.5,bz1+.05],[xa,b-.5,bz1+.05]]), '#c99de8', 'opacity=".9"');
    });
  }
  // front plate
  const m = { l:'#f7f6f1', m:'#dcdad0', d:'#a8a597' };
  s += geometry.box(xf, y0+.2, z0+.2, xf + 1.4, y1-.2, z1-.2, m, geometry.toneI, 1.2);
  s += geometry.shape(geometry.on(geometry.PX(xf + 1.45), geometry.rrUV(y0 + 4, z0 + 1.6, y1 - 4, z0 + 3.4, .9)), '#3a3e40', .8);   // finger pull
  s += geometry.tx(xf + 1.5, (y0+y1)/2, z0 + 6.1, '预洗 主洗 柔顺', 2.6, '#6a6658', 700);
  return geometry.act('drawer', s);
}

/* ---------- control panel pieces ---------- */
function dial(st){
  const [y,z,r] = DIAL, F = W + .25;
  let s = geometry.cylX(F, F + 2.6, y, z, r, BEZEL, geometry.toneI, 1.2, 28);
  // ribbed edge marks
  // grip bar, pointing at the selected program
  const a = (st.dialAngle??PROGS[st.prog].ang) * Math.PI/180, ca = Math.cos(a), sa = Math.sin(a);
  const bar = [[-1.1,-4.3],[1.1,-4.3],[1.1,4.3],[-1.1,4.3]].map(([u,v]) => [y + u*sa + v*ca, z - u*ca + v*sa]);
  const B0 = geometry.on(geometry.PX(F + 2.6), bar), B1 = geometry.on(geometry.PX(F + 4.4), bar);
  s += geometry.loft(B0, B1, n => geometry.toneI(n, BEZEL)) + geometry.fill(geometry.pd(B1), BEZEL.l) + geometry.hullInk([...B0, ...B1], 1) + geometry.ink(geometry.pd(B1), .8);
  s += geometry.fill(geometry.pd(geometry.on(geometry.PX(F + 4.45), geometry.ellUV(y + 3.2*ca, z + 3.2*sa, .7, .7, 10))), RED);
  // program ticks + letters
  let t = '';
  PROGS.forEach((p, i) => {
    const pa = p.ang * Math.PI/180, sel = i === st.prog;
    t += geometry.fill(geometry.pd(geometry.on(geometry.PX(W + .3), geometry.ellUV(y + 6*Math.cos(pa), z + 6*Math.sin(pa), .7, .7, 10))), sel ? GREEN : '#b5b2a6');
    t += geometry.tx(W + .3, y + 8*Math.cos(pa), z + 8*Math.sin(pa) - .9, p.name[0], 2.6, sel ? geometry.INK : '#6a6658', 800);
  });
  return t + geometry.act('dial', s);
}
function display(st){
  const [y0,z0,y1,z1] = DISP, cy = (y0+y1)/2, p = prog(st);
  let s = geometry.shape(geometry.on(geometry.PX(W + .3), geometry.rrUV(y0, z0, y1, z1, 1.6)), '#1d2a26', 1.2);
  let l1, l2;
  if(st.latch){l1=st.latch==='locking'?'锁定':'解锁';l2='···';}
  else if (st.done && !st.run){ l1 = '完成'; l2 = '结束'; }
  else if (st.run){ const ph = phaseAt(p, st.tau); l1 = st.paused ? '暂停' : { fill:'进水', wash:'洗涤', drain:'排水', spin:'脱水' }[ph]; l2 = fmt(remaining(st)); }
  else { l1 = p.name; l2 = fmt(p.min); }
  s += geometry.tx(W + .4, cy, z0 + 5.6, l1, 2.5, '#8af0ae', 700);
  s += geometry.tx(W + .4, cy, z0 + 1.7, l2, 3.6, '#8af0ae', 800);
  return s;
}
function startBtn(st){
  const [y,z,r] = BTN, lit = st.latch?AMBER:st.run ? (st.paused ? AMBER : GREEN) : st.done ? GREEN : '#b5b2a6';
  let s = geometry.fill(geometry.pd(geometry.on(geometry.PX(W + .25), geometry.ellUV(y, z, r + 1, r + 1, 24))), lit) + geometry.ink(geometry.pd(geometry.on(geometry.PX(W + .25), geometry.ellUV(y, z, r + 1, r + 1, 24))), .9);
  const press=st.pressedAct==='start'||st.latch==='locking'?.65:0;
  s += geometry.cylX(W + .3, W + 2.4-press, y, z, r, BEZEL, geometry.toneI, 1.1, 24);
  const tri = [[y + 1, z - 1.4], [y + 1, z + 1.4], [y - 1.4, z]];
  s += geometry.fill(geometry.pd(geometry.on(geometry.PX(W + 2.45-press), tri)), geometry.INK);
  return geometry.act('start', s) + geometry.tx(W + .3, y, PANEL[1] + 1.4, '启动', 1.9, '#6a6658', 800);
}

/* ---------- the back (x = 0) and the right side (y = 0): only seen once the machine is turned ---------- */
const BK = geometry.PX(-.15);                                       // plane just proud of the back panel
const CORD = [[-1.6,12,82],[-3.6,12.4,79.5],[-5,13,71],[-5.8,13.6,44],[-6.2,14.2,16],[-6.8,15.2,3.4],[-7.6,17.6,1],[-8.6,20,1.2],[-9.5,20.5,1.7]];
const INLET = [[-4.6,44,81],[-7.6,44.4,79],[-10,45,72],[-11.6,45.6,50],[-12.4,46,22],[-12.8,45.4,6],[-14,44.2,1.6],[-16.5,42.6,1.3]];
const DRAIN_UP = [[-2.6,24,13],[-2.9,24,30],[-2.9,24,52],[-3,24.2,66]];
const DRAIN_DN = [[-3,24.2,66],[-3.4,24.5,70.5],[-6.6,25.2,72],[-9.4,25.8,67],[-12.6,26.4,52],[-15.6,26.8,30],[-17.6,27.2,12],[-19.4,27.6,3],[-22,28,1.4],[-25,28.4,1.4]];
const HOSE_M = geometry.matOf('#a9b0b2'), CORD_M = { l:'#5b5650', m:'#2f2c29', d:'#1b1917' }, INLET_M = { l:'#ffffff', m:'#e8ecec', d:'#b9c0c1' };
const TAP_B = geometry.matOf('#3e86d9'), TAP_R = geometry.matOf('#e2483d'), CAPS = geometry.matOf('#dedbd0');
function backFace(m){
  const tb = geometry.tone([-1,0,0], m), dk = geometry.mix(tb, '#000000', .06);
  let s = '';
  // service panel with vent slots and four screws
  s += geometry.shape(geometry.on(BK, geometry.rrUV(32, 24, 58, 64, 3)), dk, 1.2);
  for (const z of [55.5, 52, 48.5, 45]) s += geometry.shape(geometry.on(geometry.PX(-.2), geometry.rrUV(37, z, 53, z + 1.6, .8)), geometry.mix(tb, '#000000', .45), .7);
  for (const [u,v] of [[35,27],[55,27],[35,61],[55,61]]) s += screw(geometry.PX(-.2), u, v);
  // a row of screws holding the lid
  for (const u of [22, 36, 58]) s += screw(geometry.PX(-.2), u, 85.3, 1);
  // model / rating plate with a barcode
  s += geometry.shape(geometry.on(geometry.PX(-.2), geometry.rectUV(36, 7.5, 58, 19)), '#fbf7ea', .9);
  s += txB(-.3, 47, 15.8, '清风九号', 2, geometry.INK, 800);
  s += txB(-.3, 47, 13, '四公斤 · 二百三十伏', 1.25, '#6a6658', 700);
  let bc = ''; for (let i = 0; i < 18; i++){ const u = 39 + i*.9; if (i % 3 !== 1) bc += geometry.pd([[-.25, u, 8.8],[-.25, u, 11.2]], false); }
  s += `<path d="${bc}" fill="none" stroke="${geometry.INK}" stroke-width=".7"/>`;
  // labels by the water inlets and the drain
  s += txB(-.3, 48, 76, '进水', 1.8, geometry.mix(tb, '#000000', .6), 800);
  s += txB(-.3, 24, 8.5, '排水', 1.8, geometry.mix(tb, '#000000', .6), 800);
  return s;
}
// everything that sticks out of the back, in a fixed order that is correct for both views that see the back (1, 2)
function backBits(){
  let s = '';
  // transit-bolt caps
  for (const [y,z] of [[17,40],[61,44],[40,70]]) s += geometry.cylX(-1.2, 0, y, z, 2.6, CAPS, geometry.toneI, .9, 18) + geometry.ink(geometry.pd(geometry.on(geometry.PX(-1.25), [[y-1.3, z],[y+1.3, z]]), false), .7);
  // power-cord grommet, drain spigot, hot inlet (capped red), cold inlet (blue nut, hose on)
  s += geometry.cylX(-1.6, 0, 12, 82, 1.9, RUBBER, geometry.toneI, .9, 18);
  s += geometry.cylX(-2.6, 0, 24, 13, 2.5, HOSE_M, geometry.toneI, 1, 18);
  s += geometry.cylX(-2.4, 0, 52, 81, 1.4, geometry.METAL, geometry.toneI, .8, 18) + geometry.cylX(-4.6, -2.4, 52, 81, 2.2, TAP_R, geometry.toneI, 1, 18);
  s += geometry.cylX(-2.4, 0, 44, 81, 1.4, geometry.METAL, geometry.toneI, .8, 18) + geometry.cylX(-4.6, -2.4, 44, 81, 2.3, TAP_B, geometry.toneI, 1, 18);
  // the hoses and the cord hang out from the back at different depths, so they are sorted for the current view
  const mid = pts => geometry.avg(pts);
  const plug = geometry.box(-14, 18, 0, -9.5, 23, 3.4, CORD_M, geometry.toneI, 1) + [19.5, 21.5].map(y =>
      `<path d="${geometry.pd([[-14, y, 1.7],[-16.6, y, 1.7]], false)}" fill="none" stroke="${geometry.INK}" stroke-width="1.5" stroke-linecap="round"/>`
    + `<path d="${geometry.pd([[-14, y, 1.7],[-16.6, y, 1.7]], false)}" fill="none" stroke="${geometry.METAL.m}" style="stroke-width:.5" stroke-linecap="round"/>`).join('');
  s += geometry.byDepth([
    { at: mid(CORD), svg: tube(CORD, .75, CORD_M) },
    { at: [-11.75, 20.5, 1.7], svg: plug },
    { at: mid(INLET), svg: tube(INLET, 1.3, INLET_M) + geometry.cylX(-19.6, -16.5, 42.4, 1.6, 1.6, TAP_B, geometry.toneI, .9, 18) },
    { at: mid(DRAIN_UP), svg: tube(DRAIN_UP, 1.8, HOSE_M, true) + geometry.box(-5.2, 21.6, 58, -1.8, 26.4, 61.5, geometry.METAL, geometry.toneI, .9) },
    { at: mid(DRAIN_DN), svg: tube(DRAIN_DN, 1.8, HOSE_M, true) },
  ]);
  return s;
}
function sideRight(m){                                     // the -y side
  const sm = geometry.tone([0,-1,0], m), pl = geometry.PY(-.2), tc = geometry.mix(sm, m.d, .3);   // on a sunlit face the face colour vanishes on the decal
  let s = '';
  // big round decal with bubbles
  s += geometry.shape(geometry.on(pl, geometry.rrUV(12, 36, W - 12, 64, 6)), geometry.mix(sm, '#ffffff', .12), 1.2);
  for (const [u,v,r] of [[W-20, 56, 3.4],[W-27, 59.5, 2],[W-25, 52.5, 1.4]]) s += geometry.shape(geometry.on(geometry.PY(-.25), geometry.ellUV(u, v, r, r, 16)), tc, .9);
  s += txR(W/2 - 3, -.3, 47, '清风洗衣机', 4.6, tc, 800);
  s += txR(W/2 - 3, -.3, 41, '静音驱动', 2.6, tc, 800);
  // vent grille near the back, low down
  for (let k = 0; k < 6; k++){ const u = 7 + k*2.6; s += geometry.shape(geometry.on(geometry.PY(-.25), geometry.rrUV(u, 10, u + 1.2, 22, .6)), geometry.mix(sm, '#000000', .45), .7); }
  // warning sticker
  s += geometry.shape(geometry.on(geometry.PY(-.25), [[W-17, 12],[W-9, 12],[W-13, 19]]), '#f2c230', .9);
  s += txR(W - 13, -.3, 12.8, '!', 4, geometry.INK, 900);
  return s;
}

/* ---------- scene ---------- */
const geometryMemo = new Map();let geometryView='';
function memoGeo(key, build){if(geometryMemo.has(key))return geometryMemo.get(key);const v=build();geometryMemo.set(key,v);return v;}
function scene(st, m){
 calloutPresentation=null;
 const view=[geometry.YAW,geometry.PITCH,geometry.OX,geometry.OY,geometry.INK_K,st.pal,st.az].join('|');if(view!==geometryView){geometryMemo.clear();geometryView=view;}
 const p=prog(st),FRONT=geometry.facing([1,0,0]),BACK=geometry.facing([-1,0,0]),LEFT=geometry.facing([0,1,0]),RIGHT=geometry.facing([0,-1,0]);
 const showBasket=st.door>.02||st.laundry==='basket'||st.xfer;
 const om=st.run?omegaAt(p,st.tau)*(st.drive??1):0,shake=Math.max(0,(Math.abs(om)-8)/12);
 const jx=shake*(.55*Math.sin(st.tau*97)+.3*Math.sin(st.tau*151)),jy=shake*(.45*Math.sin(st.tau*123+1));
 calloutMotion=[jx,jy];
 const motion=`translate(${jx.toFixed(3)} ${jy.toFixed(3)})`;
 const layers=[];const add=(key,svg,transform=motion,opacity=1)=>layers.push({key,svg,transform,opacity});
 let shadow=memoGeo('shadow',()=>geometry.castShadow([...geometry.on(geometry.PX(0),OUT),...geometry.on(geometry.PX(W),OUT)]));
 if(st.door>.02){const th=geometry.ease(st.door)*DOOR_MAX;shadow+=geometry.castShadow(dRing(0,RB,th,24).concat(dRing(BT,RB,th,24)));}
 if(showBasket)shadow+=memoGeo('basketShadow',basketShadow);add('shadow',shadow,'');
 add('feet',memoGeo('feet',()=>geometry.byDepth([[5,D-5],[5,5],[W-5,D-5],[W-5,5]].map(([x,y])=>({at:[x,y,0],svg:geometry.cyl(x,y,0,PL+.5,2.6,RUBBER,geometry.toneI,1,16)})))));
 const body=memoGeo('shell',()=>{let body='';const X=geometry.PX(W);if(FRONT){
      // drawer cavity
      const dr = geometry.rectUV(DRW[0], DRW[1], DRW[2], DRW[3]);
      body += geometry.fill(geometry.pd(geometry.on(geometry.PX(W), dr)), '#1f1d1a');
      // front face with its holes, then the control strip
      body += `<path d="${geometry.pd(geometry.on(X, OUT))}${geometry.pd(ringX(W, RO))}${geometry.pd(geometry.on(X, dr))}" fill="${geometry.tone([1,0,0], m)}" fill-rule="evenodd"/>`;
      body += geometry.ink(geometry.pd(ringX(W, RO)), 1.6);
      const pnl = geometry.on(geometry.PX(W + .15), geometry.rrUV(...PANEL, 4));
      body += `<path d="${geometry.pd(pnl)}${geometry.pd(geometry.on(geometry.PX(W + .15), dr))}" fill="${geometry.mix(geometry.tone([1,0,0], m), '#ffffff', .62)}" fill-rule="evenodd"/>`;
      body += geometry.ink(geometry.pd(pnl), 1.3) + geometry.ink(geometry.pd(geometry.on(geometry.PX(W + .15), dr)), 1.6);
      // service hatch + badge on the kick panel
      body += geometry.shape(geometry.on(geometry.PX(W + .15), geometry.rrUV(4.5, 7, 14.5, 12.5, 1.5)), geometry.mix(geometry.tone([1,0,0], m), '#000000', .06), 1);
      body += geometry.ink(geometry.pd(geometry.on(geometry.PX(W + .2), [[8,9.75],[11,9.75]]), false), 1);
      body += geometry.tx(W + .3, 46, 8.6, '清风九号', 2.6, geometry.tone([1,0,0], m) === m.d ? m.l : m.d, 800);
    }
    if (BACK) body += geometry.fill(geometry.pd(geometry.on(geometry.PX(0), OUT)), geometry.tone([-1,0,0], m)) + backFace(m);

    // outer body + side details
    body += geometry.extrude(OUT, 0, W, m);
    if (LEFT){
      const sm = geometry.tone([0,1,0], m);
      body += geometry.shape(geometry.on(geometry.PY(D + .2), geometry.rrUV(12, 30, W - 12, 62, 6)), geometry.mix(sm, '#ffffff', .12), 1.2);
      const tc = geometry.mix(sm, m.d, .3);
      body += geometry.txY(W/2, D + .3, 49, '洗涤', 10, tc, 800);
      body += geometry.txY(W/2, D + .3, 40, '四公斤 · 四十度', 4, tc, 800);
      let v = ''; for (const z of [12, 16, 20]) v += geometry.pd([[14, D + .2, z], [W - 14, D + .2, z]], false);
      body += `<path d="${v}" fill="none" stroke="${geometry.INK}" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`;
    }
    if (RIGHT) body += sideRight(m);
    // top: a little care-label sticker
    const tp = geometry.PZ(H + .1);
    body += geometry.shape(geometry.on(tp, geometry.rrUV(16, 18, 34, 44, 2)), '#fbf7ea', 1);
    for (const k of [0,1,2,3]) body += geometry.ink(geometry.pd(geometry.on(tp, [[29 - k*3.6, 22], [29 - k*3.6, k === 0 ? 40 : 35]]), false), k === 0 ? 1.1 : .7);

    // silhouette + the outline of whichever end panel faces us
    if (FRONT) body += geometry.ink(geometry.pd(geometry.on(X, OUT)), 2.2);
    if (BACK) body += geometry.ink(geometry.pd(geometry.on(geometry.PX(0), OUT)), 2.2);
    body += geometry.hullInk([...geometry.on(geometry.PX(0), OUT), ...geometry.on(geometry.PX(W), OUT)], 2.8);

return body;});
 const inner=FRONT?geometry.clipTo(ringX(W,RO),st.door>.02?geometry.act('door',geometry.fill(geometry.pd(ringX(W,RO)),'transparent')+drum(st)):drum(st)):'';
 let mounted=display(st)+dial(st)+startBtn(st);
 mounted+=geometry.tx(W+.3,CY,PANEL[1]-3.2,st.run?'已锁定':'未锁定',1.9,st.run?RED:'#6a6658',800);
 mounted+=memoGeo('hinges',()=>[CZ+9,CZ-13].map(z=>geometry.cyl(W+1.6,hy+1,z-.5,z+4.5,1.3,geometry.METAL,geometry.toneI,.9,14)).join(''));
 const th=geometry.ease(st.door)*DOOR_MAX,s0=geometry.ease(st.drawer)*DRAWER_MAX;
 const parts=[
 {key:'door',at:dP(BT/2,uc,CZ,th),svg:door(st)},
 showBasket&&{key:'basket',at:basketAt(),svg:geometry.act('laundry',basket(st))},
 {key:'drawer',at:[W+s0+.7,(DRW[0]+DRW[2])/2,(DRW[1]+DRW[3])/2],svg:drawer(st)},
 st.soapAnim!=null&&{key:'soap',at:[W+DRAWER_MAX*.5,59,100],svg:soapBox(st)},
 ...flying(st).map((part,i)=>({...part,key:'flying-'+i}))
 // Only the airborne slice above the rim is exterior; everything below it
 // already lives inside the basket. The higher slice cannot be hidden by its floor.
 ].filter(Boolean).sort((a,b)=>a.key==='basket'?-1:b.key==='basket'?1:geometry.depthOf(a.at)-geometry.depthOf(b.at));
 const addParts=()=>parts.forEach(part=>add(part.key,part.svg));
 const front=()=>{if(FRONT){add('controls',mounted);addParts()}else{addParts();add('controls',mounted)}};
 const back=memoGeo('back',backBits),k=geometry.ease(st.xr||0);
 if(FRONT)add('back',back);else front();
 if(k>0){
 const far=memoGeo('interior-shell',()=>geometry.loft(geometry.on(geometry.PX(0),OUT),geometry.on(geometry.PX(W),OUT),n=>geometry.mix(geometry.toneI(n.map(v=>-v),m),'#f2efe7',.55),true)+(FRONT?geometry.fill(geometry.pd(geometry.on(geometry.PX(0),OUT)),geometry.mix(m.d,'#f2efe7',.5)):'')+(BACK?geometry.fill(geometry.pd(geometry.on(geometry.PX(W),OUT)),geometry.mix(m.d,'#f2efe7',.5)):''));
 add('far',far,motion,.5*k);add('mechanism',mechanism(st,m,k));
 }
 add('drum',`<g data-observe-part="washer-drum">${inner}</g>`,motion,1-.8*k);add('shell',body,motion,1-.8*k);
 if(k>0)add('outline',memoGeo('outline',()=>geometry.hullInk([...geometry.on(geometry.PX(0),OUT),...geometry.on(geometry.PX(W),OUT)],2.8)),motion,.6*k);
 if(FRONT)front();else add('back',back);
 if(!document.documentElement.classList.contains('nolabels'))add('labels',k>.6?MECH_LABELS:callouts(surface部件名称(st,FRONT,BACK)),'');
 scene.layers=layers;
 return layers.map(l=>`<g data-layer="${l.key}" transform="${l.transform}" opacity="${l.opacity}">${l.svg}</g>`).join('');
}

/* ---------- inside view: the working parts, behind a see-through cabinet ----------
   Everything here is real washer anatomy, sized to this cabinet, and driven by the same program clock as the drum.
   The tub hangs from two springs and stands on two dampers; the drum turns inside it on a shaft driven by a belt
   from the motor; the heater sits in the sump under the drum; the pump empties the sump out of the back. */
const XT0 = 15, XT1 = W - 3, RT = 22.5;                 // tub: back, front, radius
const XD0 = W - 2 - 38, XD1 = W - 2;                   // drum
const XPU = 10, RPU = 17;                               // big pulley plane and radius
const MOT = { x0: 13, x1: 31, y: CY + 6, z: 10.5, r: 4.6, rp: 2.3 };
const PUMP = { x0: 44, x1: 56, y: 10.5, z: 9, r: 4 };
const TUBM = { l:'#eef0ee', m:'#cdd3d2', d:'#9aa4a4' }, ALU = { l:'#e6e9ea', m:'#b9c0c3', d:'#7f888c' };
const MOTM = { l:'#7d8a96', m:'#5e6b77', d:'#3c4650' }, CONC = { l:'#d6d2c8', m:'#b5b0a4', d:'#8a857a' };
const VALVE = { l:'#f2efe6', m:'#d6d1c3', d:'#a29c8b' }, COPPER = { l:'#e6a46d', m:'#c47c45', d:'#8a4e24' };
const WATER = '#4f9fdc';
const ringT = (x, r, n=40) => geometry.on(geometry.PX(x), geometry.ellUV(CY, CZ, r, r, n));
const tubZ = dy => CZ - Math.sqrt(RT*RT - dy*dy);     // tub underside at y = CY + dy
const tubTop = dy => CZ + Math.sqrt(RT*RT - dy*dy);
const SPR = [-1, 1].map(s => ({ a: [34, CY + s*13, tubTop(13)], b: [34, CY + s*26, H - 3] }));      // springs: tub → cabinet top
const DMP = [-1, 1].map(s => ({ a: [36, CY + s*12, PL], b: [36, CY + s*12, tubZ(12)] }));           // dampers: floor → tub

const add3 = (a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v)*t);
function coil(a, b, r, turns, w=1){
  const d = geometry.norm(geometry.sub(b, a)), u = geometry.norm(geometry.cross(d, [1,0,0])), v = geometry.cross(d, u), pts = [], n = turns*14;
  for (let i = 0; i <= n; i++){ const t = i/n, g = t*turns*2*Math.PI, c = Math.cos(g)*r, s = Math.sin(g)*r;
    pts.push([a[0]+(b[0]-a[0])*t + u[0]*c + v[0]*s, a[1]+(b[1]-a[1])*t + u[1]*c + v[1]*s, a[2]+(b[2]-a[2])*t + u[2]*c + v[2]*s]); }
  const dd = geometry.pd(pts, false);
  return `<path d="${dd}" fill="none" stroke="${geometry.INK}" stroke-width="${2.2*w}" stroke-linecap="round"/><path d="${dd}" fill="none" stroke="${geometry.METAL.m}" style="stroke-width:.55" stroke-linecap="round"/>`;
}
// water moving through a hose: blue dashes running along it
const flow = (pts, t, on, rev=false) => !on ? '' :
  `<path d="${geometry.pd(smooth3(pts), false)}" fill="none" stroke="${WATER}" style="stroke-width:1.1" stroke-dasharray="2.2 2.6" stroke-dashoffset="${geometry.f((rev ? 1 : -1) * t * 22)}" stroke-linecap="round"/>`;
// the far half of the tub (seen through its near half), its contents, then the near half
function tubPart(st, k, sway, A, lv, heat){
  const op = (o, s) => `<g opacity="${o}">${s}</g>`, back = geometry.vis([-1,0,0]), front = geometry.vis([1,0,0]);
  const A0 = ringT(XT0, RT), A1 = ringT(XT1, RT);
  let s = '';
  // far wall + the end cap we see from inside
  s += op(.55, geometry.loft(A0, A1, n => geometry.toneI(n, TUBM), true) + (!back ? geometry.fill(geometry.pd(A0), TUBM.d) : '') + (!front ? geometry.fill(geometry.pd(A1), TUBM.d) : ''));
  // the water: a slice of the tub's circle, below the level line
  if (lv > .01){
    const zl = CZ - RT + .6 + lv*19, a0 = Math.asin(Math.max(-1, Math.min(1, (zl - CZ)/(RT - .4))));
    const prof = geometry.arcUV(CY, CZ, RT - .4, 180 - a0*180/Math.PI, 360 + a0*180/Math.PI, 24);
    s += op(.5, geometry.extrude(prof, XT0 + .4, XT1 - .4, { l:'#9fd0f2', m:'#6fb2e6', d:'#3f86c4' }, geometry.toneI));
  }
  // heater: a U-shaped element in the sump under the drum, glowing while it heats
  const hm = heat > 0 ? { l: geometry.mix(COPPER.l, '#ff7a2a', heat), m: geometry.mix(COPPER.m, '#ff5a1a', heat), d: geometry.mix(COPPER.d, '#c2300a', heat) } : COPPER;
  const hz = tubZ(0) + 2.1;
  s += geometry.rod([XT1 - 2, CY - 3, hz], [XT0 + 9, CY - 3, hz], .75, hm) + geometry.rod([XT0 + 9, CY + 3, hz], [XT1 - 2, CY + 3, hz], .75, hm)
     + geometry.rod([XT0 + 9, CY - 3, hz], [XT0 + 9, CY + 3, hz], .75, hm);
  if (heat > .05) s += `<path d="${geometry.pd([[XT1 - 2, CY, hz],[XT0 + 9, CY, hz]], false)}" stroke="#ff8a3a" style="stroke-width:${geometry.f(6*heat)}" opacity="${geometry.f(.25*heat)}" stroke-linecap="round"/>`;
  // the drum: perforated steel, three spider arms on its back, turning
  const R0 = ringT(XD0, RO), R1 = ringT(XD1, RO);
  s += geometry.loft(R0, R1, n => geometry.toneI(n, STEEL));
  let dots = '';
  const fast = Math.abs(st.run ? omegaAt(prog(st), st.tau) : 0) > 7;
  for (let x = XD0 + 3; x < XD1 - 2; x += 3.4) for (let i = 0; i < 30; i++){
    const a = A + (i + (x*.37 % 1)) / 30 * 2*Math.PI, n = [0, Math.cos(a), Math.sin(a)];
    if (geometry.d3(geometry.rotV(n), [1,1,1]) < .25) continue;
    const q = (da, dx) => [x + dx, CY + (RO+.05)*Math.cos(a+da), CZ + (RO+.05)*Math.sin(a+da)];
    dots += fast ? geometry.pd([q(-.25,0), q(.25,0)], false) : geometry.pd([q(-.03,-.45), q(.03,-.45), q(.03,.45), q(-.03,.45)]);
  }
  s += fast ? `<path d="${dots}" fill="none" stroke="#2a3134" stroke-width=".8" opacity=".6"/>` : `<path d="${dots}" fill="#2a3134"/>`;
  if (back){ s += geometry.fill(geometry.pd(R0), geometry.toneI([-1,0,0], STEEL));
    for (let j = 0; j < 3; j++){ const a = A + j*2*Math.PI/3; s += geometry.shape(geometry.on(geometry.PX(XD0 - .3), [[CY + 2*Math.cos(a+.5), CZ + 2*Math.sin(a+.5)], [CY + 17*Math.cos(a+.12), CZ + 17*Math.sin(a+.12)], [CY + 17*Math.cos(a-.12), CZ + 17*Math.sin(a-.12)], [CY + 2*Math.cos(a-.5), CZ + 2*Math.sin(a-.5)]]), ALU.m, .8); }
    s += geometry.ink(geometry.pd(R0), 1); }
  s += geometry.hullInk([...R0, ...R1], 1.6) + geometry.ink(geometry.pd(R1), .9);
  // through the mouth: the drum's inside with the clothes and water, as in the normal view
  if (front) s += geometry.clipTo(ringX(XD1, RO - .2), drum(st));
  // near wall, rims
  s += op(.32, geometry.loft(A0, A1, n => geometry.toneI(n, TUBM)) + (back ? geometry.fill(geometry.pd(A0), geometry.toneI([-1,0,0], TUBM)) : ''));
  s += geometry.ink(geometry.pd(A0), .9) + geometry.ink(geometry.pd(A1), .9) + geometry.hullInk([...A0, ...A1], 1.6);
  // rubber bellows from the tub's mouth to the cabinet front
  const g0 = ringT(XT1, RT - 1.5), g1 = ringT(W - .3, RO + 1.2);
  s += op(.85, geometry.loft(g1, g0, n => geometry.toneI(n, RUBBER))) + geometry.ink(geometry.pd(g0), .8);
  return s;
}
function pulleyBelt(st, A){
  let s = '';
  const fx = geometry.vis([1,0,0]) ? XPU + 1.2 : XPU - 1.2, fn = geometry.vis([1,0,0]) ? [1,0,0] : [-1,0,0];
  // shaft from the drum's back through the tub to the pulley
  s += geometry.rod([XPU - 1.4, CY, CZ], [XD0 + .3, CY, CZ], 1.5, geometry.METAL);
  s += geometry.cylX(XPU - 1.2, XPU + 1.2, CY, CZ, RPU, ALU, geometry.toneI, 1.4, 40);
  // five spoke windows, turning with the drum
  let win = '';
  for (let j = 0; j < 5; j++){ const a0 = A + j*2*Math.PI/5;
    win += geometry.pd(geometry.on(geometry.PX(fx + (fn[0] > 0 ? .05 : -.05)), [...geometry.arcUV(CY, CZ, 5.5, (a0+.22)*180/Math.PI, (a0+1.0)*180/Math.PI, 5), ...geometry.arcUV(CY, CZ, 13.5, (a0+1.0)*180/Math.PI, (a0+.22)*180/Math.PI, 7)])); }
  s += `<path d="${win}" fill="${ALU.d}" stroke="${geometry.INK}" stroke-width=".7"/>`;
  s += geometry.shape(geometry.on(geometry.PX(fx + fn[0]*.1), geometry.ellUV(CY, CZ, 3, 3, 16)), ALU.m, .8);
  // belt: the two outside tangents between the pulleys plus the wrapped arcs
  const c1 = [CY, CZ], c2 = [MOT.y, MOT.z], r1 = RPU + .3, r2 = MOT.rp + .3, d = [c2[0]-c1[0], c2[1]-c1[1]];
  const L = Math.hypot(...d), ph = Math.atan2(d[1], d[0]), be = Math.acos((r1 - r2)/L);
  const pt = (c, r, a) => [c[0] + r*Math.cos(a), c[1] + r*Math.sin(a)], loop = [];
  for (let i = 0; i <= 10; i++) loop.push(pt(c2, r2, ph + be - 2*be*i/10));
  for (let i = 0; i <= 40; i++) loop.push(pt(c1, r1, ph - be - (2*Math.PI - 2*be)*i/40));
  const bp = geometry.pd(geometry.on(geometry.PX(XPU), loop));
  s += `<path d="${bp}" fill="none" stroke="${geometry.INK}" style="stroke-width:${geometry.f(2.6*geometry.INK_K + 1.6)}" stroke-linejoin="round"/>`
     + `<path d="${bp}" fill="none" stroke="#3a3632" style="stroke-width:1.6" stroke-linejoin="round"/>`
     + `<path d="${bp}" fill="none" stroke="#8a8378" style="stroke-width:.6" stroke-dasharray="1 2.2" stroke-dashoffset="${geometry.f(-A*RPU)}"/>`;
  // motor pulley
  s += geometry.cylX(XPU - 1.2, XPU + 1.2, MOT.y, MOT.z, MOT.rp, geometry.METAL, geometry.toneI, 1, 16);
  const ma = A * RPU / MOT.rp;
  s += geometry.ink(geometry.pd(geometry.on(geometry.PX(fx + fn[0]*.1), [[MOT.y, MOT.z], [MOT.y + 1.8*Math.cos(ma), MOT.z + 1.8*Math.sin(ma)]]), false), .9);
  return s;
}
function motor(st, A){
  let s = geometry.cylX(MOT.x0, MOT.x1, MOT.y, MOT.z, MOT.r, MOTM, geometry.toneI, 1.4, 24);
  // cooling ribs + a strap holding it to the tub
  for (let x = MOT.x0 + 3; x < MOT.x1 - 2; x += 2.6) s += geometry.line(geometry.arcUV(MOT.y, MOT.z, MOT.r + .05, 30, 200, 8).map(([y, z]) => [x, y, z]), .6);
  s += geometry.rod([XPU + 1.3, MOT.y, MOT.z], [MOT.x0, MOT.y, MOT.z], .8, geometry.METAL);
  s += geometry.box(MOT.x0 + 4, MOT.y - 2, MOT.z + MOT.r - .5, MOT.x1 - 4, MOT.y + 2, tubZ(MOT.y - CY) + .4, geometry.DARK, geometry.toneI, .9);
  return s;
}
function pump(st, t, running){
  let s = geometry.cylX(PUMP.x0, PUMP.x1, PUMP.y, PUMP.z, PUMP.r, geometry.DARK, geometry.toneI, 1.3, 20);
  s += geometry.box(PUMP.x0 + 2, PUMP.y - 3, PL, PUMP.x1 - 2, PUMP.y + 3, PUMP.z - PUMP.r + .3, geometry.DARK, geometry.toneI, .8);   // foot
  const cap = geometry.vis([1,0,0]) ? PUMP.x1 + .1 : PUMP.x0 - .1, a = running ? t*30 : 0;
  for (let j = 0; j < 4; j++){ const g = a + j*Math.PI/2; s += geometry.ink(geometry.pd(on_(cap, g)), .7); }
  return s;
  function on_(x, g){ return geometry.on(geometry.PX(x), [[PUMP.y, PUMP.z], [PUMP.y + 3*Math.cos(g), PUMP.z + 3*Math.sin(g)]]); }
}
function counterweight(){
  const x0 = XT1 - 13, x1 = XT1 - 1, y0 = CY - 12, y1 = CY + 12, z0 = tubTop(12) + .6, z1 = tubTop(0) + 6;
  let s = geometry.box(x0, y0, z0, x1, y1, z1, CONC, geometry.toneI, 1.2);
  for (const y of [y0 + 3.5, y1 - 3.5]) s += geometry.cyl((x0 + x1)/2, y, z1, z1 + .8, 1.3, geometry.METAL, geometry.toneI, .8, 12);
  // grit on the visible faces
  let g = ''; for (let i = 0; i < 26; i++){ const u = (i*.618 % 1), v = (i*.382 + .1) % 1;
    g += geometry.pd(geometry.on(geometry.PZ(z1 + .05), geometry.ellUV(x0 + 1 + u*(x1 - x0 - 2), y0 + 1 + v*(y1 - y0 - 2), .35, .35, 6))); }
  return s + `<path d="${g}" fill="${CONC.d}"/>`;
}
function inlet(){
  // valve block on the back wall, one solenoid per inlet (hot red, cold blue), behind the inlet taps
  let s = geometry.box(1, 40, 77, 6.5, 56, 85, VALVE, geometry.toneI, 1.1);
  s += geometry.cyl(3.8, 44, 85, 88 - .6, 1.9, geometry.matOf('#4a78c8'), geometry.toneI, .9, 14) + geometry.cyl(3.8, 52, 85, 88 - .6, 1.9, geometry.matOf('#d0503e'), geometry.toneI, .9, 14);
  return s;
}
const HOSE_IN = [[6.5, 48, 81], [16, 49, 84.5], [W - 30, 51, 84.5], [W - 22.5, 51, 80]];
const HOSE_SOAP = [[W - 11, 50, 71], [W - 11, 49, 66], [W - 11, 47, tubTop(14.5) + .2]];
const HOSE_SUMP = [[W - 9, CY, tubZ(0)], [W - 9, CY - 6, tubZ(0) - 3], [W - 9, 20, 11], [PUMP.x1 - 3, PUMP.y + PUMP.r, PUMP.z]];
const HOSE_OUT = [[PUMP.x0, PUMP.y, PUMP.z], [36, 9, 9], [14, 14, 9], [4, 22, 12], [0, 24, 13]];
const HOSE_AIR = [[XT0 + 4, CY - 8, tubZ(8)], [10, 12, 22], [6, 9, 50], [6, 10, 80]];
function drawerBox(){
  return `<g opacity=".7">` + geometry.box(W - 22.5, DRW[0] - .5, DRW[1] - 1.5, W - .4, DRW[2] + .5, DRW[3] + .5, VALVE, geometry.toneI, 1) + `</g>`;
}
// pills in two columns either side of the cabinet, sorted top to bottom so leaders never cross
function callouts(items){
  const pts = []; for (const x of [0, W]) for (const y of [0, D]) for (const z of [0, H]) pts.push(geometry.P(x, y, z));
  const svgEl=document.getElementById('fig'),measured=measureCalloutFrame(svgEl,[document.getElementById('btns')]);
  const projected=items.map(item=>{const [X,Y]=geometry.P(...item.at);return {...item,X,Y};});
  const layout=layoutWasherCallouts(projected,{...measured,body:{left:Math.min(...pts.map(p=>p[0])),right:Math.max(...pts.map(p=>p[0]))}});
  calloutPresentation=layout;
  const fs=layout.fontSize,k=1/measured.scale;
  let s = '';
  for(const c of layout.labels){
      const {px,side}=c,w=c.width,hgt=c.height;
      const X=c.X+calloutMotion[0],Y=c.Y+calloutMotion[1];
      const ex = px - side*w/2;
      s += `<g class="tag${c.on ? ' on' : ''}" data-callout="${c.number}" aria-label="${c.number} · ${c.text}"><title>${c.text}</title><path d="M${geometry.f(X)} ${geometry.f(Y)}L${geometry.f(ex - side*4*k)} ${geometry.f(c.py)}L${geometry.f(ex)} ${geometry.f(c.py)}" fill="none" stroke="${geometry.INK}" stroke-width="1"/>`
        + `<circle cx="${geometry.f(X)}" cy="${geometry.f(Y)}" r="${geometry.f(1.4*k)}" fill="${geometry.INK}"/>`
        + `<rect x="${geometry.f(px - w/2)}" y="${geometry.f(c.py - hgt/2)}" width="${geometry.f(w)}" height="${geometry.f(hgt)}" rx="${geometry.f(hgt/2)}" fill="${c.on ? 'var(--accent,#f4b829)' : '#fff4d6'}" stroke="${geometry.INK}" stroke-width="1.2"/>`
        + `<text x="${geometry.f(px)}" y="${geometry.f(c.py + fs*.36)}" font-size="${fs}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800" fill="${geometry.INK}">${layout.mode==='numbered'?c.number:c.text}</text></g>`;
  }
  return s;
}
// labels for what can be seen from outside: front parts when the front faces us, back parts when the back does
function surface部件名称(st, FRONT, BACK){
  const th = geometry.ease(st.door) * DOOR_MAX, s0 = geometry.ease(st.drawer) * DRAWER_MAX, L = [];
  if (FRONT) L.push(
    { at: dP(BT, uc + RB*.72, CZ - RB*.7, th), text: '舱门', on: st.door > 0 },
    { at: [W + .3, (DISP[0] + DISP[2])/2, (DISP[1] + DISP[3])/2], text: '显示屏', on: st.run },
    { at: [W + 1, DIAL[0], DIAL[1] + DIAL[2]], text: '程序旋钮', on: false },
    { at: [W + 1, BTN[0], BTN[1] + BTN[2]], text: '启动', on: st.run },
    { at: [W + s0, (DRW[0] + DRW[2])/2, DRW[3]], text: '洗涤剂抽屉', on: st.drawer > 0 },
    { at: [W + .2, 9.5, 9.75], text: '滤网盖', on: false });
  if (BACK) L.push(
    { at: [-4.6, 48, 83], text: '进水接口', on: false },
    { at: [-1.6, 12, 83.5], text: '电源线', on: false },
    { at: [-1.2, 17, 42.4], text: '运输螺栓', on: false },
    { at: [-3, 24, 30], text: '排水管', on: false });
  return L;
}
let MECH_LABELS = '';
function mechanism(st, m, k){
  const p = prog(st), t = st.tau, run = st.run, ph = run ? phaseAt(p, t) : null;
  const A = run ? (st.startA||0)+angleAt(p, t) : st.restA, om = run ? omegaAt(p, t)*(st.drive??1) : 0;
  const lv = run ? waterAt(p, t) : 0, heat = ph === 'wash' ? sstep(p.fill, p.fill + .8, t) * (1 - sstep(p.wash - 1, p.wash, t)) : 0;
  const filling = ph === 'fill', draining = ph === 'drain' || (ph === 'spin' && t < p.drain + 1.5);
  // the tub swings on its springs when the drum is fast or reverses
  const sh = Math.max(0, (Math.abs(om) - 6) / 14), sway = [0, sh*1.6*Math.sin(t*41), sh*1.1*Math.sin(t*53 + 1) + (lv*-1.2)];
  const [sx, sy] = geometry.Dv(...sway);
  const hung = svg => `<g transform="translate(${sx} ${sy})">${svg()}</g>`;
  const observed=(id,svg)=>`<g data-observe-part="${id}">${svg}</g>`;
  const parts = [
    { at: [XPU, MOT.y - 2, MOT.z + 2], svg: observed('washer-drive',hung(() => pulleyBelt(st, A))) },
    { at: [(MOT.x0 + MOT.x1)/2, MOT.y, MOT.z], svg: observed('washer-motor',hung(() => motor(st, A))) },
    { at: [(XT0 + XT1)/2, CY, CZ], svg: observed('washer-drum',hung(() => tubPart(st, k, sway, A, lv, heat))) },
    { at: [XT1 - 7, CY, tubTop(0) + 3], svg: hung(()=>memoGeo('weight',counterweight)) },
    { at: [(PUMP.x0 + PUMP.x1)/2, PUMP.y, PUMP.z], svg: observed('washer-pump',pump(st, t, draining)) },
    { at: [3.8, 48, 81], svg: observed('washer-inlet',memoGeo('inlet',inlet)) },
    { at: [W - 11, 51, 77], svg: memoGeo('drawerBox',drawerBox) },
    ...SPR.map(s => ({ at: lerp3(s.a, s.b, .5), svg: coil(add3(s.a, sway), s.b, 1.5, 9) + geometry.rod(s.b, add3(s.b, [0,0,-1.5]), .5, geometry.METAL) })),
    ...DMP.map(d => { const top = add3(d.b, sway), mid = lerp3(d.a, top, .55);
      return { at: lerp3(d.a, d.b, .5), svg: geometry.rod(d.a, mid, 1.9, geometry.DARK) + geometry.rod(mid, top, .8, geometry.METAL) }; }),
    { at: [W - 9, 22, 12], svg: memoGeo('hose-sump',()=>tube(HOSE_SUMP,1.4,HOSE_M,true)) + flow(HOSE_SUMP, t, draining) },
    { at: [20, 12, 9], svg: memoGeo('hose-out',()=>tube(HOSE_OUT,1.4,HOSE_M,true)) + flow(HOSE_OUT, t, draining) },
    { at: [W/2, 50, 84], svg: memoGeo('hose-in',()=>tube(HOSE_IN,1.1,geometry.matOf('#cfd6d8'))) + flow(HOSE_IN, t, filling) + memoGeo('hose-soap',()=>tube(HOSE_SOAP,1.3,HOSE_M,true)) + flow(HOSE_SOAP, t, filling) },
    { at: [8, 11, 40], svg: observed('washer-sensor',memoGeo('air-sensor',()=>tube(HOSE_AIR,.55,geometry.matOf('#e8e2cf'))+geometry.box(3,7,80,9,13,85,VALVE,geometry.toneI,.9))) },
  ];
  let s = geometry.byDepth(parts);
  MECH_LABELS = k <= .6 || document.documentElement.classList.contains('nolabels') ? '' : callouts([
    { at: [XT0 + 3, CY + 16, tubTop(16) - 2], text: '外桶', on: false },
    { at: [XD1 - 8, CY + 12, CZ + 14], text: '滚筒', on: Math.abs(om) > .1 },
    { at: [XPU, CY, CZ + RPU], text: '皮带轮', on: Math.abs(om) > .1 },
    { at: [XPU, MOT.y - 9, 24], text: '皮带', on: Math.abs(om) > .1 },
    { at: [MOT.x1, MOT.y + MOT.r, MOT.z], text: '电机', on: Math.abs(om) > .1 },
    { at: SPR[1].b.map((v, i) => i === 2 ? v - 8 : v), text: '弹簧', on: sh > .1 },
    { at: lerp3(DMP[1].a, DMP[1].b, .3), text: '减振器', on: sh > .1 },
    { at: [XT1 - 7, CY + 12, tubTop(0) + 6], text: '配重', on: sh > .1 },
    { at: [XT0 + 10, CY + 3, tubZ(0) + 2], text: '加热器', on: heat > .1 },
    { at: [PUMP.x1, PUMP.y, PUMP.z + PUMP.r], text: '排水泵', on: draining },
    { at: [3.8, 56, 82], text: '进水阀', on: filling },
    { at: [6, 7, 84], text: '水位传感器', on: filling },
  ]);
  return s;
}
const CAPS_X = {
  idle: '拖动可观察内部。启动洗涤后，看看各部件如何配合运转。',
  fill: '进水：模型按程序时间抬升水位，标示进水阀与水位传感器的位置；不模拟真实测量或阀门控制。',
  wash: '洗涤：加热器加热水，电机通过皮带带动滚筒交替转动。提升筋将衣物带起、落下，帮助洗净。',
  drain: '排水：模型水位随程序阶段下降，标示排水泵与排水管的位置；不模拟泵内水流。',
  spin: '脱水：滚筒高速旋转，水从筒壁小孔排出。弹簧、减振器和配重共同减轻机身晃动。',
};

/* ---------- behaviour ---------- */
let ui,washerObservation=null,observationRate=1;
// own clock: frame timestamps can lag performance.now(), which would give a negative first dt
function tick(fn){ ui.animate(dt => fn(dt)); }
function blocked(st,ui,message){ui.feedback(message,'blocked');return false;}
function locked(st){return st.run||!!st.latch;}
function busyLaundry(st){return st.loading||st.xfer||st.door!==st.doorT;}
function runLoop(){
  if (st0.loop) return;
  st0.loop = true;
  tick(dt => {
    const st = ui.st;
    dt*=observationRate; // The process clock only; camera, controls and feedback keep real time.
    if (!st.run){ st.loop = false; return false; }
    const target=st.paused?0:1;st.drive+=(target-st.drive)*Math.min(1,dt*9);
    if(st.paused&&st.drive<.015){st.drive=0;st.loop=false;return false;}
    st.tau += dt*st.drive;
    if (st.soapLvl > 0 && prog(st).fill) st.soapLvl = Math.max(0, 1 - st.tau / prog(st).fill);
    if (st.tau >= prog(st).T){
      st.restA=(st.startA||0)+angleAt(prog(st),prog(st).T);st.run=false;st.loop=false;st.drive=0;st.done=true;st.tau=0;st.latch='unlocking';
      let wait=0;tick(dt=>{wait+=dt;if(wait<.65)return true;st.latch=null;ui.flash(prog(st).name+'程序已完成，门锁已释放，可以取衣了',2000);return false;});
      return false;
    }
    return true;
  });
}
function start(st, ui){
  if(st.latch)return blocked(st,ui,st.latch==='locking'?'门锁正在扣合，请稍候':'滚筒已停止，门锁正在释放');
  if (st.run){st.paused=!st.paused;runLoop();ui.flash(st.paused?'正在缓缓停转；暂停时舱门仍锁定，点击继续洗涤':'继续洗涤，滚筒正在恢复转动',1300);return;}
  if(st.loading||st.xfer)return blocked(st,ui,'衣物正在移动，请等装衣和关门完成');
  if(st.done)return blocked(st,ui,'这一轮已经洗好，请先开门取衣');
  if(st.door!==st.doorT)return blocked(st,ui,'舱门正在开合，请稍候');
  if (st.door > 0 || st.doorT) return blocked(st,ui,'请先关闭舱门，再启动洗涤');
  if (st.drawer > .01 || st.drawerT || st.soapAnim != null) return blocked(st,ui,'请等加料完成，并关闭洗涤剂抽屉');
  if (st.laundry !== 'drum') return blocked(st,ui,'滚筒还是空的，请先点衣篮装入衣物');
  if(prog(st).fill&&st.soapLvl<.5)return blocked(st,ui,'请先添加洗涤剂，或选择无需加料的脱水程序');
  st.latch='locking';st.paused=false;st.done=false;st.startA=st.restA;st.tau=0;st.drive=0;
  ui.flash('舱门锁定后即将启动…',550);window.MechanicalAudio?.pulse('click');
  let wait=0;tick(dt=>{wait+=dt;if(wait<.48)return true;st.latch=null;st.run=true;runLoop();return false;});
}
function addSoap(st, ui){
  if (locked(st)) return blocked(st,ui,'运行时抽屉锁定，暂停也不能打开');
  if(st.done)return blocked(st,ui,'这一轮已经洗好，取衣后再开始下一轮');
  if(!prog(st).fill)return blocked(st,ui,'脱水程序不需要洗涤剂');
  if (st.soapAnim != null) return blocked(st,ui,'正在添加洗涤剂，随后抽屉会自动关闭');
  if (st.soapLvl >= 1) return blocked(st,ui,'洗涤剂已加好，不用重复添加');
  if(st.drawer!==st.drawerT)return blocked(st,ui,'抽屉正在开合，停稳后再添加洗涤剂');
  if (!st.drawerT) toggleDrawer(st, ui);
  st.soap=true;st.soapAnim=0;const from=st.soapLvl;window.MechanicalAudio?.pulse('click');
  tick(dt=>{st.soapAnim+=dt/2.4;const t=st.soapAnim;if(t>.35)st.soapLvl=Math.max(from,Math.min(1,(t-.35)/.45));
    if(t>=1){st.soapAnim=null;st.soapLvl=1;ui.flash('洗涤剂已加入，正在自动关闭抽屉',1100);if(st.drawerT)toggleDrawer(st,ui);return false;}return true;});
}
function selectProg(st,ui,index){
  if(locked(st))return blocked(st,ui,'请先完成当前程序，暂停时也不能切换');
  if(st.done)return blocked(st,ui,'请先取出洗好的衣物，再选择下一轮程序');
  if(st.soapAnim!=null)return blocked(st,ui,'请等加料完成后再切换程序');
  const from=st.dialAngle??PROGS[st.prog].ang,to=PROGS[index].ang,id=st.dialMotion=(st.dialMotion||0)+1;st.prog=index;st.picked=true;let t=0;tick(dt=>{if(id!==st.dialMotion)return false;t+=dt;const k=Math.min(1,t/.24);st.dialAngle=from+(to-from)*geometry.ease(k);return k<1;});window.MechanicalAudio?.pulse('tick');ui.flash(PROGS[index].name+'程序 · 演示约'+PROGS[index].T+'秒',1200);
}
function cycleProg(st, ui){selectProg(st,ui,(st.prog+1)%PROGS.length);}
function swingDoor(st, to, then){
  st.doorT=to;const motion=st.doorMotion=(st.doorMotion||0)+1;
  tick(dt=>{if(motion!==st.doorMotion)return false;const g=Math.sign(st.doorT-st.door);st.door=Math.min(1,Math.max(0,st.door+g*dt/.9));
    if(st.door===st.doorT){if(then)then();return false;}return true;});
}
function transfer(st, dir, then){
  if(st.xfer)return;st.xfer={dir,T:0};window.MechanicalAudio?.pulse('click');
  tick(dt=>{st.xfer.T+=dt;if(st.xfer.T>=xferEnd()){st.laundry=dir==='out'?'basket':'drum';st.xfer=null;if(dir==='out'){st.done=false;st.unloaded=true;}if(then)then();return false;}return true;});
}
function toggleDoor(st, ui, unloadAlways=false){
  if(locked(st))return blocked(st,ui,st.latch==='unlocking'?'门锁正在释放，请稍候':st.paused?'暂停时水仍在桶内，舱门保持锁定；继续后完成程序':'舱门已锁定，请等洗涤结束');
  if(st.xfer||st.loading)return blocked(st,ui,st.xfer?.dir==='out'?'正在取衣，请稍候':'正在自动装衣和关门，请稍候');
  if(st.door!==st.doorT)return blocked(st,ui,'舱门正在开合，请稍候');
  if(!st.doorT){const unload=(unloadAlways||st.done)&&st.laundry==='drum';swingDoor(st,1,unload?()=>transfer(st,'out',()=>ui.flash('衣物已放回衣篮，可以开始下一轮',1800)):null);}
  else swingDoor(st,0);
}
function loadLaundry(st, ui){
  if(locked(st))return blocked(st,ui,'机器已锁定，请等当前程序完成');
  if(st.xfer||st.loading)return blocked(st,ui,'正在自动装衣和关门，请稍候');
  if(st.door!==st.doorT)return blocked(st,ui,'舱门正在开合，停稳后即可装衣');
  if(st.laundry==='drum')return blocked(st,ui,st.done?'这一轮已经洗好，请先取衣':'衣物已经装好，可以继续加料或启动');
  if(st.unloaded){ui.observation?.reset();window.MechanicalAudio?.reset();}
  st.loading=true;st.unloaded=false;st.done=false;
  const go=()=>transfer(st,'in',()=>swingDoor(st,0,()=>{st.loading=false;ui.flash('衣物已装好，舱门已扣合'+(prog(st).fill?'；添加洗涤剂后启动':'；可以开始脱水'),1600);}));
  st.door===1?go():swingDoor(st,1,go);
}
function unloadLaundry(st, ui){
  if(locked(st))return blocked(st,ui,st.latch==='unlocking'?'正在释放门锁，请稍候':'舱门已锁定，请等程序结束后取衣');
  if(st.loading||st.xfer)return blocked(st,ui,'衣物正在移动，请稍候');
  if(st.door!==st.doorT)return blocked(st,ui,'舱门正在开合，请稍候');
  if(st.laundry!=='drum')return blocked(st,ui,'滚筒已经空了，衣物都在衣篮里');
  if(!st.doorT)return toggleDoor(st,ui,true);
  transfer(st,'out',()=>ui.flash('衣物已放回衣篮，可以开始下一轮',1800));
}
function toggleDrawer(st, ui){
  if(locked(st))return blocked(st,ui,'运行时抽屉锁定，暂停也不能打开');
  if(st.soapAnim!=null)return blocked(st,ui,'正在添加洗涤剂，随后抽屉会自动关闭');
  if(st.drawer!==st.drawerT)return blocked(st,ui,'抽屉正在开合，请稍候');
  const motion=st.drawerMotion=(st.drawerMotion||0)+1;
  st.drawerT=st.drawerT?0:1;if(st.drawerT)st.soap=true;
  tick(dt=>{if(motion!==st.drawerMotion)return false;const g=Math.sign(st.drawerT-st.drawer);st.drawer=Math.min(1,Math.max(0,st.drawer+g*dt/.5));return st.drawer!==st.drawerT;});
}

let st0;
ui = geometry.mountFigure({
  fig:'01', title:'手绘洗衣机', credit:true, hint:'装入衣物，加洗涤剂，选择程序，洗好后取出',
  idea:"高速旋转时，水经滚筒的小孔排出，衣物则贴在筒壁上。",
  size:[W, D, H], palette:'mint',
  state:{ prog:0, run:false, paused:false, loop:false, tau:0, done:false, door:0, doorT:0, drawer:0, drawerT:0, restA:0,
          soapLvl:0, soapAnim:null, latch:null, drive:0, unloaded:false, laundry:'basket', xfer:null, xr:0, xrT:0 },   // starts empty: the laundry waits in the basket
  scene,
  readout: st => {
    const p = prog(st);
    if(st.latch)return st.latch==='locking'?'舱门正在锁定，随后开始'+p.name+'…':'滚筒已停止，正在释放门锁…';
    if(st.soapAnim!=null)return '正在添加洗涤剂，抽屉随后自动关闭…';
    if(st.drawer!==st.drawerT)return st.drawerT?'正在拉开洗涤剂抽屉…':'正在关闭洗涤剂抽屉…';
    if(st.loading)return st.xfer?'正在装入衣物，请稍候…':st.laundry==='drum'?'正在自动关闭舱门…':'正在打开舱门，随后自动装衣…';
    if(st.xfer&&st.xfer.dir==='out')return '正在取出衣物，请稍候…';
    if(st.door!==st.doorT&&!st.loading)return st.doorT?'正在打开舱门…':'正在关闭舱门…';
    if (st.run){
      const ph = { fill:'进水', wash:'洗涤', drain:'排水', spin:'脱水' }[phaseAt(p, st.tau)];
      return st.paused ? `${p.name}已暂停 · 舱门仍锁定 · 点击继续洗涤` : `${p.name} · ${ph}中 · 剩余${remaining(st)}分钟（演示时间）`;
    }
    if (st.laundry === 'basket' && !st.xfer) return st.unloaded?'衣物已取出，点击衣篮可以再洗一轮。':'点击衣篮装入衣物，舱门会自动打开并关闭。';
    if (st.door > 0) return '舱门已打开，关闭后才能启动';
    if (st.done) return '洗涤完成，点击舱门取出衣物';
    return `${p.name}程序 · 标称${p.min}分钟，演示约${p.T}秒 · 点旋钮换程序，点圆键启动`;
  },
  buttons:[
    { label:'装入衣物', onClick:(st,ui) => loadLaundry(st,ui) },
    { label:'添加洗涤剂', onClick:(st,ui) => addSoap(st,ui) },
    { label:'选择程序', choices: st => PROGS.map((p,i) => ({ label:p.name, current: st.prog === i, disabled: locked(st)||st.done||st.soapAnim!=null, why: st.done?'请先取出洗好的衣物':'当前程序进行中，请稍候',
        onClick:(st,ui) => selectProg(st,ui,i) })) },
    { label:'启动／暂停', onClick:(st,ui) => start(st,ui) },
    { label:'开门取衣', onClick:(st,ui) => unloadLaundry(st,ui) },
    { label:'关闭舱门', onClick:(st,ui) => st.doorT ? toggleDoor(st,ui) : ui.flash('舱门已经关闭') },
  ],
  buttonsLabel:'洗衣操作',
  acts:{ laundry:(st,el,ui) => loadLaundry(st,ui), soap:(st,el,ui) => addSoap(st,ui), dial:(st,el,ui) => cycleProg(st,ui), start:(st,el,ui) => start(st,ui), door:(st,el,ui) => toggleDoor(st,ui), drawer:(st,el,ui) => toggleDrawer(st,ui) },
  params:(st,q) => {
    const pi = PROGS.findIndex(p => p.name === (q.get('prog') || '').toUpperCase()); if (pi >= 0) st.prog = pi;
    if (q.get('run') === '1' || q.get('done') === '1' || q.get('laundry') === 'drum') st.laundry = 'drum';
    if (q.get('run') === '1'){ st.run = true; st.tau = Math.min(.999, Math.max(0, +(q.get('t') || 0))) * PROGS[st.prog].T; }
    if (q.get('door') === 'open' || q.get('door') === '1'){ st.door = st.doorT = 1; st.run = false; }
    if (q.has('doorT')) st.door = st.doorT = +q.get('doorT');
    if (q.get('xr') === '1') st.xr = st.xrT = 1;
    if (q.get('drawer') === '1') st.drawer = st.drawerT = 1;
    if (q.get('done') === '1'){ st.done = true; st.run = false; }
    if (q.has('soap')){ const v = +q.get('soap'); if (v > 0 && v < 1){ st.soapAnim = v; st.soapLvl = Math.max(0, Math.min(1, (v-.35)/.45)); st.drawer = st.drawerT = 1; } else st.soapLvl = v ? 1 : 0; }
    if (q.get('laundry') === 'basket'){ st.laundry = 'basket'; st.door = st.doorT = 1; }
    if (q.has('unload')){ st.door = st.doorT = 1; st.xfer = { dir:'out', T: +q.get('unload') * xferEnd() }; }
  },
});
st0 = ui.st;
// view set, top right: see-through on/off and labels on/off, independent (labels start off unless ?labels=1)
if (new URLSearchParams(location.search).get('labels') !== '1') document.documentElement.classList.add('nolabels');
const vset = document.createElement('div'); vset.className = 'vset';
vset.innerHTML = '<div class="vrow"><button class="act" id="xrb" aria-pressed="false">查看内部</button><button class="act" id="lblb" aria-pressed="true">部件名称</button></div>';
document.querySelector('.stage').appendChild(vset);
const xrb = document.getElementById('xrb'), lblb = document.getElementById('lblb');
const syncSet = () => { const on = !!ui.st.xrT; xrb.setAttribute('aria-pressed', on);
  lblb.setAttribute('aria-pressed', !document.documentElement.classList.contains('nolabels')); };
scope.bindProperty(xrb,"onclick",() => { const st = ui.st; st.xrT = st.xrT ? 0 : 1; const motion=st.xrMotion=(st.xrMotion||0)+1; syncSet();
  tick(dt => { if(motion!==st.xrMotion)return false; const g = Math.sign(st.xrT - st.xr); st.xr = Math.min(1, Math.max(0, st.xr + g*dt/.7)); return st.xr !== st.xrT; }); });
scope.bindProperty(lblb,"onclick",() => { document.getElementById('lbl').click(); syncSet(); });
document.getElementById('lblctl').style.display = 'none';
syncSet();
const capEl = document.createElement('p'); capEl.className = 'mcap'; document.querySelector('.stage').after(capEl);

const _render = ui.render; ui.render = () => { _render(); const st = ui.st; capEl.hidden=st.xr<=.5; capEl.style.opacity=st.xr>.5?1:0;
  capEl.textContent = CAPS_X[st.run ? phaseAt(prog(st), st.tau) : 'idle']; };
ui.render();

/* Stable interaction layer, above the drawing and outside its texture filter. */
const sceneSvg=document.getElementById('fig'),NS='http://www.w3.org/2000/svg';
const hitLayer=document.createElementNS(NS,'g');hitLayer.id='scene-targets';sceneSvg.appendChild(hitLayer);
const hitNodes=new Map();
// Parts in front of the cabinet can still be behind it when viewed from the rear.
// An inverse cabinet clip keeps only their genuinely exposed, clickable silhouette.
const targetClip=document.createElementNS(NS,'clipPath'),targetClipShape=document.createElementNS(NS,'path');
targetClip.id='outside-cabinet';targetClipShape.setAttribute('clip-rule','evenodd');targetClip.appendChild(targetClipShape);document.getElementById('fdefs').appendChild(targetClip);

const help=document.createElement('p');help.className='scene-help';help.textContent='直接点画面：衣篮装衣 · 抽屉开合 · 抽屉打开后点槽内加洗涤剂 · 旋钮换程序 · 圆键启停 · 舱门开合。拖动任意位置可旋转。';sceneSvg.parentElement.before(help);
const hint=document.createElement('div');hint.className='scene-hint';hint.setAttribute('aria-live','polite');sceneSvg.parentElement.appendChild(hint);

ui.updateTargets=()=>{
 const st=ui.st,front=geometry.facing([1,0,0]),targets=[];
 const shellHull=geometry.hull([...geometry.on(geometry.PX(0),OUT),...geometry.on(geometry.PX(W),OUT)].map(p=>geometry.P(...p)));
 targetClipShape.setAttribute('d','M-10000 -10000H10000V10000H-10000Z'+geometry.sp(shellHull));
 const insideShell=q=>{let positive=false,negative=false;for(let i=0;i<shellHull.length;i++){const a=shellHull[i],b=shellHull[(i+1)%shellHull.length],c=(b[0]-a[0])*(q[1]-a[1])-(b[1]-a[1])*(q[0]-a[0]);if(c>.01)positive=true;if(c<-.01)negative=true;}return !(positive&&negative)};
 const add=(key,pts,label)=>{const clipped=!front;if(clipped&&pts.every(p=>insideShell(geometry.P(...p))))return;targets.push({key,d:geometry.pd(pts),label,clipped})};
 if(front||st.door>.2)add('door',dRing(BT+.4,RB,geometry.ease(st.door)*DOOR_MAX,48),locked(st)?'舱门已锁定，完成后可打开':st.loading?'正在装衣，请稍候':st.doorT?'点击关闭舱门':'点击打开舱门 / 完成后取衣');
 if(front){
  add('drawer',geometry.on(geometry.PX(W+geometry.ease(st.drawer)*DRAWER_MAX+1.7),geometry.rrUV(...DRW,1.5)),locked(st)?'洗涤中抽屉锁定':st.soapAnim!=null?'正在加料，请稍候':st.drawerT?'点击关闭抽屉':'点击打开洗涤剂抽屉');
  const[dY,dZ]=DIAL;add('dial',geometry.on(geometry.PX(W+4.6),geometry.ellUV(dY,dZ,7,7)),locked(st)?'洗涤中程序锁定':'点击切换洗涤程序');
  const[bY,bZ]=BTN;add('start',geometry.on(geometry.PX(W+2.5),geometry.ellUV(bY,bZ,5.5,5.5)),st.run?(st.paused?'点击继续洗涤':'点击暂停洗涤'):'点击开始洗涤');
  if(st.drawer>.5)add('soap',geometry.on(geometry.PZ(DRW[1]+4),[[W+1,DRW[0]+1],[W+geometry.ease(st.drawer)*DRAWER_MAX,DRW[0]+1],[W+geometry.ease(st.drawer)*DRAWER_MAX,DRW[2]-1],[W+1,DRW[2]-1]]),'点击槽内添加洗涤剂');
 }
 if(st.laundry==='basket'&&!st.xfer&&!st.loading)add('laundry',geometry.on(geometry.PZ(BASKET.h+3),[[BASKET.x0,BASKET.y0],[BASKET.x1,BASKET.y0],[BASKET.x1,BASKET.y1],[BASKET.x0,BASKET.y1]]),'点击衣篮，自动打开舱门并装入衣物');
 const live=new Set();for(const t of targets){live.add(t.key);let node=hitNodes.get(t.key);if(!node){node=document.createElementNS(NS,'path');node.dataset.act=t.key;node.setAttribute('role','button');node.setAttribute('tabindex','0');scope.listen(node,'pointerenter',()=>{hint.textContent=node.getAttribute('aria-label');hint.classList.add('on')});scope.listen(node,'pointerleave',()=>hint.classList.remove('on'));scope.listen(node,'focus',()=>{hint.textContent=node.getAttribute('aria-label');hint.classList.add('on')});scope.listen(node,'blur',()=>hint.classList.remove('on'));hitLayer.appendChild(node);hitNodes.set(t.key,node)}if(node.getAttribute('d')!==t.d)node.setAttribute('d',t.d);node.setAttribute('aria-label',t.label);if(t.clipped)node.setAttribute('clip-path','url(#outside-cabinet)');else node.removeAttribute('clip-path');if(document.activeElement===node||node.matches(':hover'))hint.textContent=t.label;}
 for(const[key,node]of hitNodes)if(!live.has(key)){if(document.activeElement===node)sceneSvg.focus({preventScroll:true});node.remove();hitNodes.delete(key);hint.classList.remove('on')}
};
ui.render();
/* Compact shared studio layout: only relocate existing controls; state and scene stay intact. */
const studio=document.createElement('main');studio.className='studio-layout';
const sidebar=document.createElement('aside');sidebar.className='studio-sidebar';sidebar.setAttribute('aria-label','洗衣操作与设置');
const heading=document.querySelector('header');const stage=document.querySelector('.stage');
const settings=document.createElement('details');settings.className='studio-details';settings.innerHTML='<summary>外观与视角<span>展开后可在此滚动</span></summary><div class="disclosure-scroll"></div>';
settings.lastElementChild.append(document.querySelector('.controls'));
const guide=document.createElement('details');guide.className='studio-details';guide.innerHTML='<summary>操作说明与原理<span>点击展开</span></summary><div class="disclosure-scroll"></div>';
guide.lastElementChild.append(help,capEl);const idleGuide=document.createElement('p');idleGuide.textContent='先点衣篮装衣，再添加洗涤剂。选择程序后启动，运行时舱门锁定。洗涤结束，点舱门取衣。查看内部可观察滚筒与传动机构。';guide.lastElementChild.prepend(idleGuide);
const secondary=document.createElement('section');secondary.className='studio-secondary';secondary.setAttribute('aria-label','更多设置与说明，可滚动');secondary.append(settings,guide);
sidebar.append(heading,document.getElementById('btns'),document.getElementById('readout'),vset,secondary);
const credit=document.querySelector('.made-with');if(credit)sidebar.append(credit);
studio.append(sidebar,stage);document.body.append(studio);


/* Shared ten-object visual system; reuse existing scene and control nodes. */
studio.className='play-layout';sidebar.className='play-dock';secondary.className='dock-extras';settings.className='';guide.className='';
heading.remove();
const dockTitle=document.createElement('p');dockTitle.className='dock-title';dockTitle.textContent='装衣、加料，开始一轮洗涤。';
const readoutNode=document.getElementById('readout');sidebar.prepend(dockTitle,readoutNode);readoutNode.setAttribute('aria-live','polite');document.querySelector('.actions .cap')?.remove();
settings.querySelector('summary').innerHTML='外观与视角';guide.querySelector('summary').innerHTML='怎么玩 · 制作原理';
if(credit)secondary.append(credit);const stageNote=document.createElement('p');stageNote.className='stage-note';stageNote.textContent='拖动空白旋转观察 · 点击机器部件操作';stage.append(stageNote);

// Names stay in normal, scrollable HTML when the stage cannot fit full pills.
// This lives outside the action sequence and never takes height from the SVG.
calloutLegend=document.createElement('section');calloutLegend.className='washer-callout-legend';calloutLegend.hidden=true;calloutLegend.setAttribute('aria-label','洗衣机部件名称');vset.after(calloutLegend);
const syncCalloutLegend=()=>{
 const layout=calloutPresentation,visible=layout&&layout.mode!=='names'&&!document.documentElement.classList.contains('nolabels');
 sceneSvg.dataset.calloutMode=layout?.mode||'off';
 calloutLegend.hidden=!visible;if(!visible)return;
 const key=JSON.stringify([layout.mode,layout.items.map(item=>[item.number,item.text,!!item.on])]);if(key===calloutLegendKey)return;calloutLegendKey=key;
 calloutLegend.replaceChildren();const caption=document.createElement('p');caption.textContent=layout.mode==='numbered'?'部件定位 · 对照画面编号':'部件名称 · 放大画面可显示定位编号';calloutLegend.append(caption);
 const list=document.createElement('ol');for(const item of layout.items){const row=document.createElement('li');row.dataset.active=String(!!item.on);const number=document.createElement('span');number.className='callout-number';number.textContent=String(item.number);number.setAttribute('aria-hidden','true');row.append(number,document.createTextNode(item.text));list.append(row);}calloutLegend.append(list);
};
const calloutRender=ui.render;ui.render=()=>{calloutRender();syncCalloutLegend();};
// ResizeObserver also handles dock/layout and font changes while the machine is
// idle or program-paused. It is scene-owned and cannot revive a disposed scene.
const reflowCallouts=()=>{if(scope.active&&!scope.paused)ui.invalidate();};
if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(reflowCallouts);observer.observe(sceneSvg);scope.onCleanup(()=>observer.disconnect());}
addEventListener('resize',reflowCallouts);


const scrollHint=document.createElement('p');scrollHint.className='extras-scroll-hint';sidebar.append(scrollHint);const hintOverflow=()=>scrollHint.textContent=secondary.scrollHeight>secondary.clientHeight+2?'设置区可上下滚动 ↕':'';[settings,guide].forEach(el=>scope.listen(el,'toggle',hintOverflow));addEventListener('resize',hintOverflow);setTimeout(hintOverflow,200);

/* Contextual workflow, without moving controls or changing the scene envelope. */
const washButtons=[...document.querySelectorAll('#btns>.stepwrap>.act')];
const washProgress=document.createElement('div');washProgress.className='toy-progress';washProgress.setAttribute('role','progressbar');washProgress.setAttribute('aria-label','当前洗衣程序进度');washProgress.innerHTML='<span></span>';readoutNode.after(washProgress);
const detachAudio=window.MechanicalAudio?.attach('washer',document.getElementById('btns'));
scope.onCleanup(()=>detachAudio?.());
const tactileRender=ui.render;ui.render=()=>{tactileRender();const s=ui.st,waiting=locked(s),moving=busyLaundry(s),p=prog(s);
 const labels=[s.loading?'正在装入衣物…':s.laundry==='drum'?'衣物已装好':'装入衣物',s.soapAnim!=null?'正在加洗涤剂…':s.soapLvl>=1?'洗涤剂已加好':'添加洗涤剂','程序：'+p.name+(waiting?' · 锁定':''),s.latch==='locking'?'正在锁门…':s.latch==='unlocking'?'等待解锁…':s.run?(s.paused?'继续洗涤':'暂停洗涤'):s.done?'本轮已完成':'启动'+p.name,s.xfer?.dir==='out'?'正在取出衣物…':s.done?'开门取出衣物':'开门取衣',s.door===0&&s.doorT===0?'舱门已关闭':'关闭舱门'];
 const unavailable=[waiting||moving||s.laundry==='drum',waiting||s.done||s.soapAnim!=null||s.soapLvl>=1||!p.fill,waiting||s.done||s.soapAnim!=null,!!s.latch||moving||s.done,waiting||moving||s.laundry!=='drum',waiting||moving||!s.doorT];
 const next=s.latch||moving||s.soapAnim!=null||s.drawer!==s.drawerT?-1:s.done?4:s.laundry==='basket'?0:s.laundry==='drum'&&!waiting?(p.fill&&s.soapLvl<.5?1:s.doorT?5:s.drawerT?-1:3):-1;
 washButtons.forEach((b,i)=>{const label=labels[i]+(i===2?' ▾':'');if(b.textContent!==label)b.textContent=label;b.setAttribute('aria-disabled',unavailable[i]);b.classList.toggle('is-next',i===next);b.dataset.recommended=String(i===next);if(i===next)b.setAttribute('aria-description','建议下一步。');else b.removeAttribute('aria-description');b.classList.toggle('is-complete',i===0&&s.laundry==='drum'||i===1&&s.soapLvl>=1);});
 washButtons[3].setAttribute('aria-pressed',s.run&&!s.paused);document.querySelector('.stage').setAttribute('aria-busy',!!s.latch||!!s.loading||!!s.xfer);
 const progress=s.done?100:Math.round(s.tau/p.T*100);washProgress.hidden=!s.run&&!s.done&&!s.latch;washProgress.firstElementChild.style.width=progress+'%';washProgress.setAttribute('aria-valuenow',progress);washProgress.setAttribute('aria-valuemin','0');washProgress.setAttribute('aria-valuemax','100');washProgress.setAttribute('aria-valuetext',s.paused?'已暂停':s.done?'完成':progress+'%');
 window.MechanicalAudio?.update('washer',{...s,phase:s.run?phaseAt(p,s.tau):s.latch||'idle'});
 washerObservation?.update();
};
function readWasherObservation(){
 const s=ui.st,p=prog(s),phase=s.run?phaseAt(p,s.tau):'idle';
 const omega=s.run?omegaAt(p,s.tau)*(s.drive??1):0,water=s.run?waterAt(p,s.tau):0;
 const phases={fill:['进水','模型按程序时间抬升水位；进水阀与水位传感器是对应部件的示意，不是真实测量或阀门控制仿真。','进水阀 / 水位传感器示意',['washer-inlet','washer-sensor']],wash:['交替洗涤','电机通过皮带带动滚筒换向，衣物被提升后落下；此时水位保持。','电机 → 皮带 → 滚筒',['washer-motor','washer-drive','washer-drum']],drain:['排水','模型水位随排水阶段下降，滚筒保持低速；内部标示排水泵位置，不模拟泵内水流。','排水泵示意',['washer-pump']],spin:['高速脱水','排水后滚筒加速旋转，水从筒壁小孔排出；程序结束前再缓缓停转。','电机 → 皮带 → 滚筒',['washer-motor','washer-drive','washer-drum']]};
 let [stage,text,part,active]=phases[phase]||[s.done?'洗涤完成':s.latch==='locking'?'正在锁门':s.latch==='unlocking'?'正在解锁':'准备洗涤',s.done?'滚筒已停、水已排空，门锁释放后才可开门取衣。':s.latch==='locking'?'舱门锁住后才会启动；门开着或加料抽屉未关时，不会开始。':'先装衣、加料并关好舱门，再启动程序。也可打开“查看内部”观察传动与管路。',s.latch?'门锁':'无 · 等待启动',[]];
 if(!s.run){
  let operation;
  if(s.latch)operation=s.latch==='locking'?['正在锁门','舱门扣合后门锁才会锁住，随后开始所选程序。','门锁',[]]:['正在解锁','滚筒已停止，等待门锁释放后才能开门取衣。','门锁',[]];
  else if(s.xfer)operation=s.xfer.dir==='out'?['正在取出衣物','舱门已完全打开，衣物从滚筒移回衣篮；转移结束后即可开始下一轮。','滚筒入口 → 衣篮',['washer-drum']]:['正在装入衣物','舱门已完全打开，衣物正从衣篮移入滚筒；装好后舱门自动关闭。','衣篮 → 滚筒入口',['washer-drum']];
  else if(s.loading)operation=s.laundry==='drum'?['正在关闭舱门','衣物已经装入，舱门正在自动扣合；关好后才能加料并启动。','舱门',[]]:['正在打开舱门','先把舱门打开到位，再将衣物装入滚筒，不会穿过未打开的舱门。','舱门',[]];
  else if(s.soapAnim!=null)operation=['正在添加洗涤剂','洗涤剂倒入抽屉槽内；加料结束后抽屉自动关闭，等待进水时带入外桶。','洗涤剂槽',[]];
  else if(s.drawer!==s.drawerT)operation=s.drawerT?['正在打开抽屉','拉开洗涤剂抽屉后才能向槽内加料。','洗涤剂抽屉',[]]:['正在关闭抽屉','抽屉推回机身，关好后才能启动程序。','洗涤剂抽屉',[]];
  else if(s.door!==s.doorT)operation=s.doorT?[s.done?'正在开门取衣':'正在打开舱门',s.done?'门锁已释放，舱门正在打开；开到位后衣物才会移回衣篮。':'门锁已释放，舱门正在打开。','舱门',[]]:['正在关闭舱门','舱门正在扣合；关闭到位后才允许启动。','舱门',[]];
  else if(s.done)operation=['洗涤完成','滚筒已停、水已排空、门锁已释放；现在可以开门取衣。','无 · 等待取衣',[]];
  else if(s.unloaded)operation=['衣物已取出','衣物已回到衣篮，滚筒为空；再次装衣即可开始新一轮。','衣篮',[]];
  else if(s.door>0)operation=['舱门已打开','舱门打开时不能启动；完成装衣或取衣后，再关闭舱门。','舱门',[]];
  else if(s.drawer>0)operation=['等待加料','抽屉已打开，点槽内添加洗涤剂；加料完成后再关闭抽屉。','洗涤剂槽',[]];
  if(operation)[stage,text,part,active]=operation;
 }
 if(s.paused&&s.run){stage=Math.abs(omega)>.04?'暂停 · 正在停转':'已暂停';text='暂停先让滚筒缓缓停转，随后水位和程序进度停住；门锁保持锁定，继续后接着本阶段运行。';if(Math.abs(omega)<.04){active=[];part='门锁 · 保持锁定';}}
 return {stage,text,active,readouts:[
  {label:'水位 / 设定水位',value:Math.round(water*100)+'%'},
  {label:'滚筒模型转速',value:(Math.abs(omega)/(Math.PI*2)).toFixed(2)+' 转/秒'+(Math.abs(omega)<.04?' · 停止':omega>0?' · 正转':' · 反转')},
  {label:'门锁',value:s.latch==='locking'?'正在锁定':s.latch==='unlocking'?'正在释放':s.run?'锁定':'已释放'},
  {label:'当前部件',value:part}
 ]};
}
washerObservation=window.MuseumObservation?.mount({host:secondary,state:ui.st,read:readWasherObservation,title:'看原理',intro:'水位、滚筒和阶段来自同一演示时钟。展开分步卡片可边操作边观察；“查看内部”只显示模型已有部件。',slow:true,slowNote:'洗涤过程按 ¼ 速观察；舱门、抽屉和视角操作保持原速。',onRate:rate=>{observationRate=rate;window.MechanicalAudio?.setRate?.(rate);},onChange:()=>{ui.render();hintOverflow();}});
ui.observation=washerObservation;
// The guide has no clock and owns no process state. Every choice invokes an
// existing, guarded machine action; phase changes remain runLoop's job.
function readWasherLesson(){
 const s=ui.st,p=prog(s),observed=readWasherObservation(),phase=s.run?phaseAt(p,s.tau):'idle';
 const result={index:0,title:observed.stage,text:observed.text,look:s.xr>.5?'当前参与部件以棕色描线提示；拖动可避开遮挡。':'可点“查看内部”，看当前参与的滚筒、传动或管路示意。',label:'',busy:false,pauseVisible:false,choices:[]};
 if(s.latch){result.index=s.latch==='locking'?1:6;result.busy=true;}
 else if(s.run){
  result.index={fill:2,wash:3,drain:4,spin:5}[phase];
  result.text+=` 当前水位 ${Math.round(waterAt(p,s.tau)*100)}%，门锁仍锁定。`;
  result.pauseVisible=!s.paused;
  if(s.paused){result.label='继续 · 接着当前阶段';result.action='start';}
 }else if(s.loading||s.xfer||s.door!==s.doorT||s.soapAnim!=null||s.drawer!==s.drawerT){
  result.index=s.xfer?.dir==='out'||s.done?6:0;result.busy=true;
 }else if(s.done){
  result.index=6;result.label='取衣 · 先开门再移出';result.action='unload';
 }else if(s.laundry==='basket'){
  result.completed=!!s.unloaded;result.index=s.unloaded?6:0;
  result.label=s.unloaded?'再装一篮 · 重看这一轮':'装衣 · 先开门再入筒';result.action='load';
 }else if(s.doorT){
  result.title='先关门，再启动';result.text='衣物已在滚筒内，但舱门未扣合。关门只完成准备，启动后才会上锁。';result.label='关好舱门';result.action='door';
 }else if(p.fill&&s.soapLvl<.5){
  result.title='洗涤剂随进水进入外桶';result.text='先向抽屉加料，结束后抽屉自动关闭。棉织与快洗需要洗涤剂，单独脱水不需要。';result.label='加料 · 观察抽屉自动收回';result.action='soap';
 }else if(s.drawerT){
  result.title='抽屉关好才能启动';result.text='洗涤剂已准备好，抽屉仍开着。原有启动联锁会拒绝开门或开抽屉运行。';result.label='关闭加料抽屉';result.action='drawer';
 }else{
  result.title=p.fill?'准备锁门进水':'准备锁门脱水';result.text=p.fill?'启动先扣合门锁，再进入进水阶段；运行或暂停时都不能开门。':'单独脱水跳过进水、洗涤与排水，直接让滚筒加速；门锁仍要先扣合。';result.label='启动'+p.name+' · 观察门锁';result.action='start';
 }
 if(!locked(s)&&!s.done&&!s.loading&&!s.xfer&&s.soapAnim==null){result.choices=PROGS.map((program,i)=>({id:'program-'+i,label:program.name+(s.prog===i?' · 已选':''),disabled:s.prog===i,hint:i===2?'跳过进水和洗涤，对比单独脱水':'观察进水、洗涤、排水与脱水'}));}
 return result;
}
function advanceWasherLesson(){
 const step=readWasherLesson();if(step.busy)return;
 const actions={load:loadLaundry,soap:addSoap,door:toggleDoor,drawer:toggleDrawer,start,unload:unloadLaundry};
 actions[step.action]?.(ui.st,ui);ui.render();
}
const washerLesson=window.MuseumObservation?.mountLesson?.({ui,id:'washer',title:'看懂一轮 · 门锁、水位与滚筒',linear:false,route:['准备','锁门','进水','洗涤','排水','脱水','取衣'],read:readWasherLesson,onAdvance:advanceWasherLesson,onPause:()=>{if(ui.st.run&&!ui.st.paused){start(ui.st,ui);ui.render();}},onChoice:id=>{const choice=readWasherLesson().choices.find(c=>c.id===id&&!c.disabled);if(choice){selectProg(ui.st,ui,Number(id.slice(8)));ui.render();}},onToggle:on=>{if(!on)washerObservation?.reset();},exitLabel:'退出分步 · 保留当前运行或暂停状态',note:'这是压缩程序示意：没有单独漂洗阶段；不模拟真实水位检测。暂停不会解锁，退出不会改动机器状态。'});
// Escape dismisses only this presentation, never interrupts a running cycle.
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&washerLesson?.panel.open){event.preventDefault();washerLesson.close();}});

addEventListener('pagehide',()=>window.MechanicalAudio?.reset());
ui.render();


return {ui,detachAudio,readObservation:readWasherObservation,resetPresentation(){observationRate=1;syncSet();},get observationRate(){return observationRate}};
}
