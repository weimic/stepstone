import { describe, expect, it } from 'vitest'
import { isNearMiss, liliesFor, parLabel, strengthFor, strokesLabel } from './scoring'

describe('strengthFor', () => {
  it('uses the 25 / 150 / K bands', () => {
    expect(strengthFor(1, 300)).toBe('strong')
    expect(strengthFor(25, 300)).toBe('strong')
    expect(strengthFor(26, 300)).toBe('sturdy')
    expect(strengthFor(150, 300)).toBe('sturdy')
    expect(strengthFor(151, 300)).toBe('wobbly')
    expect(strengthFor(300, 300)).toBe('wobbly')
    expect(strengthFor(301, 300)).toBeNull()
  })
})

describe('isNearMiss', () => {
  it('covers ranks above K up to 2K', () => {
    expect(isNearMiss(300, 300)).toBe(false)
    expect(isNearMiss(301, 300)).toBe(true)
    expect(isNearMiss(600, 300)).toBe(true)
    expect(isNearMiss(601, 300)).toBe(false)
  })
})

describe('liliesFor', () => {
  it('gives 3 at par, 2 within two over, 1 otherwise', () => {
    expect(liliesFor(3, 3)).toBe(3)
    expect(liliesFor(4, 3)).toBe(2)
    expect(liliesFor(5, 3)).toBe(2)
    expect(liliesFor(6, 3)).toBe(1)
    expect(liliesFor(20, 3)).toBe(1)
  })
})

describe('labels', () => {
  it('pluralizes strokes and describes par', () => {
    expect(strokesLabel(1)).toBe('1 stroke')
    expect(strokesLabel(4)).toBe('4 strokes')
    expect(parLabel(3, 3)).toBe('right on par')
    expect(parLabel(5, 3)).toBe('2 over par')
    expect(parLabel(2, 3)).toBe('1 under par')
  })
})
