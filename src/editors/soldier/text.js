// Every user-visible string of the Soldier Workshop and the Voxel Painter (spec §0.9: copy lives in data; the humor pass may edit it). Tone: docs/spec/humor.md.
export const WS = {
  title: 'Soldier Workshop', sub: 'Design a soldier. Name him Sir Chadius.',
  back: 'Back', undo: 'Undo', redo: 'Redo', help: 'Shortcuts', library: 'My Soldiers', importCode: 'Import', mute: 'Mute',
  partsTitle: 'Parts', searchParts: 'Search parts', onlySilly: 'Silly only', nothingHere: 'Nothing here yet.', nothingHereSub: 'The part library has no entries in this category.', noMatch: 'No part matches that search.',
  locked: 'Locked', lockedToast: (hint) => hint, pickedToast: (n) => n,
  stageHint: 'Drag to turn, scroll to zoom, double-click to reset.',
  clips: { idle: 'Idle', walk: 'Walk', attack: 'Swing', block: 'Block', cast: 'Cast', death: 'Death', cheer: 'Cheer' },
  clip: 'Animation', ghost: 'Hoplite ghost', ghostTip: 'A grey hoplite and a ruler stand beside your soldier so you can judge his size.',
  tint: 'Team colour', tintOptions: { a: 'Team A', b: 'Team B', map: 'Tint map' }, tintTip: 'Team A and B show the colour your soldier wears in battle. The tint map greys everything the team colour will not touch.',
  spin: 'Auto-turn',
  tabsRight: { stats: 'Stats', abilities: 'Abilities', colours: 'Colours', personality: 'Personality', paint: 'Voxel Paint' },
  // stats
  pool: 'Points', poolLeft: (n) => (n === 1 ? '1 point left' : `${n} points left`), poolFull: 'All 100 points spent. Efficient.',
  stat: {
    hp: { name: 'Health', short: 'HP', tip: 'More health per point. Each point is worth about 2.5 hit points.' },
    damage: { name: 'Damage', short: 'DMG', tip: 'Each point adds about 1.2% damage to every hit.' },
    attackSpeed: { name: 'Attack speed', short: 'ATK', tip: 'Each point shortens the pause between attacks by about 1.2%.' },
    speed: { name: 'Speed', short: 'SPD', tip: 'Each point adds about 0.04 u/s to the walking speed.' },
    armor: { name: 'Armour', short: 'ARM', tip: 'Each point takes about 1.2% off the damage he receives.' },
    range: { name: 'Reach', short: 'RCH', tip: 'Each point adds 0.1 u of reach, up to +1.0 u. Reach also decides how long a melee weapon may be.' },
    morale: { name: 'Morale', short: 'MOR', tip: 'Each point makes him a little harder to scare.' },
  },
  nextPoint: (d) => (d === null ? 'maxed out' : d > 0 ? `next point +${d} drachmae` : 'next point is free'),
  derived: { hp: 'Hit points', dmg: 'Damage per hit', dps: 'Damage per second', cd: 'Attack every', speed: 'Walking speed', armor: 'Damage blocked', range: 'Reach', radius: 'Collider', size: 'Size', power: 'Power rating', cost: 'Cost' },
  radar: 'Power rating radar',
  reset: 'Reset points', body: 'Body', bodyType: { slim: 'Slim', average: 'Average', stocky: 'Stocky' }, height: 'Height', heightTip: 'Taller soldiers cost a little more. Size is clamped between 0.85 and 1.35 after the body type is applied.',
  // abilities
  abilities: 'Abilities', abilitiesSub: (n) => `${n} of 2 chosen`, abilityLocked: 'Not with this weapon', aiTitle: 'Behaviour',
  ai: {
    charge: ['Charge', 'Runs at the nearest enemy and apologises later.'], hold: ['Hold', 'Stands firm and glares at anyone who approaches.'], skirmish: ['Skirmish', 'Pokes, steps back, repeats. Politely.'],
    flank: ['Flank', 'Takes the scenic route round to the enemy side.'], guard: ['Guard', 'Stays near friends and takes a keen interest in their safety.'], support: ['Support', 'Helps whoever looks worst off.'],
  },
  // colours
  colour: { primary: 'Primary', secondary: 'Secondary', trim: 'Trim', cloth: 'Cloth (team tint)' }, palettes: 'Ready palettes', palette: (i) => `Palette ${i + 1}`,
  metal: 'Metal', metals: { bronze: 'Bronze', iron: 'Iron', gold: 'Gold', silver: 'Silver', steel: 'Steel', blackiron: 'Black iron' }, emblem: 'Emblem',
  emblems: { none: 'None', lambda: 'Lambda', eye: 'Eye', sun: 'Sun', boar: 'Boar', eagle: 'Eagle', star: 'Star', skull: 'Skull', wave: 'Wave', bolt: 'Bolt' },
  skin: 'Skin', hair: 'Hair colour', eyes: 'Eye colour', clothNote: 'Cloth is the base the team colour multiplies, so light colours tint best.', hex: 'Hex colour',
  // personality
  personality: 'Personality', catchphrase: 'Catchphrase on spawn', catchTip: 'What he says when he joins the fight (40 characters).', lastWords: 'Last words', lastWord: (i) => `Last words ${i + 1}`, pitch: 'Voice pitch', hearIt: 'Hear it', surprise: 'Surprise me',
  // paint
  paintIntro: 'Paint voxels directly on the soldier. Your paint is a layer over the parts: swap a helm and the layer stays where it was, so it may need a touch-up.',
  paintOpen: 'Open the Voxel Painter', paintClear: 'Clear all paint', paintCount: (n) => (n ? `${n} painted voxel${n === 1 ? '' : 's'}` : 'unpainted'), paintCap: 'Up to 1,500 painted voxels per part.', paintEdit: 'Paint', paintNone: 'No paint yet. Plain is a style too.',
  // bottom bar
  name: 'Name', nameTip: 'The soldier\'s name (1-40 characters).', dice: 'Random funny name', cost: (n) => `${n} drachmae`, randomise: 'Randomise', mutate: 'Mutate', resetAll: 'Reset', save: 'Save to roster', useInBattle: 'Use in battle', share: 'Share',
  randomiseTip: 'A whole new soldier. Name and quotes stay.', mutateTip: 'Change two to four things.', resetTip: 'Back to the starting soldier. Name and quotes stay.',
  // checks
  checksOk: 'All checks passed.', checks: 'Checks', fix: 'Fix',
  // library
  libraryTitle: 'My Soldiers', libraryCount: (n) => `${n} of 24`, libraryEmpty: 'No soldiers yet. Save one and he will wait here, politely.', libraryFull: 'The roster is full (24 soldiers). Delete one first, or save over an existing soldier.',
  edit: 'Edit', duplicate: 'Duplicate', rename: 'Rename', del: 'Delete', shareOne: 'Share', use: 'Use in battle', newSoldier: 'New soldier',
  deleteAsk: (n) => ({ title: `Delete ${n}?`, text: `${n} will be gone for good. He will not even get last words.`, yes: 'Delete', no: 'Keep him' }),
  discardAsk: { title: 'Leave without saving?', text: 'This soldier has changes you have not saved. They stay as a draft, so you can pick them up again later.', yes: 'Leave', no: 'Keep editing' },
  newAsk: { title: 'Start a new soldier?', text: 'The soldier on the bench has unsaved changes. They stay as a draft until you save a new one over it.', yes: 'New soldier', no: 'Cancel' },
  draftAsk: { title: 'Unfinished business', text: 'There is an unsaved soldier from earlier. Pick him up where you left him?', yes: 'Resume', no: 'Start fresh' },
  renameTitle: 'Rename soldier', renameOk: 'Rename',
  saved: (n) => `Saved ${n} to your roster.`, savedAs: (n) => `Saved ${n} as a new soldier.`, deleted: (n) => `${n} deleted.`, duplicated: (n) => `Duplicated: ${n}.`,
  saveBlocked: 'Fix these first', saveBlockedSub: 'The soldier cannot be saved yet:', dropped: (list) => `${list} no longer fit the new weapon, so they were dropped.`,
  // share
  shareTitle: 'Share this soldier', shareLen: (n, cls) => `${n.toLocaleString('en-US')} characters (size ${cls})`, shareTooLong: (n) => `Too long: ${n.toLocaleString('en-US')} > 38,000 characters. Download the file instead.`, copy: 'Copy code', download: 'Download file', select: 'Select all',
  copied: 'Code copied.', downloaded: (f) => `Saved ${f}.`, downloadFallback: 'Downloads are not available here, so the code is shown to copy. Paste it into a text file ending in .vwsoldier to keep it.',
  importTitle: 'Import a soldier', importNote: 'Paste a VW1.soldier code, or pick a .vwsoldier file.', importOk: 'Import', importFile: 'Pick a file', importPreview: 'Preview', importAccept: 'Add to roster', importPaste: 'Paste the code here',
  imported: (n) => `Imported ${n}.`, importWarn: (n) => `${n} note${n === 1 ? '' : 's'} about this soldier:`,
  // help
  helpTitle: 'Shortcuts', helpRows: [['Ctrl/Cmd + Z', 'Undo'], ['Ctrl/Cmd + Shift + Z or Ctrl + Y', 'Redo'], ['Ctrl/Cmd + S', 'Save to roster'], ['R', 'Randomise'], ['M', 'Mutate'], ['[ and ]', 'Previous and next part category'], ['1 - 5', 'Right-hand tabs'], ['Space', 'Pause or resume auto-turn'], ['Arrow keys (on the 3D view)', 'Turn the soldier'], ['+ and -', 'Zoom'], ['?', 'This list'], ['Esc', 'Back']],
  // battle
  battleToast: 'Squad of 8 on the field. Press FIGHT when ready.', battleFail: 'The battlefield could not be set up. The soldier is saved; try Quick Battle.', saveFirst: 'Saved first, so the army can find him.',
  phone: 'The Workshop needs a bigger screen.',
};

export const PT = {
  title: 'Voxel Painter', sub: 'One part at a time. One voxel at a time.', back: 'Done',
  parts: 'Part', view3d: '3D view', viewSlice: 'Slice view', tools: 'Tools', palette: 'Colour', mini: 'Soldier preview',
  tool: { pencil: 'Pencil', eraser: 'Eraser', paint: 'Recolour', fill: 'Fill', line: 'Line', box: 'Box', picker: 'Eyedropper', select: 'Select', tint: 'Team tint brush', glow: 'Glow brush' },
  toolTip: {
    pencil: 'Add voxels. Click a face in 3D, or a cell in the slice view.', eraser: 'Remove voxels.', paint: 'Recolour voxels that are already there. Never adds.', fill: 'Flood-fill a connected area with the colour.',
    line: 'Drag from one cell to another.', box: 'Drag a box. Hollow keeps only the shell.', picker: 'Pick a colour from the model (Alt-click works with any tool).', select: 'Drag a box, then move, flip or rotate what is inside.',
    tint: 'Mark voxels as team-tinted: the team colour multiplies their colour. Shift-click removes the mark.', glow: 'Mark voxels as glowing. Shift-click removes the mark.',
  },
  boxHollow: 'Hollow', fillMode: { '3d': 'Connected (3D)', layer: 'This layer' }, brush: 'Brush size', mirror: 'Mirror', mirrorAxis: { x: 'X', y: 'Y', z: 'Z' }, material: { normal: 'Normal', team: 'Team tint', glow: 'Glow' },
  undo: 'Undo', redo: 'Redo', clear: 'Clear part', reset: 'Reset to generated', copyOpp: 'Copy to the other side', rotate: 'Rotate', flipX: 'Flip', del: 'Delete',
  capLabel: (n, cap) => `${n.toLocaleString('en-US')} / ${cap.toLocaleString('en-US')} painted`, capOver: (would, cap) => `That would change ${would.toLocaleString('en-US')} voxels; the limit is ${cap.toLocaleString('en-US')} per part.`, capNote: 'Painted voxels are the cells that differ from the generated part.',
  clearFail: 'That part has more voxels than the paint limit allows you to erase. Erase it in pieces.', emptySeed: 'Fill needs a voxel to start from. Use the box tool to paint empty space.',
  axis: 'Slice along', layer: 'Layer', onion: 'Onion skin', grid: 'Grid', hover: (x, y, z) => `x ${x}  y ${y}  z ${z}`,
  recent: 'Recent', swatches: 'Swatches', hex: 'Hex', hsv: 'Pick a colour', exportPalette: 'Export palette', importPalette: 'Import palette', paletteCode: 'Palette code', paletteNote: 'A palette code is one line of text: share it, paste it back in.',
  importPaint: 'Import paint from a soldier code', importPaintNote: 'Paste a VW1.soldier code. The paint of this part is copied over.', importPaintNone: 'That soldier has no paint on this part.', exportSoldier: 'Share soldier',
  discard: { title: 'Leave the painter?', text: 'Your paint is saved to the soldier draft either way.', yes: 'Leave', no: 'Keep painting' },
  helpTitle: 'Painter shortcuts', helpRows: [['P / E / G / L / B / I', 'Pencil, eraser, fill, line, box, eyedropper'], ['C / S / T / H', 'Recolour, select, team tint brush, glow brush'], ['X / Y / Z', 'Toggle mirror axes'], ['[ and ]', 'Brush size'], ['Ctrl/Cmd + Z, Shift + Z', 'Undo, redo'], ['Alt + click', 'Eyedropper'], ['Shift + click', 'Remove a tint or glow mark'], ['Arrow keys', 'Move the selection (Shift = 5 voxels)'], ['Delete', 'Delete the selection'], ['Page Up / Page Down', 'Slice layer'], ['?', 'This list']],
  savedToast: 'Paint saved to the soldier.', phone: 'The painter needs a bigger screen.',
};
