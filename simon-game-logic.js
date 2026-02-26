/**
 * SimonGame — Pure game-logic module for CW Simon.
 *
 * No DOM, Web Audio, or browser API references.
 * Loadable via <script> tag; exports to global `SimonGame` namespace.
 */
var SimonGame = (function () {
  "use strict";

  // ── Morse table (authoritative copy) ──────────────────────────────
  var MORSE_TABLE = {
    A: ".-",    B: "-...",  C: "-.-.",  D: "-..",
    E: ".",     F: "..-.",  G: "--.",   H: "....",
    I: "..",    J: ".---",  K: "-.-",   L: ".-..",
    M: "--",    N: "-.",    O: "---",   P: ".--.",
    Q: "--.-",  R: ".-.",   S: "...",   T: "-",
    U: "..-",   V: "...-",  W: ".--",   X: "-..-",
    Y: "-.--",  Z: "--..",
    0: "-----", 1: ".----", 2: "..---", 3: "...--",
    4: "....-", 5: ".....", 6: "-....", 7: "--...",
    8: "---..", 9: "----."
  };

  // Characters available for the chooser (keys of MORSE_TABLE)
  var CHARSET = Object.keys(MORSE_TABLE);

  // ── Reverse lookup: morse pattern → character ─────────────────────
  var REVERSE_TABLE = {};
  CHARSET.forEach(function (ch) {
    REVERSE_TABLE[MORSE_TABLE[ch]] = ch;
  });

  // ── Game state factory ────────────────────────────────────────────

  /**
   * Create a fresh game state.
   *
   * @param {object} [opts]
   * @param {function} [opts.randomFn] - Returns a float in [0,1). Defaults to Math.random.
   *                                     Inject for deterministic testing.
   * @returns {object} Opaque game-state object.
   */
  function createState(opts) {
    opts = opts || {};
    return {
      sequence: [],          // accumulated letters the game has chosen
      round: 0,              // current round (0-indexed; incremented after successful match)
      inputBuffer: [],       // user's accumulated dit/dah elements for the current letter
      inputIndex: 0,         // which letter in the sequence the user is currently entering
      finished: false,       // true once the user has failed
      randomFn: opts.randomFn || Math.random
    };
  }

  // ── Chooser ───────────────────────────────────────────────────────

  /**
   * Choose a random character and append it to the game sequence.
   * Advances the round counter. Returns the full sequence for this round.
   *
   * @param {object} state - game state from createState()
   * @returns {string[]} The full sequence for this round (copy).
   */
  function advanceRound(state) {
    var idx = Math.floor(state.randomFn() * CHARSET.length);
    var ch = CHARSET[idx];
    state.sequence.push(ch);
    state.round = state.sequence.length;
    state.inputBuffer = [];
    state.inputIndex = 0;
    return state.sequence.slice();
  }

  // ── Input decoder ─────────────────────────────────────────────────

  /**
   * Decode a Morse pattern string (e.g. ".-") into a character.
   *
   * @param {string} pattern - dot/dash pattern
   * @returns {string|null} The decoded character, or null if unrecognised.
   */
  function decodeMorse(pattern) {
    return REVERSE_TABLE[pattern] || null;
  }

  /**
   * Get the Morse pattern for a given character.
   *
   * @param {string} ch - single uppercase letter or digit
   * @returns {string|null} The Morse pattern, or null if not in the table.
   */
  function encodeMorse(ch) {
    return MORSE_TABLE[ch.toUpperCase()] || null;
  }

  // ── Input decoder (sideId → decoded letters) ─────────────────────

  /**
   * Create an input decoder that converts sideId-based dit/dah events
   * into decoded Morse letters.
   *
   * Wire to keyer hooks: onKeyerInput → decoder.element,
   *                      onLetterBoundary → decoder.letterBoundary.
   *
   * @param {object} [opts]
   * @param {function} [opts.onDecode] - Called as onDecode(letter, pattern)
   *   when a letter boundary fires. `letter` is the decoded character
   *   (uppercase) or null if the pattern is unrecognised.
   * @returns {object} Decoder with element(), letterBoundary(), currentPattern(), reset().
   */
  function createInputDecoder(opts) {
    opts = opts || {};
    var onDecode = opts.onDecode || function () {};
    var pattern = "";

    return {
      /** Feed a sideId event from the keyer (1 = dit, 3 = dah). */
      element: function (sideId) {
        var s = Number(sideId);
        if (s === 1) {
          pattern += ".";
        } else if (s === 3) {
          pattern += "-";
        }
      },

      /** Signal a letter boundary; decodes accumulated pattern and calls onDecode. */
      letterBoundary: function () {
        if (pattern.length === 0) return;
        var letter = REVERSE_TABLE[pattern] || null;
        onDecode(letter, pattern);
        pattern = "";
      },

      /** Return the current accumulated pattern (for inspection/testing). */
      currentPattern: function () {
        return pattern;
      },

      /** Reset the decoder, discarding any partial pattern. */
      reset: function () {
        pattern = "";
      }
    };
  }

  // ── Sequence matcher ──────────────────────────────────────────────

  /**
   * Result codes returned by recordElement / checkLetter.
   */
  var Result = {
    CONTINUE: "continue",         // element accepted, letter not complete yet
    LETTER_CORRECT: "letter_ok",  // letter matches expected, move to next
    ROUND_COMPLETE: "round_ok",   // last letter in sequence matched — round complete
    WRONG: "wrong"                // mismatch — game over
  };

  /**
   * Record a single dit or dah element from the user.
   *
   * The caller is responsible for detecting element boundaries (e.g. via
   * timing or the iambic keyer). Pass "." for dit, "-" for dah.
   *
   * @param {object} state  - game state
   * @param {string} element - "." or "-"
   * @returns {string} One of the Result codes.
   */
  function recordElement(state, element) {
    if (state.finished) return Result.WRONG;

    var expectedChar = state.sequence[state.inputIndex];
    var expectedPattern = MORSE_TABLE[expectedChar];

    // Which element position are we in for this letter?
    var pos = state.inputBuffer.length;

    // If user has already sent more elements than the expected pattern has, it's wrong
    if (pos >= expectedPattern.length) {
      state.finished = true;
      return Result.WRONG;
    }

    // Check this element against the expected one
    if (element !== expectedPattern[pos]) {
      state.finished = true;
      return Result.WRONG;
    }

    // Element is correct — add to buffer
    state.inputBuffer.push(element);

    // Is the letter complete?
    if (state.inputBuffer.length === expectedPattern.length) {
      return _letterComplete(state);
    }

    return Result.CONTINUE;
  }

  /**
   * Submit a complete letter pattern at once (alternative to element-by-element).
   * Useful for testing and for input modes that decode whole letters.
   *
   * @param {object} state - game state
   * @param {string} pattern - full dit/dah pattern, e.g. ".-"
   * @returns {string} One of the Result codes.
   */
  function checkLetter(state, pattern) {
    if (state.finished) return Result.WRONG;

    var expectedChar = state.sequence[state.inputIndex];
    var expectedPattern = MORSE_TABLE[expectedChar];

    if (pattern !== expectedPattern) {
      state.finished = true;
      return Result.WRONG;
    }

    return _letterComplete(state);
  }

  /**
   * Internal: advance after a correctly completed letter.
   */
  function _letterComplete(state) {
    state.inputIndex++;
    state.inputBuffer = [];

    if (state.inputIndex >= state.sequence.length) {
      // All letters in the round matched
      return Result.ROUND_COMPLETE;
    }

    return Result.LETTER_CORRECT;
  }

  // ── Scoring ───────────────────────────────────────────────────────

  /**
   * Get the player's score (number of rounds completed successfully).
   * A round is "completed" when the player matches the full sequence and
   * advanceRound is called for the next round.
   *
   * During play, the score equals (round - 1) because the current round
   * is still in progress. Once finished (failed), it equals the number
   * of fully-completed rounds.
   *
   * @param {object} state - game state
   * @returns {number} Rounds completed.
   */
  function getScore(state) {
    if (state.finished) {
      // The player failed during this round, so completed rounds = round - 1
      return Math.max(0, state.round - 1);
    }
    // Still playing: completed rounds = rounds that have been fully matched
    // (round is 1-indexed count of sequence length; inputIndex resets each round)
    return Math.max(0, state.round - 1);
  }

  /**
   * Check whether the game is over (player failed).
   *
   * @param {object} state
   * @returns {boolean}
   */
  function isGameOver(state) {
    return state.finished;
  }

  /**
   * Get the full current sequence.
   *
   * @param {object} state
   * @returns {string[]} Copy of the sequence.
   */
  function getSequence(state) {
    return state.sequence.slice();
  }

  /**
   * Get the current round number (1-indexed).
   *
   * @param {object} state
   * @returns {number}
   */
  function getRound(state) {
    return state.round;
  }

  // ── Public API ────────────────────────────────────────────────────
  return {
    MORSE_TABLE: MORSE_TABLE,
    REVERSE_TABLE: REVERSE_TABLE,
    CHARSET: CHARSET,
    Result: Result,

    createState: createState,
    advanceRound: advanceRound,

    createInputDecoder: createInputDecoder,
    decodeMorse: decodeMorse,
    encodeMorse: encodeMorse,

    recordElement: recordElement,
    checkLetter: checkLetter,

    getScore: getScore,
    isGameOver: isGameOver,
    getSequence: getSequence,
    getRound: getRound
  };
})();

// Support loading in Node.js / CommonJS test runners as well
if (typeof module !== "undefined" && module.exports) {
  module.exports = SimonGame;
}
