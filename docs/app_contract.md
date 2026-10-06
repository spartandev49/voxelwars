# app_contract.md — the contract between the app shell (COORD) and the UI / editors / audio / humor agents (v1.2)

All UI is DOM over a single full-screen WebGL canvas (`#vw-canvas`, owned by `render/engine.js`). The root element is `#vw-root`. Screens are ES modules in `src/ui/screens/*.js`, HUD pieces in `src/ui/hud/*.js`, editors in `src/editors/*.js`.

**Where the code is the truth.** `src/app/main.js` (builds Ctx), `src/app/game.js` (Game), `src/app/router.js` (screens, overlays, modal, toast) and `src/save/store.js` already exist and are the truth for what they do; this file describes them. Where this file lists something that code does not have yet it says **"not in code yet"** (COORD adds it) and UI modules must treat it as optional. Decisions D7 (Rules, `Game.command`), D8 (audio facade) and D12 (results, save keys) of `docs/decisions_r3.md` are folded in.

## 1. Screen module contract
```js
// src/ui/screens/<id>.js
export const meta = { id:'title', layer:'menu|battle|editor', music:'menu|editor|battle|none', canvas:'diorama|scene|none|preview' };
export function mount(root: HTMLElement, ctx: Ctx, params: object): { destroy(): void, onKey?(e): boolean, onBack?(): boolean };
```
`root` is a fresh container `div.vw-screen.vw-screen-<id>` appended inside `#vw-ui` (`data-screen=<id>`); `destroy()` must remove listeners/timers. Screens animate in/out with transform/opacity only. `onBack` handles Esc/back (return true if consumed). **Router (`router.js`)**: a base screen (`goto(id, params)`) replaces the previous base screen and closes all overlays; **overlays** (`overlay(id, params)`: pause, results, countdown, modal-like panels) stack on top of the base; `back()` pops the topmost overlay first (after its `onBack`), then asks the base screen's `onBack`, then returns to the previous base screen (history of 20). Screens with `meta.layer === 'battle'` get a root with `pointer-events:none` (HUD over the canvas: interactive children set `pointer-events:auto` themselves); other layers are `pointer-events:auto`. If a module is missing the router falls back to `app/debugui.js` (`splash, title, placement, battle, results`); a mount that throws is reported to `ctx.diag.error('screen', ...)` and the router carries on.

## 2. Ctx (read-only object passed to every screen/editor/HUD module; built by `app/main.js`)
```ts
Ctx {
  nav:      { goto(id, params?), back(), current(): string, overlay(id, params?): bool, closeOverlay(id?), modal(opts): Promise<any>, toast(text, {kind}) }   // modal({title, body:Node|string, buttons:[{label,variant,value}]}) replaces confirm(); Esc resolves null
  settings: { get(key), set(key, value), on(fn) -> off, all(), flush() }   // dotted keys: get('vol.master'); persisted (debounced 150 ms) as `vw.settings`; see §5
  save:     {   // `store` below is the raw Store (get(key, fallback), set(key, data), remove(key), keys(), bytes(), status(), onStatus(fn))
              arenas, soldiers, armies,            // Collection: list(), get(id), put(item), remove(id); keys vw.arenas / vw.soldiers / vw.armies; caps 48 / 24 / 24 (oldest dropped)
              status(): 'ok'|'memory'|'full', store }                                   // <- exactly what main.js builds today
              // NOT IN CODE YET (spec §11 keys; COORD adds; UI reads them optionally):
              //   progress, survival, daily, seen : Doc {get(key?), set(key, value), remove(key), all()}   keys vw.progress / vw.survival / vw.daily / vw.seen (UI already calls progress.get('stars'|'achievements'|'codex'|'survivalBest'|'dailyLast'))
              //   stats : {get() -> {statKey: total}}                                    lifetime totals accumulated by save/stats.js from the sim event stream; key vw.stats = {v:1, ...keys} (docs/lifetime_stats.md)
              //   draft(editor: 'arena'|'soldier'|'painter') : {load() -> object|null, save(data), clear()}   key vw.draft.<editor>, autosaved every 20 s by the editors (spec/editors.md §0), offered back after a reload
              //   exportAll(): Promise<string>, importAll(file|text): Promise<{ok, errors[]}>   Settings > Data (spec §11)
  content:  { defs: Record<id,UnitDef>, factions, modelFor(def, unit) -> {model, scale?}, setCompiler(fn), unitList(), MODELS, BUILDERS }   // exactly what content/era_ancient/content.js buildContent() returns today
              // NOT IN CODE YET: units (alias of defs: src/ui already reads ctx.content.units), arenas (presets), arenaThumb(id), props, campaign:{missions}, humor:{tips, names, achievements, announcer, killVerbs, settingsJokes}, parts (workshop part registry), mutators, glossary, formations, counters, customDef(cs)
  audio:    Audio (D8, exactly this list; every name also exists on app/nullaudio.js):
              play(cue, {x,y,z,vol,pitch,priority,delay}) -> voice|null,  ui(name, opts?),  setListener(x,y,z,yaw),
              music: { setMood(mood, {theme}), setIntensity(v), getIntensity(), intensityFromWorld(world), stop(fade), state() },
              duck(bus, db = -6, ms = 400),  setVolume(bus, v), getVolume(bus), setMuted(b), isMuted(),  unlock(),
              attach(bus|null, {arena, world, defs, getListener}?), detach(),  state() -> 'unavailable|locked|running|suspended|muted|closed',  diagnostics()
              // buses: music, sfx, ui, announcer (master via setVolume('master', v)); speech.* (TTS) and installTestHook(vw) also exist. Before unlock() every call is a safe no-op.
  preview:  { turntable(container: HTMLElement, {model|unitId|blueprint, clip, size, interactive}) -> {setClip, setBlueprint, destroy}, arena(canvas, arenaData, {w,h}) -> thumbnail dataURL (jpeg, <= 6 KB), arenaThumb(arena, key, w, h) -> dataURL }   // render-to-texture views on the ONE GL context; created lazily on first use
  game:     Game (see §3)
  platform: { downloads: null, clipboard(text): Promise<bool>, pickFile(accept): Promise<File|null>, isTouch, viewport(): {w,h}, isPhone() }   // downloads is null in main.js today: UI must fall back to text export (`downloads.save(filename, data)` is the contract once the Artifact download capability is wired)
  diag:     { snapshot(): object, log: [...], error(kind, msg) }
  version:  { build, date }
}
```
UI must work when optional members are missing (`downloads` null -> text fallback, `preview` slow -> placeholder box, any "NOT IN CODE YET" member absent -> neutral default).

## 3. Game controller (src/app/game.js, COORD) — what battle-related UI talks to
```ts
Game {
  // lifecycle
  newSetup(kind:'quick'|'campaign'|'survival'|'daily'|'playtest', preset?: Partial<Setup>): Setup   // 'daily' seeds arena.seed from the local date (YYYYMMDD)
  begin(setup, {keepPlacements?:bool}): Promise<void>   // disposes the old battle, builds world + terrain, enters PLACEMENT; emits 'placement' and 'state'
  fight(): void                        // placement -> countdown (3 s) -> running; toasts and refuses when a side has no soldier
  pause(b), isPaused(), setSpeed(s), getSpeed()       // s in {0.25, 0.5, 1, 2, 4}
  rematch(): Promise, tweak(): Promise, exitToMenu()  // rematch = begin(keepPlacements) + fight; tweak = begin(keepPlacements)
  state: 'idle'|'placement'|'countdown'|'running'|'ended'
  // placement (pointer events on the canvas are routed to Game by app/input.js; UI only sets tools)
  tools: { setBrush({mode:'single|line|block|scatter|erase|select', defId, team:0|1, formation, count, mirror, order, custom}), brush(), undo(), redo(), canUndo(), canRedo(), clear(team?), autoFill(team,{style,faction,budget,replace}), saveArmy(name) -> {name, records}, loadArmy(data) }
              // exportArmy / importArmy (text|file) are NOT IN CODE YET (UI wraps saveArmy/loadArmy + ctx.save.armies + the share codec)
  info:  { budget(team):{spent,cap,left}, counts(team):{total,cap,types,typeCap,byType:[{defId,n}]}, validity(x,z,team?):string|null /* reason it can't be placed */, scout(team):Advice[] /* {kind:'warn', text} */ }
  // battle
  camera: { mode(): 'orbit'|'follow'|'command'|'topdown'|'cinematic'|'photo', setMode(m), follow(unitId), photo(): Promise<dataURL> }   // pan/zoom are input.js + the CameraRig, not Game API
  select(unitId|null), selected(): id, command(cmd), cast(power,x,z,team=0), possess(unitId|null), sendPossess(dx,dz,attack,ability), godPowers(): [{id,name,key,cd,cdMax,ready}] ([] until sim/godpowers.js lists them)
  hud(): HudData        // pull at <= 10 Hz; cheap; {state} only when no world exists
  on(event, fn) -> off  // events: 'state' {state}, 'placement' {arena?}, 'countdown' {n}, 'battle_start' {}, 'battle_end' ResultsData, 'toast' {text, kind}, 'brush' brushState, 'ghost' {valid, reason}, 'pause' {paused}, 'speed' {speed}, 'select' {id}, 'camera' {mode}
              // 'announce', 'objective', 'killfeed' are NOT emitted: the announcer line, the objective and the kill feed are fields of HudData (UI may also subscribe to world events through ctx.game.world.events once a battle exists)
  results(): ResultsData
}
```
- **`command(cmd)` (D7)**: `cmd = {order:'advance|hold|retreat|focus|move', squad, target?, x?, z?}`; the `type` is implied (`'command'`). `Game` stamps the tick (`world.tickN + 1`) and forwards it to `world.input`. **Today `game.js` forwards `cmd` untouched, so the sim envelope `{type:'command', squad, order, ...}` (spec §8) must be complete: COORD adds `Object.assign({type:'command'}, cmd)`.** A `cmd.type`, if present, must equal `'command'`. `cast(power, x, z, team)` and `sendPossess(...)` build the `cast` / `possess` envelopes themselves. UI names not defined by `Game` today (`aim`, `possessInput`, `teachingNext`, `skipTeaching`, `hover()`) are NOT IN CODE YET: COORD adds them or the UI agent switches to the names above (`possess`, `sendPossess`, `hoverId`).
- Take Command: `possess(id)` switches the camera to the `command` mode (follow from behind) and sends `{type:'possess', unit, release}`; `sendPossess(dx, dz, attack, ability)` sends `{type:'possess', unit, move:{x,z}, attack, ability}` every input tick.
```ts
HudData {                      // = what Game.hud() returns today; fields marked (opt) are not produced yet and UI treats them as absent
  state, time, speed, paused, fps, cam, countdown: number|0,
  teams: [{team, name /*'Blue'|'Red'*/, alive, start, cost, costStart, byType:[{defId, alive, start}]}],
  objective: {id, text, progress, state, markers}|null,                  // from world.objective.hud(world) (null until sim/objectives.js exists)
  killfeed: [{t, team, verb, text, srcDef, dstDef}],                      // last 5
  announcer: {who, text, t, chain?}|null,
  selection: {id, defId, name, hp, hpMax, kills, status:[], blurb}|null,  // selected unit, else the hovered one
  powers: [...],                                                          // godPowers()
  minimap: {world:{w,d}, terrain, terrainVersion?, dots: Float32Array [x,z,code,...], n?, ...}|null,   // today null; the shape is what ui/hud/minimap.js reads
  orders?: {current, ...},                                                // (opt) read by ui/hud/orders.js
  worldLabels?: {bubbles:[{id,text,x,y,kind?,a?}], tags:[{id,kind|text,x,y}]}   // (opt) read by ui/hud/bubbles.js; health bars are drawn by BattleView, not by the DOM
}
ResultsData {                  // = what Game.results() returns today (+ funnyStats filled by HUMOR/UI later)
  winner: 0|1|-1, reason: 'elimination|rout|time|objective|forfeit|intervention', time,
  teams: [{alive, dead, kills, damage, lostCost}],                        // index = team
  mvp: {defId, name, kills, quote?}|null,                                 // name = the unit's own name or its def name
  funnyStats: [{label, value}],                                           // [] today
  lessons: [{text, fix, who}],                                            // [] until sim/lessons.js exists
  canRematch: true, canNext: false, setup,
  stars?, rewards?, mission?                                              // (opt) campaign, not produced yet
}
Setup {
  kind, arena: {presetId|data, size:'small|medium|large', seed, env:{...}},   // `data` = custom Arena JSON/Arena instance (Arena.fromJSON enforces the §2 limits)
  rules: Rules,                                                              // the ONLY rules schema: spec.md §8.4 (friendlyFire, morale, speed, timeLimit (0 = none), difficulty, objective, godPowers, deathCorpses, corpses, gore, weather, time, startFormation, mutators[], budget, cap, freePlacement, mirror, mood)
  armies: {A: {faction|'mixed', placements: [], budget}, B: {...}},
  mission?: missionId
}
```
`Game.newSetup` fills `rules` with the defaults of the Rules table (budget 8,000, difficulty normal, timeLimit 360, mood `auto`, gore/corpses from settings). `Game.fight()` freezes the placement into `setup.armies[k].placements` as **placement records** `{team, defId, custom?, positions:[[x,z]...], cx, cz, heading, order, squadSize}` (what `rematch`/`tweak` replay); the per-unit placements `{defId|customId, x, z, heading, squadId?, order?, formation?}` are what `World.addPlacements` takes (spec §8). Budget and caps: `Game.info.budget/counts` (spec §2 presets and tier caps; 16 distinct unit types).

## 4. HUD module contract
```js
// src/ui/hud/<id>.js
export function mount(parent: HTMLElement, ctx: Ctx): { update(hud: HudData, dt): void, destroy(): void }   // update() called <= 10 Hz; write only on change; textContent only
```
Floating in-world labels: health bars and selection rings are instanced meshes drawn by `render/battleview.js`; speech bubbles and name tags use the DOM layer (`.vw-bubble` pool) fed by `hud.worldLabels` (optional, see HudData).

## 5. Settings keys (persisted `vw.settings`; defaults in `save/store.js DEFAULT_SETTINGS`)
`quality: 'potato|papyrus|marble|olympian'`, `autoScale: bool`, `resScale: 0.5..1`, `shadows, bloom, clouds: bool`, `fpsCounter: bool`, `gore: 'red|wine|confetti|off'`, `corpses: 'stay|fade|none'`, `camSens, edgeScroll, autoPauseBlur`, `cinematicStart: bool`, `vol.master|music|sfx|ui|announcer: 0..1`, `muted`, `tts: bool`, `subtitles: bool`, `reduceMotion, shake 0..1, flashLimiter, uiScale 0.8..1.3, palette: 'classic|cvd|contrast', highContrastUI`, `keys: {action: code}`, `beacon: bool` (owner-only diagnostics beacon, default on, spec §14), `seenHints: {}`.

## 6. Testing UI without the 3D app
`src/ui/mockctx.js` (UI agents write it) builds a fake `Ctx` + `Game` with sample data so every screen can be mounted in a plain page and screenshot-tested (`tools/shot.mjs`-style, `canvas:'none'`). A mock must not invent members that this file lists as NOT IN CODE YET without COORD agreeing the shape here first.

## 8. Addendum: the meta layer (src/app/meta.js, built by META; implemented and tested)
The full list lives in `docs/requests/meta_contract_additions.md` and is part of this contract: `Game.aim/possessInput/teachingNext/skipTeaching/killcam(+Active/Stop)`, `game.meta`, the `'announce'` and `'aim'` events, `HudData.possess/teaching/aim/announcer/killfeed/worldLabels/minimap`, `ResultsData.funnyStats/lessons/mvp.quote/summary`, `ctx.save.progress/survival/daily/seen/stats/draft/exportAll/importAll`, `app.meta.recordCampaign(...)`, and the quota handling of `save/store.js`.
Rulings (docs/decisions_r3.md R3): `ctx.save.importAll(fileOrText)` RESOLVES `{ok:true,...}` on success and REJECTS with an Error on failure; `content.arenaThumb(id)` returns a **Promise<dataURL>** (use `setThumb` from `ui/screens/_shared.js`); `content` also exposes `arenas`, `mutators`, `humor`, `formations`, `counters`, `props`, `parts`, `campaign`, `puzzles`, `survival`, `daily`, `customDef` when their modules exist; `ctx.editorHost` is the shared 3D host of the editors (`src/app/editorhost.js`).
`HudData.minimap` = `{world, terrain, terrainVersion, dots, n, frustum, cam, markers, zones}` (`render/minimap.js`); `HudData.worldLabels` = `{bubbles, tags}` (`render/labels.js`).
