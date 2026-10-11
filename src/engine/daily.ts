import type { Puzzle } from './rules'

export interface PuzzleEntry {
  start: string
  target: string
  par: number
  route: string[]
  notes?: string[]
}

export interface PuzzleFile {
  version: number
  launch: string
  k: number
  built: string
  daily: PuzzleEntry[]
  practice: PuzzleEntry[]
}

const DAY_MS = 86_400_000

/** Local calendar date as YYYY-MM-DD. */
export function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dayIndex(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS)
}

/** River number for the player's local date; #1 is launch day. Days before launch get #1. */
export function dailyNumber(date: Date, launch: string): number {
  return Math.max(1, dayIndex(dateKey(date)) - dayIndex(launch) + 1)
}

export function msUntilTomorrow(date: Date): number {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  return next.getTime() - date.getTime()
}

/** Hand-curated rivers come first; after they run out, days cycle through the practice pool. */
export function dailyPuzzle(file: PuzzleFile, number: number): Puzzle {
  const n = Math.max(1, Math.floor(number))
  const curated = file.daily.length
  const entry = n <= curated ? file.daily[n - 1] : file.practice[(n - curated - 1) % file.practice.length]
  return { key: puzzleKey('daily', n, entry), mode: 'daily', number: n, ...entry }
}

export function practicePuzzle(file: PuzzleFile, index: number): Puzzle {
  const count = file.practice.length
  const i = ((Math.floor(index) % count) + count) % count
  return { key: puzzleKey('practice', i + 1, file.practice[i]), mode: 'practice', number: i + 1, ...file.practice[i] }
}

/** Includes the words, so a saved run never carries over to a river that was regenerated. */
function puzzleKey(mode: Puzzle['mode'], number: number, entry: PuzzleEntry): string {
  return `${mode}-${number}-${entry.start}-${entry.target}`
}

export function randomPracticeIndex(file: PuzzleFile, avoid?: number, random = Math.random): number {
  const count = file.practice.length
  if (count < 2) return 0
  let i = Math.floor(random() * count)
  if (i === avoid) i = (i + 1 + Math.floor(random() * (count - 1))) % count
  return i
}
