# spec/units.md — Roster, stats, abilities, visual briefs (initial values; `tools/balance.mjs` tunes cost and minor stats, structure is frozen)

Units = `UnitDef` (see spec.md §5). 43 units, 7 factions. Defaults unless stated: `radius 0.55`, `mass 1`, `turnRate 9`, `accel 14`, `runMul 1.5`, melee `windup` taken from clips. `cd` = full attack cycle (s). `range` = edge-to-edge gap in u. Speeds in u/s. `kb` knockback strength (default 4) used with `KB_SCALE = 0.06` (see spec §6): a normal hit nudges ~0.5 u; monsters use large kb values. **Numbers in `src/content/era_ancient/stats.js` are authoritative; this table is the design intent.**

## Ability mechanics (<= 32; every one has trigger, AI cast rule, visible telegraph, sound cue, announcer hook, unit test)
Classes (registry ids in `sim/abilities/`): `aura` (radius, effect: rally|curse|great_king|discipline|pincer; great_king r 8 = +10% dmg, +morale), `stance` (phalanx|testudo|shield_wall: stationary bonus), `kick`, `cc_field` (shape circle|cone; effect confuse|sleep|stone|scare|panic_cav), `net`, `heal_pulse`, `execute`, `dot_cloud`, `revive`, `rage`, `chain_lightning`, `war_horn`, `dash` (bull_charge|goat_charge), `summon_on_death`, `tantrum`, `cluck`, `pack_bonus`, `bribe`, `throne`, `crowd_favorite`. Attack modifiers via the `onHit` hook class: `hook` (khopesh pulls shield), `breaksShield` (pilum), `fireEvery` (flaming arrows), `poison` (medusa), `misfire` (catapult 4%), `misaim` (cyclops 25%), `fire_panic` (elephant flees 6 s after 3 fire hits). Passive rules: trample, brace, charge, backstab. Projectile kinds: arrow, javelin, pilum, francisca, boulder, bolt, coin, sunbeam (instant beam), scepter (magic aoe bolt), thunderbolt (chain 3).

## Stat table
Melee = dmg/cd/range/type. Ranged = proj dmg/cd/range. Shield = arc°(half-angle)/melee-block/proj-block.

### Hellenes
| id | role | cost | hp | arm | spd | melee | ranged | shield | mass | abilities / tags / ai |
|---|---|---|---|---|---|---|---|---|---|---|
| hoplite | melee | 100 | 110 | .30 | 2.6 | 14/1.2/2.0 pierce | - | 70/.45/.60 | 1.0 | stance:phalanx; tags spear; ai hold-then-charge |
| spartan | melee | 190 | 150 | .35 | 2.9 | 17/1.0/2.0 pierce | - | 80/.55/.65 | 1.1 | kick (8 s cd: launches the target 8 u with a spin clip + 0.8 s stun, explicit velocity); fearless, elite |
| peltast | ranged | 85 | 70 | .05 | 3.4 | 6/.9/1.2 pierce | javelin 16/2.0/18 ap .25 | - | .9 | skirmish (kites at range*0.85); tags skirmisher |
| cretan_archer | ranged | 90 | 55 | 0 | 2.7 | 5/1.0/1.0 | arrow 11/1.6/34 spread .045 | - | .9 | tags archer |
| companion_cavalry | cavalry | 220 | 150 | .25 | 3.4 (run x2.5=8.5) | lance 24/1.6/2.6 pierce | - | 60/.25/.4 | 3.0 r .8 | tags cavalry,lance; ai flank |
| philosopher | support | 120 | 60 | 0 | 2.4 | scroll 4/1.4/1.0 blunt | - | - | .9 | cc_field confuse (circle r 7, 3 s channel, 14 s cd; confused: 60% attack speed loss + moves randomly, speech bubbles); ai support-keepaway |
| strategos | hero | 380 | 260 | .40 | 3.0 | 22/1.0/1.8 slash | - | 70/.45/.5 | 1.2 | aura rally (r 10: +15% dmg, +morale); tags officer,elite,fearless |

### Romans
| id | role | cost | hp | arm | spd | melee | ranged | shield | mass | abilities |
|---|---|---|---|---|---|---|---|---|---|---|
| legionary | melee | 115 | 130 | .38 | 2.5 | 15/1.0/1.5 slash | - | 90/.50/.75 | 1.0 | stance:testudo (+.20 proj block when >=4 allies adjacent and ranged threat within 30 u) |
| pilum_thrower | ranged | 110 | 80 | .20 | 3.0 | 12/1.0/1.4 slash | pilum 24/3.0/14 ap .5 | 50/.3/.3 | 1.0 | pilum disables enemy shield (breaks block for 4 s) |
| centurion | hero-lite | 260 | 200 | .42 | 2.9 | 20/.95/1.7 slash | - | 70/.45/.5 | 1.1 | aura discipline (r 9: +morale, -morale loss 40%); tags officer |
| gladiator | melee | 160 | 140 | .10 | 3.1 | trident 18/1.1/2.4 pierce | - | - | 1.0 | net (r 10, roots 2.5 s, 12 s cd); crowd_favorite: +20% dmg while >=5 enemies within 5 u |
| equites | cavalry | 190 | 130 | .22 | 3.5 (x2.4) | 18/1.4/2.4 pierce | - | 50/.2/.3 | 2.8 r .8 | tags cavalry,spear; flank |
| ballista | siege | 260 | 120 | .20 | 1.2 | - | bolt 60/4.5/55 ap .6 pierceN 3 | - | 2.5 r .9 | crew of 2 (visual); tags siege; targets clusters |
| senator | support | 140 | 50 | 0 | 2.5 | - | coin 3/2.0/10 | - | .9 | cc_field sleep (r 9, 4 s channel, 16 s cd, sleepers take x1.5 dmg); bribe (5% per coin: enemy switches team for 6 s) |

### Egyptians
| id | role | cost | hp | arm | spd | melee | ranged | shield | mass | abilities |
|---|---|---|---|---|---|---|---|---|---|---|
| medjay | melee | 85 | 100 | .15 | 3.0 | 13/1.2/2.0 pierce | - | 55/.35/.4 | 1.0 | tags spear |
| nubian_archer | ranged | 95 | 60 | 0 | 2.8 | 5/1.0/1.0 | arrow 12/1.5/36 spread .04 | - | .9 | tags archer; fire arrows (every 6th shot ignites, `burn`) |
| khopesh_warrior | melee | 100 | 105 | .20 | 3.0 | 16/1.0/1.6 slash | - | 50/.3/.3 | 1.0 | khopesh hook: 15% on hit pulls shield (target loses block 3 s) |
| chariot_archer | cavalry | 240 | 140 | .15 | 3.6 (x2.2) | ram 20/1.0/1.4 blunt (on contact) | arrow 10/1.1/30 spread .06 (fires while moving) | - | 3.5 r .9 | trample passive (small); tags cavalry,archer |
| mummy | melee | 140 | 180 | .10 | 1.9 | 12/1.4/1.5 blunt | - | - | 1.4 | aura curse (r 5: enemies -20% speed); fearless,undead,fire_weak (x2) |
| anubis_guard | melee | 230 | 170 | .40 | 2.9 | 20/1.1/2.2 pierce | - | 70/.5/.5 | 1.3 scale 1.15 | execute (every 10 s kill target <20% hp in melee); tags elite,fearless |
| priest_of_ra | support | 150 | 60 | 0 | 2.6 | - | sunbeam 8/1.2/14 magic | - | .9 | heal_pulse (4 allies in 8 u +25 hp / 6 s) ; ai support |
| pharaoh | hero | 420 | 300 | .30 | 2.6 | 18/1.2/1.6 blunt | scepter blast 28/2.5/16 magic aoe 3 | 60/.4/.4 | 1.4 | dot_cloud locusts (r 7, 6 s, 8 dps, 25 s cd); aura great_king (small); tags officer,elite |

### Persians
| id | role | cost | hp | arm | spd | melee | ranged | shield | mass | abilities |
|---|---|---|---|---|---|---|---|---|---|---|
| immortal | melee | 120 | 105 | .22 | 2.8 | 12/1.15/2.1 pierce | - | 55/.35/.45 | 1.0 | revive (first death: rises at 40% hp after 3 s, once); tags spear |
| sparabara | ranged | 105 | 70 | .15 | 2.5 | 7/1.1/1.4 | arrow 10/1.7/28 | 90/.65/.80 | 1.0 | stance:shield_wall (stationary: proj block .90) |
| cataphract | cavalry | 310 | 230 | .60 | 3.0 (x2.2) | lance 26/1.8/2.7 pierce | - | 60/.3/.4 | 4.0 r .85 | tags cavalry,lance; heavy |
| camel_rider | cavalry | 170 | 120 | .15 | 3.3 (x2.2) | 14/1.3/2.4 pierce | - | - | 2.6 | cc_field panic_cav (cone r 6: enemy cavalry -35% speed, 20% bolt away) passive aura |
| xerxes | hero | 400 | 280 | .25 | 2.6 | 20/1.0/1.7 slash | - | 60/.4/.4 | 1.3 | throne (stationary 4 s -> a throne prop spawns, sits: allies +20% dmg while seated; if attacked: stands and shouts "Retreat!" cowering 2 s); aura great_king; tags officer |

### Carthaginians
| id | role | cost | hp | arm | spd | melee | ranged | shield | mass | abilities |
|---|---|---|---|---|---|---|---|---|---|---|
| war_elephant | monster | 650 | 900 | .35 | 3.4 (x1.6) | gore 40/2.0/3.2 pierce kb 8 | howdah archers 2x arrow 9/1.4/28 | - | 12 r 1.5 | trample passive; cc_field scare (trumpet r 10, 15 s cd: -morale); panics at 3 fire hits (flees 6 s); tags large,boss |
| numidian | cavalry | 140 | 75 | .05 | 4.0 (x1.9) | 8/1.0/1.4 | javelin 12/1.6/16 | - | 2.4 | skirmish kite; tags cavalry |
| catapult | siege | 300 | 140 | .15 | 1.0 | - | boulder 70/6.0/70 blunt aoe 4 min 15 | - | 3.0 r 1.1 | crater; crew of 3 (visual); misfire gag: 4% launches a crew member (dmg 5 aoe 1.5, `catapult_misfire` announcer line) |
| hannibal | hero | 360 | 250 | .30 | 3.5 (x2.3) | 24/1.2/2.4 pierce | - | 60/.3/.4 | 3.0 r .8 | mounted hero; aura pincer (r 14: allies +15% dmg while target flanked); tags officer,elite,cavalry |

### Barbarians
| id | role | cost | hp | arm | spd | melee | ranged | shield | mass | abilities |
|---|---|---|---|---|---|---|---|---|---|---|
| berserker | melee | 120 | 120 | 0 | 3.4 | 22/0.9/1.8 slash | - | - | 1.0 | rage (<50% hp: +50% dmg, +30% speed, fearless); ai charge |
| axe_thrower | ranged | 105 | 80 | .10 | 3.0 | 12/1.0/1.4 slash | francisca 20/2.4/13 slash | - | 1.0 | - |
| druid | support | 180 | 70 | 0 | 2.6 | - | thunderbolt 22/5.0/22 magic chain 3 | - | .9 | chain_lightning (above), heal 15 on ally when no enemy in range |
| warhound | beast | 55 | 55 | 0 | 4.2 (x1.55 = 6.5) | bite 9/0.7/1.0 pierce | - | - | .6 r .35 | pack_bonus (+8% dmg per other hound within 5 u, max +40%); tags animal |
| chieftain | hero | 340 | 280 | .25 | 3.0 | club 30/1.4/2.0 blunt kb 7 | - | - | 1.5 scale 1.2 | war_horn (once, 8 s: allies in 14 u +20% speed +20% dmg); tags officer,elite |

### Mythic
| id | role | cost | hp | arm | spd | melee | ranged | shield | mass | abilities |
|---|---|---|---|---|---|---|---|---|---|---|
| minotaur | monster | 480 | 520 | .25 | 3.2 | greataxe 38/1.7/2.8 slash | - | - | 6 r .8 scale 1.7 | dash bull_charge (12 u, dmg 30 + 1 s stun to everything in path, 10 s cd); tags large |
| cyclops | monster | 620 | 700 | .20 | 2.4 | club 45/2.2/3.5 blunt kb 8 | boulder 55/7.0/28 aoe 2.5 blunt | - | 10 r 1.1 scale 2.2 | boulder_misaim: 25% of throws land 4-9 u off target (announcer: poor depth perception); tags large,boss |
| medusa | monster | 280 | 130 | 0 | 2.8 | snakes 10/1.0/1.6 pierce poison 3 dps x3 s | - | - | 1.0 | cc_field stone (cone 40deg, r 14, 4 s, 9 s cd): stoned units freeze solid grey, take x2 from blunt, shatter into debris if killed |
| centaur_archer | ranged | 230 | 125 | .10 | 3.9 (x1.7) | 10/1.2/1.8 | arrow 14/1.4/38 spread .035 | - | 2.6 r .7 | kite; tags archer,cavalry |
| trojan_horse | siege | 450 | 400 | .30 | 1.4 | ram 30/1.5/2.5 blunt | - | - | 8 r 1.4 | summon_on_death (or on reaching enemy line / 25 s after contact): reveal spawns 6 hoplites; tags large,siege; wood: fire_weak x1.6 |
| sacred_chicken | swarm | 25 | 25 | 0 | 4.6 | peck 4/0.3/0.8 pierce | - | - | .3 r .25 | tantrum (when damaged 30%: 5 s x3 dmg, x1.5 speed); cluck taunt (enemies within 5 u target it for 2 s, 12 s cd); tags animal |
| battle_goat | beast | 45 | 70 | .05 | 4.0 (x1.4) | headbutt 12/1.5/1.2 blunt kb 12 | - | - | 1.2 r .4 | dash goat_charge (8 u, dmg x2); tags animal; VIP in "Protect the Goat" missions |

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
- hoplite: Corinthian helm with red horsehair crest, big round bronze hoplon with lambda, linen chiton, bronze greaves, long dory. Team-tint: crest + chiton hem + shield rim.
- spartan: crimson cape (tinted), Corinthian helm with transverse crest, bare muscular chest, spear + hoplon, short beard; THIS IS SPARTA pose in `kick`.
- peltast: Thracian cap (fox pelt), wicker pelte buckler, bundle of javelins on back, patterned cloak.
- cretan_archer: leather cap, quiver, composite bow, tunic with team sash.
- companion_cavalry: Boeotian helm with white plume, linen cuirass, xyston lance, white horse with team saddle cloth.
- philosopher: bald, huge white beard, himation robe over one shoulder, scroll in hand, olive wreath; expressive mouth voxels for bubbles.
- strategos: bronze muscle cuirass, tall crest, red cloak, baton, banner back-pole with team flag.
- legionary: Imperial Gallic helm, red scutum with winged thunderbolt, lorica segmentata (segment lines), gladius, caligae.
- pilum_thrower: same kit lighter, helmet without cheek flaps, 2 pilum, small shield.
- centurion: transverse crest (red), silver phalerae discs on chest, vine staff (vitis) as weapon, greaves.
- gladiator: manica arm guard on one arm, bare chest, subligaculum, trident + net on hip, murmillo-style fish crest helm variant.
- equites: Montefortino helm, mail shirt, round parma shield, spear, chestnut horse.
- ballista: wooden frame with torsion springs, bolt loaded, 2 tiny crew voxel figures animate cranking.
- senator: white toga with purple stripe, laurel crown, receding hair, bag of coins; waddles.
- medjay: linen kilt, bare chest, short wig, spear, small hide shield (blue).
- nubian_archer: dark skin, ostrich-feather headband, leopard-skin sash, tall bow.
- khopesh_warrior: nemes-lite headcloth (stripes), khopesh sickle sword, gold collar broad, kilt.
- chariot_archer: 2-wheeled chariot with two horses (team-tinted feather plumes), archer + driver.
- mummy: bandage wraps (off-white, loose strands), glowing green-gold eyes (GLOW), shuffling stance.
- anubis_guard: jackal head (black), golden collar, tall khopesh-spear, kilt, scale 1.15.
- priest_of_ra: shaved head, sun-disc staff (GLOW disc), white robe with gold trim, leopard pelt.
- pharaoh: double crown (Pschent) white/red, false beard, crook & flail, gold collar, throne cape.
- immortal: wicker shield, scale armour (pattern), tiara/fez cap (Persian hat), spear with pomegranate butt (gold sphere), white-blue colours.
- sparabara: tall wicker rectangular shield (pavise) carried by bearer, bow behind it, cap.
- cataphract: full barded horse (scale cloth), conical helm with mail veil, kontos long lance.
- camel_rider: camel with swaying gait, turban, curved scimitar belt, spear.
- xerxes: tall tiara, curled beard, purple-gold robe, scimitar; throne prop (gold, tall).
- war_elephant: huge grey elephant, red-blue tasseled blanket, howdah (wood tower) with 2 archers, tusk bands, trunk animation.
- numidian: unarmoured rider, no saddle, bare-headed w/ braids, javelins, small horse.
- catapult: onager-style arm with sling, wheeled frame, rope; arm rotates on fire, 3 crew figures.
- hannibal: eyepatch, bronze helm w/ crest, red cloak, rides black horse, spear.
- berserker: wolf-pelt hood, bare torso with blue woad paint swirls, two-handed axe, wild hair.
- axe_thrower: horned helm (small horns), braided beard, belt of throwing axes, fur trim.
- druid: hooded green robe, golden sickle, staff with mistletoe (GLOW), long white beard.
- warhound: grey-brown mastiff, spiked collar, drooling (white voxel), wagging tail.
- chieftain: giant horned helm, bearskin cloak, massive club, huge mustache, horn on belt.
- minotaur: bull head with horns, brass nose ring, muscular body brown fur, loincloth, double-bit greataxe.
- cyclops: single huge eye, tusks, tree-trunk club, one-shoulder tunic, scale 2.2.
- medusa: green skin, snake hair (animated sway), golden bow/none, gorgon eyes (GLOW green).
- centaur_archer: horse body (quad1) + human torso/head/arms, bow, chestnut coat.
- trojan_horse: huge wooden horse on wheels, planks with visible seams, hatch in belly, rope.
- sacred_chicken: white chicken, red comb, tiny golden halo (GLOW).
- battle_goat: grey goat with huge curled horns, tiny helmet, beard.
