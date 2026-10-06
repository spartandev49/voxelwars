// Main-hand melee/polearm/staff weapons (category 'mains'). Weapon grid 9x48x9, grip voxel (4,10,4), shaft/blade along +Y,
// cutting edge toward +Z, flat of the blade facing +/-X. build(ctx) uses ctx.len (voxels from the grip to the tip, already clamped by
// the compiler's weapon length rule) and ctx.back (voxels behind the grip). meta: {style, len, back, rest:[rx,0,0], twoHanded, grip, minLen}.
//   rest: carry orientation relative to the forearm with the arm hanging (rx radians about +X: 0 = shaft straight up, PI/2 = forward, 2.44 = down-forward).
import { registerParts } from './_registry.js';
import { V, T, G, shade, mixRGB, B, Bs, X, P, E, hash3, W, gripWrap, metalAt, NONE, newGrid, emblem, sprite } from './_kit.js';

export const wood = (y, k = 0, base = 0x8a5a2e) => V(shade(base, 0.88 + 0.22 * hash3(4, y, 4, k)));
export const edgeCol = (ctx, role) => V(ctx.m[role === 'edge' ? 4 : role === 'spine' ? 1 : role === 'rib' ? 2 : 3]);
const R_CARRY = 2.44;      // blades hang forward-down like the retargeted sword idle (140 deg)
const R_UPRIGHT = 0.3;     // polearms stand upright leaning forward

/** blade plate in the YZ plane (x = 4 or 3..4): half-width hw(i, n) per row, edge at +Z. */
export function blade(g, ctx, y0, y1, hw, thick = 1) {
  const n = y1 - y0 + 1;
  for (let i = 0; i < n; i++) {
    const y = y0 + i, w = Math.max(0, Math.round(hw(i, n)));
    for (let z = 4 - w; z <= 4 + w; z++) {
      const role = z === 4 + w ? 'edge' : (z === 4 - w && w > 0 ? 'spine' : (z === 4 && w > 0 ? 'rib' : 'mid'));
      const c = edgeCol(ctx, role);
      B(g, thick === 1 ? 4 : 3, y, z, 4, y, z, c);
    }
  }
}
/** pommel + wrapped grip + small crossguard; returns the y of the first blade row */
function hilt(g, ctx, guardW = 1, pommel = true) {
  gripWrap(g, ctx, 8, 11);
  if (pommel) { B(g, 3, 6, 3, 5, 7, 5, V(ctx.m[2])); P(g, 4, 5, 4, V(ctx.m[1])); }
  B(g, 4 - guardW, 12, 3, 4 + guardW, 12, 5, V(ctx.m[2]));
  return 13;
}
function haft(g, ctx, y0, y1, thick = 1, base = 0x8a5a2e) {
  for (let y = y0; y <= y1; y++) B(g, thick === 1 ? 4 : 3, y, thick === 1 ? 4 : 3, 4, y, 4, wood(y, 1, base));
}
const top = (ctx) => 9 + ctx.len;       // index of the tip voxel
const MELEE = { kind: 'melee' };

export const PARTS = { mains: {} };
const M = PARTS.mains;
M.none = { name: 'Bare hands', build: () => null, meta: { style: 'bash', len: 0, rest: [0, 0, 0], grip: [4, 10, 4], kind: 'none' } };

// ------------------------------------------------------------------------------------------------ spears
function spear(name, o) {
  return {
    name, meta: { style: o.style || 'thrust', len: o.len, back: o.back ?? 8, rest: [o.rest ?? R_UPRIGHT, 0, 0], twoHanded: !!o.two, grip: [4, 10, 4], minLen: 12, kind: 'melee' },
    build(ctx) {
      const g = newGrid('weapon');
      const yt = top(ctx), y0 = 10 - ctx.back, hl = o.headLen ?? 6;
      haft(g, ctx, y0 + 2, yt - hl, o.thick ? 2 : 1, o.wood);
      B(g, 4, y0, 4, 4, y0 + 1, 4, V(ctx.m[1]));                                    // iron butt spike
      B(g, 3, y0 + 2, 3, 4, y0 + 2, 4, V(ctx.m[2]));
      gripWrap(g, ctx, 8, 11);
      if (o.guard) { B(g, 2, 12, 2, 6, 12, 6, (x, y, z) => ((x - 4) * (x - 4) + (z - 4) * (z - 4) <= 5 ? V(ctx.m[1]) : 0)); }
      // leaf-shaped head
      const prof = o.head || [1, 2, 2, 2, 1, 1, 0];
      B(g, 3, yt - hl, 3, 5, yt - hl, 5, V(ctx.m[2]));                              // socket collar
      for (let i = 0; i < Math.min(hl, prof.length); i++) {
        const y = yt - hl + 1 + i, hw = prof[i];
        for (let z = 4 - hw; z <= 4 + hw; z++) B(g, 4, y, z, 4, y, z, z === 4 + hw && hw > 0 ? edgeCol(ctx, 'edge') : (z === 4 ? edgeCol(ctx, 'rib') : edgeCol(ctx, 'mid')));
      }
      if (o.pomegranate) { E(g, 4, y0 + 1, 4, 1.6, 1.6, 1.6, V(0xe0b82e)); B(g, 4, y0 + 3, 4, 4, y0 + 3, 4, V(0xe0b82e)); }
      if (o.tassel) { B(g, 4, yt - hl - 1, 5, 4, yt - hl - 1, 5, ctx.t(1)); B(g, 4, yt - hl - 2, 5, 4, yt - hl - 3, 5, ctx.t(0.9)); }
      return g;
    },
  };
}
M.dory = spear('Dory (hoplite spear)', { len: 21, headLen: 7, head: [1, 2, 2, 2, 1, 1, 0], tassel: false });
M.spear = spear('Spear', { len: 22, headLen: 7, head: [1, 1, 2, 2, 1, 0, 0] });
M.short_spear = spear('Short spear', { len: 15, headLen: 6, head: [1, 2, 2, 1, 1, 0] });
M.sarissa = spear('Sarissa (pike)', { len: 26, headLen: 5, head: [1, 1, 1, 0, 0], two: true, style: 'pike', thick: true });
M.spear_pomegranate = spear('Spear with pomegranate butt', { len: 22, headLen: 7, head: [1, 2, 2, 2, 1, 1, 0], pomegranate: true });
M.xyston = spear('Xyston (cavalry lance)', { len: 26, headLen: 6, head: [1, 2, 2, 1, 1, 0], guard: true, back: 8 });
M.kontos = spear('Kontos (great lance)', { len: 26, headLen: 6, head: [1, 1, 1, 1, 0, 0], guard: true, two: true, style: 'pike', thick: true });
M.javelin = {
  name: 'Javelin', meta: { style: 'throw', len: 17, back: 6, rest: [R_UPRIGHT, 0, 0], grip: [4, 10, 4], minLen: 10, kind: 'melee' },
  build(ctx) {
    const g = newGrid('weapon'), yt = top(ctx), y0 = 10 - ctx.back;
    haft(g, ctx, y0, yt - 4, 1, 0xb08850);
    gripWrap(g, ctx, 8, 10);
    B(g, 4, y0, 3, 4, y0 + 1, 3, V(0xf0ece0)); B(g, 4, y0, 5, 4, y0 + 1, 5, V(0xf0ece0));       // fletching
    for (let i = 0; i < 4; i++) { const y = yt - 3 + i, hw = [1, 1, 1, 0][i]; for (let z = 4 - hw; z <= 4 + hw; z++) B(g, 4, y, z, 4, y, z, edgeCol(ctx, z === 4 + hw && hw ? 'edge' : 'mid')); }
    return g;
  },
};
M.pilum = {
  name: 'Pilum', meta: { style: 'throw', len: 22, back: 8, rest: [R_UPRIGHT, 0, 0], grip: [4, 10, 4], minLen: 12, kind: 'melee' },
  build(ctx) {
    const g = newGrid('weapon'), yt = top(ctx), y0 = 10 - ctx.back;
    haft(g, ctx, y0, 9 + Math.round(ctx.len * 0.55), 1, 0x8a5a2e);
    gripWrap(g, ctx, 8, 11);
    for (let y = 10 + Math.round(ctx.len * 0.55); y <= yt - 3; y++) B(g, 4, y, 4, 4, y, 4, V(ctx.m[y % 2 ? 2 : 1]));    // iron shank
    B(g, 3, 10 + Math.round(ctx.len * 0.55) - 1, 3, 5, 10 + Math.round(ctx.len * 0.55), 5, V(ctx.m[0]));             // socket
    B(g, 4, yt - 2, 3, 4, yt - 2, 5, edgeCol(ctx, 'mid')); B(g, 4, yt - 1, 3, 4, yt - 1, 4, edgeCol(ctx, 'edge')); P(g, 4, yt, 4, edgeCol(ctx, 'edge'));
    return g;
  },
};

// ------------------------------------------------------------------------------------------------ swords
function sword(name, o) {
  return {
    name, meta: { style: o.style || 'slash', len: o.len, back: 5, rest: [R_CARRY, 0, 0], grip: [4, 10, 4], minLen: 8, kind: 'melee' },
    build(ctx) {
      const g = newGrid('weapon'), yt = top(ctx);
      const y0 = hilt(g, ctx, o.guard ?? 1);
      blade(g, ctx, y0, yt, (i, n) => o.w(i / n, i, n));
      return g;
    },
  };
}
M.xiphos = sword('Xiphos', { len: 14, w: (t) => (t < 0.08 ? 1 : t < 0.55 ? 1 + (t > 0.2 ? 1 : 0) : t < 0.9 ? 1 : 0), guard: 1 });
M.gladius = sword('Gladius', { len: 13, w: (t, i, n) => (i >= n - 2 ? (i === n - 1 ? 0 : 1) : 1), guard: 1 });
M.spatha = sword('Spatha', { len: 19, w: (t, i, n) => (i >= n - 2 ? (i === n - 1 ? 0 : 1) : 1), guard: 2 });
M.scimitar = {
  name: 'Scimitar', meta: { style: 'slash', len: 17, back: 5, rest: [R_CARRY, 0, 0], grip: [4, 10, 4], minLen: 8, kind: 'melee' },
  build(ctx) {
    const g = newGrid('weapon'), yt = top(ctx), y0 = hilt(g, ctx, 1);
    const n = yt - y0 + 1;
    for (let i = 0; i < n; i++) {
      const y = y0 + i, t = i / n, zc = 4 + Math.round(2.4 * t * t * 1.4), w = i > n - 3 ? 0 : 1;
      for (let dz = -w; dz <= w; dz++) B(g, 4, y, zc + dz, 4, y, zc + dz, edgeCol(ctx, dz === w && w ? 'edge' : (dz === 0 && w ? 'rib' : 'mid')));
    }
    return g;
  },
};
M.khopesh = {
  name: 'Khopesh', meta: { style: 'slash', len: 15, back: 5, rest: [R_CARRY, 0, 0], grip: [4, 10, 4], minLen: 9, kind: 'melee' },
  build(ctx) {
    const g = newGrid('weapon'), yt = top(ctx), y0 = hilt(g, ctx, 1);
    const n = yt - y0 + 1;
    for (let i = 0; i < n; i++) {
      const y = y0 + i, t = i / n, straight = 0.35;
      const zc = t < straight ? 4 : 4 + Math.round(3.6 * Math.pow((t - straight) / (1 - straight), 1.35));
      const w = t > 0.8 ? 1 : 2;
      for (let dz = 0; dz < w; dz++) B(g, 4, y, zc + dz, 4, y, zc + dz, edgeCol(ctx, dz === w - 1 ? 'edge' : 'mid'));
      if (t > 0.35 && t < 0.99) B(g, 4, y, zc - 1, 4, y, zc - 1, edgeCol(ctx, 'spine'));
    }
    const yh = yt, zt = 4 + 4; B(g, 4, yh, zt, 4, yh, zt, edgeCol(ctx, 'edge'));
    return g;
  },
};
M.khopesh_spear = {
  name: 'Khopesh-spear', meta: { style: 'thrust', len: 25, back: 8, rest: [R_UPRIGHT, 0, 0], grip: [4, 10, 4], minLen: 14, kind: 'melee' },
  build(ctx) {
    const g = newGrid('weapon'), yt = top(ctx), y0 = 10 - ctx.back;
    haft(g, ctx, y0, yt - 9, 1, 0x6a4a2a);
    gripWrap(g, ctx, 8, 11);
    B(g, 3, yt - 9, 3, 5, yt - 8, 5, V(ctx.m[2]));
    const n = 9;
    for (let i = 0; i < n; i++) {
      const y = yt - 8 + i, t = i / n, zc = i < 4 ? 4 : 4 + Math.round(3 * Math.pow((t - 0.4) / 0.6, 1.3));
      for (let dz = 0; dz < 2; dz++) B(g, 4, y, zc + dz, 4, y, zc + dz, edgeCol(ctx, dz ? 'edge' : 'mid'));
    }
    P(g, 4, yt, 4, edgeCol(ctx, 'edge')); P(g, 4, yt - 1, 3, edgeCol(ctx, 'mid'));
    return g;
  },
};

// ------------------------------------------------------------------------------------------------ axes, maces, hammers, clubs
function axeHead(g, ctx, yt, o) {
  // o: {bit (z extent forward), tall (rows at the edge), back (spike length), double, two}
  const th = o.thick === 2 ? [3, 4] : [4, 4];
  const rows = o.rows;   // array of [zFront] per row from top (dy=0) downward, bit extends z=5..zFront
  for (let i = 0; i < rows.length; i++) {
    const y = yt - i, zf = rows[i];
    for (let z = 4; z <= zf; z++) B(g, th[0], y, z, th[1], y, z, edgeCol(ctx, z === zf ? 'edge' : (z === 4 ? 'rib' : 'mid')));
    if (o.double) for (let z = 4 - (zf - 4); z < 4; z++) B(g, th[0], y, z, th[1], y, z, edgeCol(ctx, z === 4 - (zf - 4) ? 'edge' : 'mid'));
  }
  if (!o.double && o.spike) { for (let k = 0; k < o.spike; k++) B(g, 4, yt - 2, 3 - k, 4, yt - 2, 3 - k, edgeCol(ctx, k === o.spike - 1 ? 'edge' : 'mid')); }
  B(g, 4, yt + 1, 4, 4, yt + 1, 4, edgeCol(ctx, 'edge'));
}
function axe(name, o) {
  return {
    name, meta: { style: o.style || 'overhead', len: o.len, back: 5, rest: [R_CARRY, 0, 0], twoHanded: !!o.two, grip: [4, 10, 4], minLen: 10, kind: 'melee' },
    build(ctx) {
      const g = newGrid('weapon'), yt = top(ctx) - 1;
      haft(g, ctx, 5, yt, o.two ? 2 : 1);
      gripWrap(g, ctx, 8, 11);
      if (o.two) { B(g, 3, 15, 3, 5, 18, 5, (x, y, z) => ctx.t(0.85 + 0.15 * (y % 2))); B(g, 3, 22, 3, 5, 23, 5, ctx.t(0.9)); }
      axeHead(g, ctx, yt, o);
      if (o.two) { for (let k = 0; k < 5; k++) B(g, 4, yt - 4 - k, 2, 4, yt - 4 - k, 2, ctx.t(0.9 - 0.04 * k)); }
      B(g, 3, 5, 3, 5, 5, 5, V(ctx.m[1]));
      return g;
    },
  };
}
M.axe = axe('Axe', { len: 14, rows: [7, 8, 8, 8, 7, 6], spike: 2, style: 'overhead' });
M.double_axe = axe('Double axe', { len: 15, rows: [7, 8, 8, 8, 8, 7], double: true, style: 'overhead' });
M.greataxe = axe('Great axe', { len: 25, rows: [7, 8, 8, 8, 8, 8, 7, 6], thick: 2, two: true, spike: 3, style: 'overhead' });
M.greataxe_double = axe('Double-bit great axe', { len: 26, rows: [7, 8, 8, 8, 8, 8, 8, 7], thick: 2, two: true, double: true, style: 'overhead' });

M.mace = {
  name: 'Mace', meta: { style: 'bash', len: 14, back: 5, rest: [R_CARRY, 0, 0], grip: [4, 10, 4], minLen: 9, kind: 'melee' },
  build(ctx) {
    const g = newGrid('weapon'), yt = top(ctx);
    haft(g, ctx, 5, yt - 5, 1);
    gripWrap(g, ctx, 8, 11);
    B(g, 3, yt - 4, 3, 5, yt - 1, 5, (x, y, z) => V(ctx.m[(y + x) % 2 ? 2 : 3]));
    Bs(g, 2, yt - 3, 4, 2, yt - 2, 4, V(ctx.m[3])); B(g, 4, yt - 3, 2, 4, yt - 2, 2, V(ctx.m[3])); B(g, 4, yt - 3, 6, 4, yt - 2, 6, V(ctx.m[3]));
    B(g, 4, yt, 4, 4, yt, 4, V(ctx.m[4]));
    return g;
  },
};
M.hammer = {
  name: 'War hammer', meta: { style: 'bash', len: 14, back: 5, rest: [R_CARRY, 0, 0], grip: [4, 10, 4], minLen: 9, kind: 'melee' },
  build(ctx) {
    const g = newGrid('weapon'), yt = top(ctx);
    haft(g, ctx, 5, yt - 2, 1);
    gripWrap(g, ctx, 8, 11);
    B(g, 3, yt - 3, 3, 5, yt - 1, 7, (x, y, z) => V(ctx.m[z > 5 ? 3 : 2]));                  // striking head, face at +Z
    B(g, 4, yt - 2, 2, 4, yt - 2, 3, V(ctx.m[2])); P(g, 4, yt - 2, 1, V(ctx.m[4]));           // pick at the back
    B(g, 3, yt - 3, 7, 5, yt - 1, 7, V(ctx.m[4]));
    return g;
  },
};
function club(name, o) {
  return {
    name, meta: { style: o.style || 'overhead', len: o.len, back: 5, rest: [R_CARRY, 0, 0], twoHanded: !!o.two, grip: [4, 10, 4], minLen: 10, kind: 'melee' },
    build(ctx) {
      const g = newGrid('weapon'), yt = top(ctx);
      const wc = (y) => wood(y, 3, o.base || 0x7a4e26);
      B(g, 4, 5, 4, 4, 11, 4, (x, y) => wc(y));
      gripWrap(g, ctx, 8, 11);
      const h = o.head;                                   // head rows
      for (let y = 12; y <= yt; y++) {
        const t = (y - 12) / Math.max(1, yt - 12), r = t < 0.4 ? 0 : t < 0.65 ? 1 : (t > 0.95 ? 1 : (o.big ? 3 : 2));
        const lo = 4 - r, hi = 4 + r;
        B(g, lo, y, lo, hi, y, hi, wc(y));
      }
      if (o.spiked) {
        for (let y = yt - 7; y <= yt - 1; y += 2) { const r = o.big ? 4 : 3; P(g, 4 - r, y, 4, V(ctx.m[3])); P(g, 4 + r, y, 4, V(ctx.m[3])); P(g, 4, y, 4 - r, V(ctx.m[3])); P(g, 4, y, 4 + r, V(ctx.m[3])); P(g, 4 + (o.big ? 2 : 1), y + 1, 4 + (o.big ? 2 : 1), V(ctx.m[3])); P(g, 4 - (o.big ? 2 : 1), y + 1, 4 - (o.big ? 2 : 1), V(ctx.m[3])); }
        P(g, 4, yt + 1, 4, V(ctx.m[4]));
      }
      return g;
    },
  };
}
M.club = club('Club', { len: 16 });
M.club_spiked = club('Spiked club', { len: 17, spiked: true });
M.club_big = club('Massive club', { len: 22, big: true, spiked: true, two: true, base: 0x6a4222 });

M.trident = {
  name: 'Trident', meta: { style: 'thrust', len: 21, back: 8, rest: [R_UPRIGHT, 0, 0], grip: [4, 10, 4], minLen: 14, kind: 'melee' },
  build(ctx) {
    const g = newGrid('weapon'), yt = top(ctx), y0 = 10 - ctx.back;
    haft(g, ctx, y0 + 1, yt - 6, 1, 0x7a5a38);
    gripWrap(g, ctx, 8, 11);
    B(g, 4, y0, 4, 4, y0, 4, V(ctx.m[1]));
    B(g, 2, yt - 6, 3, 6, yt - 6, 5, V(ctx.m[2]));                                           // crossbar
    for (const x of [2, 4, 6]) B(g, x, yt - 5, 4, x, yt - (x === 4 ? 0 : 2), 4, V(ctx.m[x === 4 ? 3 : 2]));
    for (const x of [2, 6]) { P(g, x + (x < 4 ? -1 : 1), yt - 4, 4, V(ctx.m[3])); P(g, x, yt - 1, 4, V(ctx.m[4])); }
    P(g, 4, yt, 4, V(ctx.m[4]));
    return g;
  },
};

// ------------------------------------------------------------------------------------------------ staffs and scepters
M.staff = {
  name: 'Staff', meta: { style: 'bash', ready: 66, len: 22, back: 7, rest: [R_UPRIGHT, 0, 0], twoHanded: false, grip: [4, 10, 4], minLen: 12, kind: 'melee' },
  build(ctx) {
    const g = newGrid('weapon'), yt = top(ctx), y0 = 10 - ctx.back;
    haft(g, ctx, y0 + 1, yt, 1, 0x8a6a40);
    gripWrap(g, ctx, 8, 11);
    B(g, 4, y0, 4, 4, y0, 4, V(ctx.m[1]));
    B(g, 3, yt - 1, 3, 5, yt, 5, wood(yt, 4, 0x7a5a30)); P(g, 4, yt + 1, 4, wood(yt, 5, 0x6a4a28));
    return g;
  },
};
M.scepter = {
  name: 'Scepter', meta: { style: 'cast', len: 15, back: 6, rest: [R_UPRIGHT, 0, 0], grip: [4, 10, 4], minLen: 8, kind: 'melee' },
  build(ctx) {
    const g = newGrid('weapon'), yt = top(ctx), y0 = 10 - ctx.back;
    for (let y = y0 + 1; y <= yt - 5; y++) B(g, 4, y, 4, 4, y, 4, V(ctx.m[(y >> 1) % 2 ? 2 : 3]));
    gripWrap(g, ctx, 8, 11);
    B(g, 3, yt - 5, 3, 5, yt - 5, 5, V(ctx.m[2]));
    E(g, 4, yt - 2, 4, 1.8, 1.8, 1.8, (x, y, z) => V(ctx.m[(x + y + z) % 3 ? 3 : 4]));
    P(g, 4, yt - 2, 5, G(0x40e0d0)); P(g, 4, yt - 1, 5, G(0x40e0d0)); P(g, 4, yt, 4, V(ctx.m[4]));
    B(g, 4, y0, 4, 4, y0, 4, V(ctx.m[1]));
    return g;
  },
};
M.scepter_sun = {
  name: 'Sun-disc staff', meta: { style: 'cast', len: 22, back: 7, rest: [R_UPRIGHT, 0, 0], grip: [4, 10, 4], minLen: 14, kind: 'melee' },
  build(ctx) {
    const g = newGrid('weapon'), yt = top(ctx), y0 = 10 - ctx.back;
    haft(g, ctx, y0 + 1, yt - 6, 1, 0x8a6a40);
    gripWrap(g, ctx, 8, 11);
    B(g, 4, y0, 4, 4, y0, 4, V(ctx.m[2]));
    // gold crescent holder and a glowing disc
    B(g, 3, yt - 6, 3, 5, yt - 6, 5, V(ctx.m[2])); B(g, 2, yt - 5, 4, 6, yt - 5, 4, V(ctx.m[2]));
    E(g, 4, yt - 2, 4, 3.2, 3.2, 1, (x, y, z, d) => G(d < 0.55 ? 0xfff0a0 : 0xffc040));
    B(g, 4, yt - 2, 5, 4, yt - 2, 5, G(0xffffff));
    for (const [x, y] of [[4, yt + 1], [1, yt - 2], [7, yt - 2]]) P(g, x, y, 4, G(0xffd860));
    return g;
  },
};
M.mistletoe_staff = {
  name: 'Mistletoe staff', meta: { style: 'cast', len: 23, back: 7, rest: [R_UPRIGHT, 0, 0], grip: [4, 10, 4], minLen: 14, kind: 'melee' },
  build(ctx) {
    const g = newGrid('weapon'), yt = top(ctx), y0 = 10 - ctx.back;
    for (let y = y0 + 1; y <= yt - 4; y++) B(g, 4, y, 4 + (Math.round(0.8 * Math.sin(y * 0.7)) > 0 ? 1 : 0), 4, y, 4 + (Math.round(0.8 * Math.sin(y * 0.7)) > 0 ? 1 : 0), wood(y, 6, 0x6a4a2a));
    gripWrap(g, ctx, 8, 11);
    // gnarled crown with a mistletoe bundle (glowing berries)
    B(g, 3, yt - 4, 3, 5, yt - 3, 5, wood(yt, 7, 0x5a3a20));
    E(g, 4, yt - 1, 4, 2.6, 2.2, 2.6, (x, y, z) => V(shade(0x4fa83a, 0.75 + 0.4 * hash3(x, y, z, 2))));
    for (const [x, y, z] of [[3, yt - 2, 6], [5, yt - 1, 6], [2, yt, 5], [6, yt, 3], [4, yt + 1, 4], [3, yt - 1, 2]]) P(g, x, y, z, G(0xf4f4c0));
    return g;
  },
};
M.crook_flail = {
  name: 'Crook and flail', meta: { style: 'bash', ready: 60, len: 17, back: 6, rest: [R_UPRIGHT, 0, 0], grip: [4, 10, 4], minLen: 11, kind: 'melee' },
  build(ctx) {
    const g = newGrid('weapon'), yt = top(ctx), y0 = 10 - ctx.back;
    for (let y = y0 + 1; y <= yt - 4; y++) B(g, 4, y, 4, 4, y, 4, V(y % 3 === 0 ? 0x2d4fb0 : ctx.m[2]));
    gripWrap(g, ctx, 8, 11);
    // the hooked top of the crook
    const hook = [[4, yt - 3], [4, yt - 2], [5, yt - 1], [6, yt - 1], [7, yt - 2], [7, yt - 3]];
    for (const [z, y] of hook) B(g, 4, y, z, 4, y, z, V(ctx.m[3]));
    // flail: short gold rod with three bead strands
    B(g, 2, 14, 4, 2, 17, 4, V(ctx.m[2]));
    for (const z of [3, 4, 5]) for (let k = 0; k < 4; k++) P(g, 1, 13 - k, z, V(k % 2 ? 0x2d4fb0 : ctx.m[3]));
    return g;
  },
};
M.vine_staff = {
  name: 'Vine staff (vitis)', meta: { style: 'bash', len: 18, back: 5, rest: [R_UPRIGHT, 0, 0], grip: [4, 10, 4], minLen: 10, kind: 'melee' },
  build(ctx) {
    const g = newGrid('weapon'), yt = top(ctx), y0 = 10 - ctx.back;
    for (let y = y0; y <= yt; y++) { const z = 4 + Math.round(0.7 * Math.sin(y * 0.55)); B(g, 4, y, z, 4, y, z, wood(y, 8, 0x9a7a44)); if (y % 5 === 2) { P(g, 3, y, z, wood(y, 9, 0x6a4a24)); P(g, 5, y, z, wood(y, 3, 0x6a4a24)); } }
    gripWrap(g, ctx, 8, 11);
    B(g, 4, yt - 1, 3, 4, yt, 5, V(ctx.m[2]));
    return g;
  },
};
M.torch = {
  name: 'Torch', meta: { style: 'bash', ready: 66, len: 13, back: 6, rest: [R_UPRIGHT, 0, 0], grip: [4, 10, 4], minLen: 9, kind: 'melee' },
  build(ctx) {
    const g = newGrid('weapon'), yt = top(ctx), y0 = 10 - ctx.back;
    haft(g, ctx, y0, yt - 6, 1, 0x7a5a38);
    gripWrap(g, ctx, 8, 11);
    B(g, 3, yt - 6, 3, 5, yt - 4, 5, V(0x3a2a20));                                            // oil-soaked wrap
    B(g, 3, yt - 3, 3, 5, yt - 1, 5, (x, y, z) => G(hash3(x, y, z, 1) > 0.5 ? 0xff8a1e : 0xff6a10));
    B(g, 4, yt - 2, 4, 4, yt, 4, G(0xffd04a)); P(g, 4, yt + 1, 4, G(0xffe890));
    P(g, 3, yt, 4, G(0xff7a1a)); P(g, 5, yt - 1, 3, G(0xff8a1e));
    return g;
  },
};
M.sickle = {
  name: 'Golden sickle', meta: { style: 'slash', len: 13, back: 5, rest: [R_CARRY, 0, 0], grip: [4, 10, 4], minLen: 9, kind: 'melee' },
  build(ctx) {
    const g = newGrid('weapon'), yt = top(ctx);
    haft(g, ctx, 5, yt - 6, 1, 0x7a5a38);
    gripWrap(g, ctx, 8, 11);
    const pts = [[4, yt - 6], [4, yt - 5], [4, yt - 4], [5, yt - 3], [6, yt - 2], [7, yt - 2], [8, yt - 3], [8, yt - 4]];
    for (const [z, y] of pts) { B(g, 4, y, z, 4, y, z, V(ctx.m[3])); B(g, 4, y - 1, z, 4, y - 1, z, V(ctx.m[2])); }
    B(g, 4, yt - 3, 7, 4, yt - 3, 7, V(ctx.m[4]));
    return g;
  },
};
// The strategos' standard: tall pole, crossbar and a team-tinted cloth banner (spec decision D2: a MAIN-HAND weapon, not a back pole)
M.standard = {
  name: 'Standard (banner)', meta: { style: 'bash', ready: 84, len: 30, back: 6, rest: [R_UPRIGHT, 0, 0], grip: [4, 10, 4], minLen: 22, kind: 'melee', noClamp: true },
  build(ctx) {
    const g = newGrid('weapon'), yt = top(ctx), y0 = 10 - ctx.back;
    haft(g, ctx, y0 + 1, yt - 2, 1, 0x7a5030);
    gripWrap(g, ctx, 8, 11);
    B(g, 4, y0, 4, 4, y0, 4, V(ctx.m[1]));
    // finial: gold spear-leaf over a collar
    B(g, 3, yt - 2, 3, 5, yt - 2, 5, V(ctx.m[2])); B(g, 4, yt - 1, 3, 4, yt, 5, V(ctx.m[3])); P(g, 4, yt + 1, 4, V(ctx.m[4]));
    // crossbar and the tinted banner with an emblem, fringe along the bottom
    const yb = yt - 4;
    B(g, 0, yb, 4, 8, yb, 4, V(ctx.m[2])); P(g, 0, yb, 4, V(ctx.m[4])); P(g, 8, yb, 4, V(ctx.m[4]));
    B(g, 0, yb - 9, 4, 8, yb - 1, 4, (x, y, z) => ((y === yb - 9) ? ((x % 2) ? V(shade(ctx.c.secondary, 0.95)) : V(shade(ctx.c.secondary, 0.75))) : ctx.t(0.9 + 0.16 * hash3(x, y, z, 12))));
    B(g, 0, yb - 8, 4, 0, yb - 1, 4, V(shade(ctx.c.secondary, 0.9))); B(g, 8, yb - 8, 4, 8, yb - 1, 4, V(shade(ctx.c.secondary, 0.9)));
    B(g, 0, yb - 1, 4, 8, yb - 1, 4, V(shade(ctx.c.secondary, 0.9)));
    if (ctx.emblem && ctx.emblem !== 'none') emblem(g, ctx.emblem, 0, yb - 2, 4, V(shade(ctx.c.secondary, 1.05)));
    else sprite(g, ['..###..', '.#####.', '.#####.', '..###..'], 1, yb - 3, 4, { '#': V(shade(ctx.c.secondary, 1.05)) });
    return g;
  },
};

registerParts(PARTS);
