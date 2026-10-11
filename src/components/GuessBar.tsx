import { ArrowUp, Check, Droplets, Info, Shuffle, Sparkles, Undo2, Wind } from 'lucide-react'
import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { canLeap } from '../engine/rules'
import { useCurrent, useGame } from '../store/game'
import { messageFor, type Tone } from './messages'
import { Button } from './ui/Button'
import { cx } from './ui/cx'

const toneStyle: Record<Tone, { box: string; Icon: typeof Info }> = {
  good: { box: 'bg-moss-50 text-moss-800', Icon: Check },
  great: { box: 'bg-butter-100 text-ink', Icon: Sparkles },
  soft: { box: 'bg-pebble-100 text-ink-soft', Icon: Info },
  miss: { box: 'bg-coral-100 text-coral-600', Icon: Droplets },
  info: { box: 'bg-lilac-100 text-lilac-600', Icon: Wind },
}

function Slot({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
    >
      {children}
    </motion.div>
  )
}

/** Nudge toward a whisper after two splashes in a row, or once well over par. */
function shouldNudge(strokes: string[], par: number): boolean {
  const n = strokes.length
  return (n >= 2 && strokes[n - 1] === 'splash' && strokes[n - 2] === 'splash') || n >= par + 3
}

export function GuessBar() {
  const status = useGame((s) => s.status)
  const feedback = useGame((s) => s.feedback)
  const { submit, leap, whisper, undo, openSheet, newPractice } = useGame.getState()
  const { puzzle, river, run } = useCurrent()
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const [scope, animate] = useAnimate()

  const ready = status === 'ready'
  const leapable = river ? canLeap(river, run) : false
  const current = run.stones[run.stones.length - 1].label
  const message = feedback ? messageFor(feedback, puzzle.target) : null
  const nudge = !run.done && !leapable && !run.whisper && shouldNudge(run.strokes, puzzle.par)

  useEffect(() => {
    if (!feedback || feedback.type !== 'judgement' || !scope.current) return
    const k = feedback.judgement.kind
    if (k === 'splash' || k === 'unknown' || k === 'repeat') {
      animate(scope.current, { x: [0, -8, 7, -5, 3, 0] }, { duration: 0.4 })
    }
  }, [feedback, animate, scope])

  const play = (word: string) => {
    const j = submit(word)
    if (j && j.kind !== 'unknown' && j.kind !== 'invalid') setText('')
    input.current?.focus()
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (ready) play(text)
  }

  if (run.done) {
    return (
      <div className="flex min-h-[10.75rem] flex-col justify-center gap-3 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button variant="primary" size="lg" onClick={() => openSheet('result')} icon={<Sparkles size={20} />}>
          See your crossing
        </Button>
        {puzzle.mode === 'practice' && (
          <Button variant="soft" onClick={newPractice}>
            Try another river
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-[10.75rem] flex-col gap-2 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between px-1 text-sm font-bold text-ink-soft">
        <span>
          Strokes <span className="text-ink tabular-nums">{run.strokes.length}</span>
        </span>
        {puzzle.mode === 'practice' && (
          <button
            type="button"
            onClick={newPractice}
            className="hit -my-2 inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-ink-soft hover:bg-pebble-100 hover:text-ink"
          >
            <Shuffle size={15} aria-hidden /> New river
          </button>
        )}
        <span>
          Par <span className="text-ink tabular-nums">{puzzle.par}</span>
        </span>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {message &&
          `${message.text}${message.suggestion && message.tone === 'soft' ? ` ${message.suggestion}?` : ''}${message.rank ? ` Ranked ${message.rank}.` : ''}`}
      </p>

      {/* One fixed-height slot, so the river never jumps: leap, then whisper, then the latest message. */}
      <div className="relative h-14">
        <AnimatePresence initial={false}>
          {leapable ? (
            <Slot key="leap">
              <Button
                variant="butter"
                size="lg"
                onClick={leap}
                className="w-full animate-bob ring-4 ring-butter-200"
                icon={<Sparkles size={20} />}
              >
                Leap across to {puzzle.target.toUpperCase()}
              </Button>
            </Slot>
          ) : run.whisper ? (
            <Slot key={`whisper-${run.whisper}`}>
              <Button variant="whisper" onClick={() => play(run.whisper!)} className="w-full" icon={<Wind size={18} />}>
                The river whispers “{run.whisper}”. Step on it
              </Button>
            </Slot>
          ) : message && feedback ? (
            <Slot key={feedback.id}>
              <div
                className={cx(
                  'flex w-full items-center gap-2 rounded-2xl px-3 py-1.5 text-[0.9rem] leading-snug font-semibold',
                  toneStyle[message.tone].box,
                )}
              >
                {(() => {
                  const Icon = toneStyle[message.tone].Icon
                  return <Icon size={18} className="shrink-0" aria-hidden />
                })()}
                <span className="min-w-0 flex-1">
                  {message.text}
                  {message.suggestion && message.tone === 'soft' && (
                    <>
                      {' '}
                      <button
                        type="button"
                        className="hit rounded-full bg-white px-2 py-0.5 font-bold text-ink underline decoration-moss-300 decoration-2 underline-offset-2"
                        onClick={() => play(message.suggestion!)}
                      >
                        {message.suggestion}
                      </button>
                      ?
                    </>
                  )}
                  {message.rank && (
                    <span className="ml-1.5 font-medium whitespace-nowrap tabular-nums opacity-70">{message.rank}</span>
                  )}
                </span>
              </div>
            </Slot>
          ) : null}
        </AnimatePresence>
      </div>

      <form onSubmit={onSubmit} className="flex items-center gap-2" ref={scope}>
        <Button
          variant="soft"
          aria-label="Undo last stone"
          title="Undo (strokes stay spent)"
          onClick={undo}
          disabled={!ready || run.stones.length < 2}
          className="w-12 shrink-0 px-0!"
        >
          <Undo2 size={20} />
        </Button>

        <label className="relative min-w-0 flex-1">
          <span className="sr-only">A word linked to {current}</span>
          <input
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!ready}
            placeholder={ready ? `Linked to “${current}”…` : 'Filling the pond…'}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            maxLength={24}
            className="h-14 w-full rounded-2xl border-2 border-pebble-200 bg-white pr-14 pl-4 text-lg font-semibold text-ink shadow-soft transition-colors outline-none placeholder:font-medium placeholder:text-ink-soft/70 focus:border-moss-400 disabled:bg-pebble-50"
          />
          <button
            type="submit"
            aria-label="Lay stone"
            disabled={!ready || !text.trim()}
            className="press hit absolute top-1/2 right-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-xl bg-moss-700 text-white disabled:bg-moss-200"
            style={{ '--ledge': 'var(--color-moss-800)' } as CSSProperties}
          >
            <ArrowUp size={20} strokeWidth={2.6} />
          </button>
        </label>

        <div className="relative shrink-0">
          {nudge && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-2xl bg-lilac-200"
              animate={{ scale: [1, 1.25], opacity: [0.8, 0] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
          )}
          <Button
            variant="whisper"
            onClick={whisper}
            disabled={!ready || leapable}
            title="Whisper a hint (1 stroke)"
            className="relative min-w-12 px-3!"
            icon={<Wind size={18} />}
          >
            <span className="hidden sm:inline">Whisper</span>
            <span className="sr-only sm:hidden">Whisper a hint</span>
          </Button>
        </div>
      </form>
    </div>
  )
}
