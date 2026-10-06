// mutators.js: small badges for the active rule mutators (HUD strip under the objective) + the shared badge builder other screens reuse.
// hud.mutators = ['big_heads', ...]; names/blurbs come from ctx.content.mutators[id] = {name, blurb, icon?}.
import { h, setHidden } from './_dom.js';
import { icon } from './_icons.js';

export const meta = { id: 'mutators', slot: 'top-center', order: 4 };

const FALLBACK = {
  big_heads: ['Big Heads', 'Heads are 1.6x. Helmets are a lifestyle.'], tiny_titans: ['Tiny Titans', 'Everyone is small. Egos are not.'],
  moon_gravity: ['Moon Gravity', 'Knockback x3. Mind the horizon.'], chicken_rain: ['Chicken Rain', 'It is raining chickens. Hallelujah.'],
  wine_rain_always: ['Wine Rain Always', 'Permanent wine rain. Damage x0.6.'], friendly_fire_fiesta: ['Friendly Fire Fiesta', 'Everything hurts everyone.'],
  speedy_soldiers: ['Speedy Soldiers', 'Everyone moves faster. Nobody is on time.'], ragdoll_frenzy: ['Ragdoll Frenzy', 'Knockback goes to eleven.'],
};
const ICONS = { big_heads: 'skull', tiny_titans: 'swarm', moon_gravity: 'star', chicken_rain: 'raise_chickens', wine_rain_always: 'wine_rain', friendly_fire_fiesta: 'sword', speedy_soldiers: 'haste', ragdoll_frenzy: 'earthquake' };

export function mutatorInfo(ctx, id) {
  const m = ctx && ctx.content && ctx.content.mutators && (ctx.content.mutators[id] || (Array.isArray(ctx.content.mutators) ? ctx.content.mutators.find((x) => x.id === id) : null));
  const f = FALLBACK[id];
  return { id, name: (m && m.name) || (f && f[0]) || String(id).replace(/_/g, ' '), blurb: (m && (m.blurb || m.desc)) || (f && f[1]) || '', icon: (m && m.icon) || ICONS[id] || 'dice' };
}

/** Badge element (also used by the rules tablet and the briefing). */
export function mutatorBadge(ctx, id, opts) {
  const i = mutatorInfo(ctx, id);
  const el = h('span', { class: 'hud-mut' + (opts && opts.large ? ' is-large' : ''), 'data-mutator': id, 'data-tip': i.blurb || i.name, title: i.blurb || i.name }, icon(i.icon), h('span', { class: 'hud-mut-name', text: i.name }));
  return el;
}

export function mount(parent, ctx) {
  const el = h('div', { class: 'hud-mutators', 'data-hud': 'mutators', 'aria-label': 'Active mutators', hidden: true });
  parent.appendChild(el);
  let key = '';
  return {
    el,
    update(hud) {
      const ids = hud.mutators || [];
      const k = ids.join(',');
      if (k === key) return;
      key = k;
      el.replaceChildren(...ids.map((id) => mutatorBadge(ctx, id)));
      setHidden(el, ids.length === 0);
    },
    destroy() { el.remove(); },
  };
}
