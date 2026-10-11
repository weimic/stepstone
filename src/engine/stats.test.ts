import { describe, expect, it } from 'vitest'
import { averageOverPar, currentStreak, emptyStats, recordDaily } from './stats'

describe('recordDaily', () => {
  it('builds a streak over consecutive days', () => {
    let s = emptyStats()
    s = recordDaily(s, 1, 3, 3, '🪨🪨🪨🌿')
    s = recordDaily(s, 2, 5, 3, '')
    expect(s).toMatchObject({ played: 2, streak: 2, maxStreak: 2, lastDaily: 2, lilies: [0, 1, 1] })
  })

  it('restarts the streak after a missed day but keeps the best', () => {
    let s = emptyStats()
    for (const n of [1, 2, 3]) s = recordDaily(s, n, 3, 3, '')
    s = recordDaily(s, 5, 9, 3, '')
    expect(s).toMatchObject({ streak: 1, maxStreak: 3, lilies: [1, 0, 3] })
  })

  it('ignores a second finish of the same day', () => {
    const s = recordDaily(emptyStats(), 4, 3, 3, '')
    expect(recordDaily(s, 4, 9, 3, '')).toBe(s)
  })
})

describe('currentStreak', () => {
  it('holds through today and drops once a day is skipped', () => {
    const s = recordDaily(recordDaily(emptyStats(), 1, 3, 3, ''), 2, 3, 3, '')
    expect(currentStreak(s, 2)).toBe(2)
    expect(currentStreak(s, 3)).toBe(2)
    expect(currentStreak(s, 4)).toBe(0)
  })
})

describe('averageOverPar', () => {
  it('averages strokes over par', () => {
    expect(averageOverPar(emptyStats())).toBeNull()
    const s = recordDaily(recordDaily(emptyStats(), 1, 3, 3, ''), 2, 6, 3, '')
    expect(averageOverPar(s)).toBe(1.5)
  })
})
