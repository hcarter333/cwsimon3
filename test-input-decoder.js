/**
 * Tests for SimonGame.createInputDecoder()
 *
 * Run: node test-input-decoder.js
 * No dependencies required — uses Node assert.
 */
var assert = require("assert");
var SimonGame = require("./simon-game-logic");

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log("  ✓ " + name);
  } catch (e) {
    failed++;
    console.log("  ✗ " + name);
    console.log("    " + e.message);
  }
}

// Helper: feed sideIds then trigger boundary, return decoded letter
function decode(sideIds) {
  var result = null;
  var decoder = SimonGame.createInputDecoder({
    onDecode: function (letter) { result = letter; }
  });
  sideIds.forEach(function (id) { decoder.element(id); });
  decoder.letterBoundary();
  return result;
}

console.log("\ncreateInputDecoder — basic letters");

test("dit → E", function () {
  assert.strictEqual(decode([1]), "E");
});

test("dah → T", function () {
  assert.strictEqual(decode([3]), "T");
});

test("dit-dah → A", function () {
  assert.strictEqual(decode([1, 3]), "A");
});

test("dah-dit-dit-dit → B", function () {
  assert.strictEqual(decode([3, 1, 1, 1]), "B");
});

test("dah-dit-dah-dit → C", function () {
  assert.strictEqual(decode([3, 1, 3, 1]), "C");
});

test("dit-dit → I", function () {
  assert.strictEqual(decode([1, 1]), "I");
});

test("dit-dit-dit → S", function () {
  assert.strictEqual(decode([1, 1, 1]), "S");
});

test("dit-dit-dit-dit → H", function () {
  assert.strictEqual(decode([1, 1, 1, 1]), "H");
});

test("dah-dah → M", function () {
  assert.strictEqual(decode([3, 3]), "M");
});

test("dah-dah-dah → O", function () {
  assert.strictEqual(decode([3, 3, 3]), "O");
});

console.log("\ncreateInputDecoder — all digits");

test("digit 0: dah×5", function () {
  assert.strictEqual(decode([3, 3, 3, 3, 3]), "0");
});

test("digit 1: dit dah×4", function () {
  assert.strictEqual(decode([1, 3, 3, 3, 3]), "1");
});

test("digit 5: dit×5", function () {
  assert.strictEqual(decode([1, 1, 1, 1, 1]), "5");
});

test("digit 9: dah×4 dit", function () {
  assert.strictEqual(decode([3, 3, 3, 3, 1]), "9");
});

console.log("\ncreateInputDecoder — invalid patterns");

test("unrecognised pattern returns null", function () {
  assert.strictEqual(decode([1, 1, 1, 1, 1, 1]), null);
});

test("empty boundary (no elements) does not fire onDecode", function () {
  var called = false;
  var decoder = SimonGame.createInputDecoder({
    onDecode: function () { called = true; }
  });
  decoder.letterBoundary();
  assert.strictEqual(called, false);
});

console.log("\ncreateInputDecoder — sideId as string");

test("string '1' treated as dit", function () {
  assert.strictEqual(decode(["1"]), "E");
});

test("string '3' treated as dah", function () {
  assert.strictEqual(decode(["3"]), "T");
});

test("unrecognised sideId (e.g. 2) is ignored", function () {
  assert.strictEqual(decode([2]), null);  // empty pattern on boundary → no call
  // Actually, sideId 2 is ignored so pattern stays empty, boundary won't fire onDecode
  var called = false;
  var decoder = SimonGame.createInputDecoder({
    onDecode: function () { called = true; }
  });
  decoder.element(2);
  decoder.letterBoundary();
  assert.strictEqual(called, false);
});

console.log("\ncreateInputDecoder — multi-letter sequence");

test("decode two letters in sequence (A then B)", function () {
  var letters = [];
  var decoder = SimonGame.createInputDecoder({
    onDecode: function (letter) { letters.push(letter); }
  });
  // A: dit-dah
  decoder.element(1);
  decoder.element(3);
  decoder.letterBoundary();
  // B: dah-dit-dit-dit
  decoder.element(3);
  decoder.element(1);
  decoder.element(1);
  decoder.element(1);
  decoder.letterBoundary();
  assert.deepStrictEqual(letters, ["A", "B"]);
});

console.log("\ncreateInputDecoder — currentPattern and reset");

test("currentPattern reflects accumulated elements", function () {
  var decoder = SimonGame.createInputDecoder();
  decoder.element(1);
  decoder.element(3);
  assert.strictEqual(decoder.currentPattern(), ".-");
});

test("reset clears the pattern", function () {
  var decoder = SimonGame.createInputDecoder();
  decoder.element(1);
  decoder.element(3);
  decoder.reset();
  assert.strictEqual(decoder.currentPattern(), "");
});

test("letterBoundary clears the pattern", function () {
  var decoder = SimonGame.createInputDecoder({
    onDecode: function () {}
  });
  decoder.element(1);
  decoder.letterBoundary();
  assert.strictEqual(decoder.currentPattern(), "");
});

console.log("\ncreateInputDecoder — onDecode receives pattern");

test("onDecode gets (letter, pattern) arguments", function () {
  var gotPattern = null;
  var decoder = SimonGame.createInputDecoder({
    onDecode: function (letter, pattern) { gotPattern = pattern; }
  });
  decoder.element(1);
  decoder.element(3);
  decoder.letterBoundary();
  assert.strictEqual(gotPattern, ".-");
});

// ── Summary ───────────────────────────────────────────────────────
console.log("\n" + passed + " passed, " + failed + " failed\n");
process.exit(failed > 0 ? 1 : 0);
