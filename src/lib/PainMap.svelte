<script lang="ts">
  import { tick } from 'svelte'
  import Panel from './Panel.svelte'
  import BodyMap from './BodyMap.svelte'
  import { CAUSES, RED_FLAGS, TOP_INJURIES, VIEWS, getSpot, normalizeSelection } from './painMap'
  import type { BodyView, Care, Likelihood, SpotId } from './painMap'
  import type { Message } from './i18n.svelte'
  import { formatPercent } from './format'
  import { m } from '../paraglide/messages.js'

  const STORAGE_KEY = 'painMap.selection'

  const LIKELIHOOD: Record<Likelihood, Message> = {
    common: m.pain_likelihood_common,
    occasional: m.pain_likelihood_occasional,
    rare: m.pain_likelihood_rare,
  }

  const CARE: Record<Exclude<Care, 'self'>, Message> = {
    doctor: m.pain_care_doctor,
    urgent: m.pain_care_urgent,
  }

  function loadSelection() {
    try {
      return normalizeSelection(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'))
    } catch {
      return normalizeSelection(null)
    }
  }

  const saved = loadSelection()
  let view = $state<BodyView>(saved.view)
  let spotId = $state<SpotId | null>(saved.spot)
  const spot = $derived(spotId ? getSpot(spotId) : null)
  const caption = $derived(VIEWS.find((v) => v.id === view)!.caption())
  const emergencies = RED_FLAGS.filter((f) => f.urgent)
  const redFlags = RED_FLAGS.filter((f) => !f.urgent)

  // Coming back to the page shows the spot you last looked at.
  $effect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ view, spot: spotId }))
    } catch {
      /* storage unavailable — the tool still works for this session */
    }
  })

  let mapPanel: HTMLElement | undefined = $state()
  let results: HTMLElement | undefined = $state()

  function reveal(el: HTMLElement | undefined): void {
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches
    el?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
  }

  async function pick(id: SpotId): Promise<void> {
    spotId = id
    const s = getSpot(id)
    if (!s.views.includes(view)) view = s.views[0]
    await tick()
    // On one column the causes sit below the map, and after a nearby-spot
    // chip they may have scrolled away: bring their top into view either way.
    const top = results?.getBoundingClientRect().top ?? 0
    if (top < 0 || top > innerHeight - 160) reveal(results)
  }
</script>

<section class="tool split" aria-label={m.pain_label()}>
  <div class="inputs" bind:this={mapPanel}>
    <Panel title={m.pain_map_title()} hint={m.pain_map_hint()}>
      <div class="segmented" role="radiogroup" aria-label={m.pain_view_group()}>
        {#each VIEWS as v (v.id)}
          <label>
            <input type="radio" name="pain-map-view" value={v.id} bind:group={view} />
            {v.label()}
          </label>
        {/each}
      </div>

      <BodyMap {view} selected={spotId} onselect={pick} />

      <div class="map-foot">
        <span class="muted">{caption}</span>
        {#if spot}
          <button type="button" class="ghost" onclick={() => (spotId = null)}>{m.pain_clear()}</button>
        {/if}
      </div>
    </Panel>
  </div>

  <div class="results" bind:this={results}>
    {#if spot}
      <header class="spot-head">
        <p class="eyebrow">{m.pain_where_it_hurts()}</p>
        <h2 class="display">{spot.name()}</h2>
        <p class="where">{spot.where()}</p>
      </header>

      <h2>{m.pain_causes_title()}</h2>
      <ol class="causes">
        {#each spot.causes as id (id)}
          {@const cause = CAUSES[id]}
          <li class="cause {cause.care}">
            <div class="cause-head">
              <div>
                <h3>{cause.name()}</h3>
                {#if cause.aka}
                  <p class="aka">{cause.aka()}</p>
                {/if}
              </div>
              <p class="tags">
                <span class="tag {cause.likelihood}">{LIKELIHOOD[cause.likelihood]()}</span>
                {#if cause.care !== 'self'}
                  <span class="tag care">{CARE[cause.care]()}</span>
                {/if}
              </p>
            </div>
            {#if cause.stat}
              <p class="stat-line">{cause.stat()}</p>
            {/if}
            <p class="feels">{cause.feels()}</p>
            <details>
              <summary>{m.pain_why_and_helps()}</summary>
              <h4>{m.pain_why()}</h4>
              <p>{cause.why()}</p>
              <h4>{m.pain_helps()}</h4>
              <p>{cause.helps()}</p>
              {#if cause.tool}
                <a class="tool-link" href="/#{cause.tool.route}">{cause.tool.label()} →</a>
              {/if}
            </details>
            <p class="check">
              <strong>{cause.care === 'self' ? m.pain_check_self() : m.pain_check_doctor()}</strong>
              {cause.check()}
            </p>
          </li>
        {/each}
      </ol>

      <div class="nearby">
        <span class="muted">{m.pain_nearby()}</span>
        {#each spot.nearby as id (id)}
          <button type="button" class="chip" onclick={() => pick(id)}>{getSpot(id).short()}</button>
        {/each}
      </div>
    {:else}
      <header class="spot-head">
        <p class="eyebrow">{m.pain_start_here()}</p>
        <h2 class="display">{m.pain_start_title()}</h2>
        <p class="where">{m.pain_start_text()}</p>
      </header>

      <h2>{m.pain_top_title()}</h2>
      <ol class="top">
        {#each TOP_INJURIES as item, i (item.cause)}
          <li>
            <button type="button" onclick={() => pick(item.spot)}>
              <span class="rank display">{i + 1}</span>
              <span class="top-name">
                {CAUSES[item.cause].name()}
                <span class="muted">{getSpot(item.spot).short()}</span>
              </span>
              <span class="pct">{formatPercent(item.percent, 1)}</span>
            </button>
          </li>
        {/each}
      </ol>
      <p class="hint">{m.pain_top_hint()}</p>
    {/if}

    <h2>{m.pain_red_flags_title()}</h2>
    {#each emergencies as flag (flag.message)}
      <p class="flag warn emergency">{flag.message()}</p>
    {/each}
    <ul class="red-flags">
      {#each redFlags as flag (flag.message)}
        <li>{flag.message()}</li>
      {/each}
    </ul>

    <details class="info">
      <summary>{m.pain_info_title()}</summary>
      <!-- Messages are the app's own copy, not user input: safe as HTML. -->
      <p>{@html m.pain_info_guide()}</p>
      <p>{@html m.pain_info_overload()}</p>
      <p>{@html m.pain_info_running_with_pain()}</p>
      <p>{@html m.pain_info_knees()}</p>
      <p>{@html m.pain_info_sources()}</p>
    </details>

    <button type="button" class="ghost back-to-map" onclick={() => reveal(mapPanel)}>{m.pain_pick_another()}</button>
  </div>
</section>

<style>
  .segmented {
    align-self: stretch;
  }

  .map-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    min-height: 2.1rem;
  }

  .map-foot .muted {
    font-size: 0.82rem;
  }

  .map-foot button {
    padding: 0.3em 0.9em;
  }

  /* ---------- Spot header ---------- */

  .results {
    scroll-margin-top: 5rem;
  }

  .spot-head {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .spot-head h2 {
    margin: 0;
    font-size: clamp(2.2rem, 7vw, 3.2rem);
    text-transform: uppercase;
    /* Last resort for a translated spot name longer than a phone is wide. */
    overflow-wrap: anywhere;
  }

  .where {
    margin: 0;
    max-width: 38rem;
    color: var(--muted);
  }

  /* ---------- Cause cards ---------- */

  .causes {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .cause {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 1rem 1.1rem 1.1rem;
    border-radius: var(--radius);
    background: var(--surface);
    border: 1px solid var(--border);
  }

  .cause.doctor,
  .cause.urgent {
    border-color: color-mix(in srgb, var(--danger) 45%, transparent);
  }

  .cause.urgent {
    background: color-mix(in srgb, var(--danger) 8%, var(--surface));
  }

  .cause-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem 1rem;
  }

  h3 {
    margin: 0;
    font-size: 1.08rem;
    font-weight: 700;
    line-height: 1.3;
  }

  .aka {
    margin: 0.1rem 0 0;
    color: var(--muted);
    font-size: 0.85rem;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin: 0;
  }

  .tag {
    padding: 0.18rem 0.55rem;
    border-radius: 999px;
    border: 1px solid var(--border-strong);
    color: var(--muted);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .tag.common {
    border-color: var(--accent-text);
    color: var(--accent-text);
  }

  .tag.care {
    border-color: var(--danger);
    background: var(--danger);
    color: var(--bg);
  }

  .stat-line {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--accent-text);
  }

  .feels,
  .check {
    margin: 0;
    font-size: 0.93rem;
  }

  .check {
    color: var(--muted);
    font-size: 0.88rem;
  }

  .check strong {
    color: var(--text);
  }

  .cause.doctor .check strong,
  .cause.urgent .check strong {
    color: var(--danger);
  }

  .cause details {
    border-top: 1px solid var(--border);
    padding-top: 0.55rem;
    font-size: 0.9rem;
  }

  .cause summary {
    cursor: pointer;
    font-weight: 600;
    color: var(--accent-text);
  }

  h4 {
    margin: 0.75rem 0 0.2rem;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .cause details p {
    margin: 0;
  }

  .tool-link {
    display: inline-block;
    margin-top: 0.6rem;
    font-size: 0.88rem;
  }

  /* ---------- Nearby spots ---------- */

  .nearby {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
  }

  .nearby .muted {
    margin-right: 0.25rem;
  }

  .chip {
    padding: 0.35em 0.85em;
    font-size: 0.85rem;
    background: transparent;
  }

  /* ---------- Top five ---------- */

  .top {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--border);
  }

  .top button {
    display: grid;
    grid-template-columns: 2rem 1fr auto;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.7rem 0.25rem;
    border: 0;
    border-bottom: 1px solid var(--border);
    border-radius: 0;
    background: transparent;
    text-align: left;
    font-weight: 600;
  }

  .top button:hover {
    background: var(--surface);
  }

  .top button:active {
    transform: none;
  }

  .rank {
    font-size: 1.8rem;
    color: var(--muted);
  }

  .top-name .muted {
    display: block;
    font-size: 0.8rem;
  }

  .pct {
    font-variant-numeric: tabular-nums;
    color: var(--accent-text);
  }

  .hint {
    margin-top: -0.5rem;
  }

  /* ---------- Red flags ---------- */

  .emergency {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .red-flags {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    font-size: 0.9rem;
  }

  .red-flags li {
    position: relative;
    padding-left: 1.2rem;
  }

  .red-flags li::before {
    content: '';
    position: absolute;
    left: 0.2rem;
    top: 0.55em;
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 50%;
    background: var(--danger);
  }

  .back-to-map {
    align-self: flex-start;
  }

  @media (min-width: 60rem) {
    .back-to-map {
      display: none;
    }
  }
</style>
