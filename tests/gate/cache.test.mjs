// GATE-T03: the closure cache (tools/lib/gate_cache.mjs): a stored PASS is reused only for the identical closure; every kind of change inside the closure misses (NC-VF-56).
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { criterion } from '../lib/criteria.mjs';
import { treeHash } from '../../tools/lib/snapshot.mjs';
import { makeIndex, loadFacts, analyzeTest, cacheKey, cacheGet, cachePut, cachePrune, seededSample, makeExternalHasher } from '../../tools/lib/gate_cache.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const c = criterion('GATE-T03', { er: 'gate', owner: 'TOOLS-GATE', tier: 'T-fast', negctl: 'tests/negctl/GATE-T03.mjs', text: 'closure cache key covers imports, named data files and directories; uncacheable tests are never cached' });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vw-cache-'));
const w = (rel, text) => { const f = path.join(tmp, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
const ctx = { nodeVersion: 'v22.0.0', era: 'all', erasHelperSha: 'e0' };

// a scratch project: a test importing a lib that reads a named data file, a test that walks a directory, tests that must never be cached
w('src/core.js', 'export const core = 1;\n');
w('src/unrelated.js', 'export const unrelated = 1;\n');
w('tests/helpers/lib.mjs', "import { core } from '../../src/core.js';\nimport fs from 'fs';\nexport const data = JSON.parse(fs.readFileSync(new URL('../fixtures/data.json', import.meta.url), 'utf8'));\nexport { core };\n");
w('tests/fixtures/data.json', '{"a":1}\n');
w('tests/a.test.mjs', "import { core, data } from './helpers/lib.mjs';\nconsole.log(core, data);\n");
w('tests/walk.test.mjs', "import fs from 'fs';\nconst files = fs.readdirSync('docs');\nconsole.log(files.length);\n");
w('docs/one.md', 'one\n'); w('docs/two.md', 'two\n');
w('tests/dyn.test.mjs', "const m = await import(process.env.X || './helpers/lib.mjs');\nconsole.log(m);\n");
w('tests/nocache.test.mjs', "// @nocache\nconsole.log(1);\n");
w('tests/timing.serial.test.mjs', "console.log(1);\n");
w('tests/state.test.mjs', "import fs from 'fs';\nconsole.log(fs.readFileSync('.cache/campaign/m1.json','utf8'));\n");
w('tests/browser.test.mjs', "import { chromium } from 'playwright-core';\nconsole.log(chromium);\n");
w('tests/bareword.test.mjs', "import fs from 'fs';\nconsole.log(fs.readFileSync(new URL('./x/' + 'data.json', import.meta.url)));\n");
w('tests/unparseable.test.mjs', "let a = 1;\nlet a = 2;\n");

async function analyse(name) {
  const th = treeHash(tmp);
  const index = makeIndex(th.files);
  const facts = await loadFacts(tmp, th.files, path.join(tmp, '.gate/facts.json'));
  const text = fs.readFileSync(path.join(tmp, name), 'utf8');
  const a = analyzeTest(name, index, facts, text);
  return { a, index, key: cacheKey(a, index, ctx) };
}

const base = await analyse('tests/a.test.mjs');
c.check('closure_contains_import_chain', ['tests/a.test.mjs', 'tests/helpers/lib.mjs', 'src/core.js'].every((f) => base.a.files.includes(f)), base.a.files.join());
c.check('closure_contains_named_data', base.a.files.includes('tests/fixtures/data.json'), 'new URL(\'../fixtures/data.json\') must pull the data file into the closure');
c.check('closure_excludes_unrelated', !base.a.files.includes('src/unrelated.js') && !base.a.files.includes('docs/one.md'));
c.check('cacheable', base.a.cacheable && /^[0-9a-f]{64}$/.test(base.key), base.a.why.join());
c.check('key_stable', (await analyse('tests/a.test.mjs')).key === base.key);

// every kind of change inside the closure must miss
w('src/core.js', 'export const core = 2;\n');
const afterImport = await analyse('tests/a.test.mjs');
c.check('miss_on_closure_change', afterImport.key !== base.key, 'a changed transitive import must change the key');
w('src/core.js', 'export const core = 1;\n');
c.check('hit_after_revert', (await analyse('tests/a.test.mjs')).key === base.key);
w('tests/fixtures/data.json', '{"a":2}\n');
c.check('miss_on_named_data_change', (await analyse('tests/a.test.mjs')).key !== base.key);
w('tests/fixtures/data.json', '{"a":1}\n');
w('src/unrelated.js', 'export const unrelated = 2;\n');
c.check('hit_on_unrelated_change', (await analyse('tests/a.test.mjs')).key === base.key, 'a file outside the closure must not invalidate');
w('tests/a.test.mjs', "import { core, data } from './helpers/lib.mjs';\nconsole.log(core, data, 'edited');\n");
c.check('miss_on_test_edit', (await analyse('tests/a.test.mjs')).key !== base.key);
w('tests/a.test.mjs', "import { core, data } from './helpers/lib.mjs';\nconsole.log(core, data);\n");
c.check('key_depends_on_era_node_helper', cacheKey(base.a, base.index, { ...ctx, era: 'ancient' }) !== base.key && cacheKey(base.a, base.index, { ...ctx, nodeVersion: 'v23.0.0' }) !== base.key && cacheKey(base.a, base.index, { ...ctx, erasHelperSha: 'e1' }) !== base.key);

// a named directory is hashed: adding or editing any file in it misses
const walk = await analyse('tests/walk.test.mjs');
c.check('dir_literal_hashed', walk.a.cacheable && walk.a.files.includes('docs/one.md') && walk.a.files.includes('docs/two.md'), walk.a.why.join() + ' | ' + walk.a.files.join());
w('docs/three.md', 'three\n');
c.check('miss_on_file_added_to_named_dir', (await analyse('tests/walk.test.mjs')).key !== walk.key);
fs.rmSync(path.join(tmp, 'docs/three.md'));
w('docs/one.md', 'changed\n');
c.check('miss_on_file_edited_in_named_dir', (await analyse('tests/walk.test.mjs')).key !== walk.key);
w('docs/one.md', 'one\n');

// tests that must never be cached
for (const [name, why] of [['tests/dyn.test.mjs', /dynamic import/], ['tests/nocache.test.mjs', /@nocache/], ['tests/timing.serial.test.mjs', /serial/], ['tests/state.test.mjs', /\.cache\/campaign/], ['tests/unparseable.test.mjs', /does not parse/]]) {
  const r = await analyse(name);
  c.check('uncacheable:' + path.basename(name), !r.a.cacheable && r.key === null && r.a.why.some((x) => why.test(x)), JSON.stringify(r.a.why));
}
// read-only external inputs (cdn libs, cached fonts, the baseline worktree) are hashed into the key instead of disabling the cache
w('tests/ext.test.mjs', "import fs from 'fs';\nconsole.log(fs.readFileSync('.cache/cdn/three.min.js'), fs.readFileSync('.cache/fonts_uib/local.css'));\n");
const ext = await analyse('tests/ext.test.mjs');
c.check('externals_named_not_uncacheable', ext.a.cacheable && ext.a.externals.join() === 'cdn,fonts_uib', JSON.stringify([ext.a.cacheable, ext.a.externals, ext.a.why]));
c.check('externals_unavailable_means_no_key', ext.key === null, 'without the external input the key must not exist');
const mk = (h) => ({ ...ctx, externalHash: (n) => h[n] || null });
const ek1 = cacheKey(ext.a, ext.index, mk({ cdn: 'a', fonts_uib: 'b' })), ek2 = cacheKey(ext.a, ext.index, mk({ cdn: 'a', fonts_uib: 'c' })), ek3 = cacheKey(ext.a, ext.index, mk({ cdn: 'x', fonts_uib: 'b' }));
c.check('external_content_changes_key', ek1 && ek1 !== ek2 && ek1 !== ek3 && ek1 === cacheKey(ext.a, ext.index, mk({ cdn: 'a', fonts_uib: 'b' })));
{ const mainDir = path.join(tmp, 'main'); fs.mkdirSync(path.join(mainDir, '.cache/cdn'), { recursive: true }); fs.writeFileSync(path.join(mainDir, '.cache/cdn/three.min.js'), 'v1');
  const h1 = makeExternalHasher(mainDir)('cdn'); fs.writeFileSync(path.join(mainDir, '.cache/cdn/three.min.js'), 'v2'); const h2 = makeExternalHasher(mainDir)('cdn');
  c.check('hasher_follows_content', /^[0-9a-f]{64}$/.test(h1) && h1 !== h2 && makeExternalHasher(mainDir)('fonts') === null && makeExternalHasher(mainDir)('baseline') === null); }
const br = await analyse('tests/browser.test.mjs');
c.check('browser_flag_from_playwright_import', br.a.browser === true && analyse && !base.a.browser);

// store: round trip, PASS only, atomic, prune
const dir = path.join(tmp, 'cachedir');
c.check('miss_when_empty', cacheGet(dir, base.key) === null && cacheGet(dir, null) === null);
cachePut(dir, base.key, { status: 'PASS', test: 'tests/a.test.mjs', secs: 1.5, criteria: [{ id: 'X' }] });
const hit = cacheGet(dir, base.key);
c.check('roundtrip', hit && hit.secs === 1.5 && hit.criteria[0].id === 'X');
cachePut(dir, 'f'.repeat(64), { status: 'FAIL', test: 'x' });
c.check('fail_never_served', cacheGet(dir, 'f'.repeat(64)) === null);
fs.writeFileSync(path.join(dir, 'e'.repeat(64) + '.json'), '{not json');
c.check('corrupt_entry_is_miss', cacheGet(dir, 'e'.repeat(64)) === null);
fs.utimesSync(path.join(dir, 'e'.repeat(64) + '.json'), new Date(2020, 1, 1), new Date(2020, 1, 1));
c.check('prune_old', cachePrune(dir, { maxAgeDays: 21 }) === 1 && cacheGet(dir, base.key) !== null);

// verify-cache sampling: deterministic by seed, at least one, a subset
const items = Array.from({ length: 40 }, (_, i) => 't' + i);
const s1 = seededSample(items, 0.1, 'abcdef0123'), s2 = seededSample(items, 0.1, 'abcdef0123'), s3 = seededSample(items, 0.1, '0123456789');
c.check('sample_deterministic_subset', s1.join() === s2.join() && s1.length === 4 && s1.every((x) => items.includes(x)) && new Set(s1).size === 4);
c.check('sample_seed_matters', s1.join() !== s3.join());
c.check('sample_min_one', seededSample(['a', 'b'], 0.1, 'ff').length === 1 && seededSample([], 0.1, 'ff').length === 0);

// the real tree: most tests are cacheable, the serial/browser/dynamic ones are not, and a closure edit changes the key of a real test
{
  const th = treeHash(ROOT);
  const index = makeIndex(th.files);
  const facts = await loadFacts(ROOT, th.files, path.join(tmp, '.gate/facts-real.json'));
  const tests = th.files.map((f) => f.path).filter((p) => /^tests\/.*\.test\.mjs$/.test(p) && !p.startsWith('tests/gate/'));
  const an = tests.map((t) => analyzeTest(t, index, facts, fs.readFileSync(path.join(ROOT, t), 'utf8')));
  const ok = an.filter((a) => a.cacheable).length;
  c.check('real_tree_mostly_cacheable', ok >= 50 && ok < an.length, `${ok}/${an.length} cacheable`);
  const serial = an.filter((a) => /@serial/.test(fs.readFileSync(path.join(ROOT, a.test), 'utf8')));
  c.check('real_serial_tests_not_cached', serial.length >= 1 && serial.every((a) => !a.cacheable));
  const pick = an.find((a) => a.cacheable && a.test.startsWith('tests/sim/') && a.files.some((f) => f.startsWith('src/sim/')));
  const k0 = cacheKey(pick, index, ctx);
  const f = pick.files.find((x) => x.startsWith('src/sim/'));
  const index2 = makeIndex(th.files.map((x) => (x.path === f ? { ...x, sha: 'changed' + x.sha } : x)));
  c.check('real_test_misses_when_its_closure_changes', k0 !== null && cacheKey(pick, index2, ctx) !== k0, pick.test + ' / ' + f);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`GATE-T03 ok: ${c.assertions} assertions`);
