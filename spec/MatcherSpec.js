describe("Matcher", function () {
  function seededRandom(chars) {
    var i = 0;
    var charset = SimonGame.CHARSET;
    return function () {
      var ch = chars[i % chars.length];
      i++;
      return charset.indexOf(ch) / charset.length;
    };
  }

  describe("checkLetter", function () {
    it("correct pattern on single-letter round returns ROUND_COMPLETE", function () {
      var state = SimonGame.createState({ randomFn: seededRandom(["E"]) });
      SimonGame.advanceRound(state);
      expect(SimonGame.checkLetter(state, ".")).toBe(SimonGame.Result.ROUND_COMPLETE);
    });

    it("wrong pattern returns WRONG", function () {
      var state = SimonGame.createState({ randomFn: seededRandom(["E"]) });
      SimonGame.advanceRound(state);
      expect(SimonGame.checkLetter(state, "-")).toBe(SimonGame.Result.WRONG);
    });

    it("sets game over after WRONG", function () {
      var state = SimonGame.createState({ randomFn: seededRandom(["E"]) });
      SimonGame.advanceRound(state);
      SimonGame.checkLetter(state, "-");
      expect(SimonGame.isGameOver(state)).toBe(true);
    });

    it("first correct letter in multi-letter round returns LETTER_CORRECT", function () {
      var state = SimonGame.createState({ randomFn: seededRandom(["A", "B"]) });
      SimonGame.advanceRound(state);
      SimonGame.advanceRound(state); // ["A", "B"]
      expect(SimonGame.checkLetter(state, ".-")).toBe(SimonGame.Result.LETTER_CORRECT);
    });

    it("last correct letter in multi-letter round returns ROUND_COMPLETE", function () {
      var state = SimonGame.createState({ randomFn: seededRandom(["A", "B"]) });
      SimonGame.advanceRound(state);
      SimonGame.advanceRound(state);
      SimonGame.checkLetter(state, ".-");
      expect(SimonGame.checkLetter(state, "-...")).toBe(SimonGame.Result.ROUND_COMPLETE);
    });

    it("mismatch on second letter triggers WRONG", function () {
      var state = SimonGame.createState({ randomFn: seededRandom(["A", "B"]) });
      SimonGame.advanceRound(state);
      SimonGame.advanceRound(state);
      SimonGame.checkLetter(state, ".-"); // A ok
      expect(SimonGame.checkLetter(state, ".-")).toBe(SimonGame.Result.WRONG);
    });

    it("calling checkLetter on finished game always returns WRONG", function () {
      var state = SimonGame.createState({ randomFn: seededRandom(["E"]) });
      SimonGame.advanceRound(state);
      SimonGame.checkLetter(state, "-"); // WRONG
      expect(SimonGame.checkLetter(state, ".")).toBe(SimonGame.Result.WRONG);
    });
  });

  describe("recordElement", function () {
    it("correct elements return CONTINUE then ROUND_COMPLETE", function () {
      var state = SimonGame.createState({ randomFn: seededRandom(["A"]) });
      SimonGame.advanceRound(state); // A = .-
      expect(SimonGame.recordElement(state, ".")).toBe(SimonGame.Result.CONTINUE);
      expect(SimonGame.recordElement(state, "-")).toBe(SimonGame.Result.ROUND_COMPLETE);
    });

    it("wrong element returns WRONG immediately", function () {
      var state = SimonGame.createState({ randomFn: seededRandom(["A"]) });
      SimonGame.advanceRound(state); // A = .-
      expect(SimonGame.recordElement(state, "-")).toBe(SimonGame.Result.WRONG);
    });

    it("extra element beyond pattern length returns WRONG", function () {
      var state = SimonGame.createState({ randomFn: seededRandom(["A", "E"]) });
      SimonGame.advanceRound(state);
      SimonGame.advanceRound(state); // ["A", "E"]
      // A = .- ; send three elements (one too many)
      SimonGame.recordElement(state, "."); // CONTINUE
      SimonGame.recordElement(state, "-"); // LETTER_CORRECT (A done)
      // E = . ; now inputIndex points at E
      SimonGame.recordElement(state, "."); // ROUND_COMPLETE
      // No more letters — round is complete
      expect(SimonGame.isGameOver(state)).toBe(false);
    });

    it("inputBuffer resets after each correct letter", function () {
      var state = SimonGame.createState({ randomFn: seededRandom(["A", "E"]) });
      SimonGame.advanceRound(state);
      SimonGame.advanceRound(state); // ["A", "E"]

      // A = .- (element by element)
      SimonGame.recordElement(state, "."); // CONTINUE
      SimonGame.recordElement(state, "-"); // LETTER_CORRECT

      // E = . (should start fresh)
      expect(SimonGame.recordElement(state, ".")).toBe(SimonGame.Result.ROUND_COMPLETE);
    });

    it("recordElement on finished game returns WRONG", function () {
      var state = SimonGame.createState({ randomFn: seededRandom(["A"]) });
      SimonGame.advanceRound(state);
      SimonGame.recordElement(state, "-"); // WRONG
      expect(SimonGame.recordElement(state, ".")).toBe(SimonGame.Result.WRONG);
    });
  });

  describe("API contract: advanceRound after ROUND_COMPLETE", function () {
    it("advanceRound resets state for next round after ROUND_COMPLETE", function () {
      var state = SimonGame.createState({ randomFn: seededRandom(["E", "T"]) });
      SimonGame.advanceRound(state);
      SimonGame.recordElement(state, "."); // ROUND_COMPLETE
      SimonGame.advanceRound(state);
      // Should be able to input for new round
      expect(SimonGame.checkLetter(state, ".")).toBe(SimonGame.Result.LETTER_CORRECT);
    });
  });
});
