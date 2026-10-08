// NC-MS-T10: the lint gains a rule code that spec/MS.md does not define -> the spec-sync check must go red (the spec cannot rot behind the code).
export default {
  id: 'NC-MS-T10', criterion: 'MS-T10',
  expectRed: ['MS-T10/spec_md_in_sync'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 6,
  mutate(c) { c.edit('tools/ms_lint.mjs', /  'MS-V01': \['I',/, "  'MS-Z99': ['E', 'a rule the spec does not know'],\n  'MS-V01': ['I',"); },
  run: ['node', 'tests/campaign/ms.test.mjs'],
};
