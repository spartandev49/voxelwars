# Music spec. dict(id, mood, src='rawdir:regex', tags, bpm?, kbps, t0/t1/fade_*, core?, nofade?) -- see tools/build_music.py
# bpm given = catalog value (incompetech.com metadata); otherwise estimated by onset autocorrelation.
SPEC = [
  dict(id='menu_heroic_age', mood='menu', src='incompetech-heroic-age:Heroic Age', tags=['epic', 'orchestral', 'heroic', 'fanfare'], bpm=129, kbps=112, fade_out=2.0),
  dict(id='battle_low_grim_league', mood='battle_low', src='incompetech-grim-league:Grim League', tags=['tribal', 'war drums', 'percussion', 'somber'], bpm=76, t1=78.95, fade_out=2.5, kbps=112,
       notes='all-percussion ensemble; cut to 25 bars (78.95 s) at the original tempo and faded'),
  dict(id='battle_mid_epic_boss', mood='battle_mid', src='oga-boss-battle-music:Epic Boss', tags=['epic', 'boss', 'driving', 'orchestral', 'loop'], kbps=80, core=True, nofade=True,
       notes='author states it loops seamlessly (verified: end/start RMS and zero-crossing continuity); shipped at 80 kbps joint stereo as the embedded core track'),
  dict(id='battle_high_clenched_teeth', mood='battle_high', src='incompetech-clenched-teeth:Clenched Teeth', tags=['timpani', 'strings', 'brass', 'intense', 'epic'], bpm=164, kbps=112, fade_out=2.0),
  dict(id='victory_dark_star', mood='victory', src='incompetech-dark-star:Dark Star', tags=['fanfare', 'brass', 'orchestral', 'triumphant'], bpm=170, kbps=112, fade_out=1.0),
  dict(id='defeat_gladiators_lament', mood='defeat', src='oga-gladiators-lament-epic-tragic-music:gladiator', tags=['tragic', 'lament', 'ancient', 'somber'], kbps=96, fade_out=2.0),
  dict(id='editor_desert_city', mood='editor', src='incompetech-desert-city:Desert City', tags=['middle eastern', 'dulcimer', 'calm', 'desert', 'ambient'], bpm=86, kbps=96, fade_out=1.0,
       notes='composer describes it as easy to loop; end is a decay so treat as cross-fade loop'),
  dict(id='comedy_bumbly_march', mood='comedy', src='incompetech-bumbly-march:Bumbly March', tags=['march', 'humorous', 'brass', 'silly'], bpm=120, kbps=96, fade_out=1.5),
]
