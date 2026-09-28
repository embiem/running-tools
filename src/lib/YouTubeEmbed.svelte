<script lang="ts">
  import Icon from './Icon.svelte'

  interface Props {
    /** The 11-character YouTube video id. */
    id: string
    /** Video title: the play button's and the iframe's accessible name. */
    title: string
  }

  let { id, title }: Props = $props()

  let playing = $state(false)
  let thumbFailed = $state(false)
</script>

<!--
  Click-to-load facade: until play is pressed this is a thumbnail and a button,
  so the page makes no request to youtube.com and sets no cookies. Pressing play
  swaps in the privacy-enhanced (youtube-nocookie.com) player, autoplaying since
  the click is the user gesture. Offline, the thumbnail fails and the tinted
  box stays behind the button.
-->
<div class="frame">
  {#if playing}
    <iframe
      src="https://www.youtube-nocookie.com/embed/{id}?autoplay=1&rel=0"
      {title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
    ></iframe>
  {:else}
    <button class="facade" aria-label="Play: {title}" onclick={() => (playing = true)}>
      {#if !thumbFailed}
        <img
          src="https://i.ytimg.com/vi/{id}/hqdefault.jpg"
          alt=""
          loading="lazy"
          onerror={() => (thumbFailed = true)}
        />
      {/if}
      <span class="play"><Icon name="play" size={26} /></span>
    </button>
  {/if}
</div>

<style>
  .frame {
    position: relative;
    aspect-ratio: 16 / 9;
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--surface-2);
  }

  iframe,
  .facade {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }

  .facade {
    display: grid;
    place-items: center;
    padding: 0;
    border-radius: 0;
    background: transparent;
  }

  .facade:active {
    transform: none;
  }

  /* hqdefault is 4:3 with letterbox bars; cover crops them off the 16:9 box. */
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .play {
    position: relative;
    display: grid;
    place-items: center;
    width: 4rem;
    height: 4rem;
    border-radius: 999px;
    background: var(--accent);
    color: var(--on-accent);
    box-shadow: var(--shadow);
    transition: transform 0.15s;
  }

  .facade:hover .play {
    transform: scale(1.08);
  }
</style>
