<script lang="ts">
  import Home from './pages/Home.svelte'
  import MetronomePage from './pages/MetronomePage.svelte'
  import DrinkMixPage from './pages/DrinkMixPage.svelte'
  import TaperPlannerPage from './pages/TaperPlannerPage.svelte'
  import RacePredictorPage from './pages/RacePredictorPage.svelte'
  import PWABadge from './lib/PWABadge.svelte'

  // Hash routing: works from the precached service worker shell with zero
  // server-side rewrite config, so every route works fully offline as a PWA.
  const routes = {
    '/': Home,
    '/metronome': MetronomePage,
    '/drink-mix': DrinkMixPage,
    '/taper-planner': TaperPlannerPage,
    '/race-predictor': RacePredictorPage,
  }

  function currentRoute(): keyof typeof routes {
    const hash = location.hash.slice(1) || '/'
    return hash in routes ? (hash as keyof typeof routes) : '/'
  }

  let route = $state(currentRoute())
  const Page = $derived(routes[route])

  addEventListener('hashchange', () => {
    route = currentRoute()
  })
</script>

<Page />

<PWABadge />
