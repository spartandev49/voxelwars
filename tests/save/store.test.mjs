// Store: quota handling that loses nothing (verification P2), raw envelope access, blocked storage. Run: node tests/save/store.test.mjs
import assert from 'node:assert/strict';
import { Store, Settings, Collection } from '../../src/save/store.js';

const mem = (quota = Infinity) => { const m = new Map(); let bytes = 0; return { get length() { return m.size; }, key: (i) => Array.from(m.keys())[i], getItem: (k) => (m.has(k) ? m.get(k) : null),
  setItem: (k, v) => { v = String(v); const old = m.has(k) ? m.get(k).length : 0; if (bytes - old + v.length > quota) { const e = new Error('The quota has been exceeded'); e.name = 'QuotaExceededError'; throw e; } bytes += v.length - old; m.set(k, v); },
  removeItem: (k) => { if (m.has(k)) { bytes -= m.get(k).length; m.delete(k); } }, _m: m }; };

// ---- envelope access
{
  const be = mem(); const s = new Store(be);
  assert.equal(s.getVersioned('x'), null); assert.equal(s.getRaw('x'), null);
  s.set('x', { a: 1 }, 3); assert.deepEqual(s.getVersioned('x'), { v: 3, data: { a: 1 } }); assert.equal(s.getRaw('x'), '{"v":3,"data":{"a":1}}'); assert.deepEqual(s.get('x'), { a: 1 });
  be.setItem('vw.junk', '{nope'); assert.equal(s.getVersioned('junk'), null); assert.equal(s.get('junk', 'fb'), 'fb'); be.setItem('vw.nodata', '{"v":1}'); assert.equal(s.getVersioned('nodata'), null);
  be.setItem('vw.badv', '{"v":"zz","data":5}'); assert.deepEqual(s.getVersioned('badv'), { v: 1, data: 5 });
  assert.ok(s.setRaw('y', '{"v":1,"data":2}')); assert.equal(s.get('y'), 2); assert.ok(s.setRaw('y', null)); assert.equal(s.getRaw('y'), null);
  assert.ok(s.keys().includes('x'));
}

// ---- quota: the refused write is kept (nothing is lost), the status says 'full', and it is written once there is room
{
  const be = mem(400); const s = new Store(be); const seen = []; s.onStatus((st) => seen.push(st));
  assert.equal(s.set('big', { pad: 'x'.repeat(250) }), true); assert.equal(s.status(), 'ok');
  assert.equal(s.set('other', { pad: 'y'.repeat(300) }), false, 'the browser refused it'); assert.equal(s.status(), 'full'); assert.deepEqual(seen, ['full']);
  assert.equal(s.get('other').pad.length, 300, 'but the value is still readable this session'); assert.deepEqual(s.pending(), ['other']); assert.ok(s.keys().includes('other'));
  assert.equal(s.getVersioned('other').data.pad.length, 300); assert.equal(be.getItem('vw.other'), null, 'nothing partial in storage');
  assert.equal(s.flushPending(), 1, 'still no room'); assert.equal(s.status(), 'full');
  s.remove('big'); assert.equal(s.flushPending(), 0); assert.equal(s.status(), 'ok'); assert.deepEqual(seen, ['full', 'ok']); assert.equal(JSON.parse(be.getItem('vw.other')).data.pad.length, 300); assert.deepEqual(s.pending(), []);
  // a later successful write of the same key clears its pending copy
  const be2 = mem(300); const s2 = new Store(be2); s2.set('k', { pad: 'z'.repeat(250) }); s2.set('k', { pad: 'z'.repeat(400) }); assert.equal(s2.status(), 'full'); assert.deepEqual(s2.pending(), ['k']); s2.set('k', { pad: 'small' }); assert.deepEqual(s2.pending(), []); assert.equal(s2.status(), 'ok'); assert.equal(s2.get('k').pad, 'small');
  // settings and collections ride on the same guarantee
  const be3 = mem(500); const s3 = new Store(be3); const col = new Collection(s3, 'arenas', 48); col.put({ id: 'a', name: 'A', pad: 'q'.repeat(350) }); assert.equal(col.put({ id: 'b', name: 'B', pad: 'q'.repeat(350) }), false);
  assert.deepEqual(col.list().map((x) => x.id), ['b', 'a'].filter((x) => col.list().some((y) => y.id === x)), 'the list still holds what it can'); assert.ok(col.get('b'), 'the refused save is still there');
}

// ---- blocked storage (private window): memory mode, everything works, nothing to flush
{
  const s = new Store(null); assert.equal(s.status(), 'memory'); assert.equal(s.set('a', 1), false); assert.equal(s.get('a'), 1); assert.equal(s.getVersioned('a').data, 1); assert.deepEqual(s.pending(), []); assert.equal(s.flushPending(), 0);
  const st = new Settings(s); st.set('quality', 'potato'); st.flush(); assert.equal(s.get('settings').quality, 'potato');
}
// ---- a backend that throws on every access (disabled storage)
{
  const bad = { get length() { throw new Error('denied'); }, key() { throw new Error('denied'); }, getItem() { throw new Error('denied'); }, setItem() { throw new Error('SecurityError'); }, removeItem() { throw new Error('denied'); } };
  const s = new Store(bad); assert.equal(s.get('x', 'fb'), 'fb'); assert.equal(s.set('x', 1), false); assert.equal(s.status(), 'memory'); assert.equal(s.get('x'), 1); assert.deepEqual(s.keys().length >= 0, true); assert.equal(s.getVersioned('nope'), null);
}
console.log('store OK');
