// screens_registry.js: the battle-side screens as the router (app/router.js) would see them (keyed by meta.id).
import * as battle from '../../src/ui/screens/battle.js';
import * as countdown from '../../src/ui/screens/countdown.js';
import * as pause from '../../src/ui/screens/pause.js';
import * as results from '../../src/ui/screens/results.js';
import * as controls from '../../src/ui/screens/controls.js';
import * as photo from '../../src/ui/screens/photo.js';
import * as campaign from '../../src/ui/screens/campaign.js';
import * as briefing from '../../src/ui/screens/briefing.js';
import * as survival from '../../src/ui/screens/survival.js';
import * as daily from '../../src/ui/screens/daily.js';

export const SCREENS = {};
for (const m of [battle, countdown, pause, results, controls, photo, campaign, briefing, survival, daily]) SCREENS[m.meta.id] = m;
// stand-ins for screens owned by UI-A that these screens navigate to
const stub = (id) => ({ meta: { id, layer: 'menu' }, mount(root) { root.dataset.stub = id; const d = document.createElement('div'); d.className = 'vw-screen'; d.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;color:#fff;background:#1d2150;font:700 24px Rubik'; d.textContent = '[' + id + ' screen: owned by UI-A]'; root.appendChild(d); return { destroy() {} }; } });
for (const id of ['title', 'settings', 'placement']) if (!SCREENS[id]) SCREENS[id] = stub(id);
