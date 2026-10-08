// NC-VF-G1-delegate: g1_record --engine=chromium stops handing over to the Chromium column -> g1rec/chromium_delegates must go red (the documented CLI of VF 3.3 must reach the browser column).
export default {
  id: 'NC-VF-G1-delegate', criterion: 'VF-T03R',
  expectRed: ['VF-T03R/g1rec/chromium_delegates'],
  alsoRed: [],
  tier: 'T-full', needs: ['baseline', 'chromium'], costS: 70,
  mutate(c) { c.edit('tools/golden/g1_record.mjs', /if \(argv\.includes\('--engine=chromium'\)\) \{/, "if (argv.includes('--engine=never')) {"); },
  run: ['node', 'tests/golden/g1_record.slow.test.mjs'],
};
