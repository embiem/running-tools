<script lang="ts">
  import Metronome from '../lib/Metronome.svelte'
  import PWABadge from '../lib/PWABadge.svelte'
</script>

<main>
  <h1>Cadence Metronome</h1>

  <div class="card">
    <Metronome />
  </div>

  <a class="back" href="/#/">← All tools</a>
</main>

<PWABadge />
