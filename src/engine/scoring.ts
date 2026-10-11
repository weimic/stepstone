export type Strength = 'strong' | 'sturdy' | 'wobbly'

export const STRONG_RANK = 25
export const STURDY_RANK = 150

export function strengthFor(rank: number, k: number): Strength | null {
  if (rank <= STRONG_RANK) return 'strong'
  if (rank <= STURDY_RANK) return 'sturdy'
  if (rank <= k) return 'wobbly'
  return null
}

export function isNearMiss(rank: number, k: number): boolean {
  return rank > k && rank <= 2 * k
}

export type Lilies = 1 | 2 | 3

export function liliesFor(strokes: number, par: number): Lilies {
  if (strokes <= par) return 3
  if (strokes <= par + 2) return 2
  return 1
}

export function ratingTitle(lilies: Lilies): string {
  if (lilies === 3) return 'A perfect crossing'
  if (lilies === 2) return 'A lovely crossing'
  return 'You made it across'
}

export function strokesLabel(strokes: number): string {
  return `${strokes} ${strokes === 1 ? 'stroke' : 'strokes'}`
}

/** "right on par", "1 over par", ... Par ignores the rarer words, so one of them can beat it. */
export function parLabel(strokes: number, par: number): string {
  const over = strokes - par
  if (over === 0) return 'right on par'
  return over > 0 ? `${over} over par` : `${-over} under par`
}
