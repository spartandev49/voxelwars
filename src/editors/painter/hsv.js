// A small HSV colour picker: a saturation/value square, a hue strip, keyboard support (arrow keys) and a callback. DOM + 2D canvas only.
import * as K from '../../ui/kit.js';
import { hsvToRgb, rgbToHsv, toHex } from './palette.js';

const h = K.h;
export function hsvPicker({ value = 0xc8453c, onChange, id = 'pt-hsv' } = {}) {
  let hsv = rgbToHsv(value);
  const sv = h('canvas', { class: 'pt-sv', width: 180, height: 120, id: id + '-sv', tabindex: '0', role: 'slider', 'aria-label': 'Saturation and brightness', 'aria-valuetext': '' });
  const hue = h('canvas', { class: 'pt-hue', width: 180, height: 18, id: id + '-hue', tabindex: '0', role: 'slider', 'aria-label': 'Hue', 'aria-valuemin': '0', 'aria-valuemax': '360' });
  const g = sv.getContext('2d'), gh = hue.getContext('2d');
  function paint() {
    const base = hsvToRgb(hsv.h, 1, 1);
    g.fillStyle = toHex(base); g.fillRect(0, 0, 180, 120);
    let gr = g.createLinearGradient(0, 0, 180, 0); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 180, 120);
    gr = g.createLinearGradient(0, 0, 0, 120); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 180, 120);
    const x = hsv.s * 180, y = (1 - hsv.v) * 120; g.lineWidth = 2; g.strokeStyle = '#fff'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.stroke(); g.strokeStyle = '#14163a'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 7.5, 0, Math.PI * 2); g.stroke();
    const hg = gh.createLinearGradient(0, 0, 180, 0); for (let i = 0; i <= 6; i++) hg.addColorStop(i / 6, toHex(hsvToRgb(i * 60, 1, 1))); gh.fillStyle = hg; gh.fillRect(0, 0, 180, 18);
    const hx = (hsv.h / 360) * 180; gh.strokeStyle = '#fff'; gh.lineWidth = 3; gh.strokeRect(hx - 3, 1, 6, 16); gh.strokeStyle = '#14163a'; gh.lineWidth = 1; gh.strokeRect(hx - 4.5, 0, 9, 18);
    sv.setAttribute('aria-valuetext', `saturation ${Math.round(hsv.s * 100)} percent, brightness ${Math.round(hsv.v * 100)} percent`); hue.setAttribute('aria-valuenow', String(Math.round(hsv.h)));
  }
  const emit = () => { paint(); if (onChange) onChange(hsvToRgb(hsv.h, hsv.s, hsv.v)); };
  const drag = (el, fn) => {
    const at = (e) => { const r = el.getBoundingClientRect(); fn(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))); };
    el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); at(e); el.dataset.drag = '1'; });
    el.addEventListener('pointermove', (e) => { if (el.dataset.drag) at(e); });
    const end = () => { delete el.dataset.drag; }; el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.style.touchAction = 'none';
  };
  drag(sv, (x, y) => { hsv.s = x; hsv.v = 1 - y; emit(); });
  drag(hue, (x) => { hsv.h = x * 360; emit(); });
  sv.addEventListener('keydown', (e) => { const d = e.shiftKey ? 0.1 : 0.02; let used = true; if (e.key === 'ArrowLeft') hsv.s = Math.max(0, hsv.s - d); else if (e.key === 'ArrowRight') hsv.s = Math.min(1, hsv.s + d); else if (e.key === 'ArrowUp') hsv.v = Math.min(1, hsv.v + d); else if (e.key === 'ArrowDown') hsv.v = Math.max(0, hsv.v - d); else used = false; if (used) { e.preventDefault(); e.stopPropagation(); emit(); } });
  hue.addEventListener('keydown', (e) => { const d = e.shiftKey ? 20 : 4; let used = true; if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') hsv.h = (hsv.h - d + 360) % 360; else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') hsv.h = (hsv.h + d) % 360; else used = false; if (used) { e.preventDefault(); e.stopPropagation(); emit(); } });
  paint();
  const el = h('div', { class: 'pt-hsv' }, sv, hue);
  /** set from outside (swatch click, eyedropper, hex field) without firing onChange */
  el.set = (rgb) => { const n = rgbToHsv(rgb); if (n.s > 0.001 && n.v > 0.001) hsv = n; else hsv = { h: hsv.h, s: n.s, v: n.v }; paint(); };
  return el;
}
