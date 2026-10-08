Golden fixture of `tools/report.mjs` (test `VF-T13`, label `report_golden_fixture`).

- `criteria.json`, `negctl.json`, `er_table.json`, `honesty.md`, `cuts.md`: the inputs (a hand-built run with one PASS, FAIL, U2, U3, U1, PANEL and a missing member).
- `expected.md`: the report the generator must produce from them, byte for byte.

If a change to the report layout is intended: `UPDATE_REPORT_FIXTURE=1 node tests/verify/criteria.test.mjs`, then read the diff of `expected.md` before committing.
