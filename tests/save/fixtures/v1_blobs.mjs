// Hand-made v1 save fixtures: what builds before the document layer wrote into localStorage (store envelope {v:1, data}).
// The migrations in src/save/migrate.js must turn each of these into the v2 shape (verification P3 / B11).
export const V1 = {
  progress: {
    v: 1,
    data: {
      stars: [3, 2, 0, 1, 9, -2, 'x'],                                     // mission order; 9 clamps to 3, negatives and junk drop
      achievements: ['first_victory', 'sparta', 'Not Valid!', 42],
      codex: ['hoplite', 'spartan', 'bad id'],
      survivalBest: 14,                                                      // best wave
      dailyLast: 20260301,
      mystery: { keep: false },                                          // unknown keys are dropped
    },
  },
  progressMap: {
    v: 1,
    data: {
      stars: { marathon_sort_of: 2, thermopylae_snack: 3, 'Nope!': 3, future_mission: 1, pyramid_scheme: 0 },
      achievements: { first_victory: true, goat_herder: 1700000000000, tourist: { unlocked: true, at: 1710000000000 }, kicks: false },
      codex: { seen: ['cyclops'], locked: ['zeus_bolt'] },
    },
  },
  survival: {
    v: 1,
    data: [{ score: 5000, waves: 4, date: 20260105, arena: 'colosseum' }, { score: 9000, waves: 7, date: '2026-02-02', arena: 'nile' }, { score: -4, waves: 1 }, 'junk', { score: 1200, waves: 2 }],
  },
  daily: {
    v: 1,
    data: {
      last: 20260302,
      history: [
        { date: 20260301, result: 'win', time: 140, left: 55, seed: 20260301, arena: 'Marathon Plain', string: 'VW daily 20260301' },
        { date: '2026-03-02', result: 'loss', time: 90.4, left: 120, seed: 20260302, arena: 'Giza' },
        { date: '2026-02-27', result: 'draw', time: 360 },
        { date: 'garbage', result: 'win' },
        { date: 20260301, result: 'loss', time: 1 },                       // duplicate day: the first row wins
      ],
    },
  },
  seen: { v: 1, data: ['teaching', 'beacon', 'Bad Id', 'codex_intro'] },
};
