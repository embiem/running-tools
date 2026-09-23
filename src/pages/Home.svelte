<script lang="ts">
  interface Tool {
    name: string
    description: string
    href: string | null
    image: string
  }

  // Unsplash CDN URLs (free Unsplash license); params crop to card-size WebP.
  const img = (id: string) =>
    `https://images.unsplash.com/${id}?auto=format&fit=crop&w=640&q=60`

  const tools: Tool[] = [
    {
      name: 'Cadence Metronome',
      description: 'Run to the beat — 170 steps/min',
      href: '/#/metronome',
      image: img('photo-1552674605-db6ffd4facb5'),
    },
    {
      name: 'Drink Mix Calculator',
      description: 'Mix your own run fuel from salt and sugar',
      href: '/#/drink-mix',
      image: img('photo-1625708458528-802ec79b1ed8'),
    },
    {
      name: 'Race Predictor',
      description: 'Estimate race times from a recent result',
      href: null,
      image: img('photo-1571008887538-b36bb32f4571'),
    },
    {
      name: 'Taper Planner',
      description: 'Count your taper back from race day',
      href: '/#/taper-planner',
      image: img('photo-1461896836934-ffe607ba8211'),
    },
  ]
</script>

<main>
  <h1>running-tools</h1>
  <p class="tagline">A suite of tools for runners</p>

  <ul class="grid">
    {#each tools as tool (tool.name)}
      <li>
        {#if tool.href}
          <a class="card" href={tool.href}>
            <img src={tool.image} alt="" loading="lazy" />
            <div class="card-body">
              <h2>{tool.name}</h2>
              <p>{tool.description}</p>
            </div>
          </a>
        {:else}
          <div class="card placeholder">
            <img src={tool.image} alt="" loading="lazy" />
            <div class="card-body">
              <h2>{tool.name}</h2>
              <p>{tool.description}</p>
              <span class="badge">Coming soon</span>
            </div>
          </div>
        {/if}
      </li>
    {/each}
  </ul>
</main>
