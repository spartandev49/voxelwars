// NC-MS-T09: the curve rule "a star-3 may test only mechanics taught EARLIER" (MS-C03) is switched off -> the new-era negative control for it must go red.
export default {
  id: 'NC-MS-T09', criterion: 'MS-T09',
  expectRed: ['MS-T09/neg_medieval_C03_tests_later_mechanic'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 6,
  mutate(c) { c.edit('tools/ms_lint.mjs', /for \(const t of m\.tests\) if \(!ancient && !\(taughtAt\[t\]/, 'for (const t of m.tests) if (false && !ancient && !(taughtAt[t]'); },
  run: ['node', 'tests/campaign/ms.test.mjs'],
};
