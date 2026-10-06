// Face details (category 'faces'): beards, moustaches, eye patch, war paint. build(ctx) returns {head, body?}.
// Head front surface is z=8 (the skull cube front is z=7); chin = y0. Left of the character is +X: its RIGHT eye is at x=3.
import { registerParts } from './_registry.js';
import { V, T, G, shade, mixRGB, B, Bs, X, Xs, P, Ps, E, hash3, newGrid, sprite } from './_kit.js';

const hairV = (ctx, x, y, z, f = 1, s = 1) => V(shade(ctx.c.hair, f * (0.8 + 0.4 * hash3(x, y, z, s))));
const out = (head, body) => (body ? { head, body } : { head });

export const PARTS = { faces: {} };
const F = PARTS.faces;
F.none = { name: 'Clean-shaven', build: () => null };

F.stubble = {
  name: 'Stubble',
  build(ctx) {
    const head = newGrid('head'), m = (x, y, z) => V(mixRGB(shade(ctx.c.skin, 0.9), ctx.c.hair, 0.38 + 0.3 * hash3(x, y, z, 2)));
    B(head, 2, 0, 7, 7, 2, 7, (x, y, z) => ((y === 1 && x >= 3 && x <= 6) ? 0 : m(x, y, z)));
    B(head, 2, 0, 4, 2, 2, 6, m); B(head, 7, 0, 4, 7, 2, 6, m);
    B(head, 2, 0, 2, 7, 1, 2, m);
    return out(head);
  },
};
function beard(name, o) {
  return {
    name,
    build(ctx) {
      const head = newGrid('head'), body = o.chest ? newGrid('body') : null, h = (x, y, z, f) => hairV(ctx, x, y, z, f || 1, 3);
      // cheeks and chin shell on the front (z=8) and sides
      B(head, 2, 0, 8, 7, o.cheek ?? 2, 8, (x, y, z) => ((y === 1 && x >= 4 && x <= 5 && !o.covered) ? 0 : h(x, y, z, 1 - 0.06 * y)));
      Bs(head, 1, 0, 4, 1, (o.cheek ?? 2) + 1, 7, (x, y, z) => h(x, y, z, 0.92));
      Bs(head, 1, 0, 8, 1, 1, 8, (x, y, z) => h(x, y, z, 0.95));
      if (o.chinZ) B(head, 3, 0, 9, 6, o.chinH ?? 1, 9, (x, y, z) => h(x, y, z, 1.05));
      if (o.point) { B(head, 4, 0, 9, 5, 0, 10 - 1, (x, y, z) => h(x, y, z, 1.1)); B(head, 4, 0, 9, 5, 1, 9, (x, y, z) => h(x, y, z, 1.05)); }
      if (o.moust) { B(head, 2, 2, 8, 7, 2, 9, (x, y, z) => h(x, y, z, 1.1)); }
      if (body) o.chest(body, ctx, h);
      return out(head, body);
    },
  };
}
F.beard_short = beard('Short beard', { cheek: 1, chinZ: true });
F.beard_long = beard('Long beard', {
  cheek: 2, chinZ: true, chinH: 2,
  chest(body, ctx, h) { for (let y = 8; y >= 2; y--) { const w = y > 4 ? 2 : (y > 3 ? 1 : 0); B(body, 4 - w, y, 4, 5 + w, y, 4, (x, yy, z) => h(x, yy, z, 0.95 + 0.04 * (y - 4))); } },
});
F.beard_pointy = beard('Pointed beard', { cheek: 1, point: true, chest(body, ctx, h) { B(body, 4, 6, 4, 5, 8, 4, (x, y, z) => h(x, y, z, 1)); B(body, 4, 5, 4, 5, 5, 4, (x, y, z) => h(x, y, z, 1)); } });
F.beard_braided = beard('Braided beard', {
  cheek: 2, chinZ: true,
  chest(body, ctx, h) {
    for (let y = 8; y >= 3; y--) { B(body, 4, y, 4, 5, y, 4, (x, yy, z) => h(x, yy, z, y % 2 ? 0.8 : 1.12)); }
    B(body, 4, 2, 4, 5, 2, 4, V(ctx.c.secondary));
  },
});
F.beard_curled = beard('Curled beard', {
  cheek: 2, chinZ: true, chinH: 2,
  chest(body, ctx, h) {
    for (let y = 8; y >= 3; y--) { const w = y > 5 ? 2 : 1; for (let x = 4 - w; x <= 5 + w; x++) if ((x + y) % 2 === 0 || y > 6) P(body, x, y, 4, h(x, y, 4, 0.8 + 0.16 * ((x + y) % 3))); }
    B(body, 3, 3, 4, 6, 3, 4, (x, y, z) => h(x, y, z, 1.1));
  },
});
F.beard_false = {
  name: 'False beard',
  build(ctx) {
    const head = newGrid('head'), body = newGrid('body');
    const gold = (x, y, z, f = 1) => V(shade(ctx.m[2], f * (0.85 + 0.3 * hash3(x, y, z, 5))));
    B(head, 4, 0, 8, 5, 1, 8, (x, y, z) => gold(x, y, z, 0.95)); B(head, 4, 0, 9, 5, 0, 9, (x, y, z) => gold(x, y, z, 1.0));
    for (let y = 8; y >= 4; y--) B(body, 4, y, 4, 5, y, 4, (x, yy, z) => (y % 2 ? V(0x2d4fb0) : gold(x, yy, z, 1)));
    P(body, 4, 3, 4, gold(4, 3, 4, 1.1)); P(body, 5, 3, 4, gold(5, 3, 4, 1.1));
    return out(head, body);
  },
};
F.goatee = beard('Goatee', { cheek: 0, chinZ: false, chest: null, point: true });
F.moustache_huge = {
  name: 'Huge moustache',
  build(ctx) {
    const head = newGrid('head'), h = (x, y, z, f) => hairV(ctx, x, y, z, f, 4);
    B(head, 2, 2, 8, 7, 2, 8, (x, y, z) => h(x, y, z, 1.0));
    B(head, 3, 2, 9, 6, 2, 9, (x, y, z) => h(x, y, z, 1.08));
    Bs(head, 1, 1, 8, 1, 2, 8, (x, y, z) => h(x, y, z, 0.95)); Bs(head, 1, 0, 9, 1, 1, 9, (x, y, z) => h(x, y, z, 1.05));          // drooping ends
    Bs(head, 0, 0, 8, 0, 1, 9, (x, y, z) => h(x, y, z, 1.1));
    return out(head);
  },
};
F.eyepatch = {
  name: 'Eye patch',
  build(ctx) {
    const head = newGrid('head'), black = V(0x15151a);
    B(head, 2, 3, 8, 3, 4, 8, black);                                          // the patch on the right eye
    B(head, 1, 5, 2, 8, 5, 8, (x, y, z) => (((x === 1 || x === 8 || z === 2 || z === 8) && !(x === 1 && z === 8) && !(x === 8 && z === 8)) ? black : 0));      // strap
    P(head, 2, 4, 7, black);
    return out(head);
  },
};
F.warpaint = {
  name: 'War paint',
  build(ctx) {
    const head = newGrid('head'), paint = ctx.t(1.0);
    B(head, 2, 3, 7, 7, 3, 7, (x, y, z) => ((x === 4 || x === 5) ? 0 : paint));            // bar across the eyes
    B(head, 4, 4, 7, 5, 5, 7, paint);                                                      // forehead stripe
    Bs(head, 2, 2, 7, 3, 2, 7, paint); Bs(head, 2, 1, 7, 2, 1, 7, paint);                  // cheek slashes
    Bs(head, 2, 3, 4, 2, 3, 6, paint);
    return out(head);
  },
};

registerParts(PARTS);
