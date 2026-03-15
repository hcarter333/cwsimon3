# Tests

## Prerequisites

- **Node.js** (any recent LTS version)
- **npm** (comes with Node.js)

Install project dependencies:

```bash
npm install
```

This installs Playwright and the `serve` static file server.

Install Playwright browsers (first time only):

```bash
npx playwright install
```

---

## Test Suites

### 1. Node Unit Tests (assert-based)

Pure logic tests that run in Node with zero browser dependencies. They use
Node's built-in `assert` module and a lightweight custom test runner.

#### test-input-decoder.js

Tests the `SimonGame.createInputDecoder()` Morse input decoder.

**Run:**

```bash
node test-input-decoder.js
```

**Test cases:**

| # | Test | Verifies |
|---|------|----------|
| 1 | dit -> E | Single dit decodes to letter E |
| 2 | dah -> T | Single dah decodes to letter T |
| 3 | dit-dah -> A | Two-element pattern decodes correctly |
| 4 | dah-dit-dit-dit -> B | Four-element pattern decodes correctly |
| 5 | dah-dit-dah-dit -> C | Mixed dit/dah pattern decodes correctly |
| 6 | dit-dit -> I | Two-dit pattern decodes correctly |
| 7 | dit-dit-dit -> S | Three-dit pattern decodes correctly |
| 8 | dit-dit-dit-dit -> H | Four-dit pattern decodes correctly |
| 9 | dah-dah -> M | Two-dah pattern decodes correctly |
| 10 | dah-dah-dah -> O | Three-dah pattern decodes correctly |
| 11 | digit 0: dah x5 | Five dahs decode to 0 |
| 12 | digit 1: dit dah x4 | dit + four dahs decode to 1 |
| 13 | digit 5: dit x5 | Five dits decode to 5 |
| 14 | digit 9: dah x4 dit | Four dahs + dit decode to 9 |
| 15 | unrecognised pattern returns null | Six dits (invalid) returns null |
| 16 | empty boundary does not fire onDecode | No elements before boundary = no callback |
| 17 | string '1' treated as dit | String sideId coerced correctly |
| 18 | string '3' treated as dah | String sideId coerced correctly |
| 19 | unrecognised sideId (e.g. 2) is ignored | Invalid sideId produces no output |
| 20 | decode two letters in sequence (A then B) | Multi-letter sequential decoding works |
| 21 | currentPattern reflects accumulated elements | Pattern accumulates dit/dah symbols |
| 22 | reset clears the pattern | Reset empties the buffer |
| 23 | letterBoundary clears the pattern | Boundary resets for next letter |
| 24 | onDecode gets (letter, pattern) arguments | Callback receives both letter and raw pattern |

#### test-matcher.js

Tests sequence matching (`checkLetter`, `recordElement`), round progression
(`advanceRound`), scoring (`getScore`), and decoder+matcher integration.

**Run:**

```bash
node test-matcher.js
```

**Test cases:**

| # | Test | Verifies |
|---|------|----------|
| 1 | correct pattern returns ROUND_COMPLETE for 1-letter sequence | Single-letter round completes on correct input |
| 2 | wrong pattern returns WRONG | Incorrect Morse pattern triggers failure |
| 3 | game is over after WRONG | `isGameOver` returns true after wrong answer |
| 4 | first correct letter returns LETTER_CORRECT | Partial match in multi-letter round |
| 5 | second correct letter completes round | Full match completes multi-letter round |
| 6 | mismatch on second letter triggers WRONG | Late mismatch still fails |
| 7 | advanceRound resets inputIndex | Index resets between rounds |
| 8 | full two-round progression | Complete round 1 -> round 2 flow |
| 9 | score reflects completed rounds | Score increments after each completed round |
| 10 | score after failure equals completed rounds | Score counts only successful rounds |
| 11 | correct elements return CONTINUE then ROUND_COMPLETE | Element-by-element matching for recordElement |
| 12 | wrong element returns WRONG immediately | Bad element triggers instant failure |
| 13 | caller must advanceRound after ROUND_COMPLETE | API contract: advanceRound resets state |
| 14 | decoder onDecode pattern feeds directly into checkLetter | Decoder + matcher integration path |
| 15 | decoder with wrong letter triggers WRONG via checkLetter | Integration: wrong input ends game |
| 16 | decoder reset clears partial input between rounds | Integration: clean state across rounds |
| 17 | checkLetter on finished game always returns WRONG | Finished game rejects all input |
| 18 | unrecognised pattern (null letter) treated as wrong | Garbage pattern fails gracefully |
| 19 | inputBuffer resets after each correct letter | Buffer cleanup between letters |

### 2. Playwright Browser Tests

End-to-end tests that launch a local static server and drive the game UI in a
headless browser.

#### tests/smoke.spec.js

**Run:**

```bash
npx playwright test
```

Or with a visible browser:

```bash
npx playwright test --headed
```

The Playwright config (`playwright.config.js`) automatically starts a local
server on port 3737 via `npx serve . -l 3737`.

**Test cases:**

| # | Test | Verifies |
|---|------|----------|
| 1 | page loads without JS errors | HTML/JS loads cleanly with no console errors |
| 2 | Start Game button begins a round | Clicking Start Game creates `_simonState` |
| 3 | letter overlay appears during playback | Morse overlay gets `visible` class during playback |
| 4 | lose flow shows modal with rounds count and restart button | Lose modal displays rounds completed and Play Again button |
| 5 | Play Again button restarts game | Clicking Play Again hides modal and starts fresh game |
| 6 | settings gear opens panel and X closes it | Settings panel toggles open/closed |
| 7 | speed controls present in settings panel | WPM and word gap controls are visible and functional |
| 8 | tx haptics toggle exists in settings and defaults to Off | Toggle button present and shows "Off" by default |
| 9 | tx haptics toggle state persists after settings close/reopen | Toggling to On survives panel close/reopen |
| 10 | tx haptics on triggers navigator.vibrate during playback | navigator.vibrate called during Morse playback when enabled |
| 11 | tx haptics off does not trigger navigator.vibrate during playback | navigator.vibrate not called when toggle is off (default) |
| 12 | Letter Overlay toggle exists in settings and defaults to On | Toggle button present and shows "On" by default |
| 13 | Letter Overlay off suppresses overlay during playback | #morseOverlay never gets .visible class when toggle is off |
| 14 | Letter Overlay on shows overlay during playback | #morseOverlay gets .visible class during playback (default on) |
| 15 | Letter Overlay toggle state persists after settings close/reopen | Toggling to Off survives panel close/reopen |

---

## Smoke Suite (must pass before push)

These are the tests that **must pass** before pushing code. Run all three:

```bash
node test-input-decoder.js && node test-matcher.js && npx playwright test
```

**All 58 tests** (24 decoder + 19 matcher + 15 Playwright) constitute the smoke
suite. A failure in any test blocks the push.

Quick check (Node tests only, no browser needed):

```bash
node test-input-decoder.js && node test-matcher.js
```

This runs the 43 logic tests in under a second and catches most regressions
without requiring Playwright browsers to be installed.

Note: tx haptics tests (8-11) and letter overlay tests (12-15) require a
browser environment for `navigator.vibrate` and localStorage APIs.
