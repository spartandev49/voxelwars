// NC-VF-L02: the walker iterates every own field of a unit instead of the frozen list -> statwalk/extra_field_inert must go red (fields added by later modules would move the witness).
export default {
  id: 'NC-VF-L02', criterion: 'VF-L02',
  expectRed: ['VF-L02/extra_field_inert'],
  alsoRed: [],
  tier: 'T-fast', needs: ['baseline'], costS: 12,
  mutate(c) { c.edit('tools/lib/statwalk_core.mjs', /for \(let k = 0; k < U\.length; k\+\+\) \{ const f = U\[k\];/, 'for (const f of Object.keys(u)) {'); },
  run: ['node', 'tests/golden/lib.test.mjs'],
};
