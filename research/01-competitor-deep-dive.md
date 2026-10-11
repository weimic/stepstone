# Competitor Deep-Dive: Krillion, Fermi, Dialed, Waffle, Chainle & NYT Games

An analysis of the leading modern viral web games, dissecting their core game loops, scoring models, round structure, and UX mechanics.

---

## 1. Krillion (`krillion.io` — "The Daily Dive")

### Core Concept & Mechanic
- **Premise**: Open-ended trivia/knowledge game themed around descending into ocean depths.
- **Rules**: Exactly **7 prompts** per day (e.g., a city, a food, a fictional character, an animal, an invention).
- **Time constraint**: 20–25 seconds per prompt to type one open answer (no multiple choice).
- **The Twist (Inverse Popularity Scoring)**: Rather than just checking "right or wrong", the game scores answers based on **rarity**. If you name a common answer, you stay near the surface. If you name a valid obscure answer (one few players typed), Krill sinks into deeper ocean layers (Twilight Zone, Midnight Waters, Trench Code up to 7,000m).
- **Points**: Every point equals 10 meters of depth.

### Why Consumers Love It
- **High Agency & Cleverness**: In multiple-choice trivia, players feel like test-takers. In Krillion, you are rewarded for being witty, well-read, or niche.
- **Thematic Metaphor**: The depth meter (`450m`, `1,000m`, `3,000m`) gives a tangible, visual sense of descent and progress.
- **Zero Friction**: No login or download; progress saves directly to `localStorage`.

---

## 2. Fermi (`fermi.gg` — "The Daily Estimation Puzzle")

### Core Concept & Mechanic
- **Premise**: Inspired by physicist Enrico Fermi's "back-of-the-envelope" calculation technique.
- **Rules**: Exactly **3 estimation questions** per day (e.g., *"How many Oreos are eaten in the US each day?"*, *"How many iPhones have been produced since 2007?"*).
- **Input**: Exactly 1 guess per question, with an integrated "napkin math" calculator.
- **Scoring**: Scored by the **ratio multiple** of error relative to the real answer:
  - Exact answer = `1.00×`
  - Off by double = `2.00×`
  - Off by an order of magnitude = `10.00×`
  - Lower score is better; daily score is the average of the 3 questions.
- **Post-guess Reveal**: Instantly shows the real answer, an example of napkin math logic, and a histogram curve of how the global player base guessed.

### Why Consumers Love It
- **Curiosity & Intellectual Vanity**: People love debating absurd quantities; it tests intuition rather than rote memorization.
- **Satisfying "Aha!" Moment**: Revealing the mathematical deduction makes players feel smarter after playing, even if their initial guess was off.
- **Editorial Tone**: Clean, witty, and warm microcopy ("You landed 1.45× — closer than 62% of players").

---

## 3. Dialed (`dialed.gg` — Sensory & Perception Games)

### Core Concept & Mechanic
- **Premise**: Created by Geoff and Sam Teehan. Quick challenges testing human perception and sensory memory.
- **Sub-games / Modes**:
  - **Color**: Flash a color swatch briefly -> match it on hue/saturation/brightness sliders from memory.
  - **Sound**: Listen to a pure pitch -> tune a slider to match the frequency.
  - **Time**: Feel a duration (e.g., 3.20s) -> tap and hold to reproduce the duration without counting.
  - **Shape**: Memorize scale and rotation -> manipulate a shape back into place.
  - **Pattern**: View a grid, spot swapped tiles, swap them back under time pressure.
  - **Tempo**: Tap along to reproduce an evolving rhythm.
- **Structure**: 5 rounds per game, scored out of 50 points.

### Why Consumers Love It
- **Visceral & Universal**: No language barrier, no trivia knowledge needed. Anyone of any age or background can play immediately.
- **Ultra-Polished Micro-Interactions**: Chunky, tactile sliders, instantaneous responsiveness, and smooth physics.
- **Hilarious, Sassy Microcopy**: Tailored roast/praise based on performance (e.g., *"Your brain took a proper snapshot for once"*, *"Your ears filed a restraining order"*).
- **Viral Social Sharing & Asynchronous Duels**: Generates shareable challenge links where friends can play the exact same 5 boards.

---

## 4. Waffle (`wafflegame.net`)

### Core Concept & Mechanic
- **Premise**: A 5×5 waffle-shaped grid composed of 6 five-letter words (3 horizontal, 3 vertical, 4 corner gaps).
- **Rules**: Letters are scrambled. Players swap any two letters. Each puzzle has a minimum 10-swap solution and a 15-swap budget.
- **Color Clues**:
  - **Green**: Correct letter in the correct position.
  - **Yellow**: Letter belongs in that row or column, but in another position.
  - **White/Gray**: Letter does not belong in that row or column.
- **Scoring**: Earn 1 star for every swap remaining after solving (up to 5 stars).

### Why Consumers Love It
- **Tactile Drag-and-Drop**: Swapping letters feels like manipulating physical Scrabble or Bananagram tiles.
- **Contained Search Space**: Unlike Wordle, all letters are already on the board; it is a pure spatial permutation puzzle.
- **High Completion Rate**: Most players solve it, but the stars provide a clear mastery ceiling.

---

## 5. Chainle (`chainle.io` — "The Daily Word Chain")

The closest existing game to StepStone. Krillion's menu links to it as a game made by the creator's younger brother.

### Core Concept & Mechanic
- **Rules**: Five rounds a day, one typed word per round, no timer. Three rounds are two-clue bridges (e.g. *pizza* and *pasta* -> *tomato*), one is a three-clue bridge, and the last asks for the closest meaning to a single clue.
- **Scoring**: Up to 1,000 points per round, 5,000 per day. Every word has a 300-number meaning vector; a guess is compared with each clue separately against the round's "strongest link", and the per-clue scores are combined with a harmonic mean, so a word that ignores one clue scores near zero.
- **Forgiving input**: Blank entries, phrases, repeated clues, plurals of clues, and words outside the vocabulary don't use the turn.
- **Reveal**: After each guess it shows a featured connection and why it works.

### Why It Matters for Us
- Proves that embedding-based scoring works for a public daily word-association game.
- StepStone has to feel different: a multi-hop journey with visible progress, not five independent bridge rounds.

---

## 6. The NYT Games Ecosystem (Wordle, Connections, Strands, Spelling Bee, Mini)

### Common Winning Formula
1. **The Daily Ritual**: One puzzle a day creates artificial scarcity, preventing burnout and encouraging daily habits.
2. **The "Water Cooler" Effect**: When everyone plays the exact same board, it becomes a shared conversation starter.
3. **Emoji Share Grid**: Spoilers are hidden while visual performance is communicated (e.g., green/yellow squares, Connections category colors).
4. **Calm, High-End Aesthetic**: No ads, no flashing casino lights, no obnoxious popups. Clean white space and muted, tasteful palettes.

---

## Key Matrix Comparison

| Feature | Krillion | Fermi.gg | Dialed.gg | Waffle | Chainle | NYT Connections |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Input Type** | Open Text | Number / Calculator | Sliders / Taps | Drag-and-Swap | Open Text | 4-item Selection |
| **Round Shape** | 7 prompts, 20–25 s each | 3 questions | 5 rounds per mode | 1 board, 15 swaps | 5 rounds, no timer | 1 board, 4 mistakes |
| **Scoring** | Gradient (Depth in m) | Ratio (1.00× to 10×) | Gradient (0 to 50 pts) | Stars (0 to 5) | Gradient (0 to 5,000) | Discrete (Lives / Mistakes) |
| **Visual Vibe** | Deep sea / Submarine | Editorial / Minimalist | Vibrant / Ultra-Modern | Playful / Pastry grid | Clean / Chain links | Clean / Typography-led |
| **Social Loop** | "Reached 5,400m" | "Averaged 1.4×" | 1v1 challenge links | Star rating + grid | Spoiler-free receipt | Colored category squares |

Round shapes come from each game's published rules; we did not time real sessions.
