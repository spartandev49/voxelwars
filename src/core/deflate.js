// Deflate helpers for share codes. compress(): CompressionStream('deflate-raw') when available, otherwise valid "stored" deflate
// blocks (no compression, always decodable). inflate(): CompressionStream when available, else a small pure-JS inflater (handles
// stored, fixed and dynamic Huffman blocks) so a code made anywhere opens everywhere.

export async function deflateRaw(bytes) {
  if (typeof CompressionStream !== 'undefined') {
    try {
      const cs = new CompressionStream('deflate-raw'); const w = cs.writable.getWriter(); w.write(bytes); w.close();
      return new Uint8Array(await new Response(cs.readable).arrayBuffer());
    } catch (e) { /* fall through to stored */ }
  }
  return storedDeflate(bytes);
}
export async function inflateRaw(bytes, maxOut = 8 * 1024 * 1024) {
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const ds = new DecompressionStream('deflate-raw'); const w = ds.writable.getWriter(); w.write(bytes).catch(() => {}); w.close().catch(() => {});
      const buf = new Uint8Array(await new Response(ds.readable).arrayBuffer()); if (buf.length > maxOut) throw new Error('Payload too large after decompression'); return buf;
    } catch (e) { if (/too large/.test(String(e.message))) throw e; /* fall through */ }
  }
  return inflateSync(bytes, maxOut);
}

/** Valid deflate stream made of stored blocks (<= 65535 bytes each). */
export function storedDeflate(bytes) {
  const n = bytes.length, blocks = Math.max(1, Math.ceil(n / 65535)), out = new Uint8Array(n + blocks * 5);
  let o = 0, p = 0;
  for (let b = 0; b < blocks; b++) {
    const len = Math.min(65535, n - p), last = b === blocks - 1 ? 1 : 0;
    out[o++] = last; out[o++] = len & 255; out[o++] = len >> 8; out[o++] = (~len) & 255; out[o++] = ((~len) >> 8) & 255;
    out.set(bytes.subarray(p, p + len), o); o += len; p += len;
  }
  return out;
}

const LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DBASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CL_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

function buildHuff(lengths) {
  const count = new Uint16Array(16), offs = new Uint16Array(16), syms = new Uint16Array(lengths.length);
  for (const l of lengths) count[l]++;
  count[0] = 0; for (let i = 1; i < 16; i++) offs[i] = offs[i - 1] + count[i - 1];
  for (let s = 0; s < lengths.length; s++) if (lengths[s]) syms[offs[lengths[s]]++] = s;
  return { count, syms };
}
export function inflateSync(src, maxOut = 8 * 1024 * 1024) {
  let pos = 0, bitBuf = 0, bitCnt = 0, out = new Uint8Array(Math.min(maxOut, Math.max(1024, src.length * 4))), op = 0;
  const need = (n) => { while (bitCnt < n) { if (pos >= src.length) throw new Error('Truncated data'); bitBuf |= src[pos++] << bitCnt; bitCnt += 8; } };
  const bits = (n) => { if (n === 0) return 0; need(n); const v = bitBuf & ((1 << n) - 1); bitBuf >>>= n; bitCnt -= n; return v; };
  const grow = (extra) => { if (op + extra > maxOut) throw new Error('Payload too large after decompression'); if (op + extra > out.length) { const nn = new Uint8Array(Math.min(maxOut, Math.max(out.length * 2, op + extra))); nn.set(out.subarray(0, op)); out = nn; } };
  const decode = (h) => { let code = 0, first = 0, index = 0; for (let len = 1; len < 16; len++) { code |= bits(1); const c = h.count[len]; if (code - c < first) return h.syms[index + (code - first)]; index += c; first += c; first <<= 1; code <<= 1; } throw new Error('Corrupt data (bad Huffman code)'); };
  let fixedL = null, fixedD = null;
  for (;;) {
    const last = bits(1), type = bits(2);
    if (type === 0) {
      bitBuf = 0; bitCnt = 0; if (pos + 4 > src.length) throw new Error('Truncated data');
      const len = src[pos] | (src[pos + 1] << 8), nlen = src[pos + 2] | (src[pos + 3] << 8); pos += 4;
      if ((len ^ 0xffff) !== nlen) throw new Error('Corrupt data (stored block)');
      if (pos + len > src.length) throw new Error('Truncated data');
      grow(len); out.set(src.subarray(pos, pos + len), op); op += len; pos += len;
    } else if (type === 1 || type === 2) {
      let lh, dh;
      if (type === 1) {
        if (!fixedL) { const l = new Uint8Array(288); for (let i = 0; i < 144; i++) l[i] = 8; for (let i = 144; i < 256; i++) l[i] = 9; for (let i = 256; i < 280; i++) l[i] = 7; for (let i = 280; i < 288; i++) l[i] = 8; fixedL = buildHuff(l); fixedD = buildHuff(new Uint8Array(30).fill(5)); }
        lh = fixedL; dh = fixedD;
      } else {
        const hlit = bits(5) + 257, hdist = bits(5) + 1, hclen = bits(4) + 4; const cl = new Uint8Array(19);
        for (let i = 0; i < hclen; i++) cl[CL_ORDER[i]] = bits(3);
        const ch = buildHuff(cl), lens = new Uint8Array(hlit + hdist);
        for (let i = 0; i < hlit + hdist;) {
          const sym = decode(ch);
          if (sym < 16) lens[i++] = sym;
          else { let rep, v = 0; if (sym === 16) { if (!i) throw new Error('Corrupt data'); v = lens[i - 1]; rep = 3 + bits(2); } else if (sym === 17) rep = 3 + bits(3); else rep = 11 + bits(7); if (i + rep > hlit + hdist) throw new Error('Corrupt data'); while (rep--) lens[i++] = v; }
        }
        lh = buildHuff(lens.subarray(0, hlit)); dh = buildHuff(lens.subarray(hlit));
      }
      for (;;) {
        const sym = decode(lh);
        if (sym < 256) { grow(1); out[op++] = sym; }
        else if (sym === 256) break;
        else {
          const li = sym - 257; if (li >= 29) throw new Error('Corrupt data (length symbol)');
          const len = LBASE[li] + bits(LEXT[li]); const ds = decode(dh); if (ds >= 30) throw new Error('Corrupt data (distance symbol)');
          const dist = DBASE[ds] + bits(DEXT[ds]); if (dist > op) throw new Error('Corrupt data (distance too far)');
          grow(len); for (let k = 0; k < len; k++) { out[op] = out[op - dist]; op++; }
        }
      }
    } else throw new Error('Corrupt data (block type)');
    if (last) break;
  }
  return out.slice(0, op);
}
