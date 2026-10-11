import { describe, expect, it } from 'vitest'
import { loadTestPuzzles } from '../test/data'
import { dailyNumber, dailyPuzzle, dateKey, msUntilTomorrow, practicePuzzle, randomPracticeIndex } from './daily'

const puzzles = loadTestPuzzles()

describe('dailyNumber', () => {
  it('starts at #1 on launch day and counts local calendar days', () => {
    expect(dailyNumber(new Date(2026, 9, 9, 0, 0, 1), '2026-10-09')).toBe(1)
    expect(dailyNumber(new Date(2026, 9, 9, 23, 59, 59), '2026-10-09')).toBe(1)
    expect(dailyNumber(new Date(2026, 9, 10, 0, 0, 0), '2026-10-09')).toBe(2)
    expect(dailyNumber(new Date(2026, 10, 9, 12), '2026-10-09')).toBe(32)
  })

  it('is not thrown off by daylight saving changes', () => {
    for (let d = 0; d < 400; d++) {
      expect(dailyNumber(new Date(2026, 9, 9 + d, 0, 30), '2026-10-09')).toBe(d + 1)
      expect(dailyNumber(new Date(2026, 9, 9 + d, 23, 30), '2026-10-09')).toBe(d + 1)
    }
  })

  it('clamps days before launch to #1', () => {
    expect(dailyNumber(new Date(2026, 0, 1), '2026-10-09')).toBe(1)
  })
})

describe('dateKey', () => {
  it('formats the local date', () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('msUntilTomorrow', () => {
  it('counts down to local midnight', () => {
    expect(msUntilTomorrow(new Date(2026, 9, 9, 23, 0, 0))).toBe(3_600_000)
  })
})

describe('dailyPuzzle', () => {
  it('serves curated rivers first', () => {
    const p = dailyPuzzle(puzzles, 1)
    expect(p).toMatchObject({
      key: 'daily-1-park-feather',
      mode: 'daily',
      number: 1,
      start: 'park',
      target: 'feather',
      par: 3,
    })
    expect(p.notes).toHaveLength(3)
  })

  it('falls back to the practice pool once curated rivers run out', () => {
    const n = puzzles.daily.length + 1
    const p = dailyPuzzle(puzzles, n)
    const first = puzzles.practice[0]
    expect(p.key).toBe(`daily-${n}-${first.start}-${first.target}`)
    expect(p.start).toBe(puzzles.practice[0].start)
    const wrapped = dailyPuzzle(puzzles, n + puzzles.practice.length)
    expect(wrapped.start).toBe(puzzles.practice[0].start)
  })
})

describe('practicePuzzle', () => {
  it('wraps indexes into the pool', () => {
    expect(practicePuzzle(puzzles, 0).number).toBe(1)
    expect(practicePuzzle(puzzles, puzzles.practice.length).key).toBe(practicePuzzle(puzzles, 0).key)
    expect(practicePuzzle(puzzles, -1).number).toBe(puzzles.practice.length)
  })

  it('keys runs by river so a regenerated puzzle never inherits an old run', () => {
    const last = puzzles.practice[puzzles.practice.length - 1]
    expect(practicePuzzle(puzzles, -1).key).toBe(`practice-${puzzles.practice.length}-${last.start}-${last.target}`)
  })

  it('never repeats the river you just played', () => {
    for (let i = 0; i < 50; i++) {
      const r = (i % 10) / 10
      expect(randomPracticeIndex(puzzles, Math.floor(r * puzzles.practice.length), () => r)).not.toBe(
        Math.floor(r * puzzles.practice.length),
      )
    }
  })
})
