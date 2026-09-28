<script lang="ts">
  import Icon from '../lib/Icon.svelte'
  import { TOOLS } from '../lib/tools'
  import { YOUTUBE_WORKOUTS } from '../lib/youtubeWorkouts'
  import { SPOTS } from '../lib/painMap'
  import { m } from '../paraglide/messages.js'

  // The metronome tile shows the cadence you last set, so the home grid reads
  // like a dashboard rather than a menu. Same key and bounds as Metronome.svelte.
  function savedCadence(): number {
    try {
      const saved = Number(localStorage.getItem('metronome.bpm'))
      return Number.isFinite(saved) && saved >= 120 && saved <= 220 ? saved : 170
    } catch {
      return 170
    }
  }

  const cadence = savedCadence()

  // One headline figure per tile, keyed by route; derived, so it follows the language.
  const stats: Record<string, { value: string; unit: string }> = $derived({
    '/metronome': { value: String(cadence), unit: m.unit_steps_per_min() },
    '/race-predictor': { value: m.home_stat_race_value(), unit: m.home_stat_race_unit() },
    '/taper-planner': { value: m.home_stat_taper_value(), unit: m.home_stat_taper_unit() },
    '/drink-mix': { value: '3', unit: m.home_stat_drink_unit() },
    '/workouts': { value: '2', unit: m.home_stat_workouts_unit() },
    '/youtube-workouts': { value: String(YOUTUBE_WORKOUTS.length), unit: m.home_stat_youtube_unit() },
    '/pain-map': { value: String(SPOTS.length), unit: m.home_stat_pain_unit() },
  })
</script>

<main>
  <section class="intro">
    <p class="eyebrow">{m.home_eyebrow()}</p>
    <h1 class="display">{m.home_title()} <span>{m.home_title_accent()}</span></h1>
    <p class="lede">{m.home_lede()}</p>
  </section>

  <ul class="bento">
    {#each TOOLS as tool, i (tool.route)}
      <li class:feature={i === 0}>
        <a href="/#{tool.route}">
          <div class="top">
            <span class="icon"><Icon name={tool.icon} size={22} /></span>
            <span class="go"><Icon name="arrow" size={20} /></span>
          </div>
          <p class="figure">
            <span class="display">{stats[tool.route].value}</span>
            <span class="unit">{stats[tool.route].unit}</span>
          </p>
          <div>
            <h2>{tool.name()}</h2>
            <p class="desc">{tool.description()}</p>
          </div>
        </a>
      </li>
    {/each}
  </ul>
</main>

<style>
  .intro {
    padding: 3rem 0 2.25rem;
  }

  h1 {
    margin: 0.75rem 0 0;
    font-size: clamp(3rem, 12vw, 6.5rem);
    text-transform: uppercase;
    /* Last resort for a translated word longer than a phone is wide. */
    overflow-wrap: anywhere;
  }

  h1 span {
    color: var(--accent-text);
  }

  .lede {
    max-width: 34rem;
    margin: 1rem 0 0;
    font-size: 1.05rem;
    color: var(--muted);
  }

  .bento {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.9rem;
  }

  @media (min-width: 40rem) {
    .bento {
      grid-template-columns: repeat(2, 1fr);
    }

    .feature {
      grid-column: span 2;
    }

    /* Two tiles a row after the feature: an odd one out takes the full row. */
    .bento li:last-child:nth-child(even) {
      grid-column: span 2;
    }
  }

  @media (min-width: 60rem) {
    .bento {
      grid-template-columns: repeat(6, 1fr);
    }

    /* Feature tile left over two rows, two wide tiles beside it, three thirds below. */
    .bento li.feature {
      grid-column: span 2;
      grid-row: span 2;
    }

    .bento li:nth-child(2),
    .bento li:nth-child(3) {
      grid-column: span 4;
    }

    .bento li:nth-child(n + 4) {
      grid-column: span 2;
    }

    /* An unfinished last row of thirds: one tile takes the row, two share it. */
    .bento li:nth-child(3n + 1):nth-child(n + 7):last-child {
      grid-column: span 6;
    }

    .bento li:nth-child(3n + 1):nth-child(n + 7):nth-last-child(2),
    .bento li:nth-child(3n + 2):nth-child(n + 8):last-child {
      grid-column: span 3;
    }
  }

  a {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 1.5rem;
    padding: 1.25rem;
    border-radius: 22px;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
    font-weight: 400;
    transition:
      transform 0.2s,
      border-color 0.2s;
  }

  a:hover {
    text-decoration: none;
    transform: translateY(-3px);
    border-color: var(--border-strong);
  }

  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .icon {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 12px;
    background: var(--surface-2);
  }

  .go {
    color: var(--muted);
    transition:
      transform 0.2s,
      color 0.2s;
  }

  a:hover .go {
    color: var(--accent-text);
    transform: translate(2px, -2px);
  }

  .figure {
    margin: 0;
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .figure .display {
    font-size: 3rem;
  }

  .figure .unit {
    font-size: 0.85rem;
  }

  h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
  }

  .desc {
    margin: 0.3rem 0 0;
    font-size: 0.88rem;
    color: var(--muted);
  }

  /* The featured tile is the volt one: big numeral, dark ink. */
  .feature a {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }

  .feature .icon {
    background: var(--on-accent);
    color: var(--accent);
  }

  .feature .go,
  .feature .unit,
  .feature .desc,
  .feature a:hover .go {
    color: inherit;
    opacity: 0.7;
  }

  .feature .figure .display {
    font-size: clamp(5rem, 16vw, 8rem);
  }

  @media (min-width: 60rem) {
    .feature .figure {
      flex-direction: column;
      gap: 0.25rem;
    }
  }
</style>
