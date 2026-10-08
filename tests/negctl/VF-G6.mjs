// Negative control of the G6 campaign replay (VF 3.13: every golden has one; NC-VF-67 here). One fault per label of tests/golden/g6_campaign.test.mjs, all applied at once;
// each fault is also run alone (named export `faults`; tests/verify/negctl_faults.mjs-style runs use it). The record is edited through JSON (canonical text again), so a
// fault never depends on the file layout.
//   recorded_from_baseline  the record claims to come from a dirty checkout
//   shape                   the record claims the harness workaround was applied
//   mission_data            the recorded missionHash of mission 1 differs (the Ancient mission data "changed")
//   reference_groups        the frozen group list of mission 2 (thermopylae_snack, a reference mission) differs from mission.reference (and from its layout: also `layout`)
//   layout                  layoutArmy spaces ranks differently: the stored placements no longer equal it AND the enemy laid out by setupMission moves, so every battle diverges
//   legacy_hash             World.stateHash() gets one more mixed value (the frozen legacy body no longer equals it; nothing else uses stateHash)
//   outcomes                the recorded `spent` of alps_elephant differs
//   times                   the recorded end time of alps_elephant differs
//   chain / walk / final    one recorded legacy-chain / statwalk-chain / final-hash value of alps_elephant differs
//   sim                     (VF-G6-sim.mjs) one extra rng draw inside applyDamage: every battle diverges
import { canonicalJSON } from '../../tools/lib/records.mjs';
const REC = 'tests/golden/g6_campaign.node.baked.json';
const rec = (fn) => (c) => c.edit(REC, /^[\s\S]*$/, (text) => { const j = JSON.parse(text); fn(j); return canonicalJSON(j) + '\n'; });
export const faults = {
  recorded_from_baseline: { labels: ['recorded_from_baseline'], apply: rec((j) => { j.dirty = true; }) },
  shape: { labels: ['shape'], apply: rec((j) => { j.data.workaround = 'applied'; }) },
  mission_data: { labels: ['mission_data'], apply: rec((j) => { j.data.inputs.missions[0].hash = 'c2ce5c91'; }) },
  reference_groups: { labels: ['reference_groups'], also: ['layout'], apply: rec((j) => { j.data.inputs.missions[1].groups[0][1] += 1; }) },
  layout: { labels: ['layout'], also: ['outcomes', 'times', 'chain', 'walk', 'final'], apply: (c) => c.edit('src/sim/armygen.js', /opts\.spacing \|\| 1\.15/, 'opts.spacing || 1.2') },
  legacy_hash: { labels: ['legacy_hash'], apply: (c) => c.edit('src/sim/world.js', /mix\(this\.rng\.s\); mix\(this\.tickN\);/, 'mix(this.rng.s); mix(this.tickN); mix(7);') },
  outcomes: { labels: ['outcomes'], apply: rec((j) => { j.data.results.alps_elephant.result.spent += 1; }) },
  times: { labels: ['times'], apply: rec((j) => { j.data.results.alps_elephant.result.t += 0.05; }) },
  chain: { labels: ['chain'], apply: rec((j) => { j.data.results.alps_elephant.chain[0] += 1; }) },
  walk: { labels: ['walk'], apply: rec((j) => { j.data.results.alps_elephant.walk[1] += 1; }) },
  final: { labels: ['final'], apply: rec((j) => { j.data.results.alps_elephant.final += 1; }) },
  sim: { labels: ['times', 'chain', 'walk', 'final'], also: ['outcomes'], apply: (c) => c.edit('src/sim/combat.js', /let raw = base \* \(0\.9 \+ w\.rng\.next\(\) \* 0\.2\);/, 'w.rng.next(); let raw = base * (0.9 + w.rng.next() * 0.2);') },
};
const ID = 'VF-G6';
const combined = ['recorded_from_baseline', 'shape', 'mission_data', 'reference_groups', 'layout', 'legacy_hash', 'outcomes', 'times', 'chain', 'walk', 'final'];
export default {
  id: 'NC-VF-67', criterion: ID,
  expectRed: combined.flatMap((k) => faults[k].labels).filter((v, i, a) => a.indexOf(v) === i).map((l) => `${ID}/${l}`),
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 30,
  mutate(c) { for (const k of combined) faults[k].apply(c); },
  run: ['node', 'tests/golden/g6_campaign.test.mjs'],
};
