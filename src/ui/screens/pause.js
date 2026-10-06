// pause.js: the pause overlay. Resume, Restart (confirm), Controls, Settings shortcut, Quit to menu (confirm), plus quick settings:
// the Performance quick toggle (quality tier + auto-scale), master/music volume, subtitles and Reduce Motion.
// app/main.js opens it with game.pause(true) on Esc / the HUD gear and closes it again when game.on('pause', {paused:false}) fires.
import * as K from '../kit.js';
import { h, disposer, sfx } from '../hud/_dom.js';

export const meta = { id: 'pause', layer: 'battle', music: 'none', canvas: 'scene' };

const TIERS = [['potato', 'Potato', 'Toaster mode'], ['papyrus', 'Papyrus', 'Kind to laptops'], ['marble', 'Marble', 'The sensible default'], ['olympian', 'Olympian', 'Show-off']];
const SUBS = ['Philosophers are using this time to argue.', 'The war will wait. Probably.', 'Somewhere, a chicken is catching its breath.', 'Pause: the only time anyone has a good idea.'];

export function mount(root, ctx) {
  try { K.init(ctx); } catch (e) { /* kit optional in tools */ }
  const d = disposer();
  root.classList.add('bs', 'bs-pause');
  root.style.pointerEvents = 'auto';
  const g = () => ctx.game;
  const S = ctx.settings;
  const get = (k, dflt) => { try { const v = S.get(k); return v === undefined || v === null ? dflt : v; } catch (e) { return dflt; } };
  const set = (k, v) => { try { S.set(k, v); } catch (e) { /* settings optional */ } };

  const close = () => { try { g().pause(false); } catch (e) { /* not ready */ } try { ctx.nav.closeOverlay && ctx.nav.closeOverlay('pause'); } catch (e) { /* closed already */ } };
  const ask = (o) => (ctx.nav && ctx.nav.modal ? ctx.nav.modal(o) : Promise.resolve(true));

  const resume = K.button('Resume', { variant: 'primary', size: 'lg', icon: 'play', hint: 'Escape', block: true, id: 'pause-resume', onClick: close });
  const restart = K.button('Again, from the top', { variant: 'secondary', icon: 'refresh', block: true, id: 'pause-restart', align: 'start', onClick: async () => {
    const ok = await ask({ title: 'Restart this battle?', body: 'Everyone gets up, brushes off the dust and pretends nothing happened. Your placement is kept.', buttons: [{ label: 'Keep fighting', variant: 'secondary', value: false, cancel: true }, { label: 'Restart', variant: 'primary', value: true }] });
    if (ok === true) { try { ctx.nav.closeOverlay('pause'); } catch (e) { /* ignore */ } g().pause(false); g().rematch(); }
  } });
  const controls = K.button('Controls', { variant: 'secondary', icon: 'keyboard', block: true, id: 'pause-controls', align: 'start', onClick: () => { if (ctx.nav.overlay) ctx.nav.overlay('controls'); } });
  const settings = K.button('All settings', { variant: 'secondary', icon: 'gear', block: true, id: 'pause-settings', align: 'start', onClick: () => { if (ctx.nav.overlay) ctx.nav.overlay('settings', { from: 'pause' }); else ctx.nav.goto('settings', { from: 'pause' }); } });
  const quit = K.button('Quit to menu', { variant: 'danger', icon: 'door', block: true, id: 'pause-quit', align: 'start', onClick: async () => {
    const ok = await ask({ title: 'Quit to the menu?', body: 'The battle ends here. Your army setup is kept, so you can try again (or blame the goat).', buttons: [{ label: 'Keep fighting', variant: 'secondary', value: false, cancel: true }, { label: 'Quit to menu', variant: 'danger', value: true }] });
    if (ok === true) { try { g().exitToMenu(); } catch (e) { /* ignore */ } try { ctx.nav.closeOverlay('pause'); } catch (e) { /* ignore */ } ctx.nav.goto('title'); }
  } });
  const menu = h('div', { class: 'bs-pause-menu' }, resume, restart, controls, settings, quit);

  // quick settings
  const tier = K.segmented({ label: 'Performance', value: get('quality', 'marble'), options: TIERS.map(([v, l, t]) => ({ value: v, label: l, title: t })), onChange: (v) => set('quality', v), id: 'pause-quality' });
  const auto = K.toggle({ label: 'Auto-scale resolution', value: !!get('autoScale', true), onChange: (v) => set('autoScale', v), id: 'pause-autoscale' });
  const vol = (key, label, id) => K.slider({ min: 0, max: 1, step: 0.05, value: +get(key, 0.8), label, id, format: (v) => Math.round(v * 100) + '%', onInput: (v) => set(key, v) });
  const master = vol('vol.master', 'Master volume', 'pause-vol-master'), music = vol('vol.music', 'Music volume', 'pause-vol-music');
  const subs = K.toggle({ label: 'Announcer subtitles', value: !!get('subtitles', true), onChange: (v) => set('subtitles', v), id: 'pause-subtitles' });
  const rm = K.toggle({ label: 'Reduce Motion', value: !!get('reduceMotion', false), onChange: (v) => set('reduceMotion', v), id: 'pause-reduce' });
  const quick = h('div', { class: 'bs-pause-quick' },
    h('h3', { class: 'bs-sub', text: 'Quick settings' }),
    K.field('Performance', tier, { stack: true, hint: 'Lower tiers trade pretty for smooth. Applies instantly.' }),
    K.field('Auto-scale resolution', auto),
    K.field('Master volume', master), K.field('Music volume', music),
    K.field('Announcer subtitles', subs), K.field('Reduce Motion', rm));
  d.add(S && S.on ? S.on(() => { tier.set(get('quality', 'marble'), true); auto.set(!!get('autoScale', true), true); subs.set(!!get('subtitles', true), true); rm.set(!!get('reduceMotion', false), true); }) : null);

  const body = h('div', { class: 'bs-pause-body' }, menu, quick);
  const card = K.tablet('Paused', body, { variant: 'glass', icon: 'pause', sub: SUBS[(Math.random() * SUBS.length) | 0], id: 'bs-pause-card', class: 'bs-pause-card' });
  const scrim = h('div', { class: 'bs-scrim' });
  root.append(scrim, h('div', { class: 'bs-center' }, card));
  K.enter(card, 'pop');
  sfx(ctx, 'ui_panel_open', { vol: 0.6 });
  const host = root.parentElement;
  if (host) host.classList.add('bs-pause-open');             // the HUD's PAUSED ribbon steps aside (hud.css)
  d.add(() => { if (host) host.classList.remove('bs-pause-open'); });

  // keep the world behind the overlay out of reach (focus + screen readers) while it is open
  const siblings = Array.from(root.parentElement ? root.parentElement.children : []).filter((c) => c !== root && !c.hasAttribute('inert'));
  siblings.forEach((c) => c.setAttribute('inert', ''));
  d.add(() => siblings.forEach((c) => c.removeAttribute('inert')));
  try { resume.focus({ preventScroll: true }); } catch (e) { /* focus optional */ }

  return {
    onBack() { close(); return true; },
    onKey(e) {
      if (e.code === 'Tab') {
        const f = K.focusables(root); if (!f.length) return false;
        const first = f[0], last = f[f.length - 1], a = document.activeElement;
        if (e.shiftKey && (a === first || !root.contains(a))) { e.preventDefault(); last.focus(); return true; }
        if (!e.shiftKey && (a === last || !root.contains(a))) { e.preventDefault(); first.focus(); return true; }
        return false;
      }
      return true;       // while paused, no key may reach the battle underneath (Space would toggle pause, F would follow...)
    },
    destroy() { d.run(); },
  };
}
