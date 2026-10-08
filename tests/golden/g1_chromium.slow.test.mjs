// VF-T03-chromium / G1 Chromium column (full tier): the CORE 12 battles of the sim matrix, run inside the built page of THIS tree in headless Chromium through
// `new (game.world.constructor)(...)`, against tests/golden/g1_digests.chromium.baked.json (recorded from the baseline's own page, same Chromium major).
// Page: --page=<html>, else $VW_PAGE_FRAGMENT (set by the gate), else a private minified build of this tree. docs/eras/spec/VF.md 3.6, 3.6.1.
// @nocache  (a golden is never served from the closure cache)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criterion } from '../lib/criteria.mjs';
import { validateRecord } from '../../tools/lib/records.mjs';
import { CHROMIUM } from '../../tools/lib/paths.mjs';
import { checkCandidate, CHROMIUM_RECORD } from '../../tools/golden/g1_chromium.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const USAGE = 'usage: node tests/golden/g1_chromium.slow.test.mjs [--page=<html>] [--case=id,id] [--verbose]   exit 0 equal, 1 differs, 2 usage';
const o = { page: null, only: null, verbose: false };
for (const a of process.argv.slice(2)) {
  const m = /^--(page|case)=(.+)$/.exec(a);
  if (a === '--help' || a === '-h') { console.log(USAGE); process.exit(0); }
  else if (a === '--verbose') o.verbose = true;
  else if (m) { if (m[1] === 'page') o.page = m[2]; else o.only = m[2].split(',').filter(Boolean); }
  else { console.error('unknown argument: ' + a + '\n' + USAGE); process.exit(2); }
}

const c = criterion('VF-T03-chromium', {
  er: 'ER1', owner: 'TOOLS-GOLDEN', tier: 'T-full', engine: 'chromium', negctl: 'tests/negctl/VF-T03-chromium.mjs',
  text: 'G1 sim matrix, Chromium column: the core 12 battles in the built page reproduce the Ancient v8 digests recorded from the baseline page in the same Chromium (never compared with Node digests)',
});
const LABELS = ['g1/digest_equal', 'g1/chain', 'g1/walk', 'g1/evhash', 'g1/tuple', 'g1/legacy_hash', 'g1/finite', 'g1/record', 'g1/record_shape', 'g1/fixtures'];
if (!fs.existsSync(CHROMIUM)) { c.skip('Chromium not installed at ' + CHROMIUM); console.log('skipped: no Chromium'); }
else {
  const t0 = Date.now(), problems = [];
  const rec = JSON.parse(fs.readFileSync(path.join(HERE, CHROMIUM_RECORD), 'utf8'));
  const rp = validateRecord(rec), pin = fs.readFileSync(path.join(HERE, '..', '..', 'release', 'v8', 'PAGE.sha256'), 'utf8').trim().split(/\s+/)[0];
  const prov = [];
  if (rec.kind !== 'g1_digests' || rec.engine !== 'chromium' || rec.regime !== 'baked') prov.push(`kind/engine/regime ${rec.kind}/${rec.engine}/${rec.regime}`);
  if (rec.sha !== '4aafd2e3fb83f20e1b19e0db8465c117032ba3b7' || rec.tag !== 'ancient-v8' || rec.dirty !== false) prov.push('not recorded from the clean baseline');
  if (!rec.data.page || rec.data.page.sha256 !== pin) prov.push('the recorded page is not the v8 fragment (release/v8/PAGE.sha256)');
  c.soft('g1/record', rp.length === 0 && prov.length === 0);
  if (rp.length || prov.length) problems.push('g1/record: ' + rp.concat(prov).join(', '));
  let r = null;
  try { r = await checkCandidate({ outDir: HERE, page: o.page, only: o.only, verbose: o.verbose }); }
  catch (e) { c.soft('g1/browser', false); problems.push('g1/browser: ' + String(e && e.message).split('\n')[0]); }
  if (r) {
    for (const l of LABELS) { const f = r.fails.filter((x) => x.label === l); if (l === 'g1/record' && prov.length) { /* counted above */ } c.soft(l, f.length === 0); for (const x of f) problems.push(x.msg); }
    if (!problems.length) console.log(`ok g1 chromium ${r.engineVersion}: ${r.results.size} cases of ${r.page.origin} equal the baseline page record, ${c.assertions} assertions, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  if (problems.length) { console.error(`FAIL g1 chromium: ${problems.length} problem(s)`); for (const m of problems.slice(0, 10)) console.error('  ' + m); process.exitCode = 1; }
}
