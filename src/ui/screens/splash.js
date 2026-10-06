// Splash: "PRESS ANY KEY TO ENTER THE ARENA". This click/keypress is the audio gesture (browsers keep sound locked until then).
import * as K from '../kit.js';
import { getT } from '../strings.js';
import { logo } from './_logo.js';

export const meta = { id: 'splash', layer: 'menu', music: 'none', canvas: 'diorama' };

export function mount(root, ctx, params) {
  K.init(ctx);
  const T = getT(ctx).splash;
  const touch = !!(ctx.platform && ctx.platform.isTouch);
  let done = false;

  const prompt = K.h('button', { type: 'button', class: 'vw-splash__prompt', id: 'splash-enter' }, K.h('span', { class: 'vw-splash__prompt-text', text: touch ? T.promptTouch : T.prompt }));
  const el = K.h('main', { class: 'vw-splash', 'aria-label': 'Welcome' },
    K.h('div', { class: 'vw-splash__top' }, logo({ size: 'xl' }), K.h('p', { class: 'vw-splash__tag vw-epigraph', text: T.tag })),
    K.h('div', { class: 'vw-splash__bottom' }, prompt,
      K.h('p', { class: 'vw-splash__note', text: T.sound }),
      K.h('p', { class: 'vw-splash__ver vw-micro', text: ctx.version ? `v${ctx.version.version || ctx.version.build || '1.0.0'} · ${ctx.version.date || ''}` : '' })));
  root.append(K.h('div', { class: 'vw-scrim-bottom' }), el);
  K.enter(el.querySelector('.vw-logo'), 'pop', 0);
  K.enter(el.querySelector('.vw-splash__tag'), 'fade', 4);
  K.enter(el.querySelector('.vw-splash__prompt'), 'pop', 6);

  const enter = (e) => {
    if (done) return;
    done = true;
    if (e && e.preventDefault && e.type === 'keydown') e.preventDefault();
    K.sfx('ui_confirm');
    ctx.nav.goto('title', params && params.next ? { next: params.next } : {});
  };
  const onKey = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || /^F\d+$/.test(e.key)) return;
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;
    enter(e);
  };
  window.addEventListener('keydown', onKey);
  root.addEventListener('pointerdown', enter);
  prompt.addEventListener('click', enter);
  setTimeout(() => { try { prompt.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 50);

  return K.withExit(root, {
    destroy() { window.removeEventListener('keydown', onKey); root.removeEventListener('pointerdown', enter); },
    onKey(e) { if (!done) onKey(e); return true; },
    onBack() { return true; },
  });
}
