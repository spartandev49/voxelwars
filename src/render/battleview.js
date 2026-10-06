// BattleView: turns sim state into pixels. One VoxSkin per model, interpolated transforms, animator poses, corpses,
// projectiles (instanced), health bars/selection rings (instanced billboards) and event-driven FX (CubeFX).
// The sim is never touched from here; everything is read from world.units / world.dying / world.proj and world.events.

import { VoxSkin, newPose, POSE_STRIDE } from './voxskin.js';
import { fxRand } from '../core/rng.js';
import { teamColorsLinear } from './style.js';
import { srgbToLinear } from '../voxel/mesher.js';

const T = () => window.THREE;
const TAU = Math.PI * 2;
const lerpAngle = (a, b, t) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return a + d * t; };

// projectile visual table: [length, thickness, colour(sRGB hex), glow]
const PROJ_VIS = {
  arrow: [0.85, 0.05, 0xd8c8a0, 0], javelin: [1.5, 0.07, 0xc9a56a, 0], pilum: [1.7, 0.07, 0x9aa0a8, 0], francisca: [0.5, 0.28, 0x9aa0a8, 0], bolt: [1.4, 0.1, 0x8a6a40, 0],
  boulder: [0.9, 0.9, 0x8d8d92, 0], coin: [0.22, 0.22, 0xffd23a, 0.6], sunbeam: [1.2, 0.14, 0xfff2a0, 1], scepter: [0.7, 0.4, 0x60ffb0, 1], thunderbolt: [1.4, 0.14, 0x9fd0ff, 1],
};

export class BattleView {
  /**
   * @param {object} o {engine, fx, animator, modelFor(def, unit)->{model, scale?:[x,y,z]}, palette?, gore?}
   */
  constructor(o) {
    this.engine = o.engine; this.scene = o.engine.scene; this.fx = o.fx; this.animator = o.animator; this.modelFor = o.modelFor;
    this.teamColors = teamColorsLinear(o.palette || 'classic');
    this.gore = o.gore || 'red'; this.corpseMode = o.corpses || 'stay'; this.fxScale = 1;
    this.skins = new Map(); this.corpses = []; this.maxCorpses = 60;
    this.world = null; this.off = [];
    this.extra = { speed: 0, gait: 0, dead: false, t: 0, root: { y: 0, x: 0, z: 0, pitch: 0, roll: 0, yaw: 0 }, team: 0 };
    this.frustum = new (T().Frustum)(); this._pm = new (T().Matrix4)(); this._sph = new (T().Sphere)();
    this.selected = 0; this.hover = 0; this.hpBars = true; this.projectilesOn = true;
    this._initProjectiles(); this._initBars();
    this.time = 0; this.dustT = 0;
  }

  // ------------------------------------------------------------------ world binding
  setWorld(world, terrainRenderer, propRenderer) {
    this.unbind();
    this.world = world; this.terrain = terrainRenderer || null; this.props = propRenderer || null;
    this.corpses.length = 0;
    const ev = world.events;
    const on = (t, f) => this.off.push(ev.on(t, f));
    on('unit_hit', (p) => this._onHit(p));
    on('unit_block', (p) => this._onBlock(p));
    on('unit_kill', (p) => this._onKill(p));
    on('unit_corpse_done', (p) => this._onCorpse(p));
    on('projectile_hit', (p) => this._onProjHit(p));
    on('explosion', (p) => this._onExplosion(p));
    on('crater', (p) => { if (this.terrain) this.terrain.markDirty({ x0: p.x0, z0: p.z0, x1: p.x1, z1: p.z1 }); });
    on('prop_damaged', (p) => { if (this.props && this.props.setStageById) this.props.setStageById(p.id, p.hpFrac < 0.6 ? 1 : 0); });
    on('prop_destroyed', (p) => this._onPropDestroyed(p));
    on('lightning_arc', (p) => this.fx.lightning(p.x0, p.y0, p.z0, p.x1, p.y1, p.z1));
    on('unit_heal', (p) => { const u = this._unitById(p.id); if (u) for (let i = 0; i < 4; i++) this.fx.spawn(u.x + (fxRand.next() - 0.5), u.y + 1 + fxRand.next() * 1.5, u.z + (fxRand.next() - 0.5), 0, 1.5, 0, 0x6aff9a, 0.1, 0.6, { g: -1, flags: 2 | 4 }); });
    on('stone_gaze', () => {});
  }
  unbind() { for (const f of this.off) f(); this.off.length = 0; this.world = null; }
  _unitById(id) { const w = this.world; if (!w) return null; for (const u of w.units) if (u.id === id) return u; for (const u of w.dying) if (u.id === id) return u; return null; }

  // ------------------------------------------------------------------ skins
  _rec(u) {
    const key = u.custom ? 'c:' + (u.custom.id || u.def.id) : u.def.id;
    let r = this.skins.get(key);
    if (!r) {
      const mm = this.modelFor(u.def, u);
      const model = mm.model;
      const skin = new VoxSkin(this.engine, model, { capacity: 32, shadow: true });
      r = { key, model, skin, pose: newPose(model.parts.length), scaleVec: mm.scale || [1, 1, 1], palette: this._palette(model), glow: mm.glow || 0 };
      this.skins.set(key, r);
    }
    return r;
  }
  _palette(model) {
    const cols = [];
    for (const p of model.parts) {
      const g = p.grid, n = g.d.length; let seen = 0;
      for (let i = 0; i < n && seen < 40; i += 1 + ((fxRand.next() * 6) | 0)) { const v = g.d[i]; if (v) { cols.push(v & 0xffffff); seen++; } }
    }
    return cols.length ? cols : [0x888888];
  }
  _team(t) { return this.teamColors[t === 1 ? 1 : 0]; }
  setPalette(name) { this.teamColors = teamColorsLinear(name); }

  // ------------------------------------------------------------------ per-frame
  update(alpha, dt, camera) {
    const w = this.world; if (!w) return;
    this.time += dt;
    const THREE = T();
    this._pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); this.frustum.setFromProjectionMatrix(this._pm);
    for (const r of this.skins.values()) r.skin.begin();
    const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
    const far = this.farDist || 260;
    this.drawn = 0;
    const draw = (u, dead) => {
      const r = this._rec(u);
      const x = u.px + (u.x - u.px) * alpha, y = u.py + (u.y - u.py) * alpha, z = u.pz + (u.z - u.pz) * alpha;
      const dx = x - cx, dz = z - cz;
      if (dx * dx + dz * dz + (y - cy) * (y - cy) > far * far) return;
      this._sph.center.set(x, y + 1.4 * u.scale, z); this._sph.radius = 3.4 * u.scale + 1;
      if (!this.frustum.intersectsSphere(this._sph)) return;
      const ex = this.extra; ex.speed = u.speedNow; ex.gait = u.gait; ex.dead = dead; ex.team = u.team; ex.t = this.time; ex.id = u.id; ex.hp = u.hp / u.hpMax; ex.state = u.state;
      const rt = ex.root; rt.y = 0; rt.x = 0; rt.z = 0; rt.pitch = 0; rt.roll = 0; rt.yaw = 0;
      this.animator.pose(r.model, u.anim, ex, r.pose);
      const h = lerpAngle(u.pheading, u.heading, alpha);
      const s = u.scale, sv = r.scaleVec;
      r.skin.add(x + rt.x, y + rt.y, z + rt.z, h + rt.yaw, s * sv[0], s * sv[1], s * sv[2], r.pose, this._team(u.team), u.flash, u.stone, r.glow, (u.pitch || 0) + rt.pitch, (u.roll || 0) + rt.roll);
      this.drawn++;
    };
    const U = w.units;
    for (let i = 0; i < U.length; i++) draw(U[i], false);
    const D = w.dying;
    for (let i = 0; i < D.length; i++) draw(D[i], true);
    // static corpses
    for (let i = 0; i < this.corpses.length; i++) {
      const c = this.corpses[i], r = this.skins.get(c.key); if (!r) continue;
      const dx = c.x - cx, dz = c.z - cz; if (dx * dx + dz * dz > far * far * 0.6) continue;
      r.skin.add(c.x, c.y, c.z, c.h, c.sx, c.sy, c.sz, c.pose, this._team(c.team), 0, c.stone, 0, c.pitch, c.roll);
    }
    for (const r of this.skins.values()) r.skin.end();
    this._updateProjectiles(alpha, camera);
    this._updateBars(camera);
    this._ambientFx(dt, camera);
  }

  // ------------------------------------------------------------------ projectiles (one instanced mesh)
  _initProjectiles() {
    const THREE = T();
    const cap = 1500;
    this.pm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), cap);
    this.pm.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pm.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
    this.pm.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.pm.frustumCulled = false; this.pm.castShadow = false; this.pm.count = 0;
    this.scene.add(this.pm); this.pmCap = cap;
    this._lin = {}; for (const k of Object.keys(PROJ_VIS)) { const h = PROJ_VIS[k][2]; this._lin[k] = [srgbToLinear(((h >> 16) & 255) / 255), srgbToLinear(((h >> 8) & 255) / 255), srgbToLinear((h & 255) / 255)]; }
  }
  _updateProjectiles(alpha, camera) {
    const w = this.world, list = w.proj.list, m = this.pm.instanceMatrix.array, col = this.pm.instanceColor.array;
    let n = 0;
    for (let i = 0; i < list.length && n < this.pmCap; i++) {
      const p = list[i]; if (!p.active) continue;
      const vis = PROJ_VIS[p.kind] || PROJ_VIS.arrow;
      const x = p.px + (p.x - p.px) * alpha, y = p.py + (p.y - p.py) * alpha, z = p.pz + (p.z - p.pz) * alpha;
      let dx = p.vx, dy = p.vy, dz = p.vz; let l = Math.hypot(dx, dy, dz);
      if (l < 0.01) { // stuck in the ground/shield: keep last orientation (use previous motion)
        dx = p.x - p.px; dy = p.y - p.py; dz = p.z - p.pz; l = Math.hypot(dx, dy, dz) || 1; if (l < 0.0001) { dx = 0; dy = -1; dz = 0; l = 1; }
      }
      dx /= l; dy /= l; dz /= l;
      // basis: z axis = direction, x = up x dir
      let ux = 0, uy = 1, uz = 0; if (Math.abs(dy) > 0.98) { ux = 1; uy = 0; }
      let rx = uy * dz - uz * dy, ry = uz * dx - ux * dz, rz = ux * dy - uy * dx; const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;
      const tx = dy * rz - dz * ry, ty = dz * rx - dx * rz, tz = dx * ry - dy * rx;
      const sx = vis[1], sy = vis[1], sz = vis[0];
      const o = n * 16;
      let spin = 0; if (p.kind === 'boulder' || p.kind === 'francisca') spin = (this.time * 8 + p.id) ;
      if (spin) { const c = Math.cos(spin), s = Math.sin(spin); const ax = rx * c + tx * s, ay = ry * c + ty * s, az = rz * c + tz * s; const bx = -rx * s + tx * c, by = -ry * s + ty * c, bz = -rz * s + tz * c; rx = ax; ry = ay; rz = az; /* eslint-disable-line */ m[o] = rx * sx; m[o + 1] = ry * sx; m[o + 2] = rz * sx; m[o + 4] = bx * sy; m[o + 5] = by * sy; m[o + 6] = bz * sy; }
      else { m[o] = rx * sx; m[o + 1] = ry * sx; m[o + 2] = rz * sx; m[o + 4] = tx * sy; m[o + 5] = ty * sy; m[o + 6] = tz * sy; }
      m[o + 3] = 0; m[o + 7] = 0; m[o + 8] = dx * sz; m[o + 9] = dy * sz; m[o + 10] = dz * sz; m[o + 11] = 0; m[o + 12] = x; m[o + 13] = y; m[o + 14] = z; m[o + 15] = 1;
      const c = this._lin[p.kind] || this._lin.arrow, g = 1 + vis[3] * 1.6;
      col[n * 3] = c[0] * g; col[n * 3 + 1] = c[1] * g; col[n * 3 + 2] = c[2] * g;
      n++;
      if (vis[3] > 0.5 && (this.time * 60 | 0) % 2 === 0 && this.fxScale > 0.3) this.fx.spawn(x, y, z, 0, 0, 0, p.kind === 'thunderbolt' ? 0xbfe0ff : p.kind === 'scepter' ? 0x7dffb8 : 0xfff2a0, 0.1, 0.25, { g: 0, drag: 2, flags: 2 | 4 });
    }
    this.pm.count = n; this.pm.visible = n > 0 && this.projectilesOn;
    this.pm.instanceMatrix.updateRange.count = n * 16; this.pm.instanceMatrix.needsUpdate = true;
    this.pm.instanceColor.updateRange.count = n * 3; this.pm.instanceColor.needsUpdate = true;
  }

  // ------------------------------------------------------------------ health bars + selection rings (instanced billboards)
  _initBars() {
    const THREE = T(), cap = 512;
    const geo = new THREE.PlaneGeometry(1, 1);
    const mk = () => { const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: true, depthWrite: false, transparent: true, fog: false }), cap); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3); m.instanceColor.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0; m.renderOrder = 20; this.scene.add(m); return m; };
    this.barBack = mk(); this.barFill = mk(); this.barCap = cap;
    const ring = new THREE.InstancedMesh(new THREE.RingGeometry(0.78, 1, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, fog: false }), 8);
    ring.instanceMatrix.setUsage(THREE.DynamicDrawUsage); ring.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(8 * 3).fill(1), 3); ring.frustumCulled = false; ring.count = 0; ring.renderOrder = 19; this.scene.add(ring); this.rings = ring;
    this._cr = new THREE.Vector3(); this._cu = new THREE.Vector3();
  }
  _updateBars(camera) {
    const w = this.world, U = w.units;
    const bb = this.barBack.instanceMatrix.array, bf = this.barFill.instanceMatrix.array, fc = this.barFill.instanceColor.array, bc = this.barBack.instanceColor.array;
    const e = camera.matrixWorld.elements;
    const rx = e[0], ry = e[1], rz = e[2], ux = e[4], uy = e[5], uz = e[6];
    let n = 0;
    if (this.hpBars) {
      const cx = camera.position.x, cz = camera.position.z, lim = 70 * 70;
      for (let i = 0; i < U.length && n < this.barCap; i++) {
        const u = U[i];
        const hurt = u.hp < u.hpMax * 0.995, special = u.def.role === 'hero' || u.def.role === 'monster' || u.id === this.selected || u.id === this.hover;
        if (!hurt && !special) continue;
        const dx = u.x - cx, dz = u.z - cz; if (dx * dx + dz * dz > lim) continue;
        const f = Math.max(0, u.hp / u.hpMax), wd = 0.9 + Math.min(1.2, u.scale * 0.5 + (u.def.role === 'monster' ? 0.6 : 0)), hh = 0.14;
        const px = u.x, py = u.y + u.height * 1.05 + 0.5, pz = u.z;
        let o = n * 16;
        bb[o] = rx * (wd + 0.06); bb[o + 1] = ry * (wd + 0.06); bb[o + 2] = rz * (wd + 0.06); bb[o + 3] = 0; bb[o + 4] = ux * (hh + 0.06); bb[o + 5] = uy * (hh + 0.06); bb[o + 6] = uz * (hh + 0.06); bb[o + 7] = 0; bb[o + 8] = 0; bb[o + 9] = 0; bb[o + 10] = 1; bb[o + 11] = 0; bb[o + 12] = px; bb[o + 13] = py; bb[o + 14] = pz; bb[o + 15] = 1;
        const fw = Math.max(0.001, wd * f), off = -(wd - fw) / 2;
        bf[o] = rx * fw; bf[o + 1] = ry * fw; bf[o + 2] = rz * fw; bf[o + 3] = 0; bf[o + 4] = ux * hh; bf[o + 5] = uy * hh; bf[o + 6] = uz * hh; bf[o + 7] = 0; bf[o + 8] = 0; bf[o + 9] = 0; bf[o + 10] = 1; bf[o + 11] = 0;
        bf[o + 12] = px + rx * off + (rx * 0.0); bf[o + 13] = py + ry * off + 0.002; bf[o + 14] = pz + rz * off; bf[o + 15] = 1;
        // team-tinted dark back; fill green->amber->red
        const tc = this._team(u.team); bc[n * 3] = tc[0] * 0.25; bc[n * 3 + 1] = tc[1] * 0.25; bc[n * 3 + 2] = tc[2] * 0.25 + 0.01;
        const r = f > 0.5 ? 0.2 + (1 - f) * 1.4 : 0.7, g = f > 0.5 ? 0.7 : f * 1.2, b = 0.04;
        fc[n * 3] = r * r; fc[n * 3 + 1] = g * g; fc[n * 3 + 2] = b;
        n++;
      }
    }
    for (const m of [this.barBack, this.barFill]) { m.count = n; m.visible = n > 0; m.instanceMatrix.updateRange.count = n * 16; m.instanceMatrix.needsUpdate = true; m.instanceColor.updateRange.count = n * 3; m.instanceColor.needsUpdate = true; }
    // selection / hover rings
    let rn = 0; const rm = this.rings.instanceMatrix.array, rc = this.rings.instanceColor.array;
    for (const id of [this.selected, this.hover]) {
      if (!id) continue; const u = this._unitById(id); if (!u || !u.alive) continue;
      const s = Math.max(0.9, u.radius * 1.9 * (u.scale > 1.3 ? 1.3 : 1)); const o = rn * 16;
      rm[o] = s; rm[o + 1] = 0; rm[o + 2] = 0; rm[o + 3] = 0; rm[o + 4] = 0; rm[o + 5] = 0; rm[o + 6] = -s; rm[o + 7] = 0; rm[o + 8] = 0; rm[o + 9] = 1; rm[o + 10] = 0; rm[o + 11] = 0; rm[o + 12] = u.x; rm[o + 13] = u.y + 0.08; rm[o + 14] = u.z; rm[o + 15] = 1;
      const tc = id === this.selected ? [1.6, 1.4, 0.4] : [1.2, 1.2, 1.2]; rc[rn * 3] = tc[0]; rc[rn * 3 + 1] = tc[1]; rc[rn * 3 + 2] = tc[2]; rn++;
    }
    this.rings.count = rn; this.rings.visible = rn > 0; this.rings.instanceMatrix.needsUpdate = true; this.rings.instanceColor.needsUpdate = true;
  }

  // ------------------------------------------------------------------ ambient FX (dust under charging cavalry etc.)
  _ambientFx(dt, camera) {
    this.dustT -= dt; if (this.dustT > 0 || this.fxScale < 0.3) return; this.dustT = 0.09;
    const U = this.world.units, cx = camera.position.x, cz = camera.position.z;
    let k = 0;
    for (let i = 0; i < U.length && k < 14; i++) {
      const u = U[i]; if (u.speedNow < 4.2) continue;
      const dx = u.x - cx, dz = u.z - cz; if (dx * dx + dz * dz > 80 * 80) continue;
      const mat = this.world.arena.materialAt(u.x, u.z);
      this.fx.dust(u.x - Math.sin(u.heading) * 0.4, u.y, u.z - Math.cos(u.heading) * 0.4, u.def.mass >= 8 ? 3 : 1, mat.top[0], u.def.mass >= 8 ? 2.6 : 1.4); k++;
    }
  }

  // ------------------------------------------------------------------ event reactions
  _near(x, z, camera) { return true; }
  _onHit(p) {
    const fx = this.fx; if (this.fxScale < 0.2) return;
    const metal = p.type === 'slash' || p.type === 'pierce' || p.type === 'blunt';
    const d = this.world.defs[p.dstDef];
    const armored = d && d.armor >= 0.3;
    if (armored && metal) fx.sparks(p.x, p.y, p.z, 4, 0xffd24a, 4);
    if (this.gore !== 'off') fx.splat(p.x, p.y, p.z, this.gore, p.crit ? 10 : 4, 0, 0, 0.6);
    if (p.charge > 0.5) fx.dust(p.x, p.y - 0.8, p.z, 5, 0xcdbb94, 2.4);
  }
  _onBlock(p) { this.fx.sparks(p.x, p.y, p.z, 7, 0xfff0b0, 5); }
  _onKill(p) {
    const fx = this.fx;
    if (this.gore !== 'off') fx.splat(p.x, p.y + 1, p.z, this.gore, 12, 0, 0, 1);
    fx.dust(p.x, p.y, p.z, 4, 0xcdbb94, 2);
    if (p.cause === 'fire') fx.fire(p.x, p.y + 1, p.z, 4);
  }
  _onCorpse(p) {
    const u = this._unitById(p.id); if (!u) return;
    const r = this._rec(u);
    const n = 18 + Math.min(40, (u.def.hp / 4) | 0);
    // team-tint voxels burst in the team colour
    this.fx.debrisBurst(u.x, u.y, u.z, r.palette, n, u.def.mass >= 8 ? 1.6 : 1, 0.09 * Math.max(1, u.scale * 0.7), u.kx * 0.3, u.kz * 0.3);
    if (this.corpseMode !== 'none' && this.corpseMode !== undefined && this.corpseMode === 'stay') {
      const ex = this.extra; ex.speed = 0; ex.gait = 0; ex.dead = true; ex.team = u.team; ex.t = this.time; ex.id = u.id; ex.hp = 0; ex.state = 0;
      const rt = ex.root; rt.y = rt.x = rt.z = rt.pitch = rt.roll = rt.yaw = 0;
      this.animator.pose(r.model, u.anim, ex, r.pose);
      const sv = r.scaleVec, s = u.scale;
      if (this.corpses.length >= this.maxCorpses) this.corpses.shift();
      this.corpses.push({ key: r.key, x: u.x + rt.x, y: u.y + rt.y, z: u.z + rt.z, h: u.heading + rt.yaw, sx: s * sv[0], sy: s * sv[1], sz: s * sv[2], pose: r.pose.slice(), team: u.team, stone: u.stone, pitch: (u.pitch || 0) + rt.pitch, roll: (u.roll || 0) + rt.roll });
    }
  }
  _onProjHit(p) {
    if (this.fxScale < 0.2) return;
    if (p.onUnit) { if (p.blocked) this.fx.sparks(p.x, p.y, p.z, 4, 0xfff0b0, 3); }
    else this.fx.dust(p.x, p.y, p.z, 2, 0xb8a98a, 1.2);
  }
  _onExplosion(p) {
    const fx = this.fx, r = p.r || 2;
    if (p.kind === 'lightning') { fx.lightning(p.x, p.y + 30, p.z, p.x, p.y, p.z); fx.sparks(p.x, p.y + 0.5, p.z, 20, 0xcfe8ff, 8); fx.smoke(p.x, p.y, p.z, 4); return; }
    const cols = this.world.arena.materialAt(p.x, p.z).top;
    fx.rubble(p.x, p.y, p.z, cols, Math.min(80, 20 + r * 12), r);
    fx.fire(p.x, p.y + 0.5, p.z, Math.min(30, 6 + r * 4)); fx.smoke(p.x, p.y + 0.5, p.z, Math.min(20, 4 + r * 3));
    fx.dust(p.x, p.y, p.z, Math.min(40, 8 + r * 6), cols[0], 4);
    if (this.onShake) this.onShake(Math.min(1, r / 5), p.x, p.z);
  }
  _onPropDestroyed(p) {
    if (this.props && this.props.removeById) this.props.removeById(p.id, p);
    const colors = (this.props && this.props.debrisColors && this.props.debrisColors(p.type)) || [0x9b9892, 0x7d7a74, 0xb8b4aa];
    this.fx.rubble(p.x, p.y, p.z, colors, 50, 2.4 * (p.s || 1)); this.fx.dust(p.x, p.y, p.z, 12, 0xcdbb94, 3);
    if (this.onShake) this.onShake(0.35, p.x, p.z);
  }

  dispose() {
    this.unbind();
    for (const r of this.skins.values()) r.skin.dispose();
    this.skins.clear(); this.corpses.length = 0;
    for (const m of [this.pm, this.barBack, this.barFill, this.rings]) { this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
  }
}
