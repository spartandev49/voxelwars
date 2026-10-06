// cc_field: crowd-control fields (spec §6.1): effect confuse | sleep | stone | scare | panic_cav, shape circle | cone.
//   confuse (philosopher r7, 3 s channel): 60% attack-speed loss + random stumbling for 5 s, monologue bubbles.
//   sleep (senator r9, 4 s channel): asleep 4 s, sleepers take x1.5 damage.   stone (medusa cone 40deg r14): frozen grey 4 s, x2 blunt, shatter on kill.
//   scare (elephant trumpet r10): -25 morale and a 2.5 s flinch-run for non-fearless enemies.   panic_cav (camel, passive cone r6): enemy cavalry -35% speed, 20% bolt.
// Trigger: ability off cooldown and enough enemies inside the field. AI rule: confuse/sleep/scare need >= 3-4 enemies in range; stone aims at the current
// target and needs >= 1. Telegraph: ground circle/cone for the whole channel (event `telegraph` + ability_channel_start); the effect lands when it ends.
import { reg } from './registry.js';
import { ST, SE } from '../consts.js';
import { applyStatus } from '../combat.js';
import { canAct, aiAllowed, beginChannel, tickChannel, emitCast, emitTelegraph, collect, inCone } from './util.js';

const FX = {
  confuse: { channel: 3, dur: 5, minN: 3, cd: 14, clip: 'cast', se: SE.CONFUSE },
  sleep: { channel: 4, dur: 4, minN: 3, cd: 16, clip: 'cast', se: SE.SLEEP },
  stone: { channel: 1.0, dur: 4, minN: 1, cd: 9, clip: 'cast', se: SE.STONE },
  scare: { channel: 1.0, dur: 2.5, minN: 4, cd: 15, clip: 'trumpet', se: SE.SCARE },
  panic_cav: { channel: 0, dur: 0.8, minN: 1, cd: 0, clip: 'idle', se: SE.PANIC },
};
const L = new Array(400);
const RAD = Math.PI / 180;

function param(ab) { const f = FX[ab.p.effect] || FX.confuse; return { channel: ab.p.channel !== undefined ? ab.p.channel : f.channel, dur: ab.p.duration || f.dur, minN: ab.p.minTargets || f.minN, cd: ab.p.cd !== undefined ? ab.p.cd : f.cd, clip: f.clip, se: f.se }; }

function members(w, u, ab, dirx, dirz, list) {
  const p = ab.p, r = p.radius || 7;
  const n = collect(w, u.x, u.z, r, list, u.team, 'enemy');
  if (p.shape !== 'cone') return n;
  const half = (p.angle || 40) * RAD / 2;
  let c = 0;
  for (let i = 0; i < n; i++) if (inCone(u.x, u.z, dirx, dirz, list[i].x, list[i].z, r, half)) list[c++] = list[i];
  return c;
}

function begin(u, ab, w, dirx, dirz) {
  const p = ab.p, pr = param(ab), st = ab.st;
  st.dx = dirx; st.dz = dirz;
  u.face = Math.atan2(dirx, dirz);
  beginChannel(w, u, ab, pr.channel, pr.clip, 1);
  if (p.shape === 'cone') emitTelegraph(w, 'cone', u.x, u.z, p.radius || 7, pr.channel, Math.atan2(dirx, dirz), (p.angle || 40) * RAD / 2, u.team);
  else emitTelegraph(w, 'circle', u.x, u.z, p.radius || 7, pr.channel, 0, 0, u.team);
  ab.cd = pr.cd;
  if (p.effect === 'confuse') { const e = w.P.philosopher_monologue; e.id = u.id; e.x = u.x; e.z = u.z; w.emit('philosopher_monologue', e); w.bark(u, 'monologue'); }
  else if (p.effect === 'sleep') w.bark(u, 'filibuster');
}

function land(u, ab, w) {
  const p = ab.p, pr = param(ab), st = ab.st;
  const n = members(w, u, ab, st.dx, st.dz, L);
  let hit = 0;
  for (let i = 0; i < n; i++) {
    const o = L[i];
    if (p.effect === 'scare') {
      if (o.def.tags.includes('fearless')) continue;
      o.morale -= 25; applyStatus(w, o, SE.SCARE, pr.dur);
    } else if (p.effect === 'stone') {
      if (o.def.tags.includes('boss') || o.mass >= 8) continue;
      applyStatus(w, o, SE.STONE, pr.dur);
    } else {
      if (o.mass >= 10) continue;
      applyStatus(w, o, pr.se, pr.dur);
    }
    hit++;
  }
  emitCast(w, u, ab, u.x, u.z);
  if (p.effect === 'stone') { const e = w.P.stone_gaze; e.src = u.id; e.count = hit; w.emit('stone_gaze', e); }
}

function wanted(u, ab, w) {
  const p = ab.p, pr = param(ab);
  let dx = Math.sin(u.heading), dz = Math.cos(u.heading);
  if (p.shape === 'cone' && u.target && u.target.alive) { const tx = u.target.x - u.x, tz = u.target.z - u.z, l = Math.sqrt(tx * tx + tz * tz) || 1; dx = tx / l; dz = tz / l; }
  const n = members(w, u, ab, dx, dz, L);
  if (n >= pr.minN) { ab.st.dx = dx; ab.st.dz = dz; return true; }
  return false;
}

reg('cc_field', {
  init(u, p) { return { ch: 0, dx: 0, dz: 1, pt: 0, tele: 0 }; },
  tick(u, ab, w, dt) {
    const p = ab.p, st = ab.st;
    if (p.effect === 'panic_cav') { passive(u, ab, w, dt); return; }
    if (st.ch > 0) { if (tickChannel(w, u, ab, dt) === 1) land(u, ab, w); return; }
    if (ab.cd > 0 || !aiAllowed(w, u) || !canAct(w, u)) return;
    if (wanted(u, ab, w)) begin(u, ab, w, st.dx, st.dz);
  },
  cast(u, ab, w, ctx) {
    if (ab.p.effect === 'panic_cav' || ab.cd > 0 || !canAct(w, u)) return false;
    const dx = ctx.dx !== undefined ? ctx.dx : Math.sin(u.heading), dz = ctx.dz !== undefined ? ctx.dz : Math.cos(u.heading);
    begin(u, ab, w, dx, dz); return true;
  },
});

/** Camel panic: every 0.5 s enemy cavalry in the forward cone slow down; 20% bolt away. */
function passive(u, ab, w, dt) {
  const st = ab.st;
  st.pt -= dt; if (st.pt > 0) return;
  st.pt = 0.5;
  if (u.state === ST.ROUT || u.state === ST.STUN || u.state === ST.DOWN) return;
  const p = ab.p, r = p.radius || 6, dx = Math.sin(u.heading), dz = Math.cos(u.heading), half = 45 * RAD;
  const n = collect(w, u.x, u.z, r, L, u.team, 'enemy');
  let hit = 0;
  for (let i = 0; i < n; i++) {
    const o = L[i];
    if (!o.def.tags.includes('cavalry') || !inCone(u.x, u.z, dx, dz, o.x, o.z, r, half)) continue;
    const fresh = o.se[SE.PANIC] <= 0;
    applyStatus(w, o, SE.PANIC, 0.8);
    if (fresh && !o.def.tags.includes('fearless') && w.rng.next() < 0.2) applyStatus(w, o, SE.SCARE, 1.2);
    hit++;
  }
  if (hit > 0) { st.tele -= 1; if (st.tele <= 0) { st.tele = 4; emitTelegraph(w, 'cone', u.x, u.z, r, 0.5, Math.atan2(dx, dz), half, u.team); emitCast(w, u, ab, u.x, u.z); } }
}
