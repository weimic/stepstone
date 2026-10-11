import { useEffect } from 'react'
import { useGame } from '../store/game'
import { sound } from './sound'

/** Plays a sound for every game event, once audio has been unlocked by a tap or key. */
export function useSoundEffects() {
  const feedback = useGame((s) => s.feedback)
  const enabled = useGame((s) => s.sound)

  useEffect(() => {
    sound.enabled = enabled
  }, [enabled])

  useEffect(() => {
    const unlock = () => sound.unlock()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    if (!feedback) return
    if (feedback.type === 'whisper') {
      if (feedback.word) sound.whisper()
      else sound.tick()
      return
    }
    if (feedback.type === 'undo') {
      sound.undo()
      return
    }
    const j = feedback.judgement
    switch (j.kind) {
      case 'land':
        sound.land(j.height, j.strength)
        break
      case 'splash':
        sound.splash(j.nearMiss)
        break
      case 'leap':
        sound.land(1, 'strong')
        sound.chime()
        break
      case 'unknown':
      case 'repeat':
      case 'invalid':
        sound.tick()
        break
    }
  }, [feedback])
}
