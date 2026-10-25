// Native Node module: preserve file: import.meta URLs used by the source comparison.
import {it,expect} from 'vitest';
import {execFileSync} from 'node:child_process';
it('preserves original fan geometry, simulation and native input behavior',()=>{
 const output=execFileSync(process.execPath,['src/exhibits/fan/regression.mjs'],{cwd:process.cwd(),encoding:'utf8'});
 expect(output).toContain('7');
},20000);
