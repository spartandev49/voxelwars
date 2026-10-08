// Byte-report families (AR 3.11.2; owner TOOLS-GATE): maps a bundled input path to the family a growth in bytes is attributed to.
import path from 'path';

const UI = new Set(['screens', 'hud']);
const EDITORS = new Set(['arena', 'soldier', 'painter']);
const ERA_PARTS = new Set(['humor', 'parts', 'beasts', 'props', 'units']);
const CONTENT_SHARED = 'content';

/** @param {string} p repo-relative POSIX path (or a path ending in _generated/...) */
export function familyOf(p) {
  p = p.split(path.sep).join('/');
  if (/(^|\/)_generated\//.test(p)) return '_generated';
  const m = p.match(/^src\/(.*)$/);
  if (!m) return p.startsWith('node_modules/') ? 'node_modules' : 'other';
  const parts = m[1].split('/');
  const top = parts[0];
  if (top === 'ui') return UI.has(parts[1]) && parts.length > 2 ? `ui/${parts[1]}` : 'ui/root';
  if (top === 'editors') return EDITORS.has(parts[1]) && parts.length > 2 ? `editors/${parts[1]}` : 'editors/root';
  if (top === 'content') {
    const era = parts[1] && /^era_[a-z0-9]+$/.test(parts[1]) ? parts[1] : null;
    if (!era) return CONTENT_SHARED;
    return ERA_PARTS.has(parts[2]) && parts.length > 3 ? `${era}/${parts[2]}` : `${era}/top`;
  }
  if (top === 'sim') return parts[1] === 'abilities' ? 'sim/abilities' : 'sim/root';
  if (top === 'anim') return parts[1] === 'clips' ? 'anim/clips' : 'anim/root';
  return top;   // render audio app save world core voxel (and anything new, named by its directory)
}
