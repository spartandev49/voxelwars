// Helpers shared by the menu-side screens (quick, placement, codex, settings...). Pure functions + tiny DOM bits; no state.
import * as K from '../kit.js';
import { FACTION_ORDER } from '../unitinfo.js';

export const BUDGETS = { skirmish: 3000, battle: 8000, war: 20000, epic: 40000 };
export const QUALITY_CAPS = { potato: { units: 100, debris: 1200 }, papyrus: { units: 200, debris: 3500 }, marble: { units: 300, debris: 8000 }, olympian: { units: 400, debris: 16000 } };
export const AI_STYLES = ['balanced', 'rush', 'ranged', 'elite', 'chaos', 'counter'];

export const safe = (fn, d) => { try { const v = fn(); return v === undefined ? d : v; } catch (e) { return d; } };

export function qualityCaps(ctx) {
  const q = safe(() => ctx.settings.get('quality'), 'marble');
  return Object.assign({ id: q }, QUALITY_CAPS[q] || QUALITY_CAPS.marble);
}
export function totalStars(ctx) {
  const s = safe(() => ctx.save.progress.get('stars'), null);
  return s ? Object.keys(s).reduce((a, k) => a + (+s[k] || 0), 0) : 0;
}
export function factionIds(ctx) {
  const f = ctx.content.factions || {};
  const ids = Object.keys(f);
  return FACTION_ORDER.filter((x) => ids.indexOf(x) >= 0).concat(ids.filter((x) => FACTION_ORDER.indexOf(x) < 0));
}
export function unitsOf(ctx) {
  return safe(() => ctx.content.unitList(), Object.keys(ctx.content.units).map((k) => ctx.content.units[k]));
}
export function timeName(T, hours) {
  const h = ((hours % 24) + 24) % 24;
  const names = T.timeNames;
  const idx = h < 3 ? 0 : h < 6 ? 1 : h < 8 ? 2 : h < 11 ? 3 : h < 14 ? 4 : h < 17 ? 5 : h < 20 ? 6 : 7;
  return names[idx];
}
/** Put an arena thumbnail into an <img>; accepts a sync data URL or a Promise; falls back to a themed gradient box. */
export function setThumb(img, ctx, id, fallbackEl) {
  let v = '';
  try { v = ctx.content.arenaThumb(id); } catch (e) { v = ''; }
  const apply = (src) => { if (src) { img.src = src; img.classList.remove('vw-hide'); if (fallbackEl) fallbackEl.classList.add('vw-hide'); } else { img.classList.add('vw-hide'); if (fallbackEl) fallbackEl.classList.remove('vw-hide'); } };
  if (v && typeof v.then === 'function') v.then(apply, () => apply('')); else apply(v);
}
export function fmtMoney(n) { return K.fmtNum(n); }
export function todayKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function seenHint(ctx, key) { return !!safe(() => (ctx.settings.get('seenHints') || {})[key], false); }
export function setSeenHint(ctx, key, v) { const cur = Object.assign({}, safe(() => ctx.settings.get('seenHints'), {}) || {}); cur[key] = v; ctx.settings.set('seenHints', cur); }
