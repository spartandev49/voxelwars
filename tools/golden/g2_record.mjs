// Records G2, the arena generator golden (docs/eras/spec/VF.md 3.6.2; the net for the gencore split, WC01): 112 cases of
// generateArena(recipe, size, seed): 16 recipes x {small, medium, large} x seeds {1, 7} = 96, plus the 16 shipped preset defaults (ARENAS: recipe, size, seed).
// Each case is five FNV-1a-32 hashes (full arena JSON, terrain, materials, props, meta), so a red case names the part that moved.
//
// usage: node tools/golden/g2_record.mjs [--engine=node|chromium] [--worktree=<dir>] [--out=<file>] [--check] [--regime=baked] [--help]
//   --engine=node      (default) record tests/world/gen_golden.json from the baseline worktree (Node)
//   --engine=chromium  record tests/world/gen_golden_chromium.json: the same cases generated inside headless Chromium (SwiftShader flags of tools/smoke.mjs)
//   --check            collect again and compare with the committed file (exit 1 on any difference); without it the record is written only after TWO identical runs
//   --regime           accepted for the common CLI of VF 3.3; only 'baked' exists here (G1 alone has default_meta records), anything else exits 2
//   --worktree         default .cache/baseline/ancient-v8; refused unless its HEAD is the baseline commit 4aafd2e3...
// exit: 0 ok, 1 refused / mismatch / failure, 2 usage
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordCli, isMain } from './common.mjs';
import { collectG2 } from './g2_collect.mjs';
import { ROOT } from '../lib/paths.mjs';

const SELF = fileURLToPath(import.meta.url);
export const G2_OUT = { node: path.join(ROOT, 'tests', 'world', 'gen_golden.json'), chromium: path.join(ROOT, 'tests', 'world', 'gen_golden_chromium.json') };

export const SPEC = {
  script: SELF, id: 'g2', kind: 'g2_arena_hashes', engines: ['node', 'chromium'],
  outFor: (o) => G2_OUT[o.engine],
  async collect(o) {
    if (o.engine === 'chromium') { const { g2InChromium } = await import('./g2_chromium.mjs'); return g2InChromium(o.worktree); }
    return { data: await collectG2(o.worktree) };
  },
  summary: (d) => `${Object.keys(d.cases).length} cases + ${d.presets.length} presets`,
};
if (isMain(import.meta.url)) process.exit(await recordCli(SPEC, process.argv.slice(2)));
