import type { ReactNode } from 'react'
import { useGame } from '../store/game'
import { Sheet } from './ui/Sheet'

function Credit({ title, href, licence, children }: { title: string; href: string; licence: string; children: ReactNode }) {
  return (
    <li className="rounded-2xl bg-white p-3 shadow-soft">
      <p className="flex flex-wrap items-baseline justify-between gap-x-3">
        <a href={href} target="_blank" rel="noreferrer" className="font-bold text-ink underline decoration-water-400 decoration-2 underline-offset-3">
          {title}
        </a>
        <span className="text-xs font-bold tracking-wide text-ink-soft uppercase">{licence}</span>
      </p>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{children}</p>
    </li>
  )
}

export function CreditsSheet() {
  const open = useGame((s) => s.sheet === 'credits')
  const { openSheet } = useGame.getState()

  return (
    <Sheet open={open} onClose={() => openSheet(null)} title="Credits">
      <ul className="flex flex-col gap-2.5">
        <Credit
          title="ConceptNet Numberbatch 19.08"
          href="https://github.com/commonsense/conceptnet-numberbatch"
          licence="CC BY-SA 4.0"
        >
          Word links come from Numberbatch by Luminoso Technologies. We kept 20,000 common English words plus about
          1,700 rarer everyday things (udder, piglet) picked with WordNet, reduced each to 160 numbers and rounded
          them to 8 bits, and linked the halves of its common phrases (park + bench).
          That word-link file is shared under the same{' '}
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            CC BY-SA 4.0
          </a>{' '}
          licence.
        </Credit>
        <Credit title="wordfreq" href="https://github.com/rspeer/wordfreq" licence="CC BY-SA 4.0 data">
          Word frequencies by Robyn Speer, used to choose which words the river knows.
        </Credit>
        <Credit title="WordNet 3.0" href="https://wordnet.princeton.edu/" licence="WordNet licence">
          Princeton University, read through NLTK. Used to fold plurals and verb forms into base words.
        </Credit>
        <Credit
          title="List of Dirty, Naughty, Obscene and Otherwise Bad Words"
          href="https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words"
          licence="CC BY 4.0"
        >
          Keeps unkind words out of the river.
        </Credit>
        <Credit title="Kenney sound packs" href="https://kenney.nl/assets" licence="CC0">
          Wooden knocks and bubbles from Impact Sounds and Interface Sounds. The splashes and chimes are synthesized.
        </Credit>
        <Credit title="Nunito" href="https://fonts.google.com/specimen/Nunito" licence="SIL OFL 1.1">
          Typeface by Vernon Adams, Cyreal and Jacques Le Bailly.
        </Credit>
        <Credit title="Open-source code" href="https://lucide.dev/" licence="MIT · ISC">
          Built with React, Motion, Zustand, canvas-confetti and Lucide icons.
        </Credit>
      </ul>
      <p className="mt-4 text-center text-sm text-ink-soft">
        Rivers are curated by hand. If a link seems odd, the word model is to blame, not you.
      </p>
    </Sheet>
  )
}
