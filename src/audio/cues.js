// Cue families (113) and the sim-event -> cue router. Everything here is pure data / pure logic (no AudioContext): the
// engine supplies play/duck/now/listener callbacks, so Node tests drive it with fakes.
//
// `pick` is a union of selectors, or an array of GROUPS (arrays) tried in order: the first group that matches any ledger row wins
// (preferred family-specific assets, then generic fallbacks). Family record: { id, pick:[selectors], layers?:[{pick?|cue?, vol, pitch:[lo,hi]|n, delay, prob}], vol, pitch:[lo,hi], cooldownMs,
//   maxVoices, priority, bus, spatial, ref, maxDist, duck?:{bus,db,ms}, dur?, send?, loop?, group }
import { clamp, db2lin } from './util.js';

// ---------------------------------------------------------------- templates
const T = {
  hit:    { bus: 'sfx', spatial: true, ref: 12, maxDist: 90, pitch: [0.92, 1.08], cooldownMs: 20, maxVoices: 10, priority: 50, vol: 0.8, dur: 0.9 },
  swing:  { bus: 'sfx', spatial: true, ref: 9, maxDist: 60, pitch: [0.9, 1.12], cooldownMs: 45, maxVoices: 6, priority: 35, vol: 0.45, dur: 0.6 },
  shoot:  { bus: 'sfx', spatial: true, ref: 14, maxDist: 100, pitch: [0.93, 1.07], cooldownMs: 35, maxVoices: 8, priority: 40, vol: 0.55, dur: 0.9 },
  voice:  { bus: 'sfx', spatial: true, ref: 16, maxDist: 100, pitch: [0.9, 1.1], cooldownMs: 60, maxVoices: 6, priority: 55, vol: 0.85, dur: 1.6 },
  beast:  { bus: 'sfx', spatial: true, ref: 22, maxDist: 120, pitch: [0.93, 1.07], cooldownMs: 250, maxVoices: 3, priority: 62, vol: 0.9 },
  crowd:  { bus: 'sfx', spatial: false, pitch: [0.97, 1.03], cooldownMs: 1500, maxVoices: 2, priority: 38, vol: 0.5, send: 0.1 },
  horn:   { bus: 'sfx', spatial: false, pitch: [0.98, 1.02], cooldownMs: 1500, maxVoices: 2, priority: 90, vol: 0.7, send: 0.25, duck: { bus: 'music', db: -6, ms: 400 } },
  drum:   { bus: 'sfx', spatial: false, pitch: [0.96, 1.04], cooldownMs: 300, maxVoices: 3, priority: 70, vol: 0.8, send: 0.15 },
  siege:  { bus: 'sfx', spatial: true, ref: 28, maxDist: 150, pitch: [0.94, 1.06], cooldownMs: 120, maxVoices: 4, priority: 70, vol: 0.85, send: 0.12 },
  destr:  { bus: 'sfx', spatial: true, ref: 24, maxDist: 130, pitch: [0.92, 1.08], cooldownMs: 120, maxVoices: 4, priority: 60, vol: 0.8, send: 0.1, dur: 2.2 },
  fx:     { bus: 'sfx', spatial: true, ref: 20, maxDist: 110, pitch: [0.95, 1.05], cooldownMs: 120, maxVoices: 4, priority: 65, vol: 0.7, dur: 2.2 },
  ui:     { bus: 'ui', spatial: false, pitch: [0.98, 1.02], cooldownMs: 30, maxVoices: 4, priority: 80, vol: 0.6 },
  announce: { bus: 'announcer', spatial: false, pitch: [1, 1], cooldownMs: 800, maxVoices: 1, priority: 98, vol: 0.9, duck: { bus: 'music', db: -6, ms: 700 } },
  jingle: { bus: 'sfx', spatial: false, pitch: [1, 1], cooldownMs: 3000, maxVoices: 1, priority: 100, vol: 0.8, send: 0.2 },
  foley:  { bus: 'sfx', spatial: true, ref: 10, maxDist: 55, pitch: [0.88, 1.12], cooldownMs: 40, maxVoices: 6, priority: 28, vol: 0.4, dur: 0.6 },
  amb:    { bus: 'ambience', spatial: false, pitch: [1, 1], cooldownMs: 0, maxVoices: 1, priority: 30, vol: 0.35, loop: true },
};
const FAMS = {};
function F(id, tmpl, pick, o = {}) {
  const t = T[tmpl];
  const f = Object.assign({ id, tmpl, pick, layers: null, ref: 15, maxDist: 100, duck: null, dur: 0, send: 0, loop: false }, t, o);
  f.pick = pick; f.group = tmpl;
  FAMS[id] = f;
}
const L = (pick, vol = 1, pitch = null, delay = 0, prob = 1) => ({ pick: Array.isArray(pick) ? pick : null, cue: typeof pick === 'string' ? pick : null, vol, pitch, delay, prob });

// ---- combat
F('hit_blade', 'hit', ['sword_hit', 'knife_slice']);
F('hit_pierce', 'hit', ['spear_stab', 'knife_slice']);
F('hit_blunt', 'hit', ['mace_bonk', 'club_bonk', 'shield_bash'], { vol: 0.85 });
F('hit_flesh_light', 'hit', ['flesh_hit_light', 'flesh_slap'], { vol: 0.75 });
F('hit_flesh_heavy', 'hit', ['flesh_hit_heavy'], { vol: 0.85, pitch: [0.85, 1.0] });
F('hit_armor', 'hit', ['helmet_ping', 'blade_clash', 'shield_bash'], { vol: 0.65 });
F('block_shield', 'hit', ['shield_block', 'shield_bash', 'wood_thud'], { vol: 0.85, priority: 52 });
F('block_parry', 'hit', ['blade_parry', 'blade_clash'], { vol: 0.6, priority: 52, send: 0.06 });
F('crit', 'hit', ['helmet_ping', 'blade_parry'], { vol: 0.55, cooldownMs: 160, maxVoices: 3, priority: 68, pitch: [1.0, 1.2], layers: [L(['helmet_ping', 'blade_parry'], 1, [1.0, 1.2]), L('hit_flesh_heavy', 0.7, [0.9, 1.0])] });
F('swing_light', 'swing', ['sword_slash', 'blade_swish']);
F('swing_heavy', 'swing', ['axe_swing', 'whoosh_camera', 'blade_swish'], { pitch: [0.7, 0.9], vol: 0.5 });
F('bow_shoot', 'shoot', ['bow_shot', 'crossbow_shot'], { vol: 0.5 });
F('arrow_whoosh', 'shoot', ['arrow_whoosh'], { vol: 0.35, cooldownMs: 90, maxVoices: 4, priority: 32, ref: 10, maxDist: 60 });
F('arrow_hit_flesh', 'hit', ['arrow_hit_flesh'], { vol: 0.7, cooldownMs: 25 });
F('arrow_hit_wood', 'hit', ['arrow_hit_wood'], { vol: 0.6, cooldownMs: 30, maxVoices: 6 });
F('arrow_hit_shield', 'hit', ['wood_thud', 'arrow_hit_wood'], { vol: 0.7, cooldownMs: 30, maxVoices: 6, priority: 52 });
F('javelin_throw', 'shoot', ['javelin_throw'], { vol: 0.55 });
F('spear_thrust', 'swing', ['spear_swing'], { vol: 0.45 });
F('axe_chop', 'hit', ['axe_chop'], { vol: 0.7, cooldownMs: 40, maxVoices: 4 });
F('kick_whoomp', 'fx', ['shield_bash'], { vol: 0.9, ref: 14, cooldownMs: 200, maxVoices: 3, priority: 75, pitch: [0.9, 1.0], layers: [L(['shield_bash'], 1, [0.7, 0.8]), L(['whoosh_camera', 'blade_swish'], 0.7, [0.65, 0.85], 0.02)] });
F('net_throw', 'swing', ['cloth_flap', 'whoosh_camera'], { vol: 0.6, priority: 50, cooldownMs: 120 });
// ---- death / voice
F('death_male', 'voice', ['death_grunt', 'death_dying', 'death_hurt'], { vol: 0.8 });
F('death_scream', 'voice', ['death_scream'], { vol: 0.8, priority: 58 });
F('death_oof', 'voice', ['death_oof', 'death_comic'], { vol: 0.85, pitch: [0.92, 1.12] });
F('death_big', 'voice', [['death_big'], ['monster_roar', 'death_dying']], { vol: 0.95, ref: 24, maxDist: 130, priority: 70, cooldownMs: 120, maxVoices: 3, send: 0.1, pitch: [0.85, 1.0], layers: [L([['death_big'], ['monster_roar', 'death_dying']], 1), L(['wood_thud', 'boulder_impact'], 0.6, [0.6, 0.8], 0.4)] });
F('death_animal', 'voice', [['death_animal'], ['dog_bark', 'sheep_baa', 'donkey_bray']], { vol: 0.8, pitch: [0.95, 1.15] });
F('battle_cry', 'voice', ['battle_cry', 'war_cry'], { vol: 0.6, cooldownMs: 120, maxVoices: 4, priority: 45 });
F('taunt', 'voice', ['war_cry', 'grunt_effort'], { vol: 0.55, cooldownMs: 400, maxVoices: 3, priority: 42, pitch: [0.95, 1.2] });
F('cheer_small', 'voice', ['war_cry'], { vol: 0.5, cooldownMs: 300, maxVoices: 3, priority: 40, pitch: [1.15, 1.4] });
F('philosopher_mumble', 'voice', [], { vol: 0.7, cooldownMs: 600, maxVoices: 2, priority: 50 });
F('senator_blah', 'voice', [], { vol: 0.7, cooldownMs: 600, maxVoices: 2, priority: 50 });
F('chicken_cluck', 'beast', ['chicken_cluck'], { vol: 0.8, ref: 14, cooldownMs: 90, maxVoices: 5, priority: 48, pitch: [0.9, 1.25] });
F('chicken_rage', 'beast', [['chicken_rage'], ['chicken_cluck']], { vol: 0.95, ref: 18, cooldownMs: 600, maxVoices: 2, priority: 66, pitch: [0.97, 1.05], layers: [L(['chicken_rage'], 1), L(['chicken_cluck'], 0.7, [1.35, 1.55], 0.05), L(['chicken_cluck'], 0.5, [1.6, 1.9], 0.12)] });
F('goat_bleat', 'beast', ['goat_bleat', 'sheep_baa'], { vol: 0.85, ref: 16, cooldownMs: 300 });
F('hound_bark', 'beast', ['dog_bark'], { vol: 0.8, ref: 16, cooldownMs: 120, maxVoices: 4, priority: 48 });
F('horse_neigh', 'beast', ['horse_neigh'], { vol: 0.8 });
F('horse_gallop', 'beast', ['horse_gallop', 'hoof_step'], { vol: 0.6, ref: 20, cooldownMs: 120, maxVoices: 4, priority: 40 });
F('camel_groan', 'beast', ['camel_groan', 'donkey_bray'], { vol: 0.85 });
F('elephant_trumpet', 'beast', ['elephant_trumpet'], { vol: 1.0, ref: 30, maxDist: 150, priority: 75, cooldownMs: 600, maxVoices: 2, send: 0.18 });
F('elephant_step', 'beast', [['elephant_step'], ['wood_thud', 'hoof_step']], { vol: 0.8, ref: 24, cooldownMs: 160, maxVoices: 3, priority: 52, pitch: [0.85, 1.05] });
F('minotaur_roar', 'beast', ['minotaur_grunt', 'monster_roar', 'bear_roar'], { vol: 1.0, ref: 28, maxDist: 150, priority: 75, cooldownMs: 800, maxVoices: 2, send: 0.15, pitch: [0.8, 0.95] });
F('cyclops_roar', 'beast', ['monster_roar', 'orc_roar'], { vol: 1.0, ref: 32, maxDist: 160, priority: 78, cooldownMs: 1000, maxVoices: 2, send: 0.2, pitch: [0.55, 0.7] });
F('medusa_hiss', 'beast', ['snake_hiss'], { vol: 0.85, ref: 18, priority: 60 });
// ---- crowd
F('crowd_cheer_small', 'crowd', ['crowd_cheer', 'applause'], { vol: 0.55 });
F('crowd_cheer_big', 'crowd', ['crowd_roar', 'crowd_cheer'], { vol: 0.75, priority: 55, cooldownMs: 4000 });
F('crowd_gasp', 'crowd', ['crowd_gasp', 'crowd_ooh'], { vol: 0.65, cooldownMs: 3000 });
F('crowd_boo', 'crowd', [], { vol: 0.6, cooldownMs: 4000 });
F('crowd_loop', 'amb', ['ambience_crowd_loop', 'crowd_chant'], { vol: 0.38 });
// ---- instruments
F('horn_war', 'horn', ['war_horn']);
F('horn_charge', 'horn', ['war_horn'], { pitch: [1.1, 1.16], layers: [L(['war_horn'], 1, [1.1, 1.16]), L('drum_boom', 0.6, null, 0.05)] });
F('horn_victory', 'horn', ['jingle_fanfare', 'war_horn'], { priority: 92, cooldownMs: 4000 });
F('drum_boom', 'drum', ['drum_boom']);
F('drum_roll', 'drum', ['drum_roll'], { vol: 0.6, cooldownMs: 3000, maxVoices: 1 });
F('gong', 'drum', ['gong'], { vol: 0.8, cooldownMs: 800, send: 0.3, dur: 4 });
// ---- siege / destruction
F('catapult_creak', 'siege', ['catapult_creak'], { vol: 0.6, priority: 45, cooldownMs: 200 });
F('catapult_launch', 'siege', ['catapult_launch'], { vol: 0.95 });
F('ballista_twang', 'siege', ['ballista_twang', 'bow_shot'], { vol: 0.85 });
F('boulder_whoosh', 'siege', ['boulder_whoosh', 'whoosh_camera'], { vol: 0.6, priority: 50 });
F('boulder_impact', 'destr', ['boulder_impact'], { vol: 1.0, priority: 72, cooldownMs: 80, layers: [L(['boulder_impact'], 1), L(['explosion_rumble', 'debris_big'], 0.5, null, 0.03)] });
F('wall_crumble', 'destr', [['wall_crumble'], ['wall_collapse', 'rock_crumble']], { vol: 0.9, priority: 66, send: 0.15 });
F('wood_crack', 'destr', ['wood_crack', 'wood_splinter'], { vol: 0.85, dur: 1.2 });
F('rubble', 'destr', [['rubble'], ['rock_crumble', 'rock_fall', 'debris_big']], { vol: 0.65, priority: 50 });
F('voxel_break', 'destr', ['voxel_break'], { vol: 0.7, priority: 48, cooldownMs: 60, maxVoices: 5, dur: 0.9 });
// ---- fx
F('fire_ignite', 'fx', ['fire_ignite', 'fire_whoosh'], { vol: 0.75, send: 0.1 });
F('fire_loop', 'amb', ['torch_crackle', 'ambience_fire_loop'], { vol: 0.35, spatial: true, ref: 12, maxDist: 60 });
F('thunder_crack', 'fx', ['thunder_crack'], { vol: 1.0, spatial: false, priority: 88, cooldownMs: 300, maxVoices: 2, send: 0.35, duck: { bus: 'music', db: -5, ms: 500 }, dur: 3.5 });
F('lightning_zap', 'fx', ['lightning_zap'], { vol: 0.7, cooldownMs: 110, maxVoices: 4, priority: 72 });
F('heal_chime', 'fx', ['heal_chime'], { vol: 0.5, cooldownMs: 250, maxVoices: 3, priority: 60, send: 0.15 });
F('buff_power', 'fx', ['buff_powerup'], { vol: 0.55, cooldownMs: 250, maxVoices: 3, priority: 60 });
F('curse_whoosh', 'fx', ['curse_dark'], { vol: 0.6, priority: 60 });
F('coin_clink', 'fx', ['coin_clink', 'coin_pickup'], { vol: 0.55, ref: 14, cooldownMs: 100, maxVoices: 4, priority: 45 });
F('stone_freeze', 'fx', [['stone_freeze'], ['magic_cast']], { vol: 0.8, priority: 62, pitch: [0.95, 1.05], layers: [L([['stone_freeze'], ['magic_cast']], 1), L(['rock_crumble'], 0.5, null, 0.15)] });
F('wine_pour', 'fx', [], { vol: 0.7, spatial: false, priority: 55 });
F('confetti_pop', 'fx', ['confetti_pop'], { vol: 0.7, priority: 45, cooldownMs: 150 });
F('voxel_pop', 'fx', ['pop_place'], { vol: 0.55, priority: 30, cooldownMs: 50, maxVoices: 4 });
F('debris_clatter', 'destr', ['debris_big', 'rock_fall'], { vol: 0.5, priority: 35, cooldownMs: 90, maxVoices: 3, pitch: [1.1, 1.4], dur: 0.9 });
F('revive_chime', 'fx', [['revive_chime'], ['heal_chime', 'buff_powerup']], { vol: 0.65, priority: 66, send: 0.2, pitch: [0.97, 1.05] });
// ---- ui
F('ui_hover', 'ui', ['ui_hover'], { vol: 0.45, cooldownMs: 60, maxVoices: 2, priority: 70 });
F('ui_click', 'ui', ['ui_click']);
F('ui_confirm', 'ui', ['ui_confirm'], { vol: 0.65 });
F('ui_back', 'ui', ['ui_back'], { vol: 0.6 });
F('ui_error', 'ui', ['ui_error'], { vol: 0.6, cooldownMs: 150 });
F('ui_toggle', 'ui', ['ui_toggle_on', 'ui_toggle_off']);
F('ui_tick', 'ui', ['ui_slider_tick', 'ui_select'], { vol: 0.4, cooldownMs: 40 });
F('ui_panel_open', 'ui', ['ui_panel_open', 'ui_maximize'], { vol: 0.55 });
F('ui_panel_close', 'ui', ['ui_panel_close', 'ui_minimize'], { vol: 0.55 });
F('ui_achievement', 'ui', ['ui_achievement', 'jingle_achievement'], { vol: 0.75, cooldownMs: 600, send: 0.15 });
F('ui_countdown_beep', 'ui', ['countdown_beep'], { vol: 0.7, cooldownMs: 100, pitch: [1, 1] });
F('ui_go', 'ui', ['countdown_go'], { vol: 0.8, cooldownMs: 300, pitch: [1, 1] });
F('ui_place', 'ui', [['ui_place'], ['pop_place', 'ui_drop']], { vol: 0.6, cooldownMs: 35, maxVoices: 5, pitch: [0.97, 1.03] });
F('ui_erase', 'ui', [['ui_erase'], ['ui_drop', 'cloth_flap']], { vol: 0.55, cooldownMs: 50, pitch: [0.95, 1.05] });
// ---- jingles / stingers
F('jingle_victory', 'jingle', ['jingle_victory'], { vol: 0.85 });
F('jingle_defeat', 'jingle', ['jingle_defeat'], { vol: 0.8 });
F('jingle_start', 'jingle', ['jingle_battle_start'], { vol: 0.75 });
F('stinger_hero_down', 'jingle', [['stinger_hero_down'], ['bell_heavy', 'gong']], { vol: 0.8, cooldownMs: 1000, maxVoices: 2, priority: 95, duck: { bus: 'music', db: -5, ms: 600 }, layers: [L([['stinger_hero_down'], ['bell_heavy', 'gong']], 1), L('drum_boom', 0.7, null, 0.02)] });
F('stinger_epic', 'jingle', [['stinger_epic'], ['jingle_fanfare', 'jingle_battle_start']], { vol: 0.7, cooldownMs: 1000, maxVoices: 2, priority: 94, duck: { bus: 'music', db: -6, ms: 500 } });
F('stinger_funny', 'jingle', [['stinger_funny'], ['death_comic']], { vol: 0.85, cooldownMs: 1000, maxVoices: 2, priority: 92, duck: { bus: 'music', db: -5, ms: 500 } });
// ---- announcer voice clips (opt-in via settings 'announcerVoice'; they use the Announcer bus + its slider)
F('announce_ready', 'announce', ['announcer_ready']);
F('announce_go', 'announce', ['countdown_voice_go', 'announcer_fight']);
F('announce_winner', 'announce', ['announcer_winner', 'announcer_flawless']);
// ---- foley
F('step_dirt', 'foley', ['footstep_dirt_1', 'footstep_dirt']);
F('step_grass', 'foley', ['footstep_grass']);
F('step_stone', 'foley', ['footstep_gravel_2', 'footstep_gravel_3', 'footstep_gravel']);
F('step_sand', 'foley', [['footstep_sand'], ['footstep_dirt_2', 'footstep_dirt_3']]);
F('step_snow', 'foley', ['footstep_snow']);
F('step_mud', 'foley', [['footstep_mud'], ['footstep_dirt_1']], { pitch: [0.85, 1.0] });
F('step_wood', 'foley', [['footstep_wood'], ['wood_thud_3', 'wood_thud_4']], { vol: 0.35, pitch: [0.9, 1.15] });
F('step_water', 'foley', ['footstep_water']);
F('armor_rustle', 'foley', ['armor_rustle', 'armor_step'], { vol: 0.45, cooldownMs: 90, maxVoices: 4 });
// ---- ambience (looped beds on the ambience bus)
F('amb_wind', 'amb', ['ambience_wind_loop'], { vol: 0.35 });
F('amb_birds', 'amb', [], { vol: 0.3 });
F('amb_desert', 'amb', [], { vol: 0.3 });
F('amb_forest', 'amb', [], { vol: 0.3 });
F('amb_water', 'amb', [], { vol: 0.3 });
F('amb_fire', 'amb', ['ambience_fire_loop'], { vol: 0.3 });
F('amb_crowd', 'amb', ['ambience_crowd_loop'], { vol: 0.4 });

export const CUES = FAMS;
export const CUE_IDS = Object.keys(FAMS);
export const CUE_COUNT = CUE_IDS.length;
export const AMBIENCE_IDS = CUE_IDS.filter((i) => FAMS[i].loop);
export const cueDef = (id) => FAMS[id] || null;
export { L as layer };

/** UI helper names -> families (audio.ui('click')). */
export const UI_CUES = {
  hover: 'ui_hover', click: 'ui_click', confirm: 'ui_confirm', back: 'ui_back', error: 'ui_error', toggle: 'ui_toggle', tick: 'ui_tick',
  panel_open: 'ui_panel_open', panel_close: 'ui_panel_close', open: 'ui_panel_open', close: 'ui_panel_close', achievement: 'ui_achievement',
  countdown_beep: 'ui_countdown_beep', beep: 'ui_countdown_beep', go: 'ui_go', place: 'ui_place', erase: 'ui_erase',
};

// ---------------------------------------------------------------- unit / arena profiles
const SPECIES_BY_ID = { sacred_chicken: 'chicken', battle_goat: 'goat', warhound: 'hound', war_elephant: 'elephant', minotaur: 'minotaur', cyclops: 'cyclops', medusa: 'medusa', trojan_horse: 'trojan', catapult: 'siege', ballista: 'siege', camel_rider: 'camel', centaur_archer: 'centaur' };
const profCache = new Map();
/** Audio-relevant facts about a UnitDef (or a bare id when defs are unavailable). Cached per def object/id. */
export function unitProfile(def, id) {
  const key = def || id || '';
  const hit = profCache.get(key); if (hit) return hit;
  const did = (def && def.id) || id || '';
  const tags = (def && def.tags) || [], role = (def && def.role) || '';
  const mass = def && def.mass !== undefined ? def.mass : 1, scale = def && def.scale !== undefined ? def.scale : 1;
  let species = SPECIES_BY_ID[did] || '';
  if (!species) species = /chicken/.test(did) ? 'chicken' : /goat/.test(did) ? 'goat' : /hound|dog|wolf/.test(did) ? 'hound' : /elephant/.test(did) ? 'elephant' : '';
  const p = {
    id: did, species, role, mass, scale, tags,
    big: mass >= 6 || scale >= 1.6 || role === 'monster',
    hero: role === 'hero' || tags.includes('general'),
    mounted: role === 'cavalry' || tags.includes('cavalry') || species === 'centaur' || species === 'camel',
    animal: role === 'beast' || role === 'swarm' || tags.includes('animal') || species === 'chicken' || species === 'goat' || species === 'hound',
    armor: (def && def.armor) || 0,
    armored: !!def && (def.armor || 0) >= 0.3,
    shield: !!(def && def.shield),
    siege: role === 'siege',
    melee: (def && def.melee) || null,
    sfx: (def && def.sfx) || null,
  };
  profCache.set(key, p);
  return p;
}
export function clearProfileCache() { profCache.clear(); }

const THEME_AMB = { greek: ['amb_birds'], roman: ['amb_birds'], egypt: ['amb_desert'], persian: ['amb_desert'], carthage: ['amb_desert'], barbarian: ['amb_forest'], mythic: ['amb_birds'], alpine: ['amb_forest'], styx: ['amb_fire'], olympus: ['amb_birds'] };
/** Everything the audio system needs to know about an arena (defensive: accepts a bare env object too). */
export function arenaInfo(arena) {
  const env = (arena && arena.env) || {};
  const theme = String(env.theme || 'greek').toLowerCase(), biome = String(arena && arena.biome || 'grass').toLowerCase();
  const weather = String(env.weather || 'clear').toLowerCase(), hour = Number.isFinite(env.time) ? env.time : 12;
  const name = String(arena && arena.name || '').toLowerCase();
  let crowdProps = 0, trees = 0, fires = 0;
  const props = (arena && arena.props) || [];
  for (let i = 0; i < props.length; i++) { const t = props[i].t; if (t === 'crowd') crowdProps++; else if (t === 'tree_oak' || t === 'tree_pine' || t === 'tree_cypress' || t === 'tree_olive') trees++; else if (t === 'torch' || t === 'fire_pit' || t === 'campfire') fires++; }
  const colosseum = /colosseum|arena of|coliseum/.test(name) || crowdProps >= 6;
  const amb = [];
  amb.push('amb_wind');
  const day = hour >= 6 && hour <= 19;
  if (arena && arena.lava) amb.push('amb_fire');
  else if (arena && arena.water > 0) amb.push('amb_water');
  if (colosseum) amb.push('crowd_loop'); else if (crowdProps > 0) amb.push('amb_crowd');
  if (fires >= 3 && !(arena && arena.lava)) amb.push('fire_loop');
  if (biome === 'sand' || THEME_AMB[theme]?.[0] === 'amb_desert') amb.push('amb_desert');
  else if (trees >= 14 || theme === 'barbarian' || theme === 'alpine') amb.push('amb_forest');
  else if (day && biome !== 'snow' && weather !== 'storm' && weather !== 'rain' && weather !== 'sandstorm') amb.push('amb_birds');
  const windy = clamp(Number.isFinite(env.wind) ? env.wind : 0.3, 0, 1);
  return { theme, biome, weather, hour, colosseum, ambience: [...new Set(amb)], wind: windy, storm: weather === 'storm', rain: weather === 'rain' || weather === 'storm', water: !!(arena && arena.water > 0), lava: !!(arena && arena.lava), name };
}
const STEP_BY_BIOME = { grass: 'step_grass', stone: 'step_stone', marble: 'step_stone', sand: 'step_sand', snow: 'step_snow', ash: 'step_dirt', dirt: 'step_dirt', mud: 'step_mud' };

// ---------------------------------------------------------------- event router
const ABILITY_CUES = {
  kick: 'kick_whoomp', net: 'net_throw', heal_pulse: 'heal_chime', heal: 'heal_chime', aura: 'buff_power', rage: 'buff_power', war_horn: 'horn_war',
  dash: 'kick_whoomp', bull_charge: 'minotaur_roar', summon_on_death: 'wood_crack', tantrum: 'chicken_rage', cluck: 'chicken_cluck', throne: 'stinger_funny',
  chain_lightning: 'lightning_zap', revive: 'revive_chime', bribe: 'coin_clink', dot_cloud: 'curse_whoosh', pack_bonus: 'hound_bark', crowd_favorite: 'crowd_cheer_small',
  execute: 'crit', confuse: 'philosopher_mumble', sleep: 'senator_blah', panic_cav: 'camel_groan', stone: 'stone_freeze', trumpet: 'elephant_trumpet',
  curse: 'curse_whoosh', poison: 'curse_whoosh', brace: 'block_shield',
};
const CC_BY_SPECIES = { philosopher: 'philosopher_mumble', senator: 'senator_blah', camel_rider: 'camel_groan', medusa: 'medusa_hiss' };
const PROP_WALL = /wall|ruin|tower|arch|column|temple|pyramid|obelisk|statue|sphinx|throne|gate_stone/;
const PROP_WOOD = /tree|crate|barrel|tent|ship|log|fire_pit|goat_pen|gate_door|banner|torch|cactus|bush|wheat|reeds|palm|campfire/;
const CAUSE_SCREAM = { fire: 1, fall: 1, lava: 1, geyser: 1, aoe: 1, misfire: 1, magic: 0.4, lightning: 1 };

/**
 * createRouter(deps): deps = { play(cue,x,y,z,opts)->any, duck(bus,db,ms), now()->s, rng()->[0,1), listener()->{x,y,z,yaw},
 *   defs?:{id:UnitDef}, world?:{units,dying,state}, arena?:ArenaInfo, playerTeam?, hooks?:{battleStart,battleEnd,note} }
 * Returns { handle(type,payload), tick(dt), setArena(info), stats }.
 */
export function createRouter(deps) {
  const { play, duck } = deps;
  const rng = deps.rng || Math.random, now = deps.now;
  let defs = deps.defs || null, world = deps.world || null, arena = deps.arena || arenaInfo(null), hooks = deps.hooks || {};
  const stats = { events: 0, culled: 0, stingers: 0, crowd: 0 };
  let lastStinger = -1e9, lastCrowd = -1e9, lastBark = -1e9, lastTaunt = -1e9, lastRally = -1e9, lastStatus = -1e9, lastCharge = -1e9;
  const killT = new Float64Array(24); let killN = 0, killHero = false;
  let footAcc = 0, rustleAcc = 0, heavyAcc = 0;
  const cache = new Map(); let cacheT = -1;
  const P = (id) => unitProfile(defs ? defs[id] : null, id);
  const D = (def, kind) => { const s = P(def).sfx; if (!s) return null; const v = s[kind]; return Array.isArray(v) ? v[(rng() * v.length) | 0] : v || null; };
  const R = (a, b) => a + (b - a) * rng();

  // last known position per unit id, fed by the events that carry one (fallback when no `world` was provided)
  const tracked = new Map();
  function track(id, def, x, y, z) {
    let r = tracked.get(id);
    if (r === undefined) { r = { x, y, z, def: { id: def } }; tracked.set(id, r); return; }
    r.x = x; r.y = y; r.z = z; if (def) r.def.id = def;
  }
  // unit lookup by id for events that carry no position (world scan is O(n) but only used by low-rate events)
  function unitAt(id) {
    if (!world || !world.units) return tracked.get(id) || null;
    const t = now();
    if (t - cacheT > 0.4) { cache.clear(); cacheT = t; }
    let u = cache.get(id); if (u !== undefined) return u;
    u = null;
    const us = world.units; for (let i = 0; i < us.length; i++) if (us[i].id === id) { u = us[i]; break; }
    if (!u && world.dying) { const ds = world.dying; for (let i = 0; i < ds.length; i++) if (ds[i].id === id) { u = ds[i]; break; } }
    if (!u) u = tracked.get(id) || null;
    cache.set(id, u); return u;
  }
  function cull(x, z, max) { const l = deps.listener(), dx = x - l.x, dz = z - l.z; return dx * dx + dz * dz > max * max; }
  function stingerOk(t, gap = 15) { if (t - lastStinger < gap) return false; lastStinger = t; stats.stingers++; return true; }
  function crowdOn() { return arena.colosseum; }
  function crowdReact(t, big) {
    if (!crowdOn() || t - lastCrowd < 3) return;
    lastCrowd = t; stats.crowd++;
    play(big ? 'crowd_cheer_big' : 'crowd_cheer_small', undefined, undefined, undefined, { vol: big ? 1 : 0.9 });
  }

  const H = Object.create(null);
  H.unit_hit = (p) => {
    track(p.dst, p.dstDef, p.x, p.y, p.z);
    if (cull(p.x, p.z, 90)) { stats.culled++; return; }
    const dst = P(p.dstDef), src = P(p.srcDef);
    const hero = dst.hero || src.hero, prio = hero ? 85 : p.crit ? 70 : 50;
    if (p.proj) { if (dst.armor >= 0.3 && rng() < 0.6) play('hit_armor', p.x, p.y, p.z, { vol: 0.5, priority: prio }); return; }
    const heavy = p.dmg >= 22 || dst.big || p.charge > 0.5;
    const s = clamp(0.7 + p.dmg / 60, 0.7, 1.35);
    const over = D(p.srcDef, 'hit');
    let fam = over;
    if (!fam) fam = p.type === 'slash' ? 'hit_blade' : p.type === 'pierce' ? 'hit_pierce' : p.type === 'blunt' ? 'hit_blunt' : null;
    const pitch = dst.big ? 0.8 : heavy ? 0.92 : 1;
    if (fam) play(fam, p.x, p.y, p.z, { vol: s, priority: prio, pitch });
    // heavier armour clanks more often; the rest of the hits land as flesh thumps, so a shield wall is not one endless metallic ring
    if (dst.armor >= 0.1 && rng() < clamp(dst.armor * 1.1 + 0.15, 0, 0.9)) play('hit_armor', p.x, p.y, p.z, { vol: 0.75, priority: prio, pitch });
    else if (heavy || p.type === 'blunt') play('hit_flesh_heavy', p.x, p.y, p.z, { vol: s, priority: prio, pitch });
    else play('hit_flesh_light', p.x, p.y, p.z, { vol: s, priority: prio, pitch });
    if (dst.shield && rng() < 0.3) play('block_shield', p.x, p.y, p.z, { vol: 0.25, priority: prio - 10, pitch: 1.25 });
    if (p.crit) play('crit', p.x, p.y, p.z, { priority: prio });
    // swing texture (low, probabilistic: the sim has no swing event)
    if (rng() < 0.45) {
      const st = src.melee ? src.melee.style : '';
      const sw = D(p.srcDef, 'swing') || (st === 'thrust' || st === 'pike' ? 'spear_thrust' : st === 'overhead' ? (p.type === 'blunt' ? 'swing_heavy' : 'axe_chop') : st === 'bash' || st === 'ram' || st === 'gore' || st === 'bite' || st === 'peck' || st === 'headbutt' || st === 'stomp' ? null : src.big ? 'swing_heavy' : 'swing_light');
      if (sw) play(sw, p.x, p.y, p.z, { priority: prio - 12 });
    }
    if (p.charge > 0.6 && src.mounted && rng() < 0.4) play('horse_neigh', p.x, p.y, p.z, { vol: 0.6, priority: 58 });
  };
  H.unit_block = (p) => {
    if (cull(p.x, p.z, 90)) { stats.culled++; return; }
    if (p.kind === 'proj') play('arrow_hit_shield', p.x, p.y, p.z, {});
    else if (rng() < 0.7) play('block_shield', p.x, p.y, p.z, {});
    else play('block_parry', p.x, p.y, p.z, {});
  };
  H.projectile_launch = (p) => {
    if (cull(p.x, p.z, 105)) { stats.culled++; return; }
    switch (p.kind) {
      case 'boulder': play('catapult_launch', p.x, p.y, p.z, {}); play('boulder_whoosh', p.x, p.y, p.z, { delay: 0.12, vol: 0.7 }); break;
      case 'bolt': play('ballista_twang', p.x, p.y, p.z, {}); break;
      case 'javelin': case 'pilum': case 'francisca': play('javelin_throw', p.x, p.y, p.z, {}); break;
      case 'coin': play('coin_clink', p.x, p.y, p.z, {}); break;
      case 'sunbeam': case 'scepter': case 'thunderbolt': play('lightning_zap', p.x, p.y, p.z, { vol: 0.6 }); break;
      default: play('bow_shoot', p.x, p.y, p.z, {}); if (rng() < 0.4) play('arrow_whoosh', p.x, p.y, p.z, { delay: 0.07 });
    }
  };
  H.projectile_hit = (p) => {
    if (cull(p.x, p.z, 95)) { stats.culled++; return; }
    if (p.kind === 'boulder') { play('boulder_impact', p.x, p.y, p.z, {}); return; }
    if (p.blocked) play('arrow_hit_shield', p.x, p.y, p.z, {});
    else if (p.onUnit) play('arrow_hit_flesh', p.x, p.y, p.z, {});
    else if (p.kind === 'arrow' || p.kind === 'bolt' || p.kind === 'javelin' || p.kind === 'pilum') play('arrow_hit_wood', p.x, p.y, p.z, { vol: 0.5, pitch: 0.85 });
  };
  H.unit_kill = (p) => {
    const t = now();
    tracked.delete(p.dst);
    // kill-cluster tracking for crowd reactions (colosseum)
    if (crowdOn()) { killT[killN++ % 24] = t; }
    const dst = P(p.dstDef), src = P(p.srcDef);
    const hero = dst.hero || src.hero;
    if (hero) { duck('music', -3, 700); killHero = true; }
    if (crowdOn()) {
      let n = 0; for (let i = 0; i < Math.min(killN, 24); i++) if (t - killT[i] < 2.5) n++;
      if (hero && p.dstDef && dst.hero) { if (t - lastCrowd >= 3) { crowdReact(t, true); } }
      else if (n >= 4) crowdReact(t, n >= 8);
    }
    if (cull(p.x, p.z, 100)) { stats.culled++; return; }
    const prio = hero ? 90 : dst.big ? 70 : 55, x = p.x, y = p.y, z = p.z;
    const over = D(p.dstDef, 'death');
    if (over) { play(over, x, y, z, { priority: prio }); return; }
    if (dst.species === 'chicken') { play('chicken_cluck', x, y, z, { pitch: 1.2, priority: prio }); if (rng() < 0.3) play('death_oof', x, y, z, { pitch: 1.5, vol: 0.5, delay: 0.1 }); return; }
    if (dst.species === 'goat') { play('goat_bleat', x, y, z, { pitch: 1.1, priority: prio }); return; }
    if (dst.species === 'hound') { play('death_animal', x, y, z, { priority: prio }); return; }
    if (dst.species === 'elephant') { play('elephant_trumpet', x, y, z, { pitch: 0.8, priority: prio }); play('death_big', x, y, z, { priority: prio, delay: 0.2 }); return; }
    if (dst.species === 'minotaur') { play('minotaur_roar', x, y, z, { pitch: 0.8, priority: prio }); play('death_big', x, y, z, { priority: prio, delay: 0.25 }); return; }
    if (dst.species === 'cyclops') { play('cyclops_roar', x, y, z, { pitch: 0.9, priority: prio }); play('death_big', x, y, z, { priority: prio, delay: 0.3 }); return; }
    if (dst.species === 'medusa') { play('medusa_hiss', x, y, z, { priority: prio }); play('death_scream', x, y, z, { delay: 0.1, vol: 0.7, priority: prio }); return; }
    if (dst.species === 'trojan') { play('wood_crack', x, y, z, { priority: prio }); play('wall_crumble', x, y, z, { priority: prio, delay: 0.1 }); return; }
    if (dst.siege) { play('wood_crack', x, y, z, { priority: prio, vol: 0.9 }); play('death_male', x, y, z, { priority: prio - 5, delay: 0.1 }); return; }
    if (dst.big) { play('death_big', x, y, z, { priority: prio }); return; }
    if (dst.animal) { play('death_animal', x, y, z, { priority: prio }); return; }
    if (dst.mounted) { if (rng() < 0.45) play(dst.species === 'camel' ? 'camel_groan' : 'horse_neigh', x, y, z, { priority: prio, vol: 0.7, delay: 0.05 }); }
    const sc = CAUSE_SCREAM[p.cause];
    if (sc !== undefined && rng() < sc) play('death_scream', x, y, z, { priority: prio });
    else if (rng() < 0.15) play('death_oof', x, y, z, { priority: prio });
    else play('death_male', x, y, z, { priority: prio });
  };
  const voiced = () => !!(deps.announcerVoice && deps.announcerVoice());
  H.battle_countdown = (p) => {
    play('ui_countdown_beep', undefined, undefined, undefined, { pitch: 1 + (3 - clamp(p.n, 1, 3)) * 0.12 });
    if (p.n >= 3 && voiced()) play('announce_ready', undefined, undefined, undefined, { delay: 0.1 });
  };
  H.battle_start = () => {
    tracked.clear();
    play('jingle_start', undefined, undefined, undefined, {});
    play('horn_war', undefined, undefined, undefined, { delay: 0.35, vol: 0.85 });
    play('drum_boom', undefined, undefined, undefined, { delay: 0.5, vol: 0.9 });
    play('ui_go', undefined, undefined, undefined, { vol: 0.7 });
    if (voiced()) play('announce_go', undefined, undefined, undefined, { delay: 0.05 });
    for (let i = 0; i < 3; i++) play('battle_cry', undefined, undefined, undefined, { delay: R(0.5, 1.6), vol: R(0.35, 0.6), pitch: R(0.9, 1.15) });
    lastStinger = now();
    if (hooks.battleStart) hooks.battleStart();
  };
  H.battle_end = (p) => {
    const pt = deps.playerTeam;
    const lost = pt !== undefined && pt !== null && p.winner !== pt && p.winner !== -1;
    if (p.winner === -1) play('stinger_funny', undefined, undefined, undefined, {});
    else play(lost ? 'jingle_defeat' : 'jingle_victory', undefined, undefined, undefined, {});
    if (!lost && p.winner !== -1) play('horn_victory', undefined, undefined, undefined, { delay: 0.3, vol: 0.6 });
    if (p.winner !== -1 && voiced()) play('announce_winner', undefined, undefined, undefined, { delay: 1.2 });
    duck('music', -9, 2500);
    if (crowdOn()) play(p.winner === -1 ? 'crowd_boo' : 'crowd_cheer_big', undefined, undefined, undefined, { delay: 0.6 });
    if (hooks.battleEnd) hooks.battleEnd(p.winner, lost);
  };
  H.explosion = (p) => {
    if (cull(p.x, p.z, 130)) { stats.culled++; return; }
    if (p.kind === 'fire') play('fire_ignite', p.x, p.y, p.z, {});
    else if (p.kind === 'lightning') { play('thunder_crack', undefined, undefined, undefined, {}); play('lightning_zap', p.x, p.y, p.z, {}); }
    else if (p.kind === 'magic') play('curse_whoosh', p.x, p.y, p.z, { vol: 0.7 });
    else play('rubble', p.x, p.y, p.z, { vol: 0.7 });
  };
  H.crater = (p) => { if (!cull(p.x, p.z, 120)) play('voxel_break', p.x, deps.groundY ? deps.groundY(p.x, p.z) : 0, p.z, { vol: 0.8 }); };
  H.prop_destroyed = (p) => {
    if (cull(p.x, p.z, 130)) { stats.culled++; return; }
    const ty = String(p.type || '');
    if (PROP_WALL.test(ty)) { play('wall_crumble', p.x, p.y, p.z, {}); play('rubble', p.x, p.y, p.z, { delay: 0.25, vol: 0.6 }); }
    else if (PROP_WOOD.test(ty)) play('wood_crack', p.x, p.y, p.z, {});
    else play('voxel_break', p.x, p.y, p.z, {});
  };
  H.prop_spawned = (p) => { if (Number.isFinite(p.x) && !cull(p.x, p.z, 80)) play('voxel_pop', p.x, undefined, p.z, { vol: 0.8 }); };
  H.prop_damaged = (p) => { if (!cull(p.x, p.z, 70)) play('debris_clatter', p.x, p.y, p.z, { vol: 0.6 }); };
  H.god_power = (p) => {
    duck('music', -4, 800);
    switch (p.kind) {
      case 'zeus_lightning': play('thunder_crack', undefined, undefined, undefined, {}); play('lightning_zap', p.x, undefined, p.z, { vol: 1 }); break;
      case 'meteor': play('fire_ignite', p.x, undefined, p.z, { vol: 1 }); play('boulder_whoosh', p.x, undefined, p.z, { delay: 0.05 }); break;
      case 'earthquake': play('rubble', p.x, undefined, p.z, { vol: 1, pitch: 0.7 }); play('wall_crumble', p.x, undefined, p.z, { delay: 0.2, vol: 0.8, pitch: 0.8 }); break;
      case 'heal_wave': play('heal_chime', undefined, undefined, undefined, { vol: 1 }); play('buff_power', undefined, undefined, undefined, { delay: 0.2, vol: 0.7 }); break;
      case 'wine_rain': play('wine_pour', undefined, undefined, undefined, {}); play('confetti_pop', p.x, undefined, p.z, { delay: 0.3, vol: 0.5 }); break;
      case 'raise_chickens': for (let i = 0; i < 6; i++) play('chicken_cluck', p.x, undefined, p.z, { delay: i * 0.09 + R(0, 0.05), vol: 0.8 }); break;
      default: play('buff_power', p.x, undefined, p.z, {});
    }
  };
  H.ability_cast = (p) => {
    if (Number.isFinite(p.x)) track(p.id, '', p.x, 0, p.z);
    let cue = ABILITY_CUES[p.ability];
    const u = p.ability === 'cc_field' || p.ability === 'dash' ? unitAt(p.id) : null;
    if (p.ability === 'cc_field') cue = (u && CC_BY_SPECIES[u.def.id]) || 'curse_whoosh';
    else if (p.ability === 'dash' && u && u.def.id === 'minotaur') cue = 'minotaur_roar';
    if (!cue) return;
    if (cue === 'crowd_cheer_small') { if (crowdOn()) { crowdReact(now(), false); return; } cue = 'cheer_small'; }   // no stands outside the colosseum: a unit cheer instead
    const x = p.x, z = p.z;
    if (Number.isFinite(x) && cull(x, z, 120)) { stats.culled++; return; }
    play(cue, x, undefined, z, { priority: 75 });
    if (p.ability === 'war_horn') play('battle_cry', undefined, undefined, undefined, { delay: 0.4, vol: 0.8 });
    if (p.ability === 'execute') play('hit_blade', x, undefined, z, { vol: 1.1 });
  };
  H.first_blood = () => { if (stingerOk(now(), 15)) play('stinger_epic', undefined, undefined, undefined, { vol: 0.8 }); };
  H.hero_down = (p) => {
    const t = now(); duck('music', -5, 800);
    if (stingerOk(t, 15)) play('stinger_hero_down', undefined, undefined, undefined, {});
    if (crowdOn() && t - lastCrowd >= 3) { lastCrowd = t; play('crowd_gasp', undefined, undefined, undefined, {}); }
  };
  H.lead_change = () => { if (stingerOk(now(), 15)) play('stinger_epic', undefined, undefined, undefined, { vol: 0.6 }); };
  H.kill_streak = (p) => {
    const t = now();
    if (p.count >= 10 && stingerOk(t, 15)) play('stinger_epic', undefined, undefined, undefined, { vol: 0.7 });
    else crowdReact(t, p.count >= 10);
  };
  H.big_swing = () => { const t = now(); if (crowdOn() && t - lastCrowd >= 3) { lastCrowd = t; play('crowd_gasp', undefined, undefined, undefined, {}); } else play('drum_boom', undefined, undefined, undefined, { vol: 0.5 }); };
  H.army_low = () => { play('gong', undefined, undefined, undefined, { vol: 0.8 }); const t = now(); if (crowdOn() && t - lastCrowd >= 3) { lastCrowd = t; play('crowd_gasp', undefined, undefined, undefined, {}); } };
  H.chicken_tantrum = (p) => { play('chicken_rage', Number.isFinite(p && p.x) ? p.x : undefined, undefined, Number.isFinite(p && p.z) ? p.z : undefined, {}); if (stingerOk(now(), 15)) play('stinger_funny', undefined, undefined, undefined, { vol: 0.6 }); };
  H.trojan_reveal = () => { play('horn_charge', undefined, undefined, undefined, {}); play('wood_crack', undefined, undefined, undefined, { delay: 0.12 }); if (stingerOk(now(), 15)) play('stinger_funny', undefined, undefined, undefined, { delay: 0.6, vol: 0.7 }); };
  H.throne_sit = () => { if (stingerOk(now(), 15)) play('stinger_funny', undefined, undefined, undefined, {}); else play('death_oof', undefined, undefined, undefined, { vol: 0.5 }); };
  H.philosopher_monologue = () => { play('philosopher_mumble', undefined, undefined, undefined, {}); play('philosopher_mumble', undefined, undefined, undefined, { delay: 1.1, vol: 0.6, pitch: 0.92 }); };
  H.stone_gaze = (p) => { const u = unitAt(p.src); play('medusa_hiss', u ? u.x : undefined, undefined, u ? u.z : undefined, {}); play('stone_freeze', u ? u.x : undefined, undefined, u ? u.z : undefined, { delay: 0.25 }); };
  H.intervention = (p) => {
    duck('music', -6, 900);
    if (p.kind === 'zeus') { play('thunder_crack', undefined, undefined, undefined, { vol: 1 }); play('lightning_zap', undefined, undefined, undefined, {}); }
    else if (p.kind === 'goat') { play('goat_bleat', undefined, undefined, undefined, { vol: 1 }); if (stingerOk(now(), 15)) play('stinger_funny', undefined, undefined, undefined, { delay: 0.3 }); }
    else { play('thunder_crack', undefined, undefined, undefined, {}); play('gong', undefined, undefined, undefined, { delay: 0.4, vol: 0.7 }); play('crowd_boo', undefined, undefined, undefined, { delay: 0.5 }); if (stingerOk(now(), 15)) play('stinger_epic', undefined, undefined, undefined, { delay: 0.2, vol: 0.7 }); }
  };
  H.stalemate_warning = () => { play('drum_roll', undefined, undefined, undefined, {}); };
  H.wave_spawn = () => { play('horn_war', undefined, undefined, undefined, { vol: 0.8 }); };
  H.lightning_arc = (p) => { const x = (p.x0 + p.x1) / 2, z = (p.z0 + p.z1) / 2; if (!cull(x, z, 120)) play('lightning_zap', x, (p.y0 + p.y1) / 2, z, {}); };
  H.catapult_misfire = (p) => { const u = unitAt(p.id); play('catapult_creak', u ? u.x : undefined, undefined, u ? u.z : undefined, {}); play('wood_crack', u ? u.x : undefined, undefined, u ? u.z : undefined, { delay: 0.15 }); };
  H.cyclops_misaim = (p) => { const u = unitAt(p.id); play('cyclops_roar', u ? u.x : undefined, undefined, u ? u.z : undefined, { vol: 0.6 }); };
  H.friendly_fire = () => { const t = now(); if (crowdOn() && t - lastCrowd >= 3) { lastCrowd = t; play('crowd_boo', undefined, undefined, undefined, { vol: 0.6 }); } };
  H.unit_convert = (p) => { const u = unitAt(p.id); if (u) play('coin_clink', u.x, u.y, u.z, {}); };
  H.unit_revive = (p) => { const u = unitAt(p.id); if (u) play('revive_chime', u.x, u.y, u.z, {}); };
  H.unit_heal = (p) => { if (p.amount < 2) return; const u = unitAt(p.id); if (u && !cull(u.x, u.z, 60)) play('heal_chime', u.x, u.y, u.z, { vol: 0.5 }); };
  H.unit_rally = (p) => { const t = now(); if (t - lastRally < 0.4) return; lastRally = t; const u = unitAt(p.id); if (u) play('cheer_small', u.x, u.y, u.z, {}); };
  H.status_apply = (p) => {
    const t = now(); if (t - lastStatus < 0.15) return; lastStatus = t;
    const u = unitAt(p.id); if (!u || cull(u.x, u.z, 70)) return;
    if (p.status === 'stone') play('stone_freeze', u.x, u.y, u.z, {});
    else if (p.status === 'burn') play('fire_ignite', u.x, u.y, u.z, { vol: 0.5 });
    else if (p.status === 'wine') play('wine_pour', u.x, u.y, u.z, { vol: 0.5 });
  };
  H.trample = (p) => { const u = unitAt(p.id); if (u && !cull(u.x, u.z, 90)) play('elephant_step', u.x, u.y, u.z, {}); };
  H.charge_hit = (p) => {
    if (p.mul < 0.6) return;
    const t = now(); if (t - lastCharge < 0.08) return; lastCharge = t;
    const u = unitAt(p.dst); if (!u || cull(u.x, u.z, 90)) return;
    play('hit_blunt', u.x, u.y, u.z, { vol: 1.1, pitch: 0.85, priority: 70 }); play('kick_whoomp', u.x, u.y, u.z, { vol: 0.5, delay: 0.02 });
    const a = unitAt(p.id); if (a && a.def && a.def.id === 'war_elephant' && rng() < 0.35) play('elephant_trumpet', u.x, u.y, u.z, { priority: 75 });
  };
  H.unit_brace = (p) => { const u = unitAt(p.id); if (u && !cull(u.x, u.z, 80)) play('block_shield', u.x, u.y, u.z, { pitch: 0.75, vol: 1.0, priority: 65 }); };
  H.bark = (p) => {
    const t = now(); if (t - lastBark < 1.2) return; lastBark = t;
    const u = unitAt(p.id); if (!u || cull(u.x, u.z, 60)) return;
    const id = u.def && u.def.id;
    const cue = id === 'philosopher' ? 'philosopher_mumble' : id === 'senator' ? 'senator_blah' : id === 'sacred_chicken' ? 'chicken_cluck' : id === 'battle_goat' ? 'goat_bleat' : 'taunt';
    play(cue, u.x, u.y, u.z, { vol: 0.8 });
  };
  H.unit_spawn = (p) => {
    track(p.id, p.def, p.x, 0, p.z);
    if (!world || world.state !== 'placing') return;
    const mass = P(p.def).mass;
    play('ui_place', undefined, undefined, undefined, { pitch: 1.04 - 0.08 * clamp(Math.log2(mass + 1) / 4, 0, 1) });
  };

  return {
    stats,
    setArena(info) { arena = info || arenaInfo(null); },
    setWorld(w) { world = w; cache.clear(); },
    setDefs(d) { defs = d; },
    handle(type, p) {
      const fn = H[type]; if (!fn) return;
      stats.events++;
      if (hooks.note) hooks.note(type, p, now());
      fn(p);
    },
    /** foley / ambience bed driven by what is moving near the listener (call at ~4 Hz) */
    tick(dt) {
      if (!world || !world.units || world.state !== 'running') return;
      const l = deps.listener(), us = world.units;
      let moving = 0, hx = 0, hz = 0, hp = null, hn = 0;
      for (let i = 0; i < us.length; i++) {
        const u = us[i], dx = u.x - l.x, dz = u.z - l.z;
        if (dx * dx + dz * dz > 2500) continue;
        const sx = u.x - u.px, sz = u.z - u.pz, sp2 = sx * sx + sz * sz;
        if (sp2 > 0.0016) { moving++; const pr = P(u.def && u.def.id); if ((pr.big || pr.mounted) && sp2 > 0.01) { hn++; if (rng() * hn < 1) { hx = u.x; hz = u.z; hp = pr; } } }
      }
      const bed = clamp(moving / 40, 0, 1);
      footAcc += dt * (0.6 + 7 * bed); rustleAcc += dt * (0.2 + 1.6 * bed); heavyAcc += dt * 1.4 * clamp(hn / 5, 0, 1);
      const stepBase = STEP_BY_BIOME[arena.biome] || 'step_dirt';
      while (footAcc >= 1) { footAcc -= 1; const a = rng() * 6.283, r = R(6, 40); const stepCue = arena.water && rng() < 0.25 ? 'step_water' : stepBase; play(stepCue, l.x + Math.cos(a) * r, 0, l.z + Math.sin(a) * r, { vol: R(0.5, 0.9), delay: R(0, dt), priority: 24 }); }
      while (rustleAcc >= 1) { rustleAcc -= 1; const a = rng() * 6.283, r = R(6, 35); play('armor_rustle', l.x + Math.cos(a) * r, 0, l.z + Math.sin(a) * r, { vol: R(0.5, 1), delay: R(0, dt), priority: 24 }); }
      if (heavyAcc >= 1 && hp) { heavyAcc = 0; play(hp.species === 'elephant' || hp.big ? 'elephant_step' : 'horse_gallop', hx, 0, hz, { priority: 36, vol: 0.8 }); }
      else if (heavyAcc >= 1) heavyAcc = 0;
    },
    reset() { killN = 0; killHero = false; lastStinger = lastCrowd = -1e9; footAcc = rustleAcc = heavyAcc = 0; cache.clear(); tracked.clear(); },
    /** exposed for tests */
    _unitAt: unitAt,
  };
}
export { db2lin };
