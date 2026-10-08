# tools_flaky_browser_tests (TOOLS-GATE -> UI owner of tests/ui, tests/ui_battle)

Measured on 2026-10-08 while building the lane scheduler (box load average 4-10 because other agents were running; every number below is a real run of `node tools/gate.mjs`).

## 1. `tests/ui/ui4_keyboard.test.mjs`: "first Tab on quick lands on a control inside the page"

Fails almost always: 11 of 12 direct runs (shared tree, a gate snapshot, and the v8 baseline worktree `.cache/baseline/ancient-v8`, niced and not niced, load 2.5-10), so it is not a regression of the working tree; it passed once, at 09:32 with load 4.0.
Diagnosis (instrumented copy of lines 1-19, 2026-10-08 10:40): at the moment of the first Tab on the first screen `document.hasFocus()` is `false`, `document.visibilityState` is `visible`, `document.activeElement` is `<body>`; the later iterations (settings, codex, credits) have focus and pass. A mouse click, a Shift key press, `window.focus()` and `page.bringToFront()` before the loop did NOT change it (all four still fail), so the page never receives window focus in this environment before that Tab; a standalone script that does `goto('quick')`, waits 800 ms and presses Tab passes with `hasFocus: true`. This points at the headless-Chromium focus emulation of the freshly opened page (environment) rather than at the product.
Original reading, kept for the record: lines 11-16 wait a fixed `800 ms` for "Quick Battle moves focus to its big button after 80 ms", then blur and press Tab. When Chromium/SwiftShader is starved, the focus move lands after the blur, or the Tab arrives before the page has focus, and `document.activeElement` is `<body>`.
Request: find out why the first page of a fresh headless context has no window focus here (also tried and failing: `Emulation.setFocusEmulationEnabled` through a CDP session before the loop) and make the test establish focus deterministically (or assert `document.hasFocus()` first and fail with that message instead of the Tab message). Until then this test is an environment-dependent red in the old gate as well; it is not a product regression (the v8 baseline worktree behaves the same).
Gate handling until then: the file carries `// @serial` (added by TOOLS-GATE, one comment line, no other change): it runs on the serial worker and is re-run alone before it can turn the gate red.

## 2. `tests/ui/x2_a11y.test.mjs`: intermittent hang

Twice in a gate run (load 3-8) the test stalled until the 600 s step timeout inside `L.ev(async () => { K.textModal(...) ... })` (lines 41-45: `page.evaluate` that awaits a promise resolved by a click after `await new Promise(r => setTimeout(r, 300))`); the same file passes in 20 s directly and in the next gate run. Frequency measured with `timeout 50 node tests/ui/x2_a11y.test.mjs` x5 in the v8 BASELINE worktree: 2 hangs of 5 (rc=124), 3 passes in 20 s; in the working tree 0 hangs of 5 directly but 2 of 4 gate runs hung (3 of 5 attempts, counting the alone re-run; same content in a snapshot, detached process group, and also 1 of 3 hung when launched by a plain script with the gate's environment). So it is a pre-existing intermittent hang of the test/product pair, not a regression of this program. The Chromium GPU process was at 200% CPU the whole time (SwiftShader).
Request: give those evaluates a bounded wait (`Promise.race` with a 5 s reject) so a stuck modal fails fast with a message instead of hanging; investigate whether `K.textModal` can leave its promise unresolved when a second modal opens during the 300 ms wait.
Gate handling until then: any test that hits its time limit (6x its median runtime, minimum 90 s, maximum 600 s) is re-run alone once (`retryOnTimeout`) before it counts as red.

No `src/**` change is requested.
