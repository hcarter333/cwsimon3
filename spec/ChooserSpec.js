describe("Chooser (advanceRound character selection)", function () {
  it("chosen character is from CHARSET (A-Z, 0-9)", function () {
    var state = SimonGame.createState();
    for (var i = 0; i < 20; i++) {
      SimonGame.advanceRound(state);
    }
    var seq = SimonGame.getSequence(state);
    seq.forEach(function (ch) {
      expect(SimonGame.CHARSET).toContain(ch);
    });
  });

  it("CHARSET contains all 26 letters, 10 digits, and punctuation", function () {
    expect(SimonGame.CHARSET.length).toBe(50);
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("").forEach(function (ch) {
      expect(SimonGame.CHARSET).toContain(ch);
    });
    ".,?=-/!'():;\"@".split("").forEach(function (ch) {
      expect(SimonGame.CHARSET).toContain(ch);
    });
  });

  it("multiple calls produce variety (not all same character)", function () {
    // Use real Math.random — over 50 rounds, extremely unlikely all same
    var state = SimonGame.createState();
    for (var i = 0; i < 50; i++) {
      SimonGame.advanceRound(state);
    }
    var seq = SimonGame.getSequence(state);
    var unique = {};
    seq.forEach(function (ch) { unique[ch] = true; });
    expect(Object.keys(unique).length).toBeGreaterThan(1);
  });

  it("seeded randomFn produces deterministic sequence", function () {
    function seededRandom(chars) {
      var i = 0;
      var charset = SimonGame.CHARSET;
      return function () {
        var ch = chars[i % chars.length];
        i++;
        return (charset.indexOf(ch) + 0.5) / charset.length;
      };
    }

    var s1 = SimonGame.createState({ randomFn: seededRandom(["A", "B", "C"]) });
    var s2 = SimonGame.createState({ randomFn: seededRandom(["A", "B", "C"]) });

    for (var i = 0; i < 3; i++) {
      SimonGame.advanceRound(s1);
      SimonGame.advanceRound(s2);
    }

    expect(SimonGame.getSequence(s1)).toEqual(SimonGame.getSequence(s2));
    expect(SimonGame.getSequence(s1)).toEqual(["A", "B", "C"]);
  });

  it("every CHARSET character has a valid MORSE_TABLE entry", function () {
    SimonGame.CHARSET.forEach(function (ch) {
      var pattern = SimonGame.MORSE_TABLE[ch];
      expect(pattern).toBeDefined();
      expect(pattern.length).toBeGreaterThan(0);
      // Pattern should only contain dots and dashes
      expect(pattern).toMatch(/^[.\-]+$/);
    });
  });
});
