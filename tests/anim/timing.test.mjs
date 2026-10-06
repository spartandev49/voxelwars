// A5: damage lands within 1 tick of the clip's hitFrame, and the hitFrame matches the baked tip-speed peak frame (+-2 frames, decisions_r3 D11).
// The sim reads ClipLib.hit(id); this test checks that number against the motion actually on screen (weapon tip / hand / foot speed peak).
import assert from 'node:assert';
import { boot, ClipLib, ok } from './_common.mjs';
import { pointSpeedProfile } from '../../src/anim/analysis.js';
import { makeHum1Ref, makeSoldier } from '../fixtures/rigs.js';
import { DT } from '../../src/sim/consts.js';

boot();
const sold = {
  dory: await makeSoldier({ main: 'dory', off: 'hoplon' }), gladius: await makeSoldier({ main: 'gladius', off: 'scutum', helm: 'galea' }), axe: await makeSoldier({ main: 'greataxe', off: 'none', helm: 'horned' }),
  club: await makeSoldier({ main: 'club_big', off: 'none' }), scepter: await makeSoldier({ main: 'scepter', off: 'none' }), javelin: await makeSoldier({ main: 'javelin', off: 'none' }), bow: makeHum1Ref({ weapon: 'bow', back: 'quiver' }),
};
const tip = (m) => { const a = m.attach.muzzle || m.attach.grip_main; const p = m.byId[a.part]; return [a.part, [(a.at[0] - p.pivot[0]) * 0.1, (a.at[1] - p.pivot[1]) * 0.1, (a.at[2] - p.pivot[2]) * 0.1]]; };
// clip -> [model, tracked point (part, local world-unit point)]
const hand = ['armLR', [0, -0.5, 0]], stringHand = ['armLL', [0, -0.5, 0]], sole = ['legLL', [0, -0.5, 0]];
const CASES = {
  strike_thrust: ['dory', null], strike_slash_1: ['gladius', null], strike_slash_2: ['gladius', null], strike_overhead: ['axe', null], strike_bash: ['gladius', ['armLL', [0, -0.5, 0.0]]],
  kick: ['dory', sole], throw: ['javelin', hand], cast: ['scepter', hand], shoot_bow: ['bow', stringHand], launch: ['club', hand],
};
const TOL = 2;                                        // frames
const rows = [], bad = [];
for (const [clip, [mk, pt]] of Object.entries(CASES)) {
  const m = sold[mk], [part, local] = pt || tip(m);
  const prof = pointSpeedProfile(m, clip, part, local);
  const meta = ClipLib.get(clip, 'hum1').meta;
  const hitF = meta.hitFrame, d = prof.peakFrame - hitF;
  rows.push(`${clip.padEnd(16)} hitFrame ${String(hitF).padStart(2)}  tip-speed peak ${String(prof.peakFrame).padStart(2)}  (${d >= 0 ? '+' : ''}${d})`);
  // damage lands within 1 sim tick of the hit frame: the sim fires at ClipLib.hit(clip)/rate and the render shows frame hitFrame at the same time
  assert.ok(Math.abs(ClipLib.hit(clip) - hitF / 30) <= DT + 1e-9, `${clip}: ClipLib.hit ${ClipLib.hit(clip)} vs hitFrame/30 ${hitF / 30}`);
  if (Math.abs(d) > TOL) bad.push(`${clip}: peak ${prof.peakFrame} vs hit ${hitF}`);
}
console.log(rows.join('\n'));
assert.deepStrictEqual(bad, [], 'A5: hit frame not within +-2 frames of the tip-speed peak');
ok('A5 hit frames match the tip-speed peak (+-2 frames) and ClipLib.hit within 1 tick');
