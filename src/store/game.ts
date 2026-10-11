import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import puzzleJson from '../data/puzzles.json'
import binUrl from '../data/vectors.bin?url'
import vocabUrl from '../data/vocab.json?url'
import { dailyNumber, dailyPuzzle, practicePuzzle, randomPracticeIndex, type PuzzleFile } from '../engine/daily'
import {
  applyJudgement,
  applyWhisper,
  canLeap,
  judge,
  makeRiver,
  newRun,
  undo as undoRun,
  type Judgement,
  type Puzzle,
  type River,
  type Run,
} from '../engine/rules'
import { strokeTrail } from '../engine/share'
import { emptyStats, recordDaily, type Stats } from '../engine/stats'
import { loadWordData, type WordData } from '../engine/vectors'

export const puzzleFile = puzzleJson as PuzzleFile

export type Mode = 'daily' | 'practice'
export type Sheet = 'result' | 'stats' | 'howto' | 'credits' | null

export type Feedback =
  | { id: number; type: 'judgement'; judgement: Judgement; from: string }
  | { id: number; type: 'whisper'; word: string | null; cost: boolean }
  | { id: number; type: 'undo'; word: string }

type FeedbackInput =
  | Omit<Extract<Feedback, { type: 'judgement' }>, 'id'>
  | Omit<Extract<Feedback, { type: 'whisper' }>, 'id'>
  | Omit<Extract<Feedback, { type: 'undo' }>, 'id'>

interface Persisted {
  runs: Record<string, Run>
  stats: Stats
  sound: boolean
  seenHowTo: boolean
  practiceIndex: number
}

interface GameState extends Persisted {
  status: 'loading' | 'ready' | 'error'
  data: WordData | null
  mode: Mode
  today: number
  feedback: Feedback | null
  sheet: Sheet

  load: () => Promise<void>
  refreshDay: () => void
  setMode: (mode: Mode) => void
  newPractice: () => void
  submit: (text: string) => Judgement | null
  leap: () => void
  whisper: () => void
  undo: () => void
  openSheet: (sheet: Sheet) => void
  toggleSound: () => void
  markHowToSeen: () => void
}

const puzzleCache = new Map<string, Puzzle>()
function cachedPuzzle(p: Puzzle): Puzzle {
  const hit = puzzleCache.get(p.key)
  if (hit) return hit
  puzzleCache.set(p.key, p)
  return p
}

export function puzzleFor(s: Pick<GameState, 'mode' | 'today' | 'practiceIndex'>): Puzzle {
  return cachedPuzzle(
    s.mode === 'daily' ? dailyPuzzle(puzzleFile, s.today) : practicePuzzle(puzzleFile, s.practiceIndex),
  )
}

const riverCache = new Map<string, River>()
export function riverFor(data: WordData | null, puzzle: Puzzle): River | null {
  if (!data) return null
  let river = riverCache.get(puzzle.key)
  if (!river || river.data !== data) {
    river = makeRiver(data, puzzle)
    riverCache.set(puzzle.key, river)
  }
  return river
}

const freshRuns = new Map<string, Run>()
export function runFor(runs: Record<string, Run>, puzzle: Puzzle): Run {
  const saved = runs[puzzle.key]
  if (saved) return saved
  let fresh = freshRuns.get(puzzle.key)
  if (!fresh) freshRuns.set(puzzle.key, (fresh = newRun(puzzle)))
  return fresh
}

/** Only today's daily and the current practice river are worth keeping. */
function pruneRuns(runs: Record<string, Run>, today: number, practiceIndex: number): Record<string, Run> {
  const keep = new Set([dailyPuzzle(puzzleFile, today).key, practicePuzzle(puzzleFile, practiceIndex).key])
  return Object.fromEntries(Object.entries(runs).filter(([k]) => keep.has(k)))
}

let feedbackId = 0

export const useGame = create<GameState>()(
  persist(
    (set, get) => {
      const current = () => {
        const s = get()
        const puzzle = puzzleFor(s)
        return { s, puzzle, river: riverFor(s.data, puzzle), run: runFor(s.runs, puzzle) }
      }

      const commit = (puzzle: Puzzle, prev: Run, next: Run, feedback: FeedbackInput) => {
        const s = get()
        let stats = s.stats
        if (next.done && !prev.done) {
          stats =
            puzzle.mode === 'daily'
              ? recordDaily(stats, puzzle.number, next.strokes.length, puzzle.par, strokeTrail(next))
              : { ...stats, practiceCrossed: stats.practiceCrossed + 1 }
        }
        set({
          runs: pruneRuns({ ...s.runs, [puzzle.key]: next }, s.today, s.practiceIndex),
          stats,
          feedback: { ...feedback, id: ++feedbackId } as Feedback,
        })
      }

      return {
        runs: {},
        stats: emptyStats(),
        sound: true,
        seenHowTo: false,
        practiceIndex: randomPracticeIndex(puzzleFile),

        status: 'loading',
        data: null,
        mode: 'daily',
        today: dailyNumber(new Date(), puzzleFile.launch),
        feedback: null,
        sheet: null,

        load: async () => {
          if (get().data) return
          set({ status: 'loading' })
          try {
            const data = await loadWordData(binUrl, vocabUrl)
            set({ data, status: 'ready' })
          } catch (err) {
            console.error(err)
            set({ status: 'error' })
          }
        },

        refreshDay: () => {
          const today = dailyNumber(new Date(), puzzleFile.launch)
          if (today !== get().today) set({ today, feedback: null })
        },

        setMode: (mode) => {
          if (mode !== get().mode) set({ mode, feedback: null, sheet: null })
        },

        newPractice: () => {
          const s = get()
          const practiceIndex = randomPracticeIndex(puzzleFile, s.practiceIndex)
          set({
            mode: 'practice',
            practiceIndex,
            runs: pruneRuns(s.runs, s.today, practiceIndex),
            feedback: null,
            sheet: null,
          })
        },

        submit: (text) => {
          const { puzzle, river, run } = current()
          if (!river || run.done) return null
          const judgement = judge(river, run, text)
          if (judgement.kind === 'invalid' && judgement.reason === 'empty') return judgement
          const from = run.stones[run.stones.length - 1].label
          commit(puzzle, run, applyJudgement(run, judgement), { type: 'judgement', judgement, from })
          return judgement
        },

        leap: () => {
          const { puzzle, river, run } = current()
          if (!river || !canLeap(river, run)) return
          const judgement = judge(river, run, puzzle.target)
          const from = run.stones[run.stones.length - 1].label
          commit(puzzle, run, applyJudgement(run, judgement), { type: 'judgement', judgement, from })
        },

        whisper: () => {
          const { puzzle, river, run } = current()
          if (!river || run.done) return
          if (run.whisper) {
            set({ feedback: { id: ++feedbackId, type: 'whisper', word: run.whisper, cost: false } })
            return
          }
          const next = applyWhisper(river, run)
          if (next === run) {
            set({ feedback: { id: ++feedbackId, type: 'whisper', word: null, cost: false } })
            return
          }
          commit(puzzle, run, next, { type: 'whisper', word: next.whisper, cost: true })
        },

        undo: () => {
          const { puzzle, run } = current()
          const next = undoRun(run)
          if (next === run) return
          commit(puzzle, run, next, { type: 'undo', word: run.stones[run.stones.length - 1].label })
        },

        openSheet: (sheet) => set({ sheet }),
        toggleSound: () => set({ sound: !get().sound }),
        markHowToSeen: () => set({ seenHowTo: true }),
      }
    },
    {
      name: 'stepstone',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): Persisted => ({
        runs: s.runs,
        stats: s.stats,
        sound: s.sound,
        seenHowTo: s.seenHowTo,
        practiceIndex: s.practiceIndex,
      }),
    },
  ),
)

/** The river, run and puzzle currently on screen. */
export function useCurrent() {
  const mode = useGame((s) => s.mode)
  const today = useGame((s) => s.today)
  const practiceIndex = useGame((s) => s.practiceIndex)
  const data = useGame((s) => s.data)
  const runs = useGame((s) => s.runs)
  const puzzle = puzzleFor({ mode, today, practiceIndex })
  return { puzzle, river: riverFor(data, puzzle), run: runFor(runs, puzzle) }
}
