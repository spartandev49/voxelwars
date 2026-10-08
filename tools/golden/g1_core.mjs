// G1 sim matrix: the IMPORT-FREE core (docs/eras/spec/VF.md 3.6.1) that runs one prepared world to its end and returns the digest. It is plain script text on
// purpose: Node imports it (tools/golden/g1_lib.mjs) and the Chromium column injects the very same source into the page of the build under test
// (tools/golden/g1_chromium.mjs), so both engines hash with identical code. No imports, no Node or DOM globals other than `performance` (timing only).
//
//   makeEventHasher(eventFields)                       FNV over every event through the frozen per-type field lists
//   simulate(w, spec, params, eventFields, deps, opts) -> { digest:{chain,walk,endHash,endWalk,evHash,result}, exercise, legacyBad, nan, inf, ms }
//     w     a World built from the case, inputs already queued, NOT started (simulate attaches the observer and calls w.start(0))
//     deps  { legacyStateHash(w), statwalkDetail(w) -> {hash, nan, inf} }        opts  { hooks: true } counts ability hooks (recorder)

const FNV0 = 2166136261, FNV_P = 16777619;
/** Event hasher over the frozen per-type field lists (eventFields). Unknown event types are counted, not hashed. */
export function makeEventHasher(eventFields) {
  let h = FNV0, count = 0, unknown = 0;
  const strCache = new Map(), counts = Object.create(null), launch = Object.create(null), unknownTypes = Object.create(null);
  const mix32 = (x) => { h = Math.imul(h ^ (x | 0), FNV_P) >>> 0; };
  const strHash = (s) => {
    let v = strCache.get(s);
    if (v === undefined) { v = FNV0; for (let i = 0; i < s.length; i++) v = Math.imul(v ^ s.charCodeAt(i), FNV_P) >>> 0; strCache.set(s, v); }
    return v;
  };
  const mixNum = (v) => {
    if (v !== v) mix32(0x7ff80001);
    else if (v === Infinity) mix32(0x7ff00001);
    else if (v === -Infinity) mix32(0xfff00001);
    else mix32((Math.fround(v) * 1000) | 0);
  };
  const mixVal = (v, depth) => {
    switch (typeof v) {
      case 'number': mixNum(v); return;
      case 'boolean': mix32(v ? 1 : 0); return;
      case 'string': mix32(strHash(v)); mix32(v.length); return;
      case 'undefined': mix32(0x756e6466); return;
      case 'object': break;
      default: mix32(0x6f746872); return;
    }
    if (v === null) { mix32(0x6e756c6c); return; }
    if (depth > 4) { mix32(0x64656570); return; }
    if (Array.isArray(v)) { mix32(v.length); for (let i = 0; i < v.length; i++) mixVal(v[i], depth + 1); return; }
    const ks = Object.keys(v).sort();
    mix32(ks.length);
    for (const k of ks) { mix32(strHash(k)); mixVal(v[k], depth + 1); }
  };
  return {
    onEvent(type, p) {
      const fields = eventFields[type];
      if (!fields) { unknown++; unknownTypes[type] = (unknownTypes[type] || 0) + 1; return; }
      count++;
      counts[type] = (counts[type] || 0) + 1;
      mix32(strHash(type));
      for (let i = 0; i < fields.length; i++) mixVal(p[fields[i]], 0);
      if (type === 'projectile_launch') launch[p.kind] = (launch[p.kind] || 0) + 1;
    },
    get hash() { return h >>> 0; }, get count() { return count; }, get unknown() { return unknown; },
    counts, launch, unknownTypes,
  };
}

const sortedObj = (o) => { const r = {}; for (const k of Object.keys(o).sort()) r[k] = o[k]; return r; };

/** Count the ability hooks that actually reached an implementation, per `<ability id>:<hook>` (instrumentation only: a wrapper with the same arity and result). */
function instrumentHooks(w) {
  const orig = w.abilityHook, counts = Object.create(null);
  if (typeof orig !== 'function') return counts;
  w.abilityHook = function abilityHookCounted(name, u, a, b, c, d) {
    const ab = u.abil;
    if (ab) for (let i = 0; i < ab.length; i++) if (ab[i].impl[name]) { const k = ab[i].p.id + ':' + name; counts[k] = (counts[k] || 0) + 1; }
    return orig.call(w, name, u, a, b, c, d);
  };
  return counts;
}


/**
 * Run a prepared world to `ended` or the tick cap and digest it.
 *   chain = legacy stateHash every params.chainEvery ticks (+ endHash), walk = statwalk every params.walkEvery (+ endWalk), evHash = FNV over the events,
 *   result = [winner, endReason, tick, round(time*1000), alive0, alive1, dead0, dead1, kills0, kills1, round(dmg0), round(dmg1), start0, start1, events].
 */
export function simulate(w, spec, params, eventFields, deps, opts = {}) {
  const t0 = performance.now();
  const { legacyStateHash, statwalkDetail } = deps;
  const eh = makeEventHasher(eventFields);
  w.ev.onAny(eh.onEvent);
  const hooks = opts.hooks ? instrumentHooks(w) : null;
  w.start(0);
  const cap = spec.cap || params.cap, chainEvery = params.chainEvery, walkEvery = params.walkEvery;
  const chain = [], walk = [];
  let legacyBad = null, guard = cap * 4, nan = 0, inf = 0;
  while (w.state !== 'ended' && w.tickN < cap && guard-- > 0) {
    w.tick();
    const n = w.tickN;
    if (n % chainEvery === 0) { const hv = legacyStateHash(w); chain.push(hv); if (legacyBad === null && hv !== w.stateHash()) legacyBad = n; }
    if (n % walkEvery === 0) { const d = statwalkDetail(w); walk.push(d.hash); nan += d.nan; inf = Math.max(inf, d.inf); }
  }
  const endHash = legacyStateHash(w);
  if (legacyBad === null && endHash !== w.stateHash()) legacyBad = w.tickN;
  const detail = statwalkDetail(w), endWalk = detail.hash;
  nan += detail.nan; inf = Math.max(inf, detail.inf);       // NaN anywhere in a sampled state counts, also in a unit that died and left the list later
  const ended = w.state === 'ended', s0 = w.stats[0], s1 = w.stats[1];
  const result = [
    ended ? w.winner : -1, ended ? w.endReason : 'cap', w.tickN, Math.round(w.time * 1000),
    s0.alive, s1.alive, s0.dead, s1.dead, s0.kills, s1.kills, Math.round(s0.damageDealt), Math.round(s1.damageDealt), s0.startCount, s1.startCount, eh.count,
  ];
  const exercise = { events: sortedObj(eh.counts), launch: sortedObj(eh.launch), inf };
  if (hooks) exercise.hooks = sortedObj(hooks);
  if (eh.unknown) exercise.unknownEvents = sortedObj(eh.unknownTypes);
  return { digest: { chain, walk, endHash, endWalk, evHash: eh.hash, result }, exercise, legacyBad, nan, inf, ms: performance.now() - t0 };
}
