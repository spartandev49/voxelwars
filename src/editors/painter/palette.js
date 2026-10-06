// Painter palettes: colour maths (HSV <-> RGB), the recent-colours list and the palette share string.
//   a palette = [{rgb:0xRRGGBB, material:'normal'|'team'|'glow'}]  <->  "VWPAL1:c8453c,f2d36bT,ffee88G"   (T = team tint, G = glow; <= 64 colours)
export const PALETTE_MAX = 64;
const SUFFIX = { team: 'T', glow: 'G' }, MAT = { T: 'team', G: 'glow' };

export function hsvToRgb(h, s, v) {
  h = ((h % 360) + 360) % 360; const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return ((Math.round((r + m) * 255) << 16) | (Math.round((g + m) * 255) << 8) | Math.round((b + m) * 255)) >>> 0;
}
export function rgbToHsv(rgb) {
  const r = ((rgb >> 16) & 255) / 255, g = ((rgb >> 8) & 255) / 255, b = (rgb & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0; if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); }
  return { h: (h + 360) % 360, s: mx ? d / mx : 0, v: mx };
}
export const toHex = (rgb) => '#' + (rgb & 0xffffff).toString(16).padStart(6, '0');
export function parseHex(s) { const m = /^#?([0-9a-fA-F]{6})$/.exec(String(s).trim()); return m ? parseInt(m[1], 16) : null; }

/** Recent colours: most recent first, no duplicates (same rgb and material), at most `max`. */
export function pushRecent(list, entry, max = 24) {
  const out = [entry].concat(list.filter((e) => !(e.rgb === entry.rgb && e.material === entry.material)));
  return out.slice(0, max);
}

export function encodePalette(list) {
  const items = list.slice(0, PALETTE_MAX).map((e) => (e.rgb & 0xffffff).toString(16).padStart(6, '0') + (SUFFIX[e.material] || ''));
  return 'VWPAL1:' + items.join(',');
}
/** @returns {{ok:true, list:Array}|{ok:false, error:string}} with plain-English errors */
export function decodePalette(text) {
  const t = String(text || '').replace(/\s+/g, '');
  if (!t) return { ok: false, error: 'Paste a palette code first. It starts with VWPAL1:' };
  if (t.length > 2000) return { ok: false, error: `That palette code is too long (${t.length.toLocaleString('en-US')} characters).` };
  if (!t.startsWith('VWPAL1:')) return { ok: false, error: 'That does not look like a palette code (it should start with VWPAL1:).' };
  const parts = t.slice(7).split(',').filter(Boolean);
  if (!parts.length) return { ok: false, error: 'That palette has no colours in it.' };
  if (parts.length > PALETTE_MAX) return { ok: false, error: `That palette has ${parts.length} colours; the limit is ${PALETTE_MAX}.` };
  const list = [];
  for (const p of parts) {
    const m = /^([0-9a-fA-F]{6})([TG]?)$/.exec(p);
    if (!m) return { ok: false, error: `'${p.slice(0, 12)}' is not a colour. Colours are six hex digits, optionally followed by T (team tint) or G (glow).` };
    list.push({ rgb: parseInt(m[1], 16), material: MAT[m[2]] || 'normal' });
  }
  return { ok: true, list };
}
