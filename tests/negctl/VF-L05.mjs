// NC-VF-L05: the runner calls every outcome red-as-expected -> VF-L05/stayed_green must go red (a control runner that cannot fail proves nothing).
export default {
  id: 'NC-VF-L05', criterion: 'VF-L05',
  expectRed: ['VF-L05/stayed_green'],
  alsoRed: ['VF-L05/wrong_red', 'VF-L05/also_red'],
  tier: 'T-full', needs: [], costS: 60,
  mutate(c) { c.edit('tools/lib/negctl_lite.mjs', /missing\.length === 0 && extra\.length === 0 \? 'red-as-expected'/, "true ? 'red-as-expected'"); },
  run: ['node', 'tests/golden/negctl_lite.test.mjs'],
};
