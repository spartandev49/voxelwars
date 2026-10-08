// NC-VF-T26-p0-P0E-04: P0E-04: the median is taken as the fastest run instead of the middle one
export default {
  id: 'NC-VF-T26-p0-P0E-04', criterion: 'VF-T26-p0exit',
  expectRed: ['VF-T26-p0exit/P0E-04_fail'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/p0_exit.mjs', /const med = walls\[1\];/, 'const med = walls[0];');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
