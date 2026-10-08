// G3 collector (docs/eras/spec/VF.md 3.6.2): the id ledger of the shipped Ancient content by kind, plus the exact JSON of each of the 43 unit defs.
// `collectG3(root)` returns { data: { ids, counts, cueCount, tombstones, defs: {id: sha256} }, companions: { g3_defs: {defs: {id: {sha256, keys, json}}} } } as read from a source tree: the baseline worktree
// when recording, this repo when testing (then the result is the LIVE id lists, to be compared with the ledger by tests/golden/g3_ids.test.mjs).
//
//   ids[kind] is an array in source order, except `clips`, `qualifiedClips`, `rigs`, `projectileKinds` which are sorted (no source order exists).
//   `parts` ids are `<category>/<partId>` (part ids are unique per category). Everything that is registered by importing modules (254 parts, 27 abilities)
//   is read after the registering import, exactly the way the app sees it.
import fs from 'node:fs';
import path from 'node:path';
import { openTree } from './tree.mjs';
import { sha256, norm } from './common.mjs';

export const G3_KINDS = ['units', 'factions', 'arenas', 'recipes', 'props', 'propCategories', 'missions', 'puzzles', 'parts', 'achievements', 'mutators', 'abilities',
  'projectileKinds', 'godPowers', 'rigs', 'clips', 'qualifiedClips', 'music', 'sfx', 'cues', 'unlockKeys'];
/** Kinds whose list is compared as a sequence (order is part of the identity: pool order, carousel order); the others are compared as sets. */
export const G3_SORTED = ['clips', 'qualifiedClips', 'rigs', 'projectileKinds'];

export async function collectG3(root) {
  const T = await openTree(root, { regime: 'baked' });
  await T.src('partModules');                                            // registers the 254 parts
  const [Defs, Stats, Arenas, Gen, Props, Camp, Puz, Ach, Mut, God, Abil, Clips, Cues, Tomb, PartReg] = await Promise.all(
    ['defs', 'stats', 'arenas', 'gen', 'propCatalog', 'campaign', 'puzzles', 'achievements', 'mutators', 'godpowers', 'abilities', 'clips', 'cues', 'tombstones', 'partRegistry'].map((k) => T.src(k)));
  const defs = Defs.buildSimDefs();
  const manifest = JSON.parse(fs.readFileSync(path.join(T.root, T.sources.audioManifest), 'utf8'));
  const unitIds = Object.keys(defs);
  const qualified = Clips.ClipLib.qualifiedIds().slice().sort();
  const ids = {
    units: unitIds,
    factions: Object.keys(Stats.FACTIONS),
    arenas: Arenas.ARENAS.map((a) => a.id),
    recipes: Gen.RECIPES.slice(),
    props: Object.keys(Props.PROP_CATALOG),
    propCategories: Props.PROP_CATEGORIES.slice(),
    missions: Camp.MISSIONS.map((m) => m.id),
    puzzles: Puz.PUZZLES.map((p) => p.id),
    parts: Object.keys(PartReg.PART_REGISTRY).flatMap((cat) => Object.keys(PartReg.PART_REGISTRY[cat]).map((id) => `${cat}/${id}`)),
    achievements: Ach.ACHIEVEMENT_IDS.slice(),
    mutators: Mut.MUTATORS.map((m) => m.id),
    abilities: Object.keys(Abil.abilityRegistry),
    projectileKinds: [...new Set(unitIds.filter((id) => defs[id].ranged).map((id) => defs[id].ranged.proj))].sort(),
    godPowers: God.GOD_POWERS.map((g) => g.id),
    rigs: [...new Set(qualified.map((q) => q.split(':')[0]))].sort(),
    clips: Clips.ClipLib.ids().slice().sort(),
    qualifiedClips: qualified,
    music: manifest.music.map((m) => m.id),
    sfx: manifest.sfx.map((s) => s.id),
    cues: Cues.CUE_IDS.slice(),
    unlockKeys: Object.keys(PartReg.UNLOCKS),
  };
  for (const k of G3_KINDS) {
    if (!Array.isArray(ids[k]) || ids[k].some((x) => typeof x !== 'string' || !x)) throw new Error(`G3: ids.${k} is not a list of non-empty strings`);
    if (new Set(ids[k]).size !== ids[k].length) throw new Error(`G3: duplicate ids in ${k}`);
  }
  const counts = Object.fromEntries(G3_KINDS.map((k) => [k, ids[k].length]));
  const defDigest = {}, defRows = {};
  for (const id of unitIds) {
    const json = JSON.stringify(defs[id]);
    const sha = sha256(json);
    defDigest[id] = sha;
    defRows[id] = { sha256: sha, keys: Object.keys(defs[id]), json };
  }
  const tombstones = {};
  for (const k of Tomb.KINDS) tombstones[k] = Object.keys(Tomb.TOMBSTONES[k]).sort();
  const data = { ids, counts, cueCount: Cues.CUE_COUNT, tombstones, defs: defDigest };
  return { data: norm(data), companions: { g3_defs: norm({ defs: defRows }) } };
}

/** Ledger ids that the registry does not credit to `ancient` -> ['units:hoplite owned by medieval', ...]. `ownerOf(kind, id)` may throw (reported, never skipped). */
export function ownerProblems(ledgerIds, ownerOf, kinds) {
  const bad = [];
  for (const kind of kinds) for (const id of ledgerIds[kind] || []) {
    let o;
    try { o = ownerOf(kind, id); } catch (e) { bad.push(`${kind}:${id} owner lookup threw ${String(e && e.message).slice(0, 80)}`); continue; }
    if (o !== 'ancient') bad.push(`${kind}:${id} owned by ${o}`);
  }
  return bad;
}

/** Live ids that are in the ledger, in live order (the Ancient subsequence); used to check that the Ancient order did not change. */
export function ancientSubsequence(liveList, ledgerList) {
  const want = new Set(ledgerList);
  return liveList.filter((x) => want.has(x));
}
