/**
 * Guided workout session data: narrated warm-up and stretch routines.
 *
 * What is literature here:
 * - Ordering of the warm-up follows the RAMP protocol (Raise, Mobilise,
 *   Activate, Potentiate) — Jeffreys 2007, summarised by Science for Sport.
 * - Dynamic work before / static holds after a run follows the acute-stretching
 *   scoping review (Frontiers in Sports and Active Living 2020): dynamic
 *   stretching favours running performance, long static holds before running
 *   can impair it. Moderate-duration dynamic stretching improved running
 *   economy (IJSPP 2024) and time to exhaustion (JSCR 2015) in trained runners.
 * - The stretch selection and roughly 30 s per side holds follow Runner's
 *   World post-run stretching guidance (30–60 s holds), NHS cool-down advice
 *   and BarBend's post-run set. The bent-knee "Deep calf stretch" targets the
 *   soleus: a straight knee lengthens the gastrocnemius, a bent knee the
 *   soleus — the deep muscle doing most of the push-off work in running.
 *
 * What is layout (ours): the exact drill list, durations and the 1–3 sentence
 * descriptions, chosen to land both sessions inside a 5–10 minute window.
 * Titles, step names and descriptions are shown on screen, so they live in the
 * message catalog (messages/{locale}.json, keys `workout_*`) and read in the
 * app's language; descriptions are written to be spoken verbatim.
 *
 * Narration is pre-rendered and English only: `cues` and `narrationLines`
 * below define every sentence the player can say — built from the English
 * step names and descriptions whatever the app's language, plus the
 * speech-only `halfwayCue`s — and `npm run narrate`
 * (scripts/generate-narration.mjs) renders exactly those strings to MP3 with
 * Kokoro-82M. The player looks each clip up by its text, so any change to the
 * English wording (here or in messages/en.json) needs a re-run of
 * `npm run narrate`.
 */

import type { Message } from './i18n.svelte'
import { m } from '../paraglide/messages.js'

export type WorkoutId = 'warm-up' | 'stretch'
export type StepKind = 'exercise' | 'pause'

export interface WorkoutStep {
  kind: StepKind
  name: Message
  /** Conversational how-to, 1–3 sentences. Spoken verbatim (in English) in the narration clips; reused later — keep as data. */
  description: Message
  durationSec: number
  /** Spoken once at 50% elapsed (bilateral drills: "Switch sides."). Speech only, so English only. */
  halfwayCue?: string
}

export interface Workout {
  id: WorkoutId
  title: Message
  blurb: Message
  /** Always starts with a short 'Get ready' pause. */
  steps: WorkoutStep[]
}

export const WORKOUTS: Workout[] = [
  {
    id: 'warm-up',
    title: m.workout_warmup_title,
    blurb: m.workout_warmup_blurb,
    steps: [
      {
        kind: 'pause',
        name: m.workout_warmup_get_ready_name,
        description: m.workout_warmup_get_ready_text,
        durationSec: 15,
      },
      {
        kind: 'exercise',
        name: m.workout_warmup_march_name,
        description: m.workout_warmup_march_text,
        durationSec: 40,
      },
      {
        kind: 'pause',
        name: m.workout_warmup_shake_out_name,
        description: m.workout_warmup_shake_out_text,
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: m.workout_warmup_arm_circles_name,
        description: m.workout_warmup_arm_circles_text,
        durationSec: 30,
        halfwayCue: 'Reverse direction.',
      },
      {
        kind: 'pause',
        name: m.workout_warmup_reset_name,
        description: m.workout_warmup_reset_text,
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: m.workout_warmup_hip_circles_name,
        description: m.workout_warmup_hip_circles_text,
        durationSec: 30,
        halfwayCue: 'Other direction.',
      },
      {
        kind: 'pause',
        name: m.workout_warmup_find_support_name,
        description: m.workout_warmup_find_support_text,
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: m.workout_warmup_leg_swings_name,
        description: m.workout_warmup_leg_swings_text,
        durationSec: 45,
        halfwayCue: 'Switch legs.',
      },
      {
        kind: 'pause',
        name: m.workout_warmup_stay_by_wall_name,
        description: m.workout_warmup_stay_by_wall_text,
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: m.workout_warmup_side_leg_swings_name,
        description: m.workout_warmup_side_leg_swings_text,
        durationSec: 40,
        halfwayCue: 'Switch legs.',
      },
      {
        kind: 'pause',
        name: m.workout_warmup_catch_breath_name,
        description: m.workout_warmup_catch_breath_text,
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: m.workout_warmup_squats_name,
        description: m.workout_warmup_squats_text,
        durationSec: 40,
      },
      {
        kind: 'pause',
        name: m.workout_warmup_almost_there_name,
        description: m.workout_warmup_almost_there_text,
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: m.workout_warmup_reverse_lunges_name,
        description: m.workout_warmup_reverse_lunges_text,
        durationSec: 45,
      },
      {
        kind: 'pause',
        name: m.workout_warmup_two_to_go_name,
        description: m.workout_warmup_two_to_go_text,
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: m.workout_warmup_high_knees_name,
        description: m.workout_warmup_high_knees_text,
        durationSec: 30,
      },
      {
        kind: 'pause',
        name: m.workout_warmup_last_one_name,
        description: m.workout_warmup_last_one_text,
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: m.workout_warmup_butt_kicks_name,
        description: m.workout_warmup_butt_kicks_text,
        durationSec: 30,
      },
    ],
  },
  {
    id: 'stretch',
    title: m.workout_stretch_title,
    blurb: m.workout_stretch_blurb,
    steps: [
      {
        kind: 'pause',
        name: m.workout_stretch_get_ready_name,
        description: m.workout_stretch_get_ready_text,
        durationSec: 15,
      },
      {
        kind: 'exercise',
        name: m.workout_stretch_walk_it_off_name,
        description: m.workout_stretch_walk_it_off_text,
        durationSec: 45,
      },
      {
        kind: 'pause',
        name: m.workout_stretch_find_wall_name,
        description: m.workout_stretch_find_wall_text,
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: m.workout_stretch_calf_name,
        description: m.workout_stretch_calf_text,
        durationSec: 60,
        halfwayCue: 'Switch sides.',
      },
      {
        kind: 'exercise',
        name: m.workout_stretch_deep_calf_name,
        description: m.workout_stretch_deep_calf_text,
        durationSec: 50,
        halfwayCue: 'Switch sides.',
      },
      {
        kind: 'pause',
        name: m.workout_stretch_roll_shoulders_name,
        description: m.workout_stretch_roll_shoulders_text,
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: m.workout_stretch_quad_name,
        description: m.workout_stretch_quad_text,
        durationSec: 60,
        halfwayCue: 'Switch sides.',
      },
      {
        kind: 'pause',
        name: m.workout_stretch_to_the_floor_name,
        description: m.workout_stretch_to_the_floor_text,
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: m.workout_stretch_hip_flexor_name,
        description: m.workout_stretch_hip_flexor_text,
        durationSec: 60,
        halfwayCue: 'Switch sides.',
      },
      {
        kind: 'pause',
        name: m.workout_stretch_stay_where_you_are_name,
        description: m.workout_stretch_stay_where_you_are_text,
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: m.workout_stretch_hamstring_name,
        description: m.workout_stretch_hamstring_text,
        durationSec: 60,
        halfwayCue: 'Switch sides.',
      },
      {
        kind: 'pause',
        name: m.workout_stretch_stay_lying_down_name,
        description: m.workout_stretch_stay_lying_down_text,
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: m.workout_stretch_figure_four_name,
        description: m.workout_stretch_figure_four_text,
        durationSec: 60,
        halfwayCue: 'Switch sides.',
      },
      {
        kind: 'pause',
        name: m.workout_stretch_sit_up_tall_name,
        description: m.workout_stretch_sit_up_tall_text,
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: m.workout_stretch_butterfly_name,
        description: m.workout_stretch_butterfly_text,
        durationSec: 50,
      },
    ],
  },
]

export function getWorkout(id: WorkoutId): Workout {
  const workout = WORKOUTS.find((w) => w.id === id)
  if (!workout) throw new Error(`Unknown workout id: ${id}`)
  return workout
}

export function totalDurationSec(w: Workout): number {
  return w.steps.reduce((sum, step) => sum + step.durationSec, 0)
}

/** The narration speaks English whatever the app's language: the clips are English. */
const SPOKEN = { locale: 'en' } as const
const spokenName = (step: WorkoutStep): string => step.name({}, SPOKEN)

/** Every sentence the player speaks, built from the step data. */
export const cues = {
  /** Step start: name plus how-to. */
  announce: (step: WorkoutStep): string => `${spokenName(step)}. ${step.description({}, SPOKEN)}`,
  /** Resuming a paused step: name only. */
  resume: (step: WorkoutStep): string => `Resuming. ${spokenName(step)}.`,
  /** Three seconds before a step ends; `next` is undefined on the last step. */
  countdown: (next: WorkoutStep | undefined): string => {
    if (!next) return 'Last seconds. Three, two, one.'
    if (next.kind === 'pause') return `Next pause: ${spokenName(next)}. In three, two, one.`
    return `Next up: ${spokenName(next)}. In three, two, one.`
  },
  done: 'Done. Nice work!',
}

/** Every distinct sentence a session of `workout` can say — what `npm run narrate` renders. */
export function narrationLines(workout: Workout): string[] {
  const lines = new Set<string>()
  workout.steps.forEach((step, i) => {
    lines.add(cues.announce(step))
    lines.add(cues.resume(step))
    if (step.halfwayCue) lines.add(step.halfwayCue)
    lines.add(cues.countdown(workout.steps[i + 1]))
  })
  lines.add(cues.done)
  return [...lines]
}
