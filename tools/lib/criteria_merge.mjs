// Merges the per-process criteria lines of a gate run into .cache/gate/criteria.json (VF 3.4; owner TOOLS-GATE for the merge, TOOLS-VERIFY for ER roll-up/report).
// Criterion status: FAIL (failures non-empty), else UNVERIFIED with a reason U2 zero assertions / U3 no negctl / U4 negctl not proven / U5 skipped, else PASS (PANEL when judge is panel|agent).
// U1 (declared in the criteria manifest but not executed) and the ER roll-up need tools/lib/criteria_manifest.json and er_table.json, which report.mjs generates: until they exist
// the file carries `er: {}` and `manifest: null`, and the report generator (TOOLS-VERIFY) owns those two sections.
import fs from 'fs';
import path from 'path';

export function readLines(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

/** @param {object[]} lines criteria lines (one per criterion per process)
 *  @param {{root:string, negctlStore?:object, run:object}} ctx */
export function mergeCriteria(lines, ctx) {
  const criteria = {};
  for (const l of lines) {
    const prev = criteria[l.id];
    // the same id twice in one run (e.g. a retried serial test): the later line wins, failures of an earlier line are kept only if the later one also failed
    const negPath = l.negctl ? path.join(ctx.root, l.negctl) : null;
    const neg = ctx.negctlStore && ctx.negctlStore[l.id] ? ctx.negctlStore[l.id] : null;
    let status = 'PASS', reason = null;
    if (l.failures && l.failures.length) { status = 'FAIL'; reason = l.failures.join(', '); }
    else if (l.skipped) { status = 'UNVERIFIED'; reason = 'U5 skipped: ' + l.skipped; }
    else if (!l.assertions) { status = 'UNVERIFIED'; reason = 'U2 zero assertions'; }
    else if (!negPath || !fs.existsSync(negPath)) { status = 'UNVERIFIED'; reason = 'U3 no negative control'; }
    else if (!neg || neg.result !== 'red-as-expected' || (neg.scriptHash && l.scriptHash && neg.scriptHash !== l.scriptHash)) { status = 'UNVERIFIED'; reason = 'U4 negative control not proven in this tree'; }
    else if (l.judge === 'panel' || l.judge === 'agent') status = 'PANEL';
    criteria[l.id] = {
      er: l.er, owner: l.owner, tier: l.tier, status, ...(reason ? { reason } : {}), assertions: l.assertions, failures: l.failures || [], seconds: l.seconds,
      negctl: l.negctl ? { path: l.negctl, result: neg ? neg.result : null } : null, file: l.file, ...(l.cached ? { cached: true } : {}), ...(prev ? { duplicate: true } : {}),
    };
  }
  return { schema: 1, run: ctx.run, criteria, er: {}, manifest: null };
}

export function writeCriteria(file, doc) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(doc, null, 1) + '\n');
  fs.renameSync(tmp, file);
}
