'use strict';
// Offline observations of production geometry and real pointer/action paths.
// These are shared-phase invariants, NOT a collision or acoustic realism test.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {createFixture, HZ} = require('./motion-frame-fixture.cjs');

const TAU = Math.PI * 2;
const CONTACT = Math.atan2(-5.25, 5.5);
const HALF = .11;
const EPS = 1e-8;
const MODEL = 'Approximate phase-window contact; not exact solid collision. Audio starts may be suppressed by mute, visibility, context state or the eight-voice budget.';
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const pins = Array.from({length: 12}, (_, tooth) => Array.from({length: 3}, (_, pin) => ({
  tooth, pin, x: 20 + tooth * 2.15, offset: pin * TAU / 3 + tooth * .79
}))).flat();

function releaseEvents(from, to) {
  const direction = Math.sign(to - from), events = [];
  if (!direction) return events;
  // Enumerate release planes, then independently filter the directed interval.
  // Forward: (from, to]. Reverse: [to, from). No start-point duplicate.
  for (const pin of pins) {
    const base = CONTACT + direction * HALF - pin.offset;
    const lo = Math.floor((Math.min(from, to) - base) / TAU) - 1;
    const hi = Math.ceil((Math.max(from, to) - base) / TAU) + 1;
    for (let cycle = lo; cycle <= hi; cycle++) {
      const at = base + cycle * TAU;
      if (direction > 0 ? at > from && at <= to : at >= to && at < from) {
        events.push({at, tooth: pin.tooth, pin: pin.pin, midi: 72 + pin.tooth});
      }
    }
  }
  return events.sort((a, b) => (a.at - b.at) * direction);
}

function modelAt(angle) {
  const physicalPins = pins.map(pin => {
    const phase = angle + pin.offset;
    const point = radius => [pin.x, 27 + radius * Math.cos(phase), 25 + radius * Math.sin(phase)];
    return {...pin, phase, normal: [0, Math.cos(phase), Math.sin(phase)], start: point(6.8), end: point(7.6)};
  });
  const teeth = Array.from({length: 12}, (_, tooth) => {
    const nearest = physicalPins.filter(pin => pin.tooth === tooth).map(pin => ({pin: pin.pin, phase: wrap(pin.phase - CONTACT)}))
      .reduce((a, b) => Math.abs(a.phase) <= Math.abs(b.phase) ? a : b);
    const deflection = Math.abs(nearest.phase) < HALF ? .35 * Math.cos(nearest.phase / HALF * Math.PI / 2) : 0;
    return {tooth, x: 20 + tooth * 2.15, ...nearest, deflection};
  });
  return {pins: physicalPins, teeth};
}

function inspectMusic(f, previous) {
  assert.equal(f.id, 'musicbox', 'contact observer needs the musicbox production fixture');
  let checks = 0;
  const ok = (value, label) => {assert.ok(value, label); checks++;};
  const near = (a, b, label) => ok(Math.abs(a - b) <= EPS, label + ': ' + a + ' ~= ' + b);
  const pointNear = (a, b, label) => a.forEach((value, i) => near(value, b[i], label + '[' + i + ']'));
  const before = JSON.stringify(f.state), model = modelAt(f.state.angle);
  // Temporarily wrap drawing helpers, never state, source files or action logic.
  vm.runInContext(`globalThis.__motionGeometry = {pins: [], teeth: []};
    globalThis.__motionOriginal = {rod, loft};
    rod = (...args) => {
      const [a,b,r] = args;
      if (r === .35 && a[0] === b[0] && Math.abs(Math.hypot(a[1]-27,a[2]-25)-6.8) < 1e-8)
        __motionGeometry.pins.push({start:a.slice(),end:b.slice(),radius:r});
      return __motionOriginal.rod(...args);
    };
    loft = (...args) => {
      const [a,b] = args;
      if (a.length === 4 && b.length === 4 && a.every(p=>p[1]===32.5) && b.every(p=>p[1]===42))
        __motionGeometry.teeth.push({tip:a.map(p=>p.slice()),root:b.map(p=>p.slice())});
      return __motionOriginal.loft(...args);
    };`, f.c);
  let geometry, expectedVisible;
  try {
    f.render(45, 35);
    geometry = JSON.parse(JSON.stringify(f.c.__motionGeometry));
    expectedVisible = vm.runInContext(JSON.stringify(model.pins.map(pin => pin.normal)) + '.map(n=>vis(n))', f.c);
  } finally {
    vm.runInContext('rod=__motionOriginal.rod;loft=__motionOriginal.loft;delete globalThis.__motionOriginal;delete globalThis.__motionGeometry;', f.c);
  }
  ok(JSON.stringify(f.state) === before, 'read-only geometry inspection does not change scene state');
  ok(geometry.teeth.length === 12, 'all twelve production tooth lofts observed');
  for (const tooth of model.teeth) {
    const actual = geometry.teeth[tooth.tooth], x = tooth.x - .55, v = tooth.deflection;
    const tip = [[x,32.5,19+v],[x+1.1,32.5,19+v],[x+1.1,32.5,20+v],[x,32.5,20+v]];
    const root = [[x,42,19],[x+1.1,42,19],[x+1.1,42,20],[x,42,20]];
    tip.forEach((point, i) => pointNear(actual.tip[i], point, 'tooth ' + tooth.tooth + ' moving tip'));
    root.forEach((point, i) => pointNear(actual.root[i], point, 'tooth ' + tooth.tooth + ' fixed root'));
  }
  const visiblePins = model.pins.filter((_, i) => expectedVisible[i]);
  ok(geometry.pins.length === visiblePins.length, 'visible production pins match camera-facing phase count');
  const remaining = geometry.pins.slice();
  for (const pin of visiblePins) {
    const at = remaining.findIndex(actual => actual.start.every((value, i) => Math.abs(value - pin.start[i]) <= EPS));
    ok(at >= 0, 'visible pin belongs to its phase-aligned tooth ' + pin.tooth + '/' + pin.pin);
    const actual = remaining.splice(at, 1)[0];
    pointNear(actual.start, pin.start, 'pin root'); pointNear(actual.end, pin.end, 'pin tip');
    near(actual.radius, .35, 'pin radius');
  }
  const touching = model.teeth.find(tooth => Math.abs(tooth.phase) < HALF);
  const observation = f.cfg.observation.read(f.state);
  if (touching) ok(observation.active.includes('music-tooth-' + touching.tooth), 'observation highlights first actual in-window tooth');
  ok(f.cfg.observation.intro.includes('并非精确碰撞模拟'), 'approximate contact is disclosed in the product');

  let interval = {verified: false, reason: 'No previous observation; event counts are path-dependent.'};
  if (previous) {
    const delta = f.state.angle - previous.angle, travel = f.state.travel - previous.travel;
    if (travel >= -EPS && Math.abs(travel - Math.abs(delta)) <= EPS && f.state.notes >= previous.notes) {
      const events = releaseEvents(previous.angle, f.state.angle);
      ok(f.state.notes - previous.notes === events.length, 'notes equal directed release-plane crossings');
      if (events.length) ok(f.state.lastTooth === events.at(-1).tooth, 'last tooth follows actual directional release order');
      else ok(f.state.lastTooth === previous.lastTooth, 'no release leaves last tooth unchanged');
      if (delta) ok(f.state.direction === Math.sign(delta), 'recorded direction follows actual motion');
      const sounds = f.audioEvents.slice(previous.audioStarts);
      ok(sounds.length <= events.length, 'voice starts cannot outnumber actual release events');
      // A full voice budget can suppress notes. Started pitches must be an ordered
      // subsequence, not an equality between oscillator count and pluck count.
      let cursor = 0;
      for (const sound of sounds) {
        while (cursor < events.length && Math.abs(sound.frequency - 440 * 2 ** ((events[cursor].midi - 69) / 12)) > EPS) cursor++;
        ok(cursor < events.length, 'audible pitch belongs to the ordered released-tooth sequence'); cursor++;
      }
      interval = {verified: true, from: previous.angle, to: f.state.angle, events, audioStarts: sounds.length};
    } else interval = {verified: false, reason: 'This interval includes a reversal or reset; inspect each monotonic action separately.'};
  }
  return {frame: f.frame, angle: f.state.angle, travel: f.state.travel, notes: f.state.notes,
    lastTooth: f.state.lastTooth, direction: f.state.direction, audioStarts: f.audioEvents.length,
    model: MODEL, contactAngle: CONTACT, halfWindow: HALF, teeth: model.teeth,
    visiblePins: visiblePins.length, geometryChecked: true, interval, checks};
}

function runPointerChecks() {
  let assertions = 0; const paths = [];
  const inspect = (f, previous) => {const result = inspectMusic(f, previous); assertions += result.checks; return result;};
  const ok = (value, label) => {assert.ok(value, label); assertions++;};
  for (const direction of [1, -1]) {
    const f = createFixture('musicbox'); let previous = inspect(f);
    f.pointer('pointerdown', 0);
    for (let i = 1; i <= 8; i++) {
      f.step(); const target = direction * i * TAU / 8;
      f.pointer('pointermove', target);
      ok(Math.abs(f.state.angle - target) < EPS, 'real circular drag reaches intended phase');
      previous = inspect(f, previous);
    }
    ok(f.state.notes === 36, 'each direction releases all 36 pins exactly once per revolution');
    f.pointer('pointercancel', f.state.angle); const stopped = inspect(f, previous);
    for (let i = 0; i < HZ; i++) f.step();
    previous = inspect(f, stopped);
    ok(!f.state.crankHeld && f.state.energy === 0, 'cancelled drag remains stopped');
    paths.push({name: direction > 0 ? 'forward-one-turn' : 'reverse-one-turn', angle: previous.angle, notes: previous.notes, audioStarts: previous.audioStarts});
  }
  // Tooth 6's crank phase has enough projected travel for the real two-pixel
  // gesture threshold. Both interior points stay inside its .22-radian window.
  const center = CONTACT - 6 * .79 + TAU;
  {
    const f = createFixture('musicbox'); let previous = inspect(f);
    f.pointer('pointerdown', 0);
    for (const [name, target, expectedReleases] of [
      ['enter-window', center-.10, 0], ['within-window', center+.10, 0],
      ['reverse-within-window', center-.10, 0], ['leave-window-in-reverse', center-.36, 1]
    ]) {
      f.step(); f.pointer('pointermove', target);
      ok(Math.abs(f.state.angle-target) < EPS, name + ' is accepted by the actual pointer threshold');
      previous = inspect(f, previous);
      ok(previous.interval.events.filter(event => event.tooth === 6).length === expectedReleases, name + ' only plucks tooth 6 when leaving contact');
      paths.push({name, angle: previous.angle, tooth6Deflection: previous.teeth[6].deflection, tooth6Releases: expectedReleases});
      if (name === 'reverse-within-window') {
        const held = previous; for (let i = 0; i < HZ; i++) f.step();
        previous = inspect(f, held); ok(previous.notes === held.notes, 'holding a flexed tooth creates no autonomous pluck');
      }
    }
    f.pointer('pointercancel', f.state.angle);
  }
  for (const side of [-1, 1]) {
    const f = createFixture('musicbox'), initial = inspect(f), target = center + HALF + side * 1e-5;
    f.pointer('pointerdown', 0); f.step(); f.pointer('pointermove', target);
    const result = inspect(f, initial), releases = result.interval.events.filter(event => event.tooth === 6);
    ok(releases.length === (side > 0 ? 1 : 0), 'forward boundary before/after has exactly one release crossing');
    ok(side < 0 ? result.teeth[6].deflection > 0 : result.teeth[6].deflection === 0, 'release boundary ends the preset deflection window');
    paths.push({name: side < 0 ? 'before-release-boundary' : 'after-release-boundary', angle: result.angle, tooth6Releases: releases.length});
    f.pointer('pointercancel', f.state.angle);
  }
  return {passed: true, assertions, model: MODEL, paths};
}

module.exports = {inspectMusic, releaseEvents, modelAt, runPointerChecks, CONTACT, HALF};
if (require.main === module) {
  const report = runPointerChecks();
  console.log('PASS ' + report.assertions + ' phase/geometry/pointer checks. ' + MODEL);
  console.log(JSON.stringify(report, null, 2));
}
