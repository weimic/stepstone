# StepStone

A cozy daily word game. Help a little frog cross the river by typing words linked to the stone it's standing on, from a start word to the far bank, in as few strokes as you can. A word-similarity model running in the browser judges every hop.

Design notes and measured results are in [research/05-stepstone-game-design-and-architecture.md](research/05-stepstone-game-design-and-architecture.md).

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # engine, data and store tests (Vitest)
npm run lint
npm run build      # type-checks, then writes the static site to dist/
npm run preview    # serves dist/ locally
```

## Deploy

The build is a plain static site with relative paths, so it works from any host or subfolder. No server is needed.

- **Netlify**: connect the repo; `netlify.toml` sets the build command and `dist/` folder.
- **Cloudflare Pages**: build command `npm run build`, output `dist`. `public/_headers` caches hashed assets for a year.
- **Vercel**: picks up Vite automatically; `vercel.json` adds the same caching.

Set `SITE_URL` (for example `https://stepstone.example`) when building so link previews get absolute `og:url` and `og:image` tags. On Netlify the built-in `URL` variable is used if `SITE_URL` isn't set.

## Data pipeline

The generated files in `src/data/` are committed, so you only need this to change the vocabulary or the rivers. It needs Python 3 (tested with 3.14) and `pip install -r scripts/requirements.txt`. Raw downloads are cached in `scripts/.cache/`.

```sh
python scripts/build_vectors.py evaluate                         # compare models on the sanity pairs
python scripts/build_vectors.py export --model numberbatch --k 300
python scripts/generate_puzzles.py candidates                    # shortlist rivers with par and routes
python scripts/generate_puzzles.py build                         # validate dailies, write puzzles.json
python scripts/generate_puzzles.py route park feather            # inspect one river
python scripts/make_test_fixture.py                              # refresh the cross-check fixture
python scripts/playtest.py                                       # simulated players
python scripts/build_sfx.py                                      # rebuild the sound clips
```

Daily rivers are hand-curated in `scripts/daily_curated.json`. Day 1 is 9 October 2026.

Compound words and set phrases (park bench, campfire) are joined by phrase links, which come from Numberbatch's phrase terms. `scripts/phrase_links_extra.txt` adds phrases by hand and `scripts/phrase_links_block.txt` drops them. The export lists every kept link in `scripts/out/phrase_links.md`. After editing either file, re-run the export and then `generate_puzzles.py build`, since par depends on these links.

The vocabulary is the 20,000 most common words plus about 1,700 rarer everyday things (udder, piglet) picked with WordNet. The export lists them in `scripts/out/everyday_extras.txt`. They're typeable and link normally, but whispers, best routes and par ignore them. To drop one, add it to `scripts/blocklist_extra.txt`.

`scripts/og-card.html` is the source for `public/og.png` and `public/apple-touch-icon.png`.

## Licences

Word vectors come from [ConceptNet Numberbatch 19.08](https://github.com/commonsense/conceptnet-numberbatch) (Luminoso Technologies, CC BY-SA 4.0). The derived `vectors.bin` and `vocab.json` are shared under the same licence; see [src/data/LICENSE.md](src/data/LICENSE.md). Sounds are CC0 from [Kenney](https://kenney.nl). Nunito is under the SIL Open Font License. The in-game Credits sheet lists every source.
