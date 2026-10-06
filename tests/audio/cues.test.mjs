// AU3: cue family table, resolution against the real asset ledger, synth coverage, UI helpers.
import assert from 'node:assert/strict';
import { CUES, CUE_IDS, UI_CUES, AMBIENCE_IDS } from '../../src/audio/cues.js';
import { SYNTH_FAMILIES, RECIPES } from '../../src/audio/synth.js';
import { Catalog } from '../../src/audio/manifest.js';
import { SfxBank } from '../../src/audio/sfx.js';
import { realManifest, fixtureManifest } from './helpers.mjs';

// ---- the family table lists every family of spec/audio.md section 3 (113) and nothing is malformed
const SPEC = `hit_blade hit_pierce hit_blunt hit_flesh_light hit_flesh_heavy hit_armor block_shield block_parry crit swing_light swing_heavy bow_shoot arrow_whoosh arrow_hit_flesh arrow_hit_wood arrow_hit_shield javelin_throw spear_thrust axe_chop kick_whoomp net_throw
death_male death_scream death_oof death_big death_animal battle_cry taunt cheer_small philosopher_mumble senator_blah chicken_cluck chicken_rage goat_bleat hound_bark horse_neigh horse_gallop camel_groan elephant_trumpet elephant_step minotaur_roar cyclops_roar medusa_hiss
crowd_cheer_small crowd_cheer_big crowd_gasp crowd_boo crowd_loop horn_war horn_charge horn_victory drum_boom drum_roll gong
catapult_creak catapult_launch ballista_twang boulder_whoosh boulder_impact wall_crumble wood_crack rubble voxel_break
fire_ignite fire_loop thunder_crack lightning_zap heal_chime buff_power curse_whoosh coin_clink stone_freeze wine_pour confetti_pop voxel_pop debris_clatter revive_chime
ui_hover ui_click ui_confirm ui_back ui_error ui_toggle ui_tick ui_panel_open ui_panel_close ui_achievement ui_countdown_beep ui_go ui_place ui_erase
jingle_victory jingle_defeat jingle_start stinger_hero_down stinger_epic stinger_funny
step_dirt step_grass step_stone step_sand step_snow step_mud step_wood step_water armor_rustle
amb_wind amb_birds amb_desert amb_forest amb_water amb_fire amb_crowd`.split(/\s+/);
assert.equal(SPEC.length, 113, 'spec lists 113 families');
for (const id of SPEC) assert.ok(CUES[id], 'family missing from cues.js: ' + id);
assert.ok(CUE_IDS.length >= 113, 'at least 113 families');
const BUSES = new Set(['sfx', 'ui', 'announcer', 'ambience', 'music']);
for (const id of CUE_IDS) {
  const c = CUES[id];
  assert.ok(BUSES.has(c.bus), id + ' bus');
  assert.ok(c.vol > 0 && c.vol <= 1.2, id + ' vol');
  assert.ok(Array.isArray(c.pitch) && c.pitch.length === 2 && c.pitch[0] > 0.3 && c.pitch[1] >= c.pitch[0] && c.pitch[1] < 3, id + ' pitch');
  assert.ok(c.cooldownMs >= 0 && c.maxVoices >= 1 && c.priority >= 0 && c.priority <= 100, id + ' limits');
  if (c.spatial) assert.ok(c.ref > 0 && c.maxDist > c.ref, id + ' spatial ref/maxDist');
  assert.ok(Array.isArray(c.pick), id + ' pick');
  if (c.layers) for (const l of c.layers) assert.ok(l.pick || (l.cue && CUES[l.cue]), id + ' layer refs a family');
  if (c.duck) assert.ok(c.duck.db < 0 && c.duck.ms > 0, id + ' duck');
}
// the spec's table: hits max 10 voices, cooldown 20 ms; deaths max 6 voices
for (const id of ['hit_blade', 'hit_pierce', 'hit_blunt', 'hit_flesh_light', 'hit_flesh_heavy', 'hit_armor']) { assert.equal(CUES[id].maxVoices, 10); assert.equal(CUES[id].cooldownMs, 20); }
for (const id of ['death_male', 'death_scream', 'death_oof']) assert.equal(CUES[id].maxVoices, 6);
for (const id of ['horn_war', 'jingle_victory']) assert.ok(CUES[id].priority >= 90, id + ' priority');
assert.equal(CUES.horn_war.duck.bus, 'music'); assert.equal(CUES.horn_war.duck.db, -6);
assert.ok(AMBIENCE_IDS.includes('amb_wind') && AMBIENCE_IDS.includes('crowd_loop'));
for (const [k, v] of Object.entries(UI_CUES)) assert.ok(CUES[v], 'UI helper ' + k + ' -> ' + v);

// ---- every family has a synth recipe (so nothing is ever silent) ...
for (const id of CUE_IDS) assert.ok(RECIPES[id], 'no synth recipe for ' + id);
assert.equal(SYNTH_FAMILIES.length, CUE_IDS.length);

// ---- ... and resolves against the REAL ledger to real assets or is flagged synth-only
const manifest = realManifest();
assert.ok(manifest, 'assets/manifest.json must exist (asset ledger)');
const cat = new Catalog(manifest);
assert.ok(cat.sfx.length >= 150, 'ledger has sfx rows: ' + cat.sfx.length);
const bank = new SfxBank({ catalog: cat, decode: async () => null, makeBuffer: () => null });
let real = 0; const synthOnly = [], realMap = {};
for (const id of CUE_IDS) {
  const r = bank.resolve(id);
  assert.ok(r, 'resolve ' + id);
  assert.ok(r.real.length > 0 || r.synth, 'AU3: ' + id + ' resolves to neither a real asset nor a synth');
  if (r.real.length) { real++; realMap[id] = r.real; } else synthOnly.push(id);
}
console.log(`AU3 cue resolution: ${CUE_IDS.length} families, ${real} with real assets, ${synthOnly.length} synth-only: ${synthOnly.join(' ')}`);
// every selector's ids really exist in the ledger (no stale names): the union of real ids must be a subset of ledger ids
const ids = new Set(cat.sfx.map((e) => e.id));
for (const [f, list] of Object.entries(realMap)) for (const i of list) assert.ok(ids.has(i), f + ' -> unknown asset ' + i);
// the majority of families must have >= 3 variants where the asset set allows
let multi = 0; for (const f of Object.keys(realMap)) if (realMap[f].length >= 3) multi++;
assert.ok(multi >= 45, 'families with >= 3 real variants: ' + multi);
// families that the spec says are real (hits, deaths, horns, UI, jingles) must not silently fall back to synth
const MUST_BE_REAL = ['hit_blade', 'hit_flesh_light', 'hit_flesh_heavy', 'hit_armor', 'block_shield', 'bow_shoot', 'arrow_hit_flesh', 'death_male', 'death_scream', 'death_oof', 'horn_war', 'drum_boom', 'gong', 'ui_click', 'ui_hover', 'ui_confirm', 'ui_back', 'ui_error', 'jingle_victory', 'jingle_defeat', 'jingle_start', 'chicken_cluck', 'goat_bleat', 'horse_neigh', 'elephant_trumpet', 'thunder_crack', 'catapult_launch', 'boulder_impact', 'amb_wind', 'crowd_cheer_small'];
function coverageFailures(man) {
  const b = new SfxBank({ catalog: new Catalog(man), decode: async () => null, makeBuffer: () => null });
  return MUST_BE_REAL.filter((f) => b.resolve(f).real.length === 0);
}
assert.deepEqual(coverageFailures(manifest), [], 'every must-be-real family has assets');

// ---- negative control (Q7 "drop a cue file"): without the hit assets AU3 flags hit_blade; the family still sounds through synth
const strip = (re) => { const m = JSON.parse(JSON.stringify(manifest)); m.sfx = m.sfx.filter((e) => !re.test(e.id)); return m; };
const stripped = strip(/^(sword_hit|knife_slice)/);
assert.ok(coverageFailures(stripped).includes('hit_blade'), 'negative control: dropping the hit files must be detected');
const mk = (d, sr) => ({ length: d.length, numberOfChannels: 1, sampleRate: sr, duration: d.length / sr, getChannelData: () => d });
const b2 = new SfxBank({ catalog: new Catalog(stripped), decode: async () => null, makeBuffer: mk });
const pk = b2.pick('hit_blade'); assert.ok(pk && pk.src === 'synth', 'dropped asset family still sounds (flagged synth)');
const none = new SfxBank({ catalog: new Catalog({ sfx: [], music: [] }), decode: async () => null, makeBuffer: mk });
for (const id of CUE_IDS) { const p = none.pick(id); assert.ok(p && p.src === 'synth' && p.buf.length > 100, 'synth fallback for ' + id); }
assert.equal(none.stats().synth, CUE_IDS.length, 'all families flagged synth');
// a real asset that is still loading is never replaced by synth (non-UI cues drop until it is ready)
const pend = new SfxBank({ catalog: cat, decode: async () => null, makeBuffer: mk }); assert.equal(pend.pick('hit_blade'), null); assert.equal(pend.stats().synth, 0);

// ---- fixture manifest sanity (used by the engine tests)
assert.ok(fixtureManifest().sfx.length > 20);
console.log('cues.test OK');
