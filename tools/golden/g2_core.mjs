// G2 core (docs/eras/spec/VF.md 3.6.2): the pure part of the arena golden. Import-free apart from hash_core, so the SAME code runs in Node and, bundled by
// esbuild, inside Chromium (tools/golden/g2_chromium.mjs). It receives the generator functions from its caller and never imports a source tree itself.
//
// One case = generateArena(recipe, size, seed).toJSON() -> five FNV-1a-32 hashes (8 hex digits each):
//   [full JSON.stringify(arena.toJSON()), terrain (h), materials (m), props, meta (everything else: name, zones, env, markers, hazards ...)]
// `full` is the hash of docs/eras/spec/W.md F1; the other four only exist so a red case says WHAT moved (terrain only, props only ...).
import { fnv32 } from './hash_core.mjs';

export const G2_SIZES = ['small', 'medium', 'large'];
export const G2_SEEDS = [1, 7];
export const G2_PARTS = ['full', 'terrain', 'materials', 'props', 'meta'];
export const G2_ALGO = 'fnv1a32 over UTF-16 code units of JSON.stringify(...) of arena.toJSON() and of its h, m, props and remaining fields';

/** The five hashes of one generated arena. */
export function arenaDigest(arena) {
  const j = arena.toJSON();
  const { h, m, props, ...meta } = j;
  return [fnv32(JSON.stringify(j)), fnv32(JSON.stringify(h)), fnv32(JSON.stringify(m)), fnv32(JSON.stringify(props)), fnv32(JSON.stringify(meta))];
}

/** Generate the cases for the given inputs: recipes x sizes x seeds, and the preset defaults. -> { cases: {'recipe/size/seed': digest}, presets: [{id, recipe, size, seed, d}] } */
export function g2Run(generateArena, recipes, presets, sizes = G2_SIZES, seeds = G2_SEEDS) {
  const cases = {};
  for (const r of recipes) for (const s of sizes) for (const sd of seeds) cases[`${r}/${s}/${sd}`] = arenaDigest(generateArena(r, s, sd));
  const pre = presets.map((p) => ({ id: p.id, recipe: p.recipe, size: p.size, seed: p.seed, d: arenaDigest(generateArena(p.recipe, p.size, p.seed)) }));
  return { cases, presets: pre };
}

/**
 * Collect from the LIVE lists of a tree. @param {(recipe:string,size:string,seed:number)=>object} generateArena @param {string[]} recipes (RECIPES, in its own order)
 * @param {{id:string,recipe:string,size:string,seed:number}[]} presets (the shipped ARENAS list, in order)
 */
export function g2Collect(generateArena, recipes, presets) {
  const { cases, presets: pre } = g2Run(generateArena, recipes, presets);
  return { algo: G2_ALGO, parts: G2_PARTS, recipes: recipes.slice(), sizes: G2_SIZES, seeds: G2_SEEDS, cases, presets: pre };
}

/** Regenerate exactly the recorded inputs (the Ancient recipes, sizes, seeds and preset defaults), whatever else the tree has learned since. */
export function g2Replay(generateArena, recorded) {
  return g2Run(generateArena, recorded.recipes, recorded.presets, recorded.sizes, recorded.seeds);
}

/** Compare a fresh replay with the recorded data -> { cases: [{key, parts:[names that differ]}], presets: [{key, parts}] , missing: [keys] } */
export function g2Compare(recorded, fresh) {
  const diffParts = (a, b) => G2_PARTS.filter((_, i) => !b || a[i] !== b[i]);
  const out = { cases: [], presets: [], missing: [] };
  for (const key of Object.keys(recorded.cases)) {
    if (!fresh.cases[key]) { out.missing.push(key); continue; }
    const parts = diffParts(recorded.cases[key], fresh.cases[key]);
    if (parts.length) out.cases.push({ key, parts });
  }
  recorded.presets.forEach((p, i) => {
    const f = fresh.presets[i];
    if (!f || f.id !== p.id) { out.missing.push('preset:' + p.id); return; }
    const parts = diffParts(p.d, f.d);
    if (parts.length) out.presets.push({ key: p.id, parts });
  });
  return out;
}
