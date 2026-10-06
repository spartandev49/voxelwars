// Base (naked) hum1 body: the skin layer every other part is stamped over. Pure JS.
import { V, shade, B, Bs, P, Ps, newGrid, vgrad, lighten } from './_kit.js';

/** @returns {{[partId:string]: VoxelGrid}} skin-only grids for body, head, arms (4), legs (4). */
export function baseGrids(ctx) {
  const { skin } = ctx.c;
  const sk = (f) => V(shade(skin, f));
  const G = {};

  // ---- body 10x9x5 : skin torso with a hint of chest/abs form
  const body = newGrid('body');
  B(body, 0, 0, 0, 9, 8, 4, (x, y) => sk(vgrad(y, 0, 8, 0.88, 1.03)));
  B(body, 1, 5, 4, 3, 6, 4, sk(1.1)); B(body, 6, 5, 4, 8, 6, 4, sk(1.1));            // pecs
  B(body, 4, 3, 4, 5, 6, 4, sk(0.86));                                                // sternum line
  B(body, 2, 1, 4, 3, 3, 4, sk(1.0)); B(body, 6, 1, 4, 7, 3, 4, sk(1.0));             // abs blocks
  G.body = body;

  // ---- head: 6x6x6 skull cube (x2..7, y0..5, z2..7) + ears + nose + eyes + mouth
  const head = newGrid('head');
  B(head, 2, 0, 2, 7, 5, 7, (x, y, z) => sk(vgrad(y, 0, 5, 0.9, 1.04)));
  Ps(head, 1, 2, 4, sk(0.94)); Ps(head, 1, 3, 4, sk(0.94)); Ps(head, 1, 2, 5, sk(0.9)); Ps(head, 1, 3, 5, sk(0.9));          // ears
  P(head, 4, 2, 8, sk(0.96)); P(head, 5, 2, 8, sk(0.96)); P(head, 4, 1, 8, sk(0.88)); P(head, 5, 1, 8, sk(0.88));           // nose
  // eyes: dark pupil with a white outer corner, slightly recessed look through the brow shadow
  const eye = V(ctx.c.eyes), white = V(0xf4f4ee);
  if (!ctx.noEyes) {
    P(head, 3, 3, 7, eye); P(head, 6, 3, 7, eye);
    P(head, 2, 3, 7, white); P(head, 7, 3, 7, white);
    B(head, 3, 4, 7, 6, 4, 7, sk(0.82));                                                                                       // brow shadow
  }
  B(head, 3, 1, 7, 6, 1, 7, V(shade(skin, 0.62)));                                                                              // mouth line
  G.head = head;

  // ---- arms: skin; the hand (forearm y0..1) a touch lighter
  for (const id of ['armUL', 'armUR']) { const g = newGrid(id); B(g, 0, 0, 0, 2, 4, 2, (x, y) => sk(vgrad(y, 0, 4, 0.9, 1.02))); G[id] = g; }
  for (const id of ['armLL', 'armLR']) {
    const g = newGrid(id);
    B(g, 0, 2, 0, 2, 4, 2, (x, y) => sk(vgrad(y, 2, 4, 0.92, 1.02)));
    B(g, 0, 0, 0, 2, 1, 2, V(lighten(shade(skin, 0.98), 0.04)));
    G[id] = g;
  }
  // ---- legs: skin thighs/shins, bare feet (toes at z 4..5 of the lower leg)
  for (const id of ['legUL', 'legUR']) { const g = newGrid(id); B(g, 0, 0, 0, 3, 4, 3, (x, y) => sk(vgrad(y, 0, 4, 0.9, 1.0))); G[id] = g; }
  for (const id of ['legLL', 'legLR']) {
    const g = newGrid(id);
    B(g, 0, 2, 0, 3, 4, 3, (x, y) => sk(vgrad(y, 2, 4, 0.94, 1.0)));
    B(g, 0, 0, 0, 3, 1, 5, V(shade(skin, 0.9)));
    B(g, 0, 0, 4, 3, 0, 5, V(shade(skin, 0.8)));
    G[id] = g;
  }
  return G;
}
