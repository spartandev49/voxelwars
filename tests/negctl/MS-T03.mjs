// NC-MS-T03: the roster parser reads the unit id from the NAME column -> every new-era context loses its units; all three counts must go red.
export default {
  id: 'NC-MS-T03', criterion: 'MS-T03',
  expectRed: ['MS-T03/markdown_context_medieval', 'MS-T03/markdown_context_modern', 'MS-T03/markdown_context_scifi'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 6,
  mutate(c) { c.edit('tools/ms_context.mjs', /const id = idOf\(r\[I\.id\]\); if \(!SNAKE/, 'const id = idOf(r[I.name]); if (!SNAKE'); },
  run: ['node', 'tests/campaign/ms.test.mjs'],
};
