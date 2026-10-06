// Arena generator gate (W1, W2 inputs, W3/W8 inputs): every recipe x size x seed is deterministic, keeps both zones dry, flat and free,
// has a path between the zones with the SIM's nav semantics (catalog radius x scale, hard vs soft blockers), and its props obey the rules
// the look gate checks by eye: known ids, inside the arena, never in lava/water, no blocking prop inside a zone, no floating or buried props.
import assert from 'node:assert';
import { generateArena, RECIPES } from '../../src/world/gen.js';
import { NavGrid, FlowField } from '../../src/world/nav.js';
import { PROP_CATALOG } from '../../src/content/era_ancient/props/catalog.js';
import { MATERIALS, HSTEP } from '../../src/world/arena.js';

const quick = process.argv.includes('--quick');
const SIZES = quick ? ['medium'] : ['small', 'medium', 'large'];
const full = process.argv.includes('--full');
const SEEDS = quick ? [3] : full ? [1, 2, 3, 7, 11, 13, 21] : [1, 3];
const FLOAT_OK = new Set(['ship', 'cloud_island', 'reeds']);          // allowed on/over water
let fails = 0;
const fail = (msg) => { fails++; if (fails < (+process.env.SHOWFAILS || 60)) console.error('FAIL', msg); };
const hashArena = (a) => { let h = 2166136261 >>> 0; for (const v of a.h) { h ^= v; h = Math.imul(h, 16777619) >>> 0; } for (const v of a.m) { h ^= v + 77; h = Math.imul(h, 16777619) >>> 0; } h ^= a.props.length * 31 + a.hazards.length; const s = JSON.stringify([a.props, a.zones, a.hazards, a.env, a.water, a.lava]); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const navOf = (a) => {
  const nav = new NavGrid(a);
  // exactly what sim/world.js hands to the nav grid: radius = catalog r x scale, hp = catalog hp x scale (Infinity = hard blocker)
  nav.applyProps(a.props.map((p) => { const i = PROP_CATALOG[p.t]; return { x: p.x, z: p.z, radius: i.r * p.s, blocks: i.blocks, hp: i.hp === Infinity ? Infinity : i.hp * p.s }; }), a.hazards);
  return nav;
};
let n = 0;
for (const recipe of RECIPES) for (const size of SIZES) for (const seed of SEEDS) {
  if (recipe === 'random' && size !== 'medium' && seed > 3) continue;
  const tag = `${recipe}/${size}/${seed}`;
  const a = generateArena(recipe, size, seed), b = generateArena(recipe, size, seed);
  n++;
  if (hashArena(a) !== hashArena(b)) fail(tag + ': not deterministic');
  const W = a.worldSize(), half = W / 2;
  if (a.props.length > 1500) fail(tag + ': more than 1500 props (' + a.props.length + ')');
  if (a.hazards.length > 60) fail(tag + ': too many hazards');
  // zones: inside the arena, dry, flat enough, walkable
  const nav = navOf(a);
  for (const k of ['A', 'B']) {
    const z = a.zones[k];
    if (z.x - z.w / 2 < -half || z.x + z.w / 2 > half || z.z - z.d / 2 < -half || z.z + z.d / 2 > half) fail(`${tag}: zone ${k} leaves the arena`);
    let wet = 0, cells = 0, mn = 999, mx = 0, free = 0, nav0 = 0;
    for (let cz = a.cz(z.z - z.d / 2); cz <= a.cz(z.z + z.d / 2); cz++) for (let cx = a.cx(z.x - z.w / 2); cx <= a.cx(z.x + z.w / 2); cx++) {
      cells++; const h = a.getH(cx, cz); if (a.water > 0 && h <= a.water) wet++; mn = Math.min(mn, h); mx = Math.max(mx, h);
      if (MATERIALS[a.getM(cx, cz)].hazard === 'lava') wet++;
    }
    for (let zz = z.z - z.d / 2 + 0.5; zz < z.z + z.d / 2; zz += 1) for (let xx = z.x - z.w / 2 + 0.5; xx < z.x + z.w / 2; xx += 1) { nav0++; if (nav.walkable(xx, zz)) free++; }
    if (wet) fail(`${tag}: zone ${k} has ${wet} wet/lava cells`);
    if (mx - mn > 3) fail(`${tag}: zone ${k} is not flat (${mn}..${mx} steps)`);
    if (free / nav0 < 0.93) fail(`${tag}: zone ${k} only ${(100 * free / nav0).toFixed(0)}% walkable`);
  }
  // path A -> B with radius 0.45 (nav cell 1 u, the sim's own blockers)
  if (recipe !== 'arenalab' || true) {
    const ff = new FlowField(nav), src = new Int32Array(1), zb = a.zones.B, za = a.zones.A;
    src[0] = nav.cx(zb.x) + nav.cz(zb.z) * nav.n; ff.compute(src, 1);
    const d = ff.distAt(za.x, za.z);
    if (!(d < 1e8)) fail(`${tag}: no path from zone A to zone B`);
    else if (d > Math.hypot(za.x - zb.x, za.z - zb.z) * 3.2 + 40) fail(`${tag}: path A->B is absurdly long (${d.toFixed(0)})`);
    // every walkable cell of both zones can reach the other zone
    for (const k of ['A', 'B']) {
      const z = a.zones[k]; let lost = 0, tot = 0;
      for (let zz = z.z - z.d / 2 + 0.5; zz < z.z + z.d / 2; zz += 2) for (let xx = z.x - z.w / 2 + 0.5; xx < z.x + z.w / 2; xx += 2) if (nav.walkable(xx, zz)) { tot++; if (!(ff.distAt(xx, zz) < 1e8)) lost++; }
      if (lost) fail(`${tag}: ${lost}/${tot} walkable cells of zone ${k} cannot reach the other side`);
    }
  }
  // props
  const hard = [];
  for (const p of a.props) {
    const info = PROP_CATALOG[p.t];
    if (!info) { fail(`${tag}: unknown prop ${p.t}`); continue; }
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z) || Math.abs(p.x) > half || Math.abs(p.z) > half) fail(`${tag}: ${p.t} outside the arena`);
    if (p.s < 0.3 || p.s > 4) fail(`${tag}: ${p.t} scale ${p.s}`);
    const cx = a.cx(p.x), cz = a.cz(p.z), h = a.getH(cx, cz), m = MATERIALS[a.getM(cx, cz)];
    if (m.hazard === 'lava') fail(`${tag}: ${p.t} on lava`);
    if (a.water > 0 && h < a.water && !FLOAT_OK.has(p.t)) fail(`${tag}: ${p.t} under water at ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
    if (p.t === 'ship' && !(a.water > 0 && h < a.water - 2)) fail(`${tag}: a ship is not afloat (ground ${h} vs water ${a.water})`);
    if (info.r > 0 && info.blocks !== 'none') {
      for (const k of ['A', 'B']) { const z = a.zones[k]; if (Math.abs(p.x - z.x) < z.w / 2 + 0.2 && Math.abs(p.z - z.z) < z.d / 2 + 0.2) fail(`${tag}: blocking ${p.t} inside zone ${k} at ${p.x.toFixed(1)},${p.z.toFixed(1)}`); }
      hard.push(p);
    }
    // no floating / buried props: ground under the footprint (the renderer seats on the lowest point) may differ by at most a model-sized skirt
    const fp = Math.max(0.3, info.r * p.s * 0.9);
    const hs = [h, a.getH(a.cx(p.x + fp), cz), a.getH(a.cx(p.x - fp), cz), a.getH(cx, a.cz(p.z + fp)), a.getH(cx, a.cz(p.z - fp))];
    const spread = (Math.max(...hs) - Math.min(...hs)) * HSTEP, big = info.r * p.s > 2.5;
    if (!FLOAT_OK.has(p.t) && spread > (big ? 3.2 : 1.6)) fail(`${tag}: ${p.t} on a ${spread.toFixed(1)} u slope at ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
  }
  // scatter props (trees/rocks) never overlap each other
  const scat = hard.filter((p) => /^(tree_|rock_|palm|cactus|log|crate|barrel)/.test(p.t));
  for (let i = 0; i < scat.length; i++) for (let j = i + 1; j < scat.length; j++) {
    const p = scat[i], q = scat[j], d = Math.hypot(p.x - q.x, p.z - q.z), need = (PROP_CATALOG[p.t].r * p.s + PROP_CATALOG[q.t].r * q.s) * 0.8;
    if (d < need) { fail(`${tag}: ${p.t} and ${q.t} overlap (${d.toFixed(2)} < ${need.toFixed(2)})`); break; }
  }
  // per-recipe landmarks and the things the campaign / criteria rely on
  const count = (t) => a.props.filter((p) => p.t === t).length;
  if (recipe === 'colosseum') {
    if (count('crowd') !== 90) fail(tag + ': colosseum needs 90 spectators, has ' + count('crowd'));
    if (!a.hazards.some((h) => h.t === 'spikes')) fail(tag + ': colosseum spikes hazard');
    if (count('arch_gate') < 2) fail(tag + ': colosseum gates');
    for (const p of a.props) if (p.t === 'crowd') { const h0 = a.cellHeight(p.x, p.z); if (h0 < 9) fail(tag + ': spectator is not on a seat row'); }
  }
  if (recipe === 'troy') {
    if (count('gate_door') !== 2) fail(tag + ': troy needs exactly 2 gate doors, has ' + count('gate_door'));
    if (count('arch_gate') < 1 || count('tower') < 4 || count('wall_stone') < 10) fail(tag + ': troy walls/towers/gate');
    // the ramp through the gate gap: ground rises from the plain to the plateau along z ~ 0
    const lo = a.cellHeight(-W * 0.1, 0), hi = a.cellHeight(W * 0.2, 0);
    if (hi - lo < 2.5) fail(tag + `: troy ramp too low (${lo} -> ${hi})`);
    for (const d of a.props.filter((p) => p.t === 'gate_door')) if (Math.abs(d.z) > 3.2) fail(tag + ': a gate door is off the gate');
  }
  if (recipe === 'thermopylae') {
    if (count('wall_stone') < 4 || count('tower') < 2) fail(tag + ': thermopylae wall');
    for (const p of a.props) if ((p.t === 'wall_stone') && Math.abs(p.z) < 4.0) fail(tag + ': a wall closes the 8 u gap');
  }
  if (recipe === 'styx') {
    if (!a.lava || a.water <= 0) fail(tag + ': styx needs lava');
    if (!a.hazards.some((h) => h.t === 'geyser')) fail(tag + ': styx geysers');
  }
  if (recipe === 'olympus') {
    for (const t of ['temple', 'statue_zeus', 'cloud_island', 'column_marble']) if (!count(t)) fail(`${tag}: olympus needs ${t}`);
  }
  if (recipe === 'cyclops' && !count('cave_mouth')) fail(tag + ': cyclops cave');
  if (recipe === 'carthage' && count('ship') < 3) fail(tag + ': carthage ships');
  if (recipe === 'giza' && count('pyramid') < 2) fail(tag + ': giza pyramids');
  if (recipe === 'persepolis' && (!count('throne') || count('column_marble') < 20)) fail(tag + ': persepolis throne/columns');
  // symmetric arenas: the heightfield and prop multiset are symmetric under the declared mapping (S22 fairness input)
  const SYM = { marathon: 'rot', oasis: 'rot', persepolis: 'mx', olympus: 'mx', cyclops: 'mx', colosseum: 'mxz', arenalab: 'rot' };
  if (SYM[recipe]) {
    const mode = SYM[recipe], N = a.size;
    let bad = 0;
    for (let cz = 0; cz < N; cz++) for (let cx = 0; cx < N; cx++) {
      const ox = mode === 'rot' ? N - 1 - cx : N - 1 - cx, oz = mode === 'rot' ? N - 1 - cz : cz;
      if (a.getH(cx, cz) !== a.getH(ox, oz)) bad++;
    }
    if (bad > N * N * 0.004) fail(`${tag}: height field is not ${mode}-symmetric (${bad} cells)`);
    const key = (p, flip) => { const x = flip ? (mode === 'rot' ? -p.x : -p.x) : p.x, z = flip ? (mode === 'rot' ? -p.z : p.z) : p.z; return p.t + ':' + x.toFixed(1) + ':' + z.toFixed(1); };
    const set = new Set(a.props.map((p) => key(p, false)));
    let miss = 0; for (const p of a.props) if (!set.has(key(p, true))) miss++;
    if (miss > a.props.length * 0.04) fail(`${tag}: props are not ${mode}-symmetric (${miss}/${a.props.length} unmatched)`);
  }
}
if (fails) { console.error(`${fails} arena check(s) failed`); process.exit(1); }
console.log(`arenas OK: ${n} recipe x size x seed combinations (${RECIPES.length} recipes, sizes ${SIZES.join('/')}, seeds ${SEEDS.join(',')})`);
