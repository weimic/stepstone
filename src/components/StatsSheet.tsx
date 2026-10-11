import { averageOverPar, currentStreak } from '../engine/stats'
import { useGame } from '../store/game'
import { Lily } from './Lily'
import { Button } from './ui/Button'
import { Sheet } from './ui/Sheet'

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white px-2 py-3 shadow-soft">
      <span className="text-2xl font-black text-ink tabular-nums">{value}</span>
      <span className="text-center text-xs leading-tight font-semibold text-ink-soft">{label}</span>
    </div>
  )
}

export function StatsSheet() {
  const open = useGame((s) => s.sheet === 'stats')
  const stats = useGame((s) => s.stats)
  const today = useGame((s) => s.today)
  const { openSheet } = useGame.getState()
  const avg = averageOverPar(stats)
  const most = Math.max(1, ...stats.lilies)

  return (
    <Sheet open={open} onClose={() => openSheet(null)} title="Your stats">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-4 gap-2">
          <Stat value={stats.played} label="Rivers crossed" />
          <Stat value={currentStreak(stats, today)} label="Day streak" />
          <Stat value={stats.maxStreak} label="Best streak" />
          <Stat value={avg === null ? '–' : avg < 0 ? avg.toFixed(1) : `+${avg.toFixed(1)}`} label="Avg over par" />
        </div>

        <section>
          <h3 className="mb-2 text-sm font-bold tracking-wide text-ink-soft uppercase">Lilies per daily river</h3>
          <ul className="flex flex-col gap-2">
            {([3, 2, 1] as const).map((n) => {
              const count = stats.lilies[n - 1]
              return (
                <li key={n} className="flex items-center gap-3">
                  <span className="flex w-20 shrink-0" role="img" aria-label={`${n} ${n === 1 ? 'lily' : 'lilies'}`}>
                    {Array.from({ length: n }, (_, i) => (
                      <Lily key={i} filled size={22} />
                    ))}
                  </span>
                  <span className="h-7 flex-1 overflow-hidden rounded-full bg-pebble-100">
                    <span
                      className="flex h-full min-w-8 items-center justify-end rounded-full bg-moss-300 px-2 text-sm font-bold text-moss-800 tabular-nums"
                      style={{ width: `${(count / most) * 100}%` }}
                    >
                      {count}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>

        <p className="text-center text-sm font-semibold text-ink-soft">
          {stats.practiceCrossed
            ? `Plus ${stats.practiceCrossed} practice ${stats.practiceCrossed === 1 ? 'river' : 'rivers'} crossed.`
            : 'Practice rivers don’t count toward your streak.'}
        </p>
        <Button variant="ghost" onClick={() => openSheet('credits')}>
          Credits &amp; licences
        </Button>
      </div>
    </Sheet>
  )
}
