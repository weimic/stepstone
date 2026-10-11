import type { Feedback } from '../store/game'

export type Tone = 'good' | 'great' | 'soft' | 'miss' | 'info'

export interface Message {
  text: string
  tone: Tone
  /** A word the player can tap to try instead. */
  suggestion?: string
  /** Where a missed word ranked for the stone, e.g. "#645". */
  rank?: string
}

const q = (w: string) => `“${w}”`

export function messageFor(f: Feedback, target: string): Message | null {
  if (f.type === 'whisper') {
    if (!f.word) return { text: 'The river is quiet here. Try stepping back a stone.', tone: 'info' }
    return {
      text: f.cost ? `The river whispers ${q(f.word)}… (1 stroke)` : `The river whispered ${q(f.word)}.`,
      tone: 'info',
      suggestion: f.word,
    }
  }
  if (f.type === 'undo') return { text: `Stepped back off ${q(f.word)}. No refunds on strokes.`, tone: 'soft' }

  const j = f.judgement
  switch (j.kind) {
    case 'invalid':
      if (j.reason === 'spaces') return { text: 'One word at a time.', tone: 'soft' }
      if (j.reason === 'letters') return { text: 'Letters only, please.', tone: 'soft' }
      return null
    case 'unknown':
      return j.suggestion
        ? { text: `${q(j.text)} isn’t in our word list. Did you mean`, tone: 'soft', suggestion: j.suggestion }
        : { text: `${q(j.text)} isn’t in our word list. No stroke used.`, tone: 'soft' }
    case 'repeat':
      return j.text === j.sameAs || j.word === j.sameAs
        ? { text: `${q(j.sameAs)} is already on your path. No stroke used.`, tone: 'soft' }
        : { text: `${q(j.text)} is too close to ${q(j.sameAs)}, already on your path.`, tone: 'soft' }
    case 'land': {
      const lead =
        j.strength === 'strong' ? 'Solid stone!' : j.strength === 'sturdy' ? 'Nice step.' : 'Wobbly, but it holds.'
      const tail = j.canLeap ? ` ${target.toUpperCase()} is within reach!` : ''
      return { text: `${lead}${tail}`, tone: j.canLeap ? 'great' : 'good' }
    }
    case 'splash': {
      const rank = `#${j.rank.toLocaleString('en-US')}`
      if (j.isTarget) {
        return j.nearMiss
          ? { text: `So close! ${target.toUpperCase()} is just out of reach from ${q(f.from)}.`, tone: 'miss', rank }
          : { text: `Splash! ${target.toUpperCase()} is still too far from ${q(f.from)}.`, tone: 'miss', rank }
      }
      return j.nearMiss
        ? { text: `So close! ${q(j.text)} almost links to ${q(f.from)}.`, tone: 'miss', rank }
        : { text: `Splash! ${q(j.text)} is too far from ${q(f.from)}.`, tone: 'miss', rank }
    }
    case 'leap':
      return { text: 'You made it across!', tone: 'great' }
  }
}
