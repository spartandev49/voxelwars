// UNITS-A faces: build(ctx) -> {head, body?}. Head front surface is z=8 (the skull cube front is z=7, the nose sits at x4..5, y1..2, z=8); chin = y0.
import { registerParts } from './_registry.js';
import { V, shade, B, Bs, P, Ps, hash3, newGrid } from './_kit.js';

export const PARTS = { faces: {} };
const F = PARTS.faces;

/** The philosopher: a vast frizzy beard that has clearly just heard an argument it cannot refute: wide round eyes, bushy brows, a moustache, an open dark mouth (the
 *  mouth voxels are where speech bubbles start) and a long beard down the chest. The hair colour decides the beard colour (white on the philosopher). */
F.philosopher_beard = {
  name: 'Philosopher beard (stunned)', meta: { faction: 'hellenes' },
  build(ctx) {
    const head = newGrid('head'), body = newGrid('body');
    const h = (x, y, z, f = 1, s = 6) => V(shade(ctx.c.hair, f * (0.84 + 0.26 * hash3(x, y, z, s))));
    const white = V(0xf6f4ee), dark = V(0x16120e), mouth = V(0x3a0e0e);
    // cheeks and chin shell on the front (leave the nose), side whiskers that stick out as if startled
    for (let y = 0; y <= 2; y++) for (let x = 2; x <= 7; x++) { if (y >= 1 && (x === 4 || x === 5)) continue; if (y === 2 && x > 2 && x < 7) continue; P(head, x, y, 8, h(x, y, 8, 1 - 0.05 * y)); }
    Bs(head, 1, 0, 3, 1, 1, 8, (x, y, z) => h(x, y, z, 0.95)); Bs(head, 1, 2, 6, 1, 4, 8, (x, y, z) => h(x, y, z, 1.0));
    Bs(head, 1, 0, 2, 1, 0, 2, (x, y, z) => h(x, y, z, 0.9));
    for (let y = 0; y <= 4; y++) for (let z = 3; z <= 9; z++) for (const x of [0, 9]) if (hash3(x, y, z, 21) > 0.55 && !(y >= 2 && y <= 3 && z >= 4 && z <= 5)) P(head, x, y, z, h(x, y, z, 1.05, 22));
    Ps(head, 2, 3, 9, h(2, 3, 9, 1.1)); Ps(head, 1, 1, 9, h(1, 1, 9, 1.1)); Ps(head, 2, 0, 9, h(2, 0, 9));
    // big moustache over an open mouth (dark core, a hint of tongue)
    B(head, 3, 1, 9, 6, 1, 9, (x, y, z) => h(x, y, z, 1.1, 8));
    Ps(head, 2, 1, 9, h(2, 1, 9, 1.0)); Ps(head, 2, 0, 9, h(2, 0, 9, 1.0));
    B(head, 4, 0, 8, 5, 0, 9, mouth); P(head, 4, 0, 9, V(0x9a3a3a)); P(head, 5, 0, 9, V(0x9a3a3a));
    // wide round eyes: white 2x2 with the pupil toward the nose, raised bushy brows
    for (const s of [0, 1]) {
      const m = (x) => (s ? 9 - x : x);
      for (const [dx, dy] of [[2, 3], [3, 3], [2, 4], [3, 4]]) P(head, m(dx), dy, 8, white);
      P(head, m(3), 3, 8, dark); P(head, m(3), 4, 8, V(0x6a6a72));
      for (const dx of [2, 3]) { P(head, m(dx), 5, 8, h(dx, 5, 8, 1.15, 9)); P(head, m(dx), 5, 9, h(dx, 5, 9, 1.2, 10)); }
      P(head, m(2), 6, 8, h(2, 6, 8, 1.1, 11));
    }
    // the beard down the chest (body front z=4): wavy edges, long strands
    const hw = [0, 1, 1, 2, 2, 2, 3, 3, 3];            // half-width by y (0 = bottom tip)
    for (let y = 8; y >= 0; y--) {
      const wob = hash3(y, 3, 4, 31) > 0.55 ? 1 : 0, w = hw[y] + (y < 8 ? wob : 0), x0 = 5 - Math.max(1, w), x1 = 4 + Math.max(1, w);
      for (let x = x0; x <= x1; x++) P(body, x, y, 4, h(x, y, 4, (x % 2 ? 0.92 : 1.06) + 0.02 * y, 40));
    }
    return { head, body };
  },
};

registerParts(PARTS);
