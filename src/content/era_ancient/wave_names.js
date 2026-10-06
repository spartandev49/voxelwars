// Survival wave names (spec world.md §7): "Wave 3: The Tax Collectors". Index by (wave - 1) % NAMES.length; boss waves use BOSS_NAMES.
// This is the only list: sim/waves.js waveName() builds the name from it, and humor/ui_text.js re-exports it.
export const WAVE_NAMES = [
  'The Welcome Committee', 'The Neighbours', 'The Tax Collectors', 'Reasonably Sized Mob', 'The Out-of-Towners', 'Delivery Day', 'The Mildly Annoyed',
  'The Audit', 'People With Opinions', 'The Long Queue', 'Cousins, Several', 'The Surprise Inspection', 'Unpaid Interns', 'The Reunion Nobody Wanted',
  'Seasonal Staff', 'A Committee, Armed', 'Eleven Uncles', 'The Complaint Department', 'Late But Armed', 'The Final Notice',
];
export const BOSS_NAMES = {
  minotaur: 'Wave {n}: Bull Market', cyclops: 'Wave {n}: Depth Perception Optional', war_elephant: 'Wave {n}: The Elephant In The Room',
  medusa: 'Wave {n}: Bad Hair Day', pharaoh: 'Wave {n}: Five Thousand Years Of Paperwork',
};
export const BOSS_CYCLE = ['minotaur', 'cyclops', 'war_elephant', 'medusa', 'pharaoh'];
