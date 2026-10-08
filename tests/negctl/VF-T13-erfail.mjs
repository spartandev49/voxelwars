// NC-VF-T13-erfail: the ER roll-up no longer lets a FAIL member decide: the ER reads UNVERIFIED instead.
export default {
  id: 'NC-VF-T13-erfail', criterion: 'VF-T13',
  expectRed: ['VF-T13/er_fail_beats_unverified'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 4,
  mutate(c) {
  c.edit('tools/lib/er_rollup.mjs', /if \(fail\) \{ status = 'FAIL'/, "if (false) { status = 'FAIL'");
  },
  run: ['node', 'tests/verify/criteria.test.mjs'],
};
