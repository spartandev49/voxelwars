// WorldLabels: turns sim events into the floating DOM labels of the HUD (speech bubbles + combat tags) as screen-space data.
//   const L = new WorldLabels(); L.bind(world);  ...  hud.worldLabels = L.snapshot(camera, cssW, cssH, nowSeconds)  (pulled <= 10 Hz by ui/hud/bubbles.js)
// Bubbles follow their unit (world -> screen each snapshot); tags float up where they happened and expire. Everything is pooled and capped so a
// 400-unit melee cannot flood the screen: <= 5 bubbles, <= 8 tags, tags are rate-limited and distance-gated.
// Pure of DOM; uses a THREE.Vector3 only for the projection (window.THREE).

const MAX_BUBBLES = 5, MAX_TAGS = 8, TAG_LIFE = 1.0, BUBBLE_LIFE = 3.2, TAG_RATE = 7;        // tags per second, globally
const NEAR_TAG = 70 * 70, NEAR_BUBBLE = 90 * 90;

export class WorldLabels {
  constructor() { this.world = null; this.off = []; this.bubbles = []; this.tags = []; this.t = 0; this.tagBudget = 0; this._v = null; this.seq = 1; this.enabled = true; this.camera = null; }

  bind(world) {
    this.unbind(); this.world = world; this.bubbles.length = 0; this.tags.length = 0; this.t = 0;
    const ev = world.events, on = (n, f) => { const o = ev.on(n, f); if (typeof o === 'function') this.off.push(o); };
    on('bark', (p) => this._bark(p));
    on('unit_block', (p) => this._tag('blocked', p.x, p.y, p.z));
    on('unit_hit', (p) => { if (p.backstab) this._tag('backstab', p.x, p.y, p.z); else if (p.crit) this._tag('crit', p.x, p.y, p.z); else if (p.charge) this._tag('charge', p.x, p.y, p.z); });
    on('unit_rout', (p) => { const u = world.unitById && world.unitById(p.id !== undefined ? p.id : p.unit); if (u && this._near(u.x, u.z, NEAR_TAG)) this._tag('rout', u.x, u.y + 1.6 * u.scale, u.z); });
    on('status_apply', (p) => { if (p && p.status === 'stone') { const u = world.unitById && world.unitById(p.id !== undefined ? p.id : p.dst); if (u && this._near(u.x, u.z, NEAR_TAG)) this._tag('stone', u.x, u.y + 1.6 * u.scale, u.z); } });
    on('unit_heal', (p) => { if (p && p.amount > 12) { const u = world.unitById && world.unitById(p.dst !== undefined ? p.dst : p.id); if (u && this._near(u.x, u.z, NEAR_TAG)) this._tag('heal', u.x, u.y + 1.6 * u.scale, u.z); } });
  }
  unbind() { for (const f of this.off) f(); this.off.length = 0; this.world = null; this.bubbles.length = 0; this.tags.length = 0; }

  _near(x, z, d2) { const c = this.camera; if (!c) return true; const dx = x - c.position.x, dz = z - c.position.z; return dx * dx + dz * dz < d2; }
  _bark(p) {
    const w = this.world; if (!w || !this.enabled || !p || !p.text) return;
    const u = w.unitById(p.id); if (!u || !this._near(u.x, u.z, NEAR_BUBBLE)) return;
    if (this.bubbles.length >= MAX_BUBBLES) { // keep hero lines, drop the oldest otherwise
      let k = 0; for (let i = 1; i < this.bubbles.length; i++) if (this.bubbles[i].kind !== 'hero' && this.bubbles[i].until < this.bubbles[k].until) k = i;
      this.bubbles.splice(k, 1);
    }
    const hero = u.def && (u.def.role === 'hero' || (u.def.tags && u.def.tags.indexOf('boss') >= 0));
    this.bubbles.push({ id: 'b' + p.id, unit: p.id, text: String(p.text), kind: hero ? 'hero' : 'bark', until: this.t + BUBBLE_LIFE + Math.min(2, String(p.text).length * 0.03) });
  }
  _tag(kind, x, y, z) {
    if (!this.enabled || this.tagBudget < 1 || this.tags.length >= MAX_TAGS || !this._near(x, z, NEAR_TAG)) return;
    this.tagBudget -= 1; this.tags.push({ id: 't' + (this.seq++), kind, x, y: y + 0.4, z, born: this.t });
  }

  _project(x, y, z, camera, W, H, out) {
    const THREE = window.THREE; const v = this._v || (this._v = new THREE.Vector3());
    v.set(x, y, z).project(camera);
    if (v.z > 1 || v.z < -1 || v.x < -1.1 || v.x > 1.1 || v.y < -1.1 || v.y > 1.1) return false;
    out.x = (v.x * 0.5 + 0.5) * W; out.y = (-v.y * 0.5 + 0.5) * H; return true;
  }

  /** dt-less: pass the world clock in seconds (w.time) so labels stop ageing while paused. */
  snapshot(camera, W, H, now) {
    const w = this.world; if (!w || !camera) return null;
    this.camera = camera;
    const dt = Math.max(0, Math.min(0.5, now - this.t)); this.t = now; this.tagBudget = Math.min(TAG_RATE, this.tagBudget + dt * TAG_RATE);
    const bubbles = [], tags = [], pt = { x: 0, y: 0 };
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i], u = w.unitById(b.unit);
      if (!u || u.dead || now > b.until) { this.bubbles.splice(i, 1); continue; }
      if (this._project(u.x, u.y + 3.1 * u.scale, u.z, camera, W, H, pt)) bubbles.push({ id: b.id, text: b.text, x: pt.x, y: pt.y, kind: b.kind, a: Math.min(1, (b.until - now) / 0.4) });
    }
    for (let i = this.tags.length - 1; i >= 0; i--) {
      const g = this.tags[i], age = now - g.born;
      if (age > TAG_LIFE) { this.tags.splice(i, 1); continue; }
      if (this._project(g.x, g.y + age * 1.3, g.z, camera, W, H, pt)) tags.push({ id: g.id, kind: g.kind, x: pt.x, y: pt.y });
    }
    return { bubbles, tags };
  }
}
