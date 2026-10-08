#!/usr/bin/env node
// tools/ms_context.mjs: builds the registry-like CONTEXT the MS lint (tools/ms_lint.mjs) checks a missions.json against. Owner DESIGN-CAMPAIGN (spec/MS section 3.9).
//
//   Ancient:  imports the REAL content (stats, props, arena recipes, god powers, mutators, unlocks, puzzles) and writes docs/eras/design/ancient/context.json.
//   Others:   parses the markdown tables of docs/eras/design/<era>/{rosters,arenas,props,puzzles,boss_table}.md (+ optional god_powers.md, mutators_achievements.md,
//             first_three_minutes.md) and, once src/content/era_<id>/stats.js exists, prefers its real STAT_TABLE for unit costs (source:'real+markdown').
//   Shared:   the module landing order and the three E-FREEZE sets come from the ```modules block of docs/eras/spec/M.md, so the landing-order reconciliation
//             of spec/M reaches the lint with no edit here (modules are referred to by NAME everywhere in MS).
//
//   node tools/ms_context.mjs --era=ancient|medieval|modern|scifi|all [--write] [--check] [--out=<dir>] [--summary]
//     --write   write docs/eras/design/<era>/context.json (default for ancient only; the three new eras are written only on request)
//     --check   exit 1 when the committed context.json differs from a fresh build (Ancient: the gate step "ms-context no diff")
//     --summary print counts
// Library: buildContext(era, o), parseMdTables(text), parseModules(text), parseFirstThree(text), parseLadder(text), stableStringify(v), ERAS, ROOT.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** Where docs/ lives: the tree itself, or (inside a negctl copy, which carries src/ tools/ tests/ only) VW_MAIN_ROOT. Code is always read from ROOT. */
export const DOCS = fs.existsSync(path.join(ROOT, 'docs/eras')) ? ROOT : (process.env.VW_MAIN_ROOT || ROOT);
export const ERAS = ['ancient', 'medieval', 'modern', 'scifi'];
export const CONTEXT_VERSION = 1;
const SNAKE = /^[a-z][a-z0-9_]*$/;

// ------------------------------------------------------------------------------------------------------------------------------ small utils
export function stableStringify(v, indent = 1) {
  const norm = (x) => {
    if (Array.isArray(x)) return x.map(norm);
    if (x && typeof x === 'object') { const o = {}; for (const k of Object.keys(x).sort()) o[k] = norm(x[k]); return o; }
    return x;
  };
  return JSON.stringify(norm(v), null, indent) + '\n';
}
const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);
const clean = (c) => String(c == null ? '' : c).replace(/\*\*/g, '').replace(/`/g, '').trim();
const ticks = (c) => { const out = []; const re = /`([^`]+)`/g; let m; while ((m = re.exec(String(c || '')))) out.push(m[1]); return out; };
const num = (c) => { const m = String(c || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : null; };
const uniq = (a) => Array.from(new Set(a));
/** Id of a table cell: the first backticked token (cells may carry a trailing marker such as " *"), else the cleaned text. */
const idOf = (c) => ticks(c)[0] || clean(c);

/** GFM pipe tables of a markdown text: [{header:[...], rows:[[...]], line, heading}] (cells trimmed, raw: backticks kept). */
export function parseMdTables(text) {
  const lines = text.split('\n'), out = []; let heading = '';
  const cells = (l) => { let s = l.trim(); if (s.startsWith('|')) s = s.slice(1); if (s.endsWith('|')) s = s.slice(0, -1); return s.split('|').map((c) => c.trim()); };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^#{1,6}\s/.test(l)) heading = l.replace(/^#+\s*/, '');
    if (l.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const header = cells(l), rows = []; let j = i + 2;
      while (j < lines.length && lines[j].trim().startsWith('|')) { rows.push(cells(lines[j])); j++; }
      out.push({ header, rows, line: i + 1, heading }); i = j - 1;
    }
  }
  return out;
}
const col = (t, re) => t.header.findIndex((h) => re.test(clean(h).toLowerCase()));

// ------------------------------------------------------------------------------------------------------------------------------ spec/M: modules + freeze sets
/** {modules:[{id,S,pos,deps}], eFreeze:{ancient:0, medieval:n, modern:n, scifi:n}} from the ```modules block and the "E-FREEZE sets" paragraph of spec/M.md. */
export function parseModules(text) {
  const m = text.match(/```modules\s*\n([\s\S]*?)\n```/);
  if (!m) throw new Error('spec/M.md has no ```modules block');
  const modules = JSON.parse(m[1]).map((x) => ({ id: x.id, S: x.S, pos: x.pos, deps: x.deps }));
  const byId = Object.fromEntries(modules.map((x) => [x.id, x]));
  const eFreeze = { ancient: 0 };
  const para = text.match(/^E-FREEZE sets \(prefix[^\n]*/m);
  const line = para ? para[0] : '';
  const grab = (label) => {
    const r = new RegExp('\\*\\*' + label + '\\*\\*\\s*=\\s*([^;]*?)(?=;\\s*\\*\\*|\\.\\s|$)');
    const mm = line.match(r); return mm ? mm[1] : null;
  };
  const setOf = (s) => (s ? uniq((s.match(/\bM\d+[a-z]?\b/g) || [])) : []);
  const med = setOf(grab('Medieval')), mod = setOf(grab('Modern')), sf = setOf(grab('Sci-Fi'));
  // Modern = Medieval + {..}; Sci-Fi = Modern + {..}: the lines say "Medieval + {M8 M9 M11}"
  const medSet = med, modSet = uniq(medSet.concat(mod.filter((x) => !medSet.includes(x)))), sfSet = uniq(modSet.concat(sf.filter((x) => !modSet.includes(x))));
  const posMax = (set) => set.reduce((a, id) => Math.max(a, byId[id] ? byId[id].pos : 0), 0);
  eFreeze.medieval = posMax(medSet); eFreeze.modern = posMax(modSet); eFreeze.scifi = posMax(sfSet);
  return { modules, eFreeze, freezeSets: { medieval: medSet, modern: modSet, scifi: sfSet } };
}

// ------------------------------------------------------------------------------------------------------------------------------ markdown parsers
/** Roster master table + the stat-intent tables (cost): {units:{id:{name,faction,role,tags,abilities,cost,firstMission,height,rig,aiStyle}}}. */
function parseRoster(text) {
  const tables = parseMdTables(text), units = {};
  const master = tables.find((t) => clean(t.header[0]).toLowerCase() === 'id' && t.header.some((h) => /^faction$/i.test(clean(h))) && t.header.some((h) => /^role$/i.test(clean(h))));
  if (!master) throw new Error('rosters.md: no master table (id | name | faction | role ...)');
  const ci = (re) => col(master, re);
  const I = { id: ci(/^id$/), name: ci(/^name$/), faction: ci(/^faction$/), role: ci(/^role$/), tags: ci(/^tags$/), rig: ci(/^rig$/), abil: ci(/^ability/), ai: ci(/^ai style/), first: ci(/^first mission/), height: ci(/^height/), tracer: ci(/^tracer/) };
  for (const r of master.rows) {
    const id = idOf(r[I.id]); if (!SNAKE.test(id)) continue;
    const abil = I.abil >= 0 ? ticks(r[I.abil]).filter((x) => SNAKE.test(x)) : [];
    units[id] = {
      name: clean(r[I.name]), faction: clean(r[I.faction]), role: clean(r[I.role]), tags: clean(r[I.tags]).split(',').map((x) => x.trim()).filter(Boolean).sort(),
      abilities: abil, cost: null, firstMission: I.first >= 0 ? clean(r[I.first]) : '', height: I.height >= 0 ? clean(r[I.height]) : '', rig: I.rig >= 0 ? clean(r[I.rig]) : '', aiStyle: I.ai >= 0 ? clean(r[I.ai]) : '',
    };
  }
  // costs: any later table whose first column is `id` and which has a column named cost*
  for (const t of tables) {
    if (t === master || clean(t.header[0]).toLowerCase() !== 'id') continue;
    const cc = col(t, /^cost/); if (cc < 0) continue;
    for (const r of t.rows) { const id = idOf(r[0]); if (units[id] && units[id].cost == null) { const c = num(r[cc]); if (c != null) units[id].cost = c; } }
  }
  return units;
}
/** Sizes and seeds from "(medium, seed 7, ...)" or a size cell like "medium 96 (192)" or "small". */
function sizeSeed(...cs) {
  const s = cs.join(' ').toLowerCase(); const size = (s.match(/\b(small|medium|large)\b/) || [])[1] || null;
  const seed = (s.match(/\bseed\s+(\d+)/) || [])[1];
  return { size, seed: seed != null ? Number(seed) : null };
}
function parseArenas(text) {
  const tables = parseMdTables(text), arenas = {};
  for (const t of tables) {
    if (clean(t.header[0]).toLowerCase() !== 'id') continue;
    const si = col(t, /^size/); if (si < 0) continue;   // the arena table (the ladder table has # | id first)
    for (const r of t.rows) { const id = ticks(r[0])[0]; if (id && SNAKE.test(id)) arenas[id] = Object.assign(arenas[id] || {}, { name: clean(r[1]) }, sizeSeed(r[si])); }
  }
  // "### 2.1 `id` Name (small, seed 7, sym mx)" headings (Modern and Sci-Fi list the arenas this way too)
  for (const l of text.split('\n')) {
    const m = l.match(/^#{2,4}\s+(?:\d+(?:\.\d+)*\.?\s+)?`([a-z][a-z0-9_]*)`\s+(.*?)\s*(?:\(([^)]*)\))?\s*$/);
    if (m && SNAKE.test(m[1])) { const ss = sizeSeed(m[3] || ''); arenas[m[1]] = Object.assign(arenas[m[1]] || {}, { name: arenas[m[1]] && arenas[m[1]].name ? arenas[m[1]].name : m[2].trim() }, ss.size ? { size: ss.size } : {}, ss.seed != null ? { seed: ss.seed } : {}); }
  }
  for (const id of Object.keys(arenas)) { arenas[id].size = arenas[id].size || null; if (arenas[id].seed === undefined) arenas[id].seed = null; }
  return arenas;
}
/** The binding mission ladder of arenas.md (section 3): [{n,id,objective,arena}] ; objective = first snake word of the objective cell. */
export function parseLadder(text) {
  const out = [];
  for (const t of parseMdTables(text)) {
    const idc = col(t, /^id$/), ac = col(t, /^arena/), oc = col(t, /^objective/), nc = 0;
    if (idc < 0 || ac < 0 || oc < 0 || !/^(#|m)$/i.test(clean(t.header[nc]))) continue;
    for (const r of t.rows) {
      const n = num(r[nc]); const id = ticks(r[idc])[0]; if (n == null || !id) continue;
      const ow = (clean(r[oc]).match(/[a-z_]+/) || [''])[0];
      out.push({ n, id, objective: ow, arena: ticks(r[ac])[0] || null });
    }
  }
  return out.sort((a, b) => a.n - b.n);
}
function parsePuzzles(text, unitIds) {
  const out = [];
  for (const t of parseMdTables(text)) {
    const idc = col(t, /^id$/), ac = col(t, /^arena/), rc = col(t, /^roster/), bc = col(t, /^budget/);
    if (idc < 0 || ac < 0 || rc < 0) continue;
    for (const r of t.rows) {
      const id = ticks(r[idc])[0]; if (!id) continue;
      const ss = sizeSeed(r[ac]);
      const roster = (clean(r[rc]).replace(/\([^)]*\)/g, ' ').match(/[a-z][a-z0-9_]*/g) || []).filter((x) => unitIds.has(x));
      const bp = String(r[bc] || '').replace(/,/g, '').match(/\d+/g) || [];
      out.push({ id, arena: ticks(r[ac])[0] || null, size: ss.size, seed: ss.seed, roster: uniq(roster), budget: bp[0] != null ? Number(bp[0]) : null, par: bp[1] != null ? Number(bp[1]) : null, title: clean(r[col(t, /^title/)]) });
    }
  }
  return out;
}
function parseBosses(text) {
  const out = [];
  for (const t of parseMdTables(text)) {
    const idc = col(t, /^id$/), wc = col(t, /^wave/); if (idc < 0 || wc < 0) continue;
    for (const r of t.rows) { const id = ticks(r[idc])[0]; if (id && SNAKE.test(id)) out.push(id); }
  }
  return out;
}
function parseProps(text) {
  const props = {};
  for (const t of parseMdTables(text)) {
    if (clean(t.header[0]).toLowerCase() !== 'id') continue;
    const cc = col(t, /^cat/), hc = col(t, /^hp/); if (cc < 0) continue;
    for (const r of t.rows) { const id = ticks(r[0])[0]; if (id && SNAKE.test(id)) props[id] = { cat: clean(r[cc]), hp: hc >= 0 ? (/inf/i.test(r[hc]) ? 'INF' : num(r[hc])) : null }; }
  }
  return props;
}
function parseHeadingIds(text, re) { const out = []; for (const l of text.split('\n')) { const m = l.match(re); if (m) out.push(m[1]); } return out; }

/**
 * The first-three-minutes index of a design/<era>/first_three_minutes.md: the "Fresh-player beat order" and "Returning-player beat order" lines as
 * [{kind:'arrival'|'beat'|'toast'|'caption'|'setpiece', id}] (ids only; prose placeholders such as "[toasts]" or "the three card toasts" carry no id).
 */
export function parseFirstThree(text) {
  const grab = (re) => { const i = text.search(re); if (i < 0) return null; const rest = text.slice(i).split('\n'); let k = 1; while (k < rest.length && !rest[k].trim()) k++; return rest[k] || ''; };
  const classify = (line) => {
    const items = []; if (line == null) return items;
    // split on top-level commas (not inside [ ] or ( ))
    let depth = 0, cur = ''; const parts = [];
    for (const ch of line) { if (ch === '[' || ch === '(') depth++; if (ch === ']' || ch === ')') depth--; if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch; }
    if (cur.trim()) parts.push(cur);
    for (const raw of parts) {
      const p = raw.trim().replace(/\.$/, '');
      const br = p.match(/^\[(toasts?|captions?)\s+([^\]]*)\]/);
      if (br) { for (const id of ticks(br[2])) items.push({ kind: br[1].startsWith('toast') ? 'toast' : 'caption', id }); continue; }
      if (p.startsWith('[')) continue;                          // "[toasts]" placeholder
      const ids = ticks(p); if (!ids.length) continue;
      const id = ids[0];
      if (/^arrival\./.test(id)) items.push({ kind: 'arrival', id });
      else if (/\(set-piece\)/.test(p) || /_sp_/.test(id)) items.push({ kind: 'setpiece', id });
      else items.push({ kind: 'beat', id });
    }
    return items;
  };
  return { fresh: classify(grab(/^###\s+1\.1\s+Fresh-player beat order/m)), returning: classify(grab(/^###\s+2\.1\s+Returning-player beat order/m)) };
}

/**
 * The per-mission numbers of design/<era>/missions_outline.md ("#### Mission N" blocks): [{budget, par:{type,value}, timeLimit, attempts:{star1,star3}, hard:[M..], soft:[M..], star3:{helper,args|null}}].
 * Modules: a token followed by a parenthesis that says "soft" (and names no other module) is soft; module tokens inside a parenthesis that says "soft" are soft; everything else is hard.
 */
export function parseOutline(text) {
  const blocks = text.split(/^#### Mission (\d)/m), out = [];
  for (let i = 1; i < blocks.length; i += 2) {
    const n = Number(blocks[i]), b = blocks[i + 1] || '';
    const g = (re) => { const m = b.match(re); return m ? m : null; };
    const budget = g(/\*\*Budget\*\*\s+([\d,]+)/), par = g(/\*\*Par\*\*\s+`\{type:\s*'(cost|time|none)'(?:,\s*value:\s*(\d+))?\}`/), tl = g(/\*\*Time limit\*\*\s+(\d+)\s*s/);
    const at = g(/\*\*Expected attempts\*\*\s+(?:star 1:\s*)?(\d+(?:\.\d+)?)(?:,\s*star 3:\s*|\s*\/\s*)(\d+(?:\.\d+)?)/), st = g(/\*\*Star 3\*\*:\s*`([A-Za-z]+)\(([^`]*)\)`/);
    const mm = g(/\*\*requiresModules\*\*:\s*([^\n]*)/);
    const hard = [], soft = []; const allMods = !!(mm && /^\s*all\b/.test(mm[1]));
    if (mm && !allMods) {
      const line = mm[1].split('**Expected')[0]; const re = /(M\d+[a-z]?)(\s*\(([^)]*)\))?/g; let m;
      const inParen = []; line.replace(/\(([^)]*)\)/g, (all, inner) => { if (/soft/.test(inner)) for (const t of inner.match(/M\d+[a-z]?/g) || []) inParen.push(t); return all; });
      const masked = line.replace(/\([^)]*\)/g, (all) => ' ' + all.replace(/M\d+[a-z]?/g, '') + ' ');
      void masked;
      while ((m = re.exec(line))) {
        const tok = m[1], par2 = m[3] || '';
        if (inParen.includes(tok) && line.indexOf('(') >= 0 && new RegExp('\\([^)]*\\b' + tok + '\\b[^)]*\\)').test(line)) { if (!soft.includes(tok)) soft.push(tok); continue; }
        if (/soft/.test(par2) && !/M\d+[a-z]?/.test(par2)) { if (!soft.includes(tok)) soft.push(tok); continue; }
        if (!hard.includes(tok) && !soft.includes(tok)) hard.push(tok);
      }
      for (const t of inParen) if (!soft.includes(t)) soft.push(t);
    }
    let args = null; if (st) { try { args = JSON.parse('[' + st[2].replace(/'/g, '"') + ']'); } catch (e) { args = null; } }   // unquoted identifiers stay unparsed (null)
    out[n - 1] = {
      budget: budget ? Number(budget[1].replace(/,/g, '')) : null, par: par ? { type: par[1], value: par[2] ? Number(par[2]) : 0 } : null, timeLimit: tl ? Number(tl[1]) : null,
      attempts: at ? { star1: Number(at[1]), star3: Number(at[2]) } : null, hard: hard.filter((x) => !soft.includes(x)), soft, allModules: allMods, star3: st ? { helper: st[1], args } : null,
    };
  }
  return out;
}

// ------------------------------------------------------------------------------------------------------------------------------ the untaught rule: which mechanics a def carries
// Field sets are the ones of the three missions_outline.md section 0.3 tables, over the def schema of spec/M 3.4 (layer, armorFace, eshield, charge, brace, ranged.{mag,pen,suppress,arc,minRange,structDmg,craterMode,payload,homing},
// abilities[{id, effect|kind|mode}]). They become exact when validateDef lands (M0); until then context.units[].carries exists only when src/content/era_<id>/stats.js does.
const ab = (d, id, f) => (d.abilities || []).some((a) => a.id === id && (!f || f(a)));
const rg = (d) => d.ranged || {};
export const CARRIES = {
  medieval: {
    brace: (d) => d.brace !== undefined || (d.tags || []).includes('pike'), colours: (d) => ab(d, 'aura', (a) => a.effect === 'banner'), bolts: (d) => rg(d).pen >= 0.5 || rg(d).mag !== undefined,
    charge: (d) => d.charge !== undefined || ab(d, 'summon_on_death', (a) => a.mode === 'bailout'), gates: (d) => rg(d).structDmg >= 1 || (d.melee && d.melee.structDmg >= 1) || (d.tags || []).includes('ram'),
    healers: (d) => ab(d, 'heal_pulse') || ab(d, 'aura', (a) => a.effect === 'heal'), fire: (d) => rg(d).type === 'fire' || (rg(d).payload && rg(d).payload.effect === 'fire') || (d.tags || []).includes('fire'), arc: (d) => rg(d).arc === 'high', air: (d) => d.layer === 'air',
  },
  modern: {
    reload: () => false, cover: () => false, pin: (d) => (rg(d).suppress && rg(d).suppress.amt > 0.1) || ab(d, 'aura', (a) => a.effect === 'pinfield'), armour: (d) => d.armorFace !== undefined,
    shells: (d) => rg(d).arc === 'high' || rg(d).minRange !== undefined || rg(d).craterMode !== undefined || ab(d, 'call_strike'), mines: (d) => ab(d, 'lay_mine'), air: (d) => d.layer === 'air', repair: (d) => ab(d, 'heal_pulse'),
  },
  scifi: {
    shield: (d) => d.eshield !== undefined, hover: (d) => d.layer === 'hover', cloak: (d) => ab(d, 'cloak') || ab(d, 'detect'), emp: (d) => ab(d, 'cc_field', (a) => a.effect === 'emp'),
    blink: (d) => ab(d, 'dash', (a) => a.kind === 'blink'), strike: (d) => ab(d, 'call_strike'), repair: (d) => ab(d, 'heal_pulse'), air: (d) => d.layer === 'air',
  },
  ancient: {},
};
/** The mechanic ids of an era that a real def carries (sorted). */
export function carriesOf(def, era) { const t = CARRIES[era] || {}; return Object.keys(t).filter((m) => t[m](def)).sort(); }

// ------------------------------------------------------------------------------------------------------------------------------ context builders
function sharedFromSpecM(root) {
  const p = path.join(root === ROOT ? DOCS : root, 'docs/eras/spec/M.md');
  if (!exists(p)) throw new Error('docs/eras/spec/M.md missing: cannot read the module landing order');
  const m = parseModules(read(p));
  return { modules: m.modules, eFreeze: m.eFreeze, freezeSets: m.freezeSets };
}

async function importFresh(root, rel) { return import(pathToFileURL(path.join(root, rel)).href); }

export async function buildAncientContext(root = ROOT) {
  const stats = await importFresh(root, 'src/content/era_ancient/stats.js');
  const gen = await importFresh(root, 'src/world/gen.js');
  const arena = await importFresh(root, 'src/world/arena.js');
  const props = await importFresh(root, 'src/content/era_ancient/props/catalog.js');
  const gp = await importFresh(root, 'src/sim/godpowers.js');
  const mut = await importFresh(root, 'src/sim/mutators.js');
  const reg = await importFresh(root, 'src/content/era_ancient/parts/_registry.js');
  const form = await importFresh(root, 'src/sim/formations.js');
  const surv = await importFresh(root, 'src/content/era_ancient/survival.js');
  const pz = await importFresh(root, 'src/content/era_ancient/puzzles.js');
  const txt = await importFresh(root, 'src/content/era_ancient/campaign_text.js');
  const camp = await importFresh(root, 'src/content/era_ancient/campaign.js');
  const shared = sharedFromSpecM(root);
  const T = stats.STAT_TABLE, ids = Object.keys(T).sort();
  const units = {}; const abilities = new Set();
  for (const id of ids) {
    const d = T[id]; const ab = (d.abilities || []).map((a) => a.id).filter(Boolean); ab.forEach((a) => abilities.add(a));
    units[id] = { faction: d.faction, role: d.role, tags: (d.tags || []).slice().sort(), abilities: ab, cost: d.cost, hp: d.hp };
  }
  const propsOut = {}; for (const id of Object.keys(props.PROP_CATALOG).sort()) { const p = props.PROP_CATALOG[id]; propsOut[id] = { cat: p.cat, hp: p.hp === undefined ? null : p.hp }; }
  const recipes = {}; for (const id of gen.RECIPES.slice().sort()) recipes[id] = {};
  return {
    contextVersion: CONTEXT_VERSION, era: 'ancient', source: 'real', currency: { id: 'drachma', name: 'drachmae', symbol: 'dr' },
    factions: Object.keys(stats.FACTIONS).sort().concat(['mixed']), units, abilities: Array.from(abilities).sort(), heroes: ids.filter((i) => T[i].role === 'hero'),
    recipes, sizes: arena.SIZES, props: propsOut, bosses: surv.BOSS_IDS.slice(), godPowers: gp.GOD_POWERS.map((g) => g.id), mutators: mut.mutatorIds(),
    unlocks: Object.keys(reg.UNLOCKS).sort(), rewardParts: Object.keys(txt.REWARD_PARTS).sort(), weather: arena.WEATHERS.slice(), formations: form.FORMATIONS.slice(),
    puzzles: pz.PUZZLES.map((p) => ({ id: p.id, arena: p.arena.recipe, size: p.arena.size, seed: p.arena.seed, roster: p.player.roster.slice(), budget: p.player.budget, par: p.par, title: p.title })),
    ladder: [], missionIds: camp.MISSIONS.map((m) => m.id), mutatorStars: camp.MUTATOR_STARS,
    modules: shared.modules, eFreeze: shared.eFreeze,
  };
}

export async function buildMarkdownContext(era, root = ROOT) {
  const dir = path.join(root === ROOT ? DOCS : root, 'docs/eras/design', era);
  const need = (f) => { const p = path.join(dir, f); if (!exists(p)) throw new Error('missing ' + path.relative(root, p)); return read(p); };
  const opt = (f) => { const p = path.join(dir, f); return exists(p) ? read(p) : ''; };
  const shared = sharedFromSpecM(root);
  const units = parseRoster(need('rosters.md'));
  const arenasMd = need('arenas.md');
  const arenas = parseArenas(arenasMd);
  const props = parseProps(need('props.md'));
  const bosses = parseBosses(need('boss_table.md'));
  const puzzles = parsePuzzles(need('puzzles.md'), new Set(Object.keys(units)));
  const ladder = parseLadder(arenasMd);
  const gpText = opt('god_powers.md'), mutText = opt('mutators_achievements.md');
  const godPowers = parseHeadingIds(gpText, /^###\s+Slot\s+\d+:\s+`([a-z][a-z0-9_]*)`/);
  const mutators = parseHeadingIds(mutText, /^###\s+1\.\d+\s+`([a-z][a-z0-9_]*)`/);
  const ftm = parseFirstThree(opt('first_three_minutes.md'));
  const outline = parseOutline(opt('missions_outline.md'));
  let source = 'markdown';
  // real stats win once the era's stats.js exists (costs, abilities, roles are then the shipped numbers)
  const sp = path.join(root, 'src/content/era_' + era, 'stats.js');
  if (exists(sp)) {
    try {
      const st = await import(pathToFileURL(sp).href);
      for (const id of Object.keys(st.STAT_TABLE || {})) { const d = st.STAT_TABLE[id]; const u = units[id] || (units[id] = { name: '', faction: d.faction, role: d.role, tags: [], abilities: [], cost: null, firstMission: '', height: '', rig: '', aiStyle: '' }); u.cost = d.cost; u.role = d.role; u.faction = d.faction; u.hp = d.hp; u.abilities = (d.abilities || []).map((a) => a.id).filter(Boolean); u.tags = (d.tags || []).slice().sort(); u.carries = carriesOf(d, era); }
      source = 'real+markdown';
    } catch (e) { throw new Error('src/content/era_' + era + '/stats.js exists but does not import: ' + e.message); }
  }
  const factions = uniq(Object.values(units).map((u) => u.faction).filter(Boolean)).sort();
  const abilities = uniq([].concat(...Object.values(units).map((u) => u.abilities))).sort();
  const heroes = Object.keys(units).filter((i) => units[i].role === 'hero').sort();
  const cur = { medieval: { id: 'groat', name: 'groats', symbol: 'gr' }, modern: { id: 'requisition', name: 'requisitions', symbol: 'rq' }, scifi: { id: 'erg', name: 'ergs', symbol: 'ergs' } }[era];
  const sortKeys = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  return {
    contextVersion: CONTEXT_VERSION, era, source, currency: cur, factions: factions.concat(['mixed']), units: sortKeys(units), abilities, heroes,
    recipes: sortKeys(arenas), sizes: { small: 128, medium: 192, large: 256 }, props: sortKeys(props), bosses, godPowers, mutators, unlocks: [], rewardParts: [],
    weather: null, formations: null, puzzles, ladder, firstThree: ftm, outline, modules: shared.modules, eFreeze: shared.eFreeze,
  };
}

/** Fills the global lists the markdown contexts share with the real engine (weather, formations) so every context is self-contained. */
async function fillGlobals(ctx, root) {
  if (ctx.formations && ctx.weather) return ctx;
  const form = await importFresh(root, 'src/sim/formations.js');
  const arena = await importFresh(root, 'src/world/arena.js');
  ctx.formations = form.FORMATIONS.slice();
  ctx.weather = arena.WEATHERS.slice();
  return ctx;
}

export async function buildContext(era, o = {}) {
  const root = o.root || ROOT;
  if (!ERAS.includes(era)) throw new Error('unknown era ' + era);
  const ctx = era === 'ancient' ? await buildAncientContext(root) : await buildMarkdownContext(era, root);
  return fillGlobals(ctx, root);
}
export const contextPath = (era, root = DOCS) => path.join(root, 'docs/eras/design', era, 'context.json');

// ------------------------------------------------------------------------------------------------------------------------------ CLI
async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true]; }));
  const eras = args.era === 'all' || !args.era ? ERAS : String(args.era).split(',');
  let bad = 0;
  for (const era of eras) {
    const ctx = await buildContext(era);
    const text = stableStringify(ctx);
    const file = args.out ? path.join(String(args.out), era + '.context.json') : contextPath(era, args.write ? ROOT : DOCS);
    if (args.summary || !(args.write || args.check)) console.log(era + ': ' + Object.keys(ctx.units).length + ' units, ' + ctx.factions.length + ' factions, ' + Object.keys(ctx.recipes).length + ' arenas, ' + Object.keys(ctx.props).length + ' props, ' + ctx.puzzles.length + ' puzzles, ' + ctx.bosses.length + ' bosses, ' + ctx.godPowers.length + ' god powers, ' + ctx.mutators.length + ' mutators, ladder ' + ctx.ladder.length + ' (' + ctx.source + ')');
    if (args.write) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); console.log('wrote ' + path.relative(ROOT, file)); }
    if (args.check) {
      const have = exists(file) ? read(file) : null;
      if (have !== text) { bad++; console.error('ms_context: ' + path.relative(ROOT, file) + ' is ' + (have == null ? 'missing' : 'stale') + ' (run: node tools/ms_context.mjs --era=' + era + ' --write)'); }
      else console.log('ms_context: ' + era + ' context.json is current');
    }
  }
  process.exit(bad ? 1 : 0);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.stack || e.message); process.exit(2); });
