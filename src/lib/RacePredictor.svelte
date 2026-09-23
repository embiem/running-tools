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
    { label: string; meters: number | null },
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

<section class="tool" aria-label="Race predictor">
  <Panel
    title="Your recent race"
    hint="What you have actually run — the fitness every number below comes from."
  >
    <div class="fields">
      <label>
        <span class="label-text">
          Race date
          <span class="hint">The models assume you are as fit today as you were then.</span>
        </span>
        <span class="label-input">
          <input type="date" bind:value={input.raceDate} aria-label="Date of your recent race" />
        </span>
      </label>

      <label>
        <span class="label-text">Distance</span>
        <span class="label-input">
          <select bind:value={input.distance} aria-label="Race distance">
            {#each distanceEntries as [id, preset] (id)}
              <option value={id}>{preset.label}</option>
            {/each}
          </select>
        </span>
      </label>

      {#if effective.distance === 'custom'}
        <label>
          <span class="label-text">Custom distance</span>
          <span class="label-input">
            <input
              type="number"
              min={LIMITS.customMeters.min}
              max={LIMITS.customMeters.max}
              step={LIMITS.customMeters.step}
              bind:value={input.customMeters}
              aria-label="Recent race distance in metres"
            />
            <span class="unit">m</span>
          </span>
        </label>
      {/if}

      <label>
        <span class="label-text">
          Finish time
          <span class="hint">mm:ss or h:mm:ss — paste 1:32:00 as it comes.</span>
        </span>
        <span class="label-input">
          <input
            type="text"
            placeholder="20:00"
            bind:value={input.time}
            onblur={tidyTime}
            aria-label="Your finish time"
          />
        </span>
      </label>

      <div class="choice" role="radiogroup" aria-label="Distance unit">
        <label>
          <input
            type="radio"
            name="unit"
            value="km"
            checked={effective.unit === 'km'}
            onchange={() => setUnit('km')}
          /> Kilometres
        </label>
        <label>
          <input
            type="radio"
            name="unit"
            value="mi"
            checked={effective.unit === 'mi'}
            onchange={() => setUnit('mi')}
          /> Miles
        </label>
      </div>
    </div>
  </Panel>

  <Panel title="Your goal" hint="The race you are planning — its pace, then its splits below.">
    <div class="fields">
      <label>
        <span class="label-text">Distance</span>
        <span class="label-input">
          <select bind:value={input.goalDistance} aria-label="Goal race distance">
            {#each distanceEntries as [id, preset] (id)}
              <option value={id}>{preset.label}</option>
            {/each}
          </select>
        </span>
      </label>

      {#if effective.goalDistance === 'custom'}
        <label>
          <span class="label-text">Custom distance</span>
          <span class="label-input">
            <input
              type="number"
              min={LIMITS.goalCustomMeters.min}
              max={LIMITS.goalCustomMeters.max}
              step={LIMITS.goalCustomMeters.step}
              bind:value={input.goalCustomMeters}
              aria-label="Goal race distance in metres"
            />
            <span class="unit">m</span>
          </span>
        </label>
      {/if}

      <div class="field">
        <label for="goal-pace">
          <span class="label-text">
            Goal pace
            <span class="hint">
              {result.goalPaceIsCustom
                ? 'Your own pace. Use the predicted one to go back to the models.'
                : 'From your recent race — edit it to plan a different effort.'}
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
            aria-label="Goal pace per {effective.unit}"
          />
          <span class="unit">/{effective.unit}</span>
          {#if result.goalPaceIsCustom}
            <button
              type="button"
              class="link"
              onclick={() => (input.goalPaceSecPerKm = null)}
              aria-label="Use the predicted goal pace"
            >↺ predicted</button>
          {/if}
        </span>
      </div>

      <div class="choice" role="radiogroup" aria-label="Split strategy">
        <label>
          <input
            type="radio"
            name="split"
            value="even"
            checked={effective.split === 'even'}
            onchange={() => (input.split = 'even')}
          /> Even splits
        </label>
        <label>
          <input
            type="radio"
            name="split"
            value="negative"
            checked={effective.split === 'negative'}
            onchange={() => (input.split = 'negative')}
          /> Negative split
        </label>
      </div>
    </div>
  </Panel>

  <button type="button" class="reset" onclick={reset}>Reset to defaults</button>

  <h2>Your race</h2>
  <dl>
    <dt>Result</dt>
    <dd>
      {formatDistance(result.raceMeters, effective.unit)} · {formatDuration(result.raceSeconds)} ·
      {formatPace(result.racePaceSecPerKm, effective.unit)}
    </dd>
    <dt>VDOT</dt>
    <dd>
      {result.vdot.toFixed(1)}
      <span class="muted">the fitness score that result implies</span>
    </dd>
    <dt>Goal</dt>
    <dd>
      {goal.label}{effective.goalDistance === 'custom'
        ? ` · ${formatDistance(result.goalMeters, effective.unit)}`
        : ''}
    </dd>
    <dt>Predicted</dt>
    <dd>
      {formatDuration(result.daniels.seconds)}
      <span class="muted">
        Daniels · Riegel {formatDuration(result.riegel.seconds)} ·
        {formatPace(result.daniels.paceSecPerKm, effective.unit)}
      </span>
    </dd>
    {#if result.goalPaceIsCustom}
      <dt>Your plan</dt>
      <dd>
        {formatDuration(result.goalSeconds)}
        <span class="muted">
          the {formatPace(result.goalPaceSecPerKm, effective.unit)} you set
        </span>
      </dd>
    {/if}
  </dl>

  <h2>Equivalent performances</h2>
  <table>
    <thead>
      <tr>
        <th scope="col">Distance</th>
        <th scope="col">Riegel</th>
        <th scope="col">Daniels</th>
        <th scope="col">Spread</th>
      </tr>
    </thead>
    <tbody>
      {#each result.equivalents as row (row.id)}
        <tr class:goal={row.id === effective.goalDistance}>
          <th scope="row">{row.label}</th>
          <td>{formatDuration(row.riegel.seconds)}</td>
          <td>{formatDuration(row.daniels.seconds)}</td>
          <td>{row.deltaPct.toFixed(1)}%</td>
        </tr>
      {/each}
    </tbody>
  </table>

  <h2>Your splits</h2>
  <p class="caption">
    {goal.label} · {formatDuration(result.goalSeconds)} ·
    {effective.split === 'negative' ? 'negative split' : 'even splits'}
    <span class="muted">
      {result.goalPaceIsCustom
        ? `at the ${formatPace(result.goalPaceSecPerKm, effective.unit)} you set`
        : 'at the Daniels prediction, the model the training paces come from'}
    </span>
  </p>
  <div class="scroll">
    <table>
      <thead>
        <tr>
          <th scope="col">Split</th>
          <th scope="col">Time</th>
          <th scope="col">Cumulative</th>
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

  <h2>Training paces</h2>
  <table>
    <thead>
      <tr>
        <th scope="col">Zone</th>
        <th scope="col">Pace</th>
        <th scope="col">Purpose</th>
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
    <summary>Where these numbers come from</summary>
    <p>
      Two independent models, both fed the same result. <strong>Riegel</strong> (<em>American Scientist</em>,
      1981) scales a performance by distance with a fatigue exponent: <em>T₂ = T₁ × (D₂/D₁)<sup>1.06</sup></em>.
      That exponent is a population average — Riegel's own fits to running records span 1.05–1.08, and later
      work argues no single power law covers every distance — so it is fixed here rather than exposed as a
      dial.
    </p>
    <p>
      <strong>Daniels &amp; Gilbert's "Oxygen Power"</strong> regressions take the other route: they turn the
      result into a fitness score, VDOT, by dividing the oxygen cost of the race pace by the fraction of VO₂max
      sustainable for that long, then solve for the time at another distance. VDOT is also the number behind the
      training paces below. Across 5 km to the marathon the two models agree within about 1% for a typical
      result; the spread column is where they disagree, and a spread of more than a few percent is the model
      saying it is extrapolating.
    </p>
    <p>
      Training paces are Daniels' intensity bands — easy 59–74% of VDOT, marathon 75–84%, threshold 83–88%,
      interval 97–100%, repetition 105–110% — with the pace at each edge computed by inverting the VO₂
      regression. The printed pace tables in the book sit at the hard end of those bands for
      marathon/threshold/interval/repetition, and print a narrower easy range (about 65–74%); the band shown
      here is the stated intensity range, so its easy end is genuinely easy.
    </p>
    <p>
      The splits are arithmetic on the plan's pace, not physiology. Even splits divide the plan's time by the
      distance. A negative split ramps the pace linearly so the second half averages 1.5% faster than the first —
      a plan you can run, rather than a step change at halfway. Splits are one unit each, and the final row
      absorbs the leftover metres, which is why it can read 1.1 km.
    </p>
    <p>
      The goal pace starts as the models' prediction for that distance and is yours to edit — a slower plan pace
      is how you build in a margin. Editing it moves the goal time and every split with it; the training paces
      above do not move, because they describe what your race result makes you fit for rather than what you
      intend to run.
    </p>
    <p>
      What neither model knows: the weather, the course, the altitude, your fuelling, and whether you have
      trained for that distance at all. Treat a prediction as a target to aim at, and read the flags above as
      the places where it is being stretched.
    </p>
  </details>
</section>

<style>
  .tool {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    width: min(34rem, 100%);
    margin: 0 auto;
    text-align: left;
  }

  h2 {
    margin: 0.5rem 0 -0.5rem;
    font-size: 1rem;
    font-weight: 600;
    opacity: 0.85;
  }

  .fields {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .fields label,
  .field {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .field label {
    flex: 1 1 auto;
  }

  .label-input {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex: none;
    margin-left: auto;
  }

  input[type='number'],
  input[type='text'],
  input[type='date'],
  select {
    padding: 0.3rem 0.5rem;
    border: 1px solid rgba(128, 128, 128, 0.4);
    border-radius: 6px;
    background: rgba(128, 128, 128, 0.12);
    color: inherit;
    font: inherit;
  }

  input[type='number'],
  input[type='text'],
  input[type='date'] {
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  input[type='number'],
  input[type='text'] {
    width: 6rem;
  }

  input[type='radio'] {
    accent-color: #646cff;
  }

  .unit,
  .muted {
    color: #888;
    font-size: 0.85rem;
  }

  .hint {
    display: block;
    font-size: 0.8rem;
    opacity: 0.7;
  }

  .choice {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.9rem;
  }

  .choice label {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.5rem;
  }

  .reset {
    align-self: flex-start;
    font-size: 0.85rem;
    padding: 0.4em 0.9em;
  }

  .link {
    padding: 0.2em 0.5em;
    font-size: 0.75rem;
    font-family: inherit;
    background: none;
    border: 1px solid rgba(128, 128, 128, 0.4);
    border-radius: 6px;
    color: #646cff;
    cursor: pointer;
    white-space: nowrap;
  }

  .link:hover {
    border-color: #646cff;
  }

  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.35rem 1rem;
    margin: 0;
    text-align: left;
  }

  dt {
    opacity: 0.75;
  }

  dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
  }

  dd .muted {
    display: block;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
  }

  .caption {
    margin: -0.5rem 0 0;
    font-size: 0.85rem;
  }

  .caption .muted {
    display: block;
  }

  th,
  td {
    padding: 0.3rem 0.5rem;
    text-align: left;
    border-bottom: 1px solid rgba(128, 128, 128, 0.2);
  }

  tbody th {
    font-weight: 400;
    opacity: 0.85;
    white-space: nowrap;
  }

  tbody th .muted {
    display: block;
  }

  th:last-child,
  td:last-child {
    text-align: right;
  }

  tr.goal th,
  tr.goal td {
    font-weight: 600;
    color: #646cff;
  }

  tr.finish th,
  tr.finish td {
    font-weight: 600;
  }

  .scroll {
    max-height: 22rem;
    overflow-y: auto;
  }

  .purpose {
    font-size: 0.8rem;
    color: #888;
  }

  .flags {
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 0.85rem;
  }

  .flag {
    padding: 0.5rem 0.75rem;
    border-left: 3px solid #888;
    background: rgba(128, 128, 128, 0.12);
    margin-bottom: 0.5rem;
    border-radius: 0 6px 6px 0;
  }

  .flag.warn {
    border-left-color: #f85149;
  }

  .info {
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
