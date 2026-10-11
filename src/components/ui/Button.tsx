import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

import { cx } from './cx'

type Variant = 'primary' | 'soft' | 'whisper' | 'butter' | 'ghost'

const variants: Record<Variant, { className: string; ledge: string }> = {
  primary: { className: 'bg-moss-700 text-white hover:bg-moss-600 disabled:bg-moss-300', ledge: 'var(--color-moss-800)' },
  soft: { className: 'bg-white text-ink hover:bg-pebble-50 disabled:text-ink-soft/60', ledge: 'var(--color-pebble-300)' },
  whisper: {
    className: 'bg-lilac-100 text-lilac-600 hover:bg-lilac-200 disabled:opacity-60',
    ledge: 'var(--color-lilac-200)',
  },
  butter: { className: 'bg-butter-300 text-ink hover:bg-butter-200', ledge: 'var(--color-butter-700)' },
  ghost: { className: 'bg-transparent text-ink-soft hover:bg-pebble-100 shadow-none!', ledge: 'transparent' },
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'md' | 'lg'
  icon?: ReactNode
}

export function Button({ variant = 'soft', size = 'md', icon, className, children, style, ...rest }: ButtonProps) {
  const v = variants[variant]
  return (
    <button
      type="button"
      {...rest}
      style={{ '--ledge': v.ledge, ...style } as CSSProperties}
      className={cx(
        'press inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl font-bold select-none',
        size === 'lg' ? 'px-6 text-lg' : 'px-4 text-base',
        v.className,
        className,
      )}
    >
      {icon}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: ReactNode
}

/** A round 48px icon button; `label` is its accessible name and tooltip. */
export function IconButton({ label, className, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        'inline-flex size-12 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-pebble-100 hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}
