// NC-VF-14: the zero-assertion rule (U2) of the merge is switched off: a check that asserts nothing is no longer UNVERIFIED (VF 3.13 row 14).
export default {
  id: 'NC-VF-14', criterion: 'VF-T13',
  expectRed: ['VF-T13/U2_zero_assertions'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 4,
  mutate(c) {
  c.edit('tools/lib/criteria_merge.mjs', /else if \(!l\.assertions\)/, 'else if (false)');
  },
  run: ['node', 'tests/verify/criteria.test.mjs'],
};
