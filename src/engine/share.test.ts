import { describe, expect, it } from 'vitest'
import type { Puzzle, Run } from './rules'
import { shareText, strokeTrail } from './share'

const puzzle: Puzzle = {
  key: 'daily-12',
  mode: 'daily',
  number: 12,
  start: 'honey',
  target: 'sweater',
  par: 3,
  route: ['honey', 'bee', 'wool', 'sweater'],
}

const run: Run = {
  key: 'daily-12',
  stones: [],
  strokes: ['stone', 'splash', 'stone', 'leap'],
  whisper: null,
  done: true,
  startedAt: 0,
  finishedAt: 1,
}

describe('shareText', () => {
  it('matches the card from the plan', () => {
    expect(shareText(puzzle, run)).toBe('StepStone #12 🐸\nHONEY → SWEATER\n🪨🪨💦🪨🌿\n4 strokes · par 3')
  })

  it('never reveals the words in between', () => {
    const text = shareText(puzzle, { ...run, stones: [{ word: 'bee', label: 'bees', rank: 3, strength: 'strong', height: 0.5 }] })
    expect(text).not.toMatch(/bee|wool/i)
  })

  it('labels practice rivers and appends a link', () => {
    const text = shareText({ ...puzzle, mode: 'practice', key: 'practice-4', number: 4 }, run, 'https://example.com')
    expect(text.split('\n')[0]).toBe('StepStone practice 🐸')
    expect(text.endsWith('\nhttps://example.com')).toBe(true)
  })
})

describe('strokeTrail', () => {
  it('shows whispers as leaves', () => {
    expect(strokeTrail({ ...run, strokes: ['whisper', 'stone', 'leap'] })).toBe('🪨🍃🪨🌿')
  })
})
