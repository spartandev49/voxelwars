// NC-VF-T14-pool: the Chromium cap of the pool is removed: three Chromium controls run at once.
export default {
  id: 'NC-VF-T14-pool', criterion: 'VF-T14',
  expectRed: ['VF-T14/pool_chromium_cap_and_quiet_alone'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/lib/negctl.mjs', /\(isChrome && chromium >= chromiumMax\)/, 'false');
  },
  run: ['node', 'tests/verify/negctl_runner.test.mjs'],
};
