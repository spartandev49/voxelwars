// @serial  wall-clock-sensitive (the first-Tab check waits a fixed 800 ms and fails when the box is busy: measured on the v8 baseline too): serial lane, re-run alone before red
// UI4: keyboard-only operation of title, quick-battle setup, placement and settings (pause/results belong to UI-B). Visible focus ring; Esc/back works.
import { open, check, finish } from './lib.mjs';

const L = await open([1280, 720]);
const p = L.p;
const active = () => p.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return null; const cs = getComputedStyle(a); return { id: a.id, tag: a.tagName.toLowerCase(), role: a.getAttribute('role'), fv: a.matches(':focus-visible'), ow: parseFloat(cs.outlineWidth), os: cs.outlineStyle, label: (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 24) }; });
const screen = () => p.evaluate(() => window.__ui.app.nav.current());
const press = async (k, n = 1) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await p.waitForTimeout(25); } };

/* ---------------- first Tab (QA round 1): lands on the first control of the page, not on <body> ---------------- */
for (const scr of ['quick', 'settings', 'codex', 'credits']) {
  await L.ev((id) => window.__ui.goto(id), scr); await p.waitForTimeout(800);   // Quick Battle moves focus to its big button after 80 ms: let that happen, then clear focus
  await p.evaluate(() => { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); });
  await press('Tab');
  const t = await p.evaluate(() => { const a = document.activeElement; const sc = document.querySelector('.vw-screen'); return { onBody: !a || a === document.body, inside: !!(sc && a && sc.contains(a)) }; });
  check(`first Tab on ${scr} lands on a control inside the page`, !t.onBody && t.inside, JSON.stringify(t));
}

/* ---------------- title ---------------- */
await L.run('title');
await p.waitForTimeout(250);
let a = await active();
check('title: Quick Battle has initial focus', a && a.id === 'menu-quick', JSON.stringify(a));
const seen = new Map();
for (let i = 0; i < 16; i++) { await press('Tab'); const x = await active(); if (x) seen.set(x.id || x.label, x); }
const wantIds = ['menu-campaign', 'menu-survival', 'menu-daily', 'menu-arena', 'menu-workshop', 'menu-codex', 'menu-achievements', 'menu-settings', 'menu-credits', 'menu-diagnostics'];
check('title: Tab reaches every menu entry, Diagnostics and mute', wantIds.every((i) => seen.has(i)) && Array.from(seen.values()).some((x) => /mute|unmute/i.test(x.label)), 'missing: ' + wantIds.filter((i) => !seen.has(i)).join(','));
check('title: every focused control shows a >=3px focus ring (:focus-visible)', Array.from(seen.values()).every((x) => x.fv && x.os !== 'none' && x.ow >= 3), JSON.stringify(Array.from(seen.values()).filter((x) => !(x.fv && x.os !== 'none' && x.ow >= 3)).slice(0, 3)));
await L.run('title'); await p.waitForTimeout(200);
await press('ArrowDown');
a = await active(); check('title: ArrowDown moves through the menu (role=menu roving)', a && a.id !== 'menu-quick' && a.role === 'menuitem', JSON.stringify(a));
await L.run('title'); await p.waitForTimeout(200);
await press('Enter'); await p.waitForTimeout(250);
check('title: Enter on Quick Battle opens the setup', (await screen()) === 'quick');
await press('Escape'); await p.waitForTimeout(200);
check('quick: Esc goes back to the title', (await screen()) === 'title', await screen());

/* ---------------- quick battle setup ---------------- */
await L.run('quick'); await p.waitForTimeout(250);
const seenQ = new Map();
for (let i = 0; i < 40; i++) { await press('Tab'); const x = await active(); if (x) seenQ.set(x.id || x.label, x); }
const wantQ = ['qb-arena-prev', 'qb-arena-next', 'qb-quick-fight', 'qb-place', 'qb-budget', 'qb-difficulty'];
const haveQ = (id) => Array.from(seenQ.keys()).some((k) => k === id || k.startsWith(id));
check('quick: Tab reaches arena, armies, budget, difficulty and both action buttons', ['qb-arena-prev', 'qb-arena-next', 'qb-quick-fight', 'qb-place'].every(haveQ) && Array.from(seenQ.values()).some((x) => x.role === 'radio'), 'seen ' + Array.from(seenQ.keys()).slice(0, 20).join(','));
check('quick: focus ring visible everywhere', Array.from(seenQ.values()).every((x) => x.fv && x.ow >= 2), JSON.stringify(Array.from(seenQ.values()).filter((x) => !(x.fv && x.ow >= 2)).slice(0, 3)));
await L.run('quick'); await p.waitForTimeout(200);
const before = await p.evaluate(() => document.querySelector('.vw-qb__arena-name').textContent);
await p.focus('#qb-arena-next'); await press('Enter'); await p.waitForTimeout(150);
const after = await p.evaluate(() => document.querySelector('.vw-qb__arena-name').textContent);
check('quick: arena carousel advances with the keyboard', before !== after, `${before} -> ${after}`);
await p.focus('#qb-arena-marathon, .vw-qb__mini[aria-checked=true]'); await press('ArrowRight'); await p.waitForTimeout(120);
check('quick: ArrowRight on the arena strip selects the next arena', (await p.evaluate(() => document.querySelector('.vw-qb__mini[aria-checked=true]').dataset.arena)) !== 'marathon');
await p.focus('#qb-mode .vw-seg__opt[aria-checked=true]'); await press('ArrowRight'); await p.waitForTimeout(150);
check('quick: Simple/Advanced switch works by arrow key', await p.evaluate(() => !document.querySelector('.vw-qb').classList.contains('is-simple')));
await p.focus('#qb-place'); await press('Enter'); await p.waitForTimeout(300);
check('quick: Enter on "Place armies" opens placement', (await screen()) === 'placement', await screen());

/* ---------------- placement ---------------- */
await L.run('placement'); await p.waitForTimeout(300);
await p.evaluate(() => { const b = document.getElementById('pl-hint-dismiss'); if (b) b.click(); });
await p.focus('#pl-cards .vw-card');
await press('Enter'); await p.waitForTimeout(100);
check('placement: Enter on a soldier card selects it', await p.evaluate(() => document.querySelector('#pl-cards .vw-card[aria-pressed=true]') !== null));
await press('ArrowDown');
a = await active(); check('placement: ArrowDown moves between soldier cards', a && a.tag === 'button', JSON.stringify(a));
await p.evaluate(() => document.activeElement.blur());
const m0 = await p.evaluate(() => document.querySelector('.vw-pl__mode[aria-checked=true]').dataset.mode);
await press('b'); await p.waitForTimeout(80);
const m1 = await p.evaluate(() => document.querySelector('.vw-pl__mode[aria-checked=true]').dataset.mode);
check('placement: B cycles the brush', m0 !== m1, `${m0} -> ${m1}`);
await press(' '); await p.waitForTimeout(60);
a = await active(); check('placement: Space focuses FIGHT', a && a.id === 'pl-fight', JSON.stringify(a));
await press('Control+z'); await p.waitForTimeout(80);
check('placement: Ctrl+Z undoes', await p.evaluate(() => window.__ui.game.tools.canRedo()));
const seenP = new Set();
for (let i = 0; i < 70; i++) { await press('Tab'); const x = await active(); if (x) seenP.add(x.id); }
check('placement: Tab reaches tabs, search, filters, cards, history, presets, auto-fill and FIGHT', ['pl-search', 'pl-undo', 'pl-clear', 'pl-save-army', 'pl-load-army', 'pl-fill-enemy', 'pl-fight'].every((i) => seenP.has(i)), 'seen: ' + Array.from(seenP).join(','));
await p.keyboard.press('Escape'); await p.waitForTimeout(250);
check('placement: Esc leaves to the previous screen', (await screen()) !== 'placement', await screen());

/* ---------------- settings ---------------- */
await L.run('settings_graphics'); await p.waitForTimeout(250);
await p.focus('#set-tabs-graphics'); await press('ArrowDown'); await p.waitForTimeout(100);
check('settings: ArrowDown moves between tabs and shows the panel', await p.evaluate(() => document.getElementById('set-tabs-gameplay').getAttribute('aria-selected') === 'true' && document.querySelector('#set-panel-gameplay') !== null));
await L.run('settings_graphics'); await p.waitForTimeout(150);
await p.focus('#set-shadows'); const sh0 = await p.evaluate(() => window.__ui.app.settings.get('shadows')); await press(' ');
check('settings: Space toggles a switch and applies immediately', (await p.evaluate(() => window.__ui.app.settings.get('shadows'))) === !sh0);
await p.focus('#set-resscale'); const rs0 = await p.evaluate(() => window.__ui.app.settings.get('resScale')); await press('ArrowLeft'); await press('ArrowLeft');
check('settings: arrow keys move a slider and apply immediately', (await p.evaluate(() => window.__ui.app.settings.get('resScale'))) < rs0);
await L.run('settings_controls'); await p.waitForTimeout(150);
await p.focus('#key-pan_up'); await press('Enter'); await p.waitForTimeout(80);
check('settings: Enter on Rebind starts listening', await p.evaluate(() => document.getElementById('key-pan_up').textContent.includes('Press')));
await press('KeyJ'); await p.waitForTimeout(120);
check('settings: pressing a key rebinds the action', (await p.evaluate(() => window.__ui.app.settings.get('keys').pan_up)) === 'KeyJ');
await p.focus('#key-follow'); await press('Enter'); await p.waitForTimeout(60); await press('KeyT'); await p.waitForTimeout(250);
check('settings: a conflicting key opens the swap dialog (conflict detection)', await p.evaluate(() => !!document.querySelector('.vw-modal') && document.querySelector('.vw-modal').textContent.includes('already used')));
await press('Escape'); await p.waitForFunction(() => !document.querySelector('.vw-modal'), null, { timeout: 2500 }).catch(() => {});
check('settings: Esc cancels the conflict dialog and keeps the old binding', await p.evaluate(() => !document.querySelector('.vw-modal') && !window.__ui.app.settings.get('keys').follow));
await p.focus('#key-rot_left'); await press('Enter'); await p.waitForTimeout(60); await press('Tab'); await p.waitForTimeout(150);
check('settings: reserved keys (Tab) cannot be bound', await p.evaluate(() => !window.__ui.app.settings.get('keys').rot_left));
await press('Escape'); await p.waitForTimeout(100);
await press('Escape'); await p.waitForTimeout(250);
check('settings: Esc goes back', (await screen()) !== 'settings', await screen());
const errs = L.logs.filter((l) => /error/i.test(l));
check('console clean', errs.length === 0, errs.slice(0, 3).join(' | '));
await L.close();
finish('ui4_keyboard');
