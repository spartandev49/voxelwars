// NC-VF-T13-drift: `report.mjs --scan --check` stops comparing the committed manifest with the scan: drift would no longer fail the gate.
export default {
  id: 'NC-VF-T13-drift', criterion: 'VF-T13',
  expectRed: ['VF-T13/manifest_drift_fails_the_check'],
  alsoRed: ['VF-T13/manifest_drift_after_a_new_criterion'],
  tier: 'T-fast', needs: [], costS: 4,
  mutate(c) {
  c.edit('tools/report.mjs', /if \(cur !== text\) \{ console\.error\(`DRIFT/, 'if (false) { console.error(`DRIFT');
  },
  run: ['node', 'tests/verify/criteria.test.mjs'],
};
