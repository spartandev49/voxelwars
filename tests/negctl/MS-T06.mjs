// NC-MS-T06: helper thrift(par) is implemented with `<` instead of `<=` -> the differential fuzz against the real Ancient predicate T.thrift must go red; the mutant table of the
// same check (which contains exactly that mutant) then equals the implementation and is reported as not caught.
export default {
  id: 'NC-MS-T06', criterion: 'MS-T06',
  expectRed: ['MS-T06/helpers_equal_ancient_predicates'],
  alsoRed: ['MS-T06/differential_negative_controls'],
  tier: 'T-fast', needs: [], costS: 8,
  mutate(c) { c.edit('tools/ms_lint.mjs', /thrift: \(s, \[par\]\) => s\.playerCostStart <= par,/, 'thrift: (s, [par]) => s.playerCostStart < par,'); },
  run: ['node', 'tests/campaign/ms.test.mjs'],
};
