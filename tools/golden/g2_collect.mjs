// G2 collector for Node: generate every case from the tree `root` (the baseline worktree when recording, this repo when testing).
import { openTree } from './tree.mjs';
import { g2Collect } from './g2_core.mjs';

export async function collectG2(root) {
  const T = await openTree(root, { regime: null });
  const [G, A] = await Promise.all([T.src('gen'), T.src('arenas')]);
  return g2Collect(G.generateArena, G.RECIPES.slice(), A.ARENAS);
}
