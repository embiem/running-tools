<script lang="ts">
  import { metronome } from './metronome'

  const MIN_BPM = 120
  const MAX_BPM = 220
  const STEP = 5
  const STORAGE_KEY = 'metronome.bpm'

  function clamp(value: number): number {
    return Math.min(MAX_BPM, Math.max(MIN_BPM, value))
  }

  const saved = Number(localStorage.getItem(STORAGE_KEY))
  let bpm = $state(Number.isFinite(saved) && saved >= MIN_BPM && saved <= MAX_BPM ? saved : metronome.bpm)
  let running = $state(metronome.running)

  // Single source of truth: any bpm change (slider or buttons) updates the
  // engine mid-playback and persists across sessions.
  $effect(() => {
    metronome.bpm = bpm
    localStorage.setItem(STORAGE_KEY, String(bpm))
  })

  function adjust(delta: number): void {
    bpm = clamp(bpm + delta)
  }

  function toggle(): void {
    if (running) {
      metronome.stop()
      running = false
    } else {
      metronome.start()
      running = true
    }
  }
</script>

<section aria-label="Cadence metronome">
  <p class="bpm-display">
    <span class="bpm-value">{bpm}</span>
    <span class="bpm-unit">steps/min</span>
  </p>

  <div class="controls">
    <button type="button" onclick={() => adjust(-STEP)} aria-label="Decrease cadence">
      −{STEP}
    </button>
    <input
      type="range"
      min={MIN_BPM}
      max={MAX_BPM}
      step={1}
      bind:value={bpm}
      aria-label="Cadence in steps per minute"
    />
    <button type="button" onclick={() => adjust(STEP)} aria-label="Increase cadence">
      +{STEP}
    </button>
  </div>

  <button type="button" class="toggle" onclick={toggle}>
    {running ? 'Stop' : 'Start'}
  </button>

  <details class="info">
    <summary>Why does cadence matter?</summary>
    <p>
      Cadence is your steps per minute. A higher cadence means shorter steps and
      your foot landing closer under your body. Research shows this reduces
      overstriding, braking forces, and impact loading at the hip, knee, and
      ankle, which is linked to lower injury risk. Raising your natural cadence
      by 5–10% can cut peak knee impact by roughly 20% without costing extra
      energy. Many runners aim for 170–180 steps/min; studies found cadences at
      or above 170 associated with fewer overuse injuries. Increase gradually by
      about 5% at a time and let the metronome set the rhythm while you match
      each footstrike to a beat.
    </p>
  </details>
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .bpm-display {
    margin: 0;
    line-height: 1;
  }

  .bpm-value {
    font-size: 4rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .bpm-unit {
    margin-left: 0.5rem;
    color: #888;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: min(24rem, 100%);
  }

  input[type='range'] {
    flex: 1;
    accent-color: #646cff;
  }

  .toggle {
    min-width: 8rem;
  }

  .info {
    width: min(28rem, 100%);
    text-align: left;
    font-size: 0.9rem;
  }

  .info summary {
    cursor: pointer;
    color: #646cff;
    font-weight: 500;
  }

  .info p {
    margin: 0.5rem 0 0;
    opacity: 0.85;
  }
</style>
