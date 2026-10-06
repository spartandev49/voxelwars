// scene.js: a 2D stand-in for the 3D battlefield behind the HUD in screenshots (bright sky, grass, two little armies, clouds) so contrast
// and coverage can be judged against realistic backgrounds. Test scaffolding only.
export function paintScene(cv, w, h, seed) {
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, h * 0.45); sky.addColorStop(0, '#5aa8f0'); sky.addColorStop(1, '#bfe3ff');
  g.fillStyle = sky; g.fillRect(0, 0, w, h * 0.45);
  g.fillStyle = '#ffffffcc';
  for (const [x, y, s] of [[0.15, 0.1, 1], [0.5, 0.06, 1.3], [0.82, 0.14, 0.9], [0.32, 0.2, 0.7]]) { g.fillRect(x * w, y * h, 120 * s, 22 * s); g.fillRect(x * w + 20 * s, y * h - 14 * s, 60 * s, 18 * s); }
  const gr = g.createLinearGradient(0, h * 0.4, 0, h); gr.addColorStop(0, '#8cc65a'); gr.addColorStop(1, '#5e9a3c');
  g.fillStyle = gr; g.fillRect(0, h * 0.4, w, h * 0.6);
  // distant hills
  g.fillStyle = '#7bb04c'; g.beginPath(); g.moveTo(0, h * 0.42); for (let x = 0; x <= w; x += 40) g.lineTo(x, h * 0.4 - Math.sin(x * 0.01 + seed) * 18 - 10); g.lineTo(w, h * 0.45); g.lineTo(0, h * 0.45); g.fill();
  // ground checker
  for (let y = h * 0.45; y < h; y += 28) for (let x = ((y / 28) % 2) * 28; x < w; x += 56) { g.fillStyle = 'rgba(40,90,30,.12)'; g.fillRect(x, y, 28, 28); }
  // armies: little voxel soldiers
  const rnd = (i) => { const s = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453; return s - Math.floor(s); };
  for (let i = 0; i < 160; i++) {
    const team = i < 80 ? 0 : 1, side = team ? 0.62 : 0.2;
    const x = (side + rnd(i) * 0.18) * w, y = (0.5 + rnd(i + 300) * 0.4) * h, s = 6 + (y / h) * 8;
    g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x - s * 0.6, y + s * 1.7, s * 1.4, s * 0.4);
    g.fillStyle = team ? '#e23b3b' : '#2f6bff'; g.fillRect(x - s * 0.5, y, s, s * 1.2);
    g.fillStyle = '#f0b48a'; g.fillRect(x - s * 0.4, y - s * 0.7, s * 0.8, s * 0.7);
    g.fillStyle = '#b8b8c0'; g.fillRect(x + s * 0.6, y - s * 0.4, s * 0.18, s * 1.8);
  }
  // a few trees and rocks
  for (let i = 0; i < 10; i++) { const x = rnd(i + 900) * w, y = (0.48 + rnd(i + 700) * 0.46) * h; g.fillStyle = '#6a4a2a'; g.fillRect(x, y, 8, 22); g.fillStyle = '#3f8a2e'; g.fillRect(x - 14, y - 22, 36, 26); g.fillStyle = '#4fa03a'; g.fillRect(x - 8, y - 32, 24, 12); }
}
