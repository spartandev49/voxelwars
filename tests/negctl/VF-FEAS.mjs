// Negative control of the RP0 feasibility record test (VF 3.13; NC-VF-70 here). One fault per label of tests/golden/feasibility_record.test.mjs, all applied at once; each fault is
// also run alone (named export `faults`). The record is edited through JSON (canonical text again).
//   record_valid    the record claims a dirty checkout
//   legacy_kept     the legacy record loses its `legacy: true` mark
//   mission_data    the recorded missionHash of one mission differs (the mission data "changed")
//   sample_size     one job claims 19 seeds (its perSeed list loses a row: tuples and legacy_kept follow)
//   stars           no recorded battle of one mission earned star 3
//   tuples          one witness tuple has win = 2
//   bands_reported  the reported-failing list loses one entry (a band failure nobody reported)
//   witness_config  the witness lists only G1 (G6 dropped)
//   replay          every stored end tick is off by one (the stored battles no longer reproduce)
//   fingerprint     an Ancient era source changes (eraHash differs: RED-ERA)
import { canonicalJSON } from '../../tools/lib/records.mjs';
const REC = 'tests/campaign/feasibility.ancient.json';
const rec = (fn) => (c) => c.edit(REC, /^[\s\S]*$/, (text) => { const j = JSON.parse(text); fn(j); return canonicalJSON(j) + '\n'; });
const json = (file, fn) => (c) => c.edit(file, /^[\s\S]*$/, (text) => { const j = JSON.parse(text); fn(j); return JSON.stringify(j, null, 1) + '\n'; });
export const faults = {
  record_valid: { labels: ['record_valid'], apply: rec((j) => { j.dirty = true; }) },
  legacy_kept: { labels: ['legacy_kept'], apply: (c) => c.edit('tests/campaign/feasibility.v8.json', /"legacy":true,/, '') },
  mission_data: { labels: ['mission_data'], apply: rec((j) => { j.data.runs.alps_elephant.hash = '00000000'; }) },
  sample_size: { labels: ['sample_size'], also: ['legacy_kept', 'tuples'], apply: rec((j) => { j.data.runs.alps_elephant.bots.counter.n = 19; j.data.runs.alps_elephant.bots.counter.perSeed.pop(); }) },
  stars: { labels: ['stars'], apply: rec((j) => { for (const b of Object.values(j.data.runs.zeus_bad_day.bots)) b.starHits[2] = 0; }) },
  tuples: { labels: ['tuples'], apply: rec((j) => { j.data.battles[5].tuple[0] = 2; }) },
  bands_reported: { labels: ['bands_reported'], apply: json('tests/baseline/feasibility_baked_bands.json', (j) => { j.failing.pop(); }) },
  witness_config: { labels: ['witness_config'], apply: json('tests/golden/witness.json', (j) => { j.ancient.pop(); }) },
  replay: { labels: ['replay'], apply: rec((j) => { for (const b of j.data.battles) b.tuple[1] += 1; }) },
  fingerprint: { labels: ['fingerprint'], apply: (c) => c.edit('src/content/era_ancient/stats.js', /^/, '// inert edit of the negative control: the file bytes (and so eraHash(ancient)) change\n') },
};
const ID = 'VF-FEAS';
export default {
  id: 'NC-VF-70', criterion: ID,
  expectRed: [...new Set(Object.values(faults).flatMap((f) => f.labels))].map((l) => `${ID}/${l}`),
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mayEdit: ['tests/baseline/feasibility_baked_bands.json'],      // fault bands_reported edits its `failing` list, which IS the thing under test (the runner bars other tests/baseline/** edits, VF 3.13)
  mutate(c) { for (const f of Object.values(faults)) f.apply(c); },
  run: ['node', 'tests/golden/feasibility_record.test.mjs'],
};
