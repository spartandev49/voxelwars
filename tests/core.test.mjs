import assert from 'node:assert';
import { crc32, crc32hex } from '../src/core/crc32.js';
import { b64uEncode, b64uDecode } from '../src/core/base64url.js';
import { UndoStack } from '../src/core/undo.js';
assert.equal(crc32hex(new TextEncoder().encode('123456789')), 'cbf43926');
for (let n = 0; n < 40; n++) { const b = new Uint8Array(n); for (let i = 0; i < n; i++) b[i] = (i * 37 + n) & 255; assert.deepEqual(Array.from(b64uDecode(b64uEncode(b))), Array.from(b)); }
assert.throws(() => b64uDecode('ab$d'));
let v = 0; const u = new UndoStack(3);
const inc = (d) => ({ do() { v += d; }, undo() { v -= d; } });
u.exec(inc(1)); u.exec(inc(2)); u.exec(inc(3)); u.exec(inc(4)); assert.equal(v, 10); assert.equal(u.depth, 3);
u.undo(); assert.equal(v, 6); u.redo(); assert.equal(v, 10); u.undo(); u.undo(); u.undo(); assert.equal(v, 1); assert.equal(u.canUndo(), false);
console.log('core OK');
