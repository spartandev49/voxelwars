// NC-VF-G1-check: g1_record --check stops reporting divergences of the chain (the filter that hides the aggregate label hides everything) -> g1rec/check_detects_digest must go red.
export default {
  id: 'NC-VF-G1-check', criterion: 'VF-T03R',
  expectRed: ['VF-T03R/g1rec/check_detects_digest'],
  alsoRed: [],
  tier: 'T-full', needs: ['baseline'], costS: 60,
  mutate(c) { c.edit('tools/golden/g1_record.mjs', /if \(f\.label !== 'g1\/digest_equal'\) fails\.push\(f\.msg\);/, "if (f.label === 'g1/never') fails.push(f.msg);"); },
  run: ['node', 'tests/golden/g1_record.slow.test.mjs'],
};
