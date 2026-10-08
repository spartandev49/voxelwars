// VF-T26 (the part TOOLS-VERIFY built so far): tools/plan_lint.mjs (PL01-PL16, each failing on its seeded defect), tools/wbs.mjs (csv, critical path, durations, classes,
// ladder, reviewer queue, paste) and tools/p0_exit.mjs (P0E-01..16 and REG, each with a passing and a failing tree). ledger_stats and reds are not built; their rows stay open.
// Three criteria: VF-T26-lint (NC-VF-73: skip PL12 -> label PL12), VF-T26-wbs, VF-T26-p0exit.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { criterion } from '../lib/criteria.mjs';
import { ROOT } from '../../tools/lib/paths.mjs';
import { lint, RULES } from '../../tools/plan_lint.mjs';
import { parseCsv, loadWbs, schedule, analyse, classCheck, calibrate, isoWeek, renderBlock, pasteBlock, DEFAULT_RULES } from '../../tools/wbs.mjs';
import { runChecks, fieldValue, ENGINE_EDIT, FULL } from '../../tools/p0_exit.mjs';
import { treeHash } from '../../tools/lib/snapshot.mjs';
import { lintFixture, regenerate, wbsCsv, sh, rd, edit } from './_program_fixture.mjs';

const mkc = (id, txt, neg) => criterion(id, { er: ['process'], owner: 'TOOLS-VERIFY', tier: 'T-fast', negctl: `tests/negctl/${neg}.mjs`, text: txt });
const cL = mkc('VF-T26-lint', 'plan_lint: each of PL01-PL16 passes on a consistent project and fails on its seeded defect; PENDING never counts as a pass under --strict; CLI exit codes', 'VF-T26-lint');
const cW = mkc('VF-T26-wbs', 'wbs: csv validation, critical path, resource and path-bound durations, class granularity, ladder calibration, float and reviewer queue, paste between markers', 'VF-T26-wbs');
const cP = mkc('VF-T26-p0exit', 'p0_exit: every check P0E-01..16 and REG passes on a consistent tree and fails on its seeded defect; --engine-edit fails on a changed src/sim byte', 'VF-T26-p0exit');
const tmps = [];
process.on('exit', () => { for (const d of tmps) fs.rmSync(d, { recursive: true, force: true }); });
const mkdir = (p) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), p)); tmps.push(d); return d; };
const copy = (root) => { const d = mkdir('vw-prog-copy-'); fs.cpSync(root, d, { recursive: true }); return d; };
const run = (tool, args, opts = {}) => spawnSync('node', [path.join(ROOT, 'tools', tool), ...args], { encoding: 'utf8', env: { ...process.env, VW_GATE_DIR: '', VW_MAIN_ROOT: '' }, ...opts });
let bad = 0;

try {
  const base = await lintFixture(); tmps.push(base);

  // =================================================================================================================== plan_lint
  {
    const all = await lint(base);
    cL.soft('clean_project_passes_every_rule', all.length === 16 && all.every((r) => r.status === 'PASS'), all.filter((r) => r.status !== 'PASS').map((r) => `${r.id} ${r.status}: ${r.msg} ${r.details.join(';')}`).join(' | '));
    cL.soft('rule_ids_are_pl01_to_pl16', RULES.map((r) => r[0]).join() === Array.from({ length: 16 }, (_, i) => 'PL' + String(i + 1).padStart(2, '0')).join());
    const defect = {
      PL01: (r) => edit(r, 'docs/eras/plan.md', /\| 1 \| M0 \| text \| S28 \|/, '| 1 | M0 | text | S99 |'),
      PL02: (r) => edit(r, 'docs/eras/plan.md', /ER3b is its visual half/, 'ER3b is its visual half and ER9 too'),
      PL03: (r) => edit(r, 'docs/eras/plan.md', /D9 air rules; /, ''),
      PL04: (r) => edit(r, 'docs/eras/spec/AA.md', /plan section 4/, 'plan section 99'),
      PL05: (r) => edit(r, 'docs/eras/plan.md', /102 units/, '103 units'),
      PL06: (r) => edit(r, 'docs/eras/STATUS.md', /P5 QA ->/, 'P5 QA x2 ->'),
      PL07: (r) => edit(r, 'docs/eras/plan.md', /\| DESIGN-ARCH \|/, '| DESIGN-GHOST |'),
      PL08: (r) => edit(r, 'docs/eras/spec/AA.md', /## 5\. Section 5/, '## 5x Section 5'),
      PL09: (r) => fs.rmSync(path.join(r, 'tests/golden/g1.test.mjs')),
      PL10: (r) => edit(r, 'docs/eras/plan.md', /adds M8 M9 M11/, 'adds M8 M9'),
      PL11: (r) => edit(r, 'docs/eras/spec/VF.md', /q3_program r2 /, 'q3_program r99 '),
      PL12: (r) => edit(r, 'docs/eras/plan.md', /9\.9-15\.2 days/, '5.0-15.2 days'),
      PL13: (r) => edit(r, 'src/content/era_x/manifest.js', /'X1'/, "'X9'"),
      PL14: (r) => edit(r, 'docs/eras/traceability.md', /\| UI \| P1 \| ER1 \| S \|\n/, '|  | P1 | ER1 | S |\n'),
      PL15: (r) => fs.rmSync(path.join(r, 'tests/negctl/S30.mjs')),
      PL16: (r) => edit(r, 'docs/eras/spec/AA.md', /text of 3\./, 'text of 3. TODO write this'),
    };
    for (const [id, mut] of Object.entries(defect)) {
      const r = copy(base);
      mut(r);
      const res = await lint(r);
      const me = res.find((x) => x.id === id);
      const others = res.filter((x) => x.id !== id && x.status === 'FAIL').map((x) => x.id);
      cL.soft(id, me.status === 'FAIL' && me.details.length + me.msg.length > 0, `${id} ${me.status}: ${me.msg}; other FAIL: ${others}`);
    }
    // a defect must not hide in its neighbours: the seeded PL12 defect fails PL12 only
    const r12 = copy(base); defect.PL12(r12);
    cL.soft('one_defect_fails_one_rule', (await lint(r12)).filter((x) => x.status === 'FAIL').map((x) => x.id).join() === 'PL12');
    cL.soft('placeholder_marker_in_section_7_and_code_is_allowed', (await lint(base, ['PL16']))[0].status === 'PASS' && /TODO/.test(rd(base, 'docs/eras/spec/VF.md')));
    // PENDING: an S criterion whose test is not written yet is announced, not hidden; --strict fails it
    const p = copy(base);
    edit(p, 'tests/sim/m.test.mjs', /criterion\('S44'[^\n]*\n/, '');
    fs.rmSync(path.join(p, 'tests/negctl/S44.mjs'));
    await regenerate(p);
    const pend = (await lint(p, ['PL01']))[0];
    cL.soft('pending_is_reported_as_pending', pend.status === 'PENDING' && /S44/.test(pend.msg), `${pend.status} ${pend.msg}`);
    const cli = (root, ...a) => run('plan_lint.mjs', [`--root=${root}`, ...a]);
    cL.soft('cli_exit_0_with_pending', cli(p, '--rule=PL01').status === 0 && cli(p, '--rule=PL01', '--strict').status === 1);
    cL.soft('cli_exit_1_on_fail', cli(r12).status === 1 && /FAIL\s+PL12/.test(cli(r12).stdout));
    cL.soft('cli_clean_all_pass', (() => { const o = cli(base); return o.status === 0 && /16 PASS, 0 FAIL, 0 PENDING/.test(o.stdout); })());
    cL.soft('cli_usage', run('plan_lint.mjs', ['--rule=PL99']).status === 2 && run('plan_lint.mjs', ['--bogus']).status === 2 && run('plan_lint.mjs', ['--help']).status === 0);
    cL.soft('cli_json', (() => { const o = cli(base, '--json', '--rule=PL03,PL05'); try { const j = JSON.parse(o.stdout); return j.length === 2 && j[0].id === 'PL03'; } catch { return false; } })());
    cL.soft('missing_inputs_are_failures', (await lint(mkdir('vw-empty-'), ['PL01', 'PL02', 'PL06'])).every((x) => x.status === 'FAIL'));
    // the real project: the tool runs and every rule gives a verdict (the verdicts themselves are findings for COORD, reported by `node tools/plan_lint.mjs`)
    const real = await lint(ROOT);
    cL.soft('real_project_every_rule_answers', real.length === 16 && real.every((x) => ['PASS', 'FAIL', 'PENDING'].includes(x.status) && typeof x.msg === 'string'));
  }

  // =================================================================================================================== wbs
  {
    cW.soft('csv_quotes_and_newlines', JSON.stringify(parseCsv('a,"b,c",d\n"x ""y""",,z\n')) === JSON.stringify([['a', 'b,c', 'd'], ['x "y"', '', 'z']]));
    const { wps, errors } = loadWbs(wbsCsv());
    cW.soft('csv_valid_fixture', errors.length === 0 && wps.length === 15 && wps.find((w) => w.wp === 'MISSION-MED-01').preds.join() === 'UNIT-H-MED-01,ARENA-MED-01' && wps.find((w) => w.wp === 'REG-01').sessions === 4, errors.join('; '));
    const errOf = (csv) => loadWbs(csv).errors.join(' | ');
    const base1 = wbsCsv();
    cW.soft('csv_errors', /duplicate/.test(errOf(base1 + base1.split('\n')[1] + '\n')) && /size "X"/.test(errOf(base1.replace('REG-01,REGISTRY,,P1,registry.js,L', 'REG-01,REGISTRY,,P1,registry.js,X'))) && /phase "P9"/.test(errOf(base1.replace(',P1,registry.js', ',P9,registry.js'))) &&
      /unknown predecessor NOPE/.test(errOf(base1.replace('SIM-01,SIM,REG-01', 'SIM-01,SIM,NOPE'))) && /depends on itself/.test(errOf(base1.replace('SIM-01,SIM,REG-01', 'SIM-01,SIM,SIM-01'))) && /lacks the column/.test(errOf('wp,owner\na,b\n')) &&
      /no_regret/.test(errOf(base1.replace('registry.js,L,AR-T01,,yes', 'registry.js,L,AR-T01,,'))) && /ladder_rung/.test(errOf(base1.replace(',3,no,', ',9,no,'))) && /is empty/.test(errOf('')) );
    cW.soft('csv_pred_in_a_later_phase_is_an_error', /SIM-01 \(P1\) depends on REG-01 which is in a later phase \(P3\)/.test(errOf(base1.replace('REG-01,REGISTRY,,P1', 'REG-01,REGISTRY,,P3'))));
    const cyc = loadWbs(base1.replace('REG-01,REGISTRY,,P1', 'REG-01,REGISTRY,SIM-01,P1')).wps;
    cW.soft('cycle_detected', Array.isArray(schedule(cyc).cycle) && schedule(cyc).cycle.includes('REG-01') && /cycle/.test((analyse(cyc, DEFAULT_RULES).errors || []).join()));
    const res = analyse(wps, JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/eras/wbs_rules.json'), 'utf8')));
    cW.soft('sessions_and_phase_sums', res.sessions === 27 && res.phases.map((p) => p.sessions).join() === '0,8,10,3,0,4,2' && res.phaseSumOk && res.sizes.L === 2, JSON.stringify(res.phases));
    cW.soft('resource_bound_formula', res.resource.high === 0.4 && res.resource.mid === 0.6 && res.resource.low === 1.0, JSON.stringify(res.resource));
    cW.soft('critical_path', res.criticalPath.sessions === 16 && res.criticalPath.chain[0] === 'REG-01' && res.criticalPath.chain.at(-1) === 'REL-01' && res.criticalPath.chain.includes('QA-01') && res.criticalPath.chain.includes('MISSION-MED-01'), JSON.stringify(res.criticalPath));
    cW.soft('path_bound_and_reported_duration', res.path.low === 1.1 && res.path.high === 1.6 && res.duration.low === 1.1 && res.duration.high === 1.6, JSON.stringify([res.path, res.duration]));
    // path-bound against resource-bound: a wide project is resource-bound
    const wide = loadWbs(['wp,owner,preds,phase,hot_files,size,accept,ladder_rung,no_regret,spec', ...Array.from({ length: 60 }, (_, i) => `W${i},O,,P1,,L,,,no,`)].join('\n') + '\n').wps;
    const wr = analyse(wide, DEFAULT_RULES);
    cW.soft('resource_bound_wins_on_a_wide_project', wr.criticalPath.sessions === 4 && wr.duration.low === wr.resource.high && wr.duration.high === wr.resource.low && wr.resource.low > wr.path.high, JSON.stringify([wr.duration, wr.path, wr.resource]));
    const sched = schedule(wps);
    cW.soft('float', sched.float.get('REG-01') === 0 && sched.float.get('PROP-MED-01') > 0 && sched.float.get('REVIEW-02') > 0 && sched.length === 16);
    cW.soft('float_report_by_iso_week', res.floatWeeks.length >= 1 && res.floatWeeks.every((w) => /^\d{4}-W\d{2}$/.test(w.week)) && res.tightWps === wps.filter((w) => sched.float.get(w.wp) < 4).length && res.floatWeeks[0].week === '2026-W41', JSON.stringify(res.floatWeeks));
    cW.soft('iso_week', isoWeek(new Date('2026-01-01T00:00:00Z')) === '2026-W01' && isoWeek(new Date('2024-12-30T00:00:00Z')) === '2025-W01' && isoWeek(new Date('2021-01-03T00:00:00Z')) === '2020-W53' && isoWeek(new Date('2026-10-08T00:00:00Z')) === '2026-W41');
    const rules = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/eras/wbs_rules.json'), 'utf8'));
    const toy = { ...rules, classes: [
      { id: 'units_humanoid', match: '^UNIT-H-', eras: 1, count: 8, itemsPerWp: 4 }, { id: 'units_special', match: '^UNIT-X-', eras: 1, count: 1, itemsPerWp: 1 }, { id: 'props', match: '^PROP-', eras: 1, count: 6, itemsPerWp: 6 },
      { id: 'arenas', match: '^ARENA-', eras: 1, count: 2, itemsPerWp: 1 }, { id: 'missions', match: '^MISSION-', eras: 1, count: 1, itemsPerWp: 1 }, { id: 'puzzles', match: '^PUZZLE-', eras: 1, count: 2, itemsPerWp: 2 },
      { id: 'unknown_count', match: '^ZZ-', eras: 1, count: null, itemsPerWp: 1 }, { id: 'rigs', match: '^RIG-', eras: 1, count: 2, wpsPerItem: 3 }, { id: 'text', match: '^TEXT-', eras: 1, count: 10, reserve: 0.2, itemsPerWp: 1 }] };
    const cc = classCheck(wps, toy);
    const st = (id) => cc.find((x) => x.id === id);
    cW.soft('class_counts_within_tolerance', ['units_humanoid', 'units_special', 'props', 'arenas', 'missions', 'puzzles'].every((id) => st(id).status === 'PASS') && st('unknown_count').status === 'PENDING', JSON.stringify(cc));
    cW.soft('class_formula_factors', st('rigs').expected === 6 && st('text').expected === 12 && st('rigs').status === 'FAIL', JSON.stringify([st('rigs'), st('text')]));
    cW.soft('class_tolerance_five_percent', classCheck(Array.from({ length: 20 }, (_, i) => ({ wp: 'A-' + i })), { tolerance: 0.05, classes: [{ id: 'a', match: '^A-', count: 20, itemsPerWp: 1 }] })[0].status === 'PASS' && classCheck(Array.from({ length: 19 }, (_, i) => ({ wp: 'A-' + i })), { tolerance: 0.05, classes: [{ id: 'a', match: '^A-', count: 20, itemsPerWp: 1 }] })[0].status === 'PASS' && classCheck(Array.from({ length: 18 }, (_, i) => ({ wp: 'A-' + i })), { tolerance: 0.05, classes: [{ id: 'a', match: '^A-', count: 20, itemsPerWp: 1 }] })[0].status === 'FAIL');
    cW.soft('rules_file_encodes_vf_granularity', (() => { const g = Object.fromEntries(rules.classes.map((c2) => [c2.id, c2])); return g.units_humanoid.itemsPerWp === 4 && g.units_special.itemsPerWp === 1 && g.props.itemsPerWp === 6 && g.arenas.itemsPerWp === 1 && g.missions.itemsPerWp === 1 && g.puzzles.itemsPerWp === 2 && g.text_layers.reserve === 0.2 && g.audio_families.itemsPerWp === 4 && g.rigs.wpsPerItem === 3 && g.arenas.count === 12 && g.props.count === 38; })());
    cW.soft('ladder_and_calibration_in_sessions', res.ladder.capacity13 === 4 && res.ladder.capacityAll === 6 && res.ladder.pct13 === 14.8 && res.ladder.pctAll === 22.2 && calibrate(res, 4) === 'CONTINUE' && calibrate(res, 5) === 'EXECUTE-RUNGS(5)' && calibrate(res, 6) === 'EXECUTE-RUNGS(5)' && calibrate(res, 7) === 'STOP' && calibrate(res, 0) === 'CONTINUE', JSON.stringify(res.ladder));
    // reviewer queue: arrivals above the capacity of the instances build a queue; more instances clear it
    const heavyRows = (inst) => ['wp,owner,preds,phase,hot_files,size,accept,ladder_rung,no_regret,spec', ...Array.from({ length: 80 }, (_, i) => `D${i},DESIGN,,P0,,S,,,no,spec/X${i}`), ...inst.map((n, i) => `R${i},${n},,P0,,S,,,yes,`), 'END,COORD,D0,P1,,L,,,no,'].join('\n') + '\n';
    const q1 = analyse(loadWbs(heavyRows(['REVIEWER#1'])).wps, DEFAULT_RULES).reviewer, q2 = analyse(loadWbs(heavyRows(['REVIEWER#1', 'REVIEWER#2'])).wps, DEFAULT_RULES).reviewer;
    cW.soft('reviewer_queue_and_multiplicity', q1.multiplicity === 1 && q2.multiplicity === 2 && q1.reviews === 40 && q1.maxQueue > q2.maxQueue && q2.maxQueue >= 0 && q1.daysWithQueue >= q2.daysWithQueue, JSON.stringify([q1, q2]));
    cW.soft('roles_table', res.roles.find((r) => r.role === 'REVIEWER').multiplicity === 2 && res.roles[0].sessions >= res.roles.at(-1).sessions);
    // paste between markers
    const block = renderBlock(res, []);
    const doc = 'a\n<!-- wbs:begin -->\nold\n<!-- wbs:end -->\nz\n';
    const pasted = pasteBlock(doc, block);
    cW.soft('paste_replaces_only_the_block', pasted.startsWith('a\n<!-- wbs:begin -->\ntotal sessions: 27') && pasted.endsWith('\n<!-- wbs:end -->\nz\n') && !pasted.includes('old') && pasteBlock(pasted, block) === pasted && pasteBlock('no markers', block) === null && pasteBlock('# x\n## 12. h\ntext\n', block, { insertAfter: /^## 12\./ }).includes('<!-- wbs:begin -->'));
    // the pasted block satisfies PL12 of plan_lint (its internal arithmetic) and a tampered one fails it
    const pr = copy(base);
    edit(pr, 'docs/eras/plan.md', /Honest estimate:[^\n]*\n/, `${pasteBlock('<!-- wbs:begin -->\n<!-- wbs:end -->\n', block)}`);
    cW.soft('pasted_block_passes_PL12', (await lint(pr, ['PL12']))[0].status === 'PASS', JSON.stringify((await lint(pr, ['PL12']))[0]));
    edit(pr, 'docs/eras/plan.md', /total sessions: 27/, 'total sessions: 28');
    cW.soft('tampered_block_fails_PL12', (await lint(pr, ['PL12']))[0].status === 'FAIL');
    // the CLI
    const wr2 = mkdir('vw-wbs-');
    const cliRules = { ...toy, classes: toy.classes.filter((k) => !['rigs', 'text_layers', 'text'].includes(k.id)) };
    sh(wr2, 'docs/eras/wbs.csv', wbsCsv()); sh(wr2, 'docs/eras/wbs_rules.json', JSON.stringify(cliRules));
    sh(wr2, 'docs/eras/plan.md', '# p\n\n## 12. Work\n\ntext\n\n## 13. Next\n'); sh(wr2, 'docs/eras/STATUS.md', '# s\n\n## Where we are\n\ntext\n');
    const w = (...a) => run('wbs.mjs', [`--root=${wr2}`, ...a]);
    cW.soft('cli_missing_csv_is_exit_2', run('wbs.mjs', [`--root=${mkdir('vw-wbs-empty-')}`]).status === 2);
    const rep = w();
    cW.soft('cli_report', rep.status === 0 && /total sessions: 27/.test(rep.stdout) && /resource-bound at c x u 3\.5\/2\.5\/1\.5: 0\.4 \/ 0\.6 \/ 1 days/.test(rep.stdout) && /critical path: 16 sessions/.test(rep.stdout) && /float report/.test(rep.stdout) && /reviewer queue/.test(rep.stdout), rep.stdout.slice(0, 600));
    cW.soft('cli_check_and_class_failure', w('--check').status === 0 && /PASS\s+class props/.test(w('--check').stdout) && (() => { sh(wr2, 'docs/eras/wbs_rules.json', JSON.stringify({ ...toy, classes: [{ id: 'props', match: '^PROP-', eras: 1, count: 60, itemsPerWp: 6 }] })); const o = w('--check'); sh(wr2, 'docs/eras/wbs_rules.json', JSON.stringify(cliRules)); return o.status === 1 && /FAIL\s+class props/.test(o.stdout); })());
    cW.soft('cli_calibrate', w('--calibrate', '2').stdout.trim() === 'CONTINUE' && w('--calibrate=5').stdout.trim() === 'EXECUTE-RUNGS(5)' && w('--calibrate', '9').stdout.trim() === 'STOP' && w('--calibrate', 'x').status === 2);
    cW.soft('cli_json', (() => { const j = JSON.parse(w('--json').stdout); return j.sessions === 27 && j.criticalPath.sessions === 16 && Array.isArray(j.classes); })());
    cW.soft('cli_paste_needs_markers_then_inserts_them', w('--paste').status === 2 && w('--paste', '--insert-markers').status === 0 && /<!-- wbs:begin -->\ntotal sessions: 27/.test(rd(wr2, 'docs/eras/plan.md')) && /<!-- wbs:begin -->\ntotal sessions: 27/.test(rd(wr2, 'docs/eras/STATUS.md')) && w('--paste').status === 0 && /unchanged/.test(w('--paste').stdout));
    cW.soft('cli_paste_refuses_a_failing_breakdown', (() => {
      const before = rd(wr2, 'docs/eras/plan.md');
      sh(wr2, 'docs/eras/wbs_rules.json', JSON.stringify({ ...cliRules, classes: [{ id: 'props', match: '^PROP-', eras: 1, count: 60, itemsPerWp: 6 }] }));
      const o = w('--paste');
      const csvBad = (() => { sh(wr2, 'docs/eras/wbs.csv', wbsCsv().replace('SIM-01,SIM,REG-01', 'SIM-01,SIM,NOPE')); const x = w('--paste'); sh(wr2, 'docs/eras/wbs.csv', wbsCsv()); return x.status; })();
      sh(wr2, 'docs/eras/wbs_rules.json', JSON.stringify(cliRules));
      return o.status === 1 && /refusing to paste/.test(o.stderr) && csvBad === 1 && rd(wr2, 'docs/eras/plan.md') === before;
    })());
    cW.soft('cli_usage', w('--bogus').status === 2 && w('--start', 'tomorrow').status === 2 && w('--help').status === 0);
    cW.soft('cli_start_date_moves_the_float_weeks', /2026-W5\d|2027-W0\d/.test(w('--start', '2026-12-30').stdout) && /2026-W41/.test(w().stdout));
  }

  // =================================================================================================================== p0_exit
  {
    const gateDirOf = () => mkdir('vw-gate-');
    const T = async (id, root, over = {}) => (await runChecks({ root, baseline: over.baseline, gateDir: over.gateDir, baselineSha: over.baselineSha, baselineTag: over.baselineTag, ids: [id] }))[0];
    const label = (id, ok, bad) => { cP.soft(id + '_pass', ok.status === 'PASS', `${id} should pass: ${ok.msg} ${ok.details.join('; ')}`); cP.soft(id + '_fail', bad.status === 'FAIL', `${id} should fail: ${bad.msg}`); };
    cP.soft('check_lists', ENGINE_EDIT.join() === 'P0E-02,P0E-03,P0E-04,P0E-05,REG' && FULL.length === 17 && FULL[0] === 'P0E-01' && FULL.at(-1) === 'REG');

    // P0E-01: a scratch git repository
    {
      const r = mkdir('vw-p01-');
      sh(r, 'docs/eras/golden_log.md', '# log\n\n## 2026-10-08 P0 step 0: provenance of the Ancient baseline\n- done\n');
      sh(r, 'tools/provenance.mjs', 'process.exit(0);\n');
      const git = (...a) => spawnSync('git', ['-C', r, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
      git('init', '-q'); git('add', '-A'); git('commit', '-q', '-m', 'x');
      const sha = git('rev-parse', 'HEAD').stdout.trim();
      const good = await T('P0E-01', r, { baselineSha: sha, baselineTag: 'nope' });
      sh(r, 'tools/provenance.mjs', 'console.log("FAIL page_sha"); process.exit(1);\n');
      const badTool = await T('P0E-01', r, { baselineSha: sha });
      sh(r, 'tools/provenance.mjs', 'process.exit(0);\n');
      const badSha = await T('P0E-01', r, { baselineSha: 'f'.repeat(40), baselineTag: 'nope' });
      edit(r, 'docs/eras/golden_log.md', /provenance/, 'baseline');
      const badLog = await T('P0E-01', r, { baselineSha: sha });
      label('P0E-01', good, badTool);
      cP.soft('P0E-01_sha_and_log_defects', badSha.status === 'FAIL' && /resolves/.test(badSha.details.join()) && badLog.status === 'FAIL' && /heading/.test(badLog.details.join()));
    }
    // P0E-02: golden criteria registered and green on THIS tree
    {
      const r = await lintFixture(); tmps.push(r);
      const gd = gateDirOf();
      const ids = ['VF-T03', 'VF-G2', 'VF-G3', 'VF-G4', 'VF-T05', 'VF-T06', 'VF-G7', 'VF-T08', 'VF-T09', 'VF-T10', 'AR-T20', 'AR-T21'];
      const gtests = ids.map((id) => `criterion('${id}', { er: ['ER1'], owner: 'T', tier: 'T-fast', negctl: 'tests/negctl/${id}.mjs' });`).join('\n');
      sh(r, 'tests/golden/all.test.mjs', `import { criterion } from '../lib/criteria.mjs';\n${gtests}\n`);
      for (const id of ids) sh(r, `tests/negctl/${id}.mjs`, `export default { id: 'NC-${id}', criterion: '${id}', expectRed: ['${id}/x'], run: ['node', 'tests/golden/all.test.mjs'], mutate() {} };\n`);
      await regenerate(r);
      const crit = (over = {}, er1 = 'PASS') => ({ schema: 1, run: { id: 'g', tier: 'full', treeHash: treeHash(r).treeHash }, criteria: Object.fromEntries(ids.map((id) => [id, { status: 'PASS', er: ['ER1'], ...(over[id] || {}) }])), er: { ER1: { status: er1, missing: [] } } });
      const put = (doc) => sh(gd, 'criteria.json', JSON.stringify(doc));
      put(crit());
      const good = await T('P0E-02', r, { gateDir: gd });
      put(crit({ 'VF-G7': { status: 'UNVERIFIED', reason: 'U4' } }));
      const bad = await T('P0E-02', r, { gateDir: gd });
      put(crit({}, 'UNVERIFIED'));
      const badEr = await T('P0E-02', r, { gateDir: gd });
      put({ ...crit(), run: { id: 'g', tier: 'full', treeHash: '0'.repeat(64) } });
      const stale = await T('P0E-02', r, { gateDir: gd });
      put(crit());
      edit(r, 'tests/golden/all.test.mjs', /criterion\('VF-T05'[^\n]*\n/, ''); await regenerate(r);
      const missing = await T('P0E-02', r, { gateDir: gd });
      label('P0E-02', good, bad);
      cP.soft('P0E-02_er1_stale_and_unregistered', badEr.status === 'FAIL' && /ER1 is UNVERIFIED/.test(badEr.details.join()) && stale.status === 'FAIL' && /another tree|produced for tree/.test(stale.details.join()) && missing.status === 'FAIL' && /G5: no criterion registered/.test(missing.details.join()), JSON.stringify([badEr.details, stale.details, missing.details]));
    }
    // P0E-03: no engine edit (NC: a changed src/sim byte)
    {
      const a = mkdir('vw-p03a-'), b = mkdir('vw-p03b-');
      for (const d of [a, b]) { sh(d, 'src/sim/world.js', 'export class World { tick() { return 1; } }\n'); sh(d, 'src/world/gen.js', 'export const g = 1;\n'); sh(d, 'src/voxel/v.js', 'export const v = 1;\n'); sh(d, 'src/render/r.js', 'export const r = 1;\n'); }
      const good = await T('P0E-03', a, { baseline: b });
      edit(a, 'src/sim/world.js', /return 1/, 'return 2');
      const bad = await T('P0E-03', a, { baseline: b });
      label('P0E-03', good, bad);
      const a2 = mkdir('vw-p03c-'); sh(a2, 'src/render/r.js', 'export const r = 2;\n'); sh(a2, 'src/sim/world.js', rd(b, 'src/sim/world.js')); sh(a2, 'src/world/gen.js', rd(b, 'src/world/gen.js')); sh(a2, 'src/voxel/v.js', rd(b, 'src/voxel/v.js'));
      const render = await T('P0E-03', a2, { baseline: b });
      cP.soft('P0E-03_render_and_missing_baseline', render.status === 'FAIL' && /renderHash differs/.test(render.details.join()) && (await T('P0E-03', a, { baseline: path.join(b, 'nope') })).status === 'FAIL');
    }
    // P0E-04: three green quiet T-fast runs
    {
      const gd = gateDirOf();
      const row = (o = {}) => JSON.stringify({ tier: 'fast', status: 'PASS', wallS: 200, load1Start: 0.4, steps: [{ name: 'tests', status: 'PASS' }], tests: { n: 100 }, ...o });
      sh(gd, 'gate_log.jsonl', [row(), row({ wallS: 230 }), row({ wallS: 210 })].join('\n') + '\n');
      const good = await T('P0E-04', mkdir('vw-x-'), { gateDir: gd });
      sh(gd, 'gate_log.jsonl', [row(), row({ wallS: 260 }), row({ wallS: 250 })].join('\n') + '\n');
      const slow = await T('P0E-04', mkdir('vw-x-'), { gateDir: gd });
      sh(gd, 'gate_log.jsonl', [row(), row({ load1Start: 2.5 }), row()].join('\n') + '\n');
      const loaded = await T('P0E-04', mkdir('vw-x-'), { gateDir: gd });
      sh(gd, 'gate_log.jsonl', [row(), row({ status: 'FAIL' }), row({ tier: 'full' }), row({ steps: [{ name: 'lint', status: 'PASS' }] })].join('\n') + '\n');
      const few = await T('P0E-04', mkdir('vw-x-'), { gateDir: gd });
      label('P0E-04', good, slow);
      cP.soft('P0E-04_load_and_count', loaded.status === 'FAIL' && /load >= 1/.test(loaded.details.join()) && few.status === 'FAIL' && /only 1 complete/.test(few.msg) && (await T('P0E-04', mkdir('vw-x-'), { gateDir: mkdir('vw-nolog-') })).status === 'FAIL');
    }
    // P0E-05
    {
      const r = mkdir('vw-p05-');
      const noise = (n) => JSON.stringify({ schema: 1, kind: 'perf_noise', sizes: { 150: { n, sigma: 0.01 }, 300: { n: 15, sigma: 0.02 }, 500: { n: 15, sigma: 0.03 } } });
      sh(r, 'tests/baseline/perf_noise.json', noise(15));
      const good = await T('P0E-05', r);
      sh(r, 'tests/baseline/perf_noise.json', noise(9));
      const bad = await T('P0E-05', r);
      label('P0E-05', good, bad);
      fs.rmSync(path.join(r, 'tests/baseline/perf_noise.json'));
      cP.soft('P0E-05_missing_file', (await T('P0E-05', r)).status === 'FAIL');
    }
    // P0E-06
    {
      const r = mkdir('vw-p06-');
      const spike = (n, decision = 'keep the table') => `# SP-${n}\n\nquestion: q\nsetup: s\nmetrics: table\ndecision: ${decision}\namendments: none\n`;
      for (const n of [1, 2, 3, 4]) sh(r, `docs/eras/spikes/SP-${n}_x.md`, spike(n));
      const good = await T('P0E-06', r);
      sh(r, 'docs/eras/spikes/SP-2_x.md', spike(2, ''));
      const empty = await T('P0E-06', r);
      sh(r, 'docs/eras/spikes/SP-2_x.md', spike(2));
      fs.rmSync(path.join(r, 'docs/eras/spikes/SP-3_x.md'));
      const gone = await T('P0E-06', r);
      label('P0E-06', good, gone);
      cP.soft('P0E-06_empty_decision_and_fields', empty.status === 'FAIL' && /decision is empty/.test(empty.details.join()) && fieldValue('## decision\nkeep it\n\n## amendments\nnone\n', 'decision') === 'keep it' && fieldValue('x: y\n', 'decision') === null && fieldValue('**Decision**: yes\n', 'decision') === 'yes');
      sh(r, 'docs/eras/spikes/SP-3_x.md', '# SP-3\n\nquestion: q\ndecision: d\n');
      cP.soft('P0E-06_missing_fields', (await T('P0E-06', r)).details.join().includes('setup'));
    }
    // P0E-07..09, 12: documents (lint fixture)
    {
      const r = await lintFixture(); tmps.push(r);
      const good7 = await T('P0E-07', r);
      const r7 = copy(r); edit(r7, 'docs/eras/plan.md', /\| final \|\n\| `spec\/M`/, '| soon |\n| `spec/M`');
      label('P0E-07', good7, await T('P0E-07', r7));
      const r7b = copy(r); edit(r7b, 'docs/eras/plan.md', /draft until P0 exit/, 'draft');
      cP.soft('P0E-07_draft_without_a_gate', (await T('P0E-07', r7b)).status === 'FAIL');
      label('P0E-08', await T('P0E-08', r), await (async () => { const x = copy(r); edit(x, 'docs/eras/plan.md', /102 units/, '103 units'); return T('P0E-08', x); })());
      const good9 = await T('P0E-09', r);
      const r9 = copy(r); edit(r9, 'docs/eras/traceability.md', /# traceability.md final/, '# traceability.md v0');
      label('P0E-09', good9, await T('P0E-09', r9));
      const r9b = copy(r); edit(r9b, 'docs/eras/traceability.md', /\| 3 clause text 2 \|[^\n]*\n/, '');
      const r9c = copy(r); edit(r9c, 'docs/eras/traceability.md', /\| S \|\n/, '| W |\n');
      const r9d = copy(r); edit(r9d, 'docs/eras/traceability.md', /\| UI \| P1 \| ER1 \| S \|/, '| UI | P1 | ER99 | S |');
      const x9 = [await T('P0E-09', r9b), await T('P0E-09', r9c), await T('P0E-09', r9d)];
      cP.soft('P0E-09_missing_clause_weak_row_unknown_evidence', x9[0].status === 'FAIL' && /clause 3 has 0/.test(x9[0].details.join()) && x9[1].status === 'FAIL' && /weak row/.test(x9[1].details.join()) && x9[2].status === 'FAIL' && /ER99/.test(x9[2].details.join()), JSON.stringify(x9.map((x) => x.details)));
      const r12 = copy(r); edit(r12, 'docs/eras/STATUS.md', /P5 QA ->/, 'P5 QA x2 ->');
      label('P0E-12', await T('P0E-12', r), await T('P0E-12', r12));
    }
    // P0E-10, 11, 15 with a wbs
    {
      const r = await lintFixture(); tmps.push(r);
      const rules = { schema: 1, classes: [{ id: 'arenas', match: '^ARENA-', eras: 1, count: 2, itemsPerWp: 1 }] };
      sh(r, 'docs/eras/wbs.csv', wbsCsv()); sh(r, 'docs/eras/wbs_rules.json', JSON.stringify(rules));
      const no = await T('P0E-10', r);
      cP.soft('P0E-10_no_block_yet', no.status === 'FAIL' && /wbs:begin/.test(no.msg));
      const p = run('wbs.mjs', [`--root=${r}`, '--paste', '--insert-markers']);
      cP.soft('P0E-10_paste_ran', p.status === 0, p.stderr);
      const good = await T('P0E-10', r);
      edit(r, 'docs/eras/plan.md', /total sessions: 27/, 'total sessions: 26');
      const stale = await T('P0E-10', r);
      label('P0E-10', good, stale);
      const badCsv = copy(r); sh(badCsv, 'docs/eras/wbs.csv', 'wp,owner\n');
      cP.soft('P0E-10_missing_csv_and_bad_csv', (await T('P0E-10', mkdir('vw-n-'))).status === 'FAIL' && (await T('P0E-10', badCsv)).status === 'FAIL');
      // P0E-11: cuts.md ladder vs wbs rungs (1: 2, 2: 1, 3: 1, 5: 2)
      const good11 = await T('P0E-11', r);
      const r11 = copy(r); edit(r11, 'docs/eras/cuts.md', /\| 2 \| b \| 1 \|/, '| 2 | b | 7 |');
      const r11b = copy(r); edit(r11b, 'docs/eras/cuts.md', /\| 5 \| d \| 2 \|\n/, '');
      label('P0E-11', good11, await T('P0E-11', r11));
      cP.soft('P0E-11_missing_rung_row', (await T('P0E-11', r11b)).status === 'FAIL' && /rung 5/.test((await T('P0E-11', r11b)).details.join()));
      // P0E-15
      const good15 = await T('P0E-15', r);
      const r15 = copy(r); sh(r15, 'docs/eras/wbs.csv', wbsCsv().replace('REVIEWER#2', 'REVIEWER#1'));
      label('P0E-15', good15, await T('P0E-15', r15));
    }
    // P0E-13: reds
    {
      const r = mkdir('vw-p13-');
      sh(r, 'docs/eras/STATUS.md', '- P2 in progress.\n');
      const red = (o) => JSON.stringify({ id: 'R-1', opened: 'x', phase: 'P2', step: 's', owner: 'SIM', deadline: 'P2', status: 'open', ...o });
      const none = await T('P0E-13', r);
      sh(r, 'docs/eras/reds.jsonl', [red({}), red({ id: 'R-2' })].join('\n') + '\n');
      const two = await T('P0E-13', r);
      sh(r, 'docs/eras/reds.jsonl', [1, 2, 3, 4].map((i) => red({ id: 'R-' + i })).join('\n') + '\n');
      const four = await T('P0E-13', r);
      sh(r, 'docs/eras/reds.jsonl', [red({ phase: 'P1' })].join('\n') + '\n');
      const old = await T('P0E-13', r);
      sh(r, 'docs/eras/reds.jsonl', [red({ owner: '' }), red({ id: 'R-2', deadline: undefined })].join('\n') + '\n');
      const unowned = await T('P0E-13', r);
      sh(r, 'docs/eras/reds.jsonl', [red({}), red({ status: 'closed' })].join('\n') + '\n');
      const closed = await T('P0E-13', r);
      label('P0E-13', two, four);
      cP.soft('P0E-13_none_closed_old_unowned', none.status === 'PASS' && closed.status === 'PASS' && old.status === 'FAIL' && /earlier|still open/.test(old.details.join()) && unowned.status === 'FAIL' && /no owner/.test(unowned.details.join()) && /no deadline/.test(unowned.details.join()));
    }
    // P0E-14, 16
    {
      const r = mkdir('vw-p14-');
      sh(r, 'tools/own_check.mjs', 'process.exit(0);\n');
      const good = await T('P0E-14', r);
      sh(r, 'tools/own_check.mjs', 'console.log("owner violation"); process.exit(1);\n');
      const bad = await T('P0E-14', r);
      label('P0E-14', good, bad);
      cP.soft('P0E-14_missing_tool', (await T('P0E-14', mkdir('vw-n-'))).status === 'FAIL');
      const h = mkdir('vw-p16-');
      sh(h, 'docs/eras/hosted_honesty.md', 'Not verifiable here: sound by ear, real GPU speed, hosted viewer behaviour, non-Chromium engines.\n');
      sh(h, 'docs/requests/tools_hooks.md', '# hooks\n\nthe exact API of the hooks the tools need is listed here.\n');
      const g16 = await T('P0E-16', h);
      fs.rmSync(path.join(h, 'docs/requests/tools_hooks.md'));
      label('P0E-16', g16, await T('P0E-16', h));
    }
    // REG
    {
      const r = await lintFixture(); tmps.push(r);
      const gd = gateDirOf();
      sh(gd, 'criteria.json', JSON.stringify({ schema: 1, criteria: {}, er: { ER1: { status: 'UNVERIFIED' } } }));
      sh(r, 'tools/report.mjs', '// present\n');
      const good = await T('REG', r, { gateDir: gd });
      sh(gd, 'criteria.json', JSON.stringify({ schema: 1, criteria: {}, er: {} }));
      const noEr = await T('REG', r, { gateDir: gd });
      sh(gd, 'criteria.json', JSON.stringify({ schema: 1, criteria: {}, er: { ER1: {} } }));
      const r2 = copy(r); sh(r2, 'tests/sim/extra.test.mjs', "import { criterion } from '../lib/criteria.mjs';\ncriterion('NEW-1', { er: ['ER1'] });\n");
      const drift = await T('REG', r2, { gateDir: gd });
      label('REG', good, drift);
      cP.soft('REG_needs_an_er_rollup', noEr.status === 'FAIL' && /roll-up/.test(noEr.details.join()) && drift.details.join().includes('drifts'));
    }
    // the CLI
    {
      cP.soft('cli_usage', run('p0_exit.mjs', []).status === 2 && run('p0_exit.mjs', ['--bogus']).status === 2 && run('p0_exit.mjs', ['--only=P0E-99']).status === 2 && run('p0_exit.mjs', ['--help']).status === 0);
      const a = mkdir('vw-cli-a-'), b = mkdir('vw-cli-b-');
      for (const d of [a, b]) sh(d, 'src/sim/world.js', 'export const w = 1;\n');
      const ok = run('p0_exit.mjs', ['--only=P0E-03', `--root=${a}`, `--baseline=${b}`]);
      edit(a, 'src/sim/world.js', /1/, '2');
      const bad = run('p0_exit.mjs', ['--only=P0E-03', `--root=${a}`, `--baseline=${b}`, '--json']);
      cP.soft('cli_exit_codes_and_json', ok.status === 0 && /PASS\s+P0E-03/.test(ok.stdout) && bad.status === 1 && JSON.parse(bad.stdout)[0].status === 'FAIL');
      cP.soft('engine_edit_fails_on_a_changed_src_sim_byte', (() => { const o = run('p0_exit.mjs', ['--engine-edit', `--root=${a}`, `--baseline=${b}`, `--gate-dir=${mkdir('vw-g-')}`]); return o.status === 1 && /FAIL\s+P0E-03/.test(o.stdout) && /p0_exit engine-edit/.test(o.stdout); })());
      const real = await runChecks({ root: ROOT, ids: FULL });
      cP.soft('real_project_every_check_answers', real.length === 17 && real.every((x) => ['PASS', 'FAIL'].includes(x.status) && x.msg), real.map((x) => x.id + ':' + x.status).join(' '));
    }
  }
} catch (e) { bad++; for (const cc of [cL, cW, cP]) cc.soft('uncaught: ' + String(e && e.message).slice(0, 100), false); console.error(e.stack); }
for (const [name, cc] of [['VF-T26-lint', cL], ['VF-T26-wbs', cW], ['VF-T26-p0exit', cP]]) {
  if (cc.failures.length) { bad++; console.error(`RED ${name}: ${cc.failures.join(', ')}`); } else console.log(`ok  ${name}: ${cc.assertions} assertions`);
  cc.done();
}
process.exitCode = bad ? 1 : 0;
