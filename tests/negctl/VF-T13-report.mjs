// NC-VF-T13-report: a section heading of the generated report changes: the golden fixture and the section order must notice.
export default {
  id: 'NC-VF-T13-report', criterion: 'VF-T13',
  expectRed: ['VF-T13/report_golden_fixture'],
  alsoRed: ['VF-T13/report_sections_in_order'],
  tier: 'T-fast', needs: [], costS: 4,
  mutate(c) {
  c.edit('tools/report.mjs', /'## 3\. UNVERIFIED and PANEL'/, "'## 3. Unverified'");
  },
  run: ['node', 'tests/verify/criteria.test.mjs'],
};
