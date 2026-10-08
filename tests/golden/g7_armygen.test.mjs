// G7 (docs/eras/spec/VF.md 3.6.2, VF-T07): the Ancient content generators. tests/golden/g7_armygen.json (recorded from the baseline) stores its inputs and
// results; this test replays the RECORDED inputs on the live tree, with the defs restricted to the recorded 43 Ancient unit ids, so new eras cannot move it:
//   48 generateArmy tuples (composition + placements), counterTable, 20 scoutReport cases, survival waves 1..12 for 20 seeds, dailyPlan for 400 dates
//   (and dailyEnemy for every 10th).
//   labels: recorded_from_baseline, inputs, compositions, placements, counter_table, scouts, scout_codes, waves, daily_plans, daily_enemies
import { criterion } from '../lib/criteria.mjs';
import { ROOT } from '../../tools/lib/paths.mjs';
import { readRecord } from '../../tools/lib/records.mjs';
import { openTree } from '../../tools/golden/tree.mjs';
import { g7Run, armyTuples } from '../../tools/golden/g7_collect.mjs';
import { mapDiff } from '../../tools/golden/common.mjs';
import { loadGolden, red, finish, listFirst } from './_golden.mjs';

const c = criterion('VF-G7', { er: 'ER1', owner: 'TOOLS-GOLDEN', tier: 'T-fast', negctl: 'tests/negctl/VF-G7.mjs', engine: 'node',
  text: 'Ancient generateArmy (48 tuples), counterTable, 20 scoutReport cases, 20 x 12 survival waves and 400 daily plans equal the baseline record' });

const { rec, problems } = loadGolden('tests/golden/g7_armygen.json', { kind: 'g7_armygen', engine: 'node' });
red(c, 'recorded_from_baseline', problems.length === 0, problems.join('; '));
if (!rec) { finish(c); process.exit(1); }
const want = rec.data, inp = want.inputs;

// the recorded inputs are what the spec says, and the unit list is the G3 ledger's
const ledger = readRecord(`${ROOT}/tests/fixtures/shipped_ids.json`).data.ids;
red(c, 'inputs', inp.unitIds.length === 43 && inp.unitIds.join() === ledger.units.join() && inp.factions.length === 8 && inp.factions[7] === 'mixed' && armyTuples(inp).length === 48
  && inp.scouts.length === 20 && inp.waveSeeds.length === 20 && inp.waves === 12 && inp.dates.n === 400 && inp.dates.start === '2026-01-01' && want.armies.length === 48 && want.scouts.length === 20
  && Object.keys(want.waves).length === 20 && want.dailyPlans.rows.length === 400, 'recorded inputs differ from the 48 / 20 / 20 x 12 / 400 shape or from the G3 unit ledger');

const T = await openTree(ROOT, { regime: 'baked' });
const got = await g7Run(T, inp);
const cmpList = (a, b, key) => a.map((x, i) => [x, b[i]]).filter(([x, y]) => !y || key(x) !== key(y)).map(([x]) => x);

const wantKeys = want.armies.map((a) => a.key).join(), gotKeys = got.armies.map((a) => a.key).join();
const compBad = cmpList(want.armies, got.armies, (a) => `${a.composition}|${a.cost}|${a.total}|${a.types}`);
red(c, 'compositions', wantKeys === gotKeys && compBad.length === 0, `${compBad.length} of 48 generateArmy compositions differ: ` + compBad.slice(0, 3).map((a) => { const g = got.armies.find((x) => x.key === a.key); return `${a.key}: recorded ${a.composition} | live ${g && g.composition}`; }).join(' || '));
const plBad = cmpList(want.armies, got.armies, (a) => `${a.compositionSha}|${a.placementsSha}|${a.placements}`);
red(c, 'placements', plBad.length === 0, `${plBad.length} of 48 placement lists differ: ${listFirst(plBad.map((a) => a.key), 4)}`);

const ctDiff = mapDiff(want.counterTable.rows, got.counterTable.rows);
red(c, 'counter_table', want.counterTable.sha256 === got.counterTable.sha256 && ctDiff.changed.length + ctDiff.missing.length + ctDiff.extra.length === 0,
  `counterTable differs for ${listFirst([...ctDiff.changed, ...ctDiff.missing, ...ctDiff.extra])}: ` + ctDiff.changed.slice(0, 2).map((id) => `${id} recorded {${want.counterTable.rows[id]}} live {${got.counterTable.rows[id]}}`).join(' || '));

const scBad = cmpList(want.scouts, got.scouts, (s) => `${s.name}|${s.codes}|${s.sha}`);
red(c, 'scouts', scBad.length === 0, `${scBad.length} of 20 scoutReport cases differ: ` + scBad.slice(0, 3).map((s) => `${s.name} recorded [${s.codes}] live [${got.scouts.find((x) => x.name === s.name).codes}]`).join(' || '));
const NEED = ['no_anti_cav', 'exposed_archers', 'no_ranged', 'no_cavalry', 'siege_exposed', 'blob_vs_ranged', 'monster_incoming', 'no_support', 'one_note'];
const seen = new Set(got.scouts.flatMap((s) => (s.codes ? s.codes.split(',') : [])));
red(c, 'scout_codes', NEED.every((k) => seen.has(k)), 'the 20 cases no longer exercise every scout code; missing ' + NEED.filter((k) => !seen.has(k)).join(','));

const wvBad = Object.keys(want.waves).filter((s) => !got.waves[s] || got.waves[s].sha256 !== want.waves[s].sha256);
red(c, 'waves', wvBad.length === 0, `${wvBad.length} of 20 survival seeds differ: ` + wvBad.slice(0, 3).map((s) => { const w = want.waves[s], g = got.waves[s]; const n = g ? w.rows.findIndex((h, i) => g.rows[i] !== h) + 1 : 0; return `seed ${s} first differing wave ${n}`; }).join(', '));

const dpBad = cmpList(want.dailyPlans.rows, got.dailyPlans.rows, (r) => r.join('|'));
red(c, 'daily_plans', want.dailyPlans.sha256 === got.dailyPlans.sha256 && dpBad.length === 0, `${dpBad.length} of 400 daily plans differ: ` + dpBad.slice(0, 3).map((r) => `${r[0]} recorded ${r[2]} | live ${(got.dailyPlans.rows.find((x) => x[0] === r[0]) || [])[2]}`).join(' || '));
const deBad = cmpList(want.dailyEnemies, got.dailyEnemies, (r) => r.join('|'));
red(c, 'daily_enemies', deBad.length === 0, `${deBad.length} of 40 daily enemy armies differ: ${listFirst(deBad.map((r) => r[0]), 4)}`);
finish(c);
