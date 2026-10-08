// NC-VF-G1-pin: the frozen legacy hash copy is edited (mixes one field fewer) -> g1/legacy_pin must go red, and so do the chain digests computed with it.
export default {
  id: 'NC-VF-G1-pin', criterion: 'VF-T03',
  expectRed: ['VF-T03/g1/legacy_pin'],
  alsoRed: ['VF-T03/g1/legacy_hash', 'VF-T03/g1/chain', 'VF-T03/g1/digest_equal'],
  tier: 'T-fast', needs: [], costS: 8,
  mutate(c) { c.edit('tests/golden/legacy_hash.mjs', /mix\(u\.hp\); /, ''); },
  run: ['node', 'tests/golden/g1_sim.test.mjs', '--case=A-alpine-easy'],
};
