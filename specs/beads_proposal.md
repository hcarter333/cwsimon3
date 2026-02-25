**Revised Review (with your clarifications)**

**Captured note for later thinking**
- Add a small backlog bead/note: `Design note: "round progression" as a learning/curriculum pattern (LLM parallel)` so you can revisit the concept after implementation planning.

**Resolved spec decisions (now fixed)**
- Score uses `rounds completed` (not “letters correct” as primary score wording).
- Letter overlay fades when that letter’s Morse audio finishes (not on a fixed timer from display start).
- WPM step rule: `+1 WPM => UNIT_MS - 5`, `-1 WPM => UNIT_MS + 5`.
- Losing sound is Morse `"HI HI"` at a lower tone than normal game playback.
- Repo remains script-tag/no-build only.
- Jasmine: only for browserless `.js` game-logic modules.
- Playwright: only for locally launched static pages.
- No CI/repo actions requirement; testing is local-only.

**Updated convoy-ready bead set**

1. `epic` (P1): CW Simon game
2. `task` (P1): Define browserless game state + round progression logic (sequence growth, rounds completed)
3. `task` (P1): Implement random chooser for A-Z/0-9 using Morse table-compatible symbols
4. `task` (P1): Implement sequence playback orchestration (replay prior symbols, append one new symbol)
5. `task` (P1): Implement Morse playback adapter using existing `sendMorseMessage` / keyer hooks
6. `task` (P1): Implement per-letter overlay display that fades when each letter audio ends
7. `task` (P1): Instrument existing iambic keyer to emit input events without changing touch behavior/layout
8. `task` (P1): Decode iambic input into `.` / `-` symbol streams and letter boundaries
9. `task` (P1): Match user input against expected sequence in order; advance round on success
10. `task` (P1): Implement lose flow (stop game, compute/display `rounds completed`, OK restart)
11. `task` (P2): Implement losing sound `"HI HI"` in Morse at lower tone + mute toggle
12. `task` (P2): Add settings panel shell (gear open, X close)
13. `task` (P2): Add speed controls UI (WPM +/- buttons, `UNIT_MS` step of 5, separate word-gap control)
14. `task` (P1): Extract/author browserless game-logic `.js` module(s) for Jasmine testing
15. `task` (P2): Write Jasmine smoke tests for round progression / chooser / matcher / score transitions
16. `task` (P2): Write Playwright local static-page smoke tests (start, replay round, lose, restart, settings)
17. `task` (P2): Document local test cases and local smoke run instructions (`tests.md`)
18. `chore` (P4): Design note - round progression as curriculum/LLM parallel (idea capture for later)

**Dependency shape (revised)**
- `2,3,14` start immediately in parallel.
- `4` depends on `2,3`.
- `5` depends on `4`.
- `6` depends on `5`.
- `7` can start early in parallel with `2-5`.
- `8` depends on `7`.
- `9` depends on `4,8`.
- `10` depends on `9`.
- `11` depends on `5,10` (needs playback path + lose event).
- `12` can start in parallel with `5/7`.
- `13` depends on `12` and touches `5`.
- `15` depends on `2,3,4,9,10,14` (or can be split earlier if you want incremental test beads).
- `16` depends on `6,9,10,12,13`.
- `17` depends on `15,16`.
- `18` independent.

**Convoy split (revised)**
1. Convoy A: `2,3,14` (pure logic foundation)
2. Convoy B: `4,5,6` (playback + overlay timing behavior)
3. Convoy C: `7,8` (iambic capture/decode integration)
4. Convoy D: `9,10,11,13` (gameplay correctness, lose flow, sound, speed config)
5. Convoy E: `12,16,17` (settings shell + local browser QA/docs)
6. Convoy F (optional/backlog): `18` (idea capture)

**Why this is better than the earlier draft**
- Splits the previous overloaded “checking + lose + score + config + sound” bead into separate convoy-safe tasks.
- Makes your clarified timing/audio/WPM rules explicit in bead scope.
- Aligns testing beads to the script-tag/no-build architecture and local-only execution.

If you want, I can next turn this into concrete `bd create ... --json` commands with acceptance criteria and dependency links.

