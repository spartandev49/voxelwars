// Game: the battle-side controller the UI talks to (see docs/app_contract.md §3).
// Owns the 3D scene objects (terrain, props, fx, battle view, camera rig), the sim World lifecycle, placement tools and HUD data.
// Pointer events on the canvas are routed here by app/input.js.

import { World } from '../sim/world.js';
import { DT } from '../sim/consts.js';
import { generateArena } from '../world/gen.js';
import { Arena, SIZES } from '../world/arena.js';
import { TerrainRenderer } from '../render/terrain.js';
import { CubeFX } from '../render/fx.js';
import { BattleView } from '../render/battleview.js';
import { CameraRig } from '../render/cameras.js';
import { lin } from '../render/engine.js';
import { teamColorsLinear } from '../render/style.js';
import { formationOffsets, placeOffsets } from '../sim/formations.js';
import { WorldLabels } from '../render/labels.js';
import { MinimapFeed } from '../render/minimap.js';
import { UndoStack } from '../core/undo.js';
import { RNG } from '../core/rng.js';
import { EventBus } from '../core/events.js';
import { PROP_RENDERER, ARMYGEN, ANIMATOR, LESSONS, POWER, MUTATORS } from '../_generated/registry.optional.js';
import { TempAnimator } from '../render/tempanimator.js';
import { waveName, waveStyle } from '../sim/waves.js';
import { resolveMode, applyModeRules, dailySeed } from './modes.js';

const T = () => window.THREE;
export const BUDGET_PRESETS = { skirmish: 3000, battle: 8000, war: 20000, epic: 40000 };
export const TIER_CAP = { potato: 100, papyrus: 200, marble: 300, olympian: 400 };
const TYPE_CAP = 16;

const DEFAULT_SCOUT = {
  no_anti_cav: 'Enemy cavalry is coming and you have no spears. Hoplites like horses (at a distance).',
  exposed_archers: 'Your archers are exposed to cavalry. Put a spear line in front of them.',
  no_ranged: 'No ranged units at all. The enemy can stand back and enjoy the show.',
  no_cavalry: 'The enemy shoots a lot and you have no horses to ride them down.',
  siege_exposed: 'Enemy siege engines are unguarded targets. Horses love unguarded targets.',
  blob_vs_ranged: 'A tight blob of infantry meets ranged fire. Spread out or bring cavalry.',
  monster_incoming: 'A very large monster is on the other side. Fire and focus help.',
  no_support: 'No healers or leaders. Your army will run out of encouragement.',
  one_note: 'Your army has one note. It is a good note, but it is the only note.',
};

export class Game {
  /** @param {{engine:any, content:any, settings:any, audio:any, bus?:EventBus}} app */
  constructor(app) {
    this.app = app; this.engine = app.engine; this.content = app.content; this.settings = app.settings; this.audio = app.audio;
    this.bus = app.bus || new EventBus();
    this.state = 'idle'; this.canvasMode = ''; this.world = null; this.setup = null; this.labels = new WorldLabels(); this.mini = new MinimapFeed();
    this.rig = new CameraRig(this.engine);
    this.terrain = new TerrainRenderer(this.engine.scene);
    this.props = PROP_RENDERER && PROP_RENDERER.PropRenderer ? new PROP_RENDERER.PropRenderer(this.engine, null) : null;
    this.fx = new CubeFX(this.engine.scene, null, 24000);
    const A = ANIMATOR && ANIMATOR.Animator; const animator = A ? (typeof A === 'function' ? new A() : A) : new TempAnimator();
    this.animator = animator;
    this.view = new BattleView({ engine: this.engine, fx: this.fx, animator, modelFor: (d, u) => this.content.modelFor(d, u), palette: this.settings.get('palette') || 'classic', gore: this.settings.get('gore') || 'red', corpses: this.settings.get('corpses') || 'stay' });
    this.view.onImpact = (p) => { const d = Math.hypot(p.x - this.rig.tx, p.z - this.rig.tz); if (d < 45 && this.state === 'running') this.rig.addTrauma(p.crit ? 0.17 : 0.09); };
    this.view.hitStop = this.settings.get('reduceMotion') ? 0 : 1;
    this.view.onShake = (a, x, z) => { this.rig.addTrauma(a); this.rig.kickFov(a * 3); };
    this.paused = false; this.speed = 1; this.acc = 0; this.alpha = 1; this.clock = 0;
    this.brushState = { mode: 'single', defId: 'hoplite', team: 0, formation: 'block', count: 9, mirror: false, order: 'advance', custom: null };
    this.undo = new UndoStack(100); this.records = [];
    this.ghost = this._makeGhost(); this.ghostInfo = { x: 0, z: 0, valid: false, reason: null, show: false };
    this.rng = new RNG(1);
    this.killfeed = []; this.announce = null; this.toasts = [];
    this.meta = null;                       // app/meta.js (set by main.js): stats, achievements, announcer, kill feed, aim, Take Command input, teaching, kill-cam
    this.hoverId = 0; this.selectedId = 0; this.possessId = 0;
    this._counts = null; this._countsT = 0;
    this.cinematic = false;
    this._pointer = { x: 0, y: 0, down: false, lastPlace: null, button: 0 };
    this.listeners = [];
    this.tier = this.settings.get('quality') || 'marble';
    this._applyTier();
    this.rules = {};
  }

  on(ev, fn) { return this.bus.on('game:' + ev, fn); }
  emit(ev, p) { if (this.isDiorama) return; this.bus.emit('game:' + ev, p || {}); }
  _applyTier() { const q = this.engine.q; this.fx.setCap(q.debris + q.particles); this.view.fxScale = this.tier === 'potato' ? 0.35 : 1; this.view.farDist = this.tier === 'potato' ? 150 : 260; this.view.lodDist = { potato: 24, papyrus: 38, marble: 56, olympian: 76 }[this.tier] || 56; this.view.nearBudget = { potato: 40, papyrus: 80, marble: 140, olympian: 260 }[this.tier] || 140; }
  setTier(t) { this.tier = t; this._applyTier(); if (this.props && this.props.setQuality) this.props.setQuality(t); }

  // ------------------------------------------------------------------ setup / lifecycle
  newSetup(kind = 'quick', preset = {}) {
    const dateSeed = kind === 'daily' ? (() => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); })() : (Math.random() * 1e9) >>> 0;
    const s = {
      kind, arena: Object.assign({ presetId: 'marathon', size: 'medium', seed: dateSeed, env: {} }, preset.arena || {}),
      rules: Object.assign({ budget: BUDGET_PRESETS.battle, difficulty: 'normal', friendlyFire: false, morale: true, speed: 1, gore: this.settings.get('gore') || 'red', corpses: this.settings.get('corpses') || 'stay', freePlacement: false, mirror: false, timeLimit: 360, weather: null, mood: 'auto', mutators: [] }, preset.rules || {}),
      armies: Object.assign({ A: { faction: 'hellenes', placements: [], budget: null }, B: { faction: 'persians', placements: [], budget: null } }, preset.armies || {}),
      mission: preset.mission || null,
    };
    return s;
  }

  _arenaFor(setup) {
    const a = setup.arena;
    if (a.data) { return a.data instanceof Arena ? a.data : Arena.fromJSON(a.data); }
    const arena = generateArena(a.presetId || 'marathon', a.size || 'medium', a.seed || 1);
    Object.assign(arena.env, a.env || {});
    if (setup.rules.weather) arena.env.weather = setup.rules.weather;
    if (setup.rules.time !== undefined && setup.rules.time !== null) arena.env.time = setup.rules.time;
    return arena;
  }

  /** Build the world + scene and enter PLACEMENT. */
  async begin(setup, { keepPlacements = false, diorama = false } = {}) {
    this.dispose(false);
    this.isDiorama = !!diorama;
    this.setup = setup;
    const mode = this.mode = resolveMode(this.content, setup);          // campaign / puzzle / survival / daily: mission rules, waves, the enemy the player never places (app/modes.js)
    this.run = null; this._inter = null; this._freeCost = 0;
    applyModeRules(this.content, setup, mode);
    this.rules = setup.rules;
    const arena = mode.m ? this.content.campaignApi.arena(mode.m) : this._arenaFor(setup);
    const rules = Object.assign({}, setup.rules, { timeLimit: setup.rules.timeLimit === undefined || setup.rules.timeLimit === null ? 360 : +setup.rules.timeLimit });
    this.world = new World({ arena, seed: (setup.arena.seed || 1) >>> 0, rules, defs: this.content.defs });
    const w = this.world;
    if (MUTATORS && MUTATORS.applyMutators) MUTATORS.applyMutators(w, setup.rules.mutators || []);
    if (mode.m) { this.run = this.content.campaignApi.setup(w, mode.m); this._freeCost = w.stats[0].startCost; }     // the enemy army, the free VIP, the script and the star tracker
    this.terrain.setArena(w.arena);
    if (this.props) { this.props.setArena ? this.props.setArena(w.arena, w.props) : null; }
    this.fx.setArena(w.arena); this.fx.clear();
    const env = this.engine.setEnvironment(w.arena.env, w.arena); this.terrain.setFog(env.color, env.near, env.far);
    this.engine.setEnvironment(w.arena.env, w.arena);
    this.view.gore = setup.rules.gore || 'red'; this.view.corpseMode = setup.rules.corpses || 'stay';
    this.view.setWorld(w, this.terrain, this.props);
    this.rig.setWorld(w); this.rig.setMode('orbit'); this.rig.yaw = -0.7; this.rig.pitch = 0.65;
    this.rig.frame(0, 0, w.arena.worldSize() * 0.55);
    this.undo.clear(); this.records.length = 0; this.killfeed.length = 0;
    this.acc = 0; this.paused = false; this.speed = 1; this.selectedId = 0; this.hoverId = 0;
    if (diorama) {
      // the title diorama: silent (no HUD, no stats, no audio), restarts itself with a new arena when the fight ends
      w.events.on('battle_end', () => { this._dioramaEnd = this.clock + 3.5; });
      this.state = 'diorama'; this.audio && this.audio.detach && this.audio.detach();
      return;
    }
    if (this.meta) this.meta.attach(w, setup);       // stats / achievements / announcer / kill feed subscribe to this world (never for the title diorama)
    w.events.on('unit_kill', (p) => this._feed(p));
    w.events.on('battle_end', (p) => { this.state = 'ended'; this.emit('battle_end', this.results()); this.emit('state', { state: 'ended' }); });
    w.events.on('battle_start', () => { this.state = 'running'; this.emit('state', { state: 'running' }); this.emit('battle_start', {}); });
    w.events.on('battle_countdown', (p) => this.emit('countdown', p));
    w.events.on('wave_intermission', (p) => this._onIntermission(p));
    w.events.on('explosion', (p) => this.rig.hint(p.x, p.z, 'explosion', 2));
    w.events.on('hero_down', () => { this.rig.addTrauma(0.35); });
    if (this.audio && this.audio.setPlayerTeam) { try { this.audio.setPlayerTeam(0); } catch (e) { /* optional */ } }
    if (this.audio && this.audio.attach) { try { this.audio.attach(w.events, { arena: w.arena, world: w, defs: this.content.defs, getListener: () => this.rig.listener }); } catch (e) { console.warn('audio attach failed', e); } }
    this.labels.bind(w); this.mini.setArena(w.arena); this._miniDirty = 0;
    w.events.on('crater', () => { this._miniDirty = this.clock; });
    this.state = 'placement';
    // restore / generate placements
    if (keepPlacements && setup.armies) { for (const key of ['A', 'B']) { if (key === 'B' && mode.locked) continue; for (const rec of setup.armies[key].placements || []) this._applyRecord(rec, false); } }
    if (mode.kind === 'daily') this.autoFill(1, { force: true, style: (setup.armies.B && setup.armies.B.style) || 'balanced', seed: dailySeed(setup.rules) });   // the army of the day: the same for every player
    this.emit('placement', { arena: w.arena });
    this.emit('state', { state: 'placement' });
    this.audio && this.audio.music && this.audio.music.setMood && this.audio.music.setMood('editor');
  }

  // ------------------------------------------------------------------ survival intermissions
  /** The sim announces a cleared wave: the battle holds (no ticks in 'placement'), the player places reinforcements inside zone A, fight() sends in the next wave. */
  _onIntermission(p) {
    if (!this.mode || !this.mode.survival || !this.world) return;
    const w = this.world, n = p.n;
    this._inter = { n, budget: p.budget, base: w.stats[0].startCost };
    this.records.length = 0; this.undo.clear(); this.select(0);
    this.state = 'placement'; this.acc = 0;
    this.brushState.team = 0;
    this.emit('intermission', { wave: n, waveName: waveName(n - 1), nextName: waveName(n), nextStyle: waveStyle(n), boss: !!p.boss, bonus: p.budget, faction: this.setup.armies.A.faction, score: w.waves ? w.waves.score() : 0, cleared: w.waves ? w.waves.cleared : 0 });
    this.emit('state', { state: 'placement' });
  }
  _resumeWave() {
    const w = this.world; this._inter = null;
    this.ghost.visible = false; this.ghostInfo.show = false;
    if (w.waves) w.waves.next();
    this.state = 'running'; this.acc = 0;
    this.emit('state', { state: 'running' });
  }
  inIntermission() { return !!this._inter; }

  zones() { return this.world.arena.zones; }
  _heading(team) { return team === 0 ? Math.PI / 2 : -Math.PI / 2; }

  // ------------------------------------------------------------------ placement
  tools = {
    setBrush: (b) => { Object.assign(this.brushState, b); this._refreshGhost(); this.emit('brush', this.brushState); },
    brush: () => Object.assign({}, this.brushState),
    undo: () => { const ok = this.undo.undo(); this.emit('placement', {}); return ok; },
    redo: () => { const ok = this.undo.redo(); this.emit('placement', {}); return ok; },
    canUndo: () => this.undo.canUndo(), canRedo: () => this.undo.canRedo(),
    clear: (team) => { if (this.state !== 'placement') return; const lock = this.mode && this.mode.locked, before = this.records.slice(); for (const r of before) if ((team === undefined || r.team === team) && !(lock && r.team === 1)) this._removeRecord(r); this.undo.clear(); this.emit('placement', {}); },
    autoFill: (team, o = {}) => this.autoFill(team, o),
    saveArmy: (name) => ({ name, records: this.records.map((r) => ({ team: r.team, defId: r.defId, custom: r.custom, positions: r.positions, heading: r.heading, order: r.order })) }),
    loadArmy: (data) => { for (const r of (data.records || [])) this._applyRecord(Object.assign({}, r), true); this.emit('placement', {}); },
  };

  info = {
    budget: (team) => {
      const inter = this._inter && team === 0;                                          // survival intermission: only the reinforcement budget of this break counts
      const cap = inter ? this._inter.budget : this._budgetCap(team);
      const spent = this.world ? this.world.stats[team].startCost - (inter ? this._inter.base : team === 0 ? this._freeCost : 0) : 0;   // the free VIP of a mission is not paid for
      return { spent, cap, left: Math.max(0, cap - spent) };
    },
    counts: (team) => {
      const w = this.world; const by = new Map(); let total = 0;
      if (w) for (const u of w.units) if (u.team === team) { total++; by.set(u.def.id, (by.get(u.def.id) || 0) + 1); }
      return { total, cap: this._teamCap(), types: by.size, typeCap: TYPE_CAP, byType: Array.from(by, ([defId, n]) => ({ defId, n })) };
    },
    validity: (x, z, team) => this._validity(x, z, team === undefined ? this.brushState.team : team),
    scout: (team) => this._scout(team),
  };
  _teamCap() { return TIER_CAP[this.tier] || 300; }
  _budgetCap(team) { const k = team === 0 ? 'A' : 'B'; const a = this.setup && this.setup.armies[k]; return (a && a.budget) || (this.setup ? this.setup.rules.budget : BUDGET_PRESETS.battle); }

  _validity(x, z, team) {
    const w = this.world; if (!w) return 'No arena loaded';
    const a = w.arena;
    if (team === 1 && this.mode && this.mode.locked) return 'The enemy deploys itself.';
    if (!w.nav.inside(x, z)) return 'Outside the arena';
    if (!w.nav.walkable(x, z)) return a.water > 0 && a.waterDepth(x, z) > 0.8 ? (a.lava ? 'That is lava. The soldiers vote no.' : 'Too deep: soldiers do not swim') : 'Not walkable';
    if (!this.setup.rules.freePlacement) {
      const z0 = team === 0 ? a.zones.A : a.zones.B;
      if (Math.abs(x - z0.x) > z0.w / 2 || Math.abs(z - z0.z) > z0.d / 2) return team === 0 ? 'Outside the blue deployment zone' : 'Outside the red deployment zone';
    }
    return null;
  }
  _unitsToPlace(mode) { return mode === 'single' ? 1 : this.brushState.count; }
  _brushPositions(x, z, team) {
    const b = this.brushState, def = this.content.defs[b.defId]; if (!def) return [];
    const heading = this._heading(team);
    if (b.mode === 'single') return [[x, z]];
    const spacing = Math.max(1.2, def.radius * 2.4);
    const kind = b.mode === 'line' ? 'line' : b.mode === 'scatter' ? 'skirmish' : (b.formation || 'block');
    const offs = formationOffsets(kind, b.count, spacing, this.rng);
    return placeOffsets(offs, x, z, heading);
  }

  _refreshGhost() {
    const g = this.ghostInfo; if (this.state !== 'placement' || !g.show) { this.ghost.visible = false; return; }
    const b = this.brushState;
    if (b.mode === 'erase' || b.mode === 'select') { this._setGhost([[g.x, g.z]], this._validity(g.x, g.z, b.team) === null, 1.6); return; }
    const pos = this._brushPositions(g.x, g.z, b.team);
    const reason = this._validity(g.x, g.z, b.team);
    let ok = reason === null;
    for (const p of pos) { if (this._validity(p[0], p[1], b.team)) { ok = false; break; } }
    g.valid = ok; g.reason = ok ? null : (reason || 'Part of the formation is out of bounds');
    this._setGhost(pos, ok, 0.9);
    this.emit('ghost', { valid: ok, reason: g.reason });
  }
  _makeGhost() {
    const THREE = T(), cap = 600;
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }), cap);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3); m.frustumCulled = false; m.count = 0; m.renderOrder = 18; m.visible = false;
    this.engine.scene.add(m); m.userData.cap = cap; return m;
  }
  _setGhost(pos, ok, size) {
    const m = this.ghost, a = this.world.arena, arr = m.instanceMatrix.array, col = m.instanceColor.array;
    const tc = this.view.teamColors[this.brushState.team === 1 ? 1 : 0];
    let n = 0;
    for (const p of pos) {
      if (n >= m.userData.cap) break;
      const gy = a.cellHeight(p[0], p[1]); const o = n * 16;
      const w = 0.8, h = 2.6;
      arr[o] = w; arr[o + 1] = 0; arr[o + 2] = 0; arr[o + 3] = 0; arr[o + 4] = 0; arr[o + 5] = h; arr[o + 6] = 0; arr[o + 7] = 0; arr[o + 8] = 0; arr[o + 9] = 0; arr[o + 10] = w; arr[o + 11] = 0; arr[o + 12] = p[0]; arr[o + 13] = gy + h / 2; arr[o + 14] = p[1]; arr[o + 15] = 1;
      if (ok) { col[n * 3] = tc[0] * 1.2 + 0.1; col[n * 3 + 1] = tc[1] * 1.2 + 0.1; col[n * 3 + 2] = tc[2] * 1.2 + 0.1; } else { col[n * 3] = 1.6; col[n * 3 + 1] = 0.05; col[n * 3 + 2] = 0.05; }
      n++;
    }
    m.count = n; m.visible = n > 0; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
  }

  /** Create units for a record and register undo. Returns the record or null. */
  _applyRecord(rec, withUndo) {
    const w = this.world; if (!w) return null;
    const def = this.content.defs[rec.defId]; if (!def) return null;
    rec.units = [];
    const team = rec.team;
    if (rec.positions.length === 1 && !rec.squadSize) {
      const sq = null;
      const u = w.addUnit(rec.defId, team, rec.positions[0][0], rec.positions[0][1], { heading: rec.heading, custom: rec.custom || undefined, def: rec.custom ? rec.custom.def : undefined });
      rec.units.push(u);
    } else {
      const sq = w.addSquad(rec.defId, team, rec.positions.length, rec.cx !== undefined ? rec.cx : rec.positions[0][0], rec.cz !== undefined ? rec.cz : rec.positions[0][1], { heading: rec.heading, order: rec.order || 'advance', formation: rec.formation, offsets: rec.offsets, def: rec.custom ? rec.custom.def : undefined });
      // addSquad positions by offsets; snap each unit to our explicit positions
      sq.units.forEach((u, i) => { if (rec.positions[i]) { u.x = u.px = rec.positions[i][0]; u.z = u.pz = rec.positions[i][1]; u.y = u.py = w.arena.cellHeight(u.x, u.z); } });
      rec.units.push(...sq.units);
    }
    this.records.push(rec);
    if (withUndo) {
      this.undo.push({ do: () => { this._reAdd(rec); }, undo: () => { this._removeRecord(rec); } });
    }
    return rec;
  }
  _reAdd(rec) { this._applyRecord(rec, false); }
  _removeRecord(rec) {
    const w = this.world, st = w.state;
    if (this._inter) w.state = 'placing';                       // World.removeUnit only works in the placing phase: a survival intermission is one (the sim itself is paused)
    try { for (const u of rec.units) w.removeUnit(u); } finally { w.state = st; }
    rec.units = []; this.records = this.records.filter((r) => r !== rec);
  }

  placeAt(x, z) {
    if (this.state !== 'placement') return false;
    const b = this.brushState, team = b.team;
    if (b.mode === 'erase') { return this._eraseAt(x, z, team); }
    if (b.mode === 'select') { return false; }
    const def = this.content.defs[b.defId]; if (!def) return false;
    const reason = this._validity(x, z, team); if (reason) { this.emit('toast', { text: reason, kind: 'error' }); this.audio && this.audio.ui && this.audio.ui('error'); return false; }
    const positions = this._brushPositions(x, z, team);
    // validate every position + budget + caps
    const n = positions.length;
    for (const p of positions) { const r = this._validity(p[0], p[1], team); if (r) { this.emit('toast', { text: r, kind: 'error' }); this.audio && this.audio.ui && this.audio.ui('error'); return false; } }
    const bud = this.info.budget(team);
    if (def.cost * n > bud.left) { this.emit('toast', { text: 'Over budget. The treasury has opinions.', kind: 'error' }); this.audio && this.audio.ui && this.audio.ui('error'); return false; }
    const cnt = this.info.counts(team);
    if (cnt.total + n > cnt.cap) { this.emit('toast', { text: `Unit cap reached (${cnt.cap} per side at this quality)`, kind: 'error' }); return false; }
    if (!cnt.byType.some((t) => t.defId === def.id) && cnt.types >= TYPE_CAP) { this.emit('toast', { text: `Max ${TYPE_CAP} different unit types per battle`, kind: 'error' }); return false; }
    const rec = { team, defId: b.defId, custom: b.custom, positions: positions.map((p) => [p[0], p[1]]), cx: x, cz: z, heading: this._heading(team), order: b.order, squadSize: n > 1 ? n : 0 };
    this._applyRecord(rec, true);
    if (b.mirror) {
      const mt = 1 - team, mp = positions.map((p) => [-p[0], -p[1]]);
      if (mp.every((p) => !this._validity(p[0], p[1], mt)) && def.cost * n <= this.info.budget(mt).left) this._applyRecord({ team: mt, defId: b.defId, custom: b.custom, positions: mp, cx: -x, cz: -z, heading: this._heading(mt), order: b.order, squadSize: n > 1 ? n : 0 }, true);
    }
    this.audio && this.audio.play && this.audio.play('ui_place', { pitch: 1 });
    this.emit('placement', {});
    return true;
  }
  _eraseAt(x, z, team) {
    if (team === 1 && this.mode && this.mode.locked) return false;
    const w = this.world; let hit = null, bd = 2.2 * 2.2;
    for (const u of w.units) { if (u.team !== team) continue; const d = (u.x - x) ** 2 + (u.z - z) ** 2; if (d < bd) { bd = d; hit = u; } }
    if (!hit) return false;
    const rec = this.records.find((r) => r.units.includes(hit));
    if (rec) { const units = rec.units.slice(); this._removeRecord(rec); this.undo.push({ do: () => this._removeRecord(rec), undo: () => this._reAdd(rec) }); }
    this.audio && this.audio.play && this.audio.play('ui_erase');
    this.emit('placement', {});
    return true;
  }

  autoFill(team, o = {}) {
    if (this.state !== 'placement') return;
    if (team === 1 && this.mode && this.mode.locked && !o.force) return;                       // missions, puzzles, the daily and survival deploy the enemy themselves
    const w = this.world, a = w.arena, zone = team === 0 ? a.zones.A : a.zones.B;
    const budget = o.budget || this._budgetCap(team) - this.info.budget(team).spent;
    const faction = o.faction || (this.setup.armies[team === 0 ? 'A' : 'B'].faction) || 'mixed';
    // remove existing units of that team first when asked
    if (o.replace !== false) this.tools.clear(team);
    let plan = null;
    if (ARMYGEN && ARMYGEN.generateArmy) {
      try {
        const army = ARMYGEN.generateArmy({ faction, budget: this._budgetCap(team), style: o.style || 'balanced', difficulty: this.setup.rules.difficulty, defs: this.content.defs, zone, arena: a, team, seed: o.seed !== undefined ? o.seed : (this.setup.arena.seed || 1) + team * 977 + (o.reroll || 0), against: this._enemyComposition(team), cap: this._teamCap() });
        plan = this._recordsFromPlacements(army && army.placements);
      } catch (e) { console.warn('armygen failed, using fallback', e); }
    }
    if (!plan || !plan.length) plan = this._fallbackPlan(team, faction, this._budgetCap(team), zone, o.style);
    for (const rec of plan) { rec.team = team; rec.heading = this._heading(team); this._applyRecord(rec, false); }
    this.undo.clear();
    this.emit('placement', {});
  }
  /** armygen placements (one entry per unit, grouped by squadId) -> placement records ({defId, positions, cx, cz, heading, order}). */
  _recordsFromPlacements(list) {
    const groups = new Map();
    for (const p of list || []) { const k = (p.squadId !== undefined ? p.squadId : 'solo' + groups.size) + ':' + p.defId; let g = groups.get(k); if (!g) { g = []; groups.set(k, g); } g.push(p); }
    const out = [];
    for (const g of groups.values()) {
      let cx = 0, cz = 0; for (const p of g) { cx += p.x; cz += p.z; } cx /= g.length; cz /= g.length;
      out.push({ defId: g[0].defId, positions: g.map((p) => [p.x, p.z]), cx, cz, heading: g[0].heading, order: g[0].order || 'advance', formation: g[0].formation, squadSize: g.length });
    }
    return out;
  }
  _enemyComposition(team) { const by = {}; if (this.world) for (const u of this.world.units) if (u.team !== team) by[u.def.id] = (by[u.def.id] || 0) + 1; return by; }
  _fallbackPlan(team, faction, budget, zone, style) {
    const defs = Object.values(this.content.defs).filter((d) => (faction === 'mixed' || d.faction === faction) && d.role !== 'hero' && d.cost <= budget * 0.5);
    const rng = this.rng.fork('fill' + team); const out = []; let left = budget, guard = 0;
    const melee = defs.filter((d) => d.role === 'melee'), ranged = defs.filter((d) => d.role === 'ranged'), cav = defs.filter((d) => d.role === 'cavalry');
    const rows = [[melee, 0.55], [ranged, 0.2], [cav, 0.15]];
    let zi = 0;
    for (const [pool, frac] of rows) {
      if (!pool.length) continue; const d = rng.pick(pool); const n = Math.max(1, Math.min(12, Math.floor(budget * frac / d.cost)));
      const spacing = Math.max(1.2, d.radius * 2.4), offs = formationOffsets(d.role === 'ranged' ? 'line' : 'block', n, spacing, rng);
      const side = team === 0 ? -1 : 1;
      const cx = zone.x + side * 0 + (zi === 0 ? (team === 0 ? 4 : -4) : zi === 1 ? (team === 0 ? -6 : 6) : 0), cz = zone.z + (zi - 1) * 9;
      const pos = placeOffsets(offs, cx, cz, this._heading(team)); zi++;
      out.push({ defId: d.id, positions: pos, cx, cz, order: 'advance', squadSize: n }); left -= n * d.cost;
    }
    return out;
  }
  /** Scout report for the placement screen: armygen.scoutReport over the two compositions, worded by humor.scout (text per code). */
  _scout(team) {
    const defs = this.content.defs, mine = {}, theirs = this._enemyComposition(team);
    for (const t of this.info.counts(team).byType) mine[t.defId] = t.n;
    if (!Object.keys(mine).length || !ARMYGEN || !ARMYGEN.scoutReport) return [];
    const words = (this.content.humor && this.content.humor.scout) || {};
    return ARMYGEN.scoutReport(defs, mine, theirs).map((a) => {
      const w = words[a.code] || {};
      return { code: a.code, severity: a.severity > 0.35 ? 'weak' : 'tip', kind: a.severity > 0.35 ? 'warn' : 'tip', text: w.text || DEFAULT_SCOUT[a.code] || a.code, counters: a.ids || [], share: a.share };
    });
  }

  // ------------------------------------------------------------------ battle control
  fight() {
    if (this.state !== 'placement') return;
    if (this._inter) { this._resumeWave(); return; }
    const w = this.world, waves = !!w.waves;
    if (w.stats[0].alive === 0 || (!waves && w.stats[1].alive === 0)) { this.emit('toast', { text: 'Both armies need at least one soldier. Fighting yourself is allowed but lonely.', kind: 'error' }); return; }
    this.ghost.visible = false; this.ghostInfo.show = false;
    // freeze the placement into the setup so rematch/tweak can replay it
    for (const k of ['A', 'B']) if (!(k === 'B' && this.mode && this.mode.locked)) this.setup.armies[k].placements = this.records.filter((r) => r.team === (k === 'A' ? 0 : 1)).map((r) => ({ team: r.team, defId: r.defId, custom: r.custom, positions: r.positions, cx: r.cx, cz: r.cz, heading: r.heading, order: r.order, squadSize: r.squadSize }));
    w.start(3); this.state = 'countdown'; this.acc = 0;
    this.rig.setMode(this.settings.get('cinematicStart') ? 'cinematic' : 'orbit');
    this.frameArmies();
    this.audio && this.audio.music && this.audio.music.setMood && this.audio.music.setMood('battle', { theme: w.arena.env.theme });
    this.emit('state', { state: 'countdown' });
  }
  /** Aim the orbit camera at the middle of the fight and pull back just far enough to hold both armies (smoothed by the rig). */
  frameArmies(snap) {
    const w = this.world; if (!w || !w.units.length) return;
    let cx = 0, cz = 0; for (const u of w.units) { cx += u.x; cz += u.z; } cx /= w.units.length; cz /= w.units.length;
    let r = 0; for (const u of w.units) r = Math.max(r, Math.hypot(u.x - cx, u.z - cz));
    const dist = Math.min(this.rig.limits.maxDist, Math.max(this.rig.limits.minDist, r * 1.12 + 14));
    this.rig.tx = cx; this.rig.tz = cz; this.rig.ty = w.arena.heightAt(cx, cz) + 1; this.rig.dist = dist;
    if (snap) this.rig.snap();
  }
  pause(b) { this.paused = !!b; this.emit('pause', { paused: this.paused }); }
  isPaused() { return this.paused; }
  setSpeed(s) { this.speed = s; this.emit('speed', { speed: s }); }
  getSpeed() { return this.speed; }
  rematch() { const s = this.setup; if (!s) return; return this.begin(s, { keepPlacements: true }).then(() => this.fight()); }
  tweak() { const s = this.setup; if (!s) return; return this.begin(s, { keepPlacements: true }); }
  exitToMenu() { this.dispose(true); this.state = 'idle'; this.emit('state', { state: 'idle' }); }

  command(c) { if (!this.world || !c) return; this.world.input(this.world.tickN + 1, Object.assign({ type: 'command' }, c)); }
  cast(power, x, z, team = 0) { if (!this.world) return; this.world.input(this.world.tickN + 1, { type: 'cast', power, x, z, team }); }
  select(id) { this.selectedId = id || 0; this.view.selected = this.selectedId; this.emit('select', { id: this.selectedId }); }
  selected() { return this.selectedId; }
  possess(id) {
    if (!this.world) return;
    if (id) { this.possessId = id; this.rig.setMode('command', { unit: id }); } else { this.possessId = 0; this.rig.setMode('orbit'); }
    this.world.input(this.world.tickN + 1, { type: 'possess', unit: id || 0, release: !id });
  }
  /** Take Command: tick-stamped movement input (world-space direction), attack flag and ability slot. */
  sendPossess(dx, dz, attack, ability) {
    if (!this.world || !this.possessId) return;
    if (this.meta && this.meta.possess.fromKeyboard(dx, dz, attack, ability)) return;      // merges the keyboard stream with the touch stick (app/meta.js PossessController)
    this.world.input(this.world.tickN + 1, { type: 'possess', unit: this.possessId, move: { x: dx, z: dz }, attack: !!attack, ability: ability | 0 });
  }
  /** Touch / HUD Take Command input: patch = { move:{x,y} (screen space, y < 0 = forward), attack?, ability?: 1|2|3, sprint? }. Camera-relative; false when nobody is possessed. */
  possessInput(patch) { return this.meta ? this.meta.possess.input(patch) : false; }
  /** God-power target mode: aim(id) arms a power (the next click on the terrain casts it there), aim(null) cancels. Esc / right-click cancel too. */
  aim(id) { return this.meta ? this.meta.aim.set(id) : false; }
  teachingNext() { return this.meta ? this.meta.teaching.next() : false; }
  skipTeaching() { return this.meta ? this.meta.teaching.skip() : false; }
  /** Kill-cam: a 4 s slow-mo dolly on the final kill after the battle, then everything is restored. Resolves true when it played. */
  killcam() { return this.meta ? this.meta.killcam.start() : Promise.resolve(false); }
  killcamActive() { return !!(this.meta && this.meta.killcam.active); }
  killcamStop() { if (this.meta) this.meta.killcam.cancel(true); }
  godPowers() { const gp = this.world && this.world.godpowers; return gp && gp.list ? gp.list(this.meta ? this.meta.pt : 0) : []; }
  camera = {
    mode: () => this.rig.mode,
    setMode: (m) => { if (m === 'follow') { const sel = this.selectedId || this._anyUnit(); this.rig.setMode('follow', { unit: sel }); } else if (m === 'command') this.possess(this.selectedId || this._anyUnit()); else this.rig.setMode(m); this.emit('camera', { mode: m }); },
    follow: (id) => this.rig.setMode('follow', { unit: id }),
    photo: async () => { this.engine.render(0.0); return this.engine.renderer.domElement.toDataURL('image/png'); },
  };
  _anyUnit() { const w = this.world; if (!w) return 0; const u = w.units.find((x) => x.alive); return u ? u.id : 0; }

  _feed(p) {
    if (this.meta) return;                  // app/meta.js writes the kill feed (killverbs.js, killer / victim split)
    const w = this.world; const verbs = (this.content.humor && this.content.humor.killVerbs) || null;
    const sd = w.defs[p.srcDef], dd = w.defs[p.dstDef];
    const verb = verbs && verbs[p.cause] ? verbs[p.cause][(Math.random() * verbs[p.cause].length) | 0] : { melee: 'bonked', ranged: 'perforated', aoe: 'flattened', fire: 'toasted', trample: 'trampled', magic: 'zapped', stone: 'petrified', kick: 'yeeted' }[p.cause] || 'defeated';
    this.killfeed.push({ t: w.time, team: p.srcTeam, verb, text: `${sd ? sd.name : 'Fate'} ${verb} ${dd ? dd.name : '???'}`, srcDef: p.srcDef, dstDef: p.dstDef });
    if (this.killfeed.length > 5) this.killfeed.shift();
  }

  // ------------------------------------------------------------------ pointer routing (from app/input.js)
  _ray(clientX, clientY) {
    const THREE = T(), cam = this.engine.camera, el = this.engine.renderer.domElement, r = el.getBoundingClientRect();
    const nx = ((clientX - r.left) / r.width) * 2 - 1, ny = -((clientY - r.top) / r.height) * 2 + 1;
    const v = new THREE.Vector3(nx, ny, 0.5).unproject(cam).sub(cam.position).normalize();
    return { o: cam.position, d: v };
  }
  groundAt(clientX, clientY) { const ray = this._ray(clientX, clientY); const hit = this.terrain.raycast({ x: ray.o.x, y: ray.o.y, z: ray.o.z }, { x: ray.d.x, y: ray.d.y, z: ray.d.z }, 500); return hit; }
  pointerMove(cx, cy) {
    this._pointer.x = cx; this._pointer.y = cy;
    if (!this.world) return;
    const hit = this.groundAt(cx, cy); if (!hit) { this.ghostInfo.show = false; this._refreshGhost(); return; }
    if (this.state === 'placement') {
      this.ghostInfo.x = hit.x; this.ghostInfo.z = hit.z; this.ghostInfo.show = true; this._refreshGhost();
      if (this._pointer.down && (this.brushState.mode === 'scatter' || this.brushState.mode === 'erase')) {
        const lp = this._pointer.lastPlace; if (!lp || Math.hypot(lp[0] - hit.x, lp[1] - hit.z) > (this.brushState.mode === 'erase' ? 1.2 : 3.0)) { this._pointer.lastPlace = [hit.x, hit.z]; this.placeAt(hit.x, hit.z); }
      }
    } else if (this.state === 'running' || this.state === 'countdown') {
      if (this.meta) this.meta.aim.hover(hit.x, hit.z);          // the aim ring follows the cursor while a god power is armed
      let best = 0, bd = 3.5 * 3.5;
      for (const u of this.world.units) { const d = (u.x - hit.x) ** 2 + (u.z - hit.z) ** 2; if (d < bd) { bd = d; best = u.id; } }
      this.hoverId = best; this.view.hover = best;
    }
  }
  pointerDown(cx, cy, button = 0) {
    this._pointer.down = true; this._pointer.button = button; this._pointer.lastPlace = null;
    if (!this.world || button !== 0) return;
    const hit = this.groundAt(cx, cy);
    if (this.state === 'placement') { if (hit) { this.ghostInfo.x = hit.x; this.ghostInfo.z = hit.z; this.placeAt(hit.x, hit.z); this._pointer.lastPlace = [hit.x, hit.z]; } }
    else if (this.state === 'running') {
      if (hit && this.meta && this.meta.aim.click(hit.x, hit.z)) return;      // an armed god power takes the click (casts at the terrain point); no selection change
      this.select(this.hoverId); this.emit('select', { id: this.hoverId });
    }
  }
  pointerUp() { this._pointer.down = false; }

  // ------------------------------------------------------------------ frame
  /** Called once per rendered frame by app/loop.js. */
  frame(dt) {
    const w = this.world; this.clock += dt;
    const eng = this.engine;
    if (this.meta) this.meta.onFrame(dt);                                          // REAL seconds: announcer, toast queue, kill-cam camera, Take Command input (before the rig update)
    if (this.canvasMode === 'none' || this.canvasMode === 'preview') return;      // an opaque menu covers the canvas: do not pay for rendering it
    if (this.state === 'diorama') this._dioramaFrame(dt);
    if (w) {
      if ((this.state === 'countdown' || this.state === 'running' || this.state === 'ended' || this.state === 'diorama') && !this.paused) {
        this.acc += Math.min(dt, 0.1) * this.speed;
        let n = 0;
        while (this.acc >= DT && n < 5 && this.state !== 'placement') { w.tick(); this.acc -= DT; n++; this.fx.update(0); }
        if (this.acc > DT * 5) this.acc = 0;
        this.alpha = this.acc / DT;
      } else this.alpha = 1;
      const rdt = this.paused ? 0 : dt * this.speed;
      this.rig.update(dt, this.alpha);
      this.view.update(this.alpha, dt, this.engine.camera);
      this.fx.update(rdt);
      this.terrain.update(dt);
      if (this.props && this.props.update) this.props.update(dt, this.engine.camera);
      this._countsT -= dt;
    } else { this.rig.update(dt, 1); this.terrain.update(dt); }
    eng.render(dt);
    if (this.audio && this.audio.setListener) { const l = this.rig.listener; this.audio.setListener(l.x, l.y, l.z, l.yaw); }
  }

  // ------------------------------------------------------------------ title diorama + canvas mode
  /** which screen layer is on top of the canvas: 'scene' (3D visible), 'diorama' (menu with live backdrop), 'none'/'preview' (opaque menu: the canvas is not rendered) */
  setCanvasMode(m) {
    if (m === this.canvasMode) return; this.canvasMode = m;
    const el = this.engine.renderer.domElement; el.style.visibility = (m === 'none' || m === 'preview') ? 'hidden' : 'visible';
    if (m === 'diorama') this.startDiorama(); else if (this.state === 'diorama') this.stopDiorama();
    this._applyViewOffset();
  }
  /** Shift the 3D image to the right while the title menu occupies the left column of the screen. */
  _applyViewOffset() {
    const cam = this.engine.camera, el = this.engine.renderer.domElement;
    const W = el.clientWidth || window.innerWidth, H = el.clientHeight || window.innerHeight;
    if (this.state === 'diorama' && W > 900) { cam.setViewOffset(W, H, -W * 0.17, 0, W, H); } else if (cam.view && cam.view.enabled) cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }
  onResize() { this._applyViewOffset(); }
  async startDiorama() {
    if (this.state !== 'idle' && this.state !== 'diorama') return;
    if (this.state === 'diorama' && this.world) return;
    const SETS = [['marathon', 'hellenes', 'persians', 11], ['olympus', 'hellenes', 'romans', 21], ['giza', 'egyptians', 'persians', 31], ['troy', 'hellenes', 'hellenes', 41], ['teutoburg', 'romans', 'celts', 51], ['nile', 'egyptians', 'romans', 61], ['alpine', 'carthaginians', 'romans', 71]];
    const pick = SETS[(this._dioramaIdx = ((this._dioramaIdx === undefined ? Math.floor(Math.random() * SETS.length) : this._dioramaIdx + 1)) % SETS.length)];
    const factions = Object.keys(this.content.factions || {});
    const f = (id, fb) => (factions.includes(id) ? id : fb);
    const setup = this.newSetup('quick', { arena: { presetId: pick[0], size: 'small', seed: pick[3] }, rules: { budget: 2600, timeLimit: 120, gore: 'red' }, armies: { A: { faction: f(pick[1], 'hellenes'), placements: [], budget: null }, B: { faction: f(pick[2], 'persians'), placements: [], budget: null } } });
    try {
      await this.begin(setup, { diorama: true });
    } catch (e) { console.warn('diorama failed', e); this.state = 'idle'; return; }
    if (this.canvasMode !== 'diorama') { this.dispose(true); this.state = 'idle'; return; }
    this.state = 'placement'; this.autoFill(0, {}); this.autoFill(1, {}); this.state = 'diorama';
    const w = this.world; w.start(0); this.speed = 1; this.paused = false; this.acc = 0; this._dioramaEnd = 0;
    this.rig.setMode('orbit'); this.rig.pitch = 0.46; this.rig.yaw = -0.5; this.frameArmies(true); this.rig.dist = Math.min(this.rig.dist, 46);
    this._applyViewOffset();
  }
  stopDiorama() {
    if (this.state !== 'diorama') return;
    this.dispose(true); this.state = 'idle'; this.isDiorama = false; this._applyViewOffset();
  }
  _dioramaFrame(dt) {
    const w = this.world; if (!w) return;
    this.rig.yaw += dt * 0.045; this._dioramaT = (this._dioramaT || 0) + dt;
    if (this._dioramaT > 0.8) { this._dioramaT = 0; this.frameArmies(false); this.rig.dist = Math.min(this.rig.dist, 46); }
    if (this._dioramaEnd && this.clock > this._dioramaEnd) { this._dioramaEnd = 0; this.dispose(true); this.state = 'idle'; this.startDiorama(); }
  }

  // ------------------------------------------------------------------ HUD / results
  hud() {
    const w = this.world; if (!w) return { state: this.state };
    if (this._miniDirty && this.clock - this._miniDirty > 1.2) { this._miniDirty = 0; this.mini.invalidate(); }
    const teams = [0, 1].map((t) => { const s = w.stats[t]; return { team: t, name: t === 0 ? 'Blue' : 'Red', alive: s.alive, start: s.startCount, cost: s.aliveCost, costStart: s.startCost, byType: this._byType(t) }; });
    const sel = this.selectedId ? (w.units.find((u) => u.id === this.selectedId) || null) : null;
    const hv = this.hoverId ? (w.units.find((u) => u.id === this.hoverId) || null) : null;
    const show = sel || hv;
    const d = {
      state: this.state, time: w.time, speed: this.speed, paused: this.paused, fps: this.fps || 0, cam: this.rig.mode, teams, countdown: this.state === 'countdown' ? Math.ceil(w.countdown) : 0,
      survival: w.waves ? { wave: w.waves.n, waveName: waveName(Math.max(1, w.waves.n)), cleared: w.waves.cleared, score: w.waves.score(), state: w.waves.state, nextIn: w.waves.state === 'fighting' ? Math.max(0, Math.ceil(w.waves.interval - w.waves.timer)) : 0 } : null,
      objective: w.objective && w.objective.hud ? w.objective.hud(w) : null, killfeed: this.killfeed.slice(), announcer: this.announce,
      selection: show ? { id: show.id, defId: show.def.id, name: show.name || show.def.name, hp: show.hp, hpMax: show.hpMax, kills: show.kills, status: [], blurb: (show.def.text && show.def.text.blurb) || '' } : null,
      powers: this.godPowers(), minimap: this.mini.update(w, this.engine.camera, this.selectedId, this.rig.ty, this.state === 'placement'),
      worldLabels: this.labels.snapshot(this.engine.camera, this.engine.renderer.domElement.clientWidth, this.engine.renderer.domElement.clientHeight, w.time),
    };
    return this.meta ? this.meta.decorateHud(d) : d;                              // + possess, teaching, aim (app/meta.js)
  }
  _byType(team) {
    const w = this.world; const m = new Map();
    for (const u of w.units) if (u.team === team) m.set(u.def.id, (m.get(u.def.id) || 0) + 1);
    for (const k of this.records) if (k.team === team) {/* start counts are derived from stats below */}
    return Array.from(m, ([defId, alive]) => ({ defId, alive, start: alive }));
  }
  results() {
    const w = this.world; const s = w.stats; let mvp = null;
    for (const u of w.units) if (!mvp || u.kills > mvp.kills) mvp = u; for (const u of w.dying) if (!mvp || u.kills > mvp.kills) mvp = u;
    const lessons = [];                      // generated from the recorded event log by app/meta.js (sim/lessons.js reads a log, not the World)
    const res = { winner: w.winner, reason: w.endReason, time: w.time, teams: [0, 1].map((t) => ({ alive: s[t].alive, dead: s[t].dead, kills: s[t].kills, damage: s[t].damageDealt, lostCost: s[t].deadCost })), mvp: mvp ? { defId: mvp.def.id, name: mvp.name || mvp.def.name, kills: mvp.kills } : null, funnyStats: [], lessons, canRematch: true, canNext: false, setup: this.setup };
    return this.meta ? this.meta.decorateResults(res) : res;                      // + funnyStats, lessons, MVP last words, survival / daily blocks (app/meta.js)
  }

  dispose(full) {
    if (this.meta) { this.meta.detach(); this.possessId = 0; }              // unsubscribes from the old world, cancels aim / kill-cam, clears the announcer slot
    if (this.audio && this.audio.detach) { try { this.audio.detach(); } catch (e) { /* ignore */ } }
    this.view.unbind(); this.labels.unbind();
    if (this.world) { this.world = null; }
    this.terrain.clear(); this.fx.clear(); this.ghost.visible = false; this.records.length = 0;
    this.run = null; this._inter = null;
  }
}
