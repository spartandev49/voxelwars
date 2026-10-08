// NC-MS-T04: the back-fill tool maps the star-3 helper of the first Ancient mission to thrift(2251) instead of thrift(2250) -> the committed missions.json is no longer a current back-fill.
export default {
  id: 'NC-MS-T04', criterion: 'MS-T04',
  expectRed: ['MS-T04/backfill_current'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 6,
  mutate(c) { c.edit('tools/ms_backfill_ancient.mjs', /marathon_sort_of: \['thrift', \[2250\]\]/, "marathon_sort_of: ['thrift', [2251]]"); },
  run: ['node', 'tests/campaign/ms.test.mjs'],
};
