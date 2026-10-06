// Credits: studio joke list + libraries/fonts + animation honesty + the asset ledger rendered from window.__VW_CREDITS__ (markdown).
// Every link is a real <a target="_blank" rel="noopener noreferrer">.
import * as K from '../kit.js';
import { getT } from '../strings.js';
import { renderMarkdown } from './_md.js';

export const meta = { id: 'credits', layer: 'menu', music: 'menu', canvas: 'none' };

export function mount(root, ctx, params) {
  K.init(ctx);
  const T0 = getT(ctx), T = T0.credits;
  const cleanups = [];
  const link = (name, url) => K.h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', class: 'vw-credit-link' }, name, K.icon('external', { class: 'vw-credit-ext' }));

  const studio = K.tablet(T.sections.studio, K.h('div', { class: 'vw-col' }, K.h('p', { class: 'vw-epigraph', text: T.studioIntro }),
    K.h('dl', { class: 'vw-studio' }, ...T.studio.flatMap(([role, who]) => [K.h('dt', { text: role }), K.h('dd', { text: who })]))), { id: 'cr-studio', icon: 'star' });

  const libs = K.tablet(T.sections.libs, K.h('ul', { class: 'vw-list vw-libs' }, ...T.libsList.map((l) => K.h('li', { class: 'vw-lib' },
    K.h('div', { class: 'vw-grow' }, K.h('div', { class: 'vw-lib__name' }, link(l.name, l.url)), K.h('div', { class: 'vw-small vw-dim', text: l.note })),
    K.chip(l.lic, { variant: 'sky', class: 'vw-chip--wrap' })))), { id: 'cr-libs', icon: 'book' });

  const anim = K.tablet(T.sections.anim, K.h('div', { class: 'vw-col' }, K.h('p', { text: T.animText }),
    K.h('ul', { class: 'vw-list' }, ...T.animLinks.map((l) => K.h('li', { class: 'vw-lib' }, K.h('div', { class: 'vw-grow' }, link(l.name, l.url)), K.chip(l.lic, { variant: 'olive' }))))), { id: 'cr-anim', icon: 'hand' });

  // asset ledger (markdown from the build)
  const md = safeCredits();
  let ledger;
  const filterInput = K.searchBox({ id: 'cr-filter', label: 'Filter credits', placeholder: 'Filter by author, title or licence...' });
  if (md && md.trim()) {
    const r = renderMarkdown(md);
    const rowCount = r.tables.reduce((n, t) => n + t.tBodies[0].rows.length, 0) + r.el.querySelectorAll('li').length;
    const links = r.el.querySelectorAll('a').length;
    filterInput.input.addEventListener('input', () => {
      const q = filterInput.input.value.trim().toLowerCase();
      r.tables.forEach((t) => Array.from(t.tBodies[0].rows).forEach((tr) => { tr.hidden = !!q && tr.textContent.toLowerCase().indexOf(q) < 0; }));
      r.el.querySelectorAll('li').forEach((li) => { li.hidden = !!q && li.textContent.toLowerCase().indexOf(q) < 0; });
    });
    ledger = K.tablet(T.sections.audio, K.h('div', { class: 'vw-col' },
      K.h('div', { class: 'vw-row vw-wrapflex' }, K.chip(`${rowCount} entries`, { variant: 'gold' }), K.chip(`${links} links`, { variant: 'sky' }), K.h('span', { class: 'vw-small vw-dim', text: T.open })), filterInput, r.el), { id: 'cr-ledger', icon: 'music' });
  } else {
    ledger = K.tablet(T.sections.audio, K.emptyState({ icon: 'music', title: T.sections.ledger, text: T.noLedger }), { id: 'cr-ledger', icon: 'music' });
  }

  const frame = K.pageFrame({ id: 'cr', title: T.title, sub: T.sub, onBack: () => ctx.nav.back() });
  frame.content.appendChild(K.h('div', { class: 'vw-credits-wrap vw-col' }, K.h('div', { class: 'vw-credits' }, K.h('div', { class: 'vw-credits__col' }, studio, libs, anim), K.h('div', { class: 'vw-credits__col' }, ledger)),
    (T.footer && T.footer.length) ? K.h('div', { class: 'vw-credits__footer' }, ...T.footer.map((l) => K.h('p', { class: 'vw-epigraph', text: l }))) : null));
  frame.mount(root);
  K.enter(Array.from(frame.content.querySelectorAll('.vw-tablet')), 'pop', 0);
  cleanups.push(frame.destroy);
  return K.withExit(root, { destroy() { cleanups.forEach((f) => f()); }, onBack() { return K.hasModal(); } });
}

function safeCredits() { try { return typeof window !== 'undefined' ? window.__VW_CREDITS__ : ''; } catch (e) { return ''; } }
