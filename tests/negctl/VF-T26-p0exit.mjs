// NC-VF-T26-p0exit: --engine-edit stops including P0E-03: the check that proves no engine edit is no longer part of the gate before the first src edit.
export default {
  id: 'NC-VF-T26-p0exit', criterion: 'VF-T26-p0exit',
  expectRed: ['VF-T26-p0exit/check_lists'],
  alsoRed: ['VF-T26-p0exit/engine_edit_fails_on_a_changed_src_sim_byte'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/p0_exit.mjs', /export const ENGINE_EDIT = \['P0E-02', 'P0E-03',/, "export const ENGINE_EDIT = ['P0E-02',");
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
