// Procedural arena recipes. Each recipe returns a fully built Arena (terrain, materials, water, zones, props, env).
// Recipes are deterministic for a given (recipe, size, seed). Props use ids from content/era_ancient/props.js.

import { Arena, MAT, CELL, SIZES } from './arena.js';
import { RNG, Noise2D, clamp, smoothstep, lerp } from '../core/rng.js';

const TAU = Math.PI * 2;

function fillBase(a, fn) {
  const n = a.size;
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
    const wx = a.worldX(x), wz = a.worldZ(z);
    const r = fn(wx, wz, x, z);
    a.h[x + z * n] = clamp(Math.round(r.h), 0, 119);
    a.m[x + z * n] = r.m;
  }
}
function flattenZones(a, margin = 1.0, targetFn) {
  for (const k of ['A', 'B']) {
    const z = a.zones[k];
    const tgt = targetFn ? targetFn(k) : a.cellHeight(z.x, z.z) / 0.5;
    const cx0 = a.cx(z.x - z.w / 2 - margin), cx1 = a.cx(z.x + z.w / 2 + margin), cz0 = a.cz(z.z - z.d / 2 - margin), cz1 = a.cz(z.z + z.d / 2 + margin);
    for (let cz = Math.max(0, cz0); cz <= Math.min(a.size - 1, cz1); cz++) for (let cx = Math.max(0, cx0); cx <= Math.min(a.size - 1, cx1); cx++) {
      const wx = a.worldX(cx), wz = a.worldZ(cz);
      const dx = Math.max(0, Math.abs(wx - z.x) - z.w / 2), dz = Math.max(0, Math.abs(wz - z.z) - z.d / 2);
      const d = Math.sqrt(dx * dx + dz * dz);
      const t = 1 - smoothstep(0, margin * 3, d);
      if (t > 0) a.setH(cx, cz, lerp(a.getH(cx, cz), tgt, t));
    }
  }
}
function scatter(a, rng, ids, count, opts = {}) {
  const { avoidWater = true, minSlope = 3, avoidZones = true, scale = [0.9, 1.25], clusterNoise = null, margin = 3 } = opts;
  const W = a.worldSize();
  let placed = 0, tries = 0;
  while (placed < count && tries < count * 40) {
    tries++;
    const x = rng.range(-W / 2 + margin, W / 2 - margin), z = rng.range(-W / 2 + margin, W / 2 - margin);
    const cx = a.cx(x), cz = a.cz(z);
    if (avoidWater && a.isWaterCell(cx, cz)) continue;
    if (avoidWater && a.water > 0 && a.getH(cx, cz) < a.water + 1) continue;
    if (avoidZones && inZone(a, x, z, 1.5)) continue;
    const h = a.getH(cx, cz);
    if (Math.abs(a.getH(cx + 1, cz) - h) + Math.abs(a.getH(cx, cz + 1) - h) > minSlope) continue;
    if (clusterNoise && clusterNoise(x, z) < 0) continue;
    a.props.push({ t: rng.pick(ids), x, z, r: rng.range(0, TAU), s: rng.range(scale[0], scale[1]), v: rng.int(0, 3) });
    placed++;
  }
}
export function inZone(a, x, z, pad = 0) {
  for (const k of ['A', 'B']) { const q = a.zones[k]; if (Math.abs(x - q.x) <= q.w / 2 + pad && Math.abs(z - q.z) <= q.d / 2 + pad) return true; }
  return false;
}
function setZones(a, frac = 0.3, depth = 0.7, width = 0.2) {
  const W = a.worldSize();
  a.zones = { A: { x: -W * frac, z: 0, w: W * width, d: W * depth }, B: { x: W * frac, z: 0, w: W * width, d: W * depth } };
}
function clearProps(a, x, z, r) { a.props = a.props.filter((p) => (p.x - x) ** 2 + (p.z - z) ** 2 > r * r); }
function ring(a, rng, id, cx, cz, radius, n, opts = {}) {
  for (let i = 0; i < n; i++) { const t = (i / n) * TAU; a.props.push({ t: id, x: cx + Math.cos(t) * radius, z: cz + Math.sin(t) * radius, r: -t + Math.PI / 2, s: opts.s || 1, v: 0 }); }
}
function line(a, id, x0, z0, x1, z1, step, opts = {}) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.floor(L / step)), ang = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i <= n; i++) { const t = i / n; a.props.push({ t: id, x: lerp(x0, x1, t), z: lerp(z0, z1, t), r: opts.rot ?? ang, s: opts.s || 1, v: opts.v || 0 }); }
}

const R = {};

/** Gentle rolling plain with a few hills, scattered olive trees and boulders. */
R.marathon = (a, rng, noise) => {
  a.biome = 'grass'; a.env = { time: 10.5, weather: 'clear', fog: 0.2, theme: 'greek', wind: 0.35 };
  fillBase(a, (x, z) => ({ h: 16 + noise.fbm(x / 28, z / 28, 4) * 7 + noise.fbm(x / 9, z / 9, 2) * 1.2, m: noise.noise(x / 6 + 40, z / 6) > 0.35 ? MAT.dirt : MAT.grass }));
  setZones(a); flattenZones(a);
  scatter(a, rng, ['tree_olive', 'tree_olive', 'tree_cypress', 'bush', 'rock_small', 'wheat'], Math.floor(a.size * 0.6));
  scatter(a, rng, ['column_broken', 'ruin_wall'], 5);
};

/** Narrow pass between two cliffs with a wall; the classic 300 joke. */
R.thermopylae = (a, rng, noise) => {
  a.biome = 'stone'; a.env = { time: 9, weather: 'cloudy', fog: 0.3, theme: 'greek', wind: 0.4 };
  const W = a.worldSize();
  fillBase(a, (x, z) => {
    const corridor = Math.abs(z) + noise.fbm(x / 20, z / 20, 3) * 4;
    const cliff = smoothstep(W * 0.12, W * 0.2, corridor);
    return { h: 14 + cliff * (40 + noise.ridged(x / 15, z / 15, 3) * 14) + noise.fbm(x / 7, z / 7, 2) * 0.8, m: cliff > 0.4 ? (noise.noise(x / 4, z / 4) > 0 ? MAT.stone : MAT.moss) : (noise.noise(x / 8, z / 8) > 0.2 ? MAT.dirt : MAT.sand) };
  });
  // sea on the south edge visible via water plane at low level
  a.zones = { A: { x: -W * 0.3, z: 0, w: W * 0.2, d: W * 0.18 }, B: { x: W * 0.3, z: 0, w: W * 0.2, d: W * 0.18 } };
  flattenZones(a, 1, () => 14);
  line(a, 'wall_stone', -W * 0.05, -W * 0.16, -W * 0.05, -4.2, 1.9, { rot: Math.PI / 2 });
  line(a, 'wall_stone', -W * 0.05, 4.2, -W * 0.05, W * 0.16, 1.9, { rot: Math.PI / 2 });
  scatter(a, rng, ['rock_small', 'rock_big', 'tree_cypress', 'bush'], 50, { minSlope: 6 });
};

R.colosseum = (a, rng, noise) => {
  a.biome = 'sand'; a.env = { time: 14, weather: 'clear', fog: 0.1, theme: 'roman', wind: 0.15 };
  const W = a.worldSize(), rx = W * 0.4, rz = W * 0.3;
  fillBase(a, (x, z) => {
    const e = Math.sqrt((x / rx) ** 2 + (z / rz) ** 2);
    const bowl = smoothstep(0.94, 1.0, e), stands = smoothstep(1.0, 1.35, e);
    return { h: 12 + bowl * 6 + stands * 22 + noise.fbm(x / 6, z / 6, 2) * 0.4, m: e < 0.94 ? MAT.sand : e < 1.0 ? MAT.stone : MAT.marble };
  });
  a.zones = { A: { x: -W * 0.17, z: 0, w: W * 0.14, d: W * 0.35 }, B: { x: W * 0.17, z: 0, w: W * 0.14, d: W * 0.35 } };
  flattenZones(a, 0.5, () => 12);
  ring(a, rng, 'column_marble', 0, 0, rx * 1.02, 28, { s: 1.3 });
  for (const g of [[-rx * 1.0, 0], [rx * 1.0, 0]]) a.props.push({ t: 'arch_gate', x: g[0], z: g[1], r: Math.PI / 2, s: 1.4, v: 0 });
  for (let i = 0; i < 90; i++) { const t = (i / 90) * TAU, k = 1.12 + (i % 3) * 0.07; a.props.push({ t: 'crowd', x: Math.cos(t) * rx * k, z: Math.sin(t) * rz * k * 1.1, r: -t + Math.PI * 1.5, s: 1, v: i % 4 }); }
  a.hazards.push({ t: 'spikes', x: 0, z: 0, r: 3 });
  a.env.theme = 'roman';
};

R.nile = (a, rng, noise) => {
  a.biome = 'sand'; a.env = { time: 12.5, weather: 'clear', fog: 0.12, theme: 'egypt', wind: 0.25 };
  const W = a.worldSize();
  fillBase(a, (x, z) => {
    const river = Math.abs(z - Math.sin(x / 18) * 8) < 5.5 + Math.sin(x / 11) * 1.5;
    const bank = Math.abs(z - Math.sin(x / 18) * 8) < 9;
    return { h: river ? 7 : bank ? 11 : 13 + noise.fbm(x / 22, z / 22, 3) * 3, m: river ? MAT.mud : bank ? (noise.noise(x / 3, z / 3) > 0.1 ? MAT.grass : MAT.dirt) : MAT.sand };
  });
  a.water = 10;
  a.zones = { A: { x: -W * 0.3, z: -W * 0.22, w: W * 0.2, d: W * 0.22 }, B: { x: W * 0.3, z: W * 0.22, w: W * 0.2, d: W * 0.22 } };
  flattenZones(a, 1.0, () => 13);
  // ford
  for (let cz = 0; cz < a.size; cz++) for (let cx = 0; cx < a.size; cx++) { const x = a.worldX(cx), z = a.worldZ(cz); if (Math.abs(x) < 4.5 && a.getH(cx, cz) < 10) a.setH(cx, cz, 9); }
  scatter(a, rng, ['palm', 'palm', 'reeds', 'rock_small', 'bush'], Math.floor(a.size * 0.55));
  a.props.push({ t: 'obelisk', x: -W * 0.06, z: -W * 0.3, r: 0, s: 1.3, v: 0 }, { t: 'obelisk', x: W * 0.06, z: W * 0.3, r: 0, s: 1.3, v: 0 });
};

R.giza = (a, rng, noise) => {
  a.biome = 'sand'; a.env = { time: 15.5, weather: 'clear', fog: 0.18, theme: 'egypt', wind: 0.4 };
  const W = a.worldSize();
  fillBase(a, (x, z) => ({ h: 15 + noise.ridged(x / 24, z / 24, 3) * 6 + noise.fbm(x / 8, z / 8, 2) * 0.9, m: noise.noise(x / 9, z / 9) > 0.55 ? MAT.sandstone : MAT.sand }));
  setZones(a); flattenZones(a, 1.2, () => 15);
  a.props.push({ t: 'pyramid', x: 0, z: -W * 0.3, r: 0, s: 1.6, v: 0 }, { t: 'pyramid', x: W * 0.05, z: W * 0.3, r: 0, s: 1.1, v: 0 }, { t: 'sphinx_statue', x: -W * 0.02, z: W * 0.22, r: Math.PI, s: 1.2, v: 0 });
  scatter(a, rng, ['palm', 'rock_small', 'obelisk', 'cactus', 'bones'], Math.floor(a.size * 0.25));
  clearProps(a, 0, -W * 0.3, 14); a.props.push({ t: 'pyramid', x: 0, z: -W * 0.3, r: 0, s: 1.6, v: 0 });
};

R.persepolis = (a, rng, noise) => {
  a.biome = 'marble'; a.env = { time: 11, weather: 'clear', fog: 0.15, theme: 'persian', wind: 0.2 };
  const W = a.worldSize();
  fillBase(a, (x, z) => ({ h: 18 + (Math.abs(x) < W * 0.3 && Math.abs(z) < W * 0.3 ? 3 : 0) + noise.fbm(x / 25, z / 25, 2) * 1.2, m: Math.abs(x) < W * 0.3 && Math.abs(z) < W * 0.3 ? MAT.marble : MAT.sand }));
  setZones(a, 0.25, 0.55, 0.18); flattenZones(a, 0.6, () => 21);
  for (const xx of [-0.08, 0.08]) for (let i = -3; i <= 3; i++) a.props.push({ t: 'column_marble', x: W * xx, z: i * 6.2, r: 0, s: 1.35, v: 0 });
  a.props.push({ t: 'throne', x: 0, z: -W * 0.34, r: 0, s: 1.3, v: 0 }, { t: 'statue_lion', x: -8, z: W * 0.28, r: Math.PI, s: 1.3, v: 0 }, { t: 'statue_lion', x: 8, z: W * 0.28, r: Math.PI, s: 1.3, v: 0 });
  scatter(a, rng, ['palm', 'bush', 'torch'], 24);
};

R.carthage = (a, rng, noise) => {
  a.biome = 'sand'; a.env = { time: 17, weather: 'clear', fog: 0.2, theme: 'carthage', wind: 0.5 };
  const W = a.worldSize();
  fillBase(a, (x, z) => { const shore = -x * 0.55 + z * 0.2 + noise.fbm(x / 20, z / 20, 3) * 5; return { h: clamp(14 + shore * 0.5, 4, 40), m: 14 + shore * 0.5 < 11 ? MAT.sand : (noise.noise(x / 7, z / 7) > 0.3 ? MAT.dirt : MAT.savanna) }; });
  a.water = 11;
  a.zones = { A: { x: -W * 0.05, z: -W * 0.28, w: W * 0.4, d: W * 0.2 }, B: { x: W * 0.05, z: W * 0.28, w: W * 0.4, d: W * 0.2 } };
  flattenZones(a, 1, (k) => 15);
  for (let i = 0; i < 6; i++) a.props.push({ t: 'ship', x: -W * 0.45 + rng.range(-3, 3), z: -W * 0.35 + i * W * 0.14, r: Math.PI / 2 + rng.range(-0.2, 0.2), s: 1.2, v: i % 3 });
  scatter(a, rng, ['crate', 'barrel', 'palm', 'rock_small', 'torch'], Math.floor(a.size * 0.3));
};

R.teutoburg = (a, rng, noise) => {
  a.biome = 'grass'; a.env = { time: 7, weather: 'fog', fog: 0.65, theme: 'barbarian', wind: 0.3 };
  fillBase(a, (x, z) => ({ h: 15 + noise.fbm(x / 18, z / 18, 4) * 6, m: noise.noise(x / 5, z / 5) > 0.3 ? MAT.moss : noise.noise(x / 7 + 9, z / 7) > 0.3 ? MAT.mud : MAT.grass }));
  setZones(a, 0.3, 0.6, 0.2); flattenZones(a);
  scatter(a, rng, ['tree_pine', 'tree_pine', 'tree_oak', 'tree_oak', 'tree_oak', 'bush', 'rock_small', 'log'], Math.floor(a.size * 2.6), { clusterNoise: (x, z) => noise.noise(x / 14, z / 14) + 0.25, minSlope: 4, scale: [0.9, 1.5] });
  a.props.push({ t: 'tent', x: -a.worldSize() * 0.38, z: -10, r: 0.5, s: 1.3, v: 0 }, { t: 'tent', x: a.worldSize() * 0.38, z: 12, r: 2.5, s: 1.3, v: 1 });
};

R.alpine = (a, rng, noise) => {
  a.biome = 'snow'; a.env = { time: 13, weather: 'snow', fog: 0.35, theme: 'carthage', wind: 0.6 };
  const W = a.worldSize();
  fillBase(a, (x, z) => { const mtn = noise.ridged(x / 26, z / 26, 4); const pass = Math.abs(z * 0.5 + noise.fbm(x / 30, z / 30) * 8); const open = smoothstep(W * 0.06, W * 0.24, pass); const hh = 18 + open * mtn * 55 + noise.fbm(x / 6, z / 6, 2) * 0.8; return { h: hh, m: hh > 44 ? MAT.stone : MAT.snow }; });
  setZones(a, 0.3, 0.3, 0.2); flattenZones(a, 1.2, () => 20);
  scatter(a, rng, ['tree_pine', 'rock_big', 'rock_small', 'bones'], Math.floor(a.size * 0.5), { minSlope: 5 });
};

R.olympus = (a, rng, noise) => {
  a.biome = 'marble'; a.env = { time: 16.5, weather: 'cloudy', fog: 0.12, theme: 'mythic', wind: 0.2 };
  const W = a.worldSize(), rad = W * 0.43;
  fillBase(a, (x, z) => { const d = Math.sqrt(x * x + z * z); const edge = 1 - smoothstep(rad * 0.92, rad, d); return { h: 30 * edge + 2 + noise.fbm(x / 20, z / 20, 2) * 0.5, m: edge > 0.9 ? MAT.marble : edge > 0.05 ? MAT.moss : MAT.snow }; });
  a.water = 0; setZones(a, 0.2, 0.5, 0.16); flattenZones(a, 0.8, () => 32);
  ring(a, rng, 'column_marble', 0, 0, W * 0.3, 14, { s: 1.5 });
  a.props.push({ t: 'temple', x: 0, z: -W * 0.28, r: 0, s: 1.8, v: 0 }, { t: 'statue_zeus', x: 0, z: W * 0.26, r: Math.PI, s: 1.8, v: 0 }, { t: 'cloud_island', x: -W * 0.45, z: W * 0.4, r: 0, s: 2, v: 0 });
  scatter(a, rng, ['torch', 'column_broken', 'bush'], 20);
};

R.troy = (a, rng, noise) => {
  a.biome = 'sand'; a.env = { time: 18, weather: 'clear', fog: 0.25, theme: 'greek', wind: 0.35 };
  const W = a.worldSize();
  fillBase(a, (x, z) => { const gap = Math.abs(z) < 6; const up = gap ? smoothstep(W * 0.1, W * 0.2, x) : (x > W * 0.12 ? 1 : 0); return { h: 14 + up * 7 + noise.fbm(x / 22, z / 22, 3) * 1.2, m: up > 0.5 ? MAT.cobble : (noise.noise(x / 6, z / 6) > 0.3 ? MAT.dirt : MAT.sand) }; });
  a.zones = { A: { x: -W * 0.3, z: 0, w: W * 0.2, d: W * 0.6 }, B: { x: W * 0.3, z: 0, w: W * 0.16, d: W * 0.5 } };
  flattenZones(a, 1, (k) => (k === 'A' ? 14 : 21));
  line(a, 'wall_stone', W * 0.1, -W * 0.33, W * 0.1, -3.6, 1.9, { rot: Math.PI / 2, s: 1.3 });
  line(a, 'wall_stone', W * 0.1, 3.6, W * 0.1, W * 0.33, 1.9, { rot: Math.PI / 2, s: 1.3 });
  a.props.push({ t: 'tower', x: W * 0.1, z: -W * 0.33, r: 0, s: 1.4, v: 0 }, { t: 'tower', x: W * 0.1, z: W * 0.33, r: 0, s: 1.4, v: 0 }, { t: 'tower', x: W * 0.1, z: -5, r: 0, s: 1.3, v: 0 }, { t: 'tower', x: W * 0.1, z: 5, r: 0, s: 1.3, v: 0 }, { t: 'arch_gate', x: W * 0.1, z: 0, r: Math.PI / 2, s: 1.2, v: 0 }, { t: 'gate_door', x: W * 0.1, z: -2, r: Math.PI / 2, s: 0.9, v: 0 }, { t: 'gate_door', x: W * 0.1, z: 2, r: Math.PI / 2, s: 0.9, v: 0 });
  scatter(a, rng, ['rock_small', 'bush', 'crate', 'torch'], 30);
};

R.styx = (a, rng, noise) => {
  a.biome = 'ash'; a.env = { time: 21, weather: 'fog', fog: 0.5, theme: 'mythic', wind: 0.1 };
  const W = a.worldSize();
  fillBase(a, (x, z) => { const riv = Math.abs(x + Math.sin(z / 13) * 6) < 4; return { h: riv ? 6 : 14 + noise.ridged(x / 14, z / 14, 3) * 8, m: riv ? MAT.lava : noise.noise(x / 6, z / 6) > 0.3 ? MAT.stone : MAT.ash }; });
  a.water = 9; a.lava = true;
  a.zones = { A: { x: -W * 0.3, z: 0, w: W * 0.2, d: W * 0.6 }, B: { x: W * 0.3, z: 0, w: W * 0.2, d: W * 0.6 } };
  flattenZones(a, 1, () => 16);
  // two bone bridges over the lava
  for (const bz of [-8, 8]) for (let cx = 0; cx < a.size; cx++) for (let cz = 0; cz < a.size; cz++) { const x = a.worldX(cx), z = a.worldZ(cz); const rx = x + Math.sin(z / 13) * 6; if (Math.abs(z - bz) < 1.6 && Math.abs(rx) < 16) { a.setH(cx, cz, 14); if (Math.abs(rx) < 5) a.setM(cx, cz, MAT.planks); } }
  scatter(a, rng, ['bones', 'rock_big', 'torch', 'tree_dead', 'skull_pile'], Math.floor(a.size * 0.5), { avoidWater: true });
  a.hazards.push({ t: 'geyser', x: -W * 0.1, z: -W * 0.2, r: 3 }, { t: 'geyser', x: W * 0.1, z: W * 0.2, r: 3 });
};

R.cyclops = (a, rng, noise) => {
  a.biome = 'grass'; a.env = { time: 8.5, weather: 'clear', fog: 0.2, theme: 'mythic', wind: 0.4 };
  const W = a.worldSize(), rad = W * 0.42;
  fillBase(a, (x, z) => { const d = Math.sqrt(x * x + z * z) + noise.fbm(x / 12, z / 12, 3) * 6; const land = 1 - smoothstep(rad * 0.82, rad, d); return { h: 8 + land * (8 + noise.fbm(x / 16, z / 16, 3) * 6) + (d < rad * 0.25 ? 7 : 0), m: land < 0.18 ? MAT.sand : d < rad * 0.25 ? MAT.stone : MAT.grass }; });
  a.water = 9; setZones(a, 0.27, 0.45, 0.18); flattenZones(a, 1, () => 14);
  scatter(a, rng, ['tree_olive', 'rock_big', 'palm', 'bones', 'bush', 'goat_pen'], Math.floor(a.size * 0.5));
  a.props.push({ t: 'cave_mouth', x: 0, z: -W * 0.08, r: 0, s: 1.6, v: 0 });
};

R.oasis = (a, rng, noise) => {
  a.biome = 'sand'; a.env = { time: 12, weather: 'clear', fog: 0.1, theme: 'egypt', wind: 0.3 };
  const W = a.worldSize();
  fillBase(a, (x, z) => { const d = Math.sqrt(x * x + z * z); return { h: d < 9 ? 8 : 13 + noise.ridged(x / 12, z / 12, 3) * 5 + noise.fbm(x / 5, z / 5, 2), m: d < 11 ? MAT.grass : MAT.sand }; });
  a.water = 10; setZones(a, 0.3, 0.4, 0.14); flattenZones(a, 1, () => 14);
  ring(a, rng, 'palm', 0, 0, 12.5, 10, { s: 1.3 });
  scatter(a, rng, ['cactus', 'rock_small', 'bones', 'bush'], 36);
};

R.arenalab = (a) => {
  a.biome = 'grass'; a.env = { time: 12, weather: 'clear', fog: 0.15, theme: 'greek', wind: 0.2 };
  fillBase(a, () => ({ h: 16, m: MAT.grass }));
  setZones(a);
};

R.random = (a, rng, noise) => {
  const picks = ['marathon', 'nile', 'giza', 'teutoburg', 'alpine', 'oasis', 'cyclops', 'persepolis'];
  const pick = picks[rng.int(0, picks.length - 1)];
  R[pick](a, rng, noise);
  a.name = 'Random: ' + pick;
};

export const RECIPES = Object.keys(R);

/** Build an arena from a recipe. size: cells per side (64..256) or 'small'|'medium'|'large'. */
export function generateArena(recipe = 'marathon', size = 'medium', seed = 1) {
  const n = typeof size === 'number' ? size : (SIZES[size] || SIZES.medium);
  const a = new Arena(n);
  a.seed = seed >>> 0;
  const rng = new RNG(a.seed * 7919 + 13), noise = new Noise2D(a.seed + 101);
  if (!R[recipe]) throw new Error('Unknown arena recipe ' + recipe);
  a.name = recipe.charAt(0).toUpperCase() + recipe.slice(1);
  R[recipe](a, rng, noise);
  // never leave zones underwater
  for (const k of ['A', 'B']) { const z = a.zones[k]; const cx = a.cx(z.x), cz = a.cz(z.z); if (a.water > 0 && a.getH(cx, cz) <= a.water) { const t = a.water + 2; for (let j = -8; j <= 8; j++) for (let i = -8; i <= 8; i++) a.setH(cx + Math.round(i * z.w / 18), cz + Math.round(j * z.d / 18), t); } }
  return a;
}
