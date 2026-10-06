// X2: ARIA roles on menus/tabs/dialogs, focus trap in modals, Esc closes, focus restored; plus an accessible-name scan of every screen.
import { open, check, finish } from './lib.mjs';

const L = await open([1280, 720]);
const p = L.p;
const inside = () => p.evaluate(() => { const m = document.querySelector('.vw-modal:last-of-type') || document.querySelector('.vw-modal'); const modals = Array.from(document.querySelectorAll('.vw-modal')); const top = modals[modals.length - 1]; return !!top && top.contains(document.activeElement); });

/* ---------------- roles ---------------- */
await L.run('title');
check('title menu: role=menu with role=menuitem entries', await L.ev(() => { const m = document.querySelector('nav[role=menu]'); return !!m && m.querySelectorAll('[role=menuitem]').length === 10 && m.getAttribute('aria-label') === 'Main menu'; }));
await L.run('settings_graphics');
check('settings: tablist/tab/tabpanel wiring', await L.ev(() => { const tl = document.querySelector('[role=tablist]'); const tabs = tl.querySelectorAll('[role=tab]'); const sel = tl.querySelector('[aria-selected=true]'); const panel = document.querySelector('[role=tabpanel]'); return tabs.length === 7 && !!sel && !!panel && panel.getAttribute('aria-labelledby') === sel.id; }));
check('settings: segmented controls are radiogroups, toggles are switches, sliders are labelled ranges', await L.ev(() => !!document.querySelector('[role=radiogroup] [role=radio]') && !!document.querySelector('button[role=switch][aria-checked]') && Array.from(document.querySelectorAll('input[type=range]')).every((i) => i.getAttribute('aria-label') && i.getAttribute('aria-valuetext'))));
await L.run('placement');
check('placement: budget bars are progressbars with values', await L.ev(() => Array.from(document.querySelectorAll('[role=progressbar]')).every((e) => e.getAttribute('aria-valuenow') !== null && e.getAttribute('aria-valuemax'))));
check('placement: toolbar role and labelled landmark regions', await L.ev(() => !!document.querySelector('[role=toolbar]') && !!document.querySelector('aside[aria-label]') && !!document.querySelector('[role=radiogroup][aria-label]')));

/* ---------------- modal: trap, Esc, restore ---------------- */
await L.run('settings_data');
await p.focus('#set-reset-progress');
await p.keyboard.press('Enter'); await p.waitForTimeout(350);
check('modal: role=dialog, aria-modal, labelled by its title', await L.ev(() => { const d = document.querySelector('.vw-modal'); return d.getAttribute('role') === 'alertdialog' || d.getAttribute('role') === 'dialog'; }) && await L.ev(() => { const d = document.querySelector('.vw-modal'); return d.getAttribute('aria-modal') === 'true' && document.getElementById(d.getAttribute('aria-labelledby')).textContent.length > 3; }));
check('modal: background screens are inert while it is open', await L.ev(() => Array.from(document.querySelectorAll('#vw-root > .vw-screen')).every((s) => s.hasAttribute('inert'))));
check('modal: destructive dialog starts focus on Cancel', await L.ev(() => document.activeElement.textContent.trim().toLowerCase() === 'cancel'), await L.ev(() => document.activeElement.textContent));
let ok = true; for (let i = 0; i < 9; i++) { await p.keyboard.press('Tab'); if (!(await inside())) ok = false; }
check('modal: Tab never leaves the dialog (focus trap)', ok);
ok = true; for (let i = 0; i < 9; i++) { await p.keyboard.press('Shift+Tab'); if (!(await inside())) ok = false; }
check('modal: Shift+Tab never leaves the dialog', ok);
const res = await L.ev(() => new Promise((r) => { const pr = window.__ui.K.modal({ title: 'Nested', body: 'Second dialog on top.', buttons: [{ label: 'Close', value: 'x', cancel: true }] }); pr.then(r); setTimeout(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), 200); }));
await p.waitForTimeout(450);
check('nested modal: Esc closes only the top dialog', res === null && await L.ev(() => document.querySelectorAll('.vw-modal').length === 1));
await p.keyboard.press('Escape'); await p.waitForFunction(() => !document.querySelector('.vw-modal'), null, { timeout: 2500 }).catch(() => {});
check('modal: Esc closes it', await L.ev(() => !document.querySelector('.vw-modal')));
check('modal: focus returns to the control that opened it', await L.ev(() => document.activeElement.id === 'set-reset-progress'), await L.ev(() => document.activeElement.id));
check('modal: background is interactive again', await L.ev(() => Array.from(document.querySelectorAll('#vw-root > .vw-screen')).every((s) => !s.hasAttribute('inert'))));
check('reset progress: cancelling kept the data', await L.ev(() => Object.keys(window.__ui.app.save.progress.get('stars') || {}).length > 0));
// resolve values
const yes = await L.ev(async () => { const pr = window.__ui.K.ask({ title: 'Sure?', text: 'x', yes: 'Do it' }); await new Promise((r) => setTimeout(r, 300)); Array.from(document.querySelectorAll('.vw-modal .vw-btn')).find((b) => b.textContent.includes('Do it')).click(); return pr; });
check('ask(): resolves true on the confirm button', yes === true);
const dis = await L.ev(async () => { const pr = window.__ui.K.modal({ title: 'Locked', body: 'No escape.', dismissible: false, buttons: [{ label: 'OK', value: 'ok' }] }); await new Promise((r) => setTimeout(r, 300)); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await new Promise((r) => setTimeout(r, 200)); const still = !!document.querySelector('.vw-modal'); document.querySelector('.vw-modal__foot .vw-btn').click(); await pr; return still; });
check('non-dismissible modal ignores Esc', dis === true);
const tm = await L.ev(async () => { const pr = window.__ui.K.textModal({ title: 'Paste', onSubmit: (t) => (t === 'good' ? null : 'Not good enough.') }); await new Promise((r) => setTimeout(r, 300)); const ta = document.querySelector('.vw-modal textarea'); ta.value = 'bad'; document.getElementById('vw-textmodal-ok').click(); await new Promise((r) => setTimeout(r, 120)); const err = document.querySelector('.vw-modal [role=alert]'); const stayed = !!document.querySelector('.vw-modal') && !err.classList.contains('vw-hide') && err.textContent === 'Not good enough.'; ta.value = 'good'; document.getElementById('vw-textmodal-ok').click(); const v = await pr; return { stayed, v }; });
check('textModal: validation error keeps the dialog open, then accepts', tm.stayed && tm.v === 'good', JSON.stringify(tm));
const viaNav = await L.ev(async () => { const pr = window.__ui.ctx.nav.modal({ title: 'Via nav', body: 'hello', buttons: [{ label: 'Yes', value: 7 }] }); await new Promise((r) => setTimeout(r, 300)); document.querySelector('.vw-modal__foot .vw-btn').click(); return pr; });
check('ctx.nav.modal() resolves with the button value', viaNav === 7, String(viaNav));

/* ---------------- accessible names everywhere ---------------- */
const names = await L.ev(() => window.__ui.scenarios.map((s) => s.name));
const bad = [];
for (const n of names) {
  if (await L.run(n) === false) continue;
  const r = await L.ev(() => {
    const out = [];
    const nameOf = (el) => (el.getAttribute('aria-label') || '').trim() || (el.getAttribute('aria-labelledby') && (document.getElementById(el.getAttribute('aria-labelledby')) || {}).textContent) || (el.labels && el.labels[0] && el.labels[0].textContent) || (el.textContent || '').trim() || el.getAttribute('title') || '';
    document.querySelectorAll('#vw-root button, #vw-root [role=button], #vw-root [role=tab], #vw-root [role=radio], #vw-root [role=switch], #vw-root summary, #vw-root a[href]').forEach((el) => { if (!nameOf(el).trim()) out.push('no name: ' + el.outerHTML.slice(0, 80)); });
    document.querySelectorAll('#vw-root input:not([type=hidden]), #vw-root select, #vw-root textarea').forEach((el) => { if (!nameOf(el).trim()) out.push('unlabelled field: ' + el.outerHTML.slice(0, 80)); });
    document.querySelectorAll('#vw-root img').forEach((el) => { if (!el.hasAttribute('alt')) out.push('img without alt'); });
    document.querySelectorAll('#vw-root a[target=_blank]').forEach((a) => { if (!/noopener/.test(a.rel) || !/^https?:/.test(a.href)) out.push('unsafe link ' + a.href); });
    return out;
  });
  if (r.length) bad.push(n + ': ' + r.slice(0, 3).join(' ; '));
}
check('every control on every screen has an accessible name; links are noopener', bad.length === 0, bad.slice(0, 4).join(' | '));
const errs = L.logs.filter((l) => /error/i.test(l));
check('console clean', errs.length === 0, errs.slice(0, 3).join(' | '));
await L.close();
finish('x2_a11y');
