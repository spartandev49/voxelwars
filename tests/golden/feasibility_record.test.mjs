// RP0 feasibility record (docs/eras/spec/VF.md 3.7): tests/campaign/feasibility.ancient.json, the new-style record (makeRecord kind `feasibility`, engineHash / eraHash instead of
// the old `sim` string) of the scripted reference players against the 9 Ancient missions, re-taken ONCE from the baseline worktree under regime baked by
// tools/feasibility_record.mjs. The legacy record (regime default_meta, sim 489eccc492) stays as tests/campaign/feasibility.v8.json (`legacy: true`) for replay equality.
//   labels: record_valid, legacy_kept, mission_data, sample_size, stars, tuples, bands_reported, witness_config, replay, fingerprint
//   bands_reported: the bands that FAIL under baked are REPORTED, not fixed (VF 3.7): tests/baseline/feasibility_baked_bands.json lists them; this test demands the list equal the
//   record's failing bands exactly (a new failure or a recovered band is noticed; COORD decides a `botsWhy` note or a DA row, two signatures).
//   replay: 4 stored battles (a seeded sample) are fought again on THIS tree (regime baked) and must give the stored tuple (win, endTick, stars, endDigest) bit for bit.
// @nocache  (a golden imports the tree and the baseline through import(<expr>) on purpose: never served from the closure cache)
import fs from 'node:fs';
import path from 'node:path';
import { criterion } from '../lib/criteria.mjs';
import { ROOT } from '../../tools/lib/paths.mjs';
import { readRecord, selectWitnessSample, canonicalJSON, classifyRecord, landingsCount } from '../../tools/lib/records.mjs';
import { fingerprint } from '../../tools/lib/fingerprint.mjs';
import { loadHarness, battleOf, tupleOf, bandRows, WORKAROUNDS, jobsFromLegacy } from '../../tools/feasibility_record.mjs';
import { provenanceProblems, red, finish, listFirst } from './_golden.mjs';

const c = criterion('VF-FEAS', { er: ['ER1', 'ER24'], owner: 'TOOLS-GOLDEN', tier: 'T-fast', negctl: 'tests/negctl/VF-FEAS.mjs', engine: 'node',
  text: 'The RP0 feasibility record of the Ancient campaign (regime baked, baseline worktree) is well formed, current, reproduces on this tree and keeps the legacy record' });

const FILE = 'tests/campaign/feasibility.ancient.json', LEGACY = 'tests/campaign/feasibility.v8.json', BANDS = 'tests/baseline/feasibility_baked_bands.json';
let rec = null, problems = [];
try { rec = readRecord(path.join(ROOT, FILE)); problems = provenanceProblems({ ...rec, witness: undefined, staleSince: undefined }, { kind: 'feasibility', engine: 'node' }); } catch (e) { problems = [`${FILE}: ${e.message}`]; }
// a measurement record is not a golden: witness / staleSince may exist later (witness refresh), so only the origin facts are checked here
if (rec) problems = problems.filter((p) => !/golden never carries/.test(p));
const d = rec && rec.data;
red(c, 'record_valid', problems.length === 0 && d && d.version === 2 && canonicalJSON(d.workarounds) === canonicalJSON(WORKAROUNDS) && d.legacy === 'feasibility.v8.json' && d.seedsFrom === 1 && rec.regime === 'baked' && Object.keys(rec.eraHash).join() === 'ancient', problems.join('; ') || 'not a version 2 feasibility record of regime baked with the harness workaround listed');
if (!rec) { finish(c); process.exit(1); }

// the legacy record is still there, marked, and lists the same battles
let legacy = null;
try { legacy = JSON.parse(fs.readFileSync(path.join(ROOT, LEGACY), 'utf8')); } catch { /* reported below */ }
const jobsLegacy = legacy ? jobsFromLegacy(path.join(ROOT, LEGACY)) : [];
const jobsNew = Object.entries(d.runs).flatMap(([id, r]) => Object.entries(r.bots).map(([bot, b]) => ({ id, bot, n: b.n })));
red(c, 'legacy_kept', !!legacy && legacy.legacy === true && Object.keys(legacy.runs).length === 9 && canonicalJSON(jobsLegacy) === canonicalJSON(jobsNew) && jobsNew.length === 36, 'tests/campaign/feasibility.v8.json must exist with legacy:true and list exactly the 36 (mission, bot) jobs of the new record');

// mission data of the tree is what the record was made on
const H = await loadHarness(ROOT, 'baked');
const hashBad = H.L.MISSIONS.filter((m) => !d.runs[m.id] || d.runs[m.id].hash !== H.C.missionHash(m) || Object.values(d.runs[m.id].bots).some((b) => b.hash !== d.runs[m.id].hash)).map((m) => m.id);
red(c, 'mission_data', hashBad.length === 0, `missionHash differs from the record for ${listFirst(hashBad)}: the Ancient mission data changed since RP0 (re-take with two signers)`);
const MIN = { counter: 20, greedy: 20, turtle: 10 };
const smallBad = H.L.MISSIONS.flatMap((m) => Object.keys(MIN).filter((bot) => !d.runs[m.id] || !d.runs[m.id].bots[bot] || d.runs[m.id].bots[bot].n < MIN[bot] || d.runs[m.id].bots[bot].perSeed.length !== d.runs[m.id].bots[bot].n).map((bot) => m.id + '/' + bot));
const total = jobsNew.reduce((s, j) => s + j.n, 0);
red(c, 'sample_size', smallBad.length === 0 && total >= 450 && d.battles.length === total, `records lack seeds (${listFirst(smallBad)}) or the battle count (${total}, battles ${d.battles.length}) is not >= 450 and equal`);
// star 3 reachable on every mission by some recorded battle; star 2 on most (the legacy test's rule), the thrift star of mission 1
let two = 0, s3Bad = [];
for (const m of H.L.MISSIONS) { const bots = d.runs[m.id].bots; let s3 = 0, s2 = 0; for (const k of Object.keys(bots)) { s3 += bots[k].starHits[2]; s2 += bots[k].starHits[1]; } if (s3 < 1) s3Bad.push(m.id); if (s2 >= 1) two++; }
const th = d.runs.marathon_sort_of.bots.thrifty;
red(c, 'stars', s3Bad.length === 0 && two >= 8 && th && th.starHits[2] >= 1, `star 3 never earned on ${listFirst(s3Bad)}; star 2 reachable on ${two} of 9; thrifty star ${th && th.starHits[2]}`);
// the witness tuples agree with the per-seed rows
const tupleBad = [];
for (const b of d.battles) {
  const [id, bot, seed] = b.id.split('/'), row = d.runs[id] && d.runs[id].bots[bot] && d.runs[id].bots[bot].perSeed[+seed - 1];
  const ok = row && b.tuple.length === 4 && (b.tuple[0] === 0 || b.tuple[0] === 1) && Number.isInteger(b.tuple[1]) && b.tuple[1] > 0 && b.tuple[2] >= 0 && b.tuple[2] <= 3 && Number.isInteger(b.tuple[3]) && b.tuple[3] >= 0 && b.tuple[3] < 2 ** 32 && row[0] === b.tuple[0] && row[2] === b.tuple[2];
  if (!ok) tupleBad.push(b.id);
}
red(c, 'tuples', tupleBad.length === 0 && new Set(d.battles.map((b) => b.id)).size === d.battles.length, `witness tuples malformed or not equal to perSeed rows: ${listFirst(tupleBad)}`);

// bands under baked: the failing ones are exactly the REPORTED ones
const rows = await bandRows(ROOT, d.runs), failing = rows.filter((r) => !r.ok).map((r) => `${r.mission}/${r.bot}`).sort();
let reported = null;
try { reported = JSON.parse(fs.readFileSync(path.join(ROOT, BANDS), 'utf8')); } catch { /* reported below */ }
const repList = reported && Array.isArray(reported.failing) ? reported.failing.map((x) => x.id).sort() : null;
red(c, 'bands_reported', !!repList && canonicalJSON(repList) === canonicalJSON(failing) && reported.regime === 'baked' && reported.record === FILE && reported.failing.every((x) => x.rate !== undefined && x.band && x.note), `failing bands under baked [${failing.join(', ')}] differ from ${BANDS} [${repList}]`);

// the witness the record states stay valid: the commands exist
let wcfg = null; try { wcfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/golden/witness.json'), 'utf8')); } catch { /* reported */ }
red(c, 'witness_config', !!wcfg && Array.isArray(wcfg.ancient) && wcfg.ancient.length === 2 && wcfg.ancient.every((cmd) => cmd[0] === 'node' && fs.existsSync(path.join(ROOT, cmd[1]))) && wcfg.ancient.some((cmd) => /g1_sim\.test/.test(cmd[1]) && cmd.includes('--core')) && wcfg.ancient.some((cmd) => /g6_campaign\.test/.test(cmd[1])), 'tests/golden/witness.json must list G1 core 12 and G6 15 for the ancient era');

// fingerprint: the record against this tree (informational when the engine moved: tools/records.mjs check owns the state machine)
const fp = fingerprint(ROOT, ['ancient']);
const eraEqual = fp.eraHash.ancient === rec.eraHash.ancient, engineEqual = fp.engineHash.simCore === rec.engineHash.simCore && fp.engineHash.shared === rec.engineHash.shared;
red(c, 'fingerprint', eraEqual && (engineEqual || classifyRecord(rec, { engineHash: fp.engineHash, eraHash: fp.eraHash, landings: landingsCount(ROOT), now: new Date() }, { era: 'ancient', witness: true }).amber), `eraHash(ancient) of this tree differs from the record: RED-ERA (tools/records.mjs check says the same)`);
if (!engineEqual) console.log('    (engineHash differs from the record: STALE-ENGINE territory, decided by `node tools/records.mjs check` with its witness)');

// replay: a seeded sample of stored battles fought again here
const sample = selectWitnessSample(rec, 'ancient', 'feasibility-record-test', 4), replayBad = [];
const t0 = Date.now();
for (const e of sample) { const [id, bot, seed] = e.id.split('/'); const got = tupleOf(battleOf(H, id, bot, +seed)); if (canonicalJSON(got) !== canonicalJSON(e.tuple)) replayBad.push(`${e.id}: recorded ${JSON.stringify(e.tuple)} | here ${JSON.stringify(got)}`); }
red(c, 'replay', replayBad.length === 0, replayBad.join('\n'));
console.log(`    (replayed ${sample.map((e) => e.id).join(', ')} in ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
finish(c);
