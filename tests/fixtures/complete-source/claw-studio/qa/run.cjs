'use strict';

const { spawnSync } = require('./portable-baseline.cjs');
const path = require('node:path');
const suites = ['source-integrity.cjs', 'input-regression.cjs', 'controller-regression.cjs'];
let failed = 0;
for (const suite of suites) {
  const result = spawnSync(process.execPath, [path.join(__dirname, suite)], { stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.error || result.signal || result.status !== 0) failed++;
}
console.log(`SUITES: ${suites.length - failed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
