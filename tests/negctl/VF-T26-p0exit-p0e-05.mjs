// NC-VF-T26-p0-P0E-05: P0E-05: the repetition count n = 15 of the noise floor is no longer checked
export default {
  id: 'NC-VF-T26-p0-P0E-05', criterion: 'VF-T26-p0exit',
  expectRed: ['VF-T26-p0exit/P0E-05_fail'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/p0_exit.mjs', /if \(e\.n !== 15\) d\.push\(`\$\{size\} units: n = \$\{e\.n\}, need 15`\);/, '');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
