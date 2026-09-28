<script lang="ts">
  import { metronome } from './metronome'
  import { formatPercent } from './format'
  import { m } from '../paraglide/messages.js'

  const MIN_BPM = 120
  const MAX_BPM = 220
  const STEP = 5
  const STORAGE_KEY = 'metronome.bpm'
  const VOLUME_STORAGE_KEY = 'metronome.volume'

  function clamp(value: number): number {
    return Math.min(MAX_BPM, Math.max(MIN_BPM, value))
  }

  function clampVolume(value: number): number {
    return Math.min(1, Math.max(0, value))
  }

  const saved = Number(localStorage.getItem(STORAGE_KEY))
  let bpm = $state(Number.isFinite(saved) && saved >= MIN_BPM && saved <= MAX_BPM ? saved : metronome.bpm)
  let running = $state(metronome.running)

  function readStoredVolume(): number | null {
    const stored = localStorage.getItem(VOLUME_STORAGE_KEY)
    if (stored === null) return null
    const parsed = Number(stored)
    return Number.isFinite(parsed) ? clampVolume(parsed) : null
  }

  let volume = $state(readStoredVolume() ?? metronome.volume)

  // Single source of truth: any bpm change (slider or buttons) updates the
  // engine mid-playback and persists across sessions.
  $effect(() => {
    metronome.bpm = bpm
    localStorage.setItem(STORAGE_KEY, String(bpm))
  })

  $effect(() => {
    metronome.volume = volume
    localStorage.setItem(VOLUME_STORAGE_KEY, String(volume))
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

<section class="tool narrow" aria-label={m.metronome_label()}>
  <div class="dial" class:running>
    <p class="eyebrow">{m.metronome_cadence()}</p>
    <p class="bpm-display">
      <span class="bpm-value display">{bpm}</span>
      <span class="bpm-unit">{m.unit_steps_per_min()}</span>
    </p>

    <div class="controls">
      <button type="button" class="step" onclick={() => adjust(-STEP)} aria-label={m.metronome_decrease()}>
        −{STEP}
      </button>
      <input
        type="range"
        min={MIN_BPM}
        max={MAX_BPM}
        step={1}
        bind:value={bpm}
        style:--fill="{((bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * 100}%"
        aria-label={m.metronome_slider()}
      />
      <button type="button" class="step" onclick={() => adjust(STEP)} aria-label={m.metronome_increase()}>
        +{STEP}
      </button>
    </div>

    <button type="button" class="toggle" class:primary={!running} onclick={toggle}>
      {running ? m.metronome_stop() : m.metronome_start()}
    </button>

    <div class="volume">
      <label for="click-volume">{m.metronome_volume()}</label>
      <input
        id="click-volume"
        type="range"
        min="0"
        max="1"
        step="0.05"
        bind:value={volume}
        style:--fill="{volume * 100}%"
      />
      <span class="volume-value">{formatPercent(Math.round(volume * 100))}</span>
    </div>
  </div>

  <details class="info">
    <summary>{m.metronome_info_title()}</summary>
    <p>{m.metronome_info()}</p>
  </details>
</section>

<style>
  .dial {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    padding: 2rem 1.25rem 1.5rem;
    border-radius: 28px;
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
    text-align: center;
    transition: border-color 0.3s;
  }

  .dial.running {
    border-color: var(--accent-text);
    box-shadow:
      var(--shadow),
      0 0 0 4px var(--accent-soft);
  }

  .bpm-display {
    margin: -0.5rem 0 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
  }

  .bpm-value {
    font-size: clamp(6.5rem, 30vw, 10rem);
  }

  .running .bpm-value {
    color: var(--accent-text);
  }

  .bpm-unit {
    color: var(--muted);
    font-weight: 600;
  }

  .controls,
  .volume {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
  }

  input[type='range'] {
    flex: 1;
    min-width: 0;
  }

  .step {
    flex: none;
    width: 3.25rem;
    height: 3.25rem;
    padding: 0;
    font-variant-numeric: tabular-nums;
  }

  .toggle {
    width: 100%;
    padding: 1rem;
    font-size: 1.15rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .volume {
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }

  .volume label,
  .volume-value {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--muted);
  }

  .volume-value {
    min-width: 2.75rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
</style>
