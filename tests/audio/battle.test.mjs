// AU5 against the REAL sim: a 150v150 battle (marathon, then the colosseum) drives the engine through world.events on a mock
// context; the voice budget (32), rate limits and the per-event cue counts are checked while it runs.
import assert from 'node:assert/strict';
import { generateArena } from '../../src/world/gen.js';
import { World } from '../../src/sim/world.js';
import { buildSimDefs } from '../../src/sim/defs.js';
import { runningEngine } from './helpers.mjs';
import { CUES } from '../../src/audio/cues.js';

const defs = buildSimDefs();
async function battle(arenaId, label) {
  const arena = generateArena(arenaId, 'medium', 5);
  const w = new World({ arena, seed: 11, defs }); const A = arena.zones.A, B = arena.zones.B;
  const army = (team, z0, h, mix) => { let k = 0; for (const [d, n] of mix) w.addSquad(d, team, n, team ? B.x : A.x, z0 + (k++) * 5, { heading: h }); };
  army(0, A.z - 14, Math.PI / 2, [['hoplite', 40], ['spartan', 14], ['cretan_archer', 24], ['peltast', 16], ['companion_cavalry', 14], ['strategos', 1], ['philosopher', 6], ['sacred_chicken', 20], ['battle_goat', 15]]);
  army(1, B.z - 14, -Math.PI / 2, [['legionary', 40], ['gladiator', 14], ['nubian_archer', 24], ['equites', 14], ['war_elephant', 3], ['catapult', 3], ['centurion', 1], ['senator', 6], ['pilum_thrower', 25], ['warhound', 20]]);
  const total = w.units.length; assert.ok(total >= 280, 'units ' + total);
  const { eng } = await runningEngine({ manifest: (await import('./helpers.mjs')).fixtureManifest() });
  eng.bank.warm(['ui', 'combat', 'voice', 'siege', 'misc']); await eng.bank.idle();
  eng.setListener(0, 30, 0, 0); eng.setPlayerTeam(0);
  const ctx = eng.ctx; const reaches = (n, target) => { if (n === target) return true; for (const o of n.out) if (reaches(o, target)) return true; return false; };
  const isMusic = (s) => reaches(s, eng.buses.music.in);
  const evCounts = Object.create(null); w.events.onAny((t) => { evCounts[t] = (evCounts[t] || 0) + 1; });
  eng.attach(w.events, { arena: w.arena, world: w, defs });
  w.start(); let maxVoices = 0, maxSources = 0, ticks = 0, intensity = [];
  for (let i = 0; i < 30 * 200 && w.state !== 'ended'; i++) {
    w.tick(); ticks++; ctx._t = w.time;     // sim time drives the mock audio clock (1x speed)
    if ((i & 3) === 0) {
      const v = eng.vm.active(ctx.currentTime) + eng.loops.size; maxVoices = Math.max(maxVoices, v);
      const as = ctx.activeSources(ctx.currentTime, 0.015, isMusic);
      if (as > maxSources) {
        maxSources = as;
        if (process.env.AUDIO_DEBUG) {
          const mine = new Set(eng.vm.v.map((h) => h.node && h.node.src)), now = ctx.currentTime;
          const extra = ctx.sources.filter((s) => !isMusic(s) && !mine.has(s) && s.startT !== null && s.startT <= now && !s.loop && s.buffer && now < s.startT + s.buffer.duration / s.playbackRate.value && (s.stopT === null || now < s.stopT) && !(s.stopT !== null && s.stopT - now <= 0.015));
          console.log('DBG', now.toFixed(2), 'accounted', eng.vm.v.length, 'audible', as, 'unaccounted', extra.length, extra.slice(0, 8).map((s) => 'start' + (s.startT - now).toFixed(3) + ' dur' + s.buffer.duration.toFixed(2) + ' rate' + s.playbackRate.value.toFixed(2) + ' stop' + (s.stopT === null ? '-' : (s.stopT - now).toFixed(3))).join(' | '));
        }
      }
    }
    if (i % 30 === 15) { eng._tick(); intensity.push(eng.music.intensity); }
  }
  const d = eng.diagnostics();
  console.log(`${label}: ${total} units, ${w.time.toFixed(0)} s sim, events ${JSON.stringify(Object.fromEntries(Object.entries(evCounts).sort((a, b) => b[1] - a[1]).slice(0, 7)))}`);
  console.log(`  voices peak ${d.voicePeak}/32 steals ${d.voiceSteals} drops ${d.voiceDrops} (cooldown ${d.drops.cooldown} family ${d.drops.family} budget ${d.drops.budget} culled ${d.drops.culled} thin ${d.drops.thin} pending ${d.drops.pending}); sources audible peak ${maxSources}`);
  const top = Object.entries(d.cueCounts).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => k + ':' + v).join(' '); console.log('  cues started: ' + top);
  return { eng, w, d, maxVoices, maxSources, evCounts, intensity, ctx };
}

const m = await battle('marathon', 'marathon 150v150');
assert.ok(m.d.voicePeak <= 32, 'AU5: voice peak ' + m.d.voicePeak); assert.ok(m.maxVoices <= 32 && m.maxSources <= 32, `AU5: voices ${m.maxVoices}, audible sources ${m.maxSources}`);
assert.ok(m.evCounts.unit_hit > 500 && m.evCounts.unit_kill > 100 && m.evCounts.projectile_launch > 100, 'the sim produced a real battle');
const cc = m.d.cueCounts;
for (const need of ['hit_flesh_light', 'death_male', 'bow_shoot', 'arrow_hit_flesh', 'block_shield', 'jingle_start', 'horn_war', 'drum_boom']) assert.ok(cc[need] > 0, need + ' fired in a real battle');
assert.ok((cc.jingle_victory || 0) + (cc.jingle_defeat || 0) + (cc.stinger_funny || 0) >= 1, 'battle_end jingle');
assert.ok(cc.chicken_cluck > 0 || cc.goat_bleat > 0, 'comic units are audible');
// stingers: <= 1 per 15 s of sim time (plus the battle_end ones)
const stingers = (cc.stinger_epic || 0) + (cc.stinger_hero_down || 0) + (cc.stinger_funny || 0); assert.ok(stingers <= Math.ceil(m.w.time / 15) + 2, `stingers ${stingers} in ${m.w.time.toFixed(0)} s`);
for (const k of Object.keys(cc)) if (CUES[k] && CUES[k].cooldownMs > 0) assert.ok(cc[k] <= m.w.time / (CUES[k].cooldownMs / 1000) + 2, `${k}: ${cc[k]} starts exceed its cooldown budget`);
assert.equal(cc.crowd_cheer_small || 0, 0, 'no crowd on marathon');
assert.ok(m.eng.loops.size === 0 || m.w.state === 'ended', 'loops stop at the end'); assert.ok(m.eng.music.mood === 'victory' || m.eng.music.mood === 'defeat' || m.eng.music.mood === 'comedy', 'music moves to the result mood: ' + m.eng.music.mood);
const hi = Math.max(...m.intensity), lo = Math.min(...m.intensity); assert.ok(hi > lo + 0.1, `intensity follows the battle (${lo.toFixed(2)} .. ${hi.toFixed(2)})`);
assert.ok(m.eng.diagnostics().music.mood !== 'none');

const c = await battle('colosseum', 'colosseum 150v150');
assert.ok(c.d.voicePeak <= 32 && c.maxSources <= 32, `colosseum voices ${c.d.voicePeak} sources ${c.maxSources}`);
assert.ok((c.d.cueCounts.crowd_cheer_small || 0) + (c.d.cueCounts.crowd_cheer_big || 0) >= 1, 'crowd reacts in the colosseum');
assert.ok((c.d.cueCounts.crowd_cheer_small || 0) + (c.d.cueCounts.crowd_cheer_big || 0) + (c.d.cueCounts.crowd_gasp || 0) <= c.w.time / 3 + 3, 'crowd reactions limited to ~1 per 3 s');
console.log('battle.test OK');
