// Key bindings table: defaults, per-context conflict domains, reserved keys, override storage. Pure Node.
import assert from 'node:assert';
import { KEY_ACTIONS, CONTEXTS, DEFAULT_KEYS, RESERVED, FIXED_KEYS, currentKeys, findConflict, setKey, resetKeys, domainOf } from '../../src/ui/keymap.js';

const mk = (init) => { const s = { keys: init || {} }; return { get: (k) => s[k], set: (k, v) => { s[k] = v; } }; };
assert.ok(KEY_ACTIONS.length >= 8, 'UI8 needs at least 8 rebindable actions');
assert.equal(new Set(KEY_ACTIONS.map((a) => a.id)).size, KEY_ACTIONS.length, 'action ids unique');
for (const a of KEY_ACTIONS) assert.match(a.id, /^[a-z][a-z_]*$/, 'ids are lower_snake_case');
assert.equal(domainOf('camera'), domainOf('control'), 'camera and control are live together, so one conflict domain');
assert.notEqual(domainOf('placement'), domainOf('camera'));

// defaults must not collide inside a domain
for (const dom of new Set(CONTEXTS.map((c) => c.domain))) {
  const seen = new Map();
  for (const c of CONTEXTS.filter((x) => x.domain === dom)) {
    for (const a of KEY_ACTIONS.filter((x) => x.ctx === c.id)) for (const code of [a.def].concat(a.alt || [])) { assert.ok(!seen.has(code), `default collision on ${code}: ${a.id} vs ${seen.get(code)}`); seen.set(code, a.id); }
    for (const f of FIXED_KEYS[c.id] || []) for (const code of f.keys) { assert.ok(!seen.has(code), `fixed/default collision on ${code} in ${dom}: ${f.label} vs ${seen.get(code)}`); seen.set(code, f.label); }
  }
}
// conflicts
let s = mk();
assert.equal(findConflict(s, 'follow', 'KeyT').id, 'topdown', 'T is Top-down');
assert.equal(findConflict(s, 'pause', 'KeyF').id, 'follow', 'camera and control share a domain');
assert.equal(findConflict(s, 'follow', 'KeyM').kind, 'fixed', 'M is the minimap (fixed)');
assert.equal(findConflict(s, 'rot_left', 'ArrowLeft').kind, 'fixed', 'arrow alias of Pan left is fixed');
assert.equal(findConflict(s, 'follow', 'KeyF'), null, 'your own key is not a conflict');
assert.equal(findConflict(s, 'follow', 'KeyJ'), null);
assert.equal(findConflict(s, 'pause', 'Digit1').kind, 'fixed', 'god-power digits are fixed');
// overrides
setKey(s, 'follow', 'KeyJ');
assert.equal(currentKeys(s).follow, 'KeyJ');
assert.equal(findConflict(s, 'photo', 'KeyJ').id, 'follow', 'a rebound key conflicts at its new place');
assert.equal(findConflict(s, 'photo', 'KeyF'), null, 'the freed key is free');
setKey(s, 'follow', DEFAULT_KEYS.follow);
assert.ok(!('follow' in s.get('keys')), 'binding back to the default removes the override');
setKey(s, 'pan_up', 'KeyI'); resetKeys(s);
assert.deepEqual(s.get('keys'), {});
for (const code of ['Escape', 'Tab', 'Enter']) assert.ok(RESERVED.includes(code));
assert.deepEqual(currentKeys({ get: () => { throw new Error('storage broke'); } }), DEFAULT_KEYS, 'broken settings fall back to defaults');
console.log('keymap: all passed');
