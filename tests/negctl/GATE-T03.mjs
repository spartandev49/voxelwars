// NC-VF-56 (docs/eras/spec/VF.md 3.13): the cache key stops covering the closure files -> a changed import no longer changes the key (stale PASS served): gate_cache / miss_on_closure_change must go red.
export default {
  id: 'NC-VF-56', criterion: 'GATE-T03',
  expectRed: ['GATE-T03/miss_on_closure_change'],
  tier: 'T-fast', needs: [], costS: 6,
  mutate(c) { c.edit('tools/lib/gate_cache.mjs', /\n  for \(const f of analysis\.files\) parts\.push\(`\$\{f\}:\$\{index\.sha\.get\(f\)\}`\);/, ''); },
  run: ['node', 'tests/gate/cache.test.mjs'],
};
