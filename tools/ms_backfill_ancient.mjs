#!/usr/bin/env node
// tools/ms_backfill_ancient.mjs: back-fills the nine Ancient missions and six Ancient puzzles into the MS schema (docs/eras/spec/ms.schema.json) as the exemplar
// docs/eras/design/ancient/missions.json. It IMPORTS the real modules (src/content/era_ancient/{campaign,campaign_text,puzzles}.js) and holds no copy of their data; the only
// hand-written knowledge is the star-test table below (the closed-vocabulary helper that equals each JS predicate), which is verified here and in tests/campaign/ms.test.mjs
// by a differential fuzz against the real predicates. Re-runnable and deterministic: no clock, no randomness (a fixed LCG), keys written in a fixed order, 1-space indent.
//
//   node tools/ms_backfill_ancient.mjs            write docs/eras/design/ancient/missions.json (and refresh context.json if missing)
//   node tools/ms_backfill_ancient.mjs --check    exit 1 when the committed file differs from a fresh back-fill (gate step "ms-backfill no diff")
//   node tools/ms_backfill_ancient.mjs --print    print a summary
// Policy (spec/MS 3.8): Ancient is VALIDATED against this JSON, never generated from it; campaign.js keeps its JS predicates (frozen, G6).
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = fs.existsSync(path.join(ROOT, 'docs/eras')) ? ROOT : (process.env.VW_MAIN_ROOT || ROOT);
const OUT = path.join(ROOT, 'docs/eras/design/ancient/missions.json');           // where --write puts it
const READ = path.join(DOCS, 'docs/eras/design/ancient/missions.json');          // where --check reads the committed copy
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);

/** mission id -> the star-3 helper that equals the Ancient predicate T.* of campaign.js (star ids come from campaign_text.js). */
const MISSION_STAR3 = {
  marathon_sort_of: ['thrift', [2250]],                       // T.thrift(2250)
  thermopylae_snack: ['noLoss', [['spartan'], 6]],            // T.noSpartanLost
  pyramid_scheme: ['underTime', [90]],                        // T.quick(90)
  nile_crossing: ['vipUntouched', ['battle_goat']],           // T.goatUntouched
  alps_elephant: ['keptAlive', ['war_elephant', 1]],          // T.elephantAlive
  teutoburg_peekaboo: ['underTime', [75]],                    // T.quick(75)
  troy_giftshop: ['propDownBy', ['gate_door', 100]],          // T.gateFast(100)
  cyclops_meet: ['noFriendlyFire', []],                       // T.noFriendlyFire
  zeus_bad_day: ['heroesAlive', []],                          // T.heroesAlive
};
/** puzzle id -> the bonus helper equal to puzzles.js bonus.test */
const PUZZLE_BONUS = {
  spear_wall: ['lossesAtMost', [2]], kiting_101: ['lossesAtMost', [0]], elephant_room: ['enemyDownBy', ['war_elephant', 45]],
  knock_knock: ['propDownBy', ['gate_door', 70]], goat_logistics: ['vipUntouched', ['battle_goat']], gaze_avoidance: ['summaryAtMost', ['stonedUnits', 0]],
};

const parOf = (n) => (n > 0 ? { type: 'cost', value: n } : { type: 'none', value: 0 });
const fnv = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, '0'); };
const strip = (v) => JSON.parse(JSON.stringify(v, (k, x) => (typeof x === 'function' ? undefined : x)));

/** Pretty printer: small leaves stay on one line, everything else is indented by 1 space. Deterministic. */
export function pretty(v, ind = '', width = 120) {
  const one = JSON.stringify(v);
  if (v === null || typeof v !== 'object') return one;
  if (one.length + ind.length <= width) return one;
  const pad = ind + ' ';
  if (Array.isArray(v)) return '[\n' + v.map((x) => pad + pretty(x, pad, width)).join(',\n') + '\n' + ind + ']';
  return '{\n' + Object.keys(v).map((k) => pad + JSON.stringify(k) + ': ' + pretty(v[k], pad, width)).join(',\n') + '\n' + ind + '}';
}

export async function build() {
  const camp = await imp('src/content/era_ancient/campaign.js');
  const txt = await imp('src/content/era_ancient/campaign_text.js');
  const pz = await imp('src/content/era_ancient/puzzles.js');
  const MISSIONS = camp.MISSIONS, PUZZLES = pz.PUZZLES;
  const rewardIdOf = (m, i) => { const p = m.rewards.unlockParts.length ? m.rewards.unlockParts[0] : m.rewards.unlockMutators[0]; return 'anc_r' + (i + 1) + '_' + p; };
  const missions = MISSIONS.map((m, i) => {
    const [helper, args] = MISSION_STAR3[m.id]; if (!helper) throw new Error('no star-3 mapping for ' + m.id);
    const hasPart = m.rewards.unlockParts.length > 0;
    return {
      id: m.id, act: m.act, mood: m.mood, unitsA: m.units.A,
      text: { title: m.title, blurb: m.blurb, briefing: m.briefing, victory: m.victory, defeat: m.defeat, stars: m.stars.map((s) => ({ id: s.id, text: s.text })), reward: { title: m.rewards.title, blurb: m.rewards.blurb } },
      arena: m.arena, playerFaction: m.playerFaction, roster: m.roster, caps: {}, budget: m.budget, par: parOf(m.par), core: m.core, fixed: m.fixed, reference: m.reference,
      bots: m.bots, botsWhy: m.botsWhy, blind: null, enemy: m.enemy, objective: m.objective, timeLimit: m.timeLimit, friendlyFire: m.friendlyFire, godPowers: m.godPowers,
      powers: { disable: [], override: {} }, script: m.script, inputs: [], rules: m.rules,
      starTests: [{ id: 'win' }, { id: 'half', helper: 'aliveCostFrac', args: [0.5] }, { id: m.stars[2].id, helper, args }],
      rewards: { primary: { class: hasPart ? 'part' : 'mutator', id: hasPart ? m.rewards.unlockParts[0] : m.rewards.unlockMutators[0] }, unlockMutators: m.rewards.unlockMutators, unlockParts: m.rewards.unlockParts, quickUnlocks: [], codex: m.rewards.codex, substitution: null },
      rewardId: rewardIdOf(m, i),
      teaching: m.teaching ? { beats: [], exceptions: [], legacy: true } : null, teaches: [], tests: [], combines: [], requiresModules: [], softModules: [],
      setpiece: null, extraSetpieces: [], attempts: null, firstThreeMinutes: null,
    };
  });
  const puzzles = PUZZLES.map((p) => {
    const [helper, args] = PUZZLE_BONUS[p.id]; if (!helper) throw new Error('no bonus mapping for ' + p.id);
    return {
      id: p.id, title: p.title, blurb: p.blurb, hint: p.hint, goalText: p.goalText, arena: p.arena, player: p.player, par: parOf(p.par), enemy: p.enemy, goal: p.goal, timeLimit: p.timeLimit,
      godPowers: p.godPowers, fixed: p.fixed, script: p.script, bonus: { id: p.stars[2].id, text: p.stars[2].text, helper, args }, teaches: [], requiresModules: [], mechanicFired: null, firstSightBeat: null,
    };
  });
  const body = {
    $schema: '../../spec/ms.schema.json', msVersion: 1, era: 'ancient', idPrefix: '',
    source: { generator: 'tools/ms_backfill_ancient.mjs', files: ['src/content/era_ancient/campaign.js', 'src/content/era_ancient/campaign_text.js', 'src/content/era_ancient/puzzles.js'], contentHash: '' },
    acts: [1, 2, 3].map((n) => ({ id: n, title: txt.ACTS[n].title, blurb: txt.ACTS[n].blurb })),
    rewardParts: txt.REWARD_PARTS,
    legacy: { mutatorStars: camp.MUTATOR_STARS, teachingSkip: txt.TEACHING_SKIP, teachingBeats: txt.TEACHING_BEATS },
    missions, puzzles,
  };
  const clone = strip(body);
  clone.source.contentHash = fnv(JSON.stringify({ m: strip(MISSIONS.map((m) => Object.assign({}, m, { stars: m.stars.map((s) => ({ id: s.id, text: s.text })) }))), p: strip(PUZZLES.map((p) => Object.assign({}, p, { stars: p.stars.map((s) => ({ id: s.id, text: s.text })) }))) }));
  return clone;
}

/** Fast self-check of the back-fill against the real modules (the full differential fuzz is tests/campaign/ms.test.mjs). */
export async function verify(doc) {
  const { toLegacyMission, toLegacyPuzzle, makeEnv, HELPERS } = await import(pathToFileURL(path.join(ROOT, 'tools/ms_lint.mjs')).href);
  const { buildAncientContext } = await import(pathToFileURL(path.join(ROOT, 'tools/ms_context.mjs')).href);
  const camp = await imp('src/content/era_ancient/campaign.js'), pz = await imp('src/content/era_ancient/puzzles.js');
  const ctx = await buildAncientContext(ROOT); void makeEnv; void HELPERS;
  const norm = (m) => strip(Object.assign({}, m, { stars: m.stars.map((s) => ({ id: s.id, text: s.text, hasTest: typeof s.test === 'function' })) }));
  doc.missions.forEach((j, i) => assert.deepEqual(norm(toLegacyMission(j, i, ctx, doc)), norm(camp.MISSIONS[i]), 'mission ' + j.id + ' differs from campaign.js'));
  // the stored solution (puzzle_solutions.js) is GENERATED by tests/campaign/solve_puzzles.mjs and is not part of the design data
  doc.puzzles.forEach((j, i) => assert.deepEqual(norm(toLegacyPuzzle(j, i, ctx)), norm(Object.assign({}, pz.PUZZLES[i], { solution: undefined })), 'puzzle ' + j.id + ' differs from puzzles.js'));
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const doc = await build();
  const text = pretty(doc) + '\n';
  if (!args.has('--no-verify')) await verify(doc);
  if (args.has('--check')) {
    const have = fs.existsSync(READ) ? fs.readFileSync(READ, 'utf8') : null;
    if (have !== text) { console.error('ms_backfill_ancient: ' + path.relative(ROOT, OUT) + ' is ' + (have == null ? 'missing' : 'stale') + ' (run: node tools/ms_backfill_ancient.mjs)'); process.exit(1); }
    console.log('ms_backfill_ancient: missions.json is current (' + doc.source.contentHash + ')'); return;
  }
  if (args.has('--print')) { console.log(doc.missions.length + ' missions, ' + doc.puzzles.length + ' puzzles, hash ' + doc.source.contentHash + ', ' + text.length + ' bytes'); return; }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, text);
  console.log('wrote ' + path.relative(ROOT, OUT) + ' (' + text.length + ' bytes, content hash ' + doc.source.contentHash + ')');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.stack || e.message); process.exit(2); });
