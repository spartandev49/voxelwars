// Workshop / Painter plumbing that touches the app context: campaign unlocks, the autosaved draft, the roster, the "Use in battle" setup.
// Every member of ctx that the contract marks "not in code yet" (progress, draft) has a fallback on the raw store, so the editors work today and keep working when COORD adds them.
import { UNLOCK_MISSIONS, registerCustom, LIBRARY_CAP } from '../../content/era_ancient/custom.js';

const guard = (fn, d) => { try { const v = fn(); return v === undefined ? d : v; } catch (e) { return d; } };

/** Set of unlocked part keys (silly_helms, silly_weapons, wings): progress.unlocks (array | object | Set), else derived from the campaign stars (a mission cleared = its key). */
export function unlockedKeys(ctx) {
  const keys = new Set();
  const add = (v) => { if (!v) return; if (typeof v.forEach === 'function' && !Array.isArray(v)) v.forEach((x, k) => keys.add(typeof x === 'string' ? x : k)); else if (Array.isArray(v)) v.forEach((x) => typeof x === 'string' && keys.add(x)); else if (typeof v === 'object') for (const k of Object.keys(v)) if (v[k]) keys.add(k); };
  const prog = ctx.save && ctx.save.progress;
  add(guard(() => prog && prog.get('unlocks'), null)); add(guard(() => prog && prog.get('unlockedParts'), null));
  const raw = guard(() => ctx.save.store.get('progress', null), null);
  if (raw && typeof raw === 'object') { add(raw.unlocks); add(raw.unlockedParts); }
  const stars = guard(() => (prog && prog.get('stars')) || (raw && raw.stars), null);
  if (stars && typeof stars === 'object') for (const k of Object.keys(UNLOCK_MISSIONS)) if ((+stars[UNLOCK_MISSIONS[k]] || 0) > 0) keys.add(k);
  return keys;
}

/** The draft channel for an editor: ctx.save.draft(editor) when COORD has it, else the raw store key `draft.<editor>` (= vw.draft.<editor>). */
export function draftOf(ctx, editor) {
  const d = guard(() => ctx.save.draft && ctx.save.draft(editor), null);
  if (d && typeof d.load === 'function') return d;
  const store = guard(() => ctx.save.store, null), key = 'draft.' + editor;
  return {
    load: () => (store ? guard(() => store.get(key, null), null) : null),
    save: (data) => { if (store) guard(() => store.set(key, data), false); },
    clear: () => { if (store) guard(() => store.remove(key), null); },
  };
}

/** Roster helpers over ctx.save.soldiers (a Collection, cap 24). */
export const roster = {
  list: (ctx) => guard(() => ctx.save.soldiers.list(), []),
  get: (ctx, id) => guard(() => ctx.save.soldiers.get(id), null),
  /** put with the 24 cap enforced here (the Collection would silently drop the oldest). Returns {ok, reason?} */
  put(ctx, item) {
    const cur = roster.list(ctx), exists = cur.some((x) => x.id === item.id);
    if (!exists && cur.length >= LIBRARY_CAP) return { ok: false, reason: 'full' };
    const ok = guard(() => ctx.save.soldiers.put(item), true);
    registerCustom(ctx.content, item);
    purgeSkin(ctx, item.id);
    return { ok: ok !== false };
  },
  remove(ctx, id) { guard(() => ctx.save.soldiers.remove(id), null); const defs = ctx.content && ctx.content.defs; if (defs) { const d = Object.getOwnPropertyDescriptor(defs, id); if (d && !d.enumerable) delete defs[id]; } purgeSkin(ctx, id); },
};

/** An edited soldier keeps its id, but the battle view caches skins per def id: drop the stale one so the next battle shows the new look. */
export function purgeSkin(ctx, id) {
  const view = guard(() => ctx.game && ctx.game.view, null); if (!view) return;
  if (typeof view.forget === 'function') { guard(() => view.forget(id), null); return; }
  const skins = view.skins; if (!skins || typeof skins.get !== 'function') return;
  for (const key of [id, 'c:' + id]) { const r = skins.get(key); if (r) { guard(() => r.skin.dispose(), null); skins.delete(key); } }
}

/**
 * "Use in battle": a quick placement on a small arena with a squad of the soldier already standing in zone A and a matching enemy in zone B.
 * Resolves true when the placement screen was entered (the app's game->router glue shows it).
 */
export async function testInBattle(ctx, cs, def) {
  const g = ctx.game; if (!g || typeof g.begin !== 'function') return false;
  const n = 8, squadCost = Math.max(400, Math.round(def.cost * n));
  const foes = ['persians', 'barbarians', 'romans', 'egyptians', 'carthaginians']; let h = 0; for (let i = 0; i < cs.id.length; i++) h = (h * 31 + cs.id.charCodeAt(i)) >>> 0;
  const setup = g.newSetup('quick', {
    arena: { presetId: 'marathon', size: 'small', seed: 1000 + (h % 900) },
    rules: { budget: Math.max(3000, squadCost * 2) },
    armies: { A: { faction: 'hellenes', placements: [], budget: Math.max(3000, squadCost * 2) }, B: { faction: foes[h % foes.length], placements: [], budget: Math.round(squadCost * 1.15) } },
  });
  await g.begin(setup);
  registerCustom(ctx.content, cs);
  const zone = guard(() => g.zones().A, null);
  g.tools.setBrush({ mode: 'block', defId: cs.id, team: 0, count: n, formation: 'block', order: 'advance', mirror: false });
  if (zone) g.placeAt(zone.x, zone.z);
  guard(() => g.tools.autoFill(1, { faction: setup.armies.B.faction }), null);
  guard(() => g.tools.setBrush({ mode: 'single', defId: cs.id }), null);
  return true;
}
