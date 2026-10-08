// NC-GATE-06 (docs/eras/spec/VF.md 3.13): a private build also creates the shared dist/ -> build / private_build_leaves_shared_files_alone must go red.
export default {
  id: 'NC-GATE-06', criterion: 'GATE-T06',
  expectRed: ['GATE-T06/private_build_leaves_shared_files_alone'],
  tier: 'T-fast', needs: [], costS: 40,
  mutate(c) { c.edit('tools/build.mjs', /(fs\.mkdirSync\(path\.join\(outDir, 'artifact'\), \{ recursive: true \}\);)/, '$1\nfs.mkdirSync(path.join(root, "dist"), { recursive: true });'); },
  run: ['node', 'tests/gate/build.test.mjs'],
};
