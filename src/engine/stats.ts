import { liliesFor, type Lilies } from './scoring'

export interface DayResult {
  strokes: number
  par: number
  lilies: Lilies
  trail: string
}

export interface Stats {
  played: number
  streak: number
  maxStreak: number
  /** Number of the last daily river crossed, 0 if none. */
  lastDaily: number
  /** Finishes with 1, 2 and 3 lilies. */
  lilies: [number, number, number]
  history: Record<number, DayResult>
  practiceCrossed: number
}

export const emptyStats = (): Stats => ({
  played: 0,
  streak: 0,
  maxStreak: 0,
  lastDaily: 0,
  lilies: [0, 0, 0],
  history: {},
  practiceCrossed: 0,
})

/** Records a finished daily once; replaying the same day changes nothing. */
export function recordDaily(stats: Stats, number: number, strokes: number, par: number, trail: string): Stats {
  if (stats.history[number]) return stats
  const lilies = liliesFor(strokes, par)
  const streak = stats.lastDaily === number - 1 ? stats.streak + 1 : 1
  const counts = [...stats.lilies] as Stats['lilies']
  counts[lilies - 1]++
  return {
    ...stats,
    played: stats.played + 1,
    streak,
    maxStreak: Math.max(stats.maxStreak, streak),
    lastDaily: Math.max(stats.lastDaily, number),
    lilies: counts,
    history: { ...stats.history, [number]: { strokes, par, lilies, trail } },
  }
}

/** A streak survives until a whole day is missed. */
export function currentStreak(stats: Stats, today: number): number {
  return stats.lastDaily >= today - 1 ? stats.streak : 0
}

export function averageOverPar(stats: Stats): number | null {
  const days = Object.values(stats.history)
  if (!days.length) return null
  return days.reduce((sum, d) => sum + (d.strokes - d.par), 0) / days.length
}
