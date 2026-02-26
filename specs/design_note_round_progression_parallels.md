# Design Note: Round Progression as Curriculum / LLM Parallel

## Core Insight

The Simon game's round progression — where each round replays the entire
previous sequence plus one new element — is structurally identical to two
well-studied patterns: curriculum-based learning and LLM context-window
attention.

## The Parallel in Detail

### Simon Game Mechanics

In our CW Simon implementation (`simon-game-logic.js`), `advanceRound()`
appends one randomly chosen character to the accumulated sequence each round.
The player must then recall and reproduce the *entire* sequence from the
beginning. Round 1 is one character; round 5 is five characters; round N is
N characters.

This creates a difficulty curve where:

1. **Early rounds** test single-symbol recognition (dit/dah discrimination).
2. **Middle rounds** test short-term sequential recall.
3. **Later rounds** stress working memory and pattern chunking.

### Curriculum Design Parallel

This mirrors scaffolded instruction in pedagogy:

| Curriculum concept | Simon analogue |
|--------------------|----------------|
| **Scaffolding** — build on prior knowledge | Each round includes all prior letters |
| **Spaced repetition** — re-encounter earlier material | Earlier letters are replayed every round |
| **Zone of proximal development** — one step beyond current ability | Exactly one new letter per round |
| **Mastery gating** — must demonstrate competence before advancing | Must reproduce the full sequence correctly to continue |
| **Immediate feedback** — know right away if you're wrong | Wrong element ends the game instantly |

The game is effectively a micro-curriculum: the learner cannot advance without
demonstrating mastery of all prior material, and the difficulty increment is
always exactly one unit.

### LLM Context Window / Attention Parallel

The same structure maps onto how large language models process sequences:

| LLM concept | Simon analogue |
|-------------|----------------|
| **Growing context window** | Sequence length grows by 1 each round |
| **Attention over prior tokens** | Player must attend to all prior letters |
| **Recency bias** | Newest letter is easiest to recall; earliest is hardest |
| **Context length vs. accuracy tradeoff** | Longer sequences → higher error rate |
| **Autoregressive generation** | Player reproduces the sequence token by token, in order |

In both cases, the system must maintain fidelity across an expanding sequence
while each new element depends on correctly processing everything before it.

## Spaced Repetition Specifics

The Simon game provides a natural (if accidental) spaced-repetition schedule.
The first letter chosen is replayed in every subsequent round. The second letter
is replayed in all rounds from round 2 onward. This means earlier characters
get more repetitions — exactly the pattern that Ebbinghaus and modern SRS
systems (Anki, SuperMemo) use to move items from short-term to long-term
memory.

For Morse code learning specifically, this is valuable: the player hears and
reproduces common letter patterns many times before the game ends, reinforcing
the sound-to-symbol mapping.

## Adaptive Difficulty Directions

This parallel suggests future enhancements:

- **Weighted character selection**: Bias `advanceRound()` toward characters the
  player has previously gotten wrong, turning the game into an explicit SRS
  trainer rather than a purely random sequence.
- **Variable sequence growth**: Instead of always adding one character, add more
  when the player is performing well (analogous to increasing context length
  for a capable model).
- **Farnsworth timing**: Use slower inter-character spacing at higher WPM for
  character-speed practice — another curriculum technique where individual
  symbol speed and sequence speed are independently adjustable. (The spec
  already supports this via separate UNIT_MS and word-spacing settings.)
- **Partial credit / error analysis**: Instead of immediate game-over on the
  first wrong element, track *which* characters cause failures and feed that
  data into the chooser's weighting.

## Summary

The Simon game's "replay everything, add one" mechanic is a minimal
curriculum engine. It enforces mastery-gated progression, provides built-in
spaced repetition, and creates a difficulty curve that maps directly onto both
human working-memory limits and LLM context-window attention degradation. This
makes it a useful design pattern to study and extend for any sequence-recall
training system.
