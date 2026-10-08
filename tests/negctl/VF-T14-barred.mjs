// NC-VF-T14-barred: a mutation may edit the check's own script (both guards removed): the check could be made to pass or fail by hand.
export default {
  id: 'NC-VF-T14-barred', criterion: 'VF-T14',
  expectRed: ['VF-T14/barred_edits'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/lib/negctl.mjs', /if \(selfScript && rel === selfScript\) throw new Error\(`[^`]*`\);/, '');
  c.edit('tools/lib/negctl.mjs', /if \(scriptFiles\.includes\(rel\)\) throw new Error\(`[^`]*`\);/, '');
  },
  run: ['node', 'tests/verify/negctl_runner.test.mjs'],
};
