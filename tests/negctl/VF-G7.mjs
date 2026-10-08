// NC-VF-66 (VF 3.13: "reorder the id sort in armygen pool -> g7/compositions"), extended to one fault per label of tests/golden/g7_armygen.test.mjs:
//   compositions + placements + daily_enemies   the armygen pool is reversed after its sort (NC-VF-66)
//   counter_table                               the `strong` threshold of counterTable() becomes unreachable (1.25 -> 9)
//   scouts + scout_codes                        the no_anti_cav threshold becomes unreachable (0.22 -> 1.5)
//   daily_plans                                 the daily arena seed offset changes (+1 -> +2)
//   waves                                       the survival wave budget slope changes (900 -> 901)
//   inputs                                      the record claims 399 daily dates
//   recorded_from_baseline                      the record claims to come from a dirty checkout
export default {
  id: 'NC-VF-66', criterion: 'VF-G7',
  expectRed: ['VF-G7/compositions', 'VF-G7/placements', 'VF-G7/daily_enemies', 'VF-G7/counter_table', 'VF-G7/scouts', 'VF-G7/scout_codes', 'VF-G7/daily_plans', 'VF-G7/waves', 'VF-G7/inputs', 'VF-G7/recorded_from_baseline'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 4,
  mutate(c) {
    c.edit('src/sim/armygen.js', /  pool\.sort\(\);/, '  pool.sort().reverse();');
    c.edit('src/sim/armygen.js', /const strong = !!top && top\[1\] >= 1\.25;/, 'const strong = !!top && top[1] >= 9;');
    c.edit('src/sim/armygen.js', /if \(theirs\.cav > 0\.22 && spears < 0\.2\)/, 'if (theirs.cav > 1.5 && spears < 0.2)');
    c.edit('src/content/era_ancient/daily.js', /arenaSeed: \(seed % 100000\) \+ 1/, 'arenaSeed: (seed % 100000) + 2');
    c.edit('src/sim/waves.js', /2400 \+ 900 \* n/, '2400 + 901 * n');
    c.edit('tests/golden/g7_armygen.json', /"n": 400/, '"n": 399');
    c.edit('tests/golden/g7_armygen.json', /"dirty": false/, '"dirty": true');
  },
  run: ['node', 'tests/golden/g7_armygen.test.mjs'],
};
