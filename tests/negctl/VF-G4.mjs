// NC-VF-63 (VF 3.13: "change one character of an Ancient blurb -> g4/module_hash"), extended to one fault per label of tests/golden/g4_text.test.mjs:
//   module_hash + export_hashes + key_hashes   the first character of the Hoplite blurb changes ('A farmer' -> 'B farmer')
//   announcer_order                            the announcer pool is reversed in place (same lines, other order)
//   functions                                  the exported function resultLabel loses its `export`
//   module_set                                 the record claims 485 announcer templates
//   recorded_from_baseline                     the record claims to come from a dirty checkout
export default {
  id: 'NC-VF-63', criterion: 'VF-G4',
  expectRed: ['VF-G4/module_hash', 'VF-G4/export_hashes', 'VF-G4/key_hashes', 'VF-G4/announcer_order', 'VF-G4/functions', 'VF-G4/module_set', 'VF-G4/recorded_from_baseline'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 3,
  mutate(c) {
    c.edit('src/content/era_ancient/humor/units_text.js', /blurb: 'A farmer with a bronze mortgage/, "blurb: 'B farmer with a bronze mortgage");
    c.edit('src/content/era_ancient/humor/announcer.js', /\s*$/, '\nTEMPLATES.reverse();\n');
    c.edit('src/content/era_ancient/humor/results_text.js', /export function resultLabel/, 'function resultLabel');
    c.edit('tests/golden/g4_text.json', /"count": 486/, '"count": 485');
    c.edit('tests/golden/g4_text.json', /"dirty": false/, '"dirty": true');
  },
  run: ['node', 'tests/golden/g4_text.test.mjs'],
};
