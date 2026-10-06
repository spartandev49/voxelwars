# spec/units.md — Roster, stats, abilities, visual briefs (design intent; `src/content/era_ancient/stats.js` is the numeric truth, `tools/balance.mjs` tunes cost and minor stats, structure is frozen)

Units = `UnitDef` (spec.md §6). 43 units, 7 factions. **Every number in the stat table below was checked against `stats.js`; if the two ever differ, `stats.js` wins and this table is corrected.** Defaults unless stated (`stats.js DEFAULTS`): `radius 0.55`, `mass 1`, `turnRate 9`, `accel 14`, `runMul 1.5`, `scale 1`, melee `windup` taken from clips. `cd` = full attack cycle (s). `range` = edge-to-edge gap in u (spec §6). Speeds in u/s.
- **Knockback**: there is deliberately no `kb` column. `kb` is a per-attack field in `stats.js` (default 4) used with `KB_SCALE = 0.06` and the 48 u/s velocity clamp (spec §6). Contract ranges (S25): infantry hit <= 0.7 u without a crit (about 0.5 u typical), cavalry charge hit 1.5-3 u, monsters (war_elephant, minotaur, cyclops) 3-5 u on a mass-1 target. Explicit-distance effects (Spartan kick 8 u, bull charge) set velocity directly and ignore `kb`.
- **Shielded infantry spacing (hum1 rule D2)**: a unit that carries a shield with width >= 12 voxels (hoplon, round shield, parma, scutum, wicker shield, pavise, pelte) uses `radius >= 0.65` in `stats.js` so lines do not interpenetrate; phalanx formations may overlap shields at 1.15 u spacing, that is the look. SIM owns the radius values (today `r .65` on hoplite, spartan, strategos, legionary, centurion, anubis_guard, pharaoh, sparabara and xerxes); the table lists a radius wherever `stats.js` sets one.

## Ability mechanics (<= 32 registry entries; every one has trigger, AI cast rule, visible telegraph, sound cue, announcer hook, unit test)
Classes (registry ids in `sim/abilities/`): `aura` (radius, effect: rally|curse|great_king|discipline|pincer; `great_king` = +10% dmg and +morale to allies in radius: pharaoh r 8, xerxes r 10), `stance` (phalanx|testudo|shield_wall: stationary bonus), `kick`, `cc_field` (shape circle|cone; effect confuse|sleep|stone|scare|panic_cav), `net`, `heal_pulse`, `execute`, `dot_cloud`, `revive`, `rage`, `chain_lightning`, `war_horn`, `dash` (bull_charge|goat_charge), `summon_on_death`, `tantrum`, `cluck`, `pack_bonus`, `throne`, and the two classes with no cast of their own, `crowd_favorite` (gladiator: +20% dmg while >= 5 enemies are within 5 u) and `bribe` (senator: 5% per coin hit that the target switches team for 6 s). That is 20 classes. Spec §6.1 and decision D14 describe those two as a unit flag (`crowdFavorite`) and a ranged param (`ranged.bribe`); `stats.js` now authors them, like every other registry entry, as `abilities[]` items: `{id:'crowd_favorite', enemies:5, radius:5, dmg:1.2}` and `{id:'bribe', chance:0.05, secs:6}`. Attack modifiers (registry ids, authored the same way): `hook` (khopesh pulls shield), `breaks_shield` (pilum), `fire_every` (flaming arrows), `poison` (medusa), `misfire` (catapult 4%), `misaim` (cyclops 25%), `fire_panic` (elephant: flees 6 s after 3 fire hits; while panicked it carries the SCARE status and **tramples its own side too**). Passive rules: `trample`, `brace`, `charge`, `backstab`. **Trample** (spec §8.1) needs `mass >= 8` and speed > 1.5 u/s and only hurts units with `mass < 3`: war_elephant (12), cyclops (10) and trojan_horse (8) trample; minotaur (6) and the chariot (3.5) do not. Projectile kinds: arrow, javelin, pilum, francisca, boulder, bolt, coin, sunbeam (instant beam), scepter (magic aoe bolt), thunderbolt (chain 3).

## Stat table
Melee = dmg/cd/range/type. Ranged = proj dmg/cd/range. Shield = arc°(half-angle)/melee-block/proj-block. `ai` is the `ai.style` in `stats.js`.

### Hellenes
| id | role | cost | hp | arm | spd | melee | ranged | shield | mass | abilities / tags / ai |
|---|---|---|---|---|---|---|---|---|---|---|
| hoplite | melee | 100 | 110 | .30 | 2.6 | 14/1.2/2.0 pierce | - | 70/.45/.60 | 1.0 r .65 | stance:phalanx; tags spear; ai hold |
| spartan | melee | 190 | 150 | .35 | 2.9 | 17/1.0/2.0 pierce | - | 80/.55/.65 | 1.1 r .65 | kick (8 s cd: launches the target 8 u with a spin clip + 0.8 s stun, explicit velocity; never used on targets with mass >= 6); tags spear,elite,fearless; ai charge |
| peltast | ranged | 85 | 70 | .05 | 3.4 | 6/.9/1.2 pierce | javelin 16/2.0/18 ap .25 | - | .9 | skirmish (kites at range*0.85); tags skirmisher; ai skirmish |
| cretan_archer | ranged | 90 | 55 | 0 | 2.7 | 5/1.0/1.0 blunt | arrow 11/1.6/34 spread .045 | - | .9 | tags archer; ai skirmish |
| companion_cavalry | cavalry | 220 | 150 | .25 | 3.4 (run x2.5=8.5) | lance 24/1.6/2.6 pierce | - | 60/.25/.4 | 3.0 r .8 | tags cavalry,lance; ai flank |
| philosopher | support | 120 | 60 | 0 | 2.4 | scroll 4/1.4/1.0 blunt | - | - | .9 | cc_field confuse (circle r 7, 3 s channel, 14 s cd; confused: 60% attack speed loss + moves randomly, speech bubbles); tags support; ai support (keeps away) |
| strategos | hero | 380 | 260 | .40 | 3.0 | 22/1.0/1.8 slash | - | 70/.45/.5 | 1.2 r .65 | aura rally (r 10: +15% dmg, +morale); tags officer,elite,fearless; ai hero |

### Romans
| id | role | cost | hp | arm | spd | melee | ranged | shield | mass | abilities |
|---|---|---|---|---|---|---|---|---|---|---|
| legionary | melee | 115 | 130 | .38 | 2.5 | 15/1.0/1.5 slash | - | 90/.50/.75 | 1.0 r .65 | stance:testudo (+.20 proj block when >=4 allies adjacent and ranged threat within 30 u); ai hold |
| pilum_thrower | ranged | 110 | 80 | .20 | 3.0 | 12/1.0/1.4 slash | pilum 24/3.0/14 ap .5 | 50/.3/.3 | 1.0 | pilum disables enemy shield (breaks block for 4 s); tags skirmisher; ai skirmish |
| centurion | hero | 260 | 200 | .42 | 2.9 | 20/.95/1.7 slash | - | 70/.45/.5 | 1.1 r .65 | aura discipline (r 9: +morale, -morale loss 40%); tags officer,elite; ai hero |
| gladiator | melee | 160 | 140 | .10 | 3.1 | trident 18/1.1/2.4 pierce | - | - | 1.0 | net (r 10, roots 2.5 s, 12 s cd); crowd_favorite (+20% dmg while >=5 enemies within 5 u); tags spear; ai charge |
| equites | cavalry | 190 | 130 | .22 | 3.5 (x2.4) | 18/1.4/2.4 pierce | - | 50/.2/.3 | 2.8 r .8 | tags cavalry,spear; ai flank |
| ballista | siege | 260 | 120 | .20 | 1.2 | - | bolt 60/4.5/55 ap .6 pierceN 3 minRange 8 | - | 2.5 r .9 | crew of 2 (visual); tags siege; ai siege (targets clusters) |
| senator | support | 140 | 50 | 0 | 2.5 | - | coin 3/2.0/10 | - | .9 | cc_field sleep (r 9, 4 s channel, 16 s cd, sleepers take x1.5 dmg); bribe (5% per coin: enemy switches team for 6 s; bosses cannot be bribed); tags support; ai support |

### Egyptians
| id | role | cost | hp | arm | spd | melee | ranged | shield | mass | abilities |
|---|---|---|---|---|---|---|---|---|---|---|
| medjay | melee | 85 | 100 | .15 | 3.0 | 13/1.2/2.0 pierce | - | 55/.35/.4 | 1.0 | tags spear; ai hold |
| nubian_archer | ranged | 95 | 60 | 0 | 2.8 | 5/1.0/1.0 blunt | arrow 12/1.5/36 spread .04 | - | .9 | tags archer; fire arrows (every 6th shot ignites, `burn`); ai skirmish |
| khopesh_warrior | melee | 100 | 105 | .20 | 3.0 | 16/1.0/1.6 slash | - | 50/.3/.3 | 1.0 | khopesh hook: 15% on hit pulls shield (target loses block 3 s); ai charge |
| chariot_archer | cavalry | 240 | 140 | .15 | 3.6 (x2.2) | ram 20/1.0/1.4 blunt (on contact) | arrow 10/1.1/30 spread .06 (fires while moving) | - | 3.5 r .9 | **no trample** (mass 3.5 < 8; the ram hit is its contact attack); tags cavalry,archer; ai flank |
| mummy | melee | 140 | 180 | .10 | 1.9 | 12/1.4/1.5 blunt | - | - | 1.4 | aura curse (r 5: enemies -20% speed); tags fearless,undead,fire_weak (x2); ai charge |
| anubis_guard | melee | 230 | 170 | .40 | 2.9 | 20/1.1/2.2 pierce | - | 70/.5/.5 | 1.3 r .65 scale 1.15 | execute (every 10 s kill target <20% hp in melee; not bosses or large units); tags elite,fearless; ai charge |
| priest_of_ra | support | 150 | 60 | 0 | 2.6 | - | sunbeam 8/1.2/14 magic | - | .9 | heal_pulse (4 allies in 8 u +25 hp / 6 s); tags support; ai support |
| pharaoh | hero | 420 | 300 | .30 | 2.6 | 18/1.2/1.6 blunt | scepter blast 28/2.5/16 magic aoe 3 | 60/.4/.4 | 1.4 r .65 | dot_cloud locusts (r 7, 6 s, 8 dps, 25 s cd); aura great_king (r 8); tags officer,elite,general; ai hero |

### Persians
| id | role | cost | hp | arm | spd | melee | ranged | shield | mass | abilities |
|---|---|---|---|---|---|---|---|---|---|---|
| immortal | melee | 120 | 105 | .22 | 2.8 | 12/1.15/2.1 pierce | - | 55/.35/.45 | 1.0 | revive (first death: rises at 40% hp after 3 s, once); tags spear; ai hold |
| sparabara | ranged | 105 | 70 | .15 | 2.5 | 7/1.1/1.4 pierce | arrow 10/1.7/28 spread .045 | 90/.65/.80 | 1.0 r .65 | stance:shield_wall (stationary: proj block .90); tags archer; ai hold |
| cataphract | cavalry | 310 | 230 | .60 | 3.0 (x2.2) | lance 26/1.8/2.7 pierce | - | 60/.3/.4 | 4.0 r .85 | tags cavalry,lance,heavy; ai charge |
| camel_rider | cavalry | 170 | 120 | .15 | 3.3 (x2.2) | 14/1.3/2.4 pierce | - | - | 2.6 r .8 | cc_field panic_cav (cone r 6: enemy cavalry -35% speed, 20% bolt away) passive aura; tags cavalry,spear; ai flank |
| xerxes | hero | 400 | 280 | .25 | 2.6 | 20/1.0/1.7 slash | - | 60/.4/.4 | 1.3 r .65 | throne (stationary 4 s -> a throne prop spawns, sits: allies +20% dmg while seated; if attacked: stands and shouts "Retreat!" cowering 2 s); aura great_king (r 10); tags officer,general; ai hero |

### Carthaginians
| id | role | cost | hp | arm | spd | melee | ranged | shield | mass | abilities |
|---|---|---|---|---|---|---|---|---|---|---|
| war_elephant | monster | 650 | 900 | .35 | 3.4 (x1.6) | gore 40/2.0/3.2 pierce | howdah archers 2x arrow 9/1.4/28 | - | 12 r 1.5 | trample passive (mass 12); cc_field scare (trumpet r 10, 15 s cd: -morale); `fire_panic`: flees 6 s after 3 fire hits and, while panicked, tramples its own side too; tags large,boss,fire_panic; ai charge |
| numidian | cavalry | 140 | 75 | .05 | 4.0 (x1.9) | 8/1.0/1.4 pierce | javelin 12/1.6/16 | - | 2.4 r .75 | skirmish kite; tags cavalry,skirmisher; ai skirmish |
| catapult | siege | 300 | 140 | .15 | 1.0 | - | boulder 70/6.0/70 blunt aoe 4 min 15 | - | 3.0 r 1.1 | crater; crew of 3 (visual); misfire gag: 4% launches a crew member (dmg 5 aoe 1.5, `catapult_misfire` announcer line); tags siege; ai siege |
| hannibal | hero | 360 | 250 | .30 | 3.5 (x2.3) | 24/1.2/2.4 pierce | - | 60/.3/.4 | 3.0 r .8 | mounted hero; aura pincer (r 14: allies +15% dmg while target flanked); tags officer,elite,cavalry,general; ai hero |

### Barbarians
| id | role | cost | hp | arm | spd | melee | ranged | shield | mass | abilities |
|---|---|---|---|---|---|---|---|---|---|---|
| berserker | melee | 120 | 120 | 0 | 3.4 | 22/0.9/1.8 slash | - | - | 1.0 | rage (<50% hp: +50% dmg, +30% speed, fearless); ai charge |
| axe_thrower | ranged | 105 | 80 | .10 | 3.0 | 12/1.0/1.4 slash | francisca 20/2.4/13 slash | - | 1.0 | tags skirmisher; ai skirmish |
| druid | support | 180 | 70 | 0 | 2.6 | - | thunderbolt 22/5.0/22 magic chain 3 | - | .9 | chain_lightning (above), heal_pulse 15 on one ally within 6 u when no enemy is in range (5 s cd); tags support; ai support |
| warhound | beast | 55 | 55 | 0 | 4.2 (x1.55 = 6.5) | bite 9/0.7/1.0 pierce | - | - | .6 r .35 | pack_bonus (+8% dmg per other hound within 5 u, max +40%); tags animal; ai charge |
| chieftain | hero | 340 | 280 | .25 | 3.0 | club 30/1.4/2.0 blunt | - | - | 1.5 scale 1.2 | war_horn (once, 8 s: allies in 14 u +20% speed +20% dmg); tags officer,elite,general; ai hero |

### Mythic
| id | role | cost | hp | arm | spd | melee | ranged | shield | mass | abilities |
|---|---|---|---|---|---|---|---|---|---|---|
| minotaur | monster | 480 | 520 | .25 | 3.2 | greataxe 38/1.7/2.8 slash | - | - | 6 r .8 scale 1.7 | dash bull_charge (12 u, dmg 30 + 1 s stun to everything in path, 10 s cd); tags large; ai charge |
| cyclops | monster | 620 | 700 | .20 | 2.4 | club 45/2.2/3.5 blunt | boulder 55/7.0/28 aoe 2.5 blunt | - | 10 r 1.1 scale 2.2 | trample passive (mass 10); boulder_misaim: 25% of throws land 4-9 u off target (announcer: poor depth perception); tags large,boss; ai charge |
| medusa | monster | 280 | 130 | 0 | 2.8 | snakes 10/1.0/1.6 pierce poison 3 dps x3 s | - | - | 1.0 | cc_field stone (cone 40deg, r 14, 4 s, 9 s cd): stoned units freeze solid grey, take x2 from blunt, shatter into debris if killed; ai skirmish |
| centaur_archer | ranged | 230 | 125 | .10 | 3.9 (x1.7) | 10/1.2/1.8 blunt | arrow 14/1.4/38 spread .035 | - | 2.6 r .7 | kite; tags archer,cavalry; ai skirmish |
| trojan_horse | siege | 450 | 400 | .30 | 1.4 | ram 30/1.5/2.5 blunt | - | - | 8 r 1.4 | trample passive (mass 8); summon_on_death (on death, on reaching the enemy line (>= 3 enemies within 5 u), under 50% hp, or 25 s after first contact; once): reveal spawns 6 hoplites; tags large,siege,fire_weak (wood, x1.6); ai charge |
| sacred_chicken | swarm | 25 | 25 | 0 | 4.6 | peck 4/0.3/0.8 pierce | - | - | .3 r .25 | tantrum (once it has lost 30% of its max hp: 5 s, x3 dmg, x1.5 speed, re-arms after 12 s); cluck taunt (enemies within 5 u target it for 2 s, 12 s cd); tags animal; ai charge |
| battle_goat | beast | 45 | 70 | .05 | 4.0 (x1.4) | headbutt 12/1.5/1.2 blunt | - | - | 1.2 r .4 | dash goat_charge (8 u, dmg x2, 7 s cd); tags animal; VIP in "Protect the Goat" missions; ai charge |

## God powers (sandbox, some missions; mana-less, per-power cooldown)
| id | effect | cd |
|---|---|---|
| zeus_lightning | click: 1 bolt 90 magic aoe 3, chain 4 targets, screen flash (flash limiter), thunder cue | 6 s |
| meteor | 2 s telegraph, 140 fire aoe 5 + crater r 4 | 20 s |
| earthquake | 5 s shake, units in r 14 stagger/fall, props damaged, walls collapse | 30 s |
| heal_wave | +60 hp to all allies in r 12 | 25 s |
| wine_rain | 8 s: units in r 12 become "tipsy": 40% random movement, damage x0.6, confetti-wine particles | 30 s |
| raise_chickens | spawns 8 sacred chickens on the clicked team | 15 s |
Heroes' ultimate = their ability. All god powers show a ground telegraph.

## Placement defaults
Squad brush counts: melee 9 (3x3), ranged 8, cavalry 5 (wedge), siege 1, monster/hero 1, hound 6, chicken 8, goat 3. Army budget presets per team: Skirmish 3,000 (~30 units) / Battle 8,000 (~80) / War 20,000 (~200) / Epic 40,000 (~400, capped by tier) / Custom. Unit cap per team by tier: Potato 100 / Papyrus 200 / Marble 300 / Olympian 400 (spec §2).

## Visual briefs (UNITS/BEASTS must satisfy; silhouette first, details second)
**Rules every brief obeys** (hum1 table in `parts/_kit.js DIM`, spec §4.1; decision D2):
- The **offhand grid is at most 16x16x6 voxels**: shields, pavise and tower shield included, nothing taller or wider. Its rest AABB may overlap the torso and forearm but never pokes through the back of the body or below y 0.
- The **`back` slot** is 12x14x8 (top at y 24, below the head top at y 29). A banner on the back is a SHORT flag that stays under y 24. Tall standards are main-hand weapons (cloth tinted).
- Weapons are tilted by the compiler until their lowest corner is >= y 0; length follows `range` edge-to-edge (spec §4.1 weapon length rule).
- **Tint surfaces**: every brief ends with a `Tint:` line naming the surfaces authored with `T()` (light base colour, multiplied by the team colour). A shield carries a >= 3-voxel-wide tint band (rim or boss ring); a fully tinted face is allowed, never required. Metal, trim and any cloth not named in `Tint:` stays neutral so faction colours persist.
- **U3**: `tools/tintcheck.mjs` projects the compiled model (front, back, side) in the rest pose and the ready stance; pass = >= 30% of the visible surface is `F_TEAM` pooled over the whole silhouette including cloth, and no single projection below 22%. Humanoids and riders >= 30%; non-humanoids (monsters, beasts, siege, mounts counted alone) >= 15%.

### Hellenes
- hoplite: Corinthian helm with red horsehair crest, big round bronze hoplon with lambda, linen chiton, bronze greaves, long dory. Tint: crest + chiton hem + shield rim + boss ring (the hoplon face stays bronze).
- spartan: crimson cape, Corinthian helm with transverse crest, bare muscular chest, spear + hoplon, short beard; THIS IS SPARTA pose in `kick`. Tint: the whole cape (so the "Spartan red" is the team colour) + transverse crest + shield rim + boss ring.
- peltast: Thracian cap (fox pelt), wicker pelte buckler, bundle of javelins on back, patterned cloak. Tint: the stripes of the patterned cloak + pelte rim band + tunic hem (fox pelt and wicker stay natural).
- cretan_archer: leather cap, quiver, composite bow, tunic with team sash. Tint: sash + tunic body (light base) + cap band.
- companion_cavalry: Boeotian helm with white plume, linen cuirass, xyston lance, white horse with team saddle cloth. Tint: saddle cloth (large) + the rider's chlamys + lance pennon + shield rim + boss ring (the white plume and white horse stay neutral).
- philosopher: bald, huge white beard, himation robe over one shoulder, scroll in hand, olive wreath; expressive mouth voxels for bubbles. Tint: the himation drape (light base, so the robe reads in the team colour) + scroll ribbon; beard, wreath and tunic stay white/green.
- strategos: bronze muscle cuirass, tall crest, red cloak, baton tucked in the belt. **Main hand = the "standard"**: a pole with a team-coloured cloth banner near the top (cloth >= 8x10 voxels, pole top <= y 34 so the unit stays under U2's 3.4 u height ceiling, swung like a staff with style `slash`). **No back-pole.** Tint: cloak + crest + standard cloth + tunic hem.

### Romans
- legionary: Imperial Gallic helm, red-brown scutum with a golden winged thunderbolt (**the scutum is NEUTRAL leather/paint, not tinted**: red is the team-B colour and `T()` multiplies by the team colour), lorica segmentata (segment lines), gladius, caligae. Tint: tunic hem + helmet crest + shield rim.
- pilum_thrower: same kit lighter, helmet without cheek flaps, 2 pilum, small shield. Tint: tunic hem + neck scarf + shield rim band.
- centurion: transverse crest, silver phalerae discs on chest, vine staff (vitis) as weapon, greaves. Tint: transverse crest + cloak + tunic hem + shield rim (phalerae and greaves stay silver).
- gladiator: manica arm guard on one arm, bare chest, subligaculum, trident + net on hip, murmillo-style fish crest helm variant. Tint: subligaculum + fish crest + manica bands (net rope neutral).
- equites: Montefortino helm, mail shirt, round parma shield, spear, chestnut horse. Tint: saddle cloth + tunic hem + parma rim + boss ring + helmet plume.
- ballista: wooden frame with torsion springs, bolt loaded, 2 tiny crew voxel figures animate cranking. Tint (non-humanoid >= 15%): a cloth banner on the frame + spring wraps + crew tunics (`hum_lite` team tunic).
- senator: white toga with purple stripe, laurel crown, receding hair, bag of coins; waddles. Tint: the toga drape (light base, reads in the team colour); the stripe stays purple, the laurel stays green.

### Egyptians
- medjay: linen kilt, bare chest, short wig, spear, small hide shield. Tint: kilt + headband + a 3-voxel painted band across the hide shield (the hide itself stays tan).
- nubian_archer: dark skin, ostrich-feather headband, leopard-skin sash, tall bow. Tint: headband feathers (light base) + kilt (the leopard sash stays spotted).
- khopesh_warrior: nemes-lite headcloth (stripes), khopesh sickle sword, gold collar broad, kilt. Tint: nemes stripes + kilt + shield rim (collar stays gold).
- chariot_archer: 2-wheeled chariot with two horses (team-tinted feather plumes), archer + driver. Tint (>= 15% across the composed model): both horse plumes + chariot side panels + crew kilts.
- mummy: bandage wraps (off-white, loose strands), glowing green-gold eyes (GLOW), shuffling stance. Tint: the bandage wraps are a light base, so the linen is washed in the team colour (loose strands stay off-white); eyes stay green-gold glow.
- anubis_guard: jackal head (black), golden collar, tall khopesh-spear, kilt, scale 1.15. Tint: kilt + shoulder sash + shield rim (head black, collar gold).
- priest_of_ra: shaved head, sun-disc staff (GLOW disc), white robe with gold trim, leopard pelt. Tint: the robe (light base) (gold trim, GLOW disc and pelt stay neutral).
- pharaoh: double crown (Pschent) white/red, false beard, crook & flail, gold collar, throne cape. Tint: the throne cape (whole) + kilt + shield rim (crowns, collar and regalia stay neutral).

### Persians
- immortal: wicker shield, scale armour (pattern), tiara/fez cap (Persian hat), spear with pomegranate butt (gold sphere), white-blue colours. Tint: fez cap + tunic sleeves and skirt + wicker shield rim band (the white-blue read comes from the faction palette on trim).
- sparabara: wicker **pavise (12 wide x 16 tall voxels, never beyond the 16x16 offhand grid)** carried upright by the bearer, bow in the main hand behind it, cap. Tint: a >= 3-voxel band across the top of the pavise + cap + tunic.
- cataphract: full barded horse (scale cloth), conical helm with mail veil, kontos long lance. Tint: the horse's caparison cloth (light base, large) + lance pennon + shield rim (scale armour and mail stay metal).
- camel_rider: camel with swaying gait, turban, curved scimitar belt, spear. Tint: turban + saddle blanket + camel harness tassels.
- xerxes: tall tiara, curled beard, purple-gold robe, scimitar; throne prop (gold, tall). Tint: the robe body (light base; the gold hem stays gold) + tiara band + shield rim; the throne is neutral gold.

### Carthaginians
- war_elephant: huge grey elephant, red-blue tasseled blanket, howdah (wood tower) with 2 archers, tusk bands, trunk animation. Tint (>= 15%): the blanket + howdah cloth + a banner on the howdah (tusk bands stay gold).
- numidian: unarmoured rider, no saddle, bare-headed w/ braids, javelins, small horse. Tint: the rider's tunic + a neck cloth and brow band on the horse.
- catapult: onager-style arm with sling, wheeled frame, rope; arm rotates on fire, 3 crew figures. Tint (>= 15%): sling cloth + a tarp over the ammunition pile + crew tunics.
- hannibal: eyepatch, bronze helm w/ crest, red cloak, rides black horse, spear. Tint: crest + cloak + saddle cloth + shield rim (the black horse and bronze helm stay neutral).

### Barbarians
- berserker: wolf-pelt hood, bare torso with blue woad paint swirls, two-handed axe, wild hair. Tint: the woad swirls (the war paint IS the team colour) + trews + belt cloth; pelt stays grey.
- axe_thrower: horned helm (small horns), braided beard, belt of throwing axes, fur trim. Tint: tunic + trews band (fur trim and horns stay natural).
- druid: hooded green robe, golden sickle, staff with mistletoe (GLOW), long white beard. Tint: the robe and hood (light base, so the green is the team colour) + sash; sickle gold, mistletoe GLOW.
- warhound: grey-brown mastiff, spiked collar, drooling (white voxel), wagging tail. Tint (>= 15%): the collar band + a tinted back cloth between the shoulders (spikes stay iron).
- chieftain: giant horned helm, bearskin cloak, massive club, huge mustache, horn on belt. Tint: tunic sleeves + trews + war-horn baldric (bearskin, helm and club stay natural).

### Mythic
- minotaur: bull head with horns, brass nose ring, muscular body brown fur, loincloth, double-bit greataxe. Tint (>= 15%): loincloth + harness straps + horn caps (fur and brass stay natural).
- cyclops: single huge eye, tusks, tree-trunk club, one-shoulder tunic, scale 2.2. Tint (>= 15%): the one-shoulder tunic (whole) + belt rope.
- medusa: green skin, snake hair (animated sway), golden bow/none, gorgon eyes (GLOW green). Tint: gown wrap + stole (skin, snakes and eyes stay green).
- centaur_archer: horse body (quad1) + human torso/head/arms, bow, chestnut coat. Tint: saddle blanket + torso sash + quiver strap.
- trojan_horse: huge wooden horse on wheels, planks with visible seams, hatch in belly, rope. Tint (>= 15%): a painted cloth blanket on the flank + mane ribbons + hub caps (planks stay wood).
- sacred_chicken: white chicken, red comb, tiny golden halo (GLOW). Tint (>= 15%): comb + wattle + tail feathers (the comb IS the team colour); halo stays GLOW gold.
- battle_goat: grey goat with huge curled horns, tiny helmet, beard. Tint (>= 15%): helmet crest + a saddle-cloth jacket + horn rings.
