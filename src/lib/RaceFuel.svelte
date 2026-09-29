<script lang="ts">
  import Panel from './Panel.svelte'
  import {
    APPROACHES,
    BREAKFAST_HOURS,
    DAY_KIND_LABELS,
    FOODS,
    LIMITS,
    POPULAR,
    RACES,
    SLOT_LABELS,
    VERDICT_LABELS,
    convertWeight,
    formatFinishTime,
    isCompleteFuelInput,
    normalizeFuelInput,
    parseFinishTime,
    planFuel,
  } from './raceFuel'
  import type {
    Approach,
    ApproachId,
    FuelDay,
    FuelInput,
    Meal,
    MenuItem,
    RaceId,
    TimelineEvent,
    WeightUnit,
  } from './raceFuel'
  import type { Message } from './i18n.svelte'
  import { dateLocale, formatClock, formatDecimal } from './format'
  import { m } from '../paraglide/messages.js'

  const STORAGE_KEY = 'raceFuel.input'

  function loadInput(): FuelInput {
    try {
      return normalizeFuelInput(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'))
    } catch {
      return normalizeFuelInput(null)
    }
  }

  const raceEntries = Object.entries(RACES) as [RaceId, { label: Message; finishTime: string }][]
  const approachEntries = Object.entries(APPROACHES) as [ApproachId, Approach][]

  let input = $state<FuelInput>(loadInput())
  // One validated snapshot feeds everything, so an emptied field can never make
  // a figure read NaN.
  const effective = $derived(normalizeFuelInput(input))
  const plan = $derived(planFuel(effective))
  const weightBounds = $derived(effective.unit === 'kg' ? LIMITS.weightKg : LIMITS.weightLb)

  /** Which day the example menu shows: days before the race, 0 = race morning. */
  let menuDay = $state<number>(1)
  const shownDay = $derived(plan.days.find((day) => day.daysToRace === menuDay))

  // Persist every complete change; the try/catch covers private mode and quota
  // errors, and skipping incomplete input keeps the last complete value stored
  // while a field is briefly empty mid-edit.
  $effect(() => {
    if (!isCompleteFuelInput(input)) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeFuelInput(input)))
    } catch {
      /* storage unavailable — the tool still works for this session */
    }
  })

  const dayFormat = $derived(
    new Intl.DateTimeFormat(dateLocale(), { weekday: 'short', day: 'numeric', month: 'short' }),
  )

  // Dates stay YYYY-MM-DD in the engine; built from parts so no UTC shift creeps in.
  function formatDay(iso: string): string {
    const [year, month, day] = iso.split('-').map(Number)
    return dayFormat.format(new Date(year, month - 1, day))
  }

  function dayName(daysToRace: number): string {
    if (daysToRace === 0) return m.fuel_race_morning()
    return daysToRace === 1 ? m.fuel_day_before() : m.fuel_days_out({ days: daysToRace })
  }

  function dayFocus(day: FuelDay): string {
    const kind = DAY_KIND_LABELS[day.kind]()
    if (!day.lowFibre) return kind
    return `${kind} · ${day.lowFodmap ? m.fuel_low_fodmap() : m.fuel_low_fibre()}`
  }

  /** 1.5 → "1½", 0.5 → "½". */
  function formatCount(value: number): string {
    const whole = Math.floor(value)
    const half = value - whole >= 0.5
    return `${whole > 0 ? whole : ''}${half ? '½' : ''}` || '0'
  }

  function formatAmount(item: MenuItem): string {
    const food = FOODS[item.food]
    if (food.unit === 'count') return `× ${formatCount(item.amount)}`
    return `${Math.round(item.amount)} ${food.unit}`
  }

  function offsetLabel(event: TimelineEvent): string {
    if (event.offsetMin === 0) return m.fuel_offset_start()
    const minutes = -event.offsetMin
    return minutes % 60 === 0
      ? m.fuel_offset_hours({ hours: minutes / 60 })
      : m.fuel_offset_minutes({ minutes })
  }

  function eventText(event: TimelineEvent): string {
    const morning = plan.morning
    switch (event.kind) {
      case 'breakfast':
        return m.fuel_tl_breakfast({
          grams: morning.breakfastG,
          low: morning.fluidMl[0],
          high: morning.fluidMl[1],
        })
      case 'fluid':
        return m.fuel_tl_fluid({ low: morning.fluidTopUpMl[0], high: morning.fluidTopUpMl[1] })
      case 'caffeine':
        return m.fuel_tl_caffeine({
          mg: morning.caffeineMg ?? 0,
          mugs: formatCount(morning.caffeineMugs ?? 0),
        })
      case 'topUp':
        return m.fuel_tl_top_up({ grams: morning.topUpG })
      case 'start':
        return plan.finishMinutes > 60 ? m.fuel_tl_start_fuel() : m.fuel_tl_start_short()
    }
  }

  // Picking a race suggests a typical finish time for it, as the drink mix
  // presets suggest a duration; the runner then types their own.
  function selectRace(id: RaceId): void {
    input.distance = id
    input.finishTime = RACES[id].finishTime
  }

  function tidyFinishTime(): void {
    const minutes = parseFinishTime(input.finishTime ?? '')
    if (minutes !== null) input.finishTime = formatFinishTime(minutes)
  }

  // Switching units converts the weight you already typed: 70 kg becomes 154 lb.
  function setUnit(unit: WeightUnit): void {
    if (unit === input.unit) return
    const converted = convertWeight(Number(input.weight) || weightBounds.fallback, input.unit, unit)
    input.weight = unit === 'kg' ? Math.round(converted * 2) / 2 : Math.round(converted)
    input.unit = unit
  }

  function reset(): void {
    input = normalizeFuelInput(null)
    menuDay = 1
  }
</script>

{#snippet mealBlock(meal: Meal, heading: string)}
  <li class="meal">
    <div class="meal-head">
      <span class="meal-name">{heading}</span>
      <span class="meal-carbs">{m.fuel_grams({ grams: meal.carbsG })}</span>
    </div>
    <ul class="items">
      {#each meal.items as item (item.food)}
        <li>
          <span class="food">{FOODS[item.food].name()}</span>
          <span class="amount">{formatAmount(item)}</span>
          <span class="carbs">{m.fuel_grams({ grams: item.carbsG })}</span>
        </li>
      {/each}
    </ul>
  </li>
{/snippet}

<section class="tool split" aria-label={m.fuel_label()}>
  <div class="inputs">
    <Panel title={m.fuel_race_title()} hint={m.fuel_race_hint()}>
      <div class="fields">
        <label>
          <span class="label-text">{m.fuel_race_date()}</span>
          <span class="label-input">
            <input type="date" bind:value={input.raceDate} aria-label={m.fuel_race_date()} />
          </span>
        </label>

        <label>
          <span class="label-text">{m.fuel_start_time()}</span>
          <span class="label-input">
            <input type="time" bind:value={input.startTime} aria-label={m.fuel_start_time()} />
          </span>
        </label>

        <label>
          <span class="label-text">{m.common_distance()}</span>
          <span class="label-input">
            <select
              value={effective.distance}
              onchange={(event) => selectRace(event.currentTarget.value as RaceId)}
              aria-label={m.common_race_distance()}
            >
              {#each raceEntries as [id, race] (id)}
                <option value={id}>{race.label()}</option>
              {/each}
            </select>
          </span>
        </label>

        <label>
          <span class="label-text">
            {m.fuel_finish_time()}
            <span class="hint">{m.fuel_finish_time_hint()}</span>
          </span>
          <span class="label-input">
            <input
              type="text"
              inputmode="numeric"
              placeholder="4:15"
              bind:value={input.finishTime}
              onblur={tidyFinishTime}
              aria-label={m.fuel_finish_time_label()}
            />
          </span>
        </label>
      </div>
    </Panel>

    <Panel title={m.fuel_you_title()} hint={m.fuel_you_hint()}>
      <div class="fields">
        <label>
          <span class="label-text">{m.fuel_weight()}</span>
          <span class="label-input">
            <input
              type="number"
              min={weightBounds.min}
              max={weightBounds.max}
              step={weightBounds.step}
              bind:value={input.weight}
              aria-label={m.fuel_weight_label()}
            />
            <span class="unit">{effective.unit}</span>
          </span>
        </label>

        <div class="segmented" role="radiogroup" aria-label={m.fuel_weight_unit()}>
          <label>
            <input
              type="radio"
              name="weightUnit"
              value="kg"
              checked={effective.unit === 'kg'}
              onchange={() => setUnit('kg')}
            /> {m.fuel_kilograms()}
          </label>
          <label>
            <input
              type="radio"
              name="weightUnit"
              value="lb"
              checked={effective.unit === 'lb'}
              onchange={() => setUnit('lb')}
            /> {m.fuel_pounds()}
          </label>
        </div>
      </div>
    </Panel>

    <Panel title={m.fuel_approach_title()} hint={m.fuel_approach_hint()}>
      <div class="approaches" role="group" aria-label={m.fuel_approach_title()}>
        {#each approachEntries as [id, approach] (id)}
          <button
            type="button"
            class:selected={effective.approach === id}
            aria-pressed={effective.approach === id}
            onclick={() => (input.approach = id)}
          >
            <span class="approach-label">
              {approach.label()}
              {#if plan.recommended === id}
                <span class="badge">{m.fuel_recommended()}</span>
              {/if}
            </span>
            <span class="approach-tagline">{approach.tagline()}</span>
          </button>
        {/each}
      </div>
      <p class="preset-hint">
        {m.fuel_approach_targets({
          targets: APPROACHES[effective.approach].gPerKg.map(formatDecimal).join(' · '),
        })}
      </p>
    </Panel>

    <Panel title={m.fuel_prefs_title()} hint={m.fuel_prefs_hint()}>
      <div class="fields">
        <div class="group">
          <span class="label-text" id="fuel-food-style">{m.fuel_food_style()}</span>
          <div class="segmented stacked" role="radiogroup" aria-labelledby="fuel-food-style">
            <label>
              <input type="radio" name="foodStyle" value="wheat" bind:group={input.foodStyle} />
              {m.fuel_food_style_wheat()}
            </label>
            <label>
              <input type="radio" name="foodStyle" value="glutenFree" bind:group={input.foodStyle} />
              {m.fuel_food_style_gluten_free()}
            </label>
          </div>
        </div>

        <div class="group">
          <span class="label-text" id="fuel-stomach">
            {m.fuel_stomach()}
            <span class="hint">{m.fuel_stomach_hint()}</span>
          </span>
          <div class="segmented" role="radiogroup" aria-labelledby="fuel-stomach">
            <label>
              <input type="radio" name="stomach" value="normal" bind:group={input.stomach} />
              {m.fuel_stomach_normal()}
            </label>
            <label>
              <input type="radio" name="stomach" value="sensitive" bind:group={input.stomach} />
              {m.fuel_stomach_sensitive()}
            </label>
          </div>
        </div>

        <div class="group">
          <span class="label-text" id="fuel-breakfast">
            {m.fuel_breakfast_timing()}
            <span class="hint">{m.fuel_breakfast_timing_hint()}</span>
          </span>
          <div class="segmented" role="radiogroup" aria-labelledby="fuel-breakfast">
            {#each BREAKFAST_HOURS as hours (hours)}
              <label>
                <input type="radio" name="breakfastHours" value={hours} bind:group={input.breakfastHours} />
                {m.fuel_hours_short({ hours })}
              </label>
            {/each}
          </div>
        </div>

        <div class="group">
          <span class="label-text" id="fuel-caffeine">{m.fuel_caffeine()}</span>
          <div class="segmented" role="radiogroup" aria-labelledby="fuel-caffeine">
            <label>
              <input type="radio" name="caffeine" value={false} bind:group={input.caffeine} />
              {m.fuel_caffeine_off()}
            </label>
            <label>
              <input type="radio" name="caffeine" value={true} bind:group={input.caffeine} />
              {m.fuel_caffeine_on()}
            </label>
          </div>
        </div>
      </div>
    </Panel>

    <button type="button" class="ghost reset" onclick={reset}>{m.common_reset()}</button>
  </div>

  <div class="results">
    <h2>{m.fuel_plan_title()}</h2>
    <div class="stats">
      <div class="stat hero">
        <span class="eyebrow">{m.fuel_peak()}</span>
        <span class="stat-value">{plan.peakG}<small>g</small></span>
        <span class="stat-sub">
          {m.fuel_peak_sub({ gPerKg: formatDecimal(plan.peakGPerKg), date: formatDay(plan.peakDate) })}
        </span>
      </div>
      <div class="stat">
        <span class="eyebrow">{m.fuel_breakfast()}</span>
        <span class="stat-value">{plan.morning.breakfastG}<small>g</small></span>
        <span class="stat-sub">
          {m.fuel_breakfast_sub({
            hours: plan.morning.hours,
            time: formatClock(plan.morning.timeline[0].clockMin),
          })}
        </span>
      </div>
    </div>

    <h2>{m.fuel_days_title()}</h2>
    <table>
      <thead>
        <tr>
          <th scope="col">{m.fuel_day()}</th>
          <th scope="col">{m.fuel_carbs()}</th>
          <th scope="col">{m.fuel_focus()}</th>
        </tr>
      </thead>
      <tbody>
        {#each plan.days as day (day.daysToRace)}
          <tr>
            <th scope="row">
              {formatDay(day.date)}
              <span class="sub">{dayName(day.daysToRace)}</span>
            </th>
            <td>
              {m.fuel_grams({ grams: day.carbsG })}
              <span class="sub">{m.fuel_g_per_kg({ value: formatDecimal(day.gPerKg) })}</span>
            </td>
            <td>{dayFocus(day)}</td>
          </tr>
        {/each}
        <tr class="highlight">
          <th scope="row">
            {formatDay(effective.raceDate)}
            <span class="sub">{m.fuel_race_morning()}</span>
          </th>
          <td>
            {m.fuel_grams({ grams: plan.morning.breakfastG })}
            <span class="sub">{m.fuel_g_per_kg({ value: formatDecimal(plan.morning.gPerKg) })}</span>
          </td>
          <td>{m.fuel_focus_breakfast({ hours: plan.morning.hours })}</td>
        </tr>
      </tbody>
    </table>

    <h2>{m.fuel_menu_title()}</h2>
    <div class="segmented menu-days" role="radiogroup" aria-label={m.fuel_menu_day()}>
      {#each [3, 2, 1, 0] as days (days)}
        <label>
          <input type="radio" name="menuDay" value={days} bind:group={menuDay} />
          {dayName(days)}
        </label>
      {/each}
    </div>

    {#if shownDay}
      <ol class="menu">
        {#each shownDay.meals as meal (meal.slot)}
          {@render mealBlock(meal, SLOT_LABELS[meal.slot]())}
        {/each}
      </ol>
      <p class="menu-total">
        {m.fuel_menu_total({ menu: shownDay.menuCarbsG, target: shownDay.carbsG })}
      </p>
      <p class="note">{m.fuel_menu_note()}</p>
      {#if shownDay.lowFodmap}
        <p class="note">{m.fuel_menu_fodmap_note()}</p>
      {/if}
    {:else}
      <ol class="menu">
        {@render mealBlock(plan.morning.breakfast, m.fuel_race_breakfast_heading({ hours: plan.morning.hours }))}
      </ol>
      <p class="note">{m.fuel_breakfast_note()}</p>
    {/if}

    <h2>{m.fuel_morning_title()}</h2>
    <ol class="timeline">
      {#each plan.morning.timeline as event (event.kind)}
        <li class:start={event.kind === 'start'}>
          <span class="clock">
            {formatClock(event.clockMin)}
            <span class="sub">{offsetLabel(event)}</span>
          </span>
          <!-- Messages are the app's own copy, not user input: safe as HTML. -->
          <span class="what">{@html eventText(event)}</span>
        </li>
      {/each}
    </ol>

    {#if plan.flags.length}
      <ul class="flags">
        {#each plan.flags as flag, i (i)}
          <li class="flag {flag.level}">{flag.message}</li>
        {/each}
      </ul>
    {/if}

    <h2>{m.fuel_popular_title()}</h2>
    <ul class="popular">
      {#each POPULAR as item (item.id)}
        <li>
          <div class="popular-head">
            <span class="popular-name">{item.name()}</span>
            <span class="verdict {item.verdict}">{VERDICT_LABELS[item.verdict]()}</span>
          </div>
          <!-- Messages are the app's own copy, not user input: safe as HTML. -->
          <p>{@html item.text()}</p>
        </li>
      {/each}
    </ul>

    <details class="info">
      <summary>{m.common_sources()}</summary>
      <!-- Messages are the app's own copy, not user input: safe as HTML. -->
      <p>{@html m.fuel_info_loading()}</p>
      <p>{@html m.fuel_info_practice()}</p>
      <p>{@html m.fuel_info_morning()}</p>
      <p>{@html m.fuel_info_gut()}</p>
      <p>{m.fuel_info_foods()}</p>
      <p>{m.fuel_info_medical()}</p>
    </details>
  </div>
</section>

<style>
  .reset {
    align-self: flex-start;
  }

  .approaches {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .approaches button {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    min-width: 0;
    padding: 0.7rem 0.75rem;
    border-radius: var(--radius-sm);
    background: var(--bg);
    font-size: 0.92rem;
    text-align: left;
    overflow-wrap: break-word;
  }

  .approaches button.selected {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }

  .approach-label {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
  }

  .approach-tagline {
    font-size: 0.72rem;
    font-weight: 500;
    opacity: 0.7;
  }

  .badge {
    padding: 0.05rem 0.45rem;
    border-radius: 999px;
    border: 1px solid currentColor;
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent-text);
  }

  .selected .badge {
    color: inherit;
  }

  .preset-hint {
    margin: -0.25rem 0 0;
    font-size: 0.85rem;
    text-align: center;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .sub {
    display: block;
    font-size: 0.78rem;
    font-weight: 400;
    color: var(--muted);
  }

  tr.highlight .sub {
    color: inherit;
    opacity: 0.75;
  }

  table {
    table-layout: fixed;
  }

  thead th:nth-child(1) {
    width: 34%;
  }

  thead th:nth-child(2) {
    width: 24%;
  }

  /* Four day tabs: two by two on a phone, one row once they fit. */
  .menu-days {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border-radius: var(--radius-sm);
  }

  .menu-days label {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    border-radius: calc(var(--radius-sm) - 3px);
  }

  @media (min-width: 36rem) {
    .menu-days {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  .menu,
  .timeline,
  .popular {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
  }

  .menu {
    gap: 0.6rem;
  }

  .meal {
    padding: 0.75rem 0.9rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
  }

  .meal-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.4rem;
  }

  .meal-name {
    font-weight: 700;
  }

  .meal-carbs {
    color: var(--accent-text);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .items {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.88rem;
  }

  .items li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto 3.5rem;
    gap: 0.75rem;
    align-items: baseline;
  }

  .food {
    color: var(--muted);
  }

  .amount {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .carbs {
    text-align: right;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .menu-total,
  .note {
    margin: 0;
    font-size: 0.85rem;
    color: var(--muted);
  }

  .menu-total {
    font-variant-numeric: tabular-nums;
  }

  .timeline {
    gap: 0;
  }

  .timeline li {
    display: grid;
    grid-template-columns: 6.5rem minmax(0, 1fr);
    gap: 1rem;
    padding: 0.7rem 0;
    border-bottom: 1px solid var(--border);
  }

  .timeline li:last-child {
    border-bottom: none;
  }

  .clock {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .timeline li.start .clock {
    color: var(--accent-text);
  }

  .what {
    font-size: 0.92rem;
  }

  .popular {
    gap: 0.6rem;
  }

  .popular li {
    padding: 0.8rem 0.95rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
  }

  .popular-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .popular-name {
    font-weight: 700;
  }

  .popular p {
    margin: 0.4rem 0 0;
    font-size: 0.88rem;
    color: var(--muted);
    line-height: 1.55;
  }

  .verdict {
    flex: none;
    padding: 0.1rem 0.55rem;
    border-radius: 999px;
    border: 1px solid currentColor;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .verdict.supported {
    color: var(--ok);
  }

  .verdict.mixed {
    color: var(--muted);
  }

  .verdict.against {
    color: var(--danger);
  }
</style>
