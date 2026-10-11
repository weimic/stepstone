import { ChartNoAxesColumn, CircleHelp, Volume2, VolumeX } from 'lucide-react'
import { sound as audio } from '../audio/sound'
import { useGame } from '../store/game'
import { IconButton } from './ui/Button'
import { cx } from './ui/cx'

export function Header() {
  const mode = useGame((s) => s.mode)
  const today = useGame((s) => s.today)
  const sound = useGame((s) => s.sound)
  const { openSheet, toggleSound, setMode } = useGame.getState()

  const tab = (active: boolean) =>
    cx(
      'hit min-h-10 rounded-full px-3 text-sm font-bold whitespace-nowrap transition-colors min-[360px]:px-4',
      active ? 'bg-white text-ink shadow-soft' : 'text-ink-soft hover:text-ink',
    )

  return (
    <header className="flex items-center justify-between gap-1 px-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <IconButton label="How to play" onClick={() => openSheet('howto')}>
        <CircleHelp size={24} />
      </IconButton>

      <div className="flex flex-col items-center gap-1">
        <h1 className="text-[1.65rem] leading-none font-black tracking-tight text-ink">
          Step<span className="text-moss-600">Stone</span>
        </h1>
        <nav aria-label="Game mode" className="flex rounded-full bg-pebble-100 p-1">
          <button type="button" className={tab(mode === 'daily')} aria-pressed={mode === 'daily'} onClick={() => setMode('daily')}>
            Daily #{today}
          </button>
          <button
            type="button"
            className={tab(mode === 'practice')}
            aria-pressed={mode === 'practice'}
            onClick={() => setMode('practice')}
          >
            Practice
          </button>
        </nav>
      </div>

      <div className="flex">
        <IconButton
          label={sound ? 'Mute sounds' : 'Turn sounds on'}
          aria-pressed={!sound}
          onClick={() => {
            toggleSound()
            if (!sound) {
              audio.unlock()
              audio.enabled = true
              audio.hello()
            }
          }}
        >
          {sound ? <Volume2 size={22} /> : <VolumeX size={22} />}
        </IconButton>
        <IconButton label="Your stats" onClick={() => openSheet('stats')} className="-ml-1">
          <ChartNoAxesColumn size={22} />
        </IconButton>
      </div>
    </header>
  )
}
