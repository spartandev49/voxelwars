// NC-VF-G1-exercise: the record says the boulder case never launched a boulder (a D case that exercises nothing) -> g1/exercise must go red.
export default {
  id: 'NC-VF-G1-exercise', criterion: 'VF-T03',
  expectRed: ['VF-T03/g1/exercise'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 8,
  mutate(c) { c.edit('tests/golden/g1_digests.node.baked.json', /("boulder": )\d+/, '$10'); },
  run: ['node', 'tests/golden/g1_sim.test.mjs', '--case=A-alpine-easy'],
};
