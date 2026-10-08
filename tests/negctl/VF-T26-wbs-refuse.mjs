// NC-VF-T26-wbs-refuse: --paste pastes a breakdown that fails its checks
export default {
  id: 'NC-VF-T26-wbs-refuse', criterion: 'VF-T26-wbs',
  expectRed: ['VF-T26-wbs/cli_paste_refuses_a_failing_breakdown'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/wbs.mjs', /if \(bad\) \{ console\.error\('refusing to paste a breakdown that fails its checks \(run --check\)'\); return 1; \}/, '');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
