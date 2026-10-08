// G6 (docs/eras/spec/VF.md 3.6.2 and 3.7, PC-3; VF-T06): the Ancient campaign replay. tests/golden/g6_campaign.node.<regime>.json (recorded from the baseline) stores,
// for the 9 missions at seed 1, an EXPLICIT frozen deployment each (7 authored `mission.reference` lists, 2 frozen counter-picks, with their layoutArmy placements) and the
// 6 stored puzzle solutions, plus the result, the legacy World.stateHash chain every 300 ticks, the statwalk chain and the final hashes of each battle. This test
// replays the RECORDED deployments on the live tree and demands bit equality; new eras cannot move it, only a change of the Ancient sim, mission data or stats can.
// The harness workaround of tests/campaign/_lib.mjs:12 is NOT applied (the replay runs through tools/golden/g6_collect.mjs, not through _lib.mjs).
//   node tests/golden/g6_campaign.test.mjs [--regime=default_meta]      (default regime: baked = the golden, criterion VF-G6; default_meta = VF-G6m, slow tier)
//   labels: recorded_from_baseline, shape, mission_data, reference_groups, layout, legacy_hash, outcomes, times, chain, walk, final
// @nocache  (a golden imports the tree and the baseline through import(<expr>) on purpose: never served from the closure cache)
import { criterion } from '../lib/criteria.mjs';
import { ROOT } from '../../tools/lib/paths.mjs';
import { readRecord } from '../../tools/lib/records.mjs';
import { openTree } from '../../tools/golden/tree.mjs';
import { g6Run, openL, layoutMatches, G6_SEED, G6_CHAIN_EVERY } from '../../tools/golden/g6_collect.mjs';
import { canonicalJSON } from '../../tools/lib/records.mjs';
import { provenanceProblems, red, finish, listFirst } from './_golden.mjs';

const regime = (process.argv.find((a) => a.startsWith('--regime=')) || '--regime=baked').slice(9);
if (regime !== 'baked' && regime !== 'default_meta') { console.error('--regime must be baked or default_meta'); process.exit(2); }
const ID = regime === 'baked' ? 'VF-G6' : 'VF-G6m';
const c = criterion(ID, { er: 'ER1', owner: 'TOOLS-GOLDEN', tier: regime === 'baked' ? 'T-fast' : 'T-full', negctl: `tests/negctl/${ID}.mjs`, engine: 'node',
  text: `The 9 Ancient missions (seed 1, frozen deployments) and the 6 puzzle solutions replay to the baseline's results and hash chains (${regime} regime)` });

const REL = `tests/golden/g6_campaign.node.${regime}.json`;
let rec = null, problems = [];
try { rec = readRecord(`${ROOT}/${REL}`); problems = provenanceProblems({ ...rec, regime: rec.regime === regime ? 'baked' : rec.regime }, { kind: 'g6_campaign', engine: 'node' }); } catch (e) { problems = [`${REL}: ${e.message}`]; }
red(c, 'recorded_from_baseline', problems.length === 0, problems.join('; '));
if (!rec) { finish(c); process.exit(1); }
const want = rec.data, inp = want.inputs;

const MISSION_IDS = ['marathon_sort_of', 'thermopylae_snack', 'pyramid_scheme', 'nile_crossing', 'alps_elephant', 'teutoburg_peekaboo', 'troy_giftshop', 'cyclops_meet', 'zeus_bad_day'];
const PUZZLE_IDS = ['spear_wall', 'kiting_101', 'elephant_room', 'knock_knock', 'goat_logistics', 'gaze_avoidance'];
const shapeOk = inp.seed === G6_SEED && inp.chainEvery === G6_CHAIN_EVERY && inp.missions.map((m) => m.id).join() === MISSION_IDS.join() && inp.puzzles.map((p) => p.id).join() === PUZZLE_IDS.join()
  && want.order.join() === [...MISSION_IDS, ...PUZZLE_IDS].join() && inp.missions.every((m) => m.groups.length > 0 && m.placements.length > 0 && (m.source === 'reference' || m.source === 'counter_pick'))
  && inp.missions.filter((m) => m.source === 'counter_pick').map((m) => m.id).join() === 'marathon_sort_of,cyclops_meet' && inp.puzzles.every((p) => p.placements.length > 0) && want.workaround === 'none'
  && Object.keys(want.results).length === 15;
red(c, 'shape', shapeOk, 'the record is not 9 missions (7 reference + 2 counter-pick) + 6 puzzles at seed 1 with chain every 300 ticks and no harness workaround');

const T = await openTree(ROOT, { regime });
const L = await openL(T);
// the data the deployments were frozen from
const hashBad = inp.missions.filter((r) => { const m = L.C.MISSIONS.find((x) => x.id === r.id); return !m || L.C.missionHash(m) !== r.hash; }).map((r) => r.id);
red(c, 'mission_data', hashBad.length === 0, `missionHash differs from the recorded one for ${listFirst(hashBad)}: the Ancient mission data changed`);
const refBad = inp.missions.filter((r) => r.source === 'reference').filter((r) => { const m = L.C.MISSIONS.find((x) => x.id === r.id); return !m || !m.reference || canonicalJSON(m.reference.map((g) => [g.defId, g.n])) !== canonicalJSON(r.groups); }).map((r) => r.id);
red(c, 'reference_groups', refBad.length === 0, `mission.reference no longer equals the frozen group list for ${listFirst(refBad)}`);
const lay = layoutMatches(L, inp), layBad = Object.keys(lay).filter((k) => !lay[k]);
red(c, 'layout', layBad.length === 0, `layoutArmy(frozen groups) no longer gives the frozen placements for ${listFirst(layBad)} (the battle itself still replays from the stored placements)`);

const t0 = Date.now();
const got = (await g6Run(T, inp)).results;
const secs = (Date.now() - t0) / 1000;
const ids = want.order;
const first = (pred) => ids.find((id) => got[id] && want.results[id] && pred(want.results[id], got[id]));
const eq = (a, b) => canonicalJSON(a) === canonicalJSON(b);
const firstDiv = (a, b) => { const n = Math.max(a.length, b.length); for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i; return -1; };

red(c, 'legacy_hash', ids.every((id) => got[id] && got[id].final === got[id].stateHash), 'legacyStateHash(w) != w.stateHash(): the frozen method (tests/golden/legacy_hash.mjs) no longer equals the live World.stateHash()');
const outBad = ids.filter((id) => !got[id] || !eq({ ...want.results[id].result, t: 0, tickN: 0 }, { ...got[id].result, t: 0, tickN: 0 }));
red(c, 'outcomes', outBad.length === 0, outBad.slice(0, 3).map((id) => { const a = want.results[id].result, b = got[id].result; return `${id}: recorded win ${a.win} stars ${a.stars} ${a.endReason} spent ${a.spent} alive ${a.alive} | live win ${b.win} stars ${b.stars} ${b.endReason} spent ${b.spent} alive ${b.alive}`; }).join('\n'));
const timeBad = ids.filter((id) => !got[id] || want.results[id].result.t !== got[id].result.t || want.results[id].result.tickN !== got[id].result.tickN);
red(c, 'times', timeBad.length === 0, timeBad.slice(0, 3).map((id) => `${id}: recorded t ${want.results[id].result.t} (${want.results[id].result.tickN} ticks) | live t ${got[id].result.t} (${got[id].result.tickN} ticks)`).join('\n'));
const chainBad = ids.filter((id) => !got[id] || !eq(want.results[id].chain, got[id].chain));
red(c, 'chain', chainBad.length === 0, chainBad.slice(0, 3).map((id) => `${id}: first diverging legacy-hash sample at tick ${(firstDiv(want.results[id].chain, got[id].chain) + 1) * G6_CHAIN_EVERY}`).join('\n'));
const walkBad = ids.filter((id) => !got[id] || !eq(want.results[id].walk, got[id].walk));
red(c, 'walk', walkBad.length === 0, walkBad.slice(0, 3).map((id) => `${id}: first diverging statwalk sample at tick ${(firstDiv(want.results[id].walk, got[id].walk) + 1) * G6_CHAIN_EVERY}`).join('\n'));
const finBad = ids.filter((id) => !got[id] || want.results[id].final !== got[id].final || want.results[id].walkFinal !== got[id].walkFinal);
red(c, 'final', finBad.length === 0, finBad.slice(0, 3).map((id) => `${id}: final legacy hash recorded ${want.results[id].final} | live ${got[id].final}`).join('\n'));
void first;
console.log(`    (${ids.length} battles replayed in ${secs.toFixed(1)} s, regime ${regime})`);
finish(c);
