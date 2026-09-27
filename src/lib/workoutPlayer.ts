/**
 * Guided-workout playback engine: a narrated countdown timer over a Workout.
 *
 * Timing uses wall-clock deltas accumulated in a 250 ms setInterval, so
 * background-tab throttling can only delay an announcement by a tick or two —
 * the schedule itself never drifts.
 *
 * Narration plays pre-rendered clips (see scripts/generate-narration.mjs)
 * through Web Audio: the AudioContext is resumed inside the Play click, so
 * later clips can start from timer callbacks without an autoplay block. Clips
 * queue back to back on the audio clock, like an utterance queue; cancelling
 * stops whatever is playing or scheduled. A sentence without a clip (wording
 * changed without `npm run narrate`) or a clip that fails to load is skipped —
 * the session still runs as a timer.
 */

import { cues, getWorkout, narrationLines } from './workouts'
import type { WorkoutId, WorkoutStep } from './workouts'
import narration from '../assets/narration/manifest.json'

/** Vite-emitted URL of every clip, keyed by its path relative to this module. */
const CLIP_URLS = import.meta.glob<string>('../assets/narration/*.mp3', {
  query: '?url',
  import: 'default',
  eager: true,
})
const CLIPS: Record<string, { file: string; duration: number }> = narration.clips

const TICK_MS = 250
/** Minimum lead of the "Next up … three, two, one" cue before a step ends. */
const COUNTDOWN_SEC = 3

export type PlayerPhase = 'idle' | 'running' | 'paused' | 'done'

export class WorkoutPlayer {
  #timer: number | null = null
  #ctx: AudioContext | null = null
  /** Decoded clips by sentence; failed loads are dropped so a later play retries. */
  #clips = new Map<string, Promise<AudioBuffer | null>>()
  #sources = new Set<AudioBufferSourceNode>()
  /** Serialises scheduling so clips play in speak() order even if they decode out of order. */
  #queue: Promise<void> = Promise.resolve()
  /** Audio-clock time the last queued clip ends. */
  #queueEnd = 0
  /** Bumped by every cancel, so clips still decoding for a cancelled queue never play. */
  #speechGeneration = 0
  #phase: PlayerPhase = 'idle'
  #stepIndex = 0
  #stepElapsedMs = 0
  #totalElapsedMs = 0
  #lastTickAt = 0
  #countdownSpoken = false
  #halfwaySpoken = false

  workoutId: WorkoutId | null = null

  get phase(): PlayerPhase {
    return this.#phase
  }

  /** Current step; stays on the last step once 'done'. */
  get stepIndex(): number {
    return this.#stepIndex
  }

  get stepRemainingSec(): number {
    if (this.workoutId === null) return 0
    const step = this.#steps()[this.#stepIndex]
    return Math.max(0, Math.ceil((step.durationSec * 1000 - this.#stepElapsedMs) / 1000))
  }

  get totalElapsedSec(): number {
    return Math.floor(this.#totalElapsedMs / 1000)
  }

  select(id: WorkoutId): void {
    this.stop()
    this.workoutId = id
  }

  play(): void {
    if (this.workoutId === null) return
    if (this.#phase === 'running') return
    // Browsers only let a user gesture start audio, so the AudioContext has
    // to be created and resumed here, inside the Play click.
    this.#ctx ??= new AudioContext()
    this.#ctx.resume().catch(() => {})
    const workout = getWorkout(this.workoutId)
    const resuming = this.#phase === 'paused'
    if (!resuming) {
      // idle or done: start over from the top.
      for (const line of narrationLines(workout)) void this.#load(line)
      this.#stepIndex = 0
      this.#stepElapsedMs = 0
      this.#totalElapsedMs = 0
      this.#countdownSpoken = false
      this.#halfwaySpoken = false
    }
    this.#lastTickAt = Date.now()
    this.#timer = setInterval(() => this.#tick(), TICK_MS)
    this.#phase = 'running'
    // Resuming re-announces only the current step's name.
    this.#speak(
      resuming ? cues.resume(workout.steps[this.#stepIndex]) : cues.announce(workout.steps[0]),
    )
  }

  pause(): void {
    if (this.#phase !== 'running') return
    this.#cancelSpeech()
    this.#clearTimer()
    this.#phase = 'paused'
  }

  stop(): void {
    this.#cancelSpeech()
    this.#clearTimer()
    this.#phase = 'idle'
    this.#stepIndex = 0
    this.#stepElapsedMs = 0
    this.#totalElapsedMs = 0
    this.#countdownSpoken = false
    this.#halfwaySpoken = false
  }

  #steps(): WorkoutStep[] {
    return getWorkout(this.workoutId!).steps
  }

  #tick(): void {
    const now = Date.now()
    const delta = now - this.#lastTickAt
    this.#lastTickAt = now
    this.#stepElapsedMs += delta
    this.#totalElapsedMs += delta

    const steps = this.#steps()
    const step = steps[this.#stepIndex]
    const durationMs = step.durationSec * 1000

    if (!this.#halfwaySpoken && step.halfwayCue && this.#stepElapsedMs >= durationMs / 2) {
      this.#halfwaySpoken = true
      this.#speak(step.halfwayCue)
    }
    const countdown = cues.countdown(steps[this.#stepIndex + 1])
    // Start the countdown clip early enough that its "one" lands on the step change.
    const leadMs = Math.max(COUNTDOWN_SEC, CLIPS[countdown]?.duration ?? 0) * 1000
    if (!this.#countdownSpoken && this.#stepElapsedMs >= durationMs - leadMs) {
      this.#countdownSpoken = true
      this.#speak(countdown)
    }
    if (this.#stepElapsedMs >= durationMs) this.#advance()
  }

  #advance(): void {
    const next: WorkoutStep | undefined = this.#steps()[this.#stepIndex + 1]
    if (!next) {
      this.#clearTimer()
      this.#phase = 'done'
      this.#speak(cues.done)
      return
    }
    this.#stepIndex += 1
    this.#stepElapsedMs = 0
    this.#halfwaySpoken = false
    this.#countdownSpoken = false
    // Queued, not cancelling: whatever is still playing (the countdown's last
    // word) finishes first.
    this.#speak(cues.announce(next))
  }

  #load(text: string): Promise<AudioBuffer | null> {
    const cached = this.#clips.get(text)
    if (cached) return cached
    const clip = CLIPS[text]
    const url = clip && CLIP_URLS[`../assets/narration/${clip.file}`]
    const ctx = this.#ctx
    if (!url || !ctx) {
      if (!url) console.warn(`No narration clip for "${text}" — run \`npm run narrate\`.`)
      return Promise.resolve(null)
    }
    const loading = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
        return response.arrayBuffer()
      })
      .then((bytes) => ctx.decodeAudioData(bytes))
      .catch((error: unknown) => {
        console.warn('Narration clip failed to load', error)
        this.#clips.delete(text)
        return null
      })
    this.#clips.set(text, loading)
    return loading
  }

  /** Queues a clip after whatever is already playing or scheduled. */
  #speak(text: string): void {
    const generation = this.#speechGeneration
    const clip = this.#load(text)
    this.#queue = this.#queue.then(async () => {
      const buffer = await clip
      const ctx = this.#ctx
      if (!buffer || !ctx || generation !== this.#speechGeneration) return
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      const at = Math.max(ctx.currentTime, this.#queueEnd)
      source.start(at)
      this.#queueEnd = at + buffer.duration
      this.#sources.add(source)
      source.onended = () => this.#sources.delete(source)
    })
  }

  #cancelSpeech(): void {
    this.#speechGeneration += 1
    for (const source of this.#sources) source.stop()
    this.#sources.clear()
    this.#queueEnd = 0
  }

  #clearTimer(): void {
    if (this.#timer !== null) {
      clearInterval(this.#timer)
      this.#timer = null
    }
  }
}

/** One player per app: survives route changes, so the UI must bind to this instance. */
export const workoutPlayer = new WorkoutPlayer()
