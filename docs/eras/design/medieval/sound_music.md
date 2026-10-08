# Medieval sound and music bible (binding for AUDIO and HUNTER; `spec/AU` takes its rows from here)

Owner: DESIGN-ERA-MEDIEVAL part 2. Consumers: AUDIO (AU0 sound bible, router tables, music slots, stingers), HUNTER (source matrix), COMEDY-MED (bark sound hooks). The palette is fixed by `feel_sheet.md` s5; this file adds the sources, variant counts, loop and mix rules. All third-party material is CC0, CC BY 3.0/4.0 or public domain; CC BY-SA, GPL and NC are rejected (plan s10). Every cue has a synth fallback in `synth.js`. Hosts that work: OpenGameArt, Kenney, incompetech, archive.org, SoundBible; freesound, pixabay and zapsplat are blocked; Commons is throttled.

## 1. Sound bible (AU0)

**Three adjectives: clanging, creaking, ceremonial.** Iron on iron, timber under load, brass and drums that sound like a procession even in a brawl.

| aspect | rule |
|---|---|
| reference timbres | struck iron and tin (anvil, bucket on bucket) with a short bright ring; timber under strain (winch, hinge, chain, pole butts into soil); frame drums and a snare with a rope buzz; natural brass (trumpet, horn) slightly flat; shawm and fiddle; handbell and church bell with a long round decay; hooves on turf layered into a gallop; cloth snap; rope twang; crowd "ooh/aww/gasp" a beat late |
| forbidden timbres | gunshots and any firearm click; lasers and electronic zaps; synth pads and arpeggios; a modern drum kit (hi-hat patterns, kick+snare rock beat); cathedral choir, chant or "ahh" vocal pads (religious reference); trailer braams and hybrid-orchestral hits; bagpipes (a national association); a clean "shing" sword swish (blades clang, they do not slice); real chants; any sound that reads as pain |
| realism processing | none. This is the cartoon-heavy palette: no dry close-mic realism, no heavy low-end compression. Hits keep their transients and a short bright tail; a light stone-hall send is applied for castle, abbey and courtyard arenas only; the master chain (compressor, limiter, soft clip) is unchanged |
| loudness classes | `hit` (blade, mace, shield) -18 LUFS short-term, `volley` -22, `siege` (trebuchet, ram, collapse) -16 with a 6 dB duck on music, `bell` -20 with a long decay, `dragon` -14 with limiter bypass for the roar only, `ui` -24 |
| voices | the engine budget (32 voices, 24 on Potato, 8 reserved for ambience) is unchanged; per-family `cooldownMs` and `maxVoices` are set below; far sounds thin above 0.65 load |
| UI sounds | quill scratch on hover, wax-stamp thump on click, stamp plus a short brass blip on Deploy and confirm, a stamp when a cooldown is ready, page rustle for overlays, a hand-bell on star award |

## 2. Music: seven slots

Selection is the existing `MusicDirector` (mood plus theme, shuffle bag, intensity low-pass 1.8 to 18 kHz, 1.5 s crossfade, 3 s equal-power loop seam, one track decoded at a time). Medieval rows carry `era:'medieval'` and `themes` so the theme actually ranks them (the Ancient rows have none). Titles below are working titles from the feel sheet; the real file titles go in the credits.

| slot (id) | working title | mood | tempo | instrumentation | loop requirement | candidate source types |
|---|---|---|---|---|---|---|
| menu (`med_menu`) | Pageant Fanfare (Slightly Flat) | cheerful, processional, wobbly | 96 bpm, compound jig feel | shawm, lute, frame drum, tambourine, hurdy-gurdy drone, one out-of-tune brass flourish | `loop:true` or the 3 s crossfade check; 60 to 100 s | CC0 RandomMind `minstrel-dance` or `old-tower-inn`; Kevin MacLeod (CC BY 4.0) `village-consort`; synth fallback `menu_medieval` (square-wave lute pluck, noise snare, saw brass) |
| map bed (`med_map`) | Parchment Wander | unhurried, curious, spare | 70 bpm | solo lute or recorder, soft drone, birdsong, one distant single bell | seamless loop, 90 s or more, quiet (-26 LUFS), no hard drum | CC0 RandomMind `medieval-exploration` or `medieval-the-bards-tale`; synth fallback `map_medieval` |
| battle low (`med_battle_low`) | Muster In The Mud | tense, marching, damp | 84 bpm | low drum, drone, tenor shawm, bowed fiddle, creaking strings | `loop:true` or passing loop check; 80 s or more | CC0 RandomMind slow pieces; Kevin MacLeod `lord-of-the-land` (CC BY 4.0); synth fallback `battle_medieval_low` |
| battle mid (`med_battle_mid`) | The Crunch | heavy, clanging, relentless | 100 bpm | double frame drums on the beat, brass chords, hurdy-gurdy drone, clanged metal | `loop:true`; 80 s or more; shares the key centre D with low and high so crossfades do not clash | Umplix `to-battle` (verify licence), Kevin MacLeod `five-armies`, `death-and-axes` (CC BY 4.0, titles pass the text sweep by signed credit exception); synth fallback `battle_medieval_mid` |
| battle high (`med_battle_high`) | Charge Of The Wobbly Brigade | frantic, galloping, triumphant | 126 bpm in 6/8 | toms, screaming shawms, cymbal, sawing fiddle | `loop:true`; 70 s or more | Umplix `the-battlefield`, cynicmusic `battle-theme-a` (verify licence), Kevin MacLeod `undaunted`; synth fallback `battle_medieval_high` |
| victory (`med_victory`) | Huzzah (Properly Used) | bright, brassy, clapping | 110 bpm | trumpets, drum, hand claps, one comically late tuba | one-shot 12 to 20 s, may end on a sustained chord | short CC0 fanfare or a sliced MacLeod fanfare; synth fallback `victory_medieval` |
| defeat (`med_defeat`) | Lament Of The Late Mortgage | mournful, comic, slow | 56 bpm | solo fiddle, single bell toll, low drone | one-shot 15 to 25 s | CC0 RandomMind `medieval-defeat-theme`; synth fallback `defeat_medieval` |

Rules: (1) CC0 first, then CC BY with the credit string recorded in the ledger and shown in Credits (AU7); (2) every candidate gets a licence-page snapshot (ER12); (3) the three battle tiers are normalised to -16 LUFS joint and trimmed; (4) the intensity filter must leave the shawm recognisable at its lowest cutoff, which is a listening check by an agent that did not pick the track; (5) the `comedy` mood (chickens, goats) is unchanged and unused here; (6) one new mood tag `med_pageant` is NOT created: the existing `menu battle victory defeat` moods are reused with `era` ranking. The 1.2 MB un-core decision is the plan's D17.

## 3. Stingers (set-piece kinds)

Each ducks music 6 dB for 700 ms and plays on the `announcer`-adjacent bus; only `med_sting_dragon` and `med_sting_finale` bypass the limiter. Durations are authored targets; the source is a short synth build (preferred, deterministic) or a sliced CC0 phrase.

| id | kind | used by | content | length |
|---|---|---|---|---|
| `med_sting_wrong_cue` | comic | M1 | flat trumpet crack falling into snare and toms | 2.2 s |
| `med_sting_colours_down` | hit | M2 | one bronze bell clang under a falling low-brass note | 1.8 s |
| `med_sting_brace` | hit | M3 | a single enormous drum hit and a timber creak | 2.0 s |
| `med_sting_charge` | swell | M4 | galloping snare and a horn that arrives a bar late | 3.0 s |
| `med_sting_breach` | hit | M5 | timpani hit and a woodwind fall, a trumpet repeating the wrong cue | 2.4 s |
| `med_sting_plague` | comic | M6 | one bell toll and a wobbling oboe | 2.6 s |
| `med_sting_fire` | comic | M7 | a rising brass swell and a cymbal that arrives late | 2.2 s |
| `med_sting_dragon_shadow` | dread | M7 cameo | a low brass note, short | 1.8 s |
| `med_sting_lady` | dread | M8 and survival boss entrance | counterweight groan, a whistle, a rolling crash | 3.0 s |
| `med_sting_troll` | comic | M8 bridge drop and survival boss entrance | a tuba "wah" | 2.0 s |
| `med_sting_dragon` | dread (limiter bypass) | M9 and survival boss entrance | a low brass note and a distant roar | 3.5 s |
| `med_sting_finale` | fanfare (limiter bypass) | M9 coda (Dennis) | a kazoo against full brass | 3.0 s |
| `med_sting_hog` | fanfare | survival boss entrance | a three-note brass flourish | 2.0 s |
| `med_sting_keep` | hit | survival boss entrance | timpani hit and a woodwind fall | 2.4 s |

That is 12 new set-piece/boss stingers plus 2 survival-only, 14 in all; the 3 existing Ancient stingers (victory, defeat, boss) are reused where noted in `spec/AU`.

## 4. Twelve hot sound families

Hot families get at least 6 independent sources (the plan's rule); heavy singles at least 3. "Reuse" names existing ledger rows from the Ancient release that the Medieval router may borrow; "new" is what HUNTER finds or AUDIO synthesises. Cue ids carry `med_`; the router gets a `PROJ_AUDIO`/`ABILITY_CUE` row per family (AU4). Total new Medieval rows are budgeted at 60 (plan s1) plus declared reuse of the Ancient swords, shields, bows and horses.

| # | family (cue id) | desired character | variants | reuse | new / source plan | notes |
|---|---|---|---|---|---|---|
| 1 | `med_sword_on_plate` | a short bright CLANG with a half-second ring, pitch by armour, never a clean slice | 8 | `sword_hit_1-5`, `hit_armor`, `blade_clash_1-6` | 3 new metal rings from OGA anvil/hammer packs (CC0) layered under the swing | cooldown 60 ms, maxVoices 6 |
| 2 | `med_mace_crunch` | a thud with a tin rattle on top, a bucket dropped onto a bucket | 6 | `mace_bonk`, `shield_bash_1-3` | 2 new tin rattles (synth plus a sliced hammer-on-metal) | |
| 3 | `med_lance_shatter` | wood splinter, metal scrape, then a crowd "ooh" a beat later | 6 | `wood_splinter_1` | 4 new splinters (OGA wood-crack packs, CC0), 3 crowd "ooh" shorts | the first-hit splinter swap is render-side; the sound follows the event |
| 4 | `med_hoof_thunder` | a swelling layered gallop with a ground rumble, readable from the far camera; builds for 2 s before impact (the audible tell) | 6 loops + 3 hits | `horse_gallop_1`, `hoof_step_1-2`, `horse_neigh_1-3` | 3 new gallops (OGA horse-gallop-on-different-surfaces, horse-trotting: CC0) | aggregate bed: when >= 6 cavalry charge in frustum, the bed replaces per-unit gallops (battle-bed rule) |
| 5 | `med_brace_thunk` | pole butts into soil with a groan of timber; many of them in a row sound like a drum line | 6 | `spear_stab`, `wood_crack` | 3 new thunks (synth pole-in-soil, sliced log drops) | rate-limited so a block of 30 sounds like a line, not a wall of noise |
| 6 | `med_longbow_volley` | a hundred whispers, a flutter, then a patter of thuds; thup on mail, tink on plate | 6 | `bow_shot_1-3`, `arrow_whoosh`, `arrow_hit_*` | 2 new volley flutters | volley = one grouped cue per 0.4 s window, not per arrow |
| 7 | `med_xbow_release` and `med_xbow_crank` | release: a mechanical snap and a short whip, the only dry sound in the palette; crank: ratchet clicks for the 2.6 s reload (the tell) | 6 + 4 | `crossbow_shot_1`, `ballista_twang` | 3 new snaps, 4 ratchet loops (synth plus CC0 mechanical clicks) | the crank loop is audible to the player only inside the near camera, as the reload tell |
| 8 | `med_trebuchet` | winch creak, a long whoosh, then the sling-release thwump; bigger and lower for the Lady | 4 + 3 | `catapult_creak_1-4`, `catapult_launch_1-3`, `boulder_whoosh` | 3 new heavy whumps; shell whistle `med_shell_whistle` x3 | heavy single: 3 sources |
| 9 | `med_ram_gate` | a booming wooden knock, a groan, iron bands twanging after it | 6 | `wood_crack`, `door_slam` if present | 3 new booms (OGA `cannon-hit-wall` CC0 re-pitched as a wood boom; credited under its original title in Credits, which the text sweep allowlists as a third-party title), 3 chain/iron twangs | gate stages (66, 33 percent) play a creak/twang |
| 10 | `med_wall_collapse` | a rumble, a cascade of rocks, a dust hiss, a last single stone | 4 | `wall_collapse`, `rock_fall`, `rock_crumble`, `debris_big` | 2 new rubble cascades | |
| 11 | `med_banner` | raise: a cloth snap; fall: a cloth whip, pole clatter and a short crowd "aww" (the signature mechanic's sound) | 6 + 6 | `cloth_flap_1-3` | 4 new pole clatters, 3 crowd "aww" shorts | played with the grey rout ripple; limiter-protected so it cuts through |
| 12 | `med_bell` | a big round DONG with a long decay, shared by the Bellringer's Dong, the Abbess's Great Peal, the Bell Drop and the plague stinger | 5 (small, medium, large, huge, crack) | `bell_ding_1-2`, `bell_heavy_1` | 3 new bronze bells (OGA bell-sounds, CC0) | bell is setting only; no hymn or chant, ever |

Hot-adjacent: `med_dragon_roar` (3 roars plus a far variant, low layered; OGA monster/troll packs CC0 plus synth sub), `med_wing_whomp` (leathery flap, 4), `med_fire_whoosh`/`med_fire_whoomph` (reuse `fire_whoosh_1-2`, 2 new), `med_oil_sizzle` (3), `med_armour_step` (reuse `armor_step`), `med_hoard_glint` (ambient coin sparkle, 3), `med_gas_hiss` (reuse `snake_hiss` as a base), `med_sneeze_chorus` (4 polite sneezes, comic, never a cough of pain), `med_foam_bonk` (3 for the Pageant Rules mutator), `med_kazoo_blat` (2), `med_purse_jingle` (2), `med_trumpet_crack` (2), `med_crowd_ooh/aww/gasp` (shared crowd shorts, 3 each). Footsteps: `med_step_cobble`, `med_step_mud`, `med_step_scree` (3 each, derived from the existing biome step bank).

Death sounds: reuse `death_*` with a cough/clatter layer for plate (a tin-can drop) and a "whump" for the Cinderwyrm crash; no scream exceeds the existing `death_oof` level and none reads as pain.

### 4.1 Set-piece one-shots and cue aliases (names used in the `sfx` lists of `missions_outline.md`)

Aliases of the twelve families (variants of one family, picked by the shuffle bag): `med_banner_fall` = family 11 (fall); `med_ram_gate_boom` = family 9; `med_trebuchet_groan` and `med_counterweight_whump` = family 8; `med_hoof_thunder` = family 4; `med_wall_collapse` = family 10; `med_bell` = family 12.

New small one-shots (each 2 to 4 variants; synth first, a real CC0 row where the hunt finds one): `med_boulder_impact` (reuse `boulder_impact`), `med_cart_squeak` (a wheel squeaking in a minor key), `med_chain_rattle` (drawbridge chain, iron links), `med_crowd_gasp` (shared crowd short), `med_dragon_roar_far` (the roar low-passed and distant), `med_dragon_sniff` (a big wet sniff, comic), `med_dust_whump` (a muffled thud with a dust hiss), `med_fire_crackle` (reuse `fire_ignite`), `med_horn_charge` (a war horn that arrives a beat late), `med_horse_neigh_chorus` (3 neighs layered, reuse `horse_neigh_1-3`), `med_masonry_fall` (a long cascade ending in one stone), `med_sheep_bleat_far` (a single distant bleat, M4 fog gag), `med_splash_big` (a large splash with a river wash), `med_troll_groan` (a low offended groan), `med_wood_crack` (reuse), `med_wood_groan` (timber under load, slow), `med_wood_split` (a loud plank split).

## 5. Ambience loops per arena family

Each arena theme maps to a base loop plus optional layers via `arenaInfo`. At least 3 real CC0 loops per era are required (plan AU1); the rest are synth recipes that exist already or are added to `synth.js`. Loops are 20 s or longer and seamless.

| arena family | arenas | base loop | optional layers | source |
|---|---|---|---|---|
| meadow and fete | `med_pageant_green`, `med_tourney_field` | `amb_fete`: crowd murmur, flags flapping, a distant out-of-tune band | birds | new (real CC0 crowd murmur plus synth band) |
| ford and river | `med_ford_of_dithering`, `med_long_bridge` | `amb_water` (existing) plus `amb_willow` | reeds, frogs at dusk | existing plus 1 real CC0 river loop |
| moor and fog | `med_mizzlemoor` | `amb_moor`: wind over heather, a distant curlew, low fog hush | thunder one-shots in storm | real CC0 wind loop plus synth |
| castle and courtyard | `med_castle_dour`, `med_dour_courtyard`, `med_moat_keep` | `amb_castle`: wind in stone, banners, a distant chain creak, echo | crowd (courtyard), rain | synth plus 1 real CC0 wind-in-stone loop |
| abbey cloister | `med_bellfount_abbey` | `amb_cloister`: doves, a distant single bell every 25 s, soft murmur | bees over the herb beds | synth plus the shared bell |
| village | `med_pennywhistle` | `amb_village`: hens, a windmill creak, distant hammering | fire crackle when thatch burns | real CC0 hens/hammering loops |
| mountain and lair | `med_mount_perpetual` | `amb_crag`: low wind, rumbling, lava crackle | coin glints, distant dragon snore | synth plus existing `amb_fire` |
| siege camp | `med_siege_camp` | `amb_camp`: hammering, ropes, murmur, a distant horse | pitch-barrel bubbling | real CC0 plus synth |

Aggregate beds: a **hoof bed** when many cavalry run, a **pole forest** creak bed under big blocks of braced pikes, and no gunfire or vehicle beds (those are Modern's). The bed rules are routed through the existing "frustum shooters" counter with new thresholds.

## 6. Router and mix notes for AUDIO

1. Every Medieval def sets `audio` profile keys (hit, swing, shoot, death, voice) through the planned `AUDIO_PROFILES` table; the dead `UnitDef.sfx` hook is not used.
2. New event handlers: `banner_fall`, `brace_break`, `bailout`, `structure_hit` with stage thresholds, `gas_cloud`, `air_landed`, `prop_ignited`, `script_beat`, `setpiece` (the single dispatcher fans out stinger, sfx and announcer duck).
3. A set-piece plays its sfx list at the shot's start; the stinger ducks the music; the announcer line is queued after the stinger's first beat (priority 5, bypass alternation).
4. `mixtest` per era runs three scenarios: a cavalry charge into a pike block with a banner fall; a siege with 2 trebuchets, a ram and the gate falling; the dragon finale. Per-family loudness classes (section 1) are asserted; true peak < -1 dBFS; no clipping; hot-family repetition (the same variant twice in a row) < 15 percent.
5. Not verifiable here: the sound by ear, the real-device mix, and whether the candidate tracks fit the tempo targets; the verification report says so.
