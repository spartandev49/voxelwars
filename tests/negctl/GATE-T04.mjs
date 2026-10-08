// NC-GATE-04 (docs/eras/spec/VF.md 3.13): snapshots hard-link instead of copying -> a write inside the snapshot reaches the shared tree: snapshot / snapshot_is_a_copy must go red.
export default {
  id: 'NC-GATE-04', criterion: 'GATE-T04',
  expectRed: ['GATE-T04/snapshot_is_a_copy'],
  tier: 'T-fast', needs: [], costS: 6,
  mutate(c) { c.edit('tools/lib/snapshot.mjs', /fs\.copyFileSync\(path\.join\(srcRoot, f\.path\), to, fs\.constants\.COPYFILE_FICLONE\)/, 'fs.linkSync(path.join(srcRoot, f.path), to)'); },
  run: ['node', 'tests/gate/snapshot.test.mjs'],
};
