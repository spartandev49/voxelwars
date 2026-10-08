// GATE-T01: the in-process syntax step (tools/lib/syntax.mjs): the six bad fixtures are rejected, the real tree parses, a planted error is found,
// and the negative control itself catches an identity stub (NC-VF-59).
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { criterion } from '../lib/criteria.mjs';
import { checkSource, syntaxStep, syntaxNegativeControl, listSyntaxFiles, REQUIRED_FIXTURES } from '../../tools/lib/syntax.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const c = criterion('GATE-T01', { er: 'gate', owner: 'TOOLS-GATE', tier: 'T-fast', negctl: 'tests/negctl/GATE-T01.mjs', text: 'in-process esbuild syntax step rejects the six bad fixtures and accepts the tree' });

// 1. every required fixture exists and is rejected with a message
const nc = await syntaxNegativeControl();
for (const n of REQUIRED_FIXTURES) c.check('fixture_present:' + n, nc.rejected.some((r) => r.file === n) || nc.accepted.includes(n), 'fixture file missing: ' + n);
c.check('rejects_all_six', nc.fixtures === 6 && nc.rejected.length === 6 && nc.accepted.length === 0, `accepted: ${nc.accepted.join(', ')}`);
for (const r of nc.rejected) c.check('error_has_text:' + r.file, typeof r.error === 'string' && r.error.length > 3);

// 2. the real tree (src, tools, tests) parses; the scan is not vacuous
const files = listSyntaxFiles();
c.check('scan_not_vacuous', files.length >= 400, 'only ' + files.length + ' files scanned');
c.check('scan_excludes_fixtures', !files.some((f) => f.includes('syntax_bad')));
const tree = await syntaxStep(ROOT);
c.check('tree_clean', tree.bad.length === 0, tree.bad.slice(0, 3).map((b) => `${b.file}: ${b.error}`).join(' | '));

// 3. a planted error in a scratch tree is found and named
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vw-syntax-'));
try {
  fs.mkdirSync(path.join(tmp, 'src'));
  fs.writeFileSync(path.join(tmp, 'src/ok.js'), 'export const a = 1;\n');
  fs.writeFileSync(path.join(tmp, 'src/bad.js'), 'export const a = 1;\nlet b = 1;\nlet b = 2;\n');
  const r = await syntaxStep(tmp);
  c.check('detects_bad_file', r.bad.length === 1 && r.bad[0].file === 'src/bad.js', JSON.stringify(r.bad));
  c.check('names_line', /^3:/.test(r.bad[0].error), r.bad[0] && r.bad[0].error);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

// 4. the negative control catches a stub that accepts everything (what NC-VF-59 installs in the real checker)
const stub = await syntaxNegativeControl(undefined, async () => null);
c.check('nc_catches_stub', stub.accepted.length === 6 && stub.rejected.length === 0);
// and the real checker is not a stub: it rejects one trivially wrong line and accepts one right line
c.check('checker_accepts_valid', (await checkSource('export const x = 1;')) === null);
c.check('checker_rejects_invalid', (await checkSource('export const = ;')) !== null);
console.log(`GATE-T01 ok: ${c.assertions} assertions, ${files.length} files parsed`);
