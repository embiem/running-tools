<script lang="ts">
  import { useRegisterSW } from 'virtual:pwa-register/svelte'

  // periodic sync is disabled, change the value to enable it, the period is in milliseconds
  // You can remove onRegisteredSW callback and registerPeriodicSync function
  const period = 0

  /**
   * This function will register a periodic sync check every hour, you can modify the interval as needed.
   */
  function registerPeriodicSync(swUrl: string, r: ServiceWorkerRegistration) {
    if (period <= 0) return

    setInterval(async () => {
      if ('onLine' in navigator && !navigator.onLine)
        return

      const resp = await fetch(swUrl, {
        cache: 'no-store',
        headers: {
          'cache': 'no-store',
          'cache-control': 'no-cache',
        },
      })

      if (resp?.status === 200)
        await r.update()
    }, period)
  }

  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (period <= 0) return
      if (r?.active?.state === 'activated') {
        registerPeriodicSync(swUrl, r)
      }
      else if (r?.installing) {
        r.installing.addEventListener('statechange', (e) => {
          const sw = e.target as ServiceWorker
          if (sw.state === 'activated')
            registerPeriodicSync(swUrl, r)
        })
      }
    },
  })

  function close() {
      
      needRefresh.set(false)
  }

  let toast = $derived($needRefresh)
  let message = $derived($needRefresh ? 'New content available, click on reload button to update.' : '')
</script>

{#if toast}
  <div
    class="pwa-toast"
    role="alert"
    aria-labelledby="toast-message"
  >
    <div class="message">
      <span id="toast-message">
        { message }
      </span>
    </div>
    <div class="buttons">
      {#if $needRefresh}
        <button type="button" class="primary" onclick={() => updateServiceWorker(true)}>
          Reload
        </button>
      {/if}
      <button type="button" class="ghost" onclick={close}>
        Close
      </button>
    </div>
  </div>
{/if}

<style>
  .pwa-toast {
    position: fixed;
    right: 0;
    bottom: 0;
    z-index: 10;
    max-width: 22rem;
    margin: 1rem;
    padding: 1rem 1.1rem;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: var(--shadow);
    font-size: 0.92rem;
  }
  .pwa-toast .message {
    margin-bottom: 0.75rem;
  }
  .pwa-toast .buttons {
    display: flex;
    gap: 0.5rem;
  }
</style>
