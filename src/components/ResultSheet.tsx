import { Check, Copy, Share2, Shuffle } from 'lucide-react'
import { useState } from 'react'
import { liliesFor, parLabel, ratingTitle, strokesLabel } from '../engine/scoring'
import { shareText, strokeTrail } from '../engine/share'
import { currentStreak } from '../engine/stats'
import { useCurrent, useGame } from '../store/game'
import { Countdown } from './Countdown'
import { Lily } from './Lily'
import { Button } from './ui/Button'
import { Sheet } from './ui/Sheet'

type ShareState = 'idle' | 'copied' | 'shared' | 'failed'

async function shareOrCopy(text: string): Promise<ShareState> {
  const touch = window.matchMedia('(pointer: coarse)').matches
  if (touch && navigator.share) {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'idle'
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

const LEGEND = [
  ['🪨', 'stone'],
  ['💦', 'splash'],
  ['🍃', 'whisper'],
  ['🌿', 'leap'],
] as const

export function ResultSheet() {
  const open = useGame((s) => s.sheet === 'result')
  const stats = useGame((s) => s.stats)
  const today = useGame((s) => s.today)
  const { openSheet, newPractice } = useGame.getState()
  const { puzzle, run } = useCurrent()
  const [shareState, setShareState] = useState<ShareState>('idle')

  if (!run.done) return null
  const strokes = run.strokes.length
  const lilies = liliesFor(strokes, puzzle.par)
  const text = shareText(puzzle, run, `${location.origin}${location.pathname}`)
  const notes = puzzle.notes ?? []
  const close = () => {
    openSheet(null)
    setShareState('idle')
  }

  return (
    <Sheet open={open} onClose={close} title={ratingTitle(lilies)}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-end gap-1" role="img" aria-label={`${lilies} of 3 lilies`}>
            {[1, 2, 3].map((n) => (
              <Lily key={n} filled={n <= lilies} delay={0.15 * n} size={n === 2 ? 56 : 46} />
            ))}
          </div>
          <p className="text-lg font-bold text-ink">
            {strokesLabel(strokes)} · par {puzzle.par}
          </p>
          <p className="text-sm font-semibold text-ink-soft">{parLabel(strokes, puzzle.par)}</p>
        </div>

        <section className="rounded-2xl bg-white p-4 shadow-soft">
          <h3 className="mb-2 text-sm font-bold tracking-wide text-ink-soft uppercase">Your crossing</h3>
          <p className="text-2xl tracking-wider" aria-label={run.strokes.join(', ')}>
            {strokeTrail(run)}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 text-xs font-semibold text-ink-soft">
            {LEGEND.map(([e, l]) => (
              <span key={l}>
                {e} {l}
              </span>
            ))}
          </p>
          <p className="mt-3 font-semibold text-ink">
            {[...run.stones.map((s) => s.label), puzzle.target].join(' → ')}
          </p>
        </section>

        <section className="rounded-2xl bg-moss-50 p-4">
          <h3 className="mb-2 text-sm font-bold tracking-wide text-moss-800 uppercase">
            {strokes < puzzle.par ? 'Our route' : notes.length ? 'The shortest route' : 'One shortest route'}
          </h3>
          <ol className="flex flex-col gap-2">
            {puzzle.route.slice(1).map((w, i) => (
              <li key={w} className="flex flex-col">
                <span className="font-bold text-ink">
                  {puzzle.route[i]} → {w}
                </span>
                {notes[i] && <span className="text-sm text-ink-soft">{notes[i]}</span>}
              </li>
            ))}
          </ol>
        </section>

        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            size="lg"
            onClick={async () => setShareState(await shareOrCopy(text))}
            icon={shareState === 'copied' ? <Check size={20} /> : <Share2 size={20} />}
          >
            {shareState === 'copied' ? 'Copied to clipboard' : 'Share your crossing'}
          </Button>
          {shareState === 'failed' && (
            <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
              <span className="flex items-center gap-1">
                <Copy size={14} /> Copy this to share:
              </span>
              <textarea
                readOnly
                value={text}
                rows={5}
                onFocus={(e) => e.currentTarget.select()}
                className="rounded-xl border-2 border-pebble-200 bg-white p-2 font-mono text-sm text-ink"
              />
            </label>
          )}
          {puzzle.mode === 'daily' ? (
            <>
              <p className="text-center text-sm font-semibold text-ink-soft">
                {currentStreak(stats, today) > 1 && `🔥 ${currentStreak(stats, today)} day streak · `}
                Next river in <Countdown />
              </p>
              <Button variant="soft" onClick={newPractice} icon={<Shuffle size={18} />}>
                Practice on a random river
              </Button>
            </>
          ) : (
            <Button variant="soft" onClick={newPractice} icon={<Shuffle size={18} />}>
              Try another river
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
