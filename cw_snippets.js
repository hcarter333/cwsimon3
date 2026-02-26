

let UNIT_MS = 150; // 150ms ~ 8 WPM dot
let WORD_GAP_MS = 7 * UNIT_MS; // default word gap = 7 units (1050ms at 8 WPM)

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

  for (let ci = 0; ci < upper.length; ci++) {
    const ch = upper[ci];

    if (ch === " ") {
      // Word gap: use configurable WORD_GAP_MS
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

      const msgDown = `${freqStr} Key down`;
      const msgUp = `${freqStr} key up`;

      keyPress();
      await sleep(durUnits * unit);
      keyRelease();

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
}
