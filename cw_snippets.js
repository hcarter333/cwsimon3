

let UNIT_MS = 150; // 150ms ~ 8 WPM dot
let WORD_GAP_MS = 7 * UNIT_MS; // default word-gap: 7 × UNIT_MS = 1050ms

// Use the authoritative MORSE_TABLE from simon-game-logic.js when available,
// otherwise fall back to a local copy so this file remains standalone.
const MORSE_TABLE = (typeof SimonGame !== "undefined" && SimonGame.MORSE_TABLE)
  ? SimonGame.MORSE_TABLE
  : {
    A: ".-",   B: "-...", C: "-.-.", D: "-..",
    E: ".",    F: "..-.", G: "--.",  H: "....",
    I: "..",   J: ".---", K: "-.-", L: ".-..",
    M: "--",   N: "-.",   O: "---", P: ".--.",
    Q: "--.-", R: ".-.",  S: "...", T: "-",
    U: "..-",  V: "...-", W: ".--", X: "-..-",
    Y: "-.--", Z: "--..",
    0: "-----", 1: ".----", 2: "..---", 3: "...--",
    4: "....-", 5: ".....", 6: "-....", 7: "--...",
    8: "---..", 9: "----."
  };


// simple sleep
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));




async function sendMorseMessage(freqStr, text) {
  const upper = text.toUpperCase();
  const unit = UNIT_MS;

  // Apply frequency override when provided
  var prevFreq = null;
  if (freqStr && note_node) {
    var freq = parseFloat(freqStr);
    if (!isNaN(freq) && freq > 0) {
      prevFreq = note_node.frequency.value;
      note_node.frequency.value = freq;
    }
  }

  try {
    for (let ci = 0; ci < upper.length; ci++) {
      const ch = upper[ci];

      if (ch === " ") {
        // Word gap: use separately-configurable WORD_GAP_MS
        await sleep(WORD_GAP_MS);
        continue;
      }

      const pattern = MORSE_TABLE[ch];
      if (!pattern) {
        // Unknown character, skip
        continue;
      }

      for (let si = 0; si < pattern.length; si++) {
        const sym = pattern[si];
        const durUnits = sym === "." ? 1 : 3;

        playSidetone();
        await sleep(durUnits * unit);
        stopSidetone();

        // Intra-character gap (between elements) = 1 unit, except after last element
        if (si < pattern.length - 1) {
          await sleep(unit);
        }
      }

      // Inter-character gap (between letters) = 3 units,
      // but if the next char is a space, the 7-unit word gap
      // will be applied when we hit the space, so we do nothing here.
      const nextChar = upper[ci + 1];
      if (nextChar && nextChar !== " ") {
        await sleep(unit * 3);
      }
    }
  } finally {
    // Restore previous frequency
    if (prevFreq !== null && note_node) {
      note_node.frequency.value = prevFreq;
    }
  }
}

// === Morse Playback Adapter ================================================
// Wraps sendMorseMessage for game playback, gating keyPress/keyRelease side
// effects via morsePlaybackActive.

/**
 * Play an array of characters as Morse with proper inter-character spacing.
 * Sets morsePlaybackActive to prevent histogram/cwmsg corruption.
 *
 * @param {string[]} sequence - Array of uppercase characters to play.
 * @param {number} [wpm] - Optional WPM override (temporarily changes UNIT_MS).
 * @returns {Promise<void>}
 */
async function playSequenceMorse(sequence, wpm) {
  await ensureAudioReady();
  morsePlaybackActive = true;
  var savedUnit = UNIT_MS;
  if (wpm && wpm > 0) {
    UNIT_MS = Math.round(1200 / wpm);
  }
  try {
    await sendMorseMessage(null, sequence.join(""));
  } finally {
    UNIT_MS = savedUnit;
    morsePlaybackActive = false;
    stopSidetone();
  }
}

/**
 * Play a single character as Morse, with optional frequency override.
 * Sets morsePlaybackActive to prevent histogram/cwmsg corruption.
 *
 * @param {string} char - Single character to play.
 * @param {number|string} [freq] - Optional frequency in Hz (overrides default).
 * @returns {Promise<void>}
 */
async function playCharMorse(char, freq) {
  await ensureAudioReady();
  morsePlaybackActive = true;
  try {
    var freqStr = freq ? String(freq) : null;
    await sendMorseMessage(freqStr, char);
  } finally {
    morsePlaybackActive = false;
    stopSidetone();
  }
}
