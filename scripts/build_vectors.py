"""Build StepStone's word vectors.

    python scripts/build_vectors.py evaluate
        Compare the available models on scripts/sanity_pairs.csv across reach thresholds.

    python scripts/build_vectors.py export --model numberbatch --k 300
        Reduce, quantize and write src/data/vectors.bin + src/data/vocab.json,
        including phrase links (park + bench) found in Numberbatch's phrase terms.

Raw downloads live in scripts/.cache (gitignored):
    numberbatch-en-19.08.txt.gz   https://conceptnet.s3.amazonaws.com/downloads/2019/numberbatch/numberbatch-en-19.08.txt.gz
    glove.2024.wikigiga.300d.zip  https://nlp.stanford.edu/data/wordvecs/glove.2024.wikigiga.300d.zip
"""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import io
import urllib.request
import zipfile
from datetime import date

import numpy as np
from nltk.corpus import wordnet as wn
from wordfreq import top_n_list, zipf_frequency

from common import CACHE, OUT, SCRIPTS, rank_of, thresholds_for, write_game_data

N_WORDS = 20000
# 160 keeps 94% of sanity links in reach at K=300 (128 dims: 91%, full 300: 95%).
DIMS = 160
CANDIDATES = 80000
WHISPER_MAX = 8000
K_GRID = [50, 100, 150, 200, 300, 400, 600, 800, 1200]

# Everyday things the frequency cutoff misses (udder, piglet, shoelace): concrete nouns
# that rank among the closest words to a common concrete word. They come after the
# N_WORDS ranked words and don't count in rankings (see common.py), and they sit past
# the hintable words, so they never show up in whispers or best routes.
EXTRA_MIN_ZIPF = 2.2
EXTRA_RANK = 20  # udder is cow's 16th closest word
EXTRA_ANCHORS = 12000
CONCRETE = {"noun.animal", "noun.artifact", "noun.body", "noun.food", "noun.object", "noun.plant"}
NOT_EVERYDAY = {
    "body_substance.n.01", "cell.n.02", "compound.n.02", "drug.n.01", "genitalia.n.01", "hormone.n.01",
    "neurotransmitter.n.01", "reproductive_organ.n.01",
}

# Phrase links. Numberbatch has its own vectors for phrases ("park_bench") and closed
# compounds ("campfire"); a phrase whose vector sits close to both halves means
# roughly "the two words together", which is what a player expects to link.
PHRASE_PART_MAX = 12000  # both halves among the 12,000 most common words
OPEN_MAX_RANK = 25  # park_bench: park and bench are both among its 25 closest words
CLOSED_MIN_ZIPF = 2.0  # campfire must be a real, reasonably common word
CLOSED_RANKS = (75, 2000)  # one half close, the other at least loosely (snowman: snow 3, man 1754)
AFFIXES = {
    "ness", "less", "ism", "ion", "ate", "let", "hood", "ship", "ment", "able", "ful", "ing", "est", "ity", "ous",
    "ive", "ize", "ise", "ist", "ery", "ance", "ence", "dom", "ward", "wise", "like", "some", "teen", "ana", "des",
    "non", "ant", "ent", "age", "ure", "ary", "ory", "ian", "eer", "ette", "over", "under", "out",
}
# Words that never form phrase links, so a practice route can't show "car + bomb", and are
# never hinted or used in best routes. They still link normally through the vectors.
PHRASE_SENSITIVE = {
    "abuse", "anal", "arse", "bitch", "blow", "bomb", "bomber", "bombing", "booty", "breast", "bum", "butt",
    "cocaine", "condom", "crack", "crime", "criminal", "damn", "dead", "deadly", "death", "drug", "drunk", "fat",
    "gang", "gay", "genocide", "gun", "gunman", "hate", "hell", "heroin", "hooker", "idiot", "insane", "kill",
    "killer", "killing", "lesbian", "lick", "lust", "massacre", "meth", "murder", "murderer", "naked", "nazi",
    "nude", "oral", "pimp", "porn", "psycho", "racism", "racist", "rape", "retard", "sex", "sexual", "sexy",
    "shame", "shoot", "shooter", "shooting", "slave", "slavery", "slaughter", "slut", "stab", "strip", "stupid",
    "suck", "sucker", "suicide", "terror", "terrorism", "terrorist", "torture", "ugly", "virgin", "war", "weapon",
    "whore",
}
# Fine to type and fine in phrases (sperm whale), but not as a hint or a best-route stone
# (melody → organ → sperm → milk).
NOT_HINTED = {
    "abortion", "ammunition", "assault", "bisexual", "bloody", "bullet", "cancer", "cannabis", "cigarette", "corpse",
    "divorce", "dope", "execution", "firearm", "funeral", "homosexual", "homosexuality", "hostage", "kidnapping",
    "marijuana", "militia", "missile", "pistol", "prostitution", "rifle", "smoking", "sniper", "sperm", "sucking",
    "tobacco", "transgender", "tumor", "urine",
}

SOURCES = {
    "numberbatch": {
        "path": CACHE / "numberbatch-en-19.08.txt.gz",
        "credit": "ConceptNet Numberbatch 19.08 by Luminoso Technologies, Inc.",
        "license": "CC BY-SA 4.0",
    },
    "glove": {
        "path": CACHE / "glove.2024.wikigiga.300d.zip",
        "credit": "GloVe 2024 (Wikipedia + Gigaword) by the Stanford NLP Group",
        "license": "ODC Public Domain Dedication and License (PDDL) 1.0",
    },
}

LDNOOBW_URL = "https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en"

# WordNet's morphology occasionally links unrelated words (evening -> even).
ROOT_MERGE_EXCEPTIONS = {
    frozenset(p)
    for p in [
        ("evening", "even"),
        ("feed", "fee"),
        ("news", "new"),
        ("species", "specie"),
    ]
}

HINTABLE_PROPER = {"halloween", "easter", "christmas", "thanksgiving", "valentine", "santa", "hanukkah"}


def read_lines(path) -> list[str]:
    return [
        line.strip().lower()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.startswith("#")
    ]


def ldnoobw() -> list[str]:
    cached = CACHE / "ldnoobw-en.txt"
    if not cached.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(LDNOOBW_URL, timeout=30) as r:
            cached.write_bytes(r.read())
    return read_lines(cached)


def load_blocklist() -> set[str]:
    words = {w for w in ldnoobw() if " " not in w}
    return words | set(read_lines(SCRIPTS / "blocklist_extra.txt"))


def load_blocked_phrases() -> set[str]:
    """Multi-word blocklist entries plus hand-removed phrase links, as "a_b"."""
    lines = [w for w in ldnoobw() if " " in w] + read_lines(SCRIPTS / "phrase_links_block.txt")
    return {"_".join(w.split()) for w in lines}


def load_sanity_pairs() -> list[tuple[str, str, str]]:
    with open(SCRIPTS / "sanity_pairs.csv", encoding="utf-8") as f:
        return [(r["a"], r["b"], r["expect"]) for r in csv.DictReader(f)]


def must_include() -> set[str]:
    words = set(read_lines(SCRIPTS / "cozy_words.txt"))
    for a, b, _ in load_sanity_pairs():
        words.update((a, b))
    return words


def is_lemma(w: str) -> bool:
    return len(wn.lemmas(w)) > 0


def is_proper(w: str) -> bool:
    """WordNet only knows it capitalized (disney, hollywood)."""
    return not any(l.name() == w for l in wn.lemmas(w))


def clean(w: str) -> bool:
    return w.isascii() and w.isalpha() and w.islower() and 3 <= len(w) <= 14


def is_concrete(w: str) -> bool:
    """A thing you could point at, by its main noun sense, and not a drug, hormone or cell."""
    senses = wn.synsets(w, pos="n")
    if not senses or senses[0].lexname() not in CONCRETE:
        return False
    return not {h.name() for path in senses[0].hypernym_paths() for h in path} & NOT_EVERYDAY


def everyday_extras(vocab: list[str], pool: list[str], vecs: dict[str, np.ndarray]) -> list[str]:
    """Concrete nouns outside the list that are a top-EXTRA_RANK neighbour of a common concrete word."""
    have = set(vocab)
    extras = [
        w
        for w in pool
        if w not in have and zipf_frequency(w, "en") >= EXTRA_MIN_ZIPF and not is_proper(w) and is_concrete(w)
    ]
    common = set(sorted(vocab, key=lambda w: -zipf_frequency(w, "en"))[:EXTRA_ANCHORS])
    anchors = np.array([i for i, w in enumerate(vocab) if w in common and is_concrete(w)])
    mat = prepare(np.stack([vecs[w] for w in vocab + extras]).astype(np.float32))
    keep = np.zeros(len(extras), dtype=bool)
    for s in range(0, len(anchors), 512):
        a = anchors[s : s + 512]
        sims = mat[a] @ mat.T
        sims[np.arange(len(a)), a] = -np.inf
        top = np.argpartition(-sims, EXTRA_RANK, axis=1)[:, :EXTRA_RANK]
        hits = top[top >= len(vocab)] - len(vocab)
        keep[hits] = True
    return [w for w, k in zip(extras, keep) if k]


def candidate_words() -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for w in top_n_list("en", CANDIDATES):
        if clean(w) and w not in seen:
            seen.add(w)
            out.append(w)
    return out


def load_source_vectors(model: str, wanted: set[str]) -> dict[str, np.ndarray]:
    key = hashlib.sha1("\n".join(sorted(wanted)).encode()).hexdigest()[:12]
    cache = CACHE / f"{model}-{key}.npz"
    if cache.exists():
        z = np.load(cache)
        return dict(zip(z["words"].tolist(), z["vecs"]))

    path = SOURCES[model]["path"]
    found: dict[str, np.ndarray] = {}
    if model == "numberbatch":
        stream = gzip.open(path, "rt", encoding="utf-8")
    else:
        z = zipfile.ZipFile(path)
        member = next(n for n in z.namelist() if n.endswith(".txt"))
        stream = io.TextIOWrapper(z.open(member), encoding="utf-8", errors="ignore")
    with stream:
        for i, line in enumerate(stream):
            sp = line.find(" ")
            w = line[:sp]
            if w in wanted and w not in found:
                parts = line.rstrip().split(" ")
                if len(parts) == 301:
                    found[w] = np.asarray(parts[1:], dtype=np.float32)
            if i % 200000 == 0:
                print(f"  {model}: {i:,} lines, {len(found):,} found", flush=True)
    words = sorted(found)
    np.savez(cache, words=np.array(words), vecs=np.stack([found[w] for w in words]))
    return found


def build_vocab(models: list[str]):
    blocked = load_blocklist()
    must = {w for w in must_include() if clean(w) and w not in blocked}
    cands = candidate_words()
    lemma_cands = [w for w in cands if w not in blocked and is_lemma(w)]
    wanted = set(lemma_cands) | must

    sources = {m: load_source_vectors(m, wanted) for m in models}
    have = set.intersection(*(set(s) for s in sources.values()))

    missing_must = sorted(w for w in must if w not in have or not is_lemma(w))
    must_ok = sorted(w for w in must if w in have and is_lemma(w))
    pool = [w for w in lemma_cands if w in have and w not in must]
    core = must_ok + pool[: N_WORDS - len(must_ok)]
    extras = everyday_extras(core, pool, sources["numberbatch" if "numberbatch" in sources else models[0]])
    def by_freq(w: str) -> tuple[float, str]:
        return -zipf_frequency(w, "en"), w

    vocab = sorted(core, key=by_freq) + sorted(extras, key=by_freq)
    ranked = len(core)
    index = {w: i for i, w in enumerate(vocab)}

    def best_base(form: str) -> str | None:
        # Noun readings first (leaves -> leaf), then the longest candidate (taped -> tape, not tap).
        for pos in "nvar":
            cands = [c for c in wn._morphy(form, pos) if c in index and c != form]
            if cands:
                return max(cands, key=lambda c: (len(c), -index[c]))
        return None

    aliases: dict[str, int] = {}

    def add_alias(form: str) -> None:
        if form in index or form in aliases or form in blocked or not clean(form):
            return
        base = best_base(form)
        if base is not None:
            aliases[form] = index[base]

    for w in cands:
        add_alias(w)
    for w in vocab:
        plurals = [w + "s", w + "es"] + ([w[:-1] + "ies"] if w.endswith("y") else [])
        for form in plurals:
            add_alias(form)

    parent = list(range(len(vocab)))

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    merges: list[str] = []
    for w, i in index.items():
        c = best_base(w)
        if c is not None and frozenset((w, c)) not in ROOT_MERGE_EXCEPTIONS:
            a, b = find(i), find(index[c])
            if a != b:
                parent[max(a, b)] = min(a, b)
                merges.append(f"{w} -> {c}")
    roots = np.array([find(i) for i in range(len(vocab))], dtype=np.int32)

    # Proper-noun-only words (disney, hollywood) and sensitive words stay typeable but are never
    # hinted or used in best routes.
    no_whisper = [
        i
        for i, w in enumerate(vocab[:WHISPER_MAX])
        if (w not in HINTABLE_PROPER and is_proper(w)) or w in PHRASE_SENSITIVE or w in NOT_HINTED
    ]

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "root_merges.txt").write_text("\n".join(sorted(merges)), encoding="utf-8")
    (OUT / "everyday_extras.txt").write_text("\n".join(sorted(extras)), encoding="utf-8")
    print(
        f"vocab {len(vocab):,} words ({len(extras):,} everyday extras), {len(aliases):,} aliases, "
        f"{len(merges):,} root merges, "
        f"{len(no_whisper):,} proper nouns and sensitive words kept out of hints"
    )
    if missing_must:
        print(f"must-include words dropped (no vector or not in WordNet): {', '.join(missing_must)}")

    mats = {m: np.stack([sources[m][w] for w in vocab]).astype(np.float32) for m in models}
    return vocab, index, aliases, roots, no_whisper, mats, ranked


def prepare(mat: np.ndarray, mean: np.ndarray | None = None) -> np.ndarray:
    """Unit rows, centred on the vocabulary's mean direction, unit again."""
    v = mat / np.linalg.norm(mat, axis=1, keepdims=True)
    v = v - (v.mean(axis=0) if mean is None else mean)
    return v / np.linalg.norm(v, axis=1, keepdims=True)


def unit_mean(mat: np.ndarray) -> np.ndarray:
    return (mat / np.linalg.norm(mat, axis=1, keepdims=True)).mean(axis=0)


def phrase_parts(term: str, index: dict[str, int], aliases: dict[str, int], roots: np.ndarray) -> list[tuple[int, int]]:
    """The two vocabulary words a Numberbatch term joins: park_bench, or campfire = camp + fire."""
    parts = term.split("_")
    if len(parts) == 2:
        if not all(p.isascii() and p.isalpha() and len(p) >= 3 for p in parts):
            return []
        a, b = (index.get(p, aliases.get(p)) for p in parts)
        return [(a, b)] if a is not None and b is not None and roots[a] != roots[b] else []
    if len(parts) != 1 or not (term.isascii() and term.isalpha() and 6 <= len(term) <= 16):
        return []
    if zipf_frequency(term, "en") < CLOSED_MIN_ZIPF:
        return []
    out = []
    for cut in range(3, len(term) - 2):
        x, y = term[:cut], term[cut:]
        if x in AFFIXES or y in AFFIXES or x not in index or y not in index:
            continue
        if roots[index[x]] != roots[index[y]]:
            out.append((index[x], index[y]))
    return out


def scan_phrases(index, aliases, roots) -> tuple[list[str], np.ndarray, np.ndarray]:
    """Every Numberbatch term joining two vocabulary words, with its 300-d vector. Cached."""
    key = hashlib.sha1(("phrases-v1\n" + "\n".join(sorted(index))).encode()).hexdigest()[:12]
    cache = CACHE / f"numberbatch-phrases-{key}.npz"
    if cache.exists():
        z = np.load(cache)
        return z["terms"].tolist(), z["pairs"], z["vecs"].astype(np.float32)
    terms, pairs, vecs = [], [], []
    with gzip.open(SOURCES["numberbatch"]["path"], "rt", encoding="utf-8") as stream:
        for i, line in enumerate(stream):
            term = line[: line.find(" ")]
            found = phrase_parts(term, index, aliases, roots)
            if found:
                vec = np.asarray(line.rstrip().split(" ")[1:], dtype=np.float32)
                for a, b in found:
                    terms.append(term)
                    pairs.append((a, b))
                    vecs.append(vec)
            if i % 200000 == 0:
                print(f"  phrases: {i:,} lines, {len(terms):,} found", flush=True)
    pairs_arr = np.array(pairs, dtype=np.int32)
    vecs_arr = np.stack(vecs).astype(np.float16)
    np.savez(cache, terms=np.array(terms), pairs=pairs_arr, vecs=vecs_arr)
    return terms, pairs_arr, vecs_arr.astype(np.float32)


def phrase_links(vocab, index, aliases, roots, raw: np.ndarray, ranked: int) -> dict[tuple[int, int], str]:
    """Pairs of words that a common, transparent phrase joins, keyed (low, high) -> phrase."""
    terms, pairs, vecs = scan_phrases({w: i for w, i in index.items() if i < ranked}, aliases, roots)
    mean = unit_mean(raw[:ranked])
    full = prepare(raw, mean)
    phr = prepare(vecs, mean)
    ra = np.empty(len(terms), dtype=np.int64)
    rb = np.empty(len(terms), dtype=np.int64)
    for s in range(0, len(terms), 2048):
        sims = phr[s : s + 2048] @ full.T
        rows = np.arange(len(sims))
        core = sims[:, :ranked]
        ra[s : s + 2048] = 1 + (core > sims[rows, pairs[s : s + 2048, 0]][:, None]).sum(axis=1)
        rb[s : s + 2048] = 1 + (core > sims[rows, pairs[s : s + 2048, 1]][:, None]).sum(axis=1)

    blocked = load_blocked_phrases() | load_blocklist()
    proper = {}

    def ok_word(i: int) -> bool:
        if i not in proper:
            w = vocab[i]
            proper[i] = i < PHRASE_PART_MAX and w not in PHRASE_SENSITIVE and not is_proper(w)
        return proper[i]

    def inflected(term: str) -> bool:
        """starred is star + red only by accident; it's really a form of star."""
        return any(c != term for pos in "nv" for c in wn._morphy(term, pos))

    links: dict[tuple[int, int], str] = {}
    for term, (a, b), x, y in zip(terms, pairs.tolist(), ra.tolist(), rb.tolist()):
        if "_" in term:
            transparent = max(x, y) <= OPEN_MAX_RANK
        else:
            transparent = min(x, y) <= CLOSED_RANKS[0] and max(x, y) <= CLOSED_RANKS[1] and not inflected(term)
        if not transparent or term in blocked or f"{vocab[a]}_{vocab[b]}" in blocked:
            continue
        if ok_word(a) and ok_word(b):
            links.setdefault((min(a, b), max(a, b)), term)

    for line in read_lines(SCRIPTS / "phrase_links_extra.txt"):
        x, y = line.split()
        a, b = index.get(x, aliases.get(x)), index.get(y, aliases.get(y))
        if a is None or b is None:
            raise SystemExit(f"phrase_links_extra.txt: '{line}' has a word outside the vocabulary")
        links[(min(a, b), max(a, b))] = f"{x} {y} (hand-picked)"
    return links


def everyday_report(q: np.ndarray, thresholds: np.ndarray, index, aliases, links) -> str:
    """Held-out check: how many everyday pairs a player would expect to link actually do."""
    with open(SCRIPTS / "everyday_pairs.csv", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    qf = q.astype(np.float32)
    by_kind: dict[str, list[tuple[bool, bool]]] = {}
    misses = []
    for r in rows:
        a, b = (index.get(w, aliases.get(w)) for w in (r["a"], r["b"]))
        if a is None or b is None:
            continue
        s = float(qf[a] @ qf[b])
        vec = s >= thresholds[a] or s >= thresholds[b]
        both = vec or (min(a, b), max(a, b)) in links
        by_kind.setdefault(r["kind"], []).append((vec, both))
        if not both:
            misses.append(f"{r['a']}-{r['b']}")
    lines = ["### Everyday pairs (held out)", "", "| kind | pairs | vectors only | with phrase links |", "| --- | ---: | ---: | ---: |"]
    for kind, res in by_kind.items():
        lines.append(f"| {kind} | {len(res)} | {np.mean([v for v, _ in res]):.0%} | {np.mean([b for _, b in res]):.0%} |")
    lines += ["", "Still out of reach: " + ", ".join(misses), ""]
    return "\n".join(lines)


def pair_ranks(sims_for, index, pairs, ranked: int):
    """min(rank_a(b), rank_b(a)) for every pair whose words are both in the vocab."""
    words = sorted({w for a, b, _ in pairs for w in (a, b) if w in index})
    rows = np.array([index[w] for w in words])
    sims = sims_for(rows)
    row_of = {w: sims[i] for i, w in enumerate(words)}
    out = []
    for a, b, expect in pairs:
        if a in index and b in index:
            ra = rank_of(row_of[a], index[a], index[b], ranked)
            rb = rank_of(row_of[b], index[b], index[a], ranked)
            out.append((a, b, expect, min(ra, rb)))
    return out


def report(name: str, ranked) -> tuple[str, float]:
    links = np.array([r for *_, e, r in ranked if e == "1"])
    nons = np.array([r for *_, e, r in ranked if e == "0"])
    maybes = np.array([r for *_, e, r in ranked if e == "m"])
    auc = float(np.mean([[1.0 if l < n else 0.5 if l == n else 0.0 for n in nons] for l in links]))
    lines = [
        f"### {name}",
        "",
        f"Pairs scored: {len(links)} should-link, {len(nons)} should-not, {len(maybes)} borderline. "
        f"Median rank: link {int(np.median(links))}, not {int(np.median(nons))}, borderline {int(np.median(maybes))}. "
        f"AUC (link ranked closer than non-link): {auc:.3f}",
        "",
        "| K | links accepted | non-links rejected | borderline accepted |",
        "| ---: | ---: | ---: | ---: |",
    ]
    for k in K_GRID:
        lines.append(
            f"| {k} | {np.mean(links <= k):.0%} | {np.mean(nons > k):.0%} | {np.mean(maybes <= k):.0%} |"
        )
    worst = sorted([x for x in ranked if x[2] == "1"], key=lambda x: -x[3])[:8]
    lines += ["", "Weakest should-link pairs: " + ", ".join(f"{a}-{b} ({r})" for a, b, _, r in worst)]
    best_non = sorted([x for x in ranked if x[2] == "0"], key=lambda x: x[3])[:5]
    lines += ["Closest should-not pairs: " + ", ".join(f"{a}-{b} ({r})" for a, b, _, r in best_non)]
    lines += ["Borderline: " + ", ".join(f"{a}-{b} ({r})" for a, b, e, r in ranked if e == "m"), ""]
    return "\n".join(lines), auc


def available_models() -> list[str]:
    return [m for m, s in SOURCES.items() if s["path"].exists()]


def evaluate() -> None:
    models = available_models()
    vocab, index, _, _, _, mats, ranked = build_vocab(models)
    pairs = load_sanity_pairs()
    sections = [f"# Sanity-set evaluation ({date.today().isoformat()})", "", f"Vocabulary: {ranked:,} ranked words.", ""]
    for m in models:
        v = prepare(mats[m], unit_mean(mats[m][:ranked]))
        text, auc = report(
            f"{m} (full 300 dims, float)", pair_ranks(lambda rows: v[rows] @ v.T, index, pairs, ranked)
        )
        print(text)
        sections.append(text)
    (OUT / "eval.md").write_text("\n".join(sections), encoding="utf-8")


def quantize(v: np.ndarray, ranked: int) -> np.ndarray:
    """PCA down to DIMS and round to int8, fitted on the ranked words only."""
    centered = v - v[:ranked].mean(axis=0)
    _, _, vt = np.linalg.svd(centered[:ranked], full_matrices=False)
    p = centered @ vt[:DIMS].T
    p /= np.linalg.norm(p, axis=1, keepdims=True)
    scale = 127.0 / np.quantile(np.abs(p[:ranked]), 0.9999)
    return np.clip(np.rint(p * scale), -127, 127).astype(np.int8)


def neighbour_overlap(full: np.ndarray, q: np.ndarray, k: int, ranked: int, samples: int = 300) -> float:
    rng = np.random.default_rng(7)
    rows = rng.choice(ranked, size=samples, replace=False)
    a = full[rows] @ full[:ranked].T
    b = q[rows].astype(np.float32) @ q[:ranked].astype(np.float32).T
    a[np.arange(samples), rows] = -np.inf
    b[np.arange(samples), rows] = -np.inf
    ta = np.argpartition(-a, k, axis=1)[:, :k]
    tb = np.argpartition(-b, k, axis=1)[:, :k]
    return float(np.mean([len(set(x) & set(y)) / k for x, y in zip(ta, tb)]))


def export(model: str, k: int) -> None:
    vocab, index, aliases, roots, no_whisper, mats, ranked = build_vocab(available_models())
    full = prepare(mats[model], unit_mean(mats[model][:ranked]))
    q = quantize(full, ranked)
    pairs = load_sanity_pairs()
    qf = q.astype(np.float32)
    text, _ = report(
        f"{model} ({DIMS} dims, int8)", pair_ranks(lambda rows: qf[rows] @ qf.T, index, pairs, ranked)
    )
    overlap = neighbour_overlap(full, q, k, ranked)
    print(text)
    print(f"top-{k} neighbour overlap, int8 {DIMS}d vs float 300d: {overlap:.1%}")

    thresholds = thresholds_for(q, k, ranked)

    links = {}
    if model == "numberbatch":
        found = phrase_links(vocab, index, aliases, roots, mats[model], ranked)
        qf = q.astype(np.float32)
        for (a, b), term in found.items():
            s = float(qf[a] @ qf[b])
            if s < thresholds[a] and s < thresholds[b]:
                links[(a, b)] = term
        print(f"phrase links: {len(found):,} transparent phrases, {len(links):,} not already in reach")
        listing = sorted(f"{vocab[a]} + {vocab[b]}  ({term})" for (a, b), term in links.items())
        (OUT / "phrase_links.md").write_text(
            f"# Phrase links ({len(links):,})\n\n" + "\n".join(f"- {x}" for x in listing) + "\n", encoding="utf-8"
        )
    everyday = everyday_report(q, thresholds, index, aliases, links)
    print(everyday)

    meta = {
        "model": model,
        "credit": SOURCES[model]["credit"],
        "license": SOURCES[model]["license"],
        "built": date.today().isoformat(),
        "neighbourOverlap": round(overlap, 3),
    }
    write_game_data(vocab, roots, aliases, q, thresholds, k, ranked, WHISPER_MAX, no_whisper, list(links), meta)
    (OUT / f"export-{model}.md").write_text(
        f"{text}\nTop-{k} neighbour overlap vs float 300d: {overlap:.1%}\n\n{everyday}", encoding="utf-8"
    )
    size = q.nbytes + thresholds.nbytes
    print(f"wrote vectors.bin ({size / 1e6:.2f} MB) and vocab.json")


def main() -> None:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("evaluate")
    e = sub.add_parser("export")
    e.add_argument("--model", choices=list(SOURCES), required=True)
    e.add_argument("--k", type=int, required=True)
    args = p.parse_args()
    if args.cmd == "evaluate":
        evaluate()
    else:
        export(args.model, args.k)


if __name__ == "__main__":
    main()
