// Record states of the measurement records (docs/eras/spec/VF.md 3.7): feasibility, balance, era_fingerprint, perf. The gate step `records` runs `check`.
//
//   node tools/records.mjs check [--era=<id>] [--scope=ancient,medieval|all] [--frozen=<ids>] [--mark] [--strict] [--root=<dir>] [--json]
//
// Looks for new-style records (schema 1, written by tools/lib/records.mjs makeRecord) in
//   tests/campaign/feasibility.<era>.json   docs/balance/<era>.json   tests/campaign/era_fingerprint.<era>.json   .cache/gate/perf.<engine>.json
// and classifies each against the current tree (tools/lib/fingerprint.mjs): CURRENT, STALE-ENGINE (amber), RED-WITNESS, RED-ERA, RED-AGE, MISSING.
// Legacy files (no schema field, or legacy:true: tests/campaign/feasibility.json, docs/balance_data.json) are listed and ignored.
//   --era / --scope  limit the eras checked (default: every era directory under src/content)
//   --frozen=<ids>   eras past their E-FREEZE: a missing feasibility / balance record of a frozen era is red (before that it is only listed)
//   --mark           write `staleSince` into every record that is stale and not yet marked (starts its age clock; the gate runs without it, in a snapshot)
//   --strict         amber counts as red (release_check)
//   --root=<dir>     tree to check (default: this repository)
// The replay witness behind STALE-ENGINE is read from tests/golden/witness.json  { "<era>": [ ["node", "tests/golden/g1_sim.test.mjs", "--core"], ... ] }:
// every command must exit 0 in the root. No file, no entry or a failing command means the witness is NOT green (fail closed).
// exit: 0 no red record, 1 at least one red record (or amber with --strict), 2 usage
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fingerprint, REPO_ROOT } from './lib/fingerprint.mjs';
import { classifyRecord, landingsCount, markStale, writeRecord, canonicalJSON, MEASUREMENT_KINDS, validateRecord } from './lib/records.mjs';

const HELP = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l, i, a) => a.slice(0, i + 1).every((x) => x.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n');

function erasOnDisk(root) {
  try { return fs.readdirSync(path.join(root, 'src/content'), { withFileTypes: true }).filter((e) => e.isDirectory() && /^era_[a-z0-9_]+$/.test(e.name)).map((e) => e.name.slice(4)).sort(); } catch { return []; }
}
/** [{file, era|null, kind}] candidate record files under root (by name pattern). */
function discover(root) {
  const out = [], ls = (d) => { try { return fs.readdirSync(path.join(root, d)).sort(); } catch { return []; } };
  for (const f of ls('tests/campaign')) { let m = /^feasibility\.([a-z0-9_]+)\.json$/.exec(f); if (m) out.push({ file: `tests/campaign/${f}`, era: m[1] }); m = /^era_fingerprint\.([a-z0-9_]+)\.json$/.exec(f); if (m) out.push({ file: `tests/campaign/${f}`, era: m[1] }); }
  for (const f of ls('docs/balance')) { const m = /^([a-z0-9_]+)\.json$/.exec(f); if (m) out.push({ file: `docs/balance/${f}`, era: m[1] }); }
  for (const f of ls('.cache/gate')) if (/^perf\.[a-z]+\.json$/.test(f)) out.push({ file: `.cache/gate/${f}`, era: null });
  return out;
}

export function runCheck({ root = REPO_ROOT, eras = null, frozen = [], mark = false, strict = false, now = new Date() } = {}) {
  const all = erasOnDisk(root), scope = eras || all;
  const fp = fingerprint(root, all.length ? all : ['ancient']);
  const cur = { engineHash: fp.engineHash, eraHash: fp.eraHash, landings: landingsCount(root), now };
  const wfile = path.join(root, 'tests/golden/witness.json');
  let wcfg = null; try { wcfg = JSON.parse(fs.readFileSync(wfile, 'utf8')); } catch { /* no witness configured */ }
  const wmemo = new Map();
  const witness = (era) => () => {
    if (wmemo.has(era)) return wmemo.get(era);
    const cmds = wcfg && wcfg[era];
    let ok = Array.isArray(cmds) && cmds.length > 0;
    for (const cmd of ok ? cmds : []) { const r = spawnSync(cmd[0], cmd.slice(1), { cwd: root, encoding: 'utf8', timeout: 600000 }); if (r.status !== 0) { ok = false; break; } }
    wmemo.set(era, ok);
    return ok;
  };
  const rows = [], ignored = [];
  const found = new Set();
  for (const d of discover(root)) {
    let rec; try { rec = JSON.parse(fs.readFileSync(path.join(root, d.file), 'utf8')); } catch (e) { rows.push({ file: d.file, state: 'RED-MALFORMED', red: true, amber: false, reason: 'unreadable JSON' }); continue; }
    if (rec.legacy === true || rec.schema === undefined) { ignored.push(d.file); continue; }
    const bad = validateRecord(rec);
    if (bad.length) { rows.push({ file: d.file, state: 'RED-MALFORMED', red: true, amber: false, reason: 'malformed record: ' + bad.join(', ') }); continue; }
    if (!MEASUREMENT_KINDS.includes(rec.kind)) { rows.push({ file: d.file, kind: rec.kind, state: 'RED-MALFORMED', red: true, amber: false, reason: `kind "${rec.kind}" is not a measurement kind (${MEASUREMENT_KINDS.join(', ')})` }); continue; }
    const recEras = d.era ? [d.era] : Object.keys(rec.eraHash);
    if (!recEras.some((e) => scope.includes(e))) continue;
    for (const era of recEras) {
      if (!scope.includes(era)) continue;
      if (d.era) found.add(d.file.startsWith('docs/balance') ? `balance:${era}` : d.file.includes('era_fingerprint') ? `era_fingerprint:${era}` : `feasibility:${era}`);
      let r;
      try { r = classifyRecord(rec, cur, { era, witness: witness(era) }); } catch (e) { r = { state: 'RED-MALFORMED', red: true, amber: false, reason: e.message }; }
      if (r.state === 'STALE-ENGINE' && !rec.staleSince) {
        if (mark) { writeRecord(path.join(root, d.file), markStale(rec, cur)); r.reason += '; staleSince written now'; r.marked = true; }
        else { r.reason += '; staleSince not set (run: node tools/records.mjs check --mark)'; if (strict) r.red = true; }
      }
      if (strict && r.amber) r.red = true;
      rows.push({ file: d.file, kind: rec.kind, era, ...r });
    }
  }
  for (const era of frozen.filter((e) => scope.includes(e))) for (const k of ['feasibility', 'balance']) {
    if (found.has(`${k}:${era}`)) continue;
    const r = classifyRecord(null, cur, { era, required: true, frozen: true });
    rows.push({ file: k === 'balance' ? `docs/balance/${era}.json` : `tests/campaign/feasibility.${era}.json`, kind: k, era, ...r });
  }
  return { rows, ignored, ok: !rows.some((r) => r.red), amber: rows.filter((r) => r.amber).length, landings: cur.landings };
}

async function main(argv) {
  const o = { cmd: null, json: false, mark: false, strict: false, frozen: [], eras: null, root: REPO_ROOT };
  for (const a of argv) {
    if (a === '--help' || a === '-h') { console.log(HELP); return 0; }
    if (a === 'check') { o.cmd = 'check'; continue; }
    if (a === '--json') o.json = true; else if (a === '--mark') o.mark = true; else if (a === '--strict') o.strict = true;
    else {
      const m = /^--(era|scope|frozen|root)=(.+)$/.exec(a);
      if (!m) { console.error('unknown argument: ' + a + '\n' + HELP); return 2; }
      if (m[1] === 'era') o.eras = [m[2]]; else if (m[1] === 'scope') o.eras = m[2] === 'all' ? null : m[2].split(',').filter(Boolean); else if (m[1] === 'frozen') o.frozen = m[2].split(',').filter(Boolean); else o.root = path.resolve(m[2]);
    }
  }
  if (o.cmd !== 'check') { console.error(HELP); return 2; }
  const res = runCheck({ root: o.root, eras: o.eras, frozen: o.frozen, mark: o.mark, strict: o.strict });
  if (o.json) console.log(canonicalJSON(JSON.parse(JSON.stringify(res))));
  else {
    for (const r of res.rows) console.log(`${r.red ? 'RED  ' : r.amber ? 'AMBER' : 'ok   '} ${r.state.padEnd(13)} ${r.file}${r.era ? ' [' + r.era + ']' : ''}  ${r.reason}`);
    for (const f of res.ignored) console.log(`ok    legacy        ${f}  (no schema: ignored)`);
    console.log(`records: ${res.rows.length} checked, ${res.rows.filter((r) => r.red).length} red, ${res.amber} amber, ${res.ignored.length} legacy ignored${res.ok ? '' : ' -> FAILED'}`);
  }
  return res.ok ? 0 : 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e.stack || e); process.exit(1); });
