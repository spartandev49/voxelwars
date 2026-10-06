// selection.js: hover/selection card: name, type + role, hp bar, kills, status icons, joke blurb, Follow / Take Command buttons.
// hud.selection = {id, defId, name, role?, team, squad?, hp, hpMax, kills, status:[string|{id,t}], blurb, canPossess?}; hud.hover (same shape) shows a lighter, button-less card.
import { h, setText, setCls, setHidden, setScaleX, setAttr, unitName, unitRole, ROLE_ICON, fmtInt, sfx } from './_dom.js';
import { icon, STATUS_ICON, STATUS_LABEL } from './_icons.js';
import { keyOf } from './_bindings.js';

export const meta = { id: 'selection', slot: 'bottom-left', order: 2 };
const MAX_STATUS = 6;

export function mount(parent, ctx) {
  const ico = h('span', { class: 'hud-sel-ico', 'aria-hidden': 'true' });
  const nameEl = h('span', { class: 'hud-sel-name' });
  const typeEl = h('span', { class: 'hud-sel-type' });
  const hpFill = h('i', { class: 'hud-bar-fill' });
  const hpBar = h('div', { class: 'hud-bar hud-sel-hp', role: 'progressbar', 'aria-label': 'Health', 'aria-valuemin': '0' }, hpFill);
  const hpTx = h('span', { class: 'hud-sel-hptx' });
  const killsN = h('b', {});
  const kills = h('span', { class: 'hud-sel-kills', 'data-tip': 'Kills', 'data-tip-pos': 'above' }, icon('skull'), killsN);
  const stat = [];
  const statWrap = h('span', { class: 'hud-sel-status', 'aria-label': 'Status effects' });
  for (let i = 0; i < MAX_STATUS; i++) { const s = { el: h('span', { class: 'hud-stat', hidden: true }), kind: '' }; stat.push(s); statWrap.appendChild(s.el); }
  const blurb = h('p', { class: 'hud-sel-blurb' });
  const follow = h('button', { class: 'hud-btn hud-sel-btn', type: 'button', id: 'hud-sel-follow', 'aria-label': 'Follow this unit', 'data-tip': 'Follow this unit (' + keyOf(ctx.settings, 'follow') + ')', 'data-tip-pos': 'above' }, icon('follow'));
  const cmd = h('button', { class: 'hud-btn hud-sel-btn is-gold', type: 'button', id: 'hud-sel-command', 'aria-label': 'Take Command', 'data-tip': 'Take Command: you drive this unit (Enter)', 'data-tip-pos': 'above' }, icon('joystick'), h('span', { text: 'Command' }));
  const actions = h('span', { class: 'hud-sel-actions' }, follow, cmd);
  const el = h('div', { class: 'hud-sel hud-panel', 'data-hud': 'selection', role: 'region', 'aria-label': 'Selected unit', hidden: true },
    ico, h('div', { class: 'hud-sel-main' },
      h('div', { class: 'hud-sel-head' }, nameEl, typeEl),
      h('div', { class: 'hud-sel-hprow' }, hpBar, hpTx),
      h('div', { class: 'hud-sel-row' }, kills, statWrap, actions),
      blurb));
  parent.appendChild(el);

  const hint = h('div', { class: 'hud-sel-hint', hidden: true }, icon('help'), h('span', { text: 'Click a soldier to inspect it. Double-click to follow.' }));
  parent.appendChild(hint);
  let seenSel = false, curId = null, shownHint = false;
  try { const sh = ctx.settings.get('seenHints'); seenSel = !!(sh && sh.selection); } catch (e) { /* settings optional */ }

  follow.addEventListener('click', () => { const cam = ctx.game && ctx.game.camera; if (cam && curId != null) { try { cam.follow && cam.follow(curId); cam.setMode && cam.setMode('follow'); } catch (e) { /* not ready */ } } });
  cmd.addEventListener('click', () => { if (ctx.game && curId != null) { try { ctx.game.possess(curId); } catch (e) { /* not ready */ } sfx(ctx, 'ui_confirm', { vol: 0.6 }); } });

  return {
    el,
    update(hud) {
      const sel = hud.selection, hov = hud.hover;
      const s = sel || hov;
      setHidden(el, !s);
      const wantHint = !s && !seenSel && hud.state === 'running' && (hud.time || 0) > 4 && (hud.time || 0) < 60;
      setHidden(hint, !wantHint); shownHint = wantHint;
      if (!s) { curId = null; return; }
      if (sel && !seenSel) { seenSel = true; try { const sh = Object.assign({}, ctx.settings.get('seenHints') || {}, { selection: true }); ctx.settings.set('seenHints', sh); } catch (e) { /* settings optional */ } }
      curId = s.id;
      setCls(el, 'is-hover', !sel);
      setCls(el, 'is-a', s.team === 0); setCls(el, 'is-b', s.team === 1);
      const role = s.role || unitRole(ctx, s.defId);
      if (ico._role !== role) { ico._role = role; ico.replaceChildren(icon(ROLE_ICON[role] || 'sword')); }
      setText(nameEl, s.name || unitName(ctx, s.defId));
      setText(typeEl, unitName(ctx, s.defId) + (role ? ' · ' + role : ''));
      const f = s.hpMax > 0 ? Math.max(0, Math.min(1, s.hp / s.hpMax)) : 0;
      setScaleX(hpFill, f);
      setCls(hpBar, 'is-low', f < 0.3); setCls(hpBar, 'is-mid', f >= 0.3 && f < 0.6);
      setText(hpTx, fmtInt(s.hp) + '/' + fmtInt(s.hpMax));
      setAttr(hpBar, 'aria-valuenow', Math.round(f * 100));
      setText(killsN, s.kills | 0);
      const st = s.status || [];
      for (let i = 0; i < MAX_STATUS; i++) {
        const sl = stat[i], v = st[i];
        const id = v ? (typeof v === 'string' ? v : v.id) : '';
        setHidden(sl.el, !id);
        if (id && sl.kind !== id) { sl.kind = id; sl.el.replaceChildren(icon(STATUS_ICON[id] || 'diamond')); setAttr(sl.el, 'data-tip', STATUS_LABEL[id] || id); setAttr(sl.el, 'aria-label', STATUS_LABEL[id] || id); sl.el.dataset.tipPos = 'above'; }
      }
      setText(blurb, s.blurb || '');
      setHidden(blurb, !s.blurb);
      setHidden(actions, !sel);
      setHidden(cmd, !sel || s.team !== 0 || s.canPossess === false);
    },
    isHintShown: () => shownHint,
    destroy() { el.remove(); hint.remove(); },
  };
}
