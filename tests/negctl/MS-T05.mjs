// NC-MS-T05: the lint's objective-marker rule is inverted (fires when the marker EXISTS) -> the Ancient exemplar is rejected, so the acceptance check must go red.
export default {
  id: 'NC-MS-T05', criterion: 'MS-T05',
  expectRed: ['MS-T05/lint_accepts_ancient'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 6,
  mutate(c) { c.edit('tools/ms_lint.mjs', /if \(needType && !m\.arena\.markers\.some\(\(k\) => k\.type === needType\)\)/, 'if (needType && m.arena.markers.some((k) => k.type === needType))'); },
  run: ['node', 'tests/campaign/ms.test.mjs'],
};
