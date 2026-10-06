// style.js — the single source of truth for the look ("Toy-box Olympus" 3D side). Frozen once post.js exists; changes need COORD sign-off.
// Colours here are sRGB hex; the renderer converts to linear where needed.

/** Team colour palettes (index 0 = team A, 1 = team B). */
export const TEAM_PALETTES = {
  classic:  [0x2f6bff, 0xe23b3b],   // cobalt vs crimson
  cvd:      [0x1b8cff, 0xffa31a],   // blue vs orange (deuteranopia/protanopia safe)
  contrast: [0x00e0ff, 0xff2d95],   // cyan vs magenta
};
export function teamColorsLinear(palette = 'classic') {
  const p = TEAM_PALETTES[palette] || TEAM_PALETTES.classic;
  return p.map((h) => { const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return [f((h >> 16) & 255), f((h >> 8) & 255), f(h & 255)]; });
}

/** Final grade (applied in post composite). */
export const GRADE = { exposure: 1.0, saturation: 1.12, contrast: 1.04, vignette: 0.32 };

/** Per-tier post settings: bloom levels/strength and MSAA samples. */
export const POST_TIERS = {
  potato:   { levels: 0, bloom: 0.0,  samples: 0 },
  papyrus:  { levels: 3, bloom: 0.22, samples: 2 },
  marble:   { levels: 4, bloom: 0.34, samples: 4 },
  olympian: { levels: 5, bloom: 0.44, samples: 4 },
};

/** Light rig tunables (engine.setEnvironment reads these). */
export const LIGHT = { sunNoon: 0.95, hemiBase: 0.34, hemiDay: 0.34, shadowBias: -0.0006, shadowNormalBias: 0.04, shadowRadius: 55 };
