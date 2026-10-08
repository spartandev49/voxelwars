// tools/wbs.mjs: work-breakdown arithmetic of the program (VF 3.22; owner TOOLS-VERIFY; criterion VF-T26-wbs).
//
//   node tools/wbs.mjs [--csv <f>] [--rules <f>] [--root <dir>] [--start YYYY-MM-DD] [--json] [--check] [--calibrate <overrunSessions>] [--paste [--insert-markers]]
//
// Input: docs/eras/wbs.csv with the columns  wp,owner,preds,phase,hot_files,size,accept,ladder_rung,no_regret,spec
//   size S/M/L = 1/2/4 sessions (a session = one agent run <= 90 min, 1.3 h in the estimates); preds = WP ids separated by ; or space; phase P0..P6;
//   ladder_rung blank or 1..6 (the cut ladder of plan section 13); no_regret yes/no on EVERY row (work that continues while the user decides after a STOP);
//   owner may carry an instance suffix (REVIEWER#1, REVIEWER#2): the number of distinct instances is the multiplicity of the role (VF-D18).
// Rules: docs/eras/wbs_rules.json (WP granularity per class, durations, review model, start date).
// Output: the row count per class against eras x ceil(count x wpsPerItem x (1 + reserve) / itemsPerWp) (+-5%); phase sums and the total; resource-bound days
//   N x 1.3 / (c x u) / 24 at c x u = 3.5, 2.5, 1.5; path-bound days = critical path sessions x 1.3 / (24 x u_path) at u_path 0.8 and 0.55; the reported duration
//   [max(path_low, resource at 3.5), max(path_high, resource at 1.5)]; the critical path; a weekly float report (WPs with float < 4 sessions per ISO week);
//   the reviewer queue per day; ladder capacity per rung and the calibration table in sessions and percent (CONTINUE up to the capacity of rungs 1-3,
//   EXECUTE-RUNGS up to the total capacity, STOP above it; q3_program residual 17).
// --check   validate the csv and the class counts only (exit 1 on any error)         --calibrate <n>   print CONTINUE | EXECUTE-RUNGS(k) | STOP for an overrun of n sessions
// --paste   rewrite the <!-- wbs:begin -->...<!-- wbs:end --> blocks of plan.md (section 12) and STATUS.md with the summary (--insert-markers adds an empty pair first
//           where it is missing: after the "## 12." heading of the plan, after the "## Where we are" heading of STATUS.md)
// exit: 0 done, 1 a validation error or a class count outside tolerance, 2 usage error or missing input
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROOT } from './lib/paths.mjs';

const HELP = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l, i, a) => a.slice(0, i + 1).every((x) => x.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n');
export const COLUMNS = ['wp', 'owner', 'preds', 'phase', 'hot_files', 'size', 'accept', 'ladder_rung', 'no_regret', 'spec'];
export const SIZE = { S: 1, M: 2, L: 4 };
export const PHASES = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
const BEGIN = '<!-- wbs:begin -->', END = '<!-- wbs:end -->';

// ------------------------------------------------------------------------------------------------------------------------------------------ csv
export function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', q = false;
  const s = text.replace(/\r\n?/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; continue; }
    if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** csv text -> {wps:[...], errors:[...]} ; every defect is an error naming the row. */
export function loadWbs(text) {
  const errors = [];
  const rows = parseCsv(text);
  if (!rows.length) return { wps: [], errors: ['wbs.csv is empty'] };
  const header = rows[0].map((h) => h.trim());
  const miss = COLUMNS.filter((c) => !header.includes(c));
  if (miss.length) return { wps: [], errors: [`wbs.csv lacks the column(s) ${miss.join(', ')} (mandatory: ${COLUMNS.join(',')})`] };
  const wps = [];
  const seen = new Set();
  rows.slice(1).forEach((r, k) => {
    const o = Object.fromEntries(header.map((h, i) => [h, (r[i] || '').trim()]));
    const at = `row ${k + 2} (${o.wp || '?'})`;
    if (!o.wp) { errors.push(`${at}: empty wp id`); return; }
    if (seen.has(o.wp)) errors.push(`${at}: duplicate wp id`);
    seen.add(o.wp);
    if (!(o.size in SIZE)) errors.push(`${at}: size "${o.size}" must be S, M or L`);
    if (!PHASES.includes(o.phase)) errors.push(`${at}: phase "${o.phase}" must be P0..P6`);
    if (!/^[1-6]?$/.test(o.ladder_rung)) errors.push(`${at}: ladder_rung "${o.ladder_rung}" must be blank or 1..6`);
    if (!/^(yes|no|true|false|1|0)$/i.test(o.no_regret)) errors.push(`${at}: no_regret "${o.no_regret}" must be yes or no on every row`);
    if (!o.owner) errors.push(`${at}: no owner`);
    wps.push({
      wp: o.wp, owner: o.owner, role: o.owner.replace(/#\d+$/, ''), instance: o.owner, preds: o.preds.split(/[;\s]+/).filter(Boolean), phase: o.phase, hot: o.hot_files.split(/[;\s]+/).filter(Boolean),
      size: o.size, sessions: SIZE[o.size] || 0, accept: o.accept, rung: o.ladder_rung ? +o.ladder_rung : 0, noRegret: /^(yes|true|1)$/i.test(o.no_regret), spec: o.spec,
    });
  });
  const ids = new Set(wps.map((w) => w.wp));
  for (const w of wps) {
    for (const p of w.preds) if (!ids.has(p)) errors.push(`${w.wp}: unknown predecessor ${p}`);
    if (w.preds.includes(w.wp)) errors.push(`${w.wp}: depends on itself`);
  }
  const phaseIx = Object.fromEntries(PHASES.map((p, i) => [p, i]));
  const by = new Map(wps.map((w) => [w.wp, w]));
  for (const w of wps) for (const p of w.preds) { const q = by.get(p); if (q && phaseIx[q.phase] > phaseIx[w.phase]) errors.push(`${w.wp} (${w.phase}) depends on ${p} which is in a later phase (${q.phase})`); }
  return { wps, errors };
}

// ------------------------------------------------------------------------------------------------------------------------------------------ graph
/** Critical path method on session weights. -> {order, es, ef, ls, lf, float, length, critical:[wp...]} or {cycle:[...]} */
export function schedule(wps) {
  const by = new Map(wps.map((w) => [w.wp, w]));
  const indeg = new Map(wps.map((w) => [w.wp, w.preds.filter((p) => by.has(p)).length]));
  const succ = new Map(wps.map((w) => [w.wp, []]));
  for (const w of wps) for (const p of w.preds) if (by.has(p)) succ.get(p).push(w.wp);
  const queue = wps.filter((w) => indeg.get(w.wp) === 0).map((w) => w.wp).sort();
  const order = [];
  while (queue.length) {
    const n = queue.shift(); order.push(n);
    for (const s of succ.get(n)) { indeg.set(s, indeg.get(s) - 1); if (indeg.get(s) === 0) { queue.push(s); queue.sort(); } }
  }
  if (order.length !== wps.length) return { cycle: wps.map((w) => w.wp).filter((n) => !order.includes(n)) };
  const es = new Map(), ef = new Map();
  for (const n of order) { const w = by.get(n); const s = Math.max(0, ...w.preds.filter((p) => by.has(p)).map((p) => ef.get(p))); es.set(n, s); ef.set(n, s + w.sessions); }
  const length = Math.max(0, ...ef.values());
  const lf = new Map(), ls = new Map();
  for (const n of [...order].reverse()) { const f = succ.get(n).length ? Math.min(...succ.get(n).map((s) => ls.get(s))) : length; lf.set(n, f); ls.set(n, f - by.get(n).sessions); }
  const float = new Map(order.map((n) => [n, ls.get(n) - es.get(n)]));
  // one critical chain: walk back from the latest finisher through predecessors that finish exactly at its start
  let tail = order.filter((n) => ef.get(n) === length).sort()[0];
  const chain = [];
  while (tail) { chain.push(tail); const w = by.get(tail); tail = w.preds.filter((p) => by.has(p) && ef.get(p) === es.get(tail)).sort()[0]; }
  return { order, es, ef, ls, lf, float, length, critical: chain.reverse() };
}

export function isoWeek(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

// ------------------------------------------------------------------------------------------------------------------------------------------ report
export const DEFAULT_RULES = { schema: 1, sessionHours: 1.3, cxu: { low: 1.5, mid: 2.5, high: 3.5 }, uPath: { low: 0.8, high: 0.55 }, floatLimitSessions: 4, tolerance: 0.05, startDate: '2026-10-08', review: { role: 'REVIEWER', sessionsPerReview: 0.5, whenSpecColumnSet: true }, classes: [] };

export function classCheck(wps, rules) {
  const out = [];
  for (const c of rules.classes || []) {
    const re = new RegExp(c.match);
    const rows = wps.filter((w) => re.test(w.wp)).length;
    if (c.count == null) { out.push({ id: c.id, status: 'PENDING', rows, note: 'the manifest count of this class is not machine-readable yet (set "count" in wbs_rules.json)' }); continue; }
    const expected = (c.eras || 1) * Math.ceil((c.count * (c.wpsPerItem || 1) * (1 + (c.reserve || 0))) / (c.itemsPerWp || 1) - 1e-9);
    const tol = Math.floor((rules.tolerance ?? 0.05) * expected + 1e-9);
    out.push({ id: c.id, status: Math.abs(rows - expected) <= tol ? 'PASS' : 'FAIL', rows, expected, tol, count: c.count, note: c.note || '' });
  }
  return out;
}

export function analyse(wps, rules, { start } = {}) {
  const R = { ...DEFAULT_RULES, ...rules };
  const N = wps.reduce((a, w) => a + w.sessions, 0);
  const phases = PHASES.map((p) => ({ phase: p, wps: wps.filter((w) => w.phase === p).length, sessions: wps.filter((w) => w.phase === p).reduce((a, w) => a + w.sessions, 0) }));
  const sched = schedule(wps);
  const h = R.sessionHours;
  const res = {
    wps: wps.length, sessions: N, sizes: { S: wps.filter((w) => w.size === 'S').length, M: wps.filter((w) => w.size === 'M').length, L: wps.filter((w) => w.size === 'L').length }, phases,
    phaseSumOk: phases.reduce((a, p) => a + p.sessions, 0) === N,
  };
  const r1 = (v) => +v.toFixed(1);
  res.resource = { high: r1((N * h) / R.cxu.high / 24), mid: r1((N * h) / R.cxu.mid / 24), low: r1((N * h) / R.cxu.low / 24) };
  if (sched.cycle) { res.cycle = sched.cycle; return { ...res, errors: ['dependency cycle through: ' + sched.cycle.slice(0, 8).join(', ')] }; }
  res.criticalPath = { sessions: sched.length, chain: sched.critical };
  res.path = { low: r1((sched.length * h) / (24 * R.uPath.low)), high: r1((sched.length * h) / (24 * R.uPath.high)) };
  res.duration = { low: r1(Math.max(res.path.low, res.resource.high)), high: r1(Math.max(res.path.high, res.resource.low)) };
  // time axis for float and review queue: early start/finish in sessions -> days at the conservative path utilisation
  const day = (sessions) => Math.floor((sessions * h) / (24 * R.uPath.high));
  const t0 = new Date((start || R.startDate) + 'T00:00:00Z');
  const addDays = (d) => new Date(t0.getTime() + d * 86400000);
  const weeks = new Map();
  for (const w of wps) {
    const f = sched.float.get(w.wp);
    if (f < R.floatLimitSessions) { const k = isoWeek(addDays(day(sched.es.get(w.wp)))); const e = weeks.get(k) || { week: k, wps: 0, critical: 0 }; e.wps++; if (f === 0) e.critical++; weeks.set(k, e); }
  }
  res.floatWeeks = [...weeks.values()].sort((a, b) => (a.week < b.week ? -1 : 1));
  res.tightWps = wps.filter((w) => sched.float.get(w.wp) < R.floatLimitSessions).length;
  // reviewer queue
  const rev = R.review;
  const instances = new Set(wps.filter((w) => w.role === rev.role).map((w) => w.instance));
  const mult = instances.size;
  const arrivals = new Map();
  for (const w of wps) if (w.role !== rev.role && (!rev.whenSpecColumnSet || w.spec)) { const d = day(sched.ef.get(w.wp)); arrivals.set(d, (arrivals.get(d) || 0) + rev.sessionsPerReview); }
  const horizon = day(sched.length) + 1;
  const cap = mult * ((24 * R.uPath.high) / h);               // review sessions one REVIEWER instance clears per day
  let q = 0, max = 0, maxDay = 0;
  const queue = [];
  for (let d = 0; d <= horizon + 400 && (d <= horizon || q > 1e-9); d++) {
    q = Math.max(0, q + (arrivals.get(d) || 0) - cap);
    if (q > max) { max = q; maxDay = d; }
    queue.push(+q.toFixed(2));
  }
  res.reviewer = { multiplicity: mult, capacityPerDay: +cap.toFixed(2), reviews: [...arrivals.values()].reduce((a, b) => a + b, 0), maxQueue: +max.toFixed(2), maxQueueDay: maxDay, daysWithQueue: queue.filter((v) => v > 0.5).length };
  // ladder
  const rungs = [1, 2, 3, 4, 5, 6].map((k) => ({ rung: k, wps: wps.filter((w) => w.rung === k).length, sessions: wps.filter((w) => w.rung === k).reduce((a, w) => a + w.sessions, 0) }));
  const cap13 = rungs.slice(0, 3).reduce((a, r) => a + r.sessions, 0), capAll = rungs.reduce((a, r) => a + r.sessions, 0);
  res.ladder = { rungs, capacity13: cap13, capacityAll: capAll, pct13: N ? +((100 * cap13) / N).toFixed(1) : 0, pctAll: N ? +((100 * capAll) / N).toFixed(1) : 0 };
  res.noRegret = { wps: wps.filter((w) => w.noRegret).length, sessions: wps.filter((w) => w.noRegret).reduce((a, w) => a + w.sessions, 0) };
  const roles = new Map();
  for (const w of wps) { const e = roles.get(w.role) || { role: w.role, wps: 0, sessions: 0, instances: new Set() }; e.wps++; e.sessions += w.sessions; e.instances.add(w.instance); roles.set(w.role, e); }
  res.roles = [...roles.values()].map((e) => ({ role: e.role, wps: e.wps, sessions: e.sessions, multiplicity: e.instances.size })).sort((a, b) => b.sessions - a.sessions || (a.role < b.role ? -1 : 1));
  return res;
}

/** CONTINUE | EXECUTE-RUNGS(k) | STOP for an overrun measured in sessions. */
export function calibrate(res, overrunSessions) {
  const L = res.ladder;
  if (overrunSessions <= L.capacity13) return 'CONTINUE';
  if (overrunSessions <= L.capacityAll) {
    let acc = 0, k = 0;
    for (const r of L.rungs) { acc += r.sessions; k = r.rung; if (acc >= overrunSessions) break; }
    return `EXECUTE-RUNGS(${k})`;
  }
  return 'STOP';
}

export function renderBlock(res, classes = []) {
  const L = [];
  L.push(`total sessions: ${res.sessions}`, `work packages: ${res.wps} (S ${res.sizes.S}, M ${res.sizes.M}, L ${res.sizes.L})`, '', '| phase | sessions | WPs |', '|---|---|---|');
  for (const p of res.phases) L.push(`| ${p.phase} | ${p.sessions} | ${p.wps} |`);
  L.push('');
  L.push(`resource-bound at c x u 3.5/2.5/1.5: ${res.resource.high} / ${res.resource.mid} / ${res.resource.low} days (N x 1.3 h / (c x u) / 24)`);
  if (res.criticalPath) {
    L.push(`critical path: ${res.criticalPath.sessions} sessions (${res.criticalPath.chain.length} WPs, first ${res.criticalPath.chain[0]}, last ${res.criticalPath.chain[res.criticalPath.chain.length - 1]}); path-bound at u 0.8 / 0.55: ${res.path.low} / ${res.path.high} days`);
    L.push(`reported duration: ${res.duration.low}-${res.duration.high} days = [max(path low, resource at 3.5), max(path high, resource at 1.5)]`);
    L.push(`tight WPs (float < 4 sessions): ${res.tightWps}; reviewer queue: multiplicity ${res.reviewer.multiplicity}, peak ${res.reviewer.maxQueue} review sessions on day ${res.reviewer.maxQueueDay}`);
  }
  if (res.ladder) {
    L.push(`ladder capacity: rungs 1-3 ${res.ladder.capacity13} sessions (${res.ladder.pct13}%), rungs 1-6 ${res.ladder.capacityAll} sessions (${res.ladder.pctAll}%)`);
    L.push(`calibration: overrun <= ${res.ladder.capacity13} sessions CONTINUE; <= ${res.ladder.capacityAll} sessions EXECUTE-RUNGS in order; above STOP (extend the schedule, nothing on the NEVER-cut list is dropped)`);
  }
  for (const c of classes) L.push(`class ${c.id}: ${c.status} (rows ${c.rows}${c.expected != null ? `, expected ${c.expected} +-${c.tol}` : ''})`);
  return L.join('\n');
}

export function pasteBlock(text, block, { insertAfter = null } = {}) {
  let t = text;
  if (!t.includes(BEGIN) || !t.includes(END)) {
    if (!insertAfter) return null;
    const lines = t.split('\n');
    const at = lines.findIndex((l) => insertAfter.test(l));
    if (at < 0) return null;
    lines.splice(at + 1, 0, '', BEGIN, END);
    t = lines.join('\n');
  }
  const a = t.indexOf(BEGIN), b = t.indexOf(END);
  if (b < a) return null;
  return t.slice(0, a + BEGIN.length) + '\n' + block + '\n' + t.slice(b);
}

// ------------------------------------------------------------------------------------------------------------------------------------------ cli
async function main(argv) {
  const o = { root: ROOT, csv: null, rules: null, start: null, json: false, check: false, paste: false, insert: false, calibrate: null };
  const val = (a, i) => { const m = /^--[a-z-]+=(.*)$/.exec(a); return m ? [m[1], i] : [argv[i + 1], i + 1]; };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { console.log(HELP); return 0; }
    if (a === '--json') o.json = true; else if (a === '--check') o.check = true; else if (a === '--paste') o.paste = true; else if (a === '--insert-markers') o.insert = true;
    else if (/^--(csv|rules|root|start|calibrate)(=|$)/.test(a)) { const key = /^--([a-z]+)/.exec(a)[1]; const [v, j] = val(a, i); i = j; if (v === undefined) { console.error('missing value for --' + key); return 2; } o[key] = key === 'root' ? path.resolve(v) : key === 'calibrate' ? Number(v) : v; }
    else { console.error('unknown argument: ' + a + ' (try --help)'); return 2; }
  }
  if (o.calibrate !== null && !(o.calibrate >= 0)) { console.error('--calibrate takes a number of sessions >= 0'); return 2; }
  if (o.start && !/^\d{4}-\d{2}-\d{2}$/.test(o.start)) { console.error('--start takes YYYY-MM-DD'); return 2; }
  const csvPath = path.resolve(o.root, o.csv || 'docs/eras/wbs.csv'), rulesPath = path.resolve(o.root, o.rules || 'docs/eras/wbs_rules.json');
  if (!fs.existsSync(csvPath)) { console.error(`missing ${path.relative(o.root, csvPath)}: the work breakdown is generated by COORD (P0E-10)`); return 2; }
  let rules = DEFAULT_RULES;
  if (fs.existsSync(rulesPath)) { try { rules = { ...DEFAULT_RULES, ...JSON.parse(fs.readFileSync(rulesPath, 'utf8')) }; } catch (e) { console.error(`${path.relative(o.root, rulesPath)} is not JSON: ${e.message}`); return 2; } }
  else if (!o.check) console.error(`note: ${path.relative(o.root, rulesPath)} missing, class granularity is not checked`);
  const { wps, errors } = loadWbs(fs.readFileSync(csvPath, 'utf8'));
  const classes = errors.length ? [] : classCheck(wps, rules);
  const res = errors.length ? { errors } : analyse(wps, rules, { start: o.start });
  if (res.errors && !errors.length) errors.push(...res.errors);
  const bad = errors.length > 0 || classes.some((c) => c.status === 'FAIL');
  if (o.calibrate !== null && !bad) { console.log(calibrate(res, o.calibrate)); return 0; }
  if (o.json) { console.log(JSON.stringify({ errors, classes, ...res, floatWeeks: res.floatWeeks }, null, 1)); return bad ? 1 : 0; }
  if (errors.length) { for (const e of errors.slice(0, 40)) console.error('ERROR ' + e); if (errors.length > 40) console.error(`... ${errors.length - 40} more`); return 1; }
  const block = renderBlock(res, classes);
  if (o.check) { for (const c of classes) console.log(`${c.status.padEnd(7)} class ${c.id}: ${c.rows} rows${c.expected != null ? `, expected ${c.expected} +-${c.tol}` : ''}${c.note && c.status !== 'PASS' ? ' (' + c.note + ')' : ''}`); console.log(`wbs check: ${wps.length} WPs, ${classes.filter((c) => c.status === 'FAIL').length} class count(s) outside tolerance, ${classes.filter((c) => c.status === 'PENDING').length} pending`); return bad ? 1 : 0; }
  if (o.paste) {
    if (bad) { console.error('refusing to paste a breakdown that fails its checks (run --check)'); return 1; }
    const targets = [['docs/eras/plan.md', /^## 12\./], ['docs/eras/STATUS.md', /^## Where we are/]];
    for (const [rel, anchor] of targets) {
      const f = path.join(o.root, rel);
      const cur = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
      if (cur == null) { console.error(`missing ${rel}`); return 2; }
      const next = pasteBlock(cur, block, { insertAfter: o.insert ? anchor : null });
      if (next == null) { console.error(`${rel} has no ${BEGIN} ... ${END} pair${o.insert ? ' and no anchor heading' : ' (add them once, or use --insert-markers)'}`); return 2; }
      if (next !== cur) { fs.writeFileSync(f, next); console.log(`pasted into ${rel}`); } else console.log(`unchanged ${rel}`);
    }
    return 0;
  }
  console.log(block);
  console.log('\nfloat report (WPs with float < 4 sessions, by ISO week of early start):');
  for (const w of res.floatWeeks.slice(0, 60)) console.log(`  ${w.week}: ${w.wps} WPs (${w.critical} critical)`);
  console.log('\nroles: ' + res.roles.map((r) => `${r.role} x${r.multiplicity} (${r.sessions})`).join(', '));
  console.log('\nreviewer queue: ' + JSON.stringify(res.reviewer));
  return bad ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e.stack || e); process.exit(1); });
