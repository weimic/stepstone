import { isNearMiss, strengthFor, STURDY_RANK, type Strength } from './scoring'
import { inReach, linkRank, normalize, rankIn, resolveWord, rowFor, type WordData } from './vectors'

export interface Puzzle {
  key: string
  mode: 'daily' | 'practice'
  number: number
  start: string
  target: string
  par: number
  route: string[]
  notes?: string[]
}

export interface Stone {
  word: string
  label: string
  /** Link rank from the previous stone; 0 for the starting stone. */
  rank: number
  strength: Strength | null
  /** 0 = starting bank, 1 = far bank, from closeness to the target. */
  height: number
}

export type StrokeKind = 'stone' | 'splash' | 'whisper' | 'leap'

export interface Run {
  key: string
  stones: Stone[]
  strokes: StrokeKind[]
  whisper: string | null
  done: boolean
  startedAt: number
  finishedAt: number | null
}

export interface River {
  data: WordData
  puzzle: Puzzle
  start: number
  target: number
  targetRow: Int32Array
  startCloseness: number
  reachCloseness: number
}

export type Judgement =
  | { kind: 'invalid'; text: string; reason: 'empty' | 'spaces' | 'letters' }
  | { kind: 'unknown'; text: string; suggestion: string | null }
  | { kind: 'repeat'; text: string; word: string; sameAs: string }
  | { kind: 'land'; text: string; word: string; rank: number; strength: Strength; height: number; canLeap: boolean }
  | { kind: 'splash'; text: string; word: string; rank: number; nearMiss: boolean; isTarget: boolean }
  | { kind: 'leap'; text: string; word: string; rank: number }

/** Heights of stones within reach of the far bank sit in this band; everything else stays below it. */
const REACH_BAND = [0.84, 0.96] as const
const RIVER_TOP = 0.78

function indexOf(data: WordData, word: string): number {
  const i = data.index.get(word)
  if (i === undefined) throw new Error(`"${word}" is not in the vocabulary`)
  return i
}

function closenessForRank(rank: number, n: number): number {
  return 1 - Math.log(Math.max(1, rank)) / Math.log(n)
}

export function makeRiver(data: WordData, puzzle: Puzzle): River {
  const start = indexOf(data, puzzle.start)
  const target = indexOf(data, puzzle.target)
  const targetRow = rowFor(data, target)
  return {
    data,
    puzzle,
    start,
    target,
    targetRow,
    startCloseness: closenessForRank(rankIn(targetRow, target, start, data.ranked), data.ranked),
    reachCloseness: closenessForRank(data.k, data.ranked),
  }
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/** How far up the river a stone on `idx` sits: log-scaled rank in the target's ranking. */
export function heightOf(river: River, idx: number): number {
  const { data, target, targetRow, startCloseness: c0, reachCloseness: cK } = river
  if (idx === target) return 1
  if (idx === river.start) return 0
  const c = closenessForRank(rankIn(targetRow, target, idx, data.ranked), data.ranked)
  if (inReach(data, idx, target)) {
    return REACH_BAND[0] + (REACH_BAND[1] - REACH_BAND[0]) * clamp01((c - cK) / Math.max(1e-6, 1 - cK))
  }
  return RIVER_TOP * clamp01((c - c0) / Math.max(1e-6, cK - c0))
}

export function newRun(puzzle: Puzzle, now = Date.now()): Run {
  return {
    key: puzzle.key,
    stones: [{ word: puzzle.start, label: puzzle.start, rank: 0, strength: null, height: 0 }],
    strokes: [],
    whisper: null,
    done: false,
    startedAt: now,
    finishedAt: null,
  }
}

function currentIndex(river: River, run: Run): number {
  return indexOf(river.data, run.stones[run.stones.length - 1].word)
}

export function canLeap(river: River, run: Run): boolean {
  return !run.done && inReach(river.data, currentIndex(river, run), river.target)
}

export function judge(river: River, run: Run, input: string): Judgement {
  const { data, target } = river
  const text = normalize(input)
  if (!text) return { kind: 'invalid', text, reason: 'empty' }
  if (/\s/.test(text)) return { kind: 'invalid', text, reason: 'spaces' }
  if (!/^[a-z]+$/.test(text)) return { kind: 'invalid', text, reason: 'letters' }

  const idx = resolveWord(data, text)
  if (idx === null) return { kind: 'unknown', text, suggestion: suggest(data, text) }

  const cur = currentIndex(river, run)
  const root = data.roots[idx]

  if (root === data.roots[target]) {
    const rank = linkRank(data, cur, target)
    if (inReach(data, cur, target)) return { kind: 'leap', text, word: data.words[target], rank }
    return { kind: 'splash', text, word: data.words[target], rank, nearMiss: isNearMiss(rank, data.k), isTarget: true }
  }

  const dupe = run.stones.find((s) => data.roots[indexOf(data, s.word)] === root)
  if (dupe) return { kind: 'repeat', text, word: data.words[idx], sameAs: dupe.label }

  const rank = linkRank(data, cur, idx)
  const strength = strengthFor(rank, data.k)
  if (strength) {
    return {
      kind: 'land',
      text,
      word: data.words[idx],
      rank,
      strength,
      height: heightOf(river, idx),
      canLeap: inReach(data, idx, target),
    }
  }
  return { kind: 'splash', text, word: data.words[idx], rank, nearMiss: isNearMiss(rank, data.k), isTarget: false }
}

/** Applies a judged guess. Gentle results (invalid, unknown, repeat) leave the run untouched. */
export function applyJudgement(run: Run, j: Judgement, now = Date.now()): Run {
  if (run.done) return run
  switch (j.kind) {
    case 'land':
      return {
        ...run,
        stones: [...run.stones, { word: j.word, label: j.text, rank: j.rank, strength: j.strength, height: j.height }],
        strokes: [...run.strokes, 'stone'],
        whisper: null,
      }
    case 'splash':
      return { ...run, strokes: [...run.strokes, 'splash'] }
    case 'leap':
      return { ...run, strokes: [...run.strokes, 'leap'], whisper: null, done: true, finishedAt: now }
    default:
      return run
  }
}

/** Leap across from the current stone, if the far bank is within reach. */
export function leap(river: River, run: Run, now = Date.now()): Run {
  if (!canLeap(river, run)) return run
  return applyJudgement(run, judge(river, run, river.puzzle.target), now)
}

/** Similarity of the word ranked `rank` in a row, ignoring the row's own word. */
function simAtRank(row: Int32Array, self: number, rank: number, ranked: number): number {
  const sorted = row.slice(0, ranked)
  if (self < ranked) sorted[self] = -0x80000000
  sorted.sort()
  return sorted[Math.max(0, sorted.length - rank)]
}

/**
 * A word that moves toward the far bank, or null if none is left. Whispers stick to
 * strong and sturdy links so they read as natural next thoughts, not just valid ones,
 * and never use phrase links, a few of which are obscure.
 */
export function findWhisper(river: River, run: Run): string | null {
  const { data, target, targetRow } = river
  const cur = currentIndex(river, run)
  const row = rowFor(data, cur)
  const usedRoots = new Set(run.stones.map((s) => data.roots[indexOf(data, s.word)]))
  usedRoots.add(data.roots[target])
  const tCur = data.thresholds[cur]
  const sturdy = simAtRank(row, cur, STURDY_RANK, data.ranked)
  let best = -1
  let bestSim = -Infinity
  let bestSturdy = -1
  let bestSturdySim = -Infinity
  for (let x = 0; x < data.n; x++) {
    if (!data.hintable[x] || x === cur) continue
    if (row[x] < tCur && row[x] < data.thresholds[x]) continue
    if (usedRoots.has(data.roots[x])) continue
    if (targetRow[x] > bestSim) {
      bestSim = targetRow[x]
      best = x
    }
    if (row[x] >= sturdy && targetRow[x] > bestSturdySim) {
      bestSturdySim = targetRow[x]
      bestSturdy = x
    }
  }
  const pick = bestSturdy >= 0 ? bestSturdy : best
  return pick < 0 ? null : data.words[pick]
}

/** Spends a stroke to reveal a whisper. Asking again before using it is free. */
export function applyWhisper(river: River, run: Run): Run {
  if (run.done || run.whisper || canLeap(river, run)) return run
  const word = findWhisper(river, run)
  if (!word) return run
  return { ...run, strokes: [...run.strokes, 'whisper'], whisper: word }
}

/** Steps back one stone. Strokes already spent stay spent. */
export function undo(run: Run): Run {
  if (run.done || run.stones.length <= 1) return run
  return { ...run, stones: run.stones.slice(0, -1), whisper: null }
}

/** Optimal string alignment distance, giving up once it exceeds `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const m = a.length
  const n = b.length
  let prev2 = new Array<number>(n + 1).fill(0)
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  let curr = new Array<number>(n + 1).fill(0)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    let rowMin = curr[0]
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1)
      curr[j] = v
      if (v < rowMin) rowMin = v
    }
    if (rowMin > max) return max + 1
    ;[prev2, prev, curr] = [prev, curr, prev2]
  }
  return prev[n]
}

/** A likely intended word for a typo, preferring common words. */
export function suggest(data: WordData, text: string): string | null {
  if (text.length < 3) return null
  const max = text.length >= 7 ? 2 : 1
  let best: string | null = null
  let bestD = max + 1
  for (const w of data.words) {
    const d = editDistance(text, w, Math.min(max, bestD - 1))
    if (d < bestD) {
      best = w
      bestD = d
      if (d === 1) break
    }
  }
  return best
}
