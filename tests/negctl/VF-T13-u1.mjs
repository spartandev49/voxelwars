// NC-VF-T13-u1: U1 (declared in the manifest, not executed) is never raised: a missing test cannot hold an ER back.
export default {
  id: 'NC-VF-T13-u1', criterion: 'VF-T13',
  expectRed: ['VF-T13/U1_not_executed_when_run_tier_reaches_it'],
  alsoRed: ['VF-T13/finalize_adds_stub_and_er', 'VF-T13/finalize_is_idempotent_and_refreshes'],
  tier: 'T-fast', needs: [], costS: 4,
  mutate(c) {
  c.edit('tools/lib/er_rollup.mjs', /if \(tierRank\(c\.tier\) <= runTierRank\) stubs/, 'if (false) stubs');
  },
  run: ['node', 'tests/verify/criteria.test.mjs'],
};
