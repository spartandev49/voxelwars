// NC-VF-T26-wbs-paste: --paste appends instead of replacing the block between the markers
export default {
  id: 'NC-VF-T26-wbs-paste', criterion: 'VF-T26-wbs',
  expectRed: ['VF-T26-wbs/paste_replaces_only_the_block'],
  alsoRed: ['VF-T26-wbs/cli_paste_needs_markers_then_inserts_them', 'VF-T26-wbs/pasted_block_passes_PL12', 'VF-T26-wbs/tampered_block_fails_PL12'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/wbs.mjs', /return t\.slice\(0, a \+ BEGIN\.length\) \+ '\\n' \+ block \+ '\\n' \+ t\.slice\(b\);/, 'return t + block;');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
