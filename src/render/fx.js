// CubeFX: ring-buffered instanced voxel particles and debris. One InstancedMesh, one draw call.
// Debris = heavier cubes that bounce on terrain and settle; particles = light cubes (sparks, dust, smoke, fire, confetti).
// Caps come from the quality tier; the oldest entries are recycled first. All randomness uses fxRand (never the sim RNG).

import { fxRand } from '../core/rng.js';

const T = () => window.THREE;
const GRAV = 22;

export class CubeFX {
  constructor(scene, arena, cap = 8000) {
    this.scene = scene; this.arena = arena; this.cap = cap;
    const THREE = T();
    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.mat = new THREE.MeshLambertMaterial({ vertexColors: false });
    this.mesh = new THREE.InstancedMesh(geo, this.mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; this.mesh.castShadow = false; this.mesh.receiveShadow = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
    this.x = new Float32Array(cap); this.y = new Float32Array(cap); this.z = new Float32Array(cap);
    this.vx = new Float32Array(cap); this.vy = new Float32Array(cap); this.vz = new Float32Array(cap);
    this.size = new Float32Array(cap); this.life = new Float32Array(cap); this.life0 = new Float32Array(cap);
    this.grav = new Float32Array(cap); this.drag = new Float32Array(cap); this.bounce = new Float32Array(cap);
    this.rot = new Float32Array(cap); this.spin = new Float32Array(cap); this.grow = new Float32Array(cap);
    this.flags = new Uint8Array(cap);     // 1 = settle on ground and fade slowly, 2 = glow (no lighting variance), 4 = shrink only
    this.cr = new Float32Array(cap); this.cg = new Float32Array(cap); this.cb = new Float32Array(cap);
    this.n = 0; this.head = 0;
    this.lim = cap;                       // soft limit set by quality
    this.settled = 0;
  }
  setCap(n) { this.lim = Math.min(this.cap, n); }

  _slot() {
    if (this.n < this.lim) return this.n++;
    const i = this.head; this.head = (this.head + 1) % this.lim; return i;
  }
  /** rgb = 0xRRGGBB sRGB; stored linear. */
  spawn(x, y, z, vx, vy, vz, rgb, size, life, o) {
    const i = this._slot();
    this.x[i] = x; this.y[i] = y; this.z[i] = z; this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
    this.size[i] = size; this.life[i] = life; this.life0[i] = life;
    this.grav[i] = o && o.g !== undefined ? o.g : GRAV; this.drag[i] = o && o.drag !== undefined ? o.drag : 0.2;
    this.bounce[i] = o && o.bounce !== undefined ? o.bounce : 0.3; this.grow[i] = o && o.grow !== undefined ? o.grow : 0;
    this.flags[i] = o && o.flags ? o.flags : 0; this.rot[i] = fxRand.next() * 6.28; this.spin[i] = o && o.spin !== undefined ? o.spin : (fxRand.next() - 0.5) * 8;
    const r = ((rgb >> 16) & 255) / 255, g = ((rgb >> 8) & 255) / 255, b = (rgb & 255) / 255;
    this.cr[i] = Math.pow(r, 2.2); this.cg[i] = Math.pow(g, 2.2); this.cb[i] = Math.pow(b, 2.2);
    return i;
  }

  // ------------- recipes -------------
  sparks(x, y, z, n = 6, rgb = 0xffd24a, spd = 5) {
    for (let i = 0; i < n; i++) this.spawn(x, y, z, (fxRand.next() - 0.5) * spd, fxRand.next() * spd * 0.8 + 1, (fxRand.next() - 0.5) * spd, rgb, 0.06 + fxRand.next() * 0.05, 0.28 + fxRand.next() * 0.25, { g: 14, drag: 0.5, bounce: 0.2, flags: 2 });
  }
  dust(x, y, z, n = 5, rgb = 0xcdbb94, spd = 1.6) {
    for (let i = 0; i < n; i++) this.spawn(x + (fxRand.next() - 0.5) * 0.4, y + 0.05, z + (fxRand.next() - 0.5) * 0.4, (fxRand.next() - 0.5) * spd, 0.4 + fxRand.next() * 0.9, (fxRand.next() - 0.5) * spd, rgb, 0.12 + fxRand.next() * 0.1, 0.5 + fxRand.next() * 0.4, { g: -0.6, drag: 1.4, grow: 0.12, flags: 4, bounce: 0 });
  }
  smoke(x, y, z, n = 3, rgb = 0x555a66) {
    for (let i = 0; i < n; i++) this.spawn(x + (fxRand.next() - 0.5) * 0.5, y, z + (fxRand.next() - 0.5) * 0.5, (fxRand.next() - 0.5) * 0.6, 1 + fxRand.next(), (fxRand.next() - 0.5) * 0.6, rgb, 0.25 + fxRand.next() * 0.2, 0.9 + fxRand.next() * 0.7, { g: -1.2, drag: 0.8, grow: 0.25, flags: 4, bounce: 0 });
  }
  fire(x, y, z, n = 3) {
    for (let i = 0; i < n; i++) { const c = fxRand.next() < 0.5 ? 0xff7a1a : fxRand.next() < 0.5 ? 0xffc23a : 0xe0391a; this.spawn(x + (fxRand.next() - 0.5) * 0.4, y, z + (fxRand.next() - 0.5) * 0.4, (fxRand.next() - 0.5) * 0.5, 1.4 + fxRand.next() * 1.2, (fxRand.next() - 0.5) * 0.5, c, 0.14 + fxRand.next() * 0.1, 0.4 + fxRand.next() * 0.35, { g: -2, drag: 0.6, flags: 2 | 4, bounce: 0 }); }
  }
  /** gore style: 'red' | 'wine' | 'confetti' | 'off' */
  splat(x, y, z, style = 'red', n = 8, dirX = 0, dirZ = 0, power = 1) {
    if (style === 'off') return;
    for (let i = 0; i < n; i++) {
      let c;
      if (style === 'confetti') { const k = fxRand.next(); c = k < 0.2 ? 0xff5a6e : k < 0.4 ? 0xffd23a : k < 0.6 ? 0x5ad1ff : k < 0.8 ? 0x8bd450 : 0xff8ae0; }
      else if (style === 'wine') c = fxRand.next() < 0.7 ? 0x7d1fa0 : 0xb03ad0; else c = fxRand.next() < 0.8 ? 0xc72b2b : 0x8d1818;
      const s = style === 'confetti' ? 0.08 : 0.1 + fxRand.next() * 0.08;
      this.spawn(x, y, z, dirX * power * 2 + (fxRand.next() - 0.5) * 3.5, 2 + fxRand.next() * 3.5, dirZ * power * 2 + (fxRand.next() - 0.5) * 3.5, c, s, 0.7 + fxRand.next() * 0.5, { g: style === 'confetti' ? 7 : 16, drag: style === 'confetti' ? 1.2 : 0.3, bounce: 0.1, spin: style === 'confetti' ? 14 : 4 });
    }
  }
  confetti(x, y, z, n = 40, spread = 3) {
    for (let i = 0; i < n; i++) { const k = fxRand.next(); const c = k < 0.2 ? 0xff5a6e : k < 0.4 ? 0xffd23a : k < 0.6 ? 0x5ad1ff : k < 0.8 ? 0x8bd450 : 0xff8ae0; this.spawn(x + (fxRand.next() - 0.5) * spread, y, z + (fxRand.next() - 0.5) * spread, (fxRand.next() - 0.5) * 5, 5 + fxRand.next() * 6, (fxRand.next() - 0.5) * 5, c, 0.09, 1.6 + fxRand.next(), { g: 6, drag: 1.3, bounce: 0, spin: 12 }); }
  }
  /** Burst a dead unit's own voxels outward. colors: array of 0xRRGGBB sampled from the model. */
  debrisBurst(x, y, z, colors, n, power = 1, size = 0.1, dirX = 0, dirZ = 0) {
    if (!colors.length) return;
    for (let i = 0; i < n; i++) {
      const c = colors[(fxRand.next() * colors.length) | 0];
      const a = fxRand.next() * 6.283, sp = (1.5 + fxRand.next() * 4.5) * power;
      this.spawn(x + (fxRand.next() - 0.5) * 0.5, y + 0.3 + fxRand.next() * 1.6, z + (fxRand.next() - 0.5) * 0.5, Math.cos(a) * sp + dirX, 2.5 + fxRand.next() * 5 * power, Math.sin(a) * sp + dirZ, c, size * (0.8 + fxRand.next() * 0.9), 6 + fxRand.next() * 6, { g: GRAV, drag: 0.15, bounce: 0.35, flags: 1 });
    }
  }
  rubble(x, y, z, colors, n, spread = 2) {
    for (let i = 0; i < n; i++) {
      const c = colors[(fxRand.next() * colors.length) | 0], a = fxRand.next() * 6.283, sp = fxRand.next() * 4;
      this.spawn(x + (fxRand.next() - 0.5) * spread, y + fxRand.next() * spread * 1.2, z + (fxRand.next() - 0.5) * spread, Math.cos(a) * sp, 1 + fxRand.next() * 5, Math.sin(a) * sp, c, 0.14 + fxRand.next() * 0.22, 8 + fxRand.next() * 6, { g: GRAV, drag: 0.1, bounce: 0.25, flags: 1 });
    }
  }
  lightning(x0, y0, z0, x1, y1, z1, rgb = 0xcfe8ff) {
    const n = 14; for (let i = 0; i <= n; i++) { const t = i / n; this.spawn(x0 + (x1 - x0) * t + (fxRand.next() - 0.5) * 0.8, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t + (fxRand.next() - 0.5) * 0.8, 0, 0, 0, rgb, 0.22, 0.18 + fxRand.next() * 0.12, { g: 0, drag: 0, flags: 2 | 4 }); }
  }

  update(dt) {
    const THREE = T(), a = this.arena, n = this.n, m = this.mesh.instanceMatrix.array, col = this.mesh.instanceColor.array;
    let live = 0;
    // compact live entries to the front so the draw count equals live particles
    for (let i = 0; i < n; i++) {
      let l = this.life[i];
      if (l <= 0) continue;
      const fl = this.flags[i];
      let x = this.x[i], y = this.y[i], z = this.z[i];
      let vx = this.vx[i], vy = this.vy[i], vz = this.vz[i];
      const settled = (fl & 8) !== 0;
      if (!settled) {
        vy -= this.grav[i] * dt;
        const k = Math.exp(-this.drag[i] * dt); vx *= k; vz *= k; if (this.grav[i] < 0) vy *= k;
        x += vx * dt; y += vy * dt; z += vz * dt;
        const gy = a ? a.heightAt(x, z) : 0;
        if (this.grav[i] > 0 && y < gy + this.size[i] * 0.5) {
          y = gy + this.size[i] * 0.5;
          if (Math.abs(vy) > 1.2 && this.bounce[i] > 0) { vy = -vy * this.bounce[i]; vx *= 0.7; vz *= 0.7; }
          else { vy = 0; vx *= 0.5; vz *= 0.5; if ((fl & 1) && Math.hypot(vx, vz) < 0.3) { this.flags[i] |= 8; } }
          this.spin[i] *= 0.5;
        }
        this.rot[i] += this.spin[i] * dt;
      }
      if (!(fl & 1) || settled) l -= dt; else if (!settled) l -= dt * 0.15;     // settling debris lingers
      if (settled) l -= dt * 0.7;
      if (l <= 0) { this.life[i] = 0; continue; }
      this.life[i] = l; this.x[i] = x; this.y[i] = y; this.z[i] = z; this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
      // write matrix
      let s = this.size[i] + this.grow[i] * (this.life0[i] - l);
      if (fl & 4) s *= Math.max(0.05, Math.min(1, l / (this.life0[i] * 0.6)));
      else if (l < 0.8 && (fl & 1)) s *= Math.max(0.02, l / 0.8);
      const c = Math.cos(this.rot[i]), sn = Math.sin(this.rot[i]);
      const o = live * 16;
      m[o] = c * s; m[o + 1] = 0; m[o + 2] = -sn * s; m[o + 3] = 0; m[o + 4] = 0; m[o + 5] = s; m[o + 6] = 0; m[o + 7] = 0; m[o + 8] = sn * s; m[o + 9] = 0; m[o + 10] = c * s; m[o + 11] = 0;
      m[o + 12] = x; m[o + 13] = y; m[o + 14] = z; m[o + 15] = 1;
      const boost = (fl & 2) ? 1.6 : 1;
      col[live * 3] = this.cr[i] * boost; col[live * 3 + 1] = this.cg[i] * boost; col[live * 3 + 2] = this.cb[i] * boost;
      // swap into compacted position
      if (live !== i) {
        this.x[live] = x; this.y[live] = y; this.z[live] = z; this.vx[live] = vx; this.vy[live] = vy; this.vz[live] = vz;
        this.size[live] = this.size[i]; this.life[live] = l; this.life0[live] = this.life0[i]; this.grav[live] = this.grav[i]; this.drag[live] = this.drag[i];
        this.bounce[live] = this.bounce[i]; this.rot[live] = this.rot[i]; this.spin[live] = this.spin[i]; this.grow[live] = this.grow[i]; this.flags[live] = this.flags[i];
        this.cr[live] = this.cr[i]; this.cg[live] = this.cg[i]; this.cb[live] = this.cb[i];
        this.life[i] = 0;
      }
      live++;
    }
    this.n = live; this.head = 0;
    this.mesh.count = live; this.mesh.visible = live > 0;
    this.mesh.instanceMatrix.updateRange.count = live * 16; this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.updateRange.count = live * 3; this.mesh.instanceColor.needsUpdate = true;
  }
  clear() { this.n = 0; this.head = 0; this.life.fill(0); this.mesh.count = 0; }
  setArena(a) { this.arena = a; }
  get liveCount() { return this.n; }
  dispose() { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mat.dispose(); }
}
