// statwalk for Node tools and tests: the frozen witness walker (core in statwalk_core.mjs) bound to tests/golden/v8_fields.json.
//
//   statwalk(world)        -> uint32 (the "walk" column of G1)
//   statwalkDetail(world)  -> { hash, nan, inf, units, projectiles, effects, props }
//   loadSpec(file?)        -> the spec (`data` of the v8_fields record); createStatwalk(spec) builds a walker for another spec
//
// The default spec is read lazily on first use, so importing this module never touches the disk.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStatwalk, checkSpec } from './statwalk_core.mjs';

export { createStatwalk, checkSpec };
export const SPEC_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'tests', 'golden', 'v8_fields.json');

export function loadSpec(file = SPEC_PATH) {
  const rec = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (rec.kind !== 'v8_fields' || !rec.data) throw new Error(`${file} is not a v8_fields record`);
  return checkSpec(rec.data);
}
let dflt = null;
const walker = () => dflt || (dflt = createStatwalk(loadSpec()));
export const statwalk = (w) => walker().statwalk(w);
export const statwalkDetail = (w) => walker().detail(w);
