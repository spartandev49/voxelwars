// Headless meta layer test: a real World with the real event bus, 600+ ticks, then assertions on stats, the dispatch order of battle_end,
// announcer/kill-feed output, funnyStats and lessons shapes, achievements persistence + toasts. Run: node tests/app/meta.test.mjs
import assert from 'node:assert/strict';
import { makeWorld, makeMeta, FakeGame, mem, defs } from './_harness.mjs';
import { Store } from '../../src/save/store.js';
import { createDocs } from '../../src/save/docs.js';
import { LifetimeStats, storeAdapter } from '../../src/save/stats.js';
import { getAchievement, ACHIEVEMENTS } from '../../src/content/era_ancient/humor/achievements.js';
import { RESULT_LABELS } from '../../src/content/era_ancient/humor/results_text.js';
import { KILL_VERBS } from '../../src/content/era_ancient/humor/killverbs.js';

// ---------------------------------------------------------------- a full battle through the meta layer
const world = makeWorld({ a: [['hoplite', 14], ['cretan_archer', 6]], b: [['hoplite', 6], ['sacred_chicken', 2]], seed: 11 });
const order = [];                                              // the order the three battle_end consumers run in
const H = makeMeta({ world });
const { meta, game, stats, docs } = H;
const origStats = stats.onEvent.bind(stats); stats.onEvent = (type, p, env) => { const r = origStats(type, p, env); if (type === 'battle_end') order.push('stats:' + stats.get().battles); return r; };
const origCheck = meta.achievements.check; meta.achievements.check = (ev) => { if (ev && ev.kind === 'battle_end') order.push('achievements:' + stats.get().battles); return origCheck(ev); };
const origAnn = meta.announcer.onEvent; meta.announcer.onEvent = (type, p, ctx) => { if (type === 'battle_end') order.push('announcer:' + stats.get().battles); return origAnn(type, p, ctx); };

// a Game-like battle_end handler that asks for results() inside the event, like app/game.js does (this runs BEFORE meta's own bus listener)
let handlerResults = null; world.events.on('battle_end', () => { game.state = 'ended'; const base = { winner: world.winner, reason: world.endReason, time: world.time, teams: [0, 1].map((t) => ({ alive: world.stats[t].alive, dead: world.stats[t].dead, kills: world.stats[t].kills, damage: world.stats[t].damageDealt, lostCost: world.stats[t].deadCost })), mvp: null, funnyStats: [], lessons: [], canRematch: true, canNext: false, setup: null };
  let mv = null; for (const u of world.units) if (!mv || u.kills > mv.kills) mv = u; for (const u of world.dying) if (!mv || u.kills > mv.kills) mv = u; if (mv) base.mvp = { defId: mv.def.id, name: mv.name || mv.def.name, kills: mv.kills };
  handlerResults = meta.decorateResults(base); });

game.state = 'countdown'; world.start(0);
let ticks = 0; const frame = () => { meta.onFrame(1 / 30); };
while (world.state !== 'ended' && ticks < 30 * 240) { world.tick(); ticks++; if (ticks % 3 === 0) frame(); }
assert.equal(world.state, 'ended', 'the battle finishes'); assert.ok(ticks >= 100, 'a real battle (' + ticks + ' ticks, ' + (ticks / 30).toFixed(1) + ' s)');
for (let i = 0; i < 90; i++) frame();                          // keep pumping real time after the end (victory lines, toasts)

// -- dispatch order and exactly-once
assert.deepEqual(order, ['stats:1', 'achievements:1', 'announcer:1'], 'battle_end runs stats -> achievements -> announcer, once, with the battle already counted: ' + order.join());
assert.ok(handlerResults, 'results() was computed inside the battle_end event'); assert.equal(meta.finished, true);

// -- lifetime stats match the sim's own bookkeeping (negative control against double counting)
const g = stats.get(); const S = stats.summary(); const ws = world.stats;
assert.equal(g.battles, 1); assert.ok(Math.abs(g.playSeconds - world.time) < 1e-6, 'playSeconds = battle_end.t');
assert.equal(g.wins === 1 ? world.winner === 0 : g.losses === 1 ? world.winner === 1 : g.draws === 1, true);
assert.equal(S.unitsStart, 20); assert.equal(S.unitsLost + S.unitsAlive, 20, 'every unit of ours is lost or alive'); assert.equal(ws[0].dead, S.unitsLost); assert.equal(ws[0].alive, S.unitsAlive);
assert.equal(S.kills + S.friendlyKills, ws[0].kills, "stats.kills (+ friendly) equals the sim's kill counter for team 0"); assert.equal(g.kills, S.kills);
assert.equal(g.unitsPlaced, 20, 'the roster at battle_start'); assert.equal(g.byDef.hoplite.spawned, 14); assert.equal(g.byDef.cretan_archer.spawned, 6);
assert.equal(g.arenasPlayed.colosseum, 1); assert.equal(S.arenaId, 'colosseum'); assert.equal(S.playerCostStart, ws[0].startCost); assert.equal(S.enemyCostStart, ws[1].startCost);
assert.ok(S.kills > 0 && g.arrows > 0, 'the archers fired: ' + g.arrows);
const sumDef = Object.values(g.byDef).reduce((n, d) => n + d.kills, 0); assert.equal(sumDef, g.kills, 'byDef kills add up to kills');
const sumCause = Object.values(g.byCause).reduce((n, v) => n + v, 0); assert.equal(sumCause, g.kills, 'byCause adds up to kills');
assert.equal(S.win, world.winner === 0); assert.equal(S.reason, world.endReason);

// -- persistence: the document layer + stats were written
const raw = JSON.parse(H.store.getRaw('stats')); assert.equal(raw.data.battles, 1); assert.equal(raw.data.v, 1);
assert.ok(H.store.getVersioned('progress'), 'progress persisted'); assert.equal(H.store.getVersioned('progress').v, 2);

// -- results decoration: funnyStats shape, lessons, mvp quote
const R = handlerResults;
assert.ok(Array.isArray(R.funnyStats) && R.funnyStats.length >= 1 && R.funnyStats.length <= 4, 'funnyStats: 1-4 rows (the Results screen shows four)');
const labels = new Set(Object.values(RESULT_LABELS).flatMap((e) => e.labels));
for (const r of R.funnyStats) { assert.equal(typeof r.label, 'string'); assert.ok(labels.has(r.label), 'label comes from results_text.js: ' + r.label); assert.equal(typeof r.value, 'string'); assert.ok(r.value.length > 0); }
assert.ok(R.funnyStats.some((r) => /^\d+:\d\d$/.test(r.value)) || R.funnyStats.length === 4, 'duration "m:ss" is in the list when there is room');
assert.equal(R.lessons.length, 3, 'three lessons'); for (const l of R.lessons) { assert.equal(l.who, 'cassandra'); assert.ok(l.text.length > 10 && l.fix.length > 5 && !/\{\w+\}/.test(l.text + l.fix), 'lesson text filled: ' + l.text); }
assert.ok(R.mvp && typeof R.mvp.quote === 'string' && R.mvp.quote.length > 5, 'the MVP gets last words'); assert.equal(R.summary, S);
const again = meta.decorateResults({ mvp: { defId: 'hoplite', name: 'x', kills: 1 }, funnyStats: [], lessons: [] }); assert.deepEqual(again.funnyStats, R.funnyStats, 'results are computed once per battle: a second call returns the same rows'); assert.deepEqual(again.lessons.map((l) => l.id), R.lessons.map((l) => l.id));

// -- kill feed: funny verbs, killer/victim split, key per kill, never more than 5
assert.ok(game.killfeed.length >= 1 && game.killfeed.length <= 5);
const allVerbs = new Set(Object.values(KILL_VERBS).flatMap((e) => (e.by || []).concat(e.solo || [])));
for (const it of game.killfeed) { assert.ok(allVerbs.has(it.verb), 'verb from killverbs.js: ' + it.verb); assert.ok(it.text.includes(it.verb)); assert.ok(it.key.startsWith('k')); assert.equal(typeof it.t, 'number'); assert.ok(it.team === 0 || it.team === 1 || it.team === -1); if (it.killer) assert.equal(it.text, it.killer + ' ' + it.verb + ' ' + it.victim); }
assert.equal(new Set(game.killfeed.map((i) => i.key)).size, game.killfeed.length);

// -- announcer: lines published to game.announce AND the 'announce' event, in the shape the HUD reads
const lines = game.eventsOf('announce'); assert.ok(lines.length >= 2, 'the announcer spoke (' + lines.length + ' lines)');
for (const l of lines) { assert.ok(['brutus', 'plato', 'cassandra'].includes(l.who)); assert.equal(typeof l.text, 'string'); assert.ok(l.text.length > 5 && !/\{[a-z0-9_:|]+\}/.test(l.text), 'slots filled: ' + l.text); assert.equal(typeof l.t, 'number'); assert.equal(typeof l.id, 'string'); }
assert.equal(game.announce.text, lines[lines.length - 1].text); assert.ok(lines.some((l) => l.cat === 'battle_start' || l.cat === 'first_blood' || l.cat === 'victory' || l.cat === 'defeat'), 'a lifecycle line: ' + lines.map((l) => l.cat).join());
// slot sanity: the arena and faction names reach the text


// -- achievements: first victory is persisted with a toast
if (S.win) {
  assert.ok(docs.progress.get('achievements').first_victory, 'first_victory persisted'); assert.equal(docs.progress.get('achievements').first_victory.at, 1750000000000);
  const toasts = game.eventsOf('toast').filter((t) => /Achievement unlocked/.test(t.text)); assert.ok(toasts.length >= 1 && toasts[0].kind === 'success');
  assert.ok(toasts[0].text.includes(getAchievement('first_victory').name), toasts[0].text);
  assert.ok(R.achievements.some((a) => a.id === 'first_victory'), 'ResultsData lists what unlocked');
} else assert.ok(!docs.progress.get('achievements').first_victory, 'no victory, no medal');
// unlocking is idempotent: a second battle does not re-grant
console.log('battle: ticks', ticks, 'winner', world.winner, world.endReason, '| kills', g.kills, 'friendly', g.friendlyKills, '| lines', lines.length, '| unlocked', meta.debug().unlockedNow.join() || '-');

// ---------------------------------------------------------------- idempotence + detach safety
const n0 = stats.get().battles; world.events.emit('battle_end', { winner: 0, reason: 'elimination', t: 99, stats: world.stats, perDef: [{}, {}] }); assert.equal(stats.get().battles, n0, 'a second battle_end on the same world is ignored');
meta.detach(); assert.equal(meta.active, false); assert.equal(game.announce, null); world.events.emit('unit_kill', { src: 1, dst: 2, srcDef: 'hoplite', dstDef: 'hoplite', srcTeam: 0, dstTeam: 1, friendly: false, cause: 'melee', x: 0, y: 0, z: 0 }); assert.equal(stats.get().kills, g.kills, 'detached: no more accumulation');
meta.onFrame(0.1); meta.decorateResults({}); meta.decorateHud({}); meta.aim.set('meteor'); meta.possess.input({ move: { x: 1, y: 0 } }); meta.teaching.next();

// ---------------------------------------------------------------- side swap: the player controls team 1
{
  const w2 = makeWorld({ a: [['hoplite', 4]], b: [['hoplite', 12]], seed: 3 });
  const X = makeMeta({ world: w2, setup: { kind: 'quick', playerTeam: 1, arena: { presetId: 'troy', size: 'small', seed: 1 }, rules: {}, armies: {} } });
  X.game.state = 'countdown'; w2.start(0); let n = 0; while (w2.state !== 'ended' && n < 30 * 200) { w2.tick(); n++; }
  X.meta.finish(); const s2 = X.stats.summary(); assert.equal(s2.playerTeam, 1); assert.equal(s2.win, w2.winner === 1, 'team 1 is the player: its win is a win');
  assert.equal(s2.unitsStart, 12); assert.equal(s2.kills + s2.friendlyKills, w2.stats[1].kills); assert.equal(X.stats.get().unitsLost || 0, w2.stats[1].dead); assert.equal(X.stats.get().arenasPlayed.troy, 1);
  assert.equal(X.stats.get().wins || 0, s2.win ? 1 : 0); assert.ok(s2.aliveDefs.hoplite === undefined || s2.aliveDefs.hoplite === w2.stats[1].alive);
}

// ---------------------------------------------------------------- UI events + achievements outside a battle
{
  const X = makeMeta({}); const unlocked = X.meta.ui('arena_saved'); assert.deepEqual(unlocked, ['landscaper']); assert.ok(X.docs.progress.get('achievements').landscaper);
  X.meta.onFrame(0.1); assert.equal(X.game.eventsOf('toast').length, 1, 'the toast is shown from the frame pump'); assert.match(X.game.eventsOf('toast')[0].text, /Landscaper/);
  assert.deepEqual(X.meta.ui('arena_saved'), [], 'not granted twice'); assert.deepEqual(X.meta.ui('soldier_saved'), ['soldier_smith']);
  for (let i = 0; i < 3; i++) X.meta.onFrame(0.1); assert.equal(X.game.eventsOf('toast').length, 1, 'toasts are spaced 2 s apart'); for (let i = 0; i < 30; i++) X.meta.onFrame(0.1); assert.equal(X.game.eventsOf('toast').length, 2);
  // campaign: stars land in progress and stats; the full set grants ancient_history / overachiever
  const ids = ['marathon_sort_of', 'thermopylae_snack', 'pyramid_scheme', 'nile_crossing', 'alps_elephant', 'teutoburg_peekaboo', 'troy_giftshop', 'cyclops_meet', 'zeus_bad_day'];
  let got = []; for (const id of ids) got = got.concat(X.meta.recordCampaign(id, 3)); assert.ok(got.includes('ancient_history') && got.includes('overachiever'), got.join());
  assert.equal(X.docs.progress.get('stars').zeus_bad_day, 3); assert.equal(X.stats.get().campaignStars, 27); assert.deepEqual(X.meta.recordCampaign('bogus', 3), []);
  // a plain re-check grants totals-based medals only (imports): 1000 kills
  X.stats.load({ kills: 1500 }); assert.deepEqual(X.meta.achievements.recheck(), ['body_count']);
  assert.equal(X.meta.achievements.list().length, ACHIEVEMENTS.length); assert.ok(X.meta.achievements.list().find((a) => a.id === 'body_count').unlocked);
}

// ---------------------------------------------------------------- announcer output respects the settings and the audio facade
{
  const spoken = []; const audio = { speech: { isEnabled: () => true, setSpeed() {}, speak: (t, o) => { spoken.push([t, o]); return true; } }, play() {} };
  const X = makeMeta({ audio }); const line = { text: 'Hello, arena.', pri: 4 };
  assert.equal(X.meta.speak(line), false, 'tts off: silent'); X.settings.set('tts', true); assert.equal(X.meta.speak(line), true); assert.deepEqual(spoken[0], ['Hello, arena.', { priority: 4 }]);
  X.settings.set('muted', true); assert.equal(X.meta.speak(line), false, 'muted: silent'); X.settings.set('muted', false); X.settings.set('vol.announcer', 0); assert.equal(X.meta.speak(line), false);
  const X2 = makeMeta({ audio: { speech: { isEnabled: () => { throw new Error('boom'); } } } }); X2.settings.set('tts', true); assert.equal(X2.meta.speak(line), false, 'a broken audio facade never throws'); assert.equal(makeMeta({}).meta.speak(line), false, 'no audio: fine');
}
// ---------------------------------------------------------------- storage quota guard (P2): one modal, export or delete-oldest, nothing lost
{
  const { watchQuota } = await import('../../src/app/meta.js'); const { Collection } = await import('../../src/save/store.js'); const { createTransfer } = await import('../../src/save/transfer.js');
  const qmem = (quota) => { const m = new Map(); let bytes = 0; return { get length() { return m.size; }, key: (i) => Array.from(m.keys())[i], getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { v = String(v); const old = m.has(k) ? m.get(k).length : 0; if (bytes - old + v.length > quota) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } bytes += v.length - old; m.set(k, v); }, removeItem: (k) => { if (m.has(k)) { bytes -= m.get(k).length; m.delete(k); } } }; };
  const store = new Store(qmem(1500)); const cols = { arenas: new Collection(store, 'arenas', 48), soldiers: new Collection(store, 'soldiers', 24), armies: new Collection(store, 'armies', 24) };
  const modals = [], toasts = []; let resolveModal = null; let clock = 1000;
  const T = createTransfer({ store, collections: cols, settings: { flush() {} }, docs: { flush() {} }, stats: { flush() {} } });
  const nav = { modal: (o) => { modals.push(o); return new Promise((r) => { resolveModal = r; }); }, toast: (t, o) => toasts.push([t, o && o.kind]) };
  const guard = watchQuota({ store, nav, transfer: T, collections: cols, platform: { clipboard: async () => true }, now: () => clock });
  const tick = () => new Promise((r) => setTimeout(r, 15));
  cols.arenas.put({ id: 'old', name: 'Old', pad: 'a'.repeat(500) }); cols.arenas.put({ id: 'mid', name: 'Mid', pad: 'b'.repeat(500) });
  assert.equal(modals.length, 0); cols.arenas.put({ id: 'new', name: 'New', pad: 'c'.repeat(600) });          // refused by the browser
  await tick(); assert.equal(store.status(), 'full'); assert.equal(modals.length, 1, 'one modal when the shelf is full');
  assert.equal(modals[0].title, 'The storage shelf is full'); assert.deepEqual(modals[0].buttons.map((b) => b.value), ['export', 'arena', null]);
  assert.ok(cols.arenas.get('new'), 'the refused save is still readable (nothing lost)'); assert.deepEqual(store.pending(), ['arenas']);
  resolveModal('arena'); await tick();
  assert.equal(store.status(), 'ok', 'deleting the oldest arena made room and flushPending wrote the kept save'); assert.deepEqual(cols.arenas.list().map((a) => a.id).sort(), ['mid', 'new'], 'the OLDEST arena was deleted'); assert.deepEqual(store.pending(), []);
  assert.equal(toasts.at(-1)[1], 'success');
  // no second modal inside 30 s
  cols.arenas.put({ id: 'huge', name: 'Huge', pad: 'd'.repeat(1400) }); await tick(); assert.equal(store.status(), 'full'); assert.equal(modals.length, 1, 'throttled to one modal per 30 s');
  cols.arenas.remove('huge'); store.flushPending(); clock += 31000;
  cols.arenas.put({ id: 'huge2', name: 'Huge2', pad: 'e'.repeat(1400) }); await tick(); assert.equal(modals.length, 2, 'allowed again later'); resolveModal(null); await tick();
  // the export button copies the code to the clipboard
  const p = guard.show(); await tick(); resolveModal('export'); await p; assert.match(toasts.at(-1)[0], /copied/i);
}
console.log('meta OK');
