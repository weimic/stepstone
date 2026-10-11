import { describe, expect, it } from 'vitest'
import { dailyPuzzle } from '../engine/daily'
import { judge, makeRiver, newRun } from '../engine/rules'
import { loadTestPuzzles, loadTestWordData } from '../test/data'
import { messageFor } from './messages'

const data = loadTestWordData()
const puzzle = dailyPuzzle(loadTestPuzzles(), 1)
const river = makeRiver(data, puzzle)

const say = (word: string) =>
  messageFor({ id: 1, type: 'judgement', judgement: judge(river, newRun(puzzle), word), from: 'park' }, 'feather')

describe('splash messages', () => {
  it('add where the missed word ranked for the stone', () => {
    const j = judge(river, newRun(puzzle), 'democracy')
    if (j.kind !== 'splash') throw new Error()
    expect(say('democracy')).toEqual({
      text: 'Splash! “democracy” is too far from “park”.',
      tone: 'miss',
      rank: `#${j.rank.toLocaleString('en-US')}`,
    })
  })

  it('rank near misses and an out-of-reach far bank too', () => {
    expect(say('tree')).toMatchObject({ text: 'So close! “tree” almost links to “park”.', rank: expect.stringMatching(/^#\d{3}$/) })
    expect(say('feather')?.rank).toMatch(/^#[\d,]+$/)
  })

  it('leave landed stones unranked', () => {
    expect(say('pond')?.rank).toBeUndefined()
  })
})
