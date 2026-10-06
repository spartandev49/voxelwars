// base64url without padding, pure (no atob/btoa so it works in Node and the browser alike).
const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const REV = new Int16Array(128).fill(-1); for (let i = 0; i < 64; i++) REV[A.charCodeAt(i)] = i;
export function b64uEncode(bytes) {
  let out = '', i = 0;
  for (; i + 2 < bytes.length; i += 3) { const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]; out += A[n >> 18] + A[(n >> 12) & 63] + A[(n >> 6) & 63] + A[n & 63]; }
  if (i + 1 === bytes.length) { const n = bytes[i] << 16; out += A[n >> 18] + A[(n >> 12) & 63]; }
  else if (i + 2 === bytes.length) { const n = (bytes[i] << 16) | (bytes[i + 1] << 8); out += A[n >> 18] + A[(n >> 12) & 63] + A[(n >> 6) & 63]; }
  return out;
}
export function b64uDecode(s) {
  const clean = s.replace(/[\s=]/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const out = new Uint8Array(Math.floor(clean.length * 3 / 4));
  let o = 0, acc = 0, bits = 0;
  for (let i = 0; i < clean.length; i++) {
    const c = clean.charCodeAt(i), v = c < 128 ? REV[c] : -1;
    if (v < 0) throw new Error('Invalid character in code at position ' + i);
    acc = (acc << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (acc >> bits) & 255; acc &= (1 << bits) - 1; }
  }
  return out.subarray(0, o);
}
