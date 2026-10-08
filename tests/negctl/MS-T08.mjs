// NC-MS-T08: the unit-id check of the lint is switched off -> the three negative controls that plant an unknown unit id must go red (a lint that accepts unknown ids is the failure Q2 names).
export default {
  id: 'NC-MS-T08', criterion: 'MS-T08',
  expectRed: ['MS-T08/neg_R01_unknown_unit_roster', 'MS-T08/neg_R01_unknown_unit_enemy', 'MS-T08/neg_Z02_puzzle_unit'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 6,
  mutate(c) { c.edit('tools/ms_lint.mjs', /const needUnit = \(id, p\) => \{ if \(!units\[id\]\)/, 'const needUnit = (id, p) => { if (false && !units[id])'); },
  run: ['node', 'tests/campaign/ms.test.mjs'],
};
