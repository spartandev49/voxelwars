// Negative control of the harness-workaround list (VF 3.6.2 "so none can be added"; NC-VF-69 here). All faults at once; each also alone (named export `faults`):
//   lines_listed   a second workaround line (a def field patch) is added to the campaign harness
//   lines_present  the listed workaround line is deleted from the harness
//   list_shape     the list row loses its reason
//   g6_independent G6's collector starts importing the campaign harness
export const faults = {
  lines_listed: { labels: ['lines_listed'], apply: (c) => c.edit('tests/campaign/_lib.mjs', /(export \{ MISSIONS \};)/, 'defs.hoplite.hp = 1;\n$1') },
  lines_present: { labels: ['lines_present'], apply: (c) => c.edit('tests/campaign/_lib.mjs', /if \(defs\.trojan_horse && !defs\.trojan_horse\.ranged\) aiInfo\(defs\.trojan_horse\)\.siege = false;/, '') },
  list_shape: { labels: ['list_shape'], apply: (c) => c.edit('tests/baseline/harness_workarounds.json', /"reason": "SIM defect[^"]*",/, '') },
  g6_independent: { labels: ['g6_independent'], apply: (c) => c.edit('tools/golden/g6_collect.mjs', /(import \{ statwalk \} from '\.\.\/lib\/statwalk\.mjs';)/, "$1\nimport '../../tests/campaign/_lib.mjs';") },
};
export default {
  id: 'NC-VF-69', criterion: 'VF-G6w',
  expectRed: ['VF-G6w/lines_listed', 'VF-G6w/lines_present', 'VF-G6w/list_shape', 'VF-G6w/g6_independent'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 3,
  mutate(c) { for (const f of Object.values(faults)) f.apply(c); },
  run: ['node', 'tests/golden/harness_workarounds.test.mjs'],
};
