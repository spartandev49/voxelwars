# app_contract.md — the contract between the app shell (COORD) and the UI / editors / audio / humor agents

All UI is DOM over a single full-screen WebGL canvas (`#vw-canvas`, owned by `render/engine.js`). The root element is `#vw-root`. Screens are ES modules in `src/ui/screens/*.js`, HUD pieces in `src/ui/hud/*.js`, editors in `src/editors/*.js`.

## 1. Screen module contract
```js
// src/ui/screens/<id>.js
export const meta = { id:'title', layer:'menu|battle|editor', music:'menu|editor|battle|none', canvas:'diorama|scene|none|preview' };
export function mount(root: HTMLElement, ctx: Ctx, params: object): { destroy(): void, onKey?(e): boolean, onBack?(): boolean };
```
`root` is a fresh container `div.vw-screen` appended inside `#vw-root`; `destroy()` must remove listeners/timers. Screens animate in/out with transform/opacity only. `onBack` handles Esc/back (return true if consumed).

## 2. Ctx (read-only object passed to every screen/editor/HUD module)
```ts
Ctx {
  nav:      { goto(id, params?), back(), current(): string, modal(opts): Promise<any>, toast(text, {kind}) }   // modal({title, body:Node|string, buttons:[{label,variant,value}]}) replaces confirm()
  settings: { get(key), set(key, value), on(fn) , all() }                  // see §5 keys
  save:     { arenas, soldiers, armies, progress, stats, status(): 'ok'|'memory'|'full', exportAll(): Promise, importAll(file|text): Promise }  // collections: list(), get(id), put(item), remove(id)
  content:  { units: Record<id,UnitDef>, unitList(), factions, arenas (presets), arenaThumb(id), props, campaign:{missions}, humor:{tips, names, achievements, announcer, killVerbs, settingsJokes}, parts (workshop part registry), mutators, glossary }
  audio:    { play(cue, opts), music:{setMood(m), setIntensity(x)}, duck(), setVolume(bus,v), getVolume(bus), state(), diagnostics() }
  preview:  { turntable(container: HTMLElement, {model|unitId|blueprint, clip, size, interactive}) -> {setClip, setBlueprint, destroy}, arena(canvas, arenaData, {w,h}) -> thumbnail dataURL (jpeg, <= 6 KB) , paintView(...) }   // render-to-texture views on the ONE GL context
  game:     Game (see §3)
  platform: { downloads: {save(filename, data): Promise|null}, clipboard(text): Promise<boolean>, pickFile(accept): Promise<File|null>, isTouch, viewport(), isPhone() }
  diag:     { snapshot(): object, log: [...] }
  version:  { build, date }
}
```
UI must work when optional members are missing (`downloads` null -> text fallback, `preview` slow -> placeholder box).

## 3. Game controller (src/app/game.js, COORD) — what battle-related UI talks to
```ts
Game {
  // lifecycle
  newSetup(kind:'quick'|'campaign'|'survival'|'daily'|'playtest', preset?): Setup
  begin(setup): Promise<void>          // builds world + terrain, enters PLACEMENT; emits 'placement'
  fight(): void                        // countdown (3..1) -> running
  pause(b), isPaused(), setSpeed(0.25|0.5|1|2|4), getSpeed()
  rematch(), tweak(), exitToMenu()
  state: 'idle'|'placement'|'countdown'|'running'|'ended'
  // placement (pointer events on the canvas are handled by Game; UI only sets tools)
  tools: { setBrush({mode:'single|line|block|scatter|erase|select', defId, team:0|1, formation, count, mirror, order}) , brush(), undo(), redo(), canUndo(), canRedo(), clear(team?), autoFill(team,{style,faction,budget}), saveArmy(name), loadArmy(idOrData), exportArmy(), importArmy(text|file) }
  info: { budget(team):{spent,cap,left}, counts(team):{total,cap,types,typeCap, byType:[{defId,n}]}, validity(x,z):string|null /* reason it can't be placed */, scout(team):Advice[] }
  // battle
  camera: { mode:'orbit'|'follow'|'command'|'topdown'|'cinematic'|'photo', setMode(m), follow(unitId), pan..., photo(): Promise<dataURL> }
  select(unitId|null), selected(), hover(): unit info, command({type,order,squad,target,x,z}), cast(power,x,z), possess(unitId|null), godPowers(): [{id,name,key,cd,cdMax,ready}]
  hud(): HudData        // pull at <= 10 Hz; cheap
  on(event, fn) -> off  // 'state','placement','battle_start','battle_end','announce','toast','objective','killfeed'
  results(): ResultsData
}
HudData { state, time, speed, paused, fps, cam, teams:[{team, name, alive, start, cost, costStart, byType:[{defId, alive, start}]}], objective:{id,text,progress,state,markers}|null, killfeed:[{t, text, team, verb}], announcer:{who, text, t, chain}|null, selection:{id, defId, name, hp, hpMax, kills, status:[], blurb}|null, powers:[...], orders:{...}, countdown:number|0, minimap:{...} }
ResultsData { winner, reason, time, teams:[{alive, dead, kills, damage, lost cost}], mvp:{unit, kills, quote}, funnyStats:[{label,value}], lessons:[{text, fix, who}], stars?:[...], rewards?, mission?, canRematch, canNext }
Setup { kind, arena:{presetId|data, size, seed, env overrides}, rules:{budget, difficulty, friendlyFire, morale, speed, gore, corpses, freePlacement, mirror, timeLimit, weather, mood, mutators:[]}, armies:{A:{faction|mixed, placements:[], budget}, B:{...}}, mission?:missionId }
```
Placements are `{defId|customId, x, z, heading, squadId?}`.

## 4. HUD module contract
```js
// src/ui/hud/<id>.js
export function mount(parent: HTMLElement, ctx: Ctx): { update(hud: HudData, dt): void, destroy(): void }   // update() called <= 10 Hz; write only on change; textContent only
```
Floating in-world labels (health bars, damage numbers, bubbles) are produced by `render/` using `hud.worldLabels` (COORD); UI only styles the DOM bubble layer (`.vw-bubble` pool).

## 5. Settings keys (persisted `vw.settings`)
`quality: 'potato|papyrus|marble|olympian'`, `autoScale: bool`, `resScale: 0.5..1`, `shadows, bloom, clouds: bool`, `fpsCounter: bool`, `gore: 'red|wine|confetti|off'`, `corpses: 'stay|fade|none'`, `camSens, edgeScroll, autoPauseBlur`, `vol.master|music|sfx|ui|announcer: 0..1`, `muted`, `tts: bool`, `subtitles: bool`, `reduceMotion, shake 0..1, flashLimiter, uiScale 0.8..1.3, palette: 'classic|cvd|contrast', highContrastUI`, `keys: {action: code}`, `beacon: bool`, `seenHints: {}`.

## 6. Testing UI without the 3D app
`src/ui/mockctx.js` (UI agents write it) builds a fake `Ctx` + `Game` with sample data so every screen can be mounted in a plain page and screenshot-tested (`tools/shot.mjs`-style, `canvas:'none'`).
