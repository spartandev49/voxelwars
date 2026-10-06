// Pure logic: shuffle bag, voice budget / priority stealing / cooldowns, distance + pan maths, music intensity mapping,
// track choice by theme, catalog selectors.
import assert from 'node:assert/strict';
import { ShuffleBag, mulberry32, db2lin } from '../../src/audio/util.js';
import { VoiceManager } from '../../src/audio/voices.js';
import { Listener, spatialize, distanceGain, farCutoff, SPATIAL } from '../../src/audio/spatial.js';
import { intensityParams, intensityFromState, IntensityTracker, pickTrack, rankTracks, normMood } from '../../src/audio/music.js';
import { Catalog, pcmCeiling, groupOf } from '../../src/audio/manifest.js';
import { realManifest } from './helpers.mjs';

// ---- shuffle bag: never the same item twice in a row, each item once per cycle
{
  const bag = new ShuffleBag(['a', 'b', 'c'], mulberry32(5)); let last = null; const counts = { a: 0, b: 0, c: 0 };
  for (let i = 0; i < 3000; i++) { const v = bag.next(); assert.notEqual(v, last, 'immediate repeat at ' + i); last = v; counts[v]++; }
  assert.ok(Math.abs(counts.a - 1000) <= 1 && Math.abs(counts.b - 1000) <= 1);
  const two = new ShuffleBag([1, 2], mulberry32(1)); let l2 = 0; for (let i = 0; i < 100; i++) { const v = two.next(); assert.notEqual(v, l2); l2 = v; }
  const one = new ShuffleBag(['x'], mulberry32(1)); assert.equal(one.next(), 'x'); assert.equal(one.next(), 'x');   // a single variant can only repeat
  const chg = new ShuffleBag(['a', 'b'], mulberry32(9)); let lc; for (let i = 0; i < 50; i++) { if (i === 25) chg.setItems(['a', 'b', 'c']); const v = chg.next(); assert.notEqual(v, lc); lc = v; }
  for (let seed = 1; seed < 40; seed++) { const b = new ShuffleBag([1, 2, 3, 4, 5], mulberry32(seed)); let p = 0; for (let i = 0; i < 200; i++) { const v = b.next(); assert.notEqual(v, p); p = v; } }
}

// ---- voice manager
{
  const vm = new VoiceManager(32);
  // fill with priority-10 voices, then a priority-100 voice must steal one, a priority-5 one must be dropped
  const stolen = []; vm.onSteal = (h) => stolen.push(h);
  for (let i = 0; i < 32; i++) assert.ok(vm.acquire('far_hit', 10, 0, 5), 'fill ' + i);
  assert.equal(vm.active(0), 32);
  assert.equal(vm.acquire('x', 5, 0, 5), null); assert.equal(vm.lastDrop, 'budget');
  assert.equal(vm.acquire('x', 10, 0, 5), null, 'equal priority does not steal');
  const hero = vm.acquire('hero', 100, 0, 5); assert.ok(hero); assert.equal(stolen.length, 1); assert.equal(vm.active(0), 32);
  assert.ok(vm.peak <= 32);
  // never more than 32 even under hammering with random priorities
  const r = mulberry32(3); for (let i = 0; i < 5000; i++) { vm.acquire('f' + (i % 9), r() * 100, i * 0.001, i * 0.001 + r() * 0.6); assert.ok(vm.active(i * 0.001) <= 32); }
  assert.ok(vm.peak <= 32 && vm.steals > 0);
  // voices that ended free the budget
  const v2 = new VoiceManager(4); for (let i = 0; i < 4; i++) v2.acquire('a', 50, 0, 1); assert.equal(v2.acquire('a', 50, 0.5, 2), null); assert.ok(v2.acquire('a', 50, 1.01, 2));
  // cooldown + per-family max
  const v3 = new VoiceManager(32); assert.ok(v3.acquire('hit', 50, 0, 1, 0.02, 10)); assert.equal(v3.acquire('hit', 50, 0.01, 1, 0.02, 10), null); assert.equal(v3.lastDrop, 'cooldown'); assert.ok(v3.acquire('hit', 50, 0.03, 1, 0.02, 10));
  const v4 = new VoiceManager(32); for (let i = 0; i < 6; i++) assert.ok(v4.acquire('death', 55, i, 10, 0, 6)); assert.equal(v4.acquire('death', 55, 7, 10, 0, 6), null); assert.equal(v4.lastDrop, 'family');
  assert.ok(v4.acquire('death', 90, 7, 10, 0, 6), 'a higher priority voice replaces the weakest of its own family'); assert.equal(v4.famActive('death'), 6);
  // reserved voices (loops) shrink the budget so total stays <= 32
  const v5 = new VoiceManager(32); v5.reserved = 5; for (let i = 0; i < 40; i++) v5.acquire('a', 50 + i * 0.01, 0, 9); assert.equal(v5.v.length, 27); assert.ok(v5.peak <= 32);
}

// ---- spatial
{
  const L = new Listener().set(0, 20, 0, 0), out = {};
  spatialize(L, 0, 0, 0, 14, 90, out); assert.ok(out.gain > 0.35 && out.gain < 1 && Math.abs(out.pan) < 1e-9 && !out.cull);
  assert.ok(distanceGain(0, 14) === 1 && distanceGain(140, 14) < 0.05);
  const g = [5, 15, 30, 60, 89].map((d) => { spatialize(L, d, 0, 0, 14, 90, out); return out.gain; });
  for (let i = 1; i < g.length; i++) assert.ok(g[i] < g[i - 1], 'monotonic attenuation');
  spatialize(L, 200, 0, 0, 14, 90, out); assert.ok(out.cull);
  // pan: camera yaw 0 faces +Z, its RIGHT is -X (spec axes)
  spatialize(L, -20, 0, 0, 14, 90, out); assert.ok(out.pan > 0.5, 'right of a +Z-facing listener is -X: pan ' + out.pan);
  spatialize(L, 20, 0, 0, 14, 90, out); assert.ok(out.pan < -0.5);
  spatialize(L, 0, 0, 30, 14, 90, out); assert.ok(Math.abs(out.pan) < 1e-9, 'straight ahead is centred');
  spatialize(L, 100, 0, 0, 14, 200, out); assert.equal(out.pan, -SPATIAL.panMax);
  const L90 = new Listener().set(0, 20, 0, Math.PI / 2);   // facing +X: its right is +Z
  spatialize(L90, 0, 0, 20, 14, 90, out); assert.ok(out.pan > 0.5);
  // far low-pass 18 k -> 2.5 k
  assert.ok(Math.abs(farCutoff(0, 90) - 18000) < 1 && Math.abs(farCutoff(90, 90) - 2500) < 1 && farCutoff(45, 90) < 18000 && farCutoff(45, 90) > 2500);
  assert.ok(Number.isFinite(new Listener().set(NaN, undefined, Infinity, NaN).x), 'listener sanitises NaN');
}

// ---- music intensity mapping: lowpass 1.8k..18k, gain -6..0 dB; smoothing constant gives 95% in 1.5 s
{
  const lo = intensityParams(0), hi = intensityParams(1), mid = intensityParams(0.5);
  assert.ok(Math.abs(lo.cutoff - 1800) < 1 && Math.abs(hi.cutoff - 18000) < 1 && lo.gainDb === -6 && hi.gainDb === 0);
  assert.ok(mid.cutoff > 1800 && mid.cutoff < 18000 && Math.abs(mid.gainDb + 3) < 1e-9);
  let prev = 0; for (let x = 0; x <= 1; x += 0.05) { const p = intensityParams(x); assert.ok(p.cutoff >= prev); prev = p.cutoff; }
  assert.equal(intensityParams(5).cutoff, intensityParams(1).cutoff); assert.equal(intensityParams(NaN).gainDb, -6);
  assert.ok(Math.abs((1 - Math.exp(-1.5 / 0.5)) - 0.95) < 0.001);
  const calm = intensityFromState({ aliveFrac: 1, start: 300, killRate: 0, heroBump: 0, time: 0 });
  const hot = intensityFromState({ aliveFrac: 0.4, start: 300, killRate: 4, heroBump: 1, time: 100 });
  assert.ok(calm < 0.3 && hot > 0.8, `calm ${calm} hot ${hot}`);
  const tr = new IntensityTracker(); for (let i = 0; i < 12; i++) tr.note('unit_kill', {}, i * 0.5); assert.ok(tr.rate(6) > 1 && tr.rate(60) < 0.01);
  tr.note('hero_down', {}, 6); assert.ok(tr.heroBump(6) > 0.9 && tr.heroBump(40) < 0.05);
}

// ---- catalog selectors + track choice by arena theme (real ledger)
{
  const cat = new Catalog(realManifest());
  assert.ok(cat.select(['sword_hit']).length >= 3);
  assert.ok(cat.select(['#footstep&#grass']).every((e) => e.tagSet.has('grass')));
  assert.ok(cat.select(['sword_hit', '!sword_hit_1']).every((e) => e.id !== 'sword_hit_1'));
  assert.ok(cat.select(['@ambience']).length >= 1);
  assert.equal(cat.select(['no_such_family']).length, 0);
  assert.ok(cat.select(['ui_click'])[0].url.startsWith('assets/audio/sfx/'), 'url resolves under assets/audio/sfx: ' + cat.select(['ui_click'])[0].url);
  assert.ok(cat.music.length >= 6 && cat.music.every((e) => e.url.startsWith('assets/audio/music/')));
  assert.equal(normMood('battle_high'), 'battle'); assert.equal(normMood('Title'), 'menu');
  // dark themes prefer the dark drum track, heroic themes the epic ones; a theme never picks 'victory' material for battle
  const dark = rankTracks(cat, 'battle', 'barbarian')[0].e, brass = rankTracks(cat, 'battle', 'carthage')[0].e, heroic = rankTracks(cat, 'battle', 'greek')[0].e;
  assert.ok(/low/.test(dark.id) || dark.tagSet.has('tribal'), 'barbarian -> dark drums: ' + dark.id);
  assert.ok(brass.energy === 'high' || brass.tagSet.has('brass'), 'carthage -> brass: ' + brass.id);
  assert.ok(heroic.tagSet.has('epic') || heroic.tagSet.has('orchestral'), 'greek -> heroic: ' + heroic.id);
  // one track per battle + shuffle: successive battles on the same theme never repeat immediately when >= 2 candidates
  const bags = new Map(), rng = mulberry32(11); let last = null;
  for (let i = 0; i < 40; i++) { const t = pickTrack(cat, 'battle', 'greek', bags, rng); assert.ok(t); if (rankTracks(cat, 'battle', 'greek').filter((x) => x.s >= rankTracks(cat, 'battle', 'greek')[0].s - 2).length > 1) assert.notEqual(t.id, last); last = t.id; }
  for (const m of ['menu', 'editor', 'victory', 'defeat', 'comedy']) assert.ok(pickTrack(cat, m, '', new Map(), rng), 'a track exists for mood ' + m);
  assert.equal(pickTrack(new Catalog({ sfx: [], music: [] }), 'menu', '', new Map(), rng), null);
  assert.equal(pcmCeiling('potato'), 40 * 1048576); assert.equal(pcmCeiling('olympian'), 240 * 1048576);
  assert.equal(groupOf(cat.get('ui_click_1')), 'ui'); assert.equal(groupOf(cat.get('sword_hit_1')), 'combat');
}
console.log('pure.test OK');
