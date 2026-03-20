describe("Round progression", function () {
  // Deterministic random: cycles through given characters
  function seededRandom(chars) {
    var i = 0;
    var charset = SimonGame.CHARSET;
    return function () {
      var ch = chars[i % chars.length];
      i++;
      var idx = charset.indexOf(ch);
      return (idx + 0.5) / charset.length;
    };
  }

  it("createState initialises with empty sequence and round 0", function () {
    var state = SimonGame.createState();
    expect(SimonGame.getSequence(state)).toEqual([]);
    expect(SimonGame.getRound(state)).toBe(0);
    expect(SimonGame.isGameOver(state)).toBe(false);
  });

  it("advanceRound increments round to 1 on first call", function () {
    var state = SimonGame.createState({ randomFn: seededRandom(["E"]) });
    SimonGame.advanceRound(state);
    expect(SimonGame.getRound(state)).toBe(1);
  });

  it("advanceRound grows the sequence each round", function () {
    var state = SimonGame.createState({ randomFn: seededRandom(["A", "B", "C"]) });
    SimonGame.advanceRound(state);
    expect(SimonGame.getSequence(state).length).toBe(1);

    SimonGame.advanceRound(state);
    expect(SimonGame.getSequence(state).length).toBe(2);

    SimonGame.advanceRound(state);
    expect(SimonGame.getSequence(state).length).toBe(3);
  });

  it("sequence preserves earlier characters as it grows", function () {
    var state = SimonGame.createState({ randomFn: seededRandom(["E", "T", "A"]) });
    SimonGame.advanceRound(state);
    expect(SimonGame.getSequence(state)).toEqual(["E"]);

    SimonGame.advanceRound(state);
    expect(SimonGame.getSequence(state)).toEqual(["E", "T"]);

    SimonGame.advanceRound(state);
    expect(SimonGame.getSequence(state)).toEqual(["E", "T", "A"]);
  });

  it("advanceRound resets inputIndex for next round", function () {
    var state = SimonGame.createState({ randomFn: seededRandom(["E", "T"]) });
    SimonGame.advanceRound(state);
    SimonGame.checkLetter(state, "."); // complete round 1
    SimonGame.advanceRound(state);
    // inputIndex should be 0 — first letter of sequence is E
    var r = SimonGame.checkLetter(state, "."); // E
    expect(r).toBe(SimonGame.Result.LETTER_CORRECT);
  });

  it("full three-round game progression works end to end", function () {
    var state = SimonGame.createState({ randomFn: seededRandom(["E", "T", "A"]) });

    // Round 1: ["E"]
    SimonGame.advanceRound(state);
    expect(SimonGame.getRound(state)).toBe(1);
    expect(SimonGame.checkLetter(state, ".")).toBe(SimonGame.Result.ROUND_COMPLETE);

    // Round 2: ["E", "T"]
    SimonGame.advanceRound(state);
    expect(SimonGame.getRound(state)).toBe(2);
    expect(SimonGame.checkLetter(state, ".")).toBe(SimonGame.Result.LETTER_CORRECT);
    expect(SimonGame.checkLetter(state, "-")).toBe(SimonGame.Result.ROUND_COMPLETE);

    // Round 3: ["E", "T", "A"]
    SimonGame.advanceRound(state);
    expect(SimonGame.getRound(state)).toBe(3);
    expect(SimonGame.checkLetter(state, ".")).toBe(SimonGame.Result.LETTER_CORRECT);
    expect(SimonGame.checkLetter(state, "-")).toBe(SimonGame.Result.LETTER_CORRECT);
    expect(SimonGame.checkLetter(state, ".-")).toBe(SimonGame.Result.ROUND_COMPLETE);
  });

  it("getSequence returns a copy, not the internal array", function () {
    var state = SimonGame.createState({ randomFn: seededRandom(["E"]) });
    SimonGame.advanceRound(state);
    var seq = SimonGame.getSequence(state);
    seq.push("X"); // mutate the copy
    expect(SimonGame.getSequence(state)).toEqual(["E"]);
  });
});
