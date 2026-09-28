<script lang="ts">
  import Panel from './Panel.svelte'
  import {
    DISTANCES,
    LIMITS,
    formatDistance,
    formatDuration,
    formatPace,
    formatPaceClock,
    formatPaceRange,
    isCompleteRaceInput,
    normalizeRaceInput,
    parsePace,
    predictRace,
  } from './racePredictor'
  import type { DistanceId, RaceInput, Unit } from './racePredictor'
  import type { Message } from './i18n.svelte'
  import { formatFixed, formatPercent } from './format'
  import { m } from '../paraglide/messages.js'

  const STORAGE_KEY = 'racePredictor.input'

  function loadInput(): RaceInput {
    try {
      return normalizeRaceInput(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'))
    } catch {
      return normalizeRaceInput(null)
    }
  }

  const distanceEntries = Object.entries(DISTANCES) as [
    DistanceId,
    { label: Message; meters: number | null },
  ][]

  let input = $state<RaceInput>(loadInput())
  // One validated snapshot feeds everything: the fitness score, both models, the
  // training paces and the splits all read the same numbers, so a half-typed
  // time can never make the page read NaN.
  const effective = $derived(normalizeRaceInput(input))
  const result = $derived(predictRace(effective))
  const goal = $derived(DISTANCES[effective.goalDistance])

  // The goal pace field shows what the plan is actually run at, in the display
  // unit. It is text rather than a bound number so a half-typed pace never
  // reaches the plan: the field commits only what parses, and re-syncs from the
  // plan whenever it is not being edited (so it follows a unit change, a new
  // prediction, or the reset to the predicted pace).
  let paceText = $state('')
  let paceFocused = $state(false)

  $effect(() => {
    if (paceFocused) return
    paceText = formatPaceClock(result.goalPaceSecPerKm, effective.unit)
  })

  // Persist every complete change; the try/catch covers private mode and quota
  // errors, and skipping an unparseable time keeps the last complete value
  // stored while the field is mid-edit.
  $effect(() => {
    if (!isCompleteRaceInput(input)) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeRaceInput(input)))
    } catch {
      /* storage unavailable — the tool still works for this session */
    }
  })

  function reset(): void {
    input = normalizeRaceInput(null)
  }

  function setUnit(unit: Unit): void {
    input.unit = unit
  }

  // Rewrite what was typed into the canonical form on the way out: "92:00"
  // becomes "1:32:00", and an unparseable entry falls back to the default rather
  // than sitting there disagreeing with the figures below it.
  function tidyTime(): void {
    input.time = effective.time
  }
</script>

<section class="tool split" aria-label={m.race_label()}>
  <div class="inputs">
    <Panel title={m.race_recent_title()} hint={m.race_recent_hint()}>
      <div class="fields">
        <label>
          <span class="label-text">
            {m.race_date()}
            <span class="hint">{m.race_date_hint()}</span>
          </span>
          <span class="label-input">
            <input type="date" bind:value={input.raceDate} aria-label={m.race_date_label()} />
          </span>
        </label>

        <label>
          <span class="label-text">{m.common_distance()}</span>
          <span class="label-input">
            <select bind:value={input.distance} aria-label={m.common_race_distance()}>
              {#each distanceEntries as [id, preset] (id)}
                <option value={id}>{preset.label()}</option>
              {/each}
            </select>
          </span>
        </label>

        {#if effective.distance === 'custom'}
          <label>
            <span class="label-text">{m.distance_custom()}</span>
            <span class="label-input">
              <input
                type="number"
                min={LIMITS.customMeters.min}
                max={LIMITS.customMeters.max}
                step={LIMITS.customMeters.step}
                bind:value={input.customMeters}
                aria-label={m.race_custom_label()}
              />
              <span class="unit">m</span>
            </span>
          </label>
        {/if}

        <label>
          <span class="label-text">
            {m.race_time()}
            <span class="hint">{m.race_time_hint()}</span>
          </span>
          <span class="label-input">
            <input
              type="text"
              placeholder="20:00"
              bind:value={input.time}
              onblur={tidyTime}
              aria-label={m.race_time_label()}
            />
          </span>
        </label>

        <div class="segmented" role="radiogroup" aria-label={m.common_distance_unit()}>
          <label>
            <input
              type="radio"
              name="unit"
              value="km"
              checked={effective.unit === 'km'}
              onchange={() => setUnit('km')}
            /> {m.common_kilometres()}
          </label>
          <label>
            <input
              type="radio"
              name="unit"
              value="mi"
              checked={effective.unit === 'mi'}
              onchange={() => setUnit('mi')}
            /> {m.common_miles()}
          </label>
        </div>
      </div>
    </Panel>

    <Panel title={m.race_goal_title()} hint={m.race_goal_hint()}>
      <div class="fields">
        <label>
          <span class="label-text">{m.common_distance()}</span>
          <span class="label-input">
            <select bind:value={input.goalDistance} aria-label={m.race_goal_distance_label()}>
              {#each distanceEntries as [id, preset] (id)}
                <option value={id}>{preset.label()}</option>
              {/each}
            </select>
          </span>
        </label>

        {#if effective.goalDistance === 'custom'}
          <label>
            <span class="label-text">{m.distance_custom()}</span>
            <span class="label-input">
              <input
                type="number"
                min={LIMITS.goalCustomMeters.min}
                max={LIMITS.goalCustomMeters.max}
                step={LIMITS.goalCustomMeters.step}
                bind:value={input.goalCustomMeters}
                aria-label={m.race_goal_custom_label()}
              />
              <span class="unit">m</span>
            </span>
          </label>
        {/if}

        <div class="field">
          <label for="goal-pace">
            <span class="label-text">
              {m.race_goal_pace()}
              <span class="hint">
                {result.goalPaceIsCustom ? m.race_goal_pace_hint_custom() : m.race_goal_pace_hint()}
              </span>
            </span>
          </label>
          <span class="label-input">
            <input
              id="goal-pace"
              type="text"
              value={paceText}
              oninput={(event) => {
                paceText = event.currentTarget.value
                const parsed = parsePace(paceText, effective.unit)
                if (parsed !== null) input.goalPaceSecPerKm = parsed
              }}
              onfocus={() => (paceFocused = true)}
              onblur={() => (paceFocused = false)}
              aria-label={m.race_goal_pace_label({ unit: effective.unit })}
            />
            <span class="unit">/{effective.unit}</span>
            {#if result.goalPaceIsCustom}
              <button
                type="button"
                class="link"
                onclick={() => (input.goalPaceSecPerKm = null)}
                aria-label={m.race_goal_pace_reset_label()}
              >{m.race_goal_pace_reset()}</button>
            {/if}
          </span>
        </div>

        <div class="segmented" role="radiogroup" aria-label={m.race_split_group()}>
          <label>
            <input
              type="radio"
              name="split"
              value="even"
              checked={effective.split === 'even'}
              onchange={() => (input.split = 'even')}
            /> {m.race_split_even()}
          </label>
          <label>
            <input
              type="radio"
              name="split"
              value="negative"
              checked={effective.split === 'negative'}
              onchange={() => (input.split = 'negative')}
            /> {m.race_split_negative()}
          </label>
        </div>
      </div>
    </Panel>

    <button type="button" class="ghost reset" onclick={reset}>{m.common_reset()}</button>
  </div>

  <div class="results">
    <h2>{m.race_result_title()}</h2>
    <div class="stats">
      <div class="stat hero">
        <span class="eyebrow">{goal.label()} · {result.goalPaceIsCustom ? m.race_your_plan() : m.race_predicted_tag()}</span>
        <span class="stat-value">{formatDuration(result.goalSeconds)}</span>
        <span class="stat-sub">{formatPace(result.goalPaceSecPerKm, effective.unit)}</span>
      </div>
      <div class="stat">
        <span class="eyebrow">VDOT</span>
        <span class="stat-value">{formatFixed(result.vdot, 1)}</span>
        <span class="stat-sub">{m.race_vdot_sub()}</span>
      </div>
  </div>
  <dl>
    <dt>{m.race_result()}</dt>
    <dd>
      {formatDistance(result.raceMeters, effective.unit)} · {formatDuration(result.raceSeconds)} ·
      {formatPace(result.racePaceSecPerKm, effective.unit)}
    </dd>
    <dt>{m.race_goal()}</dt>
    <dd>
      {goal.label()}{effective.goalDistance === 'custom'
        ? ` · ${formatDistance(result.goalMeters, effective.unit)}`
        : ''}
    </dd>
    <dt>{m.race_predicted()}</dt>
    <dd>
      {formatDuration(result.daniels.seconds)}
      <span class="muted">
        Daniels · Riegel {formatDuration(result.riegel.seconds)} ·
        {formatPace(result.daniels.paceSecPerKm, effective.unit)}
      </span>
    </dd>
  </dl>

  <h2>{m.race_equivalents_title()}</h2>
  <table>
    <thead>
      <tr>
        <th scope="col">{m.common_distance()}</th>
        <th scope="col">Riegel</th>
        <th scope="col">Daniels</th>
        <th scope="col">{m.race_spread()}</th>
      </tr>
    </thead>
    <tbody>
      {#each result.equivalents as row (row.id)}
        <tr class:highlight={row.id === effective.goalDistance}>
          <th scope="row">{row.label}</th>
          <td>{formatDuration(row.riegel.seconds)}</td>
          <td>{formatDuration(row.daniels.seconds)}</td>
          <td>{formatPercent(row.deltaPct, 1)}</td>
        </tr>
      {/each}
    </tbody>
  </table>

  <h2>{m.race_splits_title()}</h2>
  <p class="caption">
    {goal.label()} · {formatDuration(result.goalSeconds)} ·
    {effective.split === 'negative' ? m.race_split_negative_caption() : m.race_split_even_caption()}
    <span class="muted">
      {result.goalPaceIsCustom
        ? m.race_splits_at_your_pace({ pace: formatPace(result.goalPaceSecPerKm, effective.unit) })
        : m.race_splits_at_prediction()}
    </span>
  </p>
  <div class="scroll">
    <table>
      <thead>
        <tr>
          <th scope="col">{m.race_split()}</th>
          <th scope="col">{m.race_time_column()}</th>
          <th scope="col">{m.race_cumulative()}</th>
        </tr>
      </thead>
      <tbody>
        {#each result.splits as split (split.index)}
          <tr class:finish={split.index === result.splits.length}>
            <th scope="row">{formatDistance(split.cumulativeMeters, effective.unit)}</th>
            <td>{formatDuration(split.splitSec)}</td>
            <td>{formatDuration(split.cumulativeSec)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <h2>{m.race_paces_title()}</h2>
  <table>
    <thead>
      <tr>
        <th scope="col">{m.race_zone()}</th>
        <th scope="col">{m.race_pace()}</th>
        <th scope="col">{m.race_purpose()}</th>
      </tr>
    </thead>
    <tbody>
      {#each result.trainingPaces as zone (zone.id)}
        <tr>
          <th scope="row">
            {zone.label}
            <span class="muted">{zone.pctBand}</span>
          </th>
          <td>{formatPaceRange(zone.slowSecPerKm, zone.fastSecPerKm, effective.unit)}</td>
          <td class="purpose">{zone.note}</td>
        </tr>
      {/each}
    </tbody>
  </table>

  {#if result.flags.length}
    <ul class="flags">
      {#each result.flags as flag, i (i)}
        <li class="flag {flag.level}">{flag.message}</li>
      {/each}
    </ul>
  {/if}

  <details class="info">
    <summary>{m.common_sources()}</summary>
    <!-- Messages are the app's own copy, not user input: safe as HTML. -->
    <p>{@html m.race_info_riegel()}</p>
    <p>{@html m.race_info_daniels()}</p>
    <p>{m.race_info_paces()}</p>
    <p>{m.race_info_splits()}</p>
    <p>{m.race_info_goal_pace()}</p>
    <p>{m.race_info_limits()}</p>
  </details>
  </div>
</section>

<style>
  .reset {
    align-self: flex-start;
  }

  .link {
    padding: 0.25em 0.6em;
    font-size: 0.75rem;
    background: none;
    color: var(--accent-text);
    white-space: nowrap;
  }

  .caption {
    margin: -0.25rem 0 0;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .caption .muted {
    display: block;
  }

  tr.finish th,
  tr.finish td {
    font-weight: 700;
  }

  .scroll {
    max-height: 24rem;
    overflow-y: auto;
    padding-right: 0.25rem;
  }

  /* Sticky header so a long split table keeps its column labels in view. */
  .scroll thead th {
    position: sticky;
    top: 0;
    background: var(--bg);
  }

  .purpose {
    font-size: 0.8rem;
    color: var(--muted);
    font-weight: 400;
  }
</style>
