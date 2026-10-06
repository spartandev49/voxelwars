// announcer.js: bottom-left announcer panel. Three voxel portraits (Brutus / Plato / Cassandra), name plate, typewriter subtitle with blips,
// chain exchanges (2-3 beats, 1.1 s apart), a small queue, subtitle toggle (settings.subtitles, default ON).
// Lines arrive from hud.announcer = {who,text,t,chain?:[{who,text}]} and/or ctx.game.on('announce', line). Deduped by key.
// The typewriter writes 4 characters every 100 ms (10 Hz, within the HUD text-write budget); blips use the cue 'ui_tick'.
import { h, setText, setCls, sfx, disposer, anim } from './_dom.js';
import { icon } from './_icons.js';
import { avatar, announcerInfo } from './_portraits.js';

export const meta = { id: 'announcer', slot: 'bottom-left', order: 1 };
const STEP = 105, CHARS = 4, BEAT_CHAIN = 1100, BEAT = 400, QUEUE_MAX = 3;
const WHO = ['brutus', 'plato', 'cassandra'];
const IDLE_LINE = { brutus: 'Brutus is warming up his voice. It is already too loud.', plato: 'Plato wonders what a battle is. Later.', cassandra: 'Cassandra has seen how this ends.' };

export function mount(parent, ctx) {
  const d = disposer();
  const faces = {};
  const face = h('div', { class: 'hud-ann-face' });
  for (const w of WHO) { faces[w] = h('div', { class: 'hud-ann-who', 'data-who': w, hidden: w !== 'brutus' }, avatar(w)); face.appendChild(faces[w]); }
  face.appendChild(h('i', { class: 'hud-ann-led', 'aria-hidden': 'true' }));
  const nameEl = h('span', { class: 'hud-ann-name' });
  const roleEl = h('span', { class: 'hud-ann-role' });
  const cc = h('button', { class: 'hud-btn hud-ann-cc', type: 'button', id: 'hud-subtitles', 'aria-label': 'Subtitles', 'aria-pressed': 'true', 'data-tip': 'Subtitles on/off', 'data-tip-pos': 'above' }, icon('cc'));
  const shown = h('span', { class: 'shown' });
  const ghost = h('span', { class: 'ghost' });
  const off = h('span', { class: 'hud-ann-off', hidden: true });
  const text = h('p', { class: 'hud-ann-text', 'aria-hidden': 'true' }, shown, ghost, off);
  const sr = h('span', { class: 'vw-sr', 'aria-live': 'polite' });
  const el = h('div', { class: 'hud-ann hud-panel is-quiet', 'data-hud': 'announcer', 'data-who': 'brutus', role: 'region', 'aria-label': 'Announcers' }, face,
    h('div', { class: 'hud-ann-body' }, h('div', { class: 'hud-ann-head' }, nameEl, roleEl, cc), text), sr);
  parent.appendChild(el);

  let queue = [], cur = null, phase = 'idle', pos = 0, wait = 0, quiet = 0, who = 'brutus', step = 0;
  const keys = [];
  let subs = true;
  const readSubs = () => { try { const v = ctx.settings.get('subtitles'); return v === undefined || v === null ? true : !!v; } catch (e) { return true; } };

  function paintWho(w) {
    if (w !== who || !nameEl._tx) {
      for (const k of WHO) faces[k].hidden = k !== w;
      const info = announcerInfo(w);
      setText(nameEl, info.name); setText(roleEl, info.role);
      el.dataset.who = w;
      el.style.setProperty('--ann-color', info.color);
      if (w !== who) anim(ctx, faces[w], [{ transform: 'translateY(6px) scale(.9)', opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.34,1.56,.64,1)' }, [{ opacity: 0 }, { opacity: 1 }]);
      who = w;
    }
  }
  function paintSubs() {
    subs = readSubs();
    cc.setAttribute('aria-pressed', String(subs));
    setCls(el, 'no-subs', !subs);
    off.hidden = subs;
    if (!subs) { setText(off, 'Subtitles off. ' + announcerInfo(who).name.split(' ')[0] + ' is still talking.'); setText(shown, ''); setText(ghost, ''); }
    else if (cur) { setText(shown, cur.text.slice(0, pos)); setText(ghost, cur.text.slice(pos)); }
    else { setText(shown, IDLE_LINE[who] || ''); setText(ghost, ''); }
  }

  function key(l) { return (l.id != null ? l.id : l.t != null ? l.t : '') + '|' + l.who + '|' + l.text; }
  function enqueue(line, chained) {
    if (!line || !line.text) return;
    const w = WHO.includes(line.who) ? line.who : 'brutus';
    const k = key({ id: line.id, t: line.t, who: w, text: line.text });
    if (!chained) { if (keys.includes(k)) return; keys.push(k); if (keys.length > 14) keys.shift(); }
    queue.push({ who: w, text: String(line.text), chain: !!chained });
    if (!chained && Array.isArray(line.chain)) for (const c of line.chain) enqueue(c, true);
    while (queue.length > QUEUE_MAX + 2) queue.shift();
  }
  function begin() {
    cur = queue.shift();
    paintWho(cur.who);
    pos = 0; phase = 'typing'; quiet = 0; step = 0; acc = STEP;
    setCls(el, 'is-quiet', false); setCls(el, 'is-talking', true);
    if (subs) { setText(shown, ''); setText(ghost, cur.text); }
  }
  function finish() {
    pos = cur.text.length; phase = 'hold';
    if (subs) { setText(shown, cur.text); setText(ghost, ''); }
    setCls(el, 'is-talking', false);
    setText(sr, announcerInfo(cur.who).name + ': ' + cur.text);
    wait = queue.length ? 1300 : Math.max(2400, cur.text.length * 60);
  }
  // real-time loop: the typewriter writes at most once every STEP ms (10 Hz budget, whatever the timer jitter does); hold / beat timers use elapsed time
  let lastT = performance.now(), acc = 0;
  function tick() {
    const now = performance.now(), dt = Math.min(500, now - lastT); lastT = now;
    if (phase === 'typing') {
      acc += dt;
      if (acc < STEP) return;
      acc = 0;
      pos = Math.min(cur.text.length, pos + CHARS); step++;
      if (subs) { setText(shown, cur.text.slice(0, pos)); setText(ghost, cur.text.slice(pos)); }
      if (step % 2 === 1) sfx(ctx, 'ui_tick', { vol: 0.22, pitch: announcerInfo(cur.who).pitch * (0.94 + Math.random() * 0.12) });
      if (pos >= cur.text.length) finish();
    } else if (phase === 'hold') {
      wait -= dt;
      if (wait <= 0) { if (queue.length) { phase = 'beat'; wait = queue[0].chain ? BEAT_CHAIN : BEAT; } else { phase = 'idle'; quiet = 0; } }
    } else if (phase === 'beat') {
      wait -= dt; if (wait <= 0) begin();
    } else {
      if (queue.length) begin();
      else { const q0 = quiet; quiet += dt; if (q0 < 14000 && quiet >= 14000) setCls(el, 'is-quiet', true); }
    }
  }
  d.interval(tick, 40);

  cc.addEventListener('click', () => { try { ctx.settings.set('subtitles', !readSubs()); } catch (e) { /* settings optional */ } paintSubs(); sfx(ctx, 'ui_toggle', { vol: 0.5 }); });
  // click the text to skip: finish typing, or move on early
  text.addEventListener('click', () => { if (phase === 'typing') finish(); else if (phase === 'hold') wait = 0; });
  d.add(ctx.settings && ctx.settings.on ? ctx.settings.on(() => { if (readSubs() !== subs) paintSubs(); }) : null);
  d.add(ctx.game && ctx.game.on ? ctx.game.on('announce', (l) => enqueue(l)) : null);
  paintWho('brutus'); paintSubs();

  return {
    el,
    say: (line) => enqueue(line),
    update(hud) {
      const a = hud && hud.announcer;
      if (a) enqueue(a);
    },
    isTyping: () => phase === 'typing',
    destroy() { d.run(); el.remove(); },
  };
}
