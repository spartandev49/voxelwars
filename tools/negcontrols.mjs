// tools/negcontrols.mjs: the negative-control runner (VF 3.13; owner TOOLS-VERIFY). Engine: tools/lib/negctl.mjs.
//
//   node tools/negcontrols.mjs --all                         every control up to --tier (default: all tiers; the release suite, about 18 min)
//   node tools/negcontrols.mjs --sample=10% --seed=<s>       seeded sample of the controls up to --tier (default T-full) PLUS every control whose check
//                                                            script or control file changed (or never ran) since its last stored proof; the T-full gate step
//   node tools/negcontrols.mjs --draw=8 --seed=<s>           print 8 distinct control ids drawn by seed (QA); run them afterwards with --id=a,b,c
//   node tools/negcontrols.mjs --id=<id>[,<id>]              controls by NC id (NC-VF-09), file stem (VF-T03-pin) or criterion id (all its controls)
//   node tools/negcontrols.mjs --list                        the manifest: id, criterion, tier, needs, cost, state of the stored proof
//   node tools/negcontrols.mjs --lint                        hygiene only: control file shape, names, unique ids, a control per manifest criterion (PL15)
//   --jobs=N        controls in parallel (default 3; at most 2 of them with `chromium`, a `quiet` control runs alone)
//   --tier=T-fast|T-era|T-full|release|heavy   highest tier to include (--all/--draw default heavy, --sample default T-full)
//   --json          machine-readable result on stdout          --no-store   do not write .cache/gate/negctl.json
//   --keep          keep the copies under .cache/negctl/         --root=<dir>  tree to test (default this repository; a scratch project for tests)
//   --gate-dir=<d>  where negctl.json and the baseline cache live (default $VW_GATE_DIR or .cache/gate)
//   --no-baseline-cache   always run the unmutated command
// Every control runs on a hard-link clone of a frozen snapshot of the tree (the gate's own snapshot when run by the gate), never on the live tree.
// Results: PASS = red-as-expected; FAIL = stayed-green (the check is vacuous), wrong-red, baseline-red, unavailable (a need is missing) or error.
// exit: 0 every selected control is red-as-expected, 1 otherwise, 2 usage error
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROOT, MAIN_ROOT, GATE_DIR, SNAP_DIR } from './lib/paths.mjs';
import { loadControls, runControl, runPool, select, readStore, recordResult, storeFile, lintControls, scriptOf, makeSnapshot, hashTree, isStale } from './lib/negctl.mjs';
import { readJsonSafe } from './lib/er_rollup.mjs';
import crypto from 'crypto';

const HELP = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l, i, a) => a.slice(0, i + 1).every((x) => x.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n');
const fileSha = (f) => { try { return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); } catch { return null; } };

function parse(argv) {
  const o = { mode: null, jobs: 3, json: false, store: true, keep: false, root: ROOT, gateDir: GATE_DIR, baselineCache: true, list: false, lint: false, ids: [], seed: null, tier: null, frac: null, count: null, draw: null };
  const need = (a, v) => { if (v === undefined || v === '') throw new Error(`${a} needs a value`); return v; };
  for (const a of argv) {
    if (a === '--help' || a === '-h') { o.help = true; continue; }
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(a);
    if (!m) throw new Error('unknown argument: ' + a);
    const [, k, v] = m;
    if (k === 'all') o.mode = 'all';
    else if (k === 'sample') { o.mode = 'sample'; const s = need(a, v); if (/^\d+(\.\d+)?%$/.test(s)) o.frac = parseFloat(s) / 100; else if (/^\d+$/.test(s) && +s >= 1) o.count = +s; else throw new Error('--sample takes 10% or a count'); if (o.frac != null && !(o.frac > 0 && o.frac <= 1)) throw new Error('--sample percent must be in (0, 100]'); }
    else if (k === 'draw') { o.mode = 'draw'; o.draw = parseInt(need(a, v), 10); if (!(o.draw >= 1)) throw new Error('--draw takes a positive count'); }
    else if (k === 'id') { o.mode = 'id'; o.ids.push(...need(a, v).split(',').filter(Boolean)); }
    else if (k === 'seed') o.seed = need(a, v);
    else if (k === 'jobs') { o.jobs = parseInt(need(a, v), 10); if (!(o.jobs >= 1)) throw new Error('--jobs takes a positive number'); }
    else if (k === 'tier') o.tier = need(a, v);
    else if (k === 'json') o.json = true;
    else if (k === 'no-store') o.store = false;
    else if (k === 'keep') o.keep = true;
    else if (k === 'list') o.list = true;
    else if (k === 'lint') o.lint = true;
    else if (k === 'root') o.root = path.resolve(need(a, v));
    else if (k === 'gate-dir') o.gateDir = path.resolve(need(a, v));
    else if (k === 'no-baseline-cache') o.baselineCache = false;
    else throw new Error('unknown argument: ' + a);
  }
  return o;
}

async function main(argv) {
  let o;
  try { o = parse(argv); } catch (e) { console.error(e.message + '\n(try --help)'); return 2; }
  if (o.help) { console.log(HELP); return 0; }
  if (!o.mode && !o.list && !o.lint) { console.error('give one of --all, --sample, --draw, --id, --list, --lint (try --help)'); return 2; }
  if ((o.mode === 'sample' || o.mode === 'draw') && o.seed == null) { console.error(`--${o.mode} needs --seed=<s>: the selection is deterministic per seed`); return 2; }
  const root = o.root;
  const controls = await loadControls(root);
  const manifest = readJsonSafe(path.join(root, 'tools/lib/criteria_manifest.json'));
  if (o.lint) {
    const problems = lintControls(controls, manifest);
    for (const p of problems) console.log('LINT ' + p);
    console.log(`${controls.length} control files, ${controls.filter((c) => c.nc).length} valid, ${problems.length} problem(s)`);
    return problems.length ? 1 : 0;
  }
  const store = readStore(storeFile(o.gateDir));
  const hashNow = (c) => { const s = scriptOf(c.nc); return s ? fileSha(path.join(root, s)) : null; };
  if (o.list) {
    const rows = controls.filter((c) => c.nc).map((c) => {
      const e = store[c.nc.criterion] && store[c.nc.criterion].controls && store[c.nc.criterion].controls[c.nc.id];
      return { id: c.nc.id, criterion: c.nc.criterion, file: c.file, tier: c.nc.tier || 'T-fast', needs: c.nc.needs || [], costS: c.nc.costS || null, proof: !e ? 'never' : isStale(c, store, hashNow(c)) ? 'stale' : e.result };
    });
    if (o.json) console.log(JSON.stringify(rows, null, 1));
    else for (const r of rows) console.log(`${r.id.padEnd(30)} ${r.criterion.padEnd(24)} ${r.tier.padEnd(8)} ${String(r.costS || '-').padStart(4)}s  ${(r.needs.join('+') || '-').padEnd(18)} ${r.proof}`);
    return 0;
  }
  const bad = controls.filter((c) => c.errors.length);
  if (bad.length) { for (const c of bad) console.error(`INVALID ${c.file}: ${c.errors.join('; ')}`); console.error('fix the control files first (node tools/negcontrols.mjs --lint)'); return 1; }

  let chosen;
  try { chosen = select(controls, { mode: o.mode, frac: o.frac, count: o.mode === 'draw' ? o.draw : o.count, seed: o.seed, ids: o.ids, tierMax: o.tier, store, scriptHashOf: hashNow }); } catch (e) { console.error(e.message); return 2; }
  if (o.mode === 'draw') {
    if (o.json) console.log(JSON.stringify(chosen.map((c) => c.nc.id))); else for (const c of chosen) console.log(c.nc.id);
    return 0;
  }
  if (!chosen.length) { console.error('no control selected'); return 2; }

  // the frozen tree: the gate's snapshot when we run inside one, else a snapshot of the live tree (content addressed, reused)
  const inSnap = !!process.env.VW_SNAP || path.resolve(root).startsWith(SNAP_DIR + path.sep);
  let srcDir = root, treeHash;
  if (inSnap) treeHash = process.env.VW_TREEHASH || hashTree(root).treeHash;
  else { const snapDir = root === ROOT ? SNAP_DIR : path.join(root, '.cache/snap'); const snap = makeSnapshot(root, { snapDir, linkRoot: root === ROOT ? MAIN_ROOT : root }); srcDir = snap.dir; treeHash = snap.treeHash; }
  const mainRoot = root === ROOT ? MAIN_ROOT : root;
  const workBase = path.join(mainRoot, '.cache/negctl', String(process.pid));
  fs.mkdirSync(workBase, { recursive: true });
  const t0 = Date.now();
  const say = (s) => (o.json ? console.error(s) : console.log(s));
  say(`negcontrols: ${chosen.length} control(s) of ${controls.length}, jobs=${o.jobs}, tree=${treeHash.slice(0, 12)}${inSnap ? ' (gate snapshot)' : ''}`);
  const results = await runPool(chosen, {
    jobs: o.jobs,
    run: (c) => runControl(c, { srcDir, treeHash, workBase, mainRoot, gateDir: o.gateDir, keep: o.keep, useBaselineCache: o.baselineCache }),
    onDone: (r) => {
      say(`${r.result === 'red-as-expected' ? 'PASS' : 'FAIL'}  ${r.id} (${r.criterion}): ${r.result}  ${r.secs}s${r.result === 'red-as-expected' ? '' : '\n    ' + [r.missing.length ? 'missing red: ' + r.missing.join(', ') : '', r.extra.length ? 'unexpected red: ' + r.extra.join(', ') : '', (r.detail || '').split('\n').join('\n    ')].filter(Boolean).join('\n    ')}`);
      if (o.store) {
        const hashes = {}; for (const c of controls) if (c.nc) hashes[c.nc.criterion] = hashes[c.nc.criterion] || hashNow(c) || r.scriptHash;
        try { recordResult(storeFile(o.gateDir), r, controls, hashes); } catch (e) { console.error('cannot write the store: ' + e.message); }
      }
    },
  });
  try { fs.rmdirSync(workBase); } catch { /* kept or not empty */ }
  const okN = results.filter((r) => r.result === 'red-as-expected').length;
  say(`negcontrols: ${okN}/${results.length} red-as-expected in ${((Date.now() - t0) / 1000).toFixed(1)}s${o.store ? `; store ${path.relative(MAIN_ROOT, storeFile(o.gateDir))}` : ''}`);
  if (o.json) console.log(JSON.stringify(results, null, 1));
  return okN === results.length ? 0 : 1;
}
main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e.stack || e); process.exit(1); });
