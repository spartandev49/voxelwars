// UI micro-copy (owner: HUMOR): settings, labels, loading lines, empty states, errors, placement reasons, modal text.
// Rules: errors explain the problem in plain words first; `joke` is optional and the UI shows at most ONE joke per screen.
// Settings tooltips say what the option really does, then (sometimes) a wink. Labels for options are short.

// ---------- settings ----------
export const QUALITY = {
  potato: { name: 'Potato', tip: 'Runs on anything with a pulse. Fewer particles, no fancy shadows, still plenty of soldiers.' },
  papyrus: { name: 'Papyrus', tip: 'A sensible middle. Soft shadows, light bloom, 200 soldiers a side.' },
  marble: { name: 'Marble', tip: 'The recommended look. Crisp shadows, glow, 300 soldiers a side.' },
  olympian: { name: 'Olympian', tip: 'Everything on, 400 soldiers a side. Your fan will have opinions.' },
};

export const GORE = {
  red: { label: 'Classic red', tip: 'Cartoon red puffs. Still family friendly, in the way a pizza can be.' },
  wine: { label: 'Wine', tip: 'Soldiers burst into wine-coloured splashes. Dignity dissolves quickly.' },
  confetti: { label: 'Confetti', tip: 'Every defeat is a small party. It is the soldiers\' only party.' },
  off: { label: 'None', tip: 'Soldiers just puff away politely. Nobody is bothered.' },
};

export const CORPSES = {
  stay: { label: 'Stay', tip: 'Bodies stay on the field, up to 60. The oldest ones tidy themselves away.' },
  fade: { label: 'Fade', tip: 'Fallen soldiers fade out after eight seconds. Like a bad idea.' },
  none: { label: 'Pretend they\'re napping', tip: 'No corpses at all. Everyone has simply left the field. It is lovely.' },
};

export const DIFFICULTY = {
  easy: { label: 'Easy: Peasant Mode', tip: 'The enemy reacts slowly, never flanks, and its foot soldiers skip special abilities. Nobody will judge. The peasants might.' },
  normal: { label: 'Normal: Citizen', tip: 'A sensible opponent. Reacts in under half a second, flanks when it can, and uses its abilities.' },
  hard: { label: 'Hard: Consul', tip: 'Fast reactions, focused fire, kiting archers and a very good sense of what you brought.' },
};

export const SPEED_LABELS = { 0.25: 'Dramatic', 0.5: 'Thoughtful', 1: 'Normal', 2: 'Impatient', 4: 'Brutus' };

export const SETTINGS_TIPS = {
  autoScale: 'Lowers the quality when frames drop and raises it again when things calm down. It is cautious, like a general.',
  resScale: 'Renders at a fraction of your screen resolution. Cheaper and slightly blurrier, like most of history.',
  shadows: 'Soldiers cast shadows. Turning this off saves effort and costs mood.',
  bloom: 'A soft glow around bright things. Off means the sun is merely a sun.',
  clouds: 'Drifting clouds over the arena. Optional, as clouds always were.',
  fpsCounter: 'Shows frames per second in a corner. Knowledge, but not always happiness.',
  gore: 'How soldiers look when they fall. Every option is cartoon-safe.',
  corpses: 'What happens to fallen soldiers: stay, fade, or never mention it again.',
  camSens: 'How fast the camera turns when you drag. Raise it if you like whiplash.',
  edgeScroll: 'Move the mouse to the screen edge to pan. Off if you keep falling off the window.',
  autoPauseBlur: 'Pauses the battle when you switch tabs. The battle will wait. It is a patient battle.',
  muted: 'Silences everything. The soldiers will still be shouting. You just will not hear it.',
  tts: 'Experimental: a robot reads the announcers aloud. Brutus is thrilled. The robot is not.',
  subtitles: 'Shows what the announcers say. Plato insists on being read.',
  reduceMotion: 'Turns off wobbles, springs and screen shake. The battle remains dramatic.',
  shake: 'How hard the camera shakes on big hits. Zero is perfectly fine.',
  flashLimiter: 'Limits lightning and bloom flashes to something your eyes can survive.',
  uiScale: 'Makes the interface bigger or smaller. Squinting is optional.',
  palette: 'Team colours chosen for different kinds of colour vision. Pick whichever makes the armies obvious.',
  highContrastUI: 'Stronger outlines and plainer colours in menus.',
};

export const RULES_TIPS = {
  friendlyFire: 'Arrows and javelins can hit your own side. Boulders and meteors always can.',
  morale: 'Soldiers who lose friends or officers may run away. Turn off for stubborn armies.',
  freePlacement: 'Place anywhere, even in the enemy\'s zone. Brutus calls it creative. Plato calls it cheating.',
  mirror: 'Whatever you place on one side appears on the other. Fairness, with extra steps.',
  timeLimit: 'Ends the battle early and decides it by remaining cost. Accountants win.',
  weather: 'Rain halves fire, snow slows soldiers, sandstorms ruin archers. The sky has an opinion.',
  formation: 'How a squad lines up when placed. Rank, file, or "roughly there".',
  budget: 'How many drachmae each army can spend. More drachmae, more unit types, more regret.',
  mutators: 'Rule twists unlocked by campaign stars. They stack. So does the chaos.',
};

export const BUDGET_PRESETS = {
  skirmish: { label: 'Skirmish', line: 'A disagreement with spears. About 30 soldiers a side.' },
  battle: { label: 'Battle', line: 'A proper argument. About 80 a side.' },
  war: { label: 'War', line: 'A calendar event. About 200 a side.' },
  epic: { label: 'Epic', line: 'Up to 400 a side. Your computer will need a moment.' },
  custom: { label: 'Custom', line: 'You choose. History will judge.' },
};

// ---------- menus and buttons ----------
export const SPLASH = 'PRESS ANY KEY TO ENTER THE ARENA';
export const ROADMAP_TAG = 'Roadmap: Medieval Era. Not in this build.';

export const TITLE_MENU = {
  quick: { label: 'Quick Battle', sub: 'Pick a fight' },
  campaign: { label: 'Campaign', sub: 'Nine battles, one goat' },
  survival: { label: 'Survival', sub: 'They keep coming' },
  builder: { label: 'Arena Builder', sub: 'Landscaping, but violent' },
  workshop: { label: 'Soldier Workshop', sub: 'Make a friend, give him a spear' },
  codex: { label: 'Codex', sub: 'Know thy enemy, and thy goat' },
  achievements: { label: 'Achievements', sub: 'Proof of questionable decisions' },
  settings: { label: 'Settings', sub: 'Make it prettier, or faster' },
  credits: { label: 'Credits', sub: 'Everybody who helped, and some goats' },
};

export const BUTTONS = {
  quickFight: 'Quick Fight',
  placeArmies: 'Place armies',
  fight: 'FIGHT!',
  rematch: 'Again, but smarter',
  tweak: 'Tweak the army',
  menu: 'Back to the menu',
  nextMission: 'Next mission',
  deploy: 'Deploy',
  resume: 'Resume',
  restart: 'Start over',
  quit: 'Leave the battle',
  skipTutorial: 'Skip tutorial',
  autoFill: 'Auto-fill',
  mirror: 'Mirror',
  undo: 'Undo',
  redo: 'Redo',
  clear: 'Clear all',
  saveArmy: 'Save army',
  loadArmy: 'Load army',
  copy: 'Copy',
  copied: 'Copied',
  ok: 'OK',
  cancel: 'Cancel',
  back: 'Back',
  retry: 'Try again',
  safeMode: 'Safe mode',
};

export const MODALS = {
  quitBattle: { title: 'Leave the battle?', body: 'The armies will stand around waiting. Your setup is kept, so you can come back.', yes: 'Leave', no: 'Stay and fight' },
  resetProgress: { title: 'Erase all progress?', body: 'This deletes your campaign stars, achievements and saved armies on this device. It cannot be undone.', yes: 'Erase everything', no: 'Keep it' },
  overwrite: { title: 'Replace the saved one?', body: 'Something with this name already exists. Saving will replace it.', yes: 'Replace', no: 'Cancel' },
  deleteItem: { title: 'Delete this?', body: 'It will be removed from this device. There is no recycle bin. There was never a recycle bin.', yes: 'Delete', no: 'Keep' },
};

// ---------- loading ----------
export const LOADING_LINES = [
  'Sharpening spears...',
  'Teaching goats to salute...',
  'Inflating the Trojan horse...',
  'Calibrating catapults to four percent regret...',
  'Asking Plato to define loading...',
  'Hiding the grapes...',
  'Laminating the Terms of Conquest...',
  'Polishing helmets that nobody will see...',
  'Counting drachmae twice...',
  'Rehearsing the Spartan kick...',
  'Convincing the elephants it is only a drill...',
  'Waking up Zeus. He is not a morning god...',
  'Persuading chickens to be sacred...',
  'Bribing the weather...',
  'Writing a plan Hannibal can improvise from...',
  'Finding the other sandal...',
  'Unwrapping the mummies carefully...',
  'Reading Cassandra\'s warnings. Again...',
  'Counting Immortals. Ten thousand, give or take...',
  'Painting the pyramids a little more triangular...',
  'Filing the paperwork for the battle...',
  'Sorting soldiers by team colour and personal grudge...',
  'Feeding the warhounds sausages in advance...',
  'Placing the grape seller in a safe spot...',
];

// ---------- empty states ----------
export const EMPTY_STATES = {
  arenas: { title: 'No arenas yet', body: 'Build one in the Arena Builder and it will appear here. Landscaping awaits.' },
  soldiers: { title: 'No custom soldiers', body: 'Make one in the Soldier Workshop. Give him a name, a spear and an opinion.' },
  armies: { title: 'No saved armies', body: 'Place some units and press Save army. Next time they will be waiting in neat rows.' },
  killfeed: { title: '', body: 'All quiet. Suspiciously quiet.' },
  achievements: { title: 'Nothing unlocked yet', body: 'Fight a battle. The achievements are watching, and they are patient.' },
  stats: { title: 'No battles on record', body: 'Your legacy is empty. This is easy to fix.' },
  codexSearch: { title: 'No unit by that name', body: 'Try another word. Or another goat.' },
  leaderboard: { title: 'Nobody has survived yet', body: 'Be the first. The wall is waiting for a name.' },
  workshopParts: { title: 'Locked for now', body: 'Finish campaign missions to unlock more silly parts. The colander helm is worth it.' },
  campaignLocked: { title: 'Locked', body: 'Finish the previous mission first. History happened in order.' },
};

// ---------- errors (plain words first; joke at most once per screen) ----------
export const ERRORS = {
  webgl2: { title: 'This browser cannot draw the game', body: 'VOXELWARS needs WebGL 2, and this browser or device does not offer it. Try an up-to-date Chrome, Edge, Firefox or Safari, and check that hardware acceleration is on.', joke: 'The soldiers are voxels. They still need a graphics card.' },
  scriptBlocked: { title: 'A required file did not load', body: 'The 3D library could not be downloaded from any of its three sources. Check your connection or any content blocker, then reload.', joke: 'Even Troy had better supply lines.' },
  storageBlocked: { title: 'Progress cannot be saved', body: 'Your browser is blocking local storage, so settings and campaign progress will be lost when you close this page. You can still play.', joke: 'History was written by those who kept their notes.' },
  storageFull: { title: 'Storage is full', body: 'There is no room left on this device to save. Export your data or delete old armies and arenas, then try again.', joke: 'Your armies are very large.' },
  shareBad: { title: 'That code does not look right', body: 'The share code is damaged or incomplete. Copy the whole code again, from the first VW1 to the very last character.' },
  shareTooBig: { title: 'That is too big to share as text', body: 'The code would be longer than chat apps accept. Save it as a file instead.', joke: 'An epic arena needs an epic attachment.' },
  importFail: { title: 'Could not read that file', body: 'The file is not a VOXELWARS arena, soldier or army, or it is damaged. Nothing was changed.' },
  audioBlocked: { title: 'Sound is waiting for a click', body: 'Browsers keep sound off until you interact with the page. Click or press any key to start it.', joke: 'The announcers are clearing their throats.' },
  fetchFail: { title: 'Some sounds could not be loaded', body: 'A few audio files did not download, so built-in sounds are standing in. The game works normally.' },
  clipboard: { title: 'Could not copy automatically', body: 'The browser refused clipboard access. The text is selected below: press Ctrl+C (or Cmd+C) to copy it.' },
  unitCap: { title: 'Army is full', body: 'This graphics setting allows only so many soldiers per side. Raise the quality tier or remove some units.', joke: 'Even Xerxes had a head count.' },
  typeCap: { title: 'Too many different unit types', body: 'A battle can field 16 different types. Remove all of one type to add another.' },
  budget: { title: 'Not enough drachmae', body: 'This unit costs more than your remaining budget. Remove something first, or raise the budget in the rules.' },
  notSaved: { title: 'Not saving', body: 'Progress is currently not being saved on this device. Check the Data tab in Settings.' },
  crash: { title: 'Something broke', body: 'The game hit an unexpected error. Copy the details below and reload to continue.', joke: 'Zeus was not involved. Probably.' },
};

// ---------- placement ----------
export const PLACEMENT_REASONS = {
  enemyZone: 'In the enemy\'s zone. They are not accepting visitors.',
  underwater: 'Underwater. Hoplites are brave, not buoyant.',
  blocked: 'Something solid is already there.',
  steep: 'Too steep. Even goats are thinking about it.',
  budget: 'Not enough drachmae for that one.',
  cap: 'This side is full.',
  types: 'Too many unit types. Sixteen is the limit.',
  lava: 'That is lava. Please do not.',
  outOfBounds: 'Off the edge of the arena. There is nothing there.',
};

// ---------- survival ----------
export const WAVE_NAMES = [
  'The Tax Collectors', 'Mildly Annoyed Titans', 'The Cousins', 'Unscheduled Visitors', 'The Overdue Reinforcements',
  'Everybody Who Heard There Was a Fight', 'The Polite Ones', 'The Rather Large Ones', 'The Auditors',
  'Brutus\'s Favourite', 'Cassandra Warned You About This One', 'The Entire Opposing Family', 'Slightly Fewer Goats',
];
export function waveName(n) { return WAVE_NAMES[(Math.max(1, n) - 1) % WAVE_NAMES.length]; }

export const SURVIVAL = {
  intermission: 'Catch your breath. Place reinforcements, then press Ready.',
  boss: 'A boss is coming. Brutus has already started shouting.',
  gameOver: 'The last of your army has fallen. The wave counter is the only thing still standing.',
};

// ---------- misc ----------
export const DAILY = {
  title: 'Daily Skirmish',
  blurb: 'One battle, the same for everybody today. Come back tomorrow for another.',
  copyTemplate: 'VOXELWARS Daily {date}: {result} in {time}',
};

export const TOASTS = {
  saved: 'Saved.',
  armySaved: 'Army saved. It will be waiting.',
  copied: 'Copied to the clipboard.',
  settingsReset: 'Settings back to the defaults.',
  progressReset: 'Progress erased. A fresh start.',
  achievement: 'Achievement unlocked: {name}',
  unlockedPart: 'New part unlocked: {name}',
};

export const ABOUT = {
  tagline: 'A voxel battle simulator in the ancient world, with a goat.',
  disclaimer: 'No historical armies were harmed. Several chickens were pecked.',
};

export function loadingLine(rng) {
  const r = typeof rng === 'function' ? rng() : rng && typeof rng.next === 'function' ? rng.next() : 0;
  return LOADING_LINES[Math.floor(r * LOADING_LINES.length) % LOADING_LINES.length];
}
