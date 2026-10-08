// NC-VF-T13-u3: U3 (no negative control file) is switched off: a check without a control passes the merge.
export default {
  id: 'NC-VF-T13-u3', criterion: 'VF-T13',
  expectRed: ['VF-T13/U3_no_negctl'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 4,
  mutate(c) {
  c.edit('tools/lib/criteria_merge.mjs', /else if \(!negPath \|\| !fs\.existsSync\(negPath\)\)/, 'else if (false)');
  },
  run: ['node', 'tests/verify/criteria.test.mjs'],
};
