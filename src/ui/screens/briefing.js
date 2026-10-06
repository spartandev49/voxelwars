// briefing.js: the mission briefing. The three announcers talk the mission through (3-5 lines), then the facts: objective, rules, the three star
// conditions, par budget, unit counts, rewards, and a Deploy button that starts the campaign setup (game.newSetup('campaign', {mission}) + begin()).
// Opened as an overlay by the campaign map (params.mission = mission id), or as a base screen after the results ("Next mission").
import * as K from '../kit.js';
import { h, disposer, sfx, fmtInt } from '../hud/_dom.js';
import { icon } from '../hud/_icons.js';
import { avatar, announcerInfo } from '../hud/_portraits.js';
import { mutatorBadge } from '../hud/mutators.js';
import { missionsOf, ACTS } from './campaign.js';

export const meta = { id: 'briefing', layer: 'menu', music: 'menu', canvas: 'none' };

const OBJ_ICON = { eliminate: 'skull', kill_general: 'crown', hold_hill: 'flag', protect_vip: 'goat', survive_waves: 'cloud', destroy: 'tower' };

export function mount(root, ctx, params) {
  try { K.init(ctx); } catch (e) { /* kit optional in tools */ }
  const d = disposer();
  const p = params || {};
  root.classList.add('bs', 'bs-briefing');
  root.style.pointerEvents = 'auto';
  const missions = missionsOf(ctx);
  const m = missions.find((x) => x.id === p.mission) || missions[0];
  const isOverlay = root.classList.contains('vw-overlay');
  const leave = () => { if (isOverlay && ctx.nav.closeOverlay) ctx.nav.closeOverlay('briefing'); else ctx.nav.goto('campaign'); };
  if (!m) { root.append(K.emptyState({ icon: 'map', title: 'No missions found', text: 'The campaign has wandered off. Try again in a moment.', action: { label: 'Back', onClick: leave } })); return { destroy() {} }; }

  // ---- announcer conversation
  const lines = m.briefing.length ? m.briefing : [{ who: 'brutus', text: m.blurb || 'No briefing. Improvise!' }];
  const chat = h('ol', { class: 'bs-brief-chat', 'aria-label': 'Briefing' }, lines.map((l, i) => {
    const info = announcerInfo(l.who);
    return h('li', { class: 'bs-brief-line', 'data-who': l.who, style: { '--i': i } },
      h('div', { class: 'bs-brief-face' }, avatar(l.who)), h('div', { class: 'bs-brief-bubble' }, h('b', { class: 'bs-brief-name', text: info.name }), h('p', { text: l.text })));
  }));

  // ---- facts
  const act = ACTS[m.act - 1] || ['?', ''];
  const objIcon = OBJ_ICON[m.objective.type] || 'flag';
  const stat = (ic, label, value) => h('div', { class: 'bs-fact' }, icon(ic), h('span', { class: 'bs-fact-l', text: label }), h('b', { class: 'bs-fact-v', text: value }));
  const forces = [];
  if (m.units) forces.push(stat('users', 'Your army', '~' + m.units.A + ' units'), stat('skull', 'Enemy army', '~' + m.units.B + ' units'));
  if (m.budget) forces.push(stat('coin', 'Budget', fmtInt(m.budget) + ' dr'));
  if (m.par) forces.push(stat('target', 'Par for the 3rd star', fmtInt(m.par) + ' dr'));
  if (m.timeLimit) forces.push(stat('clock', 'Time limit', Math.floor(m.timeLimit / 60) + ':' + String(m.timeLimit % 60).padStart(2, '0')));
  const starList = h('ul', { class: 'bs-brief-stars', 'aria-label': 'Star conditions' }, m.stars.map((s, i) => h('li', {}, h('span', { class: 'bs-brief-star-n' }, icon('star'), h('b', { text: String(i + 1) })), h('span', { text: s.text }))));
  const rules = m.rules.length ? h('ul', { class: 'bs-brief-rules' }, m.rules.map((t) => h('li', {}, icon('check'), h('span', { text: t })))) : null;
  const rewards = m.rewards ? h('div', { class: 'bs-brief-rewards' }, m.rewards.title ? K.chip('Title: ' + m.rewards.title, { icon: 'laurel', variant: 'gold' }) : null, ...(m.rewards.unlockMutators || []).map((x) => mutatorBadge(ctx, x)), ...(m.rewards.unlockParts || []).map((x) => K.chip('Workshop: ' + x, { icon: 'hammer', variant: 'pink' }))) : null;
  const facts = h('div', { class: 'bs-brief-facts' },
    h('div', { class: 'bs-brief-act' }, K.chip('Act ' + act[0] + ' · ' + act[1], { variant: 'lapis' })),
    h('h2', { class: 'bs-brief-title', id: 'brief-title', text: m.title }),
    m.blurb ? h('p', { class: 'bs-brief-blurb', text: m.blurb }) : null,
    h('div', { class: 'bs-brief-obj' }, icon(objIcon), h('div', {}, h('small', { text: 'Objective' }), h('b', { text: m.objective.text }))),
    forces.length ? h('div', { class: 'bs-brief-forces' }, forces) : null,
    h('h3', { class: 'bs-sub', text: 'Stars' }), starList,
    rules ? h('h3', { class: 'bs-sub', text: 'Rules of this fight' }) : null, rules,
    rewards ? h('h3', { class: 'bs-sub', text: 'Rewards' }) : null, rewards);

  const deploy = K.button('Deploy', { variant: 'primary', size: 'xl', icon: 'play', hint: 'Enter', id: 'brief-deploy', onClick: async () => {
    const raw = m.raw || {};
    const a = raw.arena || {};
    const preset = { mission: m.id };
    if (a.recipe || a.presetId) preset.arena = { presetId: a.presetId || a.recipe, size: a.size || 'medium', seed: a.seed || 1, env: a.env || {} };
    if (m.budget) preset.rules = { budget: m.budget };
    const fa = raw.playerFaction || raw.factionA, fb = (raw.enemy && raw.enemy.faction) || raw.factionB;
    if (fa || fb) preset.armies = { A: { faction: fa || 'hellenes', placements: [], budget: m.budget || null }, B: { faction: fb || 'persians', placements: [], budget: null } };
    deploy.setDisabled(true);
    try { const s = ctx.game.newSetup('campaign', preset); await ctx.game.begin(s); } finally { deploy.setDisabled(false); }
  } });
  const back = K.button('Back to the map', { variant: 'ghost', icon: 'back', id: 'brief-back', sound: 'ui_back', onClick: leave });
  const body = h('div', { class: 'bs-brief-body' }, h('div', { class: 'bs-brief-col is-chat' }, h('h3', { class: 'bs-sub', text: 'Briefing' }), chat), h('div', { class: 'bs-brief-col is-facts vw-scroll' }, facts));
  const foot = h('div', { class: 'bs-brief-foot' }, back, deploy);
  const card = K.tablet('Mission ' + (m.index + 1) + ' of ' + missions.length, h('div', { class: 'bs-brief-wrap' }, body, foot), { variant: 'glass', icon: 'scroll', id: 'bs-brief-card', class: 'bs-brief-card' });
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'brief-title');
  root.append(h('div', { class: 'bs-scrim' }), h('div', { class: 'bs-center' }, card));
  K.enter(card, 'pop');
  Array.from(chat.children).forEach((li, i) => K.enter(li, i % 2 ? 'right' : 'left', 2 + i));
  sfx(ctx, 'ui_panel_open', { vol: 0.6 });
  try { deploy.focus({ preventScroll: true }); } catch (e) { /* focus optional */ }
  const siblings = isOverlay ? Array.from(root.parentElement ? root.parentElement.children : []).filter((c) => c !== root && !c.hasAttribute('inert')) : [];
  siblings.forEach((c) => c.setAttribute('inert', ''));
  d.add(() => siblings.forEach((c) => c.removeAttribute('inert')));

  return {
    onBack() { leave(); return true; },
    onKey(e) {
      if (e.code === 'Enter' && document.activeElement === document.body) { deploy.click(); return true; }
      if (e.code === 'Tab') {
        const f = K.focusables(root); if (!f.length) return false;
        const first = f[0], last = f[f.length - 1], a = document.activeElement;
        if (e.shiftKey && (a === first || !root.contains(a))) { e.preventDefault(); last.focus(); return true; }
        if (!e.shiftKey && (a === last || !root.contains(a))) { e.preventDefault(); first.focus(); return true; }
      }
      return false;
    },
    destroy() { d.run(); },
  };
}
