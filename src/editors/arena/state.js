// Arena Builder UI state (pure): the tool options the panels edit and the controller reads. One object per open builder.
import { MAT } from '../../world/arena.js';
import { BRUSH } from './consts.js';

export function defaultState() {
  return {
    tool: 'raise',
    brush: { radius: BRUSH.radiusDefault, strength: 0.4, shape: 'circle', falloff: 'smooth' },
    strengths: { raise: 0.4, smooth: 0.6, flatten: 0.8, paint: 1, noise: 0.5 },
    material: MAT.grass, flattenTarget: null, noise: { scale: 12, seed: 7 }, ramp: { width: 4, a: null },
    stamp: { kind: 'hill', radius: 8, strength: 0.5, rot: 0 },
    props: { cat: 'all', q: '', type: 'tree_oak', scale: 1, rot: 0, variant: -1, density: 4, snap: false, randRot: false, mode: 'place', selected: null },
    hazard: { kind: 'quicksand', r: 4, mode: 'place', selected: null },
    marker: { type: 'hill', r: 6, mode: 'place', selected: null },
    zoneKey: 'A', gen: { recipe: 'marathon', seed: 11, parts: 'both' },
    panelTab: 'tool', touchCamera: false, touchLower: false, overlays: true, top: false,
  };
}
