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
  import type { Message } from './i18n.svelte'
  import { dateLocale, formatPercent } from './format'
  import { m } from '../paraglide/messages.js'

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
    { label: Message; meters: number | null },
  ][]

  const today = todayISO()
  const dayFormat = $derived(
    new Intl.DateTimeFormat(dateLocale(), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
  )
  const shortFormat = $derived(new Intl.DateTimeFormat(dateLocale(), { day: 'numeric', month: 'short' }))

  // Dates stay as YYYY-MM-DD in the engine; only the display goes through the
  // app's language (in the browser's regional variant of it, see dateLocale),
  // and it is built from date parts so no UTC shift creeps in.
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
        ? m.taper_week_volume_race({ training: fmt(week.trainingMeters), race: fmt(week.raceMeters) })
        : m.taper_week_volume({ training: fmt(week.trainingMeters) })
    const share = m.taper_week_share({ percent: formatPercent(week.pctOfNormal) })
    return [formatRange(week.startDate, week.endDate), volume, share].join(' · ')
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

<section class="tool split" aria-label={m.taper_label()}>
  <div class="inputs">
    <Panel title={m.taper_race_title()} hint={m.taper_race_hint()}>
      <div class="fields">
        <label>
          <span class="label-text">{m.taper_race_date()}</span>
          <span class="label-input">
            <input type="date" bind:value={input.raceDate} aria-label={m.taper_race_date()} />
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
                aria-label={m.taper_custom_label()}
              />
              <span class="unit">m</span>
            </span>
          </label>
        {/if}

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

    <Panel title={m.taper_training_title()} hint={m.taper_training_hint()}>
      <div class="fields">
        <label>
          <span class="label-text">
            {m.taper_normal_week()}
            <span class="hint">{m.taper_normal_week_hint()}</span>
          </span>
          <span class="label-input">
            <input
              type="number"
              min={weeklyBounds.min}
              max={weeklyBounds.max}
              step={weeklyBounds.step}
              bind:value={input.weeklyDistance}
              aria-label={m.taper_normal_week_label()}
            />
            <span class="unit">{effective.unit}</span>
          </span>
        </label>

        <label>
          <span class="label-text">
            {m.taper_runs()}
            <span class="hint">{m.taper_runs_hint()}</span>
          </span>
          <span class="label-input">
            <input
              type="number"
              min={LIMITS.runsPerWeek.min}
              max={LIMITS.runsPerWeek.max}
              step={LIMITS.runsPerWeek.step}
              bind:value={input.runsPerWeek}
              aria-label={m.taper_runs()}
            />
          </span>
        </label>

        <div class="segmented" role="radiogroup" aria-label={m.taper_length()}>
          {#each TAPER_WEEKS_OPTIONS as weeks (weeks)}
            <label>
              <input type="radio" name="taperWeeks" value={weeks} bind:group={input.taperWeeks} />
              {m.taper_weeks({ weeks })}
            </label>
          {/each}
        </div>
        <p class="preset-hint">
          {m.taper_week_shares({
            shares: result.weeks.map((week) => formatPercent(week.pctOfNormal)).join(' · '),
          })}
        </p>
      </div>
    </Panel>

    <button type="button" class="ghost reset" onclick={reset}>{m.common_reset()}</button>
  </div>

  <div class="results">
    <h2>{m.taper_window_title()}</h2>
    <div class="stats">
      <div class="stat hero">
        <span class="eyebrow">{m.taper_starts()}</span>
        <span class="stat-value">{formatDay(result.taperStartDate)}</span>
        <span class="stat-sub">{m.taper_days_before({ days: result.taperDays })}</span>
      </div>
      <div class="stat">
        <span class="eyebrow">{m.taper_volume_cut()}</span>
        <span class="stat-value">{result.totalReductionPct}<small>%</small></span>
        <span class="stat-sub">{m.taper_volume_cut_sub()}</span>
      </div>
  </div>
  <dl>
    <dt>{m.taper_race()}</dt>
    <dd>{distance.label()} · {fmt(result.raceMeters)} · {formatDay(result.raceDate)}</dd>
    <dt>{m.taper_normal_week_short()}</dt>
    <dd>{fmt(result.normalWeeklyMeters)}</dd>
  </dl>

  <h2>{m.taper_weeks_title()}</h2>
  {#each result.weeks as week (week.index)}
    <table>
      <caption>
        <span class="week-title">{week.label}</span>
        <span class="week-meta">{weekMeta(week)}</span>
      </caption>
      <thead>
        <tr>
          <th scope="col">{m.taper_day()}</th>
          <th scope="col">{m.taper_session()}</th>
          <th scope="col">{m.common_distance()}</th>
        </tr>
      </thead>
      <tbody>
        {#each week.days as day (day.date)}
          <tr
            class:past={day.date < today}
            class:today={day.date === today}
            class:highlight={day.kind === 'race'}
          >
            <th scope="row" data-today={m.taper_today()}>{formatDay(day.date)}</th>
            <td>{SESSION_LABELS[day.kind]()}</td>
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
    <summary>{m.common_sources()}</summary>
    <!-- Messages are the app's own copy, not user input: safe as HTML. -->
    <p>{@html m.taper_info_literature()}</p>
    <p>{@html m.taper_info_model()}</p>
    <p>{m.taper_info_sessions()}</p>
    <p>{@html m.taper_info_runners()}</p>
  </details>
  </div>
</section>

<style>
  .reset {
    align-self: flex-start;
  }

  .preset-hint {
    margin: -0.25rem 0 0;
    font-size: 0.85rem;
    text-align: center;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  /* Fixed columns so every week's table lines up with the one above it. */
  table {
    margin-top: 0.25rem;
    table-layout: fixed;
  }

  thead th:nth-child(1) {
    width: 32%;
  }

  thead th:nth-child(3) {
    width: 22%;
  }

  caption {
    padding: 0 0 0.4rem;
    text-align: left;
  }

  .week-title {
    display: block;
    font-weight: 700;
    font-size: 1.05rem;
  }

  .week-meta {
    display: block;
    font-size: 0.8rem;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  tr.past {
    opacity: 0.4;
  }

  tr.today th::after {
    content: attr(data-today);
    margin-left: 0.5rem;
    padding: 0.05rem 0.45rem;
    border-radius: 999px;
    background: var(--accent);
    color: var(--on-accent);
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    vertical-align: 0.1em;
  }
</style>
