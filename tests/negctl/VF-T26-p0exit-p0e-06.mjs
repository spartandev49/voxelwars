// NC-VF-T26-p0-P0E-06: P0E-06: an empty decision field of a spike verdict is accepted
export default {
  id: 'NC-VF-T26-p0-P0E-06', criterion: 'VF-T26-p0exit',
  expectRed: ['VF-T26-p0exit/P0E-06_empty_decision_and_fields'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/p0_exit.mjs', /else if \(\(fieldValue\(text, 'decision'\) \|\| ''\)\.length < 3\)/, 'else if (false)');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
