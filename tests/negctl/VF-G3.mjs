// NC-VF-G3 (spec/M NC-X4 and the AR rule zero): one fault per label of tests/golden/g3_ids.test.mjs.
//   def_digests + def_keys    two keys of the def shape swap places (TOP_KEYS 'hp'/'armor'): every def JSON changes and the recorded key order breaks
//   ids_present               the god power 'meteor' is renamed (an Ancient id removed without a tombstone)
//   ids_order                 MUTATORS is reversed in place (same ids, other order)
//   tombstones                the tombstone kind 'cue' disappears from TOMBSTONES
//   ids_owner                 an `era_medieval` directory appears in a tree that has no registry (single-era assumption broken)
//   counts_literal            the ledger fixture claims 44 units
//   recorded_from_baseline    the ledger fixture claims to come from a dirty checkout
//   owner_selftest            the owner check accepts every owner
export default {
  id: 'NC-VF-G3', criterion: 'VF-G3',
  expectRed: ['VF-G3/def_digests', 'VF-G3/def_keys', 'VF-G3/ids_present', 'VF-G3/ids_order', 'VF-G3/tombstones', 'VF-G3/ids_owner', 'VF-G3/counts_literal', 'VF-G3/recorded_from_baseline', 'VF-G3/owner_selftest'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 5,
  mutate(c) {
    c.edit('src/sim/defs.js', /'cost', 'hp', 'armor'/, "'cost', 'armor', 'hp'");
    c.edit('src/sim/godpowers.js', /id: 'meteor'/, "id: 'meteor_x'");
    c.edit('src/sim/mutators.js', /\s*$/, '\nMUTATORS.reverse();\n');
    c.edit('src/save/tombstones.js', /  cue: \{\},\n/, '');
    c.write('src/content/era_medieval/x.js', '// a second era without a registry\n');
    c.edit('tests/fixtures/shipped_ids.json', /"units": 43/, '"units": 44');
    c.edit('tests/fixtures/shipped_ids.json', /"dirty": false/, '"dirty": true');
    c.edit('tools/golden/g3_collect.mjs', /if \(o !== 'ancient'\) bad\.push/, "if (false) bad.push");
  },
  run: ['node', 'tests/golden/g3_ids.test.mjs'],
};
