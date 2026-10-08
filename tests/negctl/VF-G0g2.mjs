// NC-VF-G0g2: one fault per label of tests/golden/golden_tools.g2.slow.test.mjs, none of which can mask another.
//   node_reproduces           the Node collector drops the first recipe
//   chromium_reproduces       the Chromium collector drops the first recipe
//   node_tamper_detected      the recorder ignores --out (so a tampered copy is never read; the committed file is compared instead)
export default {
  id: 'NC-VF-G0g2', criterion: 'VF-G0g2',
  expectRed: ['VF-G0g2/node_reproduces', 'VF-G0g2/chromium_reproduces', 'VF-G0g2/node_tamper_detected'],
  alsoRed: [],
  tier: 'T-full', needs: ['baseline', 'chromium'], costS: 60,
  mutate(c) {
    c.edit('tools/golden/g2_collect.mjs', /G\.RECIPES\.slice\(\)/, 'G.RECIPES.slice(1)');
    c.edit('tools/golden/g2_chromium.mjs', /g2Collect\(generateArena, RECIPES\.slice\(\), ARENAS\)/, 'g2Collect(generateArena, RECIPES.slice(1), ARENAS)');
    c.edit('tools/golden/common.mjs', /opt\.out = opt\.out \|\| \(spec\.outFor \? spec\.outFor\(opt\) : spec\.defaultOut\);/, 'opt.out = spec.outFor ? spec.outFor(opt) : spec.defaultOut;');
  },
  run: ['node', 'tests/golden/golden_tools.g2.slow.test.mjs'],
};
