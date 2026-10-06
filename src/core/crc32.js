// CRC-32 (IEEE) for share-code integrity checks.
let TABLE = null;
function table() { if (TABLE) return TABLE; TABLE = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); TABLE[n] = c >>> 0; } return TABLE; }
/** @param {Uint8Array} bytes @returns {number} unsigned 32-bit */
export function crc32(bytes) { const t = table(); let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
export const crc32hex = (bytes) => crc32(bytes).toString(16).padStart(8, '0');
