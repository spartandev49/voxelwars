// Import-free hashing used by code that is also bundled into a browser page (g2_core.mjs): FNV-1a 32 over the UTF-16 code units of a string.
/** 8 lowercase hex digits (the arena hash of docs/eras/spec/W.md F1: FNV-1a-32 of JSON.stringify(arena.toJSON())). */
export function fnv32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
