// NC-VF-59 (docs/eras/spec/VF.md 3.13): replace the in-process syntax checker by an identity stub (it accepts everything) -> the six bad fixtures are no longer rejected: syntax-nc / rejects_all_six must go red.
export default {
  id: 'NC-VF-59', criterion: 'GATE-T01',
  expectRed: ['GATE-T01/rejects_all_six'],
  tier: 'T-fast', needs: [], costS: 4,
  mutate(c) { c.edit('tools/lib/syntax.mjs', /await transform\(text,/, 'await Promise.resolve(text,'); },
  run: ['node', 'tests/gate/syntax.test.mjs'],
};
