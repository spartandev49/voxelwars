# spec/RA: rigs, animation and rendering of the "three new eras" program (DESIGN-RENDER, final, 2026-10-08)

Binding inputs: `docs/eras/plan.md` v3.1 (sections 0, 3 spikes/goldens/draw ladder, 5 models, 6 rendering R1..R17, 9 ER4/ER5/ER13/ER17/ER18), `maps/03`, `maps/04`, the RA residuals of `q3_engine.md` (5, 25, 26, 27, 33, 40) and the review items of section 5. Companions already final: `spec/AR.md` (registry, AP table, `ensureEra`, G11/G12 content) and `spec/M.md` (fields, events, `RIG_LINGER` contract, closed vocabularies). Where code and a document disagree the code won; every such case is in section 6. All facts were read on HEAD `4fe90f7` (= tag `ancient-v8` + the `VW_BUILD_DATE` line of `tools/build.mjs`). Probes were read-only and live in the scratchpad only; the two that produce deliverables are reproduced in the text (3.1 generator, 3.13 micro-benchmark numbers).

Conventions. Paths are repo-relative. Units: `u` = world unit, `vox` = voxel; a rig's voxel size is 0.1 u unless the table says 0.15. Policy codes are AR's (`FZ OI PX NEW DA-n`); "Ancient path" = everything v8 executes. Rotation convention of `rigs.md` section 0 (+Z forward, +X left, `Ry*Rx*Rz`, positive `rx` takes +Y toward +Z, so a part hanging along -Y swings forward with negative `rx`, and a barrel along +Z pitches UP with negative `rx`). Roles are the plan section 12 roles. Test ids are `RA-Txx` (section 4), decisions `RA-Dxx` (section 2), spikes `SP-1..SP-4` (3.17), plan corrections `RA-PCx` (section 6).

## 1. Purpose and scope

*Length note: this file exceeds the 800-line guide because its tables are the specification (generator script, 36-row far truth table, 11 part tables, 25-row acceptance table, ledger); prose is kept to the decisions.*

**Binds** (builders build from this file, nothing else is needed for their part): (a) the far-mesh truth table, lint rule and the real far-switch rule; (b) the complete rig list with part tables, crew budgets, clip lists with DEFAULT_META rows, reaction sets, the `meta` schemas the Animator/BattleView read, the new weapon styles and the ClipLib ownership rules; (c) the M17t reaction-table schema, the `fxClass` table, per-era hit/gore recipes and the explosion recipes; (d) `PROJ_FX` and the four new effect layers; (e) skin shader v2, the SE->tint table, the cloak variant and fallbacks; (f) `THEME_LOOK`, weather rows, liquids, emissive terrain; (g) `CameraRig.shot`; (h) the draw-call protocol, lever-ladder wiring, terrain super-chunks, markers merge; (i) per-part cost, view-CPU threshold, memory; (j) G8/G11/G12 render-side details and uiscan/readability hooks; (k) airborne look and preview framing; (l) flash limiter and Reduce Motion wiring with the luminance test; (m) look-dev protocol, tracer matrix and the four P0 spikes.

**Builders.** RENDER (sole editor of `src/render/**`, `src/voxel/**`), ANIM-RIGS (rig builders, `beasts/` files of the new eras, clip files), ANIM-CLIPS (sole editor of `animator.js`, `clips.js`, `dsl.js`, `boot.js`), UNITS-MED/MOD/SF (consume rigs), TOOLS-VERIFY and TOOLS-GOLDEN (scripts named in section 4), REGISTRY (data kinds), SPIKE (section 3.17). **Not in scope:** sim fields and events (spec/M: this file cites them), recipes/props/materials content (spec/W: this file fixes the render side of materials and themes), screens and flows (spec/CU: this file supplies the render hooks CU4/CU3 call), audio rows (spec/AU), unit rosters (design/<era>).

## 2. Decisions

| # | decision | rationale (evidence) | plan |
|---|---|---|---|
| RA-D01 | The far-mesh truth table is a GENERATED artefact (`tools/spikes/far_truth_table.mjs`, text in 3.1) and a committed fixture; the builder lint `farLint` measures the real placement parity, the table is the design aid. | Hand-written rules were wrong twice (q2_engine Q13, q3_engine 25); the table is output of the real `downsample2`. | 5, q3_engine 25 |
| RA-D02 | A feature survives at all four origin parities iff `max(w,h) >= 3`; it keeps >= 60% of its voxels at every parity unless it is one of `{4x1, 1x4, 4x2, 2x4}` (50% at odd parity); `{1x1, 2x1, 1x2, 2x2}` can vanish. | Generated table 3.1. The plan sentence "or >= 3 wide in one axis" guarantees survival, not 60% (RA-PC1). | 5 |
| RA-D03 | The far/near switch is the code's rule with the TIER lodDist (24/36/48/76), not 56; look-dev renders far at `lodDist*sqrt(lodK2)`, at the crowd value `*0.35`, at the focus ring and at 80 u. | `Game._applyTier` overwrites the constructor defaults 56/140 (RA-PC2). | 5, q2_engine Q13 |
| RA-D04 | 11 new rigs: Medieval `trebuchet1 ram1 dragon1`, Modern `gun1 tank1 car1 heli1 drone1`, Sci-Fi `hover1 insect1 walker1`; `walker4` is dropped (walker1 `heavy` variant is the boss), drones of Sci-Fi are `hover1` builders. | Each rig has exactly one owner era (AR 3.3); Sci-Fi can reuse nothing of Modern's rigs without a `requires` edge, so it does not. | 5, q1_content Q17 |
| RA-D05 | Crew of guns, trebuchets, rams and cars is the 6-part `hum_lite` figure (rig id `hum_lite`, clips of hum1); tanks, helicopters, drones, hover craft and walkers have NO crew parts (hatch/cockpit are painted voxels). | 48-part cap: full crews cost 10-13 parts each (map 03 section 2.4); budgets in 3.2. | D12 |
| RA-D06 | New clip ids only, 46 plain ids + 21 species ids (3.5); sim-requestable ("attack") ids have exactly one registrant among NEW ids; death ids are rig-qualified generics read WITH a rig. The Ancient pack already shares `strike_ram`, `launch`, `shoot_bow` between rigs: grandfathered by a fixture (RA-PC3). | `ClipLib.register` slot rule; the sim reads `ClipLib.dur(id)` without a rig (`combat.js:240,252`). | 5, q3_engine 5 |
| RA-D07 | Sci-Fi `requires` Modern (code only: hum1 gun clips and generic deaths). The Modern *content* may stay hidden. | One shared gun kit instead of duplicating 18 clips; AR `requires` closure bakes both. | 5, AR6 |
| RA-D08 | Eight weapon styles `rifle pistol mg rocket xbow beam launcher sniper`, AIM rows and `STYLE_K` appended (3.4); initial AIM numbers are tuned by SP-1 inside the stated tolerance. | `shoot` means a vertical bow (map 03 seam 4). | 5 |
| RA-D09 | `reload_gun` carries `meta.fit`: the Animator stretches it to the sim's `stateDur` (clamp 0.35..2.4). | M startReload plays the clip at rate 1 for `reload` seconds (0.5..8). | q1_content Q13 |
| RA-D10 | Model metas are data: `driven aim aimParts crewTable hover bounds airMap recoil flinchK farKeep crewCollapse` with exact schemas in 3.6; every default reproduces the Ancient behaviour. | map 03 seams 6-9, 13. | 5, R11 |
| RA-D11 | Reaction tables (M17t) are DATA keyed by `def.react`, one table per rig class (16 tables); `RIG_LINGER` is a constant table appended to `clips.js`. | M17e: "tables change no `stateHashFull`"; sim may import only `anim/clips.js` (AR LR4). | M17t |
| RA-D12 | `fxClass` has five classes; per-era recipes are data (`FX_RECIPE`), the user's gore setting only ever selects among organic/alien blood styles; `off` removes blood and goo but never machine sparks. | q1_product Q6 (decided table, not a hook). | R10, CU4 |
| RA-D13 | `PROJ_FX` has 29 rows (10 legacy verbatim, `crew` = arrow row, 18 new); beam kinds feed the StreakLayer; `pmCap` rises 1500 -> pool size (4000). | q1_engine Q13; M 3.8 pool policy. | R1, R2 |
| RA-D14 | New effect layers cost <= 5 draws in total: StreakLayer 1, ShieldLayer 1, ShadowBlobs 1, HazardLayer 2. | plan R2-R5; map 04 section 5. | R2..R5 |
| RA-D15 | Shader v2 adds ONE instance attribute `aFx2` (vec4) and ONE shared `uTime`; new voxel flags ride `aFlag = base + 4*extra`; cloak is a compile variant only for skins whose model declares `meta.cloak`; the depth variant discards when the instance is more than half hidden. | q1_engine Q27: a global discard would kill early-Z for all skins. | R6 |
| RA-D16 | New statuses ride the `aFx2.w` mode word (modes 1..7), the 8 legacy modes of `aFx.z` are untouched; SE->tint is a total table over all 24 slots. | `glow + 4*mode` already uses modes 0..7. | R6, q3_engine 13 |
| RA-D17 | `THEME_LOOK` is a field of the theme row (registry kind `theme`), the default look equals today's literals to the last bit; weather/liquid rows are engine vocabularies in `src/render` (closed lists), recipes are the one new registry kind (RA-PC4). | AR OW-05; weather/liquid ids are closed by M 3.3. | R7, R8 |
| RA-D18 | `CameraRig.shot(spec)` is real-time, cancellable, Reduce-Motion = cut; follow/command targets add `u.altitude` (0 on the ground: bit-identical for ground units). | q2_product Q6; `cameras.js:64,68`. | R17 |
| RA-D19 | The 160-draw gate is measured per pass, per populated mesh, in three distributions at 16+16 before R12 lands; the ladder rung is chosen by the arithmetic of 3.12 (expected: rung (a) N=8 plus props 52->30, rung (c) only if still over). | q2_engine Q2; map 04 numbers. | 3, R12 |
| RA-D20 | R14: the per-part static bit is adopted (measured -8% .. -41% of the part chain); the sin/cos table is REJECTED (measured <= 3% gain on top of the static bit); crew parts collapse at LOD1 by `meta.crewCollapse`. | micro-benchmark 3.13. | R14 |
| RA-D21 | View CPU threshold: `view.update` (animator included) <= 1.25 x the Ancient reference measured by the same script on the same box, at 600 units on each era's heaviest legal composition. | q2_engine Q8. | 0.4, ER13 |
| RA-D22 | Memory: share the geometry attributes between near/far meshes and release the CPU copies after upload, evict skins unused for 3 battles, preview cap 6 live skins, soak plateau +-15% and 450 MB ceiling. | q1_verify Q34; map 04 seam 14. | R15 |
| RA-D23 | G12 is Chromium-only; `VoxSkin.add` gains four TRAILING args after `lod` (cloak, shield, heat, xmode) so the spy index of the far flag (14) is unchanged. | AR 3.7.7. | G12 |
| RA-D24 | Airborne look: altitude comes from the sim (`u.y` = ground + altitude), models rest on the ground; blobs, banking, rotor LOD as 3.15. `meta.hover` only for ground-effect craft whose model floats. | M7 provides layers; map 03 'fake altitude' workaround is not needed. | R4, q1_content Q19 |
| RA-D25 | R16: a `FlashGuard` in `src/render/flashguard.js` owns every full-screen or large-area flash; Reduce Motion drives rotors, shield flicker, scripted shots, camera shake and hit-stop; verified by a luminance test with a positive control. | `flashLimiter` is read only by `ui/hud/photo.js:40` today. | R16 |
| RA-D26 | Look-dev: far-mesh-first, iteration caps infantry 2 / vehicle 3 / boss and hero 4, reference pack of 3-5 CC0 images per rig, filmstrips read by an agent that did not build the model. | plan section 5. | 5 |
| RA-D27 | Four P0 spikes with fixed experiments and decision rules (3.17): rifle pose, tread/rotor, mixed voxel size, mech gait. | plan section 3. | 3 |
| RA-D28 | Vehicle clearance: render supplies five radius classes derived from `meta.bounds`; the inflated-obstacle nav map is WORLD's (M7), tested by W10's six-tank column. | q3_engine 27. | M7, W10 |
| RA-D29 | R13: `CubeFX.update(0)` gets a dirty-flag early-out now; removal of the per-tick calls is decided by an experiment with a pixel/particle-count rule. | map 04 seam 27. | R13 |
| RA-D30 | Preview framing and the cull sphere come from `meta.bounds`; models without bounds (all Ancient) keep the legacy formulas bit for bit. | q1_content Q26; AR AP-R02. | R11 |


## 3. Detailed specification

### 3.1 Far mesh: generated truth table, lint rule, the real switch rule, look-dev distances

**Mechanism (`src/voxel/lod.js`, read).** `downsample2(g)` makes a grid of `ceil(s/2)` cells per axis aligned to the PART grid origin; a coarse cell is solid iff >= 3 of its 8 fine voxels are solid (`n < 3` skips it), its colour is the mean, it is team-tinted iff `team*3 >= n`, glowing iff `glow*2 >= n`. The far mesh is that grid meshed at `2 x voxelSize` (`VoxSkin._buildGeometry(true)`), no shadow. Everything below is measured on that function.

**Generator (committed as `tools/spikes/far_truth_table.mjs`, owner TOOLS-VERIFY; run `node tools/spikes/far_truth_table.mjs [--json|--tint]`; the test `RA-T01` re-runs it and compares with the fixture `tests/fixtures/far_truth_table.json`).**

```js
// far_truth_table.mjs: generated far-mesh truth table. Run: node tools/spikes/far_truth_table.mjs [--json]
// For every extruded cross-section w x h (1..6) and each origin parity (px,py) in {0,1}^2 it builds a fine grid,
// runs the REAL downsample2 (src/voxel/lod.js) and measures what a coarse cell layer (interior slab) keeps.
import { VoxelGrid, V, T } from '../../src/voxel/grid.js';
import { downsample2 } from '../../src/voxel/lod.js';
const DEPTH = 8, PAD = 4, PAR = [[0, 0], [1, 0], [0, 1], [1, 1]];
export function probe(w, h, px, py, teamed = false) {
  const sx = PAD * 2 + 8, sy = PAD * 2 + 8, g = new VoxelGrid(sx, sy, DEPTH);
  const x0 = PAD + px, y0 = PAD + py;
  for (let z = 0; z < DEPTH; z++) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g.set(x0 + x, y0 + y, z, teamed ? T(0xffffff) : V(0x888888));
  const c = downsample2(g), zc = 1;                       // coarse z slab 1 = fine z 2,3 (interior of the extrusion)
  let cells = 0, hit = 0, teamCells = 0;
  const covered = new Set();
  for (let y = 0; y < c.sy; y++) for (let x = 0; x < c.sx; x++) {
    const v = c.get(x, y, zc); if (!v) continue;
    cells++; if ((v >>> 24) & 2) teamCells++;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) covered.add((x * 2 + dx) + ',' + (y * 2 + dy));
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (covered.has((x0 + x) + ',' + (y0 + y))) hit++;
  const cov = covered.size;
  return { cells, recall: hit / (w * h), precision: cov ? hit / cov : 0, cover: cov, area: w * h, teamCells };
}
export function table() {
  const rows = [];
  for (let h = 1; h <= 6; h++) for (let w = 1; w <= 6; w++) {
    const p = PAR.map(([px, py]) => probe(w, h, px, py));
    const survives = p.every((r) => r.cells > 0), anyVanish = p.some((r) => r.cells === 0);
    const minRecall = Math.min(...p.map((r) => r.recall)), maxFat = Math.max(...p.map((r) => r.cover / r.area));
    const faithfulAligned = p[0].recall === 1 && p[0].cover === p[0].area;
    rows.push({ w, h, p, survives, anyVanish, minRecall, maxFat, faithfulAligned });
  }
  return rows;
}
if (process.argv[1] && process.argv[1].endsWith('far_truth_table.mjs')) {
  const rows = table();
  if (process.argv.includes('--json')) console.log(JSON.stringify(rows));
  else for (const r of rows) console.log(`${r.w}x${r.h}`, r.p.map((q) => `${q.cells}:${Math.round(q.recall * 100)}/${Math.round(q.precision * 100)}`).join('  '), r.survives ? 'ALL' : 'VANISH@' + r.p.map((q, i) => (q.cells ? '' : i)).join(''), 'minR=' + Math.round(r.minRecall * 100), 'fat=' + r.maxFat.toFixed(2));
}

// Surface team stripe on a solid hull (6 thick in z): does the stripe's tint survive the far mesh? (rule: team*3 >= n per coarse cell)
export function tintProbe(s, dz, py) {
  const g = new VoxelGrid(8, 12, 6);
  for (let y = 0; y < 8; y++) for (let z = 0; z < 6; z++) for (let x = 0; x < 8; x++) g.set(x, 2 + y, z, V(0x808080));
  for (let y = 0; y < s; y++) for (let z = 6 - dz; z < 6; z++) for (let x = 0; x < 8; x++) g.set(x, 2 + py + y, z, T(0xffffff));
  const c = downsample2(g); let tinted = 0;
  for (let y = 0; y < c.sy; y++) if ((c.get(1, y, 2) >>> 24) & 2) tinted++;      // coarse x=1, outer coarse z layer
  return tinted;
}
export function tintTable() {
  const out = [];
  for (const dz of [1, 2]) for (let s = 1; s <= 4; s++) out.push({ dz, s, tinted: [0, 1].map((py) => tintProbe(s, dz, py)) });
  return out;
}
if (process.argv.includes('--tint')) for (const r of tintTable()) console.log(`stripe ${r.s} rows, ${r.dz} deep:`, 'even-origin tinted coarse rows', r.tinted[0], ' odd-origin', r.tinted[1]);
```

**Table (output of the generator at `4fe90f7`; columns = origin parity (px,py) = (0,0) (1,0) (0,1) (1,1); each cell `coarse-cells : recall% / precision%` of the interior slab, recall = share of the feature's fine voxels whose coarse cell is solid, precision = share of the coarse area that is feature; `minR` = worst recall, `fat` = worst coarse-area / feature-area).**

```
1x1 0:0/0  0:0/0  0:0/0  0:0/0 VANISH@0123 minR=0 fat=0.00
2x1 1:100/50  0:0/0  1:100/50  0:0/0 VANISH@13 minR=0 fat=2.00
3x1 1:67/50  1:67/50  1:67/50  1:67/50 ALL minR=67 fat=1.33
4x1 2:100/50  1:50/50  2:100/50  1:50/50 ALL minR=50 fat=2.00
5x1 2:80/50  2:80/50  2:80/50  2:80/50 ALL minR=80 fat=1.60
6x1 3:100/50  2:67/50  3:100/50  2:67/50 ALL minR=67 fat=2.00
1x2 1:100/50  1:100/50  0:0/0  0:0/0 VANISH@23 minR=0 fat=2.00
2x2 1:100/100  2:100/50  2:100/50  0:0/0 VANISH@3 minR=0 fat=2.00
3x2 2:100/75  2:100/75  2:67/50  2:67/50 ALL minR=67 fat=1.33
4x2 2:100/100  3:100/67  4:100/50  2:50/50 ALL minR=50 fat=2.00
5x2 3:100/83  3:100/83  4:80/50  4:80/50 ALL minR=80 fat=1.60
6x2 3:100/100  4:100/75  6:100/50  4:67/50 ALL minR=67 fat=2.00
1x3 1:67/50  1:67/50  1:67/50  1:67/50 ALL minR=67 fat=1.33
2x3 2:100/75  2:67/50  2:100/75  2:67/50 ALL minR=67 fat=1.33
3x3 3:89/67  3:89/67  3:89/67  3:89/67 ALL minR=89 fat=1.33
4x3 4:100/75  4:83/63  4:100/75  4:83/63 ALL minR=83 fat=1.33
5x3 5:93/70  5:93/70  5:93/70  5:93/70 ALL minR=93 fat=1.33
6x3 6:100/75  6:89/67  6:100/75  6:89/67 ALL minR=89 fat=1.33
1x4 2:100/50  2:100/50  1:50/50  1:50/50 ALL minR=50 fat=2.00
2x4 2:100/100  4:100/50  3:100/67  2:50/50 ALL minR=50 fat=2.00
3x4 4:100/75  4:100/75  4:83/63  4:83/63 ALL minR=83 fat=1.33
4x4 4:100/100  6:100/67  6:100/67  5:75/60 ALL minR=75 fat=1.50
5x4 6:100/83  6:100/83  7:90/64  7:90/64 ALL minR=90 fat=1.40
6x4 6:100/100  8:100/75  9:100/67  8:83/63 ALL minR=83 fat=1.50
1x5 2:80/50  2:80/50  2:80/50  2:80/50 ALL minR=80 fat=1.60
2x5 3:100/83  4:80/50  3:100/83  4:80/50 ALL minR=80 fat=1.60
3x5 5:93/70  5:93/70  5:93/70  5:93/70 ALL minR=93 fat=1.33
4x5 6:100/83  7:90/64  6:100/83  7:90/64 ALL minR=90 fat=1.40
5x5 8:96/75  8:96/75  8:96/75  8:96/75 ALL minR=96 fat=1.28
6x5 9:100/83  10:93/70  9:100/83  10:93/70 ALL minR=93 fat=1.33
1x6 3:100/50  3:100/50  2:67/50  2:67/50 ALL minR=67 fat=2.00
2x6 3:100/100  6:100/50  4:100/75  4:67/50 ALL minR=67 fat=2.00
3x6 6:100/75  6:100/75  6:89/67  6:89/67 ALL minR=89 fat=1.33
4x6 6:100/100  9:100/67  8:100/75  8:83/63 ALL minR=83 fat=1.50
5x6 9:100/83  9:100/83  10:93/70  10:93/70 ALL minR=93 fat=1.33
6x6 9:100/100  12:100/75  12:100/75  12:89/67 ALL minR=89 fat=1.33
```

Team stripes on a hull surface (`--tint`; `rows` = stripe height in voxels on the outer face, `deep` = layers; a coarse row is tinted iff `team*3 >= n`):

```
stripe 1 rows, 1 deep: even-origin tinted coarse rows 0  odd-origin 0
stripe 2 rows, 1 deep: even-origin tinted coarse rows 1  odd-origin 0
stripe 3 rows, 1 deep: even-origin tinted coarse rows 1  odd-origin 1
stripe 4 rows, 1 deep: even-origin tinted coarse rows 2  odd-origin 1
stripe 1 rows, 2 deep: even-origin tinted coarse rows 1  odd-origin 1
stripe 2 rows, 2 deep: even-origin tinted coarse rows 1  odd-origin 2
stripe 3 rows, 2 deep: even-origin tinted coarse rows 2  odd-origin 2
stripe 4 rows, 2 deep: even-origin tinted coarse rows 2  odd-origin 3
```

**Rules derived (these are the lint's design constants).**
- F1 `1x1` never survives. Survival at ALL FOUR parities holds iff `max(w,h) >= 3`; the four cross-sections that can vanish are `1x1 2x1 1x2 2x2` (`2x1` vanishes at odd x, `2x2` at parity (1,1) and is fat (200%) at (1,0),(0,1)); `2x2` is faithful only at (0,0).
- F2 Recall >= 60% at every parity holds for all other cross-sections except `4x1 1x4 4x2 2x4` (50% at the odd parity: the 4-long feature splits 2+2 over three cells). Worst fatness (coarse area / feature area) is 2.0, 1.33 for odd sizes >= 3 (`3x3` 1.33, `5x5` 1.28).
- F3 A one-voxel-thick sheet is the cross-section `Wx1`: it needs `W >= 3` (a rotor blade of 3 wide survives, a 2-wide blade vanishes at odd x). Round rotor discs 1-2 thick and >= 8 wide survive.
- F4 Surface team marking: a 1-deep stripe needs >= 3 rows (any parity) to keep a tinted coarse row; a 2-deep stripe survives at 1 row; a thinner stripe is lost. Tint therefore comes from whole tinted parts or tinted panels, never single-voxel piping.
- F5 Feature length does not matter (end cells are the only difference); orientation matters only through parity of the origin in the two perpendicular axes, so the lint measures the actual parity.

**Lint (`src/voxel/farlint.js` NEW, pure; CLI `tools/farlint.mjs [--era E|all]`; test `RA-T02`).** `farLint(model, opts) -> [{code, part, msg}]`, run by the builder test of every new model (and as a report-only audit of the 43 Ancient models, whose findings are grandfathered into `tests/fixtures/farlint_ancient.json`, never fixed).
- `FAR_LOSS`: for each part, every 6-connected component of >= 6 solid voxels must have recall >= 0.5 against `downsample2(part.grid)`; the part's decor (`meta.decor` list of part ids, e.g. antennas) is exempt.
- `FAR_FEATURE`: every entry of `meta.farKeep = [{part, box:[x0,y0,z0,x1,y1,z1] (inclusive fine voxels), min: 0.6, why}]` has recall >= `min`. Builders MUST declare one entry per defining feature: barrel, rotor blade/disc, wing membrane, horn, spear/pike, banner cloth, leg of a mech/insect, antenna that carries meaning.
- `FAR_TINT`: team-tinted share of the far mesh solid cells (count) >= 0.7 x the near share (count of F_TEAM voxels over solid) for the whole model, and >= 0.15 absolute for non-hum1 / 0.30 pooled for hum1 (the existing tint floors of `tests/beasts/builders.test.mjs` and `tools/tintcheck.mjs`, measured on the far mesh by the pixel test RA-T03).
- `FAR_FAT`: far solid-cell volume x 8 <= 2.2 x the near solid volume (no blobbing of lattices such as trebuchet frames).
- `FAR_TRIS`: `skin.trianglesFar <= class budget` (3.2) and `<= 0.33 x skin.triangles`.
- Silhouette arbiter (pixel test RA-T03, release tier in the exemplars, T-era for new models): render near and far orthographic side/top/front at 40 px model height; for each `farKeep` feature the far silhouette keeps >= 60% of the near silhouette PIXELS of the feature (feature pixels = pixels of the feature part drawn alone).

**The real switch rule (read in `battleview.js`, `game.js`, `cameras.js`).**
```
draw(u): far = d2cam(u) > (lodDist[tier] * lodScale)^2 * r.lodK2   OR   dxz2(u, engine.focus) > (shadowRadius * 1.05)^2
lodDist[tier]  = {potato 24, papyrus 36, marble 48, olympian 76}        // Game._applyTier; BattleView constructor default 56 is overwritten at Game construction
r.lodK2        = clamp(6000 / skin.triangles, 0.2, 1)                  // once per skin, _rec
lodScale       : tgt = clamp(sqrt(nearBudget / nearN), 0.35, 1);  lodScale += (tgt - lodScale) * min(1, dt * 2.5)   // every frame, nearN = sum of skin.nNear of the PREVIOUS draw
nearBudget[tier] = {potato 40, papyrus 70, marble 110, olympian 260}    // Game._applyTier (constructor default 140 is overwritten)
shadowRadius   = clamp(0.9 * camera.sdist + 22, 30, 70)                // CameraRig._apply; Engine default 55 -> ring 57.75; range 31.5 .. 73.5 u from the focus
```
Anim LOD (same loop): `lod 0` if `d2 < 1444` (38 u), `1` if `< 3760` (61 u), else `2`.

**Look-dev distances (computed from the rule; pixels per u at 1080p, FOV 48 = 1213 / d).** A skin of T near triangles switches to the far mesh at `D = lodDist * sqrt(lodK2)`; in a crowd (lodScale 0.35) at `0.35 D`:

| near tris | lodK2 | Papyrus D | Marble D | Marble crowd | Olympian D | Potato D |
|---|---|---|---|---|---|---|
| <= 6 K (infantry) | 1.0 | 36 | 48 | 16.8 | 76 | 24 |
| 7.5 K | 0.8 | 32.2 | 42.9 | 15.0 | 68 | 21.5 |
| 12 K (light vehicle, mech) | 0.5 | 25.5 | 33.9 | 11.9 | 53.7 | 17 |
| 18 K (tank class) | 0.333 | 20.8 | 27.7 | 9.7 | 43.9 | 13.9 |
| >= 30 K (siege, boss) | 0.2 (floor) | 16.1 | 21.5 | 7.5 | 34 | 10.7 |

**Protocol (binding for every look-dev contact sheet, tool `tools/contact.mjs`/`shot_beasts.mjs` extended with `--far-at D`).** Each model is rendered NEAR at 12 u and FAR at: its own Marble `D`, its crowd value `0.35 D`, the focus-ring radii 31.5 and 57.75 u (unit at that distance from the focus, camera anywhere), and 80 u. At 80 u an infantry model is 44 px tall (15.2 px/u at 80 u; 40 px at 88 u, the plan's figure). The sheet reports far triangles, `farKeep` recalls and the tint share. A model whose defining feature fails at ANY of these distances is not accepted, whatever the near sheet shows.

### 3.2 Rig catalogue, voxel sizes, budgets, crew

**Rigs (11 new; `manifest.rigs` of AR 3.3).** Rig ids match `^[a-z][a-z0-9]*[0-9]$`; the rig of a unit is `def.model.rig` (mandatory for non-hum1/quad1 defs: registry V05) and `RIG_BY_ID` is never extended.

| rig | era | voxel | parts | layer / look | builders (examples; unit rosters decide) | crew | far class |
|---|---|---|---|---|---|---|---|
| trebuchet1 | medieval | 0.1 | 9 | ground, siege | trebuchet, mangonel (arm shortened), counter-trebuchet | 3 lite (+18) | siege |
| ram1 | medieval | 0.1 | 6 (+2 tower variant) | ground, siege | battering ram, Rolling Keep (tower + drawbridge) | 4 lite (+24) | siege |
| dragon1 | medieval | 0.1 | 18 (wyvern 14) | air, flier | Cinderwyrm (boss), wyvern | none | boss |
| gun1 | modern | 0.1 | 8 (mortar 5, HMG 6) | ground, siege | howitzer, AT gun, mortar, HMG, AA gun | 2-3 lite | crew-gun |
| tank1 | modern | 0.15 | 9 | ground, vehicle | main tank, light tank, tank destroyer (builder params) | none | vehicle |
| car1 | modern | 0.1 | 8 | ground, vehicle | jeep, APC (+`hatch`), mower, behemoth (scale) | 1-2 lite | vehicle |
| heli1 | modern | 0.15 | 12 | air | gunship, transport | none | air |
| drone1 | modern | 0.15 | 6 | air | recon quad-copter | none | air |
| hover1 | scifi | 0.15 | 11 | hover (floating model) / air for drone and dropship builders | hover tank, skiff, drone, dropship | none | vehicle |
| insect1 | scifi | 0.1 | 11 (queen 13) | ground | skitterer, brood warrior, queen | none | alien |
| walker1 | scifi | 0.1 | 10 | ground, vehicle (tag `mech`) | walker, heavy walker (scale 1.25 by `def.scale`), boss walker | none | mech |

Reused: `hum1` (all infantry, power armour = `def.scale` 1.35 + part modules, the single suited giant = `def.scale` 2.4; plan D21: at most one), `hum_lite` (crew), `quad1` (mounts; three new species rows 3.4), `catapult1`/`ballista1` part ids are NOT reused for Medieval siege (trebuchet1 replaces the throw geometry).

**Voxel size.** 0.1 for every rig that carries `hum_lite` crew or sits beside hum1 at the same scale (composeModels requires one size per model); 0.15 for tank1/heli1/drone1/hover1 (crew-free; 2.25x fewer faces per surface; SP-3 may revert any of them to 0.1 if its readability metric fails). Far mesh uses `2 x`.

**Budgets per class (acceptance numbers for the model test; Ancient measured: infantry 3.6-6.9 K near / <= 1.9 K far, elephant 55 K / 14.2 K, chariot 32 K / 8.7 K).**

| class | parts | near tris | far tris | voxels | note |
|---|---|---|---|---|---|
| infantry (hum1) | <= 16 | <= 7 K | <= 2 K | 600-6000 | existing U2 rules |
| crew-gun (gun1 + crew) | <= 30 | <= 24 K | <= 7 K | <= 40 K | howitzer 8 + 3x6 = 26 |
| vehicle (tank1, car1, hover1, walker1 as 'mech') | <= 24 | <= 22 K | <= 6 K | <= 60 K | plan: vehicle far <= 6 K |
| air (heli1, drone1) | <= 14 | <= 20 K | <= 6 K | <= 30 K | |
| siege (trebuchet1, ram1 + crew) | <= 36 | <= 30 K | <= 8 K | <= 100 K | lattice frames: near tris dominate |
| alien (insect1, queen) | <= 14 | <= 14 K / queen 30 K | <= 4 K / 9 K | <= 40 K | |
| boss (dragon1, heavy walker, queen) | <= 24 | <= 55 K | <= 15 K | <= 140 K | one non-scaled-hum1 silhouette per era boss |

Hard limits on every model (existing tests): parts 5..48, height < 9.0 u, footprint x < 6 u and z < 10 u, voxels 250..140000, lowest voxel y in (-0.051, 0.11) (hover craft exempt through `meta.hover`), team-tint floors above. All tables below were checked by a script that builds `ModelDef`s with fully filled part boxes and applies `modelBounds` (bounds are upper bounds of the real, lattice-shaped models).

**Crew budget (lite crew = `buildHumLite`-geometry figure, 6 parts `body head armUL armUR legUL legUR`, built by `src/content/shared/crew_lite.js` NEW: same grids and pivots, era hats and tools `rifle|shell|none`, team-tinted tunic).**

| model | rig parts | crew | total | margin to 48 |
|---|---|---|---|---|
| trebuchet | 9 | 3 x 6 | 27 | 21 (a 4th crew 33; the Ancient-style full crew of 10-13 parts would be 39..48) |
| rolling keep (ram1 tower) | 8 | 3 x 6 | 26 | 22 |
| battering ram | 6 | 4 x 6 | 30 | 18 |
| howitzer | 8 | 3 x 6 | 26 | 22 |
| AT gun / AA gun | 8 | 2 x 6 | 20 | 28 |
| mortar | 5 | 2 x 6 | 17 | 31 |
| HMG | 6 | 2 x 6 | 18 | 30 |
| jeep with gunner and driver | 8 | 2 x 6 | 20 | 28 |
| APC (hatch part) | 9 | 2 x 6 | 21 | 27 |
| tank1 | 9 | 0 | 9 | 39 (SP-2 also measures one commander figure: 15 parts) |

Test `RA-T04` asserts total <= 48 for every builder variant x crew count 0..max, and that the constructor never throws.


### 3.3 Part tables (ids are frozen once shipped; voxel units; `origin` is the child's pivot relative to the PARENT's pivot; `rest` = static rotation rx,ry,rz in rad)

Generated by the same script that validated the limits (every row below is also the input of test `RA-T04`, which builds each rig through its builder and compares ids, parents, grids, pivots, origins within 1 vox; builders fill the grids with hollow/lattice shapes, so voxel and triangle counts are measured, not taken from the boxes). Wings of `dragon1` are folded by the builder (`wingU*` rest chosen so that |x| <= 2.9 u; the row shows the indicative value); the footprint lint decides. Attach points (voxel coords in the part grid): every crewed rig has `crew_1..crew_N`; every shooter has `muzzle` (gun1 `barrel` tip, tank1 `gun` tip, car1/hover1/walker1 `gun`/`armL` tip, heli1 `gun`, dragon1 `head` mouth, trebuchet1 `sling` tip); tank1/car1/heli1 `hatch`/`cockpit` carry the painted commander.

Row notation: `xL/R` stands for the two parts `xL` and `xR` (a prefix letter F/B before L/R is part of `x`, so `wheelFL/R` = `wheelFL` + `wheelFR`); `+-n` mirrors the sign of the origin x for the R part; `(R mirrored)` mirrors rest ry/rz.

**trebuchet1** (medieval, voxel 0.1 u, 9 parts; part-box bounds x 3.6 / y 8.43 / z 7.77 u, lowest y 0, highest y 8.43)

| part | parent | grid | pivot | origin | rest |
|---|---|---|---|---|---|
| frame | root | 36,50,70 | 18,0,35 | 0,0,0 | 0 |
| wheelL/R | frame | 3,20,20 | 1.5,10,10 | +-16,10,-22 | 0 |
| arm | frame | 10,76,12 | 5,22,6 | 0,46,4 | -0.9,0,0 |
| cw | arm | 16,18,14 | 8,16,7 | 0,-20,0 | 0.9,0,0 |
| sling | arm | 6,22,6 | 3,20,3 | 0,52,0 | 0.9,0,0 |
| stone | sling | 12,12,12 | 6,6,6 | 0,-20,0 | 0 |
| winch | frame | 14,14,24 | 7,7,12 | 0,16,-30 | 0 |
| pennant | frame | 3,14,20 | 1.5,0,2 | 0,50,-2 | 0 |

**ram1** (medieval, voxel 0.1 u, 6 parts; part-box bounds x 3 / y 3.2 / z 7.2 u, lowest y 0, highest y 3.2)

| part | parent | grid | pivot | origin | rest |
|---|---|---|---|---|---|
| frame | root | 28,22,60 | 14,0,30 | 0,0,0 | 0 |
| wheelL/R | frame | 3,14,14 | 1.5,7,7 | +-12,7,-14 | 0 |
| roof | frame | 30,10,58 | 15,0,29 | 0,22,0 | 0 |
| log | frame | 8,22,64 | 4,20,32 | 0,20,0 | 0 |
| head | log | 10,10,8 | 5,5,4 | 0,-15,36 | 0 |

**dragon1** (medieval, voxel 0.1 u, 18 parts; part-box bounds x 3.21 / y 8.7 / z 8.74 u, lowest y 0.1, highest y 8.8)

| part | parent | grid | pivot | origin | rest |
|---|---|---|---|---|---|
| body | root | 24,22,34 | 12,0,17 | 0,18,0 | 0 |
| neckA | body | 10,14,12 | 5,3,3 | 0,14,15 | -0.25,0,0 |
| neckB | neckA | 9,12,12 | 4.5,3,3 | 0,9,8 | -0.3,0,0 |
| head | neckB | 14,12,18 | 7,3,3 | 0,8,8 | 0.5,0,0 |
| jaw | head | 12,4,12 | 6,2,2 | 0,-3,6 | 0 |
| crest | head | 6,8,16 | 3,0,8 | 0,10,5 | 0 |
| tailA | body | 10,10,14 | 5,5,2 | 0,12,-15 | 0 |
| tailB | tailA | 8,8,12 | 4,4,2 | 0,0,-12 | 0 |
| tailC | tailB | 6,6,12 | 3,3,2 | 0,0,-10 | 0 |
| tailTip | tailC | 8,8,6 | 4,4,1 | 0,0,-10 | 0 |
| wingUL/R | body | 4,20,10 | 2,2,5 | +-11,20,4 | 0,-2.3,0 (R mirrored) |
| wingML | wingUL | 3,34,30 | 1.5,2,1 | 0,18,2 | 0 |
| wingMR | wingUR | 3,34,30 | 1.5,2,1 | 0,18,2 | 0 |
| legFL/R | body | 8,20,9 | 4,19,4 | +-9,2,11 | 0 |
| legBL/R | body | 9,20,11 | 4.5,19,5 | +-10,2,-10 | 0 |

**gun1** (modern, voxel 0.1 u, 8 parts; part-box bounds x 2.9 / y 2.6 / z 7 u, lowest y 0, highest y 2.6)

| part | parent | grid | pivot | origin | rest |
|---|---|---|---|---|---|
| carriage | root | 28,12,40 | 14,0,20 | 0,0,0 | 0 |
| wheelL/R | carriage | 3,16,16 | 1.5,8,8 | +-13,8,-2 | 0 |
| shield | carriage | 22,14,3 | 11,0,1.5 | 0,12,12 | 0 |
| cradle | carriage | 8,8,14 | 4,4,5 | 0,18,4 | 0 |
| barrel | cradle | 5,5,44 | 2.5,2.5,6 | 0,0,8 | 0 |
| trailL/R | carriage | 4,4,26 | 2,2,0 | +-3,3,-18 | -0.1,0.3,0 (R mirrored) |

**tank1** (modern, voxel 0.15 u, 9 parts; part-box bounds x 3.9 / y 3.75 / z 6.45 u, lowest y 0, highest y 3.75)

| part | parent | grid | pivot | origin | rest |
|---|---|---|---|---|---|
| hull | root | 12,7,28 | 6,0,14 | 0,5,0 | 0 |
| trackL/R | hull | 5,8,34 | 2.5,0,17 | +-8.5,-5,0 | 0 |
| cleatL | trackL | 2,8,34 | 1,0,17 | 3.5,0,0 | 0 |
| cleatR | trackR | 2,8,34 | 1,0,17 | -3.5,0,0 | 0 |
| turret | hull | 10,5,14 | 5,0,7 | 0,7,-2 | 0 |
| gun | turret | 4,4,24 | 2,2,2 | 0,2,6 | 0 |
| hatch | turret | 3,2,3 | 1.5,0,1.5 | 2,5,-2 | 0 |
| antenna | turret | 1,8,1 | 0.5,0,0.5 | -4,5,-5 | 0 |

**car1** (modern, voxel 0.1 u, 8 parts; part-box bounds x 3.4 / y 2.5 / z 5.35 u, lowest y 0, highest y 2.5)

| part | parent | grid | pivot | origin | rest |
|---|---|---|---|---|---|
| chassis | root | 26,9,48 | 13,0,24 | 0,6,0 | 0 |
| wheelFL/R | chassis | 4,12,12 | 2,6,6 | +-15,0,15 | 0 |
| wheelBL/R | chassis | 4,12,12 | 2,6,6 | +-15,0,-15 | 0 |
| cab | chassis | 22,10,20 | 11,0,10 | 0,9,-8 | 0 |
| turret | chassis | 10,5,10 | 5,0,5 | 0,9,10 | 0 |
| gun | turret | 3,3,16 | 1.5,1.5,1.5 | 0,3,5 | 0 |

**heli1** (modern, voxel 0.15 u, 12 parts; part-box bounds x 5.4 / y 3.6 / z 8.77 u, lowest y 0, highest y 3.6)

| part | parent | grid | pivot | origin | rest |
|---|---|---|---|---|---|
| body | root | 12,12,30 | 6,0,15 | 0,5,0 | 0 |
| cockpit | body | 10,7,10 | 5,0,5 | 0,5,9 | 0 |
| tailBoom | body | 5,5,22 | 2.5,2.5,2 | 0,7,-13 | 0 |
| tailRotor | tailBoom | 1,10,10 | 0.5,5,5 | 3,0,-18 | 0 |
| mast | body | 3,6,3 | 1.5,0,1.5 | 0,12,2 | 0 |
| mainBlade | mast | 36,1,36 | 18,0,18 | 0,6,0 | 0 |
| rotorDisc | mast | 34,2,34 | 17,0,17 | 0,5,0 | 0 |
| skidL/R | body | 2,2,30 | 1,0,15 | +-6,-5,0 | 0 |
| gun | body | 3,3,10 | 1.5,1.5,1.5 | 0,2,14 | 0 |
| podL/R | body | 4,4,12 | 2,2,6 | +-9,3,2 | 0 |

**drone1** (modern, voxel 0.15 u, 6 parts; part-box bounds x 3.75 / y 0.9 / z 3.75 u, lowest y 0, highest y 0.9)

| part | parent | grid | pivot | origin | rest |
|---|---|---|---|---|---|
| body | root | 10,5,10 | 5,0,5 | 0,0,0 | 0 |
| rotorFL/R | body | 9,1,9 | 4.5,0,4.5 | +-8,5,8 | 0 |
| rotorBL/R | body | 9,1,9 | 4.5,0,4.5 | +-8,5,-8 | 0 |
| eye | body | 4,3,2 | 2,1.5,0 | 0,2,5 | 0 |

**hover1** (scifi, voxel 0.15 u, 11 parts; part-box bounds x 3.6 / y 2.25 / z 5.4 u, lowest y 0.45, highest y 2.7)

| part | parent | grid | pivot | origin | rest |
|---|---|---|---|---|---|
| hull | root | 24,8,34 | 12,0,17 | 0,5,0 | 0 |
| canopy | hull | 10,5,12 | 5,0,6 | 0,8,6 | 0 |
| padFL/R | hull | 6,2,6 | 3,2,3 | +-9,0,11 | 0 |
| padBL/R | hull | 6,2,6 | 3,2,3 | +-9,0,-11 | 0 |
| turret | hull | 10,5,10 | 5,0,5 | 0,8,-6 | 0 |
| gun | turret | 3,3,18 | 1.5,1.5,1.5 | 0,3,6 | 0 |
| finL/R | hull | 2,8,10 | 1,0,5 | +-11,5,-14 | 0 |
| engine | hull | 8,6,4 | 4,3,0 | 0,3,-17 | 0 |

**insect1** (scifi, voxel 0.1 u, 11 parts; part-box bounds x 2.05 / y 2.79 / z 5.3 u, lowest y 0.01, highest y 2.8)

| part | parent | grid | pivot | origin | rest |
|---|---|---|---|---|---|
| body | root | 14,9,20 | 7,0,10 | 0,15,0 | 0 |
| head | body | 11,8,10 | 5.5,0,2 | 0,2,10 | 0 |
| jawL/R | head | 3,3,10 | 1.5,1.5,1 | +-3,1,8 | 0 |
| abdomen | body | 14,12,22 | 7,0,18 | 0,1,-8 | 0 |
| legFL/R | body | 4,18,4 | 2,17,2 | +-8,1,7 | 0,0,-0.5 (R mirrored) |
| legML/R | body | 4,18,4 | 2,17,2 | +-8,1,0 | 0,0,-0.5 (R mirrored) |
| legBL/R | body | 4,18,4 | 2,17,2 | +-8,1,-7 | 0,0,-0.5 (R mirrored) |

**walker1** (scifi, voxel 0.1 u, 10 parts; part-box bounds x 3.5 / y 7.6 / z 5 u, lowest y 0, highest y 7.6)

| part | parent | grid | pivot | origin | rest |
|---|---|---|---|---|---|
| hull | root | 26,18,30 | 13,0,15 | 0,40,0 | 0 |
| cockpit | hull | 14,10,12 | 7,0,6 | 0,16,10 | 0 |
| legL/R | hull | 6,42,7 | 3,40,3.5 | +-9,0,0 | 0 |
| footL | legL | 8,4,14 | 4,0,4 | 0,-38,2 | 0 |
| footR | legR | 8,4,14 | 4,0,4 | 0,-38,2 | 0 |
| armL/R | hull | 5,5,26 | 2.5,2.5,5 | +-15,10,6 | 0 |
| pack | hull | 16,14,10 | 8,0,5 | 0,10,-18 | 0 |
| antenna | hull | 2,18,2 | 1,0,1 | 8,18,-8 | 0 |

**Per-rig notes.** `trebuchet1`: `cw` hangs from the short arm end and counter-rotates (`rest +0.9` cancels the arm's `-0.9`); `winch` rolls in `reload`; `pennant` is team-tinted cloth (F_TEAM, >= 3 rows) swaying by clip. `ram1`: `log` is a pendulum (pivot at the chain top), `strike_ram` swings `rx` +-0.35 rad; the tower variant adds `tower` (24,44,26) and `bridge` (20,3,28, hinged). `dragon1`: membranes `wingM*` are 3 voxels thick (the plan's "wing >= 3 voxels" of q1_content Q29; survives at every parity by F1); wyvern = drop `crest tailTip legFL legFR`. `gun1`: `barrel` recoils by clip translation along -z (`meta.recoil`), `cradle` carries the elevation (`aimParts` pitch), `shield` is a team-tinted panel (>= 3 rows); mortar keeps `carriage barrel cradle trailL trailR`, HMG adds a tripod instead of `shield wheels`. `tank1`: `cleatL/R` are the tread shells (ridges every 2 voxels along z, 2 voxels thick so the far mesh keeps them; scroll = translation along z by `dist mod 2` voxels, SP-2 decides fenders vs. period); `antenna` is `decor` (1x1, vanishes far on purpose). `car1`: `wheel*` roll through the existing `applyWheels` rule; `turret/gun` optional (mower/runabout builders omit them: parts 6). `heli1`: `mainBlade` = two 3-wide blades (survive far), `rotorDisc` = the dithered blur disc (3.15); `mast`..`rotorDisc` chain spins about Y. `drone1`: rotors are 1-thick discs of >= 9 wide (F3). `hover1`: pads are `F_GLOW|F_PULSE` voxels; `meta.hover = {alt: 0.45}` (lowest voxel) and the Animator adds the bob. `insect1`: six rigid legs (4x4 cross-section, F1-safe) in tripod phases; queen adds `sac` (24,18,30) and `crown`. `walker1`: rigid legs (`gait.plantRigidLeg`), `hull` pitch/roll sway, `armL/armR` aim independently (`aimParts`), `footL/R` are static children.

### 3.4 Species, humanoid extensions, new weapon styles

**quad1 species (`clips/quad1.js QUAD_SPECIES` appended, rows with the existing fields `L zF zB hw bodyY pace Dk neck tail`).** Each species adds 7 clips named `<id>_walk/_trot/_gallop/_idle/_death_back/_death_front/_death_spin` (the existing `pre + gait` convention; DEFAULT_META rows with `dur = D*Dk`, `speedRef = stride/D` from `GAITS`):

| id | era | use | L | zF | zB | hw | bodyY | pace | Dk | neck | tail |
|---|---|---|---|---|---|---|---|---|---|---|---|
| costume | medieval | pageant dragon float (horse clips, two out-of-step boot pairs) | 1.1 | 0.8 | -0.8 | 0.5 | 0.95 | true | 1.05 | [0,0] | 0.8 |
| scuttler | scifi | alien hound pack | 0.9 | 0.6 | -0.6 | 0.4 | 0.7 | false | 0.70 | [0,0] | 1.2 |
| grazer | scifi | heavy alien beast / mount | 1.5 | 1.0 | -1.0 | 0.6 | 1.3 | true | 1.30 | [0.1,0] | 0.6 |

Species builders reuse the part ids of `beasts/quad1.js assembleQuad` (`body neck head tail legFL/FR/BL/BR` + optional children), so the 13-part PARTS row of `clips.test.mjs` is unchanged.

**hum1 extensions.** No canonical part is added (the plan's optional `padL/padR/pack/tasset` would change `DIM`/`PART_ORDER` and the part count of every Ancient model); power armour is `def.scale` 1.35 + bulky helm/shoulder/armour modules, the suited giant `def.scale` 2.4 (precedent: cyclops 2.2). SP-1 fallback 3 may request the extra parts as a deliberate AP row. Gun parts are `mains` entries with `meta {style, len, noClamp: true, reach: 1.2, twoHanded: true, grip, clipMap, back}`; `compileSoldier` copies `meta.clipMap` of the main-hand part to `model.meta.clipMap` when present (AP-C03, OI: no Ancient part has one) so `idle/idle_combat/walk/jog/run/rout` resolve to `idle_gun/walk_gun/jog_gun/run_gun` through the existing `resolveClip` path.

**Weapon styles** (append to `STYLE_K` in `parts/_registry.js`, `STYLE_CODE`/`STYLE_NAMES`/`AIM`/`SHAFT_STYLE` in `animator.js`, `READY_ELEVATION` in `tools/contact_pose.js`; `sim/stats.js` classes are SIM's, M2/AR9). AIM rows are `[elevation rad above the horizontal, azimuth rad (+ left), weight]` in the unit frame per clip class (`1 idle, 2 ready, 3 move, 4 strike (no aim track), 5 shoot, 6 down, 7 other`), same format as the shipped `thrust shoot throw cast` rows. Initial values; SP-1 may move each number by <= 0.15 rad (outside that, the style is re-specified by amendment).

| style | code | STYLE_K | SHAFT | idle | ready | move | strike | shoot | down | other | clip | whileMoving |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| rifle | 8 | 0.9 | no | .35,.12,1 | .60,.10,1 | .75,.10,1 | .10,0,1 | 0,0,1 | 0,0,0 | .50,.10,1 | shoot_rifle / shoot_burst | no |
| pistol | 9 | 0.8 | no | .20,.05,1 | .55,.05,1 | .70,.05,1 | .05,0,1 | .02,0,1 | 0,0,0 | .40,.05,1 | shoot_pistol | yes |
| mg | 10 | 0.9 | no | .25,.10,1 | .35,.08,1 | .45,.08,1 | .05,0,1 | 0,0,1 | 0,0,0 | .30,.08,1 | shoot_mg | no |
| rocket | 11 | 0.9 | yes | .60,.10,1 | .75,.08,1 | .85,.08,1 | .10,0,1 | .12,0,1 | 0,0,0 | .70,.10,1 | shoot_rocket | no |
| xbow | 12 | 0.8 | no | .50,.10,1 | .70,.10,1 | .80,.10,1 | .10,0,1 | .02,0,1 | 0,0,0 | .60,.10,1 | shoot_xbow | no |
| beam | 13 | 0.9 | no | .45,.10,1 | .60,.10,1 | .70,.10,1 | .10,0,1 | 0,0,1 | 0,0,0 | .50,.10,1 | cast_beam | no |
| launcher | 14 | 0.9 | yes | .60,.10,1 | .75,.08,1 | .85,.08,1 | .10,0,1 | .35,0,1 | 0,0,0 | .70,.10,1 | throw (grenade) / shoot_rocket | no |
| sniper | 15 | 0.9 | no | .50,.10,1 | .70,.10,1 | .90,.10,1 | .10,0,1 | 0,0,1 | 0,0,0 | .60,.10,1 | shoot_sniper | no |

`rangedClip(def)` is SIM's (`def.ranged.clip` per M2); `whileMoving` is data of the weapon class. Aim tracks inside the clips (`aim: [[t, e, a, w, twist]]`) override the table; every gun clip authors its own elevation ramp. **Aim pitch gain:** for class 5 the elevation adds `gain * clamp(extra.aim.pitch, -0.4, 0.5)` with `gain = {rifle 1, pistol 1, mg 0.6, rocket 0.5, xbow 1, beam 1, launcher 0.5, sniper 1}` (BattleView computes `extra.aim.pitch` from the target's height difference; absent => 0, Ancient identical). `STYLE_K` rows only affect the weapon-length clamp (skipped by `noClamp`) and `reach`; gun parts state `reach` explicitly (the `naturalReach` shoot rule is `1.2`).


### 3.5 Clips: new ids, DEFAULT_META rows, per-rig sets, ClipLib ownership, timing contract

**Registration.** New clip modules live in `src/anim/clips/<era>/*.js` (NEW, AP-A03); `src/anim/clips/eras.js` is the fixed import array (order = ERA_ORDER, inside an era the order below) and `boot.js` imports it after `clips/index.js`; each module uses `const def = defineFor('<era>')` (a thin wrapper that sets `spec.era`, AR 3.7.1). Order: medieval `hum1_xbow trebuchet1 ram1 dragon1 species_costume`; modern `hum1_guns hum1_crew hum1_react gun1 tank1 car1 heli1 drone1`; scifi `hum1_energy hover1 insect1 walker1 species_alien`. 166 new baked clips (Medieval 45, Modern 71, Sci-Fi 50); at the measured 0.63 ms/clip that is 28 / 45 / 32 ms, so `ensureEra('scifi')` (closure ancient+modern+scifi, Ancient already baked) costs about 77 ms against the 150 ms Node ceiling of AR; raw clip source about +190 KB, baked typed arrays about +0.55 MB RAM.

**New plain ids and their DEFAULT_META rows (appended to `clips.js`; `dur`/`hit` in s; `~` = no hit; `loop` rows carry `speedRef` u/s where they are gaits).** Every id below was checked against the 93 plain and 157 qualified ids of the Ancient bake (no collision; fixture `tests/fixtures/ancient_clip_ids.json` is generated from the baseline worktree).

```
# attack / sim-requestable ids: exactly ONE registrant each (RA-T06)
shoot_rifle   1.00 0.45   shoot_pistol 0.70 0.30   shoot_burst 0.90 0.25   shoot_mg     1.20 0.30   shoot_sniper 1.60 0.90   shoot_rocket 1.30 0.55   (modern, hum1)
reload_gun    1.60 ~ fit  (modern, hum1)
shoot_xbow    1.10 0.50   fire_trebuchet 2.00 1.10  strike_claw 0.90 0.40   strike_tail  1.10 0.55   breathe      1.60 0.70                    (medieval)
fire_cannon   1.00 0.40   fire_mortar  0.80 0.30   fire_hmg    1.20 0.30   fire_tank    0.90 0.35   fire_car     1.00 0.30   fire_heli 0.80 0.25  fire_drone 0.50 0.15   (modern)
cast_beam     1.20 0.35   fire_hover   0.90 0.30   fire_walker 1.30 0.50   strike_pincer 0.60 0.25  strike_stamp 1.20 0.60                    (scifi)
# animator-only ids (never published by the sim)
idle_gun 2.40 loop   walk_gun 0.80 loop 2.4   jog_gun 0.68 loop 3.8   run_gun 0.64 loop 5.6   crew_load 1.40   crew_fire 0.90 (hit 0.40)   crew_aim 1.60 loop   crew_seat 2.00 loop   (modern, hum1)
hover 1.20 loop   fly 0.90 loop 6.0   fly_fast 0.70 loop 10.0                                                                                      (medieval, dragon1)
# death generics: rig-qualified, read WITH a rig (RIG_LINGER), plain slot never read by the sim
death_shot 1.00  death_blast 1.30  death_ko 1.40  death_wreck 2.00  death_burn 1.80  death_crash 2.40         (modern)
death_collapse 2.00  death_fall 2.60                                                                           (medieval)
death_topple 2.80  death_melt 1.60  death_zap 1.20                                                              (scifi)
# species: 21 ids  costume_* scuttler_* grazer_*  (walk trot gallop idle death_back death_front death_spin), rows from QUAD_SPECIES (dur = D*Dk, speedRef = stride/D)
```
Burst legality (M `E_BURST`: `hit + (burst-1)*gap + 0.1 <= cd`, evaluated with these rows): `shoot_burst` burst 3 gap 0.08 needs cd >= 0.51; `shoot_mg`/`fire_hmg` burst 8 gap 0.1 needs cd >= 1.10; `cast_beam` burst 3 gap 0.1 needs cd >= 0.65; single-shot clips need `cd >= 0.8` (M fire-rate contract).

**Per-rig clip sets (rig-qualified `rig:id`; "x" variants of existing plain ids share their timing within the tolerances below; every rig has `hit_front` + `hit_back` and >= 3 deaths).**

| rig | clips | n |
|---|---|---|
| trebuchet1 | idle idle_combat walk fire_trebuchet reload hit_front hit_back death_collapse death_burn death_blast | 10 |
| ram1 | idle idle_combat walk strike_ram hit_front hit_back death_collapse death_burn death_blast | 9 |
| dragon1 | idle idle_combat walk run hover fly fly_fast strike_bite strike_claw strike_tail breathe taunt hit_front hit_back stagger death_fall death_burn death_blast | 18 |
| gun1 | idle idle_combat walk fire_cannon fire_mortar fire_hmg reload hit_front hit_back death_wreck death_blast death_burn | 12 |
| tank1 | idle idle_combat walk run fire_tank reload hit_front hit_back death_wreck death_blast death_burn | 11 |
| car1 | idle idle_combat walk run fire_car hit_front hit_back death_wreck death_blast death_burn | 10 |
| heli1 | idle idle_combat walk run fire_heli hit_front hit_back death_crash death_blast death_burn | 10 |
| drone1 | idle idle_combat walk run fire_drone hit_front hit_back death_crash death_blast death_burn | 10 |
| hover1 | idle idle_combat walk run fire_hover hit_front hit_back death_wreck death_blast death_zap | 10 |
| insect1 | idle idle_combat walk run strike_bite strike_pincer hit_front hit_back stagger death_back death_melt death_burn | 12 |
| walker1 | idle idle_combat walk run fire_walker strike_stamp hit_front hit_back stagger death_topple death_blast death_zap | 12 |
| hum1 (new) | modern: the 18 gun/crew/death ids above; medieval `shoot_xbow`; scifi `cast_beam death_zap` (21 hum1 clips; hum1 total 58 -> 79) | 21 |
| quad1 species | `costume_*` (medieval), `scuttler_*` `grazer_*` (scifi) | 21 |

Loop rules unchanged (loop seam <= max(0.12, 1.6 x max step)); non-loop gait speeds `speedRef` of `walk/run` variants equal the base values of the rig's design speed; the A4 foot-slide test (<= 20%) runs on `insect1` (tripod legs), `walker1` (rigid legs) and the new quad species; `tank1`/`car1` wheel/tread rows run the wheel-roll test.

**ClipLib ownership rules (q3_engine 5 and 33; rules of `clips.js:76-115` restated, tests in section 4).**
1. R-OWN-1: a plain id belongs to the first registering rig, except `hum1` which always overwrites; DEFAULT_META ids start with owner ''. A NEW hum1 id may not equal ANY of the 93 Ancient plain ids (it would silently re-own the slot: the reload collision of q1_content Q13 is why the gun reload is `reload_gun`).
2. R-OWN-2: every NEW id the sim can request (`strike_<style>`, `def.ranged.clip`, `reload_gun`, ability clips; the `# attack` block above) has exactly ONE registrant. Death ids and animator-only ids are exempt (read with a rig / never read by the sim).
3. R-OWN-3: shared Ancient ids (`strike_ram` on chariot1+trojan1, `launch` on hum1+catapult1+ballista1, `shoot_bow` on hum1+chariot1, measured) are grandfathered by the fixture; any NEW registrant of a shared id must match the plain slot's `hit` within 0.1 s and `dur` within max(0.1 s, 5%) (insect1/dragon1 `strike_bite` = 0.55/0.22 like quad1; ram1 `strike_ram` = 0.9/0.4).
4. R-OWN-4: every new plain id has a DEFAULT_META row and the baked clip must meet it (below); `DEFAULT_META` is a fallback that no registered def may use (test iterates all defs).
5. R-OWN-5: the digest of `{plain id -> owner, meta}` (sorted JSON) is identical for every order of entering the same set of eras, and `ensureEra` never calls `ClipLib.reset()` (a test-only helper; grep test).
6. R-OWN-6: registering a clip bumps `ClipLib.version`; a `World` asserts it constant for the battle (spec/M M0).

**Timing contract.** New attack ids: baked `dur` within +-5% of the DEFAULT_META row, `hit` within +-0.03 s (the plan's rate-limiting rule applied to all new attack clips; Ancient ids keep the existing +-25% / +-0.06 s test). `registry.verify()` evaluates `E_BURST` with the baked meta. `reload_gun` carries `meta.fit = true`: BattleView passes `extra.fitDur = u.stateDur` while `u.anim.clip === 'reload_gun'` and the Animator samples at `t * clamp(clip.dur / fitDur, 0.35, 2.4) / rate` (the sim plays the clip at rate 1 for `reload` seconds, M startReload), so the visible reload ends when the ammo refills. Per-round recoil pulses are render-side: one per `projectile_launch` (fields `src srcDef round`), `extra.recoil` 0..1 decaying with `tau = 0.09 s`, applied through `meta.recoil` (3.6). Tests compare the sim fire rate of six weapon classes with baked and DEFAULT_META clips (M `S31`, RA supplies the clips).

### 3.6 Model and Animator metas (exact schemas; every field optional, absent = Ancient behaviour)

```
model.meta = {
  rig: 'tank1', kind, species?, weaponStyle?, clipMap?: {id: id},                      // existing
  driven:  [{ part, axis:'x'|'y'|'z', mode:'dist'|'time'|'speed', k?, rps?, rpsMin?, rpsMax?, phase?: 0..1,
              translate?: {axis:'x'|'y'|'z', period: voxels},        // tread shells: offset = (dist mod period) voxels, no rotation
              lodMin?: 0|1|2, lodMax?: 0|1|2,                        // part shown (pose scale 1) only for anim LOD in [lodMin, lodMax]; outside => scale 0
              rm?: rpsScale }],                                      // Reduce Motion multiplier of rps (rotors 0.25)
              // absent => the Animator synthesises one 'dist' row per part matching /^wheel/ (axle x, k = 1/radius) = today's applyWheels, bit-identical
  aimParts: [{ part, axis:'y'|'x', src:'yaw'|'pitch', rate: rad/s, min, max, zero: rad }],   // replaces the part's rotation channel `ry` (yaw) or `rx` (pitch; barrel UP = negative rx)
  crewTable: 'siege'|'ride'|'gun'|'seat',            // default: 'siege' for catapult1/ballista1, else 'ride' (today's rule)
  hover:  { alt: u (lowest voxel; exempts the minY test), bob: {amp: u, hz}, tilt: k },
  bounds: { min:[x,y,z], max:[x,y,z], c:[x,y,z], r: sphere radius about c, len, wid, hgt },   // world units at scale 1, rest pose, from src/voxel/bounds.js
  airMap: { alt: u, map: {idle:'hover', idle_combat:'hover', walk:'fly', run:'fly_fast', rout:'fly_fast'} },   // used while extra.alt >= alt
  recoil: [{ part, axis:'x'|'y'|'z', amp: voxels, pitch?: rad }],   // translate along -axis by amp*extra.recoil; hull rock via `pitch`
  flinchK: 0..1,                                    // multiplier of the additive hit lean (default 1; tank .35, walker .2, dragon .5, gun .3)
  farKeep: [{ part, box, min: 0.6, why }],  decor: [partId],        // 3.1
  crewCollapse: 0|1,                                // crew sub-rigs sampled at their rest pose at anim LOD >= 1
  cloak: 0|1,                                       // model may cloak: BattleView compiles the cloak variant (3.9)
}
extra (BattleView -> Animator.pose) gains: aim {yaw, pitch, valid}, alt, recoil, fitDur, bank, rotorK;   // all absent for Ancient units
```
- **`extra.aim`.** BattleView keeps one `Float32Array(3)` per tracked unit (units whose model has `aimParts`; `Map<id, ..>`, pruned on death, no per-frame allocation): `yawRel = wrapPi(u.aim - heading)` (`u.aim` from M8 is absolute; absent field => `heading`; the view smooths it with its own slew below, so no previous-aim field is read from the sim), `pitch = atan2(targetY - muzzleY, horizontalDist)` for `u.target`, else the previous value decayed to `zero`. The view slews with `rate = def.turret.rate * 1.25` (the sim's slew is authoritative; the view only smooths between ticks). Clip rotations of an `aimParts` part are replaced, not added.
- **Treads.** Scroll is `translate` of the `cleat*` shells by `dist mod period` with `period = 2` voxels = the ridge spacing, hidden ends under the hull overhang; SP-2 compares this against 'fenders' and 'wheel parts' and may choose one by rule.
- **Wheels** (`car1`, `gun1`): the default synthesis keeps `applyWheels` unchanged. **Rotors** (`mainBlade`, `tailRotor`, drone rotors): `mode:'time'`, `rps` 8 (main), 9 (tail), 8 (drone), phase per instance from `id`, `lodMax` 0 for blades; the blur disc part has `lodMin` 1 so it shows from anim LOD 1 while the blades show only below it. Rule: `rps x blades < 30` (angular step per frame at 60 fps below half the symmetry period). Reduce Motion multiplies `rps` by 0.25 and hides the disc.
- **`crewTable:'gun'`**: `idle,idle_combat -> crew_idle`, `walk,run -> crew_push`, `fire_cannon|fire_mortar|fire_hmg|fire_tank -> crew_fire`, `reload|reload_gun -> crew_load`, `hit_front -> crew_react`, any `death_* -> death_back`, aim phase `crew_aim` while the unit is in a ranged windup with a valid target. `'seat'`: `idle,idle_combat,walk,run -> crew_seat`, `shoot_*|fire_car -> crew_fire`, deaths -> `death_back`. `'siege'`/`'ride'` tables: today's code, untouched.


### 3.7 Reactions (M17t), `RIG_LINGER`, `fxClass`, recipes, gore hooks, explosions

**M17t schema (`src/content/era_<id>/reactions.js`, pure data, imported by `data.js`; registry kind `reaction` keyed by `def.react`; keys carry the era prefix).**
```
REACTIONS['mod_tank'] = {
  rig: 'tank1',
  deaths: { impact:[ids], cut:[ids], bullet:[ids], blast:[ids], burn:[ids], zap:[ids], emp:[ids], crash:[ids], drown:[ids], poison:[ids], stone:[ids], spikes:[ids], geyser:[ids], bribe:[ids] },
  default: [ids],                       // required, >= 1; any class missing above falls back here
  hits: { front: 'hit_front', back: 'hit_back' },
  ko: 'death_ko' | null,                // RENDER-only: clip whose last frame poses the static corpse when the corpse policy is 'ko'; never a sim clip
}
```
Classes are M's `CAUSE_CLASS` (`melee gore kick trample crush fall -> impact; execute -> cut; ranged bullet -> bullet; aoe explosion strike mine misfire -> blast; fire lava -> burn; magic lightning energy -> zap; emp -> emp`, others as named). Variant = `(u.id*7 + tickN) % n` (M, RNG-free). Validation (`registry.verify` + `RA-T08`): every id is registered as `rig:id`; `ClipLib.dur(id, rig) + 0.2 <= RIG_LINGER[rig]`; `default` exists; every class a def of the key can suffer resolves; a death variant's `dur` is within [0.5, 1.6] x its DEFAULT_META row. Hit reactions are render-side: the sim keeps the additive `flinch` overlay and the `hit_front/hit_back/stagger` states; `meta.flinchK` scales the lean per rig (3.6).

**`RIG_LINGER` (appended to `src/anim/clips.js`, seconds; absent rig => `G.deathLinger` 1.6; Ancient defs keep `max(G.deathLinger, dur + 0.2)`).**
`trebuchet1 2.4, ram1 2.2, dragon1 3.0, gun1 2.2, tank1 2.6, car1 2.4, heli1 2.8, drone1 2.2, hover1 2.4, insect1 1.8, walker1 3.2` (hum1 and the quad species 1.6: `death_ko` 1.4 and `death_blast` 1.3 fit).

**Reaction tables (16; `n` = variants).** Wrecks (`def.wreck`) are props named by W (`mod_wreck_tank`, ...); their models are generated by `src/content/shared/wreck.js wreckOf(model)` = the unit's static parts at the final death pose, charred recolour (x0.45), smoke emitter; non-blocking, cap 24, ttl 25 s (M17e).

| key | rig | impact | bullet | blast | burn | zap / emp | crash | default | ko |
|---|---|---|---|---|---|---|---|---|---|
| med_siege | trebuchet1, ram1 | collapse | collapse | collapse, blast | burn | collapse | - | collapse | - |
| med_dragon | dragon1 | fall | fall | blast, fall | burn | fall | fall | fall | - |
| mod_trooper | hum1 | back, front | shot, front | blast, spin | spin | back | - | back, front | death_ko |
| mod_armour | hum1 (scale 1.35) | back | back | blast | spin | back | - | back, front | death_ko |
| mod_tank | tank1 | wreck | wreck | blast, wreck | burn | wreck | wreck | wreck | - |
| mod_car | car1 | wreck | wreck | blast | burn | wreck | wreck | wreck | - |
| mod_gun | gun1 | wreck | wreck | blast | burn | wreck | - | wreck | - |
| mod_heli | heli1 | crash | crash | blast | burn | crash | crash | crash | - |
| mod_drone | drone1 | crash | crash | blast | burn | crash | crash | crash | - |
| sf_trooper | hum1 | back, front | shot | blast | spin | zap, back | - | back, front | death_ko |
| sf_suit | hum1 x2.4 (the one suited giant) | back | back | blast | back | back | - | back | - |
| sf_hover | hover1 | wreck | wreck | blast | zap | zap, wreck | wreck | wreck | - |
| sf_drone | hover1 drone builder | wreck | wreck | blast | zap | zap | wreck | wreck | - |
| sf_walker | walker1 | topple | topple | blast, topple | zap | zap, topple | topple | topple | - |
| sf_insect | insect1 | back | back | blast | burn | melt | - | melt | - |
| sf_alien | quad1 species | `<sp>_death_back/front/spin` | same | `<sp>_death_spin` | burn | melt | - | `<sp>_death_back` | - |

Cell values are clip ids without the `death_` prefix where a generic exists (`wreck` = `death_wreck`); Medieval infantry and mounted units have NO `def.react` (legacy block of `killUnit`, Ancient behaviour). `sf_drone` uses hover1 with `crash` for air units (M7 `crash` cause).

**`fxClass` (R10).** `FX_CLASS[defId] -> 'organic'|'armoured'|'machine'|'alien'|'shield'` is data of the pack (registry kind `fx_class`, keyed by def id; Ancient has NO rows: `fxClassOf(def)` returns `undefined` and `_onHit/_onKill` run the frozen legacy code: sparks when type is slash/pierce/blunt and `def.armor >= 0.3`, blood from the global gore setting). New-era defs MUST have a row (registry V). Cached per def id in `BattleView._cls` (a `Map`, never `tags.indexOf` in the hit path). `shield` is not a def class: it selects the recipe of `shield_hit` / `shield_break`.

**Recipe schema (`FX_RECIPE['<era>:<class>']`, the one new registry kind `fx_recipe` of RA-PC4; engine defaults inside `src/render/fxrecipes.js` equal the Ancient literals).**
```
{ hit:    { sparks:{n, rgb, spd, on:[damage types]}|null, ric:{n, rgb, p}|null, blood:{style:'auto'|<style>, n, nCrit}|null, dust:{n, rgb}|null, arc:{n, len}|null, glow:{n, rgb}|null },
  kill:   { blood:{style, n}|null, dust:{n, spd}, fire:{n}|null, extra:'oil'|'goo'|'sparks'|'puff'|null, nExtra, shake },
  corpse: { auto: 'stay'|'fade'|'ko'|'wreck'|'none', ttl: s },        // 'auto' = what CU4's corpses=auto resolves to for this class
  gore:   { auto: 'red'|'puff'|'oil'|'goo'|'plasma' } }              // style resolveGore(...) returns for the setting 'auto'
```
**Per-era table (numbers = particles; colours sRGB; `P` = puff style = 3 cream dust cubes `0xefe6d0` + 2 star cubes `0xffe27a`, size .09, life .35, flags 2|4; `goo` = `0x7aff5a/0x2f8f3a`; `oil` = `0x1a1a1a/0xb8860b`).**

| era : class | hit | kill | corpse auto | gore auto |
|---|---|---|---|---|
| ancient (any) | frozen legacy: sparks 4 `0xffd24a` spd 4 on metal types when armor >= .3; splat 4 (crit 10) from the setting | splat 12, dust 4, fire 4 if cause fire | stay | red |
| medieval : organic / armoured | = Ancient (armoured sparks 4, splat 4/10) | = Ancient | stay | red |
| medieval : machine (siege, ram) | sparks 3 `0xffd24a`, dust 3 `0xb8a98a` (wood chips) | rubble 30 + dust 8 (as `prop_destroyed`), fire 6 if burn | wreck | - |
| modern : organic | dust 3 + star 2 (P), crit P x2 | P 8 + dust 4 | ko (fades after 8 s) | P |
| modern : armoured | helmet ping: sparks 3 `0xffe08a`, ric 3 p .5 on bullet; blood as organic | as organic | ko | P |
| modern : machine | sparks 5 `0xffd24a`, smoke 2 `0x333333` when hp < 40% | shell explosion r 1.6 + oil 10 + sparks 12 | wreck | oil |
| scifi : organic | dust 3 + star 2 (P); energy adds scorch dust 2 `0x3a2a2a` | P 8 + dust 4 | ko | P |
| scifi : armoured | glow sparks 4 `0x8fe8ff` (flags 2/4) on energy; else Modern armoured | as organic | ko | P |
| scifi : machine | sparks 6, arc 1 x 0.6 u on energy/emp | shell explosion r 1.6 + oil 10 + sparks 20 | wreck | oil |
| scifi : alien | splat `goo` 6 (crit 12) | goo 16 + dust 3 | fade 10 s (sinks) | goo |
| scifi / modern : shield | `shield_hit`: ring of 12 glow cubes `0x7dd8ff` at 1.6 x radius, no blood | `shield_break`: 24-cube burst + shake .05 | n/a | n/a |

**User setting (CU4's `resolveGore(setting, era, class)` returns the style; RA fixes how render obeys it).** `red wine confetti` apply to `organic`, `armoured` and `alien` (alien uses its goo palette recoloured: wine -> violet goo, confetti -> confetti); `off` removes ALL blood/goo/puff-blood of those classes but never machine sparks or oil (not gore); `auto` takes `gore.auto` of the table. `BattleView` caches `{organic, armoured, machine, alien}` styles on `setWorld` and on a settings change; `fx.splat` gains styles `puff oil goo plasma` (unknown styles still fall back to red, a benign v8 behaviour). Consumers to update (read): `battleview.js` lines 40, 275, 333 (`this.gore`, `_onHit`, `_onKill`), `fx.js:67` (`splat`). Corpses: `settings.corpses` keeps `stay|fade|none` (render treats `fade` like `none` today: `battleview.js:343` accepts only `stay`); CU4 adds `auto`; for `auto` the class value of the table applies: `ko` poses the static corpse from `REACTIONS[key].ko`'s last frame, `fade` shrinks the corpse over its last 1.5 s of `ttl`, `wreck` is the prop. A fresh profile renders a Modern kill with P (test RA-T10).

**Explosion recipes (`EXPLOSION_FX[kind]`, replaces the single formula of `_onExplosion`; legacy kinds keep it verbatim).** `r` = event radius. Per-frame spawn budget 1200 cubes: a request is scaled by `min(1, left / wanted)`; the barrage of 100 shells in one tick therefore spawns <= 1200 cubes instead of 13.8 K.

| kind | rubble | fire | smoke | dust | flash | shake | extra |
|---|---|---|---|---|---|---|---|
| crew boulder fire magic (legacy) | min(80, 20+12r) | min(30, 6+4r) | min(20, 4+3r) | min(40, 8+6r) | 0 | min(1, r/5) | none |
| lightning (legacy) | 0 | 0 | 4 | 0 | 0 | 0 | `fx.lightning` + 20 sparks (legacy branch) |
| shell | 0.8 x legacy | 0.8 x | 0.8 x | 0.8 x | 6 cubes, r*0.5 | min(1, r/4) | crater is the sim's |
| rocket | 0.7 x | 0.7 x | 1.0 x (+ trail smoke) | 0.7 x | 4 cubes | min(1, r/4.5) | |
| grenade | 14 | 8 | 6 | 12 | 3 | 0.25 | |
| mine | 24 | 10 | 8 | 20 | 4 | 0.35 | dirt column 12 cubes up |
| orbital | min(80, 20+12r) | min(30, 6+4r) | min(20, 4+3r) | min(40, 8+6r) | 20 cubes (FlashGuard) | min(1, r/3) | StreakLayer column from y+60: width `0.5 r`, life 0.6 s, colour `0xbfe0ff` x2.5; expanding ring 24 glow cubes |
| emp | 0 | 0 | 0 | 0 | 24 glow ring cubes `0x6ad0ff` | 0 | 60 sparks `0x6ad0ff` radius r, 2 arcs |
| smoke | 0 | 0 | 30 grey `0x7a7f88`, life 6 s | 0 | 0 | 0 | occluder is the sim's |
| prop | existing `_onPropDestroyed` | | | | | | |

### 3.8 `PROJ_FX`, the new layers, view subscriptions

**Schema (registry kind `proj_fx`, rows from `era_<id>/fxdata.js`; engine defaults replace `PROJ_VIS`; unknown kind => registry V07 error, no silent arrow).**
```
PROJ_FX[kind] = { shape:'box'|'ogive'|'orb'|'beam', len, thick, col: sRGB hex, glow: 0..2,
  stretch: k (len = max(len, |p - p_prev| * k)),  spin: rad/s,  inst: instances drawn per projectile (box 1, ogive 2, orb 3),
  trail: { kind:'legacy'|'glow'|'smoke'|'ember'|'fire'|null, rate: cubes/s, col, size, life },     // gated on !paused and fxScale > 0.3
  muzzle: recipeId|null,  ground: recipeId|null,  sticky: bool,                                    // sticky = draw while p.stuck > 0
  beam: { col, w, life, fade }|null }                                                               // StreakLayer entry for hitscan kinds
```
Draw cost: boxes/ogives/orbs share the ONE projectile InstancedMesh (1 draw, 12 tris per instance); `pmCap` becomes `world.proj` pool size (4000 max: 48 K tris worst case, 4000 x 76 B = 0.3 MB); `stuck > 0` projectiles are skipped unless `sticky`. Unit impacts use the `fxClass` hit recipe; `ground` recipes: `g1` dust 2, `g2` dust 4 + chips, `g0` none.

**Ancient rows and `crew` (not in the table below).** The ten Ancient kinds are `shape:'box'` rows copied verbatim from `PROJ_VIS` as `len/thick/col/glow`: `arrow .85/.05/d8c8a0/0`, `javelin 1.5/.07/c9a56a/0`, `pilum 1.7/.07/9aa0a8/0`, `francisca .5/.28/9aa0a8/0`, `bolt 1.4/.1/8a6a40/0`, `boulder .9/.9/8d8d92/0`, `coin .22/.22/ffd23a/.6`, `sunbeam 1.2/.14/fff2a0/1`, `scepter .7/.4/60ffb0/1`, `thunderbolt 1.4/.14/9fd0ff/1`. Their other fields reproduce today's behaviour: stretch 0, spin 8 rad/s for `francisca` and `boulder` (0 for the rest), trail `legacy` (a glow cube every other frame when glow > .5), muzzle null, ground `legacy`, and sticky as today (all stuck projectiles drawn). `crew` is an alias row equal to `arrow`. Total 10 + 1 + 18 = 29 rows; the table lists the 18 new ones.

| kind | shape | len | thick | col | glow | stretch | spin | trail | muzzle | ground | sticky |
|---|---|---|---|---|---|---|---|---|---|---|---|
| quarrel | box | .7 | .07 | `6b5030` | 0 | 0 | 0 | - | - | g1 | yes |
| firepot | orb | .5 | .5 | `ff7a1a` | .8 | 0 | 4 | ember 20/s `ff9a30` .1 .4 | - | g2 | no |
| pistol, smg | box | .5 | .05 | `ffe8a0` | .6 | .6 | 0 | - | mz_pistol | g1 | no |
| rifle | box | .9 | .06 | `fff0b0` | .8 | 1.0 | 0 | - | mz_rifle | g1 | no |
| mg | box | 1.0 | .07 | `ffd060` | .9 | 1.0 | 0 | - | mz_mg | g1 | no |
| sniper | box | 1.4 | .06 | `fff8d0` | 1.2 | 1.0 | 0 | - | mz_sniper | g2 | no |
| shell | ogive | .9 | .45 | `4a4a52` | 0 | 0 | 0 | smoke 12/s `555a66` .25 .8 | mz_shell | g2 | no |
| rocket | ogive | 1.1 | .18 | `e8e8e8` | .4 | 0 | 0 | smoke 40/s + ember 12/s | mz_rocket | g2 | no |
| missile | ogive | 1.0 | .16 | `dde6ff` | .5 | 0 | 0 | smoke 30/s + glow tail `ff9a40` | mz_rocket | g2 | no |
| mortar | ogive | .6 | .3 | `3a3a40` | 0 | 0 | 0 | - | mz_mortar | g2 | no |
| grenade | box | .3 | .3 | `4a5a3a` | 0 | 0 | 12 | - | - | g1 | no |
| flame | orb | .6 | .5 | `ff9020` | 1.4 | 0 | 0 | fire 30/s | mz_flame | g0 | no |
| plasma | orb | .5 | .5 | `7dffd0` | 1.6 | 0 | 0 | glow 30/s `7dffd0` .08 .3 | mz_plasma | g2 | no |
| flechette | box | .5 | .05 | `d0d8ff` | .7 | .8 | 0 | - | mz_laser | g1 | no |
| laser | beam | - | - | - | - | - | - | - | mz_laser | g0 | - |
| rail | beam | - | - | - | - | - | - | - | mz_rail | g2 | - |
| beam_pulse | beam | - | - | - | - | - | - | - | mz_laser | g0 | - |

`beam` rows: `laser {col ff3a5a, w .12, life .12, fade lin}`, `rail {col bfe0ff, w .08, life .35, fade out, + after-ring}`, `beam_pulse {col 7dffb8, w .2, life .2}`; drawn by the StreakLayer from the `beam` event `(x0 y0 z0 x1 y1 z1 kind)`, so the hitscan `Projectile` (pooled, inactive after the ray) is never drawn. **Muzzle recipes** (on `projectile_launch`, cap 40 per frame, position = event x,y,z = the sim muzzle): `mz_pistol` flash 2 cubes `ffe9a0` .12 life .05 flags 2|4 + smoke 1; `mz_rifle` flash 3 .16 + smoke 2 `8a8a8a`; `mz_mg` flash 3 .18 + smoke 1; `mz_sniper` flash 5 .2 + smoke 4 + dust 3; `mz_shell` flash 6 .3 life .08 + smoke 8 + dust 6 + shake .15; `mz_rocket` backblast (behind the heading) smoke 10 + fire 4 + flash 4; `mz_mortar` smoke 6 + dust 4; `mz_laser` glow 2 `ff4060` .14 life .06; `mz_plasma` glow 3 `7dffd0` life .1; `mz_rail` flash 5 `bfe0ff` + dust ring 6 + shake .1; `mz_flame` fire 6 + smoke 2.

**New layers (each a pure-render file in `src/render/`, constructed once by `Game`, `dispose()` symmetric).**

| layer | file | what | cap | draws | tris (worst) | notes |
|---|---|---|---|---|---|---|
| StreakLayer (R2) | `streaks.js` | one InstancedMesh of stretched boxes, `MeshBasicMaterial toneMapped:false`, colour > 1 feeds bloom; entries `{x0..z1, w, life, col, fade}` from `beam`, `explosion orbital`, `emp` | 256 | 1 | 3 K | culled by FlashGuard width limit when `flashLimiter` |
| ShieldLayer (R3) | `shields.js` | near dome <= 64 units (icosphere detail 1, 80 tris), additive transparent `MeshBasicMaterial`, `renderOrder` 3 (above water 2, below bars 19), scale `radius*1.6*scale`, hex flicker from `uTime` (<= 3 Hz under Reduce Motion), colour by `u.sh/u.shMax`; pulse on `shield_hit`; units beyond the 64 nearest (or in the far mesh) show shields through `aFx2.y` only | 64 | 1 | 5 K | needs `u.sh u.shMax` (M3) |
| ShadowBlobs (R4) | `blobs.js` | dark discs (16-gon) under airborne units (3.15), `ShaderMaterial` with per-instance alpha | 48 | 1 | 0.8 K | also used on Potato (no shadow map) |
| HazardLayer (R5) | `hazards.js` | opaque boxes: mines (own team sees a 1 Hz LED, enemies nothing), spikes, laser-grid posts; additive quads: radiation pools, ground fire (`fire_started`), neon light pools | 256 + 64 | 2 | 3.1 K + 0.1 K | `arena.hazards {t,x,z,r}` plus the M11 mine events |

Total new draws 5, new triangles <= 12 K worst case.

**View subscriptions (R9; `BattleView.setWorld` adds these; payloads are pooled, read-only; every handler is a no-op when `fxScale < 0.2`).** `projectile_launch` (muzzle recipe, recoil pulse by `src`), `beam` (StreakLayer + muzzle), `shield_hit` (dome pulse / far rim pulse), `shield_break`, `shield_recover` (dome fade-in), `unit_cloak` (`aFx2.x` ramp is read from `u.cloak`; the event only triggers the shimmer burst), `emp_pulse`/`emp_hit` (ring + arcs), `unit_blink` (sparks at both ends + 0.15 s glow streak), `mine_laid`/`mine_trigger` (HazardLayer + explosion `mine`), `strike_call` (telegraph handled by `_onTelegraph` kinds `strike`/`emp`/`orbital` colour rows), `unit_wreck` (smoke emitter timer, 20 s), `unit_deflect` (ricochet spark `ric` recipe), `unit_suppressed` (world tag, labels.js row), `unit_spawn`/`unit_bailout` (drop-in flash 6 glow cubes), `fire_started` (HazardLayer ground fire), `weather_change` (re-run `_applyWeather`). `LOG_FIELDS` rows are spec/M 3.12.


### 3.9 Skin shader v2 (R6)

**Interface (`voxskin.js`, program keys `voxskin-lambert-v2`, `voxskin-lambert-v2-cloak`, `voxskin-depth-v2`; v1 keys stay for the fallback).**
- `aFx2` vec4 per instance on the near and the far mesh (`_makeMesh`, `_grow`, `_flush`, `fxArr2`), zero-initialised. Lanes: `x` hidden fraction of a cloaked unit (0 visible .. 1 gone; BattleView applies the viewer-team floor: `x = cloak * (team === viewTeam ? 0.65 : 0.95)`), `y` shield level 0..1 (far-mesh rim; 0 for units that own a dome), `z` heat 0..1 (`F_HEAT` voxels), `w` mode word `m + k` (`m` = floor, `k` = fract in 0..0.99): `m` 1 SUPPRESS, 2 SHIELDDOWN, 3 EMP, 4 IRRADIATED, 5 CRYO, 6-7 reserved (the table test forbids rows that use them).
- `uTime`: one shared `{value}` object (`SKIN_TIME`) written once per `BattleView.update`; `uDitherLevels` (2 on Potato, 16 otherwise) and `uDitherPx` (device pixel ratio) are shared the same way. `uCalm` is a fourth shared `{value}` uniform (0 or 1), written once per `BattleView.update` as `settings.reduceMotion || settings.flashLimiter ? 1 : 0`; the F_PULSE glow term, the EMP strobe `step(fract(uTime*9))` and the shield flicker multiply their time-varying part by `(1 - uCalm)` (they settle at their mean level), the cloak shimmer phase and `uTime` itself are untouched. With `uCalm` 0 every term is the v2 formula exactly (Ancient: F_PULSE is never set, so nothing changes).
- `VoxSkin.add(x,y,z,h,sx,sy,sz,pose,team,flash,stone,glow,pitch,roll,lod, cloak=0, shield=0, heat=0, xmode=0)`: four TRAILING args, defaults 0 keep all 15 call sites valid (blast radius listed in map 04 section 3); the far flag stays argument 15 (index 14) for the G12 spy (RA-PC6).
- Voxel flags (`grid.js`, `V()` masks `& 0xff`): `F_PULSE = 8`, `F_GLASS = 16`, `F_HEAT = 32` (bit 3-5; bits 6-7 reserved). `mesher.js` emits `aFlag = base + 4 * extra` with `base` 0 plain / 1 team / 2 glow (today's values) and `extra = pulse + 2*glass + 4*heat` (0..7, so `aFlag` 0..30); the shader decodes `ex = floor(aFlag*0.25 + 0.001); base = aFlag - ex*4.0` and keeps today's range tests on `base` (Ancient: `ex = 0`, identical). `lod.js downsample2` ORs `F_PULSE|F_GLASS|F_HEAT` into a coarse cell when >= 1/2 of its solid voxels carry the flag (decision for the far mesh; glow keeps its rule); per-part `thin` option stays unimplemented (AP-V01 lists it; not needed: F1-F3 and `farKeep` cover thin features).

**Fragment additions (all multiplied by lane values that are 0 for Ancient units => `aFx2 = 0` reproduces v1 maths).**
```
pulse : glow voxels  g *= 1 + 0.35*sin(uTime*4 + vXf.w)           (vXf.w = row*0.37, per-unit phase)
glass : col = mix(col*0.55, vec3(0.45,0.7,0.95)*1.1, 0.12 + 0.8*vFres)      vFres = 1 - |n.v| computed in the vertex stage after <project_vertex>
heat  : col = mix(col, vec3(1.7,0.6,0.15), vFx2.z * vXf.z)         (HDR > 1 feeds bloom)
shield (far rim): col += vec3(0.3,0.85,1.0) * vFx2.y * vFres^2 * 0.9 * (0.75 + 0.25*sin(uTime*3 + vXf.w))
mode 1 SUPPRESS : col = mix(col, vec3(lum)*0.8 + vec3(0.10,0.10,0.18), 0.28*k)
mode 2 SHIELDDOWN: col += vec3(1.0,0.35,0.25) * vFres * k * (0.5 + 0.5*step(0.5, fract(uTime*2.0)))
mode 3 EMP      : col = mix(col, vec3(0.25,0.5,1.0) * (0.5 + 0.5*step(0.5, fract(uTime*9.0 + vXf.w))), 0.45*k); glow voxels off
mode 4 IRRADIATED: mix to (0.7,1.0,0.3) 0.25*k with 3 Hz shimmer   mode 5 CRYO: mix to (0.7,0.9,1.0) 0.3*k, glow x0.5
```
**Cloak variant (`#define VS_CLOAK`, compiled ONLY for skins with `model.meta.cloak`; `customProgramCacheKey` carries the define).** `if (vFx2.x > 0.004 && vsBayer(gl_FragCoord.xy / uDitherPx) < vFx2.x) discard;` (4x4 Bayer, 16 levels; Potato 2x2, 4 levels: thresholds .2/.4/.6/.8), plus an enemy rim shimmer `rgb += vec3(0.35,0.85,1.0) * x * (0.25 + 0.25*sin(uTime*6 + worldY*4))` when `x >= 0.5`. `alphaToCoverage` is not an option (r128 never enables `SAMPLE_ALPHA_TO_COVERAGE`, 0 hits in the bundled build) and blending would break sorting inside one InstancedMesh. **Depth variant** (cloak skins only, `voxskin-depth-v2`): the vertex stage passes `aFx2.x`; `if (vHide > 0.5) discard;` so a cloaked unit casts no shadow beyond 50% hidden. Early-Z is lost only on cloak-capable skins (Sci-Fi assassins), not on the 300-unit shield line.

**Attribute/varying budget and fallback.** Vertex attributes 11 -> 12 (`position normal color aFlag aPart aFx instanceMatrix(4) instanceColor` + `aFx2`; WebGL2 minimum 16); new varyings `vFx2` (vec4) and `vXf` (vec4: pulse, glass, heat flags, phase) next to `vFx vGlow vColor vLightFront vFogDepth` = about 6 of the minimum 15 vec4 slots. `Engine` logs `MAX_VERTEX_ATTRIBS`, `MAX_VARYING_VECTORS`, `MAX_VERTEX_UNIFORM_VECTORS`, `MAX_TEXTURE_SIZE` into `Diagnostics.caps` (today `app/boot.js:12` logs only the texture size). **Fallback ('Potato look')**: if `attribs < 13 || varyings < 10` or the v2 program fails to link, skins use the v1 programs and `add()` ignores the trailing args; enemy cloaked units are skipped (not drawn, matching their untargetable state), own cloaked units draw normally, shields show only the dome layer, new statuses show no tint. Forced by `?shader=v1` and by `window.__VW_FORCE_V1` in tests (RA-T11).

**SE -> tint table (24 rows, total; `statusMode` becomes table-driven, the legacy priority order BURN, POISON, SLEEP, ROOT, RAGE, CONFUSE|TIPSY, CURSE is kept).**

| SE slot | name | channel | value |
|---|---|---|---|
| 0 | BURN | `aFx.z` legacy mode | 1 |
| 1 | SLOW | none (HUD icon) | - |
| 2 | STUN | none | - |
| 3 | ROOT | legacy mode | 3 |
| 4 | CONFUSE | legacy mode | 6 |
| 5 | SLEEP | legacy mode | 4 |
| 6 | STONE | `aFx.y` via `u.stone` (not a mode) | - |
| 7 | RAGE | legacy mode | 5 |
| 8 9 | HASTE DMGUP | none | - |
| 10 | CURSE | legacy mode | 7 |
| 11 | SCARE | none | - |
| 12 | TIPSY | legacy mode | 6 |
| 13 | POISON | legacy mode | 2 |
| 14 15 16 17 18 19 | DISARM TAUNT PANIC DOWNED WARHORN NOHEAL | none | - |
| 20 | SUPPRESS | `aFx2.w` mode, k = `u.sup` | 1 |
| 21 | EMP | `aFx2.w` mode, k = min(1, remaining/3) | 3 (wins over 1, 2) |
| 22 | CLOAK | `aFx2.x` from `u.cloak` (not the status timer) | - |
| 23 | SHIELDDOWN | `aFx2.w` mode, k = remaining/recover | 2 |

Precedence inside `aFx2.w`: EMP > SHIELDDOWN > SUPPRESS. Test `RA-T12`: 24 rows, no row references modes 6-7 of `aFx2.w`, the legacy slot->mode map equals the literal indices `0,13,5,3,7,4,12,10` of `battleview.js:21-31`.

### 3.10 `THEME_LOOK`, weather, liquids, emissive terrain (R7, R8)

**Schema (field `look` of the registry theme row; `null`/absent field = today's value; all eight Ancient themes and every unknown theme resolve to the default look, so Ancient pixels are unchanged by construction; ids <= 16 chars, era prefix `med_ mod_ sf_`).**
```
look = { sky:  { zenith:hex|null, horizon:hex|null, ground:hex|null, night:{zenith,horizon}|null, nightMin:0..1, starsMin:0..1, stars:xDensity (1),
                 atmos:1|0, band:{col,glow,h,w}|null, bodies:[{dir:[x,y,z], r, col, glow}] (<= 4) },
         sun:  { col:hex|null, mul:1, dusk:1 }, hemi: { mul:1, ground:hex|null },
         fog:  { col:'horizon'|hex, nearMul:1, farMul:1, add:0 },
         grade:{ exposure:1, saturation:1, contrast:1, vignette:1, bloom:1 },     // multipliers of style.js GRADE / POST_TIERS; re-applied after every setQuality
         clouds:true, cloudTint:hex|null, liquid:'water'|id|null,
         preset:{ time, weather, fog, wind, gravity } }                           // consumed by the Arena Builder / W6 only (theme preset); the look itself never changes env.time
```
`Engine.setEnvironment(env, arena)` reads `THEME_LOOK[env.theme]`: each hard-coded palette literal (`engine.js:153-154`, and the zenith/horizon/ground/sun/hemi literals of `engine.js:153-170`) becomes `look.sky.* ?? literal`; sun/hemi/exposure/fog multiply; `nightMin` raises the `night` factor; the sky shader gains `uBodies[4]` (xyz dir + radius, rgb + glow), `uStarT` (star threshold 0.9965; density x3 => 0.9895), `uAtmos`, `uBand` and the terms `+ bodies + band` (zeros add exactly 0). `PreviewService` takes clear colour and fog from the same look (`preview.js:54,113-119` are Greek literals today). `terrain.setFog` is called from the same place as the engine fog.

| look id | era | sky (zenith / horizon; night) | fog (col, near x far x, +) | sun (col, mul) | hemi (ground, mul) | grade (exp, sat, con, vig, bloom) | clouds | liquid | preset (time, weather, fog, wind, g) |
|---|---|---|---|---|---|---|---|---|---|
| default (8 Ancient themes) | ancient | literals | horizon, 1x1, 0 | literal, 1 | literal, 1 | 1,1,1,1,1 | yes | water/lava | - |
| med_meadow | medieval | 3f86d6 / cfe8f7 | horizon, 1x1, 0 | -, 1 | -, 1 | 1,1.05,1,1,1 | yes | water | 11, clear, .25, .3, 1 |
| med_ford | medieval | 4a86c8 / c4dcea | horizon, 1x1, +.08 | -, 1 | -, 1 | 1,.98,1,1,1 | yes | water | 10, cloudy, .35, .3, 1 |
| med_forest | medieval | 3d7a9c / b4cdb6 | 9fb59a, 1x.9, +.1 | ffeec8, .85 | 3f5a2a, 1 | .96,1.05,1,1.2,1 | yes | water | 13, clear, .4, .2, 1 |
| med_village | medieval | 4a82c8 / f0dfc0 | horizon, 1x1, 0 | ffe2b0, 1 | -, 1 | 1,1.08,1,1,1 | yes | water | 16, clear, .25, .25, 1 |
| med_abbey | medieval | 4a4f98 / e8b896 | cfa98f, 1x1, +.05 | ffc08a, .9 | 5a4f6a, 1 | 1,1,1,1.3,1.1 | yes | water | 18, cloudy, .3, .2, 1 |
| med_castle ("castle dusk") | medieval | 4b4f9a / ffa25c | d9a37a, 1x.9, +.05 | ff9a50, .85 | 5a3a3a, 1 | 1,1.12,1.1,1.15,1.15 | yes (tint ffd0a0) | water | 18.3, clear, .3, .35, 1 |
| med_moor | medieval | 6f8fa8 / b9c4b8 | b0bcb4, 1x1, +.15 | -, .8 | -, 1 | .98,.85,1,1,1 | yes | water | 12, fog, .45, .4, 1 |
| med_mountain | medieval | 2f6fc0 / d2e6f6 | horizon, 1x1.3, 0 | -, 1.1 | -, 1 | 1,1,1.08,1,1 | yes | water | 11, clear, .15, .5, 1 |
| mod_field | modern | 3d7fd0 / c4def2 | horizon, 1x1, 0 | -, 1 | -, 1 | 1,.98,1.08,1,1 | yes | water | 11, clear, .25, .3, 1 |
| mod_city | modern | 5b84b0 / b8c4cf | aab6c2, 1x1, +.08 | fff0dd, .95 | 4a4a52, 1 | 1,.92,1.12,1.1,1 | yes | water | 14, cloudy, .3, .2, 1 |
| mod_industrial | modern | 6a82a0 / c9c2b0 | bdb6a4, 1x.85, +.2 | ffe6c0, .9 | 4a443a, 1 | 1,.85,1.1,1,1 | yes | water | 15, smog, .4, .2, 1 |
| mod_water | modern | 3f8ad8 / cfe6f6 | horizon, 1x1, +.05 | -, 1 | -, 1 | 1,1.05,1,1,1 | yes | water | 11, clear, .2, .45, 1 |
| mod_air | modern | 2f78d0 / d8ecfa | horizon, 1x1.4, 0 | -, 1 | -, 1 | 1.04,1,1,1,1 | yes | water | 12, clear, .1, .3, 1 |
| mod_desert | modern | 5a9ad0 / f0d9a8 | e6cf9e, 1x1, +.1 | ffeabc, 1.1 | 8a7048, 1 | 1.06,1.1,1.08,1,1 | yes | water | 13, clear, .3, .5, 1 |
| sf_neon_night ("neon night city") | scifi | night 12062e / 4a1060, nightMin .9, band 00e5ff glow 1.6 h .06 w .05 | 3a1055, .7x.6, 0 | 9fb4ff, .35 | 2a1040, 1.1 | 1,1.25,1.12,1.2,1.4 | no | water | 22.5, rain, .4, .2, 1 |
| sf_lunar | scifi | zenith = horizon = ground 000004, atmos 0, stars x3, starsMin 1, body Earth dir (-.35,.42,-.84) r .07 4aa0ff glow .3 | none (farMul 50) | ffffff, 1.6, dusk 0 | 303038, .12 | 1.05,.9,1.15,1,.9 | no | none | 12, clear, 0, 0, **.4** |
| sf_jungle ("alien jungle") | scifi | 1d8f7a / b8ff9a, bodies: A dir (.55,.5,.4) r .09 ffd9a0 glow .5; B dir (-.45,.35,.6) r .05 9fd0ff glow .4 | 4ea86a, .8x1, +.15 | d8ffc8, .85 | 203a3a, 1.05 | 1,1.2,1.08,1,1.15 | no | water | 11, fog, .4, .1, 1 |
| sf_ice | scifi | 5aa0e0 / e8f6ff | dcecf8, 1x1, +.1 | eaf6ff, .95 | 9ab4c8, 1.1 | 1.06,.9,1.05,1,1 | yes | coolant | 11, snow, .3, .4, 1 |
| sf_lava | scifi | 40181a / e0572a | 7a2a18, 1x.8, +.2 | ff8a50, .8 | 602010, 1 | 1,1.15,1.1,1,1.25 | no | lava | 14, ash, .4, .2, 1 |
| sf_wreck ("crashed ship") | scifi | 203a58 / 90b8a8 | 6a8a86, 1x1, +.15 | cfe8e0, .85 | 2f3a3a, 1 | 1,.9,1.1,1.2,1 | yes | water | 17, smog, .35, .15, 1 |
| sf_redplanet | scifi | 7a3a2a / e8a070 | d89a70, 1x1, +.12 | ffd0a0, 1.05 | 6a3a28, 1 | 1,1.1,1.08,1,1 | no | none | 12, sandstorm, .3, .5, .6 |

Hex values are sRGB. The vocabulary test `RA-T13` requires `THEMES ids == THEME_LOOK ids` (+ the eight Ancient aliases), every preset weather to be a `WEATHER_KINDS` member, and that the default look reproduces the v8 sky/fog/light values of `setEnvironment` for times {6, 9, 12, 18, 20, 23} x weathers {clear, cloudy, rain, storm, snow, sandstorm, fog} to 1e-6 (reference vector from the baseline worktree).

**Weather rows (`weather.js KINDS`, closed by M `WEATHER_KINDS`; existing `rain storm snow sandstorm` rows untouched; sky grey/tint tables of `engine.js:159` extended).** Fields as today (`n size vel wind col alpha sway`) plus `flicker {hz, depth}`; counts scale by the tier factor `q.weather`.

| kind | n | size | vel | wind | col | alpha | sway | flicker | sky grey / tint | fog add |
|---|---|---|---|---|---|---|---|---|---|---|
| smog | 1800 | .9 .5 .9 | .8 -.1 .3 | .6 | .55 .55 .5 | .10 | 1.2 | - | .6 / 9a9a8a | +.30 |
| ash | 3000 | .07 .02 .07 | .8 -2.2 .4 | 2.0 | .25 .24 .23 | .85 | .8 | - | .7 / 5a5450 | +.15 |
| ion_storm | 2600 | .02 1.6 .02 | 3 -70 1 | 3 | .6 .5 1.0 | .55 | 0 | 8 Hz, .3 (off under Reduce Motion) | .75 / 6a5fa0 | +.18 |

**Liquids (`terrain.js _buildLiquid`; selection: legacy `arena.lava` => `lava`, else `env.liquid` (W4 whitelist) ?? `look.liquid` ?? `water`; the water/lava rows are today's literals).**

| id | deep | shallow | opacity | transparent | depthWrite | sparkle | noise | emissive x | flow x |
|---|---|---|---|---|---|---|---|---|---|
| water | 1c5f8f | 4fc3d9 | .82 | yes | no | 1 | water | 1 | 1 |
| lava | b02a08 | ff7a1a | 1 | no | yes | .3 | lava | 1 | 1 |
| acid | 1f7a2a | 8cff3a | .85 | yes | no | .6 | water | 1.4 | 1 |
| coolant | 2fb8ff | aaf0ff | .75 | yes | no | 1 | water | 1.1 | .7 |
| plasma | 6a10c8 | ff5ad8 | .9 | yes | no | .5 | lava | 2.0 | 1.2 |
| oil | 0a0a0f | 2a2a38 | .95 | yes | no | 0 | water | 1 | .4 |

**Emissive terrain.** `MATERIALS[i].emissive` (0..4, absent = 0; spec/W W3, ids >= 16 only). `meshTerrainChunk` returns an extra `emit` Float32Array (one float per vertex, `emissive` of the cell) ONLY for chunks containing an emissive cell; those chunks use the second terrain material `terrain-emit` (MeshLambert + `onBeforeCompile`: varying `vEmit`, and before `#include <envmap_fragment>` of the r128 Lambert fragment: `outgoingLight += diffuseColor.rgb * vEmit;`); vertex colours keep their `Math.min(1, ...)` clamp, the lava `glow 1.25` branch stays as it is, so every Ancient chunk (no emit array) is byte-identical and shares today's material. Bloom (threshold 1.0, knee 0.5) picks up emissive >= 0.6.

### 3.11 Camera: `CameraRig.shot(spec)`, follow altitude, set-pieces (R17)

```
rig.shot(spec) -> ShotHandle | null        // null when canShot() is false and spec.defer !== 'wait'
spec = { id, from: Look|null (null = current), to: Look, dur: s (travel, real time), hold: s, ease: 'lin'|'io'|'in'|'out'|'spring',
         fov?: deg, shake?: 0..1, kick?: 0..10, speed?: 0.5 (requested sim speed; applied by Game via the existing rules.speed, restored at the end),
         priority: 0..3, defer: 'drop'|'wait', rm: 'cut' }
Look = { at:[x,z] | unit:id | marker:id, y?: u, dist: u, yaw: rad (absolute) | yawRel: rad (relative to the unit heading), pitch: rad }
ShotHandle = { id, state: 'queued'|'running'|'done'|'cancelled'|'dropped', cancel(reason), done: Promise<state> }
rig.canShot() -> { ok: bool, why: 'command'|'userInput'|'killcam'|'photo'|'shot' }
```
Mode `'shot'` stores `prev = {mode, tx,ty,tz, yaw,pitch,dist, fov, followId, cmdId}`; `update(dt)` interpolates the desired state (`tx ty tz yaw pitch dist fov`) with `ease` over `dur`, holds for `hold`, then restores `prev`; the existing half-life smoothing still applies (cinematic constants 0.45/0.5), terrain collision (`+1.4`) and shake apply. Rules: real time (shots run on `dt`, the SIM is slowed by Game to `spec.speed`, ticks stay 30 Hz, the replay log records the start tick: spec/CU); Esc, click or any key cancels (`cancelled`, restore); `canShot()` is false in `command` mode (Take Command), while `userInputT > 0` (the user moved the camera in the last 4 s), during the kill-cam and photo mode: `defer:'drop'` returns null (the set-piece still fires its other channels, spec/CU3), `'wait'` queues until ok (max 6 s, then dropped); priority: a higher priority replaces a running shot, equal waits. Reduce Motion (`rig.reduceMotion`): `rm:'cut'` jumps to `to`, holds `min(hold, 1.5)` s, no dolly, no shake, `kick` ignored. Tests `RA-T14`: lifecycle, cancel/restore, defer rules, Reduce Motion cut, no allocation per frame (heap probe).

**Follow / command target altitude (`cameras.js:64,68`).** `ty = heightAt(x,z) + (u.altitude || 0) + u.height * k` (k = 0.6 follow, 0.75 command). `u.altitude` is 0 for every ground unit, so the value is bit-identical for Ancient units (adding 0). `engine.focus` already takes `sy`, so the shadow frustum follows a flier. `cycleFollow`/`_nextFollow` unchanged.


### 3.12 Draw calls: measurement protocol, arithmetic, ladder wiring, terrain and markers (R12; q3_engine 26, q2_engine Q2, q1_engine Q20)

**Facts (map 04, measured with `tools/perf.mjs` on Marble, marathon LARGE, 570 units, whole arena framed): 159 calls (all passes) of 160; terrain 97 (64 chunks main + 33 in the shadow frustum), props 39, unit skins about 10, the rest (sky, clouds, CubeFX, projectile mesh, 2 bar meshes, rings, water plane, 8 post passes) about 13; the shipped `perf.mjs` omits `props.update` and reports 145.** three r128 `renderInstances` returns before counting when `count == 0` (read in `.cache/cdn/three.min.js`, both the indexed and non-indexed variants), so a type costs 3 calls only when it has near AND far instances (near main + near shadow + far main); a hidden mesh (`visible=false`, `VoxSkin._flush`) costs 0.

**Model.** `D = T + M + P + U + X + L`: terrain (both passes), markers, props, unit skins, rest, new layers. `U = sum over populated types of (2 * [near>0] + [far>0])`. Expected values BEFORE the P0 measurement (arithmetic from the numbers above, to be replaced by the measured table in `perf_log.md`): after R12 `T <= 32` (design) / 45 (target), `M <= 3`, `P = 39` (governor cap 52), `X = 13`, `L = 5`:

| 16+16 types (32 skins) | U | D (T=32) | D (T=45) | verdict |
|---|---|---|---|---|
| all far | 32 | 124 | 137 | meets 160 |
| all near | 64 | 156 | 169 | T=32 only |
| mixed (every type both) | 96 | 188 | 201 | over by 28..41 |

**Protocol (`tools/spikes/draws_16x16.mjs` in P0 on the baseline worktree, then `tools/perf_assert.mjs --draws` per era; owner TOOLS-VERIFY; tier release-only for the full matrix, T-era for one arena).**
1. Build the page (`dist/voxelwars.html`), Chromium with the AGENTS.md args, same route stub as `tools/perf.mjs`.
2. Arena: for each of the Ancient presets (and, per era, each recipe) at `large`, count terrain+props+markers draws with no units; the worst is `worstArena` (the plan's "large, water+lava recipe" is recorded as a second case).
3. Army: 16 distinct heavy stand-in types per team (Ancient defs sorted by triangle count, ties by id: team 0 takes ranks 1,3,5.., team 1 ranks 2,4,6..), 300 units per team (cap 600 total), explicit placements, `autoFill` off.
4. Distribution control through a dev hook `view.farOverride = fn(u) -> 1 far | 0 near | -1 default` (null in production, one compare per unit, installed only when `globalThis.__VW_TEST__`): `all-far` returns 1, `all-near` returns 0, `mixed` returns 0 for the nearest half of each type's units by camera distance (the script asserts >= 14 of 16 types per team have both near and far instances).
5. Per frame: step 30 ticks, `view.update(1, 1/60, cam)`, `engine.render(1/60)` with `renderer.render` and `renderer.shadowMap.render` wrapped; record per call the deltas of `info.render.calls/triangles`; classify scene meshes by traversal (terrain, markers, props, units near/far per key, fx, projectiles, bars, rings, weather, sky, clouds, water, layers) and assert the traversal prediction equals the measured total within 2.
6. Output JSON `{arena, tier, distribution, passes:{main, shadow, post}, groups, total, tris}` appended to `docs/eras/perf_log.md`; per-tier ceilings: Potato 130 (no shadow pass), Papyrus/Marble/Olympian 160; triangles <= Ancient measured x 1.25 (same script on the baseline). Negative control: restore the 64 fine chunks (R12 off) => red.
7. Camera cases for the terrain target: `sdist` = 25, 60, 110 u (close, super threshold, whole arena); `terrain calls (all passes) <= 45` at all three, `markers <= 3` with 8 markers placed.

**Ladder wiring (rungs chosen by the measured `D_mixed`; decision rule, no human step).**
- (R12) first, always: terrain super-chunks, markers merge, `L <= 5`.
- If `D_mixed <= 160`: stop. Else rung (a): `engine.shadowTypes = N` (default 8): only the N skins with the most near instances per frame keep `mesh.castShadow` (others false, toggled with a 2-frame hysteresis; `customDepthMaterial` untouched); smallest `N >= 6` that reaches 160, else N = 6. Expected mixed result with N = 8: `D = 188 - 24 = 164` (T=32).
- If still over: lower the props governor `DRAW_BUDGET` 52 -> 30 (props measured 39; W9 recipe rule: <= 35 visible (type, variant) batches), expected -9.
- If still over: rung (c): `TYPE_CAP = floor((160 - F - N) / 4)` with `F = T + M + P + X + L` (expected `F = 92`, `N = 8` => 15). This is a user-visible rule change: `game.js:33`, `strings.js:111`, `ui_text.js:178`, `tips.js:24` (AR DA-4 row, two signatures); COORD logs it in `cuts.md`.
- Rung (b) (far impostor): ONE InstancedMesh of 36-triangle capsule impostors for units beyond `impostorDist` 80 u (team tint + type colour from `skin.palette[0]`), replacing up to 32 far draws by 1; only for the `all-far` case, built only if the measured `D_allfar > 160` (not expected). Rung (d) (budget change) only by the user.

**Terrain super-chunks (`terrain.js`, `terrainMesh.js`).** Fine chunks (CH 32 cells = 16 u) stay; their typed arrays are kept (`chunkData[k]`, about 7 MB for large). A super-chunk (`SUPER = 2` => 64 cells = 32 u) is the concatenation of its <= 4 children (index offsets), built lazily the first time it is needed and kept. The renderer shows exactly one set: super set when the smoothed camera distance `rig.sdist >= 66`, fine set when `<= 54` (hysteresis 12 u, no rebuild on switch, visibility toggle only). Edits (`markDirty`): fine chunks rebuild as today (`flush(4)` per frame, 3.1 ms each), each rebuilt chunk marks its super stale; if the super set is visible, stale supers are re-concatenated at most 2 per frame (about 0.4 ms memcpy + upload each); a hidden super stays stale until shown (<= 2 per frame). Worst frame under artillery: 4 x 3.1 + 2 x 0.4 = 13.2 ms (today 12.4 ms), bounded by M's crater rate cap (3 per second). Both sets cast shadows. GPU/heap cost: +1 geometry set (about +8 MB large); included in the R15 soak.

**Markers (`markers.js`).** Three InstancedMeshes for ALL markers (ring `RingGeometry`, pole box, banner box), total <= 3 draws at any marker count (cap 32); `STYLE` rows for `hill exit capture beacon extraction objective` (`capture` = ring + three pennants in team colour of the owner, `beacon` = tall glow pole, `extraction` = ring + arrow chevrons, `objective` = diamond over the target); `vip_start general_spawn waypoint` stay invisible. Ancient `hill`/`exit` keep their look (G8 case `campaign_markers`).

### 3.13 CPU, memory, R11, R13 (R11, R13, R14, R15)

**Part chain (`VoxSkin.add`, the loop of `voxskin.js:236-270`, 6 trig calls per part per instance).** Adopted, exact: a part with `rx = ry = rz = 0` takes the constant rotation (identity, or the precomputed `restM[p]` product) and skips the trig; pose scale 1 skips the three scale multiplies (matrices equal under `==`; `-0 == +0`; shader output identical). Rejected by measurement: the sin/cos lookup table. **Micro-benchmark (Node 22.22, scratchpad `partbench.mjs`, copy of the chain maths, 600 instances, median of 41 interleaved repetitions):**

| parts | static fraction | base ms | static bit | + 4096-entry sin/cos table |
|---|---|---|---|---|
| 16 | 0 | 1.84 | 0% | 2% (noise) |
| 16 | 0.3 / 0.5 | 1.94 / 1.93 | -8% / -9% | -10% / -9% |
| 30 | 0.6 | 3.41 | -29% | -29% |
| 30 | 0.8 | 3.30 | -38% | -39% |
| 48 | 0.8 | 5.16 | -41% | -41% |

The table adds at most 3% on top of the static bit (the shortcut already removes the zero-angle trig), so R14 drops it (RA-PC5); revisit only if a browser CPU profile shows `Math.sin/cos` above 15% of `view.update`. `meta.crewCollapse` makes crew sub-rigs sample their bind pose at anim LOD >= 1 (beyond 38 u), which turns their parts into static parts too. Test `RA-T15`: for random poses with 0-100% zero-rotation parts the static path writes texture rows equal (`==`) to the full path; speed test (not in the gate, reported): static path >= 8% faster at P=16/50%.

**View-CPU threshold (q2_engine Q8, plan 0.4).** `view.update` INCLUDING the animator `pose` calls (they run inside `draw`) at 600 units on each era's heaviest legal composition (16 types per team, Marble, the draw-protocol arena, fixed camera framing the armies, fixed `dt = 1/60`): `median(candidate) <= 1.25 x median(Ancient reference)` with the Ancient reference = the same script on the baseline worktree at 600 Ancient units in the same Chromium on the same machine in the same run (interleaved), 15 repetitions of 40 calls after 3 warm-up calls, A/A noise floor measured first (`tools/perf_assert.mjs --view --aa`; the threshold is `max(1.25 x, ref + 3 sigma of the A/A runs)`). Paper reach (assumptions stated so the P1 measurement can replace them: Ancient reference 7 ms = chain 2.8 ms (Node 1.84 ms x 1.5 browser factor) + animator 1.2 ms + rest 3.0 ms; heaviest Modern army: 30-part vehicles with 60% static parts, chain 3.41 ms x 1.5 = 5.1 ms, animator 600 x 2.9 us = 1.7 ms, rest 3.0 ms): without the static bit 9.8 ms (1.40x, red), with it chain 2.42 ms x 1.5 = 3.6 ms => 8.3 ms (1.19x, green); crew collapse and 16-part gunners (chain 0.9x of Ancient) pull the infantry-heavy armies closer to 1.0x. Tier ceilings are the same ratio per tier (Potato/Papyrus/Olympian run the same script with `q` set).

**R11 near budget.** Two branches in `BattleView.update`: (1) frozen Ancient branch: `tgt = clamp(sqrt(nearBudget / nearN), 0.35, 1)` with the TIER `nearBudget` 40/70/110/260 (RA-PC2); (2) triangle branch `tgt = clamp(sqrt(nearTriBudget / nearTri), 0.35, 1)`, `nearTri = sum(skin.nNear * skin.triangles)`, `nearTriBudget = {potato 0.15 M, papyrus 0.4 M, marble 1.0 M, olympian 2.5 M}` (map 04 section 6 proposal; the P0 triangle measurement may move them, a change needs REVIEWER + COORD), active iff EVERY skin used in the current battle (`r.lastBattle === this.battleSeq`) has `model.meta.bounds`; an era-pure battle (AR3) picks the branch deterministically; stale skins of earlier battles do not count. Cull sphere: with bounds `center = (x, y + b.c[1]*s, z)`, `radius = b.r * max(sv) * s + 0.5`; without bounds `y + 1.4*s`, `3.4*s + 1` (frozen). Triangle gate (double the near count must fail): `RA-T20`.

**Memory (R15; q1_verify Q34, map 04 seam 14).** (1) `VoxSkin._makeMesh` shares the position/normal/color/aFlag/aPart/index `BufferAttribute` objects of `this.geometry` between the near and the far mesh and across `_grow`; only `aFx`/`aFx2` are per mesh; the CPU arrays are released after the first upload (`attribute.onUpload`), `dispose()` unchanged. Expected: the 4 CPU copies of geometry per skin become 1 (about -50% skin heap; the Ancient 43-type session estimate 170 MB -> about 85 MB, to be measured). (2) Skin eviction in `BattleView.setWorld`: skins with `lastBattle < battleSeq - 3` are disposed (and their corpses dropped) when the sum of `triangles x 300 B` of all skins exceeds 220 MB, or always for skins unused for 6 battles. (3) Pre-size capacity from `world.stats` counts (`nextPow2(max army count of the def x 1.25)`), avoiding the 32->64->..->512 re-allocations. (4) `PreviewService` keeps <= 6 live skins (LRU, Codex tab change disposes). (5) Texture upload stays whole (0.7 MB/frame at 570 units: not a limit). Soak (`RA-T19`, release-only): 40 battles alternating the four eras and tiers; `performance.memory.usedJSHeapSize` after battle 40 <= 1.15 x after battle 10 + 20 MB and <= 450 MB (QA2 measured 284 -> 399 MB in 15 minutes of Ancient play), `renderer.info.memory.geometries/textures` plateau within +-5%; negative control: disable eviction.

**R13 `fx.update(0)`.** Now: `CubeFX.update(dt)` returns immediately when `dt === 0` and no `spawn()`/`clear()` happened since the last call (dirty flag; safe because `update(0)` moves nothing and compaction is idempotent). Experiment (scratch branch, TOOLS-VERIFY): remove the per-tick calls in `Game.frame`; run `tools/smoke.mjs` and `tests/visual/battle_demo.js` frames 1/30/120/300 with fixed `fxRand`; rule: if the mean per-channel difference is < 0.5/255 and `fx.liveCount` differs by < 1% at those frames, drop the per-tick calls (PX row of AP-P02, saves up to 0.79 ms x (ticks-1) per frame at the Marble cap); otherwise keep them with the dirty flag.

### 3.14 Goldens and hooks, render side (G8, G11, G12; uiscan/readability)

- **G8 (TOOLS-GOLDEN records, RENDER supplies determinism).** `window.__vw.render.freeze({t})` (dev only) sets `engine.time`, `view.time`, `SKIN_TIME`, the weather clock, `terrain.time` to `t` and `fxRand.s` to a fixed seed (`fxRand` is an `RNG`; its state field `s` is assignable). Scenes: 16 arenas at the default camera and medium size, the 43-unit lineup (rest pose), title, campaign map, plus the cases `campaign_markers` (missions 3 and 6) and `G8-RM` (Reduce Motion on, DA-2). Compare: same Chromium build and SwiftShader, per-channel difference <= 2/255 on >= 99.9% of pixels and <= 12/255 everywhere (PX rows), diff PNG written on failure. Items that must be pixel-equal by construction: default `THEME_LOOK`, `aFx2 = 0` skins (RA-T11), terrain without emit, markers `hill/exit`.
- **G11 (AR 3.7.7 hashes Ancient).** RA adds the per-era digest `tests/golden/g11_<era>.json` (same four parts, `eras:[era]` clips only, `power(def)` of that era's defs) recorded at the era's E-FREEZE and compared in one engine. New Animator inputs (`aim alt recoil fitDur bank rotorK`) are `undefined` in the G11 pose samples, so the Ancient digest cannot move; a test (`RA-T07`) runs the pose samples with and without the new code paths and asserts equality.
- **G12 (Chromium only; AR 3.7.7).** The spy logs `args[14]` (far flag) of `skin.add`; the four trailing args (RA-D23) do not change the logged tuple. Per era a scene of 300 units is recorded at E-FREEZE (`tools/golden/g12_view.mjs --era`). The `lodScale` smoothing uses `dt * 2.5` with the fixed `dt = 1/60`.
- **uiscan/readability hooks (`window.__vw.render`, dev only, no cost in production):** `unitRects() -> [{id, team, def, x0,y0,x1,y1, far}]` (projected screen boxes from the last `update`), `capture(w, h) -> {w, h, rgba}` (the same frame through `readPixels` on the HDR-resolved target), `lookId`, `stats()` (per-pass calls/triangles of 3.12), `flash()` (FlashGuard counters). `#vw-canvas` carries `data-look`, `data-era`, `aria-label` set by `Game.begin`. `tools/readability.mjs` (ER17) computes, per unit rect, luminance contrast and CIEDE2000 of the unit's team-tinted pixels against the 8-pixel ring, min per team and for the CVD palettes, at {close, battle, wide} cameras; fail thresholds are VF's (spec/VF), RA supplies only the data.


### 3.15 Airborne look, preview framing, vehicle clearance (R4, R11; q1_content Q19, Q26; q3_engine 27)

**Airborne look.** Altitude is the sim's (`u.y` = ground + `u.altitude`, M7); air-layer models rest on the ground (skids, feet), so the builders test `minY` unchanged; only ground-effect craft whose model floats declare `meta.hover`. Everything else is view-only and data-driven:

| class | altitude (u, from `def.cruiseAlt`) | shadow blob | banking | rotor / wing |
|---|---|---|---|---|
| drone1 / hover drone | 4 | r = footprint r x (1 + 0.08 alt) <= 1.6x, alpha = clamp(0.55 - 0.03 alt, 0.12, 0.55) | roll = clamp(-0.09 lat, +-0.35), pitch = clamp(0.03 vfwd, 0, 0.22) | 4 discs, `driven` time 8 rps |
| heli1 | 6-9 | same | same | blades 8 rps (anim LOD 0), blur disc from LOD 1 |
| dragon1 / wyvern | 8-14 (boss) | same, x1.3 radius | roll clamp +-0.5 (k 0.06), pitch 0.15 on climb | `fly` flap loop, membranes >= 3 voxels |
| hover1 (tank, skiff) | 0.45 model float | none (real shadow) | tilt `hover.tilt` 0.4 x lateral accel | pads pulse |
| dropship (hover1 builder) | 12 | same | same | engines glow |

`lat = vx*cos(h) - vz*sin(h)` and `vfwd = vx*sin(h) + vz*cos(h)` from `u.vx,u.vz` and the interpolated heading; the angles are smoothed per unit (first order, half-life 0.2 s, state in the same per-unit side table as `extra.aim`) and passed as the existing `pitch`/`roll` args of `skin.add`. ShadowBlobs: centre `(x, heightAt + 0.05, z)`, skipped when `alt < 0.3`; Papyrus and above also have the real sun shadow (alpha x0.6 on the blob for contact clarity); Potato has no shadow map, so blobs serve every unit with `alt > 0.3`. Selection ring and hp bar: the ring sits on the GROUND under an air unit (`battleview.js:239` uses `u.y + 0.08` today: for `layer > 0` it uses `heightAt + 0.08`), the bar stays above the unit. Rotor representation per anim LOD (`meta.driven.lodMin/lodMax`, pose scale 0 hides a part without a mesh change): LOD 0 (< 38 u) spinning blades only; LOD 1-2 (>= 38 u) the dithered blur disc (checker-sparse 2-voxel-thick disc, >= 8 wide so F1/F3 keep it in the far mesh) and no blades; Reduce Motion: blades at rps x0.25 and no disc. Anti-aliasing rule: the blade angle step per frame at 60 fps stays below half the symmetry period (2 blades at 8 rps: 0.84 rad = 0.27 of pi; tail rotor 14 rps: 1.47 rad on 4 blades = 0.94 of pi/2 would alias, so the tail rotor is a 2-blade part with 9 rps). Dragon wing flap (`fly`, `fly_fast`) needs the thickness rule above; breath uses `breathe` plus the sim `dragonfire` cone telegraph and the `fire` fx recipe (3.7). Tracer checklist for heli/drone/dragon (all must be true): altitude visible, blob size/alpha change with altitude, bank on a turn, rotor legible near and far, wing survives at the model's `D` and 80 u, ring on ground, cull sphere from bounds, preview not cropped, hit window reaches the model top (M7 owns the y-test).

**Preview framing (`preview.js setModel`, Codex/Workshop/pickers/share card).** With `meta.bounds`: `item.height = max(1.2, b.hgt * s)`, `item.wide = 2 * b.r * s * 0.9`, orbit look-at `(0, b.c[1] * s, 0)`, camera distance `max(h/th, wide*0.5/(th*min(1,aspect)), 2.2) * 1.28` (turntable rotation uses the bounding sphere, not the longer of length/width); without bounds (every Ancient model) the legacy `wide = max(height*0.55, 1.5)` formula runs unchanged. `meta.bounds` is computed for every NEW model by `src/voxel/bounds.js computeBounds(model)` (pure; same maths as `beasts/common.js modelBounds`, plus the bounding sphere) inside `content.modelFor` for non-Ancient defs only. Test `RA-T21`: for every new unit render the preview at aspects 1:1, 16:9, 3:4: the projected silhouette box stays inside 92% of the frame (no crop) and fills >= 50% of its limiting side.

**Vehicle clearance (q3_engine 27; split with WORLD/M7).** The nav grid has 1 u cells and one `walk` array (`nav.js:15`); the inflated-obstacle map per radius class is WORLD's (M7 `clear` map). RA's part: five radius classes derived from the model, and the rule `def.radius = round(0.5 * bounds.wid * 1.05, 1)` for non-hum1 defs (UNITS row check `RA-T22`: within +-25%).

| class | radius (u) | rigs / examples (width -> radius) |
|---|---|---|
| I infantry | <= 0.7 | hum1 |
| L light | <= 1.2 | insect1 1.1 |
| M medium | <= 1.8 | car1 1.8, gun1 1.5, walker1 1.8, ram1 1.6, dragon1 (ground) 1.7 |
| H heavy | <= 2.6 | tank1 2.0, hover1 1.9, trebuchet1 1.9 |
| B big (air) | <= 3.6 | heli1 2.8 |

W10's six-tank column and the 20-wreck corridor pass use these radii (corridor >= 6 cells).

### 3.16 Flash limiter and Reduce Motion (R16, DA-2; q1_product Q15)

`flashLimiter` is read only by `ui/hud/photo.js:40` and `reduceMotion` only reaches `rig.reduceMotion`, `view.hitStop` and CSS (`main.js:131-138`, read); in battle the limiter does nothing (the `Post.flash` vector and `engine.hurt` are never set by any code). `src/render/flashguard.js` (NEW) is the single owner of large or bright transient effects:

```
guard.allow(kind, area, lum) -> scale 0..1       // kind: 'orbital'|'emp'|'lightning'|'muzzle'|'explosion'|'arc'|'neon'|'hurt'|'portal'
limiter ON (settings.flashLimiter): at most 3 events per rolling second (>= 0.34 s apart); an event is a request with lum >= 0.1 and area >= 0.25 of the screen
                                    (area estimated from the projected radius); returned scale <= 0.5 (peak glow multiplier), rise >= 0.12 s (spawn ramp),
                                    StreakLayer width x0.5, muzzle flash cubes x0.5 without the glow flag, lightning arcs 14 -> 7, no Post.flash, sky/neon/ion flicker off
Reduce Motion ON:                   rig shake x0.15 and kickFov 0 (exist), hit-stop 0 (exists), rotors rps x0.25 and no blur disc, shield flicker <= 3 Hz,
                                    `uCalm` = 1 (pulse, strobe and shield flicker settle), shots = cut (3.11), ion_storm flicker off, weather unchanged
both OFF (default):                 allow() returns 1 and nothing is delayed: effects exactly as designed (Ancient default pixels unchanged)
```
Wiring points (file: function): `battleview.js _onExplosion` (explosion/orbital/emp flash cubes and StreakLayer entries), `_onHit` heavy-hit hit-stop (exists), `projectile_launch` handler (muzzle cubes), `fx.js lightning()` (arcs, glow flag), `shields.js` flicker term, `voxskin.js` `uCalm`/pulse and EMP strobe (`step(fract(uTime*9))` = 4.5 Hz: `uCalm` 1 under the limiter makes it a constant tint), `engine.js setEnvironment` neon band/ion flicker, `cameras.js addTrauma/kickFov/shot`, `post.js` `flash`/`hurt` (set only through the guard). **Luminance test `RA-T16` (Chromium, release-only; fast variant on one scene in T-era).** Scene: 6 MG teams firing + an orbital strike every 0.5 s + an EMP pulse every 0.7 s + 3 lightning per second on `sf_neon_night`; 4 s at 30 fps; each frame downscaled to 160 x 90, relative luminance (Rec. 709, linear) per frame and on a 4 x 4 grid; a general flash = a pair of opposite luminance changes of >= 0.10 where the darker state is < 0.80, in >= 4 of 16 cells (>= 25% of the screen); pass with the limiter ON: <= 3 flash events in every rolling 1 s window and max frame-to-frame change of the mean luminance <= 0.12; positive control (limiter OFF, same scene): >= 4 events in some window, else the test is red as "control not exercised". Reduce Motion checks: rotor rps <= 0.25 x design (read from the Animator driven state), dome alpha spectrum has no component above 3 Hz, `rig.shot` jumps to `to` within 1 frame.

### 3.17 Look-dev protocol, tracer matrix, spikes

**Per-model acceptance (script `tools/lookdev.mjs <unit>` writes `docs/eras/lookdev/<rig>/<unit>.json`; every line must be true; items marked J are judged by a fresh agent that did not build the model and are recorded as a CSV `item,verdict,reason`).**
1. Builds without fallback (`meta.fallback` absent), parts/voxels/height/footprint/minY limits of 3.2.
2. 40 px silhouette (J): the model's side and 3/4 silhouettes at 40 px height identify its role among three options in >= 8 of 10 blind trials; distinct from every sibling of its faction (silhouette-hash IoU < 0.85; ER3 recolour detection).
3. Far readability: `farLint` clean; defining feature keeps >= 60% of near silhouette pixels at its own `D`, `0.35 D`, 80 u (3.1).
4. Tint: pooled >= 30% (hum1) / >= 15% non-hum1 and every projection >= 15% (hum1) or >= 3% (existing builder rule); far tint share >= 0.7 x near.
5. Triangles: near and far within the class budget of 3.2; `lodK2` and `D` recorded.
6. Bounds and preview: `meta.bounds` present, hover/air declared, preview not cropped (RA-T21).
7. Clips: every requestable clip registered with a DEFAULT_META row meeting the timing contract; reaction set complete (RA-T08); filmstrips exist.
8. Reference (J): matches `docs/eras/ref/<rig>/` on the checklist side-profile / proportion / defining feature; where a CC0 kit could be voxelised the side-view IoU >= 0.55 (`docs/eras/ref/EVAL.md` records the trial per class tank, heli, mech, dragon).

**Iteration caps.** Infantry 2 build-sheet-fix rounds, vehicle/siege/air/alien 3, boss and hero 4 (the top-8 heroes: dragon, tank, heli, walker, power armour, hover tank, trebuchet, queen). A cap hit is a COORD decision recorded in `cuts.md` (reuse a sibling silhouette or cut), never a silent fourth round.

**Filmstrip protocol.** `node tools/filmstrip.mjs <fixture> <clip> --frames 12 --view both [--state ...]` (fixtures extended with `registerFixture` per new rig, `SETS` table gains the new categories) for every attack clip (red hit frame), `reload_gun`, every death class of the rig's reaction table, both hits, each gait at its `speedRef`, loops (seam). Output `docs/filmstrips/<rig>_<clip>.png`; reviewed by a REVIEWER agent who did not build it: contact visible at the hit frame, no part or weapon intersection > 2 voxels, loop seam, resting pose on the ground (A7), readable at 40 px; verdict CSV `docs/eras/lookdev/<rig>/filmstrips.csv`.

**Reference packs.** `docs/eras/ref/<rig>/` holds 3-5 CC0/public-domain images per rig (side, top, 3/4; hosts reachable per plan section 10: OpenGameArt, Kenney, archive.org, Wikimedia Commons with a User-Agent and backoff) and `SOURCES.md` (file, URL, licence, licence-page snapshot sha256, retrieval date). They are working references only: never packaged (`tools/build.mjs` ignores `docs/`), and silhouettes are references for proportion, not for markings (VB).

**Tracer matrix (what a rig tracer proves in P1 without its mechanic; UC render clauses U-R1..U-R10: non-fallback model, far lint, preview framing, every requestable clip with timing, reaction table, `PROJ_FX` row, `FX_CLASS` row, tint floors, bounds/hover declared, tris within class).**

| rig | tracer unit | provable in P1 (look-dev harness) | needs |
|---|---|---|---|
| hum1 gunner | rifleman, power-armour trooper | U-R1..U-R10, burst/reload timing, SP-1 | M2 (P1) to fire |
| tank1 | main tank | model, treads, `aimParts` with injected `extra.aim`, far lint, 600-unit perf tracer | M8 turret, M10 shells (P2) |
| gun1 + crew | howitzer | crew budget, `CREW gun`, recoil | M10 arc/crater (P2) |
| car1 | jeep + gunner | wheel roll, seat crew | M8 |
| heli1, drone1, dragon1 | gunship, recon drone, Cinderwyrm | rotor LOD, blob, bank, wings far, preview | M7 (P2), M14 set-piece |
| trebuchet1, ram1 | trebuchet, ram | model, crew, `fire_trebuchet` timing | M10/M12 (P2) |
| hover1 | hover tank | bob, pad pulse, hover exemption, shield rim | M7, M4 |
| insect1, quad species | skitterer, queen, scuttler | tripod gait, foot slide | M2b swarm |
| walker1 | walker | gait, ground-shake event, topple | M8, M17e |

Calibration checkpoint 2 (q3_program 18) measures the U-R clauses for every rig and the sim clauses only for the modules landed by then (the table's last column).

**P0 spikes (owner SPIKE with ANIM-RIGS; each time-boxed to 3 sessions; reviewer REVIEWER; deadline: P0 exit item (d); scripts in `tools/spikes/` (NEW, AP-T08), raw output in `.cache/spikes/<id>/`, verdict in `docs/eras/spikes/<id>.md` with the fields `question, setup, metrics (table), decision, amendments`).**

| spike | experiment | success metrics | decision rule | outputs |
|---|---|---|---|---|
| SP-1 rifle pose | 3 body types x 4 helmets (round, tall crest, full visor, horned) x {none, power armour (scale 1.35, bulky shoulder module)}; weapons rifle, pistol, mg, rocket tube (9x40x9); draft clips `shoot_rifle idle_gun walk_gun reload_gun` + `crouch`; per frame world-space voxel overlap of weapon vs head/body/arm/offhand sets, support-hand (`grip_off`) distance to the forestock, muzzle-ray clearance of the head | per cell: overlap <= 2% of weapon voxels in >= 95% of frames of every clip and no frame above 6%; support hand within 0.35 u in >= 90% of frames; AIM rows within 0.15 rad of 3.4 | all cells pass: keep 3.4 (tune <= 0.15). <= 3 cells fail: per-helm `gunOk:false` and per-body `aimOffset` (<= 0.2 rad). > 3 fail: extra hum1 parts `padL padR` (or a `gunner` body module with a foregrip attach) as a deliberate AP row (blueprint opt-in, Ancient bytes unchanged). Still failing: one-handed carry in motion, two-handed only inside `shoot_*` | `SP-1_rifle_pose.md`, `SP-1/matrix.json`, `SP-1/<body>_<helm>_<armour>.png` |
| SP-2 tread / rotor | A: tank1 with (a) cleat shells period 2 + overhang ends, (b) period 3, (c) six road wheels; 1.5/3/5 u/s, 120 frames at 60 Hz, side view; B: heli1 rotor (i) blades only, (ii) blades + LOD disc, (iii) disc only; plus one commander figure on tank1 | A: end-pop amplitude <= 0.5 voxel, cross-correlation lag of the tread region equals `v*dt` within 0.5 voxel, advance per frame <= 0.45 period, far-mesh ridge/groove luminance contrast >= 10% at 28 u; B: angular step <= 0.5 of the symmetry period, far disc recall >= 60%, no backward-rotation frame pair; commander: near <= 22 K, far <= 6 K, parts <= 15 | A: first of (a),(b),(c) passing all, else static treads + wheel roll. B: (ii) unless (i) is legible far. Commander kept iff budgets hold | `SP-2_tread_rotor.md`, frames in `.cache/spikes/SP-2/` |
| SP-3 mixed voxel size | one scene (castle keep + 20 hum1 + one tank) at voxel sizes (0.1, 0.1, 0.1), (0.1, 0.15, 0.2), (0.1, 0.1, 0.2); keep hollow with a 250 K voxel budget at 0.1 | edge-width ratio of adjacent objects <= 2.2 (infantry vs tank <= 1.6); keep near triangles at 0.1 vs 0.2; shimmer = frame-diff energy; blind panel of 3 agents picks the most coherent | uniform 0.1 unless the 0.1 keep exceeds 60 K near triangles or 100 K voxels (then 0.2 for buildings > 10 u only); tank1 stays 0.15 iff the panel ties or prefers it (>= 1 of 3) and ratio <= 1.6, else 0.1 (all tank1 grids x1.5, tables regenerated) | `SP-3_voxel_size.md` (W2 line), sheets |
| SP-4 mech gait | walker1 prototype with `plantRigidLeg` legs at walk/run (0.8 x and 1.4 x design speed) vs hum1 x2.4 suit; ground-shake event per step; topple death on the ground | A4 live foot slide <= 20%, steps/s 0.8-1.6, bob 0.10-0.25 u, A7 death rests on the ground, panel (3 blind agents) reads walker1 as 'mech' >= 2 of 3 and the suit as 'giant in armour' | walker1 accepted iff all hold. Else reverse-knee two-segment legs (+4 parts `legUL legLL legUR legLR`, `gait.js` constants parameterised) as an AP row; else mechs become hover craft and only the one suited giant remains (plan D21) | `SP-4_mech_gait.md`, frames |

The verdict files are the only inputs the P0 exit checklist reads (`tools/p0_exit.mjs`, VF): each must exist with a non-empty `decision` field, and an amendment line for any rule that changed in this file.


### 3.18 R1..R17 work map (closes the "unplaced R items" of q1_disposition C9; sessions = 1.3 h; `wbs.csv` carries the final numbers)

| R | content | files (owner RENDER unless noted) | phase | sessions |
|---|---|---|---|---|
| R1 | `PROJ_FX`, muzzle/impact recipes, contract | `render/projfx.js` NEW, `battleview.js`, `era_*/fxdata.js`, `tools/contracts.mjs` | P1 | 2 |
| R2 | StreakLayer | `render/streaks.js` | P2 (after M2 `beam`) | 1 |
| R3 | ShieldLayer + far rim | `render/shields.js`, `voxskin.js` | P2 (after M4) | 2 |
| R4 | ShadowBlobs, banking, ring-to-ground | `render/blobs.js`, `battleview.js` | P2 (after M7) | 1 |
| R5 | HazardLayer | `render/hazards.js` | P2 (after M11) | 2 |
| R6 | shader v2, flags, cloak, SE table, caps log | `voxskin.js`, `voxel/{grid,mesher,lod}.js`, `render/statustint.js`, `app/boot.js` (INTEGRATION request) | P1 | 4 |
| R7 | `THEME_LOOK`, sky uniforms, preview/terrain fog | `render/looks.js`, `engine.js`, `preview.js`, `terrain.js` | P1 | 2 |
| R8 | weather rows | `weather.js`, `engine.js` | P2 | 1 |
| R9 | view subscriptions | `battleview.js` | P1 skeleton, +1 handler per module | 1 |
| R10 | `fxClass`, recipes, gore/corpse hooks | `render/fxrecipes.js`, `battleview.js`, `fx.js` | P2 (after M17e) | 2 |
| R11 | cull from bounds, triangle near budget | `battleview.js`, `voxel/bounds.js` | P1 | 1 |
| R12 | terrain super-chunks, markers merge, ladder hooks, measurement | `terrain.js`, `terrainMesh.js`, `markers.js`, `tools/perf_assert.mjs` | P1 (before content) | 4 |
| R13 | `fx.update(0)` | `fx.js`, `game.js` (INTEGRATION request) | P1 | 1 |
| R14 | static bit, crew collapse | `voxskin.js`, `animator.js` (ANIM-CLIPS) | P1 | 2 |
| R15 | shared geometry, eviction, prewarm, preview cap | `voxskin.js`, `battleview.js`, `preview.js` | P1 | 2 |
| R16 | FlashGuard, Reduce Motion wiring | `render/flashguard.js`, `cameras.js`, `fx.js`, `post.js` | P2 | 2 |
| R17 | `CameraRig.shot`, follow altitude | `cameras.js` | P1 | 1 |

R15 also carries `BattleView.prewarm(defs, budgetMs)`: builds the skins of the placed types in slices of <= 8 ms during placement/briefing (first-sight build is 25-110 ms cold per type), called by INTEGRATION from `Game` (q1_scope Q30). Hot-file touches per file after P1 are budgeted by AR's owner table (OW-05/06).

## 4. Acceptance

Tiers: **F** = T-fast (Node, in every hand-back gate), **E** = T-era (Chromium, one era), **R** = release-only. Every test registers a criterion (`criterion('RA-Txx', {er, owner, tier, negctl})`) and has `tests/negctl/RA-Txx.mjs` (a mutation of the code or data under test that must turn the named check red; QA draws >= 8 of them by its own seed).

| id | ER | deliverable | script / test | inputs | thresholds | owner | tier | negative control (mutation -> red) |
|---|---|---|---|---|---|---|---|---|
| RA-T01 | ER4 | far truth table is current | `tests/voxel/far_truth.test.mjs`, `tools/spikes/far_truth_table.mjs` | the real `lod.js`; fixture `tests/fixtures/far_truth_table.json` | generator output (36 cross-sections x 4 parities + 8 stripe rows) equals the fixture exactly | TOOLS-VERIFY | F | copy `lod.js` with `n < 2` (env `VW_LOD_PATH`) -> table differs |
| RA-T02 | ER4 | `farLint` on every new model + Ancient audit | `tests/voxel/farlint.test.mjs`, `tools/farlint.mjs --era all` | all new builders x variants; Ancient models vs `farlint_ancient.json` | zero `FAR_LOSS/FEATURE/TINT/FAT/TRIS` on new models; Ancient findings equal the fixture (no new ones) | RENDER | F | a 2x2 barrel at odd origin parity in a fixture model -> `FAR_FEATURE` |
| RA-T03 | ER4 | far silhouette pixels | `tests/visual/far_sil.page.js` + `tools/far_sil.mjs` | each `farKeep` feature, near vs far at `D`, `0.35 D`, 80 u | far keeps >= 60% of the near feature pixels; tint share >= 0.7 x near | RENDER | E (Ancient exemplars R) | rotor blade 2 wide at odd x -> recall < 60% |
| RA-T04 | ER3 | rig part tables, limits, crew budgets | `tests/beasts/rigs_eras.test.mjs` | the tables of 3.3; builders x variants x crew 0..max | ids/parents/grids/pivots/origins equal the table (1 vox); parts <= 48; height < 9, x < 6, z < 10, minY in (-0.051, 0.11) or `meta.hover`; voxels 250..140000; tint floors; class tri budgets | ANIM-RIGS | F (tris: E) | rename `turret` or add a 5th crew -> red |
| RA-T05 | ER5 | clip format, minimum sets, new ids | `tests/anim/eras_clips.test.mjs` (A1/A2 extension; PARTS/SETS tables move to `tests/anim/_rigtables.mjs`) | 166 new clips; the 46 + 21 ids; fixture `ancient_clip_ids.json` | A1 valid; every rig plays its set without warnings; every new plain id has a DEFAULT_META row; no collision with the 93/157 Ancient ids | ANIM-CLIPS | F | give `shoot_rifle` a `hit` frame 0.40 s later than its row -> red |
| RA-T06 | ER5 | ClipLib ownership | `tests/anim/plain_slots.test.mjs` | eras registered in all orders of every era subset | R-OWN-1..6: new hum1 ids disjoint from Ancient plain ids; exactly one registrant per new attack id; digest of `{owner, meta}` identical for every order; no `ClipLib.reset` in `ensure_era.js` | ANIM-CLIPS | F | register a hum1 `reload` -> red |
| RA-T07 | ER5 | Animator additions | `tests/anim/meta_eras.test.mjs` | `driven aim aimParts crewTable hover bounds airMap recoil flinchK fit` on the new rigs; the G11 pose samples with/without new paths | each schema field behaves as 3.6; Ancient pose samples equal (1e-5) | ANIM-CLIPS | F | give `catapult1` `crewTable:'gun'` -> G11 samples differ |
| RA-T08 | ER5 | reaction tables | `tests/anim/reactions.test.mjs` | 16 tables, `RIG_LINGER`, `KILL_CAUSES` | all ids registered for the rig; `dur + 0.2 <= RIG_LINGER`; `default` exists; >= 3 distinct death clips and 2 hit clips per rig; every cause class resolves | ANIM-RIGS | F | delete class `blast` of `mod_tank` or set `RIG_LINGER.tank1 = 1.0` |
| RA-T09 | ER5 | timing contract | `tests/anim/timing_eras.test.mjs` | baked vs DEFAULT_META; burst legality; `fit` | new attack ids: dur +-5%, hit +-0.03 s; `E_BURST` holds for every def; `reload_gun` ends within 1 frame of `stateDur` | ANIM-CLIPS | F | remove `meta.fit` -> reload end mismatch |
| RA-T10 | ER10 | fx classes, recipes, gore, corpses | `tests/render/fx_recipes.test.mjs` (+ page part) | `FX_CLASS`, `FX_RECIPE`, gore x corpses matrix, 150-battle fuzz of `unit_hit/kill` | every new def has a class; every era:class cell resolves; spawn <= budget per frame; `off` emits no blood/goo and still emits machine sparks; fresh profile renders a Modern kill with `puff` | RENDER | F (page: E) | map Modern organic `gore.auto` to `red` -> red |
| RA-T11 | ER13 | shader v2 | `tests/render/shader_v2.page.js` | lineup render v1 vs v2 with `aFx2 = 0`; cloak/depth variants; forced v1 fallback | zero-lane render within 1/255 on every pixel and 0 pixels > 2/255; programs link (no GL error); cloak discards at `x = 1`; fallback hides enemy cloaked units; caps logged | RENDER | E | set a nonzero default for lane `y` -> parity red |
| RA-T12 | ER13 | SE tint table | `tests/render/se_tint.test.mjs` | 24 slots | 24 rows; legacy slot->mode equals `0,13,5,3,7,4,12,10 -> 1,2,4,3,5,6,6,7`; no use of modes 6-7 | RENDER | F | delete row 21 -> red |
| RA-T13 | ER17 | looks, weather, liquids, emissive | `tests/render/looks.test.mjs` (+ page) | `THEME_LOOK`, weather rows, liquids, a 2-material emissive arena | ids equal `THEMES`; default look equals v8 sky/fog/light (times x weathers) within 1e-6; weather rows == `WEATHER_KINDS`; emissive chunk differs, Ancient chunk arrays unchanged | RENDER | F (page: E) | change the default exposure -> reference vector red |
| RA-T14 | ER20 | camera | `tests/render/camera_shot.test.mjs` | stub rig + arena | lifecycle, cancel/restore, defer rules, Reduce Motion cut, follow altitude, zero allocation per frame | RENDER | F | drop the `rm` branch -> red |
| RA-T15 | ER13 | part chain | `tests/render/partchain.test.mjs` | random poses, 0-100% static parts, P = 6..48 | static path rows `==` full path; reported speedup at P=16/50% | RENDER | F | treat a rotated part as static -> rows differ |
| RA-T16 | ER18 | flash limiter + Reduce Motion | `tools/flash_check.mjs` (+ `tests/render/flashguard.test.mjs`) | the worst-case scene of 3.16 | limiter ON <= 3 flash events per rolling second and frame delta <= 0.12; OFF >= 4 (control); Reduce Motion checks | TOOLS-VERIFY | R (F: guard unit test) | `allow()` always 1 with the limiter ON -> red |
| RA-T17 | ER3 | `PROJ_FX` and layers | `tests/render/projfx.test.mjs`, `tools/contracts.mjs` | every `ranged.proj` of every def; Ancient rows | each kind has `PROJ_FX`, `PROJ_VIS`-compatible fields and an audio row (registry V07); Ancient rows equal `PROJ_VIS` verbatim; new layers <= 5 draws and <= 12 K tris | RENDER | F | delete the `rifle` row -> red |
| RA-T18 | ER13 | draw-call matrix | `tools/perf_assert.mjs --draws` (prototype `tools/spikes/draws_16x16.mjs`) | 16+16 types, 3 distributions, worst arena, 3 camera distances | 3.12: total <= 160 (Potato 130); terrain <= 45; markers <= 3; layers <= 5; tris <= Ancient x 1.25; prediction == measured +-2 | TOOLS-VERIFY | R (one arena: E) | restore 64 fine chunks or unmerge markers -> red |
| RA-T19 | ER13 | memory soak | `tools/soak.mjs --eras` | 40 battles alternating eras and tiers | heap after 40 <= 1.15 x after 10 + 20 MB and <= 450 MB; geometries/textures plateau +-5% | TOOLS-VERIFY | R | disable skin eviction -> red |
| RA-T20 | ER13 | near budget + view CPU | `tools/perf_assert.mjs --view` | 600 units per era heaviest composition, 15 reps, A/A first | `median <= max(1.25 x Ancient, ref + 3 sigma)`; triangle branch: doubling the near count makes the triangle gate fail | TOOLS-VERIFY | R | `nearTriBudget x2` -> triangle gate red; disable the static bit -> view gate red on the vehicle army |
| RA-T21 | ER21 | preview framing | `tests/beasts/preview_eras.mjs` + page | every new unit, aspects 1:1, 16:9, 3:4 | silhouette inside 92% of the frame, fills >= 50% of the limiting side | RENDER | E | use the legacy `wide` formula for tank1 -> crop red |
| RA-T22 | ER7 | radius rule | `tests/units/radius_eras.test.mjs` | every non-hum1 def | `def.radius` within +-25% of `0.5 x bounds.wid x 1.05`; class table | UNITS | F | tank radius 0.7 -> red |
| RA-T23 | ER13 | terrain edits | `tests/render/terrain_super.page.js` | 40 craters in 10 s on large | fine chunks rebuild <= 4 per frame; visible stale super refreshed within 2 frames; worst frame cost <= 13.2 ms + 1 ms; geometry equals a full rebuild | RENDER | E | skip the super refresh -> stale check red |
| RA-T24 | P0 exit | spike verdicts | `tools/p0_exit.mjs` (VF) reading `docs/eras/spikes/SP-*.md` | 4 verdict files | each exists with non-empty `decision` and the fields of 3.17 | SPIKE | F | delete `SP-2_tread_rotor.md` -> red |
| RA-T25 | ER3 | look-dev gate (U-R1..U-R10) | `tools/lookdev.mjs --check` | every new unit's JSON | all numeric items of 3.17 true; J items present with verdict `pass` | UNITS / REVIEWER | E | strip `farKeep` from a model -> red |

Runtime budget of the Node tier (F): RA-T01/02/04..09/12..15/17/22/24 are table or pure-geometry tests (each < 20 s; the farLint over 11 rigs x variants builds `ModelDef`s only); Chromium tests reuse the existing page harness (`tools/shot.mjs` bundling).

## 5. Residual ledger

| source id | requirement (short) | answered in | status |
|---|---|---|---|
| q3_engine 5 (with spec/M) | sim reads clip timing without a rig; every windup/launch/fire id registered by one rig; new hum1 ids must not equal existing plain ids; both-order digest | 3.5 R-OWN-1..6, RA-T06; exactly-one rule narrowed to NEW attack ids because the Ancient bake already shares three ids (RA-PC3); M owns `E_CLIP` | answered |
| q3_engine 25 | far-mesh truth table GENERATED from `downsample2`; tint rule; far switch outside `shadowRadius*1.05` of the focus; look-dev at 58 u | 3.1 (script text, 36-row table, tint table, F1-F5, switch rule with tier values, distance table, protocol incl. 57.75 u ring) | answered |
| q3_engine 26 | draws per pass, per populated mesh; all-far/mixed/all-near at 16+16; `renderInstances` count==0; rung (c) touches `TYPE_CAP` + copy = AP rows | 3.12 protocol steps 1-7, ladder wiring (c) with DA-4 files | answered |
| q3_engine 27 | vehicle clearance: inflated-obstacle map per radius class, W10 six-tank column | 3.15 radius classes and rule; the nav map is WORLD's (M7 `clear`), tested by W10 with these radii | answered here for the render side, implementation owner WORLD |
| q3_engine 33 | rifle poses register new ids only; `ClipLib.reset()` must not be called by `ensureEra` | 3.5 (new ids list, R-OWN-1, R-OWN-5, RA-T06 grep) | answered |
| q3_engine 40 | R11 frozen Ancient branch stated precisely; triangle branch only when every skin has bounds | 3.13 R11 (tier values 40/70/110/260, not the constructor 140: RA-PC2; `lastBattle` rule) | answered |
| q3_engine 8, 9, 10, 38 (AR) | AP seed list, G11/G12 content, registry verify rows | 3.14 (trailing `add` args, per-era G11/G12), 3.8 (V07 rows), section 6 (new files covered by AP-N01) | cross-reference only |
| q3_engine 13, 28, 36 (M, W, VF) | SE tint, W10 vehicle formations, view.update measurement | 3.9 SE table; 3.15 radii for W10; 3.13 protocol (VF registers the row) | answered render side |
| q3_program 15 | `spec/UC` clauses for the render side | 3.17 U-R1..U-R10, RA-T25 | answered |
| q3_program 18 | which rig classes are measurable at calibration checkpoint 2 | 3.17 tracer matrix | answered |
| q3_product 4, 5 | consumers of the gore value in render; `resolveGore`; `auto` | 3.7 (consumer lines 40/275/333/fx.js:67, styles `puff oil goo plasma`, obey rules) | answered render side (CU4 owns the resolver) |
| q3_product 12 | time-portal obeys the flash limiter | 3.16 (`guard.allow('portal', ...)`) | answered |
| q3_product 34 | arbitration of shots vs input | 3.11 `canShot()` guard and rules (CU owns the table) | answered render side |
| q2_engine Q1 | one timing regime; rate-limiting clips +-5%; bounded divergence | 3.5 timing contract (all new attack ids +-5% / 0.03 s), RA-T09; regime and bound are AR6/M | answered clip side |
| q2_engine Q2 | 160 draws arithmetic, target for terrain, lever ladder | 3.12 model, table (188-201 mixed), ladder decision rule, T <= 45, markers <= 3 | answered; outcome decided by P0 measurement |
| q2_engine Q8 | view-CPU threshold, R14 optimisations with expected savings | 3.13 threshold, A/A, paper reach, micro-benchmark table | answered |
| q2_engine Q12 | G11/G12 and R11 unit-count rule | 3.14, 3.13 R11 | answered |
| q2_engine Q13 | far-mesh rules vs `lod.js`, look-dev distances | 3.1 | answered |
| q2_engine Q14 | lazy bake mechanism and cost | 3.5 (166 clips, 28/45/32 ms, closure 77 ms for Sci-Fi); mechanism = AR `ensureEra` | answered clip side |
| q2_schedule Q8 | tracer per rig, what it proves | 3.17 tracer matrix | answered |
| q2_schedule Q9 | M17 split: tables as data after the freeze | 3.7 (`reactions.js` data, `RIG_LINGER` constants; RA-T08 plus M's permutation test) | answered |
| q2_schedule Q15 | per-unit / per-projectile rows in era-pack data, not hot files | 3.7 `FX_CLASS`, `FX_RECIPE`, `REACTIONS`, 3.8 `PROJ_FX` in `era_<id>/fxdata.js` + `reactions.js`; RENDER touches `battleview.js` through registry reads only | answered |
| q2_schedule Q16 | render changes under the Ancient policy | section 6 table of policies; features default off => OI/PX; R16 is DA-2 | answered |
| q2_product Q4 | R10 `fxClass` as a decided table; corpses | 3.7 tables | answered |
| q2_product Q6 | R17 shot, input and Reduce Motion policy | 3.11 | answered render side |
| q2_product Q21 | visual check of tone | RA provides `silhouette hash`, far palette extraction (RA-T25); the palette/emblem rules are `spec/VB` | cross-reference |
| q1 ENGINE-Q27, Q35 | cloak variant, depth, early-Z, per-tier dither, far shields, caps log + Potato fallback; SE->tint table | 3.9 | answered |
| q1 ENGINE-Q13, Q18, Q20, Q31 | render cap and stuck bullets; timing; draws per tier; tread/rotor | 3.8 (`pmCap`, `sticky`), 3.5, 3.12 (Potato 130, others 160), SP-2 + 3.6/3.15 | answered |
| q1 CONTENT-Q2, Q3 | far mesh at switch distance; per-rig clip and reaction lists | 3.1, 3.5, 3.7 | answered |
| q1 CONTENT-Q13, Q14, Q15 | `reload_gun`; burst/fire-rate contract; rifle pose spike | 3.5, SP-1 | answered |
| q1 CONTENT-Q16, Q17, Q18 | reference packs; boss rigs; mech gait | 3.17 reference packs; 3.2/3.3 (dragon1, queen, walker1 heavy), SP-4 | answered |
| q1 CONTENT-Q19, Q26, Q27, Q28, Q29, Q30, Q35 | airborne look; preview framing; mixed voxel size; crew budget; dragon cost; clip/bake cost; tracer per rig | 3.15, 3.15, SP-3, 3.2 crew table, 3.2 class budgets + 3.3 notes, 3.5, 3.17 | answered |
| q1 PRODUCT-Q6, Q14, Q15 | fxClass tone table; readability data hooks; flash limiter | 3.7, 3.14 hooks, 3.16 | answered (thresholds of Q14 are VF's) |
| q1 SCOPE-Q3, Q18, Q30 | tracer meaning; R14/R15 in P1; lazy bake and prewarm | 3.17, 3.13 + 3.18, 3.5 + 3.18 (`prewarm`) | answered |
| q1 VERIFY-Q18, Q25, Q34 | triangle/draw thresholds; readability metrics; memory/boot | 3.2 + 3.12 + 3.13; 3.14 hooks (`unitRects`, `capture`); 3.13 soak | answered render side |
| q1_disposition C3, C9 | what a tracer proves; unplaced R items | 3.17, 3.18 | answered |
| q1_disposition ENGINE-Q32 | warm-up pollution across eras | not RA (SIM warm-up, AR/M) | n/a |

## 6. Plan corrections and policy

| id | plan / document statement | code evidence | correction |
|---|---|---|---|
| RA-PC1 | Plan 5: "a feature survives iff 2x2 even-aligned in both axes, or >= 3 wide in one axis" | generated table 3.1: >= 3 wide survives at every parity but `4x1 1x4 4x2 2x4` keep only 50% at odd parity; `2x2` is faithful only at parity (0,0) | rule F1/F2 of 3.1; lint measures the actual parity |
| RA-PC2 | Plan 5 / q3_engine 40: far switch at `56*sqrt(lodK2)`, `nearBudget = 140` | `battleview.js:43` constructor defaults are overwritten by `Game._applyTier` (`game.js:86`): lodDist 24/36/48/76, nearBudget 40/70/110/260 | 3.1 and 3.13 use the tier values; Marble switch is `48*sqrt(lodK2)` |
| RA-PC3 | q3_engine 5: "exactly one rig registers each windup/launch/fire id" | bake probe: `strike_ram` on chariot1+trojan1, `launch` on hum1+catapult1+ballista1, `shoot_bow` on hum1+chariot1 | rule applies to NEW attack ids; shared Ancient ids grandfathered by fixture and a timing-agreement rule (3.5 R-OWN-2/3) |
| RA-PC4 | AR KIND_TABLE: `REACTIONS` keyed by rig id; recipes have no kind | M17e keys tables by `def.react` (a string in the def); recipes are per era x class | AMENDMENT to AR: `REACTIONS` key = `def.react` (era-prefixed); one new idmap kind `fx_recipe` keyed `<era>:<class>`; `THEME_LOOK` is a field of the theme row (no kind); weather and liquid rows are engine vocabularies in `src/render` |
| RA-PC5 | Plan R14 / AP-R01: "static bit and sin/cos cache" | micro-benchmark 3.13: the table adds <= 3% over the static bit | the sin/cos table is NOT built; the AP-R01 row text stays valid (superset) |
| RA-PC6 | AR 3.7.7 G12: "the LAST argument is the far flag" | `add` gains four trailing args | wording becomes "argument index 14"; the logged tuple is unchanged |
| RA-PC7 | Plan 0.4 / ER13: draws <= 160 at 16+16 | arithmetic 3.12 with map-04 numbers: mixed 188-201 after R12 | reachable only through ladder rung (a) (+ props governor, + rung (c) `TYPE_CAP` 15 expected); the ladder is decided by the P0 table, DA-4 is a real possibility, not a remote one |
| RA-PC8 | map 03 gap table: fake altitude by raising the model origin | M7 gives `u.y = ground + altitude` | air models rest on the ground; `meta.hover` only for floating craft |
| RA-PC9 | plan 5: `walker4` (q1 disposition CONTENT-Q17 boss rig) | plan v3.1 rig list has none | dropped: boss mech = `walker1` heavy variant (RA-D04) |
| RA-PC10 | AP-R04: "camera follows `u.y` (0 for ground units)" | interpolated ground `u.y` is not exactly `heightAt` | follow uses `u.altitude` (exactly 0 on the ground) |
| RA-PC11 | `hum_lite.js` header: "`compileSoldier(bp,{lite:true})`" | no `lite` option exists in `compileSoldier` | erratum; the lite crew is the `hum_lite` geometry (3.2) |

**Ancient policy of this file's deliverables (AP rows are AR's; this is the per-feature statement).** All new fields, args, tables and shaders default to the legacy behaviour and are exercised only by data of the new eras: shader v2 with zero lanes (PX, RA-T11), default `THEME_LOOK` (PX, RA-T13), `PROJ_FX` Ancient rows verbatim (OI), terrain without emit (PX), super-chunks and markers merge (PX, G8 incl. `campaign_markers`), static part bit (PX), `meta.*` absent (OI, G11), `fit`/`recoil`/`aim` extras absent (OI), triangle near budget and bounds-based cull/preview only with `meta.bounds` (OI), `CubeFX.update(0)` early-out (PX), follow altitude 0 (PX), `FlashGuard` allow() = 1 with both settings off (OI), R16 with a setting on is DA-2 (baseline `G8-RM`). New files fall under AP-N01 (`src/render/{projfx,looks,statustint,fxrecipes,streaks,shields,blobs,hazards,flashguard}.js`, `src/voxel/{farlint,bounds}.js`, `src/anim/clips/<era>/*.js`, `src/content/shared/{crew_lite,wreck}.js`, `src/content/era_<id>/{fxdata,reactions}.js`, `tools/spikes/*`, `tools/{farlint,lookdev,flash_check,soak}.mjs`); edits to existing files are the AP-A01/A02, AP-V01, AP-R01..R05, AP-C03 rows. No file of AP-A04 (shipped clip data) is edited.

## 7. Open items

| id | item | owner | deadline phase |
|---|---|---|---|
| OI-RA1 | AR amendment of RA-PC4 (`REACTIONS` key semantics, new kind `fx_recipe`) | DESIGN-ARCH | before the REGISTRY work package of P1 starts (AR is final; a logged amendment re-runs the AP lint) |
| OI-RA2 | `spec/W` theme vocabulary must contain exactly the 21 era look ids of 3.10 plus the eight Ancient aliases (RA-T13 fails otherwise) | DESIGN-WORLD | `spec/W` final (P0) |
