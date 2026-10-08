// @gate-noscan  (plumbing only: its path literals are not test inputs; see tools/lib/gate_cache.mjs)
// Central paths and constants for tools and tests (AR 3.11.4; owner TOOLS-GATE).
// ROOT is resolved from this file, so a tool run inside a gate snapshot (.cache/snap/<treeHash>) sees the snapshot, never the shared tree.
// MAIN_ROOT is the shared working tree (exported by the gate as VW_MAIN_ROOT) and holds the persistent caches (.cache/gate, .cache/cdn, .cache/baseline).
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const MAIN_ROOT = process.env.VW_MAIN_ROOT ? path.resolve(process.env.VW_MAIN_ROOT) : ROOT;
export const GATE_DIR = process.env.VW_GATE_DIR ? path.resolve(process.env.VW_GATE_DIR) : path.join(MAIN_ROOT, '.cache/gate');
export const SNAP_DIR = path.join(MAIN_ROOT, '.cache/snap');
export const CHROMIUM = process.env.VW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const CHROMIUM_ARGS = ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'];
/** The 6 bad-syntax fixtures of the syntax negative control (VF 3.8.4). */
export const SYNTAX_BAD_DIR = path.join(ROOT, 'tests/fixtures/syntax_bad');

/** Repo-relative POSIX path of an absolute path under ROOT. */
export const rel = (p, base = ROOT) => path.relative(base, p).split(path.sep).join('/');
export const exists = (p, base = ROOT) => fs.existsSync(path.isAbsolute(p) ? p : path.join(base, p));
/** Era ids present on disk (src/content/era_<id>), sorted; the registry is the authority once it exists (AR 3.1) and this only mirrors the directory list. */
export function eraDirs(base = ROOT) {
  const d = path.join(base, 'src/content');
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory() && /^era_[a-z0-9]+$/.test(e.name)).map((e) => e.name.slice(4)).sort();
}
