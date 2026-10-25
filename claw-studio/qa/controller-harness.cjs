'use strict';

// Execute the real app controller/state and core easing in a Node VM. The
// optional core mode also executes the production RAF driver. No DOM renderer,
// sound synthesis, browser event defaults or guide markup is simulated here.
const vm = require('node:vm');
const { source, section, declaration } = require('./source.cjs');

function fixture({ core = false, lesson = false } = {}) {
  let now = 0, serial = 0;
  const directSteps = new Set(), raf = new Map(), events = new Map();
  const messages = [], pulses = [];
  const document = {
    hidden: false,
    addEventListener(name, fn) {
      if (!events.has(name)) events.set(name, []);
      events.get(name).push(fn);
    }
  };
  const ui = {
    metrics: { averageMs: 0 },
    render() {}, invalidate() {}, clearFeedback() {},
    feedback(message) { messages.push(message); },
    flash(message) { messages.push(message); },
    animate(fn) { directSteps.add(fn); }
  };
  const c = {
    console, Math, Number, ui, document, smoothMotion: true,
    performance: { now: () => now },
    art: { setAttribute() {} },
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame(fn) { const id = ++serial; raf.set(id, fn); return id; },
    cancelAnimationFrame(id) { raf.delete(id); },
    MechanicalAudio: { pulse(name) { pulses.push(name); }, reset() {} },
    releaseControls() { run('st.moving=false'); },
    updateExtrasOverflow() {}
  };
  c.window = c;
  vm.createContext(c);
  const run = code => vm.runInContext(code, c);
  const index = source('index.html'), app = source('app.js');
  run(declaration(index, 'const ease ='));
  run(section(app, '/* Real volumetric geometry', 'const ui=mountFigure'));
  if (core) run(section(index, '  const steps=new Set();', '  // Orbit by dragging;'));
  if (lesson) {
    run(declaration(app, 'const phaseLabels='));
    run(section(app, 'function readClawObservation(){', 'clawObservation=window.MuseumObservation'));
    run(section(app, 'let clawLessonEnabled=false;', 'const clawLesson='));
  }
  const s = run('st'), steps = core ? run('steps') : directSteps;
  const f = {
    c, ui, s, steps, pulses, messages, run,
    get pending() { return core ? raf.size : steps.size; },
    frame(dt = .04) {
      // Direct mode forwards even invalid dt unchanged to test controller guards.
      if (Number.isFinite(dt) && dt >= 0) now += dt * 1000;
      if (core) {
        const callbacks = [...raf.values()]; raf.clear();
        for (const fn of callbacks) fn(now);
      } else {
        for (const fn of [...steps]) if (fn(dt) === false) steps.delete(fn);
      }
    },
    finish(limit = 1500) {
      let frames = 0;
      while (this.pending && frames++ < limit) this.frame();
      if (this.pending) throw new Error('Animation did not settle');
    },
    action(name, ...args) {
      c.__args = args;
      run(name + '(st,...__args,ui)');
    },
    hidden(value) {
      document.hidden = value;
      for (const fn of events.get('visibilitychange') || []) fn();
    },
    snapshot() { return JSON.parse(run('JSON.stringify(st)')); },
    close() { steps.clear(); raf.clear(); }
  };
  return f;
}

module.exports = { fixture };
