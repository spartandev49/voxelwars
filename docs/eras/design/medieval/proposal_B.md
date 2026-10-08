# Medieval Era: proposal B (systems and learning curve first)

Role: independent creative director, Medieval. Angle B: tactics first. Counters that matter and can be taught, the mechanic ladder across nine missions, army-composition puzzles, difficulty curve and replay value; humour carried by briefings, results and the three commentators.
Inputs read: e.md, plan.md v3.1 (s1 scope, s4 modules, s5 rigs, s7 world, s8 MS schema and curve rules, s10 audio, s11 humour, s13 never-cut), traceability, maps 02/03/05/06/07, and the Ancient exemplars (stats, arenas, props, campaign, campaign_text, units_text, announcer, ui_text, puzzles, survival, wave_names, comedy_report, spec/humor).
Conventions: ids lower_snake; `med_` prefix on props, arenas, missions, puzzles, god powers, set-pieces, cues, mutators, achievements, parts; unit ids carry no prefix and are chosen to be era-unique (collision note in s12). Currency: **turnips** (`t`; the realm runs on the Turnip Standard, see the Overbury emblem). Every number is design intent for BALANCE to measure; none was measured.
Module budget: everything below lands by E-FREEZE(medieval) = modules #1..#13 (M0 M1 M3 M2 M2b M10 M6a M7 M12 M14 M13 M15 M17e). Deliberately unused: vehicles (M8), cover and LOS (M9), mines (M11), regenerating shields (M4), cloak (M5), EMP (M6b), hitscan, blink, hover. Medieval is the cheap era to freeze, and that is a design choice.

## 0. The systems spine (the part this proposal argues for)

**Thesis.** Medieval is the "Break the Line" game. Ancient asks "which formation holds?"; Medieval asks "whose cohesion goes first?". Units are heavy and slow, so fights are not decided by attrition but by a **break**: a charge lands, a banner falls, a block routs. Three readable layers, one decision each: **Shape** (brace, pavise, hold: where do I stand), **Weight** (armour tiers against armour-piercing and dots: what do I bring) and **Colours** (banners and morale: what do I protect and what do I snipe). Every one of the 34 units changes a decision on at least one layer.

**0.1 The ring and its modifiers (designed direction, written BEFORE measuring; ER7: asserted rows need >= 200 battles, Wilson 95% lower bound >= 55%, point >= 65%; every row has a mechanic-off control).**
The core is a four-cycle: **plate foot > pikes > cavalry > crossbows > plate foot**. Everything else modifies it.

| # | A beats B | deciding mechanic | mechanic-off control |
|---|---|---|---|
| R1 | held, braced pikeman block > jousting_knight, lord_marshal, black_destrier, crag_boar, pony_raider (frontal) | brace x2.4 (tag `pike`), Hold order | brace off: cavalry wins >= 60% |
| R2 | jousting_knight > longbowman, crossbowman, trebuchet and springald crews, pitchfork_mob | charge x(1+c), kb, cavalry prefers ranged/siege +40 | charge off: parity 45-55% |
| R3 | crossbowman (ap .55) > man_at_arms, jousting_knight at range | `eff = armor*(1-ap)`: a bolt does ~2x an arrow to plate | ap off: man_at_arms wins >= 60% |
| R4 | man_at_arms > pikeman in contact | armour .58 vs pike ap 0; brace only answers charge tags | structural (no control) |
| R5 | anything that closes inside the reload window > crossbowman, springald | `mag 1 / reload 2.6 s (3.6 springald)` freezes the shooter, no block | reload off: crossbowman wins by +15 points |
| R6 | longbowman > squire, pitchfork_mob, billhook_levy, herald (unarmoured); poor vs mail, useless vs plate | volley 2, range 46, arrow ap 0 | fog/rain: -10 points (spread) |
| R7 | poison and gas (bog_dartsman, beaked_apothecary) > plate that stands still in a scrum | dots bypass armour (`dotDamage`), stack | dot off: plate wins >= 65% |
| R8 | fire (fen_firebow, oil_cask, dragon breath) > wooden engines, gates, thatch, plate | fire ap 1, burn, `igniteAt`; rain douses | rain: fire x0.4 |
| R9 | billhook_levy, flail_cellarer > shielded units (squire, pavise_bearer) | `hook` disarm 3 s; `breaks_shield` 4 s | ability off: pavise wins >= 65% |
| R10 | killing a banner > breaking an army | banner aura + fall shock (-35 morale r12) + officer death shock x1.5 | banner off: block-vs-block parity |
| R11 | pony_raider, reed_cutter (flank) > infirmarian, crossbowman, longbowman, springald crews | backstab x1.35, `preferTargets` ranged/support, speed 3.4-4.1 | flank AI off: -12 points |
| R12 | trebuchet, lady_counterweight > blocks, walls, camps; blind inside minRange 22/28 | arc high, aoe 4.5/6, craters | minRange off: trebuchet beats cavalry |
| R13 | springald, crossbowman, longbowman > wyvern, hollow_dragon; dragon > everything else | air layer, `ranged.air`, breath cone dot (shields do not stop dots) | AA off: dragon wins >= 90%; 6 springalds: dragon loses >= 80% |
| R14 | sapper, battering_ram > gates and walls; die to anything | structDmg x4 / x3.5 plus mass>=6 melee x2 | structDmg off: breach time x3 |
| R15 | infirmarian turns a block into a slower block; dies to a flank | `heal_pulse` organic only, kill-first targeting | healer off: -8 points |

Claimed non-counters (must contain 50%): squire vs billhook_levy at equal cost; longbowman vs crossbowman vs mail-only enemies at equal cost; pikeman vs halberdier in contact.

**0.2 The ladder: teach in k, test in k+1.** One new mechanic per mission; each star 3 tests the mechanic from the mission before (M1's star 3 is generic thrift because nothing precedes it). "Blind foil" is the stripped bot that must lose >= 70% (ER8).

| M | teaches | first-sight beat (trigger: who: line) | blind foil | star 3 tests (taught in) | requiresModules |
|---|---|---|---|---|---|
| 1 | Brace + Hold | placement_start: Plato "Points toward the horses, please." / first_contact: Cassandra | pikes in a blob, advance order | thrift (none) | M0 M2b |
| 2 | Colours: aura, fall shock, rout | battle_start: Brutus "Kill the BANNER." / banner_fall: Cassandra | hits nearest, ignores banners | chargesBroken (M1) | M13 banner |
| 3 | Armour and bolts: ap, reload window | first plate bounce "clink": Plato / first reload: Cassandra "Nine seconds." | longbow-only army (arrows bounce) | bannersDown (M2) | M2 mag/reload, M14 capture |
| 4 | Charge and unhorse | first knight "killed" rises as a man_at_arms: Brutus | charges the pavise front | hitsDuringReload (M3) | M13 bailout, M14 destroy-by-tag |
| 5 | Gates and ram: ownership, structDmg, mantlet | hover on gate shows hp bar and "owner: defenders" | spreads fire at the wall, ignores the gate | unhorsed (M4) | M12 gates, M14 |
| 6 | Healers and poison | first heal numbers: Plato / first dot tick: Cassandra | no infirmarian; plate dies to dots | propStanding abbey gate (M5) | M6a, M14 defend_core |
| 7 | Fire and oil | thatch ignites: Plato / first cask: Brutus "BOOM" | fights on thatch | healedHp (M6) | M12 explosive, M14 escort |
| 8 | Arc fire: trebuchet, minRange, craters | first crater; HUD minRange ring on selection | trebuchets at the front line (blind) | burnKills siege (M7) | M10, M14 strike |
| 9 | Air: dragon, wyvern, AA | first wyvern: Cassandra "Bring bolts." | no AA in the army | shellsOnTarget dragon (M8) | M7, M14 setpiece |

**0.3 Difficulty curve.** Reference army (authored, 85-100% of budget) wins: Act I 85-95%, Act II 70-85%, Act III 60-75% of seeds. Autofill bot: <= 60% in Act I, <= 40% in Acts II-III. Expected attempts (median-human proxy, star 1 / star 3): 1.2/2.5, 1.5/3, 1.8/3.5, 1.5/3, 2/4, 2/4, 2.2/4, 2.5/4.5, 3/5. Mission length target 100-130 s in Act I rising to 150-210 s; no mission may have dead air > 8 s.
**0.4 Replay value.** (1) Every star 3 re-plays a mission with a different mechanic as the score. (2) Two era mutators bend the ring (Mud Season weakens cavalry and fire; Pennant Parade turns every unit into a tiny banner). (3) Reference armies are one of three valid solutions; Quick and Daily draw a "doctrine" per faction. (4) Six puzzles are composition puzzles with stored solutions. (5) Survival cycles five bosses that each demand a different composition (cavalry boss: pikes; siege boss: flankers; bell cart: fire; troll: bolts and poison; dragon: AA).

## 1. Conceit, tempo, camera, chrome, sound, signature

**Conceit (one sentence).** The Grand Pageant of Realms, a four-hundred-year-old tournament-and-procession, keeps escalating into sieges because nobody will amend the programme, and the three commentators, filed under "M for Middle" by Zeus's intern, must call it in tabards while a dragon nobody admits booking waits in the finale.
**Tempo.** Heavy and staged: approach 14-20 s, the collision decides the cluster in 3-5 s, 40-60 s of scrum, then a break (rout) and a chase. Speeds 1.3-3.3 u/s for foot (0.85x Ancient), knights 3.3-4.0 charging, hp x1.35, damage per hit x1.2, cd x1.15. Zone gap at deploy: small 20 u, medium 32 u, large 40 u (about 9 / 15 / 18 s to contact at 2.2 u/s).
**ER27 fingerprint targets (relative to the Ancient value measured in P0, stress case Medieval vs Ancient):** median engagement distance <= 0.8x; ranged damage share <= 20%; kill rate <= 0.85x (armour); first contact 14-20 s; speed distribution bimodal (foot 2.0-2.7, knight/boar/pony 3.3-4.2); vertical spread 0-9 u (walls, dragon) against Ancient 0-2. If the vector is closer than the threshold, the feel sheet is rewritten, not the number.
**Camera.** Lower pitch (0.55 vs 0.65 rad), distance +12% to show shapes. **Banner Cam** (key B, Quick unlock in M2): follows the nearest friendly standard. Set-piece shots hold 4-6 s at 0.5x sim, crane and dolly (never whip) except the fire gag. Reduce Motion = cut.
**UI chrome vocabulary.** Parchment panels with deckled edges and rope-and-stud borders; wax-seal primary buttons; heraldic shield chips (pointed base) for factions; ribbon act headers; **stamp** overlays APPROVED / DENIED / PENDING on star results; illuminated initial in briefings, marginalia doodles (a snail, always); campaign map is an embroidered tapestry (gold thread = completed legs, pins are wax seals); HUD frame timber and iron with the **Colours strip**: one pennant per live banner with a resolve fill. Difficulty names: Page / Squire / Banneret. Tokens: parchment #e8dcb8, ink #2b2118, wax #9b2d20, gilt #c9a227.
**Sound palette (3 adjectives): clangorous, creaking, ceremonial.**
**Signature mechanic: Colours (banners, resolve, the fall).** A bearer (herald, lord_marshal, village_reeve, bell_warden) raises a standard: friends within its radius hit +8-15% and lose morale at x0.5-0.6; auras of one kind do not stack (strongest wins). If the bearer dies the standard falls: friends within 12 u take a morale shock (-35), and rout starts at the existing threshold. **On-screen tell:** pole 1.6x unit height with team-tinted cloth that ripples fast at high resolve and hangs limp under 40%; a faint ground ring at the aura radius; the Colours strip; on the fall, the pole snaps with a bell clang, a grey pulse sweeps the ring and nearby units play `cower` before they run. This is the sniping target for longbowmen (prefer `officer`), ponies and the player's own heart.
**This era must NEVER feel like:** Ancient with armour decals (no single stance may win everything); arrow spam (arrows are a tax on plate, not a plan); a grim solemn epic (no real order, no pain, confetti and puffs only); a realism sim (the dragon is allowed to be a weather event); a waiting room (first contact <= 20 s, "sieges take too long" is a joke in the text, not in the pacing); a monster zoo (one dragon, earned in M9).

## 2. Six factions

Faction colours drive chips, banners, cloth and accents; team tint stays separate. All pairs go through the CIEDE2000 minimum-distance test against the 7 Ancient pairs. Emblems are invented and go through the signed allow-list; no lions, eagles, crosses, stars, crescents, fleur-de-lis, three-band layouts.

- **Overbury** (host realm) `0x3e9bd6 / 0xf4ead0` (sky azure + cream). Emblem: a gauntlet holding a turnip. Silhouette: tall, striped, plumed, couched lances (vertical lines). Identity: charge, banners, expensive heavy bodies. Win: land the charge on a prepared target and snipe nothing. Weak: a braced block, bolts, a bad bugle. Lore: "Overbury has held a tournament every spring for four hundred years and a war whenever the tournament ran late. Its knights are brave, costly and unable to mount without a herald and a stepladder. The turnip on the flag is a clerical error from the Year of the Long Weekend; no one has had the nerve to correct it."
- **Marchmoor Levies** `0x5b7690 / 0xe8dfc6` (woad slate + undyed wool). Emblem: a haystack flying a very small flag. Silhouette: long poles, flat caps, wide line. Identity: cheap mass, pikes, longbows, rage at half health, the reeve's taxes. Win: hold the shape. Weak: plate, flanks, trebuchets. Lore: "Marchmoor owes forty days of service a summer, no more, in a font the levy can recite and the lord cannot read. Its pikes are longer than the village is wide. Morale is excellent whenever the pie stall is visible from the line."
- **Gullhaven Guilds** `0xc43c7d / 0xc9ced6` (rose-magenta + pewter). Emblem: a gull standing on a ledger. Silhouette: wide hats, doors (pavises), cranks. Identity: bolts, artillery, hired steel, engineers. Win: out-range and out-spend. Weak: anything that closes in the reload window; the guild's own paperwork. Lore: "Gullhaven is a harbour governed by a committee of invoices. It invented the crossbow because arguing had become expensive. Every soldier is under contract, every contract has a clause, and the clause is in a drawer in another city."
- **Bellmead Abbey** `0x95ad2a / 0x4d2a5c` (lime-olive + plum). Emblem: a bell with a mouse inside. Silhouette: hoods, bells, satchels. Identity: sustain, scare, solid middle, bell cart. Win: outlast. Weak: flanks on the healers; fearless units. Lore: "Seventeen bells, one cellar and a rule of silence that only the bells and the cellarer break. The abbey heals anyone who asks, enemies included, and invoices afterwards. It has been besieged eleven times and has never once missed lunch."
- **Fenwarden** `0x39404f / 0xb9d8a8` (peat charcoal + fog green). Emblem: a heron on one leg holding a lantern. Silhouette: conical hats, reed bundles, beaks, glow. Identity: skirmish, poison, fire, ponies. Win: bleed what armour cannot stop. Weak: pikes, rain, bells. Lore: "The fen has been lived in so long that the fen has started living back. Its people fight with lanterns, darts and a patience the rest of the realm files under hostility. The apothecaries sell the cure for what the darts do, and the price list is public."
- **Hollow Crag** `0xe2661f / 0x4a4540` (ember orange + ash). Emblem: a mountain in a small hat. Silhouette: wings, tusks, hoard glow. Identity: monsters, air, a hoard. Win: terror from above. Weak: massed bolts, spacing. Lore: "The Hollow Crag is a mountain, a hoard, a mortgage and several things that fly. The dragon has not left the keep since repossessing it from a duke, who left a forwarding address. Everything in the Crag works for the dragon and nothing in the Crag has been paid."

## 3. The 34-unit roster

Flags: **B** survival boss (5), **S** bespoke silhouette (17; 12 of them non-hum1 rigs). Body types obey "<= 2 units of a faction per body type". Cost classes: S <= 100, M 101-180, L 181-300, XL > 300 (turnips; Ancient hoplite = 100). Stats are intent, numbers for BALANCE to retune.

**3a. Identity**

| id | name | faction | role; tags | rig | silhouette hook | joke | first | flag |
|---|---|---|---|---|---|---|---|---|
| squire | Squire | overbury | melee; shielded | hum1/std | buckler, arming sword, satchel with a visible lunch | Carries the knight's lunch, the knight's spare lance and, lately, the knight's opinions. | M1 (enemy) | |
| man_at_arms | Man-at-Arms | overbury | melee; heavy, plate | hum1/heavy | closed helm, wide pauldrons, flanged mace: the tin-can silhouette | Used to be a knight until the horse resigned. | M2 (enemy) | S |
| jousting_knight | Jousting Knight | overbury | cavalry; heavy, lance | quad1 barded + hum1 rider | 4-voxel lance with pennon couched forward, striped caparison | Seventeen years of training for a sport whose longest event lasts four seconds. | M1 (enemy) | S |
| herald | Herald | overbury | support; officer, banner | hum1/slim | standard pole above head height, bell-sleeved tabard, trumpet | Announces the army's arrival, the enemy's arrival and, if time allows, lunch. | M2 | S |
| lord_marshal | Lord Marshal | overbury | hero; cavalry, officer, general | quad1 warhorse + hum1 rider x1.1 | great swallow-tail standard taller than anyone, hat the size of a hay bale | Commands by standing near the banner and nodding at roughly the right time. | M2 | S |
| black_destrier | The Black Destrier | overbury | monster; cavalry, heavy | quad1 x1.35 + hum1 rider x1.2 | jet barding with forty trophy ribbons streaming behind | Eleven tournaments won; the horse does the work and is not eligible for the trophy. | M5 | B S |
| pikeman | Pikeman | marchmoor | melee; pike, levy | hum1/std | the pole: 2-voxel shaft three heights tall, quilted jerkin | Holds a six-metre stick and a four-second opinion. | M1 | |
| billhook_levy | Billhook | marchmoor | melee; polearm, levy | hum1/slim | crescent blade at shoulder height, straw hat | A farm tool that has been promoted and kept the hay habit. | M1 | |
| longbowman | Longbowman | marchmoor | ranged; archer, levy | hum1/std | bow nearly head high, white fletching quiver | Draws a bow so heavy his left shoulder has its own postcode. | M1 | |
| pitchfork_mob | Pitchfork Mob | marchmoor | swarm; levy | hum1/slim x0.88, no helm | kettle-pot hat, pitchfork, lantern | Arrives before the plan, leaves after the plan, and the plan was not consulted. | M1 | |
| battering_ram | Old Reliable | marchmoor | siege; machine, wooden | ram1 + 3 lite crew | hide-gabled roof over a log carved with a smiling sheep | A log with a name and a wheel bolted on for morale. | M5 | S |
| village_reeve | Village Reeve | marchmoor | hero; officer, general, levy | hum1/heavy | parish banner (haystack), ledger under arm, fur hat | Collects taxes mid-battle, legally, since he wrote the law on the side of a barrel. | M2 | |
| crossbowman | Crossbowman | gullhaven | ranged; xbow, mag | hum1/std (new `xbow` style) | stubby crossbow, crank and cord on the hip, kettle hat | Fires once, then stands nine seconds like a man looking for his keys. | M3 | |
| pavise_bearer | Pavise Bearer | gullhaven | melee; shielded | hum1/heavy | door-sized painted shield, only legs and a hat show | Carries a door and has strong views on draughts. | M3 | S |
| halberdier | Halberdier | gullhaven | melee; polearm, mercenary | hum1/std | axe-spike-hook head, slashed hose, feathered cap | Hired for forty days; has counted forty-one. | M3 | |
| sapper | Sapper | gullhaven | melee; engineer | hum1/slim | mattock and a rolled mantlet on the back | Approaches the wall the way a cat approaches a bath. | M4 | |
| springald | Springald | gullhaven | siege; machine, AA | ballista1 rig, upright twin-arm builder + 2 crew | tall frame on a swivel, bolt pointing at the sky | A very large crossbow that has to be asked nicely to look up. | M8 | S |
| trebuchet | Trebuchet | gullhaven | siege; machine | trebuchet1 + 3 crew | A-frame, long arm, boxy counterweight, sling | A counterweight, a sling and an absolute belief in leverage. | M4 (inert) | S |
| lady_counterweight | Lady Counterweight | gullhaven | siege; machine | trebuchet1 x1.6 + 2 crew | three-storey frame, counterweight painted as a smug hat | Named by the guild, insured by a rival guild, sued by both. | M8 | B S |
| infirmarian | Infirmarian | bellmead | support; organic healer | hum1/slim | pillow-sized herb satchel, wooden spoon, plum hood | Heals everyone in range, enemies included, then asks them to sign. | M6 | |
| bell_ringer | Bell Ringer | bellmead | support; scare | hum1/std | hand-bell held overhead, 6x6-voxel bell reads at 40 px | Rings for emergencies, lunch and "what was that?" in rising order of volume. | M6 | |
| flail_cellarer | Cellarer | bellmead | melee; shield-breaker | hum1/heavy | chained flail, barrel-lid shield, keg and clipboard | Guards the cellar with a flail and a clipboard; the clipboard has hit more people. | M6 | |
| bell_warden | Bell Warden | bellmead | hero; officer, general | hum1/heavy x1.15 | bell-topped staff, bronze bell pauldrons, rope sash | Has rung seventeen bells so long that they ring back. | M6 | |
| belfry_cart | Belfry Cart | bellmead | siege; machine, wooden | ram1 variant with timber belfry and a swinging bronze bell | the log swing is the clapper | A bell on wheels with a destination and a low opinion of quiet. | M6 (reinforcement) | B S |
| bog_dartsman | Bog Dartsman | fenwarden | ranged; skirmisher, poison | hum1/slim | tall reed hat, green wraps, dart quiver | Poisons the dart, then apologises to the dart. | M6 (enemy) | |
| beaked_apothecary | Beaked Apothecary | fenwarden | support; poison | hum1/slim | 3x3-voxel beak mask that survives the far mesh, jar satchel | Sells the cure for exactly what he just did to you. | M6 (enemy) | S |
| fen_firebow | Fen Firebow | fenwarden | ranged; fire | hum1/std | rag-tipped arrow with a glow-voxel flame, soot face | Arrow, rag, flame; the safety briefing was skipped. | M7 (enemy) | |
| reed_cutter | Reed Cutter | fenwarden | melee; skirmisher | hum1/std | sickle and a reed bundle, broad conical hat | Cuts reeds for a living and everything else at weekends. | M6 (enemy) | |
| lantern_warden | Lantern Warden | fenwarden | hero; officer, general | hum1/heavy | tall pole with a glowing marsh lantern, hooked staff | Leads travellers across the fen for a fee, to wherever the fee points. | M6 (enemy) | S |
| pony_raider | Pony Raider | fenwarden | cavalry; skirmisher | quad1 pony + hum1 rider lite | shaggy small pony, javelin bundle, lantern hat | Fast, small and never where your aim was an hour ago. | M6 (enemy) | S |
| hollow_dragon | Hollow Dragon "Cinderbelly" | crag | monster; air, large | dragon1 (18-20 parts) | wings >= 2 voxels thick, belly glow, coins stuck to the claws | Filed by the realm's insurers under "Weather Event (Severe)". | M9 | B S |
| wyvern | Wyvern | crag | monster; air, beast | dragon1 wyvern (2 legs) | wings as forelimbs, barbed tail | A dragon's cousin on a smaller mortgage. | M9 | S |
| bridge_troll | Toll Troll | crag | monster; large | hum1 x2.0 + bespoke moss and boulder parts | club made from a toll gate with a bell, coin purse on a chain | Collects tolls from both banks and issues receipts to neither. | M3 | B |
| crag_boar | Crag Boar | crag | beast; charge | quad1 boar species | slab shoulders, curved tusks, bristle ridge | Charges hedges, knights and the concept of Tuesday. | M9 | S |

**3b. Mechanics (weapon, ability, stat intent, counters, weak to)**

| id | weapon / projectile | ability (existing id + params; new values only inside existing ids) | stat intent | counters | weak to |
|---|---|---|---|---|---|
| squire | arming sword slash 11/1.1 s, buckler arc 50 block .30 | none | hp 150, spd 2.5, armor .30, S 95 | levy, archers in contact | plate, billhooks, charge |
| man_at_arms | flanged mace blunt 22/1.5 s ap .15, reach 2.0 | none (tag heavy) | hp 290, spd 2.2, armor .58, L 190 | pikes in contact, longbows, squires | bolts, fire, poison, magic, flank |
| jousting_knight | lance pierce 34/1.9 s kb 5, run x2.4 | `summon_on_death` bailout: spawn man_at_arms x1, hpFrac .5 | hp 400, spd 3.3, armor .55, L 300 | ranged, crews, levy | braced pikes, stakes, bolts, poison |
| herald | dagger 5 | `aura` effect banner r9 (dmg +10%, lossMul .6); `war_horn` "Fanfare" (6 s, r12, x1.15, cd 45) | hp 120, spd 2.6, armor .15, M 140 | force multiplier | everything; the first thing longbows prefer |
| lord_marshal | lance 30/1.6 s + sword | `aura` banner r14 (dmg +15%, lossMul .5); `dash` lance_run d10 dmg 28 cd 12 | hp 520, spd 3.1, armor .60, XL 420 | stirs a charge, rallies | brace, bolts, being the general |
| black_destrier | lance pierce 60/2.1 s kb 9 | `dash` lance_run d16 dmg 60 stun .8 cd 12 | hp 1250, spd 3.4, armor .62, mass 7, boss | everything frontal | brace x2.4, poison, fire, bolts |
| pikeman | pike pierce 9/1.5 s reach 3.1 | none; `ai hold`, brace from tag `pike` | hp 130, spd 2.1, armor .20, S 85 | cavalry and beasts, frontal | plate, archers, flank, trebuchet, dragon |
| billhook_levy | bill slash 11/1.2 s ap .35 reach 2.2 | `hook` chance .25, 3 s (shield disarm) | hp 120, spd 2.7, armor .10, S 70 | shielded, mail | cavalry, archers |
| longbowman | arrow 12/1.9 s range 46 volley 2 ap 0, `air` | none; `preferTargets` officer | hp 105, spd 2.6, armor 0, M 105 | unarmoured, banners, air | plate, cavalry, fog, rain |
| pitchfork_mob | fork pierce 5/.9 s | `rage` hpFrac .5, dmg x1.3, spd x1.15 | hp 55, spd 3.2, armor 0, S 32 | crews, ranged | armour, aoe |
| battering_ram | ram blunt 40/2.4 s kb 8, structDmg x3.5 | none | hp 360, spd 1.5, armor .30, mass 8, L 220 | gates, walls, towers | fire, cavalry, anything fast |
| village_reeve | sword slash 14/1.1 s | `aura` banner r10 (dmg +8%, lossMul .5 for tag `levy`); `bribe` chance .06 / 6 s ("tax") | hp 300, spd 2.7, armor .30, XL 250 | steadies levies | the snipe; flank |
| crossbowman | bolt pierce 36/3.2 s range 32 ap .55, `mag 1 reload 2.6`, `air` | none; `preferTargets` heavy | hp 115, spd 2.5, armor .15, M 120 | plate, knights, air | reload window, cavalry, flank |
| pavise_bearer | spear 6/1.4 s; shield arc 100 block .80 proj .92 | `stance` kind pavise (proj +.25, spd x.8 while planted) | hp 210, spd 1.9, armor .35, M 125 | arrows, bolts, javelins | flail, billhook, fire, trebuchet |
| halberdier | halberd slash 17/1.5 s ap .35 reach 2.4 | `execute` threshold .2 cd 10 ("contract termination") | hp 190, spd 2.6, armor .38, M 135 | mail and plate infantry | cavalry charge, volume |
| sapper | mattock blunt 7/1.2 s, structDmg x4 | none | hp 110, spd 2.8, armor .10, M 110 | gates, walls, towers | everything |
| springald | bolt 54/4.2 s range 52 ap .6 pierceN 3, `mag 1 reload 3.6`, `air` | none; `preferTargets` air, heavy | hp 170, spd 1.3, armor .20, L 240 | dragon, wyvern, knight lines | cavalry, counter-battery, fire |
| trebuchet | boulder blunt 80/9 s range 90 minRange 22 aoe 4.5 `arc high` crater, structDmg x1.5, groundOnly | `misfire` chance .03 ("counterweight substituted") | hp 260, spd .9, armor .15, XL 380 | blocks, walls, camps | cavalry, anything inside 22 u, fire |
| lady_counterweight | boulder 140/11 s range 115 minRange 28 aoe 6, every 4th shot volley 3 | none | hp 1500, spd .7, armor .40, boss | everything static | flank riders, fire |
| infirmarian | none (melee 3) | `heal_pulse` r7 +28 x5 cd 5, organic only | hp 110, spd 2.5, armor 0, M 140 | sustain | flank, kill-first |
| bell_ringer | bell bash 4 | `cc_field` scare r8 cd 16; `aura` rally r8 | hp 130, spd 2.4, armor .10, M 170 | massed infantry | fearless units, flank |
| flail_cellarer | flail blunt 16/1.3 s ap .1 | `breaks_shield` 4 s | hp 210, spd 2.4, armor .36, M 130 | shield units | ranged |
| bell_warden | staff blunt 18/1.1 s | `aura` rally r10; `heal_pulse` x3 +16; `cc_field` scare r6 cd 24 ("Great Toll") | hp 480, spd 2.7, armor .45, XL 380 | steadies the block | flank, bolts |
| belfry_cart | ram blunt 38/2.0 s kb 11, structDmg x3 | `cc_field` scare r10 cd 14 ("Toll") | hp 1400, spd 1.5, armor .35, mass 9, boss | infantry blocks | fire (wood), pony flank |
| bog_dartsman | dart 6/1.6 s range 20 whileMoving, `poison.proj` 3.5 dps / 5 s | none; skirmish | hp 100, spd 3.3, armor .05, M 95 | plate, queues for healers | cavalry |
| beaked_apothecary | none | `dot_cloud` gas r5, 6 s, 5 dps, cd 20 | hp 105, spd 2.5, armor 0, M 170 | standing blocks, plate | flank, long range |
| fen_firebow | fire arrow 8/2.2 s range 34, type fire (ap 1), burn, ignites props | none | hp 95, spd 2.6, armor 0, M 115 | engines, gates, thatch, plate | cavalry, rain |
| reed_cutter | sickle slash 11/.9 s | backstab x1.35; `ai flank` | hp 130, spd 3.4, armor .05, S 80 | archers, support, crews | pikes, shields |
| lantern_warden | hooked staff pierce 20/1.2 s | `hook` chance .2; `aura` curse r6 | hp 430, spd 3.0, armor .30, XL 330 | debuffs a block | kill-first, bells |
| pony_raider | javelin 15/1.7 s range 17; spear 9 | skirmish; hit and run | hp 190, spd 4.1, armor .08, M 130 | crews, archers | pikes, billhooks |
| hollow_dragon | bite pierce 60/1.8 s reach 4 | `dot_cloud` fire line r6 4 s 28 dps cd 14; `cc_field` scare r14 cd 20; layer air, lands at < 40% hp or with no AA in 30 u | hp 2200, spd 4.0, armor .50, boss | all ground without AA | springalds, volume of bolts, spacing |
| wyvern | bite 22/1.2 s | `poison` 3 dps / 3 s; layer air | hp 240, spd 4.2, armor .15, XL 260 | support, ranged | AA |
| bridge_troll | club blunt 46/2.3 s kb 8, scale 2.0 | `cc_field` confuse r6 cd 14 ("Toll Demand"); tag `fire_weak` (moss) | hp 1700, spd 2.3, mass 10, boss | blocks | fire, bolts, poison, kiting |
| crag_boar | tusk pierce 22/1.3 s kb 7 | charge (role beast) | hp 260, spd 4.0, armor .20, M 140 | levy, archers | brace, pikes |

## 4. Twelve arenas

Sizes: small 128 / medium 192 / large 256 cells. All themes are new env themes `pageant fen abbey castle crag` mapped to music and ambience by the era kit; ids are recipe ids.

| id | name | size | theme / biome | signature features | objectives | set-piece |
|---|---|---|---|---|---|---|
| med_tourney_field | The Tournament Meadow | medium | pageant / grass | two jousting lists with tilt rails, two grandstands (crowd), striped pavilions, a quintain; flat | eliminate, hold | grandstand collapse, wrong cue |
| med_ford_of_errors | Ford of Errors | medium | pageant / mud | 14 u shallow ford (x1.7 cost), deep pools both sides, willows, plank stepping stones | kill_general, capture, escort | banner into water |
| med_toll_bridge | The Toll Bridge | medium | fen / stone | deep river, one 5 u arched bridge (planks and cobble), toll house, two bridgehead forts, a ford 40 u downstream (25 s flank) | capture, hold | troll rises |
| med_thatch_hollow | Thatch Hollow | medium | pageant / dirt | 14 cottages, barn, windmill, well, 4 u lanes and an open green; dry hay everywhere | escort, defend, eliminate | float burns |
| med_wickerwood | Wickerwood | large | fen / moss | dense oaks, two trails, fog .25 default, glade rule (readability) | survive_waves, eliminate | ambush from the fog |
| med_abbey_close | Bellmead Abbey Close | medium | abbey / cobble | walled cloister, bell tower (core) behind, herb garden, gatehouse with oak gate | defend_core, hold | great sniffle, bell toll |
| med_gruntlefield | Castle Gruntlefield | large | castle / stone | curtain wall, 6 wall towers, gatehouse (portcullis + oak gate), deep moat with drawbridge, keep, outer bailey, besieger zone | destroy, eliminate, capture | gate gives notice |
| med_siege_camp | The Besiegers' Camp | medium | castle / mud | tents, wagons, 4 engine pads, palisade, picket lines | destroy (engines), eliminate | late sally |
| med_beacon_heath | Beacon Heath | large | pageant / moss | central beacon hill (+6 u), two ridgelines 40 u apart (engine pads), gorse, rolling | survive_waves, hold_hill, kill_general | lady arrives |
| med_dragon_crag | Dragon Mountain | large | crag / basalt | switchbacks, lava vein with bridges, keep ruin with perch and hoard gate, crag spires | kill_general, survive_waves | dragon wakes |
| med_winter_fair | The Winter Fair (Cancelled) | medium | pageant / snow | ring of stalls, bonfire casks, shallow pond, banners | eliminate, capture, survive_waves | bonfire goes up |
| med_moat_keep | Moat and Mud Keep | small | castle / mud | motte keep, moat, drawbridge, one tower, courtyard | destroy, defend_core, eliminate | drawbridge drops |

## 5. Thirty-eight props

Reuse (`any`, not counted): tree_oak, tree_pine, tree_dead, bush, rock_small, rock_big, log, crate, barrel, bones, reeds, wheat, campfire, torch, fire_pit. `blocks`: F full, N none. `cover`: stops projectiles below h. Radius/height in u before scale.

| id | cat | blocks / cover / r,h | hp | flam | destructible role |
|---|---|---|---|---|---|
| med_curtain_wall | architecture | F / yes / 1.0,5 | 900 | no | breach target; rams, sappers, boulders; chain of segments |
| med_wall_tower | architecture | F / yes / 1.8,10 | 1400 | no | corner anchor; falls to rubble |
| med_gatehouse | architecture | F / yes / 2.6,8 | 2000 | no | hosts the gate pair; team-owned (passable for owner) |
| med_oak_gate | architecture | F / yes / 2.2,4.5 | 700 | yes | `destroy` target; fire-vulnerable; owner passes |
| med_portcullis | architecture | F / no (bolts pass) / 2.2,4.5 | 1100 | no | second gate layer; sappers x4, rams x1.5; fireproof |
| med_drawbridge | architecture | F raised, N lowered / 2.4,3 | 450 | yes | destroying it lays the deck (`editTerrain`): "opens it" |
| med_keep | architecture | F / yes / 6,14 | 3000 | no | core in Quick Keep Hold |
| med_hoarding | architecture | F / yes / 1.2,3 | 380 | yes | timber gallery; spills fire when destroyed |
| med_palisade | architecture | F / yes / 0.6,3 | 240 | yes | cheap field fortification |
| med_stake_row | props | F / no / 0.4,1.2 | 90 | yes | anti-cavalry obstacle, lane control |
| med_mantlet | props | F / yes / 0.8,2 | 170 | yes | portable wall; covers sappers from bolts |
| med_pavilion | props | F / yes / 1.8,3 | 160 | yes | camp and tourney tent; fire spreader |
| med_supply_wagon | props | F / yes / 1.2,2 | 220 | yes | cover; wreck when destroyed |
| med_oil_cask | props | F / no / 0.4,1 | 40 | yes | `explosive` fire aoe 4, dmg 70, fire patch: the trap (M7) |
| med_cauldron | props | N / no / 0,1 | inf | no | hoarding hazard dressing; "oil pending" gag in M5 |
| med_siege_wreck | props | N / no / 0,1.5 | 120 | no | burnt engine decor, scatter |
| med_tilt_rail | props | F / no / 0.3,1.2 | 130 | yes | lane control for horse and man |
| med_grandstand | props | F / yes / 3,4 | 520 | yes | collapses for comedy; crowd seats |
| med_standard_pole | props | N / no / 0.2,6 | 50 | yes | heraldic decor; team-less |
| med_pageant_float | props | F / yes / 2.2,5 | 260 | yes (fast burn) | M7 set-piece, papier-mache dragon |
| med_quintain | props | N / no / 0.4,2.5 | 90 | yes | spinning joust dummy; gag target |
| med_rope_barrier | props | N / no / 0,0.8 | 20 | yes | crowd barrier decor |
| med_cottage | architecture | F / yes / 1.6,3.5 | 280 | yes (thatch) | village body; fire path |
| med_barn | architecture | F / yes / 2.4,4.5 | 450 | yes | hay fire spreader |
| med_haystack | props | F / yes / 0.9,1.8 | 70 | yes (extreme) | fire starter |
| med_market_stall | props | F / no / 0.7,1.8 | 90 | yes | small cover-less obstacle |
| med_windmill | monuments | F / yes / 2.2,9 | 700 | yes | animated sails (spin); landmark |
| med_well | props | F / no / 0.7,1.2 | inf | no | decor, lane dressing |
| med_wattle_fence | props | N / no / 0,1 | 40 | yes | visual lane guide |
| med_hand_cart | props | F / no / 0.6,1 | 60 | yes | small obstacle |
| med_bell_tower | monuments | F / yes / 2.2,11 | 1500 | no | M6 core; bell swings (spin) |
| med_cloister_arch | architecture | N / no / 0,5 | 300 | no | abbey decor |
| med_herb_bed | nature | N / no / 0,0.6 | 30 | yes | colour; gas-cloud dressing |
| med_hoard_pile | monuments | N / no / 0,2 | inf | no | glowing coin hill (glow voxels), scale 0.6-2 |
| med_crag_spire | nature | F / yes / 1.4,9 | inf | no | hard rock, silhouette anchor |
| med_dragon_perch | monuments | F / yes / 2.6,12 | 700 | no | keep roost; destructible forces landing 10 s |
| med_scorch_mark | nature | N / no / 0,0.1 | inf | no | ground char decor spawned by breath |
| med_willow | nature | F / yes / 0.5,6 | 100 | yes | ford tree; readability screen |

## 6. The nine missions

Star 1 always win; **star 2 always `aliveCostFrac(0.5)`**. Closed star-3 helper vocabulary (extends `usedMechanic(id,n)`): `thrift(par)`, `chargesBroken(n)`, `bannersDown(n)`, `hitsDuringReload(n)`, `unhorsed(n)`, `propStanding(type)`, `healedHp(n)`, `burnKills(tag,n)`, `shellsOnTarget(def,n)`. Rewards are real: a usable Workshop part, a Quick unlock, a mutator, a codex page, plus a title chosen on the chooser card. Every mission has `setpiece{id}` (script event + 3-6 s shot + announcer slot `campaign_<id>` sub `setpiece` + stinger + sfx).

**Act I: The Pageant Season (the Line)**

**1. `med_rehearsal_errors` "Dress Rehearsal (Costumes Optional)"** | eliminate | `med_tourney_field` seed 21
- Player: marchmoor; roster pikeman, longbowman, billhook_levy, pitchfork_mob; budget 3000, core pikeman x8; par 2250 t; limit 240 s.
- Enemy (overbury): jousting_knight x6 (two squads, charge on the bugle), squire x14 behind; no boss.
- Teaches Brace and Hold; tests nothing; star 3 `thrift(2250)`. Star labels: 2 "Win with half your army standing; the grandstand counts." 3 "Win spending 2,250 turnips or less. Frugal is the new fearless."
- Set-piece `med_sp_wrong_cue`: at t=16 the bugle sounds four seconds early; shot: low dolly from behind the pike line toward the charge, 4 s, hold on the first impact; stinger `med_stg_wrong_cue` (flat trumpet into drums); sfx hoof swell, trumpet crack, lance splinter, crowd "ooh".
- Reward: part `med_tabard_pageant` (Workshop torso) + title "Extra With Lines". Attempts 1.2 / 2.5.
- Brutus: "WELCOME to the Grand Pageant! Order of events: procession, speech, accidental war!" Plato: "The knights charge on the bugle. The bugle keeps a different schedule. Is a plan still a plan if nobody told the horses?" Cassandra: "The bugle will be early. I said so at the rehearsal. This is the rehearsal."
- Win (Brutus): "THE PIKES HELD! The horses are reviewing their decisions and the grandstand wants to know if that was in the programme." Lose (Cassandra): "The pikes were crooked. The horses were not."

**2. `med_standard_deviation` "Lord Wobbleton's Standard Deviation"** | kill_general | `med_ford_of_errors` seed 22
- Player: marchmoor; roster pikeman, billhook_levy, longbowman, pitchfork_mob, village_reeve; budget 5000, core pikeman x10; par 150 s; limit 270 s.
- Enemy (overbury, guarded general): lord_marshal (general, far bank), herald x3 (both flanks and one at the marshal), jousting_knight x4, man_at_arms x8, squire x14.
- Teaches Colours. Tests Brace: star 3 `chargesBroken(4)`. Star 3 label: "Break four charges on your pikes. The horses will want to talk."
- Set-piece `med_sp_colours_down` (on banner or marshal fall): slow orbit 3.5 s around the toppling standard while the line wobbles; stinger `med_stg_colours_down` (bell + low brass); sfx cloth rip, pole snap, ringing bell, crowd gasp.
- Reward: Quick unlock Banner Cam + codex page `med_codex_heraldry` ("Heraldry for the Hopeless") + title "Vexillophobe". Attempts 1.5 / 3.
- Brutus: "LORD WOBBLETON! Famous for the biggest banner in the realm and a hat that sees the enemy first!" Plato: "Cut the banner and the army forgets why it came. Is a flag the army, or only its memory?" Cassandra: "When the banner falls they run. I said so about the last banner. They were polite about it."
- Win (Plato): "The banner fell. The army discovered it had other places to be." Lose (Cassandra): "His hat was bigger than your plan. I mentioned the hat."

**3. `med_toll_bridge_blues` "Toll Bridge Blues"** (Act I finale: Brace + Colours) | capture (3 points, hold 20 s) | `med_toll_bridge` seed 23
- Player: mixed (gullhaven, marchmoor); roster crossbowman, pavise_bearer, halberdier, pikeman, village_reeve; budget 7000, core crossbowman x8, pikeman x6; par 5200 t; limit 300 s.
- Enemy (overbury column): man_at_arms x16, jousting_knight x8, herald x3, squire x12. Boss: bridge_troll joins at t=60 from under the bridge.
- Teaches Armour and bolts (ap, reload window). Combines Brace and Colours. Tests Colours: star 3 `bannersDown(3)`. Star 3 label: "Topple three banners. Heralds hate this one trick."
- Set-piece `med_sp_troll_rises` (t=60): shot from water level up the pier as the troll climbs out, 4.5 s; stinger `med_stg_troll_rises` (tuba, one coin on a plate); sfx wood groan, water cascade, bass growl, purse jingle.
- Reward: mutator `med_pennant_parade` + title "Toll Free". Attempts 1.8 / 3.5.
- Brutus: "THE TOLL BRIDGE! One lane, three bridgeheads and a troll who accepts exact change only!" Plato: "Plate stops arrows beautifully. Has anyone consulted the arrows?" Cassandra: "The troll is under the bridge. There is always a troll under the bridge. Bring correct change."
- Win (Brutus): "THE BRIDGE IS OURS! Toll collected in full, in bolts." Lose (Plato): "We paid in arrows. He had asked for bolts. Both parties were unmoved."

**Act II: The Siege Season (Castles)**

**4. `med_late_sally` "The Sally That Was Mostly Late"** | destroy (units tagged `siege`, 4 trebuchets) | `med_siege_camp` seed 24
- Player: overbury; roster squire, man_at_arms, jousting_knight, herald, lord_marshal; budget 9000, core jousting_knight x8; par 140 s; limit 240 s.
- Enemy (gullhaven besiegers): halberdier x14, crossbowman x14, pavise_bearer x10, sapper x8 as crews, trebuchet x4 (mission override: parked, "shells on back-order", they do not fire at you).
- Teaches Charge and unhorse. Tests Reload: star 3 `hitsDuringReload(8)`. Star 3 label: "Hit eight crossbowmen mid-reload. Nine seconds is a long time to be polite."
- Set-piece `med_sp_late_sally` (t=0 horn): hoof-height tracking shot along the charge line, lift to the camp, 5.5 s; stinger `med_stg_late_sally`; sfx horn, hoof swell, tent ropes snap, wagon crash.
- Reward: part `med_lance_used` (Workshop weapon class lance) + title "Fashionably Late". Attempts 1.5 / 3.
- Brutus: "THE SALLY! Knights! Lances! Siege engines, which are mostly wood and extremely surprised!" Plato: "Heavy cavalry are unstoppable until they stop. Who tells the horse?" Cassandra: "Your knights will fall off. Knights on foot are still knights. They are simply upset ones."
- Win (Cassandra): "The engines are kindling. The besiegers have been besieged. Nobody enjoys it." Lose (Plato): "A charge is a decision made at speed. Ours was made faster than the information."

**5. `med_knock_knock_terms` "Knock Knock (Terms and Conditions Apply)"** | destroy (portcullis x1, oak gate x1) | `med_gruntlefield` seed 25
- Player: mixed (marchmoor, gullhaven); roster battering_ram, sapper, pavise_bearer, crossbowman, pikeman, village_reeve; budget 10000, core battering_ram x2, sapper x6; par 270 s; limit 420 s.
- Enemy (overbury garrison): man_at_arms x14 (hold the wall), squire x18, herald x2, jousting_knight x6 (sally when the oak gate falls). Boss: black_destrier leads the sally. Cauldrons exist and say "oil pending".
- Teaches Gates and ram (team-owned gate, mantlet, structDmg). Tests Unhorse: star 3 `unhorsed(4)`. Star 3 label: "Unhorse four sally knights. They arrive upright and leave as footnotes."
- Set-piece `med_sp_door_gives_notice` (oak gate down): crane up and over the wall 5 s as the sally pours out; stinger `med_stg_gate_gives`; sfx wood split, chain rattle, dust whump, a trumpet repeating the wrong cue.
- Reward: part `med_mantlet_shield` (Workshop offhand) + title "Door Handler". Attempts 2 / 4.
- Brutus: "CASTLE GRUNTLEFIELD! One gate, one portcullis and a sign saying Please Knock!" Plato: "A siege is patience applied to masonry. We have four minutes. Is that a siege or a visit?" Cassandra: "The oil is on back-order. It arrives Thursday. Do not be here on Thursday."
- Win (Brutus): "THE DOOR HAS GIVEN NOTICE! The portcullis asks that you take your shoes off." Lose (Cassandra): "Thursday came early. It always does."

**6. `med_bell_tolls_lunch` "The Bell Tolls For Lunch"** (Act II finale: Gates + Brace + Colours) | defend_core (bell tower hp 1500 until noon, 150 s) | `med_abbey_close` seed 26
- Player: bellmead + marchmoor; roster infirmarian, bell_ringer, flail_cellarer, bell_warden, pikeman, longbowman; budget 8500, core infirmarian x3, pikeman x8; belfry_cart arrives free at t=100; par 6500 t; limit 180 s.
- Enemy (fenwarden raids): W1 t=10 reed_cutter x14, bog_dartsman x10; W2 t=55 pony_raider x8 (charge the gate), beaked_apothecary x4; W3 t=100 lantern_warden, bog_dartsman x12, reed_cutter x10, beaked_apothecary x2. No boss.
- Teaches Healers and poison. Combines Gates (hold the abbey gate), Brace (pony charge), Colours. Tests Gates: star 3 `propStanding(med_oak_gate)`. Star 3 label: "The abbey gate is still on its hinges at noon. The cellarer takes it personally."
- Set-piece `med_sp_great_sniffle` (t=70, three gas strikes): green clouds drift over the cloister, units sneeze; slow crane from the tower top 5 s; stinger `med_stg_sniffle_bell` (one bell, a wobbling woodwind); sfx bell toll, hiss-bubble, a chorus of sneezes. (Setting only: the tonic only ever makes people sneeze and sit down.)
- Reward: part `med_beak_mask` (helm) + codex page `med_codex_infirmary` + title "Soup du Jour". Attempts 2 / 4.
- Brutus: "BELLMEAD ABBEY! Seventeen bells, one cellar and an alarming number of herbs!" Plato: "The abbey heals anyone who asks. Do we count the healed as guests or as inventory?" Cassandra: "There will be a plague. Green. Sneezing. I said it in Act One. Please stand upwind."
- Win (Cassandra): "Told you. I do not enjoy it. The soup is excellent." Lose (Plato): "The bell tolled for lunch. Lunch was unavailable."

**Act III: Here Be Dragons (Artillery and Sky)**

**7. `med_burn_after_reading` "Burn After Reading"** | escort (VIP herald with the Royal Standard to the abbey road) | `med_thatch_hollow` seed 27
- Player: mixed (overbury, marchmoor, bellmead); roster squire, man_at_arms, pikeman, billhook_levy, longbowman, infirmarian, pitchfork_mob; budget 7500, core infirmarian x2; fixed VIP "Herald Percival Bellows-Hale" (hp x2, no melee, banner on; if he dies the standard falls and the mission is lost); par 120 s march; limit 210 s.
- Enemy (fenwarden arson): fen_firebow x14, reed_cutter x12, bog_dartsman x8, pony_raider x6, lantern_warden; scripted arson at t=25/55/85; 12 oil casks scattered.
- Teaches Fire and oil. Tests Healers: star 3 `healedHp(1000)`. Star 3 label: "Ladle 1,000 hit points back into the herald's escort. Receipts available."
- Set-piece `med_sp_float_burns` (t=40): whip-pan 3.5 s to the papier-mache dragon float collapsing in flames; stinger `med_stg_float_burns`; sfx whoomph, crackle, crowd "ooooh", cardboard crumple.
- Reward: Quick unlock "Thatch Hollow, Dry Summer" (dry + wind) + part `med_cauldron_helm` + title "Smoke Detector". Attempts 2.2 / 4.
- Brutus: "THATCH HOLLOW! Thirty roofs, a windmill and a papier-mache dragon that is VERY flammable!" Plato: "The herald must carry the standard through a village that wishes to be on fire. Is it arson if the village consents?" Cassandra: "The float burns first. Then the barn. Then the herald's feelings. Keep the soup close."
- Win (Plato): "He arrived with his standard and an interesting hairstyle." Lose (Brutus): "THE STANDARD IS TOAST! Literally! Look at the toast!"

**8. `med_counterweight_clause` "The Counterweight Clause"** | survive_waves (4) | `med_beacon_heath` seed 28
- Player: mixed (gullhaven, fenwarden, overbury); roster trebuchet, springald, crossbowman, pavise_bearer, fen_firebow, pony_raider, jousting_knight, halberdier; budget 12000, core trebuchet x3; par 9000 t; limit 480 s.
- Enemy ("the rival guild has hired everybody"): W1 reed_cutter x14, bog_dartsman x10, pony_raider x6; W2 man_at_arms x12, jousting_knight x6, herald x2; W3 trebuchet x3 on the far ridge (live) with halberdier x12, pavise_bearer x8; W4 lady_counterweight on the ridge, sapper x10, crossbowman x14. Boss: Lady Counterweight.
- Teaches Arc fire (minRange, craters, counter-battery). Tests Fire: star 3 `burnKills(siege,2)`. Star 3 label: "Burn two enemy engines. Wood is a lifestyle choice."
- Set-piece `med_sp_lady_arrives` (W4): long-lens push 5 s from your battery across the heath to her silhouette; stinger `med_stg_lady_arrives`; sfx groan, counterweight whump, whistle, crater crash.
- Reward: mutator `med_mud_season` + title "Counterweight of Evidence". Attempts 2.5 / 4.5.
- Brutus: "THE HEATH! Trebuchets! Counter-trebuchets! A lawsuit between guilds that has become LOUD!" Plato: "Leverage in the physical sense is simple. In the commercial sense it is how we got here." Cassandra: "Her trebuchet is bigger. She is called Lady Counterweight. She does not like you. Send the horses round the back."
- Win (Plato): "The rival guild has withdrawn its claim and some of its ridge." Lose (Cassandra): "She was bigger. I said bigger. I used the word."

**9. `med_dragon_over_keep` "A Dragon Over the Keep (Please Remain Calm)"** (finale: AA bolts, healers, colours, fire) | kill_general (the dragon) | `med_dragon_crag` seed 29
- Player: mixed (all but Crag); roster springald, longbowman, crossbowman, pikeman, pavise_bearer, infirmarian, herald, lord_marshal, jousting_knight, trebuchet, man_at_arms, village_reeve, bell_warden; budget 15000, core springald x4; par 300 s; limit 420 s.
- Enemy (crag): hollow_dragon (boss, general, perched), wyvern x4 at t=60 and x4 at t=130, crag_boar x16, bridge_troll x2 at the hoard gate.
- Teaches Air (dragon, wyvern, AA ring on springalds). Combines four earlier mechanics. Tests Arc fire: star 3 `shellsOnTarget(hollow_dragon,1)` (she lands below 40% hp or when no AA reaches her). Star 3 label: "Land a trebuchet shell on the grounded dragon. She will want a word with the guild."
- Set-piece `med_sp_dragon_wakes` (t=25): low-angle track 5.5 s up the keep and across the sun, banking over the army; second `beat` on death (crash into the keep, coin shower); stinger `med_stg_dragon_wakes`; sfx roar, wing whomp, masonry fall, fire whoosh.
- Reward: title "Dragon's Accountant" + part `med_dragon_scale_pauldrons` + codex page `med_codex_bestiary`; sets the era-complete flag. Attempts 3 / 5.
- Brutus: "A DRAGON! On a KEEP! This is the best day of my life and it is also on fire!" Plato: "The insurers have classed this as a weather event. I find the class generous, and the dragon more so." Cassandra: "I said dragon in the first briefing. You said boring. Bring the bolts."
- Win (Cassandra): "Told you. Twice. I am retiring from being right." Lose (Brutus): "THE KEEP IS GONE! Also the roof! Also the hoard! Also my tabard!"

**Curve audit (plan s8 rules, checked by plan_lint and the MS lint).**

| rule | result |
|---|---|
| >= 5 objective types | 7: eliminate (1), kill_general (2, 9), capture (3), destroy (4 units by tag, 5 props), defend_core (6), escort (7), survive_waves (8) |
| <= 1 new mechanic taught per mission | M1 Brace, M2 Colours, M3 Armour and bolts, M4 Charge and unhorse, M5 Gates, M6 Healers and poison, M7 Fire and oil, M8 Arc fire, M9 Air; enemy units that carry an untaught mechanic are inert (M4 trebuchets are parked, M5 cauldrons say "oil pending") or absent |
| star 3 tests only earlier mechanics | M1 thrift; M2 brace; M3 colours; M4 reload; M5 unhorse; M6 gates; M7 healing; M8 fire; M9 arc fire |
| act finales combine >= 2 earlier mechanics | M3 Brace + Colours; M6 Gates + Brace + Colours; M9 bolts + healers + colours + fire |
| set-piece package | 9 of 9 (event, shot 3.5-5.5 s, slot, stinger, sfx) |
| real reward | 6 Workshop parts (torso, weapon, offhand, 2 helms, pauldrons), 2 mutators, 2 Quick unlocks (Banner Cam, Dry Summer), 3 codex pages, 9 titles |
| headline mechanic coverage (plan s13) | siege/gates (5), charge/brace (1, 4), banners/morale (2), healers/poison (6), dragon (9) all taught; fire/oil and arc fire extras |

**Faction doctrines for Quick and Daily (one reference army each, 3 valid solutions per faction).** Overbury "Hammer and Anvil": pikes borrowed, knights timed on the reload; Marchmoor "Hedgehog": 60% pikes, longbows behind, reeve in the middle; Gullhaven "Paid Distance": 2 crossbow : 1 pavise, trebuchet behind, halberdiers to screen; Bellmead "Slow Soup": cellarers in front, 1 infirmarian per 8, bells on the flanks; Fenwarden "Death by a Thousand Sneezes": darts, apothecary on the stationary block, ponies at the back line; Hollow Crag "Weather Event": wyverns first to bait AA, dragon second.

## 7. Six puzzles (stored solutions, 100 random legal armies win <= 15%, star 3 <= 5%)

| id | name | teaches | trick |
|---|---|---|---|
| med_puzzle_pike_etiquette | Please Do Not Charge (The Sequel) | Brace | four knights arrive on a diagonal; the line must face the path, not the board edge, and overlap in two offset ranks; bonus lose <= 2 |
| med_puzzle_flag_day | Flag Day | Colours | 14 squires around a herald; bait the escort with a decoy, slip three longbowmen to a flank, drop the banner and watch the rest leave; bonus win in 30 s |
| med_puzzle_tin_opener | Tin Opener | Armour and reload | six men-at-arms; two crossbow squads staggered 4 u apart so one is always loaded, pavises cover the reload; bonus lose no crossbowman |
| med_puzzle_doorstep_delivery | Doorstep Delivery | Gates | sappers under a mantlet reach the gate from the side the tower cannot see; bonus gate down within 60 s |
| med_puzzle_dose_response | Dose Response | Poison | three plate knights hold a bridge; one apothecary cloud on a stationary block beats all of them, a second cloud is a trap for your own queue; bonus no unit poisoned |
| med_puzzle_mind_the_gaping_jaws | Mind the Gap (Gaping Jaws) | Air | dragon breath is a cone, so springalds spaced 6 u apart lose one at a time; bait pikes pull the breath; bonus dragon down in 40 s |

## 8. Six god powers (the intern's job: "divine intervention, but make it sturdy")

Slots keep their semantics: 1 quick strike, 2 big strike, 3 area control, 4 heal, 5 status, 6 summon. Each maps to an existing effect family; ids are `med_*`; Ancient ids stay untouched. The intern is offstage: named only here and in arrival and chooser text.

| slot | id | name | effect (family) | telegraph | cooldown class | tooltip joke |
|---|---|---|---|---|---|---|
| 1 | med_form_27b | Form 27-B (Smiting) | lightning family: aoe 3, 90 magic (ignores plate), chain 4 | a red wax seal pressing down | quick 6 s | "Intern's note: the Smiting box was already ticked. We left it." |
| 2 | med_act_of_god | Act of God (Small Print) | meteor family: 2 s, fire aoe 5, 140, crater r4 | circle of red ink: DO NOT STAND HERE | big 20 s | "Covered by every policy except yours." |
| 3 | med_subsidence | Subsidence | earthquake family: r14, 5 s, stagger and fall (heavier units fall longer), walls and towers take damage | cracks fan outward from a stamp | area 30 s | "Planning permission denied. Retroactively. Loudly." |
| 4 | med_ladle | Ladle of Mild Recovery | heal wave: +60 in r12 (x godMul) | steam rings | heal 25 s | "Soup. The intern says it is a miracle. It is soup." |
| 5 | med_audit | Surprise Audit | status family: confuse 6 s in r10 (both teams: the auditor does not discriminate) | a falling shower of forms | status 30 s | "Everyone stops to check their pockets. Everyone." |
| 6 | med_levy_call | Emergency Levy | raise family: six pitchfork_mob and one herald (banner on) for the caster | a trumpet blast ring | summon 18 s | "They were passing. They are very keen. The herald has already started." |

Intern gag: arrival card and chooser caption only ("Selected by the intern because it looked sturdy"); powers' tooltips carry one "Intern's note" each, never a portrait.

## 9. Two era mutators and twelve achievements

**Mutators (shared 9 + 2).** `med_mud_season` "Mud Season": ground speed x0.85, charge bonus x0.5, fire on props x0.4, arrow spread x1.2; "Everything is damp, including the plan." Unlock: M8 reward. `med_pennant_parade` "Pennant Parade": every melee unit carries a tiny banner (aura r3, dmg +4%, lossMul .85; strongest wins, no stacking); "Everybody is a herald. Nobody knows the programme." Unlock: M3 reward. Matrix: Mud Season disables-with-reason the dry-summer variants; Pennant Parade has no conflicts, and it makes the banner-fall shock rarer (design check: sniping a real banner must still matter, so aura of tiny pennants is deliberately weak).

**Achievements (12).** Generated 3: `med_history` "Pageant Complete" (finish the campaign); `med_overachiever` "Gold Star Embroidery" (27 stars); `med_tourist` "Grand Tour of the Marches" (fight on all 12 arenas). Designed 8: `med_pointy_end` "Pointy End Forward" (break 25 charges on pikes, lifetime); `med_vexillologist` "Vexillologist's Nightmare" (topple 8 banners in one battle); `med_tin_opener` "Tin Opener" (15 heavy units killed by bolts in one battle); `med_unhorsed` "Unhorsed and Unbothered" (12 knights unhorsed in one battle); `med_door_prize` "Door Prize" (an oak gate falls within 45 s of first ram contact); `med_bring_out_the_soup` "Bring Out the Soup" (heal 4000 hp in a won battle); `med_oil_painting` "Oil Painting" (20 kills by fire and oil in one won battle); `med_dragon_slayer` "Dragon Slayer (Pending Approval)" (kill a Hollow Dragon). Hidden 1: `med_huzzah_fifty` "Brutus Bought a Tabard" (hear Brutus HUZZAH 50 times, lifetime `huzzahs`).

## 10. Humour

**Three engines (Ancient's bureaucratic understatement is not primary).**
1. **The Pageant Must Go On** (ceremony collapsing; Brutus and heralds).
 - Brutus battle_start: "WELCOME to the Grand Pageant of Realms! Order of events: procession, speech, collision. We are skipping to the third!"
 - Brutus charge: "CHARGE! The bugle said wait! The horses said no!"
 - Brutus first blood: "FIRST BLOOD! Also first interval! The grandstand is selling pies!"
 - Herald last words: "The programme did not mention a participatory event."
 - Cassandra banner fall: "Their banner is down. The procession is over. The war, regrettably, is not."
2. **Oath Literalism** (loopholes; Plato and the units).
 - Halberdier last words: "I swore to hold the line. Nobody said which line. I picked a short one."
 - Plato battle_start: "The contract says to the death. Of whom? The clause is silent. The clause is usually silent."
 - Pikeman taunt: "My oath says forty days. This is day forty. Please hurry."
 - Reeve last words: "I declare myself dead, pending review."
 - Plato mercenary rout: "He has fulfilled the contract to the letter and left by the letter. Is that cowardice or typography?"
3. **Slow Logistics and Bad News by Pigeon** (back-orders, weather events; Cassandra, wave names, lessons).
 - Cassandra stalemate: "The siege is on schedule. The schedule is eight weeks. You have four minutes. Nobody told the schedule."
 - Cassandra trebuchet misfire: "The counterweight was back-ordered. A smaller counterweight was substituted. Observe the substitution."
 - Plato oil: "The oil is delayed in transit. It is the only thing in this siege behaving as intended."
 - Brutus dragon: "A DRAGON! The pigeon was supposed to warn us! The pigeon has not been seen since Tuesday!"
 - Lesson: "Messages sent: 3. Pigeons arrived: 0. Battle lost on information."

**Arrival card (first entry, skippable).** "TIME TRAVEL ADVISORY. Zeus's intern has filed the commentators under M for Middle and pressed Send. Please enjoy the Ages. Arrival: the Kingdom of Overbury, mid-pageant. Brutus has acquired a tabard. Plato has acquired a contract. Cassandra has acquired a cough and a feeling about the soup."
**Per-act progression.** Act I: Brutus's plain tabard ("I'M WITH THE KING"), Plato asks whether a feudal contract is a dialogue, Cassandra says "There will be a plague." Brutus: "Boring." Act II: the tabard gains a feather and a sponsor patch (Hollow Crag Dragon Insurance), Plato reports it is "a monologue with witnesses", the green clouds arrive in M6 and Cassandra is, for once, right and does not enjoy it. Act III: the tabard is traded for a pigeon, Plato signs ("a dialogue needs two parties; I am now both"), Cassandra is right about the dragon and asks to retire from prophecy.
**Finale payoff (era-independent surfaces).** Credits tail: "Plague: predicted. Dragon: predicted. Tabard: never predicted. Cassandra regrets nothing, except the tabard." Chooser card gets a wax-seal PAGEANT COMPLETE stamp with the caption "Intern's note: it looked sturdy." The Time Passport (shared "all eras cleared" card) stamps a turnip.

**Eight callback pairs (setup-free; gated renders only if its flag shows the source was seen).**

| # | setup-free line | gated line | flag |
|---|---|---|---|
| 1 | Brutus: "I bought a TABARD! It says I'm with the king. Which king? The one on the front!" | "My tabard is gone. I swapped it for a pigeon. The pigeon is also gone." | seen:med_tabard |
| 2 | Plato: "A feudal contract: is it a dialogue?" | "I have read it. It is a monologue with witnesses." (also in Modern: "In the Middle Ages a contract was a monologue. Today it is a form.") | seen:med_contract_q |
| 3 | Cassandra: "There will be a plague." | "I predicted a plague once. It was green. Today is also green." (Modern, Sci-Fi) | seen:med_plague |
| 4 | Brutus sponsor: "Brought to you by Hollow Crag Dragon Insurance: cover for everything except dragons!" | "Our sponsor has withdrawn. They cited the dragon." | seen:med_sponsor |
| 5 | Plato: "Why is there a turnip on the flag?" | Codex Overbury: "Plato has asked eleven times. The turnip remains." | seen:med_turnip_q |
| 6 | Power tooltip: "Ladle of Mild Recovery." | Victory: "Soup was served. It recovered nothing. Morale, however, was restored." | stat:soupCasts >= 1 |
| 7 | Brutus randomly shouts HUZZAH at the wrong moment | "That is twenty-five HUZZAHs. One was in the right place. I will not say which." | lifetime:huzzahs >= 25 |
| 8 | Brutus: "Where is the goat? Somebody fetch the goat." | "The goat stayed in the Ancient era. He is fine. He is always fine." | seen:ancient_history |

**Survival (20 waves + 5 bosses).** Waves: The Welcome Wagon (Armed); Tithe Collectors; Several Cousins; The Lord's Nephews; A Wedding Party, Unconvinced; The Subsidy Is Late; Tax Season, Early; Unlicensed Minstrels; The Archery Club Outing; Neighbouring Duchy, Neighbouring; Rabble, Fully Rehearsed; The Guild Inspection; Pie Thieves; A Very Long Procession; Mismatched Armour Day; The Seasonal Mob; Heralds, Heralds, Heralds; Reinforcements (Unapproved); The Wrong Cue; The Final Demand. Bosses: black_destrier "Wave {n}: Undefeated, Technically"; belfry_cart "Wave {n}: Tolling for Thee (Per Hour)"; lady_counterweight "Wave {n}: Leverage Buyout"; bridge_troll "Wave {n}: Toll Free (Not)"; hollow_dragon "Wave {n}: Weather Event, Severe".
**Loading lines (samples).** "Polishing the tournament lances..." "Teaching the herald to read the room..." "Re-attaching the drawbridge..." "Counting turnips. Twice. Different totals..." "Asking Plato if the contract is a dialogue..." "Explaining plague to Brutus. He said boring..." "Waking the dragon. It filed a complaint..." "Back-ordering oil..."
**Kill verbs (new causes).** charge: lanced, couched at, ran down; bolt: bolted, perforated politely; fire: toasted, kindled, flambeed; poison: dosed, tonic-ed; boulder: leveraged, counterweighted; bell: tolled; breath: invoiced.
**Results lessons (samples).** "Charges broken on spears: {n}. The horses are reviewing their decisions." "{n} banners fell. Armies are mostly cloth with opinions." "{n} crossbowmen were caught reloading. They were not rushed. The enemy was." "{n} hit points ladled back. The soup has been invoiced." "Gate: {secs} s. The architects were informed. They were not surprised." "One dragon, filed under weather. Claim pending."

## 11. Music and sound direction

**Seven tracks (sources: CC0/CC BY first per map 07, synth fallback per cue).**
| id | title | mood; tempo; instrumentation |
|---|---|---|
| med_menu | Tavern Overture | cosy, tipsy, ceremonial; 92 bpm 6/8 jig; lute, hurdy-gurdy drone, frame drum, wooden flute, one out-of-tune brass flourish |
| med_map | Tapestry Walk | wistful, unhurried, stitched; 78 bpm; harp, recorder, bowed psaltery, distant single bell (chooser/map bed) |
| med_battle_low | Muster | tense, plodding, expectant; 80 bpm; low drone, tenor shawm, slow war drum, creaking strings |
| med_battle_mid | Shield Wall | heavy, marching, relentless; 104 bpm; double frame drums on the beat, brass chords, bowed low strings |
| med_battle_high | Charge Before Lunch | galloping, frantic, nearly triumphant; 146 bpm triplet gallop; horns, snare, sawing fiddle, cymbals |
| med_victory | Fanfare, Slightly Flat | pompous, jubilant, a little flat; 118 bpm; trumpets, timpani, one comically late tuba |
| med_defeat | Lament for a Misplaced Banner | mournful, dry, understated; 58 bpm; solo shawm, tolling bell, low drone |

Stingers (9 set-piece plus reuse of victory/defeat/first-blood): `med_stg_wrong_cue`, `_colours_down`, `_troll_rises`, `_late_sally`, `_gate_gives`, `_sniffle_bell`, `_float_burns`, `_lady_arrives`, `_dragon_wakes`; all duck music -6 dB for 700 ms and bypass the limiter only for the dragon.
**Twelve hot sound families and what they should feel like.**
1. `med_blade_on_plate`: a ringing CLANG with a short metal tail, pitch by armour, never a swish. 2. `med_mace_on_helm`: a thud with a bell in it, "bonk" with consequences. 3. `med_lance_shatter`: crack and splinter spray, a clean pop at impact. 4. `med_charge_thunder`: layered hooves that build 2 s before the hit (the audible tell), harness jingle. 5. `med_brace_thunk`: pike butt into earth then a heavy wooden KOK, a horse's objection. 6. `med_xbow_release` and `med_xbow_crank`: snap-thwack, then ratchet clicks for the 2.6 s reload (the tell). 7. `med_longbow_volley`: a soft collective flutter; hits thup on mail, tink on plate. 8. `med_trebuchet`: long groan, counterweight whump, whistle, rolling crash, bigger for the Lady. 9. `med_ram_gate`: deep wood boom with iron chain rattle, a groan on the last hit. 10. `med_banner`: cloth snap on raise, pole snap plus bell clang on fall. 11. `med_bell`: warm bronze tolls (alarm, rally, Great Toll), long tail. 12. `med_dragon`: low layered roar, leathery wing whomp, fire-breath whoosh with crackle (and `med_oil_whump` for casks).

## 12. Risks and how the design avoids them

1. **Banner module arrives late (M13 is #11; M2 needs it).** Fallback "Colours-lite": existing `aura` rally plus the `officer` death shock x1.5 for the fall; the tell is pure render. M1 needs none of it, so the plumbing slice is safe. Ask SIM to confirm `fall: {r, shock}` as a param of `aura` banner.
2. **Plate stalemate (arrows cannot hurt plate; healers heal).** Fire ap 1, poison bypass, crossbows ap .55, `magic` god powers and blunt keep five answers alive; healer output is capped (+28 x5 per 5 s per infirmarian) and armygen caps support at its share; the watchdog still applies.
3. **Dragon stall (unhittable remnant).** Air units are hit by default; armygen and campaign validation guarantee AA (springald, longbow, crossbow); the dragon lands below 40% hp or with no AA in 30 u; termination rule from M7 for remnants.
4. **Medieval reads as Ancient with armour.** Different tempo, a break-driven fight, plate/ap economy, the Colours tell, bimodal speeds, vertical spread; ER27 fingerprint with a rewrite trigger, and blind classification in ER21.
5. **Too many mechanics for Act II.** One per mission, teach-in-k test-in-k+1; the mechanic-blind foil must lose >= 70% or the beat is rewritten.
6. **Fire perf and chaos.** `igniteAt` is capped at 35% per tick per patch, rain douses, fire spreads only on flammable cells; the oil trap is a prop, not a system.
7. **Gate and siege time.** Gate hp 700 + portcullis 1100; three rams breach in 30-45 s; M5 par 270 s; the timer joke ("eight weeks") is text only.
8. **Bailout accounting.** The spawned man_at_arms is excluded from `startCount/startCost`; star 2 uses start cost; tested in M4.
9. **Healer or poison tone.** "Plague" is setting only; the tonic causes sneezing and sitting; no pain, no family, no real order; "abbey" and "church bell" only as props and sound.
10. **Real-world heraldry and weapons.** Emblems are invented (turnip gauntlet, gull ledger, mouse bell, lantern heron, hatted mountain); pavise, springald and halberd are generic historical names, not brands; VB bans lions, eagles, crosses, stars, crescents, three-band layouts.
11. **Unit id collisions across eras.** `trebuchet`, `halberdier`, `sapper`, `springald` are plausible names for other eras; registry throws on duplicates, so Modern and Sci-Fi must not use them (COORD to publish the reserved list).
12. **16-type cap vs six-faction armies.** Mixed rosters in M3, M5, M7, M8 and M9 stay <= 13 types; armygen `MAX_TYPES` unchanged.
13. **Cut-ladder exposure.** Wall-walk archers are not required (towers hold decor ledges only); smoke occlusion, teleport pads and wrecks are unused here; cuts cost Medieval nothing.
14. **Comedy repetition.** Three engines, 15 samples above, wave and boss names, lessons and kill verbs; "Intern's note" appears at most once per screen.
15. **Hot-file touches.** All Medieval text, kit rows, god powers, set-pieces, teaching beats and audio profiles are data in `era_medieval/`; no engine `if (era === ...)`.
