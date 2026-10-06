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
