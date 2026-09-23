<script lang="ts">
  import Panel from './Panel.svelte'
  import {
    DISTANCES,
    LIMITS,
    SESSION_LABELS,
    TAPER_WEEKS_OPTIONS,
    convertDistance,
    formatDistance,
    isCompleteTaperInput,
    normalizeTaperInput,
    predictTaper,
    todayISO,
  } from './taperPlanner'
  import type { DistanceId, TaperInput, TaperWeek, Unit } from './taperPlanner'

  const STORAGE_KEY = 'taperPlanner.input'

  function loadInput(): TaperInput {
    try {
      return normalizeTaperInput(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'))
    } catch {
      return normalizeTaperInput(null)
    }
  }

  const distanceEntries = Object.entries(DISTANCES) as [
    DistanceId,
    { label: string; meters: number | null },
  ][]

  const today = todayISO()
  const dayFormat = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const shortFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })

  // Dates stay as YYYY-MM-DD in the engine; only the display goes through the
  // browser's locale, and it is built from date parts so no UTC shift creeps in.
  function toDate(iso: string): Date {
    const [year, month, day] = iso.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const formatDay = (iso: string) => dayFormat.format(toDate(iso))
  const formatRange = (from: string, to: string) =>
    `${shortFormat.format(toDate(from))} – ${shortFormat.format(toDate(to))}`
  const weekMeta = (week: TaperWeek): string => {
    const volume =
      week.raceMeters > 0
        ? `${fmt(week.trainingMeters)} training + ${fmt(week.raceMeters)} race`
        : `${fmt(week.trainingMeters)} training`
    return [formatRange(week.startDate, week.endDate), volume, `${week.pctOfNormal}% of normal`].join(
      ' · ',
    )
  }

  let input = $state<TaperInput>(loadInput())
  // One validated snapshot feeds everything, so an emptied field can never make
  // the schedule read NaN.
  const effective = $derived(normalizeTaperInput(input))
  const result = $derived(predictTaper(effective))
  const distance = $derived(DISTANCES[effective.distance])
  const weeklyBounds = $derived(
    effective.unit === 'km' ? LIMITS.weeklyDistanceKm : LIMITS.weeklyDistanceMi,
  )
  const fmt = (meters: number) => formatDistance(meters, effective.unit)

  // Persist every complete change; the try/catch covers private mode and quota
  // errors, and skipping incomplete input keeps the last complete value stored
  // while a field is briefly empty mid-edit.
  $effect(() => {
    if (!isCompleteTaperInput(input)) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeTaperInput(input)))
    } catch {
      /* storage unavailable — the tool still works for this session */
    }
  })

  function reset(): void {
    input = normalizeTaperInput(null)
  }

  // Switching units converts the volume you already typed rather than silently
  // reinterpreting it: 70 km becomes 43.5 mi, not 70 mi.
  function setUnit(unit: Unit): void {
    if (unit === input.unit) return
    input.weeklyDistance = Math.round(convertDistance(input.weeklyDistance, input.unit, unit) * 10) / 10
    input.unit = unit
  }
</script>

<section class="tool" aria-label="Taper planner">
  <Panel
    title="Your race"
    hint="The date and distance you are tapering for — the plan counts back from race day."
  >
    <div class="fields">
      <label>
        <span class="label-text">Race date</span>
        <span class="label-input">
          <input type="date" bind:value={input.raceDate} aria-label="Race date" />
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
              aria-label="Custom race distance in metres"
            />
            <span class="unit">m</span>
          </span>
        </label>
      {/if}

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

  <Panel
    title="Your training"
    hint="A normal week and how you split it — the taper cuts this volume, not your run count."
  >
    <div class="fields">
      <label>
        <span class="label-text">
          Normal training week
          <span class="hint">Your average weekly distance in the weeks before the taper.</span>
        </span>
        <span class="label-input">
          <input
            type="number"
            min={weeklyBounds.min}
            max={weeklyBounds.max}
            step={weeklyBounds.step}
            bind:value={input.weeklyDistance}
            aria-label="Normal weekly distance"
          />
          <span class="unit">{effective.unit}</span>
        </span>
      </label>

      <label>
        <span class="label-text">
          Runs per week
          <span class="hint">Unchanged by the taper — the runs get shorter, not fewer.</span>
        </span>
        <span class="label-input">
          <input
            type="number"
            min={LIMITS.runsPerWeek.min}
            max={LIMITS.runsPerWeek.max}
            step={LIMITS.runsPerWeek.step}
            bind:value={input.runsPerWeek}
            aria-label="Runs per week"
          />
        </span>
      </label>

      <div class="choice" role="radiogroup" aria-label="Taper length">
        {#each TAPER_WEEKS_OPTIONS as weeks (weeks)}
          <label>
            <input type="radio" name="taperWeeks" value={weeks} bind:group={input.taperWeeks} />
            {weeks} weeks
          </label>
        {/each}
      </div>
      <p class="preset-hint">
        {result.weeks.map((week) => `${week.pctOfNormal}%`).join(' · ')} of your normal week
      </p>
    </div>
  </Panel>

  <button type="button" class="reset" onclick={reset}>Reset to defaults</button>

  <h2>Taper window</h2>
  <dl>
    <dt>Race</dt>
    <dd>{distance.label} · {fmt(result.raceMeters)} · {formatDay(result.raceDate)}</dd>
    <dt>Taper starts</dt>
    <dd>
      {formatDay(result.taperStartDate)}
      <span class="muted">({result.taperDays} days before the race)</span>
    </dd>
    <dt>Normal week</dt>
    <dd>{fmt(result.normalWeeklyMeters)}</dd>
    <dt>Volume cut</dt>
    <dd>
      {result.totalReductionPct}% <span class="muted">over the taper · optimum 41–60%</span>
    </dd>
  </dl>

  <h2>Week by week</h2>
  {#each result.weeks as week (week.index)}
    <table>
      <caption>
        <span class="week-title">{week.label}</span>
        <span class="week-meta">{weekMeta(week)}</span>
      </caption>
      <thead>
        <tr>
          <th scope="col">Day</th>
          <th scope="col">Session</th>
          <th scope="col">Distance</th>
        </tr>
      </thead>
      <tbody>
        {#each week.days as day (day.date)}
          <tr
            class:past={day.date < today}
            class:today={day.date === today}
            class:race={day.kind === 'race'}
          >
            <th scope="row">{formatDay(day.date)}</th>
            <td>{SESSION_LABELS[day.kind]}</td>
            <td>{day.kind === 'rest' ? '—' : fmt(day.meters)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/each}

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
      A taper is a progressive, nonlinear cut in training load: keep the intensity, cut the volume,
      and cut it by a lot. Mujika &amp; Padilla (<em>Med Sci Sports Exerc</em> 2003;35:1182–1187)
      describe it as maintaining training intensity, reducing training volume by up to 60–90% and
      trimming frequency by no more than 20%, over anything from 4 to more than 28 days, for a typical
      performance gain of about 3% (range 0.5–6.0%). The meta-analysis by Bosquet et al.
      (<em>Med Sci Sports Exerc</em> 2007;39:1358–1365) narrows the optimum: a two-week taper in which
      training volume falls <em>exponentially</em> by 41–60%, with intensity and frequency unchanged.
    </p>
    <p>
      This planner decays your weekly training volume geometrically so that the volume over the whole
      taper window lands 50% below the same number of normal weeks — the middle of that 41–60% band —
      and reports the reduction it actually schedules, because the day layout can round it either way.
      Race day is not part of the training volume: race week is a short training week <em>plus</em> the
      race, which is why its total load can still look large.
    </p>
    <p>
      Session types are convention, not measurement. The papers prescribe maintained intensity and
      frequency, so the plan keeps your number of runs, one long run per week until race week, and one
      short race-pace sharpener per week — with every run scaled down with its week. The day-before
      shakeout with strides and the rest day two days out are running practice rather than a published
      protocol, and the evidence for priming with a short session the day before is small and variable.
    </p>
    <p>
      For runners specifically, the largest data set available agrees with the shape and the length.
      Across 158,117 recreational marathoners (Smyth &amp; Lawlor, <em>Front Sports Act Living</em>
      2021;3:735220), tapers that cut volume every week out-performed tapers that did not, longer tapers
      beat shorter ones up to three weeks, and a strict three-week taper was worth a median 5 min 32 s
      (2.6%) against a minimal one. Those tapers were gentler than the meta-analysis optimum — roughly
      30–40% off the normal week, with race week holding 35–50% of it — and this planner targets 33%
      (three weeks) or 38% (two weeks) in race week. Bosquet's pooled studies were mostly swimmers and
      cyclists (249 swimmers, 80 cyclists, 110 runners), so treat the volume numbers as a target and
      keep the intensity the papers insist on.
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

  .fields label {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .label-input {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex: none;
    margin-left: auto;
  }

  input[type='number'],
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
  input[type='date'] {
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  input[type='number'] {
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

  .preset-hint {
    margin: -0.5rem 0 0;
    font-size: 0.85rem;
    text-align: center;
    color: #888;
  }

  .reset {
    align-self: flex-start;
    font-size: 0.85rem;
    padding: 0.4em 0.9em;
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

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
  }

  caption {
    padding: 0.4rem 0 0.3rem;
    text-align: left;
  }

  .week-title {
    display: block;
    font-weight: 600;
  }

  .week-meta {
    display: block;
    font-size: 0.8rem;
    color: #888;
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

  th:last-child,
  td:last-child {
    text-align: right;
  }

  tr.past {
    opacity: 0.45;
  }

  tr.today {
    background: rgba(100, 108, 255, 0.12);
  }

  tr.race th,
  tr.race td {
    font-weight: 600;
    color: #646cff;
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
