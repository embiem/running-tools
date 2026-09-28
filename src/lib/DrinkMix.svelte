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
  import type { MixInput, Preset, PresetId } from './drinkMix'

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

<section class="tool split" aria-label="Drink mix calculator">
  <div class="inputs">
    <Panel
      title="Your session"
      hint="Pick the closest fit — the preset sets the carbohydrate and sodium targets the mix is built to hit."
    >
      <div class="presets" role="group" aria-label="Session preset">
        {#each presetEntries as [id, preset] (id)}
          <button
            type="button"
            class:selected={input.preset === id}
            aria-pressed={input.preset === id}
            onclick={() => selectPreset(id)}
          >
            {preset.label}
            <span class="preset-tagline">{preset.tagline}</span>
          </button>
        {/each}
      </div>
      <p class="preset-hint">
        {presetMeta.carbsGPerH} g carbs/h · {presetMeta.sodiumMgPerH} mg sodium/h
      </p>
    </Panel>

    <Panel
      title="Your setup"
      hint="What you carry and how much you drink — the mix is sized to that."
    >
      <div class="fields">
        <label>
          <span class="label-text">Session length</span>
          <span class="label-input">
            <input
              type="number"
              min={LIMITS.durationMin.min}
              max={LIMITS.durationMin.max}
              step={LIMITS.durationMin.step}
              bind:value={input.durationMin}
              aria-label="Session length in minutes"
            />
            <span class="unit">min</span>
          </span>
        </label>

        <label>
          <span class="label-text">Bottle size</span>
          <span class="label-input">
            <input
              type="number"
              min={LIMITS.bottleMl.min}
              max={LIMITS.bottleMl.max}
              step={LIMITS.bottleMl.step}
              bind:value={input.bottleMl}
              aria-label="Bottle size in millilitres"
            />
            <span class="unit">ml</span>
          </span>
        </label>

        <label>
          <span class="label-text">Bottles you carry</span>
          <span class="label-input">
            <input
              type="number"
              min={LIMITS.bottles.min}
              max={LIMITS.bottles.max}
              step={LIMITS.bottles.step}
              bind:value={input.bottles}
              aria-label="Number of bottles you carry"
            />
            <span class="total">= {(result.carryMl / 1000).toFixed(2)} L total</span>
          </span>
        </label>

        <label>
          <span class="label-text">
            Your fluid intake
            <span class="hint">
              Sweat rate is typically 0.5–2.0 L/h, higher in heat and at race pace — weigh yourself
              before and after a run to find yours.
            </span>
          </span>
          <span class="label-input">
            <input
              type="number"
              min={LIMITS.fluidMlPerHour.min}
              max={LIMITS.fluidMlPerHour.max}
              step={LIMITS.fluidMlPerHour.step}
              bind:value={input.fluidMlPerHour}
              aria-label="Your fluid intake in millilitres per hour"
            />
            <span class="unit">ml/h</span>
          </span>
        </label>

        <div class="segmented stacked" role="radiogroup" aria-label="Salt you have">
          <label>
            <input type="radio" name="saltSetup" value="table" bind:group={input.saltSetup} />
            Table salt only
          </label>
          <label>
            <input
              type="radio"
              name="saltSetup"
              value="table-potassium"
              bind:group={input.saltSetup}
            />
            Table salt + potassium-rich salt
          </label>
        </div>

        {#if input.saltSetup === 'table-potassium'}
          <label>
            <span class="label-text">
              Potassium in that salt
              <span class="hint">
                LoSalt ≈ 66 %, many reduced-sodium blends ≈ 30–50 %, your blend 33 %.
              </span>
            </span>
            <span class="label-input">
              <input
                type="number"
                min={LIMITS.potassiumPct.min}
                max={LIMITS.potassiumPct.max}
                step={LIMITS.potassiumPct.step}
                bind:value={input.potassiumPct}
                aria-label="Percentage of potassium chloride in your potassium-rich salt"
              />
              <span class="unit">% KCl</span>
            </span>
          </label>
        {/if}
      </div>
    </Panel>

    <button type="button" class="ghost reset" onclick={reset}>Reset to defaults</button>
  </div>

  <div class="results">
    <h2>The mix for {result.carryMl} ml</h2>
    <div class="stats">
      <div class="stat hero">
        <span class="eyebrow">Sugar</span>
        <span class="stat-value">{result.sugarG.toFixed(1)}<small>g</small></span>
        <span class="stat-sub">≈ {result.sugarTsp.toFixed(1)} tsp</span>
      </div>
      <div class="stat">
        <span class="eyebrow">Table salt</span>
        <span class="stat-value">{result.tableSaltG.toFixed(2)}<small>g</small></span>
        <span class="stat-sub">≈ {result.tableSaltTsp.toFixed(1)} tsp</span>
      </div>
      {#if input.saltSetup === 'table-potassium'}
        <div class="stat">
          <span class="eyebrow">Potassium-rich salt</span>
          <span class="stat-value">{result.potassiumSaltG.toFixed(2)}<small>g</small></span>
          <span class="stat-sub">≈ {result.potassiumSaltTsp.toFixed(1)} tsp</span>
        </div>
      {/if}
  </div>
  <dl>
    <dt>Water</dt>
    <dd>{result.carryMl} ml</dd>
    <dt>Per {result.bottleMl} ml bottle</dt>
    <dd>
      {#if input.saltSetup === 'table-potassium'}
        {(result.tableSaltG / result.bottles).toFixed(2)} g table salt +
        {(result.potassiumSaltG / result.bottles).toFixed(2)} g potassium salt +
        {(result.sugarG / result.bottles).toFixed(1)} g sugar
      {:else}
        {(result.tableSaltG / result.bottles).toFixed(2)} g table salt +
        {(result.sugarG / result.bottles).toFixed(1)} g sugar
      {/if}
    </dd>
  </dl>

  <h2>What you get</h2>
  <dl>
    <dt>Sodium</dt>
    <dd>{roundInt(result.sodiumMg)} mg ({result.sodiumMgPerL.toFixed(1)} mg/L)</dd>
    <dt>Potassium</dt>
    <dd>
      {#if input.saltSetup === 'table-potassium'}
        {roundInt(result.potassiumMg)} mg ({result.potassiumMgPerL.toFixed(1)} mg/L)
      {:else}
        0 mg — none in table salt
      {/if}
    </dd>
    <dt>Sodium : potassium</dt>
    <dd>
      {#if result.sodiumPotassiumRatio === null}
        —
      {:else}
        {result.sodiumPotassiumRatio.toFixed(1)} : 1
      {/if}
    </dd>
    <dt>Carbohydrate</dt>
    <dd>
      {result.carbsG.toFixed(1)} g ({result.carbsGPerL.toFixed(1)} g/L, {(result.carbsGPerL / 10).toFixed(1)}% solution)
    </dd>
    <dt>Energy</dt>
    <dd>{roundInt(result.kcal)} kcal</dd>
    <dt>Osmolality</dt>
    <dd>
      {roundInt(result.osmolarityMOsmPerL)} mOsm/L
      <span class="band {result.tonicity}">{result.tonicity}</span>
    </dd>
    <dt>Covers your plan</dt>
    <dd>
      sodium {result.sodiumCoveragePct}% · carbs {result.carbsCoveragePct}% · fluid {result.fluidCoveragePct}%
    </dd>
  </dl>

  <h2>How to drink it</h2>
  <ul class="schedule">
    <li>
      Drink one {result.bottleMl} ml bottle about every {roundInt(result.minutesPerBottle)} minutes.
    </li>
    <li>Sip roughly {result.sipMl} ml every {SIP_INTERVAL_MIN} minutes.</li>
    {#if result.carryMl < result.needFluidMl}
      <li>
        You carry {result.carryMl} ml but need about {roundInt(result.needFluidMl)} ml. Pick up the
        remaining {result.shortfallFluidMl} ml at drink stations — about {result.stationSipMl} ml every
        {SIP_INTERVAL_MIN} minutes — or carry an extra bottle.
      </li>
    {/if}
    {#if result.shortfallCarbsG > 0}
      <li>
        Add about {result.gelCount} gel(s) (25 g each) to reach the {presetMeta.carbsGPerH} g/h
        carbohydrate target.
      </li>
    {/if}
    {#if result.shortfallSodiumMg > 0}
      <li>
        Your bottles fall {result.shortfallSodiumMg} mg short of the sodium target for this session.
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
    <summary>Where these numbers come from</summary>
    <p>
      Targets follow the ACSM position stand on exercise and fluid replacement — 500–700 mg of
      sodium per litre and 600–1200 ml of fluid per hour for sessions over an hour, with 30–60 g of
      carbohydrate per hour as a 4–8% solution — and the 2016 joint position stand (ACSM /
      Dietitians of Canada / Academy of Nutrition and Dietetics), which raises carbohydrate to 30–90
      g/h for longer sessions using multiple transportable carbohydrates. Sweat sodium varies from
      about 17 to 92 mmol/L between runners, so the <em>Marathon</em> preset mixes at ~1150 mg/L (50
      mmol/L) — as concentrated as drinkable, since palatability falls beyond that. Table salt is
      ~393 mg sodium per gram; potassium chloride is ~524 mg potassium per gram, so a “reduced
      sodium” blend that is 33 % KCl provides ~263 mg sodium and ~173 mg potassium per gram.
    </p>
    <p>
      If you have kidney problems, or take ACE inhibitors, ARBs, potassium-sparing diuretics or other
      medication that raises blood potassium, do not add a potassium-rich salt without medical advice.
      Weigh ingredients on a 0.1 g scale — household teaspoons vary.
    </p>
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
