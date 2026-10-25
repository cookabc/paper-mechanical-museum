'use strict';
// Run source-executed QA in an isolated temporary copy. Never changes product files.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const suite = (repo, file, ...argv) => ({ file: `${repo}/qa/${file}.cjs`, argv });
const m = (name, ...a) => suite('object-collection', name, ...a);
const w = (name, ...a) => suite('washer-study', name, ...a);
const f = (name, ...a) => suite('fan-study', name, ...a);
const c = (name, ...a) => suite('claw-studio', name, ...a);
const fast = [
  m('audit-core-input-accessibility'), m('audit-mechanical-audio'), m('audit-process-audio'),
  m('audit-food-observation'), m('audit-coffee-process'), m('audit-coffee-step-guide'),
  m('audit-instrument-camera-observation'), m('audit-lesson-focus'),
  m('audit-elevator-dynamic-order'), m('audit-elevator-integrated-visibility'),
  m('audit-elevator-interaction'), m('audit-elevator-occlusion'), m('audit-elevator-time'),
  m('audit-elevator-traction'), w('audit-scene-input'),
  f('dynamic-audit-d98afd3/lifecycle-regression'), f('dynamic-audit-d98afd3/full-oscillation-regression'),
  c('source-integrity'), c('input-regression'), c('controller-regression')
];
const extended = [
  m('audit-camera-lesson'), m('audit-camera-paper-path'), m('audit-elevator-interlock-lesson'),
  m('audit-instrument-lessons'), m('audit-instrument-structural-regression'),
  m('audit-toaster-cut-ink', '--no-png'), m('audit-toaster-lesson'),
  m('audit-vending-jam'), m('audit-vending-lesson'), m('review-process-invariants'),
  w('audit-dynamic-legacy'), w('audit-dynamic-transfer'),
  w('audit-structural-sequences'), w('audit-principle-guide'), f('audit-principle-guide'),
  f('audit-time-integration'), f('audit-time-input-audio'), f('dynamic-audit-d98afd3/dense-regression'),
  c('audit-claw-time'), c('audit-claw-audio-time'), c('audit-claw-lesson')
];
const benchmarks = [m('benchmark-lesson-observer'), m('instrument-dynamic-v11/benchmark'),
  w('benchmark-principle-guides'), f('dynamic-audit-d98afd3/performance-regression')];
const raster = [m('instrument-dynamic-v11/regression'), m('audit-mechanics-four', 'snapshots', 'portable')];
// Preserve old assertions explicitly; these historical checks are known to fail
// against deliberately revised controllers/observer semantics. Never call them a current PASS.
const legacy = [m('audit-food-dynamic-v10', '--before', '--snapshots-only'),
  m('audit-food-dynamic-v10', '--snapshots-only'), m('audit-food-dynamic-regression'),
  m('audit-mechanics-four'), m('review-six-lessons'), m('audit-motion-frames', '--quick')];
const only = process.argv.find(a => a.startsWith('--suite='))?.slice(8);
let selected = args.has('--legacy') ? legacy : args.has('--benchmark') ? benchmarks : args.has('--raster') ? raster : args.has('--extended') ? [...fast, ...extended] : fast;
if (only) {
  if (!/^(object-collection|washer-study|fan-study|claw-studio)\/qa\/[\w/-]+\.cjs$/.test(only)) throw new Error('Use --suite=project/qa/test.cjs');
  selected = (args.has('--raster') ? raster : [...fast, ...extended, ...benchmarks, ...legacy]).filter(x => x.file === only);
  if (!selected.length) throw new Error('Suite is not in the documented runner list; run standalone authoring tools directly if needed.');
}
if (args.has('--list')) { console.log(selected.map(s => [s.file, ...s.argv].join(' ')).join('\n')); process.exit(0); }
if (args.has('--extended') || args.has('--benchmark') || args.has('--legacy')) {
  try { require.resolve('jsdom', { paths: [root] }); }
  catch { console.error('Extended DOM tests require the declared dev dependency. Run npm ci once, then rerun offline. No browser installation is required.'); process.exit(1); }
}
if (args.has('--raster')) {
  try { require.resolve('sharp', { paths: [root] }); }
  catch { console.error('Optional raster tests require Sharp. Install the declared optional peer: npm install --no-save sharp@0.33.5'); process.exit(1); }
}
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'paper-mechanical-qa-'));
let failed = 0;
try {
  for (const repo of ['object-collection', 'washer-study', 'fan-study', 'claw-studio']) {
    for (const dir of ['dist', 'qa']) fs.cpSync(path.join(root, repo, dir), path.join(work, repo, dir), { recursive: true });
  }
  fs.cpSync(path.join(root, 'licenses'), path.join(work, 'licenses'), { recursive: true });
  if (fs.existsSync(path.join(root, 'node_modules'))) fs.symlinkSync(path.join(root, 'node_modules'), path.join(work, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  const cleanEnv = { ...process.env };
  // Historical /tmp overrides or another checkout must never silently select test inputs.
  for (const name of ['COFFEE_BASELINE', 'CORE_SOURCE', 'FOOD_DYNAMIC_OUT_DIR', 'MOTION_FRAME_OUT', 'FAN_REV', 'FAN_SOURCE', 'OUTPUT_DIR']) delete cleanEnv[name];
  const started = Date.now();
  for (const [index, entry] of selected.entries()) {
    const result = spawnSync(process.execPath, [path.join(work, entry.file), ...entry.argv], {
      cwd: work, env: cleanEnv, encoding: 'utf8', maxBuffer: 24 * 1024 * 1024
    });
    const pass = !result.error && !result.signal && result.status === 0;
    console.log(`${pass ? 'PASS' : 'FAIL'} ${index + 1}/${selected.length} ${entry.file}${entry.argv.length ? ' ' + entry.argv.join(' ') : ''}`);
    if (!pass || args.has('--verbose')) {
      const output = (result.stdout || '') + (result.stderr || '');
      process.stdout.write(output.length > 40000 && !args.has('--verbose') ? output.slice(0, 20000) + '\n[Long failure output abbreviated; add --verbose for all output.]\n' + output.slice(-20000) : output);
      if (output && !output.endsWith('\n')) process.stdout.write('\n');
    }
    if (result.error) console.error(result.error.message);
    if (!pass) failed++;
  }
  console.log(`SUITES: ${selected.length - failed} passed, ${failed} failed (${((Date.now() - started) / 1000).toFixed(1)}s).`);
  console.log('Scope: deterministic production-source, DOM-double/JSDOM, SVG and mocked-audio checks; not native browser layout, real audio or deployment certification.');
  if (args.has('--keep-output')) {
    const output = path.join(root, 'qa-output', new Date().toISOString().replace(/[:.]/g, '-'));
    fs.mkdirSync(path.dirname(output), { recursive: true });
    // node_modules is not part of any generated evidence.
    fs.rmSync(path.join(work, 'node_modules'), { recursive: true, force: true });
    fs.cpSync(work, output, { recursive: true });
    console.log('Generated output retained at ' + path.relative(root, output));
  }
} finally { fs.rmSync(work, { recursive: true, force: true }); }
if (failed) process.exitCode = 1;
