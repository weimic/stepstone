import { motion } from 'motion/react'
import type { Stone as StoneData } from '../engine/rules'
import { cx } from './ui/cx'
import { hash, type Spot } from './layout'

const look = {
  start: { face: 'bg-moss-300 text-moss-800', ledge: 'border-moss-600', pips: 0 },
  strong: { face: 'bg-moss-200 text-moss-800', ledge: 'border-moss-400', pips: 3 },
  sturdy: { face: 'bg-pebble-100 text-ink', ledge: 'border-pebble-300', pips: 2 },
  wobbly: { face: 'bg-pebble-50 text-ink-soft', ledge: 'border-pebble-200 border-dashed', pips: 1 },
}

const shapes = [
  '46% 54% 52% 48% / 58% 52% 48% 42%',
  '52% 48% 44% 56% / 50% 60% 40% 50%',
  '50% 50% 56% 44% / 56% 46% 54% 44%',
]

interface StoneProps {
  stone: StoneData
  spot: Spot
  isStart: boolean
  isNew: boolean
}

export function Stone({ stone, spot, isStart, isNew }: StoneProps) {
  const kind = isStart ? 'start' : (stone.strength ?? 'wobbly')
  const l = look[kind]
  const h = hash(stone.word)
  const long = stone.label.length > 8

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${spot.x}%`, top: `${spot.y}%`, zIndex: Math.round(100 - spot.y) }}
    >
      {isNew && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -mt-6 -ml-12 h-12 w-24 rounded-[50%] border-2 border-white/80"
          initial={{ scale: 0.6, opacity: 0.9 }}
          animate={{ scale: 2.3, opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
      )}
      <motion.div
        initial={isNew ? { scale: 0.3, opacity: 0, y: 14 } : false}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.5, opacity: 0, y: 12, transition: { duration: 0.25 } }}
        transition={{ type: 'spring', damping: 13, stiffness: 260 }}
      >
        <motion.div
          animate={kind === 'wobbly' ? { rotate: [-2.5, 2.5, -2.5] } : undefined}
          transition={kind === 'wobbly' ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : undefined}
          className={cx(
            'relative flex min-w-[5.5rem] flex-col items-center border-b-[5px] px-3.5 pt-1.5 pb-1 shadow-soft',
            l.face,
            l.ledge,
          )}
          style={{ borderRadius: shapes[h % shapes.length] }}
        >
          {kind === 'strong' && (
            <span
              aria-hidden
              className="absolute -top-1 left-3 h-2.5 w-6 rounded-full bg-moss-400/70"
              style={{ transform: `rotate(${(h % 20) - 10}deg)` }}
            />
          )}
          <span className={cx('leading-tight font-extrabold', long ? 'text-sm' : 'text-base')}>{stone.label}</span>
          <span className="flex h-2.5 items-center gap-1" aria-hidden>
            {Array.from({ length: l.pips }, (_, i) => (
              <span key={i} className="size-1.5 rounded-full bg-current opacity-50" />
            ))}
          </span>
        </motion.div>
      </motion.div>
    </div>
  )
}
