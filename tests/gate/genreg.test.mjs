// GATE-T09: gen-registry --check / --out (the "no diff" gate step `gen-check`, AR 3.11.1): stale or missing generated files are found, a check writes nothing,
// regeneration is idempotent (no mtime churn) and --out never touches the tracked tree.
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { criterion } from '../lib/criteria.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const c = criterion('GATE-T09', { er: 'ER2', owner: 'TOOLS-GATE', tier: 'T-fast', negctl: 'tests/negctl/GATE-T09.mjs', text: 'gen-registry --check finds drift, writes nothing; regeneration idempotent; --out leaves the tracked files alone' });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vw-genreg-'));
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const run = (cwd, args) => spawnSync('node', args, { cwd, encoding: 'utf8', timeout: 60000 });
const P = path.join(tmp, 'proj');
fs.mkdirSync(P);
fs.cpSync(path.join(ROOT, 'src'), path.join(P, 'src'), { recursive: true });
fs.mkdirSync(path.join(P, 'tools'));
fs.copyFileSync(path.join(ROOT, 'tools/gen-registry.mjs'), path.join(P, 'tools/gen-registry.mjs'));
const genFiles = () => fs.readdirSync(path.join(P, 'src/_generated')).sort().map((f) => [f, sha(path.join(P, 'src/_generated', f))]);

// ---- gen-registry --check ----
let r = run(P, ['tools/gen-registry.mjs', '--check']);
c.check('gen_check_clean', r.status === 0 && /up to date/.test(r.stdout), r.stderr);
const genBefore = genFiles();
const ui = path.join(P, 'src/_generated/registry.ui.js');
const uiText = fs.readFileSync(ui, 'utf8');
fs.writeFileSync(ui, uiText + '// drift\n');
r = run(P, ['tools/gen-registry.mjs', '--check']);
c.check('gen_check_detects_edited_file', r.status === 1 && /registry\.ui\.js/.test(r.stderr), r.stderr);
fs.writeFileSync(ui, uiText);
const extra = path.join(P, 'src/content/era_ancient/units/zz_new_unit_module.js');
fs.writeFileSync(extra, 'export const NEW = 1;\n');
r = run(P, ['tools/gen-registry.mjs', '--check']);
c.check('gen_check_detects_new_module', r.status === 1 && /registry\.content\.js/.test(r.stderr), r.stderr);
c.check('gen_check_writes_nothing', JSON.stringify(genFiles()) === JSON.stringify(genBefore), 'a check run must not touch the tracked generated files');
fs.rmSync(extra);
fs.rmSync(path.join(P, 'src/_generated/registry.optional.js'));
r = run(P, ['tools/gen-registry.mjs', '--check']);
c.check('gen_check_detects_missing_file', r.status === 1 && /registry\.optional\.js/.test(r.stderr));
r = run(P, ['tools/gen-registry.mjs']);   // regenerate
c.check('gen_write_restores', r.status === 0 && JSON.stringify(genFiles()) === JSON.stringify(genBefore));
const mt = fs.statSync(path.join(P, 'src/_generated/registry.ui.js')).mtimeMs;
await new Promise((res) => setTimeout(res, 30));
r = run(P, ['tools/gen-registry.mjs']);
c.check('gen_write_is_idempotent_no_mtime_churn', r.status === 0 && /no changes/.test(r.stdout) && fs.statSync(path.join(P, 'src/_generated/registry.ui.js')).mtimeMs === mt);
r = run(P, ['tools/gen-registry.mjs', '--check', '--out=x']);
c.check('gen_check_out_exclusive', r.status === 2);


// --out writes elsewhere with import paths computed from there, and leaves the tracked files alone
const alt = path.join(tmp, 'alt/_generated');
r = run(P, ['tools/gen-registry.mjs', `--out=${alt}`]);
c.check('out_writes_three_files', r.status === 0 && fs.readdirSync(alt).sort().join() === 'registry.content.js,registry.optional.js,registry.ui.js', r.stderr);
c.check('out_leaves_tracked_alone', JSON.stringify(genFiles()) === JSON.stringify(genBefore));
c.check('out_import_paths_resolve_from_there', (() => { const m = fs.readFileSync(path.join(alt, 'registry.ui.js'), 'utf8').match(/from '([^']+)'/); return !!m && fs.existsSync(path.resolve(alt, m[1])); })(), 'every generated import must resolve relative to the directory the file was written to');
r = run(P, ['tools/gen-registry.mjs', '--help']);
c.check('help_exit_0', r.status === 0 && /--check/.test(r.stdout));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`GATE-T09 ok: ${c.assertions} assertions`);
