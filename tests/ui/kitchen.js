// Kitchen-sink page for the UI kit (visual review + a handy catalogue for UI-B). Entry for: node tools/shot_ui.mjs --entry=tests/ui/kitchen.js
import * as K from '../../src/ui/kit.js';
import { STAT_TABLE } from '../../src/content/era_ancient/stats.js';

const rootEl = document.getElementById('vw-root');
const unit = (id) => Object.assign({ id, name: id.replace(/_/g, ' ') }, STAT_TABLE[id]);

const frame = K.pageFrame({ title: 'Kit kitchen sink', sub: 'Every component, once', onBack: () => {} });
frame.mount(rootEl);
const grid = K.h('div', { class: 'vw-grid', style: { gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 22rem), 1fr))', alignItems: 'start' } });
frame.content.appendChild(grid);

const t = (title, ...kids) => { const el = K.tablet(title, K.h('div', { class: 'vw-col' }, ...kids)); grid.appendChild(el); return el; };

t('Buttons',
  K.h('div', { class: 'vw-row vw-wrapflex' }, K.button('Primary', { variant: 'primary', icon: 'play' }), K.button('Secondary', { icon: 'gear' }), K.button('Ghost', { variant: 'ghost' }), K.button('Danger', { variant: 'danger', icon: 'trash' }), K.button('Olive', { variant: 'olive' })),
  K.h('div', { class: 'vw-row vw-wrapflex' }, K.button('Small', { size: 'sm' }), K.button('Large', { size: 'lg', variant: 'primary' }), K.button('Disabled', { disabled: true }), K.iconButton('undo', 'Undo'), K.iconButton('redo', 'Redo'), K.iconButton('trash', 'Clear', { variant: 'danger' })),
  K.button('Quick Battle', { variant: 'primary', size: 'xl', block: true, icon: 'sword', sub: 'Random arena, balanced armies, instant regret' }),
  K.h('div', { class: 'vw-row' }, K.button('Fight', { variant: 'primary', hint: 'Space' }), K.kbd('KeyW'), K.kbd('Space'), K.kbd('ArrowLeft'), K.kbd('Ctrl'), K.kbd('Z')));

const tb = K.tabs([{ id: 'a', label: 'Hellenes', dot: '#2a5db0' }, { id: 'b', label: 'Romans', dot: '#b3262e', badge: 6 }, { id: 'c', label: 'Mythic', dot: '#d4a017' }], { label: 'Faction', value: 'b' });
t('Tabs + chips', tb,
  K.h('div', { class: 'vw-chips' }, K.chip('Melee', { variant: 'crimson' }), K.chip('Ranged', { variant: 'olive' }), K.chip('Cavalry', { variant: 'lapis' }), K.chip('Hero', { variant: 'gold' }), K.chip('Siege', { variant: 'lava' }), K.chip('Support', { variant: 'pink' }), K.chip('Roadmap', { variant: 'dash' })),
  K.h('div', { class: 'vw-chips' }, K.chip('Filter on', { pressed: true }), K.chip('Filter off', { pressed: false }), K.chip('Team A', { variant: 'team-a' }), K.chip('Team B', { variant: 'team-b' })),
  K.segmented({ label: 'Budget', value: 'battle', options: [{ value: 's', label: 'Skirmish', sub: '3,000' }, { value: 'battle', label: 'Battle', sub: '8,000' }, { value: 'w', label: 'War', sub: '20,000' }, { value: 'e', label: 'Epic' }] }));

t('Controls',
  K.field('Reduce motion', K.toggle({ value: true, label: 'Reduce motion' }), { hint: 'No springs, wobbles or drifting clouds.' }),
  K.field('Shadows', K.toggle({ value: false, label: 'Shadows' })),
  K.field('Weather', K.select({ label: 'Weather', value: 'rain', options: [{ value: 'clear', label: 'Clear' }, { value: 'rain', label: 'Rain' }, { value: 'snow', label: 'Snow' }] })),
  K.field('Resolution scale', K.slider({ min: 0.5, max: 1, step: 0.05, value: 0.8, label: 'Resolution scale', format: (v) => Math.round(v * 100) + '%', ticks: [{ v: 0.5, label: '50%' }, { v: 0.75 }, { v: 1, label: '100%' }] }), { stack: true }),
  K.field('Search', K.searchBox({ label: 'Search units', placeholder: 'Search soldiers...' }), { stack: true }));

const cards = K.h('div', { class: 'vw-col' });
const hoplite = K.card(unit('hoplite'), { selected: true, count: 4, blurb: 'Spear, shield, strong opinions about formations.' });
cards.append(hoplite, K.card(unit('spartan'), { blurb: 'Kicks first, philosophises later.' }), K.card(unit('war_elephant'), { disabled: true, reason: 'Needs 650 drachmae.' }), K.card(unit('cyclops'), { locked: true, reason: 'Defeat him in the campaign.' }));
t('Unit cards', cards);

const pr = K.progress({ value: 0.62, label: '620 / 1000', tone: 'olive', tall: true });
const m = K.meter({ a: 42, b: 28, labelA: 'Blue', labelB: 'Red' });
t('Progress, meter, stats', pr, K.progress({ value: 0.9, tone: 'crimson', label: 'over budget', thin: false }), m,
  K.statBar('Health', 110, 300, { tone: 'olive', text: '110' }), K.statBar('Armor', 0.3, 0.75, { tone: 'sky', text: '30%' }), K.statBar('Speed', 2.6, 4.6, { tone: 'lapis', text: '2.6' }));
t('Feedback',
  K.h('div', { class: 'vw-row vw-wrapflex' },
    K.button('Toast', { onClick: () => K.toast('Hoplite placed. It looks smug.', { kind: 'success' }) }),
    K.button('Error', { onClick: () => K.toast('That square is underwater. Soldiers do not.', { kind: 'error' }) }),
    K.button('Modal', { onClick: () => K.ask({ title: 'Clear the field?', text: 'All placed soldiers will be dismissed. They will not be offended.', yes: 'Clear it', danger: true }) }),
    K.button('Banner', { onClick: () => K.banner('Round 1: Fight!', { kind: 'gold' }) })),
  K.note('Ink outlines, hard shadows, buttons that sink.'), K.note('Careful: placement tool has no undo for feelings.', 'warn'), K.note('Disk full. Delete something to make room.', 'bad'), K.note('Saved to this device.', 'ok'),
  K.emptyState({ icon: 'folder', title: 'No saved armies', text: 'Place some soldiers and press Save to keep them for later.', action: { label: 'Go place some' } }));

K.toast('Sticker-style toast stack, bottom centre.', { kind: 'info', ms: 600000 });
K.toast('Achievement: Goat Herder', { kind: 'achievement', ms: 600000 });
