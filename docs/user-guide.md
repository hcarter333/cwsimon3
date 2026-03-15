# CWSimon User Guide

## What is CWSimon?

CWSimon is a Simon Says-style game for learning Morse code. The game plays a
sequence of Morse code letters, and you repeat them back using a virtual iambic
paddle. Each round adds one more letter to the sequence. See how far you can go!

CWSimon is part of the [Project TouCans](https://projecttoucans.com) family of
ham radio learning tools.

## Getting Started

CWSimon runs entirely in your web browser — there is nothing to install.

1. Open the CWSimon page (`pt-cwsimon.html`) on your phone, tablet, or computer.
2. Tap **Start Game** to begin your first round.

For the best experience use a mobile device in portrait orientation, since the
paddle is designed for touch input.

## How to Play

1. **Listen** — The game plays a Morse code sequence. Each letter appears
   briefly on screen as it plays.
2. **Repeat** — After the sequence finishes, use the paddle (see below) to key
   back the same letters in order.
3. **Advance** — If you get it right, a new random letter is added to the
   sequence and the whole thing plays again.
4. **Game over** — One wrong letter and the game ends. You'll see how many
   rounds you completed and where you went wrong.

After a loss you can tap **Play Again?** to start a new game, or **Back to
Menu** to return to the welcome screen.

## The Paddle

The bottom portion of the screen is divided into three touch areas:

| Area | Position | Action |
|------|----------|--------|
| **1** | Left | Sends a **dit** (short tone) |
| **2** | Center | Squeeze zone (no action on its own) |
| **3** | Right | Sends a **dah** (long tone) |

Touch and hold area 1 or 3 to start keying. The paddle works like an iambic
keyer: holding a side repeats that element automatically with proper timing.
Release to stop.

During game input, CWSimon automatically detects when you've completed each
letter (based on the number of elements expected) so you don't need to worry
about timing the gaps between letters.

## Scoring

Your score is the number of rounds you complete successfully. Round 1 has one
letter, round 2 has two letters, and so on. The game ends on the first
incorrect letter.

When you lose, the results screen shows:
- How many rounds you completed.
- The sequence so far, with a mark where you made the mistake.

## Settings

Tap the gear icon in the top-right corner to open the settings panel.

| Setting | What it does | Default |
|---------|-------------|---------|
| **WPM** | Words per minute — controls how fast Morse elements play. Higher means faster dits and dahs. Use the **-** and **+** buttons to adjust. | 8 |
| **Word gap (ms)** | The pause between words in milliseconds. Adjustable in 5 ms steps. | 1050 |
| **Lose sound** | Toggle the "HI HI" Morse sound that plays when you lose. Tap to switch between On and Off. | On |
| **tx haptics** | Toggle vibration feedback when Morse is played back to you. Useful on mobile devices. Tap to switch between On and Off. | Off |

Settings take effect immediately. The tx haptics preference is saved across
sessions.

## Tips for Learning Morse

- **Start slow.** Keep WPM low (5-8) while you're learning new letters. Speed
  comes with practice.
- **Listen, don't look.** Try to recognise letters by their sound pattern
  rather than counting dits and dahs.
- **Learn in groups.** Common beginner groups: E T A N (short, simple patterns),
  then branch out to I M S O H, and so on.
- **Practice daily.** Short, regular sessions (10-15 minutes) build muscle
  memory faster than occasional long sessions.
- **Use the letter overlay.** Watch the letter that appears on screen as each
  Morse character plays — it reinforces the connection between sound and symbol.
- **Have fun.** CWSimon is a game first. Don't stress about scores — every
  round is practice.
