// Small readers for the program documents (plan.md, spec/*.md, STATUS.md, traceability.md, cuts.md) shared by plan_lint, p0_exit and wbs (owner TOOLS-VERIFY).
// Pure functions over text; the only file access is readText/readJson.
import fs from 'fs';
import path from 'path';

export function readText(root, rel) { try { return fs.readFileSync(path.join(root, rel), 'utf8'); } catch { return null; } }
export function readJson(root, rel) { const t = readText(root, rel); if (t == null) return null; try { return JSON.parse(t); } catch { return null; } }
export const exists = (root, rel) => fs.existsSync(path.join(root, rel));

/** Split on the pipes of a table row, honouring `\|`. */
export function splitRow(line) {
  const cells = [];
  let cur = '';
  const s = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && s[i + 1] === '|') { cur += '|'; i++; continue; }
    if (s[i] === '|') { cells.push(cur.trim()); cur = ''; continue; }
    cur += s[i];
  }
  cells.push(cur.trim());
  return cells;
}

/** All markdown tables of a text: [{header:[..], rows:[[..]], line}] (the separator row is dropped; fenced code is skipped). */
export function tables(md) {
  const lines = md.split('\n');
  const out = [];
  let fence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) { fence = !fence; continue; }
    if (fence) continue;
    if (/^\s*\|/.test(lines[i]) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const header = splitRow(lines[i]);
      const rows = [];
      let j = i + 2;
      for (; j < lines.length && /^\s*\|/.test(lines[j]); j++) rows.push(splitRow(lines[j]));
      out.push({ header, rows, line: i + 1 });
      i = j - 1;
    }
  }
  return out;
}

/** Sections introduced by `## <num>. <title>` (level 2) or `### <num> <title>` when level = 3: [{num, title, line, body}]. body runs to the next heading of the same or higher level. */
export function sections(md, level = 2) {
  const lines = md.split('\n');
  const mark = '#'.repeat(level);
  const re = new RegExp(`^${mark}\\s+(\\d+(?:\\.\\d+)*)\\.?\\s+(.*)$`);
  const stop = new RegExp(`^#{1,${level}}\\s`);
  const out = [];
  let fence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) fence = !fence;
    if (fence) continue;
    const m = re.exec(lines[i]);
    if (!m) continue;
    let j = i + 1;
    let f2 = false;
    for (; j < lines.length; j++) { if (/^\s*```/.test(lines[j])) f2 = !f2; if (!f2 && stop.test(lines[j])) break; }
    out.push({ num: m[1], title: m[2].trim(), line: i + 1, body: lines.slice(i + 1, j).join('\n') });
  }
  return out;
}

/** Every heading number (`1`, `3.12`, `3.12.1`) of a document, any level, as a Set; used to resolve `section N` references. */
export function headingNumbers(md) {
  const set = new Set();
  let fence = false;
  for (const l of md.split('\n')) {
    if (/^\s*```/.test(l)) fence = !fence;
    if (fence) continue;
    const m = /^#{1,6}\s+(?:\*\*)?(\d+(?:\.\d+)*)\.?(?:\s|\*)/.exec(l);
    if (m) set.add(m[1]);
    const b = /^\*\*(\d+(?:\.\d+)+)[\s.*]/.exec(l);                // bold run-in headings such as "**3.12.5 Hosted honesty template"
    if (b) set.add(b[1]);
  }
  return set;
}

/** `N.k` for every numbered list item `k.` directly under a `## N.` section ("plan section 0.5" = item 5 of section 0). */
export function itemNumbers(md) {
  const set = new Set();
  let sec = null, fence = false;
  for (const l of md.split('\n')) {
    if (/^\s*```/.test(l)) fence = !fence;
    if (fence) continue;
    const h = /^##\s+(\d+)\./.exec(l);
    if (h) { sec = h[1]; continue; }
    if (/^##\s/.test(l)) { sec = null; continue; }
    const it = /^(\d+)\.\s/.exec(l);
    if (it && sec !== null) set.add(`${sec}.${it[1]}`);
  }
  return set;
}

/** Text with fenced blocks and inline code spans removed (for prose rules). */
export function proseOnly(md) {
  return md.split('\n').reduce((acc, l) => { if (/^\s*```/.test(l)) { acc.fence = !acc.fence; return acc; } if (!acc.fence) acc.lines.push(l.replace(/`[^`]*`/g, '')); return acc; }, { fence: false, lines: [] }).lines.join('\n');
}

/** First fenced block with the given tag ("```modules"), or null. */
export function fenced(md, tag) {
  const m = new RegExp('```' + tag + '\\s*\\n([\\s\\S]*?)\\n```').exec(md);
  return m ? m[1] : null;
}

/** Expand "ERA-MED/MOD/SF" -> ["ERA-MED","ERA-MOD","ERA-SF"]; plain tokens come back as they are. */
export function expandSlash(tok) {
  if (!tok.includes('/')) return [tok];
  const parts = tok.split('/');
  const first = parts[0];
  const cut = first.lastIndexOf('-');
  const stem = cut >= 0 ? first.slice(0, cut + 1) : '';
  return parts.map((p, i) => (i === 0 ? p : stem + p));
}
