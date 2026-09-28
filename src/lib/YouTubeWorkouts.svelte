<script lang="ts">
  import YouTubeEmbed from './YouTubeEmbed.svelte'
  import { VIDEO_GROUPS, videosIn } from './youtubeWorkouts'
  import { m } from '../paraglide/messages.js'

  // The only tool that needs a signal: say so up front instead of letting the
  // player fail after a tap.
  let online = $state(navigator.onLine)
</script>

<svelte:window ononline={() => (online = true)} onoffline={() => (online = false)} />

<section class="tool" aria-label={m.yt_label()}>
  {#if !online}
    <p class="flag warn offline" role="status">{m.yt_offline()}</p>
  {/if}

  <div class="results">
    {#each VIDEO_GROUPS as group (group.category)}
      <h2>{group.title()}</h2>
      <p class="blurb">{group.blurb()}</p>
      <ul class="videos">
        {#each videosIn(group.category) as video (video.id)}
          <li>
            <YouTubeEmbed id={video.id} title={video.title} />
            <div class="meta">
              <h3>{video.title}</h3>
              <p class="channel">
                {[video.channel, video.minutes && m.yt_minutes({ minutes: video.minutes })]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <p class="why">{video.why()}</p>
              <a href="https://www.youtube.com/watch?v={video.id}" target="_blank" rel="noopener noreferrer">
                {m.yt_watch()}
              </a>
            </div>
          </li>
        {/each}
      </ul>
    {/each}

    <details class="info">
      <summary>{m.yt_info_title()}</summary>
      <!-- Messages are the app's own copy, not user input: safe as HTML. -->
      <p>{@html m.yt_info_criteria()}</p>
      <p>{m.yt_info_privacy()}</p>
    </details>
  </div>
</section>

<style>
  .offline {
    margin: 0;
  }

  .blurb {
    margin: 0;
    max-width: 40rem;
    color: var(--muted);
    font-size: 0.92rem;
  }

  .videos {
    list-style: none;
    margin: 0 0 1rem;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  @media (min-width: 40rem) {
    .videos {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 64rem) {
    .videos {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  li {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    padding: 0.6rem 0.6rem 1rem;
    border-radius: var(--radius);
    background: var(--surface);
    border: 1px solid var(--border);
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0 0.4rem;
    flex: 1;
  }

  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.3;
  }

  .channel {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--accent-text);
  }

  .why {
    margin: 0.2rem 0 0.4rem;
    font-size: 0.86rem;
    color: var(--muted);
    flex: 1;
  }

  .meta a {
    font-size: 0.85rem;
  }
</style>
