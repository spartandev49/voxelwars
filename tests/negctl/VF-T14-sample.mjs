// NC-VF-T14-sample: --sample stops adding the controls whose check script changed since their last proof.
export default {
  id: 'NC-VF-T14-sample', criterion: 'VF-T14',
  expectRed: ['VF-T14/select_always_adds_changed_scripts'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/lib/negctl.mjs', /if \(!pick\.includes\(c\) && isStale\(c, store, s\.scriptHashOf \? s\.scriptHashOf\(c\) : null\)\) pick\.push\(c\);/, '');
  },
  run: ['node', 'tests/verify/negctl_runner.test.mjs'],
};
