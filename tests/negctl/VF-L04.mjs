// NC-VF-L04: one byte of boot text changes in build.mjs -> the Ancient build no longer reproduces the v8 page: VF-L04/fragment_identical must go red.
export default {
  id: 'NC-VF-L04', criterion: 'VF-L04',
  expectRed: ['VF-L04/fragment_identical'],
  alsoRed: [],
  tier: 'T-fast', needs: ['baseline', 'build'], costS: 12,
  mutate(c) { c.edit('tools/build.mjs', /Polishing helmets/, 'Polishing helmets!'); },
  run: ['node', 'tests/golden/lib.test.mjs'],
};
