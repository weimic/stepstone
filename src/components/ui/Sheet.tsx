import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { IconButton } from './Button'

interface SheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Seconds to wait before sliding in, e.g. to let the crossing animation finish. */
  delay?: number
}

/** A bottom sheet on phones, a centered card on wider screens. */
export function Sheet({ open, title, onClose, children, delay = 0 }: SheetProps) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab' || !panel.current) return
      const items = panel.current.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex]:not([tabindex="-1"])')
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const focusTimer = window.setTimeout(() => body.current?.focus(), delay * 1000 + 50)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.clearTimeout(focusTimer)
      previous?.focus?.()
    }
  }, [open, onClose, delay])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
          <motion.div
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay } }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="relative flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-blob bg-paper shadow-lift outline-none sm:rounded-blob"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1, transition: { type: 'spring', damping: 26, stiffness: 260, delay } }}
            exit={{ y: '100%', opacity: 0, transition: { duration: 0.2 } }}
          >
            <div className="shrink-0 px-6 pt-4">
              <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-pebble-200 sm:hidden" aria-hidden />
              <div className="flex items-center justify-between gap-4">
                <h2 id={titleId} className="text-2xl font-extrabold text-ink">
                  {title}
                </h2>
                <IconButton label="Close" onClick={onClose} className="-mr-3">
                  <X size={22} />
                </IconButton>
              </div>
            </div>
            <div
              ref={body}
              tabIndex={-1}
              className="soft-scroll min-h-0 flex-1 overflow-y-auto px-6 pb-[max(2rem,env(safe-area-inset-bottom))] outline-none"
            >
              {/* Blank gap at rest; fades content as it scrolls under the title. */}
              <div className="pointer-events-none sticky top-0 z-10 -mx-6 h-3 bg-linear-to-b from-paper" aria-hidden />
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
