// Scratch project for the tests of the program tools (plan_lint, wbs, p0_exit; VF-T26): a tiny but complete set of the documents they read, consistent by
// construction, so that a test seeds exactly one defect and expects exactly the rule that owns it to fail. Helper module, not a test.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from '../../tools/lib/paths.mjs';
import { parseErTable, scanManifest, stable } from '../../tools/lib/er_rollup.mjs';

export const MODULES = [['M0', 'S28'], ['M1', 'S29'], ['M3', 'S30'], ['M2', 'S31'], ['M2b', 'S32'], ['M10', 'S33'], ['M6a', 'S34'], ['M7', 'S35'], ['M12', 'S36'], ['M14', 'S37'], ['M13', 'S38'], ['M15', 'S45'], ['M17e', 'S46'], ['M8', 'S39'], ['M9', 'S40'], ['M11', 'S41'], ['M4', 'S42'], ['M5', 'S43'], ['M6b', 'S44']];
export const PHASES = ['P0 truth and design', 'P1 foundation', 'P2 mechanics', 'P3 per-era pipeline', 'P4 integration', 'P5 QA', 'P6 release'];
export const sh = (root, rel, text) => { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
export const rd = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
export const edit = (root, rel, re, rep) => { const t = rd(root, rel); const n = t.replace(re, rep); if (n === t) throw new Error(`fixture edit ${rel} ${re} changed nothing`); sh(root, rel, n); };

const planText = () => `# plan fixture

## 0. Non-negotiables

1. First item.
2. Second item.

## 1. Scope

| per era | target | floor | Ancient | reuse |
|---|---|---|---|---|
| factions | 6 | 5 | 7 | all new |
| units (incl. 5 bosses) | 34 | 30 | 43 | new |
| arena recipes | 12 | 11 | 16 | new |
| era props (+ shared \`any\`) | 38 | 34 | 41 | new |
| missions / puzzles | 9 / 6 | 9 / 6 | 9 / 6 | new |
| music | 6 tracks + 1 bed = 7 per era (21 over three eras) | 6 | 8 | new |

Totals at target: 102 units, 36 arenas, 114 props, 27 missions, 18 puzzles, 21 music tracks.

## 3. Phase 0 truth

Goldens: G1 sim, G2 arenas, G3 ids, G4 text, G5 saves, G6 campaign, G7 generators, G8 render, G9 audio, G10 dom, G11 clips, G12 view.

## 4. Mechanics

| # | module | content | S | needed by |
|---|---|---|---|---|
${MODULES.map(([m, s], i) => `| ${i + 1} | ${m} | text | ${s} | all |`).join('\n')}

**E-FREEZE(era)** is a PREFIX of the landing order: Medieval = #1..#13 (${MODULES.slice(0, 13).map((m) => m[0]).join(' ')}), Modern = #1..#16 (adds M8 M9 M11), Sci-Fi = #1..#19 (adds M4 M5 M6b) = S-FREEZE.

## 9. Verification

Criteria ER1 first, ER2 second, ER3 third (ER3b is its visual half).

## 12. Work breakdown, schedule, capacity

Honest estimate: about **640-700 sessions** (P0 ~100, P1 ~108, P2 ~300, P3-P6 130-190 = 638-698). Throughput bound with c x u = 2.5-3.5: 9.9-15.2 days.

| phase | content |
|---|---|
${PHASES.map((p) => `| ${p} | content |`).join('\n')}

**Teams and tools.** TOOLS split into TOOLS-GOLDEN, TOOLS-GATE, TOOLS-VERIFY. Other roles: COORD; DESIGN-x (ARCH, SIM, ERA-MED/MOD/SF); SIM (one at a time); AUDIO + HUNTER; REVIEWER.

## 14. Spec deliverables

| file | owner | reviewer | depends on | acceptance script | state |
|---|---|---|---|---|---|
| \`spec/AA\` (the first spec) | DESIGN-ARCH | REVIEWER | maps | lint | final |
| \`spec/M\` (modules) | DESIGN-SIM | REVIEWER | AA | lint | final; budgets draft until end of P1 |
| \`spec/VF\` (verification) | TOOLS-VERIFY | REVIEWER | M | lint | draft until P0 exit |

## 15. Decisions

Closed: D2 all eras open; D8 by the spike; D9 air rules; D10 god powers.
`;

const specText = (name, extra = '') => `# spec/${name}\n\n${[1, 2, 3, 4, 5, 6, 7].map((n) => `## ${n}. Section ${n}\n\ntext of ${n}. ${n === 3 ? 'See plan section 4 and D9. ' + extra : ''}\n`).join('\n')}`;

const vfText = () => `# spec/VF

## 1. Purpose

text

## 2. Decisions

text

## 3. Detailed specification

### 3.2 The ER table

| ER | criterion | script(s) / members | owner | first | tier / min | thresholds | negctl |
|---|---|---|---|---|---|---|---|
| ER1 | Ancient identity G1..G12 | \`tests/golden/g1.test.mjs\` | TOOLS-GOLDEN | P0 | F 1.5 | equal | NC-VF-09 |
| ER2 | registry integrity | \`tests/reg/r.test.mjs\` | REGISTRY | P1 | F 0.8 | throws | NC-VF-01 |
| ER3 | unit contract | \`tests/unit/u.test.mjs\` | UNITS | P1 | F 0.3 | model | NC-VF-02 |
| ER3b | visual bible | \`tests/unit/u.test.mjs\` | TOOLS-VERIFY | P1 | E 0.3 | palette | NC-VF-42 |

### 3.6 Goldens G1..G12

G1 G2 G3 G4 G5 G6 G7 G8 G9 G10 G11 G12 are recorded from the baseline.

## 4. Acceptance

text

## 5. Residual ledger

Every residual of the reviews.

| item | what it asks | answered in |
|---|---|---|
| q3_program r2 | a checklist script | 3.21 |
| q1_verify Q23 | independence | 3.18 |

## 6. Plan corrections

text

## 7. Open items

A "TODO" is allowed here, and a coming soon note.
`;

/** Build the scratch project; returns its root. */
export async function lintFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vw-prog-'));
  sh(root, 'package.json', '{"name":"scratch","type":"module"}\n');
  sh(root, 'docs/eras/plan.md', planText());
  sh(root, 'docs/eras/e.md', `# e

## 2. What the user expects

1. First expectation.
2. Second expectation.

## 3. What campaign means

A campaign is a map.

## 5. Above and beyond

- First extra;
- Second extra.

## 6. Not in the request

- O1: cross-era mixing. O2: a fifth era.

## 7. Decisions

${[1, 2, 3, 4, 5, 6, 7].map((n) => `- D${n}: decision ${n}.`).join('\n')}

## 8. Definition of done

1. The link opens.
`);
  sh(root, 'docs/eras/STATUS.md', `# status\n\n## Where we are\n\n- P0 in progress.\n- Phase table: ${PHASES.join(' -> ')}.\n`);
  sh(root, 'docs/eras/cuts.md', '# cuts\n\n## Decided at plan time\n| id | what |\n|---|---|\n| X1 | Time Warp |\n| X2 | units |\n\n## Ladder\n| rung | what | sessions saved |\n|---|---|---|\n| 1 | a | 2 |\n| 2 | b | 1 |\n| 3 | c | about 1 |\n| 5 | d | 2 |\n');
  sh(root, 'docs/eras/q3_program.md', '# q3\n\n2. residual checklist item.\n');
  sh(root, 'docs/eras/q1_verify.md', '# q1\n\nQ23 independence.\n');
  sh(root, 'docs/eras/spec/AA.md', specText('AA'));
  sh(root, 'docs/eras/spec/VF.md', vfText());
  sh(root, 'docs/eras/spec/M.md', `${specText('M')}\n\`\`\`modules\n${JSON.stringify(MODULES.map(([id, S], i) => ({ id, S, pos: i + 1, deps: [] })))}\n\`\`\`\n`);
  const clauses = ['2.1', '2.2', '3', '5', '5', 'O1', 'O2', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', '8.1'];
  sh(root, 'docs/eras/traceability.md', `# traceability.md final\n\n| e.md clause | plan item(s) | owner | phase | evidence | now |\n|---|---|---|---|---|---|\n${clauses.map((k, i) => `| ${k} clause text ${i} | AR5 | UI | P1 | ER${(i % 2) + 1} | ${i % 2 ? 'M' : 'S'} |`).join('\n')}\n`);
  sh(root, 'tests/arch/manifests.test.mjs', 'const TARGETS = { units: 34, arenas: 12, props: 38, missions: 9, puzzles: 6, music: 7 };\n');
  sh(root, 'src/content/era_x/manifest.js', "export default { cuts: ['X1'] };\n");
  // tests registering the S criteria and ER members, each with a negative control file
  sh(root, 'tests/lib/criteria.mjs', fs.readFileSync(path.join(ROOT, 'tests/lib/criteria.mjs'), 'utf8'));
  const sTests = MODULES.map(([, s]) => `criterion('${s}', { er: ['ER1'], owner: 'SIM', tier: 'T-fast', negctl: 'tests/negctl/${s}.mjs' });`).join('\n');
  sh(root, 'tests/sim/m.test.mjs', `import { criterion } from '../lib/criteria.mjs';\n${sTests}\n`);
  for (const f of ['tests/golden/g1.test.mjs', 'tests/reg/r.test.mjs', 'tests/unit/u.test.mjs']) sh(root, f, `import { criterion } from '../lib/criteria.mjs';\ncriterion('${path.basename(f, '.test.mjs').toUpperCase()}-X', { er: ['ER${f.includes('golden') ? 1 : f.includes('reg') ? 2 : 3}'], owner: 'T', tier: 'T-fast', negctl: 'tests/negctl/${path.basename(f, '.test.mjs').toUpperCase()}-X.mjs' });\n`);
  const ctl = (id, file) => `export default { id: 'NC-${id}', criterion: '${id}', expectRed: ['${id}/x'], tier: 'T-fast', needs: [], costS: 2, mutate() {}, run: ['node', '${file}'] };\n`;
  for (const [, s] of MODULES) sh(root, `tests/negctl/${s}.mjs`, ctl(s, 'tests/sim/m.test.mjs'));
  for (const [f, id] of [['tests/golden/g1.test.mjs', 'G1-X'], ['tests/reg/r.test.mjs', 'R-X'], ['tests/unit/u.test.mjs', 'U-X']]) sh(root, `tests/negctl/${id}.mjs`, ctl(id, f));
  await regenerate(root);
  return root;
}

/** Rewrite the generated tables of the scratch project (after a seeded change to the tests or the VF table). */
export async function regenerate(root) {
  sh(root, 'tools/lib/criteria_manifest.json', stable(await scanManifest(root)));
  sh(root, 'tools/lib/er_table.json', stable(parseErTable(rd(root, 'docs/eras/spec/VF.md'))));
}

/** The 19-WP breakdown used by the wbs tests. */
export function wbsCsv(over = {}) {
  const head = 'wp,owner,preds,phase,hot_files,size,accept,ladder_rung,no_regret,spec';
  const rows = [
    ['REG-01', 'REGISTRY', '', 'P1', 'registry.js', 'L', 'AR-T01', '', 'yes', 'spec/AR'],
    ['SIM-01', 'SIM', 'REG-01', 'P1', 'world.js', 'M', 'S28', '', 'yes', 'spec/M'],
    ['SIM-02', 'SIM', 'SIM-01', 'P2', 'world.js', 'M', 'S29', '', 'yes', ''],
    ['UNIT-H-MED-01', 'UNITS-MED', 'SIM-01', 'P2', 'units', 'M', 'UC', '', 'no', ''],
    ['UNIT-H-MED-02', 'UNITS-MED', 'SIM-01', 'P2', 'units', 'M', 'UC', '', 'no', ''],
    ['UNIT-X-MED-01', 'UNITS-MED', 'SIM-02', 'P2', 'units', 'S', 'UC', '', 'no', ''],
    ['PROP-MED-01', 'PROPS-MED', 'REG-01', 'P2', 'props', 'S', 'W', '3', 'no', ''],
    ['ARENA-MED-01', 'WORLD', 'REG-01', 'P2', 'arenas', 'S', 'W', '1', 'no', ''],
    ['ARENA-MED-02', 'WORLD', 'ARENA-MED-01', 'P2', 'arenas', 'S', 'W', '1', 'no', ''],
    ['MISSION-MED-01', 'CAMPAIGN-MED', 'UNIT-H-MED-01 ARENA-MED-01', 'P3', 'missions', 'M', 'MS', '', 'no', ''],
    ['PUZZLE-MED-01', 'CAMPAIGN-MED', 'UNIT-H-MED-01', 'P3', 'puzzles', 'S', 'MS', '2', 'no', ''],
    ['REVIEW-01', 'REVIEWER#1', 'REG-01', 'P1', '', 'S', '', '', 'yes', ''],
    ['REVIEW-02', 'REVIEWER#2', 'SIM-01', 'P1', '', 'S', '', '', 'yes', ''],
    ['QA-01', 'QA', 'MISSION-MED-01 PUZZLE-MED-01', 'P5', '', 'L', 'QA', '', 'yes', ''],
    ['REL-01', 'COORD', 'QA-01', 'P6', '', 'M', 'release', '5', 'yes', ''],
  ];
  return [head, ...rows.map((r) => r.map((v) => (/[,\s]/.test(v) ? `"${v}"` : v)).join(','))].join('\n') + '\n';
}
export { ROOT };
