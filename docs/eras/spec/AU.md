# spec/AU: audio for the three new eras (sound bibles, source matrix, sprite packs, router tables, music, stingers, credits, hunt plan)

Status: **DRAFT until the M2 taxonomy freeze AND rosters v1** (q3_program residual 26; plan section 14 row spec/AU). Owner: AUDIO. Co-owner of the fetch work packages: HUNTER. Companion data file: `docs/eras/spec/au_matrix.json` (the machine-readable source matrix; section 3.3 and every table below that is marked "generated" are produced from it by a script, so the two cannot drift; `tests/audio/matrix.test.mjs` re-derives the counts and fails on any difference).

Dependencies (read before building from this file): `docs/eras/plan.md` sections 1, 9, 10 (AU0..AU8), 14; `docs/eras/maps/07_audio_humor_assets.md`; `docs/eras/design/{medieval,modern,scifi}/sound_music.md` (the three sound bibles, binding, amended in 3.2.4), `rosters.md`, `god_powers.md`, `missions_outline.md`, `arenas.md` (for cue names and set-pieces); `spec/AR` (AP rows AP-U01, AP-U02, AP-X01..X03, AP-T06; OW-07, OW-08; 3.11.2, 3.11.3), `spec/M` (3.8 projectile kinds, 3.12 events, 3.15 AUDIO row), `spec/M-layers` (air layer events), `spec/W` (themes 3.5.3, foot 3.4.5, arena presets 3.9), `spec/UC` (3.8 audio dry-run, UC-31, UC-40..42, R-UC4), `spec/VF` (3.15 audio suite, OI-4), `spec/MS` (H5, H6 events), `q1_content.md` Q4-Q12, Q24, Q25, Q31, Q33, Q34, `q3_product.md` items 27, 28, `q3_program.md` items 21, 26.

How this file was made: every source named in the matrix was looked up on its real page (OpenGameArt `tools/oga.py info` records for 958 packs, Kenney `License.txt` read from the real zip, incompetech catalogue plus a ranged download of head and tail, the 7z header of the firearm library read with ranged requests so no 194 MB download was needed), the 70 OpenGameArt and 4 Kenney packs already on disk were ffprobed and described, the 90 other OpenGameArt packs the matrix uses were probed remotely (file URL, size, codec, rate, channels and duration from ranged requests; no archive over 20 MB was downloaded and nothing downloaded was executed), and 41 music files were measured (loudness, key, loop seam; some were on disk, the rest were fetched to a quarantine directory). Numbers in this file are measurements unless marked "estimated". **Nobody has listened to any candidate**; every pick is a metadata and descriptor judgement, and the verification report says so (3.4.6, 3.16.5).

## 1. Purpose and scope

AUDIO delivers, for Medieval, Modern and Sci-Fi: (a) a sound bible per era (3.2); (b) a source matrix that names, per cue family, the needed variants, the candidate recordings with licence, the chosen rows, the fallback and the cue ids (3.3, `au_matrix.json`); (c) the music slot table, stingers and ambience loops (3.4 to 3.6); (d) processing recipes, including the realism chain for guns (3.7); (e) the sprite-pack format and its playback and verification (3.8); (f) the ledger, manifest and tool changes (3.9, 3.10); (g) the router tables and handlers (`PROJ_AUDIO`, `EXPLOSION_AUDIO`, `AUDIO_PROFILES` for 102 units, `ABILITY_CUES`, god-power cues, the set-piece dispatcher, aggregate beds) (3.11); (h) engine and music-director changes (3.12); (i) credits and licence snapshots (3.13); (j) the loudness classes, `mixtest` scenarios and `audit_sfx` templates (3.14); (k) the 500-file dress-rehearsal publish (3.15); (l) the hunt work plan (3.16); (m) the exact answers to every request filed against AUDIO by other specs (3.17).

Not AUDIO's: the sim events and their payloads (spec/M; AUDIO states what it consumes in 3.11.8), the `GodPower` and `Mission` data (spec/CU, spec/MS), the text and bark content (spec/H), the per-arena theme and material ids (spec/W; AUDIO fills the `amb` and `foot` columns), the registry mechanics that hold per-era data (spec/AR; the AUDIO tables live in `src/content/era_<id>/data.js` as AR OW-07 says), and the gates themselves (spec/VF owns the tools `audit_sfx`, `pack_check`, `licence_check`, `cue_trace`; AUDIO owns the templates, class windows, scenario definitions and the pack builder those tools read).

## 2. Decisions

| id | decision | evidence or reason | closes |
|---|---|---|---|
| AU-D1 | **Sprite packs are MP3, mono, 44,100 Hz, 64 kbps, written with a LAME Info/Xing header, at most 1,000,000 B per file** (about 120 s of sprites). One decoded master buffer per pack; each ledger row is a view `{pack, s0, n}` in whole samples at 44,100 Hz. Sprites are separated by 50 ms of digital silence and carry 2 ms baked fades. | Chromium 141: MP3 with an Info/Xing header decodes with 0 offset and exact length (264,600 samples for 6.000 s); MP3 without it adds 25.87 ms and 1,512 samples; a 1,010,415 B pack of 115 real rows (120.4 s) decodes in 205-225 ms; ffmpeg and Chromium decodes of the same pack differ by at most 5.06e-5 | q1_content Q10; plan AU2 |
| AU-D2 | **Format rejected: AAC/M4A (not decodable by the test Chromium: `decodeAudioData` throws), Vorbis (adds 808 samples, 18 ms), Opus (exact length, but 3-5x slower to decode: 27.7-45.2 ms against 9.5 ms for 6 s mono, and `.opus`/`.webm` media types are unproven on the artifact host).** MP3 is also the only audio type the artifact host is proven to serve (golden_log: 382 `audio/mpeg` files hosted). The choice is final unless the dress rehearsal (3.15) fails one of its criteria; then Vorbis in `.ogg` is the fallback and `pack_check` gains a per-format length correction table. | `tmp` Chromium tests 3.8.1; golden_log.md line 7 | plan AU2 "format fixed by the dress rehearsal" |
| AU-D3 | **Playback is `source.start(when, s0 / 44100, n / 44100)` on the shared pack buffer. The `duration` argument is in buffer time: output length is `n / (44100 * rate)`** (measured: rate 0.5 gives 0.6 s for a 0.3 s argument). No `createBuffer` copies. The pack is the eviction unit. | rate test 3.8.2 | q1_content Q10 |
| AU-D4 | **Ledger gains the columns `era`, `pk`, `s0`, `n`, `lc` (loudness class), `lic` (chosen licence key), `snap` (licence snapshot sha256), `slot` (music) and `src` stays the page URL.** Ancient rows are byte-identical and carry none of the new keys (AR AP-X01); absent `era` means `ancient`. | AR 3.11.3, AP-X01 | AU3 |
| AU-D5 | **Reuse of Ancient rows is declared in the cue's pick groups, not in the manifest**: a new family's `pick` is `[[new rows], [Ancient fallback ids]]` (first group with a match wins, existing `SfxBank.slot` behaviour), so Ancient manifest rows stay byte-identical and the warm planner finds the reused rows by walking `CUES`. | `sfx.js:41-48`; AP-X01 | q3_product 28 |
| AU-D6 | **Licence gate: CC0, CC BY 3.0, CC BY 4.0, public domain only; the chosen licence is recorded per row, never "any tag matched"; the order of choice is CC0, CC BY 4.0, CC BY 3.0, PD; a page that also lists SA, GPL or OGA-BY is credited under the chosen licence only; every source gets a licence-page snapshot (sha256 in the row) and a provenance score.** 8 pages used list a rejected licence beside an accepted one (3.13.3). | q1_content Q12; VF 3.15.5 | ER23 |
| AU-D7 | **The source matrix is the contract.** `tools/gen_sfx_spec.py` turns `au_matrix.json` into `S()` rows in `tools/sfx_spec.py` (new section per era, generated, not hand edited); a family row exists in the ledger only if the matrix has it. | 3.3, 3.10 | plan AU1 |
| AU-D8 | **Realism processing: Modern and Sci-Fi small arms are cut to 0.15-0.35 s, high-passed at 160 Hz (small arms) or 70-80 Hz (cannons, mortars), tails shaped so t(-40 dB) <= 0.28 s; Medieval has none** (the palette is cartoon-heavy and unprocessed apart from the stone-hall send). The chain is specified as `build_sfx.py` options and an equivalent ffmpeg expression, and was run on 8 real recordings (3.7.2). | bibles section 1 | q1_content Q6 |
| AU-D9 | **Burst templates**: a burst is ONE sample (3 rounds for mg/smg/pew, 6 for rivet); the router plays it when `round % burst == 0`; template numbers in 3.11.2. | bibles; cues.js `T` | plan AU4 |
| AU-D10 | **Aggregate beds are granular schedulers over the family's own sprite rows (gunfire, laser, bubble) or layered loops (hoof, pole, machine)**, driven by a `ShooterWindow` (distinct shooters inside 60 u over 1.5 s) and unit counts, with hysteresis; initial thresholds are in 3.11.8 and are tuned by `mixtest` within stated ranges. The vehicle bed is built after a prototype with pass criteria (3.11.8). | bibles section 5; no "frustum shooters counter" exists in code (PC-AU2) | plan AU4 |
| AU-D11 | **Telegraph sounds have exact lengths and are aligned to impact**: shell whistle 2.200 s (+-5 ms), orbital charge 2.000 s, lock line 1.100 s; the router starts them at `impactTime - length` or with an offset. | bibles; M10 | fairness contract |
| AU-D12 | **`AUDIO_PROFILES` is keyed by unit def id, built from 20 + 18 + 18 archetypes (56 in all) with per-unit overrides, and lives in `era_<id>/data.js`**; the router resolves `profile.slot` first, then `PROJ_AUDIO[kind]`, then the legacy code path (Ancient only). `UnitDef.sfx` stays dead. | UC-40; AR OW-07; q1_content Q7 | AU4 |
| AU-D13 | **`PROJ_AUDIO` is strict**: every `ranged.proj` of every def of a released era must be a `PROJ_KINDS` id or an alias in `PROJ_ALIAS`, and the default `bow_shoot` is never reached for a non-arrow kind (UC-31). | cues.js:338 default | UC-31 |
| AU-D14 | **Set-pieces and boss entrances go through one dispatcher** (`setpiece`, `script_beat boss_enters`): duck music -6 dB for 700 ms, stinger at t0 on the `sting` template (announcer-adjacent bus), sfx list staggered 0.12 s, announcer queued after the stinger's first beat. | bibles section 3; M 3.12 | plan AU4 |
| AU-D15 | **Music: 7 slots per era (menu, map, battle low/mid/high, victory, defeat) = 20 files + 1 runtime synth bed (Sci-Fi defeat) over three eras; the floor of 6 files per era is met by every era (Medieval 7, Modern 7, Sci-Fi 6 files plus a synth defeat bed); the cut-ladder rung "6 to 5" may only drop an alternate, never a slot.** No Ancient track plays in a new era; `editor` and `comedy` stay shared. The map bed is a `menu`-mood row with `slot:'map'` (no new mood). | q3_product 27; bibles | AU3 |
| AU-D16 | **Loop policy v2**: a track is a native loop when the composer ships a loop file or `seam_vs_p95 <= 3.0` (measured on 41 files: 0.42-2.52 on the 11 genuine loops, 3.13-25.09 on the 22 files that are not, 0.00-0.09 on 8 files that end in near-silence and are caught by the tail term, positive control 1.06); everything else is cut on a bar boundary with a fade and played with the 3 s crossfade; the old v1 test (`audiolib.loop_check`) is kept as a secondary report. | 3.4.2 measurements | q1_content Q11 |
| AU-D17 | **Battle tiers share a tonic family**: the estimated tonics of low, mid and high lie within 3 steps on the circle of fifths (relative keys count as equal), checked by `tools/key_check.py` and confirmed by a listening check. | bibles rule 3; 3.4.3 | bibles |
| AU-D18 | **Core audio**: at most 10 tiny rows per era (each <= 6,500 B) carry `core:true`; no new core music; `battle_mid_epic_boss` is un-cored when the AR7 size report projects the page above 4,600,000 B at the P1 checkpoint. Chosen core rows are listed in 3.12.5. | plan AU6; AR 3.11.2 | D17 |
| AU-D19 | **Slim runtime manifest**: the page inlines `{id, p, c, t, d, e, pk, s0, n, lc, core}` per sfx and `{id, p, m, t, d, loop, bpm, l, fo, e, slot, themes, en}` per music row; notes, titles, authors, licence URLs and sources stay in `assets/manifest.json` and the credits. Measured on the current ledger: 233,704 B raw / 23,089 B deflated becomes 42,936 B / 6,282 B (16.4 B per row deflated). | measurement 3.9.3 | plan AU6 |
| AU-D20 | **Hidden eras**: rows with a hidden `era`, their files and their credits section are omitted from `__VW_MANIFEST__`, `files.json`, `files.manifest.json` and the Credits text; code and data stay and are counted. `publishedFiles` per era is carried in the manifest (3.9.4). | AR 3.11.3; q3_program 21 | AR-T31 |
| AU-D21 | **Credits are sectioned per era with marker comments**; every CC BY entry carries title, author, source URL, licence and URL, and "Modified"; synthesized and processed families are declared in a closing section. | q1_content Q34; VF 3.15.5 | ER23 |
| AU-D22 | **Loudness classes are relative**: each class target (the bibles' LUFS-S numbers) is asserted as an offset from the Ancient `hit_blade` family measured by the same solo-train protocol in the same run (3.14.2), so a calibration error of the offline chain cancels. | q1_content Q8 | VF OI-4 |
| AU-D23 | **Dead cues**: `ui_select` (13 call sites) and `ui_drop` (2) get cue families over the existing ledger rows `ui_select_1-2` and `ui_drop_1`; a scan test fails on any cue literal absent from `CUES`. | 3.12.4 | plan AU5 |
| AU-D24 | **Ambience loops are single files** (24-30 s, 48 kbps mono, seam <= 0.02 FS), loaded on demand by the arena's `amb` ids and never warmed by group; new category `amb_loop`, group `amb`. | 3.6, 3.12.2 | q1_content Q25 |
| AU-D25 | **Stingers are deterministic synth builds** from a 42-voice vocabulary (35 stingers, event lists in the matrix), rendered to sprites in one `sting` pack per era; stingers that name a real family (`row` events) mix that family's actual rows so the stinger and the gag agree. | bibles section 3 | plan AU4 |
| AU-D26 | **Third-party titles that contain words the text sweep bans are credited under the original title through the signed exception list** (3.13.4: 16 works); AUDIO does not rename a work. | bibles Medieval/Modern | ER11 |
| AU-D27 | **Firearm library**: only the 12 sessions the matrix uses are extracted (`tools/fetch_firearm_lib.py`, `py7zr`, ranged resume, sha256 per extracted file); folder names (weapon makes and models) never reach a shipped string; ledger `notes` are not shipped. | 3.16.2 | q1_content Q4, Q12 |
| AU-D28 | **Declared processed or synth-only families** (no licence-clean recording): 4 Medieval, 9 Modern, 5 Sci-Fi, plus 3 hot families with fewer than 6 recordings. They are listed in the credits as synthesized and in the verification report. | 3.3.4 | q1_content Q4 |
| AU-D29 | **Objective checks**: `tools/audit_sfx` templates for 16 new categories (3.14.4), a spectrogram sheet per family for an agent to read (`tools/audit_sheet.py`, ffmpeg `showspectrumpic`), hot-family repetition metric. | q1_content Q9 | ER12 |
| AU-D30 | **Footsteps**: the `foot` keys of W 3.4.5 (existing 7 plus gravel, metal, tile, dust) resolve per era through `ERA_STEP` (3.11.9); heavy-step cues through `ERA_HEAVY`; UI cues through `UI_BY_ERA`. | W 3.4.5 | q1_content Q25 |
| AU-D31 | **Ids**: ledger ids are `<family>_<k>`; stinger ids are `med_sting_*`, `mod_stg_*`, `sf_stg_*` (the bibles and `missions_outline.md`), with the aliases `med_stg_*` used by proposal documents accepted by the router (10 aliases in the matrix). | cue scan 3.11.10 | id drift |
| AU-D32 | **No scream in new eras**: new kill causes (`bullet explosion energy emp crush crash mine strike`) have `CAUSE_SCREAM` 0; deaths come from the unit profile (`mod_helmet_bonk`, `sf_knockout`, shared `death_male` or `death_oof` for Medieval) at no more than the `death_oof` level. | bibles; PC8 gore auto | M 3.3 |

## 3. Detailed specification

### 3.1 Files, owners and AP rows

| path | change | AP row | owner |
|---|---|---|---|
| `src/audio/cues.js` | new templates (3.11.2), `ui_select`/`ui_drop` families, resolution order `profile -> PROJ_AUDIO -> legacy`, new handlers (3.11.8), `ShooterWindow`, `BedManager`, `SetpieceDispatcher`; Ancient branches verbatim | AP-U01 | AUDIO |
| `src/audio/manifest.js` | `Catalog._norm` reads `era pk s0 n lc slot en`; `eraRows(era)`; `CAT_GROUP` additions (3.12.2) | AP-U02 | AUDIO |
| `src/audio/sfx.js` | `PackStore`, row views, pack-level LRU, `warm(groups, era)`, `ensureSetpiece(ids)` | AP-U02 | AUDIO |
| `src/audio/engine.js` | `setEra(era)`, per-screen era music, `_startVoice` uses `start(ts, off, len)` for pack rows, `limiterBypass` tap, `align` option for telegraphs | AP-U02 | AUDIO |
| `src/audio/music.js` | `rankTracks(catalog, mood, theme, era, slot)`, era rows only, shared moods, `slot:'map'` | AP-U02 | AUDIO |
| `src/audio/synth.js` | `RECIPES` for every synth-only family (3.7.4), `MUSIC_SPECS` entries `menu_<era>`, `map_<era>`, `battle_<era>_low/mid/high`, `victory_<era>`, `defeat_<era>` | AP-U02 | AUDIO |
| `src/content/era_<id>/data.js` | `AUDIO_PROFILES`, `PROJ_AUDIO`, `PROJ_ALIAS`, `EXPLOSION_AUDIO`, `ABILITY_CUES`, `CC_BY_SPECIES`, `ERA_STEP`, `ERA_HEAVY`, `UI_BY_ERA`, `GOD_CUES`, `SETPIECE`, `BOSS_STINGER`, `EVENT_DIRECT`, `PROP_BREAK` (AR OW-07) | AR era packs | AUDIO |
| `assets/manifest.json` | append rows only (AP-X01); `publishedFiles` per era | AP-X01 | AUDIO |
| `assets/CREDITS.md` | append-only sections per era with markers | AP-X02 | AUDIO |
| `assets/audio/pack/*.mp3`, `assets/audio/amb/*.mp3`, `assets/audio/music/*.mp3`, `assets/licences/*.txt` | new files only | AP-X03 | HUNTER |
| `tools/sfx_spec.py`, `tools/music_spec.py`, `tools/build_sfx.py`, `tools/build_music.py`, `tools/build_manifest.py`, `tools/verify_assets.py`, `tools/credits_lib.py`, `tools/build_all.sh`, `tools/sources_oga.txt`, `tools/fetch_kenney.sh`, `tools/fetch_incompetech.py` | era columns, new options, pack step, `Path(__file__)` paths (3.10) | AP-T06 | HUNTER and AUDIO |
| new tools | `tools/gen_sfx_spec.py`, `tools/build_pack.py`, `tools/loop_check2.py`, `tools/key_check.py`, `tools/audit_sheet.py`, `tools/fetch_firearm_lib.py`, `tools/refetch.py`, `tools/gen_era_cues.mjs` | AP-T06 (NEW) | AUDIO |
| `tools/mixtest.mjs`, `tests/audio/mix_entry.js` | `--era --scenario --classes --stems`, per-family solo trains | AP-T06 | AUDIO with TOOLS-VERIFY |
| `tests/audio/*.test.mjs`, `tests/baseline/sfx_templates.json` | tests of section 4 | tests | AUDIO |

### 3.2 Sound bibles (AU0), consolidated

Each bible is the binding file `design/<era>/sound_music.md`; this section restates the rules AUDIO enforces and records the amendments AUDIO needs (3.2.4).

#### 3.2.1 Medieval: clanging, creaking, ceremonial

| aspect | rule |
|---|---|
| reference timbres | struck iron and tin (anvil, bucket on bucket) with a short bright ring; timber under strain (winch, hinge, chain, pole butts into soil); frame drums and a rope-buzz snare; natural brass slightly flat; shawm and fiddle; handbell and church bell with a long round decay; hooves layered into a gallop; cloth snap; rope twang; crowd ooh/aww/gasp a beat late |
| forbidden | gunshots and any firearm click; lasers and electronic zaps; synth pads and arpeggios; a modern drum kit; cathedral choir, chant or "ahh" pads; trailer braams; bagpipes; a clean "shing" sword swish; real chants; anything that reads as pain |
| realism processing | none: hits keep their transients and a short bright tail; a light stone-hall send for castle, abbey and courtyard arenas only; the master chain is unchanged |
| classes | `hit` -18, `volley` -22, `siege` -16 (music duck 6 dB), `bell` -20, `dragon` -14 (roar only through the limiter-bypass tap), `ui` -24 |
| UI | quill scratch hover, wax-stamp thump click, stamp plus brass blip on Deploy and confirm, stamp when a cooldown is ready, page rustle for overlays, hand bell on star award (`UI_BY_ERA.medieval`) |

#### 3.2.2 Modern: poppy, clacky, crackly

| aspect | rule |
|---|---|
| reference timbres | cap-gun pops, popped balloons, a tin biscuit lid, typewriter return, stapler, rubber stamp, bolt clack, pen click, radio squelch, kettle whistle, vibraphone and upright bass and brushed snare, a toy engine's sewing-machine clatter, a lawn-mower pull-cord |
| forbidden | movie-grade gunshots with long low tails; film booms and braams; real sirens (the stalemate siren is a toy synth); screams; real radio chatter; cinematic drum-and-drone scores; patriotic or march pieces evoking a real force; bugles playing real calls; real emergency tones |
| realism processing | **applied** (3.7): guns 0.15-0.35 s, tails to a quarter, high-pass 160 Hz (80 Hz cannons); explosions are a balloon pop plus a cymbal tail (s), a fuller whoomp (m), a cartoon boom with a crater thud (l) |
| classes | `pop` -20, `burst` -21, `crack` -17, `snap` -22 (closer to the camera), `clack` -24 (audible at 35 u), `thump` -16 (music duck 4 dB), `whistle` -20, `blast` s -18 / m -16 / l -14, `tink` -17 (the loudest small sound), `bed` -26, `ui` -24, commentator -14 |
| UI | stapler tick hover, rubber-stamp thud click, stamp plus typewriter ding on Deploy and confirm, three rising stamps on star award, pen click on cooldown ready, paper rustle for overlays, radio squelch before every commentator line |

#### 3.2.3 Sci-Fi: glassy, humming, squelchy

| aspect | rule |
|---|---|
| reference timbres | glass tapped with a fingernail, a soap bubble pop, a tape stop, a fridge compressor, a theremin wobble, vibraphone, analog bleeps, a toy laser, a bicycle horn, a slide whistle, a hotel bell, a wet sponge, a fluorescent tube starting |
| forbidden | trailer brass and braams (`fanfare-for-space`, `exciting-trailer`, `Discovery Hit`, `Dark Star` are not used); real gunshots; any blade or humming-sword whoosh; real sirens (the klaxon is a toy two-tone synth); screams; real speech or footage-like chatter; real emergency tones; a mission-control countdown voice (the robotic count is chopped into ticks only) |
| realism processing | **applied**: chunky toy-box pews 0.15-0.30 s with a body thump, tails to a quarter, high-pass 140 Hz (70 Hz cannons); rail 1.2 s ringing tail, orbital 2 s charge; explosions as for Modern |
| classes | `pew` -20, `chatter` -21, `crack` -17, `lob` -19, `absorb` -24 (thinned), `pop` -18, `tick` -26 (audible at 25 u), `emp` -16, `blink` -22, `shimmer` -24, `thump` -15 (duck 4 dB), `orbital` -14 (duck 6 dB), `bed` -26, `goo` -20, `blast` as Modern, `ui` -24, commentator -14 |
| UI | soft tick hover, glassy bwip click, rising two-note ting on Deploy and confirm, three rising tings on star award, soft chime plus a closing sweep on cooldown ready, hex whoosh for overlays, the 90 ms booth chirp before every commentator line |

#### 3.2.4 Amendments to the bibles (AUDIO decisions where a bible and the evidence disagree)

| # | bible text | amendment | reason |
|---|---|---|---|
| A1 | Medieval menu candidates `minstrel-dance`, `old-tower-inn`; map `medieval-exploration` or `medieval-the-bards-tale`; "Umplix `to-battle` (verify licence)" | real slugs are `medieval-minstrel-dance`, `medieval-the-old-tower-inn`, `medieval-the-bards-tale`, `medieval-exploration`; `to-battle`, `the-battlefield` are CC0 (OGA info record) | `minstrel-dance`, `old-tower-inn`, `kings-feast` answer HTTP 404; every RandomMind pack ships a `Loop_*.wav` composer loop |
| A2 | "shares the key centre D" (Medieval) | tonic family within 3 fifths (AU-D17); measured picks are D minor, B minor, B minor | the keys of the CC0 loops are fixed by the composers |
| A3 | "the bed rules are routed through the existing frustum shooters counter" | no such counter exists; AUDIO adds `ShooterWindow` | `cues.js` tick() counts moving units only (lines 530-547) |
| A4 | Medieval battle high 126 bpm in 6/8 | the chosen CC0 pick is 142 bpm (estimated, 4/4 feel); 126 bpm is not met and the listening check decides whether to keep it | no CC0 6/8 battle loop found in the probed packs |
| A5 | Modern/Sci-Fi "CC0 first" | all 13 non-Medieval primaries are Kevin MacLeod CC BY 4.0; 9 CC0 OGA tracks are listed as audition candidates (3.4.4) | tempo and instrumentation of the bibles are specific to the catalogue; CC0 candidates have only head probes |
| A6 | bible hot-family reuse lists (Ancient ids) | reuse is the second pick group (fallback), not the first choice; the matrix finds recorded rows for almost every slot | Medieval packs on disk contain 45 unused weapon-impact sessions and 26 unused texture files |
| A7 | Sci-Fi `sf_knockout`, `sf_powerdown` named without a family | `sf_knockout` is a family (3 recorded + 2 rows), `sf_powerdown` an alias of `sf_emp_burst#powerdown` | UC-40 needs a death cue per cause |
| A8 | stinger lengths "authored targets" | lengths are asserted to +-80 ms by the pack builder | pack rows have fixed `n` |
| A9 | spec/CU R-CU-A1: stingers on the `sfx` bus at priority 100 | the `sting` template sits on the announcer-adjacent bus at priority 96, below `announce` (98) and `jingle` (100); the `audio.stinger()` signature is adopted unchanged (3.17) | a stinger must never steal a spoken line or an Ancient jingle voice |

### 3.3 Source matrix

#### 3.3.1 What the matrix contains

`au_matrix.json` (schema `au_matrix/1`) holds: `sources` (166 packs, each with host, slug, title, author, submitter, page, `licences_listed`, `licence_chosen`, recordings, total seconds, file count, `on_disk`, `raw_dir`, `fetch` command, notes), `families` (one object per cue family: era, class hot/adj/bus/step/bed, loudness class, template, needed variants, minimum recordings, `rows[]` (ledger id, source key, chosen file, source duration, recipe, tag, slice index, estimated sprite seconds), `layers[]`, fallback kind and text, cue ids, pack, declared reuse ids, derived `reached_by_units` and `reached_by_tables`), `aliases` (cue ids that are tags or pitches of a family), `ambience`, `music`, `stingers`, `recipes`, `synth_recipes`, `packs`, `router`, `credits`. Chosen files are picked deterministically: the sorted list of files matching the row's pattern, `i // per` for row `i`. A pack with sessions (the firearm library, weapon impacts) yields several rows per file through `per` and the slice index.

#### 3.3.2 Coverage against the plan's targets (generated)

| era | plan target (rows) | families | rows committed | recorded | synth-baked | stretch (listed, not committed) | hot families with >= 6 recordings | declared synth-only families | stingers | alias cues | ambience loops | real ambience |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Medieval | 60 | 40 | 171 | 149 | 22 | 8 | 12 / 12 | 4 | 14 | 23 | 7 | 7 (7 with a CC0 row) |
| Modern | 120 | 43 | 190 | 159 | 31 | 16 | 9 / 11 | 9 | 10 | 30 | 6 | 6 (6 with a CC0 row) |
| Sci-Fi | 110 | 49 | 213 | 201 | 12 | 4 | 10 / 11 | 5 | 11 | 34 | 6 | 6 (5 with a CC0 row) |

Targets are floors (plan section 1: Modern 120, Sci-Fi 110, Medieval 60 plus declared reuse). All three are exceeded because recorded rows exist for nearly every slot; the surplus buys variety for hot families (repetition rule, 3.14.5) and is not padding: each family lists only rows its recipe can cut from the named file. The stretch families (`commit: false`, 28 rows) are built only if their pack stays under 1,000,000 B, which every pack does with the stretch rows included.

#### 3.3.3 Rules the matrix enforces

1. Any family expected to fire more than 2 times per second is `hot` and needs >= 6 distinct recordings; heavy singles need >= 3 (q1_content Q4). The tests in 4 recompute `recordings` from the chosen files. Distinct means distinct source files (several rows may be cut from one session file only through `per`, and a session counts once).
2. A family below its minimum is allowed only if it is `declared_synth_only` or carries the note SINGLE-SOURCE; it is then named in 3.3.4, in the credits "Synthesized and processed" section and in the verification report.
3. A source file may feed more than one family when the cuts differ (different onset, recipe or pitch); the row ids differ and the credit lists the source once.
4. Every committed family must be reached by at least one unit profile, ability table, projectile or explosion table, set-piece, god power, event handler, prop-break table, footstep table or UI table (`reached_by_*`); orphan families fail `matrix.test.mjs`. Current orphans: 0.
5. Every cue id that the three bibles, `missions_outline.md`, `god_powers.md` or `rosters.md` name resolves to a family, an alias, a stinger, an ambience id or a shared Ancient cue (checked by script: 0 unresolved of 372 names; names that belong to arenas, music slots and the rejected proposal documents are classified in 3.11.10).

#### 3.3.4 Honest shortfalls

| era | family | recordings / minimum | what is true |
|---|---|---|---|
| Modern | `mod_bullet_snap` | 5 / 1 declared | no licence-clean recorded ricochet or whiz exists (the only OGA hit, `red-eclipse-sounds`, is CC BY-SA, rejected); the five "recordings" are Kenney metal impacts processed into a zip (`ZIP_PITCH`) plus 3 synth rows: processed, not recorded |
| Modern | `mod_shell_whistle` | 1 / 1 declared | the 2.2 s length is a fairness contract; 3 synth timbres plus one recorded air-rush layer (`4-projectile-launches`) |
| Modern | 9 synth-only one-shots | 0 | `mod_paper_rustle`, `mod_leaf_rustle`, `mod_bugle_wrong` (a real bugle call is forbidden), `mod_reversing_beep` (a real alarm is forbidden), `mod_tower_buzz`, `mod_water_rush`, `mod_tape_unroll`, `mod_kazoo_blat`, `mod_hold_music_sting` |
| Modern | `mod_machine_bed` tread layer | partial | tank engine loop recorded (1 licence-clean loop, CC BY 3.0); the sewing-machine clatter over it is synth |
| Sci-Fi | `sf_cloak_shimmer` | 5 / 1 declared | one recorded shimmer (`shimmer-glitter-magic`), 4 processed phaser/weird files and one synth whisper |
| Sci-Fi | 5 synth-only | 0 | `sf_klaxon` (real sirens forbidden), `sf_power_down_hum`, `sf_sonic_shush`, `sf_lock_line` (exact 1.1 s), `sf_hold_music_snippet` |
| Medieval | 4 synth-only | 0 | `med_shell_whistle` (exact length), `med_gas_hiss`, `med_kazoo_blat`, `med_rain_hush` |
| Medieval | `med_hoof_thunder` | 8 recordings, 3 loop recordings | only 3 licence-clean loops exist (gallop_01, gallop_02, Trot); 6 loop rows are 3 recordings x 2 declared processings |
| Medieval | `med_dragon_roar` | 4 / 3 | heavy single: troll roars, a deep monster roar, Ogrebane growls, a retro roar; the sub layer is synth |
| Medieval | crowd `ooh` and `aww` | 1 recording | Ancient `crowd_ooh_1` is cut from `ooh.ogg`; the three new ooh and three aww rows are pitch and speed variants of the same file (declared); no clean recorded aww exists |
| all | tread, trebuchet, lance, servo (plan AU1 list) | see families | tread: processed engine + synth clatter; trebuchet: 7 recordings (winch, boom, cave-in); lance: 7 (wood cracks, plank, impacts); servo: `sf_hover_hum#servo` from 3 Kenney `spaceEngineSmall` files |

#### 3.3.5 Per-era family tables (generated)

**Medieval**

| family | class | loudness | template | cue ids | variants | rows rec+synth | recordings / min | pack | fallback | note |
|---|---|---|---|---|---|---|---|---|---|---|
| `med_sword_on_plate` | hot | hit | hit | med_sword_on_plate | 8 | 6 + 0 | 6 / 6 | pack_med_blade | processed: ancient sword_hit_1-5, blade_clash_1-6 and helmet_ping_1 pit |  |
| `med_mace_crunch` | hot | hit | hit | med_mace_crunch, med_foam_bonk_hard | 6 | 6 + 0 | 6 / 6 | pack_med_blade | processed: ancient mace_bonk_1-2 and shield_bash_1-3 plus synth tin rat |  |
| `med_lance_shatter` | hot | hit | hit | med_lance_shatter, med_crowd_ooh | 6 | 9 + 0 | 7 / 6 | pack_med_blade | processed: ancient wood_splinter_1 + wood_crack_1-3 + crowd_ooh_1 |  |
| `med_hoof_thunder` | hot | siege | thump | med_hoof_thunder, med_horse_neigh_chorus | 9 | 8 + 2 | 8 / 6 | pack_med_beast | processed: ancient horse_gallop_1 and hoof_step_1-2 with a rising gain  |  |
| `med_brace_thunk` | hot | hit | hit | med_brace_thunk, med_brace_place | 6 | 8 + 1 | 6 / 6 | pack_med_blade | processed: ancient spear_stab_3-5 and wood_thud_1-4 low-passed |  |
| `med_longbow_volley` | hot | volley | volley | med_longbow_volley | 6 | 6 + 1 | 6 / 6 | pack_med_ranged | processed: ancient arrow_whoosh_1-3 stacked + arrow_hit_* |  |
| `med_xbow_release` | hot | hit | crack | med_xbow_release | 6 | 7 + 0 | 6 / 6 | pack_med_ranged | processed: ancient crossbow_shot_1 and ballista_twang_1 |  |
| `med_xbow_crank` | adj | volley | clack | med_xbow_crank | 4 | 3 + 1 | 3 / 3 | pack_med_ranged | synth: ratchet_loop |  |
| `med_trebuchet` | hot heavy | siege | thump | med_trebuchet, med_trebuchet_groan, med_counterweight_whump | 7 | 7 + 0 | 7 / 3 | pack_med_siege | processed: ancient catapult_creak_1-4, catapult_launch_1-3, boulder_who |  |
| `med_shell_whistle` | adj | siege | fx | med_shell_whistle | 3 | 0 + 3 | 0 / 1 | pack_med_siege | synth: shell_whistle |  |
| `med_ram_gate` | hot | siege | thump | med_ram_gate, med_ram_gate_boom | 6 | 6 + 0 | 6 / 6 | pack_med_siege | processed: ancient wood_crack_1-3 + rock_crumble layered |  |
| `med_wall_collapse` | hot | siege | blast | med_wall_collapse, med_masonry_fall | 6 | 6 + 0 | 6 / 6 | pack_med_siege | processed: ancient wall_collapse_1, rock_fall_1-2, rock_crumble_1-4, de |  |
| `med_banner` | hot | hit | shoot | med_banner, med_banner_fall | 12 | 14 + 0 | 12 / 6 | pack_med_misc | processed: ancient cloth_flap_1-3 and crowd_gasp_1 |  |
| `med_bell` | hot | bell | ring | med_bell, med_bell_small | 5 | 6 + 0 | 6 / 6 | pack_med_misc | processed: ancient bell_ding_1-2, bell_heavy_1 |  |
| `med_dragon_roar` | adj heavy | dragon | roar | med_dragon_roar, med_dragon_roar_far, med_sting_dragon | 4 | 4 + 1 | 4 / 3 | pack_med_beast | processed: ancient monster_roar_1-4 pitched -6 st + synth sub |  |
| `med_wing_whomp` | adj | siege | thump | med_wing_whomp | 4 | 2 + 2 | 2 / 2 | pack_med_beast | synth: leathery_flap |  |
| `med_fire_whoosh` | adj | hit | fx | med_fire_whoosh, med_fire_whoomph, med_fire_crackle | 4 | 3 + 0 | 3 / 2 | pack_med_beast | processed: ancient fire_whoosh_1-2, fire_ignite_1-2 |  |
| `med_oil_sizzle` | adj | volley | fx | med_oil_sizzle | 3 | 2 + 1 | 2 / 2 | pack_med_beast | synth: oil_sizzle |  |
| `med_armour_step` | step | volley | ui | med_armour_step | 3 | 3 + 0 | 3 / 3 | pack_med_misc | processed: ancient armor_step_1-3 |  |
| `med_hoard_glint` | adj | volley | ring | med_hoard_glint | 3 | 3 + 0 | 3 / 2 | pack_med_misc | processed: ancient coin_clink_1-2 |  |
| `med_purse_jingle` | adj | volley | ring | med_purse_jingle | 2 | 2 + 0 | 2 / 2 | pack_med_misc | processed: ancient coin_sack_1 |  |
| `med_gas_hiss` | adj | volley | fx | med_gas_hiss | 2 | 0 + 2 | 0 / 1 | pack_med_misc | synth: gas_hiss |  |
| `med_sneeze_chorus` | adj | hit | voice | med_sneeze_chorus | 4 | 3 + 1 | 2 / 2 | pack_med_misc | synth: sneeze_synth |  |
| `med_foam_bonk` | adj | hit | hit | med_foam_bonk | 3 | 3 + 0 | 3 / 2 | pack_med_blade | processed: ancient club_bonk_1-2 low-passed |  |
| `med_kazoo_blat` | adj | hit | voice | med_kazoo_blat | 2 | 0 + 2 | 0 / 1 | pack_med_misc | synth: kazoo_blat |  |
| `med_trumpet_crack` | adj | hit | voice | med_trumpet_crack | 2 | 1 + 1 | 1 / 1 | pack_med_misc | synth: trumpet_crack |  |
| `med_wing_horn` | adj | siege | voice | med_horn_charge, med_wing_horn | 2 | 2 + 0 | 2 / 2 | pack_med_misc | processed: ancient war_horn_1-3 |  |
| `med_troll_groan` | adj | hit | voice | med_troll_groan, med_dragon_sniff | 2 | 3 + 0 | 3 / 2 | pack_med_beast | processed: ancient minotaur_grunt_1 |  |
| `med_chain_cart_wood` | adj | volley | foley | med_chain_rattle, med_cart_squeak, med_wood_groan +1 | 4 | 3 + 1 | 3 / 2 | pack_med_misc | synth: cart_squeak | stretch |
| `med_splash_big` | adj | hit | foley | med_splash_big | 2 | 2 + 0 | 2 / 1 | pack_med_misc | synth: splash_big | stretch |
| `med_step_cobble` | step | volley | ui | med_step_cobble | 3 | 3 + 0 | 3 / 3 | pack_med_misc | processed: step_stone |  |
| `med_step_mud` | step | volley | ui | med_step_mud | 3 | 3 + 0 | 3 / 2 | pack_med_misc | processed: step_mud |  |
| `med_step_scree` | step | volley | ui | med_step_scree | 3 | 3 + 0 | 3 / 3 | pack_med_misc | processed: step_gravel |  |
| `med_rain_hush` | adj | - | foley | med_rain_hush | 2 | 0 + 2 | 0 / 1 | pack_med_misc | synth: rain_hush |  |
| `med_gloop` | adj | - | foley | med_gloop | 2 | 2 + 0 | 1 / 1 | pack_med_misc | synth: gloop |  |
| `med_dragon_sniff` | adj | - | foley | med_dragon_sniff | 2 | 1 + 1 | 1 / 1 | pack_med_beast | synth: dragon_sniff |  |
| `med_sheep_bleat_far` | adj | - | foley | med_sheep_bleat_far | 1 | 1 + 0 | 1 / 1 | pack_med_beast | processed: ancient sheep_baa_1 |  |
| `med_crowd_ooh_aww` | adj | - | foley | med_crowd_ooh_aww | 2 | 2 + 0 | 2 / 1 | pack_med_misc | processed: ancient crowd_gasp_1 | stretch |
| `med_quill_scratch` | bus | - | foley | med_quill_scratch | 3 | 3 + 0 | 3 / 1 | pack_med_misc | synth: click |  |
| `med_stamp_thump` | bus | - | foley | med_stamp_thump | 3 | 3 + 0 | 3 / 1 | pack_med_misc | synth: stamp |  |
| `med_stamp_brass` | bus | - | foley | med_stamp_brass | 2 | 1 + 1 | 1 / 1 | pack_med_misc | synth: stamp |  |
| `med_page_rustle` | bus | - | foley | med_page_rustle | 3 | 3 + 0 | 3 / 1 | pack_med_misc | synth: paper_rustle |  |
| `med_hand_bell` | bus | - | foley | med_hand_bell | 3 | 3 + 0 | 3 / 1 | pack_med_misc | synth: ding |  |

**Modern**

| family | class | loudness | template | cue ids | variants | rows rec+synth | recordings / min | pack | fallback | note |
|---|---|---|---|---|---|---|---|---|---|---|
| `mod_rifle_pop` | hot | pop | pop | mod_rifle_pop, mod_pistol_pop, mod_smg_burst +1 | 19 | 19 + 0 | 19 / 6 | pack_mod_gun | synth: gun_pop |  |
| `mod_mg_stutter` | hot | burst | burst | mod_mg_stutter | 6 | 6 + 0 | 6 / 6 | pack_mod_gun | synth: mg_ratchet |  |
| `mod_sniper_crack` | hot heavy | crack | crack | mod_sniper_crack | 6 | 6 + 0 | 6 / 3 | pack_mod_gun | synth: gun_crack |  |
| `mod_bullet_snap` | hot | snap | shoot | mod_bullet_snap | 8 | 5 + 3 | 5 / 1 | pack_mod_gun | synth: bullet_zip |  |
| `mod_reload_clack` | hot | clack | clack | mod_reload_clack | 6 | 6 + 0 | 6 / 6 | pack_mod_gun | synth: clack |  |
| `mod_pin_thunk` | adj | snap | clack | mod_pin_thunk | 3 | 2 + 1 | 2 / 1 | pack_mod_gun | synth: pin_thunk | stretch |
| `mod_cannon_bonk` | hot heavy | thump | thump | mod_cannon_bonk, mod_mortar_thump, mod_howitzer_thump | 6 | 6 + 0 | 6 / 3 | pack_mod_boom | processed: ancient catapult_launch_1-3 as the thump + synth tin |  |
| `mod_rocket_whoosh` | adj | whistle | shoot | mod_rocket_whoosh | 3 | 3 + 0 | 3 / 2 | pack_mod_boom | synth: whoosh |  |
| `mod_shell_whistle` | hot | whistle | fx | mod_shell_whistle | 4 | 1 + 3 | 1 / 1 | pack_mod_boom | synth: shell_whistle |  |
| `mod_blast` | hot | blast_m | blast | mod_blast_s, mod_blast_m, mod_blast_l | 12 | 12 + 0 | 12 / 6 | pack_mod_boom | processed: ancient explosion_rumble_1-5 and debris_big as the large lay |  |
| `mod_dynamite_fuse` | adj | whistle | pop | mod_dynamite_fuse | 2 | 0 + 2 | 0 / 1 | pack_mod_boom | synth: fuse_fizz | stretch |
| `mod_plink_tink` | hot | tink | tink | mod_plink_tink, mod_armour_bonk | 14 | 14 + 0 | 14 / 6 | pack_mod_hit | processed: ancient helmet_ping_1 / hit_armor pitched |  |
| `mod_helmet_bonk` | hot | tink | tink | mod_helmet_bonk, mod_machine_lidpop | 10 | 7 + 3 | 7 / 6 | pack_mod_hit | processed: ancient death_oof at 15 percent |  |
| `mod_mine_blip_boing` | hot | snap | pop | mod_mine_blip, mod_mine_boing | 6 | 6 + 0 | 6 / 6 | pack_mod_hit | synth: blip |  |
| `mod_machine_bed` | bed | bed | bed | mod_machine_bed | 13 | 13 + 0 | 10 / 6 | pack_mod_vehicle | synth: sewing_machine_clatter |  |
| `mod_radio_squelch` | bus | ui | voice | mod_radio_squelch | 3 | 3 + 0 | 1 / 1 | pack_mod_misc | synth: squelch |  |
| `mod_stamp_thud` | bus | ui | ui | mod_stamp_thud | 3 | 3 + 0 | 3 / 2 | pack_mod_misc | synth: stamp |  |
| `mod_typewriter_ding` | bus | ui | ui | mod_typewriter_ding | 2 | 2 + 0 | 2 / 2 | pack_mod_misc | synth: ding |  |
| `mod_pen_click` | bus | ui | ui | mod_pen_click | 2 | 2 + 0 | 2 / 1 | pack_mod_misc | synth: click |  |
| `mod_stapler_tick` | bus | ui | ui | mod_stapler_tick | 2 | 2 + 0 | 2 / 1 | pack_mod_misc | synth: tick |  |
| `mod_kettle_whistle` | adj | whistle | fx | mod_kettle_whistle, mod_teapot_whistle | 3 | 2 + 1 | 2 / 2 | pack_mod_misc | synth: kettle |  |
| `mod_phone_ring` | adj | ui | ui | mod_phone_ring, mod_doorbell | 2 | 2 + 0 | 2 / 2 | pack_mod_misc | synth: ring |  |
| `mod_whistle` | adj | whistle | fx | mod_whistle, mod_whistle_snare | 3 | 3 + 0 | 3 / 1 | pack_mod_misc | synth: whistle |  |
| `mod_pop_family` | adj | pop | pop | mod_balloon_pop, mod_confetti_pop, mod_umbrella_pop +1 | 3 | 3 + 0 | 3 / 2 | pack_mod_misc | synth: pop |  |
| `mod_cork_pop` | adj | pop | pop | mod_cork_pop | 2 | 2 + 0 | 2 / 1 | pack_mod_misc | synth: pop | stretch |
| `mod_trolley_squeak` | adj | clack | foley | mod_trolley_squeak | 3 | 3 + 0 | 3 / 2 | pack_mod_misc | synth: squeak | stretch |
| `mod_mower_rev` | adj | bed | bed | mod_mower_rev, mod_pull_cord, mod_engine_roar | 3 | 2 + 1 | 2 / 2 | pack_mod_misc | synth: pull_cord | stretch |
| `mod_glass_pop` | adj | blast_s | blast | mod_glass_pop, mod_crate_splinter | 2 | 2 + 0 | 2 / 2 | pack_mod_misc | synth: glass | stretch |
| `mod_sneeze` | adj | snap | voice | mod_sneeze | 1 | 1 + 0 | 1 / 1 | pack_mod_misc | synth: sneeze | stretch |
| `mod_step_metal` | step | clack | ui | step_metal | 4 | 4 + 0 | 4 / 3 | pack_mod_misc | processed: step_stone pitched down |  |
| `mod_step_concrete` | step | clack | ui | step_concrete, step_asphalt, step_tile | 4 | 4 + 0 | 4 / 3 | pack_mod_misc | processed: step_stone |  |
| `mod_loudspeaker_squelch` | adj | - | foley | mod_loudspeaker_squelch | 3 | 2 + 1 | 1 / 1 | pack_mod_misc | synth: pa_squeal |  |
| `mod_paper_rustle` | adj | - | foley | mod_paper_rustle | 3 | 0 + 3 | 0 / 1 | pack_mod_misc | synth: paper_rustle |  |
| `mod_sandwich_splat` | adj | - | foley | mod_sandwich_splat | 3 | 3 + 0 | 3 / 1 | pack_mod_misc | synth: splat |  |
| `mod_leaf_rustle` | adj | - | foley | mod_leaf_rustle | 2 | 0 + 2 | 0 / 1 | pack_mod_misc | synth: leaf_rustle |  |
| `mod_boots_planks` | adj | - | foley | mod_boots_planks | 4 | 4 + 0 | 4 / 1 | pack_mod_misc | processed: ancient footstep_wood_1-3 |  |
| `mod_bugle_wrong` | adj | - | foley | mod_bugle_wrong | 2 | 0 + 2 | 0 / 1 | pack_mod_misc | synth: toy_bugle |  |
| `mod_rail_snap` | adj | - | foley | mod_rail_snap | 3 | 3 + 0 | 3 / 1 | pack_mod_misc | synth: rail_snap |  |
| `mod_reversing_beep` | adj | - | foley | mod_reversing_beep | 2 | 0 + 2 | 0 / 1 | pack_mod_misc | synth: reversing_beep |  |
| `mod_party_horn` | adj | - | foley | mod_party_horn | 3 | 1 + 2 | 1 / 1 | pack_mod_misc | synth: party_horn |  |
| `mod_tower_buzz` | adj | - | foley | mod_tower_buzz | 2 | 0 + 2 | 0 / 1 | pack_mod_misc | synth: tower_buzz |  |
| `mod_pa_chime` | adj | - | foley | mod_pa_chime | 2 | 2 + 0 | 2 / 1 | pack_mod_misc | synth: pa_chime |  |
| `mod_ramp_slam` | adj | - | foley | mod_ramp_slam | 2 | 2 + 0 | 2 / 1 | pack_mod_misc | processed: ancient wood_thud |  |
| `mod_gull_far` | adj | - | foley | mod_gull_far | 2 | 2 + 0 | 2 / 1 | pack_mod_misc | synth: gull |  |
| `mod_gate_groan` | adj | - | foley | mod_gate_groan | 2 | 2 + 0 | 2 / 1 | pack_mod_misc | processed: ancient wood_crack_2 |  |
| `mod_water_rush` | adj | - | foley | mod_water_rush | 2 | 0 + 2 | 0 / 1 | pack_mod_misc | synth: water_rush |  |
| `mod_firework_rocket` | adj | - | foley | mod_firework_rocket | 4 | 4 + 0 | 4 / 1 | pack_mod_misc | synth: firework |  |
| `mod_tape_unroll` | adj | - | foley | mod_tape_unroll | 2 | 0 + 2 | 0 / 1 | pack_mod_misc | synth: tape_unroll |  |
| `mod_kazoo_blat` | adj | - | foley | mod_kazoo_blat | 2 | 0 + 2 | 0 / 1 | pack_mod_misc | synth: kazoo_blat |  |
| `mod_hold_music_sting` | adj | - | foley | mod_hold_music_sting | 1 | 0 + 1 | 0 / 1 | pack_mod_misc | synth: hold_vibes |  |

**Sci-Fi**

| family | class | loudness | template | cue ids | variants | rows rec+synth | recordings / min | pack | fallback | note |
|---|---|---|---|---|---|---|---|---|---|---|
| `sf_pulse_burst` | hot | pew | burst | sf_pulse_burst, sf_pulse_s, sf_valet_beam | 8 | 10 + 0 | 10 / 6 | pack_sf_energy | synth: pew |  |
| `sf_rivet_chatter` | hot | chatter | burst | sf_rivet_chatter, sf_rocket_fsssh, sf_salvo_fsssh | 10 | 13 + 0 | 13 / 6 | pack_sf_energy | synth: rivet |  |
| `sf_rail_crack` | hot heavy | crack | crack | sf_rail_crack, sf_lock_line | 6 | 6 + 0 | 6 / 3 | pack_sf_energy | synth: rail |  |
| `sf_plasma_lob` | hot | lob | shoot | sf_plasma_lob, sf_acid_glob, sf_acid_hiss | 6 | 6 + 0 | 6 / 3 | pack_sf_energy | synth: plasma |  |
| `sf_shield_hit` | hot | absorb | hit | sf_shield_hit, sf_dome_block | 8 | 8 + 0 | 8 / 6 | pack_sf_energy | processed: ancient helmet_ping_1 as a layer + synth bloop |  |
| `sf_shield_pop` | hot | pop | pop | sf_shield_pop, sf_shield_recharge, sf_shield_chain_pop | 10 | 10 + 0 | 10 / 6 | pack_sf_energy | synth: bubble_pop |  |
| `sf_emp_burst` | hot | emp | fx | sf_emp_burst, sf_robot_powerdown, sf_knockout_machine | 10 | 10 + 0 | 10 / 6 | pack_sf_energy | synth: emp |  |
| `sf_cloak_shimmer` | hot | shimmer | fx | sf_cloak_shimmer | 6 | 5 + 1 | 5 / 1 | pack_sf_energy | synth: shimmer |  |
| `sf_blink_pop` | hot | blink | fx | sf_blink_pop, sf_teleport | 10 | 10 + 0 | 10 / 6 | pack_sf_energy | synth: blink |  |
| `sf_hover_hum` | bed | bed | bed | sf_hover_hum, sf_hover_whine, sf_servo_whine | 10 | 10 + 0 | 10 / 6 | pack_sf_vehicle | synth: hum_bed |  |
| `sf_mech_step` | hot heavy | thump | thump | sf_mech_step, sf_mech_topple, sf_mech_step_boom | 9 | 9 + 0 | 9 / 3 | pack_sf_vehicle | processed: ancient catapult_launch_1-3 as the thump |  |
| `sf_orbital_strike` | hot heavy | orbital | siege | sf_orbital_strike, sf_orbital_charge, sf_reactor_overload | 6 | 6 + 0 | 6 / 3 | pack_sf_energy | synth: orbital |  |
| `sf_alien_goo` | adj | goo | beast | sf_alien_goo, sf_alien_chitter, sf_alien_trill +1 | 12 | 12 + 0 | 12 / 6 | pack_sf_alien | synth: goo |  |
| `sf_grazer_baa` | adj | goo | beast | sf_grazer_baa | 3 | 3 + 0 | 3 / 2 | pack_sf_alien | synth: baa |  |
| `sf_klaxon` | adj | emp | beast | sf_klaxon, sf_siren_short, sf_alarm_red | 3 | 0 + 3 | 0 / 1 | pack_sf_misc | synth: klaxon_two_tone |  |
| `sf_bell` | adj | ui | ui | sf_bell, sf_welcome_chime | 3 | 3 + 0 | 3 / 3 | pack_sf_misc | synth: bell |  |
| `sf_booth_chirp` | bus | ui | voice | sf_booth_chirp | 2 | 1 + 1 | 1 / 1 | pack_sf_misc | synth: booth_chirp |  |
| `sf_geyser_roar` | adj | goo | beast | sf_geyser_roar, sf_lava_bloop | 3 | 3 + 0 | 3 / 2 | pack_sf_misc | synth: geyser |  |
| `sf_spore_puff` | adj | goo | beast | sf_spore_puff, sf_spore_burst | 3 | 3 + 0 | 3 / 2 | pack_sf_misc | synth: puff |  |
| `sf_stamp_rated` | bus | ui | ui | sf_stamp_rated | 1 | 1 + 0 | 1 / 1 | pack_sf_misc | synth: stamp |  |
| `sf_popcorn` | adj | pop | pop | sf_popcorn | 2 | 2 + 0 | 2 / 1 | pack_sf_misc | synth: popcorn | stretch |
| `sf_acid_spore_extras` | adj | goo | beast | sf_acid_hiss | 2 | 2 + 0 | 2 / 1 | pack_sf_alien | synth: sizzle | stretch |
| `sf_step_regolith` | step | clack | ui | step_regolith, step_dust | 3 | 3 + 0 | 3 / 3 | pack_sf_misc | processed: step_sand |  |
| `sf_step_goo` | step | clack | ui | step_goo, step_neon | 3 | 3 + 0 | 3 / 3 | pack_sf_misc | processed: step_mud |  |
| `sf_step_hull` | adj | - | foley | sf_step_hull | 4 | 4 + 0 | 4 / 1 | pack_sf_misc | processed: step_stone pitched down |  |
| `sf_step_moss` | adj | - | foley | sf_step_moss | 3 | 3 + 0 | 3 / 1 | pack_sf_misc | processed: step_grass |  |
| `sf_blast` | adj | - | foley | sf_blast | 9 | 9 + 0 | 9 / 1 | pack_sf_energy | processed: ancient explosion_rumble_1-5 |  |
| `sf_knockout` | adj | - | foley | sf_knockout | 6 | 6 + 0 | 6 / 1 | pack_sf_energy | processed: ancient death_oof at 15 percent |  |
| `sf_hull_tink` | adj | tink | foley | sf_hull_tink | 4 | 4 + 0 | 4 / 1 | pack_sf_energy | processed: ancient helmet_ping_1 |  |
| `sf_dome_crack` | adj | - | foley | sf_dome_crack | 2 | 2 + 0 | 2 / 1 | pack_sf_misc | synth: dome_crack |  |
| `sf_airlock_hiss` | adj | - | foley | sf_airlock_hiss | 2 | 2 + 0 | 2 / 1 | pack_sf_misc | synth: airlock_hiss |  |
| `sf_lava_bloop` | adj | - | foley | sf_lava_bloop | 3 | 3 + 0 | 1 / 1 | pack_sf_misc | synth: lava_bloop |  |
| `sf_power_down_hum` | adj | - | foley | sf_power_down_hum | 2 | 0 + 2 | 0 / 1 | pack_sf_misc | synth: power_down_hum |  |
| `sf_earth_rumble` | adj | - | foley | sf_earth_rumble | 1 | 1 + 0 | 1 / 1 | pack_sf_misc | synth: earth_rumble |  |
| `sf_titan_roar_soft` | adj | - | foley | sf_titan_roar_soft | 1 | 1 + 0 | 1 / 1 | pack_sf_alien | synth: titan_roar |  |
| `sf_sonic_shush` | adj | - | foley | sf_sonic_shush | 2 | 0 + 2 | 0 / 1 | pack_sf_misc | synth: sonic_shush |  |
| `sf_hull_breach` | adj | - | foley | sf_hull_breach | 3 | 3 + 0 | 3 / 1 | pack_sf_misc | synth: hull_breach |  |
| `sf_queen_screech` | adj | - | foley | sf_queen_screech | 3 | 3 + 0 | 3 / 1 | pack_sf_alien | processed: ancient monster_roar_2 |  |
| `sf_truck_horn` | adj | - | foley | sf_truck_horn | 1 | 1 + 0 | 1 / 1 | pack_sf_misc | synth: truck_horn |  |
| `sf_stilt_creak` | adj | - | foley | sf_stilt_creak | 3 | 3 + 0 | 3 / 1 | pack_sf_misc | synth: stilt_creak |  |
| `sf_lock_line` | adj | - | foley | sf_lock_line | 2 | 0 + 2 | 0 / 1 | pack_sf_energy | synth: lock_line |  |
| `sf_slide_up` | adj | - | foley | sf_slide_up | 1 | 1 + 0 | 1 / 1 | pack_sf_misc | synth: slide_up |  |
| `sf_scan_ring` | adj | - | foley | sf_scan_ring | 2 | 2 + 0 | 2 / 1 | pack_sf_misc | synth: scan_ring |  |
| `sf_hold_music_snippet` | adj | - | foley | sf_hold_music_snippet | 1 | 0 + 1 | 0 / 1 | pack_sf_misc | synth: hold_vibes |  |
| `sf_crate_confetti` | adj | - | foley | sf_crate_confetti | 2 | 2 + 0 | 2 / 1 | pack_sf_misc | processed: confetti_pop_1 |  |
| `sf_glass_pop` | adj | - | foley | sf_glass_pop | 2 | 2 + 0 | 2 / 1 | pack_sf_misc | synth: glass |  |
| `sf_ui_tick` | bus | - | foley | sf_ui_tick | 3 | 3 + 0 | 3 / 1 | pack_sf_misc | synth: tick |  |
| `sf_ui_bwip` | bus | - | foley | sf_ui_bwip | 3 | 3 + 0 | 3 / 1 | pack_sf_misc | synth: click |  |
| `sf_ui_ting` | bus | - | foley | sf_ui_ting | 3 | 3 + 0 | 3 / 1 | pack_sf_misc | synth: ding |  |
| `sf_hex_whoosh` | bus | - | foley | sf_hex_whoosh | 3 | 3 + 0 | 3 / 1 | pack_sf_misc | synth: whoosh |  |
| `sf_ui_chime` | bus | - | foley | sf_ui_chime | 2 | 2 + 0 | 2 / 1 | pack_sf_misc | synth: ding |  |

#### 3.3.6 Alias cues

`ALIASES` in the matrix map 87 cue ids that the bibles and design documents use to a family, a tag and a pitch factor without a row of their own (for example `mod_pistol_pop` = `mod_rifle_pop` tag `pistol`; `sf_valet_beam` = `sf_pulse_burst` tag `valet`; `med_counterweight_whump` = `med_trebuchet` tag `whump` at pitch 0.8). The router resolves an alias to `pick = [family rows with tag]` at `CUES` build time (`F(id, tmpl, [[family&#tag]], {pitch: [p*0.97, p*1.03]})`), so an alias costs no file.

#### 3.3.7 Declared reuse of Ancient rows by Medieval (generated, q3_product 28)

| Medieval family | Ancient ledger ids declared as reuse (second pick group) | fallback statement |
|---|---|---|
| `med_sword_on_plate` | `sword_hit_1`, `sword_hit_2`, `sword_hit_3`, `sword_hit_4`, `sword_hit_5`, `blade_clash_1`, `helmet_ping_1`, `blade_clash_2` | ancient sword_hit_1-5, blade_clash_1-6 and helmet_ping_1 pitched |
| `med_mace_crunch` | `mace_bonk_1`, `mace_bonk_2`, `shield_bash_1`, `shield_bash_2`, `shield_bash_3`, `club_bonk_1` | ancient mace_bonk_1-2 and shield_bash_1-3 plus synth tin rattle |
| `med_lance_shatter` | `wood_splinter_1`, `wood_crack_1`, `wood_crack_2`, `wood_crack_3`, `crowd_ooh_1` | ancient wood_splinter_1 + wood_crack_1-3 + crowd_ooh_1 |
| `med_hoof_thunder` | `horse_gallop_1`, `hoof_step_1`, `hoof_step_2`, `horse_neigh_1`, `horse_neigh_2`, `horse_neigh_3` | ancient horse_gallop_1 and hoof_step_1-2 with a rising gain ramp |
| `med_brace_thunk` | `spear_stab_3`, `spear_stab_4`, `spear_stab_5`, `wood_crack_1`, `wood_thud_1` | ancient spear_stab_3-5 and wood_thud_1-4 low-passed |
| `med_longbow_volley` | `bow_shot_1`, `bow_shot_2`, `bow_shot_3`, `arrow_whoosh_1`, `arrow_whoosh_2`, `arrow_whoosh_3`, `arrow_hit_wood_1`, `arrow_hit_flesh_1` | ancient arrow_whoosh_1-3 stacked + arrow_hit_* |
| `med_xbow_release` | `crossbow_shot_1`, `ballista_twang_1` | ancient crossbow_shot_1 and ballista_twang_1 |
| `med_trebuchet` | `catapult_creak_1`, `catapult_creak_2`, `catapult_launch_1`, `boulder_whoosh_1` | ancient catapult_creak_1-4, catapult_launch_1-3, boulder_whoosh_1-3 |
| `med_ram_gate` | `wood_crack_1`, `wood_crack_2` | ancient wood_crack_1-3 + rock_crumble layered |
| `med_wall_collapse` | `wall_collapse_1`, `rock_fall_1`, `rock_crumble_1`, `debris_big_1` | ancient wall_collapse_1, rock_fall_1-2, rock_crumble_1-4, debris_big_1-2 |
| `med_banner` | `cloth_flap_1`, `cloth_flap_2`, `cloth_flap_3`, `crowd_gasp_1` | ancient cloth_flap_1-3 and crowd_gasp_1 |
| `med_bell` | `bell_ding_1`, `bell_ding_2`, `bell_heavy_1` | ancient bell_ding_1-2, bell_heavy_1 |
| `med_dragon_roar` | `monster_roar_1`, `monster_roar_2`, `monster_roar_3`, `monster_roar_4` | ancient monster_roar_1-4 pitched -6 st + synth sub |
| `med_fire_whoosh` | `fire_whoosh_1`, `fire_whoosh_2`, `fire_ignite_1`, `torch_crackle_1` | ancient fire_whoosh_1-2, fire_ignite_1-2 |
| `med_armour_step` | `armor_step_1`, `armor_step_2`, `armor_step_3` | ancient armor_step_1-3 |
| `med_hoard_glint` | `coin_clink_1`, `coin_clink_2` | ancient coin_clink_1-2 |
| `med_purse_jingle` | `coin_sack_1` | ancient coin_sack_1 |
| `med_gas_hiss` | `snake_hiss_1` | gas_hiss |
| `med_foam_bonk` | `club_bonk_1`, `club_bonk_2` | ancient club_bonk_1-2 low-passed |
| `med_wing_horn` | `war_horn_1`, `war_horn_2`, `war_horn_3` | ancient war_horn_1-3 |
| `med_troll_groan` | `minotaur_grunt_1` | ancient minotaur_grunt_1 |
| `med_chain_cart_wood` | `wood_crack_3` | cart_squeak |
| `med_step_cobble` | `footstep_gravel_1` | step_stone |
| `med_step_mud` | `footstep_mud_1`, `footstep_mud_2`, `footstep_mud_3` | step_mud |
| `med_step_scree` | `footstep_gravel_2`, `footstep_gravel_3` | step_gravel |

The ids are ledger ids of the shipped Ancient release (all 80 exist in `assets/manifest.json`; `tests/audio/matrix.test.mjs` checks). They are the second group of each pick, so a missing or failed new pack degrades to Ancient sounds, never to silence.

#### 3.3.8 Source register for the hot and heavy families (generated; the full register with 166 packs is `sources` in the matrix)

**Medieval**

| slug (host) | title | author | licence chosen | recordings | total | where | hot families |
|---|---|---|---|---|---|---|---|
| `impact-sounds` | Kenney Impact Sounds | Kenney (kenney.nl) | CC0 1.0 | 130 | 52 s | disk | banner, bell, brace_thunk, mace_crunch, sword_on_plate |
| `rpg-audio` | Kenney Rpg Audio | Kenney (kenney.nl) | CC0 1.0 | 51 | 25 s | disk | banner, mace_crunch, xbow_release |
| `2-wooden-squish-splatter-sequences` | 2 wooden squish splatter sequences | Independent.nu | CC0 1.0 | 2 | 15 s | disk | lance_shatter, ram_gate |
| `33-metal-clang-sounds-cast-iron-pans` | 33 metal clang sounds from cast iron pans | bart | CC0 1.0 | 33 | 79 s | HUNT | mace_crunch |
| `35-wooden-crackshitsdestructions` | 35 wooden cracks/hits/destructions | Independent.nu | CC0 1.0 | 35 | 91 s | disk | banner, brace_thunk, lance_shatter, longbow_volley, ram_gate |
| `75-cc0-breaking-falling-hit-sfx` | 75 CC0 breaking / falling / hit sfx | rubberduck | CC0 1.0 | 75 | 43 s | disk | lance_shatter, wall_collapse |
| `80-cc0-creature-sfx` | 80 CC0 creature SFX | rubberduck | CC0 1.0 | 80 | 47 s | disk | banner, lance_shatter |
| `air-whoosh` | Air whoosh | pyranostudios | CC0 1.0 | 1 | 5 s | disk | wall_collapse |
| `archers-shooting` | Archers shooting | copyc4t | CC BY 3.0 | 1 | 1 s | HUNT | longbow_volley |
| `bell-sounds` | Bell Sounds | marcelofg55 | CC BY 3.0 | 1 | 26 s | disk | bell |
| `big-scary-troll-sounds` | Big scary troll sounds | Darsycho | CC0 1.0 | 3 | 47 s | disk | dragon_roar |
| `black-smith-sounds` | Black Smith Sounds | ItsEddie | CC BY 3.0 | 5 | 4 s | HUNT | sword_on_plate |
| `boom-pack-1` | Boom Pack 1 | dklon | CC BY 3.0 | 9 | 10 s | disk | trebuchet |
| `cannon-hit` | Cannon hit | Thimras | CC0 1.0 | 1 | 5 s | HUNT | trebuchet |
| `cannon-hit-wall` | Cannon hit wall | Thimras | CC0 1.0 | 1 | 3 s | HUNT | ram_gate |
| `cave-in` | Cave In | StarNinjas | CC0 1.0 | 1 | 4 s | disk | trebuchet, wall_collapse |
| `cc0-deep-monster-roar` | CC0 Deep Monster Roar | trazzz123 | CC0 1.0 | 1 | 7 s | disk | dragon_roar |
| `chain-winch-sounds` | Chain winch sounds | bart | CC0 1.0 | 9 | 22 s | HUNT | ram_gate, trebuchet |
| `chunky-explosion` | Chunky Explosion | Joth | CC0 1.0 | 1 | 6 s | disk | wall_collapse |
| `correct-bell` | Correct Bell | Fupi | CC0 1.0 | 1 | 2 s | HUNT | bell |
| `crossbow-shot` | Crossbow Shot | spookymodem | CC BY 3.0 | 1 | 2 s | HUNT | xbow_release |
| `crossbow-sounds` | Crossbow sounds | HolgiB | CC BY 3.0 (page lists CC-BY 3.0/GPL 2.0) | 2 | 1 s | HUNT | xbow_release |
| `hammer-on-anvil` | Hammer on Anvil | themightyglider | CC0 1.0 | 1 | 2 s | disk | sword_on_plate |
| `horse-gallop-loop` | Horse Gallop Loop | AntumDeluge | CC BY 3.0 | 2 | 12 s | disk | hoof_thunder |
| `horse-gallop-on-different-surfaces` | Horse gallop on different surfaces | congusbongus | CC BY 4.0 | 6 | 3 s | disk | hoof_thunder |
| `horse-trotting` | Horse Trotting | EZduzziteh | CC0 1.0 | 1 | 12 s | disk | hoof_thunder |
| `iron-door` | Iron Door | themightyglider | CC0 1.0 | 1 | 1 s | HUNT | ram_gate |
| `medieval-sound-effects-weapon-impacts` | Medieval sound effects - Weapon impacts | Ben Jaszczak & Brian Nel | CC0 1.0 | 48 | 444 s | disk | lance_shatter, mace_crunch, sword_on_plate |
| `medieval-sound-effects-weapon-textures` | Medieval sound effects - Weapon Textures | Ben Jaszczak & Brian Nel | CC0 1.0 | 44 | 439 s | disk | longbow_volley, xbow_release |
| `metal-impact-sounds` | Metal Impact Sounds | BMacZero | CC0 1.0 | 7 | 5 s | HUNT | sword_on_plate |
| `monster-sound-pack-volume-1` | Monster Sound Pack, Volume 1 | Ogrebane | CC0 1.0 | 18 | 9 s | disk | dragon_roar |
| `pleasing-bell-sound-effect` | Pleasing Bell Sound Effect | Spring Spring | CC0 1.0 | 1 | 1 s | disk | bell |
| `retro-monster-roar` | Retro Monster Roar | greg300 | CC0 1.0 | 1 | 1 s | disk | dragon_roar |
| `rockbreaking` | rock_breaking | Blender Foundation | CC BY 3.0 | 1 | 10 s | disk | wall_collapse |
| `rumbleexplosion` | Rumble/explosion | Michel Baradari | CC BY 3.0 | 1 | 1 s | disk | wall_collapse |
| `swishes-sound-pack` | Swishes Sound Pack | artisticdude | CC0 1.0 | 13 | 2 s | disk | banner |
| `tolling-bell-sfx` | Tolling Bell SFX | Fun Gi Development | CC BY 3.0 | 3 | 22 s | HUNT | bell |
| `wind-hit-time-morph` | Wind, hit, time morph | qubodup | CC0 1.0 | 4 | 2 s | HUNT | banner |
| `wood-wobbling-rattling` | Wood Wobbling & Rattling | qubodup | CC0 1.0 | 2 | 2 s | disk | banner, brace_thunk, trebuchet |

**Modern**

| slug (host) | title | author | licence chosen | recordings | total | where | hot families |
|---|---|---|---|---|---|---|---|
| `digital-audio` | Kenney Digital Audio | Kenney (kenney.nl) | CC0 1.0 | 62 | 48 s | disk | mine_blip_boing |
| `impact-sounds` | Kenney Impact Sounds | Kenney (kenney.nl) | CC0 1.0 | 130 | 52 s | disk | blast, bullet_snap, cannon_bonk, helmet_bonk, plink_tink |
| `interface-sounds` | Kenney Interface Sounds | Kenney (kenney.nl) | CC0 1.0 | 100 | 30 s | disk | reload_clack |
| `100-cc0-metal-and-wood-sfx` | 100 CC0 metal and wood SFX | rubberduck | CC0 1.0 | 100 | 49 s | HUNT | plink_tink |
| `2-gun-reloads` | 2 Gun Reloads | StarNinjas | CC0 1.0 | 2 | 2 s | HUNT | reload_clack |
| `2-high-quality-explosions` | 2 High Quality Explosions | Michel Baradari | CC BY 3.0 | 2 | 3 s | disk | blast |
| `25-cc0-bang-firework-sfx` | 25 CC0 bang / firework SFX | rubberduck | CC0 1.0 | 25 | 41 s | disk | cannon_bonk, rifle_pop |
| `33-metal-clang-sounds-cast-iron-pans` | 33 metal clang sounds from cast iron pans | bart | CC0 1.0 | 33 | 79 s | HUNT | helmet_bonk, plink_tink |
| `4-projectile-launches` | 4 projectile launches | Michel Baradari | CC BY 3.0 | 4 | 6 s | HUNT | shell_whistle |
| `balloon-sounds` | Balloon Sounds | AntumDeluge | CC0 1.0 | 4 | 6 s | disk | blast |
| `bell-dingschimes` | Bell dings/chimes | PWL | CC0 1.0 | 4 | 8 s | disk | helmet_bonk |
| `boing` | BOING! | Aeva | CC0 1.0 | 1 | 4 s | disk | mine_blip_boing |
| `boings` | Boings | EZduzziteh | CC0 1.0 | 3 | 1 s | disk | mine_blip_boing |
| `boom-pack-1` | Boom Pack 1 | dklon | CC BY 3.0 | 9 | 10 s | disk | blast |
| `cannon-fire` | Cannon fire | Thimras | CC0 1.0 | 1 | 4 s | HUNT | cannon_bonk |
| `cannon-hit-cannon` | Cannon hit cannon | Thimras | CC0 1.0 | 1 | 3 s | HUNT | cannon_bonk |
| `cannon-hit-wall` | Cannon hit wall | Thimras | CC0 1.0 | 1 | 3 s | HUNT | cannon_bonk |
| `chaingun-pistol-rifle-shotgun-shots` | Chaingun, pistol, rifle, shotgun shots | Michel Baradari | CC BY 3.0 | 4 | 5 s | HUNT | mg_stutter, rifle_pop |
| `chunky-explosion` | Chunky Explosion | Joth | CC0 1.0 | 1 | 6 s | disk | blast |
| `explosion-0` | Explosion | TinyWorlds | CC0 1.0 | 1 | 1 s | disk | blast |
| `gun-reload-sound-effects` | Gun Reload Sound Effects | BMacZero | CC0 1.0 | 3 | 1 s | HUNT | reload_clack |
| `gun-reload-sounds` | Gun reload sounds | SpringySpringo | CC0 1.0 | 3 | 4 s | HUNT | reload_clack |
| `gunshot-sounds` | Gunshot Sounds | Tabasco | CC0 1.0 | 4 | 38 s | HUNT | mg_stutter, rifle_pop |
| `gunshots` | Gunshots | kurt | CC0 1.0 | 4 | 14 s | HUNT | mg_stutter, rifle_pop |
| `gunshots-0` | Gunshots! | dklon | CC BY 3.0 | 24 | 45 s | HUNT | rifle_pop, sniper_crack |
| `handgun-reload-sound-effect` | Handgun Reload Sound Effect | zer0_sol | CC0 1.0 | 1 | 2 s | HUNT | reload_clack |
| `light-machine-gun` | Light Machine Gun | KuraiWolf | CC BY 4.0 | 1 | 2 s | HUNT | mg_stutter |
| `metal-clang-sounds` | Metal clang sounds | bart | CC0 1.0 | 12 | 65 s | HUNT | plink_tink |
| `metal-impact-sounds` | Metal Impact Sounds | BMacZero | CC0 1.0 | 7 | 5 s | HUNT | plink_tink |
| `pop-effect-sounds` | Pop effect sounds | trezegames | CC0 1.0 | 5 | 0 s | disk | blast |
| `pop-sounds` | Pop sounds | cogitollc | CC0 1.0 | 10 | 1 s | disk | blast |
| `pop-sounds-0` | Pop sounds | EZduzziteh | CC0 1.0 | 9 | 1 s | disk | helmet_bonk |
| `rumbleexplosion` | Rumble/explosion | Michel Baradari | CC BY 3.0 | 1 | 1 s | disk | blast |
| `shotgun-shoot-reload` | Shotgun Shoot + Reload | Mike Koenig (Soundbible. | CC BY 3.0 | 9 | 30 s | HUNT | reload_clack, sniper_crack |
| `spring-sounds` | Spring sounds | bart | CC0 1.0 | 6 | 11 s | HUNT | mine_blip_boing |
| `synthesized-explosion` | Synthesized explosion | qubodup | CC0 1.0 | 1 | 1 s | disk | blast |
| `the-free-firearm-sound-library` | The Free Firearm Sound Library | Ben Jaszczak, et al. | CC0 1.0 | 56 | - | HUNT | mg_stutter, rifle_pop, sniper_crack |
| `toy-double-barrel-shotgun-sounds` | Toy Double Barrel Shotgun Sounds | JumboSizedFish | CC0 1.0 | 7 | 4 s | HUNT | rifle_pop |
| `typewriter-sounds` | Typewriter sounds | Cassie-OrbitGames | CC0 1.0 | 8 | 4 s | HUNT | mg_stutter |

**Sci-Fi**

| slug (host) | title | author | licence chosen | recordings | total | where | hot families |
|---|---|---|---|---|---|---|---|
| `digital-audio` | Kenney Digital Audio | Kenney (kenney.nl) | CC0 1.0 | 62 | 48 s | disk | blink_pop, cloak_shimmer, emp_burst, orbital_strike, plasma_lob, pulse |
| `impact-sounds` | Kenney Impact Sounds | Kenney (kenney.nl) | CC0 1.0 | 130 | 52 s | disk | rivet_chatter |
| `sci-fi-sounds` | Kenney Sci Fi Sounds | Kenney (kenney.nl) | CC0 1.0 | 73 | 197 s | HUNT | mech_step, orbital_strike, pulse_burst, rail_crack, shield_hit |
| `10-impactshield-blocks` | 10 Impact/Shield Blocks | StarNinjas | CC0 1.0 | 10 | 8 s | disk | shield_hit |
| `2-high-quality-explosions` | 2 High Quality Explosions | Michel Baradari | CC BY 3.0 | 2 | 3 s | disk | orbital_strike |
| `25-cc0-bang-firework-sfx` | 25 CC0 bang / firework SFX | rubberduck | CC0 1.0 | 25 | 41 s | disk | rivet_chatter |
| `3-pop-sounds` | 3 Pop Sounds | wubitog | CC0 1.0 | 4 | 4 s | disk | shield_pop |
| `4-projectile-launches` | 4 projectile launches | Michel Baradari | CC BY 3.0 | 4 | 6 s | HUNT | rivet_chatter |
| `50-cc0-sci-fi-sfx` | 50 CC0 Sci-Fi SFX | rubberduck | CC0 1.0 | 50 | 53 s | HUNT | cloak_shimmer, pulse_burst, rivet_chatter |
| `60-cc0-sci-fi-sfx` | 60 CC0 Sci-Fi SFX | rubberduck | CC0 1.0 | 60 | 192 s | HUNT | pulse_burst |
| `8-wet-squish-slurp-impacts` | 8 wet squish, slurp impacts | Independent.nu | CC0 1.0 | 8 | 8 s | disk | plasma_lob |
| `air-whoosh` | Air whoosh | pyranostudios | CC0 1.0 | 1 | 5 s | disk | rivet_chatter |
| `balloon-sounds` | Balloon Sounds | AntumDeluge | CC0 1.0 | 4 | 6 s | disk | shield_pop |
| `bell-dingschimes` | Bell dings/chimes | PWL | CC0 1.0 | 4 | 8 s | disk | mech_step |
| `bubbles-pop` | bubbles 'pop' | farfadet46 | CC0 1.0 | 1 | 0 s | disk | blink_pop, shield_pop |
| `cave-in` | Cave In | StarNinjas | CC0 1.0 | 1 | 4 s | disk | mech_step |
| `chunky-explosion` | Chunky Explosion | Joth | CC0 1.0 | 1 | 6 s | disk | mech_step |
| `countdown-voiceover-robotic` | Countdown voiceover robotic | TheStaticTurtle | CC0 1.0 | 7 | 6 s | disk | orbital_strike |
| `doomsday-laser-cannon-sound-effect` | Doomsday Laser Cannon Sound Effect | TAD | CC0 1.0 | 3 | 36 s | HUNT | rail_crack |
| `electricity-game-sound-pack` | Electricity Game Sound Pack | faxcorp | CC0 1.0 | 16 | 51 s | HUNT | emp_burst, orbital_strike, shield_hit, shield_pop |
| `electricity-sound-effects-0` | Electricity Sound Effects | BMacZero | CC0 1.0 | 2 | 1 s | disk | pulse_burst |
| `energy-drain` | Energy Drain | qubodup | CC0 1.0 | 2 | 6 s | HUNT | emp_burst |
| `glass-bell-sounds` | Glass Bell Sounds | Varkalandar | CC BY 3.0 (page lists CC-BY 3.0/CC-BY-SA 3.0/OGA-BY 3.0) | 7 | 26 s | disk | shield_hit, shield_pop |
| `laser-beam` | Laser Beam | frosty ham | CC0 1.0 | 1 | 3 s | HUNT | rail_crack |
| `machine-death-sound` | Machine Death Sound | OptimusGnu | CC BY 3.0 | 2 | 4 s | HUNT | emp_burst |
| `machine-shutting-down` | Machine shutting down | Cough-E | CC0 1.0 | 1 | 2 s | HUNT | emp_burst |
| `mech-stomp-step-sound` | Mech Stomp / Step Sound | hc | CC0 1.0 | 1 | 1 s | HUNT | mech_step |
| `mechanical-sounds` | Mechanical Sounds | BMacZero | CC0 1.0 | 9 | 5 s | HUNT | rivet_chatter |
| `pop-effect-sounds` | Pop effect sounds | trezegames | CC0 1.0 | 5 | 0 s | disk | blink_pop, shield_pop |
| `pop-sounds` | Pop sounds | cogitollc | CC0 1.0 | 10 | 1 s | disk | shield_pop |
| `pop-sounds-0` | Pop sounds | EZduzziteh | CC0 1.0 | 9 | 1 s | disk | blink_pop |
| `robotic-mechanic-step-sounds` | Robotic mechanic step sounds | Lee Barkovich | CC BY 3.0 | 10 | 10 s | HUNT | mech_step |
| `rocket-launch` | Rocket launch | qubodup | CC0 1.0 | 1 | 6 s | HUNT | rivet_chatter |
| `shimmer-glitter-magic` | Shimmer glitter magic | The Berklee College of M | CC BY 3.0 | 1 | 1 s | disk | cloak_shimmer |
| `slide-whistle-down` | Slide whistle down | Joe DeShon | CC BY 3.0 | 1 | 1 s | disk | emp_burst |
| `squish-sounds-effects` | Squish Sounds Effects | EZduzziteh | CC0 1.0 | 8 | 4 s | disk | plasma_lob |
| `synthesized-explosion` | Synthesized explosion | qubodup | CC0 1.0 | 1 | 1 s | disk | orbital_strike |
| `tesla-coil-powered-death-ray-sound` | Tesla coil powered death ray sound | Varkalandar | CC BY 4.0 (page lists CC-BY 4.0/CC-BY 3.0/CC-BY-SA 4.0/CC-BY-SA 3.0/OGA-BY 3.0) | 1 | 1 s | HUNT | rail_crack |

#### 3.3.9 Family to rows to users (generated; q3_product 28)

Counts are derived by script from the profiles, tables and set-pieces of 3.11 and checked against the rosters (`tests/audio/matrix.test.mjs`: every one of the 102 roster ids has a profile, every committed family is reached).

| era | family | rows | units | unit ids (first 5) | tables / events / set-pieces (first 3) |
|---|---|---|---|---|---|
| Mod | `mod_rifle_pop` | 19 | 9 | chief_spokesperson, clerk_rifleman, cub_reporter, deputy_director, flowerpot_peashooter.. | GOD.mod_gp_ricochet_request, PROJ_AUDIO.pistol, PROJ_AUDIO.rifle.. |
| Mod | `mod_mg_stutter` | 6 | 5 | broadcast_behemoth, fishbowl_chopper, lunchbox_apc, toast_rack_runabout, tripod_mg_team | PROJ_AUDIO.mg |
| Mod | `mod_sniper_crack` | 6 | 1 | long_lens_sharpshooter | PROJ_AUDIO.sniper |
| Mod | `mod_bullet_snap` | 8 | 0 |  | EVENT.unit_suppressed |
| Mod | `mod_reload_clack` | 6 | 8 | clerk_rifleman, cub_reporter, drainpipe_launcher, flowerpot_peashooter, long_lens_sharpshooter.. | ABILITY_CUES.setup, EVENT.unit_reload |
| Mod | `mod_cannon_bonk` | 6 | 7 | biscuit_tank, filing_howitzer, final_notice, grand_teapot, mortar_pair.. | ABILITY_CUES.misfire, PROJ_AUDIO.mortar, PROJ_AUDIO.shell.. |
| Mod | `mod_rocket_whoosh` | 3 | 3 | chandelier_gunship, drainpipe_launcher, parasol_missileer | PROJ_AUDIO.rocket |
| Mod | `mod_shell_whistle` | 4 | 0 |  | EVENT.strike_call, PROJ_AUDIO.mortar |
| Mod | `mod_blast` | 12 | 6 | chandelier_gunship, fishbowl_chopper, hobby_drone, lunchbox_apc, spotter_balloon.. | ABILITY_CUES.summon_on_death, EVENT.unit_wreck, EXPLOSION_AUDIO.grenade.. |
| Mod | `mod_plink_tink` | 14 | 20 | biscuit_tank, broadcast_behemoth, chandelier_gunship, dozer_plough, filing_howitzer.. | EVENT.unit_deflect, EVENT.unit_flanked, GOD.mod_gp_ricochet_request.. |
| Mod | `mod_helmet_bonk` | 10 | 34 | biscuit_tank, broadcast_behemoth, caution_sapper, chandelier_gunship, chief_spokesperson.. | ABILITY_CUES.bailout, EVENT.unit_bailout |
| Mod | `mod_mine_blip_boing` | 6 | 1 | caution_sapper | ABILITY_CUES.lay_mine, EVENT.mine_laid, EVENT.mine_trigger.. |
| Mod | `mod_machine_bed` | 13 | 15 | biscuit_tank, broadcast_behemoth, chandelier_gunship, dozer_plough, fishbowl_chopper.. | ERA_HEAVY.air, ERA_HEAVY.vehicle, EVENT.unit_withdraw.. |
| Mod | `mod_radio_squelch` | 3 | 14 | clerk_rifleman, cub_reporter, drainpipe_launcher, dynamite_thrower, filing_howitzer.. | ABILITY_CUES.call_strike |
| Mod | `mod_stamp_thud` | 3 | 15 | caution_sapper, chief_spokesperson, clerk_rifleman, cub_reporter, deputy_director.. | GOD.mod_gp_express_delivery, SETPIECE.mod_sp_dam_gate, UI.achievement.. |
| Mod | `mod_typewriter_ding` | 2 | 1 | deputy_director | EVENT.capture_update, GOD.mod_gp_tea_break, STINGER.mod_stg_full_fanfare.. |
| Mod | `mod_pen_click` | 2 | 0 |  | GOD.mod_gp_tea_break, STINGER.mod_stg_whistle_snare, UI.ready.. |
| Mod | `mod_stapler_tick` | 2 | 0 |  | UI.hover, UI.tick |
| Mod | `mod_kettle_whistle` | 3 | 3 | biscuit_tank, grand_teapot, teapot_heavy | GOD.mod_gp_tea_break, SETPIECE.mod_sp_dam_gate |
| Mod | `mod_phone_ring` | 2 | 2 | lunchbox_apc, toast_rack_runabout | GOD.mod_gp_express_delivery, GOD.mod_gp_please_hold, SETPIECE.mod_sp_behemoth_dish.. |
| Mod | `mod_whistle` | 3 | 0 |  | GOD.mod_gp_strafing_run, SETPIECE.mod_sp_live_fire, SETPIECE.mod_sp_over_the_top.. |
| Mod | `mod_pop_family` | 3 | 3 | grand_mower, ride_on_mower, spotter_balloon | ABILITY_CUES.smoke, EXPLOSION_AUDIO.emp, EXPLOSION_AUDIO.smoke.. |
| Mod | `mod_step_metal` | 4 | 0 |  | ERA_STEP.metal |
| Mod | `mod_step_concrete` | 4 | 0 |  | ERA_STEP.gravel, ERA_STEP.stone, ERA_STEP.tile |
| Sci | `sf_pulse_burst` | 10 | 6 | bubble_tender, grand_housekeeper, hop_notary, maitre_deluxe, tidy_trooper.. | GOD.sf_arc_tickle, PROJ_AUDIO.beam_pulse, PROJ_AUDIO.laser |
| Sci | `sf_rivet_chatter` | 13 | 6 | junk_buggy, refund_crawler, rivet_gunner, rustbucket_rex, salvo_cart.. | ABILITY_CUES.setup, PROJ_AUDIO.flechette, PROJ_AUDIO.missile |
| Sci | `sf_rail_crack` | 6 | 2 | grand_concierge, silent_signer | PROJ_AUDIO.rail |
| Sci | `sf_plasma_lob` | 6 | 6 | acid_spitter, bloom_stomper, dustpan_hover, elder_hummock, glidewing.. | PROJ_AUDIO.plasma |
| Sci | `sf_shield_hit` | 8 | 1 | bulwark_warden | EVENT.shield_hit |
| Sci | `sf_shield_pop` | 10 | 0 |  | ABILITY_CUES.bailout, ABILITY_CUES.recharge, EVENT.shield_break.. |
| Sci | `sf_emp_burst` | 10 | 23 | bubble_tender, bulwark_warden, dustpan_hover, grand_concierge, grand_housekeeper.. | ABILITY_CUES.cc_field, ABILITY_CUES.emp, CC_BY_SPECIES.zapper_tinker.. |
| Sci | `sf_cloak_shimmer` | 6 | 2 | silent_signer, veil_cutter | ABILITY_CUES.cloak, EVENT.unit_cloak, SETPIECE.sf_sp_rolling_blackout |
| Sci | `sf_blink_pop` | 10 | 1 | hop_notary | ABILITY_CUES.blink, EVENT.unit_blink, EVENT.unit_withdraw.. |
| Sci | `sf_hover_hum` | 10 | 10 | dustpan_hover, glidewing, junk_buggy, refund_crawler, salvo_cart.. | ERA_HEAVY.hover, SETPIECE.sf_sp_buffering, SETPIECE.sf_sp_magma_hiccup.. |
| Sci | `sf_mech_step` | 9 | 5 | bloom_stomper, elder_hummock, grand_concierge, hive_queen, rustbucket_rex | ABILITY_CUES.stomp, ERA_HEAVY.mech, EVENT.unit_wreck.. |
| Sci | `sf_orbital_strike` | 6 | 0 |  | ABILITY_CUES.call_strike, EVENT.strike_call, EXPLOSION_AUDIO.orbital.. |
| Sci | `sf_alien_goo` | 12 | 11 | acid_spitter, bloom_stomper, elder_hummock, glidewing, glow_grazer.. | ABILITY_CUES.summon_on_death |
| Sci | `sf_grazer_baa` | 3 | 1 | glow_grazer | GOD.sf_grazer_drop |
| Sci | `sf_klaxon` | 3 | 0 |  | SETPIECE.sf_sp_hull_breach, SETPIECE.sf_sp_lunch_served |
| Sci | `sf_bell` | 3 | 5 | bubble_tender, grand_concierge, grand_housekeeper, greeter_unit, maitre_deluxe | ABILITY_CUES.confuse, ABILITY_CUES.discipline, CC_BY_SPECIES.grand_concierge.. |
| Sci | `sf_booth_chirp` | 2 | 4 | bulwark_warden, rivet_gunner, tidy_trooper, wrench_runner | ABILITY_CUES.taunt |
| Sci | `sf_geyser_roar` | 3 | 0 |  | SETPIECE.sf_sp_magma_hiccup |
| Sci | `sf_spore_puff` | 3 | 2 | spore_shepherd, spritz_medic | ABILITY_CUES.dot_cloud, ABILITY_CUES.gas, EXPLOSION_AUDIO.smoke.. |
| Sci | `sf_stamp_rated` | 1 | 1 | tidy_trooper | GOD.sf_off_switch |
| Sci | `sf_step_regolith` | 3 | 0 |  | ERA_STEP.dirt, ERA_STEP.dust, ERA_STEP.gravel.. |
| Sci | `sf_step_goo` | 3 | 1 | glow_grazer | ERA_STEP.mud, ERA_STEP.tile, GOD.sf_grazer_drop |
| Med | `med_sword_on_plate` | 6 | 9 | castellan, knight_afoot, knight_errant, lancer, pavise_bearer.. | GOD.med_royal_volley |
| Med | `med_mace_crunch` | 6 | 13 | billman, bridge_troll, castellan, coin_golem, knight_afoot.. |  |
| Med | `med_lance_shatter` | 9 | 2 | knight_errant, lancer | ABILITY_CUES.lance, SETPIECE.med_sp_brace_break, SETPIECE.med_sp_colours_down.. |
| Med | `med_hoof_thunder` | 10 | 6 | bridge_troll, knight_errant, lancer, pageant_dragon, plague_cart.. | ABILITY_CUES.summon_on_death, ERA_HEAVY.mounted, SETPIECE.med_sp_brace_break.. |
| Med | `med_brace_thunk` | 9 | 1 | pikeman | ABILITY_CUES.pavise, EVENT.unit_brace, SETPIECE.med_sp_brace_break |
| Med | `med_longbow_volley` | 7 | 2 | longbowman, poacher | GOD.med_royal_volley |
| Med | `med_xbow_release` | 7 | 2 | crossbowman, rolling_keep | PROJ_AUDIO.quarrel |
| Med | `med_xbow_crank` | 4 | 1 | crossbowman | EVENT.unit_reload |
| Med | `med_trebuchet` | 7 | 5 | cinderwyrm, lady_counterweight, pageant_dragon, trebuchet, wyvern | ABILITY_CUES.bailout, ABILITY_CUES.fire_every, EVENT.air_landed.. |
| Med | `med_shell_whistle` | 3 | 0 |  | GOD.med_bell_drop, SETPIECE.med_sp_lady_arrives, STINGER.med_sting_lady |
| Med | `med_ram_gate` | 6 | 6 | battering_ram, lady_counterweight, mangonel, rolling_keep, springald.. | EVENT.prop_damaged, SETPIECE.med_sp_gate_falls |
| Med | `med_wall_collapse` | 6 | 6 | battering_ram, lady_counterweight, mangonel, rolling_keep, springald.. | EVENT.terrain_edit, EVENT.unit_wreck, EXPLOSION_AUDIO.boulder.. |
| Med | `med_banner` | 14 | 1 | standard_bearer | ABILITY_CUES.banner, EVENT.banner_fall, SETPIECE.med_sp_colours_down |
| Med | `med_bell` | 6 | 3 | abbess, bellringer, castellan | ABILITY_CUES.stun, CC_BY_SPECIES.abbess, CC_BY_SPECIES.bellringer.. |
| Med | `med_dragon_roar` | 5 | 2 | cinderwyrm, wyvern | ABILITY_CUES.scare, CC_BY_SPECIES.cinderwyrm, ERA_HEAVY.big.. |
| Med | `med_wing_whomp` | 4 | 2 | cinderwyrm, wyvern | ABILITY_CUES.kick, EVENT.air_landed, EVENT.unit_withdraw.. |
| Med | `med_fire_whoosh` | 3 | 3 | cinderwyrm, mangonel, wyvern | ABILITY_CUES.fire_panic, EVENT.prop_ignited, EXPLOSION_AUDIO.fire.. |
| Med | `med_oil_sizzle` | 3 | 0 |  | ABILITY_CUES.call_strike, ABILITY_CUES.oil |
| Med | `med_armour_step` | 3 | 5 | castellan, coin_golem, knight_afoot, reeve, sellsword | ERA_STEP.metal, GOD.med_soup_cart |
| Med | `med_hoard_glint` | 3 | 0 |  | EVENT.ambience_scheduler |
| Med | `med_purse_jingle` | 2 | 2 | coin_golem, hoardling | ABILITY_CUES.cluck |
| Med | `med_gas_hiss` | 2 | 1 | apothecary | ABILITY_CUES.dot_cloud, ABILITY_CUES.poison, GOD.med_soup_cart.. |
| Med | `med_sneeze_chorus` | 4 | 0 |  | GOD.med_precedence_dispute, SETPIECE.med_sp_great_sniffle |
| Med | `med_foam_bonk` | 3 | 0 |  | EVENT.mutator:pageant_rules, MUTATOR.pageant_rules |
| Med | `med_kazoo_blat` | 2 | 0 |  | GOD.med_audience_joins, SETPIECE.med_sp_dennis_meets_dragon |
| Med | `med_trumpet_crack` | 2 | 0 |  | GOD.med_precedence_dispute, SETPIECE.med_sp_wrong_cue |
| Med | `med_wing_horn` | 2 | 5 | knight_errant, lancer, reeve, ser_valiant, standard_bearer | ABILITY_CUES.war_horn, SETPIECE.med_sp_lance_chorus, STINGER.med_sting_charge |
| Med | `med_troll_groan` | 3 | 2 | bridge_troll, pageant_dragon | ABILITY_CUES.confuse, CC_BY_SPECIES.bridge_troll, SETPIECE.med_sp_bridge_drop |
| Med | `med_step_cobble` | 3 | 0 |  | ERA_STEP.stone, ERA_STEP.tile, GOD.med_audience_joins |
| Med | `med_step_mud` | 3 | 0 |  | ERA_STEP.mud, GOD.med_mud_season |
| Med | `med_step_scree` | 3 | 0 |  | ERA_STEP.gravel |
| Mod | `mod_loudspeaker_squelch` | 3 | 2 | broadcast_behemoth, chief_spokesperson | ABILITY_CUES.confuse, CC_BY_SPECIES.broadcast_behemoth, SETPIECE.mod_sp_live_fire |
| Mod | `mod_paper_rustle` | 3 | 0 |  | SETPIECE.mod_sp_picnic_hamper, UI.panel_close, UI.panel_open |
| Mod | `mod_sandwich_splat` | 3 | 0 |  | SETPIECE.mod_sp_picnic_hamper |
| Mod | `mod_leaf_rustle` | 2 | 0 |  | SETPIECE.mod_sp_picnic_hamper |
| Mod | `mod_boots_planks` | 4 | 0 |  | SETPIECE.mod_sp_over_the_top |
| Mod | `mod_bugle_wrong` | 2 | 0 |  | EVENT.ambience_scheduler, SETPIECE.mod_sp_over_the_top |
| Mod | `mod_rail_snap` | 3 | 0 |  | PROP_BREAK.modern, SETPIECE.mod_sp_wrecking_toll |
| Mod | `mod_reversing_beep` | 2 | 0 |  | SETPIECE.mod_sp_wrecking_toll |
| Mod | `mod_party_horn` | 3 | 0 |  | SETPIECE.mod_sp_boxcar_chain, SETPIECE.mod_sp_flypast |
| Mod | `mod_tower_buzz` | 2 | 0 |  | EVENT.ambience_scheduler, SETPIECE.mod_sp_behemoth_dish, SETPIECE.mod_sp_hold_music |
| Mod | `mod_pa_chime` | 2 | 1 | final_notice | SETPIECE.mod_sp_flypast, SETPIECE.mod_sp_pellmell_falls |
| Mod | `mod_ramp_slam` | 2 | 0 |  | SETPIECE.mod_sp_landing_barge |
| Mod | `mod_gull_far` | 2 | 0 |  | EVENT.ambience_scheduler, SETPIECE.mod_sp_landing_barge |
| Mod | `mod_gate_groan` | 2 | 0 |  | SETPIECE.mod_sp_dam_gate |
| Mod | `mod_water_rush` | 2 | 0 |  | SETPIECE.mod_sp_dam_gate |
| Mod | `mod_firework_rocket` | 4 | 0 |  | SETPIECE.mod_sp_boxcar_chain |
| Mod | `mod_tape_unroll` | 2 | 0 |  | GOD.mod_gp_minefield_gift |
| Mod | `mod_kazoo_blat` | 2 | 0 |  | GOD.mod_gp_express_delivery |
| Mod | `mod_hold_music_sting` | 1 | 0 |  | GOD.mod_gp_please_hold, SETPIECE.mod_sp_hold_music |
| Sci | `sf_step_hull` | 4 | 0 |  | ERA_STEP.metal |
| Sci | `sf_step_moss` | 3 | 0 |  | ERA_STEP.grass |
| Sci | `sf_blast` | 9 | 0 |  | EVENT.unit_wreck, EXPLOSION_AUDIO.grenade, EXPLOSION_AUDIO.mine.. |
| Sci | `sf_knockout` | 6 | 14 | bubble_tender, bulwark_warden, grand_housekeeper, greeter_unit, hop_notary.. |  |
| Sci | `sf_hull_tink` | 4 | 23 | bubble_tender, bulwark_warden, dustpan_hover, grand_concierge, grand_housekeeper.. | PROP_BREAK.scifi |
| Sci | `sf_dome_crack` | 2 | 0 |  | PROP_BREAK.scifi, SETPIECE.sf_sp_lunch_served |
| Sci | `sf_airlock_hiss` | 2 | 0 |  | SETPIECE.sf_sp_lunch_served |
| Sci | `sf_lava_bloop` | 3 | 0 |  | SETPIECE.sf_sp_magma_hiccup |
| Sci | `sf_power_down_hum` | 2 | 0 |  | ABILITY_CUES.overclock, EVENT.ambience_scheduler, SETPIECE.sf_sp_rolling_blackout |
| Sci | `sf_earth_rumble` | 1 | 0 |  | GOD.sf_gravity_burp, SETPIECE.sf_sp_hill_wakes |
| Sci | `sf_titan_roar_soft` | 1 | 1 | elder_hummock | SETPIECE.sf_sp_hill_wakes |
| Sci | `sf_sonic_shush` | 2 | 0 |  | SETPIECE.sf_sp_noise_complaint |
| Sci | `sf_hull_breach` | 3 | 0 |  | SETPIECE.sf_sp_hull_breach |
| Sci | `sf_queen_screech` | 3 | 2 | bloom_stomper, hive_queen | ABILITY_CUES.scare, SETPIECE.sf_sp_hull_breach, SETPIECE.sf_sp_queen_rise |
| Sci | `sf_truck_horn` | 1 | 1 | rustbucket_rex | SETPIECE.sf_sp_rex_wakes |
| Sci | `sf_stilt_creak` | 3 | 0 |  | SETPIECE.sf_sp_rex_wakes |
| Sci | `sf_lock_line` | 2 | 0 |  | EVENT.beam_lock_telegraph |
| Sci | `sf_slide_up` | 1 | 0 |  | GOD.sf_gravity_burp |
| Sci | `sf_scan_ring` | 2 | 0 |  | ABILITY_CUES.detect, EVENT.ambience_scheduler |
| Sci | `sf_hold_music_snippet` | 1 | 0 |  | SETPIECE.sf_sp_please_hold |
| Sci | `sf_crate_confetti` | 2 | 0 |  | PROP_BREAK.scifi |
| Sci | `sf_glass_pop` | 2 | 0 |  | PROP_BREAK.scifi |
| Med | `med_rain_hush` | 2 | 0 |  | GOD.med_mud_season |
| Med | `med_gloop` | 2 | 0 |  | GOD.med_mud_season |
| Med | `med_dragon_sniff` | 2 | 0 |  | SETPIECE.med_sp_dennis_meets_dragon |
| Med | `med_sheep_bleat_far` | 1 | 0 |  | SETPIECE.med_sp_lance_chorus |
| Med | `med_quill_scratch` | 3 | 0 |  | UI.hover, UI.tick |
| Med | `med_stamp_thump` | 3 | 0 |  | UI.click, UI.ready, UI.toggle |
| Med | `med_stamp_brass` | 2 | 0 |  | UI.confirm |
| Med | `med_page_rustle` | 3 | 0 |  | UI.back, UI.panel_close, UI.panel_open |
| Med | `med_hand_bell` | 3 | 0 |  | UI.achievement |
| Sci | `sf_ui_tick` | 3 | 0 |  | UI.hover, UI.tick, UI.toggle |
| Sci | `sf_ui_bwip` | 3 | 0 |  | UI.back, UI.click |
| Sci | `sf_ui_ting` | 3 | 0 |  | UI.achievement, UI.confirm |
| Sci | `sf_hex_whoosh` | 3 | 0 |  | UI.panel_close, UI.panel_open |
| Sci | `sf_ui_chime` | 2 | 0 |  | UI.ready |


### 3.4 Music (AU1, AU3)

#### 3.4.1 Slot tables (generated; the matrix `music` has every field)

Columns: `cut` is the build rule (3.4.5); `source LUFS-I`, `key` and `source s` were measured on the downloaded or on-disk file (`music_an` run: ffmpeg `ebur128`, Krumhansl-Schmuckler chroma key, `audiolib.decode`); `bpm` is the catalogue value (incompetech), the bible target (OpenGameArt pieces, where the head-probe estimator is known to confuse octaves and triplets: it read 86.5 for a piece the bible wants at 96 and 131 for one at 56) or marked estimated. "HUNT" means the file is not in `assets/raw` yet (3.16).

**Medieval** (all primaries CC0; RandomMind loop files and cynicmusic/Umplix tracks)

| slot | role | track | licence | source s | bpm | key est (corr) | source LUFS-I | loop status | cut | where |
|---|---|---|---|---|---|---|---|---|---|---|
| menu | primary | Medieval: Minstrel Dance by RandomMind | CC0 1.0 | 56.31 | 96 | G# maj (0.94) | -12.5 | native loop (seam 0.6) | whole - | HUNT |
|  | alt | Village Consort by Kevin MacLeod | CC BY 4.0 | 214.8 | 95 | G maj (0.65) | -9.3 | bar-aligned cut + fade, 3 s crossfade | bars bars=32 | disk |
| map | primary | Medieval: Exploration by RandomMind | CC0 1.0 | 236.36 | - | D maj (0.74) | -22.0 | native loop (seam 1.87) | whole t0=1.12, tail_trim=2.6 | disk |
|  | alt | Medieval: The Old Tower Inn by RandomMind | CC0 1.0 | 49.95 | - | F min (0.79) | -17.4 | native loop (seam 1.56) | whole - | HUNT |
| battle_low | primary | Medieval: The Bard's Tale by RandomMind | CC0 1.0 | 57.73 | 84 | D min (0.84) | -12.0 | native loop (seam 1.66) | whole - | HUNT |
|  | alt | Lord of the Land by Kevin MacLeod | CC BY 4.0 | 186.49 | 112 | G# maj (0.59) | -24.0 | bar-aligned cut + fade, 3 s crossfade | bars bars=40 | disk |
| battle_mid | primary | To Battle! by Umplix | CC0 1.0 | 90.75 | 100 | B min (0.81) | -14.1 | native loop (seam 0.42) | whole - | disk |
|  | alt | Death and Axes by Kevin MacLeod | CC BY 4.0 | 168.07 | 140 | A min (0.73) | -9.4 | bar-aligned cut + fade, 3 s crossfade | bars bars=36 | disk |
| battle_high | primary | Battle Theme B for RPG by cynicmusic | CC0 1.0 | 66.04 | 142 | B min (0.8) | -12.8 | bar-aligned cut + fade, 3 s crossfade | bars bars=38, fade_out=1.2 | disk |
|  | alt | Battle Theme A by cynicmusic | CC0 1.0 | 95.85 | 146 | C min (0.74) | -10.3 | native loop (seam 2.4) | whole - | disk |
| victory | primary | Medieval: Victory Theme by RandomMind | CC0 1.0 | 32.44 | 110 | C maj (0.82) | -10.2 | bar-aligned cut + fade, 3 s crossfade | t1 t1=20.0, fade_out=2.5 | HUNT |
|  | alt | Victory Theme for RPG by cynicmusic | CC0 1.0 | 56.74 | - | F maj (0.74) | -11.1 | bar-aligned cut + fade, 3 s crossfade | t1 t1=20.0, fade_out=2.5 | disk |
| defeat | primary | Medieval: Defeat Theme by RandomMind | CC0 1.0 | 45.1 | 56 | A# maj (0.75) | -9.6 | bar-aligned cut + fade, 3 s crossfade | t1 t1=24.0, fade_out=3.0 | disk |
|  | alt | Funeral March for Brass by Kevin MacLeod | CC BY 4.0 | 130.85 | 62 | D maj (0.74) | -14.5 | bar-aligned cut + fade, 3 s crossfade | t1 t1=24.0, fade_out=3.0 | disk |

**Modern** (all primaries Kevin MacLeod, CC BY 4.0; no trailer or orchestral-epic piece)

| slot | role | track | licence | source s | bpm | key est (corr) | source LUFS-I | loop status | cut | where |
|---|---|---|---|---|---|---|---|---|---|---|
| menu | primary | Vibing Over Venus by Kevin MacLeod | CC BY 4.0 | 411.14 | 94 | A maj (0.78) | -21.1 | bar-aligned cut + fade, 3 s crossfade | bars bars=32, fade_out=2.5 | HUNT |
|  | alt | Local Forecast by Kevin MacLeod | CC BY 4.0 | 165.22 | 93 | C min (0.75) | -8.1 | bar-aligned cut + fade, 3 s crossfade | bars bars=36, fade_out=2.5 | HUNT |
| map | primary | Local Forecast - Elevator by Kevin MacLeod | CC BY 4.0 | 189.2 | 82 | C maj (0.77) | -19.2 | bar-aligned cut + fade, 3 s crossfade | bars bars=36, fade_out=3.0, t0=0.32 | HUNT |
|  | alt | BossaBossa by Kevin MacLeod | CC BY 4.0 | - | 77 | - | - | bar-aligned cut + fade, 3 s crossfade | bars bars=30, fade_out=3.0 | HUNT |
| battle_low | primary | Invariance by Kevin MacLeod | CC BY 4.0 | 216.84 | 108 | D maj (0.55) | -24.5 | bar-aligned cut + fade, 3 s crossfade | bars bars=40, fade_out=2.0 | HUNT |
|  | alt | Scissors by Kevin MacLeod | CC BY 4.0 | - | 103 | - | - | bar-aligned cut + fade, 3 s crossfade | bars bars=40, fade_out=2.0 | HUNT |
| battle_mid | primary | Funin and Sunin by Kevin MacLeod | CC BY 4.0 | 218.96 | 120 | G maj (0.7) | -13.0 | bar-aligned cut + fade, 3 s crossfade | bars bars=44, fade_out=2.0 | HUNT |
|  | alt | Your Call by Kevin MacLeod | CC BY 4.0 | 224.05 | 120 | C min (0.65) | -10.9 | native loop (seam 1.84) | whole - | HUNT |
| battle_high | primary | Run Amok by Kevin MacLeod | CC BY 4.0 | 107.1 | 148 | C maj (0.8) | -16.1 | bar-aligned cut + fade, 3 s crossfade | bars bars=65, fade_out=1.5, t0=0.82 | HUNT |
|  | alt | Volatile Reaction by Kevin MacLeod | CC BY 4.0 | - | 155 | - | - | bar-aligned cut + fade, 3 s crossfade | bars bars=60, fade_out=1.5 | HUNT |
| victory | primary | In Your Arms by Kevin MacLeod | CC BY 4.0 | 168.75 | 98 | A# maj (0.69) | -13.0 | bar-aligned cut + fade, 3 s crossfade | tail bars=8 | HUNT |
|  | alt | Super Friendly by Kevin MacLeod | CC BY 4.0 | - | 108 | - | - | bar-aligned cut + fade, 3 s crossfade | tail bars=8 | HUNT |
| defeat | primary | With Regards by Kevin MacLeod | CC BY 4.0 | 177.68 | 66 | B min (0.92) | -13.7 | bar-aligned cut + fade, 3 s crossfade | tail bars=6 | HUNT |
|  | alt | Poppers and Prosecco by Kevin MacLeod | CC BY 4.0 | - | 70 | - | - | bar-aligned cut + fade, 3 s crossfade | tail bars=6 | HUNT |

**Sci-Fi** (six MacLeod primaries; the defeat slot is a runtime synth bed because the tape-stop is the joke)

| slot | role | track | licence | source s | bpm | key est (corr) | source LUFS-I | loop status | cut | where |
|---|---|---|---|---|---|---|---|---|---|---|
| menu | primary | Canon In D Interstellar Mix by Kevin MacLeod | CC BY 4.0 | 287.56 | 96 | D maj (0.9) | -10.9 | bar-aligned cut + fade, 3 s crossfade | bars bars=36, fade_out=2.5 | HUNT |
|  | alt | Disco Lounge by Kevin MacLeod | CC BY 4.0 | - | 109 | - | - | bar-aligned cut + fade, 3 s crossfade | bars bars=40, fade_out=2.5 | HUNT |
| map | primary | Bleeping Demo by Kevin MacLeod | CC BY 4.0 | 213.76 | 74 | C min (0.69) | -15.6 | bar-aligned cut + fade, 3 s crossfade | bars bars=30, fade_out=3.0 | HUNT |
|  | alt | Alien Restaurant by Kevin MacLeod | CC BY 4.0 | 372.77 | - | C# maj (0.51) | -25.3 | whole file, crossfade (seam 3.47) | whole t1=120.0, fade_out=3.0 | HUNT |
| battle_low | primary | Rising Tide by Kevin MacLeod | CC BY 4.0 | 277.42 | 106 | A maj (0.76) | -18.1 | bar-aligned cut + fade, 3 s crossfade | bars bars=40, fade_out=2.0 | HUNT |
|  | alt | Space Fighter Loop by Kevin MacLeod | CC BY 4.0 | 101.12 | 95 | C maj (0.65) | -14.2 | native loop (seam 2.52) | whole - | HUNT |
| battle_mid | primary | Laserpack by Kevin MacLeod | CC BY 4.0 | 185.68 | 128 | A maj (0.68) | -16.1 | bar-aligned cut + fade, 3 s crossfade | bars bars=48, fade_out=2.0 | HUNT |
|  | alt | Blipotron by Kevin MacLeod | CC BY 4.0 | - | 124 | - | - | bar-aligned cut + fade, 3 s crossfade | bars bars=40, fade_out=2.0 | HUNT |
| battle_high | primary | Flying Kerfuffle by Kevin MacLeod | CC BY 4.0 | 250.07 | 144 | A min (0.69) | -9.4 | bar-aligned cut + fade, 3 s crossfade | bars bars=54, fade_out=1.5 | HUNT |
|  | alt | Laser Groove by Kevin MacLeod | CC BY 4.0 | - | 140 | - | - | bar-aligned cut + fade, 3 s crossfade | bars bars=56, fade_out=1.5 | HUNT |
| victory | primary | Newer Wave by Kevin MacLeod | CC BY 4.0 | 174.6 | 110 | A min (0.83) | -11.9 | bar-aligned cut + fade, 3 s crossfade | tail bars=8 | HUNT |
|  | alt | Disco Sting by Kevin MacLeod | CC BY 4.0 | 16.43 | 132 | C maj (0.63) | -15.3 | native loop (seam 0.01) | whole - | HUNT |
| defeat | primary | defeat_scifi by VOXELWARS project | CC0 1.0 | - | 70 | - | - | runtime synth bed | - | synth |
|  | alt | Takeover of the 8-bit Synths by Kevin MacLeod | CC BY 4.0 | - | 90 | - | - | bar-aligned cut + fade, 3 s crossfade | tail bars=6 | HUNT |

Counts (q3_product 27): | era | slots | files shipped | runtime synth beds | CC0 tracks | CC BY tracks | stingers (separate count) |
|---|---|---|---|---|---|---|
| Medieval | 7 | 7 | 0 | 7 | 0 | 14 |
| Modern | 7 | 7 | 0 | 0 | 7 | 10 |
| Sci-Fi | 7 | 6 | 1 | 0 | 6 | 11 |

Totals: 7 + 7 + 6 = 20 shipped files plus 1 runtime bed against the plan's 21; the floor of 6 per era is met in every era (Sci-Fi: 6 files plus the synth defeat). The cut-ladder rung 4 ("6 to 5") may drop an alternate listed above and nothing else; below 6 files an era cannot release. Stingers are counted in 3.5 (35, separate). The Ancient release keeps its 8 tracks; the core track for AU6 is Ancient `battle_mid_epic_boss` (3.12.5).

#### 3.4.2 Loop policy v2 and its measurements

`tools/loop_check2.py` decodes to mono 22,050 Hz and computes `seam_vs_p95`:

```
seg  = concat(a[-4 s:], a[:4 s])            # 8 s window centred on the wrap
X    = STFT(seg, N=1024, hop=512, Hann);  L = ln(|X| + 1e-6)
flux = sum over bins of max(L[i] - L[i-1], 0)
k    = frame index of the wrap
near = max(flux[k-3 : k+3]);  rest = flux outside [k-6, k+6)
seam_vs_p95 = near / percentile(rest, 95)
native_loop  = seam_vs_p95 <= 3.0  AND  tail_vs_body_db >= -9      (the v1 tail test)
```

Measured on 41 real files (23 in the first set, 18 MacLeod tracks in the second; some were already on disk, the rest were fetched to a quarantine directory): 19 score 3.0 or below (range 0.00 to 2.52) and 22 score above (range 3.13 to 25.09). Genuine loops: 0.42 (`to_battle.wav`), 0.60 (Minstrel Dance loop), 1.06 (Juhani Junkala "Epic Boss Battle [Seamlessly Looping]", the Ancient core track: the positive control), 1.56 (Old Tower Inn), 1.64 (`viking-march`), 1.66 (Bard's Tale), 1.78 (Market Day), 1.84 (MacLeod "Your Call"), 1.87 (Exploration), 2.40 (Battle Theme A), 2.52 (MacLeod "Space Fighter Loop"). Not seamless: 3.13 (MacLeod "Bleeping Demo"), 3.47 ("Alien Restaurant"), 4.16 ("Laserpack"), 4.41 ("Local Forecast"), 4.48 ("Canon In D Interstellar Mix"), then 5.61 to 25.09 for faded or cut files (`Undaunted` 5.61, "Vibing Over Venus" 6.12, `Death and Axes` 7.0, `Lord of the Land` 7.59, `Funin and Sunin` 8.45, `Flying Kerfuffle` 8.73, "Invariance" 9.26, `Battle Theme B` 12.91, `victory.wav` 23.94, `medieval_standoff.wav` 25.09). One file named as a loop fails: `the_march_of_devils_dome_loop.wav` 9.18, and the check says so. The gap between the largest genuine loop (2.52) and the smallest non-loop (3.13) is 0.61, so 3.0 is a measured threshold, not a theory; the negative-control fixture (`tests/audio/fixtures/seam_fail.wav`, a 6 s tone with a 20 percent amplitude step at the wrap) must score >= 6.

Files that end in digital silence score 0.0 (nothing changes at the wrap) and are rejected by the `tail_vs_body_db >= -9` term (measured tails: Rising Tide -96.5 dB, Run Amok -101.0, Newer Wave -107.8, Disco Sting -80.7, In Your Arms -71.7, With Regards -61.7, Funeral March for Brass -60.4, Local Forecast - Elevator -51.4 dB below the body). Such tracks are cut on a bar boundary with a fade and use the 3 s equal-power crossfade of `LoopPlayer` (`music.js:79-140`, `bakedFade` in `manifest.js:80` already prevents a second fade).

#### 3.4.3 Tonic family of the battle tiers

`tools/key_check.py` reports the estimated tonic of each tier and the spread on the circle of fifths (relative keys equal; minor X maps to major X+3 semitones). Generated from the measured keys:

| era | low tonic (fifths from C) | mid tonic | high tonic | max spread (steps) | rule <= 3 |
|---|---|---|---|---|---|
| Medieval | D min (-1) | B min (+2) | B min (+2) | 3 | pass |
| Modern | D maj (+2) | G maj (+1) | C maj (+0) | 2 | pass |
| Sci-Fi | A maj (+3) | A maj (+3) | A min (+0) | 3 | pass |

Key estimates have confidences 0.44-0.94 (Krumhansl profile correlation); weak ones are Invariance 0.55, Alien Restaurant 0.51, Exploration 0.74 (see matrix). The rule is a screen; the listening check by an agent that did not pick the track decides.

#### 3.4.4 Audition candidates for Modern and Sci-Fi: 9 CC0 and 7 CC BY (metadata only, never auditioned)

The bibles name catalogue pieces by tempo and instrumentation, so the primaries are MacLeod CC BY 4.0. CC0 first remains the rule; the 9 CC0 candidates below come first in any replacement, then the 7 CC BY ones (credited under their own licence). These candidates were found by search and probed (head and tail of one file each) and are the first alternates if a listening check rejects a primary.

| slug (OpenGameArt) | author | licence | bpm (head-probe estimate) | bytes | tail vs body dB | possible use |
|---|---|---|---|---|---|---|
| `funked-up` | Joth | CC0 | 87.0 | 1329549 | 0.2 | Modern battle mid (funk) |
| `jazzy-battle-theme` | MintoDog | CC0 | 86.5 | 2711979 | - | Modern battle mid or low |
| `simple-action-beat` | LushoGames | CC0 | 119.5 | 4802350 | -3.0 | Modern battle mid |
| `on-patrol` | section31 | CC0 | 119.5 | 4332533 | - | Modern battle low (stealthy) |
| `night-prowler` | section31 | CC0 | 110.0 | 2525529 | - | Modern battle low |
| `xenocity-sidekick` | Deva | CC0 | 110.0 | 6429053 | -65.6 | Sci-Fi battle low or mid |
| `space-city` | MintoDog | CC0 | 115.0 | 3712951 | - | Sci-Fi menu or map |
| `friendly-talk-on-a-robotic-battlefield-looped` | illin | CC0 | 79.0 | 1579512 | - | Sci-Fi map bed (title says looped) |
| `cyberpunk-moonlight-sonata` | Joth | CC0 | 108.0 | 2338920 | -0.4 | Sci-Fi menu or low |
| `cyberpunk-city-looping` | Eric Matyas | CC-BY 4.0 | 140.0 | 1791557 | -4.2 | Sci-Fi battle high (title says looping) |
| `endless-cyber-runner-looping` | Eric Matyas | CC-BY 4.0 | 119.5 | 3848852 | 5.1 | Sci-Fi battle mid (title says looping) |
| `mech-monsters-closing-in-looping` | Eric Matyas | CC-BY 3.0 | 86.5 | 7859233 | - | Sci-Fi battle low (looping, 7.9 MB) |
| `bluebeat-01-loop-cyberpunk-lab-music` | ERH | CC-BY 3.0 | 119.5 | 557702 | - | Sci-Fi battle low (loop file, 0.56 MB) |
| `free-jazzbebop-chase-music` | Matthew Pablo | CC-BY 3.0 | 135.5 | 2085870 | -79.0 | Modern battle high (jazz chase) |
| `march-two-step` | tcarisland | CC-BY 4.0 | 100.0 | 2305309 | -1.3 | Modern/Medieval comedy-adjacent march (not a slot) |
| `city-at-night` | tcarisland | CC-BY 4.0 | 100.0 | 3687709 | -3.7 | Modern map (not downloaded) |

#### 3.4.5 Cut, encode and normalise (extends `tools/music_spec.py`)

| mode | meaning | fields |
|---|---|---|
| `whole` | the file as shipped by the composer (native loop) or the whole piece | optional `t0` (skip lead silence), `tail_trim` |
| `bars` | first `bars` bars after `t0`, bar = 240 / bpm seconds | `bars`, `fade_out` (1.2-3.0 s), `t0` |
| `tail` | the last `bars` bars with the natural ending kept (one-shots) | `bars` |
| `t1` | cut at `t1` seconds with `fade_out` | `t1`, `fade_out` |
| `synth` | no file: `MUSIC_SPECS[id]` renders at runtime | - |

Encode: libmp3lame, joint stereo, 112 kbps (menu, loops), 96 kbps (battle, one-shots), 64 kbps (map beds from MacLeod), 48 kbps (Exploration, 232 s). Targets: menu, battle low/mid/high, victory and defeat normalised to -16 LUFS-I (the three battle tiers within 0.5 LU of each other), map beds to -26 LUFS-I, true peak limited to -1.5 dBTP before encoding (sources measured up to +2.4 dBTP: Defeat Theme, Canon In D, Flying Kerfuffle). Every row records `lufs`, `bpm`, `bpmSource`, `loop`, `loop_check2`, `key`, `slot`, `energy`, `themes`, `era`, `fade_out`, and `bakedFade`.

#### 3.4.6 Listening checks and honest limits

Not verifiable here: that any pick sounds right, that the shawm stays recognisable at the lowest intensity cutoff (1.8 kHz), that a tier crossfade is musically clean, that bpm targets are met by ear. The verification report lists these as "unheard"; an agent that did not pick the track writes the listening check (tier crossfade A/B/C with `mixtest --stems`).

### 3.5 Stingers (AU4)

35 stingers (14 Medieval, 10 Modern, 11 Sci-Fi). Each is a deterministic synth build from the voice vocabulary below, event list in the matrix (`stingers[*].events`: `(t_seconds, voice, args)`), rendered by `tools/build_stingers.py` (numpy, seed = fnv(id)) to 44.1 kHz mono, asserted to the stated length +-80 ms, and packed in the era's `sting` pack as ordinary sprites (`category: stinger`, group `siege`, kind recorded in `tags`). Events of voice `row` play the real rows of a family at that moment, so the stinger and the gag use the same recordings. `limiter_bypass` stingers (`med_sting_dragon`, `med_sting_finale`, `mod_stg_full_fanfare`, `mod_stg_full_fanfare_low`, `sf_stg_finale`) are routed to the post-limiter tap (3.12.3). All stingers use the `sting` template (3.11.2): bus announcer, priority 96, music duck -6 dB for 700 ms.

**Medieval** (key of D, trumpet detuned -35 cents)

| id | kind | length s | limiter bypass | used by | content | events (voice@t, first 6) |
|---|---|---|---|---|---|---|
| `med_sting_wrong_cue` | comic | 2.2 |  | M1 (med_sp_wrong_cue) | flat trumpet crack falling into snare and toms | tpt@0.00 tpt@0.30 snare@0.95 snare@1.25 tom@1.55 tom@1.75 .. |
| `med_sting_colours_down` | hit | 1.8 |  | M2 (med_sp_colours_down) | one bronze bell clang under a falling low-brass note | bell@0.00 brass@0.05 slide@0.55 |
| `med_sting_brace` | hit | 2.0 |  | M3 (med_sp_brace_break) | a single enormous drum hit and a timber creak | timp@0.00 kick@0.00 thud@0.08 creak@0.45 |
| `med_sting_charge` | swell | 3.0 |  | M4 (med_sp_lance_chorus) | galloping snare and a horn that arrives a bar late | snare@0.00 snare@0.25 snare@0.50 snare@0.75 snare@1.00 snare@1.25 .. |
| `med_sting_breach` | hit | 2.4 |  | M5 (med_sp_gate_falls) | timpani hit and a woodwind fall, a trumpet repeating the wrong cue | timp@0.00 oboe@0.10 slide@0.45 tpt@1.40 tpt@1.80 |
| `med_sting_plague` | comic | 2.6 |  | M6 (med_sp_great_sniffle) | one bell toll and a wobbling oboe | bell@0.00 oboe@0.80 oboe@1.90 |
| `med_sting_fire` | comic | 2.2 |  | M7 (med_sp_windmill_blaze) | a rising brass swell and a cymbal that arrives late | brass@0.00 slide@0.20 cym@1.90 |
| `med_sting_dragon_shadow` | dread | 1.8 |  | M7 cameo (med_sp_dragon_shadow) | a low brass note, short | brass@0.00 sub@0.10 |
| `med_sting_lady` | dread | 3.0 |  | M8 (med_sp_lady_arrives), Survival entrance | counterweight groan, a whistle, a rolling crash | creak@0.00 rumble@0.00 row:med_shell_whistle@1.10 row:med_wall_collapse@2.00 |
| `med_sting_troll` | comic | 2.0 |  | M8 (med_sp_bridge_drop), Survival entrance | a tuba wah | tuba@0.00 slide@0.45 |
| `med_sting_dragon` | dread | 3.5 | yes | M9 (med_sp_dragon_wakes), Survival entrance | a low brass note and a distant roar | brass@0.00 row:med_dragon_roar_far@0.90 sub@1.00 |
| `med_sting_finale` | fanfare | 3.0 | yes | M9 coda (med_sp_dennis_meets_dragon) | a kazoo against full brass | tpt@0.00 brass@0.00 tpt@0.45 tpt@0.90 kazoo@1.30 tpt@1.90 .. |
| `med_sting_hog` | fanfare | 2.0 |  | Survival boss entrance (great_hog) | a three-note brass flourish | tpt@0.00 tpt@0.30 tpt@0.60 |
| `med_sting_keep` | hit | 2.4 |  | Survival boss entrance (rolling_keep) | timpani hit and a woodwind fall | timp@0.00 oboe@0.10 slide@0.50 |

**Modern** (key of C)

| id | kind | length s | limiter bypass | used by | content | events (voice@t, first 6) |
|---|---|---|---|---|---|---|
| `mod_stg_whistle_snare` | comic | 2.0 |  | M1 (mod_sp_live_fire) | a coach's whistle into two snare hits and a rim click | row:mod_whistle@0.00 snare@0.90 snare@1.15 row:mod_pen_click@1.60 |
| `mod_stg_clarinet_sting` | comic | 1.8 |  | M2 (mod_sp_picnic_hamper) | a solo clarinet slides down a minor third and stops | clar@0.00 clar@0.90 |
| `mod_stg_whistle_drumroll` | swell | 3.0 |  | M3 (mod_sp_over_the_top) | three whistle blasts over a snare roll that never quite resolves | row:mod_whistle@0.00 row:mod_whistle@0.90 row:mod_whistle@1.80 snare@0.10 snare@0.16 snare@0.22 .. |
| `mod_stg_brass_stab_boom` | hit | 2.4 |  | M4 (mod_sp_wrecking_toll), Grand Teapot entrance | one brass stab and a low tin boom | bigband@0.00 row:mod_cannon_bonk@0.05 sub@0.10 |
| `mod_stg_fireworks` | comic | 2.6 |  | M5 (mod_sp_boxcar_chain) | rising rockets, a party horn and a cymbal that arrives late | fireworks@0.00 fireworks@0.50 fireworks@1.00 partyhorn@1.60 cym@2.30 |
| `mod_stg_hold_music` | comic | 3.2 |  | M6 (mod_sp_hold_music), Behemoth entrance | a lounge vibraphone phrase that loops once too often into a phone ring | vibes@0.00 vibes@0.36 vibes@0.72 vibes@1.08 vibes@1.44 vibes@1.80 .. |
| `mod_stg_bigband_sting` | swell | 2.8 |  | M7 (mod_sp_flypast, pellmell_falls), Chandelier entrance | a big-band hit and a trombone slide that rises | bigband@0.00 slide@0.50 |
| `mod_stg_engine_rev_brass` | dread | 3.0 |  | M8 (mod_sp_landing_barge), Grand Mower entrance | a low brass note under a pull-cord rev | brass@0.00 rev@0.30 rev@1.90 |
| `mod_stg_full_fanfare` | fanfare | 3.2 | yes | M9 coda (mod_sp_dam_gate) | the whole band, a kazoo against full brass, ending on a typewriter ding | bigband@0.00 tpt@0.60 kazoo@1.00 bigband@1.60 row:mod_typewriter_ding@2.30 |
| `mod_stg_full_fanfare_low` | dread | 3.4 | yes | Survival entrance (final_notice) | the same fanfare a fourth lower with the kazoo missing | bigband@0.00 tpt@0.70 bigband@1.70 sub@2.50 |

**Sci-Fi** (key of A)

| id | kind | length s | limiter bypass | used by | content | events (voice@t, first 6) |
|---|---|---|---|---|---|---|
| `sf_stg_klaxon` | comic | 2.0 |  | M1 (sf_sp_lunch_served) | a toy two-tone klaxon over a synth stab and a pffft of steam | klaxon@0.00 stab@0.10 pfft@1.40 |
| `sf_stg_magma` | swell | 2.6 |  | M2 (sf_sp_magma_hiccup) | a run of rising lava-lamp bloops under an analog brass-patch swell | bloop@0.00 bloop@0.30 bloop@0.60 bloop@0.90 bloop@1.20 pad@0.20 |
| `sf_stg_meltdown` | hit | 3.0 |  | M3 (sf_sp_meltdown_cafe) | a rising whine, one big synth hit, a descending cascade of glass shatters | whine@0.00 hit@0.90 cascade@1.00 |
| `sf_stg_blackout` | dread | 3.0 |  | M4 (sf_sp_rolling_blackout) | a lights-out power-down sweep, a sub drop and a held violet pad that thins to nothing | sweep@0.00 sub@0.70 pad@0.80 |
| `sf_stg_buzzkill` | comic | 2.2 |  | M5 (sf_sp_please_hold) | a descending power-down droop into a single hold-music vibraphone note and a polite ding | sweep@0.00 vibes@1.10 row:sf_bell@1.70 |
| `sf_stg_mech_steps` | dread | 3.0 |  | M6 (sf_sp_mech_stomp_reveal), Concierge Survival entrance (alias sf_stg_concierge_steps 2.2 s) | two footfall thumps with a servo whine and a hotel-bell ting | row:sf_mech_step_boom@0.00 row:sf_mech_step_boom@1.00 row:sf_servo_whine@0.40 row:sf_bell@2.00 |
| `sf_stg_awaken` | swell | 3.4 |  | M7 (sf_sp_hill_wakes), Hummock entrance | a low earth rumble, a rising warm pad, a glow-chime arpeggio | rumble@0.00 pad@0.50 arp@1.80 |
| `sf_stg_manta` | dread | 3.2 |  | M8 (sf_sp_noise_complaint), Manta entrance | a descending shush-noise sweep, a long sub, a violet theremin line that fades | shush@0.00 sub@0.30 theremin@0.80 |
| `sf_stg_finale` | fanfare | 3.4 | yes | M9 coda (sf_sp_hull_breach) | a huge synth chord, a theremin on top, a decompression whoosh into a bright major chord and a final bell | hit@0.00 theremin@0.20 whoosh@1.60 bigband@2.00 bell@2.80 |
| `sf_stg_rex_horn` | hit | 2.4 |  | Rex entrance in M3 and Survival | a bicycle-horn blat, a synth stab and a squeaky stilt creak | horn@0.00 stab@0.40 squeak@1.20 |
| `sf_stg_queen_rise` | dread | 3.6 |  | Queen reveal in M9 and Survival | a slow wet sub swell, an antler rattle and a tired sigh chord | sub@0.00 clank@1.20 clank@1.50 pad@2.00 |

**Voice vocabulary** (42 voices; the same names appear in the events):

| voice | definition |
|---|---|
| `tpt` | natural trumpet: saw + square 60/40, formant 1.1 kHz, 30 ms attack; args note(MIDI) dur [flat_cents] |
| `brass` | low brass: saw + 2nd harmonic -6 dB, low-pass 900 Hz, 60 ms attack; args note dur |
| `tuba` | tuba: saw low-passed 500 Hz, 80 ms attack; args note dur |
| `oboe` | wobbling oboe: saw through formant 1.3 kHz with 5.5 Hz vibrato +-30 cents; args note dur |
| `snare` | noise 1-7 kHz 90 ms decay plus 200 Hz body; args velocity |
| `tom` | sine 120 -> 80 Hz glide, noise click, decay 0.25 s; args note |
| `timp` | timpani: sine at note with 4 percent pitch drop, tau 0.6 s; args note |
| `kick` | sine 90 -> 45 Hz, tau 0.2 s |
| `cym` | noise 3-12 kHz exponential decay; args dur |
| `bell` | inharmonic partials x1 x2.76 x5.4 x8.93 (gains 1 .6 .35 .2), tau 1.8 s / 0.9 / 0.5 / 0.3; args note tau_scale |
| `creak` | noise through a swept resonator 200 -> 120 Hz; args dur |
| `thud` | sine 70 Hz tau 80 ms + noise click |
| `rumble` | noise low-passed 120 Hz with slow flutter; args dur |
| `sweep` | sine/noise sweep; args f0 f1 dur [noise] |
| `clar` | clarinet: square with 1.0 kHz low-pass; args note0 note1 dur (glide) |
| `bigband` | chord stab: saws on the listed notes through a 2.5 kHz low-pass, 25 ms attack, 0.4 s tau; args notes |
| `slide` | trombone slide: saw glide note0 -> note1 over dur, formant 900 Hz |
| `vibes` | vibraphone: sine 1x + 4x (-18 dB) with 5.5 Hz tremolo, tau 0.9 s; args note |
| `ring` | telephone ring: 440 + 480 Hz pair gated 40 ms on / 40 ms off x8; args none |
| `kazoo` | kazoo: saw 280-600 Hz through 1.4 kHz formant with 35 Hz tremolo; args note dur |
| `pad` | pad: detuned saws on the listed notes, 0.4 s attack, low-pass 1.2 kHz; args notes dur |
| `stab` | synth stab: 3 saws on notes + one octave up, 20 ms attack, tau 0.35 s; args notes |
| `arp` | glow-chime arpeggio: sine + 2x on listed notes at 90 ms spacing; args notes |
| `sub` | sine glide note0 -> note1 over dur with tau decay; args note0 note1 dur |
| `theremin` | theremin lead: sine with 5 Hz vibrato growing, portamento; args note0 note1 dur |
| `glass` | glass cascade: n decaying 3-8 kHz inharmonic pings (hann 5 ms) with random-seeded spacing; args n spacing |
| `whoosh` | noise 500 Hz-6 kHz swell/decay; args dur [reverse] |
| `bloop` | lava-lamp bloop: sine glide 200 -> 500 Hz, 120 ms; args note |
| `horn` | bicycle-horn blat sample row `sf_truck_horn`; args vol |
| `squeak` | stilt creak row `sf_stilt_creak`; args vol |
| `row` | a ledger family or alias played as-is (cue id, volume); the stinger render references the real rows so sound and stinger agree |
| `klaxon` | toy two-tone square 440/330 Hz, 250 ms alternation; args dur |
| `pfft` | steam puff: noise 2-8 kHz, 150 ms decay |
| `shush` | noise 2-7 kHz swell then decay; args dur |
| `cascade` | descending glass-shatter run; args n spacing |
| `whine` | rising sine 300 -> 1800 Hz with 8 Hz flutter; args dur |
| `hit` | big synth hit: saws on notes through 3 kHz, 15 ms attack, tau 0.5 s; args notes |
| `chime` | bell triad: three bell() partials on notes; args notes |
| `rev` | pull-cord rev: saw 60 -> 140 Hz low-passed 800 Hz; args dur |
| `fireworks` | rising whistle 800 -> 3000 Hz over 0.8 s then noise pop; args none |
| `partyhorn` | blow-out: saw 700 -> 420 Hz; args none |
| `clank` | metal clank: inharmonic partials with 150 Hz body |

### 3.6 Ambience loops (AU1)

Rules: 19 loops (7 + 6 + 6), each a single file `assets/audio/amb/<id>.mp3`, 24-30 s, mono 48 kbps, baked with a 2 s equal-power crossfade and a seam <= 0.02 FS (the `xfade` option of `build_sfx.py`); every era has at least 3 loops whose base layer is a real CC0 recording (Medieval 7, Modern 6, Sci-Fi 5 with a CC0 row; plan AU1 asks 3); the optional layers are one-shots placed by the ambience scheduler every 20-40 s (seeded `mulberry32`), not baked. The synth fallbacks are the existing recipes (`amb_wind`, `amb_water`, `amb_fire`, `amb_birds`, `amb_forest`, `amb_desert`) plus the new ones named in the table. Two descriptor lints guard the real recordings: no siren-like periodicity (autocorrelation peak at lags 0.3-3 s above 0.5 rejects the file) and no speech (spectral flatness < 0.1 over 300-3,400 Hz with a 4-8 Hz amplitude modulation rejects), because the traffic, pub and crowd sources are footage-like (`high-traffic-road-sounds`, `crowded-pub`, `tavern-0`) and are used only after a 900 Hz low-pass (`MURMUR_LP`).

W theme to ambience (the `amb` column of W 3.5.3 and the arena presets of W 3.9; an arena id match wins over its theme):

| W theme | ambience id | extra by arena |
|---|---|---|
| `med_meadow` | `med_amb_meadow` | `med_ford`: river layer; fete arenas: crowd murmur |
| `med_castle` | `med_amb_castle` | `med_siege_camp`: `med_amb_camp` |
| `med_village` | `med_amb_cloister` | `med_abbey`: bell scheduler every 25 s |
| `med_forest` | `med_amb_forest` | - |
| `med_moor` | `med_amb_moor` | `med_winter_fair`: fair crowd layer |
| `med_crag` | `med_amb_crag` | `med_dragon_pass`: coin-glint scheduler, dragon snore |
| `mod_field` | `mod_amb_field` | `mod_trench`: trench layers |
| `mod_water` | `mod_amb_quay` | harbour: chain clatter |
| `mod_city` | `mod_amb_city` | hold-music duck when the core is below 50 percent |
| `mod_industrial` | `mod_amb_yard` | dam: water spray |
| `mod_air` | `mod_amb_airfield` | rotor flyby one-shots |
| `mod_desert` | `mod_amb_desert_outpost` | sandstorm layer |
| `sf_moon` | `sf_amb_moon` | moonbase: dish motor |
| `sf_station` | `sf_amb_station` | reactor: coolant drip; alarm loop after the breach |
| `sf_neon` | `sf_amb_neon` | thunder on `ion_storm` |
| `sf_jungle` | `sf_amb_jungle` | hive: heartbeat; crash site: hull creaks |
| `sf_ice` | `sf_amb_ice` | aurora shimmer |
| `sf_ember` | `sf_amb_ember` | ion crackle |

**Medieval**

| ambience id (file assets/audio/amb/<id>.mp3) | W theme | arenas | base and layers | real source files | loop s | synth fallback |
|---|---|---|---|---|---|---|
| `med_amb_meadow` | med_meadow | med_tourney_field, med_ford, med_toll_bridge | crowd murmur, flags flapping, a distant out-of-tune band, birds; ford: running water and r | Gregor Quendel - Crowd Cheering Sounds - 10 - Ambience.mp3 (CC BY 4.0); amb_river.flac (CC BY 3.0); wind woosh | 30 | amb_wind + synth band |
| `med_amb_moor` | med_moor | med_beacon_moor, med_winter_fair | wind over heather, a distant curlew, low fog hush | wind1.wav (CC0 1.0); wind-01_0.flac (CC BY 3.0) | 30 | amb_wind + synth curlew |
| `med_amb_castle` | med_castle | med_castle_siege, med_moat_keep | wind in stone, banners, a distant chain creak, echo | wind woosh loop.ogg (CC0 1.0); hinter_pub_alt_-_shipyard.mp3 (CC0 1.0); winch - Marker #8.wav (CC0 1.0) | 30 | synth wind + echo |
| `med_amb_cloister` | med_village | med_abbey, med_village | doves, a distant single bell every 25 s, soft murmur; village: hens, a windmill creak, dis | Dark Forest Bird.wav (CC BY 4.0); forger_0.ogg (CC0 1.0); fire-1_0.ogg (CC0 1.0) | 30 | synth doves + shared bell |
| `med_amb_crag` | med_crag | med_dragon_pass | low wind, rumbling, lava crackle; distant dragon snore | fire-1.wav (CC0 1.0); qubodupFireLoop.ogg (CC BY 3.0); wind1.wav (CC0 1.0) | 24 | amb_fire + synth rumble |
| `med_amb_camp` | med_castle | med_siege_camp | hammering, ropes, murmur, a distant horse; pitch-barrel bubbling | blacksmithhammer.wav (CC0 1.0); cooking_without_cover_01_0.ogg (CC0 1.0); Tavern_0.ogg (CC0 1.0) | 30 | synth murmur + hammer |
| `med_amb_forest` | med_forest | med_greenwood | damp forest bed: birds, drips, a branch creak | amb_forest.flac (CC BY 3.0); atmosbasement.mp3_.flac (CC0 1.0) | 24 | synth birds + drips |

**Modern**

| ambience id (file assets/audio/amb/<id>.mp3) | W theme | arenas | base and layers | real source files | loop s | synth fallback |
|---|---|---|---|---|---|---|
| `mod_amb_field` | mod_field | mod_parade_yard, mod_hedgerow, mod_trench, mod_garden_centre | wind over grass, far lawnmower, birds, windsock flap (trench: planks creaking, a drip, a f | wind woosh loop.ogg (CC0 1.0); crickets_1.mp3 (CC0 1.0); atmosbasement.mp3_.flac (CC0 1.0); 3.ogg (CC0 1.0) | 30 | amb_wind + synth birds (existing recipes) |
| `mod_amb_quay` | mod_water | mod_bridge_gorge, mod_harbour | water (existing amb_water synth) + gulls far, rope creak, hull knock | Seaguall Hit 1.wav (CC0 1.0) | 24 | amb_water synth + synth gull |
| `mod_amb_city` | mod_city | mod_downtown | a low hum, far traffic as a toy murmur, a phone-line click, a lamp buzz at night | gatve Varniu_2.ogg (CC0 1.0); ambient_03.ogg (CC0 1.0) | 30 | synth hum + click |
| `mod_amb_yard` | mod_industrial | mod_rail_yard, mod_dam, mod_building_site | a far wagon clank, steam, a toy whistle once in a while | generator_loop.wav (CC0 1.0); machine_08.ogg (CC0 1.0) | 24 | synth steam + clank |
| `mod_amb_airfield` | mod_air | mod_airfield | wind, a PA murmur, a distant propeller, windsock flap | propeller_cartoon_loop.wav (CC0 1.0); wind woosh loop.ogg (CC0 1.0) | 24 | amb_wind + synth propeller |
| `mod_amb_desert_outpost` | mod_desert | mod_desert_outpost | dry wind, a creaking water tower, radar blip, a far dish motor | wind1.wav (CC0 1.0); qubodup-edev.flac (CC0 1.0) | 24 | existing amb_desert synth + blip |

**Sci-Fi**

| ambience id (file assets/audio/amb/<id>.mp3) | W theme | arenas | base and layers | real source files | loop s | synth fallback |
|---|---|---|---|---|---|---|
| `sf_amb_moon` | sf_moon | sf_moon_base, sf_crater_rim, sf_asteroid_dock | near-silence with a habitat vent hum, a far fan, a soft airlock tick | ambient_hum2_0.mp3 (CC BY 3.0); SFX SCI FI Computer room ambience_0.mp3 (CC0 1.0) | 30 | synth hum + tick |
| `sf_amb_station` | sf_station | sf_orbital_deck, sf_reactor_hall, sf_holo_range | vents, a ring-deck hum, a tick every few seconds, a window rattle (reactor: coolant drip a | fan_noise.wav (CC BY 3.0); dark factory.ogg (CC BY 3.0); shieldloop.wav (CC0 1.0) | 30 | synth hum |
| `sf_amb_neon` | sf_neon | sf_neon_city | rain on neon glass, a hover-traffic murmur, a sign buzz (mall: fountain, appliance hum, co | busy_cyberworld.ogg (CC0 1.0); rain_thunder_loop.wav (CC BY 3.0); crowd_shouting_0.ogg (CC0 1.0) | 30 | synth buzz |
| `sf_amb_jungle` | sf_jungle | sf_spore_jungle, sf_crash_site, sf_dome_garden | wet insects, drips, a frog-like bloop; hive: drips + slow heartbeat + far chitter; crash:  | crickets_1.mp3 (CC0 1.0); atmosbasement.mp3_.flac (CC0 1.0); squish_01_0.mp3 (CC0 1.0) | 30 | synth insects |
| `sf_amb_ice` | sf_ice | sf_glacier | wind, crystalline ticks, a cryo-vent hiss | wind woosh loop.ogg (CC0 1.0); freeze.wav (CC0 1.0) | 24 | synth wind + ticks |
| `sf_amb_ember` | sf_ember | sf_forge_world | a low bubbling rumble, ember crackle, a geyser hiss on the telegraph | qubodupFireLoop.flac (CC BY 3.0); LavaLoop.wav (CC BY 3.0) | 24 | amb_fire + synth rumble |

### 3.7 Processing recipes

#### 3.7.1 Pipeline

`decode (mono 44.1 kHz float) -> slice (seg / peak / on / win) -> high-pass / low-pass -> rate (pitch and speed) -> tail shaping -> trim silence -> max length cut -> fade -> soft limit -> peak normalise to -3 dBFS -> FLAC master -> MP3 (64 kbps mono, Xing header) -> pack`. Existing options of `tools/build_sfx.py`: `seg peak pre post on rise refr isodur rate lp hp max fout fin gain xfade layers notrim nolimit kbps`. **New options (AU1)**: `tail=[hold_s, tau_s]` (exponential tail), `win=<n>` (slice a run of n onsets), `rep=[n, gap_s]` (repeat), `bend=[semitones, curve]`, `exact=<s>`, `ring=[hz, decay_s]`, `loopbake=[window_s, xfade_s]`, `swell=[s, kind]`, `stack`, `scatter`, `formant`, `reverse`, `crush`, `comb`, `sub`, `rumble`, `reverb`, `delay`, `mix`. The catalogue of 142 recipe names the matrix uses is 3.7.5; every name has options, a kind and a note.

#### 3.7.2 Realism chain for guns (Modern and Sci-Fi small arms), tested

Specification: single shot `GUN_POP` = high-pass 160 Hz (2 poles), align on the first onset (-4 ms), keep 0.35 s, gain 1 for the first 40 ms then `exp(-(t-0.04)/0.06)`, 2 ms fade-in, 30 ms fade-out, soft limit, peak -3 dBFS. Cannon: high-pass 80 Hz, keep 0.9 s, hold 80 ms, tau 0.18 s. `build_sfx.py` form: `dict(on='iso', hp=160, max=0.35, tail=[0.04, 0.06], fout=0.03)`. Equivalent ffmpeg (tested on `gunshot_5.wav`, output 0.350 s, centroid 4,283 Hz, low-band share 0.04):

```
ffmpeg -i in.wav -ac 1 -ar 44100 -af "highpass=f=160:poles=2,atrim=start=<t_on-0.004>:duration=0.35,asetpts=PTS-STARTPTS,volume='if(lt(t,0.04),1,exp(-(t-0.04)/0.06))':eval=frame,afade=t=in:d=0.002,afade=t=out:st=0.32:d=0.03" out.wav
```

Measured on the 8 real recordings downloaded for this spec (numpy form of the chain; descriptors from `audiolib.descriptors`; t40 = time until the envelope falls 40 dB below its peak):

| recording | source s | t40 source -> output | centroid Hz source -> output | low-band share source -> output |
|---|---|---|---|---|
| gunshot_1.wav | 1.98 | 0.735 -> 0.200 | 698 -> 1,114 | 0.39 -> 0.11 |
| gunshot_5.wav | 2.21 | 0.615 -> 0.260 | 1,696 -> 4,451 | 0.08 -> 0.03 |
| gunshot_9.wav | 2.03 | 0.665 -> 0.265 | 851 -> 4,314 | 0.28 -> 0.04 |
| gunshot_14.wav | 1.89 | 0.490 -> 0.245 | 1,266 -> 3,862 | 0.27 -> 0.05 |
| gunshot_18.wav | 1.59 | 0.385 -> 0.240 | 667 -> 3,448 | 0.39 -> 0.03 |
| gunshot_24.wav | 1.44 | 0.855 -> 0.275 | 1,237 -> 3,450 | 0.20 -> 0.01 |
| lmg_fire01.mp3 | 1.92 | 1.065 -> 0.235 | 907 -> 1,847 | 0.06 -> 0.13 |
| cannon_fire_0.ogg (80 Hz, 0.9 s) | 3.58 | 1.330 -> 0.600 | 147 -> 353 | 0.88 -> 0.70 |

Result: tails fall to 0.20-0.275 s (a quarter to two thirds of the source, not a flat quarter: the acceptance is the absolute t40 <= 0.28 s, 4 `audit_sfx` template below), the low-band share of small arms falls to <= 0.13, the centroid rises 1.6-5x. The cannon stays low (the cannon family adds `TIN_TOP`, a round tin bonk, on top: the "tin bonk with a thump" of the bible); that is why the cannon template allows a 0.9 s length and a centroid below 1.2 kHz. These numbers are descriptor evidence, not listening.

#### 3.7.3 Sci-Fi pews and rail

`PEW_BURST3`: one laser (`laserRetro_000-002` of Kenney sci-fi-sounds, 0.24-0.28 s, high-pass 140 Hz), repeated 3 times at 70 ms spacing by `rep=[3, 0.07]`, tail shaped after the third, 0.25-0.30 s total. `RAIL`: `doomsday-laser` short and medium windows or `laserLarge` pitched down 4 st, a synth ring `ring=[2400, 0.9]` for a 1.2 s tail. Descriptor targets in 3.14.4.

#### 3.7.4 Synth recipes (CC0, deterministic; `tools/build_sfx.py synth:<name>` and `src/audio/synth.js RECIPES`)

| synth recipe (`synth:<name>` in sfx_spec.py) | max s | definition (deterministic numpy, 44.1 kHz, seed = fnv(name)) |
|---|---|---|
| `airlock_hiss` | 1.2 | noise 1.5-9 kHz swell 0.1 s, hold 0.5 s, decay tau 0.4 s, 1.2 s |
| `baa` | 0.7 | saw 330 -> 280 Hz with 14 Hz vibrato and formant 700 Hz, ring-modulated at 180 Hz, 0.7 s |
| `bell` | 1.9 | bell voice at 659 Hz, tau 1.6 s, 1.9 s (hotel bell) |
| `blink` | 0.25 | fwip: sine 600 -> 2400 Hz 90 ms then pop(), 0.25 s |
| `blip` | 0.1 | sine 880 Hz 60 ms, 8 ms attack, tau 30 ms |
| `booth_chirp` | 0.09 | two sine pips 1760 / 2349 Hz 30 ms each with a 10 ms gap, then a 20 ms noise click, total 90 ms |
| `brass_blip` | 0.1 | saw 392 Hz through a 1.1 kHz formant, 80 ms, 10 ms attack, tau 40 ms |
| `bubble_pop` | 0.35 | sine 500 -> 150 Hz 40 ms plus glass() tinkles 3x, 0.35 s |
| `bullet_zip` | 0.1 | sine sweep 2.2 -> 5.5 kHz over 80 ms (exponential), 10 ms attack, -24 dB 3rd harmonic, 3 variants at 1.0x / 1.12x / 0.9x |
| `cart_squeak` | 0.7 | sine 900 -> 780 Hz glide over 0.5 s with 30 Hz tremolo and noise -24 dB, 0.7 s |
| `clack` | 0.15 | two click impulses 38 ms apart (2 ms noise, band-passed 1.2-5 kHz), 0.15 s |
| `click` | 0.08 | one click impulse 2 ms, band-passed 1.5-6 kHz, tau 15 ms, 0.08 s |
| `ding` | 0.9 | bell voice: partials 1x 2.76x tau 0.6 s / 0.25 s, 880 Hz, 0.9 s |
| `dome_crack` | 0.7 | a sharp crack (noise 3-10 kHz tau 15 ms) then glass(), 0.7 s |
| `dragon_sniff` | 0.6 | noise 0.4 s rising 300 Hz -> 3 kHz band-pass inhale, then a 30 ms wet click (decaying sine 700 Hz), 0.6 s |
| `earth_rumble` | 2.2 | noise low-passed 90 Hz with 0.8 Hz flutter, swell 0.6 s, 2.2 s |
| `emp` | 1.2 | sine 55 Hz thoom tau 0.3 s plus noise fizz 2-8 kHz tau 0.2 s then sweep 900 -> 120 Hz, 1.2 s |
| `firework` | 1.4 | whistle() rising 800 -> 3000 Hz over 0.8 s then pop() and a glass() tail, 1.4 s |
| `fuse_fizz` | 0.9 | band-passed noise 3-8 kHz with 40 Hz amplitude flutter, 0.9 s, ends with a 30 ms pop |
| `gallop_build` | 2.6 | hoof pattern: 4 beats per second Poisson-free comb of 40 ms noise thumps, low-passed 200 Hz, gain ramp -20 -> 0 dB over 2.0 s, rate variants 0.9 and 1.12 |
| `gas_hiss` | 1.1 | noise 2-9 kHz amplitude 0 -> 1 over 0.15 s hold 0.5 s decay 0.4 s, 1.1 s |
| `geyser` | 1.5 | noise 400 Hz-4 kHz swell 0.6 s hold 0.4 s decay 0.5 s, 1.5 s |
| `glass` | 0.6 | six decaying pings 3-8 kHz inharmonic, random spacing 15-60 ms, 0.6 s |
| `gloop` | 0.5 | sine glide 260 -> 90 Hz over 0.25 s, tau 0.12 s, plus a 30 ms noise burst, 0.5 s |
| `goo` | 0.6 | sine 220 -> 90 Hz glide 120 ms with noise 300-1500 Hz, burbling at 12 Hz, 0.6 s |
| `gull` | 0.8 | two FM sweeps 1.2 -> 2.4 kHz with 18 Hz vibrato, 0.7 s, low-passed 4 kHz |
| `gun_crack` | 0.6 | noise 2-9 kHz tau 25 ms plus a 0.5 s ring: sine 2.1 kHz tau 0.22 s (-14 dB), high-passed 160 Hz, 0.6 s |
| `gun_pop` | 0.3 | noise 1-6 kHz 4 ms attack exp decay tau 45 ms, plus a tin resonator sine 2.4 kHz tau 30 ms (-9 dB), high-passed 160 Hz, 0.30 s |
| `hold_vibes` | 2.8 | vibraphone voice: sine 1x + 4x (-18 dB) with 5.5 Hz tremolo, decay tau 0.9 s; 4 notes (A4 C5 E5 D5) at 84 bpm, 2.8 s (the stinger voice) |
| `hull_breach` | 1.6 | glass() then a decompression whoosh (noise swell 0.3 s then fall), 1.6 s |
| `hum_bed` | 6.0 | warm hum 90-140 Hz with 0.7 Hz flutter, 2nd harmonic -9 dB, low-passed 600 Hz, 6 s seamless loop |
| `kazoo_blat` | 0.4 | saw 280 Hz through a 1.2 kHz band-pass with 35 Hz tremolo, nasal formant 1.4 kHz, 0.35 s, pitch fall 12 percent |
| `kettle` | 1.2 | sine 1650 Hz with +-3 percent slow vibrato, 1.2 s, amplitude attack 0.2 s, +noise -26 dB |
| `klaxon_two_tone` | 1.0 | square 440 / 330 Hz alternating every 250 ms for 1.0 s through a 2.5 kHz low-pass; toy two-tone, never a siren sweep |
| `lava_bloop` | 0.25 | sine 150 -> 420 Hz glide 140 ms with 8 percent noise, 0.25 s |
| `leaf_rustle` | 1.2 | noise 3-9 kHz, 0.8 Hz amplitude flutter, -24 dB, 1.2 s |
| `leathery_flap` | 0.8 | low-passed noise 300 Hz amplitude-modulated by a 2.5 Hz half-sine, 0.8 s, two rate variants |
| `lock_line` | 1.1 | sine 600 -> 2400 Hz exponential over EXACTLY 1.100 s, amplitude -26 dB, 10 ms fades |
| `mg_ratchet` | 0.4 | three gun_pop transients 70 ms apart plus 14 Hz ratchet clicks band-passed 1.5-4 kHz, 0.4 s |
| `oil_sizzle` | 1.1 | noise 3-10 kHz with 2 kHz crackle impulses (Poisson 40/s), 1.1 s, decay tau 0.5 s |
| `orbital` | 2.6 | saw 60 -> 400 Hz rising 2.0 s with 10 Hz countdown ticks, 0.15 s silence, then sub 50 Hz thoom plus noise burst, 2.6 s |
| `pa_chime` | 1.2 | two bell voices 784 Hz then 659 Hz (falling third), 1.2 s |
| `pa_squeal` | 0.12 | sine 3.1 kHz, 120 ms, 8 ms attack, exponential decay |
| `paper_rustle` | 0.5 | band-passed noise 2-8 kHz with 4-7 crackle impulses (3 ms), amplitude envelope 0.5 s |
| `party_horn` | 0.6 | saw 700 -> 420 Hz over 0.6 s through a 1.8 kHz low-pass, 40 Hz flutter |
| `pew` | 0.25 | saw 2400 -> 400 Hz exponential glide 0.1 s, 3 ms attack, plus thump sine 120 Hz tau 40 ms, 0.25 s |
| `pin_thunk` | 0.2 | decaying sine 180 Hz tau 25 ms plus 4 ms noise click, 0.2 s |
| `plasma` | 0.5 | sine 180 -> 520 Hz wobble 0.15 s then noise sizzle 0.25 s, 0.5 s |
| `pole_in_soil` | 0.35 | decaying sine 90 Hz tau 60 ms plus noise burst 20 ms low-passed 700 Hz, 0.35 s |
| `pop` | 0.25 | noise 0.5-5 kHz tau 25 ms plus sine 600 -> 200 Hz glide 30 ms, 0.25 s |
| `popcorn` | 1.0 | a handful of pop() hits at random 40-180 ms spacing, 1.0 s |
| `power_down_hum` | 2.0 | hum 120 Hz + 240 Hz falling to 40 Hz over 2.0 s with 3 Hz flutter, low-passed 800 Hz |
| `puff` | 0.3 | noise 300-1800 Hz swell 20 ms then tau 80 ms, 0.3 s |
| `pull_cord` | 0.9 | three ratchet clicks at 70 ms then a 350 ms rev (saw 60 -> 110 Hz low-passed 800 Hz) |
| `rail` | 1.2 | zip: sine 3000 -> 800 Hz 60 ms, thk 70 Hz thud, ZZT noise 4 kHz 30 ms, ring sine 2.4 kHz tau 0.9 s, 1.2 s |
| `rail_snap` | 0.5 | noise 2-8 kHz tau 12 ms plus ring sine 1.8 kHz tau 0.25 s, 0.5 s |
| `rain_hush` | 3.0 | noise 1-8 kHz -22 dB with 0.3 Hz amplitude swell, 3.0 s, equal-power seam |
| `ratchet_loop` | 2.6 | noise clicks 4 ms at 14 Hz, band-passed 1.5-4 kHz, alternating gain 1 / 0.7, exactly 2.600 s seamless |
| `reversing_beep` | 1.0 | square 1.0 kHz, 0.2 s on / 0.2 s off x3, low-passed 3 kHz (a real alarm is forbidden) |
| `ring` | 1.0 | telephone ring: 440 + 480 Hz pair gated 40 ms on / 40 ms off x8, 1.0 s |
| `rivet` | 0.55 | six clack() hits 70 ms apart, 0.55 s |
| `scan_ring` | 0.4 | sine 1.76 kHz 80 ms with a 3 ms attack, tau 60 ms, 0.4 s |
| `sewing_machine_clatter` | 1.0 | clack() train at 11 Hz with alternating gain, low-passed 3 kHz, 1.0 s loop-safe (the runtime tread layer under the recorded engine) |
| `shell_whistle` | 2.2 | sine sweep 900 -> 2600 Hz over EXACTLY 2.200 s (exponential), amplitude ramp 0.1 -> 1 (linear), 6 Hz vibrato +-1.5 percent, 20 ms Hann end; three timbres (pure sine, +2nd harmonic -9 dB, +noise -20 dB); the Medieval set is the 2nd-harmonic timbre filtered by a 3 kHz low-pass for a wooden whistle |
| `shimmer` | 1.0 | sparkle: sines 2.5-8 kHz random pings with an upward bend, airy noise 0.8 s, 1.0 s |
| `sizzle` | 1.1 | noise 3-10 kHz with 1.5 kHz crackle impulses (Poisson 40 per s), 1.0 s |
| `slide_up` | 1.0 | reversed slide whistle: sine 300 -> 1800 Hz exponential glide over 0.8 s with 5 Hz vibrato, short 0.1 s release, 1.0 s |
| `sneeze` | 0.5 | inhale noise 0.15 s rising then burst noise 1-5 kHz 0.12 s, 0.4 s |
| `sneeze_synth` | 0.5 | noise burst 0.12 s band-passed 1-5 kHz after a 0.15 s inhale (rising noise), 0.5 s |
| `sonic_shush` | 0.7 | noise 3-8 kHz, 90 ms attack, 0.6 s decay, centre sliding 4 -> 6 kHz |
| `splash_big` | 1.3 | noise 200 Hz-5 kHz swell 80 ms then tau 0.4 s plus sine 120 Hz tau 0.2 s, 1.2 s |
| `splat` | 0.3 | noise 300-2500 Hz tau 60 ms plus sine 180 Hz tau 40 ms, 0.3 s |
| `squeak` | 0.25 | sine 1.6 kHz -> 2.2 kHz glide with 25 Hz tremolo, 0.25 s |
| `squelch` | 0.08 | noise 800-4500 Hz 80 ms with a 3 ms click at the start |
| `stamp` | 0.25 | sine 110 Hz tau 70 ms plus noise 1 kHz low-pass 25 ms, 0.25 s |
| `steam_sigh` | 1.2 | noise 1-6 kHz amplitude 0 -> 1 over 80 ms then exponential decay tau 0.35 s, 1.2 s |
| `stilt_creak` | 0.7 | sine 700 -> 520 Hz glide 0.6 s with 28 Hz tremolo and noise -22 dB, 0.7 s |
| `sub_boom` | 1.2 | sine 50 -> 32 Hz over 0.9 s, amplitude decay tau 0.5 s, 1.2 s (the dragon sub layer) |
| `tape_unroll` | 1.0 | ratchet clicks accelerating 6 -> 20 Hz over a paper-noise bed, 1.0 s |
| `tick` | 0.05 | sine 2.2 kHz 6 ms with a 1 ms attack, 0.05 s |
| `titan_roar` | 2.5 | saw 55 -> 40 Hz with formant 400 Hz and noise -20 dB, 2.5 s |
| `tower_buzz` | 2.0 | 100 Hz saw through a 600 Hz low-pass, gated at 1 Hz, 2.0 s |
| `toy_bugle` | 0.5 | saw 392 -> 370 Hz over 0.5 s, formant 1.3 kHz, 40 ms attack (flat toy bugle) |
| `truck_horn` | 0.5 | saw 196 Hz + 247 Hz through a 1.2 kHz low-pass, 0.5 s |
| `trumpet_crack` | 0.6 | saw 466 Hz through formant 1.1 kHz, 80 ms attack, pitch drop 5 percent over 0.3 s, 0.6 s |
| `volley_flutter` | 0.9 | noise 1-4 kHz amplitude-modulated by 40 Hz comb with jitter, 0.9 s, gain ramp -12 -> 0 dB |
| `water_rush` | 1.1 | noise -30 dB hush 0.3 s, then band-passed noise 200 Hz-4 kHz swell over 0.8 s |
| `whisper` | 0.9 | noise 2-7 kHz, attack 0.1 s, decay tau 0.25 s, 0.9 s (a breath, no speech formants) |
| `whistle` | 0.5 | sine 1.4 kHz -> 1.9 kHz glide with 6 Hz vibrato, 0.4 s |
| `whoosh` | 0.8 | noise 400 Hz-6 kHz swell 0.15 s then decay tau 0.25 s, 0.8 s |

Every synth-only family also registers `SYNTH_REASONS[cue]` (`tests/audio/synth_reasons.mjs`) with the reason in the "Honest shortfalls" table; the coverage test fails on a synth-only family without a reason.

#### 3.7.5 Recipe catalogue (generated)

| recipe | kind | ledger category | build_sfx options | what it does |
|---|---|---|---|---|
| `GUN_POP` | slice | gunshot | on=iso hp=160 max=0.35 tail=[0.04,0.06] fout=0.03 gain=0 | single shot; high-pass 160 Hz; tail shaped so t(-40 dB) <= 0.28 s (measured on 6 real shots: 0.20-0.275 s from |
| `GUN_POP_BURST3` | slice | gunshot | on=0 win=3 hp=160 max=0.55 tail=[0.3,0.06] fout=0.04 | a run of three onsets from a session, each round kept, tail shaped after the third |
| `PEA_POP` | chain | gunshot | rate=1.26 hp=400 max=0.2 tail=[0.02,0.04] fout=0.02 lp=9000 | toy double-barrel trigger click pitched +4 st: the cap-gun / pea palette |
| `CORK_EDGE` | layer | gunshot | gain=-9 hp=1500 max=0.08 | cork-edge layer mixed under every GUN_POP at -9 dB (not a row of its own) |
| `MG_BURST3` | slice | gunshot | on=0 win=3 hp=160 max=0.4 tail=[0.25,0.05] fout=0.03 | three-round typewriter rattle |
| `TYPEWRITER_LAYER` | layer | gunshot | gain=-10 hp=800 max=0.4 | typewriter clack under every burst (mixed at build time) |
| `GUN_CRACK` | slice | gunshot | on=iso hp=160 max=0.6 tail=[0.08,0.14] fout=0.05 | sniper: tail kept to 0.5 s (cap 0.6 s), the one long gun |
| `BOLT_CLACK` | layer | gunshot | gain=-6 hp=500 max=0.2 delay=0.55 | bolt clack appended 0.55 s after the crack |
| `ZIP_PITCH` | chain | gunshot | bend=[12,rise] hp=900 max=0.11 tail=[0.0,0.04] fout=0.02 | near-miss zip: a Kenney metal impact pitched up 9-14 st with a rising bend, 60-110 ms |
| `CLACK_TRIM` | slice | clack | on=strongest hp=300 max=0.3 tail=[0.05,0.07] fout=0.03 | magazine slap / bolt clack, strongest onset of the handling clip, readable at 35 u |
| `PIN_THUNK` | chain | impact | lp=600 hp=60 max=0.25 tail=[0.02,0.05] fout=0.03 | low-passed wood tap = stationery thunk |
| `CANNON_BONK` | slice | explosion | on=0 hp=80 max=0.9 tail=[0.08,0.18] fout=0.1 | cannon under a round tin top layer (TIN_TOP) |
| `TIN_TOP` | layer | explosion | gain=-8 hp=500 max=0.4 | round tin bonk layered over thumps and chatter |
| `ROCKET_WHOOSH` | slice | explosion | seg=0 max=1.2 hp=200 fout=0.2 | first 1.2 s of the launch |
| `WHISTLE_LAYER` | layer | whistle | gain=-12 hp=1500 max=2.2 lp=7000 | air-rush layer under the synthesised shell whistle |
| `BLAST_S` | slice | explosion | on=0 hp=100 max=1.0 tail=[0.05,0.12] fout=0.08 | balloon-pop attack plus CYMBAL_TAIL (-14 dB) |
| `BLAST_M` | slice | explosion | on=0 hp=80 max=1.6 tail=[0.1,0.25] fout=0.12 | fuller whoomp, tails cut to a quarter |
| `BLAST_L` | slice | explosion | on=0 hp=60 max=2.4 tail=[0.2,0.45] fout=0.2 | cartoon boom with a crater thud, never a film explosion |
| `CYMBAL_TAIL` | layer | explosion | gain=-14 hp=2500 max=0.9 | bell/plate filtered into a cymbal tail under small blasts |
| `TINK` | slice | impact | on=strongest rate=1.19 hp=1200 max=0.3 tail=[0.02,0.06] fout=0.03 | bright tink pitched +3 st, the loudest small sound (class tink) |
| `BONK` | slice | impact | on=strongest rate=0.84 lp=3500 hp=90 max=0.45 tail=[0.05,0.09] fout=0.05 | lower thud with a tin rattle for side and rear hits |
| `HELMET_BONK` | slice | impact | on=strongest hp=250 max=0.5 tail=[0.05,0.1] fout=0.05 | tin-hat ring |
| `DAZED_DING` | chain | impact | rate=0.84 max=0.8 fout=0.1 | dazed ding, pitched down 3 st |
| `LID_POP` | slice | impact | on=0 hp=150 max=0.25 fout=0.03 | machine knock-out lid pop |
| `BLIP` | slice | ui | seg=0 max=0.25 fout=0.03 | amber blip while armed |
| `BOING` | slice | impact | seg=0 max=0.5 fout=0.08 | cartoon boing on mine trigger |
| `LOOP_BAKE` | loop | engine_loop | loopbake=[6.0,0.4] hp=60 lp=6000 fout=0 notrim=True | steady 6 s window baked into a seamless loop (seam <= 0.02 FS, periodicity >= 0.5 for engine layers) |
| `FLYBY` | slice | engine_loop | peak=0 pre=2.0 post=2.5 bend=[-2,doppler] max=4.5 fout=0.4 | flyby window around the loudest approach with a baked Doppler glide |
| `SQUELCH_80MS` | slice | ui | seg=0 win=0 max=0.08 hp=800 lp=4500 fout=0.01 | band-passed noise burst with a click, 80 ms |
| `STAMP` | slice | ui | on=0 max=0.3 hp=80 fout=0.04 | rubber-stamp thud |
| `CLICK` | slice | ui | on=0 max=0.12 fout=0.01 | pen click |
| `TYPEWRITER` | slice | ui | on=0 max=0.5 fout=0.05 | typewriter ding path |
| `DING_SHORT` | slice | ui | on=0 max=0.9 fout=0.1 | short bell ding |
| `KETTLE` | chain | whistle | rate=1.12 max=1.6 fout=0.15 | steam whistle pitched +2 st and shortened |
| `RING` | slice | ui | on=0 max=1.6 fout=0.1 | phone ring |
| `WHISTLE` | slice | whistle | seg=0 max=0.5 fout=0.05 | coach whistle |
| `POP` | slice | impact | on=0 max=0.3 fout=0.03 | balloon / confetti / cork pop |
| `SQUEAK_MINOR` | chain | impact | rate=0.94 max=0.8 fout=0.1 | squeak in a minor key (pitched to a flat third) |
| `REV` | slice | engine_loop | seg=0 max=1.6 fout=0.2 | engine rev |
| `GLASS_POP` | slice | impact | on=0 hp=500 max=0.6 fout=0.05 | glass pop |
| `SNEEZE` | slice | voice | on=0 max=1.8 fout=0.1 | sneeze, only if the descriptor lint finds one onset |
| `STEP` | slice | step | seg=0 max=0.25 fout=0.02 | one step cut by segment |
| `STEP_HARD` | slice | step | seg=0 hp=300 max=0.22 fout=0.02 | hard-floor tick from a soft step (high-passed) |
| `PEW_BURST3` | slice | laser | on=0 win=1 rep=[3,0.07] hp=140 max=0.3 tail=[0.14,0.05] fout=0.03 | single laser repeated three times at 70 ms spacing (burst built at build time), 0.25-0.30 s total |
| `CRACKLE_LAYER` | layer | laser | gain=-14 hp=2000 max=0.3 | electric crackle layer |
| `VALET_BEAM` | chain | laser | hp=900 lp=7000 max=0.3 fout=0.04 | thin zzzt for the tray laser |
| `RIVET_CHATTER6` | slice | laser | on=0 win=6 hp=140 max=0.55 tail=[0.4,0.05] fout=0.04 | six-round tk-tk rattle |
| `ROCKET_FSSH` | slice | explosion | seg=0 hp=250 max=0.9 fout=0.15 | fsssh-pop |
| `RAIL` | slice | laser | on=0 hp=70 max=1.2 ring=[2400,0.9] fout=0.2 | zip + thk-ZZT + 1.2 s ringing tail |
| `LOB` | slice | laser | seg=0 max=0.6 bend=[-4,wobble] fout=0.1 | wobbly bloop on launch |
| `LOB_IMPACT` | slice | goo | on=0 hp=120 max=0.7 fout=0.1 | wet sizzle + crump |
| `SHIELD_BLOOP` | slice | shield | on=0 hp=300 max=0.4 tail=[0.03,0.08] fout=0.05 | glassy bloop-tink; runtime pitch falls from left/cap |
| `SHIELD_TINK` | layer | shield | gain=-9 hp=2500 max=0.3 | glass-bell tink layer |
| `SHIELD_FALL` | slice | shield | on=0 bend=[-5,fall] max=0.5 fout=0.1 | pitch-falling hum body |
| `POP_SHATTER` | slice | shield | on=0 hp=150 max=0.5 fout=0.05 | fat satisfying bwoop-shatter |
| `SHATTER_TINKLES` | layer | shield | gain=-12 hp=3000 max=0.4 rep=[3,0.06] | three hex-glass tinkles under the pop |
| `RECHARGE_SWEEP` | slice | shield | on=0 max=1.2 fout=0.08 | rising tick-sweep |
| `RECHARGE_TING` | slice | shield | on=0 max=0.6 fout=0.1 | small ting when full |
| `EMP_THOOM` | slice | fx | on=0 hp=60 max=1.2 fout=0.15 | low thoom plus fizz |
| `POWERDOWN` | slice | fx | on=0 max=1.4 fout=0.15 | descending whirr and one sad pdddt |
| `POWERDOWN_DROOP` | layer | fx | gain=-8 max=1.2 bend=[-12,fall] | droop layer |
| `SHIMMER` | slice | shield | on=0 max=1.0 fout=0.15 gain=-4 | airy sparkle swish |
| `FWIP` | chain | laser | rate=1.19 hp=500 max=0.25 fout=0.03 | origin fwip, pitched +3 st |
| `ROUND_POP` | slice | shield | on=0 max=0.2 fout=0.02 | rounder pop at the blink target |
| `MECH_STEP` | slice | mech | on=0 rate=0.78 hp=40 max=1.0 tail=[0.12,0.22] fout=0.15 | weighty BOOM-clank, sub 40 Hz thump |
| `TOPPLE` | slice | mech | on=0 max=3.0 fout=0.4 | long collapse |
| `TOPPLE_BELL` | layer | mech | gain=-8 rate=0.8 max=2.3 | hotel bell on the topple |
| `ORBITAL_BOOM` | slice | explosion | on=0 hp=45 max=2.4 tail=[0.3,0.5] fout=0.3 | KRAAA-THOOM with a crater thud |
| `CHARGE_2S` | slice | fx | on=0 exact=2.0 fout=0.0 | charge cut to EXACTLY 2.0 s (telegraph contract) |
| `COUNTDOWN_TICKS` | chain | ui | rate=1.3 hp=900 max=0.15 fout=0.02 | robotic-count ticks, pitch-chopped; never a voice |
| `SPLORP` | slice | goo | on=0 max=0.8 fout=0.1 | happy splorp |
| `CHITTER` | slice | goo | on=0 max=0.6 fout=0.08 | chitter |
| `TRILL` | slice | goo | on=0 max=0.9 fout=0.1 | trill |
| `RING_MOD_LIGHT` | chain | goo | rate=1.15 ring=[180,0.0] max=1.0 fout=0.1 | light ring modulation for the not-a-goat baa |
| `HOTEL_BELL` | slice | bell | on=0 max=1.9 fout=0.2 | hotel bell |
| `GEYSER_LOW` | chain | goo | rate=0.72 lp=2500 max=1.6 fout=0.25 | rising steam roar |
| `SOFT_PUFF` | slice | goo | on=0 lp=3000 max=0.3 fout=0.05 | soft cloud pop |
| `SIZZLE` | slice | goo | seg=0 hp=1500 max=1.2 fout=0.2 | acid / oil sizzle |
| `STEP_DUST` | chain | step | lp=2200 max=0.25 | low-passed gravel = dust step |
| `STEP_GOO` | chain | step | lp=1800 rate=0.9 max=0.3 | squelch step |
| `MURMUR_LP` | loop | amb | lp=900 loopbake=[24.0,2.0] fout=0 | crowd / traffic recording low-passed at 900 Hz and level-ridden to a murmur (footage feel removed by the filte |
| `AMB_BAKE` | loop | amb | loopbake=[30.0,2.0] fout=0 kbps=48 | ambience bake: 24-30 s window, 2 s equal-power cross-fade tail into head, seam <= 0.02 FS |
| `AMB_SLOW` | loop | amb | rate=0.5 loopbake=[30.0,2.0] fout=0 kbps=48 | slowed 0.5x then baked |
| `AMB_SPARSE` | layer | amb | gain=-6 max=2.5 | sparse one-shot placed every 20-40 s on the bed by the runtime ambience scheduler (not baked) |
| `CLANG_CUT` | slice | impact | on=strongest hp=150 max=0.6 tail=[0.1,0.18] fout=0.08 | bright clang with a half-second ring; never a clean slice |
| `RING_LAYER` | layer | impact | gain=-14 max=0.5 hp=800 | half-second ring under heavy plate |
| `CRUNCH_CUT` | slice | impact | on=strongest lp=3000 hp=80 max=0.5 tail=[0.08,0.12] fout=0.06 | dull mace strike |
| `TIN_RATTLE` | layer | impact | gain=-9 hp=900 max=0.6 | tin rattle on top: a bucket on a bucket |
| `SPLINTER` | slice | destruction | on=0 hp=400 max=0.5 tail=[0.05,0.1] fout=0.05 | wood splinter |
| `SCRAPE` | slice | impact | seg=0 max=0.8 hp=500 fout=0.15 | metal scrape tail |
| `CROWD_OOH_LATE` | chain | voice | rate=1.0 bend=[0,none] delay=0.35 max=1.2 fout=0.2 formant=[-2,0,2] | crowd ooh from one recording at formant shifts -2/0/+2 st, delayed 0.35 s |
| `CROWD_AWW` | chain | voice | rate=0.5 formant=[-2,-3,-4] max=1.4 fout=0.25 | crowd aww: ooh pitched down 2/3/4 st at 0.5x speed (declared processed) |
| `GALLOP_BUILD` | loop | beast | loopbake=[6.0,0.5] swell=[2.0,rise] hp=50 fout=0 | gallop loop with a 2 s swell baked in (the audible tell) |
| `HOOF_HIT` | slice | beast | on=0 hp=80 rumble=[60,0.3] max=0.5 fout=0.05 | hoof hit with a 60 Hz ground rumble layer |
| `POLE_THUNK` | chain | impact | lp=600 hp=60 tail=[0.12,0.08] max=0.5 fout=0.05 | pole butt into soil |
| `TIMBER_GROAN` | layer | impact | rate=0.84 gain=-6 max=0.9 | groan tail appended after the thunk |
| `VOLLEY_FLUTTER` | slice | volley | peak=0 pre=0.3 post=0.7 stack=[3,0.06] max=1.2 fout=0.2 | whisper-flutter: passby windows stacked at 40-90 ms offsets |
| `PATTER` | chain | volley | scatter=[10,0.6] max=0.7 fout=0.1 | 8-14 short wood hits scattered over 0.6 s |
| `SNAP_SHORT` | slice | crack | on=strongest hp=500 max=0.35 tail=[0.03,0.06] fout=0.03 | mechanical snap and a short whip: the only dry sound in the palette |
| `RATCHET_LOOP` | loop | clack | loopbake=[2.6,0.1] hp=300 fout=0 | ratchet clicks for the 2.6 s reload tell |
| `WINCH_CREAK` | slice | siege | seg=0 hp=60 max=3.0 fout=0.3 | winch / timber creak |
| `WHUMP` | slice | siege | on=0 lp=220 hp=35 max=1.2 tail=[0.1,0.3] fout=0.2 | sling-release thwump |
| `WOOD_BOOM` | chain | siege | rate=0.7 lp=700 hp=40 max=1.0 tail=[0.1,0.22] fout=0.15 | cannon-hit-wall re-pitched into a wooden knock |
| `IRON_TWANG` | slice | siege | on=0 hp=300 max=0.9 fout=0.15 | iron bands twanging after the boom |
| `CASCADE` | slice | destruction | on=0 hp=50 max=3.0 tail=[0.5,0.8] fout=0.4 | rumble, cascade of rocks, dust hiss, a last single stone |
| `DUST_HISS` | layer | destruction | gain=-12 hp=3000 max=1.2 | dust hiss layer |
| `LAST_STONE` | layer | destruction | gain=-8 delay=2.2 max=0.2 | a last single stone |
| `CLOTH_WHIP` | chain | foley | hp=800 lp=4000 max=0.4 fout=0.05 | cloth whip band-passed 0.8-4 kHz |
| `CLOTH_SNAP` | slice | foley | on=0 max=0.3 fout=0.04 | banner raise snap |
| `POLE_CLATTER` | slice | impact | on=0 hp=200 max=0.7 fout=0.08 | pole clatter |
| `BELL_SMALL` | slice | bell | on=0 max=2.0 fout=0.3 | small bell |
| `BELL_MEDIUM` | slice | bell | on=0 max=3.5 fout=0.5 | medium bell: one strike window of a 26 s file |
| `BELL_LARGE` | slice | bell | on=0 max=5.0 fout=0.8 | large bell: bright toll |
| `BELL_HUGE` | slice | bell | on=0 hp=60 max=7.0 fout=1.0 | huge bell: widened toll |
| `BELL_CRACK` | chain | bell | crush=8 comb=3 max=3.5 fout=0.5 | cracked bell: bit-crush + 3 dB comb (plague stinger) |
| `ROAR_LOW` | slice | beast | seg=0 rate=0.84 hp=40 max=2.8 fout=0.4 sub=[45,0.5] | dragon roar: troll / monster roar with a 45 Hz sub layer, limiter bypass at runtime for the roar only |
| `ROAR_FAR` | chain | beast | lp=500 reverb=0.6 max=2.2 fout=0.5 | far dragon roar low-passed at 500 Hz |
| `WHOMP` | slice | beast | on=0 rate=0.9 hp=60 max=1.2 fout=0.2 | leathery wing whomp |
| `WHOOMPH` | slice | fx | on=0 hp=60 max=1.4 fout=0.2 | fire whoomph |
| `WHOOSH` | slice | fx | seg=0 hp=120 max=1.2 fout=0.2 | fire whoosh |
| `STEP_ARMOR` | slice | step | seg=0 max=0.2 fout=0.02 | metal-plate step |
| `STEP_MUD` | slice | step | seg=0 lp=2500 max=0.3 fout=0.03 | mud step |
| `GLINT` | chain | ring | rate=1.19 lp=9000 gain=-12 max=0.5 fout=0.1 | ambient coin sparkle |
| `JINGLE` | slice | ring | seg=0 max=1.2 fout=0.15 | purse jingle |
| `SNEEZE_POLITE` | chain | voice | rate=1.0 bend=[3,none] max=1.8 fout=0.1 | polite sneeze at +3 and -3 st |
| `FOAM_BONK` | slice | impact | on=0 lp=2500 max=0.35 fout=0.05 | foam bonk |
| `TRUMPET_FLAT` | chain | voice | rate=0.94 max=1.1 fout=0.05 | flat trumpet crack pitched -1 st |
| `HORN_LATE` | slice | horn | on=0 hp=80 max=4.0 fout=0.5 | war horn blast window of 4 s (arrives a beat late at runtime: delay 0.5 s) |
| `GROAN_LOW` | chain | beast | rate=0.71 hp=50 max=2.0 fout=0.3 | low offended groan, pitched -6 st |
| `CHAIN_RATTLE` | slice | foley | seg=0 hp=300 max=1.4 fout=0.15 | drawbridge chain, iron links |
| `CART_SQUEAK` | slice | foley | seg=0 max=0.8 fout=0.1 rate=0.94 | wheel squeaking in a minor key |
| `SPLASH_BIG` | slice | foley | seg=0 hp=100 rate=0.84 max=1.5 fout=0.3 | large splash with a river wash |
| `CHIRP_90MS` | slice | ui | on=0 max=0.09 fout=0.01 | drive-in speaker chirp 90 ms |
| `FIREWORK` | slice | explosion | on=0 hp=200 max=1.4 fout=0.25 | rocket whistle + pop |
| `GULL_FAR` | chain | amb | lp=4000 reverb=0.5 max=1.4 fout=0.3 gain=-6 | single gull call, far |
| `HORN_BLOW` | chain | horn | rate=1.33 max=0.7 fout=0.15 | bicycle-horn blat re-pitched |
| `IRON_SNAP` | slice | impact | on=0 hp=400 ring=[1800,0.4] max=0.8 fout=0.1 | guard-rail snap + tail ring |
| `RAMP_SLAM` | slice | impact | on=0 hp=60 max=0.9 tail=[0.1,0.2] fout=0.1 | heavy metal plate slam |
| `SPLINTER_SOFT` | chain | impact | lp=4000 hp=100 max=0.6 fout=0.1 | wet splat |
| `SLIDE_UP` | chain | fx | reverse=True max=1.2 fout=0.1 | reversed slide whistle: rises |
| `PAGE_RUSTLE` | slice | ui | on=0 max=0.5 fout=0.08 | page rustle / hex whoosh |
| `POLE_BED` | loop | engine_loop | loopbake=[6.0,0.4] rate=0.89 lp=1800 hp=60 fout=0 | pole-forest creak bed loop (timber wobble slowed and low-passed) |

### 3.8 Sprite packs (AU2)

#### 3.8.1 Format decision, measured in Chromium 141 (`/opt/pw-browsers/chromium-1194`)

Test: a 6.000 s mono 44.1 kHz file with seven 4 ms 2 kHz bursts at known times, encoded seven ways, decoded with `OfflineAudioContext.decodeAudioData`, onset located by the first sample above 25 percent of the local peak.

| file | decodes | length (samples) | onset offset vs lossless | decode ms (6 s) | bytes |
|---|---|---|---|---|---|
| WAV PCM | yes | 264,600 | 0 | 8.9 | 529,244 |
| FLAC | yes | 264,600 | 0 | 5.5 | 13,862 |
| MP3 with Xing/Info (`-write_xing 1`) | yes | 264,600 | 0 | 9.5 | 48,527 |
| MP3 without the header | yes | 266,112 (+1,512) | **+25.05 ms** | 9.0 | 48,274 |
| Vorbis `.ogg` | yes | 265,408 (+808) | 0 (trailing excess) | 9.6 | 4,589 |
| Opus `.ogg`/`.opus`/`.webm` | yes | 264,600 | 0 (0.05 ms in two bursts) | 27.7 / 32.7 / 45.2 | 12,636 / 12,636 / 14,387 |
| AAC `.aac` / `.m4a` | **no** (`Unable to decode audio data`) | - | - | - | 5,118 / 5,145 |

`canPlayType`: `audio/mpeg`, vorbis, opus (ogg and webm) and flac "probably", wav "maybe", AAC "". Safari and Firefox are not available here (OI-AU3): the Info/Xing LAME header is the standard gapless carrier, `pack_check` fails the build if Chromium shows any offset, and the 50 ms gutters keep a transient-clipping mismatch of up to 25 ms from cutting into a neighbouring sprite.

#### 3.8.2 Playback semantics, measured

A 2 s DC buffer played with `start(0.1, 0.2, 0.3)` at `playbackRate` 0.5 / 0.9 / 1.0 / 1.1 / 1.5 starts at 0.100 s in all cases and lasts 0.600 / 0.3334 / 0.300 / 0.2727 / 0.200 s: `duration` is consumed buffer time, output length is `duration / rate`. Row views: `off = s0 / 44100`, `dur = n / 44100`; the voice's end time for the voice manager is `ts + n / (44100 * rate)`. A 115-row pack (120.4 s of sprites, 1,010,415 B, 64 kbps) was decoded in Chromium (205-225 ms, 3 runs) and 5 rows played from `start(0.05, off, dur)` into a 1-channel `OfflineAudioContext`: maximum difference to the decoded pack 0 and energy after the slice end 0 for all 5; all 115 rows cross-correlated against their FLAC masters with lag 0 samples (search +-88) and normalised correlation min 0.864 / median 0.995 (lower values are noisy 64 kbps material; the criterion is the lag, 3.14.1).

#### 3.8.3 Pack builder `tools/build_pack.py`

Input: the built masters `assets/masters/sfx/<id>.flac` of the rows with `pack: <id>` in `au_matrix.json`. Layout: 50 ms of silence, then each sprite followed by 50 ms of silence, in row order (family order of the matrix, then row index), sprites normalised to -3 dBFS with 2 ms fades already in the master. Offsets: `s0` = integer sample of the sprite start, `n` = sample count, both from the layout (no float rounding anywhere). Encode with `audiolib.encode_mp3(..., kbps=64, mono=True)` (already `-write_xing 1 -id3v2_version 0 -map_metadata -1`). Checks before writing: pack bytes <= 1,000,000 (otherwise split the pack at a family boundary: `_2`); every sprite peak <= -2.0 dBFS after decode; gutter RMS <= -90 dBFS; two onsets inside a sprite flagged for single-shot templates. The row's ledger fields: `pk` (pack file stem), `s0`, `n`, `d` (seconds, 3 decimals). The 17 packs:

| pack file (assets/audio/pack/<id>.mp3) | era | sprites | sprite seconds | est. bytes (64 kbps mono + 50 ms gutters) | est. decoded MB (48 kHz f32) | <= 1,000,000 B |
|---|---|---|---|---|---|---|
| `pack_mod_gun` | Modern | 45 | 15.6 | 146240 | 3.3 | yes |
| `pack_mod_boom` | Modern | 25 | 28.1 | 238016 | 5.4 | yes |
| `pack_mod_hit` | Modern | 30 | 13.1 | 119840 | 2.7 | yes |
| `pack_mod_vehicle` | Modern | 13 | 13.1 | 113344 | 2.5 | yes |
| `pack_mod_misc` | Modern | 77 | 49.3 | 428207 | 9.7 | yes |
| `pack_sf_energy` | Sci-Fi | 106 | 65.3 | 567808 | 12.9 | yes |
| `pack_sf_vehicle` | Sci-Fi | 19 | 30.0 | 250920 | 5.7 | yes |
| `pack_sf_alien` | Sci-Fi | 19 | 16.0 | 138656 | 3.1 | yes |
| `pack_sf_misc` | Sci-Fi | 69 | 45.3 | 393184 | 8.9 | yes |
| `pack_med_blade` | Medieval | 33 | 17.0 | 152736 | 3.4 | yes |
| `pack_med_beast` | Medieval | 31 | 36.3 | 306392 | 6.9 | yes |
| `pack_med_ranged` | Medieval | 18 | 11.7 | 103887 | 2.3 | yes |
| `pack_med_siege` | Medieval | 22 | 36.4 | 303536 | 6.9 | yes |
| `pack_med_misc` | Medieval | 67 | 59.8 | 508928 | 11.6 | yes |
| `pack_med_sting` | Medieval | 14 | 33.9 | 280200 | 6.3 | yes |
| `pack_mod_sting` | Modern | 10 | 27.4 | 226600 | 5.1 | yes |
| `pack_sf_sting` | Sci-Fi | 11 | 31.8 | 262200 | 5.9 | yes |

Sizes are estimated from the matrix (recipe maxima and source durations, 64 kbps = 8,000 B/s, 50 ms gutters); the real values are asserted at build time. The largest pack uses 57 percent of the cap.

#### 3.8.4 Runtime (`src/audio/sfx.js`)

`PackStore`: `pack(id)` fetches `assets/audio/pack/<id>.mp3` once, decodes with the same one-at-a-time decode chain as rows, and registers every row view; `SfxBank.assets` entries for pack rows share the pack's `buf` and `bytes` is accounted once. `_reserve(bytes)` evicts at pack granularity (least recently used pack not core, not needed by an active voice); a voice holds a reference to the buffer so an evicted pack never cuts a sounding voice. `pick()` returns `{buf, off, len, id, entry}`; `engine._startVoice` calls `src.start(ts, off, len)` (3.8.2) and computes `full = len / rate`. Rows that are not in a pack (core rows, ambience loops, music, Ancient rows) behave exactly as today. Decoded size of a pack = `length * 4` bytes (mono f32 at the context rate: the 17 packs are 2.3-12.9 MB each at 48 kHz, 17-73 MB if all were resident; the warm planner of 3.12.2 loads only the groups of the current era).


### 3.9 Ledger and manifest (AU3, AU6)

#### 3.9.1 Row schema (assets/manifest.json, append-only per AP-X01)

Existing sfx row keys (`id file path category tags duration author title source license licenseUrl attributionRequired notes core`) stay. New keys, present only on new-era rows:

| key | type | meaning |
|---|---|---|
| `era` | `medieval` / `modern` / `scifi` | owner era; absent = `ancient` (rows byte-identical); the set `ERA_IDS` is the registry's, a hidden era's rows are dropped from the shipped manifest (3.9.4) |
| `pk`, `s0`, `n` | string, int, int | pack file stem (`assets/audio/pack/<pk>.mp3`), first sample, sample count at 44,100 Hz; a row with `pk` has no `file`/`path` of its own except `path` set to the pack path so existing tools see a file |
| `d` | number | seconds, `n / 44100` to 3 decimals (`duration` is kept for tool compatibility) |
| `lc` | string | loudness class key of 3.14.2 (`pop`, `tink`, `bed`, ...) |
| `lic` | `CC0` / `CC-BY 4.0` / `CC-BY 3.0` / `PD` | the CHOSEN licence key; `license`/`licenseUrl` carry the chosen licence text and URL |
| `snap` | string | sha256 of `assets/licences/<sha1(source)>.txt` |
| `prov` | int 0-3 | provenance score (3.13.3) |
| `recipe` | string | recipe name of 3.7.5 (documentation only, not shipped) |
| `src_file` | string | file picked inside the source (kept in `notes`, not shipped) |
| `tags` | string[] | family tag (`rifle`, `tink`, `hit` ...) plus the era id |
| `family` | string | family id; ledger id = `<family>_<k>` |
| `loop` | bool | bed loops and ambience: `true`; with `loopStart/loopEnd` absent the whole file loops |

Music rows keep their keys and add `era`, `slot` (`menu` `map` `battle_low` `battle_mid` `battle_high` `victory` `defeat`), `energy`, `themes` (W theme ids; see 3.12.4), `key`, `loop_check2` (`{seam_vs_p95, tail_vs_body_db}`), `cut` (the mode and fields of 3.4.5), `lufs`, `bpmSource`. Their `mood` stays one of `menu battle victory defeat` (and `editor`, `comedy` for the shared rows); `battle_low/mid/high` stay the `energy` encoded as today (`moods: ['battle_mid']`). Ambience rows: `category: 'amb_loop'`, `loop: true`, `era`, `amb` (the ambience id), `dur` 24-30.

Example (generated from the matrix, not hand typed):

```
{"id": "mod_rifle_pop_1", "category": "gunshot", "family": "mod_rifle_pop", "era": "modern", "tags": ["rifle", "modern"], "pk": "pack_mod_gun",
 "s0": 2205, "n": 15435, "d": 0.35, "lc": "pop", "lic": "CC0", "license": "CC0 1.0", "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
 "author": "<pack author>", "title": "<pack title>", "source": "<page URL>", "snap": "<sha256>", "attributionRequired": false,
 "notes": "gunshots-0 gunshot_1.wav; recipe GUN_POP; high-passed 160 Hz, tail shaped, trimmed (changes made)"}
```

#### 3.9.2 New categories and load groups (generated)

`CAT_GROUP` in `manifest.js` gains these categories (Ancient categories unchanged; `ambience` stays in `misc` for Ancient rows so Ancient warm-up is identical):

| new ledger category | load group | families | rows | eras |
|---|---|---|---|---|
| `armor` | combat | 8 | 58 | Med, Mod, Sci |
| `clack` | combat | 2 | 10 | Med, Mod |
| `energy` | combat | 3 | 26 | Sci |
| `gunshot` | combat | 5 | 52 | Mod, Sci |
| `hoof` | combat | 1 | 10 | Med |
| `laser` | combat | 3 | 22 | Sci |
| `shield` | combat | 2 | 18 | Sci |
| `volley` | combat | 2 | 14 | Med |
| `engine_loop` | misc | 2 | 23 | Mod, Sci |
| `fx` | misc | 42 | 111 | Med, Mod, Sci |
| `step` | misc | 10 | 33 | Med, Mod, Sci |
| `destruction` | siege | 10 | 37 | Med, Mod, Sci |
| `explosion` | siege | 9 | 54 | Med, Mod, Sci |
| `mech` | siege | 1 | 9 | Sci |
| `ui` | ui | 17 | 44 | Med, Mod, Sci |
| `bell` | voice | 5 | 15 | Med, Mod, Sci |
| `creature` | voice | 10 | 38 | Med, Sci |

`GROUP_ORDER` becomes `['ui','combat','voice','siege','misc']` unchanged for warming, plus the on-demand group `amb` (`amb_loop`) that `warm()` never enqueues. `fx` is the generic bucket for small one-shots (set-piece sfx, comic sounds).

#### 3.9.3 Slim runtime manifest (tools/build.mjs, AU6)

`__VW_MANIFEST__` is built from the ledger by a whitelist, per kind:

```
sfx   : {id, p (path), c (category), t (tags), d (seconds), e (era, omitted for ancient), pk, s0, n (packed rows), lc, core}
music : {id, p, m (mood), t, d, loop, bpm, l (lufs), fo (fade_out), e, slot, th (themes), en (energy), lc2 (loop_check2.seam_vs_p95)}
```

`Catalog._norm` reads both the full and the slim keys (the full ledger is still loaded by tests and tools). Measured on the current ledger (382 sfx + music rows): full 233,704 B raw, 23,089 B deflated; slim 42,936 B raw, 6,282 B deflated, 16.4 B per row deflated. Extrapolation for the new rows (671: 574 committed sfx rows, 35 stingers, 20 music rows, 19 ambience loops, 23 bed loops) at the measured 16.4 B per row deflated: about 11 KB deflated, so the slim manifest of all four eras is about 17 KB deflated. Credits (`__VW_CREDITS__`) grow with the 237 distinct credit entries of 3.13 (`CREDITS.md` is 18,387 B for 124 items today; the estimate is about 200 B per entry, about +47 KB raw). Budget lines for the AR size report: manifest <= 20 KB deflated (AU-T20), credits <= 12 KB deflated.

#### 3.9.4 Hidden eras and the published file set

`tools/build.mjs` reads `src/content/eras.config.js` (AR 3.11.3). For every hidden era it drops (a) rows with that `era` from `__VW_MANIFEST__`, (b) their files from `dist/artifact/files.json` and `files.manifest.json`, (c) the region of `CREDITS.md` between `<!-- era:<id> -->` and `<!-- /era:<id> -->`, (d) their `UI_BY_ERA`-independent core rows from `__VW_CORE_AUDIO__`. Code and data stay and are counted. The ledger gains the top-level key `publishedFiles: {ancient: 382, medieval: 28, modern: 28, scifi: 23}` (generated: pack + music + ambience + loop files per era, 3.9.5); the build asserts `sum <= 500 - 1` (page) and the server-side count (previous published paths + delta - nulls) `<= 500` (AR guard). A file once published stays served until a publish passes `null`; an era is released with exactly its final file set.

#### 3.9.5 File budget (generated)

| era | pack files | music files | ambience files | bed-loop files | new published files | est. MB |
|---|---|---|---|---|---|---|
| Medieval | 6 | 7 | 7 | 8 | 28 | 8.3 |
| Modern | 6 | 7 | 6 | 9 | 28 | 8.4 |
| Sci-Fi | 5 | 6 | 6 | 6 | 23 | 8.3 |
| all three | 17 | 20 | 19 | 23 | 79 | 25.0 |

Total new files 79 on top of 382 Ancient audio files and the page: 462 of 500, leaving 38 spare slots (AR budgeted 117 for three eras, about 39 each; the packs are why the figure is 26 each). Estimated new bytes 25.0 MB; the version limit is 256 MB per version, 64 MB and 255 files per publish call (the Artifact tool), so each era publishes in one call.

### 3.10 Tool changes (AP-T06)

| tool | change |
|---|---|
| all `tools/*.py` and `tools/build_all.sh` | replace `/home/user/voxelwars` literals (found in `build_sfx.py:11-13`, `build_music.py`, `build_manifest.py`, `verify_assets.py`, `credits_lib.py`, `fetch_*`) by `ROOT = Path(__file__).resolve().parents[1]`; `build_all.sh` already `cd`s to the repo; `tests/audio/assets.test.mjs` takes the root from `import.meta.url` |
| `tools/sfx_spec.py` | `S(id, cat, src, tags, era=None, pk=None, lc=None, family=None, recipe=None, core=False, notes='', **opts)`; the Ancient block is untouched; one generated block per era between `# <generated:medieval>` markers written by `tools/gen_sfx_spec.py` from `au_matrix.json` (row id, source dir `oga-<slug>`/`kenney-<pack>` resolved from the source key, file pattern from the matrix, opts from the recipe) |
| `tools/build_sfx.py` | the new options of 3.7.1; `synth:<name>` registry reads the synth table of the matrix (90 synth recipes); `--era <id>` filter; writes `era`, `pk` into `_sfx_build.json`; reuses `A.encode_mp3` |
| `tools/build_pack.py` (NEW) | 3.8.3 |
| `tools/build_stingers.py` (NEW) | 3.5 |
| `tools/build_music.py`, `tools/music_spec.py` | rows gain `era slot themes en cut`; modes of 3.4.5; loudness targets per slot; calls `loop_check2.py` and `key_check.py`; writes the `loop_check2` and `key` fields |
| `tools/loop_check2.py`, `tools/key_check.py` (NEW) | 3.4.2, 3.4.3; fixtures under `tests/audio/fixtures/` |
| `tools/build_manifest.py` | writes the new keys of 3.9.1 from `_sfx_build.json`, `_music_build.json` and the source registry; `publishedFiles`; `CREDITS.md` with era markers (3.13); the slim manifest is built by `tools/build.mjs`, not here |
| `tools/verify_assets.py` | adds: `lic` in `OKLIC` keys, `snap` file exists and its sha256 matches, `pk` row inside the pack (`s0 + n <= pack samples`), pack bytes <= 1,000,000, Info/Xing header present, `era` in `ERA_IDS`, ledger id unique, class `lc` known, `attributionRequired == license starts with 'CC BY'`, ambience seam <= 0.02 FS, hot-family recordings >= 6 from the matrix |
| `tools/credits_lib.py` | `attrib()` reads the chosen licence and page of the source registry instead of hard-coding `CC0` for Kenney and `CC-BY 4.0` for MacLeod; `AUTHOR_FIX` additions for the sources of the matrix; Kenney rows read `License.txt` |
| `tools/fetch_oga.py`, `tools/oga.py` | accept the chosen-licence rule (record the chosen licence per file, reject a page whose only accepted tag is on a multi-licence page unless `--choose`), write the licence snapshot, write `meta.json` with `licenses`, `chosen`, `provenance` |
| `tools/sources_oga.txt`, `tools/fetch_kenney.sh`, `tools/fetch_incompetech.py` | the lists of 3.16.1 (generated) |
| `tools/fetch_firearm_lib.py` (NEW) | 3.16.2 |
| `tools/refetch.py` (NEW) | 3.16.3 |
| `tools/audit_sheet.py` (NEW) | per family: concatenate the family's rows with 0.3 s gaps, `ffmpeg -lavfi showspectrumpic=s=1200x400:legend=0:scale=log` (tested), one PNG per family under `.cache/audit/` for an agent to read |
| `tools/mixtest.mjs`, `tests/audio/mix_entry.js` | `--era`, `--scenario`, `--classes`, `--stems`; the scripted armies move out of `recordBattle()` into `tests/audio/scenarios.json` (3.14.3); `mix_entry.js` gains `muteCues` / `soloCue` |
| `tools/gen_era_cues.mjs` (NEW) | writes `src/audio/_generated/era_cues.js` (`ERA_CUES[era]` = cue ids reachable from the era's tables), used by the warm planner and by `cue_trace` |

### 3.11 Router (AU4)

#### 3.11.1 Resolution order and where data lives

For an event the router resolves, in order: (1) the `UnitDef` profile (`AUDIO_PROFILES[defId][slot]`, keyed by def id; `D(def, slot, subkey)` replaces today's `D(def, kind)`, which read the dead `UnitDef.sfx`), (2) the kind or cause table (`PROJ_AUDIO`, `EXPLOSION_AUDIO`, `ABILITY_CUES`, `CAUSE_SCREAM`), (3) the legacy code path (unchanged for Ancient ids). All new tables are registry data in `src/content/era_<id>/data.js` (AR OW-07) merged by the registry; `cues.js` reads `registry.audioFor(era)`; Ancient rows are moved verbatim (AP-U01). `createRouter(deps)` gains `deps.era`, `deps.registry` and `deps.shooters` (the `ShooterWindow`); `setArena(info)` carries `era` and the ambience ids.

#### 3.11.2 Templates and family options (cues.js `T`; AU4 burst template)

New templates (numbers are the spec; existing templates unchanged):

| template | bus | spatial | ref | maxDist | pitch | cooldownMs | maxVoices | priority | vol | dur | other |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `pop` | sfx | yes | 14 | 100 | 0.94-1.06 | 35 | 8 | 40 | 0.5 | 0.35 | far-thinned |
| `burst` | sfx | yes | 14 | 100 | 0.95-1.05 | 70 | 5 | 38 | 0.5 | 0.6 | one sample = one burst |
| `crack` | sfx | yes | 22 | 130 | 0.97-1.03 | 200 | 3 | 62 | 0.75 | 0.8 | sniper, rail |
| `clack` | sfx | yes | 8 | 40 | 0.96-1.05 | 120 | 3 | 30 | 0.4 | 0.3 | `nearOnly` 35 u |
| `tink` | sfx | yes | 12 | 90 | 0.95-1.10 | 20 | 10 | 58 | 0.8 | 0.4 | |
| `thump` | sfx | yes | 28 | 150 | 0.94-1.06 | 120 | 4 | 70 | 0.85 | 1.2 | send 0.12; duck music -4 dB 400 ms |
| `blast` | sfx | yes | 24 | 130 | 0.92-1.08 | 120 | 4 | 60 | 0.8 | 2.4 | send 0.1; duck by size class |
| `volley` | sfx | yes | 20 | 110 | 0.96-1.04 | 400 | 3 | 45 | 0.6 | 1.2 | |
| `ring` | sfx | yes | 40 | 150 | 0.98-1.02 | 600 | 2 | 72 | 0.85 | 7.0 | send 0.2 |
| `roar` | sfx | yes | 34 | 160 | 0.95-1.03 | 1200 | 2 | 88 | 0.95 | 3.0 | `limiterBypass`; duck music -6 dB 700 ms |
| `bed` | ambience | no | - | - | 1 | 0 | 3 | 30 | 0.3 | loop | owned by `BedManager` |
| `sting` | announcer | no | - | - | 1 | 800 | 1 | 96 | 0.85 | 3.6 | duck music -6 dB 700 ms |

Per-family overrides (`F(id, tmpl, pick, opts)` third argument; bible values where the bibles give one):

| era | family | cooldownMs | maxVoices | other |
|---|---|---|---|---|
| Medieval | `med_sword_on_plate` | 60 | 6 | |
| Medieval | `med_mace_crunch` / `med_lance_shatter` / `med_brace_thunk` | 80 / 150 / 120 | 4 / 3 / 4 | brace: one cue per 120 ms per block |
| Medieval | `med_hoof_thunder` | 400 | 3 | audible 2 s build; bed above 6 cavalry |
| Medieval | `med_longbow_volley` / `med_xbow_release` / `med_xbow_crank` | 400 / 90 / 120 | 3 / 5 / 3 | volley: one grouped cue per 0.4 s window |
| Medieval | `med_trebuchet` / `med_ram_gate` / `med_wall_collapse` | 250 / 300 / 250 | 3 / 2 / 3 | siege ducks music 6 dB |
| Medieval | `med_banner` / `med_bell` / `med_dragon_roar` | 500 / 600 / 1200 | 2 / 2 / 2 | banner and roar `priority` 85 / 88 |
| Modern | `mod_rifle_pop` | 35 | 8 | pitch jitter, far-thinned |
| Modern | `mod_mg_stutter` | 75 (60-90 by distance) | 5 | many tripods become a crackle bed |
| Modern | `mod_sniper_crack` / `mod_bullet_snap` / `mod_reload_clack` | 200 / 150 / 120 | 3 / 4 / 3 | snap loud near the camera; clack near-only |
| Modern | `mod_cannon_bonk` / `mod_shell_whistle` / `mod_blast` | 120 / 800 / 120 | 4 / 2 / 4 | blast duck s 0, m -3, l -6 dB |
| Modern | `mod_plink_tink` / `mod_helmet_bonk` / `mod_mine_blip_boing` | 20 / 60 / 300 | 10 / 6 / 2 | tink 3 LU above pop |
| Sci-Fi | `sf_pulse_burst` | 75 (60-90) | 6 | cull 70 u; laser bed above 40 shooters |
| Sci-Fi | `sf_rivet_chatter` / `sf_rail_crack` / `sf_plasma_lob` | 70 / 200 / 80 | 5 / 3 / 5 | |
| Sci-Fi | `sf_shield_hit` / `sf_shield_pop` | 33 / 40 | 3 / 8 | absorb: at most 3 per 100 ms in the frustum; pop chain adds a glissando |
| Sci-Fi | `sf_emp_burst` / `sf_cloak_shimmer` / `sf_blink_pop` | 300 / 400 per unit / 100 | 2 / 2 / 4 | emp duck music -3 dB; powerdown thinned to 3 per second |
| Sci-Fi | `sf_mech_step` / `sf_orbital_strike` / `sf_alien_goo` | 150 / 2000 / 100 | 3 / 1 / 6 | mech duck -4 dB; orbital -6 dB, flash limiter R16 |

#### 3.11.3 PROJ_AUDIO (generated)

`projectile_launch` plays `shoot` when `round % burst === 0` where `round` is the payload field added by M2 and `burst` is the row's covered rounds (a def with a 5-round mg burst and a 3-round sample plays rounds 0 and 3; 6-round rivet bursts play once). `beam` (hitscan) uses the same row at `(x0,y0,z0)`. Telegraph kinds start the named whistle aligned to impact (3.11.8). Legacy rows are frozen.

| era | kind | shoot cue(s) | rounds per play | telegraph cue | hit cues | why |
|---|---|---|---|---|---|---|
| Medieval | `quarrel` | `med_xbow_release` | 1 | - | unit=arrow_hit_flesh, ground=arrow_hit_wood, shield=arrow_hit_shield | crossbow; lead:true |
| Medieval | `firepot` | `catapult_launch`, `med_fire_whoosh` | 1 | - | none | mangonel pitch pot (the explosion kind fire carries the impact) |
| Modern | `rifle` | `mod_rifle_pop#rifle` | 1 | - | none | tin_hat_trooper fires 2-round bursts: one pop sample per round (burst=1) with the 35 ms cooldown merging a pair; the router passes the def burst size, so singles (clerk_rifleman) also play every round |
| Modern | `pistol` | `mod_rifle_pop#pistol` | 1 | - | none | officers |
| Modern | `smg` | `mod_rifle_pop#smg` | 3 | - | none | cub_reporter 3-round bursts |
| Modern | `mg` | `mod_mg_stutter` | 3 | - | none | 3-round stutter sample; 4-6 round bursts play it every 3rd round |
| Modern | `sniper` | `mod_sniper_crack` | 1 | - | none | hitscan: also on beam event |
| Modern | `shell` | `mod_cannon_bonk` | 1 | - | none | direct cannon: impact via explosion kind shell |
| Modern | `rocket` | `mod_rocket_whoosh` | 1 | - | none | impact via explosion kind rocket |
| Modern | `mortar` | `mod_mortar_thump` | 1 | `mod_shell_whistle` | none | arc high: whistle starts at telegraph, aligned to impact |
| Modern | `grenade` | `mod_dynamite_fuse` | 1 | - | none | throw |
| Modern | `flame` | `fire_ignite` | 1 | - | none | shared Ancient family named on purpose (manifest.sharedAudio); no Modern roster unit uses it |
| Sci-Fi | `laser` | `sf_pulse_burst` | 3 | - | none | pulse rifles 3-round; above 40 shooters the laser bed replaces it |
| Sci-Fi | `plasma` | `sf_plasma_lob#launch` | 1 | - | unit=sf_plasma_lob#impact, ground=sf_plasma_lob#impact | dustpan_hover |
| Sci-Fi | `rail` | `sf_rail_crack` | 1 | - | none | hitscan; lock line cue sf_lock_line is the telegraph |
| Sci-Fi | `beam_pulse` | `sf_pulse_burst#valet` | 1 | - | none | valet/serve beams: thin zzzt |
| Sci-Fi | `missile` | `sf_rivet_chatter#rocket` | 1 | - | none | fsssh-pop; impact via explosion kind rocket |
| Sci-Fi | `flechette` | `sf_rivet_chatter#chatter` | 6 | - | none | rivet gun 6-round sample; thorn blowgun uses the same family at pitch 1.3 and 1-round |
| Ancient | `arrow javelin pilum francisca boulder bolt coin sunbeam scepter thunderbolt crew` | frozen (cues.js:331-339) | - | - | frozen (cues.js:341-346) | rows exist for registry.verify; ids equal what the switch plays |

Aliases (roster weapon tokens that are not `PROJ_KINDS`; OI-AU5): Modern: `bullet`->`rifle`, `pea`->`smg`, `explosive`->`shell`, `hitscan`->`sniper`, `homing`->`rocket`, `throw`->`grenade`; Sci-Fi: `pulse`->`laser`, `pulse_s`->`laser`, `valet_beam`->`beam_pulse`, `serve_beam`->`beam_pulse`, `rivet`->`flechette`, `thorn`->`flechette`, `salvo`->`missile`, `rocket`->`missile`, `acid_glob`->`plasma`, `acid_spray`->`plasma`, `acid_cone`->`plasma`, `junk_shell`->`shell`, `slip_shell`->`shell`, `lost_luggage`->`mortar`, `void_bomb`->`mortar`, `hush_cone`->`beam_pulse`; Medieval: `xbow`->`quarrel`, `shoot`->`arrow`, `dragonfire`->`firepot`, `arc`->`boulder`.

#### 3.11.4 EXPLOSION_AUDIO (generated)

Size class from the payload radius `r` (`s` below 3, `m` from 3 below 7, `l` from 7). The legacy `explosion` branches (`fire`, `lightning`, `magic`, default `rubble`) stay for Ancient defs; a new-era world resolves this table first.

| era | explosion kind | small (r < 3) | medium (3 <= r < 7) | large (r >= 7) | music duck | note |
|---|---|---|---|---|---|---|
| Medieval | `fire` | med_fire_whoomph | med_fire_whoomph | med_fire_whoomph | - | legacy `fire` branch keeps fire_ignite for Ancient defs; Medieval defs resolve here first |
| Medieval | `boulder` | boulder_impact | boulder_impact | med_wall_collapse | - | boulder kind is legacy; large radius adds the collapse |
| Modern | `shell` | mod_blast#s | mod_blast#m | mod_blast#l | s 0 dB, m -3 dB, l -6 dB |  |
| Modern | `rocket` | mod_blast#s | mod_blast#m | mod_blast#l | s 0 dB, m -3 dB, l -6 dB |  |
| Modern | `prop` | mod_blast#s | mod_blast#m | mod_blast#l | s 0 dB, m -3 dB, l -6 dB |  |
| Modern | `mine` | mod_blast#s | mod_blast#m | mod_blast#m | - | mod_mine_boing |
| Modern | `grenade` | mod_blast#s | mod_blast#m | mod_blast#m | - |  |
| Modern | `orbital` | mod_blast#m | mod_blast#l | mod_blast#l | - |  |
| Modern | `smoke` | mod_pop_family | mod_pop_family | mod_pop_family | - |  |
| Modern | `emp` | mod_pop_family | mod_pop_family | mod_pop_family | - |  |
| Sci-Fi | `shell` | sf_blast#s | sf_blast#m | sf_blast#l | s 0 dB, m -3 dB, l -6 dB |  |
| Sci-Fi | `rocket` | sf_blast#s | sf_blast#m | sf_blast#l | s 0 dB, m -3 dB, l -6 dB |  |
| Sci-Fi | `prop` | sf_blast#s | sf_blast#m | sf_blast#l | - |  |
| Sci-Fi | `orbital` | sf_orbital_strike | sf_orbital_strike | sf_orbital_strike | s -6 dB, m -6 dB, l -6 dB |  |
| Sci-Fi | `emp` | sf_emp_burst#emp | sf_emp_burst#emp | sf_emp_burst#emp | s -3 dB, m -3 dB, l -3 dB |  |
| Sci-Fi | `mine` | sf_blast#s | sf_blast#m | sf_blast#m | - |  |
| Sci-Fi | `grenade` | sf_blast#s | sf_blast#m | sf_blast#m | - |  |
| Sci-Fi | `smoke` | sf_spore_puff | sf_spore_puff | sf_spore_puff | - |  |

#### 3.11.5 AUDIO_PROFILES

Schema per def id (`era_<id>/data.js`): `{archetype, hit: {<damageType>: cue}, swing: cue|null, shoot: cue|null, death: {default, <cause>: cue}, voice: cue, step: cue|'by_surface'|null, mat: <MAT_KEY>, reload?, brace?, flier?, hover?, vehicle?, mount?}`. `hit[type]` is the sound of THIS unit's weapon landing (played at the target, replacing `hit_blade/hit_pierce/hit_blunt` of the legacy `fam` choice); `mat` selects what the target adds when hit: `MAT_CUES = {mail, plate, cloth, flesh, wood, tin, hull, suit, chitin}` resolved by the era (Modern `tin`: `mod_pin_thunk`/`mod_helmet_bonk`; `hull`: `mod_plink_tink` bounce or `bonk`; Sci-Fi `suit`: `hit_flesh_light`, `hull`: `sf_hull_tink`, `chitin`: `sf_alien_goo#splorp`; Medieval `plate`/`mail`: `med_sword_on_plate`, `cloth`: `hit_flesh_light`). `death` picks by `unit_kill.cause` then `default`; `hero` adds the shared `stinger_hero_down` for the hero deaths. UC-40 asserts every slot the unit has is non-empty, resolves to a cue in `CUES` backed by a row of the era (or a shared Ancient family named in `manifest.sharedAudio`) and that no unit falls to the generic `taunt` voice if it is a hero, monster, vehicle, air, mech or boss (UC-42: the archetypes above give each of those a distinct voice cue).

Archetypes (generated):

**Medieval**

| archetype | hit (by damage type) | swing | shoot | death (by cause) | voice | step | mat |
|---|---|---|---|---|---|---|---|
| `foot_blade` | slash:med_sword_on_plate / pierce:hit_pierce / blunt:med_mace_crunch | swing_light | - | default:death_male | taunt | by_surface | mail |
| `foot_plate` | slash:med_sword_on_plate / pierce:med_sword_on_plate / blunt:med_mace_crunch | swing_heavy | - | default:death_male | taunt | med_armour_step | plate |
| `foot_pole` | slash:hit_blade / pierce:hit_pierce / blunt:med_mace_crunch | spear_thrust | - | default:death_male | taunt | by_surface | cloth |
| `foot_mace` | slash:hit_blade / pierce:hit_pierce / blunt:med_mace_crunch | swing_heavy | - | default:death_male | taunt | by_surface | cloth |
| `swarm_fork` | slash:hit_blade / pierce:hit_pierce / blunt:hit_blunt | spear_thrust | - | default:death_oof | taunt | by_surface | cloth |
| `mounted_lance` | slash:med_sword_on_plate / pierce:med_lance_shatter / blunt:med_mace_crunch | spear_thrust | - | default:death_male / bailout:med_hoof_thunder#hit | med_horn_charge | med_hoof_thunder | plate |
| `archer_long` | slash:hit_blade / pierce:hit_pierce / blunt:hit_blunt | swing_light | med_longbow_volley | default:death_male | taunt | by_surface | cloth |
| `archer_xbow` | slash:hit_blade / pierce:hit_pierce / blunt:hit_blunt | swing_light | med_xbow_release | default:death_male | taunt | by_surface | cloth |
| `siege_engine` | slash:med_ram_gate / pierce:med_ram_gate / blunt:med_ram_gate | - | med_trebuchet | default:med_wall_collapse | med_chain_rattle | - | wood |
| `siege_ram` | slash:med_ram_gate / pierce:med_ram_gate / blunt:med_ram_gate | med_ram_gate | - | default:med_wall_collapse | med_chain_rattle | - | wood |
| `support_bell` | slash:hit_blade / pierce:hit_pierce / blunt:med_bell#small | swing_heavy | - | default:death_male | med_bell | by_surface | cloth |
| `support_heal` | slash:hit_blade / pierce:hit_pierce / blunt:hit_blunt | swing_light | - | default:death_oof | taunt | by_surface | cloth |
| `support_banner` | slash:hit_blade / pierce:hit_pierce / blunt:hit_blunt | spear_thrust | - | default:death_male / banner:med_banner#fall | med_horn_charge | by_surface | mail |
| `hero_knight` | slash:med_sword_on_plate / pierce:med_sword_on_plate / blunt:med_mace_crunch | swing_heavy | - | default:death_male / hero:stinger_hero_down | med_trumpet_crack | med_armour_step | plate |
| `beast_hog` | slash:hit_pierce / pierce:hit_pierce / blunt:hit_blunt | kick_whoomp | - | default:death_animal | goat_bleat | by_surface | flesh |
| `monster_troll` | slash:hit_blunt / pierce:hit_blunt / blunt:med_mace_crunch | swing_heavy | - | default:death_big | med_troll_groan | med_hoof_thunder#hit | flesh |
| `monster_dragon` | slash:hit_pierce / pierce:hit_pierce / blunt:hit_blunt | swing_heavy | med_fire_whoosh | default:death_big / crash:med_dust_whump | med_dragon_roar | med_wing_whomp | flesh |
| `monster_gold` | slash:hit_blunt / pierce:hit_blunt / blunt:med_mace_crunch | swing_heavy | - | default:med_purse_jingle | med_purse_jingle | med_armour_step | plate |
| `swarm_hoard` | slash:hit_blade / pierce:hit_pierce / blunt:hit_blunt | swing_light | - | default:med_purse_jingle | med_purse_jingle | by_surface | cloth |
| `siege_keep` | slash:med_ram_gate / pierce:med_ram_gate / blunt:med_ram_gate | med_ram_gate | med_xbow_release | default:med_wall_collapse | med_chain_rattle | - | wood |

**Modern**

| archetype | hit (by damage type) | swing | shoot | death (by cause) | voice | step | mat |
|---|---|---|---|---|---|---|---|
| `inf_rifle` | bullet:mod_pin_thunk / explosive:mod_pin_thunk / blunt:mod_helmet_bonk / slash:mod_pin_thunk | mod_stamp_thud | mod_rifle_pop#rifle | default:mod_helmet_bonk#human | mod_radio_squelch | by_surface | tin |
| `inf_pistol` | bullet:mod_pin_thunk / explosive:mod_pin_thunk / blunt:mod_helmet_bonk / slash:mod_pin_thunk | mod_stamp_thud | mod_rifle_pop#pistol | default:mod_helmet_bonk#human | mod_radio_squelch | by_surface | tin |
| `inf_smg` | bullet:mod_pin_thunk / explosive:mod_pin_thunk / blunt:mod_helmet_bonk / slash:mod_pin_thunk | mod_stamp_thud | mod_rifle_pop#smg | default:mod_helmet_bonk#human | mod_radio_squelch | by_surface | tin |
| `inf_pea` | bullet:mod_pin_thunk / explosive:mod_pin_thunk / blunt:mod_helmet_bonk / slash:mod_pin_thunk | mod_stamp_thud | mod_rifle_pop#pea | default:mod_helmet_bonk#human | mod_radio_squelch | by_surface | tin |
| `inf_sniper` | bullet:mod_pin_thunk / explosive:mod_pin_thunk / blunt:mod_helmet_bonk / slash:mod_pin_thunk | mod_stamp_thud | mod_sniper_crack | default:mod_helmet_bonk#human | mod_radio_squelch | by_surface | tin |
| `inf_launcher` | bullet:mod_pin_thunk / explosive:mod_pin_thunk / blunt:mod_helmet_bonk / slash:mod_pin_thunk | mod_stamp_thud | mod_rocket_whoosh | default:mod_helmet_bonk#human | mod_radio_squelch | by_surface | tin |
| `inf_thrower` | bullet:mod_pin_thunk / explosive:mod_pin_thunk / blunt:mod_helmet_bonk / slash:mod_pin_thunk | mod_stamp_thud | mod_dynamite_fuse | default:mod_helmet_bonk#human | mod_radio_squelch | by_surface | tin |
| `inf_melee` | bullet:mod_pin_thunk / explosive:mod_pin_thunk / blunt:mod_helmet_bonk / slash:mod_helmet_bonk | mod_stamp_thud | - | default:mod_helmet_bonk#human | mod_radio_squelch | by_surface | tin |
| `inf_support` | bullet:mod_pin_thunk / explosive:mod_pin_thunk / blunt:mod_helmet_bonk / slash:mod_pin_thunk | mod_stamp_thud | mod_rifle_pop#pistol | default:mod_helmet_bonk#human | mod_radio_squelch | by_surface | tin |
| `inf_hero` | bullet:mod_pin_thunk / explosive:mod_pin_thunk / blunt:mod_stamp_thud / slash:mod_stamp_thud | mod_stamp_thud | mod_rifle_pop#pistol | default:mod_helmet_bonk#human / hero:stinger_hero_down | mod_typewriter_ding | by_surface | tin |
| `veh_wheeled` | bullet:mod_plink_tink / explosive:mod_blast#s / blunt:mod_armour_bonk / slash:mod_plink_tink | - | mod_mg_stutter | default:mod_helmet_bonk#machine | mod_phone_ring | mod_machine_bed | hull |
| `veh_tank` | bullet:mod_plink_tink / explosive:mod_armour_bonk / blunt:mod_armour_bonk / slash:mod_plink_tink | - | mod_cannon_bonk | default:mod_helmet_bonk#machine | mod_kettle_whistle | mod_machine_bed | hull |
| `veh_heavy` | bullet:mod_plink_tink / explosive:mod_armour_bonk / blunt:mod_armour_bonk / slash:mod_plink_tink | - | mod_cannon_bonk | default:mod_helmet_bonk#machine | mod_teapot_whistle | mod_machine_bed | hull |
| `veh_gun` | bullet:mod_plink_tink / explosive:mod_armour_bonk / blunt:mod_armour_bonk / slash:mod_plink_tink | - | mod_mortar_thump | default:mod_helmet_bonk#machine | mod_radio_squelch | - | hull |
| `veh_air` | bullet:mod_plink_tink / explosive:mod_armour_bonk / blunt:mod_armour_bonk / slash:mod_plink_tink | - | mod_mg_stutter | default:mod_helmet_bonk#machine / crash:mod_blast#m | mod_rotor_flyby | mod_machine_bed | hull |
| `veh_mower` | bullet:mod_plink_tink / explosive:mod_armour_bonk / blunt:mod_armour_bonk / slash:mod_plink_tink | mod_mower_rev | mod_pop_family | default:mod_helmet_bonk#machine | mod_engine_roar | mod_machine_bed | hull |
| `veh_ram` | bullet:mod_plink_tink / explosive:mod_armour_bonk / blunt:mod_girder_clang / slash:mod_plink_tink | mod_girder_clang | - | default:mod_helmet_bonk#machine | mod_trolley_squeak | mod_machine_bed | hull |
| `monster_behemoth` | bullet:mod_plink_tink / explosive:mod_armour_bonk / blunt:mod_armour_bonk / slash:mod_plink_tink | - | mod_mg_stutter | default:mod_helmet_bonk#machine | mod_radio_squelch | mod_machine_bed | hull |

**Sci-Fi**

| archetype | hit (by damage type) | swing | shoot | death (by cause) | voice | step | mat |
|---|---|---|---|---|---|---|---|
| `inf_pulse` | energy:sf_hull_tink / blunt:hit_flesh_light / pierce:hit_flesh_light / emp:sf_emp_burst#powerdown | sf_stamp_rated | sf_pulse_burst | default:sf_knockout | sf_booth_chirp | by_surface | suit |
| `inf_melee` | energy:sf_hull_tink / blunt:hit_flesh_light / pierce:hit_flesh_light / emp:sf_emp_burst#powerdown | kick_whoomp | - | default:sf_knockout | sf_booth_chirp | by_surface | suit |
| `inf_support` | energy:sf_hull_tink / blunt:hit_flesh_light / pierce:hit_flesh_light / emp:sf_emp_burst#powerdown | kick_whoomp | sf_pulse_burst#valet | default:sf_knockout | sf_bell | by_surface | suit |
| `inf_rivet` | energy:sf_hull_tink / blunt:hit_flesh_light / pierce:hit_flesh_light / emp:sf_emp_burst#powerdown | kick_whoomp | sf_rivet_chatter#chatter | default:sf_knockout | sf_booth_chirp | by_surface | suit |
| `inf_rail` | energy:sf_hull_tink / blunt:hit_flesh_light / pierce:hit_flesh_light / emp:sf_emp_burst#powerdown | kick_whoomp | sf_rail_crack | default:sf_knockout | sf_cloak_shimmer | by_surface | suit |
| `inf_stealth` | energy:sf_hull_tink / blunt:hit_flesh_light / pierce:hit_flesh_light / emp:sf_emp_burst#powerdown | sf_cloak_shimmer | - | default:sf_knockout | sf_cloak_shimmer | by_surface | suit |
| `inf_blink` | energy:sf_hull_tink / blunt:hit_flesh_light / pierce:hit_flesh_light / emp:sf_emp_burst#powerdown | kick_whoomp | sf_pulse_burst#valet | default:sf_knockout | sf_blink_pop | by_surface | suit |
| `inf_hero` | energy:sf_hull_tink / blunt:hit_flesh_light / pierce:hit_flesh_light / emp:sf_emp_burst#powerdown | swing_heavy | sf_pulse_burst | default:sf_knockout / hero:stinger_hero_down | sf_bell | by_surface | suit |
| `mach_hover` | energy:sf_hull_tink / blunt:sf_hull_tink / pierce:sf_hull_tink / emp:sf_emp_burst#powerdown | - | sf_plasma_lob#launch | default:sf_emp_burst#powerdown | sf_hover_whine | sf_hover_hum | hull |
| `mach_drone` | energy:sf_hull_tink / blunt:sf_hull_tink / pierce:sf_hull_tink / emp:sf_emp_burst#powerdown | - | - | default:sf_emp_burst#powerdown | sf_servo_whine | sf_hover_hum | hull |
| `mach_vehicle` | energy:sf_hull_tink / blunt:sf_hull_tink / pierce:sf_hull_tink / emp:sf_emp_burst#powerdown | - | sf_rivet_chatter#rocket | default:sf_emp_burst#powerdown | sf_servo_whine | sf_hover_hum | hull |
| `mach_gun` | energy:sf_hull_tink / blunt:sf_hull_tink / pierce:sf_hull_tink / emp:sf_emp_burst#powerdown | - | sf_rivet_chatter#rocket | default:sf_emp_burst#powerdown | sf_servo_whine | - | hull |
| `mach_mech` | energy:sf_hull_tink / blunt:sf_hull_tink / pierce:sf_hull_tink / emp:sf_emp_burst#powerdown | sf_mech_step | sf_orbital_strike | default:sf_mech_step#topple | sf_servo_whine | sf_mech_step | hull |
| `alien_swarm` | energy:sf_alien_goo#splorp / blunt:sf_alien_goo#splorp / pierce:sf_alien_goo#splorp / emp:sf_alien_goo#chitter | sf_alien_goo#chitter | - | default:sf_alien_goo#splorp | sf_alien_goo#chitter | by_surface | chitin |
| `alien_ranged` | energy:sf_alien_goo#splorp / blunt:sf_alien_goo#splorp / pierce:sf_alien_goo#splorp / emp:sf_alien_goo#chitter | sf_alien_goo#chitter | sf_plasma_lob#launch | default:sf_alien_goo#splorp | sf_alien_goo#trill | by_surface | chitin |
| `alien_beast` | energy:sf_alien_goo#splorp / blunt:sf_alien_goo#splorp / pierce:sf_alien_goo#splorp / emp:sf_alien_goo#chitter | kick_whoomp | - | default:sf_alien_goo#splorp | sf_grazer_baa | sf_step_goo | chitin |
| `alien_monster` | energy:sf_alien_goo#splorp / blunt:sf_mech_step#step / pierce:sf_alien_goo#splorp / emp:sf_alien_goo#chitter | sf_mech_step#step | sf_plasma_lob#launch | default:sf_alien_goo#splorp / summon:sf_alien_goo#chitter | sf_queen_screech | sf_mech_step#step | chitin |
| `alien_air` | energy:sf_alien_goo#splorp / blunt:sf_alien_goo#splorp / pierce:sf_alien_goo#splorp / emp:sf_alien_goo#chitter | sf_alien_goo#chitter | sf_plasma_lob#launch | default:sf_alien_goo#splorp | sf_alien_goo#trill | sf_hover_hum | chitin |

Per-unit map (generated; all 34 roster ids of each era, 102 total, checked against `rosters.md` by `matrix_roster.test.mjs`):

**Medieval**

| archetype | units | unit ids (overrides in parentheses) |
|---|---|---|
| `foot_blade` | 2 | squire, pavise_bearer |
| `mounted_lance` | 2 | lancer, knight_errant |
| `foot_plate` | 2 | knight_afoot, sellsword |
| `support_banner` | 1 | standard_bearer |
| `hero_knight` | 3 | ser_valiant(voice=med_horn_charge, step=med_hoof_thunder), reeve(voice=med_horn_charge), castellan(voice=med_bell) |
| `monster_dragon` | 3 | pageant_dragon(shoot=None, voice=med_troll_groan, step=med_hoof_thunder#hit), wyvern(voice=med_dragon_roar_far), cinderwyrm |
| `foot_mace` | 1 | billman |
| `foot_pole` | 1 | pikeman |
| `archer_long` | 2 | longbowman, poacher |
| `swarm_fork` | 1 | peasant_levy |
| `beast_hog` | 1 | great_hog |
| `archer_xbow` | 1 | crossbowman |
| `siege_engine` | 4 | springald(shoot=ballista_twang), trebuchet, mangonel(shoot=med_fire_whoosh), lady_counterweight(voice=med_trebuchet_groan) |
| `siege_keep` | 1 | rolling_keep |
| `support_bell` | 2 | bellringer, abbess |
| `support_heal` | 3 | physician, apothecary(shoot=med_gas_hiss), plague_cart(voice=med_cart_squeak, step=med_hoof_thunder#hit) |
| `siege_ram` | 1 | battering_ram |
| `swarm_hoard` | 1 | hoardling |
| `monster_gold` | 1 | coin_golem |
| `monster_troll` | 1 | bridge_troll |

**Modern**

| archetype | units | unit ids (overrides in parentheses) |
|---|---|---|
| `inf_rifle` | 2 | tin_hat_trooper, clerk_rifleman |
| `veh_wheeled` | 2 | toast_rack_runabout, lunchbox_apc |
| `veh_tank` | 1 | biscuit_tank |
| `veh_heavy` | 2 | teapot_heavy, grand_teapot |
| `inf_pistol` | 1 | signal_officer |
| `veh_gun` | 5 | mortar_pair, filing_howitzer(shoot=mod_howitzer_thump), final_notice(shoot=mod_howitzer_thump, voice=mod_pa_chime), wheelbarrow_cannon(shoot=mod_cannon_bonk, voice=mod_trolley_squeak, step=mod_machine_bed), tripod_mg_team(shoot=mod_mg_stutter) |
| `inf_hero` | 2 | deputy_director, chief_spokesperson(voice=mod_loudspeaker_squelch) |
| `veh_air` | 4 | hobby_drone(shoot=mod_rifle_pop#pea, voice=mod_propeller_toy), fishbowl_chopper, spotter_balloon(shoot=None, voice=mod_balloon_pop), chandelier_gunship(shoot=mod_rocket_whoosh) |
| `inf_launcher` | 2 | parasol_missileer, drainpipe_launcher |
| `inf_melee` | 3 | caution_sapper(voice=mod_mine_blip), hoarding_bearer, spanner_mechanic(voice=mod_girder_clang) |
| `veh_ram` | 2 | dozer_plough(voice=mod_plough_rumble), trolley_rammer |
| `inf_thrower` | 1 | dynamite_thrower |
| `inf_support` | 1 | site_first_aider |
| `inf_pea` | 1 | flowerpot_peashooter |
| `veh_mower` | 2 | ride_on_mower, grand_mower(voice=mod_pull_cord) |
| `inf_sniper` | 1 | long_lens_sharpshooter |
| `inf_smg` | 1 | cub_reporter |
| `monster_behemoth` | 1 | broadcast_behemoth(voice=mod_loudspeaker_squelch) |

**Sci-Fi**

| archetype | units | unit ids (overrides in parentheses) |
|---|---|---|
| `inf_pulse` | 1 | tidy_trooper |
| `inf_melee` | 3 | bulwark_warden(swing=sf_dome_block), wrench_runner, greeter_unit(voice=sf_welcome_chime) |
| `inf_support` | 4 | bubble_tender, zapper_tinker(shoot=None, voice=sf_emp_burst#emp), warranty_tech(shoot=None, voice=sf_servo_whine), spore_shepherd(shoot=None, voice=sf_spore_puff) |
| `mach_hover` | 2 | dustpan_hover, shush_bike(shoot=None, swing=kick_whoomp) |
| `mach_drone` | 2 | spritz_medic(voice=sf_spore_puff), valet_drone(shoot=sf_pulse_burst#valet) |
| `inf_hero` | 2 | grand_housekeeper(voice=sf_welcome_chime), maitre_deluxe(shoot=sf_pulse_burst#valet) |
| `inf_rivet` | 1 | rivet_gunner |
| `mach_vehicle` | 2 | junk_buggy, refund_crawler |
| `mach_gun` | 1 | salvo_cart |
| `mach_mech` | 2 | rustbucket_rex(shoot=sf_rivet_chatter#rocket, voice=sf_truck_horn), grand_concierge(shoot=sf_rail_crack, voice=sf_bell) |
| `alien_swarm` | 3 | skitterling, mandible_runner, plate_beetle |
| `alien_ranged` | 2 | acid_spitter, thorn_slinger(shoot=sf_rivet_chatter#chatter) |
| `alien_air` | 2 | glidewing, void_manta(shoot=sf_manta_hum, voice=sf_manta_hum) |
| `alien_monster` | 3 | hive_queen, bloom_stomper, elder_hummock(voice=sf_titan_roar_soft) |
| `alien_beast` | 1 | glow_grazer |
| `inf_stealth` | 1 | veil_cutter |
| `inf_blink` | 1 | hop_notary |
| `inf_rail` | 1 | silent_signer |

The shared Ancient families the profiles name on purpose (declared in `manifest.sharedAudio` so UC-40 accepts them): `death_male`, `death_oof`, `death_big`, `death_animal`, `taunt`, `swing_light`, `swing_heavy`, `spear_thrust`, `hit_blade`, `hit_pierce`, `hit_blunt`, `hit_flesh_light`, `kick_whoomp`, `goat_bleat`, `stinger_hero_down`, `heal_chime`, `buff_power`, `block_shield`, `net_throw`, `hound_bark`, `cheer_small`, `horse_neigh`, `crowd_cheer_big`, `fire_ignite`, `step_grass`, `step_sand`, `step_snow`, `step_dirt`, `step_mud`, `step_wood`, `boulder_impact`, `wood_crack`, `ballista_twang`, `catapult_launch`, `ui_error`, `ui_select`, `ui_drop`.

#### 3.11.6 ABILITY_CUES and CC_BY_SPECIES additions (generated)

`ability_cast` looks the ability id up in the era table first and falls back to the Ancient table; a `null` row means silent on purpose (the sound is the event: `mag`, `reload`, `turret`, `mine_immune`, `eshield`, `cavalry`, `suppress`).

| era | ABILITY_CUES additions (ability id -> cue) |
|---|---|
| Medieval | `summon_on_death`->`med_horse_neigh_chorus`, `bailout`->`med_dust_whump`, `banner`->`med_banner#raise`, `aura`->`buff_power`, `dash`->`kick_whoomp`, `lance`->`med_lance_shatter`, `fire_panic`->`med_fire_whoosh`, `rally`->`cheer_small`, `hook`->`net_throw`, `pack_bonus`->`hound_bark`, `war_horn`->`med_horn_charge`, `bull_charge`->`goat_bleat`, `stance`->`block_shield`, `pavise`->`med_brace_thunk`, `misfire`->`med_wood_split`, `call_strike`->`med_oil_sizzle`, `oil`->`med_oil_sizzle`, `stun`->`med_bell`, `heal_pulse`->`heal_chime`, `poison`->`med_gas_hiss`, `dot_cloud`->`med_gas_hiss`, `rage`->`buff_power`, `net`->`net_throw`, `fire_every`->`med_trebuchet`, `cluck`->`med_purse_jingle`, `confuse`->`med_troll_groan`, `kick`->`med_wing_whomp`, `scare`->`med_dragon_roar`, `mag`->silent, `reload`->silent, `knight_afoot`->silent |
| Modern | `bailout`->`mod_helmet_bonk#machine`, `turret`->silent, `summon_on_death`->`mod_blast#s`, `call_strike`->`mod_radio_squelch`, `smoke`->`mod_pop_family`, `lay_mine`->`mod_mine_blip`, `mine_immune`->silent, `shield`->`block_shield`, `heal_pulse`->`heal_chime`, `misfire`->`mod_cannon_bonk`, `rage`->`mod_engine_roar`, `setup`->`mod_reload_clack`, `suppress`->silent, `confuse`->`mod_loudspeaker_squelch` |
| Sci-Fi | `eshield`->silent, `aura`->`buff_power`, `recharge`->`sf_shield_pop#recharge`, `heal_pulse`->`heal_chime`, `detect`->`sf_scan_ring`, `call_strike`->`sf_orbital_charge`, `discipline`->`sf_welcome_chime`, `dash`->`kick_whoomp`, `lunge`->`kick_whoomp`, `cc_field`->`sf_emp_burst#emp`, `emp`->`sf_emp_burst#emp`, `bailout`->`sf_shield_pop#pop`, `setup`->`sf_rivet_chatter#rocket`, `stomp`->`sf_mech_step#step`, `overclock`->`sf_power_down_hum`, `taunt`->`sf_booth_chirp`, `turret`->silent, `confuse`->`sf_welcome_chime`, `cavalry`->silent, `summon_on_death`->`sf_alien_goo#chitter`, `scare`->`sf_queen_screech`, `dot_cloud`->`sf_spore_puff`, `gas`->`sf_spore_puff`, `cloak`->`sf_cloak_shimmer`, `blink`->`sf_blink_pop` |

`cc_field` is species-dispatched through `CC_BY_SPECIES` (additions):

| era | CC_BY_SPECIES additions (unit id -> cue) |
|---|---|
| Medieval | `bellringer`->`med_bell`, `abbess`->`med_bell#large`, `bridge_troll`->`med_troll_groan`, `cinderwyrm`->`med_dragon_roar` |
| Modern | `broadcast_behemoth`->`mod_loudspeaker_squelch` |
| Sci-Fi | `zapper_tinker`->`sf_emp_burst#emp`, `greeter_unit`->`sf_welcome_chime`, `maitre_deluxe`->`sf_welcome_chime`, `grand_concierge`->`sf_bell` |

#### 3.11.7 God powers, set-pieces, boss entrances

`god_power.kind` is the power id; the router looks up `GOD_CUES[kind]` (a sequence of `(delay s, cue#tag, volume)` played with `duck('music', -4, 800)` as today) before the legacy Ancient switch. `sf_orbital_clean` starts the exact 2.000 s charge, waits 0.15 s and fires the strike; `obeys R16` is RENDER's flash limiter and is unrelated to audio level.

| power id (god_power.kind) | cue id | sequence (t s: cue) | design intent |
|---|---|---|---|
| `med_royal_volley` | `med_cue_volley` | 0.00:med_longbow_volley#flutter 0.80:med_longbow_volley#patter 1.00:med_sword_on_plate | a soft collective flutter overhead then a patter of thuds, tink on plate; no thunder |
| `med_bell_drop` | `med_cue_bell_drop` | 0.00:med_shell_whistle 1.60:med_bell#huge 1.75:med_wall_collapse | rising whistle, one huge round DONG, clatter of rubble; same timbre as the Bellringer |
| `med_mud_season` | `med_cue_mud` | 0.00:med_rain_hush 0.30:med_step_mud 1.60:med_gloop | heavy rain on mud, squelchy steps, one low gloop; med_step_mud swaps in for units inside |
| `med_soup_cart` | `med_cue_soup` | 0.00:med_cart_squeak 0.50:med_armour_step 0.90:med_gas_hiss 1.20:heal_chime | wheel creak, ladle clink, long contented steam hiss; a tiny chime per heal tick (shared heal_chime) |
| `med_precedence_dispute` | `med_cue_precedence` | 0.00:med_trumpet_crack 0.50:med_wood_groan 0.90:med_sneeze_chorus | trumpet fanfare that fails to resolve, creaking joints, polite coughing; no magic shimmer |
| `med_audience_joins` | `med_cue_audience` | 0.00:crowd_cheer_big 0.30:med_step_cobble 1.20:med_kazoo_blat | roaring cheer, boots on turf, one kazoo blat |
| `mod_gp_ricochet_request` | `mod_cue_ricochet` | 0.00:mod_rifle_pop#rifle 0.18:mod_plink_tink#tink 0.36:mod_plink_tink#tink 0.54:mod_plink_tink#tink 0.72:mod_mine_blip_boing#boing | a cap-gun pop then four rising plinks, the last a very small boing |
| `mod_gp_strafing_run` | `mod_cue_strafe` | 0.00:mod_whistle 0.40:mod_rotor_flyby 1.20:mod_blast#m 1.35:mod_blast#m 1.50:mod_blast#m 1.65:mod_blast#m 1.80:mod_blast#m | high thin whistle, toy-jet flyover, five whump-and-tin-clatter impacts; blast_med not a film explosion |
| `mod_gp_minefield_gift` | `mod_cue_gift` | 0.00:mod_tape_unroll 0.60:mod_pop_family 1.00:mod_mine_blip_boing#blip | tape unrolling, ribbon ping, the same patient mine blip |
| `mod_gp_tea_break` | `mod_cue_tea` | 0.00:mod_pen_click 0.30:mod_kettle_whistle 0.90:mod_trolley_squeak 1.30:mod_typewriter_ding | kettle click, pour, wheel squeak, spoon ting; tiny heal_chime per tick; pen-click ends the cooldown |
| `mod_gp_please_hold` | `mod_cue_hold` | 0.00:mod_phone_ring 0.90:mod_hold_music_sting | phone ring, two bars of lounge vibraphone, polite voice-less melody; music ducks 3 dB as the circle opens |
| `mod_gp_express_delivery` | `mod_cue_delivery` | 0.00:mod_doorbell 0.50:mod_stamp_thud 0.90:mod_pop_family 1.30:mod_kazoo_blat | doorbell, cardboard thud, six small parachute flaps, a kazoo ta-da |
| `sf_arc_tickle` | `sf_cue_arc` | 0.00:sf_pulse_burst 0.15:sf_blink_pop#target 0.30:sf_blink_pop#target 0.45:sf_blink_pop#target 0.60:sf_blink_pop#target 0.75:sf_shield_pop#pop | bright zzt and four rising tk hops, the last a very small boing; no thunder |
| `sf_orbital_clean` | `sf_cue_orbital` | 0.00:sf_orbital_strike#charge 2.15:sf_orbital_strike#strike | EXACTLY 2.0 s charge, 0.15 s of silence, then KRAAA-THOOM; music ducks 6 dB; obeys the R16 flash limiter |
| `sf_gravity_burp` | `sf_cue_burp` | 0.00:sf_earth_rumble 0.30:sf_slide_up | soft sub drop, slide whistle up, a tiny hiccup per pulse |
| `sf_nano_spritz` | `sf_cue_spritz` | 0.00:sf_spore_puff 0.40:sf_spore_puff 0.80:sf_spore_puff 1.00:heal_chime 1.20:sf_shield_pop#recharge | spray fsst x3, ascending chime per healed unit (thinned), bubble ting per refilled shield |
| `sf_off_switch` | `sf_cue_offswitch` | 0.00:sf_stamp_rated 0.40:sf_emp_burst#emp 1.00:sf_emp_burst#emp 1.60:sf_emp_burst#emp 2.20:sf_emp_burst#emp | big mechanical clunk, the emp pulse four times each followed by one pdddt on the nearest machine only |
| `sf_grazer_drop` | `sf_cue_grazer_drop` | 0.00:sf_spore_puff 0.08:sf_spore_puff 0.16:sf_spore_puff 0.24:sf_spore_puff 0.32:sf_spore_puff 0.40:sf_spore_puff 0.90:step_goo 1.00:step_goo 1.10:step_goo 1.20:step_goo 1.30:step_goo 1.40:step_goo 1.70:sf_bell 2.20:sf_grazer_baa | six soft parachute fwups, six thuds, a doorbell, a collective unimpressed baa |

`setpiece {piece, x, z}` and `script_beat {beat:'boss_enters', def}` go through one dispatcher: duck music -6 dB for 700 ms, play the stinger at t0 (`sting` template), play the sfx list staggered by 0.12 s from t0 + 0.2 s, and hand the announcer line to the announcer queue after the stinger's first beat (priority 5, bypass alternation, M-owned). Esc skips the shot: `stopVoice` on the stinger and its sfx voices. A mission's set-piece rows are `ensure`d at `battle_start` (`bank.ensureSetpiece(ids)`) so Potato and Papyrus tiers have the stinger decoded before the shot. Boss stingers for Survival entrances: `BOSS_STINGER[era][def]` (below).

**Medieval set-pieces**

| piece id (setpiece.piece) | stinger | sfx (staggered 0.12 s) |
|---|---|---|
| `med_sp_wrong_cue` | `med_sting_wrong_cue` | `med_trumpet_crack`, `med_hoof_thunder`, `med_lance_shatter`, `med_lance_shatter`, `med_lance_shatter`, `med_crowd_ooh` |
| `med_sp_colours_down` | `med_sting_colours_down` | `med_banner#fall`, `med_bell#large`, `med_crowd_gasp`, `med_hoof_thunder` |
| `med_sp_brace_break` | `med_sting_brace` | `med_brace_thunk`, `med_brace_thunk`, `med_brace_thunk`, `med_brace_thunk`, `med_splash_big`, `med_horse_neigh_chorus`, `med_crowd_ooh` |
| `med_sp_lance_chorus` | `med_sting_charge` | `med_lance_shatter`, `med_lance_shatter`, `med_lance_shatter`, `med_lance_shatter`, `med_lance_shatter`, `med_hoof_thunder`, `med_horn_charge`, `med_sheep_bleat_far` |
| `med_sp_gate_falls` | `med_sting_breach` | `med_ram_gate_boom`, `med_wood_split`, `med_chain_rattle`, `med_wall_collapse`, `med_dust_whump` |
| `med_sp_great_sniffle` | `med_sting_plague` | `med_bell#large`, `med_gas_hiss`, `med_sneeze_chorus`, `med_cart_squeak` |
| `med_sp_windmill_blaze` | `med_sting_fire` | `med_fire_whoomph`, `med_fire_crackle`, `med_wood_crack`, `med_crowd_gasp` |
| `med_sp_dragon_shadow` | `med_sting_dragon_shadow` | `med_dragon_roar_far`, `med_wing_whomp` |
| `med_sp_lady_arrives` | `med_sting_lady` | `med_trebuchet_groan`, `med_counterweight_whump`, `med_shell_whistle`, `med_wood_groan` |
| `med_sp_bridge_drop` | `med_sting_troll` | `med_boulder_impact`, `med_wall_collapse`, `med_splash_big`, `med_troll_groan` |
| `med_sp_dragon_wakes` | `med_sting_dragon` | `med_dragon_roar`, `med_wing_whomp`, `med_masonry_fall`, `med_fire_whoosh` |
| `med_sp_dennis_meets_dragon` | `med_sting_finale` | `med_dragon_sniff`, `med_kazoo_blat`, `med_crowd_gasp` |

**Modern set-pieces**

| piece id (setpiece.piece) | stinger | sfx (staggered 0.12 s) |
|---|---|---|
| `mod_sp_live_fire` | `mod_stg_whistle_snare` | `mod_loudspeaker_squelch`, `mod_whistle`, `mod_popup_clack`, `mod_confetti_pop` |
| `mod_sp_picnic_hamper` | `mod_stg_clarinet_sting` | `mod_cork_pop`, `mod_paper_rustle`, `mod_sandwich_splat`, `mod_sandwich_splat`, `mod_sandwich_splat`, `mod_leaf_rustle` |
| `mod_sp_over_the_top` | `mod_stg_whistle_drumroll` | `mod_whistle`, `mod_whistle`, `mod_whistle`, `mod_smoke_pop`, `mod_smoke_pop`, `mod_smoke_pop`, `mod_smoke_pop`, `mod_boots_planks`, `mod_bugle_wrong` |
| `mod_sp_wrecking_toll` | `mod_stg_brass_stab_boom` | `mod_plough_rumble`, `mod_girder_clang`, `mod_rail_snap`, `mod_rail_snap`, `mod_rail_snap`, `mod_reversing_beep` |
| `mod_sp_boxcar_chain` | `mod_stg_fireworks` | `mod_firework_rocket`, `mod_firework_rocket`, `mod_firework_rocket`, `mod_firework_rocket`, `mod_party_horn`, `mod_party_horn`, `mod_party_horn`, `mod_wagon_pop`, `mod_confetti_pop` |
| `mod_sp_behemoth_dish` | `mod_stg_hold_music` | `mod_tower_buzz`, `mod_phone_ring` |
| `mod_sp_hold_music` | `mod_stg_hold_music` | `mod_phone_ring`, `mod_rotor_flyby`, `mod_tower_buzz`, `mod_hold_music_sting` |
| `mod_sp_flypast` | `mod_stg_bigband_sting` | `mod_rotor_flyby`, `mod_runway_horn`, `mod_pa_chime`, `mod_propeller_toy` |
| `mod_sp_pellmell_falls` | `mod_stg_bigband_sting` | `mod_pa_chime` |
| `mod_sp_landing_barge` | `mod_stg_engine_rev_brass` | `mod_ramp_slam`, `mod_pull_cord`, `mod_engine_roar`, `mod_gull_far` |
| `mod_sp_dam_gate` | `mod_stg_full_fanfare` | `mod_gate_groan`, `mod_water_rush`, `mod_teapot_whistle`, `mod_stamp_thud` |
| `mod_sp_chandelier_enters` | `mod_stg_bigband_sting` | `mod_rotor_flyby`, `mod_propeller_toy` |

**Sci-Fi set-pieces**

| piece id (setpiece.piece) | stinger | sfx (staggered 0.12 s) |
|---|---|---|
| `sf_sp_lunch_served` | `sf_stg_klaxon` | `sf_dome_crack`, `sf_airlock_hiss`, `sf_siren_short` |
| `sf_sp_magma_hiccup` | `sf_stg_magma` | `sf_lava_bloop`, `sf_hover_whine`, `sf_geyser_roar` |
| `sf_sp_meltdown_cafe` | `sf_stg_meltdown` | `sf_reactor_overload`, `sf_shield_chain_pop`, `sf_mech_topple` |
| `sf_sp_rex_wakes` | `sf_stg_rex_horn` | `sf_stilt_creak`, `sf_truck_horn` |
| `sf_sp_rolling_blackout` | `sf_stg_blackout` | `sf_power_down_hum`, `sf_cloak_shimmer`, `sf_shush_whisper` |
| `sf_sp_please_hold` | `sf_stg_buzzkill` | `sf_emp_burst`, `sf_robot_powerdown`, `sf_hold_music_snippet` |
| `sf_sp_mech_stomp_reveal` | `sf_stg_mech_steps` | `sf_mech_step_boom`, `sf_servo_whine`, `sf_welcome_chime` |
| `sf_sp_hill_wakes` | `sf_stg_awaken` | `sf_earth_rumble`, `sf_spore_burst`, `sf_titan_roar_soft` |
| `sf_sp_noise_complaint` | `sf_stg_manta` | `sf_manta_hum`, `sf_orbital_charge`, `sf_sonic_shush` |
| `sf_sp_hull_breach` | `sf_stg_finale` | `sf_hull_breach`, `sf_alarm_red`, `sf_queen_screech` |
| `sf_sp_queen_rise` | `sf_stg_queen_rise` | `sf_queen_screech` |
| `sf_sp_buffering` | `sf_stg_buzzkill` at -3 dB | `sf_emp_burst`, `sf_servo_whine` |

Boss entrance stingers: Medieval `lady_counterweight` -> `med_sting_lady`, `bridge_troll` -> `med_sting_troll`, `cinderwyrm` -> `med_sting_dragon`, `great_hog` -> `med_sting_hog`, `rolling_keep` -> `med_sting_keep`; Modern `grand_teapot` -> `mod_stg_brass_stab_boom`, `broadcast_behemoth` -> `mod_stg_hold_music`, `chandelier_gunship` -> `mod_stg_bigband_sting`, `grand_mower` -> `mod_stg_engine_rev_brass`, `final_notice` -> `mod_stg_full_fanfare_low`; Sci-Fi `rustbucket_rex` -> `sf_stg_rex_horn`, `grand_concierge` -> `sf_stg_mech_steps` (alias `sf_stg_concierge_steps`), `elder_hummock` -> `sf_stg_awaken`, `void_manta` -> `sf_stg_manta`, `hive_queen` -> `sf_stg_queen_rise`.

#### 3.11.8 Event handlers (generated) and the mechanic to cue table

The handlers below are added to `H` in `cues.js`; fields are those of `core/events.js` plus spec/M 3.12 and spec/MS H5/H6. Events that do not exist in HEAD (`banner_fall`, `prop_ignited`, `air_landed`, `beam_lock_telegraph`) are requests (OI-AU2); the handler is written against the documented payload and is inert until the event exists, and `cue_trace` drives it with a constructed payload.

| event | source | handler |
|---|---|---|
| `projectile_launch` | M +src srcDef round | order: AUDIO_PROFILES[srcDef].shoot, PROJ_AUDIO[kind or alias], legacy switch (Ancient kinds only); burst rows play when round % burst == 0; telegraph kinds start the whistle aligned to impact |
| `projectile_hit` | existing | PROJ_AUDIO[kind].hit.{unit,ground,shield}; firearms and beams have null rows (the hit is unit_hit/unit_deflect) |
| `unit_hit` | existing +ap armor face (MS H5) | profile order: attacker hit[type] -> target mat table; the existing armor branch is replaced by MAT_CUES[dst.mat] for new-era defs only |
| `unit_deflect` | M1 | outcome bounce -> tink (Modern/Sci-Fi hull) or ping (Medieval); glance -> bonk; <= 1 per unit per 0.25 s at the source; mixer cooldown 20 ms, 10 voices |
| `unit_flanked` | M8 | side/rear -> bonk at the unit (Modern/Sci-Fi); Medieval silent |
| `unit_suppressed` | M2 | Modern: mod_pin_thunk within 45 u and mod_bullet_snap (p 0.6) within 30 u of the listener; others silent |
| `unit_reload` | M2 | Modern mod_reload_clack within 35 u; Medieval crossbow med_xbow_crank within 25 u (2.6 s tell); Sci-Fi silent (energy) |
| `unit_cover` | M9 | Modern: soft pad thud (mod_pin_thunk at vol 0.35 pitch 0.8) within 25 u |
| `unit_air_state` | M7 (M-layers) | Sci-Fi sf_manta_hum / hover whine flyby on state cruise->strafe; Medieval dragon: med_wing_whomp on take-off; Modern: rotor flyby |
| `strike_call` | M10 | telegraph audio: shell/airstrike -> the whistle cue aligned to impact (start = impact - length); orbital -> sf_orbital_charge (2.0 s); mod/sf call_strike also fires the ability cue |
| `telegraph` | existing | kind shell/strike_call as above; other kinds unchanged |
| `explosion` | existing + new kinds | EXPLOSION_AUDIO[era][kind][size by r]; Ancient kinds keep the frozen branches (fire, lightning, magic, default rubble) |
| `terrain_edit` | M12 | Medieval op collapse: med_masonry_fall (1 per 1.5 s, cull 130 u); others silent (the crater event carries the sound) |
| `capture_update` | M14 | on owner change only: Medieval bell small, Modern typewriter ding, Sci-Fi welcome chime; router keeps last owner per point |
| `weather_change` | M14 | refresh arenaInfo ambience layers; ion_storm adds thunder_crack one-shots every 35-60 s |
| `script_beat` | M14 | SCRIPT_BEAT_AUDIO[beat]; boss_enters {def} plays BOSS_STINGER[era][def] via the set-piece path; silent otherwise |
| `setpiece` | M14 | SETPIECE[era][piece]: duck music -6 dB 700 ms, stinger at t0, sfx list staggered 0.12 s, announcer queued after the stinger first beat (priority 5, bypass alternation); Esc skip stops the stinger tail (stopVoice) |
| `unit_blink` | M13 | sf_blink_pop #origin at (x0,z0), #target at (x1,z1) +0.05 s |
| `unit_withdraw` | M-layers 3.6.6 (OI-L1) | an air unit leaves the field: Medieval med_wing_whomp, Modern mod_rotor_flyby, Sci-Fi sf_blink_pop #origin, at 0.6 of the family volume (EVENT_DIRECT) |
| `air_remnant` | M-layers 3.6.6 (OI-L1) | stages 1-3 of the air remnant clock carry text barks (spec/H); no cue by design, the event is listed in IGNORED_EVENTS so cue_trace accepts it |
| `unit_bailout` | M13 | Modern lid pop #machine; Medieval horse falls: horse_neigh + med_dust_whump; Sci-Fi sf_shield_pop #pop (hatch) |
| `unit_wreck` | M17e | Modern mod_blast m + mod_glass_pop; Sci-Fi mech: sf_mech_topple, else sf_blast m; Medieval siege: med_wall_collapse (small) |
| `mine_laid` | M11 | owner only inside the near camera: mod_mine_blip |
| `mine_trigger` | M11 | mod_mine_boing then EXPLOSION_AUDIO.mine |
| `shield_hit` | M4 | sf_shield_hit pitch 0.8 + 0.4*(left/cap); gate 3 per 100 ms in the frustum; bubble bed above 12 visible bubbles |
| `shield_break` | M4 | sf_shield_pop #pop |
| `shield_recover` | M4 | sf_shield_pop #recharge |
| `unit_cloak` | M5 | sf_cloak_shimmer: on=1 pitch 1.15, on=0 pitch 0.85, why=attack snap pitch 1.5 and 0.2 s |
| `emp_pulse` | M6b | sf_emp_burst #emp, duck music -3 dB |
| `emp_hit` | M6b | sf_emp_burst #powerdown at the unit, thinned to 3 per second |
| `beam` | M2 | hitscan kinds: PROJ_AUDIO[kind].shoot at (x0,y0,z0) |
| `hazard_trigger` | existing | kind mine -> handled by mine_trigger (no double play); other kinds unchanged |
| `banner_fall` | MS H5 (NEW event requested) | med_banner #fall + crowd aww; allies >= 6 also med_bell #large (the colours-down gag) |
| `prop_ignited` | MS H6 (NEW event requested) | Medieval: med_fire_whoomph; other eras: fire_ignite (shared) |
| `unit_brace` | existing | Medieval: med_brace_thunk (rate: 1 per 120 ms per block via cooldown); Ancient unchanged (block_shield pitch 0.75) |
| `prop_damaged` | existing (hpFrac) | gate props: stage crossing at hpFrac 0.66 and 0.33 plays med_ram_gate #twang; every ram hit plays #boom |
| `air_landed` | MS A5 (NEW event requested) | Medieval dragon landing: med_dust_whump + med_wing_whomp |
| `unit_kill` | existing + 8 causes | profile death[cause] -> death[default]; CAUSE_SCREAM new causes = 0; gore auto (PC8) never plays a scream in new eras |
| `ground_shake` | requested | Sci-Fi mech step boom with camera shake 1 percent: the shake is RENDER, the sound is sf_mech_step triggered by the unit step cadence (footstep tick with profile.step), NOT a new event (rejected: no sim event needed) |

Mechanic to cue (q1_content Q31; every audible mechanic has a row, silent ones say why):

| mechanic | events | cue(s) | backing |
|---|---|---|---|
| M1 armour deflect (bounce) | unit_deflect | mod_plink_tink#tink / sf_hull_tink / helmet_ping_1 (Medieval shared) | asset |
| M1 armour deflect (glance / flank) | unit_deflect, unit_flanked | mod_plink_tink#bonk / sf_hull_tink | asset |
| M2 burst fire | projectile_launch.round | burst rows | asset |
| M2 reload | unit_reload | mod_reload_clack / med_xbow_crank | asset (Sci-Fi silent: energy cell, reason recorded) |
| M2 suppression | unit_suppressed | mod_pin_thunk + mod_bullet_snap | asset (bullet_snap is processed/synth, declared) |
| M2 hitscan beam | beam | sf_rail_crack / sf_pulse_burst#valet / mod_sniper_crack | asset |
| M4 energy shield | shield_hit, shield_break, shield_recover | sf_shield_hit, sf_shield_pop | asset |
| M5 cloak | unit_cloak | sf_cloak_shimmer | asset (one recorded shimmer, declared) |
| M6b EMP | emp_pulse, emp_hit | sf_emp_burst | asset |
| M7 air layer | unit_air_state | sf_hover_hum flyby / mod_machine_bed flyby / med_wing_whomp | asset |
| M8 flanking / facing | unit_flanked | bonk | asset |
| M9 cover | unit_cover | pad thud | asset (alias, no new row) |
| M10 indirect fire telegraph | strike_call, telegraph | mod_shell_whistle (2.2 s) / sf_orbital_charge (2.0 s) / med_shell_whistle | synth/asset, exact length |
| M11 mines | mine_laid, mine_trigger | mod_mine_blip_boing | asset |
| M12 breach / gates / structures | prop_damaged, terrain_edit, prop_destroyed | med_ram_gate, med_wall_collapse | asset |
| M13 abilities (banner, bailout, blink, aura) | ability_cast, banner_fall, unit_bailout, unit_blink | ABILITY_CUES_NEW | asset |
| M14 capture / weather / beats / set-pieces | capture_update, weather_change, script_beat, setpiece | chime, ambience layer, dispatcher | asset |
| M15 god powers | god_power | GOD_CUES sequences | asset |
| M17e wrecks / crash | unit_wreck | blast + topple | asset |
| M3 morale / rout statuses | unit_rout, status_apply (suppress emp cloak shielddown) | existing cheer/groan unchanged; status suppress -> no sound (pin thunk is the event); status emp -> powerdown (covered by emp_hit) | silent by design (reason recorded) |

**Telegraph alignment.** `strike_call {delay}` with `kind shell|airstrike` starts `mod_shell_whistle` (2.200 s) or `med_shell_whistle` so that its end coincides with impact: `startAt = tImpact - 2.2`; if `delay < 2.2` the cue starts immediately with `offset = 2.2 - delay` into the sprite (`start(ts, s0 + offset, n - offset)`); if `delay > 2.2` it starts at `tImpact - 2.2`. Orbital: `sf_orbital_strike#charge` is 2.000 s with the same rule. The sprite lengths are asserted: `n = 97,020` (2.200 s) and `88,200` (2.000 s) +-220 samples (5 ms).

**ShooterWindow.** Ring buffer of the last 64 `(t, src)` pairs from `projectile_launch` and `beam` events inside 60 u of the listener (cull radius `deps.listener()`); `count(t)` = distinct `src` ids with `t - 1.5 < t_i <= t`. Until M2 lands `src`, the key is the 2 u cell `floor(x/2) * 4096 + floor(z/2)` of the launch point (documented fallback, test-covered).

**Aggregate beds (BedManager).** All numbers are the initial values; `mixtest` may move an `on` threshold inside the stated range, the final values are recorded in the matrix before AU8 closes.

| bed | era | metric | on / off | range for tuning | behaviour |
|---|---|---|---|---|---|
| gunfire | Modern | `ShooterWindow` distinct shooters | 24 / 16 | 16-40 | granular crackle from the `mod_rifle_pop` rows (pitch 0.85-1.15, low-pass 5 kHz, random pan, vol -6 dB below the class): 6 to 24 grains per second by `smoothstep(24, 80, S)`; individual pops allowed at most 2 per 100 ms (token bucket refill 20 per second) once `S >= 12` |
| laser | Sci-Fi | `ShooterWindow` | 40 / 28 | 30-60 | same scheduler over `sf_pulse_burst` rows, 6 to 20 grains per second by `smoothstep(40, 100, S)`; individual bursts 2 per 100 ms |
| bubble | Sci-Fi | visible shielded units within 60 u | 12 / 8 | 8-20 | absorb ticks (`sf_shield_hit`) become a soft rain of grains at pitch 1.3-1.8, vol -9 dB, 4 to 14 per second; individual absorb gate 3 per 100 ms always |
| hoof | Medieval | cavalry moving inside 50 u (existing `tick()` loop already counts mounted units) | 6 / 4 | 4-10 | two crossfading `med_hoof_thunder#loop` voices, gain `clamp((C-4)/16, 0, 1) * 0.9`; per-unit gallop cues suppressed while on |
| pole | Medieval | braced pikemen (`unit_brace` state) inside 50 u | 20 / 12 | 12-30 | `med_brace_thunk#bed` loops, gain `clamp((P-12)/30, 0, 1) * 0.7`; thunk rate-limit 120 ms per block |
| machine | Modern, Sci-Fi | moving vehicles / hover units inside 50 u by layer | per layer 1 / 0 | prototype-set | wheel, tread, rotor (Modern) and hum, servo (Sci-Fi) layers: gain `log2(1 + N) / 4` per layer, at most 3 voices, flyby sprites on `unit_air_state` changes |

Hysteresis: a bed turns on when its metric is >= `on` for 0.5 s and off when it is < `off` for 1.5 s; fades 0.4 s in, 1.2 s out. Voices: gunfire + laser + bubble use grains through the normal voice manager (so the 32-voice budget and priority steal still apply); the BedManager reserves 4 of the 8 ambience slots.

**Vehicle bed prototype (before commit).** `tools/bed_proto.mjs` renders, offline, N = 1, 4, 12 and 30 machines of each layer from the matrix rows with the BedManager gains; pass criteria: (1) bed LUFS-S rises monotonically by 5 to 9 dB from N = 1 to N = 12 and by < 2 dB from 12 to 30; (2) no periodicity artefact: autocorrelation peak of the sum at lags 0.5-6 s <= 0.6 of the single loop's; (3) every loop seam <= 0.02 FS after MP3 decode; (4) peak voices <= 3 and render CPU <= 2 percent of a core on the Chromium test machine. If any fails, the bed falls back to the synth bed (`bed_machine_*` recipes: hum 90-140 Hz with flutter) and the loop rows stay as flybys only. Owner AUDIO, phase P2 before the Modern/Sci-Fi vehicle units land.

#### 3.11.9 Footsteps, heavy steps, UI cues per era

`MATERIALS[m].foot` (W 3.4.5) is one of the existing 7 keys plus `gravel metal tile dust` (`ice` maps to `snow`). `footstep(material)` and the `tick()` bed use `ERA_STEP[era][foot]`; `tick()` heavy steps (`elephant_step`/`horse_gallop` today) use `ERA_HEAVY[era]`; `audio.ui(name)` uses `UI_BY_ERA[era][name]` before the Ancient `UI_CUES`. Arenas without `env.era` use the legacy `STEP_BY_BIOME` exactly as today.

| foot key | Medieval | Modern | Sci-Fi |
|---|---|---|---|
| `grass` | `step_grass` | `step_grass` | `sf_step_moss` |
| `stone` | `med_step_cobble` | `step_concrete` | `step_regolith` |
| `sand` | `step_sand` | `step_sand` | `step_dust` |
| `snow` | `step_snow` | `step_snow` | `step_snow` |
| `mud` | `med_step_mud` | `step_mud` | `step_goo` |
| `dirt` | `step_dirt` | `step_dirt` | `step_dust` |
| `wood` | `step_wood` | `step_wood` | `step_wood` |
| `gravel` | `med_step_scree` | `step_asphalt` | `step_regolith` |
| `metal` | `med_armour_step` | `step_metal` | `sf_step_hull` |
| `tile` | `med_step_cobble` | `step_tile` | `step_neon` |
| `dust` | `step_dirt` | `step_dirt` | `step_dust` |

| UI helper | Medieval | Modern | Sci-Fi |
|---|---|---|---|
| `hover` | `med_quill_scratch` | `mod_stapler_tick` | `sf_ui_tick` |
| `click` | `med_stamp_thump` | `mod_stamp_thud` | `sf_ui_bwip` |
| `confirm` | `med_stamp_brass` | `mod_typewriter_ding` | `sf_ui_ting` |
| `back` | `med_page_rustle` | `mod_stamp_thud` | `sf_ui_bwip` |
| `error` | `ui_error` | `ui_error` | `ui_error` |
| `toggle` | `med_stamp_thump` | `mod_pen_click` | `sf_ui_tick` |
| `tick` | `med_quill_scratch` | `mod_stapler_tick` | `sf_ui_tick` |
| `panel_open` | `med_page_rustle` | `mod_paper_rustle` | `sf_hex_whoosh` |
| `panel_close` | `med_page_rustle` | `mod_paper_rustle` | `sf_hex_whoosh` |
| `achievement` | `med_hand_bell` | `mod_stamp_thud` | `sf_ui_ting` |
| `ready` | `med_stamp_thump` | `mod_pen_click` | `sf_ui_chime` |
| `select` | `ui_select` | `ui_select` | `ui_select` |
| `drop` | `ui_drop` | `ui_drop` | `ui_drop` |

Heavy steps: Medieval mounted `med_hoof_thunder` (hit tag), big `med_dragon_roar`; Modern vehicle and air `mod_machine_bed`; Sci-Fi mech `sf_mech_step`, hover `sf_hover_hum`.

#### 3.11.10 Cue name reconciliation (cue scan of the three bibles and every design document)

A script read every `med_*`, `mod_*`, `sf_*` token in `design/<era>/*.md`: 85 + 95 + 95 are defined in the bibles; 43 + 25 + 29 more appear in other design documents (372 names in all: Medieval 128, Modern 120, Sci-Fi 124). Classification (generated, `cue_classification` in the matrix): **cue** (family, alias, stinger or god-power cue in the matrix) 217; **arena, music-slot or ambience id** (not a cue) 58; **set-piece id** (`*_sp_*`, rows of the dispatcher tables) 28; **cue that is also a god-power cue** 8; **stinger alias** 9; **prefix fragment** (`med_`, `sf_`) 2; **rejected proposal or non-cue name** 50. The rejected names exist only in the proposal documents, `boss_table.md`, `feel_sheet.md` or `props.md` and match no accepted design; the router never sees them and no cue exists for them: `med_brace_win`, `med_hold_order`, `med_power_1`, `med_sp_banner_fall`, `med_sp_door_gives_notice`, `med_sp_dragon_flyby`, `med_sp_float_burns`, `med_sp_gas_wagon`, `med_sp_late_sally`, `med_sp_troll_rises`, `med_sting_banner`, `med_sting_splash`, `med_toll_booth`, `mod_picnic_hamper`, `mod_red_tape`, `mod_sp_barge`, `mod_sp_flyover`, `mod_sp_freight`, `mod_sp_klaxon`, `mod_sp_shellcam`, `mod_sp_shutters`, `mod_sp_span`, `mod_sp_spillway`, `mod_sp_whistle`, `mod_tape_ring`, `mod_target_dummy`, `sf_alarm_sting`, `sf_blast_door`, `sf_boss_sting`, `sf_calm_sting`, `sf_chase`, `sf_chase_sting`, `sf_egg_cluster`, `sf_first_strike`, `sf_foreman_wakes`, `sf_freight_pass`, `sf_geyser_surge`, `sf_hop_on_pop`, `sf_hover_sting`, `sf_lull`, `sf_orbital_sting`, `sf_overheat`, `sf_powerdown_sting`, `sf_queen_rises`, `sf_sac_burst`, `sf_squelch_sting`, `sf_stealth_sting`, `sf_teleport_pad`, `sf_victory_sting`, `sf_warranty_void`. Accepted aliases: `med_stg_wrong_cue` = `med_sting_wrong_cue`, `med_stg_colours_down` = `med_sting_colours_down`, `med_stg_gate_gives` = `med_sting_breach`, `med_stg_lady_arrives` = `med_sting_lady`, `med_stg_troll_rises` = `med_sting_troll`, `med_stg_dragon_wakes` = `med_sting_dragon`, `med_stg_float_burns` = `med_sting_fire`, `med_stg_late_sally` = `med_sting_charge`, `med_stg_sniffle_bell` = `med_sting_plague`, `sf_stg_concierge_steps` = `sf_stg_mech_steps`.


### 3.12 Engine and music director (AU3, AU5, AU6)

#### 3.12.1 `setEra` and per-screen era music

`AudioEngine.setEra(era)` (default `ancient`; unknown ids throw in dev, fall back to `ancient` in production): stores `this.era`; `catalog.setEra(era)` (cached `eraRows`); `bank.setEra(era)` (3.12.2); `router.setEra(era)` (swaps the registry tables); `music.setEra(era)`. Callers (map 07 seam 8): `engine.attach/_onBattleStart` derive the battle era from `arena.env.era` (AR/W field; absent = ancient) and call `setEra` before `setArena`; `game.js:445/166` (battle start, results), `main.js:149` (boot), the era chooser (hover: `music.preview(era)` plays the era's menu row for 6 s, `pv: [start, 6]`, 0.6 s crossfade, the click commits `setEra`), the campaign map (`setMood('menu', {era, slot:'map'})`), the editors (`editor` mood, shared rows, era unchanged). Back from a battle or the map returns the screen's own era (UC/CU navigation keeps the era). Settings volumes, `unlock`, the master chain and the voice budget are era independent.

#### 3.12.2 Warm, eviction and decoded-PCM budgets per tier

`SfxBank.warm(groups, era)` enqueues, per group in `GROUP_ORDER`, (a) rows with `e.era === era`, (b) Ancient rows reachable from `ERA_CUES[era]` (the second pick groups of the era's cues and the shared families its profiles name; `tools/gen_era_cues.mjs` writes the list; 160 rows, 133.8 s, 24.5 MB decoded if all resident), (c) nothing else: an Ancient battle warms exactly the rows it warms today. `amb_loop` rows are never warmed; `setArena(info)` calls `ensureAmb(info.ambience)` (at most 3 loops resident, 4.6-5.8 MB each). `ensureSetpiece(ids)` loads the stinger and sfx rows of the mission's set-pieces at `battle_start`. On `setEra(new)` the bank marks every non-core pack and row of other eras `idle` and releases its buffers in least-recently-used order before the first `_reserve`; `evictions` counts them. A voice that already holds a buffer keeps it until it ends (the reference is on the node). Tier policy (unchanged groups per tier from `engine._warm`): Potato `['ui','combat']`, Papyrus + `voice`, Marble and Olympian all five.

Decoded PCM per era and group, generated from the matrix (mono f32 at 48 kHz, sprite seconds plus gutters; ambience, beds and music excluded) and checked against the ceilings (Potato 40, Papyrus 80, Marble 160, Olympian 240 MB; `pcmCeiling`):

| era | ui MB | combat MB | voice MB | siege MB | misc MB | Potato warm (ui+combat) of 40 | Papyrus warm (+voice) of 80 | Marble/Olympian warm (all groups) of 160/240 |
|---|---|---|---|---|---|---|---|---|
| Medieval | 1.13 | 6.08 | 8.35 | 14.26 | 8.85 | 7.2 | 15.6 | 38.7 |
| Modern | 0.36 | 5.93 | 1.1 | 12.31 | 18.76 | 6.3 | 7.4 | 38.5 |
| Sci-Fi | 1.22 | 9.13 | 4.08 | 12.38 | 16.26 | 10.4 | 14.4 | 43.1 |

Worst cases by tier (MB means MiB, 2^20 B, throughout this file), adding the shared Ancient rows each era's profiles name (160 rows, 133.8 s: ui 0.15, combat 6.42, voice 9.17, siege 6.64, misc 2.12, total 24.5) and, for Medieval, the 80 declared reuse ids (76.7 s, 14.0 MB; the union with the shared rows is 197 rows: ui 0.15, combat 7.44, voice 12.67, siege 8.42, misc 3.44, total 32.1). `SfxBank.warm` takes each Ancient row in its own group, so a tier warms only the groups it warms for new rows. Potato (ui + combat): Medieval 7.2 + 7.6 = 14.8, Modern 6.3 + 6.6 = 12.9, Sci-Fi 10.4 + 6.6 = 16.9, all below 40. Papyrus (+ voice): Medieval 15.6 + 20.3 = 35.8, Modern 7.4 + 15.7 = 23.1, Sci-Fi 14.4 + 15.7 = 30.2, below 80. Marble and Olympian (all groups): Medieval 38.7 + 32.1 = 70.8, Modern 38.5 + 24.5 = 63.0, Sci-Fi 43.1 + 24.5 = 67.6, below 160 and 240, leaving room for 3 ambience loops (17 MB), bed loops (at most 12 MB) and the music pair (two stereo tracks of at most 105 s at 48 kHz = 2 x 40 MB, counted separately by `music.decodedBytes` as today). The shared and reuse figures were measured by walking the real `CUES` and the real catalog; `warm_era.test.mjs` re-derives them. `warm_era.test.mjs` runs the planner against `mockctx` for every tier and era and asserts `decodedBytes <= ceiling` after `idle()`.

#### 3.12.3 Voices, buses, limiter bypass

The budget (32 voices, 24 on Potato, 8 reserved for ambience) is unchanged. `BedManager` takes 4 of the 8 ambience slots at most. Priority numbers are in 3.11.2. `limiterBypass` cues (the dragon roar and the five bypass stingers) connect their voice gain to a `bypassIn` node placed after the limiter and before the soft clip (-3 dB trim); the soft clip (ceiling 0.84, 4x) still protects, so the true-peak rule holds (asserted by `mixtest`, scenario `med_dragon_finale` and `mod_dam_finale`). The `sting` template sits on the announcer-adjacent bus (priority 96): it never steals from `announce` (98) or `jingle` (100). Ducking: `duck('music', -6, 700)` on every stinger; siege classes -6 dB, thump -4 dB (3.11.2).

#### 3.12.4 Music director (`music.js`) and the dead cues

```
rankTracks(catalog, mood, theme, era = 'ancient', slot = null)
  pool = rows with mood match
  if mood is 'editor' or 'comedy':  pool as today (shared rows, era ignored)
  else pool = pool.filter(e => (e.era || 'ancient') === era)
  slot filter: slot given -> e.slot === slot ; slot absent -> (e.slot || 'menu') !== 'map'
  score = +3 if e.themes includes theme ; +1 per THEME_STYLE[theme] tag hit ; +1.5 / +0.75 energy preference (THEME_ENERGY) ; shuffle bag over rows within 2.0 of the best
  empty pool -> synthMusicSpecFor(mood, theme, era)      // never an Ancient track in a new era
```

`THEME_ENERGY` for the 18 new themes (the only selector left, because each era ships one row per battle tier): `med_meadow` mid, `med_castle` mid, `med_village` low, `med_forest` low, `med_moor` low, `med_crag` high; `mod_field` mid, `mod_city` mid, `mod_industrial` low, `mod_water` low, `mod_air` high, `mod_desert` low; `sf_moon` low, `sf_station` mid, `sf_neon` high, `sf_jungle` low, `sf_ice` low, `sf_ember` high (the live intensity still moves the filter and the tier through the existing 0..1 intensity logic). `THEME_STYLE` rows list the tags of the era's rows (`lute folk march brass drums` for Medieval, `groove lounge funk brass marimba` for Modern, `synth arp groove calm driving` for Sci-Fi). `THEME_TO_SYNTH_BATTLE` maps each of the 18 themes to `battle_<era>_<tier>`, and `MUSIC_SPECS` gains one literal per fallback bed (menu, map, three battle tiers, victory, defeat per era: 21 entries of about 300 bytes each; `defeat_scifi` is the shipped Sci-Fi defeat). `setMood(mood, {theme, era, slot, force})`; `LoopPlayer` uses `loop:true` rows natively and the 3 s crossfade otherwise (`bakedFade` unchanged). `comedy` mood stays Ancient `comedy_bumbly_march` for all eras.

**Dead cues.** `workshop.js:129,231,232`, `panels.js:134,144,158`, `arena/controller.js:178,185,231,294` and others call `K.sfx('ui_select')` (13 sites) and `K.sfx('ui_drop')` (2 sites); `CUES` has neither (`dropped.unknown++`), though the ledger holds `ui_select_1-2` and `ui_drop_1`. AP-U01 adds `F('ui_select','ui',['ui_select'],{vol:0.5})` and `F('ui_drop','ui',['ui_drop'],{vol:0.55})`; `UI_CUES` gains `select: 'ui_select', drop: 'ui_drop'`. Ancient battle routing (G9) is unaffected (the editors are not in the battle path); the editors become audible, which is a declared delta (AP-U01 note, G10 DOM unaffected). `tests/audio/dead_cues.test.mjs` scans `src/**` for `sfx('...')`, `play('...')`, `ui('...')` literals and fails on any id not in `CUES` or `UI_CUES` (today exactly the 2 above).

#### 3.12.5 Core audio

Core rows are embedded as base64 in the page (`__VW_CORE_AUDIO__`) and decoded before the first gesture. Rule: at most 10 rows per era, each <= 6,500 B, cut to <= 0.7 s, kept out of packs. Chosen (generated):

| era | core rows (<= 10) | rows (estimated mp3 bytes, 64 kbps + header) | era total B |
|---|---|---|---|
| Medieval | 6 | med_quill_scratch_1 (1360 B), med_stamp_thump_1 (2800 B), med_stamp_brass_1 (2616 B), med_page_rustle_1 (4400 B), med_sword_on_plate_6 (4736 B), med_brace_thunk_1 (4400 B) | 20312 |
| Modern | 7 | mod_stamp_thud_1 (2800 B), mod_stapler_tick_1 (584 B), mod_typewriter_ding_1 (4400 B), mod_pen_click_1 (480 B), mod_radio_squelch_1 (1040 B), mod_rifle_pop_1 (3200 B), mod_plink_tink_1 (2800 B) | 15304 |
| Sci-Fi | 8 | sf_ui_tick_1 (1216 B), sf_ui_bwip_1 (1360 B), sf_ui_ting_1 (6000 B), sf_hex_whoosh_1 (2464 B), sf_ui_chime_1 (5416 B), sf_booth_chirp_1 (1120 B), sf_shield_pop_1 (2632 B), sf_pulse_burst_1 (2280 B) | 22488 |

Estimated growth of the page: 58,104 B of mp3 for the 21 rows, x4/3 base64 = 77.5 KB (no deflate gain on mp3), about +2.5 percent of the 3,106,540 B Ancient fragment. No new core music. The existing core track is Ancient `battle_mid_epic_boss` (1.23 MB, 1,870,216 B of the page's embedded audio including core sfx). **Un-core rule (plan D17)**: `tools/build.mjs --report` at the P1 size checkpoint prints `projected = measured fragment + Delta(JS planned by AR families) + Delta(manifest/credits above) + core rows`; if `projected > 4,600,000 B` the build sets `core:false` on `battle_mid_epic_boss` (published as a file, 1 file slot), which saves about 1.6 MB base64 and changes one Ancient behaviour (the first battle may start on the synth bed `battle_heroic` for one fetch; declared in AP-X01 and re-measured by G9 as unchanged routing). `release_check` asserts the final size with the decision recorded.

### 3.13 Credits and licence snapshots (AU7)

#### 3.13.1 Structure

`assets/CREDITS.md` keeps its two Ancient sections byte-identical and appends, per era, between `<!-- era:<id> -->` and `<!-- /era:<id> -->`: a heading `## <Era> audio`, "Required attribution lines (CC BY)", "CC0 / public domain sources (courtesy)", "Synthesized and processed" (the declared families of 3.3.4 and the stingers: "original work, CC0, generated by tools/build_stingers.py"), "Music". CC BY lines follow the existing pattern; for third-party works the line is `"<title>" by <author>, <page URL>, licensed under <licence> (<licence URL>). Modified (trimmed, high-passed, pitch and tempo changed, normalised, re-encoded, layered).` and `Used for: <kinds> (<n> file(s))`; MacLeod lines keep the existing "Licensed under Creative Commons: By Attribution 4.0 License" block. A source that lists SA or GPL beside CC BY is credited under the chosen licence only; the snapshot proves the chosen one is offered. Generated counts:

| era | credit entries (distinct author+title) | CC BY (attribution required) | CC0 (courtesy) | CC BY 3.0 | CC BY 4.0 |
|---|---|---|---|---|---|
| Medieval | 80 | 20 | 60 | 16 | 4 |
| Modern | 78 | 17 | 61 | 9 | 8 |
| Sci-Fi | 79 | 22 | 57 | 15 | 7 |

The full CC BY lists (generated, 59 entries; CC0 courtesy lists are in the matrix `credits`):

**Medieval**

| author | title | licence | used for | page |
|---|---|---|---|---|
| AntumDeluge | Horse Gallop Loop | CC BY 3.0 | sfx | https://opengameart.org/content/horse-gallop-loop |
| AntumDeluge | Wind Loop | CC BY 3.0 | ambience | https://opengameart.org/content/wind-loop |
| Bart K. | Spell 4 (fire) | CC BY 3.0 | sfx | https://opengameart.org/content/spell-4-fire |
| Blender Foundation | Ambient Mountain, River, Wind and Forest and Waterfall | CC BY 3.0 | ambience | https://opengameart.org/content/ambient-mountain-river-wind-and-forest |
| Blender Foundation | rock_breaking | CC BY 3.0 | sfx | https://opengameart.org/content/rockbreaking |
| congusbongus | Horse gallop on different surfaces | CC BY 4.0 | sfx | https://opengameart.org/content/horse-gallop-on-different-surfaces |
| copyc4t | Archers shooting | CC BY 3.0 | sfx | https://opengameart.org/content/archers-shooting |
| dklon | Boom Pack 1 | CC BY 3.0 | sfx | https://opengameart.org/content/boom-pack-1 |
| Fun Gi Development | Tolling Bell SFX | CC BY 3.0 | sfx | https://opengameart.org/content/tolling-bell-sfx |
| Gregor Quendel | Free Crowd Cheering Sounds | CC BY 4.0 | ambience | https://opengameart.org/content/free-crowd-cheering-sounds |
| HolgiB | Crossbow sounds | CC BY 3.0 | sfx | https://opengameart.org/content/crossbow-sounds |
| ItsEddie | Black Smith Sounds | CC BY 3.0 | sfx | https://opengameart.org/content/black-smith-sounds |
| Kat | Scary Echoey Horn Esque Sound | CC BY 4.0 | sfx | https://opengameart.org/content/scary-echoey-horn-esque-sound |
| Little Robot Sound Factory | Coins Sound Effects Library | CC BY 3.0 | sfx | https://opengameart.org/content/coins-sound-effects-library |
| marcelofg55 | Bell Sounds | CC BY 3.0 | sfx | https://opengameart.org/content/bell-sounds |
| Michel Baradari | Rumble/explosion | CC BY 3.0 | sfx | https://opengameart.org/content/rumbleexplosion |
| Mobeyee Sounds | Dark Forest Bird | CC BY 4.0 | ambience | https://opengameart.org/content/dark-forest-bird |
| qubodup | Fire Loop | CC BY 3.0 | ambience, sfx | https://opengameart.org/content/fire-loop |
| spookymodem | Crossbow Shot | CC BY 3.0 | sfx | https://opengameart.org/content/crossbow-shot |
| spookymodem | Torch Fire Spell | CC BY 3.0 | sfx | https://opengameart.org/content/torch-fire-spell |

**Modern**

| author | title | licence | used for | page |
|---|---|---|---|---|
| dklon | Boom Pack 1 | CC BY 3.0 | sfx | https://opengameart.org/content/boom-pack-1 |
| dklon | Gunshots! | CC BY 3.0 | sfx | https://opengameart.org/content/gunshots-0 |
| dklon | Whistles | CC BY 3.0 | sfx | https://opengameart.org/content/whistles |
| Kevin MacLeod | Funin and Sunin | CC BY 4.0 | music:battle_mid | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN170001 |
| Kevin MacLeod | In Your Arms | CC BY 4.0 | music:victory | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN150004 |
| Kevin MacLeod | Invariance | CC BY 4.0 | music:battle_low | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN110084 |
| Kevin MacLeod | Local Forecast - Elevator | CC BY 4.0 | music:map | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN130001 |
| Kevin MacLeod | Run Amok | CC BY 4.0 | music:battle_high | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN140002 |
| Kevin MacLeod | Vibing Over Venus | CC BY 4.0 | music:menu | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN230000 |
| Kevin MacLeod | With Regards | CC BY 4.0 | music:defeat | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN110082 |
| KuraiWolf | Light Machine Gun | CC BY 4.0 | sfx | https://opengameart.org/content/light-machine-gun |
| Michel Baradari | 2 High Quality Explosions | CC BY 3.0 | sfx | https://opengameart.org/content/2-high-quality-explosions |
| Michel Baradari | 4 projectile launches | CC BY 3.0 | sfx | https://opengameart.org/content/4-projectile-launches |
| Michel Baradari | Chaingun, pistol, rifle, shotgun shots | CC BY 3.0 | sfx | https://opengameart.org/content/chaingun-pistol-rifle-shotgun-shots |
| Michel Baradari | Rumble/explosion | CC BY 3.0 | sfx | https://opengameart.org/content/rumbleexplosion |
| Mike Koenig (Soundbible.com) | Shotgun Shoot + Reload | CC BY 3.0 | sfx | https://opengameart.org/content/shotgun-shoot-reload |
| Nayckron | Engine-loop heavy vehicle/tank | CC BY 3.0 | sfx | https://opengameart.org/content/engine-loop-heavy-vehicletank |

**Sci-Fi**

| author | title | licence | used for | page |
|---|---|---|---|---|
| bart | Dark Factory | CC BY 3.0 | ambience | https://opengameart.org/content/dark-factory |
| Blender Foundation | Lava loop | CC BY 3.0 | ambience, sfx | https://opengameart.org/content/lava-loop |
| dklon | Ambient Spaceship Hums | CC BY 3.0 | ambience, sfx | https://opengameart.org/content/ambient-spaceship-hums |
| dklon | Boom Pack 1 | CC BY 3.0 | sfx | https://opengameart.org/content/boom-pack-1 |
| DoKashiteru | Rain and Thunder Loop | CC BY 3.0 | ambience | https://opengameart.org/content/rain-and-thunder-loop |
| Joe DeShon | Slide whistle down | CC BY 3.0 | sfx | https://opengameart.org/content/slide-whistle-down |
| Kevin MacLeod | Bleeping Demo | CC BY 4.0 | music:map | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN200002 |
| Kevin MacLeod | Canon In D Interstellar Mix | CC BY 4.0 | music:menu | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN200001 |
| Kevin MacLeod | Flying Kerfuffle | CC BY 4.0 | music:battle_high | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN180002 |
| Kevin MacLeod | Laserpack | CC BY 4.0 | music:battle_mid | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN180001 |
| Kevin MacLeod | Newer Wave | CC BY 4.0 | music:victory | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN200002 |
| Kevin MacLeod | Rising Tide | CC BY 4.0 | music:battle_low | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN190001 |
| Lee Barkovich | Robotic mechanic step sounds | CC BY 3.0 | sfx | https://opengameart.org/content/robotic-mechanic-step-sounds |
| Michael Brigida and students | 13 Ambient Machine Sounds | CC BY 3.0 | ambience | https://opengameart.org/content/13-ambient-machine-sounds |
| Michel Baradari | 2 High Quality Explosions | CC BY 3.0 | sfx | https://opengameart.org/content/2-high-quality-explosions |
| Michel Baradari | 4 projectile launches | CC BY 3.0 | sfx | https://opengameart.org/content/4-projectile-launches |
| Michel Baradari | Rumble/explosion | CC BY 3.0 | sfx | https://opengameart.org/content/rumbleexplosion |
| OptimusGnu | Machine Death Sound | CC BY 3.0 | sfx | https://opengameart.org/content/machine-death-sound |
| qubodup | Fire Loop | CC BY 3.0 | ambience | https://opengameart.org/content/fire-loop |
| The Berklee College of Music | Shimmer glitter magic | CC BY 3.0 | sfx | https://opengameart.org/content/shimmer-glitter-magic |
| Varkalandar | Glass Bell Sounds | CC BY 3.0 | sfx | https://opengameart.org/content/glass-bell-sounds |
| Varkalandar | Tesla coil powered death ray sound | CC BY 4.0 | sfx | https://opengameart.org/content/tesla-coil-powered-death-ray-sound |

#### 3.13.2 Credit test (`tests/audio/credits.test.mjs`, ER23)

(1) Every manifest row with `attributionRequired` has a line with its title and author in its era section; (2) every line has a licence URL and the word `Modified` when the row's `notes` or recipe processed the file; (3) hidden-era sections are absent from the shipped text (AR-T31); (4) the CC0 courtesy section never contains a CC BY source; (5) every `lic` is in `OKLIC`; (6) `CREDITS.md` parses to rows: heading, bullet, URL regex; (7) the number of distinct (author, title) pairs of an era section equals the matrix `credits[era].entries`. Negative controls: delete one CC BY line (fails 1), remove "Modified" (fails 2), add a hidden-era section to the shipped text (fails 3), add a `CC BY-SA` row (fails 5).

#### 3.13.3 Licence snapshots and provenance

Each source page gets `assets/licences/<sha1(page URL)>.txt`: the fetched page text (OpenGameArt: the `.field-name-field-art-licenses` block and the title; Kenney: `License.txt` from the zip; incompetech: the catalogue record and the CC BY 4.0 notice; archive.org: the licence line) plus the fetch date, HTTP status and a regex line per accepted licence. The row stores `snap = sha256(file)`; `licence_check.mjs` re-verifies offline (F/U) and `--online` re-fetches 100 percent of CC BY pages and 20 percent of CC0 pages (seeded) at release. Provenance score `prov` 0-3: +1 author has >= 3 submissions on the host, +1 the description names the recording method, +1 first-party catalogue (Kenney, incompetech) or a pack with a named multi-author library; below 2 the source is listed as "provenance unverified" in the verification report (candidates today: single anonymous-style uploads such as `helicopter-sounds`, `helicopter-sfx`, `high-traffic-road-sounds`). Eight used pages list a rejected licence beside an accepted one, and the chosen one is recorded: `engine_tank` CC BY 3.0 (also GPL 3.0), `tesla` CC BY 4.0 (also CC BY-SA 4.0/3.0, OGA-BY), `glass_bells` CC BY 3.0 (also CC BY-SA 3.0, OGA-BY), `xbow_holgi` CC BY 3.0 (also GPL 2.0), `fire_foom` CC BY 3.0 (also SA, GPL), `engine_mech` CC0 (also CC BY 3.0), `pest` CC0 (also OGA-BY), `steps_armor` CC0 (also OGA-BY).

#### 3.13.4 Third-party titles that may meet the text sweep (signed exception list, ER11)

The credits screen and the Credits text contain titles. The following used titles contain a word a per-era banned list is likely to carry (gun, shot, battle, death, weapon, firearm); AUDIO does not rename a work, so H signs an allowlist entry per title (credit-only, not usable in game text): "2 Gun Reloads" by StarNinjas (credit (Modern)); "Battle Theme A" by cynicmusic (music alt battle_high (Medieval)); "Battle Theme B for RPG" by cynicmusic (credit (Medieval), music primary battle_high (Medieval)); "Chaingun, pistol, rifle, shotgun shots" by Michel Baradari (credit (Modern)); "Crossbow Shot" by spookymodem (credit (Medieval)); "Death and Axes" by Kevin MacLeod (music alt battle_mid (Medieval)); "Gun Reload Sound Effects" by BMacZero (credit (Modern)); "Gun reload sounds" by SpringySpringo (credit (Modern)); "Light Machine Gun" by KuraiWolf (credit (Modern)); "Machine Death Sound" by OptimusGnu (credit (Sci-Fi)); "Medieval sound effects - Weapon Textures" by Ben Jaszczak & Brian Nelson (credit (Medieval)); "Medieval sound effects - Weapon impacts" by Ben Jaszczak & Brian Nelson (credit (Medieval)); "Shotgun Shoot + Reload" by Mike Koenig (Soundbible.com) (credit (Modern)); "Tesla coil powered death ray sound" by Varkalandar (credit (Sci-Fi)); "The Free Firearm Sound Library" by Ben Jaszczak, et al. (credit (Modern)); "To Battle!" by Umplix (credit (Medieval), music primary battle_mid (Medieval)).

### 3.14 Verification: loudness, scenarios, templates (AU8, VF 3.15)

#### 3.14.1 Pack integrity (VF `pack_check`; AUDIO supplies the builder and the rows)

Thresholds are VF's: start offset <= 1 ms (44 samples), maximum normalised sample error <= 2e-3, lag search +-2 ms, for every row of every pack decoded in Chromium from the HOSTED bytes (3.15). AUDIO additionally asserts at build time: pack bytes <= 1,000,000, Info/Xing header at the first frame, `s0 + n <= decoded length`, sprite peak <= -2 dBFS after decode, gutter RMS <= -90 dBFS, row count equals the matrix. Evidence today: 115 rows, lag 0 for all (3.8.2).

#### 3.14.2 Loudness classes and the solo-train protocol

Class targets are the bible numbers (generated):

| era | class | LUFS-S target (relative to Ancient hit_blade = -18) | families |
|---|---|---|---|
| Medieval | `hit` | -18 | banner, brace_thunk, fire_whoosh, foam_bonk, kazoo_blat, lance_shatter, mace_crunch, sneeze_chorus, splash_big, sword_on |
| Medieval | `volley` | -22 | armour_step, chain_cart_wood, gas_hiss, hoard_glint, longbow_volley, oil_sizzle, purse_jingle, step_cobble, step_mud, st |
| Medieval | `siege` | -16 | hoof_thunder, ram_gate, shell_whistle, trebuchet, wall_collapse, wing_horn, wing_whomp |
| Medieval | `bell` | -20 | bell |
| Medieval | `dragon` | -14 | dragon_roar |
| Medieval | `ui` | -24 |  |
| Modern | `pop` | -20 | cork_pop, pop_family, rifle_pop |
| Modern | `burst` | -21 | mg_stutter |
| Modern | `crack` | -17 | sniper_crack |
| Modern | `snap` | -22 | bullet_snap, mine_blip_boing, pin_thunk, sneeze |
| Modern | `clack` | -24 | reload_clack, step_concrete, step_metal, trolley_squeak |
| Modern | `thump` | -16 | cannon_bonk |
| Modern | `whistle` | -20 | dynamite_fuse, kettle_whistle, rocket_whoosh, shell_whistle, whistle |
| Modern | `blast_s` | -18 | glass_pop |
| Modern | `blast_m` | -16 | blast |
| Modern | `blast_l` | -14 |  |
| Modern | `tink` | -17 | helmet_bonk, plink_tink |
| Modern | `bed` | -26 | machine_bed, mower_rev |
| Modern | `ui` | -24 | pen_click, phone_ring, radio_squelch, stamp_thud, stapler_tick, typewriter_ding |
| Modern | `commentator` | -14 |  |
| Sci-Fi | `pew` | -20 | pulse_burst |
| Sci-Fi | `chatter` | -21 | rivet_chatter |
| Sci-Fi | `crack` | -17 | rail_crack |
| Sci-Fi | `lob` | -19 | plasma_lob |
| Sci-Fi | `absorb` | -24 | shield_hit |
| Sci-Fi | `pop` | -18 | popcorn, shield_pop |
| Sci-Fi | `tick` | -26 |  |
| Sci-Fi | `emp` | -16 | emp_burst, klaxon |
| Sci-Fi | `blink` | -22 | blink_pop |
| Sci-Fi | `shimmer` | -24 | cloak_shimmer |
| Sci-Fi | `thump` | -15 | mech_step |
| Sci-Fi | `orbital` | -14 | orbital_strike |
| Sci-Fi | `bed` | -26 | hover_hum |
| Sci-Fi | `goo` | -20 | acid_spore_extras, alien_goo, geyser_roar, grazer_baa, spore_puff |
| Sci-Fi | `blast_s` | -18 |  |
| Sci-Fi | `blast_m` | -16 |  |
| Sci-Fi | `blast_l` | -14 |  |
| Sci-Fi | `ui` | -24 | bell, booth_chirp, stamp_rated |
| Sci-Fi | `commentator` | -14 |  |

Protocol (`mixtest --classes`, offline engine, full master chain, quality olympian): for every committed hot, adjacent and bus family, render a solo train in a clean world (listener at the origin, source 10 u away on +x, `vol` 1, no ducking): 4 hits from 4 distinct rows 1.5 s apart (3 s apart for `ring`, `thump`, `blast`, beds 6 s steady state at N = 8, stingers once), measure the maximum short-term loudness (ebur128 S, 3 s window) `S_f`. The reference `S_ref` is Ancient `hit_blade` rendered the same way in the same run. Pass: `|(S_f - S_ref) - (target_class - (-18))| <= 2.5 LU` for hot families and 3.5 LU for the rest; additionally `tink` must exceed `pop` by 3 LU +-1.5 (Modern), `pop` (shield break) must exceed `absorb` by 6 LU +-2 (Sci-Fi), `dragon` and `orbital` must exceed `hit` by 4 LU +-2. Relative targets cancel the offline chain's calibration (AU-D22). Stem report: per bus and per class short-term LUFS and LRA written to `.cache/mix/<scenario>.json`; `announcer audible`: with the battle music at its measured level and ducked -6 dB, an Ancient `announce_*` row must read >= music + 6 LU in the same render.

#### 3.14.3 `mixtest --era` scenarios (generated from `tests/audio/scenarios.json`)

Each scenario records the real sim (`defsFor(era)`, seeded) and replays the event stream through the real engine. Common pass rules (existing AU6/AU5 plus VF): true peak < -1 dBFS, 0 clipped samples, integrated -18 +- 3 LUFS, voices <= 32, no `dropped.unknown`, every `expect` cue family started at least the stated number of times, bed expectations (`BedManager` on/off events recorded), hot-family repetition rule (3.14.5), shield absorb voices <= 3 at once (Sci-Fi), the gunfire/laser bed not above the music by more than 3 dB at the loudest second. The scenario `*_finale` rows inject the set-piece event at t = 8 s (`inject`) so the stinger and its sfx are in the render.

| scenario | arena preset (W 3.9) | units | team 0 (roster ids) | team 1 | cue starts that must occur | beds expected | note |
|---|---|---|---|---|---|---|---|
| `med_charge_pike_banner` | `med_tourney_field` | 173 | pikeman x40, longbowman x24, billman x20, standard_bearer x2, reeve x1 | lancer x14, knight_errant x6, ser_valiant x1, squire x30, crossbowman x20, peasant_levy x15 | med_hoof_thunder>=3, med_lance_shatter>=6, med_brace_thunk>=10, med_banner>=1, med_longbow_volley>=10, med_sword_on_plate>=15 | hoof, pole | a cavalry charge into a pike block with a banner fall (bible mixtest 1) |
| `med_siege_gate` | `med_castle_siege` | 115 | castellan x1, longbowman x20, crossbowman x16, pikeman x20, springald x2 | trebuchet x2, battering_ram x1, rolling_keep x1, squire x30, pavise_bearer x10, crossbowman x12 | med_trebuchet>=2, med_ram_gate>=3, med_wall_collapse>=1, med_sword_on_plate>=20, med_xbow_release>=10 | - | a siege with 2 trebuchets, a ram and the gate falling (bible mixtest 2) |
| `med_dragon_finale` | `med_dragon_pass` | 59 | knight_errant x6, longbowman x16, crossbowman x10, springald x2, ser_valiant x1 | cinderwyrm x1, wyvern x2, coin_golem x1, hoardling x20 | med_dragon_roar>=1, med_wing_whomp>=4, med_fire_whoosh>=3, med_sting_dragon>=1 | - | the dragon finale (bible mixtest 3); the stinger bypasses the limiter: true peak still < -1 dBFS |
| `mod_hedgerow_firefight` | `mod_hedgerow` | 153 | tin_hat_trooper x40, clerk_rifleman x20, tripod_mg_team x4, cub_reporter x10, long_lens_sharpshooter x3, signal_officer x2, deputy_director x1 | flowerpot_peashooter x30, hoarding_bearer x15, dynamite_thrower x8, toast_rack_runabout x2, parasol_missileer x3, tin_hat_trooper x15 | mod_rifle_pop>=30, mod_reload_clack>=8, mod_bullet_snap>=5, mod_pin_thunk>=10, mod_mg_stutter>=5 | gunfire | a 150-unit firefight at the hedgerow with pins, reloads and the hamper (bible mixtest 1) |
| `mod_bridge_column` | `mod_bridge_gorge` | 62 | biscuit_tank x4, lunchbox_apc x3, teapot_heavy x1, dozer_plough x1, tin_hat_trooper x20 | drainpipe_launcher x8, mortar_pair x2, caution_sapper x3, hoarding_bearer x10, clerk_rifleman x10 | mod_cannon_bonk>=6, mod_plink_tink>=15, mod_mine_blip_boing>=1, mod_blast>=4 | machine | a tank column on the bridge with the dozer set-piece and the armour tinks (bible mixtest 2) |
| `mod_dam_finale` | `mod_dam` | 52 | grand_teapot x1, final_notice x1, chandelier_gunship x1, biscuit_tank x2, tin_hat_trooper x20 | fishbowl_chopper x2, hobby_drone x8, mortar_pair x2, tripod_mg_team x3, hoarding_bearer x12 | mod_shell_whistle>=2, mod_blast>=4, mod_stg_full_fanfare>=1 | machine | the dam finale with the Chandelier, the Teapot and the Final Notice (bible mixtest 3); the whistle is 2.200 s |
| `mod_line_300` | `mod_airfield` | 300 | tin_hat_trooper x100, clerk_rifleman x50 | tin_hat_trooper x100, clerk_rifleman x50 | mod_rifle_pop>=100 | gunfire | VF 3.15.4 "a 300-gun line (Modern)": 300 riflemen; voices <= 32; the gunfire bed must engage and the crackle must not exceed the music by more than 3 dB at the loudest second |
| `sf_bubble_moon` | `sf_moon_base` | 146 | tidy_trooper x50, bulwark_warden x12, bubble_tender x6, dustpan_hover x4, wrench_runner x10 | rivet_gunner x20, tidy_trooper x30, hop_notary x6, veil_cutter x6, junk_buggy x2 | sf_pulse_burst>=30, sf_shield_hit>=30, sf_shield_pop>=10, sf_rivet_chatter>=5 | laser, bubble | a 150-unit bubble fight on the Moon with pops, chains and the dome set-piece (bible mixtest 1); shield absorb never above 3 voices at once |
| `sf_emp_neon` | `sf_neon_city` | 83 | valet_drone x6, refund_crawler x4, junk_buggy x4, salvo_cart x2, spritz_medic x4, tidy_trooper x20 | zapper_tinker x4, tidy_trooper x30, silent_signer x3, greeter_unit x6 | sf_emp_burst>=4, sf_hover_hum>=1, sf_stg_buzzkill>=1 | machine | an EMP on 20 machines in the mall with the Please Hold set-piece (bible mixtest 2); powerdown thinned to 3 per second |
| `sf_queen_finale` | `sf_reactor_hall` | 85 | tidy_trooper x30, bulwark_warden x8, grand_housekeeper x1, silent_signer x4 | hive_queen x1, skitterling x24, mandible_runner x8, acid_spitter x6, glidewing x3 | sf_alien_goo>=20, sf_queen_screech>=1, sf_stg_finale>=1 | - | the finale on the station with the Queen, the brood pulses and the hull breach (bible mixtest 3) |
| `marble_600` | `large preset of the era` | 600 | seeded roster mix, 300 units by cost class | seeded roster mix, 300 units by cost class | - | all | VF 3.15.4 "a 600-unit Marble mix": decoded PCM must stay under the Marble ceiling (160 MB), voice peak <= 32, drops reported |

#### 3.14.4 `audit_sfx` templates for new categories (VF 3.15.1, OI-4)

A category without a template fails `no template`; these are design bounds, anchored where numbers exist (7 real gun recipe outputs measured with the VF definitions: decay peak-to-minus-30 dB 0.16-0.22 s, centroid 941-3,277 Hz, rolloff 1.2-6.4 kHz, silence ratio 0.06-0.21, onset 0 ms at 10 ms frames), and re-baselined once by `audit_sfx --baseline` on the first real build, widening any bound by at most 20 percent with a signed `why`. Units: onset ms at 10 ms frames; decay s; centroid and rolloff Hz.

| category | length s | onset | decay (peak to -30 dB) | centroid | rolloff 85 | periodicity | silence | other |
|---|---|---|---|---|---|---|---|---|
| `gunshot` | 0.05-0.60 | <= 10 | 0.05-0.30 | 800-4,500 | 1,000-9,000 | any | <= 0.35 | one onset (two for burst rows: 3 or 6); VF example: onset <= 5 ms, decay <= 0.35 s |
| `clack` | 0.03-0.40 | <= 10 | 0.02-0.25 | 1,500-7,000 | 3,000-12,000 | any | <= 0.40 | |
| `armor` | 0.08-0.70 | <= 10 | 0.08-0.50 | 900-6,000 | 2,000-11,000 | any | <= 0.35 | |
| `laser` | 0.10-1.30 | <= 20 | 0.08-1.00 | 1,000-6,000 | 2,000-12,000 | any | <= 0.30 | sweep slope < 0 for `pew`/`lob` rows (VF example) |
| `shield` | 0.10-0.70 | <= 20 | 0.10-0.50 | 900-6,000 | 2,000-11,000 | any | <= 0.40 | |
| `energy` | 0.15-1.60 | <= 30 | 0.10-1.20 | 300-6,000 | 800-12,000 | any | <= 0.40 | |
| `volley` | 0.30-1.40 | <= 120 | 0.20-1.00 | 800-5,000 | 2,000-10,000 | any | <= 0.45 | |
| `hoof` | hits 0.15-0.60; loops 3-7 | <= 20 | 0.10-0.50 | 300-2,500 | 600-6,000 | loops >= 0.4 | <= 0.30 | loop seam <= 0.02 FS |
| `explosion` | 0.30-3.00 | <= 30 | 0.20-1.80 | 150-2,500 | 400-6,000 | any | <= 0.40 | cannons: length <= 0.9 s |
| `mech` | 0.30-3.20 | <= 40 | 0.20-2.00 | 80-1,500 | 300-5,000 | any | <= 0.45 | |
| `creature` | 0.20-3.50 | <= 60 | 0.15-2.50 | 150-4,000 | 500-9,000 | any | <= 0.50 | |
| `bell` | 0.50-7.50 | <= 20 | 0.50-6.00 | 400-4,500 | 1,000-9,000 | >= 0.3 (tonal) | <= 0.60 | |
| `engine_loop` | 2.0-6.5 | - | - | < 1,200 | < 5,000 | >= 0.5 | <= 0.05 | seam <= 0.02 FS (VF example) |
| `amb_loop` | 20-31 | - | - | 150-4,000 | 500-9,000 | <= 0.5 (no siren) | <= 0.05 | seam <= 0.02 FS; no speech (3.6) |
| `stinger` | 1.7-3.7 | - | - | - | - | any | <= 0.60 | length within +-80 ms of the matrix value |
| `fx` | 0.05-3.50 | <= 60 | 0.05-2.50 | 150-9,000 | 400-14,000 | any | <= 0.60 | |

`tools/audit_sheet.py` renders one spectrogram PNG per family (`showspectrumpic=s=1200x400`, rows concatenated with 0.3 s gaps, tested) for an agent to read; the report lists the families as "unheard" for the by-ear residual.

#### 3.14.5 Repetition and rate rules

Hot families (VF 3.15.4): in any 10 s window the same asset id plays at most 2 times in a row, and at least `min(6, variants)` distinct assets sound per 60 s of continuous fire. The existing `ShuffleBag` guarantees no immediate repeats when >= 2 rows are ready; the metric catches the case where only 1-2 rows are decoded (a pack still loading) and where pitch jitter hides identical sprites. Rate rules: `unit_deflect` <= 1 per unit per 0.25 s, `shield_hit` <= 4 per unit per second and <= 3 per 100 ms in the frustum, `unit_flanked` 1 per 2 s, brace thunk 1 per 120 ms per block, powerdown 3 per second, volley 1 per 0.4 s window.

### 3.15 The 500-file dress-rehearsal publish (end of P1; format fixed here)

Purpose: prove, with the REAL final files, that the artifact host accepts and serves 500 files, serves `.mp3` as `audio/mpeg`, and that packs keep their offsets after hosting; fix the pack format (AU-D1/D2) or switch to the fallback.

1. **Inputs (all real, built by the AU pipeline from fetched sources)**: 17 packs (about 4.5 MB), 20 music files (about 17 MB), 19 ambience files (about 3 MB), 23 bed loops (about 0.8 MB), the 382 Ancient audio files of `release/v8/files.json` (10.98 MB, 382 files), one rehearsal page (79 + 382 + 1 = 462 entries), 36 padding files (byte copies of small Ancient rows under `rehearsal/pad_<n>.mp3`) and two probe files (`probe.ogg`, `probe.opus`, 1 s each, media types recorded as informational), which make exactly 500 entries including the page.
2. **Page**: `rehearsal.html`, generated, ~6 KB, no capabilities. It fetches every listed path with a relative URL, records status, `content-type`, `content-length`, and sha256 (WebCrypto) against `files.manifest.json`, decodes every pack/music/loop/ambience file with `decodeAudioData`, and runs the `pack_check` algorithm in the page against the hosted bytes and the matrix offsets; it prints one JSON report into the DOM (`#report`).
3. **Publish** with the Artifact tool, private, new url: call 1 = page + 254 files (255 files, <= 64 MB), call 2 = the remaining 245 files; the second call adds to the same `url`. Expected final: 500 files, version size about 36 MB (of 256 MB). Record each call's result.
4. **Verify** in headless Chromium against the hosted url: (a) all 500 requests 200; (b) `content-type: audio/mpeg` for every `.mp3`; (c) sha256 equal to the local files; (d) `pack_check` pass for the 17 packs (lag <= 44 samples, error <= 2e-3) from hosted bytes; (e) every music/ambience/loop file decodes; (f) total transfer and the slowest request; (g) the number of files the host reports; (h) a 501st file: publish one more file and record the host's response (expected rejection; if the host accepts it, the guard stays at the build side and the finding is recorded). Pass = (a)-(e) all true.
5. **Decision**: pass -> AU-D1/D2 are final and `publishedFiles` is asserted by the build. Fail on (d) -> switch the pack codec to Vorbis `.ogg` (`audio/ogg`) and re-run once; fail on (b) for `.ogg` too -> keep MP3 and split packs at 600,000 B. Fail on (a)/(g) -> the guard drops to the host's real limit and `publishedFiles` is re-budgeted.
6. **Cleanup**: the rehearsal artifact is deleted by COORD after the report is copied to `.cache/rehearsal/report.json`; its numbers are appended to `docs/eras/golden_log.md` (COORD). `release/<era>-<n>/` is written before each real era publish (AR 3.11.3).

### 3.16 Hunt work plan

#### 3.16.1 Fetch lists (generated)

`tools/sources_oga.txt` gains these OpenGameArt slugs (new packs only; packs already on disk are listed in the matrix `sources` with `on_disk: true`):

```
100-cc0-metal-and-wood-sfx
13-ambient-machine-sounds
2-gun-reloads
30-cc0-sfx-loops
33-metal-clang-sounds-cast-iron-pans
4-projectile-launches
40-cc0-water-splash-slime-sfx
50-cc0-sci-fi-sfx
60-cc0-sci-fi-sfx
alien-sounds
ambient-mountain-river-wind-and-forest-and-waterfall
ambient-spaceship-hums
archers-shooting
black-smith-sounds
boiling-water-loops
cannon-fire
cannon-hit
cannon-hit-cannon
cannon-hit-wall
chain-winch-sounds
chaingun-pistol-rifle-shotgun-shots
coins-sound-effects-library
cork
correct-bell
crickets-ambient-noise-loopable
crossbow-shot
crossbow-sounds
crowded-pub
dark-factory
dark-forest-bird
doomsday-laser-cannon-sound-effect
doorbell
doorbell-ring
dragon-flap-0
dripping-water-loop
electricity-game-sound-pack
electronic-device-loop
energy-drain
engine-loop-heavy-vehicletank
enginemechanic-working-sound
genuine-sneeze-sound
ghost-monster-voice-moaning-growling
glass-break
gun-reload-sound-effects
gun-reload-sounds
gunshot-sounds
gunshots
gunshots-0
handgun-reload-sound-effect
helicopter-sfx
helicopter-sounds
high-traffic-road-sounds
insect-or-alien-scream
iron-door
large-wings-flap
laser-beam
lava-loop
light-machine-gun
machine-death-sound
machine-shutting-down
mech-stomp-step-sound
mechanical-sounds
metal-clang-sounds
metal-footsteps-on-concrete
metal-impact-sounds
propeller-cartoon-loop
racing-car-engine-sound-loops
rain-loopable
robotic-mechanic-step-sounds
rocket-launch
sci-fi-aliens-and-cows-pack
sci-fi-ambience-sfx
scifi-city-ambient-loop
shotgun-shoot-reload
small-metal-clasp-open-close-switching
small-pest-aliencreature
sneeze
solo-seagull-sound-effects
spring-sounds
static
steam-boiler-sound-loop
tavern-0
tesla-coil-powered-death-ray-sound
the-free-firearm-sound-library
tolling-bell-sfx
toy-double-barrel-shotgun-sounds
typewriter-sounds
water-waves
whistles
wind-hit-time-morph
wind-loop
```

`tools/fetch_kenney.sh` PACKS gains `sci-fi-sounds` (73 oggs, CC0, `License.txt` read from the zip: "Creative Commons Zero"; 5,875,104 B). `tools/fetch_incompetech.py` args for the 13 MacLeod primaries (7 Modern, 6 Sci-Fi; none is on disk), in slot order: "Vibing Over Venus", "Local Forecast - Elevator", "Invariance", "Funin and Sunin", "Run Amok", "In Your Arms", "With Regards", "Canon In D Interstellar Mix", "Bleeping Demo", "Rising Tide", "Laserpack", "Flying Kerfuffle", "Newer Wave"; alternates (optional, same call with `--optional`, 14 titles): "Local Forecast", "BossaBossa", "Scissors", "Your Call", "Volatile Reaction", "Super Friendly", "Poppers and Prosecco", "Disco Lounge", "Alien Restaurant", "Space Fighter Loop", "Blipotron", "Laser Groove", "Disco Sting", "Takeover of the 8-bit Synths". The script reads `Content-Length` from a HEAD request first and refuses any file over 20 MB. Medieval music from OpenGameArt (4 files): `medieval-minstrel-dance` (Loop_Minstrel_Dance_0.wav, 19.9 MB), `medieval-the-bards-tale` (Loop_The_Bards_Tale.wav, 10.2 MB), `medieval-victory-theme` (victory.wav, 11.4 MB), `medieval-the-old-tower-inn` (Loop_The_Old_Tower_Inn.wav, 8.8 MB, alternate). Download volume of the OpenGameArt and Kenney hunt set (generated from the archive sizes): Modern 241.9 MB (194.0 MB is the firearm library, the only archive over 20 MB), Sci-Fi 39.3 MB, Medieval 29.4 MB; the music files are single downloads, none over 20 MB.

#### 3.16.2 The firearm library (194 MB 7z)

`tools/fetch_firearm_lib.py` (needs `py7zr` in `.cache/pylib`): ranged-resumes `Prepared SFX Library.7z` from `opengameart.org` into `assets/raw/oga-the-free-firearm-sound-library/dl/` (193,954,738 B; the 7z header lists 56 wavs in 22 folders and one `Prepared Master Sheet.csv`), then extracts ONLY the 12 sessions the matrix uses (AR-15 `D_24P`, SKS `U_14P`, Marlin 336 `I_17P`, Walther PPQ `X_31P`, 1911 `A_34P`, Carl Gustav M45 `G_22P`, PPSh `P_22P` and `P_18P`, AK-47 `C_29P`, Mosin Nagant `M_21P`, Arisaka `E_18P`, Tikka `W_24P`, Savage 10 `T_17P`), writes sha256 per extracted file into `tools/sources_lock.json`, and reads `Prepared Master Sheet.csv` for the round counts per session (the sheet carries no durations; sessions are 2.7-17.2 MB at 96 kHz stereo). Folder and file names are working labels; none reaches a shipped string (AU-D27). Each session is sliced by onset (`on='iso'` for single shots, `win=3` for bursts) and screened by `audit_sfx` (one onset per single row).

#### 3.16.3 Lock file and re-fetch scripts

`tools/sources_lock.json` (committed): per fetched pack `{slug, host, page, files: [{url, bytes, sha256}], fetched, licence_chosen, snap}`. `tools/refetch.py --verify <slug|all>` HEADs every URL and compares size and sha256 of the first and last 1 MB; `--restore <slug>` re-downloads (resume) and verifies the full sha256 against the lock; exit code 0 ok, 3 changed, 4 gone. For sources that are not re-fetchable (exit 3/4, or flagged at fetch time because the host page shows a single anonymous upload) the build uses the masters archive: at every era release `release/<era>-<n>/masters.tar` stores the per-row FLAC masters of the era (estimated 20 MB for three eras: 671 rows x 0.55 s x 44.1 kHz x 2 B x 0.6 for the FLAC ratio) plus `sources_lock.json` and the licence snapshots, so any shipped row can be rebuilt and re-verified without the network. Firearm library (large, re-fetchable) is restored by `fetch_firearm_lib.py --resume`.

#### 3.16.4 Work packages

Size S/M/L = 1/2/4 sessions (plan section 11 rule). "Commit" = what COORD commits after the gate; raw packs and masters are gitignored.

| WP | phase | owner | predecessors | deliverable | acceptance | size |
|---|---|---|---|---|---|---|
| AU-WP00 | P0 | AUDIO | rosters v1, M2 taxonomy | this file and `au_matrix.json` (re-run `gen` against frozen rosters/kinds; update `PROJ_ALIAS`) | `matrix.test.mjs` green | S (re-run) |
| AU-WP01 | P1 | AUDIO | AR1 | tool plumbing: `Path(__file__)`, `sfx_spec` era columns, new `build_sfx` options, `gen_sfx_spec.py`, `build_pack.py`, `loop_check2.py`, `key_check.py`, `audit_sheet.py` | AU-T01, T03, T10, T11 | L |
| AU-WP02 | P1 | AUDIO | AR1 | engine/catalog/bank/music plumbing: `era` columns, `PackStore`, `setEra`, `warm(groups, era)`, `rankTracks(era, slot)`, dead cues, `limiterBypass`, `align` | AU-T04, T05, T09, T12, T13 | L |
| AU-WP03 | P1 | HUNTER | AU-WP01 | fetch scripts: chosen-licence rule, snapshots, `sources_lock.json`, `refetch.py`, `fetch_firearm_lib.py`, list files of 3.16.1 | dry run on 3 packs: lock + snapshot written | M |
| AU-WP04 | P1 | HUNTER | AU-WP03 | batch Medieval: 18 packs (29.4 MB) + 4 OGA music files; ledger rows via `gen_sfx_spec` + `build_sfx`; `assets/licences/*` | all Medieval rows build; `verify_assets` green for them; commit: lock, snapshots, rows, packs | M |
| AU-WP05 | P1 | HUNTER | AU-WP03 | batch Sci-Fi: Kenney `sci-fi-sounds` + 20 packs (39.3 MB) | same | M |
| AU-WP06 | P1 | HUNTER | AU-WP03 | batch Modern: 38 packs (241.9 MB) incl. the firearm library (12 sessions) | same; every gun row passes the `gunshot` template | L |
| AU-WP07 | P1 | HUNTER | AU-WP03 | music fetch: 13 MacLeod primaries + 4 OGA files; `build_music` with the cut rules; loop and key checks; `sources_lock` | `loop_check2`/`key_check` reports match 3.4; tracks within 0.5 LU | M |
| AU-WP08 | end P1 | AUDIO + COORD | AU-WP04..07 | dress-rehearsal publish (3.15) and report | 3.15 step 4 (a)-(e) pass; decision recorded | M |
| AU-WP09 | P2 | AUDIO | M2 freeze, rosters v1 | confirm `ranged.proj` per roster weapon with M/CU; freeze `PROJ_ALIAS` | OI-AU5 closed | S |
| AU-WP10 | P2 | AUDIO | AU-WP01, 09 | router tables per era in `era_<id>/data.js` (profiles, projectiles, explosions, abilities, steps, UI, god powers, set-pieces, direct events, prop break) x3 | AU-T02, T06; UC-31, UC-40..42 | M x3 |
| AU-WP11 | P2 | AUDIO | AU-WP02, 10 | handlers: `ShooterWindow`, `BedManager`, dispatcher, telegraph alignment, new events | AU-T07, T08 | L |
| AU-WP12 | P2 | AUDIO | AU-WP04..06 | stingers (`build_stingers.py`, 35) and ambience bakes (19) and bed loops (23) | AU-T14 length, seam checks | M |
| AU-WP13 | P2 | AUDIO | AU-WP11 | vehicle bed prototype, then the beds | prototype criteria 3.11.8 | S + M |
| AU-WP14 | P2 | TOOLS-VERIFY + AUDIO | AU-WP10 | `audit_sfx` templates, `mixtest --era/--classes/--stems`, scenarios, `cue_trace` data | AU-T16..T18, T23 | L |
| AU-WP15 | P2 | AUDIO | AU-WP04..07 | credits per era, `credits.test.mjs`, `licence_check` snapshots | AU-T15, T19 | M |
| AU-WP16 | P2 | TOOLS-GATE + AUDIO | AU-WP02 | slim manifest, hidden-era omission, `publishedFiles` guard, size report lines | AU-T20, T21; AR-T30, T31 | M |
| AU-WP17 | P2 | agent not the picker | AU-WP12..14 | listening checks per era (tier crossfades, shawm at 1.8 kHz, stinger fit, tell sounds) | report lists unheard residuals | S x3 |
| AU-WP18 | P3 per era | AUDIO | E-FREEZE of the era | staging rehearsal audio checks: `mixtest` three scenarios, `pack_check` hosted, credits, `release/<era>-<n>/` | era release gate | S x3 |

Ledger commit protocol: HUNTER runs `build_sfx` then `build_manifest` then `verify_assets` and hands back; the manifest diff must be append-only (AP-X01 lint); COORD commits `assets/manifest.json`, `assets/CREDITS.md`, `assets/audio/**`, `assets/licences/**`, `tools/sources_lock.json`, `tools/sfx_spec.py` (generated block), nothing under `assets/raw` or `assets/masters`.

#### 3.16.5 What this hunt does not prove

Licence truth beyond the page tag and the snapshot (provenance score only), by-ear fit of any row, real-device decoding (Safari, Firefox, phones), whether 300 simultaneous pops read as a crackle, whether a pew reads as a pew. The verification report states each as unverified.


### 3.17 Requests and seams addressed to AUDIO: the exact answers

Every request that another spec, design document or map files against AUDIO, with the answer and where the detail lives. "Adopted" means the request is taken as written; "amended" means AUDIO answers with a different number or name and logs it in section 6 so the requester can re-run its lint.

| id | filed by | request | answer | detail |
|---|---|---|---|---|
| R-CU-A1 | spec/CU 3.21.1 | `audio.stinger(cue, { bypassLimiter, duckDb, duckMs })`, returns false while audio is locked; the director otherwise plays the cue as an sfx and ducks music | **Amended (A9).** The method is adopted with the same signature (defaults `duckDb -6`, `duckMs 700`, trace `'locked'` when not unlocked, `lastStinger` always updated). It plays the stinger through the `sting` template on the announcer bus at priority 96, not on the `sfx` bus at 100: 96 is below `announce` (98) and `jingle` (100), so a stinger never steals a spoken line or an Ancient jingle. `bypassLimiter` maps to `limiterBypass` and is honoured only for rows whose matrix entry has `limiter_bypass: true`: `med_sting_dragon`, `med_sting_finale`, `mod_stg_full_fanfare`, `mod_stg_full_fanfare_low`, `sf_stg_finale` (at most two set-pieces per era, as CU 3.3.6 requires; Sci-Fi uses one). | 3.11.7, 3.12.3 |
| R-CU-A2 | spec/CU 3.21.1 | a muted-line cue (paper tick) for `line.muted`; fallback: silence | **Adopted without a new row.** `audio.mutedLine()` plays `UI_BY_ERA[era].tick` (Medieval `med_quill_scratch`, Modern `mod_stapler_tick`, Sci-Fi `sf_ui_tick`) at volume 0.4 and rate 0.85 on the `ui` bus; Ancient keeps silence until CU asks otherwise. | 3.11.9 |
| CU 3.12.2 | spec/CU 3.12.2 | `audio/cues.js:429-434` reads the power cue from `row.cue` through the router dependency `powerCue(kind)` | **Adopted.** `GOD_CUES[kind].cue` is the id CU prints (`med_cue_volley`, `med_cue_bell_drop`, `med_cue_mud`, `med_cue_soup`, `med_cue_precedence`, `med_cue_audience`; `mod_cue_ricochet` ... `mod_cue_delivery`; `sf_cue_arc` ... `sf_cue_grazer_drop`); `seq` is the sequence the cue plays; Ancient rows keep their cue ids and the legacy switch. AU-T01 compares the 18 ids with the CU table. | 3.11.7 |
| CU stinger count | spec/CU 3.3.6 | "per-set-piece stinger cues ... `*_stg_*`, 9 per era = 27" | **Amended (PC-AU12).** The set-piece tables hold 12 rows per era; the set-piece rows use 12 / 9 / 11 distinct stingers (32), and 3 more stingers (2 Medieval, 1 Modern) exist only for boss entrances, 35 distinct stingers in all. The three generic Ancient stingers (`stinger_epic`, `stinger_funny`, `stinger_hero_down`) are reused as CU says. | 3.5, 3.11.7 |
| R-UC4 / OI-UC2 | spec/UC 3.18, 7 | AUDIO adopts the `era` ledger column, `coverage(era)`, `manifest.sharedAudio`, the `AUDIO_PROFILES` slots `hit swing shoot death voice step mat`, bark rows for roles `vehicle` and `air` | **Adopted, with one amendment (PC-AU13).** `era` column: AU-D4, 3.9.1. Profile slots: 3.11.5 uses exactly those seven plus the optional `reload brace flier hover vehicle mount`. `manifest.sharedAudio` lists the 37 shared Ancient families the profiles name (3.11.5). `coverage(era)` in `tests/audio/gen_coverage.mjs` counts rows with `row.era === era` for a new era and `row.era` absent for Ancient; UC's phrase "`row.era` in `{era, 'all'}`" is not used because AU-D4 reserves absence for Ancient and writes no `'all'` value. Bark rows: the profile `voice` slot of every vehicle and air def is a machine sound (3.11.5 archetypes `veh_*`); the bark text rows are spec/H. OI-UC2 closes when this file leaves draft. | 3.9.1, 3.11.5 |
| UC-31 | spec/UC 3.8 | `PROJ_AUDIO[kind]` and `EXPLOSION_AUDIO[kind]` for every kind; `shoot` is never the default `bow_shoot` for a non-arrow kind | **Adopted** (AU-D13); AU-T02 enforces it and the negative control deletes a row. | 3.11.3, 3.11.4 |
| UC-40 | spec/UC 3.8 | profile slots resolve to a ledger row of the era, a shared family in `sharedAudio`, or a `SYNTH_REASONS` entry; `dropped.unknown == 0`; new eras have `AUDIO_PROFILES[def.id]` | **Adopted.** 102 of 102 roster v1 units have a profile (3.11.5); the 12 Medieval infantry that use the shared `taunt` voice are all human roles (`melee`, `ranged`, `swarm`, `support`), none is a hero, monster, boss, vehicle, air or mech (checked against `rosters.md`). Each synth-only family has a `SYNTH_REASONS` line (3.7.4). | 3.7.4, 3.11.5 |
| UC-41 | spec/UC 3.8 | each ability has a route `cast`, `event:<name>` or `passive` | `ABILITY_CUES` additions are keyed by ability id and by route; abilities with route `passive` have no cue by design; the test reads `PASSIVE_ABILITIES` from the ability registry meta (M13) and accepts them. | 3.11.6 |
| UC-42 | spec/UC 3.8, q1_content Q33 | the four bark states exist for the bark role and the voice slot is not the generic `taunt` for hero, monster, boss, vehicle, air, mech | **Audio side adopted.** Every such unit has a signature voice sound (3.11.5; for example `mod_rotor_flyby`, `sf_servo_whine`, `med_dragon_roar`); the bark text is spec/H. | 3.11.5 |
| `foot_cues` | spec/W 3.4.5, request `world_foot_cues` | add `step_gravel step_metal step_tile step_dust`, `ice` maps to `step_snow`, one array read per step | **Adopted.** `ERA_STEP` has the eleven keys of W (`grass stone sand snow mud dirt wood gravel metal tile dust`) per era with real or synth rows (3.11.9); `ice` is mapped to the era's `snow` step in the router, so no `step_ice` family exists. | 3.11.9 |
| WC24, W 3.5.3 | spec/W | AUDIO tables have a row per canonical theme id; legacy audio readers never call `canonTheme` | **Adopted.** `THEME_STYLE`, `THEME_ENERGY` and the theme-to-ambience table have a row for each of the 18 canonical ids (3.6, 3.12.4); `music.js` and `cues.js` read `arena.env.theme` verbatim, so Ancient routing equals G9. | 3.6, 3.12.4 |
| SLW-19, R-SL-A1 | spec/S-slice | slice audio per era: set-piece stinger and sfx (4 + 1 cues), projectile and impact cues for the mission-1 kinds, the map bed, a low battle bed (real rows or approved synth) | **Answered by the table below**; every cue named is a matrix family, and the plumbing slice may use the approved synth fallback (3.7.4) for any row the hunt has not yet delivered. | below |
| OI-MS10 | spec/MS 7 | AUDIO reads stinger and sfx ids from `setpieces.generated.js` for the matrix | **Adopted.** `SETPIECE[era]` (3.11.7) is generated by `tools/gen_era_cues.mjs` from `setpieces.generated.js`; AU-T02 fails when a stinger or sfx id of the generated file is absent from the matrix, and when a matrix set-piece is absent from the file. | 3.11.7 |
| SF-DA-20 | design/scifi/missions_notes.md | AUDIO adds `sf_steam_hiss`, `sf_egg_pop`, `sf_wet_thump` or accepts the aliases | **Adopted as aliases:** `sf_steam_hiss` = `sf_airlock_hiss`, `sf_egg_pop` = `sf_alien_goo` tag `splorp` at pitch 1.3, `sf_wet_thump` = `sf_alien_goo` tag `splorp` at pitch 0.7 (matrix `aliases`). | 3.3.6 |
| M-layers 3.6.6, OI-L1 | spec/M-layers | AUDIO consumes `unit_air_state`, `unit_withdraw`, `air_remnant`, `explosion crash`, cause rows `crash crush` | **Adopted.** `unit_air_state` flyby, `unit_withdraw` (a receding wing or rotor, 0.6 of the family volume), `air_remnant` (no cue by design, text barks carry the stages; the router exports `IGNORED_EVENTS = ['air_remnant']` and `cue_trace` fails any sim event that is neither handled nor listed), `explosion` kind `crash` (`mod_blast#m`, `med_dust_whump`, `sf_blast#m`), `CAUSE_SCREAM` 0 for `crash` and `crush` (AU-D32). | 3.11.8 |
| M 3.15 AUDIO row | spec/M | `PROJ_AUDIO`, `EXPLOSION_AUDIO`, `CAUSE_SCREAM` rows, `src`/`srcDef` use, new event handlers | **Adopted** in 3.11.2 to 3.11.8; the payload fields `src srcDef round` are M's (open item OI-AU2). | 3.11 |
| MS H5, H6 | spec/MS | events `banner_fall`, `prop_ignited`, `air_landed`, `beam_lock_telegraph` have audio | **Adopted** through `EVENT_DIRECT` (3.11.8): Medieval `banner_fall` = `med_banner#fall` + `#aww`, `prop_ignited` = `med_fire_whoomph`, `air_landed` = `med_dust_whump` + `med_wing_whomp`; Sci-Fi `beam_lock_telegraph` = `sf_lock_line` (exactly 1.100 s, AU-D11). The sim payload of the last one is open (OI-AU2). | 3.11.8 |
| design/modern/rosters.md 3.5 | design | silent-default tables the Modern rows must be added to: `PROJ_AUDIO`, `AUDIO_PROFILES` | **Adopted** (3.11.3, 3.11.5), with the same two tables for Medieval and Sci-Fi. | 3.11 |
| missions_outline.md 0.2 | design | stinger kinds `comic hit swell dread fanfare`, each ducks music 6 dB for 700 ms, only the dragon and the finale bypass the limiter | **Adopted** (3.5, 3.12.3). Counts by kind are in the stinger tables. | 3.5 |
| AR OW-07, OW-08, AP-U01, AP-U02, AP-X01..X03, AP-T06 | spec/AR | file ownership and edit rules for the audio files, the ledger, the credits and the tools | **Adopted**; each AP row is mapped to its file in 3.1 and the Ancient-identity rules are tests AU-T04 and AU-T06. | 3.1 |
| VF OI-4, ER12, ER23 | spec/VF | loudness class windows and per-family templates for `mixtest --stems` and `audit_sfx` | **Adopted** in 3.14.2 to 3.14.5; acceptance rows AU-T16 to AU-T19. | 3.14 |

**Slice cue list (SLW-19, R-SL-A1; generated).** The plumbing slice is mission 1 of each era through the real UI. Cues are families of the matrix; the "profile cues" column is the union over the mission-1 units, so the set is both the hunt priority and the list the slice may fall back to synth for.

| era | mission 1 units | profile cues they reach (families) | projectile kinds -> launch cue | set-piece package | map bed | low battle bed |
|---|---|---|---|---|---|---|
| Medieval | `pikeman`, `longbowman`, `billman`, `peasant_levy`, `lancer`, `squire`, `pageant_dragon` | `spear_thrust`, `taunt`, `hit_blade`, `hit_pierce`, `med_mace_crunch`, `death_male`, `med_longbow_volley`, `swing_light`, `hit_blunt`, `swing_heavy`, `death_oof`, `med_horn_charge`, `med_sword_on_plate`, `med_lance_shatter`, `med_hoof_thunder`, `med_troll_groan`, `death_big`, `med_dust_whump` | arrow: frozen Ancient switch | `med_sp_wrong_cue` + stinger `med_sting_wrong_cue` + `med_trumpet_crack`, `med_hoof_thunder`, `med_lance_shatter`, `med_crowd_ooh` | Medieval: Exploration (oga, primary) | Medieval: The Bard's Tale (oga) |
| Modern | `tin_hat_trooper`, `toast_rack_runabout`, `flowerpot_peashooter`, `trolley_rammer` | `mod_rifle_pop`, `mod_stamp_thud`, `mod_radio_squelch`, `mod_reload_clack`, `mod_pin_thunk`, `mod_helmet_bonk`, `mod_mg_stutter`, `mod_phone_ring`, `mod_plink_tink`, `mod_blast`, `mod_armour_bonk`, `mod_girder_clang`, `mod_trolley_squeak` | rifle: mod_rifle_pop#rifle; smg: mod_rifle_pop#smg | `mod_sp_live_fire` + stinger `mod_stg_whistle_snare` + `mod_loudspeaker_squelch`, `mod_whistle`, `mod_popup_clack`, `mod_confetti_pop` | Local Forecast - Elevator (incompetech, primary) | Invariance (incompetech) |
| Sci-Fi | `tidy_trooper`, `bulwark_warden`, `bubble_tender`, `rivet_gunner`, `wrench_runner` | `sf_pulse_burst`, `sf_stamp_rated`, `sf_booth_chirp`, `sf_hull_tink`, `hit_flesh_light`, `sf_emp_burst`, `sf_knockout`, `sf_dome_block`, `kick_whoomp`, `sf_bell`, `sf_rivet_chatter` | laser: sf_pulse_burst; flechette: sf_rivet_chatter#chatter | `sf_sp_lunch_served` + stinger `sf_stg_klaxon` + `sf_dome_crack`, `sf_airlock_hiss`, `sf_siren_short` | Bleeping Demo (incompetech, primary) | Rising Tide (incompetech) |

### 3.18 Scope statements

Not delivered by this file, with the owner who delivers it: sim payload changes (`src srcDef round` on `projectile_launch`, the `telegraph` payload, the three events of OI-AU2) belong to spec/M and spec/MS; bark and announcer text belong to spec/H; the interpretation of `GodPower` rows belongs to spec/CU; the unit definitions that name a projectile kind belong to the rosters (UNITS-x). AUDIO consumes those names and states in 3.11 exactly what it requires of them.

## 4. Acceptance

Tiers are VF's: F = T-fast (<= 4 min), E = T-era, U = T-full, R = release-only (VF 3.2). Every row is registered with `criterion('AU-Txx', {er:'ER12' or the ER named, owner, tier, negctl})` so VF-D1 marks it UNVERIFIED without a negative control. "NC" is the negative control: an input that must turn the test red, kept in `tests/negctl/`. Tests that read built audio (T03, T10, T14, T16, T17, T18, T22) need the P1 hunt output; until then they run on the fixtures under `tests/audio/fixtures/` and report "fixture only".

| id | script and inputs | pass threshold | owner | tier | negative control |
|---|---|---|---|---|---|
| AU-T01 | `tests/audio/matrix.test.mjs`: `au_matrix.json`, `design/<era>/{sound_music,missions_outline,god_powers,rosters}.md`, `assets/manifest.json`, `spec/CU` god-power table | every count printed in this file is re-derived and equal (families, aliases, stingers, packs, rows, files); 0 unresolved cue names of 372; 0 orphan families (a family nothing in a profile, projectile, explosion, ability, god, set-piece, event, mechanic, step or UI table reaches); every chosen licence is in `OKLIC` and recorded per row; every hot family has >= 6 recordings or is in the declared list; all 80 reuse ids exist in the Ancient ledger; the 18 `GOD_CUES` ids equal the CU table | AUDIO | F | delete one family (orphan and unresolved turn red); set one row licence to `CC BY-SA 3.0`; rename a bible cue |
| AU-T02 | `tests/audio/cue_trace.test.mjs` with `tools/lib/uc_audio.mjs traceUnitCues`, `tools/gen_era_cues.mjs`; inputs: the three era packs' `data.js`, `rosters.md`, `setpieces.generated.js`, `projkinds.js` | UC-31 and UC-40 as written: all 102 units resolve every slot (3 damage types, swing/shoot, 3 causes, voice, step) to a row of the era, a shared family in `sharedAudio` or a `SYNTH_REASONS` entry; `dropped.unknown == 0`; every `PROJ_KINDS` and `EXPLOSION_KINDS` id has its audio row; no non-arrow kind reaches `bow_shoot`; every stinger and sfx id of `setpieces.generated.js` is in the matrix and the reverse | AUDIO with TOOLS-VERIFY | F | point a `hit` slot at a missing cue; delete one `PROJ_AUDIO` row; add a set-piece sfx id the matrix lacks |
| AU-T03 | `tools/build_pack.py` + `tools/pack_check.mjs`, headless Chromium decode of every built pack from the hosted bytes (local bytes before the rehearsal) | per pack: bytes <= 1,000,000; Info/Xing header in the first frame; per row start offset <= 1 ms (44 samples), max normalised sample error <= 2e-3, lag search +-2 ms, `s0 + n <=` decoded length, sprite peak <= -2 dBFS, gutter RMS <= -90 dBFS; row count equals the matrix; all 17 packs | AUDIO | U | shift one row's `s0` by 100 samples; build a pack without the Xing header (offset 25.87 ms) |
| AU-T04 | `tools/ap_lint` (AR 3.2.1 step 5) + G9 over `assets/manifest.json`, `CREDITS.md` | the diff against the Ancient release is append-only; Ancient rows are byte-identical and carry none of `era pk s0 n lc lic snap slot`; every new row carries `era lic snap lc`; every new row id is unique and of the form `<family>_<k>` | AUDIO | F | add an `era` key to an Ancient row; reorder two Ancient rows |
| AU-T05 | `tests/audio/pack_store.test.mjs` (`mockctx` plus the Chromium offline context) | `start(when, s0/44100, n/44100)` yields exactly `n/(44100*rate)` seconds +-1 sample at rates 0.5, 1, 2; one fetch and one decode per pack; the pack is the eviction unit and `evictions` counts it; no `createBuffer` copy; a failed pack falls back to the second pick group (Ancient rows), never to silence | AUDIO | E | pass `n/44100` as a source-time duration; make the pack fetch fail and require silence |
| AU-T06 | `tests/audio/router_ancient_g9.test.mjs` replaying the recorded Ancient event streams of G9 | the cue-start sequence digest of every Ancient stream is unchanged; the resolution order is profile, then `PROJ_AUDIO`, then the legacy path; an Ancient def never resolves a profile | AUDIO | F | give one Ancient def a profile row; change the default projectile cue |
| AU-T07 | `tests/audio/beds.test.mjs`: scripted `projectile_launch`/`beam`/`unit_air_state` streams into `ShooterWindow` and `BedManager`; `tools/bed_proto.mjs` for the vehicle bed | bed on at the 3.11.8 on-thresholds and off at the off-thresholds with hysteresis; <= 2 state flips per 60 s on a steady line; 300 riflemen produce <= 32 voices and the gunfire bed engaged; vehicle prototype criteria of 3.11.8 | AUDIO | F (unit), E (prototype) | remove the hysteresis; feed shooters beyond 60 u |
| AU-T08 | `tests/audio/setpiece.test.mjs` (offline context) | set-piece dispatcher: stinger at t0, music duck -6 dB for 700 ms, sfx staggered 0.12 s from t0 + 0.2 s, Esc stops the stinger and sfx voices; telegraph alignment: the shell whistle starts at `impactTime - 2.200 s` +-5 ms, the orbital charge at `- 2.000 s`, the lock line at `- 1.100 s`; at most two bypass set-pieces per era | AUDIO | E | delay the stinger by 100 ms; start the whistle at impact |
| AU-T09 | `tests/audio/era_music.test.mjs` | `rankTracks(era, slot)` never returns a row of another era except for `editor` and `comedy`; an empty pool returns the synth spec of that era; the 21 slot picks equal the matrix primaries; a `slot:'map'` row is never chosen for `menu` or battle; `setEra` unknown id throws in dev and falls back to `ancient` in production | AUDIO | F | remove the era filter (an Ancient track plays in Modern); remove the `map` exclusion |
| AU-T10 | `tools/loop_check2.py` over the 23 bed and ambience loops, the 20 music files and `tests/audio/fixtures/` | native loops `seam_vs_p95 <= 3.0`; files that fail it are cut with a baked fade and then pass the tail term; ambience seams <= 0.02 FS; positive control (Juhani "Epic Boss Battle") scores <= 3.0 | AUDIO | E | `seam_fail.wav` (6 s tone, 20 percent step at the wrap) must score >= 6 |
| AU-T11 | `tools/key_check.py` (chroma, Krumhansl) over the 21 battle tracks | the three battle tiers of each era lie within 3 steps on the circle of fifths (relative keys equal); estimates with low confidence are listed as "listening required" and not asserted | AUDIO | E | transpose one tier by a tritone in a fixture; a fixture with a known key must be classified right |
| AU-T12 | `tests/audio/warm_era.test.mjs` (planner against `mockctx`, every tier and era) | `decodedBytes <=` the ceiling (Potato 40, Papyrus 80, Marble 160, Olympian 240 MB) after `idle()`; an Ancient battle warms exactly the rows it warms today; switching era releases other eras' rows in LRU order | AUDIO | E | warm all groups on Potato; make the Ancient warm list include a new row |
| AU-T13 | `tests/audio/dead_cues.test.mjs` + `mixtest` scenarios `med_dragon_finale`, `mod_dam_finale` | every `sfx('..')`, `play('..')`, `ui('..')` literal in `src/**` is in `CUES` or `UI_CUES` (0 missing); `ui_select` and `ui_drop` resolve to ledger rows; bypass voices connect after the limiter and before the soft clip; true peak < -1 dBFS in both finale renders | AUDIO | F | add `sfx('nope')`; connect a bypass voice after the soft clip |
| AU-T14 | `tools/build_stingers.py`, `tools/build_sfx.py amb`, `tools/loop_check2.py` | building twice gives identical sha256 for every stinger; length within +-80 ms of the matrix value; peak <= -2 dBFS; 35 stingers and 19 ambience loops all built | AUDIO | E | change one seed; truncate one stinger by 200 ms |
| AU-T15 | `tests/audio/credits.test.mjs` (3.13.2) | checks (1) to (7) of 3.13.2, and the entry counts of the generated credit tables equal the matrix | AUDIO | F | the four controls listed in 3.13.2 |
| AU-T16 | `tools/audit_sfx.mjs` with the templates of 3.14.4; every built new-era row | no row fails `no template`; every row inside its template bounds or carrying a signed `why` in the ledger `notes`; hot families: 0 rows outside; the spectrogram sheets exist (`tools/audit_sheet.py`) | TOOLS-VERIFY with AUDIO | E | a 3 s sine labelled `gunshot`; a gun row with two onsets |
| AU-T17 | `tools/mixtest.mjs --era <e> --classes` (3.14.2 solo-train protocol, olympian quality) | per family `|(S_f - S_ref) - (target - (-18))| <= 2.5 LU` (hot) or 3.5 LU (others) against Ancient `hit_blade` rendered in the same run; `tink` above `pop` by 3 +-1.5 LU (Modern); shield `pop` above `absorb` by 6 +-2 LU (Sci-Fi); `dragon` and `orbital` above `hit` by 4 +-2 LU; announcer >= music + 6 LU under a -6 dB duck | AUDIO with TOOLS-VERIFY | R | scale one class by +6 dB; remove the duck |
| AU-T18 | `tools/mixtest.mjs --era <e> --scenario <id>` for the 11 scenarios of 3.14.3 | true peak < -1 dBFS, 0 clipped samples, integrated -18 +-3 LUFS, voices <= 32, `dropped.unknown == 0`, every `expect` cue started at least the stated number of times, bed on/off as listed, shield absorb voices <= 3 at once, the gunfire or laser bed not above the music by more than 3 dB at the loudest second; `marble_600` stays under 160 MB decoded | AUDIO with TOOLS-VERIFY | R | +6 dB on one bus; remove the bed rule from `BedManager` |
| AU-T19 | `tools/licence_check.mjs` (offline, E) and `--online` (R: 100 percent of CC BY pages, 20 percent of CC0 pages, seeded) | `sha256(snapshot) == snap`; the snapshot text matches the regex of the chosen licence; the chosen licence is in `OKLIC`; no SA, GPL, NC or OGA-BY chosen; provenance below 2 is listed; online: HTTP 200 and the same licence line | TOOLS-VERIFY with AUDIO | E and R | a snapshot whose text lacks the chosen licence; a `CC BY-SA` row |
| AU-T20 | `tools/build.mjs --minify --report` | slim runtime manifest <= 20,000 B deflated for all three eras together (measured 6,282 B for the 382 current rows, 16.4 B per row; the projection with the new rows is about 17 KB in all); core rows <= 10 per era, each <= 6,500 B; no new core music; the un-core rule of 3.12.5 is evaluated and its decision recorded | TOOLS-GATE with AUDIO | U | add 200 core rows; add a note field to the slim row |
| AU-T21 | `tests/arch/hidden_assets.test.mjs` (AR-T30, AR-T31) | an `[ancient]` build has 0 foreign rows, files and credit sections; an `[all]` build has all; `sum(publishedFiles) + 383 <= 500` (today 79 + 383 = 462) | AUDIO with TOOLS-GATE | F | leave one hidden-era row in `__VW_MANIFEST__` |
| AU-T22 | the dress rehearsal (3.15), `rehearsal.html` against the hosted url | criteria (a) to (e) of 3.15 step 4 all true; (f) to (h) recorded | AUDIO with COORD | R | serve a pack as `text/html`; strip the Xing header from one pack |
| AU-T23 | `tests/audio/repetition.test.mjs` and the repetition term of `mixtest` (3.14.5) | hot families: the same asset at most 2 times in a row within 10 s, at least `min(6, variants)` distinct assets per 60 s of continuous fire; the rate rules of 3.14.5 hold | AUDIO | E | a family with one decoded row; remove the `ShuffleBag` |

Acceptance of the whole file: AU-T01 to AU-T23 registered (VF criteria manifest drift = gate failure), every UNVERIFIED reason U1 to U4 absent for T01, T02, T04, T06, T09, T13, T15, T21 at the end of P1 and for the rest at the end of P2. By-ear fit of every row is not an acceptance criterion; it is the open item OI-AU1.

## 5. Residual ledger

Every item assigned to this document, with the section that answers it. "Answered" is a complete answer; "answered, open item" means the design is complete and a named open item holds a fact that does not exist yet; "rejected" gives the reason and the fallback.

### 5.1 Plan v3.1

| item | answer | where |
|---|---|---|
| section 14 row `spec/AU` (sound bible, source matrix, packs, router tables, music slots, stingers; gate: matrix covers every family named in rosters; draft until M2 freeze) | answered; the file is marked draft until the M2 taxonomy freeze AND rosters v1 (q3_program 26) | header, 3.3, AU-T01 |
| AU0 sound bible per era (3 adjectives, reference rows, forbidden timbres, realism processing) | answered; bibles restated, nine amendments (A1 to A9) | 3.2, 3.7 |
| AU1 hunt (source matrix; hot families >= 6 sources; heavy singles >= 3; single-source families declared; Kenney sci-fi-sounds; real CC0 ambience >= 3 per era; music slot table; loop check; stingers counted) | answered | 3.3, 3.4, 3.5, 3.6, 3.16 |
| AU2 sprite packs <= 1 MB, `start(when, offset, dur)`, format fixed by the dress rehearsal | answered, format measured and decided, rehearsal specified | 3.8, 3.15 |
| AU3 `era` on rows, `warm(groups, era)` and eviction, `setEra`, per-screen era music | answered | 3.9, 3.12 |
| AU4 router tables, burst template, aggregate beds, vehicle bed after a prototype, mechanic-to-cue table | answered | 3.11 |
| AU5 dead cues `ui_select`, `ui_drop` | answered (13 + 2 call sites) | 3.12.4 |
| AU6 slim manifest, `files <= 500` guard, <= 10 core sfx per era, no new core music, un-core rule at 4.6 MB | answered | 3.9.3, 3.9.4, 3.12.5 |
| AU7 credits per era with modification notices and a credit test | answered | 3.13 |
| AU8 `mixtest` per era | answered | 3.14 |
| sfx row counts 120 / 110 / 60 plus reuse (plan section 1 table) | answered; targets exceeded, counts derived | 3.3.2 |
| music 7 per era (21), stingers counted separately | answered | 3.4, 3.5 |

### 5.2 maps/07 (audio, humour, assets)

| item | answer | where |
|---|---|---|
| seam 1 `FAMS/F()` families | answered: 144 new families, each with a `RECIPES` entry or a declared reason | 3.3, 3.7.4 |
| seam 2 `SPECIES_BY_ID`, unit identity | answered: `AUDIO_PROFILES` keyed by def id, 102 units | 3.11.5 |
| seam 3 projectile switch | answered: `PROJ_AUDIO`, `EXPLOSION_AUDIO`, size classes | 3.11.3, 3.11.4 |
| seam 4 `ABILITY_CUES`, `CC_BY_SPECIES` | answered | 3.11.6 |
| seam 5 `arenaInfo`, `STEP_BY_BIOME`, prop break | answered: ambience per theme, `ERA_STEP`, `PROP_BREAK` | 3.6, 3.11.9 |
| seam 6 `CAT_GROUP`, warm order | answered | 3.9.2, 3.12.2 |
| seam 7 sprite packs | answered | 3.8 |
| seam 8 music director and `setMood` call sites | answered | 3.12.1, 3.12.4 |
| seam 9 `engine.js` `STAT_TABLE` import | answered: AP-U02 removes it (fallback only) | 3.1 |
| seams 10 to 14 (gen-registry humour glob, announcer, sim barks, UI strings, stats and achievements) | not AUDIO's: text and registry seams, owners spec/H, spec/AR, spec/CU | 3.18 |
| seam 15 `tools/build.mjs` slim manifest, core policy | answered | 3.9.3, 3.12.5 |
| seam 16 pipeline (`sfx_spec`, `music_spec`, `build_manifest`, `verify_assets`, `credits_lib`, fetch lists, `build_all.sh`, absolute paths) | answered | 3.10 |
| section 5 gaps (sources per family) | answered by the matrix; every candidate named there was looked up; those on a rejected licence are not used | 3.3, 3.3.4 |
| risk: 511-file cap | answered: 79 new files, 462 of 500 | 3.9.5 |
| risk: page size | answered: slim manifest, core budget, un-core rule | 3.9.3, 3.12.5 |
| risk: decoded PCM | answered: per-tier table, all below the ceilings | 3.12.2 |
| risk: voice budget and `burst` | answered | 3.11.2, 3.11.8 |
| risk: determinism | answered: audio draws from its own `mulberry32`; AUDIO asks M for no RNG draw (OI-AU2) | 3.11.8 |
| risk: save compat | answered: no setting or id changes | 3.9 |
| risk: offline and core | answered: synth recipes for every family, core rows | 3.7.4, 3.12.5 |
| risk: licences | answered | 3.13 |
| risk: dead cues | answered | 3.12.4 |
| risk: nobody has listened | answered by stating it: OI-AU1 | 7 |
| risk: text | not AUDIO's | 3.18 |
| unknown 1 hosted fetch | answered, open item (rehearsal) | 3.15, OI-AU4 |
| unknown 2 real file cap | answered by the rehearsal | 3.15 |
| unknown 3 host reachability | answered: hosts used and blocked hosts listed | 3.16 |
| unknown 4 arena theme actually reaching audio | answered: W canonical ids, no `canonTheme` in audio readers; the Ancient spelling mismatch is untouched (PC-AU10) | 3.6, 3.17 |
| unknown 5 who sets the era | answered: `arena.env.era` (W) and the screen era | 3.12.1 |
| unknown 6 per-vehicle loops | answered: aggregate bed after a prototype | 3.11.8 |
| unknown 7 pack decode cost | answered with Chromium measurements; mobile Safari is OI-AU3 | 3.8, OI-AU3 |
| unknown 8 music loop seams | answered: loop check v2 | 3.4.2 |
| unknown 9 text reuse | not AUDIO's | 3.18 |
| unknown 10 peer maps | answered: names read from M, MS, W as published | 3.11, 3.17 |

### 5.3 q1_content

| item | answer | where |
|---|---|---|
| Q4 per-family source matrix; >= 6 recordings for hot families, >= 3 for heavy singles; single-source families declared | answered: `au_matrix.json`; hot families 31 of 34; declared families listed | 3.3.1, 3.3.4 |
| Q5 Kenney `sci-fi-sounds` | answered: in the Sci-Fi hunt (73 oggs, CC0, `License.txt` read from the zip) | 3.3.8, 3.16.1 |
| Q6 sound bible per era, realism processing, Modern real versus stylised guns | answered: real recordings cut to pops (AU-D8) | 3.2, 3.7.2 |
| Q7 per-unit weapon sounds need a payload | answered, open item: `src srcDef round` from M (OI-AU2); fallback one projectile kind per audible weapon class (`PROJ_ALIAS`) | 3.11.1, 3.11.3 |
| Q8 loudness classes, per-era mixtest, stem report | answered | 3.14.2, 3.14.3 |
| Q9 objective audio checks | answered: `audit_sfx` templates, spectrogram sheets, "unheard" residual | 3.14.4 |
| Q10 sprite packs: cap, shared buffer, cross-correlation test, rehearsal before the format | answered | 3.8, 3.14.1, 3.15 |
| Q11 music: Modern not orchestral, slot table, loop gate | answered | 3.4 |
| Q12 licence gate: chosen licence per row, `License.txt`, provenance score | answered | AU-D6, 3.13.3 |
| Q24 named family lists and variant minimums per era | answered: 144 families with variant minimums | 3.3.5 |
| Q25 ambience per arena family, footstep mapping | answered | 3.6, 3.11.9 |
| Q31 mechanic to cue table | answered | 3.11.8 |
| Q33 voice for new unit classes | answered, audio side | 3.11.5, 3.17 |
| Q34 credits per era and credit test | answered | 3.13 |

### 5.4 q3_product, q3_program, other specs

| item | answer | where |
|---|---|---|
| q3_product 27 music count reconciliation (target 21, floor 6, Ancient 8, rung "6 to 5", stingers separate; loop check; which track is core) | answered: 20 files + 1 synth bed; the floor of 6 files per era is met by every era; the rung may drop an alternate only; the core track is the Ancient `battle_mid_epic_boss` and no new core music | AU-D15, 3.4.2, 3.12.5 |
| q3_product 28 row counts as a derived table, exact Ancient ids reused, script check against rosters | answered | 3.3.7, 3.3.9, AU-T01 |
| q3_program 21 hidden-era omission from `__VW_MANIFEST__` and `files`, asserted by test | answered | AU-D20, 3.9.4, AU-T21 |
| q3_program 26 `design/<era>` in the dependencies; draft until M2 freeze AND rosters v1 | answered | header |
| VF OI-4, ER12, ER23 | answered | 3.14, AU-T16 to AU-T19 |
| UC-31, UC-40, UC-41, UC-42, R-UC4, OI-UC2 | answered | 3.17 |
| W request `world_foot_cues`, WC24 | answered | 3.17 |
| M 3.15 AUDIO row, M-layers 3.6.6 events, MS H5, H6, OI-MS10 | answered | 3.17 |
| CU R-CU-A1, R-CU-A2, `powerCue` | answered | 3.17 |
| S-slice SLW-19, R-SL-A1 | answered | 3.17 |
| design/scifi/missions_notes SF-DA-20 | answered | 3.17 |
| AR OW-07, OW-08, AP-U01, AP-U02, AP-X01, AP-X02, AP-X03, AP-T06, 3.11.2, 3.11.3 | answered | 3.1, 3.9, 3.12.5 |
| the three `sound_music.md` bible requests (cue names, sets of families, mixtests 1 to 3) | answered: 0 unresolved cue names of 372; the bible mixtests are the scenarios of 3.14.3 | 3.3.3, 3.11.10, 3.14.3 |

### 5.5 Rejected proposals

| proposal | reason | fallback |
|---|---|---|
| a `CC BY-SA` or GPL recording (for example `red-eclipse-sounds`, the `droid-` packs) | outside the licence gate | processed Kenney metal impacts or a synth recipe, declared |
| bible hot-family reuse of Ancient ids as first choice | recorded rows exist for nearly every Medieval slot (A6) | reuse is the second pick group |
| Opus, AAC, Vorbis pack formats | measured in AU-D2 | Vorbis `.ogg` if the rehearsal fails (3.15 step 5) |
| per-unit looped engine voices | voice budget (8 ambience slots) | aggregate vehicle bed after a prototype |
| a mission-control countdown voice, real sirens, real radio chatter, trailer braams | bibles' forbidden list | toy synth, chopped ticks |
| Standoff (`medieval_standoff.wav`) as a battle low | measured loop seam 25.09 and length 24.5 s | `Loop_The_Bards_Tale.wav` |
| 50 proposal cue names that match no accepted design | no owner, no event | listed in 3.11.10 |

## 6. Plan corrections

Each correction states what the plan or a peer document says, what the evidence says, and what this file does. The ones that change a peer document are marked for the peer to re-run its lint.

| id | the document says | the evidence says | what this file does |
|---|---|---|---|
| PC-AU1 | the Medieval bible names `minstrel-dance`, `old-tower-inn`, `kings-feast`; Umplix `to-battle` "verify licence" | the slugs answer HTTP 404; the real slugs are `medieval-minstrel-dance`, `medieval-the-old-tower-inn`, `medieval-the-bards-tale`; Umplix `to-battle` and `the-battlefield` are CC0 (OpenGameArt record) | A1 in 3.2.4; the music table uses the real slugs |
| PC-AU2 | the bible routes the beds through "the frustum shooters counter" | no such counter exists; `cues.js tick()` counts moving units only | `ShooterWindow` (A3, AU-D10) |
| PC-AU3 | plan AU4 keys `AUDIO_PROFILES[unit].shoot` as if `projectile_launch` carried the shooter | the payload has no `src`, `srcDef`; `UnitDef.sfx` is dead | spec/M adds `src srcDef round`; until then `PROJ_ALIAS` gives one kind per audible weapon class (OI-AU2) |
| PC-AU4 | (internal) a remote duration probe of the 24-bit `medieval_standoff.wav` gave 73 s | the downloaded file is 24.5 s | the probe result was discarded; every duration in this file is from `ffprobe` on downloaded bytes or from the source page |
| PC-AU5 | plan: Medieval 60 rows plus declared reuse of Ancient swords, shields, bows, horses | recorded rows exist for nearly every Medieval slot (171 committed rows); reuse as the first choice would drop recorded variants | reuse is the second pick group of 25 families (80 ids); the plan target is exceeded (3.3.2) |
| PC-AU6 | plan: Modern and Sci-Fi music CC0 first | the bibles' tempo and instrumentation are specific to the MacLeod catalogue; the CC0 candidates have head probes only | all 13 non-Medieval primaries are MacLeod CC BY 4.0; 9 CC0 candidates are kept as audition candidates (A5, 3.4.4) |
| PC-AU7 | map 07: `ui_select` / `ui_drop` have 10 call sites | 13 call sites for `ui_select` and 2 for `ui_drop` (15) | AU-D23, `dead_cues.test.mjs` scans the tree |
| PC-AU8 | plan and CU print stinger ids `*_stg_*` for all eras | the Medieval bible and `missions_outline.md` use `med_sting_*` | AU-D31: `med_sting_*` is canonical, ten `med_stg_*` / `sf_stg_*` aliases are accepted |
| PC-AU9 | plan: "the 56-session firearm library" | the 7z header lists 56 wavs in 22 folders and one csv; they are recording sessions (5.4 to 29.9 s), not takes; the archive is 193,954,738 B | 12 sessions are used, extracted one by one (AU-D27); the 194 MB fetch needs approval (OI-AU6) |
| PC-AU10 | map 07 unknown 4: Ancient `arenas.js` says `egyptian` / `punic`, presets say `egypt` / `carthage`, `THEME_STYLE` has the latter | an Ancient inconsistency, not fixable without touching Ancient | untouched; new eras use W's canonical ids, audio readers never call `canonTheme` (WC24) |
| PC-AU11 | plan: 7 music slots per era; floor 6; cut-ladder rung "6 to 5" | 21 slots = 20 files + 1 runtime synth bed; the rung "6 to 5" is below the floor of 6 files | AU-D15: the rung may drop an alternate only; Sci-Fi's defeat bed is synth by design |
| PC-AU12 | CU: "9 per era = 27" set-piece stingers | the set-piece tables hold 12 rows per era with 12 / 9 / 11 distinct stingers (32), and 3 stingers exist only for boss entrances | 35 stingers in all (3.5); CU re-runs its count |
| PC-AU13 | UC 3.12: coverage counts `row.era` in `{era, 'all'}` | AR AP-X01 makes absence mean Ancient and no `'all'` exists | coverage counts `row.era === era` (3.17); UC re-runs its lint |
| PC-AU14 | map 07 section 5 picks eight Modern titles from the incompetech catalogue | six of the eight are orchestral or choir cinematic (q1_content Q11) | the Modern table uses synth, groove and marimba pieces (3.4.1) |
| PC-AU15 | plan AU1: loop check by `analyze_music.py` / `loop_check` (v1) | on the 41 measured files v1 and v2 disagree on 16: v1 rejects 15 that v2 accepts (the Ancient core track used as positive control, six more genuine loops, and eight files with a silent tail) and passes `the_march_of_devils_dome_loop.wav`, whose seam scores 9.18 | v2 adds `seam_vs_p95` and a tail term (AU-D16); v1 is kept as a secondary report |
| PC-AU16 | plan: packs "about 6 groups x 3 eras = 18 files" | the matrix needs 17 (6 + 6 + 5) at <= 1 MB each | 3.8, 3.9.5 |
| PC-AU17 | an earlier internal count of 322 cue names | the scan finds 372 (128 / 120 / 124) | 3.11.10 uses 372 |

## 7. Open items

Phases are the plan's (P0 to P3). Every item has one owner; an item that waits for another owner's output names it.

| id | item | owner | phase | closes when |
|---|---|---|---|---|
| OI-AU1 | **By-ear verification.** Nobody has listened to any candidate row, track, stinger or recipe; every pick is a metadata and descriptor judgement. An agent that can decode audio reads the spectrogram sheets (AU-T16) and the listening checks of AU-WP17; the verification report lists the rest as "unheard". | AUDIO, REVIEWER | P2 and each P3 | AU-WP17 reports; residuals stated |
| OI-AU2 | **Sim and MS payloads.** `projectile_launch` needs `src srcDef round` (M 3.12); the events `banner_fall`, `prop_ignited`, `air_landed` and the telegraph for `beam_lock_telegraph` need their payload fields; the telegraph payload needs the impact time in sim seconds for the alignment of AU-D11. | SIM (spec/M), CAMPAIGN (spec/MS) | P2, before AU-WP11 | M and MS list the fields; AU-T08 runs on them |
| OI-AU3 | **Real-device decoding.** Chromium 141 is the only decoder measured. Safari, Firefox and phones are unmeasured: the exactness of MP3 offsets with the Xing header, the transient memory of a 1 MB pack, the 3 s music crossfade. | AUDIO with TOOLS-VERIFY | P2, then each P3 | a device matrix report; fallback Vorbis `.ogg` packs (3.15 step 5) |
| OI-AU4 | **The dress rehearsal itself** (500 files, media types, hosted offsets). The pack format is final only after it passes. | AUDIO, COORD | end of P1 | AU-T22 report copied to `golden_log.md` |
| OI-AU5 | **Confirm `ranged.proj` for every roster weapon** and freeze `PROJ_ALIAS`. The aliases in the matrix are derived from `rosters.md` v1 and the M kinds list. | AUDIO with UNITS-x and SIM | P2 | AU-T02 green on the frozen rosters (AU-WP09) |
| OI-AU6 | **Firearm library fetch approval.** The 194 MB 7z is above the 20 MB limit that applies to every other fetch of this spec; it is the only archive over that limit. | COORD | P1, before AU-WP06 | approval recorded; or the 12-session plan falls back to the 6 smaller packs and 24 recordings (the Modern hot families then stay at 6 recordings with synth pops declared) |
| OI-AU7 | **Title exceptions.** H signs a credit-only allowlist entry for each work of 3.13.4 whose title carries a word the text sweep bans. AUDIO does not rename a work. | COMEDY / TOOLS-VERIFY (text sweep) | P2 | the allowlist contains all 16 works |
| OI-AU8 | **Weak key estimates.** The chroma key estimates of some MacLeod loops are low confidence; the tonic-family rule is asserted only on confident estimates and the rest need a listening check. | AUDIO | P2 | AU-T11 and the AU-WP17 report |
| OI-AU9 | **Bed thresholds.** The initial `ShooterWindow` and `BedManager` thresholds are design values within stated ranges; `mixtest` tunes them. The vehicle bed is built only if the prototype passes. | AUDIO | P2 | AU-WP13 report |
| OI-AU10 | **Provenance.** Sources with provenance below 2 are listed as "provenance unverified"; the page tag and the snapshot are the only proof of licence. | AUDIO, HUNTER | P1, re-checked at release | AU-T19 online run |
| OI-AU11 | **Draft status.** This file is a draft until the M2 taxonomy freeze AND rosters v1. On the freeze, AU-WP00 re-runs the generator against the frozen kinds and rosters and updates this file and the matrix. | AUDIO | P1 end | `matrix.test.mjs` green on the frozen inputs |
| OI-AU12 | **Peer re-lints.** CU (stinger count, PC-AU12), UC (coverage rule, PC-AU13), and the CU `sting` priority (A9) re-run after reading this file. | CU, UC owners | P1 | their lints green |
| OI-AU13 | **Ancient muted-line cue.** R-CU-A2 gives Ancient silence; CU may ask for the Ancient tick. | CU | P3 | a CU decision |
