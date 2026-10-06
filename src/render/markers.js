// markers.js: the places a mission cares about, drawn in the world: the hill to hold (gold ring + banner) and the far bank the goat has to reach (green ring + chequered flag).
// One instanced cube mesh per colour; the ring cubes bob in a slow wave so the zone reads at any camera distance. Other marker types (spawns, waypoints) stay invisible.
const T = () => window.THREE;

const STYLE = {
  hill: { col: 0xc85a00, col2: 0xfff2b0, label: 'hill' },
  exit: { col: 0x0a9a3e, col2: 0xffffff, label: 'finish' },
};

export class MarkerLayer {
  constructor(scene) {
    this.scene = scene; this.group = new (T().Group)(); this.group.name = 'mission-markers'; this.group.visible = false; scene.add(this.group);
    this.meshes = []; this.rings = []; this.t = 0; this.geo = new (T().BoxGeometry)(1, 1, 1); this.mats = new Map();
  }
  _mat(col) {
    // colour channels above 1 are what the bloom pass picks up
    let m = this.mats.get(col); if (!m) { m = new (T().MeshBasicMaterial)({ color: col, toneMapped: false }); m.color.multiplyScalar(1.12); this.mats.set(col, m); } return m;
  }
  /** Build the visuals for the arena's markers. Safe to call with an arena that has none. */
  set(arena) {
    this.clear();
    const list = (arena && arena.markers) || [];
    for (const k of list) {
      const st = STYLE[k.type]; if (!st) continue;
      const r = Math.max(1.5, k.r || 3), n = Math.max(36, Math.min(150, Math.round(r * 11)));
      const ring = { x: k.x, z: k.z, r, n, y: new Float32Array(n), base: arena.heightAt(k.x, k.z), inst: null, size: 0.52 };
      const mesh = new (T().InstancedMesh)(this.geo, this._mat(st.col), n); mesh.frustumCulled = false; this.group.add(mesh); this.meshes.push(mesh); ring.inst = mesh;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; ring.y[i] = arena.heightAt(k.x + Math.sin(a) * r, k.z + Math.cos(a) * r); }
      this.rings.push(ring);
      // the banner: a pole of cubes with a flag (hill: a plain pennant; exit: a chequered flag). Cubes of the light colour (pole, light squares) and of the zone colour (flag) are two meshes.
      const pole = 9, fw = 5, fh = 4, by = ring.base, light = [], dark = [];
      for (let i = 0; i < pole; i++) light.push([k.x, by + 0.35 + i * 0.7, k.z, 0.4, 0.7, 0.4]);
      for (let i = 0; i < fw; i++) for (let j = 0; j < fh; j++) (k.type === 'exit' && (i + j) % 2 === 0 ? light : dark).push([k.x + 0.45, by + pole * 0.7 - j * 0.45 - 0.1, k.z + 0.45 + i * 0.45, 0.45, 0.45, 0.45]);
      for (const [list2, col] of [[light, st.col2], [dark, st.col]]) {
        if (!list2.length) continue;
        const mesh = new (T().InstancedMesh)(this.geo, this._mat(col), list2.length), m = new (T().Matrix4)(); mesh.frustumCulled = false;
        list2.forEach((c, i) => { m.makeScale(c[3], c[4], c[5]); m.setPosition(c[0], c[1], c[2]); mesh.setMatrixAt(i, m); });
        mesh.instanceMatrix.needsUpdate = true; this.group.add(mesh); this.meshes.push(mesh);
      }
    }
    this.group.visible = this.rings.length > 0;
    this.update(0);
    return this.rings.length;
  }
  update(t) {
    if (!this.rings.length) return;
    this.t = t; const m = new (T().Matrix4)(), s = new (T().Vector3)(), q = new (T().Quaternion)(), p = new (T().Vector3)();
    for (const ring of this.rings) {
      for (let i = 0; i < ring.n; i++) {
        const a = i / ring.n * Math.PI * 2, wave = 0.5 + 0.5 * Math.sin(t * 2.2 - i * 0.45), sz = ring.size * (0.75 + 0.5 * wave);
        p.set(ring.x + Math.sin(a) * ring.r, ring.y[i] + 0.2 + wave * 0.18, ring.z + Math.cos(a) * ring.r); s.set(sz, sz, sz);
        m.compose(p, q, s); ring.inst.setMatrixAt(i, m);
      }
      ring.inst.instanceMatrix.needsUpdate = true;
    }
  }
  clear() {
    for (const m of this.meshes) { this.group.remove(m); if (m.dispose) m.dispose(); }
    this.meshes.length = 0; this.rings.length = 0; this.group.visible = false;
  }
  dispose() { this.clear(); this.scene.remove(this.group); this.geo.dispose(); for (const m of this.mats.values()) m.dispose(); this.mats.clear(); }
}

/**
 * The deployment zones, drawn while the player places soldiers: a pulsing border of cubes, four corner banners and a dotted floor in the team's colour, so the one
 * question a first-time player has ("where may I put my soldiers?") is answered by looking. Team A is blue, team B red (the palette of the battle view).
 */
export class ZoneLayer {
  constructor(scene) {
    this.scene = scene; this.group = new (T().Group)(); this.group.name = 'deployment-zones'; this.group.visible = false; scene.add(this.group);
    this.zones = []; this.geo = new (T().BoxGeometry)(1, 1, 1); this.mats = [null, null]; this.visible = false;
  }
  _mat(team, rgb) {
    if (!this.mats[team]) this.mats[team] = new (T().MeshBasicMaterial)({ color: 0xffffff, toneMapped: false });
    this.mats[team].color.setRGB(rgb[0] * 1.1, rgb[1] * 1.1, rgb[2] * 1.1);
    return this.mats[team];
  }
  /** teams: [0] and/or [1] to draw; colors: [[r,g,b] linear] per team. */
  set(arena, teams, colors) {
    this.clear();
    for (const team of teams) {
      const z = arena && arena.zones && arena.zones[team === 0 ? 'A' : 'B']; if (!z) continue;
      const mat = this._mat(team, colors[team] || [1, 1, 1]);
      const border = [], dots = [], step = 1.6, hx = z.w / 2, hz = z.d / 2;
      for (let x = -hx; x <= hx + 0.01; x += step) { border.push([z.x + x, z.z - hz]); border.push([z.x + x, z.z + hz]); }
      for (let q = -hz + step; q < hz - 0.01; q += step) { border.push([z.x - hx, z.z + q]); border.push([z.x + hx, z.z + q]); }
      for (let x = -hx + 2.4; x < hx - 1; x += 2.4) for (let q = -hz + 2.4; q < hz - 1; q += 2.4) dots.push([z.x + x, z.z + q]);
      const make = (list, size) => {
        const mesh = new (T().InstancedMesh)(this.geo, mat, list.length); mesh.frustumCulled = false; this.group.add(mesh);
        return { mesh, list, size, y: Float32Array.from(list, (p) => arena.heightAt(p[0], p[1])) };
      };
      const rec = { border: make(border, 0.85), dots: make(dots, 0.34), posts: null };
      // the four corner banners: a pole of five cubes with a one-cube flag
      const posts = [], corners = [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]];
      for (const [cx, cz] of corners) { const x = z.x + cx, zz = z.z + cz, y0 = arena.heightAt(x, zz); for (let i = 0; i < 7; i++) posts.push([x, y0 + 0.7 + i * 1.4, zz, 0.7, 1.4, 0.7]); posts.push([x + (cx < 0 ? 1.4 : -1.4), y0 + 8.4, zz, 2.2, 1.5, 0.35]); }
      const pm = new (T().InstancedMesh)(this.geo, mat, posts.length), m4 = new (T().Matrix4)(); pm.frustumCulled = false;
      posts.forEach((c, i) => { m4.makeScale(c[3], c[4], c[5]); m4.setPosition(c[0], c[1], c[2]); pm.setMatrixAt(i, m4); });
      pm.instanceMatrix.needsUpdate = true; this.group.add(pm); rec.posts = pm;
      this.zones.push(rec);
    }
    this.update(0);
    return this.zones.length;
  }
  update(t) {
    this.group.visible = this.visible && this.zones.length > 0;
    if (!this.group.visible) return;
    const m = new (T().Matrix4)(), s = new (T().Vector3)(), q = new (T().Quaternion)(), p = new (T().Vector3)();
    for (const rec of this.zones) {
      for (const part of [rec.border, rec.dots]) {
        for (let i = 0; i < part.list.length; i++) {
          const w = 0.5 + 0.5 * Math.sin(t * 2.4 - i * (part === rec.border ? 0.5 : 0.9)), sz = part.size * (0.8 + 0.4 * w);
          p.set(part.list[i][0], part.y[i] + 0.16 + w * (part === rec.border ? 0.12 : 0.04), part.list[i][1]); s.set(sz, sz, sz); m.compose(p, q, s); part.mesh.setMatrixAt(i, m);
        }
        part.mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }
  clear() {
    for (const rec of this.zones) for (const m of [rec.border.mesh, rec.dots.mesh, rec.posts]) { this.group.remove(m); if (m.dispose) m.dispose(); }
    this.zones.length = 0; this.group.visible = false;
  }
  dispose() { this.clear(); this.scene.remove(this.group); this.geo.dispose(); for (const m of this.mats) if (m) m.dispose(); }
}
