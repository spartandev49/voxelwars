// Key bindings table (spec/ui.md section 6): rebindable actions with defaults, fixed keys per context, and conflict rules.
// settings.keys is a partial {actionId: KeyboardEvent.code} override map; COORD's input layer should resolve `keys[id] || DEFAULT_KEYS[id]`.
// A rebinding may not collide inside its CONFLICT DOMAIN: contexts that are live at the same time share a domain
// (Battle camera + Battle control are both active during a battle, so they check each other).

export const CONTEXTS = [
  { id: 'camera', label: 'Battle camera', domain: 'battle' },
  { id: 'control', label: 'Battle control', domain: 'battle' },
  { id: 'placement', label: 'Placement', domain: 'placement' },
  { id: 'command', label: 'Take Command', domain: 'command' },
  { id: 'results', label: 'Results screen', domain: 'results' },
];

/** Rebindable actions. `alt` = an extra fixed alias (shown, not rebindable). */
export const KEY_ACTIONS = [
  { id: 'pan_up', ctx: 'camera', label: 'Pan forward', def: 'KeyW', alt: ['ArrowUp'] },
  { id: 'pan_down', ctx: 'camera', label: 'Pan back', def: 'KeyS', alt: ['ArrowDown'] },
  { id: 'pan_left', ctx: 'camera', label: 'Pan left', def: 'KeyA', alt: ['ArrowLeft'] },
  { id: 'pan_right', ctx: 'camera', label: 'Pan right', def: 'KeyD', alt: ['ArrowRight'] },
  { id: 'rot_left', ctx: 'camera', label: 'Rotate left', def: 'KeyQ' },
  { id: 'rot_right', ctx: 'camera', label: 'Rotate right', def: 'KeyE' },
  { id: 'tilt_up', ctx: 'camera', label: 'Tilt up', def: 'KeyZ' },
  { id: 'tilt_down', ctx: 'camera', label: 'Tilt down', def: 'KeyX' },
  { id: 'follow', ctx: 'camera', label: 'Follow selected unit', def: 'KeyF' },
  { id: 'topdown', ctx: 'camera', label: 'Top-down camera', def: 'KeyT' },
  { id: 'cinematic', ctx: 'camera', label: 'Cinematic camera', def: 'KeyC' },
  { id: 'photo', ctx: 'camera', label: 'Photo mode', def: 'KeyP' },
  { id: 'pause', ctx: 'control', label: 'Pause', def: 'Space' },
  { id: 'slower', ctx: 'control', label: 'Slower', def: 'BracketLeft' },
  { id: 'faster', ctx: 'control', label: 'Faster', def: 'BracketRight' },
  { id: 'erase', ctx: 'placement', label: 'Erase brush', def: 'Delete', alt: ['Backspace'] },
  { id: 'brush', ctx: 'placement', label: 'Cycle brush', def: 'KeyB' },
  { id: 'rematch', ctx: 'results', label: 'Rematch', def: 'KeyR' },
  { id: 'tweak', ctx: 'results', label: 'Tweak the army', def: 'KeyT' },
  { id: 'killcam', ctx: 'results', label: 'Kill-cam', def: 'KeyK' },
];

/** Fixed keys per context (read-only reference, also used for conflict detection). */
export const FIXED_KEYS = {
  camera: [
    { label: 'Fast camera (hold)', keys: ['ShiftLeft'] }, { label: 'Zoom', keys: [], text: 'Mouse wheel' }, { label: 'Toggle minimap', keys: ['KeyM'] }, { label: 'Hide HUD', keys: ['Tab'] }, { label: 'Controls help', keys: ['KeyH'] },
  ],
  control: [
    { label: 'God powers 1 to 6', keys: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'] }, { label: 'Order: advance', keys: ['KeyO'] }, { label: 'Order: hold', keys: ['KeyL'] },
    { label: 'Take Command of selected', keys: ['Enter'] }, { label: 'Pause menu', keys: ['Escape'] },
  ],
  placement: [
    { label: 'Place / paint', keys: [], text: 'Left click' }, { label: 'Orbit camera', keys: [], text: 'Right drag' }, { label: 'Undo', keys: [], text: 'Ctrl/Cmd + Z' }, { label: 'Redo', keys: [], text: 'Ctrl/Cmd + Shift + Z' },
    { label: 'Rotate camera', keys: ['KeyQ', 'KeyE'] }, { label: 'Focus FIGHT', keys: ['Space'] },
  ],
  command: [
    { label: 'Move', keys: ['KeyW', 'KeyA', 'KeyS', 'KeyD'] }, { label: 'Attack nearest', keys: [], text: 'Click or tap' }, { label: 'Abilities 1 to 3', keys: ['Digit1', 'Digit2', 'Digit3'] }, { label: 'Sprint', keys: ['ShiftLeft'] }, { label: 'Exit Take Command', keys: ['Escape'] },
  ],
};

/** Codes that can never be bound. */
export const RESERVED = ['Escape', 'Tab', 'Enter', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'ContextMenu', 'CapsLock'];

export const DEFAULT_KEYS = Object.fromEntries(KEY_ACTIONS.map((a) => [a.id, a.def]));

export function domainOf(ctxId) { const c = CONTEXTS.find((x) => x.id === ctxId); return c ? c.domain : ctxId; }
export function currentKeys(settings) {
  let o = {};
  try { o = settings.get('keys') || {}; } catch (e) { o = {}; }
  const out = {};
  for (const a of KEY_ACTIONS) out[a.id] = typeof o[a.id] === 'string' ? o[a.id] : a.def;
  return out;
}
export function actionById(id) { return KEY_ACTIONS.find((a) => a.id === id) || null; }

/** What already uses `code` in the same conflict domain as `actionId`? -> { kind:'action'|'fixed', id?, label } | null */
export function findConflict(settings, actionId, code) {
  const me = actionById(actionId);
  if (!me) return null;
  const dom = domainOf(me.ctx);
  const keys = currentKeys(settings);
  for (const a of KEY_ACTIONS) {
    if (a.id === actionId || domainOf(a.ctx) !== dom) continue;
    if (keys[a.id] === code) return { kind: 'action', id: a.id, label: a.label };
    if (a.alt && a.alt.indexOf(code) >= 0) return { kind: 'fixed', label: a.label + ' (alternate key)' };
  }
  for (const c of CONTEXTS) {
    if (c.domain !== dom) continue;
    for (const f of FIXED_KEYS[c.id] || []) if (f.keys.indexOf(code) >= 0) return { kind: 'fixed', label: f.label };
  }
  // a fixed alias of my own action does not conflict with myself
  return null;
}

/** Set one binding (stores only overrides). */
export function setKey(settings, actionId, code) {
  let o = {};
  try { o = Object.assign({}, settings.get('keys') || {}); } catch (e) { o = {}; }
  if (DEFAULT_KEYS[actionId] === code) delete o[actionId]; else o[actionId] = code;
  settings.set('keys', o);
}
export function resetKeys(settings) { settings.set('keys', {}); }
