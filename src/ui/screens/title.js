// Title / main menu: logo + menu tablets over the diorama, footer with version, Diagnostics link, mute, and the honest roadmap tag.
import * as K from '../kit.js';
import { getT } from '../strings.js';
import { logo } from './_logo.js';

export const meta = { id: 'title', layer: 'menu', music: 'menu', canvas: 'diorama' };

const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const safe = (fn, d) => { try { const v = fn(); return v === undefined ? d : v; } catch (e) { return d; } };

export function mount(root, ctx, params) {
  K.init(ctx);
  const T = getT(ctx).title;
  const cleanups = [];
  // warm the arena thumbnail queue (one arena per idle slice) while the player reads the menu, so Quick Battle opens with its maps already drawn
  { const arenaList = safe(() => ctx.content.arenas, []) || []; const warm = setTimeout(() => { for (const a of arenaList) { try { ctx.content.arenaThumb(a.id); } catch (e) { /* no thumbnails in this build */ } } }, 1200); cleanups.push(() => clearTimeout(warm)); }
  const go = (id, p) => ctx.nav.goto(id, p);
  const isPhone = safe(() => ctx.platform.isPhone(), false);
  const editor = (id) => () => (isPhone ? go('phone_notice', { editor: id }) : go(id));

  // progress badges (all optional)
  const stars = safe(() => { const s = ctx.save.progress.get('stars'); return s ? Object.keys(s).reduce((a, k) => a + (s[k] || 0), 0) : 0; }, 0);
  const missions = safe(() => ctx.content.campaign.missions.length, 9);
  const best = safe(() => ctx.save.progress.get('survivalBest'), 0);
  const dailyNew = safe(() => ctx.save.progress.get('dailyLast'), null) !== todayKey();

  const tile = (key, icon, o) => {
    const t = T[key];
    const b = K.button(t.name, Object.assign({ icon, variant: 'secondary', sound: 'ui_confirm', id: 'menu-' + key, onClick: o.go }, o.btn || {}));
    b.setAttribute('role', 'menuitem');
    b.classList.add('vw-menu__item');
    if (o.tile) b.classList.add('vw-btn--tile');
    if (o.badge) { const bd = K.chip(o.badge, { variant: o.badgeVariant || 'gold' }); bd.classList.add('vw-menu__badge'); b.appendChild(bd); }
    if (!o.btn || !o.btn.sub) K.tooltip(b, t.sub);
    return b;
  };

  const quick = tile('quick', 'sword', { go: () => go('quick'), btn: { variant: 'primary', size: 'xl', block: true, align: 'start', sub: T.quick.sub, hint: undefined } });
  const campaign = tile('campaign', 'map', { tile: true, go: () => go('campaign'), badge: stars ? T.badgeStars(stars, missions * 3) : null, badgeVariant: 'sky' });
  const survival = tile('survival', 'skull', { tile: true, go: () => go('survival'), badge: best ? T.badgeBest(best) : null, badgeVariant: 'sky' });
  const daily = tile('daily', 'calendar', { tile: true, go: () => go('daily'), badge: dailyNew ? T.badgeNew : null });
  const arena = tile('arena', 'hammer', { tile: true, go: editor('arena_builder') });
  const workshop = tile('workshop', 'brush', { tile: true, go: editor('workshop') });
  const codex = tile('codex', 'book', { tile: true, go: () => go('codex') });
  const ach = tile('achievements', 'trophy', { tile: true, go: () => go('achievements') });
  const settings = tile('settings', 'gear', { tile: true, go: () => go('settings') });
  const credits = tile('credits', 'laurel', { tile: true, go: () => go('credits') });

  const group = (label, cls, ...kids) => K.h('div', { class: ['vw-menu__group', cls], role: 'group', 'aria-label': label }, K.h('div', { class: 'vw-label vw-menu__label', 'aria-hidden': 'true', text: label }), ...kids);
  const menu = K.h('nav', { class: 'vw-menu', role: 'menu', 'aria-label': T.heading },
    group(T.groups.play, 'vw-menu__group--play', quick, K.h('div', { class: 'vw-menu__row vw-menu__row--3' }, campaign, survival, daily)),
    group(T.groups.create, null, K.h('div', { class: 'vw-menu__row vw-menu__row--2' }, arena, workshop)),
    group(T.groups.explore, null, K.h('div', { class: 'vw-menu__row vw-menu__row--4' }, codex, ach, settings, credits)));
  cleanups.push(K.roving(menu, { selector: '[role=menuitem]', orientation: 'both' }));
  if (isPhone) { [arena, workshop].forEach((b) => b.classList.add('is-phone-locked')); }

  const mute = K.muteButton();
  cleanups.push(() => mute.destroy && mute.destroy());
  const diag = K.button(T.diagnostics, { icon: 'bug', variant: 'ghost', size: 'sm', id: 'menu-diagnostics', sound: 'ui_click', onClick: () => go('diagnostics') });
  const ver = ctx.version || {};
  const footer = K.h('footer', { class: 'vw-title__footer' },
    K.h('span', { class: 'vw-title__ver vw-micro vw-nums', text: T.version(ver.version || ver.build || '1.0.0', ver.date || '') }),
    diag, mute,
    K.h('span', { class: 'vw-chip vw-chip--dash vw-title__roadmap', role: 'note', 'aria-label': T.roadmapNote }, K.icon('flag', { class: 'vw-chip__icon' }), K.h('span', { text: T.roadmap })));

  const tips = safe(() => ctx.content.humor.tips, []);
  const tip = tips && tips.length ? K.h('aside', { class: 'vw-title__tip vw-tablet vw-tablet--glass vw-tablet--tight', 'aria-label': T.footerTip },
    K.h('div', { class: 'vw-tablet__body' }, K.h('div', { class: 'vw-label', text: T.footerTip }), K.h('p', { class: 'vw-epigraph', text: tips[Math.floor(Math.random() * tips.length)] }))) : null;

  const wrap = K.h('main', { class: 'vw-title' }, K.h('div', { class: 'vw-title__col vw-scroll' }, params && params.logo === false ? null : logo({ size: 'md' }), menu, footer), tip);
  root.append(K.h('div', { class: 'vw-scrim-left' }), wrap);

  // entrance: tablets wobble in from the left, staggered
  K.enter(wrap.querySelector('.vw-logo'), 'left', 0);
  K.enter(Array.from(menu.querySelectorAll('.vw-menu__item')), 'left', 1);
  if (tip) K.enter(tip, 'right', 6);
  if (!safe(() => ctx.platform.isTouch, false)) setTimeout(() => { try { quick.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 80);

  return K.withExit(root, {
    destroy() { cleanups.forEach((f) => f()); },
    onBack() { return true; },   // the title is the root: Esc does nothing
  });
}
