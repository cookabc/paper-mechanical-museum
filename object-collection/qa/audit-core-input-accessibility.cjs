const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
// Set CORE_SOURCE to compare this same regression suite against an old revision.
const text = fs.readFileSync(process.env.CORE_SOURCE || path.join(__dirname, '../dist/core.js'), 'utf8');
const inputSource = text.slice(text.indexOf('  let drag = null'), text.indexOf("  if (q.has('yaw')"));
const results = [];
function test(name, fn) { try { fn(); results.push({name, ok: true}); } catch (error) { results.push({name, ok: false, error: error.message}); } }
function inputHarness() {
  const listeners = new Map(), globals = new Map(), docListeners = new Map(), timers = new Map(), steps = [], buttons = {}, controls = [];
  let timerId = 0, calls = 0;
  const listen = map => (type, fn, capture = false) => { const list = map.get(type) || []; list.push({fn, capture: !!capture}); map.set(type, list); };
  const doc = {hidden: false, activeElement: null, addEventListener: listen(docListeners), getElementById: id => buttons[id] ||= {setAttribute(){}}};
  const svg = {dataset: {}, tagName: 'svg', closest: () => null, addEventListener: listen(listeners), setPointerCapture(){}, classList: {add(){}, remove(){}}, getBoundingClientRect: () => ({width: 300}), focus(){doc.activeElement = svg;}, contains: node => node === svg || controls.includes(node)};
  const art = {contains: node => controls.includes(node), querySelectorAll: () => controls};
  function control(act = 'sample') { const el = {dataset: {act}, tagName: 'g', isConnected: true, closest(selector){return selector.includes('data-act') ? this : null;}, focus(){doc.activeElement = this;}}; controls.push(el); return el; }
  const context = {svg, art, ui: {animate: fn => steps.push(fn), invalidate(){}}, cfg: {acts: {sample(){calls++;}, other(){calls++;}}}, st: {}, YAW: 45, PITCH: 35, YAW0: 45, PITCH0: 35, ease: x => x, document: doc,
    addEventListener: listen(globals), setTimeout: fn => {const id = ++timerId; timers.set(id, fn); return id;}, clearTimeout: id => timers.delete(id)};
  context.actionControl = target => {const el = target?.closest?.('[data-act]'); return art.contains(el) ? el : null;};
  context.setCam = (yaw, pitch) => { context.YAW = yaw; context.PITCH = Math.max(6, Math.min(78, pitch)); };
  vm.runInNewContext(inputSource, context);
  function event(type, target = svg, extra = {}) {
    const e = {type, target, button: 0, pointerId: 1, isPrimary: true, clientX: 0, clientY: 0, detail: 0, defaultPrevented: false, ...extra,
      preventDefault(){this.defaultPrevented = true;}, stopPropagation(){this.stopped = true;}, stopImmediatePropagation(){this.stopped = this.immediate = true;}};
    if (svg.contains(target)) for (const {fn} of [...(listeners.get(type) || [])].sort((a,b) => Number(b.capture) - Number(a.capture))) { fn(e); if(e.immediate) break; }
    if (!e.stopped) for (const {fn} of globals.get(type) || []) fn(e);
    return e;
  }
  return {context, svg, doc, controls, control, event, calls: () => calls, buttons, steps,
    capture: (type, fn) => listen(listeners)(type, fn, true),
    flush: () => {const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn());},
    tick: dt => {for(let i = steps.length - 1; i >= 0; i--) if(steps[i](dt) === false) steps.splice(i,1);},
    global: type => {for(const {fn} of globals.get(type) || []) fn({type});},
    hidden: () => {doc.hidden = true; for(const {fn} of docListeners.get('visibilitychange') || []) fn({type: 'visibilitychange'});}
  };
}

test('model root is keyboard reachable with discoverable arrow guidance and focus outline', () => {
  assert(/<svg id="fig"[^>]*tabindex="0"/.test(text), "model root needs tabindex=0");
  assert(/<svg id="fig"[^>]*aria-description="[^"]*方向键/.test(text), "model root needs arrow guidance");
  assert(/#fig:focus-visible/.test(text), "model root needs focus-visible outline");
});
test('plain arrows orbit only inside the model, not settings or document', () => {
  const h = inputHarness(); const a = h.control();
  let e = h.event('keydown', h.svg, {key: 'ArrowRight'}); assert.equal(e.defaultPrevented, true); h.tick(1); assert.equal(h.context.YAW, 60);
  e = h.event('keydown', a, {key: 'ArrowUp'}); assert.equal(e.defaultPrevented, true); h.tick(1); assert.equal(h.context.PITCH, 43);
  for(const target of [{tagName: 'BUTTON'}, {tagName: 'INPUT'}, {tagName: 'BODY'}]) {
    e = h.event('keydown', target, {key: 'ArrowLeft'}); assert.equal(e.defaultPrevented, false); h.tick(1); assert.equal(h.context.YAW, 60);
  }
});
test('browser modifier shortcuts and editable descendants remain untouched', () => {
  const h = inputHarness(); const a = h.control();
  for(const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey', 'isComposing']) {
    for(const target of [h.svg, a, {tagName: 'BUTTON'}]) {
      const e = h.event('keydown', target, {key: 'ArrowLeft', [modifier]: true}); assert.equal(e.defaultPrevented, false, modifier); h.tick(1); assert.equal(h.context.YAW, 45, modifier);
    }
    h.event('keydown', a, {key: 'Enter', [modifier]: true}); assert.equal(h.calls(), 0, modifier + ' Enter');
  }
  const edit = h.control(); edit.tagName = 'INPUT'; edit.isContentEditable = true;
  const e = h.event('keydown', edit, {key: 'ArrowRight'}); assert.equal(e.defaultPrevented, false); assert.equal(h.steps.length, 0);
});
test('two independent click-only activations both work, including replacement nodes', () => {
  const h = inputHarness(); const a = h.control(); h.event('click', a); h.event('click', a); assert.equal(h.calls(), 2);
  h.controls.splice(0); const b = h.control(); h.event('click', b); assert.equal(h.calls(), 3);
});
test('pointerup activates once and its normal or zero-detail compatibility click cannot duplicate', () => {
  const h = inputHarness(); const a = h.control();
  h.event('pointerdown', a); h.event('pointerup', h.svg); assert.equal(h.calls(), 1);
  h.event('click', a, {detail: 1}); h.event('click', a, {detail: 0}); assert.equal(h.calls(), 1);
  h.flush(); h.event('click', a); assert.equal(h.calls(), 2);
});
test('capture-owned scene gestures also suppress only their associated compatibility click', () => {
  const h = inputHarness(); const a = h.control(); let sceneCalls = 0;
  h.capture('pointerdown', e => e.stopImmediatePropagation());
  h.capture('pointerup', e => {sceneCalls++; e.stopImmediatePropagation();});
  h.event('pointerdown', a); h.event('pointerup', h.svg); assert.equal(sceneCalls, 1);
  h.event('click', a); assert.equal(h.calls(), 0);
  const other = h.control('other'); h.event('click', other); assert.equal(h.calls(), 1);
  h.flush(); h.event('click', a); assert.equal(h.calls(), 2);
});
test('cancelled pointer ownership never blocks the next captured gesture', () => {
  for(const interruption of ['pointercancel', 'lostpointercapture']) {
    const h = inputHarness(); const a = h.control();
    h.capture('pointercancel', e => e.stopImmediatePropagation());
    h.event('pointerdown', a); h.event(interruption, h.svg); h.event('pointerup', h.svg); assert.equal(h.calls(), 0);
    h.event('pointerdown', a); h.event('pointerup', h.svg); h.event('click', a); assert.equal(h.calls(), 1);
  }
});
test('dragging a control does not become an assistive compatibility activation', () => {
  const h = inputHarness(); const a = h.control();
  h.event('pointerdown', a); h.event('pointermove', h.svg, {clientX: 40}); h.event('pointerup', h.svg, {clientX: 40}); h.event('click', a); assert.equal(h.calls(), 0);
  h.flush(); h.event('click', a); assert.equal(h.calls(), 1);
});
test('keyboard-generated click is deduplicated across a redraw without blocking another action', () => {
  const h = inputHarness(); const a = h.control(); h.event('keydown', a, {key: 'Enter'}); h.flush();
  h.controls.splice(0); const replacement = h.control(); const other = h.control('other');
  h.event('click', replacement); assert.equal(h.calls(), 1); h.event('click', other); assert.equal(h.calls(), 2);
  h.event('keyup', {tagName: 'BUTTON'}, {key: 'Enter'}); h.event('click', replacement); assert.equal(h.calls(), 2);
  h.flush(); h.event('click', replacement); assert.equal(h.calls(), 3);
});
test('Enter and Space repeat or generated click never double-activate; release permits next press', () => {
  for(const key of ['Enter', ' ']) {
    const h = inputHarness(); const a = h.control(); h.event('keydown', a, {key}); assert.equal(h.calls(), 1);
    h.flush(); h.event('keydown', a, {key, repeat: true}); h.event('click', a); assert.equal(h.calls(), 1);
    h.event('keyup', a, {key}); h.event('click', a); assert.equal(h.calls(), 1);
    h.flush(); h.event('click', a); assert.equal(h.calls(), 2);
    h.event('keydown', a, {key}); assert.equal(h.calls(), 3); h.event('keyup', a, {key});
  }
});
test('blur and hidden page clear keyboard ownership without leaving activation blocked', () => {
  for(const interrupt of ['global', 'hidden']) {
    const h = inputHarness(); const a = h.control(); h.event('keydown', a, {key: 'Enter'}); h[interrupt]('blur'); h.flush(); h.event('click', a); assert.equal(h.calls(), 2);
  }
});
test('positive and negative multi-turn camera targets take the shortest path', () => {
  for(const yaw of [765, -675, 805, -715, 4005, -3995]) {
    const h = inputHarness(); h.context.YAW = yaw; h.context.ui.camTo(45, 35); h.tick(.35);
    const expected = ((45 - yaw + 180) % 360 + 360) % 360 - 180;
    assert(Math.abs(h.context.YAW - (yaw + expected / 2)) < 1e-9, 'halfway from ' + yaw);
    h.tick(.35); assert(Math.abs(h.context.YAW - (yaw + expected)) < 1e-9, 'finish from ' + yaw);
  }
});
test('double-click reset and reset button both stop automatic rotation', () => {
  for(const reset of ['double', 'button']) {
    const h = inputHarness(); h.buttons.vspin.onclick(); h.tick(1);
    if(reset === 'double') h.event('dblclick', h.svg); else h.buttons.vreset.onclick();
    h.tick(1); assert.equal(h.context.YAW, 45, reset); h.tick(1); assert.equal(h.context.YAW, 45, reset); assert.equal(h.steps.length, 0, reset);
  }
});

const renderSource = text.slice(text.indexOf('  const layerNodes=new Map()'), text.indexOf('  // big numbers'));
function focusHarness({replacement = true, hidden = false, untabbable = false, cached = false, outside = false, second = false} = {}) {
  const body = {}, doc = {activeElement: null, documentElement: {style: {setProperty(){}}}, getElementById: () => ({})};
  let controls = [];
  const svg = {dataset: {}, focus(){doc.activeElement = this;}};
  function node(act = 'sample') { return {dataset: {act}, attrs: {tabindex: '0'}, isConnected: true, closest(selector){return selector.includes('data-act') ? this : this.attrs['aria-hidden'] === 'true' ? this : null;}, getAttribute(k){return this.attrs[k] ?? null;}, focus(){doc.activeElement = this;}}; }
  const first = node(), original = second ? node() : first; controls = second ? [first, original] : [original];
  const art = {contains: el => controls.includes(el), querySelectorAll: () => controls, set innerHTML(value){
    const hadFocus = controls.includes(doc.activeElement); controls.forEach(c => c.isConnected = false);
    controls = replacement ? (second ? [node(), node()] : [node()]) : []; if(hadFocus) doc.activeElement = body;
  }};
  const ui = {updateActionMetadata(){if(hidden) controls.forEach(c => c.attrs['aria-hidden'] = 'true'); if(untabbable) controls.forEach(c => c.attrs.tabindex = '-1');}};
  const scene = () => ''; if(cached) scene.layers = [];
  const ctx = {ui, art, svg, document: doc, st: {pal: 'mint'}, cfg: {scene}, readout: {}, PALS: {mint: {l: '#93d3b0'}}, INK_K: 1, _clipN: 0, inkScale: x => x, performance: {now: () => 0}, audio: null};
  doc.activeElement = outside ? body : original;
  vm.runInNewContext(renderSource, ctx); ui.render();
  return {doc, svg, body, original, controls};
}
test('redraw restores the same logical action and duplicate-action index', () => {
  for(const second of [false, true]) {const h = focusHarness({second}); assert.equal(h.doc.activeElement, h.controls[second ? 1 : 0]);}
});
test('disappearing action returns focus to model instead of document body', () => {
  const h = focusHarness({replacement: false}); assert.equal(h.doc.activeElement, h.svg);
});
test('hidden replacement and cached hidden control both fall back to model', () => {
  for(const cached of [false, true]) {const h = focusHarness({hidden: true, cached}); assert.equal(h.doc.activeElement, h.svg);}
});
test('disabled tab stops on replacement or cached controls fall back to model', () => {
  for(const cached of [false, true]) {const h = focusHarness({untabbable: true, cached}); assert.equal(h.doc.activeElement, h.svg);}
});
test('animation never steals focus from outside the model', () => {
  const h = focusHarness({outside: true}); assert.equal(h.doc.activeElement, h.body);
});
const passed = results.filter(r => r.ok).length;
for(const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.error ? ': ' + r.error : ''}`);
console.log(`${passed}/${results.length} source-event regressions passed. Mock DOM/events, not a real browser or screen-reader result.`);
if(passed !== results.length) process.exitCode = 1;
