// Tests of the golden-lab libraries (TOOLS-GOLDEN): fingerprints, statwalk, records and comparators, and the build manifest.
// Criteria registered here (each has tests/negctl/<id>.mjs):
//   VF-L01  fingerprints (AR 3.7.6)            tools/lib/fingerprint.mjs
//   VF-L02  statwalk witness (VF 3.6.1)        tools/lib/statwalk.mjs, statwalk_core.mjs, tests/golden/v8_fields.json
//   VF-T02  record states and policy (VF 3.7)  tools/lib/records.mjs   (VF names tests/verify/records_policy.test.mjs; it lives here by COORD's task)
//   AR-T23  comparator classes (AR 3.7.5)      tools/lib/records.mjs   (synthetic part; AR names tests/arch/records.test.mjs)
//   VF-L03  files.manifest.json emission       tools/build.mjs
//   VF-L04  the build reproduces the v8 page   tools/build.mjs on the baseline sources (fragment, files.json, manifest byte-identical to release/v8)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { criterion } from '../lib/criteria.mjs';
import { ROOT, MAIN_ROOT } from '../../tools/lib/paths.mjs';
import * as FP from '../../tools/lib/fingerprint.mjs';
import * as REC from '../../tools/lib/records.mjs';
import * as SW from '../../tools/lib/statwalk.mjs';
import { createStatwalk, checkSpec } from '../../tools/lib/statwalk_core.mjs';
import { BASELINE_SHA, BASELINE_WORKTREE, loadBaseline, headOf } from '../../tools/golden/baseline.mjs';
import { legacyStateHash } from './legacy_hash.mjs';

const T0 = Date.now();
let failedSections = 0;
/** Run one section; a failed c.check / c.assert already recorded its label, anything else is recorded as `uncaught`. */
function section(c, fn) {
  try { fn(); } catch (e) {
    failedSections++;
    if (!(e instanceof assert.AssertionError)) c.soft('uncaught: ' + String(e && e.message).slice(0, 120), false);
    console.error(`FAIL ${c.id}: ${e && e.message}`);
  }
}
async function sectionAsync(c, fn) {
  try { await fn(); } catch (e) {
    failedSections++;
    if (!(e instanceof assert.AssertionError)) c.soft('uncaught: ' + String(e && e.message).slice(0, 120), false);
    console.error(`FAIL ${c.id}: ${e && e.message}`);
  }
}
/** Close a criterion: report its failed labels (soft failures print nothing by themselves) and flush its line. */
function finish(c) {
  if (c.failures.length) { failedSections++; console.error(`RED ${c.id}: ${c.failures.join(', ')}`); }
  else console.log(`ok  ${c.id}: ${c.assertions} assertions`);
  c.done();
}
const tmpDirs = [];
const mkTmp = (p) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), p)); tmpDirs.push(d); return d; };
process.on('exit', () => { for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true }); });
function writeTree(root, files) { for (const [f, text] of Object.entries(files)) { const a = path.join(root, f); fs.mkdirSync(path.dirname(a), { recursive: true }); fs.writeFileSync(a, text); } return root; }
const same = (a, b) => REC.canonicalJSON(a) === REC.canonicalJSON(b);          // key-order independent deep equality
const haveBaseline = headOf(BASELINE_WORKTREE) === BASELINE_SHA;

// =====================================================================================================================================
// VF-L01 fingerprints
// =====================================================================================================================================
const SYN = {
  'src/sim/world.js': 'w', 'src/sim/abilities/heal.js': 'h', 'src/sim/abilities/deep/x.js': 'x',
  'src/world/gen.js': 'g', 'src/core/rng.js': 'r',
  'src/content/registry.js': 'reg', 'src/content/eras.config.js': 'cfg', 'src/content/stat_helpers.js': 'sth', 'src/content/shared/a.js': 'sa', 'src/content/other.js': 'o',
  'src/_generated/registry.eras.js': 'ge', 'src/_generated/registry.ui.js': 'gu',
  'src/anim/clips.js': 'c', 'src/anim/dsl.js': 'd', 'src/anim/boot.js': 'b', 'src/anim/kin.js': 'k', 'src/anim/gait.js': 'ga', 'src/anim/ual.js': 'u', 'src/anim/ual_adopt.js': 'ua',
  'src/anim/analysis.js': 'an', 'src/anim/animator.js': 'animator',
  'src/anim/clips/hum1_loco.js': 'hl', 'src/anim/clips/hum1_melee.js': 'hm', 'src/anim/clips/poses.js': 'po', 'src/anim/clips/index.js': 'ix', 'src/anim/clips/other.js': 'oth',
  'src/anim/clips/quad1.js': 'q', 'src/anim/clips/elephant1.js': 'e', 'src/anim/clips/siege.js': 's', 'src/anim/clips/chicken1.js': 'ch',
  'assets/anim/humanoid_clips.json': '{}', 'assets/anim/other.json': '{}',
  'src/voxel/mesher.js': 'mesh', 'src/voxel/deep/z.js': 'z',
  'src/render/engine.js': 'eng', 'src/render/sub/fx.js': 'fx',
  'src/content/era_ancient/blueprints.js': 'bp', 'src/content/era_ancient/parts/_kit.js': 'pk', 'src/content/era_ancient/parts/_base.js': 'pb', 'src/content/era_ancient/parts/_registry.js': 'pr',
  'src/content/era_ancient/parts/helm.js': 'helm', 'src/content/era_ancient/beasts/common.js': 'bc', 'src/content/era_ancient/beasts/quad1.js': 'bq', 'src/content/era_ancient/beasts/other.js': 'bo',
  'src/content/era_ancient/props/models/kit.js': 'mk', 'src/content/era_ancient/props/models/wall.js': 'mw',
  'src/content/era_ancient/stats.js': 'st', 'src/content/era_ancient/arenas.js': 'ar', 'src/content/era_ancient/campaign.js': 'ca', 'src/content/era_ancient/campaign_run.js': 'cr', 'src/content/era_ancient/campaign_text.js': 'ct',
  'src/content/era_ancient/puzzles.js': 'pz', 'src/content/era_ancient/puzzles_extra.js': 'pze', 'src/content/era_ancient/puzzle_solutions.js': 'pzs', 'src/content/era_ancient/survival.js': 'sv', 'src/content/era_ancient/daily.js': 'da',
  'src/content/era_ancient/sim_text.js': 'simt', 'src/content/era_ancient/lesson_text.js': 'lt', 'src/content/era_ancient/wave_names.js': 'wn', 'src/content/era_ancient/props/catalog.js': 'pc',
  'src/content/era_ancient/data.js': 'data', 'src/content/era_ancient/manifest.js': 'man', 'src/content/era_ancient/pack.js': 'pack',
  'src/content/era_ancient/humor/a.js': 'hu', 'src/content/era_ancient/units/u.js': 'un', 'src/content/era_ancient/custom.js': 'cu', 'src/content/era_ancient/content.js': 'co',
  'src/ui/screens.js': 'ui', 'docs/x.md': 'doc',
};
const EXP_SIM = ['assets/anim/humanoid_clips.json', 'src/_generated/registry.eras.js', 'src/anim/boot.js', 'src/anim/clips.js', 'src/anim/clips/hum1_loco.js', 'src/anim/clips/hum1_melee.js', 'src/anim/clips/index.js', 'src/anim/clips/poses.js', 'src/anim/dsl.js', 'src/anim/gait.js', 'src/anim/kin.js', 'src/anim/ual.js', 'src/anim/ual_adopt.js', 'src/content/eras.config.js', 'src/content/registry.js', 'src/content/shared/a.js', 'src/content/stat_helpers.js', 'src/core/rng.js', 'src/sim/abilities/deep/x.js', 'src/sim/abilities/heal.js', 'src/sim/world.js', 'src/world/gen.js'];
const EXP_SHARED = ['src/anim/animator.js', 'src/content/era_ancient/beasts/common.js', 'src/content/era_ancient/beasts/quad1.js', 'src/content/era_ancient/blueprints.js', 'src/content/era_ancient/parts/_base.js', 'src/content/era_ancient/parts/_kit.js', 'src/content/era_ancient/parts/_registry.js', 'src/content/era_ancient/props/models/kit.js', 'src/voxel/deep/z.js', 'src/voxel/mesher.js'];
const EXP_RENDER = ['src/render/engine.js', 'src/render/sub/fx.js'];
const EXP_ANCIENT = ['src/anim/clips/chicken1.js', 'src/anim/clips/elephant1.js', 'src/anim/clips/quad1.js', 'src/anim/clips/siege.js', 'src/content/era_ancient/arenas.js', 'src/content/era_ancient/campaign.js', 'src/content/era_ancient/campaign_run.js', 'src/content/era_ancient/campaign_text.js', 'src/content/era_ancient/daily.js', 'src/content/era_ancient/data.js', 'src/content/era_ancient/lesson_text.js', 'src/content/era_ancient/manifest.js', 'src/content/era_ancient/pack.js', 'src/content/era_ancient/props/catalog.js', 'src/content/era_ancient/puzzles.js', 'src/content/era_ancient/puzzles_extra.js', 'src/content/era_ancient/sim_text.js', 'src/content/era_ancient/stats.js', 'src/content/era_ancient/survival.js', 'src/content/era_ancient/wave_names.js'];
const all4 = (root) => ({ sim: FP.engineHash(root).simCore, shared: FP.engineHash(root).shared, render: FP.renderHash(root), era: FP.eraHash('ancient', root) });
const which = (a, b) => Object.keys(a).filter((k) => a[k] !== b[k]).sort();

{
  const c = criterion('VF-L01', { er: ['ER1'], owner: 'TOOLS-GOLDEN', tier: 'T-fast', negctl: 'tests/negctl/VF-L01.mjs', text: 'fingerprints: recursive file lists, content addressed, sensitive exactly where AR 3.7.6 says' });
  const root = writeTree(mkTmp('vw-fp-'), SYN);
  section(c, () => {
    c.soft('simcore_list', same(FP.describe('simCore', root).files, EXP_SIM));
    c.soft('shared_list', same(FP.describe('shared', root).files, EXP_SHARED));
    c.soft('render_list', same(FP.describe('render', root).files, EXP_RENDER));
    c.soft('ancient_list', same(FP.describe('era', root, 'ancient').files, EXP_ANCIENT));
    const nothing = FP.describe('simCore', mkTmp('vw-fp-empty-'));
    c.soft('unmatched_reported', same(FP.describe('simCore', root).unmatched, []) && nothing.files.length === 0 && nothing.unmatched.length > 10 && /^[0-9a-f]{64}$/.test(FP.simCoreHash(mkTmp('vw-fp-empty2-'))));
    // sensitivity matrix: a one-byte change moves exactly the hashes AR 3.7.6 assigns to that file
    const base = all4(root);
    const rows = [
      ['src/sim/abilities/deep/x.js', ['sim']], ['src/sim/world.js', ['sim']], ['src/content/shared/a.js', ['sim']], ['src/anim/clips/hum1_loco.js', ['sim']], ['assets/anim/humanoid_clips.json', ['sim']],
      ['src/_generated/registry.eras.js', ['sim']], ['src/anim/clips/quad1.js', ['era']], ['src/anim/animator.js', ['shared']], ['src/voxel/deep/z.js', ['shared']],
      ['src/content/era_ancient/parts/_kit.js', ['shared']], ['src/content/era_ancient/props/models/kit.js', ['shared']], ['src/render/sub/fx.js', ['render']],
      ['src/content/era_ancient/stats.js', ['era']], ['src/content/era_ancient/campaign_text.js', ['era']], ['src/content/era_ancient/puzzles_extra.js', ['era']], ['src/content/era_ancient/sim_text.js', ['era']],
      ['src/content/era_ancient/props/catalog.js', ['era']],
      // presentation-only and out-of-scope files move nothing (G4 / G8 / G10 cover them)
      ['src/content/era_ancient/humor/a.js', []], ['src/content/era_ancient/units/u.js', []], ['src/content/era_ancient/parts/helm.js', []], ['src/content/era_ancient/beasts/other.js', []],
      ['src/content/era_ancient/props/models/wall.js', []], ['src/ui/screens.js', []], ['src/anim/analysis.js', []], ['src/anim/clips/other.js', []], ['assets/anim/other.json', []], ['src/_generated/registry.ui.js', []], ['docs/x.md', []],
    ];
    for (const [f, want] of rows) {
      const abs = path.join(root, f), old = fs.readFileSync(abs, 'utf8');
      fs.writeFileSync(abs, old + '!');
      const got = which(base, all4(root));
      fs.writeFileSync(abs, old);
      c.soft('sensitivity/' + f, same(got, want.slice().sort()));
    }
    c.soft('restored', same(all4(root), base));
    // new file / removal / rename inside a recursive tree
    const add = path.join(root, 'src/sim/abilities/deep/new.js');
    fs.writeFileSync(add, 'n'); c.soft('sensitivity/add_file', same(which(base, all4(root)), ['sim'])); fs.rmSync(add); c.soft('sensitivity/remove_file', same(all4(root), base));
    fs.renameSync(path.join(root, 'src/sim/world.js'), path.join(root, 'src/sim/world2.js')); c.soft('path_in_hash', same(which(base, all4(root)), ['sim'])); fs.renameSync(path.join(root, 'src/sim/world2.js'), path.join(root, 'src/sim/world.js'));
    // content addressed: touching mtime changes nothing, a copy elsewhere hashes the same
    const t = new Date(Date.now() + 86400000); fs.utimesSync(path.join(root, 'src/sim/world.js'), t, t);
    c.soft('mtime_inert', same(all4(root), base));
    const root2 = writeTree(mkTmp('vw-fp2-'), SYN);
    c.soft('location_independent', same(all4(root2), base));
    c.soft('determinism', same(all4(root), all4(root)) && /^[0-9a-f]{64}$/.test(base.sim + '') && Object.values(base).every((h) => /^[0-9a-f]{64}$/.test(h)));
    // glob engine
    c.soft('glob/braces', same(FP.expandBraces('a/{b,c{d,e}}/f'), ['a/b/f', 'a/cd/f', 'a/ce/f']));
    c.soft('glob/star_vs_dstar', FP.globToRegExp('src/sim/*').test('src/sim/a.js') && !FP.globToRegExp('src/sim/*').test('src/sim/abilities/a.js') && FP.globToRegExp('src/sim/**').test('src/sim/abilities/a.js') && FP.globToRegExp('**/*_text.js').test('a/b/x_text.js') && FP.globToRegExp('**/*_text.js').test('x_text.js'));
  });
  // the generic era rule (Medieval/Modern/Sci-Fi): everything except the presentation subtrees and *_text.js, plus the era's clip dir, manifest rigs and abilities
  section(c, () => {
    const files = {
      'src/content/era_medieval/stats.js': 's', 'src/content/era_medieval/data.js': 'd', 'src/content/era_medieval/sub/deep.js': 'dd', 'src/content/era_medieval/props/catalog.js': 'pc',
      'src/content/era_medieval/manifest.js': "export default { id: 'medieval', rigs: ['quad1x'], abilities: ['aura', 'net.js'], phase: 'building' };",
      'src/content/era_medieval/humor/h.js': 'h', 'src/content/era_medieval/units/u.js': 'u', 'src/content/era_medieval/parts/p.js': 'p', 'src/content/era_medieval/beasts/b.js': 'b', 'src/content/era_medieval/props/models/m.js': 'm',
      'src/content/era_medieval/sim_text.js': 'st', 'src/content/era_medieval/lesson_text.js': 'lt', 'src/content/era_medieval/campaign_text.js': 'ct', 'src/content/era_medieval/unit_text.js': 'ut', 'src/content/era_medieval/sub/foo_text.js': 'ft',
      'src/anim/clips/medieval/c.js': 'c', 'src/anim/clips/quad1x.js': 'q', 'src/anim/clips/other.js': 'o', 'src/sim/abilities/aura.js': 'a', 'src/sim/abilities/net.js': 'n',
    };
    const r = writeTree(mkTmp('vw-fpm-'), files);
    const got = FP.describe('era', r, 'medieval').files;
    const want = ['src/anim/clips/medieval/c.js', 'src/anim/clips/quad1x.js', 'src/content/era_medieval/campaign_text.js', 'src/content/era_medieval/data.js', 'src/content/era_medieval/lesson_text.js', 'src/content/era_medieval/manifest.js', 'src/content/era_medieval/props/catalog.js', 'src/content/era_medieval/sim_text.js', 'src/content/era_medieval/stats.js', 'src/content/era_medieval/sub/deep.js', 'src/sim/abilities/aura.js', 'src/sim/abilities/net.js'];
    c.soft('generic_era_list', same(got, want));
    c.soft('manifest_list_parser', same(FP.manifestList("rigs: [ 'a', \"b\" ], abilities:['c']", 'rigs'), ['a', 'b']) && same(FP.manifestList('x', 'rigs'), []));
    const h0 = FP.eraHash('medieval', r), edit = (f, fn) => { const a = path.join(r, f), o = fs.readFileSync(a, 'utf8'); fs.writeFileSync(a, o + '!'); const h = FP.eraHash('medieval', r); fs.writeFileSync(a, o); fn(h); };
    edit('src/content/era_medieval/stats.js', (h) => c.soft('generic_era_sensitive', h !== h0));
    edit('src/content/era_medieval/humor/h.js', (h) => c.soft('generic_era_humor_inert', h === h0));
    edit('src/content/era_medieval/unit_text.js', (h) => c.soft('generic_era_text_inert', h === h0));
    edit('src/anim/clips/medieval/c.js', (h) => c.soft('generic_era_clip_dir', h !== h0));
    edit('src/anim/clips/quad1x.js', (h) => c.soft('generic_era_manifest_rig', h !== h0));
    c.soft('era_id_validated', (() => { try { FP.describe('era', r, '../etc'); return false; } catch { return true; } })());
  });
  // the definition applied to the real baseline (recursion is the point of the new fingerprint)
  if (!haveBaseline) c.skip('baseline worktree .cache/baseline/ancient-v8 not at ' + BASELINE_SHA.slice(0, 7));
  else section(c, () => {
    const sim = FP.describe('simCore', BASELINE_WORKTREE).files;
    const onDisk = fs.readdirSync(path.join(BASELINE_WORKTREE, 'src/sim/abilities')).length;
    const inList = sim.filter((f) => f.startsWith('src/sim/abilities/')).length;
    c.soft('recursion', inList === onDisk && onDisk === 30 && ['heal_pulse', 'poison', 'bribe', 'dash'].every((n) => sim.includes(`src/sim/abilities/${n}.js`)));
    const pin = REC.readRecord(path.join(ROOT, 'tests/golden/fp_ancient_v8.json'));
    const lists = { simCore: sim, shared: FP.describe('shared', BASELINE_WORKTREE).files, render: FP.describe('render', BASELINE_WORKTREE).files, 'era:ancient': FP.describe('era', BASELINE_WORKTREE, 'ancient').files };
    c.soft('pin_lists', same(lists, pin.data.lists));
    const fpb = FP.fingerprint(BASELINE_WORKTREE);
    c.soft('pin_hashes', fpb.engineHash.simCore === pin.data.hashes.simCore && fpb.engineHash.shared === pin.data.hashes.shared && fpb.renderHash === pin.data.hashes.render && fpb.eraHash.ancient === pin.data.hashes['era:ancient'] && same(fpb.engineHash, pin.engineHash));
    // the CLI prints the same numbers as the API
    const cli = spawnSync('node', [path.join(ROOT, 'tools/lib/fingerprint.mjs'), '--root=' + BASELINE_WORKTREE, '--json'], { encoding: 'utf8' });
    c.soft('cli_json', cli.status === 0 && same(JSON.parse(cli.stdout), fpb));
  });
  section(c, () => {
    const bad = spawnSync('node', [path.join(ROOT, 'tools/lib/fingerprint.mjs'), '--nope'], { encoding: 'utf8' });
    const help = spawnSync('node', [path.join(ROOT, 'tools/lib/fingerprint.mjs'), '--help'], { encoding: 'utf8' });
    c.soft('cli_usage', bad.status === 2 && help.status === 0 && /usage:/.test(help.stdout));
  });
  finish(c);
}

// =====================================================================================================================================
// VF-L02 statwalk
// =====================================================================================================================================
{
  const c = criterion('VF-L02', { er: ['ER1'], owner: 'TOOLS-GOLDEN', tier: 'T-fast', negctl: 'tests/negctl/VF-L02.mjs', text: 'statwalk: a frozen-field witness hash, deterministic, inert to later fields, stricter than the legacy hash' });
  if (!haveBaseline) c.skip('baseline worktree missing');
  else await sectionAsync(c, async () => {
    const B = await loadBaseline({ regime: 'baked' });
    const rec = REC.readRecord(path.join(ROOT, 'tests/golden/v8_fields.json'));
    c.soft('record_kind', rec.kind === 'v8_fields' && rec.tag === 'ancient-v8' && rec.sha === BASELINE_SHA && rec.engine === 'node' && rec.regime === 'baked');
    const spec = SW.loadSpec();
    c.soft('spec_checked', same(checkSpec(spec).walk, { prop: ['hp', 'dead'] }));
    const bads = [(s) => { delete s.walk; }, (s) => { s.unit = []; }, (s) => { s.nested = null; }, (s) => { s.walk.prop = ['nope']; }, (s) => { s.projectile = [1]; }];
    c.soft('spec_rejects_malformed', bads.every((m) => { const s = JSON.parse(JSON.stringify(spec)); m(s); try { checkSpec(s); return false; } catch { return true; } }));
    c.soft('core_is_pure', !/^\s*import\s/m.test(fs.readFileSync(path.join(ROOT, 'tools/lib/statwalk_core.mjs'), 'utf8')));
    // the frozen lists ARE the baseline's own fields
    const { Unit } = await B.imp('src/sim/unit.js'), { Projectile } = await B.imp('src/sim/projectiles.js');
    const def = B.H.DEFS.hoplite;
    c.soft('fields_unit', same(Object.keys(new Unit(def, 0, 1, 2, 0, 7)), spec.unit));
    c.soft('fields_projectile', same(Object.keys(new Projectile()), spec.projectile));
    const mk = (seed = 1) => B.H.buildWorld({ arena: 'marathon', seed, a: { groups: [{ defId: 'hoplite', n: 18 }, { defId: 'cretan_archer', n: 10 }, { defId: 'ballista', n: 1 }] }, b: { groups: [{ defId: 'hoplite', n: 18 }, { defId: 'peltast', n: 10 }, { defId: 'catapult', n: 1 }] } });
    const w1 = mk(1), w2 = mk(1), w3 = mk(2);
    const h1 = [], h2 = [], h3 = [];
    for (let i = 1; i <= 600; i++) {
      w1.tick(); w2.tick(); w3.tick();
      if (i % 150 === 0) {
        h1.push(SW.statwalk(w1)); h2.push(SW.statwalk(w2)); h3.push(SW.statwalk(w3));
        c.soft('legacy_equals_stateHash@' + i, legacyStateHash(w1) === w1.stateHash() && legacyStateHash(w3) === w3.stateHash());
      }
    }
    c.soft('deterministic', same(h1, h2) && h1.length === 4 && h1.every((h) => Number.isInteger(h) && h >= 0 && h < 2 ** 32));
    c.soft('seed_sensitive', h1[3] !== h3[3] && new Set(h1).size === h1.length);
    const first = REC.firstDivergence(h1, h3);
    c.soft('chain_diverges_early', first !== null && first.index <= 1);
    c.soft('fields_effect', (() => { const e = w1.addEffect('fire', 1, 2, 3, 4, 5, 0, null); const ok = same(Object.keys(e), spec.effect); w1.effects.pop(); return ok; })());
    c.soft('fields_prop', same(Object.keys(w1.props[0]), spec.prop));
    c.soft('covers_legacy_inputs', ['id', 'x', 'z', 'hp', 'team'].every((f) => spec.unit.includes(f)));
    const d = SW.statwalkDetail(w1);
    c.soft('detail', d.hash === h1[3] && d.units === w1.units.length && d.nan === 0 && d.inf > 0 && d.props === w1.props.length);
    // inert to fields the frozen lists do not name (later modules add fields)
    const before = SW.statwalk(w1), u0 = w1.units[0];
    u0.brandNewField = 12345; u0.anim.extraKey = 7; u0.moduleState = { a: 1 };
    if (w1.props.length) w1.props[0].extraProp = 5;
    for (const p of w1.proj.list) p.extraProj = 3;
    c.soft('extra_field_inert', SW.statwalk(w1) === before);
    delete u0.brandNewField; delete u0.anim.extraKey; delete u0.moduleState; if (w1.props.length) delete w1.props[0].extraProp;
    for (const p of w1.proj.list) delete p.extraProj;
    // prop: only hp and dead are read
    const pr = w1.props.find((p) => Number.isFinite(p.hp)) || w1.props[0], px = pr.x;
    pr.x += 5; const propMoved = SW.statwalk(w1) === before; pr.x = px;
    const hp0 = pr.hp; pr.hp = hp0 - 1; const hpSeen = SW.statwalk(w1) !== before; pr.hp = hp0;
    pr.dead = !pr.dead; const deadSeen = SW.statwalk(w1) !== before; pr.dead = !pr.dead;
    c.soft('props_hp_dead_only', propMoved && hpSeen && deadSeen && SW.statwalk(w1) === before);
    // sensitivity: a change the legacy hash cannot see, and tiny changes it quantises away
    const legacy0 = legacyStateHash(w1);
    const cd0 = u0.cd; u0.cd += 0.001; const seesCd = SW.statwalk(w1) !== before && legacyStateHash(w1) === legacy0; u0.cd = cd0;
    const hpu = u0.hp; u0.hp += 1e-9; const seesTiny = SW.statwalk(w1) !== before && legacyStateHash(w1) === legacy0; u0.hp = hpu;
    c.soft('witness_sees_more', seesCd && seesTiny && SW.statwalk(w1) === before);
    const sens = (label, get, set, alt) => { const keep = get(); set(alt(keep)); const moved = SW.statwalk(w1) !== before; set(keep); c.soft('sensitive/' + label, moved && SW.statwalk(w1) === before); };
    sens('typed_array', () => w1.units[1].se[2], (v) => { w1.units[1].se[2] = v; }, (v) => v + 0.5);
    sens('arena_height', () => w1.arena.h[10], (v) => { w1.arena.h[10] = v; }, (v) => (v ^ 1));
    sens('rng', () => w1.rng.s, (v) => { w1.rng.s = v; }, (v) => v + 1);
    sens('tick', () => w1.tickN, (v) => { w1.tickN = v; }, (v) => v + 1);
    sens('anim_clip', () => u0.anim.clip, (v) => { u0.anim.clip = v; }, (v) => v + 'x');
    sens('ref_by_id', () => u0.target, (v) => { u0.target = v; }, (v) => (v === w1.units[3] ? w1.units[4] : w1.units[3]));
    let tg = null;
    for (const u of w1.units) { for (const e of u.abil || []) { const k = ((spec.nested['unit.abil.st'] || {})[e.p && e.p.id] || []).find((kk) => typeof e.st[kk] === 'number'); if (k) { tg = { e, k }; break; } } if (tg) break; }
    c.soft('abil_target_found', !!tg);
    if (tg) { sens('abil_state', () => tg.e.st[tg.k], (v) => { tg.e.st[tg.k] = v; }, (v) => v + 0.25); sens('abil_cd', () => tg.e.cd, (v) => { tg.e.cd = v; }, (v) => v + 1); const nk = tg.e.st; nk.__newKey = 1; c.soft('abil_extra_state_key_inert', SW.statwalk(w1) === before); delete nk.__newKey; }
  });
  // non-finite values are counted, and NaN/Infinity/-0 have distinct, stable treatment
  section(c, () => {
    const sp = SW.loadSpec();
    const fakeW = (hp) => ({ units: [{ id: 1, hp, x: 0, z: 0, team: 0 }], proj: { list: [] }, effects: [], props: [], rng: { s: 5 }, tickN: 3, arena: { h: new Uint8Array(4) } });
    const sw = createStatwalk(sp);
    const nan = sw.detail(fakeW(NaN)), inf = sw.detail(fakeW(Infinity)), ninf = sw.detail(fakeW(-Infinity)), ok = sw.detail(fakeW(10)), z = sw.detail(fakeW(0)), nz = sw.detail(fakeW(-0));
    c.soft('nan_counted', nan.nan === 1 && nan.inf === 0 && ok.nan === 0);
    c.soft('inf_counted', inf.inf === 1 && ninf.inf === 1 && inf.nan === 0);
    c.soft('nonfinite_distinct', new Set([nan.hash, inf.hash, ninf.hash, ok.hash]).size === 4);
    c.soft('negative_zero_folded', z.hash === nz.hash);
    c.soft('reentrant_state_reset', sw.detail(fakeW(10)).hash === ok.hash && sw.detail(fakeW(NaN)).nan === 1);
  });
  finish(c);
}

// =====================================================================================================================================
// VF-T02 records: construction, canonical files, states, refresh, class (b) amendment (PC-1)
// =====================================================================================================================================
function mulberry(a) { return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(rnd) { let u = 0, v = 0; while (u === 0) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const sample = (rnd, n, { p = 0.5, mean = 1900, sd = 431 } = {}) => Array.from({ length: n }, () => ({ win: rnd() < p ? 1 : 0, endTick: Math.max(100, Math.round(mean + sd * gauss(rnd))) }));
const H = (ch) => ch.repeat(64);
const mkRec = (over = {}) => ({ schema: 1, kind: 'feasibility', engine: 'node', engineVersion: 'v22.22.0', regime: 'baked', engineHash: { simCore: H('a'), shared: H('b') }, eraHash: { ancient: H('1') }, tag: 't', sha: null, dirty: null, box: { cpus: 4, platform: 'linux', arch: 'x64' }, data: { battles: Array.from({ length: 40 }, (_, i) => ({ id: 'm' + String(i).padStart(2, '0'), tuple: [1, 1000 + i, 3, 'd' + i] })) }, ...over });
const CUR = (over = {}) => ({ engineHash: { simCore: H('a'), shared: H('b') }, eraHash: { ancient: H('1') }, landings: 10, now: '2026-10-10', ...over });

{
  const c = criterion('VF-T02', { er: ['ER1', 'ER13'], owner: 'TOOLS-GOLDEN', tier: 'T-fast', negctl: 'tests/negctl/VF-T02.mjs', text: 'records: makeRecord tags, canonical files, the six states, witness refresh, amended class (b) statistic' });
  section(c, () => {
    // makeRecord
    const r1 = REC.makeRecord('feasibility', { a: [1, 2, 3], b: { c: 'x' } }, { engine: 'node', regime: 'baked' }), r2 = REC.makeRecord('feasibility', { a: [1, 2, 3], b: { c: 'x' } }, { engine: 'node', regime: 'baked' });
    c.soft('make/shape', r1.schema === 1 && r1.kind === 'feasibility' && r1.engine === 'node' && r1.engineVersion === process.version && r1.regime === 'baked' && REC.validateRecord(r1).length === 0 && r1.renderHash === undefined && Object.keys(r1.eraHash).join() === 'ancient');
    c.soft('make/deterministic', REC.canonicalJSON(r1) === REC.canonicalJSON(r2));
    c.soft('make/matches_fingerprint', same(r1.engineHash, FP.engineHash(ROOT)) && r1.eraHash.ancient === FP.eraHash('ancient', ROOT));
    c.soft('make/render_hash', REC.makeRecord('g8', { x: 1 }, { engine: 'node', regime: 'baked', render: true }).renderHash === FP.renderHash(ROOT));
    const thr = (fn) => { try { fn(); return false; } catch (e) { return e instanceof TypeError; } };
    c.soft('make/rejects', thr(() => REC.makeRecord('x', {}, { engine: 'bun', regime: 'baked' })) && thr(() => REC.makeRecord('x', {}, { engine: 'node', regime: 'auto' })) && thr(() => REC.makeRecord('x', {}, { engine: 'node' })) && thr(() => REC.makeRecord('x', {}, { engine: 'chromium', regime: 'baked' })) && thr(() => REC.makeRecord('Bad Kind', {}, { engine: 'node', regime: 'baked' })) && thr(() => REC.makeRecord('x', { v: NaN }, { engine: 'node', regime: 'baked' })) && thr(() => REC.makeRecord('x', { v: undefined }, { engine: 'node', regime: 'baked' })) && thr(() => REC.makeRecord('x', null, { engine: 'node', regime: 'baked' })));
    const ch = REC.makeRecord('g6', { n: 1 }, { engine: 'chromium', engineVersion: '141.0.7390.37', regime: 'baked', tag: 'ancient-v8' });
    c.soft('make/chromium', ch.engine === 'chromium' && ch.tag === 'ancient-v8' && REC.engineMajor(ch.engineVersion) === 141 && REC.engineMajor('v22.22.0') === 22 && REC.engineMajor('HeadlessChrome/141.0.1') === 141 && Number.isNaN(REC.engineMajor('latest')));
    // canonical files
    c.soft('canon/key_order', REC.canonicalJSON({ b: 1, a: [1, 2], c: [{ z: 1, y: 2 }] }) === REC.canonicalJSON({ c: [{ y: 2, z: 1 }], a: [1, 2], b: 1 }) && REC.canonicalJSON({ a: [1, 2] }).includes('[1,2]'));
    const dir = mkTmp('vw-rec-'), f = path.join(dir, 'sub', 'r.json');
    const w1 = REC.writeRecord(f, r1), m1 = fs.statSync(f).mtimeMs, w2 = REC.writeRecord(f, r1);
    c.soft('canon/write_once', w1.written === true && w2.written === false && fs.statSync(f).mtimeMs === m1 && same(REC.readRecord(f), r1) && fs.readFileSync(f, 'utf8').endsWith('}\n'));
    c.soft('canon/rejects_malformed', thr(() => REC.writeRecord(f, { ...r1, regime: 'x' })) || (() => { try { REC.writeRecord(f, { ...r1, regime: 'x' }); return false; } catch { return true; } })());
    fs.writeFileSync(f, JSON.stringify({ ...r1, engineHash: { simCore: 'x', shared: 'y' } }));
    c.soft('canon/read_rejects_malformed', (() => { try { REC.readRecord(f); return false; } catch (e) { return /malformed/.test(e.message); } })());
  });
  section(c, () => {
    // the six states (VF 3.7)
    const cls = (rec, cur, o) => REC.classifyRecord(rec, cur, { era: 'ancient', ...o });
    const cur = CUR(), engDiff = CUR({ engineHash: { simCore: H('c'), shared: H('b') } });
    c.soft('state/current', cls(mkRec(), cur).state === 'CURRENT' && !cls(mkRec(), cur).red && !cls(mkRec(), cur).amber);
    c.soft('state/current_needs_no_witness', cls(mkRec(), cur, { witness: false }).state === 'CURRENT');
    const sh = cls(mkRec(), CUR({ engineHash: { simCore: H('a'), shared: H('d') } }), { witness: true });
    c.soft('state/stale_engine', cls(mkRec(), engDiff, { witness: true }).state === 'STALE-ENGINE' && cls(mkRec(), engDiff, { witness: true }).amber && !cls(mkRec(), engDiff, { witness: true }).red && sh.state === 'STALE-ENGINE');
    c.soft('state/witness_lazy', cls(mkRec(), engDiff, { witness: () => true }).state === 'STALE-ENGINE' && (() => { let called = 0; cls(mkRec(), cur, { witness: () => { called++; return true; } }); return called === 0; })());
    c.soft('state/red_witness', cls(mkRec(), engDiff, { witness: false }).state === 'RED-WITNESS' && cls(mkRec(), engDiff, { witness: () => false }).red);
    c.soft('state/red_era', cls(mkRec(), CUR({ eraHash: { ancient: H('2') } }), { witness: true }).state === 'RED-ERA' && cls(mkRec(), CUR({ eraHash: { ancient: H('2') }, engineHash: { simCore: H('c'), shared: H('b') } }), { witness: true }).state === 'RED-ERA' && cls(mkRec(), CUR({ eraHash: {} }), {}).state === 'RED-ERA');
    c.soft('state/witness_required', (() => { try { cls(mkRec(), engDiff, {}); return false; } catch (e) { return e instanceof TypeError; } })());
    c.soft('state/missing', cls(null, cur, { required: true, frozen: true }).state === 'MISSING' && cls(null, cur, { required: true, frozen: true }).red && !cls(null, cur, { required: true, frozen: false }).red && !cls(null, cur, { required: false, frozen: true }).red);
    c.soft('state/goldens_have_none', ['g1', 'g6', 'v8_fields'].every((k) => { try { cls(mkRec({ kind: k }), cur); return false; } catch (e) { return e instanceof TypeError; } }));
    // age: more than 6 module landings or 4 calendar days is red (age 7 landings -> RED-AGE)
    const st = (landing, at) => mkRec({ staleSince: { landing, at } });
    const age = (landings, now, s0 = st(4, '2026-10-08T01:00:00Z')) => cls(s0, CUR({ engineHash: { simCore: H('c'), shared: H('b') }, landings, now }), { witness: true });
    c.soft('age/6_landings_amber', age(10, '2026-10-08').state === 'STALE-ENGINE' && age(10, '2026-10-08').ageLandings === 6);
    c.soft('age/7_landings_red', age(11, '2026-10-08').state === 'RED-AGE' && age(11, '2026-10-08').red);
    c.soft('age/4_days_amber', age(5, '2026-10-12T23:59:00Z').state === 'STALE-ENGINE');
    c.soft('age/5_days_red', age(5, '2026-10-13T00:01:00Z').state === 'RED-AGE');
    c.soft('age/witness_beats_age', cls(st(0, '2026-01-01T00:00:00Z'), CUR({ engineHash: { simCore: H('c'), shared: H('b') }, landings: 99, now: '2026-10-10' }), { witness: false }).state === 'RED-WITNESS');
    const ms = REC.markStale(mkRec(), CUR({ landings: 12, now: '2026-10-10T08:00:00Z' }));
    c.soft('age/mark_stale_once', ms.staleSince.landing === 12 && ms.staleSince.at === '2026-10-10T08:00:00.000Z' && REC.markStale(ms, CUR({ landings: 30, now: '2026-11-01' })).staleSince.landing === 12 && mkRec().staleSince === undefined);
    const lroot = mkTmp('vw-land-');
    c.soft('age/landings_count', REC.landingsCount(lroot) === 0 && (() => { fs.mkdirSync(path.join(lroot, 'docs/eras/ledger'), { recursive: true }); fs.writeFileSync(path.join(lroot, 'docs/eras/ledger/landings.jsonl'), '{"a":1}\n\n{"a":2}\n'); return REC.landingsCount(lroot) === 2; })());
  });
  // witness refresh: rewrites only engineHash (+ witness, - staleSince); needs a green witness set and 30 bit-equal re-runs
  const refreshing = async () => {
    const rec = mkRec({ staleSince: { landing: 3, at: '2026-10-08T00:00:00Z' } }), cur = CUR({ engineHash: { simCore: H('c'), shared: H('b') } });
    const byId = new Map(rec.data.battles.map((b) => [b.id, b.tuple]));
    let reruns = 0;
    const opts = (over = {}) => ({ era: 'ancient', treeHash: 'tree-1', name: 'feasibility.ancient', now: '2026-10-09T10:00:00Z', witnessSet: async () => ({ green: true, digest: 'W' }), rerun: async (e) => { reruns++; return byId.get(e.id).slice(); }, ...over });
    const ok = await REC.refreshRecord(rec, cur, opts());
    const strip = (r) => { const { engineHash, witness, staleSince, ...rest } = r; return rest; };
    c.soft('refresh/ok', ok.refreshed === true && same(ok.record.engineHash, cur.engineHash) && ok.record.witness.length === 1 && ok.record.witness[0].sample === 30 && reruns === 30 && ok.logLine === 'witness refresh feasibility.ancient tree-1' && /^[0-9a-f]{64}$/.test(ok.record.witness[0].digest));
    c.soft('refresh/only_engine_hash', same(strip(ok.record), strip(rec)) && ok.record.staleSince === undefined && rec.engineHash.simCore === H('a'));
    c.soft('refresh/becomes_current', REC.classifyRecord(ok.record, cur, { era: 'ancient' }).state === 'CURRENT');
    const again = await REC.refreshRecord(ok.record, cur, opts());
    c.soft('refresh/noop_when_current', again.refreshed === false && /CURRENT/.test(again.reason));
    const red = await REC.refreshRecord(rec, cur, opts({ witnessSet: async () => ({ green: false }) }));
    c.soft('refresh/needs_green_witness', red.refreshed === false && red.record === rec && /witness set/.test(red.reason));
    const bad = await REC.refreshRecord(rec, cur, opts({ rerun: async (e) => { const t = byId.get(e.id).slice(); if (e.id === [...REC.selectWitnessSample(rec, 'ancient', 'tree-1')].at(5).id) t[1] += 1; return t; } }));
    c.soft('refresh/one_bad_battle_blocks', bad.refreshed === false && /re-ran to/.test(bad.reason) && bad.record === rec);
    const era = await REC.refreshRecord(rec, CUR({ eraHash: { ancient: H('9') }, engineHash: { simCore: H('c'), shared: H('b') } }), opts());
    c.soft('refresh/era_change_blocks', era.refreshed === false && /RED-ERA/.test(era.reason));
    const rejects = async (kind) => { try { await REC.refreshRecord(mkRec({ kind }), cur, opts()); return false; } catch (e) { return /re-measured|not a measurement/.test(e.message); } };
    c.soft('refresh/perf_never_refreshed', (await rejects('perf')) && (await rejects('readability')) && (await rejects('g1')));
    const s1 = REC.selectWitnessSample(rec, 'ancient', 'tree-1'), s2 = REC.selectWitnessSample(rec, 'ancient', 'tree-1'), s3 = REC.selectWitnessSample(rec, 'ancient', 'tree-2');
    c.soft('refresh/sample_seeded', same(s1.map((b) => b.id), s2.map((b) => b.id)) && !same(s1.map((b) => b.id), s3.map((b) => b.id)) && new Set(s1.map((b) => b.id)).size === 30 && REC.selectWitnessSample(mkRec({ data: { battles: rec.data.battles.slice(0, 7) } }), 'ancient', 'x').length === 7);
    c.soft('refresh/needs_battles', await (async () => { try { REC.selectWitnessSample(mkRec({ data: {} }), 'ancient', 'x'); return false; } catch { return true; } })());
  };
  await sectionAsync(c, refreshing);
  section(c, () => {
    // PC-1: the amended class (b) statistic, measured by simulation (1,000 pairs of n = 200 from ONE distribution)
    const rnd = mulberry(20261008);
    let okNew = 0, okOld = 0;
    for (let i = 0; i < 1000; i++) { const a = sample(rnd, 200), b = sample(rnd, 200); if (REC.compareStats(a, b, { n: 200 }).ok) okNew++; if (REC.legacyCompareStats(a, b).ok) okOld++; }
    c.soft('compare_stats/identical_pairs', okNew / 1000 >= 0.96);
    c.soft('compare_stats/old_rule_fails_identical', okOld / 1000 <= 0.30);
    // the tolerance formula at n = 200 (p = 0.5): 2.58 x sqrt(2 x 0.25 / 200) = 12.9 points; median ticks: 2.58 x 1.2533 x sd x sqrt(2/200) / median
    const a = sample(mulberry(7), 200), b = sample(mulberry(8), 200), r = REC.compareStats(a, b, { n: 200 });
    c.soft('compare_stats/formula', Math.abs(r.tolWin - Math.max(0.03, 2.58 * r.seWin)) < 1e-12 && Math.abs(r.tolTick - Math.max(0.02, 2.58 * r.seTick)) < 1e-12 && r.seWin > 0.045 && r.seWin < 0.055 && r.tolWin > 0.115 && r.tolWin < 0.14 && r.tolTick > 0.05 && r.tolTick < 0.09 && same(r.n, [200, 200]));
    const big = REC.compareStats(sample(mulberry(1), 600), sample(mulberry(2), 600), { n: 600 });
    c.soft('compare_stats/n600_tighter', big.tolWin < r.tolWin && big.tolWin > 0.06 && big.tolWin < 0.085 && big.tolTick < r.tolTick);
    c.soft('compare_stats/floor', (() => { const e = Array.from({ length: 50 }, () => ({ win: 1, endTick: 1000 })), q = REC.compareStats(e, e); return q.ok && q.tolWin === 0.03 && q.tolTick === 0.02 && q.dWin === 0; })());
  });
  finish(c);
}

// =====================================================================================================================================
// AR-T23 comparator classes (synthetic part)
// =====================================================================================================================================
{
  const c = criterion('AR-T23', { er: ['ER1', 'ER13'], owner: 'TOOLS-GOLDEN', tier: 'T-fast', negctl: 'tests/negctl/AR-T23.mjs', text: 'assertComparable throws across engine and regime; compareStats detects a real difference; firstDivergence is exact; marginCheck is class (c)' });
  section(c, () => {
    const node = mkRec(), chrome = mkRec({ engine: 'chromium', engineVersion: '141.0.7390.37' }), sameVer = mkRec({ engine: 'chromium' }), default_meta = mkRec({ regime: 'default_meta' }), node20 = mkRec({ engineVersion: 'v20.11.0' });
    const throwsCross = (a, b, cls = 'a') => { try { REC.assertComparable(a, b, cls); return false; } catch (e) { return e instanceof REC.CrossEngineError && e.name === 'CrossEngineError' && Array.isArray(e.diff) && e.diff.length > 0; } };
    c.soft('records.cross_engine', throwsCross(node, chrome) && throwsCross(node, sameVer) && throwsCross(chrome, node));
    c.soft('records.cross_regime', throwsCross(node, default_meta) && (() => { try { REC.assertComparable(node, default_meta, 'a'); return false; } catch (e) { return e.diff.some((d) => d.field === 'regime'); } })());
    c.soft('records.engine_major', throwsCross(node, node20) && REC.assertComparable(node, mkRec({ engineVersion: 'v22.3.1' }), 'a') === true);
    c.soft('records.same_engine_ok', REC.assertComparable(node, mkRec(), 'a') === true && REC.assertComparable(chrome, mkRec({ engine: 'chromium', engineVersion: '141.1.1' }), 'a') === true);
    c.soft('records.class_b_same_build', REC.assertComparable(node, chrome, 'b') === true && REC.assertComparable(node, default_meta, 'b') === true && throwsCross(node, mkRec({ engineHash: { simCore: H('f'), shared: H('b') } }), 'b') && throwsCross(node, mkRec({ eraHash: { ancient: H('f') } }), 'b'));
    c.soft('records.class_c_and_unknown', REC.assertComparable(node, chrome, 'c') === true && (() => { try { REC.assertComparable(node, node, 'd'); return false; } catch (e) { return e instanceof TypeError; } })());
    c.soft('records.cross_engine_message', (() => { try { REC.assertComparable(node, chrome, 'a'); return false; } catch (e) { return /engine \(node vs chromium\)/.test(e.message) && /bit equality is only defined inside one engine/.test(e.message); } })());
  });
  section(c, () => {
    // compareStats detects a real difference at n = 200 (18 points of win rate, 20% of end tick) and not a null one
    const rnd = mulberry(99);
    c.soft('compare_stats.detects_win_rate', !REC.compareStats(sample(rnd, 200, { p: 0.5 }), sample(rnd, 200, { p: 0.75 }), { n: 200 }).ok);
    c.soft('compare_stats.detects_end_tick', !REC.compareStats(sample(rnd, 200, { mean: 1900 }), sample(rnd, 200, { mean: 2300 }), { n: 200 }).ok);
    c.soft('compare_stats.accepts_null', REC.compareStats(sample(mulberry(5), 200), sample(mulberry(6), 200), { n: 200 }).ok);
    c.soft('compare_stats.needs_n', (() => { try { REC.compareStats(sample(rnd, 50), sample(rnd, 200), { n: 200 }); return false; } catch (e) { return e instanceof RangeError; } })() && (() => { try { REC.compareStats({}, {}); return false; } catch (e) { return e instanceof TypeError; } })());
    c.soft('compare_stats.input_forms', (() => { const s = sample(rnd, 30); const alt = { wins: s.map((x) => x.win), endTicks: s.map((x) => x.endTick) }; return same(REC.compareStats(s, s), REC.compareStats(alt, alt)); })());
    // firstDivergence
    const a = [11, 22, 33, 44, 55], b = [11, 22, 33, 45, 55];
    const d = REC.firstDivergence(a, b);
    c.soft('first_divergence.exact', REC.firstDivergence(a, a.slice()) === null && d.index === 3 && d.tick === 400 && d.a === 44 && d.b === 45 && d.reason === 'value');
    c.soft('first_divergence.length', (() => { const e = REC.firstDivergence([1, 2, 3], [1, 2]); return e.reason === 'length' && e.index === 2 && e.tick === 300; })() && REC.firstDivergence(a, b, { every: 300, first: 300 }).tick === 1200);
    // marginCheck (class c): >= 8 of 10 seeds in BOTH engines
    const ten = (w) => Array.from({ length: 10 }, (_, i) => i < w);
    c.soft('margin_check.pass', REC.marginCheck({ node: ten(8), chromium: ten(10) }).ok && REC.marginCheck({ node: ten(8), chromium: ten(8).map((x) => ({ win: x })) }).ok);
    c.soft('margin_check.fail', !REC.marginCheck({ node: ten(7), chromium: ten(10) }).ok && !REC.marginCheck({ node: ten(10), chromium: ten(7) }).ok && /node: 7\/10/.test(REC.marginCheck({ node: ten(7), chromium: ten(10) }).reason));
    c.soft('margin_check.missing_engine', !REC.marginCheck({ node: ten(10) }).ok && REC.marginCheck({ node: ten(10) }, { engines: ['node'] }).ok && !REC.marginCheck({ node: ten(10).slice(0, 9), chromium: ten(10) }).ok);
  });
  finish(c);
}

// =====================================================================================================================================
// VF-L03 / VF-L04 build.mjs: files.manifest.json and the unchanged v8 page (hermetic build of the BASELINE sources with this tree's tools/)
// =====================================================================================================================================
let built = null;
function hermeticBuild() {
  if (built) return built;
  const dir = mkTmp('vw-build-');
  fs.cpSync(path.join(BASELINE_WORKTREE, 'src'), path.join(dir, 'src'), { recursive: true });
  fs.cpSync(path.join(ROOT, 'tools'), path.join(dir, 'tools'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(dir, 'package.json'));
  fs.symlinkSync(path.join(MAIN_ROOT, 'assets'), path.join(dir, 'assets'));
  fs.symlinkSync(path.join(MAIN_ROOT, 'node_modules'), path.join(dir, 'node_modules'));
  const r = spawnSync('node', [path.join(dir, 'tools/build.mjs'), '--minify'], { cwd: dir, encoding: 'utf8', env: { ...process.env, VW_BUILD_DATE: '2026-10-08' }, timeout: 120000 });
  const rd = (f) => { try { return fs.readFileSync(path.join(dir, 'dist/artifact', f)); } catch { return null; } };
  built = { status: r.status, log: ((r.stderr || '') + (r.stdout || '')).trim().split('\n').slice(-3).join(' | '), index: rd('index.html'), filesJson: rd('files.json'), manifest: rd('files.manifest.json') };
  return built;
}
const rel8 = (f) => fs.readFileSync(path.join(ROOT, 'release/v8', f));
{
  const c = criterion('VF-L03', { er: ['ER24'], owner: 'TOOLS-GOLDEN', tier: 'T-fast', negctl: 'tests/negctl/VF-L03.mjs', text: 'tools/build.mjs emits files.manifest.json {path:{sha256,bytes}} next to files.json' });
  if (!haveBaseline) c.skip('baseline worktree missing');
  else section(c, () => {
    const b = hermeticBuild();
    c.check('build_ok', b.status === 0, b.log);
    c.check('exists', !!b.manifest, 'dist/artifact/files.manifest.json was not written');
    const man = JSON.parse(b.manifest.toString('utf8')), files = JSON.parse(b.filesJson.toString('utf8')), keys = Object.keys(man);
    c.soft('same_keys_as_files_json', same(keys, Object.keys(files)) && keys.length === 382);
    c.soft('entry_shape', keys.every((k) => /^[0-9a-f]{64}$/.test(man[k].sha256) && Number.isInteger(man[k].bytes) && man[k].bytes > 0 && Object.keys(man[k]).join() === 'sha256,bytes'));
    c.soft('entries_match_disk', keys.every((k) => { const d = fs.readFileSync(path.join(MAIN_ROOT, files[k])); return d.length === man[k].bytes && crypto.createHash('sha256').update(d).digest('hex') === man[k].sha256; }));
    c.soft('total_bytes', keys.reduce((s, k) => s + man[k].bytes, 0) === 10979932);
    c.soft('identical_to_release', Buffer.compare(b.manifest, rel8('files.manifest.json')) === 0);
  });
  finish(c);
}
{
  const c = criterion('VF-L04', { er: ['ER1', 'ER24'], owner: 'TOOLS-GOLDEN', tier: 'T-fast', negctl: 'tests/negctl/VF-L04.mjs', text: 'build.mjs on the v8 sources with VW_BUILD_DATE=2026-10-08 reproduces release/v8 (fragment, files.json) byte for byte' });
  if (!haveBaseline) c.skip('baseline worktree missing');
  else section(c, () => {
    const b = hermeticBuild();
    c.check('build_ok', b.status === 0, b.log);
    c.check('fragment_identical', Buffer.compare(b.index, rel8('index.html')) === 0, `fragment ${b.index && b.index.length} B differs from release/v8/index.html (${rel8('index.html').length} B)`);
    c.soft('sha256_matches_page_sha256', crypto.createHash('sha256').update(b.index).digest('hex') === rel8('PAGE.sha256').toString('utf8').split(/\s+/)[0]);
    c.soft('files_json_identical', Buffer.compare(b.filesJson, rel8('files.json')) === 0);
  });
  finish(c);
}

console.log(`golden lib tests: ${failedSections ? failedSections + ' section(s) FAILED' : 'all sections passed'} in ${((Date.now() - T0) / 1000).toFixed(1)} s`);
process.exitCode = failedSections ? 1 : 0;
