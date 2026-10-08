// ER roll-up library of the criteria registry (VF 3.4; owner TOOLS-VERIFY). Pure functions plus the file readers; no side effects.
//   parseErTable(md)        VF 3.2 table  -> tools/lib/er_table.json   (REQUIRED members of every ER: ids, script paths, script stems)
//   scanManifest(root)      static scan of `criterion('<id>'` calls (code only, never inside strings/templates/comments) + the criteria that negative
//                           controls name for a script that registers its ids dynamically -> tools/lib/criteria_manifest.json
//   finalizeCriteria(doc)   adds U1 (declared, not executed although the run's tier >= the member's tier) and the ER roll-up to a merged criteria.json
//   er_aliases.json         {aliases:{'WC01':'VF-G2'}}: a table id that is registered under another id (the table says `WC01=G2`)
//   rollup(...)             the status rules of VF 3.4: FAIL > UNVERIFIED > PARTIAL(x/y) > PANEL > PASS
// Nothing here reads the clock or the machine: the same inputs always give the same bytes (the manifest and the table are committed and checked for drift).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const TIERS = ['fast', 'era', 'full', 'release', 'heavy'];
/** 'T-fast' | 'fast' | 'F' | 'T-era' ... -> rank 0..4 (unknown -> 0). */
export function tierRank(t) {
  if (t == null) return 0;
  const s = String(t).replace(/^T-/, '').toLowerCase();
  const letters = { f: 'fast', e: 'era', u: 'full', r: 'release', h: 'heavy' };
  const k = TIERS.includes(s) ? s : letters[s] || 'fast';
  return TIERS.indexOf(k);
}
export const tierName = (rank) => (rank <= 0 ? 'T-fast' : rank === 1 ? 'T-era' : rank === 2 ? 'T-full' : rank === 3 ? 'release' : 'heavy');
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

// ---------------------------------------------------------------------------------------------------------------- ER natural order
export function erCompare(a, b) {
  const pa = /^ER(\d+)([a-z]?)$/.exec(a), pb = /^ER(\d+)([a-z]?)$/.exec(b);
  if (pa && pb) return +pa[1] - +pb[1] || (pa[2] < pb[2] ? -1 : pa[2] > pb[2] ? 1 : 0);
  if (pa) return -1;
  if (pb) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

// ---------------------------------------------------------------------------------------------------------------- the ER table of VF 3.2
/** Expand criterion-id tokens of a "script(s) / members" cell: `AR-T01..T05, T11`, `RA-T11/T15/T18..T20`, `WC10..WC15`, `WC01=G2`. */
export function expandIds(cell) {
  const ids = [];
  let prefix = '';
  const re = /(?:([A-Z]{2,3})-)?(T|WC)(\d+)(?:\.\.(?:(?:[A-Z]{2,3}-)?(?:T|WC))?(\d+))?/g;
  let m;
  while ((m = re.exec(cell))) {
    // a bare token (`T11`) inherits the prefix of the token before it; `WC` carries its own
    const kind = m[2];
    const pre = kind === 'WC' ? 'WC' : (m[1] ? m[1] + '-T' : prefix || 'T');
    if (kind === 'T' && m[1]) prefix = m[1] + '-T';
    // the character before a bare "T" must not be a letter (guards "CT12" style accidents)
    const before = cell[m.index - 1];
    if (!m[1] && before && /[A-Za-z]/.test(before)) continue;
    const width = m[3].length;
    const from = +m[3], to = m[4] ? +m[4] : from;
    if (to < from) continue;
    for (let n = from; n <= to; n++) ids.push(pre + String(n).padStart(width, '0'));
  }
  return [...new Set(ids)];
}

/** Script paths (`tests/...mjs`, `tools/...mjs`, with * globs) and bare stems (`g3_ids`) named in backticks of a cell. Prose in parentheses that merely mentions files
 *  ("today credits are touched only by `tests/humor/text.test.mjs`") is not a member list and is dropped first. A bare file name inherits the directory of the path before it. */
export function scriptTokens(cell) {
  const text = cell.replace(/\([^()]*\b(?:today|touched|verified by grep)\b[^()]*\)/g, ' ');
  const scripts = [], stems = [];
  let lastDir = '';
  for (const m of text.matchAll(/`([^`]+)`/g)) {
    const t = m[1];
    const p = /^([\w./*-]+\.(?:mjs|js))\b/.exec(t);
    if (p) {
      let f = p[1];
      if (!f.includes('/') && lastDir) f = lastDir + f;
      if (f.includes('/')) { scripts.push(f); lastDir = f.slice(0, f.lastIndexOf('/') + 1); }
      continue;
    }
    if (/^[a-z][a-z0-9]*_[a-z0-9_]*$/.test(t.trim())) stems.push(t.trim());
  }
  return { scripts: [...new Set(scripts)], stems: [...new Set(stems)] };
}

/** "NC-VF-09, 12, 44" / "NC-VF-27..32, 57" / "NC-VF-61" -> ['NC-VF-09','NC-VF-12',...] */
export function negIds(cell) {
  const i = cell.indexOf('NC-VF-');
  if (i < 0) return [];
  const out = [];
  for (const m of cell.slice(i + 6).matchAll(/(\d+)(?:\.\.(\d+))?/g)) { const a = +m[1], b = m[2] ? +m[2] : a; for (let n = a; n <= b; n++) out.push('NC-VF-' + String(n).padStart(2, '0')); }
  return [...new Set(out)];
}

export function parseErTable(md, source = 'docs/eras/spec/VF.md') {
  const rows = [];
  for (const line of md.split('\n')) {
    if (!/^\|\s*ER\d+b?\s*\|/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 8) throw new Error(`ER table row has ${cells.length} cells, expected 8: ${line.slice(0, 60)}`);
    const [er, criterion, scriptCell, owner, first, tier, thresholds, negctl] = cells;
    const { scripts, stems } = scriptTokens(scriptCell);
    rows.push({
      er, criterion, owner, first, tier,
      ids: expandIds(scriptCell.replace(/`[^`]*`/g, ' ')),
      scripts, stems,
      negctl: negIds(negctl),
      thresholds: thresholds.replace(/\s+/g, ' ').slice(0, 400),
    });
  }
  // the criteria column of "ER6 ... 3b" rows can repeat; ER ids must be unique
  const seen = new Set();
  for (const r of rows) { if (seen.has(r.er)) throw new Error('duplicate ER row ' + r.er); seen.add(r.er); }
  rows.sort((a, b) => erCompare(a.er, b.er));
  return { schema: 1, source, rows };
}

// ---------------------------------------------------------------------------------------------------------------- code mask (a tiny JS lexer)
/** 1 where the character is code, 0 inside comments, string/template text and regex literals. Good enough to find real calls. */
export function codeMask(src) {
  const n = src.length, mask = new Uint8Array(n);
  let i = 0, prev = '', lastWord = '', depth = 0;
  const tpl = [];
  const REGEX_AFTER = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);
  const KW_BEFORE_REGEX = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new', 'else', 'do']);
  function scanTemplate(j) {                         // j is just after the opening backtick or after a closing } of ${...}
    while (j < n) {
      const c = src[j];
      if (c === '\\') { j += 2; continue; }
      if (c === '`') return j + 1;
      if (c === '$' && src[j + 1] === '{') { tpl.push(depth); depth++; return j + 2; }
      j++;
    }
    return j;
  }
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '"' || c === "'") {
      i++;
      while (i < n && src[i] !== c && src[i] !== '\n') { if (src[i] === '\\') i++; i++; }
      i++; prev = 'a'; lastWord = ''; continue;
    }
    if (c === '`') { i = scanTemplate(i + 1); prev = 'a'; lastWord = ''; continue; }
    if (c === '/') {
      if (REGEX_AFTER.has(prev) || KW_BEFORE_REGEX.has(lastWord)) {
        i++;
        let cls = false;
        while (i < n && src[i] !== '\n') {
          const k = src[i];
          if (k === '\\') { i += 2; continue; }
          if (k === '[') cls = true; else if (k === ']') cls = false; else if (k === '/' && !cls) break;
          i++;
        }
        i++;
        while (i < n && /[a-z]/i.test(src[i])) i++;
        prev = 'a'; lastWord = ''; continue;
      }
      mask[i] = 1; prev = '/'; lastWord = ''; i++; continue;
    }
    if (c === '{') { depth++; }
    else if (c === '}') {
      depth--;
      if (tpl.length && depth === tpl[tpl.length - 1]) { tpl.pop(); mask[i] = 0; i = scanTemplate(i + 1); continue; }
    }
    mask[i] = 1;
    if (/[A-Za-z0-9_$]/.test(c)) { let j = i; while (j < n && /[A-Za-z0-9_$]/.test(src[j])) { mask[j] = 1; j++; } lastWord = src.slice(i, j); prev = 'a'; i = j; continue; }
    if (!/\s/.test(c)) { prev = c; lastWord = ''; }
    i++;
  }
  return mask;
}

// ---------------------------------------------------------------------------------------------------------------- the criteria manifest
function balanced(src, open) {                         // src[open] is '(' or '{'; returns the index of the matching closer (code-agnostic but string-aware)
  const pairs = { '(': ')', '{': '}', '[': ']' };
  const stack = [];
  let i = open;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < n && src[i] !== q) { if (src[i] === '\\') i++; i++; } i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (pairs[c]) stack.push(pairs[c]);
    else if (c === ')' || c === '}' || c === ']') { if (stack.pop() !== c) return -1; if (!stack.length) return i; }
    i++;
  }
  return -1;
}
const litStr = (s, key) => { const m = new RegExp(`\\b${key}\\s*:\\s*(['"\`])([^'"\`\\n]*)\\1`).exec(s); return m ? m[2] : null; };
const litList = (s, key) => {
  const m = new RegExp(`\\b${key}\\s*:\\s*(\\[[^\\]]*\\]|(['"\`])[^'"\`\\n]*\\2)`).exec(s);
  if (!m) return null;
  const out = [...m[1].matchAll(/(['"`])([^'"`\n]*)\1/g)].map((x) => x[2]);
  return out.length ? out : null;
};

/** All `criterion('<id>', {...})` calls of one source text (code only). */
export function findCalls(src) {
  const mask = codeMask(src);
  const out = [];
  const re = /\bcriterion\s*\(\s*(['"`])([A-Za-z0-9_.:-]+)\1/g;
  let m;
  while ((m = re.exec(src))) {
    if (!mask[m.index]) continue;
    const open = src.indexOf('(', m.index);
    const close = balanced(src, open);
    const args = close > 0 ? src.slice(open, close + 1) : src.slice(open, open + 400);
    const metaStart = args.indexOf('{');
    const meta = metaStart >= 0 ? args.slice(metaStart) : '';
    const line = src.slice(0, m.index).split('\n').length;
    out.push({
      id: m[2], line,
      er: litList(meta, 'er'), owner: litStr(meta, 'owner'), tier: litStr(meta, 'tier'), negctl: litStr(meta, 'negctl'),
      judge: litStr(meta, 'judge'), engine: litStr(meta, 'engine'),
    });
  }
  return out;
}

function walk(root, dir, out, skip) {
  let ents = [];
  try { ents = fs.readdirSync(path.join(root, dir), { withFileTypes: true }); } catch { return; }
  for (const e of ents.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const rel = dir ? dir + '/' + e.name : e.name;
    if (e.isDirectory()) { if (!skip.some((s) => rel === s || rel.startsWith(s + '/')) && e.name !== 'node_modules' && e.name !== '.cache') walk(root, rel, out, skip); }
    else if (/\.(mjs|js)$/.test(e.name) && !skip.includes(rel)) out.push(rel);
  }
}

/**
 * Static manifest of every criterion the tree can register.
 * Skipped: tests/fixtures/** (synthetic checks for the tools' own tests), tests/negctl/** (controls register nothing), tests/lib/criteria.mjs itself.
 * Criteria registered through a variable id (`crit('MS-T01')` helpers) are found through the negative control that names them: that file's
 * `run` script is their file (source: 'negctl'), provided the script text contains the id as a quoted string.
 */
export async function scanManifest(root, { importNegctl = true } = {}) {
  const files = [];
  const skip = ['tests/fixtures', 'tests/negctl', 'tests/lib/criteria.mjs', 'tools/lib/criteria_manifest.json'];
  for (const d of ['tests', 'tools']) walk(root, d, files, skip);
  const by = new Map();
  for (const f of files) {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    if (!src.includes('criterion')) continue;
    for (const c of findCalls(src)) {
      const prev = by.get(c.id);
      if (prev) { prev.dup = [...(prev.dup || []), f]; continue; }
      by.set(c.id, { id: c.id, file: f, line: c.line, er: c.er, owner: c.owner, tier: c.tier, negctl: c.negctl, judge: c.judge, engine: c.engine, source: 'literal' });
    }
  }
  if (importNegctl) {
    const dir = path.join(root, 'tests/negctl');
    let names = []; try { names = fs.readdirSync(dir).filter((x) => x.endsWith('.mjs')).sort(); } catch { /* none */ }
    for (const n of names) {
      let nc; try { nc = (await import(pathToFileUrl(path.join(dir, n)))).default; } catch { continue; }
      if (!nc || !nc.criterion || by.has(nc.criterion)) continue;
      const script = Array.isArray(nc.run) ? nc.run.find((a, i) => i > 0 && /\.(mjs|js)$/.test(a)) : null;
      if (!script || !fs.existsSync(path.join(root, script))) continue;
      const text = fs.readFileSync(path.join(root, script), 'utf8');
      if (!text.includes(`'${nc.criterion}'`) && !text.includes(`"${nc.criterion}"`) && !text.includes(`\`${nc.criterion}\``)) continue;   // the script must at least name the id (a stale control for a removed criterion is not a criterion)
      by.set(nc.criterion, { id: nc.criterion, file: script, line: 0, er: null, owner: null, tier: nc.tier || null, negctl: 'tests/negctl/' + nc.criterion + '.mjs', judge: null, engine: null, source: 'negctl' });
    }
  }
  const list = [...by.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { schema: 1, criteria: list };
}
function pathToFileUrl(p) { return new URL('file://' + path.resolve(p).split(path.sep).map(encodeURIComponent).join('/').replace(/%2F/g, '/')).href; }

export const stable = (o) => JSON.stringify(o, null, 1) + '\n';
export const manifestHash = (m) => sha256(JSON.stringify(m)).slice(0, 16);

// ---------------------------------------------------------------------------------------------------------------- panel acceptance
/** docs/eras/panel_acceptance.md rows: `| <criterion id> | yes | <signer> | <date> |` (accepted = yes and a signer). */
export function parsePanelAcceptance(md) {
  const ok = new Set();
  for (const line of (md || '').split('\n')) {
    const c = line.split('|').slice(1, -1).map((x) => x.trim());
    if (c.length >= 3 && /^[A-Za-z0-9_.:-]+$/.test(c[0]) && /^yes$/i.test(c[1]) && c[2] && !/^-+$/.test(c[2])) ok.add(c[0]);
  }
  return ok;
}

// ---------------------------------------------------------------------------------------------------------------- roll-up
const MEMBER_OK = new Set(['PASS']);
function matchGlob(pattern, file) {
  if (!pattern.includes('*')) return pattern === file;
  const re = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0001').replace(/\*/g, '[^/]*').replace(/\u0001/g, '.*') + '$');
  return re.test(file);
}

/**
 * @param {{criteria:object, manifest:{criteria:object[]}|null, erTable:{rows:object[]}|null, runTierRank:number, panelAccepted?:Set<string>, fileExists?:(p:string)=>boolean}} a
 * @returns {{er:object, stubs:object}}  er[...] = {status, members, missing, requiredTier, reason, counts};  stubs = U1 entries to add to `criteria`
 */
export function rollup({ criteria, manifest, erTable, runTierRank, panelAccepted = new Set(), fileExists = () => false, aliases = {} }) {
  const man = new Map((manifest ? manifest.criteria : []).map((c) => [c.id, c]));
  const stubs = {};
  // U1: declared in the manifest, absent from the run although the run's tier >= the member's tier
  for (const c of man.values()) {
    if (criteria[c.id]) continue;
    if (tierRank(c.tier) <= runTierRank) stubs[c.id] = { er: c.er, owner: c.owner, tier: c.tier, status: 'UNVERIFIED', reason: 'U1 not executed', assertions: 0, failures: [], notExecuted: true, file: c.file };
  }
  const all = { ...criteria, ...stubs };
  // group -> members
  const groups = new Map();
  const group = (g) => { if (!groups.has(g)) groups.set(g, { ids: new Set(), required: new Set(), scripts: [], stems: [], row: null }); return groups.get(g); };
  const erList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  for (const [id, c] of Object.entries(all)) for (const g of erList(c.er)) group(g).ids.add(id);
  for (const c of man.values()) for (const g of erList(c.er)) group(g).ids.add(c.id);
  if (erTable) for (const r of erTable.rows) {
    const g = group(r.er);
    g.row = r;
    for (const id of r.ids) { const a = aliases[id] || id; g.ids.add(a); g.required.add(a); }
    g.scripts = r.scripts; g.stems = r.stems;
  }
  const er = {};
  const manFiles = [...man.values()].map((c) => c.file);
  for (const [name, g] of [...groups.entries()].sort((a, b) => erCompare(a[0], b[0]))) {
    const members = [...g.ids].sort();
    const missing = [];
    const reasons = [];
    // scripts named by the table must exist and register at least one criterion
    for (const s of g.scripts) {
      const hit = manFiles.filter((f) => matchGlob(s, f));
      if (hit.length) { for (const f of hit) for (const c of man.values()) if (c.file === f) g.ids.add(c.id); continue; }
      missing.push(s.includes('*') || fileExists(s) ? `script:${s} (registers no criterion)` : `script:${s} (not built)`);
    }
    for (const st of g.stems) {
      const hit = manFiles.filter((f) => new RegExp(`/${st}(\\.slow)?(\\.test)?\\.mjs$`).test(f));
      if (!hit.length) missing.push(`script:${st} (not built)`);
      else for (const f of hit) for (const c of man.values()) if (c.file === f) g.ids.add(c.id);
    }
    const mem = [...g.ids].sort();
    let fail = 0, unv = 0, ok = 0, panel = 0, panelNo = 0, partial = 0;
    const out = [];
    for (const id of mem) {
      const c = all[id];
      if (!c) {
        const m = man.get(id);
        // declared but belonging to a tier above this run: not judged here (PARTIAL); required by the table but not built: missing
        if (m) partial++; else { missing.push(id + ' (not built)'); unv++; }
        continue;
      }
      if (c.status === 'FAIL') { fail++; out.push(`${id} FAIL`); }
      else if (c.status === 'UNVERIFIED') { unv++; out.push(`${id} ${c.reason || 'UNVERIFIED'}`); }
      else if (c.status === 'PANEL') { if (panelAccepted.has(id)) ok++; else { panel++; panelNo++; } }
      else if (MEMBER_OK.has(c.status)) ok++;
      else unv++;
    }
    let status, reason;
    if (fail) { status = 'FAIL'; reason = `${fail} member(s) FAIL`; }
    else if (unv || missing.length) { status = 'UNVERIFIED'; reason = [...out.slice(0, 3), ...missing.slice(0, 3).map((x) => 'missing ' + x)].join('; ') || 'unverified members'; }
    else if (partial) { status = `PARTIAL(${ok + panel}/${mem.length})`; reason = `${partial} member(s) belong to a tier above this run`; }
    else if (panelNo) { status = 'PANEL'; reason = `${panelNo} member(s) judged by models, not accepted by a signed row in docs/eras/panel_acceptance.md`; }
    else if (!mem.length) { status = 'UNVERIFIED'; reason = 'no member registered'; }
    else { status = 'PASS'; reason = ''; }
    const rank = Math.max(0, ...mem.map((id) => tierRank((all[id] || man.get(id) || {}).tier)));
    er[name] = {
      status, members: mem, missing: [...new Set(missing)].sort(), requiredTier: tierName(rank), reason,
      counts: { pass: ok, fail, unverified: unv + missing.length, panel, partial },
      ...(g.row ? { criterion: g.row.criterion, owner: g.row.owner, first: g.row.first } : {}),
    };
  }
  return { er, stubs };
}

// ---------------------------------------------------------------------------------------------------------------- finalize a merged criteria.json
export function readJsonSafe(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }

/**
 * Called by writeCriteria (tools/lib/criteria_merge.mjs) with the merged doc: removes the stubs of an earlier pass, adds U1 stubs and the ER roll-up.
 * Reads tools/lib/criteria_manifest.json and er_table.json of `root` (a gate run sees its snapshot). Without them the doc is left as it is.
 */
export function finalizeCriteria(doc, root) {
  if (!doc || !root) return doc;
  const manifest = readJsonSafe(path.join(root, 'tools/lib/criteria_manifest.json'));
  const erTable = readJsonSafe(path.join(root, 'tools/lib/er_table.json'));
  if (!manifest && !erTable) return doc;
  for (const [id, c] of Object.entries(doc.criteria)) if (c.notExecuted) delete doc.criteria[id];
  const tiers = (doc.run && (doc.run.tiers || [doc.run.tier])) || ['fast'];
  const runTierRank = Math.max(...tiers.map(tierRank));
  let panelAccepted = new Set();
  try { panelAccepted = parsePanelAcceptance(fs.readFileSync(path.join(root, 'docs/eras/panel_acceptance.md'), 'utf8')); } catch { /* none */ }
  const aliases = (readJsonSafe(path.join(root, 'tools/lib/er_aliases.json')) || {}).aliases || {};
  const { er, stubs } = rollup({ criteria: doc.criteria, manifest, erTable, runTierRank, panelAccepted, aliases, fileExists: (p) => fs.existsSync(path.join(root, p)) });
  Object.assign(doc.criteria, stubs);
  doc.er = er;
  doc.manifest = manifest ? { path: 'tools/lib/criteria_manifest.json', count: manifest.criteria.length, hash: manifestHash(manifest) } : null;
  return doc;
}
