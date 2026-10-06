// briefing.js: the mission briefing. The three announcers talk the mission through (3-5 lines), then the facts: objective, rules, the three star
// conditions, par budget, unit counts, rewards, and a Deploy button that starts the campaign setup (game.newSetup('campaign', {mission}) + begin()).
// Opened as an overlay by the campaign map (params.mission = mission id) or by the Puzzles screen (params.puzzle = puzzle id), or as a base screen after the results ("Next mission" / "Next puzzle").
// A puzzle briefing shows the goal, the par, the restricted roster and the fixed rules, and deploys with game.newSetup('puzzle', ...) (mission = puzzle id, armies.A.roster = the allowed unit ids).
import * as K from '../kit.js';
import { h, disposer, sfx, fmtInt, unitName, andList } from '../hud/_dom.js';
import { icon } from '../hud/_icons.js';
import { avatar, announcerInfo } from '../hud/_portraits.js';
import { mutatorBadge } from '../hud/mutators.js';
import { missionsOf, ACTS } from './campaign.js';
import { puzzlesOf, rosterStrip, GOAL_ICON } from './puzzles.js';

export const meta = { id: 'briefing', layer: 'menu', music: 'menu', canvas: 'none' };

const OBJ_ICON = { eliminate: 'skull', kill_general: 'crown', hold_hill: 'flag', protect_vip: 'goat', survive_waves: 'cloud', destroy: 'tower' };

export function mount(root, ctx, params) {
  try { K.init(ctx); } catch (e) { /* kit optional in tools */ }
  const d = disposer();
  const p = params || {};
  root.classList.add('bs', 'bs-briefing');
  root.style.pointerEvents = 'auto';
  const puzzles = p.puzzle ? puzzlesOf(ctx) : [];
  const pz = p.puzzle ? puzzles.find((x) => x.id === p.puzzle && x.ok) || null : null;
  const missions = pz ? puzzles : missionsOf(ctx);
  const m = pz ? puzzleAsBrief(ctx, pz) : missions.find((x) => x.id === p.mission) || missions[0];
  const isOverlay = root.classList.contains('vw-overlay');
  const home = pz || p.puzzle ? 'puzzles' : 'campaign';
  const leave = () => { if (isOverlay && ctx.nav.closeOverlay) ctx.nav.closeOverlay('briefing'); else ctx.nav.goto(home); };
  if (!m) { root.append(K.emptyState({ icon: 'map', title: p.puzzle ? 'This puzzle is being re-chiselled' : 'No missions found', text: p.puzzle ? 'Try again after the next update.' : 'The campaign has wandered off. Try again in a moment.', action: { label: 'Back', onClick: leave } })); return { destroy() {} }; }

  // ---- announcer conversation
  const lines = m.briefing.length ? m.briefing : [{ who: 'brutus', text: m.blurb || 'No briefing. Improvise!' }];
  const chat = h('ol', { class: 'bs-brief-chat', 'aria-label': 'Briefing' }, lines.map((l, i) => {
    const info = announcerInfo(l.who);
    return h('li', { class: 'bs-brief-line', 'data-who': l.who, style: { '--i': i } },
      h('div', { class: 'bs-brief-face' }, avatar(l.who)), h('div', { class: 'bs-brief-bubble' }, h('b', { class: 'bs-brief-name', text: info.name }), h('p', { text: l.text })));
  }));

  // ---- facts
  const act = pz ? ['', 'Puzzle ' + (m.index + 1) + ' of ' + puzzles.length] : ACTS[m.act - 1] || ['?', ''];
  const objIcon = OBJ_ICON[m.objective.type] || 'flag';
  const stat = (ic, label, value) => h('div', { class: 'bs-fact' }, icon(ic), h('span', { class: 'bs-fact-l', text: label }), h('b', { class: 'bs-fact-v', text: value }));
  const forces = [];
  if (pz && pz.enemyCount) forces.push(stat('skull', 'Enemy army', pz.enemyCount + ' units, already placed'));
  if (m.units) forces.push(stat('users', 'Your army', '~' + m.units.A + ' units'), stat('skull', 'Enemy army', '~' + m.units.B + ' units'));
  if (m.budget) forces.push(stat('coin', 'Budget', fmtInt(m.budget) + ' dr'));
  if (m.par) forces.push(stat('target', pz ? 'Par for the 2nd star' : 'Par for the 3rd star', fmtInt(m.par) + ' dr'));
  if (m.timeLimit) forces.push(stat('clock', 'Time limit', Math.floor(m.timeLimit / 60) + ':' + String(m.timeLimit % 60).padStart(2, '0')));
  const starList = h('ul', { class: 'bs-brief-stars', 'aria-label': 'Star conditions' }, m.stars.map((s, i) => h('li', {}, h('span', { class: 'bs-brief-star-n' }, icon('star'), h('b', { text: String(i + 1) })), h('span', { text: s.text }))));
  const rules = m.rules.length ? h('ul', { class: 'bs-brief-rules' }, m.rules.map((t) => h('li', {}, icon('check'), h('span', { text: t })))) : null;
  const rewards = m.rewards ? h('div', { class: 'bs-brief-rewards' }, m.rewards.title ? K.chip('Title: ' + m.rewards.title, { icon: 'laurel', variant: 'gold' }) : null, ...(m.rewards.unlockMutators || []).map((x) => mutatorBadge(ctx, x)), ...(m.rewards.unlockParts || []).map((x) => K.chip('Workshop: ' + x, { icon: 'hammer', variant: 'pink' }))) : null;
  const facts = h('div', { class: 'bs-brief-facts' },
    h('div', { class: 'bs-brief-act' }, K.chip(pz ? act[1] : 'Act ' + act[0] + ' · ' + act[1], { variant: 'lapis' })),
    h('h2', { class: 'bs-brief-title', id: 'brief-title', text: m.title }),
    m.blurb ? h('p', { class: 'bs-brief-blurb', text: m.blurb }) : null,
    h('div', { class: 'bs-brief-obj' }, icon(pz ? GOAL_ICON[pz.goalType] || objIcon : objIcon), h('div', {}, h('small', { text: pz ? 'Goal' : 'Objective' }), h('b', { text: m.objective.text }))),
    pz ? h('h3', { class: 'bs-sub', text: 'Your roster' }) : null, pz ? rosterStrip(ctx, pz) : null,
    forces.length ? h('div', { class: 'bs-brief-forces' }, forces) : null,
    h('h3', { class: 'bs-sub', text: 'Stars' }), starList,
    rules ? h('h3', { class: 'bs-sub', text: 'Rules of this fight' }) : null, rules,
    rewards ? h('h3', { class: 'bs-sub', text: 'Rewards' }) : null, rewards);

  const deploy = K.button('Deploy', { variant: 'primary', size: 'xl', icon: 'play', hint: 'Enter', id: 'brief-deploy', onClick: async () => {
    const raw = m.raw || {};
    const a = raw.arena || {};
    const preset = { mission: m.id };
    if (pz) {
      const e = (raw.enemy && raw.enemy.placements) || [];
      deploy.setDisabled(true);
      try {
        const s = ctx.game.newSetup('puzzle', { mission: pz.id, arena: { presetId: pz.arenaId, size: a.size || 'medium', seed: a.seed || 1, env: a.env || {} }, rules: { budget: pz.budget, timeLimit: pz.timeLimit, mutators: [], godPowers: pz.godPowers, freePlacement: false, mirror: false },
          armies: { A: { faction: pz.faction, placements: [], budget: pz.budget, roster: pz.roster.slice() }, B: { faction: pz.enemyFaction, placements: e.slice(), budget: null } } });
        s.puzzle = pz.id;
        await ctx.game.begin(s);
      } finally { deploy.setDisabled(false); }
      return;
    }
    if (a.recipe || a.presetId) preset.arena = { presetId: a.presetId || a.recipe, size: a.size || 'medium', seed: a.seed || 1, env: a.env || {} };
    if (m.budget) preset.rules = { budget: m.budget };
    const fa = raw.playerFaction || raw.factionA, fb = (raw.enemy && raw.enemy.faction) || raw.factionB;
    if (fa || fb) preset.armies = { A: { faction: fa || 'hellenes', placements: [], budget: m.budget || null }, B: { faction: fb || 'persians', placements: [], budget: null } };
    deploy.setDisabled(true);
    try { const s = ctx.game.newSetup('campaign', preset); await ctx.game.begin(s); } finally { deploy.setDisabled(false); }
  } });
  const back = K.button(pz ? 'Back to the puzzles' : 'Back to the map', { variant: 'ghost', icon: 'back', id: 'brief-back', sound: 'ui_back', onClick: leave });
  const body = h('div', { class: 'bs-brief-body' }, h('div', { class: 'bs-brief-col is-chat' }, h('h3', { class: 'bs-sub', text: 'Briefing' }), chat), h('div', { class: 'bs-brief-col is-facts vw-scroll' }, facts));
  const foot = h('div', { class: 'bs-brief-foot' }, back, deploy);
  const card = K.tablet((pz ? 'Puzzle ' : 'Mission ') + (m.index + 1) + ' of ' + missions.length, h('div', { class: 'bs-brief-wrap' }, body, foot), { variant: 'glass', icon: 'scroll', id: 'bs-brief-card', class: 'bs-brief-card' });
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

/** A puzzle as the briefing's mission-shaped view: three short announcer lines, the goal as the objective, par and the fixed rules. */
function puzzleAsBrief(ctx, pz) {
  const names = pz.roster.map((id) => unitName(ctx, id));
  const lines = [{ who: 'brutus', text: pz.blurb || pz.goalText }, { who: 'plato', text: 'The roster is short on purpose: ' + andList(names) + '. The answer is somewhere in there.' }, { who: 'cassandra', text: 'Par is ' + fmtInt(pz.par) + ' drachmae. Spend less and I will be quietly impressed.' }];
  const rules = ['The enemy is already placed', 'Retries are free', 'No mutators'].concat(pz.godPowers ? [] : ['No god powers']);
  return { id: pz.id, index: pz.index, act: 0, title: pz.title, blurb: '', briefing: lines, budget: pz.budget, units: null, par: pz.par, objective: { type: pz.goalType, text: pz.goalText }, timeLimit: pz.timeLimit, stars: pz.stars, rules, rewards: null, raw: pz.raw };
}
