// NC-VF-L06: an unreadable record file is skipped instead of reported -> records_cli/malformed must go red (a corrupt record must never pass the gate silently).
export default {
  id: 'NC-VF-L06', criterion: 'VF-L06',
  expectRed: ['VF-L06/malformed'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 8,
  mutate(c) { c.edit('tools/records.mjs', /rows\.push\(\{ file: d\.file, state: 'RED-MALFORMED', red: true, amber: false, reason: 'unreadable JSON' \}\); continue;/, 'continue;'); },
  run: ['node', 'tests/golden/records_cli.test.mjs'],
};
