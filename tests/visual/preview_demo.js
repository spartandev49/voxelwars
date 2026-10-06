import { PreviewService } from '../../src/render/preview.js';
import { TempAnimator } from '../../src/render/tempanimator.js';
import { humFixture } from '../fixtures/hum_fixture.js';
import { generateArena } from '../../src/world/gen.js';
const ps = new PreviewService({ modelFor: () => ({ model: humFixture() }), animator: new TempAnimator(), defs: { x: { id: 'x', scale: 1 } }, palette: () => 'classic' });
document.body.style.cssText = 'margin:0;background:#1d2150;display:flex;gap:12px;padding:12px;flex-wrap:wrap;align-items:flex-start';
for (const [clip, team] of [['idle', 0], ['walk', 1], ['strike_slash_1', 0], ['death_back', 1]]) { const d = document.createElement('div'); document.body.appendChild(d); const t = ps.turntable(d, { unitId: 'x', size: 200, clip, team }); }
const imgs = document.createElement('div'); document.body.appendChild(imgs);
for (const r of ['marathon', 'nile', 'thermopylae', 'styx']) { const a = generateArena(r, 'small', 3); const url = ps.arenaThumb(a, r); const im = new Image(); im.src = url; im.style.cssText = 'display:block;border:3px solid #0b0d22;margin:4px'; im.title = Math.round(url.length) + ' chars'; imgs.appendChild(im); console.log(r, 'thumb chars', url.length); }
