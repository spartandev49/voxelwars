// Minimal runner for negative-control files (docs/eras/spec/VF.md 3.13), used by the TOOLS-GOLDEN tests to PROVE each tests/negctl/<id>.mjs they ship:
// the unmutated check must be green for the named labels, the mutated copy must turn exactly the named labels red. tools/negcontrols.mjs (TOOLS-VERIFY)
// is the full runner (sampling, tiers, result store, jobs); this file implements the same per-file contract and nothing else.
//
// A negctl file default-exports { id, criterion, expectRed:[label..], alsoRed?:[..], needs?, costS?, tier?, mutate(c), run:[cmd, ...args] }.
//   c.edit(file, regex, replacer)   rewrite a text file of the copy (new file renamed over the hard link; the original is never touched)
//   c.write(file, content) / c.remove(file) / c.pad(file, bytes)
// The copy is a hard-link clone of src/ tools/ tests/ release/ package.json under .cache/negctl/<pid>/<id>/ ; node_modules and assets are symlinks
// to the shared tree and cannot be mutated. The command runs inside the copy with VW_MAIN_ROOT = the real tree (baseline worktree, caches).
//
// usage: node tools/lib/negctl_lite.mjs <tests/negctl/ID.mjs | ID>... [--json] [--keep]
// exit: 0 every control is red-as-expected, 1 otherwise, 2 usage
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { MAIN_ROOT } from './paths.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const COPIED = ['src', 'tools', 'tests', 'release', 'package.json'];
const LINKED = ['node_modules', 'assets'];

function makeCopy(dir, mainRoot) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const n of COPIED) {
    if (!fs.existsSync(path.join(ROOT, n))) continue;
    const r = spawnSync('cp', ['-al', path.join(ROOT, n), path.join(dir, n)], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error('cp -al ' + n + ': ' + r.stderr);
  }
  for (const n of LINKED) if (fs.existsSync(path.join(mainRoot, n))) fs.symlinkSync(path.join(mainRoot, n), path.join(dir, n));
}
function context(dir) {
  const guard = (f) => {
    const abs = path.resolve(dir, f);
    if (!abs.startsWith(dir + path.sep)) throw new Error('mutation outside the copy: ' + f);
    if (!COPIED.includes(path.relative(dir, abs).split(path.sep)[0])) throw new Error('mutation of a shared (symlinked) path is not allowed: ' + f);
    return abs;
  };
  const put = (abs, data) => { const tmp = abs + '.negctl-' + crypto.randomBytes(4).toString('hex'); fs.writeFileSync(tmp, data); fs.renameSync(tmp, abs); };
  return {
    edit(f, re, rep) {
      const abs = guard(f), text = fs.readFileSync(abs, 'utf8'), next = text.replace(re, rep);
      if (next === text) throw new Error(`c.edit(${f}): the pattern ${re} changed nothing (a mutation that does nothing proves nothing)`);
      put(abs, next);
    },
    write(f, content) { const abs = guard(f); fs.mkdirSync(path.dirname(abs), { recursive: true }); put(abs, content); },
    remove(f) { fs.rmSync(guard(f)); },
    pad(f, bytes) { const abs = guard(f); put(abs, Buffer.concat([fs.readFileSync(abs), Buffer.from('\n' + ' '.repeat(Math.max(0, bytes - 1)))])); },
  };
}
function runIn(dir, cmd, mainRoot, timeoutMs) {
  const out = path.join(dir, '.criteria.jsonl');
  fs.rmSync(out, { force: true });
  const r = spawnSync(cmd[0], cmd.slice(1), { cwd: dir, encoding: 'utf8', timeout: timeoutMs, env: { ...process.env, VW_CRITERIA_OUT: out, VW_MAIN_ROOT: mainRoot, VW_GATE_DIR: path.join(dir, '.gate') } });
  const failed = new Set(); let lines = [];
  try { lines = fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch { /* the process died before writing */ }
  for (const l of lines) for (const f of l.failures || []) { failed.add(f); failed.add(`${l.id}/${f}`); }
  return { status: r.status, signal: r.signal, failed, lines, tail: ((r.stderr || '') + (r.stdout || '')).trim().split('\n').slice(-6).join('\n') };
}

/** Run one negctl module object. -> { id, criterion, result: 'red-as-expected'|'stayed-green'|'wrong-red'|'baseline-red', failed:[..], missing:[..], extra:[..] } */
export async function runControl(nc, { mainRoot = MAIN_ROOT, keep = false } = {}) {
  const work = path.join(mainRoot, '.cache', 'negctl', String(process.pid), nc.id);
  const cmd = nc.run;
  if (!Array.isArray(cmd)) throw new Error(`${nc.id}: run must be a command array`);
  const timeout = Math.max(60, (nc.costS || 30) * 6) * 1000;
  const labelsOf = (set) => [...set].filter((x) => x.startsWith(nc.criterion + '/'));
  try {
    makeCopy(work, mainRoot);
    const base = runIn(work, cmd, mainRoot, timeout);
    const baseRed = nc.expectRed.filter((e) => base.failed.has(e));
    if (base.status !== 0 || labelsOf(base.failed).length) return { id: nc.id, criterion: nc.criterion, result: 'baseline-red', failed: labelsOf(base.failed), missing: [], extra: [], detail: base.tail || `exit ${base.status}`, baseRed };
    nc.mutate(context(work));
    const mut = runIn(work, cmd, mainRoot, timeout);
    const F = new Set(labelsOf(mut.failed));
    const missing = nc.expectRed.filter((e) => !F.has(e)), extra = [...F].filter((f) => !nc.expectRed.includes(f) && !(nc.alsoRed || []).includes(f));
    const result = missing.length === 0 && extra.length === 0 ? 'red-as-expected' : missing.length === nc.expectRed.length && F.size === 0 ? 'stayed-green' : 'wrong-red';
    return { id: nc.id, criterion: nc.criterion, result, failed: [...F].sort(), missing, extra, detail: result === 'red-as-expected' ? '' : mut.tail };
  } finally { if (!keep) { fs.rmSync(work, { recursive: true, force: true }); try { fs.rmdirSync(path.dirname(work)); } catch { /* other controls of this process still running */ } } }
}

async function main(argv) {
  const files = [], opt = { json: false, keep: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l, i, arr) => arr.slice(0, i + 1).every((x) => x.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); return 0; }
    if (a === '--json') opt.json = true; else if (a === '--keep') opt.keep = true;
    else if (a.startsWith('--')) { console.error('unknown argument: ' + a); return 2; }
    else files.push(a.endsWith('.mjs') ? path.resolve(a) : path.join(ROOT, 'tests', 'negctl', a + '.mjs'));
  }
  if (!files.length) { console.error('give at least one negctl file or id'); return 2; }
  const res = [];
  for (const f of files) { const nc = (await import(pathToFileURL(f).href)).default; res.push(await runControl(nc, { keep: opt.keep })); }
  if (opt.json) console.log(JSON.stringify(res, null, 1));
  else for (const r of res) console.log(`${r.result === 'red-as-expected' ? 'PASS' : 'FAIL'}  ${r.id} (${r.criterion}): ${r.result}${r.failed.length ? '  red: ' + r.failed.join(', ') : ''}${r.missing.length ? '  MISSING: ' + r.missing.join(', ') : ''}${r.extra.length ? '  UNEXPECTED: ' + r.extra.join(', ') : ''}${r.detail ? '\n    ' + r.detail.split('\n').join('\n    ') : ''}`);
  return res.every((r) => r.result === 'red-as-expected') ? 0 : 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e.stack || e); process.exit(1); });
