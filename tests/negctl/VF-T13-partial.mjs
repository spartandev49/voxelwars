// NC-VF-T13-partial: the roll-up never reports PARTIAL(x/y) for members of a tier above the run: the ER reads PASS on a lower-tier run.
export default {
  id: 'NC-VF-T13-partial', criterion: 'VF-T13',
  expectRed: ['VF-T13/er_partial_when_run_tier_is_below'],
  alsoRed: ['VF-T13/finalize_is_idempotent_and_refreshes'],
  tier: 'T-fast', needs: [], costS: 4,
  mutate(c) {
  c.edit('tools/lib/er_rollup.mjs', /else if \(partial\) \{ status/, 'else if (false) { status');
  },
  run: ['node', 'tests/verify/criteria.test.mjs'],
};
