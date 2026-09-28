<script lang="ts">
  import type { Snippet } from 'svelte'
  import Icon from './Icon.svelte'
  import { getTool } from './tools'
  import { m } from '../paraglide/messages.js'

  interface Props {
    /** The tool's hash route; its name, icon and description come from `TOOLS`. */
    route: string
    /** Single-column tool: centre the header over its content. */
    narrow?: boolean
    children: Snippet
  }

  let { route, narrow = false, children }: Props = $props()
  const tool = $derived(getTool(route))
</script>

<!-- Every tool page: back link, icon + condensed title, one-line lede, then the tool. -->
<main class="page">
  <header class:narrow>
    <a class="back" href="/#/"><Icon name="back" size={16} /> {m.page_back()}</a>
    <div class="title">
      <span class="icon"><Icon name={tool.icon} size={28} /></span>
      <h1 class="display">{tool.name()}</h1>
    </div>
    <p class="lede">{tool.description()}</p>
  </header>

  {@render children()}
</main>

<style>
  .page {
    padding-top: 1.5rem;
  }

  header {
    margin-bottom: 2rem;
  }

  header.narrow {
    max-width: 36rem;
    margin-inline: auto;
  }

  .back {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.75rem 0.3rem 0.55rem;
    border-radius: 999px;
    border: 1px solid var(--border-strong);
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 600;
  }

  .back:hover {
    color: var(--text);
    border-color: var(--text);
    text-decoration: none;
  }

  .title {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    margin-top: 1.4rem;
  }

  .icon {
    flex: none;
    display: grid;
    place-items: center;
    width: 3.25rem;
    height: 3.25rem;
    border-radius: 14px;
    background: var(--accent);
    color: var(--on-accent);
  }

  h1 {
    margin: 0;
    font-size: clamp(2.3rem, 8vw, 4rem);
    text-transform: uppercase;
    /* Last resort for a translated title longer than a phone is wide (the
       messages put soft hyphens in the long German and Spanish words). */
    overflow-wrap: anywhere;
  }

  .lede {
    max-width: 38rem;
    margin: 0.9rem 0 0;
    color: var(--muted);
    font-size: 1.02rem;
  }
</style>
