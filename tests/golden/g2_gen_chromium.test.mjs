// G2 in Chromium (docs/eras/spec/VF.md 3.6.2 "Node and Chromium"; W.md PC-W10): the same 112 cases generated inside headless Chromium (SwiftShader flags),
// compared with tests/world/gen_golden_chromium.json (recorded from the baseline, same browser build). Records of the two engines are never merged:
// V8 versions may differ in the last bit of Math.sin and friends. Measured on the baseline: 109 of 112 cases are identical across Node 22 and Chromium 141,
// the three exceptions (alpine/small/1, alpine/small/7, random/small/1) differ in ONE ulp of a zone z coordinate (`Math.sin(x/23)*7 + Math.sin(x/9)*1.2`
// of the alpine recipe, gen.js:611). That list is frozen below, so a new cross-engine difference (or a fixed one) is reported instead of drifting.
//   labels: recorded_from_baseline, engine_major, replay_equal, cross_engine_known
import { criterion } from '../lib/criteria.mjs';
import { ROOT } from '../../tools/lib/paths.mjs';
import { readRecord, assertComparable, CrossEngineError } from '../../tools/lib/records.mjs';
import { g2InChromium } from '../../tools/golden/g2_chromium.mjs';
import { g2Compare } from '../../tools/golden/g2_core.mjs';
import { loadGolden, red, finish, listFirst } from './_golden.mjs';

/** Cases where the Node 22 record and the Chromium 141 record disagree, with the part that differs (measured at record time). */
export const KNOWN_CROSS_ENGINE = ['alpine/small/1[full+meta]', 'alpine/small/7[full+meta]', 'random/small/1[full+meta]'];

const c = criterion('VF-G2c', { er: 'ER1', owner: 'TOOLS-GOLDEN', tier: 'T-era', negctl: 'tests/negctl/VF-G2c.mjs', engine: 'chromium',
  text: 'Ancient arena generator output generated inside Chromium equals the Chromium baseline record; the Node/Chromium difference list is the frozen one' });

const { rec, problems } = loadGolden('tests/world/gen_golden_chromium.json', { kind: 'g2_arena_hashes', engine: 'chromium' });
red(c, 'recorded_from_baseline', problems.length === 0, problems.join('; '));
if (!rec) { finish(c); process.exit(1); }
const run = await g2InChromium(ROOT, rec.data);
let majorOk = true, majorMsg = '';
try { assertComparable(rec, { engine: 'chromium', engineVersion: run.meta.engineVersion, regime: rec.regime }, 'a'); } catch (e) { if (!(e instanceof CrossEngineError)) throw e; majorOk = false; majorMsg = e.message; }
red(c, 'engine_major', majorOk, `${majorMsg} (record ${rec.engineVersion}, browser ${run.meta.engineVersion}): re-record G2 chromium with two signers`);
const cmp = g2Compare(rec.data, run.data);
const fmt = (x) => `${x.key}[${x.parts.join('+')}]`;
red(c, 'replay_equal', cmp.cases.length === 0 && cmp.presets.length === 0 && cmp.missing.length === 0,
  `${cmp.cases.length + cmp.presets.length} differing cases in Chromium ${run.meta.engineVersion}: ${listFirst([...cmp.cases, ...cmp.presets].map(fmt))}`);
const nodeRec = readRecord(`${ROOT}/tests/world/gen_golden.json`);
const cross = g2Compare(nodeRec.data, { cases: rec.data.cases, presets: rec.data.presets });
const crossList = [...cross.cases, ...cross.presets].map(fmt);
red(c, 'cross_engine_known', crossList.join('|') === KNOWN_CROSS_ENGINE.join('|'), `Node-vs-Chromium record differences are [${crossList.join(', ')}], frozen list is [${KNOWN_CROSS_ENGINE.join(', ')}]`);
finish(c);
