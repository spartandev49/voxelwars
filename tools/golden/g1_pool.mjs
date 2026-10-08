// Runs G1 cases in 1..N worker processes (a true work queue: each worker takes the next case when it is free). Used by the recorder, the check mode
// and the tests. jobs <= 1 runs in this process (the regime is then process-global, so only one regime per process) unless fork:true.
//
//   runCases({ root, regime, fixturesDir, ids, jobs, hooks, fork, onResult }) -> Map id -> { digest, exercise, legacyBad, nan, inf, ms }
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadTree, loadFixtures, runCase } from './g1_lib.mjs';

const WORKER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'g1_worker.mjs');

export async function runCases({ root, regime, fixturesDir, ids, jobs = 1, hooks = false, fork: forceFork = false, onResult }) {
  const out = new Map();
  if (!forceFork && (jobs <= 1 || ids.length <= 1)) {
    const ctx = await loadTree(root, regime), fx = loadFixtures(fixturesDir);
    for (const id of ids) {
      const spec = fx.cases.find((c) => c.id === id);
      if (!spec) throw new Error('unknown case ' + id);
      const r = runCase(ctx, fx, spec, { hooks }); out.set(id, r); if (onResult) onResult(id, r);
    }
    return out;
  }
  const queue = ids.slice(), n = Math.min(jobs, ids.length), kids = [];
  await new Promise((resolve, reject) => {
    let live = n, failed = false;
    const fail = (e) => { if (failed) return; failed = true; for (const k of kids) k.kill('SIGKILL'); reject(e instanceof Error ? e : new Error(String(e))); };
    const next = (k) => { const id = queue.shift(); if (id === undefined) { k.send({ type: 'exit' }); return; } k.send({ type: 'run', id }); };
    for (let i = 0; i < n; i++) {
      const k = fork(WORKER, [], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'], env: process.env });
      kids.push(k);
      k.on('message', (m) => {
        if (m.type === 'ready') next(k);
        else if (m.type === 'result') { const { type, id, ...r } = m; out.set(id, r); if (onResult) onResult(id, r); next(k); }
        else if (m.type === 'error') fail(new Error(`worker error in ${m.id}: ${m.message}`));
      });
      k.on('error', fail);
      k.on('exit', (code) => { if (failed) return; if (code !== 0) fail(new Error('worker exited with code ' + code)); else if (--live === 0) resolve(); });
      k.send({ type: 'init', root, regime, fixturesDir, hooks });
    }
  });
  return out;
}
