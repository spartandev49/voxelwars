// NC-VF-G0: one fault per label of tests/golden/golden_tools.test.mjs, all in the recorder plumbing (tools/golden/common.mjs, g7_collect.mjs).
//   help                      --help exits 1
//   exit_codes                an unknown argument exits 0
//   refuses_non_baseline      the baseline-commit check is removed from the recorder (parent and child)
//   determinism_gate          the "two runs must agree" comparison is removed
//   record_roundtrip          --check says PASS whatever the file holds (also trips tamper_detected)
//   checks_reproduce          the G7 recorder points at a file that does not exist (independent of the compare logic, so the faults above cannot mask it;
//                             the drift variant, 399 dates from the collector, was proven red in isolation)
export default {
  id: 'NC-VF-G0', criterion: 'VF-G0',
  expectRed: ['VF-G0/help', 'VF-G0/exit_codes', 'VF-G0/refuses_non_baseline', 'VF-G0/determinism_gate', 'VF-G0/record_roundtrip', 'VF-G0/tamper_detected', 'VF-G0/checks_reproduce'],
  alsoRed: [],
  tier: 'T-fast', needs: ['baseline'], costS: 12,
  mutate(c) {
    c.edit('tools/golden/common.mjs', /console\.log\(helpFrom\(spec\.script\)\); return 0;/, 'console.log(helpFrom(spec.script)); return 1;');
    c.edit('tools/golden/common.mjs', /is not defined|unknown argument: \$\{a\} \(try --help\)`\); return 2;/, 'unknown argument: ${a} (try --help)`); return 0;');
    c.edit('tools/golden/common.mjs', /assertBaseline\(opt\.worktree\)/g, '0');
    c.edit('tools/golden/common.mjs', /if \(A\.text !== B\.text\) \{/, 'if (false) {');
    c.edit('tools/golden/common.mjs', /let ok = dd\.length === 0 && [^;\n]+;/, 'let ok = true;');
    c.edit('tools/golden/g7_record.mjs', /'g7_armygen\.json'/, "'g7_armygen_x.json'");
  },
  run: ['node', 'tests/golden/golden_tools.test.mjs'],
};
