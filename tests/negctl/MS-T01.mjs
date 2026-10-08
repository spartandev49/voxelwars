// NC-MS-T01 (spec/MS 4): the JSON Schema interpreter of tools/ms_lint.mjs ignores `additionalProperties: false` -> the interpreter self-test must go red
// (the lint would then accept unknown mission fields, the exact drift the schema exists to stop).
export default {
  id: 'NC-MS-T01', criterion: 'MS-T01',
  expectRed: ['MS-T01/schema_interpreter'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 6,
  mutate(c) { c.edit('tools/ms_lint.mjs', /sch\.additionalProperties === false\) sink\.push/, "sch.additionalProperties === 'never') sink.push"); },
  run: ['node', 'tests/campaign/ms.test.mjs'],
};
