// NC-VF-T26-p0-REG: REG: manifest drift is not noticed
export default {
  id: 'NC-VF-T26-p0-REG', criterion: 'VF-T26-p0exit',
  expectRed: ['VF-T26-p0exit/REG_fail'],
  alsoRed: ['VF-T26-p0exit/REG_needs_an_er_rollup'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/p0_exit.mjs', /else if \(stable\(await scanManifest\(c\.root\)\) !== fs\.readFileSync\(path\.join\(c\.root, 'tools\/lib\/criteria_manifest\.json'\), 'utf8'\)\)/, 'else if (false)');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
