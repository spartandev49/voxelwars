// Why each synth-only family has no real asset (kept next to the generator of docs/audio_coverage.md; the coverage test fails if a
// family is synth-only without an entry here).
export const SYNTH_REASONS = {
  philosopher_mumble: 'Comedic mumbling is the gag voice of the Philosopher; no CC0/CC-BY recording of cartoon mumble exists in the ledger. Formant-synth mumble (3 syllables, 3 variants) is deliberate and reads as "talking without words".',
  senator_blah: 'Same gag for the Senator: five nasal formant syllables ("blah blah blah"). No suitable CC0 speech-babble asset was found.',
  crowd_gasp: 'Collective inhale ("ooh") has no clean CC0 source in the ledger; synthesized as band-passed noise swell + three formant voices. Rate-limited to once per 3 s, quiet.',
  crowd_boo: 'No CC0 crowd boo found; synthesized from 7 low formant voices on "oo/oh". Used only for the colosseum (ragequit, friendly-fire cluster, draw).',
  wine_pour: 'Liquid pouring sound not in the ledger; synthesized gurgle (band-passed noise with modulated gain + bubbles). Used for the Wine Rain god power.',
  step_snow: 'Snow-crunch footsteps were not found as CC0; synthesized (AM-modulated band-passed noise). Only used as foley texture on snow arenas at low level.',
  step_water: 'Shallow-water footsteps not in the ledger; synthesized splash (noise + bubble blips). Only foley texture.',
  amb_birds: 'The ledger carries only three ambience loops (wind, fire, crowd). Birdsong bed synthesized from short FM chirps over a low air bed (6 s seamless loop).',
  amb_desert: 'No desert-wind loop in the ledger; synthesized low gusting noise (6 s seamless loop).',
  amb_forest: 'No forest loop in the ledger; synthesized leaf-rustle noise with sparse chirps (6 s seamless loop).',
  amb_water: 'No water/river loop in the ledger; synthesized flowing-water noise (6 s seamless loop).',
};
