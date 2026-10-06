// Shared helpers for the audio tests.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';
import { AudioEngine } from '../../src/audio/engine.js';
import { makeEnv, makeFetch, MockContext, wavB64 } from './mockctx.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const tick = async (n = 3) => { for (let i = 0; i < n; i++) await sleep(0); };

/** the shipped asset ledger (assets/manifest.json) */
export function realManifest() {
  const p = path.join(root, 'assets/manifest.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}
/** a small hand-written manifest for fixture-based tests (every file exists as a generated WAV under tests/fixtures/audio) */
export function fixtureManifest() {
  return JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/audio/manifest.json'), 'utf8'));
}

/**
 * Engine on a mock context. opts: {manifest, core:{id:b64}, gated (autoplay policy), settings, getListener, fetchOpts, quality}
 * Returns {eng, env, ctx(): current MockContext, fetch}.
 */
export function makeEngine(opts = {}) {
  const env = makeEnv({ ungated: opts.gated === false });
  const fetch = makeFetch(Object.assign({ durOf: (u) => 0.4 }, opts.fetchOpts));
  const E = {
    window: env.win, document: env.doc, navigator: { userAgent: 'node', platform: 'x', maxTouchPoints: 0 }, AudioContext: opts.noAudio ? null : env.AudioContext,
    OfflineAudioContext: class extends MockContext { constructor(nc, n, sr) { super({ sampleRate: sr, startState: 'running' }); } },
    fetch: opts.noFetch ? null : fetch, manifest: opts.manifest === undefined ? fixtureManifest() : opts.manifest, coreAudio: opts.core || {},
    rng: opts.rng, yieldFn: () => Promise.resolve(), bridgeMs: opts.bridgeMs, retryMs: 2, setInterval: opts.setInterval || (() => 0), clearInterval: () => {},
  };
  const eng = new AudioEngine({ settings: opts.settings, getListener: opts.getListener, quality: opts.quality, env: E });
  return { eng, env, fetch, ctx: () => eng.ctx };
}
/** make an engine whose context is already running (skips the gesture) */
export async function runningEngine(opts = {}) {
  const t = makeEngine(Object.assign({ gated: false }, opts));
  await t.eng.unlock();
  return t;
}

/** bundle src/audio/engine.js with esbuild (optionally swapping modules) and import it: used for negative controls */
export async function bundleEngine(tag, swaps = {}) {
  const outDir = path.join(root, '.cache/audio_test'); fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `engine_${tag}.mjs`);
  await build({
    entryPoints: [path.join(root, 'src/audio/engine.js')], bundle: true, write: true, outfile: out, format: 'esm', platform: 'node', logLevel: 'error',
    plugins: [{ name: 'swap', setup(b) { b.onResolve({ filter: /.*/ }, (a) => { for (const k of Object.keys(swaps)) if (a.path.endsWith(k)) return { path: swaps[k] }; return null; }); } }],
  });
  return import(out + '?t=' + Date.now());
}
export { makeEnv, makeFetch, MockContext, wavB64 };
