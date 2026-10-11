import { describe, expect, it } from 'vitest'
import { loadTestPuzzles, loadTestWordData } from '../test/data'
import { dailyPuzzle, practicePuzzle } from './daily'
import {
  applyJudgement,
  applyWhisper,
  canLeap,
  findWhisper,
  judge,
  leap,
  makeRiver,
  newRun,
  undo,
  type Run,
} from './rules'
import { liliesFor, STURDY_RANK } from './scoring'
import { inReach, rankIn, rowFor } from './vectors'

const data = loadTestWordData()
const puzzles = loadTestPuzzles()
const idx = (w: string) => data.index.get(w)!

// Daily #1: park -> pond -> swan -> feather, par 3.
const puzzle = dailyPuzzle(puzzles, 1)
const river = makeRiver(data, puzzle)

function play(run: Run, ...words: string[]): Run {
  for (const w of words) run = applyJudgement(run, judge(river, run, w))
  return run
}

describe('judge', () => {
  const run = newRun(puzzle)

  it('is gentle with blanks, phrases and symbols', () => {
    expect(judge(river, run, '   ')).toMatchObject({ kind: 'invalid', reason: 'empty' })
    expect(judge(river, run, 'duck pond')).toMatchObject({ kind: 'invalid', reason: 'spaces' })
    expect(judge(river, run, 'p0nd')).toMatchObject({ kind: 'invalid', reason: 'letters' })
  })

  it('suggests a common word for typos', () => {
    expect(judge(river, run, 'pnod')).toEqual({ kind: 'unknown', text: 'pnod', suggestion: 'pond' })
    expect(judge(river, run, 'qwzxvq')).toMatchObject({ kind: 'unknown', suggestion: null })
  })

  it('treats the current stone and its plurals as repeats', () => {
    expect(judge(river, run, 'park')).toMatchObject({ kind: 'repeat', sameAs: 'park' })
    expect(judge(river, run, 'Parks')).toMatchObject({ kind: 'repeat', sameAs: 'park' })
  })

  it('lands a linked word with strength and height', () => {
    const j = judge(river, run, 'pond')
    expect(j).toMatchObject({ kind: 'land', word: 'pond', strength: 'sturdy', canLeap: false })
    if (j.kind !== 'land') throw new Error()
    expect(j.height).toBeGreaterThan(0)
    expect(j.height).toBeLessThan(1)
  })

  it('accepts inflections and keeps what the player typed', () => {
    expect(judge(river, run, 'ponds')).toMatchObject({ kind: 'land', word: 'pond', text: 'ponds' })
  })

  it('splashes on unrelated words and on a target that is out of reach', () => {
    expect(judge(river, run, 'democracy')).toMatchObject({ kind: 'splash', isTarget: false })
    expect(judge(river, run, 'feathers')).toMatchObject({ kind: 'splash', isTarget: true, word: 'feather' })
  })

  it('flags near misses between K and 2K', () => {
    const j = judge(river, run, 'tree')
    expect(j).toMatchObject({ kind: 'splash', nearMiss: true })
  })

  it('uses the same K the puzzles were built with', () => {
    expect(puzzles.k).toBe(data.k)
  })
})

describe('a full crossing', () => {
  it('scores par with three lilies on the curated route', () => {
    let run = play(newRun(puzzle), 'pond', 'swan')
    expect(canLeap(river, run)).toBe(true)
    run = leap(river, run)
    expect(run.done).toBe(true)
    expect(run.strokes).toEqual(['stone', 'stone', 'leap'])
    expect(liliesFor(run.strokes.length, puzzle.par)).toBe(3)
  })

  it('lets you type the target to leap', () => {
    const run = play(newRun(puzzle), 'pond', 'swan', 'feather')
    expect(run.done).toBe(true)
    expect(run.strokes.at(-1)).toBe('leap')
  })

  it('counts splashes and ignores gentle results', () => {
    const run = play(newRun(puzzle), 'qwzxv', 'democracy', 'park', 'pond')
    expect(run.strokes).toEqual(['splash', 'stone'])
    expect(run.stones.map((s) => s.word)).toEqual(['park', 'pond'])
  })

  it('freezes once the crossing is done', () => {
    const run = play(newRun(puzzle), 'pond', 'swan', 'feather')
    expect(play(run, 'bird')).toBe(run)
    expect(undo(run)).toBe(run)
  })

  it('places stones higher as they get closer to the target', () => {
    const run = play(newRun(puzzle), 'pond', 'swan')
    const [start, pond, swan] = run.stones.map((s) => s.height)
    expect(start).toBe(0)
    expect(swan).toBeGreaterThan(pond)
    expect(swan).toBeGreaterThanOrEqual(0.84)
  })
})

describe('undo', () => {
  it('steps back without refunding strokes', () => {
    let run = play(newRun(puzzle), 'pond')
    run = undo(run)
    expect(run.stones).toHaveLength(1)
    expect(run.strokes).toEqual(['stone'])
  })

  it('cannot remove the starting stone', () => {
    const run = newRun(puzzle)
    expect(undo(run)).toBe(run)
  })

  it('lets an undone word be played again', () => {
    const run = play(undo(play(newRun(puzzle), 'pond')), 'pond')
    expect(run.stones.map((s) => s.word)).toEqual(['park', 'pond'])
  })
})

describe('whisper', () => {
  it('reveals a reachable, unused, common word and costs one stroke', () => {
    const run = applyWhisper(river, newRun(puzzle))
    expect(run.strokes).toEqual(['whisper'])
    const w = run.whisper!
    expect(inReach(data, idx('park'), idx(w))).toBe(true)
    expect(data.hintable[idx(w)]).toBe(1)
    expect(data.roots[idx(w)]).not.toBe(data.roots[idx('park')])
  })

  it('prefers a strong or sturdy link from the current stone', () => {
    const w = findWhisper(river, newRun(puzzle))!
    const park = idx('park')
    expect(rankIn(rowFor(data, park), park, idx(w), data.ranked)).toBeLessThanOrEqual(STURDY_RANK)
  })

  it('does not charge twice for the same whisper', () => {
    const once = applyWhisper(river, newRun(puzzle))
    expect(applyWhisper(river, once)).toBe(once)
  })

  it('clears after the next stone', () => {
    let run = applyWhisper(river, newRun(puzzle))
    run = play(run, run.whisper!)
    expect(run.whisper).toBeNull()
    expect(run.strokes).toEqual(['whisper', 'stone'])
  })

  it('is not offered when the far bank is already in reach', () => {
    const run = play(newRun(puzzle), 'pond', 'swan')
    expect(applyWhisper(river, run)).toBe(run)
  })

  it('never suggests a word already on the path', () => {
    const run = play(newRun(puzzle), 'pond')
    const w = findWhisper(river, run)!
    expect(['park', 'pond']).not.toContain(w)
  })
})

describe('published rivers', () => {
  const all = [
    ...puzzles.daily.map((_, i) => dailyPuzzle(puzzles, i + 1)),
    ...puzzles.practice.map((_, i) => practicePuzzle(puzzles, i)),
  ]

  it('have routes that are valid hop by hop under the client rules', () => {
    for (const p of all) {
      const route = p.route.map(idx)
      expect(route.every((i) => i !== undefined), p.key).toBe(true)
      expect(route[0]).toBe(idx(p.start))
      expect(route.at(-1)).toBe(idx(p.target))
      expect(route.length - 1, p.key).toBe(p.par)
      expect(new Set(route.map((i) => data.roots[i])).size, p.key).toBe(route.length)
      for (let h = 1; h < route.length; h++) expect(inReach(data, route[h - 1], route[h]), p.key).toBe(true)
      expect(inReach(data, route[0], route.at(-1)!), p.key).toBe(false)
    }
  })

  it('can be played to par through judge and apply', () => {
    for (const p of all.filter((x) => x.mode === 'daily')) {
      const r = makeRiver(data, p)
      let run = newRun(p)
      for (const w of p.route.slice(1)) run = applyJudgement(run, judge(r, run, w))
      expect(run.done, p.key).toBe(true)
      expect(run.strokes.length, p.key).toBe(p.par)
    }
  })

  it('give every curated daily a note per link', () => {
    for (const p of all.filter((x) => x.mode === 'daily')) expect(p.notes?.length, p.key).toBe(p.par)
  })
})
