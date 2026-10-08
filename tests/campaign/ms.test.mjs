// MS tests (spec/MS.md section 4; criterion MS-T*, owner DESIGN-CAMPAIGN, tier T-fast). The MS lint (tools/ms_lint.mjs), the context builder (tools/ms_context.mjs), the Ancient
// back-fill (tools/ms_backfill_ancient.mjs) and the schema (docs/eras/spec/ms.schema.json) are checked here, each with negative controls run IN PROCESS on mutated copies.
// The same mutations exist as `tests/negctl/MS-*.mjs` files (VF 3.13 shape) that mutate the REAL files and expect the labels below to turn red.
//
//   node tests/campaign/ms.test.mjs                  all checks (about 3 s)
//   MS_SLOW=1 node tests/campaign/ms.test.mjs        adds real-battle summaries of the nine Ancient missions (about 40 s)
//   criteria: one criterion per MS-Txx through tests/lib/criteria.mjs (VF 3.4); the label after the slash is the failure label a negctl expects
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  loadSchema, vocab, validateSchema, schemaKeywordProblems, RULES, lintFile, HELPERS, helperProblems, helperMechanics, compileStar, makeEnv, evaluateStarsJson, evaluatePuzzleStarsJson,
  toLegacyMission, toLegacyPuzzle, legacyPar, msHash, renderText, numbersIn, expandBlock,
} from '../../tools/ms_lint.mjs';
import { buildContext, buildAncientContext, parseMdTables, parseModules, parseFirstThree, parseLadder, parseOutline, stableStringify, contextPath, carriesOf, CARRIES, ERAS } from '../../tools/ms_context.mjs';
import { build as buildBackfill, pretty } from '../../tools/ms_backfill_ancient.mjs';
import { MISSIONS, ACTS, missionHash, evaluateStars, campaignApi, MUTATOR_STARS } from '../../src/content/era_ancient/campaign.js';
import { PUZZLES, evaluatePuzzleStars } from '../../src/content/era_ancient/puzzles.js';
import { REWARD_PARTS, TEACHING_BEATS, TEACHING_SKIP } from '../../src/content/era_ancient/campaign_text.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// docs/ is not part of a negctl copy (tools/lib/negctl_lite.mjs copies src tools tests release only): read it from VW_MAIN_ROOT there
const DOCS = fs.existsSync(path.join(ROOT, 'docs/eras')) ? ROOT : (process.env.VW_MAIN_ROOT || ROOT);
import { criterion } from '../lib/criteria.mjs';
const CRIT = 'MS-T';
const results = [];
const TEXTS = {
  'MS-T01': 'ms.schema.json: only interpreter keywords, no dangling $ref, x-vocab internally consistent (helpers, counters, mechanics, modules of spec/M)', 'MS-T02': 'the Ancient context.json is current and spec/M.md yields 19 modules and the three E-FREEZE sets',
  'MS-T03': 'the markdown contexts of the three new eras parse to the exact counts of plan section 1 (34 units, 12 arenas, 38 props, 6 puzzles, 5 bosses, 9 ladder rows) with costs and the first-three-minutes index',
  'MS-T04': 'the Ancient missions.json is a current, lossless back-fill: toLegacyMission/Puzzle equal campaign.js/puzzles.js field by field and missionHash round-trips', 'MS-T05': 'the lint accepts the Ancient exemplar with zero errors and zero warnings',
  'MS-T06': 'every closed-vocabulary helper equals its Ancient predicate on a boundary-seeking fuzz (evaluateStars and evaluatePuzzleStars), with mutants of every helper caught', 'MS-T07': 'the Ancient star table and par mapping',
  'MS-T08': 'every lint rule family has a negative control on a mutated copy of the Ancient exemplar', 'MS-T09': 'a lint-valid scaffold of each new era (from the binding ladder, the markdown contexts and the outline numbers) and a negative control for every new-era rule',
  'MS-T10': 'spec/MS.md names every rule, helper, counter, mechanic and op, and its generated tables are current', 'MS-T11': 'real-battle summaries of the nine Ancient missions evaluate identically through the JSON helpers (MS_SLOW=1)',
};
const CR = {};
const crit = (id) => CR[id] || (CR[id] = criterion(id, { er: 'MS', owner: 'DESIGN-CAMPAIGN', tier: id === 'MS-T11' ? 'release' : 'T-fast', negctl: fs.existsSync(path.join(DOCS, 'tests/negctl/' + id + '.mjs')) || fs.existsSync(path.join(ROOT, 'tests/negctl/' + id + '.mjs')) ? 'tests/negctl/' + id + '.mjs' : undefined, text: TEXTS[id] || id }));
async function check(label, fn) {
  const t0 = performance.now(), [id, ...rest] = label.split('/'), name = rest.join('/'), h = crit(id);
  try { await fn(); h.soft(name, true); results.push([label, true, performance.now() - t0]); } catch (e) { h.soft(name, false); results.push([label, false, performance.now() - t0, e]); }
}
const clone = (x) => JSON.parse(JSON.stringify(x));
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(DOCS, rel), 'utf8'));
const strip = (v) => JSON.parse(JSON.stringify(v, (k, x) => (typeof x === 'function' ? '[fn]' : x)));
const codes = (r) => r.errors.concat(r.warnings).map((x) => x.code);
const MD = (rel) => fs.readFileSync(path.join(DOCS, rel), 'utf8');

// a small deterministic generator (the tests must not depend on Math.random)
function lcg(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

const SCHEMA = loadSchema(), V = vocab();
const DOC = readJson('docs/eras/design/ancient/missions.json');
const CTX = readJson('docs/eras/design/ancient/context.json');
const ENV = makeEnv(CTX);
CTX.events = CTX.events || (await (async () => { const ev = await import('../../src/core/events.js'); return { existing: Object.keys(ev.EVENTS), m: [] }; })());

// ============================================================================================================================ MS-T01 schema file and vocabulary
await check(CRIT + '01/schema_subset', () => {
  assert.deepEqual(schemaKeywordProblems(SCHEMA), [], 'the schema uses a keyword the interpreter does not implement');
  const refs = []; JSON.stringify(SCHEMA, (k, v) => { if (k === '$ref') refs.push(v); return v; });
  for (const r of refs) { const parts = r.replace(/^#\//, '').split('/'); let t = SCHEMA; for (const p of parts) t = t[p]; assert.ok(t, 'dangling $ref ' + r); }
  assert.ok(SCHEMA.$defs.mission && SCHEMA.$defs.puzzle && SCHEMA.$defs.file, 'mission, puzzle and file defs');
  for (const [name, d] of Object.entries(SCHEMA.$defs)) if (d.type === 'object' && d.properties && d.additionalProperties !== false && !['arena', 'condition', 'where', 'override'].includes(name)) assert.fail('def ' + name + ' must be closed (additionalProperties:false)');
});
await check(CRIT + '01/vocab_consistent', () => {
  const mods = parseModules(MD('docs/eras/spec/M.md')).modules.map((m) => m.id);
  for (const [h, d] of Object.entries(V.helpers)) {
    assert.ok(HELPERS[h], 'helper ' + h + ' has no reference implementation'); assert.ok(d.doc && d.doc.length > 20, h + ' needs a definition string');
    for (const c of d.counters) assert.ok(V.counters[c], h + ' reads unknown counter ' + c);
    assert.ok(d.star.every((k) => k === 2 || k === 3));
  }
  for (const h of Object.keys(HELPERS)) assert.ok(V.helpers[h], 'implementation without vocabulary row: ' + h);
  for (const h of Object.keys(V.rejectedHelpers)) assert.ok(!V.helpers[h], 'rejected helper ' + h + ' is also accepted');
  for (const [c, d] of Object.entries(V.counters)) { assert.ok(['event', 'world'].includes(d.kind), c); assert.ok(d.doc, c + ' needs a doc'); if (d.module) assert.ok(mods.includes(d.module), c + ': module ' + d.module + ' not in spec/M'); if (d.kind === 'event') { assert.ok(d.event && d.of, c); assert.deepEqual(validateSchema(Object.assign({ id: c }, strip(Object.fromEntries(Object.entries(d).filter(([k]) => ['kind', 'event', 'of', 'side', 'where', 'add', 'distinct', 'by', 'first', 'unit'].includes(k))))), { $ref: '#/$defs/counterRule' }, SCHEMA), [], 'counter ' + c + ' violates the counterRule def'); } }
  for (const [era, ms] of Object.entries(V.mechanics)) for (const [id, m] of Object.entries(ms)) { assert.ok(V.counters[m.counter], era + '.' + id + ': counter ' + m.counter + ' undefined'); for (const x of m.modules) assert.ok(mods.includes(x), era + '.' + id + ': unknown module ' + x); }
  for (const [era, hs] of Object.entries(V.headline)) for (const h of hs) assert.ok(V.mechanics[era][h], 'headline ' + era + '.' + h + ' is not a mechanic');
  assert.deepEqual(Object.keys(V.eraPrefix), V.eras); assert.equal(Object.keys(V.helpers).length, 25);
});
await check(CRIT + '01/schema_interpreter', () => {
  const S = { type: 'object', required: ['a'], additionalProperties: false, properties: { a: { type: 'integer', minimum: 1 }, b: { enum: ['x', 'y'] }, c: { type: 'array', items: { type: 'string' }, minItems: 1, uniqueItems: true }, d: { oneOf: [{ const: 1 }, { type: 'string' }] }, e: { anyOf: [{ type: 'null' }, { type: 'number' }] } }, allOf: [{ if: { properties: { b: { const: 'x' } }, required: ['b'] }, then: { required: ['c'] } }] };
  const ok = { a: 2, b: 'x', c: ['q'], d: 'z', e: null };
  assert.deepEqual(validateSchema(ok, S, S), []);
  const bad = (v, frag) => { const e = validateSchema(v, S, S).map((x) => x.path + ' ' + x.msg).join(' | '); assert.ok(e.includes(frag), 'expected "' + frag + '" in: ' + e); };
  bad({}, 'required'); bad({ a: 0 }, 'minimum'); bad({ a: 1.5 }, 'expected integer'); bad({ a: 1, z: 1 }, 'unknown property'); bad({ a: 1, b: 'q' }, 'one of'); bad({ a: 1, b: 'x' }, '/c');
  bad({ a: 1, c: [] }, 'fewer than'); bad({ a: 1, c: ['a', 'a'] }, 'duplicate'); bad({ a: 1, d: 5 }, 'matches none'); bad({ a: 1, e: 's' }, 'matches none');
  // negative control: a broken interpreter (type check disabled) is caught by the same cases
  const sloppy = validateSchema({ a: 'str' }, { type: 'object', properties: { a: { type: 'integer' } } });
  assert.equal(sloppy.length, 1);
});

// ============================================================================================================================ MS-T02 context
await check(CRIT + '02/modules_from_spec_m', () => {
  const m = parseModules(MD('docs/eras/spec/M.md'));
  assert.equal(m.modules.length, 19); assert.deepEqual(m.modules.map((x) => x.pos), Array.from({ length: 19 }, (_, i) => i + 1));
  assert.equal(m.eFreeze.medieval, 13); assert.equal(m.eFreeze.modern, 16); assert.equal(m.eFreeze.scifi, 19);
  assert.ok(m.freezeSets.medieval.length === 13 && m.freezeSets.modern.length === 16 && m.freezeSets.scifi.length === 19);
});
await check(CRIT + '02/ancient_context_current', async () => {
  const fresh = await buildAncientContext(ROOT);
  assert.equal(stableStringify(fresh), stableStringify(JSON.parse(fs.readFileSync(contextPath('ancient', DOCS), 'utf8'))), 'docs/eras/design/ancient/context.json is stale: node tools/ms_context.mjs --era=ancient --write');
  assert.equal(Object.keys(fresh.units).length, 43); assert.equal(Object.keys(fresh.props).length, 41); assert.equal(Object.keys(fresh.recipes).length, 16); assert.equal(fresh.puzzles.length, 6); assert.equal(fresh.godPowers.length, 6); assert.equal(fresh.mutators.length, 9);
});
const EXPECT = { units: 34, recipes: 12, props: 38, puzzles: 6, bosses: 5, ladder: 9, godPowers: 6, mutators: 2 };
const NEW_CTX = {};
for (const era of ERAS.filter((e) => e !== 'ancient')) {
  await check(CRIT + '03/markdown_context_' + era, async () => {
    const c = NEW_CTX[era] = await buildContext(era);
    assert.equal(Object.keys(c.units).length, EXPECT.units, era + ' units'); assert.equal(Object.keys(c.recipes).length, EXPECT.recipes, era + ' arenas'); assert.equal(Object.keys(c.props).length, EXPECT.props, era + ' props');
    assert.equal(c.puzzles.length, EXPECT.puzzles); assert.equal(c.bosses.length, EXPECT.bosses); assert.equal(c.ladder.length, EXPECT.ladder); assert.equal(c.godPowers.length, EXPECT.godPowers); assert.equal(c.mutators.length, EXPECT.mutators);
    assert.deepEqual(c.ladder.map((r) => r.n), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const [id, u] of Object.entries(c.units)) { assert.ok(/^[a-z][a-z0-9_]*$/.test(id), id); assert.ok(u.cost > 0, era + ' unit ' + id + ' has no cost'); assert.ok(u.faction && u.role, id); assert.ok(!CTX.units[id], era + ' unit id ' + id + ' collides with Ancient'); }
    const pfx = V.eraPrefix[era];
    for (const id of Object.keys(c.props)) assert.ok(id.startsWith(pfx) || /^any_/.test(id), era + ' prop ' + id + ' lacks the prefix');
    for (const id of Object.keys(c.recipes)) assert.ok(id.startsWith(pfx), era + ' arena ' + id);
    for (const b of c.bosses) assert.ok(c.units[b], era + ' boss ' + b + ' is not a roster unit');
    for (const p of c.puzzles) { assert.ok(c.recipes[p.arena], era + ' puzzle ' + p.id + ' arena ' + p.arena); assert.ok(p.roster.length >= 1, p.id + ' roster'); assert.ok(p.par < p.budget, p.id); }
    for (const r of c.ladder) assert.ok(c.recipes[r.arena], era + ' ladder arena ' + r.arena);
    assert.ok(c.firstThree.fresh.length >= 10 && c.firstThree.returning.length >= 6, 'first-three-minutes parse');
    assert.ok(c.firstThree.fresh.some((x) => x.kind === 'setpiece') && c.firstThree.fresh.every((x) => x.kind !== 'beat' || /^(b_|[a-z]+_)/.test(x.id)));
    assert.equal(c.eFreeze[era], { medieval: 13, modern: 16, scifi: 19 }[era]);
  });
}
await check(CRIT + '03/parsers_negative_control', () => {
  // a table with a renamed header column is NOT silently accepted as the master table
  assert.equal(parseMdTables('| ident | name |\n|---|---|\n| `a` | A |\n').length, 1);
  assert.throws(() => { const ctxSrc = '| ident | faction |\n|---|---|\n| `a` | x |\n'; const t = parseMdTables(ctxSrc); if (!t.find((x) => /^id$/i.test(x.header[0]))) throw new Error('no master table'); }, /no master table/);
  assert.deepEqual(parseLadder('| # | id | arena | objective |\n|---|---|---|---|\n| 2 | `b_two` | `arena_b` | kill_general (x) |\n| 1 | `a_one` | `arena_a` | eliminate |\n'), [{ n: 1, id: 'a_one', objective: 'eliminate', arena: 'arena_a' }, { n: 2, id: 'b_two', objective: 'kill_general', arena: 'arena_b' }]);
  const f = parseFirstThree('### 1.1 Fresh-player beat order for ER19 (ids)\n\n`arrival.x` (own key), `b_a`, [toast `fs_t`], `x_sp_y` (set-piece), [toasts `fs_u`, `fs_v`], [toasts], `x_z`.\n\n### 2.1 Returning-player beat order for ER19\n\n`x_z`.\n');
  assert.deepEqual(f.fresh.map((x) => x.kind + ':' + x.id), ['arrival:arrival.x', 'beat:b_a', 'toast:fs_t', 'setpiece:x_sp_y', 'toast:fs_u', 'toast:fs_v', 'beat:x_z']); assert.deepEqual(f.returning.map((x) => x.id), ['x_z']);
});

await check(CRIT + '03/carries_predicates', () => {
  const t = (era, def, want) => assert.deepEqual(carriesOf(def, era), want, era + ' ' + JSON.stringify(def));
  t('medieval', { tags: ['pike'] }, ['brace']); t('medieval', { abilities: [{ id: 'aura', effect: 'banner' }] }, ['colours']); t('medieval', { ranged: { pen: 0.55, mag: 1 } }, ['bolts']); t('medieval', { layer: 'air' }, ['air']);
  t('medieval', { ranged: { arc: 'high', structDmg: 2 } }, ['arc', 'gates']); t('medieval', { abilities: [{ id: 'summon_on_death', mode: 'bailout' }] }, ['charge']); t('medieval', { abilities: [{ id: 'heal_pulse' }] }, ['healers']); t('medieval', { melee: {}, ranged: { type: 'fire' } }, ['fire']);
  t('modern', { ranged: { suppress: { r: 2, amt: 0.04 } } }, []); t('modern', { ranged: { suppress: { r: 3, amt: 0.3 } } }, ['pin']); t('modern', { armorFace: { front: 0.9 } }, ['armour']); t('modern', { ranged: { arc: 'high', minRange: 20 } }, ['shells']);
  t('modern', { abilities: [{ id: 'lay_mine' }] }, ['mines']); t('modern', { abilities: [{ id: 'heal_pulse' }], layer: 'air' }, ['air', 'repair']);
  t('scifi', { eshield: { cap: 40 } }, ['shield']); t('scifi', { layer: 'hover' }, ['hover']); t('scifi', { abilities: [{ id: 'cloak' }] }, ['cloak']); t('scifi', { abilities: [{ id: 'cc_field', effect: 'emp' }] }, ['emp']);
  t('scifi', { abilities: [{ id: 'dash', kind: 'blink' }, { id: 'call_strike' }] }, ['blink', 'strike']); t('ancient', { layer: 'air', eshield: {} }, []);
  for (const [era, tab] of Object.entries(CARRIES)) for (const id of Object.keys(tab)) assert.ok(V.mechanics[era][id], 'CARRIES names mechanic ' + era + '.' + id + ' which the vocabulary lacks');
  for (const [era, ms] of Object.entries(V.mechanics)) for (const id of Object.keys(ms)) assert.ok(CARRIES[era][id], 'mechanic ' + era + '.' + id + ' has no carries predicate');
  assert.deepEqual(parseOutline('#### Mission 1\n- **Player**: x. **Budget** 3,000. **Par** `{type:\'cost\', value:2250}`. \n- **Time limit** 240 s.\n- **Star 2** half. **Star 3**: `thrift(2250)`: x\n- **requiresModules**: M0, M2b (soft, x), M13 (soft). **Expected attempts** 1.5 / 3.0.\n')[0], { budget: 3000, par: { type: 'cost', value: 2250 }, timeLimit: 240, attempts: { star1: 1.5, star3: 3 }, hard: ['M0'], soft: ['M2b', 'M13'], allModules: false, star3: { helper: 'thrift', args: [2250] } });
});
// ============================================================================================================================ MS-T04 the Ancient back-fill equals the real modules
await check(CRIT + '04/backfill_current', async () => {
  const fresh = await buildBackfill();
  assert.equal(pretty(fresh) + '\n', fs.readFileSync(path.join(DOCS, 'docs/eras/design/ancient/missions.json'), 'utf8'), 'missions.json is stale: node tools/ms_backfill_ancient.mjs');
});
const norm = (m) => strip(Object.assign({}, m, { stars: m.stars.map((s) => ({ id: s.id, text: s.text, hasTest: typeof s.test === 'function' })) }));
await check(CRIT + '04/missions_equal_campaign_js', () => {
  assert.equal(DOC.missions.length, 9); assert.deepEqual(DOC.missions.map((m) => m.id), MISSIONS.map((m) => m.id));
  DOC.missions.forEach((j, i) => assert.deepEqual(norm(toLegacyMission(j, i, CTX, DOC)), norm(MISSIONS[i]), 'mission ' + j.id));
  assert.deepEqual(DOC.acts.map((a) => ({ id: a.id, title: a.title, blurb: a.blurb })), ACTS.map((a) => ({ id: a.id, title: a.title, blurb: a.blurb })));
  assert.deepEqual(DOC.rewardParts, strip(REWARD_PARTS)); assert.deepEqual(DOC.legacy.mutatorStars, MUTATOR_STARS); assert.deepEqual(DOC.legacy.teachingSkip, TEACHING_SKIP); assert.deepEqual(DOC.legacy.teachingBeats, strip(TEACHING_BEATS));
  assert.deepEqual(DOC.missions.map((m) => m.act), MISSIONS.map((m) => m.act));
});
await check(CRIT + '04/puzzles_equal_puzzles_js', () => {
  assert.equal(DOC.puzzles.length, 6);
  DOC.puzzles.forEach((j, i) => assert.deepEqual(norm(toLegacyPuzzle(j, i, CTX)), norm(Object.assign({}, PUZZLES[i], { solution: undefined })), 'puzzle ' + j.id));
});
await check(CRIT + '04/missionHash_roundtrip', () => {
  DOC.missions.forEach((j, i) => {
    assert.equal(missionHash(toLegacyMission(j, i, CTX, DOC)), missionHash(MISSIONS[i]), 'campaign.js missionHash of the JSON-generated mission differs: ' + j.id);
    assert.equal(msHash(j).length, 8);
  });
  const hs = DOC.missions.map(msHash); assert.equal(new Set(hs).size, 9, 'msHash must separate the nine missions');
  const j2 = clone(DOC.missions[0]); j2.budget += 1; assert.notEqual(msHash(j2), msHash(DOC.missions[0]), 'negative control: a gameplay change changes the hash');
  const j3 = clone(DOC.missions[0]); j3.text.title += ' x'; assert.equal(msHash(j3), msHash(DOC.missions[0]), 'copy does not change the hash');
});
await check(CRIT + '04/puzzle_block_sugar', () => {
  const sw = DOC.puzzles.find((p) => p.id === 'spear_wall').enemy.placements;
  assert.deepEqual(expandBlock('companion_cavalry', 4, 30, 0, { cols: 2, spacing: 2.2, order: 'advance' }), sw);
});

// ============================================================================================================================ MS-T05 the lint accepts the exemplar
await check(CRIT + '05/lint_accepts_ancient', () => {
  const r = lintFile(DOC, CTX);
  assert.deepEqual(r.errors, [], formatErr(r)); assert.deepEqual(r.warnings, [], 'warnings: ' + JSON.stringify(r.warnings));
});
function formatErr(r) { return r.errors.slice(0, 8).map((e) => e.code + ' ' + e.path + ' ' + e.msg).join('\n'); }
await check(CRIT + '05/rule_catalogue', () => {
  for (const [c, [sev, text]] of Object.entries(RULES)) { assert.match(c, /^MS-[A-Z]\d\d$/); assert.ok('EWI'.includes(sev) && text.length > 10, c); }
  assert.ok(Object.keys(RULES).length >= 85, 'rule count ' + Object.keys(RULES).length);
});

// ============================================================================================================================ MS-T06 helpers equal the Ancient predicates (differential fuzz)
function genSummary(rnd, m, env) {
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const near = (k, spread) => pick([k - spread, k, k + spread, k * rnd() * 2, rnd() * k * 3]);
  const defsPool = Array.from(new Set((m.roster || Object.keys(CTX.units)).concat(Object.keys(CTX.units).slice(0, 6), ['spartan', 'war_elephant', 'hoplite'])));
  const counts = (maxN) => { const o = {}; for (let i = 0, n = Math.floor(rnd() * 5); i < n; i++) o[pick(defsPool)] = Math.floor(rnd() * maxN); return o; };
  const startDefs = counts(12), lostDefs = counts(8), aliveDefs = counts(14);
  if (rnd() < 0.5) { startDefs.spartan = pick([5, 6, 7, 8]); lostDefs.spartan = pick([0, 0, 1]); }
  if (rnd() < 0.4) aliveDefs.war_elephant = pick([0, 1, 2]);
  const heroIds = CTX.heroes; if (rnd() < 0.5) startDefs[pick(heroIds)] = pick([0, 1, 2]);
  const par = m.par.value || 2250;
  const spent = Math.floor(near(par, 1)); const pcs = rnd() < 0.8 ? spent : Math.floor(near(par, 3));
  const thr = [75, 90, 100, 70, 45, 120];
  const s = {
    kind: 'battle_end', mission: pick([m.id, m.id, m.id, m.id, 'other_mission', undefined]), win: rnd() < 0.9, draw: rnd() < 0.05, t: Math.round(near(pick(thr), 0.01) * 100) / 100,
    playerCostStart: pcs, spent, aliveDefs, startDefs, lostDefs, vipDef: pick(['battle_goat', 'battle_goat', null, 'hoplite']), vipDamage: pick([0, 0, 0.5, 3, 10]),
    propDownT: rnd() < 0.7 ? { gate_door: [Math.round(near(100, 0.01) * 10) / 10, 140, 60].slice(0, 1 + Math.floor(rnd() * 3)) } : {}, friendlyKills: pick([0, 0, 1]), friendlyHits: pick([0, 0, 2]), heroesLost: pick([0, 0, 1]),
    unitsLost: Math.floor(near(2, 1)), stonedUnits: pick([0, 0, 3]), enemyDownT: rnd() < 0.7 ? { war_elephant: [Math.round(near(45, 0.01) * 10) / 10, 80] } : {},
  };
  if (rnd() < 0.2) { const d0 = pick(Object.keys(CTX.units)); const k0 = 1 + Math.floor(rnd() * 6); s.aliveDefs = { [d0]: k0 }; s.playerCostStart = 2 * k0 * CTX.units[d0].cost + pick([0, 0, 1, -1]); }
  if (s.mission === undefined) delete s.mission; if (s.win === false || rnd() < 0.05) s.win = s.win !== false ? 'yes' : false;
  return s;
}
function differential(helpers, N = 400) {
  const rnd = lcg(20261008); let compared = 0, trues = {};
  const E = Object.assign({}, ENV);
  const saved = Object.assign({}, HELPERS); Object.assign(HELPERS, helpers || {});
  try {
    for (const [i, j] of DOC.missions.entries()) {
      const m = MISSIONS[i];
      for (let k = 0; k < N; k++) {
        const s = genSummary(rnd, j, E);
        const a = evaluateStars(m, s), b = evaluateStarsJson(j, s, E);
        assert.deepEqual(b, a, 'evaluateStars differs for ' + j.id + ' on ' + JSON.stringify(s));
        compared++; if (a.earned[2]) trues[j.id] = (trues[j.id] || 0) + 1;
      }
    }
    for (const [i, j] of DOC.puzzles.entries()) {
      const p = PUZZLES[i];
      for (let k = 0; k < N; k++) {
        const s = genSummary(rnd, { id: j.id, par: j.par, roster: j.player.roster }, E); s.mission = pick1(rnd, [j.id, j.id, j.id, 'x']); if (s.mission === 'x') delete s.mission;
        assert.deepEqual(evaluatePuzzleStarsJson(j, s, E), evaluatePuzzleStars(p, s), 'evaluatePuzzleStars differs for ' + j.id);
        compared++;
      }
    }
  } finally { Object.keys(HELPERS).forEach((k) => delete HELPERS[k]); Object.assign(HELPERS, saved); }
  return { compared, trues };
}
const pick1 = (rnd, a) => a[Math.floor(rnd() * a.length)];
await check(CRIT + '06/helpers_equal_ancient_predicates', () => {
  const r = differential();
  assert.ok(r.compared >= 9 * 400 + 6 * 400);
  for (const j of DOC.missions) assert.ok((r.trues[j.id] || 0) >= 10, 'the fuzz must exercise both outcomes of the star-3 test of ' + j.id + ' (true count ' + (r.trues[j.id] || 0) + ')');
});
await check(CRIT + '06/differential_negative_controls', () => {
  const mutants = {
    thrift_lt: { thrift: (s, [p]) => s.playerCostStart < p }, underTime_lt: { underTime: (s, [x]) => s.t < x }, noLoss_min: { noLoss: (s, [d, m = 1]) => d.reduce((a, k) => a + (s.startDefs[k] | 0), 0) >= m - 1 && d.reduce((a, k) => a + (s.lostDefs[k] | 0), 0) === 0 },
    keptAlive_gt: { keptAlive: (s, [d, n]) => ((s.aliveDefs[d] | 0)) > n }, vip_loose: { vipUntouched: (s, [d]) => s.vipDef === d }, prop_max: { propDownBy: (s, [t, x]) => { const g = s.propDownT && s.propDownT[t]; return !!g && g.length > 0 && Math.max.apply(null, g) <= x; } },
    ff_hits_only: { noFriendlyFire: (s) => (s.friendlyHits | 0) === 0 }, hero_any: { heroesAlive: (s) => (s.heroesLost | 0) === 0 }, frac_gt: { aliveCostFrac: (s, [f], env) => { const start = s.playerCostStart > 0 ? s.playerCostStart : 1; return Object.keys(s.aliveDefs).reduce((a, k) => a + s.aliveDefs[k] * ((env.units[k] || {}).cost || 0), 0) / start > f; } },
    losses_lt: { lossesAtMost: (s, [n]) => (s.unitsLost | 0) < n }, enemyDown_last: { enemyDownBy: (s, [d, x]) => { const e = s.enemyDownT && s.enemyDownT[d]; return !!e && e.length > 0 && e[e.length - 1] <= x; } },
    summary_lt: { summaryAtMost: (s, [f, n]) => (s[f] | 0) < n }, spent_lt: { spentAtMost: (s, [p]) => s.spent < p },
  };
  for (const [name, h] of Object.entries(mutants)) assert.throws(() => differential(h, 300), /differs/, 'the differential test did not catch mutant ' + name);
});
await check(CRIT + '06/new_helpers_unit_cases', () => {
  const E = { units: { a: { cost: 100 }, b: { cost: 50 } }, mechanics: V.mechanics.medieval, heroes: [] };
  const t = (h, args, s, want) => assert.equal(HELPERS[h](s, args, E), want, h + JSON.stringify(args) + ' on ' + JSON.stringify(s));
  t('usedMechanic', ['brace', 4], { counters: { brace_break: 4 } }, true); t('usedMechanic', ['brace', 4], { counters: { brace_break: 3 } }, false); t('usedMechanic', ['brace', 4], {}, false);
  t('usedMechanic', ['healers', 1000], { counters: { heal_hp: 1000 } }, true); t('usedAll', [['brace', 'colours'], 3], { counters: { brace_break: 3, banner_fall: 3 } }, true); t('usedAll', [['brace', 'colours'], 3], { counters: { brace_break: 3, banner_fall: 2 } }, false);
  t('aliveCostFrac', [0.5], { playerCostStart: 200, aliveRoster: { a: 1 }, aliveDefs: { a: 5 } }, true); t('aliveCostFrac', [0.5], { playerCostStart: 200, aliveRoster: { a: 0, b: 1 }, aliveDefs: { a: 5 } }, false);
  t('propStanding', ['gate'], { propsAlive: { gate: 1 } }, true); t('propStanding', ['gate'], { propsAlive: { gate: 0 } }, false); t('propStanding', ['gate'], {}, false);
  t('burnKills', ['siege', 2], { countersBy: { fire_kill: { siege: 2 } } }, true); t('burnKills', ['siege', 2], { countersBy: { fire_kill: { siege: 1 } } }, false);
  t('shellsOnTarget', ['cinderwyrm', 1], { countersBy: { shell_hit: { cinderwyrm: 1 } } }, true); t('shellsOnTarget', ['cinderwyrm', 1], { countersBy: { shell_hit: { other: 9 } } }, false);
  t('hitsDuringReload', [10], { counters: { reload_hit: 10 } }, true); t('hitsDuringReload', [10], { counters: { reload_hit: 9 } }, false);
  t('bannerDownBy', ['standard_bearer', 75], { firstT: { 'banner_fall:standard_bearer': 75 } }, true); t('bannerDownBy', ['standard_bearer', 75], { firstT: { 'banner_fall:standard_bearer': 75.1 } }, false); t('bannerDownBy', ['standard_bearer', 75], { firstT: {} }, false);
  t('coverFracAtLeast', [0.35], { counters: { unit_ticks: 100, cover_unit_ticks: 35 } }, true); t('coverFracAtLeast', [0.35], { counters: { unit_ticks: 100, cover_unit_ticks: 34 } }, false); t('coverFracAtLeast', [0.35], { counters: {} }, false);
  t('hitsWhileReloadingAtMost', [6], { counters: { reload_hit_taken: 6 } }, true); t('hitsWhileReloadingAtMost', [6], { counters: { reload_hit_taken: 7 } }, false); t('hitsWhileReloadingAtMost', [6], {}, true);
  t('ownBreaksAtMost', [30], { counters: { own_shield_break: 30 } }, true); t('ownBreaksAtMost', [30], { counters: { own_shield_break: 31 } }, false);
  t('vipShieldNeverBroken', [], { vipDef: 'bubble_tender', counters: {} }, true); t('vipShieldNeverBroken', [], { vipDef: 'bubble_tender', counters: { vip_shield_break: 1 } }, false); t('vipShieldNeverBroken', [], { vipDef: null, counters: {} }, false);
  t('coreHpAtLeast', [0.6], { coreHpFrac: 0.6 }, true); t('coreHpAtLeast', [0.6], { coreHpFrac: 0.59 }, false); t('coreHpAtLeast', [0.6], { coreHpFrac: null }, false); t('coreHpAtLeast', [0], {}, false);
  t('keptAlive', ['a', 2], { aliveRoster: { a: 1 }, aliveDefs: { a: 9 } }, false);   // spawned units never count
  t('spentAtMost', [100], { spent: 100, playerCostStart: 900 }, true); t('thrift', [100], { spent: 100, playerCostStart: 900 }, false);
  assert.equal(HELPERS.usedMechanic({ counters: {} }, ['nonesuch', 1], E), false);
});
await check(CRIT + '06/helper_arity_and_types', () => {
  const ctx = Object.assign({}, CTX, { era: 'medieval', units: Object.assign({}, CTX.units, { pikeman: { cost: 1 } }), props: Object.assign({}, CTX.props, { med_castle_gate: {} }) });
  const p = (n, a) => helperProblems(n, a, ctx, { timeLimit: 240 });
  assert.deepEqual(p('thrift', [2250]), []); assert.ok(p('thrift', []).length); assert.ok(p('thrift', [1, 2]).length); assert.ok(p('thrift', ['x']).length);
  assert.deepEqual(p('usedMechanic', ['brace', 4]), []); assert.ok(p('usedMechanic', ['zzz', 4]).length); assert.ok(p('usedMechanic', ['reload', 4]).length, 'reload is a Modern mechanic');
  assert.deepEqual(p('noLoss', [['hoplite']]), []); assert.deepEqual(p('noLoss', [['hoplite'], 6]), []); assert.ok(p('noLoss', [['zzz']]).length); assert.ok(p('noLoss', ['hoplite']).length);
  assert.deepEqual(p('propStanding', ['med_castle_gate']), []); assert.ok(p('propStanding', ['zzz']).length);
  assert.ok(p('underTime', [999]).length, 'seconds beyond the time limit'); assert.ok(p('coreHpAtLeast', [1.5]).length);
  for (const bad of ['shieldsBroken', 'suppressed', 'gateBrokenBy', 'aliveAtLeast', 'cloakKills', 'vipSurvived']) assert.match(p(bad, [1])[0], /not in the vocabulary/);
  assert.match(p('nonesuch', [])[0], /unknown helper/);
  assert.deepEqual(helperMechanics('usedAll', [['brace', 'colours'], 1]), ['brace', 'colours']); assert.deepEqual(helperMechanics('bannerDownBy', ['x', 1], 'medieval'), ['colours']); assert.deepEqual(helperMechanics('bannerDownBy', ['x', 1], 'modern'), []); assert.deepEqual(helperMechanics('hitsDuringReload', [1], 'modern'), ['reload']); assert.deepEqual(helperMechanics('hitsDuringReload', [1], 'medieval'), ['bolts']); assert.deepEqual(helperMechanics('thrift', [1]), []);
});
await check(CRIT + '06/copy_truth_numbers', () => {
  assert.deepEqual(numbersIn('Win while spending under 2,250 drachmae.'), [2250]); assert.deepEqual(numbersIn('Star 3 needs at least six Spartans, one hero, in 75 seconds'), [6, 75]);
  assert.deepEqual(numbersIn('Star 3: finish in under ninety seconds'), []);
  assert.equal(renderText('Spend {par} of {budget} in {arg0}', { par: { value: 2250 }, budget: 3000, timeLimit: 300, starTests: [0, 0, { args: [90] }] }), 'Spend 2,250 of 3,000 in 90');
});

// ============================================================================================================================ MS-T07 hand-written helper table equals the table in the Ancient exemplar
await check(CRIT + '07/ancient_star_table', () => {
  const want = ['thrift', 'noLoss', 'underTime', 'vipUntouched', 'keptAlive', 'underTime', 'propDownBy', 'noFriendlyFire', 'heroesAlive'];
  assert.deepEqual(DOC.missions.map((m) => m.starTests[2].helper), want);
  assert.deepEqual(DOC.puzzles.map((p) => p.bonus.helper), ['lossesAtMost', 'lossesAtMost', 'enemyDownBy', 'propDownBy', 'vipUntouched', 'summaryAtMost']);
  for (const j of DOC.missions) { assert.deepEqual(j.starTests[0], { id: 'win' }); assert.deepEqual(j.starTests[1], { id: 'half', helper: 'aliveCostFrac', args: [0.5] }); }
  // thrift(par) equals par.value on the only Ancient mission that uses it
  assert.equal(DOC.missions[0].starTests[2].args[0], DOC.missions[0].par.value);
  assert.equal(legacyPar({ type: 'time', value: 150 }), 0); assert.equal(legacyPar({ type: 'cost', value: 7 }), 7);
});

// ============================================================================================================================ MS-T08 lint negative controls (mutations of the Ancient exemplar)
const mut = (fn) => { const d = clone(DOC); const c = clone(CTX); const o = {}; fn(d, c, o); return { d, c, o }; };
const NEG = [
  ['S_missing_budget', 'MS-S01', (d) => { delete d.missions[0].budget; }],
  ['S_extra_property', 'MS-S01', (d) => { d.missions[2].bogus = 1; }],
  ['S_bad_enum_mood', 'MS-S01', (d) => { d.missions[0].mood = 'grumpy'; }],
  ['F01_prefix', 'MS-F01', (d) => { d.idPrefix = 'med_'; }],
  ['F02_act_split', 'MS-F02', (d) => { d.missions[4].act = 3; }],
  ['F03_legacy_missing', 'MS-F03', (d) => { delete d.legacy; }],
  ['F04_part_not_catalogued', 'MS-F04', (d) => { delete d.rewardParts.silly_helms; }],
  ['I01_new_era_prefix_in_ancient', 'MS-I01', (d) => { d.missions[0].id = 'med_marathon'; }],
  ['I02_duplicate_id', 'MS-I02', (d) => { d.missions[1].id = d.missions[0].id; }],
  ['I03_other_era_collision', 'MS-I03', (d, c, o) => { o.otherIds = { medieval: ['marathon_sort_of'] }; }],
  ['R01_unknown_unit_roster', 'MS-R01', (d) => { d.missions[0].roster.push('pikeman'); }],
  ['R01_unknown_unit_enemy', 'MS-R01', (d) => { d.missions[0].enemy.groups[0].defId = 'dragon_of_doom'; }],
  ['R02_unknown_prop', 'MS-R02', (d) => { d.missions[1].arena.props[0].t = 'med_gate'; }],
  ['R03_unknown_recipe', 'MS-R03', (d) => { d.missions[0].arena.recipe = 'med_pageant_green'; }],
  ['R04_unknown_marker_fixed', 'MS-R04', (d) => { d.missions[3].fixed[0].marker = 'nowhere'; }],
  ['R05_unknown_faction', 'MS-R05', (d) => { d.missions[0].playerFaction = 'marrowby'; }],
  ['R06_unknown_mechanic', 'MS-R06', (d) => { d.missions[0].tests = ['brace']; }],
  ['R07_unknown_mutator', 'MS-R07', (d) => { d.missions[0].rewards.unlockMutators = ['med_foam_swords']; }],
  ['R08_unknown_module', 'MS-R08', (d) => { d.missions[0].requiresModules = ['M99']; }],
  ['R09_unknown_power', 'MS-R09', (d) => { d.missions[0].powers.disable = ['med_bell_drop']; }],
  ['R11_rejected_helper', 'MS-R11', (d) => { d.missions[0].starTests[2] = { id: 'thrift', helper: 'shieldsBroken', args: [3] }; }],
  ['R11_bad_arity', 'MS-R11', (d) => { d.missions[2].starTests[2].args = []; }],
  ['R11_unknown_unit_arg', 'MS-R11', (d) => { d.missions[4].starTests[2].args = ['war_dragon', 1]; }],
  ['R13_unknown_boss', 'MS-R13', (d) => { d.missions[2].enemy.bosses = ['pikeman']; }],
  ['R14_pending_weather', 'MS-R14', (d) => { d.missions[0].arena.env.weather = 'spores'; }],
  ['R15_unknown_formation', 'MS-R15', (d) => { d.missions[2].enemy.groups[1].formation = 'hedgehog'; }],
  ['O01_new_type_in_ancient', 'MS-O01', (d) => { d.missions[0].objective = { type: 'capture', params: { points: ['a'], need: 1, hold: 1 }, markerIds: ['a'], text: 'x' }; }],
  ['O02_marker_missing', 'MS-O02', (d) => { d.missions[1].objective.markerIds = ['nowhere']; }],
  ['O03_marker_type', 'MS-O03', (d) => { d.missions[1].arena.markers = []; d.missions[1].objective.markerIds = []; }],
  ['O04_generals', 'MS-O04', (d) => { d.missions[2].enemy.generals = []; }],
  ['O05_waves', 'MS-O05', (d) => { d.missions[8].objective.params.waves = 9; }],
  ['O06_vip', 'MS-O06', (d) => { d.missions[3].fixed = []; }],
  ['O07_time', 'MS-O07', (d) => { d.missions[1].timeLimit = 100; }],
  ['O08_destroy_prop', 'MS-R02', (d) => { d.missions[6].objective.params.props[0].type = 'med_castle_gate'; }],
  ['A01_marker_outside', 'MS-A01', (d) => { d.missions[1].arena.markers[0].x = 99; }],
  ['A01_marker_duplicate', 'MS-A01', (d) => { d.missions[3].arena.markers[1].id = d.missions[3].arena.markers[0].id; }],
  ['A02_env_range', 'MS-A02', (d) => { d.missions[0].arena.env.time = 99; }],
  ['B03_core_not_in_roster', 'MS-B03', (d) => { d.missions[1].core[0].defId = 'catapult'; }],
  ['B04_reference_over_budget', 'MS-B04', (d) => { d.missions[2].reference[0].n += 100; }],
  ['B04_reference_underfilled', 'MS-B04', (d) => { d.missions[2].reference = [{ defId: 'equites', n: 1 }]; }],
  ['B07_caps_not_roster', 'MS-B07', (d) => { d.missions[0].caps = { catapult: 1 }; }],
  ['B10_time_limit', 'MS-B10', (d) => { d.missions[0].timeLimit = 700; }],
  ['K01_star2_arg', 'MS-K01', (d) => { d.missions[0].starTests[1].args = [0.4]; }],
  ['K01_star_id_mismatch', 'MS-K01', (d) => { d.missions[0].text.stars[2].id = 'cheap'; }],
  ['K02_star3_is_half', 'MS-K02', (d) => { d.missions[0].starTests[2] = { id: 'thrift', helper: 'aliveCostFrac', args: [0.5] }; }],
  ['K03_thrift_arg_ne_par', 'MS-K03', (d) => { d.missions[0].starTests[2].args = [2249]; }],
  ['K05_copy_number_star', 'MS-K05', (d) => { d.missions[0].text.stars[2].text = 'Win while spending under 2,251 drachmae.'; }],
  ['K05_copy_number_rule', 'MS-K05', (d) => { d.missions[2].rules[2] = 'Star 3: the Pharaoh must fall within 91 seconds.'; }],
  ['K06_par_none_value', 'MS-K06', (d) => { d.missions[1].par = { type: 'none', value: 5 }; }],
  ['C01_objective_variety', 'MS-C01', (d) => { for (const i of [1, 2, 3, 6, 8]) d.missions[i].objective = { type: 'eliminate', params: {}, markerIds: [], text: 'Defeat the enemy army' }; }],
  ['E03_lite_events', 'MS-E03', (d) => { d.missions[0].script = { events: [{ id: 'boom', at: 5, once: true, do: [{ op: 'strike', kind: 'shell', at: { x: 0, z: 0 }, dmg: 1 }] }] }; }],
  ['E02_duplicate_event', 'MS-E02', (d) => { const e = { id: 'a', at: 5, once: true, do: [{ op: 'beat', beat: 'x' }] }; d.missions[0].script = { events: [e, clone(e)] }; }],
  ['E05_weather_op', 'MS-E05', (d) => { d.missions[0].requiresModules = ['M0', 'M14']; d.missions[0].script = { events: [{ id: 'w', at: 5, once: true, do: [{ op: 'weather', kind: 'hail' }] }] }; }],
  ['E07_counter_unknown', 'MS-E07', (d) => { d.missions[0].requiresModules = ['M0', 'M14']; d.missions[0].script = { events: [{ id: 'c', at: { on: 'counter', counter: 'dragons', gte: 1 }, once: true, do: [{ op: 'beat', beat: 'x' }] }] }; }],
  ['E08_zeus_in_new_era_only', 'MS-E08', (d) => { d.missions[8].script.vipMarch = { to: 'nowhere', delay: 1, clear: 1, patience: 2 }; }],
  ['E09_override_field', 'MS-E09', (d) => { d.missions[0].powers = { disable: [], override: { zeus_lightning: { cd: 1 } } }; }],
  ['P01_setpiece_in_ancient', 'MS-P01', (d) => { d.missions[0].setpiece = { id: 'sp_x', role: 'primary', trigger: 5, shot: { from: { anchor: 'player_line', offset: [0, 1, 0] }, to: { anchor: 'enemy_centroid', offset: [0, 1, 0] }, hold: 3, ease: 'inout', simSpeed: 0.5 }, announcer: { category: 'campaign_marathon_sort_of', sub: 'mid', pri: 5, bypassAlternation: true, lines: [{ who: 'brutus', text: 'a' }, { who: 'plato', text: 'b' }, { who: 'cassandra', text: 'c' }] }, stinger: { id: 'st_x', kind: 'comic', secs: 2 }, sfx: ['x_y'] }; }],
  ['W01_reward_id', 'MS-W01', (d) => { d.missions[0].rewardId = 'big_heads'; }],
  ['W02_primary_not_granted', 'MS-W02', (d) => { d.missions[0].rewards.primary = { class: 'part', id: 'wings' }; }],
  ['W03_quick_unlock_arena', 'MS-W03', (d) => { d.missions[0].rewards.quickUnlocks = [{ kind: 'arena', id: 'med_castle_dour' }]; }],
  ['X01_band', 'MS-X01', (d) => { d.missions[0].bots.greedy = [0.7, 0.2]; }],
  ['X01_band_without_why', 'MS-X01', (d) => { d.missions[0].bots.turtle = [0, 0.9]; }],
  ['G01_first_three_ancient', 'MS-G01', (d) => { d.missions[0].firstThreeMinutes = { doc: 'x', fresh: [{ kind: 'beat', id: 'a' }], returning: [], milestonesS: { briefingDeployed: 1, fight: 2, setpiece: 3, firstEffect: 4, victory: 5, starsShown: 6, nextPrompt: 7 } }; }],
  ['Y01_attempts_in_ancient', 'MS-Y01', (d) => { d.missions[0].attempts = { design: { star1: 1.2, star3: 2.5 }, computed: null }; }],
  ['Z01_puzzle_par', 'MS-Z01', (d) => { d.puzzles[0].par = { type: 'cost', value: 99999 }; }],
  ['Z02_puzzle_unit', 'MS-R01', (d) => { d.puzzles[1].enemy.placements[0].defId = 'tank'; }],
  ['Z03_puzzle_bonus', 'MS-Z03', (d) => { d.puzzles[0].bonus = { id: 'x', text: 'x', helper: 'nonesuch', args: [] }; }],
  ['R12_unknown_ability', 'MS-R12', (d) => { d.missions[0].enemy.groups[0].override = { disableAbilities: ['death_ray'] }; }],
  ['O08_destroy_target', 'MS-O08', (d) => { d.missions[6].objective.params.props = [{ def: 'ghost_unit', count: 1 }]; }],
  ['A03_prop_outside', 'MS-A03', (d) => { d.missions[1].arena.props[0].x = 999; }],
  ['B05_enemy_types', 'MS-B05', (d, c) => { d.missions[0].enemy.groups = Object.keys(c.units).slice(0, 17).map((u) => ({ defId: u, n: 1 })); }],
  ['B06_fixed_position', 'MS-B06', (d) => { d.missions[3].fixed[0] = { defId: 'battle_goat', vip: true }; }],
  ['Z02_puzzle_placement_outside', 'MS-Z02', (d) => { d.puzzles[0].enemy.placements[0].x = 999; }],
  ['Z04_ancient_mechanic_meta', 'MS-Z04', (d) => { d.puzzles[0].teaches = ['brace']; }],
];
await check(CRIT + '08/baseline_clean', () => {
  const r = lintFile(clone(DOC), clone(CTX), { otherIds: {} }); assert.equal(r.errors.length, 0);
  const seen = new Set(NEG.map((n) => n[1])); for (const c of seen) assert.ok(RULES[c], 'negative control names unknown rule ' + c);
});
for (const [label, code, fn] of NEG) {
  await check(CRIT + '08/neg_' + label, () => {
    const { d, c, o } = mut(fn);
    const r = lintFile(d, c, Object.assign({ otherIds: {} }, o));
    assert.ok(codes(r).includes(code), 'expected ' + code + ' but got ' + JSON.stringify(Array.from(new Set(codes(r)))) + ' ' + JSON.stringify(r.errors.slice(0, 2)));
  });
}
// ============================================================================================================================ MS-T09 the new-era scaffold (see tests/campaign/ms_scaffold.mjs section below)
// ============================================================================================================================ MS-T09 the new-era scaffold
// A lint-valid nine-mission, six-puzzle document per new era, built from the binding ladder (ctx.ladder parsed from design/<era>/arenas.md), the unit/prop/arena tables of the
// markdown context and the compact rows below (the star-3 / teaches / tests / combines / modules columns of the three missions_outline.md "ladder at a glance" tables). It is
// NOT the campaign (copy is placeholder, armies are generated): it exists so that every new-era rule has a positive case and a negative control TODAY, and so that CAMPAIGN-x
// agents can start from a document the lint already accepts (spec/MS 3.9).
const ROWS = {
  medieval: [
    { pf: ['yeomen'], ef: 'marrowby', star3: ['thrift', [2250]], teaches: ['brace'], tests: [], combines: [], mods: ['M2b'], reward: ['mutator', 'med_foam_swords', 'foam_swords'] },
    { pf: ['yeomen'], ef: 'marrowby', gen: 'ser_valiant', star3: ['usedMechanic', ['brace', 4]], teaches: ['colours'], tests: ['brace'], combines: [], mods: ['M13'], reward: ['part', 'med_plumed_great_helm', 'plumed_great_helm'], sub: ['codex_write', 'med_codex_heraldry'] },
    { pf: ['gatehouse', 'yeomen'], ef: 'marrowby', time: 150, star3: ['usedMechanic', ['colours', 3]], teaches: ['bolts'], tests: ['colours'], combines: ['brace', 'colours'], mods: ['M1', 'M2', 'M13'], reward: ['part', 'med_long_pike', 'long_pike'], sub: ['codex_write', 'med_codex_armour'] },
    { pf: ['marrowby'], ef: 'free_company', cap: { need: 3, hold: 20 }, star3: ['bannerDownBy', ['standard_bearer', 75]], teaches: ['charge'], tests: ['colours'], combines: [], mods: ['M2b', 'M13', 'M14'], reward: ['part', 'med_lance_used', 'lance_used'], sub: ['quick_unlock', 'med_style_wobbly'] },
    { pf: ['free_company', 'yeomen'], ef: 'gatehouse', props: [['med_castle_gate', 1], ['med_portcullis', 1]], star3: ['hitsDuringReload', [10]], teaches: ['gates'], tests: ['bolts'], combines: [], mods: ['M2', 'M12', 'M14'], soft: ['M13'], reward: ['quick_unlock', 'med_siege_season', 'siege_season'], sub: ['part', 'med_mantlet_shield'] },
    { pf: ['bellfount', 'yeomen'], ef: 'free_company', core: ['med_bell_tower', 150], star3: ['propStanding', ['med_castle_gate']], teaches: ['healers'], tests: ['gates'], combines: ['gates', 'brace', 'colours'], mods: ['M6a', 'M12', 'M13', 'M14'], reward: ['mutator', 'med_plague_season', 'plague_season'] },
    { pf: ['yeomen', 'bellfount'], ef: 'free_company', vip: ['pageant_dragon', 'green'], star3: ['usedMechanic', ['healers', 1000]], teaches: ['fire'], tests: ['healers'], combines: [], mods: ['M6a', 'M12', 'M14'], reward: ['quick_unlock', 'med_dry_summer', 'dry_summer'], sub: ['part', 'med_cauldron_helm'] },
    { pf: ['gatehouse', 'yeomen', 'free_company'], ef: 'wyrmkin', waves: 4, star3: ['burnKills', ['siege', 2]], teaches: ['arc'], tests: ['fire'], combines: [], mods: ['M10', 'M12', 'M14'], reward: ['codex_write', 'med_codex_siegecraft', 'siegecraft'] },
    { pf: ['marrowby', 'yeomen', 'gatehouse', 'bellfount'], ef: 'wyrmkin', gen: 'cinderwyrm', star3: ['shellsOnTarget', ['cinderwyrm', 1]], teaches: ['air'], tests: ['arc'], combines: ['bolts', 'healers', 'colours', 'fire', 'arc'], mods: ['M7', 'M10', 'M13', 'M14', 'M15'], reward: ['part', 'med_gilded_spoon', 'gilded_spoon'], sub: ['quick_unlock', 'med_dragon_day'] },
  ],
  modern: [
    { pf: ['marmalade'], ef: 'shed', star3: ['thrift', [2250]], teaches: ['reload'], tests: [], combines: [], mods: ['M1', 'M3', 'M2', 'M2b'], reward: ['part', 'mod_helm_tin_hat', 'tin_hat'], sub: ['part', 'mod_helm_generic'] },
    { pf: ['directorate'], ef: 'marmalade', time: 90, star3: ['hitsWhileReloadingAtMost', [6]], teaches: ['cover'], tests: ['reload'], combines: [], mods: ['M9', 'M14', 'M12'], reward: ['part', 'mod_face_eyeshade', 'eyeshade'], sub: ['part', 'mod_face_generic'] },
    { pf: ['briefing'], ef: 'directorate', cap: { need: 3, hold: 0, flip: 12 }, star3: ['coverFracAtLeast', [0.35]], teaches: ['pin'], tests: ['cover'], combines: ['reload', 'cover'], mods: ['M3', 'M2', 'M14', 'M9', 'M10'], reward: ['mutator', 'mod_red_tape', 'red_tape'] },
    { pf: ['marmalade'], ef: 'caution', vip: ['lunchbox_apc', 'far_bank'], star3: ['noLoss', [['biscuit_tank']]], teaches: ['armour'], tests: [], combines: [], mods: ['M8', 'M7', 'M14', 'M12', 'M13', 'M17e', 'M15'], reward: ['part', 'mod_face_goggles', 'goggles'], sub: ['part', 'mod_face_generic'] },
    { pf: ['directorate'], ef: 'briefing', props: [['mod_boxcar_cargo', 4]], star3: ['noLoss', [['filing_howitzer']]], teaches: ['shells'], tests: [], combines: [], mods: ['M10', 'M2', 'M13', 'M12', 'M14', 'M3', 'M15'], soft: ['M8'], reward: ['part', 'mod_back_radio', 'back_radio'], sub: ['part', 'mod_back_generic'] },
    { pf: ['caution', 'directorate', 'briefing'], ef: 'marmalade', core: ['mod_switchboard_tower', null], waves: 4, star3: ['usedMechanic', ['armour', 12]], teaches: ['mines'], tests: ['armour'], combines: ['armour', 'shells', 'pin'], mods: ['M11', 'M14', 'M12', 'M8', 'M9', 'M7', 'M10', 'M15'], waiver: true, reward: ['part', 'mod_helm_hard_hat', 'hard_hat'], sub: ['part', 'mod_helm_generic'] },
    { pf: ['skyclub'], ef: 'directorate', gen: 'deputy_director', star3: ['noLoss', [['spotter_balloon']]], teaches: ['air'], tests: [], combines: [], mods: ['M7', 'M2', 'M14', 'M15'], soft: ['M13'], reward: ['mutator', 'mod_airmail', 'airmail'] },
    { pf: ['marmalade', 'caution', 'skyclub'], ef: 'shed', waves: 4, star3: ['usedMechanic', ['mines', 8]], teaches: ['repair'], tests: ['mines'], combines: [], mods: ['M6a', 'M14', 'M12', 'M8', 'M15'], reward: ['part', 'mod_weapon_big_wrench', 'big_wrench'], sub: ['part', 'mod_weapon_generic'] },
    { pf: ['marmalade', 'directorate', 'skyclub', 'caution', 'briefing', 'shed'], ef: 'marmalade', gen: 'grand_teapot', star3: ['usedAll', [['cover', 'pin', 'armour', 'shells', 'mines', 'air', 'repair'], 3]], teaches: [], tests: ['cover', 'pin', 'armour', 'shells', 'mines', 'air', 'repair'], combines: ['cover', 'pin', 'armour', 'shells', 'mines', 'air', 'repair'], mods: ['M2', 'M3', 'M6a', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12', 'M14', 'M15', 'M17e'], reward: ['codex_write', 'mod_codex_everything_else', 'everything_else'] },
  ],
  scifi: [
    { pf: ['tidy_concord'], ef: 'rummage', star3: ['thrift', [2250]], teaches: ['shield'], tests: [], combines: [], mods: ['M1', 'M3', 'M2', 'M2b', 'M4'], reward: ['part', 'sf_helm_fishbowl', 'fishbowl'], sub: ['part', 'sf_helm_generic'] },
    { pf: ['tidy_concord'], ef: 'rummage', cap: { need: 3, hold: 10 }, star3: ['ownBreaksAtMost', [30]], teaches: ['hover'], tests: ['shield'], combines: [], mods: ['M7', 'M14', 'M10', 'M12', 'M8', 'M4'], reward: ['quick_unlock', 'sf_magma_night', 'magma_night'], sub: ['part', 'sf_back_glowpads'] },
    { pf: ['tidy_concord'], ef: 'rummage', props: [['sf_reactor_core', 1], ['sf_shield_pylon', 3]], star3: ['keptAlive', ['dustpan_hover', 2]], teaches: [], tests: ['hover'], combines: ['shield', 'hover'], mods: ['M12', 'M14', 'M13', 'M17e', 'M15', 'M4'], soft: ['M8'], reward: ['mutator', 'sf_overcharge', 'overcharge'] },
    { pf: ['tidy_concord', 'glowmoss', 'quiet_hour'], ef: 'quiet_hour', vip: ['bubble_tender', 'pod_exit'], star3: ['vipShieldNeverBroken', []], teaches: ['cloak'], tests: ['shield'], combines: [], mods: ['M5', 'M14', 'M7', 'M2', 'M12', 'M15', 'M17e', 'M4'], reward: ['part', 'sf_cape_shimmer', 'cape_shimmer'], sub: ['part', 'sf_back_generic'] },
    { pf: ['rummage'], ef: 'courtesy', time: 120, star3: ['underTime', [170]], teaches: ['emp'], tests: [], combines: [], mods: ['M6b', 'M6a', 'M7', 'M8', 'M4', 'M15'], waiver: true, reward: ['part', 'sf_back_fuses', 'fuses'], sub: ['part', 'sf_back_generic'] },
    { pf: ['rummage', 'quiet_hour'], ef: 'courtesy', gen: 'grand_concierge', star3: ['usedMechanic', ['cloak', 6]], teaches: [], tests: ['cloak'], combines: ['cloak', 'emp', 'shield'], mods: ['M5', 'M6b', 'M8', 'M15', 'M17e', 'M12', 'M14', 'M13'], reward: ['quick_unlock', 'sf_boss_rush', 'boss_rush'], sub: ['part', 'sf_helm_bowtie'] },
    { pf: ['glowmoss', 'quiet_hour', 'tidy_concord'], ef: 'skitter', core: ['sf_heart_tree', 300], waves: 3, star3: ['coreHpAtLeast', [0.6]], teaches: ['blink'], tests: [], combines: [], mods: ['M13', 'M14', 'M12', 'M7', 'M6a'], soft: ['M4'], reward: ['part', 'sf_staff_glow', 'staff_glow'], sub: ['part', 'sf_staff_generic'] },
    { pf: ['tidy_concord'], ef: 'skitter', waves: 5, star3: ['ownBreaksAtMost', [40]], teaches: ['strike'], tests: ['shield'], combines: [], mods: ['M13', 'M10', 'M7', 'M12', 'M14', 'M4'], soft: ['M5'], reward: ['quick_unlock', 'sf_sinkhole_night', 'sinkhole_night'], sub: ['part', 'sf_back_antenna'] },
    { pf: ['tidy_concord', 'glowmoss', 'quiet_hour'], ef: 'skitter', gen: 'hive_queen', star3: ['usedMechanic', ['strike', 25]], teaches: [], tests: ['strike'], combines: ['blink', 'strike', 'shield'], mods: ['M13', 'M10', 'M7', 'M5', 'M4', 'M6b', 'M14', 'M15', 'M17e'], reward: ['mutator', 'sf_warranty_void', 'warranty_void'] },
  ],
};
const BASIC_TEXT = { b_place_line: 'Pick a card, then drag across the field to draw a line.', b_fight: 'FIGHT! Press the button and watch the line.', b_speed: 'Space pauses. The speed keys change the pace.', b_powers: 'Keys 1 to 6 are your god powers. Press 1.', b_done: 'THAT is how you win a battle! Do it again, smarter.' };
const BASIC_TRIG = { b_place_line: ['placement_start', 0, 'plato'], b_fight: ['battle_start', 0, 'brutus'], b_speed: ['battle_start', 8, 'cassandra'], b_powers: ['first_contact', 4, 'cassandra'], b_done: ['battle_end', 0, 'brutus'] };
const FILL_MARKERS = { eliminate: [], destroy: [] };
function scaffold(era, ctx) {
  const pfx = V.eraPrefix[era], rows = ROWS[era], units = ctx.units;
  const unitsOf = (fs) => Object.keys(units).filter((u) => fs.includes(units[u].faction) && units[u].role !== 'monster' && units[u].role !== 'hero').sort((a, b) => units[a].cost - units[b].cost);
  const act = (i) => 1 + Math.floor(i / 3);
  const voice = (t) => [{ who: 'brutus', text: t + ' HUZZAH!' }, { who: 'plato', text: t + ' Is that so?' }, { who: 'cassandra', text: t + ' I said so.' }];
  const rewardParts = {}; const missions = ctx.ladder.map((lr, i) => {
    const r = rows[i], id = lr.id, mk = [], ol = (ctx.outline && ctx.outline[i]) || {}; let objective; const fixed = []; let script = null;
    const roster = unitsOf(r.pf).slice(0, 7); if (r.vip) { /* the VIP is free and not in the roster */ }
    const eroster = unitsOf([r.ef]);
    const egroups = eroster.slice(0, 4).map((u, k) => ({ defId: u, n: 8 - k, order: k ? 'advance' : 'hold' }));
    const gen = r.gen ? [r.gen] : [];
    if (r.gen) egroups.push({ defId: r.gen, n: 1, at: { x: 30, z: 0 }, order: 'hold' });
    const lastWaves = (n) => ({ list: Array.from({ length: n - 1 }, (_, k) => ({ name: 'Wave ' + (k + 2), groups: [{ defId: eroster[0], n: 6 + k }] })), placed: true, firstAfter: 25, interval: 30, breather: 3 });
    switch (lr.objective) {
      case 'eliminate': objective = { type: 'eliminate', params: {}, markerIds: [], text: 'Defeat the enemy army' }; break;
      case 'kill_general': mk.push({ id: 'boss_start', type: 'general_spawn', x: 30, z: 0, r: 3 }); objective = { type: 'kill_general', params: {}, markerIds: ['boss_start'], binding: true, text: 'Kill the general' }; break;
      case 'hold_hill': mk.push({ id: 'hill', type: 'hill', x: -8, z: 0, r: 6 }); objective = { type: 'hold_hill', params: { time: r.time || 90 }, markerIds: ['hill'], text: 'Hold the hill' }; break;
      case 'capture': { const ids = ['cap_a', 'cap_b', 'cap_c']; ids.forEach((k, ki) => mk.push({ id: k, type: 'capture', x: ki * 10 - 10, z: ki % 2 ? 8 : -8, r: 4 })); objective = { type: 'capture', params: Object.assign({ points: ids, need: 3, hold: 0 }, r.cap), markerIds: ids, text: 'Capture the posts' }; break; }
      case 'destroy': objective = { type: 'destroy', params: { props: r.props.map(([type, count]) => ({ type, count })), eliminate: false }, markerIds: [], text: 'Destroy the targets' }; break;
      case 'escort': case 'protect_vip': {
        mk.push({ id: 'van_start', type: 'vip_start', x: -30, z: 0, r: 3 }, { id: r.vip[1], type: 'exit', x: 30, z: 0, r: 4 });
        fixed.push({ defId: r.vip[0], marker: 'van_start', vip: true, heading: 1.5, free: true, override: { hp: 700 } });
        objective = { type: 'escort', params: { vip: r.vip[0], exit: r.vip[1], mode: 'path' }, markerIds: ['van_start', r.vip[1]], binding: true, text: 'Walk the VIP to the exit' };
        script = { vipMarch: { to: r.vip[1], delay: 10, clear: 12, patience: 50 } }; break;
      }
      case 'defend_core': mk.push({ id: 'core', type: 'core', x: -14, z: 0, r: 5 }); objective = { type: 'defend_core', params: Object.assign({ core: 'core', prop: r.core[0] }, r.core[1] ? { time: r.core[1] } : {}), markerIds: ['core'], text: 'Defend the core' }; if (r.waves) script = { waves: lastWaves(r.waves) }; break;
      case 'survive_waves': objective = { type: 'survive_waves', params: { waves: r.waves }, markerIds: [], text: 'Survive the waves' }; script = { waves: { list: Array.from({ length: r.waves }, (_, k) => ({ name: 'Wave ' + (k + 1), groups: [{ defId: eroster[0], n: 8 + k }] })), placed: false, first: 6, interval: 40, breather: 5 } }; break;
      default: throw new Error('ladder objective ' + lr.objective);
    }
    if (lr.objective === 'defend_core' && r.waves && !script) script = { waves: lastWaves(r.waves) };
    const budget = ol.budget || 3000 + 1000 * i;
    const core = [{ defId: roster[0], n: 2 }];
    // reference: fill 90..99 percent of the budget with the roster
    const ref = {}; let spent = 0; ref[roster[0]] = 2; spent += 2 * units[roster[0]].cost;
    for (let g = 0; g < 400 && spent < 0.93 * budget; g++) { const u = roster[g % roster.length]; if (spent + units[u].cost <= budget) { ref[u] = (ref[u] || 0) + 1; spent += units[u].cost; } }
    const reference = Object.keys(ref).map((d) => ({ defId: d, n: ref[d] }));
    const refTop = reference.slice().sort((a, b) => b.n - a.n)[0].defId;
    const swapTo = roster.filter((u) => u !== refTop).sort((a, b) => Math.abs(units[a].cost - units[refTop].cost) - Math.abs(units[b].cost - units[refTop].cost))[0];
    const par = ol.par || (r.star3[0] === 'thrift' ? { type: 'cost', value: r.star3[1][0] } : { type: 'none', value: 0 });
    const sp = i === 0 ? ctx.firstThree.fresh.find((x) => x.kind === 'setpiece') : null;
    const spid = sp ? sp.id : pfx + 'sp_m' + (i + 1);
    const beats = []; const firstTh = i === 0 ? ctx.firstThree : null;
    if (i === 0) {
      for (const b of ['b_place_line', 'b_fight', 'b_speed', 'b_powers', 'b_done']) beats.push({ id: b, trigger: BASIC_TRIG[b][0], delay: BASIC_TRIG[b][1], who: BASIC_TRIG[b][2], text: BASIC_TEXT[b], basics: true });
      const eraIds = Array.from(new Set(firstTh.fresh.concat(firstTh.returning).filter((x) => x.kind === 'beat' && !/^b_/.test(x.id)).map((x) => x.id)));
      eraIds.forEach((b, bi) => beats.push({ id: b, trigger: 'battle_start', delay: bi, who: 'plato', text: 'Beat ' + b + '.', mechanic: bi === 0 ? r.teaches[0] : undefined }));
    } else for (const t of r.teaches) beats.push({ id: pfx + 'beat_' + t, trigger: 'battle_start', delay: 3, who: 'cassandra', text: 'About ' + t + '.', mechanic: t });
    beats.forEach((b) => { if (b.mechanic === undefined) delete b.mechanic; });
    const [rc, rid, slug] = r.reward; const grant = { mutator: [], part: [], quick: [], codex: [] };
    if (rc === 'mutator') grant.mutator.push(rid); else if (rc === 'part') { grant.part.push(rid); } else if (rc === 'quick_unlock') grant.quick.push({ kind: 'preset', id: rid }); else grant.codex.push(rid);
    if (r.sub && r.sub[0] === 'part' && rc === 'quick_unlock') grant.part.push(r.sub[1]);
    for (const k of grant.part) rewardParts[k] = { name: k, blurb: 'A part for the Workshop.' };
    const rewards = { primary: { class: rc, id: rid }, unlockMutators: grant.mutator, unlockParts: grant.part, quickUnlocks: grant.quick, codex: grant.codex.concat([roster[0]]), substitution: r.sub ? { class: r.sub[0], id: r.sub[1] } : null };
    const m = {
      id, act: act(i), mood: ['calm', 'tense', 'epic'][i % 3], text: { title: 'Mission ' + (i + 1), blurb: 'Blurb ' + (i + 1), briefing: voice('Briefing ' + (i + 1)), victory: { who: 'brutus', text: 'Victory.' }, defeat: { who: 'cassandra', text: 'Defeat.' },
        stars: [{ id: 'win', text: 'Win.' }, { id: 'half', text: 'Win with at least half your army alive.' }, { id: pfx + 'star3', text: r.star3[0] === 'thrift' ? 'Win while spending under 2,250.' : 'Meet the star test.' }], reward: { title: 'Title ' + (i + 1), blurb: 'Reward blurb.' } },
      arena: { recipe: lr.arena, size: ctx.recipes[lr.arena].size, seed: ctx.recipes[lr.arena].seed != null ? ctx.recipes[lr.arena].seed : 20 + i, env: {}, markers: mk },
      playerFaction: r.pf.length > 1 ? 'mixed' : r.pf[0], roster, caps: {}, budget, par, core, fixed, reference, bots: { greedy: [0.25, 0.7], counter: [0.6, 1], turtle: [0.1, 0.6] }, botsWhy: '',
      blind: { swap: { [refTop]: swapTo }, why: 'The blind bot lacks the taught mechanic.' },
      enemy: { faction: r.ef, style: 'scaffold', difficulty: 'normal', special: '', generals: gen, groups: egroups }, objective, timeLimit: ol.timeLimit || 300, friendlyFire: false, godPowers: true, powers: { disable: [], override: {} },
      script, inputs: [], rules: ['Rule one of the scaffold mission.', 'Rule two of the scaffold mission.', i === 0 ? 'Star 3: spend at most 2,250 of your 3,000.' : 'Star 3: meet the test.'],
      starTests: [{ id: 'win' }, { id: 'half', helper: 'aliveCostFrac', args: [0.5] }, { id: pfx + 'star3', helper: r.star3[0], args: r.star3[1] }], rewards, rewardId: pfx + 'r' + (i + 1) + '_' + slug,
      teaching: { beats, exceptions: [] }, teaches: r.teaches, tests: r.tests, combines: r.combines, requiresModules: r.mods.slice(), softModules: (r.soft || []).slice(),
      setpiece: { id: spid, role: 'primary', trigger: 20 + i, shot: { from: { anchor: 'player_line', offset: [0, 1, -6] }, to: { anchor: 'enemy_centroid', offset: [0, 2, 0] }, hold: 4, ease: 'inout', simSpeed: 0.5 },
        announcer: { category: 'campaign_' + id, sub: 'mid', pri: 5, bypassAlternation: true, lines: voice('Set piece ' + (i + 1)) }, stinger: { id: pfx + 'sting_m' + (i + 1), kind: 'comic', secs: 2 }, sfx: [pfx + 'sfx_m' + (i + 1)] },
      extraSetpieces: [], attempts: { design: ol.attempts ? { star1: ol.attempts.star1, star3: ol.attempts.star3 } : { star1: 1.2 + i * 0.2, star3: 2.5 + i * 0.2 }, computed: null }, firstThreeMinutes: null,
    };
    if (r.waiver) m.marginWaiver = { ref: 'cuts.md#waiver-' + (i + 1), reason: 'Headline mechanic lands last by construction.' };
    if (i === 0) m.firstThreeMinutes = { doc: 'design/' + era + '/first_three_minutes.md', fresh: ctx.firstThree.fresh, returning: ctx.firstThree.returning, milestonesS: { briefingDeployed: 32, fight: 80, setpiece: 96, firstEffect: 100, victory: 165, starsShown: 175, nextPrompt: 180 } };
    if (r.star3[0] === 'thrift') m.rules[2] = 'Star 3: spend at most 2,250 of your ' + budget.toLocaleString('en-US') + '.';
    return m;
  });
  const puzzles = ctx.puzzles.map((p, i) => {
    const pr = p.roster.length ? p.roster : Object.keys(units).slice(0, 3);
    const tm = Object.keys(V.mechanics[era])[i % 9] && Object.keys(V.mechanics[era]).filter((k) => !V.mechanics[era][k].firstSightOnly)[i];
    const enemy = Object.keys(units).filter((u) => units[u].faction === missions[0].enemy.faction && units[u].role !== 'monster')[0];
    return {
      id: p.id, title: p.title, blurb: 'Blurb.', hint: 'A hint that is long enough to read.', goalText: 'Defeat the enemy', arena: { recipe: p.arena, size: p.size || ctx.recipes[p.arena].size || 'medium', seed: p.seed != null ? p.seed : 20, env: {}, markers: [] },
      player: { faction: units[pr[0]].faction, roster: pr, budget: p.budget || 1400 }, par: { type: 'cost', value: p.par || 1000 }, enemy: { faction: units[enemy].faction, placements: [{ defId: enemy, x: 20, z: 0, heading: -1.57, order: 'advance', squadId: 1 }] },
      goal: { type: 'eliminate', params: {}, markerIds: [] }, timeLimit: 150, godPowers: false, fixed: [], script: null, bonus: { id: pfx + 'pz_bonus_' + (i + 1), text: 'Lose no unit', helper: 'lossesAtMost', args: [0] },
      teaches: tm ? [tm] : [], requiresModules: tm ? V.mechanics[era][tm].modules.slice() : [], mechanicFired: tm ? { counter: V.mechanics[era][tm].counter, min: 1 } : null, firstSightBeat: { id: pfx + 'pz_first_' + (i + 1), trigger: 'placement_start', who: 'plato', text: 'First sight.', mechanic: tm },
    };
  });
  for (const pz of puzzles) if (pz.firstSightBeat.mechanic === undefined) delete pz.firstSightBeat.mechanic;
  return {
    msVersion: 1, era, idPrefix: pfx, acts: [1, 2, 3].map((n) => ({ id: n, title: 'Act ' + n, blurb: 'Act blurb ' + n })), rewardParts, missions, puzzles,
  };
}
await check(CRIT + '09/rows_equal_the_outline', () => {
  for (const era of ['medieval', 'modern', 'scifi']) {
    const ol = NEW_CTX[era].outline; assert.equal(ol.length, 9);
    ROWS[era].forEach((r, i) => {
      const o = ol[i], w = era + ' mission ' + (i + 1);
      assert.equal(r.star3[0], o.star3.helper, w + ' star-3 helper'); if (o.star3.args) assert.deepEqual(r.star3[1], o.star3.args, w + ' star-3 args');
      if (!o.allModules) { const k = (a) => a.filter((x) => x !== 'M0').slice().sort().join(' '); assert.equal(k(r.mods), k(o.hard), w + ' hard modules'); assert.equal(k(r.soft || []), k(o.soft), w + ' soft modules'); }
      assert.ok(o.budget > 0 && o.timeLimit > 0 && o.par && o.attempts, w + ': the outline parse found every number');
    });
  }
});
const SCAF = {};
for (const era of ['medieval', 'modern', 'scifi']) {
  await check(CRIT + '09/scaffold_lints_clean_' + era, () => {
    const ctx = NEW_CTX[era]; ctx.events = CTX.events;
    const d = SCAF[era] = scaffold(era, ctx);
    const r = lintFile(d, ctx, { otherIds: { ancient: DOC.missions.map((m) => m.id).concat(DOC.puzzles.map((p) => p.id)) } });
    const errs = r.errors.map((e) => e.code + ' ' + e.path + ' ' + e.msg).slice(0, 12).join('\n');
    assert.equal(r.errors.length, 0, era + ' scaffold must lint clean:\n' + errs);
  });
}
// negative controls on the scaffold (Medieval carries most; Modern and Sci-Fi carry the era-specific ones)
const NEWNEG = [
  ['medieval', 'C02_taught_twice', 'MS-C02', (d) => { d.missions[3].teaches = ['colours']; }],
  ['medieval', 'C02_never_taught', 'MS-C02', (d) => { d.missions[7].teaches = []; }],
  ['medieval', 'C03_tests_later_mechanic', 'MS-C03', (d) => { d.missions[1].tests = ['fire']; d.missions[1].starTests[2] = { id: 'med_star3', helper: 'burnKills', args: ['siege', 2] }; }],
  ['medieval', 'C04_finale_one_mechanic', 'MS-C04', (d) => { d.missions[2].combines = ['brace']; }],
  ['medieval', 'C04_finale_future_mechanic', 'MS-C04', (d) => { d.missions[2].combines = ['brace', 'air']; }],
  ['medieval', 'C05_headline_missing', 'MS-C05', (d) => { d.missions[8].teaches = []; d.missions[8].teaching.beats = d.missions[8].teaching.beats.filter((b) => !b.mechanic); }],
  ['medieval', 'C05_no_beat_for_mechanic', 'MS-C05', (d) => { d.missions[4].teaching.beats = []; }],
  ['medieval', 'C06_module_missing', 'MS-C06', (d) => { d.missions[3].requiresModules = ['M2b', 'M14']; }],
  ['medieval', 'C07_margin_zero', 'MS-C07', (d, c) => { d.missions[3].requiresModules = ['M2b', 'M13', 'M14', 'M17e']; c.modules = c.modules.map((m) => (m.id === 'M17e' ? Object.assign({}, m, { pos: 13 }) : m)); }],
  ['medieval', 'C08_untaught_mechanic', 'MS-C08', (d, c) => { c.units.squire.carries = ['gates']; }],
  ['medieval', 'C09_basics_order', 'MS-C09', (d) => { const b = d.missions[0].teaching.beats; [b[0], b[1]] = [b[1], b[0]]; }],
  ['medieval', 'C09_beat_prefix', 'MS-C09', (d) => { d.missions[1].teaching.beats[0].id = 'colours_beat'; }],
  ['medieval', 'K04_tests_missing', 'MS-K04', (d) => { d.missions[1].tests = []; }],
  ['medieval', 'K03_thrift_with_fixed', 'MS-K03', (d) => { d.missions[0].fixed = [{ defId: 'pageant_dragon', x: 1, z: 1, vip: false }]; }],
  ['medieval', 'B08_reference_required', 'MS-B08', (d) => { d.missions[3].reference = null; }],
  ['medieval', 'B09_blind_required', 'MS-B09', (d) => { d.missions[3].blind = null; }],
  ['medieval', 'B09_blind_swap_cost', 'MS-B09', (d, c) => { const k = Object.keys(d.missions[0].blind.swap)[0]; d.missions[0].blind.swap[k] = 'cinderwyrm'; }],
  ['medieval', 'B03_core_not_in_reference', 'MS-B03', (d) => { d.missions[0].core[0].n = 99; }],
  ['medieval', 'O01_protect_vip_in_new_era', 'MS-O01', (d) => { const o = d.missions[6].objective; o.type = 'protect_vip'; o.params = { time: 100, reachOnly: true }; }],
  ['medieval', 'O02_capture_marker_type', 'MS-O02', (d) => { d.missions[3].arena.markers[0].type = 'hill'; }],
  ['medieval', 'O02_core_marker_type', 'MS-O02', (d) => { d.missions[5].arena.markers[0].type = 'waypoint'; }],
  ['medieval', 'O05_capture_need', 'MS-O05', (d) => { d.missions[3].objective.params.need = 4; }],
  ['medieval', 'O05_core_needs_time', 'MS-O05', (d) => { delete d.missions[5].objective.params.time; d.missions[5].script = null; }],
  ['medieval', 'O06_escort_vip', 'MS-O06', (d) => { d.missions[6].objective.params.vip = 'squire'; }],
  ['medieval', 'E01_group_ref', 'MS-E01', (d) => { d.missions[0].requiresModules.push('M14'); d.missions[0].script = { events: [{ id: 'o', at: 5, once: true, do: [{ op: 'order', group: 'ghost', order: 'advance' }] }] }; }],
  ['medieval', 'E03_strike_without_m14', 'MS-E03', (d) => { d.missions[0].script = { events: [{ id: 's', at: 5, once: true, do: [{ op: 'strike', kind: 'gas', at: { x: 0, z: 0 }, dmg: 3 }] }] }; }],
  ['medieval', 'E02_repeat_expansion', 'MS-E02', (d) => { d.missions[0].requiresModules.push('M14'); d.missions[0].script = { events: [1, 2, 3, 4].map((k) => ({ id: 'brood' + k, at: 20, once: true, repeat: { every: 5, times: 20 }, do: [{ op: 'beat', beat: 'x' }] })) }; }],
  ['medieval', 'E02_repeat_needs_time', 'MS-E02', (d) => { d.missions[0].requiresModules.push('M14'); d.missions[0].script = { events: [{ id: 'r', at: { on: 'counter', counter: 'wave_spawns', gte: 1 }, once: true, repeat: { every: 5, times: 3 }, do: [{ op: 'beat', beat: 'x' }] }] }; }],
  ['medieval', 'C08_exception_for_nothing', 'MS-C08', (d) => { d.missions[8].teaching.exceptions = [{ kind: 'unit', id: 'squire', mechanic: 'air', why: 'x' }]; }],
  ['medieval', 'E04_player_spawn_not_free', 'MS-E04', (d) => { d.missions[5].script = { events: [{ id: 'cart', at: 100, once: true, do: [{ op: 'spawn', team: 'player', groups: [{ defId: 'physician', n: 1 }], at: { x: 0, z: 0 } }] }] }; }],
  ['medieval', 'E06_setpiece_op_unknown', 'MS-E06', (d) => { d.missions[0].requiresModules.push('M14'); d.missions[0].script = { events: [{ id: 'p', at: 5, once: true, do: [{ op: 'setpiece', piece: 'med_sp_ghost' }] }] }; }],
  ['medieval', 'E07_local_counter_prefix', 'MS-E07', (d) => { d.missions[0].requiresModules.push('M14'); d.missions[0].script = { counters: [{ id: 'windmill_ignited', kind: 'event', event: 'fire_started' }], events: [] }; }],
  ['medieval', 'E10_hp_frac_target', 'MS-E10', (d) => { d.missions[0].requiresModules.push('M14'); d.missions[0].script = { events: [{ id: 'h', at: { on: 'hp_frac', target: { unit: 'nonesuch' }, below: 0.5 }, once: true, do: [{ op: 'beat', beat: 'x' }] }] }; }],
  ['medieval', 'P01_missing_setpiece', 'MS-P01', (d) => { d.missions[2].setpiece = null; }],
  ['medieval', 'P02_anchor', 'MS-P02', (d) => { d.missions[2].setpiece.shot.from.anchor = 'nowhere'; }],
  ['medieval', 'P03_lines', 'MS-P03', (d) => { d.missions[2].setpiece.announcer.lines[2].who = 'brutus'; }],
  ['medieval', 'P04_never_fires', 'MS-P04', (d) => { d.missions[2].setpiece.trigger = null; }],
  ['medieval', 'R10_setpiece_prefix', 'MS-R10', (d) => { d.missions[2].setpiece.id = 'sp_ford'; }],
  ['medieval', 'W01_reward_number', 'MS-W01', (d) => { d.missions[3].rewardId = 'med_r9_wobbly'; }],
  ['medieval', 'W02_no_substitution', 'MS-W02', (d) => { d.missions[1].rewards.substitution = null; }],
  ['medieval', 'G01_missing_first_three', 'MS-G01', (d) => { d.missions[0].firstThreeMinutes = null; }],
  ['medieval', 'G02_first_three_order', 'MS-G02', (d) => { const f = d.missions[0].firstThreeMinutes.fresh; [f[1], f[2]] = [f[2], f[1]]; }],
  ['medieval', 'Y01_attempts_order', 'MS-Y01', (d) => { d.missions[0].attempts.design = { star1: 3, star3: 2 }; }],
  ['medieval', 'Y02_computed', 'MS-Y02', (d) => { d.missions[0].attempts.computed = { star1: 2, star3: 4, p1: 0.9, p3: 0.25, runs: 30, bot: 'human_median', ci95: { star1: [1.5, 2.5], star3: [3, 5] }, engine: 'node', missionHash: msHash(d.missions[0]), at: '2026-10-08T00:00:00Z' }; }],
  ['medieval', 'Y03_stale', 'MS-Y03', (d) => { d.missions[0].attempts.computed = { star1: 1.25, star3: 4, p1: 0.8, p3: 0.25, runs: 30, bot: 'human_median', ci95: { star1: [1, 2], star3: [3, 5] }, engine: 'node', missionHash: 'deadbeef', at: '2026-10-08T00:00:00Z' }; }],
  ['medieval', 'Z04_puzzle_teaches', 'MS-Z04', (d) => { d.puzzles[0].teaches = []; }],
  ['medieval', 'Z04_puzzle_first_sight', 'MS-Z04', (d) => { d.puzzles[1].firstSightBeat = null; }],
  ['medieval', 'I06_budget', 'MS-I06', (d) => { d.missions[2].budget += 500; }],
  ['medieval', 'I06_time_limit', 'MS-I06', (d) => { d.missions[2].timeLimit += 30; }],
  ['medieval', 'I06_attempts', 'MS-I06', (d) => { d.missions[2].attempts.design.star1 += 0.1; }],
  ['medieval', 'I06_modules', 'MS-I06', (d) => { d.missions[2].requiresModules.push('M14'); }],
  ['medieval', 'I06_star3_helper', 'MS-I06', (d) => { d.missions[2].starTests[2] = { id: 'med_star3', helper: 'usedMechanic', args: ['colours', 4] }; }],
  ['modern', 'I06_par', 'MS-I06', (d) => { d.missions[1].par = { type: 'cost', value: 3300 }; }],
  ['medieval', 'I04_ladder_order', 'MS-I04', (d) => { [d.missions[0], d.missions[1]] = [d.missions[1], d.missions[0]]; }],
  ['medieval', 'I05_puzzle_budget', 'MS-I05', (d) => { d.puzzles[0].player.budget += 100; }],
  ['medieval', 'F03_legacy_in_new_era', 'MS-F03', (d) => { d.legacy = { mutatorStars: {}, teachingSkip: { label: 'a', tip: 'b' }, teachingBeats: [] }; }],
  ['medieval', 'R07_part_prefix', 'MS-R07', (d) => { d.rewardParts.long_pike = { name: 'x', blurb: 'y' }; d.missions[2].rewards.unlockParts = ['long_pike']; }],
  ['medieval', 'R06_unknown_mechanic_modern', 'MS-R11', (d) => { d.missions[1].starTests[2] = { id: 'med_star3', helper: 'coverFracAtLeast', args: [0.3] }; }],
  ['modern', 'C07_zero_margin_needs_waiver', 'MS-C07', (d) => { delete d.missions[5].marginWaiver; }],
  ['modern', 'C04_finale_combines', 'MS-C04', (d) => { d.missions[5].combines = ['armour']; }],
  ['modern', 'K04_helper_mechanic', 'MS-K04', (d) => { d.missions[1].tests = []; }],
  ['modern', 'O02_capture_posts', 'MS-O02', (d) => { d.missions[2].arena.markers[1].type = 'hill'; }],
  ['scifi', 'C07_emp_margin', 'MS-C07', (d) => { delete d.missions[4].marginWaiver; }],
  ['scifi', 'C02_headline_never_taught', 'MS-C02', (d) => { d.missions[7].teaches = []; d.missions[7].teaching.beats = []; }],
  ['scifi', 'K04_shield', 'MS-K04', (d) => { d.missions[1].tests = []; }],
  ['scifi', 'K03_thrift_arg', 'MS-K03', (d) => { d.missions[0].starTests[2].args = [2200]; }],
  ['scifi', 'R14_pending_weather', 'MS-R14', (d) => { d.missions[2].arena.env.weather = 'ember_ion'; }],
];
for (const [era, label, code, fn] of NEWNEG) {
  await check(CRIT + '09/neg_' + era + '_' + label, () => {
    const ctx = clone(NEW_CTX[era]); ctx.events = CTX.events; const d = clone(SCAF[era]); fn(d, ctx);
    const r = lintFile(d, ctx, { otherIds: {} });
    assert.ok(codes(r).includes(code), era + ' ' + label + ': expected ' + code + ', got ' + JSON.stringify(Array.from(new Set(codes(r)))) + ' ' + JSON.stringify(r.errors.slice(0, 2)));
  });
}
await check(CRIT + '09/exceptions_and_lite_events', () => {
  const ctx = clone(NEW_CTX.medieval); ctx.events = CTX.events; ctx.units.squire.carries = ['gates'];
  const d = clone(SCAF.medieval); assert.ok(codes(lintFile(clone(d), ctx, {})).includes('MS-C08'), 'squire carries gates (taught in mission 5) and appears in mission 1');
  for (const m of d.missions.slice(0, 4)) m.teaching.exceptions = [{ kind: 'unit', id: 'squire', mechanic: 'gates', why: 'a spare lance carrier, inert' }];
  assert.ok(!codes(lintFile(clone(d), ctx, {})).includes('MS-C08'), 'declared exceptions satisfy the untaught rule');
  const e = clone(SCAF.medieval); e.missions[0].script = { events: [{ id: 'bugle', at: 16, once: true, do: [{ op: 'beat', beat: 'wrong_cue' }, { op: 'order', group: 'lancers', order: 'advance' }, { op: 'setpiece', piece: e.missions[0].setpiece.id }] }] };
  e.missions[0].enemy.groups[0].id = 'lancers'; e.missions[0].setpiece.trigger = null;
  const r = lintFile(e, NEW_CTX.medieval, {}); assert.equal(r.errors.length, 0, JSON.stringify(r.errors.slice(0, 3)));
  const x = clone(e); x.missions[0].script.events[0].do.push({ op: 'strike', kind: 'gas', at: { x: 0, z: 0 } }); assert.ok(codes(lintFile(x, NEW_CTX.medieval, {})).includes('MS-E03'));
});
await check(CRIT + '09/design_amendment_downgrades', () => {
  const ctx = clone(NEW_CTX.medieval); ctx.events = CTX.events; const d = clone(SCAF.medieval); d.missions[2].budget += 500;
  assert.ok(codes(lintFile(clone(d), ctx, {})).includes('MS-I06')); d.missions[2].designAmendment = 'amendment 1: budget raised after BALANCE';
  const r = lintFile(d, ctx, {}); assert.equal(r.errors.length, 0); assert.ok(r.warnings.some((w) => w.code === 'MS-I06'));
});
await check(CRIT + '09/scaffold_info_lines', () => {
  for (const era of ['medieval', 'modern', 'scifi']) { const ctx = NEW_CTX[era]; const r = lintFile(SCAF[era], ctx, {}); for (const x of r.infos) assert.equal(x.code, 'MS-V01'); if (process.env.MS_VERBOSE) console.log(era, 'infos', r.infos.map((x) => x.path + ' ' + x.msg), 'warnings', r.warnings.map((x) => x.code + ' ' + x.msg)); }
});
await check(CRIT + '09/rule_coverage', () => {
  const have = new Set(NEG.map((n) => n[1]).concat(NEWNEG.map((n) => n[2])));
  const missing = Object.keys(RULES).filter((c) => RULES[c][0] === 'E' && !have.has(c));
  assert.deepEqual(missing, [], 'rules without a negative control: ' + missing.join(' '));
});

// ============================================================================================================================ MS-T10 the spec text names every rule, helper and counter
await check(CRIT + '10/spec_md_in_sync', () => {
  const p = path.join(DOCS, 'docs/eras/spec/MS.md'); assert.ok(fs.existsSync(p), 'docs/eras/spec/MS.md missing');
  const md = fs.readFileSync(p, 'utf8');
  for (const c of Object.keys(RULES)) assert.ok(md.includes(c), 'MS.md does not mention rule ' + c);
  for (const c of new Set(md.match(/MS-[A-SU-Z]\d\d/g))) assert.ok(RULES[c], 'MS.md mentions ' + c + ' which the lint does not define');   // MS-Tnn are the criteria of section 4
  for (const h of Object.keys(V.helpers)) assert.ok(md.includes('`' + h + '`'), 'MS.md does not define helper ' + h);
  for (const h of Object.keys(V.rejectedHelpers)) assert.ok(md.includes(h), 'MS.md does not mention the rejected helper ' + h);
  for (const c of Object.keys(V.counters)) assert.ok(md.includes('`' + c + '`'), 'MS.md does not define counter ' + c);
  for (const [era, ms] of Object.entries(V.mechanics)) for (const id of Object.keys(ms)) assert.ok(md.includes('`' + id + '`'), 'MS.md does not list mechanic ' + era + '.' + id);
  for (const op of ['strike', 'spawn', 'prop', 'weather', 'sky', 'beat', 'setpiece', 'order', 'kill']) assert.ok(md.includes('`' + op + '`'), 'MS.md does not define script op ' + op);
  const row = (n) => md.includes('| `' + n + '` |');
  for (const def of ['file', 'mission', 'puzzle']) for (const n of Object.keys(SCHEMA.$defs[def].properties)) if (n !== '$schema') assert.ok(row(n) || md.includes('| `' + def + '.' + n + '` |'), 'MS.md field table lacks ' + def + '.' + n);
  for (const t of ['kill_general', 'hold_hill', 'protect_vip', 'survive_waves', 'destroy', 'eliminate', 'capture', 'defend_core', 'escort']) assert.ok(md.includes('`' + t + '`'), 'MS.md does not mention objective ' + t);
  for (const m of V.markerTypes) assert.ok(md.includes('`' + m + '`'), 'MS.md does not mention marker type ' + m);
  for (const s of ['## 1. Purpose and scope', '## 2. Decisions', '## 3. Detailed specification', '## 4. Acceptance', '## 5. Residual ledger', '## 6. Plan corrections', '## 7. Open items']) assert.ok(md.includes(s), 'MS.md lacks the section ' + s);
});
await check(CRIT + '10/negative_control_files_exist', () => {
  const dir = path.join(ROOT, 'tests/negctl'); if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter((f) => /^MS-\d+\.mjs$/.test(f));
  const labels = new Set(results.map((r) => r[0]));
  for (const f of files) { const src = fs.readFileSync(path.join(dir, f), 'utf8'); const m = src.match(/expectRed:\s*\[([^\]]*)\]/); assert.ok(m, f + ' has no expectRed'); for (const l of m[1].match(/'[^']+'/g) || []) assert.ok(labels.has(l.slice(1, -1)), f + ' expects a label that ms.test.mjs never emits: ' + l); }
});

// ============================================================================================================================ MS-T11 (MS_SLOW=1): real battles
if (process.env.MS_SLOW) {
  const lib = await import('./_lib.mjs');
  for (const [i, m] of MISSIONS.entries()) {
    await check(CRIT + '11/real_battle_' + m.id, () => {
      const r = lib.runMission(m, i % 2 ? 'counter' : 'greedy', 1);
      assert.deepEqual(evaluateStarsJson(DOC.missions[i], r.summary, ENV), evaluateStars(m, r.summary));
    });
  }
}

// ============================================================================================================================ report
const bad = results.filter((r) => !r[1]);
for (const r of results) console.log((r[1] ? 'ok   ' : 'FAIL ') + r[0] + ' (' + r[2].toFixed(0) + ' ms)' + (r[1] ? '' : '\n     ' + String((r[3] && r[3].stack) || r[3]).split('\n').slice(0, 5).join('\n     ')));
console.log('ms: ' + (results.length - bad.length) + '/' + results.length + ' passed');
for (const h of Object.values(CR)) h.done();
if (bad.length) process.exit(1);
void pathToFileURL; void compileStar; void toLegacyMission;
