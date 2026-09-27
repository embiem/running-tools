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
 * descriptions below, chosen to land both sessions inside a 5–10 minute
 * window. Descriptions are written to be spoken verbatim and are regular
 * data, reused outside this UI.
 *
 * Narration is pre-rendered: `cues` and
 * `narrationLines` below define every sentence the player can say, and
 * `npm run narrate` (scripts/generate-narration.mjs) renders exactly those
 * strings to MP3 with Kokoro-82M. The player looks each clip up by its text,
 * so any wording change here needs a re-run of `npm run narrate`.
 */

export type WorkoutId = 'warm-up' | 'stretch'
export type StepKind = 'exercise' | 'pause'

export interface WorkoutStep {
  kind: StepKind
  name: string
  /** Conversational how-to, 1–3 sentences. Spoken verbatim in the narration clips; reused later — keep as data. */
  description: string
  durationSec: number
  /** Spoken once at 50% elapsed (bilateral drills: "Switch sides."). */
  halfwayCue?: string
}

export interface Workout {
  id: WorkoutId
  title: string
  blurb: string
  /** Always starts with a short 'Get ready' pause. */
  steps: WorkoutStep[]
}

export const WORKOUTS: Workout[] = [
  {
    id: 'warm-up',
    title: 'Warm-up',
    blurb: 'Dynamic drills to switch your legs on before you run',
    steps: [
      {
        kind: 'pause',
        name: 'Get ready',
        description: 'Find a little space and stand tall. We start in fifteen seconds.',
        durationSec: 15,
      },
      {
        kind: 'exercise',
        name: 'March in place',
        description:
          'March in place, easy and relaxed. Let your arms swing and find your breathing. This gently raises your temperature and wakes up your hips.',
        durationSec: 40,
      },
      {
        kind: 'pause',
        name: 'Shake it out',
        description: 'Loosen your shoulders and give your arms a good shake.',
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: 'Arm circles',
        description:
          "Stretch your arms out to the sides. Circle them forward, starting small and growing bigger. I'll tell you when to reverse.",
        durationSec: 30,
        halfwayCue: 'Reverse direction.',
      },
      {
        kind: 'pause',
        name: 'Reset',
        description: 'Feet hip-width apart. Roll your shoulders back and breathe.',
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: 'Hip circles',
        description:
          "Hands on hips. Circle your hips round like you're stirring a big pot. Start small and keep it smooth.",
        durationSec: 30,
        halfwayCue: 'Other direction.',
      },
      {
        kind: 'pause',
        name: 'Find support',
        description: 'Move next to a wall, a post, anything you can hold on to.',
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: 'Leg swings',
        description:
          'Stand on one leg and hold the support. Swing the free leg forward and back like a pendulum, controlled, letting the range grow a little. We switch legs halfway.',
        durationSec: 45,
        halfwayCue: 'Switch legs.',
      },
      {
        kind: 'pause',
        name: 'Stay by the wall',
        description: 'Turn to face the wall, both hands on it.',
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: 'Side leg swings',
        description:
          'Keep your hands on the wall and a slight forward lean. Swing one leg across your body and out to the side, sweeping a bigger arc each time. We switch halfway.',
        durationSec: 40,
        halfwayCue: 'Switch legs.',
      },
      {
        kind: 'pause',
        name: 'Catch your breath',
        description: 'Shake out your legs.',
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: 'Squats',
        description:
          "Feet shoulder-width apart. Sit back and down like you're reaching for a chair, chest up, knees over your toes. Rise and repeat at an easy pace.",
        durationSec: 40,
      },
      {
        kind: 'pause',
        name: 'Almost there',
        description: 'Stand tall. Strong and controlled on the next one.',
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: 'Reverse lunges',
        description:
          'Step one leg back and lower until both knees are bent about ninety degrees, front knee over your ankle. Push back up to standing and alternate legs at a steady, controlled pace.',
        durationSec: 45,
      },
      {
        kind: 'pause',
        name: 'Two to go',
        description: 'Quick feet now. Light and bouncy.',
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: 'High knees',
        description:
          'Jog in place, driving your knees up to hip height. Land softly on the balls of your feet, quick but relaxed.',
        durationSec: 30,
      },
      {
        kind: 'pause',
        name: 'Last one',
        description: 'Nearly there. Finish light.',
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: 'Butt kicks',
        description:
          'Jog in place again, this time kicking your heels up toward your glutes. Stay quick and light, and let the arms swing.',
        durationSec: 30,
      },
    ],
  },
  {
    id: 'stretch',
    title: 'Stretch',
    blurb: 'Static holds to unwind after your run',
    steps: [
      {
        kind: 'pause',
        name: 'Get ready',
        description: 'Let your breathing settle. Easy does it, we take it slow.',
        durationSec: 15,
      },
      {
        kind: 'exercise',
        name: 'Walk it off',
        description:
          'Keep walking at an easy pace and let your heart rate drift down. Roll the shoulders and breathe deep — never come to a dead stop after a run.',
        durationSec: 45,
      },
      {
        kind: 'pause',
        name: 'Find a wall',
        description: 'Move somewhere with a wall, rail or post to lean on.',
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: 'Calf stretch',
        description:
          'Step one foot back, keep that leg straight and the heel pressed down, front knee bent. Lean gently in until you feel the big calf muscle lengthen. About thirty seconds each side.',
        durationSec: 60,
        halfwayCue: 'Switch sides.',
      },
      {
        kind: 'exercise',
        name: 'Deep calf stretch',
        description:
          'Stay in the same stance, but bend the back knee while keeping the heel down. This reaches the deep calf, the workhorse that pushes you off every step. About twenty-five seconds each side.',
        durationSec: 50,
        halfwayCue: 'Switch sides.',
      },
      {
        kind: 'pause',
        name: 'Roll your shoulders',
        description: 'Stand tall and roll the shoulders back a few times.',
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: 'Quad stretch',
        description:
          'Balance on one leg, using the wall if you need it. Grab the other ankle and draw the heel toward your glute, knees together, hips square. About thirty seconds each side.',
        durationSec: 60,
        halfwayCue: 'Switch sides.',
      },
      {
        kind: 'pause',
        name: 'Take it to the floor',
        description: 'Find a spot to get down on the ground, or stay standing if you prefer.',
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: 'Hip flexor stretch',
        description:
          'Half-kneel with one foot forward and the back knee down. Tuck the tailbone under and shift the hips gently forward until you feel the front of the hip open. About thirty seconds each side.',
        durationSec: 60,
        halfwayCue: 'Switch sides.',
      },
      {
        kind: 'pause',
        name: 'Stay where you are',
        description: 'Get comfortable on your back for the next one.',
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: 'Hamstring stretch',
        description:
          'Lie on your back and raise one leg, holding it behind the thigh with a soft knee. Draw it toward you until you feel the hamstring lengthen. Keep the other leg bent. About thirty seconds each side.',
        durationSec: 60,
        halfwayCue: 'Switch sides.',
      },
      {
        kind: 'pause',
        name: 'Stay lying down',
        description: 'Keep the back long against the ground.',
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: 'Figure-four stretch',
        description:
          'Still on your back: cross one ankle over the opposite knee, then pull that thigh toward your chest until you feel the glute. Head and shoulders stay down. About thirty seconds each side.',
        durationSec: 60,
        halfwayCue: 'Switch sides.',
      },
      {
        kind: 'pause',
        name: 'Sit up tall',
        description: 'Come up to a seated position, back straight.',
        durationSec: 10,
      },
      {
        kind: 'exercise',
        name: 'Butterfly stretch',
        description:
          'Sit tall with the soles of your feet together and knees dropped out. Hold your ankles and lean forward from the hips with a long, flat back. Breathe into it.',
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

/** Every sentence the player speaks, built from the step data. */
export const cues = {
  /** Step start: name plus how-to. */
  announce: (step: WorkoutStep): string => `${step.name}. ${step.description}`,
  /** Resuming a paused step: name only. */
  resume: (step: WorkoutStep): string => `Resuming. ${step.name}.`,
  /** Three seconds before a step ends; `next` is undefined on the last step. */
  countdown: (next: WorkoutStep | undefined): string => {
    if (!next) return 'Last seconds. Three, two, one.'
    if (next.kind === 'pause') return `Next pause: ${next.name}. In three, two, one.`
    return `Next up: ${next.name}. In three, two, one.`
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
