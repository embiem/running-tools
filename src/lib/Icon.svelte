<script lang="ts" module>
  // 24×24 stroke icons, drawn for this app: one per tool plus the arrows the
  // shell needs. Inline SVG, so they ship in the bundle and work offline.
  const PATHS = {
    metronome: ['M5.5 21 9 3h6l3.5 18z', 'M12 15.5 16.5 7', 'M7.2 17.5h9.6'],
    drop: ['M12 2.8c3.6 4.3 6.2 7.8 6.2 11.2a6.2 6.2 0 0 1-12.4 0c0-3.4 2.6-6.9 6.2-11.2z', 'M9 14.5a3 3 0 0 0 3 3'],
    stopwatch: ['M12 21a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z', 'M12 13.5 15 10.5', 'M9.5 2.5h5', 'M12 2.5V6', 'M19 6.5l1.5-1.5'],
    taper: ['M5 20V5', 'M10 20V9', 'M15 20v-7', 'M20 20v-3'],
    headphones: ['M4 15v-3a8 8 0 0 1 16 0v3', 'M4 15h3.5v5.5H5.5A1.5 1.5 0 0 1 4 19z', 'M20 15h-3.5v5.5h2A1.5 1.5 0 0 0 20 19z'],
    video: ['M3 7a2.5 2.5 0 0 1 2.5-2.5h13A2.5 2.5 0 0 1 21 7v10a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17z', 'M10 9v6l5-3z'],
    body: ['M12 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M5.5 9.5 12 10.5l6.5-1', 'M12 10.5V15', 'M12 15l-3 6.5', 'M12 15l3 6.5', 'M17.5 16.5h.01'],
    play: ['M8 5.5v13l10.5-6.5z'],
    back: ['M19 12H5', 'M11 6l-6 6 6 6'],
    arrow: ['M7 17 17 7', 'M8.5 7H17v8.5'],
  } as const

  export type IconName = keyof typeof PATHS
</script>

<script lang="ts">
  interface Props {
    name: IconName
    size?: number
  }

  let { name, size = 24 }: Props = $props()
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#each PATHS[name] as d (d)}
    <path {d} />
  {/each}
</svg>
