// VF-T13: the criteria registry (docs/eras/spec/VF.md 3.4): statuses U1..U5 and PANEL, the ER roll-up (FAIL, UNVERIFIED, PARTIAL(x/y), PANEL, PASS),
// the static manifest scan and its drift check, the ER table parser, the generated report against a golden fixture, and the report CLI.
// NC-VF-14 flips the zero-assertion rule (label U2_zero_assertions). Labels: U1_..U5_, PANEL_, er_*, manifest_*, er_table_*, report_*.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { criterion } from '../lib/criteria.mjs';
import { ROOT } from '../../tools/lib/paths.mjs';
import { mergeCriteria, writeCriteria } from '../../tools/lib/criteria_merge.mjs';
import { rollup, finalizeCriteria, parseErTable, expandIds, scriptTokens, negIds, scanManifest, findCalls, codeMask, tierRank, erCompare, parsePanelAcceptance, stable } from '../../tools/lib/er_rollup.mjs';
import { renderReport, shortfallTable } from '../../tools/report.mjs';

const c = criterion('VF-T13', {
  er: ['gate'], owner: 'TOOLS-VERIFY', tier: 'T-fast', negctl: 'tests/negctl/VF-T13.mjs',
  text: 'criteria registry: U1-U5, PANEL, ER roll-up (FAIL/UNVERIFIED/PARTIAL/PANEL/PASS), manifest scan and drift, ER table parser, report golden fixture',
});
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vw-t13-'));
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
const write = (root, rel, text) => { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
const line = (id, o = {}) => ({ id, er: ['ERX'], owner: 'T', tier: 'T-fast', negctl: `tests/negctl/${id}.mjs`, text: '', judge: 'script', engine: 'node', era: null, file: `tests/${id}.test.mjs`, scriptHash: 'h-' + id, assertions: 3, failures: [], skipped: null, seconds: 0.5, treeHash: 't', at: 'now', ...o });
let bad = 0;
try {
  // ---- U1..U5 and PANEL by the merge
  const root = path.join(tmp, 'merge');
  for (const id of ['P', 'Z', 'S', 'N4', 'N4S', 'PN', 'F']) write(root, `tests/negctl/${id}.mjs`, 'export default {};\n');
  const lines = [line('P'), line('Z', { assertions: 0 }), line('S', { skipped: 'no chromium' }), line('NONEG', { negctl: null }), line('MISSINGFILE', { negctl: 'tests/negctl/nope.mjs' }),
    line('N4'), line('N4S'), line('PN', { judge: 'panel' }), line('F', { failures: ['g/label'] })];
  const store = { P: { result: 'red-as-expected', scriptHash: 'h-P' }, N4S: { result: 'red-as-expected', scriptHash: 'stale' }, PN: { result: 'red-as-expected', scriptHash: 'h-PN' }, F: { result: 'red-as-expected', scriptHash: 'h-F' } };
  const m = mergeCriteria(lines, { root, negctlStore: store, run: { id: 'r', tier: 'full' } }).criteria;
  c.soft('PASS_when_proven', m.P.status === 'PASS' && !m.P.reason, JSON.stringify(m.P));
  c.soft('U2_zero_assertions', m.Z.status === 'UNVERIFIED' && /^U2/.test(m.Z.reason), JSON.stringify(m.Z));
  c.soft('U5_skipped', m.S.status === 'UNVERIFIED' && /^U5/.test(m.S.reason));
  c.soft('U3_no_negctl', m.NONEG.status === 'UNVERIFIED' && /^U3/.test(m.NONEG.reason) && m.MISSINGFILE.status === 'UNVERIFIED' && /^U3/.test(m.MISSINGFILE.reason));
  c.soft('U4_not_proven', m.N4.status === 'UNVERIFIED' && /^U4/.test(m.N4.reason));
  c.soft('U4_script_hash_changed', m.N4S.status === 'UNVERIFIED' && /^U4/.test(m.N4S.reason));
  c.soft('PANEL_never_plain_pass', m.PN.status === 'PANEL', m.PN.status);
  c.soft('FAIL_wins', m.F.status === 'FAIL' && /g\/label/.test(m.F.reason));
  c.soft('negctl_proof_visible', m.P.negctl && m.P.negctl.result === 'red-as-expected' && m.P.negctl.scriptHash === 'h-P');

  // ---- U1 and the ER roll-up (pure)
  const mk = (status, o = {}) => ({ er: ['E'], tier: 'T-fast', status, assertions: 2, failures: [], seconds: 1, ...o });
  const man = (...rows) => ({ criteria: rows.map(([id, er, tier, file]) => ({ id, er, tier, file: file || `tests/${id}.test.mjs`, owner: 'T', negctl: null })) });
  const r1 = rollup({ criteria: { A1: mk('PASS', { er: ['EA'] }), A2: mk('PASS', { er: ['EA'] }) }, manifest: man(['A1', ['EA'], 'T-fast'], ['A2', ['EA'], 'T-fast']), erTable: null, runTierRank: 0 });
  c.soft('er_pass', r1.er.EA.status === 'PASS' && r1.er.EA.members.join() === 'A1,A2' && !r1.er.EA.missing.length, JSON.stringify(r1.er.EA));
  const r2 = rollup({ criteria: { B1: mk('PASS', { er: ['EB'] }), B2: mk('FAIL', { er: ['EB'], reason: 'x' }), B3: mk('UNVERIFIED', { er: ['EB'] }) }, manifest: man(['B1', ['EB'], 'T-fast'], ['B2', ['EB'], 'T-fast'], ['B3', ['EB'], 'T-fast']), erTable: null, runTierRank: 0 });
  c.soft('er_fail_beats_unverified', r2.er.EB.status === 'FAIL' && r2.er.EB.counts.fail === 1 && r2.er.EB.counts.unverified === 1, JSON.stringify(r2.er.EB));
  const r3 = rollup({ criteria: { C1: mk('PASS', { er: ['EC'] }), C2: mk('UNVERIFIED', { er: ['EC'], reason: 'U3 no negative control' }) }, manifest: man(['C1', ['EC'], 'T-fast'], ['C2', ['EC'], 'T-fast']), erTable: null, runTierRank: 0 });
  c.soft('er_unverified', r3.er.EC.status === 'UNVERIFIED' && /U3/.test(r3.er.EC.reason), JSON.stringify(r3.er.EC));
  const tbl = (rows) => ({ rows });
  const r4 = rollup({ criteria: { D1: mk('PASS', { er: ['ED'] }) }, manifest: man(['D1', ['ED'], 'T-fast']), erTable: tbl([{ er: 'ED', criterion: 'd', ids: ['D1', 'D9'], scripts: [], stems: [], owner: 'T', first: 'P1' }]), runTierRank: 0 });
  c.soft('er_required_member_not_built_is_unverified', r4.er.ED.status === 'UNVERIFIED' && r4.er.ED.missing.join() === 'D9 (not built)', JSON.stringify(r4.er.ED));
  const r5 = rollup({ criteria: { E1: mk('PASS', { er: ['EE'] }) }, manifest: man(['E1', ['EE'], 'T-fast'], ['E2', ['EE'], 'T-full']), erTable: null, runTierRank: 0 });
  c.soft('er_partial_when_run_tier_is_below', r5.er.EE.status === 'PARTIAL(1/2)' && !r5.stubs.E2, JSON.stringify([r5.er.EE, Object.keys(r5.stubs)]));
  const r5b = rollup({ criteria: { E1: mk('PASS', { er: ['EE'] }) }, manifest: man(['E1', ['EE'], 'T-fast'], ['E2', ['EE'], 'T-full']), erTable: null, runTierRank: 2 });
  c.soft('U1_not_executed_when_run_tier_reaches_it', r5b.stubs.E2 && r5b.stubs.E2.status === 'UNVERIFIED' && /^U1/.test(r5b.stubs.E2.reason) && r5b.er.EE.status === 'UNVERIFIED', JSON.stringify(r5b.stubs));
  const r6 = rollup({ criteria: { P1: mk('PANEL', { er: ['EP'] }) }, manifest: man(['P1', ['EP'], 'T-fast']), erTable: null, runTierRank: 0 });
  const r6b = rollup({ criteria: { P1: mk('PANEL', { er: ['EP'] }) }, manifest: man(['P1', ['EP'], 'T-fast']), erTable: null, runTierRank: 0, panelAccepted: new Set(['P1']) });
  c.soft('er_panel_needs_a_signed_row', r6.er.EP.status === 'PANEL' && r6b.er.EP.status === 'PASS', `${r6.er.EP.status} ${r6b.er.EP.status}`);
  c.soft('panel_acceptance_rows', (() => { const s = parsePanelAcceptance('| criterion | accepted | signer | date |\n|---|---|---|---|\n| P1 | yes | REVIEWER | 2026-10-08 |\n| P2 | no | REVIEWER | x |\n| P3 | yes |  | x |\n'); return s.has('P1') && !s.has('P2') && !s.has('P3'); })());
  const r7 = rollup({ criteria: {}, manifest: man(), erTable: tbl([{ er: 'EG', criterion: 'g', ids: [], scripts: ['tests/g/*.test.mjs', 'tools/g.mjs'], stems: ['g3_ids'], owner: 'T', first: 'P1' }]), runTierRank: 0, fileExists: (p) => p === 'tools/g.mjs' });
  c.soft('er_script_members_missing', r7.er.EG.status === 'UNVERIFIED' && r7.er.EG.missing.length === 3 && r7.er.EG.missing.some((x) => /tools\/g\.mjs \(registers no criterion\)/.test(x)) && r7.er.EG.missing.some((x) => /g3_ids \(not built\)/.test(x)), JSON.stringify(r7.er.EG.missing));
  const r8 = rollup({ criteria: { G1: mk('PASS', { er: [] }), G3: mk('PASS', { er: [] }) }, manifest: man(['G1', [], 'T-fast', 'tests/g/one.test.mjs'], ['G3', [], 'T-fast', 'tests/golden/g3_ids.test.mjs']), erTable: tbl([{ er: 'EG', criterion: 'g', ids: [], scripts: ['tests/g/*.test.mjs'], stems: ['g3_ids'], owner: 'T', first: 'P1' }]), runTierRank: 0 });
  c.soft('er_script_members_resolve_through_manifest_files', r8.er.EG.status === 'PASS' && r8.er.EG.members.join() === 'G1,G3', JSON.stringify(r8.er.EG));
  const r9 = rollup({ criteria: { 'VF-G2': mk('PASS', { er: ['EH'] }) }, manifest: man(['VF-G2', ['EH'], 'T-fast']), erTable: tbl([{ er: 'EH', criterion: 'h', ids: ['WC01'], scripts: [], stems: [], owner: 'T', first: 'P1' }]), runTierRank: 0, aliases: { WC01: 'VF-G2' } });
  c.soft('er_alias_satisfies_table_id', r9.er.EH.status === 'PASS', JSON.stringify(r9.er.EH));
  c.soft('er_natural_order', ['ER21b', 'ER3', 'ER21', 'ER3b', 'gate', 'ER1'].sort(erCompare).join() === 'ER1,ER3,ER3b,ER21,ER21b,gate');
  c.soft('tier_rank', tierRank('T-fast') === 0 && tierRank('fast') === 0 && tierRank('T-full') === 2 && tierRank('release') === 3 && tierRank('F') === 0 && tierRank('U') === 2 && tierRank('R') === 3 && tierRank('H') === 4);

  // ---- finalize through writeCriteria: manifest and table files of the tree, stubs refreshed, document written
  const fin = path.join(tmp, 'fin');
  write(fin, 'tools/lib/criteria_manifest.json', stable({ schema: 1, criteria: [{ id: 'K1', file: 'tests/k1.test.mjs', er: ['EK'], tier: 'T-fast' }, { id: 'K2', file: 'tests/k2.test.mjs', er: ['EK'], tier: 'T-fast' }, { id: 'K3', file: 'tests/k3.test.mjs', er: ['EK'], tier: 'T-full' }] }));
  write(fin, 'tools/lib/er_table.json', stable({ schema: 1, rows: [{ er: 'EK', criterion: 'k', ids: ['K1', 'K2', 'K3'], scripts: [], stems: [], owner: 'T', first: 'P1' }] }));
  write(fin, 'tests/negctl/K1.mjs', 'export default {};\n');
  const doc = mergeCriteria([line('K1', { er: ['EK'] })], { root: fin, negctlStore: { K1: { result: 'red-as-expected', scriptHash: 'h-K1' } }, run: { id: 'r', tier: 'fast' } });
  const out = path.join(fin, 'criteria.json');
  writeCriteria(out, doc);
  const w1 = JSON.parse(fs.readFileSync(out, 'utf8'));
  c.soft('finalize_adds_stub_and_er', w1.criteria.K2 && w1.criteria.K2.notExecuted && !w1.criteria.K3 && w1.er.EK.status === 'UNVERIFIED' && w1.manifest.count === 3, JSON.stringify([w1.er.EK, w1.manifest]));
  doc.criteria.K2 = { ...doc.criteria.K1, assertions: 5 };           // a later run executes K2: the stub of the earlier pass must be replaced, not duplicated
  writeCriteria(out, doc);
  const w2 = JSON.parse(fs.readFileSync(out, 'utf8'));
  c.soft('finalize_is_idempotent_and_refreshes', !w2.criteria.K2.notExecuted && w2.criteria.K2.assertions === 5 && w2.er.EK.status === 'PARTIAL(2/3)', JSON.stringify(w2.er.EK));
  c.soft('finalize_leaves_doc_alone_without_files', (() => { const d = mergeCriteria([line('Q')], { root: path.join(tmp, 'nofiles'), negctlStore: {}, run: { id: 'r', tier: 'fast' } }); const o = path.join(tmp, 'nofiles.json'); writeCriteria(o, d); const j = JSON.parse(fs.readFileSync(o, 'utf8')); return Object.keys(j.er).length === 0 && j.manifest === null; })());

  // ---- the static manifest scan
  const sc = path.join(tmp, 'scan');
  write(sc, 'tests/a.test.mjs', `import { criterion } from '../lib/criteria.mjs';
const c = criterion('A-1', { er: ['ER1', 'ER2'], owner: 'X', tier: 'T-era', negctl: 'tests/negctl/A-1.mjs', judge: 'panel', text: 'x' });
// criterion('IN-COMMENT', {})
/* criterion('IN-BLOCK', {}) */
const s = "criterion('IN-STRING', {})";
const t = \`criterion('IN-TEMPLATE', {})\`;
const re = /criterion\\('IN-REGEX'/g;
const u = \`\${ criterion('IN-TEMPLATE-EXPR', { er: 'E3' }) }\`;
const d = 6 / 2; const e = criterion("A-DQ", {});
`);
  write(sc, 'tests/b.test.mjs', "import { criterion } from '../lib/criteria.mjs';\nconst crit = (id) => criterion(id, {});\ncrit('DYN-1');\n");
  write(sc, 'tests/fixtures/f.mjs', "criterion('FIXTURE-SKIP', {});\n");
  write(sc, 'tools/t.mjs', "criterion('T-1', { er: 'ER9' });\n");
  write(sc, 'tests/negctl/DYN-1.mjs', "export default { id: 'NC-DYN-1', criterion: 'DYN-1', expectRed: ['DYN-1/x'], tier: 'T-fast', run: ['node', 'tests/b.test.mjs'], mutate() {} };\n");
  const mf = await scanManifest(sc);
  const ids = mf.criteria.map((x) => x.id);
  c.soft('manifest_finds_code_calls_only', ids.join() === 'A-1,A-DQ,DYN-1,IN-TEMPLATE-EXPR,T-1', ids.join());
  const a1 = mf.criteria.find((x) => x.id === 'A-1');
  c.soft('manifest_parses_meta', a1.er.join() === 'ER1,ER2' && a1.owner === 'X' && a1.tier === 'T-era' && a1.negctl === 'tests/negctl/A-1.mjs' && a1.judge === 'panel' && a1.file === 'tests/a.test.mjs' && a1.line === 2, JSON.stringify(a1));
  const dy = mf.criteria.find((x) => x.id === 'DYN-1');
  c.soft('manifest_finds_dynamic_ids_through_negctl', dy.source === 'negctl' && dy.file === 'tests/b.test.mjs', JSON.stringify(dy));
  c.soft('codeMask_and_findCalls', findCalls("x = 'criterion(\"A\")'; criterion('B', {}); // criterion('C')").map((x) => x.id).join() === 'B' && codeMask('a/*b*/c')[2] === 0);
  const cli = (...a) => spawnSync('node', [path.join(ROOT, 'tools/report.mjs'), `--root=${sc}`, ...a], { encoding: 'utf8', env: { ...process.env, VW_GATE_DIR: '' } });
  c.soft('manifest_drift_fails_the_check', cli('--scan', '--check').status === 1 && /DRIFT/.test(cli('--scan', '--check').stderr));
  const wr = cli('--scan');
  c.soft('manifest_written_then_current', wr.status === 0 && fs.existsSync(path.join(sc, 'tools/lib/criteria_manifest.json')) && cli('--scan', '--check').status === 0);
  write(sc, 'tests/c.test.mjs', "criterion('NEW-1', {});\n");
  c.soft('manifest_drift_after_a_new_criterion', cli('--scan', '--check').status === 1);

  // ---- the ER table of VF 3.2
  c.soft('er_table_expand_ids', expandIds('AR-T01..T05, T11, T12 and RA-T11/T15/T18..T20/T23 WC10..WC15 WC01=G2').join() === 'AR-T01,AR-T02,AR-T03,AR-T04,AR-T05,AR-T11,AR-T12,RA-T11,RA-T15,RA-T18,RA-T19,RA-T20,RA-T23,WC10,WC11,WC12,WC13,WC14,WC15,WC01', expandIds('AR-T01..T05, T11, T12 and RA-T11/T15/T18..T20/T23 WC10..WC15 WC01=G2').join());
  c.soft('er_table_script_tokens', (() => { const t = scriptTokens('`tests/golden/g1_sim.test.mjs`, `g3_ids`, `tools/golden/g8_render.mjs`, `g10_dom.mjs`, `tools/contracts.mjs --strict` (today credits are touched only by `tests/humor/text.test.mjs`)'); return t.scripts.join() === 'tests/golden/g1_sim.test.mjs,tools/golden/g8_render.mjs,tools/golden/g10_dom.mjs,tools/contracts.mjs' && t.stems.join() === 'g3_ids'; })());
  c.soft('er_table_negctl_ids', negIds('NC-VF-09, 12, 44').join() === 'NC-VF-09,NC-VF-12,NC-VF-44' && negIds('NC-VF-27..30, 57').join() === 'NC-VF-27,NC-VF-28,NC-VF-29,NC-VF-30,NC-VF-57' && negIds('-').length === 0);
  const vf = fs.readFileSync(path.join(ROOT, 'docs/eras/spec/VF.md'), 'utf8');
  const table = parseErTable(vf);
  c.soft('er_table_29_rows_with_owner_first_and_negctl', table.rows.length === 29 && table.rows.every((r) => r.owner && r.first && r.criterion) && table.rows.map((r) => r.er).includes('ER3b') && table.rows.map((r) => r.er).includes('ER21b') && table.rows[0].er === 'ER1', String(table.rows.length));
  const er1 = table.rows.find((r) => r.er === 'ER1');
  c.soft('er_table_er1_members', er1.ids.includes('AR-T23') === false && er1.ids.includes('WC01') && er1.ids.includes('AR-T34') && er1.scripts.includes('tests/golden/g1_sim.test.mjs') && er1.stems.includes('g7_armygen') && er1.negctl.join() === 'NC-VF-09,NC-VF-12,NC-VF-44', JSON.stringify(er1));
  const er23 = table.rows.find((r) => r.er === 'ER23');
  c.soft('er_table_prose_in_parentheses_is_not_a_member', !er23.scripts.some((s) => /humor|ui5/.test(s)) && er23.scripts.includes('tests/audio/credits.test.mjs'), JSON.stringify(er23.scripts));
  let threw = false; try { parseErTable('| ER1 | a | b |\n'); } catch { threw = true; }
  c.soft('er_table_row_with_wrong_cell_count_throws', threw);

  // ---- the report against a golden fixture, and the CLI
  const fx = path.join(ROOT, 'tests/fixtures/report');
  const fixDoc = JSON.parse(fs.readFileSync(path.join(fx, 'criteria.json'), 'utf8'));
  const text = renderReport({
    doc: fixDoc, negStore: JSON.parse(fs.readFileSync(path.join(fx, 'negctl.json'), 'utf8')), honesty: fs.readFileSync(path.join(fx, 'honesty.md'), 'utf8'), cuts: fs.readFileSync(path.join(fx, 'cuts.md'), 'utf8'),
    identity: { engineHash: { simCore: 'aa', shared: 'bb' }, renderHash: 'cc', eraHash: { ancient: 'dd' }, page: { sha256: 'ee', bytes: 12, name: 'index.html' } }, erTable: JSON.parse(fs.readFileSync(path.join(fx, 'er_table.json'), 'utf8')),
  });
  if (process.env.UPDATE_REPORT_FIXTURE === '1') { fs.writeFileSync(path.join(fx, 'expected.md'), text + '\n'); console.log('rewrote tests/fixtures/report/expected.md'); }
  const expected = fs.readFileSync(path.join(fx, 'expected.md'), 'utf8');
  c.soft('report_golden_fixture', text + '\n' === expected, 'differs from tests/fixtures/report/expected.md (if the change is intended: UPDATE_REPORT_FIXTURE=1 node tests/verify/criteria.test.mjs, then read the diff)');
  c.soft('report_sections_in_order', ['## 1. Summary by ER', '## 2. Members per ER', '## 3. UNVERIFIED and PANEL', '## 4. Not verifiable here', '## 5. Build identity', '## 6. Negative controls', '## 7. Shortfalls'].every((h, i, a) => text.includes(h) && (i === 0 || text.indexOf(a[i - 1]) < text.indexOf(h))) && /^<!-- GENERATED/.test(text));
  c.soft('report_is_deterministic', renderReport({ doc: fixDoc, negStore: {}, identity: {} }) === renderReport({ doc: fixDoc, negStore: {}, identity: {} }));
  c.soft('report_unverified_and_panel_are_listed', /\| UX-ZERO \| UNVERIFIED \| U2 zero assertions/.test(text) && /\| PX-PANEL \| PANEL \|/.test(text) && /\| FX-FAIL \| FAIL \|/.test(text));
  c.soft('report_shortfall_table_copied', shortfallTable('# c\n\n## Decided at plan time\n| id | what |\n|---|---|\n| X1 | Time Warp |\n\n## Ladder\n| a | b |\n') === '| id | what |\n|---|---|\n| X1 | Time Warp |' && /\| X1 \| Time Warp/.test(text));
  const rep = path.join(tmp, 'rep');
  write(rep, 'x.json', JSON.stringify(fixDoc));
  const run = (...a) => spawnSync('node', [path.join(ROOT, 'tools/report.mjs'), `--root=${rep}`, `--from=${path.join(rep, 'x.json')}`, ...a], { encoding: 'utf8', env: { ...process.env, VW_GATE_DIR: '' } });
  const r = run();
  c.soft('report_cli_writes_and_fails_on_a_FAIL_er', r.status === 1 && fs.existsSync(path.join(rep, 'docs/verification_report_eras.md')) && /FAIL/.test(r.stderr), r.stdout + r.stderr);
  c.soft('report_cli_check_fresh_and_stale', run('--check').status === 0 && (() => { fs.appendFileSync(path.join(rep, 'docs/verification_report_eras.md'), 'x'); return run('--check').status === 1; })());
  c.soft('report_cli_usage', run('--bogus').status === 2 && spawnSync('node', [path.join(ROOT, 'tools/report.mjs'), `--root=${rep}`, `--from=${path.join(rep, 'missing.json')}`], { encoding: 'utf8' }).status === 2 && run('--help').status === 0);
} catch (e) { bad++; c.soft('uncaught: ' + String(e && e.message).slice(0, 100), false); console.error(e.stack); }
if (c.failures.length) { bad++; console.error('RED VF-T13: ' + c.failures.join(', ')); } else console.log(`ok  VF-T13: ${c.assertions} assertions`);
c.done();
process.exitCode = bad ? 1 : 0;
