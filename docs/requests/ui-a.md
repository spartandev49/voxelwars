# Requests and integration notes from UI-A (kit + menu-side screens)

Everything below was built against `docs/app_contract.md`; where the contract is silent I made the smallest assumption and list it here so COORD can confirm or adjust.
No file outside `src/ui/**` (kit, screens, mockctx, strings, keymap, icons, unitinfo), `tests/ui/**`, `tools/shot_ui.mjs`, `docs/sheets/ui_*` was touched.

## 1. COORD (app shell, router, save, game, diagnostics)

1. **Call `K.init(ctx)` once at boot** (`import * as K from '../ui/kit.js'`, after the Ctx exists). It wires UI sounds to `ctx.audio.play`, and applies/subscribes the UI settings: `:root.vw-reduce-motion`, `.vw-high-contrast`, `.vw-pal-cvd|.vw-pal-contrast`, and `html{font-size}` = 16px x `settings.uiScale` x a window fit factor (1 up to 1280x720, 1.3 at 1920x1080).
   `settings.on(fn)` must call `fn` on every change and return an unsubscribe function (I rely on both). Every screen also calls `K.init(ctx)` (idempotent), so mock/test pages work.
2. **Screen ids my screens navigate to** (please register under these `meta.id`s): `splash title quick placement settings credits diagnostics codex achievements stats phone_notice fatal` (mine) and `campaign survival daily arena_builder workshop` (title menu targets; UI-B / EDITORS).
   Params I pass: `quick {arena}`, `placement {from:'quick', setup}`, `settings {tab:'graphics|gameplay|audio|access|controls|data|about'}`, `codex {tab:'units|props|arenas', unit}`, `phone_notice {editor:'arena_builder|workshop'}`. The title routes the two editors to `phone_notice` itself when `ctx.platform.isPhone()`.
3. **Esc routing**: every screen implements `onBack()`. Modals (kit.modal) handle Esc themselves in the **capture phase on `document`** and call `stopPropagation`, so a window-level bubble handler never sees that Esc. If your router listens in the capture phase, skip Esc while `K.hasModal()`.
   Placement keys (B brush cycle, Delete = erase brush, Ctrl/Cmd+Z, Space focuses FIGHT, ?/H hints) are implemented in `onKey(e)` of the placement screen: the router must call `screen.onKey(e)` for keydown (it returns true when consumed). Q/E (rotate formation) stay with Game/input.
4. **Splash** listens to `keydown`/`pointerdown` itself (idempotent) because it is the audio gesture; it calls `ctx.audio.play('ui_confirm')` synchronously inside the gesture, then `nav.goto('title')`.
5. **Game events I subscribe to in placement**: `placement`, `placed`, `placement_changed`, `brush` (any of them triggers an immediate refresh; there is also a 4 Hz change-detected poll as a safety net) and a new one, **`placement_hover` `{reason: string|null, sx, sy}`** (screen coords, emitted by Game from its pointer handling) which I render as the red cursor tooltip ("In the enemy's zone", "Underwater"). Please emit it; without it invalid-position tooltips cannot appear because only Game knows the pointer->world mapping.
   `game.setup` (getter returning the Setup passed to `begin`) is read for the arena name and faction defaults; params.setup is used when present.
6. **Setup fields I add** (ignore if unknown): `armies.A|B.style` ('balanced|rush|ranged|elite|chaos|counter'), `armies.A|B.faction` may be `'mixed'`, `rules.formation`, `rules.timeLimit` in seconds (0/180/300), `rules.weather` null = arena default, `arena.env.time` only when the player moved the time slider, `arena.presetId` + `arena.seed`.
   **Quick Fight** = `game.newSetup('quick')` -> `begin(setup)` -> `tools.autoFill(0|1, {style:'balanced', faction, budget})` -> `fight()`; it does not navigate: the router should move to the battle screen on game state `countdown` (assumption). `autoFill.budget` = amount to spend (<= cap).
   **Place armies** = `begin(setup)` then `nav.goto('placement')` only if not already there.
7. **Scout report** (`game.info.scout(team)`): array of `{id, severity:'weak'|'strong'|'tip', text, counters?: defId[]}`; I render a horizontal strip and make counter chips select that unit as the brush.
8. **Save layer**: `save.progress.reset()` (preferred; else I iterate `list()`+`remove(id)`); `progress.get('stars')` `{missionId: 0..3}`, `get('achievements')` `{id: {at: epochMs, n: count}}` (unlocked when `at` is set), `get('codex').locked` (array of unit ids still hidden), `get('survivalBest')` (wave), `get('dailyLast')` (`YYYY-MM-DD`); `save.stats.get()` -> `{key: number}` (unknown keys are shown humanised); `save.status()` 'ok|memory|full'; `save.exportAll()` -> string; `save.importAll(fileOrText)` throws an Error with a plain-English message on bad input. `platform.downloads.save(name, text)` should return a truthy value on success (null/false -> I show the copyable text fallback).
9. **Content**: `content.customDef(customSoldier)` -> UnitDef-like `{id,name,role,cost,faction:'custom',tags,...}` for the "My Soldiers" palette tab (fallback: `cs.def`, then `{role:'melee', cost:cs.cost||0}`); `content.mutators` `[{id,name,desc,stars}]`; `content.formations` (ids from sim/formations.js); `content.humor.achievements` `[{id,name,desc,icon,target?}]` (icon = any name in `src/ui/icons.js ICON_NAMES`), `content.humor.tips` (title tip), `content.arenaThumb(id)` -> dataURL (or Promise), `content.arenas[].{id,name,blurb,tactics,size,seed,recommendedBudget}`; `content.glossary.abilities[id] = {name,icon,text}` overrides my built-in ability descriptions.
   `window.__VW_CREDITS__` is the generated `assets/CREDITS.md` markdown (already inlined by build.mjs); my credits screen renders it with real links.
10. **Diagnostics snapshot shape** I render (any extra top-level object becomes its own section): `{webgl:{webgl2,renderer,vendor,version,...}, perf:{tier,fps,ms,drawCalls,triangles,units,heapMB}, audio:{state,ctxState,codecs,loaded:{embedded,fetched,synth,failed},assets:[{id,path}]}, storage:{status,bytes,keys}, csp:[strings], log:[{t,level,msg}], build:{...}}`.
11. **Fatal panel for boot failures**: `import { renderFatal } from '../ui/screens/fatal.js'; renderFatal(document.body, {kind:'webgl2'|'cdn'|'unknown', cause?, message?, diagnostics?, onSafeMode?, onReload?})` needs no ctx. Default safe mode sets `localStorage['vw.safe']='1'` and reloads (query strings never reach the page); please read that flag at boot and force the Potato preset.
12. **Keymap**: `src/ui/keymap.js` exports `KEY_ACTIONS` (15 rebindable ids with defaults), `DEFAULT_KEYS`, `FIXED_KEYS`, `currentKeys(settings)`. `settings.keys` stores only overrides (`{pan_up:'KeyJ'}`), so resolve `keys[id] || DEFAULT_KEYS[id]` in `app/input.js`. Camera and control contexts share one conflict domain because they are live together.
13. **Settings side effects**: choosing a quality preset also writes `shadows/bloom/clouds/resScale` (potato: all off, 0.7; papyrus: shadows+clouds; marble/olympian: all on) so the toggles reflect the preset. Reduce motion / high contrast / palette / UI size apply instantly through `K.applyUiSettings`. Shake % and flash limiter only write their keys (render/ applies them). The `beacon` toggle only writes `settings.beacon`.
14. **CSS order** (already in build.mjs): boot.css, kit.css, screens.css, hud.css, editors.css. kit.css re-declares the `#vw-boot` rules with equal specificity (loaded later, so it wins) and adds `.vw-fatal`.

## 2. UI-B / EDITORS (consumers of the kit)

* API is documented at the top of `src/ui/kit.js` and is frozen: `button tablet tabs tabPanel chip slider toggle select segmented card tooltip showTip/hideTip toast modal ask textModal banner progress meter kbd toolbar emptyState field statBar searchBox backdrop pageFrame muteButton copyText roving focusables` + helpers (`h icon sfx reduced anim enter keyLabel fmtNum fmtTime fmtClock`).
* Tokens are on `:root` (kit.css); extra tokens I added: `--gold-hi --crimson-deep --lapis-deep --olive-deep --pink-deep --lava-deep --team-a --team-b --team-a-deep --team-b-deep --text --text-dim --line --glass --scrim --t-fast --t-med --t-slow --z-*`. Team tokens follow the colour-blind palette automatically; use them (not hard-coded blue/red) in HUD pieces.
* `K.modal` stacks, traps focus and handles Esc; `ctx.nav.modal(opts)` should simply forward to it. A destructive confirm should use `K.ask({danger:true})` (focus starts on Cancel).
* `aria-disabled="true"` buttons stay clickable on purpose (so a screen can explain why); native `disabled` is inert.
* Test tooling you can reuse: `src/ui/mockctx.js` (`createMockApp({registry})`), `tests/ui/harness.js`, `node tools/shot_ui.mjs --all` registers every non-underscore module in `src/ui/screens/` (mine by default).

## 3. HUMOR

All menu-side copy is in `src/ui/strings.js` (single `T` object). `getT(ctx)` deep-merges `ctx.content.humor.ui` (and `humor.settingsJokes` over `T.settings`) on top, so the HUMOR pass can replace any string without touching code. `tests/ui/strings.test.mjs` checks hygiene (no markup/emoji/placeholders).

## 4. AUDIO

Cues used by the kit/screens: `ui_hover ui_click ui_confirm ui_back ui_error ui_toggle ui_tick ui_panel_open ui_achievement ui_place` plus the settings "Test" buttons (`ui_confirm`, `hit_blade`, `ui_click`, `horn_war`). All calls go through `ctx.audio.play(cue)` and are silent when audio is missing.

## 5. Known limits (honest)

* The Codex/placement turntable is `ctx.preview.turntable`; in my mock it is a 2D isometric voxel figure, the real one is COORD's render-to-texture. Layout was verified with the mock only.
* Placement pointer interaction on the canvas (ghost, snapping) is Game's; I only set tools and render tooltips from `placement_hover`.
* UI9 touch drag/pinch on the canvas and the Take Command joystick belong to input/UI-B; I verified placement sheets by tap (phone) only.
