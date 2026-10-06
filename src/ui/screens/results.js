// results.js: the results overlay (app/main.js opens it 1.8 s after battle_end). Victory / defeat / draw banner with laurel + confetti, stats tablet,
// MVP with last words, funny stats, the 3 generated LESSONS in Cassandra's voice, mission stars + rewards, Survival / Daily extras, and the buttons:
// Rematch (R, "Again, but smarter"), Tweak army (T), Kill-cam (K), Next mission, Menu (Esc). Slide-in choreography with a Reduce Motion variant.
// Data: ResultsData from ctx.game.results() (shape documented in docs/requests/ui-b.md); params.results overrides it (tools, tests).
import * as K from '../kit.js';
import { h, disposer, sfx, fmtInt, fmtTime, unitName, unitRole, unitDef, ROLE_ICON, reduced, anim } from '../hud/_dom.js';
import { icon } from '../hud/_icons.js';
import { avatar } from '../hud/_portraits.js';
import { laurelSvg, flagSvg, crestSvg, confetti } from '../hud/_art.js';
import { mutatorBadge } from '../hud/mutators.js';
import { survivalPanel } from './survival.js';
import { dailyResultPanel } from './daily.js';

export const meta = { id: 'results', layer: 'battle', music: 'none', canvas: 'scene' };

const WIN_SUB = { elimination: 'Last unit standing: yours.', time: 'Time ran out and you were ahead. Technically a win.', objective: 'Objective complete. Paperwork pending.', rout: 'They ran away. Technically you won.', intervention: 'Zeus left the chat. You won the argument.' };
const LOSE_SUB = { elimination: 'Your army has been politely removed.', time: 'Time ran out and you were behind. Rude.', objective: 'The objective was not achieved. Neither was lunch.', rout: 'Your army chose cardio.', intervention: 'Zeus left. You lost anyway.' };
const DRAW_SUB = 'Zeus stormed off. Nobody wins. Everyone is cross.';
const NO_QUOTE = ['Survived. Smugly.', 'Still standing. Has opinions.', 'Lived. Took notes.'];

export function normalize(r, ctx) {
  r = r || {};
  const t = (r.teams || []).map((x, i) => Object.assign({ name: i === 0 ? 'Blue' : 'Red', alive: 0, dead: 0, kills: 0, damage: 0, lostCost: 0 }, x));
  while (t.length < 2) t.push({ name: t.length === 0 ? 'Blue' : 'Red', alive: 0, dead: 0, kills: 0, damage: 0, lostCost: 0 });
  const mv = r.mvp || null;
  let mvp = null;
  if (mv) {
    const u = mv.unit && typeof mv.unit === 'object' ? mv.unit : { name: typeof mv.unit === 'string' ? mv.unit : mv.name, defId: mv.defId };
    mvp = { name: u.name || mv.name || unitName(ctx, u.defId || mv.defId), defId: u.defId || mv.defId || null, kills: mv.kills | 0, quote: mv.quote || '' };
  }
  return Object.assign({}, r, { teams: t, mvp, lessons: Array.isArray(r.lessons) ? r.lessons.slice(0, 3) : [], funnyStats: Array.isArray(r.funnyStats) ? r.funnyStats.slice(0, 4) : [], winner: r.winner === undefined ? -1 : r.winner });
}

function banner(r) {
  const win = r.winner === 0, draw = r.winner === -1 || r.winner === undefined || r.winner > 1;
  const kind = draw ? 'draw' : win ? 'win' : 'lose';
  const title = draw ? 'DRAW' : win ? 'VICTORY!' : 'DEFEAT';
  const sub = draw ? DRAW_SUB : (win ? WIN_SUB : LOSE_SUB)[r.reason] || (win ? WIN_SUB.elimination : LOSE_SUB.elimination);
  return { kind, title, sub };
}

export function mount(root, ctx, params) {
  try { K.init(ctx); } catch (e) { /* kit optional in tools */ }
  const d = disposer();
  const p = params || {};
  root.classList.add('bs', 'bs-results');
  root.style.pointerEvents = 'auto';
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Battle results');
  let raw = p.results || null;
  try { if (!raw && ctx.game && ctx.game.results) raw = ctx.game.results(); } catch (e) { raw = null; }
  const r = normalize(raw, ctx);
  const b = banner(r);
  const rm = reduced(ctx);
  const isMission = !!(r.mission && r.mission.id);
  const isSurvival = !!r.survival, isDaily = !!r.daily;

  const host = root.parentElement;
  if (host) host.classList.add('bs-results-open');            // hides the battle HUD underneath (see hud.css)
  d.add(() => { if (host) host.classList.remove('bs-results-open'); });
  const leaveOverlay = () => { try { ctx.nav.closeOverlay && ctx.nav.closeOverlay('results'); } catch (e) { /* closed already */ } };

  // ------------------------------------------------------------ hero
  const heroArt = b.kind === 'win' ? laurelSvg() : b.kind === 'lose' ? flagSvg() : crestSvg();
  const titleEl = h('h1', { class: 'bs-res-title', id: 'bs-res-title', text: b.title });
  const subEl = h('p', { class: 'bs-res-sub', text: b.sub });
  const timeChip = K.chip(fmtTime(r.time) + ' on the clock', { icon: 'clock', variant: 'ink' });
  const hero = h('header', { class: 'bs-res-hero is-' + b.kind }, h('div', { class: 'bs-res-art' }, heroArt),
    h('div', { class: 'bs-res-banner' }, h('div', { class: 'bs-res-ribbon' }, titleEl), subEl, h('div', { class: 'bs-res-chips' }, timeChip)));
  if (isMission || r.rewards) {
    const block = h('div', { class: 'bs-res-missionbox' });
    if (isMission) {
      const stars = (r.stars || []).slice(0, 3);
      block.append(h('div', { class: 'bs-res-mission' }, h('span', { class: 'bs-res-mission-act', text: 'Act ' + ['I', 'II', 'III'][(r.mission.act || 1) - 1] }), h('b', { text: r.mission.title })),
        h('div', { class: 'bs-res-stars', role: 'list', 'aria-label': 'Mission stars' }, stars.map((s, i) => h('div', { class: 'bs-res-star' + (s.earned ? ' is-earned' : ''), role: 'listitem', style: { '--i': i } }, icon(s.earned ? 'star' : 'starO', 'bs-res-star-ic'), h('span', { class: 'bs-res-star-tx', text: s.text })))));
    }
    if (r.rewards) {
      const chips = [];
      if (r.rewards.title) chips.push(K.chip('New title: ' + r.rewards.title, { icon: 'laurel', variant: 'gold' }));
      for (const x of r.rewards.unlockParts || []) chips.push(K.chip('Workshop: ' + x, { icon: 'hammer', variant: 'pink' }));
      for (const x of r.rewards.unlockMutators || []) chips.push(mutatorBadge(ctx, x));
      for (const x of r.rewards.codex || []) chips.push(K.chip('Codex: ' + x, { icon: 'book', variant: 'sky' }));
      if (chips.length) hero.querySelector('.bs-res-banner').append(h('div', { class: 'bs-res-rewards', 'aria-label': 'Rewards' }, chips));
    }
    if (isMission) { hero.classList.add('has-mission'); hero.append(block); }
  }

  // ------------------------------------------------------------ stats tablet
  const [A, B] = r.teams;
  const row = (label, a, bb, fmt, higherWins) => {
    const fa = fmt ? fmt(a) : String(a), fb = fmt ? fmt(bb) : String(bb);
    const lead = a === bb ? '' : ((a > bb) === (higherWins !== false) ? 'a' : 'b');
    return h('tr', {}, h('th', { scope: 'row', text: label }), h('td', { class: 'is-a' + (lead === 'a' ? ' is-lead' : ''), text: fa }), h('td', { class: 'is-b' + (lead === 'b' ? ' is-lead' : ''), text: fb }));
  };
  const crown = (t) => (t === r.winner ? [icon('crown', 'bs-res-crown')] : []);
  const table = h('table', { class: 'bs-res-table' },
    h('caption', { class: 'vw-sr', text: 'Battle report' }),
    h('thead', {}, h('tr', {}, h('th', { scope: 'col', class: 'vw-sr', text: 'Stat' }), h('th', { scope: 'col', class: 'is-a' }, crown(0), h('span', { text: A.name })), h('th', { scope: 'col', class: 'is-b' }, crown(1), h('span', { text: B.name })))),
    h('tbody', {}, row('Units left', A.alive, B.alive, fmtInt), row('Units lost', A.dead, B.dead, fmtInt, false), row('Kills', A.kills, B.kills, fmtInt), row('Damage dealt', A.damage, B.damage, fmtInt), row('Value lost (dr)', A.lostCost, B.lostCost, fmtInt, false)));
  const statsTab = K.tablet('Battle report', table, { variant: 'glass', icon: 'scroll', tight: true, class: 'bs-res-tab bs-res-stats' });

  // ------------------------------------------------------------ MVP + funny stats
  let mvpBody;
  if (r.mvp) {
    const role = unitRole(ctx, r.mvp.defId), def = unitDef(ctx, r.mvp.defId);
    const quote = r.mvp.quote || NO_QUOTE[(r.mvp.kills | 0) % NO_QUOTE.length];
    mvpBody = h('div', { class: 'bs-res-mvp' },
      h('div', { class: 'bs-res-mvp-head' }, h('span', { class: 'bs-res-mvp-ico' }, icon(ROLE_ICON[role] || 'sword')),
        h('div', { class: 'bs-res-mvp-id' }, h('b', { class: 'bs-res-mvp-name', text: r.mvp.name }), h('span', { class: 'bs-res-mvp-type', text: (def && def.name ? def.name : unitName(ctx, r.mvp.defId)) + (role ? ' · ' + role : '') })),
        h('span', { class: 'bs-res-mvp-kills' }, icon('skull'), h('b', { text: String(r.mvp.kills) }), h('small', { text: 'kills' }))),
      h('blockquote', { class: 'bs-res-quote' }, h('p', { text: '“' + quote + '”' }), h('footer', { text: r.mvp.quote ? 'last words' : 'status: smug' })));
  } else mvpBody = K.emptyState({ icon: 'skull', title: 'No MVP', text: 'Nobody did anything worth a quote. A first.' });
  const funny = r.funnyStats.length ? h('dl', { class: 'bs-res-funny' }, r.funnyStats.flatMap((s) => [h('dt', { text: s.label }), h('dd', { text: String(s.value) })])) : null;
  const mvpTab = K.tablet('Most valuable soldier', h('div', { class: 'bs-res-mvpcol' }, mvpBody, funny), { variant: 'glass', icon: 'crown', tight: true, class: 'bs-res-tab bs-res-mvptab' });

  // ------------------------------------------------------------ lessons (Cassandra)
  const lessonList = h('ol', { class: 'bs-res-lessons' });
  if (r.lessons.length) {
    r.lessons.forEach((l, i) => lessonList.appendChild(h('li', { class: 'bs-res-lesson', style: { '--i': i } },
      h('span', { class: 'bs-res-lesson-n', text: String(i + 1) }),
      h('div', { class: 'bs-res-lesson-b' }, h('p', { class: 'bs-res-lesson-t', text: l.text }), l.fix ? h('p', { class: 'bs-res-lesson-fix' }, icon('check'), h('span', { text: l.fix })) : null))));
  } else lessonList.appendChild(h('li', { class: 'bs-res-lesson is-empty' }, h('div', { class: 'bs-res-lesson-b' }, h('p', { class: 'bs-res-lesson-t', text: 'Cassandra has nothing to say. That has never happened.' }))));
  const cass = h('div', { class: 'bs-res-cass' }, h('div', { class: 'bs-res-cass-face' }, avatar('cassandra')), h('div', { class: 'bs-res-cass-id' }, h('b', { text: 'Cassandra' }), h('span', { text: 'She said so. Several times.' })));
  const lessonsTab = K.tablet('Post-mortem', h('div', { class: 'bs-res-lessonwrap' }, cass, lessonList), { variant: 'glass', icon: 'scroll', tight: true, class: 'bs-res-tab bs-res-lessontab' });

  // ------------------------------------------------------------ extras (survival / daily)
  const extras = [];
  if (isSurvival) extras.push(survivalPanel(ctx, r));
  if (isDaily) extras.push(dailyResultPanel(ctx, r));

  // ------------------------------------------------------------ actions
  const nextId = isMission && r.canNext && r.mission.next ? r.mission.next : null;
  const rematchLabel = isSurvival ? 'One more wave' : 'Again, but smarter';
  const rematch = K.button(rematchLabel, { variant: nextId ? 'secondary' : 'primary', size: nextId ? 'md' : 'lg', icon: 'refresh', hint: 'KeyR', id: 'res-rematch', onClick: () => { leaveOverlay(); ctx.game.rematch(); } });
  const tweak = K.button('Tweak army', { variant: 'secondary', icon: 'hammer', hint: 'KeyT', id: 'res-tweak', onClick: () => { leaveOverlay(); ctx.game.tweak(); } });
  const canKill = !!(ctx.game && typeof ctx.game.killcam === 'function' && r.canKillcam !== false);
  const kill = canKill ? K.button('Kill-cam', { variant: 'secondary', icon: 'eye', hint: 'KeyK', id: 'res-killcam', onClick: () => playKillcam() }) : null;
  const next = nextId ? K.button('Next mission', { variant: 'primary', size: 'lg', icon: 'forward', id: 'res-next', sub: r.mission.nextTitle || null, onClick: () => { leaveOverlay(); ctx.nav.goto('briefing', { mission: nextId }); } }) : null;
  const menu = K.button(isMission ? 'Map' : 'Menu', { variant: 'ghost', icon: isMission ? 'map' : 'door', hint: 'Escape', id: 'res-menu', sound: 'ui_back', onClick: () => goMenu() });
  const actions = h('footer', { class: 'bs-res-actions' }, next, rematch, tweak, kill, menu);
  function goMenu() { try { ctx.game.exitToMenu(); } catch (e) { /* not ready */ } leaveOverlay(); ctx.nav.goto(isMission ? 'campaign' : 'title'); }

  // kill-cam: hide the results while the cinematic plays, bring them back when it ends (or on click / Esc)
  const back = h('button', { class: 'bs-killcam-back', type: 'button', hidden: true, text: 'Back to results (Esc)' });
  let cam = false;
  async function playKillcam() {
    if (cam) return; cam = true; root.classList.add('is-killcam'); back.hidden = false;
    try { await ctx.game.killcam(); } catch (e) { /* playback failed: just return to the results */ }
    endKillcam();
  }
  function endKillcam() { if (!cam) return; cam = false; root.classList.remove('is-killcam'); back.hidden = true; try { K.focusFirst(actions); } catch (e) { /* focus optional */ } }
  back.addEventListener('click', endKillcam);

  // ------------------------------------------------------------ assemble
  const grid = h('div', { class: 'bs-res-grid' + (extras.length ? ' has-extras' : '') }, statsTab, mvpTab, lessonsTab);
  const body = h('div', { class: 'bs-res-body vw-scroll' }, hero, extras.length ? h('div', { class: 'bs-res-extras' }, extras) : null, grid);
  const conf = !rm && b.kind !== 'draw' ? confetti(b.kind === 'win' ? 40 : 22, b.kind === 'win' ? 'party' : 'ash', 11) : null;
  const sr = h('p', { class: 'vw-sr', role: 'status', text: b.title + ' ' + b.sub });
  root.append(h('div', { class: 'bs-scrim is-results is-' + b.kind }), conf, h('div', { class: 'bs-res-shell' }, body, actions), back, sr);

  // slide-in choreography (transform/opacity only; kit zeroes the durations under Reduce Motion)
  K.enter(hero.querySelector('.bs-res-ribbon'), 'pop', 0);
  K.enter(statsTab, 'left', 2); K.enter(mvpTab, 'pop', 3); K.enter(lessonsTab, 'right', 4);
  Array.from(actions.children).forEach((c, i) => K.enter(c, 'pop', 6 + i));
  if (!rm) {
    anim(ctx, heroArt, [{ transform: 'scale(.3) rotate(-18deg)', opacity: 0 }, { transform: 'scale(1.08) rotate(3deg)', opacity: 1, offset: 0.6 }, { transform: 'scale(1) rotate(0)', opacity: 1 }], { duration: 700, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' });
    (hero.querySelectorAll('.bs-res-star') || []).forEach((el, i) => { anim(ctx, el, [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1.2)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 480, delay: 700 + i * 260, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }); });
  }
  (r.stars || []).forEach((s, i) => { if (s.earned) d.timeout(() => sfx(ctx, 'ui_achievement', { vol: 0.5, pitch: 1 + i * 0.12 }), 700 + i * 260); });
  try { (nextId ? next : rematch).focus({ preventScroll: true }); } catch (e) { /* focus optional */ }

  return {
    r,
    onBack() { if (cam) { endKillcam(); return true; } goMenu(); return true; },
    onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      if (cam) { if (e.code === 'Escape' || e.code === 'KeyK') { endKillcam(); return true; } return true; }
      if (e.code === 'KeyR') { rematch.click(); return true; }
      if (e.code === 'KeyT') { tweak.click(); return true; }
      if (e.code === 'KeyK' && kill) { kill.click(); return true; }
      if (e.code === 'Enter' && nextId && document.activeElement === document.body) { next.click(); return true; }
      return true;                     // swallow: nothing underneath should react while results are up
    },
    destroy() { d.run(); },
  };
}
