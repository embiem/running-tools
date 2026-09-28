import type { IconName } from './Icon.svelte'

/** One entry per tool: the home grid, the top bar and every tool page header read this. */
export interface Tool {
  /** Hash route, also the key the app shell matches the current route against. */
  route: string
  name: string
  /** Short name for the top-bar nav. */
  short: string
  description: string
  icon: IconName
}

export const TOOLS: Tool[] = [
  {
    route: '/metronome',
    name: 'Cadence Metronome',
    short: 'Metronome',
    description: 'Run to the beat: lock your steps per minute to a click.',
    icon: 'metronome',
  },
  {
    route: '/race-predictor',
    name: 'Race Predictor',
    short: 'Predictor',
    description: 'Equivalent race times, a split plan and training paces from one recent result.',
    icon: 'stopwatch',
  },
  {
    route: '/taper-planner',
    name: 'Taper Planner',
    short: 'Taper',
    description: 'Count your taper back from race day, week by week and run by run.',
    icon: 'taper',
  },
  {
    route: '/drink-mix',
    name: 'Drink Mix Calculator',
    short: 'Drink mix',
    description: 'Mix your own run fuel from table salt, sugar and water.',
    icon: 'drop',
  },
  {
    route: '/workouts',
    name: 'Guided Workouts',
    short: 'Workouts',
    description: 'A narrated warm-up and post-run stretch with a spoken coach.',
    icon: 'headphones',
  },
  {
    route: '/youtube-workouts',
    name: 'YouTube Workouts',
    short: 'Videos',
    description: 'Hand-picked follow-along warm-ups, runner’s yoga and strength sessions.',
    icon: 'video',
  },
  {
    route: '/pain-map',
    name: 'Runner’s Pain Map',
    short: 'Pain map',
    description: 'Tap where it hurts to see which running injuries usually cause pain there.',
    icon: 'body',
  },
]

export function getTool(route: string): Tool {
  const tool = TOOLS.find((t) => t.route === route)
  if (!tool) throw new Error(`Unknown tool route: ${route}`)
  return tool
}
