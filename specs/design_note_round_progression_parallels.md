# Design Note: Round Progression as Curriculum / LLM Parallel

## Core Insight

The CW Simon game's round progression — where each round replays the full
previous sequence plus one new character — mirrors patterns found in both
curriculum design and large language model training.

In each round, the player must recall and reproduce an incrementally longer
sequence. This is not just a memory game; it is a structured recall task where
the difficulty curve is defined by sequence length.

## Parallels

### 1. Spaced Repetition

Every round re-presents the entire prior sequence before adding a new element.
The player rehearses previously seen characters each time they advance. This is
a natural form of spaced repetition: earlier characters are encountered more
often across rounds than later ones.

| Round | Sequence     | Times "A" rehearsed |
|-------|-------------|---------------------|
| 1     | A           | 1                   |
| 2     | A B         | 2                   |
| 3     | A B C       | 3                   |
| N     | A B C ... N | N                   |

This maps directly to spaced repetition schedules in flashcard systems (Anki,
Leitner boxes), where items are reviewed at increasing intervals to move them
from short-term to long-term memory.

### 2. Sequence Length as Difficulty Curve

The game's difficulty is fully determined by how many characters the player
must recall in order. This is analogous to:

- **Curriculum design**: Introductory courses present one concept at a time,
  then build composite exercises that require combining earlier concepts. Each
  new "round" (lesson, module) adds one new idea atop the accumulated base.

- **LLM context windows**: A language model processing a longer context must
  attend to more tokens to produce a correct continuation. Sequence length is a
  direct proxy for task difficulty in both the Simon game and autoregressive
  text generation.

### 3. Incremental Sequence Extension and Autoregressive Generation

The Simon game extends its sequence one token at a time:

```
Round 1: [T]
Round 2: [T, E]
Round 3: [T, E, S]
```

An autoregressive LLM does the same thing during generation — it produces one
token, appends it to the context, and uses the full sequence to produce the
next. The Simon game's `advanceRound()` function (see `simon-game-logic.js`)
is structurally identical: append one randomly chosen character to the sequence,
then require the player to "decode" (reproduce) the full sequence.

### 4. Attention and Recall Under Load

As the sequence grows, the player must maintain attention across the entire
sequence while decoding each character's Morse pattern element by element. This
parallels the attention mechanism in transformers, where each output position
attends to all prior positions. Longer sequences stress both human working
memory and transformer self-attention in analogous ways.

### 5. Error as a Learning Signal

When the player enters a wrong element, the game ends and reports their score
(rounds completed). This binary pass/fail per round is analogous to:

- **Curriculum testing**: A test that stops at the first wrong answer identifies
  the learner's frontier — the boundary between what they know and what they
  don't.
- **Training loss**: In LLM training, the cross-entropy loss at each token
  position signals how well the model predicted the next token. A wrong
  prediction at position N, after N-1 correct ones, precisely identifies the
  difficulty frontier.

## Future Directions: Adaptive Difficulty

The current game uses uniform random character selection. The parallel to
curriculum design suggests several enhancements:

- **Weighted selection**: Bias toward characters the player has previously
  gotten wrong (targeted practice, analogous to hard-example mining in ML
  training).
- **Character-frequency curriculum**: Start with high-frequency / simple Morse
  characters (E, T, A) and introduce complex ones (Q, Y, X) only after the
  player demonstrates mastery of simpler ones. This mirrors curriculum ordering
  in education and curriculum learning in ML.
- **Adaptive speed**: Adjust `UNIT_MS` (words per minute) based on player
  performance, creating a two-dimensional difficulty space (sequence length x
  speed). Analogous to variable learning rates in optimization.
- **Sequence replay on failure**: Instead of restarting with a completely new
  random sequence, replay the failed sequence to give the player another
  attempt. This parallels experience replay in reinforcement learning.

## Summary

The CW Simon game is, at its core, an incremental sequence recall task. This
simple mechanic naturally embodies principles from spaced repetition, curriculum
design, and autoregressive language modeling. Recognizing this parallel opens
design space for adaptive difficulty features that borrow directly from
established techniques in both education and machine learning.
