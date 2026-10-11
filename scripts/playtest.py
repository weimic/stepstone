"""Simulated playtest over the published rivers, to sanity-check K, par and whispers.

Each simulated player stands on a stone, considers a handful of words a person
might plausibly think of next, and steps to the one that feels closest to the
target. It's a rough stand-in for real players, not a replacement for them.

    python scripts/playtest.py
"""

from __future__ import annotations

import json
from collections import Counter

import numpy as np

from common import DATA, OUT, load_game_data

MAX_HOPS = 12
STURDY_RANK = 150


def main() -> None:
    gd = load_game_data()
    puzzles = json.loads((DATA / "puzzles.json").read_text(encoding="utf-8"))
    rivers = [("daily", p) for p in puzzles["daily"]] + [("practice", p) for p in puzzles["practice"][:60]]
    t = gd.thresholds
    rng = np.random.default_rng(11)
    vf = gd.vectors.astype(np.float32)
    rows: dict[int, np.ndarray] = {}

    def row_of(i: int) -> np.ndarray:
        if i not in rows:
            rows[i] = vf[i] @ vf.T
        return rows[i]

    def walk(start: int, target: int, choose) -> int | None:
        """Hops to cross (counting the final leap), or None if the player gives up."""
        cur = start
        used = {int(gd.roots[start])}
        tgt_row = row_of(target)
        for hop in range(1, MAX_HOPS + 1):
            row = row_of(cur)
            if row[target] >= t[cur] or row[target] >= t[target] or gd.linked(cur, target):
                return hop
            reach = (row >= t[cur]) | (row >= t)
            reach[list(gd.partners.get(cur, ()))] = True
            reach[cur] = False
            ok = np.flatnonzero(reach & gd.hintable)
            ok = ok[~np.isin(gd.roots[ok], list(used))]
            if not ok.size:
                return None
            nxt = choose(cur, row, tgt_row, ok)
            if nxt is None:
                return None
            used.add(int(gd.roots[nxt]))
            cur = nxt
        return None

    def whisperer(cur, row, tgt_row, ok):
        """Same rule as findWhisper: the warmest strong or sturdy link, else the warmest word the vectors reach."""
        others = np.delete(row[: gd.ranked], cur) if cur < gd.ranked else row[: gd.ranked]
        sturdy = np.partition(others, len(others) - STURDY_RANK)[len(others) - STURDY_RANK]
        pool = ok[row[ok] >= sturdy]
        if not pool.size:
            pool = ok[(row[ok] >= t[cur]) | (row[ok] >= t[ok])]
        if not pool.size:
            return None
        return int(pool[np.argmax(tgt_row[pool])])

    def natural(top: int, pool: int, common: int):
        """Thinks of the `top` strongest common links, then picks among the `pool` warmest of those."""

        def choose(cur, row, tgt_row, ok):
            cand = ok[ok < common]
            if not cand.size:
                cand = ok
            cand = cand[np.argsort(-row[cand])][:top]
            warm = cand[np.argsort(-tgt_row[cand])][:pool]
            return int(rng.choice(warm))

        return choose

    players = {
        "whisper only": (whisperer, 1),
        "sharp (top 25, best of 2)": (natural(25, 2, 5000), 8),
        "casual (top 15, any of 4)": (natural(15, 4, 3000), 8),
    }

    lines = ["# Simulated playtest", "", f"K = {gd.k}, {len(rivers)} rivers (30 daily, 60 practice)", ""]
    for name, (choose, trials) in players.items():
        over = Counter()
        lilies = Counter()
        gave_up = 0
        total = 0
        print(f"playing as {name}…", flush=True)
        for _, p in rivers:
            s, g = gd.index[p["start"]], gd.index[p["target"]]
            for _ in range(trials):
                hops = walk(s, g, choose)
                total += 1
                if hops is None:
                    gave_up += 1
                    continue
                d = hops - p["par"]
                over[min(d, 5)] += 1
                lilies[3 if d <= 0 else 2 if d <= 2 else 1] += 1
        done = total - gave_up
        dist = ", ".join(f"+{k}{'+' if k == 5 else ''}: {over[k] / total:.0%}" for k in sorted(over))
        lily = ", ".join(f"{k}🌸 {lilies[k] / total:.0%}" for k in (3, 2, 1))
        lines += [
            f"## {name}",
            "",
            f"- over par: {dist}",
            f"- lilies (no splashes or whispers counted): {lily}",
            f"- stuck within {MAX_HOPS} hops: {gave_up / total:.0%} ({done}/{total} crossed)",
            "",
        ]
    report = "\n".join(lines)
    OUT.mkdir(exist_ok=True)
    (OUT / "playtest.md").write_text(report, encoding="utf-8")
    print(report)


if __name__ == "__main__":
    main()
