// SoldierDoc: the Workshop's pure model (no DOM, no THREE). The CustomSoldier is treated as an immutable tree: every edit builds a new tree that shares
// the untouched subtrees (so 100 undo steps are cheap even with paint), and is recorded on a core/undo.js UndoStack with merging for slider drags.
//   point-buy math (100 points, per-stat caps), part slots <-> the 12 registry categories, randomise / mutate, the checks list with fix-it actions.
import { UndoStack } from '../../core/undo.js';
import { RNG, hashString } from '../../core/rng.js';
import {
  PART_REGISTRY, CATEGORIES, listParts, randomBlueprint, defaultBlueprint, PALETTES, SKIN_TONES, HAIR_COLORS, EYE_COLORS, METAL_KEYS, EMBLEM_IDS, BODY_TYPES, isPartUnlocked,
} from '../../content/era_ancient/blueprints.js';
import * as C from '../../content/era_ancient/custom.js';
import { defaultQuotes } from '../../content/era_ancient/custom_text.js';

export { C };

/** Workshop tabs -> blueprint slots -> registry categories (editors.md §2: the registry is the source of truth, nothing here lists a part). */
export const PART_TABS = [
  { id: 'head', label: 'Head', icon: 'crown', slots: [{ slot: 'head.helm', cat: 'helms', label: 'Helm' }, { slot: 'head.hair', cat: 'hair', label: 'Hair' }, { slot: 'head.face', cat: 'faces', label: 'Face' }] },
  { id: 'torso', label: 'Torso', icon: 'shield', slots: [{ slot: 'torso.tunic', cat: 'tunics', label: 'Tunic' }, { slot: 'torso.armor', cat: 'armors', label: 'Armour' }] },
  { id: 'shoulders', label: 'Shoulders', icon: 'laurel', slots: [{ slot: 'shoulders', cat: 'shoulders', label: 'Shoulders' }] },
  { id: 'legs', label: 'Legs', icon: 'horseshoe', slots: [{ slot: 'legs.armor', cat: 'legs', label: 'Legs' }, { slot: 'legs.skirt', cat: 'skirts', label: 'Skirt' }] },
  { id: 'cape', label: 'Cape', icon: 'flag', slots: [{ slot: 'cape', cat: 'capes', label: 'Cape' }] },
  { id: 'back', label: 'Back', icon: 'bow', slots: [{ slot: 'back', cat: 'backs', label: 'Back item' }] },
  { id: 'main', label: 'Main hand', icon: 'sword', slots: [{ slot: 'main', cat: 'mains', label: 'Main hand' }] },
  { id: 'off', label: 'Off-hand', icon: 'shield', slots: [{ slot: 'off', cat: 'offs', label: 'Off-hand' }] },
];
export const SLOT_DEFS = {}; for (const t of PART_TABS) for (const s of t.slots) SLOT_DEFS[s.slot] = s;

const slotPath = (slot) => ['blueprint'].concat(slot.split('.'));
export function getIn(o, path) { let c = o; for (const k of path) { if (c === null || c === undefined) return undefined; c = c[k]; } return c; }
/** Copy-on-write set: new objects along `path`, everything else shared. */
export function setIn(o, path, val) {
  if (!path.length) return val;
  const copy = Array.isArray(o) ? o.slice() : Object.assign({}, o);
  copy[path[0]] = setIn(o ? o[path[0]] : undefined, path.slice(1), val);
  return copy;
}
export const getSlot = (cs, slot) => getIn(cs, slotPath(slot));

// ------------------------------------------------------------------------------------------------ stats
export const statsTotal = C.statsTotal;
export const poolLeft = (stats) => C.STAT_POINTS - C.statsTotal(stats);
/** The value a slider can actually take: 0..cap and no more than the unspent points allow. */
export function clampStat(stats, key, v) {
  const others = C.statsTotal(stats) - (stats[key] || 0);
  return Math.max(0, Math.min(Math.round(v), C.STAT_CAPS[key], C.STAT_POINTS - others));
}
/** A random point spread: caps respected, total <= 100 (about `spend` points are spent). */
export function randomStats(rng, spend = 82) {
  const st = {}; for (const k of C.STAT_KEYS) st[k] = 0;
  let left = spend; const keys = C.STAT_KEYS.slice(); let guard = 0;
  while (left > 0 && guard++ < 400) { const k = keys[rng.int(0, keys.length - 1)]; if (st[k] < C.STAT_CAPS[k]) { const add = Math.min(left, C.STAT_CAPS[k] - st[k], rng.int(1, 4)); st[k] += add; left -= add; } }
  return st;
}

// ------------------------------------------------------------------------------------------------ the document
let seq = 0;
export class SoldierDoc {
  /** @param {object} cs a CustomSoldier  @param {{unlocked?:Set|Array, rng?:RNG}} o */
  constructor(cs, o = {}) {
    this.cs = cs; this.unlocked = o.unlocked; this.rng = o.rng || new RNG(Date.now() >>> 0);
    this.undo = new UndoStack(100); this.fns = []; this.savedRef = cs; this.notes = [];
  }
  onChange(fn) { this.fns.push(fn); return () => { const i = this.fns.indexOf(fn); if (i >= 0) this.fns.splice(i, 1); }; }
  _emit(kind) { for (const f of this.fns) f(this.cs, kind); }
  get dirty() { return this.cs !== this.savedRef; }
  markSaved() { this.savedRef = this.cs; this._emit('saved'); }
  /** Replace the whole soldier (load from the library, import, reset): clears the undo history. */
  load(cs, { saved = true } = {}) { this.cs = cs; if (saved) this.savedRef = cs; this.undo.clear(); this._emit('load'); }

  /** Apply `next` (a new tree) as one undoable step; `key` merges consecutive edits of the same control (slider drags) for 900 ms. */
  edit(label, next, key) {
    if (next === this.cs) return false;
    const before = this.cs, doc = this, t = Date.now();
    const cmd = { label, key, t, before, after: next,
      do() { doc.cs = this.after; doc._emit('edit'); },
      undo() { doc.cs = this.before; doc._emit('edit'); },
      merge(n) { if (key && n.key === key && n.t - this.t < 900) { this.after = n.after; this.t = n.t; return true; } return false; } };
    this.undo.exec(cmd); return true;
  }
  doUndo() { return this.undo.undo(); } doRedo() { return this.undo.redo(); }
  canUndo() { return this.undo.canUndo(); } canRedo() { return this.undo.canRedo(); }

  /** Abilities that stopped being legal after a weapon change are dropped; returns the names for a toast. */
  _reconcile(cs) {
    const legal = C.legalAbilityIds(cs.blueprint), keep = (cs.abilities || []).filter((a) => legal.indexOf(a) >= 0);
    const dropped = (cs.abilities || []).filter((a) => keep.indexOf(a) < 0);
    this.notes = dropped.map((a) => C.ABILITY_TEXT[a] ? C.ABILITY_TEXT[a].name : a);
    return dropped.length ? Object.assign({}, cs, { abilities: keep }) : cs;
  }

  // ---------------------------------------------------------------- parts and body
  setSlot(slot, id) {
    const e = PART_REGISTRY[SLOT_DEFS[slot].cat][id]; if (!e) return false;
    if (!isPartUnlocked(e, this.unlocked)) return false;
    let next = setIn(this.cs, slotPath(slot), id);
    if (slot === 'main') next = this._reconcile(next);
    return this.edit('Change ' + SLOT_DEFS[slot].label.toLowerCase(), next);
  }
  setBodyType(type) { if (!BODY_TYPES[type]) return false; return this.edit('Body type', setIn(this.cs, ['blueprint', 'body', 'type'], type)); }
  setHeight(h) { return this.edit('Height', setIn(this.cs, ['height'], Math.round(Math.max(C.HEIGHT_MIN, Math.min(C.HEIGHT_MAX, h)) * 100) / 100), 'height'); }
  setBodyColor(key, hex) { return this.edit('Change ' + key, setIn(this.cs, ['blueprint', 'body', key], hex.toLowerCase()), 'bc:' + key); }
  setEyes(hex) { return this.edit('Eye colour', setIn(this.cs, ['blueprint', 'head', 'eyes'], hex.toLowerCase())); }
  setColor(key, hex) { return this.edit('Colour: ' + key, setIn(this.cs, ['blueprint', 'colors', key], hex.toLowerCase()), 'col:' + key); }
  setMetal(m) { if (METAL_KEYS.indexOf(m) < 0) return false; return this.edit('Metal', setIn(this.cs, ['blueprint', 'colors', 'metal'], m)); }
  setEmblem(e) { if (EMBLEM_IDS.indexOf(e) < 0) return false; return this.edit('Emblem', setIn(this.cs, ['blueprint', 'emblem'], e)); }
  applyPalette(i) {
    const p = PALETTES[i]; if (!p) return false;
    const colors = Object.assign({}, this.cs.blueprint.colors, { primary: p.primary, secondary: p.secondary, trim: p.trim, cloth: p.cloth });
    return this.edit('Palette', setIn(this.cs, ['blueprint', 'colors'], colors));
  }

  // ---------------------------------------------------------------- stats and abilities
  setStat(key, v) {
    const val = clampStat(this.cs.stats, key, v);
    this.edit('Stat: ' + key, setIn(this.cs, ['stats', key], val), 'stat:' + key);
    return val;
  }
  resetStats() { const z = {}; for (const k of C.STAT_KEYS) z[k] = 0; return this.edit('Reset points', setIn(this.cs, ['stats'], z)); }
  toggleAbility(id) {
    const cur = this.cs.abilities || [], has = cur.indexOf(id) >= 0;
    if (!has && (cur.length >= C.MAX_ABILITIES || C.legalAbilityIds(this.cs.blueprint).indexOf(id) < 0)) return false;
    return this.edit(has ? 'Drop ability' : 'Add ability', setIn(this.cs, ['abilities'], has ? cur.filter((a) => a !== id) : cur.concat([id])));
  }
  setAI(style) { if (C.AI_STYLES.indexOf(style) < 0) return false; return this.edit('AI style', setIn(this.cs, ['ai'], style)); }

  // ---------------------------------------------------------------- personality
  setName(n) { const name = String(n).slice(0, C.NAME_MAX); let next = setIn(this.cs, ['name'], name); next = setIn(next, ['blueprint', 'name'], name || 'Recruit'); return this.edit('Rename', next, 'name'); }
  setCatch(t) { return this.edit('Catchphrase', setIn(this.cs, ['text', 'catch'], String(t).slice(0, C.QUOTE_MAX)), 'catch'); }
  setDeath(i, t) { const d = (this.cs.text.deaths || []).slice(); d[i] = String(t).slice(0, C.QUOTE_MAX); return this.edit('Last words', setIn(this.cs, ['text', 'deaths'], d), 'death:' + i); }
  setPitch(p) { return this.edit('Voice pitch', setIn(this.cs, ['text', 'pitch'], Math.round(Math.max(C.PITCH_MIN, Math.min(C.PITCH_MAX, p)) * 100) / 100), 'pitch'); }
  /** New catchphrase and three last words (seeded from the rng, so Undo brings the old ones back). */
  surpriseQuotes() {
    const q = defaultQuotes('q' + this.rng.int(0, 1e9));
    return this.edit('New quotes', setIn(this.cs, ['text'], Object.assign({}, this.cs.text, { catch: q.catch, deaths: q.deaths })));
  }
  newName() { return this.setName(C.makeName(this.rng)); }

  // ---------------------------------------------------------------- paint
  setPaint(paint) { return this.edit('Paint', setIn(this.cs, ['blueprint', 'paint'], paint || {})); }
  clearPaint(pid) {
    if (!pid) return this.setPaint({});
    const p = Object.assign({}, this.cs.blueprint.paint || {}); delete p[pid]; return this.setPaint(p);
  }

  // ---------------------------------------------------------------- randomise / mutate / reset
  /** A whole new look and point spread (name, quotes and id are kept). Paint belongs to the old parts, so it is cleared. */
  randomize() {
    const r = this.rng, bp = randomBlueprint(r, { unlocked: this.unlocked, name: this.cs.name });
    bp.id = this.cs.blueprint.id; bp.name = this.cs.name; bp.paint = {};
    let next = Object.assign({}, this.cs, { blueprint: bp, stats: randomStats(r), height: +(0.92 + r.next() * 0.26).toFixed(2) });
    next.abilities = []; next = this._reconcile(next);
    const legal = C.legalAbilityIds(bp), want = r.int(0, 2);
    const pool = legal.slice(); const picks = []; for (let i = 0; i < want && pool.length; i++) picks.push(pool.splice(r.int(0, pool.length - 1), 1)[0]);
    next.abilities = picks; next.ai = r.pick(C.AI_STYLES);
    return this.edit('Randomise', next);
  }
  /** Change two to four things: swap parts, nudge colours, move points. */
  mutate() {
    const r = this.rng; let cs = this.cs; const n = r.int(2, 4);
    const unlocked = this.unlocked;
    for (let i = 0; i < n; i++) {
      const kind = r.int(0, 3);
      if (kind === 0) {
        const slot = r.pick(Object.keys(SLOT_DEFS)); const opts = listParts(SLOT_DEFS[slot].cat, unlocked).filter((p) => !p.locked); if (opts.length) cs = setIn(cs, slotPath(slot), r.pick(opts).id);
      } else if (kind === 1) {
        const key = r.pick(['primary', 'secondary', 'trim', 'cloth']); const pal = r.pick(PALETTES); cs = setIn(cs, ['blueprint', 'colors', key], pal[key]);
      } else if (kind === 2) {
        const from = r.pick(C.STAT_KEYS.filter((k) => cs.stats[k] > 0)), to = r.pick(C.STAT_KEYS.filter((k) => cs.stats[k] < C.STAT_CAPS[k]));
        if (from && to && from !== to) { const m = Math.min(r.int(1, 4), cs.stats[from], C.STAT_CAPS[to] - cs.stats[to]); cs = setIn(setIn(cs, ['stats', from], cs.stats[from] - m), ['stats', to], cs.stats[to] + m); }
      } else {
        const sk = r.pick(['skin', 'hair']); cs = setIn(cs, ['blueprint', 'body', sk], sk === 'skin' ? r.pick(SKIN_TONES) : r.pick(HAIR_COLORS));
      }
    }
    cs = this._reconcile(cs);
    return this.edit('Mutate', cs);
  }
  /** Back to the starting look and points (name, quotes and id stay). */
  reset() {
    const fresh = C.newSoldier(new RNG(1), { id: this.cs.id, name: this.cs.name });
    fresh.blueprint.id = this.cs.blueprint.id; fresh.text = this.cs.text;
    return this.edit('Reset', fresh);
  }
}

// ------------------------------------------------------------------------------------------------ the checks list
/**
 * Everything wrong or worth knowing about the soldier, with fix-it actions the Workshop turns into buttons.
 * `info` = compileCustom() result for the weapon trim; `unlocked` = the progress set; returns [{id, level:'error'|'warn'|'info', text, fix?:{label, action, arg?}}].
 */
export function checkIssues(cs, info, unlocked) {
  const out = [], bp = cs.blueprint;
  if (!cs.name || !cs.name.trim()) out.push({ id: 'name', level: 'error', text: 'This soldier has no name. Even a goat has a name.', fix: { label: 'Generate one', action: 'newName' } });
  else if (cs.name.length > C.NAME_MAX) out.push({ id: 'name', level: 'error', text: `The name is ${cs.name.length} characters; the limit is ${C.NAME_MAX}.`, fix: { label: 'Generate one', action: 'newName' } });
  for (const slot of Object.keys(SLOT_DEFS)) {
    const id = getSlot(cs, slot), e = PART_REGISTRY[SLOT_DEFS[slot].cat][id];
    if (e && !isPartUnlocked(e, unlocked)) out.push({ id: 'locked:' + slot, level: 'error', text: `${e.name} is locked. ${e.unlock.hint}`, fix: { label: 'Swap it out', action: 'swapLocked', arg: slot } });
  }
  const main = PART_REGISTRY.mains[bp.main];
  if (main && main.meta.twoHanded && bp.off !== 'none') out.push({ id: 'twohand', level: 'warn', text: `The ${main.name} needs both hands, so the ${PART_REGISTRY.offs[bp.off] ? PART_REGISTRY.offs[bp.off].name : 'off-hand item'} stays home.`, fix: { label: 'Drop the off-hand', action: 'dropOff' } });
  if (info && main && main.meta.len && info.compiled.weaponLen < main.meta.len && main.meta.style !== 'shoot' && !main.meta.noClamp) {
    const need = pointsToKeepWeapon(cs);
    out.push({ id: 'trim', level: 'info', text: `Your reach trims the ${main.name} from ${main.meta.len} to ${info.compiled.weaponLen} voxels. ${need ? `${need} more reach point${need > 1 ? 's' : ''} would keep it${need > 0 && info.compiled.weaponLen < main.meta.len ? ' longer' : ''}.` : 'More reach points keep it longer.'}`, fix: need && poolLeft(cs.stats) >= need && cs.stats.range + need <= C.STAT_CAPS.range ? { label: `+${need} reach`, action: 'addRange', arg: need } : undefined });
  }
  if (info && info.def.cost > 0 && info.def.clamped) out.push({ id: 'clamp', level: 'info', text: 'The treasury capped how much power one drachma may buy, so this soldier costs more than his stats alone would.' });
  const eff = C.effectiveScale(bp.body.type, cs.height), raw = (BODY_TYPES[bp.body.type] || BODY_TYPES.average).map((x) => x * cs.height);
  if (eff.some((e, i) => Math.abs(e - raw[i]) > 1e-6)) out.push({ id: 'scale', level: 'info', text: `Size is held between ${C.SCALE_MIN} and ${C.SCALE_MAX}: a ${bp.body.type} soldier at ${cs.height.toFixed(2)} measures ${eff.map((x) => x.toFixed(2)).join(' x ')}.` });
  return out;
}
/** How many extra reach points keep the weapon at its natural length (0 when it already is, or none would help). */
export function pointsToKeepWeapon(cs) {
  const main = PART_REGISTRY.mains[cs.blueprint.main]; if (!main || !main.meta.len) return 0;
  const cur = C.compileCustom(cs).compiled.weaponLen; if (cur >= main.meta.len) return 0;
  for (let n = 1; n <= C.STAT_CAPS.range - cs.stats.range; n++) { const t = setIn(cs, ['stats', 'range'], cs.stats.range + n); if (C.compileCustom(t).compiled.weaponLen >= main.meta.len) return n; }
  return 0;
}
export { listParts, CATEGORIES, PALETTES, SKIN_TONES, HAIR_COLORS, EYE_COLORS, METAL_KEYS, EMBLEM_IDS, BODY_TYPES };
