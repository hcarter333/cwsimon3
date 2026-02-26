/**
 * Tests for sequence matching and round progression logic.
 *
 * Exercises checkLetter(), recordElement(), advanceRound(), and the
 * interplay between createInputDecoder and checkLetter that the
 * browser wiring in pt-cwsimon.js relies on.
 *
 * Run: node test-matcher.js
 */
var assert = require("assert");
var SimonGame = require("./simon-game-logic");

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log("  \u2713 " + name);
  } catch (e) {
    failed++;
    console.log("  \u2717 " + name);
    console.log("    " + e.message);
  }
}

// Deterministic random: cycles through given characters
function seededRandom(chars) {
  var i = 0;
  var charset = SimonGame.CHARSET;
  return function () {
    var ch = chars[i % chars.length];
    i++;
    var idx = charset.indexOf(ch);
    return idx / charset.length;
  };
}

// ── checkLetter: basic matching ──────────────────────────────────────

console.log("\ncheckLetter — correct single-letter round");

test("correct pattern returns ROUND_COMPLETE for 1-letter sequence", function () {
  var state = SimonGame.createState({ randomFn: seededRandom(["E"]) });
  SimonGame.advanceRound(state); // sequence: ["E"]
  var result = SimonGame.checkLetter(state, ".");
  assert.strictEqual(result, SimonGame.Result.ROUND_COMPLETE);
});

test("wrong pattern returns WRONG", function () {
  var state = SimonGame.createState({ randomFn: seededRandom(["E"]) });
  SimonGame.advanceRound(state);
  var result = SimonGame.checkLetter(state, "-");
  assert.strictEqual(result, SimonGame.Result.WRONG);
});

test("game is over after WRONG", function () {
  var state = SimonGame.createState({ randomFn: seededRandom(["E"]) });
  SimonGame.advanceRound(state);
  SimonGame.checkLetter(state, "-");
  assert.strictEqual(SimonGame.isGameOver(state), true);
});

// ── checkLetter: multi-letter sequence ───────────────────────────────

console.log("\ncheckLetter — multi-letter sequence");

test("first correct letter returns LETTER_CORRECT", function () {
  var state = SimonGame.createState({ randomFn: seededRandom(["A", "B"]) });
  SimonGame.advanceRound(state); // ["A"]
  SimonGame.advanceRound(state); // ["A", "B"]
  var r1 = SimonGame.checkLetter(state, ".-");  // A
  assert.strictEqual(r1, SimonGame.Result.LETTER_CORRECT);
});

test("second correct letter completes round", function () {
  var state = SimonGame.createState({ randomFn: seededRandom(["A", "B"]) });
  SimonGame.advanceRound(state);
  SimonGame.advanceRound(state); // ["A", "B"]
  SimonGame.checkLetter(state, ".-");  // A — LETTER_CORRECT
  var r2 = SimonGame.checkLetter(state, "-...");  // B
  assert.strictEqual(r2, SimonGame.Result.ROUND_COMPLETE);
});

test("mismatch on second letter triggers WRONG", function () {
  var state = SimonGame.createState({ randomFn: seededRandom(["A", "B"]) });
  SimonGame.advanceRound(state);
  SimonGame.advanceRound(state);
  SimonGame.checkLetter(state, ".-");  // A ok
  var r2 = SimonGame.checkLetter(state, ".-");  // wrong — expected B
  assert.strictEqual(r2, SimonGame.Result.WRONG);
});

// ── Round advancement ────────────────────────────────────────────────

console.log("\nRound advancement");

test("advanceRound resets inputIndex", function () {
  var state = SimonGame.createState({ randomFn: seededRandom(["E", "T"]) });
  SimonGame.advanceRound(state); // round 1: ["E"]
  SimonGame.checkLetter(state, "."); // ROUND_COMPLETE
  SimonGame.advanceRound(state); // round 2: ["E", "T"]
  // inputIndex should be 0 — first letter is E again
  var r = SimonGame.checkLetter(state, "."); // E
  assert.strictEqual(r, SimonGame.Result.LETTER_CORRECT);
});

test("full two-round progression", function () {
  var state = SimonGame.createState({ randomFn: seededRandom(["E", "T"]) });

  // Round 1: sequence ["E"]
  SimonGame.advanceRound(state);
  assert.strictEqual(SimonGame.getRound(state), 1);
  var r1 = SimonGame.checkLetter(state, ".");
  assert.strictEqual(r1, SimonGame.Result.ROUND_COMPLETE);

  // Round 2: sequence ["E", "T"]
  SimonGame.advanceRound(state);
  assert.strictEqual(SimonGame.getRound(state), 2);
  var r2a = SimonGame.checkLetter(state, ".");
  assert.strictEqual(r2a, SimonGame.Result.LETTER_CORRECT);
  var r2b = SimonGame.checkLetter(state, "-");
  assert.strictEqual(r2b, SimonGame.Result.ROUND_COMPLETE);
});

test("score reflects completed rounds", function () {
  var state = SimonGame.createState({ randomFn: seededRandom(["E", "T", "A"]) });

  SimonGame.advanceRound(state);
  assert.strictEqual(SimonGame.getScore(state), 0); // round 1 in progress

  SimonGame.checkLetter(state, "."); // round 1 complete
  SimonGame.advanceRound(state);
  assert.strictEqual(SimonGame.getScore(state), 1); // round 2 in progress

  SimonGame.checkLetter(state, "."); // E
  SimonGame.checkLetter(state, "-"); // T — round 2 complete
  SimonGame.advanceRound(state);
  assert.strictEqual(SimonGame.getScore(state), 2); // round 3 in progress
});

test("score after failure equals completed rounds", function () {
  var state = SimonGame.createState({ randomFn: seededRandom(["E", "T"]) });
  SimonGame.advanceRound(state);
  SimonGame.checkLetter(state, "."); // round 1 complete
  SimonGame.advanceRound(state);     // round 2: ["E", "T"]
  SimonGame.checkLetter(state, "-"); // WRONG on first letter
  assert.strictEqual(SimonGame.getScore(state), 1);
  assert.strictEqual(SimonGame.isGameOver(state), true);
});

// ── recordElement: element-by-element matching ───────────────────────

console.log("\nrecordElement — element-by-element");

test("correct elements return CONTINUE then ROUND_COMPLETE", function () {
  var state = SimonGame.createState({ randomFn: seededRandom(["A"]) });
  SimonGame.advanceRound(state); // A = .-
  var r1 = SimonGame.recordElement(state, ".");
  assert.strictEqual(r1, SimonGame.Result.CONTINUE);
  var r2 = SimonGame.recordElement(state, "-");
  assert.strictEqual(r2, SimonGame.Result.ROUND_COMPLETE);
});

test("wrong element returns WRONG immediately", function () {
  var state = SimonGame.createState({ randomFn: seededRandom(["A"]) });
  SimonGame.advanceRound(state); // A = .-
  var r = SimonGame.recordElement(state, "-"); // expected .
  assert.strictEqual(r, SimonGame.Result.WRONG);
});

test("caller must advanceRound after ROUND_COMPLETE (API contract)", function () {
  var state = SimonGame.createState({ randomFn: seededRandom(["E"]) });
  SimonGame.advanceRound(state); // E = .
  var r = SimonGame.recordElement(state, "."); // ROUND_COMPLETE
  assert.strictEqual(r, SimonGame.Result.ROUND_COMPLETE);
  // After ROUND_COMPLETE, caller must call advanceRound before more input.
  // Verify advanceRound resets state for next round.
  SimonGame.advanceRound(state);
  assert.strictEqual(state.inputIndex, 0);
  assert.deepStrictEqual(state.inputBuffer, []);
});

// ── Decoder + checkLetter integration ────────────────────────────────

console.log("\nDecoder + checkLetter integration");

test("decoder onDecode pattern feeds directly into checkLetter", function () {
  var state = SimonGame.createState({ randomFn: seededRandom(["A", "B"]) });
  SimonGame.advanceRound(state);
  SimonGame.advanceRound(state); // ["A", "B"]

  var results = [];
  var decoder = SimonGame.createInputDecoder({
    onDecode: function (letter, pattern) {
      results.push(SimonGame.checkLetter(state, pattern));
    }
  });

  // Feed A: dit-dah
  decoder.element(1);
  decoder.element(3);
  decoder.letterBoundary();

  // Feed B: dah-dit-dit-dit
  decoder.element(3);
  decoder.element(1);
  decoder.element(1);
  decoder.element(1);
  decoder.letterBoundary();

  assert.deepStrictEqual(results, [
    SimonGame.Result.LETTER_CORRECT,
    SimonGame.Result.ROUND_COMPLETE
  ]);
});

test("decoder with wrong letter triggers WRONG via checkLetter", function () {
  var state = SimonGame.createState({ randomFn: seededRandom(["T"]) });
  SimonGame.advanceRound(state); // ["T"], T = -

  var results = [];
  var decoder = SimonGame.createInputDecoder({
    onDecode: function (letter, pattern) {
      results.push(SimonGame.checkLetter(state, pattern));
    }
  });

  // Feed E (dit) instead of T (dah)
  decoder.element(1);
  decoder.letterBoundary();

  assert.deepStrictEqual(results, [SimonGame.Result.WRONG]);
  assert.strictEqual(SimonGame.isGameOver(state), true);
});

test("decoder reset clears partial input between rounds", function () {
  var state = SimonGame.createState({ randomFn: seededRandom(["E", "T"]) });
  SimonGame.advanceRound(state); // ["E"]

  var results = [];
  var decoder = SimonGame.createInputDecoder({
    onDecode: function (letter, pattern) {
      results.push(SimonGame.checkLetter(state, pattern));
    }
  });

  // Round 1: E = dit
  decoder.element(1);
  decoder.letterBoundary();
  assert.strictEqual(results[0], SimonGame.Result.ROUND_COMPLETE);

  // Advance to round 2
  SimonGame.advanceRound(state);
  decoder.reset();

  // Round 2: E then T
  decoder.element(1); // dit for E
  decoder.letterBoundary();
  assert.strictEqual(results[1], SimonGame.Result.LETTER_CORRECT);

  decoder.element(3); // dah for T
  decoder.letterBoundary();
  assert.strictEqual(results[2], SimonGame.Result.ROUND_COMPLETE);
});

// ── Edge cases ───────────────────────────────────────────────────────

console.log("\nEdge cases");

test("checkLetter on finished game always returns WRONG", function () {
  var state = SimonGame.createState({ randomFn: seededRandom(["E"]) });
  SimonGame.advanceRound(state);
  SimonGame.checkLetter(state, "-"); // WRONG
  var r = SimonGame.checkLetter(state, ".");
  assert.strictEqual(r, SimonGame.Result.WRONG);
});

test("unrecognised pattern (null letter) treated as wrong", function () {
  var state = SimonGame.createState({ randomFn: seededRandom(["E"]) });
  SimonGame.advanceRound(state);
  // Pattern "......" doesn't match any character and doesn't match E's "."
  var r = SimonGame.checkLetter(state, "......");
  assert.strictEqual(r, SimonGame.Result.WRONG);
});

test("inputBuffer resets after each correct letter", function () {
  var state = SimonGame.createState({ randomFn: seededRandom(["A", "E"]) });
  SimonGame.advanceRound(state);
  SimonGame.advanceRound(state); // ["A", "E"]

  // A = .- (element by element)
  SimonGame.recordElement(state, "."); // CONTINUE
  SimonGame.recordElement(state, "-"); // LETTER_CORRECT (inputBuffer resets)

  // E = . (should start fresh, not carry over from A's buffer)
  var r = SimonGame.recordElement(state, ".");
  assert.strictEqual(r, SimonGame.Result.ROUND_COMPLETE);
});

// ── Summary ──────────────────────────────────────────────────────────
console.log("\n" + passed + " passed, " + failed + " failed\n");
process.exit(failed > 0 ? 1 : 0);
