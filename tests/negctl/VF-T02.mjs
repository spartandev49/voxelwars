// NC-VF-62: tolerance floor only (drop the 2.58 SE term of compareStats) -> compare_stats/identical_pairs must go red (identical populations then fail like the old 3-point / 2% rule).
export default {
  id: 'NC-VF-62', criterion: 'VF-T02',
  expectRed: ['VF-T02/compare_stats/identical_pairs'],
  alsoRed: ['VF-T02/compare_stats/formula', 'VF-T02/compare_stats/n600_tighter'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) { c.edit('tools/lib/records.mjs', /z = 2\.58/, 'z = 0'); },
  run: ['node', 'tests/golden/lib.test.mjs'],
};
