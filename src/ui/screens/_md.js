// A small, safe Markdown renderer for the generated credits (window.__VW_CREDITS__). DOM nodes only; never innerHTML.
// Supports: # headings, paragraphs, - / * / 1. lists, | tables |, --- rules, **bold**, *em*, `code`, [text](https://link) (http/https only, opens in a new tab).
import { h } from '../kit.js';

const SAFE_URL = /^https?:\/\/[^\s<>"']+$/i;

export function inline(text) {
  const out = [];
  let i = 0, buf = '';
  const flush = () => { if (buf) { out.push(document.createTextNode(buf)); buf = ''; } };
  while (i < text.length) {
    const rest = text.slice(i);
    let m;
    if ((m = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest))) {
      flush();
      if (SAFE_URL.test(m[2])) out.push(h('a', { href: m[2], target: '_blank', rel: 'noopener noreferrer' }, m[1]));
      else out.push(document.createTextNode(m[1]));
      i += m[0].length; continue;
    }
    if ((m = /^\*\*([^*]+)\*\*/.exec(rest))) { flush(); out.push(h('strong', {}, m[1])); i += m[0].length; continue; }
    if ((m = /^`([^`]+)`/.exec(rest))) { flush(); out.push(h('code', {}, m[1])); i += m[0].length; continue; }
    if ((m = /^\*([^*\s][^*]*)\*/.exec(rest))) { flush(); out.push(h('em', {}, m[1])); i += m[0].length; continue; }
    if ((m = /^(https?:\/\/[^\s<>"')\]]+)/.exec(rest))) {
      flush();
      const url = m[1].replace(/[.,;:!?]+$/, ''), tail = m[1].slice(url.length);
      out.push(h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, url));
      if (tail) out.push(document.createTextNode(tail));
      i += m[0].length; continue;
    }
    buf += text[i]; i++;
  }
  flush();
  return out;
}

const splitRow = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

/** Render markdown text into a DocumentFragment-like div. Returns { el, tables, rows } for filtering. */
export function renderMarkdown(src) {
  const el = h('div', { class: 'vw-md' });
  const lines = String(src || '').replace(/\r/g, '').split('\n');
  const tables = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = /^(#{1,4})\s+(.*)$/.exec(line))) { const lvl = Math.min(4, m[1].length) + 1; el.appendChild(h('h' + Math.min(5, lvl + 0), { class: 'vw-md__h vw-md__h' + m[1].length }, ...inline(m[2]))); i++; continue; }
    if (/^---+\s*$/.test(line)) { el.appendChild(h('hr', { class: 'vw-divider' })); i++; continue; }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].indexOf('-') >= 0) {
      const head = splitRow(line); i += 2;
      const body = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { body.push(splitRow(lines[i])); i++; }
      const tbl = h('table', { class: 'vw-table' },
        h('thead', {}, h('tr', {}, ...head.map((c) => h('th', { scope: 'col' }, ...inline(c))))),
        h('tbody', {}, ...body.map((r) => h('tr', {}, ...head.map((_, k) => h('td', {}, ...inline(r[k] || '')))))));
      el.appendChild(h('div', { class: 'vw-table-wrap vw-scroll', tabindex: '0', role: 'region', 'aria-label': 'Table' }, tbl));
      tables.push(tbl);
      continue;
    }
    if (/^\s*([-*])\s+/.test(line)) {
      const ul = h('ul', { class: 'vw-md__ul' });
      for (;;) {
        // one item: the marker line + indented continuation lines (a trailing double space means a hard line break)
        const parts = [lines[i].replace(/^\s*[-*]\s+/, '')]; const brk = [/ {2}$/.test(lines[i])]; i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i])) { parts.push(lines[i].trim()); brk.push(/ {2}$/.test(lines[i])); i++; }
        const li = h('li', {});
        parts.forEach((p, k) => { li.append(...inline(p.trim())); if (k < parts.length - 1) li.appendChild(brk[k] ? h('br') : document.createTextNode(' ')); });
        ul.appendChild(li);
        let j = i; while (j < lines.length && !lines[j].trim()) j++;
        if (j < lines.length && /^\s*([-*])\s+/.test(lines[j])) i = j; else break;
      }
      el.appendChild(ul); continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const ol = h('ol', { class: 'vw-md__ul' });
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { ol.appendChild(h('li', {}, ...inline(lines[i].replace(/^\s*\d+[.)]\s+/, '')))); i++; }
      el.appendChild(ol); continue;
    }
    const para = [line.trim()]; i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|---|\s*\||\s*[-*]\s+|\s*\d+[.)]\s+)/.test(lines[i])) { para.push(lines[i].trim()); i++; }
    el.appendChild(h('p', { class: 'vw-md__p' }, ...inline(para.join(' '))));
  }
  return { el, tables };
}
