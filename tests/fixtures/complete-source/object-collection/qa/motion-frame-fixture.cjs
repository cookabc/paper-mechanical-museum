'use strict';
// Offline-only adapter around the production scene actions. No dynamic mechanism state patching; palette/light are fixed for comparisons.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const HZ = 600;
const DT = 1 / HZ;

function createFixture(id) {
  const callbacks = new Map(), listeners = {}, audioEvents = [], oscillators = [];
  let frame = 0;
  const audioContext = {
    state: 'running', currentTime: 0,
    createOscillator() {
      const o = {frequency: {value: 0}, stopAt: Infinity, ended: false,
        connect() {}, disconnect() {},
        start() {audioEvents.push({frame, frequency: o.frequency.value});},
        stop(at = audioContext.currentTime) {o.stopAt = at;}};
      oscillators.push(o); return o;
    },
    createGain() {return {gain: {setValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelAndHoldAtTime() {}}, connect() {}, disconnect() {}};}
  };
  const svg = {addEventListener(type, fn) {(listeners[type] ??= []).push(fn);},
    captured: new Set(), setPointerCapture(n) {this.captured.add(n);},
    releasePointerCapture(n) {this.captured.delete(n);}, hasPointerCapture(n) {return this.captured.has(n);},
    createSVGPoint() {return {x: 0, y: 0, matrixTransform() {return {x: this.x, y: this.y};}};},
    getScreenCTM() {return {inverse() {return {};}};}};
  const c = {console, Math, Number, document: {hidden: false, getElementById: () => svg, addEventListener() {}},
    addEventListener() {}, MechanicalAudio: {enabled: true, getContext: () => audioContext, getOutput: () => ({}), pulse() {}, onChange() {}}};
  c.window = c; vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'dist/core.js'), 'utf8'), c);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'dist/scenes', id + '.js'), 'utf8'), c);
  const cfg = c.SCENES[id](), state = cfg.state;
  state.pal = 'mint'; state.az = 105;
  const ui = {animate(fn, options = {}) {callbacks.set(fn, options);}, invalidate() {}, flash() {}};
  cfg.setup?.(ui);
  function tick() {
    frame++; audioContext.currentTime = frame * DT;
    for (const o of oscillators) if (!o.ended && o.stopAt <= audioContext.currentTime) {o.ended = true; o.onended?.();}
    for (const [fn] of [...callbacks]) if (fn(DT) === false) callbacks.delete(fn);
  }
  const f = {id, cfg, state, callbacks, audioEvents, c,
    act(key) {assert.equal(typeof cfg.acts[key], 'function', 'real action ' + key); cfg.acts[key](state, {}, ui);},
    pointer(type, angle, pointerId = 1) {
      c.pointerA = angle;
      const [clientX, clientY] = vm.runInContext('setCam(45,35);P(72,27+Math.cos(pointerA)*11,25+Math.sin(pointerA)*11)', c);
      const event = {button: 0, isPrimary: true, pointerId, clientX, clientY, timeStamp: frame * DT * 1000,
        target: {closest: selector => selector === '[data-act="crank"]' ? {} : null}, preventDefault() {}, stopImmediatePropagation() {}};
      for (const fn of listeners[type] || []) fn(event);
    },
    until(test, limit = 30) {let n = 0; while (!test(state) && n++ < limit * HZ) tick(); assert.ok(test(state), id + ' setup did not reach state');},
    finish() {this.until(() => callbacks.size === 0);},
    step: tick,
    get frame() {return frame;},
    render(yaw, pitch) {
      c.cfg = cfg; c.yaw = yaw; c.pitch = pitch;
      const inner = vm.runInContext(`{const [W,D,H]=cfg.size;RC=[W/2,D/2];RCZ=H/2;OX=150;OY=155;INK_K=.5;setCam(yaw,pitch);setLight(105);const out=cfg.scene(cfg.state,PALS.mint);cfg.scene.layers?cfg.scene.layers.map(p=>p.svg).join(''):out;}`, c);
      assert.ok(inner.length > 200 && !/NaN|Infinity|undefined/.test(inner), 'finite production SVG');
      return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="750" viewBox="0 0 300 250"><rect width="300" height="250" fill="#f2efe7"/>${inner}</svg>`;
    }
  };
  return f;
}

const CASES = {
  'coffee-milk': {id: 'coffee', duration: 3.2, setup(f) {
    for (const key of ['beans', 'grind', 'filter', 'cup', 'brew']) {f.act(key); f.finish();}
    assert.equal(f.state.phase, 'ready'); assert.equal(f.state.fill, 1); f.act('milk');
  }, events: []},
  'toaster-pop': {id: 'toaster', duration: 1.2, setup(f) {
    f.act('load'); f.finish(); f.act('start'); f.until(s => s.phase === 'popping');
    assert.equal(f.state.progress, 1);
  }, events: []},
  'musicbox-contact': {id: 'musicbox', duration: 1.5, setup(f) {f.act('crank');},
    events: [{frame: 120, action: 'crank'}, {frame: 240, action: 'crank'}]}
};

function replay(name) {
  const spec = CASES[name]; assert.ok(spec, 'known scenario');
  const f = createFixture(spec.id); spec.setup(f);
  const origin = f.frame; let localFrame = 0, eventIndex = 0;
  return {f, origin, advanceTo(seconds) {
    const target = Math.round(seconds * HZ);
    assert.ok(Math.abs(target / HZ - seconds) < 1e-9, 'sample lies on fixed clock');
    assert.ok(target >= localFrame, 'sequential runner cannot seek backward');
    while (localFrame < target) {
      f.step(); localFrame++;
      while (eventIndex < spec.events.length && spec.events[eventIndex].frame === localFrame) f.act(spec.events[eventIndex++].action);
    }
    return f;
  }};
}
function seek(name, seconds) {return replay(name).advanceTo(seconds);}
function stateJSON(f) {return JSON.stringify(f.state);}
module.exports = {ROOT, HZ, DT, CASES, createFixture, replay, seek, stateJSON};
