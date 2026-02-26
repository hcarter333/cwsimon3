describe("Input Decoder", function () {
  describe("createInputDecoder basic decoding", function () {
    function decode(sideIds) {
      var result = null;
      var decoder = SimonGame.createInputDecoder({
        onDecode: function (letter) { result = letter; }
      });
      sideIds.forEach(function (id) { decoder.element(id); });
      decoder.letterBoundary();
      return result;
    }

    it("dit decodes to E", function () {
      expect(decode([1])).toBe("E");
    });

    it("dah decodes to T", function () {
      expect(decode([3])).toBe("T");
    });

    it("dit-dah decodes to A", function () {
      expect(decode([1, 3])).toBe("A");
    });

    it("dah-dit-dit-dit decodes to B", function () {
      expect(decode([3, 1, 1, 1])).toBe("B");
    });

    it("unrecognised pattern returns null", function () {
      expect(decode([1, 1, 1, 1, 1, 1])).toBeNull();
    });
  });

  describe("boundary and reset behaviour", function () {
    it("empty boundary does not fire onDecode", function () {
      var called = false;
      var decoder = SimonGame.createInputDecoder({
        onDecode: function () { called = true; }
      });
      decoder.letterBoundary();
      expect(called).toBe(false);
    });

    it("currentPattern reflects accumulated elements", function () {
      var decoder = SimonGame.createInputDecoder();
      decoder.element(1);
      decoder.element(3);
      expect(decoder.currentPattern()).toBe(".-");
    });

    it("reset clears the pattern", function () {
      var decoder = SimonGame.createInputDecoder();
      decoder.element(1);
      decoder.element(3);
      decoder.reset();
      expect(decoder.currentPattern()).toBe("");
    });

    it("letterBoundary clears the pattern", function () {
      var decoder = SimonGame.createInputDecoder({ onDecode: function () {} });
      decoder.element(1);
      decoder.letterBoundary();
      expect(decoder.currentPattern()).toBe("");
    });

    it("unrecognised sideId (e.g. 2) is ignored", function () {
      var called = false;
      var decoder = SimonGame.createInputDecoder({
        onDecode: function () { called = true; }
      });
      decoder.element(2);
      decoder.letterBoundary();
      expect(called).toBe(false);
    });

    it("string sideId '1' works as dit", function () {
      var result = null;
      var decoder = SimonGame.createInputDecoder({
        onDecode: function (letter) { result = letter; }
      });
      decoder.element("1");
      decoder.letterBoundary();
      expect(result).toBe("E");
    });
  });

  describe("multi-letter sequences", function () {
    it("decodes two letters in sequence", function () {
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
      expect(letters).toEqual(["A", "B"]);
    });

    it("onDecode receives both letter and pattern", function () {
      var gotPattern = null;
      var decoder = SimonGame.createInputDecoder({
        onDecode: function (letter, pattern) { gotPattern = pattern; }
      });
      decoder.element(1);
      decoder.element(3);
      decoder.letterBoundary();
      expect(gotPattern).toBe(".-");
    });
  });

  describe("decoder + checkLetter integration", function () {
    function seededRandom(chars) {
      var i = 0;
      var charset = SimonGame.CHARSET;
      return function () {
        var ch = chars[i % chars.length];
        i++;
        return charset.indexOf(ch) / charset.length;
      };
    }

    it("decoder feeds patterns directly into checkLetter", function () {
      var state = SimonGame.createState({ randomFn: seededRandom(["A", "B"]) });
      SimonGame.advanceRound(state);
      SimonGame.advanceRound(state); // ["A", "B"]

      var results = [];
      var decoder = SimonGame.createInputDecoder({
        onDecode: function (letter, pattern) {
          results.push(SimonGame.checkLetter(state, pattern));
        }
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

      expect(results).toEqual([
        SimonGame.Result.LETTER_CORRECT,
        SimonGame.Result.ROUND_COMPLETE
      ]);
    });

    it("wrong decoded letter triggers WRONG via checkLetter", function () {
      var state = SimonGame.createState({ randomFn: seededRandom(["T"]) });
      SimonGame.advanceRound(state); // T = -

      var results = [];
      var decoder = SimonGame.createInputDecoder({
        onDecode: function (letter, pattern) {
          results.push(SimonGame.checkLetter(state, pattern));
        }
      });

      // Send E (dit) instead of T (dah)
      decoder.element(1);
      decoder.letterBoundary();

      expect(results).toEqual([SimonGame.Result.WRONG]);
      expect(SimonGame.isGameOver(state)).toBe(true);
    });

    it("decoder reset between rounds works correctly", function () {
      var state = SimonGame.createState({ randomFn: seededRandom(["E", "T"]) });
      SimonGame.advanceRound(state);

      var results = [];
      var decoder = SimonGame.createInputDecoder({
        onDecode: function (letter, pattern) {
          results.push(SimonGame.checkLetter(state, pattern));
        }
      });

      // Round 1: E = dit
      decoder.element(1);
      decoder.letterBoundary();
      expect(results[0]).toBe(SimonGame.Result.ROUND_COMPLETE);

      // Advance and reset
      SimonGame.advanceRound(state);
      decoder.reset();

      // Round 2: E then T
      decoder.element(1);
      decoder.letterBoundary();
      expect(results[1]).toBe(SimonGame.Result.LETTER_CORRECT);

      decoder.element(3);
      decoder.letterBoundary();
      expect(results[2]).toBe(SimonGame.Result.ROUND_COMPLETE);
    });
  });

  describe("encodeMorse and decodeMorse", function () {
    it("encodeMorse returns correct pattern for A", function () {
      expect(SimonGame.encodeMorse("A")).toBe(".-");
    });

    it("encodeMorse handles lowercase", function () {
      expect(SimonGame.encodeMorse("a")).toBe(".-");
    });

    it("encodeMorse returns null for unknown character", function () {
      expect(SimonGame.encodeMorse("!")).toBeNull();
    });

    it("decodeMorse returns correct character", function () {
      expect(SimonGame.decodeMorse(".-")).toBe("A");
    });

    it("decodeMorse returns null for unknown pattern", function () {
      expect(SimonGame.decodeMorse("......")).toBeNull();
    });

    it("encode and decode are inverses for all CHARSET characters", function () {
      SimonGame.CHARSET.forEach(function (ch) {
        var pattern = SimonGame.encodeMorse(ch);
        expect(SimonGame.decodeMorse(pattern)).toBe(ch);
      });
    });
  });
});
