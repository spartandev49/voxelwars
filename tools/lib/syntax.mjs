// In-process syntax step (VF 3.8.4; owner TOOLS-GATE): esbuild.transform over src, tools and tests, replacing 315 `node --check` spawns (8.9 s) by one pass (~1 s).
// `checkSource` is the single parse point: the negative control (syntax-nc) feeds the six fixtures of tests/fixtures/syntax_bad through the SAME function and fails if any is accepted.
import fs from 'fs';
import path from 'path';
import { transform } from 'esbuild';
import { ROOT, rel } from './paths.mjs';

export const SYNTAX_DIRS = ['src', 'tools', 'tests'];
const SKIP = new Set(['node_modules', '.cache', '.git', '__pycache__', 'syntax_bad']);

/** Parse one source text as an ES module. Returns null when it parses, else the first error as "line:col message". */
export async function checkSource(text, file = 'input.js') {
  try { await transform(text, { loader: 'js', format: 'esm', sourcefile: file, logLevel: 'silent' }); return null; }
  catch (e) { const m = (e.errors && e.errors[0]) || {}; return `${m.location ? m.location.line + ':' + m.location.column + ' ' : ''}${m.text || e.message}`; }
}

export function listSyntaxFiles(root = ROOT, dirs = SYNTAX_DIRS) {
  const out = [];
  for (const d of dirs) {
    const top = path.join(root, d);
    if (!fs.existsSync(top)) continue;
    (function walk(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP.has(e.name)) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p); else if (/\.(js|mjs)$/.test(e.name)) out.push(p);
      }
    })(top);
  }
  return out.sort();
}

/** The real step. @returns {{files:number, bad:{file:string,error:string}[], ms:number}} */
export async function syntaxStep(root = ROOT, check = checkSource, dirs = SYNTAX_DIRS) {
  const t0 = Date.now();
  const files = listSyntaxFiles(root, dirs);
  const bad = [];
  const BATCH = 32;
  for (let i = 0; i < files.length; i += BATCH) {
    await Promise.all(files.slice(i, i + BATCH).map(async (f) => {
      const err = await check(fs.readFileSync(f, 'utf8'), rel(f, root));
      if (err) bad.push({ file: rel(f, root), error: err });
    }));
  }
  bad.sort((a, b) => (a.file < b.file ? -1 : 1));
  return { files: files.length, bad, ms: Date.now() - t0 };
}

/** The negative control: every fixture MUST be rejected. @returns {{fixtures:number, accepted:string[], rejected:{file:string,error:string}[]}} */
export async function syntaxNegativeControl(dir = path.join(ROOT, 'tests/fixtures/syntax_bad'), check = checkSource) {
  const names = fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => /\.(js|mjs)$/.test(n)).sort() : [];
  const accepted = [], rejected = [];
  for (const n of names) {
    const err = await check(fs.readFileSync(path.join(dir, n), 'utf8'), n);
    if (err) rejected.push({ file: n, error: err }); else accepted.push(n);
  }
  return { fixtures: names.length, accepted, rejected };
}
export const REQUIRED_FIXTURES = ['await_non_async.js', 'bad_regex_flag.js', 'dup_export.js', 'dup_let.js', 'legacy_octal.js', 'unclosed_brace.js'];

// CLI: node tools/lib/syntax.mjs [--nc]
if (import.meta.url === 'file://' + process.argv[1]) {
  if (process.argv.includes('--help')) { console.log('syntax: node tools/lib/syntax.mjs [--nc]   (--nc runs only the negative control). Exit 1 on any syntax error / accepted fixture.'); process.exit(0); }
  const nc = await syntaxNegativeControl();
  const ncBad = nc.accepted.length > 0 || REQUIRED_FIXTURES.some((n) => !nc.rejected.some((r) => r.file === n));
  console.log(`syntax-nc ${ncBad ? 'FAIL' : 'ok'}: ${nc.rejected.length}/${nc.fixtures} fixtures rejected${nc.accepted.length ? ', ACCEPTED: ' + nc.accepted.join(' ') : ''}`);
  let bad = ncBad;
  if (!process.argv.includes('--nc')) { const r = await syntaxStep(); console.log(`syntax ${r.bad.length ? 'FAIL' : 'ok'}: ${r.files} files in ${r.ms} ms`); for (const b of r.bad.slice(0, 20)) console.log(`  ${b.file}: ${b.error}`); if (r.bad.length) bad = true; }
  process.exit(bad ? 1 : 0);
}
