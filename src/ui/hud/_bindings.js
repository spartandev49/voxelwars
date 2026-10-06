// _bindings.js: the per-context input table of spec/ui.md §6 as data. One source for the controls overlay, button tooltips and the battle
// screen's key handling. Rebindable actions read `settings.keys[action]` (a KeyboardEvent.code); a rebinding may not collide inside its context.

/** Rebindable battle actions (ids are shared with the Settings > Controls tab). */
export const ACTIONS = [
  { id: 'pan_up', def: 'KeyW', label: 'Pan forward', ctx: 'camera' },
  { id: 'pan_left', def: 'KeyA', label: 'Pan left', ctx: 'camera' },
  { id: 'pan_down', def: 'KeyS', label: 'Pan back', ctx: 'camera' },
  { id: 'pan_right', def: 'KeyD', label: 'Pan right', ctx: 'camera' },
  { id: 'rot_left', def: 'KeyQ', label: 'Rotate left', ctx: 'camera' },
  { id: 'rot_right', def: 'KeyE', label: 'Rotate right', ctx: 'camera' },
  { id: 'tilt_up', def: 'KeyZ', label: 'Tilt up', ctx: 'camera' },
  { id: 'tilt_down', def: 'KeyX', label: 'Tilt down', ctx: 'camera' },
  { id: 'follow', def: 'KeyF', label: 'Follow selected', ctx: 'camera' },
  { id: 'topdown', def: 'KeyT', label: 'Top-down camera', ctx: 'camera' },
  { id: 'cinematic', def: 'KeyC', label: 'Cinematic camera', ctx: 'camera' },
  { id: 'photo', def: 'KeyP', label: 'Photo mode', ctx: 'camera' },
  { id: 'pause', def: 'Space', label: 'Pause / resume', ctx: 'control' },
  { id: 'slower', def: 'BracketLeft', label: 'Slower', ctx: 'control' },
  { id: 'faster', def: 'BracketRight', label: 'Faster', ctx: 'control' },
];

/** Fixed (non-rebindable) battle keys. */
export const FIXED = {
  hide_hud: 'Tab', help: 'KeyH', minimap: 'KeyM', command: 'Enter', menu: 'Escape',
  order_advance: 'KeyO', order_hold: 'KeyL',
  power_1: 'Digit1', power_2: 'Digit2', power_3: 'Digit3', power_4: 'Digit4', power_5: 'Digit5', power_6: 'Digit6',
};

const DEF = Object.fromEntries(ACTIONS.map((a) => [a.id, a.def]));

export function keyFor(settings, id) {
  let keys = null;
  try { keys = settings && settings.get('keys'); } catch (e) { keys = null; }
  return (keys && keys[id]) || DEF[id] || FIXED[id] || '';
}

const NAMES = { Space: 'Space', BracketLeft: '[', BracketRight: ']', Escape: 'Esc', Tab: 'Tab', Enter: 'Enter', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ShiftLeft: 'Shift', ShiftRight: 'Shift', Backquote: '`', Slash: '/', Comma: ',', Period: '.', Semicolon: ';', Quote: "'", Minus: '-', Equal: '=', Backspace: 'Bksp', Delete: 'Del' };
export function keyLabel(code) {
  if (!code) return '';
  if (NAMES[code]) return NAMES[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return 'Num' + code.slice(6);
  return code;
}
export function keyOf(settings, id) { return keyLabel(keyFor(settings, id)); }

/** Does a KeyboardEvent match an action (rebinding aware)? */
export function isAction(e, settings, id) { return e.code === keyFor(settings, id); }

/** Context tables for the controls overlay / controls screen. Each row: [label, [key labels...] | resolver]. `*` marks rebindable. */
export function contextTables(settings) {
  const k = (id) => keyOf(settings, id);
  return [
    { id: 'camera', title: 'Battle camera', rows: [
      ['Pan', [k('pan_up'), k('pan_left'), k('pan_down'), k('pan_right'), 'or arrows'], true],
      ['Rotate', [k('rot_left'), k('rot_right')], true],
      ['Tilt', [k('tilt_up'), k('tilt_down')], true],
      ['Fast camera', ['Shift']],
      ['Zoom', ['Wheel']],
      ['Orbit / pan', ['Right-drag', 'Middle-drag']],
      ['Follow selected', [k('follow')], true],
      ['Top-down', [k('topdown')], true],
      ['Cinematic', [k('cinematic')], true],
      ['Photo mode', [k('photo')], true],
      ['Minimap', ['M']],
      ['Hide HUD', ['Tab']],
      ['This help', ['H', '?']],
    ] },
    { id: 'control', title: 'Battle control', rows: [
      ['Pause', [k('pause')], true],
      ['Slower / faster', [k('slower'), k('faster')], true],
      ['God powers', ['1', '2', '3', '4', '5', '6']],
      ['Advance / hold', ['O', 'L']],
      ['Take Command of selected', ['Enter']],
      ['Cancel aim / pause menu', ['Esc']],
    ] },
    { id: 'command', title: 'Take Command', rows: [
      ['Move', ['W', 'A', 'S', 'D']],
      ['Attack nearest in aim cone', ['Click', 'Tap']],
      ['Abilities', ['1', '2', '3']],
      ['Sprint', ['Shift']],
      ['Exit (god powers are off while in command)', ['Esc']],
    ] },
    { id: 'placement', title: 'Placement', rows: [
      ['Place / paint', ['Left-click']],
      ['Orbit', ['Right-drag']],
      ['Undo / redo', ['Ctrl+Z', 'Ctrl+Shift+Z']],
      ['Erase', ['Delete']],
      ['Cycle brush', ['B']],
      ['Rotate formation', ['Q', 'E']],
      ['Fight!', ['Space (when focused)']],
    ] },
    { id: 'results', title: 'Results', rows: [
      ['Rematch', ['R']],
      ['Tweak army', ['T']],
      ['Kill-cam', ['K']],
      ['Menu', ['Esc']],
    ] },
    { id: 'editors', title: 'Arena Builder and Painter', rows: [
      ['Rotate prop', ['R']],
      ['Scale prop', ['Alt+Wheel']],
      ['Lower / scatter', ['Shift']],
      ['Undo', ['Ctrl+Z']],
      ['Cycle brush', ['B']],
      ['Painter tools', ['P', 'E', 'G', 'L', 'B', 'I']],
      ['Mirror axes', ['X', 'Y', 'Z']],
      ['Brush size', ['[', ']']],
    ] },
  ];
}
export const TOUCH_TIPS = [
  ['One finger drag', 'Orbit'],
  ['Two fingers', 'Pan and pinch-zoom'],
  ['Tap', 'Select a unit'],
  ['Long-press', 'Unit info'],
  ['Take Command', 'On-screen joystick plus three ability buttons'],
];
