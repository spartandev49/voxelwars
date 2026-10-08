// NC-VF-T13-u4: U4 stops comparing the script hash of the stored proof with the current script: an edited check keeps its old proof.
export default {
  id: 'NC-VF-T13-u4', criterion: 'VF-T13',
  expectRed: ['VF-T13/U4_script_hash_changed'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 4,
  mutate(c) {
  c.edit('tools/lib/criteria_merge.mjs', /\(neg\.scriptHash && l\.scriptHash && neg\.scriptHash !== l\.scriptHash\)/, 'false');
  },
  run: ['node', 'tests/verify/criteria.test.mjs'],
};
