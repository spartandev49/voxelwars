// photo.js: photo mode as an overlay screen (ctx.nav.overlay('photo')). Switches the camera to 'photo', shows the photo toolbar (Snap, slow-mo,
// Freeze, Done) and closes itself when the camera leaves photo mode. The same toolbar is also part of the battle HUD (hud/photo.js) so the
// camera button and the P hotkey work without opening this screen.
import { disposer } from '../hud/_dom.js';
import { mount as mountPhotoBar } from '../hud/photo.js';

export const meta = { id: 'photo', layer: 'battle', music: 'none', canvas: 'scene' };

export function mount(root, ctx) {
  const d = disposer();
  root.classList.add('bs', 'bs-photo', 'vw-hud', 'is-photo');
  const bar = mountPhotoBar(root, ctx);
  const hud = () => { try { return ctx.game.hud() || {}; } catch (e) { return {}; } };
  try { ctx.game.camera.setMode('photo'); } catch (e) { /* camera not ready */ }
  bar.update({ cam: 'photo' });
  let seenPhoto = false;
  d.interval(() => {
    const h0 = hud(), m = typeof h0.cam === 'string' ? h0.cam : h0.cam && h0.cam.mode;
    if (m === 'photo') seenPhoto = true;
    bar.update(h0.cam === undefined ? { cam: 'photo' } : h0);
    if (seenPhoto && m && m !== 'photo') { if (ctx.nav.closeOverlay) ctx.nav.closeOverlay('photo'); }
  }, 100);
  return {
    bar,
    onBack() { try { ctx.game.camera.setMode('orbit'); } catch (e) { /* camera not ready */ } if (ctx.nav.closeOverlay) ctx.nav.closeOverlay('photo'); return true; },
    onKey(e) { if (e.code === 'KeyP') { this.onBack(); return true; } return false; },
    destroy() { d.run(); bar.destroy(); },
  };
}
