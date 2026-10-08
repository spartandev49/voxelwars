// NC-GATE-09 (docs/eras/spec/VF.md 3.13): --check stops comparing content -> an edited generated file is not reported: genreg / gen_check_detects_edited_file must go red.
export default {
  id: 'NC-GATE-09', criterion: 'GATE-T09',
  expectRed: ['GATE-T09/gen_check_detects_edited_file'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) { c.edit('tools/gen-registry.mjs', /if \(!fs\.existsSync\(t\) \|\| fs\.readFileSync\(t, 'utf8'\) !== fs\.readFileSync\(path\.join\(writeDir, f\), 'utf8'\)\) bad\.push\(f\);/, 'if (!fs.existsSync(t)) bad.push(f);'); },
  run: ['node', 'tests/gate/genreg.test.mjs'],
};
