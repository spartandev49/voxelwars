// tools/plan_lint.mjs: numeric and cross-reference lint of the program documents (VF 3.22; owner TOOLS-VERIFY; criterion VF-T26-lint).
//
//   node tools/plan_lint.mjs [--rule=PL01,PL12] [--strict] [--json] [--root=<dir>]
//
// Rules (each a labelled check; the number is part of the output and of the failure label):
//   PL01 S ids of the plan module table == `modules` block of spec/M == S ids registered in criteria_manifest.json (S28..S46)
//   PL02 ER ids of plan section 9 == rows of VF 3.2 == tools/lib/er_table.json; G1..G12 appear in plan section 3 and in VF 3.6 (the goldens section)
//   PL03 D codes: e.md D1..D7 and plan section 15 D8..D24 are contiguous and disjoint; every bare D<n> cited in the plan and specs exists
//   PL04 `section N` cross-references resolve to a heading (plan.md, every spec; "plan section N" resolves in the plan, "<SPEC> section N" in that spec)
//   PL05 counts in plan section 1 (totals line == 3 x per-era target) equal TARGETS of tests/arch/manifests.test.mjs
//   PL06 phase labels in STATUS.md are exactly the section 12 list
//   PL07 every owner and reviewer in plan section 14 is in the roles list (section 12 plus the DESIGN-* specialisations)
//   PL08 every spec named in plan section 14 has a row, an existing file and sections 1-7
//   PL09 every ER has a script row whose path exists, or is planned with a first phase later than the current one
//   PL10 E-FREEZE prefix sets in the plan equal the prefixes of the `modules` block of spec/M
//   PL11 every residual ledger row cites an id that exists in its review file
//   PL12 session arithmetic: phase sums equal the total; the formula reproduces the quoted days
//   PL13 cuts.md ids used by era manifests (`cuts: [...]`) exist
//   PL14 every traceability row names an owner and an evidence id that exists (ER table, criteria manifest, or a file)
//   PL15 every criterion in the criteria manifest has a negative control file (and no control names an unknown criterion)
//   PL16 no spec holds an unresolved-placeholder marker (the `dilution` regex of tools/lint.mjs) outside inline code, fenced code and section 7
// Result words: PASS; FAIL (a defect); PENDING (the input is a later-phase artefact that does not exist yet, named in the message; never a hidden pass:
// `--strict` turns every PENDING into a FAIL, which is how P0 exit and release use it).
// exit: 0 no FAIL, 1 a FAIL (or a PENDING with --strict), 2 usage error
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROOT } from './lib/paths.mjs';
import { readText, readJson, exists, tables, sections, headingNumbers, itemNumbers, fenced, proseOnly, expandSlash } from './lib/docs_parse.mjs';
import { parseErTable } from './lib/er_rollup.mjs';
import { loadControls, lintControls } from './lib/negctl.mjs';

const HELP = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l, i, a) => a.slice(0, i + 1).every((x) => x.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n');
const PLAN = 'docs/eras/plan.md', SPECDIR = 'docs/eras/spec', STATUS = 'docs/eras/STATUS.md', EMD = 'docs/eras/e.md', CUTS = 'docs/eras/cuts.md', TRACE = 'docs/eras/traceability.md';
const pass = (msg = '') => ({ status: 'PASS', msg, details: [] });
const fail = (msg, details = []) => ({ status: 'FAIL', msg, details });
const pend = (msg, details = []) => ({ status: 'PENDING', msg, details });
const setEq = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const diff = (a, b) => [...a].filter((x) => !b.has(x)).sort();
const cleanCell = (s) => s.replace(/`/g, '').replace(/\*\*/g, '').trim();
const PHASE_NOW = (status) => { const m = /\bP(\d)\b[^.\n]*\bin progress\b/i.exec(status || ''); return m ? +m[1] : 0; };

/** Everything a rule may read, loaded lazily and memoised per root. */
function context(root) {
  const memo = {};
  const get = (k, f) => (k in memo ? memo[k] : (memo[k] = f()));
  const x = {
    root,
    plan: () => get('plan', () => readText(root, PLAN)),
    status: () => get('status', () => readText(root, STATUS)),
    emd: () => get('emd', () => readText(root, EMD)),
    cuts: () => get('cuts', () => readText(root, CUTS)),
    trace: () => get('trace', () => readText(root, TRACE)),
    spec: (name) => get('spec:' + name, () => readText(root, `${SPECDIR}/${name}.md`)),
    specNames: () => get('specNames', () => { try { return fs.readdirSync(path.join(root, SPECDIR)).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).sort(); } catch { return []; } }),
    planSection: (n) => get('ps' + n, () => { const p = x.plan(); return p ? sections(p).find((s) => s.num === String(n)) || null : null; }),
    erTableJson: () => get('ert', () => readJson(root, 'tools/lib/er_table.json')),
    manifest: () => get('man', () => readJson(root, 'tools/lib/criteria_manifest.json')),
  };
  return x;
}
const need = (x, ...names) => { const miss = names.filter((n) => x[n]() == null); return miss.length ? miss : null; };
const missingFile = (what) => fail(`input missing: ${what}`);

// ----------------------------------------------------------------------------------------------------------------------------------------- rules
function PL01(x) {
  if (need(x, 'plan')) return missingFile(PLAN);
  const m = x.spec('M'); if (m == null) return missingFile(`${SPECDIR}/M.md`);
  const s4 = x.planSection(4); if (!s4) return fail('plan section 4 not found');
  const t = tables(s4.body).find((tb) => tb.header.map((h) => h.toLowerCase()).includes('module') && tb.header.includes('S'));
  if (!t) return fail('plan section 4 has no module table with columns "module" and "S"');
  const mi = t.header.findIndex((h) => h.toLowerCase() === 'module'), si = t.header.indexOf('S'), ni = t.header.indexOf('#');
  const plan = t.rows.map((r) => ({ n: +r[ni], id: cleanCell(r[mi]), S: cleanCell(r[si]) })).filter((r) => r.id);
  const block = fenced(m, 'modules'); if (!block) return fail('spec/M has no ```modules block');
  let mods; try { mods = JSON.parse(block); } catch (e) { return fail('modules block is not JSON: ' + e.message); }
  const d = [];
  const planIds = new Set(plan.map((r) => r.id)), mIds = new Set(mods.map((r) => r.id));
  if (!setEq(planIds, mIds)) d.push(`module ids differ: only in plan [${diff(planIds, mIds)}], only in spec/M [${diff(mIds, planIds)}]`);
  for (const p of plan) { const q = mods.find((r) => r.id === p.id); if (q && q.S !== p.S) d.push(`${p.id}: plan says ${p.S}, spec/M says ${q.S}`); if (q && q.pos !== p.n) d.push(`${p.id}: plan row # ${p.n}, spec/M pos ${q.pos}`); }
  const want = new Set(Array.from({ length: 19 }, (_, i) => 'S' + (28 + i)));
  const planS = plan.map((r) => r.S);
  if (planS.length !== 19 || !setEq(new Set(planS), want)) d.push(`plan S ids are not S28..S46 once each (${planS.length} rows)`);
  const mS = mods.map((r) => r.S);
  if (mS.length !== 19 || !setEq(new Set(mS), want)) d.push(`spec/M S ids are not S28..S46 once each (${mS.length} entries)`);
  const man = x.manifest();
  let pending = '';
  if (man) {
    const reg = new Set(man.criteria.map((c) => c.id).filter((id) => /^S\d+$/.test(id)));
    const stray = diff(reg, want);
    if (stray.length) d.push(`manifest registers S ids outside S28..S46: ${stray}`);
    const miss = diff(want, reg);
    if (miss.length && !stray.length && !d.length) pending = `${miss.length} of 19 S criteria are not registered in the manifest yet (their tests land with the modules, phase P1+): ${miss.slice(0, 6)}${miss.length > 6 ? ',...' : ''}`;
  } else d.push('tools/lib/criteria_manifest.json missing (node tools/report.mjs --scan)');
  if (d.length) return fail('S ids disagree', d);
  return pending ? pend(pending) : pass('19 S ids agree in plan, spec/M and the manifest');
}

function PL02(x) {
  if (need(x, 'plan')) return missingFile(PLAN);
  const vf = x.spec('VF'); if (vf == null) return missingFile(`${SPECDIR}/VF.md`);
  const s9 = x.planSection(9); if (!s9) return fail('plan section 9 not found');
  const d = [];
  const planER = new Set([...s9.body.matchAll(/\bER\d+b?\b/g)].map((m) => m[0]));
  let vfRows; try { vfRows = parseErTable(vf); } catch (e) { return fail('VF 3.2 table: ' + e.message); }
  const vfER = new Set(vfRows.rows.map((r) => r.er));
  if (!setEq(planER, vfER)) d.push(`plan section 9 vs VF 3.2: only in VF [${diff(vfER, planER)}], only in plan [${diff(planER, vfER)}]`);
  const js = x.erTableJson();
  if (!js) d.push('tools/lib/er_table.json missing (node tools/report.mjs --er-table)');
  else { const jsER = new Set(js.rows.map((r) => r.er)); if (!setEq(jsER, vfER)) d.push(`er_table.json vs VF 3.2: only in VF [${diff(vfER, jsER)}], only in json [${diff(jsER, vfER)}]`); }
  const s3 = x.planSection(3);
  const vf36 = sections(vf, 3).find((s) => /^3\.6$/.test(s.num));
  for (let n = 1; n <= 12; n++) {
    const re = new RegExp(`\\bG${n}\\b`);
    if (!s3 || !re.test(s3.body)) d.push(`G${n} is not named in plan section 3`);
    if (!vf36 || !re.test(vf36.body)) d.push(`G${n} is not named in VF 3.6 (the goldens section)`);
  }
  return d.length ? fail('ER or G ids disagree', d) : pass(`${vfER.size} ER ids agree in plan section 9, VF 3.2 and er_table.json; G1..G12 named in plan section 3 and VF 3.6`);
}

const D_EXCLUDE = new Set(['50', '65']);                                  // CIE illuminants D50 and D65
function dCodes(text) { return [...proseOnly(text).matchAll(/(?<![A-Za-z0-9_.-])D(0?\d{1,2})\b/g)].filter((m) => !m[1].startsWith('0') && !D_EXCLUDE.has(m[1])).map((m) => +m[1]); }
function PL03(x) {
  if (need(x, 'plan', 'emd')) return missingFile(need(x, 'plan', 'emd').join(', '));
  const s7 = sections(x.emd()).find((s) => s.num === '7'); if (!s7) return fail('e.md section 7 (D codes) not found');
  const eD = [...s7.body.matchAll(/^- D(\d+):/gm)].map((m) => +m[1]);
  const d = [];
  if (!eD.length || eD.some((v, i) => v !== i + 1)) d.push(`e.md defines D codes [${eD}], expected D1..D${eD.length} contiguous from 1`);
  const s15 = x.planSection(15); if (!s15) return fail('plan section 15 not found');
  const pD = [...new Set(dCodes(s15.body))].sort((a, b) => a - b);
  const high = pD.filter((v) => v > eD.length);
  if (!high.length) d.push('plan section 15 defines no decision above e.md\'s');
  else { for (let v = eD.length + 1; v <= high[high.length - 1]; v++) if (!high.includes(v)) d.push(`plan section 15 skips D${v}`); if (high[0] !== eD.length + 1) d.push(`plan decisions start at D${high[0]}, expected D${eD.length + 1} (e.md owns D1..D${eD.length})`); }
  const max = Math.max(eD.length, ...pD);
  const docs = [['plan.md', x.plan()], ...x.specNames().map((n) => [`spec/${n}.md`, x.spec(n)])];
  for (const [name, text] of docs) { const bad = [...new Set(dCodes(text))].filter((v) => v < 1 || v > max); if (bad.length) d.push(`${name} cites D${bad.join(', D')} (defined decisions are D1..D${max})`); }
  return d.length ? fail('D codes disagree', d) : pass(`D1..D${eD.length} (e.md) and D${eD.length + 1}..D${max} (plan section 15) are contiguous; every cited D exists`);
}

function PL04(x) {
  if (need(x, 'plan')) return missingFile(PLAN);
  const docs = { plan: x.plan() };
  for (const n of x.specNames()) docs[n] = x.spec(n);
  const heads = Object.fromEntries(Object.entries(docs).map(([k, v]) => [k, new Set([...headingNumbers(v), ...itemNumbers(v)])]));
  const key = (prefix) => { const p = prefix.replace(/^spec\//, '').replace(/\.md$/, ''); return /^plan$/i.test(p) ? 'plan' : docs[p] !== undefined ? p : null; };
  const d = [];
  let checked = 0;
  for (const [name, text] of Object.entries(docs)) {
    let fence = false;
    text.split('\n').forEach((line, i) => {
      if (/^\s*```/.test(line)) fence = !fence;
      if (fence) return;
      const prose = line.replace(/`[^`]*`/g, (s2) => (/^`(?:spec\/)?[A-Za-z-]+(?:\.md)?`$/.test(s2) ? s2.slice(1, -1) : ' '));
      for (const m of prose.matchAll(/(?:([A-Za-z][A-Za-z0-9./-]*)\s+)?\bsections?\s+(\d+(?:\.\d+)*)\b/g)) {
        const prefix = m[1] || '';
        let target = key(prefix);
        // a reference names its target ("plan section 9", "AR section 3"); an unnamed one means "this document" only inside plan.md
        if (!target) { if (name === 'plan' && (!prefix || /^[a-z]+$/.test(prefix))) target = 'plan'; else continue; }
        checked++;
        if (!heads[target].has(m[2])) d.push(`${name}.md:${i + 1}: "${prefix ? prefix + ' ' : ''}section ${m[2]}" has no heading in ${target === 'plan' ? 'plan.md' : target + '.md'}`);
      }
    });
  }
  return d.length ? fail(`${d.length} unresolved section reference(s)`, d) : pass(`${checked} named section references resolve`);
}

function PL05(x) {
  if (need(x, 'plan')) return missingFile(PLAN);
  const s1 = x.planSection(1); if (!s1) return fail('plan section 1 not found');
  const t = tables(s1.body).find((tb) => tb.header[0] && /per era/i.test(tb.header[0]));
  if (!t) return fail('plan section 1 has no "per era" table');
  const row = (re) => t.rows.find((r) => re.test(cleanCell(r[0])));
  const num = (s) => { const m = /(\d+)/.exec(s || ''); return m ? +m[1] : null; };
  const per = {
    units: num(row(/^units/)?.[1]), arenas: num(row(/arena recipes/)?.[1]), props: num(row(/era props/)?.[1]),
    missions: num(((row(/missions \/ puzzles/)?.[1]) || '').split('/')[0]), puzzles: num(((row(/missions \/ puzzles/)?.[1]) || '').split('/')[1]),
    music: num(/=\s*(\d+) per era/.exec(row(/^music/)?.[1] || '')?.[1]),
  };
  const d = [];
  for (const [k, v] of Object.entries(per)) if (v == null) d.push(`cannot read the per-era target of ${k}`);
  const tot = /Totals at target:\s*([^.]*)\./.exec(s1.body);
  if (!tot) return fail('plan section 1 has no "Totals at target:" sentence');
  const totals = {};
  for (const m of tot[1].matchAll(/(\d+)\s+(units|arenas|props|missions|puzzles|music tracks)/g)) totals[m[2] === 'music tracks' ? 'music' : m[2]] = +m[1];
  const ERAS = 3;
  for (const k of Object.keys(per)) { if (per[k] != null && totals[k] !== per[k] * ERAS) d.push(`${k}: totals line says ${totals[k]}, ${ERAS} x per-era ${per[k]} = ${per[k] * ERAS}`); }
  const tf = readText(x.root, 'tests/arch/manifests.test.mjs');
  if (tf == null) { if (d.length) return fail('plan section 1 arithmetic', d); return pend('tests/arch/manifests.test.mjs (TARGETS) does not exist yet (registry manifests, phase P1); the totals line equals 3 x the per-era targets'); }
  const tg = /TARGETS\s*=\s*(\{[\s\S]*?\n\}|\{[^}]*\})/.exec(tf);
  if (!tg) d.push('TARGETS not found in tests/arch/manifests.test.mjs');
  else {
    const nums = {};
    for (const m of tg[1].matchAll(/\b(units|arenas|props|missions|puzzles|music)\s*:\s*(\d+)/g)) nums[m[1]] = +m[2];
    for (const k of Object.keys(per)) if (nums[k] !== undefined && nums[k] !== per[k]) d.push(`TARGETS.${k} = ${nums[k]}, plan section 1 says ${per[k]} per era`);
    for (const k of Object.keys(per)) if (nums[k] === undefined) d.push(`TARGETS has no ${k}`);
  }
  return d.length ? fail('counts disagree', d) : pass('totals = 3 x per-era targets = TARGETS');
}

function PL06(x) {
  if (need(x, 'plan', 'status')) return missingFile(need(x, 'plan', 'status').join(', '));
  const s12 = x.planSection(12); if (!s12) return fail('plan section 12 not found');
  const t = tables(s12.body).find((tb) => tb.header[0] === 'phase');
  if (!t) return fail('plan section 12 has no phase table');
  const labels = t.rows.map((r) => cleanCell(r[0])).filter((l) => /^P\d\b/.test(l));
  const lines = x.status().split('\n');
  const phaseLine = lines.find((l) => /->/.test(l) && (l.match(/\bP\d\b/g) || []).length >= 4);
  if (!phaseLine) return fail('STATUS.md has no phase line ("P0 ... -> P1 ... -> ...")');
  const items = phaseLine.slice(phaseLine.indexOf('P0')).split('->').map((s) => s.trim().replace(/[.;]$/, ''));
  const d = [];
  if (items.length !== labels.length) d.push(`STATUS.md lists ${items.length} phases, plan section 12 lists ${labels.length}`);
  labels.forEach((l, i) => { if (items[i] !== l) d.push(`phase ${i}: STATUS.md "${items[i] || '(missing)'}" vs plan "${l}"`); });
  return d.length ? fail('phase labels differ', d) : pass(`${labels.length} phase labels identical in STATUS.md and plan section 12`);
}

function roles(x) {
  const s12 = x.planSection(12); if (!s12) return null;
  const para = /\*\*Teams and tools\.\*\*([\s\S]*?)(?:\n\n|$)/.exec(s12.body); if (!para) return null;
  const text = para[1].replace(/\*\*/g, '').replace(/`[^`]*`/g, '');
  const set = new Set(['REVIEWER']);
  for (const m of text.matchAll(/TOOLS split into ([^.]*)\./g)) for (const t of m[1].matchAll(/TOOLS-[A-Z]+/g)) set.add(t[0]);
  const design = /DESIGN-x\s*\(([^)]*)\)/.exec(text);
  if (design) for (const part of design[1].split(',')) for (const t of expandSlash(part.trim())) set.add('DESIGN-' + t);
  const rest = text.replace(/DESIGN-x\s*\([^)]*\)/, ' ').replace(/\([^)]*\)/g, ' ');
  for (const m of rest.matchAll(/\b[A-Z][A-Z0-9]*(?:-[A-Za-z0-9]+)*(?:\/[A-Z]+)*(?:-x3)?\b/g)) {
    let tok = m[0];
    if (/^(TOOLS|COORD|DESIGN|SPIKE|REGISTRY|SIM|RENDER|WORLD|EDITORS|UI|BALANCE|QA|AUDIO|HUNTER|INTEGRATION|REVIEWER)$/.test(tok) || /-/.test(tok)) {
      if (/-x3$/.test(tok)) { const b = tok.replace(/-x3$/, ''); set.add(b); for (const e of ['MED', 'MOD', 'SF']) set.add(`${b}-${e}`); continue; }
      for (const t of expandSlash(tok)) set.add(t);
    }
  }
  return set;
}
function PL07(x) {
  if (need(x, 'plan')) return missingFile(PLAN);
  const r = roles(x); if (!r) return fail('plan section 12 has no "Teams and tools" paragraph');
  const s14 = x.planSection(14); if (!s14) return fail('plan section 14 not found');
  const t = tables(s14.body).find((tb) => tb.header[0] === 'file'); if (!t) return fail('plan section 14 has no deliverables table');
  const oi = t.header.indexOf('owner'), ri = t.header.indexOf('reviewer');
  const d = [];
  const TOOLS_ROOTS = new Set(['TOOLS']);
  for (const row of t.rows) for (const [col, ci] of [['owner', oi], ['reviewer', ri]]) {
    const cell = (row[ci] || '').replace(/\*\*/g, '');
    for (const m of cell.matchAll(/\b[A-Z][A-Z0-9]*(?:-[A-Za-z0-9]+)*(?:\/[A-Z]+)*/g)) for (const tok of expandSlash(m[0])) {
      if (!r.has(tok) && !TOOLS_ROOTS.has(tok)) d.push(`${cleanCell(row[0]).slice(0, 40)}: ${col} "${tok}" is not in the roles list of section 12`);
    }
  }
  return d.length ? fail(`${d.length} owner(s) outside the roles list`, [...new Set(d)]) : pass(`${t.rows.length} rows use only listed roles (${r.size} roles)`);
}

function PL08(x) {
  if (need(x, 'plan')) return missingFile(PLAN);
  const s14 = x.planSection(14); if (!s14) return fail('plan section 14 not found');
  const t = tables(s14.body).find((tb) => tb.header[0] === 'file'); if (!t) return fail('plan section 14 has no deliverables table');
  const d = [];
  const names = [];
  for (const row of t.rows) { const m = /`spec\/([A-Za-z-]+)`/.exec(row[0]); if (m) names.push(m[1]); }
  if (!names.length) return fail('plan section 14 names no spec/<NAME> row');
  for (const n of names) {
    const text = x.spec(n);
    if (text == null) { d.push(`spec/${n}: ${SPECDIR}/${n}.md does not exist`); continue; }
    const nums = new Set(sections(text).map((s) => s.num));
    const missing = [1, 2, 3, 4, 5, 6, 7].filter((k) => !nums.has(String(k)));
    if (missing.length) d.push(`spec/${n}: sections ${missing.join(', ')} missing`);
  }
  const rows = new Set(names);
  for (const n of x.specNames()) if (!/^VF-impl$/.test(n) && !rows.has(n) && !/-/.test(n.replace(/^S-slice$/, 'S'))) d.push(`${SPECDIR}/${n}.md has no row in plan section 14`);
  return d.length ? fail('spec rows, files or sections missing', d) : pass(`${names.length} specs have a row, a file and sections 1-7`);
}

function PL09(x) {
  const tb = x.erTableJson(); if (!tb) return fail('tools/lib/er_table.json missing (node tools/report.mjs --er-table)');
  const status = x.status() || '';
  const now = PHASE_NOW(status);
  const d = [], later = [];
  const phaseOf = (first) => { const m = /P(\d)/.exec(first || ''); return m ? +m[1] : 0; };
  for (const r of tb.rows) {
    const delegated = /inside (ER\d+b?)/.exec(r.tier || '');
    if (!r.ids.length && !r.scripts.length && !r.stems.length && !delegated) { d.push(`${r.er}: no script row`); continue; }
    for (const s of r.scripts) {
      const there = s.includes('*') ? fs.existsSync(path.join(x.root, path.dirname(s))) : exists(x.root, s);
      if (there) continue;
      if (phaseOf(r.first) > now) later.push(`${r.er} ${s} (planned, first ${r.first})`); else d.push(`${r.er}: ${s} does not exist and its first phase ${r.first} is not later than the current phase P${now}`);
    }
  }
  if (d.length) return fail(`${d.length} ER script row(s) neither present nor planned`, d);
  return later.length ? pend(`${later.length} script(s) are planned for a later phase than P${now}`, later.slice(0, 12)) : pass(`all ${tb.rows.length} ER rows have present scripts`);
}

function PL10(x) {
  if (need(x, 'plan')) return missingFile(PLAN);
  const m = x.spec('M'); if (m == null) return missingFile(`${SPECDIR}/M.md`);
  const block = fenced(m, 'modules'); if (!block) return fail('spec/M has no ```modules block');
  const mods = JSON.parse(block).sort((a, b) => a.pos - b.pos);
  const s4 = x.planSection(4); if (!s4) return fail('plan section 4 not found');
  const fz = /\*\*E-FREEZE\(era\)\*\*[^\n]*/.exec(s4.body); if (!fz) return fail('plan section 4 has no E-FREEZE paragraph');
  const text = fz[0];
  const med = /Medieval = #1\.\.#(\d+) \(([^)]*)\)/.exec(text), mod = /Modern = #1\.\.#(\d+) \(adds ([^)]*)\)/.exec(text), sf = /Sci-Fi = #1\.\.#(\d+) \(adds ([^)]*)\)/.exec(text);
  if (!med || !mod || !sf) return fail('cannot read "Medieval = #1..#n (...)", "Modern = #1..#n (adds ...)", "Sci-Fi = #1..#n (adds ...)" from the E-FREEZE paragraph');
  const ids = (s) => s.split(/\s+/).filter(Boolean);
  const plan = { Medieval: { n: +med[1], set: new Set(ids(med[2])) } };
  plan.Modern = { n: +mod[1], set: new Set([...plan.Medieval.set, ...ids(mod[2])]) };
  plan['Sci-Fi'] = { n: +sf[1], set: new Set([...plan.Modern.set, ...ids(sf[2])]) };
  const d = [];
  for (const [era, p] of Object.entries(plan)) {
    const pre = new Set(mods.filter((r) => r.pos <= p.n).map((r) => r.id));
    if (!setEq(pre, p.set)) d.push(`${era}: plan set [${[...p.set]}] vs spec/M prefix #1..#${p.n} [${[...pre]}]: only plan [${diff(p.set, pre)}], only spec/M [${diff(pre, p.set)}]`);
    const line = new RegExp(`\\*\\*${era}\\*\\* = (?:Medieval|Modern)?[^{]*\\{([^}]*)\\}`).exec(m);
    if (line && !(era !== 'Medieval')) { const ms = new Set(ids(line[1])); if (!setEq(ms, p.set)) d.push(`${era}: spec/M text set differs from the plan`); }
  }
  if (plan['Sci-Fi'].n !== mods.length) d.push(`Sci-Fi prefix #1..#${plan['Sci-Fi'].n} is not all ${mods.length} modules (S-FREEZE)`);
  return d.length ? fail('E-FREEZE sets disagree', d) : pass(`Medieval #1..#${plan.Medieval.n}, Modern #1..#${plan.Modern.n}, Sci-Fi #1..#${plan['Sci-Fi'].n} equal the prefixes of spec/M`);
}

function PL11(x) {
  const d = [];
  let rows = 0;
  for (const n of x.specNames()) {
    const text = x.spec(n); if (!text) continue;
    for (const s of sections(text)) {
      if (!/^residual ledger/i.test(s.title)) continue;
      for (const tb of tables(s.body)) for (const r of tb.rows) {
        const m = /^(q\d_[a-z]+)\s+(?:(r(?:esidual)?|Q|inconsistency)\s*)?(\d+)\b/i.exec(cleanCell(r[0]));
        if (!m) continue;
        rows++;
        const file = `docs/eras/${m[1]}.md`;
        const body = readText(x.root, file);
        if (body == null) { d.push(`${n}: ${cleanCell(r[0])} cites ${file} which does not exist`); continue; }
        const k = m[3];
        const forms = [new RegExp(`residual ${k}\\b`, 'i'), new RegExp(`^${k}\\. `, 'm'), new RegExp(`\\bQ${k}\\b`), new RegExp(`inconsistency ${k}\\b`, 'i'), new RegExp(`^\\s*[-*]?\\s*\\*{0,2}${k}[.)]`, 'm')];
        if (!forms.some((re) => re.test(body))) d.push(`${n}: ${cleanCell(r[0])}: no item ${k} in ${file}`);
      }
    }
  }
  if (d.length) return fail(`${d.length} ledger id(s) do not exist in their review file`, d);
  return rows ? pass(`${rows} ledger rows cite existing review items`) : pend('no residual ledger rows found in any spec');
}

function PL12(x) {
  if (need(x, 'plan')) return missingFile(PLAN);
  const s12 = x.planSection(12); if (!s12) return fail('plan section 12 not found');
  const body = s12.body;
  const d = [];
  const blk = /<!-- wbs:begin -->([\s\S]*?)<!-- wbs:end -->/.exec(body);
  if (blk) {
    const total = /total sessions:\s*(\d+)/.exec(blk[1]);
    const phases = [...blk[1].matchAll(/^\|\s*(P\d)\s*\|\s*(\d+)\s*\|/gm)].map((m) => +m[2]);
    if (!total || !phases.length) d.push('wbs block has no "total sessions: N" line or phase rows');
    else if (phases.reduce((a, b) => a + b, 0) !== +total[1]) d.push(`wbs block: phase rows sum to ${phases.reduce((a, b) => a + b, 0)}, total says ${total[1]}`);
    const dur = /resource-bound at c x u 3\.5\/2\.5\/1\.5:\s*([\d.]+)\s*\/\s*([\d.]+)\s*\/\s*([\d.]+) days/.exec(blk[1]);
    if (total && dur) { const N = +total[1]; const f = (cu) => +(N * 1.3 / cu / 24).toFixed(1); if (Math.abs(f(3.5) - +dur[1]) > 0.11 || Math.abs(f(2.5) - +dur[2]) > 0.11 || Math.abs(f(1.5) - +dur[3]) > 0.11) d.push(`wbs block: durations ${dur[1]}/${dur[2]}/${dur[3]} do not follow N x 1.3 / (c x u) / 24 for N = ${N} (${f(3.5)}/${f(2.5)}/${f(1.5)})`); }
    return d.length ? fail('wbs block arithmetic', d) : pass('wbs block: phase rows sum to the total and the durations follow the formula');
  }
  const est = /about\s*\*{0,2}(\d+)-(\d+) sessions\*{0,2}/.exec(body);
  const sums = /P0 ~(\d+), P1 ~(\d+), P2 ~(\d+), P3-P6 (\d+)-(\d+) = (\d+)-(\d+)/.exec(body);
  if (!est || !sums) return fail('plan section 12 has neither a wbs block nor the prose estimate "about N-M sessions ... P0 ~a, P1 ~b, P2 ~c, P3-P6 x-y = lo-hi"');
  const [a, b, c, lo3, hi3, lo, hi] = sums.slice(1).map(Number);
  if (a + b + c + lo3 !== lo || a + b + c + hi3 !== hi) d.push(`phase figures sum to ${a + b + c + lo3}-${a + b + c + hi3}, the text says ${lo}-${hi}`);
  const Nlo = +est[1], Nhi = +est[2];
  if (Math.abs(Nlo - lo) > Math.max(5, 0.01 * lo) || Math.abs(Nhi - hi) > Math.max(5, 0.01 * hi)) d.push(`quoted total "${Nlo}-${Nhi} sessions" is not the sum of the phase figures (${lo}-${hi})`);
  const days = /c x u = ([\d.]+)-([\d.]+): ([\d.]+)-([\d.]+) days/.exec(body);
  if (days) {
    const cuLo = +days[1], cuHi = +days[2];
    const wantLo = +(Nlo * 1.3 / cuHi / 24).toFixed(1), wantHi = +(Nhi * 1.3 / cuLo / 24).toFixed(1);
    if (Math.abs(wantLo - +days[3]) > 0.5 || Math.abs(wantHi - +days[4]) > 0.5) d.push(`quoted "${days[3]}-${days[4]} days" at c x u ${cuLo}-${cuHi}; N x 1.3 / (c x u) / 24 gives ${wantLo}-${wantHi} for N = ${Nlo}-${Nhi}`);
  } else d.push('the throughput bound "c x u = a-b: x-y days" is not stated');
  return d.length ? fail('session arithmetic', d) : pass('phase figures sum to the total and the quoted days follow the formula');
}

function PL13(x) {
  if (x.cuts() == null) return missingFile(CUTS);
  const known = new Set([...x.cuts().matchAll(/^\|\s*(X\d+)\s*\|/gm)].map((m) => m[1]));
  const used = [];
  const dirs = [];
  try { for (const e of fs.readdirSync(path.join(x.root, 'src/content'), { withFileTypes: true })) if (e.isDirectory() && /^era_/.test(e.name)) dirs.push(e.name); } catch { /* none */ }
  for (const dn of dirs) { const t = readText(x.root, `src/content/${dn}/manifest.js`); if (!t) continue; for (const m of t.matchAll(/cuts\s*:\s*\[([^\]]*)\]/g)) for (const id of m[1].matchAll(/['"]([A-Za-z0-9_-]+)['"]/g)) used.push([dn, id[1]]); }
  const bad = used.filter(([, id]) => !known.has(id)).map(([dn, id]) => `${dn}/manifest.js cites ${id} which is not a row of cuts.md`);
  if (bad.length) return fail(`${bad.length} unknown cuts id`, bad);
  return used.length ? pass(`${used.length} cuts ids cited by era manifests exist in cuts.md`) : pend('no era manifest declares cuts yet (src/content/era_*/manifest.js, registry phase P1)');
}

function PL14(x) {
  const tr = x.trace(); if (tr == null) return missingFile(TRACE);
  const t = tables(tr).find((tb) => /e\.md clause/i.test(tb.header[0])); if (!t) return fail('traceability.md has no table "e.md clause | ..."');
  const oi = t.header.findIndex((h) => /^owner$/i.test(h)), ei = t.header.findIndex((h) => /^evidence$/i.test(h));
  const ers = new Set((x.erTableJson()?.rows || []).map((r) => r.er));
  const man = new Set((x.manifest()?.criteria || []).map((c) => c.id));
  const d = [];
  t.rows.forEach((r) => {
    const label = cleanCell(r[0]).slice(0, 36);
    const owner = cleanCell(r[oi] || ''), ev = r[ei] || '';
    if (!owner) d.push(`${label}: no owner`);
    if (!ev.trim() || /^n\/a$/i.test(ev.trim()) && !/closed|out/i.test(r.join(' '))) { d.push(`${label}: no evidence`); return; }
    for (const m of ev.matchAll(/\bER\d+b?\b/g)) if (ers.size && !ers.has(m[0])) d.push(`${label}: evidence ${m[0]} is not a row of the ER table`);
    for (const m of ev.matchAll(/`([A-Z][A-Za-z0-9]*-[A-Za-z0-9-]+|S\d+)`/g)) if (man.size && !man.has(m[1])) d.push(`${label}: test id ${m[1]} is not in criteria_manifest.json`);
    for (const m of ev.matchAll(/`((?:tools|tests)\/[^`\s]+)`/g)) if (!exists(x.root, m[1]) && !m[1].includes('*')) d.push(`${label}: file ${m[1]} does not exist`);
  });
  return d.length ? fail(`${d.length} traceability problem(s)`, d) : pass(`${t.rows.length} rows have an owner and existing evidence`);
}

async function PL15(x) {
  const man = x.manifest(); if (!man) return fail('tools/lib/criteria_manifest.json missing (node tools/report.mjs --scan)');
  const controls = await loadControls(x.root);
  const problems = lintControls(controls, man);
  return problems.length ? fail(`${problems.length} negative-control problem(s)`, problems) : pass(`${man.criteria.length} criteria, ${controls.length} control files, all consistent`);
}

const DILUTION = /\b(TODO|FIXME|XXX|lorem ipsum)\b|your[-_ ]?(value|key|name)[-_ ]?here|coming soon/i;
function PL16(x) {
  const d = [];
  let n = 0;
  for (const name of x.specNames()) {
    const text = x.spec(name); if (text == null) continue;
    n++;
    let fence = false, skipSec = false;
    text.split('\n').forEach((raw, i) => {
      if (/^\s*```/.test(raw)) { fence = !fence; return; }
      if (fence) return;
      const h = /^##\s+(\d+)\./.exec(raw);
      if (h) skipSec = h[1] === '7';
      else if (/^##\s/.test(raw)) skipSec = false;
      if (skipSec) return;
      const line = raw.replace(/`[^`]*`/g, '');
      const m = DILUTION.exec(line);
      if (m) d.push(`spec/${name}.md:${i + 1}: unresolved-placeholder marker "${m[0]}"`);
    });
  }
  return d.length ? fail(`${d.length} placeholder marker(s)`, d) : pass(`${n} specs are free of placeholder markers`);
}

export const RULES = [
  ['PL01', 'S ids: plan == spec/M == manifest', PL01], ['PL02', 'ER ids and G1..G12', PL02], ['PL03', 'D codes', PL03], ['PL04', 'section cross-references', PL04],
  ['PL05', 'section 1 counts == TARGETS', PL05], ['PL06', 'STATUS.md phase labels', PL06], ['PL07', 'section 14 owners are roles', PL07], ['PL08', 'section 14 specs exist with sections 1-7', PL08],
  ['PL09', 'ER script rows exist or are planned', PL09], ['PL10', 'E-FREEZE prefix sets', PL10], ['PL11', 'residual ledger ids exist', PL11], ['PL12', 'session arithmetic', PL12],
  ['PL13', 'cuts.md ids used by manifests', PL13], ['PL14', 'traceability owners and evidence', PL14], ['PL15', 'a negative control per criterion', PL15], ['PL16', 'no placeholder markers in specs', PL16],
];

/** Run the rules on a tree. -> [{id, title, status, msg, details}] */
export async function lint(root, only = null) {
  const x = context(root);
  const out = [];
  for (const [id, title, fn] of RULES) {
    if (only && !only.includes(id)) continue;
    let r;
    try { r = await fn(x); } catch (e) { r = fail('rule crashed: ' + String(e && e.message).slice(0, 160)); }
    out.push({ id, title, ...r });
  }
  return out;
}

async function main(argv) {
  const o = { root: ROOT, only: null, strict: false, json: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') { console.log(HELP); return 0; }
    if (a === '--strict') o.strict = true; else if (a === '--json') o.json = true;
    else if (a.startsWith('--root=')) o.root = path.resolve(a.slice(7));
    else if (a.startsWith('--rule=')) o.only = a.slice(7).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    else { console.error('unknown argument: ' + a + ' (try --help)'); return 2; }
  }
  if (o.only) { const bad = o.only.filter((id) => !RULES.some((r) => r[0] === id)); if (bad.length) { console.error('unknown rule: ' + bad.join(', ')); return 2; } }
  const res = await lint(o.root, o.only);
  const bad = res.filter((r) => r.status === 'FAIL' || (o.strict && r.status === 'PENDING'));
  if (o.json) console.log(JSON.stringify(res, null, 1));
  else {
    for (const r of res) { console.log(`${r.status.padEnd(7)} ${r.id}  ${r.title}: ${r.msg}`); for (const d of r.details.slice(0, 12)) console.log('          - ' + d); if (r.details.length > 12) console.log(`          ... ${r.details.length - 12} more`); }
    const c = (s) => res.filter((r) => r.status === s).length;
    console.log(`plan_lint: ${c('PASS')} PASS, ${c('FAIL')} FAIL, ${c('PENDING')} PENDING${o.strict ? ' (strict: PENDING fails)' : ''}`);
  }
  return bad.length ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e.stack || e); process.exit(1); });
