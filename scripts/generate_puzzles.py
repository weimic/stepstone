"""Find StepStone rivers and build src/data/puzzles.json.

    python scripts/generate_puzzles.py candidates
        Graph stats, par distribution for cozy word pairs, and a shortlist of
        candidate rivers with their best routes (scripts/out/candidates.md).

    python scripts/generate_puzzles.py build
        Validate scripts/daily_curated.json against the shipped vectors and
        write src/data/puzzles.json (curated dailies + generated practice pool).

Uses the exported src/data/vectors.bin, so par is computed with exactly the
reach rule the browser uses.
"""

from __future__ import annotations

import argparse
import json
from datetime import date

import numpy as np

from common import DATA, OUT, PHRASE_RANK, SCRIPTS, GameData, bfs, build_adjacency, load_game_data

PAR_RANGE = (3, 4)
LAYER_CAP = 400
PRACTICE_SIZE = 200
LAUNCH_DATE = "2026-10-09"


class River:
    def __init__(self) -> None:
        self.gd: GameData = load_game_data()
        print(f"loaded {self.gd.n:,} words, K={self.gd.k}; building reach graph…", flush=True)
        self.indptr, self.indices = build_adjacency(self.gd)
        deg = np.diff(self.indptr)
        print(f"reach graph: mean degree {deg.mean():.0f}, median {int(np.median(deg))}, min {deg.min()}")
        self.n = self.gd.n

    def blocked_for(self, *words: int) -> np.ndarray:
        """Words sharing a root with any of `words` (but not the words themselves), plus the
        everyday extras: par counts ranked words only, so a rare word like udder can beat it."""
        blocked = np.arange(self.n) >= self.gd.ranked
        for w in words:
            blocked |= self.gd.roots == self.gd.roots[w]
        for w in words:
            blocked[w] = False
        return blocked

    def neighbours(self, w: int) -> np.ndarray:
        return self.indices[self.indptr[w] : self.indptr[w + 1]]

    def exact(self, s: int, t: int) -> tuple[int, np.ndarray, np.ndarray, np.ndarray]:
        blocked = self.blocked_for(s, t)
        ds = bfs(self.indptr, self.indices, s, blocked)
        dt = bfs(self.indptr, self.indices, t, blocked)
        return int(ds[t]), ds, dt, blocked

    def link_ranks(self, p_nodes: np.ndarray, x_nodes: np.ndarray) -> np.ndarray:
        """min(rank_p(x), rank_x(p)) for every p, x pair, capped at PHRASE_RANK for phrase links.

        Same definition as common.rank_of and vectors.ts linkRank.
        """
        nodes = np.concatenate([p_nodes, x_nodes])
        rows = self.gd.sims_rows(nodes)
        ranked = self.gd.ranked
        sorted_rows = np.sort(rows[:, :ranked], axis=1)

        def ranks(src_local: np.ndarray, src_global: np.ndarray, dst_global: np.ndarray) -> np.ndarray:
            out = np.empty((len(src_local), len(dst_global)), dtype=np.int64)
            for i, (li, gi) in enumerate(zip(src_local, src_global)):
                s = rows[li, dst_global]
                greater = ranked - np.searchsorted(sorted_rows[li], s, side="right")
                if gi < ranked:
                    greater -= rows[li, gi] > s
                out[i] = greater + 1
            return out

        np_, nx = len(p_nodes), len(x_nodes)
        r_px = ranks(np.arange(np_), p_nodes, x_nodes)
        r_xp = ranks(np.arange(np_, np_ + nx), x_nodes, p_nodes).T
        out = np.minimum(r_px, r_xp)
        col = {int(x): j for j, x in enumerate(x_nodes)}
        for i, p in enumerate(p_nodes):
            for partner in self.gd.partners.get(int(p), ()):
                j = col.get(partner)
                if j is not None:
                    out[i, j] = min(out[i, j], PHRASE_RANK)
        return out

    def best_route(self, s: int, t: int, par: int, ds: np.ndarray, dt: np.ndarray, blocked: np.ndarray):
        """Shortest route whose weakest link is as strong as possible, preferring common words."""
        for common_only in (True, False):
            allowed = ~blocked
            if common_only:
                allowed &= self.gd.hintable
            layers = [np.array([s])]
            for k in range(1, par):
                layer = np.flatnonzero((ds == k) & (dt == par - k) & allowed)
                layers.append(layer[:LAYER_CAP])
            layers.append(np.array([t]))
            if any(len(layer) == 0 for layer in layers):
                continue

            best = {s: (0, [s], [])}
            for k in range(1, len(layers)):
                prev = [p for p in layers[k - 1] if p in best]
                if not prev:
                    break
                r = self.link_ranks(np.array(prev), layers[k])
                nxt = {}
                for j, x in enumerate(layers[k]):
                    col = r[:, j]
                    ok = col <= self.gd.k
                    if not ok.any():
                        continue
                    scores = [max(best[p][0], col[i]) if ok[i] else np.inf for i, p in enumerate(prev)]
                    i = int(np.argmin(scores))
                    p = prev[i]
                    nxt[int(x)] = (scores[i], best[p][1] + [int(x)], best[p][2] + [int(col[i])])
                best = nxt
            if t in best:
                _, path, link_ranks = best[t]
                return path, link_ranks
        return None, None


def cozy_indices(gd: GameData) -> list[int]:
    words = [
        line.strip()
        for line in (SCRIPTS / "cozy_words.txt").read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.startswith("#")
    ]
    return sorted({gd.index[w] for w in words if w in gd.index})


def screen(river: River) -> list[tuple[int, int, int]]:
    """Approximate par for all cozy pairs via one BFS per word, then confirm exactly."""
    gd = river.gd
    cozy = cozy_indices(gd)
    dist = {c: bfs(river.indptr, river.indices, c, river.blocked_for(c)) for c in cozy}
    pars = []
    for s in cozy:
        for t in cozy:
            if s != t and gd.roots[s] != gd.roots[t]:
                pars.append((s, t, int(dist[s][t])))
    hist = {}
    for *_, p in pars:
        hist[p] = hist.get(p, 0) + 1
    print("approximate par over cozy pairs:", dict(sorted(hist.items())))
    # The approximation can only underestimate (it blocks just the start's root), so a few
    # true fits are skipped here; describe() confirms par exactly for the rest.
    return [(s, t, p) for s, t, p in pars if PAR_RANGE[0] <= p <= PAR_RANGE[1]]


def describe(river: River, s: int, t: int):
    par, ds, dt, blocked = river.exact(s, t)
    if not (PAR_RANGE[0] <= par <= PAR_RANGE[1]):
        return None
    first = [x for x in river.neighbours(s) if not blocked[x] and dt[x] == par - 1]
    path, ranks = river.best_route(s, t, par, ds, dt, blocked)
    if path is None:
        return None
    return {"par": par, "firstOptions": len(first), "route": path, "linkRanks": ranks}


def candidates() -> None:
    river = River()
    gd = river.gd
    pool = screen(river)
    rng = np.random.default_rng(11)
    rng.shuffle(pool)
    rows = []
    for s, t, _ in pool[:300]:
        d = describe(river, s, t)
        if d:
            rows.append((s, t, d))
    rows.sort(key=lambda r: (r[2]["par"], -r[2]["firstOptions"]))
    lines = [
        f"# Candidate rivers (K={gd.k})",
        "",
        "| start | target | par | first-step options | best route (link ranks) |",
        "| --- | --- | ---: | ---: | --- |",
    ]
    for s, t, d in rows:
        route = " → ".join(gd.words[i] for i in d["route"])
        lines.append(
            f"| {gd.words[s]} | {gd.words[t]} | {d['par']} | {d['firstOptions']} | {route} ({', '.join(map(str, d['linkRanks']))}) |"
        )
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "candidates.md").write_text("\n".join(lines), encoding="utf-8")
    pars = [d["par"] for *_, d in rows]
    print(f"{len(rows)} candidates written; par 3: {pars.count(3)}, par 4: {pars.count(4)}")


def resolve(gd: GameData, word: str) -> int:
    i = gd.resolve(word)
    if i is None:
        raise SystemExit(f"'{word}' is not in the vocabulary")
    return i


def build() -> None:
    river = River()
    gd = river.gd
    curated = json.loads((SCRIPTS / "daily_curated.json").read_text(encoding="utf-8"))
    daily = []
    used_pairs = set()
    errors = []
    for n, entry in enumerate(curated, start=1):
        s, t = resolve(gd, entry["start"]), resolve(gd, entry["target"])
        chain = [s] + [resolve(gd, w) for w in entry["route"]] + [t]
        par, ds, dt, blocked = river.exact(s, t)
        problems = []
        if len(chain) - 1 != par:
            problems.append(f"route has {len(chain) - 1} hops but par is {par}")
        if len({int(gd.roots[c]) for c in chain}) != len(chain):
            problems.append("route repeats a root")
        ranks = [int(river.link_ranks(np.array([a]), np.array([b]))[0, 0]) for a, b in zip(chain, chain[1:])]
        for (a, b), r in zip(zip(chain, chain[1:]), ranks):
            if r > gd.k:
                problems.append(f"{gd.words[a]} → {gd.words[b]} is out of reach (rank {r})")
        if len(entry["notes"]) != len(chain) - 1:
            problems.append(f"{len(entry['notes'])} notes for {len(chain) - 1} links")
        if problems:
            errors.append(f"#{n} {entry['start']} → {entry['target']}: " + "; ".join(problems))
            continue
        used_pairs.add((s, t))
        daily.append(
            {
                "start": gd.words[s],
                "target": gd.words[t],
                "par": par,
                "route": [gd.words[c] for c in chain],
                "notes": entry["notes"],
            }
        )
    if errors:
        print("\n".join(errors))
        raise SystemExit(f"{len(errors)} curated rivers failed validation")

    pool = screen(river)
    rng = np.random.default_rng(23)
    rng.shuffle(pool)
    practice = []
    seen_words: dict[int, int] = {}
    for s, t, _ in pool:
        if len(practice) >= PRACTICE_SIZE:
            break
        if (s, t) in used_pairs or seen_words.get(s, 0) >= 3 or seen_words.get(t, 0) >= 3:
            continue
        d = describe(river, s, t)
        if not d or d["firstOptions"] < 3:
            continue
        seen_words[s] = seen_words.get(s, 0) + 1
        seen_words[t] = seen_words.get(t, 0) + 1
        practice.append(
            {"start": gd.words[s], "target": gd.words[t], "par": d["par"], "route": [gd.words[c] for c in d["route"]]}
        )

    out = {
        "version": 1,
        "launch": LAUNCH_DATE,
        "k": gd.k,
        "built": date.today().isoformat(),
        "daily": daily,
        "practice": practice,
    }
    (DATA / "puzzles.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    print(f"wrote puzzles.json: {len(daily)} daily, {len(practice)} practice")


def routes(pairs: list[str]) -> None:
    """Par and the strongest routes for specific pairs, e.g. `route honey sweater moon guitar`."""
    river = River()
    gd = river.gd
    for a, b in zip(pairs[::2], pairs[1::2]):
        s, t = resolve(gd, a), resolve(gd, b)
        par, ds, dt, blocked = river.exact(s, t)
        print(f"\n{a} → {b}: par {par}")
        if par != 3:
            path, ranks = river.best_route(s, t, par, ds, dt, blocked)
            if path:
                print("  " + " → ".join(gd.words[i] for i in path) + f"  {ranks}")
            continue
        allowed = ~blocked & gd.hintable
        l1 = np.flatnonzero((ds == 1) & (dt == 2) & allowed)[:LAYER_CAP]
        l2 = np.flatnonzero((ds == 2) & (dt == 1) & allowed)[:LAYER_CAP]
        r_s = river.link_ranks(np.array([s]), l1)[0]
        r_mid = river.link_ranks(l1, l2)
        r_t = river.link_ranks(l2, np.array([t]))[:, 0]
        score = np.maximum(np.maximum(r_s[:, None], r_mid), r_t[None, :]).astype(float)
        score[r_mid > gd.k] = np.inf
        flat = np.argsort(score, axis=None)[:10]
        for f in flat:
            i, j = np.unravel_index(f, score.shape)
            if np.isinf(score[i, j]):
                break
            print(f"  {a} → {gd.words[l1[i]]} → {gd.words[l2[j]]} → {b}  ({r_s[i]}, {r_mid[i, j]}, {r_t[j]})")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("cmd", choices=["candidates", "build", "route"])
    p.add_argument("words", nargs="*")
    args = p.parse_args()
    if args.cmd == "candidates":
        candidates()
    elif args.cmd == "build":
        build()
    else:
        routes(args.words)


if __name__ == "__main__":
    main()
