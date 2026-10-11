import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { canLeap } from '../engine/rules'
import { useCurrent, useGame } from '../store/game'
import { Frog, SplashFx } from './Frog'
import { FAR_BANK, layoutStones, splashSpot, type Spot } from './layout'
import { Stone } from './Stone'
import { Button } from './ui/Button'
import { cx } from './ui/cx'

const PADS = [
  { x: 7, y: 44, size: 46, delay: 0, flower: false },
  { x: 92, y: 62, size: 40, delay: -6, flower: true },
  { x: 10, y: 74, size: 34, delay: -11, flower: false },
  { x: 89, y: 33, size: 30, delay: -3, flower: false },
]

const FROG_ON_FAR_BANK: Spot = { x: 22, y: 15 }

function LilyPad({ size, flower }: { size: number; flower: boolean }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      <path d="M20 20 L33.8 8.4 A18 18 0 1 1 26.2 3.1 Z" fill="var(--color-moss-300)" />
      <path d="M20 20 L8 14 M20 20 L12 32 M20 20 L28 33 M20 20 L37 22" stroke="var(--color-moss-400)" strokeWidth="1.2" />
      {flower && (
        <g transform="translate(22 22)">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} rx="3.2" ry="6" cy="-4" fill="var(--color-blossom-200)" transform={`rotate(${a})`} />
          ))}
          <circle r="2.6" fill="var(--color-butter-300)" />
        </g>
      )}
    </svg>
  )
}

export function River() {
  const { puzzle, river, run } = useCurrent()
  const status = useGame((s) => s.status)
  const feedback = useGame((s) => s.feedback)
  const { leap, load } = useGame.getState()
  const box = useRef<HTMLDivElement>(null)

  const spots = useMemo(() => layoutStones(run.stones), [run.stones])
  const current = spots[spots.length - 1]
  const leapable = river ? canLeap(river, run) : false
  const frogSpot = run.done ? FROG_ON_FAR_BANK : current

  const j = feedback?.type === 'judgement' ? feedback.judgement : null
  const landed = j?.kind === 'land'
  const hopId = feedback && (landed || j?.kind === 'leap' || feedback.type === 'undo') ? feedback.id : 0
  const splash = j?.kind === 'splash' && feedback ? { id: feedback.id, to: splashSpot(current, j.nearMiss) } : null

  useEffect(() => {
    if (feedback?.type !== 'judgement' || feedback.judgement.kind !== 'leap' || !box.current) return
    const r = box.current.getBoundingClientRect()
    const origin = {
      x: (r.left + (r.width * FAR_BANK.x) / 100) / window.innerWidth,
      y: (r.top + (r.height * FAR_BANK.y) / 100) / window.innerHeight,
    }
    const timer = window.setTimeout(() => {
      const petals = { colors: ['#f9cbd5', '#f3a8b9', '#ffe9a3', '#c9e4ac', '#ddd0f5'], disableForReducedMotion: true }
      confetti({ ...petals, origin, particleCount: 70, spread: 75, startVelocity: 28, gravity: 0.55, scalar: 1.1, ticks: 260, shapes: ['circle'] })
      confetti({ ...petals, origin, particleCount: 30, spread: 120, startVelocity: 18, gravity: 0.4, scalar: 0.8, ticks: 300 })
    }, 450)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const path = [...spots, ...(run.done ? [FROG_ON_FAR_BANK] : [])]

  return (
    <div className="relative isolate mx-3 min-h-[17rem] flex-1 overflow-hidden rounded-blob shadow-soft" ref={box}>
      <div className="water animate-shimmer absolute inset-0" />

      {PADS.map((p) => (
        <div
          key={p.x}
          className="absolute -translate-x-1/2 -translate-y-1/2 opacity-90"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          <div className="animate-drift" style={{ animationDelay: `${p.delay}s` }}>
            <LilyPad size={p.size} flower={p.flower} />
          </div>
        </div>
      ))}

      {/* Far bank */}
      <div className="absolute inset-x-0 top-0 h-[17%] rounded-b-[50%_40%] bg-linear-to-b from-moss-300 to-moss-200" />
      <div className="absolute top-[1.5%] left-[8%] text-lg" aria-hidden>
        🌼
      </div>
      <div className="absolute top-[3%] right-[9%] text-base" aria-hidden>
        🌷
      </div>
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${FAR_BANK.x}%`, top: `${FAR_BANK.y}%`, zIndex: 150 }}
      >
        {leapable && (
          <motion.span
            aria-hidden
            className="absolute -inset-3 rounded-3xl bg-butter-200 blur-md"
            animate={{ opacity: [0.45, 1, 0.45], scale: [0.95, 1.06, 0.95] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <button
          type="button"
          onClick={leap}
          disabled={!leapable}
          aria-label={leapable ? `Leap across to ${puzzle.target}` : `Far bank: ${puzzle.target}`}
          className={cx(
            'press relative flex flex-col items-center rounded-2xl px-5 py-1.5',
            run.done ? 'bg-moss-700 text-white' : 'bg-paper text-moss-800',
          )}
          style={{ '--ledge': run.done ? 'var(--color-moss-800)' : 'var(--color-moss-600)' } as CSSProperties}
        >
          <span className={cx('text-[0.65rem] font-bold tracking-widest uppercase', run.done ? 'text-moss-100' : 'text-ink-soft')}>
            {run.done ? 'Crossed!' : leapable ? 'Within reach' : 'Far bank'}
          </span>
          <span className="text-xl leading-tight font-black tracking-wide">{puzzle.target.toUpperCase()}</span>
        </button>
      </div>

      {/* Near bank */}
      <div className="absolute inset-x-0 bottom-0 h-[13%] rounded-t-[50%_40%] bg-linear-to-t from-moss-300 to-moss-200" />

      <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <polyline
          points={path.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="white"
          strokeOpacity="0.7"
          strokeWidth="2.5"
          strokeDasharray="2 7"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <AnimatePresence>
        {run.stones.map((s, i) => (
          <Stone
            key={`${i}-${s.word}`}
            stone={s}
            spot={spots[i]}
            isStart={i === 0}
            isNew={landed && i === run.stones.length - 1}
          />
        ))}
      </AnimatePresence>

      {splash && <SplashFx key={splash.id} from={current} to={splash.to} />}
      <Frog spot={frogSpot} hopId={hopId} splashId={splash?.id ?? 0} />

      {status !== 'ready' && (
        <div className="absolute inset-0 z-[300] flex flex-col items-center justify-center gap-3 bg-water-100/70 backdrop-blur-[1px]">
          {status === 'loading' ? (
            <>
              <motion.div
                className="size-4 rounded-full bg-water-400"
                animate={{ y: [0, 18, 18], scale: [1, 1, 2.6], opacity: [1, 1, 0] }}
                transition={{ duration: 1.3, repeat: Infinity, times: [0, 0.5, 1] }}
              />
              <p className="font-bold text-ink-soft">Filling the pond…</p>
            </>
          ) : (
            <>
              <p className="px-8 text-center font-bold text-ink">The pond didn’t fill. Check your connection and try again.</p>
              <Button variant="primary" onClick={() => load()}>
                Try again
              </Button>
            </>
          )}
        </div>
      )}

      <div className="sr-only">
        <p>
          River from {puzzle.start} to {puzzle.target}.
        </p>
        <ol aria-label="Your stones">
          {run.stones.map((s, i) => (
            <li key={`${i}-${s.word}`}>
              {s.label}
              {s.strength ? `, ${s.strength} link` : ', starting stone'}
            </li>
          ))}
        </ol>
        {leapable && <p>The far bank is within reach.</p>}
      </div>
    </div>
  )
}
