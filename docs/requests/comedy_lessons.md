# requests/comedy_lessons.md: results-screen lessons that name things that are not there (COMEDY-EDITOR -> SIM, `src/sim/lessons.js`)

Found by QA round 1 (section 6, minor 5) and reproduced by the comedy editor in the real game and in Node. Evidence: `node` + `tools/lib/harness.mjs` + `src/sim/lessons.js` on any 1v1, or the Quick Battle results screen after almost any battle ("Shields and spears: 0% of the damage", "They brought 0% infantry", "0 soldiers ran away. They were right to.", "By 0:19 only a quarter of us stood" after a 0-of-1 loss).

## Root cause (one place)
`generateLessons` pads the list to three with generic ids whose detector never fired, and it passes made-up numbers for them:

```js
const pads = won ? ['melee_win', 'blitz', 'ranged_win', 'slog'] : ['army_low', 'composition', 'routs', 'slog'];
... vars: { n: 0, t: fmtT(total), pct: 0, role: 'infantry', flank: 'center', def: 'hero' }
```
So a lesson can say "0% of the damage", "0% infantry", "0 soldiers ran away" or "a quarter of us stood" about a battle in which none of that happened. A draw (`winner === -1`) also takes the `!won` branch, so Zeus's draw can say "You lost".

## What HUMOR already did (no code needed from you to be safe)
`content/era_ancient/lesson_text.js` is now **pad-safe**: `army_low`, `routs`, `composition`, `ranged_win`, `melee_win`, `blitz` and `slog` never print `{n}`, `{pct}` or `{role}` and never claim who did the damage, so the padded versions are true after any battle (and the real versions are true too, just less specific). All other templates only come from their own detector and were rewritten so they are true whenever they can be chosen (examples: `cavalry_charge` no longer says "horses", because `charge_hit` also comes from warhounds, giants and goats; `trample` no longer says "elephant", because Cyclopes and the Trojan Horse trample too; `brace_win` no longer claims kills).

## The change (about 6 lines)
1. Pad from the dedicated entries `pad_win_1..3`, `pad_loss_1..3` and `pad_draw_1..3` (already in `lesson_text.js`; slot-free except `{t}`; each is true after any battle and their fixes differ):
```js
const draw = end && end.p.winner === -1;
const pads = draw ? ['pad_draw_1', 'pad_draw_2', 'pad_draw_3'] : won ? ['pad_win_1', 'pad_win_2', 'pad_win_3'] : ['pad_loss_1', 'pad_loss_2', 'pad_loss_3'];
for (const id of pads) { if (picked.length >= 3) break; if (seen.has(id)) continue; seen.add(id); picked.push({ id, score: 0, vars: { t: fmtT(total) } }); }
```
   The `tests/sim/systems.test.mjs` lesson test only needs three lessons with filled templates; it keeps passing.
2. Give the detectors the numbers the specific wordings below need (they are real values there, so no padding can ever misreport them): `army_low` -> `{ t, pct: Math.round(e.p.frac * 100) }`; `routs` -> `{ n: routs }` (already); `composition` -> `{ pct, role }` (already); `ranged_win` / `melee_win` -> `{ pct }` (already).
3. `trample`: count only trampling that hurt the player's side. `world._trample()` emits `{ id, count: 1 }` every 8 ticks per trampler and a scared elephant also tramples its OWN side (`fire_panic`), so `tramples` can currently count the enemy flattening the enemy. Add `team: small.team` to the payload (and to `LOG_FIELDS.trample` in `app/meta.js`) and count `e.p.team === team`.

## Then HUMOR (or whoever holds `lesson_text.js`) restores the specific wordings
Paste these over the pad-safe arrays; they are only true once step 1 and 2 have landed, which is why they are not in the file now.
```
army_low:   text: ['By {t} only {pct}% of us stood. As foretold.', 'At {t} we were down to {pct}%. I said it would be about then.']
routs:      text: ['{n} soldiers ran away. They were right to.', '{n} routed. I did not blame them.']
composition:text: ['They brought {pct}% {role}. I said to bring something for that.', 'The enemy fielded {pct}% {role}. Nobody listened.']
ranged_win: text: ['Your ranged units did {pct}% of the damage. As foretold.', 'The shooters carried it: {pct}% of the damage.']
melee_win:  text: ['The line did {pct}% of the work. I said it would.', 'Shields and spears: {pct}% of the damage. Unsurprising.']
```

## Related, found while reading `lessons.js`
- `stalemate`: `n = Math.round(stale.p.t || 12)` is the idle time at the first warning (12 s); the wording now says exactly that. Fine as is.
- `flank_fold` only fires for `left` or `right` (correct: `center` is not a flank); note `power.js _flank()` returns `center` for most swings, so this lesson is rarer than its score suggests. If you want it to fire more, widen the centre band (`ext * 0.25`), but that also changes the announcer: `big_swing` lines for `center` exist and are funny, so there is no need.
