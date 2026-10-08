// GATE-T06: build.mjs --out (private dist, nothing shared is written), determinism, the default build unchanged, report and budget, CSS typo, unknown option.
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { criterion } from '../lib/criteria.mjs';
import { checkBudget } from '../../tools/lib/size_budget.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MAIN = process.env.VW_MAIN_ROOT || ROOT;
const c = criterion('GATE-T06', { er: 'gate', owner: 'TOOLS-GATE', tier: 'T-fast', negctl: 'tests/negctl/GATE-T06.mjs', text: 'private build writes nothing shared and is byte-identical to the default build; report, budget, CSS typo and unknown option' });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vw-build-'));
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const run = (cwd, args, env = {}) => spawnSync('node', args, { cwd, encoding: 'utf8', env: { ...process.env, VW_BUILD_DATE: '2026-10-08', ...env }, timeout: 120000 });

// a scratch project: real src + tools, shared assets and node_modules linked (build reads assets, never writes them)
const P = path.join(tmp, 'proj');
fs.mkdirSync(P);
for (const d of ['src', 'tools']) fs.cpSync(path.join(ROOT, d), path.join(P, d), { recursive: true, filter: (s) => !s.includes('__pycache__') });
fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(P, 'package.json'));
fs.symlinkSync(path.join(MAIN, 'node_modules'), path.join(P, 'node_modules'));
fs.symlinkSync(path.join(MAIN, 'assets'), path.join(P, 'assets'));
const genFiles = () => fs.readdirSync(path.join(P, 'src/_generated')).sort().map((f) => [f, sha(path.join(P, 'src/_generated', f))]);

const genBefore = genFiles();

// ---- private build ----
const out1 = path.join(tmp, 'out1'), out2 = path.join(tmp, 'out2');
let r = run(P, ['tools/build.mjs', '--minify', `--out=${out1}`, '--report', '--budget', '--quiet']);
c.check('private_build_ok', r.status === 0, (r.stderr || r.stdout).slice(-400));
c.check('private_build_wrote_outputs', ['voxelwars.html', 'artifact/index.html', 'artifact/files.json', 'artifact/files.manifest.json', 'report/bytes.json', 'report/bytes.md', '_generated/registry.content.js', '_generated/registry.ui.js', '_generated/registry.optional.js'].every((f) => fs.existsSync(path.join(out1, f))));
c.check('private_build_leaves_shared_files_alone', !fs.existsSync(path.join(P, 'dist')) && JSON.stringify(genFiles()) === JSON.stringify(genBefore), 'no dist/ and the tracked src/_generated must be untouched');
r = run(P, ['tools/build.mjs', '--minify', `--out=${out2}`, '--report', '--quiet']);
const same = ['voxelwars.html', 'artifact/index.html', 'artifact/files.json', 'artifact/files.manifest.json', 'report/bytes.json'].filter((f) => sha(path.join(out1, f)) !== sha(path.join(out2, f)));
c.check('private_builds_deterministic', r.status === 0 && same.length === 0, 'differs: ' + same.join());
// the legacy default build (no --out) still writes dist/ and gives the same page
r = run(P, ['tools/build.mjs', '--minify', '--quiet']);
c.check('default_build_writes_dist', r.status === 0 && fs.existsSync(path.join(P, 'dist/artifact/index.html')) && fs.existsSync(path.join(P, 'dist/voxelwars.html')));
c.check('default_equals_private_page', sha(path.join(P, 'dist/artifact/index.html')) === sha(path.join(out1, 'artifact/index.html')) && sha(path.join(P, 'dist/voxelwars.html')) === sha(path.join(out1, 'voxelwars.html')), 'the private build must be byte-identical to the default one');
c.check('default_build_no_generated_churn', JSON.stringify(genFiles()) === JSON.stringify(genBefore));
c.check('files_manifest_matches_files_json', (() => { const f = JSON.parse(fs.readFileSync(path.join(out1, 'artifact/files.json'), 'utf8')), m = JSON.parse(fs.readFileSync(path.join(out1, 'artifact/files.manifest.json'), 'utf8')); const k = Object.keys(f); return k.length > 300 && k.join() === Object.keys(m).join() && k.slice(0, 5).every((p) => m[p].sha256 === sha(path.join(MAIN, f[p])) && m[p].bytes === fs.statSync(path.join(MAIN, f[p])).size); })());

// ---- report + budget on the real tree ----
const rep = JSON.parse(fs.readFileSync(path.join(out1, 'report/bytes.json'), 'utf8'));
c.check('report_fields', rep.minified === true && rep.fragmentBytes === fs.statSync(path.join(out1, 'artifact/index.html')).size && rep.publishedFiles === Object.keys(JSON.parse(fs.readFileSync(path.join(out1, 'artifact/files.json'), 'utf8'))).length && rep.families.length >= 20);
const sum = rep.families.reduce((a, f) => a + f.raw, 0);
c.check('families_cover_the_bundle', sum > 0.97 * rep.jsBytes && sum <= rep.jsBytes, `${sum} of ${rep.jsBytes}`);
c.check('real_build_within_cap', checkBudget(rep, null).status !== 'FAIL' && rep.fragmentBytes <= 5000000, `fragment ${rep.fragmentBytes} B`);
// budget enforcement end to end: a cap below the real size makes the build exit 3 (scratch copy of the threshold file only)
fs.writeFileSync(path.join(P, 'tools/lib/size_budget.mjs'), fs.readFileSync(path.join(P, 'tools/lib/size_budget.mjs'), 'utf8').replace('FRAGMENT_FAIL = 5000000', 'FRAGMENT_FAIL = 1000'));
r = run(P, ['tools/build.mjs', '--minify', `--out=${path.join(tmp, 'out3')}`, '--budget', '--quiet']);
c.check('budget_breach_exits_3', r.status === 3 && /BUDGET FAIL: minified fragment/.test(r.stderr), `status ${r.status} ${r.stderr.slice(-200)}`);

// ---- hardening ----
fs.rmSync(path.join(P, 'src/ui/kit.css'));
r = run(P, ['tools/build.mjs', `--out=${path.join(tmp, 'out4')}`, '--quiet']);
c.check('missing_css_fails_the_build', r.status === 1 && /CSS file\(s\) missing.*kit\.css/.test(r.stderr), r.stderr.slice(-200));
r = run(P, ['tools/build.mjs', '--no-sourcemap']);
c.check('unknown_option_exit_2', r.status === 2 && /unknown option --no-sourcemap/.test(r.stderr));
r = run(P, ['tools/build.mjs', '--help']);
c.check('help_exit_0', r.status === 0 && /--out=<dir>/.test(r.stdout) && /--budget/.test(r.stdout));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`GATE-T06 ok: ${c.assertions} assertions`);
