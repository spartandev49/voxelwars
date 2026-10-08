// NC-VF-12 (docs/eras/spec/VF.md 3.13): one extra w.rng.next() inside applyDamage for ranged hits -> g1/chain must go red (the first diverging tick is named in the message).
export default {
  id: 'NC-VF-12', criterion: 'VF-T03',
  expectRed: ['VF-T03/g1/chain'],
  alsoRed: ['VF-T03/g1/digest_equal', 'VF-T03/g1/walk', 'VF-T03/g1/evhash', 'VF-T03/g1/tuple'],
  tier: 'T-fast', needs: [], costS: 10,
  mutate(c) { c.edit('src/sim/combat.js', /(let raw = base \* \(0\.9 \+ w\.rng\.next\(\) \* 0\.2\);)/, '$1 if (o.proj) w.rng.next();'); },
  run: ['node', 'tests/golden/g1_sim.test.mjs', '--case=A-marathon-normal'],
};
