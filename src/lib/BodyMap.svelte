<script lang="ts">
  import { FIGURES, HEIGHT, WIDTH } from './bodyMap'
  import type { Zone } from './bodyMap'
  import { VIEWS, getSpot } from './painMap'
  import type { BodyView, SpotId } from './painMap'

  interface Props {
    view: BodyView
    selected: SpotId | null
    onselect: (spot: SpotId) => void
  }

  let { view, selected, onselect }: Props = $props()

  const figure = $derived(FIGURES[view])

  interface Tip {
    spot: SpotId
    x: number
    y: number
  }

  // The label follows the mouse or keyboard focus; otherwise it stays pinned
  // on the selected spot — on the copy that was tapped, when it is in view.
  let hot = $state<Tip | null>(null)
  let tapped = $state<Tip | null>(null)

  const tipOf = (z: Zone): Tip => ({ spot: z.spot, x: z.dot[0], y: z.dot[1] })

  /** Whether that exact zone is on the current drawing (views share coordinates). */
  const inView = (t: Tip | null): t is Tip =>
    t !== null && figure.zones.some((z) => z.spot === t.spot && z.dot[0] === t.x && z.dot[1] === t.y)

  const pinned = $derived.by((): Tip | null => {
    if (!selected) return null
    if (tapped?.spot === selected && inView(tapped)) return tapped
    const zone = figure.zones.find((z) => z.spot === selected)
    return zone ? tipOf(zone) : null
  })

  // A zone can vanish under the pointer or focus when the view switches; its
  // hover state is then stale, so only trust it while the zone is drawn.
  const tip = $derived(inView(hot) ? hot : pinned)

  function pick(z: Zone): void {
    tapped = tipOf(z)
    onselect(z.spot)
  }

  function onkeydown(e: KeyboardEvent, z: Zone): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pick(z)
    }
  }

  // Hover labels for a mouse only: on touch the tap selects, and the pinned
  // label takes over, so a stale hover label never sticks after a tap.
  function onpointerenter(e: PointerEvent, z: Zone): void {
    if (e.pointerType === 'mouse') hot = tipOf(z)
  }

  // Keyboard focus shows the label too, but not the focus a tap leaves behind.
  function onfocus(e: FocusEvent, z: Zone): void {
    if ((e.currentTarget as Element).matches(':focus-visible')) hot = tipOf(z)
  }

  // Staggered pulses, so the idle map breathes instead of blinking in unison.
  const delay = (i: number) => `${((i * 0.37) % 2.6).toFixed(2)}s`
</script>

<div class="map" class:idle={selected === null}>
  <svg
    viewBox="0 0 {WIDTH} {HEIGHT}"
    role="group"
    aria-label="Body map, {VIEWS.find((v) => v.id === view)?.caption.toLowerCase()}"
  >
    <g aria-hidden="true">
      <!-- Outline pass under the fill pass: where parts overlap the fill hides
           the inner strokes, leaving one clean outline round the silhouette. -->
      <g class="edge">
        {#each figure.parts as d, i (i)}
          <path {d} />
        {/each}
      </g>
      <g class="skin">
        {#each figure.parts as d, i (i)}
          <path {d} />
        {/each}
      </g>
      {#if figure.hair}
        <path class="hair" d={figure.hair} />
      {/if}
      <g class="detail">
        {#each figure.details as d, i (i)}
          <path {d} />
        {/each}
      </g>
      {#each figure.labels as label (label.text)}
        <text class="label" x={label.x} y={label.y} transform="rotate({label.rotate} {label.x} {label.y})">
          {label.text}
        </text>
      {/each}
    </g>

    {#each figure.zones as z, i (z.key)}
      <g
        class="zone"
        class:hot={hot?.spot === z.spot}
        class:selected={selected === z.spot}
        role="button"
        tabindex={z.primary ? 0 : -1}
        aria-hidden={z.primary ? undefined : 'true'}
        aria-label="{getSpot(z.spot).name}: pain here"
        aria-pressed={selected === z.spot}
        onclick={() => pick(z)}
        onkeydown={(e) => onkeydown(e, z)}
        onpointerenter={(e) => onpointerenter(e, z)}
        onpointerleave={() => (hot = null)}
        onfocus={(e) => onfocus(e, z)}
        onblur={() => (hot = null)}
      >
        <ellipse
          class="area"
          cx={z.cx}
          cy={z.cy}
          rx={z.rx}
          ry={z.ry}
          transform={z.rotate ? `rotate(${z.rotate} ${z.cx} ${z.cy})` : undefined}
        />
        <circle class="halo" cx={z.dot[0]} cy={z.dot[1]} r="5" style:animation-delay={delay(i)} />
        <circle class="dot" cx={z.dot[0]} cy={z.dot[1]} r="2.6" />
      </g>
    {/each}
  </svg>

  {#if tip}
    <div
      class="tip"
      class:start={tip.x < WIDTH * 0.3}
      class:end={tip.x > WIDTH * 0.7}
      style:left="{(tip.x / WIDTH) * 100}%"
      style:top="{(tip.y / HEIGHT) * 100}%"
      aria-hidden="true"
    >
      {getSpot(tip.spot).short}
    </div>
  {/if}
</div>

<style>
  .map {
    position: relative;
    margin: 0 auto;
    aspect-ratio: 200 / 490;
    height: min(70vh, 34rem);
    height: min(70svh, 34rem);
    min-height: 22rem;
    max-width: 100%;
  }

  @media (min-width: 60rem) {
    .map {
      height: min(calc(100vh - 17rem), 36rem);
      height: min(calc(100svh - 17rem), 36rem);
    }
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
    -webkit-tap-highlight-color: transparent;
  }

  .edge {
    opacity: 0.22;
  }

  .edge path {
    fill: none;
    stroke: var(--text);
    stroke-width: 2.4;
    stroke-linejoin: round;
  }

  .skin path {
    fill: var(--surface-2);
  }

  .hair {
    fill: var(--text);
    opacity: 0.1;
  }

  .detail path {
    fill: none;
    stroke: var(--text);
    stroke-opacity: 0.16;
    stroke-width: 0.9;
    stroke-linecap: round;
  }

  .label {
    fill: var(--muted);
    font-size: 7px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-anchor: middle;
  }

  /* ---------- Hotspots ---------- */

  .zone {
    cursor: pointer;
    outline: none;
  }

  .area {
    fill: var(--danger);
    fill-opacity: 0;
    stroke: var(--danger);
    stroke-opacity: 0;
    stroke-width: 0.8;
    transition:
      fill-opacity 0.15s,
      stroke-opacity 0.15s;
  }

  .zone.hot .area {
    fill-opacity: 0.22;
    stroke-opacity: 0.7;
  }

  .zone.selected .area {
    fill-opacity: 0.4;
    stroke-opacity: 1;
  }

  .zone:focus-visible .area {
    stroke: var(--accent-text);
    stroke-opacity: 1;
    stroke-width: 1.4;
  }

  .dot {
    fill: var(--danger);
    stroke: var(--surface-2);
    stroke-width: 1;
    transform-box: fill-box;
    transform-origin: center;
    transition: transform 0.15s;
  }

  .zone.hot .dot,
  .zone.selected .dot {
    transform: scale(1.4);
  }

  .halo {
    fill: none;
    stroke: var(--danger);
    stroke-width: 0.9;
    opacity: 0;
    pointer-events: none;
    transform-box: fill-box;
    transform-origin: center;
  }

  /* Every dot pulses until a spot is picked; after that only the picked one. */
  .idle .halo,
  .zone.selected .halo {
    animation: pulse 2.6s ease-out infinite;
  }

  @keyframes pulse {
    from {
      transform: scale(0.5);
      opacity: 0.85;
    }
    to {
      transform: scale(1.9);
      opacity: 0;
    }
  }

  /* ---------- Label ---------- */

  .tip {
    position: absolute;
    z-index: 1;
    transform: translate(-50%, calc(-100% - 12px));
    padding: 0.28rem 0.65rem;
    border-radius: 999px;
    background: var(--text);
    color: var(--bg);
    font-size: 0.78rem;
    font-weight: 700;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: var(--shadow);
  }

  .tip.start {
    transform: translate(-14px, calc(-100% - 12px));
  }

  .tip.end {
    transform: translate(calc(-100% + 14px), calc(-100% - 12px));
  }
</style>
