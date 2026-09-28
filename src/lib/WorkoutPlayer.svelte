<script lang="ts">
  import { onMount } from 'svelte'
  import Panel from './Panel.svelte'
  import { WORKOUTS, getWorkout, totalDurationSec } from './workouts'
  import type { Workout, WorkoutId } from './workouts'
  import { workoutPlayer } from './workoutPlayer'
  import type { PlayerPhase } from './workoutPlayer'
  import type { Message } from './i18n.svelte'
  import { m } from '../paraglide/messages.js'

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
  const totalSec = $derived(workout ? totalDurationSec(workout) : 0)
  const minutes = $derived(Math.round(totalSec / 60))
  const progressPct = $derived(
    phase === 'done' ? 100 : totalSec ? Math.min(100, (totalElapsedSec / totalSec) * 100) : 0,
  )
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
    phase === 'running'
      ? m.workouts_pause()
      : phase === 'paused'
        ? m.workouts_resume()
        : phase === 'done'
          ? m.workouts_play_again()
          : m.workouts_play(),
  )
  const toggleAria = $derived(
    phase === 'running'
      ? m.workouts_pause_label()
      : phase === 'paused'
        ? m.workouts_resume_label()
        : phase === 'done'
          ? m.workouts_play_again_label()
          : m.workouts_play_label(),
  )
  const CHOOSE_LABEL: Record<WorkoutId, Message> = {
    'warm-up': m.workouts_choose_warm_up,
    stretch: m.workouts_choose_stretch,
  }
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

<section class="tool narrow" aria-label={m.workouts_label()}>
  {#if !selected}
    <Panel title={m.workouts_choose_title()} hint={m.workouts_choose_hint()}>
      {#each WORKOUTS as w (w.id)}
        <button class="option" aria-label={CHOOSE_LABEL[w.id]()} onclick={() => choose(w.id)}>
          <span class="option-text">
            <strong>{w.title()}</strong>
            <span>{w.blurb()}</span>
            <span class="meta">
              {m.workouts_option_meta({
                minutes: Math.round(totalDurationSec(w) / 60),
                exercises: w.steps.filter((s) => s.kind === 'exercise').length,
              })}
            </span>
          </span>
          <span class="option-go" aria-hidden="true">▶</span>
        </button>
      {/each}
    </Panel>
  {:else}
    <div class="deck" class:live={phase === 'running'}>
      <p class="eyebrow">{workout?.title() ?? ''}</p>
      <p class="now">
        {#if phase === 'done'}
          {m.workouts_complete()}
        {:else if phase !== 'idle' && currentStep}
          {currentStep.name()}
        {:else}
          {m.workouts_ready()}
        {/if}
      </p>

      <div class="clocks">
        <div>
          <span class="clock display" role="timer">{formatClock(totalElapsedSec)}</span>
          <span class="clock-label">{m.workouts_elapsed()}</span>
        </div>
        {#if phase !== 'idle' && phase !== 'done' && currentStep}
          <div class="right">
            <span class="clock display">{formatClock(stepRemainingSec)}</span>
            <span class="clock-label">{m.workouts_this_step()}</span>
          </div>
        {/if}
      </div>

      <div
        class="progress"
        role="progressbar"
        aria-label={m.workouts_progress()}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Math.round(progressPct)}
      >
        <span style:width="{progressPct}%"></span>
      </div>

      <div class="player">
        <button class="toggle" class:primary={phase !== 'running'} aria-label={toggleAria} onclick={toggle}>
          {toggleLabel}
        </button>
        {#if phase !== 'idle'}
          <button class="ghost" onclick={reset}>{m.workouts_reset()}</button>
        {/if}
      </div>

      {#if phase === 'done'}
        <p class="done-note" role="status">{m.workouts_done_note()}</p>
      {/if}
    </div>

    <p class="overview">
      {m.workouts_overview({ minutes, exercises: exerciseCount })}
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
                <span class="num">{row.number}</span>
                <span class="name">{row.step.name()}</span>
                <span class="dur">{m.unit_seconds({ seconds: row.step.durationSec })}</span>
              </summary>
              <p>{row.step.description()}</p>
            </details>
          {:else}
            {row.step.name()} · {m.unit_seconds({ seconds: row.step.durationSec })}
          {/if}
        </li>
      {/each}
    </ol>

    <button class="ghost back" onclick={chooseAnother}>{m.workouts_choose_another()}</button>
  {/if}
</section>

<style>
  .option {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
    padding: 1rem 1.1rem;
    text-align: left;
    font-weight: 400;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
  }

  .option:hover {
    border-color: var(--accent-text);
  }

  .option:active {
    transform: none;
  }

  .option-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .option strong {
    font-size: 1.05rem;
  }

  .option .meta {
    font-size: 0.8rem;
    color: var(--muted);
  }

  .option-go {
    flex: none;
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    background: var(--accent);
    color: var(--on-accent);
    font-size: 0.85rem;
  }

  .deck {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.4rem 1.25rem 1.25rem;
    border-radius: 28px;
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
    transition: border-color 0.3s;
  }

  .deck.live {
    border-color: var(--accent-text);
  }

  .now {
    margin: -0.5rem 0 0;
    font-size: 1.35rem;
    font-weight: 700;
  }

  .clocks {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1rem;
  }

  .clocks > div {
    display: flex;
    flex-direction: column;
  }

  .clocks .right {
    align-items: flex-end;
  }

  .clock {
    font-size: clamp(3.5rem, 16vw, 5rem);
  }

  .right .clock {
    color: var(--accent-text);
  }

  .clock-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--muted);
  }

  .progress {
    height: 6px;
    border-radius: 999px;
    background: var(--surface-2);
    overflow: hidden;
  }

  .progress span {
    display: block;
    height: 100%;
    background: var(--accent);
    transition: width 0.25s linear;
  }

  .player {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .toggle {
    flex: 1;
    padding: 0.95rem;
    font-size: 1.1rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .done-note {
    margin: 0;
    color: var(--accent-text);
    font-weight: 600;
  }

  .overview {
    margin: 0;
    font-size: 0.85rem;
    color: var(--muted);
  }

  .steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .steps li {
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--surface);
    padding: 0.7rem 0.9rem;
  }

  .steps li.pause {
    background: none;
    border-style: dashed;
    padding: 0.4rem 0.9rem;
    font-size: 0.82rem;
    color: var(--muted);
  }

  .steps li.past {
    opacity: 0.4;
  }

  .steps li.current {
    border-color: var(--accent-text);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }

  summary {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    cursor: pointer;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  .num {
    flex: none;
    display: grid;
    place-items: center;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 50%;
    background: var(--surface-2);
    font-size: 0.75rem;
    font-weight: 800;
  }

  .current .num {
    background: var(--accent);
    color: var(--on-accent);
  }

  .name {
    flex: 1;
    font-weight: 600;
  }

  .dur {
    font-size: 0.85rem;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  details p {
    margin: 0.6rem 0 0.1rem 2.3rem;
    font-size: 0.92rem;
    color: var(--muted);
  }

  .back {
    align-self: flex-start;
  }
</style>
