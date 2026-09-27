<script lang="ts">
  import { onMount } from 'svelte'
  import Panel from './Panel.svelte'
  import { WORKOUTS, getWorkout, totalDurationSec } from './workouts'
  import type { Workout, WorkoutId } from './workouts'
  import { workoutPlayer } from './workoutPlayer'
  import type { PlayerPhase } from './workoutPlayer'

  const SELECTION_KEY = 'workout.selection'

  function readStoredId(): WorkoutId | null {
    const stored = localStorage.getItem(SELECTION_KEY)
    return WORKOUTS.find((w) => w.id === stored)?.id ?? null
  }

  // The engine owns playback and survives route changes; this component only
  // mirrors it. On remount, adopt the stored selection only if the engine is
  // idle with no workout — never reset a running session.
  let selected: WorkoutId | null = $state(workoutPlayer.workoutId ?? readStoredId())

  let phase = $state<PlayerPhase>(workoutPlayer.phase)
  let stepIndex = $state(workoutPlayer.stepIndex)
  let stepRemainingSec = $state(workoutPlayer.stepRemainingSec)
  let totalElapsedSec = $state(workoutPlayer.totalElapsedSec)

  onMount(() => {
    if (selected && !workoutPlayer.workoutId) workoutPlayer.select(selected)
  })

  function sync(): void {
    phase = workoutPlayer.phase
    stepIndex = workoutPlayer.stepIndex
    stepRemainingSec = workoutPlayer.stepRemainingSec
    totalElapsedSec = workoutPlayer.totalElapsedSec
  }

  // The interval callback mutates state without reading it, so this never
  // becomes a reactive loop.
  $effect(() => {
    const timer = setInterval(sync, 250)
    return () => clearInterval(timer)
  })

  const workout = $derived<Workout | null>(selected ? getWorkout(selected) : null)
  const minutes = $derived(workout ? Math.round(totalDurationSec(workout) / 60) : 0)
  const exerciseCount = $derived(
    workout ? workout.steps.filter((s) => s.kind === 'exercise').length : 0,
  )
  const currentStep = $derived(workout ? workout.steps[stepIndex] : null)

  // List rows with a per-exercise counter (pauses are not numbered).
  const rows = $derived.by(() => {
    if (!workout) return []
    let n = 0
    return workout.steps.map((step, i) => ({
      i,
      step,
      number: step.kind === 'exercise' ? ++n : null,
    }))
  })

  const toggleLabel = $derived(
    phase === 'running' ? 'Pause' : phase === 'paused' ? 'Resume' : phase === 'done' ? 'Play again' : 'Play',
  )
  const toggleAria = $derived(
    phase === 'running'
      ? 'Pause workout'
      : phase === 'paused'
        ? 'Resume workout'
        : phase === 'done'
          ? 'Play workout again'
          : 'Play workout',
  )
  const isCurrent = (i: number) => phase !== 'idle' && i === stepIndex

  // Selection changes imperatively here (never via an engine-pushing $effect):
  // a remount after navigating away must not reset a running session.
  function choose(id: WorkoutId): void {
    selected = id
    workoutPlayer.select(id)
    localStorage.setItem(SELECTION_KEY, id)
  }

  function toggle(): void {
    if (phase === 'running') workoutPlayer.pause()
    else workoutPlayer.play()
    sync()
  }

  function reset(): void {
    workoutPlayer.stop()
    sync()
  }

  function chooseAnother(): void {
    workoutPlayer.stop()
    selected = null
    localStorage.removeItem(SELECTION_KEY)
  }

  function formatClock(sec: number): string {
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  }
</script>

<section class="tool" aria-label="Guided workouts">
  {#if !selected}
    <Panel title="Choose your session" hint="Two guided workouts with a spoken coach.">
      {#each WORKOUTS as w (w.id)}
        <button
          class="choice"
          aria-label={`Choose the ${w.title.toLowerCase()} workout`}
          onclick={() => choose(w.id)}
        >
          <strong>{w.title}</strong>
          <span>{w.blurb}</span>
          <span class="meta">
            About {Math.round(totalDurationSec(w) / 60)} min ·
            {w.steps.filter((s) => s.kind === 'exercise').length} exercises
          </span>
        </button>
      {/each}
    </Panel>
  {:else}
    <div class="player">
      <button class="toggle" aria-label={toggleAria} onclick={toggle}>{toggleLabel}</button>
      {#if phase !== 'idle'}
        <button onclick={reset}>Reset</button>
      {/if}
    </div>

    {#if phase !== 'idle' && currentStep}
      <div class="status">
        <span><span class="time" role="timer">{formatClock(totalElapsedSec)}</span> elapsed</span>
        <span>{currentStep.name} · {formatClock(stepRemainingSec)}</span>
      </div>
    {/if}

    {#if phase === 'done'}
      <p class="done-note" role="status">Nice work — session complete.</p>
    {/if}

    <p class="overview">
      About {minutes} minutes · {exerciseCount} exercises · spoken coaching, so keep your sound on
    </p>

    <ol class="steps">
      {#each rows as row (row.i)}
        <li
          class={row.step.kind}
          class:current={isCurrent(row.i)}
          class:past={phase !== 'idle' && row.i < stepIndex}
          aria-current={isCurrent(row.i) ? 'step' : undefined}
        >
          {#if row.step.kind === 'exercise'}
            <details open={phase === 'running' && stepIndex === row.i}>
              <summary>
                {row.number}. {row.step.name} <span class="dur">{row.step.durationSec}s</span>
              </summary>
              <p>{row.step.description}</p>
            </details>
          {:else}
            {row.step.name} · {row.step.durationSec}s
          {/if}
        </li>
      {/each}
    </ol>

    <button class="back" onclick={chooseAnother}>← Choose another workout</button>
  {/if}
</section>

<style>
  .tool {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    /* Definite width (not min(34rem, 100%)): the page shell shrink-to-fits
       around this tool, and percentages are ignored while it measures, so an
       open <details> description would otherwise widen the whole page. */
    width: 34rem;
    max-width: 100%;
    margin: 0 auto;
    text-align: left;
  }

  .choice {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
    padding: 0.8rem 1rem;
    text-align: left;
    border: 1px solid rgba(128, 128, 128, 0.3);
    border-radius: 10px;
    background: rgba(128, 128, 128, 0.07);
    color: inherit;
    cursor: pointer;
  }

  .choice:hover {
    border-color: #646cff;
  }

  .choice .meta {
    font-size: 0.8rem;
    opacity: 0.7;
  }

  .player {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .toggle {
    font-size: 1rem;
    font-weight: 600;
    padding: 0.55rem 1.6rem;
  }

  .status {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.4rem;
    font-variant-numeric: tabular-nums;
  }

  .time {
    font-weight: 600;
  }

  .done-note {
    margin: 0;
    color: #646cff;
    font-weight: 600;
  }

  .overview {
    margin: 0;
    font-size: 0.85rem;
    opacity: 0.7;
  }

  .steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .steps li {
    border-left: 3px solid transparent;
    border-radius: 4px;
    padding: 0.15rem 0.4rem 0.15rem 0.6rem;
  }

  .steps li.pause {
    font-size: 0.85rem;
    opacity: 0.7;
  }

  .steps li.past {
    opacity: 0.45;
  }

  .steps li.current {
    border-left-color: #646cff;
    background: rgba(100, 108, 255, 0.08);
  }

  summary {
    cursor: pointer;
  }

  .dur {
    font-size: 0.85rem;
    opacity: 0.7;
    margin-left: 0.3rem;
  }

  details p {
    margin: 0.3rem 0 0.2rem;
    font-size: 0.92rem;
    opacity: 0.85;
  }

  .back {
    align-self: flex-start;
  }
</style>
