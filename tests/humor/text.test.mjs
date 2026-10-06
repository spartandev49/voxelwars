// HUMOR copy tests: completeness (U4, H3), length limits (H6), banned-term sweep (H4). Plain node:assert; run: node tests/humor/text.test.mjs
import assert from 'node:assert';
import { STAT_TABLE } from '../../src/content/era_ancient/stats.js';
import * as unitsText from '../../src/content/era_ancient/humor/units_text.js';
import * as announcer from '../../src/content/era_ancient/humor/announcer.js';
import * as tips from '../../src/content/era_ancient/humor/tips.js';
import * as ach from '../../src/content/era_ancient/humor/achievements.js';
import * as verbs from '../../src/content/era_ancient/humor/killverbs.js';
import * as names from '../../src/content/era_ancient/humor/names.js';
import * as ui from '../../src/content/era_ancient/humor/ui_text.js';
import * as mut from '../../src/content/era_ancient/humor/mutators_text.js';
import * as barks from '../../src/content/era_ancient/humor/barks.js';
import * as results from '../../src/content/era_ancient/humor/results_text.js';
import * as credits from '../../src/content/era_ancient/humor/credits_text.js';
import * as campaign from '../../src/content/era_ancient/campaign_text.js';
import * as scout from '../../src/content/era_ancient/humor/scout_text.js';
import { RNG } from '../../src/core/rng.js';

const words = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);
let checks = 0;
const failures = [];
const ok = (cond, msg) => { checks++; if (!cond) failures.push(msg); };

// ---------- U4 / H3: every unit has complete text ----------
const unitIds = Object.keys(STAT_TABLE);
ok(unitIds.length === 43, '43 units in stats.js');
for (const id of unitIds) {
  const t = unitsText.UNIT_TEXT[id];
  ok(t, 'unit text exists for ' + id);
  ok(t.name && t.plural, id + ' has display names');
  ok(t.blurb && words(t.blurb) <= 14, `${id} blurb <= 14 words (${words(t.blurb || '')})`);
  ok(t.lore && words(t.lore) <= 35, `${id} lore <= 35 words (${words(t.lore || '')})`);
  ok(Array.isArray(t.deaths) && t.deaths.length >= 3, id + ' has >= 3 death quotes');
  ok(Array.isArray(t.taunts) && t.taunts.length >= 2, id + ' has >= 2 taunts');
  ok(t.codexJoke && t.codexJoke.length > 8, id + ' has a codex joke');
  for (const d of t.deaths) ok(words(d) <= 12, `${id} death quote <= 12 words: ${d}`);
  for (const d of t.taunts) ok(words(d) <= 12, `${id} taunt <= 12 words: ${d}`);
  ok(new Set(t.deaths).size === t.deaths.length, id + ' deaths unique');
}
ok(Object.keys(unitsText.UNIT_TEXT).length === 43, 'no extra unit text entries');
ok(unitsText.unitName('hoplite') === 'Hoplite' && unitsText.unitName('hoplite', true) === 'Hoplites', 'unitName');
ok(unitsText.unitName('cs_sir_chadius') === 'Sir Chadius', 'custom soldier fallback name');

// ---------- announcer lines: length limits and shape ----------
const T = announcer.TEMPLATES;
const ids = new Set();
for (const l of T) {
  ok(!ids.has(l.id), 'unique announcer id ' + l.id); ids.add(l.id);
  ok(/^[a-z0-9_]+$/.test(l.id), 'snake_case id ' + l.id);
  ok(['brutus', 'plato', 'cassandra'].includes(l.who), 'voice ' + l.id);
  ok(words(l.text) <= 22, `announcer line <= 22 words (${words(l.text)}): ${l.id}`);
  ok(!/\s{2,}/.test(l.text), 'no double spaces ' + l.id);
  if (l.chain) for (const c of l.chain) ok(announcer.getTemplate(c) && announcer.getTemplate(c).follow, 'chain target exists and is a follower: ' + c);
}
for (const l of T.filter((x) => x.follow)) ok(T.some((h) => h.chain && h.chain.includes(l.id)), 'orphan follower ' + l.id);
// Brutus has an ALL-CAPS tell on (almost) every line; slot unit|up counts
const caps = (s) => /\b[A-Z]{3,}\b/.test(s.replace(/\{[^}]*\}/g, ''));
const brutus = T.filter((l) => l.who === 'brutus' && !l.follow);
const capsShare = brutus.filter((l) => caps(l.text)).length / brutus.length;
ok(capsShare >= 0.85, 'Brutus keeps his ALL-CAPS tell on most lines: ' + capsShare.toFixed(2));
// Cassandra's tell
const cass = T.filter((l) => l.who === 'cassandra');
const cassTell = cass.filter((l) => /I said|As foretold|Nobody listens|I predicted|I wrote|I told|I keep|I marked|noted/i.test(l.text)).length / cass.length;
ok(cassTell >= 0.5, 'Cassandra uses her tells: ' + cassTell.toFixed(2));

// ---------- tips (H3) ----------
ok(tips.TIPS.length >= 40, '>= 40 tips');
const hints = tips.TIPS.filter((t) => t.kind === 'hint').length, jokes = tips.TIPS.filter((t) => t.kind === 'joke').length;
ok(hints >= 16 && jokes >= 16 && Math.abs(hints - jokes) <= 6, `half hints half jokes: ${hints}/${jokes}`);
const tipIds = new Set();
for (const t of tips.TIPS) { ok(words(t.text) <= 18, `tip <= 18 words (${words(t.text)}): ${t.text}`); ok(!tipIds.has(t.id), 'unique tip id'); tipIds.add(t.id); ok(t.topic, 'tip topic'); }

// ---------- achievements (H3): 24 with names, descriptions, icons, tests ----------
const SPEC24 = ['first_victory', 'goat_herder', 'chicken_dinner', 'sparta', 'et_tu', 'trunk_show', 'depth_perception', 'cogito', 'not_so_immortal', 'gift_shop', 'stone_cold', 'dino_retirement', 'tipsy', 'perfect_phalanx', 'underpaid', 'blitz', 'zeus_left', 'landscaper', 'soldier_smith', 'tourist', 'ancient_history', 'overachiever', 'body_count', 'main_character'];
ok(ach.ACHIEVEMENTS.length === 24, '24 achievements');
for (const id of SPEC24) ok(ach.getAchievement(id), 'achievement ' + id);
for (const a of ach.ACHIEVEMENTS) { ok(a.name && a.desc && a.icon, a.id + ' has name/desc/icon'); ok(typeof a.test === 'function', a.id + ' has a test'); ok(words(a.desc) <= 22, a.id + ' desc length'); ok(a.test({}, null) === false || a.id === 'x', a.id + ' does not unlock on an empty profile'); }
ok(ach.getAchievement('first_victory').name === 'First Blood (Technically Second)', 'spec name kept');
ok(ach.getAchievement('sparta').name === 'THIS IS... A LOT OF KICKS', 'spec name kept');

// ---------- kill verbs ----------
const CAUSES = ['melee', 'ranged', 'aoe', 'fire', 'trample', 'magic', 'stone', 'kick', 'gore', 'fall', 'poison', 'execute', 'misfire', 'bribe', 'lightning', 'drown', 'lava', 'spikes', 'geyser'];
ok(CAUSES.every((c) => verbs.KILL_VERBS[c]) && Object.keys(verbs.KILL_VERBS).length === CAUSES.length, '19 kill-verb causes');
for (const c of CAUSES) { const by = verbs.KILL_VERBS[c].by; ok(by.length >= 6, `${c} has >= 6 verbs`); ok(new Set(by).size === by.length, c + ' verbs unique'); for (const v of by) ok(words(v) <= 8, `verb short: ${v}`); }
for (const c of ['fall', 'drown', 'lava', 'spikes', 'geyser']) ok(verbs.KILL_VERBS[c].solo && verbs.KILL_VERBS[c].solo.length >= 3, c + ' has solo phrases');
ok(/^Hoplite .+ Immortal$/.test(verbs.killFeedText('Hoplite', 'Immortal', 'melee', new RNG(1))), 'feed text composes');
ok(/^Hoplite .+/.test(verbs.killFeedText(null, 'Hoplite', 'lava', new RNG(1))), 'solo composes');
ok(ach.killVerb === verbs.killVerb, 'achievements.js re-exports kill verbs');

// ---------- names (H3): >= 60 epithets ----------
ok(names.EPITHETS.length >= 60 && new Set(names.EPITHETS).size === names.EPITHETS.length, '>= 60 unique epithets: ' + names.EPITHETS.length);
ok(['the Mildly Concerned', 'of the Second Lunch', 'Who Forgot His Shield', 'the Unbothered', 'Slayer of Chickens (Allegedly)'].every((e) => names.EPITHETS.includes(e)), 'spec epithets present');
for (const t of ['Sir', 'Dame', 'Lord', 'Lady', 'Citizen', 'Admiral', 'Doctor', 'Probably']) ok(names.TITLES.m.includes(t) || names.TITLES.f.includes(t), 'title ' + t);
for (const cu of ['greek', 'latin', 'egyptian', 'persian', 'celtic']) ok(names.FIRST_NAMES[cu] && names.FIRST_NAMES[cu].m.length >= 8 && names.FIRST_NAMES[cu].f.length >= 6, 'name pool ' + cu);
{ const r1 = new RNG(5), r2 = new RNG(5); const a = Array.from({ length: 30 }, () => names.randomName(r1)), b = Array.from({ length: 30 }, () => names.randomName(r2)); assert.deepStrictEqual(a, b); ok(new Set(a).size > 20, 'names vary'); ok(a.every((n) => n.length >= 3 && n.length <= 60), 'name length'); }
ok(typeof names.randomName(() => 0.5) === 'string', 'randomName accepts a plain function rng');

// ---------- UI text ----------
ok(['Potato', 'Papyrus', 'Marble', 'Olympian'].every((n, i) => Object.values(ui.QUALITY)[i].name === n), 'quality tiers named');
ok(ui.CORPSES.none.label.toLowerCase() === "pretend they're napping", 'corpses napping');
ok(ui.DIFFICULTY.easy.label === 'Easy: Peasant Mode' && ui.DIFFICULTY.normal.label === 'Normal: Citizen' && ui.DIFFICULTY.hard.label === 'Hard: Consul', 'difficulty labels');
ok(ui.BUTTONS.rematch === 'Again, but smarter', 'rematch label');
ok(ui.LOADING_LINES.length >= 20, '>= 20 loading lines');
for (const k of Object.keys(ui.ERRORS)) { const e = ui.ERRORS[k]; ok(e.title && e.body && e.body.length > 30, 'error has plain body: ' + k); ok(!e.joke || typeof e.joke === 'string', 'single joke field: ' + k); }
ok(Object.values(ui.ERRORS).filter((e) => e.joke).length <= Object.keys(ui.ERRORS).length - 3, 'not every error jokes');
ok(Object.keys(ui.EMPTY_STATES).length >= 8, 'empty states');
ok(ui.waveName(3) && ui.waveName(1000), 'wave names wrap');

// ---------- mutators ----------
const MUT = ['big_heads', 'tiny_titans', 'moon_gravity', 'chicken_rain', 'wine_rain_always', 'friendly_fire_fiesta', 'speedy_soldiers', 'ragdoll_frenzy', 'glass_cannons'];
ok(mut.MUTATORS_TEXT.length === 9 && MUT.every((id) => mut.mutatorText(id)), '9 mutators');
try { const sim = await import('../../src/sim/mutators.js'); const simIds = sim.mutatorIds(); ok(simIds.every((id) => mut.mutatorText(id)), 'every sim mutator has text: ' + simIds.join()); ok(mut.MUTATOR_IDS.every((id) => simIds.includes(id)), 'no text for a mutator the sim lacks'); } catch (e) { console.warn('sim/mutators.js not importable here, skipped cross-check: ' + e.message); }
for (const m of mut.MUTATORS_TEXT) { ok(m.name && m.desc && m.short && m.locked, m.id + ' complete'); ok(words(m.short) <= 6, m.id + ' short chip label'); }

// ---------- scout report text (placement screen) ----------
const SCOUT = ['no_anti_cav', 'exposed_archers', 'no_ranged', 'no_cavalry', 'siege_exposed', 'blob_vs_ranged', 'monster_incoming', 'no_support', 'one_note'];
ok(SCOUT.every((c) => scout.SCOUT_TEXT[c]) && Object.keys(scout.SCOUT_TEXT).length === 9, 'scout text covers the 9 armygen codes');
for (const c of SCOUT) {
  const e = scout.SCOUT_TEXT[c];
  ok(e.text && words(e.text) <= 32 && /[.!?]$/.test(e.text), 'scout text length: ' + c);
  ok(['brutus', 'plato', 'cassandra'].includes(e.who), 'scout voice ' + c);
  ok(Array.isArray(e.variants) && e.variants.length >= 2 && e.variants.length <= 3, 'scout variants 2-3: ' + c);
  for (const v of e.variants) ok(words(v.text) <= 32 && ['brutus', 'plato', 'cassandra'].includes(v.who), 'scout variant ' + c);
  ok(new Set([e.who, ...e.variants.map((v) => v.who)]).size >= 2, 'scout voices vary: ' + c);
}
ok(scout.scoutText('no_ranged', () => 0.99).text.length > 10 && scout.scoutText('nope') === null && scout.scoutText('no_ranged').text === scout.SCOUT_TEXT.no_ranged.text, 'scoutText helper');

// ---------- barks and bubbles (limits) ----------
for (const role of barks.ROLES) for (const st of barks.STATES) {
  const arr = barks.BARKS[role] && barks.BARKS[role][st];
  ok(arr && arr.length >= 2, `bark ${role}/${st} has >= 2`);
  for (const b of arr) ok(words(b) <= 10, `bark <= 10 words: ${b}`);
}
for (const [k, arr] of Object.entries(barks.STATUS_BARKS)) for (const b of arr) ok(words(b) <= 12, `status bark <= 12 words (${k}): ${b}`);
ok(barks.MONOLOGUE.length >= 6 && barks.MONOLOGUE.every((b) => words(b) <= 12), 'monologue bubbles <= 12 words');
ok(barks.GENERIC_DEATHS.length >= 5 && barks.GENERIC_DEATHS.every((b) => words(b) <= 12), 'generic deaths');
ok(typeof barks.barkFor('melee', 'engage', new RNG(1)) === 'string' && typeof barks.barkFor('nope', 'nope', new RNG(1)) === 'string', 'barkFor falls back');
// every death/taunt/bark can be a bubble: <= 12 words
for (const t of Object.values(unitsText.UNIT_TEXT)) for (const s of [...t.deaths, ...t.taunts]) ok(words(s) <= 12, 'bubble limit: ' + s);

// ---------- results + credits ----------
for (const [k, e] of Object.entries(results.RESULT_LABELS)) { ok(e.labels.length >= 3, 'result labels ' + k); }
ok(Object.keys(results.RESULT_LABELS).length >= 18, '>= 18 funny stat labels');
ok(credits.STUDIO_CREDITS.length >= 15 && credits.STUDIO_CREDITS.every((c) => c.role && c.name), 'studio credits');

// ---------- campaign text (9 missions) ----------
const M9 = ['marathon_sort_of', 'thermopylae_snack', 'pyramid_scheme', 'nile_crossing', 'alps_elephant', 'teutoburg_peekaboo', 'troy_giftshop', 'cyclops_meet', 'zeus_bad_day'];
const TITLES = ['Marathoner', 'Hot Gater', 'Pyramid Schemer', 'Goat Herder', 'Alps Alpinist', 'Forest Phantom', 'Gift Shop Manager', 'Cyclops Whisperer', "Zeus' Therapist"];
M9.forEach((id, i) => {
  const m = campaign.CAMPAIGN_TEXT[id];
  ok(m, 'mission text ' + id);
  ok(m.title && m.blurb && words(m.blurb) <= 30, id + ' blurb');
  ok(m.briefing.length >= 3 && m.briefing.length <= 5, id + ' briefing 3-5 lines');
  ok(new Set(m.briefing.map((b) => b.who)).size === 3, id + ' briefing uses all three voices');
  for (const b of m.briefing) ok(words(b.text) <= 30, id + ' briefing line length');
  ok(m.victory && m.victory.text && m.defeat && m.defeat.text, id + ' victory/defeat');
  ok(m.stars.length === 3 && m.stars.every((s) => s.id && s.text), id + ' three stars');
  ok(m.reward.title === TITLES[i], id + ' reward title ' + m.reward.title);
});
ok(campaign.TEACHING_BEATS.length >= 4 && campaign.TEACHING_BEATS.every((b) => b.text && b.hint && words(b.text) <= 24), 'teaching beats');
ok(Object.keys(campaign.REWARD_PARTS).length === 13 && ['silly_helms', 'silly_weapons', 'wings'].every((k) => campaign.REWARD_PARTS[k]), '10 silly reward parts plus the 3 unlock packs');
for (const id of M9) ok(announcer.CATEGORIES.includes('campaign_' + id), 'announcer has campaign category for ' + id);

// ---------- H4: banned-term sweep over EVERY user-visible string in the humor modules ----------
const rot13 = (s) => s.replace(/[a-z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97));
const SLURS_ROT13 = ['avttre', 'avttn', 'snttbg', 'xvxr', 'puvax', 'tbbx', 'jrgonpx', 'fcvp', 'ornare', 'gbjryurnq', 'enturnq', 'cnxv', 'erqfxva', 'fdhnj', 'genaal', 'qlxr', 'pbba', 'arteb', 'jbc', 'qntb', 'tlcfl', 'wnc', 'ergneq', 'fcnm', 'pevccyr', 'fnaqavttre', 'pnzry wbpxrl'];
const STEREOTYPE = ['savage', 'savages', 'primitive', 'uncivilised', 'uncivilized', 'barbaric', 'heathen', 'infidel', 'infidels', 'pagan', 'pagans', 'terrorist', 'terrorists', 'jihad', 'crusade', 'crusader', 'tribesmen', 'oriental', 'exotic', 'backward', 'inbred', 'cannibal', 'cannibals', 'witch doctor', 'cheap labour', 'cheap labor'];
const RELIGION = ['christ', 'christian', 'christians', 'jesus', 'allah', 'muhammad', 'mohammed', 'prophet muhammad', 'bible', 'quran', 'koran', 'torah', 'talmud', 'church', 'mosque', 'synagogue', 'rabbi', 'pope', 'buddha', 'amen', 'hallelujah', 'praise be'];
const banned = [...SLURS_ROT13.map(rot13), ...STEREOTYPE, ...RELIGION].map((w) => new RegExp('(^|[^a-z])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)', 'i'));
function collect(v, out, depth = 0) {
  if (depth > 8 || v === null || v === undefined) return;
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => collect(x, out, depth + 1));
  else if (typeof v === 'object') Object.values(v).forEach((x) => collect(x, out, depth + 1));
}
const all = [];
for (const mod of [unitsText, announcer, tips, ach, verbs, names, ui, mut, barks, results, credits, campaign, scout]) for (const [k, v] of Object.entries(mod)) if (typeof v !== 'function') collect(v, all);
ok(all.length > 2000, 'swept a large corpus: ' + all.length + ' strings');
let flagged = 0;
for (const s of all) for (const re of banned) if (re.test(s)) { flagged++; console.error('BANNED TERM in: ' + s); }
ok(flagged === 0, 'banned-term sweep found ' + flagged);
// placeholder / dilution markers must not ship in copy
for (const s of all) ok(!/\b(TODO|FIXME|XXX|lorem ipsum|coming soon)\b/i.test(s), 'no placeholder text: ' + s);
// the Barbarians rule: they are polite and into pottery; nothing in their text calls them savage (covered above), and the pottery gag exists
ok(/pottery/i.test(unitsText.UNIT_TEXT.berserker.lore) && all.filter((s) => /pottery/i.test(s)).length >= 4, 'barbarians are surprisingly into pottery');

if (failures.length) { console.error(failures.slice(0, 60).join('\n')); console.error(`humor text tests: ${failures.length} FAILED of ${checks}`); process.exit(1); }
assert.strictEqual(failures.length, 0);
console.log(`humor text tests: ${checks} checks passed (${all.length} strings swept)`);
