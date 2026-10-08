// The save stack of a source tree as an importable object, and a "device" (an in-memory localStorage plus the real Store / Settings / Docs / LifetimeStats / Transfer
// objects wired exactly like src/app/main.js does) so the G5 tests can run the BASELINE's save code (imported from .cache/baseline/ancient-v8 by path) and the code of
// THIS tree side by side on the same bytes. Owner: TOOLS-GOLDEN (VF 3.6.3, AR 3.5.4).
//
//   const S = await loadStack(root);                 // root = the baseline worktree or this repository
//   const dev = S.device(initial);                   // initial = { 'vw.progress': '<exact string>', ... } (a fixture's LOCAL_STORAGE) or undefined
//   dev.docs.loadAll(); await dev.T.exportAll(); dev.dump()  -> { progress: {v, data}, ... } parsed envelopes of every stored vw.* key
//   S.constants() -> { CURRENT, SAVE_FORMAT, EXPORT_KEYS, MAX_SAVE_CODE, MAX_CODE, MAGIC, COLLECTION_CAPS }
import { openTree } from './tree.mjs';

/** localStorage stand-in (same surface as the one of tests/save/transfer.test.mjs). */
export function memoryBackend(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { get length() { return m.size; }, key: (i) => Array.from(m.keys())[i], getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, _m: m };
}

export async function loadStack(root) {
  const T = await openTree(root, { regime: null });
  const [store, docs, transfer, stats, share, migrate, validate, defsMod] = await Promise.all(['saveStore', 'saveDocs', 'saveTransfer', 'saveStats', 'saveShare', 'saveMigrate', 'saveValidate', 'defs'].map((k) => T.src(k)));
  const defs = defsMod.buildSimDefs();
  const S = { root, T, store, docs, transfer, stats, share, migrate, validate, defs };
  S.constants = () => ({ CURRENT: migrate.CURRENT, SAVE_FORMAT: transfer.SAVE_FORMAT, EXPORT_KEYS: transfer.EXPORT_KEYS, MAX_SAVE_CODE: transfer.MAX_SAVE_CODE, MAX_CODE: share.MAX_CODE, MAGIC: share.MAGIC, COLLECTION_CAPS: transfer.COLLECTION_CAPS });
  S.device = (initial) => {
    const be = memoryBackend(initial), st = new store.Store(be), settings = new store.Settings(st);
    const dc = docs.createDocs(st), ls = new stats.LifetimeStats({ adapter: stats.storeAdapter(st), debounceMs: 0 });
    dc.loadAll();
    const collections = { arenas: new store.Collection(st, 'arenas', 48), soldiers: new store.Collection(st, 'soldiers', 24), armies: new store.Collection(st, 'armies', 24) };
    const Tr = transfer.createTransfer({ store: st, docs: dc, stats: ls, settings, collections, defs, build: 'g5-test', now: () => 1790000000000 });
    return {
      be, store: st, settings, docs: dc, stats: ls, collections, T: Tr, defs,
      /** every stored vw.* key as a parsed {v, data} envelope, by key without the prefix; non-envelope strings are returned as {raw} */
      dump() { const o = {}; for (const [k, raw] of Array.from(be._m.entries()).sort()) { if (!k.startsWith('vw.')) continue; try { o[k.slice(3)] = JSON.parse(raw); } catch { o[k.slice(3)] = { raw }; } } return o; },
    };
  };
  return S;
}
