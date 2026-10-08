// NC-VF-T26-p0-P0E-13: P0E-13: the limit of 3 open reds is not enforced
export default {
  id: 'NC-VF-T26-p0-P0E-13', criterion: 'VF-T26-p0exit',
  expectRed: ['VF-T26-p0exit/P0E-13_fail'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/p0_exit.mjs', /if \(open\.length > 3\) d\.push/, 'if (false) d.push');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
