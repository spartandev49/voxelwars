// A6: crossfade pops. The sim switches clips with blend 0 -> 1 over 0.14 s (state.blend += dt/0.14). Over a long random switch sequence the largest
// per-frame joint rotation change at the switch frames must stay <= 0.35 rad, for every transition the sim can produce (clips whose
// exit/enter classes are compatible: neutral -> neutral, lying -> lying).
import assert from 'node:assert';
import { boot, ClipLib, Animator, ok } from './_common.mjs';
import { makeSoldier, makeHum1Ref } from '../fixtures/rigs.js';

boot();
const m = await makeSoldier({ main: 'dory', off: 'hoplon' });
const P = m.parts.length, outA = new Float32Array(P * 9), outB = new Float32Array(P * 9);
const root = { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 };
const wrap = (a) => { a %= 2 * Math.PI; return a > Math.PI ? a - 2 * Math.PI : a < -Math.PI ? a + 2 * Math.PI : a; };
let lastPart = '';
const maxDelta = (a, b) => { let d = 0; for (let p = 0; p < P; p++) for (let k = 3; k < 6; k++) { const x = Math.abs(wrap(a[p * 9 + k] - b[p * 9 + k])); if (x > d) { d = x; lastPart = m.parts[p].id + '.' + 'xyz'[k - 3]; } } return d; };

// sim-reachable humanoid clips (what ai.js / combat.js ever publish) and their enter/exit classes
const IDS = ['idle', 'idle_combat', 'block_hold', 'strike_slash_1', 'strike_slash_2', 'strike_thrust', 'strike_overhead', 'strike_bash', 'shoot_bow', 'throw', 'cast', 'kick', 'block_hit', 'hit_front', 'hit_back',
  'stagger', 'stun', 'dizzy', 'cower', 'taunt', 'cheer', 'sit', 'death_back', 'death_front', 'death_spin', 'getup', 'launch', 'sleep'];
const cls = (id) => { const c = ClipLib.get(id, 'hum1'); return { enter: (c.meta && c.meta.enter) || 'neutral', exit: (c.meta && c.meta.exit) || (c.loop ? 'neutral' : 'neutral') }; };
const LIE = new Set(['death_back', 'death_front', 'death_spin']);
const reachable = (a, b) => {
  if (LIE.has(a)) return b === 'getup' || LIE.has(b);          // a corpse only ever gets up (revive) or stays down
  if (b === 'getup') return false;                              // getup starts lying
  return true;
};
const state = { clip: 'idle', t: 0, rate: 1, flinch: 0, dir: 0, prev: 'idle', blend: 1 };
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const worst = [];
let n = 0, maxPop = 0;
for (let it = 0; it < 4000; it++) {
  const a = IDS[(rnd() * IDS.length) | 0], b = IDS[(rnd() * IDS.length) | 0];
  if (a === b || !reachable(a, b)) continue;
  const da = ClipLib.dur(a, 'hum1'), loopA = ClipLib.get(a, 'hum1').loop;
  // the sim switches at any time while a plays (attacks are interrupted by hits, loops at random phase): sample the pose a was showing
  const ta = loopA ? rnd() * da : Math.min(da, rnd() * da);
  state.clip = a; state.prev = a; state.t = ta; state.blend = 1;
  const ex = { root, speed: 0, id: 11, heading: 0, scale: 1 };
  Animator.pose(m, state, ex, outA);                     // last frame of a
  // switch: setAnim() resets t and blend, the next frame shows blend = dt/0.14
  state.prev = a; state.clip = b; state.t = 0; state.blend = (1 / 30) / 0.14;
  Animator.pose(m, state, ex, outB);                     // first frame after the switch
  const pop = maxDelta(outA, outB), popPart = lastPart;
  n++; if (pop > maxPop) maxPop = pop;
  // the sim then continues: check the following blend frames too (no frame-to-frame jump above the limit)
  let prev = outB, cur = new Float32Array(P * 9), run = 0;
  for (let f = 2; f <= 5; f++) { state.t = (f - 1) / 30; state.blend = Math.min(1, f / 30 / 0.14); Animator.pose(m, state, ex, cur); run = Math.max(run, maxDelta(prev, cur)); prev = cur.slice(); }
  if (pop > 0.35) worst.push({ a, b, pop: +pop.toFixed(3), ta: +ta.toFixed(2), part: popPart });
}
worst.sort((x, y) => y.pop - x.pop);
const summary = {}; for (const w of worst) { const k = w.a + '->' + w.b + ' [' + w.part + ']'; if (!summary[k] || summary[k] < w.pop) summary[k] = w.pop; }
console.log(`transitions tested ${n}, max switch-frame change ${maxPop.toFixed(3)} rad, offenders ${worst.length}`);
if (worst.length) console.log(Object.entries(summary).sort((x, y) => y[1] - x[1]).slice(0, 25).map(([k, v]) => `  ${k}: ${v}`).join('\n'));
assert.ok(maxPop <= 0.35 + 1e-9, `A6: switch-frame change ${maxPop.toFixed(3)} rad > 0.35`);
ok(`A6 crossfade: max change at a switch frame ${maxPop.toFixed(3)} rad over ${n} random transitions`);
