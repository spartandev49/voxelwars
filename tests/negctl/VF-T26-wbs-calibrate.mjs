// NC-VF-T26-wbs-calibrate: CONTINUE is returned up to the capacity of ALL rungs instead of rungs 1-3
export default {
  id: 'NC-VF-T26-wbs-calibrate', criterion: 'VF-T26-wbs',
  expectRed: ['VF-T26-wbs/ladder_and_calibration_in_sessions'],
  alsoRed: ['VF-T26-wbs/cli_calibrate'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/wbs.mjs', /if \(overrunSessions <= L\.capacity13\) return 'CONTINUE';/, "if (overrunSessions <= L.capacityAll) return 'CONTINUE';");
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
