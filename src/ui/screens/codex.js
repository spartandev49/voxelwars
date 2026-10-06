// Codex: faction tabs, unit grid, detail pane (turntable with drag + clip picker, stat bars, abilities, lore/joke, matchups, unlock status),
// plus Props and Arenas tabs. The turntable comes from ctx.preview.turntable (render-to-texture on the single GL context); a friendly
// placeholder shows if it is missing or throws.
import * as K from '../kit.js';
import { getT } from '../strings.js';
import { safe, unitsOf, factionIds, setThumb } from './_shared.js';
import { factionColor, factionName, ROLE_ICON, ROLE_LABEL, ROLE_CHIP, counterHints, statRows, abilityInfo, clipOptions } from '../unitinfo.js';

export const meta = { id: 'codex', layer: 'menu', music: 'menu', canvas: 'preview' };

let LAST = { tab: 'units', faction: null };
const PROP_ICON = { nature: 'laurel', architecture: 'tower', monuments: 'crown', props: 'cube' };

export function mount(root, ctx, params) {
  K.init(ctx);
  const T0 = getT(ctx), T = T0.codex;
  const cleanups = [];
  const units = ctx.content.units;
  const list = unitsOf(ctx);
  const factions = factionIds(ctx);
  const lockedIds = safe(() => ctx.save.progress.get('codex').locked, []) || [];
  const isLocked = (id) => lockedIds.indexOf(id) >= 0;
  const S = { tab: (params && params.tab) || LAST.tab, faction: LAST.faction || factions[0], search: '', sel: null, turn: null };
  if (params && params.unit && units[params.unit]) { S.tab = 'units'; S.faction = units[params.unit].faction; S.sel = params.unit; }

  const frame = K.pageFrame({ id: 'cx', title: T.title, sub: T.sub, onBack: () => { if (S.mobileDetail) { closeDetail(); return; } ctx.nav.back(); } });
  const topTabs = K.tabs([{ id: 'units', label: T.tabs.units, icon: 'users' }, { id: 'props', label: T.tabs.props, icon: 'tower' }, { id: 'arenas', label: T.tabs.arenas, icon: 'map' }], { id: 'cx-tabs', label: T.title, value: S.tab, onChange: (id) => { S.tab = id; LAST.tab = id; showTab(); } });
  const host = K.h('div', { class: 'vw-cx__host' });
  frame.content.append(K.h('div', { class: 'vw-cx__top' }, topTabs), host);
  frame.mount(root);
  cleanups.push(frame.destroy);

  function killTurn() { if (S.turn) { try { S.turn.destroy(); } catch (e) { /* ignore */ } S.turn = null; } }
  cleanups.push(killTurn);
  function showTab() { killTurn(); S.mobileDetail = false; host.replaceChildren(S.tab === 'units' ? unitsView() : S.tab === 'props' ? propsView() : arenasView()); }

  /* ---------------------------------------------------------------- units */
  function unitsView() {
    const fTabs = K.tabs(factions.map((f) => ({ id: f, label: factionName(ctx.content.factions, f), dot: factionColor(ctx.content.factions, f) })), { id: 'cx-fac', label: 'Faction', value: S.faction, scroll: true, onChange: (id) => { S.faction = id; LAST.faction = id; renderGrid(); } });
    const search = K.searchBox({ id: 'cx-search', label: T.searchUnits, placeholder: T.searchUnits + '...', onInput: (v) => { S.search = v.trim().toLowerCase(); renderGrid(); } });
    const grid = K.h('div', { class: 'vw-cx__grid', role: 'group', 'aria-label': factionName(ctx.content.factions, S.faction) });
    const detail = K.h('aside', { class: 'vw-cx__detail', 'aria-label': T.title, id: 'cx-detail' });
    const fbio = K.h('p', { class: 'vw-epigraph vw-cx__fbio' });
    const layout = K.h('div', { class: 'vw-cx' }, K.h('div', { class: 'vw-cx__list' }, fTabs, K.h('div', { class: 'vw-row vw-wrapflex vw-cx__bar' }, K.h('div', { class: 'vw-grow' }, search)), fbio, grid), detail);
    layout.fTabs = fTabs;
    function renderGrid() {
      const defs = list.filter((u) => (S.search ? (u.name + ' ' + u.role + ' ' + (u.tags || []).join(' ')).toLowerCase().indexOf(S.search) >= 0 : u.faction === S.faction));
      fbio.textContent = S.search ? '' : safe(() => ctx.content.factions[S.faction].blurb, '');
      grid.setAttribute('aria-label', factionName(ctx.content.factions, S.faction));
      if (!defs.length) { grid.replaceChildren(K.emptyState({ icon: 'search', title: T0.common.search, text: T0.placement.noMatch })); return; }
      grid.replaceChildren(...defs.map((d) => K.card(d, { factions: ctx.content.factions, locked: isLocked(d.id), reason: T.lockedText, selected: S.sel === d.id, onClick: () => select(d.id), counters: false })));
      if (!S.sel || units[S.sel] && units[S.sel].faction !== S.faction && !S.search) { /* keep selection across faction switches only if visible */ }
      if (!S.sel || !defs.some((d) => d.id === S.sel)) { const first = defs.find((d) => !isLocked(d.id)) || defs[0]; if (first && !S.mobileDetail) { S.sel = first.id; Array.from(grid.children).forEach((c) => c.setSelected && c.setSelected(c.dataset.id === S.sel)); renderDetail(first); } }
      else renderDetail(units[S.sel]);
    }
    function select(id) {
      S.sel = id; Array.from(grid.children).forEach((c) => c.setSelected && c.setSelected(c.dataset.id === id));
      renderDetail(units[id]);
      if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) { S.mobileDetail = true; layout.classList.add('is-detail'); detail.scrollTop = 0; const b = detail.querySelector('.vw-cx__back'); if (b) b.focus(); }
    }
    function closeDetailLocal() { S.mobileDetail = false; layout.classList.remove('is-detail'); killTurn(); const c = grid.querySelector(`[data-id="${S.sel}"]`); if (c) c.focus(); }
    layoutCloseDetail = closeDetailLocal;
    function renderDetail(d) {
      killTurn();
      if (!d) { detail.replaceChildren(K.emptyState({ icon: 'book', title: T.title, text: T.pick })); return; }
      const back = K.button(T0.common.back, { icon: 'back', size: 'sm', variant: 'secondary', class: 'vw-cx__back', sound: 'ui_back', id: 'cx-back-list', onClick: closeDetailLocal });
      if (isLocked(d.id)) {
        detail.replaceChildren(back, K.tablet(T.locked, K.emptyState({ icon: 'lock', title: '???', text: T.lockedText }), { id: 'cx-locked', icon: 'lock' }));
        return;
      }
      const fc = factionColor(ctx.content.factions, d.faction);
      const stage = K.h('div', { class: 'vw-cx__stage', style: { '--fc': fc } });
      const hint = K.h('div', { class: 'vw-cx__drag vw-micro', text: T.drag });
      const clips = clipOptions(d);
      const clipSeg = K.segmented({ id: 'cx-clip', label: T.clip, value: 'idle', class: 'vw-seg--compact', options: clips.map((c) => ({ value: c.id, label: T.clips[c.id] || c.id })), onChange: (v) => { const c = clips.find((x) => x.id === v); if (S.turn && S.turn.setClip) S.turn.setClip(c ? c.clip : v); } });
      try {
        if (ctx.preview && ctx.preview.turntable) S.turn = ctx.preview.turntable(stage, { unitId: d.id, clip: 'idle', size: 320, interactive: true });
        else stage.appendChild(K.emptyState({ icon: 'cube', title: d.name, text: '' }));
      } catch (e) { S.turn = null; stage.replaceChildren(K.emptyState({ icon: 'cube', title: d.name, text: '' })); }
      const rows = statRows(d, list);
      const stats = K.h('div', { class: 'vw-col vw-cx__stats' }, ...rows.map((r) => K.statBar(r.label, r.v, r.max, { tone: r.tone, text: r.text })));
      const abil = (d.abilities || []).filter((a) => a && a.id);
      const abilEl = abil.length
        ? K.h('ul', { class: 'vw-list vw-cx__abil' }, ...abil.map((a) => { const info = abilityInfo(a, ctx.content.glossary); return K.h('li', { class: 'vw-cx__ab' }, K.h('span', { class: 'vw-card__art vw-cx__ab-ico', style: { '--fc': fc } }, K.icon(info.icon)), K.h('div', { class: 'vw-grow' }, K.h('div', { class: 'vw-card__name', text: info.name + (a.cd ? ` · ${a.cd}s` : '') }), K.h('div', { class: 'vw-small vw-dim', text: info.text }))); }))
        : K.h('p', { class: 'vw-note', text: T.noAbilities });
      const cnt = counterHints(d);
      const mk = (arr, variant) => (arr.length ? K.h('div', { class: 'vw-chips' }, ...arr.map((x) => K.chip(x, { variant }))) : K.h('span', { class: 'vw-small vw-dim', text: T.none }));
      const txt = d.text || {};
      detail.replaceChildren(
        K.h('div', { class: 'vw-row vw-cx__head' }, back,
          K.h('h2', { class: 'vw-cx__name vw-display', text: d.name })),
        K.h('div', { class: 'vw-row vw-wrapflex' }, K.chip(factionName(ctx.content.factions, d.faction), { variant: 'ink', icon: 'flag' }), K.chip(ROLE_LABEL[d.role] || d.role, { variant: ROLE_CHIP[d.role], icon: ROLE_ICON[d.role] === 'scatter' ? null : ROLE_ICON[d.role] }), K.chip(K.fmtNum(d.cost) + ' ' + T0.common.drachmae, { variant: 'gold', icon: 'coin' }), K.chip(T0.common.unlocked, { variant: 'olive', icon: 'check' })),
        K.h('div', { class: 'vw-cx__stage-wrap' }, stage, hint), clipSeg,
        K.tablet(T.stats, stats, { tight: true, id: 'cx-stats', icon: 'target' }),
        K.tablet(T.abilities, abilEl, { tight: true, id: 'cx-abilities', icon: 'sparkle' }),
        K.tablet(T.lore, K.h('div', { class: 'vw-col' }, K.h('p', { class: 'vw-epigraph vw-cx__lore', text: txt.lore || '' }), txt.codexJoke ? K.h('p', { class: 'vw-cx__joke' }, K.h('span', { class: 'vw-label', text: T.joke + ' ' }), txt.codexJoke) : null), { tight: true, id: 'cx-lore', icon: 'scroll' }),
        K.tablet(T.counters, K.h('div', { class: 'vw-col' }, K.h('div', { class: 'vw-label', text: T.beats }), mk(cnt.beats, 'olive'), K.h('div', { class: 'vw-label', text: T.weak }), mk(cnt.weak, 'danger'), (d.tags && d.tags.length) ? K.h('div', { class: 'vw-label', text: T.tags }) : null, (d.tags && d.tags.length) ? K.h('div', { class: 'vw-chips' }, ...d.tags.map((x) => K.chip(x, { variant: 'dash' }))) : null), { tight: true, id: 'cx-counters', icon: 'shield' }));
    }
    renderGrid();
    return layout;
  }
  let layoutCloseDetail = () => {};
  function closeDetail() { layoutCloseDetail(); }

  /* ---------------------------------------------------------------- props */
  function propsView() {
    const props = Object.keys(ctx.content.props || {}).map((k) => ctx.content.props[k]);
    if (!props.length) return K.emptyState({ icon: 'tower', title: T.tabs.props, text: T.propsEmpty });
    const cats = ['all'].concat(Array.from(new Set(props.map((p) => p.cat || 'props'))));
    let cat = 'all';
    const grid = K.h('div', { class: 'vw-cx__pgrid' });
    const chips = K.h('div', { class: 'vw-chips', role: 'group', 'aria-label': 'Category' });
    const btns = {};
    cats.forEach((c) => { const b = K.chip(c === 'all' ? T0.common.all : c, { pressed: c === 'all', id: 'cx-cat-' + c, onClick: () => { cat = c; for (const k in btns) btns[k].setPressed(k === c); paint(); } }); btns[c] = b; chips.appendChild(b); });
    function paint() {
      grid.replaceChildren(...props.filter((p) => cat === 'all' || (p.cat || 'props') === cat).map((p) => {
        const inf = p.hp === Infinity || p.hp == null;
        return K.h('article', { class: 'vw-cx__prop', 'aria-label': p.name || p.id },
          K.h('div', { class: 'vw-card__top' }, K.h('span', { class: 'vw-card__art' }, K.icon(PROP_ICON[p.cat] || 'cube')), K.h('h3', { class: 'vw-card__name', text: p.name || p.id }), K.chip(p.cat || 'props', { variant: 'sky' })),
          K.h('dl', { class: 'vw-diag__kv vw-cx__pkv' },
            K.h('dt', { text: T.prop.hp }), K.h('dd', { text: inf ? T.prop.indestructible : K.fmtNum(p.hp) }),
            K.h('dt', { text: T.prop.radius }), K.h('dd', { text: (p.r || 0).toFixed(1) + ' u' }),
            K.h('dt', { text: T.prop.blocks }), K.h('dd', { text: p.blocks === 'full' ? T.prop.yes : T.prop.no }),
            K.h('dt', { text: T.prop.cover }), K.h('dd', { text: p.cover ? T.prop.yes : T.prop.no })),
          p.flam ? K.h('div', { class: 'vw-chips' }, K.chip(T.prop.flam, { variant: 'lava', icon: 'fire' })) : null);
      }));
    }
    paint();
    return K.h('div', { class: 'vw-col' }, chips, grid);
  }

  /* ---------------------------------------------------------------- arenas */
  function arenasView() {
    const arenas = ctx.content.arenas || [];
    if (!arenas.length) return K.emptyState({ icon: 'map', title: T.tabs.arenas, text: T.arenasEmpty });
    return K.h('div', { class: 'vw-cx__agrid' }, ...arenas.map((a) => {
      const img = K.h('img', { class: 'vw-cx__athumb', alt: '', width: 192, height: 108, loading: 'lazy' });
      const fb = K.h('div', { class: 'vw-cx__athumb vw-hide' });
      setThumb(img, ctx, a.id, fb);
      return K.h('article', { class: 'vw-cx__arena vw-tablet', 'aria-label': a.name },
        K.h('div', { class: 'vw-cx__athumb-wrap' }, img, fb),
        K.h('div', { class: 'vw-cx__abody' }, K.h('h3', { class: 'vw-card__name', text: a.name }), K.h('p', { class: 'vw-small vw-dim', text: a.blurb }),
          K.h('div', { class: 'vw-chips' }, ...(a.tactics || []).map((t) => K.chip(t, { variant: 'sky' })), K.chip(T0.quick.recommended(a.recommendedBudget || 8000), { variant: 'gold', class: 'vw-chip--wrap' })),
          K.button(T.arena.fight, { icon: 'sword', size: 'sm', variant: 'primary', id: 'cx-fight-' + a.id, onClick: () => ctx.nav.goto('quick', { arena: a.id }) })));
    }));
  }

  showTab();
  K.enter(Array.from(frame.content.querySelectorAll('.vw-cx__top')), 'fade', 0);
  return { destroy() { cleanups.forEach((f) => f()); }, onBack() { if (K.hasModal()) return false; if (S.mobileDetail) { closeDetail(); return true; } ctx.nav.back(); return true; } };
}
