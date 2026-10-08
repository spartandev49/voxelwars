// NC-VF-T13d: a new criterion is registered without regenerating the manifest: the committed tables drift from the tree.
export default {
  id: 'NC-VF-T13d', criterion: 'VF-T13d',
  expectRed: ['VF-T13d/manifest_current'],
  alsoRed: [],
  tier: 'T-full', needs: [], costS: 6,
  mutate(c) { c.write('tests/verify/zz_drift.test.mjs', "import { criterion } from '../lib/criteria.mjs';\ncriterion('ZZ-DRIFT', { er: ['gate'], owner: 'T', tier: 'T-fast' });\n"); },
  run: ['node', 'tests/verify/registry_drift.slow.test.mjs'],
};
