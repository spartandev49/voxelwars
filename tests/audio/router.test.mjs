// Event -> cue rules (spec/audio.md section 4) against a recording fake `play`: mapping, layering, rate limits, overrides.
import assert from 'node:assert/strict';
import { createRouter, arenaInfo, unitProfile, CUES } from '../../src/audio/cues.js';
import { STAT_TABLE } from '../../src/content/era_ancient/stats.js';
import { mulberry32 } from '../../src/audio/util.js';

function rig(o = {}) {
  const log = []; let t = o.t0 || 100; const ducks = [];
  const r = createRouter({
    play: (cue, x, y, z, po) => { assert.ok(CUES[cue], 'router played unknown cue ' + cue); log.push({ cue, x, y, z, o: po || {}, t }); },
    duck: (b, db, ms) => ducks.push({ b, db, ms, t }), now: () => t, rng: mulberry32(o.seed || 1),
    listener: () => ({ x: 0, y: 20, z: 0, yaw: 0 }), defs: o.defs === undefined ? STAT_TABLE : o.defs, world: o.world || null, arena: arenaInfo(o.arena || null),
    playerTeam: o.playerTeam, announcerVoice: o.voice ? () => true : undefined, hooks: o.hooks,
  });
  return { r, log, ducks, at: (x) => { t = x; }, adv: (d) => { t += d; }, cues: () => log.map((l) => l.cue), clear: () => { log.length = 0; ducks.length = 0; }, now: () => t };
}
const hit = (o = {}) => Object.assign({ src: 1, dst: 2, srcDef: 'hoplite', dstDef: 'cretan_archer', dmg: 14, type: 'pierce', crit: false, backstab: false, charge: 0, proj: false, aoe: false, x: 5, y: 1.5, z: 3 }, o);

// ---- unit_hit: impact family by damage type + flesh/armor by target; positions pass through; crit adds crit
{
  const R = rig(); let n = 0;
  for (let i = 0; i < 40; i++) R.r.handle('unit_hit', hit({ type: 'slash' })); let c = R.cues();
  assert.ok(c.includes('hit_blade') && !c.includes('hit_pierce'), 'slash -> hit_blade');
  assert.ok(c.includes('hit_flesh_light') && !c.includes('hit_armor'), 'unarmored target -> flesh');
  const first = R.log.find((l) => l.cue === 'hit_blade'); assert.deepEqual([first.x, first.y, first.z], [5, 1.5, 3]);
  R.clear(); for (let i = 0; i < 100; i++) R.r.handle('unit_hit', hit({ type: 'pierce', dstDef: 'cataphract' })); c = R.cues();
  const nArm = c.filter((x) => x === 'hit_armor').length, nFl = c.filter((x) => x === 'hit_flesh_light').length;
  assert.ok(c.includes('hit_pierce') && nArm > 60 && nArm < 100 && nFl > 0, `heavily armored target mostly clanks (${nArm} armor / ${nFl} flesh of 100)`);
  R.clear(); for (let i = 0; i < 100; i++) R.r.handle('unit_hit', hit({ type: 'pierce', dstDef: 'cretan_archer' })); assert.ok(!R.cues().includes('hit_armor'), 'unarmored target never clanks');
  R.clear(); R.r.handle('unit_hit', hit({ type: 'blunt', dmg: 30 })); c = R.cues(); assert.ok(c.includes('hit_blunt') && c.includes('hit_flesh_heavy'), 'heavy blunt -> flesh_heavy');
  R.clear(); R.r.handle('unit_hit', hit({ crit: true })); assert.ok(R.cues().includes('crit'));
  R.clear(); R.r.handle('unit_hit', hit({ dstDef: 'hoplite' })); for (let i = 0; i < 30; i++) R.r.handle('unit_hit', hit({ dstDef: 'hoplite' })); assert.ok(R.cues().includes('block_shield'), 'shielded targets sometimes add a tiny rattle');
  assert.ok(R.log.filter((l) => l.cue === 'block_shield').every((l) => l.o.vol <= 0.3), 'rattle is tiny');
  // projectile hits get their sound from projectile_hit: no duplicate impact here
  R.clear(); R.r.handle('unit_hit', hit({ proj: true, type: 'pierce' })); assert.deepEqual(R.cues(), [], 'proj hit on flesh adds nothing');
  for (let i = 0; i < 40; i++) R.r.handle('unit_hit', hit({ proj: true, dstDef: 'cataphract' })); assert.ok(R.cues().length > 10 && R.cues().every((c) => c === 'hit_armor'), 'projectiles ping off heavy armour');
  // distance cull 90 u
  R.clear(); R.r.handle('unit_hit', hit({ x: 200, z: 0 })); assert.deepEqual(R.cues(), [], 'culled beyond 90 u'); assert.ok(R.r.stats.culled >= 1);
  // heroes raise priority
  R.clear(); R.r.handle('unit_hit', hit({ dstDef: 'strategos', type: 'slash' })); assert.ok(R.log.every((l) => l.o.priority >= 70) && R.log.some((l) => l.o.priority >= 85), 'hero hits are high priority');
  // UnitDef.sfx overrides the default impact family
  const defs = Object.assign({}, STAT_TABLE, { hoplite: Object.assign({}, STAT_TABLE.hoplite, { sfx: { hit: 'hit_blunt', death: 'death_oof' } }) });
  const R2 = rig({ defs }); R2.r.handle('unit_hit', hit({ srcDef: 'hoplite', type: 'pierce' })); assert.ok(R2.cues().includes('hit_blunt') && !R2.cues().includes('hit_pierce'), 'sfx.hit override');
  R2.r.handle('unit_kill', { src: 1, dst: 2, srcDef: 'hoplite', dstDef: 'hoplite', cause: 'melee', x: 4, y: 0, z: 2 }); assert.ok(R2.cues().includes('death_oof'), 'sfx.death override');
}

// ---- block / projectiles
{
  const R = rig();
  R.r.handle('unit_block', { src: 1, dst: 2, x: 2, y: 1, z: 2, kind: 'proj' }); assert.deepEqual(R.cues(), ['arrow_hit_shield']);
  R.clear(); for (let i = 0; i < 50; i++) R.r.handle('unit_block', { src: 1, dst: 2, x: 2, y: 1, z: 2, kind: 'melee' }); assert.ok(R.cues().every((c) => c === 'block_shield' || c === 'block_parry') && R.cues().includes('block_parry'));
  for (const [kind, cue] of [['arrow', 'bow_shoot'], ['javelin', 'javelin_throw'], ['pilum', 'javelin_throw'], ['francisca', 'javelin_throw'], ['boulder', 'catapult_launch'], ['bolt', 'ballista_twang'], ['coin', 'coin_clink'], ['thunderbolt', 'lightning_zap']]) { R.clear(); R.r.handle('projectile_launch', { kind, team: 0, x: 3, y: 2, z: 3 }); assert.ok(R.cues().includes(cue), kind + ' -> ' + cue + ' got ' + R.cues()); }
  R.clear(); R.r.handle('projectile_hit', { kind: 'arrow', x: 3, y: 1, z: 3, onUnit: true, blocked: false }); assert.deepEqual(R.cues(), ['arrow_hit_flesh']);
  R.clear(); R.r.handle('projectile_hit', { kind: 'arrow', x: 3, y: 1, z: 3, onUnit: true, blocked: true }); assert.deepEqual(R.cues(), ['arrow_hit_shield']);
  R.clear(); R.r.handle('projectile_hit', { kind: 'arrow', x: 3, y: 0, z: 3, onUnit: false, blocked: false }); assert.deepEqual(R.cues(), ['arrow_hit_wood']);
  R.clear(); R.r.handle('projectile_hit', { kind: 'boulder', x: 3, y: 0, z: 3, onUnit: false, blocked: false }); assert.deepEqual(R.cues(), ['boulder_impact']);
}

// ---- unit_kill: death voice by def; hero kills duck the music; comic oof ~15%
{
  const R = rig(); const k = (dstDef, o = {}) => R.r.handle('unit_kill', Object.assign({ src: 1, dst: 2, srcDef: 'hoplite', dstDef, cause: 'melee', x: 3, y: 0, z: 3 }, o));
  const cuesFor = (def, o) => { R.clear(); k(def, o); return R.cues(); };
  assert.ok(cuesFor('sacred_chicken').includes('chicken_cluck')); assert.ok(cuesFor('battle_goat').includes('goat_bleat')); assert.ok(cuesFor('warhound').includes('death_animal'));
  assert.ok(cuesFor('war_elephant').includes('elephant_trumpet') && cuesFor('war_elephant').includes('death_big')); assert.ok(cuesFor('minotaur').includes('minotaur_roar')); assert.ok(cuesFor('cyclops').includes('cyclops_roar')); assert.ok(cuesFor('medusa').includes('medusa_hiss'));
  assert.ok(cuesFor('trojan_horse').includes('wall_crumble')); assert.ok(cuesFor('catapult').includes('wood_crack'));
  let oof = 0, male = 0, scream = 0; const N = 2000; for (let i = 0; i < N; i++) { const c = cuesFor('hoplite'); if (c.includes('death_oof')) oof++; else if (c.includes('death_male')) male++; else if (c.includes('death_scream')) scream++; }
  assert.ok(oof / N > 0.1 && oof / N < 0.2, 'death_oof ~15%: ' + oof / N); assert.equal(scream, 0, 'melee deaths do not scream');
  let sc = 0; for (let i = 0; i < 200; i++) if (cuesFor('hoplite', { cause: 'lightning' }).includes('death_scream')) sc++; assert.ok(sc === 200, 'lightning deaths scream');
  R.clear(); k('strategos'); assert.ok(R.ducks.some((d) => d.b === 'music' && d.db === -3), 'hero kills duck music 3 dB');
  R.clear(); k('hoplite'); assert.equal(R.ducks.length, 0);
  assert.ok(R.log.every((l) => l.x === 3 && l.z === 3));
  const mounted = cuesFor('companion_cavalry'); assert.ok(mounted.some((c) => /death/.test(c)));
}

// ---- global sequence cues: battle start/end, rate limits
{
  const R = rig({ playerTeam: 0 });
  R.r.handle('battle_countdown', { n: 3 }); R.adv(1); R.r.handle('battle_countdown', { n: 2 }); R.adv(1); R.r.handle('battle_countdown', { n: 1 });
  const beeps = R.log.filter((l) => l.cue === 'ui_countdown_beep'); assert.equal(beeps.length, 3); assert.ok(beeps[0].o.pitch < beeps[2].o.pitch, 'countdown pitch rises');
  R.clear(); R.r.handle('battle_start', { teams: [] }); let c = R.cues(); for (const need of ['jingle_start', 'horn_war', 'drum_boom', 'battle_cry']) assert.ok(c.includes(need), 'battle_start plays ' + need);
  R.clear(); R.r.handle('battle_end', { winner: 0, reason: 'elimination' }); assert.ok(R.cues().includes('jingle_victory')); assert.ok(R.ducks.some((d) => d.b === 'music'));
  R.clear(); R.r.handle('battle_end', { winner: 1, reason: 'elimination' }); assert.ok(R.cues().includes('jingle_defeat') && !R.cues().includes('jingle_victory'), 'player team lost -> defeat jingle');
  R.clear(); R.r.handle('battle_end', { winner: -1, reason: 'intervention' }); assert.ok(R.cues().includes('stinger_funny'));
  // stingers: 1 per 15 s across first_blood / hero_down / lead_change / streaks
  const S = rig(); S.at(1000);
  const st = () => S.log.filter((l) => /^stinger_/.test(l.cue)).length;
  S.r.handle('first_blood', {}); S.adv(1); S.r.handle('hero_down', { id: 1, def: 'strategos', team: 0 }); S.adv(1); S.r.handle('lead_change', { team: 1, ratio: 1.2 }); S.adv(5); S.r.handle('hero_down', {}); assert.equal(st(), 1, 'stinger rate limit 1 per 15 s');
  S.adv(15); S.r.handle('hero_down', {}); assert.equal(st(), 2, 'allowed again after 15 s');
  const nStingers = () => S.log.filter((l) => /^stinger_/.test(l.cue)).length; const before = nStingers(); for (let i = 0; i < 100; i++) { S.adv(0.2); S.r.handle('lead_change', {}); S.r.handle('hero_down', {}); } assert.ok(nStingers() - before <= 2 + 100 * 0.2 * 2 / 15 + 1, 'sustained flood stays <= 1 per 15 s: ' + (nStingers() - before));
  // humor events
  const H = rig(); H.at(2000);
  H.r.handle('chicken_tantrum', {}); assert.ok(H.cues().includes('chicken_rage'));
  H.clear(); H.adv(20); H.r.handle('trojan_reveal', {}); assert.ok(H.cues().includes('horn_charge') && H.cues().includes('wood_crack'));
  H.clear(); H.adv(20); H.r.handle('throne_sit', {}); assert.ok(H.cues().includes('stinger_funny'));
  H.clear(); H.r.handle('philosopher_monologue', {}); assert.ok(H.cues().includes('philosopher_mumble'));
  // god powers
  const G = rig();
  const gp = (kind) => { G.clear(); G.r.handle('god_power', { kind, x: 10, z: 10, team: 0 }); return G.cues(); };
  assert.ok(gp('zeus_lightning').includes('thunder_crack') && gp('zeus_lightning').includes('lightning_zap')); assert.ok(gp('meteor').includes('fire_ignite')); assert.ok(gp('earthquake').includes('rubble'));
  assert.ok(gp('heal_wave').includes('heal_chime')); assert.ok(gp('wine_rain').includes('wine_pour')); assert.ok(gp('raise_chickens').filter((c) => c === 'chicken_cluck').length >= 5, 'chicken_cluck x N');
  // abilities
  const A = rig(); const ab = (a) => { A.clear(); A.r.handle('ability_cast', { id: 1, ability: a, x: 3, z: 3, team: 0 }); return A.cues(); };
  for (const [a, cue] of [['kick', 'kick_whoomp'], ['net', 'net_throw'], ['heal_pulse', 'heal_chime'], ['aura', 'buff_power'], ['rage', 'buff_power'], ['war_horn', 'horn_war'], ['tantrum', 'chicken_rage'], ['chain_lightning', 'lightning_zap'], ['revive', 'revive_chime'], ['dot_cloud', 'curse_whoosh'], ['execute', 'crit']]) assert.ok(ab(a).includes(cue), a + ' -> ' + cue);
  // destruction
  const D = rig(); const pd = (type) => { D.clear(); D.r.handle('prop_destroyed', { id: 1, type, x: 5, y: 0, z: 5, s: 1 }); return D.cues(); };
  assert.ok(pd('wall_stone').includes('wall_crumble') && pd('tower').includes('wall_crumble')); assert.ok(pd('tree_oak').includes('wood_crack') && pd('crate').includes('wood_crack'));
  D.clear(); D.r.handle('crater', { x: 3, z: 3, r: 3 }); assert.ok(D.cues().includes('voxel_break')); D.clear(); D.r.handle('explosion', { kind: 'fire', x: 3, y: 0, z: 3, r: 3 }); assert.ok(D.cues().includes('fire_ignite'));
}

// ---- colosseum crowd: reacts to kill clusters at most once per 3 s; other arenas stay silent
{
  const arena = { name: 'Colosseum', env: { theme: 'roman' }, props: [], biome: 'sand' };
  const C = rig({ arena }); C.at(500);
  const kill = () => C.r.handle('unit_kill', { src: 1, dst: 2, srcDef: 'hoplite', dstDef: 'legionary', cause: 'melee', x: 3, y: 0, z: 3 });
  for (let i = 0; i < 4; i++) { kill(); C.adv(0.2); }
  assert.equal(C.log.filter((l) => /^crowd_cheer/.test(l.cue)).length, 1, 'kill cluster -> crowd cheer');
  for (let i = 0; i < 30; i++) { kill(); C.adv(0.1); }   // 3 s of continuous kills
  assert.ok(C.log.filter((l) => /^crowd_cheer/.test(l.cue)).length <= 3, 'crowd rate 1 per 3 s: ' + C.log.filter((l) => /^crowd_cheer/.test(l.cue)).length);
  const N = rig(); N.at(500); for (let i = 0; i < 30; i++) { N.r.handle('unit_kill', { src: 1, dst: 2, srcDef: 'hoplite', dstDef: 'legionary', cause: 'melee', x: 3, y: 0, z: 3 }); N.adv(0.1); }
  assert.equal(N.log.filter((l) => /^crowd_/.test(l.cue)).length, 0, 'no crowd outside the colosseum');
  C.clear(); C.adv(5); C.r.handle('hero_down', { id: 1 }); assert.ok(C.cues().includes('crowd_gasp'));
}

// ---- events without a position resolve through the world (or the tracked last position); announcer voice is opt-in
{
  const world = { state: 'running', units: [{ id: 7, x: 10, y: 0, z: 12, px: 10, pz: 12, def: { id: 'war_elephant' } }, { id: 8, x: -4, y: 0, z: 6, px: -4, pz: 6, def: { id: 'philosopher' } }], dying: [] };
  const W = rig({ world });
  W.r.handle('trample', { id: 7, count: 1 }); assert.deepEqual(W.log.map((l) => [l.cue, l.x, l.z]), [['elephant_step', 10, 12]]);
  W.clear(); W.r.handle('ability_cast', { id: 8, ability: 'cc_field', x: -4, z: 6, team: 0 }); assert.ok(W.cues().includes('philosopher_mumble'), 'cc_field of a philosopher mumbles');
  W.clear(); W.adv(5); W.r.handle('bark', { id: 8, text: 'hmm' }); assert.deepEqual(W.cues(), ['philosopher_mumble']);
  const T = rig();   // no world: positions come from earlier events
  T.r.handle('unit_spawn', { id: 7, team: 0, def: 'war_elephant', x: 20, z: 1 }); T.r.handle('trample', { id: 7, count: 1 }); assert.deepEqual(T.log.map((l) => [l.cue, l.x, l.z]), [['elephant_step', 20, 1]]);
  const V = rig({ voice: true }); V.r.handle('battle_start', {}); assert.ok(V.cues().includes('announce_go')); const NV = rig(); NV.r.handle('battle_start', {}); assert.ok(!NV.cues().includes('announce_go'), 'announcer voice clips are opt-in');
  // placing units makes the place click with mass-dependent pitch (+/- 4%)
  const P = rig({ world: { state: 'placing', units: [] } }); P.r.handle('unit_spawn', { id: 1, team: 0, def: 'sacred_chicken', x: 0, z: 0 }); P.r.handle('unit_spawn', { id: 2, team: 0, def: 'war_elephant', x: 0, z: 0 });
  const [light, heavy] = P.log.map((l) => l.o.pitch); assert.ok(light > heavy && light <= 1.04 && heavy >= 0.96, `place pitch by mass ${light} ${heavy}`);
}

// ---- profiles + arena info
{
  assert.equal(unitProfile(STAT_TABLE.strategos, 'strategos').hero, true); assert.equal(unitProfile(STAT_TABLE.war_elephant).big, true); assert.equal(unitProfile(STAT_TABLE.cataphract).armored, true); assert.equal(unitProfile(null, 'sacred_chicken').species, 'chicken');
  const a = arenaInfo({ name: 'Colosseum', env: { theme: 'roman', weather: 'clear', time: 12, wind: 0.5 }, biome: 'sand', props: [], water: 0 }); assert.ok(a.colosseum && a.ambience.includes('amb_wind') && a.ambience.includes('crowd_loop') && a.ambience.includes('amb_desert'));
  const b = arenaInfo({ name: 'Nile', env: { theme: 'egypt', weather: 'storm', time: 12 }, biome: 'sand', water: 9, props: [] }); assert.ok(b.ambience.includes('amb_water') && b.storm && b.rain);
  const c = arenaInfo({ name: 'x', env: { theme: 'greek', weather: 'clear', time: 22 }, biome: 'grass', props: [] }); assert.ok(!c.ambience.includes('amb_birds'), 'no birds at night');
  assert.deepEqual(arenaInfo(null).ambience.slice(0, 1), ['amb_wind']);
}
console.log('router.test OK');
