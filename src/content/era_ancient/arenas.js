// Arena presets (spec/world.md §1): what the Quick Battle carousel, Codex, Survival and Daily screens list. The recipes live in world/gen.js;
// this file adds the player-facing name, blurb, tactical tags, mood and a sensible budget. Pure data (HUMOR voice, kept short).
// Fields: id, name, recipe (generator id), size (default size class), seed (default seed for thumbnails and the reference layout), blurb,
//         tactics [chips], theme (env theme for music/ambience), mood ('calm'|'tense'|'epic'|'ominous'), recommendedBudget (drachmae).

export const ARENAS = [
  { id: 'marathon', name: 'Marathon Plain', recipe: 'marathon', size: 'medium', seed: 11, theme: 'greek', mood: 'calm', recommendedBudget: 8000,
    blurb: 'Rolling hills, olive trees and absolutely nowhere to hide. The reference arena: everything works here, and so does everyone.', tactics: ['Open field', 'Flanks matter', 'Beginner friendly'] },
  { id: 'thermopylae', name: 'The Hot Gates', recipe: 'thermopylae', size: 'medium', seed: 3, theme: 'greek', mood: 'epic', recommendedBudget: 8000,
    blurb: 'A cliff, a sea, and a gap eight units wide. Spears and shields feel very important here. Archers feel very overheated.', tactics: ['Chokepoint', 'Shields shine', 'Defender advantage'] },
  { id: 'colosseum', name: 'The Colosseum', recipe: 'colosseum', size: 'medium', seed: 2, theme: 'roman', mood: 'epic', recommendedBudget: 8000,
    blurb: 'Sand, spikes, and ninety spectators with strong opinions. The crowd roars at every kill, and some of them are seated near the lions.', tactics: ['Spike trapdoors', 'Crowd favourite', 'Close quarters'] },
  { id: 'nile', name: 'Nile Delta', recipe: 'nile', size: 'medium', seed: 4, theme: 'egyptian', mood: 'tense', recommendedBudget: 8000,
    blurb: 'One ford, many reeds, several crocodiles in spirit. Whoever crosses the river first discovers how much the river dislikes armour.', tactics: ['River crossing', 'Water slows', 'Ford fight'] },
  { id: 'giza', name: 'Giza Plateau', recipe: 'giza', size: 'large', seed: 5, theme: 'egyptian', mood: 'epic', recommendedBudget: 12000,
    blurb: 'Dunes, pyramids and a sphinx who has seen this before. Sand slows everyone down, so the battle gets dramatic in slow motion.', tactics: ['Dunes slow units', 'Pyramid cover', 'Large field'] },
  { id: 'persepolis', name: 'Persepolis Courtyard', recipe: 'persepolis', size: 'medium', seed: 6, theme: 'persian', mood: 'epic', recommendedBudget: 8000,
    blurb: 'Marble floors, fancy columns, a very comfortable throne. The columns block arrows and are not insured.', tactics: ['Columns block arrows', 'Destructible cover', 'Throne room'] },
  { id: 'carthage', name: 'Carthage Harbor', recipe: 'carthage', size: 'medium', seed: 7, theme: 'punic', mood: 'tense', recommendedBudget: 8000,
    blurb: 'Docks, crates and one very flammable ship. Fire arrows are not recommended, which is why everyone brings them.', tactics: ['Flammable docks', 'Sea edge', 'Crate cover'] },
  { id: 'teutoburg', name: 'Teutoburg Forest', recipe: 'teutoburg', size: 'large', seed: 8, theme: 'barbarian', mood: 'ominous', recommendedBudget: 10000,
    blurb: 'Fog, mud and a great many trees with ambush potential. Archers squint, legionaries panic, and a druid makes a quiet entrance.', tactics: ['Fog hurts aim', 'Ambush cover', 'Mud slows'] },
  { id: 'alpine', name: 'Alpine Pass', recipe: 'alpine', size: 'medium', seed: 9, theme: 'alpine', mood: 'ominous', recommendedBudget: 8000,
    blurb: 'Snow, cliffs and a path narrow enough to cause arguments. Everything is slower, colder and more dramatic. Elephants are optional but encouraged.', tactics: ['Snow slows 10%', 'Narrow pass', 'High ground'] },
  { id: 'olympus', name: 'Mount Olympus', recipe: 'olympus', size: 'large', seed: 10, theme: 'mythic', mood: 'epic', recommendedBudget: 12000,
    blurb: 'A marble plateau above the clouds, with a temple, columns and a Zeus statue that pretends not to watch. Lightning may happen.', tactics: ['Zeus interferes', 'Temple cover', 'Cloud islands'] },
  { id: 'troy', name: 'Siege of Troy', recipe: 'troy', size: 'large', seed: 12, theme: 'greek', mood: 'epic', recommendedBudget: 12000,
    blurb: 'A big wall, a bigger gate and a suspicious wooden horse parked outside. Break the gate, or let the horse do the talking.', tactics: ['Destructible walls', 'Siege weapons', 'Defender advantage'] },
  { id: 'styx', name: 'The River Styx', recipe: 'styx', size: 'medium', seed: 13, theme: 'mythic', mood: 'ominous', recommendedBudget: 8000,
    blurb: 'A river of lava and two narrow bone bridges. Units avoid the lava. Units are right to avoid the lava.', tactics: ['Lava deals 30 dps', 'Bridge chokepoints', 'Geysers'] },
  { id: 'cyclops', name: 'Cyclops Isle', recipe: 'cyclops', size: 'medium', seed: 14, theme: 'mythic', mood: 'tense', recommendedBudget: 8000,
    blurb: 'A rocky island with a cave mouth, a few goats and one very large neighbour. Please keep the noise down.', tactics: ['Cave mouth', 'Goats', 'Boss fight'] },
  { id: 'oasis', name: 'Oasis Duel', recipe: 'oasis', size: 'small', seed: 15, theme: 'egyptian', mood: 'calm', recommendedBudget: 3000,
    blurb: 'A small lake, a ring of palms and room for two armies to disagree. Perfect for quick duels, bad for philosophers.', tactics: ['Quick duels', 'Small arena', 'Palm cover'] },
  { id: 'arenalab', name: 'Arena Lab', recipe: 'arenalab', size: 'medium', seed: 1, theme: 'greek', mood: 'calm', recommendedBudget: 8000,
    blurb: 'Flat grass and a blank mind. Start here when you want to build something, or just to see how the soldiers behave without scenery.', tactics: ['Blank canvas', 'Flat ground', 'Testing'] },
  { id: 'random', name: 'Random Field', recipe: 'random', size: 'medium', seed: 1, theme: 'greek', mood: 'tense', recommendedBudget: 8000,
    blurb: 'A seeded roll of the arena dice. Share the seed and your friends fight on the same unlikely hill.', tactics: ['Surprise', 'Seeded', 'Shareable'] },
];

export const ARENA_BY_ID = Object.fromEntries(ARENAS.map((a) => [a.id, a]));
export const arenaPreset = (id) => ARENA_BY_ID[id] || null;
