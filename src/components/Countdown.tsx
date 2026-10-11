import { useEffect, useState } from 'react'
import { msUntilTomorrow } from '../engine/daily'

function format(ms: number): string {
  const mins = Math.max(1, Math.ceil(ms / 60_000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h ? `${h}h ${m}m` : `${m}m`
}

export function Countdown() {
  const [left, setLeft] = useState(() => msUntilTomorrow(new Date()))
  useEffect(() => {
    const id = window.setInterval(() => setLeft(msUntilTomorrow(new Date())), 20_000)
    return () => window.clearInterval(id)
  }, [])
  return <span className="tabular-nums">{format(left)}</span>
}
