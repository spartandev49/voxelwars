// NC-GATE-08 (docs/eras/spec/VF.md 3.13): check() stops counting assertions -> criteria / counts_assertions must go red (zero-assertion detection would be blind).
export default {
  id: 'NC-GATE-08', criterion: 'GATE-T08',
  expectRed: ['GATE-T08/counts_assertions'],
  tier: 'T-fast', needs: [], costS: 4,
  mutate(c) { c.edit('tests/lib/criteria.mjs', /(check\(label, cond, msg\) \{\n)      st\.n\+\+;\n/, '$1'); },
  run: ['node', 'tests/gate/criteria.test.mjs'],
};
