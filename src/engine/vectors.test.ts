import { describe, expect, it } from 'vitest'
import fixture from '../test/fixture.json'
import { loadTestWordData } from '../test/data'
import {
  inReach,
  linkRank,
  PHRASE_RANK,
  phraseLinked,
  rankIn,
  resolveWord,
  rowFor,
  similarity,
  similarityRow,
} from './vectors'

const data = loadTestWordData()
const idx = (w: string) => {
  const i = data.index.get(w)
  if (i === undefined) throw new Error(`missing ${w}`)
  return i
}

describe('parseWordData', () => {
  it('reads the header and every table', () => {
    expect(data.n).toBe(data.words.length)
    expect(data.n).toBeGreaterThan(15_000)
    expect(data.k).toBe(fixture.k)
    expect(data.ranked).toBe(fixture.ranked)
    expect(data.ranked).toBeLessThan(data.n)
    expect(data.thresholds.length).toBe(data.n)
    expect(data.vectors.length).toBe(data.n * data.dims)
  })

  it('marks only common, non-proper words as hintable', () => {
    expect(data.hintable[idx('honey')]).toBe(1)
    expect(data.hintable[data.n - 1]).toBe(0)
  })
})

describe('resolveWord', () => {
  it('maps inflections to their base word and ignores case and spacing', () => {
    expect(resolveWord(data, 'Bees ')).toBe(idx('bee'))
    expect(resolveWord(data, 'geese')).toBe(idx('goose'))
    expect(resolveWord(data, 'HONEY')).toBe(idx('honey'))
  })

  it('returns null for words outside the list', () => {
    expect(resolveWord(data, 'qwzxv')).toBeNull()
  })

  it('treats inflections with their own entry as the same root', () => {
    expect(data.roots[idx('parks')]).toBe(data.roots[idx('park')])
    expect(data.roots[idx('baking')]).toBe(data.roots[idx('bake')])
  })
})

describe('similarity math matches the offline generator exactly', () => {
  for (const p of fixture.pairs) {
    it(`${p.a} / ${p.b}`, () => {
      const a = idx(p.a)
      const b = idx(p.b)
      expect(similarity(data, a, b)).toBe(p.sim)
      expect(similarity(data, b, a)).toBe(p.sim)
      expect(rankIn(rowFor(data, a), a, b, data.ranked)).toBe(p.rankAB)
      expect(rankIn(rowFor(data, b), b, a, data.ranked)).toBe(p.rankBA)
      expect(inReach(data, a, b)).toBe(p.reach)
      expect(phraseLinked(data, a, b)).toBe(p.phrase)
      expect(linkRank(data, a, b)).toBe(p.linkRank)
    })
  }
})

describe('phrase links', () => {
  it('joins everyday compounds the vectors keep apart', () => {
    for (const [a, b] of [['park', 'bench'], ['lily', 'pad'], ['snow', 'man'], ['camp', 'fire']]) {
      expect(inReach(data, idx(a), idx(b))).toBe(true)
      expect(inReach(data, idx(b), idx(a))).toBe(true)
      expect(linkRank(data, idx(a), idx(b))).toBe(PHRASE_RANK)
    }
  })

  it('leaves unrelated words apart', () => {
    expect(phraseLinked(data, idx('park'), idx('honey'))).toBe(false)
  })
})

describe('everyday extras', () => {
  it('come after the ranked words and are never hinted', () => {
    for (const w of ['udder', 'piglet', 'shoelace']) {
      expect(idx(w)).toBeGreaterThanOrEqual(data.ranked)
      expect(data.hintable[idx(w)]).toBe(0)
    }
  })

  it('link to the words they belong with', () => {
    expect(inReach(data, idx('milk'), idx('udder'))).toBe(true)
    expect(inReach(data, idx('pig'), idx('piglet'))).toBe(true)
  })

  it('never take a place in anyone’s ranking', () => {
    for (const w of ['milk', 'udder']) {
      const a = idx(w)
      const ranked = Array.from(rowFor(data, a).subarray(0, data.ranked)).filter((_, j) => j !== a)
      ranked.sort((x, y) => y - x)
      expect(data.thresholds[a]).toBe(ranked[data.k - 1])
    }
  })
})

describe('reach', () => {
  it('agrees with rank <= K in either direction, or a phrase link, for every word in a row', () => {
    for (const w of ['park', 'honey', 'guitar']) {
      const a = idx(w)
      const row = similarityRow(data, a)
      for (let b = 0; b < data.n; b += 97) {
        if (b === a) continue
        const byRank = rankIn(row, a, b, data.ranked) <= data.k || rankIn(rowFor(data, b), b, a, data.ranked) <= data.k
        expect(inReach(data, a, b)).toBe(byRank || phraseLinked(data, a, b))
      }
    }
  })

  it('never links a word to itself', () => {
    expect(inReach(data, idx('park'), idx('park'))).toBe(false)
  })
})
