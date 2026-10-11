import { motion } from 'motion/react'

export function Lily({ filled, delay = 0, size = 44 }: { filled: boolean; delay?: number; size?: number }) {
  const petal = filled ? 'var(--color-blossom-300)' : 'var(--color-pebble-200)'
  const inner = filled ? 'var(--color-blossom-200)' : 'var(--color-pebble-100)'
  return (
    <motion.svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden
      initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', damping: 11, stiffness: 220, delay }}
    >
      <ellipse cx="24" cy="38" rx="20" ry="6" fill={filled ? 'var(--color-moss-300)' : 'var(--color-pebble-100)'} />
      {[-60, -30, 0, 30, 60].map((a) => (
        <ellipse key={a} cx="24" cy="18" rx="5.5" ry="13" fill={petal} transform={`rotate(${a} 24 32)`} />
      ))}
      {[-15, 15].map((a) => (
        <ellipse key={a} cx="24" cy="22" rx="4.5" ry="9" fill={inner} transform={`rotate(${a} 24 32)`} />
      ))}
      <circle cx="24" cy="29" r="3.5" fill={filled ? 'var(--color-butter-300)' : 'var(--color-pebble-300)'} />
    </motion.svg>
  )
}
