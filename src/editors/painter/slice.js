// SliceView: the Voxel Painter's 2D view. One layer of the part along x, y or z drawn with large square cells, an optional grid and onion skin (the layers above and
// below faintly), click / drag to paint. Pointer events go to the tool callback as {type:'down'|'move'|'up'|'leave'|'cancel', cell, e}.
const TEAM_A = [0x2f, 0x6b, 0xff];

/** slice geometry: u across, v down. cell = [x, y, z] for (u, v, layer). */
export function sliceDims(axis, sx, sy, sz) {
  if (axis === 'x') return { du: sz, dv: sy, layers: sx, uName: 'z (front is right)', vName: 'y (up)' };
  if (axis === 'z') return { du: sx, dv: sy, layers: sz, uName: 'x (his left is right)', vName: 'y (up)' };
  return { du: sx, dv: sz, layers: sy, uName: 'x (his left is right)', vName: 'z (front is down)' };
}
export function sliceCell(axis, u, v, layer, sx, sy, sz) {
  if (axis === 'x') return [layer, sy - 1 - v, u];
  if (axis === 'z') return [u, sy - 1 - v, layer];
  return [u, layer, v];
}
/** inverse: which (u, v) a cell has in a slice along `axis` (null when it is on another layer) */
export function cellToUV(axis, cell, layer, sx, sy, sz) {
  if (axis === 'x') return cell[0] === layer ? [cell[2], sy - 1 - cell[1]] : null;
  if (axis === 'z') return cell[2] === layer ? [cell[0], sy - 1 - cell[1]] : null;
  return cell[1] === layer ? [cell[0], cell[2]] : null;
}
const rgbOf = (v) => {
  const fl = (v >>> 24) & 255; let r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
  if (fl & 2) { r = Math.round((r * TEAM_A[0]) / 255); g = Math.round((g * TEAM_A[1]) / 255); b = Math.round((b * TEAM_A[2]) / 255); }
  if (fl & 4) { r = Math.min(255, r + 45); g = Math.min(255, g + 45); b = Math.min(255, b + 45); }
  return [r, g, b];
};

export class SliceView {
  /** @param {HTMLElement} host  @param {{onTool?:(ev)=>void}} o */
  constructor(host, o = {}) {
    this.o = o; this.host = host; this.part = null; this.axis = 'y'; this.layer = 0; this.onion = true; this.grid = true; this.hover = null; this.hoverSize = 1; this.preview = []; this.previewErase = false; this.sel = null; this.mirrorCells = [];
    this.canvas = document.createElement('canvas'); this.canvas.className = 'pt-canvas pt-slice'; this.canvas.tabIndex = 0; this.canvas.setAttribute('role', 'img'); this.canvas.setAttribute('aria-label', 'Slice view of the part. Click or drag cells to paint. Mouse wheel changes the layer.');
    host.appendChild(this.canvas); this.g = this.canvas.getContext('2d'); this.lay = { s: 16, ox: 0, oy: 0 }; this.down = null;
    this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.draw()) : null; if (this.ro) this.ro.observe(host);
    this._bind();
  }
  setPart(part) { this.part = part; this.layer = Math.min(this.layer, this.layerCount() - 1); this.draw(); }
  layerCount() { if (!this.part) return 1; const g = this.part.grid; return sliceDims(this.axis, g.sx, g.sy, g.sz).layers; }
  setAxis(a) { this.axis = a; const n = this.layerCount(); this.layer = Math.min(n - 1, Math.max(0, Math.floor(n / 2))); this.draw(); }
  setLayer(n) { this.layer = Math.max(0, Math.min(this.layerCount() - 1, n)); this.draw(); if (this.o.onLayer) this.o.onLayer(this.layer); }
  setOnion(b) { this.onion = !!b; this.draw(); } setGrid(b) { this.grid = !!b; this.draw(); }
  setHover(cell, size = 1, mirrors = []) { this.hover = cell; this.hoverSize = size; this.mirrorCells = mirrors; this.draw(); }
  setPreview(cells, erase = false) { this.preview = cells || []; this.previewErase = erase; this.draw(); }
  setSelection(sel) { this.sel = sel; this.draw(); }

  _bind() {
    const c = this.canvas;
    c.style.touchAction = 'none';
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      c.setPointerCapture(e.pointerId); c.focus({ preventScroll: true }); this.down = e.pointerId;
      if (this.o.onTool) this.o.onTool({ type: 'down', cell: this.cellAt(e.clientX, e.clientY), e });
    });
    c.addEventListener('pointermove', (e) => { if (this.o.onTool) this.o.onTool({ type: 'move', cell: this.cellAt(e.clientX, e.clientY), e, down: this.down === e.pointerId }); });
    const up = (e) => { if (this.down !== e.pointerId) return; this.down = null; if (this.o.onTool) this.o.onTool({ type: 'up', cell: this.cellAt(e.clientX, e.clientY), e }); };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', (e) => { this.down = null; if (this.o.onTool) this.o.onTool({ type: 'cancel' }); });
    c.addEventListener('pointerleave', () => { if (this.down === null && this.o.onTool) this.o.onTool({ type: 'leave' }); });
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.setLayer(this.layer + (e.deltaY > 0 ? 1 : -1)); }, { passive: false });
  }
  /** The cell under client coordinates in the current layer, or null outside the grid. */
  cellAt(clientX, clientY) {
    if (!this.part) return null; const g = this.part.grid, d = sliceDims(this.axis, g.sx, g.sy, g.sz), r = this.canvas.getBoundingClientRect(), L = this.lay;
    const u = Math.floor((clientX - r.left - L.ox) / L.s), v = Math.floor((clientY - r.top - L.oy) / L.s);
    if (u < 0 || v < 0 || u >= d.du || v >= d.dv) return null;
    return sliceCell(this.axis, u, v, this.layer, g.sx, g.sy, g.sz);
  }

  draw() {
    if (!this.part) return;
    const c = this.canvas, g = this.g, grid = this.part.grid, dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(40, this.host.clientWidth), H = Math.max(40, this.host.clientHeight);
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); c.style.width = '100%'; c.style.height = '100%'; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const d = sliceDims(this.axis, grid.sx, grid.sy, grid.sz), pad = 26;
    const s = Math.max(5, Math.min(48, Math.floor(Math.min((W - pad * 2) / d.du, (H - pad * 2) / d.dv)))), ox = Math.floor((W - s * d.du) / 2), oy = Math.floor((H - s * d.dv) / 2);
    this.lay = { s, ox, oy };
    // checkerboard
    for (let v = 0; v < d.dv; v++) for (let u = 0; u < d.du; u++) { g.fillStyle = (u + v) & 1 ? '#262b63' : '#2d3370'; g.fillRect(ox + u * s, oy + v * s, s, s); }
    const draw = (layer, alpha, tint) => {
      if (layer < 0 || layer >= d.layers) return;
      g.globalAlpha = alpha;
      for (let v = 0; v < d.dv; v++) for (let u = 0; u < d.du; u++) {
        const cell = sliceCell(this.axis, u, v, layer, grid.sx, grid.sy, grid.sz), val = grid.get(cell[0], cell[1], cell[2]); if (!val) continue;
        const [r, gg, b] = rgbOf(val);
        g.fillStyle = tint ? `rgb(${Math.round(r * 0.4 + tint[0] * 0.6)},${Math.round(gg * 0.4 + tint[1] * 0.6)},${Math.round(b * 0.4 + tint[2] * 0.6)})` : `rgb(${r},${gg},${b})`;
        g.fillRect(ox + u * s, oy + v * s, s, s);
        if (!tint && ((val >>> 24) & 4)) { g.strokeStyle = 'rgba(255,255,200,.9)'; g.lineWidth = 1; g.strokeRect(ox + u * s + 1.5, oy + v * s + 1.5, s - 3, s - 3); }
        if (!tint && ((val >>> 24) & 2) && s >= 12) { g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(ox + u * s + s - 5, oy + v * s + 2, 3, 3); }
      }
      g.globalAlpha = 1;
    };
    if (this.onion) { draw(this.layer - 1, 0.26, [110, 198, 255]); draw(this.layer + 1, 0.26, [255, 126, 182]); }
    draw(this.layer, 1, null);
    // grid
    if (this.grid && s >= 8) {
      g.lineWidth = 1;
      for (let u = 0; u <= d.du; u++) { g.strokeStyle = u % 5 === 0 ? 'rgba(185,194,224,.45)' : 'rgba(185,194,224,.18)'; g.beginPath(); g.moveTo(ox + u * s + 0.5, oy); g.lineTo(ox + u * s + 0.5, oy + d.dv * s); g.stroke(); }
      for (let v = 0; v <= d.dv; v++) { g.strokeStyle = v % 5 === 0 ? 'rgba(185,194,224,.45)' : 'rgba(185,194,224,.18)'; g.beginPath(); g.moveTo(ox, oy + v * s + 0.5); g.lineTo(ox + d.du * s, oy + v * s + 0.5); g.stroke(); }
    }
    g.strokeStyle = '#ffc93c'; g.lineWidth = 2; g.strokeRect(ox - 1, oy - 1, d.du * s + 2, d.dv * s + 2);
    // previews, selection, hover
    const mark = (cell, style, fill) => { const uv = cellToUV(this.axis, cell, this.layer, grid.sx, grid.sy, grid.sz); if (!uv) return; if (fill) { g.fillStyle = fill; g.fillRect(ox + uv[0] * s, oy + uv[1] * s, s, s); } if (style) { g.strokeStyle = style; g.lineWidth = 2; g.strokeRect(ox + uv[0] * s + 1, oy + uv[1] * s + 1, s - 2, s - 2); } };
    for (const cell of this.preview) mark(cell, null, this.previewErase ? 'rgba(255,93,93,.45)' : 'rgba(255,255,255,.45)');
    if (this.sel) {
      const a = this.sel; const cells = [[a.x0, a.y0, a.z0], [a.x1, a.y1, a.z1]];
      const inLayer = this.axis === 'x' ? a.x0 <= this.layer && this.layer <= a.x1 : this.axis === 'y' ? a.y0 <= this.layer && this.layer <= a.y1 : a.z0 <= this.layer && this.layer <= a.z1;
      if (inLayer) {
        const p = cells.map((cc) => { const cc2 = cc.slice(); if (this.axis === 'x') cc2[0] = this.layer; else if (this.axis === 'y') cc2[1] = this.layer; else cc2[2] = this.layer; return cellToUV(this.axis, cc2, this.layer, grid.sx, grid.sy, grid.sz); });
        if (p[0] && p[1]) { const x0 = Math.min(p[0][0], p[1][0]), x1 = Math.max(p[0][0], p[1][0]), y0 = Math.min(p[0][1], p[1][1]), y1 = Math.max(p[0][1], p[1][1]); g.setLineDash([6, 4]); g.strokeStyle = '#ffe27a'; g.lineWidth = 2; g.strokeRect(ox + x0 * s, oy + y0 * s, (x1 - x0 + 1) * s, (y1 - y0 + 1) * s); g.setLineDash([]); }
      }
    }
    for (const cell of this.mirrorCells) mark(cell, 'rgba(255,126,182,.8)', null);
    if (this.hover) {
      const sz = this.hoverSize, lo = -Math.floor((sz - 1) / 2);
      for (let a = 0; a < sz; a++) for (let b = 0; b < sz; b++) {
        const cell = this.hover.slice(); const ua = lo + a, ub = lo + b;
        if (this.axis === 'x') { cell[2] += ua; cell[1] -= ub; } else if (this.axis === 'z') { cell[0] += ua; cell[1] -= ub; } else { cell[0] += ua; cell[2] += ub; }
        mark(cell, '#ffffff', 'rgba(255,255,255,.18)');
      }
    }
    // labels
    g.fillStyle = 'rgba(243,246,251,.8)'; g.font = '600 11px Rubik, system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText(d.uName, ox + (d.du * s) / 2, oy + d.dv * s + 17);
    g.save(); g.translate(ox - 12, oy + (d.dv * s) / 2); g.rotate(-Math.PI / 2); g.fillText(d.vName, 0, 0); g.restore();
  }
  destroy() { if (this.ro) this.ro.disconnect(); this.canvas.remove(); }
}
