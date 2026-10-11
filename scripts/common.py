"""Shared helpers for the StepStone data pipeline.

The browser engine (src/engine/vectors.ts) reads the same binary format and
does the same integer math, so ranks, reach and par agree exactly between the
offline scripts and the game.

Binary layout (little-endian), written to src/data/vectors.bin:
    bytes  0..3   magic b"STEP"
    bytes  4..7   uint32 version
    bytes  8..11  uint32 N (words)
    bytes 12..15  uint32 D (dims)
    bytes 16..19  uint32 K (reach threshold, in ranks)
    bytes 20..23  uint32 R (ranked words, see below)
    then          int32[N]   threshold per word: similarity of its K-th nearest neighbour
    then          int8[N*D]  quantized unit vectors, row-major

Only words 0..R-1 count in rankings. Words from R on (everyday extras such as
udder) slot into those rankings without taking a place, so adding them never
pushes another word's link out of reach.

vocab.json also lists phrase links ("links", flat index pairs): halves of common
compounds such as park + bench that the vectors keep apart. They are always in
reach and count as link rank PHRASE_RANK at worst.
"""

from __future__ import annotations

import json
import struct
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
CACHE = SCRIPTS / ".cache"
OUT = SCRIPTS / "out"
DATA = ROOT / "src" / "data"

BIN_PATH = DATA / "vectors.bin"
VOCAB_PATH = DATA / "vocab.json"
MAGIC = b"STEP"
VERSION = 2
HEADER_SIZE = 24
# A phrase link is as good as a sturdy one (scoring.ts STURDY_RANK).
PHRASE_RANK = 150


@dataclass
class GameData:
    words: list[str]
    index: dict[str, int]
    roots: np.ndarray  # int32[N], root id per word
    aliases: dict[str, int]
    vectors: np.ndarray  # int8[N, D]
    thresholds: np.ndarray  # int32[N]
    k: int
    ranked: int  # words 0..ranked-1 count in rankings
    hintable: np.ndarray  # bool[N]: common words allowed in whispers and best routes
    partners: dict[int, set[int]]  # phrase links, both directions

    @property
    def n(self) -> int:
        return len(self.words)

    def linked(self, a: int, b: int) -> bool:
        return b in self.partners.get(a, ())

    def sims_rows(self, rows: np.ndarray) -> np.ndarray:
        """Exact integer similarities of the given word indices against every word.

        float32 is exact here: |dot| <= D * 127 * 127 < 2**24, and every partial
        sum is an integer, so summation order can't change the result.
        """
        a = self.vectors[rows].astype(np.float32)
        return a @ self.vectors.astype(np.float32).T

    def resolve(self, word: str) -> int | None:
        w = word.strip().lower()
        if w in self.index:
            return self.index[w]
        return self.aliases.get(w)


def thresholds_for(vectors: np.ndarray, k: int, ranked: int, chunk: int = 1024) -> np.ndarray:
    """Similarity of each word's K-th nearest ranked neighbour (self excluded).

    Word B is in A's top K exactly when sim(A, B) >= thresholds[A]. With ties,
    rank(A, B) = 1 + #{ranked x != A, B : sim(A, x) > sim(A, B)}, and that is <= K
    iff sim(A, B) >= the K-th largest similarity among A's ranked words.
    """
    n = vectors.shape[0]
    vf = vectors.astype(np.float32)
    core = vf[:ranked]
    out = np.empty(n, dtype=np.int32)
    for start in range(0, n, chunk):
        stop = min(n, start + chunk)
        sims = vf[start:stop] @ core.T
        own = np.arange(start, min(stop, ranked))
        sims[own - start, own] = -np.inf
        kth = -np.partition(-sims, k - 1, axis=1)[:, k - 1]
        out[start:stop] = kth.astype(np.int32)
    return out


def rank_of(sims_row: np.ndarray, a: int, b: int, ranked: int) -> int:
    """1 + number of ranked words other than a and b that are strictly closer to a than b is."""
    s = sims_row[b]
    count = int(np.count_nonzero(sims_row[:ranked] > s))
    if a < ranked and sims_row[a] > s:
        count -= 1  # a itself never counts
    return count + 1


def write_game_data(
    words: list[str],
    roots: np.ndarray,
    aliases: dict[str, int],
    vectors: np.ndarray,
    thresholds: np.ndarray,
    k: int,
    ranked: int,
    whisper_max: int,
    no_whisper: list[int],
    links: list[tuple[int, int]],
    meta: dict,
) -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    n, d = vectors.shape
    assert vectors.dtype == np.int8 and thresholds.dtype == np.int32 and k < ranked <= n
    with open(BIN_PATH, "wb") as f:
        f.write(MAGIC)
        f.write(struct.pack("<IIIII", VERSION, n, d, k, ranked))
        f.write(thresholds.astype("<i4").tobytes())
        f.write(vectors.tobytes())

    root_pairs = [[i, int(r)] for i, r in enumerate(roots) if int(r) != i]
    vocab = {
        "version": VERSION,
        "k": k,
        "dims": d,
        "whisperMax": whisper_max,
        "noWhisper": no_whisper,
        "meta": meta,
        "words": words,
        "rootPairs": root_pairs,
        "aliases": aliases,
        "links": [i for a, b in sorted((min(p), max(p)) for p in links) for i in (a, b)],
    }
    with open(VOCAB_PATH, "w", encoding="utf-8") as f:
        json.dump(vocab, f, separators=(",", ":"))


def load_game_data() -> GameData:
    raw = BIN_PATH.read_bytes()
    assert raw[:4] == MAGIC, "bad magic"
    version, n, d, k, ranked = struct.unpack("<IIIII", raw[4:HEADER_SIZE])
    assert version == VERSION
    off = HEADER_SIZE
    thresholds = np.frombuffer(raw, dtype="<i4", count=n, offset=off).astype(np.int32)
    off += 4 * n
    vectors = np.frombuffer(raw, dtype=np.int8, count=n * d, offset=off).reshape(n, d)

    vocab = json.loads(VOCAB_PATH.read_text(encoding="utf-8"))
    words = vocab["words"]
    roots = np.arange(n, dtype=np.int32)
    for i, r in vocab["rootPairs"]:
        roots[i] = r
    hintable = np.arange(n) < vocab["whisperMax"]
    hintable[vocab["noWhisper"]] = False
    partners: dict[int, set[int]] = {}
    flat = vocab.get("links", [])
    for a, b in zip(flat[::2], flat[1::2]):
        partners.setdefault(a, set()).add(b)
        partners.setdefault(b, set()).add(a)
    return GameData(
        words=words,
        index={w: i for i, w in enumerate(words)},
        roots=roots,
        aliases=vocab["aliases"],
        vectors=vectors,
        thresholds=thresholds,
        k=k,
        ranked=ranked,
        hintable=hintable,
        partners=partners,
    )


def build_adjacency(gd: GameData, chunk: int = 1024) -> tuple[np.ndarray, np.ndarray]:
    """Symmetric reach graph in CSR form: A-B is an edge iff sim >= t[A] or sim >= t[B], or a phrase links them."""
    n = gd.n
    vf = gd.vectors.astype(np.float32)
    t = gd.thresholds.astype(np.float32)
    rows: list[np.ndarray] = []
    for start in range(0, n, chunk):
        stop = min(n, start + chunk)
        sims = vf[start:stop] @ vf.T
        ok = (sims >= t[start:stop, None]) | (sims >= t[None, :])
        ok[np.arange(stop - start), np.arange(start, stop)] = False
        for i in range(stop - start):
            row = np.flatnonzero(ok[i]).astype(np.int32)
            extra = gd.partners.get(start + i)
            if extra:
                row = np.union1d(row, np.fromiter(extra, dtype=np.int32))
            rows.append(row)
    indptr = np.zeros(n + 1, dtype=np.int64)
    indptr[1:] = np.cumsum([len(r) for r in rows])
    indices = np.concatenate(rows)
    return indptr, indices


def bfs(indptr: np.ndarray, indices: np.ndarray, src: int, blocked: np.ndarray | None = None) -> np.ndarray:
    """Hop distance from src to every word (-1 if unreachable). Blocked words are never entered."""
    n = len(indptr) - 1
    dist = np.full(n, -1, dtype=np.int16)
    dist[src] = 0
    frontier = np.array([src], dtype=np.int64)
    d = 0
    while frontier.size:
        d += 1
        parts = [indices[indptr[f] : indptr[f + 1]] for f in frontier]
        nbrs = np.unique(np.concatenate(parts)) if parts else np.empty(0, dtype=np.int32)
        nbrs = nbrs[dist[nbrs] < 0]
        if blocked is not None:
            nbrs = nbrs[~blocked[nbrs]]
        dist[nbrs] = d
        frontier = nbrs.astype(np.int64)
    return dist
