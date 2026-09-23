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

<section class="tool" aria-label="Drink mix calculator">
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

      <div class="salt" role="radiogroup" aria-label="Salt you have">
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

  <button type="button" class="reset" onclick={reset}>Reset to defaults</button>

  <h2>The mix for {result.carryMl} ml</h2>
  <dl>
    {#if input.saltSetup === 'table-potassium'}
      <dt>Potassium-rich salt</dt>
      <dd>{result.potassiumSaltG.toFixed(2)} g (≈ {result.potassiumSaltTsp.toFixed(1)} tsp)</dd>
    {/if}
    <dt>Table salt</dt>
    <dd>{result.tableSaltG.toFixed(2)} g (≈ {result.tableSaltTsp.toFixed(1)} tsp)</dd>
    <dt>Sugar</dt>
    <dd>{result.sugarG.toFixed(1)} g (≈ {result.sugarTsp.toFixed(1)} tsp)</dd>
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
</section>

<style>
  .tool {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    width: min(28rem, 100%);
    margin: 0 auto;
    text-align: left;
  }

  h2 {
    margin: 0.5rem 0 -0.5rem;
    font-size: 1rem;
    font-weight: 600;
    opacity: 0.85;
  }

  .presets {
    display: flex;
    gap: 0.5rem;
  }

  .presets button {
    flex: 1;
    min-width: 0;
    overflow-wrap: break-word;
    padding: 0.5rem;
    font-size: 0.9rem;
  }

  .presets button.selected {
    border-color: #646cff;
    color: #646cff;
  }

  .preset-tagline {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.7rem;
    font-weight: 400;
    opacity: 0.7;
  }

  .preset-hint {
    margin: -0.5rem 0 0;
    font-size: 0.85rem;
    text-align: center;
    color: #888;
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

  input[type='number'] {
    width: 6rem;
    padding: 0.3rem 0.5rem;
    border: 1px solid rgba(128, 128, 128, 0.4);
    border-radius: 6px;
    background: rgba(128, 128, 128, 0.12);
    color: inherit;
    font: inherit;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .unit,
  .total {
    color: #888;
    font-size: 0.85rem;
  }

  .total {
    min-width: 6.5rem;
  }

  .hint {
    display: block;
    font-size: 0.8rem;
    opacity: 0.7;
  }

  .salt {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.9rem;
  }

  .salt label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  input[type='radio'] {
    accent-color: #646cff;
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

  .band {
    display: inline-block;
    margin-left: 0.35rem;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    font-size: 0.75rem;
  }

  .band.isotonic {
    border: 1px solid #3fb950;
    color: #3fb950;
  }

  .band.hypotonic {
    border: 1px solid #888;
    color: #888;
  }

  .band.hypertonic {
    border: 1px solid #f85149;
    color: #f85149;
  }

  .schedule {
    margin: 0;
    padding-left: 1.1rem;
    font-size: 0.9rem;
  }

  .schedule li + li {
    margin-top: 0.35rem;
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
