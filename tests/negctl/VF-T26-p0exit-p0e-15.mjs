// NC-VF-T26-p0-P0E-15: P0E-15: one REVIEWER instance is enough
export default {
  id: 'NC-VF-T26-p0-P0E-15', criterion: 'VF-T26-p0exit',
  expectRed: ['VF-T26-p0exit/P0E-15_fail'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/p0_exit.mjs', /return inst\.size >= 2 \?/, 'return inst.size >= 1 ?');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
