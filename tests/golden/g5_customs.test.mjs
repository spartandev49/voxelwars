// G5 customs (docs/eras/spec/VF.md 3.6.2, AR 3.5.4 "custom soldier costs equal"): tests/golden/g5_customs.json (recorded from the baseline) stores 200 random Ancient custom
// soldiers (RNG(8008), the U8 fuzzer shape) and, for each, the cost and the derived numbers the Workshop shows. This test replays the RECORDED soldiers on the live tree
// (customDef / evaluate), so new eras cannot move it; a change of the Ancient costing, stats, power or part tables does.
//   labels: recorded_from_baseline, shape, internal_sha, no_warnings, costs, derived, rev, summary
// @nocache  (a golden imports the tree and the baseline through import(<expr>) on purpose: never served from the closure cache)
import { criterion } from '../lib/criteria.mjs';
import { ROOT } from '../../tools/lib/paths.mjs';
import { openTree } from '../../tools/golden/tree.mjs';
import { g5Rows, summarise, ROW_FIELDS, G5_SEED, G5_N } from '../../tools/golden/g5_collect.mjs';
import { sha256 } from '../../tools/golden/common.mjs';
import { canonicalJSON } from '../../tools/lib/records.mjs';
import { loadGolden, red, finish, listFirst } from './_golden.mjs';

const c = criterion('VF-G5c', { er: ['ER1', 'ER16'], owner: 'TOOLS-GOLDEN', tier: 'T-fast', negctl: 'tests/negctl/VF-G5c.mjs', engine: 'node',
  text: 'The cost (and derived numbers) of 200 random Ancient custom soldiers (RNG(8008)) equal the baseline record' });

const { rec, problems } = loadGolden('tests/golden/g5_customs.json', { kind: 'g5_customs', engine: 'node' });
red(c, 'recorded_from_baseline', problems.length === 0, problems.join('; '));
if (!rec) { finish(c); process.exit(1); }
const want = rec.data;
red(c, 'shape', want.seed === G5_SEED && want.n === G5_N && want.customs.length === G5_N && want.rows.length === G5_N && canonicalJSON(want.fields) === canonicalJSON(ROW_FIELDS)
  && new Set(want.customs.map((x) => x.id)).size === G5_N && want.rows.every((r, i) => r[0] === want.customs[i].id && Number.isInteger(r[1]) && r[1] >= 10), 'the record is not 200 distinct customs with integer costs and the 16 row fields');
const wsum = summarise(want.rows);
red(c, 'internal_sha', canonicalJSON(wsum) === canonicalJSON(want.summary), 'the recorded summary does not match the recorded rows (the file was edited by hand)');

const T = await openTree(ROOT, { regime: 'baked' });
const got = await g5Rows(T, want.customs);
red(c, 'no_warnings', (await (async () => { const C = await T.src('custom'); return want.customs.filter((cs) => C.customDef(JSON.parse(JSON.stringify(cs))).warnings.length); })()).length === 0, 'a recorded soldier no longer normalises cleanly (a part or ability id vanished)');
const costBad = want.rows.filter((r, i) => got[i][1] !== r[1]).map((r) => r[0]);
red(c, 'costs', costBad.length === 0, `${costBad.length} of 200 costs differ, first: ` + costBad.slice(0, 4).map((id) => { const i = want.rows.findIndex((r) => r[0] === id); return `${id} recorded ${want.rows[i][1]} | live ${got[i][1]}`; }).join('; '));
const numeric = ROW_FIELDS.map((f, k) => [f, k]).filter(([f]) => !['id', 'cost', 'rev'].includes(f));
const derivedBad = [];
for (let i = 0; i < want.rows.length; i++) for (const [f, k] of numeric) if (want.rows[i][k] !== got[i][k]) derivedBad.push(`${want.rows[i][0]}.${f} recorded ${want.rows[i][k]} | live ${got[i][k]}`);
red(c, 'derived', derivedBad.length === 0, `${derivedBad.length} derived numbers differ: ${listFirst(derivedBad, 4)}`);
const revBad = want.rows.filter((r, i) => got[i][15] !== r[15]).map((r) => r[0]);
red(c, 'rev', revBad.length === 0, `the model revision hash differs for ${revBad.length} soldiers: ${listFirst(revBad, 4)}`);
const gsum = summarise(got);
red(c, 'summary', canonicalJSON(gsum) === canonicalJSON(want.summary) && gsum.rowsSha256 === sha256(JSON.stringify(got)), `summary differs: live ${JSON.stringify({ ...gsum, roles: undefined })}`);
finish(c);
