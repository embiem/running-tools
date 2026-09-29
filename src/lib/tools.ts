import type { IconName } from './Icon.svelte'
import type { Message } from './i18n.svelte'
import { m } from '../paraglide/messages.js'

/** One entry per tool: the home grid, the top bar and every tool page header read this. */
export interface Tool {
  /** Hash route, also the key the app shell matches the current route against. */
  route: string
  name: Message
  /** Short name for the top-bar nav. */
  short: Message
  description: Message
  icon: IconName
}

export const TOOLS: Tool[] = [
  {
    route: '/metronome',
    name: m.tool_metronome_name,
    short: m.tool_metronome_short,
    description: m.tool_metronome_description,
    icon: 'metronome',
  },
  {
    route: '/race-predictor',
    name: m.tool_race_predictor_name,
    short: m.tool_race_predictor_short,
    description: m.tool_race_predictor_description,
    icon: 'stopwatch',
  },
  {
    route: '/taper-planner',
    name: m.tool_taper_planner_name,
    short: m.tool_taper_planner_short,
    description: m.tool_taper_planner_description,
    icon: 'taper',
  },
  {
    route: '/race-fuel',
    name: m.tool_race_fuel_name,
    short: m.tool_race_fuel_short,
    description: m.tool_race_fuel_description,
    icon: 'fork',
  },
  {
    route: '/drink-mix',
    name: m.tool_drink_mix_name,
    short: m.tool_drink_mix_short,
    description: m.tool_drink_mix_description,
    icon: 'drop',
  },
  {
    route: '/workouts',
    name: m.tool_workouts_name,
    short: m.tool_workouts_short,
    description: m.tool_workouts_description,
    icon: 'headphones',
  },
  {
    route: '/youtube-workouts',
    name: m.tool_youtube_workouts_name,
    short: m.tool_youtube_workouts_short,
    description: m.tool_youtube_workouts_description,
    icon: 'video',
  },
  {
    route: '/pain-map',
    name: m.tool_pain_map_name,
    short: m.tool_pain_map_short,
    description: m.tool_pain_map_description,
    icon: 'body',
  },
]

export function getTool(route: string): Tool {
  const tool = TOOLS.find((t) => t.route === route)
  if (!tool) throw new Error(`Unknown tool route: ${route}`)
  return tool
}
