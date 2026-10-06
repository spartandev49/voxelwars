// Uniform-grid spatial hash over unit indices. Rebuilt every tick (O(n)), queried without allocation.
export class Spatial {
  constructor(worldSize, cell = 3, capacity = 2048) {
    this.cell = cell;
    this.half = worldSize / 2;
    this.n = Math.ceil(worldSize / cell) + 2;
    this.head = new Int32Array(this.n * this.n).fill(-1);
    this.next = new Int32Array(capacity);
    this.cap = capacity;
  }
  clear() { this.head.fill(-1); }
  _ci(v) { const c = Math.floor((v + this.half) / this.cell) + 1; return c < 0 ? 0 : c >= this.n ? this.n - 1 : c; }
  insert(i, x, z) {
    if (i >= this.cap) { const nn = new Int32Array(this.cap * 2); nn.set(this.next); this.next = nn; this.cap *= 2; }
    const c = this._ci(x) + this._ci(z) * this.n;
    this.next[i] = this.head[c]; this.head[c] = i;
  }
  /** Fill out[] with indices within the AABB-cell range of radius r; caller does the exact distance test. Returns count. */
  query(x, z, r, out) {
    const x0 = this._ci(x - r), x1 = this._ci(x + r), z0 = this._ci(z - r), z1 = this._ci(z + r);
    let n = 0; const max = out.length, head = this.head, next = this.next;
    for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
      for (let i = head[cx + cz * this.n]; i !== -1; i = next[i]) { if (n < max) out[n++] = i; }
    }
    return n;
  }
}
