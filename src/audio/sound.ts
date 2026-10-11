import bubble1 from '../assets/sfx/bubble-1.wav'
import bubble2 from '../assets/sfx/bubble-2.wav'
import knock1 from '../assets/sfx/knock-1.wav'
import knock2 from '../assets/sfx/knock-2.wav'
import knock3 from '../assets/sfx/knock-3.wav'

const SAMPLES = { knock: [knock1, knock2, knock3], bubble: [bubble1, bubble2] }
type Sample = keyof typeof SAMPLES

/** C major pentatonic, C5 up to E6. */
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51]

type Ctx = AudioContext

class Sound {
  private ctx: Ctx | null = null
  private out: GainNode | null = null
  private buffers = new Map<Sample, AudioBuffer[]>()
  private noise: AudioBuffer | null = null
  enabled = true

  /** Browsers only allow audio after a user gesture, so this runs on the first tap or key. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    this.ctx = ctx
    this.out = ctx.createGain()
    this.out.gain.value = 0.55
    this.out.connect(ctx.destination)
    void ctx.resume()
    for (const [name, urls] of Object.entries(SAMPLES) as [Sample, string[]][]) {
      Promise.all(urls.map((u) => fetch(u).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b))))
        .then((bufs) => this.buffers.set(name, bufs))
        .catch(() => {})
    }
    const len = Math.floor(ctx.sampleRate * 0.6)
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = this.noise.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  }

  private ready(): Ctx | null {
    if (!this.enabled || !this.ctx || !this.out || this.ctx.state !== 'running') return null
    return this.ctx
  }

  private sample(name: Sample, at: number, gain: number, rate = 1): boolean {
    const ctx = this.ready()
    const bufs = this.buffers.get(name)
    if (!ctx || !bufs?.length) return false
    const src = ctx.createBufferSource()
    src.buffer = bufs[Math.floor(Math.random() * bufs.length)]
    src.playbackRate.value = rate * (0.94 + Math.random() * 0.12)
    const g = ctx.createGain()
    g.gain.value = gain
    src.connect(g).connect(this.out!)
    src.start(ctx.currentTime + at)
    return true
  }

  /** A soft plucked note: sine plus a faint inharmonic overtone, like a kalimba tine. */
  private tine(freq: number, at: number, gain: number, decay = 1.2) {
    const ctx = this.ready()
    if (!ctx) return
    const t = ctx.currentTime + at
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    g.connect(this.out!)
    for (const [mult, level] of [
      [1, 1],
      [2.76, 0.18],
    ]) {
      const o = ctx.createOscillator()
      const og = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = freq * mult
      og.gain.value = level
      o.connect(og).connect(g)
      o.start(t)
      o.stop(t + decay + 0.05)
    }
  }

  private splashNoise(at: number, gain: number) {
    const ctx = this.ready()
    if (!ctx || !this.noise) return
    const t = ctx.currentTime + at
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 0.9
    bp.frequency.setValueAtTime(2200, t)
    bp.frequency.exponentialRampToValueAtTime(420, t + 0.4)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45)
    src.connect(bp).connect(g).connect(this.out!)
    src.start(t)
    src.stop(t + 0.5)

    const o = ctx.createOscillator()
    const og = ctx.createGain()
    o.frequency.setValueAtTime(190, t)
    o.frequency.exponentialRampToValueAtTime(80, t + 0.14)
    og.gain.setValueAtTime(gain * 0.9, t)
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
    o.connect(og).connect(this.out!)
    o.start(t)
    o.stop(t + 0.2)
  }

  /** A stone rises: wooden knock now, then a note that climbs as you near the far bank. */
  land(height: number, strength: 'strong' | 'sturdy' | 'wobbly') {
    this.sample('knock', 0, strength === 'wobbly' ? 0.55 : 0.85, strength === 'strong' ? 1.05 : 1)
    const note = PENTATONIC[Math.min(PENTATONIC.length - 1, Math.round(height * (PENTATONIC.length - 1)))]
    this.tine(note, 0.48, strength === 'wobbly' ? 0.12 : 0.18, 0.9)
  }

  splash(nearMiss: boolean) {
    if (nearMiss) this.sample('bubble', 0.38, 0.6)
    this.splashNoise(0.42, nearMiss ? 0.22 : 0.32)
  }

  /** The quiet "no stroke used" tick for unknown words and repeats. */
  tick() {
    const ctx = this.ready()
    if (!ctx) return
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.setValueAtTime(1350, t)
    o.frequency.exponentialRampToValueAtTime(900, t + 0.05)
    g.gain.setValueAtTime(0.08, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
    o.connect(g).connect(this.out!)
    o.start(t)
    o.stop(t + 0.08)
  }

  whisper() {
    const ctx = this.ready()
    if (!ctx || !this.noise) return
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const hp = ctx.createBiquadFilter()
    hp.type = 'bandpass'
    hp.Q.value = 2
    hp.frequency.setValueAtTime(900, t)
    hp.frequency.exponentialRampToValueAtTime(3200, t + 0.5)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.2)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.58)
    src.connect(hp).connect(g).connect(this.out!)
    src.start(t)
    src.stop(t + 0.6)
    this.tine(PENTATONIC[4], 0.18, 0.07, 1)
    this.tine(PENTATONIC[6], 0.3, 0.06, 1)
  }

  undo() {
    this.sample('knock', 0, 0.45, 0.8)
  }

  /** The crossing: an arpeggiated pentatonic chord as the frog lands on the far bank. */
  chime() {
    const notes = [PENTATONIC[0], PENTATONIC[2], PENTATONIC[3], PENTATONIC[5], PENTATONIC[7]]
    notes.forEach((f, i) => this.tine(f, 0.5 + i * 0.09, 0.2, 1.8))
    this.tine(PENTATONIC[0] / 2, 0.5, 0.12, 2.2)
  }

  /** A friendly blip so turning sound on is audible. */
  hello() {
    this.tine(PENTATONIC[3], 0, 0.14, 0.6)
  }
}

export const sound = new Sound()
