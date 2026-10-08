// The ONE place that knows where the G2/G3/G4/G7 collectors find things inside a source tree (the baseline worktree when recording, this repo when testing).
// When a later work package moves a source (the registry split of AR1, the gencore split of W1), the owner of that move changes the one line here and the
// collectors, the recorders and the tests keep working; a collector that cannot find its source throws (it never skips).
//
//   const T = await openTree(root, { regime: 'baked' });   // 'baked' = registerAllClips(ClipLib, {humanoid}) like app/main.js; 'default_meta' = no bake; null = leave ClipLib alone
//   T.root, T.regime, T.imp(rel) (dynamic import of <root>/<rel>), T.read(rel) (utf8), T.exists(rel)
//   T.sources: path table below (keys are used by the collectors)
//
// Ancient-only views: every collector asks for the ANCIENT ledger of ids (from the committed fixtures) when it must filter, never for "all ids of the tree",
// so adding an era cannot move an Ancient golden.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** key -> repo-relative module path. */
export const SOURCES = {
  gen: 'src/world/gen.js',
  arena: 'src/world/arena.js',
  arenas: 'src/content/era_ancient/arenas.js',
  defs: 'src/sim/defs.js',
  world: 'src/sim/world.js',
  custom: 'src/content/era_ancient/custom.js',
  blueprints: 'src/content/era_ancient/blueprints.js',
  rng: 'src/core/rng.js',
  simStats: 'src/sim/stats.js',
  power: 'src/sim/power.js',
  saveStore: 'src/save/store.js',
  saveDocs: 'src/save/docs.js',
  saveTransfer: 'src/save/transfer.js',
  saveStats: 'src/save/stats.js',
  saveShare: 'src/save/share.js',
  saveMigrate: 'src/save/migrate.js',
  saveValidate: 'src/save/validate.js',
  stats: 'src/content/era_ancient/stats.js',
  armygen: 'src/sim/armygen.js',
  waves: 'src/sim/waves.js',
  survival: 'src/content/era_ancient/survival.js',
  daily: 'src/content/era_ancient/daily.js',
  mutators: 'src/sim/mutators.js',
  godpowers: 'src/sim/godpowers.js',
  abilities: 'src/sim/abilities/index.js',
  campaign: 'src/content/era_ancient/campaign.js',
  puzzles: 'src/content/era_ancient/puzzles.js',
  achievements: 'src/content/era_ancient/humor/achievements.js',
  propCatalog: 'src/content/era_ancient/props/catalog.js',
  partRegistry: 'src/content/era_ancient/parts/_registry.js',
  partModules: 'src/_generated/registry.content.js',          // importing it registers all 254 parts as a side effect
  clips: 'src/anim/clips.js',
  boot: 'src/anim/boot.js',
  humanoidClips: 'assets/anim/humanoid_clips.json',
  cues: 'src/audio/cues.js',
  audioManifest: 'assets/manifest.json',
  tombstones: 'src/save/tombstones.js',
  registry: 'src/content/registry.js',                          // does not exist before AR1; its presence switches the owner check on
};

/** G3 ledger kind -> registry kind name for `registry.owner(kind, id)` (AR 3.1.2). Kinds not listed here are not owner-checked (parts, audio, clips are code or assets). */
export const OWNER_KINDS = { units: 'unit', factions: 'faction', arenas: 'arena', recipes: 'recipe', props: 'prop', missions: 'mission', puzzles: 'puzzle', achievements: 'achievement', mutators: 'mutator' };

const clipsBaked = new Map();   // root -> report (registerAllClips must run once per module graph)

export async function openTree(root, { regime = 'baked' } = {}) {
  root = path.resolve(root);
  if (!fs.existsSync(path.join(root, 'src', 'sim', 'world.js'))) throw new Error(`openTree: ${root} is not a VOXELWARS tree (no src/sim/world.js)`);
  if (regime !== null && regime !== 'baked' && regime !== 'default_meta') throw new Error("openTree: regime must be 'baked', 'default_meta' or null");
  const imp = (rel) => import(pathToFileURL(path.join(root, rel)).href);
  const T = {
    root, regime, sources: SOURCES, imp,
    exists: (rel) => fs.existsSync(path.join(root, rel)),
    read: (rel) => fs.readFileSync(path.join(root, rel), 'utf8'),
    src: (key) => { if (!SOURCES[key]) throw new Error('openTree: unknown source key ' + key); return imp(SOURCES[key]); },
  };
  /** (ledgerKind, id) -> era id from registry.owner, or null when the tree has no registry yet (single-era tree: ownership is trivially 'ancient'). */
  T.ownerOf = async () => {
    if (!T.exists(SOURCES.registry)) return null;
    const mod = await imp(SOURCES.registry);
    if (!mod.registry || typeof mod.registry.owner !== 'function') throw new Error(`${SOURCES.registry} exports no registry.owner(kind, id) (AR 3.1.2); update tools/golden/tree.mjs`);
    return (kind, id) => mod.registry.owner(OWNER_KINDS[kind], id);
  };
  if (regime === 'baked') {
    if (!clipsBaked.has(root)) {
      const [Clips, Boot] = await Promise.all([imp(SOURCES.clips), imp(SOURCES.boot)]);
      const humanoid = JSON.parse(fs.readFileSync(path.join(root, SOURCES.humanoidClips), 'utf8'));
      clipsBaked.set(root, Boot.registerAllClips(Clips.ClipLib, { humanoid }));
    }
    T.bakeReport = clipsBaked.get(root);
  }
  return T;
}
