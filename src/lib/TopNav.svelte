<script lang="ts">
  import { tick } from 'svelte'
  import Icon from './Icon.svelte'
  import { TOOLS } from './tools'
  import { m } from '../paraglide/messages.js'

  interface Props {
    /** The current hash route, to mark the active tool. */
    route: string
  }

  let { route }: Props = $props()

  // Priority+ navigation: the tools stay labelled pills, in registry order, and
  // as many as fit are shown; the rest collapse into a "More" menu. When not
  // even one pill fits beside the brand and the language picker (a phone), the
  // button turns into a single icon that opens every tool.
  //
  // Widths come from an invisible copy of every pill (and of the More button),
  // measured by Svelte's ResizeObserver-backed bindings, so the fit follows the
  // language, the font and the viewport without hard-coded breakpoints.
  let navWidth = $state(0)
  let pillWidths = $state<number[]>(TOOLS.map(() => 0))
  let moreWidth = $state(0)
  let open = $state(false)
  let moreEl = $state<HTMLElement>()
  let buttonEl = $state<HTMLButtonElement>()
  let menuEl = $state<HTMLElement>()

  /** The gap between pills: 0.25rem, as in the styles below. */
  const gap = 0.25 * parseFloat(getComputedStyle(document.documentElement).fontSize)

  /** How many pills fit in `available` pixels, leaving room for the More button if any overflow. */
  function fitCount(available: number, widths: number[], more: number): number {
    if (available <= 0 || widths.some((width) => width <= 0)) return 0
    // +1 px per pill absorbs sub-pixel rounding in offsetWidth.
    const total = widths.reduce((sum, width) => sum + width + 1, 0) + gap * (widths.length - 1)
    if (total <= available) return widths.length
    let used = more
    for (let k = 0; k < widths.length; k++) {
      used += gap + widths[k] + 1
      if (used > available) return k
    }
    return widths.length
  }

  const visible = $derived(fitCount(navWidth, pillWidths, moreWidth))
  const overflow = $derived(TOOLS.slice(visible))
  const overflowActive = $derived(overflow.some((tool) => tool.route === route))

  // A new page, or a resize that changes what overflows, closes the menu.
  $effect(() => {
    void route
    void visible
    open = false
  })

  function links(): HTMLAnchorElement[] {
    return menuEl ? [...menuEl.querySelectorAll('a')] : []
  }

  async function openAndFocus(which: 'first' | 'last'): Promise<void> {
    open = true
    await tick()
    const items = links()
    items[which === 'first' ? 0 : items.length - 1]?.focus()
  }

  function onButtonKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openAndFocus(event.key === 'ArrowDown' ? 'first' : 'last')
    }
  }

  // Arrow keys move through the menu, Home/End jump to its ends; Tab leaves it
  // as usual (and closes it, see onFocusOut).
  function onMenuKey(event: KeyboardEvent): void {
    const items = links()
    const index = items.indexOf(document.activeElement as HTMLAnchorElement)
    const target: Record<string, number> = {
      ArrowDown: (index + 1) % items.length,
      ArrowUp: (index - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    }
    if (event.key in target) {
      event.preventDefault()
      items[target[event.key]]?.focus()
    }
  }

  function onWindowKey(event: KeyboardEvent): void {
    if (open && event.key === 'Escape') {
      open = false
      buttonEl?.focus()
    }
  }

  function onWindowPointer(event: PointerEvent): void {
    if (open && moreEl && !moreEl.contains(event.target as Node)) open = false
  }

  function onFocusOut(event: FocusEvent): void {
    if (open && moreEl && !moreEl.contains(event.relatedTarget as Node | null)) open = false
  }
</script>

<svelte:window onkeydown={onWindowKey} onpointerdown={onWindowPointer} />

<nav aria-label={m.app_nav_label()} bind:clientWidth={navWidth}>
  <!-- Invisible copies to measure: never focusable, never read out. -->
  <div class="measure" aria-hidden="true" inert>
    <div class="measure-row">
      {#each TOOLS as tool, i (tool.route)}
        <span class="pill" bind:offsetWidth={pillWidths[i]}>
          <Icon name={tool.icon} size={16} />
          <span>{tool.short()}</span>
        </span>
      {/each}
      <span class="pill" bind:offsetWidth={moreWidth}>
        <span>{m.app_nav_more()}</span>
        <Icon name="chevron" size={14} />
      </span>
    </div>
  </div>

  {#each TOOLS.slice(0, visible) as tool (tool.route)}
    <a
      class="pill"
      href="/#{tool.route}"
      class:active={route === tool.route}
      aria-current={route === tool.route ? 'page' : undefined}
      title={tool.name()}
    >
      <Icon name={tool.icon} size={16} />
      <span>{tool.short()}</span>
    </a>
  {/each}

  {#if visible < TOOLS.length}
    <div class="more" bind:this={moreEl} onfocusout={onFocusOut}>
      <button
        type="button"
        class="pill more-button"
        class:icon-only={visible === 0}
        class:active={overflowActive}
        class:open
        aria-expanded={open}
        aria-controls="more-menu"
        aria-label={visible === 0 ? m.app_nav_menu() : undefined}
        title={visible === 0 ? m.app_nav_menu() : undefined}
        bind:this={buttonEl}
        onclick={() => (open = !open)}
        onkeydown={onButtonKey}
      >
        {#if visible === 0}
          <Icon name="grid" size={16} />
        {:else}
          <span>{m.app_nav_more()}</span>
          <span class="chevron"><Icon name="chevron" size={14} /></span>
        {/if}
      </button>

      {#if open}
        <div class="menu" id="more-menu" bind:this={menuEl} onkeydown={onMenuKey} role="presentation">
          <p class="eyebrow">{visible === 0 ? m.app_nav_menu() : m.app_nav_more_title()}</p>
          <ul>
            {#each overflow as tool (tool.route)}
              <li>
                <a
                  href="/#{tool.route}"
                  class:active={route === tool.route}
                  aria-current={route === tool.route ? 'page' : undefined}
                  onclick={() => (open = false)}
                >
                  <span class="tile"><Icon name={tool.icon} size={18} /></span>
                  <span class="text">
                    <span class="name">{tool.name()}</span>
                    <span class="desc">{tool.description()}</span>
                  </span>
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {/if}
</nav>

<style>
  nav {
    /* Takes whatever the brand and the language picker leave: the width the
       pills are fitted into. A zero basis keeps that width independent of how
       many pills are showing, so the fit cannot oscillate. */
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.25rem;
  }

  .measure {
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    overflow: hidden;
    visibility: hidden;
    pointer-events: none;
  }

  .measure-row {
    display: flex;
    width: max-content;
  }

  .pill {
    display: flex;
    flex: none;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.6rem;
    border-radius: 999px;
    color: var(--muted);
    font-size: 0.85rem;
    font-weight: 600;
    white-space: nowrap;
  }

  a.pill:hover {
    color: var(--text);
    background: var(--surface);
    text-decoration: none;
  }

  .pill.active {
    color: var(--text);
    background: var(--surface-2);
  }

  .more-button {
    border: 1px solid transparent;
    background: transparent;
    line-height: inherit;
    /* The border keeps the button the measured size of its invisible copy. */
    margin: -1px;
  }

  .more-button:hover,
  .more-button.open {
    color: var(--text);
    background: var(--surface);
    border-color: transparent;
  }

  .more-button.active {
    color: var(--text);
    background: var(--surface-2);
  }

  /* On a phone: one round button the size of the brand mark and the picker. */
  .more-button.icon-only {
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    margin: 0;
    border-color: var(--border-strong);
  }

  .more-button.icon-only:hover,
  .more-button.icon-only.open {
    border-color: var(--text);
  }

  .chevron {
    display: flex;
    transition: transform 0.2s;
  }

  .open .chevron {
    transform: rotate(180deg);
  }

  /* Anchored to the top bar's content column (.bar is positioned), so it lines
     up with the page's right edge at any width, not with the button. */
  .menu {
    position: absolute;
    top: calc(100% + 0.25rem);
    right: 1rem;
    z-index: 10;
    width: min(23rem, calc(100% - 2rem));
    max-height: calc(100vh - 5rem);
    max-height: calc(100dvh - 5rem);
    overflow-y: auto;
    padding: 0.5rem;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: var(--shadow);
    transform-origin: top right;
    animation: menu-in 0.16s ease-out;
  }

  @keyframes menu-in {
    from {
      opacity: 0;
      transform: translateY(-6px) scale(0.98);
    }
  }

  .eyebrow {
    padding: 0.45rem 0.65rem 0.35rem;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .menu a {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 0.55rem 0.65rem;
    border-radius: var(--radius-sm);
    color: var(--text);
    transition: background-color 0.15s;
  }

  .menu a:hover,
  .menu a:focus-visible {
    background: var(--surface-2);
    text-decoration: none;
  }

  .menu a:focus-visible {
    outline-offset: -2px;
  }

  .tile {
    display: grid;
    place-items: center;
    flex: none;
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 12px;
    background: var(--surface-2);
    transition:
      background-color 0.15s,
      color 0.15s;
  }

  .menu a:hover .tile,
  .menu a:focus-visible .tile {
    background: var(--bg);
    color: var(--accent-text);
  }

  .menu a.active .tile {
    background: var(--accent);
    color: var(--on-accent);
  }

  .text {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }

  .name {
    font-size: 0.92rem;
    font-weight: 700;
  }

  .desc {
    font-size: 0.8rem;
    font-weight: 400;
    line-height: 1.35;
    color: var(--muted);
  }
</style>
