// Boot helpers: capability checks, the fatal-error panel (self-contained: works even if the UI bundle fails), safe mode.
export function checkCapabilities() {
  const out = { ok: true, problems: [], info: {} };
  try {
    if (!window.THREE) { out.ok = false; out.problems.push('three.js failed to load from every CDN (cdnjs, jsDelivr, unpkg). Check your connection or content blocker.'); }
    const c = document.createElement('canvas'); const gl = c.getContext('webgl2', { antialias: false });
    if (!gl) { out.ok = false; out.problems.push('WebGL2 is not available. VOXELWARS needs a browser with WebGL2 (Chrome, Edge, Firefox or Safari 15+) and hardware acceleration enabled.'); }
    else {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      out.info.renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      out.info.vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
      out.info.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE); out.info.floatRT = !!gl.getExtension('EXT_color_buffer_float');
      if (out.info.maxTex < 2048) { out.ok = false; out.problems.push('Your GPU reports a tiny maximum texture size (' + out.info.maxTex + ').'); }
    }
  } catch (e) { out.ok = false; out.problems.push('Capability check failed: ' + (e && e.message)); }
  out.info.ua = navigator.userAgent; out.info.dpr = window.devicePixelRatio; out.info.screen = screen.width + 'x' + screen.height;
  return out;
}
export function safeMode() { try { return localStorage.getItem('vw.safe') === '1'; } catch (e) { return false; } }
export function setSafeMode(on) { try { if (on) localStorage.setItem('vw.safe', '1'); else localStorage.removeItem('vw.safe'); } catch (e) { /* ignore */ } }

/** Full-screen fatal panel with a copyable diagnostic report and a Safe mode retry. Never throws. */
export function showFatal(cause, details) {
  try {
    const root = document.getElementById('vw-root') || document.body;
    const boot = document.getElementById('vw-boot'); if (boot) boot.remove();
    const old = document.getElementById('vw-fatal'); if (old) old.remove();
    const d = document.createElement('div'); d.id = 'vw-fatal'; d.setAttribute('role', 'alertdialog'); d.setAttribute('aria-label', 'VOXELWARS could not start');
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:#14163a;color:#f3f6fb;font:16px/1.5 Rubik,system-ui,sans-serif';
    const card = document.createElement('div'); card.style.cssText = 'max-width:640px;width:100%;background:#1d2150;border:3px solid #0b0d22;border-radius:14px;box-shadow:0 6px 0 #0b0d22;padding:24px';
    const h = document.createElement('h1'); h.textContent = 'The legion tripped over a cable'; h.style.cssText = 'margin:0 0 8px;font:400 26px Bungee,Impact,sans-serif;color:#ffc93c';
    const p = document.createElement('p'); p.textContent = String(cause); p.style.margin = '0 0 12px';
    const pre = document.createElement('textarea'); pre.readOnly = true; pre.value = report(details); pre.style.cssText = 'width:100%;height:150px;background:#0b0d22;color:#b9c2e0;border:2px solid #383e86;border-radius:8px;padding:8px;font:12px/1.4 ui-monospace,monospace;box-sizing:border-box';
    const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-top:14px';
    const mk = (label, fn, primary) => { const b = document.createElement('button'); b.textContent = label; b.style.cssText = 'min-height:44px;padding:0 18px;border:3px solid #0b0d22;border-radius:10px;font:400 15px Bungee,Impact,sans-serif;cursor:pointer;box-shadow:0 4px 0 #0b0d22;background:' + (primary ? '#ffc93c;color:#14163a' : '#2a2f6b;color:#f3f6fb'); b.addEventListener('click', fn); return b; };
    row.appendChild(mk('Copy diagnostics', () => { pre.select(); try { navigator.clipboard.writeText(pre.value).catch(() => document.execCommand && document.execCommand('copy')); } catch (e) { try { document.execCommand('copy'); } catch (e2) { /* selected text is enough */ } } }, true));
    row.appendChild(mk('Safe mode (low graphics)', () => { setSafeMode(true); location.reload(); }));
    row.appendChild(mk('Reload', () => location.reload()));
    card.append(h, p, pre, row); d.appendChild(card); root.appendChild(d);
  } catch (e) { document.body.textContent = 'VOXELWARS failed to start: ' + cause; }
}
function report(details) {
  const lines = ['VOXELWARS diagnostic report', 'build: ' + (typeof __VW_VERSION__ !== 'undefined' ? __VW_VERSION__ : 'dev') + ' ' + (typeof __VW_BUILD__ !== 'undefined' ? __VW_BUILD__ : ''), 'time: ' + new Date().toISOString()];
  try { for (const k of Object.keys(details || {})) lines.push(k + ': ' + (typeof details[k] === 'object' ? JSON.stringify(details[k]) : details[k])); } catch (e) { /* ignore */ }
  lines.push('ua: ' + navigator.userAgent);
  return lines.join('\n');
}
