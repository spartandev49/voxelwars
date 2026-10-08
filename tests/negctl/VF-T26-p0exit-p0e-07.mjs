// NC-VF-T26-p0-P0E-07: P0E-07: a plan section 14 state is accepted whatever it says
export default {
  id: 'NC-VF-T26-p0-P0E-07', criterion: 'VF-T26-p0exit',
  expectRed: ['VF-T26-p0exit/P0E-07_fail'],
  alsoRed: ['VF-T26-p0exit/P0E-07_draft_without_a_gate'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/p0_exit.mjs', /if \(!\(\/\^final\\b\/\.test\(state\) \|\| \/\\bdraft until \[a-z0-9\]\[\^;,\]\*\/\.test\(state\)\)\)/, 'if (false)');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
