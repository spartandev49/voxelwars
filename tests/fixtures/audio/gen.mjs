// Generates the audio test fixtures (sine / noise WAVs + a tiny manifest). Run: node tests/fixtures/audio/gen.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeWav, sine, noiseBurst } from '../../audio/wav.mjs';
const dir = path.dirname(fileURLToPath(import.meta.url));
const W = (name, chans, sr = 22050) => fs.writeFileSync(path.join(dir, name), writeWav(chans, sr));
W('sine_440.wav', [sine(440, 0.5)]);
W('sine_880.wav', [sine(880, 0.5)]);
W('noise_burst.wav', [noiseBurst(0.4)]);
W('loop_sine_2s.wav', [sine(220, 2.0, 22050, 0.3)]);
const L = sine(262, 8, 22050, 0.25), R = sine(330, 8, 22050, 0.25);
W('music_stereo_8s.wav', [L, R]);
const ent = (id, category, tags, o = {}) => Object.assign({ id, file: id + '.wav', path: 'audio/sfx/' + id + '.wav', category, tags, duration: 0.4, license: 'CC0 1.0', author: 'generated', title: id, source: 'tests/fixtures/audio/gen.mjs' }, o);
const sfx = [];
for (const [id, cat] of [['sword_hit', 'blade'], ['flesh_hit_light', 'impact'], ['flesh_hit_heavy', 'impact'], ['death_grunt', 'death'], ['war_horn', 'horn'], ['ui_click', 'ui'], ['ui_hover', 'ui'], ['bow_shot', 'bow'], ['crowd_cheer', 'crowd'], ['thunder_crack', 'magic'], ['jingle_victory', 'jingle'], ['jingle_defeat', 'jingle'], ['jingle_battle_start', 'jingle'], ['drum_boom', 'drum'], ['ambience_wind_loop', 'ambience'], ['armor_rustle', 'foley'], ['footstep_grass', 'foley'], ['wood_thud', 'shield'], ['shield_block', 'shield'], ['arrow_hit_flesh', 'bow'], ['boulder_impact', 'siege'], ['catapult_launch', 'siege'], ['chicken_cluck', 'animal'], ['countdown_beep', 'ui'], ['countdown_go', 'ui']]) {
  if (/_loop$/.test(id)) { sfx.push(ent(id, cat, [id], { duration: 2 })); continue; }
  for (let i = 1; i <= 3; i++) sfx.push(ent(id + '_' + i, cat, [id], { core: i === 1 && ['sword_hit', 'ui_click', 'flesh_hit_light', 'death_grunt', 'war_horn'].includes(id) }));
}
const music = [
  { id: 'menu_a', file: 'menu_a.wav', path: 'audio/music/menu_a.wav', mood: 'menu', tags: ['epic'], duration: 8, loop: false },
  { id: 'menu_b', file: 'menu_b.wav', path: 'audio/music/menu_b.wav', mood: 'menu', tags: ['calm'], duration: 8, loop: false },
  { id: 'battle_low_dark', file: 'battle_low_dark.wav', path: 'audio/music/battle_low_dark.wav', mood: 'battle_low', tags: ['tribal', 'war drums'], duration: 8, loop: false },
  { id: 'battle_mid_epic', file: 'battle_mid_epic.wav', path: 'audio/music/battle_mid_epic.wav', mood: 'battle_mid', tags: ['epic', 'orchestral'], duration: 8, loop: true, loopStart: 0, loopEnd: 8 },
  { id: 'battle_high_brass', file: 'battle_high_brass.wav', path: 'audio/music/battle_high_brass.wav', mood: 'battle_high', tags: ['brass', 'timpani', 'epic'], duration: 8, loop: false },
  { id: 'victory_x', file: 'victory_x.wav', path: 'audio/music/victory_x.wav', mood: 'victory', tags: ['fanfare'], duration: 8, loop: false },
  { id: 'defeat_x', file: 'defeat_x.wav', path: 'audio/music/defeat_x.wav', mood: 'defeat', tags: ['somber'], duration: 8, loop: false },
  { id: 'comedy_x', file: 'comedy_x.wav', path: 'audio/music/comedy_x.wav', mood: 'comedy', tags: ['silly'], duration: 8, loop: false },
];
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ version: 1, sfx, music, vfx: [] }, null, 1));
console.log('fixtures:', fs.readdirSync(dir).join(' '));
