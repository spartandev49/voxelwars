// AR-T13 (docs/eras/spec/AR.md 3.5.4, VF 3.6.3): the save format works in BOTH directions between the Ancient v8 baseline and the build under test (this tree).
// The baseline's own save code is imported by path from .cache/baseline/ancient-v8 (tools/golden/save_stack.mjs), the build under test from this repository; both run
// on the SAME bytes: tests/save/fixtures/ancient_release_v8.mjs, a real v8 profile produced by driving the baseline build in Chromium (tools/golden/g5_make_fixture.mjs).
//   labels (the seven rows of 3.5.4 + the version pins):
//     save_versions    CURRENT doc versions, SAVE_FORMAT, EXPORT_KEYS, caps, share framing equal the baseline's and the literals of the spec (nothing was bumped, AR 3.5.5)
//     save_v8_to_new   the v8 profile loads in the build under test without a migration or a backup, and a flush (export) changes no v8 key; keys added are only the allowed ones
//     save_new_to_v8   a profile carrying every NEW key of 3.5.2 is exported by the build under test and imported by the baseline: ok, every v8 key equal, every new key survives
//                      except exactly stats.campaign.completedEras, stats.eraStats and settings.eraQuality; the baseline flushes and re-exports without error
//     save_roundtrip   new -> v8 flush -> new: the survivors equal, the documented losses are the only difference, a second round trip is the identity
//     save_codes       the v8 soldier / arena / army share codes import in both builds to equal values; a new-era army code is rejected by v8 with its exact message; an arena code
//                      with env.era opens in v8 with the Ancient look
//     save_v1_chain    the v1 blobs (tests/save/fixtures/v1_blobs.mjs) migrate to the same v2 documents in both builds, also through importAll
//     save_ids         every id a real v8 profile mentions (units, missions, puzzles, achievements, props, parts, abilities) still resolves in the build under test
//     save_hidden      with only the Ancient era released no hidden-era key is written (progress.eras / survival.eras / seen.whatsnew / daily era: only 'ancient')
// Candidate features that do not exist yet in the tree (stats.campaign.completedEras / eraStats / LifetimeStats.reconcile, the goreAuto migration) are reported as PENDING lines
// (not failures); the checks that need them turn on by themselves when the code lands.
// @nocache  (a golden imports the tree and the baseline through import(<expr>) on purpose: never served from the closure cache)
import { criterion } from '../lib/criteria.mjs';
import { ROOT } from '../../tools/lib/paths.mjs';
import { BASELINE_WORKTREE, assertBaseline } from '../../tools/golden/baseline.mjs';
import { loadStack } from '../../tools/golden/save_stack.mjs';
import { canonicalJSON } from '../../tools/lib/records.mjs';
import FIX from './fixtures/ancient_release_v8.mjs';
import { V1 } from './fixtures/v1_blobs.mjs';

const c = criterion('AR-T13', { er: ['ER16', 'ER1'], owner: 'TOOLS-GOLDEN', tier: 'T-fast', negctl: 'tests/negctl/AR-T13.mjs', engine: 'node',
  text: 'Saves work both ways between Ancient v8 and this build: v8 profile -> new, new -> v8, round trip, share codes, v1 chain, ids, hidden eras' });
const soft = (label, ok, detail = '') => { const good = c.soft(label, !!ok); if (!good) console.error(`RED ${c.id}/${label}${detail ? ': ' + String(detail).split('\n').slice(0, 8).join('\n    ') : ''}`); return good; };
const pending = [];

assertBaseline(BASELINE_WORKTREE);
const B = await loadStack(BASELINE_WORKTREE);
const N = await loadStack(ROOT);

// ------------------------------------------------------------------------------------------------ helpers
const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
/** Flatten parsed envelopes to {path: canonical JSON of the leaf}; arrays of primitives are one leaf, arrays of objects are indexed. */
function leaves(dump) {
  const out = new Map();
  const walk = (v, p) => {
    if (Array.isArray(v)) { if (v.every((x) => !isPlain(x) && !Array.isArray(x))) { out.set(p, JSON.stringify(v)); return; } v.forEach((x, i) => walk(x, `${p}[${i}]`)); if (!v.length) out.set(p, '[]'); return; }
    if (isPlain(v)) { const ks = Object.keys(v); if (!ks.length) out.set(p, '{}'); for (const k of ks) walk(v[k], p ? `${p}.${k}` : k); return; }
    out.set(p, JSON.stringify(v));
  };
  for (const k of Object.keys(dump).sort()) { walk(dump[k].data, k); out.set(k + '#v', String(dump[k].v)); }
  return out;
}
const diffLeaves = (a, b) => { const changed = [], onlyA = [], onlyB = []; for (const [k, v] of a) { if (!b.has(k)) onlyA.push(k); else if (b.get(k) !== v) changed.push(k); } for (const k of b.keys()) if (!a.has(k)) onlyB.push(k); return { changed, onlyA, onlyB }; };
const decodePayload = async (S, code) => (await S.share.decodeShare(code, { types: ['save'], maxLen: 8000000, maxInflate: 30 * 1024 * 1024 })).json;
const list = (a, n = 6) => a.slice(0, n).join(', ') + (a.length > n ? ` and ${a.length - n} more` : '');
const EXPORT_KEYS = ['settings', 'progress', 'survival', 'daily', 'seen', 'stats', 'arenas', 'soldiers', 'armies'];
const fixtureDump = () => { const o = {}; for (const [k, raw] of Object.entries(FIX.LOCAL_STORAGE)) o[k.slice(3)] = JSON.parse(raw); return o; };

// ------------------------------------------------------------------------------------------------ save_versions
{
  const b = B.constants(), n = N.constants();
  const lit = canonicalJSON({ CURRENT: { progress: 2, survival: 2, daily: 2, seen: 2, stats: 1 }, SAVE_FORMAT: 1, EXPORT_KEYS, MAX_SAVE_CODE: 6000000, MAX_CODE: 38000, MAGIC: 'VW1', COLLECTION_CAPS: { arenas: 48, soldiers: 24, armies: 24 } });
  soft('save_versions', canonicalJSON(b) === lit && canonicalJSON(n) === lit, `baseline ${canonicalJSON(b).replace(/\s+/g, ' ')} | this build ${canonicalJSON(n).replace(/\s+/g, ' ')} | spec ${lit.replace(/\s+/g, ' ')}`);
  // the export framing: payload fields and the code shape, produced by both builds from the same device bytes
  const db = B.device(FIX.LOCAL_STORAGE), dn = N.device(FIX.LOCAL_STORAGE);
  const pb = await decodePayload(B, await db.T.exportAll()), pn = await decodePayload(N, await dn.T.exportAll());
  soft('save_versions', pb.f === 1 && pn.f === 1 && pb.app === 'voxelwars' && pn.app === 'voxelwars' && Object.keys(pb).sort().join() === Object.keys(pn).sort().join('') .replace(/^$/, Object.keys(pb).sort().join()) && Object.keys(pb).sort().join() === 'app,at,build,f,keys' && Object.keys(pn).sort().join() === 'app,at,build,f,keys', 'export payload fields');
}

// ------------------------------------------------------------------------------------------------ save_v8_to_new
const fixLeaves = leaves(fixtureDump());
const ADDED_OK = [/^settings\.goreAuto$/, /^settings\.goreChosen$/, /^progress\.eras(\.|$)/, /^progress\.lastEra$/, /^seen\.basics$/, /^stats\.campaign\.completedEras$/, /^stats\.eraStats(\.|$)/];
const isAddedOk = (p) => ADDED_OK.some((r) => r.test(p));
let newCode = null, nDev = null;
{
  const dn = N.device(FIX.LOCAL_STORAGE);
  const infos = ['progress', 'survival', 'daily', 'seen'].map((k) => [k, dn.docs[k].status, dn.docs[k].info.error, dn.docs[k].info.migrated.length, dn.docs[k].info.backup]);
  const cleanLoad = infos.every(([, st, err, mig, bak]) => st === 'ok' && !err && mig === 0 && !bak);
  const code = await dn.T.exportAll();                      // flushes every document, the stats and the settings
  const after = leaves(dn.dump());
  const d = diffLeaves(fixLeaves, after);
  const badAdded = d.onlyB.filter((p) => !isAddedOk(p));
  const settingsEq = canonicalJSON(dn.settings.all()) === canonicalJSON(fixtureDump().settings.data);
  soft('save_v8_to_new', cleanLoad && d.changed.length === 0 && d.onlyA.length === 0 && badAdded.length === 0 && settingsEq,
    `loads clean ${cleanLoad} ${JSON.stringify(infos)}; changed [${list(d.changed)}]; lost [${list(d.onlyA)}]; added without permission [${list(badAdded)}]; live settings equal stored ${settingsEq}`);
  // the new build's export of the v8 profile has the same nine keys and the same data as the real Export button of v8 (the framing fields `at` and `build` differ by design)
  const pn = await decodePayload(N, code), pf = await decodePayload(N, FIX.EXPORT_CODE);
  const dd = diffLeaves(leaves(Object.fromEntries(Object.entries(pf.keys))), leaves(Object.fromEntries(Object.entries(pn.keys))));
  soft('save_v8_to_new', Object.keys(pn.keys).sort().join() === Object.keys(pf.keys).sort().join() && dd.changed.length === 0 && dd.onlyA.length === 0 && dd.onlyB.filter((p) => !isAddedOk(p)).length === 0, `export of the loaded v8 profile differs from the v8 Export code: changed [${list(dd.changed)}] lost [${list(dd.onlyA)}] added [${list(dd.onlyB)}]`);
  // custom soldiers of the profile cost the same in both builds
  const costs = async (S) => { const C = await S.T.src('custom'); return (JSON.parse(FIX.LOCAL_STORAGE['vw.soldiers']).data).map((cs) => [cs.id, C.customDef(JSON.parse(JSON.stringify(cs))).cost]); };
  soft('save_v8_to_new', canonicalJSON(await costs(B)) === canonicalJSON(await costs(N)) && (await costs(B)).length === 3, 'the costs of the 3 saved soldiers differ between the baseline and this build');
  if (!N.stats.normalizeStats({ campaign: { completedEras: ['ancient'] } }).campaign || !('completedEras' in (N.stats.normalizeStats({ campaign: { completedEras: ['ancient'] } }).campaign || {}))) pending.push('stats.campaign.completedEras / stats.eraStats: this build does not keep them yet (REGISTRY, AR 3.5.2)');
}

// ------------------------------------------------------------------------------------------------ save_new_to_v8 and save_roundtrip
const NEW = {
  progress: { eras: { ancient: { opened: true, last: 'thermopylae_snack', cleared: false }, medieval: { opened: true, last: '', cleared: false } }, lastEra: 'medieval' },
  survival: { eras: { medieval: { best: 4321, bestWave: 3, board: [{ score: 4321, waves: 3, date: '2026-10-06' }] } } },
  seen: { basics: true, beats: { medieval_m1_b1: true, medieval_m1_b2: 1790000000000 }, whatsnew: { medieval: 1790000000000 }, callbacks: { thermopylae_snack: true } },
  settings: { goreAuto: true, goreChosen: false, eraQuality: { medieval: 'papyrus' } },
  stats: { campaign: { completedEras: ['ancient'] }, eraStats: { medieval: { shieldBreaks: 7 } } },
};
const LOSSES = [/^settings\.eraQuality(\.|$)/, /^stats\.campaign\.completedEras$/, /^stats\.eraStats(\.|$)/];
const isLoss = (p) => LOSSES.some((r) => r.test(p));
{
  nDev = N.device(FIX.LOCAL_STORAGE);
  const d = nDev.docs;
  d.progress.set('eras', NEW.progress.eras); d.progress.set('lastEra', NEW.progress.lastEra);
  d.survival.set('eras', NEW.survival.eras);
  const hist = d.daily.get('history'); hist[0] = { ...hist[0], era: 'medieval' }; d.daily.set('history', hist);
  for (const k of Object.keys(NEW.seen)) d.seen.set(k, NEW.seen[k]);
  for (const k of Object.keys(NEW.settings)) nDev.settings.set(k, NEW.settings[k]);
  const tot = nDev.stats.totals(); nDev.stats.load({ ...tot, campaign: { ...(tot.campaign || {}), ...NEW.stats.campaign }, eraStats: NEW.stats.eraStats });
  newCode = await nDev.T.exportAll();
  const nDump = nDev.dump(), nLeaves = leaves(nDump);
  const d1 = diffLeaves(fixLeaves, nLeaves);
  const newPaths = d1.onlyB;                                           // every leaf the new profile adds to the v8 profile
  const expectedNew = ['progress.eras.ancient.opened', 'progress.eras.medieval.opened', 'progress.lastEra', 'survival.eras.medieval.best', 'seen.basics', 'seen.beats.medieval_m1_b1', 'seen.whatsnew.medieval', 'seen.callbacks.thermopylae_snack', 'daily.history[0].era', 'settings.goreAuto', 'settings.goreChosen', 'settings.eraQuality.medieval'];
  const missingNew = expectedNew.filter((p) => !nLeaves.has(p));
  // v8 side
  const bDev = B.device();
  const r = await bDev.T.importAll(newCode);
  const warnOk = r.warnings.every((w) => /eraQuality/.test(w));
  bDev.docs.loadAll();
  let reCode = null, reErr = null;
  try { reCode = await bDev.T.exportAll(); } catch (e) { reErr = e; }
  const bLeaves = leaves(bDev.dump());
  const d2 = diffLeaves(nLeaves, bLeaves);
  const survivors = [...nLeaves.keys()].filter((p) => !p.endsWith('#v'));
  const v8Equal = [...fixLeaves.keys()].filter((p) => !bLeaves.has(p) || bLeaves.get(p) !== fixLeaves.get(p));
  const lost = d2.onlyA.filter((p) => !isLoss(p)), gainedUnexpected = d2.onlyB;
  const lostDocumented = d2.onlyA.filter((p) => isLoss(p));
  soft('save_new_to_v8', r.ok === true && r.errors.length === 0 && warnOk && !reErr && missingNew.length === 0 && v8Equal.length === 0 && lost.length === 0 && d2.changed.length === 0 && gainedUnexpected.length === 0
    && !bLeaves.has('settings.eraQuality.medieval') && !bLeaves.has('stats.eraStats.medieval.shieldBreaks') && !bLeaves.has('stats.campaign.completedEras'),
    `import ok ${r.ok} errors ${JSON.stringify(r.errors)} warnings ${JSON.stringify(r.warnings)} re-export error ${reErr && reErr.message}; new keys the new build did not write [${list(missingNew)}]; v8 keys changed in v8 [${list(v8Equal)}]; new keys LOST by v8 [${list(lost)}]; changed [${list(d2.changed)}]; appeared [${list(gainedUnexpected)}]`);
  soft('save_new_to_v8', newPaths.length >= expectedNew.length - 3 && d1.changed.filter((p) => !/^(settings\.|stats\.|daily\.history\[0\]|progress\.)/.test(p)).length === 0, 'adding the new keys changed unrelated v8 keys: ' + list(d1.changed));
  void survivors; void lostDocumented;
  // ---- round trip: v8 -> new
  const nDev2 = N.device();
  const r2 = reCode ? await nDev2.T.importAll(reCode) : { ok: false, errors: ['no re-export'], warnings: [] };
  const n2 = leaves(nDev2.dump());
  const d3 = diffLeaves(bLeaves, n2);
  const survived = [...bLeaves.keys()].filter((p) => !n2.has(p) || n2.get(p) !== bLeaves.get(p));
  // a second round trip is the identity
  const code3 = await nDev2.T.exportAll(), bDev3 = B.device(); const r3 = await bDev3.T.importAll(code3); await bDev3.T.exportAll();
  const d4 = diffLeaves(n2, leaves(bDev3.dump()));
  soft('save_roundtrip', r2.ok === true && survived.length === 0 && d3.onlyB.filter((p) => !isAddedOk(p)).length === 0 && r3.ok === true && d4.changed.length === 0 && d4.onlyA.length === 0,
    `second import ok ${r2.ok} ${JSON.stringify(r2.errors)}; v8 values that did not survive the way back [${list(survived)}]; added on the way back [${list(d3.onlyB)}]; second round trip changed [${list(d4.changed)}] lost [${list(d4.onlyA)}]`);
  // completedEras: recomputed by the new build on load when it knows the key (REGISTRY); eraStats stays empty (documented loss)
  const canRecompute = typeof N.stats.LifetimeStats.prototype.reconcile === 'function';
  if (canRecompute) {
    const ce = nDev2.stats.totals().campaign && nDev2.stats.totals().campaign.completedEras, es = nDev2.stats.totals().eraStats;
    soft('save_roundtrip', JSON.stringify(ce) === JSON.stringify(NEW.stats.campaign.completedEras) && (!es || Object.keys(es).length === 0), `completedEras after the way back ${JSON.stringify(ce)} (want ${JSON.stringify(NEW.stats.campaign.completedEras)}), eraStats ${JSON.stringify(es)} (want empty)`);
  } else pending.push('save_roundtrip: completedEras recomputed from progress.stars on load needs LifetimeStats.reconcile (REGISTRY, AR 3.5.5 step 4)');
}

// ------------------------------------------------------------------------------------------------ save_codes
{
  const ctxOf = (S) => ({ defs: S.defs, abilities: undefined });
  const res = {};
  for (const [S, name] of [[B, 'v8'], [N, 'new']]) {
    res[name] = {};
    for (const type of ['soldier', 'arena', 'army']) {
      try { const r = await S.share.importShare(FIX.SHARE_CODES[type], type, ctxOf(S)); res[name][type] = JSON.parse(JSON.stringify(r.value !== undefined ? r.value : r.arena !== undefined ? r.arena.toJSON() : r)); }
      catch (e) { res[name][type] = 'ERR ' + e.message; }
    }
  }
  const eq = ['soldier', 'arena', 'army'].filter((t) => canonicalJSON(res.v8[t]) === canonicalJSON(res.new[t]) && typeof res.v8[t] === 'object');
  soft('save_codes', eq.length === 3, `v8 and the new build import the share codes to different values or fail: ok for [${eq}], v8 ${JSON.stringify(res.v8).slice(0, 160)}`);
  // a new-era army (unit unknown to v8) is rejected by v8 with the exact message, no crash
  const armyCode = (await N.share.encodeShare('army', { v: 1, name: 'Medieval Mob', records: [{ team: 0, defId: 'knight_of_the_round_table', positions: [[1, 2]], heading: 0, order: 'advance' }] })).code;
  let msg = null; try { await B.share.importShare(armyCode, 'army', { defs: B.defs }); } catch (e) { msg = e.message; }
  soft('save_codes', msg === "Unknown unit 'knight_of_the_round_table' (the code may come from a newer game version)", `v8 message for a new-era army: ${msg}`);
  // an arena code carrying env.era opens in v8 with the Ancient look (unknown env keys are dropped by sanitizeEnv)
  const aj = (await B.share.decodeShare(FIX.SHARE_CODES.arena)).json;
  const withEra = (await N.share.encodeShare('arena', { ...aj, env: { ...(aj.env || {}), era: 'medieval' } })).code;
  let plain = null, era = null;
  try { plain = (await B.share.importShare(FIX.SHARE_CODES.arena, 'arena', {})).arena.toJSON(); era = (await B.share.importShare(withEra, 'arena', {})).arena.toJSON(); } catch (e) { era = 'ERR ' + e.message; }
  soft('save_codes', plain && era && typeof era === 'object' && canonicalJSON(plain) === canonicalJSON(era), 'the arena code with env.era does not open in v8 as the plain Ancient arena: ' + (typeof era === 'string' ? era : 'differs'));
}

// ------------------------------------------------------------------------------------------------ save_v1_chain
{
  const out = {};
  for (const [S, name] of [[B, 'v8'], [N, 'new']]) {
    out[name] = {};
    for (const [k, blob] of Object.entries(V1)) { const doc = k.startsWith('progress') ? 'progress' : k; const r = S.migrate.migrate(doc, JSON.parse(JSON.stringify(blob))); out[name][k] = { ok: r.ok, v: r.v, data: r.data, side: r.side, steps: r.steps }; }
    const payload = { f: 1, app: 'voxelwars', keys: { progress: V1.progress, survival: V1.survival, daily: V1.daily, seen: V1.seen } };
    const dev = S.device(); const r = await dev.T.importAll(JSON.stringify(payload)); out[name].import = { ok: r.ok, errors: r.errors, warnings: r.warnings, applied: r.applied };
    await dev.T.exportAll(); out[name].dump = dev.dump();
  }
  soft('save_v1_chain', canonicalJSON(out.v8) === canonicalJSON(out.new) && Object.keys(out.v8).length === Object.keys(V1).length + 2 && out.v8.import.ok === true,
    'the v1 migration chain differs between the baseline and this build: ' + Object.keys(out.v8).filter((k) => canonicalJSON(out.v8[k]) !== canonicalJSON(out.new[k])).join(', '));
}

// ------------------------------------------------------------------------------------------------ save_ids
{
  const dn = N.device(FIX.LOCAL_STORAGE), unresolved = [];
  const content = await N.T.src('custom');
  const camp = await N.T.src('campaign'), puz = await N.T.src('puzzles'), reg = await N.T.src('blueprints');
  const ach = await N.T.src('achievements');
  const missionIds = new Set(camp.MISSIONS.map((m) => m.id)), puzzleIds = new Set(puz.PUZZLES.map((p) => p.id));
  const prog = dn.docs.progress.all();
  for (const id of Object.keys(prog.stars || {})) if (!missionIds.has(id) && !puzzleIds.has(id)) unresolved.push('star:' + id);
  for (const id of Object.keys(prog.puzzles || {})) if (!puzzleIds.has(id)) unresolved.push('puzzle:' + id);
  const achIds = new Set((ach.ACHIEVEMENTS || ach.default || []).map((a) => a.id));
  for (const id of Object.keys(prog.achievements || {})) if (achIds.size && !achIds.has(id)) unresolved.push('achievement:' + id);
  for (const a of dn.collections.armies.list()) for (const r of a.records || (a.army && a.army.records) || []) if (!dn.defs[r.defId]) unresolved.push('unit:' + r.defId);
  for (const cs of dn.collections.soldiers.list()) {
    const n = content.normalizeSoldier(JSON.parse(JSON.stringify(cs)));
    if (n.warnings.length) unresolved.push('soldier:' + cs.id + ' ' + n.warnings[0]);
    for (const a of cs.abilities || []) if (!content.legalAbilityIds(n.bp).includes(a)) unresolved.push('ability:' + a);
    for (const slot of ['main', 'off', 'helm', 'torso', 'cape']) { const v = cs.blueprint && cs.blueprint[slot]; if (v && reg.PART_REGISTRY && reg.PART_REGISTRY[slot + 's'] && !reg.PART_REGISTRY[slot + 's'][v]) unresolved.push(`part:${slot}:${v}`); }
  }
  const { Arena } = await N.T.imp('src/world/arena.js'); const props = await N.T.src('propCatalog');
  const propIds = new Set((props.PROP_TYPES || props.PROP_IDS || Object.keys(props.PROPS || {}) || []).map ? (props.PROP_TYPES || props.PROP_IDS || Object.keys(props.PROPS || {})) : []);
  for (const a of dn.collections.arenas.list()) { const ar = Arena.fromJSON(a.data || a.arena || a); for (const p of ar.props) if (propIds.size && !propIds.has(p.t)) unresolved.push('prop:' + p.t); }
  soft('save_ids', unresolved.length === 0 && dn.collections.soldiers.list().length === 3 && dn.collections.armies.list().length === 2, 'ids of the v8 profile that no longer resolve: ' + list(unresolved));
}

// ------------------------------------------------------------------------------------------------ save_hidden
{
  const dn = N.device(FIX.LOCAL_STORAGE); await dn.T.exportAll();
  const text = JSON.stringify(dn.dump());
  const eraKeys = (v, p = '') => { const out = []; if (isPlain(v)) for (const [k, x] of Object.entries(v)) { if (k === 'eras' || k === 'whatsnew') out.push(...Object.keys(isPlain(x) ? x : {}).map((e) => `${p}${k}.${e}`)); if (k === 'era' && typeof x === 'string') out.push(`${p}era=${x}`); out.push(...eraKeys(x, p + k + '.')); } else if (Array.isArray(v)) v.forEach((x, i) => out.push(...eraKeys(x, p + i + '.'))); return out; };
  const found = Object.entries(dn.dump()).flatMap(([k, e]) => eraKeys(e.data, k + '.')).filter((x) => !/\.ancient$|era=ancient$/.test(x));
  soft('save_hidden', found.length === 0 && !/medieval|modern|scifi/.test(text.replace(/"id":"[^"]*"/g, '')), 'hidden-era keys written with only the Ancient era released: ' + list(found));
}

for (const p of pending) console.log('PENDING (not a failure): ' + p);
if (c.failures.length) { console.error(`RED ${c.id}: ${c.failures.join(', ')}`); process.exitCode = 1; } else console.log(`ok  ${c.id}: ${c.assertions} assertions${pending.length ? `, ${pending.length} pending (candidate features that do not exist yet)` : ''}`);
c.done();
