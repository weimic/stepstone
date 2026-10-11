// Mirrors scripts/common.py: same binary layout, same integer math, so ranks,
// reach and par agree exactly with the offline puzzle generator.

const MAGIC = 'STEP'
const VERSION = 2
const HEADER_SIZE = 24
/** Phrase links (park + bench) count as sturdy at worst; matches common.py PHRASE_RANK. */
export const PHRASE_RANK = 150

export interface VocabJson {
  version: number
  k: number
  dims: number
  whisperMax: number
  noWhisper: number[]
  meta: Record<string, unknown>
  words: string[]
  rootPairs: [number, number][]
  aliases: Record<string, number>
  /** Phrase links as flat index pairs: [a0, b0, a1, b1, ...]. */
  links?: number[]
}

export interface WordData {
  n: number
  dims: number
  k: number
  /** Words 0..ranked-1 count in rankings; later ones (udder, piglet) slot in without taking a place. */
  ranked: number
  words: string[]
  index: Map<string, number>
  aliases: Map<string, number>
  roots: Int32Array
  thresholds: Int32Array
  vectors: Int8Array
  hintable: Uint8Array
  /** Halves of common phrases the vectors keep apart, keyed by pairKey. */
  phrases: Set<number>
}

function pairKey(n: number, a: number, b: number): number {
  return a < b ? a * n + b : b * n + a
}

export function parseWordData(bin: ArrayBuffer, vocab: VocabJson): WordData {
  const view = new DataView(bin)
  const magic = String.fromCharCode(...new Uint8Array(bin, 0, 4))
  if (magic !== MAGIC) throw new Error('vectors.bin: bad magic')
  const version = view.getUint32(4, true)
  if (version !== VERSION || vocab.version !== VERSION) throw new Error('vectors.bin: unsupported version')
  const n = view.getUint32(8, true)
  const dims = view.getUint32(12, true)
  const k = view.getUint32(16, true)
  const ranked = view.getUint32(20, true)
  if (n !== vocab.words.length) throw new Error('vectors.bin and vocab.json disagree on word count')
  if (ranked <= k || ranked > n) throw new Error('vectors.bin: bad ranked word count')
  if (bin.byteLength !== HEADER_SIZE + 4 * n + n * dims) throw new Error('vectors.bin: unexpected size')

  const thresholds = new Int32Array(n)
  for (let i = 0; i < n; i++) thresholds[i] = view.getInt32(HEADER_SIZE + 4 * i, true)
  const vectors = new Int8Array(bin, HEADER_SIZE + 4 * n, n * dims)

  const roots = new Int32Array(n)
  for (let i = 0; i < n; i++) roots[i] = i
  for (const [i, r] of vocab.rootPairs) roots[i] = r

  const hintable = new Uint8Array(n)
  hintable.fill(1, 0, Math.min(n, vocab.whisperMax))
  for (const i of vocab.noWhisper) hintable[i] = 0

  const index = new Map<string, number>()
  vocab.words.forEach((w, i) => index.set(w, i))

  const phrases = new Set<number>()
  const links = vocab.links ?? []
  for (let i = 0; i + 1 < links.length; i += 2) phrases.add(pairKey(n, links[i], links[i + 1]))

  return {
    n,
    dims,
    k,
    ranked,
    words: vocab.words,
    index,
    aliases: new Map(Object.entries(vocab.aliases)),
    roots,
    thresholds,
    vectors,
    hintable,
    phrases,
  }
}

export async function loadWordData(binUrl: string, vocabUrl: string): Promise<WordData> {
  const [binRes, vocabRes] = await Promise.all([fetch(binUrl), fetch(vocabUrl)])
  if (!binRes.ok || !vocabRes.ok) throw new Error('Could not download the word data')
  const [bin, vocab] = await Promise.all([binRes.arrayBuffer(), vocabRes.json() as Promise<VocabJson>])
  return parseWordData(bin, vocab)
}

export function normalize(input: string): string {
  return input.trim().toLowerCase().replace(/[’']/g, '')
}

/** Index of a typed word, through aliases ("bees" -> "bee"). */
export function resolveWord(data: WordData, input: string): number | null {
  const w = normalize(input)
  return data.index.get(w) ?? data.aliases.get(w) ?? null
}

export function similarity(data: WordData, a: number, b: number): number {
  const { vectors: v, dims: d } = data
  const oa = a * d
  const ob = b * d
  let s = 0
  for (let i = 0; i < d; i++) s += v[oa + i] * v[ob + i]
  return s
}

/** Similarity of word `a` against every word. */
export function similarityRow(data: WordData, a: number): Int32Array {
  const { vectors: v, dims: d, n } = data
  const q = new Int32Array(d)
  for (let i = 0; i < d; i++) q[i] = v[a * d + i]
  const out = new Int32Array(n)
  for (let j = 0, o = 0; j < n; j++, o += d) {
    let s = 0
    for (let i = 0; i < d; i++) s += q[i] * v[o + i]
    out[j] = s
  }
  return out
}

/** 1 + number of ranked words other than a and b that are strictly closer to a than b is. */
export function rankIn(row: Int32Array, a: number, b: number, ranked: number): number {
  const s = row[b]
  let count = 0
  for (let j = 0; j < ranked; j++) if (row[j] > s) count++
  if (a < ranked && row[a] > s) count--
  return count + 1
}

/** Whether a common phrase joins the two words ("park bench", "campfire"). */
export function phraseLinked(data: WordData, a: number, b: number): boolean {
  return a !== b && data.phrases.has(pairKey(data.n, a, b))
}

/** B is within reach of A if B is in A's top K, A is in B's top K, or a phrase joins them. */
export function inReach(data: WordData, a: number, b: number): boolean {
  if (a === b) return false
  const s = similarity(data, a, b)
  return s >= data.thresholds[a] || s >= data.thresholds[b] || phraseLinked(data, a, b)
}

const rowCaches = new WeakMap<WordData, Map<number, Int32Array>>()
const ROW_CACHE_SIZE = 12

/** Cached similarityRow; a turn touches the same few words repeatedly. */
export function rowFor(data: WordData, a: number): Int32Array {
  let rowCache = rowCaches.get(data)
  if (!rowCache) rowCaches.set(data, (rowCache = new Map()))
  const hit = rowCache.get(a)
  if (hit) {
    rowCache.delete(a)
    rowCache.set(a, hit)
    return hit
  }
  const row = similarityRow(data, a)
  rowCache.set(a, row)
  if (rowCache.size > ROW_CACHE_SIZE) rowCache.delete(rowCache.keys().next().value!)
  return row
}

/** The link rank used for strength and near misses: the better of the two directions. */
export function linkRank(data: WordData, a: number, b: number): number {
  const rank = Math.min(rankIn(rowFor(data, a), a, b, data.ranked), rankIn(rowFor(data, b), b, a, data.ranked))
  return phraseLinked(data, a, b) ? Math.min(rank, PHRASE_RANK) : rank
}
