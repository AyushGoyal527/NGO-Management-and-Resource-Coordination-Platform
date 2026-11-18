// Runs every *.test.js in this folder as its own process and reports one line each. Needs no database.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.js')).sort();
let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 180000 });
  const out = `${r.stdout}\n${r.stderr}`;
  const summary = out.split('\n').filter((l) => /passed|routes:|zero permissions/.test(l)).pop() || '';
  const ok = r.status === 0;
  if (!ok) { failed += 1; console.log(out.split('\n').filter((l) => /FAIL|UNEXPECTED|NOT PROTECTED|Error/.test(l)).slice(0, 10).join('\n')); }
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${f.padEnd(34)} ${summary.trim()}`);
}
console.log(failed ? `\n${failed} test file(s) failed` : `\nAll ${files.length} test files passed`);
process.exit(failed ? 1 : 0);
