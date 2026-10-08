// NC-MS-T02: the E-FREEZE paragraph of spec/M.md is no longer recognised (regex broken) -> the three freeze positions read 0, so the module test and the context test go red.
export default {
  id: 'NC-MS-T02', criterion: 'MS-T02',
  expectRed: ['MS-T02/modules_from_spec_m'],
  alsoRed: ['MS-T02/ancient_context_current'],
  tier: 'T-fast', needs: [], costS: 6,
  mutate(c) { c.edit('tools/ms_context.mjs', /\^E-FREEZE sets \\\(prefix/, '^E-FREEZE sets \\(prefixX'); },
  run: ['node', 'tests/campaign/ms.test.mjs'],
};
