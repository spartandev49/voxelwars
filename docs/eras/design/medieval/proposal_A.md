# Medieval era, proposal A: "spectacle and silhouettes first"

Creative director A. Era id `medieval`, id prefix `med_`, currency **groats**. Written against plan.md v3.1 (scope table s1, modules s4, rigs s5, world s7, campaign s8, audio s10, humour s11, never-cut s13). Everything here is fictional: realms, ranks, emblems and colours are invented, the dragon is the only thing that is not a joke and even it is a bit of one. Medieval needs only modules #1..#13 (the E-FREEZE prefix); it never touches mines, cover, shields-with-regen, cloak or EMP.

Method: I designed from the default-camera screenshot backwards. Every faction must be named by a 40 px silhouette and a colour; every mission must contain one frame worth screenshotting; every unit must have one thing that is a joy to watch move.

---

## 1. Feel sheet

**Conceit.** The Grand Annual Pageant of Marrowby is a village fete that turns into a real war every year because each faction brings the props it actually owns, and this year one of the props is a real dragon; the three commentators, dragged here by Zeus's intern, call it live from a booth made of hay bales.

**Tempo: "the Crunch".** Slow, heavy, readable. First contact 12-20 s after Fight (foot speed 2.0-2.9 u/s on 96-128 u arenas, no unit starts in range). Lines meet and grind 20-40 s: HP about 1.3-1.5x the Ancient equivalents, damage per blow similar, cooldowns longer, so fewer and heavier hits. The decisive moments are EVENTS you can see (a banner falls, a charge lands, a gate breaks, a bell drops), not attrition. Target battle median 90-150 s; sieges 150-300 s with a script beat every 40-60 s, so "a siege that takes too long" is a joke the commentators make, never a slog the player sits through.

**Engagement distance (directional targets for the ER27 fingerprint; measured later, sheet or roster is rewritten if Medieval lands too close to Ancient).** Melee 2.0-3.4 u (pike 3.4); crossbow 30; longbow 44; mangonel 46; springald 50; trebuchet 72 (min 26). Median engagement distance clearly SHORTER than Ancient (heavy melee, slow approach), ranged damage share clearly LOWER (about 25-30%), first contact LATER, speed distribution NARROWER and slower, vertical spread NON-ZERO (walls, towers, dragon). The Ancient feel is a fast skirmish line; the Medieval feel is a slow moshpit with a flag on top.

**Camera.** Default camera unchanged. What changes is what it sees: banners (poles 2x2 voxels, 3.6 u tall) and ground rings read from the default distance, and walls/keeps (0.2 voxel buildings) frame the siege maps. Set-piece shots via `CameraRig.shot`: "crane" (low to high wide), "tilt track" (low side-on parallel to a charge), "murder hole" (inside-out through an arch), "dragon up" (low angle, dolly up). Siege missions open with a 3 s pan camp -> gate. Reduce Motion = cuts.

**UI chrome vocabulary.** Parchment panels, wax-seal cooldown icons that visibly STAMP when ready, rubric (red ink) initial letters on mission titles, marginalia doodles (a knight losing a fight to a snail, a recurring loading-screen gag), pennant-shaped HP and morale bars, escutcheon (shield-shaped) portrait frames, iron-nail buttons. Tokens `[data-era=medieval]`: parchment `#efe2c0`, ink `#2b2118`, wax `#a8321f`, iron `#4a4f57`, accent rust `#c8501e`. Fonts: existing Cinzel for titles (it already looks like a charter), Rubik for body. Era map "The Disputed Hedges of Marrowby": illuminated parchment, pins are wax seals, routes are dotted ink, sea serpents and a small dragon doodle in the margins (the dragon gets bigger each act). Acts: **I: Pageant Season** ("Bunting, lances and a rota nobody follows"), **II: Siege Season** ("Fire, plague and a gate with a clause"), **III: Dragon Season** ("It was in the programme, in small print").

**Sound palette (3 adjectives): clanging, creaking, ceremonial.** Iron on iron, timber under load, brass and drums that sound like a procession even in a brawl.

**Signature mechanic and its on-screen tell: THE BANNER (aura `banner` + morale cascade).** Every banner carrier flies a swallow-tail pennant on a 3.6 u pole (far-LOD safe: pole 2x2 voxels, cloth >= 3 wide) and stands in a pulsing ground ring in faction + team colours. The ring pulses 1 Hz while the carrier is healthy, flickers under 50% hp, and when the carrier dies the pole drops, the ring SHATTERS into voxel confetti, a grey rout ripple expands (0.6 s) and every ally inside the ring flinches, drops morale (x2.5 officer-death shock), and the weak ones run. One look at the field answers "who is about to break". Banner carriers: Standard Bearer (the cheap dedicated one) and the four heroes (Ser Valiant, Reeve, Castellan, Abbess). Secondary tells (each a read-at-a-glance event): CHARGE = gold speed streaks + hoof thunder, lance splinters on the first hit; BRACE = pike tips dip with a glint and a chevron decal under the block; GATE = visible crack stages and iron bands twanging; FIRE = thatch glows orange before it burns, bunting burns in a visible ripple; HEAL = gold motes, POISON = mint-green cloud.

**What this era must NEVER feel like.** (1) Ancient with armour: no era-wide fast skirmish line, no open-field javelin ballet. (2) Grimdark: no mud-and-despair palette; it is saturated heraldic toy-box, bunting included. (3) Realism or a real war: no crusade, no holy war, no real order, no crosses, no real arms. (4) A siege simulator that makes you wait: every gate has a ram plan, every wall a reason to hurry. (5) Cavalry as an unstoppable button: every charge has a visible counter (pike, stake, net, hook, mud). (6) A zoo of reskins: no two units share silhouette, and the banner is always the loudest object on the field.

**Parameters I need SIM to bless (everything else is existing module vocabulary):** `aura effect:'banner'` {dmg, moraleLoss, rout shock, radius}; `aura effect:'pavise'` (allies in a rear arc take x0.5 projectile damage); `summon_on_death mode:'bailout'` with a get-up delay; `call_strike kind:'oil'`; `ranged.proj:'dragonfire'` (cone, ignites); prop `team` + `gate` (M12); `editTerrain` for the bridge drop. Fallbacks if refused: pavise = personal shield block 0.9; oil = `dot_cloud` fire; dragonfire = `fireball` aoe.

**The nine hero frames (the screenshot test: one per mission, each must be legible at the default camera and funny without a caption).**
1. M1: a mercenary in mid-sprint clutching a dropped flag, bunting trailing from his helm, the grandstand on its feet.
2. M2: five lances exploding into gold splinters in a line, the crowd's arms in the air.
3. M3: a wall of lime-green poles at a slant, rust-coloured horses stopping in a fan of river spray.
4. M4: a burning windmill still turning, a felt dragon on a cart in front of it, trotting.
5. M5: a mint cloud rolling between rose bell-skirts, a beaked physician leaning in to sniff an astonished mercenary.
6. M6: a gate dissolving into splinters from the inside, a roofed ram emerging from the dust, oil cauldrons tipping.
7. M7: a dragon's shadow crossing a camp, every head turned up, a coin-sack goblin waving at it.
8. M8: a bridge folding in the middle with a troll on the fold, his hat flying.
9. M9: a felt dragon standing nose to nose with a real one, a crowd frozen behind them.

**Quick unlock** (D2 keeps every era open, so a Quick unlock is a preset, never a gate on content): "Charge of the Wobbly Brigade" enemy style (M3), "Siege Season" castle preset with garrison and oil (M6), "Dragon Day" preset with a Cinderwyrm flyby event (M9).

---

## 2. Six factions

Colour pairs avoid every Ancient hue (blue, red, teal, purple, forest green, gold) and any red/white/blue, black/white or three-band reading; emblems are canting jokes, no crosses, stars, crescents, letters or real beasts-on-shields.

**M. Crown of Marrowby** (id `marrowby`) `#c8501e` rust-orange + `#f1e4c0` cream. Emblem: a three-legged stool wearing a crown (the crown does not fit the king). Silhouette: TALL and VERTICAL: plumes, lances twice the rider's height, pennons, long chequered caparison skirts on the horses; the widest, showiest army. Identity: shock cavalry, banners, heralded charges; expensive, brittle, devastating on open ground and helpless against a planted pike. Lore: Marrowby has a king, a queen and a stool, and nobody is sure which of them is in charge. Chivalry here means a rule book posted on a board nobody can reach. Every battle is officially a tournament until someone is hurt, and then it is a tournament with a waiver.

**Y. Long Hedge Yeomanry** (id `yeomen`) `#8bb12e` lime + `#5a3b22` walnut. Emblem: a hedgehog sitting very still in a hedge. Silhouette: LEAN and LONG: bows taller than their archers, pikes as combs of poles across the field, leaf-wide hats, a hog the size of a cottage. Identity: the people's army: spear wall, longbow volleys, billhooks that unhorse, endless levies; cheap, tough in a block, terrible when the block breaks. Lore: Tenant farmers with extremely long bows, extremely long pikes and an extremely long list of grievances, filed in triplicate and then sharpened. They have lived behind the same hedge for nine hundred years and have opinions about people who trample it. The hedge has never lost a battle, mostly because it has never moved.

**G. Gatehouse League** (id `gatehouse`) `#5b7186` slate + `#efe08a` lemon. Emblem: a castle gate with a very small cat flap in it. Silhouette: SQUARE and BOXY: crenellated kettle-hat brims, door-sized pavise boards, flat-roofed machines, a walking castle; walking walls. Identity: fortification and artillery: slow, armoured, out-ranges you, dies when you reach it. Lore: Eleven castles agreed to defend each other and then each locked its gate to see how the others would cope. Everything is run by committee, so every wall has a clause and every drawbridge a quorum. Their siege engines are superb, their post is slow, and the League motto is "Please Knock".

**B. Bellfount Chapter** (id `bellfount`) `#d9577f` rose + `#bfe3cf` mint. Emblem: a handbell with its clapper on the outside. Silhouette: ROUND and SOFT: bell-shaped skirts, big round hoods, beaked masks (mint beak, 2x2 voxels), a bell the size of a barrel on a stick. Identity: attrition and control: healers, stunning bells, mint-green poison clouds; wins long fights, loses short ones. Lore: An abbey-state run by bell: one for dinner, one for danger, and one for dinner during danger. The medicine cupboard and the poison cupboard are the same cupboard; the label fell off in the spring. Everyone is very kind about it.

**F. Free Company of Mostly Paid** (id `free_company`) `#7d5434` tobacco + `#2db5c9` sky-cyan patches. Emblem: a coin with a bite taken out. Silhouette: ASYMMETRIC and PATCHED: one huge pauldron, mismatched leather, a cyan patch on everything, a feather in a hat, a ram under a roof. Identity: hired skirmishers and breakers: nets for horses, rams for gates, a giant on a per-diem; versatile, no banner of their own. Lore: Mercenaries with excellent kit, a terrible payroll, and total loyalty to whichever cheque cleared this morning. Their contract has a clause for everything except loyalty. They will fight anyone, provided the invoice is attached.

**W. Hoard of Mount Perpetual** (id `wyrmkin`) `#dccb2c` sulphur + `#5a2430` oxblood. Emblem: three coins and a spoon (dragons value spoons). Silhouette: SPIKY and WINGED: bat wings, barbed tails, knee-high coin-sack goblins, a walking pile of coins, a bridge troll with a tiny hat. Identity: monsters and swarms: the sky layer, fire, a boss for every mission; cannot be out-tanked, can be out-ranged. Lore: A mountain full of coins, a dragon who sleeps on them, and a great many small tidy creatures who count them. The dragon has not been awake in four hundred years, which is the problem with calling a mountain "Perpetual". Somebody took the spoon.

---

## 3. The 34-unit roster

F = faction (M Marrowby, Y Yeomen, G Gatehouse, B Bellfount, F Free Company, W Wyrmkin). `B` = survival boss (5). `*` = bespoke silhouette (18). Stat intent is `hp . speed . cost` in groats, to be tuned by BALANCE inside the 30-62% band; costs sit on the Ancient scale (hoplite 100). All melee ranges are edge gaps; hum1 grids as shipped (16 parts); mounted units follow the cataphract template (27 parts). Rigs: hum1 = humanoid with new gun style `xbow`; quad1 = mounts plus new species `boar`, `troll`, `ox`, `costume`; catapult1/ballista1/ram1/trebuchet1/dragon1/chariot1 as plan s5.

| id | name | F | role; tags | rig | weapon / projectile | ability (module) | hp.spd.cost | beats / weak to | silhouette hook | one-line joke | 1st | flag |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| squire | Squire | M | melee; organic | hum1 slash, slim 0.92 | sword 9 slash cd 1.0 r1.8 | none (carries a spare lance, cosmetic) | 120.2.9.60 | levies, poachers / pikes, cavalry, crossbows | buckler bigger than his torso, three lances bundled on his back | Carries the knight's armour, lance, lunch and blame. Only the blame is his. | M1 | |
| lancer | Lancer | M | cavalry; lance | quad1 horse + hum1 | couched lance 24 pierce, charge x2.2 after 12 u run-up, kb 5 | charge (existing); lance splinters on first hit (render-only swap) | 270.3.5.190 | archers, siege, levies / braced pikes, stakes, nets, crossbows | cream plume, pennoned lance twice his height, long chequered skirt | The lance is longer than the plan. The plan is longer than the horse's patience. | M1 | * |
| knight_errant | Knight Errant | M | cavalry; heavy, lance | quad1 barded horse + hum1 plate (27 parts) | lance 30 pierce, charge x2.3; sword 14 slash fallback | charge; bailout (M13): horse dies, `knight_afoot` stands up at 60% hp after a 1.2 s get-up clip | 430.3.0.330 | open-field everything / billhooks (hook), crossbows (ap), stakes, fire | barded horse to the hoof, bucket great-helm, fan plume, tallest unit on a flat field | When the horse dies the knight stands, brushes off, and says "Ahem." | M2 | * |
| knight_afoot | Knight Afoot | M | melee; heavy, elite | hum1 plate, stocky 1.12 | two-hander 20 slash cd 1.5 r2.4 kb 3 | none | 310.2.2.170 | squires, levies, billmen / crossbows, maces, poison | squat plate, dented plume, a horse-shaped absence beside him | Dismounted, undaunted, mostly daunted, loudly. | M3 | |
| standard_bearer | Standard Bearer | M | support; officer | hum1 normal, 2x2 pole | pole 5 pierce | aura banner r10: allies +10% dmg, morale loss x0.6; death = rout shock x2.5 (M13) | 150.2.6.140 | the whole army / first target of everything | pennoned pole 3.6 u, swallow-tail cloth, pulsing ground ring | Holds the flag so high he forgets he also holds a sword. | M1 | |
| ser_valiant | Ser Valiant | M | hero; cavalry, officer, general | quad1 barded + hum1 | lance 34 pierce, charge x2.5; sword | charge; aura banner r10; `dash` lance kind "Tilt!" 14 u | 650.3.3.540 | duels, cavalry / stakes, nets, hog | three-plume crest, cream tabard to the horse's knees | Wins every tournament he enters, because he only enters the ones nobody else knows about. | M3 | |
| pageant_dragon | Pageant Dragon | M | monster (comic); organic | quad1 species `costume` (horse clips, four human legs) | headbutt 4 blunt kb 6 | `fire_panic` (3 fire hits and it runs in circles); small cheer aura r5 (crowd_favorite variant) | 90.2.4.45 | decoy, morale / everything, fire | green felt dragon, two pairs of mismatched boots, a hand waving out of the tail | Front half: Wilfred. Back half: Dennis. Dennis has notes. | M1 | * |
| billman | Billman | Y | melee; organic | hum1 overhead (hooked bill) | bill 13 slash ap .1 cd 1.3 r2.8 | hook (existing): 20% to yank a rider off, stun 2.5 s, triggers bailout | 155.2.7.85 | knights, cavalry / crossbows, archers | hooked blade (>= 2x2 so it survives the far mesh), lime sash | A hedge-pruning tool with a second career in knight removal. | M2 | |
| pikeman | Pikeman | Y | melee; spear, brace | hum1 pike, stocky 1.12 | pike 14 pierce cd 1.6 r3.4, brace x2.4 | stance pike_wall (existing brace, rooted) | 175.2.1.105 | cavalry, hog / archers, mangonel, fire | pike 2x his height; a block looks like a comb of poles | Holds a fourteen-foot pole perfectly still and calls it a career. | M2 | |
| longbowman | Longbowman | Y | ranged; archer | hum1 shoot | arrow 15 pierce ap .3 r44 cd 2.1, `arc:'high'`, hits air | none (volleys clear walls) | 105.2.6.100 | blobs, wyverns / cavalry, outranged by trebuchet | bow taller than the man, wide leaf-green brim hat | Draws so far back the arrow lands in another parish. | M2 | |
| peasant_levy | Peasant Levy | Y | swarm; organic | hum1 smock 0.92 | pitchfork 6 pierce cd 0.9 r2.0 | pack_bonus (mob: +8% per ally within 5 u, max +40%); morale fragile | 55.3.2.22 | siege crews by numbers / everything, fire panic | sack hat, three-tine fork, a turnip in the off-hand | Armed with a pitchfork, a turnip and a legitimate grievance. | M2 | |
| reeve | Reeve | Y | hero; officer, general | hum1 stocky, ledger on belt | quarterstaff 18 bash kb 3 | aura banner r11; war_horn "Muster" (+20% speed and dmg 8 s) | 540.2.7.380 | rallies levies / crossbows, cavalry | tall lime banner with a hedgehog on a 4.2 u pole | Collects rents, grievances and, today, a regiment. | M2 | |
| great_hog | Great Hog | Y | beast; boss, large, animal | quad1 species `boar` x2.2 | gore 34 pierce kb 9 | dash bull_charge 12 u, 34 dmg, 1 s stun | 1350.3.6.640 | lines, levies / braced pikes, springald | barrel body, upturned tusks (2x2), a ribbon on a tiny tail | Best In Show at the harvest fair. Has since turned on the judges. | M2 | B* |
| crossbowman | Crossbowman | G | ranged; xbow | hum1 xbow (new style) | bolt 26 pierce ap .55 r30 cd 3.2, flat (walls stop it) | M2b: prefers heavy and officer targets | 115.2.5.115 | knights, bosses / cavalry, slow reload | chunky stock, slate kettle-hat with a crenellated brim | Reloads in the time a knight takes to apologise. The knight is not apologising. | M4 | |
| pavise_bearer | Pavise Bearer | G | melee; shielded | hum1 + board shield 2.2 u | short sword 9 thrust | aura pavise r2.5 rear arc: allies take x0.5 projectile damage; plants (speed 0) | 200.2.0.130 | archers, crossbows (by cover) / flanks, mangonel, hook | a rectangular slate board taller than the man | Carries a door and calls it a strategy. | M4 | * |
| mangonel | Mangonel | G | siege; machine | catapult1 builder + 2 crew | pitch pot arc 28 fire aoe 3, ignites props and ground 5 s, r46, min 12, cd 5.5, groundOnly | misfire 4% (existing) | 210.1.1.240 | blobs, thatch, wooden engines / cavalry, wyvern | squat arm, flame-glint pot, lemon pennon | Throws burning pitch. The fire marshal is on the crew and has given up. | M4 | * |
| springald | Springald | G | siege; machine, AA | ballista1 builder + 2 crew | bolt 55 pierce ap .6 pierceN 3 r50 min 8 cd 4, hits air | none | 190.1.2.230 | wyverns, dragon, columns / cavalry, minRange | horizontal bow wider than its cart | A bolt thrower with a dragon problem and a fan club. | M6 | * |
| trebuchet | Trebuchet | G | siege; machine, large | trebuchet1 + 3 crew (9 + 30 = 39 parts) | boulder 90 blunt aoe 4.5 crater structDmg x4, r72 min 26, `arc:'high'`, cd 11, groundOnly | misfire 3% "counterweight incident" | 340.0.8.480 | walls, gates, camps / anything that closes in | counterweight box swinging, 10 u arm, the tallest static silhouette | The counterweight is a cart of rocks. The cart is also a rock. Nobody checked. | M6 | * |
| rolling_keep | Rolling Keep | G | siege; boss, machine, large | ram1 builder (tower variant, 8 parts + 3 lite crew) | drawbridge slam 44 blunt kb 8 structDmg x6; roof volley 8 bolts / 5 s r30 | bailout on death or wall contact: 6 crossbowmen + 4 pavise tumble out (M13) | 2300.0.9.780 | gates, lines / fire (flammable), oil, trebuchet | crenellated tower on four wheels, lowered bridge for a nose, banner on top | A castle that went for a walk and brought its opinions. | M6 | B* |
| castellan | Castellan | G | hero; officer, general | hum1 stocky | mace 22 blunt kb 3.5 | aura banner r10; call_strike "oil" (2 s telegraph, r4, 16 dps 6 s, cd 18) | 610.2.4.430 | gates, ram crews / trebuchet | slate banner with the cat-flap gate, key ring at the belt | Keeps fourteen keys to doors that have no locks. | M6 | |
| bellringer | Bellringer | B | support; organic | hum1 stocky | handbell mace 11 bash kb 4 | cc_field stun "Dong": r5, channel 1.2, stun 1.6 s, cd 14, enemies only | 150.2.4.125 | charging lines, giants / archers | a barrel-sized rose-and-mint bell on a pole, bell-shaped skirt | A man, a bell, and no inside voice. | M5 | |
| physician | Physician | B | support; organic | hum1 slim, beaked mask | cane 3 bash | heal_pulse r8, 28 hp, 5 targets, cd 6, organic only (M6a filter) | 100.2.5.150 | sustain / dies to anything | mint beak with 2x2 cross-section, knee-length black coat | Beaked, concerned, and billing by the sniff. | M5 | * |
| apothecary | Apothecary | B | ranged; support | hum1 throw | flask 4 + poison 5 dps 5 s aoe 2.2 r20 `arc:'high'` cd 3; applies NOHEAL | poison.proj (M6a) | 105.2.6.130 | healers, armour (poison ignores plate) / cavalry, mangonel | satchel of six coloured flasks, one smoking | Tonic and poison share a cupboard. The label fell off in the spring. | M5 | |
| plague_cart | Plague Cart | B | siege; support, organic | chariot1 + ox (quad1 `ox`) | ram 12 blunt | gas trail: dot_cloud gas r5, 5 dps 8 s, NOHEAL, cd 20 while moving (M13) | 430.1.8.330 | blobs, healers / fire (doubles the cloud, both sides), cavalry | cart of smoking barrels, sooty ox, a mint-green trail | Smells like Cassandra's last prediction. The wheel squeaks in a minor key. | M5 | * |
| abbess | Abbess | B | hero; support, officer, general | hum1 stocky | great bell staff 24 bash kb 4 | aura banner r10; heal_pulse r9, 40 hp; cc_field stun "Great Peal" r9 once per 30 s | 480.2.4.400 | strongest sustain / assassination | tall rose bell-skirt, 4 u bell staff, bell banner | Wields a bell as a weapon and a choir as a threat. | M5 | |
| sellsword | Sellsword | F | melee; organic | hum1 stocky, patchwork | greatsword 22 slash cd 1.6 r2.4 | rage (existing) hp < 50%: x1.4 dmg ("contract renegotiation") | 195.2.7.135 | infantry / pikes, crossbows | tobacco leather, one cyan shoulder patch, oversized sword | Fights for whoever's cheque cleared this morning. Check the date. | M1 | |
| poacher | Poacher | F | ranged; skirmisher | hum1 shoot, slim | shortbow 11 pierce r28 cd 1.3 | net (existing): r10 root 2.5 s cd 12, the anti-cavalry tool | 110.3.3.95 | cavalry (nets), siege crews / melee, longbows | hooded, feathered, a net coiled at the hip | Hunts the king's deer, the king's horse and, weekends, the king's cavalry. | M1 | |
| battering_ram | Battering Ram | F | siege; machine, large | ram1 + 4 crew under the roof | log 55 blunt kb 8 structDmg x6 | none | 480.1.5.260 | gates, walls / fire x1.8, oil, cavalry | roofed shed on wheels, ram's-head log, cyan patch panels | Knocks politely at first. Then structurally. | M6 | * |
| hired_giant | Hired Giant | F | monster; large, organic | hum1 x2.0 with bespoke giant parts | club 40 blunt kb 9 cd 2.0 | rage; "union break": 8% of swings are lunch (misaim-style) | 920.2.3.520 | lines / poison, springald, nets | smock like a tent, a tiny hat worn as safety equipment | Contract clause 12: no stairs, no sunlight, no small talk. | M5 | * |
| hoardling | Hoardling | W | swarm; organic | hum1 x0.7, squat, big ears | dagger 5 pierce cd 0.8 | "Shiny!" = cluck variant: taunt r5, 2 s, cd 12 | 45.4.0.20 | distracts, swarms / area damage | knee-high, huge sulphur coin sack, one coin glinting | Carries one coin everywhere. Will not discuss it. | M7 | * |
| coin_golem | Coin Golem | W | monster; boss, large | hum1 x1.9 with bespoke coin parts | slam 32 blunt kb 8 | summon_on_death: 6 hoardlings (M13) | 1100.1.7.620 | wall of hp / trebuchet, blunt | torso stacked from gold coins, a slot on the head, a spoon in a pocket | A mountain of savings that finally got up and did something. | M7 | B* |
| wyvern | Wyvern | W | monster; air | dragon1 (wyvern) | dive bite 28 pierce ap .3 | air state machine (M7): cruise, dive, retreat; lands to melee when hurt | 270.5.0.260 | archers, siege crews / longbow, springald, crossbow | two-segment bat wings (>= 2 voxels thick), barbed tail, sulphur belly | A dragon's smaller cousin: faster, ruder, eligible for its own complaints. | M7 | * |
| bridge_troll | Bridge Troll | W | monster; boss, large | quad1 species `troll` (knuckle-walker x1.8) | fist 38 blunt kb 8 | toll aura: cc_field passive slow 30% r7; enrage when his booth falls | 1500.2.6.700 | chokepoints / kiting, bridge drop | hunched back, knuckles on the ground, tiny hat, receipt book | Demands a toll, a receipt and your full name, in that order. | M8 | B* |
| cinderwyrm | Cinderwyrm | W | monster; boss, air, large | dragon1 full (20 parts) | `dragonfire` cone fire aoe 3.5 r26 (ignites), claw 40, tail sweep | aura scare r12; wing gust (cc_field push); lands at 40% hp (M7 boss landing) | 2700.4.2.1400 | blobs, walls / springald, longbow volleys | wings with 2-voxel membranes, glowing belly, sulphur over oxblood | Slept four hundred years. Woke up cranky. Somebody took a spoon. | M7 flyby, M9 | B* |

**Designed counter web (written BEFORE measuring, for ER7):** pikes and stakes > cavalry (brace x2.4); billmen unhorse knights (hook -> bailout), crossbows beat plate (ap .55); cavalry > archers, crew and levies; longbows and springalds > wyverns and the dragon (only things that hit air besides crossbows); poison + NOHEAL > healers; fire (pitch, oil, burning thatch) > wooden engines, rams, levies (morale); trebuchet > anything static, loses to anything that reaches it; bell stun breaks charges; nets (poacher) break horses; mud (god power) cancels charges. Claimed non-counter: longbow vs crossbow (50% band, longbow wins range, crossbow wins armour).

**Silhouette contract:** 18 bespoke silhouettes (lancer, knight_errant, pageant_dragon, great_hog, pavise_bearer, mangonel, springald, trebuchet, rolling_keep, physician, plague_cart, battering_ram, hired_giant, hoardling, coin_golem, wyvern, bridge_troll, cinderwyrm) against the floor of 15; the 5 bosses are 5 different silhouettes (dragon, knuckle-walker, tower on wheels, boar, coin pile) and only the hired giant and the coin golem are scaled hum1. Per faction a silhouette-unique unit: M pageant dragon, Y great hog, G rolling keep, B plague cart, F battering ram, W cinderwyrm. Hum1 body types vary inside each faction (0.92 / 1.0 / 1.12 scaling) so no faction has more than two units sharing a body.

**Team-tint plan (tint floors are hard to hit on heraldic armour, so the team colour sits where the eye goes):** Marrowby surcoat and caparison chequers; Yeomen sash, hat band and banner cloth; Gatehouse pavise face, kettle brim and machine pennons; Bellfount bell-skirt hem, bell and beak trim; Free Company the cyan patches (patch = team colour); Wyrmkin coin sack, belly glow and wing membrane edge. Banner cloth and ground ring carry team colour everywhere, so the banner doubles as the team marker.

**Animation highlights (the clips I would fight to keep):**
| unit | the moment worth watching | clip note |
|---|---|---|
| knight_errant | horse collapses, knight rolls off, stands up in stages, brushes off a shoulder, says "Ahem" (bubble) | `bailout_getup` 1.2 s, hum1 death-to-getup blend, bubble `ahem` |
| standard_bearer | waves the pennant in a figure eight when the army cheers; lowers it to the ground like a very sad fishing rod when hurt | idle variants, hit reaction lowers `weapon` |
| lancer | couches the lance, leans over the horse's neck, lance splinters into six voxel chunks on impact | `charge_couch` pose, render-only splinter fx |
| pikeman | brace: knee drops, pole butt plants with a visible thunk, pole tip dips | `brace` hold pose, 0.3 s plant |
| trebuchet | crew heave the winch; counterweight drops slowly; the arm whips; the sling releases | `launch` 1.8 s, `reload` winch crank |
| pageant_dragon | waddles with two out-of-step pairs of boots; tail wags a half beat late (Dennis) | quad1 `costume` gait, tail lag |
| hired_giant | swings, then looks at his watch for 1 s on a union break; scratches his head | rare idle-combat variant |
| hoardling | juggles its one coin while walking; clutches the coin sack on death | loco overlay |
| physician | leans the beak in to inspect an ally, nods gravely, taps the ally's chest | heal cast clip |
| bellringer | winds up the bell like a hammer throw and rings it with both hands; the head rings too | `strike_bell` 1.0 s |
| battering_ram | the log swings back slowly and forward fast; the roof rattles | `strike_ram` loop |
| rolling_keep | the drawbridge nose lowers onto the wall with a long chain rattle and a puff of dust | `launch` ramp clip |
| wyvern | folds the wings and drops in a dive; flaps twice to pull out; the shadow blob races ahead | air loop, dive clip |
| cinderwyrm | rears, inhales (belly glows), breathes a cone; wings gust a ring of dust | `breathe`, `roar`, `fly` loops |

---

## 4. Twelve arenas

Sizes: small 64 u, medium 96 u, large 128 u. Theme vocabulary (one canonical set): `meadow ford forest village abbey castle moor mountain`, `env.era:'medieval'`. New materials appended 16+: `flagstone` (castle floors, 1.1), `mud_deep` (0.6), `lists_sand` (tourney sand, 0.95), `heather` (moor, 0.9), `ash_scree` (mountain, 0.85). Vehicle corridors >= 6 cells everywhere the roster has rams, trebuchets or the Rolling Keep. Each arena <= 35 visible (type, variant) prop batches.

| id | name | size | biome / theme | signature features | objectives it suits | set-piece it suits |
|---|---|---|---|---|---|---|
| pageant_green | The Pageant Green of Marrowby | medium | grass / meadow | bunting between poles, a maypole, a grandstand of crowd props, hay bales, a mini tilt, the dragon float | eliminate, survive | banner fall in front of the grandstand; crowd cheer |
| tourney_field | Tourney Field of Little Pomping | medium | lists_sand / meadow | two long lists divided by a central tilt barrier, striped pavilions at both ends, stands on both flanks, 60 u charge run-up | kill_general, eliminate | low tilt-track shot of a lance chorus |
| ford_of_dithering | The Ford of Dithering | medium | grass + shallow water / ford | 14 u wide shallow ford (x1.7 cost), a stone bridge beside it, a mill, willows, spike stakes on the south bank | hold_hill, escort, survive | high crane over the pike line as the charge breaks in the water |
| pennywhistle | Pennywhistle Village | medium | dirt / village | thatched cottages, a windmill with animated sails, a stone market square, a well, haystacks | escort, capture, survive | burning windmill orbit; fire running along thatch |
| bellfount_abbey | Bellfount Abbey Grounds | medium | grass + flagstone / abbey | cloister walls, a bell tower, herb beds, a fish pond, three capture spots | capture, hold_hill, survive | mint gas cloud drifting through the cloister |
| castle_dour | Castle Dour (the siege map) | large | grass + flagstone / castle | moat with a drawbridge, curtain wall with four round towers, gatehouse + gate + portcullis, hoardings, oil cauldrons, keep on a motte, attacker camp 70 u away | destroy, defend_core, eliminate | inside-out shot as the gate falls |
| dour_courtyard | Dour Courtyard (the Grand Pageant stage) | medium | flagstone / castle | enclosed bailey, the keep, bell tower, grandstand, maypole, bunting, crowd props that panic | kill_general, defend_core, survive | dragon meets Dennis |
| long_bridge | The Long Bridge of Toll | medium | stone + deep river / ford | a 40 u stone bridge over a deep (impassable) river, two shallow fords at the flanks, a toll booth, parapets | survive_waves, escort, kill_general | the bridge drop (editTerrain) |
| mount_perpetual | Mount Perpetual | large | ash_scree + lava creek / mountain | switchback road, hoard heaps with glints, the lair mouth, a dragon skull ("previous tenant"), ash weather | defend_core, survive, kill_general | dragon shadow sweeping the camp |
| under_wood | The Underwood | large | moss + dirt / forest | old oaks, hedgerow lanes, fog, sunken tracks, ambush pockets | escort, eliminate (ambush) | ambushers rising from the hedges |
| mizzlemoor | Mizzlemoor Beacons | medium | heather + mud_deep / moor | bogs that slow, standing stones, three beacon braziers on low hills, drifting fog | capture, hold_hill | beacons lighting one after another |
| siege_camp | The Besiegers' Camp | medium | trampled turf / meadow | tents, mantlets, trebuchet pits, a palisade, a ditch, supply carts | defend_core, survive_waves, destroy | the sally from the gate |

Campaign uses 9 (all but under_wood, mizzlemoor, siege_camp, which serve Quick, puzzles, survival and the daily). Wall design follows Troy's pattern (touching circles on a levelled strip) so every curtain wall is a chain of `med_curtain_wall` props; moats are channels under the single water plane; the drawbridge is a soft prop that blocks the lane until a script lowers it (`editTerrain`), or collapses into the moat.

---

## 5. Thirty-eight props

`blocks` F = full, N = none; `cover` C; `flam` Y/N; hp INF = indestructible. Categories reuse the four existing (nature, architecture, monuments, props). Shared generic props stay `any` (tree_oak, tree_pine, bush, rock_small, rock_big, log, campfire, reeds, wheat, barrel, crate, bones). Buildings use voxel 0.2.

| id | cat | r x h | hp | blocks / cover | flam | destructible role |
|---|---|---|---|---|---|---|
| med_curtain_wall | architecture | 1.2 x 5 | 800 | F / C | N | the breach: ram x6, trebuchet x4; dies to a rubble gap |
| med_round_tower | architecture | 2.0 x 10 | 1300 | F / C | N | corner anchors; falls with a dust ring |
| med_castle_gate | architecture | 2.4 x 5 | 1000 | F / C; team-owned, passable to its owner | N (oak burns only under 40%) | THE destroy target (M12 gate) |
| med_portcullis | architecture | 2.0 x 5 | 900 | F / C | N | second gate behind the first; arrows x0.2, rams and trebuchets only |
| med_drawbridge | architecture | 2.2 x 4 | 500 | F raised, passable lowered / C | Y | script lowers it; destroyed it drops into the moat |
| med_hoarding | architecture | 1.2 x 3 | 300 | N / C | Y | wooden wall gallery; burn it to strip cover and spill oil |
| med_keep | architecture | 5.0 x 16 | 2500 | F / C | N | the defend_core prop; crumbles in stages |
| med_bell_tower | architecture | 1.8 x 12 | 900 | F / C | N | capture point; rings when it dies |
| med_gatehouse_arch | architecture | 0 x 8 | 900 | N / N | N | decor facade (splash damage only) |
| med_palisade | architecture | 0.6 x 2.6 | 250 | F / C | Y | field fortification; cheap breach practice |
| med_bridge_parapet | architecture | 0.5 x 1.2 | 200 | F / no | N | low rail on bridges; craters knock gaps |
| med_cottage | props | 1.5 x 3.5 | 220 | F / C | Y | thatch; burns and spreads |
| med_windmill | props | 2.0 x 9 | 500 | F / C | Y | animated sails; the burning-windmill landmark |
| med_market_stall | props | 0.9 x 2.5 | 80 | F / C | Y | striped awning cover; cheap |
| med_well | props | 0.7 x 1.2 | INF | F / no | N | capture marker; decor |
| med_haystack | props | 1.0 x 2.0 | 40 | F / C | Y | instantly flammable; fire starter |
| med_hedge | nature | 0.6 x 1.8 | 90 | F / C | Y | hedgerow segment; lanes and ambush |
| med_supply_cart | props | 1.2 x 1.8 | 120 | F / C | Y | cover; the war chest core in M7 |
| med_war_tent | props | 2.0 x 3.2 | 160 | F / C | Y | commander tent |
| med_pavilion | props | 2.0 x 4.0 | 200 | F / C | Y | striped lists tent in rust and cream |
| med_grandstand | props | 4.0 x 4.0 | 400 | F / C | Y | holds crowd props; collapses spectacularly |
| med_tilt_barrier | props | 0.5 x 1.2 | 120 | F / no | Y | joust fence; funnels the charge |
| med_maypole | props | 0.3 x 6.0 | 150 | F / no | Y | ribbons animate; falls over (gag) |
| med_bunting | props | 0 x 4.0 | 20 | N / N | Y | pennant strings; burns in a visible ripple |
| med_scarecrow | props | 0.3 x 2.2 | 40 | N / N | Y | decor; has seen things |
| med_oil_cauldron | props | 0.8 x 1.6 | 140 | F / no | N | explosive prop (M12): on death or script pours burning oil r4, 16 dps 6 s |
| med_pitch_barrel | props | 0.4 x 1.0 | 40 | F / no | Y | explosive prop r3, 45 fire dmg, chains |
| med_mantlet | props | 1.0 x 2.0 | 200 | F / C | Y | attackers' portable wall |
| med_spike_stakes | props | 0.4 x 1.0 | 60 | F / no | Y | anti-cavalry stakes; horses path around |
| med_toll_booth | props | 1.2 x 3.0 | 300 | F / C | Y | the troll's booth; breaking it enrages him |
| med_old_oak | nature | 1.0 x 8.0 | 300 | F / C | Y | huge cover tree |
| med_willow | nature | 0.5 x 5.0 | 90 | F / C | Y | river banks |
| med_standing_stone | nature | 0.8 x 3.0 | INF | F / C | N | moor cover |
| med_dragon_skull | monuments | 2.0 x 4.0 | INF | F / C | N | the previous tenant |
| med_hoard_pile | monuments | 1.5 x 1.5 | INF | N / N | N | glowing coins and one spoon |
| med_lair_mouth | monuments | 3.0 x 6.0 | INF | F / C | N | glowing cave; wyvern spawn point |
| med_beacon_brazier | props | 0.6 x 5.0 | INF | F / no | N | capture marker; lights when held (glow voxels) |
| med_peasant_crowd | props | 0 x 2.0 | INF | N / N | N | animated spectators in smocks; panic at fire and dragons |

---

## 6. The nine missions

Schema fields follow MS. Currency groats. Helpers are drawn from a closed vocabulary I propose: `thrift(par) underTime(s) noLoss(defs) vipUntouched() bannerDownBy(s) ownBannerStanding() bannersDropped(n) propsBurned(type,n) usedMechanic(id,n) coreHpAtLeast(f) scriptDone(id) braceKills(n) chargeKills(n) dismounts(n) airKills(n) healed(n)`. Star 1 = win; star 2 = win with at least half the army (by cost) alive; star 3 tests only mechanics taught in EARLIER missions or none. Curve: 8 objective types over 9 missions, one new mechanic each (M8 none), finales M3, M6, M9 combine >= 2 earlier mechanics. Announcer slot is always `campaign_<id>` sub `setpiece`, priority max, bypassing alternation; shots run real-time with the sim at 0.5x.

### ACT I: PAGEANT SEASON

**M1 `med_dress_rehearsal`, "Dress Rehearsal (Swords Are Foam)"** . eliminate . arena pageant_green (medium, seed 21)
- Player Marrowby; roster squire, lancer, standard_bearer, pageant_dragon; budget 2,800; core standard_bearer x1 pre-placed.
- Enemy Free Company, style "hired actors": sellsword x9, poacher x6, plus one borrowed standard_bearer. Special: they brought the real swords. No boss.
- Teaches: BANNER AND ROUT (beat `med_beat_banner`: pointer on the enemy pennant, "Knock down the flag and watch what the people under it do"). Tests: nothing yet.
- Star 2 half army alive. Star 3 `thrift(2100)`.
- Set-piece `med_sp_banner_fall`: first enemy banner dies with >= 6 allies inside its ring. Shot: low behind the falling pole, rise to a high wide over the fleeing line, 4 s, ease-out. Stinger `med_sting_banner` (kazoo-brass "wah wah waaah" resolving into a fanfare). Sfx banner_fall, crowd_gasp, one bunting tear. Announcer: Brutus "THE FLAG IS DOWN! They are running! They have DROPPED THE BUNTING!"
- First three minutes: 0:00 arrival card (intern note), 0:10 placement beat (place the bearer near the lancers), 0:50 first contact, 1:30 banner falls, 2:10 victory with Dennis cheering.
- Reward: Workshop weapon `med_foam_sword`, era mutator `med_foam_swords`, codex squire / standard_bearer / sellsword, title "Understudy".
- Par 2,100 groats / 150 s. Attempts star1 1.2, star3 2.4.
- Briefing. Brutus: "WELCOME to the Grand Pageant! Bunting! A crowd! And a dragon that is, we are told, TWO MEN!" Plato: "The invaders were hired from an agency. If a mercenary is paid to lose, is he acting, or merely overqualified?" Cassandra: "The contract said 'weapons supplied by the agency'. The agency supplies real ones. Page nine. Nobody reads page nine."

**M2 `med_tourney_trouble`, "Lances, Allegedly Blunted"** . kill_general . arena tourney_field (medium, seed 22), marker `reeve_start`
- Player Marrowby; roster squire, lancer, knight_errant, standard_bearer; budget 5,200.
- Enemy Yeomen, style "uprising in the cheap seats": reeve (general, hold, behind spike stakes), great_hog x1 (his bodyguard), pikeman x12 (hold), billman x8, longbowman x10, peasant_levy x16.
- Teaches: CHARGE (momentum builds over a 12 u run-up; lances shatter on the first hit; pikes and stakes punish a head-on charge). Tests: banner (the reeve carries the Yeomen banner; drop it and the levies fold).
- Star 3 `bannerDownBy(45)`.
- Set-piece `med_sp_lance_chorus`: >= 5 lancer charge hits within 1.5 s. Shot: low side-on tilt track along the charge, 4 s, sim slowed to 0.5x. Stinger `med_sting_charge` (galloping snare and a horn). Sfx lance_shatter x5, hoof_thunder, crowd_ooh. Announcer: Plato "A lance is a tree that has been given a purpose, and will be given a second one in a moment."
- Reward: part `med_plumed_great_helm`, codex lancer / knight_errant / reeve / great_hog, title "Tilt Enthusiast".
- Par 80 s to the reeve. Attempts star1 1.5, star3 3.5.
- Briefing. Brutus: "THE TOURNEY! Lances! Plumes! And a peasant uprising in the cheap seats, which is a first for the programme!" Plato: "The lances are blunted. By whom, and after how many complaints?" Cassandra: "Charge a wall of poles and the horse remembers it. Once. I said so in the stands. They sat on me."

**M3 `med_ford_dithering`, "The Ford at Dithering (Please Hold Still II)"** . hold_hill (ACT FINALE) . arena ford_of_dithering (medium, seed 23), marker `ford` r7, hold 150 s, clock stops while an enemy stands on it
- Player Yeomen; roster pikeman, billman, longbowman, peasant_levy, reeve; budget 6,500; core reeve x1.
- Enemy Marrowby, 3 waves (30 s apart): W1 lancer x8, squire x14, standard_bearer x1; W2 knight_errant x5, lancer x6, squire x10; W3 ser_valiant x1, knight_errant x6, standard_bearer x2 (knight_afoot x6 arrive by bailout). No boss.
- Teaches: BRACE AND THE SPEAR WALL (pole butts in the ground; the ford's water and the stakes slow the charge). Tests: charge (as defence) and banner: breaking the standard bearers staggers each wave.
- Star 3 `ownBannerStanding()`.
- Set-piece `med_sp_brace_break`: >= 6 cavalry die to brace within 10 s. Shot: high wide over the pike line toward the ford, dust and splashes, 5 s. Stinger `med_sting_brace` (a single enormous drum hit and a creak). Sfx pike_brace_thunk, splash, horse neigh chorus. Announcer: Plato "Is a ford a place, or a decision the horses had already made?"
- Reward: part `med_long_pike`, Quick unlock enemy style "Charge of the Wobbly Brigade", codex pikeman / billman / ser_valiant, title "Ford Keeper".
- Par 150 s. Attempts star1 2.0, star3 3.5.
- Briefing. Brutus: "THE FORD AT DITHERING! A river, a bridge, and nobody can decide which one to use! HUZZAH! ...is that right yet?" Plato: "Today we are the peasants. Is a pike a weapon, or a very firm opinion on a stick?" Cassandra: "Plant the butts in the ground. The horse will not stop. The horse will not be consulted."

### ACT II: SIEGE SEASON

**M4 `med_pennywhistle_blaze`, "Pennywhistle Is Not On Fire (Yet)"** . protect_vip (escort) . arena pennywhistle (medium, seed 24), markers `float_start`, `green` (exit)
- Player Yeomen; roster billman, pikeman, longbowman, peasant_levy, reeve; budget 5,600. Fixed VIP: the pageant_dragon ("The Float", hp override 240, speed 1.6): the village's dragon must reach the green.
- Enemy Gatehouse raiders: mangonel x3 (on the hill, 45 u), crossbowman x14, pavise_bearer x8, springald x1; second crossbow group (x8) flanks at 70 s. No boss.
- Teaches: FIRE (pitch pots ignite thatch; fire spreads along flammable props and ground for 5 s; stone lanes are safe; fire panics levies). Tests: banner (the reeve's banner steadies levies under fire).
- Star 3 `vipUntouched()`.
- Set-piece `med_sp_windmill_blaze`: the first pitch pot hits the windmill. Shot: orbit the burning sails 4 s, pan to the float. Stinger `med_sting_fire` (a rising brass swell and a cymbal). Sfx fire_whoosh, wood_crack, crowd_gasp. Announcer: Brutus "THE WINDMILL IS DOING A BIT! The sails are ON FIRE and still going round!"
- Reward: part `med_bucket_helm`, codex mangonel / crossbowman / pavise_bearer, title "Fire Marshal (Unlicensed)".
- Par 150 s. Attempts star1 1.8, star3 3.0.
- Briefing. Brutus: "PENNYWHISTLE! Thatch! More thatch! And a windmill about to become a LANDMARK in a different sense!" Plato: "We must walk a costume dragon through a burning village. Is the dragon the cargo, or the plan?" Cassandra: "Fire follows thatch. Thatch follows fire. Take the stone lane and watch the roofs."

**M5 `med_plague_foretold`, "Plague, As Foretold"** . capture (3 points) . arena bellfount_abbey (medium, seed 25), markers `herbs`, `well`, `bell` r6
- Player Bellfount; roster bellringer, physician, apothecary, plague_cart, abbess; budget 6,200. Win: hold all three points at once for 30 s cumulative.
- Enemy Free Company: sellsword x16, poacher x10, battering_ram x1 (goes for the bell tower), hired_giant x1 (arrives at 80 s from the west gate). Boss: none (the giant is the exam).
- Teaches: HEALERS AND POISON (heal_pulse on organics only; poison flasks apply NOHEAL; gas clouds drift and hurt both sides). Tests: banner (the abbess).
- Star 3 `noLoss(['physician'])`.
- Set-piece `med_sp_gas_wagon` (Cassandra's moment): at 45 s a cart overturns by the well and a mint cloud drifts through the cloister. Shot: follow the cloud over the cloister 5 s. Stinger `med_sting_plague` (a drone, an oboe, a bell toll). Sfx bell, hiss, a chorus of polite coughs. Announcer: Cassandra "Plague. I said plague. Tuesday. It is Thursday." Brutus: "CASSANDRA WAS RIGHT?!"
- Reward: era mutator `med_plague_season`, part `med_beak_mask`, codex physician / apothecary / plague_cart / abbess, title "Right (Once)".
- Par 170 s. Attempts star1 2.0, star3 3.2.
- Briefing. Brutus: "THE ABBEY! Bells! Herbs! Healers with beaks that are, I am assured, medical!" Plato: "The medicine cupboard and the poison cupboard are the same cupboard. Which arrangement is more honest?" Cassandra: "There will be plague. I said so Tuesday. Today is Thursday. For once I am early."

**M6 `med_castle_dour`, "Please Knock (We Did)"** . destroy (ACT FINALE) . arena castle_dour (large, seed 26)
- Player Gatehouse League (besieging a castle that locked itself against its own league) + one hired battering_ram; roster pavise_bearer, crossbowman, mangonel, springald, trebuchet, battering_ram, rolling_keep, castellan; budget 11,000; core rolling_keep x1.
- Enemy Castle Dour garrison (Gatehouse): crossbowman x18, pavise_bearer x12, springald x2, mangonel x2, castellan x1, 6 oil cauldrons, 6 hoardings, gate + portcullis. Objective: destroy `med_castle_gate` and `med_portcullis`.
- Teaches: SIEGE (gates are team-owned; structDmg: rams x6, trebuchets x4 over the wall with `arc:'high'` and minRange; oil cauldrons punish a clumped ram). Tests: FIRE (burn hoardings) and BANNER (the castellan's) together.
- Star 3 `propsBurned('med_hoarding', 3)`.
- Set-piece `med_sp_gate_falls`. Shot: through the arch from inside the bailey toward the dust cloud as the ram appears, 5 s. Stinger `med_sting_breach` (a timpani hit and a woodwind fall). Sfx ram_gate_boom, wall_collapse, iron_twang. Announcer: Brutus "THE DOOR HAS BEEN OPENED! There was a knock! There was definitely a knock!"
- Reward: part `med_siege_maul`, Quick unlock "Siege Season" preset (castle map plus garrison), codex trebuchet / battering_ram / castellan / rolling_keep, title "Door Knocker".
- Par 140 s to the gate. Attempts star1 2.5, star3 4.0.
- Briefing. Brutus: "CASTLE DOUR! A gate! A SECOND gate behind the first gate! HUZZAH for gate-based INFRASTRUCTURE!" Plato: "The castle has locked its gate against its own league. Is a siege merely a conversation conducted at volume?" Cassandra: "This will take nine days. Then eleven. They will lose the first ladder and bring the second after the first has been found."

### ACT III: DRAGON SEASON

**M7 `med_spoon_in_the_hoard`, "Somebody Took The Spoon"** . defend_core . arena mount_perpetual (large, seed 27)
- Player Allied Truce (mixed); roster longbowman, springald, crossbowman, pavise_bearer, pikeman, standard_bearer, physician, trebuchet; budget 9,000; core: the war chest `med_supply_cart` (hp 2,400, survive 240 s).
- Enemy Wyrmkin, 3 waves: W1 (15 s) hoardling x40, wyvern x2; W2 (70 s) hoardling x30, wyvern x4, coin_golem x1; W3 (130 s) wyvern x6, coin_golem x2. At 100 s the Cinderwyrm flies over (non-attacking).
- Teaches: THE AIR LAYER AND ANTI-AIR (melee cannot reach wyverns; longbow, crossbow and springald can; pavise boards soak dives). Tests: HEAL (physicians behind the pavise line).
- Star 3 `coreHpAtLeast(0.7)`.
- Set-piece `med_sp_dragon_flyby`: the Cinderwyrm's shadow sweeps the camp, units cower, a scorch line crosses the far hill. Shot: low angle from the camp, dolly up 5 s. Stinger `med_sting_dragon` (a low brass note and a distant roar). Sfx dragon_roar, wing_flap_big, fire_whoosh. Announcer: Cassandra "Lovely day for it."
- Reward: part `med_scale_pauldrons`, codex wyvern / springald / coin_golem / hoardling, title "Spoon Detective".
- Par 180 s. Attempts star1 2.2, star3 3.5.
- Briefing. Brutus: "MOUNT PERPETUAL! Lava! Coins! A hoard with its own WEATHER! And, I am told, a missing SPOON!" Plato: "Something flies that is not in the contract. Does a contract bind a wyvern, or merely amuse it?" Cassandra: "The dragon wakes in the third act. This is the third act. They said it was only Thursday."

**M8 `med_toll_bridge`, "The Toll Bridge Is Currently Closed (For You)"** . survive_waves (4) . arena long_bridge (medium, seed 28)
- Player Allied Truce; roster pikeman, billman, longbowman, crossbowman, pavise_bearer, trebuchet, mangonel, springald, standard_bearer, bellringer, physician, lancer, knight_errant; budget 12,000.
- Enemy Wyrmkin: W1 hoardling x50; W2 wyvern x4, hoardling x30, coin_golem x1; W3 hoardling x40, wyvern x4, coin_golem x1; W4 bridge_troll (boss) + coin_golem x2 + wyvern x4.
- Teaches: nothing new (a deliberate exam of brace, artillery, banner, anti-air, heal). Optional trick: crater the bridge under the troll.
- Star 3 `scriptDone('med_sp_bridge_drop')` (artillery, taught M6).
- Set-piece `med_sp_bridge_drop`: a trebuchet crater under the troll drops the deck section. Shot: side-on along the deck, 5 s: the span folds, the troll hangs, splash. Stinger `med_sting_splash` (a tuba "wah"). Sfx boulder_impact, wall_collapse, big_splash, troll groan. Announcer: Plato "He asked for exact change. We gave him the river."
- Reward: part `med_toll_club`, codex bridge_troll, title "Toll Collector".
- Par 230 s. Attempts star1 2.5, star3 4.0.
- Briefing. Brutus: "THE TOLL BRIDGE! A troll with a TILL! Bring exact change and a very long POLE!" Plato: "If the troll demands a toll and you pay in blows, is the transaction complete?" Cassandra: "He will say the bridge is closed. The bridge is open. Neither of us will be consulted."

**M9 `med_grand_pageant`, "The Grand Pageant (Real Dragon Edition)"** . kill_general (FINALE) . arena dour_courtyard (medium, seed 29)
- Player Allied Pageant; roster squire, lancer, knight_errant, standard_bearer, longbowman, pikeman, crossbowman, pavise_bearer, springald, trebuchet, physician, abbess, bellringer, castellan, mangonel, pageant_dragon; budget 14,000; core pageant_dragon x1 ("Dennis").
- Enemy Wyrmkin: Cinderwyrm (general, binding), wyvern x6, hoardling x50, coin_golem x2, bridge_troll x1 (soaked and cross). Waves at 20 s, 60 s, 100 s.
- Phases: air (strafing the crowd, 0-60% hp), lands at 40% hp for melee, tail-sweep ground phase. Combines AIR, ARTILLERY, BANNER, HEAL and CHARGE.
- Star 3 `noLoss(['pageant_dragon'])`: Dennis survives.
- Set-piece `med_sp_dennis_meets_dragon`: when the Cinderwyrm lands, the costume dragon steps up to it; the real dragon pauses 2 s, tilting its head. Shot: low two-shot, slow push in, 6 s. Stinger `med_sting_finale` (full brass over a kazoo). Sfx dragon_roar, kazoo, crowd_gasp. Announcer: Cassandra "That is not Dennis."
- Reward: part `med_gilded_spoon` (the largest spoon ever issued as a weapon), Quick unlock "Dragon Day" preset, all remaining codex pages, title "Dragon-Adjacent Person"; the finale payoff card (section 10).
- Par 200 s. Attempts star1 3.0, star3 5.0.
- Briefing. Brutus: "THE GRAND PAGEANT! FINALLY! Bunting! A crowd! A REAL dragon! I bought a better tabard for this one!" Plato: "We have rehearsed for nine battles. Is a rehearsal still a rehearsal when the dragon is real?" Cassandra: "That is not Dennis. Nobody listen to me. I will sit here with the tonic."

---

## 7. Six puzzles

Hand-placed enemy, roster-limited, free retries; solutions stored and checked in Chromium (ER9).

| id | title | taught mechanic | trick |
|---|---|---|---|
| med_stakes_and_stones | Stake Your Claim | brace | five lancers charge at a ford; the pikes must stand IN the water so the run-up dies before contact; set them on Hold, not Advance |
| med_mind_the_step | Mind The Step | bailout (dismount) | three knight_errants charge; the horses die but the knights get up for 1.2 s; crossbowmen placed behind the horses hit the stand-up window |
| med_standard_deviation | Standard Deviation | banner and rout | 24 levies behind one standard bearer; ignore the crowd, spend the whole budget on three longbowmen with a clear line to the pennant |
| med_oil_you_need | Oil You Need | explosive props and fire | a ram column marches between pitch barrels and an oil cauldron; shoot the barrels at the head of the column, not the ram |
| med_physician_heal_thyself | Physician, Heal Thyself | healers and poison | an enemy abbess out-heals your damage; apothecaries' NOHEAL flask first, then the burst |
| med_counterweight_calculus | Counterweight Calculus | artillery (arc, minRange) | one trebuchet, one gate, a sallying garrison; park the trebuchet outside its 26 u minimum, screen it with a pavise, and do not fire early |

---

## 8. Six god powers and the intern gag

Slot semantics stay stable: 1 quick strike, 2 big strike, 3 area control, 4 heal/repair, 5 status, 6 summon/reinforce. All map onto existing effect families through the GodPower schema (M15); three are reskinned Ancient effects and three are signature. The intern is only ever named in tooltips, never shown.

| slot | id | name | effect family | effect | telegraph | cooldown class | tooltip |
|---|---|---|---|---|---|---|---|
| 1 | med_royal_volley | Royal Courtesy Volley | lightning (point strike) | 7 arrows in r3.2, 55 total, 0.6 s delay | six thin shadows converge | short (9 s) | A volley from archers who are not there. The intern was told "a bit of lightning" and sent an archery club. |
| 2 | med_bell_drop | Bell From Above | meteor template (areaDamage + crater) | r5.5, 240 dmg, 1.5 s stun, leaves a bell wreck | growing shadow ring, a rising DONG | long (50 s) | A very large bell, from a high shelf. Dropped by the intern, who thought it was a pageant prop. |
| 3 | med_mud_season | Mud Season | quicksand hazard / cc_field slow | r11, 9 s, SLOW 45%, cancels charge momentum | brown rain sheet expands | medium (28 s) | It rains on exactly one field. Meteorologists object. Cavalry object more. |
| 4 | med_soup_cart | Soup Cart of Plenty | heal_pulse (+ repair via M12) | r9, 45% max hp over 4 s on organics, +25% hp on gates and walls | a cart rolls in with a steam plume | medium (32 s) | The soup is hot. The soup is, medically speaking, soup. |
| 5 | med_precedence_dispute | Order of Precedence | cc_field confuse | r8, CONFUSE 5 s: they stop to argue who bows first | golden ring of bowing figures | medium (26 s) | A rule of etiquette with a fatal flaw: it applies to everyone. |
| 6 | med_audience_joins | The Audience Gets Involved | summon / reinforce | 8 peasant_levy + 1 pageant_dragon from your zone's edge | banner stand flash, crowd cheer | long (70 s) | The spectators have had enough of watching. Cast by the intern, who was only meant to hold the programme. |

Intern surfaces (never on screen as a character): arrival card, god-power tooltips, chooser caption ("MEDIEVAL. The intern says this is the right century. The sticky note says 'roughly'."), and one stalemate line (the watchdog calls a RECESS: the Herald rings a bell, both armies stop for tea, then Dennis walks on; era `intervention {kind:'recess', unit:'pageant_dragon'}`, mascot `pageant_dragon`).

---

## 9. Mutators, achievements, survival

**Two era mutators (plus the shared nine).**
1. `med_foam_swords` "Pageant Rules": every weapon is foam: damage x0.6, knockback x2, no crits, a "bonk" on every hit, fallen soldiers "knocked out" and sat up laughing. Battles last longer and cavalry bounce. Unlocked by M1. Disabled with a reason when combined with `glass_cannons`.
2. `med_plague_season` "Plague Season": healing halved, a mint cloud drifts across the field every 40 s, units cough politely. Unlocked by M5. Cassandra's favourite. Disabled with a reason for `wine_rain_always` (healing clash).

**Twelve achievements** (3 generated per era, 9 authored, 1 hidden):
1. `med_history` "Medieval Times (Mostly Mud)": finish the Medieval campaign.
2. `med_overachiever` "Overachiever, Allegedly Noble": 27 stars in Medieval.
3. `med_tourist` "Grand Tour of Damp Places": fight on all 12 Medieval arenas.
4. `med_pennant_hunter` "Pennant Hunter": drop 3 enemy banners in one battle.
5. `med_unhorsed` "Unhorsed and Unbothered": 10 bailouts (knights dismounting) in one battle.
6. `med_hold_still` "Please Hold Still (Again)": 15 cavalry killed by brace in one battle.
7. `med_gate_crasher` "Gate Crasher": destroy a gate within 60 s of Fight with a ram.
8. `med_wyrm_warranty` "Dragon Insurance Claim": kill a Cinderwyrm.
9. `med_oil_painting` "Oil Painting": 20 kills from oil or fire patches in one battle.
10. `med_saved_by_the_bell` "Saved By The Bell": stun 30 enemies with Dong or Great Peal in one battle.
11. `med_counterweight` "Counterweight Incident": a trebuchet misfire launches its own crew.
12. HIDDEN `med_dennis` "Dennis Takes The Credit": win with only pageant dragons alive.

**Survival (20 wave names, 5 boss waves, `faction:'medieval'` pool of all 34 units).**
Waves: The Parish Council . Several Cousins . The Tithe Collectors . A Reasonable Mob . Delegation From The Next Village . The Annual Inspection . People With A Petition . The Sheep Went That Way . Minstrels, Armed . The Long Queue For The Well . Uncles, Unannounced . The Guild Of Tiny Hats . Mildly Offended Barons . The Mud Delegation . A Fete Gone Wrong . Seasonal Staff (Pikes) . The Reeve's Cousins . The Complaints Department . Late Harvest, Early Arrows . The Final Reminder (Third Notice).
Bosses (cycle): great_hog "Wave {n}: Best In Show" . bridge_troll "Wave {n}: Toll Free" . rolling_keep "Wave {n}: Mobile Home" . coin_golem "Wave {n}: Hoard Of Opinions" . cinderwyrm "Wave {n}: Dragon Insurance Claim".

---

## 10. Humour

### Three comedic engines (Ancient's bureaucratic understatement is not primary)
**Engine 1: The Pageant Goes Wrong** (stage-management disaster: cues, props, understudies, interval).
- Brutus: "And the dragon enters from STAGE LEFT! Which is, I am told, also the river!"
- Plato: "The script has the knights losing gracefully. The knights have not read the script. I suspect nobody has."
- Cassandra: "The foam swords were swapped for real ones at the interval. I wrote 'interval' on the form. Nobody reads the form."
- Brutus: "A MISSED CUE! The cavalry were meant to enter on the fanfare! The fanfare was a SNEEZE!"
- Plato: "The crowd applauds the grandstand collapsing. Is that applause for the play, or the play for the applause?"

**Engine 2: Chivalry Pedantry** (honour codes, titles, precedence, heraldic blazon).
- Plato: "Ser Valiant will not strike a kneeling man. The man, aware of this, has been kneeling since Tuesday."
- Brutus: "SIR Wobbleton, Second Chair of the Stool, Keeper of the Lesser Pennant! Big name! Small horse!"
- Cassandra: "Rule 114: no attacking until the herald has finished reading. The herald has found a second scroll."
- Brutus: "HUZZAH! ...was that a retreat? It looked like a retreat. Also HUZZAH."
- Plato: "Is a feudal contract a dialogue? One party speaks, the other kneels. That is a monologue with furniture."

**Engine 3: Mud, Weight and Slow** (heavy things falling over, sieges that take forever, Cassandra's plague).
- Brutus: "DAY NINE of the siege! The ladder has arrived! It is for the NEXT siege! HUZZAH!"
- Cassandra: "It will be a wet siege. Then a long one. Then a smelly one. As foretold."
- Plato: "A knight in plate falls over. It takes eleven seconds. The suspense is the sentence."
- Brutus: "THE HORSE HAS LEFT THE KNIGHT BEHIND! For now he is armour with opinions!"
- Cassandra: "Plague. I said plague. Tuesday. It is Thursday. I take no pleasure in it. A small pleasure."

Running gags (all three voices, capped by cooldowns so none overstays): Brutus buys a tabard (it says KING; he has not asked whose) and shouts HUZZAH at the wrong moments (cd 480 s, max 3 per battle); Plato asks whether a feudal contract is a dialogue; Cassandra predicts the plague and, for once, is right.

### Time-travel arc
- **Arrival card (first entry, skippable):** "MEDIEVAL. Zeus's intern has delivered the commentators to the Grand Annual Pageant of Marrowby, 'roughly the right century' by his sticky note. Brutus has acquired a tabard. Plato has acquired questions. Cassandra has acquired a cold and a bad feeling about the buffet."
- **Act I (Pageant Season):** the booth is hay bales; costumes (tabard, a jester's hat Plato insists is philosophical, Cassandra's hood "for the draught"); every briefing line carries one stage-management gag.
- **Act II (Siege Season):** the bunting becomes smoke; Brutus's HUZZAH starts to land at the right moments, which unsettles everyone; Cassandra's plague arrives and is, for once, acknowledged.
- **Act III (Dragon Season):** the commentators ask to be sent home; the intern's sticky note turns out to be in the dragon's hoard.
- **Finale payoff on an era-independent surface** (Ancient's finale is frozen): the Credits gain "Cassandra: Chief Prophet (Now Verified)" and the Stats screen shows "Predictions confirmed: 1"; the "Medieval cleared" card quotes the sticky note found under the spoon: "Wrong century? Try the one with the engines. They will love it. - Intern". This hands the baton to the Modern era.

### Eight callback pairs (setup-free vs gated; gated renders only if one boolean for the source id is true)
| id | setup-free line (funny cold) | gated line (flag) |
|---|---|---|
| tabard | Brutus: "My tabard says KING. I have not asked whose." | `med_m1` seen: Brutus: "The tabard survived the rehearsal. The rehearsal did not survive the tabard." |
| stool | Plato: "The kingdom is ruled from a stool. The stool has not commented." | `med_m2` seen: Cassandra: "The stool sat in the stands. Nothing hit it. Yet." |
| huzzah | Brutus: "HUZZAH! ...was that a retreat?" | `med_m3` seen: Plato: "Brutus has said huzzah eleven times. Three were correct. I counted for the record." |
| contract | Plato: "A feudal contract: one speaks, one kneels. Is that a dialogue?" | `med_m6` seen: Plato: "The gate stayed shut on a technicality. The technicality had a seal." |
| plague | Cassandra: "Something is coming that smells of onions and doom." | `med_m5` seen: Cassandra: "I predicted the plague. Nobody apologised. Brutus sent a pie." |
| spoon | Pageant-dragon / hoardling text: "A spoon is missing from the hoard." | `med_m7` seen: Brutus: "THE SPOON! Will someone RETURN the spoon!" |
| dennis | Pageant Dragon codex: "Front half Wilfred, back half Dennis. Dennis has notes." | `med_m9` or Dennis kill: Cassandra: "That is not Dennis." |
| intern (cross-era) | arrival card and tooltips: "Zeus's intern said two minutes. That was four centuries ago." | `ancient_cleared`: Plato: "Last time he asked for lightning. This time he brought a pageant." |

---

## 11. Music and sound direction

**Seven tracks** (CC0 first, CC BY with credit, no SA; candidate sources for HUNTER to confirm and loop-check; synth beds as fallback):
| slot | working title | mood / tempo / instrumentation |
|---|---|---|
| menu | Pageant Fanfare (Slightly Flat) | cheerful, processional, wobbly; 96 bpm; shawm, lute, frame drum, tambourine |
| map bed | Parchment Wander | unhurried, curious, spare; 70 bpm; solo lute or recorder, soft drone, birdsong; loops |
| battle low | Muster In The Mud | tense, marching, damp; 84 bpm; low drum, drone, bowed fiddle |
| battle mid | The Crunch | heavy, clanging, relentless; 100 bpm; frame drums, brass blasts, hurdy-gurdy drone, clanged metal |
| battle high | Charge Of The Wobbly Brigade | frantic, galloping, triumphant; 126 bpm in 6/8; toms, screaming shawms, cymbal |
| victory | Huzzah (Properly Used) | bright, brassy, clapping; 110 bpm; trumpets, drum, hand claps |
| defeat | Lament Of The Late Mortgage | mournful, comic, slow; 56 bpm; solo fiddle, single bell toll, low drone |

Candidate rows: RandomMind medieval CC0 loops, Umplix and cynicmusic battle themes, Kevin MacLeod CC BY 4.0 (village, lord, battle titles), all subject to the text sweep on titles. Stingers: nine set-piece stingers (banner, charge, brace, fire, plague, breach, dragon, splash, finale) plus the three reused Ancient ones (victory, defeat, boss), counted in `spec/AU`.

**Twelve hot sound families and how they should feel:**
1. `sword_on_plate`: a short bright clang with a half-second ring, never a clean slice.
2. `mace_crunch`: a thud with a tin rattle on top, like dropping a bucket onto a bucket.
3. `lance_shatter`: wood splinter, metal scrape, then a crowd "ooh" a beat later.
4. `hoof_thunder`: a swelling layered gallop with a ground rumble, readable from the far camera.
5. `pike_brace_thunk`: pole butts into soil with a groan of timber; many of them in a row sound like a drum line.
6. `longbow_volley`: a hundred whispers, a flutter, then a patter of thuds.
7. `crossbow_thwack`: a mechanical snap and a short whip, the only dry sound in the palette.
8. `trebuchet_swing`: winch creak, a long whoosh, then the sling-release thwump.
9. `ram_gate_boom`: a booming wooden knock, a groan, iron bands twanging after it.
10. `wall_collapse`: a rumble, a cascade of rocks, a dust hiss, a last single stone.
11. `banner_fall`: cloth whip, pole clatter, a short crowd "aww" (the signature mechanic's sound).
12. `church_bell`: a big round dong with a long decay, shared by the Bellringer, the Great Peal, the Bell Drop and the plague stinger.
Hot-adjacent: `dragon_roar`, `wing_flap_big`, `oil_pour_sizzle`, `armour_step`. Realism processing: none; Medieval is the cartoon-heavy palette. UI sounds: quill scratch, wax stamp, page rustle. Ambience beds: meadow wind and distant fete, castle wind and echo, forest, moor with fog, mountain with distant rumbling.

---

## 12. Risks and how the design avoids them

1. **"Ancient with armour."** Answered by the tempo/distance targets (section 1), the banner tell, the siege and dragon set-pieces, and a different chrome. If ER27 shows Medieval too near Ancient, the response is a feel-sheet rewrite or roster change, never a metric tweak.
2. **Banner reads as paper.** Pole is 2x2 voxels and the ring is a ground decal, so both survive the far LOD; the shatter + rout ripple is a render event, not a stat; the announcer has a dedicated `banner_down` category.
3. **Cavalry as an unstoppable button.** Seven counters are visible (pike, stake, net, hook, crossbow, mud, bell); ER7 asserts the web (Wilson >= 55% lower bound) and the mutator-off control.
4. **Slow sieges.** First contact <= 20 s, a script beat every 40-60 s, gate hp tuned so a ram opens it in about 35 s, oil and trebuchets give the defender things to do; the gag "day nine of the siege" is spoken, not played.
5. **Air-layer termination.** The AA guarantee (longbow, crossbow, springald) is in armygen and campaign validation; the dragon lands at 40% hp; a termination rule covers unhittable wyvern remnants.
6. **Gate and corridor clog.** Gates and bridge decks >= 6 cells; ownership via M12; a 6-ram column pass test per castle arena.
7. **Trebuchet crater storm and perf.** Two trebuchets maximum, crater rate cap, lazy nav rebuild; the siege scenario (2 trebuchets + 400 foot) is the Medieval perf probe.
8. **Part budgets.** Trebuchet 9 + 3 crew x 10 = 39; Rolling Keep 8 + lite crew; knights on barded horses 27; Cinderwyrm 20; every feature >= 2x2 voxels for the far mesh (lances, bills, pikes as flat combs, the beak, the dragon's wing membranes).
9. **Tone safety.** Abbey, bell, plague are setting only; no crusade, holy war, pagan, heathen, pope, saints or real orders; the beak mask is a costume and the plague cloud makes people faint politely, never suffer; deaths are comic (last words about bills, paperwork, hats, horses, spoons); jokes hit hubris, equipment, paperwork and the commentators, never people. The VB palette test and emblem allow-list check every colour and emblem (no cross, star, crescent, letter, three-band layout).
10. **Comedy risk: the HUZZAH gag overstaying.** Cooldown 480 s and a max of 3 per battle; callbacks are tested for a gated flag and a setup-free cold read.
11. **Dependence on unproven SIM parameters** (banner aura, pavise aura, bailout delay, oil strike, dragonfire cone). Each has a stated fallback in section 1 so a refusal degrades a tell, not a mission.
12. **Scope.** Eighteen of the 34 units are bespoke silhouettes (five of them bosses), which is the expensive part of the era; if the calibration table demands cuts, the order is Quick-only units first (hoardling variants, second pavise skin), then props 38 to 34 (scarecrow, willow, bridge_parapet, gatehouse_arch), then the third battle track; the 9 missions, 6 puzzles, banner, siege, charge/brace, healers/poison and the dragon are never cut.
