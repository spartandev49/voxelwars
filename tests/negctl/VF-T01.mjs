// NC-VF-61 (docs/eras/spec/VF.md 3.13): flip one byte of a copy of release/v8/index.html (one letter of the <title>; the packed payload stays valid)
// -> provenance/page_sha must go red. The seeded-defect and rebuild sections of the same test start from the damaged page, so one label of each turns red too (alsoRed).
export default {
  id: 'NC-VF-61', criterion: 'VF-T01',
  expectRed: ['VF-T01/provenance/page_sha'],
  alsoRed: ['VF-T01/defect/page_size_note', 'VF-T01/rebuild/baseline_cmp_identical'],
  tier: 'T-fast', needs: ['baseline'], costS: 40,
  mutate(c) { c.edit('release/v8/index.html', /<title>VOXELWARS<\/title>/, '<title>VOXELWARR</title>'); },
  run: ['node', 'tests/verify/provenance_tool.test.mjs'],
};
