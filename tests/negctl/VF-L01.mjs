// NC-VF-L01: simCore stops being recursive (the exact defect of the old simHash(), which missed the 30 files of src/sim/abilities/) -> fingerprint/recursion must go red.
export default {
  id: 'NC-VF-L01', criterion: 'VF-L01',
  expectRed: ['VF-L01/recursion'],
  alsoRed: ['VF-L01/simcore_list', 'VF-L01/sensitivity/src/sim/abilities/deep/x.js', 'VF-L01/sensitivity/add_file', 'VF-L01/pin_lists', 'VF-L01/pin_hashes'],
  tier: 'T-fast', needs: ['baseline'], costS: 12,
  mutate(c) { c.edit('tools/lib/fingerprint.mjs', /'src\/sim\/\*\*'/, "'src/sim/*'"); },
  run: ['node', 'tests/golden/lib.test.mjs'],
};
