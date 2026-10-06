// Formation slot generators. Offsets are in the squad frame: lx = left (+) / right (-), lz = forward (+) / back (-).
// Row 0 is the front rank. Pure functions, used by placement brushes, the army generator and the AI.

/** @returns {Array<[number, number]>} n offsets, centred on the formation (so the centroid is the origin). */
export function formationOffsets(kind, n, spacing = 1.15, rng) {
  const out = [];
  const centre = () => { let sx = 0, sz = 0; for (const o of out) { sx += o[0]; sz += o[1]; } sx /= out.length || 1; sz /= out.length || 1; for (const o of out) { o[0] -= sx; o[1] -= sz; } return out; };
  switch (kind) {
    case 'line': {            // single rank, up to 12 wide then second rank
      const width = Math.min(n, 12);
      for (let i = 0; i < n; i++) out.push([((i % width) - (width - 1) / 2) * spacing, -Math.floor(i / width) * spacing]);
      return centre();
    }
    case 'column': {
      const width = Math.max(2, Math.min(3, n));
      for (let i = 0; i < n; i++) out.push([((i % width) - (width - 1) / 2) * spacing, -Math.floor(i / width) * spacing]);
      return centre();
    }
    case 'wedge': {
      let row = 0, placed = 0;
      while (placed < n) { const cnt = row === 0 ? 1 : row + 1; for (let k = 0; k < cnt && placed < n; k++, placed++) out.push([(k - (cnt - 1) / 2) * spacing * 1.05, -row * spacing]); row++; }
      return centre();
    }
    case 'skirmish': {        // loose scatter on a jittered grid
      const w = Math.ceil(Math.sqrt(n * 1.6));
      for (let i = 0; i < n; i++) { const jx = rng ? (rng.next() - 0.5) * spacing * 0.9 : 0, jz = rng ? (rng.next() - 0.5) * spacing * 0.9 : 0; out.push([((i % w) - (w - 1) / 2) * spacing * 1.8 + jx, -Math.floor(i / w) * spacing * 1.8 + jz]); }
      return centre();
    }
    case 'circle': {
      const r = Math.max(1.4, n * spacing / (2 * Math.PI));
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; out.push([Math.cos(a) * r, Math.sin(a) * r]); }
      return out;
    }
    case 'hollow': {          // hollow square (ring of units)
      const side = Math.max(2, Math.ceil(n / 4) + 1); let k = 0;
      for (let i = 0; i < side && k < n; i++, k++) out.push([(i - (side - 1) / 2) * spacing, (side - 1) / 2 * spacing]);
      for (let i = 1; i < side && k < n; i++, k++) out.push([(side - 1) / 2 * spacing, ((side - 1) / 2 - i) * spacing]);
      for (let i = 1; i < side && k < n; i++, k++) out.push([((side - 1) / 2 - i) * spacing, -(side - 1) / 2 * spacing]);
      for (let i = 1; i < side - 1 && k < n; i++, k++) out.push([-(side - 1) / 2 * spacing, (-(side - 1) / 2 + i) * spacing]);
      return out;
    }
    case 'phalanx':           // tight block, 4 files deep default -> wide
    case 'block':
    default: {
      const depth = kind === 'phalanx' ? Math.max(2, Math.min(5, Math.round(Math.sqrt(n / 2)))) : Math.max(1, Math.round(Math.sqrt(n * 0.6)));
      const width = Math.ceil(n / depth);
      const sp = kind === 'phalanx' ? spacing * 0.92 : spacing;
      for (let i = 0; i < n; i++) out.push([((i % width) - (width - 1) / 2) * sp, -Math.floor(i / width) * sp]);
      return centre();
    }
  }
}
export const FORMATIONS = ['block', 'line', 'phalanx', 'wedge', 'column', 'skirmish', 'circle', 'hollow'];

/** Rotate squad-frame offsets into world positions around (cx,cz) with facing h (forward = (sin h, cos h), left = (cos h, -sin h)). */
export function placeOffsets(offsets, cx, cz, h, out) {
  const c = Math.cos(h), s = Math.sin(h);
  out = out || [];
  for (let i = 0; i < offsets.length; i++) {
    const lx = offsets[i][0], lz = offsets[i][1];
    out[i] = [cx + c * lx + s * lz, cz - s * lx + c * lz];
  }
  return out;
}
