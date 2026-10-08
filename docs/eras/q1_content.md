# q1_content.md: hostile review of docs/eras/plan.md, lens CONTENT QUALITY (models, animation, audio, music, text, asset availability, licensing)

Reviewer lens: does the plan deliver content a studio would ship (units that read as what they are, animation worth watching, sound and music from the internet under the licence gate, 2,000+ new strings at the Ancient comedic bar)? Everything below was read in the repo or measured. Read-only probes (scratchpad `p1..p4.mjs`, `dl/`, `fwx/`, `kscifi/`); no repo file touched except this one.

Measured today (2026-10-08, through the proxy):
- OpenGameArt pages and file hosts: reachable. `tools/oga.py info` returns authors and licences for every slug named in map 07.
- Real downloads work: the 194 MB firearm 7z came down in 38 s (193,954,738 B, exact match to map 07); helicopter mp3 590,994 B; mech stomp flac 12,135 B; Kenney sci-fi zip 5,875,104 B.
- kenney.nl, incompetech.com, archive.org, soundbible, ccmixter, quaternius.com: 200. freesound.org: 403. poly.pizza: 403.
- Wikimedia Commons API returned 429 on the first call and 200 after a proper User-Agent and a 20 s pause. Usable but throttled.

Severity: BLOCKER = cannot succeed as written. MAJOR = succeeds on paper, product or gate is wrong. MINOR = fix when touched. Ranking: Q1 to Q3 BLOCKER, Q4 to Q26 MAJOR, Q27 to Q36 MINOR.

---

## BLOCKER

### Q1 (BLOCKER) The plan counts 96 units and names about 20 of them; there is no roster, no faction identity, no boss list, so "not 96 reskins" cannot be checked, planned or gated
**Question**: Where is the per-era unit table (id, faction, role, what it counters, silhouette discriminator, rig, weapon style, clip set, sound profile, joke engine), and why does P0 "design bibles (parallel)" exist only as a phrase?
**Evidence**: plan.md section 7: "Era arena families (design phase picks the 12 each)". Units appear only as rig-table examples (section 5) and e.md section 2 lists. Section 13 content factory: "agents fill rows" of `UNIT_SPEC`, with no rows. Ancient baseline (probe p1): 43 units, 7 factions, roles melee/ranged/cavalry/siege/support/hero/monster/beast/swarm; 15 of 43 are bespoke builders and 28 are hum1 blueprints. From the plan's own rig table I count about 35 bespoke models implied (Medieval about 8: trebuchet, ram, siege tower, dragon, wyvern, barded knights. Modern about 14: howitzer, AT gun, mortar, HMG, AA gun, tank, APC, jeep, technical, truck, heli, gunship, dropship. Sci-Fi about 13: drones, hover tank, bike, 3 mechs, boss walker, insects, hounds) and about 60 hum1 humanoids. The 60 humanoids are where a Modern "rifleman, MG team, sniper, grenadier, medic, engineer x 5 factions" becomes 25 palette swaps. At the default camera (dist 40, fov 48) a 3 u soldier is about 90 px tall at 1080p, so palette is the only difference a player sees.
**Failure scenario**: The user opens Modern Quick Battle and sees five factions whose riflemen differ only in colour; the contract says "every unit complete" and passes, because completeness is checked per row, not distinctness across rows.
**Required plan change**: Before P1, write `docs/eras/rosters.md`: one table per era, 32 rows minimum, columns above. Add contract checks: no two units in an era share (role, rig, weapon style, height class, tag set) unless one is a named variant; at most 2 units per faction share a body type; every faction has at least one silhouette-unique unit (headgear or pack or vehicle shape) readable in the 40 px silhouette test. Bind the tracer list (section 13) to roster rows.

### Q2 (BLOCKER) At the default zoom every vehicle, siege engine, boss and most mechs are drawn with the FAR mesh; the look-dev loop, the "barrels >= 2x2" rule and the triangle budgets are all written for the near mesh
**Question**: Which mesh does the player actually see at the default camera, and does the "contact sheet at 3 zoom levels + 40 px silhouette" test render that mesh?
**Evidence**: `battleview.js:85` sets `lodK2 = clamp(6000 / skin.triangles, 0.2, 1)` and `:133` draws far when `d2 > ld2 * lodK2` with `ld2 = (lodDist 56 * lodScale)^2` (`:114`). For a 22 K-tri vehicle, `lodK2 = 0.27`, so the far mesh starts at 56 x 0.52 = 29 u. For a 55 K boss it is 25 u. `cameras.js:15` default `dist = 40`. `lodScale` also shrinks (`nearBudget 140`) when more than 140 units are near, down to 0.35, so in a 300-unit fight the near radius is about 38 u for infantry and about 20 u for vehicles. Far mesh = `lod.js downsample2`: a 2x2x2 cell is solid only with >= 3 of 8 voxels. I ran it (p4.mjs): a 2x2-voxel barrel at an odd x and z offset: 96 voxels near, 0 far. A 1x1 rod: 0. A checkerboard rotor disc: 185 near, 0 far. A 25 % rotor disc: 97 near, 0 far. A 10x10 one-voxel wing membrane: 100 near, 16 far (edges erode). A 3x3 rod survives (36).
**Failure scenario**: Tanks lose their gun, helicopters lose their rotor, dragon wings shrink to stubs and sniper rifles disappear at exactly the zoom everyone plays at; the near-mesh contact sheets all pass.
**Required plan change**: (1) Contact sheets and V7 render the far mesh at distance 40 u and 80 u, with a pass criterion: the defining feature (barrel, rotor, wing, antenna) survives with >= 60 % of near-mesh silhouette pixels. (2) Replace "barrels >= 2x2" with "features >= 3x3 or aligned to even part-grid coordinates", enforced by a builder lint that runs `downsample2` and fails on feature loss. (3) Rotor discs: either dense (>= 50 % per 2x2 cell) or a far-mesh-specific blur part. (4) Add far-mesh triangle budgets per class (about 0.27 of near: vehicle <= 6 K, boss <= 15 K) and a per-army worst-case calculation in `perf_assert`.

### Q3 (BLOCKER) "Animation worth watching" is a clip count, not a design: death and hit variety by cause does not exist in the sim and no module adds it
**Question**: What does a unit do when shot, blasted, lasered, EMP'd, crushed, set on fire, and which module makes the sim ask for that clip?
**Evidence**: `sim/combat.js:204-209`: the whole death-clip choice is `death_back` by default, `stun` for stone, `death_spin` for kick or knock speed > 6, `death_front/back` by source direction, `death_back` for monster or large. That is 3 plain ids for 43 Ancient units. Plan section 5 adds `shoot_*`, `reload`, `idle_gun`, gait variants, kneel, prone, crew, grenade, cast (about 16 clips) and, per rig, 7 to 12 clips with exactly one `death_back` each. No plan module (M1 to M16) touches `killUnit` clip choice or `hit_*` selection. e.md section 2 item 2 promises "strike, shoot, reload, throw, hit, death, locomotion" per unit.
**Failure scenario**: A mech, a drone, an alien hound and a pikeman all die with one shared fall-backwards family; a laser kill looks like a sword kill; an explosion kill is `death_back` unless the knock speed happens to be above 6.
**Required plan change**: Add a SIM module "M17 reactions": death and hit clip chosen from (cause, def.fx class, rig), with a per-rig table. Minimum content: bullet (crumple), explosive (fling plus tumble), energy (collapse or dissolve flag for the shader), crush, burn (flail), mech or vehicle (topple or wreck plus smoke), drone (spin crash), alien (curl). Budget clips per rig explicitly (about 3 deaths and 2 hit reactions per rig; total list in the plan, not "7 to 12"). Include transitions the plan skipped: deploy and pack-up for MG and mortar teams, cover dive, salute or cheer with a gun. Add an animation acceptance sheet per rig (filmstrips of every clip) read by an agent, as the first project did.

---

## MAJOR

### Q4 (MAJOR) The audio source plan is real, but the plan states supply as hope; there is no per-family candidate count, and several families have exactly one file
**Question**: For each cue family the eras need, how many distinct usable source recordings exist under CC0 or CC BY, and is the minimum variant count met?
**Evidence** (OGA `info` plus downloads):
- Firearms: `the-free-firearm-sound-library` is CC0, 56 wavs, all 96 kHz stereo, 5.4 to 29.9 s each. They are recording sessions (bursts, last round, near and mid distance), not clean one-shots. Extracted size is 329 MB. The master sheet has no durations. It needs onset slicing (`seg|peak|on` exists in `sfx_spec.py`) and, with no ear check, a slice-quality lint. Plus `chaingun-pistol-rifle-shotgun-shots` (CC BY 3.0), `light-machine-gun` (CC BY 4.0, 1 file), `gunshot-sounds` (Tabasco, CC0), `gun-reload-sounds` (CC0), `25-cc0-bang-firework-sfx` (CC0).
- Helicopter: 2 files total in the plan (`helicopter-sounds` one 36.9 s mp3 at 128 kbps, `helicopter-sfx` one ogg). Both unverified for loop points.
- Tank engine: 1 loop, `engine-loop-heavy-vehicletank`, dual licence CC BY 3.0 + GPL 3.0 (we must credit CC BY). Tread clank: none named.
- Cannon: Thimras `cannon-fire`, `cannon-hit`, `cannon-hit-wall`: 1 file each.
- Mech step: `stomp.flac`, 0.59 s, 1 file (plus `robotic.7z`, contents unknown).
- Ledger today: 140 families, 30 with a single row, only 54 with 3 (p-probe of `assets/manifest.json`). `shoot` template: cooldown 35 ms, 8 voices, pitch jitter +-7 % (`cues.js:13`).
**Failure scenario**: The most frequent Modern sounds (rifle, tank cannon, mech step, rotor) are the ones with 1 to 3 source recordings; a 300-unit fight plays the same two samples 10 times a second.
**Required plan change**: Add an audio source matrix to the plan (family, needed variants, candidates with licence, chosen rows, fallback). Rule: any family expected to fire more than 2 times per second must have >= 6 distinct source recordings (the firearm library can supply them by slicing), >= 3 for heavy single events. Mark families that stay at 1 source (tread, cloak, trebuchet, lance, servo) as synth-or-processed and say so in the credits and unverified list.

### Q5 (MAJOR) The plan misses the best sci-fi source it could have used, and its Kenney pack is a retro-bleep pack
**Question**: Why is `kenney-digital-audio` (on disk, 63 sfxr-style bleeps) the Sci-Fi plan while Kenney's own Sci-Fi Sounds pack is not mentioned?
**Evidence**: `tools/fetch_kenney.sh` has 10 packs, none is `sci-fi-sounds`. I fetched `https://kenney.nl/media/pages/assets/sci-fi-sounds/6b296f9ecf-1677589334/kenney_sci-fi-sounds.zip` (5,875,104 B, CC0, License.txt inside): 73 oggs: laserSmall x5, laserLarge x5, laserRetro x5, forceField x5, impactMetal x5, explosionCrunch x5, thrusterFire x5, spaceEngine small/low/large x15, engineCircular x5, computerNoise x4, doorOpen/Close x6, lowFrequency_explosion x2, slime x2. `kenney-digital-audio` on disk is 63 files with 9 lasers, 7 phaserUp, 5 phaseJump. Map 07 section 5 and plan section 9 do not list the new pack.
**Failure scenario**: Sci-Fi ships with bleep lasers and no real hit_metal, shield hum, engine or thruster beds; the plan then "needs" synthesis for things a CC0 pack already solves.
**Required plan change**: Add `kenney sci-fi-sounds` to `fetch_kenney.sh` and the AU1 hunt table (shields = forceField, hover = spaceEngine, mech hull hit = impactMetal). Also record that Kenney `interface-sounds` and `impact-sounds` already on disk cover Modern hull and metal impacts.

### Q6 (MAJOR) No sound direction per era: the plan will mix recorded firearms, 8-bit bleeps and cinematic hits in one palette
**Question**: What is the sonic identity of each era (and how does it fit the "toy-box" tone), and who rejects a source for not fitting?
**Evidence**: Ancient was built from one palette (recorded foley and fantasy packs, `CC0 315 rows`). The Sci-Fi candidates in map 07 mix Kenney sfxr bleeps (`laser1-9`), Little Robot cinematic (`sci-fi-sound-effects-library`), dklon lasers (13 wavs, early-2000s style) and a real mech stomp. Modern mixes a realistic firearm library with an explosion library. Plan section 9 has loudness but no timbre rule.
**Failure scenario**: A laser sounds like an arcade game and the mech step next to it like a film trailer; realistic gunfire in a game whose tone is toy-box and kind (non-negotiable 6) reads as war footage.
**Required plan change**: Add per-era "sound bible" (3 adjectives, reference rows, forbidden timbres, how realistic guns are processed to stay cartoon: shorter tail, pitch-up, less low end) and make the audio reviewer reject non-conforming rows by rule. Decide now whether Modern uses real recorded gunfire (cut to 0.15 to 0.35 s pops) or stylised.

### Q7 (MAJOR) Per-unit weapon sounds are impossible with the sim payloads the plan lists; AU4's `AUDIO_PROFILES[unitId|...].shoot` has no input
**Question**: How does the router know a sniper fired, not a rifleman, when both are projectile kind `bullet`?
**Evidence**: Map 07 section 1: `UnitDef.sfx` is dead (0 hits in STAT_TABLE, not in `defs.js TOP_KEYS`) and `projectile_launch` carries no `srcDef`. Plan M2 lists `rifle`/`bullet` kinds and `muzzle` but no payload change; AU4 keys `PROJ_AUDIO` by kind and profiles by `unitId|tag|role` for `shoot`.
**Failure scenario**: Pistol, rifle, SMG, MG and sniper (5 different families) all play the `bullet` launch cue; a tank shell and an AT rocket share one.
**Required plan change**: Add to M2: `projectile_launch` carries `defId` (or an interned `audioKey` string set at fire time), added to `LOG_FIELDS`; or require one distinct projectile kind per audible weapon class (rifle, smg, mg, sniper, pistol, shotgun, cannon, rocket, mortar, beam_s, beam_l, plasma). Test: every shipped weapon def resolves to a distinct, non-default cue.

### Q8 (MAJOR) Loudness acceptance is one integrated number from an Ancient-only script; per-asset normalisation is by peak, so the new families have no relative level
**Question**: What stops a -3 dBFS-peak gunshot from being 12 LU louder than a footstep and burying voices, if the only gate is -18 +/- 3 LUFS integrated?
**Evidence**: `tools/mixtest.mjs:25-30` hard-codes hoplites, spartans, legionaries, elephants on `marathon`; its pass test is `|LUFS+18| <= 3`, true peak < -1, 0 clipped, voices <= 32. Asset chain (map 07): "peak -3 dBFS" per sfx, not loudness. Relative level lives in 16 template `vol` values (0.4 to 0.9, `cues.js:10-26`). Plan AU7 says only "mixtest.mjs for loudness".
**Failure scenario**: The scripted Ancient run passes forever; a Modern battle is 7 LU hotter in the 1 to 4 kHz band than the announcer duck allows, and no gate notices.
**Required plan change**: Parameterise mixtest by era (units, arena) with scripted battles per era (rifle line, tank column, heli swarm, laser line, mech duel). Add per-family loudness classes in the ledger (short-term LUFS target per family class), a stem report (each category's short-term LUFS vs music and announcer), and gates: max short-term 3 s loudness, LRA, voice steals per second, and "announcer line audible (duck works)" per era.

### Q9 (MAJOR) Nobody can listen, but objective audio checks beyond loudness were never planned
**Question**: What can a machine verify about "this file sounds like a gunshot, a rotor, a laser" without ears?
**Evidence**: Plan 0.9 and AU8 admit sound is unverified by ear. The chain has `loudnorm_stats` and loop-seam metrics (`audiolib.py`) but no classification of content. The firearm sessions (Q4) and OGA pages with unreliable titles make mislabelled slices likely.
**Failure scenario**: A "tank cannon" slice contains a reload clack, a "rifle" slice contains two shots and a shouted word.
**Required plan change**: Add `tools/audit_sfx.py`: per row, onset count, attack time, crest factor, spectral centroid, T60, silence ratio, and a family-class prior check (shot: 1 onset, attack < 5 ms; loop: seam jump < threshold). Render one spectrogram sheet per family and have an agent read it (agents can read PNGs). List the residual as "unheard" in the verification report.

### Q10 (MAJOR) The sprite-pack plan has a decode-memory trap and a timing trap the plan does not test
**Question**: What is the transient memory of decoding a pack and slicing it, and are slice offsets stable across browsers' MP3 decoders?
**Evidence**: Decoded mono f32 at 44.1 kHz is 176 KB per second. Map 07 unknown 7 guesses "3-4 MB mp3 -> 50 MB"; at 64 kbps a 3.5 MB mp3 is about 437 s = 77 MB decoded, and copying slices (`createBuffer` + `copyToChannel`) doubles it to about 150 MB transiently on a phone tab. Eviction (`SfxBank._reserve`) works on per-row buffers; a shared pack buffer cannot be partly evicted. MP3 encoder and decoder delay (about 1,105 and 529 samples) differs between decoders; the plan's 50 ms guard covers it only if measured.
**Failure scenario**: iOS Safari tab killed on the first Modern battle; or every sprite starts 20 ms late in Firefox and the gun transient is clipped.
**Required plan change**: Cap packs at 1 MB (about 22 MB decoded), group by era and group (`gun`, `explosion`, `vehicle`, `energy`, `mech`, `alien`). Play slices with `source.start(when, offset, dur)` from the shared buffer instead of copying. Build a Chromium test that decodes each built pack and cross-correlates each sprite against its source master (tolerance 2 ms). Do the 500-file throwaway publish before choosing the pack format, not after.

### Q11 (MAJOR) Music: the Modern picks are orchestral epic, so Modern will sound like Ancient; loops and slot coverage are not gated
**Question**: What makes Modern music modern, and where do the native-loop and victory/defeat slots come from?
**Evidence**: Plan 9 and map 07: Modern = Kevin MacLeod `killers, hitman, full-on, movement-proposition, exciting-trailer, private-reflection, failing-defense, finding-the-balance`. From `_incompetech_pieces.json` (1,443 pieces): Killers, Hitman, Full On, Exciting Trailer, Failing Defense, Private Reflection are orchestral/choir cinematic (genre 22). The catalogue has 47 pieces with action + synth instruments and 6 with action + drum kit; "Cyborg Ninja", "Robobozo", "Android Sock Hop", "Voltaic", "Mega Hyper Ultrastorm" and 152 "humorous" pieces fit a toy-box tone. Loops: only 1 of 8 shipped tracks is native (`battle_mid_epic_boss`). RandomMind's medieval packs ship `Loop_*.wav` (bards-tale, minstrel-dance, old-tower-inn, kings-feast: verified in OGA file lists) which the plan does not mention. Sci-Fi: `through-space`, `lines-of-code`, `endgame-singularity`, `commando-team`, `imminent-threat` are CC BY-SA, rejected by the gate. Verified fits: Medieval is fully on disk and CC0 (exploration, defeat, viking-march, to-battle, the-battlefield, battle-theme-a, victory-theme-for-rpg; sons-of-the-storm CC BY 3.0). Missing on disk but online and licence-verified: `dream-raid`, `cyberpunk-moonlight-sonata`.
**Failure scenario**: Modern and Ancient battles share an orchestral sound; every 2 minutes a track loops with a 3 s cross-fade bump; Sci-Fi has 2 CC0 tracks and no victory or defeat.
**Required plan change**: Write a music slot table per era (menu, battle low, mid, high, victory, defeat, plus map/chooser) with the chosen track, licence, loop status, BPM and energy; require `loop:true` or a passing `loop_check` for all battle tracks; prefer packs that ship loop files. Pick Modern from synth/rock/groove pieces, not trailer orchestra, and say why.

### Q12 (MAJOR) Licence gate trusts the page tag; provenance of OGA uploads is unchecked, and the plan's volume (about 150 new packs) multiplies the risk
**Question**: How do we know a "CC0" pack of helicopters, sirens or gunshots is not ripped from a commercial game or film?
**Evidence**: `fetch_oga.py:14` accepts if any listed licence is in `('CC0','CC-BY 3.0','CC-BY 4.0')`; `verify_assets.py:9` checks the ledger string only; `credits_lib.py` hard-codes `CC0` for every Kenney row and `CC-BY 4.0` for every MacLeod row. Several named sources are single anonymous-style uploads (`helicopter-sounds` aquinn, `sirens-and-alarm-noise` aquinn, `fps-placeholder-sounds`). Multi-licence pages: `engine-loop...` (CC BY 3.0 + GPL 3.0), `tesla-coil...` (5 licences incl. CC BY-SA), `car-engine-loop` (GPL).
**Failure scenario**: A takedown or an attribution complaint after publish; or a CC BY-SA row passes because one of five tags matched.
**Required plan change**: Add to the gate: record the chosen licence per row (never "any"), reject rows whose only accepted tag is on a multi-licence page unless the credits state the chosen licence, require `License.txt` read for archives, and add a provenance score (author has >= 3 OGA submissions, description names the recording method). Anything under the score goes on a list the report states as "provenance unverified".

### Q13 (MAJOR) `reload` collides with an existing plain clip id owned by catapult1; the plan says "new ids only"
**Question**: How does hum1 `reload` coexist with catapult1 `reload` (2.0 s) given that the plain id belongs to hum1 when hum1 has it?
**Evidence**: Plan section 5: new hum1 clips include `reload`; and "new ids only, never retime existing ones". `anim/clips.js:62` `DEFAULT_META.reload = {dur: 2.0}`; header (clips.js:8-10): all variants of one id share sim timing, enforced by tests, and "the PLAIN id belongs to hum1 when hum1 has the id". Map 03 section 6 already flagged this.
**Failure scenario**: Either rifle reload is forced to 2.0 s and 0.0 hit, or catapult and ballista plain timing shifts and Ancient siege balance drifts (G1 or balance fails late).
**Required plan change**: Name gun reload `reload_gun`; likewise audit all 18 listed new ids against `DEFAULT_META` and ClipLib plain ownership in a test (`new ids must not exist in any registered rig`).

### Q14 (MAJOR) Fire-rate and anticipation are set by the clip, so "burst", MG and rapid fire as described will not animate or fire as the plan assumes
**Question**: With the clip as simulation input, what does a 10 rounds/s MG, a 0.2 s SMG burst or a rifleman who moves while shooting look like?
**Evidence**: `sim/combat.js:249-258` `startRanged`: `rate = clamp(dur/(cd*0.92), 1, 2.4)`, `stateDur = dur/rate`, release at `hit/rate`, `if (!r.whileMoving) dvx=dvz=0`. A 0.5 s `shoot_mg` therefore cycles no faster than 0.21 s (4.8 shots/s), a 1.0 s `shoot_rifle` no faster than 0.42 s. `ClipLib.dur(clip)` is called without a rig. M2 adds `burst/burstGap` and `mag/reload` without saying how a burst is animated through one WINDUP state.
**Failure scenario**: MG teams fire at a quarter of the design rate, or the clip is slowed so the muzzle flash and the shot desync; riflemen freeze in place while shooting.
**Required plan change**: Specify the burst contract: one windup clip per burst, or per-round `recoil` events driving a recoil pulse (render-only) while the sim emits shots at `burstGap`; set `whileMoving` per weapon class (SMG, pistol, MG moving fire). Add a test per weapon class that sim fire rate equals design fire rate within 5 %.

### Q15 (MAJOR) Two-handed gun poses have no feasibility spike; the only prior evidence is negative
**Question**: Does a shoulder-aimed two-handed rifle pose work on hum1's arm proportions, on all 3 body types, with pauldrons, helmets and power-armour pads?
**Evidence**: `docs/anim_spike.md` s7.1: UAL `Pistol_*` rejected, "hum1 arms are 1.0 leg length vs 0.66, two-handed grip folds into the face". Plan section 5: "new hum1 clips via DSL ... both hands on the gun", `walk_gun jog_gun run_gun kneel_aim prone_aim` etc. UAL1 (46) + UAL2 (43) clips contain only `Pistol_*` for guns. hum1 body types scale [1,1,1]/[0.92]/[1.12]; weapon is a rigid child of the right forearm and the support hand is the offhand slot (shield), not a hand part.
**Failure scenario**: The rifleman's support arm clips through the stock for half the helmets and the fat body type; prone and kneel poses float; found only in P1 after the DSL is chosen.
**Required plan change**: Make a rifle-pose spike a P0 gate: 3 body types x 4 helmets x power armour x shoulder, hip and kneel aim, filmstrips and a clipping metric (distance between weapon grid and head/body voxels). If it fails, decide now between a dedicated `gunner` body module with a foregrip attach or IK-driven offhand.

### Q16 (MAJOR) The hardest models (tank, helicopter, mech, dragon) have no reference acquisition step; the user's rule is "if something is unknown, SEARCH"
**Question**: What references and what search happened for how a helicopter, tank, mech, dragon or power-armoured knight reads in voxels, and why is mesh-to-voxel conversion of CC0 kits not even evaluated?
**Evidence**: Plan section 5 has builder rigs plus a look-dev loop of "contact sheet, 2 iterations". No search or reference collection is listed. quaternius.com and kenney.nl are reachable (200). AGENTS.md promises "real internet sound/animation assets", yet all 35 bespoke models and about 95 clips are code-authored. Ancient bespoke total: 15 builders, 2,020 lines, 139 KB (map 03) and 157 clips; the plan adds about 2.3x the bespoke models.
**Failure scenario**: Models are shaped from memory and read as "a box with a stick" at 40 px; two look-dev iterations burn tokens without a target.
**Required plan change**: Add a P0 reference pack per rig (3 to 5 CC0 silhouettes or photos: side, top, 3/4) stored in `docs/eras/ref/`, and evaluate CC0 voxelisation (Quaternius/Kenney vehicle, mech, space kits) for hull proportions at least as ground truth for the silhouette test. Record the licence of anything used. Raise iteration count for the top-8 hero models (dragon, tank, heli, mech, power armour, hover tank, trebuchet, queen).

### Q17 (MAJOR) The e.md set-pieces and the survival bosses have no model: dragon and walker4 are the only boss rigs, but the plan promises 5 bosses per era and an "alien queen", "mech duel", "tank column"
**Question**: Which 15 boss defs exist (5 per era) and which rigs do they use?
**Evidence**: Ancient bosses are `BOSS_CYCLE = ['minotaur','cyclops','war_elephant','medusa','pharaoh']` (`wave_names.js:12`): five distinct defs. Plan 1: "5 bosses" per era; rig table has `dragon1` (dragon, wyvern) and `walker4` (boss) only. e.md section 5 names "a dragon over the keep, a tank column on the bridge, a mech duel, an alien queen". `insect1` is a 10 to 12 part swarm rig; no queen scale. Budget "boss <= 55 K" is for one model class.
**Failure scenario**: Medieval boss cycle = dragon, dragon (recolour), giant knight (scaled hum1), troll, ... ; Sci-Fi bosses = four scaled humanoids; the "alien queen" is a big bug that was never modelled.
**Required plan change**: Add a boss table (15 rows) with rig, part budget, tri budget (near and far), signature animation and entrance beat, and one non-scaled-hum1 silhouette per era boss, before P1.

### Q18 (MAJOR) A mech that is "hum1 x 2.0 to 2.6" will read as a big man; non-human gait and weight have no plan
**Question**: How does a human-limbed, human-gait body at 2.6x scale read as a mech, and what happens to its death, foot slide and stomp?
**Evidence**: Plan section 5: walker = hum1 x2.0 to 2.6, clips reused, "bespoke `mechs.js` part module". Map 03: hum1 grids are fixed by `DIM` (`stamp()` throws on other sizes), legs 5+5 voxels, `HUM1_RIG` kinematics, roster test "steps/s 1.5 to 3.5" with a giant exemption regex. At scale 2.6 a voxel is 0.26 u against 0.1 u on infantry, so a mech has 2.6x chunkier voxels than the riflemen next to it (the Cyclops precedent is 2.2, a single unit). Death is `death_back` (Q3). Walker4 is a rigid-leg quadruped with a different rig. The plan's own map calls it "AT-AT style".
**Failure scenario**: Mechs read as giants in armour (same arm swing, same knees), and 3 mech types are one model with different paint.
**Required plan change**: Decide per mech whether it is (a) hum1 giant, intentionally a "suited giant", or (b) a custom rig with its own gait (reverse-knee, rigid legs via `gait.plantRigidLeg`, like elephant1). For (a) at most 1 mech unit; the rest use (b) or hover. Add gait weight (low steps/s, ground shake event) and a mech-specific death (topple plus explosion) in M17.

### Q19 (MAJOR) Dragon, helicopter and drone: the visual implementation of "flying" is a model-height trick, and shadow, hit window and cull each need work that no render item owns
**Question**: What does the player see for an airborne unit: altitude, ground shadow, rotor blur, banking, hit location, and who owns each?
**Evidence**: Map 03 section 5: `u.altitude` exists (`unit.js:62`) but is never read; fake altitude by raising the model origin; hit window `[y-0.2, y+def.height+0.3]`; cull sphere radius `3.4*scale+1` around `y+1.4*scale`. Plan R4 (ShadowBlobs +1 draw), R11 (cull from `meta.bounds`), M7 (layers). Rotor: `meta.driven` rigid part scroll (Q2 shows sparse rotor voxels vanish at far LOD). Dragon wing flap needs 2-segment wings with membranes (Q2: membrane edges erode).
**Failure scenario**: Flyers are floating models with no shadow, blurred rotors that flicker, and a dragon whose wings vanish at 25 u.
**Required plan change**: Add an "airborne look" spec: altitude per class, shadow blob size and opacity from altitude, rotor representation per LOD (blade geometry near, translucent glow disc far), banking from `u.vx`, dragon wing minimum thickness 3 voxels, and a tracer checklist for heli, drone and dragon covering all of them.

### Q20 (MAJOR) Text volume is about 130 % of the entire Ancient comedic corpus and the review mechanism is the author's own rubric
**Question**: Who reads 2,400 new strings, with what independence, and what measures sameness?
**Evidence**: Ancient (probes p2, p3): `UNIT_TEXT` 500 strings (11.6 per unit, 10 to 21), announcer 486 lines in 47 categories (about 10.3 per category), 63 tips, 9 missions x about 13 strings. New eras: 96 units x 11.6 = 1,110; announcer 3 x (150 + 27) = 531; 27 missions x 13 = 350; tips 90; lessons 72; waves 75; loading lines 60; achievements about 90 (plus mutators, results, kill verbs, scout, god powers): about 2,400+ (my estimate). Review: plan section 10 "rubric, cross-reads, 30 % cut, banned-words contract"; nothing about independence of reviewer and generator, similarity, or the human bar. Ancient lines share shapes ("pay my widow", "bronze mortgage", "per arrow"): 5 of 129 death quotes start with "Tell the".
**Failure scenario**: The same bureaucratic-understatement joke shape fills 96 blurbs; the 30 % cut removes the weak ones from the same distribution; the user sees the voice flatten by unit 40.
**Required plan change**: Per era, define 3 comedic engines and a mechanic joke per unit. Add a text-similarity lint (first-3-words, template skeleton, shared rare nouns) with caps per era, an independent reviewer pass with a different prompt and the Ancient corpus as the benchmark, and a "read-aloud 20 random lines per era" sampling step in QA with the lines quoted in the report.

### Q21 (MAJOR) Announcer budget: 150 lines per era is 30 % of the Ancient density while the era needs about 25 new categories
**Question**: Does 150 era lines survive a 9-mission campaign and replays given the announcer's 3.5 s gap, recency 14 and 840 s repeat window?
**Evidence**: Ancient `DEFAULT_CONFIG` gap 3.5 s, recency 14, repeatWindow 840 s; a 120 s battle at that gap can speak about 30 lines. Categories: 47 (38 moment + 9 campaign), 10.3 lines each, 351 in generic moment categories; `battle_start` alone has 97 lines, `victory` 40, `defeat` 28. New era needs per-mechanic categories (suppress, cover, EMP, shield break, cloak reveal, air strike, tank kill, heli down, dragon, siege gate, charge, banner, poison, orbital, teleport, mine, reload) at about 9 lines each, which is about 150 on its own, before unit-specific and ability cases. My regex over the "neutral" categories finds 83 of 340 lines with Ancient anchors ("Pompeii Pizza", "the man selling grapes", "Terms of Conquest", "Marathon").
**Failure scenario**: By mission 4 the same 5 lines recur; neutral lines about grapes play on a moon base.
**Required plan change**: Set the target by arithmetic: lines >= categories x 9 + 3 per campaign mission + 30 % of the neutral lines rewritten per era. State that reuse is allowed only after the human read of every reused line (P0, not P7). Add a repetition measure in `humor-sim.mjs` per era (lines repeated per campaign playthrough <= threshold).

### Q22 (MAJOR) The banned-term sweep written for Ancient bans words the Medieval era needs
**Question**: How do Medieval abbeys, church bells, crusader-style heraldry and "prophet" gags pass `tests/humor/text.test.mjs`, and what stops someone deleting words from the list?
**Evidence**: `tests/humor/text.test.mjs:196-198`: STEREOTYPE includes `crusade`, `crusader`, `pagan`, `heathen`; RELIGION includes `church`, `pope`, `bible`, `amen`, `christ`. Map 07 lists a Medieval "church bell/alarm" cue; plan section 7 lists an "abbey" arena and e.md "healers". V1 plan line: "banned-word scan" without a per-era list.
**Failure scenario**: Either the Medieval author cannot write "church bell" and routes around it (stilted text), or a coordinator quietly removes `crusader` and `church` from the list, loosening the safeguard for all eras.
**Required plan change**: Per-era banned/allowed lists in the plan: fixed global bans (slurs, stereotypes), era-scoped bans (real orders, real wars, named real organisations, real political terms), and an explicit allowed list (church bell, abbey, plague as setting). Changes to the list need a log line in `cuts.md`-style `decisions`.

### Q23 (MAJOR) Fictional factions are enforced by text only; visual coding (heraldry, helmets, uniforms, camo, emblems) is where real-world references enter
**Question**: What stops a Modern faction in coal-scuttle helmets and field grey, or a Medieval faction with a red cross on white, or an emblem rotated into a hooked cross?
**Evidence**: The contract scans strings (`text.test.mjs` H4). Emblems are 8x8 sprites (`parts/_kit.js:111-122`: lambda, eye, sun, boar, eagle, star, skull, wave, bolt) and parts are named freely; e.md lists "marines" and "power armour" for Sci-Fi, which are other companies' trademarks, and map 03 itself says "AT-AT style" for walker4.
**Failure scenario**: The user sees a faction that is obviously a real nation or a real order, or a recognisable franchise unit, despite the "invented" naming; or a symbol with extremist associations.
**Required plan change**: Add a visual bible rule per era: banned silhouettes and colourways (named list), banned symbols (crosses on white, crescents, hooked shapes, hammer and sickle-like pairs, national flags), faction colour system derived from invented systems (animals, trades), and an IP-avoid list for Sci-Fi and Medieval fantasy names (marine, space marine, xeno, hive-mind-by-name, lightsabre, walker names). Add a human-read step on each faction contact sheet (all units side by side), and an emblem lint (rotational symmetry/hook check).

### Q24 (MAJOR) Per-era sfx floor of 70 rows (25 families at the ledger ratio) cannot cover Modern or Sci-Fi; the plan's uniform "about 100 rows, 45 families" per era is wrong in distribution
**Question**: How many cue families does each era need, by name, and does the floor cover them?
**Evidence**: Plan section 1: "about 100 new (45 families)", floor 70. Map 07 proposes 120 to 140 rows per era. Ledger ratio is 2.7 rows per family (374/140). Counting map 07 section 5 needs: Modern about 44 families (rifle, pistol, SMG, MG, sniper, shotgun, whiz, ricochet, 3 hit surfaces, reload, casing, grenade x2, mortar, artillery x2, rocket, tank cannon, mine, airstrike, engine x2, tread, rotor x2, jeep, siren, radio, explosion x3, vehicle_explode, death_machine, steps x4, glass); Sci-Fi about 40; Medieval about 25 (mostly reuse). 44 families at 2.7 = 119 rows; the Modern floor of 70 rows equals 26 families.
**Failure scenario**: At the cut ladder floor, Modern ships with silent grenades, mines and rotors, covered only by synthesis.
**Required plan change**: Replace "100 per era" with named family lists and variant minimums per era (Modern 120 rows, Sci-Fi 110, Medieval 60) and put the floor at "every named family has >= 1 real row or an approved synth".

### Q25 (MAJOR) Ambience and per-material foley for 36 new arenas are synth or reused: only 3 real ambience loops exist
**Question**: Where do city traffic, factory hum, space-station hum, alien jungle and moon-base beds come from?
**Evidence**: Map 07: `THEME_AMB` is 10 ancient themes; real loops exist for wind, fire, crowd; birds, forest, desert and water are synth. Plan AU3: "per-era synth beds", AU4 foley by profile. `STEP_BY_BIOME` has 8 biomes. 12 arenas per era x 3 = 36 arena themes.
**Failure scenario**: Every Modern or Sci-Fi arena has the same wind bed; the city, harbour and moon base are indistinguishable by ear.
**Required plan change**: List ambience loops per arena family (3 minimum per era, CC0 loops exist on OGA: rain, thunder, city, sirens, drone) with synth fallback tests, and surface-footstep mapping for the new materials (asphalt, concrete, metal plate, regolith, ice, hull, grass).

### Q26 (MAJOR) Workshop and Codex preview for long or flying models is not in the model budget: previews crop tanks and helicopters
**Question**: Where is the preview framing for 6 u x 2.5 u hulls and airborne models planned, since the Codex is where the user inspects each of 96 units?
**Evidence**: Map 03 seam 14: `preview.js setModel` uses `wide = max(height*0.55, 1.5)` and ignores footprint. Plan R11 and `meta.bounds` cover cull only.
**Failure scenario**: Codex shows a tank cropped at the barrel and a helicopter at the top edge; the user cannot see most of the work.
**Required plan change**: Add preview framing from `meta.bounds` to the Codex, Workshop, picker and share-card, and a per-unit Codex screenshot in V7 reviewed for crop.

---

## MINOR

### Q27 (MINOR) Props at 0.2 to 0.25 voxel size make the first mixed-resolution scene in the game
**Question**: Has anyone looked at a 0.25 u keep next to 0.1 u soldiers?
**Evidence**: Plan W2: "per-spec voxel size 0.2 to 0.25 for buildings > 10 u, <= 100 K voxels". Ancient props all use `VOX = 0.1` (`props/models/kit.js:15`).
**Failure scenario**: Voxels 2.5x larger on buildings than on units break the voxel-art coherence on every city and castle arena.
**Required plan change**: Prototype one castle keep and one city block both at 0.1 (with a 250 K voxel budget and hollow interiors) and at 0.2, compare sheets, decide before W2.

### Q28 (MINOR) Crew on guns and trebuchets costs the part cap; the plan's arithmetic leaves no room for variants
**Question**: A howitzer is 6 parts + 3 crew x 10 to 13 = 36 to 45 of 48; a trebuchet 9 + 39 = 48; what do alternative crew, helmets or loaders cost?
**Evidence**: Plan section 5: crew budget (48 - rig)/10; map 03: chariot_archer is 43 parts today with 5 spare; crew are full `compileSoldier` models (10 to 13 parts).
**Failure scenario**: The second crew variant exceeds 48 and the VoxSkin constructor throws.
**Required plan change**: Add a lite crew compile (hum_lite 6 parts) for gun and siege crews and state near-tri budgets per crew count.

### Q29 (MINOR) Dragon rig budget is 18 to 20 parts at 30 to 45 K tris but wing membranes at 3-voxel minimum plus 2-segment wings plus fire breath were not costed
**Question**: What is the dragon's triangle and draw cost with the breath, wings flapping and flying-layer shadow?
**Evidence**: Plan: boss <= 55 K, elephant is 55 K near and 14 K far (map 03 table). Far-LOD tri cost of a boss is about 14 K, and a Medieval survival boss wave may field two.
**Failure scenario**: Boss waves hit the PF2 tri budget; the dragon is the first thing culled to far.
**Required plan change**: Cost the dragon explicitly (near, far, fx) in the tracer.

### Q30 (MINOR) Clip count and bake cost are not budgeted
**Question**: How many clips does the plan add and what do they cost at boot and in the page?
**Evidence**: Map 03: 157 clips = 0.59 MB typed arrays, bake 92 ms (0.63 ms/clip). Plan: about 16 hum1 + 12 rigs x 7 to 12 = about 95 clips = about +60 to +95 ms before the title and about +0.35 MB RAM.
**Required plan change**: Bake per rig lazily on first use, or measure and log the boot delta in the gate.

### Q31 (MINOR) Sound for the new statuses and mechanics (suppress, cover, shield, cloak, EMP) has no spec of what the player must hear
**Question**: What is the audio telegraph per mechanic (bullet whiz for suppression, shield hum and break, cloak shimmer, EMP burst)?
**Evidence**: Plan AU4 lists handlers (`beam, suppressed, shield_hit/break, emp, cloak, blink, mine_trigger, reload, telegraph`) without cue ids or source rows; map 07 section 5 shows `ricochet` has a single source on OGA (`red-eclipse-sounds`, CC BY-SA, rejected) and `cloak` has no source.
**Required plan change**: Add a table mechanic -> cue id -> source row or recipe.

### Q32 (MINOR) The Medieval era has the best asset coverage and the weakest model plan
**Question**: Why does Medieval get 5 to 8 bespoke models while the plan's heaviest rigs are Modern and Sci-Fi, and is a Medieval faction of 6 knights, pikes and archers distinct enough from Ancient hoplites and cataphracts?
**Evidence**: Medieval audio and music are almost fully on disk (Q11); the cataphract is the template for knights (26 K tris); hum1 has 254 parts of which many are Ancient-feel helms.
**Required plan change**: Roster (Q1) must show how Medieval infantry silhouettes differ from Ancient (great helms, kite shields, tabards, halberds, banners) and budget about 30 new helm/armour/weapon parts for that alone.

### Q33 (MINOR) Voice for new unit classes is silent today; classes without a bark role stay silent
**Question**: Do vehicles, drones, mechs and aliens speak or make a signature sound at spawn, engage, hurt and death?
**Evidence**: Map 07: `BARKS` roles are 9; new roles (vehicle, air, mech, drone) have no class bark; sound `voice` category is 26 male rows. Machine death has a CC BY 3.0 source (`machine-death-sound`, 2 wavs); alien screams exist (`insect-or-alien-scream`).
**Required plan change**: Add per-role bark and voice-sound rows to the roster.

### Q34 (MINOR) Credits growth: about 150 new packs, CC BY 3.0 and 4.0 attributions with "modified" notes; the credits screen is a long markdown list
**Question**: Is the credits screen still navigable at about 300 items and does every CC BY row carry the modification notice?
**Evidence**: CREDITS.md 18 KB, 124 items, "Modified (trimmed/normalised/encoded)" present (22 matches); plan A6/AU7 grow it to about 45 KB.
**Required plan change**: Add credits per era with section headers and a credit-test that every CC BY ledger row has an attribution line with licence URL and "Modified".

### Q35 (MINOR) The tracer-bullet list has 12 units but 12 new rigs plus several unit classes need one each
**Question**: Which tracers cover ram1, gun1, car1, hover1, insect1, quad1 alien and walker4, and which unit is the "tank commander/crew" tracer?
**Evidence**: Plan section 13 lists rifleman, tank, helicopter, drone, mech, alien, trebuchet, dragon, knight, power-armour, shield trooper, cloak assassin (12); rig table lists 12 new rigs; missing tracers: gun1 (artillery with crew), car1 (wheeled), hover1, ram1, walker4.
**Required plan change**: One tracer per rig, with crew and airborne checks (see also q1_scope Q3).

### Q36 (MINOR) Unit text: moment barks and codex jokes per unit are listed but not counted
**Question**: How many moment barks per unit (the Ancient had up to 21 strings per unit) are required for an era unit to be "complete"?
**Evidence**: Plan 0.5: "text (name, plural, blurb, lore, 3 deaths, 2 taunts, codex joke, moment barks)". Ancient UNIT_TEXT: 10 to 21 strings, average 11.6.
**Required plan change**: Fix the minimum (>= 11 strings per unit, >= 15 for heroes and bosses) in the contract.

---

## What the plan got right (do not churn)
- Sprite packs for the 511-file cap (arithmetic checks: 382 + about 300 > 511) and the throwaway 500-file publish test.
- Era-scoped `warm()` plus ledger `era` field: decoded PCM 63 MB now, about 250 MB if unscoped.
- Synth fallback for every cue, `core` sfx per era capped at about 10, and a no-core-music policy.
- Credits, licence gate (CC0, CC BY 3.0/4.0, PD; no SA, GPL, NC) and the "unverified" section.
- Far-LOD and team-tint awareness is already in section 5 (the direction is right, the rule is too weak: Q2).
- New clip ids only for hum1 (with the `reload` exception in Q13) and `DEFAULT_META` first.
- Time-travel running gag, banned-word contract concept, cartoon gore.

## Verdict
Converged: NO. The asset supply is much better than feared (firearms, Kenney sci-fi, medieval music, helicopters all reachable and downloadable under the gate), so the plan is not blocked on sources. It is blocked on three things the plan defers: the roster and boss table (Q1), a far-mesh-first model discipline (Q2), and a reaction/animation design that the sim can drive (Q3). The audio verification (Q8, Q9), the sound and music direction (Q6, Q11), and the text and visual safety rules (Q20 to Q23) are specified as intentions rather than checks. Plan v2 should add `rosters.md`, a boss table, per-era sound and visual bibles, M17 reactions, the audio source matrix, and the far-mesh gates before any unit volume starts.
