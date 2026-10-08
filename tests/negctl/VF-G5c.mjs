// Negative control of the G5 customs cost golden (VF 3.13; NC-VF-68 here). One fault per label of tests/golden/g5_customs.test.mjs, all applied at once; each fault is also run alone
// (named export `faults`). The record is edited through JSON (canonical text again).
//   recorded_from_baseline  the record claims a dirty checkout
//   shape                   the record claims 199 customs
//   internal_sha (+summary) the recorded summary no longer matches the recorded rows (a hand edit)
//   no_warnings             a recorded soldier carries an unknown main-hand part (the saved look "is not valid any more")
//   costs                   the cost formula adds 1 drachma to every soldier
//   derived                 power() is scaled by 1.001 (a power rating the Workshop shows moves)
//   rev                     the model revision hash gets a salt
import { canonicalJSON } from '../../tools/lib/records.mjs';
const REC = 'tests/golden/g5_customs.json';
const rec = (fn) => (c) => c.edit(REC, /^[\s\S]*$/, (text) => { const j = JSON.parse(text); fn(j); return canonicalJSON(j) + '\n'; });
export const faults = {
  recorded_from_baseline: { labels: ['recorded_from_baseline'], apply: rec((j) => { j.dirty = true; }) },
  shape: { labels: ['shape'], apply: rec((j) => { j.data.n = 199; }) },
  internal_sha: { labels: ['internal_sha', 'summary'], also: [], apply: rec((j) => { j.data.summary.sumCost += 1; }) },
  no_warnings: { labels: ['no_warnings'], also: ['costs', 'derived', 'rev', 'summary'], apply: rec((j) => { j.data.customs[3].blueprint.main = 'no_such_weapon'; }) },
  costs: { labels: ['costs'], also: ['derived', 'summary'], apply: (c) => c.edit('src/sim/stats.js', /return Math\.max\(10, Math\.round\(K\(\) \* rawCost\(def\)\)\);/, 'return Math.max(10, Math.round(K() * rawCost(def))) + 1;') },
  derived: { labels: ['derived'], also: ['costs', 'summary'], apply: (c) => c.edit('src/sim/power.js', /return Math\.sqrt\(hpEff\(def, hp === undefined \? def\.hp : hp\) \* dpsOf\(def\)\);/, 'return 1.001 * Math.sqrt(hpEff(def, hp === undefined ? def.hp : hp) * dpsOf(def));') },
  rev: { labels: ['rev'], also: ['summary'], apply: (c) => c.edit('src/content/era_ancient/custom.js', /d\.rev = hashString\(JSON\.stringify\(\[bp, n\.height,/, 'd.rev = hashString("salt" + JSON.stringify([bp, n.height,') },
};
const ID = 'VF-G5c';
export default {
  id: 'NC-VF-68', criterion: ID,
  expectRed: [...new Set(Object.values(faults).flatMap((f) => f.labels))].map((l) => `${ID}/${l}`),
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 6,
  mutate(c) { for (const f of Object.values(faults)) f.apply(c); },
  run: ['node', 'tests/golden/g5_customs.test.mjs'],
};
