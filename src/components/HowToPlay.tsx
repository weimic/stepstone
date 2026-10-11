import { Undo2, Wind } from 'lucide-react'
import { STRONG_RANK, STURDY_RANK } from '../engine/scoring'
import { puzzleFile, useGame } from '../store/game'
import { FrogArt } from './Frog'
import { Lily } from './Lily'
import { Button } from './ui/Button'
import { Sheet } from './ui/Sheet'

function MiniStone({ word, tone }: { word: string; tone: 'strong' | 'sturdy' | 'wobbly' }) {
  const style = {
    strong: 'bg-moss-200 border-moss-400 text-moss-800',
    sturdy: 'bg-pebble-100 border-pebble-300 text-ink',
    wobbly: 'bg-pebble-50 border-pebble-200 border-dashed text-ink-soft',
  }[tone]
  return <span className={`inline-block rounded-[50%] border-b-4 px-3 py-0.5 text-sm font-extrabold ${style}`}>{word}</span>
}

export function HowToPlay() {
  const open = useGame((s) => s.sheet === 'howto')
  const { openSheet, markHowToSeen } = useGame.getState()
  const k = puzzleFile.k
  const close = () => {
    markHowToSeen()
    openSheet(null)
  }

  return (
    <Sheet open={open} onClose={close} title="How to play">
      <div className="flex flex-col gap-4 text-[0.95rem] leading-relaxed text-ink">
        <div className="flex items-center gap-3 rounded-2xl bg-water-100 p-3">
          <FrogArt className="w-12 shrink-0" />
          <p>
            Help the frog cross the river. Type a word <b>linked</b> to the stone you’re on, and a new stone rises for you
            to hop onto.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          <li>
            <b>Linked</b> means one of the {k} words closest in meaning to your stone. The two halves of a common phrase,
            like park and bench, always link too.
          </li>
          <li>
            <b>Get closer.</b> Stones land higher up the river the closer their meaning is to the far bank. When the far
            bank glows, it’s in reach: <b>leap across</b>!
          </li>
          <li className="flex flex-col gap-1.5">
            <span>
              <b>Links come in three strengths.</b> Any of them holds your weight.
            </span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink-soft">
              {(
                [
                  ['bee', 'strong', STRONG_RANK],
                  ['jam', 'sturdy', STURDY_RANK],
                  ['gold', 'wobbly', k],
                ] as const
              ).map(([word, tone, rank]) => (
                <span key={tone} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <MiniStone word={word} tone={tone} /> {tone}, top {rank}
                </span>
              ))}
            </span>
          </li>
          <li>
            <b>Too far?</b> Splash! The frog swims back and it costs a stroke. You’ll see where your word ranked; “so
            close” means it made the top {2 * k}.
          </li>
          <li>
            <b>Free tries:</b> typos, unknown words, repeats and plurals of earlier stones never cost a stroke.
          </li>
          <li className="flex items-start gap-2">
            <Wind size={18} className="mt-1 shrink-0 text-lilac-600" />
            <span>
              <b>Whisper</b> suggests a good next word for 1 stroke.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Undo2 size={18} className="mt-1 shrink-0 text-ink-soft" />
            <span>
              <b>Undo</b> steps back a stone. Strokes you’ve spent stay spent.
            </span>
          </li>
        </ul>

        <div className="rounded-2xl bg-blossom-100 p-3">
          <p className="mb-1 font-bold">Golf rules: fewer strokes is better.</p>
          <p className="flex items-center gap-1 text-sm">
            <Lily filled size={20} />
            <Lily filled size={20} />
            <Lily filled size={20} /> at par, <Lily filled size={20} />
            <Lily filled size={20} /> within 2 over, <Lily filled size={20} /> for any crossing.
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Par is the fewest hops our solver found with common words, so a rarer word can sometimes beat it. You can’t
            fail; keep hopping.
          </p>
        </div>

        <p className="text-sm text-ink-soft">A new daily river appears at midnight. Practice rivers are unlimited.</p>

        <Button variant="primary" size="lg" onClick={close}>
          Let’s hop
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            markHowToSeen()
            openSheet('credits')
          }}
        >
          Credits &amp; licences
        </Button>
      </div>
    </Sheet>
  )
}
