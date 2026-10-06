// CameraRig: orbit / follow / command (Take Command) / topdown / cinematic / photo, spring-smoothed, terrain-collision safe,
// with damped-spring shake and FOV kick. Pure render-side; reads the world only for follow/cinematic targets.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const damp = (cur, target, dt, halfLife) => target + (cur - target) * Math.pow(0.5, dt / Math.max(0.0001, halfLife));
function dampAngle(cur, target, dt, hl) { let d = (target - cur) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2; return cur + d * (1 - Math.pow(0.5, dt / hl)); }

export class CameraRig {
  constructor(engine) {
    this.engine = engine; this.cam = engine.camera;
    this.mode = 'orbit';
    // desired state (what input drives) and smoothed state (what is rendered)
    this.tx = 0; this.ty = 0; this.tz = 0; this.yaw = -0.8; this.pitch = 0.62; this.dist = 40;
    this.sx = 0; this.sy = 0; this.sz = 0; this.syaw = this.yaw; this.spitch = this.pitch; this.sdist = this.dist;
    this.fov = 48; this.sfov = 48;
    this.world = null; this.arena = null;
    this.followId = 0; this.cmdId = 0;
    this.limits = { minDist: 6, maxDist: 150, minPitch: 0.08, maxPitch: 1.5 };
    this.shakeAmp = 1; this.reduceMotion = false; this.trauma = 0; this.shakeT = 0; this.shakeOff = [0, 0, 0];
    this.fovKick = 0;
    this.dir = { t: 0, shot: 'orbit', cd: 0, spin: 0.12, hot: null, lock: 0 };
    this.alpha = 1;
    this.bounds = 60;
    this.listener = { x: 0, y: 0, z: 0, yaw: 0 };
    this.userInputT = 0;
  }
  setArena(arena) { this.arena = arena; this.bounds = arena.half() - 2; }
  setWorld(world) { this.world = world; if (world) this.setArena(world.arena); }
  frame(cx, cz, dist) { this.tx = cx; this.tz = cz; this.ty = this.arena ? this.arena.heightAt(cx, cz) + 1 : 0; if (dist) this.dist = dist; this.snap(); }
  snap() { this.sx = this.tx; this.sy = this.ty; this.sz = this.tz; this.syaw = this.yaw; this.spitch = this.pitch; this.sdist = this.dist; }

  setMode(mode, o = {}) {
    this.mode = mode;
    if (mode === 'follow') { this.followId = o.unit || this.followId; this.limits.minDist = 4; this.dist = clamp(this.dist, 6, 34); }
    else if (mode === 'command') { this.cmdId = o.unit || this.cmdId; this.dist = 9; this.pitch = 0.36; }
    else if (mode === 'topdown') { this.pitch = 1.38; this.dist = clamp(this.dist, 30, 120); this.yaw = 0; }
    else if (mode === 'orbit') { this.limits.minDist = 6; if (this.pitch > 1.2) this.pitch = 0.9; }
    else if (mode === 'cinematic') { this.dir.cd = 0; this.dir.t = 0; }
    this.userInputT = 0;
  }
  addTrauma(a) { if (this.reduceMotion) a *= 0.15; this.trauma = Math.min(1, this.trauma + a * this.shakeAmp); }
  kickFov(a) { if (!this.reduceMotion) this.fovKick = Math.min(10, this.fovKick + a); }

  /** Manual controls (called by app/input.js). dx/dy in radians, pan in world units/s along camera right/forward. */
  rotate(dyaw, dpitch) { this.yaw += dyaw; this.pitch = clamp(this.pitch + dpitch, this.limits.minPitch, this.limits.maxPitch); this.userInputT = 4; }
  zoom(f) { this.dist = clamp(this.dist * f, this.limits.minDist, this.limits.maxDist); this.userInputT = 4; }
  pan(right, fwd, dt) {
    const s = this.sdist * 0.9 * dt, c = Math.cos(this.syaw), sn = Math.sin(this.syaw);
    // camera right = (cos yaw, -sin yaw) on ground, forward = away from camera = (-sin yaw, -cos yaw)... derive from look direction
    const fx = -Math.sin(this.syaw), fz = -Math.cos(this.syaw), rx = Math.cos(this.syaw), rz = -Math.sin(this.syaw);
    this.tx = clamp(this.tx + (rx * right + fx * fwd) * s, -this.bounds, this.bounds); this.tz = clamp(this.tz + (rz * right + fz * fwd) * s, -this.bounds, this.bounds);
    if (this.mode === 'follow' || this.mode === 'cinematic') { this.mode = 'orbit'; }
    this.userInputT = 4;
  }
  panTo(x, z) { this.tx = clamp(x, -this.bounds, this.bounds); this.tz = clamp(z, -this.bounds, this.bounds); }

  _unit(id) { const w = this.world; if (!w || !id) return null; for (const u of w.units) if (u.id === id) return u; for (const u of w.dying) if (u.id === id) return u; return null; }

  update(dt, alpha = 1) {
    const a = this.arena;
    this.alpha = alpha;
    if (this.mode === 'follow') {
      const u = this._unit(this.followId);
      if (u && (u.alive || u.deadT < 1.2)) { const x = u.px + (u.x - u.px) * alpha, z = u.pz + (u.z - u.pz) * alpha; this.tx = x; this.tz = z; this.ty = (a ? a.heightAt(x, z) : u.y) + u.height * 0.6; }
      else this._nextFollow();
    } else if (this.mode === 'command') {
      const u = this._unit(this.cmdId);
      if (u && u.alive) { const x = u.px + (u.x - u.px) * alpha, z = u.pz + (u.z - u.pz) * alpha; this.tx = x; this.tz = z; this.ty = (a ? a.heightAt(x, z) : u.y) + u.height * 0.75; this.yaw = dampAngle(this.yaw, u.heading + Math.PI, dt, 0.35); }
    } else if (this.mode === 'cinematic') this._direct(dt);
    // smoothing (critically damped feel)
    const hl = this.mode === 'command' ? 0.08 : this.mode === 'cinematic' ? 0.45 : 0.12;
    this.sx = damp(this.sx, this.tx, dt, hl); this.sy = damp(this.sy, this.ty, dt, hl); this.sz = damp(this.sz, this.tz, dt, hl);
    this.syaw = dampAngle(this.syaw, this.yaw, dt, this.mode === 'cinematic' ? 0.5 : 0.1);
    this.spitch = damp(this.spitch, this.pitch, dt, 0.12); this.sdist = damp(this.sdist, this.dist, dt, 0.14);
    // fov kick decays
    this.fovKick *= Math.pow(0.5, dt / 0.18);
    this.sfov = damp(this.sfov, this.fov + this.fovKick, dt, 0.08);
    // shake: trauma^2 * smooth noise
    this.trauma = Math.max(0, this.trauma - dt * 1.4);
    this.shakeT += dt * 38;
    const sh = this.trauma * this.trauma * 0.55;
    this.shakeOff[0] = (Math.sin(this.shakeT * 1.31) + Math.sin(this.shakeT * 2.17)) * 0.5 * sh;
    this.shakeOff[1] = (Math.sin(this.shakeT * 1.77 + 1.3) + Math.sin(this.shakeT * 2.9)) * 0.5 * sh;
    this.shakeOff[2] = (Math.sin(this.shakeT * 1.07 + 2.2)) * 0.02 * this.trauma * this.trauma;
    this._apply();
  }

  _apply() {
    const cam = this.cam, a = this.arena;
    const cp = Math.cos(this.spitch), sp = Math.sin(this.spitch);
    let px = this.sx + Math.sin(this.syaw) * cp * this.sdist, py = this.sy + sp * this.sdist, pz = this.sz + Math.cos(this.syaw) * cp * this.sdist;
    // terrain collision: keep the camera above ground + margin
    if (a) { const g = a.heightAt(px, pz) + 1.4; if (py < g) py = g; }
    cam.position.set(px + this.shakeOff[0], py + this.shakeOff[1], pz);
    cam.lookAt(this.sx, this.sy, this.sz);
    if (this.shakeOff[2]) cam.rotateZ(this.shakeOff[2]);
    if (Math.abs(cam.fov - this.sfov) > 0.01) { cam.fov = this.sfov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld(true);
    cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    this.engine.focus.set(this.sx, this.sy, this.sz);
    this.engine.shadowRadius = clamp(this.sdist * 0.9 + 22, 30, 70);
    this.listener.x = this.sx; this.listener.y = this.sy; this.listener.z = this.sz; this.listener.yaw = this.syaw;
  }

  _nextFollow() {
    const w = this.world; if (!w) return;
    // prefer a fighting unit near the previous target, else any
    let best = null, bd = 1e9; const px = this.tx, pz = this.tz;
    for (const u of w.units) { if (!u.alive) continue; const d = (u.x - px) ** 2 + (u.z - pz) ** 2; if (d < bd) { bd = d; best = u; } }
    if (best) this.followId = best.id; else this.mode = 'orbit';
  }
  cycleFollow(dir = 1) {
    const w = this.world; if (!w || !w.units.length) return;
    const ids = w.units.filter((u) => u.alive).map((u) => u.id); if (!ids.length) return;
    let i = ids.indexOf(this.followId); i = (i + dir + ids.length) % ids.length; this.followId = ids[i < 0 ? 0 : i]; this.mode = 'follow';
  }

  // ------------------------------------------------------------------ cinematic director
  /** event hint from the app: {x,z,kind,weight}. Hero deaths / explosions pull the camera (cooldown-limited). */
  hint(x, z, kind, weight = 1) { const d = this.dir; if (this.mode !== 'cinematic') return; if (d.lock > 0 && weight < 3) return; d.hot = { x, z, kind, w: weight }; d.cd = 0; d.lock = 3.5; }
  _direct(dt) {
    const w = this.world, d = this.dir; if (!w) return;
    d.t += dt; d.cd -= dt; d.lock -= dt;
    if (d.cd <= 0) {
      // choose the hot spot: centroid of units currently winding up attacks
      let sx = 0, sz = 0, n = 0, hero = null;
      const U = w.units;
      for (let i = 0; i < U.length; i += 2) { const u = U[i]; if (u.alive && u.state === 2) { sx += u.x; sz += u.z; n++; } if (u.alive && u.def.role === 'hero' && !hero) hero = u; }
      let hx, hz;
      if (d.hot && d.lock > 0) { hx = d.hot.x; hz = d.hot.z; }
      else if (n > 3) { hx = sx / n; hz = sz / n; }
      else { const c0 = w.centroid[0], c1 = w.centroid[1]; hx = (c0.x + c1.x) / 2; hz = (c0.z + c1.z) / 2; }
      const shots = ['orbit', 'low', 'crane', 'hero', 'side'];
      let shot = shots[(d.shotIdx = ((d.shotIdx || 0) + 1 + (n > 3 ? 0 : 1)) % shots.length)];
      if (shot === 'hero' && !hero) shot = 'orbit';
      d.shot = shot; d.cd = 4 + (d.shotIdx % 3) * 1.2; d.spin = (d.shotIdx % 2 ? 1 : -1) * 0.12;
      const a = this.arena;
      if (shot === 'hero' && hero) { this.tx = hero.x; this.tz = hero.z; this.dist = 15; this.pitch = 0.3; }
      else { this.tx = clamp(hx, -this.bounds, this.bounds); this.tz = clamp(hz, -this.bounds, this.bounds); this.dist = shot === 'crane' ? 52 : shot === 'low' ? 13 : shot === 'side' ? 24 : 28; this.pitch = shot === 'crane' ? 0.95 : shot === 'low' ? 0.2 : shot === 'side' ? 0.35 : 0.55; }
      this.ty = (a ? a.heightAt(this.tx, this.tz) : 0) + 1.2;
      if (shot !== 'hero') this.yaw = (this.yaw + (shot === 'side' ? Math.PI / 2 : 1.4) * (d.spin > 0 ? 1 : -1));
    }
    this.yaw += d.spin * dt;                              // slow drift around the action
    if (d.shot === 'crane') this.dist = Math.min(70, this.dist + dt * 1.6);
    if (d.shot === 'low') this.dist = Math.max(9, this.dist - dt * 0.6);
  }
}
