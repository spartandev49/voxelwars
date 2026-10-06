// UI1: every screen reachable, no dead buttons. For each scenario every visible interactive element is activated (fresh screen each time)
// and must produce a visible effect: DOM change (screen switch, modal, toast, state attribute, label...), a changed control value, or a game call.
// Large homogeneous groups (arena strip, faction chips, unit cards) are sampled first/middle/last; an already-selected radio/tab is a valid no-op.
import { open, check, finish } from './lib.mjs';

const SKIP = new Set(['toast_kit', 'modal_reset']);
const L = await open([1280, 720]);
const names = (await L.ev(() => window.__ui.scenarios.map((s) => s.name))).filter((n) => !SKIP.has(n));
let tested = 0, total = 0;
for (const name of names) {
  const r = await L.ev((n) => window.__ui.registry[window.__ui.scenarios.find((s) => s.name === n).screen] ? window.__ui.clickthrough(n, { fast: true }) : null, name);
  if (!r) continue;
  tested += r.tested; total += r.total;
  check(`${name}: ${r.tested}/${r.total} controls activated, ${r.dead.length} dead`, r.dead.length === 0, r.dead.map((d) => `<${d.tag}#${d.id}> "${d.text}"`).slice(0, 6).join(' | '));
}
await L.close();

// phone: editors show the friendly notice (UI10); desktop goes to the editor screen
const P = await open([390, 844]);
await P.run('title');
const d1 = await P.ev(async () => { document.getElementById('menu-arena').click(); await new Promise((r) => setTimeout(r, 200)); return window.__ui.app.nav.current(); });
check('phone: Arena Builder opens the "Built for bigger screens" notice', d1 === 'phone_notice', d1);
const d2 = await P.ev(async () => { window.__ui.goto('title'); await new Promise((r) => setTimeout(r, 150)); document.getElementById('menu-workshop').click(); await new Promise((r) => setTimeout(r, 200)); return window.__ui.app.nav.current(); });
check('phone: Soldier Workshop opens the notice', d2 === 'phone_notice', d2);
await P.close();
const D = await open([1280, 720]);
await D.run('title');
const d3 = await D.ev(async () => { document.getElementById('menu-arena').click(); await new Promise((r) => setTimeout(r, 200)); return window.__ui.app.nav.current(); });
check('desktop: Arena Builder goes to the editor screen', d3 === 'arena_builder', d3);
for (const [id, scr] of [['menu-quick', 'quick'], ['menu-campaign', 'campaign'], ['menu-survival', 'survival'], ['menu-daily', 'daily'], ['menu-workshop', 'workshop'], ['menu-codex', 'codex'], ['menu-achievements', 'achievements'], ['menu-settings', 'settings'], ['menu-credits', 'credits'], ['menu-diagnostics', 'diagnostics']]) {
  const to = await D.ev(async (i) => { window.__ui.goto('title'); await new Promise((r) => setTimeout(r, 120)); document.getElementById(i).click(); await new Promise((r) => setTimeout(r, 150)); return window.__ui.app.nav.current(); }, id);
  check(`title: ${id} -> ${scr}`, to === scr, to);
}
await D.close();
console.log(`activated ${tested} of ${total} interactive elements across ${names.length} scenarios`);
finish('ui1_clickthrough');
