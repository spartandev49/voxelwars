// A1 (clip format validator) + A2 (minimum clip set exists and plays on every rig) + sim timing agreement.
import assert from 'node:assert';
import { boot, ClipLib, Animator, collectWarnings, ok } from './_common.mjs';
import { makeHum1Ref, makeHumLiteRef, makeSoldier } from '../fixtures/rigs.js';
import { BUILDERS } from '../../src/content/era_ancient/beasts/index.js';
import { DEFAULT_META } from '../../src/anim/clips.js';

boot();

// ---- A1: every registered clip is well formed ----------------------------------------------------------------------------------------------------
const PARTS = {
  hum1: new Set(['body', 'head', 'crest', 'armUL', 'armLL', 'armUR', 'armLR', 'weapon', 'offhand', 'legUL', 'legLL', 'legUR', 'legLR', 'back', 'cape', 'cape2']),
  quad1: new Set(['body', 'neck', 'head', 'tail', 'legFL', 'legFR', 'legBL', 'legBR', 'saddle', 'mane', 'ears', 'horns', 'barding']),
  elephant1: new Set(['body', 'head', 'trunkA', 'trunkB', 'trunkC', 'earL', 'earR', 'tail', 'legFL', 'legFR', 'legBL', 'legBR', 'howdah']),
  chariot1: new Set(['body', 'wheelL', 'wheelR', 'pole']),
  catapult1: new Set(['frame', 'wheelL', 'wheelR', 'arm', 'sling', 'stone']),
  ballista1: new Set(['frame', 'wheelL', 'wheelR', 'bow', 'string', 'bolt']),
  chicken1: new Set(['body', 'head', 'wingL', 'wingR', 'legL', 'legR', 'tail']),
  trojan1: new Set(['base', 'wheelFL', 'wheelFR', 'wheelBL', 'wheelBR', 'body', 'neck', 'head', 'tail', 'legFL', 'legFR', 'legBL', 'legBR', 'hatch']),
};
const ROOT_CH = new Set(['y', 'x', 'z', 'pitch', 'roll', 'yaw']);
let nClips = 0;
for (const key of ClipLib.qualifiedIds()) {
  const [rig, id] = key.split(':');
  const c = ClipLib.getQualified(id, rig);
  nClips++;
  assert.ok(c && c.id === id && c.rig === rig, `${key}: id/rig mismatch`);
  assert.strictEqual(c.fps, 30, `${key}: fps`);
  assert.ok(Number.isInteger(c.frames) && c.frames >= 2, `${key}: frames`);
  assert.ok(PARTS[rig], `${key}: unknown rig`);
  for (const [tag, map, n] of [['q', c.q, 3], ['t', c.t, 3], ['s', c.s, 3]]) {
    if (!map) continue;
    for (const p of Object.keys(map)) {
      assert.ok(PARTS[rig].has(p) || /^[a-z]+\d?_/.test(p), `${key}: ${tag} track for unknown part '${p}'`);
      assert.strictEqual(map[p].length, c.frames * n, `${key}: ${tag}.${p} length`);
      for (let i = 0; i < map[p].length; i++) assert.ok(Number.isFinite(map[p][i]), `${key}: ${tag}.${p}[${i}] not finite`);
    }
  }
  if (c.root) for (const k of Object.keys(c.root)) { assert.ok(ROOT_CH.has(k), `${key}: root.${k}`); assert.strictEqual(c.root[k].length, c.frames, `${key}: root.${k} length`); for (const v of c.root[k]) assert.ok(Number.isFinite(v), `${key}: root.${k} not finite`); }
  if (c.aim) { assert.strictEqual(c.aim.length, c.frames * 4, `${key}: aim length`); for (const v of c.aim) assert.ok(Number.isFinite(v)); }
  for (const k of ['hitFrame', 'recoverFrame']) if (c.meta[k] !== undefined) assert.ok(c.meta[k] >= 0 && c.meta[k] < c.frames, `${key}: meta.${k} ${c.meta[k]} outside 0..${c.frames - 1}`);
  if (c.meta.hitFrame !== undefined && c.meta.recoverFrame !== undefined) assert.ok(c.meta.recoverFrame >= c.meta.hitFrame, `${key}: recover before hit`);
  if (c.meta.speedRef !== undefined) assert.ok(c.meta.speedRef > 0, `${key}: speedRef`);
  if (c.loop) { // loops close: the wrap step is no bigger than the largest ordinary step
    let maxStep = 0, wrap = 0;
    for (const p of Object.keys(c.q)) { const a = c.q[p]; for (let k = 0; k < 3; k++) { for (let i = 1; i < c.frames; i++) maxStep = Math.max(maxStep, Math.abs(a[i * 3 + k] - a[(i - 1) * 3 + k])); wrap = Math.max(wrap, Math.abs(a[k] - a[(c.frames - 1) * 3 + k])); } }
    assert.ok(wrap <= Math.max(0.12, maxStep * 1.6), `${key}: loop seam ${wrap.toFixed(3)} vs max step ${maxStep.toFixed(3)}`);
  }
}
ok(`A1 clip format: ${nClips} clips valid`);

// ---- A2: the minimum sets exist per rig and play without a fallback warning ------------------------------------------------------------------------
const HUM1_SET = ['idle', 'idle_combat', 'walk', 'jog', 'run', 'rout', 'strike_slash_1', 'strike_slash_2', 'strike_thrust', 'strike_overhead', 'strike_bash', 'shoot_bow', 'throw', 'cast', 'launch', 'kick',
  'block_hold', 'block_hit', 'hit_front', 'hit_back', 'stagger', 'stun', 'dizzy', 'death_back', 'death_front', 'death_spin', 'getup', 'cheer', 'taunt', 'cower', 'sleep', 'sit', 'flail', 'tumble',
  'ride_idle', 'ride_walk', 'ride_trot', 'ride_gallop', 'ride_strike', 'ride_shoot', 'ride_death', 'crew_idle', 'crew_crank', 'crew_push', 'crew_shoot', 'crew_react', 'crew_launch'];
const QUAD_SET = ['idle', 'idle_combat', 'walk', 'trot', 'gallop', 'rear', 'strike_bite', 'strike_headbutt', 'hit_front', 'hit_back', 'stagger', 'stun', 'dizzy', 'cower', 'sleep', 'death_back', 'death_front', 'death_spin', 'getup', 'taunt', 'cheer'];
const ELE_SET = ['idle', 'idle_combat', 'walk', 'run', 'strike_gore', 'strike_stomp', 'trumpet', 'hit_front', 'stagger', 'stun', 'dizzy', 'cower', 'death_back'];
const CHARIOT_SET = ['idle', 'idle_combat', 'trot', 'gallop', 'strike_ram', 'shoot_bow', 'hit_front', 'death_back'];
const CATAPULT_SET = ['idle', 'idle_combat', 'walk', 'launch', 'reload', 'hit_front', 'death_back'];
const BALLISTA_SET = CATAPULT_SET;
const CHICKEN_SET = ['idle', 'idle_combat', 'walk', 'trot', 'gallop', 'strike_peck', 'flap', 'tantrum', 'hit_front', 'hit_back', 'stagger', 'stun', 'dizzy', 'cower', 'death_back'];
const TROJAN_SET = ['idle', 'idle_combat', 'walk', 'strike_ram', 'reveal', 'death_back'];
const SETS = { hum1: HUM1_SET, quad1: QUAD_SET, elephant1: ELE_SET, chariot1: CHARIOT_SET, catapult1: CATAPULT_SET, ballista1: BALLISTA_SET, chicken1: CHICKEN_SET, trojan1: TROJAN_SET };
for (const rig of Object.keys(SETS)) for (const id of SETS[rig]) assert.ok(ClipLib.getQualified(id, rig), `A2: missing clip ${rig}:${id}`);
ok('A2 minimum clip sets exist for every rig');

// every humanoid model kind plays every humanoid clip id without a missing-clip / missing-part warning
const models = [makeHum1Ref({ weapon: 'sword', shield: true }), makeHum1Ref({ weapon: 'bow', back: 'quiver' }), makeHumLiteRef(), await makeSoldier({ main: 'dory', off: 'hoplon' }), await makeSoldier({ main: 'greataxe', off: 'none' })];
const poseOut = (m) => new Float32Array(m.parts.length * 9);
const warns = collectWarnings(() => {
  for (const m of models) {
    const out = poseOut(m), root = { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 };
    for (const id of HUM1_SET.filter((x) => !/^(ride|crew)_/.test(x))) {
      const dur = ClipLib.dur(id, 'hum1');
      for (const f of [0, 0.5, 1]) { Animator.pose(m, { clip: id, t: dur * f, rate: 1, flinch: 0, dir: 0, prev: id, blend: 1 }, { root, speed: 0, id: 3 }, out); for (const v of out) assert.ok(Number.isFinite(v), `${m.id}/${id}: NaN in pose`); }
    }
  }
});
assert.deepStrictEqual(warns.filter((w) => !/lite/.test(w)), [], 'A2: warnings while posing humanoids');
ok(`A2 humanoid clips play on ${models.length} humanoid models (hum1, hum_lite, compiled soldiers) with no fallback warnings`);

// shipped beast / siege / mount models play their sets (BEASTS builders)
const unitSets = { war_elephant: ['elephant1', ELE_SET], chariot_archer: ['chariot1', CHARIOT_SET], catapult: ['catapult1', CATAPULT_SET], ballista: ['ballista1', BALLISTA_SET], trojan_horse: ['trojan1', TROJAN_SET], sacred_chicken: ['chicken1', CHICKEN_SET],
  warhound: ['quad1', QUAD_SET], battle_goat: ['quad1', QUAD_SET], companion_cavalry: ['quad1', QUAD_SET], camel_rider: ['quad1', QUAD_SET], centaur_archer: ['quad1', QUAD_SET] };
const w2 = collectWarnings(() => {
  for (const [builder, [rig, ids]] of Object.entries(unitSets)) {
    const m = BUILDERS[builder](), out = poseOut(m), root = { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 };
    assert.strictEqual(m.meta.rig, rig, `${builder}: rig`);
    for (const id of ids) {
      if (/^(hit_back|death_front|death_spin|getup|taunt|cheer|rear|strike_headbutt|strike_bite|sleep)$/.test(id) && rig !== 'quad1' && rig !== 'chicken1') continue;
      const dur = ClipLib.dur(id, rig);
      for (const f of [0, 0.5, 1]) { Animator.pose(m, { clip: id, t: dur * f, rate: 1, flinch: 0, dir: 0, prev: id, blend: 1 }, { root, speed: 0, id: 3 }, out); for (const v of out) assert.ok(Number.isFinite(v), `${builder}/${id}: NaN`); }
    }
  }
});
const w2f = w2.filter((w) => !/rig (hum1|hum_lite)\b.*(strike_|ride_)|animates part/.test(w));
assert.deepStrictEqual(w2f, [], 'A2: warnings while posing beast/siege/mount models');
ok(`A2 shipped beast / siege / mount models play their clip sets (${Object.keys(unitSets).length} builders)`);

// ---- sim timing: DEFAULT_META is a design target; registered clips replace it and stay within +-25% of it ------------------------------------------
const drift = [];
for (const id of Object.keys(DEFAULT_META)) {
  const d = DEFAULT_META[id], m = ClipLib.meta(id);
  if (!m.loop && Math.abs(m.dur - d.dur) > Math.max(0.12, d.dur * 0.25) && !/^(death_back|getup|hit_front)$/.test(id)) drift.push(`${id}: ${m.dur.toFixed(2)} vs design ${d.dur}`);
  if (d.hit !== undefined) assert.ok(m.hit !== undefined && Math.abs(m.hit - d.hit) <= Math.max(0.06, d.hit * 0.2), `hit time of ${id}: ${m.hit} vs design ${d.hit}`);
}
assert.deepStrictEqual(drift, [], 'registered durations drifted from DEFAULT_META');
// all variants of one id share the hit time the sim uses (the sim asks ClipLib.hit(id) without a rig)
for (const key of ClipLib.qualifiedIds()) {
  const [rig, id] = key.split(':');
  const q = ClipLib.meta(id, rig), plain = ClipLib.meta(id);
  if (q.hit !== undefined && plain.hit !== undefined && /^(strike_|launch|shoot_bow|throw|cast|kick|reveal|trumpet|ride_strike|ride_shoot)/.test(id)) assert.ok(Math.abs(q.hit - plain.hit) <= 0.1, `${key}: hit ${q.hit} differs from the plain id's ${plain.hit}`);
}
ok('timing: hit times agree with DEFAULT_META and between rig variants');
