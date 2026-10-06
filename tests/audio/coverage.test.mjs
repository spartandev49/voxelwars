// AU3 documentation check: docs/audio_coverage.md must list every family and every synth-only family needs a justification.
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { coverage, render, triggers } from './gen_coverage.mjs';
import { SYNTH_REASONS } from './synth_reasons.mjs';
import { CUE_IDS } from '../../src/audio/cues.js';
import { root } from './helpers.mjs';

const { rows } = coverage();
for (const r of rows) if (!r.real.length) assert.ok(SYNTH_REASONS[r.id], 'synth-only family without a justification in tests/audio/synth_reasons.mjs: ' + r.id);
for (const k of Object.keys(SYNTH_REASONS)) assert.ok(CUE_IDS.includes(k), 'stale justification for ' + k);
const text = render(); assert.ok(!/MISSING JUSTIFICATION/.test(text));
const docPath = path.join(root, 'docs/audio_coverage.md'); assert.ok(fs.existsSync(docPath), 'docs/audio_coverage.md exists (node tests/audio/gen_coverage.mjs)');
const doc = fs.readFileSync(docPath, 'utf8');
for (const id of CUE_IDS) assert.ok(doc.includes('`' + id + '`'), 'doc lists ' + id);
// no dead cues: every family is triggered by an event, ability, UI helper, foley/ambience bed, the engine or a layer
const TR = triggers(); const dead = CUE_IDS.filter((i) => TR[i].size === 0); assert.deepEqual(dead, [], 'families nothing triggers: ' + dead.join(', '));
console.log(`coverage.test OK (${rows.length} families, ${rows.filter((r) => !r.real.length).length} synth-only, doc ${doc.length} chars)`);
