// NC-GATE-05 (docs/eras/spec/VF.md 3.13): failing tests no longer make the gate red -> a run with a failing test exits 0: gate_cli / red_exit_1 must go red.
export default {
  id: 'NC-GATE-05', criterion: 'GATE-T05',
  expectRed: ['GATE-T05/red_exit_1'],
  tier: 'T-fast', needs: [], costS: 25,
  mutate(c) { c.edit('tools/gate.mjs', /const red = \[\.\.\.stepFail\.map\(\(r\) => r\.name\), \.\.\.tFail\.map\(\(r\) => r\.name\)\];/, 'const red = [...stepFail.map((r) => r.name)];'); },
  run: ['node', 'tests/gate/gate_cli.test.mjs'],
};
