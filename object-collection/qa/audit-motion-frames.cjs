'use strict';
// Usage: node qa/audit-motion-frames.cjs [--quick] [--scenario=coffee-milk]
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {ROOT, HZ, CASES, replay, seek, stateJSON} = require('./motion-frame-fixture.cjs');
const {inspectMusic, runPointerChecks} = require('./motion-contact-invariants.cjs');
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const selected = process.argv.find(x => x.startsWith('--scenario='))?.split('=')[1];
const names = selected ? [selected] : Object.keys(CASES);
const quick = process.argv.includes('--quick');
const views = [{yaw: 45, pitch: 35}, {yaw: 135, pitch: 6}, {yaw: 225, pitch: 35}, {yaw: 315, pitch: 78}];
const out = path.resolve(process.env.MOTION_FRAME_OUT || path.join(__dirname, quick ? 'motion-frames-quick' : 'motion-frames'));
fs.mkdirSync(out, {recursive: true});
let checks = 0;
function shuffled(items) {let seed = 23711; const a = [...items]; for (let i = a.length - 1; i > 0; i--) {seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const j = seed % (i + 1); [a[i], a[j]] = [a[j], a[i]];} return a;}
const report = {schema: 1, clockHz: HZ, intervalSeconds: .1, raster: !quick, source: Object.fromEntries(['core.js', 'scenes/coffee.js', 'scenes/toaster.js', 'scenes/musicbox.js'].map(p => [p, hash(fs.readFileSync(path.join(ROOT, 'dist', p)))])), method: 'Actual production actions in isolated VM, fixed-step replay from initial state. No dynamic mechanism state patches; palette/light are fixed for image comparisons. Random-order seek is compared against continuous sequential replay.', limitations: 'Fixed-step consistency is not arbitrary-dt invariance. Pixel flags are not defects. Offline renders do not substitute for normal-speed browser observation. Music contact is an approximate model, not a collision simulation. Mock audio events are not an audition.', scenarios: []};
function contactReadings(name, s) {
  if (name === 'coffee-milk') return {phase: s.phase, actionSeconds: s.t, milkProgress: s.milkT, milkAmount: s.milk, coffeeAmount: s.fill, streamVisible: s.phase === 'milk' && s.milkT >= .25 && s.milkT <= .75, note: 'Production pour gate: active from 25% through 75% of the three-second demonstration; cup amount is not a real millilitre measurement.'};
  if (name === 'toaster-pop') return {phase: s.phase, actionSeconds: s.t, heaterOn: s.phase === 'heating', carrierDepression: s.lever, springLift: s.lift, sliceBottom: 31 - 20 * s.lever + s.lift, slotPlane: 46.7, note: 'Visible slice faces are clipped at the production slot plane; this is a timed spring illustration, not a rigid-body solve.'};
  return {angle: s.angle, notes: s.notes, lastTooth: s.lastTooth, direction: s.direction, energy: s.energy, note: 'Released pin events accumulate along the path, not solely from the final angle.'};
}
(async () => {
const output = quick ? null : require('./motion-frame-output.cjs');
report.musicPointerChecks = runPointerChecks();
let contactChecks = 0;
for (const name of names) {
  const spec = CASES[name]; assert.ok(spec, 'known scenario');
  const times = Array.from({length: Math.round(spec.duration * 10) + 1}, (_, i) => i / 10);
  const sequential = replay(name), snapshots = new Map(), frames = [];
  let previousContact;
  for (const t of times) {
    const f = sequential.advanceTo(t), state = stateJSON(f), svg = views.map(v => f.render(v.yaw, v.pitch));
    assert.equal(stateJSON(f), state, 'render does not mutate scene state'); checks++;
    const contacts = name === 'musicbox-contact' ? inspectMusic(f, previousContact) : contactReadings(name, f.state);
    if (name === 'musicbox-contact') {contactChecks += contacts.checks; previousContact = contacts;}
    snapshots.set(t, {state, svg}); frames.push({time: t, phase: f.state.phase || 'crank', stateHash: hash(state), svgHashes: svg.map(hash), contacts});
  }
  for (const t of shuffled(times)) {
    const f = seek(name, t), expected = snapshots.get(t);
    assert.equal(stateJSON(f), expected.state, name + ' shuffled seek state @' + t); checks++;
    for (const [i, v] of views.entries()) {assert.equal(f.render(v.yaw, v.pitch), expected.svg[i], name + ' shuffled seek SVG @' + t); checks++;}
  }
  const raster = [];
  if (!quick) for (const [i, v] of views.entries()) raster.push(await output.writeSequence(out, name, v, times, snapshots, i));
  report.scenarios.push({name, durationSeconds: spec.duration, sampleCount: times.length, views, frames, raster});
}
report.checks = checks; report.contactChecks = contactChecks; report.determinismPassed = true; report.visualReviewRequired = true;
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
if (!quick) output.writeGallery(out, report);
console.log(JSON.stringify({passed: true, checks, scenarios: report.scenarios.map(x => ({name: x.name, samples: x.sampleCount, views: x.views.length, suspects: x.raster.flatMap(r => r.suspects.map(d => ({view: r.view, from: d.from, to: d.to, ratio: d.relativeToMedian})))}))}, null, 2));
})().catch(error => {console.error(error); process.exitCode = 1;});
