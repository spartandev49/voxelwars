// G4 collector (docs/eras/spec/VF.md 3.6.2): hashes of every shipped Ancient text module. For each module: sha256 of the canonical JSON of its DATA exports
// (functions are listed by name, not hashed; a function stored under an object key, like the achievement predicates, is dropped from the hash and listed in `nestedFunctions`), the sha256 of every export, and a per-key hash map (object key, or array index / announcer-template id) so
// a red module says which line changed. `collectG4(root)` reads a source tree (baseline when recording, this repo when testing).
//
// MODULES lists the 13 modules imported by tests/humor/text.test.mjs plus the ones that file does not import: SIM_BARKS (sim_text), lesson_text,
// wave_names, custom_text, ui/strings, and the puzzle text (puzzleText(id) for the six puzzles). UNIT_TEXT lives in units_text, announcer TEMPLATES
// (ids and order, 486) in announcer, tips in tips, loading lines in ui_text.
import { openTree } from './tree.mjs';
import { sha256, sha12, norm } from './common.mjs';
import { canonicalJSON } from '../lib/records.mjs';

const H = 'src/content/era_ancient/humor/', E = 'src/content/era_ancient/';
/** id -> repo-relative path. The id is the key of the record. */
export const G4_MODULES = {
  units_text: H + 'units_text.js', announcer: H + 'announcer.js', tips: H + 'tips.js', achievements: H + 'achievements.js', killverbs: H + 'killverbs.js',
  names: H + 'names.js', ui_text: H + 'ui_text.js', mutators_text: H + 'mutators_text.js', barks: H + 'barks.js', results_text: H + 'results_text.js',
  credits_text: H + 'credits_text.js', campaign_text: E + 'campaign_text.js', scout_text: H + 'scout_text.js',
  sim_text: E + 'sim_text.js', lesson_text: E + 'lesson_text.js', wave_names: E + 'wave_names.js', custom_text: E + 'custom_text.js', ui_strings: 'src/ui/strings.js',
};
/** The 13 modules of tests/humor/text.test.mjs. */
export const TEXT_TEST_MODULES = ['units_text', 'announcer', 'tips', 'achievements', 'killverbs', 'names', 'ui_text', 'mutators_text', 'barks', 'results_text', 'credits_text', 'campaign_text', 'scout_text'];

/** key -> hash for one data export: object keys, array indices (or the `id` of the item when every item is an object with a unique string id), scalar -> {'': hash}. */
export function keyHashes(value) {
  const out = {};
  if (Array.isArray(value)) {
    const ids = value.every((x) => x && typeof x === 'object' && !Array.isArray(x) && typeof x.id === 'string') && new Set(value.map((x) => x.id)).size === value.length;
    value.forEach((x, i) => { out[ids ? x.id : String(i)] = sha12(canonicalJSON(x)); });
  } else if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) out[k] = sha12(canonicalJSON(value[k]));
  } else out[''] = sha12(canonicalJSON(value));
  return out;
}

/** One module's record from its namespace object. */
export function moduleRecord(ns) {
  const data = {}, functions = [], nested = new Set();
  for (const k of Object.keys(ns).sort()) {
    if (k === 'default') continue;                                   // puzzles.js default duplicates a named export
    if (typeof ns[k] === 'function') functions.push(k); else data[k] = norm(ns[k], k, (at) => nested.add(at.replace(/\[\d+\]/g, '[]')));
  }
  const exports = {}, keys = {};
  for (const k of Object.keys(data)) { exports[k] = sha256(canonicalJSON(data[k])); keys[k] = keyHashes(data[k]); }
  return { sha256: sha256(canonicalJSON(data)), functions, nestedFunctions: [...nested].sort(), exports, keys };
}

export async function collectG4(root) {
  const T = await openTree(root, { regime: null });
  const modules = {};
  for (const id of Object.keys(G4_MODULES)) modules[id] = moduleRecord(await T.imp(G4_MODULES[id]));
  // puzzle text lives in puzzles.js next to the solution armies: hash the text accessor's output, not the whole puzzle objects
  const P = await T.src('puzzles');
  const puzzleText = {};
  for (const p of P.PUZZLES) puzzleText[p.id] = norm(P.puzzleText(p.id), 'puzzleText:' + p.id);
  const pt = { puzzle_text: puzzleText };
  modules.puzzle_text = { sha256: sha256(canonicalJSON(pt)), functions: [], nestedFunctions: [], exports: { puzzle_text: sha256(canonicalJSON(puzzleText)) }, keys: { puzzle_text: keyHashes(puzzleText) } };
  // the announcer template pool: ids and order (486 lines) as their own item, because order is part of the behaviour (the announcer indexes into it)
  const A = await T.imp(G4_MODULES.announcer);
  const order = A.TEMPLATES.map((t) => t.id);
  return {
    data: {
      moduleIds: Object.keys(modules),
      textTestModules: TEXT_TEST_MODULES,
      announcerOrder: { count: order.length, sha256: sha256(order.join('\n')), ids: order },
      modules,
    },
  };
}
