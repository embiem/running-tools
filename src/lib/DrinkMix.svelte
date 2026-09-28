<script lang="ts">
  import Panel from './Panel.svelte'
  import {
    LIMITS,
    PRESETS,
    SIP_INTERVAL_MIN,
    computeMix,
    isCompleteMixInput,
    normalizeMixInput,
  } from './drinkMix'
  import type { MixInput, Preset, PresetId, Tonicity } from './drinkMix'
  import type { Message } from './i18n.svelte'
  import { formatFixed, formatPercent } from './format'
  import { m } from '../paraglide/messages.js'

  const STORAGE_KEY = 'drinkMix.prefs'

  function loadInput(): MixInput {
    try {
      return normalizeMixInput(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'))
    } catch {
      return normalizeMixInput(null)
    }
  }

  // Preset buttons follow the declaration order of PRESETS.
  const presetEntries = Object.entries(PRESETS) as [PresetId, Preset][]

  const TONICITY: Record<Tonicity, Message> = {
    hypotonic: m.drink_tonicity_hypotonic,
    isotonic: m.drink_tonicity_isotonic,
    hypertonic: m.drink_tonicity_hypertonic,
  }

  let input = $state<MixInput>(loadInput())
  // One validated snapshot feeds everything: the engine result, the batch
  // quantities and the per-bottle division all read the same numbers, so an
  // emptied number field can never make the header read "Per  ml bottle" or
  // divide the per-bottle amounts by zero.
  const effective = $derived(normalizeMixInput(input))
  const result = $derived(computeMix(effective))
  const presetMeta = $derived(PRESETS[effective.preset])

  // Persist every complete change; the try/catch covers private mode and quota
  // errors, and skipping incomplete input keeps the last complete value stored
  // while a field is briefly empty mid-edit.
  $effect(() => {
    if (!isCompleteMixInput(input)) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeMixInput(input)))
    } catch {
      /* storage unavailable — the tool still works for this session */
    }
  })

  function selectPreset(id: PresetId): void {
    const p = PRESETS[id]
    input.preset = id
    input.durationMin = p.durationMin
    input.fluidMlPerHour = p.fluidMlPerHour
  }

  // Reset only reassigns state; the $effect above persists the defaults again.
  function reset(): void {
    input = normalizeMixInput(null)
  }

  /**
   * Whole-number display, ties to even: 227.5 reads 228 and 2.5 reads 2. An
   * exact target hit stays in step with the mg/L figure beside it instead of
   * always drifting up.
   */
  function roundInt(value: number): number {
    return Math.floor(value) + 0.5 === value ? 2 * Math.round(value / 2) : Math.round(value)
  }
</script>

<section class="tool split" aria-label={m.drink_label()}>
  <div class="inputs">
    <Panel title={m.drink_session_title()} hint={m.drink_session_hint()}>
      <div class="presets" role="group" aria-label={m.drink_preset_group()}>
        {#each presetEntries as [id, preset] (id)}
          <button
            type="button"
            class:selected={input.preset === id}
            aria-pressed={input.preset === id}
            onclick={() => selectPreset(id)}
          >
            {preset.label()}
            <span class="preset-tagline">{preset.tagline()}</span>
          </button>
        {/each}
      </div>
      <p class="preset-hint">
        {m.drink_preset_targets({ carbs: presetMeta.carbsGPerH, sodium: presetMeta.sodiumMgPerH })}
      </p>
    </Panel>

    <Panel title={m.drink_setup_title()} hint={m.drink_setup_hint()}>
      <div class="fields">
        <label>
          <span class="label-text">{m.drink_duration()}</span>
          <span class="label-input">
            <input
              type="number"
              min={LIMITS.durationMin.min}
              max={LIMITS.durationMin.max}
              step={LIMITS.durationMin.step}
              bind:value={input.durationMin}
              aria-label={m.drink_duration_label()}
            />
            <span class="unit">{m.unit_min()}</span>
          </span>
        </label>

        <label>
          <span class="label-text">{m.drink_bottle()}</span>
          <span class="label-input">
            <input
              type="number"
              min={LIMITS.bottleMl.min}
              max={LIMITS.bottleMl.max}
              step={LIMITS.bottleMl.step}
              bind:value={input.bottleMl}
              aria-label={m.drink_bottle_label()}
            />
            <span class="unit">ml</span>
          </span>
        </label>

        <label>
          <span class="label-text">{m.drink_bottles()}</span>
          <span class="label-input">
            <input
              type="number"
              min={LIMITS.bottles.min}
              max={LIMITS.bottles.max}
              step={LIMITS.bottles.step}
              bind:value={input.bottles}
              aria-label={m.drink_bottles_label()}
            />
            <span class="total">{m.drink_bottles_total({ litres: formatFixed(result.carryMl / 1000, 2) })}</span>
          </span>
        </label>

        <label>
          <span class="label-text">
            {m.drink_fluid()}
            <span class="hint">{m.drink_fluid_hint()}</span>
          </span>
          <span class="label-input">
            <input
              type="number"
              min={LIMITS.fluidMlPerHour.min}
              max={LIMITS.fluidMlPerHour.max}
              step={LIMITS.fluidMlPerHour.step}
              bind:value={input.fluidMlPerHour}
              aria-label={m.drink_fluid_label()}
            />
            <span class="unit">ml/h</span>
          </span>
        </label>

        <div class="segmented stacked" role="radiogroup" aria-label={m.drink_salt_group()}>
          <label>
            <input type="radio" name="saltSetup" value="table" bind:group={input.saltSetup} />
            {m.drink_salt_table()}
          </label>
          <label>
            <input
              type="radio"
              name="saltSetup"
              value="table-potassium"
              bind:group={input.saltSetup}
            />
            {m.drink_salt_table_potassium()}
          </label>
        </div>

        {#if input.saltSetup === 'table-potassium'}
          <label>
            <span class="label-text">
              {m.drink_potassium()}
              <span class="hint">{m.drink_potassium_hint()}</span>
            </span>
            <span class="label-input">
              <input
                type="number"
                min={LIMITS.potassiumPct.min}
                max={LIMITS.potassiumPct.max}
                step={LIMITS.potassiumPct.step}
                bind:value={input.potassiumPct}
                aria-label={m.drink_potassium_label()}
              />
              <span class="unit">{m.drink_potassium_unit()}</span>
            </span>
          </label>
        {/if}
      </div>
    </Panel>

    <button type="button" class="ghost reset" onclick={reset}>{m.common_reset()}</button>
  </div>

  <div class="results">
    <h2>{m.drink_result_title({ ml: result.carryMl })}</h2>
    <div class="stats">
      <div class="stat hero">
        <span class="eyebrow">{m.drink_sugar()}</span>
        <span class="stat-value">{formatFixed(result.sugarG, 1)}<small>g</small></span>
        <span class="stat-sub">{m.drink_teaspoons({ tsp: formatFixed(result.sugarTsp, 1) })}</span>
      </div>
      <div class="stat">
        <span class="eyebrow">{m.drink_table_salt()}</span>
        <span class="stat-value">{formatFixed(result.tableSaltG, 2)}<small>g</small></span>
        <span class="stat-sub">{m.drink_teaspoons({ tsp: formatFixed(result.tableSaltTsp, 1) })}</span>
      </div>
      {#if input.saltSetup === 'table-potassium'}
        <div class="stat">
          <span class="eyebrow">{m.drink_potassium_salt()}</span>
          <span class="stat-value">{formatFixed(result.potassiumSaltG, 2)}<small>g</small></span>
          <span class="stat-sub">{m.drink_teaspoons({ tsp: formatFixed(result.potassiumSaltTsp, 1) })}</span>
        </div>
      {/if}
  </div>
  <dl>
    <dt>{m.drink_water()}</dt>
    <dd>{result.carryMl} ml</dd>
    <dt>{m.drink_per_bottle({ ml: result.bottleMl })}</dt>
    <dd>
      {#if input.saltSetup === 'table-potassium'}
        {m.drink_per_bottle_potassium({
          tableSalt: formatFixed(result.tableSaltG / result.bottles, 2),
          potassiumSalt: formatFixed(result.potassiumSaltG / result.bottles, 2),
          sugar: formatFixed(result.sugarG / result.bottles, 1),
        })}
      {:else}
        {m.drink_per_bottle_table({
          tableSalt: formatFixed(result.tableSaltG / result.bottles, 2),
          sugar: formatFixed(result.sugarG / result.bottles, 1),
        })}
      {/if}
    </dd>
  </dl>

  <h2>{m.drink_delivers_title()}</h2>
  <dl>
    <dt>{m.drink_sodium()}</dt>
    <dd>{m.drink_amount_mg({ mg: roundInt(result.sodiumMg), perLitre: formatFixed(result.sodiumMgPerL, 1) })}</dd>
    <dt>{m.drink_potassium_title()}</dt>
    <dd>
      {#if input.saltSetup === 'table-potassium'}
        {m.drink_amount_mg({ mg: roundInt(result.potassiumMg), perLitre: formatFixed(result.potassiumMgPerL, 1) })}
      {:else}
        {m.drink_no_potassium()}
      {/if}
    </dd>
    <dt>{m.drink_ratio()}</dt>
    <dd>
      {#if result.sodiumPotassiumRatio === null}
        —
      {:else}
        {formatFixed(result.sodiumPotassiumRatio, 1)} : 1
      {/if}
    </dd>
    <dt>{m.drink_carbohydrate()}</dt>
    <dd>
      {m.drink_carbs_amount({
        g: formatFixed(result.carbsG, 1),
        perLitre: formatFixed(result.carbsGPerL, 1),
        solution: formatPercent(result.carbsGPerL / 10, 1),
      })}
    </dd>
    <dt>{m.drink_energy()}</dt>
    <dd>{roundInt(result.kcal)} kcal</dd>
    <dt>{m.drink_osmolality()}</dt>
    <dd>
      {roundInt(result.osmolarityMOsmPerL)} mOsm/L
      <span class="band {result.tonicity}">{TONICITY[result.tonicity]()}</span>
    </dd>
    <dt>{m.drink_coverage()}</dt>
    <dd>
      {m.drink_coverage_values({
        sodium: formatPercent(result.sodiumCoveragePct),
        carbs: formatPercent(result.carbsCoveragePct),
        fluid: formatPercent(result.fluidCoveragePct),
      })}
    </dd>
  </dl>

  <h2>{m.drink_schedule_title()}</h2>
  <ul class="schedule">
    <li>
      {m.drink_schedule_bottle({ ml: result.bottleMl, minutes: roundInt(result.minutesPerBottle) })}
    </li>
    <li>{m.drink_schedule_sip({ ml: result.sipMl, minutes: SIP_INTERVAL_MIN })}</li>
    {#if result.carryMl < result.needFluidMl}
      <li>
        {m.drink_schedule_stations({
          carry: result.carryMl,
          need: roundInt(result.needFluidMl),
          short: result.shortfallFluidMl,
          sip: result.stationSipMl,
          minutes: SIP_INTERVAL_MIN,
        })}
      </li>
    {/if}
    {#if result.shortfallCarbsG > 0}
      <li>
        {m.drink_schedule_gels({ gels: result.gelCount, carbs: presetMeta.carbsGPerH })}
      </li>
    {/if}
    {#if result.shortfallSodiumMg > 0}
      <li>
        {m.drink_schedule_sodium_short({ mg: result.shortfallSodiumMg })}
      </li>
    {/if}
  </ul>

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
    <p>{@html m.drink_info_targets()}</p>
    <p>{m.drink_info_medical()}</p>
  </details>
  </div>
</section>

<style>
  .reset {
    align-self: flex-start;
  }

  .presets {
    display: flex;
    gap: 0.5rem;
  }

  .presets button {
    flex: 1;
    min-width: 0;
    overflow-wrap: break-word;
    padding: 0.7rem 0.5rem;
    border-radius: var(--radius-sm);
    background: var(--bg);
    font-size: 0.92rem;
  }

  .presets button.selected {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }

  .preset-tagline {
    display: block;
    margin-top: 0.2rem;
    font-size: 0.7rem;
    font-weight: 500;
    opacity: 0.7;
  }

  .preset-hint {
    margin: -0.25rem 0 0;
    font-size: 0.85rem;
    text-align: center;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .total {
    min-width: 6.5rem;
    color: var(--muted);
    font-size: 0.85rem;
  }

  .band {
    display: inline-block;
    margin-left: 0.4rem;
    padding: 0.1rem 0.55rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border: 1px solid currentColor;
  }

  .band.isotonic {
    color: var(--ok);
  }

  .band.hypotonic {
    color: var(--muted);
  }

  .band.hypertonic {
    color: var(--danger);
  }

  .schedule {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    counter-reset: step;
  }

  .schedule li {
    display: flex;
    gap: 0.75rem;
    align-items: baseline;
    counter-increment: step;
  }

  .schedule li::before {
    content: counter(step);
    flex: none;
    display: grid;
    place-items: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background: var(--surface-2);
    font-size: 0.75rem;
    font-weight: 700;
  }
</style>
