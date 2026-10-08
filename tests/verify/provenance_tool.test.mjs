// VF-T01: tools/provenance.mjs (docs/eras/spec/VF.md 3.5): --check, --payload, --rebuild, CLI semantics, and every check failing on a seeded defect.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { criterion } from '../lib/criteria.mjs';
import { ROOT } from '../../tools/lib/paths.mjs';
import { BASELINE_SHA, BASELINE_WORKTREE, headOf } from '../../tools/golden/baseline.mjs';
import { EXPECT, comparePayload } from '../../tools/provenance.mjs';

const TOOL = path.join(ROOT, 'tools', 'provenance.mjs');
const tool = (...args) => spawnSync('node', [TOOL, ...args], { encoding: 'utf8', maxBuffer: 64 << 20 });
const json = (r) => JSON.parse(r.stdout);
const haveBaseline = headOf(BASELINE_WORKTREE) === BASELINE_SHA;
const tmp = [];
const mkTmp = (p) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), p)); tmp.push(d); return d; };
process.on('exit', () => { for (const d of tmp) fs.rmSync(d, { recursive: true, force: true }); });
/** A copy of release/v8 that a test may damage. */
function releaseCopy() { const d = mkTmp('vw-prov-'); for (const f of fs.readdirSync(path.join(ROOT, 'release/v8'))) fs.copyFileSync(path.join(ROOT, 'release/v8', f), path.join(d, f)); return d; }
const failedRows = (r) => json(r).rows.filter((x) => !x.ok).map((x) => x.name);

let bad = 0;
const c = criterion('VF-T01', { er: ['ER1', 'ER24'], owner: 'TOOLS-GOLDEN', tier: 'T-fast', negctl: 'tests/negctl/VF-T01.mjs', text: 'provenance.mjs --check / --payload / --rebuild verify the v8 baseline and fail on every seeded defect' });
function section(fn) { try { fn(); } catch (e) { bad++; if (!(e instanceof assert.AssertionError)) c.soft('uncaught: ' + String(e && e.message).slice(0, 100), false); console.error('FAIL VF-T01: ' + (e && e.message)); } }

if (!haveBaseline) c.skip('baseline worktree .cache/baseline/ancient-v8 not at ' + BASELINE_SHA.slice(0, 7));
else {
  // 1. the real offline check, one label per row (NC-VF-61 flips a byte of index.html and expects provenance/page_sha)
  section(() => {
    const r = tool('--check', '--json');
    const rows = json(r).rows;
    c.check('provenance/rows', rows.map((x) => x.name).join() === 'tag_sha,tag_points_at_sha,page_file,page_sha,page_bytes,manifest_file,manifest_count,manifest_bytes,files_json_keys,manifest_disk,payload,build_date,worktree_head,worktree_link_node_modules,worktree_link_cache_cdn,engine_unchanged', 'rows: ' + rows.map((x) => x.name).join());
    for (const row of rows) { if (row.name === 'engine_unchanged') continue; c.check('provenance/' + row.name, row.ok, row.detail); }
    c.check('provenance/exit_code', r.status === (rows.every((x) => x.ok) ? 0 : 1));
    const eng = rows.find((x) => x.name === 'engine_unchanged');
    c.check('provenance/engine_unchanged', eng.ok || tool('--check', '--engine=any').status === 0, eng.detail);
    // pinned numbers of VF 3.5
    c.check('provenance/constants', EXPECT.sha === BASELINE_SHA && EXPECT.pageBytes === 3106540 && EXPECT.files === 382 && EXPECT.filesBytes === 10979932 && EXPECT.payloadBytes === 4388731 && EXPECT.payloadShaPrefix === '812e57ae8125d420' && EXPECT.buildDate === '2026-10-08');
    const t = tool('--check');
    c.check('provenance/text_output', /^PASS  page_sha/m.test(t.stdout) && /provenance check: (OK|FAILED)/.test(t.stdout) && !/\d+(\.\d+)? ?(ms|s)\b/.test(t.stdout.replace(/\d{4}-\d{2}-\d{2}/g, '')));
    const a = tool('--check', '--json').stdout, b = tool('--check', '--json').stdout;
    c.check('provenance/deterministic', a === b);
  });

  // 2. seeded defects: each one fails exactly the row that guards it, with exit code 1
  section(() => {
    const flip = (file, at) => { const b = fs.readFileSync(file); b[at] = b[at] ^ 1; fs.writeFileSync(file, b); };
    let d = releaseCopy(); flip(path.join(d, 'index.html'), 1000000);
    let r = tool('--check', '--engine=any', '--release=' + d);
    c.check('defect/page_byte', r.status === 1 && failedRows(tool('--check', '--engine=any', '--json', '--release=' + d)).includes('page_sha'), 'a flipped byte of index.html must fail page_sha');
    d = releaseCopy(); fs.writeFileSync(path.join(d, 'PAGE.sha256'), fs.readFileSync(path.join(d, 'PAGE.sha256'), 'utf8').replace('3106540', '3106541'));
    c.check('defect/page_size_note', failedRows(tool('--check', '--engine=any', '--json', '--release=' + d)).join() === 'page_bytes');
    d = releaseCopy(); const man = JSON.parse(fs.readFileSync(path.join(d, 'files.manifest.json'), 'utf8')), fj = JSON.parse(fs.readFileSync(path.join(d, 'files.json'), 'utf8'));
    const k0 = Object.keys(man)[0];
    const dropped = { ...man }; delete dropped[k0]; const fjd = { ...fj }; delete fjd[k0];
    fs.writeFileSync(path.join(d, 'files.manifest.json'), JSON.stringify(dropped)); fs.writeFileSync(path.join(d, 'files.json'), JSON.stringify(fjd, null, 1));
    c.check('defect/manifest_entry_dropped', ['manifest_count', 'manifest_bytes'].every((n) => failedRows(tool('--check', '--engine=any', '--json', '--release=' + d)).includes(n)));
    d = releaseCopy(); const m2 = JSON.parse(fs.readFileSync(path.join(d, 'files.manifest.json'), 'utf8')); m2[k0].sha256 = '0'.repeat(64);
    fs.writeFileSync(path.join(d, 'files.manifest.json'), JSON.stringify(m2));
    c.check('defect/manifest_sha', failedRows(tool('--check', '--engine=any', '--json', '--release=' + d)).join() === 'manifest_disk');
    d = releaseCopy(); const m3 = JSON.parse(fs.readFileSync(path.join(d, 'files.manifest.json'), 'utf8')); m3[k0].bytes += 1;
    fs.writeFileSync(path.join(d, 'files.manifest.json'), JSON.stringify(m3));
    c.check('defect/manifest_bytes', failedRows(tool('--check', '--engine=any', '--json', '--release=' + d)).sort().join() === 'manifest_bytes,manifest_disk');
    d = releaseCopy(); fs.rmSync(path.join(d, 'PAGE.sha256'));
    c.check('defect/page_sha_file_missing', failedRows(tool('--check', '--engine=any', '--json', '--release=' + d)).includes('page_file'));
    d = releaseCopy(); const i = fs.readFileSync(path.join(d, 'index.html'), 'utf8'); fs.writeFileSync(path.join(d, 'index.html'), i.replace(/<script type="text\/plain" id="vw-pack">[^<]*<\/script>/, '<script>1</script>'));
    c.check('defect/no_pack', failedRows(tool('--check', '--engine=any', '--json', '--release=' + d)).includes('payload'));
    // the baseline worktree
    r = tool('--check', '--engine=any', '--json', '--worktree=' + ROOT);
    c.check('defect/worktree_not_baseline', headOf(ROOT) === BASELINE_SHA || failedRows(r).includes('worktree_head'));
    const empty = mkTmp('vw-prov-wt-');
    c.check('defect/worktree_empty', ['worktree_head', 'worktree_link_node_modules', 'worktree_link_cache_cdn', 'engine_unchanged'].every((n) => failedRows(tool('--check', '--json', '--worktree=' + empty)).includes(n)));
    // "no engine edit": a worktree-shaped copy of the baseline sources with ONE edited sim byte
    const wt = mkTmp('vw-prov-eng-'); fs.cpSync(path.join(BASELINE_WORKTREE, 'src'), path.join(wt, 'src'), { recursive: true });
    const w = path.join(wt, 'src/sim/abilities/heal_pulse.js'); fs.writeFileSync(w, fs.readFileSync(w, 'utf8') + '\n');
    const e1 = tool('--check', '--json', '--worktree=' + wt), e2 = tool('--check', '--json', '--engine=any', '--worktree=' + wt);
    c.check('defect/engine_edit', json(e1).rows.find((x) => x.name === 'engine_unchanged').ok === false && /simCore/.test(json(e1).rows.find((x) => x.name === 'engine_unchanged').detail) && json(e2).rows.find((x) => x.name === 'engine_unchanged').ok === true);
  });

  // 3. --payload: the hosted read-back is a skeleton + the fragment + closing tags
  section(() => {
    const frag = fs.readFileSync(path.join(ROOT, 'release/v8/index.html'), 'utf8');
    const page = '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0}</style></head><body>'.padEnd(EXPECT.skeletonChars, ' ') + frag + '\n</body></html>';
    const dir = mkTmp('vw-prov-rb-'), f = path.join(dir, 'readback.html');
    fs.writeFileSync(f, page);
    const ok = tool('--payload', f, '--json');
    c.check('payload/hosted_page_matches', ok.status === 0 && json(ok).ok && json(ok).rows.length >= 11 && json(ok).rows.every((x) => x.ok) && /offset 537/.test(json(ok).rows.at(-1).detail));
    c.check('payload/fragment_alone_matches', (fs.writeFileSync(f, frag), tool('--payload', f).status === 0));
    // one build date changed INSIDE the pack: payload and bundle differ, the other four data components and both loaders still match
    const m = /(<script type="text\/plain" id="vw-pack">)([^<]*)(<\/script>)/.exec(frag);
    const payload = zlib.inflateRawSync(Buffer.from(m[2], 'base64')).toString('utf8').replace('buildDate:"2026-10-08"', 'buildDate:"2026-10-09"');
    const forged = frag.replace(m[0], m[1] + zlib.deflateRawSync(Buffer.from(payload), { level: 9 }).toString('base64') + m[3]);
    fs.writeFileSync(f, forged);
    const r = tool('--payload', f, '--json');
    c.check('payload/forged_date_diagnosed', r.status === 1 && failedRows(r).sort().join() === 'build_date,bundle,fragment_embedded,payload', failedRows(r).join());
    // a changed <style>
    fs.writeFileSync(f, frag.replace('<style>', '<style>/*x*/'));
    c.check('payload/style_diagnosed', failedRows(tool('--payload', f, '--json')).sort().join() === 'fragment_embedded,style');
    // a changed loader script
    fs.writeFileSync(f, frag.replace('window.__vwReady=', 'window.__vwReady2='));
    c.check('payload/loader_diagnosed', failedRows(tool('--payload', f, '--json')).sort().join() === 'fragment_embedded,loader0');
    // a base64 character flipped in the pack: the read-back cannot be inflated, or no longer matches
    fs.writeFileSync(f, frag.replace(m[2].slice(5000, 5010), m[2].slice(5000, 5009) + (m[2][5009] === 'A' ? 'B' : 'A')));
    const rb = tool('--payload', f, '--json');
    c.check('payload/flipped_base64', rb.status === 1 && failedRows(rb).length >= 1);
    // a page with no pack at all, and a missing file
    fs.writeFileSync(f, '<html>nothing</html>');
    c.check('payload/no_pack', tool('--payload', f).status === 1);
    c.check('payload/missing_file', tool('--payload', path.join(dir, 'nope.html')).status === 2 && tool('--payload').status === 2);
    c.check('payload/compare_api', comparePayload(frag, frag).ok && !comparePayload(forged, frag).ok);
  });

  // 4. --rebuild: the baseline commit rebuilds byte for byte (with the date READ from the payload), a later commit does not
  section(() => {
    const ok = tool('--rebuild', '--rev=' + BASELINE_SHA, '--json');
    c.check('rebuild/baseline_cmp_identical', ok.status === 0 && json(ok).ok && /cmp-identical/.test(json(ok).rows[0].detail) && /build date 2026-10-08/.test(json(ok).rows[0].detail), ok.stderr);
    const later = tool('--rebuild', '--rev=5d61f0e', '--json');
    c.check('rebuild/other_commit_differs', later.status === 1 && /bundle/.test(json(later).rows[0].detail));
    c.check('rebuild/default_candidates', tool('--rebuild', '--candidates=2').status === 0);
  });

  // 5. CLI semantics
  section(() => {
    const h = tool('--help');
    c.check('cli/help', h.status === 0 && /--check/.test(h.stdout) && /--payload/.test(h.stdout) && /--rebuild/.test(h.stdout) && /exit: 0/.test(h.stdout));
    c.check('cli/usage_errors', tool().status === 2 && tool('--nope').status === 2 && tool('--check', '--engine=bogus').status === 2);
  });
}
if (c.failures.length) bad++;
c.done();
console.log(bad ? `provenance tool: ${bad} section(s) FAILED` : 'provenance tool: all checks passed');
process.exitCode = bad ? 1 : 0;
