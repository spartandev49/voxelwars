// NC-VF-T26-p0-P0E-02: P0E-02: a golden criterion that is not PASS is accepted
export default {
  id: 'NC-VF-T26-p0-P0E-02', criterion: 'VF-T26-p0exit',
  expectRed: ['VF-T26-p0exit/P0E-02_fail'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/p0_exit.mjs', /else if \(e\.status !== 'PASS'\) d\.push/, 'else if (false) d.push');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
