/**
 * Cadence metronome engine built on the Web Audio API.
 *
 * Uses the "lookahead scheduler" pattern: a low-frequency setInterval polls
 * ahead of the audio clock and schedules click oscillator nodes at exact
 * times. Timing is sample-accurate and immune to timer throttling
 * (background tab, screen lock on mobile).
 */

const LOOKAHEAD_SECONDS = 0.12 // schedule clicks up to 120ms ahead
const TIMER_INTERVAL_MS = 25 // poll at 25ms — well within LOOKAHEAD window

export class Metronome {
  #ctx: AudioContext | null = null
  #timer: number | null = null
  #nextTickTime = 0
  #beat = 0

  bpm = 170
  volume = 0.5

  get running(): boolean {
    return this.#timer !== null
  }

  start(): void {
    if (this.#timer) return
    if (!this.#ctx) {
      // Safari's constructor type lacks latencyHint; runtime supports it.
      this.#ctx = new AudioContext({ latencyHint: 'interactive' })
    }
    this.#ctx.resume().catch(() => {})
    // Schedule from slightly in the future so the first beat is never in the past.
    this.#nextTickTime = this.#ctx.currentTime + 0.1
    this.#beat = 0
    this.#timer = setInterval(() => this.#scheduler(), TIMER_INTERVAL_MS)
  }

  stop(): void {
    if (this.#timer !== null) {
      clearInterval(this.#timer)
      this.#timer = null
    }
  }

  #scheduler(): void {
    const ctx = this.#ctx
    if (!ctx) return
    const secondsPerBeat = 60 / this.bpm
    while (this.#nextTickTime < ctx.currentTime + LOOKAHEAD_SECONDS) {
      // Every 4th beat (downbeat) gets a higher pitch — audible 4-beat phrase.
      const freq = this.#beat % 4 === 0 ? 1400 : 1000
      this.#tick(ctx, this.#nextTickTime, freq, this.volume)
      this.#nextTickTime += secondsPerBeat
      this.#beat++
    }
  }

  /** Short, percussive tick: sine burst with exponential decay envelope. */
  #tick(
    ctx: AudioContext,
    time: number,
    freq: number,
    peakGain: number,
  ): void {
    const isMuted = peakGain <= 0
    if (isMuted) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(peakGain, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(time)
    osc.stop(time + 0.06)
  }
}

/** One metronome per app: survives route changes, so the UI must bind to this instance. */
export const metronome = new Metronome()
