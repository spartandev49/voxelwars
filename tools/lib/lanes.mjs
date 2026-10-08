// Lane scheduler (VF 3.8.2; owner TOOLS-GATE). Pure scheduling logic plus a process runner; no gate policy lives here.
//   * a CPU budget of `jobs` units; a task takes `weight` units (capped at `jobs`), longest estimate first
//   * group 'serial': at most one task of the group at a time, on a dedicated worker that costs no CPU units in mode 'parallel';
//     in mode 'after' the group waits until every other task is finished and then runs alone with the whole box
//   * `browser: true` tasks are capped at `browsers` concurrent instances
//   * `deps`: a task starts after its dependencies finished; a dependency that FAILED (or was blocked) turns the dependent into a blocked SKIP
//   * `retryAlone`: a failed task is re-run alone after the queue drains; the alone result is the final one (a timing test is red only if it fails alone)
//   * `retryOnTimeout`: a task whose result says `timedOut` gets the same alone re-run (a hung browser page under load is not a verdict)
import { spawn } from 'child_process';

/** Run a command, capture the tail of combined output, kill the whole process group on timeout and after exit. */
export function runProc(cmd, args, { cwd, env, timeout = 300000, tailBytes = 24000, registry } = {}) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    let tail = '', timedOut = false, done = false, partial = '';
    const hits = [];
    const child = spawn(cmd, args, { cwd, env: env ? { ...process.env, ...env } : process.env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    if (registry) registry.add(child);
    const FOCUS = /(^|\s)(FAIL|FAILED|not ok)\b|AssertionError|Error:|Uncaught|Unhandled/;   // failure lines survive even when the tail window has moved past them
    const take = (b) => {
      const text = b.toString('utf8');
      tail += text; if (tail.length > tailBytes * 2) tail = tail.slice(-tailBytes);
      const lines = (partial + text).split('\n'); partial = lines.pop();
      for (const l of lines) if (hits.length < 12 && FOCUS.test(l)) hits.push(l.slice(0, 300));
    };
    child.stdout.on('data', take); child.stderr.on('data', take);
    const killGroup = (sig) => { try { process.kill(-child.pid, sig); } catch { try { child.kill(sig); } catch { /* already gone */ } } };
    const timer = setTimeout(() => { timedOut = true; killGroup('SIGTERM'); setTimeout(() => killGroup('SIGKILL'), 3000).unref(); }, timeout);
    const fin = (code, signal, err) => {
      if (done) return; done = true; clearTimeout(timer); if (registry) registry.delete(child);
      killGroup('SIGKILL');   // reap stragglers of the group: a tool that spawned Chromium must not leave it behind
      resolve({ code: code === null ? (signal ? 128 : 1) : code, signal, timedOut, secs: (Date.now() - t0) / 1000, tail: tail.slice(-tailBytes) + (err ? '\n' + err.message : ''), hits });
    };
    child.on('error', (e) => fin(127, null, e));
    child.on('close', (code, signal) => fin(code, signal));
  });
}

/**
 * @typedef {{id:string, run:(ctx?:{alone?:boolean})=>Promise<{status:string,[k:string]:any}>, deps?:string[], weight?:number, group?:string, browser?:boolean, est?:number, retryAlone?:boolean, retryOnTimeout?:boolean}} Task
 * @param {Task[]} tasks
 * @param {{jobs:number, browsers?:number, serialMode?:'parallel'|'after', bail?:boolean, onStart?:Function, onDone?:Function, now?:()=>number}} opts
 * @returns {Promise<Map<string,object>>} results by id: status PASS|FAIL|AMBER|SKIP plus what run() returned plus startedAt/finishedAt/retried/blocked; `.peak` = {cpu, procs}
 */
export async function runTasks(tasks, opts) {
  const jobs = Math.max(1, opts.jobs | 0 || 1);
  const maxBrowsers = Math.max(1, opts.browsers | 0 || 1);
  const serialMode = opts.serialMode || 'parallel';
  const now = opts.now || Date.now;
  const byId = new Map(tasks.map((t, i) => [t.id, { ...t, order: i }]));
  if (byId.size !== tasks.length) throw new Error('duplicate task id');
  for (const t of byId.values()) for (const d of t.deps || []) if (!byId.has(d)) throw new Error(`task ${t.id}: unknown dependency ${d}`);

  const results = new Map();       // final results
  const pending = new Set(byId.keys());
  const running = new Map();       // id -> {w}
  const retryQueue = [];           // ids that failed once and wait for the alone round
  const firstFails = new Map();    // their first (loaded) failure, kept out of `results` so dependents keep waiting
  let cpuUsed = 0, serialBusy = false, browsersBusy = 0, bailed = false, peakCpu = 0, peakProcs = 0, retrying = false;
  const done = (id) => results.has(id);

  const finish = (t, r, started, extra = {}) => {
    const res = { ...r, ...extra, startedAt: started, finishedAt: now() };
    results.set(t.id, res);
    if (opts.onDone) opts.onDone(t, res);
    return res;
  };

  return new Promise((resolve) => {
    const settle = () => {
      // 1. blocked / bailed tasks become SKIP without running
      let changed = true;
      while (changed) {
        changed = false;
        for (const id of [...pending]) {
          const t = byId.get(id);
          const deps = t.deps || [];
          const bad = deps.find((d) => done(d) && (results.get(d).status === 'FAIL' || results.get(d).blocked));
          if (bailed || bad) { pending.delete(id); finish(t, { status: 'SKIP', blocked: true, reason: bailed ? '--bail after first failure' : `dependency ${bad} ${results.get(bad).status === 'FAIL' ? 'failed' : 'blocked'}` }, now()); changed = true; }
        }
      }
    };
    const pump = () => {
      settle();
      const ready = [...pending].map((id) => byId.get(id)).filter((t) => (t.deps || []).every(done));
      ready.sort((a, b) => (b.est || 0) - (a.est || 0) || a.order - b.order);
      const nonSerialLeft = () => running.size > [...running.keys()].filter((id) => byId.get(id).group === 'serial').length || [...pending].some((id) => byId.get(id).group !== 'serial');
      for (const t of ready) {
        let w;
        if (t.group === 'serial') {
          if (serialBusy) continue;
          if (serialMode === 'after') { if (nonSerialLeft() || cpuUsed > 0) continue; w = jobs; } else w = 0;
        } else w = Math.min(jobs, t.weight || 1);
        if (cpuUsed + w > jobs) continue;
        if (t.browser && browsersBusy >= maxBrowsers) continue;
        start(t, w);
      }
      if (running.size) return;
      if (retryQueue.length && !retrying) { retrying = true; runRetries().then(() => { retrying = false; pump(); }); return; }
      if (retrying) return;
      if (pending.size) {   // nothing running, nothing startable: a dependency cycle
        for (const id of [...pending]) { pending.delete(id); finish(byId.get(id), { status: 'FAIL', reason: 'unsatisfiable dependencies' }, now()); }
      }
      resolve();
    };
    const start = (t, w) => {
      pending.delete(t.id);
      if (t.group === 'serial') serialBusy = true;
      if (t.browser) browsersBusy++;
      cpuUsed += w; peakCpu = Math.max(peakCpu, cpuUsed);
      const started = now();
      running.set(t.id, { w });
      peakProcs = Math.max(peakProcs, running.size);
      if (opts.onStart) opts.onStart(t);
      Promise.resolve().then(() => t.run({ alone: false })).catch((e) => ({ status: 'FAIL', reason: 'task threw: ' + (e && e.stack || e) })).then((r) => {
        running.delete(t.id); cpuUsed -= w;
        if (t.group === 'serial') serialBusy = false;
        if (t.browser) browsersBusy--;
        if (r.status === 'FAIL' && (t.retryAlone || (t.retryOnTimeout && r.timedOut))) { retryQueue.push(t.id); firstFails.set(t.id, r); }
        else { finish(t, r, started); if (r.status === 'FAIL' && opts.bail) bailed = true; }
        pump();
      });
    };
    const runRetries = async () => {
      while (retryQueue.length) {
        const id = retryQueue.shift();
        const t = byId.get(id);
        const first = firstFails.get(id);
        const started = now();
        if (opts.onStart) opts.onStart({ ...t, id: t.id + ' (alone)' });
        const r = await Promise.resolve().then(() => t.run({ alone: true })).catch((e) => ({ status: 'FAIL', reason: 'task threw: ' + (e && e.stack || e) }));
        finish(t, { ...r, firstFailSecs: first && first.secs, firstFailTail: first && first.tail }, started, { retried: true });
        if (r.status === 'FAIL' && opts.bail) bailed = true;
      }
    };
    pump();
  }).then(() => { results.peak = { cpu: peakCpu, procs: peakProcs }; return results; });
}
