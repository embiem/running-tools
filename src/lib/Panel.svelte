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
    gap: 0.6rem;
    padding: 0.9rem 1rem 1rem;
    border: 1px solid rgba(128, 128, 128, 0.3);
    border-radius: 10px;
    background: rgba(128, 128, 128, 0.07);
  }

  h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .panel-hint {
    margin: -0.35rem 0 0;
    font-size: 0.8rem;
    opacity: 0.7;
  }
</style>
