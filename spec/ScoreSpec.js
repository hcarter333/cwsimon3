describe("Score", function () {
  function seededRandom(chars) {
    var i = 0;
    var charset = SimonGame.CHARSET;
    return function () {
      var ch = chars[i % chars.length];
      i++;
      return (charset.indexOf(ch) + 0.5) / charset.length;
    };
  }

  it("score is 0 before any rounds", function () {
    var state = SimonGame.createState();
    expect(SimonGame.getScore(state)).toBe(0);
  });

  it("score is 0 during first round (no completed rounds yet)", function () {
    var state = SimonGame.createState({ randomFn: seededRandom(["E"]) });
    SimonGame.advanceRound(state);
    expect(SimonGame.getScore(state)).toBe(0);
  });

  it("score reflects completed rounds during play", function () {
    var state = SimonGame.createState({ randomFn: seededRandom(["E", "T", "A"]) });

    SimonGame.advanceRound(state);
    expect(SimonGame.getScore(state)).toBe(0); // round 1 in progress

    SimonGame.checkLetter(state, "."); // complete round 1
    SimonGame.advanceRound(state);
    expect(SimonGame.getScore(state)).toBe(1); // round 2 in progress

    SimonGame.checkLetter(state, "."); // E
    SimonGame.checkLetter(state, "-"); // T — complete round 2
    SimonGame.advanceRound(state);
    expect(SimonGame.getScore(state)).toBe(2); // round 3 in progress
  });

  it("score after failure equals completed rounds", function () {
    var state = SimonGame.createState({ randomFn: seededRandom(["E", "T"]) });

    SimonGame.advanceRound(state);
    SimonGame.checkLetter(state, "."); // complete round 1
    SimonGame.advanceRound(state); // round 2: ["E", "T"]
    SimonGame.checkLetter(state, "-"); // WRONG on first letter

    expect(SimonGame.getScore(state)).toBe(1);
    expect(SimonGame.isGameOver(state)).toBe(true);
  });

  it("score is 0 if player fails on first round", function () {
    var state = SimonGame.createState({ randomFn: seededRandom(["E"]) });
    SimonGame.advanceRound(state);
    SimonGame.checkLetter(state, "-"); // WRONG immediately

    expect(SimonGame.getScore(state)).toBe(0);
    expect(SimonGame.isGameOver(state)).toBe(true);
  });

  it("score is accurate after 5 successful rounds", function () {
    var state = SimonGame.createState({ randomFn: seededRandom(["E", "T", "E", "T", "E"]) });

    for (var round = 1; round <= 5; round++) {
      var seq = SimonGame.advanceRound(state);
      for (var j = 0; j < seq.length; j++) {
        var pattern = SimonGame.MORSE_TABLE[seq[j]];
        SimonGame.checkLetter(state, pattern);
      }
    }

    // After 5 completed rounds, score = 5 once we advance to round 6
    SimonGame.advanceRound(state);
    expect(SimonGame.getScore(state)).toBe(5);
  });

  it("isGameOver is false during active play", function () {
    var state = SimonGame.createState({ randomFn: seededRandom(["E"]) });
    SimonGame.advanceRound(state);
    expect(SimonGame.isGameOver(state)).toBe(false);
  });

  it("isGameOver is true after wrong input", function () {
    var state = SimonGame.createState({ randomFn: seededRandom(["E"]) });
    SimonGame.advanceRound(state);
    SimonGame.checkLetter(state, "-");
    expect(SimonGame.isGameOver(state)).toBe(true);
  });
});
