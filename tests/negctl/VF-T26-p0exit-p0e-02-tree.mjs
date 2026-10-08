// NC-VF-T26-p0-P0E-02-tree: P0E-02: a criteria.json produced for another tree is accepted
export default {
  id: 'NC-VF-T26-p0-P0E-02-tree', criterion: 'VF-T26-p0exit',
  expectRed: ['VF-T26-p0exit/P0E-02_er1_stale_and_unregistered'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/p0_exit.mjs', /else if \(crit\.run && crit\.run\.treeHash !== th\)/, 'else if (false)');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
