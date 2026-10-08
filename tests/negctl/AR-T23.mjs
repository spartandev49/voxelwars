// AR-T23 negative control (AR 3.7.5 / 4): a Node record and a Chromium record are compared as class (a) -> records.cross_engine must go red.
// Mutation: the engine field is dropped from the class (a) comparison (the engine MAJOR check alone still catches the realistic pair, so the same-version pair is what turns red).
export default {
  id: 'NC-AR-T23', criterion: 'AR-T23',
  expectRed: ['AR-T23/records.cross_engine'],
  alsoRed: ['AR-T23/records.cross_engine_message'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) { c.edit('tools/lib/records.mjs', /\n\s*d\('engine', a\.engine, b\.engine\);/, ''); },
  run: ['node', 'tests/golden/lib.test.mjs'],
};
