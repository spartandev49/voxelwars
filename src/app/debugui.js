// Minimal fallback screens (splash, title, quick, placement, battle, results). Used ONLY when the real UI modules (src/ui/screens/*)
// are missing, and as the dev harness for COORD's integration tests. Same module contract as the real screens.
const css = (el, s) => { el.style.cssText += ';' + s; return el; };
const mk = (tag, text, style, parent) => { const e = document.createElement(tag); if (text) e.textContent = text; if (style) e.style.cssText = style; if (parent) parent.appendChild(e); return e; };
const BTN = 'min-height:44px;padding:0 16px;border:3px solid #0b0d22;border-radius:10px;font:400 14px Bungee,Impact,sans-serif;cursor:pointer;box-shadow:0 4px 0 #0b0d22;background:#ffc93c;color:#14163a;margin:4px;pointer-events:auto';
const PANEL = 'background:#1d2150;color:#f3f6fb;border:3px solid #0b0d22;border-radius:12px;box-shadow:0 5px 0 #0b0d22;padding:12px;font:14px Rubik,system-ui,sans-serif;pointer-events:auto';
function button(label, fn, parent, extra) { const b = mk('button', label, BTN + (extra || ''), parent); b.addEventListener('click', fn); return b; }

export const splash = {
  meta: { id: 'splash', layer: 'menu' },
  mount(root, ctx) {
    const d = mk('div', '', 'position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;padding-bottom:12vh;background:linear-gradient(transparent,rgba(10,12,34,.7))', root);
    const t = mk('div', 'PRESS ANY KEY TO ENTER THE ARENA', 'font:400 clamp(18px,3vw,32px) Bungee,Impact,sans-serif;color:#ffc93c;text-shadow:0 3px 0 #0b0d22;letter-spacing:.05em;animation:vwblink 1.4s infinite', d);
    const st = mk('style', '@keyframes vwblink{50%{opacity:.35}}', '', d);
    let done = false;
    const go = () => { if (done) return; done = true; ctx.audio.unlock(); ctx.nav.goto('title'); };
    const k = (e) => { if (e.key === 'Tab') return; go(); }; window.addEventListener('keydown', k); d.addEventListener('pointerdown', go);
    return { destroy() { window.removeEventListener('keydown', k); } };
  },
};

export const title = {
  meta: { id: 'title', layer: 'menu' },
  mount(root, ctx) {
    const d = mk('div', '', 'position:absolute;left:5vw;top:10vh;display:flex;flex-direction:column;align-items:flex-start', root);
    mk('div', 'VOXELWARS', 'font:400 clamp(40px,8vw,96px) Bungee,Impact,sans-serif;color:#ffc93c;text-shadow:0 6px 0 #0b0d22;margin-bottom:12px', d);
    button('Quick Fight', async () => { const s = ctx.game.newSetup('quick'); await ctx.game.begin(s); ctx.game.autoFill(0, {}); ctx.game.autoFill(1, {}); ctx.nav.goto('placement'); }, d);
    button('Place Armies', async () => { const s = ctx.game.newSetup('quick'); await ctx.game.begin(s); ctx.nav.goto('placement'); }, d);
    button('Diagnostics', () => { const p = mk('pre', JSON.stringify(ctx.diag.snapshot(), null, 1), PANEL + ';position:absolute;left:5vw;top:60vh;max-height:35vh;overflow:auto;font-size:11px', root); setTimeout(() => p.remove(), 8000); }, d, ';background:#2a2f6b;color:#f3f6fb');
    return { destroy() {} };
  },
};

export const placement = {
  meta: { id: 'placement', layer: 'battle' },
  mount(root, ctx) {
    const g = ctx.game;
    const p = mk('div', '', PANEL + ';position:absolute;left:12px;top:12px;bottom:12px;width:min(300px,44vw);overflow:auto', root);
    const info = mk('div', '', 'margin-bottom:8px;font-size:12px', p);
    const sec = (t) => mk('div', t, 'font:400 12px Bungee,Impact,sans-serif;color:#ffc93c;margin:8px 0 4px', p);
    sec('Team'); for (const [lab, team] of [['Blue', 0], ['Red', 1]]) button(lab, () => g.tools.setBrush({ team }), p, ';min-height:36px');
    sec('Brush'); for (const m of ['single', 'block', 'line', 'scatter', 'erase']) button(m, () => g.tools.setBrush({ mode: m }), p, ';min-height:32px;font-size:11px');
    sec('Units');
    const list = ctx.content.unitList().filter((d) => !['hero'].includes(d.role)).slice(0, 60);
    for (const d of list) button(`${d.name} ${d.cost}`, () => g.tools.setBrush({ defId: d.id, custom: null }), p, ';min-height:30px;font-size:10px;background:#2a2f6b;color:#f3f6fb');
    const bar = mk('div', '', PANEL + ';position:absolute;right:12px;bottom:12px;display:flex;gap:6px;flex-wrap:wrap;align-items:center', root);
    button('Auto-fill', () => { g.autoFill(0, {}); g.autoFill(1, {}); }, bar); button('Undo', () => g.tools.undo(), bar, ';background:#2a2f6b;color:#f3f6fb'); button('Redo', () => g.tools.redo(), bar, ';background:#2a2f6b;color:#f3f6fb');
    button('FIGHT!', () => g.fight(), bar, ';background:#8bc34a');
    button('Menu', () => { g.exitToMenu(); ctx.nav.goto('title'); }, bar, ';background:#2a2f6b;color:#f3f6fb');
    const upd = () => { const a = g.info.budget(0), b = g.info.budget(1); info.textContent = `Blue ${a.spent}/${a.cap}  Red ${b.spent}/${b.cap}  units ${g.info.counts(0).total}/${g.info.counts(1).total}  brush ${g.brushState.mode} ${g.brushState.defId} team ${g.brushState.team}`; };
    const off = g.on('placement', upd); const off2 = g.on('brush', upd); const off3 = g.on('toast', (t) => ctx.nav.toast(t.text, t)); upd();
    return { destroy() { off(); off2(); off3(); } };
  },
};

export const battle = {
  meta: { id: 'battle', layer: 'battle' },
  mount(root, ctx) {
    const g = ctx.game;
    const top = mk('div', '', PANEL + ';position:absolute;left:50%;top:10px;transform:translateX(-50%);display:flex;gap:16px;font-size:16px', root);
    const a = mk('span', '', 'color:#6ea0ff;font-weight:700', top), tm = mk('span', '', '', top), b = mk('span', '', 'color:#ff7a7a;font-weight:700', top);
    const bar = mk('div', '', PANEL + ';position:absolute;right:12px;top:10px;display:flex;gap:4px;flex-wrap:wrap', root);
    for (const s of [0.25, 0.5, 1, 2, 4]) button(s + 'x', () => g.setSpeed(s), bar, ';min-height:32px;padding:0 10px;font-size:12px');
    button('Pause', () => g.pause(!g.isPaused()), bar, ';min-height:32px;font-size:12px;background:#2a2f6b;color:#f3f6fb');
    for (const m of ['orbit', 'follow', 'topdown', 'cinematic']) button(m, () => g.camera.setMode(m), bar, ';min-height:32px;font-size:11px;background:#2a2f6b;color:#f3f6fb');
    const cd = mk('div', '', 'position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);font:400 clamp(60px,14vw,160px) Bungee,Impact,sans-serif;color:#ffc93c;text-shadow:0 8px 0 #0b0d22;pointer-events:none', root);
    const feed = mk('div', '', PANEL + ';position:absolute;left:12px;bottom:12px;max-width:40vw;font-size:12px', root);
    let acc = 0; const t = setInterval(() => { const h = g.hud(); if (!h.teams) return; a.textContent = `Blue ${h.teams[0].alive}`; b.textContent = `Red ${h.teams[1].alive}`; tm.textContent = `${Math.floor(h.time)}s`; cd.textContent = h.countdown ? String(h.countdown) : ''; feed.textContent = h.killfeed.map((k) => k.text).join('\n'); feed.style.whiteSpace = 'pre-line'; }, 100);
    return { destroy() { clearInterval(t); } };
  },
};

export const results = {
  meta: { id: 'results', layer: 'overlay' },
  mount(root, ctx) {
    const g = ctx.game, r = g.results();
    const d = mk('div', '', PANEL + ';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;min-width:min(420px,90vw)', root);
    mk('div', r.winner === 0 ? 'BLUE WINS' : r.winner === 1 ? 'RED WINS' : 'DRAW', 'font:400 clamp(28px,6vw,56px) Bungee,Impact,sans-serif;color:#ffc93c;text-shadow:0 4px 0 #0b0d22', d);
    mk('div', `Blue alive ${r.teams[0].alive}, Red alive ${r.teams[1].alive}. ${Math.round(r.time)} s. MVP ${r.mvp ? r.mvp.name + ' (' + r.mvp.kills + ' kills)' : '-'}`, 'margin:8px 0', d);
    button('Rematch', () => { ctx.nav.closeOverlay('results'); g.rematch(); }, d); button('Tweak army', () => { ctx.nav.closeOverlay('results'); g.tweak(); }, d, ';background:#2a2f6b;color:#f3f6fb');
    button('Menu', () => { g.exitToMenu(); ctx.nav.goto('title'); }, d, ';background:#2a2f6b;color:#f3f6fb');
    return { destroy() {} };
  },
};

export const FALLBACK_SCREENS = { splash, title, placement, battle, results };
