# UNITS-A -> COORD / ANIM / UNITS-LIB / EDITORS-B : integration notes and requests

Models: `src/content/era_ancient/units/units_a.js` (`MODELS`, `BLUEPRINTS`): peltast, philosopher, strategos, pilum_thrower, centurion, gladiator, senator, khopesh_warrior, mummy,
anubis_guard, priest_of_ra, pharaoh + the compact chariot crew (`crew_chariot_driver`, `crew_chariot_archer`, not UnitDefs). 42 new parts in `parts/units_a_{helms,faces,garb,gear}.js`
(self-registering, every one carries `meta.faction`, none is locked). Tests: `tests/units/units_a.test.mjs`. Tools: `tools/contact_ua.mjs` (+ `contact_ua_entry.js`), `tools/look_ua.mjs`.

## COORD (content.js / registry)
1. **Chariot crew.** `compileSoldier` has no `lite` option (units_lib.md does not document one either), so BEASTS' `{lite:true}` call silently returns a full hum1 model. The two crew
   blueprints are therefore compact on purpose (no cape/crest/offhand: 10 and 13 parts), the composed chariot is **43 parts** (<= 48, tested in `units_a.test.mjs`), tint 34%/32% each.
   Content assembly for `chariot_archer` (today `modelFor` builds it with the default hum_lite crew because `def.model` is null):
   ```js
   import { BLUEPRINTS as UA } from './units/units_a.js';          // or read it from the UNIT_MODEL_MODULES entry
   // in modelFor, branch for def.id === 'chariot_archer':
   const crew = { driver: compile(UA.crew_chariot_driver, {}).model, archer: compile(UA.crew_chariot_archer, {}).model };
   const m = BUILDERS.chariot_archer(Object.assign({}, spec, crew));
   ```
   `node tools/contact_ua.mjs --chariot --name x` renders exactly that composition (crew stand on the chariot floor, `d_`/`a_` prefixes, subrigs `['', h1_, h2_, d_, a_]`).
   The mounted riders for Companion and Equites were already in `units/t0.js` (`rider_companion`, `rider_equites`); no further rider is needed for the Hellenes/Romans/Egyptians.
2. **`tools/contact.mjs` cannot render any faction part**: `contact_entry.js` imports only `blueprints.js`, so every non-core part id fails with "not a known ... part" in the sheet page.
   UNITS-A and UNITS-B each use a private copy (`contact_ua*`, `contact_ub*`, which also apply `STAT_TABLE.scale`). One-line fix for the shared tool: add side-effect imports of every
   `parts/*.js` (or of `_generated/registry.content.js`) and the unit scale to `contact_entry.js`; then the copies can go.
3. **Registry**: all new parts are picked up by the generated `PART_MODULES` (no edits needed); a duplicate id between UNITS-A and UNITS-B would throw at import. Ids of UNITS-A (grep before adding yours):
   helms `thracian_fox attic_fan murmillo centurion_gilded nemes_lite mummy_head jackal_anubis sun_circlet`; faces `philosopher_beard`; tunics `himation toga_senator subligaculum mummy_wraps shendyt_royal shendyt_royal_sleeved`;
   armors `thorax_strategos harness_phalerae sash_broad`; shoulders `manica leopard_mantle broad_collar_gold thracian_mantle paludamentum`; capes `striped_cloak bandage_trail royal_cape`;
   backs `pilum_pair net_coil javelin_baldric`; legs `gladiator_legs caligae_fasciae thracian_leggings`; mains `scroll coin_bag wrapped_club khopesh_spear_pennon standard_general`;
   offs `pelte_wicker parma_small egyptian_shield egyptian_shield_black egyptian_shield_gold egyptian_shield_team`.

## ANIM
- `strategos` carries `standard_general` instead of the core `standard`: the core pole reaches 3.86 u at rest, the brief (units.md, strategos) wants the pole top <= y 34. The new one is 24 voxels long
  and its rest rotation is `[0.3, 0, 0.24]`: **rz 0.24** leans the pole outward so the cloth clears the crest. Derive the axis from the full `R_rest*(0,1,0)` as units_lib.md says.
- `coin_bag` (senator) is carried like a sword (`rest [2.44,0,0]`: hangs down-forward at the hip, bag at the end); `scroll` (philosopher) `rest [0.7,0,0]`, both style `throw`/`bash` with small `ready` values.
- Capes with sway: `bandage_trail` (mummy: six loose strips of different length, ragged tips, shawl at the top), `royal_cape` (pharaoh), `striped_cloak` is registered but unused (the peltast wears the mantle).
- The philosopher's mouth is a dark 2x1 voxel gap at head (x4..5, y0, z8..9) under the moustache: speech bubbles can start at the `eyes`/`head` attach; mummy and priest carry GLOW voxels (eyes, sun disc, staff).
- Anubis is `scale 1.15` in stats.js: the contact sheets apply it; height without scale is 3.23 u (the U2 test measures without unit scale).

## UNITS-LIB / EDITORS-B
- Workshop: every new part appears in its category (`listParts`), no unlock keys. `meta.faction` is free text ('hellenes'|'romans'|'egyptians') for grouping or filtering.
- U3 note: `tools/tintcheck.mjs` enforces 15% per view; `verification.md` U3 says 22%. `units_a.test.mjs` asserts **22% per view and 30% pooled in both poses** for every UNITS-A unit.
