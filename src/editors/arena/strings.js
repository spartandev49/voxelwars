// Arena Builder copy (spec/humor.md tone: specific beats generic, short beats long, one wink per screen). Every user-visible string of the
// builder lives here so the HUMOR pass can edit it; ctx.content.humor.arenaBuilder (when present) is deep-merged over these defaults by getS().

const n = (v) => Number(v).toLocaleString('en-US');

export const S = {
  title: 'Arena Builder', untitled: 'Untitled Arena',
  common: { back: 'Back', close: 'Close', cancel: 'Cancel', save: 'Save', ok: 'OK', delete: 'Delete', copy: 'Copy', open: 'Open', rename: 'Rename', duplicate: 'Duplicate', export: 'Export', import: 'Import', apply: 'Apply', reset: 'Reset', on: 'On', off: 'Off' },

  tools: {
    raise: { name: 'Raise / Lower', tip: 'Click to raise the ground. Hold Shift to dig.', hint: 'Click and drag to raise. Shift digs.' },
    smooth: { name: 'Smooth', tip: 'Sands the bumps off. Good for apologising to hills.', hint: 'Drag to smooth the ground.' },
    flatten: { name: 'Flatten', tip: 'Click sets a target height, drag levels everything to it. Alt-click only samples.', hint: 'Drag to level. Alt-click samples a height.' },
    paint: { name: 'Paint', tip: 'Paint ground materials. Painting under water is fine; the fish do not mind.', hint: 'Drag to paint the chosen material.' },
    water: { name: 'Water / Lava', tip: 'Set the sea level. Flip to lava, which soldiers take personally.', hint: 'Move the slider: the whole arena changes.' },
    noise: { name: 'Noise', tip: 'Adds seeded lumpiness. Same seed, same lumps.', hint: 'Drag to roughen the ground.' },
    ramp: { name: 'Ramp / Road', tip: 'Click two points: cuts a walkable ramp and lays cobble.', hint: 'Click the start, then the end of the road.' },
    stamp: { name: 'Stamp', tip: 'Drop a ready-made hill, crater, mesa, trench, island or ridge. R turns it.', hint: 'Click to stamp. R rotates.' },
    props: { name: 'Props', tip: 'Trees, walls, temples. R rotates, Alt+wheel scales, Shift scatters.', hint: 'Click to place. Shift+drag scatters.' },
    hazards: { name: 'Hazards', tip: 'Quicksand, spikes, fire, boulder lanes, geysers and lava.', hint: 'Click to place a hazard circle.' },
    zones: { name: 'Zones', tip: 'Drag the blue and red deployment zones.', hint: 'Drag on the ground to draw the zone.' },
    symmetry: { name: 'Symmetry', tip: 'Mirror what you do, so the fight is fair.', hint: 'Terrain, paint, props and hazards follow the mirror.' },
    generate: { name: 'Generate', tip: 'Roll a whole arena from a recipe and a seed.', hint: 'Pick a recipe, then roll.' },
    environment: { name: 'Environment', tip: 'Time of day, weather, fog, wind and music mood.', hint: 'The sky answers right away.' },
    info: { name: 'Info', tip: 'Name, author, description and tags.', hint: 'Tell the world who made this.' },
    markers: { name: 'Markers & objective', tip: 'Place objective markers and pick the arena\'s default objective.', hint: 'Click to place the chosen marker.' },
  },
  toolGroups: { sculpt: 'Sculpt', place: 'Place', world: 'World' },
  toolbar: 'Tools',

  brush: {
    title: 'Brush', radius: 'Radius', strength: 'Strength', shape: 'Shape', falloff: 'Falloff',
    shapes: { circle: 'Round', square: 'Square' }, falloffs: { smooth: 'Soft', linear: 'Linear', flat: 'Hard' },
    unitU: (v) => `${v} u`, cycleToast: (shape, fall) => `Brush: ${shape}, ${fall} edge`,
  },
  raise: { lower: 'Lower', hintShift: 'Hold Shift to lower' },
  flatten: { target: 'Target height', sample: 'Sample', sampled: (h) => `Target set to ${h} u`, auto: 'Click to set the height under the cursor', unset: 'Not set' },
  paint: { material: 'Material', materials: ['Grass', 'Dirt', 'Sand', 'Stone', 'Snow', 'Mud', 'Marble', 'Lava', 'Planks', 'Brick', 'Cobblestone', 'Ash', 'Sandstone', 'Dry Grass', 'Mossy Stone', 'Crimson Sand'] },
  water: { level: 'Level', none: 'No water', lava: 'Lava instead of water', surface: (u) => `Surface at ${u} u`, tip: 'Zones must stay above the surface. The Checks tab will tell you.' },
  noise: { scale: 'Lump size', seed: 'Seed', reroll: 'New seed' },
  ramp: { width: 'Road width', first: 'Now click where the road ends', done: (n) => (n ? `Road cut (${n} props cleared)` : 'Road cut'), pick: 'Click the start of the road' },
  stamp: { kind: 'Shape', rotate: 'Rotate', kinds: { hill: 'Hill', crater: 'Crater', mesa: 'Mesa', trench: 'Trench', island: 'Island', ridge: 'Ridge' }, size: 'Size', height: 'Height' },

  props: {
    search: 'Search props', searchPh: 'Search props...', all: 'All', cats: { nature: 'Nature', architecture: 'Architecture', monuments: 'Monuments', props: 'Camp' },
    modes: { place: 'Place', select: 'Select', erase: 'Delete' },
    modeTip: { place: 'Click to place, Shift+drag to scatter.', select: 'Click a prop to move, turn or scale it.', erase: 'Click or drag to remove props under the brush.' },
    rotation: 'Rotation', scale: 'Scale', variant: 'Variant', variantRandom: 'Random', density: 'Scatter density', snap: 'Snap to cells', randomRot: 'Random rotation',
    count: (c, max) => `${n(c)} / ${n(max)} props`, full: 'The arena is full: 1,500 props is the limit.', empty: 'No props match that search.',
    selected: 'Selected prop', none: 'Nothing selected', removeSel: 'Delete', dupSel: 'Duplicate', ground: 'On ground', info: (r, h, hp) => `Blocks r ${r} u, ${h} u tall, ${hp}`,
    indestructible: 'indestructible', hpOf: (hp) => `${hp} hp`, placeFail: 'Nowhere to put that.',
    removed: (c) => (c === 1 ? 'Prop deleted' : `${c} props deleted`), scattered: (c) => `${c} props scattered`,
  },
  hazards: {
    kinds: { quicksand: 'Quicksand', spikes: 'Spikes', fire: 'Fire pit', boulders: 'Boulder lane', geyser: 'Geyser', lava: 'Lava pool' },
    tips: { quicksand: 'Slows to 40%. Soldiers drown after four seconds.', spikes: 'Pop up every three seconds. There is a telegraph.', fire: 'Burns on contact and spreads to flammable props.', boulders: 'A boulder rolls down the lane every 12 seconds.', geyser: 'Rumbles, then launches whoever stands there.', lava: 'Paints lava. 100% avoided by the AI.' },
    modes: { place: 'Place', select: 'Move', erase: 'Delete' }, radius: 'Radius', count: (c, max) => `${c} / ${max} hazards`, full: 'That is 60 hazards. Even the soldiers are nervous.',
    removed: 'Hazard removed', selected: 'Selected hazard', none: 'Nothing selected', del: 'Delete hazard',
  },
  zones: {
    zone: 'Zone', A: 'Blue (A)', B: 'Red (B)', draw: 'Draw', hint: 'Drag on the ground to draw it. Drag inside to move, drag an edge to resize.',
    x: 'Centre X', z: 'Centre Z', w: 'Width', d: 'Depth', mirror: 'Mirror to the other side', center: 'Reset both', remove: 'Remove zone', missing: 'Not placed yet',
    size: (w, d) => `${Math.round(w * 10) / 10} x ${Math.round(d * 10) / 10} u`, walk: (c) => `${c} walkable cells`,
  },
  symmetry: {
    modes: { off: 'Off', mx: 'Mirror X', mz: 'Mirror Z', rot: 'Rotate 180°' },
    tips: { off: 'Everything you do stays where you do it.', mx: 'Left and right are mirrored across the centre line.', mz: 'Top and bottom are mirrored across the centre line.', rot: 'The far side is a half turn of the near side.' },
    note: 'Applies to terrain, paint, props and hazards.',
  },
  generate: {
    recipe: 'Recipe', seed: 'Seed', roll: 'Reroll', apply: 'Generate', parts: 'Apply to', terrain: 'Terrain only', props: 'Props only', both: 'Both',
    note: 'One undo step. Your name, author and description stay.', done: (r) => `Generated ${r}`, partsTip: { terrain: 'Keeps your zones, props and hazards.', props: 'Keeps the terrain and zones.', both: 'Replaces terrain, props, hazards, zones and sky.' },
  },
  env: {
    time: 'Time of day', weather: 'Weather', fog: 'Fog', wind: 'Wind', theme: 'Music theme', mood: 'Music mood', preview: 'Hear it',
    weathers: { clear: 'Clear', cloudy: 'Cloudy', rain: 'Rain', storm: 'Storm', snow: 'Snow', sandstorm: 'Sandstorm', fog: 'Fog' },
    weatherTip: { clear: 'Nothing happens. Enjoy it.', cloudy: 'Atmospheric. No rule changes.', rain: 'Fire burns half as long; fire arrows fizzle.', storm: 'Rain, plus decorative lightning.', snow: 'Everyone moves 10% slower.', sandstorm: 'Ranged spread x1.5 and short sight lines.', fog: 'Views get short. Rules do not change.' },
    themes: { greek: 'Greek', roman: 'Roman', egyptian: 'Egyptian', persian: 'Persian', punic: 'Punic', barbarian: 'Barbarian', alpine: 'Alpine', mythic: 'Mythic' },
    moods: { auto: 'Match the arena', menu: 'Calm', battle: 'Battle', comedy: 'Comedy' },
    clock: (t) => { const h = Math.floor(t) % 24, m = Math.round((t - Math.floor(t)) * 60) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; },
  },
  info: { name: 'Name', author: 'Author', desc: 'Description', tags: 'Tags', tagsPh: 'Add a tag and press Enter', addTag: 'Add', nameCount: (l) => `${l} / 32`, descCount: (l) => `${l} / 200`, tagsMax: 'Five tags is plenty.' },
  markers: {
    types: { hill: 'Hill', exit: 'Exit', vip_start: 'VIP start', general_spawn: 'General spawn', waypoint: 'Waypoint' },
    tips: { hill: 'The circle to hold for Hold the hill.', exit: 'Where the VIP is heading.', vip_start: 'Where the VIP begins.', general_spawn: 'Where the enemy general starts.', waypoint: 'A scripted march point.' },
    modes: { place: 'Place', select: 'Move', erase: 'Delete' }, radius: 'Radius', count: (c, max) => `${c} / ${max} markers`, full: 'Eight markers is the limit. Pick favourites.',
    objective: 'Default objective', objectiveNote: 'A suggestion: Quick Battle pre-selects it when this arena is played.', needs: 'Needs', have: 'placed', missing: 'missing',
    objectives: { eliminate: 'Eliminate', kill_general: 'Kill the general', hold_hill: 'Hold the hill', protect_vip: 'Protect the VIP', destroy: 'Destroy the gates' },
    needsText: { eliminate: 'Nothing special.', kill_general: 'a General spawn marker', hold_hill: 'a Hill marker', protect_vip: 'a VIP start and an Exit marker', destroy: 'at least one Wooden Gate prop' },
    selected: 'Selected marker', none: 'Nothing selected', del: 'Delete marker', removed: 'Marker removed', moved: (t) => `${t} moved`,
  },

  checks: {
    tab: 'Checks', tool: 'Tool', title: 'Checks', ready: 'All clear', errors: (n) => (n === 1 ? '1 problem' : `${n} problems`), warnings: (n) => (n === 1 ? '1 warning' : `${n} warnings`),
    allClear: 'Everything checks out. Playtest away.', fix: 'Fix', fixed: 'Fixed', blocksPlaytest: 'Problems block Playtest. Warnings do not.', path: 'Path from A to B', pathOk: (r) => `Radius ${r}: open`, pathBad: (r) => `Radius ${r}: blocked`,
    limits: 'Limits', props: 'Props', hazards: 'Hazards', markers: 'Markers', types: 'Prop types', zoneWalk: (z, c) => `Zone ${z}: ${c} walkable cells`,
    sevError: 'Problem', sevWarn: 'Warning',
    issues: {
      zone_missing: (p) => `Zone ${p.zone} is missing.`, zone_bounds: (p) => `Zone ${p.zone} sticks out past the edge of the arena.`, zone_overlap: () => 'The two zones overlap. Armies need their own side.',
      zone_walkable: (p) => `Zone ${p.zone} has ${p.count} walkable cells; it needs ${p.need}.`, zone_water: (p) => `Zone ${p.zone} is under ${p.lava ? 'lava' : 'water'} (${p.cells} cells).`,
      path_blocked: (p) => `Soldiers cannot walk from zone A to zone B (${p.radii.map((r) => 'radius ' + r).join(' and ')}).`,
      props_limit: (p) => `${n(p.count)} props; the limit is ${n(p.max)}.`, prop_types_limit: (p) => `${p.count} prop types; the limit is ${p.max}.`, prop_unknown: (p) => `Unknown props in this arena: ${p.types.join(', ')}.`,
      hazards_limit: (p) => `${p.count} hazards; the limit is ${p.max}.`, markers_limit: (p) => `${p.count} markers; the limit is ${p.max}.`, marker_bounds: () => 'A marker is outside the arena.',
      objective_markers: (p, S2) => { const need = [...p.missing.map((t) => S2.markers.types[t]), ...(p.missingProps || []).map(() => S2.markers.needsText.destroy)]; return `"${S2.markers.objectives[p.objective]}" still needs: ${need.join(', ')}.`; },
      name_length: (p) => (p.length ? 'The name must be 1 to 32 characters.' : 'The arena needs a name.'),
    },
    fixes: {
      add_zone: (p) => `Add zone ${p.zone}`, fit_zone: () => 'Fit it inside', separate_zones: () => 'Pull them apart', level_zone: () => 'Level it', raise_zone: () => 'Raise it', carve_ramp: () => 'Carve a ramp',
      trim_props: () => 'Trim the extras', remove_unknown: () => 'Remove them', trim_hazards: () => 'Trim the extras', trim_markers: () => 'Trim the extras', fit_markers: () => 'Move them in', add_objective_markers: () => 'Add them', name_default: () => 'Name it',
    },
    fixedToast: (fix) => `Fixed: ${fix}`, fixFailed: 'That fix did not change anything.',
  },

  bar: {
    size: 'Size', sizes: { small: 'Small', medium: 'Medium', large: 'Large' }, sizeSub: { small: '64 u', medium: '96 u', large: '128 u' }, custom: (c) => `${c} cells`,
    name: 'Arena name', undo: 'Undo', redo: 'Redo', save: 'Save', saveAs: 'Save as...', share: 'Share', playtest: 'Playtest', open: 'My Arenas', new: 'New',
    undoTip: 'Undo', redoTip: 'Redo', saveTip: 'Save to My Arenas', shareTip: 'Copy a share code or download a file', playtestTip: 'Test the arena with armies, then come back here', playtestBlocked: 'Fix the problems first. The Checks tab has buttons.',
    topdown: 'Top-down view', frame: 'Frame the arena', overlays: 'Show zones and markers', help: 'Shortcuts', back: 'Leave the builder',
  },
  status: { saved: 'Saved', unsaved: 'Unsaved changes', draft: 'Draft kept' },

  view: { hover: (x, z, h) => `x ${x}   z ${z}   height ${h} u`, touchCamera: 'Move camera', touchDraw: 'Draw', touchLower: 'Lower', touchRotate: 'Rotate', touchScale: 'Scale', viewport: 'Arena viewport. Choose a tool on the left, then click or drag on the arena.' },

  dialogs: {
    resizeTitle: 'Resize the arena?', resizeText: (from, to, n) => `Resizing resamples the map from ${from} to ${to}. The terrain is stretched, ${n} placed things move with it, and fine detail can be lost. You can undo it.`, resizeYes: 'Resize',
    leaveTitle: 'Leave the builder?', leaveText: 'You have changes that are not saved to My Arenas. A draft is kept either way and offered back next time.', leaveSave: 'Save first', leaveKeep: 'Leave, keep draft', leaveDiscard: 'Leave, discard',
    draftTitle: 'Pick up where you left off?', draftText: (name, when) => `Your draft "${name}" was saved ${when}.`, draftContinue: 'Continue draft', draftFresh: 'Start fresh',
    newTitle: 'Start a new arena', newBlank: 'Blank lab', newBlankSub: 'Flat grass. Bring your own ideas.', newSize: 'Size', newTemplates: 'Templates', newReplace: 'This replaces the arena you are editing.', newSeed: 'Seed',
    newDirty: 'You have unsaved changes. Start a new arena anyway? The draft keeps a copy until the new one is edited.',
    saveTitle: 'Save to My Arenas', saveName: 'Name', saveNew: 'Save a copy', saveOk: (n2) => `Saved "${n2}"`, saveFull: 'Storage is full. Export the arena as a code instead, or delete one from My Arenas.', saveBlocked: 'Your browser is not keeping saves right now, so this arena only lives until you close the tab. Export it as a code to keep it.',
    libTitle: 'My Arenas', libEmpty: 'Nothing saved yet. Build something, then press Save.', libCount: (c) => `${c} / 48 saved`, libOpen: 'Open', libLoaded: (n2) => `Opened "${n2}"`, libDeleteTitle: 'Delete this arena?', libDeleteText: (n2) => `"${n2}" will be removed from My Arenas. This cannot be undone.`, libRename: 'Rename', libRenameTitle: 'Rename arena',
    libPresets: 'Presets', libMine: 'Mine', libSaved: (when) => `Saved ${when}`, libImport: 'Import a code', libOpenDirty: 'Opening replaces the arena you are editing. Unsaved changes stay in the draft.',
    exportTitle: 'Share this arena', exportCode: 'Share code', exportLength: (l, c) => `${n(l)} characters (size ${c})`, exportTooLong: (l) => `Too long: ${n(l)} > 38,000 characters`, exportFileOnly: 'Too big for a chat message, so download the file instead.', exportDownload: 'Download file', exportCopy: 'Copy code', exportSelect: 'Select all', exportDownloaded: (f) => `Downloaded ${f}`, exportNoDownload: 'Downloads are not available here. Copy the code instead.',
    importTitle: 'Import an arena', importPaste: 'Paste a share code', importPh: 'VW1.arena....', importFile: 'Choose a file', importCheck: 'Check the code', importPreview: 'Looks good', importAccept: 'Open it', importFileHint: '.vwarena or a text file with the code', importEmpty: 'Paste a code first.', importReading: 'Reading...', importNotes: 'Notes',
    importInfo: (name, size, props, hz, mk) => `"${name}": ${size}, ${n(props)} props, ${hz} hazards, ${mk} markers`,
    shortcutsTitle: 'Keyboard shortcuts', shortcutsNote: 'Hover any control to see its own shortcut.',
    playtestTitle: 'Playtest', playtestBlocked: 'Playtest needs a clean bill of health.', playtestStart: 'Setting up armies...', playtestBack: 'Back to the Arena Builder',
  },
  toast: {
    undo: (l) => `Undo: ${l}`, redo: (l) => `Redo: ${l}`, nothingUndo: 'Nothing to undo.', nothingRedo: 'Nothing to redo.', copied: 'Share code copied.', copyFailed: 'Select the code and press Ctrl+C.',
    draftSaved: 'Draft kept.', generated: (r) => `Generated ${r}.`, loaded: (nm) => `Opened "${nm}".`, imported: (nm) => `Imported "${nm}".`, symmetry: (m) => `Symmetry: ${m}`, tool: (nm) => nm,
    storageBlocked: 'Saves are off in this browser. Export the code to keep your work.', playtestErr: 'The playtest would not start.',
  },
  shortcuts: [
    { group: 'Tools', rows: [['1 - 9, 0', 'Raise, Smooth, Flatten, Paint, Water, Noise, Ramp, Stamp, Props, Hazards'], ['Z', 'Zones'], ['M', 'Markers & objective'], ['Y', 'Symmetry (press again to cycle)'], ['G', 'Generate'], ['V', 'Environment'], ['I', 'Info']] },
    { group: 'Brush', rows: [['[ ]', 'Smaller / larger brush'], ['Shift [ ]', 'Weaker / stronger'], ['B', 'Cycle brush shape and edge'], ['Shift (held)', 'Lower terrain, scatter props'], ['Alt-click', 'Sample height with Flatten']] },
    { group: 'Props', rows: [['R / Shift+R', 'Rotate the ghost or the selected prop'], ['Alt + wheel', 'Scale'], ['Delete', 'Delete the selection']] },
    { group: 'Camera', rows: [['W A S D / arrows', 'Pan'], ['Q E', 'Rotate'], ['Wheel', 'Zoom'], ['Right-drag', 'Orbit'], ['Middle-drag', 'Pan'], ['T', 'Top-down view'], ['F', 'Frame the arena']] },
    { group: 'File', rows: [['Ctrl+Z', 'Undo'], ['Ctrl+Shift+Z / Ctrl+Y', 'Redo'], ['Ctrl+S', 'Save'], ['Ctrl+Enter', 'Playtest'], ['?', 'This list'], ['Esc', 'Deselect, then leave']] },
  ],
  phone: { title: 'Built for bigger screens', text: 'The Arena Builder needs a tablet or a desktop: brushes want room and fingers want elbow room.' },
  ago: (ms) => { const s = Math.max(1, Math.round(ms / 1000)); if (s < 60) return 'moments ago'; const m = Math.round(s / 60); if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`; const h = Math.round(m / 60); if (h < 48) return `${h} hour${h === 1 ? '' : 's'} ago`; return `${Math.round(h / 24)} days ago`; },
};

/** Deep-merge ctx.content.humor.arenaBuilder over the defaults (HUMOR may override any leaf). */
export function getS(ctx) {
  let over = null;
  try { over = ctx.content.humor.arenaBuilder || null; } catch (e) { over = null; }
  if (!over) return S;
  const merge = (a, b) => { const o = Array.isArray(a) ? a.slice() : Object.assign({}, a); for (const k of Object.keys(b || {})) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && typeof a[k] === 'object' ? merge(a[k], b[k]) : b[k]; return o; };
  return merge(S, over);
}
