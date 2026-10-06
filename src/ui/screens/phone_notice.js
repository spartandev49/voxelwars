// Phone notice for the editors: "Built for bigger screens" + a read-only look at the player's creations (no dead UI on phones).
import * as K from '../kit.js';
import { getT } from '../strings.js';
import { setThumb, safe } from './_shared.js';

export const meta = { id: 'phone_notice', layer: 'menu', music: 'menu', canvas: 'none' };

export function mount(root, ctx, params) {
  K.init(ctx);
  const T0 = getT(ctx), T = T0.phone;
  const cleanups = [];
  const which = (params && params.editor) === 'workshop' ? T0.title.workshop.name : T0.title.arena.name;
  const arenas = safe(() => ctx.save.arenas.list(), []);
  const soldiers = safe(() => ctx.save.soldiers.list(), []);

  const arenaList = arenas.length
    ? K.h('ul', { class: 'vw-list vw-ph__list' }, ...arenas.map((a) => {
      const img = K.h('img', { class: 'vw-ph__thumb', alt: '', width: 96, height: 54 });
      const fb = K.h('span', { class: 'vw-ph__thumb vw-hide' });
      if (a.thumb) { img.src = a.thumb; } else setThumb(img, ctx, 'arenalab', fb);
      return K.h('li', { class: 'vw-ph__item' }, img, fb, K.h('div', { class: 'vw-grow' }, K.h('div', { class: 'vw-card__name', text: a.name }), K.h('div', { class: 'vw-small vw-dim', text: a.desc || a.author || '' })));
    }))
    : K.h('p', { class: 'vw-note', text: T.emptyArenas });
  const soldierList = soldiers.length
    ? K.h('ul', { class: 'vw-list vw-ph__list' }, ...soldiers.map((s) => K.h('li', { class: 'vw-ph__item' }, K.h('span', { class: 'vw-card__art vw-ph__ico' }, K.icon('sword')), K.h('div', { class: 'vw-grow' }, K.h('div', { class: 'vw-card__name', text: s.name })))))
    : K.h('p', { class: 'vw-note', text: T.emptySoldiers });

  const notice = K.tablet(T.title, K.h('div', { class: 'vw-col' },
    K.h('div', { class: 'vw-ph__icon', 'aria-hidden': 'true' }, K.icon('tent')),
    K.h('p', { class: 'vw-ph__lead', text: `${which}: ${T.text}` }),
    K.h('div', { class: 'vw-row vw-wrapflex' },
      K.button(T.back, { icon: 'back', id: 'ph-back', sound: 'ui_back', onClick: () => ctx.nav.goto('title') }),
      K.button(T.play, { icon: 'sword', variant: 'primary', id: 'ph-quick', onClick: () => ctx.nav.goto('quick') }))), { id: 'ph-notice', icon: 'info', variant: 'gold' });
  const yours = K.tablet(T.yours, K.h('div', { class: 'vw-col' }, K.h('p', { class: 'vw-small vw-dim', text: T.yoursHint }),
    K.h('h3', { class: 'vw-label', text: T.arenas }), arenaList, K.h('h3', { class: 'vw-label', text: T.soldiers }), soldierList), { id: 'ph-yours', icon: 'folder' });

  const frame = K.pageFrame({ id: 'ph', title: which, sub: '', onBack: () => ctx.nav.back() });
  frame.content.appendChild(K.h('div', { class: 'vw-col' }, notice, yours));
  frame.mount(root);
  K.enter([notice, yours], 'pop', 0);
  cleanups.push(frame.destroy);
  setTimeout(() => { const b = root.querySelector('#ph-quick'); if (b && !safe(() => ctx.platform.isTouch, false)) b.focus(); }, 80);
  return { destroy() { cleanups.forEach((f) => f()); }, onBack() { if (K.hasModal()) return false; ctx.nav.back(); return true; } };
}
