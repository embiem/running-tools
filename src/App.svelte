<script lang="ts">
  import Home from './pages/Home.svelte'
  import MetronomePage from './pages/MetronomePage.svelte'
  import DrinkMixPage from './pages/DrinkMixPage.svelte'
  import TaperPlannerPage from './pages/TaperPlannerPage.svelte'
  import RacePredictorPage from './pages/RacePredictorPage.svelte'
  import WorkoutsPage from './pages/WorkoutsPage.svelte'
  import YouTubeWorkoutsPage from './pages/YouTubeWorkoutsPage.svelte'
  import PainMapPage from './pages/PainMapPage.svelte'
  import PWABadge from './lib/PWABadge.svelte'
  import Icon from './lib/Icon.svelte'
  import { TOOLS } from './lib/tools'
  import { LANGUAGES, getLanguage, setLanguage } from './lib/i18n.svelte'
  import type { Locale } from './lib/i18n.svelte'
  import { m } from './paraglide/messages.js'

  // Hash routing: works from the precached service worker shell with zero
  // server-side rewrite config, so every route works fully offline as a PWA.
  const routes = {
    '/': Home,
    '/metronome': MetronomePage,
    '/drink-mix': DrinkMixPage,
    '/taper-planner': TaperPlannerPage,
    '/race-predictor': RacePredictorPage,
    '/workouts': WorkoutsPage,
    '/youtube-workouts': YouTubeWorkoutsPage,
    '/pain-map': PainMapPage,
  }

  function currentRoute(): keyof typeof routes {
    const hash = location.hash.slice(1) || '/'
    return hash in routes ? (hash as keyof typeof routes) : '/'
  }

  let route = $state(currentRoute())
  const Page = $derived(routes[route])

  addEventListener('hashchange', () => {
    route = currentRoute()
    // A new page starts at its top, not wherever the last one was scrolled to.
    scrollTo(0, 0)
  })
</script>

<header class="topbar">
  <div class="shell bar">
    <a class="brand" href="/#/" aria-label={m.app_home_label()}>
      <span class="mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 17 10 7l4 7 3-5 3 8" />
        </svg>
      </span>
      <span class="wordmark">running<span>tools</span></span>
    </a>
    <div class="end">
      <nav aria-label={m.app_nav_label()}>
        {#each TOOLS as tool (tool.route)}
          <a
            href="/#{tool.route}"
            class:active={route === tool.route}
            aria-current={route === tool.route ? 'page' : undefined}
            title={tool.name()}
          >
            <Icon name={tool.icon} size={16} />
            <span>{tool.short()}</span>
          </a>
        {/each}
      </nav>
      <!-- Each language by its own name; picking one re-renders in place. -->
      <label class="language" title={m.app_language()}>
        <Icon name="globe" size={16} />
        <select
          value={getLanguage()}
          onchange={(event) => setLanguage(event.currentTarget.value as Locale)}
          aria-label={m.app_language()}
        >
          {#each LANGUAGES as language (language.id)}
            <option value={language.id} lang={language.id}>{language.name}</option>
          {/each}
        </select>
      </label>
    </div>
  </div>
</header>

<div class="shell">
  <Page />
</div>

<PWABadge />

<style>
  .topbar {
    position: sticky;
    top: 0;
    z-index: 5;
    background: color-mix(in srgb, var(--bg) 82%, transparent);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--border);
  }

  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    color: var(--text);
    font-weight: 800;
  }

  .brand:hover {
    text-decoration: none;
  }

  .mark {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 9px;
    background: var(--accent);
    color: var(--on-accent);
  }

  .wordmark {
    font-stretch: 75%;
    font-size: 1.25rem;
    letter-spacing: 0.01em;
    text-transform: uppercase;
  }

  .wordmark span {
    color: var(--muted);
    margin-left: 0.15em;
  }

  .end {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  nav {
    display: none;
    gap: 0.25rem;
  }

  nav a {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    border-radius: 999px;
    color: var(--muted);
    font-size: 0.85rem;
    font-weight: 600;
  }

  nav a:hover {
    color: var(--text);
    background: var(--surface);
    text-decoration: none;
  }

  nav a.active {
    color: var(--text);
    background: var(--surface-2);
  }

  .language {
    position: relative;
    display: flex;
    align-items: center;
    color: var(--muted);
  }

  .language:hover,
  .language:focus-within {
    color: var(--text);
  }

  .language :global(svg) {
    position: absolute;
    left: 0.6rem;
    pointer-events: none;
  }

  /* A native select (accessible, and the phone's own picker on touch) dressed
     as one of the nav pills: globe inside on the left, no browser chrome. */
  select {
    appearance: none;
    -webkit-appearance: none;
    /* 2rem tall, like the brand mark: the picker must not grow the bar. */
    height: 2rem;
    padding: 0 0.75rem 0 1.95rem;
    border: 1px solid var(--border-strong);
    border-radius: 999px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }

  select:hover {
    border-color: var(--text);
  }

  option {
    background: var(--surface);
    color: var(--text);
  }

  /* Icons only until the labels fit; the label stays for screen readers. */
  nav a span {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  @media (min-width: 52rem) {
    nav {
      display: flex;
    }
  }

  /* 70rem: the widest language (German, Spanish) fits brand, labelled nav
     and the language picker. */
  @media (min-width: 70rem) {
    nav a span {
      position: static;
      width: auto;
      height: auto;
      overflow: visible;
      clip-path: none;
    }
  }
</style>
