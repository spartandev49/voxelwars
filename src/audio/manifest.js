// Asset catalog: normalises assets/manifest.json (any of the shapes the asset pipeline emits) and resolves cue "pick" selectors.
//
// Manifest shape (see docs/spec/audio.md; extra fields are ignored, missing ones defaulted):
//   { v:1, sfx:[Entry], music:[Entry], vfx:[...] }   (a map {id: Entry} per kind is accepted too)
//   Entry { id, file|path|url, category, tags:[...], core?:bool, dur?, size?, loop?, loopStart?, loopEnd?,
//           mood|moods, theme|themes, energy?, bpm?, gainDb?, fade_out?, loop_check? , author, title, source, license, notes }
//
// Selector grammar used by cue families (`pick: [ ... ]`, results are the UNION of all positive selectors minus all '!' ones):
//   'sword_hit'        id prefix: matches id === 'sword_hit' or id starting 'sword_hit_'
//   '#footstep'        tag
//   '@blade'           category
//   'a&#b'             AND of terms (e.g. '@foley&#grass')
//   '!blade_clash_6'   exclusion
import { clamp } from './util.js';

const moodBase = (m) => String(m || '').toLowerCase().replace(/^battle[_-].*/, 'battle');

/** accepts ['audio/sfx/a.mp3', 'assets/audio/sfx/a.mp3', ...] or {path: source} or a Set; stores the canonical assets/... form */
function normPublished(p) {
  const keys = p instanceof Set || Array.isArray(p) ? [...p] : Object.keys(p), out = new Set();
  for (const k of keys) { const s = String(k).replace(/^\.?\//, ''); out.add(/^assets\//.test(s) ? s : 'assets/' + s); }
  return out;
}
function arr(v) { return Array.isArray(v) ? v : (v === undefined || v === null || v === '' ? [] : [v]); }

export class Catalog {
  /**
   * @param {object} manifest the ledger. @param {Iterable<string>|object|null} published optional list of the files that are really
   * published beside the page (window.__VW_FILES__, written by tools/build.mjs): ledger rows whose file is not in it are skipped (never
   * requested, so no 404 reaches the console) and recorded in `catalog.missing` / diagnostics.
   */
  constructor(manifest, published = null) {
    this.sfx = []; this.music = []; this.vfx = []; this.byId = new Map(); this._cache = new Map(); this.missing = [];
    this.hasManifest = false;
    this.published = published ? normPublished(published) : null;
    if (manifest && typeof manifest === 'object') this.ingest(manifest);
  }
  ingest(m) {
    for (const kind of ['sfx', 'music', 'vfx']) {
      let list = m[kind]; if (!list) continue;
      if (!Array.isArray(list)) list = Object.keys(list).map((id) => Object.assign({ id }, list[id]));
      for (const raw of list) {
        const e = this._norm(kind, raw);
        if (!e) continue;
        if (this.published && kind !== 'vfx' && !this.published.has(e.url)) { this.missing.push({ id: e.id, kind, url: e.url }); continue; }
        this[kind].push(e); this.byId.set(kind + ':' + e.id, e);
      }
    }
    this.hasManifest = this.sfx.length + this.music.length > 0;
    this._cache.clear();
  }
  _norm(kind, r) {
    if (!r || typeof r !== 'object') return null;
    const rel = r.path || r.file || r.url || '';
    const base = String(rel).split('/').pop().replace(/\.[a-z0-9]+$/i, '');
    const id = String(r.id || base);
    if (!id) return null;
    let url = r.url || '';
    if (!url) {
      if (!rel) return null;
      // the ledger stores `path` relative to assets/ (audio/sfx/x.mp3); a bare `file` lives in assets/audio/<kind>/
      url = /^assets\//.test(rel) ? rel : /^(audio|vfx)\//.test(rel) ? `assets/${rel}` : `assets/${kind === 'vfx' ? 'vfx' : 'audio/' + kind}/${rel}`;
    }
    const tags = arr(r.tags).map((t) => String(t).toLowerCase());
    const moodsRaw = arr(r.moods).concat(arr(r.mood));
    const moods = [...new Set(moodsRaw.map(moodBase))];
    let energy = r.energy || '';
    for (const m of moodsRaw) { const mm = /^battle[_-](low|mid|high)$/.exec(String(m).toLowerCase()); if (mm) energy = mm[1]; }
    const lc = r.loop_check || r.loopCheck || null;
    const fadeOut = Number(r.fade_out ?? r.fadeOut ?? 0) || 0;
    // the ledger's notes carry the seam metrics: "end-vs-start RMS dB -38.56" = the tail was faded out in the file
    const nm = /end-vs-start RMS dB (-?\d+(?:\.\d+)?)/.exec(String(r.notes || '')); const endVsStart = nm ? Number(nm[1]) : NaN;
    const e = {
      id, kind, url, category: String(r.category || r.cat || '').toLowerCase(), tags, tagSet: new Set(tags),
      core: !!r.core, dur: Number(r.dur ?? r.duration ?? 0) || 0, size: Number(r.size || 0) || 0,
      loop: r.loop === true || (lc && lc.loop === true && r.loop !== false),
      loopStart: r.loopStart !== undefined ? Number(r.loopStart) : undefined, loopEnd: r.loopEnd !== undefined ? Number(r.loopEnd) : undefined,
      moods, themes: arr(r.themes).concat(arr(r.theme)).map((t) => String(t).toLowerCase()), energy: String(energy).toLowerCase(),
      bpm: Number(r.bpm || 0) || 0, gainDb: Number(r.gainDb ?? r.gain_db ?? 0) || 0, lufs: Number(r.lufs ?? r.integratedLoudness ?? NaN),
      // a baked-in fade-out means the tail is already silent: the crossfade loop must not fade it a second time
      bakedFade: fadeOut >= 0.8 || (lc && Number(lc.tail_vs_body_db) < -12) || endVsStart < -12 || false,
      license: r.license || r.licence || '', author: r.author || '', title: r.title || '', source: r.source || r.source_url || '',
    };
    return e;
  }
  /** Entries of `kind` matching the union of `picks` (see grammar above). Cached, order = manifest order. */
  select(picks, kind = 'sfx') {
    const key = kind + '|' + picks.join('|');
    const hit = this._cache.get(key); if (hit) return hit;
    const pos = [], neg = [];
    for (const p of picks) (p[0] === '!' ? neg : pos).push(parseSel(p[0] === '!' ? p.slice(1) : p));
    const out = [];
    for (const e of this[kind]) {
      let ok = false;
      for (let i = 0; i < pos.length && !ok; i++) ok = matches(e, pos[i]);
      if (!ok) continue;
      for (let i = 0; i < neg.length; i++) if (matches(e, neg[i])) { ok = false; break; }
      if (ok) out.push(e);
    }
    this._cache.set(key, out);
    return out;
  }
  get(id, kind = 'sfx') { return this.byId.get(kind + ':' + id) || null; }
}

function parseSel(s) { return s.split('&').map((t) => (t[0] === '#' ? { k: 'tag', v: t.slice(1).toLowerCase() } : t[0] === '@' ? { k: 'cat', v: t.slice(1).toLowerCase() } : { k: 'id', v: t.toLowerCase() })); }
function matches(e, terms) {
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    if (t.k === 'tag') { if (!e.tagSet.has(t.v)) return false; }
    else if (t.k === 'cat') { if (e.category !== t.v) return false; }
    else if (!(e.id === t.v || e.id.startsWith(t.v + '_'))) return false;
  }
  return true;
}

/** Decoded-PCM memory ceiling in bytes per quality tier (spec/audio.md section 1). */
export const PCM_CEILING_MB = { potato: 40, papyrus: 80, marble: 160, olympian: 240 };
export const pcmCeiling = (tier) => (PCM_CEILING_MB[tier] || PCM_CEILING_MB.marble) * 1024 * 1024;

/** Lazy-load group of an entry: ui+combat first, then voices/animals, then siege/fx, then foley/ambience. */
export const GROUP_ORDER = ['ui', 'combat', 'voice', 'siege', 'misc'];
const CAT_GROUP = {
  ui: 'ui', jingle: 'ui', blade: 'combat', shield: 'combat', pierce: 'combat', bow: 'combat', impact: 'combat', death: 'combat',
  voice: 'voice', crowd: 'voice', horn: 'voice', drum: 'voice', animal: 'voice',
  siege: 'siege', destruction: 'siege', fire: 'siege', magic: 'siege',
};
export function groupOf(e) {
  if (CAT_GROUP[e.category]) return CAT_GROUP[e.category];
  const id = e.id;
  if (/^(ui_|countdown_|jingle_)/.test(id)) return 'ui';
  return 'misc';
}
export { clamp };
