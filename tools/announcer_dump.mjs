#!/usr/bin/env node
// announcer_dump: deterministic dump of the Ancient humor text pools that the three new eras may reuse, and a verifier for the
// agent-read classification that sits beside them (docs/eras/design/ancient_announcer_classification.csv).
//
// Usage:
//   node tools/announcer_dump.mjs [--surface announcer|tips|loading|credits|all] [--format jsonl|tsv|json] [--no-follow]
//   node tools/announcer_dump.mjs --summary                       counts per surface and per announcer category, plus a SHA-256 of the dump
//   node tools/announcer_dump.mjs --report [--csv path] [--partition]   markdown tables derived from the classification CSV (the numbers in the .md are this output)
//   node tools/announcer_dump.mjs --crosscheck [--csv path]   lexicon second opinion: neutral rows that hit Ancient nouns, ancient rows that hit none
//   node tools/announcer_dump.mjs --gags [--csv path]   running-gag table (announcer rows by gag and class)
//   node tools/announcer_dump.mjs --list <tips|loading|credits|announcer> [--reusable] [--csv path]   markdown table of one surface with its class and rewrite
//   node tools/announcer_dump.mjs --skeletons [--csv path]   approximate skeleton-diversity of the reusable pool (VF near-duplicate lint input)
//   node tools/announcer_dump.mjs --examples <neutral|ancient|convertible> [n] [--csv path]   deterministic stride sample of n announcer rows of a class (default 20)
//   node tools/announcer_dump.mjs --selftest [--csv path]   negative controls: 17 mutants of the CSV must each be rejected by --verify, the baseline must pass
//   node tools/announcer_dump.mjs --verify [path/to/classification.csv]
//        checks the classification CSV against the live pools: every id exactly once, no unknown id, class in {neutral, ancient, convertible},
//        non-empty reason, every convertible has a rewrite (<= 22 words, tips <= 18, balanced braces, only slots/filters of the announcer vocabulary, no slot
//        outside the always-available set that the original did not already use), only non-follow templates are classified (follow beats inherit
//        their head), counts printed. Exit 1 on any failure.
//
// Row shape (all surfaces): { id, surface, category, voice, text, cond, follow, slots, weight, once, cd, chain, chainOf }
//   announcer  id/cat/who/text/cond/follow/weight/once/cd/chain come from TEMPLATES (src/content/era_ancient/humor/announcer.js)
//   tips       id 'tip_*', category 'tips', voice 'tip'; kind/topic live in cond.kind / cond.topic (informational)
//   loading    id 'loading_NN' (1-based position in LOADING_LINES), category 'loading', voice 'loading'
//   credits    id 'credits_NN' (STUDIO_CREDITS, text 'role | name') and 'credits_fN' (CREDITS_FOOTER), category 'credits', voice 'credits'
// Order is source order; output has no timestamps, so two runs are byte-identical (the SHA-256 in --summary is the check).
// Pure read: imports content modules only, writes nothing.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { TEMPLATES } from '../src/content/era_ancient/humor/announcer.js';
import { TIPS } from '../src/content/era_ancient/humor/tips.js';
import { LOADING_LINES } from '../src/content/era_ancient/humor/ui_text.js';
import { STUDIO_CREDITS, CREDITS_FOOTER } from '../src/content/era_ancient/humor/credits_text.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_CSV = path.join(root, 'docs/eras/design/ancient_announcer_classification.csv');

// Same grammar as announcer.js TOKEN_RE; kept local so the tool also works if the engine is era-ized and renames its export.
const TOKEN_RE = /\{([a-z0-9_]+)(?::([A-Za-z0-9_]+))?(?:\|([A-Za-z]+))?\}/g;
export const SLOT_NAMES = ['unit', 'unit2', 'killer', 'team', 'team2', 'faction', 'faction2', 'arena', 'mission', 'n', 'streak', 'ratio', 'flank', 'pct', 'prop',
  'secs', 'mins', 'nth', 'theirs', 'lifetime'];
export const FILTERS = ['pl', 'a', 'A', 'the', 'The', 'cap', 'up', 'lc', 'ord', 'words', 'num'];
export const CLASSES = ['neutral', 'ancient', 'convertible'];

export function slotsOf(text) {
  const out = [];
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text)) !== null) out.push(m[0]);
  return out;
}

export function allRows() {
  const rows = [];
  const byId = new Map();
  for (const t of TEMPLATES) byId.set(t.id, t);
  const chainOf = new Map();
  for (const t of TEMPLATES) if (t.chain) for (const f of t.chain) chainOf.set(f, t.id);
  for (const t of TEMPLATES) {
    rows.push({
      id: t.id, surface: 'announcer', category: t.cat, voice: t.who, text: t.text, cond: t.cond || null, follow: !!t.follow, slots: slotsOf(t.text),
      weight: t.weight === undefined ? null : t.weight, once: !!t.once, cd: t.cd === undefined ? null : t.cd, chain: t.chain || null, chainOf: chainOf.get(t.id) || null,
    });
  }
  for (const t of TIPS) {
    rows.push({ id: t.id, surface: 'tips', category: 'tips', voice: 'tip', text: t.text, cond: { kind: t.kind, topic: t.topic }, follow: false, slots: slotsOf(t.text), weight: null, once: false, cd: null, chain: null, chainOf: null });
  }
  LOADING_LINES.forEach((s, i) => {
    rows.push({ id: 'loading_' + String(i + 1).padStart(2, '0'), surface: 'loading', category: 'loading', voice: 'loading', text: s, cond: null, follow: false, slots: slotsOf(s), weight: null, once: false, cd: null, chain: null, chainOf: null });
  });
  STUDIO_CREDITS.forEach((c, i) => {
    const text = c.role + ' | ' + c.name;
    rows.push({ id: 'credits_' + String(i + 1).padStart(2, '0'), surface: 'credits', category: 'credits', voice: 'credits', text, cond: null, follow: false, slots: slotsOf(text), weight: null, once: false, cd: null, chain: null, chainOf: null });
  });
  CREDITS_FOOTER.forEach((s, i) => {
    rows.push({ id: 'credits_f' + (i + 1), surface: 'credits', category: 'credits', voice: 'credits', text: s, cond: null, follow: false, slots: slotsOf(s), weight: null, once: false, cd: null, chain: null, chainOf: null });
  });
  return rows;
}

// ---- minimal RFC-4180 CSV reader/writer (no dependency) ----
export function parseCsv(src) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch === '\r') { /* skip */ } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
export const csvCell = (s) => (/[",\n\r]/.test(String(s)) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s));

function emit(rows, format) {
  if (format === 'json') return JSON.stringify(rows, null, 1) + '\n';
  if (format === 'tsv') {
    const head = ['id', 'surface', 'category', 'voice', 'follow', 'slots', 'cond', 'text'].join('\t');
    return head + '\n' + rows.map((r) => [r.id, r.surface, r.category, r.voice, r.follow ? 'follow' : '', r.slots.join(' '), r.cond ? JSON.stringify(r.cond) : '', r.text.replace(/\t/g, ' ')].join('\t')).join('\n') + '\n';
  }
  return rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
}

function summary(rows) {
  const per = {};
  for (const r of rows) {
    const k = r.surface === 'announcer' ? 'announcer:' + r.category : r.surface;
    per[k] = per[k] || { total: 0, follow: 0 };
    per[k].total++;
    if (r.follow) per[k].follow++;
  }
  const by = (s) => rows.filter((r) => r.surface === s);
  const ann = by('announcer');
  const lines = [];
  lines.push('announcer templates: ' + ann.length + ' (non-follow ' + ann.filter((r) => !r.follow).length + ', follow ' + ann.filter((r) => r.follow).length + ')');
  lines.push('voices: ' + ['brutus', 'plato', 'cassandra'].map((v) => v + ' ' + ann.filter((r) => r.voice === v).length).join(', '));
  lines.push('tips: ' + by('tips').length + '  loading: ' + by('loading').length + '  credits: ' + by('credits').length);
  lines.push('categories: ' + new Set(ann.map((r) => r.category)).size);
  for (const k of Object.keys(per)) lines.push('  ' + k.padEnd(28) + String(per[k].total).padStart(4) + (per[k].follow ? '  (follow ' + per[k].follow + ')' : ''));
  const h = crypto.createHash('sha256').update(emit(rows, 'jsonl')).digest('hex');
  lines.push('sha256(jsonl of all surfaces): ' + h);
  return lines.join('\n') + '\n';
}


const words = (t) => t.toLowerCase().replace(/\{[^}]*\}/g, ' ').split(/[^a-z0-9]+/).filter(Boolean);
export function jaccard(a, b) {
  const sh = (t) => { const w = words(t), o = new Set(); for (let i = 0; i + 3 <= w.length; i++) o.add(w.slice(i, i + 3).join(' ')); return o; };
  const A = sh(a), B = sh(b);
  if (!A.size && !B.size) return 1;
  let i = 0;
  for (const x of A) if (B.has(x)) i++;
  return i / (A.size + B.size - i);
}

// Route kind per announcer category (agent read of announcer.js createAnnouncer event routes, see the .md section 3.4).
//   generic   the sim event exists in any era (a kill, a rout, a lead change, a volley, a hazard...), so neutral lines are reachable
//   ancient   the trigger is an Ancient-only unit, ability or gag; a new era supplies its own signature categories instead
//   melee     brace: needs a spear-wall-versus-charge mechanic, so Ancient and Medieval only (Modern and Sci-Fi drop it)
//   mission   campaign_<missionId>: three lines per mission, always era-new
export const ROUTE = {
  battle_start: 'generic', first_blood: 'generic', kill_streak: 'generic', hero_down: 'generic', friendly_fire: 'generic', rout: 'generic', charge: 'generic',
  brace: 'melee', volley: 'generic', boulder: 'generic', misfire: 'generic', misaim: 'ancient', chicken: 'ancient', goat: 'ancient', philosopher: 'ancient',
  senator: 'ancient', trojan: 'ancient', medusa: 'ancient', elephant: 'ancient', kick: 'ancient', immortal: 'ancient', throne: 'ancient', ability: 'ancient',
  hazard: 'generic', lead_change: 'generic', comeback: 'generic', big_swing: 'generic', army_low: 'generic', stalemate: 'generic', zeus: 'ancient',
  victory: 'generic', defeat: 'generic', timeout: 'generic', mass_death: 'generic', prop_destroyed: 'generic', god_power: 'generic', wave: 'generic', idle_filler: 'generic',
};
const routeOf = (c) => (c.indexOf('campaign_') === 0 ? 'mission' : ROUTE[c] || 'generic');
const TAGS = ['gag:terms', 'gag:wall', 'gag:grapes', 'gag:pizza', 'gag:goat', 'gag:chicken', 'gag:trojan', 'gag:zeus', 'gag:insurance', 'med-ok', 'shape', 'rule', 'caps:0', 'caps:2', 'caps:3'];

// Union of the whole-word banned terms of the three era bibles (design/<era>/humour.md section 9) that could plausibly appear in a reused line:
// pain and injury vocabulary, religion words, slurs-adjacent words are not listed, real programme and franchise tokens, other-era weapon words for Medieval.
export const BANNED_UNION = /\b(wound|wounds|wounded|corpse|corpses|bleeding|screaming|agony|gore|pagan|prayer|saint|blessing|slave|serf|trooper|troopers|titan|halo|walker|droid|nuke|napalm|fallout|hostage|suicide|massacre|genocide|terrorist|crusade|crusader|pope|church|heathen|infidel|cannon|musket|gunpowder|bombard|nato|marines|apollo|artemis|voyager|zerg|borg|dalek|matrix|jedi|sith|lightsaber|saber)\b/i;

function readCsv(csvPath) {
  const tbl = parseCsv(fs.readFileSync(csvPath, 'utf8')).filter((r) => r.length > 1);
  tbl.shift();
  return tbl.map((r) => ({ id: r[0], category: r[1], voice: r[2], cls: r[3], reason: r[4], rewrite: r[5] }));
}
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };

async function demandPer14() {
  // Ancient-script demand per category, per 14 minutes (the announcer repeatWindow is 840 s), from tools/humor-sim.mjs: seed 11, 120 min, 1x, veteran stats, fresh scripts.
  const { runSimulation } = await import('./humor-sim.mjs');
  const res = runSimulation({ minutes: 120, speed: 1, seed: 11, stats: 'veteran', fresh: true });
  const by = {};
  for (const l of res.lines) by[l.cat] = (by[l.cat] || 0) + 1;
  const out = {};
  for (const k of Object.keys(by)) out[k] = by[k] / 120 * 14;
  return { demand: out, lines: res.lines.length };
}

async function report(csvPath, withPartition) {
  const rows = readCsv(csvPath);
  const src = new Map(allRows().map((r) => [r.id, r]));
  const L = [];
  const pct = (a, b) => (b ? (100 * a / b).toFixed(1) + '%' : '-');
  // A. surface x class
  L.push('### A. Class counts per surface', '', '| surface | rows | neutral | convertible | ancient | reusable (neutral + convertible) |', '|---|---|---|---|---|---|');
  const surf = (r) => src.get(r.id).surface;
  let T = { n: 0, c: 0, a: 0, t: 0 };
  for (const s of ['announcer', 'tips', 'loading', 'credits']) {
    const rs = rows.filter((r) => surf(r) === s);
    const n = rs.filter((r) => r.cls === 'neutral').length, c = rs.filter((r) => r.cls === 'convertible').length, a = rs.filter((r) => r.cls === 'ancient').length;
    L.push('| ' + s + ' | ' + rs.length + ' | ' + n + ' (' + pct(n, rs.length) + ') | ' + c + ' (' + pct(c, rs.length) + ') | ' + a + ' (' + pct(a, rs.length) + ') | ' + (n + c) + ' (' + pct(n + c, rs.length) + ') |');
    T.n += n; T.c += c; T.a += a; T.t += rs.length;
  }
  L.push('| **all** | ' + T.t + ' | ' + T.n + ' | ' + T.c + ' | ' + T.a + ' | ' + (T.n + T.c) + ' |', '');
  // announcer by voice
  const ann = rows.filter((r) => surf(r) === 'announcer');
  L.push('Announcer by voice (non-follow):', '', '| voice | rows | neutral | convertible | ancient |', '|---|---|---|---|---|');
  for (const v of ['brutus', 'plato', 'cassandra']) {
    const rs = ann.filter((r) => r.voice === v);
    L.push('| ' + v + ' | ' + rs.length + ' | ' + rs.filter((r) => r.cls === 'neutral').length + ' | ' + rs.filter((r) => r.cls === 'convertible').length + ' | ' + rs.filter((r) => r.cls === 'ancient').length + ' |');
  }
  L.push('');
  // B. category table
  const { demand, lines } = await demandPer14();
  const cats = []; for (const r of ann) if (!cats.includes(r.category)) cats.push(r.category);
  L.push('### B. Category table for spec/H (announcer, non-follow templates)', '',
    'Demand = lines of the category spoken per 14 min in the humor-sim Ancient scripts (' + lines + ' lines over 120 min, seed 11, 1x). Required pool R = max(6, ceil(1.5 x demand)) for generic categories (the soft repeat memory is 14 min, so a pool of 1.5 x the lines spoken in that window avoids a heard-line repeat). Era-new needed = max(R - reusable, number of voices with no reusable line, 0) for generic categories; ancient-route categories are replaced by the era signature categories of section 3.5; mission categories are 3 lines per mission. Voices column is neutral + convertible per voice b/p/c.', '',
    '| category | route | total | neutral | convertible | ancient | reusable | b/p/c reusable | demand/14 min | R | era-new needed |', '|---|---|---|---|---|---|---|---|---|---|---|');
  const tbl = [];
  for (const c of cats) {
    const rs = ann.filter((r) => r.category === c);
    const n = rs.filter((r) => r.cls === 'neutral').length, cv = rs.filter((r) => r.cls === 'convertible').length, a = rs.filter((r) => r.cls === 'ancient').length;
    const v = ['brutus', 'plato', 'cassandra'].map((x) => rs.filter((r) => r.voice === x && r.cls !== 'ancient').length);
    const d = demand[c] || 0, route = routeOf(c);
    const R = route === 'generic' ? Math.max(6, Math.ceil(1.5 * d)) : '-';
    // battle_start: arena lines (44 Ancient, arena-bound) are replaced one for one by 3 lines per era arena, counted in section 3.5
    const need = route === 'generic' ? Math.max(0, R - n - cv, v.filter((x) => x === 0).length) : route === 'mission' ? 3 : '-';
    tbl.push({ c, n, cv, a, route, need, tot: rs.length });
    L.push('| ' + c + ' | ' + route + ' | ' + rs.length + ' | ' + n + ' | ' + cv + ' | ' + a + ' | ' + (n + cv) + ' | ' + v.join('/') + ' | ' + d.toFixed(1) + ' | ' + R + ' | ' + need + ' |');
  }
  const sum = (f) => tbl.reduce((x, t) => x + f(t), 0);
  L.push('| **total** | | ' + sum((t) => t.tot) + ' | ' + sum((t) => t.n) + ' | ' + sum((t) => t.cv) + ' | ' + sum((t) => t.a) + ' | ' + sum((t) => t.n + t.cv) + ' | | | | |', '');
  // C. categories with < 6 neutral
  L.push('### C. Categories with fewer than 6 neutral lines (each era must supply or replace them)', '', '| category | route | neutral | neutral + convertible | action |', '|---|---|---|---|---|');
  for (const t of tbl.filter((x) => x.n < 6)) {
    const act = t.route === 'generic' ? (t.need > 0 ? 'each era writes ' + t.need + ' more (to reach R and to give every voice at least one reusable line)' : 'no new lines needed once the convertible rewrites are adopted (neutral alone is short)') : t.route === 'mission' ? 'mission lines are always era-new (3 per mission)' : t.route === 'melee' ? 'Medieval reuses the convertible lines and writes the rest; Modern and Sci-Fi drop the category' : 'Ancient trigger: the era supplies its own signature categories instead';
    L.push('| ' + t.c + ' | ' + t.route + ' | ' + t.n + ' | ' + (t.n + t.cv) + ' | ' + act + ' |');
  }
  L.push('');
  // D. sub coverage for generic categories
  L.push('### D. Sub-gated lines: reusable lines per cond.sub (generic categories only)', '', '| category:sub | total | neutral | convertible | ancient | reusable | needs era lines (< 3 reusable) |', '|---|---|---|---|---|---|---|');
  const subs = new Map();
  for (const r of ann) {
    const s0 = src.get(r.id); const sub = s0.cond && s0.cond.sub ? s0.cond.sub : null;
    if (!sub || routeOf(r.category) !== 'generic') continue;
    const k = r.category + ':' + sub; if (!subs.has(k)) subs.set(k, []); subs.get(k).push(r);
  }
  for (const [k, rs] of subs) {
    const n = rs.filter((r) => r.cls === 'neutral').length, c = rs.filter((r) => r.cls === 'convertible').length, a = rs.filter((r) => r.cls === 'ancient').length;
    L.push('| ' + k + ' | ' + rs.length + ' | ' + n + ' | ' + c + ' | ' + a + ' | ' + (n + c) + ' | ' + (n + c < 3 ? 'yes' : 'no') + ' |');
  }
  L.push('');
  // E. tags
  L.push('### E. Tags in the reason column', '', '| tag | rows | neutral | convertible | ancient |', '|---|---|---|---|---|');
  for (const t of TAGS) {
    const rs = rows.filter((r) => r.reason.includes('[' + t + ']') || r.reason.includes('[' + t));
    L.push('| ' + t + ' | ' + rs.length + ' | ' + rs.filter((r) => r.cls === 'neutral').length + ' | ' + rs.filter((r) => r.cls === 'convertible').length + ' | ' + rs.filter((r) => r.cls === 'ancient').length + ' |');
  }
  L.push('');
  // F. effective pool
  const reusable = ann.filter((r) => r.cls !== 'ancient').length;
  const neutralN = ann.filter((r) => r.cls === 'neutral').length;
  L.push('### F. Effective announcer pool arithmetic (before any era signature category)', '',
    '- neutral verbatim: ' + neutralN + '; convertible after rewrite: ' + ann.filter((r) => r.cls === 'convertible').length + '; shared total: ' + reusable + '.',
    '- era-new fixed items: 27 campaign lines (9 missions x 3), arena lines 3 per arena x 12 arenas = 36 (Ancient has 44 arena-bound lines for 14 arenas + the lab).',
    '- shared + fixed era-new = ' + (reusable + 27 + 36) + ' lines per era, against the plan target of 300 (floor 250), before any generic shortfall or signature category.', '');
  if (withPartition) {
    const catSize = new Map(); for (const r of ann) if (r.cls !== 'ancient') catSize.set(r.category, (catSize.get(r.category) || 0) + 1);
    const big = (c) => (catSize.get(c) || 0) >= 12;
    L.push('### G. Hybrid reuse rule (proposal for spec/H)', '',
      'Categories with at least 12 reusable lines (' + [...catSize].filter(([c, n]) => n >= 12).map(([c, n]) => c + ' ' + n).join(', ') + ') are partitioned: FNV-1a(id) mod 3 names the one new era that does NOT use the line, so every reused line serves two of the three new eras. Thinner categories are shared by all three.', '',
      '| era slot | shared lines used | of which neutral |', '|---|---|---|');
    const use = (e) => ann.filter((r) => r.cls !== 'ancient' && (!big(r.category) || fnv(r.id) % 3 !== e));
    const total = ann.filter((r) => r.cls !== 'ancient').length;
    for (let e = 0; e < 3; e++) {
      const u = use(e);
      L.push('| ' + ['Medieval', 'Modern', 'Sci-Fi'][e] + ' | ' + u.length + ' | ' + u.filter((r) => r.cls === 'neutral').length + ' |');
    }
    const three = ann.filter((r) => r.cls !== 'ancient' && !big(r.category)).length;
    L.push('', 'Distinct reused lines: ' + total + '; used by all three new eras: ' + three + '; used by exactly two: ' + (total - three) + '.', '');
  }
  process.stdout.write(L.join('\n') + '\n');
}


// Mechanical second opinion (NOT a substitute for the second independent agent read that q3_product residual 16 asks for): a lexicon of
// Ancient-world and weapon nouns, gods, places, props and gag props. A neutral row that hits the lexicon, or an ancient row that hits
// nothing, is listed for the REVIEWER to adjudicate. Known false positives are named in ALLOW with the reason.
export const LEXICON = /\b(spear|spears|sword|swords|shield|shields|arrow|arrows|bow|bows|archer|archers|horse|horses|cavalry|hoplite|hoplites|legion|legionary|rome|roman|athens|athenian|sparta|spartan|spartans|zeus|hera|olympus|gods?|goat|goats|chicken|chickens|hen|poultry|elephant|elephants|laurel|senator|senate|philosopher|temple|column|columns|marble|drachma|drachmae|catapult|ballista|boulder|stab|stabs|blade|helmet|armour|pharaoh|pyramid|pyramids|sphinx|nile|mummy|mummies|anubis|immortals?|cyclops|medusa|minotaur|gladiator|colosseum|thermopylae|marathon|troy|trojan|persepolis|carthage|sandals|wine|grape|grapes|pizza|pompeii|ash|delphi|olive|oil|xerxes|hannibal|druid|locusts?|torch|torches|jackal|net|hounds?|sculptor|chair|chairs)\b/gi;
const ALLOW = {
  chairs: 'Brutus chairs gag is commentator-world', chair: 'commentator-world chair gag', sculptor: 'commentator-world sculptor gag (statue of the hero)', fire: 'idiom',
  net: 'noun only in the Gladiator net lines', oil: 'olive oil sponsor only', philosopher: 'generic English ("even a philosopher") in a neutral line',
};
function crosscheck(csvPath) {
  const text = new Map(allRows().map((r) => [r.id, r.text]));
  const rows = readCsv(csvPath);
  const L = ['neutral rows that hit the lexicon (adjudicated false positives are named):'];
  let nHit = 0;
  for (const r of rows.filter((x) => x.cls === 'neutral')) {
    const hits = [...new Set((text.get(r.id).match(LEXICON) || []).map((h) => h.toLowerCase()))];
    if (!hits.length) continue;
    nHit++;
    L.push('  ' + r.id + ': ' + hits.map((h) => h + (ALLOW[h] ? ' (' + ALLOW[h] + ')' : ' (UNADJUDICATED)')).join(', '));
  }
  L.push('ancient rows that hit nothing in the lexicon (category or cond bound, or an Ancient name outside the lexicon):');
  let aMiss = 0;
  for (const r of rows.filter((x) => x.cls === 'ancient')) {
    if ((text.get(r.id).match(LEXICON) || []).length) continue;
    aMiss++;
    L.push('  ' + r.id + ': ' + r.reason.slice(0, 90));
  }
  L.push('summary: neutral rows with lexicon hits ' + nHit + ', ancient rows without ' + aMiss);
  process.stdout.write(L.join('\n') + '\n');
}

export const GAGS = [
  ['grape seller / snack vendor', /grape|man selling|row ten/i],
  ['Pompeii Pizza and ash', /pizza|pompeii/i],
  ['Terms of Conquest', /terms of conquest|laminat/i],
  ['Cassandra\'s wall', /\bon (a|the) wall\b|wall for them|out of wall|tally on the wall|near the wall|same wall|ceiling/i],
  ['the goat', /\bgoats?\b/i],
  ['sacred chickens', /chicken|poultry/i],
  ['Trojan horse and gift shop', /trojan|gift shop|gift left|\bhorse\b.*(open|inspect)/i],
  ['Zeus (bored, on leave, ragequit)', /zeus/i],
  ['Delphi Insurance / "we saw this coming"', /delphi|insurance|insured|saw this coming/i],
  ['the sculptor and statues', /sculptor|carve/i],
  ['chairs', /\bchairs?\b/i],
  ['sponsors, coupons, refunds', /sponsor|coupon|refund/i],
  ['Plato defining a battle', /define|defining|definition|what, precisely, is a battle/i],
  ['the platypus', /platypus/i],
  ['Cassandra "I wrote it down" / "as foretold"', /wrote|foretold|noted|margin/i],
];
function gags(csvPath) {
  const text = new Map(allRows().map((r) => [r.id, r.text]));
  const rows = readCsv(csvPath).filter((r) => allRows().find((x) => x.id === r.id).surface === 'announcer');
  const L = ['| gag | announcer rows (text match) | neutral | convertible | ancient | first ids |', '|---|---|---|---|---|---|'];
  for (const [name, re] of GAGS) {
    const rs = rows.filter((r) => re.test(text.get(r.id)));
    L.push('| ' + name + ' | ' + rs.length + ' | ' + rs.filter((r) => r.cls === 'neutral').length + ' | ' + rs.filter((r) => r.cls === 'convertible').length + ' | ' + rs.filter((r) => r.cls === 'ancient').length + ' | ' + rs.slice(0, 3).map((r) => '`' + r.id + '`').join(', ') + ' |');
  }
  process.stdout.write(L.join('\n') + '\n');
}

function listSurface(csvPath, surface, onlyReusable) {
  const text = new Map(allRows().map((r) => [r.id, r]));
  const rows = readCsv(csvPath).filter((r) => text.get(r.id).surface === surface && (!onlyReusable || r.cls !== 'ancient'));
  const L = ['| id | class | text | rewrite |', '|---|---|---|---|'];
  for (const r of rows) L.push('| `' + r.id + '` | ' + r.cls + ' | ' + text.get(r.id).text.replace(/\|/g, '\\|') + ' | ' + (r.rewrite ? r.rewrite.replace(/\|/g, '\\|') : '') + ' |');
  process.stdout.write(L.join('\n') + '\n');
}

// Approximate skeleton diversity of the reusable pool (spec/VF 3.14 rule: registry names -> N, digits -> D, non stop-words -> w, collapse w runs).
// The stop-word list here is a 118-word approximation, the VF tool's list is authoritative; this only shows that the shared pool has no skeleton clusters.
const STOP = new Set('a an the and or but if then than that this these those it its is are was were be been being am do does did done have has had having i you he she we they me him her us them my your his our their mine yours not no nor so as at by for from in into of on onto to up down out over under with without about after before again all any both each few more most other some such only own same too very can will just should now there here when where why how what which who whom while until during through between against above below off once also even still yet ever never always often one two three four five'.split(' '));
function skeletons(csvPath) {
  const text = new Map(allRows().map((r) => [r.id, r]));
  const sk = new Map(); let n = 0;
  for (const r of readCsv(csvPath)) {
    if (text.get(r.id).surface !== 'announcer' || r.cls === 'ancient') continue;
    n++;
    const t = r.cls === 'convertible' ? r.rewrite : text.get(r.id).text;
    const toks = t.replace(/\{[^}]*\}/g, ' @N ').replace(/[0-9]+/g, ' @D ').split(/[^A-Za-z@]+/).filter(Boolean).map((w) => (w === '@N' ? 'N' : w === '@D' ? 'D' : STOP.has(w.toLowerCase()) ? w.toLowerCase() : 'w'));
    const k = toks.join(' ').replace(/\bw( w)+\b/g, 'w');
    if (!sk.has(k)) sk.set(k, []);
    sk.get(k).push(r.id);
  }
  const top = [...sk.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  const L = readCsv(csvPath).filter((r) => text.get(r.id).surface === 'announcer' && r.cls !== 'ancient').map((r) => [r.id, r.cls === 'convertible' ? r.rewrite : text.get(r.id).text]);
  let mx = 0, at = '';
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const x = jaccard(L[i][1], L[j][1]); if (x > mx) { mx = x; at = L[i][0] + ' / ' + L[j][0]; } }
  process.stdout.write('max pairwise word-3-gram Jaccard inside the reusable pool ' + mx.toFixed(2) + ' (' + at + '); VF fails at 0.6\n');
  process.stdout.write('reusable announcer lines ' + n + ', distinct skeletons ' + sk.size + ', largest cluster ' + top[1].length + ' (' + top[1].slice(0, 3).join(', ') + '); VF cap max(4, 2% of surface) = ' + Math.max(4, Math.round(n * 0.02)) + '\n');
}

function examples(csvPath, cls, n) {
  const rows = readCsv(csvPath).filter((r) => r.cls === cls && src0(r.id).surface === 'announcer');
  const text = new Map(allRows().map((r) => [r.id, r.text]));
  const step = rows.length / n;
  const out = [];
  for (let i = 0; i < n && i * step < rows.length; i++) { const r = rows[Math.floor(i * step)]; out.push('- `' + r.id + '` [' + r.voice[0] + '] ' + text.get(r.id) + (cls === 'convertible' ? '  ->  ' + r.rewrite : '')); }
  process.stdout.write(out.join('\n') + '\n');
  function src0(id) { return allRows().find((x) => x.id === id); }
}

// A rewrite may use only vocabulary slots/filters. It should not need slots that the original did not have unless it names them in the cond
// (e.g. {arena} is available to every battle_start line; {unit} only where the original had it). We check vocabulary and that the
// rewrite adds no slot absent from the original except the always-available ones.
const ALWAYS = new Set(['n', 'arena', 'faction', 'faction2', 'team', 'team2', 'mission', 'nth', 'ratio', 'secs', 'mins', 'streak', 'pct', 'unit', 'lifetime']);

export function checkCsv(src) {
  const rows = allRows();
  const want = rows.filter((r) => !r.follow);
  const tbl = parseCsv(src).filter((r) => r.length > 1 || (r[0] && r[0].trim()));
  const errs = [];
  const head = tbl.shift();
  if (!head || head.join(',') !== 'id,category,voice,class,reason,rewrite') errs.push('header must be id,category,voice,class,reason,rewrite; got ' + (head || []).join(','));
  const seen = new Map();
  const counts = { neutral: 0, ancient: 0, convertible: 0 };
  const nearDup = [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  tbl.forEach((r, i) => {
    const at = 'row ' + (i + 2) + ' (' + r[0] + ')';
    if (r.length !== 6) { errs.push(at + ': ' + r.length + ' columns, expected 6'); return; }
    const [id, category, voice, cls, reason, rewrite] = r;
    const src0 = byId.get(id);
    if (!src0) { errs.push(at + ': unknown id'); return; }
    if (seen.has(id)) errs.push(at + ': duplicate id'); seen.set(id, cls);
    if (src0.follow) errs.push(at + ': follow beat classified (follow beats inherit their head)');
    if (category !== src0.category) errs.push(at + ': category ' + category + ' != ' + src0.category);
    if (voice !== src0.voice) errs.push(at + ': voice ' + voice + ' != ' + src0.voice);
    if (!CLASSES.includes(cls)) { errs.push(at + ': class "' + cls + '"'); return; }
    counts[cls]++;
    if (!reason.trim()) errs.push(at + ': empty reason');
    if (cls === 'convertible') {
      if (!rewrite.trim()) errs.push(at + ': convertible without rewrite');
      else {
        const orig = new Set(src0.slots.map((s) => s.replace(/^\{([a-z0-9_]+).*$/, '$1')));
        for (const tok of slotsOf(rewrite)) {
          const m = /^\{([a-z0-9_]+)(?::([A-Za-z0-9_]+))?(?:\|([A-Za-z]+))?\}$/.exec(tok);
          if (!SLOT_NAMES.includes(m[1])) errs.push(at + ': rewrite slot ' + tok + ' not in vocabulary');
          if (m[3] && !FILTERS.includes(m[3])) errs.push(at + ': rewrite filter ' + tok + ' unknown');
          if (!orig.has(m[1]) && !ALWAYS.has(m[1])) errs.push(at + ': rewrite adds slot ' + tok);
        }
        if ((rewrite.match(/\{/g) || []).length !== (rewrite.match(/\}/g) || []).length) errs.push(at + ': unbalanced braces in rewrite');
        if (rewrite.trim() === src0.text.trim()) errs.push(at + ': rewrite equals original');
        if (jaccard(src0.text, rewrite) >= 0.6) nearDup.push(id);
        for (const h of new Set((rewrite.match(LEXICON) || []).map((x) => x.toLowerCase()))) if (!ALLOW[h]) errs.push(at + ': rewrite still names an Ancient noun: ' + h);
        const bw = rewrite.match(BANNED_UNION); if (bw) errs.push(at + ': rewrite hits the banned union: ' + bw[0]);
        const lim = src0.surface === 'tips' ? 18 : 22;
        if (rewrite.trim().split(/\s+/).length > lim) errs.push(at + ': rewrite longer than ' + lim + ' words');
      }
    } else if (rewrite.trim()) errs.push(at + ': rewrite given for class ' + cls);
    if (cls === 'neutral') {
      for (const h of new Set((src0.text.match(LEXICON) || []).map((x) => x.toLowerCase()))) if (!ALLOW[h]) errs.push(at + ': neutral line names an Ancient noun: ' + h);
      const bw = src0.text.match(BANNED_UNION); if (bw) errs.push(at + ': neutral line hits the banned union: ' + bw[0]);
    }
  });
  for (const r of want) if (!seen.has(r.id)) errs.push('missing id ' + r.id);
  return { errs, counts, nearDup, tblLen: tbl.length, want };
}

function verify(csvPath) {
  const { errs, counts, nearDup, tblLen, want } = checkCsv(fs.readFileSync(csvPath, 'utf8'));
  const out = [];
  out.push('classification rows: ' + tblLen + ' / expected ' + want.length + ' (announcer non-follow ' + want.filter((r) => r.surface === 'announcer').length + ', tips ' + want.filter((r) => r.surface === 'tips').length + ', loading ' + want.filter((r) => r.surface === 'loading').length + ', credits ' + want.filter((r) => r.surface === 'credits').length + ')');
  out.push('classes: neutral ' + counts.neutral + ', ancient ' + counts.ancient + ', convertible ' + counts.convertible);
  out.push('rewrites with word-3-gram Jaccard >= 0.6 against their Ancient source: ' + nearDup.length + ' of ' + counts.convertible + ' (informational: spec/VF near-duplicate lint must exempt convertible sources, see ancient_announcer_classification.md)');
  if (errs.length) { out.push('FAIL ' + errs.length + ' problem(s):'); errs.slice(0, 60).forEach((e) => out.push('  ' + e)); } else out.push('OK');
  process.stdout.write(out.join('\n') + '\n');
  process.exit(errs.length ? 1 : 0);
}

// Negative controls for the verifier: each mutant of the real CSV must be rejected, and the unmutated CSV must pass.
function selftest(csvPath) {
  const base = fs.readFileSync(csvPath, 'utf8');
  const lines = base.split('\n');
  const onId = (id, f) => lines.map((l) => (l.startsWith(id + ',') ? f(l) : l)).join('\n');
  const mutants = {
    'dropped row': lines.filter((l, i) => i !== 5).join('\n'),
    'duplicated row': [...lines.slice(0, 6), lines[5], ...lines.slice(6)].join('\n'),
    'unknown class': onId('battle_start_ending', (l) => l.replace(',neutral,', ',fine,')),
    'convertible without rewrite': onId('battle_start_grapes', (l) => l.replace(/,[^,]*$/, ',')),
    'rewrite with unknown slot': onId('battle_start_grapes', (l) => l.replace(/,[^,]*$/, ',The {weapon} vendor survives.')),
    'rewrite over 22 words': onId('battle_start_grapes', (l) => l.replace(/,[^,]*$/, ',a b c d e f g h i j k l m n o p q r s t u v w x y z')),
    'rewrite still names arrows': onId('big_swing_yours_mid', (l) => l.replace('Hold it with EVERYTHING!', 'Hold it with ARROWS!')),
    'rewrite hits banned union': onId('big_swing_yours_mid', (l) => l.replace('Hold it with EVERYTHING!', 'Hold it with wounded soldiers!')),
    'rewrite equals original': onId('first_blood_early_p', (l) => l.replace(/,[^,]*$/, ',{secs} seconds. Patience is not among the virtues of a spear.')),
    'rewrite on a neutral row': onId('battle_start_ending', (l) => l + 'oops'),
    'ancient row relabelled neutral': onId('battle_start_a_giza', (l) => l.replace(',ancient,', ',neutral,')),
    'category mismatch': onId('victory_terms', (l) => l.replace('victory_terms,victory', 'victory_terms,battle_start')),
    'voice mismatch': onId('victory_terms', (l) => l.replace(',brutus,', ',plato,')),
    'follow beat classified': base + 'battle_start_define_b,battle_start,brutus,neutral,x,\n',
    'unknown id': base + 'no_such_line,battle_start,brutus,neutral,x,\n',
    'empty reason': onId('battle_start_ending', () => 'battle_start_ending,battle_start,cassandra,neutral,,'),
    'wrong header': base.replace('id,category,voice,class,reason,rewrite', 'id,category,voice,class,why,rewrite'),
  };
  const out = [];
  let bad = 0;
  const b = checkCsv(base);
  out.push('baseline: ' + (b.errs.length ? 'FAIL (' + b.errs[0] + ')' : 'pass'));
  if (b.errs.length) bad++;
  for (const [name, text] of Object.entries(mutants)) {
    const r = checkCsv(text);
    const caught = r.errs.length > 0;
    if (!caught) bad++;
    out.push((caught ? 'rejected ' : 'MISSED   ') + name.padEnd(34) + (caught ? r.errs[0].slice(0, 80) : ''));
  }
  out.push(bad ? 'SELFTEST FAIL: ' + bad : 'selftest ok: baseline passes, ' + Object.keys(mutants).length + ' of ' + Object.keys(mutants).length + ' mutants rejected');
  process.stdout.write(out.join('\n') + '\n');
  process.exit(bad ? 1 : 0);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt; };
  const csvArg = opt('--csv', DEFAULT_CSV);
  if (argv.includes('--selftest')) selftest(csvArg);
  else if (argv.includes('--verify')) verify(opt('--verify', DEFAULT_CSV));
  else if (argv.includes('--crosscheck')) crosscheck(csvArg);
  else if (argv.includes('--gags')) gags(csvArg);
  else if (argv.includes('--skeletons')) skeletons(csvArg);
  else if (argv.includes('--list')) listSurface(csvArg, opt('--list', 'tips'), argv.includes('--reusable'));
  else if (argv.includes('--report')) await report(csvArg, argv.includes('--partition'));
  else if (argv.includes('--examples')) examples(csvArg, opt('--examples', 'neutral'), Number(argv[argv.indexOf('--examples') + 2]) > 0 ? Number(argv[argv.indexOf('--examples') + 2]) : 20);
  else {
    let rows = allRows();
    const surface = opt('--surface', 'announcer');
    if (surface !== 'all') rows = rows.filter((r) => r.surface === surface);
    if (argv.includes('--no-follow')) rows = rows.filter((r) => !r.follow);
    if (argv.includes('--summary')) process.stdout.write(summary(allRows()));
    else process.stdout.write(emit(rows, opt('--format', 'jsonl')));
  }
}
