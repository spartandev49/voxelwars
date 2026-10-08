// NC-VF-T13-scan: the manifest scan no longer ignores criterion( text inside comments, strings, templates and regex literals.
export default {
  id: 'NC-VF-T13-scan', criterion: 'VF-T13',
  expectRed: ['VF-T13/manifest_finds_code_calls_only'],
  alsoRed: ['VF-T13/codeMask_and_findCalls'],
  tier: 'T-fast', needs: [], costS: 4,
  mutate(c) {
  c.edit('tools/lib/er_rollup.mjs', /if \(!mask\[m\.index\]\) continue;/, '');
  },
  run: ['node', 'tests/verify/criteria.test.mjs'],
};
