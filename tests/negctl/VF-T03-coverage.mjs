// NC-VF-G1-coverage: the core selection silently drops one case (11 of 12 run) -> g1/coverage must go red; an all-green run over fewer battles than promised is the vacuous pass.
export default {
  id: 'NC-VF-G1-coverage', criterion: 'VF-T03',
  expectRed: ['VF-T03/g1/coverage'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 20,
  mutate(c) { c.edit('tools/golden/g1_lib.mjs', /\? fx\.cases\.filter\(\(c\) => fx\.core\.includes\(c\.id\)\)/, '? fx.cases.filter((c) => fx.core.includes(c.id)).slice(1)'); },
  run: ['node', 'tests/golden/g1_sim.test.mjs'],
};
