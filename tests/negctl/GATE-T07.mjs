// NC-VF-06 (docs/eras/spec/VF.md 3.13): the 5,000,000 B cap stops biting (a fragment of 5,000,001 B passes) -> size / fragment_cap must go red.
export default {
  id: 'NC-VF-06', criterion: 'GATE-T07',
  expectRed: ['GATE-T07/fragment_cap'],
  tier: 'T-fast', needs: [], costS: 4,
  mutate(c) { c.edit('tools/lib/size_budget.mjs', /ok: report\.fragmentBytes <= FRAGMENT_FAIL, level: 'fail'/, 'ok: report.fragmentBytes <= FRAGMENT_FAIL * 2, level: "fail"'); },
  run: ['node', 'tests/gate/size.test.mjs'],
};
