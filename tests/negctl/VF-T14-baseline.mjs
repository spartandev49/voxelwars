// NC-VF-T14-baseline: the unmutated run is no longer required to be green: a check that is already red passes for proven.
export default {
  id: 'NC-VF-T14-baseline', criterion: 'VF-T14',
  expectRed: ['VF-T14/classify_baseline_red'],
  alsoRed: ['VF-T14/baseline_red_when_criterion_not_registered'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/lib/negctl.mjs', /if \(bad\) return fin\(\{ result: 'baseline-red'/, "if (false) return fin({ result: 'baseline-red'");
  },
  run: ['node', 'tests/verify/negctl_runner.test.mjs'],
};
