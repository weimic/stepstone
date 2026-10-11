# Data licence

`vectors.bin` and `vocab.json` are derived from
[ConceptNet Numberbatch 19.08](https://github.com/commonsense/conceptnet-numberbatch)
by Luminoso Technologies, Inc., licensed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

Changes: restricted to 20,000 common English words (chosen with
[wordfreq](https://github.com/rspeer/wordfreq) frequencies, CC BY-SA 4.0 data)
plus about 1,700 rarer concrete nouns (such as udder) that rank among the
closest words to a common one, picked using WordNet 3.0 categories;
reduced to 160 dimensions with PCA, re-normalized and quantized to signed 8-bit
integers. Aliases map inflected forms to base words using WordNet 3.0
(Princeton University). Phrase links (word pairs such as park + bench) were
taken from Numberbatch's own phrase terms. Offensive words and phrases were removed using the
[LDNOOBW list](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words) (CC BY 4.0).

These derived files are released under the same CC BY-SA 4.0 licence.
`scripts/build_vectors.py` rebuilds them from the original downloads.

`puzzles.json` (the curated rivers and route notes) is original work and is
covered by the project's own licence.
