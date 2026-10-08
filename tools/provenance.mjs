// Provenance of the Ancient v8 baseline (docs/eras/spec/VF.md 3.5; AR 3.11.4). Re-runs, offline or against a read-back, the procedure COORD executed on 2026-10-08.
//
//   node tools/provenance.mjs --check [--engine=unchanged|any] [--release=<dir>] [--worktree=<dir>] [--json]
//        offline: the baseline commit, release/v8/ page + PAGE.sha256, files.json / files.manifest.json against the files under assets/,
//        the inflated payload (size, sha256 prefix, build date), the baseline worktree (HEAD and its two symlinks) and "no engine edit"
//        (engineHash + eraHash(ancient) of this tree equal those of the baseline; --engine=any records the comparison but does not fail on it).
//   node tools/provenance.mjs --payload <readback.html> [--release=<dir>] [--json]
//        compares a hosted read-back (skeleton + fragment + closing tags) with release/v8/index.html component by component
//        (manifest, credits, core audio, UAL clips, files list, JS bundle, <style>, both loader scripts) and checks the fragment is embedded verbatim.
//   node tools/provenance.mjs --rebuild [--candidates=N] [--rev=<sha>] [--json]
//        builds the last N commits that changed src/ assets/ package.json tools/build.mjs (or --rev) with VW_BUILD_DATE read from the v8 payload,
//        in a throwaway export under .cache/provenance/, and compares the fragment with release/v8/index.html (cmp, then component by component).
// exit: 0 every check passed, 1 a check failed, 2 usage error.   Output is deterministic (no timings, no temp paths).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sha256, describePack } from './lib/pack.mjs';
import { engineHash, eraHash, renderHash, REPO_ROOT } from './lib/fingerprint.mjs';
import { BASELINE_SHA, BASELINE_TAG, BASELINE_WORKTREE } from './golden/baseline.mjs';
import { MAIN_ROOT } from './lib/paths.mjs';

export const EXPECT = {
  sha: BASELINE_SHA, tag: BASELINE_TAG,
  pageBytes: 3106540, pageSha256: '4f707d2785ffe74437fc14af2b0d7aff0a24514ae59db31d39a0a371ec0ea885',
  files: 382, filesBytes: 10979932,
  payloadBytes: 4388731, payloadShaPrefix: '812e57ae8125d420', buildDate: '2026-10-08',
  skeletonChars: 537,
};

// git history lives in the shared working tree (MAIN_ROOT), also when this tool runs inside a gate snapshot or negative-control copy
const git = (root, ...a) => { const r = spawnSync('git', ['-C', root, ...a], { encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; };
const readIf = (f) => { try { return fs.readFileSync(f); } catch { return null; } };

/** Run the offline checks. -> [{name, ok, detail}] */
export function check({ root = REPO_ROOT, release = path.join(root, 'release', 'v8'), worktree = BASELINE_WORKTREE, engine = 'unchanged' } = {}) {
  const out = [];
  const add = (name, ok, detail) => out.push({ name, ok: !!ok, detail });

  // 1. the baseline commit
  const kind = git(MAIN_ROOT, 'cat-file', '-t', EXPECT.sha);
  add('tag_sha', kind === 'commit', kind === 'commit' ? `commit ${EXPECT.sha.slice(0, 7)} present` : `commit ${EXPECT.sha} not found`);
  const tagged = git(MAIN_ROOT, 'rev-parse', '--verify', '-q', `refs/tags/${EXPECT.tag}^{commit}`);
  add('tag_points_at_sha', tagged === null || tagged === EXPECT.sha, tagged === null ? `tag ${EXPECT.tag} absent (local-only tag; the sha is the reference)` : `tag ${EXPECT.tag} -> ${tagged.slice(0, 7)}`);

  // 2. the page
  const page = readIf(path.join(release, 'index.html')), pageSha = readIf(path.join(release, 'PAGE.sha256'));
  let want = null;
  if (pageSha) { const m = /^([0-9a-f]{64})\s+index\.html\s+(\d+)\s*$/.exec(pageSha.toString('utf8').trim()); if (m) want = { sha: m[1], bytes: +m[2] }; }
  add('page_file', !!page && !!want, page && want ? 'index.html and PAGE.sha256 readable' : 'index.html or PAGE.sha256 missing / malformed');
  if (page && want) {
    const got = sha256(page);
    add('page_sha', got === want.sha && want.sha === EXPECT.pageSha256, got === want.sha ? `sha256(index.html) = PAGE.sha256 = ${got.slice(0, 16)}...` : `sha256(index.html) ${got.slice(0, 16)}... != PAGE.sha256 ${want.sha.slice(0, 16)}...`);
    add('page_bytes', page.length === want.bytes && page.length === EXPECT.pageBytes, `index.html is ${page.length} B (expected ${EXPECT.pageBytes})`);
  }

  // 3. files.json / files.manifest.json against the files on disk
  const fj = readIf(path.join(release, 'files.json')), fm = readIf(path.join(release, 'files.manifest.json'));
  let files = null, man = null;
  try { files = JSON.parse(fj.toString('utf8')); man = JSON.parse(fm.toString('utf8')); } catch { /* reported below */ }
  add('manifest_file', !!files && !!man, files && man ? 'files.json and files.manifest.json parse' : 'files.json or files.manifest.json missing / malformed');
  if (files && man) {
    const keys = Object.keys(man), total = keys.reduce((s, k) => s + man[k].bytes, 0);
    add('manifest_count', keys.length === EXPECT.files, `${keys.length} entries (expected ${EXPECT.files})`);
    add('manifest_bytes', total === EXPECT.filesBytes, `${total} B (expected ${EXPECT.filesBytes})`);
    add('files_json_keys', JSON.stringify(Object.keys(files)) === JSON.stringify(keys) && keys.every((k) => files[k] === k), 'files.json is the identity map over the same keys in the same order');
    const bad = [];
    for (const k of keys) {
      const b = readIf(path.join(root, k));
      if (!b) bad.push(k + ' (missing)'); else if (b.length !== man[k].bytes) bad.push(k + ' (bytes)'); else if (sha256(b) !== man[k].sha256) bad.push(k + ' (sha256)');
    }
    add('manifest_disk', bad.length === 0, bad.length ? `${bad.length} entries differ from assets/ on disk: ${bad.slice(0, 3).join(', ')}` : `all ${keys.length} entries match the files on disk`);
  }

  // 4. the payload of the v8 page
  if (page) {
    try {
      const d = describePack(page.toString('utf8'));
      add('payload', d.payload.bytes === EXPECT.payloadBytes && d.payload.sha256.startsWith(EXPECT.payloadShaPrefix), `payload ${d.payload.bytes} B, sha256 ${d.payload.sha256.slice(0, 16)} (expected ${EXPECT.payloadBytes} B, ${EXPECT.payloadShaPrefix})`);
      add('build_date', d.buildDate === EXPECT.buildDate, `build date in the payload: ${d.buildDate}`);
    } catch (e) { add('payload', false, 'cannot extract the payload: ' + e.message); }
  }

  // 5. the baseline worktree
  const head = git(worktree, 'rev-parse', 'HEAD');
  add('worktree_head', head === EXPECT.sha, head === EXPECT.sha ? 'baseline worktree HEAD = baseline commit' : `baseline worktree HEAD is ${head || 'unreadable'}`);
  for (const l of ['node_modules', '.cache/cdn']) {
    let ok = false, d = 'absent';
    try { const st = fs.lstatSync(path.join(worktree, l)); ok = st.isSymbolicLink() && fs.existsSync(path.join(worktree, l)); d = ok ? 'symlink resolves' : st.isSymbolicLink() ? 'dangling symlink' : 'not a symlink'; } catch { /* absent */ }
    add('worktree_link_' + l.replace(/^\./, '').replace(/\W+/g, '_'), ok, `${l}: ${d}`);
  }

  // 6. "no engine edit": this tree vs the baseline
  if (fs.existsSync(path.join(worktree, 'src'))) {
    const here = { eng: engineHash(root), era: eraHash('ancient', root), ren: renderHash(root) }, base = { eng: engineHash(worktree), era: eraHash('ancient', worktree), ren: renderHash(worktree) };
    const dif = [];
    if (here.eng.simCore !== base.eng.simCore) dif.push('simCore');
    if (here.eng.shared !== base.eng.shared) dif.push('shared');
    if (here.era !== base.era) dif.push('eraHash(ancient)');
    const ren = here.ren === base.ren ? '' : ' (renderHash differs)';
    add('engine_unchanged', engine === 'any' || dif.length === 0, dif.length ? `engine edited since the baseline: ${dif.join(', ')} differ${ren}${engine === 'any' ? ' (allowed with --engine=any)' : ''}` : `simCore, shared and eraHash(ancient) equal the baseline's${ren}`);
  } else add('engine_unchanged', false, 'baseline worktree has no src/');
  return out;
}

/** Compare the pack of `readback` (a hosted page or a fragment) with the reference fragment. -> {ok, rows:[{name, ok, detail}]} */
export function comparePayload(readbackText, referenceText) {
  const rows = [], add = (name, ok, detail) => rows.push({ name, ok: !!ok, detail });
  let a, b;
  try { b = describePack(referenceText); } catch (e) { add('reference', false, 'reference page unreadable: ' + e.message); return { ok: false, rows }; }
  try { a = describePack(readbackText); } catch (e) { add('readback', false, 'read-back unreadable: ' + e.message); return { ok: false, rows }; }
  add('payload', a.payload.sha256 === b.payload.sha256, `read-back payload ${a.payload.bytes} B sha256 ${a.payload.sha256.slice(0, 16)}, reference ${b.payload.bytes} B ${b.payload.sha256.slice(0, 16)}`);
  for (const k of Object.keys(b.components)) add(k, a.components[k] && a.components[k].sha256 === b.components[k].sha256, a.components[k] ? `${a.components[k].bytes} B vs ${b.components[k].bytes} B` : 'missing in the read-back');
  const has = (list, x) => list.some((y) => y.sha256 === x.sha256);
  b.styles.forEach((s, i) => add('style' + (b.styles.length > 1 ? i : ''), has(a.styles, s), `${s.bytes} B <style> ${has(a.styles, s) ? 'present' : 'NOT present'}`));
  b.loaders.forEach((s, i) => add('loader' + i, has(a.loaders, s), `${s.bytes} B inline script ${has(a.loaders, s) ? 'present' : 'NOT present'}`));
  add('build_date', a.buildDate === b.buildDate && a.buildDate === EXPECT.buildDate, `read-back build date ${a.buildDate}, reference ${b.buildDate}`);
  const at = readbackText.indexOf(referenceText);
  add('fragment_embedded', at >= 0, at >= 0 ? `the reference fragment is embedded verbatim at offset ${at} (skeleton ${at} chars, tail ${JSON.stringify(readbackText.slice(at + referenceText.length))})` : 'the reference fragment is NOT embedded verbatim in the read-back');
  return { ok: rows.every((r) => r.ok), rows };
}

function prepareExport(root, rev, scratch, buildDate) {
  const dir = path.join(scratch, rev.slice(0, 12));
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const ar = spawnSync('sh', ['-c', `git -C "${MAIN_ROOT}" archive ${rev} src tools assets package.json | tar -x -C "${dir}"`], { encoding: 'utf8' });
  if (ar.status !== 0) throw new Error(`git archive ${rev} failed: ${ar.stderr.trim()}`);
  fs.symlinkSync(path.join(MAIN_ROOT, 'node_modules'), path.join(dir, 'node_modules'));
  const bp = path.join(dir, 'tools', 'build.mjs');
  let src = fs.readFileSync(bp, 'utf8');
  if (!src.includes('VW_BUILD_DATE')) {            // revisions older than d9f663a bake today's date: inject the override into the export only
    const n = src.replace('new Date().toISOString().slice(0, 10)', '(process.env.VW_BUILD_DATE || new Date().toISOString().slice(0, 10))');
    if (n === src) throw new Error(`${rev}: cannot find the build-date expression in tools/build.mjs`);
    fs.writeFileSync(bp, n);
  }
  const b = spawnSync('node', [bp, '--minify'], { cwd: dir, encoding: 'utf8', env: { ...process.env, VW_BUILD_DATE: buildDate } });
  if (b.status !== 0) throw new Error(`build of ${rev} failed: ${(b.stderr || b.stdout).trim().split('\n').slice(-3).join(' | ')}`);
  return path.join(dir, 'dist', 'artifact', 'index.html');
}

/** Build candidates and compare. -> [{rev, subject, match, rows?}] ; stops at the first match unless `all`. */
export function rebuild({ root = REPO_ROOT, release = path.join(root, 'release', 'v8'), candidates = 3, rev = null, all = false } = {}) {
  const ref = fs.readFileSync(path.join(release, 'index.html'));
  const date = describePack(ref.toString('utf8')).buildDate;
  if (!date) throw new Error('the reference payload carries no build date');
  const revs = rev ? [rev] : (git(MAIN_ROOT, 'log', '--format=%H', `-n${candidates}`, '--', 'src', 'assets', 'package.json', 'tools/build.mjs') || '').split('\n').filter(Boolean);
  if (!revs.length) throw new Error('no candidate commits');
  const scratch = path.join(MAIN_ROOT, '.cache', 'provenance'), out = [];
  for (const r of revs) {
    const full = git(MAIN_ROOT, 'rev-parse', r) || r, subject = (git(MAIN_ROOT, 'log', '-1', '--format=%s', full) || '').slice(0, 70);
    const built = fs.readFileSync(prepareExport(root, full, scratch, date));
    const match = Buffer.compare(built, ref) === 0;
    const row = { rev: full, subject, buildDate: date, match, bytes: built.length };
    if (!match) row.rows = comparePayload(built.toString('utf8'), ref.toString('utf8')).rows.filter((x) => !x.ok);
    out.push(row);
    if (match && !all) break;
  }
  return out;
}

const HELP = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l, i, a) => a.slice(0, i + 1).every((x) => x.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n');
async function main(argv) {
  const o = { mode: null, json: false, engine: 'unchanged', candidates: 3 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { console.log(HELP); return 0; }
    if (a === '--check' || a === '--rebuild') { o.mode = a.slice(2); continue; }
    if (a === '--payload') { o.mode = 'payload'; o.file = argv[++i]; if (!o.file) { console.error('--payload needs a file'); return 2; } continue; }
    if (a === '--json') { o.json = true; continue; }
    const m = /^--(engine|release|worktree|candidates|rev)=(.+)$/.exec(a);
    if (!m) { console.error('unknown argument: ' + a + '\n' + HELP); return 2; }
    o[m[1]] = m[1] === 'release' || m[1] === 'worktree' ? path.resolve(m[2]) : m[2];
  }
  if (!o.mode) { console.error(HELP); return 2; }
  if (!['unchanged', 'any'].includes(o.engine)) { console.error('--engine must be unchanged or any'); return 2; }
  const opts = {}; if (o.release) opts.release = o.release; if (o.worktree) opts.worktree = o.worktree;
  let rows, ok;
  if (o.mode === 'check') { rows = check({ ...opts, engine: o.engine }); ok = rows.every((r) => r.ok); }
  else if (o.mode === 'payload') {
    const ref = fs.readFileSync(path.join(o.release || path.join(REPO_ROOT, 'release', 'v8'), 'index.html'), 'utf8');
    let text; try { text = fs.readFileSync(path.resolve(o.file), 'utf8'); } catch (e) { console.error('cannot read ' + o.file); return 2; }
    const r = comparePayload(text, ref); rows = r.rows; ok = r.ok;
  } else {
    const r = rebuild({ release: o.release, candidates: +o.candidates, rev: o.rev || null });
    ok = r.some((x) => x.match);
    rows = r.map((x) => ({ name: x.rev.slice(0, 7), ok: x.match, detail: `${x.subject} | build date ${x.buildDate} | ${x.bytes} B | ${x.match ? 'cmp-identical to release/v8/index.html' : 'differs in: ' + x.rows.map((y) => y.name).join(', ')}` }));
  }
  if (o.json) console.log(JSON.stringify({ mode: o.mode, ok, rows }, null, 1));
  else { for (const r of rows) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(22)} ${r.detail}`); console.log(ok ? `provenance ${o.mode}: OK` : `provenance ${o.mode}: FAILED`); }
  return ok ? 0 : 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e.message || e); process.exit(1); });
