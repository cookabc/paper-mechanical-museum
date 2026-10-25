import {scopedDocument} from '../../app/scoped-dom';
/** Washer's historical renderer, intentionally isolated from the collection and claw variants. */
export function createWasherRuntime(context){
const {root,scope,audio,observation}=context;
const document=scopedDocument(root,scope),window={MechanicalAudio:audio,MuseumObservation:observation};
const addEventListener=(...args)=>scope.listen(globalThis.window,...args);
let disposed=false,paused=false,generation=0;const pendingTimers=new Set();
const requestAnimationFrame=scope.raf,cancelAnimationFrame=scope.cancelRaf;
const setTimeout=(fn,ms=0)=>{const epoch=generation;let id=0;id=scope.timeout(()=>{pendingTimers.delete(id);if(!disposed&&epoch===generation)fn();},ms);pendingTimers.add(id);return id;};
const clearTimeout=id=>{pendingTimers.delete(id);scope.clearTimeout(id);};

/* ============================================================
   Colorfigures core: projection, shapes, shading, ink, labels, page shell.
   A figure page includes this file (scripts/build.py inlines it), then calls mountFigure({...}).
   See SKILL.md for the drawing contract and conventions.
   One fixed view (front-left-top) and one fixed light (from above, behind the viewer's right shoulder: the front is lit,
   the left side is in shade, and cast shadows fall toward the lower left of the screen).
   ============================================================ */

/* ---------- palettes ---------- */
const PALS = {
  mustard: { l:'#f4b829', m:'#d49c1f', d:'#4e4a18' },
  tomato:  { l:'#ef6a4c', m:'#cf5038', d:'#4a2219' },
  mint:    { l:'#93d3b0', m:'#71b693', d:'#1f4034' },
  cobalt:  { l:'#76a0e2', m:'#5a82c6', d:'#1c2948' },
  blush:   { l:'#f3a6bb', m:'#d8869c', d:'#4b2430' },
};
const METAL   = { l:'#eef0f0', m:'#c6ccce', d:'#8f989b' };
const CLEAR   = { l:'#e4f2f4', m:'#c4dfe4', d:'#97b9c0' };
const CERAMIC = { l:'#fbfaf3', m:'#e3e0d2', d:'#bdb8a6' };
const DARK    = { l:'#55504a', m:'#3d3935', d:'#272421' };
const INK = '#231e16';
const SHADOW = '#41538f';

/* ---------- projection (x = depth toward viewer-right, y = toward viewer-left, z = up) ---------- */
const C = Math.cos(Math.PI/6), S = Math.sin(Math.PI/6);
let OX = 0, OY = 0;
/* Free orthographic camera. YAW turns the viewer around the vertical axis (45° = the classic front-left view),
   PITCH is how far it looks down (35.26° = true isometric). At the defaults P() is exactly the old isometric
   projection, so every figure drawn for it still lines up. Drag the figure to orbit; double-click to reset.
   rotV(n) maps a world direction into the default view's frame, so vis / tone / any "sum of rotV > 0" test keep
   working at every angle: the viewer is always (1,1,1) and the light stays put relative to the viewer. */
let VIEW = 0, RC = [0, 0], RCZ = 0;
const VIEW_NAMES = ['front', 'left side', 'back', 'right side'];
const TURNS = [0, 2];
const YAW0 = 45, PITCH0 = Math.atan(1/Math.SQRT2) * 180/Math.PI, K3 = Math.sqrt(1.5);
let YAW = YAW0, PITCH = PITCH0, CR, CU, CV, CD;                       // right, up, toward viewer, screen-down
const camBasis = (yaw, pitch) => { const t = yaw*Math.PI/180, p = pitch*Math.PI/180, ct = Math.cos(t), st = Math.sin(t), cp = Math.cos(p), sp2 = Math.sin(p);
  return { R:[st,-ct,0], U:[-sp2*ct,-sp2*st,cp], V:[cp*ct,cp*st,sp2] }; };
const B0 = camBasis(YAW0, PITCH0);
function setCam(yaw, pitch){ YAW = yaw; PITCH = Math.max(6, Math.min(78, pitch)); const b = camBasis(YAW, PITCH); CR = b.R; CU = b.U; CV = b.V; CD = CU.map(v => -v); }
setCam(YAW0, PITCH0);
const d3 = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const rotV = n => { const r = d3(n,CR), u = d3(n,CU), v = d3(n,CV); return [0,1,2].map(i => B0.R[i]*r + B0.U[i]*u + B0.V[i]*v); };
// the light's ground direction turns with the viewer's yaw only (shadows always fall toward the lower left of the screen)
const yawTurn = ([x,y]) => { const t = (YAW - YAW0)*Math.PI/180, c = Math.cos(t), s = Math.sin(t); return [x*c - y*s, x*s + y*c]; };
const rotXY = (x,y) => [x, y];                                                // kept for old callers
const P0 = (x,y,z) => [(x-y)*C + OX, (x+y)*S - z + OY];                       // raw iso
const P  = (x,y,z) => { const q = [x-RC[0], y-RC[1], z-RCZ];
  return [K3*d3(q,CR) + (RC[0]-RC[1])*C + OX, K3*d3(q,CD) + (RC[0]+RC[1])*S - RCZ + OY]; };
const Dv = (x,y,z) => [K3*d3([x,y,z],CR), K3*d3([x,y,z],CD)];
// distance toward the viewer: draw parts with smaller depth first
const depthOf = p => d3(p, CV);
const byDepth = parts => parts.filter(Boolean).sort((p,q) => depthOf(p.at) - depthOf(q.at)).map(p => p.svg).join('');
const f  = v => v.toFixed(1);
const pd = (pts, close=true) => 'M' + pts.map(p => { const q = P(p[0],p[1],p[2]); return f(q[0])+' '+f(q[1]); }).join('L') + (close ? 'Z' : '');
const sp = pts => 'M' + pts.map(q => f(q[0])+' '+f(q[1])).join('L') + 'Z';

/* ---------- 2D shapes in a plane's (u,v) coords (v up), mapped to 3D by a plane ---------- */
const arcUV  = (cu,cv,r,a0,a1,n=7) => { const o=[]; for (let i=0;i<=n;i++){ const a=(a0+(a1-a0)*i/n)*Math.PI/180; o.push([cu+r*Math.cos(a), cv+r*Math.sin(a)]); } return o; };
const rrUV   = (u0,v0,u1,v1,r,n=7) => r <= 0 ? rectUV(u0,v0,u1,v1) : [...arcUV(u1-r,v0+r,r,-90,0,n), ...arcUV(u1-r,v1-r,r,0,90,n), ...arcUV(u0+r,v1-r,r,90,180,n), ...arcUV(u0+r,v0+r,r,180,270,n)];
const rectUV = (u0,v0,u1,v1) => [[u0,v0],[u1,v0],[u1,v1],[u0,v1]];
const ellUV  = (cu,cv,ru,rv,n=24) => Array.from({length:n}, (_,i) => { const a=i/n*2*Math.PI; return [cu+ru*Math.cos(a), cv+rv*Math.sin(a)]; });
const PX = x => ([u,v]) => [x,u,v];      // front-facing plane x = const   (u = y, v = z)
const PY = y => ([u,v]) => [u,y,v];      // side plane y = const           (u = x, v = z)
const PZ = z => ([u,v]) => [u,v,z];      // horizontal plane z = const     (u = x, v = y)
const on = (plane, uv) => uv.map(plane);

/* ---------- vectors + shading ---------- */
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const norm=a=>{ const l=Math.hypot(...a)||1; return a.map(v=>v/l); };
const avg=ps=>ps.reduce((s,p)=>[s[0]+p[0]/ps.length,s[1]+p[1]/ps.length,s[2]+p[2]/ps.length],[0,0,0]);
const vis = n => { const r = rotV(n); return r[0]+r[1]+r[2] > 1e-6; };   // viewer looks from (+1,+1,+1) after the turn
const facing = vis;                                                       // readable alias: is this face toward the viewer?
const SHADOW_K = 0.85, AZ_MIN = 20, AZ_MAX = 160;
// cast shadows are drawn shorter than the shading light implies (0.45 × height instead of 0.85 ×): long shadows of tall
// parts on thin supports (a lamp shade, a fan head) land far from the object and read as separate blobs
const SHADOW_LEN = 0.45;
let L = [0,0,1], SH = [0,0];
function setLight(deg){ const a=deg*Math.PI/180; SH=[SHADOW_K*Math.cos(a), SHADOW_K*Math.sin(a)]; L=norm([-SH[0],-SH[1],1]); }
const LIN = norm([.6,.2,1]);                       // fixed light for interiors / small props
// Three flat tones, but blended across a narrow band at each step, so a face that turns past a threshold while the
// figure rotates fades between tones instead of snapping (at rest almost every face still sits on a pure tone).
const SOFT = .18;
const step3 = (d, hi, lo, m) => { const ss = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a)/(b - a))); return k*k*(3 - 2*k); };
  const a = ss(hi - SOFT, hi + SOFT, d), b = ss(lo - SOFT, lo + SOFT, d);
  return a >= 1 ? m.l : b <= 0 ? m.d : a > 0 ? mix(m.m, m.l, a) : b < 1 ? mix(m.d, m.m, b) : m.m; };
const tone  = (n,m) => step3(dot(rotV(n),L),   -.15, -.45, m);   // exterior, follows the sun
const toneI = (n,m) => step3(dot(rotV(n),LIN),  .6,   .05, m);   // interior / props
const mix = (a,b,t) => '#' + [1,3,5].map(i => Math.round(parseInt(a.substr(i,2),16)*(1-t) + parseInt(b.substr(i,2),16)*t).toString(16).padStart(2,'0')).join('');
const matOf = hex => ({ l:hex, m:mix(hex,'#000000',.16), d:mix(hex,'#000000',.42) });
const ease = t => t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;

/* ---------- drawing primitives (all return SVG strings) ---------- */
const ink   = (d,w=1.0) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const fill  = (d,c,extra='') => `<path d="${d}" fill="${c}" ${extra}/>`;
const face  = (d,c) => `<path d="${d}" fill="${c}" stroke="${c}" stroke-width=".7" stroke-linejoin="round"/>`;
const shape = (pts,c,w=.9) => fill(pd(pts),c) + (w ? ink(pd(pts),w) : '');
const line  = (pts,w=.9) => ink(pd(pts,false),w);
// Loft between two rings of equal length (closed). colour(n) picks each strip's fill; flip = seen from inside.
function loft(A, B, colour, flip=false){
  const n=A.length, cen=avg(A.concat(B)); let s='';
  for (let i=0;i<n;i++){
    const a0=A[i], a1=A[(i+1)%n], b1=B[(i+1)%n], b0=B[i];
    let nr = norm(cross(sub(a1,a0), sub(b0,a0)));
    if (!isFinite(nr[0])) continue;
    if (dot(nr, sub(avg([a0,a1,b1,b0]), cen)) < 0) nr = nr.map(v=>-v);
    if (flip) nr = nr.map(v=>-v);
    if (vis(nr)) s += face(pd([a0,a1,b1,b0]), colour(nr));
  }
  return s;
}
function hull(pts){
  pts = pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]); const lo=[], up=[];
  for (const p of pts){ while(lo.length>=2 && cr(lo[lo.length-2],lo[lo.length-1],p)<=0) lo.pop(); lo.push(p); }
  for (const p of pts.reverse()){ while(up.length>=2 && cr(up[up.length-2],up[up.length-1],p)<=0) up.pop(); up.push(p); }
  lo.pop(); up.pop(); return lo.concat(up);
}
// Silhouette ink, weighted by how thick the part is on screen (like a hand inker): the w you pass is the most it gets.
// Thickness = 2 × area / perimeter of the outline (a rod's diameter, about half a box's width), as a share of the
// frame width. A long thin rod, a handle or a knob stays light (~1–1.5); a grinder, kettle or machine body gets the
// heavy ~2.4–2.8. Thin parts stay thin and parts keep air between them.
const hullInk = (pts3, w=1.4) => { const h = hull(pts3.map(p=>P(...p))); let a = 0, per = 0;
  for (let i = 0; i < h.length; i++){ const p = h[i], q = h[(i+1) % h.length]; a += p[0]*q[1] - q[0]*p[1]; per += Math.hypot(q[0]-p[0], q[1]-p[1]); }
  const thick = per ? Math.abs(a) / per / (INK_K * INK_REF_VB) : 0;
  return ink(sp(h), Math.min(w, .9 + 20*thick)); };
// Axis-aligned box: three visible faces, shaded, each outlined. shade = tone (sunlit) or toneI (interior).
function box(x0,y0,z0,x1,y1,z1,m,shade=toneI,w=.9){
  // all six faces, drawn only when they face the viewer (sides first, then top) — correct in every VIEW
  const F = [
    [[0,1,0],  [[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]]],
    [[1,0,0],  [[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]]],
    [[0,-1,0], [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]]],
    [[-1,0,0], [[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1]]],
    [[0,0,1],  [[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]]] ];
  return F.filter(([n]) => vis(n)).map(([n,q]) => shape(q, shade(n,m), w)).join('');
}
// Rounded-profile extrusion: profile (u=y, v=z) swept along x from x0 to x1. Body of most machines.
function extrude(profileUV, x0, x1, m, shade=tone){ return loft(on(PX(x0),profileUV), on(PX(x1),profileUV), n=>shade(n,m)); }
// Vertical cylinder (axis z) centred (x,y), radius r from z0 to z1, with top cap.
function cyl(x,y,z0,z1,r,m,shade=toneI,w=1.2,n=24){
  const A=on(PZ(z0),ellUV(x,y,r,r,n)), B=on(PZ(z1),ellUV(x,y,r,r,n));
  return loft(A,B,nr=>shade(nr,m)) + fill(pd(B),shade([0,0,1],m)) + hullInk([...A,...B],w) + ink(pd(B),w*.8);
}
// Cylinder lying along x (e.g. a knob or dial sticking out of a front face): centred (y,z), from x0 to x1.
function cylX(x0,x1,y,z,r,m,shade=toneI,w=1.1,n=20){
  const A=on(PX(x0),ellUV(y,z,r,r,n)), B=on(PX(x1),ellUV(y,z,r,r,n));
  // cap on whichever end faces the viewer (the +x end in VIEW 0)
  const capB = vis([1,0,0]), cap = capB ? B : A, cn = capB ? [1,0,0] : [-1,0,0];
  return loft(A,B,nr=>shade(nr,m)) + (vis(cn) ? fill(pd(cap),shade(cn,m)) : '') + hullInk([...A,...B],w) + (vis(cn) ? ink(pd(cap),w*.8) : '');
}
// Cylinder between any two 3D points a and b (a lamp arm, a rod, a pipe at an angle, a handle bar), radius r.
// The end facing the viewer gets a cap. For a tapered part (a cone, a lamp shade) pass r1 for the radius at b.
function rod(a, b, r, m, shade=toneI, w=1, r1=r, n=16){
  const d = norm(sub(b, a)), u = norm(cross(d, Math.abs(d[2]) < .9 ? [0,0,1] : [1,0,0])), v = cross(d, u);
  const ring = (p, rr) => Array.from({length:n}, (_,i) => { const t = i/n*2*Math.PI, c = Math.cos(t)*rr, s2 = Math.sin(t)*rr;
    return [p[0] + u[0]*c + v[0]*s2, p[1] + u[1]*c + v[1]*s2, p[2] + u[2]*c + v[2]*s2]; });
  const A = ring(a, r), B = ring(b, r1), capB = vis(d), cap = capB ? B : A, cn = capB ? d : d.map(x => -x);
  return loft(A, B, nr => shade(nr, m)) + (Math.max(r, r1) > 0 ? fill(pd(cap), shade(cn, m)) + ink(pd(cap), w*.8) : '') + hullInk([...A, ...B], w);
}
// Text lying flat on a front plane x = const, centred at (y,z) baseline; reads left-to-right on screen.
const txM = (o, U, V) => `matrix(${U[0].toFixed(4)} ${U[1].toFixed(4)} ${V[0].toFixed(4)} ${V[1].toFixed(4)} ${f(o[0])} ${f(o[1])})`;
const tx = (x,y,z,str,size,col=INK,weight=700) => { const o=P(x,y,z);
  return `<text transform="${txM(o, Dv(0,-1,0), Dv(0,0,-1))}" font-size="${size}" fill="${col}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}" letter-spacing=".04em">${str}</text>`; };
// Text on a side plane y = const, centred at (x,z).
const txY = (x,y,z,str,size,col=INK,weight=700) => { const o=P(x,y,z);
  return `<text transform="${txM(o, Dv(1,0,0), Dv(0,0,-1))}" font-size="${size}" fill="${col}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}" letter-spacing=".04em">${str}</text>`; };
// Cast shadow of a set of 3D points (any outline of the object), pushed along the light onto z = 0.
// the light stays put relative to the viewer, so the shadow is cast in turned coordinates
// z0: the surface it falls on (a board, a counter); clip it to that surface with clipTo(...) if it could spill off.
// clip: the 3D outline of the surface it falls on (e.g. boardTop(...)), so it can't spill over the edge.
const castShadow = (pts3, z0=0, clip=null) => { const k = SHADOW_LEN / SHADOW_K, [sx, sy] = yawTurn(SH);
  const s = fill(sp(hull(pts3.map(([x,y,z]) => P(x+(z-z0)*sx*k, y+(z-z0)*sy*k, z0)))), SHADOW);
  return clip ? clipTo(clip, s) : s; };
// A board for the object to stand on (a tray, a desk top, a counter): a rounded slab from (x0,y0) to (x1,y1), h thick.
// Draw it first; then castShadow(points, h, boardTop(x0,y0,x1,y1,h,r)) so shadows lie on it and stop at its edge.
const BOARD = { l:'#e6e1d4', m:'#cfc8b8', d:'#aaa293' }, WOOD = { l:'#d9a86c', m:'#bf8a4f', d:'#8e6236' };
const boardTop = (x0,y0,x1,y1,h=3,r=5) => on(PZ(h), rrUV(x0,y0,x1,y1,r));
function board(x0,y0,x1,y1,h=3,r=5,m=BOARD){
  const A = on(PZ(0), rrUV(x0,y0,x1,y1,r)), B = boardTop(x0,y0,x1,y1,h,r);
  return loft(A, B, n => toneI(n, m)) + fill(pd(B), m.l) + ink(pd(B), 1) + hullInk([...A, ...B], 1.8);
}
// Group helpers: clickable target, clip to an opening.
const act  = (name, inner, data='') => `<g data-act="${name}" ${data}>${inner}</g>`;
let _clipN = 0;
// Part label (for "how does it work" figures): a cream pill with a leader line to a 3D point on the part.
// dx, dy = where the pill sits, in screen units at the reference zoom (they scale with the figure like stroke widths).
// on = that part is working right now (the pill turns the accent colour). 部件名称 can be hidden with the 部件名称 switch.
function tag(p3, dx, dy, text, on=false){
  const k = INK_K, [X,Y] = P(...p3), fs = 8.6*k, w = text.length*fs*.62 + fs*1.5, h = fs*1.8, cx = X + dx*k, cy = Y + dy*k;
  return `<g class="tag${on ? ' on' : ''}"><path d="M${f(X)} ${f(Y)}L${f(cx)} ${f(cy)}" fill="none" stroke="${INK}" stroke-width="1"/>`
    + `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(1.3*k)}" fill="${INK}"/>`
    + `<rect x="${f(cx-w/2)}" y="${f(cy-h/2)}" width="${f(w)}" height="${f(h)}" rx="${f(h/2)}" fill="${on ? 'var(--accent,#f4b829)' : '#fff4d6'}" stroke="${INK}" stroke-width="1.2"/>`
    + `<text x="${f(cx)}" y="${f(cy+fs*.36)}" font-size="${f(fs)}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800" letter-spacing=".04em" fill="${INK}">${text}</text></g>`;
}
const clipTo = (pts3, inner) => { const id = 'k' + (++_clipN); return `<clipPath id="${id}"><path d="${pd(pts3)}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`; };

/* ---------- constant on-screen line weight ----------
   Stroke widths are written in model units, and each figure is zoomed to fill the frame, so a small
   object would get fat lines. INK_K rescales every stroke-width (and the wobble/grain filter) so all
   figures match the reference zoom of the booth / vending machine (viewBox ≈ 585 units wide). */
const INK_REF_VB = 585;
let INK_K = 1;
const inkScale = svg => INK_K === 1 ? svg : svg.replace(/stroke-width="([\d.]+)"/g, (_, w) => `stroke-width="${(+w * INK_K).toFixed(2)}"`);

/* ---------- page shell ---------- */


const filterFor = k => `<filter id="hand" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${(0.045/k).toFixed(4)}" numOctaves="2" seed="4" result="warp"/>
  <feDisplacementMap id="wob" in="SourceGraphic" in2="warp" scale="${(2.4*k).toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="wob"/>
  <feTurbulence type="fractalNoise" baseFrequency="${(0.9/k).toFixed(4)}" numOctaves="3" seed="11" result="n1"/>
  <feColorMatrix in="n1" type="matrix" values=".3 0 0 0 .84  .3 0 0 0 .84  .3 0 0 0 .84  0 0 0 0 1" result="grain"/>
  <feTurbulence type="fractalNoise" baseFrequency="${(0.012/k).toFixed(4)}" numOctaves="2" seed="7" result="n2"/>
  <feColorMatrix in="n2" type="matrix" values=".3 0 0 0 .85  .3 0 0 0 .85  .3 0 0 0 .85  0 0 0 0 1" result="blot"/>
  <feBlend in="wob" in2="grain" mode="multiply" result="g1"/><feBlend in="g1" in2="blot" mode="multiply" result="g2"/>
  <feComposite in="g2" in2="wob" operator="in"/></filter>`;

/* mountFigure({
     fig:'03', title:'Photo booth', hint:'click the curtain…',
     size:[W,D,H],                 // bounding box, used to frame the view (shadow range included)
     palette:'mustard',            // default PALS key
     state:{...},                  // figure state (st.pal is built in)
     scene: (st, m) => svgString,  // m = current palette {l,m,d}
     readout: st => 'text',        // status line under the figure
     buttons: [{label, onClick(st, ui)}      // listed in the order the user should do them
               | {label, choices: st => [{label, onClick(st,ui), current?, disabled?, why?}]}],   // opens a picker
     stats: st => [{label, value, small?}],   // optional: big numbers top-right (credit, change, score)
     credit: false,                // optional: hide the small "Made with Colorfigures" link
     acts: { name(st, el, ui){} },  // clicks on act(name, …) groups; el has dataset
     params(st, q){}               // optional: read URLSearchParams for screenshot states
   })  -> ui = { st, render, animate(stepFn), flash(text,ms) }
   animate(step): calls step(dt seconds) every frame and re-renders until step returns false. */
addEventListener('error', e => { document.documentElement.dataset.errors = (document.documentElement.dataset.errors || '') + ' ' + e.message + ';'; });
/* The hand-drawn filter's noise never changes, but browsers recompute every feTurbulence each time the drawing changes
   (on phones SVG filters run on the CPU, so this is most of the cost of a frame). bakeNoise renders each noise layer once
   into an image and swaps it in: coarse layers as one small image over the whole view (they are smooth, so scaling up
   is invisible), fine grain as a seamless tile. If anything fails (an old browser), the live filter simply stays. */
function bakeNoise(svg){
  const fl = document.getElementById('hand'); if (!fl || typeof Image === 'undefined') return;
  const NS = 'http://www.w3.org/2000/svg', vb = svg.viewBox.baseVal;
  const x0 = vb.x - vb.width*.35, y0 = vb.y - vb.height*.35, w0 = vb.width*1.7, h0 = vb.height*1.7;
  for (const t of [...fl.querySelectorAll('feTurbulence')]){
    const fq = parseFloat(t.getAttribute('baseFrequency')), oct = +(t.getAttribute('numOctaves') || 1);
    if (!(fq > 0)) continue;
    const fine = fq * Math.max(w0, h0) > 80;                              // fine grain: tile it
    const rx = fine ? 0 : x0, ry = fine ? 0 : y0, rw = fine ? 48 / fq : w0, rh = fine ? 48 / fq : h0;
    const ppu = fq * (fine ? 7 : 5) * Math.pow(2, Math.max(0, oct - 1) * .5), PW = Math.ceil(rw * ppu), PH = Math.ceil(rh * ppu);
    if (PW * PH > 1200 * 1200) continue;
    const tb = t.cloneNode(); tb.removeAttribute('result'); if (fine) tb.setAttribute('stitchTiles', 'stitch');
    const src = `<svg xmlns="${NS}" width="${PW}" height="${PH}" viewBox="${rx} ${ry} ${rw} ${rh}"><filter id="n" filterUnits="userSpaceOnUse" x="${rx}" y="${ry}" width="${rw}" height="${rh}" color-interpolation-filters="sRGB">${tb.outerHTML}</filter><rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" filter="url(#n)"/></svg>`;
    const img = new Image(), imageGeneration=generation;
    scope.onCleanup(()=>{scope.bindProperty(img,"onload",null);scope.bindProperty(img,"onerror",null);img.src='';});
    scope.bindProperty(img,"onload",() => { if(disposed||imageGeneration!==generation||!scope.active)return; try {
      const c = document.createElement('canvas'); c.width = PW; c.height = PH; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      // store the noise's colour values fully opaque: the filter reads its colour channels, and an image with
      // see-through pixels would be read premultiplied (darker) by some browsers
      const px = g.getImageData(0, 0, PW, PH); for (let i = 3; i < px.data.length; i += 4) px.data[i] = 255; g.putImageData(px, 0, 0);
      const url = c.toDataURL('image/png'), res = t.getAttribute('result');
      const im = document.createElementNS(NS, 'feImage');
      // a tile must sit inside the filter's region (the drawing's box) or it gets clipped: anchor it at the drawing's
      // centre, snapped to whole tiles so the grain keeps the same phase as the live noise would
      let ox = rx, oy = ry;
      if (fine){ const bb = svg.getElementById ? document.getElementById('art').getBBox() : { x: 0, y: 0, width: 0, height: 0 };
        ox = Math.floor((bb.x + bb.width/2) / rw) * rw; oy = Math.floor((bb.y + bb.height/2) / rh) * rh; }
      for (const [k, v] of [['x', ox], ['y', oy], ['width', rw], ['height', rh], ['preserveAspectRatio', 'none']]) im.setAttribute(k, v);
      im.setAttribute('href', url); im.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', url);
      if (!t.isConnected) return;
      if (fine){ im.setAttribute('result', res + '_tile'); const tl = document.createElementNS(NS, 'feTile'); tl.setAttribute('in', res + '_tile'); tl.setAttribute('result', res); t.replaceWith(im, tl); }
      else { im.setAttribute('result', res); t.replaceWith(im); }
    } catch (e) {} });
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
  }
}
function mountFigure(cfg){
  root.innerHTML = `
    <header><h1>${cfg.title}</h1><span>${cfg.hint || ''}</span></header>
    <div class="stage">
      ${cfg.buttons && cfg.buttons.length ? `<div class="actions" id="btns"><div class="cap">${cfg.buttonsLabel || 'Try it'}</div></div>` : ''}
      ${cfg.stats ? '<div class="stats" id="stats"></div>' : ''}
      <div class="toast" id="toast" role="status"></div>
      <svg id="fig" tabindex="0" role="group" aria-label="可交互洗衣机：点击部件操作，拖拽或聚焦后用方向键旋转"><defs id="fdefs"></defs><g id="art" filter="url(#hand)"></g></svg>
    </div>
    <div id="readout"></div>
    ${cfg.idea ? `<p class="idea"><strong>原理小知识</strong>${cfg.idea}</p>` : ''}
    <div class="controls">
      <div class="ctl"><label for="wb">手绘线条抖动</label><input id="wb" type="range" min="0" max="7" step="0.1" value="2.4"></div>
      <div class="ctl"><label>机身配色</label><div class="row" id="pals"></div></div>
      <div class="ctl"><label>观察视角</label><div class="row"><button id="vreset">回到正面</button><button id="vspin" aria-pressed="false">自动旋转</button></div></div>
      <div class="ctl"><label>画面性能</label><div class="row"><button id="quality" aria-pressed="true">流畅模式：开</button></div></div><div class="ctl" id="lblctl" hidden><label>部件名称</label><div class="row"><button id="lbl" aria-pressed="true">显示</button></div></div>
    </div>
    ${cfg.credit === false ? '' : '<footer class="made-with"><a href="https://april-zhu.com/colorfigures" target="_blank" rel="noopener">查看原作与作者 ↗</a></footer>'}`;
  const st = cfg.state || {};            // kept as the same object, so a figure may hold on to it
  if (!st.pal) st.pal = cfg.palette || 'mustard';
  if (st.az == null) st.az = 105;
  const q = new URLSearchParams(location.search);
  if (PALS[q.get('pal')]) st.pal = q.get('pal');
  if (cfg.params) cfg.params(st, q);

  // frame on the object itself: centred, filling ~60% of the width / ~78% of the height of a 4:3 view.
  // The cast shadow is allowed to spill outside the frame (svg overflow is visible).
  const [W,D,H] = cfg.size, pts = [];
  OX = OY = 0; RC = cfg.center || [W/2, D/2]; RCZ = H/2;
  VIEW = 0; setCam(YAW0, PITCH0);
  for (const x of [0,W]) for (const y of [0,D]) for (const z of [0,H]) pts.push(P(x,y,z));
  const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]);
  const bw = Math.max(...xs)-Math.min(...xs), bh = Math.max(...ys)-Math.min(...ys);
  // the object fills ~74% of the width / ~88% of the height, nudged right of centre so the buttons (top left) stay clear
  const vbW = Math.max(bw/.74, bh/.88/.75), vbH = vbW*.75;
  OX = (vbW-bw)/2 + vbW*.06 - Math.min(...xs); OY = vbH*.04 - Math.min(...ys);   // sit a little high: shadows fall downward
  const svg = document.getElementById('fig');
  svg.setAttribute('viewBox', `0 0 ${f(vbW)} ${f(vbH)}`);
  INK_K = vbW / INK_REF_VB;
  document.getElementById('fdefs').innerHTML = filterFor(INK_K);
  bakeNoise(svg);

  const art = document.getElementById('art'), readout = document.getElementById('readout');
  const initialState=JSON.parse(JSON.stringify(st));
  const ui = { st };
  ui.press = name => { ui.pressedAct=name; st.pressedAct=name; ui.invalidate?.(); };
  ui.clearPress = () => { ui.pressedAct=null; st.pressedAct=null; ui.invalidate?.(); };
  ui.feedback = (text, kind='notice') => { ui.flash(text); toast.dataset.kind=kind; if(kind==='blocked')window.MechanicalAudio?.pulse('tick'); };
  const layerNodes=new Map();let lastPal='';let smoothMotion=true;const quality=document.getElementById('quality');scope.bindProperty(quality,"onclick",()=>{smoothMotion=!smoothMotion;quality.setAttribute('aria-pressed',smoothMotion);quality.textContent='流畅模式：'+(smoothMotion?'开':'关');ui.invalidate();});
  const renderSamples=[];ui.metrics={frames:0,lastMs:0,layersUpdated:0};
  ui.render = () => {
    if(disposed||!scope.active)return;
    const started=performance.now();_clipN=0;if(lastPal!==st.pal){document.documentElement.style.setProperty('--accent',PALS[st.pal].l);lastPal=st.pal;}
    // Animated SVG fragments are replaced, but keyboard focus belongs to the
    // physical control, not to one disposable drawing frame.
    const focused=art.contains(document.activeElement)?document.activeElement.closest('[data-act]'):null;
    const focusAct=focused?.dataset.act,focusIndex=focused?[...art.querySelectorAll('[data-act]')].filter(e=>e.dataset.act===focusAct).indexOf(focused):-1;
    const markup=cfg.scene(st,PALS[st.pal]);let updates=0;
    if(cfg.scene.layers){const live=new Set();let previous=null;
      for(const layer of cfg.scene.layers){live.add(layer.key);let item=layerNodes.get(layer.key);
        if(!item){const node=document.createElementNS('http://www.w3.org/2000/svg','g');node.dataset.layer=layer.key;item={node,svg:null,scale:0};layerNodes.set(layer.key,item);}
        const node=item.node;if(item.svg!==layer.svg||item.scale!==INK_K){node.innerHTML=inkScale(layer.svg);item.svg=layer.svg;item.scale=INK_K;updates++;}
        if(item.transform!==layer.transform){node.setAttribute('transform',layer.transform||'');item.transform=layer.transform;}
        if(item.opacity!==layer.opacity){node.setAttribute('opacity',layer.opacity);item.opacity=layer.opacity;}
        const expected=previous?previous.nextSibling:art.firstChild;if(node!==expected)art.insertBefore(node,expected);previous=node;
      }
      for(const [key,item]of layerNodes)if(!live.has(key)){item.node.remove();layerNodes.delete(key);}
    }else art.innerHTML=inkScale(markup);
    if(!ui._flash)readout.textContent=cfg.readout?cfg.readout(st):'';if(ui.drawStats)ui.drawStats();
    if(ui.updateTargets)ui.updateTargets();
    svg.querySelectorAll('[data-act]').forEach(el=>el.classList.toggle('is-pressed',el.dataset.act===ui.pressedAct));
    if(focused&&!focused.isConnected){const replacement=[...art.querySelectorAll('[data-act]')].filter(e=>e.dataset.act===focusAct)[focusIndex];if(replacement&&replacement.getAttribute('tabindex')!=='-1')replacement.focus({preventScroll:true});}
    const elapsed=performance.now()-started;ui.metrics.frames++;ui.metrics.lastMs=elapsed;ui.metrics.layersUpdated=updates;renderSamples.push(elapsed);if(renderSamples.length>60)renderSamples.shift();
    ui.metrics.averageMs=renderSamples.reduce((a,b)=>a+b,0)/renderSamples.length;
  };
  // big numbers in the top-right corner (credit, change, score…); a value that changes gets a little bump
  const statsEl = document.getElementById('stats'), prevStats = {};
  ui.drawStats = () => { if (!statsEl) return;
    const list = cfg.stats(st).filter(Boolean), html = list.map(x => `<div class="stat${x.small ? ' small' : ''}"><div class="k">${x.label}</div><div class="v" data-k="${x.label}">${x.value}</div></div>`).join('');
    if (statsEl._html !== html){ statsEl._html = html; statsEl.innerHTML = html;
      statsEl.querySelectorAll('.v').forEach(v => { if (prevStats[v.dataset.k] != null && prevStats[v.dataset.k] !== v.textContent) v.classList.add('bump'); prevStats[v.dataset.k] = v.textContent; }); } };
  let flashT = 0;
  const toast = document.getElementById('toast');
  ui.flash = (text, ms=1600) => { toast.dataset.kind='notice'; ui._flash = true; readout.textContent = text; toast.textContent = text;
    toast.style.top = ((document.getElementById('btns') ? document.getElementById('btns').offsetTop + document.getElementById('btns').offsetHeight : 0) + 8) + 'px'; toast.classList.add('show');
    clearTimeout(flashT); flashT = setTimeout(() => { ui._flash = false; toast.classList.remove('show'); ui.render(); }, ms); };
  ui.clearFeedback=()=>{clearTimeout(flashT);ui._flash=false;toast.classList.remove('show');};
  // One frame driver for every running animation: each frame runs all the steps, then draws once (two animations at
  // the same time no longer draw twice). It follows the screen's frames, with a timer fallback for when frames don't
  // come (headless shots, a hidden tab). ui.invalidate() asks for one redraw on the next frame (used while dragging).
  const steps=new Set();let driving=false,lastT=0,frameId=0,lastPaint=0;
  const coarse=matchMedia('(pointer:coarse)').matches;let frameBudget=coarse?1000/24:1000/30;
  const frame=now=>{driving=false;frameId=0;if(disposed||paused||document.hidden)return;
    if(now-lastPaint<frameBudget){drive();return;}const dt=Math.min(.06,Math.max(0,(now-lastT)/1000));lastT=now;lastPaint=now;
    for(const step of [...steps])if(step(dt)===false)steps.delete(step);
    art.setAttribute('filter','url(#hand)');ui.render();frameBudget=Math.max(coarse?1000/24:1000/30,Math.min(1000/15,ui.metrics.averageMs*(smoothMotion?1.4:1)));if(steps.size)drive();
  };
  const drive=()=>{if(disposed||paused||driving||document.hidden||!scope.active)return;driving=true;frameId=requestAnimationFrame(frame);};
  ui.animate=step=>{if(disposed||!scope.active)return;if(!steps.size&&!driving)lastT=performance.now();steps.add(step);drive();};
  ui.invalidate=()=>{if(!steps.size)lastT=performance.now();drive();};
  // The exhibit controller owns visibility and lifecycle pause reasons.

  // orbit: drag anywhere that is not a clickable part (the machine turns the way the finger moves); arrow keys nudge; double-click eases back to the front view
  let drag = null, spin = false, camAnim = 0, spinAnim = 0, pointerClick=null, pointerClickTimer=0;
  const camTo = (y, p, ms=700) => { const y0 = YAW, p0 = PITCH, dy = (((y - y0 + 180) % 360) + 360) % 360 - 180, id = ++camAnim; let t = 0;
    ui.animate(dt => { if (id !== camAnim) return false; t += dt*1000; const k = Math.min(1, t / ms), e = ease(k); setCam(y0 + dy*e, p0 + (p - p0)*e); return k < 1; }); };
  ui.camTo = camTo;
  scope.listen(svg,'pointerdown',e=>{if(drag||e.isPrimary===false||e.button)return;
    camAnim++;drag={x:e.clientX,y:e.clientY,yaw:YAW,pitch:PITCH,pointerId:e.pointerId,pointerType:e.pointerType,candidate:e.target.closest('[data-act]'),moved:false};
    if(drag.candidate)ui.press(drag.candidate.dataset.act);
    try{svg.setPointerCapture(e.pointerId)}catch{};
  });
  scope.listen(svg,'pointermove',e=>{if(!drag||e.pointerId!==drag.pointerId)return;
    if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return;
    drag.moved=true;ui.clearPress();svg.classList.add('drag');const k=300/svg.getBoundingClientRect().width;
    setCam(drag.yaw+(e.clientX-drag.x)*.55*k,drag.pitch+(e.clientY-drag.y)*.35*k);ui.invalidate();
  });
  const activate=a=>{if(disposed||paused||!a||!cfg.acts||!cfg.acts[a.dataset.act])return;
    cfg.acts[a.dataset.act](st,a,ui);ui.invalidate();
  };
  const endDrag=e=>{if(!drag||e.pointerId!==drag.pointerId)return;const old=drag;drag=null;clearTimeout(pointerClickTimer);pointerClick=old.candidate?{target:old.candidate,id:old.pointerId,type:old.pointerType}:null;pointerClickTimer=setTimeout(()=>pointerClick=null,0);ui.clearPress();svg.classList.remove('drag');if(svg.hasPointerCapture?.(e.pointerId))svg.releasePointerCapture(e.pointerId);if(!old.moved&&e.type==='pointerup')activate(old.candidate);};
  scope.listen(svg,'pointerup',endDrag);scope.listen(svg,'pointercancel',endDrag);scope.listen(svg,'lostpointercapture',endDrag);
  // A pointer compatibility click can also have detail=0; match its exact
  // target and pointer identity, including canceled or dragged gestures.
  // Assistive input can send only click; a keyboard-generated click belongs to
  // the key press already handled below. Keep that guard through keyup's default
  // action, then release it without throttling separate click-only activations.
  let keyActivation=null,keyReleaseTimer=0;
  const clearKeyActivation=()=>{clearTimeout(keyReleaseTimer);keyActivation=null;};
  const releaseKeyActivation=()=>{clearTimeout(keyReleaseTimer);keyReleaseTimer=setTimeout(clearKeyActivation,0);};
  const cancelDrag=()=>{clearKeyActivation();if(drag)endDrag({pointerId:drag.pointerId,type:'cancel'});else ui.clearPress()};addEventListener('blur',cancelDrag);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelDrag()});
  scope.listen(svg,'click',e=>{const a=e.target.closest('[data-act]');if(pointerClick&&a===pointerClick.target&&e.pointerId===pointerClick.id&&e.pointerType===pointerClick.type){pointerClick=null;clearTimeout(pointerClickTimer);return;}if(e.detail===0&&a&&keyActivation?.act!==a.dataset.act)activate(a);});
  scope.listen(svg,'keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.isComposing||e.defaultPrevented||e.key!=='Enter'&&e.key!==' ')return;const a=e.target.closest('[data-act]');if(a){e.preventDefault();e.stopPropagation();if(!e.repeat){clearKeyActivation();keyActivation={act:a.dataset.act,key:e.key};ui.press(a.dataset.act);activate(a)}}});
  scope.listen(svg,'keyup',e=>{if(e.key==='Enter'||e.key===' '){ui.clearPress();if(keyActivation?.key===e.key)releaseKeyActivation();}});
  scope.listen(svg,'focusout',()=>{ui.clearPress();releaseKeyActivation();});
  scope.listen(svg,'dblclick', e => { if (!e.target.closest('[data-act]')){spin=false;vsp.setAttribute('aria-pressed',false);camTo(...(cfg.homeView||[YAW0,PITCH0]));} });
  scope.listen(svg,'keydown', e => { const k = { ArrowLeft:[-15,0], ArrowRight:[15,0], ArrowUp:[0,8], ArrowDown:[0,-8] }[e.key];
    if (!k || e.altKey || e.ctrlKey || e.metaKey || e.isComposing || e.defaultPrevented) return; e.preventDefault(); camTo(YAW + k[0], PITCH + k[1], 260); });
  scope.bindProperty(document.getElementById('vreset'),"onclick",() => { spin = false; vsp.setAttribute('aria-pressed', false); camTo(...(cfg.homeView||[YAW0,PITCH0])); });
  const vsp = document.getElementById('vspin');
  scope.bindProperty(vsp,"onclick",() => { spin = !spin; vsp.setAttribute('aria-pressed', spin); camAnim++;const id=++spinAnim;
    if (spin) ui.animate(dt => { if (!spin||id!==spinAnim) return false; if (!drag) setCam(YAW + dt*18, PITCH); return true; }); });
  if (q.has('yaw') || q.has('pitch')) setCam(+(q.get('yaw') ?? YAW0), +(q.get('pitch') ?? PITCH0));
  const btns = document.getElementById('btns');
  const stepEls = [];
  if (btns) cfg.buttons.forEach((b, i) => {
    const wrap = document.createElement('div'); wrap.className = 'stepwrap';
    const el = document.createElement('button'); el.className = 'act';
    el.innerHTML = `${b.label}${b.choices ? '<span class="car">▾</span>' : ''}`;
    if(b.choices){el.setAttribute('aria-expanded','false');el.setAttribute('aria-haspopup','true');}
    wrap.appendChild(el); btns.appendChild(wrap); stepEls.push(el);
    if (!b.choices){ scope.bindProperty(el,"onclick",() => { closeChips(); b.onClick(st, ui); ui.render(); }); return; }
    const chips = document.createElement('div'); chips.className = 'chips'; wrap.appendChild(chips);
    scope.bindProperty(el,"onclick",e => { e.stopPropagation(); const open = !wrap.classList.contains('open'); closeChips();
      if (!open) return;
      chips.innerHTML = '';
      // every choice stays clickable, so nothing silently ignores a press:
      //   current:true  = the one in use (shown selected); a press just says so
      //   disabled:true = not possible right now (shown faded); a press says why (c.why, or a generic note)
      for (const c of b.choices(st)){ const ch = document.createElement('button'); ch.className = 'chip' + (c.current ? ' current' : c.disabled ? ' off' : ''); ch.textContent = c.label;
        if (c.current) ch.setAttribute('aria-pressed', 'true');
        scope.bindProperty(ch,"onclick",ev => { ev.stopPropagation(); closeChips(); el.focus({preventScroll:true});
          if (c.current) return ui.flash(`已经选择${c.label}`);
          if (c.disabled) return ui.flash(c.why || `当前无法选择${c.label}`);
          c.onClick(st, ui); ui.render(); }); chips.appendChild(ch); }
      wrap.classList.add('open'); el.setAttribute('aria-expanded','true'); });
  });
  function closeChips(){ document.querySelectorAll('.stepwrap.open').forEach(w => {w.classList.remove('open');w.firstElementChild.setAttribute('aria-expanded','false')}); }
  document.addEventListener('click', closeChips);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const open=document.querySelector('.stepwrap.open');closeChips();open?.firstElementChild.focus()}});

  scope.bindProperty(document.getElementById('wb'),"oninput",e => document.getElementById('wob').setAttribute('scale', (e.target.value * INK_K).toFixed(2)));
  const pals = document.getElementById('pals');
  for (const [k,p] of Object.entries(PALS)){
    const b = document.createElement('button'); b.className='sw'; b.title=({mustard:'芥末黄',tomato:'番茄红',mint:'薄荷绿',cobalt:'钴蓝',blush:'浅粉'})[k];b.setAttribute('aria-label',b.title); b.style.background=p.l; b.setAttribute('aria-pressed', k===st.pal);
    scope.bindProperty(b,"onclick",() => { st.pal=k; [...pals.children].forEach(c=>c.setAttribute('aria-pressed', c===b)); ui.render(); });
    pals.appendChild(b);
  }
  // labels: the switch appears when the figure draws any tag(); ?labels=0 starts with them hidden
  const lblctl = document.getElementById('lblctl'), lbl = document.getElementById('lbl');
  const set部件名称 = on => { document.documentElement.classList.toggle('nolabels', !on); lbl.textContent = on ? '显示' : '隐藏'; lbl.setAttribute('aria-pressed', on); ui.invalidate(); };
  scope.bindProperty(lbl,"onclick",() => set部件名称(document.documentElement.classList.contains('nolabels')));
  if (q.get('labels') === '0') set部件名称(false);
  // testing: ?press=Label@ms,Label@ms clicks the buttons whose text starts with Label at those times after load
  // (any order, repeats allowed); Label>Choice picks a choice from a picker button (?press=Speed>3@300).
  // Script errors and unknown labels are recorded on <html data-errors="…">
  // State belongs to this mounted controller, not a document-global debug slot.
  const noteErr = m => { document.documentElement.dataset.errors = (document.documentElement.dataset.errors || '') + ' ' + m + ';'; };
  const starts = (el, t) => el.textContent.trim().toLowerCase().startsWith(t.trim().toLowerCase());
  if (q.has('press')) q.get('press').split(',').forEach(item => { const [what, ms] = item.split('@'), [label, choice] = what.split('>');
    setTimeout(() => { const b = [...document.querySelectorAll('.act')].find(b => starts(b, label));
      if (!b) return noteErr(`no button "${label}"`);
      b.click(); if (choice == null) return;
      const c = [...b.parentElement.querySelectorAll('.chip')].find(c => starts(c, choice));
      if (c && !c.disabled) c.click(); else noteErr(`no choice "${choice}" in "${label}"`); }, +ms || 0); });
  setLight(st.az); ui.render();
  if (art.querySelector('.tag')) lblctl.hidden = false;

  const cancelInput=()=>{
    clearKeyActivation();clearTimeout(pointerClickTimer);pointerClickTimer=0;pointerClick=null;
    const old=drag;drag=null;if(old&&svg.hasPointerCapture?.(old.pointerId))svg.releasePointerCapture(old.pointerId);
    ui.pressedAct=null;st.pressedAct=null;svg.classList.remove('drag');
    svg.querySelectorAll('.is-pressed').forEach(node=>node.classList.remove('is-pressed'));
    closeChips();
  };
  ui.pause=()=>{if(disposed||paused)return;paused=true;cancelInput();cancelAnimationFrame(frameId);frameId=0;driving=false;lastT=scope.now();lastPaint=0;audio?.suspend?.('pause');scope.pause();};
  ui.resume=()=>{if(disposed||!scope.active||!paused)return;paused=false;scope.resume();lastT=scope.now();lastPaint=0;ui.invalidate();};
  ui.reset=()=>{
    if(disposed)return;generation++;cancelInput();steps.clear();camAnim++;spinAnim++;spin=false;vsp.setAttribute('aria-pressed','false');
    cancelAnimationFrame(frameId);frameId=0;driving=false;for(const id of pendingTimers)scope.clearTimeout(id);pendingTimers.clear();
    ui._flash=false;toast.classList.remove('show');toast.textContent='';
    for(const key of Object.keys(st))delete st[key];Object.assign(st,JSON.parse(JSON.stringify(initialState)));
    setCam(...(cfg.homeView||[YAW0,PITCH0]));lastT=scope.now();lastPaint=0;layerNodes.clear();art.replaceChildren();
    pals.querySelectorAll('button').forEach((node,index)=>node.setAttribute('aria-pressed',String(Object.keys(PALS)[index]===st.pal)));
    audio?.reset?.();ui.observation?.reset?.();bakeNoise(svg);ui.render();
  };
  ui.dispose=()=>{if(disposed)return;disposed=true;generation++;cancelInput();steps.clear();camAnim++;spinAnim++;cancelAnimationFrame(frameId);frameId=0;driving=false;};
  ui.diagnostics=()=>({disposed,paused,animationPending:!!frameId,steps:steps.size,view:{yaw:YAW,pitch:PITCH},generation});
  return ui;
}


return {get PALS(){return PALS},get METAL(){return METAL},get CLEAR(){return CLEAR},get CERAMIC(){return CERAMIC},get DARK(){return DARK},get INK(){return INK},get SHADOW(){return SHADOW},get C(){return C},get S(){return S},get OX(){return OX},get OY(){return OY},get VIEW(){return VIEW},get RC(){return RC},get RCZ(){return RCZ},get VIEW_NAMES(){return VIEW_NAMES},get TURNS(){return TURNS},get YAW0(){return YAW0},get PITCH0(){return PITCH0},get K3(){return K3},get YAW(){return YAW},get PITCH(){return PITCH},get CR(){return CR},get CU(){return CU},get CV(){return CV},get CD(){return CD},get camBasis(){return camBasis},get B0(){return B0},get setCam(){return setCam},get d3(){return d3},get rotV(){return rotV},get yawTurn(){return yawTurn},get rotXY(){return rotXY},get P0(){return P0},get P(){return P},get Dv(){return Dv},get depthOf(){return depthOf},get byDepth(){return byDepth},get f(){return f},get pd(){return pd},get sp(){return sp},get arcUV(){return arcUV},get rrUV(){return rrUV},get rectUV(){return rectUV},get ellUV(){return ellUV},get PX(){return PX},get PY(){return PY},get PZ(){return PZ},get on(){return on},get sub(){return sub},get dot(){return dot},get cross(){return cross},get norm(){return norm},get avg(){return avg},get vis(){return vis},get facing(){return facing},get SHADOW_K(){return SHADOW_K},get AZ_MIN(){return AZ_MIN},get AZ_MAX(){return AZ_MAX},get SHADOW_LEN(){return SHADOW_LEN},get L(){return L},get SH(){return SH},get setLight(){return setLight},get LIN(){return LIN},get SOFT(){return SOFT},get step3(){return step3},get tone(){return tone},get toneI(){return toneI},get mix(){return mix},get matOf(){return matOf},get ease(){return ease},get ink(){return ink},get fill(){return fill},get face(){return face},get shape(){return shape},get line(){return line},get loft(){return loft},get hull(){return hull},get hullInk(){return hullInk},get box(){return box},get extrude(){return extrude},get cyl(){return cyl},get cylX(){return cylX},get rod(){return rod},get txM(){return txM},get tx(){return tx},get txY(){return txY},get castShadow(){return castShadow},get BOARD(){return BOARD},get WOOD(){return WOOD},get boardTop(){return boardTop},get board(){return board},get act(){return act},get _clipN(){return _clipN},get tag(){return tag},get clipTo(){return clipTo},get INK_REF_VB(){return INK_REF_VB},get INK_K(){return INK_K},get inkScale(){return inkScale},get filterFor(){return filterFor},get bakeNoise(){return bakeNoise},get mountFigure(){return mountFigure},get timers(){return {setTimeout,clearTimeout}}};
}
