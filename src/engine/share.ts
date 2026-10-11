import type { Puzzle, Run, StrokeKind } from './rules'
import { strokesLabel } from './scoring'

const EMOJI: Record<StrokeKind, string> = {
  stone: '🪨',
  splash: '💦',
  whisper: '🍃',
  leap: '🌿',
}

/** Starting stone, then one emoji per stroke. Never includes the words in between. */
export function strokeTrail(run: Run): string {
  return '🪨' + run.strokes.map((s) => EMOJI[s]).join('')
}

export function shareText(puzzle: Puzzle, run: Run, url?: string): string {
  const title = puzzle.mode === 'daily' ? `StepStone #${puzzle.number} 🐸` : 'StepStone practice 🐸'
  const lines = [
    title,
    `${puzzle.start.toUpperCase()} → ${puzzle.target.toUpperCase()}`,
    strokeTrail(run),
    `${strokesLabel(run.strokes.length)} · par ${puzzle.par}`,
  ]
  if (url) lines.push(url)
  return lines.join('\n')
}
