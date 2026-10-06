// Arena library and drafts (pure + async; works on the ctx.save contract of app_contract.md section 2).
//   My Arenas: ctx.save.arenas (Collection, cap 48). An item is {id, name, author, desc, tags, size, updated, objective, thumb, code}
//   where `code` is the share code (deflated) so a 256 x 256 arena costs kilobytes of storage, not hundreds.
//   Draft: ctx.save.draft('arena') when COORD provides it, else the raw store key vw.draft.arena (spec/editors.md section 0, P5).

import { encodeShare } from '../../save/share.js';
import { fromDoc, importArena, toDoc, ValidationError } from './docs.js';
import { LIMITS } from './consts.js';

let seq = 0;
const newId = () => 'a_' + Date.now().toString(36) + (seq++).toString(36);

export function draftFor(ctx) {
  const sv = (ctx && ctx.save) || {};
  if (typeof sv.draft === 'function') { try { const d = sv.draft('arena'); if (d && typeof d.load === 'function') return d; } catch (e) { /* fall back */ } }
  const st = sv.store;
  if (st && typeof st.get === 'function') return { load: () => st.get('draft.arena', null), save: (data) => st.set('draft.arena', data), clear: () => st.remove('draft.arena') };
  let mem = null;
  return { load: () => mem, save: (d) => { mem = d; return true; }, clear: () => { mem = null; } };
}

export function libraryFor(ctx) {
  const col = ctx && ctx.save && ctx.save.arenas;
  const lib = {
    available: !!col,
    status: () => { try { return ctx.save.status(); } catch (e) { return 'ok'; } },
    list() { try { return col ? col.list() : []; } catch (e) { return []; } },
    get(id) { return lib.list().find((x) => x.id === id) || null; },
    /** Save (or update) the session's arena. Resolves {ok, item, code} (ok false when storage refuses). */
    async save(session, o = {}) {
      if (!col) return { ok: false, item: null, reason: 'no-storage' };
      const a = session.arena, meta = { objective: session.objective, tags: session.tags };
      const name = String(a.name || '').trim() || 'Untitled Arena';
      const { code, length } = await encodeShare('arena', toDoc(a, meta));
      const old = !o.asNew && session.id ? lib.get(session.id) : null;
      const item = { id: old ? old.id : newId(), name: name.slice(0, LIMITS.nameMax), author: a.author || '', desc: a.desc || '', tags: session.tags.slice(), size: a.size, updated: Date.now(), objective: session.objective, thumb: o.thumb || (old && old.thumb) || '', code, length };
      const ok = col.put(item) !== false && lib.status() !== 'memory';
      return { ok, item, code, status: lib.status() };
    },
    /** Decode an item to {arena, objective, tags, notes}. The item's name wins over the name inside the code. */
    async open(item) {
      let res;
      if (item.code) res = await importArena(item.code);
      else if (item.data) res = fromDoc(item.data);
      else throw new ValidationError('That saved arena has no data');
      res.arena.name = String(item.name || res.arena.name).slice(0, LIMITS.nameMax);
      return res;
    },
    remove(id) { if (col) col.remove(id); },
    rename(id, name) { const it = lib.get(id); if (!it || !col) return false; it.name = String(name).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, LIMITS.nameMax) || it.name; it.updated = Date.now(); return col.put(it) !== false; },
    async duplicate(id) {
      const it = lib.get(id); if (!it || !col) return null;
      const copy = Object.assign({}, it, { id: newId(), name: (it.name + ' copy').slice(0, LIMITS.nameMax), updated: Date.now() });
      col.put(copy); return copy;
    },
  };
  return lib;
}

/** Compact draft record of a session (autosave every 20 s). */
export async function makeDraft(session) {
  const meta = { objective: session.objective, tags: session.tags };
  const { code } = await encodeShare('arena', toDoc(session.arena, meta));
  return { v: 1, savedAt: Date.now(), name: session.arena.name, size: session.arena.size, objective: session.objective, tags: session.tags.slice(), id: session.id || null, code };
}
/** Restore a draft record to {arena, objective, tags, id}; null when it is unusable. */
export async function readDraft(d) {
  if (!d || typeof d !== 'object' || typeof d.code !== 'string') return null;
  try { const r = await importArena(d.code); return { arena: r.arena, objective: r.objective, tags: r.tags, id: d.id || null, savedAt: d.savedAt || 0, name: d.name || r.arena.name }; } catch (e) { return null; }
}
