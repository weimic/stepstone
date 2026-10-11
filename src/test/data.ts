import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { PuzzleFile } from '../engine/daily'
import { parseWordData, type VocabJson, type WordData } from '../engine/vectors'

const dataDir = fileURLToPath(new URL('../data/', import.meta.url))

let cached: WordData | null = null

export function loadTestWordData(): WordData {
  if (cached) return cached
  const buf = readFileSync(dataDir + 'vectors.bin')
  const bin = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  const vocab = JSON.parse(readFileSync(dataDir + 'vocab.json', 'utf8')) as VocabJson
  cached = parseWordData(bin, vocab)
  return cached
}

export function loadTestPuzzles(): PuzzleFile {
  return JSON.parse(readFileSync(dataDir + 'puzzles.json', 'utf8')) as PuzzleFile
}
