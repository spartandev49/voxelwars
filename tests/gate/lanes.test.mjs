// GATE-T02: the lane scheduler (tools/lib/lanes.mjs): CPU budget, weights, serial exclusivity, browser cap, longest-first, dependencies, retry-alone, bail.
import { criterion } from '../lib/criteria.mjs';
import { runTasks, runProc } from '../../tools/lib/lanes.mjs';

const c = criterion('GATE-T02', { er: 'gate', owner: 'TOOLS-GATE', tier: 'T-fast', negctl: 'tests/negctl/GATE-T02.mjs', text: 'lane scheduler honours jobs, weights, serial group, browser cap, order, deps, retry-alone, bail' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** instrumented task: records concurrency while it runs */
function probe(state, id, { ms = 30, weight, group, browser, est, deps, status = 'PASS', onRun } = {}) {
  return {
    id, weight, group, browser, est, deps,
    run: async (ctx) => {
      state.running.add(id); state.maxRunning = Math.max(state.maxRunning, state.running.size);
      if (group === 'serial') { state.serialNow++; state.serialMax = Math.max(state.serialMax, state.serialNow); }
      if (browser) { state.browserNow++; state.browserMax = Math.max(state.browserMax, state.browserNow); }
      state.order.push(id);
      const others = [...state.running].filter((x) => x !== id);
      state.overlaps.set(id, others);
      await sleep(ms);
      state.running.delete(id);
      if (group === 'serial') state.serialNow--;
      if (browser) state.browserNow--;
      return onRun ? onRun(ctx, state) : { status, secs: ms / 1000 };
    },
  };
}
const fresh = () => ({ running: new Set(), maxRunning: 0, serialNow: 0, serialMax: 0, browserNow: 0, browserMax: 0, order: [], overlaps: new Map() });

// 1. the CPU budget: 8 unit tasks on 3 lanes never run more than 3 at once, and do use 3
{
  const s = fresh();
  const res = await runTasks(Array.from({ length: 8 }, (_, i) => probe(s, 't' + i)), { jobs: 3 });
  c.check('jobs_cap', s.maxRunning <= 3, 'max ' + s.maxRunning);
  c.check('jobs_used', s.maxRunning === 3, 'max ' + s.maxRunning);
  c.check('all_pass', [...res.values()].every((r) => r.status === 'PASS') && res.size === 8);
  c.check('peak_reported', res.peak.cpu === 3 && res.peak.procs === 3, JSON.stringify(res.peak));
}
// 2. weights: a weight-2 task on jobs=2 runs alone (a Chromium test takes two lanes)
{
  const s = fresh();
  await runTasks([probe(s, 'big', { weight: 2, ms: 60, est: 99 }), probe(s, 'a'), probe(s, 'b'), probe(s, 'c')], { jobs: 2 });
  c.check('weight_excludes_others', (s.overlaps.get('big') || []).length === 0, 'overlapped with ' + s.overlaps.get('big'));
  c.check('weight_capped_at_jobs', true);
  const s1 = fresh();
  const r1 = await runTasks([probe(s1, 'huge', { weight: 9 })], { jobs: 2 });
  c.check('weight_above_jobs_still_runs', r1.get('huge').status === 'PASS');
}
// 3. serial group: never two at once; beside the pool in 'parallel' mode, alone in 'after' mode
{
  const s = fresh();
  await runTasks([probe(s, 'p1', { ms: 80 }), probe(s, 'p2', { ms: 80 }), probe(s, 's1', { group: 'serial', ms: 40 }), probe(s, 's2', { group: 'serial', ms: 40 })], { jobs: 2, serialMode: 'parallel' });
  c.check('serial_exclusive', s.serialMax === 1, 'serial max ' + s.serialMax);
  c.check('serial_beside_pool', (s.overlaps.get('s1') || []).some((x) => x.startsWith('p')) || (s.overlaps.get('s2') || []).some((x) => x.startsWith('p')), JSON.stringify([...s.overlaps]));
  c.check('pool_cap_with_serial', s.maxRunning <= 3, 'max ' + s.maxRunning);
  const a = fresh();
  await runTasks([probe(a, 'p1', { ms: 60 }), probe(a, 'p2', { ms: 60 }), probe(a, 'p3', { ms: 60 }), probe(a, 's1', { group: 'serial', ms: 30 }), probe(a, 's2', { group: 'serial', ms: 30 })], { jobs: 2, serialMode: 'after' });
  c.check('after_mode_alone', (a.overlaps.get('s1') || []).length === 0 && (a.overlaps.get('s2') || []).length === 0, JSON.stringify([...a.overlaps]));
  c.check('after_mode_last', a.order.indexOf('s1') > a.order.indexOf('p3') && a.order.indexOf('s2') > a.order.indexOf('p3'), a.order.join());
}
// 4. browser cap
{
  const s = fresh();
  await runTasks(Array.from({ length: 5 }, (_, i) => probe(s, 'b' + i, { browser: true, weight: 1 })), { jobs: 4, browsers: 2 });
  c.check('browser_cap', s.browserMax <= 2, 'browser max ' + s.browserMax);
  c.check('browser_parallel', s.browserMax === 2, 'browser max ' + s.browserMax);
}
// 5. longest estimate first, ties by declaration order
{
  const s = fresh();
  await runTasks([probe(s, 'short', { est: 1 }), probe(s, 'long', { est: 50 }), probe(s, 'mid', { est: 10 }), probe(s, 'mid2', { est: 10 })], { jobs: 1 });
  c.check('longest_first', s.order.join() === 'long,mid,mid2,short', s.order.join());
}
// 6. dependencies: dependents wait; a failed dependency blocks them with a reason and does not run them
{
  const s = fresh();
  const res = await runTasks([probe(s, 'build', { ms: 40 }), probe(s, 'smoke', { deps: ['build'] }), probe(s, 'broken', { status: 'FAIL' }), probe(s, 'after-broken', { deps: ['broken'] }), probe(s, 'chain', { deps: ['after-broken'] })], { jobs: 3 });
  c.check('dep_waits', s.order.indexOf('smoke') > s.order.indexOf('build') && !(s.overlaps.get('smoke') || []).includes('build'));
  c.check('dep_blocks_on_fail', res.get('after-broken').status === 'SKIP' && res.get('after-broken').blocked && /broken failed/.test(res.get('after-broken').reason), JSON.stringify(res.get('after-broken')));
  c.check('dep_block_is_transitive', res.get('chain').status === 'SKIP' && res.get('chain').blocked);
  c.check('blocked_not_run', !s.order.includes('after-broken') && !s.order.includes('chain'));
  let threw = false; try { await runTasks([{ id: 'x', deps: ['nope'], run: async () => ({ status: 'PASS' }) }], { jobs: 1 }); } catch { threw = true; }
  c.check('unknown_dep_throws', threw);
  const cyc = await runTasks([{ id: 'a', deps: ['b'], run: async () => ({ status: 'PASS' }) }, { id: 'b', deps: ['a'], run: async () => ({ status: 'PASS' }) }], { jobs: 1 });
  c.check('cycle_fails_not_hangs', cyc.get('a').status === 'FAIL' && cyc.get('b').status === 'FAIL');
}
// 7. SKIP (tool absent) does not block dependents; only FAIL does
{
  const s = fresh();
  const res = await runTasks([{ id: 'optional', run: async () => ({ status: 'SKIP', reason: 'tool not built' }) }, probe(s, 'next', { deps: ['optional'] })], { jobs: 1 });
  c.check('skip_does_not_block', res.get('next').status === 'PASS' && res.get('optional').status === 'SKIP');
}
// 8. retry alone: fails while others run, passes alone -> final PASS, flagged retried; fails alone too -> final FAIL
{
  const s = fresh();
  const flaky = probe(s, 'timing', { group: 'serial', ms: 50, onRun: (ctx, st) => ((ctx && ctx.alone) ? { status: 'PASS', secs: 0.01 } : { status: 'FAIL', secs: 0.05, tail: 'too slow under load' }) });
  const res = await runTasks([{ ...flaky, retryAlone: true }, probe(s, 'p1', { ms: 120 }), probe(s, 'p2', { ms: 120 })], { jobs: 2 });
  c.check('retry_alone_passes', res.get('timing').status === 'PASS' && res.get('timing').retried === true, JSON.stringify(res.get('timing')));
  c.check('retry_keeps_first_failure', res.get('timing').firstFailTail === 'too slow under load');
  const s2 = fresh();
  const res2 = await runTasks([{ ...probe(s2, 'hard', { group: 'serial', onRun: () => ({ status: 'FAIL', secs: 0.01, tail: 'always' }) }), retryAlone: true }], { jobs: 1 });
  c.check('retry_alone_fails_alone', res2.get('hard').status === 'FAIL' && res2.get('hard').retried === true);
  const s3 = fresh();
  const res3 = await runTasks([probe(s3, 'nr', { group: 'serial', onRun: () => ({ status: 'FAIL', secs: 0.01 }) })], { jobs: 1 });
  c.check('no_retry_flag_no_retry', res3.get('nr').status === 'FAIL' && !res3.get('nr').retried);
  // a task that depends on a retried task waits for the alone result
  const s4 = fresh();
  const res4 = await runTasks([{ ...probe(s4, 'f', { group: 'serial', onRun: (ctx) => ({ status: ctx && ctx.alone ? 'PASS' : 'FAIL', secs: 0 }) }), retryAlone: true }, probe(s4, 'dep', { deps: ['f'] })], { jobs: 2 });
  c.check('dependents_wait_for_retry', res4.get('dep').status === 'PASS');
}
// 8b. a timed-out task (hung page under load) is re-run alone; an ordinary failure of the same kind of task is not
{
  const res = await runTasks([
    { id: 'hang', retryOnTimeout: true, run: async (ctx) => (ctx && ctx.alone ? { status: 'PASS', secs: 0.01 } : { status: 'FAIL', timedOut: true, secs: 0.05 }) },
    { id: 'plain', retryOnTimeout: true, run: async () => ({ status: 'FAIL', secs: 0.01 }) },
  ], { jobs: 2 });
  c.check('timeout_retried_alone', res.get('hang').status === 'PASS' && res.get('hang').retried === true, JSON.stringify(res.get('hang')));
  c.check('plain_failure_not_retried_on_timeout_rule', res.get('plain').status === 'FAIL' && !res.get('plain').retried);
}
// 9. bail
{
  const s = fresh();
  const res = await runTasks([probe(s, 'bad', { status: 'FAIL', est: 9 }), probe(s, 'x1', { est: 1 }), probe(s, 'x2', { est: 1 }), probe(s, 'x3', { est: 1 })], { jobs: 1, bail: true });
  c.check('bail_skips_rest', res.get('bad').status === 'FAIL' && ['x1', 'x2', 'x3'].every((k) => res.get(k).status === 'SKIP'), JSON.stringify([...res].map(([k, v]) => [k, v.status])));
}
// 10. a throwing task becomes a FAIL with a reason, the others still finish
{
  const res = await runTasks([{ id: 'boom', run: async () => { throw new Error('kaput'); } }, { id: 'ok', run: async () => ({ status: 'PASS' }) }], { jobs: 2 });
  c.check('throw_is_fail', res.get('boom').status === 'FAIL' && /kaput/.test(res.get('boom').reason) && res.get('ok').status === 'PASS');
}
// 11. runProc: exit code, tail, timeout kills the whole group, no stragglers
{
  const ok = await runProc('node', ['-e', 'console.log("hello")'], {});
  c.check('proc_ok', ok.code === 0 && /hello/.test(ok.tail));
  const bad = await runProc('node', ['-e', 'console.error("oops"); process.exit(3)'], {});
  c.check('proc_exit_code', bad.code === 3 && /oops/.test(bad.tail));
  const t0 = Date.now();
  const slow = await runProc('node', ['-e', 'require("child_process").spawn("sleep",["30"],{stdio:"ignore"}); setInterval(()=>{},1000)'], { timeout: 400 });
  c.check('proc_timeout_kills', slow.timedOut === true && slow.code !== 0 && Date.now() - t0 < 6000, `timedOut=${slow.timedOut} after ${Date.now() - t0} ms`);
  const missing = await runProc('definitely-not-a-binary-xyz', [], {});
  c.check('proc_spawn_error', missing.code === 127);
}
console.log(`GATE-T02 ok: ${c.assertions} assertions`);
