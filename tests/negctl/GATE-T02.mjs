// NC-GATE-02 (docs/eras/spec/VF.md 3.13): remove the serial-group exclusion from the scheduler -> two timing-sensitive tests run at once: lanes / serial_exclusive must go red.
export default {
  id: 'NC-GATE-02', criterion: 'GATE-T02',
  expectRed: ['GATE-T02/serial_exclusive'],
  tier: 'T-fast', needs: [], costS: 4,
  mutate(c) { c.edit('tools/lib/lanes.mjs', /\n\s*if \(serialBusy\) continue;/, ''); },
  run: ['node', 'tests/gate/lanes.test.mjs'],
};
