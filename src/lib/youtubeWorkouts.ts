/**
 * Hand-picked follow-along YouTube workouts for runners, in three groups:
 * warm-ups before a run, stretching / yoga after one, and strength sessions.
 *
 * Selection criteria (September 2026): made for runners specifically, led by
 * someone with a coaching or physiotherapy background or a channel whose
 * audience is known for warm reception rather than for raw view counts, a
 * follow-along format (you do it with the video, not after watching it), and,
 * where available, an independent editorial recommendation. Each entry's
 * `why` says which of these it meets. Durations are the ones the video's own
 * title or description states; `minutes` is left out where neither does.
 *
 * Only the video id is stored: the embed loads nothing from YouTube until the
 * viewer presses play (see YouTubeEmbed.svelte).
 */

export type VideoCategory = 'warm-up' | 'stretch' | 'strength'

export interface YouTubeWorkout {
  /** The 11-character YouTube video id. */
  id: string
  title: string
  /** Channel name, when it could be confirmed. */
  channel?: string
  category: VideoCategory
  /** Length in minutes, when the video states it. */
  minutes?: number
  /** One line on why it made the list. */
  why: string
}

export interface VideoGroup {
  category: VideoCategory
  title: string
  blurb: string
}

export const VIDEO_GROUPS: VideoGroup[] = [
  {
    category: 'warm-up',
    title: 'Warm up before you run',
    blurb: 'Dynamic moves that raise your temperature and wake up hips, ankles and calves. Five to seven minutes.',
  },
  {
    category: 'stretch',
    title: 'Stretch and yoga after the run',
    blurb: 'Slow, held work for hips, hamstrings and calves once you are back home.',
  },
  {
    category: 'strength',
    title: 'Strength for runners',
    blurb: 'Two sessions a week on non-run or easy days. Bodyweight to start; add load as they get easy.',
  },
]

export const YOUTUBE_WORKOUTS: YouTubeWorkout[] = [
  {
    id: 'QzmsKIdsgko',
    title: 'The Best 5 Minute Run Warm Up for Beginners',
    channel: 'The Run Experience',
    category: 'warm-up',
    minutes: 5,
    why: 'Run-specific coaching channel; goes from general movement to run-form drills, and you follow along in real time.',
  },
  {
    id: 'MKuZOwYukho',
    title: 'Yoga For Runners: 7 Minute Pre-Run Yoga',
    channel: 'Yoga With Adriene',
    category: 'warm-up',
    minutes: 7,
    why: 'A compact, moving (not held) sequence from one of the best-loved yoga channels on YouTube. Friendly to beginners.',
  },
  {
    id: '3WUtJxLv-wI',
    title: '5 Minute Warm-Up You NEED before EVERY RUN',
    category: 'warm-up',
    minutes: 5,
    why: 'A no-equipment dynamic warm-up done in real time, aimed at getting you out the door ready and running pain-free.',
  },
  {
    id: 'BylKeXx0fbc',
    title: 'Yoga For Runners | 10 Minute Post Run Stretch',
    channel: 'Live Free Warrior',
    category: 'stretch',
    minutes: 10,
    why: 'Picked in Coach magazine’s round-up of post-run stretch videos. Short, and aimed squarely at hips and hamstrings.',
  },
  {
    id: '0hTllAb4XGg',
    title: 'Runner’s Yoga',
    channel: 'Yoga With Adriene',
    category: 'stretch',
    why: 'A longer release-and-recover practice for after a run, with the calm, clear cueing the channel is known for.',
  },
  {
    id: 'FbmLx-PahO4',
    title: '10 Min. Post-Run Stretch | Simple Cool Down after Running',
    channel: 'Mady Morrison',
    category: 'stretch',
    minutes: 10,
    why: 'Yoga-inspired cool-down for glutes, quads, hamstrings and hips, then spine and side body. Needs only a mat.',
  },
  {
    id: 'pe9v9uiUujQ',
    title: '25 Minute Strength Workout for Runners (to Run Pain Free)',
    channel: 'Dr. Duane Scotti · Spark Healthy Runner',
    category: 'strength',
    minutes: 25,
    why: 'Led by a running physical therapist (DPT, PhD). Seven staple exercises chosen for injury resistance.',
  },
  {
    id: '6LB__vPvaaE',
    title: '20 Minute Leg Strength Workout for Runners',
    channel: 'Runna',
    category: 'strength',
    minutes: 20,
    why: 'Coached by Runna’s head coach Ben Parker: a leg-focused session built around what runners actually load.',
  },
  {
    id: 'rZpMnnN4s_o',
    title: 'Strength Training for Runners — Follow Along with Aaliyah Earvin',
    channel: 'REI · Deeply Moving with Elena Cheung',
    category: 'strength',
    minutes: 20,
    why: 'Bodyweight only, led by running coach Aaliyah Earvin; recommended by Road Runner Sports’ list of YouTube workouts for runners.',
  },
]

export function videosIn(category: VideoCategory): YouTubeWorkout[] {
  return YOUTUBE_WORKOUTS.filter((v) => v.category === category)
}
