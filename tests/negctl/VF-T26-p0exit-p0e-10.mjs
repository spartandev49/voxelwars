// NC-VF-T26-p0-P0E-10: P0E-10: a stale wbs block in plan section 12 is accepted
export default {
  id: 'NC-VF-T26-p0-P0E-10', criterion: 'VF-T26-p0exit',
  expectRed: ['VF-T26-p0exit/P0E-10_fail'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/p0_exit.mjs', /return have === want \? OK\(/, 'return true ? OK(');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
