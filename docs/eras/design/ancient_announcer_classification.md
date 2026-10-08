# Ancient announcer classification (input of spec/H, P0 data, binding once REVIEWER signs the second read)

Owner: COMEDY-EDITOR (data and decisions) with TOOLS-VERIFY (tool). Date 2026-10-08. Status: first agent read complete (this file); second independent agent read pending (7, OI-1).
Files: `tools/announcer_dump.mjs` (dump, verifier, report generator), `docs/eras/design/ancient_announcer_classification.csv` (575 rows, the data; sha256 `23d1f9947e0d0e4efbeee7e3c384821c5b864c3afd5b36b85d16bac33060d668` at hand-off), this file (the reasoning and the tables that spec/H copies; every number in 3.3 and 3.10 is tool output at that CSV hash).
Inputs read for this task (the specs and bibles by targeted search of the sections named, the 575 source strings in full): `docs/AGENTS.md`, `e.md`, `plan.md` v3.1 (sections 1, 11, 12, 14), `traceability.md`, `maps/07_audio_humor_assets.md`, `spec/{AR,VF}.md` (AP-C04, OI-1, 3.14, near-duplicate lint), the three `design/<era>/humour.md` (sections 1.1, 2.4, 4, 5, 9), `design/scifi/proposal_A.md`, `design/modern/proposal_A.md`, `q1_disposition.md`, `q2_product.md` Q10/Q11, `q3_product.md` residuals 14-17, `q3_program.md` residual 27, plus every one of the 575 source strings (`src/content/era_ancient/humor/{announcer,tips,ui_text,credits_text}.js`). `spec/H`, `CU`, `MS`, `S-slice` were not present when this was written; where this file depends on them it says so.

## 1. Purpose and scope

`plan.md` section 1 builds each new era's announcer pool as "neutral Ancient templates (agent-classified) + era-new", with an effective pool of at least 300 lines (floor 250) and the category-by-category table living in `spec/H`. Nobody can write that table until every Ancient template has been read and sorted. This file does that sorting, for the announcer (486 templates, 473 of them non-follow), the 63 tips, the 20 loading lines and the 19 studio-credit jokes, and publishes the numbers `spec/H` needs: counts per category and class, the effective neutral pool per category, categories with fewer than 6 neutral lines, the era-new need per category, 20 example lines per class, the running gags that can become cross-era callbacks, and the interfaces (ids, pool shape, lint exemptions, counter definition) that let tests enforce the result.

Out of scope: writing any new-era line (COMEDY-MED/MOD/SF), the announcer engine change (CU18), the callback ledger text (spec/H), changing any Ancient file (the Ancient text hashes are frozen by G4; nothing here edits them).

COORD rule honoured: no Ancient announcer line may be reused by a new era until this classification read exists and is signed (7, OI-1). Wording throughout is "agent read".

## 2. Decisions

| id | decision | reason |
|---|---|---|
| H-C1 | Three classes, applied to each non-follow row: **neutral** (verbatim safe in all four eras), **convertible** (good shape, needs a noun swap, a rewrite template is given), **ancient** (only makes sense in the Ancient era or cannot be reached outside it). | task definition; matches `plan.md` section 11. |
| H-C2 | A line is neutral only if all four hold: (a) the text names no Ancient noun (unit, place, god, weapon, armour, animal-as-unit, food or prop of the period, institution, currency); (b) its slots read correctly when `{unit}`, `{unit2}` or `{killer}` resolve to a tank, a drone, a mech, a knight or a goat (no pronoun on a slot, no species or body assumption); (c) every cond key can fire in a new era (`sub`, `minN`, `maxN`, `team`, `flank`, `ratioMin`, `stat`, `milestone` are generic; `def`, `def2` lists and `arena`, `mission` ids are not, except where H-C7 makes them era data); (d) it passes the union of the three era banned lists. | the four ways a "safe" line breaks in play. |
| H-C3 | **Commentator-world props are not Ancient nouns**: the Terms of Conquest, lamination, sponsors, coupons, refunds, chairs, the fire marshal, the sculptor and his statues, Cassandra's wall, the fruit basket, "the locals", the platypus. They belong to Brutus, Plato and Cassandra, who were dragged through time (e.md 2.6; the Modern and Sci-Fi ledgers already carry `mod_cb_terms`, `sf_cb_terms` as setup-free). Lines whose only blocker is such a prop are neutral and tagged `[gag:...]`. | the booth is the continuity; the bibles depend on it. |
| H-C4 | A line whose only blocker is a weapon or animal noun or verb ("stab", "arrows", "spear", "horse", "laurel") is **convertible** when a generic word keeps the joke; the rewrite uses only the existing slot vocabulary (no new engine slot) and stays within 22 words (tips 18). If the joke needs the noun it is **ancient**. | converts what converts; never invents a slot. |
| H-C5 | Lines bound to an Ancient-only unit, ability, gag or mission (chicken, goat, philosopher, senator, trojan, medusa, elephant, kick, immortal, throne, zeus, the six ability subs, 27 `campaign_*`) and the 44 arena-bound battle_start lines are **ancient** even when the sentence is era-free. Seventeen of them are tagged `[shape]`: the text is borrowable by an era writer but the route is not. | a neutral sentence nobody can trigger is not a pool member. |
| H-C6 | **The grape seller becomes the snack vendor.** Eleven announcer rows, one loading line and one credit name a man selling grapes; each is convertible ("the snack vendor", "the SNACKS"). The vendor is a bystander who is the same man in every era; the Ancient grapes stay in the Ancient text, and gated callbacks may say "a descendant of the grape seller" (3.9). | the best Ancient bystander gag, and the swap loses nothing. |
| H-C7 | Three kinds of **era data** make some text-neutral lines reachable: the per-era `HEROES` list (2 lines `first_blood_hero_b/p`), the per-era `PROP_NAMES` table (5 `prop_destroyed` lines), and **effect-kind** subs for god powers (`strike_area_delayed`, `zone_quake`, `heal_area`, `strike_point`) instead of Ancient power ids. Each is an item for CU18/spec/H (OI-3). | keeps good lines alive without Ancient ids leaking. |
| H-C8 | **Follow beats inherit their head.** All 13 follow templates were read; every chain is classified by its head and no follow contradicts it (6 neutral chains: `battle_start_define`, `hero_down_parade`, `friendly_fire_same`, `victory_terms`, `idle_filler_platypus`, `idle_filler_essence`; 2 ancient: `zeus_quit`, `idle_filler_delphi`; the 13 follow ids are not rows of the CSV). | chains are picked as units. |
| H-C9 | **Brutus's capital letters**: 35 of the 104 reusable Brutus lines carry 2 or 3 ALL-CAPS words (or none), against the era bibles' reviewer check "exactly one". They stay verbatim and are tagged `[caps:k]`. Proposal for spec/H: the one-caps law binds lines authored for the new eras; the 35 reused lines are exempt by id (same mechanism as the near-duplicate exemption). | trimming them would turn 35 neutral lines into rewrites for a rule the Ancient voice never had; the Ancient test only asks 85% caps (`tests/humor/text.test.mjs`). |
| H-C10 | **Neutral rows are not rewritten.** The earlier "30% of neutral rewritten" arithmetic (q1_disposition S11) is replaced: neutral lines go in unchanged; only the 62 convertible rows carry a rewrite; any line that fails an ER11 check in an era is rewritten until it passes (COORD rule), not deleted. | verbatim reuse is the point of the classification; rewrite-until-pass already exists. |
| H-C11 | Tips are classified by text; a neutral or convertible tip whose claim is a rule ("heroes carry auras", "hits from behind do extra damage") is tagged `[rule]` and may be used in an era only if that era's rules make it true (the existing "every tip is true of the current rules" test, extended per era). | a joke that lies about the rules is a bug. |
| H-C12 | The first read is mine; `q3_product` residual 16 asks for two independent reads with disagreements adjudicated by REVIEWER. A mechanical lexicon cross-check is shipped (`--crosscheck`, enforced inside `--verify`) but it does not replace the second read; reuse stays blocked until the second read is signed (7, OI-1). | the cross-check only finds noun leaks, not weak jokes or bad slots. |

## 3. Detailed specification

### 3.1 Files, tool, commands

```
node tools/announcer_dump.mjs [--surface announcer|tips|loading|credits|all] [--format jsonl|tsv|json] [--no-follow]   deterministic dump
node tools/announcer_dump.mjs --summary          counts per surface and category + sha256 of the all-surface dump
node tools/announcer_dump.mjs --verify [csv]     CSV against the live pools (exit 1 on any problem)
node tools/announcer_dump.mjs --selftest         negative controls: 17 mutants of the CSV must all be rejected
node tools/announcer_dump.mjs --report [--partition]   markdown tables of 3.3 (numbers in this file are this output)
node tools/announcer_dump.mjs --crosscheck | --gags | --skeletons | --examples <class> [n] | --list <surface> [--reusable]
```

Dump row: `{id, surface, category, voice, text, cond, follow, slots, weight, once, cd, chain, chainOf}`. Announcer rows come from `TEMPLATES` in source order (486 = 473 non-follow + 13 follow; brutus 184, plato 153, cassandra 149; 47 categories = 38 moments + 9 `campaign_<missionId>`); tips from `TIPS` (id `tip_*`, 63); loading ids `loading_01..20` by position in `LOADING_LINES`; credits ids `credits_01..16` for `STUDIO_CREDITS` (text `role | name`) and `credits_f1..f3` for `CREDITS_FOOTER`. No timestamps: two runs are byte identical.

CSV: header `id,category,voice,class,reason,rewrite`; one row per non-follow row (575 = 473 + 63 + 20 + 19); `class` is `neutral|ancient|convertible`; `reason` is one line and may carry tags (3.2); `rewrite` is empty unless class is convertible. Tips use voice `tip`, loading `loading`, credits `credits`, category = surface name. After REVIEWER's sign-off the CSV is frozen: ids and classes change only by amendment (the shared module of 3.11 is generated from it).

### 3.2 Reason tags

`[gag:terms|wall|grapes|pizza|goat|chicken|trojan|zeus|insurance]` running gag the row carries; `[med-ok]` ancient row whose only blockers are nouns Medieval also has (spear, horse, arrow, catapult, horn, hound); `[shape]` text is era-free but the route is Ancient-only; `[rule]` tip or line whose claim is a rule each era must confirm; `[caps:k]` Brutus line with k ALL-CAPS words; `[slots: ...]` the automatic slot check (every neutral line with `{unit}`, `{unit2}` or `{killer}` was read with a tank, a drone, a mech, a knight and a goat in the slot; the notes below name the three that needed a second look); `[slot prop: ...]` needs the era's `PROP_NAMES`.

Slot findings (29 neutral lines carry a unit slot): all pass for a tank or a drone. Second-look cases: `hazard_drown` ("drowned" is true of a tank in a moat and harmless for a drone, the event names only units that drowned); `hazard_lava` ("walked into LAVA" is never emitted for a hover unit because hover units ignore lava); `hero_down_statue` ("the NOSE" is funnier on a mech). Two requirements follow for the era kit: every unit needs a plural in its text for `{unit|pl}` (3 reusable lines: `victory_grapes` rewrite, `victory_puzzled`, `defeat_unit`) and an `isProper` flag for named heroes (`{unit|the}` drops the article for a proper name).

### 3.3 Results (generated by `--report --partition`)

#### A. Class counts per surface

| surface | rows | neutral | convertible | ancient | reusable (neutral + convertible) |
|---|---|---|---|---|---|
| announcer | 473 | 242 (51.2%) | 44 (9.3%) | 187 (39.5%) | 286 (60.5%) |
| tips | 63 | 11 (17.5%) | 9 (14.3%) | 43 (68.3%) | 20 (31.7%) |
| loading | 20 | 5 (25.0%) | 3 (15.0%) | 12 (60.0%) | 8 (40.0%) |
| credits | 19 | 6 (31.6%) | 6 (31.6%) | 7 (36.8%) | 12 (63.2%) |
| **all** | 575 | 264 | 62 | 249 | 326 |

Announcer by voice (non-follow):

| voice | rows | neutral | convertible | ancient |
|---|---|---|---|---|
| brutus | 181 | 76 | 28 | 77 |
| plato | 148 | 83 | 9 | 56 |
| cassandra | 144 | 83 | 7 | 54 |

#### B. Category table for spec/H (announcer, non-follow templates)

Demand = lines of the category spoken per 14 min in the humor-sim Ancient scripts (604 lines over 120 min, seed 11, 1x). Required pool R = max(6, ceil(1.5 x demand)) for generic categories (the soft repeat memory is 14 min, so a pool of 1.5 x the lines spoken in that window avoids a heard-line repeat). Era-new needed = max(R - reusable, number of voices with no reusable line, 0) for generic categories; ancient-route categories are replaced by the era signature categories of section 3.5; mission categories are 3 lines per mission. Voices column is neutral + convertible per voice b/p/c.

| category | route | total | neutral | convertible | ancient | reusable | b/p/c reusable | demand/14 min | R | era-new needed |
|---|---|---|---|---|---|---|---|---|---|---|
| battle_start | generic | 97 | 47 | 5 | 45 | 52 | 18/16/18 | 4.0 | 6 | 0 |
| first_blood | generic | 22 | 15 | 3 | 4 | 18 | 6/7/5 | 5.6 | 9 | 0 |
| kill_streak | generic | 12 | 8 | 1 | 3 | 9 | 4/3/2 | 4.5 | 7 | 0 |
| hero_down | generic | 10 | 10 | 0 | 0 | 10 | 4/3/3 | 2.0 | 6 | 0 |
| friendly_fire | generic | 7 | 5 | 2 | 0 | 7 | 3/2/2 | 2.2 | 6 | 0 |
| rout | generic | 13 | 13 | 0 | 0 | 13 | 4/5/4 | 3.3 | 6 | 0 |
| charge | generic | 5 | 3 | 2 | 0 | 5 | 2/2/1 | 0.5 | 6 | 1 |
| brace | melee | 6 | 0 | 3 | 3 | 3 | 2/1/0 | 0.6 | - | - |
| volley | generic | 7 | 1 | 4 | 2 | 5 | 1/2/2 | 2.1 | 6 | 1 |
| boulder | generic | 5 | 1 | 4 | 0 | 5 | 1/3/1 | 1.4 | 6 | 1 |
| misfire | generic | 4 | 2 | 2 | 0 | 4 | 2/1/1 | 0.5 | 6 | 2 |
| misaim | ancient | 3 | 0 | 0 | 3 | 0 | 0/0/0 | 0.4 | - | - |
| chicken | ancient | 7 | 0 | 0 | 7 | 0 | 0/0/0 | 0.9 | - | - |
| goat | ancient | 7 | 0 | 0 | 7 | 0 | 0/0/0 | 0.8 | - | - |
| philosopher | ancient | 6 | 0 | 0 | 6 | 0 | 0/0/0 | 0.6 | - | - |
| senator | ancient | 7 | 0 | 0 | 7 | 0 | 0/0/0 | 1.2 | - | - |
| trojan | ancient | 4 | 0 | 0 | 4 | 0 | 0/0/0 | 0.6 | - | - |
| medusa | ancient | 3 | 0 | 0 | 3 | 0 | 0/0/0 | 0.6 | - | - |
| elephant | ancient | 5 | 0 | 0 | 5 | 0 | 0/0/0 | 0.8 | - | - |
| kick | ancient | 4 | 0 | 0 | 4 | 0 | 0/0/0 | 0.5 | - | - |
| immortal | ancient | 5 | 0 | 0 | 5 | 0 | 0/0/0 | 1.6 | - | - |
| throne | ancient | 6 | 0 | 0 | 6 | 0 | 0/0/0 | 0.6 | - | - |
| ability | ancient | 18 | 0 | 0 | 18 | 0 | 0/0/0 | 3.7 | - | - |
| hazard | generic | 8 | 8 | 0 | 0 | 8 | 5/2/1 | 0.6 | 6 | 0 |
| lead_change | generic | 16 | 13 | 3 | 0 | 16 | 5/6/5 | 1.4 | 6 | 0 |
| comeback | generic | 6 | 6 | 0 | 0 | 6 | 3/1/2 | 1.1 | 6 | 0 |
| big_swing | generic | 13 | 11 | 2 | 0 | 13 | 6/2/5 | 5.8 | 9 | 0 |
| army_low | generic | 9 | 9 | 0 | 0 | 9 | 3/3/3 | 1.5 | 6 | 0 |
| stalemate | generic | 6 | 4 | 0 | 2 | 4 | 1/2/1 | 0.6 | 6 | 2 |
| zeus | ancient | 9 | 0 | 0 | 9 | 0 | 0/0/0 | 1.6 | - | - |
| victory | generic | 40 | 32 | 4 | 4 | 36 | 12/12/12 | 1.5 | 6 | 0 |
| defeat | generic | 28 | 24 | 1 | 3 | 25 | 8/8/9 | 1.6 | 6 | 0 |
| timeout | generic | 6 | 5 | 1 | 0 | 6 | 2/2/2 | 0.6 | 6 | 0 |
| mass_death | generic | 6 | 6 | 0 | 0 | 6 | 3/1/2 | 2.3 | 6 | 0 |
| prop_destroyed | generic | 5 | 4 | 1 | 0 | 5 | 2/2/1 | 1.1 | 6 | 1 |
| god_power | generic | 13 | 4 | 4 | 5 | 8 | 4/0/4 | 1.6 | 6 | 1 |
| wave | generic | 5 | 5 | 0 | 0 | 5 | 1/2/2 | 1.1 | 6 | 1 |
| idle_filler | generic | 13 | 6 | 2 | 5 | 8 | 2/4/2 | 6.2 | 10 | 2 |
| campaign_marathon_sort_of | mission | 3 | 0 | 0 | 3 | 0 | 0/0/0 | 0.5 | - | 3 |
| campaign_thermopylae_snack | mission | 3 | 0 | 0 | 3 | 0 | 0/0/0 | 0.5 | - | 3 |
| campaign_pyramid_scheme | mission | 3 | 0 | 0 | 3 | 0 | 0/0/0 | 0.2 | - | 3 |
| campaign_nile_crossing | mission | 3 | 0 | 0 | 3 | 0 | 0/0/0 | 0.2 | - | 3 |
| campaign_alps_elephant | mission | 3 | 0 | 0 | 3 | 0 | 0/0/0 | 0.5 | - | 3 |
| campaign_teutoburg_peekaboo | mission | 3 | 0 | 0 | 3 | 0 | 0/0/0 | 0.4 | - | 3 |
| campaign_troy_giftshop | mission | 3 | 0 | 0 | 3 | 0 | 0/0/0 | 0.4 | - | 3 |
| campaign_cyclops_meet | mission | 3 | 0 | 0 | 3 | 0 | 0/0/0 | 0.2 | - | 3 |
| campaign_zeus_bad_day | mission | 3 | 0 | 0 | 3 | 0 | 0/0/0 | 0.2 | - | 3 |
| **total** | | 473 | 242 | 44 | 187 | 286 | | | | |

#### C. Categories with fewer than 6 neutral lines (each era must supply or replace them)

| category | route | neutral | neutral + convertible | action |
|---|---|---|---|---|
| friendly_fire | generic | 5 | 7 | no new lines needed once the convertible rewrites are adopted (neutral alone is short) |
| charge | generic | 3 | 5 | each era writes 1 more (to reach R and to give every voice at least one reusable line) |
| brace | melee | 0 | 3 | Medieval reuses the convertible lines and writes the rest; Modern and Sci-Fi drop the category |
| volley | generic | 1 | 5 | each era writes 1 more (to reach R and to give every voice at least one reusable line) |
| boulder | generic | 1 | 5 | each era writes 1 more (to reach R and to give every voice at least one reusable line) |
| misfire | generic | 2 | 4 | each era writes 2 more (to reach R and to give every voice at least one reusable line) |
| misaim | ancient | 0 | 0 | Ancient trigger: the era supplies its own signature categories instead |
| chicken | ancient | 0 | 0 | Ancient trigger: the era supplies its own signature categories instead |
| goat | ancient | 0 | 0 | Ancient trigger: the era supplies its own signature categories instead |
| philosopher | ancient | 0 | 0 | Ancient trigger: the era supplies its own signature categories instead |
| senator | ancient | 0 | 0 | Ancient trigger: the era supplies its own signature categories instead |
| trojan | ancient | 0 | 0 | Ancient trigger: the era supplies its own signature categories instead |
| medusa | ancient | 0 | 0 | Ancient trigger: the era supplies its own signature categories instead |
| elephant | ancient | 0 | 0 | Ancient trigger: the era supplies its own signature categories instead |
| kick | ancient | 0 | 0 | Ancient trigger: the era supplies its own signature categories instead |
| immortal | ancient | 0 | 0 | Ancient trigger: the era supplies its own signature categories instead |
| throne | ancient | 0 | 0 | Ancient trigger: the era supplies its own signature categories instead |
| ability | ancient | 0 | 0 | Ancient trigger: the era supplies its own signature categories instead |
| stalemate | generic | 4 | 4 | each era writes 2 more (to reach R and to give every voice at least one reusable line) |
| zeus | ancient | 0 | 0 | Ancient trigger: the era supplies its own signature categories instead |
| timeout | generic | 5 | 6 | no new lines needed once the convertible rewrites are adopted (neutral alone is short) |
| prop_destroyed | generic | 4 | 5 | each era writes 1 more (to reach R and to give every voice at least one reusable line) |
| god_power | generic | 4 | 8 | each era writes 1 more (to reach R and to give every voice at least one reusable line) |
| wave | generic | 5 | 5 | each era writes 1 more (to reach R and to give every voice at least one reusable line) |
| campaign_marathon_sort_of | mission | 0 | 0 | mission lines are always era-new (3 per mission) |
| campaign_thermopylae_snack | mission | 0 | 0 | mission lines are always era-new (3 per mission) |
| campaign_pyramid_scheme | mission | 0 | 0 | mission lines are always era-new (3 per mission) |
| campaign_nile_crossing | mission | 0 | 0 | mission lines are always era-new (3 per mission) |
| campaign_alps_elephant | mission | 0 | 0 | mission lines are always era-new (3 per mission) |
| campaign_teutoburg_peekaboo | mission | 0 | 0 | mission lines are always era-new (3 per mission) |
| campaign_troy_giftshop | mission | 0 | 0 | mission lines are always era-new (3 per mission) |
| campaign_cyclops_meet | mission | 0 | 0 | mission lines are always era-new (3 per mission) |
| campaign_zeus_bad_day | mission | 0 | 0 | mission lines are always era-new (3 per mission) |

#### D. Sub-gated lines: reusable lines per cond.sub (generic categories only)

| category:sub | total | neutral | convertible | ancient | reusable | needs era lines (< 3 reusable) |
|---|---|---|---|---|---|---|
| battle_start:duel | 4 | 3 | 1 | 0 | 4 | no |
| battle_start:outnumbered | 3 | 3 | 0 | 0 | 3 | no |
| battle_start:outnumbering | 3 | 3 | 0 | 0 | 3 | no |
| battle_start:tenth | 3 | 3 | 0 | 0 | 3 | no |
| battle_start:losing | 3 | 3 | 0 | 0 | 3 | no |
| battle_start:winning | 3 | 3 | 0 | 0 | 3 | no |
| battle_start:loyal | 3 | 3 | 0 | 0 | 3 | no |
| battle_start:rematch | 3 | 3 | 0 | 0 | 3 | no |
| battle_start:mirror | 3 | 2 | 1 | 0 | 3 | no |
| first_blood:early | 3 | 2 | 1 | 0 | 3 | no |
| first_blood:late | 3 | 2 | 1 | 0 | 3 | no |
| friendly_fire:generic | 3 | 2 | 1 | 0 | 3 | no |
| rout:rally | 3 | 3 | 0 | 0 | 3 | no |
| hazard:lava | 1 | 1 | 0 | 0 | 1 | yes |
| hazard:spikes | 1 | 1 | 0 | 0 | 1 | yes |
| hazard:geyser | 1 | 1 | 0 | 0 | 1 | yes |
| hazard:drown | 1 | 1 | 0 | 0 | 1 | yes |
| hazard:fall | 2 | 2 | 0 | 0 | 2 | yes |
| victory:flawless | 3 | 3 | 0 | 0 | 3 | no |
| victory:tiny | 3 | 3 | 0 | 0 | 3 | no |
| victory:last_man | 3 | 2 | 1 | 0 | 3 | no |
| victory:goat | 3 | 0 | 0 | 3 | 0 | yes |
| victory:rout | 3 | 3 | 0 | 0 | 3 | no |
| victory:quick | 3 | 3 | 0 | 0 | 3 | no |
| victory:long | 3 | 2 | 1 | 0 | 3 | no |
| victory:duel | 3 | 3 | 0 | 0 | 3 | no |
| defeat:chicken | 3 | 0 | 0 | 3 | 0 | yes |
| defeat:third_loss | 3 | 3 | 0 | 0 | 3 | no |
| defeat:duel | 3 | 3 | 0 | 0 | 3 | no |
| defeat:crush | 3 | 3 | 0 | 0 | 3 | no |
| defeat:close | 3 | 2 | 1 | 0 | 3 | no |
| timeout:time | 3 | 3 | 0 | 0 | 3 | no |
| timeout:draw | 3 | 2 | 1 | 0 | 3 | no |
| god_power:meteor | 2 | 1 | 1 | 0 | 2 | yes |
| god_power:earthquake | 2 | 1 | 1 | 0 | 2 | yes |
| god_power:wine_rain | 3 | 0 | 0 | 3 | 0 | yes |
| god_power:heal_wave | 2 | 2 | 0 | 0 | 2 | yes |
| god_power:raise_chickens | 2 | 0 | 0 | 2 | 0 | yes |
| god_power:zeus_lightning | 2 | 0 | 2 | 0 | 2 | yes |

#### E. Tags in the reason column

| tag | rows | neutral | convertible | ancient |
|---|---|---|---|---|
| gag:terms | 13 | 10 | 3 | 0 |
| gag:wall | 6 | 6 | 0 | 0 |
| gag:grapes | 12 | 0 | 12 | 0 |
| gag:pizza | 4 | 0 | 0 | 4 |
| gag:goat | 16 | 0 | 0 | 16 |
| gag:chicken | 17 | 0 | 0 | 17 |
| gag:trojan | 6 | 0 | 0 | 6 |
| gag:zeus | 1 | 0 | 0 | 1 |
| gag:insurance | 3 | 0 | 2 | 1 |
| med-ok | 16 | 0 | 0 | 16 |
| shape | 17 | 0 | 0 | 17 |
| rule | 12 | 8 | 4 | 0 |
| caps:0 | 1 | 1 | 0 | 0 |
| caps:2 | 25 | 18 | 7 | 0 |
| caps:3 | 9 | 7 | 2 | 0 |

#### F. Effective announcer pool arithmetic (before any era signature category)

- neutral verbatim: 242; convertible after rewrite: 44; shared total: 286.
- era-new fixed items: 27 campaign lines (9 missions x 3), arena lines 3 per arena x 12 arenas = 36 (Ancient has 44 arena-bound lines for 14 arenas + the lab).
- shared + fixed era-new = 349 lines per era, against the plan target of 300 (floor 250), before any generic shortfall or signature category.

#### G. Hybrid reuse rule (proposal for spec/H)

Categories with at least 12 reusable lines (battle_start 52, first_blood 18, rout 13, lead_change 16, big_swing 13, victory 36, defeat 25) are partitioned: FNV-1a(id) mod 3 names the one new era that does NOT use the line, so every reused line serves two of the three new eras. Thinner categories are shared by all three.

| era slot | shared lines used | of which neutral |
|---|---|---|
| Medieval | 227 | 190 |
| Modern | 229 | 192 |
| Sci-Fi | 229 | 189 |

Distinct reused lines: 286; used by all three new eras: 113; used by exactly two: 173.

Reading the totals. Of 473 announcer rows 242 are neutral (51.2%), 44 convertible (9.3%), 187 ancient (39.5%): the reusable shared pool is 286 lines (60.5%). The 187 ancient rows are 44 arena-bound battle_start lines, 27 campaign lines, 84 lines of 13 Ancient-signature categories, 3 spear-wall `brace` lines, and 29 lines in generic categories that name an Ancient gag (sponsors, goat, chicken, Zeus, wine, the oil and Delphi reads). 138 of the 187 hit the Ancient lexicon of `--crosscheck` in their sentence; the other 49 are arena, mission or Ancient-unit lines whose names the lexicon does not list (Alps, Styx, Oasis, Hot Gates, Colosseum trapdoors) or lines that are ancient because of their route (17 of them tagged `[shape]`). The earlier regex estimate in `q2_product` Q11 (about 70% neutral) counted nouns only and missed the route: the measured neutral share is 51%.

### 3.4 What reusable lines require from the engine and the era kit

Cond keys used by the 286 reusable announcer rows: `sub` 93, `team` 35, `flank` 11, `minN` 9, `stat` 8, `milestone` 7, `maxN` 2, `ratioMin` 2, `def2` 2, `cluster` 1. Slots used: `n` 28, `unit` 26, `nth` 13, `ratio` 11, `streak` 9, `pct` 9, `secs` 9, `team` 8, `unit2` 7, `lifetime` 7, `flank` 6, `arena` 5, `faction` 4, `faction2` 4, `mission` 4, `mins` 4, `prop` 4, `killer` 3. `lifetime` stats used: `battles`, `wins`, `losses`, `kills`, `friendlyKills`; milestones on `battles` and `wins`.

Subs the era event route must be able to emit for these lines to fire (all except the hazard and god-power ones come from battle totals and need nothing era specific): `duel outnumbered outnumbering tenth losing winning loyal rematch mirror early late generic rally flawless tiny last_man rout quick long third_loss crush close time draw`; hazards `lava spikes geyser drown fall` (emitted only if the era has the hazard; Sci-Fi lava and Medieval moat qualify); god powers by effect kind (OI-3): `meteor -> strike_area_delayed`, `earthquake -> zone_quake`, `heal_wave -> heal_area`, `zeus_lightning -> strike_point`. Sub coverage is in table D of 3.3: every battle-total sub has 3 or more reusable lines; the five hazard subs have 1-2 and each era writes its own hazard lines for the hazards it has.

Needed from the engine/kit (CU18 and spec/H own them, listed in OI-3): `HEROES` per era; `PROP_NAMES` per era; plural and proper flags for every unit; shared cooldown groups for gags so the 11 Terms announcer rows, the 6 wall rows and the 11 vendor rows cannot dominate (proposal: `gag` field on a template, at most 2 lines per gag per battle); a `{pct}` in the era's misfire payload and an `{n}` chain count in the strike payload (`misfire_four`, `god_power_bolt_c` rewrites); the Ancient-only routes (chicken, goat, philosopher, senator, trojan, medusa, elephant, kick, immortal, throne, zeus, the six Ancient `ability` subs) stay in the Ancient route table and are simply absent from the new eras' route tables.

### 3.5 Era-new demand and the effective pool per era

The category table (3.3 B) gives, per generic category, the required pool R and the era-new lines each era must write. Rule: R = max(6, ceil(1.5 x demand per 14 min)) where demand is measured by `tools/humor-sim.mjs` on the Ancient scripts (the announcer's soft repeat memory is 14 minutes, so a pool one and a half times the lines spoken in that window avoids a heard-line repeat); every voice needs at least one reusable line. Generic shortfalls (era writes, same for each era): charge 1, volley 1, boulder 1, misfire 2, stalemate 2, prop_destroyed 1, god_power 1, wave 1, idle_filler 2 = 12 lines. `brace` is a spear-wall category: Ancient and Medieval keep it (Medieval reuses the 3 convertible lines and writes the rest), Modern and Sci-Fi drop it.

Fixed era-new lines (not reusable): arena lines 3 per arena x 12 arenas = 36 (the 44 Ancient arena-bound rows are 14 arenas x 3 plus 2 for the lab); campaign 9 missions x 3 = 27; ability lines 3 per signature ability and god-power lines 3 per power (roster-dependent, not counted below).

Signature categories from the bibles (3 lines per voice = 9 per category): Modern 10 (`reload cover pin armour shell mine air repair parcel helicopter`, Modern humour 2.4) = 90; Sci-Fi 12 (`shield_pop shield_chain shield_full cloak_reveal emp_freeze blink_hop hover_cross orbital_call mech_step alien_goo translator intermission`, Sci-Fi humour 2.4) = 108. **Medieval has no announcer-category table in its humour bible**: proposal for COMEDY-MED/spec/H, 8 categories taken from the feel sheet's headline mechanics (banner, gates and siege, healers and poison, dragon) and the stinger names of Medieval proposal B (`colours_down`, `gate_gives`, `sniffle_bell`, `late_sally`, `dragon_wakes`): `colours_down` (banner lost), `banner_rally`, `gate_breach`, `siege_hit` (trebuchet or ram lands), `plague_sneeze`, `healer`, `late_sally`, `dragon` = 72, plus the reused `brace`/`charge` lines. (OI-2.)

| era | reused (full share) | reused (hybrid, G) | arenas | campaign | generic shortfall | signature | total full | total hybrid | reuse share full / hybrid |
|---|---|---|---|---|---|---|---|---|---|
| Medieval | 286 | 227 | 36 | 27 | 12 | 72 (proposed) | 433 | 374 | 66.1% / 60.7% |
| Modern | 286 | 229 | 36 | 27 | 12 | 90 | 451 | 394 | 63.4% / 58.1% |
| Sci-Fi | 286 | 229 | 36 | 27 | 12 | 108 | 469 | 412 | 61.0% / 55.6% |

All totals are lower bounds (ability and god-power sub lines are roster-dependent and not counted). Every row clears the plan target of 300 and its floor of 250 **without any other era-new line**: the count target is met by reuse plus the fixed lines (349 before signature categories). The era-new budget of 220 in plan section 1 is therefore a variety budget. The variety risk is real: in the humor-sim Ancient scripts 75.2% of spoken lines come from generic categories, 19.7% from Ancient-signature categories, 4.3% from campaign categories and 0.8% from `brace`. A new era whose signature events are rarer than the Ancient gags would speak mostly reused lines. Proposal for spec/H (OI-2): spoken reuse share, measured by humor-sim on era scripts, at most 65%; the eight categories with the highest demand (idle_filler 6.2, big_swing 5.8, first_blood 5.6, kill_streak 4.5, battle_start 4.0, rout 3.3, mass_death 2.3, friendly_fire 2.2 lines per 14 min, together 48% of spoken lines) each get an era-new "shadow" set of 6 lines (2 per voice) per era.

### 3.6 What spec/H copies

Table B of 3.3 is the category-by-category table (neutral reused / converted / era-new needed), table C the categories with fewer than 6 neutral lines, table D the per-sub coverage, section F the pool arithmetic, section G the optional hybrid reuse rule. Categories with fewer than 6 neutral lines that **each era must supply or replace**: friendly_fire (5 neutral, 7 with convertibles: no new lines needed once rewrites are adopted), charge (3), brace (0, melee eras only), volley (1), boulder (1), misfire (2), stalemate (4), timeout (5, fine with convertibles), prop_destroyed (4), god_power (4), wave (5), plus all 13 Ancient-signature categories (0 neutral: replaced by each era's signature categories) and the 9 campaign categories (0 neutral: 3 lines per mission). A category with 6 or more neutral lines is: battle_start 47, first_blood 15, kill_streak 8, hero_down 10, rout 13, hazard 8, lead_change 13, comeback 6, big_swing 11, army_low 9, victory 32, defeat 24, mass_death 6, idle_filler 6 (idle_filler is thin once its five sponsor and goat reads are removed, hence R = 10).

### 3.7 Examples: 20 lines per class (deterministic stride sample of the announcer rows, `--examples <class> 20`)

**Neutral**

- `battle_start_locals` [b] The locals were asked to leave! They declined! Several have brought CHAIRS!
- `battle_start_first_b` [b] Your FIRST battle! Welcome to the arena! Nobody here knows what they are doing, and that includes me!
- `battle_start_outnumbered_b` [b] OUTNUMBERED {ratio} to one! That is not a problem, that is a CHARACTER ARC!
- `battle_start_winning_b` [b] {nth|words} wins in a ROW! The Terms of Conquest now list you as a THREAT!
- `first_blood_known` [c] {unit2|The} fell first. I said it would be {unit2|a}. I said it at breakfast.
- `first_blood_hero_b` [b] First blood, and it is {unit2|the}! Somebody wanted the BIG one early!
- `hero_down_army` [p] The commander falls. The army becomes a crowd with equipment.
- `friendly_fire_count_c` [c] {n} friendly hits. I keep the count. Somebody should.
- `rout_rally_p` [p] They return. Courage, it seems, can be mislaid and then found.
- `hazard_drown` [p] {unit|The} drowned, and not even in the sea. Is there a cheaper way to lose?
- `lead_change_them_c2` [c] They lead. It is early. I have seen the end.
- `big_swing_cluster` [c] They are clustered. I said do not cluster. Now it is {ratio} to one.
- `army_low_hats` [b] Only {pct} percent of {team} left! That is mostly HATS!
- `victory_puzzled` [p] The last {unit|pl} stand. They look puzzled, as winners do.
- `victory_flawless_b` [b] FLAWLESS! Not one soldier lost! The sculptors are FURIOUS! There is nothing to carve!
- `victory_quick_p` [p] {secs} seconds. Brief, like most good arguments.
- `defeat_tomorrow` [c] You will try again tomorrow. Differently. Then I will say I said.
- `defeat_duel_p` [p] One lost to one. No flank, no formation, no excuse. Is that clarifying?
- `mass_death_effect` [b] {n} DOWN at once! That is not a battle, that is a special effect!
- `god_power_heal` [b] HEALING! Everyone is on their feet again, even the one who was definitely dead!

**Convertible** (original -> rewrite)

- `battle_start_terms` [b] The Terms of Conquest are LAMINATED and posted. Clause seven: nobody stabs the grape seller.  ->  The Terms of Conquest are LAMINATED and posted. Clause seven: nobody hits the snack vendor.
- `battle_start_grapes` [c] The man selling grapes will survive. Everyone else is a rumour.  ->  The snack vendor will survive. Everyone else is a rumour.
- `battle_start_mirror_c` [c] Same uniforms on both sides. Somebody will stab the wrong one. Nobody listens.  ->  Same uniforms on both sides. Somebody will hit the wrong one. Nobody listens.
- `first_blood_early_p` [p] {secs} seconds. Patience is not among the virtues of a spear.  ->  {secs} seconds. Patience is not among the virtues of a weapon.
- `kill_streak_laurel` [b] {streak}! Somebody fetch a LAUREL! Or a chair! Possibly both!  ->  {streak}! Somebody fetch a TROPHY! Or a chair! Possibly both!
- `charge_physics` [p] A charge is physics with a grudge. The horse does the arithmetic.  ->  A charge is physics with a grudge. The mass does the arithmetic.
- `brace_fence` [b] The spear wall says NO! The horse says: why?  ->  The line says NO! The charge says: why?
- `brace_geometry` [p] The horse met the spear and learned a lesson about geometry.  ->  The charge met the line and learned a lesson about geometry.
- `volley_sky` [p] Arrows: an expensive way to learn the sky has opinions.  ->  Volleys: an expensive way to learn the sky has opinions.
- `volley_someone` [c] Every arrow lands on something. Today it is someone.  ->  Every shot lands on something. Today it is someone.
- `boulder_under` [c] The boulder landed where the soldiers were. It always does.  ->  It landed where the soldiers were. It always does.
- `misfire_union` [b] The catapult has launched a WORKER! His union will have words!  ->  The machine has launched a WORKER! His union will have words!
- `lead_change_hands` [p] The lead changes hands. Nothing else does. The spears remain with their owners.  ->  The lead changes hands. Nothing else does. The weapons remain with their owners.
- `lead_change_them_b` [b] THEY have the LEAD! The grape seller has quietly changed his hat!  ->  THEY have the LEAD! The snack vendor has quietly changed his hat!
- `big_swing_yours_mid` [b] YOUR line is buckling in the MIDDLE! Hold it! Hold it with SPEARS!  ->  YOUR line is buckling in the MIDDLE! Hold it! Hold it with EVERYTHING!
- `victory_last_b` [b] ONE soldier left standing, and it is {unit|the}! Give it a LAUREL! Give it a SEAT!  ->  ONE soldier left standing, and it is {unit|the}! Give it a TROPHY! Give it a SEAT!
- `defeat_close_c` [c] {n|words} left on their side. Two more arrows and I would be quiet. I am rarely quiet.  ->  {n|words} left on their side. Two more shots and I would be quiet. I am rarely quiet.
- `prop_destroyed_insurance` [b] Property damage! Delphi Insurance says: we SAW this coming!  ->  Property damage! The insurers say: we SAW this coming!
- `god_power_quake` [b] EARTHQUAKE! The ground has joined the fight! Poor sport, the ground!  ->  The GROUND has joined the fight! Poor sport, the ground!
- `god_power_bolt_c` [c] The bolt jumped four times. I counted the jumps. I did not count the survivors.  ->  The strike jumped {n} times. I counted the jumps. I did not count the survivors.

**Ancient**

- `battle_start_welcome` [b] WELCOME to {arena}! Today's carnage is brought to you by Pompeii Pizza, now with 20% more ash!
- `battle_start_a_colosseum_c` [c] The sand hides trapdoors. The trapdoors hide spikes. I marked them. Nobody reads the sand.
- `battle_start_a_persepolis_c` [c] The columns block arrows. Then they fall over. Then the arrows arrive. I wrote that order down.
- `battle_start_a_olympus` [b] MOUNT OLYMPUS! A temple, columns, and a very large Zeus keeping an eye on the SCORE!
- `battle_start_a_cyclops` [b] CYCLOPS ISLE! One cave, a few goats and a very large LANDLORD!
- `first_blood_chicken_c` [c] First blood to a chicken. I have no note for this. I am writing one now.
- `volley_dienekes` [p] Told that arrows would hide the sun, Dienekes replied: good, shade. A cheerful man.
- `chicken_general` [p] {lifetime:chickenKills} kills. At what number does a chicken become a general?
- `philosopher_tactic` [p] I do not follow him. Neither does the enemy. This is the tactic.
- `senator_loyalty` [p] An ally for a coin. Is loyalty a price, or merely a habit?
- `medusa_rude` [p] She never makes eye contact. They do. Which of them is rude?
- `kick_lifetime` [b] Your Spartans have kicked {lifetime:kicks} soldiers! That is a lot of CALF work!
- `throne_up_p` [p] He sat, was disturbed, and fled. The King of Kings, undone by a chair.
- `ability_execute_p` [p] The jackal-headed guard finishes what others began. Is it cruelty, or only good administration?
- `ability_druid_p` [p] Lightning hops from man to man. Gossip, at the speed of light.
- `zeus_prologue` [c] Zeus stormed off. I predicted it. In the prologue. Of everything.
- `defeat_chicken_p` [p] Defeated by poultry. Is it shame if the poultry are sacred?
- `idle_filler_goat` [c] The goat knows. Ask the goat.
- `campaign_pyramid_scheme_lose` [c] The Pharaoh stands. A plan with this many gaps was never going to topple him. I noted the gaps.
- `campaign_teutoburg_peekaboo_lose` [b] SPOTTED! The ambush has been POLITELY declined! Please try again with thicker trees!

### 3.8 Borderline decisions (the lines a second reader is most likely to dispute)

| line | class | why |
|---|---|---|
| `battle_start_locals` ("several have brought CHAIRS") | neutral | locals and chairs work on a moon base; chairs are a booth gag (H-C3). |
| `battle_start_terms`, `friendly_fire_clause`, `victory_buffet` | convertible | the Terms of Conquest stay (cross-era), only "stabs"/"grape seller"/"stab the BUFFET" change. |
| `battle_start_wall`, `battle_start_record_c`, `kill_streak_tally`, `big_swing_wall`, `defeat_third_c` | neutral | Cassandra's wall is a booth prop; "I have started on the ceiling" works on a spaceship. |
| `hero_down_statue`, `victory_flawless_b`, `defeat_duel_b`, `mass_death_sculptor` | neutral | the sculptor is a booth running gag; the fourth-era version is a statue of a mech. |
| `first_blood_hero_b/p` | neutral | text is era-free; cond `def2` is the hero list, which becomes era data (H-C7). |
| `first_blood_cook`, `first_blood_off` | neutral | "first blood" is an idiom; no era bans "blood"; a robot battle still reads. |
| `hazard_lava/spikes/geyser/drown/fall` | neutral | generic hazards; each fires only where the arena has the hazard. |
| `god_power_meteor_c`, `god_power_quake_c`, `god_power_heal(_c)` | neutral | era-free text; reachable through effect-kind subs (H-C7). |
| `god_power_meteor`, `god_power_quake`, `god_power_bolt` | convertible | name the Ancient power ("A METEOR", "EARTHQUAKE", "LIGHTNING", "hoplites"). |
| `god_power_wine*` | ancient | wine, tipsy, forty percent: the joke is the wine. |
| `stalemate_zeus`, `stalemate_stand` | ancient | Zeus steps in; `stalemate_sleep` ("how empires fall asleep") is neutral. |
| `immortal_again`, `immortal_twice` | ancient `[shape]` | text is era-free but the second_death sub is the Immortal revive. |
| `philosopher_*` | ancient | the Philosopher confusion unit; `big_swing_mid_p` ("even a philosopher could have predicted the middle") is generic English and neutral. |
| `brace_fence/said_no/geometry` | convertible | "the line says NO, the charge says why" keeps the joke; `brace_spear/told/hedgehog` stay ancient `[med-ok]` (the spear is the joke). |
| `volley_shade` | ancient `[med-ok]` | the shade company needs arrows darkening the sky. |
| `misfire_four` | convertible | the 4 percent is the catapult stat; the rewrite takes `{pct}` from the era's payload. |
| `battle_start_a_oasis_c` | ancient `[shape]` | "Small arena. Nowhere to retreat." is era-free but cond is `arena:oasis`. |
| `battle_start_welcome`, `victory_pizza`, `idle_filler_pompeii` | ancient | Pompeii Pizza is a callback source (3.9); each era writes its own sponsor read, as the Modern and Sci-Fi ledgers already do. |
| all 27 `campaign_*` | ancient | mission-bound; era-new by definition. |
| `tip_backstab`, `tip_catapult_min`, `tip_meteor`, `tip_heal_wave` | convertible `[rule]` | the Ancient figure (35%, 15 units, 2 s, 60 health) goes; the principle stays and the era confirms it. |
| `credits_08` | convertible | "Siege Safety Officer" and the Roman name Gaius; the rewrite uses "Gus". |

### 3.9 Running gags and cross-era callbacks

Counts are announcer rows by text match plus tagged rows on the other surfaces (`--gags`); classes show how each gag survives the classification.

| gag | announcer rows (text match) | neutral | convertible | ancient | first ids |
|---|---|---|---|---|---|
| grape seller / snack vendor | 11 | 0 | 11 | 0 | `battle_start_terms`, `battle_start_matchup`, `battle_start_grapes` |
| Pompeii Pizza and ash | 3 | 0 | 0 | 3 | `battle_start_welcome`, `victory_pizza`, `idle_filler_pompeii` |
| Terms of Conquest | 11 | 8 | 3 | 0 | `battle_start_terms`, `battle_start_record_b`, `battle_start_duel_b2` |
| Cassandra's wall | 9 | 8 | 0 | 1 | `battle_start_wall`, `battle_start_record_c`, `battle_start_winning_c` |
| the goat | 23 | 0 | 0 | 23 | `battle_start_a_thermopylae_c`, `battle_start_a_cyclops`, `battle_start_a_cyclops_p` |
| sacred chickens | 14 | 0 | 0 | 14 | `first_blood_chicken_b`, `first_blood_chicken_c`, `kill_streak_chicken` |
| Trojan horse and gift shop | 8 | 0 | 0 | 8 | `battle_start_a_troy_p`, `battle_start_a_troy_c`, `trojan_open` |
| Zeus (bored, on leave, ragequit) | 16 | 0 | 0 | 16 | `battle_start_a_olympus`, `goat_sent`, `stalemate_zeus` |
| Delphi Insurance / "we saw this coming" | 3 | 0 | 1 | 2 | `battle_start_a_persepolis`, `prop_destroyed_insurance`, `idle_filler_delphi` |
| the sculptor and statues | 5 | 4 | 0 | 1 | `hero_down_statue`, `victory_flawless_b`, `defeat_duel_b` |
| chairs | 7 | 2 | 1 | 4 | `battle_start_locals`, `battle_start_outnumbering_p`, `kill_streak_laurel` |
| sponsors, coupons, refunds | 10 | 7 | 0 | 3 | `battle_start_a_colosseum`, `battle_start_tenth_b`, `hero_down_parade` |
| Plato defining a battle | 2 | 2 | 0 | 0 | `battle_start_define`, `idle_filler_define` |
| the platypus | 1 | 1 | 0 | 0 | `idle_filler_platypus` |
| Cassandra "I wrote it down" / "as foretold" | 33 | 26 | 0 | 7 | `battle_start_ending`, `battle_start_wall`, `battle_start_first_c` |

Status in the bibles and recommendation (callback sources are Ancient ids; the Ancient files are frozen, so the flag `cb.<id>` is set by an id map `CB_SOURCES {ancientLineId: flag}` read when the announcer renders that id; see OI-8):

| gag | Ancient source ids | already in a bible | proposal |
|---|---|---|---|
| Pompeii Pizza and ash | `battle_start_welcome`, `victory_pizza`, `idle_filler_pompeii`, `credits_06` | `mod_cb_pizza` (setup-free), `sf_cb_pizza` (gated on Ancient opened) | keep both; add Medieval `med_cb_pizza`: "Pompeii Pizza now delivers by pigeon. The pigeon is missing." (ties the pigeon gag of Medieval humour 1.1). |
| the grape seller | `battle_start_terms/matchup/grapes`, `first_blood_ripple/late_b`, `lead_change_you_b2/them_b`, `victory_grapes/long_b`, `idle_filler_grapes`, `battle_start_duel_b`, `loading_16`, `credits_07` | none | **new** `x_cb_vendor` (gated, flag `cb.ancient_grapes`): the shared snack-vendor lines become the continuity; a gated line in each era: "The snack vendor is the grape seller's great-grandchild. He has the same hat." |
| Terms of Conquest | `battle_start_terms/record_b/duel_b2/winning_b`, `comeback_clause`, `friendly_fire_clause`, `victory_terms/first_b/duel_b/buffet`, `defeat_weather`, `loading_07`, `credits_02` | `mod_cb_terms`, `sf_cb_terms` (setup-free) | keep; Medieval adds a setup-free line ("The Terms of Conquest, Revision Eleven, now in a scroll case"); cap 2 Terms lines per battle (OI-3). |
| Cassandra's wall | `battle_start_wall/record_c/winning_c`, `kill_streak_tally`, `big_swing_wall`, `defeat_third_c` | none | **new** `x_cb_wall` (setup-free): Medieval "She has started on the portcullis", Modern "She has started on the helicopter", Sci-Fi "She has started on the hull". |
| the goat | 16 tagged rows incl. `victory_goat_*`, `goat_*`, `idle_filler_goat`, `credits_01`, `credits_f3`, `tip_goat` | `mod_cb_goat_van` (Ancient `nile_crossing` stars), `med_goat`, `sf_cb_goat` | keep as designed. |
| sacred chickens | 17 tagged rows | `mod_cb_chicken_cargo`, `sf_cb_chicken` (lifetime `chickenKills`) | keep as designed. |
| Trojan horse, gift shop | `trojan_*`, `battle_start_a_troy_*`, `tip_trojan`, `loading_03` | `mod_cb_trojan_box`, `sf_cb_gift` (flag `cb.ancient_trojan`) | keep as designed. |
| Zeus (bored, on leave) | `zeus_*`, `stalemate_zeus`, `idle_filler_zeus`, `credits_12` | arrival-card footers, finale card "Zeus (on leave)", `sf_cb_zeus_left` | keep as designed. |
| Delphi Insurance, "we saw this coming" | `prop_destroyed_insurance`, `idle_filler_delphi(_c)`, `credits_16` | Medieval sponsor "Perpetual Mutual" (no link yet) | **new** `med_cb_delphi` (gated, flag `cb.ancient_done`): "Perpetual Mutual was founded by an oracle. It saw the dragon coming. It sold the policy anyway." |
| Plato defining a battle | `battle_start_define` (chain), `idle_filler_define`, `credits_04` ("draft, unfinished") | none | **new** `x_cb_define` (gated): the draft definition is finally finished in the Sci-Fi finale credits tail; one line only. |
| the platypus | `idle_filler_platypus` (chain) | none | neutral and cross-era as is; a gated "And now, back to PLATYPUS" in one later era would be the cheapest callback in the program. |
| the sculptor | `hero_down_statue`, `victory_flawless_b`, `defeat_duel_b`, `mass_death_sculptor`, `campaign_nile_crossing_win` | none | optional: each era's sculptor becomes its craftsman (Medieval stonemason, Modern 3D printer). |

### 3.10 Tips, loading lines, studio credits

Counts (3.3 A): tips 63 = 11 neutral, 9 convertible, 43 ancient; loading 20 = 5 neutral, 3 convertible, 12 ancient; credits 19 = 6 neutral, 6 convertible, 7 ancient. The reusable tips (20, 31.7%) already exceed the plan's "tips 40 per era, 30% converted" (12 per era): each era takes at most 12 of the 20 and writes 28 new. Every `[rule]` tip must pass the era's tip-truth check before use. The bibles write 20 new loading lines per era and none repeats an Ancient line, so the 8 reusable loading lines are optional. Studio credits are one shared list on the Credits screen; the eras append lines, so the classification matters only if a per-era credits sheet is chosen (CU).

Reusable tips (neutral and convertible):

| id | class | text | rewrite |
|---|---|---|---|
| `tip_backstab` | convertible | Hits from behind do 35% more damage. Shields only protect the front. | Hits from behind do extra damage. Walk around the front line, not through it. |
| `tip_catapult_min` | convertible | Catapults cannot hit anything closer than 15 units. Protect them with something that is closer. | Artillery cannot hit anything inside its minimum range. Protect it with something that is closer. |
| `tip_hero_aura` | neutral | Heroes carry auras. Keep your army inside the radius for bonus damage and morale. |  |
| `tip_officers` | neutral | Kill the officer and nearby soldiers lose heart. Armies rout when morale hits the floor. |  |
| `tip_type_cap` | convertible | You can field 16 different unit types in a battle. Chickens count as a type. | You can field 16 different unit types in a battle. Yes, the silly ones count too. |
| `tip_sandstorm` | convertible | Sandstorms scatter ranged attacks by half again. Pick spears and cavalry for dusty days. | Sandstorms scatter ranged attacks by half again. Pick melee units for dusty days. |
| `tip_flanks` | neutral | Soldiers hit from the side or behind lose morale faster. Flank, and watch them wobble. |  |
| `tip_focus` | convertible | The Focus order makes a squad attack one target. Use it on a hero or a monster. | The Focus order makes a squad attack one target. Use it on a hero or a boss. |
| `tip_meteor` | convertible | A meteor takes two seconds to land. Aim at a clump, not at somebody who is running. | Delayed strikes take a moment to land. Aim at a clump, not at somebody who is running. |
| `tip_heal_wave` | convertible | Heal Wave restores 60 health to every nearby ally. Save it for after the clash. | Healing powers help every nearby ally. Save them for after the clash. |
| `tip_scout` | neutral | The Scout report speaks up once you have placed three soldiers. It is free. Read it. |  |
| `tip_fear_speed` | neutral | Above 2x speed the announcers only comment on the big moments. Brutus takes it personally. |  |
| `tip_pause` | convertible | Space pauses. The speed keys go down to 0.25x, which is excellent for watching a goat. | Space pauses. The speed keys go down to 0.25x, which is excellent for watching one soldier think. |
| `tip_rematch` | neutral | R rematches instantly. Cassandra recommends changing something first. |  |
| `tip_command` | neutral | Select a unit and press Enter to take command. WASD moves, a click attacks. |  |
| `tip_budget` | convertible | Spend your whole budget. Unspent drachmae have never won a battle. | Spend your whole budget. Unspent money has never won a battle. |
| `tip_photo` | neutral | P is photo mode and Tab hides the HUD. Soldiers look better when nobody is explaining them. |  |
| `tip_killcam` | neutral | When a hero or boss falls, the results screen offers a kill-cam. Press K. |  |
| `tip_big_army` | neutral | A big army is impressive. A big army in a bad spot is a very large lesson. |  |
| `tip_cassandra` | neutral | Cassandra is always right and never believed. Read the lessons screen. Be the exception. |  |

All 20 loading lines:

| id | class | text | rewrite |
|---|---|---|---|
| `loading_01` | convertible | Sharpening spears... | Sharpening everything that can be sharpened... |
| `loading_02` | ancient | Teaching goats to salute... |  |
| `loading_03` | ancient | Oiling the hinges on the Trojan horse... |  |
| `loading_04` | convertible | Calibrating catapults to four percent regret... | Calibrating everything to four percent regret... |
| `loading_05` | neutral | Asking Plato to define loading... |  |
| `loading_06` | neutral | Teaching Brutus an indoor voice. Retrying... |  |
| `loading_07` | neutral | Laminating the Terms of Conquest... |  |
| `loading_08` | ancient | Rehearsing the Spartan kick... |  |
| `loading_09` | ancient | Politely asking the Cyclops to aim at something... |  |
| `loading_10` | ancient | Waking up Zeus. He is not a morning god... |  |
| `loading_11` | ancient | Persuading chickens to be sacred... |  |
| `loading_12` | ancient | Unwrapping the mummies carefully... |  |
| `loading_13` | ancient | Counting Immortals. Ten thousand, give or take... |  |
| `loading_14` | neutral | Sorting soldiers by team colour and personal grudge... |  |
| `loading_15` | ancient | Feeding the warhounds sausages in advance... |  |
| `loading_16` | convertible | Placing the grape seller in a safe spot... | Placing the snack vendor in a safe spot... |
| `loading_17` | ancient | Hiring six hoplites to sit very quietly... |  |
| `loading_18` | neutral | Asking Cassandra how this goes. She sighed... |  |
| `loading_19` | ancient | Untangling the chickens from the tent ropes... |  |
| `loading_20` | ancient | Explaining the torch situation to the elephants... |  |

All 19 studio credits (role | name):

| id | class | text | rewrite |
|---|---|---|---|
| `credits_01` | ancient | Head of Goats \| The Goat |  |
| `credits_02` | neutral | Chief Laminator, Terms of Conquest \| Brutus Maximus |  |
| `credits_03` | neutral | Director of Interruptions \| Brutus Maximus |  |
| `credits_04` | neutral | Department of Defining Battle \| Plato the Dry (draft, unfinished) |  |
| `credits_05` | neutral | Head of Foresight (Ignored) \| Cassandra |  |
| `credits_06` | ancient | Catering \| Pompeii Pizza, now with 20% more ash |  |
| `credits_07` | convertible | Grapes \| A man in row ten | Snacks \| A man in row ten |
| `credits_08` | convertible | Siege Safety Officer \| Resigned. Gaius was launched. | Safety Officer \| Resigned. Gus was launched. |
| `credits_09` | ancient | Quality Assurance \| Several chickens |  |
| `credits_10` | convertible | Chief Elephant Wrangler \| Nobody has applied | Chief Wrangler of Large Animals \| Nobody has applied |
| `credits_11` | ancient | Voice of the Immortals \| Ten thousand, give or take |  |
| `credits_12` | ancient | Head of Thunder \| Zeus (on leave) |  |
| `credits_13` | ancient | Pottery Liaison \| The barbarians, very politely |  |
| `credits_14` | convertible | Spartan Subtlety Coach \| Position unfilled | Subtlety Coach \| Position unfilled |
| `credits_15` | neutral | Chief of Dignity \| Position unfilled |  |
| `credits_16` | convertible | Official Sponsor of Everything \| Delphi Insurance: we saw this coming | Official Insurer of Everything \| We saw this coming |
| `credits_f1` | convertible | No historical armies were harmed. Several chickens were pecked. | No real armies were harmed. Several snacks were eaten. |
| `credits_f2` | neutral | Thank you to everyone who survived. |  |
| `credits_f3` | ancient | The goat did the real work. |  |

### 3.11 Interfaces for spec/H, AR and VF

* **Pool shape** (feeds CU18 `createAnnouncer({era, pool})`): `{ ids: string[] /* Ancient neutral ids, verbatim */, shared: string[] /* sh_<ancientId> */, own: Template[] /* era-new */ }`. A chain head brings its follow beats. Ids in `ids` come from the CSV rows with class neutral; ids in `shared` from convertible rows.
* **Shared module**: `src/content/shared/humor/announcer_shared.js` (new, not an Ancient file, so G4 is untouched) generated by `tools/gen_shared_announcer.mjs` from the CSV (OI-5): for each convertible announcer row `{...ancientTemplate, id: 'sh_' + id, text: rewrite}` (same `cat`, `who`, `cond`, `weight`, `once`, `cd`). The 13 follow beats are not rewritten.
* **Counter** `announcerEffective(era)` (AR OI-1) = number of distinct non-follow templates resolved from `ids`, `shared` and `own`. Targets: at least 300, floor 250, per 3.5.
* **Tests** (named for spec/H and VF): T-H1 every `ids` entry exists in Ancient `TEMPLATES` and has class neutral in the CSV; T-H2 every `shared` entry maps to a convertible row; T-H3 no id of class ancient appears in any new-era pool (Modern proposal 10.4 accepted); T-H4 the dump hash recorded in 4 matches; T-H5 per generic category the resolved pool has R lines and every voice has one.
* **VF near-duplicate lint** (spec/VF section 3.14, the paragraph on near-duplicate and skeleton lints): the exemption "unless the Ancient string is an announcer template classified neutral (spec/H table, by id)" must also cover the Ancient source of every convertible row, because 22 of the 62 rewrites have word-3-gram Jaccard >= 0.6 against their source by design (PC2). Inside the reusable pool the largest pairwise Jaccard is 0.59 and the 286 lines have 286 distinct skeletons:

```
max pairwise word-3-gram Jaccard inside the reusable pool 0.59 (army_low_yours_b / army_low_theirs_b); VF fails at 0.6
reusable announcer lines 286, distinct skeletons 286, largest cluster 1 (battle_start_terms); VF cap max(4, 2% of surface) = 6
```

### 3.12 Repetition measurement (humor-sim with a restricted pool)

`tools/humor-sim.mjs` builds its announcer without a `templates` argument. A scratch copy that passes `templates` (a one-line change, PC3) ran the real selector over the Ancient scripts with three pools (seed 7, 1x, veteran stats, recorded logs):

| pool | templates | minutes | spoken lines | distinct | repeats within 5 min | top line share | categories heard | rule violations |
|---|---|---|---|---|---|---|---|---|
| full Ancient | 486 | 120 | 639 | 287 | 0.2% | 1.25% | 47/47 | 0 |
| neutral only | 252 (242 + 10 follow) | 120 | 567 | 180 | 0.2% | 1.41% | 24/47 | 0 |
| neutral + converted | 296 (286 + 10 follow) | 120 | 590 | 209 | 0.0% | 1.36% | 25/47 | 0 |
| negative control: the first 24 neutral battle_start lines | 24 | 120 | 14 | 14 | 0.0% | 7.14% | 1/47 | not applicable |

The 22 categories the shared pool cannot speak are exactly the 13 Ancient-signature categories and the 9 campaign categories; every other category is heard within 120 minutes. Proposed targets for a new era's pool (spec/H may tighten): repeats within 5 minutes at most 2%; top line share at most 3%; zero rule violations; every generic category heard in 120 minutes; at least 4 lines per minute of play; spoken reuse share at most 65% (OI-2, OI-4).

## 4. Acceptance

Owner of the script: TOOLS-VERIFY (tool), COMEDY-EDITOR (data). All rows registered as members of ER11 (text) once `criteria.mjs` exists; until then the commands are run by hand and quoted in hand-backs.

| id | check | script | inputs | threshold | owner | tier / first | negative control |
|---|---|---|---|---|---|---|---|
| ACC-1 | CSV covers every live non-follow row exactly once | `node tools/announcer_dump.mjs --verify` | CSV + live pools | 575 rows = 473 + 63 + 20 + 19; 0 missing, 0 duplicate, 0 unknown id; class in the set; reason non-empty; category and voice equal the dump; follow beats absent | TOOLS-VERIFY | F, under 1 s, P0 | ACC-2 mutants "dropped row", "duplicated row", "unknown id", "follow beat classified", "unknown class", "empty reason", "category mismatch", "voice mismatch", "wrong header" |
| ACC-2 | the verifier itself rejects bad data | `node tools/announcer_dump.mjs --selftest` | CSV | baseline passes and 17 of 17 mutants are rejected (list in the output below) | TOOLS-VERIFY | F, P0 | the mutants are the control; a verifier edited to accept everything fails this row |
| ACC-3 | rewrites are legal | inside ACC-1 | CSV | every convertible row has a rewrite of at most 22 words (tips 18), balanced braces, only slots and filters of the announcer vocabulary, no slot outside the always-available set that the original lacked, no Ancient noun, no banned-union word, not equal to the original | TOOLS-VERIFY | F, P0 | mutants "unknown slot", "over 22 words", "still names arrows", "hits banned union", "equals original" |
| ACC-4 | neutral rows are noun-clean | inside ACC-1; `--crosscheck` | CSV | no neutral row hits the Ancient lexicon unless its hit is an adjudicated false positive in `ALLOW`; no neutral row hits the banned union | TOOLS-VERIFY | F, P0 | mutant "ancient row relabelled neutral" (battle_start_a_giza) |
| ACC-5 | the dump is deterministic and pinned | `node tools/announcer_dump.mjs --surface all \| sha256sum` twice | live pools | both hashes equal and equal `794d0c506293d3fd8766796ae4019071a45883670d7dc1311a98d6990b764be4`; a changed Ancient string changes the hash | TOOLS-VERIFY | F, P0 | `--no-follow` output hashes differently (proves the hash depends on content) |
| ACC-6 | second independent agent read | agent step (REVIEWER) with a different prompt, era hidden | all 575 rows without the first read's classes; 20 seeded wrong labels (10 ancient shown as neutral, 10 neutral shown as ancient) | class agreement with the first read at least 90%; at least 18 of the 20 seeded labels caught; every disagreement carries a decision and a reason in a review CSV | REVIEWER | R (agent step), P0 before any reuse | a reader that answers "neutral" to everything fails the seeded-label threshold |
| ACC-7 | shared pool speaks | humor-sim with a `templates` option on neutral + converted | recorded logs, seed 7, 120 min | 25/25 non-signature, non-campaign categories heard; repeats within 5 min at most 2%; top share at most 3%; 0 rule violations; at least 4 lines per minute | TOOLS-VERIFY | E, P1 | the 24-line pool in 3.12 fails the category (1 of 25) and rate (14 lines in 120 min) thresholds |
| ACC-8 | per-era pool size and depth | spec/H counter `announcerEffective(era)` and T-H5 | era pool lists | at least 300 (floor 250); every generic category at R; every voice present | COMEDY-EDITOR | F, P1-P3 | a pool without `own` lines fails T-H5 on the 12 shortfall lines |
| ACC-9 | near-duplicate and skeleton lints accept the reuse | VF text lint with the PC2 exemption | the 286 reusable strings | pairwise Jaccard below 0.6 inside the pool (measured 0.59); skeleton cluster at most max(4, 2%) (measured 1) | TOOLS-VERIFY | E, P1 | a pair of identical lines injected into the pool |

Verifier output at hand-off:

```
classification rows: 575 / expected 575 (announcer non-follow 473, tips 63, loading 20, credits 19)
classes: neutral 264, ancient 249, convertible 62
rewrites with word-3-gram Jaccard >= 0.6 against their Ancient source: 22 of 62 (informational: spec/VF near-duplicate lint must exempt convertible sources, see ancient_announcer_classification.md)
OK
```

Negative controls output:

```
baseline: pass
rejected dropped row                       missing id battle_start_define
rejected duplicated row                    row 7 (battle_start_define): duplicate id
rejected unknown class                     row 7 (battle_start_ending): class "fine"
rejected convertible without rewrite       row 8 (battle_start_grapes): convertible without rewrite
rejected rewrite with unknown slot         row 8 (battle_start_grapes): rewrite slot {weapon} not in vocabulary
rejected rewrite over 22 words             row 8 (battle_start_grapes): rewrite longer than 22 words
rejected rewrite still names arrows        row 306 (big_swing_yours_mid): rewrite still names an Ancient noun: arrows
rejected rewrite hits banned union         row 306 (big_swing_yours_mid): rewrite hits the banned union: wounded
rejected rewrite equals original           row 110 (first_blood_early_p): rewrite equals original
rejected rewrite on a neutral row          row 7 (battle_start_ending): rewrite given for class neutral
rejected ancient row relabelled neutral    row 39 (battle_start_a_giza): neutral line names an Ancient noun: pyramids
rejected category mismatch                 row 332 (victory_terms): category battle_start != victory
rejected voice mismatch                    row 332 (victory_terms): voice plato != brutus
rejected follow beat classified            row 577 (battle_start_define_b): follow beat classified (follow beats inherit th
rejected unknown id                        row 577 (no_such_line): unknown id
rejected empty reason                      row 7 (battle_start_ending): empty reason
rejected wrong header                      header must be id,category,voice,class,reason,rewrite; got id,category,voice,cla
selftest ok: baseline passes, 17 of 17 mutants rejected
```

## 5. Residual ledger

| source | residual | answered in |
|---|---|---|
| `plan.md` section 11, `q1_disposition` PRODUCT-Q11, S11 | classify Ancient templates neutral / ancient / convertible by agent read in P0; pools are template-id lists enforced by test | H-C1..H-C4, 3.1-3.3, CSV, 3.11 (T-H1..T-H3); second read in 7 OI-1 |
| `q1_disposition` C15, `q2_product` Q10 | wording "agent read", never a person | all wording here; a text search of this file for the retired phrase returns no match (checked at hand-off) |
| `q3_product` 16 | two independent classifications, per-category table, effective pool >= 300, repetition number, signature categories | H-C12, 3.3 B-D, 3.5, 3.12; ACC-6 and OI-1 for the second read |
| `q2_product` Q11, `q1_disposition` CONTENT-Q21 | pool arithmetic reproducible; engine era-ization data | 3.5 arithmetic (R rule, tables), 3.4 list for CU18, PC1 |
| `q3_product` 15 (shared with VF 3.14) | panel scale calibrated on Ancient | PC4: sampling frame for the announcer surface |
| `q3_program` 27 | mark each callback with its source era | 3.9 (source ids, flags, gate) |
| `spec/VF` near-duplicate lint (neutral exemption by id) | spec/H supplies the id table | CSV class column; PC2 extends the exemption to convertible sources |
| `spec/AR` OI-1 (`announcerEffective`) | counter definition and numbers | 3.11 counter, 3.5 totals |
| `spec/AR` AP-C04 (`createAnnouncer({era, pool})`) | pool shape | 3.11 pool shape |
| `design/modern/proposal_A.md` 10.4 | Ancient templates classified ancient are not reused | accepted, test T-H3 |
| `design/scifi/proposal_A.md` signature categories | the effective pool reuses neutral Ancient templates and reaches >= 300 | accepted, 3.5 (412 hybrid, 469 full) |
| `design/scifi/humour.md` `sf_cb_terms` | source is the Ancient `battle_start` Terms line | source id `battle_start_terms` (convertible), setup-free, no flag needed |
| `design/modern/humour.md` `mod_cb_pizza`, `mod_cb_goat_van`, `mod_cb_trojan_box`, `mod_cb_chicken_cargo`, `mod_cb_wine_tea` and Sci-Fi `sf_cb_pizza/goat/gift/chicken/zeus_left/philosopher/wine` | Ancient sources named | source ids listed in 3.9; all ancient class, callbacks write new text |
| `design/medieval/humour.md` | no announcer-category table | 3.5 proposal, OI-2 |
| COORD decision "reuse only after the classification read" | gate | H-C12, ACC-6, OI-1 |
| task text | counts per category and class, neutral pool per category, categories under 6, 20 examples per class, running gags, spec/H table; tips, loading, credits | 3.3, 3.6, 3.7, 3.9, 3.10 |
| `plan.md` section 1 tips row ("30% converted") | reuse count | 3.10: 20 reusable of 63 |

## 6. Plan corrections

* **PC1 (plan section 1 announcer row; q1_disposition S11 arithmetic).** "categories x 9 + 3 per mission + 30% of neutral rewritten" is replaced by the R rule of 3.5 (R = max(6, ceil(1.5 x demand)), one reusable line per voice) plus the fixed lines (36 arena, 27 campaign) plus signature categories at 9 lines each. The reuse count already clears 300; the 220 era-new budget is spent on variety (shadow sets for the eight busiest categories, signature categories, ability and power lines), not on reaching a count.
* **PC2 (spec/VF 3.14, near-duplicate lint).** The exemption for "an announcer template classified neutral" must also exempt the Ancient source of every convertible row (22 of 62 rewrites have Jaccard >= 0.6 by design) and compare `sh_*` shared strings only with Ancient strings that are not their own source. Exemption set = CSV ids with class neutral or convertible.
* **PC3 (tools/humor-sim.mjs).** `runSimulation` must accept `opts.templates` (pass-through to `createAnnouncer`) and era event scripts, and print the spoken reuse share; the measurements of 3.12 used a scratch copy with exactly that one-line change.
* **PC4 (spec/VF 3.14 panel).** The announcer surface of the comedy panel scores era-new and converted lines only (62 rewrites plus the era's own); the 242 reused neutral lines are scored once, in the Ancient control sample, and are not re-scored per era. Otherwise a reused line that scored well in the control inflates every era's median.
* **PC5 (plan section 11, "30% of neutral rewritten").** Removed (H-C10): neutral lines are reused verbatim; the rewrite-until-pass rule applies to failures.
* **PC6 (maps/07 and CU18 event routes).** God-power announcer subs are keyed by effect kind, not by Ancient power id, and hazard subs are emitted only for hazards the arena has; without this 8 reusable god-power lines and 5 hazard lines are unreachable.

## 7. Open items

| id | item | owner | phase |
|---|---|---|---|
| OI-1 | Second independent agent read of all 575 rows (different prompt, classes hidden), ACC-6 thresholds, a review CSV with one decision per disagreement; reuse by any new era is blocked until it is signed; the CSV is then frozen. | REVIEWER | P0 |
| OI-2 | spec/H decides: the R rule and the 12-line generic shortfall, the hybrid reuse rule of 3.3 G (or full sharing), the 65% spoken-reuse ceiling, shadow sets for the eight busiest categories, and writes the Medieval signature-category table (proposal in 3.5). | COMEDY-EDITOR with COMEDY-MED | P0-P1 |
| OI-3 | CU18 / engine data: `HEROES` and `PROP_NAMES` per era; effect-kind god-power subs; hazard sub emission; plural and proper flags per unit; gag cooldown groups (at most 2 lines per gag per battle for terms, wall, vendor); `{pct}` in the misfire payload and `{n}` in the strike payload. | INTEGRATION with COMEDY-EDITOR | P1 |
| OI-4 | `humor-sim` takes `templates` and era scripts and reports the spoken reuse share (PC3); ACC-7 registered. | TOOLS-VERIFY | P1 |
| OI-5 | `tools/gen_shared_announcer.mjs` writes `announcer_shared.js` from the frozen CSV; tests T-H1..T-H5 registered. | REGISTRY with TOOLS-VERIFY | P1 |
| OI-6 | Decide the Brutus capitals rule for reused lines (H-C9: exempt by id, or trim the 35 flagged lines and move them to convertible). | COMEDY-EDITOR | P0 |
| OI-7 | Per-era tip-truth check for the `[rule]` tips; text sweep over every reused id under each era's banned and allowed lists; any failing line is rewritten, not deleted. | COMEDY-EDITOR with TOOLS-VERIFY | P2-P3 |
| OI-8 | Callback ledger rows for the new candidates of 3.9 (`x_cb_vendor`, `x_cb_wall`, `med_cb_pizza`, `med_cb_delphi`, `x_cb_define`) and the `CB_SOURCES` id map (Ancient line id -> flag), with `seen.callbacks` keys per AR. | COMEDY-EDITOR | P1 |
