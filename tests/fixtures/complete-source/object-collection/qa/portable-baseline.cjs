'use strict';
// Compatibility adapter for the original read-only `git show` test fixtures.
// Other child_process methods are unchanged. No Git executable or history is used.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const childProcess = require('node:child_process');
function execFileSync(command, args = [], options = {}) {
  if (command !== 'git') return childProcess.execFileSync(command, args, options);
  const tokens = [...args];
  let repo = path.resolve(options.cwd || process.cwd());
  if (tokens[0] === '-C') { repo = path.resolve(tokens[1]); tokens.splice(0, 2); }
  if (tokens.length !== 2 || tokens[0] !== 'show') throw new Error('Portable QA supports only the original read-only git show fixture requests.');
  const separator = tokens[1].indexOf(':');
  const ref = tokens[1].slice(0, separator), file = tokens[1].slice(separator + 1);
  const folder = path.join(repo, 'qa/baselines');
  const manifest = JSON.parse(fs.readFileSync(path.join(folder, 'manifest.json'), 'utf8'));
  const matching = Object.values(manifest.revisions).filter(r => ref !== 'HEAD' && r.commit.startsWith(ref));
  const revision = manifest.revisions[ref] || matching[0];
  if (!revision || !Object.hasOwn(revision.files, file)) throw new Error(`Historical fixture is not bundled: ${path.basename(repo)} ${ref}:${file}. Use one of the bundled revisions listed in qa/baselines/manifest.json.`);
  const bytes = fs.readFileSync(path.join(folder, revision.commit, file));
  const actual = crypto.createHash('sha256').update(bytes).digest('hex');
  if (actual !== revision.files[file].sha256) throw new Error(`Historical fixture integrity mismatch: ${ref}:${file}`);
  return options.encoding && options.encoding !== 'buffer' ? bytes.toString(options.encoding) : bytes;
}
module.exports = { ...childProcess, execFileSync };
