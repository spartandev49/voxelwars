// G6 negative control with a real SIM fault (VF 3.13 NC-12 shape: "one extra w.rng.next() inside applyDamage"): every battle diverges, so the recorded chains, hashes and
// end times no longer reproduce. Labels that only depend on the record's own fields (shape, layout, ...) stay green. `outcomes` is allowed to turn red as well.
import { faults } from './VF-G6.mjs';
export default {
  id: 'NC-VF-12-g6', criterion: 'VF-G6',
  expectRed: faults.sim.labels.map((l) => `VF-G6/${l}`),
  alsoRed: faults.sim.also.map((l) => `VF-G6/${l}`).filter((x) => x !== 'VF-G6/layout' && x !== 'VF-G6/legacy_hash'),
  tier: 'T-fast', needs: [], costS: 30,
  mutate(c) { faults.sim.apply(c); },
  run: ['node', 'tests/golden/g6_campaign.test.mjs'],
};
