<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    /** Panel heading; also its accessible name. */
    title: string
    /** One line on what the controls inside are for. */
    hint?: string
    children: Snippet
  }

  let { title, hint, children }: Props = $props()
</script>

<!--
  One input group per panel, results left unboxed: a box means "you set this".
  Every tool that takes more than one kind of input uses this, so the tools look
  alike and the border/hint styling lives in exactly one place.
-->
<section class="panel" aria-label={title}>
  <h2>{title}</h2>
  {#if hint}
    <p class="panel-hint">{hint}</p>
  {/if}
  {@render children()}
</section>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    padding: 1.1rem 1.15rem 1.2rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: var(--shadow);
  }

  h2 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .panel-hint {
    margin: -0.6rem 0 0;
    font-size: 0.82rem;
    color: var(--muted);
  }
</style>
