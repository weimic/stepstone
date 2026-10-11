import { motion, useReducedMotion } from 'motion/react'
import type { Spot } from './layout'

export function FrogArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 56" className={className} aria-hidden>
      <ellipse cx="14" cy="47" rx="10" ry="6" fill="#5a9445" />
      <ellipse cx="50" cy="47" rx="10" ry="6" fill="#5a9445" />
      <ellipse cx="32" cy="35" rx="24" ry="17" fill="#86bc62" />
      <ellipse cx="32" cy="41" rx="14" ry="8.5" fill="#e3f1d3" />
      <circle cx="20" cy="17" r="9" fill="#86bc62" />
      <circle cx="44" cy="17" r="9" fill="#86bc62" />
      <circle cx="20" cy="16" r="5.5" fill="#fff" />
      <circle cx="44" cy="16" r="5.5" fill="#fff" />
      <circle cx="21" cy="17" r="3" fill="#36334a" />
      <circle cx="45" cy="17" r="3" fill="#36334a" />
      <circle cx="22" cy="15.6" r="1" fill="#fff" />
      <circle cx="46" cy="15.6" r="1" fill="#fff" />
      <ellipse cx="17" cy="32" rx="4" ry="2.5" fill="#f3a8b9" opacity=".85" />
      <ellipse cx="47" cy="32" rx="4" ry="2.5" fill="#f3a8b9" opacity=".85" />
      <path d="M26 31 q6 5 12 0" stroke="#36334a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

const HOP = { duration: 0.55, ease: [0.3, 0, 0.3, 1] as const }

interface FrogProps {
  spot: Spot
  /** Changes on every hop, to replay the jump arc. 0 means stay still. */
  hopId: number
  /** Changes on every splash; the frog hides while its ghost falls in, then pops back. */
  splashId: number
}

export function Frog({ spot, hopId, splashId }: FrogProps) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{ zIndex: 200 }}
      initial={false}
      animate={{ left: `${spot.x}%`, top: `${spot.y}%` }}
      transition={reduce ? { duration: 0 } : HOP}
    >
      <motion.div key={hopId} animate={hopId ? { y: [0, -44, 0] } : { y: 0 }} transition={{ ...HOP, times: [0, 0.45, 1] }}>
        <motion.div
          key={splashId}
          initial={splashId ? { opacity: 0, scale: 0.5 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: splashId ? 1.05 : 0, type: 'spring', damping: 12, stiffness: 300 }}
        >
          <FrogArt className="w-11 -translate-x-1/2 -translate-y-[calc(100%+16px)] drop-shadow-sm" />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

const DROPS = [-150, -115, -80, -45, -10, 25]

/** A ghost frog hops short of the next stone, splashes in, and the ripples spread. */
export function SplashFx({ from, to }: { from: Spot; to: Spot }) {
  const reduce = useReducedMotion()
  return (
    <>
      {!reduce && (
        <motion.div
          className="pointer-events-none absolute"
          style={{ zIndex: 210 }}
          initial={{ left: `${from.x}%`, top: `${from.y}%`, opacity: 1 }}
          animate={{ left: `${to.x}%`, top: `${to.y}%`, opacity: [1, 1, 0] }}
          transition={{ duration: 0.7, times: [0, 0.6, 1], ease: 'easeOut' }}
        >
          <motion.div
            animate={{ y: [0, -40, 6], scale: [1, 1, 0.4] }}
            transition={{ duration: 0.7, times: [0, 0.4, 1] }}
          >
            <FrogArt className="w-11 -translate-x-1/2 -translate-y-[calc(100%+16px)]" />
          </motion.div>
        </motion.div>
      )}
      <div className="pointer-events-none absolute" style={{ left: `${to.x}%`, top: `${to.y}%`, zIndex: 205 }}>
        {[0, 0.25].map((d) => (
          <motion.span
            key={d}
            className="absolute -mt-4 -ml-9 h-8 w-18 rounded-[50%] border-2 border-white"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [0.3, 2.2], opacity: [0.9, 0] }}
            transition={{ duration: 1.1, delay: (reduce ? 0 : 0.42) + d, ease: 'easeOut' }}
          />
        ))}
        {!reduce &&
          DROPS.map((deg) => {
            const r = (deg * Math.PI) / 180
            return (
              <motion.span
                key={deg}
                className="absolute -mt-1 -ml-1 size-2.5 rounded-full bg-water-50"
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{ x: Math.cos(r) * 34, y: [0, Math.sin(r) * 34 - 10, Math.sin(r) * 34 + 18], opacity: [0, 1, 0] }}
                transition={{ duration: 0.7, delay: 0.45, ease: 'easeOut' }}
              />
            )
          })}
      </div>
    </>
  )
}
