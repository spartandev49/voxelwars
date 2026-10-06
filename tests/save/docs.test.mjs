// Doc + migrations + tombstones + drafts (P1, P3, B11). Run: node tests/save/docs.test.mjs
import assert from 'node:assert/strict';
import { Store } from '../../src/save/store.js';
import { Doc, createDocs, createDraft, sanitize } from '../../src/save/docs.js';
import { migrate, CURRENT, normDate, streakFrom } from '../../src/save/migrate.js';
import { TOMBSTONES, MYSTERY_GOAT, resolveUnit, unitLabel, remapArmy, pruneAchievements, isTombstoned, conflicts, pruneProps, resolveArena } from '../../src/save/tombstones.js';
import { V1 } from './fixtures/v1_blobs.mjs';

const mem = () => { const m = new Map(); return { get length() { return m.size; }, key: (i) => Array.from(m.keys())[i], getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, _m: m }; };
const put = (be, key, env) => be.setItem('vw.' + key, JSON.stringify(env));

// ---------------------------------------------------------------- migrate: v1 -> v2 for every document
{
  const p = migrate('progress', V1.progress);
  assert.ok(p.ok); assert.equal(p.v, 2); assert.deepEqual(p.steps, ['progress v1 -> v2']);
  assert.deepEqual(p.data.stars, { marathon_sort_of: 3, thermopylae_snack: 2, nile_crossing: 1, alps_elephant: 3 }, 'array stars -> map, clamped, junk dropped');
  assert.deepEqual(p.data.achievements, { first_victory: { at: 0 }, sparta: { at: 0 } }, 'achievement ids array -> {id:{at}}, invalid ids dropped');
  assert.deepEqual(p.data.codex, { locked: [], seen: { hoplite: true, spartan: true } });
  assert.equal(p.data.mystery, undefined); assert.equal(p.data.survivalBest, undefined, 'moved to the survival document');
  assert.deepEqual(p.side, { survival: { best: 14230 }, daily: { last: '2026-03-01' } });

  const pm = migrate('progress', V1.progressMap);
  assert.deepEqual(pm.data.stars, { marathon_sort_of: 2, thermopylae_snack: 3, future_mission: 1 }, 'invalid ids drop, valid unknown ids (a newer build) are kept');
  assert.deepEqual(pm.data.achievements, { first_victory: { at: 0 }, goat_herder: { at: 1700000000000 }, tourist: { at: 1710000000000 } });
  assert.deepEqual(pm.data.codex, { locked: ['zeus_bolt'], seen: { cyclops: true } });

  const s = migrate('survival', V1.survival);
  assert.equal(s.data.best, 9000); assert.equal(s.data.bestWave, 7);
  assert.deepEqual(s.data.board.map((r) => r.score), [9000, 5000, 1200]); assert.equal(s.data.board[1].date, '2026-01-05');

  const d = migrate('daily', V1.daily);
  assert.equal(d.data.last, '2026-03-02'); assert.deepEqual(d.data.history.map((h) => h.date), ['2026-03-02', '2026-03-01', '2026-02-27']);
  assert.equal(d.data.history[1].result, 'win', 'the first row of a duplicate day wins'); assert.equal(d.data.history[0].left, 100, 'left clamps to 100'); assert.equal(d.data.history[0].time, 90);
  assert.equal(d.data.streak, 2, 'Mar 1 + Mar 2 are consecutive; Feb 27 is not');

  const se = migrate('seen', V1.seen);
  assert.deepEqual(se.data, { teaching: true, beacon: true, codex_intro: true });

  // a v2 blob passes through untouched; a newer blob is flagged; unknown/odd input never throws
  const v2 = { v: 2, data: { stars: { marathon_sort_of: 1 } } };
  assert.deepEqual(migrate('progress', v2).data, v2.data); assert.deepEqual(migrate('progress', v2).steps, []);
  const fut = migrate('progress', { v: 9, data: { x: 1 } }); assert.ok(fut.ok && fut.future);
  assert.equal(migrate('nope', v2).ok, false); assert.equal(migrate('progress', null).ok, false); assert.equal(migrate('progress', { v: 1, data: 7 }).ok, true);
  assert.equal(normDate('2026-02-30'), '', 'impossible dates are rejected'); assert.equal(normDate(20260229), ''); assert.equal(normDate(20240229), '2024-02-29');
  assert.equal(streakFrom([{ date: '2026-03-01' }, { date: '2026-02-28' }], '2026-03-01'), 2, 'month boundary');
}

// ---------------------------------------------------------------- Doc over a real Store: load-time migration, backup, side effects
{
  const be = mem(); put(be, 'progress', V1.progress); put(be, 'survival', { v: 1, data: [{ score: 100, waves: 1 }] }); put(be, 'daily', V1.daily); put(be, 'seen', V1.seen);
  const store = new Store(be);
  const docs = createDocs(store).loadAll();
  assert.equal(docs.progress.get('stars').marathon_sort_of, 3);
  assert.deepEqual(docs.progress.info.migrated, ['progress v1 -> v2']);
  assert.equal(JSON.parse(be.getItem('vw.progress')).v, 2, 'migrated blob is written back as v2');
  assert.ok(be.getItem('vw.bak.progress.v1'), 'the v1 blob is backed up once'); assert.deepEqual(JSON.parse(be.getItem('vw.bak.progress.v1')).data.survivalBest, 14230);
  // side effect: progress.survivalBest (14230) beats the survival document's own best (100)
  assert.equal(docs.survival.get('best'), 14230); assert.equal(docs.progress.get('survivalBest'), 14230);
  assert.equal(docs.progress.get('dailyLast'), '2026-03-02', 'daily.last (from the daily doc) is newer than the side value');
  assert.equal(docs.daily.get('streak'), 2);
  // loading again does not re-migrate or overwrite the backup
  const again = createDocs(new Store(be)).loadAll(); assert.deepEqual(again.progress.info.migrated, []);
  // the UI's view: progress.get('daily') / set('daily')
  const dly = docs.progress.get('daily'); assert.equal(dly.history.length, 3);
  docs.progress.set('daily', { last: '2026-03-03', streak: 3, history: [{ date: '2026-03-03', result: 'win', time: 10, left: 90 }] });
  assert.equal(docs.daily.get('last'), '2026-03-03'); assert.equal(JSON.parse(be.getItem('vw.daily')).data.last, '2026-03-03');
}

// ---------------------------------------------------------------- Doc semantics
{
  const be = mem(); const store = new Store(be); const d = new Doc(store, 'seen', {});
  assert.equal(d.get('x'), undefined); assert.equal(d.get('x', 5), 5);
  assert.ok(d.set('teaching', true)); assert.equal(d.get('teaching'), true);
  const o = { a: [1, 2, { b: 3 }] }; d.set('o', o); o.a[2].b = 99; assert.equal(d.get('o').a[2].b, 3, 'writes are cloned');
  const g = d.get('o'); g.a.push(4); assert.equal(d.get('o').a.length, 3, 'reads are cloned');
  assert.equal(d.set('__proto__', 1), false); assert.equal(d.set('', 1), false);
  d.set('bad', { __proto__x: 1, n: NaN, f() {}, ok: 1 }); assert.deepEqual(d.get('bad'), { __proto__x: 1, n: 0, ok: 1 });
  assert.equal(Object.keys(sanitize(JSON.parse('{"__proto__":{"x":1},"y":2}'))).join(), 'y');
  let deep = {}; let cur = deep; for (let i = 0; i < 30; i++) { cur.n = {}; cur = cur.n; } assert.equal(d.set('deep', deep), false, 'too deep is refused');
  assert.ok(d.remove('o')); assert.equal(d.has('o'), false);
  const ev = []; const off = d.onChange((k, v) => ev.push(k)); d.set('z', 1); d.remove('z'); off(); d.set('q', 1); assert.deepEqual(ev, ['z', 'z']);
  assert.ok(Object.keys(d.all()).includes('teaching')); d.reset(); assert.deepEqual(d.all(), {});
  // survives a reload
  d.set('k', 'v'); const d2 = new Doc(new Store(be), 'seen', {}); assert.equal(d2.get('k'), 'v');
  // a document written by a NEWER build is read-only and untouched
  put(be, 'seen', { v: 7, data: { fromTheFuture: true } });
  const f = new Doc(new Store(be), 'seen', {}); assert.equal(f.get('fromTheFuture'), true); assert.equal(f.status, 'readonly'); assert.equal(f.set('x', 1), false); assert.equal(JSON.parse(be.getItem('vw.seen')).v, 7);
  f.reset(); assert.equal(f.status, 'ok', 'reset is the explicit way out');
  // corrupt data: backed up, defaults used
  be.setItem('vw.progress', '{not json'); const c = createDocs(new Store(be)); assert.deepEqual(c.progress.get('stars'), {});
  put(be, 'progress', { v: 2, data: 'a string' }); const c2 = createDocs(new Store(be)); assert.deepEqual(c2.progress.get('stars'), {}); assert.ok(be.getItem('vw.bak.progress.corrupt'));
  // partial v2 blob keeps working: missing keys come from the defaults
  put(be, 'progress', { v: 2, data: { stars: { marathon_sort_of: 1 } } }); const c3 = createDocs(new Store(be)); assert.deepEqual(c3.progress.get('codex'), { locked: [], seen: {} });
  // storage blocked: memory fallback, still works
  const blocked = new Store(null); const bd = createDocs(blocked); bd.progress.set('stars', { marathon_sort_of: 3 }); assert.equal(bd.progress.get('stars').marathon_sort_of, 3); assert.equal(blocked.status(), 'memory');
  // debounced persistence with an injected scheduler
  const q = []; const be3 = mem(); const dd = new Doc(new Store(be3), 'seen', { debounceMs: 100, schedule: (fn) => { q.push(fn); return () => { q.length = 0; }; } });
  dd.set('a', 1); dd.set('b', 2); assert.equal(be3.getItem('vw.seen'), null); assert.equal(q.length, 1); q[0](); assert.equal(JSON.parse(be3.getItem('vw.seen')).data.b, 2);
  dd.set('c', 3); dd.flush(); assert.equal(JSON.parse(be3.getItem('vw.seen')).data.c, 3);
  // reset progress wipes progress (UI: Settings > Reset)
  const rp = createDocs(new Store(mem())); rp.progress.set('stars', { marathon_sort_of: 3 }); rp.progress.reset(); assert.deepEqual(rp.progress.get('stars'), {});
}

// ---------------------------------------------------------------- drafts
{
  const be = mem(); const store = new Store(be); let t = 1000; const dr = createDraft(store, 'arena', () => t);
  assert.equal(dr.load(), null); assert.ok(dr.save({ h: [1, 2, 3], name: 'wip' })); assert.deepEqual(dr.load(), { h: [1, 2, 3], name: 'wip' }); assert.deepEqual(dr.meta(), { at: 1000 });
  assert.ok(be.getItem('vw.draft.arena')); dr.clear(); assert.equal(dr.load(), null); assert.equal(be.getItem('vw.draft.arena'), null);
  assert.throws(() => createDraft(store, 'nonsense'), /Unknown editor/);
  assert.equal(dr.save({ big: 'x'.repeat(19000) }), true); const huge = []; for (let i = 0; i < 300; i++) huge.push('y'.repeat(19000)); assert.equal(dr.save(huge), false, 'drafts over the size cap are refused');
  assert.equal(createDraft(store, 'soldier').load(), null, 'drafts are per editor');
}

// ---------------------------------------------------------------- tombstones (P3)
{
  const defs = { hoplite: { name: 'Hoplite' }, battle_goat: { name: 'Battle Goat' }, immortal: { name: 'Immortal' } };
  const T = { unit: { retired_spartan: { removed: 'v1.4' }, old_archer: { removed: 'v1.5', by: 'immortal' } }, prop: { palm_old: { removed: 'v1.4' } }, achievement: { gone_medal: { removed: 'v1.4' } }, arena: { dune: { removed: 'v1.4', by: 'oasis' }, lost: { removed: 'v1.4' } }, cue: {}, clip: {}, mutator: {} };
  assert.deepEqual(resolveUnit('hoplite', defs, T), { id: 'hoplite', tombstoned: false, unknown: false });
  assert.deepEqual(resolveUnit('retired_spartan', defs, T), { id: 'battle_goat', name: 'Mystery Goat', tombstoned: true, unknown: false }, 'tombstoned unit -> Mystery Goat');
  assert.equal(resolveUnit('old_archer', defs, T).id, 'immortal', 'a live replacement wins');
  assert.equal(resolveUnit('from_the_future', defs, T).unknown, true);
  assert.equal(unitLabel('retired_spartan', defs, T), 'Mystery Goat'); assert.equal(unitLabel('hoplite', defs, T), 'Hoplite');
  const army = { name: 'Old', records: [{ team: 0, defId: 'hoplite', positions: [[0, 0]] }, { team: 0, defId: 'retired_spartan', positions: [[1, 1]] }, { team: 0, defId: 'x_custom', custom: { a: 1 }, positions: [[2, 2]] }] };
  const r = remapArmy(army, defs, T); assert.deepEqual(r.replaced, ['retired_spartan']); assert.equal(r.army.records[1].defId, 'battle_goat'); assert.equal(r.army.records[1].was, 'retired_spartan'); assert.equal(army.records[1].defId, 'retired_spartan', 'input not mutated');
  assert.deepEqual(Object.keys(pruneAchievements({ gone_medal: { at: 1 }, sparta: { at: 2 } }, T)), ['sparta']);
  assert.equal(resolveArena('dune', T), 'oasis'); assert.equal(resolveArena('lost', T), null); assert.equal(resolveArena('marathon', T), 'marathon');
  assert.deepEqual(pruneProps([['tree_oak', 0, 0], ['palm_old', 1, 1]], T).dropped, ['palm_old']);
  assert.deepEqual(conflicts({ unit: ['hoplite'] }, T), []); assert.deepEqual(conflicts({ unit: ['hoplite', 'retired_spartan'] }, T), ['unit:retired_spartan']);
  assert.equal(MYSTERY_GOAT.name, 'Mystery Goat'); assert.equal(isTombstoned('unit', 'retired_spartan', T), true);
  // the shipped table must never list a live id (the goat stand-in must exist in the real content)
  const { buildSimDefs } = await import('../../src/sim/defs.js'); const live = buildSimDefs();
  assert.ok(live[MYSTERY_GOAT.id], 'the Mystery Goat stand-in is a real unit');
  assert.deepEqual(conflicts({ unit: Object.keys(live) }), []);
}
console.log('docs OK');
