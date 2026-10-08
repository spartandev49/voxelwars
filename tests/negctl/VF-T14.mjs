// NC-VF-71: the write guard of the mutation context is switched off (in-place writes allowed): a mutation can now modify the frozen snapshot (VF 3.13, NC-VF-71).
export default {
  id: 'NC-VF-71', criterion: 'VF-T14',
  expectRed: ['VF-T14/hardlink_safety'],
  alsoRed: ['VF-T14/edit_replaces_link'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/lib/negctl.mjs', /export function withWriteGuard\(dir, fn\) \{/, 'export function withWriteGuard(dir, fn) { return fn();');
  },
  run: ['node', 'tests/verify/negctl_runner.test.mjs'],
};
