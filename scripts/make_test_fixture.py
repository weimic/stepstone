"""Write src/test/fixture.json: similarities, ranks and reach for sample pairs.

The Vitest suite recomputes these in TypeScript and expects identical numbers,
which keeps the browser engine and the offline generator in lockstep.

    python scripts/make_test_fixture.py
"""

from __future__ import annotations

import json

import numpy as np

from common import PHRASE_RANK, ROOT, load_game_data, rank_of

PAIRS = [
    ("park", "pond"), ("pond", "swan"), ("swan", "feather"), ("honey", "bee"),
    ("honey", "sweater"), ("coffee", "cup"), ("river", "trout"), ("bass", "guitar"),
    ("lemon", "mint"), ("stamp", "letter"), ("cookie", "bake"), ("stove", "cabin"),
    ("park", "tree"), ("honey", "sticky"), ("cat", "dog"), ("banana", "democracy"),
    ("moon", "tide"), ("rain", "umbrella"), ("piano", "jazz"), ("frog", "lily"),
    # phrase links
    ("park", "bench"), ("lily", "pad"), ("snow", "man"), ("piano", "key"), ("camp", "fire"),
    # everyday extras, which don't count in rankings
    ("milk", "udder"), ("udder", "cow"), ("pig", "piglet"), ("piglet", "udder"),
]


def main() -> None:
    gd = load_game_data()
    rng = np.random.default_rng(7)
    pairs = [(gd.index[a], gd.index[b]) for a, b in PAIRS]
    pairs += [tuple(int(x) for x in rng.choice(gd.n, 2, replace=False)) for _ in range(20)]
    words = sorted({i for p in pairs for i in p})
    row_of = dict(zip(words, gd.sims_rows(np.array(words))))

    out = []
    for a, b in pairs:
        s = int(row_of[a][b])
        rank_ab, rank_ba = rank_of(row_of[a], a, b, gd.ranked), rank_of(row_of[b], b, a, gd.ranked)
        phrase = gd.linked(a, b)
        out.append({
            "a": gd.words[a],
            "b": gd.words[b],
            "sim": s,
            "rankAB": rank_ab,
            "rankBA": rank_ba,
            "phrase": phrase,
            "linkRank": min(rank_ab, rank_ba, PHRASE_RANK) if phrase else min(rank_ab, rank_ba),
            "reach": bool(s >= gd.thresholds[a] or s >= gd.thresholds[b] or phrase),
        })
    path = ROOT / "src" / "test" / "fixture.json"
    path.write_text(json.dumps({"k": gd.k, "ranked": gd.ranked, "pairs": out}, indent=1), encoding="utf-8")
    print(f"wrote {len(out)} pairs to {path.relative_to(ROOT)}, {sum(p['phrase'] for p in out)} phrase links")


if __name__ == "__main__":
    main()
