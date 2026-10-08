// Shared helpers of the golden tests (G2, G3, G4, G7): loading a committed golden record with its provenance checks, and reporting labels.
// A golden test registers ONE criterion; every label is `c.soft`-ed so a red run lists everything that moved, with the first offenders printed to stderr.
import path from 'node:path';
import { readRecord } from '../../tools/lib/records.mjs';
import { BASELINE_SHA, BASELINE_TAG } from '../../tools/golden/baseline.mjs';
import { ROOT } from '../../tools/lib/paths.mjs';

/** Provenance problems of a golden record: it must come from the baseline commit, in the named kind/engine/regime, from a clean checkout. */
export function provenanceProblems(rec, { kind, engine }) {
  const p = [];
  if (rec.kind !== kind) p.push(`kind ${rec.kind} != ${kind}`);
  if (rec.engine !== engine) p.push(`engine ${rec.engine} != ${engine}`);
  if (rec.regime !== 'baked') p.push(`regime ${rec.regime} != baked`);
  if (rec.sha !== BASELINE_SHA) p.push(`sha ${String(rec.sha).slice(0, 10)} is not the baseline ${BASELINE_SHA.slice(0, 10)}`);
  if (rec.tag !== BASELINE_TAG) p.push(`tag ${rec.tag} != ${BASELINE_TAG}`);
  if (rec.dirty !== false) p.push('recorded from a dirty checkout');
  if (rec.witness !== undefined || rec.staleSince !== undefined) p.push('a golden never carries witness/staleSince (VF-D6)');
  return p;
}

/** Read a golden record relative to the repo root; returns { rec, problems } (rec is null when the file is missing or malformed). */
export function loadGolden(rel, expect) {
  try { const rec = readRecord(path.join(ROOT, rel)); return { rec, problems: provenanceProblems(rec, expect) }; }
  catch (e) { return { rec: null, problems: [`${rel}: ${e.message}`] }; }
}

/** Count one assertion on label `label`; on failure print the detail (first lines only) so the run says what moved. Returns ok. */
export function red(c, label, ok, detail = '') {
  const good = c.soft(label, !!ok);
  if (!good) console.error(`RED ${c.id}/${label}${detail ? ': ' + String(detail).split('\n').slice(0, 8).join('\n    ') : ''}`);
  return good;
}

/** "a, b, c and 4 more" */
export function listFirst(arr, n = 6) { return arr.slice(0, n).join(', ') + (arr.length > n ? ` and ${arr.length - n} more` : ''); }

/** Print the verdict, flush the criterion line and set the exit code. */
export function finish(c) {
  if (c.failures.length) { console.error(`RED ${c.id}: ${c.failures.join(', ')}`); process.exitCode = 1; }
  else console.log(`ok  ${c.id}: ${c.assertions} assertions`);
  c.done();
}
