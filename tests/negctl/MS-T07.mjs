// NC-MS-T07: legacyPar() maps every par type to its value (a time par of 150 s would be shown as 150 drachmae and enter missionHash) -> the par mapping check must go red.
export default {
  id: 'NC-MS-T07', criterion: 'MS-T07',
  expectRed: ['MS-T07/ancient_star_table'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 6,
  mutate(c) { c.edit('tools/ms_lint.mjs', /export const legacyPar = \(par\) => \(par && par\.type === 'cost' \? par\.value : 0\);/, 'export const legacyPar = (par) => (par ? par.value : 0);'); },
  run: ['node', 'tests/campaign/ms.test.mjs'],
};
