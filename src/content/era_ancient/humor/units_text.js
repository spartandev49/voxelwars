// Unit text for all 43 units (owner: HUMOR). Pure data. Every string is shown to players: keep it specific to what the unit does.
// Shape per unit: { name, plural, blurb (<=14 words), lore (<=35 words), deaths[3+] (<=12 words, last words), taunts[2+], codexJoke }.
// `name`/`plural` are display names used by announcer slots ({unit}, {unit|pl}); the UnitDef name remains the source of truth for UI.

export const UNIT_TEXT = {
  // ---------------- Hellenes ----------------
  hoplite: {
    name: 'Hoplite', plural: 'Hoplites',
    blurb: 'A farmer with a bronze mortgage and a spear longer than his patience.',
    lore: 'Buys his own armour, shield and spear, then lines up beside neighbours who bought theirs. Each shield covers the man on the left, so desertion is mostly a matter of etiquette.',
    deaths: [
      'Tell the armourer the payments stop here.',
      'Who is covering my right? Nikias? NIKIAS!',
      'Close the gap! Close the... somebody close the gap!',
    ],
    taunts: [
      'Come closer. The spear is longer than your plans.',
      'Stand still, enemy. It is a very expensive spear.',
    ],
    codexJoke: 'Armour rating 30%. Mortgage rating 70%.',
  },
  spartan: {
    name: 'Spartan', plural: 'Spartans',
    blurb: 'Speaks in single words. Kicks in full sentences.',
    lore: 'Raised from childhood for war, endurance and brevity. When a king threatened to raze the city, the entire reply was one word: If. Kicks first, discusses nothing.',
    deaths: [
      'With my shield, or on it. Mostly on it.',
      'No retreat. No surrender. Some lying down.',
      'I kick better lying down. Come closer.',
    ],
    taunts: [
      'If.',
      'Kick incoming. Brace. Or do not. Same result.',
    ],
    codexJoke: 'Kick cooldown: 8 s. Subtlety cooldown: permanent.',
  },
  peltast: {
    name: 'Peltast', plural: 'Peltasts',
    blurb: 'Throws a javelin, runs away, repeats. Wears a fox for morale.',
    lore: 'Light skirmisher hired for speed and an open-minded attitude to formations. Tactics: throw javelin, leave, apologise from a safe distance. The fox on his hat has seen things.',
    deaths: [
      'Who taught them to chase?',
      'Tell the fox it was a good hat.',
      'Please do not throw my javelins back.',
    ],
    taunts: [
      'Catch me! (Please do not.)',
      'Over here! No, over here! No, now I am gone!',
    ],
    codexJoke: 'Kites at 85% of range. Courage at 85% of that.',
  },
  cretan_archer: {
    name: 'Cretan Archer', plural: 'Cretan Archers',
    blurb: 'Fires in your general direction with total confidence.',
    lore: 'Mercenary bowman paid per contract, not per hit, which the accuracy reflects. Believes every arrow eventually finds someone, and has a spreadsheet proving none of them were his.',
    deaths: [
      'Please pay my widow per arrow.',
      'I had forty arrows left. Forty!',
      'At least one of mine hit someone.',
    ],
    taunts: [
      'Every arrow finds someone. Statistically.',
      'I am not missing. I am exploring.',
    ],
    codexJoke: 'Accuracy: aspirational. Volume: reliable.',
  },
  companion_cavalry: {
    name: 'Companion Cavalry', plural: 'Companion Cavalry',
    blurb: 'Elite cavalry. The horse does the work, the rider takes the credit.',
    lore: 'Royal horsemen of a king who conquered half the known world by thirty, mostly by arriving before anyone finished arguing. The horse has seniority. The rider has a lance and a good haircut.',
    deaths: [
      'The horse is fine. The horse is always fine.',
      'Spears. Why is it always spears?',
      'Who is going to tell the horse?',
    ],
    taunts: [
      'Charge first. Plan later. The horse decides.',
      'Behind you. Also beside you. Now in front.',
    ],
    codexJoke: 'Spear walls deal 1.6x damage to this unit. The horse files a complaint.',
  },
  philosopher: {
    name: 'Philosopher', plural: 'Philosophers',
    blurb: 'Weaponised rhetoric. Enemies stop fighting to ask what a sword even is.',
    lore: 'Wins arguments by asking questions until the opponent forgets why he came. Has never lost a debate, mainly because the other party eventually wandered off. Carries a scroll for blunt reasoning.',
    deaths: [
      'But first, define death.',
      'Socrates at least chose the hemlock.',
      'I think, therefore... oh.',
    ],
    taunts: [
      'But what IS a spear, truly?',
      'If a sword falls in a forest and nobody dodges it...',
    ],
    codexJoke: 'Channel time: 3 s. Point: pending.',
  },
  strategos: {
    name: 'Strategos', plural: 'Strategoi',
    blurb: 'Elected general. Leads from just far enough forward to be blamed.',
    lore: 'Elected by assembly, which is why every plan sounds persuasive and every retreat sounds like a motion. Has led from the front once, found it terrible, and now leads from the front-adjacent.',
    deaths: [
      'It was in the plan! (It was not in the plan.)',
      'Hold an election. I will abstain.',
      'Somebody take over. Preferably someone with the plan.',
    ],
    taunts: [
      'According to the plan, you are already losing.',
      'Remember the plan! All of you! (Somebody remember it.)',
    ],
    codexJoke: 'Rally aura 10 u: +15% damage. Plan survival rate: 0%.',
  },

  // ---------------- Romans ----------------
  legionary: {
    name: 'Legionary', plural: 'Legionaries',
    blurb: 'Marches on roads he built, in formations he filed in triplicate.',
    lore: 'Professional soldier who digs a fortified camp every night, then fights in the morning. Considers the shovel his main weapon. Has built more roads than he has killed men and wants it noted.',
    deaths: [
      'Who digs the camp tonight?',
      'I demand a requisition form for this wound.',
      'Form testudo around my paperwork!',
    ],
    taunts: [
      'Testudo! Shields up! Roof on!',
      'Rome took centuries. You will be paved by Friday.',
    ],
    codexJoke: 'Digs a camp every night. Camp not included in the cost.',
  },
  pilum_thrower: {
    name: 'Pilum Thrower', plural: 'Pilum Throwers',
    blurb: 'Throws a spear designed to bend, so you cannot throw it back.',
    lore: 'The pilum has a soft iron neck that bends on impact, ruining the shield it hit and the spear itself. Roman engineers called this efficient. Everyone else called it passive-aggressive.',
    deaths: [
      'Mine bends. I apparently did not.',
      'It was designed to be thrown away. So was I.',
      'Please recycle the spears. They are bent, not lost.',
    ],
    taunts: [
      'Enjoy your new shield accessory.',
      'Your shield now has a spear in it. Congratulations.',
    ],
    codexJoke: 'Disables a shield for 4 s. Smugness: permanent.',
  },
  centurion: {
    name: 'Centurion', plural: 'Centurions',
    blurb: 'Commands eighty men with a vine stick and the look of a disappointed dad.',
    lore: 'Carries a vine staff to beat his own soldiers into line, a tradition that keeps morale high and attendance perfect. No man has ever been late to a centurion\'s battle twice.',
    deaths: [
      'My men are still on report!',
      'Who will shout at them now?',
      'Nobody dismissed. Stand at ease. Permanently.',
    ],
    taunts: [
      'Name, rank, and reason you are out of formation!',
      'Again. From the beginning. Properly.',
    ],
    codexJoke: 'Discipline aura 9 u. Praise aura: not found.',
  },
  gladiator: {
    name: 'Gladiator', plural: 'Gladiators',
    blurb: 'Fights better when surrounded, which is the opposite of sensible advice.',
    lore: 'Career plan: do not die for five years. Gains 20% damage when five or more enemies surround him, because applause is performance enhancing. Nobody has tested him in a quiet room.',
    deaths: [
      'Was that a thumbs up or just a thumb?',
      'The crowd was wonderful. Please tell the crowd.',
      'I need a better agent.',
    ],
    taunts: [
      'Are we entertained? Please nod, it is in my contract.',
      'Bring friends! Bring five! It is for the damage bonus!',
    ],
    codexJoke: 'Crowd favourite: +20% damage with five enemies nearby. Therapy: unavailable.',
  },
  equites: {
    name: 'Eques', plural: 'Equites',
    blurb: 'Rides without stirrups. Core strength: excellent. Dignity: negotiable.',
    lore: 'Roman cavalry, riding without stirrups because they had not been invented, and without complaint because nobody could hear it over the screaming. Flanks bravely, arrives fashionably late.',
    deaths: [
      'Someone really should invent stirrups.',
      'My horse had a plan. I had a hat.',
      'Tell the legion I was flanking. Left-ish.',
    ],
    taunts: [
      'Flank incoming! Left-ish!',
      'Hold on, horse. Hold on, me.',
    ],
    codexJoke: 'Stirrups: not invented. Gripping with knees: invented immediately.',
  },
  ballista: {
    name: 'Ballista', plural: 'Ballistae',
    blurb: 'Giant crossbow, crew of two. Overkill by design, apologies in advance.',
    lore: 'Torsion-powered bolt thrower that skewers three enemies at once, a feature the crew calls efficiency and the enemy calls rude. Reloading takes 4.5 seconds, spent on small talk.',
    deaths: [
      'Nobody mentioned the minimum range!',
      'We just reloaded. We JUST reloaded.',
      'Tell the next crew: line them up.',
    ],
    taunts: [
      'Line up! It saves time.',
      'Three at once. Stand closer, please.',
    ],
    codexJoke: 'Minimum range 8 u. Optimism: unlimited.',
  },
  senator: {
    name: 'Senator', plural: 'Senators',
    blurb: 'Defeats armies by talking, and what remains by paying.',
    lore: 'Discovered that a four-hour speech defeats an army faster than a legion, and a bag of coins defeats whatever is left. Both methods are legal; the second is recorded as a donation.',
    deaths: [
      'Et tu... subcommittee?',
      'Point of order: I am being stabbed.',
      'I will return after the recess.',
    ],
    taunts: [
      'I will yield the floor when I am finished. In three hours.',
      'My offer: one coin. Your offer: leaving.',
    ],
    codexJoke: 'Bribe chance: 5% per coin. Conflict of interest: 100%.',
  },

  // ---------------- Egyptians ----------------
  medjay: {
    name: 'Medjay', plural: 'Medjay',
    blurb: 'Desert police turned soldiers. Politely asks you to leave, then insists.',
    lore: 'Began as desert scouts, became the pharaoh\'s police, and now fights in the army. Still asks civilians to step away from the pyramid and still checks whether you have a permit.',
    deaths: [
      'Move along. Nothing to see. Just dying.',
      'Please do not leave the scene of the crime.',
      'I only wanted to ask some questions.',
    ],
    taunts: [
      'Move along. Nothing to see here. Stop looking at the pyramid.',
      'Sir, step away from the sphinx.',
    ],
    codexJoke: 'Arrest radius: spear length, 2.0 u. Warrant: also a spear.',
  },
  nubian_archer: {
    name: 'Nubian Archer', plural: 'Nubian Archers',
    blurb: 'Every sixth arrow is on fire. The other five feel overlooked.',
    lore: 'Fires a flaming arrow every sixth shot, a ratio set by a quartermaster who priced fire and wept. On rainy days he is just a man with a bow and strong feelings.',
    deaths: [
      'I lost count. Was that the sixth?',
      'It is raining. Of course it is raining.',
      'Tell the quartermaster: fire was worth it.',
    ],
    taunts: [
      'Count with me: one, two, three, four, five, BURN.',
      'Five plain arrows. One special. Guess which.',
    ],
    codexJoke: 'Fire arrow every 6th shot. Rain cancels it. Sulking is not cancelled.',
  },
  khopesh_warrior: {
    name: 'Khopesh Warrior', plural: 'Khopesh Warriors',
    blurb: 'Curved sword, small hook, large opinions about your shield.',
    lore: 'The khopesh is a sickle-shaped sword that hooks a shield aside. It was invented by someone who looked at a harvest tool and thought: yes, but ruder.',
    deaths: [
      'My hook was so close.',
      'Somebody return the sickle to the farm.',
      'Everybody laughs at the hook until it works.',
    ],
    taunts: [
      'Nice shield. Shame if someone hooked it.',
      'Lower your shield. I only want to borrow it.',
    ],
    codexJoke: 'Shield pull: 15%. Farm tool: 100%.',
  },
  chariot_archer: {
    name: 'Chariot Archer', plural: 'Chariot Archers',
    blurb: 'A bow on wheels. One drives, one shoots, both argue about turns.',
    lore: 'Two horses, two crew, one bow and no handbrake. Fires while moving, which the driver regards as a challenge to his steering and the archer as a challenge to his stomach.',
    deaths: [
      'I said LEFT!',
      'Who was driving?',
      'Tell the horses they were excellent.',
    ],
    taunts: [
      'Mind the wheels! (We are not stopping.)',
      'Mind the road. We still have not found the brakes.',
    ],
    codexJoke: 'Shoots while moving. Parks by hitting things.',
  },
  mummy: {
    name: 'Mummy', plural: 'Mummies',
    blurb: 'Cursed linen that moves slowly and burns quickly. Keep away from torches.',
    lore: 'Preserved for eternity with seventy days of salt, oil and linen. Resents being woken, burned, and above all the combination. Walks slowly, but has all the time in the world, plus some.',
    deaths: [
      'Five thousand years. Not once offered tea.',
      'Fire. Always, always fire.',
      'Dust to dust. Mostly dust.',
    ],
    taunts: [
      'Who disturbed my nap?',
      'Do you know how long it takes to wrap this?',
    ],
    codexJoke: 'Fire damage x2. Enemy speed -20% nearby. Dry skin: terminal.',
  },
  anubis_guard: {
    name: 'Anubis Guard', plural: 'Anubis Guards',
    blurb: 'Finishes off anyone below 20% health. Efficient, courteous, terrifying.',
    lore: 'A jackal-headed temple guard whose job is to finish what others started. Every ten seconds he ends one badly wounded enemy and files the paperwork afterwards. Reviews are excellent; reviewers are rare.',
    deaths: [
      'My shift ended early.',
      'Who will finish the wounded?',
      'I did not finish the job. Reschedule?',
    ],
    taunts: [
      'Hold still. This is only a formality.',
      'Sign here. Or do not. It is finished anyway.',
    ],
    codexJoke: 'Execute threshold: 20% hp. Mercy threshold: 0%.',
  },
  priest_of_ra: {
    name: 'Priest of Ra', plural: 'Priests of Ra',
    blurb: 'Heals friends, sunburns enemies. Bring sunscreen for both.',
    lore: 'Part healer, part magnifying glass. Operates the only solar-powered heal pulse in the ancient world and insists, to everyone, that you drink water. Wears a leopard pelt in summer, which nobody questions.',
    deaths: [
      'Tell the clouds they win.',
      'Drink water, everyone. That is my last order.',
      'I healed everyone but me. Typical.',
    ],
    taunts: [
      'Stand still. This is for your own good. And mine.',
      'Hydrate, then die.',
    ],
    codexJoke: 'Heals four allies per 6 s. Burns everything else. Hat: recommended.',
  },
  pharaoh: {
    name: 'Pharaoh', plural: 'Pharaohs',
    blurb: 'A king with a scepter, a plague of locusts and no concept of no.',
    lore: 'Ruler of two lands, wearer of a double crown and the only man who can summon a swarm of locusts and still complain about the service. His tomb has been under construction since his birthday.',
    deaths: [
      'My pyramid is not finished!',
      'Build the pyramid without me. Slowly.',
      'Replace me with a statue. A larger one.',
    ],
    taunts: [
      'Locusts! Dinner is served. For them.',
      'I do not dismount. I do not queue. I do not lose.',
    ],
    codexJoke: 'Locust swarm: 6 s, 8 dps. Ego: not measurable.',
  },

  // ---------------- Persians ----------------
  immortal: {
    name: 'Immortal', plural: 'Immortals',
    blurb: 'Not actually immortal. Dies exactly once, then again, politely.',
    lore: 'Elite guard kept at exactly ten thousand men by replacing every casualty at once, so the number always looked right. Marketing called it immortality. Recruitment called it Tuesday.',
    deaths: [
      'Terms and conditions apply.',
      'That was my second one. Please note the asterisk.',
      'I will be back. Once.',
    ],
    taunts: [
      'Kill me. Go on. I will wait. Once.',
      'We are ten thousand. This week.',
    ],
    codexJoke: 'Revives once, at 40% health. The word once is doing a lot of work.',
  },
  sparabara: {
    name: 'Sparabara', plural: 'Sparabara',
    blurb: 'An archer behind a wicker wall and a lot of optimism.',
    lore: 'Plants a wicker shield the size of a door, fires from behind it, and avoids all questions about whether this is bravery or furniture.',
    deaths: [
      'The wall was supposed to hold!',
      'Wicker was a choice.',
      'Somebody find a better basket.',
    ],
    taunts: [
      'You cannot hit me. I live in a basket.',
      'Bring a bigger bow.',
    ],
    codexJoke: 'Stationary: arrows bounce. Moving: arrows are curious.',
  },
  cataphract: {
    name: 'Cataphract', plural: 'Cataphracts',
    blurb: 'Armoured rider, armoured horse. Everything is armoured except the budget.',
    lore: 'Rider and horse sealed in scale armour from nose to hoof. A cataphract charge is half cavalry, half furniture removal. Turning around requires planning permission from the horse.',
    deaths: [
      'I cannot get up. I cannot even see.',
      'Whose idea was a barded horse?',
      'My horse is much better armoured than me.',
    ],
    taunts: [
      'I am a very expensive problem.',
      'We are slow, large and inevitable. Like taxes.',
    ],
    codexJoke: 'Armour 60%. Dismounting: a committee decision.',
  },
  camel_rider: {
    name: 'Camel Rider', plural: 'Camel Riders',
    blurb: 'Horses hate the smell of camels. This is the entire doctrine.',
    lore: 'Rides a camel whose chief military value is that horses cannot stand the smell. At Thymbra this beat a cavalry army, a victory camels regard as long overdue.',
    deaths: [
      'The camel does not even look sorry.',
      'At least the horses still hate us.',
      'The camel was right. The camel is always right.',
    ],
    taunts: [
      'Smell that? That is strategy.',
      'Hold your horses. They are leaving anyway.',
    ],
    codexJoke: 'Enemy cavalry: -35% speed. Camel apologies: 0%.',
  },
  xerxes: {
    name: 'Xerxes', plural: 'Xerxeses',
    blurb: 'Brings a throne to battle so he can watch comfortably.',
    lore: 'King of Kings, builder of bridges, whipper of seas. Watched his own battles from a throne on a hill and ordered the sea punished when it disagreed. Retreats loudly and from a seated position.',
    deaths: [
      'Retreat! Retreat! Somebody carry the throne!',
      'The sea whipped me back.',
      'Bring me another throne. This one is on fire.',
    ],
    taunts: [
      'Bring the throne forward. No, back. Forward.',
      'Lash the sea! It looked at me funny!',
    ],
    codexJoke: 'Throne deployed after 4 s. Retreat deployed instantly.',
  },

  // ---------------- Carthaginians ----------------
  war_elephant: {
    name: 'War Elephant', plural: 'War Elephants',
    blurb: 'Wears a tower. Weighs a barn. Fears a lit torch.',
    lore: 'Crossed the Alps once and has complained about it ever since, in a frequency only other elephants and geologists can hear. Carries two archers, one tower and a firm opinion about fire.',
    deaths: [
      'Paaa-ROOO. (Translation: I did say the torches.)',
      'Tell the howdah crew I am sorry. And heavy.',
      'Not the fire. Never the fire.',
    ],
    taunts: [
      'BRAAAP! (A warning. Also hello.)',
      'Trumpets. Checks for torches. Trumpets louder.',
    ],
    codexJoke: 'Panics after 3 fire hits. Trample: yes. Subtlety: no.',
  },
  numidian: {
    name: 'Numidian', plural: 'Numidians',
    blurb: 'No saddle, no bridle, no insurance. Throws javelins at speed.',
    lore: 'Light cavalry who steer with a stick and a suggestion. Throws javelins, retreats, throws more javelins, and has never once been invited to a parade. The horse chooses where they go.',
    deaths: [
      'Horse, which way did you go?',
      'Tell the horse it can keep the javelins.',
      'I should have bought a bridle.',
    ],
    taunts: [
      'Catch me! The horse decides.',
      'Hit and run. Mostly run.',
    ],
    codexJoke: 'Steering: advisory. Accuracy: also advisory.',
  },
  catapult: {
    name: 'Catapult', plural: 'Catapults',
    blurb: 'Hurls boulders and, four percent of the time, coworkers.',
    lore: 'Siege engine operated by three men and a growing sense of dread. Every shot is a small physics experiment, and roughly one in twenty-five involves a colleague.',
    deaths: [
      'Why is the arm still swinging?',
      'Tell Gaius he was a good projectile.',
      'It is the four percent. It is always the four percent.',
    ],
    taunts: [
      'Firing! Probably at them!',
      'Safety first! Not ours, yours.',
    ],
    codexJoke: 'Misfire: 4%. Colleague compensation: pending a union.',
  },
  hannibal: {
    name: 'Hannibal', plural: 'Hannibals',
    blurb: 'Crossed the Alps with elephants to get a better view of Rome.',
    lore: 'Carthaginian general who surrounded a larger army at Cannae with a formation that looked like a hug until it closed. Lost an eye in a marsh and most elephants to the Alps.',
    deaths: [
      'Rome was just over that hill.',
      'Next time I take the coast road.',
      'My elephants knew the way.',
    ],
    taunts: [
      'Your flanks are showing.',
      'Rome built roads. I brought elephants.',
    ],
    codexJoke: 'Pincer aura 14 u. Looks like a hug. Is not a hug.',
  },

  // ---------------- Barbarians ----------------
  berserker: {
    name: 'Berserker', plural: 'Berserkers',
    blurb: 'Gets angrier as he gets hurt. Writes apologetic notes afterwards.',
    lore: 'Fights bare-chested in a wolf pelt, then hosts a pottery evening for the survivors. His rage is strictly shift work: it starts below half health and ends at the first cup of tea.',
    deaths: [
      'I was just getting properly angry!',
      'Tell Brenda the kiln needs checking.',
      'I was going to bake you a pot.',
    ],
    taunts: [
      'Excuse me. AAAARGH. Thank you.',
      'I would like to be extremely angry now, if that is convenient.',
    ],
    codexJoke: 'Rage below 50% health: +50% damage. Politeness: unchanged.',
  },
  axe_thrower: {
    name: 'Axe Thrower', plural: 'Axe Throwers',
    blurb: 'Throws axes, then politely asks for them back.',
    lore: 'Carries a belt of throwing axes and a firm belief that you will return them. The horned helmet is purely decorative, and he is tired of historians bringing it up.',
    deaths: [
      'Could someone return my axes?',
      'I only had eight. I counted.',
      'I threw my last one at you. Sorry.',
    ],
    taunts: [
      'Heads up! Literally.',
      'Incoming axe. Return to sender, if you can.',
    ],
    codexJoke: 'Range 13 u. Return policy: no returns.',
  },
  druid: {
    name: 'Druid', plural: 'Druids',
    blurb: 'Group-discount lightning: three enemies for the price of one bolt.',
    lore: 'A hooded forest wizard whose bolt hops between three enemies like gossip at a dinner party. Between casts he tends the wounded and complains about hedge maintenance.',
    deaths: [
      'Tell the mistletoe I am sorry.',
      'The hedges will grow wild.',
      'Lightning, you let me down.',
    ],
    taunts: [
      'Stand close together. It is more efficient.',
      'Lightning loves a crowd.',
    ],
    codexJoke: 'Chain 3. Heals 15 hp only when nobody is fighting. Awkward at parties.',
  },
  warhound: {
    name: 'Warhound', plural: 'Warhounds',
    blurb: 'A very good boy with a very bad bite. Stronger in packs.',
    lore: 'Mastiff trained for war. Does not understand flags, strategy or why people are shouting, but is wholly committed to the nearest person who looks suspicious. Cannot be bribed with coin; easily bribed with sausage.',
    deaths: [
      'Arf. (Tell them I was a good boy.)',
      'Woof. (I regret nothing, except the cat.)',
      'Arf. (Where is my sausage?)',
    ],
    taunts: [
      'WOOF! (Translation: you have a nice face.)',
      'Bark bark bark! (I forgot why. Bark.)',
    ],
    codexJoke: 'Pack bonus: +8% damage per nearby hound, max +40%. Good boy: 100%.',
  },
  chieftain: {
    name: 'Chieftain', plural: 'Chieftains',
    blurb: 'A moustache with a clan attached. Blows the horn once; everyone hurries.',
    lore: 'Elected by a vote that was ninety-four percent clapping. Carries a war horn he may blow once per battle, because the council voted on a limit and then clapped about it.',
    deaths: [
      'Hold the horn for me.',
      'Tell the clan the vote was not rigged.',
      'I demand a recount of my life.',
    ],
    taunts: [
      'By a show of hands, you lose.',
      'The motion is carried. By force.',
    ],
    codexJoke: 'War horn: once per battle. Agenda items remaining: 14.',
  },

  // ---------------- Mythic ----------------
  minotaur: {
    name: 'Minotaur', plural: 'Minotaurs',
    blurb: 'Raised in a maze, so he only knows straight lines and grudges.',
    lore: 'Half man, half bull, entirely finished with mazes. Charges in straight lines because corners were the problem, and has refused to take a left turn since.',
    deaths: [
      'Finally. An exit.',
      'I knew the way out all along!',
      'Left turn. Finally.',
    ],
    taunts: [
      'No more maze! Straight line! Straight line!',
      'Left turns are for cowards. And architects.',
    ],
    codexJoke: 'Bull charge: 12 u, 30 damage, 1 s stun. Turning radius: undefined.',
  },
  cyclops: {
    name: 'Cyclops', plural: 'Cyclopes',
    blurb: 'Throws boulders with one eye and a lot of confidence.',
    lore: 'Ten tons with one eye and a depth perception problem the other monsters have stopped mentioning. Throws boulders at things nearby, but also at things that are not.',
    deaths: [
      'Where did you go? Where are you?',
      'Sun in my eye. The one eye.',
      'Missed. Always missed. Even this.',
    ],
    taunts: [
      'Stand still! I am not sure where you are!',
      'Come out! I cannot see you! I mean: here I am!',
    ],
    codexJoke: '25% of throws land 4-9 u off. 100% of excuses: sun in eye.',
  },
  medusa: {
    name: 'Medusa', plural: 'Medusas',
    blurb: 'Turns enemies into statues. Her garden has never looked better.',
    lore: 'A gorgon whose gaze turns enemies to stone, so her home is full of lifelike statues and her social calendar is empty. The snakes are not a hairstyle; they are a team.',
    deaths: [
      'Finally, someone made eye contact back.',
      'My collection! Dust it weekly!',
      'Do not shatter them. They are lifelike!',
    ],
    taunts: [
      'Look at me. No, really. I insist.',
      'Mirrors? I have heard of them. I fear them.',
    ],
    codexJoke: 'Stone cone 40 degrees, 4 s. Stoned units take double damage from blunt. Mirror: sold separately.',
  },
  centaur_archer: {
    name: 'Centaur Archer', plural: 'Centaur Archers',
    blurb: 'Half horse, half archer, still arguing which half votes.',
    lore: 'A literal combined-arms unit: a horse that shoots, an archer that gallops, and a tailor who has never once got the trousers right. Buys one ticket, eats two lunches.',
    deaths: [
      'Which half of me is dying first?',
      'Tell the horse half I loved it too.',
      'Half of me is galloping away. The other half is staying.',
    ],
    taunts: [
      'Top half: ruthless. Bottom half: oats.',
      'No, I will not give you a ride.',
    ],
    codexJoke: 'Kites at range. Needs two lunches. Pays for one.',
  },
  trojan_horse: {
    name: 'Trojan Horse', plural: 'Trojan Horses',
    blurb: 'A gift. Please accept it. Please do not look inside. Please.',
    lore: 'A giant wooden horse containing six hoplites and a very strong case against accepting presents from strangers. The gift shop is on the lower deck. The gift shop is also full of hoplites.',
    deaths: [
      'Is it safe to come out yet?',
      'We are not ready! Somebody is still in the loo!',
      'Hoplites! Evacuate! Evacuate the horse!',
    ],
    taunts: [
      'It is a gift. For you. Open it. Please.',
      'Nothing to see here. Mostly horse.',
    ],
    codexJoke: 'Contains 6 hoplites, 1 gift shop, 0 receipts. Wood burns 1.6x.',
  },
  sacred_chicken: {
    name: 'Sacred Chicken', plural: 'Sacred Chickens',
    blurb: 'Sacred, small and furious. Do not make it angry. Too late.',
    lore: 'Sacred, which means nobody is allowed to scold her. She noticed in the first week. Gets triple damage when hurt, because in her experience nobody has ever apologised.',
    deaths: [
      'BWAAAK. (Tell the farmer it was him.)',
      'Cluck. Feathers everywhere. Worth it.',
      'Bawk. I regret nothing except the corn.',
    ],
    taunts: [
      'Bawk! (Hello. I am going to peck you nine times.)',
      'PECK. (I am sacred. You are lunch.)',
    ],
    codexJoke: 'Tantrum when hurt: five seconds of triple damage. Dignity: also triple.',
  },
  battle_goat: {
    name: 'Battle Goat', plural: 'Battle Goats',
    blurb: 'The real hero. Wears a tiny helmet. Headbutts armies into next week.',
    lore: 'Armoured goat of unknown origin and total commitment. Never promoted, as no rank has a goat clause, but every veteran quietly knows who actually won the battle.',
    deaths: [
      'Baaah. (Remember me as I was: sturdy.)',
      'Maaa. (The hat stays with me.)',
      'Baa. (I never asked for the helmet.)',
    ],
    taunts: [
      'BAAAH! (Not a threat. A review.)',
      'Maa! (Behind you.)',
    ],
    codexJoke: 'Knockback 12. Rank: none. Credit: none. Hat: yes.',
  },
};

// ---------------- helpers (pure) ----------------
export const UNIT_IDS = Object.keys(UNIT_TEXT);

/** Display names for announcer slots and kill feed: {id: {name, plural}} */
export const UNIT_NAMES = Object.fromEntries(UNIT_IDS.map((id) => [id, { name: UNIT_TEXT[id].name, plural: UNIT_TEXT[id].plural }]));

/** Safe display name for any def id, including custom soldiers and unknown ids. */
export function unitName(id, plural) {
  const n = UNIT_NAMES[id];
  if (n) return plural ? n.plural : n.name;
  const s = String(id || 'soldier').replace(/^cs_/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return plural ? s + 's' : s;
}

export function unitText(id) { return UNIT_TEXT[id] || null; }

function pickOne(arr, rng) {
  const r = typeof rng === 'function' ? rng() : rng && typeof rng.next === 'function' ? rng.next() : 0;
  return arr[Math.floor(r * arr.length) % arr.length];
}
/** One last-words quote for a dying unit (rng: function or object with next()). */
export function pickDeath(id, rng) { const t = UNIT_TEXT[id]; return t ? pickOne(t.deaths, rng) : null; }
/** One taunt for a unit (rng: function or object with next()). */
export function pickTaunt(id, rng) { const t = UNIT_TEXT[id]; return t ? pickOne(t.taunts, rng) : null; }
