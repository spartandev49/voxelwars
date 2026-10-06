// campaign.js: the campaign map. A stylised voxel Mediterranean (SVG built in _map.js) with 9 mission pins in 3 acts, stars, locks, hover/focus
// blurb cards, a progress summary and a Continue button; phones get the same map as a compact header plus a mission list. Clicking a pin opens
// the briefing (screens/briefing.js) as an overlay. Progress comes from hud/_progress.js (stars map); missions from ctx.content.campaign.missions.
import * as K from '../kit.js';
import { h, svg, disposer, sfx, layoutOf } from '../hud/_dom.js';
import { icon } from '../hud/_icons.js';
import { starsMap, totalStars, isUnlocked } from '../hud/_progress.js';
import { buildMapSvg, buildMapDecor, PINS, VIEWS, project } from './_map.js';

export const meta = { id: 'campaign', layer: 'menu', music: 'menu', canvas: 'none' };

export const ACTS = [['I', 'Dawn of Bronze'], ['II', 'Empires'], ['III', 'Mythology Class']];
const OBJ = { eliminate: 'Defeat the enemy army', kill_general: 'Defeat their general', hold_hill: 'Hold the position', protect_vip: 'Protect the VIP', survive_waves: 'Survive the waves', destroy: 'Destroy the target' };

/** Fill in whatever a mission def lacks so the screens never show "undefined". Accepts the spec/world.md mission shape or UI-A's minimal one. */
export function normMission(m, i) {
  const o = m.objective || {};
  const briefing = (m.briefing || []).map((l, k) => (typeof l === 'string' ? { who: ['brutus', 'plato', 'cassandra'][k % 3], text: l } : { who: l.who || ['brutus', 'plato', 'cassandra'][k % 3], text: l.text || '' }));
  const units = m.units && typeof m.units === 'object' ? m.units : (m.units ? { A: m.units, B: m.units } : null);
  return { id: m.id, index: m.index != null ? m.index : i, act: m.act || 1 + Math.floor(i / 3), title: m.title || m.id, blurb: m.blurb || '', briefing, budget: m.budget || null, units, par: m.par || 0,
    objective: { type: o.type || 'eliminate', text: o.text || OBJ[o.type || 'eliminate'] }, timeLimit: m.timeLimit || 0, stars: (m.stars && m.stars.length ? m.stars : [{ id: 'win', text: 'Win the battle' }, { id: 'half', text: 'Keep half your army (by cost)' }, { id: 'bonus', text: 'Mission bonus' }]).slice(0, 3), rules: m.rules || [], rewards: m.rewards || null, raw: m };
}
export const missionsOf = (ctx) => ((ctx.content && ctx.content.campaign && ctx.content.campaign.missions) || []).map(normMission);

export function mount(root, ctx) {
  try { K.init(ctx); } catch (e) { /* kit optional in tools */ }
  const d = disposer();
  root.classList.add('bs', 'bs-campaign');
  const missions = missionsOf(ctx);
  const stars = starsMap(ctx);
  const have = totalStars(ctx, missions), max = missions.length * 3;
  const state = (i) => (!isUnlocked(ctx, missions, i) ? 'locked' : (stars[missions[i].id] | 0) >= 1 ? 'cleared' : 'open');
  const nextIdx = (() => { const i = missions.findIndex((m, k) => state(k) === 'open'); if (i >= 0) return i; let last = 0; missions.forEach((m, k) => { if (state(k) !== 'locked') last = k; }); return last; })();

  const open = (i) => {
    const m = missions[i];
    if (state(i) === 'locked') {
      sfx(ctx, 'ui_error', { vol: 0.5 });
      ctx.nav.toast && ctx.nav.toast('Locked. Win "' + (missions[i - 1] ? missions[i - 1].title : 'the previous mission') + '" first. One star is plenty.', { kind: 'info' });
      return;
    }
    if (ctx.nav.overlay) ctx.nav.overlay('briefing', { mission: m.id }); else ctx.nav.goto('briefing', { mission: m.id });
  };

  // ------------------------------------------------------------ header
  const chipStars = K.chip(have + ' / ' + max + ' stars', { icon: 'star', variant: 'gold', id: 'camp-stars' });
  const cont = K.button(missions.length && stars[missions[0].id] ? 'Continue' : 'Start', { variant: 'primary', icon: 'play', id: 'camp-continue', onClick: () => open(nextIdx) });
  const frame = K.pageFrame({ title: 'Campaign', sub: 'The Ancient Era: nine battles, three acts, one goat', onBack: () => ctx.nav.goto('title'), id: 'camp-frame', bg: false });
  frame.mount(root);
  const bar = h('div', { class: 'bs-camp-bar' }, chipStars, cont);

  // ------------------------------------------------------------ map stage
  const mapSvg = buildMapSvg();
  mapSvg.appendChild(buildMapDecor());
  const route = svg('g', { class: 'map-route', fill: 'none', 'stroke-linecap': 'round' });
  mapSvg.appendChild(route);
  const stage = h('div', { class: 'bs-map-stage', role: 'group', 'aria-label': 'Campaign map' }, mapSvg);
  const wrap = h('div', { class: 'bs-map-wrap' }, stage);
  const card = h('div', { class: 'bs-pin-card', hidden: true, 'aria-hidden': 'true' });
  stage.appendChild(card);

  const pins = missions.map((m, i) => {
    const st = state(i), n = Math.max(0, Math.min(3, stars[m.id] | 0));
    const starRow = h('span', { class: 'bs-pin-stars', 'aria-hidden': 'true' }, [0, 1, 2].map((k) => icon(k < n ? 'star' : 'starO', 'bs-pin-star')));
    const b = h('button', { class: 'bs-pin is-' + st, type: 'button', id: 'pin-' + m.id, 'data-act': m.act, 'data-index': i, 'aria-label': 'Mission ' + (i + 1) + ': ' + m.title + (st === 'locked' ? ', locked' : ', ' + n + ' of 3 stars') + '. Act ' + ACTS[m.act - 1][0] + '.' },
      h('span', { class: 'bs-pin-head' }, st === 'locked' ? icon('lock', 'bs-pin-lock') : h('b', { class: 'bs-pin-n', text: String(i + 1) })), starRow, i === nextIdx && st === 'open' ? h('i', { class: 'bs-pin-ping', 'aria-hidden': 'true' }) : null);
    b.addEventListener('click', () => open(i));
    b.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') showCard(i); });
    b.addEventListener('pointerleave', hideCard);
    b.addEventListener('focus', () => showCard(i)); b.addEventListener('blur', hideCard);
    return b;
  });
  pins.forEach((b) => stage.appendChild(b));

  function showCard(i) {
    const m = missions[i], st = state(i), n = stars[m.id] | 0;
    card.replaceChildren(
      h('div', { class: 'bs-pin-card-act', text: 'Act ' + ACTS[m.act - 1][0] + ' · ' + ACTS[m.act - 1][1] }),
      h('h3', { class: 'bs-pin-card-title', text: (i + 1) + '. ' + m.title }),
      h('p', { class: 'bs-pin-card-blurb', text: st === 'locked' ? 'Locked. Win the previous mission to open it.' : m.blurb }),
      st === 'locked' ? null : h('div', { class: 'bs-pin-card-meta' }, K.chip(m.objective.text, { icon: 'flag', variant: 'sky' }), m.budget ? K.chip(m.budget.toLocaleString('en-US') + ' dr', { icon: 'coin', variant: 'gold' }) : null, K.chip(n + '/3 stars', { icon: 'star', variant: n ? 'olive' : 'ink' })));
    const [x, y] = project(PINS[i][0], PINS[i][1], view());
    card.style.left = Math.max(14, Math.min(86, x)) + '%'; card.style.top = y + '%';
    card.classList.toggle('is-below', y < 38);
    card.hidden = false;
  }
  function hideCard() { card.hidden = true; }

  // ------------------------------------------------------------ layout: wide crops the map to 16:9, phones to a squarer view
  let layout = layoutOf(ctx);
  const view = () => (layout === 'phone' ? VIEWS.tall : VIEWS.wide);
  function place() {
    const v = view();
    mapSvg.setAttribute('viewBox', v.x + ' ' + v.y + ' ' + v.w + ' ' + v.h);
    pins.forEach((b, i) => { const [x, y] = project(PINS[i][0], PINS[i][1], v); b.style.left = x + '%'; b.style.top = y + '%'; });
    route.replaceChildren();
    for (let i = 0; i < PINS.length - 1; i++) {
      const [x0, y0] = PINS[i], [x1, y1] = PINS[i + 1];
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, off = Math.min(10, len * 0.22) * (i % 2 ? -1 : 1);
      const cx = mx - (dy / len) * off, cy = my + (dx / len) * off;
      const done = (stars[missions[i].id] | 0) >= 1, upNext = !done && state(i) !== 'locked';        // finished leg: solid gold; next leg: dashed; the rest: a faint hint
      route.appendChild(svg('path', { d: 'M' + x0 + ' ' + y0 + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + x1 + ' ' + y1, stroke: done ? '#ffc93c' : '#ffffff', 'stroke-width': done ? 1.1 : 0.8, 'stroke-dasharray': done ? '0' : '1.6 1.4', opacity: done ? 0.95 : upNext ? 0.8 : 0.22 }));
    }
    stage.classList.toggle('is-tall', layout === 'phone');
    if (layout === 'wide') stage.appendChild(bar); else if (wrap.parentNode === frame.content && (bar.parentNode !== frame.content || bar.nextSibling !== wrap)) frame.content.insertBefore(bar, wrap);     // wide: floats on the sea; narrow: its own row
  }
  place();
  d.on(window, 'resize', () => { const l = layoutOf(ctx); if (l !== layout) { layout = l; place(); } });

  // ------------------------------------------------------------ legend (wide) + mission list (narrow)
  const legend = h('div', { class: 'bs-camp-legend bs-panel', role: 'group', 'aria-label': 'Acts' }, ACTS.map(([r, name], a) => {
    const ms = missions.filter((m) => m.act === a + 1);
    const got = ms.reduce((s, m) => s + (stars[m.id] | 0), 0);
    return h('div', { class: 'bs-act', 'data-act': a + 1 }, h('b', { class: 'bs-act-n', text: r }), h('span', { class: 'bs-act-name', text: name }), h('span', { class: 'bs-act-stars' }, icon('star'), h('b', { text: got + '/' + ms.length * 3 })));
  }));
  stage.appendChild(legend);
  const list = h('ol', { class: 'bs-mlist', 'aria-label': 'Missions' }, missions.map((m, i) => {
    const st = state(i), n = Math.max(0, Math.min(3, stars[m.id] | 0));
    const b = h('button', { class: 'bs-mrow is-' + st, type: 'button', id: 'mrow-' + m.id, 'aria-label': (i + 1) + '. ' + m.title + (st === 'locked' ? ', locked' : ', ' + n + ' of 3 stars') },
      h('span', { class: 'bs-mrow-n' }, st === 'locked' ? icon('lock') : h('b', { text: String(i + 1) })),
      h('span', { class: 'bs-mrow-t' }, h('b', { text: m.title }), h('small', { text: st === 'locked' ? 'Act ' + ACTS[m.act - 1][0] + ' · locked' : 'Act ' + ACTS[m.act - 1][0] + ' · ' + m.objective.text })),
      h('span', { class: 'bs-mrow-s', 'aria-hidden': 'true' }, [0, 1, 2].map((k) => icon(k < n ? 'star' : 'starO'))));
    b.addEventListener('click', () => open(i));
    return h('li', {}, b);
  }));
  frame.content.append(wrap, list);
  place();
  K.enter(legend, 'left', 1);
  pins.forEach((b, i) => { b.style.setProperty('--i', i); });

  return {
    onBack() { ctx.nav.goto('title'); return true; },
    onKey(e) { if (e.code === 'Enter' && document.activeElement === document.body) { open(nextIdx); return true; } return false; },
    destroy() { d.run(); frame.destroy(); },
  };
}
