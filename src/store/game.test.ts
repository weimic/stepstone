import { beforeEach, describe, expect, it } from 'vitest'
import { loadTestWordData } from '../test/data'
import { puzzleFor, runFor, useGame } from './game'

const data = loadTestWordData()

const current = () => {
  const s = useGame.getState()
  return runFor(s.runs, puzzleFor(s))
}

beforeEach(() => {
  useGame.setState({ data, status: 'ready', mode: 'daily', today: 1, runs: {}, feedback: null })
  useGame.setState((s) => ({ stats: { ...s.stats, played: 0, streak: 0, maxStreak: 0, lastDaily: 0, history: {} } }))
})

describe('game store', () => {
  it('plays the daily through to a recorded result', () => {
    const { submit, leap } = useGame.getState()
    expect(submit('pond')).toMatchObject({ kind: 'land' })
    expect(submit('swan')).toMatchObject({ kind: 'land', canLeap: true })
    leap()
    const run = current()
    expect(run.done).toBe(true)
    const { stats, feedback } = useGame.getState()
    expect(feedback).toMatchObject({ type: 'judgement', judgement: { kind: 'leap' }, from: 'swan' })
    expect(stats).toMatchObject({ played: 1, streak: 1, lastDaily: 1 })
    expect(stats.history[1]).toMatchObject({ strokes: 3, par: 3, lilies: 3, trail: '🪨🪨🪨🌿' })
  })

  it('does not record gentle results as strokes', () => {
    const { submit } = useGame.getState()
    submit('qwzxv')
    submit('park')
    expect(current().strokes).toEqual([])
    expect(useGame.getState().feedback).toMatchObject({ type: 'judgement', judgement: { kind: 'repeat' } })
  })

  it('charges a whisper once and reports it', () => {
    const { whisper } = useGame.getState()
    whisper()
    whisper()
    expect(current().strokes).toEqual(['whisper'])
    expect(useGame.getState().feedback).toMatchObject({ type: 'whisper', cost: false })
  })

  it('keeps separate runs for daily and practice', () => {
    useGame.getState().submit('pond')
    useGame.getState().newPractice()
    expect(current().stones).toHaveLength(1)
    useGame.getState().setMode('daily')
    expect(current().stones.map((s) => s.word)).toEqual(['park', 'pond'])
  })

  it('undoes a stone and reports which one', () => {
    useGame.getState().submit('pond')
    useGame.getState().undo()
    expect(current().stones).toHaveLength(1)
    expect(useGame.getState().feedback).toMatchObject({ type: 'undo', word: 'pond' })
  })
})
