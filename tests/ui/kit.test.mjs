// Kit behaviour: sounds fire through ctx.audio, tooltips (hover/focus/long-press), toast cap, banner, tabs/segmented keyboard, slider ticks, toggle, progress, meter.
import { open, check, finish } from './lib.mjs';

const L = await open([1280, 720]);
const p = L.p;
await L.run('title');
const audio = () => L.ev(() => window.__ui.app.calls.audio.slice());
const clear = () => L.ev(() => { window.__ui.app.calls.audio.length = 0; });
const mkHost = () => L.ev(() => { document.querySelectorAll('.kt').forEach((e) => e.remove()); const d = document.createElement('div'); d.className = 'kt vw-screen'; d.style.cssText = 'z-index:5;padding:2rem;background:#1d2150'; document.getElementById('vw-root').appendChild(d); window.__host = d; return true; });

await mkHost(); await clear();
await L.ev(() => { const K = window.__ui.K; window.__b = K.button('Hello', { variant: 'primary', id: 'kt-btn', onClick: () => { window.__clicks = (window.__clicks || 0) + 1; } }); window.__host.appendChild(window.__b); });
await p.hover('#kt-btn'); await p.waitForTimeout(80);
check('button: hover plays ui_hover', (await audio()).includes('ui_hover'));
await p.click('#kt-btn');
check('button: click plays ui_confirm (primary) and calls onClick', (await audio()).includes('ui_confirm') && (await L.ev(() => window.__clicks)) === 1);
await L.ev(() => { window.__b.setDisabled(true); });
await clear(); await p.click('#kt-btn', { force: true }).catch(() => {});
check('button: a disabled button is inert and silent', (await L.ev(() => window.__clicks)) === 1 && !(await audio()).includes('ui_confirm'));
check('button: pressing sinks the face (transform only)', await L.ev(() => { const b = document.getElementById('kt-btn'); const f = b.querySelector('.vw-btn__face'); return getComputedStyle(f).transitionProperty.includes('transform') && getComputedStyle(b, '::before').position === 'absolute'; }));

// tooltip: hover delay, keyboard focus, aria-describedby, Esc
await L.ev(() => { const K = window.__ui.K; const b = K.button('Tip me', { id: 'kt-tip' }); window.__host.appendChild(b); K.tooltip(b, 'I am a tooltip'); });
await p.hover('#kt-tip'); await p.waitForTimeout(600);
check('tooltip: shows on hover with the text', await L.ev(() => document.querySelector('.vw-tip.is-on') && document.querySelector('.vw-tip').textContent === 'I am a tooltip'));
check('tooltip: target gets aria-describedby while shown', await L.ev(() => document.getElementById('kt-tip').getAttribute('aria-describedby') === 'vw-tip' && document.getElementById('vw-tip').getAttribute('role') === 'tooltip'));
await p.mouse.move(5, 5); await p.waitForTimeout(150);
check('tooltip: hides on leave', await L.ev(() => !document.querySelector('.vw-tip.is-on')));
await p.keyboard.press('Tab'); await L.ev(() => document.getElementById('kt-tip').focus()); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab'); await p.waitForTimeout(120);
check('tooltip: shows on keyboard focus (not only hover)', await L.ev(() => !!document.querySelector('.vw-tip.is-on')));
await p.keyboard.press('Escape'); await p.waitForTimeout(100);
check('tooltip: Esc dismisses it', await L.ev(() => !document.querySelector('.vw-tip.is-on')));
await L.ev(() => { const el = document.getElementById('kt-tip'); el.blur(); const ev = (t) => new PointerEvent(t, { pointerType: 'touch', bubbles: true }); el.dispatchEvent(ev('pointerdown')); });
await p.waitForTimeout(750);
check('tooltip: touch long-press shows it', await L.ev(() => !!document.querySelector('.vw-tip.is-on')));
await L.ev(() => window.__ui.K.hideTip());
await L.ev(() => window.__ui.K.showTip({ x: 100, y: 100, text: 'In the enemy zone', kind: 'bad' }));
check('showTip: cursor-following tip with the bad style', await L.ev(() => document.querySelector('.vw-tip.is-on.vw-tip--bad') !== null));
await L.ev(() => window.__ui.K.hideTip());

// toggle / segmented / tabs / slider
await L.ev(() => { const K = window.__ui.K; window.__changes = []; window.__host.append(
  K.toggle({ id: 'kt-tog', label: 'T', value: false, onChange: (v) => window.__changes.push(['tog', v]) }),
  K.segmented({ id: 'kt-seg', label: 'S', value: 'b', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C' }], onChange: (v) => window.__changes.push(['seg', v]) }),
  K.tabs([{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }, { id: 'z', label: 'Z' }], { id: 'kt-tabs', label: 'T', value: 'x', onChange: (v) => window.__changes.push(['tab', v]) }),
  K.slider({ id: 'kt-sld', min: 0, max: 10, step: 1, value: 5, label: 'Sl', ticks: 'step', onInput: (v) => window.__changes.push(['sld', v]) })); });
await clear();
await p.focus('#kt-tog'); await p.keyboard.press('Space');
check('toggle: Space flips it, plays ui_toggle, aria-checked updates', (await L.ev(() => window.__changes.pop())).join() === 'tog,true' && (await audio()).includes('ui_toggle') && (await L.ev(() => document.getElementById('kt-tog').getAttribute('aria-checked'))) === 'true');
await p.focus('#kt-seg [aria-checked=true]'); await p.keyboard.press('ArrowRight');
check('segmented: arrow key selects the next option and moves focus', (await L.ev(() => window.__changes.pop())).join() === 'seg,c' && await L.ev(() => document.activeElement.textContent === 'C'));
await p.keyboard.press('ArrowRight');
check('segmented: wraps around', (await L.ev(() => window.__changes.pop())).join() === 'seg,a');
await p.focus('#kt-tabs [aria-selected=true]'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('End');
check('tabs: arrow/End move selection (automatic activation)', await L.ev(() => window.__changes.slice(-2).map((c) => c.join()).join('|')) === 'tab,y|tab,z');
check('tabs: only the selected tab is in the tab order', await L.ev(() => Array.from(document.querySelectorAll('#kt-tabs [role=tab]')).filter((t) => t.tabIndex === 0).length === 1));
await clear(); await p.focus('#kt-sld'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
check('slider: arrow keys change the value and tick', (await L.ev(() => window.__changes.pop()))[1] === 7 && (await audio()).includes('ui_tick'));
check('slider: tick marks rendered and aria-valuetext set', await L.ev(() => document.querySelectorAll('#kt-sld')[0].closest('.vw-slider').querySelectorAll('.vw-slider__tick').length === 11 && document.getElementById('kt-sld').getAttribute('aria-valuetext') === '7'));

// progress / meter / toast cap / banner
await L.ev(() => { const K = window.__ui.K; const pg = K.progress({ id: 'kt-pg', max: 200, value: 50, label: 'x' }); window.__host.append(pg, K.meter({ a: 30, b: 10 })); pg.set(150, '150 / 200'); window.__pg = pg; });
check('progress: aria-valuenow + scale transform driven by --v', await L.ev(() => { const e = window.__pg; return e.getAttribute('aria-valuenow') === '150' && e.style.getPropertyValue('--v') === '0.75'; }));
check('meter: share of team A drives the divider', await L.ev(() => document.querySelector('.vw-meter').style.getPropertyValue('--a') === '0.75'));
await L.ev(() => { const K = window.__ui.K; for (let i = 0; i < 7; i++) K.toast('Toast ' + i, { kind: i % 2 ? 'error' : 'info', ms: 600000 }); });
check('toast: at most 4 are stacked', await L.ev(() => document.querySelectorAll('.vw-toast').length === 4));
check('toast: errors are role=alert, others role=status', await L.ev(() => Array.from(document.querySelectorAll('.vw-toast--error')).every((t) => t.getAttribute('role') === 'alert') && Array.from(document.querySelectorAll('.vw-toast--info')).every((t) => t.getAttribute('role') === 'status')));
await clear(); await L.ev(() => window.__ui.K.toast('Err', { kind: 'error', ms: 500 }));
check('toast: error toasts play ui_error', (await audio()).includes('ui_error'));
await p.waitForTimeout(1300);
await L.ev(() => document.querySelectorAll('.vw-toast').forEach((t) => t.dismiss && t.dismiss()));
await L.ev(() => { window.__ban = window.__ui.K.banner('Round 1: Fight!', { ms: 400 }); });
check('banner: appears as a status ribbon', await L.ev(() => document.querySelector('.vw-banner[role=status]') !== null));
await p.waitForFunction(() => !document.querySelector('.vw-banner'), null, { timeout: 3000 }).catch(() => {});
check('banner: hides itself', await L.ev(() => !document.querySelector('.vw-banner')));

// card: disabled is soft (tooltip + toast), selected state, count badge
await L.ev(() => { const K = window.__ui.K; const d = window.__ui.ctx.content.units.hoplite; const c = K.card(d, { onClick: () => { window.__cardClicks = (window.__cardClicks || 0) + 1; }, selected: false, id: 'kt-card' }); c.id = 'kt-card'; window.__host.appendChild(c); c.setCount(3); window.__card = c; });
await p.click('#kt-card'); check('card: click calls onClick', (await L.ev(() => window.__cardClicks)) === 1);
await L.ev(() => window.__card.setDisabled(true, 'Not enough budget left for this one.'));
await p.click('#kt-card', { force: true }); await p.waitForTimeout(80);
check('card: disabled card stays focusable, does not select, and explains why', (await L.ev(() => window.__cardClicks)) === 1 && await L.ev(() => document.querySelector('.vw-toast--warn') !== null && document.getElementById('kt-card').getAttribute('aria-disabled') === 'true'));
check('card: count badge shows', await L.ev(() => document.querySelector('#kt-card .vw-card__count').textContent === '3'));
check('card: role chip and counter chips from unit data', await L.ev(() => document.querySelector('#kt-card .vw-chip--crimson') !== null && /Beats/.test(document.getElementById('kt-card').textContent)));

// optional screen exit tween (transform/opacity only)
const ex = await L.ev(async () => { const d = document.createElement('div'); d.textContent = 'x'; document.getElementById('vw-root').appendChild(d); const api = window.__ui.K.withExit(d, { destroy() {} }); const p = api.exit(); const isP = typeof p.then === 'function'; await p; const o = getComputedStyle(d).opacity; d.remove(); return { isP, o }; });
check('withExit: api.exit() returns a promise and fades the root out', ex.isP && ex.o === '0', JSON.stringify(ex));

// emptyState + field + copyText fallback
await L.ev(() => { window.__host.append(window.__ui.K.emptyState({ icon: 'folder', title: 'Nothing here', text: 'Because.', action: { label: 'Do something', id: 'kt-empty-act' } })); });
check('emptyState: icon, title, text, action', await L.ev(() => !!document.querySelector('.vw-empty .vw-empty__icon svg') && document.querySelector('.vw-empty__title').textContent === 'Nothing here' && !!document.getElementById('kt-empty-act')));
const copied = await L.ev(async () => { window.__ui.app.calls.clipboard.length = 0; const ok = await window.__ui.K.copyText('seed 42'); return { ok, calls: window.__ui.app.calls.clipboard.slice() }; });
check('copyText: uses ctx.platform.clipboard and toasts', copied.ok === true && copied.calls[0] === 'seed 42' && await L.ev(() => /Copied/.test(document.querySelector('.vw-toast:last-child') ? document.body.textContent : '')));
await L.close();
// clipboard that fails -> selectable text fallback (UI14/AGENTS: clipboard may reject)
const L2 = await open([1280, 720]);
await L2.ev(() => { const real = window.__ui.ctx.platform.clipboard; window.__ui.ctx.platform.clipboard = async () => false; });
const fb = await L2.ev(async () => { const pr = window.__ui.K.copyText('select me'); await new Promise((r) => setTimeout(r, 350)); const ta = document.querySelector('.vw-modal textarea'); const ok = !!ta && ta.value === 'select me' && ta.readOnly; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); const r = await pr; return { ok, r }; });
check('copyText: when the clipboard rejects, a selectable text box appears (returns false)', fb.ok && fb.r === false, JSON.stringify(fb));
const errs = L.logs.concat(L2.logs).filter((l) => /error/i.test(l));
check('console clean', errs.length === 0, errs.slice(0, 3).join(' | '));
await L2.close();
finish('kit');
