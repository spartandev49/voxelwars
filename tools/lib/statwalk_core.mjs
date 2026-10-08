// statwalk core: the independent witness hash of a World (docs/eras/spec/VF.md 3.6.1 "walk"). Pure JS, no Node imports, so it can be bundled into a page
// (G1 Chromium core, G6) as well as imported by Node tools. The field lists come from a FROZEN spec (tests/golden/v8_fields.json, recorded from the v8
// baseline by tools/golden/v8_fields.mjs); fields that later modules add to Unit / Projectile / effect objects are not in the spec and cannot move the hash.
//
// What is hashed (and nothing else):
//   - every unit of world.units in array order: the spec's unit fields, each value typed at run time (see mixValue);
//   - every ACTIVE projectile of world.proj.list in pool order: the spec's projectile fields;
//   - every ground effect of world.effects: the spec's effect fields;
//   - every prop of world.props: the spec's walk.prop fields (hp, dead);
//   - rng.s, tickN, and the FNV-1a of arena.h (the height field: craters and collapses).
// Numbers are mixed by their exact float64 bits (-0 folded into 0), so the witness is stricter than the legacy stateHash, which quantises to 1/1000.
// NaN and +-Infinity get distinct tags and are COUNTED (statwalkDetail().nan / .inf): a NaN that appears in a listed field is a bug the legacy hash cannot see.
//
// createStatwalk(spec) -> { statwalk(w) -> uint32, detail(w) -> {hash, nan, inf, units, projectiles, effects, props} }

const T = { num: 1, bool: 2, str: 3, nul: 4, und: 5, ref: 6, arr: 7, obj: 8, typed: 9, nan: 10, pinf: 11, ninf: 12, end: 13 };
const FNV_P = 16777619, FNV_0 = 2166136261;
const MAX_DEPTH = 3;

/** Validate and normalise a spec (the `data` of a v8_fields record). Throws on a malformed spec: a silently empty walk would witness nothing. */
export function checkSpec(spec) {
  const bad = (m) => { throw new Error('statwalk spec: ' + m); };
  if (!spec || typeof spec !== 'object') bad('missing');
  for (const k of ['unit', 'projectile', 'effect', 'prop']) if (!Array.isArray(spec[k]) || !spec[k].length || !spec[k].every((x) => typeof x === 'string')) bad(`"${k}" must be a non-empty list of field names`);
  if (!spec.walk || !Array.isArray(spec.walk.prop) || !spec.walk.prop.length) bad('walk.prop must list the prop fields that are hashed');
  if (!spec.nested || typeof spec.nested !== 'object') bad('nested must be an object');
  for (const f of spec.walk.prop) if (!spec.prop.includes(f)) bad(`walk.prop field "${f}" is not a recorded prop field`);
  return spec;
}

export function createStatwalk(specIn) {
  const spec = checkSpec(specIn);
  const nested = spec.nested, strCache = new Map();
  const dv = new DataView(new ArrayBuffer(8));
  let h = 0, nan = 0, inf = 0;

  const mix32 = (x) => { h = Math.imul(h ^ (x | 0), FNV_P) >>> 0; };
  const tag = (t) => mix32(t);
  const mixNum = (v) => {
    if (v !== v) { tag(T.nan); nan++; return; }
    if (v === Infinity) { tag(T.pinf); inf++; return; }
    if (v === -Infinity) { tag(T.ninf); inf++; return; }
    tag(T.num);
    dv.setFloat64(0, v === 0 ? 0 : v);
    mix32(dv.getInt32(0)); mix32(dv.getInt32(4));
  };
  const mixStr = (s) => {
    let sh = strCache.get(s);
    if (sh === undefined) { sh = FNV_0; for (let i = 0; i < s.length; i++) sh = Math.imul(sh ^ s.charCodeAt(i), FNV_P) >>> 0; strCache.set(s, sh); }
    tag(T.str); mix32(sh); mix32(s.length);
  };
  /** Mix one value. `path` selects the nested key list of plain objects ('unit.anim', ...); objects with a primitive `id` are references and hash by id. */
  const mixValue = (v, path, depth) => {
    switch (typeof v) {
      case 'number': mixNum(v); return;
      case 'boolean': tag(T.bool); mix32(v ? 1 : 0); return;
      case 'string': mixStr(v); return;
      case 'undefined': tag(T.und); return;
      case 'function': tag(T.obj); return;
      case 'object': break;
      default: tag(T.obj); return;
    }
    if (v === null) { tag(T.nul); return; }
    if (ArrayBuffer.isView(v) && !(v instanceof DataView)) { tag(T.typed); mix32(v.length); for (let i = 0; i < v.length; i++) mixNum(v[i]); return; }
    if (Array.isArray(v)) {
      tag(T.arr); mix32(v.length);
      if (depth < MAX_DEPTH) for (let i = 0; i < v.length; i++) mixValue(v[i], path + '[]', depth + 1);
      return;
    }
    const id = v.id;
    if (typeof id === 'number') { tag(T.ref); mixNum(id); return; }
    if (typeof id === 'string') { tag(T.ref); mixStr(id); return; }
    const keys = nested[path];
    if (!keys || depth >= MAX_DEPTH || !Array.isArray(keys)) { tag(T.obj); return; }
    tag(T.obj);
    for (let i = 0; i < keys.length; i++) mixValue(v[keys[i]], path + '.' + keys[i], depth + 1);
    tag(T.end);
  };
  /** Ability runtime states: [{p:{id,...}, st:{...}, cd}] with the state keys frozen per ability id (nested['unit.abil.st'][abilityId]). */
  const mixAbil = (a) => {
    tag(T.arr); mix32(a.length);
    const stKeys = nested['unit.abil.st'] || {};
    for (let i = 0; i < a.length; i++) {
      const e = a[i];
      if (!e || typeof e !== 'object') { mixValue(e, 'unit.abil[]', 1); continue; }
      const pid = e.p && typeof e.p.id === 'string' ? e.p.id : '';
      mixStr(pid); mixValue(e.cd, 'unit.abil[].cd', 2);
      const keys = stKeys[pid], st = e.st;
      if (!keys || !st || typeof st !== 'object') { tag(T.und); continue; }
      for (let k = 0; k < keys.length; k++) mixValue(st[keys[k]], 'unit.abil.st.' + pid + '.' + keys[k], 2);
      tag(T.end);
    }
  };

  const U = spec.unit, P = spec.projectile, E = spec.effect, PR = spec.walk.prop;
  function run(w) {
    h = FNV_0; nan = 0; inf = 0;
    const units = w.units, uN = units.length;
    mix32(uN);
    for (let i = 0; i < uN; i++) {
      const u = units[i];
      for (let k = 0; k < U.length; k++) { const f = U[k]; if (f === 'abil') mixAbil(u.abil || []); else mixValue(u[f], 'unit.' + f, 0); }
    }
    let pN = 0;
    const list = w.proj.list;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (!p.active) continue;
      pN++; mix32(i);
      for (let k = 0; k < P.length; k++) mixValue(p[P[k]], 'projectile.' + P[k], 0);
    }
    const eff = w.effects, eN = eff.length;
    mix32(eN);
    for (let i = 0; i < eN; i++) for (let k = 0; k < E.length; k++) mixValue(eff[i][E[k]], 'effect.' + E[k], 0);
    const props = w.props, prN = props.length;
    mix32(prN);
    for (let i = 0; i < prN; i++) for (let k = 0; k < PR.length; k++) mixValue(props[i][PR[k]], 'prop.' + PR[k], 0);
    mixNum(w.rng.s); mixNum(w.tickN);
    const ah = w.arena.h; let a = FNV_0;
    for (let i = 0; i < ah.length; i++) a = Math.imul(a ^ ah[i], FNV_P) >>> 0;
    mix32(a); mix32(ah.length);
    return { hash: h >>> 0, nan, inf, units: uN, projectiles: pN, effects: eN, props: prN };
  }
  return { statwalk: (w) => run(w).hash, detail: run };
}
