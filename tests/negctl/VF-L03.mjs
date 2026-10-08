// NC-VF-L03: build.mjs no longer writes files.manifest.json -> build_manifest/exists must go red.
export default {
  id: 'NC-VF-L03', criterion: 'VF-L03',
  expectRed: ['VF-L03/exists'],
  alsoRed: [],
  tier: 'T-fast', needs: ['baseline', 'build'], costS: 12,
  mutate(c) { c.edit('tools/build.mjs', /fs\.writeFileSync\([^;\n]*files\.manifest\.json[^;\n]*\);/, ''); },
  run: ['node', 'tests/golden/lib.test.mjs'],
};
