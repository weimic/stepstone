/** A point in the river box, in percent (x from the left, y from the top). */
export interface Spot {
  x: number
  y: number
}

/** The start stone sits at NEAR_Y; a stone at height 1 would sit SPAN higher. */
const NEAR_Y = 84
const SPAN = 62
const LANES = [17, 33, 50, 67, 83]

export const FAR_BANK: Spot = { x: 50, y: 9 }

export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export const stoneY = (height: number) => NEAR_Y - height * SPAN

/** Places each stone at its height, in the lane that crowds earlier stones least. */
export function layoutStones(stones: { word: string; height: number }[]): Spot[] {
  const spots: Spot[] = []
  stones.forEach((s, i) => {
    const y = stoneY(s.height)
    if (i === 0) {
      spots.push({ x: 50, y })
      return
    }
    const prev = spots[i - 1]
    let best = LANES[0]
    let bestScore = Infinity
    for (const lane of LANES) {
      let score = Math.abs(Math.abs(lane - prev.x) - 17) * 0.06 + (hash(s.word + lane) % 100) / 400
      for (const p of spots) {
        const dx = Math.abs(lane - p.x)
        const dy = Math.abs(y - p.y)
        if (dx < 18 && dy < 10) score += (18 - dx) * (10 - dy)
      }
      if (score < bestScore) {
        bestScore = score
        best = lane
      }
    }
    spots.push({ x: best + ((hash(s.word) % 7) - 3), y })
  })
  return spots
}

/** Where a missed hop lands in the water: a little upstream, toward the middle. */
export function splashSpot(from: Spot, nearMiss: boolean): Spot {
  const up = nearMiss ? 16 : 11
  return { x: from.x + (from.x < 50 ? 13 : -13), y: Math.max(24, from.y - up) }
}
