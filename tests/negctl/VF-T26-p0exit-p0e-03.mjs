// NC-VF-T26-p0-P0E-03: P0E-03: the engine hash comparison is skipped: a changed src/sim byte passes (VF 3.21: --engine-edit fails on a changed src/sim byte)
export default {
  id: 'NC-VF-T26-p0-P0E-03', criterion: 'VF-T26-p0exit',
  expectRed: ['VF-T26-p0exit/P0E-03_fail'],
  alsoRed: ['VF-T26-p0exit/engine_edit_fails_on_a_changed_src_sim_byte', 'VF-T26-p0exit/cli_exit_codes_and_json'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/p0_exit.mjs', /if \(a\.simCore !== b\.simCore\) d\.push/, 'if (false) d.push');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
