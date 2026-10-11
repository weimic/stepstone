import { useEffect } from 'react'
import { useSoundEffects } from './audio/useSoundEffects'
import { CreditsSheet } from './components/CreditsSheet'
import { GuessBar } from './components/GuessBar'
import { Header } from './components/Header'
import { HowToPlay } from './components/HowToPlay'
import { ResultSheet } from './components/ResultSheet'
import { River } from './components/River'
import { StatsSheet } from './components/StatsSheet'
import { msUntilTomorrow } from './engine/daily'
import { useCurrent, useGame } from './store/game'

export default function App() {
  useSoundEffects()
  const feedback = useGame((s) => s.feedback)
  const { load, refreshDay, openSheet } = useGame.getState()
  const { puzzle } = useCurrent()

  useEffect(() => {
    load()
    if (!useGame.getState().seenHowTo) openSheet('howto')
  }, [load, openSheet])

  useEffect(() => {
    let timer = 0
    const schedule = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        refreshDay()
        schedule()
      }, msUntilTomorrow(new Date()) + 1000)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshDay()
        schedule()
      }
    }
    schedule()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refreshDay])

  useEffect(() => {
    if (feedback?.type !== 'judgement' || feedback.judgement.kind !== 'leap') return
    const timer = window.setTimeout(() => openSheet('result'), 1500)
    return () => window.clearTimeout(timer)
  }, [feedback, openSheet])

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex h-dvh max-h-[54rem] w-full max-w-md flex-col">
        <Header />
        <main className="flex min-h-0 flex-1 flex-col pt-2">
          <River key={`river-${puzzle.key}`} />
          <GuessBar key={`bar-${puzzle.key}`} />
        </main>
      </div>
      <ResultSheet />
      <StatsSheet />
      <HowToPlay />
      <CreditsSheet />
    </div>
  )
}
