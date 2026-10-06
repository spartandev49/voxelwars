// The VOXELWARS wordmark as DOM: chunky gold letters, ink outline, stacked hard extrusion, a bobbing tilt and a sun-glint star.
// (The 3D voxel logo in the diorama is COORD's; this is the DOM brand mark used on splash/title/boot-adjacent screens and as the fallback.)
import { h } from '../kit.js';

export function logo(opts) {
  opts = opts || {};
  const el = h('h1', { class: ['vw-logo', opts.size && 'vw-logo--' + opts.size, opts.class], 'aria-label': 'VOXELWARS' },
    h('span', { class: 'vw-logo__word', 'aria-hidden': 'true', text: 'VOXEL' }),
    h('span', { class: 'vw-logo__word vw-logo__word--b', 'aria-hidden': 'true', text: 'WARS' }),
    h('span', { class: 'vw-logo__glint', 'aria-hidden': 'true' }));
  return el;
}
