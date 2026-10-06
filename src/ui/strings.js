// UI copy for the menu-side screens (owner UI-A). Single object `T` so the HUMOR pass can swap/extend it:
//   ctx.content.humor.ui (or .settingsJokes) is deep-merged over these defaults by getT(ctx).
// Rules: clarity first, one joke per control at most, specific beats generic, no stereotypes (spec/humor.md).
// HUMOR owns the wording of settings/quality/rules/empty states/errors (src/content/era_ancient/humor/ui_text.js): overlayHumor() below
// copies it over these defaults at load, so the strings in this file are the fallback when a key is missing there.
import * as H from '../content/era_ancient/humor/ui_text.js';
import { STUDIO_CREDITS, CREDITS_FOOTER } from '../content/era_ancient/humor/credits_text.js';

export const T = {
  common: {
    back: 'Back', close: 'Close', ok: 'OK', cancel: 'Cancel', save: 'Save', load: 'Load', delete: 'Delete', reset: 'Reset', copy: 'Copy', copied: 'Copied to clipboard.',
    apply: 'Apply', none: 'None', all: 'All', on: 'On', off: 'Off', yes: 'Yes', no: 'No', search: 'Search', clear: 'Clear', refresh: 'Refresh', done: 'Done', next: 'Next', skip: 'Skip',
    mute: 'Mute sound', unmute: 'Unmute sound', drachmae: 'drachmae', units: 'units', locked: 'Locked', unlocked: 'Unlocked', gotIt: 'Got it',
  },

  splash: {
    prompt: 'PRESS ANY KEY TO ENTER THE ARENA', promptTouch: 'TAP TO ENTER THE ARENA',
    tag: 'A voxel battle simulator of questionable historical accuracy',
    sound: 'Sound plays after this click. Zeus apologises in advance.',
    hint: 'Browser rules: audio needs a click first.',
  },

  title: {
    heading: 'Main menu',
    groups: { play: 'Play', create: 'Create', explore: 'Explore' },
    quick: { name: 'Quick Battle', sub: 'Pick an arena and let the soldiers argue it out.' },
    campaign: { name: 'Campaign', sub: 'Nine battles. Zero historical accuracy.' },
    survival: { name: 'Survival', sub: 'Waves keep coming. So do the excuses.' },
    daily: { name: 'Daily Skirmish', sub: 'Same fight for everyone today. Bragging rights only.' },
    arena: { name: 'Arena Builder', sub: 'Sculpt hills. Plant tiny olive trees.' },
    workshop: { name: 'Soldier Workshop', sub: 'Design a soldier. Name him Sir Chadius.' },
    codex: { name: 'Codex', sub: 'Every unit, prop and arena, with footnotes.' },
    achievements: { name: 'Achievements', sub: 'Medals for questionable decisions.' },
    settings: { name: 'Settings', sub: 'Sliders, switches, the odd joke.' },
    credits: { name: 'Credits', sub: 'The people and licences behind the chaos.' },
    badgeNew: 'New today', badgeStars: (n, of) => `${n}/${of} stars`, badgeBest: (n) => `Best: wave ${n}`,
    diagnostics: 'Diagnostics', version: (v, d) => `v${v} · ${d}`,
    roadmap: 'Roadmap: Medieval Era (coming later)', roadmapNote: 'Roadmap note, not a feature in this build.',
    footerTip: 'Tip',
    editorsPhone: 'Built for bigger screens',
  },

  quick: {
    title: 'Quick Battle', sub: 'Choose where, how, and who. Or press the big gold button and live dangerously.',
    advanced: { simple: 'Simple', advanced: 'Advanced' },
    arena: 'Arena', arenaPrev: 'Previous arena', arenaNext: 'Next arena', arenaGo: (n) => `Arena ${n}`,
    random: { name: 'Random', blurb: 'A surprise battlefield from a seed. Same seed, same field.', seed: 'Seed', reroll: 'Reroll', copy: 'Copy seed' },
    recommended: (n) => `Recommended budget: ${n.toLocaleString('en-US')} drachmae`, recommendedTip: 'Click to use the recommended budget for this arena.', recommendedApplied: (n) => `Budget set to ${n.toLocaleString('en-US')} drachmae.`,
    auto: 'Auto', conditions: 'Conditions', size: 'Size', weather: 'Weather', time: 'Time of day', arenaDefault: 'Arena default',
    sizes: { small: 'Small', medium: 'Medium', large: 'Large' },
    sizeSub: { small: '64 u', medium: '96 u', large: '128 u' },
    weathers: { default: 'Arena default', clear: 'Clear', cloudy: 'Cloudy', rain: 'Rain', storm: 'Storm', snow: 'Snow', sandstorm: 'Sandstorm', fog: 'Fog' },
    weatherTip: { clear: 'Nothing happens. Enjoy it.', cloudy: 'Atmospheric. No rule changes.', rain: 'Fire burns half as long and fire arrows fizzle.', storm: 'Rain, plus lightning for decoration. Zeus may add some on purpose.', snow: 'Everyone moves 10% slower and complains about it.', sandstorm: 'Ranged attacks spread out 50% more.', fog: 'Moody. Cosmetic only.' },
    timeNames: ['Midnight', 'Night', 'Dawn', 'Morning', 'Noon', 'Afternoon', 'Dusk', 'Night'],
    rules: 'Rules', budget: 'Army budget', budgetTip: 'Drachmae each side can spend. Your graphics preset caps the unit count.',
    budgets: { skirmish: 'Skirmish', battle: 'Battle', war: 'War', epic: 'Epic', custom: 'Custom' },
    budgetSub: { skirmish: '~30 units', battle: '~80 units', war: '~200 units', epic: '~400 units', custom: 'Your call' },
    cappedBy: (q, n) => `${q} caps each side at ${n} units.`,
    difficulty: 'Difficulty', difficulties: { easy: 'Peasant Mode', normal: 'Citizen', hard: 'Consul' },
    difficultyTip: { easy: 'The enemy reacts slowly, never flanks and keeps its special abilities to itself.', normal: 'A fair fight against a competent general.', hard: 'Fast reactions, focus fire, kiting and counter-picks. The enemy has read the codex.' },
    friendlyFire: 'Friendly fire', friendlyFireTip: 'Arrows and javelins can hurt allies. Area attacks always do.',
    morale: 'Morale', moraleTip: 'Soldiers can panic and run when the battle goes badly. Turn off for fight-to-the-last.',
    speed: 'Starting speed', speedTip: 'You can change this during the battle.',
    freePlacement: 'Free placement', freePlacementTip: 'Place soldiers anywhere, not just in your starting zone.',
    gore: 'Gore style', gores: { red: 'Classic red', wine: 'Wine', confetti: 'Confetti', off: 'Off' }, goreTip: 'Cartoon either way. Wine is wine.',
    corpses: 'Corpses', corpsesOpts: { stay: 'Stay', fade: 'Fade', none: "Pretend they're napping" },
    formation: 'Starting formation', formations: { block: 'Block', line: 'Line', phalanx: 'Phalanx', wedge: 'Wedge', column: 'Column', skirmish: 'Skirmish', circle: 'Circle', hollow: 'Hollow square' },
    mirror: 'Mirror placement', mirrorTip: 'Whatever you place for your side appears mirrored for the enemy. Great for fair duels.',
    timeLimit: 'Time limit', timeLimits: { 0: 'None', 3: '3 min', 5: '5 min' },
    mood: 'Music mood', moods: { auto: 'Match the arena', menu: 'Menu', battle: 'Battle', comedy: 'Silly' },
    mutators: 'Mutators', mutatorsHint: 'Rule twists. Unlock more with campaign stars.', mutatorLocked: (n) => `Unlocked by earning ${n} campaign stars.`,
    armies: 'Armies', armyA: 'Army A (you)', armyB: 'Army B', faction: 'Faction', mixed: 'Mixed', mixedTip: 'Any faction, any combination.',
    autoFill: 'Auto-fill', autoFillTip: 'Let the generator spend this side’s budget when you reach placement.', style: 'Style',
    styles: { balanced: 'Balanced', rush: 'Rush', ranged: 'Ranged', elite: 'Elite', chaos: 'Chaos', counter: 'Counter-pick' },
    mirrorArmies: 'Mirror A onto B', mirrorArmiesTip: 'Copy army A’s faction and style to army B.', mirrored: 'Army B now copies army A.',
    thumbWait: '(drawing the map)',
    quickFight: 'Quick Fight', quickFightSub: 'Random arena (not the one shown), balanced armies, straight to the fight.',
    place: 'Place armies', placeSub: 'Choose soldiers and positions yourself.',
    starting: 'Marshalling the troops...', failed: 'The arena refused to load. Try another one?',
    copySeed: 'Seed copied.',
  },

  placement: {
    arena: (n) => n, back: 'Back to setup', backTip: 'Back to setup (your placements are kept)', help: 'Hints',
    tools: 'Tools', palette: 'Soldiers', search: 'Search soldiers', searchPh: 'Search soldiers...',
    allRoles: 'All roles', mine: 'My Soldiers', mineEmpty: 'No custom soldiers yet. Build one in the Soldier Workshop and they will show up here.',
    noMatch: 'No soldier matches that. The philosophers are checking.',
    team: 'Placing for', teamA: 'Army A', teamB: 'Army B',
    budget: 'Budget', spent: (a, b) => `${a.toLocaleString('en-US')} / ${b.toLocaleString('en-US')}`, left: (n) => `${n.toLocaleString('en-US')} left`,
    brush: 'Brush', brushes: { single: 'Single', line: 'Line', block: 'Block', scatter: 'Scatter', erase: 'Erase', select: 'Select' },
    brushTip: { single: 'One soldier per click.', line: 'Drag a line of soldiers.', block: 'A formation per click, using the preset below.', scatter: 'Sprinkle soldiers as you paint.', erase: 'Click soldiers to dismiss them.', select: 'Click or drag to select soldiers, then give them an order.' },
    formation: 'Formation', count: 'Squad size', order: 'Squad order', orders: { advance: 'Advance', hold: 'Hold', retreat: 'Retreat', focus: 'Focus' },
    orderTip: { advance: 'March toward the enemy and fight.', hold: 'Stand your ground until the enemy comes close.', retreat: 'Fall back from the fight.', focus: 'Everyone attacks the same target.' },
    mirror: 'Mirror to the other side', undo: 'Undo', redo: 'Redo', clear: 'Clear', clearAsk: { title: 'Clear this army?', text: 'Every soldier on this side will be dismissed. They will not be offended. Probably.', yes: 'Clear army' },
    clearAll: 'Clear both sides',
    presets: 'Army presets', savePreset: 'Save army', loadPreset: 'Load army', presetName: 'Preset name', presetNone: 'No saved armies yet. Place a few soldiers, then press Save army.', presetSaved: (n) => `Saved army "${n}".`, presetLoaded: (n) => `Loaded "${n}".`,
    presetNameEmpty: 'Give the army a name, even a silly one.', presetNothing: 'Place at least one soldier on this side first.', presetEmpty: 'That army has nothing this build can place.', presetOver: 'Over budget',
    presetOverBudget: (cost, cap) => `That army costs ${cost} drachmae, but this battle allows ${cap} per side. Raise the budget or save a smaller army.`,
    presetSkipped: (n) => `${n} unit${n === 1 ? ' was' : 's were'} skipped because ${n === 1 ? 'it is' : 'they are'} not available any more.`,
    presetSaveFail: 'The army could not be saved. Check the Data tab in Settings.', presetDropped: (name, cap) => `You can keep ${cap} saved armies, so the oldest one ("${name}") was removed.`,
    exportCopied: 'Army code copied. Anyone can paste it into Import army code.', importBad: 'That code was not understood. Copy the whole code, from the first VW1 to the last character.',
    presetExport: 'Export army code', presetImport: 'Import army code', importOk: 'Army imported.',
    autoFill: 'Auto-fill', autoFillEnemy: 'Auto-fill enemy', autoFillMine: 'Auto-fill mine', autoFillTip: 'Spend the remaining budget with the chosen style.',
    scout: 'Scout report', scoutEmpty: 'Place some soldiers and the scouts will tell you what they think.', scoutFew: 'Place a few more soldiers (three or more) and the scouts will report.', scoutMinUnits: 3,
    zoneHint: (team) => `Place soldiers inside the glowing ${team ? 'red' : 'blue'} zone`, scoutBad: 'Weak spot', scoutGood: 'Strong point', scoutTip: 'Tip',
    soldiersLabel: 'Soldiers', typesLabel: 'Unit types', count_: (n, cap) => `${n} / ${cap}`, types: (n, cap) => `${n} / ${cap}`,
    typesFull: 'A battle can field 16 different unit types. Remove one type to add another.', capFull: (cap) => `This team is at its unit cap (${cap}) for your graphics preset.`,
    cantAfford: 'Not enough budget left for this one.',
    fight: 'FIGHT', fightTip: 'Start the battle (Space, then Enter)', fightEmpty: 'Place at least one soldier on each side first.',
    hints: {
      title: 'Quick tour', step: (i, n) => `Step ${i} of ${n}`,
      list: [
        { t: 'Pick a soldier', d: 'Choose a unit from the list on the left. Hover a card to see it turn around.', p: 'Tap Soldiers below and choose a unit.' },
        { t: 'Click the battlefield', d: 'Place soldiers inside the glowing blue zone: click there to drop a squad. Drag with the right mouse button to orbit the camera.', p: 'Tap inside the glowing blue zone to place a squad. Drag with one finger to orbit.' },
        { t: 'Press FIGHT', d: 'When both sides have soldiers, press FIGHT. Space focuses the button; Enter confirms.', p: 'When both sides have soldiers, tap FIGHT.' },
      ],
      never: 'Do not show this again', dismiss: 'Dismiss',
    },
    invalid: 'Cannot place here',
    puzzle: { label: 'Puzzle', goal: 'Goal', hintLabel: 'Hint', par: (n) => `Par ${n}`, parHint: 'Spend this much or less to earn the par star.', reset: 'Reset', resetDone: 'Placement reset. Retries are free.' },
  },

  settings: {
    title: 'Settings', sub: 'Changes apply immediately and are saved on this device.',
    tabs: { graphics: 'Graphics', gameplay: 'Gameplay', audio: 'Audio', access: 'Accessibility', controls: 'Controls', data: 'Data', about: 'About' },
    graphics: {
      quality: 'Quality preset', qualityTip: 'Sets resolution, shadows, bloom, debris and the unit cap in one go.',
      presets: { potato: 'Potato', papyrus: 'Papyrus', marble: 'Marble', olympian: 'Olympian' },
      presetSub: { potato: 'Runs on a toaster', papyrus: 'Gentle scroll', marble: 'The sensible one', olympian: 'For gods with GPUs' },
      caps: (c) => `Per team: up to ${c.units} units and ${c.debris.toLocaleString('en-US')} debris cubes.`,
      autoScale: 'Auto-scale resolution', autoScaleHint: 'Quietly lowers resolution when the frame rate dips, then raises it again.',
      resScale: 'Resolution scale', resScaleHint: 'Lower is faster. Auto-scale moves this for you when it is on.',
      shadows: 'Shadows', shadowsHint: 'Soft sun shadows on soldiers and terrain.', bloom: 'Bloom', bloomHint: 'The glow on fire, lightning and gold.', clouds: 'Clouds', cloudsHint: 'Drifting cloud shadows and cloud islands.',
      fps: 'FPS counter', fpsHint: 'Shows frames per second in a corner. Honest and unflattering.',
    },
    gameplay: {
      gore: 'Gore style', goreHint: 'Cartoon either way.', corpses: 'Corpses', corpsesHint: 'What happens to fallen soldiers.',
      camSens: 'Camera sensitivity', camSensHint: 'Orbit, pan and zoom speed.', edgeScroll: 'Edge scrolling', edgeScrollHint: 'Move the mouse to a screen edge to pan the camera.',
      autoPause: 'Pause when the tab loses focus', autoPauseHint: 'So a phone call never costs you a battle.',
      cinematics: 'Cinematics', cinematicsNote: 'Camera staging around the fight. Reduce Motion (Accessibility) always switches these to calm, static versions.',
      choreoIntro: 'Battle intro', choreoIntroHint: 'A stand-off before the fight: an establishing shot of both lines, waving banners and Brutus clearing his throat. Space or a tap skips it.',
      choreoFinish: 'Victory staging', choreoFinishHint: 'Winners cheer, losers rout or sit down, and the last kill plays in slow motion.',
      choreoOrbit: 'Results camera orbit', choreoOrbitHint: 'A slow orbit around the field behind the results panel.',
      cinematicStart: 'Start battles in the Cinematic camera', cinematicStartHint: 'Begin each fight in the roaming cinematic view instead of the usual orbit. Press C to switch any time.',
    },
    audio: {
      master: 'Master', music: 'Music', sfx: 'Effects', ui: 'Interface', announcer: 'Announcer', test: 'Test', playing: 'Playing...',
      muted: 'Mute everything', mutedHint: 'Silence, but with feelings.',
      tts: 'Announcer voice (experimental)', ttsHint: 'Reads the big announcer lines aloud with your browser’s voice. Off by default; ducking the music is approximate.',
      subtitles: 'Announcer subtitles', subtitlesHint: 'Text for every announcer line. Recommended.',
    },
    access: {
      reduce: 'Reduce motion', reduceHint: 'No springs, wobbles, camera shake or drifting clouds.',
      shake: 'Screen shake', shakeHint: 'How much the camera shudders on big hits.', flash: 'Flash limiter', flashHint: 'Caps lightning and bloom flashes.',
      uiScale: 'UI size', uiScaleHint: 'Scales all menus and HUD text.',
      palette: 'Team colours', palettes: { classic: 'Classic', cvd: 'Colour-blind safe', contrast: 'High contrast' }, paletteHint: 'Blue vs red, or something kinder to every eye.',
      contrast: 'High-contrast menus', contrastHint: 'Darker panels, brighter outlines, no dim text.',
      preview: 'Team colour preview',
    },
    controls: {
      title: 'Key bindings', hint: 'Click a key to rebind it, then press the new key. Esc cancels. Conflicts are caught for you.',
      rebind: 'Rebind', listening: 'Press a key...', reset: 'Default', resetAll: 'Reset all to defaults', resetAllAsk: { title: 'Reset all key bindings?', text: 'Every rebindable key goes back to its default.', yes: 'Reset keys' },
      conflict: (key, other) => `${key} is already used by "${other}".`, swap: 'Swap them', pickAnother: 'Pick another',
      reserved: (key) => `${key} is reserved and cannot be bound.`, saved: (a, k) => `${a} is now ${k}.`, fixed: 'Fixed',
      mouse: 'Mouse and touch', mouseList: [
        ['Left button', 'Select, place, paint, attack in Take Command'], ['Right drag', 'Orbit the camera'], ['Middle drag', 'Pan'], ['Wheel', 'Zoom'], ['Double-click', 'Focus a unit'],
        ['One-finger drag', 'Orbit (touch)'], ['Two fingers', 'Pan and pinch zoom (touch)'], ['Tap', 'Select or place (touch)'], ['Long-press', 'Unit info (touch)'],
      ],
    },
    data: {
      storage: 'Storage', storageFullChip: 'Storage full', storageMemoryChip: 'Not saving', retrySave: 'Try saving again', retryOk: 'Everything is saved now.', retryStill: 'Still no room. Free some space and try again.', storageOk: 'Saving to this device', storageMemory: 'Not saving: this browser blocks storage, so progress will be forgotten when you close the tab.', storageFull: 'Storage is full: new saves may fail. Export your data, then delete something.',
      storageHint: 'Saves live in this browser only. Use Export to carry them elsewhere.',
      export: 'Export everything', exportHint: 'One file with settings, progress, arenas, soldiers and armies.', exportBtn: 'Export all', exported: 'Export ready.',
      exportText: { title: 'Your save data', note: 'Your browser cannot download files here. Copy this text and keep it somewhere safe.' },
      import: 'Import everything', importHint: 'Replaces matching items from an export file or pasted text.', importBtn: 'Import file', importPaste: 'Paste text', importPasteTitle: 'Paste save data', importPasteNote: 'Paste the text from a previous export.', importOk: 'Import finished.', importFail: (m) => `Import failed: ${m}`, exportFail: (m) => `Export failed: ${m}`, resetFail: (m) => `Reset failed: ${m}`,
      reset: 'Reset progress', resetHint: 'Campaign stars, achievements, lifetime stats and unlocks. Arenas, soldiers and armies stay.', resetBtn: 'Reset progress...',
      resetAsk: { title: 'Reset all progress?', text: 'Campaign stars, achievements, stats and unlocks will be wiped. Your arenas, soldiers and armies stay. This cannot be undone.', yes: 'Wipe progress' }, resetDone: 'Progress reset. A clean slate. A little sad.',
      hints: 'Show tutorial hints again', hintsHint: 'Brings back the first-time tips.', hintsBtn: 'Reset hints', hintsDone: 'Hints will show again.',
      beacon: 'Anonymous diagnostics', beaconHint: 'Optional and off by default. Nothing leaves your device while this is off.',
    },
    about: {
      title: 'About VOXELWARS', line: 'A voxel battle simulator of questionable historical accuracy.',
      version: 'Version', build: 'Build', studio: 'Studio',
      honest: 'What is real', honestList: [
        'A few soldier poses (idle, ready stance, shield block, getting hit, getting up, sitting) are real CC0 motion capture retargeted onto the voxel rig. Walking, running, every attack, deaths, riders and all the beasts and siege engines are hand-authored animation.',
        'Sound effects and music come from real recordings with licences listed in Credits. When a sound cannot load, a synthesised stand-in plays and Diagnostics says so.',
        'Battles are deterministic: same setup and seed, same fight. Share codes carry the seed.',
      ],
      diag: 'Open Diagnostics', credits: 'Open Credits',
    },
    open: { diagnostics: 'Diagnostics', credits: 'Credits', stats: 'Lifetime stats' },
  },

  credits: {
    title: 'Credits', sub: 'Everyone whose work is inside the game, and the licences that let us.',
    sections: { studio: 'The Studio', libs: 'Libraries and fonts', anim: 'Animation', audio: 'Sound and music', ledger: 'Asset ledger' },
    studioIntro: 'VOXELWARS is made by an entirely serious studio. These are the departments.',
    studio: [
      ['Executive Producer of Snacks', 'The Goat'], ['Director of Chicken Morale', 'Sacred Chicken #4'], ['Chief Phalanx Officer', 'Hoplite, third from left'], ['Head of Shield Alignment', 'Legionary (union rep)'],
      ['Minister of Dramatic Pauses', 'Plato the Dry'], ['Volume Control, Announcer Division', 'Brutus Maximus (always at 11)'], ['Foresight and Warnings', 'Cassandra (ignored)'], ['Lightning Procurement', 'Zeus (on leave)'],
      ['Quality Assurance, Elephants', 'Nobody volunteered'], ['Legal Review', 'A laminated copy of the Terms of Conquest'],
    ],
    libsList: [
      { name: 'three.js r128', lic: 'MIT licence', url: 'https://threejs.org', note: 'Rendering engine, loaded from a CDN (cdnjs, with jsDelivr and unpkg as backups).' },
      { name: 'Bungee', lic: 'SIL Open Font Licence 1.1', url: 'https://fonts.google.com/specimen/Bungee', note: 'Display lettering, served by Google Fonts.' },
      { name: 'Rubik', lic: 'SIL Open Font Licence 1.1', url: 'https://fonts.google.com/specimen/Rubik', note: 'Body text, served by Google Fonts.' },
      { name: 'Cinzel', lic: 'SIL Open Font Licence 1.1', url: 'https://fonts.google.com/specimen/Cinzel', note: 'Epigraphs and flavour text, served by Google Fonts.' },
    ],
    animText: 'Only a handful of clips are borrowed: idle, ready stance, shield block, a front hit, getting up and sitting (plus a few extras) are CC0 motion capture from the Quaternius Universal Animation Library. Everything else, from walking and every attack to deaths, horses and chickens, is animated by hand for this game.',
    animLinks: [{ name: 'Quaternius Universal Animation Library', lic: 'CC0', url: 'https://quaternius.com' }],
    noLedger: 'The asset ledger was not included in this build, so the audio credits are empty. They are generated from the ledger at build time.',
    open: 'Opens in a new tab', licence: 'Licence', author: 'Author',
  },

  diag: {
    title: 'Diagnostics', sub: 'What this device and browser are telling the game. Handy for bug reports.',
    copy: 'Copy report', copied: 'Report copied.', refresh: 'Refresh', live: 'Live', liveHint: 'Update once a second',
    sections: { overview: 'Overview', webgl: 'Graphics', perf: 'Performance', audio: 'Audio', storage: 'Storage', csp: 'Blocked by security policy', errors: 'Errors', log: 'Recent log', build: 'Build files', other: 'Other' },
    errorsNone: 'No errors recorded.', assetsList: (n) => `Per-asset load path (${n})`,
    none: 'Nothing to report.', cspNone: 'No security-policy violations. The sandbox is content.',
    empty: 'This build did not provide diagnostics.',
    key: { webgl2: 'WebGL 2', renderer: 'Renderer', vendor: 'Vendor', version: 'Version', tier: 'Quality tier', fps: 'FPS', ms: 'Frame ms', drawCalls: 'Draw calls', triangles: 'Triangles', units: 'Units', heapMB: 'JS heap', state: 'State', ctxState: 'Context', codecs: 'Codecs', status: 'Status', bytes: 'Bytes used', keys: 'Keys',
      build: 'Version', buildDate: 'Build date', timeToTitleMs: 'Time to title screen', quality: 'Quality tier', autoScale: 'Auto-scale factor', pixelRatio: 'Pixel ratio', maxTex: 'Max texture size', floatRT: 'Float render targets', ua: 'Browser', dpr: 'Device pixel ratio', screen: 'Screen',
      frameP50: 'Frame time (median)', frameP95: 'Frame time (95th pct)', cpuMs: 'CPU per frame', geometries: 'Geometries', textures: 'Textures', programs: 'Shader programs', projectiles: 'Projectiles', fxLive: 'Live effects', tick: 'Sim tick',
      available: 'Available', unlocked: 'Unlocked by a click', muted: 'Muted', sampleRate: 'Sample rate', voices: 'Voices', voiceDrops: 'Dropped voices', loaded: 'Sounds loaded', assetPaths: 'Where sounds came from', embedded: 'Embedded', fetched: 'Fetched', synth: 'Synthesised stand-in', failed: 'Failed', pending: 'Pending',
      mp3: 'MP3', manifest: 'Manifest', manifestSfx: 'Sound effects listed', manifestMusic: 'Music tracks listed', coreAudio: 'Embedded core sounds', notPublished: 'Not published', core: 'Core sounds', sfx: 'Sound effects', music: 'Music tracks', tts: 'Speech', supported: 'Supported', enabled: 'Enabled', spoken: 'Lines spoken' },
    ok: 'OK', bad: 'Problem',
  },

  codex: {
    title: 'Codex', sub: 'Everything the army knows about itself.',
    tabs: { units: 'Units', props: 'Props', arenas: 'Arenas' },
    pick: 'Pick a unit to see it turn around.', clip: 'Animation', clips: { idle: 'Idle', walk: 'Walk', attack: 'Attack', block: 'Block', death: 'Death', cast: 'Cast' },
    stats: 'Stats', abilities: 'Abilities', noAbilities: 'No special abilities. Just vibes and a sharp object.', lore: 'Lore', joke: 'Footnote', counters: 'Matchups', beats: 'Does well against', weak: 'Struggles against', none: 'Nobody in particular.',
    unlockedAt: 'Unlock', locked: 'Locked entry', lockedText: 'Meet this unit in the campaign to fill in its page.',
    drag: 'Drag to rotate', cost: 'Cost', role: 'Role', faction: 'Faction', tags: 'Traits',
    searchUnits: 'Search units', propsEmpty: 'No props in this build.', arenasEmpty: 'No arenas in this build.',
    prop: { hp: 'Durability', radius: 'Footprint', cover: 'Blocks arrows', blocks: 'Blocks movement', flam: 'Flammable', indestructible: 'Indestructible', yes: 'Yes', no: 'No' },
    arena: { fight: 'Fight here', tactics: 'Tactics', size: 'Sizes', budget: 'Recommended budget' },
  },

  ach: {
    title: 'Achievements', sub: 'Proof of tactical brilliance, or at least persistence.', all: 'All', unlocked: 'Unlocked', locked: 'Locked', of: (a, b) => `${a} of ${b} unlocked`,
    progress: (a, b) => `${a.toLocaleString('en-US')} / ${b.toLocaleString('en-US')}`, when: (d) => `Unlocked ${d}`, empty: 'No achievements match this filter yet.', statsLink: 'Lifetime stats',
    hiddenName: 'Locked achievement',
    allDoneTitle: 'Every medal earned', allDone: 'Nothing left to unlock. The goat is impressed. The goat is not easily impressed.',
  },

  stats: {
    title: 'Lifetime stats', sub: 'Everything the game has been quietly counting.', serious: 'The serious numbers', absurd: 'The absurd numbers', fame: 'Hall of fame', topUnits: 'Most kills by soldier type', topArenas: 'Favourite arenas', kills: 'kills', battlesN: (n) => `${n} ${n === 1 ? 'battle' : 'battles'}`, empty: 'No battles fought yet. The statisticians are bored.',
    labels: {
      battles: 'Battles fought', wins: 'Victories', losses: 'Defeats', draws: 'Draws', kills: 'Soldiers defeated', deaths: 'Soldiers lost', damage: 'Damage dealt', playSeconds: 'Time in battle',
      shieldBlocks: 'Shield blocks', kicks: 'Spartan kicks', chickenKills: 'Chicken kills', goatsSaved: 'Goats saved', elephantTramples: 'Elephant tramples', godPowers: 'God powers cast', zeusRageQuits: 'Times Zeus left the chat',
      arenasSaved: 'Arenas saved', soldiersSaved: 'Soldiers saved', arenasPlayed: 'Arenas visited', drachmaeSpent: 'Drachmae spent', boulders: 'Boulders thrown', arrows: 'Arrows fired', unitsPlaced: 'Soldiers placed',
      commandKills: 'Kills in Take Command', campaignStars: 'Campaign stars', bestWave: 'Best survival wave', dailyStreak: 'Daily streak',
      friendlyKills: 'Allies defeated by mistake', goatKills: 'Goat kills', trampleKills: 'Trampling kills', cyclopsMisses: 'Cyclops misses', chickenDefeats: 'Losses to chickens', chickenTantrums: 'Chicken tantrums', monologues: 'Philosopher monologues',
      sleeps: 'Senators put to sleep', bribes: 'Soldiers bribed', trojanReveals: 'Trojan Horse reveals', catapultMisfires: 'Crew members launched', immortalsRevived: 'Immortals revived', immortalsKilledAfterRevive: 'Immortals defeated twice',
      thronesSat: 'Thrones sat on', zeusInterventions: 'Zeus interventions', stoned: 'Soldiers turned to stone', heroKills: 'Heroes defeated', heroLosses: 'Heroes lost', maxStreak: 'Best kill streak',
    },
    absurdTitles: { cubes: 'Voxels scattered', laps: 'Marathons (sort of) run', spears: 'Spears in circulation', napTime: 'Hours spent in formation' },
  },

  fatal: {
    title: 'The arena has collapsed', copyDiag: 'Copy diagnostics', copied: 'Diagnostics copied.', retry: 'Reload', safe: 'Try safe mode', safeHint: 'Safe mode loads the Potato preset with shadows, bloom and clouds off.',
    reportHint: 'If you report this, include the text below.', whatNow: 'What you can try',
    webgl2: { cause: 'WebGL 2 is not available', steps: ['Turn on hardware acceleration in your browser settings, then reload.', 'Update your browser. VOXELWARS needs WebGL 2 (any recent Chrome, Edge, Firefox or Safari).', 'Try another browser, or another device. Safe mode cannot work without WebGL 2.'] },
    cdn: { cause: 'A required library failed to load', steps: ['Check your connection and reload.', 'Disable content blockers for this page, then reload.', 'The loader already tried three different servers.'] },
    unknown: { cause: 'Something went badly wrong', steps: ['Reload the page.', 'Try safe mode, which loads the lightest settings.', 'Copy the diagnostics below if you want to report the bug.'] },
  },

  phone: {
    title: 'Built for bigger screens', text: 'The editors need a tablet or desktop with room for brushes, sliders and more fingers than a phone has. Quick Battle, Campaign, Survival and the Codex all work here.',
    yours: 'Your creations', yoursHint: 'Made on a bigger screen. You can look but not touch.', arenas: 'Arenas', soldiers: 'Soldiers', emptyArenas: 'No saved arenas yet.', emptySoldiers: 'No saved soldiers yet.',
    back: 'Back to menu', play: 'Play a Quick Battle instead',
  },
};

/* ---------------------------------------------------------------- HUMOR overlay (ui_text.js) */
function overlayHumor(T, H) {
  const str = (v) => (typeof v === 'string' && v.length ? v : undefined);
  const put = (o, k, v) => { if (o && str(v)) o[k] = v; };
  const each = (src, fn) => { if (src && typeof src === 'object') for (const k of Object.keys(src)) { try { fn(k, src[k]); } catch (e) { /* a malformed entry never breaks the UI */ } } };
  const S = T.settings, Q = T.quick, P = T.placement;

  // quality / gore / corpses / difficulty / budgets: label + what it really does
  S.graphics.presetTip = {};
  each(H.QUALITY, (id, v) => { put(S.graphics.presets, id, v.name); S.graphics.presetTip[id] = str(v.tip) || ''; });
  Q.goreTips = {}; each(H.GORE, (id, v) => { put(Q.gores, id, v.label); Q.goreTips[id] = str(v.tip) || ''; });
  Q.corpseTips = {}; each(H.CORPSES, (id, v) => { put(Q.corpsesOpts, id, v.label); Q.corpseTips[id] = str(v.tip) || ''; });
  each(H.DIFFICULTY, (id, v) => { put(Q.difficulties, id, v.label); put(Q.difficultyTip, id, v.tip); });
  Q.budgetLine = {}; each(H.BUDGET_PRESETS, (id, v) => { put(Q.budgets, id, v.label); Q.budgetLine[id] = str(v.line) || ''; });
  if (H.SPEED_LABELS) Q.speedNames = Object.assign({}, H.SPEED_LABELS);

  // settings tooltips (SETTINGS_TIPS keys are the setting ids)
  const st = H.SETTINGS_TIPS || {};
  put(S.graphics, 'autoScaleHint', st.autoScale); put(S.graphics, 'resScaleHint', st.resScale); put(S.graphics, 'shadowsHint', st.shadows); put(S.graphics, 'bloomHint', st.bloom);
  put(S.graphics, 'cloudsHint', st.clouds); put(S.graphics, 'fpsHint', st.fpsCounter);
  put(S.gameplay, 'goreHint', st.gore); put(S.gameplay, 'corpsesHint', st.corpses); put(S.gameplay, 'camSensHint', st.camSens); put(S.gameplay, 'edgeScrollHint', st.edgeScroll); put(S.gameplay, 'autoPauseHint', st.autoPauseBlur);
  put(S.audio, 'mutedHint', st.muted); put(S.audio, 'ttsHint', st.tts); put(S.audio, 'subtitlesHint', st.subtitles);
  put(S.access, 'reduceHint', st.reduceMotion); put(S.access, 'shakeHint', st.shake); put(S.access, 'flashHint', st.flashLimiter); put(S.access, 'uiScaleHint', st.uiScale); put(S.access, 'paletteHint', st.palette); put(S.access, 'contrastHint', st.highContrastUI);

  // rule tooltips on Quick Battle
  const rt = H.RULES_TIPS || {};
  put(Q, 'friendlyFireTip', rt.friendlyFire); put(Q, 'moraleTip', rt.morale); put(Q, 'freePlacementTip', rt.freePlacement); put(Q, 'mirrorTip', rt.mirror);
  put(Q, 'budgetTip', rt.budget); put(Q, 'mutatorsHint', rt.mutators);
  Q.timeLimitTip = str(rt.timeLimit) || ''; Q.weatherInfo = str(rt.weather) || ''; Q.formationTip = str(rt.formation) || '';

  // menus and buttons
  put(T.splash, 'prompt', H.SPLASH); put(T.title, 'roadmap', H.ROADMAP_TAG);
  const tm = H.TITLE_MENU || {};
  for (const [src, dst] of [['quick', 'quick'], ['campaign', 'campaign'], ['survival', 'survival'], ['builder', 'arena'], ['workshop', 'workshop'], ['codex', 'codex'], ['achievements', 'achievements']]) {
    if (tm[src] && T.title[dst]) { put(T.title[dst], 'name', tm[src].label); put(T.title[dst], 'sub', tm[src].sub); }
  }
  const bt = H.BUTTONS || {};
  put(Q, 'quickFight', bt.quickFight); put(Q, 'place', bt.placeArmies); put(P, 'fight', bt.fight); put(P, 'savePreset', bt.saveArmy); put(P, 'loadPreset', bt.loadArmy);
  put(T.common, 'ok', bt.ok); put(T.common, 'cancel', bt.cancel); put(T.common, 'back', bt.back); put(T.common, 'copy', bt.copy);
  put(S.about, 'line', (H.ABOUT || {}).tagline); S.about.disclaimer = str((H.ABOUT || {}).disclaimer) || '';
  const md = H.MODALS || {};
  if (md.deleteItem) T.common.deleteAsk = { title: md.deleteItem.title, text: md.deleteItem.body, yes: md.deleteItem.yes, no: md.deleteItem.no };
  if (md.overwrite) T.common.overwriteAsk = { title: md.overwrite.title, text: md.overwrite.body, yes: md.overwrite.yes, no: md.overwrite.no };
  // NOTE: MODALS.resetProgress claims saved armies are erased; Reset progress only wipes progress (docs.progress.reset), so S.data.resetAsk keeps its own accurate copy.

  // empty states
  const es = H.EMPTY_STATES || {};
  if (es.armies) { put(P, 'presetNone', es.armies.body); P.presetNoneTitle = str(es.armies.title) || P.loadPreset; }
  if (es.soldiers) put(P, 'mineEmpty', es.soldiers.body);
  if (es.achievements) { put(T.ach, 'empty', es.achievements.body); T.ach.emptyTitle = str(es.achievements.title) || T.ach.title; }
  if (es.stats) { put(T.stats, 'empty', es.stats.body); T.stats.emptyTitle = str(es.stats.title) || T.stats.title; }
  if (es.codexSearch) { T.codex.noResults = es.codexSearch.body; T.codex.noResultsTitle = es.codexSearch.title; }

  // errors: plain words first; the joke (if any) is shown at most once per screen by the screen that owns it
  const er = H.ERRORS || {};
  const fatalMap = { webgl2: 'webgl2', cdn: 'scriptBlocked', unknown: 'crash' };
  for (const k of Object.keys(fatalMap)) { const e = er[fatalMap[k]]; if (e && T.fatal[k]) { put(T.fatal[k], 'cause', e.title); T.fatal[k].body = str(e.body) || ''; T.fatal[k].joke = str(e.joke) || ''; } }
  if (er.clipboard) T.common.clipboardFail = { title: er.clipboard.title, body: er.clipboard.body };
  if (er.storageBlocked) { put(S.data, 'storageMemory', er.storageBlocked.body); S.data.storageMemoryTitle = er.storageBlocked.title; }
  if (er.storageFull) put(S.data, 'storageFull', er.storageFull.body);
  if (er.notSaved) S.data.notSavedBody = er.notSaved.body;
  if (er.importFail) S.data.importFailInfo = { title: er.importFail.title, body: er.importFail.body };
  if (er.shareBad) P.importBad = er.shareBad.body;
  if (er.shareTooBig) P.exportTooBig = er.shareTooBig.body;
  if (er.fetchFail) T.diag.fetchFail = er.fetchFail.body;
  if (er.typeCap) put(P, 'typesFull', er.typeCap.body);
  if (er.budget) put(P, 'cantAfford', er.budget.body);
  if (er.unitCap) { const b = er.unitCap.body; P.capFull = (cap) => `${b} (${cap} per side.)`; }
  P.reasons = Object.assign({}, H.PLACEMENT_REASONS || {});

  // toasts
  const ts = H.TOASTS || {};
  if (str(ts.armySaved)) P.presetSaved = () => ts.armySaved;
  put(T.common, 'copied', ts.copied);
  put(S.data, 'resetDone', ts.progressReset);
  S.data.settingsResetDone = str(ts.settingsReset) || '';

  // credits: in-universe department list from HUMOR
  if (Array.isArray(STUDIO_CREDITS) && STUDIO_CREDITS.length) T.credits.studio = STUDIO_CREDITS.filter((c) => c && c.role && c.name).map((c) => [c.role, c.name]);
  if (Array.isArray(CREDITS_FOOTER)) T.credits.footer = CREDITS_FOOTER.slice();
  return T;
}
try { overlayHumor(T, H); } catch (e) { /* defaults stay */ }

/** Deep-merge `ctx.content.humor.ui` / `.settingsJokes` over the defaults (new object each call; T itself is never mutated). */
export function getT(ctx) {
  const extra = ctx && ctx.content && ctx.content.humor && (ctx.content.humor.ui || ctx.content.humor.uiText || null);
  const jokes = ctx && ctx.content && ctx.content.humor && ctx.content.humor.settingsJokes;
  if (!extra && !jokes) return T;
  const merge = (a, b) => {
    const out = Array.isArray(a) ? a.slice() : Object.assign({}, a);
    for (const k of Object.keys(b || {})) {
      const v = b[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && a && typeof a[k] === 'object' && !Array.isArray(a[k])) out[k] = merge(a[k], v);
      else if (typeof v === typeof (a && a[k]) || a == null || a[k] === undefined) out[k] = v;
    }
    return out;
  };
  let r = T;
  if (extra) r = merge(r, extra);
  if (jokes) r = merge(r, { settings: jokes });
  return r;
}
