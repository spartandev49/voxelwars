// G2 collector for Chromium (VF 3.6.2: "Node and Chromium"): the same g2_core code bundled by esbuild together with the generator of the tree `root`,
// executed in headless Chromium. Separate from g2_collect.mjs so that Node-only tests do not import playwright-core.
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTree, SOURCES } from './tree.mjs';
import { CHROMIUM, CHROMIUM_ARGS } from '../lib/paths.mjs';

const CORE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'g2_core.mjs');

/**
 * Run G2 inside headless Chromium against the tree `root`. Without `recorded` it collects from the tree's live lists (the recorder); with the recorded data
 * of a G2 record it replays exactly those inputs (the test).  -> { data, meta: { engineVersion, userAgent } }   (data = collect shape, or replay shape)
 */
export async function g2InChromium(root, recorded = null) {
  const T = await openTree(root, { regime: null });
  const j = (rel) => JSON.stringify(path.join(T.root, rel));
  const entry = `import { generateArena, RECIPES } from ${j(SOURCES.gen)};\nimport { ARENAS } from ${j(SOURCES.arenas)};\nimport { g2Collect, g2Replay } from ${JSON.stringify(CORE)};\n`
    + 'window.__g2 = (rec) => (rec ? g2Replay(generateArena, rec) : g2Collect(generateArena, RECIPES.slice(), ARENAS));\n';
  const r = await build({ stdin: { contents: entry, resolveDir: T.root, sourcefile: 'g2_entry.js', loader: 'js' }, bundle: true, format: 'iife', platform: 'browser', write: false, logLevel: 'silent' });
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: CHROMIUM_ARGS });
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html><body></body></html>');
    await page.addScriptTag({ content: r.outputFiles[0].text });
    const data = await page.evaluate((rec) => window.__g2(rec), recorded);
    const userAgent = await page.evaluate(() => navigator.userAgent);
    return { data, meta: { engineVersion: browser.version(), userAgent } };
  } finally { await browser.close(); }
}
