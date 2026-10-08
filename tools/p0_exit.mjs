// tools/p0_exit.mjs: the P0 exit checklist as a script (VF 3.21, VF-D17; owner TOOLS-VERIFY; criterion VF-T26-p0exit).
//
//   node tools/p0_exit.mjs --engine-edit     P0E-02..P0E-05 plus the registry skeleton (REG): what COORD runs before the FIRST src/** edit
//   node tools/p0_exit.mjs --full            all sixteen checks and REG: the P0 exit
//   --only=P0E-03,REG   run these checks only            --json   machine-readable result             --root=<dir>   tree to check (default this repository)
//   --baseline=<dir>    baseline worktree (default <main>/.cache/baseline/ancient-v8)               --gate-dir=<dir>   gate artefacts (default $VW_GATE_DIR or .cache/gate)
//   --baseline-sha=<sha> --baseline-tag=<tag>   what P0E-01 must be able to resolve (default 4aafd2e3..., ancient-v8)
// Checks (each prints PASS/FAIL with the reason; a missing input is a FAIL, never a skip):
//   P0E-01 provenance verdict recorded: a provenance heading in golden_log.md, the tag or sha resolves in git, `tools/provenance.mjs --check` exits 0
//   P0E-02 G1..G12 recorded, each with a registered and proven negative control, ER1 PASS in a criteria.json produced for THIS tree
//   P0E-03 engineHash(simCore, shared) and renderHash of the tree equal the baseline worktree's (no engine edit yet)
//   P0E-04 gate lanes and tiers measured: the median of 3 gate_log.jsonl T-fast runs <= 240 s, each started with 1-minute load < 1
//   P0E-05 A/A noise floors present: tests/baseline/perf_noise.json with n = 15 at 150, 300 and 500 units
//   P0E-06 every spike SP-1..SP-4 has docs/eras/spikes/SP-<n>_*.md with the five fields and a non-empty decision (RA-T24)
//   P0E-07 every plan section 14 row is `final` or `draft until <named gate>`, and the spec rows lint green (PL08)
//   P0E-08 plan_lint has no FAIL
//   P0E-09 traceability.md is final (not v0), every e.md clause has a row, every row an owner and existing evidence, no weak row
//   P0E-10 wbs.csv exists, `wbs.mjs --check` passes and the block between the wbs markers of plan section 12 equals the current output
//   P0E-11 the ladder capacity per rung in cuts.md equals the wbs.mjs output
//   P0E-12 STATUS.md uses the P0-P6 names of plan section 12 (PL06)
//   P0E-13 reds: at most 3 open, none opened in an earlier phase, each with owner and deadline (docs/eras/reds.jsonl; the rules of VF 3.20 --phase-exit)
//   P0E-14 `tools/own_check.mjs --any` exits 0
//   P0E-15 REVIEWER has at least 2 instances in wbs.csv
//   P0E-16 docs/eras/hosted_honesty.md and docs/requests/tools_hooks.md exist
//   REG    registry skeleton: criteria client present, manifest and ER table current, a gate criteria.json with the ER roll-up exists
// exit: 0 every selected check PASS, 1 a FAIL, 2 usage error
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { ROOT, MAIN_ROOT, GATE_DIR } from './lib/paths.mjs';
import { readText, readJson, exists, tables, sections } from './lib/docs_parse.mjs';
import { engineHash, renderHash } from './lib/fingerprint.mjs';
import { treeHash } from './lib/snapshot.mjs';
import { parseErTable, scanManifest, stable } from './lib/er_rollup.mjs';
import { lint } from './plan_lint.mjs';
import { loadWbs, analyse, renderBlock, classCheck, DEFAULT_RULES } from './wbs.mjs';

const HELP = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l, i, a) => a.slice(0, i + 1).every((x) => x.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n');
const OK = (msg, details = []) => ({ status: 'PASS', msg, details });
const NO = (msg, details = []) => ({ status: 'FAIL', msg, details });
const sh = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 64 << 20 });
const clean = (s) => String(s || '').replace(/`/g, '').replace(/\*\*/g, '').trim();
const phaseNow = (status) => { const m = /\bP(\d)\b[^.\n]*\bin progress\b/i.exec(status || ''); return m ? +m[1] : 0; };

/** G1..G12 -> the criterion ids that register them (the VF 4 id or the id the golden's builder used). */
export const GOLDEN_CRITERIA = {
  G1: ['VF-T03'], G2: ['VF-G2'], G3: ['VF-G3'], G4: ['VF-G4'], G5: ['VF-T05'], G6: ['VF-T06'], G7: ['VF-G7'], G8: ['VF-T08'], G9: ['VF-T09'], G10: ['VF-T10'], G11: ['AR-T20'], G12: ['AR-T21'],
};
export const SPIKES = ['SP-1', 'SP-2', 'SP-3', 'SP-4'];
export const SPIKE_FIELDS = ['question', 'setup', 'metrics', 'decision', 'amendments'];

/** Value of a field in a spike verdict: `decision: text`, `## decision` followed by text, or `**decision**: text`. null when the field is absent. */
export function fieldValue(text, name) {
  const lines = text.split('\n');
  const re = new RegExp(`^\\s*(?:#{1,6}\\s*)?(?:\\*\\*)?${name}(?:\\*\\*)?\\s*:?\\s*(.*)$`, 'i');
  const next = new RegExp(`^\\s*(?:#{1,6}\\s*)?(?:\\*\\*)?(?:${SPIKE_FIELDS.join('|')})(?:\\*\\*)?\\s*:?\\s*`, 'i');
  for (let i = 0; i < lines.length; i++) {
    const m = re.exec(lines[i]);
    if (!m) continue;
    let v = m[1];
    for (let j = i + 1; j < lines.length && !next.test(lines[j]) && !/^#{1,6}\s/.test(lines[j]); j++) v += ' ' + lines[j];
    return v.replace(/[*_`|-]/g, ' ').trim();
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------------- the checks
const CHECKS = {
  async 'P0E-01'(c) {
    const d = [];
    const gl = readText(c.root, 'docs/eras/golden_log.md');
    if (gl == null) d.push('docs/eras/golden_log.md missing');
    else if (!/^##\s.*provenance/im.test(gl)) d.push('golden_log.md has no heading naming the provenance verdict ("## ... provenance ...")');
    const git = (args) => sh('git', ['-C', c.root, ...args], c.root);
    const bySha = git(['rev-parse', '--verify', '--quiet', c.baselineSha + '^{commit}']);
    const byTag = git(['rev-parse', '--verify', '--quiet', 'refs/tags/' + c.baselineTag + '^{commit}']);
    if (bySha.status !== 0 && byTag.status !== 0) d.push(`neither the sha ${c.baselineSha.slice(0, 8)} nor the tag ${c.baselineTag} resolves in git`);
    const tool = path.join(c.root, 'tools/provenance.mjs');
    if (!fs.existsSync(tool)) d.push('tools/provenance.mjs missing');
    else { const r = sh('node', [tool, '--check'], c.root); if (r.status !== 0) d.push('tools/provenance.mjs --check exits ' + r.status + ': ' + (r.stdout + r.stderr).trim().split('\n').filter((l) => /^FAIL/.test(l)).slice(0, 3).join(' | ')); }
    return d.length ? NO('provenance not proven', d) : OK(`verdict recorded; ${bySha.status === 0 ? 'sha ' + c.baselineSha.slice(0, 8) : 'tag ' + c.baselineTag} resolves; provenance --check green`);
  },

  async 'P0E-02'(c) {
    const d = [];
    const man = readJson(c.root, 'tools/lib/criteria_manifest.json');
    if (!man) return NO('tools/lib/criteria_manifest.json missing (node tools/report.mjs --scan)');
    const ids = new Set(man.criteria.map((x) => x.id));
    let crit = null; try { crit = JSON.parse(fs.readFileSync(path.join(c.gateDir, 'criteria.json'), 'utf8')); } catch { /* none */ }
    const th = treeHash(c.root).treeHash;
    if (!crit) d.push('no criteria.json: run node tools/gate.mjs --tier=full first');
    else if (crit.run && crit.run.treeHash !== th) d.push(`criteria.json was produced for tree ${String(crit.run.treeHash).slice(0, 12)}, this tree is ${th.slice(0, 12)}: run the gate on this tree`);
    for (const [g, list] of Object.entries(GOLDEN_CRITERIA)) {
      const reg = list.filter((id) => ids.has(id));
      if (!reg.length) { d.push(`${g}: no criterion registered (${list.join(' or ')}): golden not recorded or not tested`); continue; }
      for (const id of reg) {
        const e = crit && crit.criteria && crit.criteria[id];
        if (!e) d.push(`${g}: ${id} did not run in the gate run`);
        else if (e.status !== 'PASS') d.push(`${g}: ${id} is ${e.status}${e.reason ? ' (' + String(e.reason).slice(0, 60) + ')' : ''}`);
      }
    }
    const er1 = crit && crit.er && crit.er.ER1;
    if (!er1) d.push('ER1 has no roll-up in criteria.json'); else if (er1.status !== 'PASS') d.push(`ER1 is ${er1.status}${er1.missing && er1.missing.length ? '; missing ' + er1.missing.slice(0, 4).join(', ') + (er1.missing.length > 4 ? ', ...' : '') : ''}`);
    return d.length ? NO(`${d.length} golden or ER1 problem(s)`, d) : OK('G1..G12 recorded and tested with proven negative controls; ER1 PASS on this tree');
  },

  async 'P0E-03'(c) {
    if (!fs.existsSync(path.join(c.baseline, 'src'))) return NO(`baseline worktree ${c.baseline} missing (git worktree add -f .cache/baseline/ancient-v8 4aafd2e)`);
    const a = engineHash(c.root), b = engineHash(c.baseline);
    const ra = renderHash(c.root), rb = renderHash(c.baseline);
    const d = [];
    if (a.simCore !== b.simCore) d.push(`simCore differs: tree ${a.simCore.slice(0, 12)} vs baseline ${b.simCore.slice(0, 12)}`);
    if (a.shared !== b.shared) d.push(`shared differs: tree ${a.shared.slice(0, 12)} vs baseline ${b.shared.slice(0, 12)}`);
    if (ra !== rb) d.push(`renderHash differs: tree ${ra.slice(0, 12)} vs baseline ${rb.slice(0, 12)}`);
    return d.length ? NO('an engine file changed since the baseline', d) : OK(`simCore ${a.simCore.slice(0, 12)}, shared ${a.shared.slice(0, 12)}, renderHash ${ra.slice(0, 12)} equal the baseline's`);
  },

  async 'P0E-04'(c) {
    let rows = [];
    try { rows = fs.readFileSync(path.join(c.gateDir, 'gate_log.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch { return NO('no gate_log.jsonl: run node tools/gate.mjs --fast three times on a quiet box'); }
    const full = rows.filter((r) => r.tier === 'fast' && r.status === 'PASS' && Array.isArray(r.steps) && r.steps.some((s) => s.name === 'tests' && s.status === 'PASS') && r.tests && r.tests.n > 0 && !r.partial);
    const last = full.slice(-3);
    if (last.length < 3) return NO(`only ${last.length} complete green T-fast gate runs in gate_log.jsonl, need 3`);
    const walls = last.map((r) => r.wallS).sort((x, y) => x - y);
    const med = walls[1];
    const d = [];
    if (!(med <= 240)) d.push(`median wall ${med} s > 240 s (runs: ${last.map((r) => r.wallS).join(', ')})`);
    const loaded = last.filter((r) => !(r.load1Start < 1));
    if (loaded.length) d.push(`${loaded.length} run(s) started with 1-minute load >= 1 (${last.map((r) => r.load1Start).join(', ')}): measure on a quiet box`);
    return d.length ? NO('T-fast not measured within budget', d) : OK(`median of 3 T-fast runs ${med} s <= 240 s, loads ${last.map((r) => r.load1Start).join('/')}`);
  },

  async 'P0E-05'(c) {
    const f = readJson(c.root, 'tests/baseline/perf_noise.json');
    if (!f) return NO('tests/baseline/perf_noise.json missing: the A/A noise floors of perf_assert --aa (n = 15 at 150/300/500 units) are not recorded');
    const d = [];
    for (const size of ['150', '300', '500']) {
      const e = f.sizes && f.sizes[size];
      if (!e) d.push(`no entry for ${size} units`);
      else { if (e.n !== 15) d.push(`${size} units: n = ${e.n}, need 15`); if (!(typeof e.sigma === 'number' && e.sigma >= 0)) d.push(`${size} units: sigma missing`); }
    }
    return d.length ? NO('noise floors incomplete', d) : OK('A/A noise floors present: n = 15 at 150, 300 and 500 units');
  },

  async 'P0E-06'(c) {
    const dir = path.join(c.root, 'docs/eras/spikes');
    let files = []; try { files = fs.readdirSync(dir); } catch { /* none */ }
    const d = [];
    for (const sp of SPIKES) {
      const f = files.find((n) => new RegExp(`^${sp}_.*\\.md$`).test(n));
      if (!f) { d.push(`${sp}: docs/eras/spikes/${sp}_*.md missing`); continue; }
      const text = fs.readFileSync(path.join(dir, f), 'utf8');
      const missing = SPIKE_FIELDS.filter((k) => fieldValue(text, k) === null);
      if (missing.length) d.push(`${f}: field(s) ${missing.join(', ')} missing`);
      else if ((fieldValue(text, 'decision') || '').length < 3) d.push(`${f}: decision is empty`);
    }
    return d.length ? NO(`${d.length} spike verdict problem(s)`, d) : OK(`${SPIKES.length} spike verdicts with a decision`);
  },

  async 'P0E-07'(c) {
    const plan = readText(c.root, 'docs/eras/plan.md'); if (plan == null) return NO('docs/eras/plan.md missing');
    const s14 = sections(plan).find((s) => s.num === '14'); if (!s14) return NO('plan section 14 not found');
    const t = tables(s14.body).find((tb) => tb.header[0] === 'file'); if (!t) return NO('plan section 14 has no deliverables table');
    const si = t.header.indexOf('state');
    const d = [];
    for (const r of t.rows) {
      const state = clean(r[si] || '').toLowerCase();
      if (!(/^final\b/.test(state) || /\bdraft until [a-z0-9][^;,]*/.test(state))) d.push(`${clean(r[0]).slice(0, 34)}: state "${state}" is neither "final" nor "draft until <named gate>"`);
    }
    const l8 = (await lint(c.root, ['PL08']))[0];
    if (l8.status !== 'PASS') d.push('lint PL08: ' + l8.msg, ...l8.details.slice(0, 4));
    return d.length ? NO(`${d.length} section 14 problem(s)`, d) : OK(`${t.rows.length} rows are final or draft-until-gate and the spec rows lint green`);
  },

  async 'P0E-08'(c) {
    const res = await lint(c.root);
    const bad = res.filter((r) => r.status === 'FAIL');
    const pend = res.filter((r) => r.status === 'PENDING');
    return bad.length ? NO(`plan_lint: ${bad.length} FAIL (${bad.map((b) => b.id).join(' ')})`, bad.flatMap((b) => [`${b.id}: ${b.msg}`, ...b.details.slice(0, 2).map((x) => '  ' + x)])) : OK(`plan_lint green (${res.filter((r) => r.status === 'PASS').length} PASS, ${pend.length} PENDING: ${pend.map((p) => p.id).join(' ') || '-'})`);
  },

  async 'P0E-09'(c) {
    const tr = readText(c.root, 'docs/eras/traceability.md'); if (tr == null) return NO('docs/eras/traceability.md missing');
    const emd = readText(c.root, 'docs/eras/e.md'); if (emd == null) return NO('docs/eras/e.md missing');
    const d = [];
    if (/^#\s.*\bv0\b/m.test(tr)) d.push('the title still says v0: traceability.md is not final');
    const t = tables(tr).find((tb) => /e\.md clause/i.test(tb.header[0])); if (!t) return NO('traceability.md has no table "e.md clause | ..."');
    const ei = t.header.findIndex((h) => /^evidence$/i.test(h)), oi = t.header.findIndex((h) => /^owner$/i.test(h)), ni = t.header.findIndex((h) => /^now$/i.test(h));
    const ids = t.rows.map((r) => (/^(\d+(?:\.\d+)?|[OD]\d+)\b/.exec(clean(r[0])) || [])[1]).filter(Boolean);
    // clauses of e.md: section 2 items N.k, section 8 items 8.k, O codes of section 6, D codes of section 7, section 3 as 3, section 5 bullets as 5 (one row per bullet)
    const es = sections(emd);
    const need = new Map();
    const s = (n) => es.find((x) => x.num === n);
    if (s('2')) for (const m of s('2').body.matchAll(/^(\d+)\.\s/gm)) need.set(`2.${m[1]}`, 1);
    if (s('8')) for (const m of s('8').body.matchAll(/^(\d+)\.\s/gm)) need.set(`8.${m[1]}`, 1);
    if (s('6')) for (const m of s('6').body.matchAll(/\bO(\d+):/g)) need.set(`O${m[1]}`, 1);
    if (s('7')) for (const m of s('7').body.matchAll(/^- D(\d+):/gm)) need.set(`D${m[1]}`, 1);
    if (s('3')) need.set('3', 1);
    if (s('5')) need.set('5', (s('5').body.match(/^- /gm) || []).length || 1);
    const have = (k) => ids.filter((x) => x === k).length;
    for (const [k, n] of need) if (have(k) < n) d.push(`e.md clause ${k} has ${have(k)} row(s), needs ${n}`);
    const ers = new Set((readJson(c.root, 'tools/lib/er_table.json')?.rows || []).map((r) => r.er));
    const man = new Set((readJson(c.root, 'tools/lib/criteria_manifest.json')?.criteria || []).map((x) => x.id));
    for (const r of t.rows) {
      const label = clean(r[0]).slice(0, 34);
      const ev = r[ei] || '';
      if (!clean(r[oi] || '')) d.push(`${label}: no owner`);
      const closed = /closed|out of this delivery|n\/a/i.test(r.join(' ')) && /D19|O\d/.test(r[0] + r.join(' '));
      if (!closed && !(/\bER\d+b?\b/.test(ev) || /`[^`]+`/.test(ev))) d.push(`${label}: evidence "${clean(ev).slice(0, 30)}" names no ER and no registered test`);
      for (const m of ev.matchAll(/\bER\d+b?\b/g)) if (!ers.has(m[0])) d.push(`${label}: evidence ${m[0]} is not a row of the ER table`);
      for (const m of ev.matchAll(/`([A-Z][A-Za-z0-9]*-[A-Za-z0-9-]+|S\d+)`/g)) if (!man.has(m[1])) d.push(`${label}: test id ${m[1]} is not in criteria_manifest.json`);
      if (ni >= 0 && /^W/.test(clean(r[ni] || ''))) d.push(`${label}: weak row (strength W)`);
    }
    return d.length ? NO(`${d.length} traceability problem(s)`, d) : OK(`traceability final: ${need.size} clause groups covered, ${t.rows.length} rows with owner, evidence and no weak row`);
  },

  async 'P0E-10'(c) {
    const csv = readText(c.root, 'docs/eras/wbs.csv'); if (csv == null) return NO('docs/eras/wbs.csv missing (generated by COORD)');
    const { wps, errors } = loadWbs(csv);
    if (errors.length) return NO(`wbs.csv has ${errors.length} error(s)`, errors.slice(0, 6));
    const rules = readJson(c.root, 'docs/eras/wbs_rules.json') || DEFAULT_RULES;
    const cls = classCheck(wps, rules);
    const badCls = cls.filter((k) => k.status === 'FAIL');
    if (badCls.length) return NO('wbs class counts outside tolerance (node tools/wbs.mjs --check)', badCls.map((k) => `${k.id}: ${k.rows} rows, expected ${k.expected} +-${k.tol}`));
    const plan = readText(c.root, 'docs/eras/plan.md') || '';
    const m = /<!-- wbs:begin -->\n([\s\S]*?)\n<!-- wbs:end -->/.exec(plan);
    if (!m) return NO('plan.md has no <!-- wbs:begin --> ... <!-- wbs:end --> block: run node tools/wbs.mjs --paste (--insert-markers the first time)');
    const res = analyse(wps, rules);
    const want = renderBlock(res, []);
    const have = m[1].split('\n').filter((l) => !l.startsWith('class ')).join('\n');
    return have === want ? OK(`wbs.csv (${wps.length} WPs, ${res.sessions} sessions) generated; plan section 12 block equals wbs.mjs output`) : NO('the wbs block of plan section 12 is stale: run node tools/wbs.mjs --paste');
  },

  async 'P0E-11'(c) {
    const csv = readText(c.root, 'docs/eras/wbs.csv'); if (csv == null) return NO('docs/eras/wbs.csv missing: the ladder capacity cannot be computed');
    const { wps, errors } = loadWbs(csv); if (errors.length) return NO('wbs.csv has errors');
    const res = analyse(wps, readJson(c.root, 'docs/eras/wbs_rules.json') || DEFAULT_RULES);
    const cuts = readText(c.root, 'docs/eras/cuts.md'); if (cuts == null) return NO('docs/eras/cuts.md missing');
    const sec = /##\s+Ladder[^\n]*\n([\s\S]*?)(?:\n##\s|$)/.exec(cuts); if (!sec) return NO('cuts.md has no "## Ladder" section');
    const t = tables(sec[1])[0]; if (!t) return NO('cuts.md Ladder has no table');
    const d = [];
    const stated = new Map();
    for (const r of t.rows) {
      const k = /^(\d)$/.exec(clean(r[0])); if (!k) continue;
      const cell = clean(r[2] || '');
      const eq = /=\s*(\d+)\s*$/.exec(cell) || /about\s+(\d+)/.exec(cell) || /^(\d+)$/.exec(cell);
      if (!eq) d.push(`rung ${k[1]}: cannot read a session count from "${cell}"`); else stated.set(+k[1], +eq[1]);
    }
    for (let k = 1; k <= 6; k++) {
      const got = res.ladder.rungs[k - 1].sessions;
      if (stated.has(k) && stated.get(k) !== got) d.push(`rung ${k}: cuts.md says ${stated.get(k)} sessions, wbs.mjs computes ${got}`);
      if (!stated.has(k) && got > 0) d.push(`rung ${k}: wbs.mjs computes ${got} sessions, cuts.md has no row for it`);
    }
    return d.length ? NO('ladder capacity differs', d) : OK(`ladder capacity per rung equals wbs.mjs (${res.ladder.capacityAll} sessions, ${res.ladder.pctAll}%)`);
  },

  async 'P0E-12'(c) {
    const r = (await lint(c.root, ['PL06']))[0];
    return r.status === 'PASS' ? OK(r.msg) : NO(r.msg, r.details);
  },

  async 'P0E-13'(c) {
    const now = phaseNow(readText(c.root, 'docs/eras/STATUS.md'));
    const txt = readText(c.root, 'docs/eras/reds.jsonl');
    if (txt == null) return OK('no docs/eras/reds.jsonl: no red has ever been opened');
    const reds = [];
    for (const l of txt.split('\n').filter(Boolean)) { try { reds.push(JSON.parse(l)); } catch { return NO('reds.jsonl has a line that is not JSON: ' + l.slice(0, 50)); } }
    // the file is append-only: the last line of an id wins
    const last = new Map(); for (const r of reds) last.set(r.id, r);
    const open = [...last.values()].filter((r) => r.status === 'open');
    const d = [];
    if (open.length > 3) d.push(`${open.length} reds open, at most 3 allowed`);
    for (const r of open) {
      const p = /P(\d)/.exec(r.phase || ''); if (p && +p[1] < now) d.push(`${r.id} (${r.step}) was opened in ${r.phase} and is still open in P${now}`);
      if (!r.owner) d.push(`${r.id}: no owner`); if (!r.deadline) d.push(`${r.id}: no deadline`);
    }
    return d.length ? NO('reds policy violated', d) : OK(`${open.length} open red(s), all within policy`);
  },

  async 'P0E-14'(c) {
    const f = path.join(c.root, 'tools/own_check.mjs');
    if (!fs.existsSync(f)) return NO('tools/own_check.mjs does not exist yet (TOOLS-GATE: ownership check, AR 3.8)');
    const r = sh('node', [f, '--any'], c.root);
    return r.status === 0 ? OK('own_check --any clean') : NO('own_check --any exits ' + r.status, (r.stdout + r.stderr).trim().split('\n').slice(-6));
  },

  async 'P0E-15'(c) {
    const csv = readText(c.root, 'docs/eras/wbs.csv'); if (csv == null) return NO('docs/eras/wbs.csv missing');
    const { wps, errors } = loadWbs(csv); if (errors.length) return NO('wbs.csv has errors', errors.slice(0, 4));
    const inst = new Set(wps.filter((w) => w.role === 'REVIEWER').map((w) => w.instance));
    return inst.size >= 2 ? OK(`REVIEWER multiplicity ${inst.size} (${[...inst].join(', ')})`) : NO(`REVIEWER has ${inst.size} instance(s) in wbs.csv, need >= 2 (owner values REVIEWER#1, REVIEWER#2)`);
  },

  async 'P0E-16'(c) {
    const d = [];
    for (const f of ['docs/eras/hosted_honesty.md', 'docs/requests/tools_hooks.md']) { const t = readText(c.root, f); if (t == null) d.push(`${f} missing`); else if (t.trim().length < 40) d.push(`${f} is empty`); }
    return d.length ? NO('files missing', d) : OK('hosted_honesty.md and tools_hooks.md exist');
  },

  async REG(c) {
    const d = [];
    const cli = readText(c.root, 'tests/lib/criteria.mjs');
    if (!cli || !/export function criterion\(/.test(cli)) d.push('tests/lib/criteria.mjs does not export criterion()');
    if (!exists(c.root, 'tools/report.mjs')) d.push('tools/report.mjs missing');
    const man = readJson(c.root, 'tools/lib/criteria_manifest.json');
    if (!man) d.push('tools/lib/criteria_manifest.json missing (node tools/report.mjs --scan)');
    else if (stable(await scanManifest(c.root)) !== fs.readFileSync(path.join(c.root, 'tools/lib/criteria_manifest.json'), 'utf8')) d.push('criteria_manifest.json drifts from the tree: node tools/report.mjs --scan');
    const vf = readText(c.root, 'docs/eras/spec/VF.md');
    if (!exists(c.root, 'tools/lib/er_table.json')) d.push('tools/lib/er_table.json missing (node tools/report.mjs --er-table)');
    else if (vf && stable(parseErTable(vf)) !== fs.readFileSync(path.join(c.root, 'tools/lib/er_table.json'), 'utf8')) d.push('er_table.json drifts from VF 3.2: node tools/report.mjs --er-table');
    let crit = null; try { crit = JSON.parse(fs.readFileSync(path.join(c.gateDir, 'criteria.json'), 'utf8')); } catch { /* none */ }
    if (!crit) d.push('no criteria.json from a gate run (node tools/gate.mjs --fast)');
    else if (!crit.er || !Object.keys(crit.er).length) d.push('criteria.json carries no ER roll-up');
    return d.length ? NO('registry skeleton not usable', d) : OK(`criteria client, manifest (${man.criteria.length} criteria), ER table and a gate criteria.json with ${Object.keys(crit.er).length} roll-up rows`);
  },
};
export const ENGINE_EDIT = ['P0E-02', 'P0E-03', 'P0E-04', 'P0E-05', 'REG'];
export const FULL = [...Array.from({ length: 16 }, (_, i) => 'P0E-' + String(i + 1).padStart(2, '0')), 'REG'];

/** @returns {Promise<{id:string,status:string,msg:string,details:string[]}[]>} */
export async function runChecks(opts) {
  const root = path.resolve(opts.root || ROOT);
  const c = {
    root, baseline: path.resolve(opts.baseline || path.join(MAIN_ROOT, '.cache/baseline/ancient-v8')), gateDir: path.resolve(opts.gateDir || GATE_DIR),
    baselineSha: opts.baselineSha || '4aafd2e3fb83f20e1b19e0db8465c117032ba3b7', baselineTag: opts.baselineTag || 'ancient-v8',
  };
  const out = [];
  for (const id of opts.ids) {
    let r;
    try { r = await CHECKS[id](c); } catch (e) { r = NO('check crashed: ' + String(e && e.message).slice(0, 200)); }
    out.push({ id, ...r });
  }
  return out;
}

async function main(argv) {
  const o = { mode: null, only: null, json: false };
  const raw = {};
  for (const a of argv) {
    if (a === '--help' || a === '-h') { console.log(HELP); return 0; }
    if (a === '--engine-edit') o.mode = 'engine-edit'; else if (a === '--full') o.mode = 'full'; else if (a === '--json') o.json = true;
    else { const m = /^--(only|root|baseline|gate-dir|baseline-sha|baseline-tag)=(.*)$/.exec(a); if (!m) { console.error('unknown argument: ' + a + ' (try --help)'); return 2; } raw[m[1]] = m[2]; }
  }
  if (raw.only) o.only = raw.only.split(',').map((s) => s.trim()).filter(Boolean);
  if (!o.mode && !o.only) { console.error('give --engine-edit, --full or --only=<ids> (try --help)'); return 2; }
  const ids = o.only || (o.mode === 'full' ? FULL : ENGINE_EDIT);
  const unknown = ids.filter((i) => !CHECKS[i]);
  if (unknown.length) { console.error('unknown check: ' + unknown.join(', ')); return 2; }
  const res = await runChecks({ root: raw.root, baseline: raw.baseline, gateDir: raw['gate-dir'], baselineSha: raw['baseline-sha'], baselineTag: raw['baseline-tag'], ids });
  if (o.json) console.log(JSON.stringify(res, null, 1));
  else {
    for (const r of res) { console.log(`${r.status}  ${r.id}  ${r.msg}`); for (const d of r.details.slice(0, 10)) console.log('        - ' + d); if (r.details.length > 10) console.log(`        ... ${r.details.length - 10} more`); }
    const bad = res.filter((r) => r.status !== 'PASS');
    console.log(`p0_exit ${o.mode || 'custom'}: ${res.length - bad.length}/${res.length} PASS${bad.length ? '; FAIL: ' + bad.map((b) => b.id).join(' ') : ''}`);
  }
  return res.every((r) => r.status === 'PASS') ? 0 : 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e.stack || e); process.exit(1); });
