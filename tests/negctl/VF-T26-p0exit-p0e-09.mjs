// NC-VF-T26-p0-P0E-09: P0E-09: weak traceability rows are accepted
export default {
  id: 'NC-VF-T26-p0-P0E-09', criterion: 'VF-T26-p0exit',
  expectRed: ['VF-T26-p0exit/P0E-09_missing_clause_weak_row_unknown_evidence'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/p0_exit.mjs', /if \(ni >= 0 && \/\^W\/\.test\(clean\(r\[ni\] \|\| ''\)\)\)/, 'if (false)');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
