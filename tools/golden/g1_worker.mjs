// Worker process of the G1 pool (tools/golden/g1_pool.mjs). Protocol over the IPC channel:
//   parent -> {type:'init', root, regime, fixturesDir, hooks}      child -> {type:'ready', bake}
//   parent -> {type:'run', id}                                      child -> {type:'result', id, ...runCase result} | {type:'error', id, message}
// One regime per process (the clip bake is process-global state).
import { loadTree, loadFixtures, runCase } from './g1_lib.mjs';

let ctx = null, fx = null, hooks = false;
process.on('message', async (m) => {
  try {
    if (m.type === 'init') {
      ctx = await loadTree(m.root, m.regime); fx = loadFixtures(m.fixturesDir); hooks = !!m.hooks;
      process.send({ type: 'ready', bake: ctx.bake ? Object.keys(ctx.bake).length : 0 });
    } else if (m.type === 'run') {
      const spec = fx.cases.find((c) => c.id === m.id);
      if (!spec) throw new Error('unknown case ' + m.id);
      process.send({ type: 'result', id: m.id, ...runCase(ctx, fx, spec, { hooks }) });
    } else if (m.type === 'exit') process.exit(0);
  } catch (e) { process.send({ type: 'error', id: m.id, message: String((e && e.stack) || e).split('\n').slice(0, 6).join(' | ') }); }
});
