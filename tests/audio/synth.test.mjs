// Synth fallbacks: every family has a deterministic, finite, non-silent, bounded recipe; loops are seamless; music beds are
// deterministic stereo loops with a seamless wrap and sane level.
import assert from 'node:assert/strict';
import { renderSynth, RECIPES, LOOP_FAMILIES, SYNTH_FAMILIES, renderMusic, renderMusicGen, MUSIC_MOODS, synthMusicSpecFor, THEME_TO_SYNTH_BATTLE, SYNTH_SR } from '../../src/audio/synth.js';
import { CUE_IDS, CUES } from '../../src/audio/cues.js';

const stats = (x) => { let pk = 0, ss = 0, nan = 0; for (const v of x) { if (!Number.isFinite(v)) nan++; pk = Math.max(pk, Math.abs(v)); ss += v * v; } return { pk, rms: Math.sqrt(ss / x.length), nan }; };
let totalMs = 0;
for (const id of CUE_IDS) {
  assert.ok(RECIPES[id], 'recipe ' + id);
  const vs = [];
  for (let v = 0; v < 3; v++) {
    const t = performance.now(); const x = renderSynth(id, v); totalMs += performance.now() - t;
    const s = stats(x); assert.equal(s.nan, 0, id + ' NaN'); assert.ok(s.pk > 0.5 && s.pk <= 0.91, `${id} peak ${s.pk}`); assert.ok(s.rms > 0.01, `${id} is not silent (rms ${s.rms})`);
    const dur = x.length / SYNTH_SR; assert.ok(dur >= 0.025 && dur <= 7, `${id} duration ${dur}`);
    if (!LOOP_FAMILIES.has(id)) assert.ok(Math.abs(x[x.length - 1]) < 0.05, id + ' ends without a click');
    vs.push(x);
  }
  // deterministic
  const again = renderSynth(id, 1); assert.deepEqual(Array.from(again.slice(0, 200)), Array.from(vs[1].slice(0, 200)), id + ' deterministic');
  // variants differ (so the shuffle bag has something to rotate)
  let diff = 0; const a = vs[0], b = vs[1]; for (let i = 0; i < Math.min(a.length, b.length, 4000); i++) if (Math.abs(a[i] - b[i]) > 1e-4) diff++; assert.ok(diff > 20, id + ' variants differ');
  // loops: the wrap point must be continuous (jump at the seam no bigger than the typical sample step)
  if (LOOP_FAMILIES.has(id)) {
    const x = vs[0]; const jump = Math.abs(x[0] - x[x.length - 1]); let typ = 0; for (let i = 1; i < 2000; i++) typ += Math.abs(x[i] - x[i - 1]); typ /= 1999;
    assert.ok(jump < Math.max(0.05, typ * 6), `${id} loop seam jump ${jump} vs typical step ${typ}`); assert.ok(CUES[id].loop || id === 'crowd_loop' || id === 'fire_loop', id + ' loop flag');
  }
}
console.log(`synth: ${CUE_IDS.length} families x 3 variants rendered in ${totalMs.toFixed(0)} ms`);
assert.equal(SYNTH_FAMILIES.length, CUE_IDS.length);
assert.equal(renderSynth('no_such_family'), null);

// ---- sanity of the sound design: spectra differ the way the names promise
const centroid = (x) => { // crude spectral centroid via zero-crossing rate proxy
  let z = 0; for (let i = 1; i < x.length; i++) if ((x[i - 1] < 0) !== (x[i] < 0)) z++; return z / x.length * SYNTH_SR / 2; };
assert.ok(centroid(renderSynth('hit_blunt', 0)) < centroid(renderSynth('hit_pierce', 0)), 'blunt thumps are darker than pierce');
assert.ok(centroid(renderSynth('boulder_impact', 0)) < centroid(renderSynth('arrow_hit_wood', 0)), 'boulders are darker than arrow knocks');
assert.ok(centroid(renderSynth('death_big', 0)) < centroid(renderSynth('death_scream', 0)), 'big deaths are lower than screams');
assert.ok(renderSynth('thunder_crack', 0).length > renderSynth('hit_blade', 0).length * 3, 'thunder rolls longer than a hit');
assert.ok(renderSynth('ui_click', 0).length / SYNTH_SR < 0.2, 'ui clicks are short');

// ---- synthesized music beds: every mood/theme combination
for (const mood of MUSIC_MOODS) {
  const r = renderMusic(mood, '', SYNTH_SR); assert.equal(r.L.length, r.R.length); assert.ok(r.dur > 12 && r.dur < 40, mood + ' length ' + r.dur);
  const sl = stats(r.L), sr = stats(r.R); assert.equal(sl.nan + sr.nan, 0); assert.ok(sl.pk <= 0.86 && sl.pk > 0.2, `${mood} peak ${sl.pk}`); assert.ok(sl.rms > 0.05 && sl.rms < 0.2, `${mood} rms ${sl.rms}`);
  assert.ok(Math.abs(r.L[0] - r.L[r.L.length - 1]) < 0.12 && Math.abs(r.R[0] - r.R[r.R.length - 1]) < 0.12, mood + ' wraps seamlessly');
  let dl = 0; for (let i = 0; i < 4000; i++) if (Math.abs(r.L[i] - r.R[i]) > 1e-3) dl++; assert.ok(dl > 100, mood + ' is stereo');
}
for (const [theme, mood] of Object.entries(THEME_TO_SYNTH_BATTLE)) assert.ok(MUSIC_MOODS.includes(mood), theme);
assert.notEqual(synthMusicSpecFor('battle', 'egypt'), synthMusicSpecFor('battle', 'barbarian')); assert.equal(synthMusicSpecFor('battle', 'unknown'), synthMusicSpecFor('battle', 'greek'));
const a = renderMusic('menu', '', SYNTH_SR), b = renderMusic('menu', '', SYNTH_SR); assert.deepEqual(Array.from(a.L.slice(1000, 1100)), Array.from(b.L.slice(1000, 1100)), 'music is deterministic');
let steps = 0; const g = renderMusicGen('menu', '', SYNTH_SR); for (;;) { const r = g.next(); if (r.done) break; steps++; } assert.equal(steps, 8, 'generator yields once per bar so loading can be sliced');
// the battle bed has drums: strong transients
const bt = renderMusic('battle', 'greek', SYNTH_SR); let peaks = 0; const win = 441; for (let i = 0; i + win < bt.L.length; i += win * 4) { let m = 0; for (let j = 0; j < win; j++) m = Math.max(m, Math.abs(bt.L[i + j])); if (m > 0.4) peaks++; } assert.ok(peaks > 10, 'battle bed has a drum pulse: ' + peaks);
console.log('synth.test OK');
